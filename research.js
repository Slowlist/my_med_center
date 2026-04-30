// Research stays data-driven here so the tech tree can expand without touching the main loop.
function syncTechTreeState(){
  if(!techTree||typeof techTree!=='object')techTree=makeTechTree();
  techTree.basicTriage={...(techTree.basicTriage||{}),unlocked:!!techTree.basicTriage?.unlocked};
  techTree.basicImaging={...(techTree.basicImaging||{}),unlocked:!!techTree.basicImaging?.unlocked};
  techTree.fastTrack={...(techTree.fastTrack||{}),unlocked:!!techTree.fastTrack?.unlocked||hasFeature('triage_protocols')};
  techTree.fasterLabProcessing={...(techTree.fasterLabProcessing||{}),unlocked:!!techTree.fasterLabProcessing?.unlocked};
  techTree.staffScheduling={...(techTree.staffScheduling||{}),unlocked:!!techTree.staffScheduling?.unlocked};
  techTree.breakOptimization={...(techTree.breakOptimization||{}),unlocked:!!techTree.breakOptimization?.unlocked};
  techTree.governmentCompliance={...(techTree.governmentCompliance||{}),unlocked:!!techTree.governmentCompliance?.unlocked};
  techTree.contractNegotiation={...(techTree.contractNegotiation||{}),unlocked:!!techTree.contractNegotiation?.unlocked};
}

const TECH_TREE_BRANCHES={
  clinical:[
    {key:'basicTriage',name:'Basic Triage',bonus:'ER and GP treatment speed +10%',requires:[]},
    {key:'fastTrack',name:'Fast Track Care',bonus:'Basic patients wait less and clear faster',requires:['basicTriage']}
  ],
  diagnostics:[
    {key:'basicImaging',name:'Basic Imaging',bonus:'X-Ray matters more in routing',requires:[]},
    {key:'fasterLabProcessing',name:'Faster Lab Processing',bonus:'Lab and X-Ray treatment time reduced',requires:['basicImaging']}
  ],
  operations:[
    {key:'staffScheduling',name:'Staff Scheduling',bonus:'Staff energy drains slower',requires:[]},
    {key:'breakOptimization',name:'Break Optimization',bonus:'Staff Room and Lunch Room recover more morale and energy',requires:['staffScheduling']}
  ],
  admin:[
    {key:'governmentCompliance',name:'Government Compliance Office',bonus:'Government penalties reduced',requires:[]},
    {key:'contractNegotiation',name:'Contract Negotiation',bonus:'Better contract rewards and less insurance pressure',requires:['governmentCompliance']}
  ]
};

function getTechNodeState(key,requires=[]){
  syncTechTreeState();
  if(techTree?.[key]?.unlocked)return'unlocked';
  const prereqsMet=requires.every(req=>techTree?.[req]?.unlocked);
  return prereqsMet?'available':'locked';
}

function canUnlock(tech){
  const node=Object.values(TECH_TREE_BRANCHES).flat().find(entry=>entry.key===tech);
  if(!node)return false;
  return getTechNodeState(tech,node.requires)==='available'&&researchPoints>=5;
}

function unlockTech(tech){
  syncTechTreeState();
  if(!techTree?.[tech])return;
  if(techTree[tech].unlocked){
    addLog(`${tech} is already unlocked.`,'w');
    return;
  }
  const node=Object.values(TECH_TREE_BRANCHES).flat().find(entry=>entry.key===tech);
  if(node&&getTechNodeState(tech,node.requires)==='locked'){
    addLog(`${node.name} is still locked.`,'w');
    return;
  }
  if(researchPoints<5){
    addLog(`Not enough RP to unlock ${tech}.`,'w');
    return;
  }
  techTree[tech].unlocked=true;
  researchPoints-=5;
  if(tech==='fastTrack')unlockedFeatures.add('triage_protocols');
  addLog(`Unlocked ${tech}`,'g');
  updateUI();
}

function updateTechTreeUI(){
  renderTechTreePanel();
}

function popTechNode(tech){
  const node=document.querySelector(`#techTree .node[data-tech="${tech}"]`);
  if(!node)return;
  node.classList.add('pop');
  setTimeout(()=>node.classList.remove('pop'),300);
}

