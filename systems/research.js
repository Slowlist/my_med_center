// Research Tree — data-driven, 6 branches. Add nodes to RESEARCH_TREE in game.js.

const BRANCH_META={
  clinical:{label:'Clinical Care',icon:'🩺',color:'#e57373'},
  diagnostics:{label:'Diagnostics',icon:'🧪',color:'#f4c542'},
  operations:{label:'Operations',icon:'🛠️',color:'#66bb6a'},
  administration:{label:'Administration',icon:'📋',color:'#64b5f6'},
  digital:{label:'Digital Infrastructure',icon:'🖥️',color:'#ab6ff0'},
  access:{label:'Patient Access',icon:'🚪',color:'#26b5a0'},
};

const RESEARCH_MILESTONES=[
  {at:5,  reward:'rp',    amount:150,   icon:'🔬',label:'Research Pioneer',       desc:'Your hospital has committed to science.'},
  {at:10, reward:'money', amount:8000,  icon:'🏆',label:'Academic Excellence',    desc:'Sustained investment earns a research grant.'},
  {at:15, reward:'rep',   amount:3,     icon:'⭐',label:'Medical Innovation Hub', desc:'Your hospital gains national recognition.'},
  {at:21, reward:'money', amount:15000, icon:'🎖️',label:'Research Authority',     desc:'A major body recognizes and funds your work.'},
  {at:28, reward:'rp',    amount:500,   icon:'🏅',label:'Full Research Mastery',   desc:'Every research project completed — true mastery.'},
];

const IDENTITY_PATHS=[
  {id:'community',name:'Traditional Community Hospital',icon:'🏘️',color:'#4ade80',
   theme:'Public care, stability, government compliance, community service',
   threshold:3,
   bonuses:{governmentPenaltyMult:0.7,publicReputationBonus:0.25},
   drawbacks:null,
   bonusDesc:'Government penalty multiplier −30%; public reputation gains +25%.',
   risks:null,
  },
  {id:'ai',name:'AI Hospital',icon:'🤖',color:'#60a5fa',
   theme:'Automation, prediction, digital routing, efficiency',
   threshold:3,
   bonuses:{waitPressureRelief:5},
   drawbacks:{itOutagePenaltyMult:1.5},
   bonusDesc:'Patient wait tolerance +5 (waiting pressure reduced).',
   risks:'IT outage events 50% more punishing',
  },
  {id:'manufacturing',name:'Manufacturing Hospital',icon:'🏭',color:'#fb923c',
   theme:'Self-sufficiency, supply chain control, in-house production',
   threshold:3,
   bonuses:{supplyCostMult:0.85,supplyShortageChanceMult:0.7},
   drawbacks:{sterileFailurePenaltyMult:1.5},
   bonusDesc:'Supply costs −15%; supply shortage events −30% chance.',
   risks:'Sterile failure events 50% more severe',
  },
  {id:'university',name:'University Hospital',icon:'🎓',color:'#a78bfa',
   theme:'Teaching, research, prestige, residents, clinical trials',
   threshold:3,
   bonuses:{researchPointBonus:1,trainingXpBonus:0.25},
   drawbacks:{trainingMistakeChanceMult:1.5},
   bonusDesc:'+1 RP/day; intern/resident XP gain +25%.',
   risks:'Training mistake events 50% more likely',
  },
  {id:'private',name:'Private Specialty Hospital',icon:'💎',color:'#f472b6',
   theme:'VIP patients, premium insurance, profit, private wings',
   threshold:3,
   bonuses:null,drawbacks:null,
   bonusDesc:'Coming soon — private specialty path in development.',
   risks:null,
   placeholder:true,
  },
];

function getIdentityPathNodes(pathId){
  if(typeof RESEARCH_TREE==='undefined'||!Array.isArray(RESEARCH_TREE))return[];
  return RESEARCH_TREE.filter(n=>n.identityPath===pathId).map(n=>n.id);
}
function getIdentityProgress(pathId){
  const path=IDENTITY_PATHS.find(p=>p.id===pathId);
  if(!path)return{count:0,threshold:3,unlocked:false,total:0};
  const nodes=getIdentityPathNodes(pathId);
  const count=nodes.filter(id=>researchedTech.has(id)).length;
  const threshold=path.threshold||3;
  const unlocked=!path.placeholder&&count>=threshold;
  return{count,threshold,unlocked,total:nodes.length,nodes};
}
function evaluateIdentityUnlocks(){
  if(typeof unlockedIdentities==='undefined')return[];
  const newly=[];
  IDENTITY_PATHS.forEach(path=>{
    if(path.placeholder)return;
    const progress=getIdentityProgress(path.id);
    if(progress.unlocked&&!unlockedIdentities.has(path.id)){
      unlockedIdentities.add(path.id);
      newly.push(path);
    }
  });
  newly.forEach(path=>{
    addLog(`${path.icon} ${path.name} identity unlocked! ${path.bonusDesc}`,'g');
    if(typeof showToast==='function')setTimeout(()=>showToast(`${path.icon} ${path.name} identity unlocked`,'good'),300);
  });
  return newly;
}

let researchBranchFilter='all';

function setResearchBranch(branch){
  researchBranchFilter=branch;
  renderResearch();
}

function syncTechTreeState(){
  if(!techTree||typeof techTree!=='object')techTree=makeTechTree();
  const map={
    basic_triage:'basicTriage',fast_track:'fastTrack',
    basic_imaging:'basicImaging',faster_lab_processing:'fasterLabProcessing',
    staff_scheduling:'staffScheduling',break_optimization:'breakOptimization',
    government_compliance:'governmentCompliance',contract_negotiation:'contractNegotiation'
  };
  Object.entries(map).forEach(([newId,oldKey])=>{
    if(techTree[oldKey]!==undefined)
      techTree[oldKey].unlocked=techTree[oldKey].unlocked||researchedTech.has(newId);
  });
}

