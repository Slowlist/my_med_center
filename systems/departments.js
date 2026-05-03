// systems/departments.js — Department Upgrade UI & bonus layer
// ------------------------------------------------------------
// The Department Dashboard surfaces each department's level,
// efficiency, staffing coverage, current bottleneck, room list,
// active bonuses, upgrade affordance, and a recommended action so
// the player can see at a glance which part of the hospital is
// struggling and why.

const DEPT_CONFIG=[
  {
    key:'ward',
    label:'General Patient Care',
    icon:'🛏️',
    color:'#66bb6a',
    desc:'GP, waiting room, and inpatient flow — the everyday backbone of the hospital.',
    rooms:['gp','waiting_room','ward','med_surg','single_hospital_room','double_hospital_room','pediatrics','geriatrics'],
    staffRoles:['gp_doc','nurse','cna'],
    maxLevel:5,
    levelLabels:[
      'Standard inpatient care',
      'Ward throughput +8%; discharge flow improved',
      'Inpatient coordination improved; beds turn over faster',
      'Discharge planning optimised; ward speed +16%',
      'Seamless inpatient cycle; ward +20%; discharge +20%'
    ],
    getBonuses(lvl){
      return{
        wardSpeed:[0,0.08,0.12,0.16,0.20][lvl]||0,
        dischargeSpeed:[0,0.05,0.10,0.15,0.20][lvl]||0
      };
    }
  },
  {
    key:'er',
    label:'Emergency & Critical Care',
    icon:'🚨',
    color:'#ef5350',
    desc:'ER and ICU throughput, critical response speed, and reputation resilience from emergency delays.',
    rooms:['er','general_icu','cardiac_icu','trauma_bay','observation_room','ambulance_bay','dispatch_office'],
    staffRoles:['er_doc','nurse'],
    maxLevel:5,
    levelLabels:[
      'Standard emergency operations',
      'Triage speed +8%; ER throughput improved',
      'ICU coordination improved; faster critical handoffs',
      'Rapid response protocol; rep loss from delays −20%',
      'Elite emergency unit; ER throughput +20%; rep loss −40%'
    ],
    getBonuses(lvl){
      return{
        erSpeed:[0,0.08,0.12,0.16,0.20][lvl]||0,
        basicWaitBonus:[0,1,2,3,4][lvl]||0
      };
    }
  },
  {
    key:'lab',
    label:'Diagnostics',
    icon:'🔬',
    color:'#42a5f5',
    desc:'Lab, X-Ray, and Pharmacy speed, and diagnostic bottleneck reduction.',
    rooms:['lab','xray','radiology','pharmacy'],
    staffRoles:['pharmacist','intern'],
    maxLevel:5,
    levelLabels:[
      'Standard diagnostic operations',
      'Diagnostic speed +8%; fewer result delays',
      'Lab-pharmacy coordination improved; speed +12%',
      'Bottleneck reduction; wait pressure −3; speed +16%',
      'Streamlined diagnostic suite; speed +20%; wait −4'
    ],
    getBonuses(lvl){
      return{
        diagnosticSpeed:[0,0.08,0.12,0.16,0.20][lvl]||0,
        basicWaitBonus:[0,1,2,3,4][lvl]||0
      };
    }
  },
  {
    key:'surgery',
    label:'Surgery',
    icon:'🔪',
    color:'#c2185b',
    desc:'Operating rooms, surgical recovery, and procedure throughput.',
    rooms:['surgery','plastic_surgery_or','operating_room','pacu','surgical_recovery','aesthetic_procedure_room','ivf_procedure_room'],
    staffRoles:['surgeon','nurse'],
    maxLevel:5,
    levelLabels:[
      'Standard surgical operations',
      'Procedure prep streamlined; surgery speed +6%',
      'Sterile turnover improved; surgery speed +12%',
      'OR scheduling optimized; surgery speed +16%; recovery +10%',
      'Elite surgical suite; surgery +20%; recovery +20%'
    ],
    getBonuses(lvl){
      return{
        surgerySpeed:[0,0.06,0.12,0.16,0.20][lvl]||0,
        recoverySpeed:[0,0,0.05,0.10,0.20][lvl]||0
      };
    }
  },
  {
    key:'operations',
    label:'Operations',
    icon:'⚙️',
    color:'#ffa726',
    desc:'Cleanliness stability, hospital stress, and staff recovery rates.',
    rooms:['janitor_closet','staff_room','lunch_room','hvac_generator','security_office','bathroom'],
    staffRoles:['janitor','security_officer'],
    maxLevel:5,
    levelLabels:[
      'Standard operational maintenance',
      'Cleanliness holds better; staff break recovery +1',
      'Stress buffered; break energy +2, morale +1',
      'Full operational grip; break energy +3, morale +2',
      'Operational excellence; full stress & cleanliness mastery; break +4/+3'
    ],
    getBonuses(lvl){
      return{
        breakEnergyBonus:[0,1,2,3,4][lvl]||0,
        breakMoraleBonus:[0,0,1,2,3][lvl]||0,
        stress:[0,0,0,0,1][lvl]||0
      };
    }
  },
  {
    key:'admin',
    label:'Administration',
    icon:'📋',
    color:'#64b5f6',
    desc:'Government compliance, grants, contracts, and public funding protection.',
    rooms:['head_office','grant_writer_office','administration','hr_office','case_management','marketing_office'],
    staffRoles:['clerical','grant_writer','hr_manager','marketing_manager'],
    maxLevel:5,
    levelLabels:[
      'Standard administrative processes',
      'Audit penalty −15%; grant approval +5%',
      'Audit penalty −25%; grant approval +10%',
      'Contract rewards +15%; audit −35%; grants +12%',
      'Full admin mastery; audit −45%; contracts +25%; grants +15%'
    ],
    getBonuses(lvl){
      return{
        governmentPenaltyMult:[1,0.85,0.75,0.65,0.55][lvl]||1,
        grantApprovalBonus:[0,0.05,0.10,0.12,0.15][lvl]||0,
        contractRewardMult:[1,1,1,1.15,1.25][lvl]||1
      };
    }
  },
  {
    key:'digital',
    label:'Digital Infrastructure',
    icon:'💻',
    color:'#ab6ff0',
    desc:'Research speed, RP income, automation routing, and IT event resistance.',
    rooms:['it_department'],
    staffRoles:['it_specialist'],
    maxLevel:5,
    levelLabels:[
      'Basic digital connectivity',
      'Research RP +1/day; research speed +0.25',
      'Research RP +2/day; research speed +0.5',
      'Research RP +3/day; research speed +0.75; wait −2',
      'Full digital mastery; RP +4/day; speed +1.0; wait −2'
    ],
    getBonuses(lvl){
      return{
        itRpBonus:[0,1,2,3,4][lvl]||0,
        researchSpeedBonus:[0,0.25,0.5,0.75,1.0][lvl]||0,
        basicWaitBonus:[0,0,0,2,2][lvl]||0
      };
    }
  },
  {
    key:'research',
    label:'Research / University',
    icon:'🎓',
    color:'#7c4dff',
    desc:'Research output, residency programs, lecture halls, and academic prestige.',
    rooms:['research_department','clinical_trials_office','research_lab','ethics_board_office','data_review_office','lecture_hall','residency_office','library_study_room','simulation_training_center','student_center','student_health_clinic','auditorium','teaching_intern_office'],
    staffRoles:['researcher'],
    maxLevel:5,
    levelLabels:[
      'Independent research projects',
      'RP gain +5%; research speed +0.10',
      'Academic partnerships; RP +10%; speed +0.20',
      'Residency program active; RP +15%; intern XP +25%',
      'University hospital prestige; RP +25%; speed +0.40'
    ],
    getBonuses(lvl){
      return{
        researchRpBonus:[0,0.05,0.10,0.15,0.25][lvl]||0,
        researchSpeedBonus:[0,0.10,0.20,0.30,0.40][lvl]||0
      };
    }
  },
  {
    key:'private_specialty',
    label:'Private Specialty',
    icon:'💎',
    color:'#d2aa35',
    desc:'VIP, cosmetic, fertility, and luxury suites — premium revenue streams.',
    rooms:['vip_room','premium_waiting_lounge','cosmetic_consult_office','cosmetic_recovery_suite','plastic_surgery_or','aesthetic_procedure_room','luxury_recovery_suite','premium_recovery_suite','fertility_consult_office','ivf_procedure_room','ivf_recovery_room','andrology_lab','cryogenic_storage','embryology_lab_room'],
    staffRoles:['surgeon','nurse'],
    maxLevel:5,
    levelLabels:[
      'Standard private rooms',
      'Private revenue +5%; VIP throughput +5%',
      'Concierge service; private rev +10%',
      'Premium experience; private rev +15%; rep buffer +1',
      'Full luxury wing; private rev +25%; VIP +20%'
    ],
    getBonuses(lvl){
      return{
        privateRevenueBonus:[0,0.05,0.10,0.15,0.25][lvl]||0,
        vipSpeedBonus:[0,0.05,0.05,0.10,0.20][lvl]||0
      };
    }
  }
];

