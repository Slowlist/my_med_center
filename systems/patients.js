// Patient flow stays together so arrivals, room needs, and treatment updates are easy to extend.
const PATIENT_TYPE_META={
  basic:{label:'Basic',short:'BAS',color:'#5e9bc7'},
  diagnostic:{label:'Diagnostic',short:'DX',color:'#7c8ee8'},
  emergency:{label:'Emergency',short:'ER',color:'#e26363'},
  inpatient:{label:'Inpatient',short:'IN',color:'#4ea07b'},
  critical:{label:'Critical',short:'ICU',color:'#c54b5e'},
  vip:{label:'VIP',short:'VIP',color:'#d2aa35'},
};

// PAYER CATEGORIES
// ----------------
// A patient's clinical type (above) describes WHAT care they need; the
// payer category describes WHO pays and WHERE the patient came from. The
// two are independent: an Emergency patient might be Insurance-paid or
// Public-care-paid, a VIP patient is by definition VIP-paid, etc.
//
// Each category drives revenue, government quota credit, reputation
// volatility, wait tolerance, preferred clinical rooms, and the contract
// source the patient is associated with (or null for walk-ins).
const PAYER_CATEGORIES={
  public_care:{
    id:'public_care',label:'Public Care Patient',short:'PUB',color:'#4e7ab0',
    revenueMultiplier:0.30,
    publicCareCredit:1.0,
    reputationRisk:1.0,
    waitTolerance:1.10,
    preferredRooms:['waiting_room','gp','pharmacy','xray'],
    contractSource:null
  },
  insurance:{
    id:'insurance',label:'Insurance Patient',short:'INS',color:'#5e9bc7',
    revenueMultiplier:1.15,
    publicCareCredit:0,
    reputationRisk:1.0,
    waitTolerance:1.0,
    preferredRooms:['waiting_room','gp','xray','pharmacy','single_hospital_room'],
    contractSource:'insurance_contract'
  },
  private_pay:{
    id:'private_pay',label:'Private Pay Patient',short:'PVT',color:'#7c5cb0',
    revenueMultiplier:1.45,
    publicCareCredit:0,
    reputationRisk:1.10,
    waitTolerance:0.85,
    preferredRooms:['waiting_room','gp','single_hospital_room','vip_room','pharmacy'],
    contractSource:null
  },
  emergency:{
    id:'emergency',label:'Emergency Patient',short:'ER',color:'#e26363'
    ,revenueMultiplier:1.10,
    publicCareCredit:0.5,
    reputationRisk:1.60,
    waitTolerance:0.60,
    preferredRooms:['er','surgery','ward','general_icu','cardiac_icu'],
    contractSource:null
  },
  student:{
    id:'student',label:'Student Patient',short:'STU',color:'#4ea07b',
    revenueMultiplier:0.85,
    publicCareCredit:0.6,
    reputationRisk:0.90,
    waitTolerance:1.20,
    preferredRooms:['student_health_clinic','gp','pharmacy'],
    contractSource:'university_partnership'
  },
  correctional:{
    id:'correctional',label:'Correctional Patient',short:'COR',color:'#7d6a55',
    revenueMultiplier:1.05,
    publicCareCredit:0.4,
    reputationRisk:0.70,
    waitTolerance:1.30,
    preferredRooms:['prisoner_wing','gp','pharmacy'],
    contractSource:'corrections_contract',
    securityRisk:true
  },
  vip:{
    id:'vip',label:'VIP Patient',short:'VIP',color:'#d2aa35',
    revenueMultiplier:2.00,
    publicCareCredit:0,
    reputationRisk:2.00,
    waitTolerance:0.50,
    preferredRooms:['vip_room','gp','pharmacy','single_hospital_room'],
    contractSource:null
  }
};

function getPayerCategory(id){return PAYER_CATEGORIES[id]||PAYER_CATEGORIES.private_pay;}
function listPayerCategoryIds(){return Object.keys(PAYER_CATEGORIES);}