function getTechNodeState(key,requires=[]){
  if(researchedTech.has(key))return'unlocked';
  const prereqsMet=requires.every(req=>researchedTech.has(req));
  return prereqsMet?'available':'locked';
}

function getTechBonus(){
  const r=id=>researchedTech.has(id);
  const bonus={
    speed:1,erSpeed:1,gpSpeed:1,basicPatientSpeed:1,diagnosticSpeed:1,
    basicWaitBonus:0,energyDrainMult:1,breakEnergyBonus:0,breakMoraleBonus:0,
    trainingXpMult:1,governmentPenaltyMult:1,contractRewardMult:1,
    insuranceStressRelief:0,stress:0,itRpBonus:0,wardSpeed:1,
    dischargeSpeed:1,grantApprovalBonus:0,researchSpeedBonus:0,
    quitRiskReduction:0,passiveChaosReduction:0,delegationAmplify:false
  };
  // Clinical Care
  if(r('basic_triage')){bonus.erSpeed+=0.1;bonus.gpSpeed+=0.1;}
  if(r('rapid_assessment')){bonus.gpSpeed+=0.1;}
  if(r('fast_track')){bonus.basicPatientSpeed+=0.15;bonus.basicWaitBonus+=4;}
  if(r('icu_protocols')){bonus.wardSpeed+=0.2;}
  // Diagnostics
  if(r('faster_lab_processing'))bonus.diagnosticSpeed+=0.15;
  if(r('automated_testing'))bonus.diagnosticSpeed+=0.25;
  if(r('clinical_decision_support'))bonus.diagnosticSpeed+=0.2;
  // Operations
  if(r('staff_scheduling'))bonus.energyDrainMult*=0.88;
  if(r('fatigue_management'))bonus.energyDrainMult*=0.9;
  if(r('break_optimization')){bonus.breakEnergyBonus+=2;bonus.breakMoraleBonus+=2;}
  if(r('burnout_prevention')){bonus.breakEnergyBonus+=2;bonus.breakMoraleBonus+=2;}
  if(r('preventive_maintenance'))bonus.passiveChaosReduction+=1;
  if(r('operations_command_center')){bonus.delegationAmplify=true;bonus.passiveChaosReduction+=1;}
  // Administration
  if(r('government_compliance'))bonus.governmentPenaltyMult*=0.5;
  if(r('contract_negotiation')){bonus.contractRewardMult*=1.25;bonus.insuranceStressRelief+=1;}
  if(r('insurance_optimization'))bonus.insuranceStressRelief+=1;
  if(r('grant_research_program'))bonus.grantApprovalBonus+=0.1;
  if(r('audit_shield'))bonus.governmentPenaltyMult*=0.7;
  if(r('hr_workflow_system'))bonus.quitRiskReduction+=0.08;
  if(r('contract_review_process'))bonus.contractRewardMult*=1.04;
  if(r('grant_management_platform'))bonus.grantApprovalBonus+=0.04;
  if(r('compliance_tracking'))bonus.governmentPenaltyMult*=0.75;
  // Digital Infrastructure
  if(r('digital_filing')){bonus.itRpBonus+=0.5;bonus.basicWaitBonus+=1;}
  if(r('hospital_wifi')){bonus.speed+=0.05;bonus.basicWaitBonus+=2;}
  if(r('electronic_health_records')){bonus.diagnosticSpeed+=0.1;bonus.itRpBonus+=0.5;}
  if(r('staff_tablets')){bonus.dischargeSpeed+=0.1;bonus.gpSpeed+=0.05;}
  if(r('department_workstations')){bonus.itRpBonus+=1;bonus.trainingXpMult*=1.05;}
  if(r('digital_backup_system'))bonus.governmentPenaltyMult*=0.85;
  if(r('server_room_upgrade')){bonus.itRpBonus+=1.5;bonus.researchSpeedBonus+=0.5;}
  if(r('automated_patient_flow')){bonus.basicWaitBonus+=4;bonus.erSpeed+=0.1;bonus.dischargeSpeed+=0.1;}
  if(r('predictive_operations_ai')){bonus.basicWaitBonus+=2;bonus.stress+=3;}
  // Patient Access
  if(r('triage_protocols'))bonus.basicWaitBonus+=4;
  if(r('discharge_planning'))bonus.dischargeSpeed+=0.15;
  if(r('patient_navigation_program'))bonus.basicWaitBonus+=1;
  // Identity path bonuses
  const ib=getIdentityBonuses();
  bonus.governmentPenaltyMult*=ib.governmentPenaltyMult;
  bonus.basicWaitBonus+=ib.waitPressureRelief;
  bonus.itRpBonus+=ib.researchPointBonus;
  bonus.trainingXpMult*=(1+ib.trainingXpBonus);
  bonus.publicReputationBonus=ib.publicReputationBonus;
  bonus.supplyCostMult=ib.supplyCostMult;
  bonus.supplyShortageChanceMult=ib.supplyShortageChanceMult;
  bonus.sterileFailurePenaltyMult=ib.sterileFailurePenaltyMult;
  bonus.trainingMistakeChanceMult=ib.trainingMistakeChanceMult;
  bonus.itOutagePenaltyMult=ib.itOutagePenaltyMult;
  // Legacy event-gating flags (used by economy.js to filter identity events)
  bonus.aiOutageRisk=isIdentityUnlocked('ai');
  bonus.sterilityRisk=isIdentityUnlocked('manufacturing');
  bonus.trainingMistakeRisk=isIdentityUnlocked('university');
  bonus.communityRepBonus=isIdentityUnlocked('community')?2:0;
  // Department upgrade bonuses
  if(typeof getDeptBonus==='function'){
    const db=getDeptBonus();
    bonus.erSpeed+=db.erSpeed||0;
    bonus.wardSpeed+=db.wardSpeed||0;
    bonus.diagnosticSpeed+=db.diagnosticSpeed||0;
    bonus.dischargeSpeed+=db.dischargeSpeed||0;
    bonus.gpSpeed+=db.gpSpeed||0;
    bonus.basicWaitBonus+=db.basicWaitBonus||0;
    bonus.breakEnergyBonus+=db.breakEnergyBonus||0;
    bonus.breakMoraleBonus+=db.breakMoraleBonus||0;
    bonus.stress+=db.stress||0;
    bonus.grantApprovalBonus+=db.grantApprovalBonus||0;
    bonus.itRpBonus+=db.itRpBonus||0;
    bonus.researchSpeedBonus+=db.researchSpeedBonus||0;
    if(db.governmentPenaltyMult<1)bonus.governmentPenaltyMult*=db.governmentPenaltyMult;
    if(db.contractRewardMult>1)bonus.contractRewardMult*=db.contractRewardMult;
  }
  return bonus;
}

