// Patient flow stays together so arrivals, room needs, and treatment updates are easy to extend.
const PATIENT_TYPE_META={
  basic:{label:'Basic',short:'BAS',color:'#5e9bc7'},
  diagnostic:{label:'Diagnostic',short:'DX',color:'#7c8ee8'},
  emergency:{label:'Emergency',short:'ER',color:'#e26363'},
  inpatient:{label:'Inpatient',short:'IN',color:'#4ea07b'},
  critical:{label:'Critical',short:'ICU',color:'#c54b5e'},
  vip:{label:'VIP',short:'VIP',color:'#d2aa35'},
};
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
  return{
    id:patId++,
    urg,
    patientType,
    payerType:'private',
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
    displayLabel:getPatientTypeMeta(patientType).label,
    insuranceMultiplier:1,
    isPublic:false,
    publicCareCase:false,
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
  const primaryInsuranceContract=getPrimaryInsuranceContract();
  const insurancePatient=insuranceContracts.length>0&&Math.random()<Math.min(0.9,getInsuranceTrafficBonus());
  const payerType=shouldSpawnPublicPatient(patientType)?'public':'private';
  const publicCareCase=payerType==='public';
  const patient=createPatient(patientType,urg,{
    insuranceMultiplier:insurancePatient?getInsuranceRevenueMultiplier():1,
    payerType,
    isPublic:publicCareCase,
    publicCareCase,
    publicCareMultiplier:publicCareCase?getPublicCareMultiplier():1,
    privateRevenueMultiplier:payerType==='private'?getPrivatePatientMultiplier(patientType):1
  });
  if(insurancePatient){
    patient.contractTag='insurance';
    patient.displayLabel=`${primaryInsuranceContract?.name||'Insurance'} patient`;
  }
  if(publicCareCase){
    patient.displayLabel=patient.publicCareMultiplier<=0?'Public care case':'Public program patient';
  }else if(patient.patientType!=='vip'){
    patient.displayLabel='Private patient';
  }
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
  const patient=createPatient('emergency','urgent',{displayLabel:'Emergency case'});
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
  const patient=createPatient('vip','moderate',{contractTag:'vip',displayLabel:'VIP patient',insuranceMultiplier:1.75});
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
  const matching=rooms.filter(r=>r.type===type&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r));
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
      const longWaitThreshold=getEffectiveLongWaitThreshold()+(p.patientType==='basic'?(techBonus.basicWaitBonus||0):0);
      const untreatedThreshold=getEffectiveUntreatedLeaveThreshold()+(p.patientType==='basic'?(techBonus.basicWaitBonus||0)+2:0);
      if(p.waitTime===longWaitThreshold){
        reputation=clamp(reputation-2,0,100);
        repChanged=true;
        addLog('Patients are unhappy about long waits. Reputation -2.','w');
      }
      if(p.waitTime>=untreatedThreshold){
        p.state='leaving';
        p.exitReady=false;
        reputation=clamp(reputation-8,0,100);
        repChanged=true;
        addLog('A patient left untreated after waiting too long. Reputation -8.','b');
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
        p.tLeft=Math.ceil((RDEFS[rm.type].tt||3)*2*getSpeedMult(rm)*treatmentPenalty)+extra;
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
            payout=Math.round(
              RDEFS[rm.type].rev*
              getRevMult(rm)*
              (p.insuranceMultiplier||1)*
              (p.publicCareMultiplier??1)*
              (p.privateRevenueMultiplier??1)
            );
            if(p.isPublic)payout+=getPublicPatientGrantSubsidy?.()||0;
            incAccum+=payout;
          }
          score+=Math.max(1,10-Math.floor(p.waitTime/4))+getScoreBonus(rm);
          if(rm.type==='gp')dailyStats.gpVisits++;
          if(cleanliness<45)score=Math.max(0,score-1);
          if((treatingStaff?.traits||[]).some(trait=>trait.id==='careful'))cleanliness=clamp(cleanliness+0.4,0,100);
          if((treatingStaff?.traits||[]).some(trait=>trait.id==='sloppy'))cleanliness=clamp(cleanliness-0.8,0,100);
          if(rm.type==='cardiac_icu')stress=clamp(stress+1,0,100);
        }
        p.step++;
        p.roomId=null;
        if(p.step>=p.needs.length){
          p.state='leaving';
          p.exitReady=false;
          totalTreated++;
          dailyStats.treated++;
          totalPatients++;
          if(p.isPublic){
            govTreated++;
            totalPublicCareTreated++;
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