// Availability gates. Some payer categories only spawn when the right
// infrastructure or map is in place. These are checked at spawn time; if
// the gate is closed, the candidate is skipped and the picker falls
// through to the next option.
function isPayerCategoryAvailable(id){
  if(id==='insurance')return typeof insuranceContracts!=='undefined'&&insuranceContracts.length>0;
  if(id==='student'){
    // Either a Student Health Clinic is built OR the campus is the
    // University map (which represents an active university partnership).
    if(typeof rooms!=='undefined'&&rooms.some(r=>r.type==='student_health_clinic'))return true;
    // Campus id is `selectedCampusId` in game.js. The university campus
    // represents an active university partnership and unlocks student spawns.
    if(typeof selectedCampusId!=='undefined'&&selectedCampusId==='riverdale_university_health_campus')return true;
    return false;
  }
  if(id==='correctional'){
    return typeof rooms!=='undefined'&&rooms.some(r=>r.type==='prisoner_wing');
  }
  if(id==='vip'){
    // VIPs only walk in when a VIP room exists; the dedicated
    // spawnVipPatient() flow bypasses this for triggered VIP events.
    return typeof rooms!=='undefined'&&rooms.some(r=>r.type==='vip_room');
  }
  return true; // public_care, private_pay, emergency are always available
}

