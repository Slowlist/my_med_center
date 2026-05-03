// Staff UI and room assignment logic live here so the hiring flow stays isolated.
function getMoraleBadge(morale){
  if(morale>=70)return 'good';
  if(morale>=40)return 'neutral';
  return 'bad';
}

// ── Trait display helpers ──────────────────────────────────────────────────────

function getTraitBadgeClass(trait){
  if(!trait)return 'neutral';
  if(trait.type==='positive')return 'good';
  if(trait.type==='negative')return 'bad';
  if(trait.type==='job'){
    if(trait.tone==='good')return 'good';
    if(trait.tone==='bad')return 'bad';
    return 'neutral';
  }
  // legacy fallback
  if(trait.group==='director'||trait.group==='charge')return 'good';
  if(trait.tone==='good')return 'good';
  if(trait.tone==='bad')return 'bad';
  if(['calm','friendly','careful','mentor','fast_worker','experienced'].includes(trait.id))return 'good';
  if(['difficult','burnout_risk','sloppy'].includes(trait.id))return 'bad';
  return 'neutral';
}

function getTraitIcon(trait){
  if(!trait)return '•';
  if(trait.icon)return trait.icon;
  // legacy id-based fallback
  const icons={
    calm:'🧘',difficult:'😡',ambitious:'💰',friendly:'🙂',burnout_risk:'🔥',
    fast_worker:'⚡',careful:'🛡️',sloppy:'⚠️',mentor:'🧠',learner:'📘',
    experienced:'🌟',clinical_vision:'🏥',patient_champion:'⭐',
    operations_titan:'🔧',grant_magnet:'💎',
  };
  return icons[trait.id]||'•';
}

function getTraitEffectText(trait){
  if(!trait)return 'No trait effect.';
  if(trait.desc)return trait.desc;
  const texts={
    calm:'Handles stressful days with less morale loss.',
    difficult:'Creates more workplace friction and chaos.',
    ambitious:'Pushes harder for output and revenue.',
    friendly:'Patients leave happier after treatment.',
    burnout_risk:'Loses energy faster under pressure.',
    fast_worker:'Finishes treatment faster.',
    careful:'Works cleanly and steadily.',
    sloppy:'More likely to cause treatment setbacks.',
    mentor:'Helps interns gain experience faster.',
    learner:'Improves faster over time.',
    experienced:'Gives a small permanent speed boost.',
  };
  return texts[trait.id]||'Trait effect active.';
}

