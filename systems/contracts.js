// systems/contracts.js — Contracts, Insurance & Government Obligations

let currentContractTab='active';

function setContractTab(tab){
  currentContractTab=tab;
  renderContracts();
}

function makeContractOffer(){
  const pool=CONTRACT_LIBRARY.filter(c=>c.id!==lastContractId);
  const pick=(pool.length?pool:CONTRACT_LIBRARY)[Math.floor(Math.random()*(pool.length?pool.length:CONTRACT_LIBRARY.length))];
  lastContractId=pick.id;
  contractOffer={id:pick.id,title:pick.title,desc:pick.desc,rewardText:pick.rewardText,...pick.create()};
}
function makeInsuranceOffer(){return null;}

function acceptContract(){
  if(activeContract||!contractOffer)return;
  activeContract={...contractOffer};
  contractOffer=null;
  addLog(`Accepted contract: ${activeContract.title}.`,'');
  updateUI();
}

function addInsuranceContract(plan){
  if(!plan)return;
  insuranceContracts.push(plan);
  addLog(`Signed ${plan.name} insurance contract.`,'g');
  showToast(`${plan.icon||'\u{1F4CB}'} ${plan.name} signed`,'good');
  updateUI();
}

function acceptInsuranceContract(id){
  const option=insuranceOptions.find(item=>item.id===id);
  if(!option)return;
  if(insuranceContracts.some(c=>c.id===id)){
    showToast('Already active','warn');return;
  }
  const currentPrivate=insuranceContracts.filter(c=>c.category==='private').length;
  if(option.category==='private'&&currentPrivate>=1){
    addLog('Warning: multiple private contracts will significantly increase government compliance pressure.','w');
  }
  addInsuranceContract({...option,daysLeft:option.durationDays});
  renderContracts();
}

function progressInsuranceContractDay(){
  if(!insuranceContracts.length)return;
  insuranceContracts=insuranceContracts.filter(contract=>{
    contract.daysLeft=Math.max(0,(contract.daysLeft??contract.durationDays)-1);
    if(contract.daysLeft<=0){
      addLog(`${contract.name} expired. Insurance referrals have ended.`,'w');
      return false;
    }
    return true;
  });
  updateUI();
}