function isIdentityUnlocked(pathId){
  if(typeof unlockedIdentities!=='undefined'&&unlockedIdentities.has&&unlockedIdentities.has(pathId))return true;
  // Fallback: derive from researched nodes (used before unlockedIdentities exists or after load)
  const p=getIdentityProgress(pathId);
  return p.unlocked;
}
function getIdentityBonuses(){
  const result={
    governmentPenaltyMult:1,publicReputationBonus:0,
    waitPressureRelief:0,itOutagePenaltyMult:1,
    supplyCostMult:1,supplyShortageChanceMult:1,sterileFailurePenaltyMult:1,
    researchPointBonus:0,trainingXpBonus:0,trainingMistakeChanceMult:1
  };
  IDENTITY_PATHS.forEach(path=>{
    if(path.placeholder)return;
    if(!isIdentityUnlocked(path.id))return;
    const apply=(src)=>{
      if(!src)return;
      Object.entries(src).forEach(([k,v])=>{
        if(result[k]==null)return;
        // multiplicative for *Mult fields, additive for the rest
        if(/Mult$/.test(k))result[k]*=v;
        else result[k]+=v;
      });
    };
    apply(path.bonuses);
    apply(path.drawbacks);
  });
  return result;
}

function getActiveIdentityPaths(){
  return IDENTITY_PATHS.filter(p=>!p.placeholder&&isIdentityUnlocked(p.id));
}

function getDailyResearchPointIncome(shift){
  shift=shift||currentShift();
  const itBonus=countOperationalRooms('it_department',shift)>0?1:0;
  const headBonus=countOperationalRooms('head_office',shift)>0?1:0;
  const directorBonus=staff.some(m=>m.hired&&m.role==='medical_director')?1:0;
  const traitStaff=staff.filter(m=>m.hired&&(m.workTrait?.mentor||m.workTrait?.id==='learner'));
  const traitBonus=traitStaff.length&&Math.random()<Math.min(0.45,traitStaff.length*0.12)?1:0;
  const itRpBonus=Math.round(getTechBonus().itRpBonus);
  const workstationBonus=researchedTech.has('department_workstations')&&countOperationalRooms('it_department',shift)>0?1:0;
  return{base:1,itBonus,headBonus,directorBonus,traitBonus,itRpBonus,workstationBonus,
    total:1+itBonus+headBonus+directorBonus+traitBonus+itRpBonus+workstationBonus};
}

function grantDailyResearchPoints(shift){
  shift=shift||currentShift();
  const income=getDailyResearchPointIncome(shift);
  const grantBonus=typeof getGrantResearchDailyBonus==='function'?getGrantResearchDailyBonus():0;
  const _mapResMult=(typeof getMapBonus==='function'?(getMapBonus().researchMultiplier||1):1);
  researchPoints+=Math.max(0,Math.round((income.total+grantBonus)*_mapResMult));
  if(income.total>1){
    const sources=[
      income.itBonus?'IT Department +1':null,
      income.headBonus?'Dept. Head Office +1':null,
      income.directorBonus?'Medical Director +1':null,
      income.traitBonus?'Mentor/Learner bonus +1':null,
      income.itRpBonus?`Digital tech +${income.itRpBonus}`:null,
      income.workstationBonus?'Workstations +1':null,
      grantBonus?`Grant support +${grantBonus}`:null
    ].filter(Boolean);
    addLog(`Research: +${income.total+grantBonus} RP. ${sources.join(', ')}.`,'');
  }
  return{...income,grantBonus,total:income.total+grantBonus};
}

function startResearch(id){
  if(!hasBasicResearchAccess()){
    addLog('Build and staff a Research Department before starting research.','w');
    return;
  }
  const tech=getResearchDef(id);
  if(!tech)return;
  if(activeResearch){addLog('Research lab is already busy with another project.','w');return;}
  if(researchedTech.has(id)){addLog(`${tech.name} has already been completed.`,'w');return;}
  if(!tech.requires.every(req=>researchedTech.has(req))){addLog(`${tech.name} is not available yet — prerequisites not met.`,'w');return;}
  if(!isSandboxMode&&researchPoints<tech.cost){addLog(`Not enough RP to begin ${tech.name}. Need ${tech.cost}, have ${researchPoints}.`,'b');return;}
  if(!isSandboxMode)researchPoints-=tech.cost;
  activeResearch={id:tech.id,daysLeft:tech.days,totalDays:tech.days};
  addLog(`Research started: ${tech.name}. -${tech.cost} RP`,'');
  updateUI();
  renderResearch();
}

