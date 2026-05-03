// Bottleneck Detection
// ---------------------
// Scans hospital state and identifies the single biggest throughput problem
// right now. Sibling system to the Advisor: the advisor says "do this next",
// while this system explains "this is what's holding the hospital back".
//
// Each detector returns a bottleneck record { id, severity, cause,
// affectedSystems, fixes, message } or null. The top-severity record is
// rendered into #bottleneck-card in the right panel.

const BOTTLENECK_DISMISS_MS = 120000;
let _bottleneckDismissed = {};
let _bottleneckLastHash = '';

function bnEsc(str){
  if(str==null)return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function bnIsDismissed(id){
  const until=_bottleneckDismissed[id];
  if(!until)return false;
  if(Date.now()>until){delete _bottleneckDismissed[id];return false;}
  return true;
}

function bnDismiss(id){
  if(!id)return;
  _bottleneckDismissed[id]=Date.now()+BOTTLENECK_DISMISS_MS;
  renderBottleneckCard();
}

function bnRoomCount(type){
  if(typeof rooms==='undefined')return 0;
  return rooms.filter(r=>r.type===type&&!r.tutorialDemo).length;
}

function bnHasRoom(type){return bnRoomCount(type)>0;}

function bnWaitingForType(type){
  if(typeof patients==='undefined')return 0;
  return patients.filter(p=>p&&p.state==='waiting'&&p.needs&&p.needs[p.step]===type).length;
}

function bnTotalWaiting(){
  if(typeof patients==='undefined')return 0;
  return patients.filter(p=>p&&p.state==='waiting').length;
}

function bnActiveStaff(){
  if(typeof staff==='undefined')return [];
  return staff.filter(s=>s&&s.hired&&!s.tutorialDemo);
}

// SEVERITY scale: 0-100. Bigger = worse. Used both for "top bottleneck"
// selection and for the colored severity pill in the UI.
function bnSeverityClass(sev){
  if(sev>=80)return 'bn-sev-critical';
  if(sev>=55)return 'bn-sev-high';
  if(sev>=30)return 'bn-sev-medium';
  return 'bn-sev-low';
}
function bnSeverityLabel(sev){
  if(sev>=80)return 'Critical';
  if(sev>=55)return 'High';
  if(sev>=30)return 'Medium';
  return 'Low';
}

// --- DETECTORS ---------------------------------------------------------
// Each returns null when not applicable. Severity is hand-tuned so genuine
// emergencies (no public-care compliance, debt) outrank slow problems
// (research stagnation).

function detectStaffShortage(){
  // Built rooms missing required roles. This blocks throughput entirely
  // for the affected rooms, so it ranks high.
  if(typeof getMissingOperationalRoles!=='function')return null;
  const missing=getMissingOperationalRoles();
  if(!missing||!missing.length)return null;
  const roleLabel=role=>(typeof ROLES!=='undefined'&&ROLES[role]?.label)||role.replace(/_/g,' ');
  const names=missing.slice(0,3).map(roleLabel).join(', ');
  const extra=missing.length>3?` and ${missing.length-3} more`:'';
  // Severity scales with how many roles are missing.
  const severity=Math.min(95,55+missing.length*8);
  return{
    id:'staffing',
    severity,
    title:'Understaffed Rooms',
    cause:`Built rooms are missing required staff: ${names}${extra}.`,
    consequence:'Affected rooms produce no revenue and patients back up across the hospital.',
    affectedSystems:['Patient flow','Room utilization','Revenue'],
    fixes:['Open the Hire Staff panel','Filter by the missing roles','Hire one of each before the next shift'],
    action:{label:'Open People',selector:'#dock-people'},
    message:`Main bottleneck: Staffing. Several rooms are built but missing required employees (${names}${extra}).`
  };
}

function detectPublicCareCompliance(){
  // Failing the Asherville quota leads to penalties at the next review.
  if(typeof getPublicCareRate!=='function'||typeof govRequired==='undefined')return null;
  const rate=getPublicCareRate();
  if(typeof totalPatients==='undefined'||totalPatients<10)return null;
  if(rate>=govRequired)return null;
  const gap=govRequired-rate;
  const severity=Math.min(95,60+Math.round(gap*120));
  return{
    id:'public_care',
    severity,
    title:'Public Care At Risk',
    cause:`Public-patient share is ${Math.round(rate*100)}% — below the ${Math.round(govRequired*100)}% Asherville requirement.`,
    consequence:'Asherville may reduce funding and impose reputation penalties at the next review.',
    affectedSystems:['Government agreement','Reputation','Land grant'],
    fixes:['Accept public care grants','Avoid private-heavy contracts','Improve intake for public patients'],
    action:{label:'Open Contracts',selector:'#dock-management'},
    message:'Main bottleneck: Public Care Compliance. You are below the Asherville quota and risk penalties at the next review.'
  };
}

function detectCashFlow(){
  if(typeof debtDays!=='undefined'&&debtDays>=2){
    return{
      id:'cashflow_debt',
      severity:Math.min(95,70+debtDays*5),
      title:'In Debt',
      cause:`Hospital has been below $0 for ${debtDays} day${debtDays===1?'':'s'}.`,
      consequence:'The hospital may be forced to close if debt continues.',
      affectedSystems:['Wages','Hiring','Construction'],
      fixes:['Open the Budget panel','Apply for a grant or accept a contract','Pause non-essential builds'],
      action:{label:'Open Management',selector:'#dock-management'},
      message:`Main bottleneck: Cash Flow. The hospital is in debt (${debtDays} day${debtDays===1?'':'s'}) and may be forced to close.`
    };
  }
  const snap=typeof getBudgetSnapshot==='function'?getBudgetSnapshot():null;
  if(snap&&snap.net<-2000&&typeof money!=='undefined'&&money<50000){
    // Burning faster than reserves can absorb.
    return{
      id:'cashflow_burn',
      severity:55,
      title:'Burning Through Reserves',
      cause:`This month's net is ${snap.net<0?'-':''}$${Math.abs(snap.net).toLocaleString()} with $${Math.round(money).toLocaleString()} in reserves.`,
      consequence:'Reserves will run out within a few months at this burn rate.',
      affectedSystems:['Solvency','Wage payments','Future hires'],
      fixes:['Review the Budget panel for high-cost rooms','Apply for a grant','Avoid new contracts that add wage load'],
      action:{label:'Open Management',selector:'#dock-management'},
      message:'Main bottleneck: Cash Flow. Monthly burn is outpacing reserves — solvency is the real limiter, not patient flow.'
    };
  }
  return null;
}

function detectStaffFatigue(){
  const active=bnActiveStaff();
  if(active.length<3)return null;
  const lowEnergy=active.filter(s=>(s.energy??100)<45).length;
  const ratio=lowEnergy/active.length;
  if(ratio<0.3)return null;
  // Stress amplifies fatigue impact.
  const stressLevel=typeof stress!=='undefined'?stress:0;
  const severity=Math.min(85,30+Math.round(ratio*50)+(stressLevel>=70?10:0));
  return{
    id:'fatigue',
    severity,
    title:'Staff Fatigue',
    cause:`${lowEnergy} of ${active.length} on-shift staff are below 45% energy${stressLevel>=70?` and stress is ${Math.round(stressLevel)}`:''}.`,
    consequence:'Treatment speed drops and the risk of quits and mistakes climbs.',
    affectedSystems:['Treatment speed','Quit risk','Mistake rate'],
    fixes:['Build a Staff Room or Lunch Room for breaks','Hire more staff so individuals work fewer rooms','Research Staff Scheduling for slower energy drain'],
    action:{label:'Open Build',selector:'#dock-build'},
    message:'Main bottleneck: Staff Fatigue. A large share of your team is running on empty — treatment is slowing across the board.'
  };
}

function detectCleanliness(){
  if(typeof cleanliness==='undefined')return null;
  if(cleanliness>=55)return null;
  // Below 40 is a real spiral, above that just a warning.
  const severity=cleanliness<30?80:cleanliness<40?65:45;
  const hasJanitor=bnActiveStaff().some(s=>s.role==='janitor');
  return{
    id:'cleanliness',
    severity,
    title:'Hospital Is Dirty',
    cause:`Cleanliness is ${Math.round(cleanliness)}.`,
    consequence:'Reputation falls and infection events become more likely.',
    affectedSystems:['Reputation','Infection events','Patient morale'],
    fixes:hasJanitor
      ?['Hire a second janitor','Build a Janitor Closet near busy rooms','Reduce simultaneous patient volume']
      :['Hire a Janitor immediately','Build a Janitor Closet','Avoid new contracts until cleanliness recovers'],
    action:{label:'Open People',selector:'#dock-people'},
    message:`Main bottleneck: Cleanliness. The hospital is ${cleanliness<30?'filthy':'visibly dirty'} and reputation is taking damage.`
  };
}

function detectRoomBottleneck(type,label,fixes){
  // Generic room-queue detector. Severity scales with queue length.
  const waiting=bnWaitingForType(type);
  const count=bnRoomCount(type);
  if(waiting<4)return null;
  // Threshold scales with room count: a single room handling 6 patients is
  // worse than four rooms each handling 6.
  const perRoom=count>0?waiting/count:waiting;
  if(count>0&&perRoom<3)return null;
  let severity;
  if(count===0)severity=70; // a built waiting room with nowhere to send people is bad
  else if(perRoom>=6)severity=70;
  else if(perRoom>=4)severity=55;
  else severity=40;
  return{
    id:`room_${type}`,
    severity,
    title:`High ${label} Waiting`,
    cause:count===0
      ?`${waiting} patients need ${label} but no ${label} is built yet.`
      :`${waiting} patients are queued for ${label} across ${count} room${count===1?'':'s'} (~${Math.round(perRoom)} per room).`,
    consequence:'Reputation may fall and patients may walk out without treatment.',
    affectedSystems:['Waiting time','Patient walkouts','Reputation'],
    fixes,
    action:{label:'Open Build',selector:'#dock-build'},
    message:count===0
      ?`Main bottleneck: ${label}. Patients have nowhere to go — building one will unlock the next stage of the queue.`
      :`Main bottleneck: ${label} Capacity. Patients are arriving faster than ${label.toLowerCase()} can treat them.`
  };
}

function detectGP(){
  return detectRoomBottleneck('gp','GP',['Build a GP Office','Hire a GP Doctor','Research Basic Triage']);
}
function detectER(){
  return detectRoomBottleneck('er','ER',['Build another ER bay','Hire an ER Doctor and Nurse','Upgrade the ER department']);
}
function detectDiagnostics(){
  // Lab + xray share the diagnostics bottleneck role: pick whichever has the
  // bigger queue.
  const lab=detectRoomBottleneck('lab','Lab',['Build a Lab','Hire a Lab Technician','Upgrade Diagnostics']);
  const xray=detectRoomBottleneck('xray','X-Ray',['Build an X-Ray room','Hire an X-Ray Technician','Upgrade Diagnostics']);
  if(lab&&xray)return lab.severity>=xray.severity?lab:xray;
  return lab||xray;
}
function detectPharmacy(){
  return detectRoomBottleneck('pharmacy','Pharmacy',['Build a Pharmacy','Hire a Pharmacist','Upgrade Operations to speed dispensing']);
}

function detectWaitingRoomPressure(){
  // The catch-all: lots of people waiting overall, but no single room type
  // dominates. Lower severity than a specific room bottleneck.
  const total=bnTotalWaiting();
  if(total<10)return null;
  const cap=typeof effectiveWaitingCapacity==='function'?effectiveWaitingCapacity():12;
  if(total<cap*1.2)return null;
  const severity=Math.min(70,30+Math.round((total-cap)/2));
  return{
    id:'waiting_room',
    severity,
    title:'Waiting Room Pressure',
    cause:`${total} patients are waiting against an effective capacity of ~${Math.round(cap)}.`,
    consequence:'Walkouts rise, stress climbs, and reputation falls.',
    affectedSystems:['Walkouts','Stress','Reputation'],
    fixes:['Add another Waiting Room','Add capacity to the most-queued treatment room','Slow new arrivals by pausing marketing/contracts'],
    action:{label:'Open Build',selector:'#dock-build'},
    message:'Main bottleneck: Waiting Room Pressure. Arrivals are outpacing your overall throughput.'
  };
}

function detectResearchStagnation(){
  if(typeof researchPoints==='undefined')return null;
  if(typeof activeResearch!=='undefined'&&activeResearch)return null;
  // Only flag if we have meaningful RP sitting unused AND a research room.
  if(!bnHasRoom('research_lab'))return null;
  if(researchPoints<20)return null;
  const severity=Math.min(45,15+Math.floor(researchPoints/10));
  return{
    id:'research_stagnation',
    severity,
    title:'Research Stagnation',
    cause:`${researchPoints} RP are sitting idle with no active research project.`,
    consequence:'Long-term progression slows and tech tree unlocks are delayed.',
    affectedSystems:['Long-term progression','Tech tree unlocks'],
    fixes:['Open the Research Lab','Pick a project that addresses your current pressure (triage, scheduling, sanitation)'],
    action:{label:'Open Hospital',selector:'#dock-hospital'},
    message:'Main bottleneck: Research Stagnation. Research points are accumulating but nothing is being researched.'
  };
}

// --- AGGREGATION -------------------------------------------------------
function getBottlenecks(){
  // Skip during tutorial / pre-start / sandbox to avoid noise.
  if(typeof tutorialActive!=='undefined'&&tutorialActive&&!(typeof tutorialCompleted!=='undefined'&&tutorialCompleted))return [];
  if(typeof gameOver!=='undefined'&&gameOver)return [];
  if(typeof isSandboxMode!=='undefined'&&isSandboxMode)return [];
  if(typeof hasStarted!=='undefined'&&!hasStarted)return [];

  const detectors=[
    detectStaffShortage,
    detectPublicCareCompliance,
    detectCashFlow,
    detectStaffFatigue,
    detectCleanliness,
    detectGP,
    detectER,
    detectDiagnostics,
    detectPharmacy,
    detectWaitingRoomPressure,
    detectResearchStagnation
  ];
  const out=[];
  for(const d of detectors){
    let rec=null;
    try{rec=d();}catch(e){console.warn('Bottleneck detector failed',d.name,e);}
    if(rec&&!bnIsDismissed(rec.id))out.push(rec);
  }
  return out.sort((a,b)=>b.severity-a.severity);
}

function getTopBottleneck(){return getBottlenecks()[0]||null;}

// --- RENDER ------------------------------------------------------------
function renderBottleneckCard(){
  const card=document.getElementById('bottleneck-card');
  if(!card)return;
  const top=getTopBottleneck();
  if(!top){
    if(_bottleneckLastHash!==''){card.hidden=true;card.innerHTML='';_bottleneckLastHash='';}
    return;
  }
  const hash=`${top.id}|${top.severity}|${top.cause}`;
  if(hash===_bottleneckLastHash){card.hidden=false;return;}
  _bottleneckLastHash=hash;

  const fixesHtml=(top.fixes||[]).slice(0,3)
    .map(f=>`<li>${bnEsc(f)}</li>`).join('');
  const affectedHtml=(top.affectedSystems||[])
    .map(s=>`<span class="bn-chip">${bnEsc(s)}</span>`).join('');
  const title=top.title||'Main Bottleneck';
  const consequence=top.consequence||'';
  const action=top.action;

  card.className=`bottleneck-card ${bnSeverityClass(top.severity)}`;
  card.innerHTML=`
    <div class="bn-head">
      <span class="bn-kicker">Main Bottleneck</span>
      <span class="bn-severity">${bnEsc(bnSeverityLabel(top.severity))}</span>
      <button type="button" class="bn-dismiss" title="Dismiss for 2 minutes">×</button>
    </div>
    <div class="bn-title">${bnEsc(title)}</div>
    <div class="bn-cause"><span class="bn-label">Cause:</span> ${bnEsc(top.cause)}</div>
    ${consequence?`<div class="bn-consequence"><span class="bn-label">Consequence:</span> ${bnEsc(consequence)}</div>`:''}
    ${affectedHtml?`<div class="bn-affected">${affectedHtml}</div>`:''}
    ${fixesHtml?`<div class="bn-fixes-label">Suggested fixes</div><ul class="bn-fixes">${fixesHtml}</ul>`:''}
    ${action?`<button type="button" class="bn-action" data-selector="${bnEsc(action.selector||'')}">${bnEsc(action.label)} →</button>`:''}
  `;
  card.hidden=false;

  const dismiss=card.querySelector('.bn-dismiss');
  if(dismiss)dismiss.addEventListener('click',()=>bnDismiss(top.id));
  const actBtn=card.querySelector('.bn-action');
  if(actBtn)actBtn.addEventListener('click',()=>bnTriggerAction(actBtn.dataset.selector));
  if(window.animPolish)window.animPolish.polishWarningEnter(card);
}

function bnTriggerAction(selector){
  if(!selector)return;
  const el=document.querySelector(selector);
  if(!el)return;
  try{el.click&&el.click();}catch(e){}
  el.classList.add('bn-flash');
  setTimeout(()=>el.classList.remove('bn-flash'),1400);
}

// Hook into updateUI so the card refreshes on every tick alongside the
// rest of the right panel. Mirrors the advisor's wiring.
if(typeof updateUI==='function'){
  const _origUpdateUIForBottleneck=updateUI;
  updateUI=function(){
    _origUpdateUIForBottleneck.apply(this,arguments);
    try{renderBottleneckCard();}catch(e){console.warn('renderBottleneckCard failed',e);}
  };
}

if(document.readyState!=='loading')renderBottleneckCard();
else document.addEventListener('DOMContentLoaded',renderBottleneckCard);
