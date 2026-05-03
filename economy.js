// Economy owns persistence, monthly grading, wages, and random financial swings.
function serializeGame(){
  return{
    version:1,
    savedAt:Date.now(),
      customCenterName,
      hospitalStage,
      money,day,score,totalTreated,researchPoints,monthlyInc,incAccum,reputation,cleanliness,stress,adReach,
      floorGrids,floorSpecializations,floorSpecVersion:3,floorPanelHidden,floorPanelPosition,currentFloor,grid,rooms,patients,staff,staffPool,logs,
    selTool,gameTime,speed,paused,patId,staffId,zoom,buildMode,
    currentTab,debtDays,debtFreeDays,winStabilityDays,lowRepDays,dirtyDays,highStressDays,gameOver,loseReason,runOutcome,
    tutorialActive,tutorialStep,tutorialCompleted,
    softGuideDismissed,
    unlockedTools:[...unlockedTools],
    unlockedRoles:[...unlockedRoles],
    unlockedMilestones:[...unlockedMilestones],
    researchedTech:[...researchedTech],
    unlockedFeatures:[...unlockedFeatures],
    activeResearch,
    dispatchJobs,dispatchJobId,
    hasStarted,gradeIndex,gradeNote,
    monthRepAccum,monthCleanAccum,monthWaitAccum,monthSamples,monthDebtDays,monthHighWaitDays,
    budgetMonthIncome,budgetMonthExpenses,budgetMonthStartDay,
    departments,
    techTree,
    govRequired,govTreated,totalPatients,totalPublicCareTreated,
    recentAuditFailureDays,
    specialtyServiceStats:typeof specialtyServiceStats!=='undefined'?specialtyServiceStats:undefined,
    grantOffers,
    contractOffer,activeContract,lastContractId,insuranceContracts,freeBuildCredits,
    dailyGoal,dailyStats,staffShiftFilter,eventStats,eventMemory
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
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw){
      document.getElementById('hint').textContent='No saved hospital was found in local storage.';
      if(logs.length)addLog('No saved hospital was found in local storage.','w');
      return;
    }
    const data=JSON.parse(raw);
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
      floorGrids=Array.isArray(data.floorGrids)&&data.floorGrids.length
        ?data.floorGrids
        :Array.from({length:MAX_FLOORS},(_,idx)=>idx===0&&Array.isArray(data.grid)?data.grid:makeEmptyGrid());
      if(typeof migrateFloorSpecializations==='function'){
        floorSpecializations=migrateFloorSpecializations(data.floorSpecializations,floorGrids,data.floorSpecVersion);
      }
      floorPanelHidden=data.floorPanelHidden??true;
      floorPanelPosition=data.floorPanelPosition??null;
      currentFloor=data.currentFloor??1;
      grid=getFloorGrid(currentFloor);
    rooms=Array.isArray(data.rooms)?data.rooms.map(room=>({...room,floor:room.floor??1})):[]; 
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
    activeResearch=data.activeResearch??null;
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
    grantOffers=Array.isArray(data.grantOffers)?data.grantOffers:[];
    contractOffer=data.contractOffer??null;
    activeContract=data.activeContract??null;
    lastContractId=data.lastContractId??null;
    insuranceContracts=Array.isArray(data.insuranceContracts)
      ?data.insuranceContracts
      :(data.activeInsuranceContract?[{...data.activeInsuranceContract,daysLeft:data.insuranceDaysLeft??data.activeInsuranceContract.durationDays??10}]:[]);
    freeBuildCredits=data.freeBuildCredits||{gp:0};
    dailyGoal=data.dailyGoal??null;
    dailyStats=data.dailyStats||{treated:0,gpVisits:0,roomsBuilt:0,rolesHired:{},cleanDays:0};
    staffShiftFilter=data.staffShiftFilter??'day';
    eventStats={
      totalEvents:data.eventStats?.totalEvents??0,
      emergencies:data.eventStats?.emergencies??0,
      staffIncidents:data.eventStats?.staffIncidents??0,
      complaints:data.eventStats?.complaints??0
    };
    eventMemory=data.eventMemory&&typeof data.eventMemory==='object'?data.eventMemory:{};
    if(typeof specialtyServiceStats!=='undefined'){
      const ss=data.specialtyServiceStats&&typeof data.specialtyServiceStats==='object'?data.specialtyServiceStats:{};
      specialtyServiceStats={
        cosmeticCases:ss.cosmeticCases??0,
        studentVisits:ss.studentVisits??0,
        spermDeposits:ss.spermDeposits??0,
        ivfCycles:ss.ivfCycles??0,
        ethicsReviews:ss.ethicsReviews??0,
        complianceIncidents:ss.complianceIncidents??0,
        cryoReliability:ss.cryoReliability??100,
        universityContractActive:ss.universityContractActive??false
      };
    }
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
    addLog('Saved hospital loaded from local storage.','g');
  }catch(err){
    console.error(err);
    document.getElementById('hint').textContent='Load failed. The save data may be corrupted.';
    if(logs.length)addLog('Load failed. The save data may be corrupted.','b');
  }
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