function getDeptConfig(key){return DEPT_CONFIG.find(d=>d.key===key)||null;}

// Aggregated bonus stack consumed by getTechBonus / getDeptBonus callers.
function getDeptBonus(){
  const bonus={
    erSpeed:0,wardSpeed:0,diagnosticSpeed:0,dischargeSpeed:0,gpSpeed:0,surgerySpeed:0,recoverySpeed:0,
    basicWaitBonus:0,breakEnergyBonus:0,breakMoraleBonus:0,stress:0,
    governmentPenaltyMult:1,contractRewardMult:1,grantApprovalBonus:0,
    itRpBonus:0,researchSpeedBonus:0,researchRpBonus:0,
    privateRevenueBonus:0,vipSpeedBonus:0
  };
  DEPT_CONFIG.forEach(dept=>{
    const rawLvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(dept.key):1;
    const lvl=Math.max(0,Math.min(dept.maxLevel-1,rawLvl-1));
    const b=dept.getBonuses(lvl);
    Object.keys(b).forEach(k=>{
      if(k==='governmentPenaltyMult'){ if(b[k]&&b[k]<1)bonus[k]*=b[k]; }
      else if(k==='contractRewardMult'){ if(b[k]&&b[k]>1)bonus[k]*=b[k]; }
      else if(b[k]) bonus[k]=(bonus[k]||0)+b[k];
    });
  });
  return bonus;
}