// Pick a payer category for a regular walk-in spawn. Honors the public-care
// quota pressure (so we still steer toward the Asherville requirement when
// behind), and only considers contract-driven sources when their gate is
// open.
function pickPayerCategory(){
  // Quota-priority: when behind on public-care, biased pick.
  const quotaBehind=typeof totalPatients!=='undefined'&&totalPatients>0
    &&typeof getPublicCareRate==='function'&&typeof govRequired!=='undefined'
    &&getPublicCareRate()<govRequired;
  // Weighted candidates. Weights are tuned so insurance/private dominate
  // when contracts are signed, while public_care remains the dependable
  // fallback. Student/correctional only show up when their gates are open.
  const weights=[
    {id:'public_care',w:quotaBehind?9:5},
    {id:'insurance',w:isPayerCategoryAvailable('insurance')?(typeof getInsuranceTrafficBonus==='function'?3+Math.round(getInsuranceTrafficBonus()*6):3):0},
    {id:'private_pay',w:quotaBehind?1:3},
    {id:'student',w:isPayerCategoryAvailable('student')?2:0},
    {id:'correctional',w:isPayerCategoryAvailable('correctional')?2:0},
    {id:'vip',w:isPayerCategoryAvailable('vip')?1:0}
  ];
  const total=weights.reduce((s,w)=>s+w.w,0);
  if(total<=0)return'public_care';
  let roll=Math.random()*total;
  for(const c of weights){
    roll-=c.w;
    if(roll<=0)return c.id;
  }
  return'public_care';
}
const ROOM_ROUTE_GUIDE={
  front_entrance:{uses:['Basic','Diagnostic','Inpatient','VIP'],before:['Arrival'],after:['Waiting Room']},
  staff_entrance:{uses:['Staff'],before:['Shift start'],after:['Clinical and support rooms']},
  er_entrance:{uses:['Emergency','Critical'],before:['Ambulance arrival'],after:['ER']},
  waiting_room:{uses:['Basic','Diagnostic','Emergency','Inpatient','VIP'],before:['Arrival'],after:['GP Office','ER','VIP Room']},
  gp:{uses:['Basic','Diagnostic','Inpatient'],before:['Waiting Room'],after:['Pharmacy','X-Ray','Hospital Room']},
  xray:{uses:['Diagnostic'],before:['GP Office'],after:['Pharmacy']},
  pharmacy:{uses:['Basic','Diagnostic','VIP'],before:['GP Office','X-Ray','VIP Room'],after:['Discharge']},
  er:{uses:['Emergency','Inpatient','Critical'],before:['Waiting Room'],after:['Ward','Surgery','Hospital Room','ICU']},
  ward:{uses:['Emergency'],before:['ER'],after:['Recovery']},
  surgery:{uses:['Emergency'],before:['ER'],after:['Ward','Recovery']},
  single_hospital_room:{uses:['Inpatient'],before:['GP Office','ER'],after:['Recovery','Discharge']},
  double_hospital_room:{uses:['Inpatient'],before:['GP Office','ER'],after:['Recovery','Discharge']},
  general_icu:{uses:['Critical'],before:['ER'],after:['Recovery','Discharge']},
  cardiac_icu:{uses:['Critical'],before:['ER'],after:['Recovery','Discharge']},
  vip_room:{uses:['VIP'],before:['Waiting Room'],after:['Pharmacy']},
};
function getPatientTypeMeta(type){return PATIENT_TYPE_META[type]||PATIENT_TYPE_META.basic;}
function getPatientTypeShortLabel(type){return getPatientTypeMeta(type).short;}
function getPatientTypeColor(patient){
  if(patient?.contractTag==='celebrity'||patient?.patientType==='vip')return PATIENT_TYPE_META.vip.color;
  return getPatientTypeMeta(patient?.patientType).color;
}
function getRoomRouteGuide(type){return ROOM_ROUTE_GUIDE[type]||{uses:['General'],before:['Mixed intake'],after:['Varies']};}
function createPatient(patientType,urg,overrides={}){
  // Resolve the payer category first so all the derived multipliers and
  // backwards-compat flags stay in sync. Defaults to private_pay so old
  // call-sites that don't pass a payer category still get sane behavior.
  const payerCategoryId=overrides.payerCategory||'private_pay';
  const payer=getPayerCategory(payerCategoryId);
  const isPublic=payer.publicCareCredit>=1;
  return{
    id:patId++,
    urg,
    patientType,
    // Backwards-compat: keep payerType ('public'|'private') derived from
    // the payer category so older code paths and saves still read sanely.
    payerType:isPublic?'public':'private',
    payerCategory:payerCategoryId,
    payerLabel:payer.label,
    revenueMultiplier:payer.revenueMultiplier,
    publicCareCredit:payer.publicCareCredit,
    reputationRisk:payer.reputationRisk,
    waitTolerance:payer.waitTolerance,
    contractSource:payer.contractSource||null,
    securityRisk:!!payer.securityRisk,
    needs:buildPatientRoute(patientType),
    step:0,
    roomId:null,
    waitTime:0,
    state:'waiting',
    vx:0,
    vy:0,
    exitReady:false,
    tLeft:0,
    contractTag:null,
    displayLabel:payer.label,
    // Legacy multipliers kept for compat with grants/insurance modifiers.
    // The new top-level revenueMultiplier above is the canonical source
    // of truth; these stay 1 by default and are still applied multiplicatively.
    insuranceMultiplier:1,
    isPublic,
    publicCareCase:isPublic,
    publicCareMultiplier:1,
    privateRevenueMultiplier:1,
    ...overrides
  };
}
function shouldSpawnPublicPatient(patientType){
  if(patientType==='vip')return false;
  const chance=(totalPatients===0||getPublicCareRate()<govRequired)
    ?PUBLIC_PATIENT_QUOTA_PRIORITY_SHARE
    :PUBLIC_PATIENT_SHARE;
  return Math.random()<chance;
}
function getPublicCareMultiplier(){
  return Math.random()<0.22?0:0.3;
}
function getPrivatePatientMultiplier(patientType){
  return patientType==='vip'?1.75:PRIVATE_PATIENT_REVENUE_MULTIPLIER;
}
function chooseHospitalRoomType(){
  if(isToolUnlocked('double_hospital_room')&&isToolUnlocked('single_hospital_room'))return Math.random()<0.5?'double_hospital_room':'single_hospital_room';
  if(isToolUnlocked('double_hospital_room'))return'double_hospital_room';
  if(isToolUnlocked('single_hospital_room'))return'single_hospital_room';
  return isToolUnlocked('ward')?'ward':null;
}
function chooseIcuType(){
  if(isToolUnlocked('cardiac_icu')&&Math.random()<0.45)return'cardiac_icu';
  if(isToolUnlocked('general_icu'))return'general_icu';
  return isToolUnlocked('ward')?'ward':null;
}
function pickPatientType(){
  if(isToolUnlocked('vip_room')&&Math.random()<0.06)return'vip';
  if(techTree?.basicImaging?.unlocked&&isToolUnlocked('xray')&&Math.random()<0.22)return'diagnostic';
  if(isToolUnlocked('general_icu')&&Math.random()<0.14)return'critical';
  if((isToolUnlocked('single_hospital_room')||isToolUnlocked('double_hospital_room'))&&Math.random()<0.22)return'inpatient';
  if(isToolUnlocked('xray')&&Math.random()<0.3)return'diagnostic';
  if(isToolUnlocked('er')&&Math.random()<0.24)return'emergency';
  return'basic';
}
function buildPatientRoute(patientType){
  if(patientType==='basic')return['waiting_room','gp','pharmacy'].filter(type=>isToolUnlocked(type));
  if(patientType==='diagnostic')return['waiting_room','gp','xray','pharmacy'].filter(type=>isToolUnlocked(type));
  if(patientType==='vip'){
    const vipStop=isToolUnlocked('vip_room')?'vip_room':'gp';
    return['waiting_room',vipStop,'pharmacy'].filter(type=>isToolUnlocked(type));
  }
  if(patientType==='emergency'){
    const recovery=isToolUnlocked('surgery')&&Math.random()<0.38?'surgery':(isToolUnlocked('ward')?'ward':chooseHospitalRoomType());
    return['waiting_room','er',recovery||'er'].filter(type=>isToolUnlocked(type));
  }
  if(patientType==='inpatient'){
    const admit=isToolUnlocked('er')&&Math.random()<0.35?'er':'gp';
    const roomType=chooseHospitalRoomType()||'ward';
    return['waiting_room',admit,roomType].filter(type=>isToolUnlocked(type));
  }
  if(patientType==='critical'){
    const icu=chooseIcuType()||'er';
    return['er',icu].filter(type=>isToolUnlocked(type));
  }
  return['waiting_room','gp','pharmacy'].filter(type=>isToolUnlocked(type));
}
function getOperationalEntrance(type){
  return rooms.find(r=>
    r.type===type&&
    getRoomFloor(r)===1&&
    roomHasVerticalAccess(r)&&
    isConn(r)
  )||null;
}
function getPatientEntryRoom(patientType){
  if(patientType==='critical'||patientType==='emergency'){
    return getOperationalEntrance('er_entrance')||getOperationalEntrance('front_entrance');
  }
  return getOperationalEntrance('front_entrance');
}
function placePatientAtEntrance(patient,entranceRoom){
  if(!patient||!entranceRoom)return false;
  const startTile=getRoomDoorTile(entranceRoom);
  const start=getTileCenter(startTile.x,startTile.y);
  patient.vx=start.x;
  patient.vy=start.y;
  patient.path=[];
  patient.pathIndex=0;
  patient.pathTargetRoom=null;
  patient.entryRoomId=entranceRoom.id;
  return true;
}
function spawnPatient(){
  if(gameOver)return;
  const intakeRooms=rooms.filter(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r));
  if(!intakeRooms.length)return;
  if(Math.random()>getPatientTrafficChance())return;
  const patientType=pickPatientType();
  const urg=patientType==='critical'||patientType==='emergency'?'urgent':patientType==='diagnostic'||patientType==='inpatient'||patientType==='vip'?'moderate':'minor';
  // New: payer category selection drives revenue/quota/reputation/wait
  // behavior. Falls through to public_care if nothing else is available.
  const payerCategoryId=pickPayerCategory();
  const primaryInsuranceContract=getPrimaryInsuranceContract();
  // Legacy insurance multiplier (from active insurance contract terms) stays
  // applied on top of the category's baseline so contract-specific bonuses
  // (e.g. premium tier) still matter.
  const insuranceBoost=payerCategoryId==='insurance'?getInsuranceRevenueMultiplier():1;
  const patient=createPatient(patientType,urg,{
    payerCategory:payerCategoryId,
    insuranceMultiplier:insuranceBoost,
    publicCareMultiplier:payerCategoryId==='public_care'?getPublicCareMultiplier():1
  });
  // Tag the patient with its source contract for downstream UI/tracking.
  if(payerCategoryId==='insurance'){
    patient.contractTag='insurance';
    patient.displayLabel=`${primaryInsuranceContract?.name||'Insurance'} patient`;
  }else if(payerCategoryId==='student'){
    patient.contractTag='student';
    patient.displayLabel='Student health patient';
  }else if(payerCategoryId==='correctional'){
    patient.contractTag='correctional';
    patient.displayLabel='Correctional patient';
  }else if(payerCategoryId==='vip'){
    patient.contractTag='vip';
    patient.displayLabel='VIP patient';
  }
  // Active scripted contracts override the regular spawn (celebrity case
  // takes precedence to make the contract progress).
  if(activeContract?.type==='celebrity'&&!activeContract.spawned){
    patient.contractTag='celebrity';
    patient.displayLabel='Celebrity case';
    patient.urg='moderate';
    patient.patientType='vip';
    patient.needs=buildPatientRoute('vip');
    activeContract.spawned=true;
  }else if(activeContract?.type==='free_cases'&&Math.random()<0.38){
    patient.contractTag='free_case';
    patient.displayLabel='Pro bono case';
  }
  const entranceRoom=getPatientEntryRoom(patient.patientType);
  if(!placePatientAtEntrance(patient,entranceRoom))return;
  patients.push(patient);
}
function spawnEmergencyPatient(){
  if(gameOver)return;
  const intakeRooms=rooms.filter(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r));
  if(!intakeRooms.length)return;
  const patient=createPatient('emergency','urgent',{payerCategory:'emergency',displayLabel:'Emergency case'});
  const entranceRoom=getPatientEntryRoom('emergency');
  if(!placePatientAtEntrance(patient,entranceRoom))return;
  patients.push(patient);
}
function spawnEmergencyPatients(count=1){
  for(let i=0;i<count;i++)spawnEmergencyPatient();
}
function spawnVipPatient(){
  if(gameOver)return;
  const intakeRooms=rooms.filter(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r));
  if(!intakeRooms.length)return;
  const patient=createPatient('vip','moderate',{payerCategory:'vip',contractTag:'vip',displayLabel:'VIP patient',insuranceMultiplier:1.75});
  const entranceRoom=getPatientEntryRoom('vip');
  if(!placePatientAtEntrance(patient,entranceRoom))return;
  patients.push(patient);
}