function onNodeClick(tech){
  if(canUnlock(tech)){
    unlockTech(tech);
    updateTechTreeUI();
    popTechNode(tech);
  }
}

function getTechBonus(){
  syncTechTreeState();
  let bonus={
    speed:1,
    erSpeed:1,
    gpSpeed:1,
    basicPatientSpeed:1,
    diagnosticSpeed:1,
    basicWaitBonus:0,
    energyDrainMult:1,
    breakEnergyBonus:0,
    breakMoraleBonus:0,
    trainingXpMult:1,
    governmentPenaltyMult:1,
    contractRewardMult:1,
    insuranceStressRelief:0,
    stress:0
  };
  if(techTree.basicTriage?.unlocked){
    bonus.erSpeed+=0.1;
    bonus.gpSpeed+=0.1;
  }
  if(techTree.fastTrack?.unlocked){
    bonus.basicPatientSpeed+=0.15;
    bonus.basicWaitBonus+=4;
  }
  if(techTree.fasterLabProcessing?.unlocked)bonus.diagnosticSpeed+=0.15;
  if(techTree.staffScheduling?.unlocked)bonus.energyDrainMult*=0.88;
  if(techTree.breakOptimization?.unlocked){
    bonus.breakEnergyBonus+=2;
    bonus.breakMoraleBonus+=2;
  }
  if(techTree.governmentCompliance?.unlocked)bonus.governmentPenaltyMult*=0.5;
  if(techTree.contractNegotiation?.unlocked){
    bonus.contractRewardMult*=1.25;
    bonus.insuranceStressRelief+=1;
  }
  return bonus;
}