function getDeptUpgradeCost(key){
  const lvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(key):1;
  const baseCosts={ward:2000,er:2500,lab:2500,surgery:3500,operations:2000,admin:3000,digital:3500,research:3500,private_specialty:4000};
  return Math.round((baseCosts[key]||3000)*Math.pow(1.65,lvl-1));
}

// --------------- Dashboard data helpers ---------------

// Rooms in this department that are currently built.
function getDeptRooms(key){
  const dept=getDeptConfig(key);
  if(!dept||typeof rooms==='undefined')return[];
  const types=new Set(dept.rooms||[]);
  return rooms.filter(r=>types.has(r.type));
}

// Staffing coverage: are the right roles hired and is each room
// covered on the current shift? Returns {hired, needed, covered, total}.
function getDeptStaffing(key){
  const dept=getDeptConfig(key);
  if(!dept)return{hired:0,needed:0,covered:0,total:0,missingRoles:[]};
  const roles=dept.staffRoles||[];
  const hired=roles.reduce((sum,role)=>sum+(typeof staff!=='undefined'
    ?staff.filter(s=>s.hired&&s.role===role).length:0),0);
  const deptRooms=getDeptRooms(key);
  let covered=0;
  const missingRoles=new Set();
  deptRooms.forEach(rm=>{
    if(typeof roomHasRequiredStaff==='function'&&roomHasRequiredStaff(rm)){
      covered++;
    }else if(typeof getMissingRoomRoles==='function'){
      getMissingRoomRoles(rm).forEach(r=>missingRoles.add(r));
    }
  });
  return{
    hired,
    needed:roles.length,
    covered,
    total:deptRooms.length,
    missingRoles:Array.from(missingRoles)
  };
}