function completeActiveContract(){
  if(!activeContract)return;
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{contractRewardMult:1};
  if(activeContract.reward.kind==='money'){
    const reward=Math.round(activeContract.reward.amount*(techBonus.contractRewardMult||1));
    changeMoney(reward);
    addLog(`${activeContract.title} completed. Donor bonus: +$${reward.toLocaleString()}.`,'g');
  }else if(activeContract.reward.kind==='free_room'){
    freeBuildCredits[activeContract.reward.roomType]=(freeBuildCredits[activeContract.reward.roomType]||0)+activeContract.reward.amount;
    addLog(`${activeContract.title} completed. Donated reward: ${RDEFS[activeContract.reward.roomType].name} room credit.`,'g');
  }
  activeContract=null;
  makeContractOffer();
  updateUI();
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

function _renderGovBlock(){
  const boost=typeof getInsuranceBoost==='function'?getInsuranceBoost():{income:0,patients:0,govCompliancePressure:0,reputationGain:0};
  const lb=typeof getLeadershipBonus==='function'?getLeadershipBonus():{govCompliancePressure:0,govRequirementBonus:0};
  const govPressure=(boost.govCompliancePressure||0)+(lb.govCompliancePressure||0);
  const govReqBonus=lb.govRequirementBonus||0;
  const baseReq=(typeof govRequired!=='undefined'?govRequired:0.35);
  const effectiveRequired=Math.min(0.9,baseReq+Math.max(0,govPressure)+govReqBonus);
  const rate=typeof getPublicCareRate==='function'?getPublicCareRate():0;
  const daysLeft=typeof getDaysUntilGovernmentReview==='function'?getDaysUntilGovernmentReview():30;
  const pct=Math.round(rate*100);
  const reqPct=Math.round(effectiveRequired*100);
  const barFill=Math.min(100,effectiveRequired>0?Math.round((rate/effectiveRequired)*100):0);
  const hasPatients=(typeof totalPatients!=='undefined'&&totalPatients>0);
  const isCompliant=rate>=effectiveRequired;
  const isAtRisk=!isCompliant&&rate>=(effectiveRequired-0.08);
  const statusLabel=!hasPatients?'Monitoring':isCompliant?'Compliant':isAtRisk?'At Risk':'Non-Compliant';
  const statusCls=!hasPatients?'ic-gov-status--idle':isCompliant?'ic-gov-status--ok':isAtRisk?'ic-gov-status--warn':'ic-gov-status--danger';
  const pressureNote=govPressure>0.04
    ?`<div class="ic-gov-pressure-warn">\u26a0 Active contracts raise your effective target by +${Math.round(govPressure*100)}pp — compliance is harder to maintain.</div>`:'';
  const repGain=boost.reputationGain||0;
  const repNote=repGain!==0
    ?`<div class="ic-gov-repnote ${repGain>0?'ic-gov-repnote--pos':'ic-gov-repnote--neg'}">${repGain>0?'\u25b2':'\u25bc'} Insurance contracts give ${repGain>0?'+':''}${repGain.toFixed(1)} reputation per monthly review</div>`:'';
  const statusDescription=!hasPatients
    ?'Asherville officials are watching for your first public care intake.'
    :isCompliant
      ?'Asherville officials are satisfied with your public care levels.'
      :isAtRisk
        ?'Public care levels are slipping. Future funding may be reviewed.'
        :'The city is preparing penalties, audits, or restrictions.';
  return`<div class="ic-gov-block">
    <div class="ic-gov-header">
      <span class="ic-gov-title">\ud83c\udfd7\ufe0f Asherville Public Care Agreement</span>
      <span class="ic-gov-badge">Required \u00b7 Reviewed Monthly</span>
    </div>
    <div class="ic-gov-desc">The city provided this land under a public care agreement. Treat enough low-profit and no-profit patients to keep the agreement in good standing.</div>
    <div class="ic-gov-meter-wrap">
      <div class="ic-gov-meter">
        <div class="ic-gov-meter-fill ${isCompliant?'ic-gm-ok':isAtRisk?'ic-gm-warn':'ic-gm-danger'}" style="width:${barFill}%"></div>
        <div class="ic-gov-meter-req" style="left:${Math.min(99,Math.round(100*(baseReq/effectiveRequired)))}%" title="Base required: ${Math.round(baseReq*100)}%"></div>
      </div>
      <div class="ic-gov-meter-labels">
        <span>${pct}% public this month</span>
        <span>Target: ${reqPct}%${govPressure>0.02?` (+${Math.round(govPressure*100)}pp from contracts)`:''}</span>
      </div>
    </div>
    <div class="ic-gov-stats-row">
      <div class="ic-gov-stat"><span class="ic-gov-stat-label">Status</span><span class="ic-gov-status ${statusCls}">${statusLabel}</span></div>
      <div class="ic-gov-stat"><span class="ic-gov-stat-label">Review in</span><span class="ic-gov-stat-val">${daysLeft} day${daysLeft===1?'':'s'}</span></div>
      <div class="ic-gov-stat"><span class="ic-gov-stat-label">Base quota</span><span class="ic-gov-stat-val">${Math.round(baseReq*100)}%</span></div>
    </div>
    <div class="ic-gov-statusdesc ic-gov-statusdesc--${statusCls.replace('ic-gov-status--','')}">${statusDescription}</div>
    ${pressureNote}${repNote}
  </div>`;
}

function _renderActiveTab(){
  const contracts=(typeof insuranceContracts!=='undefined'?insuranceContracts:[]);
  if(!contracts.length){
    return`<div class="ic-empty">No active insurance contracts.<br><span class="ic-empty-sub">Sign contracts in the Marketplace to increase patient volume and revenue.</span></div>`;
  }
  return contracts.map(c=>{
    const totalDays=c.durationDays||28;
    const pct=Math.round(((c.daysLeft||0)/totalDays)*100);
    const catCls=c.category==='public'?'ic-cat--public':'ic-cat--private';
    const reimb=c.reimbursementMult!=null?c.reimbursementMult:1;
    const reimbDiff=Math.round((reimb-1)*100);
    const reimbLabel=reimbDiff===0?'Standard':(reimbDiff>0?`+${reimbDiff}% per patient`:`${reimbDiff}% per patient`);
    const reimbCls=reimbDiff>=0?'ic-eff-pos':'ic-eff-neg';
    const compP=c.govCompliancePressure||0;
    const compLabel=compP<-0.02?'Easier (compliance \u2191)':(compP>0.02?'Harder (compliance \u2193)':'Neutral');
    const compCls=compP<0?'ic-eff-pos':compP>0?'ic-eff-neg':'';
    return`<div class="ic-active-card" data-tt-contract="${c.id}" tabindex="0">
      <div class="ic-active-header">
        <div class="ic-active-title">
          <span class="ic-active-icon">${c.icon||'\ud83d\udccb'}</span>
          <span class="ic-active-name">${c.name}</span>
          <span class="ic-cat-chip ${catCls}">${c.category==='public'?'Public':'Private'}</span>
        </div>
        <div class="ic-active-days">${c.daysLeft} day${c.daysLeft===1?'':'s'} left</div>
      </div>
      <div class="ic-active-bar-wrap">
        <div class="ic-active-bar" style="width:${pct}%;background:${c.color||'#64b5f6'}"></div>
      </div>
      <div class="ic-active-effects">
        <span class="ic-eff-chip ic-eff-pos">+${Math.round((c.patientBoost||0)*100)}% volume</span>
        <span class="ic-eff-chip ${reimbCls}">${reimbLabel}</span>
        <span class="ic-eff-chip ${compCls}">Compliance: ${compLabel}</span>
        ${(c.stress||0)>0?`<span class="ic-eff-chip ic-eff-neg">+${c.stress} pressure</span>`:''}
      </div>
    </div>`;
  }).join('');
}

// Forecast the impact of accepting an insurance offer so the player
// can weigh patient volume, revenue, waiting pressure, staffing,
// public-care compliance, overall risk, and minimum recommended
// rooms/staff before signing.
function forecastInsuranceOffer(option){
  const dayTicks=(typeof DAY_TICKS!=='undefined'?DAY_TICKS:14);
  const spawnTicks=(typeof PATIENT_SPAWN_TICKS!=='undefined'?PATIENT_SPAWN_TICKS:6);
  const attemptsPerDay=dayTicks/spawnTicks;
  const extraPatientsPerDay=Math.round((option.patientBoost||0)*attemptsPerDay*100)/10;
  // Rough average payout per patient (basic visit ~$120) scaled by reimbursement.
  const reimb=option.reimbursementMult!=null?option.reimbursementMult:1;
  const avgPayout=120*reimb;
  const incomeBoostFactor=1+(option.incomeBoost||0);
  const extraRevenuePerDay=Math.round(extraPatientsPerDay*avgPayout*incomeBoostFactor);

  // Capacity & staffing snapshot.
  const allRooms=(typeof rooms!=='undefined'?rooms:[]);
  const gpRooms=allRooms.filter(r=>r.type==='gp').length;
  const waitingRooms=allRooms.filter(r=>r.type==='waiting_room').length;
  const erRooms=allRooms.filter(r=>['er','trauma_bay'].includes(r.type)).length;
  const allStaff=(typeof staff!=='undefined'?staff.filter(s=>s.hired):[]);
  const docs=allStaff.filter(s=>['gp_doc','er_doc','er_attending','dept_attending','medical_director'].includes(s.role)).length;
  const nurses=allStaff.filter(s=>['nurse','charge_nurse','cna'].includes(s.role)).length;

  // Minimum recommended rooms/staff: ~1 GP per 6 extra patients/day,
  // 1 nurse per 4, 1 doc per 5.
  const recGp=Math.max(1,Math.ceil(extraPatientsPerDay/6));
  const recNurses=Math.max(1,Math.ceil(extraPatientsPerDay/4));
  const recDocs=Math.max(1,Math.ceil(extraPatientsPerDay/5));

  // Waiting pressure: combines current GP queue load with the extra demand.
  let queueLoad=0;
  if(typeof getRoomQueueSummary==='function'){
    const gpQ=allRooms.filter(r=>r.type==='gp').reduce((s,rm)=>s+(getRoomQueueSummary(rm).waiting||0),0);
    queueLoad=gpQ;
  }
  const capRatio=gpRooms?extraPatientsPerDay/(gpRooms*8):extraPatientsPerDay;
  let waitingPressure='Low';
  if(capRatio>=0.7||queueLoad>=8) waitingPressure='High';
  else if(capRatio>=0.35||queueLoad>=4) waitingPressure='Medium';

  // Public-care impact: combine offer's gov compliance pressure with the
  // existing private-share trajectory.
  const currentRate=typeof getPublicCareRate==='function'?getPublicCareRate():0;
  const compP=option.govCompliancePressure||0;
  let publicImpact;
  if(option.category==='public') publicImpact=`Helps compliance (${Math.round(compP*100)}pp easier)`;
  else if(compP>=0.08) publicImpact=`Heavy strain (+${Math.round(compP*100)}pp to quota)`;
  else if(compP>=0.04) publicImpact=`Notable strain (+${Math.round(compP*100)}pp to quota)`;
  else publicImpact='Slight strain on compliance';

  // Risk rating: weighted score from waiting, compliance, criticism, stress, capacity.
  let risk=0;
  if(waitingPressure==='High') risk+=3; else if(waitingPressure==='Medium') risk+=1;
  if(compP>=0.08) risk+=3; else if(compP>=0.04) risk+=1;
  if((option.publicCriticismRisk||0)>=0.25) risk+=2; else if((option.publicCriticismRisk||0)>0) risk+=1;
  if((option.stress||0)>=6) risk+=2; else if((option.stress||0)>=3) risk+=1;
  if(gpRooms<recGp) risk+=2;
  if(nurses<recNurses) risk+=1;
  if(docs<recDocs) risk+=1;
  const riskRating=risk>=6?'High':risk>=3?'Medium':'Low';

  // Targeted, actionable warnings the player can act on. Each follows
  // the unified warning shape: title, severity, cause, consequence,
  // fixes, action.
  const warnings=[];
  if(extraPatientsPerDay>=3&&gpRooms<recGp){
    warnings.push({
      id:'cf_gp_overload',
      title:'GP Capacity Overload Risk',
      severity:'high',
      cause:`Have ${gpRooms} GP / Need ${recGp} for the added ${extraPatientsPerDay}/day.`,
      consequence:'Waiting times will spike and patients may walk out.',
      fixes:['Build another GP Office','Hire another GP Doctor','Research Basic Triage'],
      action:{label:'Open Build',selector:'#dock-build'}
    });
  }
  if(option.category==='private'&&compP>=0.04){
    warnings.push({
      id:'cf_public_compliance',
      title:'Public Care At Risk',
      severity:compP>=0.08?'high':'med',
      cause:`Quota pressure rises by +${Math.round(compP*100)}pp under this contract.`,
      consequence:'Asherville may reduce funding if the public care ratio falls below target.',
      fixes:['Accept public care grants','Avoid private-heavy contracts','Improve intake for public patients'],
      action:{label:'Open Contracts',selector:'#dock-management'}
    });
  }
  if(nurses<recNurses){
    warnings.push({
      id:'cf_nurse_short',
      title:'Nurse Staffing Short',
      severity:'med',
      cause:`Have ${nurses} nurses / Need ${recNurses} for this volume.`,
      consequence:'Burnout and quit risk climb under the added load.',
      fixes:['Hire more nurses','Build a Staff Room','Stagger contract start with hiring'],
      action:{label:'Open People',selector:'#dock-people'}
    });
  }
  if(option.category==='public'&&extraPatientsPerDay>=5&&waitingRooms<2){
    warnings.push({
      id:'cf_waiting_room',
      title:'Add Waiting Room',
      severity:'med',
      cause:`Only ${waitingRooms} waiting room${waitingRooms===1?'':'s'} for ~${extraPatientsPerDay} extra/day.`,
      consequence:'Lobby overflow drives walkouts and reputation loss.',
      fixes:['Build another Waiting Room before signing'],
      action:{label:'Build Waiting Room',selector:'[data-tool="waiting_room"]'}
    });
  }
  if(option.id==='city_overflow'&&erRooms<2){
    warnings.push({
      id:'cf_er_bays',
      title:'Insufficient ER Bays',
      severity:'high',
      cause:`Have ${erRooms} ER / Need 2+ for City Overflow.`,
      consequence:'Patients will back up in the ER and emergency reputation drops.',
      fixes:['Build another ER bay before signing'],
      action:{label:'Build ER',selector:'[data-tool="er"]'}
    });
  }
  if(currentRate<(typeof govRequired!=='undefined'?govRequired:0.35)&&option.category==='private'){
    warnings.push({
      id:'cf_quota_gap',
      title:'Below Public Care Quota',
      severity:'high',
      cause:`Public ratio ${Math.round(currentRate*100)}% < ${Math.round((typeof govRequired!=='undefined'?govRequired:0.35)*100)}% required.`,
      consequence:'Adding another private contract will deepen the gap and trigger penalties.',
      fixes:['Drop a private contract first','Accept a public care grant'],
      action:{label:'Open Contracts',selector:'#dock-management'}
    });
  }

  return{
    extraPatientsPerDay,
    extraRevenuePerDay,
    waitingPressure,
    recGp,recNurses,recDocs,
    publicImpact,
    riskRating,
    warnings,
    haveGp:gpRooms,haveNurses:nurses,haveDocs:docs
  };
}

function _riskClass(r){return r==='High'?'cf-risk--high':r==='Medium'?'cf-risk--med':'cf-risk--low';}
function _waitClass(w){return w==='High'?'cf-wait--high':w==='Medium'?'cf-wait--med':'cf-wait--low';}

function _renderMarketTab(){
  const boost=typeof getInsuranceBoost==='function'?getInsuranceBoost():{govCompliancePressure:0,publicCriticismRisk:0};
  const contracts=(typeof insuranceContracts!=='undefined'?insuranceContracts:[]);
  const totalPrivate=contracts.filter(c=>c.category==='private').length;
  let warnings='';
  if(totalPrivate>=2){
    warnings+=`<div class="ic-stack-warn">\u26a0 You have ${totalPrivate} private contracts active. Government compliance is under significant pressure. Adding more will make quotas very hard to meet.</div>`;
  }
  if((boost.publicCriticismRisk||0)>=0.3){
    warnings+=`<div class="ic-stack-warn ic-stack-warn--critical">\u26a0 High private contract exposure. Public criticism events may begin to affect your hospital's reputation.</div>`;
  }
  const options=(typeof insuranceOptions!=='undefined'?insuranceOptions:[]);
  const available=options.filter(o=>!contracts.some(c=>c.id===o.id));
  if(!available.length){
    return`${warnings}<div class="ic-empty">All available insurance contracts are currently active.</div>`;
  }
  return warnings+available.map(o=>{
    const reimb=o.reimbursementMult!=null?o.reimbursementMult:1;
    const reimbDiff=Math.round((reimb-1)*100);
    const reimbLabel=reimbDiff===0?'Standard':(reimbDiff>0?`+${reimbDiff}%`:`${reimbDiff}%`);
    const reimbCls=reimbDiff>=0?'ic-stat-pos':'ic-stat-neg';
    const compP=o.govCompliancePressure||0;
    let compLabel,compCls;
    if(compP<-0.04){compLabel=`Significantly easier (\u2212${Math.round(-compP*100)}pp)`;compCls='ic-stat-pos';}
    else if(compP<0){compLabel=`Slightly easier`;compCls='ic-stat-pos';}
    else if(compP<0.04){compLabel='Neutral';compCls='';}
    else if(compP<0.08){compLabel=`Harder (+${Math.round(compP*100)}pp)`;compCls='ic-stat-neg';}
    else{compLabel=`Much harder (+${Math.round(compP*100)}pp)`;compCls='ic-stat-neg ic-stat-crit';}
    const repGain=o.reputationGain||0;
    const repLabel=repGain===0?'None':(repGain>0?`+${repGain} / review`:`${repGain} / review`);
    const repCls=repGain>0?'ic-stat-pos':repGain<0?'ic-stat-neg':'';
    const critRisk=o.publicCriticismRisk||0;
    const critLabel=critRisk===0?'None':critRisk>=0.25?'High':'Moderate';
    const critCls=critRisk>=0.25?'ic-stat-neg':critRisk>0?'ic-stat-warn':'';
    const catCls=o.category==='public'?'ic-cat--public':'ic-cat--private';
    const isPrivateWarn=o.category==='private'&&totalPrivate>=1;
    return`<div class="ic-offer-card${isPrivateWarn?' ic-offer-card--warn':''}" style="--ic-color:${o.color||'#64b5f6'}">
      <div class="ic-offer-header">
        <span class="ic-offer-icon">${o.icon||'\ud83d\udccb'}</span>
        <div class="ic-offer-title-block">
          <span class="ic-offer-name">${o.name}</span>
          <span class="ic-cat-chip ${catCls}">${o.category==='public'?'Public':'Private'}</span>
        </div>
        <span class="ic-offer-term">${o.durationDays}-day term</span>
      </div>
      <p class="ic-offer-desc">${o.desc||''}</p>
      <div class="ic-stats-grid">
        <div class="ic-stat-cell">
          <span class="ic-stat-lbl">Patient Volume</span>
          <span class="ic-stat-num ic-stat-pos">+${Math.round((o.patientBoost||0)*100)}%</span>
        </div>
        <div class="ic-stat-cell">
          <span class="ic-stat-lbl">Reimbursement</span>
          <span class="ic-stat-num ${reimbCls}">${reimbLabel} per patient</span>
        </div>
        <div class="ic-stat-cell">
          <span class="ic-stat-lbl">Hospital Pressure</span>
          <span class="ic-stat-num ${(o.stress||0)>4?'ic-stat-neg':''}">${(o.stress||0)===0?'None':'+'+o.stress+' stress'}</span>
        </div>
        <div class="ic-stat-cell">
          <span class="ic-stat-lbl">Gov. Compliance</span>
          <span class="ic-stat-num ${compCls}">${compLabel}</span>
        </div>
        <div class="ic-stat-cell">
          <span class="ic-stat-lbl">Reputation</span>
          <span class="ic-stat-num ${repCls}">${repLabel}</span>
        </div>
        <div class="ic-stat-cell">
          <span class="ic-stat-lbl">Public Criticism</span>
          <span class="ic-stat-num ${critCls}">${critLabel}</span>
        </div>
      </div>
      ${o.riskWarning?`<div class="ic-risk-warn">${o.riskWarning}</div>`:''}
      ${isPrivateWarn?`<div class="ic-stack-note">\u26a0 Adding another private contract will further strain compliance.</div>`:''}
      ${(()=>{const f=forecastInsuranceOffer(o);return`
      <div class="cf-forecast">
        <div class="cf-forecast-head">
          <span class="cf-forecast-title">📊 Risk Forecast</span>
          <span class="cf-risk-pill ${_riskClass(f.riskRating)}">${f.riskRating} risk</span>
        </div>
        <div class="cf-forecast-grid">
          <div class="cf-fc"><span class="cf-fc-l">Patient volume</span><span class="cf-fc-v">+${f.extraPatientsPerDay}/day</span></div>
          <div class="cf-fc"><span class="cf-fc-l">Revenue</span><span class="cf-fc-v">+$${f.extraRevenuePerDay.toLocaleString()}/day</span></div>
          <div class="cf-fc"><span class="cf-fc-l">Waiting pressure</span><span class="cf-fc-v ${_waitClass(f.waitingPressure)}">${f.waitingPressure}</span></div>
          <div class="cf-fc"><span class="cf-fc-l">Public care</span><span class="cf-fc-v">${f.publicImpact}</span></div>
        </div>
        <div class="cf-forecast-needs">
          <span class="cf-fc-l">Recommended minimum</span>
          <span class="cf-need-chip${f.haveGp>=f.recGp?' cf-need-chip--ok':''}">GP ${f.haveGp}/${f.recGp}</span>
          <span class="cf-need-chip${f.haveDocs>=f.recDocs?' cf-need-chip--ok':''}">Doctors ${f.haveDocs}/${f.recDocs}</span>
          <span class="cf-need-chip${f.haveNurses>=f.recNurses?' cf-need-chip--ok':''}">Nurses ${f.haveNurses}/${f.recNurses}</span>
        </div>
        ${f.warnings.length?`<ul class="cf-warn-list">${f.warnings.map(w=>`
          <li class="cf-warn cf-warn--${w.severity}">
            <div class="cf-warn-head"><span class="cf-warn-title">⚠ ${w.title}</span><span class="cf-warn-sev cf-warn-sev--${w.severity}">${w.severity==='high'?'High':'Watch'}</span></div>
            <div class="cf-warn-line"><span class="cf-warn-lbl">Cause:</span> ${w.cause}</div>
            <div class="cf-warn-line"><span class="cf-warn-lbl">Consequence:</span> ${w.consequence}</div>
            ${w.fixes&&w.fixes.length?`<ul class="cf-warn-fixes">${w.fixes.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}
            ${w.action?`<button type="button" class="cf-warn-action" onclick="bnTriggerAction&&bnTriggerAction('${w.action.selector}')">${w.action.label} →</button>`:''}
          </li>`).join('')}</ul>`:''}
      </div>`;})()}
      <button class="ic-sign-btn" onclick="acceptInsuranceContract('${o.id}')">
        Sign Contract <span class="ic-sign-term">${o.durationDays}-day term</span>
      </button>
    </div>`;
  }).join('');
}

function _renderDonorTab(){
  let html='';
  if(typeof freeBuildCredits!=='undefined'&&freeBuildCredits.gp){
    html+=`<div class="ic-credit-note">\ud83c\udfe5 Free GP room credit: ${freeBuildCredits.gp} available</div>`;
  }
  if(typeof activeContract!=='undefined'&&activeContract){
    const prog=activeContract.progress||0;
    const tgt=activeContract.target||1;
    const barPct=Math.min(100,Math.round((prog/tgt)*100));
    html+=`<div class="ic-donor-card ic-donor-active">
      <div class="ic-donor-header">
        <span class="ic-donor-badge ic-donor-badge--active">Active Request</span>
        <span class="ic-donor-name">${activeContract.title}</span>
      </div>
      <p class="ic-donor-desc">${activeContract.desc}</p>
      <div class="ic-donor-prog-wrap">
        <div class="ic-donor-prog-bar" style="width:${barPct}%"></div>
      </div>
      <div class="ic-donor-prog-label">Progress: ${prog} / ${tgt}</div>
      <div class="ic-donor-reward">${activeContract.reward.kind==='money'?`\ud83d\udcb5 Reward: $${activeContract.reward.amount.toLocaleString()}`:`\ud83c\udfd7\ufe0f Reward: 1 free ${typeof RDEFS!=='undefined'&&RDEFS[activeContract.reward.roomType]?RDEFS[activeContract.reward.roomType].name:activeContract.reward.roomType}`}</div>
    </div>`;
  }else if(typeof contractOffer!=='undefined'&&contractOffer){
    html+=`<div class="ic-donor-card ic-donor-offer">
      <div class="ic-donor-header">
        <span class="ic-donor-badge ic-donor-badge--offer">New Request</span>
        <span class="ic-donor-name">${contractOffer.title}</span>
      </div>
      <p class="ic-donor-desc">${contractOffer.desc}</p>
      <div class="ic-donor-reward">${contractOffer.rewardText}</div>
      <button class="ic-donor-accept-btn" onclick="acceptContract()">Accept Donor Request</button>
    </div>`;
  }else{
    html+=`<div class="ic-empty">No donor request is available right now.<br><span class="ic-empty-sub">New requests appear after completing or declining the previous one.</span></div>`;
  }
  return html;
}

function renderContracts(){
  const wraps=[
    document.getElementById('contracts'),
    document.getElementById('contractpanel')
  ].filter(Boolean);
  if(!wraps.length)return;

  const activeCount=(typeof insuranceContracts!=='undefined'?insuranceContracts.length:0);
  const tabs=[
    {id:'active',label:`Active (${activeCount})`},
    {id:'market',label:'Marketplace'},
    {id:'donor',label:'Donor Requests'}
  ];

  const tabHtml=tabs.map(t=>`<button class="ic-tab${currentContractTab===t.id?' ic-tab--active':''}" onclick="setContractTab('${t.id}')">${t.label}</button>`).join('');

  let content='';
  if(currentContractTab==='active') content=_renderActiveTab();
  else if(currentContractTab==='market') content=_renderMarketTab();
  else content=_renderDonorTab();

  const html=`<div class="ic-layout">
    ${_renderGovBlock()}
    <div class="ic-section-header">Insurance Contracts</div>
    <div class="ic-tab-bar">${tabHtml}</div>
    <div class="ic-tab-content">${content}</div>
  </div>`;

  wraps.forEach(wrap=>{wrap.innerHTML=html;});
}
