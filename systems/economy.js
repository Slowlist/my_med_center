// Economy owns persistence, monthly grading, wages, and random financial swings.
// Save schema version. Bump whenever serializeGame's shape changes meaningfully.
// All loads route through migrateSaveData to upgrade older saves to this version,
// applying safe defaults for fields added since the save was written.
const CURRENT_SAVE_VERSION=2;
// Versioned migration table: each entry upgrades a save from version N to N+1.
// Migrations should ONLY add safe defaults — never destructive. Returning the
// (possibly mutated) data object is required.
const SAVE_MIGRATIONS={
  1:function(d){
    // v1 → v2: features added since v1 (Asherville agreement, delegation, active
    // event effects, renovations, executives, board, identities, eventMemory,
    // floor specs). All consumers already null-coalesce, so we just guarantee
    // the keys exist on the data object so downstream code can read them safely.
    if(!d.floorSpecializations||typeof d.floorSpecializations!=='object')d.floorSpecializations={};
    if(!d.floorRenovations||typeof d.floorRenovations!=='object')d.floorRenovations={};
    if(!d.eventStats||typeof d.eventStats!=='object')d.eventStats={};
    if(!d.eventMemory||typeof d.eventMemory!=='object')d.eventMemory={};
    if(!Array.isArray(d.boardMembers))d.boardMembers=[];
    if(!Array.isArray(d.grantOffers))d.grantOffers=[];
    if(!Array.isArray(d.insuranceContracts))d.insuranceContracts=[];
    if(!Array.isArray(d.researchedTech))d.researchedTech=[];
    if(!Array.isArray(d.unlockedFeatures))d.unlockedFeatures=[];
    if(!Array.isArray(d.unlockedIdentities))d.unlockedIdentities=[];
    if(!Array.isArray(d.researchMilestonesFired))d.researchMilestonesFired=[];
    if(!Array.isArray(d.researchLog))d.researchLog=[];
    if(!Array.isArray(d.staff))d.staff=[];
    if(!Array.isArray(d.staffPool))d.staffPool=[];
    if(!Array.isArray(d.rooms))d.rooms=[];
    if(!Array.isArray(d.dispatchJobs))d.dispatchJobs=[];
    if(!Array.isArray(d.statsHistory))d.statsHistory=[];
    if(!d.dailyStats||typeof d.dailyStats!=='object')d.dailyStats={treated:0,gpVisits:0,roomsBuilt:0,rolesHired:{},cleanDays:0};
    return d;
  }
};
// Run versioned migrations until the data is at CURRENT_SAVE_VERSION.
// Logs once per upgrade so the dev console clearly shows what happened.
function migrateSaveData(data){
  if(!data||typeof data!=='object')return data;
  const startVersion=Number(data.version)||1;
  let v=startVersion;
  while(v<CURRENT_SAVE_VERSION&&typeof SAVE_MIGRATIONS[v]==='function'){
    try{
      data=SAVE_MIGRATIONS[v](data)||data;
    }catch(err){
      console.error(`Save migration ${v}→${v+1} failed:`,err);
      // Continue — applyGameData's null-coalescing defaults will still cover gaps.
    }
    v++;
    data.version=v;
  }
  if(v!==startVersion){
    console.log(`Migrated save from version ${startVersion} to version ${v}.`);
  }
  return data;
}
// Lightweight sanity check. Returns {ok:true} or {ok:false, reason:'...'}.
// Anything serious enough to crash render() should be caught here so loadGame
// can show a friendly message instead of throwing into the void.
function validateSaveData(data){
  if(!data||typeof data!=='object')return{ok:false,reason:'Save file is empty or not an object.'};
  // grid/floorGrids may be missing on very old saves — applyGameData handles
  // both. We just check that what's present has the right shape.
  if(data.floorGrids!==undefined&&!Array.isArray(data.floorGrids))return{ok:false,reason:'Floor grid data is malformed.'};
  if(data.grid!==undefined&&!Array.isArray(data.grid))return{ok:false,reason:'Hospital grid data is malformed.'};
  if(data.rooms!==undefined&&!Array.isArray(data.rooms))return{ok:false,reason:'Room list is malformed.'};
  if(data.staff!==undefined&&!Array.isArray(data.staff))return{ok:false,reason:'Staff list is malformed.'};
  if(data.day!==undefined&&!Number.isFinite(Number(data.day)))return{ok:false,reason:'Day counter is invalid.'};
  if(data.money!==undefined&&!Number.isFinite(Number(data.money)))return{ok:false,reason:'Cash balance is invalid.'};
  return{ok:true};
}
function serializeGame(){
  return{
    version:CURRENT_SAVE_VERSION,
    savedAt:Date.now(),
      customCenterName,
      hospitalStage,
      money,day,score,totalTreated,researchPoints,monthlyInc,incAccum,reputation,cleanliness,stress,adReach,
      floorGrids,floorSpecializations,floorSpecVersion:3,floorPanelHidden,floorPanelPosition,currentFloor,floorRenovations,auditoriumCrowdingDays,prisonerWingActive,grid,rooms,patients,staff,staffPool,logs,
    selTool,gameTime,speed,paused,patId,staffId,zoom,buildMode,
    currentTab,debtDays,debtFreeDays,winStabilityDays,lowRepDays,dirtyDays,highStressDays,gameOver,loseReason,runOutcome,
    tutorialActive,tutorialStep,tutorialCompleted,
    softGuideDismissed,
    unlockedTools:[...unlockedTools],
    unlockedRoles:[...unlockedRoles],
    unlockedMilestones:[...unlockedMilestones],
    researchedTech:[...researchedTech],
    unlockedFeatures:[...unlockedFeatures],
    unlockedIdentities:typeof unlockedIdentities!=='undefined'?[...unlockedIdentities]:[],
    activeResearch,
    researchLog:Array.isArray(researchLog)?researchLog:[],
    researchMilestonesFired:[...researchMilestonesFired],
    dispatchJobs,dispatchJobId,
    hasStarted,gradeIndex,gradeNote,
    monthRepAccum,monthCleanAccum,monthWaitAccum,monthSamples,monthDebtDays,monthHighWaitDays,
    budgetMonthIncome,budgetMonthExpenses,budgetMonthStartDay,
    departments,
    techTree,
    govRequired,govTreated,totalPatients,totalPublicCareTreated,
    recentAuditFailureDays,
    currentCEO,boardMembers,ceoLegacyCooldown,
    grantOffers,
    contractOffer,activeContract,lastContractId,insuranceContracts,freeBuildCredits,
    dailyGoal,dailyStats,staffShiftFilter,eventStats,eventMemory,
    specialtyServiceStats,
    statsHistory,
    selectedDifficulty,
    selectedCampusId
  };
}
function makeSaveFilename(){
  const safeName=(customCenterName||'my-medical-center')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')||'my-medical-center';
  return `${safeName}-day-${day}.mmcsave`;
}
function exportSaveFile(){
  if(typeof Blob==='undefined'||typeof URL==='undefined'||typeof document==='undefined')return false;
  try{
    const blob=new Blob([JSON.stringify(serializeGame(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=makeSaveFilename();
    link.style.display='none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return true;
  }catch(err){
    console.error(err);
    return false;
  }
}
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(serializeGame()));
    const exported=exportSaveFile();
    document.getElementById('hint').textContent=exported
      ?`Game saved and exported as ${makeSaveFilename()}.`
      :`Game saved to local storage on day ${day}.`;
    addLog(exported?'Game saved and exported to a save file.':'Game saved to local storage.','g');
  }catch(err){
    console.error(err);
    document.getElementById('hint').textContent='Save failed. Local storage may be unavailable.';
    addLog('Save failed. Local storage may be unavailable.','b');
  }
}
const AUTO_SAVE_INTERVAL_DAYS=1;
const SETTINGS_KEY='mmcSettings';
let lastAutoSaveDay=0;
let settingsAutoSaveEnabled=true;
let settingsToastFrequency=5;
function loadSettings(){
  try{
    const raw=localStorage.getItem(SETTINGS_KEY);
    if(!raw)return;
    const s=JSON.parse(raw);
    if(typeof s.autoSaveEnabled==='boolean')settingsAutoSaveEnabled=s.autoSaveEnabled;
    if([0,1,5,10,30].includes(s.toastFrequency))settingsToastFrequency=s.toastFrequency;
  }catch(e){}
}
function persistSettings(){
  try{
    localStorage.setItem(SETTINGS_KEY,JSON.stringify({autoSaveEnabled:settingsAutoSaveEnabled,toastFrequency:settingsToastFrequency}));
  }catch(e){}
}
function autoSave(){
  if(!settingsAutoSaveEnabled)return;
  if(!hasStarted||gameOver)return;
  if(day-lastAutoSaveDay<AUTO_SAVE_INTERVAL_DAYS)return;
  lastAutoSaveDay=day;
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(serializeGame()));
    const freq=settingsToastFrequency;
    if(freq>0&&day%freq===0&&typeof showToast==='function'){
      showToast(`\u{1F4BE} Auto-saved \u2014 Day ${day}`,'good');
    }
  }catch(err){
    console.error('Auto-save failed:',err);
  }
}
function openSettings(){
  loadSettings();
  renderSettingsPanel();
  document.getElementById('settingsmodal').classList.add('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}
function closeSettings(){
  document.getElementById('settingsmodal').classList.remove('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}
function renderSettingsPanel(){
  const panel=document.getElementById('settings-panel');
  if(!panel)return;
  panel.innerHTML=`
    <div class="settings-section">
      <div class="settings-row">
        <div class="settings-label-group">
          <div class="settings-label">Auto-Save</div>
          <div class="settings-desc">Saves your hospital to browser storage every in-game day.</div>
        </div>
        <button class="settings-toggle ${settingsAutoSaveEnabled?'on':''}" id="autosave-toggle" onclick="settingsToggleAutoSave()" aria-pressed="${settingsAutoSaveEnabled}">
          <span class="settings-toggle-knob"></span>
        </button>
      </div>
    </div>
    <div class="settings-section" id="toast-freq-section" style="${settingsAutoSaveEnabled?'':'opacity:0.45;pointer-events:none'}">
      <div class="settings-sublabel">Notification frequency</div>
      <div class="settings-desc">Show a save confirmation toast every N days (or never).</div>
      <div class="settings-chip-row" id="toast-freq-chips">
        ${[1,5,10,30,0].map(v=>`<button class="settings-chip${settingsToastFrequency===v?' active':''}" onclick="settingsSetFreq(${v})">${v===0?'Never':'Every '+v+(v===1?' day':' days')}</button>`).join('')}
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-sublabel">Sound</div>
      <div class="settings-desc">Drop matching WAV/MP3 files into the <code>audio/</code> folder to enable. Missing files are silently skipped.</div>
      <div class="settings-row">
        <div class="settings-label-group">
          <div class="settings-label">Mute all sound</div>
        </div>
        <button class="settings-toggle ${window.sound&&window.sound.isMuted()?'on':''}" id="sound-mute-toggle" onclick="settingsToggleMute()" aria-pressed="${window.sound&&window.sound.isMuted()}">
          <span class="settings-toggle-knob"></span>
        </button>
      </div>
      ${['master','ui','alerts','ambience'].map(ch=>{
        const v=Math.round(((window.sound&&window.sound.getVolume(ch))||0)*100);
        return`<div class="settings-row sound-vol-row">
          <div class="settings-label-group">
            <div class="settings-label">${ch[0].toUpperCase()+ch.slice(1)} volume</div>
            <div class="settings-desc"><span id="sound-vol-${ch}-val">${v}%</span></div>
          </div>
          <input type="range" min="0" max="100" value="${v}" class="settings-slider" oninput="settingsSetVolume('${ch}',this.value)">
        </div>`;
      }).join('')}
    </div>
    <div class="settings-status" id="settings-status"></div>
  `;
}
function settingsToggleMute(){
  if(!window.sound)return;
  window.sound.setMuted(!window.sound.isMuted());
  renderSettingsPanel();
}
function settingsSetVolume(channel,val){
  if(!window.sound)return;
  const v=Math.max(0,Math.min(1,Number(val)/100));
  window.sound.setVolume(channel,v);
  const lbl=document.getElementById(`sound-vol-${channel}-val`);
  if(lbl)lbl.textContent=Math.round(v*100)+'%';
  // Light feedback ping on the channel so the slider feels responsive.
  if(channel==='ui')window.sound.playSound('button_click');
  else if(channel==='alerts')window.sound.playSound('warning');
  else if(channel==='ambience')window.sound.playSound('patient_treated');
}
function settingsToggleAutoSave(){
  settingsAutoSaveEnabled=!settingsAutoSaveEnabled;
  persistSettings();
  renderSettingsPanel();
}
function settingsSetFreq(val){
  settingsToastFrequency=val;
  persistSettings();
  renderSettingsPanel();
  const status=document.getElementById('settings-status');
  if(status){
    status.textContent=val===0?'Notifications silenced.':'Notifications set to every '+val+(val===1?' day.':' days.');
    setTimeout(()=>{if(status)status.textContent='';},2000);
  }
}
loadSettings();

function makeSparklineSVG(values,color,id){
  if(!values||values.length<2)return`<svg class="spark-svg" viewBox="0 0 200 54" preserveAspectRatio="none"></svg>`;
  const mn=Math.min(...values),mx=Math.max(...values),range=mx-mn||1;
  const w=200,h=54,pad=4;
  const pts=values.map((v,i)=>{
    const x=pad+(i/(values.length-1))*(w-pad*2);
    const y=h-pad-((v-mn)/range)*(h-pad*2);
    return`${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pstr=pts.join(' ');
  const[lx,ly]=pts[pts.length-1].split(',');
  const gid=`sg_${id}`;
  return`<svg class="spark-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.25"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs><polygon points="${pstr} ${lx},${h} ${pad},${h}" fill="url(#${gid})"/><polyline points="${pstr}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="3.5" fill="${color}"/></svg>`;
}
function makeStatCard(label,values,color,id,fmt){
  if(!values||values.length===0)return`<div class="stat-card"><div class="stat-card-label">${label}</div><div class="stat-card-value">—</div><div class="stat-no-data">Play a few days to see data.</div></div>`;
  const cur=values[values.length-1];
  const prev=values.length>1?values[values.length-2]:cur;
  const delta=cur-prev;
  const arrow=delta>0?'▲':delta<0?'▼':'•';
  const ac=delta>0?'trend-up':delta<0?'trend-dn':'trend-flat';
  const mn=Math.min(...values),mx=Math.max(...values);
  return`<div class="stat-card" style="--sc:${color}"><div class="stat-card-label">${label}</div><div class="stat-card-top"><span class="stat-card-value">${fmt(cur)}</span><span class="stat-trend ${ac}">${arrow}</span></div>${makeSparklineSVG(values,color,id)}<div class="stat-card-range"><span>${fmt(mn)}</span><span class="stat-range-sep">range</span><span>${fmt(mx)}</span></div></div>`;
}
function openStats(){
  document.getElementById('statsmodal').classList.add('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
  renderStatsPanel();
}
function closeStats(){
  document.getElementById('statsmodal').classList.remove('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}
function renderStatsPanel(){
  const panel=document.getElementById('stats-panel');
  if(!panel)return;
  const h=statsHistory;
  const fmtD=v=>'$'+Math.round(v).toLocaleString();
  const fmtP=v=>Math.round(v)+'%';
  const fmtN=v=>Math.round(v).toLocaleString();
  panel.innerHTML=`<div class="stats-grid">${makeStatCard('Cash Balance',h.map(s=>s.money),'#22c55e','money',fmtD)}${makeStatCard('Daily Revenue',h.map(s=>s.income),'#3b82f6','income',fmtD)}${makeStatCard('Reputation',h.map(s=>s.rep),'#a855f7','rep',fmtP)}${makeStatCard('Cleanliness',h.map(s=>s.clean),'#14b8a6','clean',fmtP)}${makeStatCard('Staff Stress',h.map(s=>s.stress),'#f97316','stress',fmtP)}${makeStatCard('Patients Treated',h.map(s=>s.treated),'#f59e0b','treated',fmtN)}</div><p class="stats-footnote">Showing up to the last 90 days of play.</p>`;
}

function applyGameData(data,sourceLabel){
  // Validate shape and migrate to the current schema before reading fields.
  // Both helpers are defensive — malformed/legacy saves never reach the
  // assignment block below without first being normalized to a safe shape.
  const _check=validateSaveData(data);
  if(!_check.ok){
    console.error('Save validation failed:',_check.reason);
    if(typeof document!=='undefined'){
      const hint=document.getElementById('hint');
      if(hint)hint.textContent=`Load failed: ${_check.reason} The save file may be corrupted.`;
    }
    if(typeof addLog==='function'&&Array.isArray(logs)&&logs.length){
      addLog(`Load failed: ${_check.reason}`,'b');
    }
    return false;
  }
  data=migrateSaveData(data);
  customCenterName=sanitizeCustomCenterName(data.customCenterName);
  hospitalStage=data.hospitalStage??'clinic';
  money=data.money??STARTING_CASH;
  day=data.day??1;
  score=data.score??0;
  totalTreated=data.totalTreated??0;
  researchPoints=data.researchPoints??0;
  monthlyInc=data.monthlyInc??0;
  incAccum=data.incAccum??0;
  reputation=data.reputation??70;
  cleanliness=data.cleanliness??78;
  stress=data.stress??0;
  adReach=data.adReach??0;
  // Restore campus FIRST so COLS/ROWS/buildableMask align before grids/rooms apply
  if(typeof applyCampus==='function'){
    const _cid=(data.selectedCampusId&&CAMPUSES[data.selectedCampusId])?data.selectedCampusId:'regional';
    applyCampus(_cid);
    // Recompute campus runtime modifiers from the active campus so they don't
    // leak across saves/modes (e.g. previous Waterfront discount into sandbox).
    if(typeof campusSupplyCostMult!=='undefined'){
      const _t=(getCampus(_cid).startTweaks)||{};
      campusSupplyCostMult=(_t.supplyMult&&_t.supplyMult>0)?_t.supplyMult:1;
    }
  }
  // Pad/truncate any saved grid to match the (possibly new) ROWS/COLS so older
  // 27×15 saves don't crash render() when indexed against the larger campus grid.
  const _padGrid=(g)=>{
    const out=makeEmptyGrid();
    if(!Array.isArray(g))return out;
    for(let r=0;r<ROWS&&r<g.length;r++){
      if(!Array.isArray(g[r]))continue;
      for(let c=0;c<COLS&&c<g[r].length;c++)out[r][c]=g[r][c];
    }
    return out;
  };
  if(Array.isArray(data.floorGrids)&&data.floorGrids.length){
    floorGrids=data.floorGrids.map(_padGrid);
    while(floorGrids.length<MAX_FLOORS)floorGrids.push(makeEmptyGrid());
  }else{
    floorGrids=Array.from({length:MAX_FLOORS},(_,idx)=>idx===0&&Array.isArray(data.grid)?_padGrid(data.grid):makeEmptyGrid());
  }
  floorSpecializations=migrateFloorSpecializations(data.floorSpecializations,floorGrids,data.floorSpecVersion);
  floorPanelHidden=data.floorPanelHidden??true;
  floorPanelPosition=data.floorPanelPosition??null;
  currentFloor=data.currentFloor??1;
  floorRenovations=(data.floorRenovations&&typeof data.floorRenovations==='object')?data.floorRenovations:{};
  Object.keys(floorRenovations).forEach(k=>{
    const r=floorRenovations[k];
    if(r&&typeof r==='object'&&r.active===undefined&&(r.daysLeft||0)>0){
      r.active=true;
      if(r.startedDay===undefined)r.startedDay=Math.max(1,(data.day||1)-(FLOOR_RENOVATION_DAYS-r.daysLeft));
    }
  });
  auditoriumCrowdingDays=Number(data.auditoriumCrowdingDays)||0;
  prisonerWingActive=!!data.prisonerWingActive;
  grid=getFloorGrid(currentFloor);
  rooms=Array.isArray(data.rooms)?data.rooms.map(room=>({...room,floor:room.floor??1,builtDay:room.builtDay??1})):[];
  patients=Array.isArray(data.patients)?data.patients:[];
  staff=Array.isArray(data.staff)?data.staff.map(normalizeStaffMember):[];
  staffPool=Array.isArray(data.staffPool)?data.staffPool.map(normalizeStaffMember):[];
  logs=Array.isArray(data.logs)?data.logs.slice(0,60):[];
  selTool=data.selTool??null;
  gameTime=data.gameTime??0;
  speed=data.speed??1;
  zoom=data.zoom??1;
  buildMode=data.buildMode??true;
  paused=data.paused??true;
  patId=data.patId??(patients.reduce((max,p)=>Math.max(max,p.id||0),0)+1);
  staffId=data.staffId??Math.max(
    staff.reduce((max,s)=>Math.max(max,s.id||0),0),
    staffPool.reduce((max,s)=>Math.max(max,s.id||0),0)
  )+1;
  currentTab=data.currentTab??'clerical';
  debtDays=data.debtDays??0;
  debtFreeDays=data.debtFreeDays??0;
  winStabilityDays=data.winStabilityDays??0;
  lowRepDays=data.lowRepDays??0;
  dirtyDays=data.dirtyDays??0;
  highStressDays=data.highStressDays??0;
  gameOver=!!data.gameOver;
  loseReason=data.loseReason??'';
  runOutcome=data.runOutcome??'';
  tutorialActive=!!data.tutorialActive;
  tutorialStep=data.tutorialStep??0;
  tutorialCompleted=!!data.tutorialCompleted;
  softGuideDismissed=!!data.softGuideDismissed;
  unlockedTools=new Set(data.unlockedTools||STARTING_TOOLS);
  unlockedRoles=new Set(data.unlockedRoles||STARTING_ROLES);
  unlockedMilestones=new Set(data.unlockedMilestones||[]);
  researchedTech=new Set(data.researchedTech||[]);
  unlockedFeatures=new Set(data.unlockedFeatures||[]);
  if(typeof unlockedIdentities!=='undefined'){
    unlockedIdentities=new Set(Array.isArray(data.unlockedIdentities)?data.unlockedIdentities:[]);
    // Re-evaluate in case the save predates identity-path persistence (back-compat).
    if(typeof evaluateIdentityUnlocks==='function')evaluateIdentityUnlocks();
  }
  activeResearch=data.activeResearch??null;
  researchLog=Array.isArray(data.researchLog)?data.researchLog:[];
  researchMilestonesFired=new Set(Array.isArray(data.researchMilestonesFired)?data.researchMilestonesFired:[]);
  dispatchJobs=Array.isArray(data.dispatchJobs)?data.dispatchJobs:[];
  dispatchJobId=data.dispatchJobId??(dispatchJobs.reduce((max,job)=>Math.max(max,job.id||0),0)+1);
  hasStarted=data.hasStarted??true;
  gradeIndex=data.gradeIndex??0;
  gradeNote=data.gradeNote??'Monthly inspectors are fully satisfied';
  monthRepAccum=data.monthRepAccum??0;
  monthCleanAccum=data.monthCleanAccum??0;
  monthWaitAccum=data.monthWaitAccum??0;
  monthSamples=data.monthSamples??0;
  monthDebtDays=data.monthDebtDays??0;
  monthHighWaitDays=data.monthHighWaitDays??0;
  budgetMonthIncome=data.budgetMonthIncome??0;
  budgetMonthExpenses=data.budgetMonthExpenses??0;
  budgetMonthStartDay=data.budgetMonthStartDay??day;
  departments=data.departments&&typeof data.departments==='object'
    ?{...makeDepartments(),...Object.fromEntries(Object.entries(data.departments).map(([key,value])=>[key,{...(makeDepartments()[key]||{level:1}),...(value||{})}]))}
    :(data.departmentLevels&&typeof data.departmentLevels==='object'
      ?Object.fromEntries(Object.entries({...makeDepartments()}).map(([key,value])=>[key,{level:data.departmentLevels[key]??value.level}]))
      :makeDepartments());
  techTree=data.techTree&&typeof data.techTree==='object'
    ?{...makeTechTree(),...Object.fromEntries(Object.entries(data.techTree).map(([key,value])=>[key,{...(makeTechTree()[key]||{unlocked:false}),...(value||{})}]))}
    :makeTechTree();
  govRequired=data.govRequired??govRequired??0.35;
  govTreated=data.govTreated??data.monthPublicCareTreated??0;
  totalPatients=data.totalPatients??data.monthPatientsTreated??0;
  totalPublicCareTreated=data.totalPublicCareTreated??0;
  recentAuditFailureDays=data.recentAuditFailureDays??0;
  currentCEO=data.currentCEO??null;
  boardMembers=Array.isArray(data.boardMembers)?data.boardMembers:[];
  ceoLegacyCooldown=data.ceoLegacyCooldown??0;
  grantOffers=Array.isArray(data.grantOffers)?data.grantOffers:[];
  contractOffer=data.contractOffer??null;
  activeContract=data.activeContract??null;
  lastContractId=data.lastContractId??null;
  insuranceContracts=Array.isArray(data.insuranceContracts)
    ?data.insuranceContracts
    :(data.activeInsuranceContract?[{...data.activeInsuranceContract,daysLeft:data.insuranceDaysLeft??data.activeInsuranceContract.durationDays??10}]:[]);
  freeBuildCredits=data.freeBuildCredits||{gp:0};
  // dailyGoal carries closures (current/done/reward); JSON loses them.
  // Reset to null so generateDailyGoal() rebuilds it on the next day.
  dailyGoal=null;
  dailyStats=data.dailyStats||{treated:0,gpVisits:0,roomsBuilt:0,rolesHired:{},cleanDays:0};
  staffShiftFilter=data.staffShiftFilter??'day';
  eventStats={
    totalEvents:data.eventStats?.totalEvents??0,
    emergencies:data.eventStats?.emergencies??0,
    staffIncidents:data.eventStats?.staffIncidents??0,
    complaints:data.eventStats?.complaints??0
  };
  eventMemory=data.eventMemory&&typeof data.eventMemory==='object'?data.eventMemory:{};
  specialtyServiceStats={
    cosmeticCases:data.specialtyServiceStats?.cosmeticCases??0,
    studentVisits:data.specialtyServiceStats?.studentVisits??0,
    spermDeposits:data.specialtyServiceStats?.spermDeposits??0,
    ivfCycles:data.specialtyServiceStats?.ivfCycles??0,
    ethicsReviews:data.specialtyServiceStats?.ethicsReviews??0,
    complianceIncidents:data.specialtyServiceStats?.complianceIncidents??0,
    cryoReliability:data.specialtyServiceStats?.cryoReliability??100,
    universityContractActive:data.specialtyServiceStats?.universityContractActive??false
  };
  statsHistory=Array.isArray(data.statsHistory)?data.statsHistory:[];
  if(data.selectedDifficulty&&typeof selectedDifficulty!=='undefined')selectedDifficulty=data.selectedDifficulty;
  // Migrate old instant-unlock tech tree entries into researchedTech
  const _ttMigrate={
    basicTriage:'basic_triage',fastTrack:'fast_track',
    basicImaging:'basic_imaging',fasterLabProcessing:'faster_lab_processing',
    staffScheduling:'staff_scheduling',breakOptimization:'break_optimization',
    governmentCompliance:'government_compliance',contractNegotiation:'contract_negotiation'
  };
  Object.entries(_ttMigrate).forEach(([old,newId])=>{
    if(data.techTree?.[old]?.unlocked)researchedTech.add(newId);
  });
  if(typeof initializeEventMetadata==='function')initializeEventMetadata();
  if(typeof applySavedTutorialPreference==='function')applySavedTutorialPreference();
  hover={x:-1,y:-1};
  dragging=false;
  syncActiveGrid();
  loseReason=gameOver?loseReason:'';
  document.getElementById('log').innerHTML=logs.slice(0,20).map(l=>`<div class="li ${l.type}">Day ${l.d}: ${l.msg}</div>`).join('');
  document.getElementById('staffmodal').classList.remove('open');
  document.getElementById('tt').style.display='none';
  applyCustomCenterName();
  setMenuVisibility(false);
  document.getElementById('gameover').classList.toggle('open',gameOver);
  updateMenuBlurState();
  if(gameOver){
    renderEndScreen(runOutcome==='win'?'Run Complete':'Hospital Closed',loseReason,runOutcome||'loss');
  }
  document.getElementById('hint').textContent=`Loaded hospital from day ${day}.`;
  updateSpeedButton();
  updatePauseButton();
  updateBuildModeButton();
  updateFloorControls();
  applyZoom();
  updateUI();
  render();
  addLog(`Saved hospital loaded${sourceLabel?' from '+sourceLabel:' from local storage'}.`,'g');
  if(typeof maybePromptFloorSpecialization==='function')maybePromptFloorSpecialization();
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw){
      document.getElementById('hint').textContent='No saved hospital was found in local storage.';
      if(logs.length)addLog('No saved hospital was found in local storage.','w');
      return;
    }
    let parsed;
    try{
      parsed=JSON.parse(raw);
    }catch(parseErr){
      console.error('Save JSON parse failed:',parseErr);
      document.getElementById('hint').textContent='Load failed. The save data is corrupted and could not be read. Your previous save was kept untouched — try importing a backup save file.';
      if(logs.length)addLog('Load failed. The save data is corrupted (could not be parsed).','b');
      if(typeof showToast==='function')showToast('Save file is corrupted','warn');
      return;
    }
    applyGameData(parsed,'local storage');
  }catch(err){
    console.error(err);
    document.getElementById('hint').textContent='Load failed. The save data may be corrupted. Your previous save file was kept untouched.';
    if(logs.length)addLog('Load failed. The save data may be corrupted.','b');
    if(typeof showToast==='function')showToast('Load failed — save may be corrupted','warn');
  }
}
function loadFromFile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      let data;
      try{
        data=JSON.parse(e.target.result);
      }catch(parseErr){
        console.error('Imported save JSON parse failed:',parseErr);
        document.getElementById('hint').textContent='Import failed. The save file is corrupted and could not be read.';
        addLog('Import failed. The save file is corrupted (could not be parsed).','b');
        if(typeof showToast==='function')showToast('Save file is corrupted','warn');
        return;
      }
      applyGameData(data,`file "${file.name}"`);
    }catch(err){
      console.error(err);
      document.getElementById('hint').textContent='Import failed. The save file may be corrupted or invalid.';
      addLog('Import failed. The save file may be corrupted or invalid.','b');
      if(typeof showToast==='function')showToast('Import failed','warn');
    }
  };
  reader.onerror=function(){
    document.getElementById('hint').textContent='Could not read the file.';
  };
  reader.readAsText(file);
}
function importSaveFile(){
  const input=document.createElement('input');
  input.type='file';
  input.accept='.mmcsave,.json';
  input.style.display='none';
  input.addEventListener('change',function(){
    if(input.files&&input.files[0])loadFromFile(input.files[0]);
    input.remove();
  });
  document.body.appendChild(input);
  input.click();
}

function getReputationStatus(){
  if(reputation>=80)return 'Excellent public trust';
  if(reputation>=60)return 'Stable standing';
  if(reputation>=40)return 'Concerns rising';
  if(reputation>=20)return 'Patients are losing confidence';
  return 'Closure risk is severe';
}

function getCleanlinessStatus(){
  if(cleanliness>=85)return 'Facility is running clean';
  if(cleanliness>=65)return 'Acceptable, but keep janitors staffed';
  if(cleanliness>=40)return 'Dirty floors and full bins are hurting trust';
  return 'Unsafe conditions are damaging the hospital';
}

function getHospitalGrade(){return HOSPITAL_GRADES[gradeIndex];}

function reviewHospitalGrade(){
  const avgRep=monthSamples?monthRepAccum/monthSamples:reputation;
  const avgClean=monthSamples?monthCleanAccum/monthSamples:cleanliness;
  const avgWait=monthSamples?monthWaitAccum/monthSamples:0;
  const problems=[];

  if(avgRep<55)problems.push('low public confidence');
  if(avgClean<62)problems.push('poor sanitation standards');
  if(monthDebtDays>=5)problems.push('too many days in debt');
  if(monthHighWaitDays>=8||avgWait>8)problems.push('long patient waits');

  if(problems.length){
    if(gradeIndex<HOSPITAL_GRADES.length-1)gradeIndex++;
    gradeNote=`Unsatisfactory month: ${problems.join(', ')}.`;
    addLog(`Monthly inspection: grade fell to ${getHospitalGrade()} due to ${problems.join(', ')}.`,'b');
  }else{
    gradeNote='Monthly inspectors are satisfied with current standards.';
    addLog(`Monthly inspection: grade held at ${getHospitalGrade()}.`,'g');
  }

  monthRepAccum=0;
  monthCleanAccum=0;
  monthWaitAccum=0;
  monthSamples=0;
  monthDebtDays=0;
  monthHighWaitDays=0;
}

function wageBill(){const raw=staff.filter(s=>s.hired).reduce((a,s)=>a+(typeof effectiveSalary==='function'?effectiveSalary(s):(s.salary||0)),0);return Math.round(raw*(typeof getLeadershipBonus==='function'?getLeadershipBonus().wageBillMult:1));}

function flushIncome(){
  if(incAccum>0){
    monthlyInc=Math.floor(incAccum);
    changeMoney(monthlyInc);
    addLog(`Income: +$${monthlyInc}`,'g');
    incAccum=0;
    updateUI();
  }
}

const EVENTS=[
  {m:'Patient surge reported across the intake desk.',kind:'chaos',category:'crisis',rarity:'common',icon:'📈',title:'Patient Surge',desc:'A sudden wave of new patients has arrived at the hospital.',impact:'<div>Spawns extra patients immediately.</div><div>Stress rises as intake is pushed harder.</div>',f:()=>{triggerPatientSurge();},followUp:{chance:0.42,title:'Staff Burnout',f:()=>{triggerStaffBurnout();},followUp:{chance:0.35,title:'Patient Complaint',f:()=>{triggerPatientComplaint();}}}},
  {m:'A staff member is out unexpectedly today.',kind:'negative',category:'pressure',rarity:'common',icon:'🤒',title:'Staff Sick Day',desc:'A team member called out sick and left a gap in coverage.',impact:'<div>A hired staff member is removed from coverage for the day.</div><div>Room and shift performance may suffer until they return.</div>',f:()=>{triggerStaffSick();}},
  {m:'A critical machine has gone down.',kind:'negative',category:'crisis',rarity:'uncommon',icon:'🛠️',title:'Equipment Failure',desc:'A clinical room has lost key equipment and is temporarily offline.',impact:'<div>One operational clinical room is disabled for a short time.</div><div>Stress rises while the room is unavailable.</div>',available:()=>{const m=(typeof getTechBonus==='function'?(getTechBonus().supplyShortageChanceMult||1):1);return Math.random()<m;},f:()=>{triggerEquipmentFailure();}},
  {m:'A patient has filed a complaint.',kind:'negative',category:'pressure',rarity:'common',icon:'🗣️',title:'Patient Complaint',desc:'A dissatisfied patient has raised concerns with administration.',impact:'<div>Reputation drops.</div><div>Staff pressure and stress increase.</div>',f:()=>{triggerPatientComplaint();}},
  {m:'Emergency services are routing a critical case your way.',kind:'chaos',category:'crisis',rarity:'uncommon',icon:'🚨',title:'Emergency Case',desc:'A critical patient is inbound and needs urgent treatment.',impact:'<div>An urgent patient enters the queue immediately.</div><div>Stress rises from the sudden emergency load.</div>',f:()=>{triggerEmergency();}},
  {m:'Government grant: +$3,000!',kind:'positive',category:'opportunity',rarity:'common',icon:'💵',title:'Government Grant',desc:'A city grant has been approved for hospital operations.',impact:'<div>Cash increases by $3,000.</div>',f:()=>{changeMoney(3000);updateUI();}},
  {m:'Emergency Staff Relief: temporary support arrived to reduce workload.',kind:'positive',category:'positive',rarity:'uncommon',icon:'🚑',title:'Emergency Staff Relief',desc:'Temporary staff support has arrived.',impact:'<div>Stress reduction.</div>',choices:[
    {label:'Accept Help',type:'primary',action:()=>{
      reduceStress(10);
      addLog('Temporary staff relief was accepted. Stress eased across the hospital.','g');
      showToast('Staff relief accepted','good');
      updateUI();
    }}
  ]},
  {m:'Staff appreciated! Morale up.',kind:'positive',category:'positive',rarity:'common',icon:'👏',title:'Staff Appreciation',desc:'Recognition from leadership has lifted staff spirits.',impact:'<div>Morale support event with no direct penalty.</div>',f:()=>{}},
  {m:'Inspection passed - score bonus!',kind:'positive',category:'opportunity',rarity:'uncommon',icon:'✅',title:'Inspection Passed',desc:'Inspectors were satisfied with hospital performance.',impact:'<div>Score increases.</div>',f:()=>{score+=20;}},
  {m:'Cleaning audit praise: reputation +4.',kind:'positive',category:'positive',rarity:'uncommon',icon:'🧼',title:'Cleaning Audit Praise',desc:'The hospital was recognized for strong sanitation standards.',impact:'<div>Reputation and cleanliness both improve.</div>',f:()=>{reputation=clamp(reputation+4,0,100);cleanliness=clamp(cleanliness+6,0,100);updateUI();}},
  {m:'Messy waiting room complaints hit the lobby.',kind:'negative',category:'pressure',rarity:'common',title:'Lobby Complaints',desc:'The waiting area is causing visible frustration among patients and visitors.',impact:'<div>Reputation drops and cleanliness slips.</div><div>Lobby pressure rises until conditions improve.</div>',f:()=>{
    const repLoss=getChaosRepLoss(5,currentShift());
    const cleanLoss=Math.max(3,Math.round(8*(1-getGuardProtection(currentShift()))));
    reputation=clamp(reputation-repLoss,0,100);
    cleanliness=clamp(cleanliness-cleanLoss,0,100);
    updateUI();
  }},
  {m:'A VIP patient has chosen your hospital for discreet care.',kind:'positive',category:'opportunity',rarity:'rare',icon:'🌟',title:'VIP Patient',desc:'A high-profile patient is arriving and expects quick, polished treatment.',impact:'<div>A premium VIP case is added to the queue.</div><div>Stress rises slightly, but the case pays above normal when treated.</div>',f:()=>{triggerVipPatient();}},
  {m:'A major accident is sending multiple emergency patients your way.',kind:'chaos',category:'crisis',rarity:'rare',minStage:'expanding',icon:'🚨',title:'Mass Casualty Incident',desc:'Multiple patients are arriving at once from a major accident.',impact:'<div>High stress, but strong community trust if your hospital responds well.</div>',available:()=>hasOperationalER()||hospitalStage==='medical',choices:[
    {label:'Accept All Patients',type:'primary',action:()=>{
      spawnEmergencyPatients(6);
      eventStats.emergencies+=6;
      stress=clamp(stress+15,0,100);
      adjustReputation(10,'Mass casualty response — all accepted','g');
      const erRoom=rooms.find(r=>r.type==='er'&&isConn(r)&&roomHasRequiredStaff(r))||rooms.find(r=>r.type==='waiting_room'&&isConn(r));
      if(erRoom)focusEventRoom(erRoom,true,4200);
      addLog('Mass casualty response activated. All incoming emergency patients were accepted.','g');
      showToast('Mass casualty accepted','warn');
      updateUI();
    }},
    {label:'Divert Some Patients',type:'warn',action:()=>{
      spawnEmergencyPatients(3);
      eventStats.emergencies+=3;
      stress=clamp(stress+6,0,100);
      adjustReputation(4,'Mass casualty response — partial','g');
      const erRoom=rooms.find(r=>r.type==='er'&&isConn(r)&&roomHasRequiredStaff(r))||rooms.find(r=>r.type==='waiting_room'&&isConn(r));
      if(erRoom)focusEventRoom(erRoom,true,3200);
      addLog('Mass casualty response limited. Some patients were diverted to other hospitals.','w');
      showToast('Mass casualty diverted','warn');
      updateUI();
    }}
  ]},
  {m:'A celebrity pregnancy case is requesting special care.',kind:'positive',category:'opportunity',rarity:'legendary',minStage:'medical',icon:'👶',title:'VIP Celebrity Pregnancy',desc:'A high-profile celebrity has chosen your hospital for delivery. Media attention is building fast.',impact:'<div>Huge reputation gain or major backlash depending on how you respond.</div>',choices:[
    {label:'Prioritize VIP Care',type:'primary',action:()=>{stress=clamp(stress+10,0,100);reputation=clamp(reputation+12,0,100);addLog('VIP treated successfully. Reputation skyrockets.','g');showToast('VIP success','good');updateUI();}},
    {label:'Treat Normally',type:'warn',action:()=>{reputation=clamp(reputation+3,0,100);stress=clamp(stress+3,0,100);addLog('VIP case handled normally. The public response was steady.','w');showToast('VIP case handled','info');updateUI();}},
    {label:'Decline Case',type:'danger',action:()=>{reputation=clamp(reputation-6,0,100);addLog('VIP case declined. Media backlash hurt the hospital reputation.','b');showToast('VIP case declined','warn');updateUI();}}
  ]},
  {m:'Your active insurance contract is being audited.',kind:'negative',category:'pressure',rarity:'uncommon',icon:'📋',title:'Insurance Audit',desc:'Your current insurance contract is under review.',impact:'<div>Reputation risk with a possible short-term financial temptation.</div>',available:()=>insuranceContracts.length>0,choices:[
    {label:'Cooperate Fully',type:'primary',action:()=>{reputation=clamp(reputation+3,0,100);recentAuditFailureDays=0;addLog('Insurance audit completed cleanly. Reputation improved.','g');showToast('Audit cleared','good');updateUI();}},
    {label:'Cut Corners',type:'danger',action:()=>{reputation=clamp(reputation-5,0,100);recentAuditFailureDays=12;changeMoney(2000);addLog('Corners were cut during the insurance audit. Cash increased, but reputation suffered.','b');showToast('Audit shortcut taken','warn');updateUI();}}
  ]},
  {m:'Patient complaints are stacking up across the waiting room.',kind:'negative',category:'pressure',rarity:'uncommon',icon:'😡',title:'Complaint Surge',desc:'Patients are unhappy with wait times.',impact:'<div>Queue frustration is spreading and public trust is at risk.</div>',available:()=>{
    const waitingCount=waitingPatientsCount();
    const longWaiters=patients.filter(p=>p.state==='waiting'&&p.waitTime>=getEffectiveLongWaitThreshold()).length;
    return waitingCount>=5||longWaiters>=2;
  },choices:[
    {label:'Offer Compensation',type:'primary',action:()=>{
      const room=rooms.find(r=>r.type==='waiting_room'&&isConn(r))||null;
      eventStats.complaints+=1;
      changeMoney(-2000);
      reputation=clamp(reputation+2,0,100);
      if(room)focusEventRoom(room,true,3600);
      addLog('Leadership offered compensation to calm a surge of patient complaints. Reputation stabilized, but it cost cash.','g');
      showToast('Complaints compensated','good');
      updateUI();
    }},
    {label:'Ignore',type:'danger',action:()=>{
      const room=rooms.find(r=>r.type==='waiting_room'&&isConn(r))||null;
      eventStats.complaints+=1;
      reputation=clamp(reputation-5,0,100);
      if(room)focusEventRoom(room,true,3600);
      addLog('Patient complaints were ignored. Reputation dropped as frustration spread through the waiting room.','b');
      showToast('Complaint surge ignored','warn');
      updateUI();
    }}
  ]},
  {m:'Several staff members are nearing exhaustion.',kind:'negative',category:'pressure',rarity:'uncommon',icon:'😓',title:'Staff Burnout Crisis',desc:'Several staff members are nearing exhaustion.',impact:'<div>Energy may crash further and resignations become more likely if leadership does not respond.</div>',available:()=>staff.filter(s=>s.hired&&(s.energy??100)<40).length>=3,choices:[
    {label:'Give Emergency Bonuses',type:'primary',action:()=>{changeMoney(-3000);boostMoraleAll();addLog('Emergency bonuses were issued to steady the exhausted staff. Morale improved across the hospital.','g');showToast('Bonuses issued','good');updateUI();}},
    {label:'Push Through',type:'danger',action:()=>{stress=clamp(stress+10,0,100);addLog('Leadership pushed the staff through the exhaustion crisis. Stress rose sharply.','b');showToast('Burnout crisis worsened','warn');updateUI();}}
  ]},
  {m:'A sanitation problem has been detected in one of your rooms.',kind:'negative',category:'pressure',rarity:'uncommon',icon:'🧪',title:'Sanitation Issue',desc:'A sanitation problem has been detected in one of your rooms.',impact:'<div>Cleanliness is at risk until leadership decides how to respond.</div>',available:()=>rooms.length>0,choices:[
    {label:'Fix Immediately',type:'primary',action:()=>{
      const room=randomOperationalRoom(['waiting_room','gp','er','xray','lab','pharmacy','ward','surgery','head_office'])||rooms.find(r=>isConn(r))||null;
      changeMoney(-1500);
      cleanliness=clamp(cleanliness+10,0,100);
      if(room)focusEventRoom(room,true,3600);
      addLog('The sanitation issue was fixed immediately. Cleanliness improved.','g');
      showToast('Sanitation fixed','good');
      updateUI();
    }},
    {label:'Delay Fix',type:'danger',action:()=>{
      const room=randomOperationalRoom(['waiting_room','gp','er','xray','lab','pharmacy','ward','surgery','head_office'])||rooms.find(r=>isConn(r))||null;
      cleanliness=clamp(cleanliness-10,0,100);
      reputation=clamp(reputation-3,0,100);
      if(room)focusEventRoom(room,true,3600);
      addLog('The sanitation issue was delayed. Cleanliness fell and reputation suffered.','b');
      showToast('Sanitation delayed','warn');
      updateUI();
    }}
  ]},
  {m:'A room is experiencing unstable power.',kind:'negative',category:'pressure',rarity:'uncommon',icon:'⚡',title:'Power Fluctuation',desc:'A room is experiencing unstable power.',impact:'<div>An operational room may be disabled temporarily.</div>',available:()=>rooms.length>0,choices:[
    {label:'Repair Immediately',type:'primary',action:()=>{
      const room=randomOperationalRoom(['gp','er','xray','lab','pharmacy','ward','surgery','it_department'])||rooms.find(r=>isConn(r))||null;
      changeMoney(-1000);
      if(room){
        disableRoom(room,2500);
        focusEventRoom(room,true,3200);
      }
      addLog('Emergency electrical repair was ordered immediately.','g');
      showToast('Power stabilized','good');
      updateUI();
    }},
    {label:'Wait It Out',type:'danger',action:()=>{
      const room=randomOperationalRoom(['gp','er','xray','lab','pharmacy','ward','surgery','it_department'])||rooms.find(r=>isConn(r))||null;
      stress=clamp(stress+5,0,100);
      if(room){
        disableRoom(room,5000);
        focusEventRoom(room,true,5000);
      }
      addLog('The hospital waited out the power fluctuation. Stress increased while the room struggled.','b');
      showToast('Power issue worsening','warn');
      updateUI();
    }}
  ]},
  {m:'Local media is covering your hospital.',kind:'positive',category:'opportunity',rarity:'uncommon',icon:'📺',title:'Media Coverage',desc:'Local media is covering your hospital.',impact:'<div>Reputation boost with a possible patient demand spike.</div>',available:()=>hasMarketingOfficeBuilt()||reputation>=55,choices:[
    {label:'Promote Hospital',type:'primary',action:()=>{
      reputation=clamp(reputation+6,0,100);
      adReach=clamp(adReach+30,0,100);
      addLog('The hospital leaned into the media coverage. Reputation rose and more patients took notice.','g');
      showToast('Media buzz rising','info');
      updateUI();
    }},
    {label:'Decline Interview',type:'warn',action:()=>{
      reputation=clamp(reputation+2,0,100);
      addLog('The hospital declined a full media push but still gained some goodwill.','w');
      showToast('Media appearance declined','info');
      updateUI();
    }}
  ]},
  {m:'Hospital inspectors have arrived without warning.',kind:'negative',category:'pressure',rarity:'rare',icon:'🧾',title:'Hospital Inspection',desc:'Inspectors are reviewing current standards right now.',impact:'<div>Strong standards improve reputation and score.</div><div>Poor conditions cause reputation loss and extra stress.</div>',f:()=>{triggerHospitalInspection();}},
  {m:'An intern has made a major breakthrough in training.',kind:'positive',category:'positive',rarity:'uncommon',icon:'🎓',title:'Intern Breakthrough',desc:'An intern has made significant progress.',impact:'<div>A promising intern is ready to step into a bigger clinical role.</div>',available:()=>staff.some(s=>s.hired&&s.role==='intern'&&(s.level??1)>=3),choices:[
    {label:'Promote Intern',type:'primary',action:()=>{
      const promoted=promoteRandomIntern();
      if(promoted){
        addLog(`${promoted.name} was elevated after an intern breakthrough.`,'g');
      }
      updateUI();
    }}
  ]},
  // ── Identity Path AI Events ─────────────────────────────────────────────────
  {id:'ai_efficiency_surge',m:'Your hospital AI has optimised patient flow and resource allocation hospital-wide.',kind:'positive',category:'opportunity',rarity:'uncommon',icon:'🤖',title:'AI Efficiency Surge',cooldownDays:12,
   desc:'The AI Operations Center has identified and resolved several inefficiencies simultaneously — a surge of optimisation that ripples across every department.',
   impact:'<div>Research points gained, cash saved, and stress relieved across the hospital.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().aiOutageRisk,
   f:()=>{
     if(typeof triggerAiEfficiencySurge==='function')triggerAiEfficiencySurge();
   }},
  {id:'predictive_demand_win',m:'AI demand forecasting correctly predicted this week\'s patient volume — operations ran smoothly.',kind:'positive',category:'positive',rarity:'uncommon',icon:'📊',title:'Predictive Demand Win',cooldownDays:16,
   desc:'Your AI predicted patient demand precisely, allowing staffing and supply to be optimised before the surge arrived. The result is a rare smooth week.',
   impact:'<div>Stress reduction and a reputation boost from seamless care delivery.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().aiOutageRisk,
   f:()=>{
     stress=clamp(stress-12,0,100);
     reputation=clamp(reputation+4,0,100);
     researchPoints+=10;
     addLog('AI demand prediction was spot-on this week. Stress fell and patient satisfaction improved.','g');
     showToast('Predictive demand win','good');
     updateUI();
   }},
  // ── Identity Path Manufacturing Events ──────────────────────────────────────
  {id:'supply_chain_windfall',m:'In-house supply production has generated a surplus that can be redirected.',kind:'positive',category:'opportunity',rarity:'uncommon',icon:'🏭',title:'Supply Chain Windfall',cooldownDays:14,
   desc:'Your manufacturing operations ran ahead of schedule, producing a surplus of consumables. You can either sell the excess stock for immediate cash or reinvest it in sterile reserves.',
   impact:'<div>Choice between a cash payout or a cleanliness and reputation boost.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().sterilityRisk,
   choices:[
    {label:'Sell Surplus Stock',type:'primary',action:()=>{
      if(typeof triggerSupplyChainWindfall==='function')triggerSupplyChainWindfall('sell');
    }},
    {label:'Invest in Sterile Reserves',type:'primary',action:()=>{
      if(typeof triggerSupplyChainWindfall==='function')triggerSupplyChainWindfall('invest');
    }}
  ]},
  {id:'biomedical_cost_savings',m:'Biomedical engineering resolved several equipment faults in-house, avoiding expensive contractor callouts.',kind:'positive',category:'positive',rarity:'uncommon',icon:'⚙️',title:'Biomedical Cost Savings',cooldownDays:13,
   desc:'Your in-house biomedical team caught and fixed multiple equipment issues before they caused failures. The avoided callout costs are being returned to the budget.',
   impact:'<div>Cash savings and a reduction in stress from uninterrupted equipment operation.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().sterilityRisk,
   f:()=>{
     const saved=3000+Math.floor(Math.random()*2000);
     changeMoney(saved);
     stress=clamp(stress-8,0,100);
     addLog('Biomedical engineering prevented costly equipment failures. +$'+saved.toLocaleString()+' saved and stress reduced.','g');
     showToast('Equipment costs saved','good');
     updateUI();
   }},
  // ── Identity Path University Events ────────────────────────────────────────
  {id:'research_breakthrough',m:'Your research team has made a significant clinical breakthrough.',kind:'positive',category:'opportunity',rarity:'rare',icon:'🔬',title:'Research Breakthrough',cooldownDays:18,
   desc:'A University Hospital-level research program has produced a finding that is drawing national attention. How you respond shapes the long-term impact.',
   impact:'<div>Bonus research points and a strong reputation boost.</div><div>Option to publish for prestige or commercialise for cash.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().trainingMistakeRisk,
   choices:[
    {label:'Publish the Findings',type:'primary',action:()=>{
      const rp=45+Math.floor(Math.random()*25);
      if(typeof triggerResearchBreakthrough==='function')triggerResearchBreakthrough(rp);
      reputation=clamp(reputation+3,0,100);
      addLog('Research findings published openly. Reputation and prestige climbed significantly.','g');
      showToast('Findings published','good');
    }},
    {label:'License to Industry',type:'primary',action:()=>{
      const rp=20+Math.floor(Math.random()*15);
      const cash=6000+Math.floor(Math.random()*3000);
      researchPoints+=rp;
      changeMoney(cash);
      reputation=clamp(reputation+2,0,100);
      addLog('Research licensed to industry. Cash and research points both improved.','g');
      showToast('Research licensed','good');
      updateUI();
    }}
  ]},
  {id:'academic_grant_award',m:'A national academic body has awarded your hospital a research grant.',kind:'positive',category:'opportunity',rarity:'uncommon',icon:'🎓',title:'Academic Grant Award',cooldownDays:14,
   desc:'Recognition of your University Hospital\'s output has resulted in a targeted research grant from a national academic body. The funding is yours to direct.',
   impact:'<div>Cash grant and bonus research points.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().trainingMistakeRisk,
   f:()=>{
     const rp=25+Math.floor(Math.random()*20);
     const cash=4000+Math.floor(Math.random()*2000);
     researchPoints+=rp;
     changeMoney(cash);
     addLog('Academic grant awarded: +$'+cash.toLocaleString()+' and +'+rp+' RP from national recognition.','g');
     showToast('Academic grant received','good');
     updateUI();
   }},
  // ── Identity Path Community Events ─────────────────────────────────────────
  {id:'government_community_recognition',m:'The government has recognized your hospital as a model community health provider.',kind:'positive',category:'opportunity',rarity:'rare',icon:'🏛️',title:'Government Community Recognition',cooldownDays:20,
   desc:'Your commitment to public care and government compliance has earned recognition from the regional health authority. They are offering formal funding and commendation.',
   impact:'<div>Choice of a government grant or a community health day — both improve reputation.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().communityRepBonus>0,
   choices:[
    {label:'Accept Grant Award',type:'primary',action:()=>{
      const amt=5000+Math.floor(Math.random()*2000);
      if(typeof triggerCommunityGrant==='function')triggerCommunityGrant(amt);
      addLog('Government community award accepted. The recognition came with funding and a strong reputation boost.','g');
      showToast('Community grant awarded','good');
    }},
    {label:'Host Community Health Day',type:'primary',action:()=>{
      changeMoney(2500);
      adjustReputation(8,'Community health day','g');
      cleanliness=clamp(cleanliness+8,0,100);
      addLog('A community health day was hosted. Reputation soared and the hospital\'s standards impressed every visitor.','g');
      showToast('Community health day: success','good');
      updateUI();
    }}
  ]},
  {id:'public_health_partnership',m:'A local council wants to partner with your hospital on a preventive care initiative.',kind:'positive',category:'opportunity',rarity:'uncommon',icon:'🤝',title:'Public Health Partnership',cooldownDays:15,
   desc:'The local council has chosen your community-focused hospital as the ideal partner for a public health drive. A grant and a lasting reputation boost come with the agreement.',
   impact:'<div>Direct cash grant and a sustained reputation increase.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().communityRepBonus>0,
   f:()=>{
     const grant=3000+Math.floor(Math.random()*1500);
     changeMoney(grant);
     adjustReputation(5,'Public health partnership','g');
     addLog('Public health partnership established. The community initiative brings $'+grant.toLocaleString()+' and goodwill.','g');
     showToast('Health partnership established','good');
     updateUI();
   }},
  // ── Identity Path Risk Events ───────────────────────────────────────────────
  {id:'it_systems_outage',m:'IT systems are failing across the hospital.',kind:'negative',category:'crisis',rarity:'uncommon',icon:'💻',title:'IT Systems Outage',cooldownDays:12,
   desc:'Your digital infrastructure has failed. Patient records, routing, and research systems are all disrupted — a known risk of heavy AI integration.',
   impact:'<div>IT room disabled temporarily.</div><div>Research points lost and hospital stress rises.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().aiOutageRisk,
   choices:[
    {label:'Emergency IT Response',type:'primary',action:()=>{
      changeMoney(-2500);
      if(typeof triggerItOutage==='function')triggerItOutage();
      addLog('Emergency IT response deployed. Systems are being restored at significant cost.','g');
      showToast('IT response deployed','good');
      updateUI();
    }},
    {label:'Manual Workaround',type:'danger',action:()=>{
      if(typeof triggerItOutage==='function')triggerItOutage();
      stress=clamp(stress+8,0,100);
      addLog('Staff are working around the IT failure manually. Stress is building fast.','b');
      showToast('Manual workaround in effect','warn');
      updateUI();
    }}
  ]},
  {id:'sterile_processing_failure',m:'A sterile processing failure has been detected in a clinical area.',kind:'negative',category:'crisis',rarity:'uncommon',icon:'🧪',title:'Sterile Processing Failure',cooldownDays:14,
   desc:'A contamination event in your supply chain has forced a ward-level lockdown. With manufacturing-scale operations, the consequences are more severe than for a standard hospital.',
   impact:'<div>Reputation and cleanliness take a major hit.</div><div>Affected rooms go offline until sterilisation is complete.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().sterilityRisk,
   choices:[
    {label:'Full Sterile Lockdown',type:'primary',action:()=>{
      changeMoney(-3500);
      if(typeof triggerSterileFailure==='function')triggerSterileFailure();
      addLog('Full sterile lockdown initiated. Costs were high but contamination was contained.','g');
      showToast('Sterile lockdown initiated','good');
      updateUI();
    }},
    {label:'Contain Quietly',type:'danger',action:()=>{
      if(typeof triggerSterileFailure==='function')triggerSterileFailure();
      reputation=clamp(reputation-4,0,100);
      addLog('The sterile failure was handled quietly. Reputation took an additional hit from delayed disclosure.','b');
      showToast('Quiet containment attempted','warn');
      updateUI();
    }}
  ]},
  {id:'training_mistake',m:'A trainee has made a serious procedural error during a clinical session.',kind:'negative',category:'pressure',rarity:'uncommon',icon:'🎓',title:'Training Mistake',cooldownDays:10,
   desc:'A resident or intern made a procedural error during training that has affected patient care. University hospitals accept this risk as part of their educational mission.',
   impact:'<div>Reputation drops and staff stress increases.</div><div>Transparent disclosure can restore trust over time.</div>',
   available:()=>typeof getTechBonus==='function'&&getTechBonus().trainingMistakeRisk,
   choices:[
    {label:'Transparent Disclosure',type:'primary',action:()=>{
      if(typeof triggerTrainingMistake==='function')triggerTrainingMistake();
      reputation=clamp(reputation+3,0,100);
      addLog('The training error was disclosed transparently. The public respected the openness — reputation partially restored.','g');
      showToast('Transparent disclosure made','good');
      updateUI();
    }},
    {label:'Handle Internally',type:'danger',action:()=>{
      changeMoney(-2000);
      if(typeof triggerTrainingMistake==='function')triggerTrainingMistake();
      addLog('The training mistake was handled internally. Costs were absorbed to protect short-term reputation.','b');
      showToast('Handled internally','warn');
      updateUI();
    }}
  ]},
  // -- LATE-STAGE SPECIALTY SERVICE LINE EVENTS --
  {id:'celebrity_cosmetic_case',m:'A celebrity is requesting a discreet cosmetic case at your Plastic Surgery OR.',kind:'positive',category:'opportunity',rarity:'rare',minStage:'medical',icon:'💎',title:'Celebrity Cosmetic Case',cooldownDays:14,
   desc:'A high-profile celebrity has chosen your Plastic Surgery service line for a discreet elective case. Media attention is building.',
   impact:'<div>Large premium payout if accepted; reputation swing depending on the case outcome.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&specialtyLineFullyOperational('cosmetic'),
   choices:[
    {label:'Accept Concierge Case',type:'primary',action:()=>{
      changeMoney(11000);
      reputation=clamp(reputation+8,0,100);
      stress=clamp(stress+5,0,100);
      specialtyServiceStats.cosmeticCases=(specialtyServiceStats.cosmeticCases||0)+1;
      addLog('Celebrity Cosmetic Case accepted. Premium revenue and reputation gained.','g');
      showToast('Celebrity case accepted','good');
      updateUI();
    }},
    {label:'Decline Quietly',type:'warn',action:()=>{
      reputation=clamp(reputation-3,0,100);
      addLog('Celebrity Cosmetic Case declined to protect bandwidth. Mild reputation dip.','w');
      showToast('Celebrity case declined','warn');
      updateUI();
    }}
  ]},
  {id:'public_backlash_luxury_wing',m:'Public backlash is building over the hospital\u2019s luxury wing.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'medical',icon:'📰',title:'Public Backlash Over Luxury Wing',cooldownDays:18,
   desc:'Media coverage is criticising the cosmetic / luxury wing for prioritising private patients while public-care compliance slips.',
   impact:'<div>Reputation hit when public-care compliance is low; mitigated by a strong Community-style response.</div>',
   available:()=>{
     if(typeof specialtyLineFullyOperational!=='function'||!specialtyLineFullyOperational('cosmetic'))return false;
     const rate=typeof getPublicCareRate==='function'?getPublicCareRate():0;
     return rate<(typeof govRequired!=='undefined'?govRequired:0.5);
   },
   choices:[
    {label:'Pledge Free Public Slots',type:'primary',action:()=>{
      changeMoney(-3500);
      reputation=clamp(reputation+3,0,100);
      addLog('Public backlash defused with a free-slots pledge for public-care patients.','g');
      showToast('Public-care pledge','good');
      updateUI();
    }},
    {label:'Defend Private Wing',type:'danger',action:()=>{
      reputation=clamp(reputation-8,0,100);
      addLog('The luxury wing was defended publicly. Reputation took a hit.','b');
      showToast('Public backlash','warn');
      updateUI();
    }}
  ]},
  {id:'cryogenic_storage_failure',m:'A cryogenic storage alarm has fired in the fertility wing.',kind:'negative',category:'crisis',rarity:'uncommon',minStage:'medical',icon:'❄️',title:'Cryogenic Storage Failure',cooldownDays:16,
   desc:'A liquid-nitrogen failure has been detected in the cryogenic storage room. Cleanliness, staffing, and stress levels determine the damage.',
   impact:'<div>Larger penalty when cleanliness is weak or stress is high.</div>',
   available:()=>{
     if(typeof hasOperationalRoom!=='function'||!hasOperationalRoom('cryogenic_storage'))return false;
     if(typeof specialtyLineFullyOperational!=='function')return false;
     if(!specialtyLineFullyOperational('sperm_bank')&&!specialtyLineFullyOperational('ivf'))return false;
     const recordsGap=!hasOperationalRoom('fertility_records_office');
     const labGap=!hasOperationalRoom('andrology_lab')&&!hasOperationalRoom('embryology_lab_room');
     const ethicsGap=!researchedTech.has('ethics_compliance_review');
     return cleanliness<70||stress>60||recordsGap||labGap||ethicsGap;
   },
   choices:[
    {label:'Emergency Repair',type:'primary',action:()=>{
      const fragile=cleanliness<55||stress>70;
      const cost=fragile?-5500:-2800;
      const repHit=fragile?-6:-3;
      changeMoney(cost);
      reputation=clamp(reputation+repHit,0,100);
      addLog('Cryogenic Storage Failure was contained with an emergency repair. Some samples were lost.','b');
      showToast('Cryogenic repair','warn');
      updateUI();
    }},
    {label:'Public Disclosure',type:'warn',action:()=>{
      changeMoney(-2000);
      reputation=clamp(reputation-4,0,100);
      addLog('The Cryogenic Storage Failure was disclosed publicly. Damage limited but reputation slipped.','w');
      showToast('Storage failure disclosed','warn');
      updateUI();
    }}
  ]},
  {id:'university_contract_renewal',m:'The partner university wants to renew its student-care contract.',kind:'positive',category:'opportunity',rarity:'uncommon',minStage:'medical',icon:'🎓',title:'University Contract Renewal',cooldownDays:30,
   desc:'The partner university is reviewing its annual student-care contract. Strong terms boost recurring income; aggressive terms risk the relationship.',
   impact:'<div>Recurring student-care income and reputation upside; risk of contract loss if pushed too hard.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&specialtyLineFullyOperational('university'),
   choices:[
    {label:'Renew with Service Boost',type:'primary',action:()=>{
      changeMoney(4200);
      reputation=clamp(reputation+5,0,100);
      specialtyServiceStats.studentVisits=(specialtyServiceStats.studentVisits||0)+40;
      specialtyServiceStats.universityContractActive=true;
      addLog('University Contract Renewal closed with a service boost. Recurring student income locked in.','g');
      showToast('Contract renewed','good');
      updateUI();
    }},
    {label:'Push for Higher Fees',type:'danger',action:()=>{
      const ok=Math.random()<0.55;
      if(ok){
        changeMoney(7500);
        reputation=clamp(reputation+2,0,100);
        specialtyServiceStats.universityContractActive=true;
        addLog('University Contract Renewal closed at higher fees. Strong recurring upside.','g');
        showToast('Contract renewed','good');
      }else{
        reputation=clamp(reputation-6,0,100);
        specialtyServiceStats.universityContractActive=false;
        addLog('University Contract Renewal collapsed when the hospital pushed for higher fees.','b');
        showToast('Contract lost','warn');
      }
      updateUI();
    }}
  ]},
  {id:'fertility_access_grant',m:'A reproductive-medicine grant is available for IVF / fertility access.',kind:'positive',category:'opportunity',rarity:'uncommon',minStage:'medical',icon:'🤰',title:'Fertility Access Grant',cooldownDays:24,
   desc:'A reproductive-medicine foundation is offering a fertility-access grant tied to IVF outcomes and ethics compliance.',
   impact:'<div>Cash + reputation if accepted; ethics-compliance research raises the payout.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&(specialtyLineFullyOperational('ivf')||specialtyLineFullyOperational('sperm_bank')),
   choices:[
    {label:'Accept Grant',type:'primary',action:()=>{
      const compliant=researchedTech.has('ethics_compliance_review');
      const cash=compliant?9000:5500;
      const rep=compliant?7:4;
      changeMoney(cash);
      reputation=clamp(reputation+rep,0,100);
      const success=Math.random()<(compliant?0.7:0.5);
      if(success){
        specialtyServiceStats.ivfCycles=(specialtyServiceStats.ivfCycles||0)+1;
        reputation=clamp(reputation+5,0,100);
        addLog(`Fertility Access Grant accepted. ${compliant?'Ethics compliance boosted the payout.':'Standard payout received.'} A grant-funded cycle was successful.`,'g');
      }else{
        reputation=clamp(reputation-4,0,100);
        addLog(`Fertility Access Grant accepted. ${compliant?'Ethics compliance boosted the payout.':'Standard payout received.'} A grant-funded cycle did not succeed.`,'b');
      }
      showToast('Fertility grant accepted','good');
      updateUI();
    }},
    {label:'Decline Grant',type:'warn',action:()=>{
      addLog('Fertility Access Grant was declined. No money or reputation change.','w');
      showToast('Grant declined','info');
      updateUI();
    }}
  ]},
  {id:'ethics_board_review',m:'The specialty service line ethics board has scheduled a compliance review.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'medical',icon:'⚖️',title:'Ethics Board Review',cooldownDays:20,
   desc:'Regulators are reviewing reproductive medicine and cosmetic programs. Documentation quality and ethics compliance matter.',
   impact:'<div>Reputation and cash risk; softened by Ethics and Compliance Review research.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&(specialtyLineFullyOperational('cosmetic')||specialtyLineFullyOperational('sperm_bank')||specialtyLineFullyOperational('ivf')),
   choices:[
    {label:'Cooperate Fully',type:'primary',action:()=>{
      const protected_=researchedTech.has('ethics_compliance_review');
      const repGain=protected_?6:2;
      reputation=clamp(reputation+repGain,0,100);
      specialtyServiceStats.ethicsReviews=(specialtyServiceStats.ethicsReviews||0)+1;
      addLog(protected_
        ?'The Ethics Board Review cleared cleanly thanks to the standing review board. Reputation strengthened.'
        :'The Ethics Board Review cleared, though documentation gaps were noted.','g');
      showToast('Ethics review cleared','good');
      updateUI();
    }},
    {label:'Push Back',type:'danger',action:()=>{
      const protected_=researchedTech.has('ethics_compliance_review');
      const cashHit=protected_?-1500:-4500;
      const repHit=protected_?-3:-9;
      changeMoney(cashHit);
      reputation=clamp(reputation+repHit,0,100);
      specialtyServiceStats.ethicsReviews=(specialtyServiceStats.ethicsReviews||0)+1;
      addLog('The hospital pushed back against Ethics Board Review findings. Penalties followed.','b');
      showToast('Ethics review penalty','warn');
      updateUI();
    }}
  ]},
  {id:'blackout',m:'A blackout has rolled across the hospital grid.',kind:'negative',category:'crisis',rarity:'uncommon',minStage:'expanding',icon:'🔌',title:'Blackout',cooldownDays:14,
   desc:'A regional power failure has hit the hospital. Backup systems and digital failovers determine whether critical care stays online.',
   impact:'<div>Surgery, ICU, Lab, and digital systems can stall during the outage; stress and reputation slip if backups are weak.</div>',
   protectedBy:['HVAC / Power Generator','Digital Backup System research','IT Department + IT Specialist','Operations dept upgrades'],
   f:()=>{triggerBlackout();}},
  {id:'car_pileup',m:'A multi-vehicle pileup just happened nearby.',kind:'negative',category:'crisis',rarity:'uncommon',minStage:'expanding',icon:'🚑',title:'Car Pileup',cooldownDays:14,
   desc:'Dispatch is routing multiple casualties from a highway pileup. Your ER, ambulance, and surgical capacity decide whether the surge is absorbed cleanly.',
   impact:'<div>A wave of emergency patients arrives; weak response means waiting-room overflow, stress spike, and reputation loss.</div>',
   protectedBy:['ER','Ambulance Bay','Dispatch Office','Surgery','inpatient capacity (Ward / ICU)','Blood Bank if present'],
   f:()=>{triggerCarPileup();}},
  {id:'public_care_review',m:'Asherville officials have opened a Public Care Review.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'medical',icon:'🏛️',title:'Public Care Review',cooldownDays:18,
   desc:'Government regulators are auditing your public-care commitment. Hitting the public-patient quota and having the right leadership in place flips this from fine into funding.',
   impact:'<div>Pass: cash grant and reputation gain. Fail: cash penalty and reputation loss scaled by government penalty multipliers.</div>',
   protectedBy:['meeting the public-care quota','Admin dept upgrades','Government Liaison board seat','Public Mission CEO','Government Compliance / Compliance Tracking / Audit Shield research'],
   f:()=>{triggerPublicCareReview();}},
  {id:'nurse_burnout_wave',m:'A nurse burnout wave is sweeping the active shift.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'expanding',icon:'😩',title:'Nurse Burnout Wave',cooldownDays:14,
   desc:'Several nurses have hit the wall on the same shift. Break spaces, HR support, and senior nurse coverage decide whether morale recovers or someone walks.',
   impact:'<div>Nurse morale and energy drop; one nurse-staffed room can briefly stall and the most-tired nurse risks quitting if you are unprepared.</div>',
   protectedBy:['Staff Room','Lunch Room','HR Manager','Charge Nurse','Operations dept upgrades','Fatigue Management / Burnout Prevention / HR Workflow research'],
   f:()=>{triggerNurseBurnoutWave();}},
  {id:'medication_shortage',m:'A medication shortage is hitting your pharmacy.',kind:'negative',category:'crisis',rarity:'uncommon',minStage:'expanding',icon:'💊',title:'Medication Shortage',cooldownDays:14,
   desc:'A regional drug-supply gap is hitting the pharmacy. Pharmacy capacity, contracts, and Manufacturing / supply research soften the cost and the slowdown.',
   impact:'<div>Pharmacy can stall briefly and emergency-supply costs spike; revenue and patient flow take a small hit if you are unprepared.</div>',
   protectedBy:['multiple Pharmacies','Pharmacist on shift','active insurance / supply contract','Manufacturing identity (supply cost / shortage multipliers)','Central Supply Standards / In-House Supply Production / Preventive Maintenance research'],
   available:()=>{const m=(typeof getTechBonus==='function'?(getTechBonus().supplyShortageChanceMult??1):1);return Math.random()<m;},
   f:()=>{triggerMedicationShortage();}},
  {id:'server_outage',m:'A server outage just took the digital backbone down.',kind:'negative',category:'crisis',rarity:'uncommon',minStage:'expanding',icon:'🖥️',title:'Server Outage',cooldownDays:14,
   desc:'The hospital servers have failed. Digital filing, tablets, automation, and research progress depend on backups, IT staff, and cybersecurity to come back fast.',
   impact:'<div>IT and research stall, automation pauses, and stress rises until systems come back online.</div>',
   protectedBy:['multiple IT Departments','Digital Backup System research','IT Specialist on shift','Audit Shield / Compliance Tracking research'],
   f:()=>{triggerServerOutage();}},
  {id:'community_protest',m:'A community protest has formed outside the hospital.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'expanding',icon:'📣',title:'Community Protest',cooldownDays:18,
   desc:'Residents are protesting at the entrance. Public-care compliance, security presence, and outreach work decide whether this fizzles or escalates.',
   impact:'<div>Reputation slides and stress rises; weak public-care performance turns a protest into sustained backlash.</div>',
   protectedBy:['public-care quota compliance','Security Officers on shift','Government Compliance / Compliance Tracking research','Government Liaison board seat','Public Mission CEO'],
   available:()=>{
     const longWaiters=patients.filter(p=>p.state==='waiting'&&p.waitTime>=getEffectiveLongWaitThreshold()).length;
     const lowQuota=totalPatients>0&&(govTreated/totalPatients)<((typeof govRequired!=='undefined'?govRequired:0.35)-0.05);
     const lowRep=reputation<55;
     return lowQuota||longWaiters>=3||lowRep;
   },
   f:()=>{triggerCommunityProtest();}},
  {id:'mayor_visit',m:'The mayor is paying the hospital a surprise visit.',kind:'positive',category:'opportunity',rarity:'rare',minStage:'expanding',icon:'🎩',title:'Mayor Visit',cooldownDays:24,
   desc:'The mayor is touring the hospital. A clean, well-staffed, well-run operation earns reputation and a funding boost; a stressed or messy one earns headlines for the wrong reasons.',
   impact:'<div>Strong overall hospital status: reputation gain and a city grant. Poor status: reputation hit and a public rebuke.</div>',
   protectedBy:['high reputation','low stress','high cleanliness','meeting the public-care quota','active CEO','Operations / Admin dept upgrades'],
   f:()=>{triggerMayorVisit();}},
];
function applyEventProtectedBy(event){
  if(!event||!event.protectedBy||!event.protectedBy.length)return;
  if(event._baseImpactRich)return;
  const base=event.impact||'';
  const list='<div class="event-reduced-by"><b>Reduced by:</b> '+event.protectedBy.join(', ')+'.</div>';
  event._baseImpactRich=base+list;
  event.impact=event._baseImpactRich;
}
function setEventOutcome(id,outcomeHtml){
  if(typeof EVENTS==='undefined')return;
  const event=EVENTS.find(e=>e.id===id);
  if(!event)return;
  applyEventProtectedBy(event);
  const base=event._baseImpactRich||event.impact||'';
  const outcome=outcomeHtml?'<div class="event-outcome"><b>Outcome:</b> '+outcomeHtml+'</div>':'';
  event.impact=base+outcome;
}
const EVENT_RARITY_ORDER=['legendary','rare','uncommon','common'];
const EVENT_RARITY_CHANCES={common:0.6,uncommon:0.25,rare:0.12,legendary:0.03};
const EVENT_DEFAULT_COOLDOWNS={common:2,uncommon:4,rare:8,legendary:15};
function getEventId(event){
  return event.id||String(event.title||event.m||'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}
function getEventCooldownDays(event){
  let cd=event.cooldownDays??EVENT_DEFAULT_COOLDOWNS[(event.rarity||'common').toLowerCase()]??2;
  // University identity drawback: shorter cooldown → training mistakes more frequent.
  if(event.id==='training_mistake'&&typeof getLeadershipBonus==='function'){
    const mult=getLeadershipBonus().trainingMistakeChanceMult||1;
    if(mult>1)cd=Math.max(2,Math.round(cd/mult));
  }
  return cd;
}
function initializeEventMetadata(){
  EVENTS.forEach(event=>{
    const id=getEventId(event);
    event.id=id;
    event.rarity=(event.rarity||'common').toLowerCase();
    event.cooldownDays=getEventCooldownDays(event);
    event.lastTriggeredDay=eventMemory[id]?.lastTriggeredDay??null;
    applyEventProtectedBy(event);
  });
}
function isEventStageUnlocked(event){
  if(!event.minStage)return true;
  return STAGE_ORDER.indexOf(hospitalStage)>=STAGE_ORDER.indexOf(event.minStage);
}
function isEventOffCooldown(event){
  const lastTriggeredDay=eventMemory[event.id]?.lastTriggeredDay;
  if(lastTriggeredDay==null)return true;
  return day-lastTriggeredDay>=getEventCooldownDays(event);
}
function isEventEligible(event){
  return isEventStageUnlocked(event)
    && isEventOffCooldown(event)
    && (!event.available||event.available());
}
function rollEventRarity(){
  const roll=Math.random();
  if(roll<EVENT_RARITY_CHANCES.legendary)return 'legendary';
  if(roll<EVENT_RARITY_CHANCES.legendary+EVENT_RARITY_CHANCES.rare)return 'rare';
  if(roll<EVENT_RARITY_CHANCES.legendary+EVENT_RARITY_CHANCES.rare+EVENT_RARITY_CHANCES.uncommon)return 'uncommon';
  return 'common';
}
function chooseEventByRarity(eventPool,rarity){
  const startIndex=Math.max(0,EVENT_RARITY_ORDER.indexOf(rarity));
  for(let i=startIndex;i<EVENT_RARITY_ORDER.length;i++){
    const bucket=eventPool.filter(event=>(event.rarity||'common')===EVENT_RARITY_ORDER[i]);
    if(bucket.length)return bucket[Math.floor(Math.random()*bucket.length)];
  }
  return null;
}
function recordEventTrigger(event){
  const memory=eventMemory[event.id]||{count:0,lastTriggeredDay:null};
  memory.lastTriggeredDay=day;
  memory.count=(memory.count||0)+1;
  eventMemory[event.id]=memory;
  event.lastTriggeredDay=day;
  eventStats.totalEvents=(eventStats.totalEvents||0)+1;
}
function resolveEventFollowUp(followUp,depth=0){
  if(!followUp||depth>2)return;
  if(Math.random()>=clamp(followUp.chance??0,0,1))return;
  addLog(`Follow-up event: ${followUp.title}.`,'w');
  if(typeof followUp.f==='function')followUp.f();
  if(followUp.followUp)resolveEventFollowUp(followUp.followUp,depth+1);
}
function randomEvent(){
  initializeEventMetadata();
  const dramaStaff=staff.filter(s=>s.hired&&s.personalityTrait?.id==='difficult');
  const activeShift=currentShift();
  const guardProtection=getGuardProtection(activeShift);
  const guardCount=getGuardCount(activeShift);
  const eventChance=clamp(0.18+dramaStaff.length*0.06-guardProtection*0.14-guardCount*0.035-getItSupportLevel(activeShift)*0.04,0.04,0.72);
  if(Math.random()<eventChance){
    triggerRandomEvent(guardProtection);
  }
}
function triggerRandomEvent(guardProtection=getGuardProtection(currentShift())){
  initializeEventMetadata();
  const eligibleEvents=EVENTS.filter(isEventEligible);
  if(!eligibleEvents.length)return;
  const preferredPool=guardProtection>=0.45&&Math.random()<0.65
    ?eligibleEvents.filter(e=>e.kind!=='negative')
    :eligibleEvents;
  const eventPool=preferredPool.length?preferredPool:eligibleEvents;
  const e=chooseEventByRarity(eventPool,rollEventRarity())||eventPool[0]||EVENTS[0];
  if(!e)return;
  recordEventTrigger(e);
  addLog(e.m,'');
  if(e.choices?.length){
    showEvent({
      icon:e.icon||'⚠️',
      category:e.category||'pressure',
      rarity:e.rarity||'common',
      title:e.title||'Hospital Event',
      desc:e.desc||e.m,
      impactHtml:e.impact||'<div>Operations were affected.</div>',
      choices:e.choices
    });
    return;
  }
  e.f();
  if(e.followUp)resolveEventFollowUp(e.followUp);
  showEvent({
    icon:e.icon||'⚠️',
    category:e.category||'pressure',
    rarity:e.rarity||'common',
    title:e.title||'Hospital Event',
    desc:e.desc||e.m,
    impactHtml:e.impact||'<div>Operations were affected.</div>',
    choices:[{label:'Continue',type:'primary',action:()=>{}}]
  });
}