// Department efficiency: a 0-150% score driven by rooms, staff,
// stress, cleanliness, research, and upgrades. Used to highlight
// the weakest department on the dashboard.
function getDeptEfficiency(key){
  const dept=getDeptConfig(key);
  if(!dept)return{percent:0,factors:[]};
  const factors=[];
  const push=(label,delta)=>{ if(delta!==0)factors.push({label,delta:Math.round(delta)}); };
  let pct=100;
  push('Base',0);
  // Room availability: -25 if no rooms built.
  const deptRooms=getDeptRooms(key);
  if(deptRooms.length===0){
    return{percent:0,factors:[{label:'No rooms built yet',delta:-100}]};
  }
  // Staffing coverage: each uncovered room costs 10%, full coverage +10.
  const staffing=getDeptStaffing(key);
  if(staffing.total>0){
    const coverageRatio=staffing.covered/staffing.total;
    if(coverageRatio>=1){ pct+=10; push('Full staff coverage',+10); }
    else{
      const penalty=-Math.round((1-coverageRatio)*30);
      pct+=penalty; push(`Staffing gaps (${staffing.total-staffing.covered}/${staffing.total} rooms)`,penalty);
    }
  }
  // Department upgrade level: +5 per level above 1.
  const lvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(key):1;
  if(lvl>1){ const b=(lvl-1)*5; pct+=b; push(`Upgrade level ${lvl}`,+b); }
  // Cleanliness: ±15 around 50% baseline.
  const cln=typeof cleanliness!=='undefined'?cleanliness:70;
  const cleanDelta=Math.max(-15,Math.min(15,Math.round((cln-50)*0.3)));
  if(cleanDelta!==0){ pct+=cleanDelta; push(cleanDelta>0?'Strong cleanliness':'Poor cleanliness',cleanDelta); }
  // Hospital stress: −1 per 5 above 50, cap −15.
  const st=typeof stress!=='undefined'?stress:0;
  if(st>50){
    const sp=-Math.min(15,Math.floor((st-50)/5));
    if(sp){ pct+=sp; push('High hospital stress',sp); }
  }
  // Relevant research: small +5 per matching tech speed bonus.
  const techBonus=typeof getTechBonus==='function'?getTechBonus():null;
  if(techBonus){
    let researchBoost=0;
    if(key==='er'&&techBonus.erSpeed>1)researchBoost+=5;
    if(key==='ward'&&techBonus.gpSpeed>1)researchBoost+=5;
    if(key==='lab'&&techBonus.diagnosticSpeed>1)researchBoost+=5;
    if(key==='digital'&&techBonus.researchSpeed>1)researchBoost+=5;
    if(researchBoost){ pct+=researchBoost; push('Research bonuses active',+researchBoost); }
  }
  // Average room efficiency contributes a small modulator (±10).
  if(typeof getRoomEfficiencyPercent==='function'&&deptRooms.length){
    const avg=deptRooms.reduce((s,rm)=>s+getRoomEfficiencyPercent(rm),0)/deptRooms.length;
    const roomDelta=Math.max(-10,Math.min(10,Math.round((avg-100)*0.15)));
    if(roomDelta!==0){ pct+=roomDelta; push(`Avg room efficiency ${Math.round(avg)}%`,roomDelta); }
  }
  return{percent:Math.max(0,Math.min(150,Math.round(pct))),factors};
}