function completeResearch(id){
  const tech=getResearchDef(id);
  if(!tech)return;
  researchedTech.add(id);
  (tech.unlockTools||[]).forEach(tool=>unlockedTools.add(tool));
  (tech.unlockRoles||[]).forEach(role=>unlockedRoles.add(role));
  (tech.unlockFeatures||[]).forEach(feature=>unlockedFeatures.add(feature));
  syncTechTreeState();
  activeResearch=null;
  researchLog.push({
    day,id:tech.id,name:tech.name,branch:tech.branch,
    rewardText:tech.rewardText,
    unlocks:[
      ...(tech.unlockTools||[]).map(t=>`Tool: ${t}`),
      ...(tech.unlockRoles||[]).map(r=>`Role: ${r}`),
      ...(tech.unlockFeatures||[]).map(f=>`Feature: ${f}`)
    ]
  });
  // Check research milestones
  RESEARCH_MILESTONES.forEach(ms=>{
    if(researchedTech.size>=ms.at&&!researchMilestonesFired.has(ms.at)){
      researchMilestonesFired.add(ms.at);
      if(ms.reward==='rp')researchPoints+=ms.amount;
      else if(ms.reward==='money')money+=ms.amount;
      else if(ms.reward==='rep')reputation=Math.min(100,reputation+ms.amount);
      const rewardStr=ms.reward==='rp'?`+${ms.amount} RP`:ms.reward==='money'?`+$${ms.amount.toLocaleString()}`:`+${ms.amount} Reputation`;
      addLog(`Research Milestone: ${ms.label}! ${rewardStr}.`,'g');
      setTimeout(()=>showToast(`${ms.icon} ${ms.label} — ${rewardStr}`,'good'),300);
    }
  });
  addLog(`Research complete: ${tech.name}. ${tech.rewardText}.`,'g');
  showToast(`Research complete: ${tech.name}!`,'good');
  if(window.animPolish)window.animPolish.polishResearchComplete(tech.name);
  if(window.playSound)window.playSound('research_completed');
  // Check identity path unlocks (fires one-shot log line per path)
  if(typeof evaluateIdentityUnlocks==='function')evaluateIdentityUnlocks();
  updateUI();
}

function progressResearch(){
  if(!activeResearch)return;
  activeResearch.daysLeft=Math.max(0,activeResearch.daysLeft-(1+getItResearchBoost()+getResearchDepartmentBoost()+(typeof getGrantResearchSpeedBonus==='function'?getGrantResearchSpeedBonus():0)+(getTechBonus().researchSpeedBonus||0)));
  if(activeResearch.daysLeft<=0)completeResearch(activeResearch.id);
}

function canResearch(tech){
  return!activeResearch&&!researchedTech.has(tech.id)&&tech.requires.every(req=>researchedTech.has(req));
}