function renderTechTreePanel(){
  const wrap=document.getElementById('techtreepanel');
  if(!wrap)return;
  syncTechTreeState();
  wrap.innerHTML=`
    <div class="tech-tree-card">
      <div class="tech-tree-head">Tech Tree</div>
      <div id="techTree">
        ${Object.entries(TECH_TREE_BRANCHES).map(([branchKey,items])=>`
            <div class="branch ${branchKey}">
            <div class="branch-label">${branchKey}</div>
            ${items.map((item,index)=>{
              const state=getTechNodeState(item.key,item.requires);
              const clickable=state==='available'?' node-clickable':'';
              return `<div class="node ${state}${clickable}" data-tech="${item.key}" ${state==='available'?`role="button" tabindex="0" onclick="onNodeClick('${item.key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();onNodeClick('${item.key}');}"`:''}>
                <div class="node-title">${item.name}</div>
                <div class="node-copy">${item.bonus}</div>
                ${state==='available'?`<button class="tech-tree-unlock" type="button" onclick="event.stopPropagation();unlockTech('${item.key}')" ${researchPoints<5?'disabled':''}>Unlock (5 RP)</button>`:''}
              </div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
    </div>`;
}

function getDailyResearchPointIncome(shift=currentShift()){
  const itBonus=countOperationalRooms('it_department',shift)>0?1:0;
  const headBonus=countOperationalRooms('head_office',shift)>0?1:0;
  const directorBonus=staff.some(member=>member.hired&&member.role==='medical_director')?1:0;
  const traitStaff=staff.filter(member=>member.hired&&(member.workTrait?.mentor||member.workTrait?.id==='learner'));
  const traitBonus=traitStaff.length&&Math.random()<Math.min(0.45,traitStaff.length*0.12)?1:0;
  return{
    base:1,
    itBonus,
    headBonus,
    directorBonus,
    traitBonus,
    total:1+itBonus+headBonus+directorBonus+traitBonus
  };
}
function grantDailyResearchPoints(shift=currentShift()){
  const income=getDailyResearchPointIncome(shift);
  const grantBonus=typeof getGrantResearchDailyBonus==='function'?getGrantResearchDailyBonus():0;
  researchPoints+=income.total+grantBonus;
  if(income.total>1){
    const sources=[
      income.itBonus?'IT Department +1':null,
      income.headBonus?'Dept. Head Office +1':null,
      income.directorBonus?'Medical Director +1':null,
      income.traitBonus?'Mentor/Learner bonus +1':null,
      grantBonus?`Grant support +${grantBonus}`:null
    ].filter(Boolean);
    addLog(`Research generated: +${income.total+grantBonus} RP. ${sources.join(', ')}.`,'');
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
  if(!tech.requires.every(req=>researchedTech.has(req))){addLog(`${tech.name} is not available yet.`,'w');return;}
  if(!isSandboxMode&&researchPoints<tech.cost){addLog(`Not enough RP to begin ${tech.name}.`,'b');return;}
  if(!isSandboxMode)researchPoints-=tech.cost;
  activeResearch={id:tech.id,daysLeft:tech.days,totalDays:tech.days};
  addLog(`Research started: ${tech.name}. -${tech.cost} RP`,'');
  updateUI();
}
function completeResearch(id){
  const tech=getResearchDef(id);
  if(!tech)return;
  researchedTech.add(id);
  tech.unlockTools.forEach(tool=>unlockedTools.add(tool));
  (tech.unlockRoles||[]).forEach(role=>unlockedRoles.add(role));
  tech.unlockFeatures.forEach(feature=>unlockedFeatures.add(feature));
  syncTechTreeState();
  activeResearch=null;
  addLog(`Research complete: ${tech.name}. ${tech.rewardText}.`,'g');
  updateUI();
}
function progressResearch(){
  if(!activeResearch)return;
  activeResearch.daysLeft=Math.max(0,activeResearch.daysLeft-(1+getItResearchBoost()+getResearchDepartmentBoost()+(typeof getGrantResearchSpeedBonus==='function'?getGrantResearchSpeedBonus():0)));
  if(activeResearch.daysLeft<=0)completeResearch(activeResearch.id);
}
function renderResearch(){
  const wrap=document.getElementById('researchpanel');
  if(!wrap)return;
  if(!hasBasicResearchAccess()){
    wrap.innerHTML=`<div class="research-card"><div class="research-title">Research Locked</div><div class="research-desc">Build and staff a Research Department to open your first research program.</div><div class="research-meta">Current stage: ${getCurrentStageName()}</div></div>`;
    return;
  }
  let html='';
  if(activeResearch){
    const tech=getResearchDef(activeResearch.id);
    html+=`<div class="research-card active">
      <div class="research-title">${tech?.name||'Research Project'}</div>
      <div class="research-desc">${tech?.desc||''}</div>
      <div class="research-meta">Progress: ${activeResearch.totalDays-activeResearch.daysLeft}/${activeResearch.totalDays} days</div>
      <div class="research-meta">RP: ${researchPoints}</div>
      <div class="research-meta">Speed bonus: +${(getItResearchBoost()+getResearchDepartmentBoost()).toFixed(1)} days/day</div>
      <div class="research-reward">${tech?.rewardText||''}</div>
    </div>`;
  }
  const available=RESEARCH_TREE.filter(tech=>!researchedTech.has(tech.id)&&activeResearch?.id!==tech.id);
  if(!available.length&&!activeResearch){
    html=`<div class="research-card"><div class="research-title">Research Complete</div><div class="research-desc">All current research projects are finished.</div><div class="research-meta">RP: ${researchPoints}</div></div>`;
  }else{
    html+=available.map(tech=>{
      const ready=tech.requires.every(req=>researchedTech.has(req));
      const prereqText=tech.requires.length?`Requires: ${tech.requires.map(req=>getResearchDef(req)?.name||req).join(', ')}`:'No prerequisite';
      return`<div class="research-card">
        <div class="research-title">${tech.name}</div>
        <div class="research-desc">${tech.desc}</div>
        <div class="research-meta">Cost: ${tech.cost} points · Time: ${tech.days} days</div>
        <div class="research-meta">${prereqText}</div>
        <div class="research-reward">${tech.rewardText}</div>
        <button onclick="startResearch('${tech.id}')" ${!canResearch(tech)||(!isSandboxMode&&researchPoints<tech.cost)?'disabled':''}>${ready?'Start Research':'Locked'}</button>
      </div>`;
    }).join('');
  }
  wrap.innerHTML=html
    .replaceAll('Research points:', 'RP:')
    .replace(/Cost: (\d+) points/g,'Cost: $1 RP');
}
