const ADVISOR_DISMISS_MS=180000;
let advisorDismissed={};
let _advisorLastHash='';

function advisorEsc(str){
  if(str==null)return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function advisorIsDismissed(id){
  const until=advisorDismissed[id];
  if(!until)return false;
  if(Date.now()>until){delete advisorDismissed[id];return false;}
  return true;
}

function advisorDismiss(id){
  if(!id)return;
  advisorDismissed[id]=Date.now()+ADVISOR_DISMISS_MS;
  renderAdvisor();
}

function advisorClickAction(id,fnName,selector,...args){
  if(fnName&&typeof window[fnName]==='function'){
    try{window[fnName](...args);}catch(e){console.warn('Advisor action failed',fnName,e);}
  }
  if(selector){
    const el=document.querySelector(selector);
    if(el){
      el.scrollIntoView({block:'nearest',behavior:'smooth'});
      el.classList.add('advisor-flash');
      setTimeout(()=>el.classList.remove('advisor-flash'),1400);
    }
  }
  advisorDismiss(id);
}

function advisorHasRoom(type){
  if(typeof rooms==='undefined')return false;
  return rooms.some(r=>r.type===type&&!r.tutorialDemo);
}

function advisorHasStaff(role){
  if(typeof staff==='undefined')return false;
  return staff.some(m=>m.hired&&m.role===role&&!m.tutorialDemo);
}

function advisorStaffCount(role){
  if(typeof staff==='undefined')return 0;
  return staff.filter(m=>m.hired&&m.role===role&&!m.tutorialDemo).length;
}

function advisorRoomCount(type){
  if(typeof rooms==='undefined')return 0;
  return rooms.filter(r=>r.type===type&&!r.tutorialDemo).length;
}

function advisorWaitingPressure(){
  if(typeof patients==='undefined')return 0;
  return patients.filter(p=>p&&p.state==='waiting').length;
}

function advisorAvailableGrants(){
  if(typeof grantOffers==='undefined')return [];
  return grantOffers.filter(o=>o.status==='available');
}

function advisorPublicCareGrant(){
  return advisorAvailableGrants().find(o=>{
    const text=`${o.name||o.title||''} ${o.id||''} ${o.category||''}`.toLowerCase();
    return text.includes('public')||text.includes('community');
  });
}

function advisorEarlyResearchOpen(id){
  if(typeof researchedTech==='undefined')return false;
  if(researchedTech.has?.(id))return false;
  if(typeof activeResearch!=='undefined'&&activeResearch&&activeResearch.id===id)return false;
  return true;
}

function advisorBuild(rec){return rec;}

function getAdvisorRecommendations(){
  const list=[];
  if(typeof tutorialActive!=='undefined'&&tutorialActive&&!tutorialCompleted){
    return list; // tutorial card already drives the player
  }
  if(typeof gameOver!=='undefined'&&gameOver)return list;
  if(typeof isSandboxMode!=='undefined'&&isSandboxMode)return list;

  const started=typeof hasStarted!=='undefined'&&hasStarted;
  const isPaused=typeof paused!=='undefined'&&paused;

  // --- FOUNDATION ---
  if(!advisorHasRoom('waiting_room')){
    list.push({id:'build_waiting_room',priority:100,
      title:'Build a Waiting Room',
      reason:'Patients need a place to arrive and queue.',
      actionLabel:'Pick Waiting Room',
      fn:'sel',args:['waiting_room'],
      highlight:'.rb[data-tool="waiting_room"]'});
  }
  if(!advisorHasRoom('gp')){
    list.push({id:'build_gp',priority:95,
      title:'Build a GP Office',
      reason:'A GP Office is your first treatment room.',
      actionLabel:'Pick GP Office',
      fn:'sel',args:['gp'],
      highlight:'.rb[data-tool="gp"]'});
  }
  if(!advisorHasStaff('clerical')){
    list.push({id:'hire_clerical',priority:88,
      title:'Hire a Clerical worker',
      reason:'Clerical staff manage intake at the Waiting Room.',
      actionLabel:'Open Staff',
      fn:'openStaff',
      highlight:'#staffbtn'});
  }
  if(!advisorHasStaff('gp_doc')){
    list.push({id:'hire_gp_doc',priority:90,
      title:'Hire a GP Doctor',
      reason:'Without a doctor, the GP Office cannot treat patients.',
      actionLabel:'Open Staff',
      fn:'openStaff',
      highlight:'#staffbtn'});
  }
  if(!advisorHasStaff('nurse')){
    list.push({id:'hire_nurse',priority:80,
      title:'Hire a Nurse',
      reason:'Nurses support doctors and reduce treatment time.',
      actionLabel:'Open Staff',
      fn:'openStaff',
      highlight:'#staffbtn'});
  }
  if(!advisorHasStaff('janitor')){
    list.push({id:'hire_janitor',priority:78,
      title:'Hire a Janitor',
      reason:'Janitors keep cleanliness up. Low cleanliness drives complaints.',
      actionLabel:'Open Staff',
      fn:'openStaff',
      highlight:'#staffbtn'});
  }

  if(started&&isPaused&&advisorHasRoom('waiting_room')&&advisorHasRoom('gp')&&advisorHasStaff('gp_doc')){
    list.push({id:'press_play',priority:96,
      title:'Press Play to start treating patients',
      reason:'Your clinic is ready. Patients arrive while time runs.',
      actionLabel:'Press Play',
      fn:'togglePause',
      highlight:'#pbtn'});
  }
  if(!started){
    list.push({id:'press_play_initial',priority:85,
      title:'Press Play to begin the day',
      reason:'Time is paused. Press Play to start the simulation.',
      actionLabel:'Press Play',
      fn:'togglePause',
      highlight:'#pbtn'});
  }

  // --- LIVE PRESSURES (only after Play has been pressed) ---
  if(started){
    const waiters=advisorWaitingPressure();
    const gpCount=advisorRoomCount('gp');
    if(waiters>=Math.max(6,gpCount*4)){
      list.push({id:'add_gp_capacity',priority:75,
        title:'Waiting is high, add more GP capacity',
        reason:`${waiters} patients are waiting. More GP Offices clear the queue faster.`,
        actionLabel:'Pick GP Office',
        fn:'sel',args:['gp'],
        highlight:'.rb[data-tool="gp"]'});
    }
    if(typeof stress!=='undefined'&&stress>=65){
      list.push({id:'reduce_stress',priority:70,
        title:'Stress is rising, support your staff',
        reason:`Stress is ${Math.round(stress)}. Add a Staff Room, hire support, or invest in Operations research.`,
        actionLabel:'Open Departments',
        fn:'openDeptMenu',
        highlight:'#deptbtn'});
    }
    if(typeof cleanliness!=='undefined'&&cleanliness<=55){
      const hasJanitor=advisorHasStaff('janitor');
      list.push({id:'low_cleanliness',priority:72,
        title:'Cleanliness is low',
        reason:hasJanitor
          ?'Your janitor is overstretched. Hire another janitor or build a Janitor Closet near busy rooms.'
          :'Hire a Janitor to keep the clinic clean.',
        actionLabel:hasJanitor?'Pick Janitor Closet':'Open Staff',
        fn:hasJanitor?'sel':'openStaff',
        args:hasJanitor?['janitor_closet']:undefined,
        highlight:hasJanitor?'.rb[data-tool="janitor_closet"]':'#staffbtn'});
    }
    if(typeof reputation!=='undefined'&&reputation<55){
      list.push({id:'low_reputation',priority:68,
        title:'Reputation is slipping',
        reason:`Reputation is ${Math.round(reputation)}. Cut waits, raise cleanliness, and avoid new contracts until things stabilise.`,
        actionLabel:'Review Warnings',
        highlight:'#warningdeck'});
    }

    // Public care risk: govPenalty / govStatus textual hint
    const govStatusEl=document.getElementById('govStatus');
    const govStatusText=(govStatusEl?.textContent||'').toLowerCase();
    if(govStatusText.includes('risk')||govStatusText.includes('warn')||govStatusText.includes('penal')){
      list.push({id:'public_care_risk',priority:74,
        title:'Public care is at risk',
        reason:'You are below the Asherville public-care quota. Treat more public patients before the next review.',
        actionLabel:'Open Contracts',
        fn:'openContractMenu',
        highlight:'#gov-contract'});
    }
  }

  // --- OPPORTUNITIES ---
  const pubGrant=advisorPublicCareGrant();
  if(pubGrant){
    list.push({id:`grant_${pubGrant.id}`,priority:55,
      title:`Apply for ${pubGrant.name||pubGrant.title||'Public Care Support Grant'}`,
      reason:'A relevant public-care grant is available. Apply early — reviews take time.',
      actionLabel:'Open Grants',
      fn:'openGrantMenu',
      highlight:'#grantbtn'});
  }
  if(started&&typeof researchPoints!=='undefined'&&researchPoints>=30
    &&typeof activeResearch!=='undefined'&&!activeResearch){
    if(advisorEarlyResearchOpen('basic_triage')){
      list.push({id:'research_basic_triage',priority:50,
        title:'Start Basic Triage research',
        reason:'Speeds up GP and ER throughput — a strong early pick.',
        actionLabel:'Open Research',
        fn:'openResearchMenu',
        highlight:'#researchbtn'});
    }else if(advisorEarlyResearchOpen('staff_scheduling')){
      list.push({id:'research_staff_scheduling',priority:48,
        title:'Start Staff Scheduling research',
        reason:'Reduces staff energy drain and protects morale.',
        actionLabel:'Open Research',
        fn:'openResearchMenu',
        highlight:'#researchbtn'});
    }
  }

  // --- CASH / DEBT PRESSURE ---
  // High priority: actively losing days in the red, closure timer is ticking.
  if(started&&typeof debtDays!=='undefined'&&debtDays>=2){
    list.push({id:'debt_warning',priority:82,
      title:'Hospital is in debt',
      reason:`You have been below $0 for ${debtDays} day${debtDays===1?'':'s'}. Apply for a grant, accept a contract, or open the Budget panel to find savings before closure.`,
      actionLabel:'Open Budget',
      fn:'openBudgetMenu',
      highlight:'#badge-budget'});
  }else if(started&&typeof money!=='undefined'&&money<25000&&money>=0){
    // Soft warning: cash thin but not yet in debt — nudge toward grants/contracts
    // before it becomes a closure risk.
    const grants=advisorAvailableGrants();
    list.push({id:'cash_low',priority:62,
      title:'Cash reserves are getting thin',
      reason:`You have only $${Math.round(money).toLocaleString()} on hand. ${grants.length?'A grant is available — apply now to cover wages.':'Apply for a grant or accept a small contract to top up reserves.'}`,
      actionLabel:grants.length?'Open Grants':'Open Contracts',
      fn:grants.length?'openGrantMenu':'openContractMenu',
      highlight:grants.length?'#grantbtn':'#contractbtn'});
  }

  // --- MISSING REQUIRED STAFF ---
  // Built rooms with empty required-role slots can't serve patients. Use the
  // shared getMissingOperationalRoles helper so this stays in sync with the
  // rest of the staffing system.
  if(started&&typeof getMissingOperationalRoles==='function'){
    const missing=getMissingOperationalRoles();
    // Strip roles already covered by the foundation cards above to avoid
    // duplicates (those fire when staff is missing entirely; this fires when
    // a built room is starved of its required role).
    const fundamentals=new Set(['gp_doc','nurse','clerical','janitor']);
    const flagged=missing.filter(r=>!fundamentals.has(r));
    if(flagged.length){
      const roleLabel=role=>(typeof ROLES!=='undefined'&&ROLES[role]?.label)||role.replace(/_/g,' ');
      const names=flagged.slice(0,2).map(roleLabel).join(', ');
      const extra=flagged.length>2?` (+${flagged.length-2} more)`:'';
      list.push({id:'missing_required_staff',priority:78,
        title:`Built rooms are missing staff: ${names}${extra}`,
        reason:'These rooms cannot accept patients until a matching staffer is hired. The Hire Staff panel can filter by role.',
        actionLabel:'Open Staff',
        fn:'openStaff',
        highlight:'#staffbtn'});
    }
  }

  // --- ROOM BOTTLENECKS (diagnostics & pharmacy) ---
  // GP capacity is handled above. These cover the next layer of throughput
  // pressure once basic flow is going.
  if(started){
    const waitersAll=advisorWaitingPressure();
    if(waitersAll>=10){
      const labCount=advisorRoomCount('lab');
      const xrayCount=advisorRoomCount('xray');
      const pharmCount=advisorRoomCount('pharmacy');
      if(labCount===0&&advisorHasRoom('gp')){
        list.push({id:'bottleneck_lab',priority:64,
          title:'Add a Lab to ease diagnostics backlog',
          reason:'Patients waiting for blood work pile up at GP. A Lab keeps cases moving instead of sitting in the queue.',
          actionLabel:'Pick Lab',
          fn:'sel',args:['lab'],
          highlight:'.rb[data-tool="lab"]'});
      }else if(xrayCount===0&&advisorHasRoom('gp')){
        list.push({id:'bottleneck_xray',priority:63,
          title:'Add an X-Ray room',
          reason:'Imaging cases need somewhere to go. Without X-Ray, patients sit in the lobby.',
          actionLabel:'Pick X-Ray',
          fn:'sel',args:['xray'],
          highlight:'.rb[data-tool="xray"]'});
      }else if(pharmCount===0&&advisorHasRoom('gp')){
        list.push({id:'bottleneck_pharmacy',priority:62,
          title:'Build a Pharmacy',
          reason:'Without a Pharmacy, treated patients linger waiting for prescriptions and wait times spike.',
          actionLabel:'Pick Pharmacy',
          fn:'sel',args:['pharmacy'],
          highlight:'.rb[data-tool="pharmacy"]'});
      }
    }
  }

  // --- CONTRACT PRESSURE ---
  // Stacking too many private contracts raises the effective public-care
  // threshold and strains operations. Surface this before the next review.
  if(started&&typeof insuranceContracts!=='undefined'&&Array.isArray(insuranceContracts)&&insuranceContracts.length>=2){
    const rate=typeof getPublicCareRate==='function'?getPublicCareRate():1;
    const required=typeof govRequired!=='undefined'?govRequired:0.35;
    if(rate<required+0.05){
      list.push({id:'contract_overload',priority:73,
        title:`${insuranceContracts.length} private contracts are straining public-care quota`,
        reason:'Each private contract raises the effective Asherville quota at the next review. Drop one or treat more uninsured patients to stay safe.',
        actionLabel:'Open Contracts',
        fn:'openContractMenu',
        highlight:'#contractbtn'});
    }
  }

  // --- CONTRACT GUIDANCE ---
  const waitersNow=advisorWaitingPressure();
  const gpNow=advisorRoomCount('gp');
  const overloaded=waitersNow>=Math.max(8,gpNow*5)||(typeof stress!=='undefined'&&stress>=70);
  if(started&&overloaded){
    list.push({id:'avoid_contracts',priority:60,
      title:'Avoid new contracts until waiting improves',
      reason:'New insurance contracts will add patient volume your clinic cannot handle yet.',
      actionLabel:'OK, got it',
      highlight:'#contractbtn'});
  }else if(started&&advisorHasStaff('gp_doc')&&advisorRoomCount('gp')>=2&&waitersNow<=2&&(typeof reputation==='undefined'||reputation>=60)){
    list.push({id:'accept_safe_contract',priority:45,
      title:'Accept a safe insurance contract',
      reason:'Capacity is healthy. A small contract adds income without overloading the clinic.',
      actionLabel:'Open Contracts',
      fn:'openContractMenu',
      highlight:'#contractbtn'});
  }

  return list
    .filter(r=>!advisorIsDismissed(r.id))
    .sort((a,b)=>b.priority-a.priority);
}

function _advisorBindAction(btn,rec){
  // Forward any pre-bound args (e.g. ['gp'] for sel) so the targeted action
  // actually receives them — without this, sel() is called with no argument
  // and the build tool never gets selected.
  const args=Array.isArray(rec.args)?rec.args:[];
  btn.addEventListener('click',()=>advisorClickAction(rec.id,rec.fn||null,rec.highlight||null,...args));
}

function renderAdvisor(){
  const card=document.getElementById('advisor-card');
  if(!card)return;
  const recs=getAdvisorRecommendations();
  if(!recs.length){
    if(_advisorLastHash!==''){card.hidden=true;card.innerHTML='';_advisorLastHash='';}
    return;
  }
  const primary=recs[0];
  const secondary=recs.slice(1,3);
  const hash=[primary.id,primary.title,primary.reason,...secondary.map(s=>`${s.id}|${s.title}|${s.reason}`)].join('::');
  if(hash===_advisorLastHash){card.hidden=false;return;}
  _advisorLastHash=hash;

  const actionBtnHtml=primary.fn||primary.highlight
    ?`<button type="button" class="advisor-action" data-advisor-action="primary">${advisorEsc(primary.actionLabel||'Open')}</button>`
    :'';
  let html=`
    <div class="advisor-head">
      <span class="advisor-kicker">Recommended Next</span>
      <button type="button" class="advisor-dismiss" data-advisor-dismiss="primary" title="Dismiss for a few minutes">×</button>
    </div>
    <div class="advisor-title">${advisorEsc(primary.title)}</div>
    <div class="advisor-reason">${advisorEsc(primary.reason)}</div>
    <div class="advisor-actions">${actionBtnHtml}</div>
  `;
  if(secondary.length){
    html+=`<div class="advisor-secondary"><span class="advisor-secondary-label">Also worth a look</span>`;
    secondary.forEach((s,i)=>{
      html+=`<button type="button" class="advisor-secondary-item" data-advisor-action="secondary-${i}"><span class="advisor-secondary-title">${advisorEsc(s.title)}</span><span class="advisor-secondary-reason">${advisorEsc(s.reason)}</span></button>`;
    });
    html+=`</div>`;
  }
  card.innerHTML=html;
  card.hidden=false;

  const dismissBtn=card.querySelector('[data-advisor-dismiss="primary"]');
  if(dismissBtn)dismissBtn.addEventListener('click',()=>advisorDismiss(primary.id));
  const primaryBtn=card.querySelector('[data-advisor-action="primary"]');
  if(primaryBtn)_advisorBindAction(primaryBtn,primary);
  secondary.forEach((s,i)=>{
    const btn=card.querySelector(`[data-advisor-action="secondary-${i}"]`);
    if(btn)_advisorBindAction(btn,s);
  });
}

if(typeof updateUI==='function'){
  const _origUpdateUIForAdvisor=updateUI;
  updateUI=function(){
    _origUpdateUIForAdvisor.apply(this,arguments);
    try{renderAdvisor();}catch(e){console.warn('renderAdvisor failed',e);}
  };
}

if(document.readyState!=='loading')renderAdvisor();
else document.addEventListener('DOMContentLoaded',renderAdvisor);