// Identify the top current bottleneck for this department: the room
// with the lowest efficiency, missing staff, queue overload, or no
// rooms at all. Returns {label, detail, severity}.
function getDeptBottleneck(key){
  const dept=getDeptConfig(key);
  if(!dept)return null;
  const deptRooms=getDeptRooms(key);
  if(!deptRooms.length){
    return{label:'No rooms built',detail:`Build a ${dept.label.toLowerCase()} room to activate this department.`,severity:'high'};
  }
  const staffing=getDeptStaffing(key);
  if(staffing.missingRoles.length){
    const roleLabels=staffing.missingRoles.map(r=>typeof ROLES!=='undefined'?(ROLES[r]?.label||r):r).join(', ');
    return{label:'Staffing gap',detail:`Missing: ${roleLabels}`,severity:'high'};
  }
  // Find the room with the lowest efficiency or the largest queue.
  let worst=null;
  deptRooms.forEach(rm=>{
    const eff=typeof getRoomEfficiencyPercent==='function'?getRoomEfficiencyPercent(rm):100;
    const qs=typeof getRoomQueueSummary==='function'?getRoomQueueSummary(rm):{waiting:0,overloaded:false};
    const score=eff-(qs.overloaded?40:0)-(qs.waiting*3);
    if(!worst||score<worst.score)worst={room:rm,score,eff,qs};
  });
  if(worst&&worst.qs.overloaded){
    return{label:'Queue overloaded',detail:`${RDEFS[worst.room.type].name} has ${worst.qs.waiting} patients waiting`,severity:'medium'};
  }
  if(worst&&worst.eff<60){
    return{label:'Underperforming room',detail:`${RDEFS[worst.room.type].name} efficiency is ${worst.eff}%`,severity:'medium'};
  }
  return{label:'Stable',detail:'No major bottleneck right now.',severity:'low'};
}

// Suggest a concrete next action based on the bottleneck and level.
function getDeptRecommendation(key){
  const dept=getDeptConfig(key);
  if(!dept)return'';
  const bottleneck=getDeptBottleneck(key);
  if(bottleneck&&bottleneck.severity==='high'){
    return bottleneck.label==='No rooms built'
      ?`Build the first ${dept.label.toLowerCase()} room.`
      :`Hire or assign: ${bottleneck.detail.replace('Missing: ','')}.`;
  }
  if(bottleneck&&bottleneck.severity==='medium'){
    return bottleneck.label==='Queue overloaded'
      ?`Add capacity in ${dept.label} or speed up treatment.`
      :`Improve cleanliness or reduce stress to lift ${dept.label} rooms.`;
  }
  const lvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(key):1;
  if(lvl<dept.maxLevel)return`Upgrade ${dept.label} to Level ${lvl+1} for stronger bonuses.`;
  return`${dept.label} is stable and at max level. Maintain coverage.`;
}

// Format the bonus list for the active level into readable chips.
function getDeptActiveBonuses(key){
  const dept=getDeptConfig(key);
  if(!dept)return[];
  const lvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(key):1;
  const b=dept.getBonuses(Math.max(0,Math.min(dept.maxLevel-1,lvl-1)));
  const labels={
    erSpeed:'ER speed',wardSpeed:'Ward speed',diagnosticSpeed:'Diagnostic speed',
    dischargeSpeed:'Discharge speed',gpSpeed:'GP speed',surgerySpeed:'Surgery speed',
    recoverySpeed:'Recovery speed',basicWaitBonus:'Wait tolerance',
    breakEnergyBonus:'Break energy',breakMoraleBonus:'Break morale',
    governmentPenaltyMult:'Audit penalty',grantApprovalBonus:'Grant approval',
    contractRewardMult:'Contract rewards',itRpBonus:'IT RP/day',
    researchSpeedBonus:'Research speed',researchRpBonus:'Research RP',
    privateRevenueBonus:'Private revenue',vipSpeedBonus:'VIP speed',
    stress:'Stress buffer'
  };
  const out=[];
  Object.keys(b).forEach(k=>{
    if(!b[k])return;
    if(k==='governmentPenaltyMult'){
      if(b[k]<1)out.push(`${labels[k]} −${Math.round((1-b[k])*100)}%`);
    }else if(k==='contractRewardMult'){
      if(b[k]>1)out.push(`${labels[k]} +${Math.round((b[k]-1)*100)}%`);
    }else if(typeof b[k]==='number'&&b[k]<1&&b[k]>0){
      out.push(`${labels[k]||k} +${Math.round(b[k]*100)}%`);
    }else{
      out.push(`${labels[k]||k} +${b[k]}`);
    }
  });
  return out;
}