// ─── Main Research Panel Renderer ────────────────────────────────────────────
function renderResearch(){
  const wrap=document.getElementById('researchpanel');
  if(!wrap)return;
  if(!hasBasicResearchAccess()){
    wrap.innerHTML=`<div class="research-locked-msg"><div class="research-locked-icon">🔬</div><div class="research-title">Research Lab Locked</div><div class="research-desc">Build and staff a Research Department to open your first research program.</div><div class="research-meta">Current stage: ${getCurrentStageName()}</div></div>`;
    return;
  }

  // Active research bar
  let html='';
  if(activeResearch){
    const tech=getResearchDef(activeResearch.id);
    const pct=Math.round(((activeResearch.totalDays-activeResearch.daysLeft)/activeResearch.totalDays)*100);
    const bm=BRANCH_META[tech?.branch]||{color:'#64b5f6',icon:'⚗️',label:'Research'};
    html+=`<div class="research-active-bar">
      <div class="research-active-left">
        <span class="research-active-tag">In Progress</span>
        <span class="research-active-name">${tech?.name||'Research Project'}</span>
        <span class="research-active-branch" style="color:${bm.color}">${bm.icon} ${bm.label}</span>
      </div>
      <div class="research-active-right">
        <div class="research-prog-wrap"><div class="research-prog-fill" style="width:${pct}%"></div></div>
        <span class="research-active-days">${activeResearch.totalDays-activeResearch.daysLeft} / ${activeResearch.totalDays} days · ${pct}%</span>
        <span class="research-active-boost">Speed boost: +${(getItResearchBoost()+getResearchDepartmentBoost()).toFixed(1)} days/day</span>
      </div>
    </div>`;
  }

  // RP summary bar
  const rpIncome=(typeof getDailyResearchPointIncome==='function'?getDailyResearchPointIncome():{total:1});
  html+=`<div class="research-rp-bar">
    <span class="research-rp-icon">⚗️</span>
    <span class="research-rp-val">${researchPoints}</span>
    <span class="research-rp-label">Research Points</span>
    <span class="research-rp-hint">+${rpIncome.total} RP/day</span>
    <span class="research-rp-done">${researchedTech.size} / ${RESEARCH_TREE.length} researched</span>
  </div>`;

  // Identity progress strip (full — shows bonus/drawback summary)
  html+=renderIdentityProgressStrip({compact:false});

  // Branch filter tabs
  const branches=['all',...Object.keys(BRANCH_META)];
  html+=`<div class="research-branch-tabs">${branches.map(b=>{
    const meta=BRANCH_META[b];
    const label=b==='all'?'🧬 All':`${meta.icon} ${meta.label}`;
    const branchNodes=b==='all'?RESEARCH_TREE:RESEARCH_TREE.filter(n=>n.branch===b);
    const doneCnt=branchNodes.filter(n=>researchedTech.has(n.id)).length;
    const badge=doneCnt>0?`<span class="rbt-count">${doneCnt}/${branchNodes.length}</span>`:'';
    return`<button class="research-branch-tab${researchBranchFilter===b?' active':''} tab-${b}" onclick="setResearchBranch('${b}')">${label}${badge}</button>`;
  }).join('')}<button class="research-branch-tab research-log-tab${researchBranchFilter==='log'?' active':''}" onclick="setResearchBranch('log')">📋 Log${researchLog.length?`<span class="rbt-count">${researchLog.length}</span>`:''}</button><button class="research-branch-tab research-bonus-tab${researchBranchFilter==='bonuses'?' active':''}" onclick="setResearchBranch('bonuses')">⚡ Bonuses${researchedTech.size>0?`<span class="rbt-count">${researchedTech.size}</span>`:''}</button><button class="research-branch-tab research-identity-tab${researchBranchFilter==='identity'?' active':''}" onclick="setResearchBranch('identity')">🏛️ Identity${getActiveIdentityPaths().length>0?`<span class="rbt-count">${getActiveIdentityPaths().length}</span>`:''}</button></div>`;

  // Identity paths view
  if(researchBranchFilter==='identity'){
    wrap.innerHTML=html+renderIdentityPaths();
    return;
  }

  // Bonus summary view
  if(researchBranchFilter==='bonuses'){
    wrap.innerHTML=html+renderBonusSummary();
    return;
  }

  // Log view
  if(researchBranchFilter==='log'){
    let logHtml='';
    if(!researchLog.length){
      logHtml=`<div class="research-log-empty"><span class="research-log-empty-icon">📋</span><div>No research completed yet.</div><div class="research-log-empty-sub">Complete a research project to see it recorded here.</div></div>`;
    } else {
      const sorted=[...researchLog].reverse();
      logHtml=`<div class="research-log-list">`;
      sorted.forEach((entry,idx)=>{
        const bm=BRANCH_META[entry.branch]||{label:entry.branch,color:'#aaa',icon:'•'};
        const unlockLine=entry.unlocks&&entry.unlocks.length
          ?`<div class="rl-unlocks">${entry.unlocks.map(u=>`<span class="rl-unlock-chip">${u}</span>`).join('')}</div>`:'';
        logHtml+=`<div class="research-log-entry${idx===0?' rl-latest':''}">
          <div class="rl-day-col">
            <span class="rl-day">Day ${entry.day}</span>
          </div>
          <div class="rl-body">
            <div class="rl-top">
              <span class="rl-name">${entry.name}</span>
              <span class="rl-branch-chip" style="background:${bm.color}18;color:${bm.color};border-color:${bm.color}38">${bm.icon} ${bm.label}</span>
            </div>
            <div class="rl-reward">✓ ${entry.rewardText}</div>
            ${unlockLine}
          </div>
        </div>`;
      });
      logHtml+='</div>';
    }
    wrap.innerHTML=html+logHtml;
    return;
  }

  // Nodes by tier
  const filtered=researchBranchFilter==='all'?RESEARCH_TREE:RESEARCH_TREE.filter(n=>n.branch===researchBranchFilter);
  let nodesHtml='';
  [1,2,3].forEach(tier=>{
    const nodes=filtered.filter(n=>(n.tier||1)===tier);
    if(!nodes.length)return;
    nodesHtml+=`<div class="research-tier-group">
      <div class="research-tier-label"><span class="research-tier-badge">Tier ${tier}</span><span class="research-tier-sublabel">${tier===1?'Foundation':tier===2?'Advanced':'Mastery'}</span></div>
      <div class="research-nodes-row">`;
    nodes.forEach(tech=>{
      const done=researchedTech.has(tech.id);
      const isActive=activeResearch?.id===tech.id;
      const prereqsMet=tech.requires.every(req=>researchedTech.has(req));
      const canStart=!done&&!isActive&&prereqsMet&&!activeResearch;
      const bm=BRANCH_META[tech.branch]||{label:tech.branch,color:'#aaa',icon:'•'};
      const prereqNames=tech.requires.map(req=>getResearchDef(req)?.name||req).join(', ');
      const pct=isActive?Math.round(((activeResearch.totalDays-activeResearch.daysLeft)/activeResearch.totalDays)*100):0;
      const stateClass=done?'rn-done-card':isActive?'rn-active-card':canStart?'rn-avail-card':'rn-locked-card';
      const statusBadge=done
        ?`<span class="rn-badge rn-badge-done">✓ Done</span>`
        :isActive?`<span class="rn-badge rn-badge-active">● Active</span>`
        :canStart?`<span class="rn-badge rn-badge-avail">Available</span>`
        :`<span class="rn-badge rn-badge-locked">Locked</span>`;
      const branchChip=`<span class="rn-branch-chip" style="background:${bm.color}18;color:${bm.color};border-color:${bm.color}38">${bm.icon} ${bm.label}</span>`;
      const ipath=tech.identityPath?IDENTITY_PATHS.find(p=>p.id===tech.identityPath):null;
      let identityChip='';
      if(ipath){
        const shortName=ipath.name.replace(/^Traditional /,'').replace(/ Hospital$/,'');
        if(ipath.placeholder){
          identityChip=`<span class="rn-identity-chip rn-identity-placeholder" title="${ipath.name} — Coming Soon">${ipath.icon} ${shortName} · Soon</span>`;
        }else{
          identityChip=`<span class="rn-identity-chip" style="background:${ipath.color}1f;color:${ipath.color};border-color:${ipath.color}66" title="Counts toward ${ipath.name} identity (${ipath.threshold} nodes to unlock)">${ipath.icon} ${shortName}</span>`;
        }
      }
      const cantAfford=!isSandboxMode&&researchPoints<tech.cost;
      nodesHtml+=`<div class="research-node-card ${stateClass} research-node-${tech.branch}" data-tt-research="${tech.id}" tabindex="0">
        <div class="rn-top">${branchChip}${identityChip}<div class="rn-top-right"><span class="rn-tier-dot">T${tier}</span>${statusBadge}</div></div>
        <div class="rn-name">${tech.name}</div>
        <div class="rn-desc">${tech.desc}</div>
        <div class="rn-meta"><strong>${tech.cost} RP</strong> · <strong>${tech.days}</strong> day${tech.days===1?'':'s'}</div>
        ${tech.requires.length&&!done?`<div class="rn-prereq">Requires: ${prereqNames}</div>`:''}
        <div class="rn-reward">${tech.rewardText}</div>
        ${canStart?`<button class="rn-start-btn" onclick="startResearch('${tech.id}')" ${cantAfford?`disabled title="Need ${tech.cost} RP, have ${researchPoints}"`:''}>${cantAfford?`Need ${tech.cost} RP`:'▶ Start Research'}</button>`:''}
        ${isActive?`<div class="rn-prog-wrap"><div class="rn-prog-fill" style="width:${pct}%;background:${bm.color}"></div></div>`:''}
      </div>`;
    });
    nodesHtml+='</div></div>';
  });

  if(!filtered.length)nodesHtml=`<div class="research-card"><div class="research-title">No research in this branch yet.</div></div>`;
  wrap.innerHTML=html+nodesHtml;
}

