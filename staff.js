// Staff UI and room assignment logic live here so the hiring flow stays isolated.
function getMoraleBadge(morale){
  if(morale>=70)return 'good';
  if(morale>=40)return 'neutral';
  return 'bad';
}
function getTraitBadgeClass(trait){
  if(!trait)return 'neutral';
  if(trait.group==='director'||trait.group==='charge')return 'good';
  if(trait.tone){
    if(trait.tone==='good')return 'good';
    if(trait.tone==='bad')return 'bad';
    return 'neutral';
  }
  if(['calm','friendly','careful','mentor','fast_worker','experienced'].includes(trait.id))return 'good';
  if(['difficult','burnout_risk','sloppy'].includes(trait.id))return 'bad';
  return 'neutral';
}
function getTraitIcon(trait){
  if(!trait)return '•';
  const icons={
    calm:'🧘',
    difficult:'😡',
    ambitious:'💰',
    friendly:'🙂',
    burnout_risk:'🔥',
    fast_worker:'⚡',
    careful:'🛡️',
    sloppy:'⚠️',
    mentor:'🧠',
    learner:'📘',
    experienced:'🌟',
    clinical_vision:'👑',
    patient_champion:'⭐',
    operations_titan:'🏥',
    grant_magnet:'💎',
    persuasive_writer:'PW',
    policy_expert:'PE',
    data_driven:'DD',
    community_advocate:'CA',
    fast_drafter:'FD',
    relationship_builder:'RB',
    budget_specialist:'BS',
    perfectionist:'PF',
    idealist:'ID',
    corporate_friendly:'CF',
    big_picture_thinker:'BP',
    last_minute_worker:'LM',
    disorganized:'DG',
    weak_documentation:'WD',
    overpromises:'OP',
    burnout_prone:'BR',
    conflict_avoidant:'CV',
    strong_diagnostician:'SD',
    patient_favorite:'PF',
    rushed_clinician:'RC',
    steady_rounds_nurse:'SR',
    comforting_presence:'CP',
    overextended:'OE',
    detail_cleaner:'DC',
    fast_cleaner:'FC',
    misses_corners:'MC',
    de_escalator:'DE',
    strict_enforcer:'SE',
    intimidating:'IN'
  };
  return icons[trait.id]||'•';
}
function getTraitEffectText(trait){
  if(!trait)return 'No trait effect.';
  const texts={
    calm:'This staff member loses less morale when hospital stress is high.',
    difficult:'This staff member causes more incidents and workplace friction during stressful periods.',
    ambitious:'This staff member pushes for stronger hospital output and revenue.',
    friendly:'This staff member can earn extra reputation from positive patient interactions.',
    burnout_risk:'This staff member loses energy faster and burns out more easily.',
    fast_worker:'This staff member completes treatments faster.',
    careful:'This staff member works cleanly and steadily, helping quality and revenue.',
    sloppy:'This staff member is more likely to cause treatment setbacks.',
    mentor:'This staff member helps interns gain experience faster.',
    learner:'This staff member improves faster over time.',
    experienced:'This intern has grown more capable and gives a small permanent speed boost.',
    steady_rounds:'This charge nurse helps nurses, CNAs, and interns recover a little faster while on break.',
    clinical_vision:'This medical director gives every staffed clinical room a major speed boost.',
    patient_champion:'This medical director increases patient patience and reputation gains from treatment.',
    operations_titan:'This medical director improves cleanliness stability and shields morale from stress.',
    grant_magnet:'This medical director boosts clinical revenue and score gains.',
    persuasive_writer:'Raises general grant approval chance.',
    policy_expert:'Improves government and compliance-heavy grants.',
    data_driven:'Improves research, diagnostics, and operations grant success.',
    community_advocate:'Improves public care and community health grant success.',
    fast_drafter:'Reduces grant application review time.',
    relationship_builder:'Improves private and non-government grant success.',
    budget_specialist:'Increases cash rewards from approved grants.',
    perfectionist:'Better approval odds, but applications take longer.',
    idealist:'Better public health grants, weaker private-facing grants.',
    corporate_friendly:'Better private grants, weaker government/public grants.',
    big_picture_thinker:'Improves large grants, weaker on smaller ones.',
    last_minute_worker:'Sometimes finishes faster, but with extra failure risk.',
    disorganized:'Applications take longer to finish.',
    weak_documentation:'Lower approval chance on grant reviews.',
    overpromises:'Can win grants now, but poor hospital performance can trigger clawbacks later.',
    burnout_prone:'Loses energy faster when multiple grants are active.',
    conflict_avoidant:'Worse at compliance-heavy grant reviews and audits.',
    strong_diagnostician:'Improves diagnostic flow and clinical precision.',
    patient_favorite:'Builds stronger patient satisfaction and reputation.',
    rushed_clinician:'Moves faster, but is more likely to cause setbacks.',
    steady_rounds_nurse:'Keeps routine care moving steadily.',
    comforting_presence:'Patients feel calmer and more cared for.',
    overextended:'Loses energy faster under heavy workload.',
    detail_cleaner:'Adds extra cleanliness support each day.',
    fast_cleaner:'Covers more ground and helps keep mess from piling up.',
    misses_corners:'Leaves more dirt and clutter behind.',
    de_escalator:'Prevents incidents before they spiral.',
    strict_enforcer:'Reduces chaos and operational stress.',
    intimidating:'Improves control, but can create harsher public outcomes.'
  };
  return texts[trait.id]||trait.desc||'Trait effect active.';
}
function escapeAttr(text){
  return String(text||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderTraitChip(trait){
  if(!trait)return '';
  return `<span class="trait ${getTraitBadgeClass(trait)}" title="${escapeAttr(getTraitEffectText(trait))}">${getTraitIcon(trait)} ${trait.label}</span>`;
}
function renderAllTraitChips(staffMember){
  return `<div class="traits">
    ${(staffMember.traits||[]).map(t=>renderTraitChip(t)).join('')}
  </div>`;
}
function renderStaffStateChips(member){
  const chips=[renderStatusChip(member.hired?'Operational':'Available',member.hired?'operational':'info')];
  if((member.energy??100)<45)chips.push(renderStatusChip('Low Energy','low-energy'));
  if(member.state==='on_break')chips.push(renderStatusChip('Needs Staff','needs-staff'));
  if(member.state==='on_vacation')chips.push(renderStatusChip('Vacation','info'));
  if((member.returnBoostDays??0)>0)chips.push(renderStatusChip('Refreshed','operational'));
  if(member.raiseRequest)chips.push(renderStatusChip('Active Contract','active-contract'));
  return `<div class="status-row">${chips.join('')}</div>`;
}
function getStaffNeedFlags(member){
  return{
    raise:!!member.raiseRequest||(member.morale??100)<=45,
    break:(member.energy??100)<=40&&member.state!=='on_vacation',
    vacation:(member.morale??100)<=35||(member.quitRiskDays??0)>=3
  };
}
function getStaffNeedText(member){
  const needs=getStaffNeedFlags(member);
  const labels=[];
  if(needs.raise)labels.push('Raise');
  if(needs.break)labels.push('Break');
  if(needs.vacation)labels.push('Vacation');
  return labels.length?labels.join(' · '):'No urgent needs';
}
function issueManualRaise(id){
  const member=staff.find(s=>s.hired&&s.id===id);
  if(!member)return;
  const amount=member.raiseRequest?.amount||getRaiseRequestAmount(member);
  member.salary+=amount;
  member.morale=clamp((member.morale??100)+12,0,100);
  member.quitRiskDays=0;
  member.raiseCooldown=12;
  member.raiseRequest=null;
  addLog(`Issued a discretionary raise for ${member.name}. +$${amount.toLocaleString()}/mo.`, 'g');
  showToast('Raise issued','good');
  updateUI();
}
function sendStaffOnBreak(id){
  const member=staff.find(s=>s.hired&&s.id===id);
  if(!member||member.state==='on_vacation')return;
  member.state='on_break';
  member.active=false;
  addLog(`${member.name} was sent on break.`, 'w');
  showToast('Staff on break','info');
  updateUI();
}
function sendStaffOnVacation(id,approvedBy='player'){
  const member=staff.find(s=>s.hired&&s.id===id);
  if(!member)return;
  member.state='on_vacation';
  member.vacationDays=3+Math.floor(Math.random()*3);
  member.active=false;
  member.issueImmunityDays=0;
  member.returnBoostDays=0;
  member.raiseRequest=null;
  member.quitRiskDays=0;
  member.burnoutLogged=false;
  addLog(`${member.name} was approved for ${member.vacationDays} days of vacation by ${approvedBy==='hr'?'HR':'management'}.`, 'g');
  showToast('Vacation approved','good');
  updateUI();
}
function getManagedStaffRoster(useVisibleFilter=true){
  return staff
    .filter(s=>s.hired&&(!useVisibleFilter||visibleByShift(s)))
    .slice()
    .sort((a,b)=>(a.shift+a.role+a.name).localeCompare(b.shift+b.role+b.name));
}
function renderManagedStaffSection(targetId='staff-current',useVisibleFilter=true,title='Current Staff',note='Manage mood, breaks, raises, and recovery.'){
  const wrap=document.getElementById(targetId);
  if(!wrap)return;
  const roster=getManagedStaffRoster(useVisibleFilter);
  if(!roster.length){
    wrap.innerHTML=`<div class="staff-current-head"><div class="modal-kicker">${title}</div><div class="staff-current-note">No employed staff match this view yet.</div></div>`;
    return;
  }
  wrap.innerHTML=`<div class="staff-current-head">
      <div class="modal-kicker">${title}</div>
      <div class="staff-current-note">${note}</div>
    </div>
    <div class="staff-current-grid">
      ${roster.map(member=>{
        const needs=getStaffNeedFlags(member);
        return `<div class="staff-manage-card">
          <div class="staff-manage-top">
            <div>
              <div class="hs-name">${member.name}</div>
              <div class="hs-role">${ROLES[member.role].label}</div>
            </div>
            <div class="hs-meta">${member.shift[0].toUpperCase()+member.shift.slice(1)} shift</div>
          </div>
          ${renderStaffStateChips(member)}
          <div class="hs-meta">Mood ${Math.round(member.mood??100)} · Energy ${Math.round(member.energy??100)} · Morale ${Math.round(member.morale??100)}</div>
          <div class="staff-needs-row"><span class="trait neutral">Needs: ${getStaffNeedText(member)}</span></div>
          <div class="staff-manage-actions">
            <button class="panel-btn" onclick="sendStaffOnBreak(${member.id})" ${member.state==='on_break'||member.state==='on_vacation'?'disabled':''}>Issue Break</button>
            <button class="panel-btn" onclick="issueManualRaise(${member.id})">Give Raise</button>
            <button class="panel-btn" onclick="sendStaffOnVacation(${member.id})" ${member.state==='on_vacation'?'disabled':''}>Approve Vacation</button>
          </div>
          ${needs.raise||needs.break||needs.vacation?`<div class="staff-current-warning">${getStaffNeedText(member)}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
}
function renderCurrentStaffSection(){
  renderManagedStaffSection('staff-current',true,'Current Staff','Manage mood, breaks, raises, and recovery.');
}
function renderEmployeeNeedsMenu(){
  renderManagedStaffSection('employee-current',false,'All Employees','Review every employed staff member and handle raises, breaks, and vacations.');
}
function getSupportLabel(role){
  if(role==='intern')return 'Cheap support - gains XP and slowly boosts clinical speed';
  if(role==='security_officer')return 'Security support - lowers chaos risk';
  if(role==='grant_writer')return 'Administrative support - manages grant funding programs';
  if(role==='medical_director')return 'Hospital-wide leadership bonus';
  if(role==='charge_nurse')return 'Guides nurses, CNAs, and interns onto recovery breaks';
  return 'Hospital-wide coverage';
}

function renderRaiseRequestCards(requests){
  if(!requests.length)return '';
  return requests.map(member=>`<div class="request-card">
    <div class="request-title">${member.name} wants a raise</div>
    <div class="request-copy">${ROLES[member.role].label} on the ${member.shift} shift is asking for +$${member.raiseRequest.amount.toLocaleString()}/mo after morale slipped to ${Math.round(member.morale??100)}.</div>
    <div class="request-actions">
      <button class="accept" onclick="acceptRaiseRequest(${member.id})">Accept Raise</button>
      <button class="ignore" onclick="ignoreRaiseRequest(${member.id})">Ignore</button>
    </div>
  </div>`).join('');
}

function processStaffQuit(id,reason){
  const member=staff.find(p=>p.id===id);
  if(!member)return;
  member.hired=false;
  staff=staff.filter(p=>p.id!==id);
  const idx=staffPool.findIndex(p=>p.id===id);
  if(idx>=0)staffPool.splice(idx,1);
  staffPool.push(genStaffMember(member.role,member.shift));
  addLog(reason||`${member.name} quit.`, 'b');
  showToast(`${member.name} quit`,'warn');
  updateUI();
}

function acceptRaiseRequest(id){
  const member=staff.find(s=>s.hired&&s.id===id&&s.raiseRequest);
  if(!member)return;
  const amount=member.raiseRequest.amount||0;
  member.salary+=amount;
  member.morale=clamp((member.morale??100)+14,0,100);
  member.quitRiskDays=0;
  member.raiseCooldown=12;
  member.raiseRequest=null;
  addLog(`Accepted a raise for ${member.name}. Salary increased by $${amount.toLocaleString()} and morale improved.`, 'g');
  showToast('Raise accepted','good');
  updateUI();
}

function ignoreRaiseRequest(id){
  const member=staff.find(s=>s.hired&&s.id===id&&s.raiseRequest);
  if(!member)return;
  member.raiseRequest=null;
  member.morale=clamp((member.morale??100)-10,0,100);
  member.quitRiskDays=Math.max(member.quitRiskDays||0,6);
  member.raiseCooldown=6;
  addLog(`Ignored ${member.name}'s raise request. Morale fell and they may quit if things do not improve.`, 'w');
  showToast('Raise request ignored','warn');
  updateUI();
}

function renderHiredStaffMenu(){
  const wrap=document.getElementById('hiredstaffmenu');
  if(!wrap)return;
  const hired=staff.filter(s=>s.hired);
  const pendingRequests=hired.filter(s=>s.raiseRequest);
  const dayCount=hired.filter(s=>s.shift==='day').length;
  const nightCount=hired.filter(s=>s.shift==='night').length;
  const preview=hired
    .slice()
    .sort((a,b)=>(a.shift+a.role+a.name).localeCompare(b.shift+b.role+b.name))
    .slice(0,6);

  if(!hired.length){
    wrap.innerHTML=`<div class="hs-card"><div class="hs-name">No staff hired yet</div><div class="hs-empty">Hire your first team member to open rooms, cover shifts, and start treating patients.</div></div><button class="panel-btn" onclick="openStaff()">Open Staff Manager</button>`;
    return;
  }

  const roleCounts=hired.reduce((acc,s)=>{
    acc[s.role]=(acc[s.role]||0)+1;
    return acc;
  },{});
  const topRoles=Object.entries(roleCounts)
    .sort((a,b)=>b[1]-a[1]||ROLES[a[0]].label.localeCompare(ROLES[b[0]].label))
    .slice(0,3)
    .map(([role,count])=>`<span class="hs-badge">${ROLES[role].label}: ${count}</span>`)
    .join('');

  wrap.innerHTML=`${pendingRequests.length?`<div class="hs-card"><div class="hs-name">${pendingRequests.length} raise request${pendingRequests.length===1?'':'s'} waiting</div><div class="hs-empty">Low-morale staff are asking for more pay.</div></div>${renderRaiseRequestCards(pendingRequests)}`:''}<div class="hs-summary">
      <div>
        <div class="hs-name">${hired.length} team members hired</div>
        <div class="hs-meta">${dayCount} day shift · ${nightCount} night shift</div>
      </div>
      <button class="panel-btn" onclick="openStaff()">Open Staff Manager</button>
    </div>
    <div class="hs-totals">${topRoles}</div>
    <div class="hs-grid">
      ${preview.map(s=>`<div class="hs-card">
        <div class="hs-name">${s.name}</div>
        <div class="hs-role">${ROLES[s.role].label}</div>
        ${renderStaffStateChips(s)}
        <div class="hs-meta">${s.shift[0].toUpperCase()+s.shift.slice(1)} shift · Energy ${Math.round(s.energy??100)} · Morale ${Math.round(s.morale??100)}${s.role==='intern'?` · XP ${Math.round(s.xp??0)} · Lv ${Math.round(s.level??1)}`:''}${s.specialTrait?` · ${s.specialTrait.label}`:''}</div>
        <div class="traits">${s.specialTrait
          ?renderTraitChip(s.specialTrait)
          :`${renderTraitChip(s.personalityTrait||s.traits?.find(t=>t.group==='personality'))}${renderTraitChip(s.workTrait||s.traits?.find(t=>t.group==='work'))}`
        }</div>
      </div>`).join('')}
    </div>
    ${hired.length>preview.length?`<div class="hs-empty">Showing ${preview.length} of ${hired.length} hired staff.</div>`:''}`;
}

function renderStaffModal(){
  const availableRoles=Object.entries(ROLES).filter(([k])=>isRoleUnlocked(k));
  const nightUnlocked=isNightShiftUnlocked();
  if(!nightUnlocked&&staffShiftFilter!=='day')staffShiftFilter='day';
  if(!isRoleUnlocked(currentTab))currentTab=availableRoles[0]?.[0]||'clerical';
  const pendingRequests=staff.filter(s=>s.hired&&s.raiseRequest&&visibleByShift(s));
  renderCurrentStaffSection();
  const tabs=document.getElementById('staff-tabs');
  document.getElementById('staff-requests').innerHTML=pendingRequests.length?renderRaiseRequestCards(pendingRequests):'';
  tabs.innerHTML=availableRoles.map(([k,v])=>{
    const count=staff.filter(s=>s.hired&&s.role===k&&visibleByShift(s)).length;
    const avail=staffPool.filter(s=>!s.hired&&s.role===k&&visibleByShift(s)).length;
    const active=k===currentTab?'background:var(--color-background-info);color:var(--color-text-info);border-color:var(--color-border-info);':'';
    return`<button onclick="switchTab('${k}')" style="font-size:10px;padding:3px 8px;border:0.5px solid var(--color-border-secondary);border-radius:4px;background:transparent;cursor:pointer;color:var(--color-text-secondary);${active}">${v.label} <span style="color:var(--color-text-success)">${count} hired</span> · <span style="color:var(--color-text-secondary)">${avail} avail</span></button>`;
  }).join('');
  document.getElementById('staff-actions').innerHTML=`<button onclick="setStaffShiftFilter('day')" ${staffShiftFilter==='day'?'style="background:var(--color-background-info);border-color:var(--color-border-info);color:var(--color-text-info)"':''}>Day Staff</button><button onclick="setStaffShiftFilter('night')" ${!nightUnlocked?'disabled':''} ${staffShiftFilter==='night'?'style="background:var(--color-background-info);border-color:var(--color-border-info);color:var(--color-text-info)"':''}>Night Staff</button><button onclick="setStaffShiftFilter('all')" ${!nightUnlocked?'disabled':''} ${staffShiftFilter==='all'?'style="background:var(--color-background-info);border-color:var(--color-border-info);color:var(--color-text-info)"':''}>All</button><button onclick="rerollStaffPool()" ${money<STAFF_REROLL_COST?'disabled':''}>Reroll ${ROLES[currentTab].label} ($${STAFF_REROLL_COST})</button><button onclick="rerollStaffPool(true)" ${money<STAFF_REROLL_COST*2?'disabled':''}>Reroll All Unhired ($${STAFF_REROLL_COST*2})</button>${nightUnlocked?'':'<span class="trait neutral">Night shift unlock: build HR Office + hire HR Manager</span>'}`;
  const pool=staffPool.filter(s=>s.role===currentTab&&visibleByShift(s));
  const hired=staff.filter(s=>s.hired&&s.role===currentTab&&visibleByShift(s));
  const all=[...hired,...pool.filter(s=>!s.hired)];
  document.getElementById('staff-content').innerHTML=all.map(s=>{
    const morale=Math.round(s.morale??100);
    const energy=Math.round(s.energy??100);
    const mood=Math.round(s.mood??100);
    const moraleBadge=getMoraleBadge(morale);
    const supportLabel=getSupportLabel(s.role);
    const personalityTrait=s.personalityTrait||s.traits?.find(t=>t.group==='personality')||null;
    const workTrait=s.workTrait||s.traits?.find(t=>t.group==='work')||null;
    const specialTrait=s.specialTrait||null;
    const assignmentUi=`<div class="traits"><span class="trait neutral">${s.shift} shift</span><span class="trait neutral">${supportLabel}</span>${s.role==='intern'?`<span class="trait neutral">XP ${Math.round(s.xp??0)}</span><span class="trait neutral">Lv ${Math.round(s.level??1)}</span>`:''}</div>`;
    const requestUi=s.hired&&s.raiseRequest
      ?`<div class="request-card"><div class="request-title">Raise request pending</div><div class="request-copy">Requested +$${s.raiseRequest.amount.toLocaleString()}/mo.</div><div class="request-actions"><button class="accept" onclick="acceptRaiseRequest(${s.id})">Accept Raise</button><button class="ignore" onclick="ignoreRaiseRequest(${s.id})">Ignore</button></div></div>`
      :'';
    return`<div class="scard ${s.hired?'hired':''}">
      <div class="sname">${s.name}</div>
      <div class="srole">${ROLES[s.role].label}</div>
      <div class="ssalary">$${s.salary.toLocaleString()}/mo</div>
      ${renderStaffStateChips(s)}
      <div class="traits"><span class="trait neutral">Mood ${mood}</span><span class="trait neutral">Energy ${energy}</span><span class="trait ${moraleBadge}">Morale ${morale}</span></div>
      ${s.specialTrait
        ?`<div class="traits"><span class="trait neutral">${s.role==='medical_director'?'Director Bonus':s.role==='charge_nurse'?'Charge Bonus':s.role==='grant_writer'?'Grant Focus':['gp_doc','er_doc','er_attending','dept_attending','surgeon'].includes(s.role)?'Doctor Trait':s.role==='nurse'?'Nurse Trait':s.role==='janitor'?'Janitor Trait':s.role==='security_officer'?'Security Trait':'Special Trait'}</span></div>${renderAllTraitChips(s)}<div class="traits"><span class="trait neutral" title="${escapeAttr(getTraitEffectText(specialTrait))}">${specialTrait?.desc||'Special support bonus'}</span></div>`
        :`<div class="traits"><span class="trait neutral">Traits</span></div>${renderAllTraitChips(s)}`
      }
      ${s.hired
        ?`${requestUi}${assignmentUi}<button class="fire-btn" onclick="fireStaff(${s.id})">Fire</button>`
        :`<button class="hire-btn" onclick="hireStaff(${s.id})">Hire - $${s.salary.toLocaleString()}/mo</button>`
      }
    </div>`;
  }).join('');
  const shiftLabel=staffShiftFilter==='all'?'All Shifts':`${staffShiftFilter[0].toUpperCase()+staffShiftFilter.slice(1)} Shift`;
  document.getElementById('modal-title').textContent=`Staff - ${ROLES[currentTab].label} (${shiftLabel})`;
}

function switchTab(role){currentTab=role;renderStaffModal();}

function rerollStaffPool(allRoles=false){
  const cost=allRoles?STAFF_REROLL_COST*2:STAFF_REROLL_COST;
  if(!isSandboxMode&&money<cost){addLog('Not enough money to reroll staff candidates.','b');return;}
  const targetRoles=allRoles?Object.keys(ROLES).filter(role=>isRoleUnlocked(role)):[currentTab];
  const targetShifts=allRoles||staffShiftFilter==='all'?getUnlockedShifts():[staffShiftFilter];
  if(!isSandboxMode)changeMoney(-cost);
  staffPool=staffPool.filter(s=>s.hired||!targetRoles.includes(s.role)||!targetShifts.includes(s.shift));
  targetRoles.forEach(role=>{targetShifts.forEach(shift=>{for(let i=0;i<2;i++)staffPool.push(genStaffMember(role,shift));});});
  addLog(allRoles?`Staff agency delivered a full new candidate wave. -$${cost}`:`Rerolled ${ROLES[currentTab].label} candidates. -$${cost}`,'w');
  updateUI();
  renderStaffModal();
}

function hireStaff(id){
  const s=staffPool.find(p=>p.id===id);
  if(!s||s.hired)return;
  if(s.shift==='night'&&!isNightShiftUnlocked())return;
  if(s.role==='medical_director'&&staff.some(member=>member.hired&&member.role==='medical_director')){
    addLog('Only one Medical Director can lead the hospital at a time.','w');
    return;
  }
  s.hired=true;
  staff.push(s);
  dailyStats.rolesHired[s.role]=(dailyStats.rolesHired[s.role]||0)+1;
  staffPool.push(genStaffMember(s.role,s.shift));
  addLog(`Hired ${s.name} (${ROLES[s.role].label}, ${s.shift} shift) at $${s.salary.toLocaleString()}/mo`,'g');
  updateUI();
  renderStaffModal();
}

function fireStaff(id){
  const s=staff.find(p=>p.id===id);
  if(!s)return;
  s.hired=false;
  staff=staff.filter(p=>p.id!==id);
  const idx=staffPool.findIndex(p=>p.id===id);
  if(idx>=0)staffPool.splice(idx,1);
  staffPool.push(genStaffMember(s.role,s.shift));
  addLog(`Fired ${s.name}.`,'b');
  updateUI();
  renderStaffModal();
}

function assignRoom(sid,roomId){
  renderStaffModal();
  updateUI();
}

function renderHiredStaffMenu(){
  const wrap=document.getElementById('hiredstaffmenu');
  if(!wrap)return;
  const hired=staff.filter(s=>s.hired);
  const pendingRequests=hired.filter(s=>s.raiseRequest);
  const dayCount=hired.filter(s=>s.shift==='day').length;
  const nightCount=hired.filter(s=>s.shift==='night').length;
  const roster=hired
    .slice()
    .sort((a,b)=>(a.shift+a.role+a.name).localeCompare(b.shift+b.role+b.name));

  if(!hired.length){
    wrap.innerHTML=`<div class="hs-card"><div class="hs-name">No staff hired yet</div><div class="hs-empty">Hire your first team member to open rooms, cover shifts, and start treating patients.</div></div><button class="panel-btn" onclick="openStaff()">Open Staff Manager</button>`;
    return;
  }

  const roleCounts=hired.reduce((acc,s)=>{
    acc[s.role]=(acc[s.role]||0)+1;
    return acc;
  },{});
  const topRoles=Object.entries(roleCounts)
    .sort((a,b)=>b[1]-a[1]||ROLES[a[0]].label.localeCompare(ROLES[b[0]].label))
    .slice(0,3)
    .map(([role,count])=>`<span class="hs-badge">${ROLES[role].label}: ${count}</span>`)
    .join('');

  wrap.innerHTML=`${pendingRequests.length?`<div class="hs-card"><div class="hs-name">${pendingRequests.length} raise request${pendingRequests.length===1?'':'s'} waiting</div><div class="hs-empty">Low-morale staff are asking for more pay.</div></div>${renderRaiseRequestCards(pendingRequests)}`:''}<div class="hs-summary">
      <div>
        <div class="hs-name">${hired.length} staff on payroll</div>
        <div class="hs-meta">${dayCount} day shift · ${nightCount} night shift</div>
      </div>
      <button class="panel-btn" onclick="openStaff()">Open Staff Manager</button>
    </div>
    <div class="hs-totals">${topRoles}</div>
    <div class="hs-grid">
      ${roster.map(s=>`<div class="hs-card">
        <div class="hs-name">${s.name}</div>
        <div class="hs-role">${ROLES[s.role].label}</div>
        <div class="hs-meta">${s.shift[0].toUpperCase()+s.shift.slice(1)} shift · Energy ${Math.round(s.energy??100)} · Morale ${Math.round(s.morale??100)}${s.role==='intern'?` · XP ${Math.round(s.xp??0)} · Lv ${Math.round(s.level??1)}`:''}${s.specialTrait?` · ${s.specialTrait.label}`:''}</div>
        <div class="traits">${s.specialTrait
          ?renderTraitChip(s.specialTrait)
          :`${renderTraitChip(s.personalityTrait||s.traits?.find(t=>t.group==='personality'))}${renderTraitChip(s.workTrait||s.traits?.find(t=>t.group==='work'))}`
        }</div>
      </div>`).join('')}
    </div>`;
}