function escapeAttr(text){
  return String(text||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderTraitChip(trait){
  if(!trait)return '';
  return `<span class="trait ${getTraitBadgeClass(trait)}" data-tt-trait="${trait.id}" tabindex="0">${getTraitIcon(trait)} ${trait.label}</span>`;
}

function getTraitTypeLabel(trait){
  if(!trait)return '';
  if(trait.type==='positive')return '+ Strength';
  if(trait.type==='negative')return '− Flaw';
  if(trait.type==='job')return '⚕ Role';
  // legacy
  if(trait.group==='director'||trait.group==='charge'||trait.group==='grant_writer')return '⚕ Role';
  return '⚕ Role';
}

function renderAllTraitChips(staffMember){
  const traits=staffMember.traits||[];
  if(!traits.length)return '';
  return `<div class="traits trait-row-3">
    ${traits.map(t=>`<span class="trait-slot">
      <span class="trait-type-label">${getTraitTypeLabel(t)}</span>
      ${renderTraitChip(t)}
    </span>`).join('')}
  </div>`;
}

// ── Staff state helpers ───────────────────────────────────────────────────────

function renderStaffStateChips(member){
  const chips=[renderStatusChip(member.hired?'Operational':'Available',member.hired?'operational':'info')];
  if((member.energy??100)<45)chips.push(renderStatusChip('Low Energy','low-energy'));
  if(member.state==='on_break')chips.push(renderStatusChip('On Break','needs-staff'));
  if(member.state==='on_vacation')chips.push(renderStatusChip('Vacation','info'));
  if((member.returnBoostDays??0)>0)chips.push(renderStatusChip('Refreshed','operational'));
  if(member.raiseRequest)chips.push(renderStatusChip('Raise Requested','active-contract'));
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
  // amount is in effective dollars; convert back to base salary to avoid double-applying
  // the level multiplier via effectiveSalary() at payroll time.
  const mult=member.salaryMultiplier||1;
  member.salary+=Math.round(amount/mult);
  member.morale=clamp((member.morale??100)+12,0,100);
  member.quitRiskDays=0;
  member.raiseCooldown=12;
  member.raiseRequest=null;
  addLog(`Issued a discretionary raise for ${member.name}. +$${amount.toLocaleString()}/mo.`,'g');
  showToast('Raise issued','good');
  updateUI();
}
function sendStaffOnBreak(id){
  const member=staff.find(s=>s.hired&&s.id===id);
  if(!member||member.state==='on_vacation')return;
  member.state='on_break';
  member.active=false;
  addLog(`${member.name} was sent on break.`,'w');
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
  addLog(`${member.name} was approved for ${member.vacationDays} days of vacation by ${approvedBy==='hr'?'HR':'management'}.`,'g');
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
        const tier=(typeof getLevelTier==='function')?getLevelTier(member.level||1):null;
        const eff=(typeof effectiveSalary==='function')?effectiveSalary(member):member.salary;
        const xp=Math.max(0,Math.round(member.xp||0));
        const xpNext=Math.max(1,Math.round(member.xpToNext||0));
        const xpPct=Math.min(100,Math.round((xp/xpNext)*100));
        const mult=member.salaryMultiplier||1;
        const negPct=Math.round((member.negativeTraitStrength??1)*100);
        const negTrait=member.negativeTrait;
        const perks=(member.extraPerks||[]).map(p=>`<span class="trait good">${p.label||p.id}</span>`).join('');
        return `<div class="staff-manage-card">
          <div class="staff-manage-top">
            <div>
              <div class="hs-name">${member.name}</div>
              <div class="hs-role">${ROLES[member.role].label}${tier?` · <span class="hs-tier">Lv ${member.level||1} ${tier.title}</span>`:''}</div>
            </div>
            <div class="hs-meta">${member.shift[0].toUpperCase()+member.shift.slice(1)} shift</div>
          </div>
          ${renderStaffStateChips(member)}
          ${tier?(tier.xpToNext>0?`<div class="xp-bar" title="XP ${xp}/${xpNext}"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div>`:`<div class="hs-meta">Max level reached</div>`):''}
          <div class="hs-meta">Salary $${Math.round(eff).toLocaleString()}/mo${mult!==1?` <span class="hs-mult">(×${mult.toFixed(2)})</span>`:''}${negTrait?` · Flaw: ${negTrait.label} (${negPct}% impact)`:''}</div>
          <div class="hs-meta">Mood ${Math.round(member.mood??100)} · Energy ${Math.round(member.energy??100)} · Morale ${Math.round(member.morale??100)}</div>
          ${perks?`<div class="staff-needs-row">${perks}</div>`:''}
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
  if(role==='intern')return 'Cheap support – gains XP and slowly boosts clinical speed';
  if(role==='security_officer')return 'Security support – lowers chaos risk';
  if(role==='grant_writer')return 'Administrative support – manages grant funding programs';
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
  addLog(reason||`${member.name} quit.`,'b');
  showToast(`${member.name} quit`,'warn');
  updateUI();
}

function acceptRaiseRequest(id){
  const member=staff.find(s=>s.hired&&s.id===id&&s.raiseRequest);
  if(!member)return;
  const amount=member.raiseRequest.amount||0;
  // Convert effective-dollar raise back to base so payroll's effectiveSalary() doesn't double-multiply.
  const mult=member.salaryMultiplier||1;
  member.salary+=Math.round(amount/mult);
  member.morale=clamp((member.morale??100)+14,0,100);
  member.quitRiskDays=0;
  member.raiseCooldown=12;
  member.raiseRequest=null;
  addLog(`Accepted a raise for ${member.name}. Salary increased by $${amount.toLocaleString()} and morale improved.`,'g');
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
  addLog(`Ignored ${member.name}'s raise request. Morale fell and they may quit if things do not improve.`,'w');
  showToast('Raise request ignored','warn');
  updateUI();
}

// ── Hired staff panel (dashboard) ─────────────────────────────────────────────

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
      ${preview.map(s=>{
        const positive=s.positiveTrait||s.personalityTrait;
        const job=s.jobTrait||s.specialTrait;
        const negative=s.negativeTrait;
        const tier=(typeof getLevelTier==='function')?getLevelTier(s.level):null;
        const eff=(typeof effectiveSalary==='function')?effectiveSalary(s):s.salary;
        const negPct=Math.round(((s.negativeTraitStrength??1))*100);
        const xpPct=tier&&tier.xpToNext>0?Math.min(100,Math.round((s.xp||0)/tier.xpToNext*100)):100;
        const xpBar=`<div class="xp-bar"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div>`;
        return `<div class="hs-card">
        <div class="hs-name">${s.name}</div>
        <div class="hs-role">${ROLES[s.role].label}${tier?` · <span class="hs-tier">Lv ${s.level} ${tier.title}</span>`:''}</div>
        ${renderStaffStateChips(s)}
        <div class="hs-meta">${s.shift[0].toUpperCase()+s.shift.slice(1)} shift · Energy ${Math.round(s.energy??100)} · Morale ${Math.round(s.morale??100)}</div>
        <div class="hs-meta">Salary $${eff.toLocaleString()}/mo${(s.salaryMultiplier||1)!==1?` <span class="hs-mult">(×${(s.salaryMultiplier||1).toFixed(2)})</span>`:''}</div>
        ${tier&&tier.xpToNext>0?`<div class="hs-meta">XP ${Math.round(s.xp||0)} / ${tier.xpToNext}</div>${xpBar}`:`<div class="hs-meta">Max level reached</div>`}
        <div class="traits">
          ${job?renderTraitChip(job):''}
          ${positive?renderTraitChip(positive):''}
          ${negative?`${renderTraitChip(negative)}<span class="trait neutral">${negPct}% impact</span>`:''}
          ${(s.extraPerks||[]).map(p=>renderTraitChip(p)).join('')}
        </div>
      </div>`;
      }).join('')}
    </div>
    ${hired.length>preview.length?`<div class="hs-empty">Showing ${preview.length} of ${hired.length} hired staff.</div>`:''}`;
}

// ── Full staff modal ───────────────────────────────────────────────────────────

function _buildStaffCard(s,searchMode){
  const morale=Math.round(s.morale??100);
  const energy=Math.round(s.energy??100);
  const mood=Math.round(s.mood??100);
  const moraleBadge=getMoraleBadge(morale);
  const supportLabel=getSupportLabel(s.role);
  const positiveTrait=s.positiveTrait||s.personalityTrait||null;
  const jobTrait=s.jobTrait||s.specialTrait||null;
  const negativeTrait=s.negativeTrait||null;
  const tier=(typeof getLevelTier==='function')?getLevelTier(s.level):null;
  const eff=(typeof effectiveSalary==='function')?effectiveSalary(s):s.salary;
  const negPct=Math.round(((s.negativeTraitStrength??1))*100);
  const xpPct=tier&&tier.xpToNext>0?Math.min(100,Math.round((s.xp||0)/tier.xpToNext*100)):100;
  const xpBar=tier&&tier.xpToNext>0?`<div class="xp-bar"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div><div class="hs-meta">XP ${Math.round(s.xp||0)} / ${tier.xpToNext}</div>`:'<div class="hs-meta">Max level reached</div>';
  const levelLine=tier?`<div class="traits"><span class="trait good">Lv ${s.level} · ${tier.title}</span>${(s.salaryMultiplier||1)!==1?`<span class="trait neutral">×${(s.salaryMultiplier||1).toFixed(2)} pay</span>`:''}</div>`:'';
  const perksLine=(s.extraPerks||[]).length?`<div class="traits"><span class="trait-block-label">Earned Perks</span>${s.extraPerks.map(p=>renderTraitChip(p)).join('')}</div>`:'';
  const assignmentUi=`<div class="traits"><span class="trait neutral">${s.shift} shift</span><span class="trait neutral">${supportLabel}</span></div>`;
  const requestUi=s.hired&&s.raiseRequest
    ?`<div class="request-card"><div class="request-title">Raise request pending</div><div class="request-copy">Requested +$${s.raiseRequest.amount.toLocaleString()}/mo.</div><div class="request-actions"><button class="accept" onclick="acceptRaiseRequest(${s.id})">Accept Raise</button><button class="ignore" onclick="ignoreRaiseRequest(${s.id})">Ignore</button></div></div>`
    :'';
  const roleLabel=searchMode?`<div class="srole" style="color:var(--color-text-info);font-weight:700">${ROLES[s.role]?.label||s.role}</div>`:`<div class="srole">${ROLES[s.role]?.label||s.role}</div>`;
  return`<div class="scard ${s.hired?'hired':''}${searchMode?' search-match':''}">
    <div class="sname">${s.name}</div>
    ${roleLabel}
    <div class="ssalary">$${eff.toLocaleString()}/mo${(s.salaryMultiplier||1)!==1?` <span class="hs-mult">(base $${s.salary.toLocaleString()})</span>`:''}</div>
    ${levelLine}
    ${xpBar}
    ${renderStaffStateChips(s)}
    <div class="traits"><span class="trait neutral">Mood ${mood}</span><span class="trait neutral">Energy ${energy}</span><span class="trait ${moraleBadge}">Morale ${morale}</span></div>
    <div class="trait-block">
      ${positiveTrait?`<div class="trait-block-row"><span class="trait-block-label">Strength</span>${renderTraitChip(positiveTrait)}<span class="trait-block-desc">${escapeAttr(getTraitEffectText(positiveTrait))}</span></div>`:''}
      ${jobTrait?`<div class="trait-block-row"><span class="trait-block-label">Role Trait</span>${renderTraitChip(jobTrait)}<span class="trait-block-desc">${escapeAttr(getTraitEffectText(jobTrait))}</span></div>`:''}
      ${negativeTrait?`<div class="trait-block-row"><span class="trait-block-label">Flaw</span>${renderTraitChip(negativeTrait)}<span class="trait-block-desc">${escapeAttr(getTraitEffectText(negativeTrait))} · ${negPct}% impact</span></div>`:''}
    </div>
    ${perksLine}
    ${s.hired
      ?`${requestUi}${assignmentUi}<button class="fire-btn" onclick="fireStaff(${s.id})">Fire</button>`
      :`<button class="hire-btn" onclick="hireStaff(${s.id})">Hire - $${eff.toLocaleString()}/mo</button>`
    }
  </div>`;
}

function renderStaffModal(){
  const availableRoles=Object.entries(ROLES).filter(([k])=>isRoleUnlocked(k));
  const nightUnlocked=isNightShiftUnlocked();
  if(!nightUnlocked&&staffShiftFilter!=='day')staffShiftFilter='day';
  if(!isRoleUnlocked(currentTab))currentTab=availableRoles[0]?.[0]||'clerical';
  const pendingRequests=staff.filter(s=>s.hired&&s.raiseRequest&&visibleByShift(s));
  renderCurrentStaffSection();
  const tabs=document.getElementById('staff-tabs');
  const statusEl=document.getElementById('staff-search-status');
  document.getElementById('staff-requests').innerHTML=pendingRequests.length?renderRaiseRequestCards(pendingRequests):'';
  document.getElementById('staff-actions').innerHTML=`<button onclick="setStaffShiftFilter('day')" ${staffShiftFilter==='day'?'style="background:var(--color-background-info);border-color:var(--color-border-info);color:var(--color-text-info)"':''}>Day Staff</button><button onclick="setStaffShiftFilter('night')" ${!nightUnlocked?'disabled':''} ${staffShiftFilter==='night'?'style="background:var(--color-background-info);border-color:var(--color-border-info);color:var(--color-text-info)"':''}>Night Staff</button><button onclick="setStaffShiftFilter('all')" ${!nightUnlocked?'disabled':''} ${staffShiftFilter==='all'?'style="background:var(--color-background-info);border-color:var(--color-border-info);color:var(--color-text-info)"':''}>All</button><button onclick="rerollStaffPool()" ${money<STAFF_REROLL_COST?'disabled':''}>Reroll ${ROLES[currentTab].label} ($${STAFF_REROLL_COST})</button><button onclick="rerollStaffPool(true)" ${money<STAFF_REROLL_COST*2?'disabled':''}>Reroll All Unhired ($${STAFF_REROLL_COST*2})</button>${nightUnlocked?'':'<span class="trait neutral">Night shift unlock: build HR Office + hire HR Manager</span>'}`;

  const q=(staffTraitFilter||'').trim();
  if(q){
    // ── Search mode: cross-role, shift-filtered ──────────────────────────────
    const allVisible=[
      ...staff.filter(s=>s.hired&&visibleByShift(s)),
      ...staffPool.filter(s=>!s.hired&&visibleByShift(s))
    ];
    const matches=allVisible.filter(s=>staffMatchesTraitFilter(s,q));
    const roleSet=new Set(matches.map(s=>s.role));
    const hiredMatches=matches.filter(s=>s.hired).length;
    const availMatches=matches.filter(s=>!s.hired).length;
    if(statusEl){
      if(matches.length){
        statusEl.className='staff-search-status has-results';
        statusEl.textContent=`${matches.length} match${matches.length!==1?'es':''} across ${roleSet.size} role${roleSet.size!==1?'s':''} · ${hiredMatches} hired · ${availMatches} available`;
      }else{
        statusEl.className='staff-search-status no-results';
        statusEl.textContent='No candidates found matching that trait or keyword.';
      }
    }
    tabs.innerHTML='';
    document.getElementById('modal-title').textContent='Staff Search Results';
    document.getElementById('staff-content').innerHTML=matches.length
      ?matches.map(s=>_buildStaffCard(s,true)).join('')
      :'<div class="staff-search-empty">No hired or available candidates match that search.<br>Try a shorter keyword — <em>mentor</em>, <em>fast</em>, <em>error</em>, <em>morale</em>.</div>';
  }else{
    // ── Normal tab mode ──────────────────────────────────────────────────────
    if(statusEl){statusEl.className='staff-search-status';statusEl.textContent='';}
    tabs.innerHTML=availableRoles.map(([k,v])=>{
      const count=staff.filter(s=>s.hired&&s.role===k&&visibleByShift(s)).length;
      const avail=staffPool.filter(s=>!s.hired&&s.role===k&&visibleByShift(s)).length;
      const active=k===currentTab?'background:var(--color-background-info);color:var(--color-text-info);border-color:var(--color-border-info);':'';
      return`<button onclick="switchTab('${k}')" style="font-size:10px;padding:3px 8px;border:0.5px solid var(--color-border-secondary);border-radius:4px;background:transparent;cursor:pointer;color:var(--color-text-secondary);${active}">${v.label} <span style="color:var(--color-text-success)">${count} hired</span> · <span style="color:var(--color-text-secondary)">${avail} avail</span></button>`;
    }).join('');
    const pool=staffPool.filter(s=>s.role===currentTab&&visibleByShift(s));
    const hired=staff.filter(s=>s.hired&&s.role===currentTab&&visibleByShift(s));
    const all=[...hired,...pool.filter(s=>!s.hired)];
    document.getElementById('staff-content').innerHTML=all.map(s=>_buildStaffCard(s,false)).join('');
    const shiftLabel=staffShiftFilter==='all'?'All Shifts':`${staffShiftFilter[0].toUpperCase()+staffShiftFilter.slice(1)} Shift`;
    document.getElementById('modal-title').textContent=`Staff - ${ROLES[currentTab].label} (${shiftLabel})`;
  }
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
  addLog(`Fired ${s.name} (${ROLES[s.role].label}).`,'w');
  showToast(`${s.name} fired`,'warn');
  updateUI();
  renderStaffModal();
}