// ─── Milestone Tracker ───────────────────────────────────────────────────────
function renderMilestoneTracker(){
  const done=researchedTech.size;
  const total=RESEARCH_TREE.length;
  const pct=Math.round(done/total*100);
  const earned=RESEARCH_MILESTONES.filter(ms=>researchMilestonesFired.has(ms.at)).length;
  const nextMs=RESEARCH_MILESTONES.find(ms=>!researchMilestonesFired.has(ms.at));
  const nextHint=nextMs?`Next milestone at ${nextMs.at} projects — ${nextMs.label}`:'All milestones earned!';
  let html=`<div class="rms-wrap">
    <div class="rms-header">
      <span class="rms-title">Milestones</span>
      <span class="rms-earned">${earned} / ${RESEARCH_MILESTONES.length} earned</span>
    </div>
    <div class="rms-bar-wrap">
      <div class="rms-bar">
        <div class="rms-bar-fill" style="width:${pct}%"></div>`;
  RESEARCH_MILESTONES.forEach(ms=>{
    const pipPct=Math.round(ms.at/total*100);
    const isEarned=researchMilestonesFired.has(ms.at);
    html+=`<div class="rms-pip${isEarned?' rms-pip-earned':''}" style="left:calc(${pipPct}% - 6px)" title="${ms.label} (${ms.at} projects)"><span class="rms-pip-icon">${isEarned?'✓':ms.icon}</span></div>`;
  });
  html+=`</div>
      <div class="rms-bar-labels"><span>0</span><span>${total}</span></div>
    </div>
    <div class="rms-next">${nextHint}</div>
    <div class="rms-cards">`;
  RESEARCH_MILESTONES.forEach(ms=>{
    const isEarned=researchMilestonesFired.has(ms.at);
    const isNext=!isEarned&&ms===nextMs;
    const rewardStr=ms.reward==='rp'?`+${ms.amount} RP`:ms.reward==='money'?`+$${ms.amount.toLocaleString()}`:`+${ms.amount} Rep`;
    html+=`<div class="rms-card${isEarned?' rms-card-earned':isNext?' rms-card-next':''}">
      <div class="rms-card-icon">${ms.icon}</div>
      <div class="rms-card-at">${ms.at} projects</div>
      <div class="rms-card-label">${ms.label}</div>
      <div class="rms-card-reward">${rewardStr}</div>
      <div class="rms-card-desc">${ms.desc}</div>
      ${isEarned?'<div class="rms-card-check">✓ Earned</div>':''}
    </div>`;
  });
  html+=`</div></div>`;
  return html;
}

// ─── Identity Paths Strip (compact, derived from registry) ──────────────────
function renderIdentityProgressStrip(opts){
  opts=opts||{};
  const compact=opts.compact!==false;
  const items=IDENTITY_PATHS.map(path=>{
    const{count,threshold,unlocked,total}=getIdentityProgress(path.id);
    const placeholder=!!path.placeholder;
    const pct=Math.min(100,Math.round(count/Math.max(threshold,1)*100));
    let status;
    if(placeholder)status='<span class="rips-status rips-soon">Coming Soon</span>';
    else if(unlocked)status='<span class="rips-status rips-active">★ Active</span>';
    else status=`<span class="rips-status">${count}/${threshold} toward bonus</span>`;
    const summary=placeholder
      ?'Private Specialty path placeholder'
      :unlocked?path.bonusDesc+(path.risks?' · ⚠ '+path.risks:'')
      :path.bonusDesc;
    return`<div class="rips-card${unlocked?' rips-active-card':''}${placeholder?' rips-placeholder':''}" style="--rips-color:${path.color}">
      <div class="rips-head">
        <span class="rips-icon">${path.icon}</span>
        <span class="rips-name">${path.name} Path</span>
        ${status}
      </div>
      <div class="rips-bar"><div class="rips-fill" style="width:${pct}%;background:${path.color}"></div></div>
      <div class="rips-prog">${count} / ${threshold} nodes${total>threshold?` (${total} taggable)`:''}</div>
      ${compact?'':`<div class="rips-summary">${summary}</div>`}
    </div>`;
  }).join('');
  return`<div class="rips-wrap">
    <div class="rips-title">Hospital Identity Paths</div>
    <div class="rips-grid">${items}</div>
  </div>`;
}