function buildVipNeeds(){
  return buildPatientRoute('vip');
}

function buildNeeds(urg){
  return urg==='urgent'?buildPatientRoute('emergency'):urg==='moderate'?buildPatientRoute('diagnostic'):buildPatientRoute('basic');
}

function findRoom(type){
  // Excludes rooms that are offline (outage/disabled) or missing required
  // links so outage/link efficiency factors actually halt throughput
  // rather than just dimming the score.
  const matching=rooms.filter(r=>r.type===type&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r)&&!isRoomTemporarilyDisabled(r)&&roomHasLinkRequirements(r));
  for(const rm of matching){
    const n=patients.filter(p=>p.roomId===rm.id&&p.state==='treating').length;
    const cap=RDEFS[rm.type].cap;
    if(n<cap)return rm;
  }
  return null;
}

function updatePatients(){
  let waiting=0;
  let repChanged=false;
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{basicWaitBonus:0,basicPatientSpeed:1};
  for(const p of patients){
    if(p.state==='waiting'){
      waiting++;
      p.waitTime++;
      // Wait thresholds and reputation impact are scaled by the payer
      // category: VIPs and Emergencies churn fast and hit reputation hard;
      // Public/Student/Correctional patients are more patient and less
      // reputation-volatile.
      const waitTol=p.waitTolerance??1;
      const repRisk=p.reputationRisk??1;
      const longWaitThreshold=Math.max(1,Math.round(
        (getEffectiveLongWaitThreshold()+(p.patientType==='basic'?(techBonus.basicWaitBonus||0):0))*waitTol
      ));
      const untreatedThreshold=Math.max(longWaitThreshold+1,Math.round(
        (getEffectiveUntreatedLeaveThreshold()+(p.patientType==='basic'?(techBonus.basicWaitBonus||0)+2:0))*waitTol
      ));
      if(p.waitTime===longWaitThreshold){
        const loss=Math.max(1,Math.round(2*repRisk));
        reputation=clamp(reputation-loss,0,100);
        repChanged=true;
        addLog(`${p.payerLabel||'Patients'} unhappy about long waits. Reputation -${loss}.`,'w');
      }
      if(p.waitTime>=untreatedThreshold){
        p.state='leaving';
        p.exitReady=false;
        const loss=Math.max(2,Math.round(8*repRisk));
        reputation=clamp(reputation-loss,0,100);
        repChanged=true;
        addLog(`A ${(p.payerLabel||'patient').toLowerCase()} left untreated after waiting too long. Reputation -${loss}.`,'b');
        continue;
      }
      const need=p.needs[p.step];
      if(!need){
        p.state='leaving';
        p.exitReady=false;
        continue;
      }
      const rm=findRoom(need);
      if(rm){
        p.roomId=rm.id;
        p.state='treating';
        const s=getStaffForRoom(rm.id);
        let extra=0;
        if(s?.personalityTrait?.waitAdd)extra+=s.personalityTrait.waitAdd;
        const treatmentPenalty=getEnergyTreatmentPenalty(s);
        // Apply room efficiency's *environmental* multiplier (cleanliness,
        // stress, nearby support) so a clean, well-supported, low-stress
        // room treats faster and a chaotic one slower. getSpeedMult already
        // covers staff/dept/floor-spec/renovation, so this stays orthogonal.
        const _envMult=typeof getRoomEfficiencyMultiplier==='function'?Math.max(0.7,getRoomEfficiencyMultiplier(rm)):1;
        p.tLeft=Math.ceil(((RDEFS[rm.type].tt||3)*2*getSpeedMult(rm)*treatmentPenalty)/_envMult)+extra;
        if(p.patientType==='basic'&&techBonus.basicPatientSpeed>1){
          p.tLeft=Math.max(1,Math.ceil(p.tLeft/techBonus.basicPatientSpeed));
        }
      }
    }else if(p.state==='treating'){
      p.tLeft--;
      if(p.tLeft<=0){
        const rm=rooms.find(r=>r.id===p.roomId);
        let treatingStaff=null;
        let payout=0;
        if(rm){
          treatingStaff=getStaffForRoom(rm.id);
          let errorChance=(treatingStaff?.traits||[]).reduce((sum,trait)=>sum+(trait.errorChance||0),0);
          if(treatingStaff&&treatingStaff.energy<30){
            errorChance+=0.05;
          }
          if(errorChance&&Math.random()<errorChance){
            p.tLeft=4;
            const errorTrait=(treatingStaff?.traits||[]).find(trait=>trait.errorChance)||treatingStaff?.workTrait||null;
            addLog(`${treatingStaff.name} made an error - patient re-treated.${errorTrait?` ${getTraitIcon(errorTrait)} ${errorTrait.label} triggered a setback.`:''}`,'b');
            continue;
          }
          if(p.contractTag!=='free_case'){
            // Revenue stack:
            //   base room revenue * room multiplier (staff/dept bonuses)
            //   * payer category baseline (revenueMultiplier)
            //   * legacy modifiers (insurance contract terms, public-care
            //     subsidies, private flat bonuses) — all default to 1 so
            //     this is a no-op for new categories that don't set them.
            const _envRevMult=typeof getRoomEfficiencyMultiplier==='function'?getRoomEfficiencyMultiplier(rm):1;
            payout=Math.round(
              RDEFS[rm.type].rev*
              getRevMult(rm)*
              (p.revenueMultiplier??1)*
              (p.insuranceMultiplier||1)*
              (p.publicCareMultiplier??1)*
              (p.privateRevenueMultiplier??1)*
              _envRevMult
            );
            if(p.isPublic)payout+=getPublicPatientGrantSubsidy?.()||0;
            incAccum+=payout;
          }
          score+=Math.max(1,10-Math.floor(p.waitTime/4))+getScoreBonus(rm);
          if(rm.type==='gp')dailyStats.gpVisits++;
          if(cleanliness<45)score=Math.max(0,score-1);
          if((treatingStaff?.traits||[]).some(trait=>trait.id==='careful'))cleanliness=clamp(cleanliness+0.4,0,100);
          if((treatingStaff?.traits||[]).some(trait=>trait.id==='sloppy')){
            const sloppyImpact=typeof negImpact==='function'?negImpact(treatingStaff):1;
            cleanliness=clamp(cleanliness-(0.8*sloppyImpact),0,100);
          }
          if(rm.type==='cardiac_icu')stress=clamp(stress+1,0,100);
        }
        if(window.animPolish)window.animPolish.pulseRoomActivity(rm);
        if(window.playSound)window.playSound('patient_treated');
        p.step++;
        p.roomId=null;
        if(p.step>=p.needs.length){
          p.state='leaving';
          p.exitReady=false;
          totalTreated++;
          dailyStats.treated++;
          totalPatients++;
          // Public-care credit is now fractional: a Public Care patient
          // counts fully (1.0), Emergency 0.5, Student 0.6, Correctional 0.4,
          // Insurance/Private/VIP 0. govTreated stays a sum used as
          // numerator in getPublicCareRate(), so a float total is fine.
          const credit=p.publicCareCredit??(p.isPublic?1:0);
          if(credit>0){
            govTreated+=credit;
            // totalPublicCareTreated remains an integer counter of
            // patients who counted at all toward the quota.
            totalPublicCareTreated++;
          }
          // Correctional patients carry a small security risk: when guards
          // are thin on the current shift, treating one nudges stress up.
          if(p.securityRisk&&typeof getGuardCount==='function'){
            try{
              const guards=getGuardCount(typeof currentShift==='function'?currentShift():null);
              if(guards<1&&typeof stress!=='undefined'){
                stress=clamp(stress+1,0,100);
              }
            }catch(e){/* non-fatal */}
          }
          const researchPointGain=1+Math.floor(Math.random()*5);
          researchPoints+=researchPointGain;
          reputation=clamp(reputation+3,0,100);
          if(rm?.type==='single_hospital_room')reputation=clamp(reputation+1,0,100);
          if(p.patientType==='vip'&&rm?.type==='vip_room')reputation=clamp(reputation+2,0,100);
          const directorTrait=getDirectorTrait();
          if(directorTrait?.repOnTreat)reputation=clamp(reputation+directorTrait.repOnTreat,0,100);
          const staffRepBonus=(treatingStaff?.traits||[]).reduce((sum,trait)=>sum+(trait.repOnTreat||0),0);
          if(staffRepBonus)reputation=clamp(reputation+staffRepBonus,0,100);
          if(rm&&isClinicalRoomType(rm.type))awardInternXp(rm.type,currentShift(),1);
          // Unified XP: the staff member who actually treated the patient gains XP from the case.
          if(treatingStaff&&typeof awardStaffXp==='function'){
            awardStaffXp(treatingStaff,2,'treat_patient');
            // Clinical-room support staff (nurses/CNAs/etc. assigned via supportRoles) earn a
            // smaller share of XP per case — they're learning on the floor too.
            const def=rm?RDEFS[rm.type]:null;
            const supportRoles=def?.supportRoles||[];
            supportRoles.forEach(role=>{
              const helper=getAssignedStaffForRoomRole?.(rm.id,role);
              if(helper&&helper.id!==treatingStaff.id){
                awardStaffXp(helper,0.8,'support_tick');
              }
            });
          }
          if(treatingStaff?.personalityTrait?.id==='friendly'&&Math.random()<0.35){
            reputation=clamp(reputation+1,0,100);
            addLog(`${getTraitIcon(treatingStaff.personalityTrait)} ${treatingStaff.name}'s Friendly trait boosted patient satisfaction. Reputation +1.`,'g');
          }
          repChanged=true;
          addLog(`RP earned: +${researchPointGain}.`,'g');
          showToast('Patient treated','good');
          if(payout>0)spawnHudFloat?.('.stat-cash',`+$${payout.toLocaleString('en-US')}`,'money');
          if(activeContract?.type==='free_cases'&&p.contractTag==='free_case'){
            activeContract.progress++;
            addLog(`Contract progress: pro bono case treated (${activeContract.progress}/${activeContract.target}).`,'');
            if(activeContract.progress>=activeContract.target)completeActiveContract();
          }else if(activeContract?.type==='celebrity'&&p.contractTag==='celebrity'){
            activeContract.progress++;
            addLog('Celebrity contract complete. The donor is thrilled.','g');
            completeActiveContract();
          }
        }else{
          p.state='waiting';
          p.exitReady=false;
        }
      }
    }
  }
  patients=patients.filter(p=>!(p.state==='leaving'&&p.exitReady));
  document.getElementById('spat').textContent=researchPoints;
  document.getElementById('swait').textContent=waiting;
  updateStressUI(waiting);
  document.getElementById('rwaiting').textContent=waiting;
  document.getElementById('rwaitingwarn').textContent=getWaitingStatus(waiting);
  document.getElementById('sscore').textContent=Math.floor(score);
  document.getElementById('rtreated').textContent=totalTreated;
  if(repChanged){
    document.getElementById('srep').textContent=Math.round(reputation);
    document.getElementById('rrep').textContent=Math.round(reputation);
    document.getElementById('rrepwarn').textContent=getReputationStatus();
    if(reputation<=0)checkLoseConditions();
  }
  if(totalTreated===50)addLog('Goal reached: 50 patients treated!','g');
}