function openDeptMenu(){
  const modal=document.getElementById('deptmodal');
  if(!modal)return;
  modal.classList.add('open');
  renderDeptPanel();
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}

function closeDeptMenu(){
  const modal=document.getElementById('deptmodal');
  if(!modal)return;
  modal.classList.remove('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}

function _deptEffTone(pct){
  if(pct>=110)return'good';
  if(pct>=70)return'okay';
  if(pct>=40)return'warn';
  return'bad';
}

function renderDeptPanel(){
  const el=document.getElementById('deptpanel');
  if(!el)return;
  const moneyAvail=typeof money!=='undefined'?money:0;
  const isSandbox=typeof isSandboxMode!=='undefined'&&isSandboxMode;

  let html=`<div class="dept-intro">Each card shows the department's level, efficiency, staffing coverage, current bottleneck, included rooms, active bonuses, and a recommended next action. Use this to spot which part of the hospital is struggling.</div><div class="dept-grid">`;

  DEPT_CONFIG.forEach(dept=>{
    const lvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(dept.key):1;
    const maxLvl=dept.maxLevel;
    const isMaxed=lvl>=maxLvl;
    const cost=isMaxed?0:getDeptUpgradeCost(dept.key);
    const canAfford=isSandbox||moneyAvail>=cost;
    // Only honor the legacy lock check for departments the legacy
    // DEPARTMENT_DEFS knows about — new dashboard-only departments
    // (surgery, research, private_specialty) are never lock-gated.
    const legacyKeys=['er','ward','lab','operations','admin','digital'];
    const statusCheck=(legacyKeys.includes(dept.key)&&typeof getDepartmentStatus==='function')
      ?getDepartmentStatus(dept.key):{chip:'operational',label:'Active'};
    const isLocked=statusCheck.chip==='locked';

    const eff=getDeptEfficiency(dept.key);
    const staffing=getDeptStaffing(dept.key);
    const bottleneck=getDeptBottleneck(dept.key);
    const recommendation=getDeptRecommendation(dept.key);
    const deptRooms=getDeptRooms(dept.key);
    const bonuses=getDeptActiveBonuses(dept.key);
    const effTone=_deptEffTone(eff.percent);

    const pips=Array.from({length:maxLvl},(_,i)=>{
      const cls=i<lvl?'dept-pip filled':(i===lvl&&!isMaxed?'dept-pip next':'dept-pip empty');
      return`<span class="${cls}"></span>`;
    }).join('');

    let btnContent='';
    if(isLocked){
      btnContent=`<div class="dept-locked-msg">🔒 ${statusCheck.label}</div>`;
    }else if(isMaxed){
      btnContent=`<div class="dept-maxed">★ Max Level Reached</div>`;
    }else{
      const disabledAttr=(!canAfford)?'disabled':'';
      btnContent=`<button class="dept-upgrade-btn${!canAfford?' dept-upgrade-btn--disabled':''}" onclick="deptUpgradeClick('${dept.key}')" ${disabledAttr}>
        Upgrade to Level ${lvl+1} <span class="dept-upgrade-cost">$${cost.toLocaleString()}</span>
      </button>`;
    }

    const roomsList=deptRooms.length
      ?deptRooms.map(rm=>`<span class="dept-room-chip">${RDEFS[rm.type]?.name||rm.type}</span>`).slice(0,8).join('')
        +(deptRooms.length>8?`<span class="dept-room-chip dept-room-chip--more">+${deptRooms.length-8} more</span>`:'')
      :'<span class="dept-room-chip dept-room-chip--empty">None built yet</span>';

    const bonusList=bonuses.length
      ?bonuses.map(b=>`<span class="dept-bonus-chip">${b}</span>`).join('')
      :'<span class="dept-bonus-chip dept-bonus-chip--empty">No active bonuses</span>';

    const bnSeverityClass=bottleneck?`dept-bottleneck--${bottleneck.severity}`:'';
    const bnIcon=bottleneck?(bottleneck.severity==='high'?'🔴':bottleneck.severity==='medium'?'🟡':'🟢'):'';

    html+=`<div class="dept-card${isLocked?' dept-card--locked':''}${isMaxed?' dept-card--maxed':''}" style="--dept-color:${dept.color}">
      <div class="dept-card-header">
        <span class="dept-icon">${dept.icon}</span>
        <div class="dept-card-info">
          <span class="dept-name">${dept.label}</span>
          <span class="dept-level-badge">Level ${lvl} / ${maxLvl}</span>
        </div>
        <div class="dept-eff dept-eff--${effTone}" title="Department efficiency">${eff.percent}%</div>
      </div>
      <div class="dept-pips">${pips}</div>
      <p class="dept-desc">${dept.desc}</p>
      <div class="dept-dash-row">
        <div class="dept-dash-cell">
          <div class="dept-dash-label">Staffing</div>
          <div class="dept-dash-value">${staffing.covered}/${staffing.total||0} rooms · ${staffing.hired} hired</div>
        </div>
        <div class="dept-dash-cell">
          <div class="dept-dash-label">Bottleneck</div>
          <div class="dept-dash-value ${bnSeverityClass}">${bnIcon} ${bottleneck?bottleneck.label:'—'}</div>
          ${bottleneck&&bottleneck.detail?`<div class="dept-dash-sub">${bottleneck.detail}</div>`:''}
        </div>
      </div>
      <div class="dept-section">
        <div class="dept-section-label">Rooms (${deptRooms.length})</div>
        <div class="dept-chip-row">${roomsList}</div>
      </div>
      <div class="dept-section">
        <div class="dept-section-label">Active bonuses</div>
        <div class="dept-chip-row">${bonusList}</div>
      </div>
      <div class="dept-recommendation">
        <span class="dept-rec-icon">💡</span>
        <span class="dept-rec-text">${recommendation}</span>
      </div>
      <div class="dept-btn-row">${btnContent}</div>
    </div>`;
  });

  html+=`</div>`;
  el.innerHTML=html;
}

function deptUpgradeClick(key){
  const dept=getDeptConfig(key);
  if(!dept)return;
  const lvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(key):1;
  if(lvl>=dept.maxLevel){
    if(typeof addLog==='function')addLog(`${dept.label} is already at max level.`,'w');
    return;
  }
  const cost=getDeptUpgradeCost(key);
  const isSandbox=typeof isSandboxMode!=='undefined'&&isSandboxMode;
  if(!isSandbox&&(typeof money==='undefined'||money<cost)){
    if(typeof addLog==='function')addLog(`Need $${cost.toLocaleString()} to upgrade ${dept.label}.`,'b');
    if(typeof showToast==='function')showToast(`Need $${cost.toLocaleString()} to upgrade`,'warn');
    return;
  }
  if(!isSandbox&&typeof changeMoney==='function')changeMoney(-cost);
  if(typeof departments!=='undefined'){
    if(!departments[key])departments[key]={level:1};
    departments[key].level=Math.min(dept.maxLevel,(departments[key].level||1)+1);
  }
  const newLvl=typeof getDepartmentLevel==='function'?getDepartmentLevel(key):lvl+1;
  if(typeof addLog==='function')addLog(`${dept.icon} ${dept.label} upgraded to Level ${newLvl}.`,'g');
  if(typeof showToast==='function')showToast(`${dept.icon} ${dept.label} → Level ${newLvl}`,'good');
  if(typeof updateUI==='function')updateUI();
  renderDeptPanel();
}