// ─── Identity Paths Panel ────────────────────────────────────────────────────
function renderIdentityPaths(){
  const activePaths=getActiveIdentityPaths();
  let html=`<div class="rip-header">
    <span class="rip-active-count">${activePaths.length>0?activePaths.length+' identity bonus'+(activePaths.length>1?'es':'')+' active':'No identity bonus active yet'}</span>
    <span class="rip-sub">Research ${IDENTITY_PATHS[0].threshold}+ nodes from a path to unlock its identity bonus. Paths can be combined.</span>
  </div><div class="rip-grid">`;

  IDENTITY_PATHS.forEach(path=>{
    const nodes=getIdentityPathNodes(path.id);
    const nodeDone=nodes.filter(id=>researchedTech.has(id)).length;
    const total=nodes.length;
    const isActive=!path.placeholder&&isIdentityUnlocked(path.id);
    const remaining=Math.max(0,path.threshold-nodeDone);
    const pct=Math.round(nodeDone/Math.max(total,1)*100);
    let statusText,statusColor;
    if(path.placeholder){statusText='Coming Soon';statusColor='#94a3b8';}
    else if(isActive){statusText='★ Identity Bonus Active';statusColor=path.color;}
    else if(remaining===1){statusText='1 more node for identity bonus';statusColor='#f59e0b';}
    else{statusText=`${remaining} more node${remaining===1?'':'s'} for identity bonus`;statusColor='#64748b';}

    html+=`<div class="rip-card${isActive?' rip-card-active':path.placeholder?' rip-card-placeholder':''}">
      <div class="rip-card-header">
        <span class="rip-card-icon">${path.icon}</span>
        <div class="rip-card-title-wrap">
          <div class="rip-card-name">${path.name}</div>
          <div class="rip-card-theme">${path.theme}</div>
        </div>
        ${isActive?'<span class="rip-active-badge">★ Active</span>':''}
      </div>
      <div class="rip-progress-wrap">
        <div class="rip-progress-bar"><div class="rip-progress-fill" style="width:${pct}%;background:${path.color}"></div></div>
        <span class="rip-progress-text" style="color:${path.color}">${nodeDone}/${total}</span>
      </div>
      <div class="rip-status" style="color:${statusColor}">${statusText}</div>
      <div class="rip-node-list">`;
    nodes.forEach(nodeId=>{
      const researched=researchedTech.has(nodeId);
      const def=getResearchDef(nodeId);
      const label=def?def.name:nodeId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      html+=`<div class="rip-node${researched?' rip-node-done':''}">
        <span class="rip-node-check">${researched?'✓':'○'}</span>
        <span class="rip-node-name">${label}</span>
      </div>`;
    });
    html+=`</div>`;
    if(path.placeholder){
      html+=`<div class="rip-coming-soon">This path will be expanded in a future update.</div>`;
    } else {
      html+=`<div class="rip-bonus-desc" style="border-color:${path.color}40;background:${path.color}0d">
        <span class="rip-bonus-label">Identity Effect:</span>${path.bonusDesc}
        ${path.risks?`<div class="rip-risk-tag">⚠ ${path.risks}</div>`:''}
      </div>`;
    }
    html+=`</div>`;
  });
  html+=`</div>`;
  return html;
}

