// Universal tooltip system.
//
// One floating panel (#tt-pop) is shared across the whole app. Any DOM
// element that opts in via a data-tt-* attribute gets a rich tooltip
// with structured sections (title, description, stat effects,
// requirements, warnings, recommendation).
//
// Opt-in attributes (handled here, content resolved on demand):
//   data-tt-room="<roomId>"       — room from RDEFS
//   data-tt-stat="<statId>"       — pre-authored stat blurb
//   data-tt-research="<techId>"   — research node from RESEARCH_TREE
//   data-tt-grant="<grantId>"     — grant from GRANT_LIBRARY
//   data-tt-contract="<contractId>" — insurance contract
//   data-tt-trait="<traitId>"     — staff trait from getTraitById()
//   data-tt-map="<campusId>"      — campus / map bonus
//   data-tt-difficulty="<diffId>" — difficulty preset
//   data-tt-publiccare            — Asherville Public Care Agreement
//   data-tt='{json}'              — ad-hoc, structured content
//   title="…"                     — fallback simple text (auto-converted)
//
// Build-menu .rb[data-tool] buttons are auto-tagged so existing
// markup needs no edits.

(function(){
'use strict';

let _pop=null;
let _currentEl=null;
let _showTimer=null;
let _hideTimer=null;

function _ensurePop(){
  if(_pop)return _pop;
  _pop=document.createElement('div');
  _pop.id='tt-pop';
  _pop.setAttribute('role','tooltip');
  _pop.setAttribute('aria-hidden','true');
  document.body.appendChild(_pop);
  return _pop;
}

function _esc(s){
  if(s==null)return'';
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// ---- Public render ---------------------------------------------------
// data shape: {
//   title, description,
//   stats:        [{label, value, delta?, tone?: 'good'|'bad'|'neutral'}],
//   requirements: [{label, met?: boolean}],
//   warnings:     [string],
//   recommendation: string,
//   footer: string, badge: string
// }
function _renderHtml(data){
  if(!data)return'';
  const parts=[];
  if(data.badge)parts.push(`<div class="tt-badge">${_esc(data.badge)}</div>`);
  if(data.title)parts.push(`<div class="tt-title">${_esc(data.title)}</div>`);
  if(data.description)parts.push(`<div class="tt-desc">${_esc(data.description)}</div>`);

  if(Array.isArray(data.stats)&&data.stats.length){
    parts.push('<div class="tt-section"><div class="tt-section-h">Effects</div><ul class="tt-stats">'+
      data.stats.map(s=>{
        const tone=s.tone||(s.delta>0?'good':s.delta<0?'bad':'neutral');
        const arrow=s.delta>0?'▲':s.delta<0?'▼':'';
        const val=s.value!=null?`<span class="tt-stat-val tt-${tone}">${arrow?arrow+' ':''}${_esc(s.value)}</span>`:'';
        return`<li><span class="tt-stat-lbl">${_esc(s.label)}</span>${val}</li>`;
      }).join('')+'</ul></div>');
  }

  if(Array.isArray(data.requirements)&&data.requirements.length){
    parts.push('<div class="tt-section"><div class="tt-section-h">Requirements</div><ul class="tt-reqs">'+
      data.requirements.map(r=>{
        const met=r.met===true;
        const unmet=r.met===false;
        const cls=met?'tt-req-met':(unmet?'tt-req-unmet':'tt-req-neutral');
        const mark=met?'✓':(unmet?'✗':'•');
        return`<li class="${cls}"><span class="tt-req-mark">${mark}</span><span>${_esc(r.label)}</span></li>`;
      }).join('')+'</ul></div>');
  }

  if(Array.isArray(data.warnings)&&data.warnings.length){
    parts.push('<div class="tt-section tt-section-warn"><div class="tt-section-h">⚠ Watch out</div><ul class="tt-warns">'+
      data.warnings.map(w=>`<li>${_esc(w)}</li>`).join('')+'</ul></div>');
  }

  if(data.recommendation){
    parts.push(`<div class="tt-section tt-section-rec"><div class="tt-section-h">Recommended</div><div class="tt-rec">${_esc(data.recommendation)}</div></div>`);
  }

  if(data.footer)parts.push(`<div class="tt-footer">${_esc(data.footer)}</div>`);
  return parts.join('');
}

function _position(el){
  if(!_pop)return;
  const r=el.getBoundingClientRect();
  // Measure tooltip
  _pop.style.left='-9999px';
  _pop.style.top='0px';
  _pop.style.maxWidth='320px';
  const pr=_pop.getBoundingClientRect();
  const vw=window.innerWidth,vh=window.innerHeight;
  const margin=8;
  let left=r.right+margin;
  let top=r.top;
  // Flip to left if no room
  if(left+pr.width>vw-margin)left=Math.max(margin,r.left-pr.width-margin);
  // If still off, place below
  if(left+pr.width>vw-margin){left=Math.max(margin,vw-pr.width-margin);top=r.bottom+margin;}
  // Clamp vertically
  if(top+pr.height>vh-margin)top=Math.max(margin,vh-pr.height-margin);
  if(top<margin)top=margin;
  _pop.style.left=Math.round(left)+'px';
  _pop.style.top=Math.round(top)+'px';
}

function show(el,data){
  if(!data)return;
  _ensurePop();
  clearTimeout(_hideTimer);
  _pop.innerHTML=_renderHtml(data);
  _pop.classList.add('tt-open');
  _pop.setAttribute('aria-hidden','false');
  _currentEl=el;
  _position(el);
}
function hide(){
  if(!_pop)return;
  clearTimeout(_showTimer);
  _hideTimer=setTimeout(()=>{
    _pop.classList.remove('tt-open');
    _pop.setAttribute('aria-hidden','true');
    _currentEl=null;
  },60);
}

// ---- Resolvers -------------------------------------------------------
const resolvers={};
function registerResolver(key,fn){resolvers[key]=fn;}
function _resolve(el){
  // Inline JSON wins if present.
  if(el.dataset.tt){
    try{return JSON.parse(el.dataset.tt);}catch(e){}
  }
  for(const key in resolvers){
    const v=el.dataset[key];
    if(v!=null){
      const data=resolvers[key](v,el);
      if(data)return data;
    }
  }
  // Plain title fallback.
  if(el.title){
    const t=el.title;
    el.dataset.ttPlainTitle=t;
    el.removeAttribute('title');
    return{description:t};
  }
  if(el.dataset.ttPlainTitle){
    return{description:el.dataset.ttPlainTitle};
  }
  return null;
}

// ---- Built-in resolvers ----------------------------------------------
// Rooms (also auto-tags .rb[data-tool] elements on the fly)
registerResolver('ttRoom',(id)=>{
  const d=(typeof RDEFS!=='undefined'?RDEFS[id]:null);
  if(!d)return null;
  const stats=[];
  if(d.cost!=null)stats.push({label:'Build cost',value:'$'+(d.cost||0).toLocaleString(),tone:'neutral'});
  if(d.upkeep!=null)stats.push({label:'Upkeep',value:'$'+d.upkeep+'/day',tone:'neutral'});
  if(d.size)stats.push({label:'Footprint',value:`${d.size[0]}×${d.size[1]}`,tone:'neutral'});
  if(d.staffNeeded)stats.push({label:'Staff needed',value:d.staffNeeded,tone:'neutral'});
  const reqs=[];
  if(d.unlockStage)reqs.push({label:`Unlocks at ${d.unlockStage} stage`});
  if(d.requires)reqs.push({label:d.requires});
  const warnings=[];
  if(d.cleanlinessImpact&&d.cleanlinessImpact<0)warnings.push('Reduces cleanliness — pair with a Janitor Closet.');
  if(d.stressImpact&&d.stressImpact>0)warnings.push('Raises staff stress — keep a Staff Room nearby.');
  return{
    badge:'Room',
    title:d.name||id,
    description:d.desc||d.descLong||'',
    stats,requirements:reqs,warnings,
    recommendation:d.tip||d.recommend||null
  };
});

// Stat blurbs.
const STAT_BLURBS={
  money:{title:'Cash Balance',description:'Your available money. Spent on builds, salaries, and upgrades.',recommendation:'Keep ~30 days of payroll in reserve.'},
  reputation:{title:'Reputation',description:'Drives patient inflow and grant approvals. Range 0–100.',recommendation:'Cleanliness and short waits raise it; deaths and protests drop it.'},
  cleanliness:{title:'Cleanliness',description:'Average across all rooms. Falls with use, recovers with janitors.',warnings:['Below 60% triggers infection risk.'],recommendation:'Hire 1 janitor per ~6 rooms; build a Janitor Closet.'},
  stress:{title:'Staff Stress',description:'Average staff stress. High stress reduces speed and morale.',recommendation:'Build Staff Rooms and Lunch Rooms; rotate shifts.'},
  rp:{title:'Research Points',description:'Currency for unlocking research. Earned daily.',recommendation:'Build IT, Research, and Dept Head offices to raise daily RP.'},
  waiting:{title:'People Waiting',description:'Patients currently in queue.',warnings:['Long queues raise stress and risk walk-outs.'],recommendation:'Add a Waiting Room and more GP / treatment rooms.'},
  grade:{title:'Inspection Grade',description:'Monthly inspector rating across cleanliness, safety, and staffing.',recommendation:'Hit A by keeping cleanliness >75% and staffing in the green.'},
  debt:{title:'Debt Watch',description:'Days in continuous debt. Sustained debt eventually closes the hospital.',warnings:['Closure threshold varies by difficulty.'],recommendation:'Apply for grants or sign a contract before reaching the limit.'},
  nursecov:{title:'Nurse Coverage',description:'Active nurses vs the rooms they need to cover this shift.',recommendation:'Aim for 1 nurse per 4 active treatment rooms.'},
  cnacov:{title:'CNA Coverage',description:'Active CNAs vs the office rooms they need to cover.',recommendation:'Aim for 1 CNA per 2 office rooms.'}
};
registerResolver('ttStat',(id)=>STAT_BLURBS[id]||null);

// Research nodes.
registerResolver('ttResearch',(id)=>{
  const tree=(typeof RESEARCH_TREE!=='undefined'?RESEARCH_TREE:[]);
  const t=tree.find(x=>x.id===id);
  if(!t)return null;
  const done=(typeof researchedTech!=='undefined'&&researchedTech.has?researchedTech.has(id):false);
  const haveRP=(typeof researchPoints!=='undefined'?researchPoints:0);
  const stats=[
    {label:'Cost',value:t.cost+' RP',tone:haveRP>=t.cost?'good':'bad'},
    {label:'Duration',value:t.days+' day'+(t.days===1?'':'s'),tone:'neutral'},
    {label:'Branch',value:t.branch,tone:'neutral'}
  ];
  const reqs=(t.requires||[]).map(rid=>{
    const r=tree.find(x=>x.id===rid);
    const met=(typeof researchedTech!=='undefined'&&researchedTech.has?researchedTech.has(rid):false);
    return{label:r?r.name:rid,met};
  });
  const warnings=[];
  if(!done&&haveRP<t.cost)warnings.push(`Need ${t.cost-haveRP} more RP to start.`);
  return{
    badge:done?'Researched':'Research',
    title:t.name,
    description:t.desc,
    stats,requirements:reqs,warnings,
    recommendation:t.rewardText
  };
});

// Grants.
registerResolver('ttGrant',(id)=>{
  const lib=(typeof GRANT_LIBRARY!=='undefined'?GRANT_LIBRARY:[]);
  const g=lib.find(x=>x.id===id);
  if(!g)return null;
  const stats=[];
  if(g.successChance!=null)stats.push({label:'Approval odds',value:Math.round(g.successChance*100)+'%',tone:g.successChance>=0.6?'good':g.successChance>=0.4?'neutral':'bad'});
  if(g.reviewDays!=null)stats.push({label:'Review time',value:g.reviewDays+' days',tone:'neutral'});
  if(g.durationDays!=null)stats.push({label:'Duration',value:g.durationDays+' days',tone:'neutral'});
  if(g.effect&&g.effect.approvalCash)stats.push({label:'Approval cash',value:'$'+g.effect.approvalCash.toLocaleString(),tone:'good'});
  const reqs=g.requirementText?[{label:g.requirementText}]:[];
  const warnings=[];
  if(g.effect&&g.effect.kind==='overpromise')warnings.push('Overpromise grants can claw back funds at expiry.');
  return{
    badge:g.category||'Grant',
    title:g.label,
    description:g.desc,
    stats,requirements:reqs,warnings,
    recommendation:g.rewardText
  };
});

// Contracts.
registerResolver('ttContract',(id)=>{
  const lib=(typeof CONTRACT_LIBRARY!=='undefined'?CONTRACT_LIBRARY:[]);
  const c=lib.find(x=>x.id===id);
  if(!c)return null;
  const stats=[];
  if(c.payment)stats.push({label:'Payment',value:'$'+c.payment.toLocaleString(),tone:'good'});
  if(c.dailyRevenue)stats.push({label:'Daily revenue',value:'$'+c.dailyRevenue.toLocaleString(),tone:'good'});
  if(c.duration)stats.push({label:'Duration',value:c.duration+' days',tone:'neutral'});
  if(c.privatePressure)stats.push({label:'Public-care pressure',value:'+'+Math.round(c.privatePressure*100)+'%',tone:'bad'});
  return{
    badge:'Contract',
    title:c.name||c.label||id,
    description:c.desc||c.description||'',
    stats,
    warnings:c.warning?[c.warning]:[],
    recommendation:c.recommend||'Sign only when you can absorb the extra public-care pressure.'
  };
});

// Staff traits.
registerResolver('ttTrait',(id)=>{
  if(typeof getTraitById!=='function')return null;
  const t=getTraitById(id);
  if(!t)return null;
  const tone=t.tone||(t.type==='negative'?'bad':t.type==='positive'?'good':'neutral');
  const desc=(typeof getTraitEffectText==='function')?getTraitEffectText(t):(t.desc||'');
  return{
    badge:({good:'Strength',bad:'Flaw',neutral:'Trait'})[tone]||'Trait',
    title:`${t.icon||''} ${t.label||id}`.trim(),
    description:desc,
    footer:t.group?'Group: '+t.group:null
  };
});

// Map / campus.
registerResolver('ttMap',(id)=>{
  if(typeof getCampus!=='function')return null;
  const c=getCampus(id);
  if(!c)return null;
  const m=c.mapBonus||c.modifiers||{};
  const stats=[];
  const fmtMult=v=>(v>=1?'+':'')+Math.round((v-1)*100)+'%';
  if(m.constructionCostMultiplier!=null&&m.constructionCostMultiplier!==1)stats.push({label:'Construction cost',value:fmtMult(m.constructionCostMultiplier),tone:m.constructionCostMultiplier<1?'good':'bad'});
  if(m.expansionCostMultiplier!=null&&m.expansionCostMultiplier!==1)stats.push({label:'Expansion cost',value:fmtMult(m.expansionCostMultiplier),tone:m.expansionCostMultiplier<1?'good':'bad'});
  if(m.researchMultiplier!=null&&m.researchMultiplier!==1)stats.push({label:'Research speed',value:fmtMult(m.researchMultiplier),tone:m.researchMultiplier>1?'good':'bad'});
  if(m.governmentPressureMultiplier!=null&&m.governmentPressureMultiplier!==1)stats.push({label:'Govt. pressure',value:fmtMult(m.governmentPressureMultiplier),tone:m.governmentPressureMultiplier<1?'good':'bad'});
  if(m.publicCareDemandMultiplier!=null&&m.publicCareDemandMultiplier!==1)stats.push({label:'Public-care demand',value:fmtMult(m.publicCareDemandMultiplier),tone:m.publicCareDemandMultiplier<1?'good':'bad'});
  return{
    badge:'Map',
    title:c.name||id,
    description:c.desc||c.description||'',
    stats,
    warnings:Array.isArray(c.drawbackText)?c.drawbackText:(c.drawbackText?[c.drawbackText]:[]),
    recommendation:c.recommendedFor||c.playstyle||null,
    footer:c.cols&&c.rows?`${c.cols}×${c.rows} grid`:null
  };
});

// Difficulty.
registerResolver('ttDifficulty',(id)=>{
  const presets=(typeof DIFFICULTY_PRESETS!=='undefined'?DIFFICULTY_PRESETS:null);
  const p=presets?presets[id]:null;
  if(!p)return null;
  const stats=[];
  if(p.startingMoney!=null)stats.push({label:'Starting cash',value:'$'+p.startingMoney.toLocaleString(),tone:'neutral'});
  if(p.govPressure!=null)stats.push({label:'Govt. pressure',value:p.govPressure+'×',tone:p.govPressure>1?'bad':p.govPressure<1?'good':'neutral'});
  if(p.eventChance!=null)stats.push({label:'Event chance',value:p.eventChance+'×',tone:p.eventChance>1?'bad':'good'});
  if(p.debtDays!=null)stats.push({label:'Debt grace',value:p.debtDays+' days',tone:'neutral'});
  return{
    badge:'Difficulty',
    title:p.label||id,
    description:p.desc||'',
    stats,
    recommendation:p.recommendation||null
  };
});

// Public Care Agreement.
registerResolver('ttPubliccare',()=>{
  return{
    badge:'Agreement',
    title:'Asherville Public Care Agreement',
    description:'Asherville granted this land in exchange for treating a steady share of public-care patients each review cycle.',
    requirements:[{label:'Treat enough public-care patients before each review'}],
    warnings:[
      'Failing review cuts the city grant and reputation.',
      'Each private contract raises the effective public-care threshold.'
    ],
    recommendation:'Keep at least one GP / Walk-In line dedicated to public-care payers; hire a Government Liaison for slack.'
  };
});

// ---- Auto-tag pass ---------------------------------------------------
function _autoTag(root){
  const r=root||document;
  // Build menu room buttons
  r.querySelectorAll('.rb[data-tool]:not([data-tt-room])').forEach(b=>{
    b.dataset.ttRoom=b.dataset.tool;
  });
  r.querySelectorAll('.dockbtn[data-tool]:not([data-tt-room])').forEach(b=>{
    b.dataset.ttRoom=b.dataset.tool;
  });
}

// ---- Event delegation ------------------------------------------------
function _findTrigger(el){
  if(!el||!el.closest)return null;
  return el.closest('[data-tt],[data-tt-room],[data-tt-stat],[data-tt-research],[data-tt-grant],[data-tt-contract],[data-tt-trait],[data-tt-map],[data-tt-difficulty],[data-tt-publiccare]');
}

function _wire(){
  document.addEventListener('mouseover',(e)=>{
    const t=_findTrigger(e.target);
    if(!t||t===_currentEl)return;
    clearTimeout(_showTimer);
    _showTimer=setTimeout(()=>{
      const data=_resolve(t);
      if(data)show(t,data);
    },120);
  });
  document.addEventListener('mouseout',(e)=>{
    const t=_findTrigger(e.target);
    if(!t)return;
    if(e.relatedTarget&&t.contains(e.relatedTarget))return;
    clearTimeout(_showTimer);
    hide();
  });
  document.addEventListener('focusin',(e)=>{
    const t=_findTrigger(e.target);
    if(!t)return;
    const data=_resolve(t);
    if(data)show(t,data);
  });
  document.addEventListener('focusout',(e)=>{
    const t=_findTrigger(e.target);
    if(!t)return;
    hide();
  });
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')hide();});
  // Auto-tag on first run + watch for new dom from renders.
  _autoTag();
  const mo=new MutationObserver(muts=>{
    for(const m of muts){
      m.addedNodes.forEach(n=>{
        if(n.nodeType===1)_autoTag(n);
      });
    }
  });
  mo.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_wire);
else _wire();

window.tooltip={show,hide,registerResolver,STAT_BLURBS};

})();