function wageBill(){return staff.filter(s=>s.hired).reduce((a,s)=>a+s.salary,0);}

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
  {m:'A critical machine has gone down.',kind:'negative',category:'crisis',rarity:'uncommon',icon:'🛠️',title:'Equipment Failure',desc:'A clinical room has lost key equipment and is temporarily offline.',impact:'<div>One operational clinical room is disabled for a short time.</div><div>Stress rises while the room is unavailable.</div>',f:()=>{triggerEquipmentFailure();}},
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
      reputation=clamp(reputation+10,0,100);
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
      reputation=clamp(reputation+4,0,100);
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
  {id:'celebrity_cosmetic_case',m:'A celebrity is requesting a discreet cosmetic case at your Plastic Surgery OR.',kind:'positive',category:'opportunity',rarity:'rare',minStage:'medical',icon:'💎',title:'Celebrity Cosmetic Case',cooldownDays:14,
   desc:'A high-profile celebrity has chosen your Plastic Surgery service line for a discreet elective case.',
   impact:'<div>Large premium payout if accepted; reputation swing depending on the case outcome.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&specialtyLineFullyOperational('cosmetic'),
   choices:[
    {label:'Accept Concierge Case',type:'primary',action:()=>{changeMoney(11000);reputation=clamp(reputation+8,0,100);stress=clamp(stress+5,0,100);if(typeof specialtyServiceStats!=='undefined')specialtyServiceStats.cosmeticCases=(specialtyServiceStats.cosmeticCases||0)+1;addLog('Celebrity Cosmetic Case accepted. Premium revenue and reputation gained.','g');showToast('Celebrity case accepted','good');updateUI();}},
    {label:'Decline Quietly',type:'warn',action:()=>{reputation=clamp(reputation-3,0,100);addLog('Celebrity Cosmetic Case declined.','w');showToast('Celebrity case declined','warn');updateUI();}}
  ]},
  {id:'public_backlash_luxury_wing',m:'Public backlash is building over the hospital\u2019s luxury wing.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'medical',icon:'📰',title:'Public Backlash Over Luxury Wing',cooldownDays:18,
   desc:'Media coverage is criticising the cosmetic / luxury wing for prioritising private patients while public-care compliance slips.',
   impact:'<div>Reputation hit when public-care compliance is low.</div>',
   available:()=>{
     if(typeof specialtyLineFullyOperational!=='function'||!specialtyLineFullyOperational('cosmetic'))return false;
     const rate=typeof getPublicCareRate==='function'?getPublicCareRate():0;
     return rate<(typeof govRequired!=='undefined'?govRequired:0.5);
   },
   choices:[
    {label:'Pledge Free Public Slots',type:'primary',action:()=>{changeMoney(-3500);reputation=clamp(reputation+3,0,100);addLog('Public backlash defused with a free-slots pledge for public-care patients.','g');showToast('Public-care pledge','good');updateUI();}},
    {label:'Defend Private Wing',type:'danger',action:()=>{reputation=clamp(reputation-8,0,100);addLog('The luxury wing was defended publicly. Reputation took a hit.','b');showToast('Public backlash','warn');updateUI();}}
  ]},
  {id:'cryogenic_storage_failure',m:'A cryogenic storage alarm has fired in the fertility wing.',kind:'negative',category:'crisis',rarity:'uncommon',minStage:'medical',icon:'❄️',title:'Cryogenic Storage Failure',cooldownDays:16,
   desc:'A liquid-nitrogen failure has been detected in the cryogenic storage room.',
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
    {label:'Emergency Repair',type:'primary',action:()=>{const fragile=cleanliness<55||stress>70;changeMoney(fragile?-5500:-2800);reputation=clamp(reputation+(fragile?-6:-3),0,100);addLog('Cryogenic Storage Failure was contained.','b');showToast('Cryogenic repair','warn');updateUI();}},
    {label:'Public Disclosure',type:'warn',action:()=>{changeMoney(-2000);reputation=clamp(reputation-4,0,100);addLog('The Cryogenic Storage Failure was disclosed publicly.','w');showToast('Storage failure disclosed','warn');updateUI();}}
  ]},
  {id:'university_contract_renewal',m:'The partner university wants to renew its student-care contract.',kind:'positive',category:'opportunity',rarity:'uncommon',minStage:'medical',icon:'🎓',title:'University Contract Renewal',cooldownDays:30,
   desc:'The partner university is reviewing its annual student-care contract.',
   impact:'<div>Recurring student-care income; risk of contract loss if pushed too hard.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&specialtyLineFullyOperational('university'),
   choices:[
    {label:'Renew with Service Boost',type:'primary',action:()=>{changeMoney(4200);reputation=clamp(reputation+5,0,100);if(typeof specialtyServiceStats!=='undefined'){specialtyServiceStats.studentVisits=(specialtyServiceStats.studentVisits||0)+40;specialtyServiceStats.universityContractActive=true;}addLog('University Contract Renewal closed with a service boost. Recurring student income locked in.','g');showToast('Contract renewed','good');updateUI();}},
    {label:'Push for Higher Fees',type:'danger',action:()=>{const ok=Math.random()<0.55;if(ok){changeMoney(7500);reputation=clamp(reputation+2,0,100);if(typeof specialtyServiceStats!=='undefined')specialtyServiceStats.universityContractActive=true;addLog('University Contract Renewal closed at higher fees.','g');showToast('Contract renewed','good');}else{reputation=clamp(reputation-6,0,100);if(typeof specialtyServiceStats!=='undefined')specialtyServiceStats.universityContractActive=false;addLog('University Contract Renewal collapsed.','b');showToast('Contract lost','warn');}updateUI();}}
  ]},
  {id:'fertility_access_grant',m:'A reproductive-medicine grant is available for IVF / fertility access.',kind:'positive',category:'opportunity',rarity:'uncommon',minStage:'medical',icon:'🤰',title:'Fertility Access Grant',cooldownDays:24,
   desc:'A reproductive-medicine foundation is offering a fertility-access grant tied to IVF outcomes and ethics compliance.',
   impact:'<div>Cash + reputation if accepted; ethics-compliance research raises the payout.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&(specialtyLineFullyOperational('ivf')||specialtyLineFullyOperational('sperm_bank')),
   choices:[
    {label:'Accept Grant',type:'primary',action:()=>{const compliant=researchedTech.has('ethics_compliance_review');changeMoney(compliant?9000:5500);reputation=clamp(reputation+(compliant?7:4),0,100);const success=Math.random()<(compliant?0.7:0.5);if(success){if(typeof specialtyServiceStats!=='undefined')specialtyServiceStats.ivfCycles=(specialtyServiceStats.ivfCycles||0)+1;reputation=clamp(reputation+5,0,100);addLog('Fertility Access Grant accepted. A grant-funded cycle was successful.','g');}else{reputation=clamp(reputation-4,0,100);addLog('Fertility Access Grant accepted. A grant-funded cycle did not succeed.','b');}showToast('Fertility grant accepted','good');updateUI();}},
    {label:'Decline Grant',type:'warn',action:()=>{addLog('Fertility Access Grant was declined.','w');showToast('Grant declined','info');updateUI();}}
  ]},
  {id:'ethics_board_review',m:'The specialty service line ethics board has scheduled a compliance review.',kind:'negative',category:'pressure',rarity:'uncommon',minStage:'medical',icon:'⚖️',title:'Ethics Board Review',cooldownDays:20,
   desc:'Regulators are reviewing reproductive medicine and cosmetic programs.',
   impact:'<div>Reputation and cash risk; softened by Ethics and Compliance Review research.</div>',
   available:()=>typeof specialtyLineFullyOperational==='function'&&(specialtyLineFullyOperational('cosmetic')||specialtyLineFullyOperational('sperm_bank')||specialtyLineFullyOperational('ivf')),
   choices:[
    {label:'Cooperate Fully',type:'primary',action:()=>{const protected_=researchedTech.has('ethics_compliance_review');reputation=clamp(reputation+(protected_?6:2),0,100);if(typeof specialtyServiceStats!=='undefined')specialtyServiceStats.ethicsReviews=(specialtyServiceStats.ethicsReviews||0)+1;addLog(protected_?'The Ethics Board Review cleared cleanly thanks to the standing review board.':'The Ethics Board Review cleared, though documentation gaps were noted.','g');showToast('Ethics review cleared','good');updateUI();}},
    {label:'Push Back',type:'danger',action:()=>{const protected_=researchedTech.has('ethics_compliance_review');changeMoney(protected_?-1500:-4500);reputation=clamp(reputation+(protected_?-3:-9),0,100);if(typeof specialtyServiceStats!=='undefined')specialtyServiceStats.ethicsReviews=(specialtyServiceStats.ethicsReviews||0)+1;addLog('The hospital pushed back against Ethics Board Review findings. Penalties followed.','b');showToast('Ethics review penalty','warn');updateUI();}}
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
  return event.cooldownDays??EVENT_DEFAULT_COOLDOWNS[(event.rarity||'common').toLowerCase()]??2;
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