// ─── Active Bonus Breakdown ───────────────────────────────────────────────────
function renderBonusSummary(){
  if(!researchedTech.size){
    return`<div class="research-log-empty"><span class="research-log-empty-icon">⚡</span><div>No active bonuses yet.</div><div class="research-log-empty-sub">Complete research projects to unlock hospital-wide bonuses.</div></div>${renderMilestoneTracker()}`;
  }
  const b=getTechBonus();
  const sections=[];

  // Clinical & Speed
  const speed=[];
  if(b.erSpeed>1)speed.push({label:'ER treatment speed',value:`+${Math.round((b.erSpeed-1)*100)}%`,src:'Basic Triage'});
  if(b.gpSpeed>1)speed.push({label:'GP treatment speed',value:`+${Math.round((b.gpSpeed-1)*100)}%`,src:'Basic Triage / Rapid Assessment'});
  if(b.basicPatientSpeed>1)speed.push({label:'Basic patient speed',value:`+${Math.round((b.basicPatientSpeed-1)*100)}%`,src:'Fast Track Care'});
  if(b.wardSpeed>1)speed.push({label:'Ward treatment speed',value:`+${Math.round((b.wardSpeed-1)*100)}%`,src:'ICU Protocols'});
  if(b.diagnosticSpeed>1)speed.push({label:'Diagnostic & lab speed',value:`+${Math.round((b.diagnosticSpeed-1)*100)}%`,src:'Lab / Automated / CDS'});
  if(b.dischargeSpeed>1)speed.push({label:'Patient discharge speed',value:`+${Math.round((b.dischargeSpeed-1)*100)}%`,src:'Discharge Planning'});
  if(b.speed>1)speed.push({label:'All-department speed',value:`+${Math.round((b.speed-1)*100)}%`,src:'Hospital Wi-Fi'});
  if(b.basicWaitBonus>0)speed.push({label:'Patient wait tolerance',value:`+${b.basicWaitBonus} ticks`,src:'Fast Track / Triage Protocols'});
  if(speed.length)sections.push({title:'🏥 Treatment & Speed',color:'#e57373',items:speed});

  // Staff
  const staff=[];
  if(b.energyDrainMult<1)staff.push({label:'Energy drain rate',value:`−${Math.round((1-b.energyDrainMult)*100)}%`,src:'Staff Scheduling / Fatigue Mgmt'});
  if(b.breakEnergyBonus>0)staff.push({label:'Break energy recovery',value:`+${b.breakEnergyBonus}`,src:'Break Optimization / Burnout Prev.'});
  if(b.breakMoraleBonus>0)staff.push({label:'Break morale recovery',value:`+${b.breakMoraleBonus}`,src:'Break Optimization / Burnout Prev.'});
  if(staff.length)sections.push({title:'💪 Staff Wellbeing',color:'#66bb6a',items:staff});

  // Administration
  const admin=[];
  if(b.governmentPenaltyMult<1)admin.push({label:'Audit penalty reduction',value:`−${Math.round((1-b.governmentPenaltyMult)*100)}%`,src:'Govt. Compliance / Audit Shield'});
  if(b.contractRewardMult>1)admin.push({label:'Contract reward bonus',value:`+${Math.round((b.contractRewardMult-1)*100)}%`,src:'Contract Negotiation'});
  if(b.insuranceStressRelief>0)admin.push({label:'Insurance stress relief',value:`+${b.insuranceStressRelief}/month`,src:'Contract Neg. / Insurance Opt.'});
  if(b.grantApprovalBonus>0)admin.push({label:'Grant approval chance',value:`+${Math.round(b.grantApprovalBonus*100)}%`,src:'Grant Research Program'});
  if(admin.length)sections.push({title:'📋 Administration',color:'#64b5f6',items:admin});

  // Digital Infrastructure
  const digital=[];
  if(b.itRpBonus>0)digital.push({label:'Bonus RP/day (digital tech)',value:`+${b.itRpBonus}`,src:'Filing / EHR / Workstations / Server'});
  if(b.researchSpeedBonus>0)digital.push({label:'Research speed bonus',value:`+${b.researchSpeedBonus} days/tick`,src:'Server Room Upgrade'});
  const digWaitContrib=[];
  if(researchedTech.has('digital_filing'))digWaitContrib.push('Filing');
  if(researchedTech.has('hospital_wifi'))digWaitContrib.push('Wi-Fi');
  if(researchedTech.has('automated_patient_flow'))digWaitContrib.push('Auto Flow');
  if(researchedTech.has('predictive_operations_ai'))digWaitContrib.push('Pred. AI');
  if(digWaitContrib.length)digital.push({label:'Wait pressure reduction (digital)',value:`+${[1,2,4,2].filter((_,i)=>[researchedTech.has('digital_filing'),researchedTech.has('hospital_wifi'),researchedTech.has('automated_patient_flow'),researchedTech.has('predictive_operations_ai')][i]).reduce((a,v)=>a+v,0)}`,src:digWaitContrib.join(', ')});
  if(b.governmentPenaltyMult<1&&researchedTech.has('digital_backup_system'))digital.push({label:'Backup audit protection',value:'−15%',src:'Digital Backup System'});
  if(researchedTech.has('staff_tablets'))digital.push({label:'Discharge speed (tablets)',value:'+10%',src:'Staff Tablets'});
  if(researchedTech.has('automated_patient_flow'))digital.push({label:'ER throughput',value:'+10%',src:'Automated Patient Flow'});
  if(researchedTech.has('predictive_operations_ai'))digital.push({label:'Passive stress reduction',value:'−3/tick',src:'Predictive Operations AI'});
  if(digital.length)sections.push({title:'💻 Digital Infrastructure',color:'#ab6ff0',items:digital});

  if(!sections.length){
    return`<div class="research-log-empty"><span class="research-log-empty-icon">⚡</span><div>No bonus-granting research completed yet.</div><div class="research-log-empty-sub">Start from the All tab to unlock your first bonus.</div></div>`;
  }

  const totalBonuses=sections.reduce((n,s)=>n+s.items.length,0);
  let html=`<div class="rbs-header"><span class="rbs-total">${totalBonuses} active bonus${totalBonuses===1?'':'es'}</span><span class="rbs-sub">from ${researchedTech.size} completed project${researchedTech.size===1?'':'s'}</span></div><div class="rbs-wrap">`;
  sections.forEach(s=>{
    html+=`<div class="rbs-section">
      <div class="rbs-section-title" style="border-left-color:${s.color}">${s.title}</div>
      <div class="rbs-items">`;
    s.items.forEach(item=>{
      html+=`<div class="rbs-item">
        <div class="rbs-item-left">
          <span class="rbs-item-label">${item.label}</span>
          <span class="rbs-item-src">${item.src}</span>
        </div>
        <span class="rbs-item-val">${item.value}</span>
      </div>`;
    });
    html+='</div></div>';
  });
  html+=`</div>${renderMilestoneTracker()}`;
  return html;
}

function renderTechTreePanel(){
  const wrap=document.getElementById('techtreepanel');
  if(!wrap)return;
  const branches=Object.entries(BRANCH_META);
  wrap.innerHTML=`<div class="tech-tree-card">
    <div class="tech-tree-head">Research Overview</div>
    <div class="research-branch-overview">
      ${branches.map(([key,meta])=>{
        const branchNodes=RESEARCH_TREE.filter(n=>n.branch===key);
        const done=branchNodes.filter(n=>researchedTech.has(n.id)).length;
        const total=branchNodes.length;
        const pct=total?Math.round((done/total)*100):0;
        return`<div class="rbo-row">
          <span class="rbo-icon">${meta.icon}</span>
          <div class="rbo-info">
            <div class="rbo-label">${meta.label}</div>
            <div class="rbo-bar"><div class="rbo-fill" style="width:${pct}%;background:${meta.color}"></div></div>
          </div>
          <span class="rbo-count">${done}/${total}</span>
        </div>`;
      }).join('')}
    </div>
    ${renderIdentityProgressStrip({compact:false})}
    <button class="panel-btn" style="margin-top:10px" onclick="openResearchMenu()">Open Research Lab</button>
  </div>`;
}

function updateTechTreeUI(){renderTechTreePanel();}
