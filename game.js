// Core bootstrap, shared state, rendering, and the main loop stay here.
const T=32,COLS=27,ROWS=15;
const MAX_FLOORS=10;
const FLOOR_SPECIALIZATIONS={
  general:{label:'General',icon:'🏥'},
  admissions:{label:'Gen Admission',icon:'🛏️'},
  pediatrics:{label:'Pediatrics',icon:'🧸'},
  cardiac:{label:'Cardiac',icon:'❤️'},
  surgical:{label:'Surgical',icon:'🩺'},
  diagnostics:{label:'Diagnostics',icon:'🧪'},
  trauma:{label:'ER / Trauma',icon:'🚨'},
  critical_care:{label:'Critical Care',icon:'⚕️'},
  vip:{label:'VIP',icon:'👑'},
  admin:{label:'Administration',icon:'📋'}
};
const STARTING_CASH=500000;
const TICK_MS=900;
const DAY_TICKS=14;
const SHIFT_TICKS=DAY_TICKS/2;
const PATIENT_SPAWN_TICKS=6;
const INCOME_TICKS=35;
const EVENT_TICKS=70;
const OPERATIONS_PULSE_MS=30000;
let govRequired=0.35;
const PUBLIC_PATIENT_SHARE=0.55;
const PUBLIC_PATIENT_QUOTA_PRIORITY_SHARE=10/11;
const PRIVATE_PATIENT_REVENUE_MULTIPLIER=1.18;
const ZOOM_LEVELS=[0.8,1,1.2,1.4,1.6];
const ZOOM_TWEEN_MS=150;
const PATH_COSTS={corridor:100,luxury_path:180};
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
cv.width=COLS*T;cv.height=ROWS*T;
function makeEmptyGrid(){return Array.from({length:ROWS},()=>Array(COLS).fill(null));}
function makeFloorGrids(){return Array.from({length:MAX_FLOORS},()=>makeEmptyGrid());}
function makeFloorSpecializations(){return Object.fromEntries(Array.from({length:MAX_FLOORS},(_,idx)=>[idx+1,'general']));}

const RDEFS={
  front_entrance:{name:'Front Entrance',color:'#d7edf9',border:'#5d8fb3',cost:800,w:2,h:1,cap:0,icon:'FE',rev:0,tt:0,staffRole:null},
  staff_entrance:{name:'Staff Entrance',color:'#d8e5f8',border:'#687ea8',cost:450,w:1,h:1,cap:0,icon:'SE',rev:0,tt:0,staffRole:null},
  er_entrance:{name:'ER Entrance',color:'#ffd2d2',border:'#c45a5a',cost:950,w:2,h:1,cap:0,icon:'EE',rev:0,tt:0,staffRole:null},
  waiting_room:{name:'Waiting Room',color:'#f6de7a',border:'#b88d21',cost:900,w:4,h:2,cap:14,icon:'WR',rev:50,tt:2,staffRole:'clerical'},
  nurse_station:{name:'Nurse Station',color:'#cdb8f3',border:'#7650b5',cost:1400,w:2,h:2,cap:0,icon:'NS',rev:0,tt:0,staffRole:null},
  staff_room:{name:'Staff Room',color:'#d7c8f2',border:'#7b64b7',cost:1800,w:2,h:2,cap:0,icon:'SR',rev:0,tt:0,staffRole:null},
  lunch_room:{name:'Lunch Room',color:'#e4caf8',border:'#875bb8',cost:1600,w:2,h:2,cap:0,icon:'LR',rev:0,tt:0,staffRole:null},
  bathroom:{name:'Bathrooms',color:'#d8eef6',border:'#5d9db8',cost:700,w:1,h:1,cap:0,icon:'WC',rev:0,tt:0,staffRole:null},
  janitor_closet:{name:'Janitor Closet',color:'#d8f0cc',border:'#6e9a58',cost:1100,w:2,h:1,cap:0,icon:'JC',rev:0,tt:0,staffRole:null},
  hvac_generator:{name:'HVAC / Power Generator',color:'#d7e6d5',border:'#5f8870',cost:2200,w:2,h:2,cap:0,icon:'HV',rev:0,tt:0,staffRole:null},
  research_department:{name:'Research Department',color:'#d8dcfb',border:'#5f66bf',cost:2800,w:2,h:2,cap:1,icon:'RD',rev:0,tt:0,staffRole:'researcher'},
  grant_writer_office:{name:'Grant Writer Office',color:'#d9efe5',border:'#5f9b84',cost:2400,w:2,h:2,cap:1,icon:'GW',rev:0,tt:0,staffRole:'grant_writer'},
  vending_machine:{name:'Vending Machine',color:'#ffd8a8',border:'#c47e2b',cost:500,w:1,h:1,cap:0,icon:'VM',rev:0,tt:0,staffRole:null},
  drink_station:{name:'Drink Dispenser',color:'#cde8ff',border:'#4e8ab5',cost:450,w:1,h:1,cap:0,icon:'DR',rev:0,tt:0,staffRole:null},
  atm_kiosk:{name:'ATM',color:'#d7ecd5',border:'#5f9a66',cost:650,w:1,h:1,cap:0,icon:'ATM',rev:0,tt:0,staffRole:null},
  security_office:{name:'Security Office',color:'#c9d0da',border:'#5c6673',cost:2100,w:2,h:2,cap:0,icon:'SO',rev:0,tt:0,staffRole:'security_officer'},
  it_department:{name:'IT Department',color:'#b7d7f6',border:'#427bad',cost:2400,w:2,h:2,cap:0,icon:'IT',rev:0,tt:0,staffRole:'it_specialist'},
  marketing_office:{name:'Marketing Office',color:'#ffd0d7',border:'#c05d78',cost:2300,w:2,h:2,cap:0,icon:'MK',rev:0,tt:0,staffRole:'marketing_manager'},
  hr_office:{name:'HR Office',color:'#f6c9dd',border:'#b8698a',cost:2600,w:2,h:2,cap:1,icon:'HR',rev:0,tt:0,staffRole:'hr_manager'},
  dispatch_office:{name:'Dispatch Office',color:'#c79bff',border:'#7240bb',cost:3200,w:2,h:2,cap:2,icon:'DO',rev:0,tt:0,staffRole:'dispatcher'},
  ambulance_bay:{name:'Ambulance Bay',color:'#d6ebf9',border:'#4b7cab',cost:2600,w:3,h:2,cap:1,icon:'AB',rev:0,tt:0,staffRole:null},
  staircase:{name:'Staircase',color:'#e4ddd0',border:'#8a7d68',cost:1800,w:2,h:2,cap:0,icon:'ST',rev:0,tt:0,staffRole:null},
  elevator:{name:'Elevator',color:'#d5e3ec',border:'#5f7688',cost:2600,w:2,h:2,cap:0,icon:'EL',rev:0,tt:0,staffRole:null},
  gp:{name:'GP Office',color:'#7cbfff',border:'#236fb3',cost:1500,w:2,h:2,cap:3,icon:'GP',rev:200,tt:3,staffRole:'gp_doc'},
  vip_room:{name:'VIP Room',color:'#ffe789',border:'#e0a81f',cost:4200,w:3,h:2,cap:2,icon:'VP',rev:650,tt:4,staffRole:'gp_doc',supportRoles:['nurse','clerical']},
  er:{name:'ER',color:'#ff8b8b',border:'#bf2f2f',cost:3000,w:4,h:4,cap:6,icon:'ER',rev:500,tt:2,staffRole:'er_doc'},
  med_surg:{name:'Med-Surg',color:'#b8e0d0',border:'#4f9380',cost:5200,w:4,h:3,cap:10,icon:'MS',rev:320,tt:6,staffRole:'nurse',supportRoles:['cna']},
  pediatrics:{name:'Pediatrics',color:'#ffd7ec',border:'#c46ba0',cost:3600,w:3,h:2,cap:4,icon:'PD',rev:260,tt:4,staffRole:'gp_doc',supportRoles:['nurse']},
  obgyn:{name:'OB/GYN',color:'#ffd3dd',border:'#d2708d',cost:5400,w:3,h:3,cap:3,icon:'OB',rev:700,tt:6,staffRole:'surgeon',supportRoles:['nurse']},
  radiology:{name:'Radiology',color:'#d7ddfb',border:'#6676c3',cost:4800,w:3,h:2,cap:3,icon:'RA',rev:450,tt:5,staffRole:'dept_attending'},
  head_office:{name:'Dept. Head Office',color:'#d3b8ea',border:'#7d57ab',cost:2200,w:2,h:2,cap:1,icon:'DH',rev:0,tt:0,staffRole:'dept_attending'},
  xray:{name:'X-Ray',color:'#c4b4e8',border:'#6050b8',cost:2000,w:2,h:2,cap:2,icon:'XR',rev:300,tt:4,staffRole:'dept_attending'},
  pharmacy:{name:'Pharmacy',color:'#f0d080',border:'#a88020',cost:1200,w:2,h:1,cap:4,icon:'Rx',rev:150,tt:1,staffRole:'pharmacist'},
  surgery:{name:'Surgery',color:'#f0c090',border:'#b06820',cost:6000,w:3,h:3,cap:2,icon:'Op',rev:1200,tt:8,staffRole:'surgeon',supportRoles:['er_attending']},
  ward:{name:'Ward',color:'#b0ddd4',border:'#408880',cost:2500,w:3,h:2,cap:8,icon:'Wd',rev:180,tt:6,staffRole:'nurse',supportRoles:['cna']},
  rehab:{name:'Rehab',color:'#d6f0d8',border:'#5f9d67',cost:3200,w:3,h:2,cap:4,icon:'RH',rev:220,tt:4,staffRole:'nurse',supportRoles:['cna']},
  single_hospital_room:{name:'Single Hospital Room',color:'#c7ebe3',border:'#4b9e92',cost:3400,w:2,h:2,cap:2,icon:'1R',rev:260,tt:5,staffRole:'nurse',supportRoles:['cna']},
  double_hospital_room:{name:'Double Hospital Room',color:'#b3e1d7',border:'#3f8c82',cost:4800,w:3,h:2,cap:4,icon:'2R',rev:420,tt:6,staffRole:'nurse',supportRoles:['cna']},
  general_icu:{name:'General ICU',color:'#f2b0b8',border:'#bb5666',cost:7500,w:3,h:2,cap:2,icon:'IC',rev:900,tt:7,staffRole:'nurse',supportRoles:['er_attending']},
  cardiac_icu:{name:'Cardiac ICU',color:'#f3a0a9',border:'#b63b4b',cost:8800,w:3,h:2,cap:2,icon:'CI',rev:1100,tt:8,staffRole:'nurse',supportRoles:['er_attending','dept_attending']},
  lab:{name:'Lab',color:'#cce0a0',border:'#689820',cost:2800,w:2,h:2,cap:3,icon:'Lb',rev:250,tt:3,staffRole:'dept_attending'},
  cardiology:{name:'Cardiology',color:'#ffd4d8',border:'#c85b68',cost:6200,w:3,h:2,cap:3,icon:'CA',rev:850,tt:6,staffRole:'dept_attending',supportRoles:['nurse']},
  oncology:{name:'Oncology',color:'#e5d7f8',border:'#8a65bf',cost:6800,w:3,h:3,cap:4,icon:'ON',rev:780,tt:7,staffRole:'dept_attending',supportRoles:['nurse']},
  behavioral_health:{name:'Behavioral Health',color:'#d8d6f7',border:'#736ec4',cost:4200,w:3,h:2,cap:4,icon:'BH',rev:260,tt:5,staffRole:'gp_doc',supportRoles:['nurse']},
  geriatrics:{name:'Geriatrics',color:'#e7e2ce',border:'#9e8f5a',cost:3400,w:3,h:2,cap:4,icon:'GE',rev:240,tt:5,staffRole:'gp_doc',supportRoles:['nurse','cna']},
  administration:{name:'Administration',color:'#dae2f2',border:'#6f7e97',cost:3800,w:3,h:2,cap:2,icon:'AD',rev:0,tt:0,staffRole:'medical_director',supportRoles:['hr_manager']},
  case_management:{name:'Case Management',color:'#dce9f6',border:'#6991b0',cost:2600,w:2,h:2,cap:2,icon:'CM',rev:0,tt:0,staffRole:'clerical'},
};
const ROOM_SHORT_LABELS={
  front_entrance:'ENT',
  staff_entrance:'STF',
  er_entrance:'ERE',
  waiting_room:'WR',
  nurse_station:'NS',
  staff_room:'SR',
  lunch_room:'LR',
  bathroom:'WC',
  janitor_closet:'JAN',
  hvac_generator:'HVAC',
  research_department:'RSD',
  grant_writer_office:'GRN',
  vending_machine:'VEN',
  drink_station:'DRK',
  atm_kiosk:'ATM',
  security_office:'SEC',
  it_department:'IT',
  marketing_office:'MKT',
  hr_office:'HR',
  dispatch_office:'DSP',
  ambulance_bay:'AMB',
  staircase:'STA',
  elevator:'ELV',
  gp:'GP',
  vip_room:'VIP',
  er:'ER',
  med_surg:'MS',
  pediatrics:'PED',
  obgyn:'OB',
  radiology:'RAD',
  head_office:'HOD',
  xray:'XR',
  pharmacy:'Rx',
  surgery:'OR',
  ward:'WRD',
  rehab:'RHB',
  single_hospital_room:'SGL',
  double_hospital_room:'DBL',
  general_icu:'ICU',
  cardiac_icu:'CIC',
  lab:'LAB',
  cardiology:'CRD',
  oncology:'ONC',
  behavioral_health:'BHV',
  geriatrics:'GER',
  administration:'ADM',
  case_management:'CAS',
};
const ROOM_MAP_SYMBOLS={
  front_entrance:'🚪',
  staff_entrance:'👥',
  er_entrance:'🚑',
  waiting_room:'🪑',
  nurse_station:'🩺',
  staff_room:'🛋',
  lunch_room:'🥪',
  bathroom:'🚻',
  janitor_closet:'🧹',
  hvac_generator:'💨',
  research_department:'🔬',
  grant_writer_office:'📝',
  vending_machine:'🥤',
  drink_station:'🚰',
  atm_kiosk:'🏧',
  security_office:'👮',
  it_department:'💻',
  marketing_office:'📣',
  hr_office:'📋',
  dispatch_office:'🚑',
  ambulance_bay:'🚑',
  staircase:'🪜',
  elevator:'🛗',
  gp:'🩺',
  vip_room:'👑',
  er:'✚',
  med_surg:'🛏️',
  pediatrics:'🧸',
  obgyn:'👶',
  radiology:'🩻',
  head_office:'🏢',
  xray:'🦴',
  pharmacy:'💊',
  surgery:'⚕',
  ward:'🛏',
  rehab:'🦿',
  single_hospital_room:'🛏',
  double_hospital_room:'🛏',
  general_icu:'🫀',
  cardiac_icu:'❤️',
  lab:'🧪',
  cardiology:'❤️',
  oncology:'🎗️',
  behavioral_health:'🧠',
  geriatrics:'🧓',
  administration:'📋',
  case_management:'🗂️',
};
const STAGES={
  clinic:{
    name:'Clinic',
    requirements:[],
    unlocks:['waiting_room','gp']
  },
  small:{
    name:'Small Hospital',
    requirements:[
      {id:'reputation',label:'Reputation',target:60},
      {id:'treated',label:'Patients Treated',target:20},
      {id:'research',label:'Research Completed',target:1},
    ],
    unlocks:['pharmacy','pharmacist','intern','basic_research','pediatrics','rehab','case_management']
  },
  expanding:{
    name:'Expanding Facility',
    requirements:[
      {id:'reputation',label:'Reputation',target:70},
      {id:'treated',label:'Patients Treated',target:50},
      {id:'research',label:'Research Completed',target:3},
      {id:'staff',label:'Hired Staff',target:8},
    ],
    unlocks:['er','dispatch_office','ambulance_bay','dispatcher','driver','security_office','security_officer','radiology','behavioral_health','geriatrics','administration']
  },
  medical:{
    name:'Medical Center',
    requirements:[
      {id:'reputation',label:'Reputation',target:80},
      {id:'treated',label:'Patients Treated',target:100},
      {id:'research',label:'Research Completed',target:5},
      {id:'staff',label:'Hired Staff',target:12},
      {id:'er_operational',label:'ER Operational',target:1},
    ],
    unlocks:['ward','surgery','head_office','medical_director','vip_room','luxury_path','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','med_surg','obgyn','cardiology','oncology']
  }
};
const DEPARTMENT_DEFS={
  er:{label:'ER',baseCost:5000,startLevel:1,rooms:['er','general_icu','cardiac_icu','surgery'],bonus:`Faster emergency throughput`},
  lab:{label:'Lab',baseCost:3000,startLevel:1,rooms:['lab','xray','radiology'],bonus:`Faster diagnostics and testing`},
  ward:{label:'Ward',baseCost:3500,startLevel:1,rooms:['ward','med_surg','single_hospital_room','double_hospital_room','geriatrics','oncology'],bonus:`Stronger inpatient turnover and recovery flow`},
  operations:{label:'Operations',baseCost:4000,startLevel:1,rooms:['administration','case_management','security_office','hr_office','hvac_generator'],bonus:`Lower stress and steadier cleanliness`}
};
function makeDepartments(){
  return{
    er:{level:1},
    lab:{level:1},
    ward:{level:1},
    operations:{level:1}
  };
}
function makeTechTree(){
  return{
    basicTriage:{unlocked:false},
    fastTrack:{unlocked:false},
    criticalResponse:{unlocked:false},
    basicImaging:{unlocked:false},
    fasterLabProcessing:{unlocked:false},
    staffScheduling:{unlocked:false},
    breakOptimization:{unlocked:false},
    governmentCompliance:{unlocked:false},
    contractNegotiation:{unlocked:false}
  };
}
function normalizeSalaryAmount(amount){
  return Math.max(100,Math.round((Number(amount)||0)/50)*50);
}
function getFloorColor(floor){
  if(floor===1)return'#f5f0e6';
  if(floor===2)return'#eef6fb';
  return'#e6eef5';
}
const styles={
  public:{
    bg:getFloorColor(1),
    corridor:'#d8e8f5'
  },
  clinical:{
    bg:getFloorColor(2),
    corridor:'#c9d9e6'
  },
  advanced:{
    bg:getFloorColor(3),
    corridor:'#bfd0de'
  }
};
function getFloorStyle(floor){
  if(floor===1)return styles.public;
  if(floor===2)return styles.clinical;
  return styles.advanced;
}

const ROLES={
  clerical:{label:'Clerical Staff',color:'#5a9e52',baseSalary:600},
  intern:{label:'Intern',color:'#6aa84f',baseSalary:600},
  security_officer:{label:'Guard',color:'#57697d',baseSalary:1200},
  it_specialist:{label:'IT Specialist',color:'#427bad',baseSalary:1800},
  grant_writer:{label:'Grant Writer',color:'#5d9a84',baseSalary:1400},
  marketing_manager:{label:'Marketing Manager',color:'#c05d78',baseSalary:1700},
  hr_manager:{label:'HR Manager',color:'#b8698a',baseSalary:1900},
  medical_director:{label:'Medical Director',color:'#6a5ed1',baseSalary:9000},
  gp_doc:{label:'GP Doctor',color:'#3a80b8',baseSalary:2250},
  er_doc:{label:'ER Doctor',color:'#b83030',baseSalary:2750},
  er_attending:{label:'ER Attending',color:'#b06820',baseSalary:4000},
  dept_attending:{label:'Dept. Attending',color:'#6050b8',baseSalary:3250},
  surgeon:{label:'Surgeon',color:'#935d1c',baseSalary:4500},
  nurse:{label:'Nurse',color:'#2a8c9d',baseSalary:1600},
  charge_nurse:{label:'Charge Nurse',color:'#2d7d8e',baseSalary:2100},
  cna:{label:'CNA',color:'#5470a8',baseSalary:1100},
  dispatcher:{label:'Dispatcher',color:'#4b7cab',baseSalary:1400},
  driver:{label:'Driver',color:'#6d8f4c',baseSalary:1300},
  pharmacist:{label:'Pharmacist',color:'#a88020',baseSalary:1750},
  janitor:{label:'Janitor',color:'#627d62',baseSalary:900},
  researcher:{label:'Researcher',color:'#5c63b8',baseSalary:1700},
};

const STAGE_ORDER=['clinic','small','expanding','medical'];
const STARTING_TOOLS=['corridor','front_entrance','staff_entrance','waiting_room','nurse_station','staff_room','lunch_room','bathroom','janitor_closet','hvac_generator','research_department','grant_writer_office','vending_machine','drink_station','atm_kiosk','it_department','marketing_office','hr_office','staircase','elevator','gp','demolish'];
const STARTING_ROLES=['clerical','it_specialist','grant_writer','marketing_manager','hr_manager','gp_doc','janitor','nurse','charge_nurse','researcher'];
const GRANT_LIBRARY=[
  {id:'public_care_support',category:'Government Grants',label:'Public Care Support Grant',desc:'Offsets free or low-profit patients for one week.',rewardText:'$8,000 approval funding + public care subsidy for 7 days',reviewDays:3,successChance:0.7,durationDays:7,effect:{kind:'public_subsidy',approvalCash:8000,subsidyPerCase:90},requirementText:'Requires current government compliance.'},
  {id:'community_health_access',category:'Government Grants',label:'Community Health Access Grant',desc:'Rewards strong public-patient throughput if waits stay under control.',rewardText:'Cash and reputation bonus on approval',reviewDays:3,successChance:0.72,durationDays:0,effect:{kind:'public_volume_bonus',approvalCash:6000,reputation:3},requirementText:'Needs high public volume and manageable waits.'},
  {id:'emergency_readiness',category:'Government Grants',label:'Emergency Readiness Grant',desc:'Supports ER growth and ambulance readiness.',rewardText:'ER and Ambulance Bay construction discount for 8 days',reviewDays:2,successChance:0.74,durationDays:8,effect:{kind:'room_discount',roomTypes:['er','ambulance_bay'],discount:0.4},requirementText:'Requires an operational ER or Ambulance Bay.'},
  {id:'rural_underserved',category:'Government Grants',label:'Rural / Underserved Care Grant',desc:'Provides recurring support for public-heavy hospitals.',rewardText:'Recurring public-care subsidy for 10 days',reviewDays:4,successChance:0.68,durationDays:10,effect:{kind:'public_subsidy',approvalCash:5000,subsidyPerCase:65},requirementText:'Private patient ratio cannot be too high.'},
  {id:'diagnostic_modernization',category:'Medical Department Grants',label:'Diagnostic Modernization Grant',desc:'Supports Lab, X-Ray, and future imaging upgrades.',rewardText:'Diagnostic department upgrade discount for 10 days',reviewDays:3,successChance:0.75,durationDays:10,effect:{kind:'department_discount',departments:['lab'],discount:0.35},requirementText:'Requires Lab or X-Ray built.'},
  {id:'critical_care_expansion',category:'Medical Department Grants',label:'Critical Care Expansion Grant',desc:'Funds ICU and advanced critical care growth.',rewardText:'ICU construction discount for 10 days',reviewDays:4,successChance:0.62,durationDays:10,effect:{kind:'room_discount',roomTypes:['general_icu','cardiac_icu'],discount:0.3},requirementText:'Requires strong reputation.'},
  {id:'surgical_capacity',category:'Medical Department Grants',label:'Surgical Capacity Grant',desc:'Helps expand operating room capacity.',rewardText:'Surgery construction discount for 8 days',reviewDays:3,successChance:0.66,durationDays:8,effect:{kind:'room_discount',roomTypes:['surgery'],discount:0.3},requirementText:'Requires surgeon staffing and stable cleanliness.'},
  {id:'behavioral_health_access',category:'Medical Department Grants',label:'Behavioral Health Access Grant',desc:'Supports behavioral health expansion through social-service capacity.',rewardText:'Funds or credits a Behavioral Health room',reviewDays:4,successChance:0.64,durationDays:0,effect:{kind:'room_credit',roomType:'behavioral_health',approvalCash:3000},requirementText:'Requires Case Management or related support.'},
  {id:'nurse_retention',category:'Workforce Grants',label:'Nurse Retention Grant',desc:'Supports nurse retention and slows burnout.',rewardText:'Nurse morale support for 7 days',reviewDays:2,successChance:0.78,durationDays:7,effect:{kind:'nurse_support',approvalCash:2500,moralePerDay:1},requirementText:'Requires decent nurse-team morale.'},
  {id:'training_pipeline',category:'Workforce Grants',label:'Training Pipeline Grant',desc:'Funds interns and early career staffing growth.',rewardText:'Interns level faster for 10 days',reviewDays:3,successChance:0.73,durationDays:10,effect:{kind:'training_pipeline',approvalCash:2000,xpMult:1.5},requirementText:'Requires HR Office or Research Department.'},
  {id:'burnout_prevention',category:'Workforce Grants',label:'Mental Health & Burnout Prevention Grant',desc:'Supports wellness, slows energy loss, and cushions stress.',rewardText:'Staff recovery support for 10 days',reviewDays:3,successChance:0.76,durationDays:10,effect:{kind:'burnout_prevention',energyDrainMult:0.88,stressRelief:1},requirementText:'Requires Staff Room or Lunch Room.'},
  {id:'night_shift_stabilization',category:'Workforce Grants',label:'Night Shift Stabilization Grant',desc:'Supports overnight staffing stability.',rewardText:'Night morale support for 10 days',reviewDays:3,successChance:0.69,durationDays:10,effect:{kind:'night_support',approvalCash:2500},requirementText:'Requires HR Office and night shift unlocked.'},
  {id:'energy_efficiency',category:'Infrastructure Grants',label:'Energy Efficiency Grant',desc:'Supports HVAC and power infrastructure.',rewardText:'Reduces stress growth for 10 days',reviewDays:3,successChance:0.74,durationDays:10,effect:{kind:'energy_efficiency',approvalCash:3500,stressRelief:2},requirementText:'Requires HVAC / Power Generator.'},
  {id:'hospital_modernization',category:'Infrastructure Grants',label:'Hospital Modernization Grant',desc:'Helps upgrade older wings as the hospital grows.',rewardText:'Multi-department upgrade discount for 12 days',reviewDays:4,successChance:0.67,durationDays:12,effect:{kind:'department_discount',departments:['er','lab','ward','operations'],discount:0.2},requirementText:'Requires Small Hospital stage or higher.'},
  {id:'accessibility_improvement',category:'Infrastructure Grants',label:'Accessibility Improvement Grant',desc:'Funds elevators, bathrooms, and public access spaces.',rewardText:'Accessibility room discount for 12 days',reviewDays:3,successChance:0.72,durationDays:12,effect:{kind:'room_discount',roomTypes:['elevator','bathroom','waiting_room'],discount:0.35},requirementText:'Requires multi-floor expansion.'},
  {id:'technology_infrastructure',category:'Infrastructure Grants',label:'Technology Infrastructure Grant',desc:'Supports IT systems and research output.',rewardText:'Extra research support for 10 days',reviewDays:3,successChance:0.71,durationDays:10,effect:{kind:'technology_boost',approvalCash:3000,rpPerDay:1,researchSpeedBonus:0.5},requirementText:'Requires IT Department or Research Department.'}
];
const PATCH_NOTES_TEXT=`MY MEDICAL CENTER PATCH NOTES

v0.1 - Core Hospital Prototype
- Built the first playable hospital loop with building, staffing, patients, money, cleanliness, reputation, debt pressure, and grading.
- Added Janitors and the first hospital-failure systems.

v0.2 - Progression And Daily Operations
- Added milestone unlocks, contracts, waiting-room counters, day and night shifts, daily goals, and more early staff roles.
- Introduced Dept. Head Office as a gate for more advanced medical growth.

v0.3 - Refactor, Save Systems, And Research Foundations
- Split the project into index.html, styles.css, game.js, and dedicated system files.
- Added save/load, research, and the first dispatch foundations.

v0.4 - Staff Depth And Support Systems
- Added morale, advertising, HR Office, HR Manager, Nurse Station, Staff Room, Lunch Room, staff conflicts, and raise requests.
- Shifted staffing toward hospital-wide coverage instead of room-only assignment.

v0.5 - Advanced Roles, Research Points, And Hospital Stages
- Added Security, Interns, Medical Director, IT Department, Research Points, and full hospital stage progression.
- Stages now guide growth from Clinic to Medical Center.

v0.6 - UI Overhaul And Menu Structure
- Rebuilt the title screen, top HUD, research menu, staff listing, zoom control, and marketing gating.
- Introduced the My Medical Center branding and stronger menu hierarchy.

v0.7 - Visual Clarity Pass
- Added better room cards, tooltips, room states, softer corridors, and cleaner icon hierarchy.
- Reduced map clutter and improved waiting-room readability.

v0.8 - Sandbox And Debug Support
- Added Sandbox Mode with full unlocks, free resources, and lock/cost bypasses.
- Added fast-start sandbox flow from the title screen.

v0.9 - Stress, Fatigue, And Recovery Balance
- Added low-energy breaks, Staff Room recovery, energy slowdown penalties, and more visible burnout pressure.
- Added Emergency Staff Relief as a positive recovery event.

v1.0 - Events, Contracts, And Run Goals
- Added insurance contracts, Contracts menu, Ambulance Bay, the random event system, event modal, run-based win/lose conditions, and the Pressure Dashboard.
- Dispatch now depends on real room connections between Dispatch, Ambulance Bay, and ER.

v1.1 - Menu Polish And Readability
- Refined title-screen readability, card opacity, collapsible right-side panels, menu blur, and event presentation.
- Improved panel sizing and reduced background bleed-through.

v1.2 - Tutorial, Amenities, And Medical Center Expansion
- Added the first tutorial, replayable tutorial button, better build categories, Bathrooms, Janitor Closet, Vending Machine, Drink Dispenser, ATM, Luxury Path, Single/Double Hospital Rooms, and ICU expansion.
- Later-stage patient routing and inpatient care became clearer and more useful.

v1.3 - Floors, Routing, And Staff Command Systems
- Added up to 10 floors, elevators, staircases, floor specialization, and floor switching.
- Added Front Entrance, Staff Entrance, ER Entrance, HVAC / Power Generator, Research Department, Researcher, Charge Nurse, expanded staff management, heatmap overlay, and selected room panel.
- Upgraded patient arrivals to use real entrances and corridor pathing.
- Added vacation approvals, HR-approved vacations, and return buffs.

v1.4 - Room Purpose, Event Expansion, And Hospital Identity
- Added clearer patient types: Basic, Diagnostic, Emergency, Inpatient, Critical, and VIP.
- Strengthened room identity for VIP Room, ICU spaces, hospital rooms, and more detailed event chains, event rarity, and event choice systems.

v1.5 - Commercial UI Polish Pass
- Refined the HUD hierarchy, icon system, logo branding, bottom tool row, zoom controls, feedback animation, ambient background motion, and overall spacing.
- The interface now feels much closer to a polished commercial indie simulation game.

v1.6 - Departments, Public Care, And Save Files
- Added public vs private patient pressure, the Government Contract panel, Grant Writer funding flow, the separate employee needs menu, department upgrade tracks, room rotation, and a broader medical build roster including Med-Surg, Pediatrics, OB/GYN, Radiology, Rehab, Cardiology, Oncology, Behavioral Health, Geriatrics, Administration, and Case Management.
- Added dedicated SVG icon work for GP, ER, Waiting Room, Ward, and core HUD stats, plus Save Game now exports a real .mmcsave file in addition to browser save data.`;
const DEVLOG_TEXT=`MY MEDICAL CENTER DEVLOG

Entry 1 - Finding The Core Loop
The first goal was simple: make a hospital sim that could be understood in seconds. Build rooms, hire staff, treat patients, earn money, and survive the pressure. Early versions were rough, but the game already had the seed of the full clinic-to-medical-center journey.

Entry 2 - Making It Feel Like A Hospital
Once the prototype worked, the next step was identity. Waiting rooms, shifts, janitors, morale, cleanliness, and contracts helped the hospital feel less like a blank management board and more like a living place with real problems.

Entry 3 - Turning Systems Into Progression
Research, hospital stages, milestones, and new room gates gave the game a stronger arc. Instead of dumping every room and role at once, growth became something the player earned over time.

Entry 4 - Giving Staff Personality
The staff layer became much more important. Morale, burnout, breaks, raise requests, vacations, conflicts, and support roles like Charge Nurse and Dept. Head turned employees into people the player actually has to manage, not just numbers in a list.

Entry 5 - Events And Pressure
The event system changed the tone of the game. Patient surges, audits, burnout crises, inspections, celebrity cases, and emergency incidents gave the hospital moments of chaos and drama. The Pressure Dashboard helped explain why the sim was under strain instead of leaving the player guessing.

Entry 6 - Expanding Into A Real Medical Center
Multi-floor support, elevators, staircases, ICUs, inpatient rooms, dispatch chains, entrances, and VIP spaces pushed the project beyond a simple clinic builder. Routing became more meaningful, and every major room started to feel like it had a real purpose.

Entry 7 - Teaching New Players
The tutorial grew from simple helper text into a guided clinic scenario. It now walks players through naming their hospital, laying out the first clinic, hiring the right people, and understanding the basic feedback loop before full control is handed over.

Entry 8 - Visual Polish And Game Feel
Much of the recent work focused on polish. Better HUD hierarchy, room details, feedback animations, warning pulses, floating money text, heatmaps, room panels, ambient map motion, logo work, and cleaner menus helped the game move from prototype energy toward something that feels release-ready.

Entry 9 - Where The Game Is Now
My Medical Center now has a much stronger identity: a soft, readable hospital sim with layered staff management, guided growth, clearer routing, stronger UI, and a broader range of hospital departments. The current direction is about making every room, role, and system feel distinct, understandable, and satisfying to use.

Entry 10 - Making The Hospital Feel Institutional
Recent work pushed the sim further into “real hospital” territory. Public care quotas, private-patient pressure, insurance expansion, grants, department upgrades, and a growing list of specialty wings all make the hospital feel like an institution balancing mission and survival. At the same time, dedicated room and HUD icon work, a separate employee-needs menu, and real exported save files helped the project feel more complete and easier to live with as a game instead of just a prototype.`;
const MILESTONES=[
  {
    id:'urgent-care',
    name:'Urgent Care License',
    desc:'Treat 6 patients to unlock Emergency Room construction and ER doctor hiring.',
      progress:()=>`${Math.min(totalTreated,6)}/6 patients treated`,
      met:()=>totalTreated>=6,
      unlockTools:['er','er_entrance'],
      unlockRoles:['er_doc'],
    },
  {
    id:'dept-admin',
    name:'Department Administration',
    desc:'Reach 55 reputation to unlock Dept. Head Office construction and department attendings.',
    progress:()=>`${Math.min(Math.round(reputation),55)}/55 reputation`,
    met:()=>reputation>=55,
    unlockTools:['head_office'],
    unlockRoles:['dept_attending'],
  },
  {
    id:'xray-license',
    name:'Diagnostic Imaging',
    desc:'Build a Dept. Head Office to unlock X-Ray.',
    progress:()=>`${Math.min(rooms.filter(r=>r.type==='head_office').length,1)}/1 Dept. Head Office built`,
    met:()=>rooms.some(r=>r.type==='head_office'),
    unlockTools:['xray'],
    unlockRoles:[],
  },
  {
    id:'inpatient',
    name:'Inpatient Expansion',
    desc:'Treat 14 patients and build a Dept. Head Office to open Ward construction.',
    progress:()=>`${Math.min(totalTreated,14)}/14 patients treated, ${Math.min(rooms.filter(r=>r.type==='head_office').length,1)}/1 office`,
    met:()=>totalTreated>=14&&rooms.some(r=>r.type==='head_office'),
    unlockTools:['ward'],
    unlockRoles:[],
  },
  {
    id:'lab-charter',
    name:'Clinical Lab Charter',
    desc:'Treat 18 patients, reach 60 reputation, and build a Dept. Head Office to unlock the Lab.',
    progress:()=>`${Math.min(totalTreated,18)}/18 patients, ${Math.min(Math.round(reputation),60)}/60 reputation, ${Math.min(rooms.filter(r=>r.type==='head_office').length,1)}/1 office`,
    met:()=>totalTreated>=18&&reputation>=60&&rooms.some(r=>r.type==='head_office'),
    unlockTools:['lab'],
    unlockRoles:[],
  },
  {
    id:'surgery-license',
    name:'Surgical License',
    desc:'Treat 28 patients and reach 70 reputation to unlock Surgery, surgeons, and ER attendings.',
    progress:()=>`${Math.min(totalTreated,28)}/28 patients, ${Math.min(Math.round(reputation),70)}/70 reputation`,
    met:()=>totalTreated>=28&&reputation>=70,
    unlockTools:['surgery'],
    unlockRoles:['surgeon','er_attending'],
  },
];
const HOSPITAL_GRADES=['A+','A','B','C','D','F'];
const CONTRACT_LIBRARY=[
  {
    id:'community-outreach',
    title:'Community Outreach Grant',
    desc:'Treat 5 pro bono cases for the neighborhood clinic fund.',
    rewardText:'Reward: $5,000 donor bonus',
    create:()=>({type:'free_cases',target:5,progress:0,reward:{kind:'money',amount:5000}})
  },
  {
    id:'celebrity-visit',
    title:'Celebrity Wellness Visit',
    desc:'Discreetly treat one celebrity case to earn a donated GP room.',
    rewardText:'Reward: 1 free GP room',
    create:()=>({type:'celebrity',target:1,progress:0,spawned:false,reward:{kind:'free_room',roomType:'gp',amount:1}})
  },
];
const insuranceOptions=[
  {
    id:'basic_plan',
    name:'Basic Plan',
    incomeBoost:0.15,
    patientBoost:0.10,
    stress:0,
    durationDays:12
  },
  {
    id:'premium_plan',
    name:'Premium Plan',
    incomeBoost:0.30,
    patientBoost:0.25,
    stress:2,
    durationDays:10
  },
  {
    id:'corporate_plan',
    name:'Corporate Plan',
    incomeBoost:0.50,
    patientBoost:0.40,
    stress:5,
    durationDays:8
  }
];
const STAFF_REROLL_COST=750;
const SHIFTS=['day','night'];
const SAVE_KEY='cityHospitalBuilderSaveV1';
const DEFAULT_CENTER_NAME='Community Hospital Management Sim';
const REP_LONG_WAIT_THRESHOLD=16;
const REP_UNTREATED_LEAVE_THRESHOLD=28;
const RESEARCH_TREE=[
  {
    id:'care_team_program',
    name:'Care Team Program',
    desc:'Launch the hospital training pipeline to unlock CNAs for inpatient support coverage.',
    cost:28,
    days:2,
    requires:[],
    unlockTools:[],
    unlockRoles:['cna'],
    unlockFeatures:[],
    rewardText:'Unlocks CNAs'
  },
  {
    id:'dispatch_network',
    name:'Dispatch Network',
    desc:'Build a dispatch office to coordinate patient flow across the hospital.',
    cost:60,
    days:4,
    requires:[],
    unlockTools:['dispatch_office','ambulance_bay'],
    unlockRoles:['dispatcher','driver'],
    unlockFeatures:[],
    rewardText:'Unlocks Dispatch Office, Ambulance Bay, Dispatchers, and Drivers'
  },
  {
    id:'triage_protocols',
    name:'Triage Protocols',
    desc:'Formal triage buys more time before long waits damage public trust.',
    cost:45,
    days:3,
    requires:['dispatch_network'],
    unlockTools:[],
    unlockRoles:[],
    unlockFeatures:['triage_protocols'],
    rewardText:'Patients tolerate longer waits'
  },
  {
    id:'sterile_workflow',
    name:'Sterile Workflow',
    desc:'Standardized cleaning routines reduce grime buildup throughout the campus.',
    cost:70,
    days:5,
    requires:['dispatch_network'],
    unlockTools:[],
    unlockRoles:[],
    unlockFeatures:['sterile_workflow'],
    rewardText:'Improves daily cleanliness'
  }
];

const FIRST_NAMES=['Alex','Sam','Jordan','Morgan','Taylor','Casey','Riley','Quinn','Avery','Blake','Drew','Hayden','Jamie','Kendall','Logan','Mason','Parker','Reese','Skyler','Tatum','Chris','Dana','Evan','Frankie','Glen'];
const LAST_NAMES=['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Clark','Lewis','Lee','Walker','Hall','Young','Allen'];

const PERSONALITY_TRAITS=[
  {id:'calm',label:'Calm',desc:'Handles stressful days with less morale loss.',group:'personality',stressResist:2},
  {id:'difficult',label:'Difficult',desc:'Creates more workplace friction and chaos.',group:'personality',dramaEvent:true,chaosRepPenalty:1},
  {id:'ambitious',label:'Ambitious',desc:'Pushes harder for output and revenue.',group:'personality',revMult:1.08},
  {id:'friendly',label:'Friendly',desc:'Patients leave happier after treatment.',group:'personality',scoreMult:2,waitAdd:-1},
  {id:'burnout_risk',label:'Burnout Risk',desc:'Loses energy faster under pressure.',group:'personality',burnoutRisk:true},
];
const WORK_TRAITS=[
  {id:'fast_worker',label:'Fast Worker',desc:'Finishes treatment faster.',group:'work',speedMult:0.78},
  {id:'careful',label:'Careful',desc:'Produces steadier, cleaner work.',group:'work',revMult:1.06,scoreMult:1},
  {id:'sloppy',label:'Sloppy',desc:'More likely to cause setbacks.',group:'work',errorChance:0.08},
  {id:'mentor',label:'Mentor',desc:'Helps interns learn faster.',group:'work',mentor:true},
  {id:'learner',label:'Learner',desc:'Picks up routines faster over time.',group:'work',speedMult:0.94,xpBoost:1},
];
const DIRECTOR_TRAITS=[
  {id:'clinical_vision',label:'Clinical Vision',desc:'Hospital treatment speed rises sharply across every staffed department.',group:'director',hospitalSpeedMult:0.84},
  {id:'patient_champion',label:'Patient Champion',desc:'Patients wait longer before trust drops, and successful care earns more reputation.',group:'director',waitThresholdAdd:5,repOnTreat:1},
  {id:'operations_titan',label:'Operations Titan',desc:'Daily cleanliness holds better and hospital stress hits morale less hard.',group:'director',cleanlinessBonus:4,moraleStressResist:2},
  {id:'grant_magnet',label:'Grant Magnet',desc:'Clinical revenue and score both jump when the hospital is functioning well.',group:'director',hospitalRevMult:1.18,hospitalScoreBonus:2},
];
const CHARGE_NURSE_TRAITS=[
  {id:'steady_rounds',label:'Steady Rounds',desc:'Support staff recover a little faster while on break.',group:'charge',breakEnergyBonus:1,breakMoraleBonus:1},
];
const GRANT_WRITER_TRAITS=[
  {id:'persuasive_writer',label:'Persuasive Writer',desc:'Raises overall grant approval odds.',group:'grant_writer',tone:'good',grantApprovalBonus:0.07},
  {id:'policy_expert',label:'Policy Expert',desc:'Improves government and compliance-heavy grant applications.',group:'grant_writer',tone:'good',governmentGrantBonus:0.08},
  {id:'budget_specialist',label:'Budget Specialist',desc:'Increases cash from approved grants.',group:'grant_writer',tone:'good',grantRewardMult:1.15},
];
const DOCTOR_TRAITS=[
  {id:'strong_diagnostician',label:'Strong Diagnostician',desc:'Improves diagnostic flow and clinical accuracy.',group:'doctor',tone:'good',diagnosticSpeedMult:0.88,scoreMult:1},
  {id:'patient_favorite',label:'Patient Favorite',desc:'Patients respond warmly to this doctor.',group:'doctor',tone:'good',repOnTreat:1,scoreMult:1},
  {id:'rushed_clinician',label:'Rushed Clinician',desc:'Works faster, but is more likely to cause setbacks.',group:'doctor',tone:'bad',speedMult:0.84,errorChance:0.06},
];
const NURSE_TRAITS=[
  {id:'steady_rounds_nurse',label:'Steady Rounds',desc:'Keeps routine care moving reliably.',group:'nurse_role',tone:'good',speedMult:0.92},
  {id:'comforting_presence',label:'Comforting Presence',desc:'Patients feel calmer and more cared for.',group:'nurse_role',tone:'good',repOnTreat:1,scoreMult:1},
  {id:'overextended',label:'Overextended',desc:'Working too many angles leaves this nurse drained faster.',group:'nurse_role',tone:'bad',extraEnergyDrain:1.5},
];
const JANITOR_TRAITS=[
  {id:'detail_cleaner',label:'Detail Cleaner',desc:'Keeps the hospital cleaner than average.',group:'janitor_role',tone:'good',janitorCleanBonus:1.4},
  {id:'fast_cleaner',label:'Fast Cleaner',desc:'Covers more ground and keeps mess from building up.',group:'janitor_role',tone:'good',janitorCleanBonus:0.9,janitorStressRelief:0.5},
  {id:'misses_corners',label:'Misses Corners',desc:'Leaves behind small messes that add up.',group:'janitor_role',tone:'bad',janitorCleanBonus:-1.2},
];
const SECURITY_TRAITS=[
  {id:'de_escalator',label:'De-escalator',desc:'Prevents conflicts before they spiral.',group:'security_role',tone:'good',guardProtectionBonus:0.12},
  {id:'strict_enforcer',label:'Strict Enforcer',desc:'Keeps order and reduces operational chaos.',group:'security_role',tone:'good',guardStressReductionBonus:2},
  {id:'intimidating',label:'Intimidating',desc:'Stops incidents, but can create a harsher public atmosphere.',group:'security_role',tone:'bad',guardProtectionBonus:0.08,securityRepPenalty:1},
];
function traitById(id){
  return PERSONALITY_TRAITS.find(t=>t.id===id)||WORK_TRAITS.find(t=>t.id===id)||DIRECTOR_TRAITS.find(t=>t.id===id)||CHARGE_NURSE_TRAITS.find(t=>t.id===id)||GRANT_WRITER_TRAITS.find(t=>t.id===id)||DOCTOR_TRAITS.find(t=>t.id===id)||NURSE_TRAITS.find(t=>t.id===id)||JANITOR_TRAITS.find(t=>t.id===id)||SECURITY_TRAITS.find(t=>t.id===id)||null;
}
function getSpecialTraitPoolForRole(role){
  if(role==='medical_director')return DIRECTOR_TRAITS;
  if(role==='charge_nurse')return CHARGE_NURSE_TRAITS;
  if(role==='grant_writer')return GRANT_WRITER_TRAITS;
  if(['gp_doc','er_doc','er_attending','dept_attending','surgeon'].includes(role))return DOCTOR_TRAITS;
  if(role==='nurse')return NURSE_TRAITS;
  if(role==='janitor')return JANITOR_TRAITS;
  if(role==='security_officer')return SECURITY_TRAITS;
  return null;
}
function getRoomShortLabel(type){
  return ROOM_SHORT_LABELS[type]||RDEFS[type]?.icon||RDEFS[type]?.name||type;
}
function getRoomMapSymbol(type){
  return ROOM_MAP_SYMBOLS[type]||RDEFS[type]?.icon||'•';
}
function getRoomFloor(room){return room?.floor??1;}
function getFloorGrid(floor=currentFloor){
  const idx=clamp((floor||1)-1,0,MAX_FLOORS-1);
  if(!floorGrids[idx])floorGrids[idx]=makeEmptyGrid();
  return floorGrids[idx];
}
function getFloorSpecializationKey(floor=currentFloor){
  const key=floorSpecializations?.[floor]||'general';
  return FLOOR_SPECIALIZATIONS[key]?key:'general';
}
function getFloorSpecialization(floor=currentFloor){
  return FLOOR_SPECIALIZATIONS[getFloorSpecializationKey(floor)]||FLOOR_SPECIALIZATIONS.general;
}
function clampFloorPanelPosition(left,top){
  const panel=document.getElementById('floorswitchpanel');
  const wrap=document.getElementById('cw');
  if(!panel||!wrap)return{left,top};
  const maxLeft=Math.max(12,wrap.clientWidth-panel.offsetWidth-12);
  const maxTop=Math.max(12,wrap.clientHeight-panel.offsetHeight-12);
  return{
    left:clamp(left,12,maxLeft),
    top:clamp(top,12,maxTop)
  };
}
function applyFloorPanelPosition(){
  const panel=document.getElementById('floorswitchpanel');
  if(!panel)return;
  const nextPos=floorPanelPosition?clampFloorPanelPosition(floorPanelPosition.left,floorPanelPosition.top):{left:18,top:18};
  floorPanelPosition=nextPos;
  panel.style.left=`${Math.round(nextPos.left)}px`;
  panel.style.top=`${Math.round(nextPos.top)}px`;
}
function hideFloorPanel(){
  floorPanelHidden=true;
  const panel=document.getElementById('floorswitchpanel');
  const toggle=document.getElementById('floorpaneltoggle');
  if(panel){
    panel.classList.add('hidden');
    panel.style.display='none';
  }
  if(toggle){
    toggle.classList.remove('hidden');
    toggle.style.display='';
  }
  updateFloorControls();
}
function showFloorPanel(){
  floorPanelHidden=false;
  const panel=document.getElementById('floorswitchpanel');
  const toggle=document.getElementById('floorpaneltoggle');
  if(panel){
    panel.classList.remove('hidden');
    panel.style.display='flex';
  }
  if(toggle){
    toggle.classList.add('hidden');
    toggle.style.display='none';
  }
  updateFloorControls();
}
function setFloorSpecialization(key,floor=currentFloor){
  if(!FLOOR_SPECIALIZATIONS[key])return;
  if(!floorSpecializations||typeof floorSpecializations!=='object')floorSpecializations=makeFloorSpecializations();
  floorSpecializations[floor]=key;
  addLog(`Floor ${floor} specialized for ${getFloorSpecialization(floor).label}.`,'');
  updateUI();
  render();
}
function syncActiveGrid(){grid=getFloorGrid(currentFloor);}
function getRoomsOnFloor(floor=currentFloor){return rooms.filter(room=>getRoomFloor(room)===floor);}
function floorHasVerticalConnector(floor){
  return rooms.some(room=>getRoomFloor(room)===floor&&['staircase','elevator'].includes(room.type)&&isConn(room)&&!isRoomTemporarilyDisabled(room));
}
function getUnlockedFloorLimit(){
  let limit=1;
  for(let floor=1;floor<MAX_FLOORS;floor++){
    if(floorHasVerticalConnector(floor))limit=floor+1;
    else break;
  }
  return limit;
}
function isFloorUnlocked(floor){return floor>=1&&floor<=getUnlockedFloorLimit();}
function roomHasVerticalAccess(room){return getRoomFloor(room)===1||isFloorUnlocked(getRoomFloor(room));}
function updateFloorControls(){
  const label=document.getElementById('floorlabel');
  const meta=document.getElementById('floormeta');
  const panelMeta=document.getElementById('floorpanelmeta');
  const list=document.getElementById('floor-switch-list');
  const specializationCurrent=document.getElementById('floor-specialization-current');
  const specializationList=document.getElementById('floor-specialization-list');
  const down=document.getElementById('floordown');
  const up=document.getElementById('floorup');
  const panel=document.getElementById('floorswitchpanel');
  const toggle=document.getElementById('floorpaneltoggle');
  const unlockedLimit=getUnlockedFloorLimit();
  const floorSpecialty=getFloorSpecialization(currentFloor);
  const floorsAvailable=unlockedLimit>1||isSandboxMode;
  if(label)label.textContent=`Floor ${currentFloor}`;
  if(meta)meta.textContent=`Unlocked ${unlockedLimit}/${MAX_FLOORS}`;
  if(panelMeta)panelMeta.textContent=`Unlocked ${unlockedLimit}/${MAX_FLOORS}`;
  if(specializationCurrent)specializationCurrent.textContent=`${floorSpecialty.icon} ${floorSpecialty.label}`;
  if(down)down.disabled=currentFloor<=1;
  if(up)up.disabled=currentFloor>=Math.min(MAX_FLOORS,unlockedLimit);
  if(panel){
    const panelHidden=!floorsAvailable||floorPanelHidden;
    panel.classList.toggle('hidden',panelHidden);
    panel.style.display=panelHidden?'none':'flex';
    if(!panelHidden)applyFloorPanelPosition();
  }
  if(toggle){
    const toggleHidden=!floorsAvailable||!floorPanelHidden;
    toggle.classList.toggle('hidden',toggleHidden);
    toggle.style.display=toggleHidden?'none':'';
    if(!toggleHidden){
      toggle.style.left='';
      toggle.style.top='';
      toggle.style.right='';
      toggle.style.bottom='';
    }
  }
  if(list){
    list.innerHTML=Array.from({length:MAX_FLOORS},(_,idx)=>{
      const floor=idx+1;
      const unlocked=floor<=unlockedLimit;
      const stateClass=`floor-chip${floor===currentFloor?' active':''}${unlocked?'':' locked'}`;
      const lockText=unlocked?'':' Locked';
      const floorMeta=getFloorSpecialization(floor);
      return `<button class="${stateClass}" type="button" ${unlocked?'':'disabled'} aria-label="Switch to floor ${floor}" onclick="setCurrentFloor(${floor})">Floor ${floor}${lockText}<br><span style="font-size:9px;font-weight:600;opacity:${unlocked?'.78':'.64'}">${floorMeta.icon} ${floorMeta.label}</span></button>`;
    }).join('');
  }
  if(specializationList){
    specializationList.innerHTML=Object.entries(FLOOR_SPECIALIZATIONS).map(([key,spec])=>{
      const active=getFloorSpecializationKey(currentFloor)===key;
      return `<button class="floor-specialization-chip${active?' active':''}" type="button" aria-label="Set floor ${currentFloor} specialization to ${spec.label}" onclick="setFloorSpecialization('${key}',${currentFloor})">${spec.icon} ${spec.label}</button>`;
    }).join('');
  }
}
function setCurrentFloor(nextFloor,silent=false){
  const target=clamp(nextFloor,1,MAX_FLOORS);
  if(!isFloorUnlocked(target)){
    if(!silent){
      addLog('That floor is locked. Build a Staircase or Elevator on the current top floor to open the next one.','w');
      showToast('Floor locked','warn');
    }
    return false;
  }
  currentFloor=target;
  syncActiveGrid();
  document.getElementById('tt').style.display='none';
  closeRoomPanel();
  updateFloorControls();
  updateUI();
  render();
  return true;
}
function nudgeFloor(direction){
  setCurrentFloor(currentFloor+direction);
}
function initFloorPanelDrag(){
  const panel=document.getElementById('floorswitchpanel');
  const wrap=document.getElementById('cw');
  if(!panel||!wrap||panel.dataset.dragReady==='1')return;
  panel.dataset.dragReady='1';
  let dragState=null;
  const stopDrag=()=>{
    dragState=null;
    document.removeEventListener('mousemove',onDragMove);
    document.removeEventListener('mouseup',stopDrag);
  };
  const onDragMove=(event)=>{
    if(!dragState)return;
    const wrapRect=wrap.getBoundingClientRect();
    const nextLeft=event.clientX-wrapRect.left-dragState.offsetX;
    const nextTop=event.clientY-wrapRect.top-dragState.offsetY;
    floorPanelPosition=clampFloorPanelPosition(nextLeft,nextTop);
    applyFloorPanelPosition();
    updateFloorControls();
  };
  panel.addEventListener('mousedown',event=>{
    if(event.target.closest('.floor-panel-close'))return;
    const handle=event.target.closest('[data-floorpanel-drag]');
    if(!handle)return;
    const panelRect=panel.getBoundingClientRect();
    dragState={
      offsetX:event.clientX-panelRect.left,
      offsetY:event.clientY-panelRect.top
    };
    if(!floorPanelPosition){
      const wrapRect=wrap.getBoundingClientRect();
      floorPanelPosition={
        left:panelRect.left-wrapRect.left,
        top:panelRect.top-wrapRect.top
      };
    }
    document.addEventListener('mousemove',onDragMove);
    document.addEventListener('mouseup',stopDrag);
    event.preventDefault();
  });
  window.addEventListener('resize',()=>{
    if(floorPanelPosition){
      floorPanelPosition=clampFloorPanelPosition(floorPanelPosition.left,floorPanelPosition.top);
      updateFloorControls();
    }
  });
}
function pickTrait(pool){
  const picked=pool[Math.floor(Math.random()*pool.length)];
  return {...picked,type:picked.group};
}
function normalizeStaffMember(member){
  if(member.salary>ROLES[member.role]?.baseSalary*1.4){
    member.salary=normalizeSalaryAmount(member.salary/2);
  }else{
    member.salary=normalizeSalaryAmount(member.salary??ROLES[member.role]?.baseSalary??0);
  }
  const specialPool=getSpecialTraitPoolForRole(member.role);
  if(member.role==='medical_director'){
    const existing=Array.isArray(member.traits)?member.traits:[];
    const special=member.specialTrait||existing.find(t=>t.group==='director')||pickTrait(DIRECTOR_TRAITS);
    member.specialTrait={...(traitById(special.id)||pickTrait(DIRECTOR_TRAITS)),type:'director',group:'director'};
    member.personalityTrait=null;
    member.workTrait=null;
    member.traits=[member.specialTrait];
    member.xp=0;
    member.level=1;
    return member;
  }
  if(member.role==='charge_nurse'){
    const existing=Array.isArray(member.traits)?member.traits:[];
    const special=member.specialTrait||existing.find(t=>t.group==='charge')||pickTrait(CHARGE_NURSE_TRAITS);
    member.specialTrait={...(traitById(special.id)||pickTrait(CHARGE_NURSE_TRAITS)),type:'charge',group:'charge'};
    member.personalityTrait=null;
    member.workTrait=null;
    member.traits=[member.specialTrait];
    member.xp=0;
    member.level=1;
    return member;
  }
  if(specialPool){
    const existing=Array.isArray(member.traits)?member.traits:[];
    const special=member.specialTrait||existing.find(t=>specialPool.some(base=>base.id===t.id))||pickTrait(specialPool);
    const baseTrait=traitById(special.id)||pickTrait(specialPool);
    member.specialTrait={...baseTrait,type:baseTrait.group,group:baseTrait.group};
    member.personalityTrait=null;
    member.workTrait=null;
    member.traits=[member.specialTrait];
    member.xp=0;
    member.level=1;
    return member;
  }
  const existing=Array.isArray(member.traits)?member.traits:[];
  const extras=existing.filter(t=>t&&t.group!=='personality'&&t.group!=='work'&&t.group!=='director');
  let personality=member.personalityTrait||existing.find(t=>t.group==='personality'||PERSONALITY_TRAITS.some(base=>base.id===t.id));
  let work=member.workTrait||existing.find(t=>t.group==='work'||WORK_TRAITS.some(base=>base.id===t.id));
  personality=personality?{...(traitById(personality.id)||pickTrait(PERSONALITY_TRAITS)),type:'personality',group:'personality'}:pickTrait(PERSONALITY_TRAITS);
  work=work?{...(traitById(work.id)||pickTrait(WORK_TRAITS)),type:'work',group:'work'}:pickTrait(WORK_TRAITS);
  member.personalityTrait=personality;
  member.workTrait=work;
  member.traits=[personality,work,...extras];
  member.xp=Number.isFinite(member.xp)?member.xp:0;
  member.level=Number.isFinite(member.level)?member.level:1;
  return member;
}

let isSandboxMode=false;
let researchPoints=0;
let money=STARTING_CASH,day=1,score=0,totalTreated=0,monthlyInc=0,incAccum=0,reputation=70,cleanliness=78,stress=0,adReach=0;
let floorGrids=makeFloorGrids();
let floorSpecializations=makeFloorSpecializations();
let floorPanelHidden=true;
let floorPanelPosition=null;
let currentFloor=1;
let grid=floorGrids[0];
let rooms=[],patients=[],staff=[],logs=[];
let selTool=null,buildRotation=0,gameTime=0,speed=1,paused=false,patId=0,staffId=0,zoom=1,zoomVisual=1,zoomTweenFrom=1,zoomTweenStart=null,zoomFeedbackTimer=null,selectedRoomId=null;
let departments=makeDepartments();
let techTree=makeTechTree();
let hover={x:-1,y:-1},dragging=false;
let eventFocusRoomId=null,eventFocusUntil=0;
let eventStats={totalEvents:0,emergencies:0,staffIncidents:0,complaints:0};
let eventMemory={};
let recentAuditFailureDays=0;
let animTime=0;
let buildMode=true;
let heatmapOn=false;
let customCenterName=DEFAULT_CENTER_NAME;
let hospitalStage='clinic';
let stageResumePaused=true;
let staffPool=[],currentTab='clerical';
let debtDays=0,debtFreeDays=0,winStabilityDays=0,lowRepDays=0,dirtyDays=0,highStressDays=0,gameOver=false,loseReason='',runOutcome='';
let unlockedTools=new Set(STARTING_TOOLS),unlockedRoles=new Set(STARTING_ROLES),unlockedMilestones=new Set();
let researchedTech=new Set(),unlockedFeatures=new Set(),activeResearch=null;
let dispatchJobs=[],dispatchJobId=0;
let hasStarted=false;
let gradeIndex=0,gradeNote='Monthly inspectors are fully satisfied';
let monthRepAccum=0,monthCleanAccum=0,monthWaitAccum=0,monthSamples=0,monthDebtDays=0,monthHighWaitDays=0;
let budgetMonthIncome=0,budgetMonthExpenses=0,budgetMonthStartDay=1;
let govTreated=0,totalPatients=0,totalPublicCareTreated=0;
let govContractVisualState='monitoring';
let grantOffers=[];
let contractOffer=null,activeContract=null,lastContractId=null;
let insuranceContracts=[];
let freeBuildCredits={gp:0};
let dailyGoal=null;
let dailyStats={treated:0,gpVisits:0,roomsBuilt:0,rolesHired:{},cleanDays:0};
let staffShiftFilter='day';
let softGuideDismissed=false;
let operationsPulseAcc=0;

applyZoom();

function sanitizeCustomCenterName(value){
  const trimmed=(value||'').replace(/\s+/g,' ').trim();
  return trimmed||DEFAULT_CENTER_NAME;
}
function applyCustomCenterName(){
  const input=document.getElementById('custom-center-name');
  if(input&&input.value!==customCenterName)input.value=customCenterName;
}
function updateCustomCenterName(value){
  customCenterName=sanitizeCustomCenterName(value);
}
function hasAnyCorridorBuilt(){
  return floorGrids.some(floor=>floor.some(row=>row.some(tile=>isPathTile(tile))));
}
function getSoftGuideSteps(){
  return[
    {label:'Build corridors',done:hasAnyCorridorBuilt()},
    {label:'Place waiting room',done:rooms.some(r=>r.type==='waiting_room')},
    {label:'Build GP office',done:rooms.some(r=>r.type==='gp')},
    {label:'Hire doctor',done:staff.some(s=>s.hired&&s.role==='gp_doc')}
  ];
}
function shouldShowSoftGuide(){
  const titleHidden=document.getElementById('titlescreen')?.classList.contains('hidden');
  if(!titleHidden||!hasStarted||gameOver||isSandboxMode||softGuideDismissed)return false;
  if(typeof tutorialActive==='boolean'&&tutorialActive)return false;
  const steps=getSoftGuideSteps();
  return steps.some(step=>!step.done);
}
function renderSoftGuide(){
  const card=document.getElementById('softguide');
  const stepsWrap=document.getElementById('softguide-steps');
  if(!card||!stepsWrap)return;
  if(!shouldShowSoftGuide()){
    card.classList.add('hidden');
    return;
  }
  const steps=getSoftGuideSteps();
  stepsWrap.innerHTML=steps.map((step,idx)=>`<div class="soft-guide-step ${step.done?'done':''}"><span class="soft-guide-step-dot">${step.done?'✓':idx+1}</span><span class="soft-guide-step-text">${step.label}</span></div>`).join('');
  card.classList.remove('hidden');
}
function dismissSoftGuide(){
  softGuideDismissed=true;
  renderSoftGuide();
}
function changeMoney(amount){
  amount=Math.round(Number(amount)||0);
  if(!amount)return 0;
  money+=amount;
  if(amount>0)budgetMonthIncome+=amount;
  else budgetMonthExpenses+=Math.abs(amount);
  return amount;
}
function resetBudgetLedger(startDay=day||1){
  budgetMonthIncome=0;
  budgetMonthExpenses=0;
  budgetMonthStartDay=startDay||1;
}
function getBudgetMonthDay(){
  return Math.max(1,day-budgetMonthStartDay+1);
}
function formatBudgetMoney(amount){
  const rounded=Math.round(Number(amount)||0);
  const sign=rounded<0?'-':'';
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
}
function getBudgetSnapshot(){
  const daysElapsed=Math.min(30,Math.max(1,getBudgetMonthDay()));
  const daysRemaining=Math.max(0,30-daysElapsed);
  const bookedIncome=Math.max(0,Math.round(budgetMonthIncome));
  const pendingIncome=Math.max(0,Math.round(incAccum));
  const liveIncome=bookedIncome+pendingIncome;
  const expenses=Math.max(0,Math.round(budgetMonthExpenses));
  const payrollDue=Math.max(0,Math.round(wageBill()));
  const dailyIncomeRate=liveIncome/daysElapsed;
  const dailyExpenseRate=expenses/daysElapsed;
  const estIncome=Math.round(liveIncome+(dailyIncomeRate*daysRemaining));
  const estExpenses=Math.max(
    expenses,
    Math.round(expenses+(dailyExpenseRate*daysRemaining)+(daysRemaining>0?payrollDue:0))
  );
  return{
    daysElapsed,
    bookedIncome,
    pendingIncome,
    liveIncome,
    expenses,
    payrollDue,
    net:liveIncome-expenses,
    estIncome,
    estExpenses,
    estNet:estIncome-estExpenses
  };
}
function getPublicCareRate(){
  return totalPatients>0?govTreated/totalPatients:0;
}
function getPublicCareRequirementStatus(){
  if(totalPatients===0)return`Public patients are the bulk of volume; private patients bring stronger margins. Requirement: ${Math.round(govRequired*100)}%.`;
  const rate=getPublicCareRate();
  if(rate>=govRequired)return `On track: ${Math.round(rate*100)}% public patients treated this month.`;
  return `Below target: ${Math.round(rate*100)}% public this month, requirement is ${Math.round(govRequired*100)}%. Quota priority is active.`;
}
function getPublicCareContractStatusLabel(){
  if(totalPatients===0)return'Status: Monitoring';
  return getPublicCareRate()>=govRequired?'Status: Compliant':'Status: At Risk';
}
function getDaysUntilGovernmentReview(){
  return Math.max(1,30-((day-1)%30));
}
function updateGovernmentContract(){
  const panel=document.getElementById('gov-contract');
  const current=document.getElementById('govCurrent');
  const status=document.getElementById('govStatus');
  if(!panel||!current||!status)return;
  let nextState='monitoring';

  if(totalPatients===0){
    current.textContent='0%';
    status.textContent='Status: Monitoring';
    panel.classList.remove('warning','danger');
    panel.classList.add('warning');
  }else{
    const percent=govTreated/totalPatients;
    const percentDisplay=Math.round(percent*100);
    current.textContent=percentDisplay+'%';

    panel.classList.remove('warning','danger');

    if(percent>=govRequired){
      status.textContent='Status: Compliant';
      nextState='compliant';
    }else if(percent>=govRequired-0.1){
      status.textContent='Status: At Risk';
      panel.classList.add('warning');
      nextState='warning';
    }else{
      status.textContent='Status: Non-Compliant';
      panel.classList.add('danger');
      nextState='danger';
    }
  }

  if(govContractVisualState!==nextState){
    panel.classList.add('panel-pulse');
    setTimeout(()=>panel.classList.remove('panel-pulse'),500);
    govContractVisualState=nextState;
  }
}
function governmentReview(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{governmentPenaltyMult:1};
  const boost=getInsuranceBoost();
  if(boost.patients>0.5){
    govRequired=clamp(govRequired+0.05,0,0.8);
    addLog('Government increased public care requirement due to private expansion','w');
  }
  const percent=govTreated/Math.max(totalPatients,1);

  if(percent<govRequired){
    adjustReputation(-Math.max(1,Math.round(5*(techBonus.governmentPenaltyMult||1))),'Government penalty: insufficient public care','b');
    changeMoney(-Math.max(500,Math.round(2000*(techBonus.governmentPenaltyMult||1))));
    addLog('Government penalty: insufficient public care','b');
    showToast('Government review failed','warn');
  }else{
    adjustReputation(2,'Government satisfied with public care levels','g');
    addLog('Government satisfied with public care levels','g');
    showToast('Government review passed','good');
  }

  govTreated=0;
  totalPatients=0;
}

function handleCenterNameKeydown(event){
  if(event?.key!=='Enter')return;
  event.preventDefault();
  const input=event.currentTarget;
  updateCustomCenterName(input?.value||'');
  if(input&&typeof input.blur==='function')input.blur();
  if(typeof acceptTutorialCenterName==='function')acceptTutorialCenterName();
}

function randName(){return FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)]+' '+LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)];}

function genStaffMember(role,shift=null){
  const rd=ROLES[role];
  let salary=rd.baseSalary;
  const specialPool=getSpecialTraitPoolForRole(role);
  if(role==='medical_director'){
    const specialTrait=pickTrait(DIRECTOR_TRAITS);
    salary+=Math.round((Math.random()-.5)*salary*0.08);
    return normalizeStaffMember({
      id:staffId++,
      name:randName(),
      role,
      shift:shift||SHIFTS[Math.floor(Math.random()*SHIFTS.length)],
      salary,
      assignedRoom:null,
      hired:false,
      mood:100,
      energy:100,
      morale:100,
      burnoutLogged:false,
      raiseRequest:null,
      quitRiskDays:0,
      raiseCooldown:0,
      specialTrait,
      traits:[specialTrait],
      xp:0,
      level:1
    });
  }
  if(role==='charge_nurse'){
    const specialTrait=pickTrait(CHARGE_NURSE_TRAITS);
    salary+=Math.round((Math.random()-.5)*salary*0.08);
    return normalizeStaffMember({
      id:staffId++,
      name:randName(),
      role,
      shift:shift||SHIFTS[Math.floor(Math.random()*SHIFTS.length)],
      salary,
      assignedRoom:null,
      hired:false,
      mood:100,
      energy:100,
      morale:100,
      burnoutLogged:false,
      raiseRequest:null,
      quitRiskDays:0,
      raiseCooldown:0,
      specialTrait,
      traits:[specialTrait],
      xp:0,
      level:1
    });
  }
  if(specialPool){
    const specialTrait=pickTrait(specialPool);
    if(specialTrait.id==='budget_specialist')salary=Math.round(salary*1.04);
    if(specialTrait.id==='rushed_clinician')salary=Math.round(salary*1.03);
    if(specialTrait.id==='detail_cleaner')salary=Math.round(salary*1.02);
    salary+=Math.round((Math.random()-.5)*salary*0.08);
    return normalizeStaffMember({
      id:staffId++,
      name:randName(),
      role,
      shift:shift||SHIFTS[Math.floor(Math.random()*SHIFTS.length)],
      salary,
      assignedRoom:null,
      hired:false,
      mood:100,
      energy:100,
      morale:100,
      burnoutLogged:false,
      raiseRequest:null,
      quitRiskDays:0,
      raiseCooldown:0,
      specialTrait,
      traits:[specialTrait],
      xp:0,
      level:1
    });
  }
  const personalityTrait=pickTrait(PERSONALITY_TRAITS);
  const workTrait=pickTrait(WORK_TRAITS);
  if(personalityTrait.id==='ambitious')salary=Math.round(salary*1.06);
  if(workTrait.id==='learner')salary=Math.round(salary*0.97);
  salary+=Math.round((Math.random()-.5)*salary*0.15);
  return normalizeStaffMember({
    id:staffId++,
    name:randName(),
    role,
    shift:shift||SHIFTS[Math.floor(Math.random()*SHIFTS.length)],
    salary,
    assignedRoom:null,
    hired:false,
    mood:100,
    energy:100,
    morale:100,
    burnoutLogged:false,
    raiseRequest:null,
    quitRiskDays:0,
    raiseCooldown:0,
    personalityTrait,
    workTrait,
    traits:[personalityTrait,workTrait],
    xp:0,
    level:1
  });
}

function generatePool(){
  staffPool=[];
  Object.keys(ROLES).forEach(role=>{getUnlockedShifts().forEach(shift=>{for(let i=0;i<2;i++)staffPool.push(genStaffMember(role,shift));});});
}
generatePool();
staff=staff.map(normalizeStaffMember);
staffPool=staffPool.map(normalizeStaffMember);

function setMenuVisibility(showTitle){
  document.getElementById('titlescreen').classList.toggle('hidden',!showTitle);
  document.getElementById('gameover').classList.remove('open');
  updateTitleMenuActions();
  updateMenuBlurState();
}
function updateTitleMenuActions(){
  const backBtn=document.getElementById('backtogamebtn');
  if(!backBtn)return;
  const canResume=hasStarted&&!gameOver;
  backBtn.classList.toggle('hidden',!canResume);
}
function updateMenuBlurState(){
  const game=document.getElementById('game');
  if(!game)return;
  const titleOpen=!document.getElementById('titlescreen').classList.contains('hidden');
  const staffOpen=document.getElementById('staffmodal').classList.contains('open');
  const employeeOpen=document.getElementById('employeemodal')?.classList.contains('open');
  const researchOpen=document.getElementById('researchmodal')?.classList.contains('open');
  const contractOpen=document.getElementById('contractmodal')?.classList.contains('open');
  const patchOpen=document.getElementById('patchmodal')?.classList.contains('open');
  const eventOpen=!document.getElementById('event-modal')?.classList.contains('hidden');
  const gameOverOpen=document.getElementById('gameover').classList.contains('open');
  const stageOpen=document.getElementById('stagemodal')?.classList.contains('open');
  game.classList.toggle('menu-open',titleOpen||staffOpen||employeeOpen||researchOpen||contractOpen||patchOpen||eventOpen||gameOverOpen||stageOpen);
}
let patchNotesTab='patch';
function renderPatchNotesMenu(){
  const panel=document.getElementById('patchpanel');
  if(panel)panel.textContent=patchNotesTab==='devlog'?DEVLOG_TEXT:PATCH_NOTES_TEXT;
  document.getElementById('patchtab-patch')?.classList.toggle('active',patchNotesTab==='patch');
  document.getElementById('patchtab-devlog')?.classList.toggle('active',patchNotesTab==='devlog');
}
function setPatchNotesTab(tab){
  patchNotesTab=tab==='devlog'?'devlog':'patch';
  renderPatchNotesMenu();
}
function openPatchNotesMenu(tab='patch'){
  patchNotesTab=tab==='devlog'?'devlog':'patch';
  const modal=document.getElementById('patchmodal');
  if(!modal)return;
  modal.classList.add('open');
  renderPatchNotesMenu();
  updateMenuBlurState();
}
function closePatchNotesMenu(){
  const modal=document.getElementById('patchmodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function openResearchMenu(){
  const modal=document.getElementById('researchmodal');
  if(!modal)return;
  modal.classList.add('open');
  renderResearch();
  updateMenuBlurState();
}
function closeResearchMenu(){
  const modal=document.getElementById('researchmodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function openContractMenu(){
  const modal=document.getElementById('contractmodal');
  if(!modal)return;
  modal.classList.add('open');
  renderContracts();
  updateMenuBlurState();
}
function openInsuranceMenu(){
  openContractMenu();
}
function closeContractMenu(){
  const modal=document.getElementById('contractmodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function getEventCategoryMeta(category){
  const key=(category||'pressure').toLowerCase();
  const map={
    crisis:{label:'Crisis',icon:'🚨'},
    pressure:{label:'Pressure',icon:'⚠'},
    opportunity:{label:'Opportunity',icon:'💡'},
    positive:{label:'Positive',icon:'✨'}
  };
  return map[key]||map.pressure;
}
function getEventRarityMeta(rarity){
  const key=(rarity||'common').toLowerCase();
  const map={
    common:{label:'Common',icon:'●'},
    uncommon:{label:'Uncommon',icon:'◆'},
    rare:{label:'Rare',icon:'✦'},
    legendary:{label:'Legendary',icon:'★'}
  };
  return map[key]||map.common;
}
function showEvent(event){
  const modal=document.getElementById('event-modal');
  if(!modal)return;
  modal.classList.remove('hidden');

  modal.querySelector('.event-icon').textContent=event.icon||'⚠️';
  modal.querySelector('.event-title').textContent=event.title||'Hospital Event';
  modal.querySelector('.event-desc').textContent=event.desc||'Something happened in the hospital.';

  const categoryMeta=getEventCategoryMeta(event.category);
  const categoryEl=modal.querySelector('.event-category-chip');
  if(categoryEl){
    categoryEl.textContent=`${categoryMeta.icon} ${categoryMeta.label}`;
    categoryEl.className=`event-category-chip ${(event.category||'pressure').toLowerCase()}`;
  }
  const rarityMeta=getEventRarityMeta(event.rarity);
  const rarityEl=modal.querySelector('.event-rarity-chip');
  if(rarityEl){
    rarityEl.textContent=`${rarityMeta.icon} ${rarityMeta.label}`;
    rarityEl.className=`event-rarity-chip ${(event.rarity||'common').toLowerCase()}`;
  }

  const impact=modal.querySelector('.event-impact');
  if(typeof event.impactHtml==='string'&&event.impactHtml){
    impact.innerHTML=event.impactHtml;
  }else{
    impact.textContent=event.impact||'';
  }

  const actions=modal.querySelector('.event-actions');
  actions.innerHTML='';

  (event.choices?.length?event.choices:[{label:'Continue',type:'primary',action:()=>{}}]).forEach(choice=>{
    const btn=document.createElement('button');
    btn.textContent=choice.label;
    btn.className='event-btn '+(choice.type||'primary');
    btn.onclick=()=>{
      if(typeof choice.action==='function')choice.action();
      closeEvent();
    };
    actions.appendChild(btn);
  });

  updateMenuBlurState();
}
function showEventModal(title,desc,impactHtml='',actionsHtml=''){
  showEvent({
    icon:'⚠️',
    category:'pressure',
    title:title||'Hospital Event',
    desc:desc||'Something happened in the hospital.',
    impactHtml:impactHtml||'<div>No major impact details were recorded.</div>',
    choices:[{label:'Continue',type:'primary',action:()=>{}}]
  });
  if(actionsHtml){
    document.getElementById('event-actions').innerHTML=actionsHtml;
  }
}
function closeEvent(){
  document.getElementById('event-modal').classList.add('hidden');
  updateMenuBlurState();
}
function closeEventModal(){
  closeEvent();
}

function isNightShiftUnlocked(){
  return rooms.some(r=>r.type==='hr_office'&&isConn(r))&&staff.some(s=>s.hired&&s.role==='hr_manager');
}
function getUnlockedShifts(){return isNightShiftUnlocked()?SHIFTS:['day'];}
function ensureStaffPoolCoverage(){
  const allowedShifts=getUnlockedShifts();
  Object.keys(ROLES).forEach(role=>{
    allowedShifts.forEach(shift=>{
      while(staffPool.filter(s=>!s.hired&&s.role===role&&s.shift===shift).length<2)staffPool.push(genStaffMember(role,shift));
    });
  });
}
function currentShift(){return isNightShiftUnlocked()?(gameTime%DAY_TICKS<SHIFT_TICKS?'day':'night'):'day';}
function currentShiftLabel(){return currentShift()==='day'?'Day':'Night';}
function getRoomRoles(rm){const d=RDEFS[rm.type];return[d.staffRole,...(d.supportRoles||[])].filter(Boolean);}
function roleUsesGlobalCoverage(role){return !!role;}
function isCnaCoverageRoom(rm){return !!rm&&['gp','er','xray','pharmacy','lab'].includes(rm.type);}
function roomSupportsRole(rm,role){return false;}
function isStaffAvailable(member,shift=currentShift()){
  return !!member&&member.hired&&member.shift===shift&&member.state!=='out_sick'&&member.state!=='on_break'&&member.state!=='on_vacation';
}
function randomHiredStaff(){
  const pool=staff.filter(s=>s.hired&&s.state!=='out_sick');
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
function getStaffForRoleShift(role,shift=currentShift()){return staff.find(s=>isStaffAvailable(s,shift)&&s.role===role)||null;}
 function getAssignedStaffForRoomRole(roomId,role,shift=currentShift()){
  return getStaffForRoleShift(role,shift);
}
function getStaffForRoom(roomId){
  const rm=rooms.find(r=>r.id===roomId);
  if(!rm||!RDEFS[rm.type].staffRole)return null;
  return getAssignedStaffForRoomRole(roomId,RDEFS[rm.type].staffRole);
}
function isRoomTemporarilyDisabled(rm){
  if(!rm)return false;
  if(rm.disabled&&rm.disabledUntil&&Date.now()>=rm.disabledUntil){
    rm.disabled=false;
    rm.disabledUntil=0;
  }
  return !!rm.disabled;
}
function disableRoom(room,durationMs=5000){
  if(!room)return;
  room.disabled=true;
  room.disabledUntil=Date.now()+durationMs;
  setTimeout(()=>{
    room.disabled=false;
    room.disabledUntil=0;
    updateUI();
    render();
  },durationMs);
  updateUI();
  render();
}
function getRoomStaffMembers(rm,shift=currentShift()){
  const seen=new Set();
  return getRoomRoles(rm).map(role=>getStaffForRoleShift(role,shift)).filter(member=>{
    if(!member||seen.has(member.id))return false;
    seen.add(member.id);
    return true;
  });
}
function getMissingRoomRoles(rm,shift=currentShift()){
  if(isRoomTemporarilyDisabled(rm))return getRoomRoles(rm);
  return getRoomRoles(rm).filter(role=>!getStaffForRoleShift(role,shift));
}
function roomHasRequiredStaff(rm,shift=currentShift()){
  if(isRoomTemporarilyDisabled(rm))return false;
  return getMissingRoomRoles(rm,shift).length===0;
}
function getJanitors(){return staff.filter(s=>s.hired&&s.state!=='out_sick'&&s.role==='janitor');}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function visibleByShift(member){
  if(!isNightShiftUnlocked()&&member.shift==='night')return false;
  return staffShiftFilter==='all'||member.shift===staffShiftFilter;
}
function setStaffShiftFilter(filter){
  if(filter==='night'&&!isNightShiftUnlocked())return;
  if(filter==='all'&&!isNightShiftUnlocked())filter='day';
  staffShiftFilter=filter;
  renderStaffModal();
}
function requiredNursesPerShift(){return Math.ceil(rooms.filter(r=>roomHasVerticalAccess(r)&&r.type!=='head_office').length/4);}
function requiredCnasPerShift(){
  if(!isRoleUnlocked('cna'))return 0;
  return Math.ceil(rooms.filter(r=>roomHasVerticalAccess(r)&&isCnaCoverageRoom(r)).length/2);
}
function assignedCoverageCount(role,shift,predicate){
  return staff.filter(s=>isStaffAvailable(s,shift)&&s.role===role).length;
}
function coverageStatus(shift=currentShift()){
  const nurseNeeded=requiredNursesPerShift();
  const cnaNeeded=requiredCnasPerShift();
  const nurseAssigned=assignedCoverageCount('nurse',shift,rm=>rm&&rm.type!=='head_office');
  const cnaAssigned=assignedCoverageCount('cna',shift,rm=>isCnaCoverageRoom(rm));
  return{
    nurseNeeded,
    cnaNeeded,
    nurseAssigned,
    cnaAssigned,
    nurseShort:Math.max(0,nurseNeeded-nurseAssigned),
    cnaShort:Math.max(0,cnaNeeded-cnaAssigned)
  };
}
function isUnlocked(feature){
  return unlockedTools.has(feature)||unlockedRoles.has(feature)||unlockedFeatures.has(feature);
}
function unlockRoom(room){
  unlockedTools.add(room);
}
function unlockRole(role){
  unlockedRoles.add(role);
}
function unlockAll(){
  Object.keys(RDEFS).forEach(room=>unlockRoom(room));
  unlockRoom('luxury_path');
  Object.keys(ROLES).forEach(role=>unlockRole(role));
  addLog('All rooms and roles unlocked.','g');
  updateUI();
  render();
}
function isToolUnlocked(tool){
  if(isSandboxMode)return true;
  return unlockedTools.has(tool);
}
function isRoleUnlocked(role){
  if(isSandboxMode)return true;
  return unlockedRoles.has(role);
}
function hasFeature(feature){
  if(isSandboxMode)return true;
  return unlockedFeatures.has(feature);
}
function getResearchDef(id){return RESEARCH_TREE.find(t=>t.id===id)||null;}
function getResearchForTool(tool){return RESEARCH_TREE.find(t=>(t.unlockTools||[]).includes(tool))||null;}
function getResearchForFeature(feature){return RESEARCH_TREE.find(t=>(t.unlockFeatures||[]).includes(feature))||null;}
function getResearchForRole(role){return RESEARCH_TREE.find(t=>(t.unlockRoles||[]).includes(role))||null;}
function isResearchComplete(id){return researchedTech.has(id);}
function canResearch(tech){return !activeResearch&&!researchedTech.has(tech.id)&&tech.requires.every(req=>researchedTech.has(req));}
function getMilestoneForTool(tool){return MILESTONES.find(m=>m.unlockTools.includes(tool))||null;}
function getMilestoneForRole(role){return MILESTONES.find(m=>m.unlockRoles.includes(role))||null;}
function getToolLockedText(tool){
  const milestone=getMilestoneForTool(tool);
  if(milestone)return`Unlock: ${milestone.name}`;
  const research=getResearchForTool(tool);
  return research?`Research: ${research.name}`:'Locked';
}
function getRoleLockedText(role){
  const milestone=getMilestoneForRole(role);
  if(milestone)return`Unlocks with ${milestone.name}`;
  const research=getResearchForRole(role);
  return research?`Research: ${research.name}`:'Locked';
}
function getRoomRequirementText(type){
  const d=RDEFS[type];
  if(!d)return'';
  if(type==='waiting_room')return'Needs: clerical intake';
  if(type==='nurse_station')return'Needs: morale support';
  if(type==='staff_room')return'Needs: staff break space';
  if(type==='lunch_room')return'Needs: patient comfort space';
  if(type==='bathroom')return'Needs: restroom access';
  if(type==='janitor_closet')return'Needs: janitor support space';
  if(type==='hvac_generator')return'Needs: backup power and climate control';
  if(type==='research_department')return'Needs: researcher-led lab space';
  if(type==='grant_writer_office')return'Needs: grant writer funding office';
  if(type==='vending_machine')return'Needs: patient snack access';
  if(type==='drink_station')return'Needs: waiting room refreshments';
  if(type==='atm_kiosk')return'Needs: visitor convenience space';
  if(type==='ambulance_bay')return'Needs: touch Dispatch Office and ER';
  if(type==='front_entrance')return'Needs: public access point';
  if(type==='staff_entrance')return'Needs: staff-only access point';
  if(type==='er_entrance')return'Needs: emergency intake access';
  if(type==='staircase')return'Needs: unlocks the next floor';
  if(type==='elevator')return'Needs: unlocks the next floor';
  if(type==='single_hospital_room')return'Needs: nurse + CNA inpatient support';
  if(type==='double_hospital_room')return'Needs: nurse + CNA inpatient support';
  if(type==='general_icu')return'Needs: nurse + ER attending critical care';
  if(type==='cardiac_icu')return'Needs: nurse + ER attending + dept. attending critical care';
  if(type==='med_surg')return'Needs: nurse + CNA inpatient coverage';
  if(type==='pediatrics')return'Needs: GP doctor + nurse pediatric care';
  if(type==='obgyn')return'Needs: surgeon + nurse labor and delivery';
  if(type==='radiology')return'Needs: dept. attending imaging services';
  if(type==='rehab')return'Needs: nurse + CNA recovery support';
  if(type==='cardiology')return'Needs: dept. attending + nurse heart care';
  if(type==='oncology')return'Needs: dept. attending + nurse long-term care';
  if(type==='behavioral_health')return'Needs: GP doctor + nurse behavioral care';
  if(type==='geriatrics')return'Needs: GP doctor + nurse + CNA senior care';
  if(type==='administration')return'Needs: medical director + HR manager leadership';
  if(type==='case_management')return'Needs: clerical discharge and care coordination';
  if(!d.staffRole&&!(d.supportRoles||[]).length)return'Needs: seating';
  return`Needs: ${[ROLES[d.staffRole].label,...(d.supportRoles||[]).map(role=>ROLES[role].label)].join(' + ')}`;
}
function getCoverageWarning(assigned,needed,label){
  if(needed===0)return `${label} coverage not needed yet`;
  if(assigned>=needed)return `${label} coverage is meeting the active shift target`;
  return `${label} shortage: ${needed-assigned} more needed on the active shift`;
}
function getDepartmentLevel(key){
  return Math.max(1,departments?.[key]?.level??DEPARTMENT_DEFS[key]?.startLevel??1);
}
function getDepartmentBonus(dep){
  const lvl=getDepartmentLevel(dep);
  return{
    efficiency:1+(lvl*0.1),
    stressReduction:lvl*0.05
  };
}
function getDepartmentUpgradeCost(key){
  const def=DEPARTMENT_DEFS[key];
  if(!def)return 0;
  const level=getDepartmentLevel(key);
  return Math.max(500,Math.round(def.baseCost*Math.pow(1.5,Math.max(0,level-def.startLevel))*getGrantDepartmentUpgradeMultiplier(key)));
}
function getDepartmentStatus(key){
  const def=DEPARTMENT_DEFS[key];
  if(!def)return{chip:'locked',label:'Locked'};
  if(key==='er'&&!rooms.some(r=>['er','general_icu','cardiac_icu','surgery'].includes(r.type)))return{chip:'locked',label:'Build ER Wing'};
  if(key==='lab'&&!rooms.some(r=>['lab','xray','radiology'].includes(r.type)))return{chip:'locked',label:'Build Diagnostics'};
  if(key==='ward'&&!rooms.some(r=>['ward','med_surg','single_hospital_room','double_hospital_room','geriatrics','oncology'].includes(r.type)))return{chip:'locked',label:'Build Inpatient Wing'};
  return{chip:'operational',label:'Active'};
}
function getDepartmentRoomBonus(rm){
  if(!rm)return 1;
  if(['er','general_icu','cardiac_icu','surgery'].includes(rm.type))return 1/getDepartmentBonus('er').efficiency;
  if(['lab','xray','radiology'].includes(rm.type))return 1/getDepartmentBonus('lab').efficiency;
  if(['ward','med_surg','single_hospital_room','double_hospital_room','geriatrics','oncology'].includes(rm.type))return 1/getDepartmentBonus('ward').efficiency;
  return 1;
}
function getOperationsDepartmentStressRelief(){
  return getDepartmentBonus('operations').stressReduction;
}
function getOperationsDepartmentCleanBonus(){
  return getDepartmentBonus('operations').stressReduction*8;
}
function upgradeDepartment(key){
  const def=DEPARTMENT_DEFS[key];
  if(!def)return;
  const d=departments[key];
  if(!d)return;
  const status=getDepartmentStatus(key);
  if(status.chip==='locked'){
    addLog(`${def.label} department is not ready yet. ${status.label}.`,'w');
    return;
  }
  const cost=d.level*3000;
  if(!isSandboxMode&&money<cost){
    addLog(`Not enough money to upgrade ${def.label}.`,'b');
    return;
  }
  if(!isSandboxMode)changeMoney(-cost);
  d.level++;
  addLog(`${key.toUpperCase()} upgraded to level ${d.level}`,'g');
  showToast(`${def.label} upgraded`,'good');
  updateUI();
}
function waitingPatientsCount(){return patients.filter(p=>p.state==='waiting').length;}
function roomHasLinkRequirements(rm){
  if(!rm)return false;
  if(rm.type==='waiting_room')return waitingRoomConnectedToReception(rm);
  const floor=getRoomFloor(rm);
  if(rm.type==='ambulance_bay')return roomAdjacentToType(rm.c,rm.r,rm.w,rm.h,'dispatch_office',floor)&&roomAdjacentToType(rm.c,rm.r,rm.w,rm.h,'er',floor);
  if(rm.type==='dispatch_office'){
    return rooms.some(bay=>getRoomFloor(bay)===floor&&bay.type==='ambulance_bay'&&roomAdjacentToType(rm.c,rm.r,rm.w,rm.h,'ambulance_bay',floor)&&roomHasLinkRequirements(bay));
  }
  return true;
}
function hasOperationalRoom(type){return rooms.some(r=>r.type===type&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasLinkRequirements(r)&&roomHasRequiredStaff(r));}
function countOperationalRooms(type,shift=currentShift()){return rooms.filter(r=>r.type===type&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasLinkRequirements(r)&&roomHasRequiredStaff(r,shift)).length;}
function hasBuiltRoom(type){return rooms.some(r=>r.type===type);}
function countBuiltRooms(type){return rooms.filter(r=>r.type===type).length;}
function getHiredRoleCount(role,shift=currentShift()){return staff.filter(s=>s.hired&&s.role===role&&s.shift===shift).length;}
function getActiveMedicalDirector(shift=currentShift()){return staff.find(s=>s.hired&&s.role==='medical_director'&&s.shift===shift)||null;}
function getDirectorTrait(shift=currentShift()){return getActiveMedicalDirector(shift)?.specialTrait||null;}
function isClinicalRoomType(type){return ['gp','vip_room','er','ward','surgery','xray','pharmacy','lab','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','med_surg','pediatrics','obgyn','radiology','rehab','cardiology','oncology','behavioral_health','geriatrics'].includes(type);}
function isPathTile(tile){return tile==='corridor'||tile==='luxury_path';}
function isPathTool(tool){return tool==='corridor'||tool==='luxury_path';}
function getPathCost(tool){return PATH_COSTS[tool]||PATH_COSTS.corridor;}
function getPathRefund(tool){return Math.floor(getPathCost(tool)*0.5);}
function getInternsOnShift(shift=currentShift()){return staff.filter(s=>s.hired&&s.role==='intern'&&s.shift===shift);}
function isChargeBreakRole(role){return role==='nurse'||role==='cna'||role==='intern';}
function isDeptHeadBreakRole(role){return role!=='dept_attending'&&role!=='medical_director';}
function getChargeNursesOnShift(shift=currentShift()){
  return staff.filter(s=>s.hired&&s.role==='charge_nurse'&&s.shift===shift&&s.state!=='out_sick');
}
function getChargeNurseSupport(shift=currentShift()){
  const activeChargeNurses=getChargeNursesOnShift(shift).filter(s=>s.state!=='on_break'&&(s.energy??100)>=35);
  return{
    count:activeChargeNurses.length,
    breakEnergyBonus:activeChargeNurses.reduce((sum,s)=>sum+(s.specialTrait?.breakEnergyBonus||0),0),
    breakMoraleBonus:activeChargeNurses.reduce((sum,s)=>sum+(s.specialTrait?.breakMoraleBonus||0),0)
  };
}
function getDeptHeadSupport(shift=currentShift()){
  const activeDeptHeads=staff.filter(s=>
    s.hired&&
    s.role==='dept_attending'&&
    s.shift===shift&&
    s.state!=='out_sick'&&
    s.state!=='on_break'&&
    (s.energy??100)>=35
  );
  const officeCoverage=countOperationalRooms('head_office',shift);
  return{
    count:Math.min(activeDeptHeads.length,officeCoverage),
    active:Math.min(activeDeptHeads.length,officeCoverage)>0,
    breakEnergyBonus:Math.min(activeDeptHeads.length,officeCoverage)*2,
    breakMoraleBonus:Math.min(activeDeptHeads.length,officeCoverage)
  };
}
function getGuardCount(shift=currentShift()){return getHiredRoleCount('security_officer',shift);}
function getSecurityTeam(shift=currentShift()){
  return staff.filter(s=>s.hired&&s.role==='security_officer'&&s.shift===shift&&s.state!=='out_sick'&&s.state!=='on_vacation');
}
function getGuardStressReduction(shift=currentShift()){
  const traitBonus=getSecurityTeam(shift).reduce((sum,guard)=>sum+((guard.specialTrait?.guardStressReductionBonus)||0),0);
  return Math.min(24,getGuardCount(shift)*5+countOperationalRooms('security_office',shift)*4+traitBonus);
}
function getGuardProtection(shift=currentShift()){
  const traitBonus=getSecurityTeam(shift).reduce((sum,guard)=>sum+((guard.specialTrait?.guardProtectionBonus)||0),0);
  return clamp(getGuardCount(shift)*0.24+countOperationalRooms('security_office',shift)*0.14+traitBonus,0,0.85);
}
function getSecurityRepPenalty(shift=currentShift()){
  return getSecurityTeam(shift).reduce((sum,guard)=>sum+((guard.specialTrait?.securityRepPenalty)||0),0);
}
function getPassiveDramaStress(shift=currentShift()){
  let passiveChaos=0;
  staff.forEach(s=>{
    if(!s.hired||s.shift!==shift)return;
    (s.traits||[]).forEach(t=>{
      if(t.dramaEvent)passiveChaos+=1;
    });
  });
  return passiveChaos;
}
function getInternAssistBonus(shift=currentShift(),roomType=null){
  if(roomType&&!isClinicalRoomType(roomType))return 0;
  const interns=getInternsOnShift(shift);
  if(!interns.length)return 0;
  const avgLevel=interns.reduce((sum,intern)=>sum+(intern.level??1),0)/interns.length;
  return Math.min(0.12,interns.length*0.01+Math.max(0,avgLevel-1)*0.012);
}
function getItSupportLevel(shift=currentShift()){return countOperationalRooms('it_department',shift);}
function getItStressReduction(shift=currentShift()){return Math.min(12,getItSupportLevel(shift)*4);}
function getItDispatchBoost(shift=currentShift()){return Math.min(1,getItSupportLevel(shift));}
function getItResearchBoost(shift=currentShift()){return Math.min(1,getItSupportLevel(shift));}
function getResearcherCount(shift=currentShift()){return getHiredRoleCount('researcher',shift);}
function getResearchDepartmentCount(shift=currentShift()){return countOperationalRooms('research_department',shift);}
function getResearchDepartmentBoost(shift=currentShift()){
  if(getResearchDepartmentCount(shift)<=0)return 0;
  return Math.min(2,getResearcherCount(shift)*0.5);
}
function hasGrantWriterOfficeBuilt(){return hasBuiltRoom('grant_writer_office');}
function hasGrantWriterOfficeAccess(){
  return isSandboxMode||countOperationalRooms('grant_writer_office','day')>0||countOperationalRooms('grant_writer_office','night')>0;
}
function getGrantWriterTeam(){
  return staff.filter(member=>member.hired&&member.role==='grant_writer'&&member.state!=='on_vacation'&&member.state!=='out_sick');
}
function getGrantWriterTrait(member){
  return member?.specialTrait||member?.traits?.find(trait=>trait.group==='grant_writer')||null;
}
function getJanitorTraitCleanBonus(shift=currentShift()){
  return staff
    .filter(member=>member.hired&&member.role==='janitor'&&member.shift===shift&&member.state!=='out_sick'&&member.state!=='on_vacation')
    .reduce((sum,member)=>sum+((member.specialTrait?.janitorCleanBonus)||0),0);
}
function getJanitorTraitStressRelief(shift=currentShift()){
  return staff
    .filter(member=>member.hired&&member.role==='janitor'&&member.shift===shift&&member.state!=='out_sick'&&member.state!=='on_vacation')
    .reduce((sum,member)=>sum+((member.specialTrait?.janitorStressRelief)||0),0);
}
function isGovernmentGrant(def){return def?.category==='Government Grants';}
function isCommunityGrant(def){return ['public_care_support','community_health_access','rural_underserved'].includes(def?.id);}
function isTechnicalGrant(def){return ['diagnostic_modernization','technology_infrastructure','hospital_modernization','energy_efficiency'].includes(def?.id)||['Medical Department Grants','Infrastructure Grants'].includes(def?.category);}
function isLargeGrant(def){
  const cash=def?.effect?.approvalCash||0;
  return cash>=5000||(def?.durationDays||0)>=10||(def?.reviewDays||0)>=4;
}
function isSmallGrant(def){
  const cash=def?.effect?.approvalCash||0;
  return cash>0&&cash<=3000&&(def?.reviewDays||0)<=3;
}
function getGrantWriterOfferModifiers(offer){
  const def=getGrantDef(offer?.id)||offer||null;
  const writers=getGrantWriterTeam();
  if(!writers.length||!def)return{approval:0,reviewDaysOffset:0,rewardMult:1,overpromiseRisk:false};
  let approval=0;
  let reviewDaysOffset=0;
  let rewardMult=1;
  writers.forEach(writer=>{
    const trait=getGrantWriterTrait(writer);
    if(!trait)return;
    approval+=trait.grantApprovalBonus||0;
    approval-=trait.grantApprovalPenalty||0;
    if(isGovernmentGrant(def)){
      approval+=trait.governmentGrantBonus||0;
      approval-=trait.governmentGrantPenalty||0;
      if(recentAuditFailureDays>0)approval-=trait.auditPenalty||0;
    }else{
      approval+=trait.privateGrantBonus||0;
      approval-=trait.privateGrantPenalty||0;
    }
    if(isCommunityGrant(def))approval+=trait.communityGrantBonus||0;
    if(isTechnicalGrant(def))approval+=trait.technicalGrantBonus||0;
    reviewDaysOffset+=trait.reviewDaysOffset||0;
    if(trait.grantRewardMult)rewardMult*=trait.grantRewardMult;
  });
  return{
    approval:clamp(approval,-0.22,0.24),
    reviewDaysOffset:clamp(Math.round(reviewDaysOffset),-2,3),
    rewardMult:clamp(rewardMult,0.85,1.4),
    overpromiseRisk:false
  };
}
function getGrantWriterSkillBonus(){
  const writers=getGrantWriterTeam();
  if(!writers.length)return 0;
  const total=writers.reduce((sum,writer)=>{
    let bonus=0.04;
    bonus+=clamp(((writer.energy??100)-50)/1000,-0.01,0.03);
    bonus+=clamp(((writer.morale??100)-50)/1000,-0.01,0.03);
    const trait=getGrantWriterTrait(writer);
    if(trait?.id==='persuasive_writer')bonus+=0.02;
    if(trait?.id==='policy_expert')bonus+=0.01;
    return sum+bonus;
  },0);
  return Math.min(0.18,total);
}
function getGrantGovernmentComplianceBonus(){
  if(totalPatients===0)return 0.02;
  const rate=getPublicCareRate();
  if(rate>=govRequired)return 0.08;
  if(rate>=govRequired-0.1)return 0;
  return -0.08;
}
function getGrantAdminLevelBonus(){
  return Math.max(0,getDepartmentLevel('operations')-1)*0.03;
}
function getGrantStressPenalty(){
  if(stress<40)return 0;
  return clamp((stress-35)/220,0,0.22);
}
function getGrantDirtyPenalty(){
  if(cleanliness>=70)return 0;
  return clamp((70-cleanliness)/180,0,0.18);
}
function getGrantAuditFailurePenalty(){
  return recentAuditFailureDays>0?0.12:0;
}
function getGrantApprovalChance(offer){
  const grantWriterSkill=getGrantWriterSkillBonus();
  const grantTraitBonus=Number.isFinite(offer?.grantTraitApprovalBonus)?offer.grantTraitApprovalBonus:getGrantWriterOfferModifiers(offer).approval;
  const reputationBonus=clamp((reputation-50)/500,-0.08,0.1);
  const complianceBonus=getGrantGovernmentComplianceBonus();
  const stressPenalty=getGrantStressPenalty();
  const cleanlinessPenalty=getGrantDirtyPenalty();
  const chance=
    0.45
    +grantWriterSkill
    +grantTraitBonus
    +reputationBonus
    +complianceBonus
    -stressPenalty
    -cleanlinessPenalty;
  return clamp(chance,0.15,0.95);
}
function getGrantDef(id){return GRANT_LIBRARY.find(grant=>grant.id===id)||null;}
function getActiveGrantOffers(){return grantOffers.filter(offer=>offer.status==='active');}
function getGrantNurseMoraleAverage(){
  const team=staff.filter(member=>member.hired&&['nurse','cna','charge_nurse'].includes(member.role));
  if(!team.length)return 100;
  return team.reduce((sum,member)=>sum+(member.morale??100),0)/team.length;
}
function isGrantRequirementMet(def){
  if(!def)return false;
  switch(def.id){
    case 'public_care_support':
      return getPublicCareRate()>=govRequired;
    case 'community_health_access':
      return govTreated>=4&&waitingPatientsCount()<Math.max(4,effectiveWaitingCapacity());
    case 'emergency_readiness':
      return countOperationalRooms('er')>0||countOperationalRooms('ambulance_bay')>0;
    case 'rural_underserved':
      return getPublicCareRate()>=0.35;
    case 'diagnostic_modernization':
      return rooms.some(r=>['lab','xray','radiology'].includes(r.type));
    case 'critical_care_expansion':
      return reputation>=70;
    case 'surgical_capacity':
      return staff.some(member=>member.hired&&member.role==='surgeon')&&cleanliness>=65;
    case 'behavioral_health_access':
      return rooms.some(r=>r.type==='case_management');
    case 'nurse_retention':
      return getGrantNurseMoraleAverage()>=55;
    case 'training_pipeline':
      return hasBuiltRoom('hr_office')||hasBuiltRoom('research_department');
    case 'burnout_prevention':
      return hasBuiltRoom('staff_room')||hasBuiltRoom('lunch_room');
    case 'night_shift_stabilization':
      return hasBuiltRoom('hr_office')&&isNightShiftUnlocked();
    case 'energy_efficiency':
      return hasBuiltRoom('hvac_generator');
    case 'hospital_modernization':
      return getCurrentStageIndex()>=1;
    case 'accessibility_improvement':
      return getUnlockedFloorCount()>1;
    case 'technology_infrastructure':
      return hasBuiltRoom('it_department')||hasBuiltRoom('research_department');
    default:
      return true;
  }
}
function makeGrantOffer(){
  const blocked=new Set(grantOffers.map(offer=>offer.id));
  const pool=GRANT_LIBRARY.filter(grant=>!blocked.has(grant.id)&&isGrantRequirementMet(grant));
  const pick=(pool.length?pool:GRANT_LIBRARY.filter(grant=>!blocked.has(grant.id)))[Math.floor(Math.random()*Math.max(1,(pool.length?pool.length:GRANT_LIBRARY.filter(grant=>!blocked.has(grant.id)).length)))];
  if(!pick)return null;
  return{
    id:pick.id,
    category:pick.category,
    label:pick.label,
    desc:pick.desc,
    rewardText:pick.rewardText,
    reviewDays:pick.reviewDays,
    successChance:pick.successChance,
    durationDays:pick.durationDays||0,
    effect:pick.effect||null,
    status:'available',
    daysLeft:pick.reviewDays,
    completed:false
  };
}
function ensureGrantOffers(){
  if(!hasGrantWriterOfficeAccess())return;
  while(grantOffers.filter(offer=>['available','review','active'].includes(offer.status)).length<3){
    const nextOffer=makeGrantOffer();
    if(!nextOffer)break;
    grantOffers.push(nextOffer);
  }
}
function applyForGrant(id){
  const offer=grantOffers.find(item=>item.id===id&&item.status==='available');
  if(!offer)return;
  const traitMods=getGrantWriterOfferModifiers(offer);
  offer.status='review';
  offer.grantTraitApprovalBonus=traitMods.approval;
  offer.grantRewardMult=traitMods.rewardMult;
  offer.overpromiseRisk=traitMods.overpromiseRisk;
  offer.reviewDaysAdjusted=Math.max(1,offer.reviewDays+traitMods.reviewDaysOffset);
  offer.daysLeft=offer.reviewDaysAdjusted;
  addLog(`Applied for ${offer.label}. Review period: ${offer.reviewDaysAdjusted} day${offer.reviewDaysAdjusted===1?'':'s'}.`,'');
  updateUI();
}
function expireGrantOffer(offer){
  grantOffers=grantOffers.filter(item=>item!==offer);
}
function activateGrantOffer(offer,def){
  if(!offer||!def)return;
  const effect=def.effect||{};
  const rewardMult=Number.isFinite(offer.grantRewardMult)?offer.grantRewardMult:1;
  if(effect.approvalCash)changeMoney(Math.round(effect.approvalCash*rewardMult));
  if(def.id==='community_health_access'){
    if(effect.reputation)adjustReputation(effect.reputation,'Community Health Access grant success','g');
    offer.completed=true;
    addLog(`${offer.label} approved. Community funding received.`,'g');
    showToast('Grant approved','good');
    expireGrantOffer(offer);
    return;
  }
  if(def.id==='behavioral_health_access'){
    freeBuildCredits.behavioral_health=(freeBuildCredits.behavioral_health||0)+1;
    offer.completed=true;
    addLog(`${offer.label} approved. Behavioral Health funding and one room credit awarded.`,'g');
    showToast('Grant approved','good');
    expireGrantOffer(offer);
    return;
  }
  if((effect.durationDays||offer.durationDays||0)>0){
    offer.status='active';
    offer.daysLeft=effect.durationDays||offer.durationDays;
    addLog(`${offer.label} approved. Grant effect active for ${offer.daysLeft} days.`,'g');
    showToast('Grant approved','good');
    return;
  }
  offer.completed=true;
  addLog(`${offer.label} approved. Funding secured.`,'g');
  showToast('Grant approved','good');
  expireGrantOffer(offer);
}
function denyGrantOffer(offer){
  if(!offer)return;
  offer.status='denied';
  offer.daysLeft=2;
  addLog(`${offer.label} was denied after review.`,'w');
  showToast('Grant denied','warn');
}
function resolveGrantReview(offer){
  const def=getGrantDef(offer?.id);
  if(!offer||!def)return;
  const requirementMet=isGrantRequirementMet(def);
  const approved=requirementMet&&Math.random()<getGrantApprovalChance(offer);
  if(approved)activateGrantOffer(offer,def);
  else denyGrantOffer(offer);
}
function progressGrantProgramsDay(){
  if(!grantOffers.length)return;
  grantOffers.slice().forEach(offer=>{
    if(offer.status==='review'){
      offer.daysLeft=Math.max(0,(offer.daysLeft??offer.reviewDaysAdjusted??offer.reviewDays)-1);
      if(offer.daysLeft<=0)resolveGrantReview(offer);
    }else if(offer.status==='active'){
      offer.daysLeft=Math.max(0,(offer.daysLeft??offer.durationDays)-1);
      if(offer.daysLeft<=0){
        if(offer.overpromiseRisk&&(stress>=70||cleanliness<60||waitingPatientsCount()>=8||getPublicCareRate()<govRequired)){
          changeMoney(-1500);
          adjustReputation(-2,'Grant overpromises backfired after hospital underperformance','w');
          addLog(`${offer.label} ended poorly after an overpromised outcome review. Funding clawback applied.`,'w');
        }
        addLog(`${offer.label} has ended.`,'');
        expireGrantOffer(offer);
      }
    }else if(offer.status==='denied'){
      offer.daysLeft=Math.max(0,(offer.daysLeft??2)-1);
      if(offer.daysLeft<=0)expireGrantOffer(offer);
    }
  });
  if(recentAuditFailureDays>0)recentAuditFailureDays=Math.max(0,recentAuditFailureDays-1);
  ensureGrantOffers();
}
function checkGrantProgress(){
  if(!hasGrantWriterOfficeAccess())return;
  ensureGrantOffers();
}
function getGrantRoomBuildCostMultiplier(roomType){
  return getActiveGrantOffers().reduce((mult,offer)=>{
    if(offer.effect?.kind==='room_discount'&&offer.effect.roomTypes?.includes(roomType))return mult*(1-(offer.effect.discount||0));
    return mult;
  },1);
}
function getGrantDepartmentUpgradeMultiplier(key){
  return getActiveGrantOffers().reduce((mult,offer)=>{
    if(offer.effect?.kind==='department_discount'&&offer.effect.departments?.includes(key))return mult*(1-(offer.effect.discount||0));
    return mult;
  },1);
}
function getPublicPatientGrantSubsidy(){
  return getActiveGrantOffers().reduce((sum,offer)=>{
    if(offer.effect?.kind==='public_subsidy')sum+=offer.effect.subsidyPerCase||0;
    return sum;
  },0);
}
function getGrantResearchDailyBonus(){
  return getActiveGrantOffers().reduce((sum,offer)=>{
    if(offer.effect?.kind==='technology_boost')sum+=offer.effect.rpPerDay||0;
    return sum;
  },0);
}
function getGrantResearchSpeedBonus(){
  return getActiveGrantOffers().reduce((sum,offer)=>{
    if(offer.effect?.kind==='technology_boost')sum+=offer.effect.researchSpeedBonus||0;
    return sum;
  },0);
}
function getGrantTrainingXpMultiplier(){
  return getActiveGrantOffers().reduce((mult,offer)=>{
    if(offer.effect?.kind==='training_pipeline')return mult*(offer.effect.xpMult||1);
    return mult;
  },1);
}
function getGrantQuitRiskRelief(){
  return getActiveGrantOffers().some(offer=>offer.effect?.kind==='burnout_prevention')?0.04:0;
}
function getGrantNightMoraleBonus(shift=currentShift()){
  return shift==='night'&&getActiveGrantOffers().some(offer=>offer.effect?.kind==='night_support')?1:0;
}
function getGrantOperationsStressRelief(){
  return getActiveGrantOffers().reduce((sum,offer)=>{
    if(['burnout_prevention','energy_efficiency'].includes(offer.effect?.kind))sum+=offer.effect.stressRelief||0;
    return sum;
  },0);
}
function hasMarketingOfficeAccess(shift=currentShift()){return countOperationalRooms('marketing_office',shift)>0;}
function hasMarketingOfficeBuilt(){return hasBuiltRoom('marketing_office');}
function getLunchRoomPatienceBonus(){return Math.min(9,countOperationalRooms('lunch_room')*3);}
function getBathroomPatienceBonus(){return Math.min(8,countOperationalRooms('bathroom')*2);}
function getAmenityPatienceBonus(){
  return Math.min(6,countOperationalRooms('vending_machine')+countOperationalRooms('drink_station')+countOperationalRooms('atm_kiosk'));
}
function getJanitorClosetBonus(shift=currentShift()){return countOperationalRooms('janitor_closet',shift)*1.4;}
function getHvacSupportBonus(shift=currentShift()){return countOperationalRooms('hvac_generator',shift);}
function getHvacStressRelief(shift=currentShift()){return Math.min(6,getHvacSupportBonus(shift)*2);}
function getHvacCleanlinessBonus(shift=currentShift()){return Math.min(3,getHvacSupportBonus(shift)*1.2);}
function getBathroomStressRelief(shift=currentShift()){return Math.min(5,countOperationalRooms('bathroom',shift)*1.5);}
function getEffectiveLongWaitThreshold(){
  const directorTrait=getDirectorTrait();
  return REP_LONG_WAIT_THRESHOLD+(hasFeature('triage_protocols')?6:0)+getLunchRoomPatienceBonus()+getBathroomPatienceBonus()+getAmenityPatienceBonus()+(directorTrait?.waitThresholdAdd||0);
}
function getEffectiveUntreatedLeaveThreshold(){
  const directorTrait=getDirectorTrait();
  return REP_UNTREATED_LEAVE_THRESHOLD+(hasFeature('triage_protocols')?8:0)+getLunchRoomPatienceBonus()+getBathroomPatienceBonus()+getAmenityPatienceBonus()+3+(directorTrait?.waitThresholdAdd||0);
}
function levelUpIntern(staffMember){
  if(staffMember.role!=='intern')return;
  staffMember.xp=0;
  staffMember.level=(staffMember.level??1)+1;
  if(!Array.isArray(staffMember.traits))staffMember.traits=[];
  staffMember.traits.push({
    id:'experienced',
    label:'Experienced',
    type:'good',
    group:'bonus',
    speedMult:0.95
  });
  addLog(`${staffMember.name} has improved and gained experience!`,'g');
  promoteIntern(staffMember);
}
function promoteIntern(staffMember){
  if(!staffMember||staffMember.role!=='intern')return;
  if((staffMember.level??1)<3)return;
  staffMember.role='gp_doc';
  staffMember.salary=ROLES.gp_doc.baseSalary;
  addLog(`${staffMember.name} has been promoted to GP Doctor!`,'g');
}
function promoteRandomIntern(){
  const eligibleInterns=staff.filter(s=>s.hired&&s.role==='intern'&&(s.level??1)>=3);
  if(!eligibleInterns.length){
    addLog('No intern is ready for promotion yet.','w');
    showToast('No eligible intern','info');
    return null;
  }
  const promoted=eligibleInterns[Math.floor(Math.random()*eligibleInterns.length)];
  promoteIntern(promoted);
  showToast('Intern promoted','good');
  updateUI();
  return promoted;
}
function giveXP(staffMember,amount=1){
  if(!staffMember||staffMember.role!=='intern')return;
  staffMember.xp=(staffMember.xp??0)+amount;
  if((staffMember.xp??0)>=10)levelUpIntern(staffMember);
}
function awardInternXp(roomType,shift=currentShift(),baseAmount=1){
  if(!isClinicalRoomType(roomType))return;
  const interns=getInternsOnShift(shift);
  if(!interns.length)return;
  const mentorBoost=staff.filter(s=>s.hired&&s.shift===shift&&s.workTrait?.mentor).length*0.35;
  const intern=interns[Math.floor(Math.random()*interns.length)];
  const learnerBoost=intern.workTrait?.xpBoost?0.4*intern.workTrait.xpBoost:0;
  giveXP(intern,(baseAmount+mentorBoost+learnerBoost)*getGrantTrainingXpMultiplier());
}
function getChaosRepLoss(baseLoss,shift=currentShift()){
  return Math.max(1,Math.round(baseLoss*(1-getGuardProtection(shift)))+getSecurityRepPenalty(shift));
}
function getUnderstaffedOperationalRooms(shift=currentShift()){
  return rooms.filter(r=>roomHasVerticalAccess(r)&&isConn(r)&&getMissingRoomRoles(r,shift).length>0).length;
}
function triggerSecurityIncident(shift=currentShift(),guardCount=getGuardCount(shift),stressLevel=getStressLevel()){
  const guards=guardCount;
  if(guards>0){
    addLog('Security handled a disturbance.','w');
    reputation=clamp(reputation-2,0,100);
  }else{
    addLog('Major incident! No security on site!','b');
    reputation=clamp(reputation-8,0,100);
    cleanliness=clamp(cleanliness-5,0,100);
    score=Math.max(0,score-10);
  }
  showToast('Security incident','warn');
}
function checkSecurityEvents(stressLevel=getStressLevel(),shift=currentShift()){
  if(stressLevel<60)return;
  const guards=getGuardCount(shift);
  let chance=0.15;
  if(stressLevel>75)chance=0.3;
  if(stressLevel>90)chance=0.5;
  chance-=guards*0.05;
  chance-=countOperationalRooms('security_office',shift)*0.04;
  chance=clamp(chance,0.02,0.75);
  if(Math.random()<chance){
    triggerSecurityIncident(shift,guards,stressLevel);
  }
}
function getRaiseRequestAmount(member){
  return Math.max(200,Math.round(member.salary*0.1/50)*50);
}
function maybeTriggerRaiseRequest(){
  if(day<4||day%4!==0)return;
  const pendingCount=staff.filter(s=>s.hired&&s.raiseRequest).length;
  if(pendingCount>=2)return;
  const eligible=staff.filter(s=>s.hired&&!s.raiseRequest&&(s.raiseCooldown??0)<=0&&(s.morale??100)<=45&&(s.issueImmunityDays??0)<=0&&s.state!=='on_vacation');
  if(!eligible.length)return;
  const weighted=eligible.flatMap(member=>Array.from({length:Math.max(1,Math.ceil((55-(member.morale??100))/5))},()=>member));
  const member=weighted[Math.floor(Math.random()*weighted.length)];
  member.raiseRequest={amount:getRaiseRequestAmount(member),requestedDay:day};
  addLog(`${member.name} requested a raise after a rough stretch on the ${member.shift} shift.`, 'w');
  showToast('Staff raise request','warn');
}
function getMissingOperationalRoles(shift=currentShift()){
  const needed=new Set();
  rooms.filter(r=>roomHasVerticalAccess(r)&&isConn(r)).forEach(rm=>{
    getMissingRoomRoles(rm,shift).forEach(role=>needed.add(role));
  });
  return [...needed];
}
function autoHireByHR(){
  if(!hasOperationalRoom('hr_office')||day%3!==0)return;
  ensureStaffPoolCoverage();
  const allowedShifts=getUnlockedShifts();
  const missingRoles=getMissingOperationalRoles();
  const available=staffPool.filter(s=>!s.hired&&allowedShifts.includes(s.shift));
  if(!available.length)return;
  const prioritized=available
    .filter(candidate=>missingRoles.includes(candidate.role))
    .sort((a,b)=>a.salary-b.salary);
  const fallback=available.slice().sort((a,b)=>a.salary-b.salary);
  const candidate=(prioritized[0]||fallback[0]||null);
  if(!candidate||money<candidate.salary)return;
  candidate.hired=true;
  staff.push(candidate);
  dailyStats.rolesHired[candidate.role]=(dailyStats.rolesHired[candidate.role]||0)+1;
  staffPool.push(genStaffMember(candidate.role,candidate.shift));
  addLog(`HR auto-hired ${candidate.name} (${ROLES[candidate.role].label}, ${candidate.shift} shift).`,'g');
  showToast('HR hired staff','info');
}
function autoApproveVacationsByHR(){
  if(!hasOperationalRoom('hr_office')||day%3!==0)return;
  const eligible=staff
    .filter(s=>s.hired&&s.state!=='on_vacation'&&((s.morale??100)<=35||(s.quitRiskDays??0)>=3))
    .sort((a,b)=>(a.morale??100)-(b.morale??100)||(b.quitRiskDays??0)-(a.quitRiskDays??0));
  const member=eligible[0];
  if(!member)return;
  sendStaffOnVacation(member.id,'hr');
}
function hasConflictTrait(member){return member?.personalityTrait?.id==='difficult';}
function maybeTriggerStaffConflict(stressLevel,shift=currentShift()){
  if(day<3)return;
  if(stressLevel<55&&day%3!==0)return;
  if(stressLevel>=55&&stressLevel<80&&day%2!==0)return;
  const shiftStaff=staff.filter(s=>s.hired&&s.shift===shift&&(s.issueImmunityDays??0)<=0);
  if(shiftStaff.length<2)return;
  const difficultCount=shiftStaff.filter(hasConflictTrait).length;
  const conflictChance=clamp(0.06+(stressLevel/100)*0.34+(difficultCount*0.07),0.08,0.88);
  if(Math.random()>conflictChance)return;
  const weightedPool=shiftStaff.flatMap(member=>hasConflictTrait(member)?[member,member,member]:[member]);
  const first=weightedPool[Math.floor(Math.random()*weightedPool.length)];
  const remaining=shiftStaff.filter(member=>member.id!==first.id);
  if(!remaining.length)return;
  const secondPool=remaining.flatMap(member=>hasConflictTrait(member)?[member,member]:[member]);
  const second=secondPool[Math.floor(Math.random()*secondPool.length)];
  const moraleDropA=clamp(8+Math.round(stressLevel/18)+(hasConflictTrait(first)?3:0),6,18);
  const moraleDropB=clamp(6+Math.round(stressLevel/22)+(hasConflictTrait(second)?2:0),5,16);
  first.morale=clamp((first.morale??100)-moraleDropA,0,100);
  second.morale=clamp((second.morale??100)-moraleDropB,0,100);
  addLog(`Staff conflict: ${first.name} and ${second.name} argued during the ${shift==='day'?'day':'night'} shift. Morale decreased.${hasConflictTrait(first)||hasConflictTrait(second)?` ${getTraitIcon({id:'difficult'})} Difficult trait increased tension.`:''}`,'w');
  showToast('Staff conflict','warn');
}
function getAdvertisingCost(){return 2500;}
function getBasePatientTrafficChance(){
  return clamp(reputation/100,0.12,0.95);
}
function getAdvertisingTrafficBonus(){
  if(!hasMarketingOfficeAccess())return 0;
  const adBase=(adReach/100)*0.22;
  const repSynergy=1+(reputation/100)*0.35;
  return adBase*repSynergy;
}
function getPrimaryInsuranceContract(){
  return insuranceContracts[0]||null;
}
function getInsuranceBoost(){
  let income=0;
  let patients=0;
  let stressImpact=0;

  insuranceContracts.forEach(c=>{
    income+=c.incomeBoost||0;
    patients+=c.patientBoost||0;
    stressImpact+=c.stress||0;
  });

  return{income,patients,stressImpact};
}
function getInsuranceTrafficBonus(){
  return getInsuranceBoost().patients;
}
function getInsuranceIncomeBoost(){
  return getInsuranceBoost().income;
}
function getInsuranceRevenueMultiplier(){
  return 1+getInsuranceIncomeBoost();
}
function getInsuranceStressLoad(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{insuranceStressRelief:0};
  return Math.max(0,getInsuranceBoost().stressImpact-(techBonus.insuranceStressRelief||0));
}
function getPatientTrafficChance(){
  return clamp(getBasePatientTrafficChance()+getAdvertisingTrafficBonus()+getInsuranceTrafficBonus(),0.12,0.99);
}
function getMarketingStatusText(){
  if(hasMarketingOfficeAccess())return 'Marketing active';
  if(hasMarketingOfficeBuilt())return 'Marketing inactive - office needs staff';
  return 'Marketing inactive - office not built';
}
function getMarketingExtraPatientsPerDay(){
  const attemptsPerDay=DAY_TICKS/PATIENT_SPAWN_TICKS;
  return getAdvertisingTrafficBonus()*attemptsPerDay;
}
function getInsuranceExtraPatientsPerDay(){
  if(!insuranceContracts.length)return 0;
  const attemptsPerDay=DAY_TICKS/PATIENT_SPAWN_TICKS;
  return getInsuranceTrafficBonus()*attemptsPerDay;
}
function getAdvertisingStatus(){
  if(!hasMarketingOfficeAccess())return 'Locked: build and staff a Marketing Office to run campaigns.';
  const chance=Math.round(getPatientTrafficChance()*100);
  if(adReach<=0)return `Traffic chance ${chance}% - reputation is doing the work on its own.`;
  if(adReach>=70)return `Traffic chance ${chance}% - the campaign is running hot and strong reputation is amplifying it.`;
  if(adReach>=35)return `Traffic chance ${chance}% - marketing is noticeably boosting patient demand.`;
  return `Traffic chance ${chance}% - a light campaign is helping patient flow.`;
}
function buyAdvertising(){
  if(!hasMarketingOfficeAccess()){
    addLog('Advertising is locked until a staffed Marketing Office is operating.','w');
    showToast('Marketing Office required','warn');
    return;
  }
  const cost=getAdvertisingCost();
  if(gameOver)return;
  if(!isSandboxMode&&money<cost){
    addLog('Not enough money to launch an advertising campaign.','b');
    return;
  }
  if(!isSandboxMode)changeMoney(-cost);
  adReach=clamp(adReach+25,0,100);
  addLog(`Launched an advertising campaign. -$${cost.toLocaleString()} and patient demand increased.`, 'w');
  showToast('Ad campaign launched','info');
  updateUI();
}

function roomAdjacentToType(rc,rr2,rw,rh,type,floor=currentFloor){
  return rooms.some(rm=>{
    if(getRoomFloor(rm)!==floor)return false;
    if(rm.type!==type)return false;
    const horizOverlap=Math.max(rc,rm.c)<Math.min(rc+rw,rm.c+rm.w);
    const vertOverlap=Math.max(rr2,rm.r)<Math.min(rr2+rh,rm.r+rm.h);
    const touchesHoriz=horizOverlap&&(rr2+rh===rm.r||rm.r+rm.h===rr2);
    const touchesVert=vertOverlap&&(rc+rw===rm.c||rm.c+rm.w===rc);
    return touchesHoriz||touchesVert;
  });
}
function waitingRoomConnectedToReception(rm){return !!rm&&isConn(rm);}
function waitingRoomCapacity(){return rooms.filter(r=>r.type==='waiting_room'&&isConn(r)&&roomHasVerticalAccess(r)).reduce((sum,r)=>sum+RDEFS[r.type].cap,0);}
function effectiveWaitingCapacity(){return 2+waitingRoomCapacity();}
function getWaitingStatus(waitingCount=waitingPatientsCount()){
  const capacity=effectiveWaitingCapacity();
  if(waitingCount===0)return'No patients are currently waiting';
  if(waitingCount<=capacity)return `Queue is under control (${waitingCount}/${capacity} seats in use)`;
  return `Waiting room overflow: ${waitingCount-capacity} patients are standing in the corridor`;
}
function reviewDailyReputation(){
  let change=0;
  const reasons=[];

  const waiting=waitingPatientsCount();
  const coverage=coverageStatus();

  if(totalTreated>0&&dailyStats.treated>=5){
    change+=2;
    reasons.push('strong patient throughput');
  }

  if(waiting>=8){
    change-=2;
    reasons.push('long waiting room pressure');
  }

  if(cleanliness<50){
    change-=2;
    reasons.push('poor cleanliness');
  }else if(cleanliness>=85){
    change+=1;
    reasons.push('clean facility standards');
  }

  if(coverage.nurseShort>0||coverage.cnaShort>0){
    change-=1;
    reasons.push('staffing gaps');
  }

  if(stress>=70){
    change-=1;
    reasons.push('high hospital stress');
  }

  if(change!==0){
    adjustReputation(change,reasons.join(', '),change>0?'g':'w');
  }
}
function applyMilestoneUnlocks(){
  const newlyUnlocked=[];
  for(const milestone of MILESTONES){
    if(unlockedMilestones.has(milestone.id)||!milestone.met())continue;
    unlockedMilestones.add(milestone.id);
    milestone.unlockTools.forEach(t=>unlockedTools.add(t));
    milestone.unlockRoles.forEach(r=>unlockedRoles.add(r));
    newlyUnlocked.push(milestone);
  }
  newlyUnlocked.forEach(milestone=>{
    const names=[
      ...milestone.unlockTools.map(t=>RDEFS[t].name),
      ...milestone.unlockRoles.map(r=>ROLES[r].label)
    ];
    addLog(`${milestone.name} reached. Unlocked: ${names.join(', ')}.`,'g');
  });
}
function unlockFeature(id){
  if(id==='luxury_path'){
    unlockedTools.add(id);
    return 'Luxury Path';
  }
  if(RDEFS[id]){
    unlockedTools.add(id);
    return RDEFS[id].name;
  }
  if(ROLES[id]){
    unlockedRoles.add(id);
    return ROLES[id].label;
  }
  if(id==='basic_research'){
    unlockedFeatures.add('basic_research');
    return 'Basic Research';
  }
  return null;
}
function hasBasicResearchAccess(){return isSandboxMode||countOperationalRooms('research_department')>0;}
function getCurrentStageDef(){
  return STAGES[hospitalStage]||STAGES.clinic;
}
function getCurrentStageName(){
  return getCurrentStageDef().name;
}
function getNextStageDef(){
  if(hospitalStage==='clinic')return STAGES.small;
  if(hospitalStage==='small')return STAGES.expanding;
  if(hospitalStage==='expanding')return STAGES.medical;
  return null;
}
function getCompletedResearchCount(){
  return researchedTech.size;
}
function getHiredStaffCount(){
  return staff.filter(s=>s.hired).length;
}
function hasOperationalER(){
  return countOperationalRooms('er','day')>0||countOperationalRooms('er','night')>0;
}
function getStageRequirementValue(req){
  if(req.id==='reputation')return Math.round(reputation);
  if(req.id==='treated')return totalTreated;
  if(req.id==='research')return getCompletedResearchCount();
  if(req.id==='staff')return getHiredStaffCount();
  if(req.id==='er_operational')return hasOperationalER()?1:0;
  return 0;
}
function isStageRequirementMet(req){
  return getStageRequirementValue(req)>=req.target;
}
function getStageRequirementProgress(req){
  if(!req.target)return 1;
  return clamp(getStageRequirementValue(req)/req.target,0,1);
}
function getStageRequirements(stage=getNextStageDef()){
  return stage?.requirements||[];
}
function canAdvanceToStage(stage){
  return getStageRequirements(stage).every(isStageRequirementMet);
}
function getStageProgressText(){
  const next=getNextStageDef();
  if(!next)return'Max stage reached. Your hospital is operating at full center status.';
  if(canAdvanceToStage(next))return`Ready to advance to ${next.name}.`;
  const missing=getStageRequirements(next)
    .filter(req=>!isStageRequirementMet(req))
    .map(req=>`${req.label} ${Math.min(getStageRequirementValue(req),req.target)} / ${req.target}`);
  return `Next: ${next.name}. ${missing.join(' · ')}`;
}
function getStageProgressPercent(stage=getNextStageDef()){
  const requirements=getStageRequirements(stage);
  if(!requirements.length)return 1;
  const total=requirements.reduce((sum,req)=>sum+getStageRequirementProgress(req),0);
  return clamp(total/requirements.length,0,1);
}
function renderStageProgress(){
  const next=getNextStageDef();
  const nextNode=document.getElementById('stage-next');
  const fillNode=document.getElementById('stage-bar-fill');
  const reqsNode=document.getElementById('stage-reqs');
  if(!nextNode||!fillNode||!reqsNode)return;
  if(!next){
    nextNode.textContent='Final Stage Reached';
    fillNode.style.width='100%';
    reqsNode.innerHTML='<div class="stage-req done"><span class="stage-req-label">Medical Center</span><span>Complete</span></div>';
    return;
  }
  nextNode.textContent=`Next Stage: ${next.name}`;
  fillNode.style.width=`${Math.round(getStageProgressPercent(next)*100)}%`;
  reqsNode.innerHTML=getStageRequirements(next).map(req=>{
    const current=getStageRequirementValue(req);
    const shown=req.id==='er_operational'?(current?1:0):Math.min(current,req.target);
    return `<div class="stage-req ${isStageRequirementMet(req)?'done':''}"><span class="stage-req-label">${req.label}</span><span>${shown} / ${req.target}</span></div>`;
  }).join('');
}
function getStageGoalCards(){
  const next=getNextStageDef();
  if(!next){
    return [{
      title:'Medical Center Established',
      desc:'You have reached the final hospital stage.',
      progress:'All stage goals complete.',
      reward:'Keep improving operations and pushing your score.',
      current:1,
      target:1,
      done:true
    }];
  }
  const goals=[];
  getStageRequirements(next).forEach(req=>{
    const current=getStageRequirementValue(req);
    if(isStageRequirementMet(req))return;
    if(req.id==='reputation'){
      const step=Math.min(req.target,current+(req.target-current>=10?10:req.target-current));
      goals.push({
        title:'Build Public Trust',
        desc:`Raise hospital reputation toward ${next.name}.`,
        progress:`Reputation ${current} / ${step}`,
        current,
        target:step,
        reward:`Stage target: ${req.target}`,
        done:false
      });
      return;
    }
    if(req.id==='treated'){
      const step=Math.min(req.target,current+(req.target-current>=20?10:Math.max(1,req.target-current)));
      goals.push({
        title:'Treat More Patients',
        desc:'Keep patient flow moving to grow the hospital.',
        progress:`Patients treated ${current} / ${step}`,
        current,
        target:step,
        reward:`Stage target: ${req.target}`,
        done:false
      });
      return;
    }
    if(req.id==='research'){
      const step=Math.min(req.target,current+1);
      goals.push({
        title:'Finish Research',
        desc:'Complete another project to unlock more advanced care.',
        progress:`Research completed ${current} / ${step}`,
        current,
        target:step,
        reward:`Stage target: ${req.target}`,
        done:false
      });
      return;
    }
    if(req.id==='staff'){
      const step=Math.min(req.target,current+2);
      goals.push({
        title:'Grow the Team',
        desc:'Hire more staff so the hospital can support the next stage.',
        progress:`Hired staff ${current} / ${step}`,
        current,
        target:step,
        reward:`Stage target: ${req.target}`,
        done:false
      });
      return;
    }
    if(req.id==='er_operational'){
      goals.push({
        title:'Open a Working ER',
        desc:'Build a connected ER and staff it so it becomes operational.',
        progress:`ER operational ${current?1:0} / 1`,
        current:current?1:0,
        target:1,
        reward:'Required for Medical Center',
        done:false
      });
    }
  });
  return goals.slice(0,4);
}
function renderStageGoals(){
  const wrap=document.getElementById('stagegoals');
  if(!wrap)return;
  const goals=getStageGoalCards();
  wrap.innerHTML=goals.map(goal=>{
    const progressValue=goal.target?Math.round(clamp((goal.current/goal.target)*100,0,100)):100;
    const goalKey=`stage_${normalizeGoalKey(goal.title)}`;
    return `<div class="sg ${goal.done?'done':''}" data-goal-key="${goalKey}" data-progress="${progressValue}" data-done="${goal.done?'1':'0'}">
      <div class="goal-head">
        <div class="goal-title-wrap"><div class="st">${goal.title}</div><span class="goal-check" aria-hidden="true">✓</span></div>
        ${renderStatusChip(goal.done?'Complete':'In Progress',goal.done?'stable':'info')}
      </div>
      <div class="sd">${goal.desc}</div>
      <div class="goal-progress-row">
        <div class="goal-progress-copy">${goal.progress}</div>
        <div class="goal-progress-pct">${progressValue}%</div>
      </div>
      <div class="goal-progress-bar"><div class="goal-progress-fill"></div></div>
      <div class="sr">${goal.reward}</div>
    </div>`;
  }).join('');
  animateGoalCards(wrap);
}
function syncStageUnlocks(){
  for(const stageKey of STAGE_ORDER){
    const stage=STAGES[stageKey];
    (stage.unlocks||[]).forEach(unlockFeature);
    if(stageKey===hospitalStage)break;
  }
}
function openStageModal(stage,unlockedNames){
  const modal=document.getElementById('stagemodal');
  if(!modal)return;
  document.getElementById('stage-title').textContent='Your clinic has grown!';
  const stageNameNode=document.getElementById('stage-name');
  if(stageNameNode)stageNameNode.textContent=stage.name;
  document.getElementById('stage-msg').textContent=`Your facility is now operating as a ${stage.name}.`;
  document.getElementById('stage-unlocks').textContent=unlockedNames.length?`Unlocked: ${unlockedNames.join(', ')}.`:'New hospital stage reached.';
  modal.classList.add('open');
  updateMenuBlurState();
}
function closeStageModal(){
  const modal=document.getElementById('stagemodal');
  if(!modal)return;
  modal.classList.remove('open');
  paused=stageResumePaused;
  updatePauseButton();
  updateMenuBlurState();
}
function advanceStage(newStage){
  const stage=STAGES[newStage];
  if(!stage||hospitalStage===newStage)return;
  stageResumePaused=paused;
  paused=true;
  updatePauseButton();
  hospitalStage=newStage;
  const unlockedNames=(stage.unlocks||[]).map(id=>unlockFeature(id)).filter(Boolean);
  addLog(`Your facility has grown into a ${stage.name}!`,'g');
  if(unlockedNames.length)addLog(`Unlocked: ${unlockedNames.join(', ')}.`,'g');
  showToast(`New Stage: ${stage.name}`,'good');
  openStageModal(stage,unlockedNames);
  updateUI();
}
function checkProgression(){
  applyMilestoneUnlocks();
  const nextStage=getNextStageDef();
  if(nextStage&&canAdvanceToStage(nextStage)){
    const nextKey=STAGE_ORDER[STAGE_ORDER.indexOf(hospitalStage)+1];
    if(nextKey)advanceStage(nextKey);
  }
}
function renderMilestones(){
  const wrap=document.getElementById('milestones');
  wrap.innerHTML=MILESTONES.map(m=>{
    const done=unlockedMilestones.has(m.id);
    return`<div class="mc ${done?'done':''}">
      <div class="mt">${m.name}</div>
      <div class="md">${m.desc}</div>
      <div class="mp">${done?'Unlocked':m.progress()}</div>
    </div>`;
  }).join('');
}

function pulsePanel(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.remove('panel-pulse');
  void el.offsetWidth;
  el.classList.add('panel-pulse');
  setTimeout(()=>el.classList.remove('panel-pulse'),560);
}
function focusBuilder(){
  document.getElementById('sidebar').scrollTop=0;
  document.getElementById('hint').textContent='Build menu ready. Pick a room from the left panel or the quick dock below.';
  pulsePanel('sidebar');
}
function focusBudget(){
  document.getElementById('rp').scrollTop=0;
  document.getElementById('hint').textContent='Budget panel highlighted. Watch debt, wages, waiting pressure, and coverage.';
  pulsePanel('rp');
}
function organizeBuildMenu(){
  const sidebar=document.getElementById('sidebar');
  if(!sidebar||sidebar.dataset.grouped==='1')return;
  const buttons=Array.from(sidebar.querySelectorAll('.rb'));
  if(!buttons.length)return;
  const byTool=new Map(buttons.map(btn=>[btn.dataset.tool,btn.outerHTML]));
  const sections=[
    {title:'Paths',tools:['corridor','luxury_path'],open:true},
    {title:'Entrances',tools:['front_entrance','staff_entrance','er_entrance'],open:true},
    {title:'Patient Rooms',tools:['waiting_room','gp','vip_room','er','ward','med_surg','pediatrics','obgyn','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','surgery','pharmacy'],open:true},
    {title:'Departments & Wings',tools:['radiology','lab','rehab','cardiology','oncology','behavioral_health','geriatrics'],open:true},
    {title:'Technical Rooms',tools:['xray','dispatch_office','ambulance_bay','staircase','elevator','it_department','research_department','hvac_generator'],open:true},
    {title:'Support Rooms',tools:['nurse_station','staff_room','lunch_room','janitor_closet'],open:true},
    {title:'Amenities',tools:['bathroom','vending_machine','drink_station','atm_kiosk'],open:true},
    {title:'Offices',tools:['security_office','grant_writer_office','marketing_office','hr_office','head_office','administration','case_management'],open:true},
    {title:'Tools',tools:['demolish'],open:true},
  ];
  sidebar.innerHTML=sections.map(section=>{
    const body=section.tools.map(tool=>byTool.get(tool)||'').join('');
    return body?`<details class="build-section" ${section.open?'open':''}>
      <summary>${section.title}</summary>
      <div class="build-section-body">${body}</div>
    </details>`:'';
  }).join('');
  sidebar.dataset.grouped='1';
}
function updateDockButtons(){
  document.querySelectorAll('.dockbtn[data-tool]').forEach(btn=>{
    const tool=btn.dataset.tool;
    const unlocked=isToolUnlocked(tool);
    btn.disabled=!unlocked;
    btn.classList.toggle('locked',!unlocked);
    btn.classList.toggle('sel',selTool===tool);
  });
}
function updateUnlockButtons(){
  document.querySelectorAll('.rb[data-tool]').forEach(btn=>{
    const tool=btn.dataset.tool;
    const unlocked=isToolUnlocked(tool);
    const def=RDEFS[tool];
    btn.disabled=!unlocked;
    btn.classList.toggle('locked',!unlocked);
    const desc=btn.querySelector('.rd');
    if(desc)desc.textContent=unlocked?(RDEFS[tool]?getRoomRequirementText(tool):btn.dataset.desc):getToolLockedText(tool);
    if(def){
      btn.style.background=unlocked?`linear-gradient(180deg, ${def.color}55, ${def.color}22)`: `linear-gradient(180deg, ${def.color}28, ${def.color}12)`;
      btn.style.borderColor=def.border;
      const name=btn.querySelector('.rn');
      const price=btn.querySelector('.rp');
      if(name)name.style.color=def.border;
      if(price)price.style.color=def.border;
    }else{
      btn.style.background='';
      btn.style.borderColor='';
      const name=btn.querySelector('.rn');
      const price=btn.querySelector('.rp');
      if(name)name.style.color='';
      if(price)price.style.color='';
    }
    if(!unlocked&&selTool===tool)selTool=null;
  });
  updateDockButtons();
}

function resetDailyStats(){dailyStats={treated:0,gpVisits:0,roomsBuilt:0,rolesHired:{},cleanDays:0};}
function makeDailyGoal(){
  const options=[
    {target:3,rewardCash:1200},
    {target:5,rewardCash:2000},
    {target:8,rewardCash:3200},
  ];
  const pick=options[Math.floor(Math.random()*options.length)];
  dailyGoal={
    title:`Treat ${pick.target} patients today`,
    desc:`Keep patient flow moving and successfully treat ${pick.target} people before the day ends.`,
    target:pick.target,
    current:()=>Math.min(dailyStats.treated,pick.target),
    rewardText:`Reward: $${pick.rewardCash.toLocaleString()}`,
    progress:()=>`${Math.min(dailyStats.treated,pick.target)}/${pick.target}`,
    done:()=>dailyStats.treated>=pick.target,
    reward:()=>{changeMoney(pick.rewardCash);}
  };
}
function resolveDailyGoal(){
  if(!dailyGoal)return;
  if(dailyGoal.done()){
    dailyGoal.reward();
    addLog(`Daily goal complete: ${dailyGoal.title}. ${dailyGoal.rewardText.replace('Reward: ','')}.`,'g');
  }else{
    addLog(`Daily goal missed: ${dailyGoal.title}.`,'w');
  }
}
function renderDailyGoal(){
  const wrap=document.getElementById('dailygoal');
  if(!dailyGoal){wrap.innerHTML='';return;}
  const current=dailyGoal.current?dailyGoal.current():0;
  const target=dailyGoal.target||1;
  const progressValue=Math.round(clamp((current/target)*100,0,100));
  const done=dailyGoal.done();
  const goalKey=`daily_${normalizeGoalKey(dailyGoal.title)}`;
  wrap.innerHTML=`<div class="dg ${done?'done':''}" data-goal-key="${goalKey}" data-progress="${progressValue}" data-done="${done?'1':'0'}">
    <div class="goal-head">
      <div class="goal-title-wrap"><div class="gt">${dailyGoal.title}</div><span class="goal-check" aria-hidden="true">✓</span></div>
      ${renderStatusChip(done?'Complete':'Active',done?'stable':'info')}
    </div>
    <div class="gd">${dailyGoal.desc}</div>
    <div class="goal-progress-row">
      <div class="gp">Progress: ${dailyGoal.progress()}</div>
      <div class="goal-progress-pct">${progressValue}%</div>
    </div>
    <div class="goal-progress-bar"><div class="goal-progress-fill"></div></div>
    <div class="gr">${dailyGoal.rewardText}</div>
  </div>`;
  animateGoalCards(wrap);
}
function getEnergyTreatmentPenalty(staffMember){
  if(!staffMember)return 1;

  let penalty=1;

  if(staffMember.energy<20)penalty=1.6;
  else if(staffMember.energy<40)penalty=1.35;
  else if(staffMember.energy<70)penalty=1.15;

  if(staffMember.personalityTrait?.id==='burnout_risk'){
    penalty*=1.1;
  }

  return penalty;
}
function getSpeedMult(rm){
  const d=RDEFS[rm.type];
  const s=getAssignedStaffForRoomRole(rm.id,d.staffRole);if(!s)return 2;
  let m=1;s.traits.forEach(t=>{
    if(t.speedMult)m*=t.speedMult;
    if(t.diagnosticSpeedMult&&['lab','xray','radiology'].includes(rm.type))m*=t.diagnosticSpeedMult;
  });
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{speed:1,stress:0};
  if(techBonus.speed>1)m/=techBonus.speed;
  if(rm.type==='er'&&techBonus.erSpeed>1)m/=techBonus.erSpeed;
  if(rm.type==='gp'&&techBonus.gpSpeed>1)m/=techBonus.gpSpeed;
  if(['lab','xray','radiology'].includes(rm.type)&&techBonus.diagnosticSpeed>1)m/=techBonus.diagnosticSpeed;
  if((s.returnBoostDays??0)>0)m*=0.5;
  m*=getDepartmentRoomBonus(rm);
  (d.supportRoles||[]).forEach(role=>{if(!getAssignedStaffForRoomRole(rm.id,role))m*=1.25;});
  m*=1-getInternAssistBonus(currentShift(),rm.type);
  if(isClinicalRoomType(rm.type)){
    const directorTrait=getDirectorTrait();
    if(directorTrait?.hospitalSpeedMult)m*=directorTrait.hospitalSpeedMult;
  }
  if(hasOperationalRoom('dispatch_office'))m*=0.92;
  const coverage=coverageStatus();
  if(rm.type!=='head_office')m*=1+(coverage.nurseShort*0.06);
  if(isCnaCoverageRoom(rm))m*=1+(coverage.cnaShort*0.05);
  return m;
}
function getRevMult(rm){
  const d=RDEFS[rm.type];
  const s=getAssignedStaffForRoomRole(rm.id,d.staffRole);if(!s)return 0.5;
  let m=1;s.traits.forEach(t=>{if(t.revMult)m*=t.revMult;});
  if(s.energy<40)m*=0.9;
  (d.supportRoles||[]).forEach(role=>{if(!getAssignedStaffForRoomRole(rm.id,role))m*=0.9;});
  const directorTrait=getDirectorTrait();
  if(directorTrait?.hospitalRevMult&&isClinicalRoomType(rm.type))m*=directorTrait.hospitalRevMult;
  const coverage=coverageStatus();
  if(rm.type!=='head_office')m*=Math.max(0.75,1-(coverage.nurseShort*0.04));
  if(isCnaCoverageRoom(rm))m*=Math.max(0.8,1-(coverage.cnaShort*0.03));
  return m;
}
function getScoreBonus(rm){
  const s=getStaffForRoom(rm.id);if(!s)return 0;
  let b=0;
  s.traits.forEach(t=>{if(t.scoreMult)b+=t.scoreMult;});
  const directorTrait=getDirectorTrait();
  if(directorTrait?.hospitalScoreBonus&&isClinicalRoomType(rm.type))b+=directorTrait.hospitalScoreBonus;
  return b;
}
function getRoomEfficiencyPercent(rm,shift=currentShift()){
  const d=RDEFS[rm.type];
  const connected=isConn(rm);
  const linked=roomHasLinkRequirements(rm);
  if(isRoomTemporarilyDisabled(rm))return 0;
  if(!connected||!linked)return 0;
  if(!d.staffRole)return 100;
  if(!roomHasRequiredStaff(rm,shift))return 0;
  const treatingStaff=getStaffForRoom(rm.id);
  const speedPct=100/Math.max(0.65,getSpeedMult(rm)*getEnergyTreatmentPenalty(treatingStaff));
  const revPct=getRevMult(rm)*100;
  return Math.round(clamp((speedPct*0.65)+(revPct*0.35),35,140));
}
function getRoomStatus(rm,shift=currentShift()){
  const d=RDEFS[rm.type];
  const connected=isConn(rm);
  const linked=roomHasLinkRequirements(rm);
  const inUse=patients.some(p=>p.roomId===rm.id&&p.state==='treating');
  if(isRoomTemporarilyDisabled(rm))return{label:'Disabled',color:'var(--color-text-danger)'};
  if(d.staffRole&&!roomHasRequiredStaff(rm,shift))return{label:'Needs staff',color:'var(--color-text-danger)'};
  if(!connected||!linked)return{label:'Idle',color:'var(--color-text-warning)'};
  return{label:inUse?'Working':'Idle',color:inUse?'var(--color-text-success)':'var(--color-text-muted)'};
}
function getRoomQueueSummary(rm){
  const queuePatients=getRoomQueuePatients(rm);
  const avgWaitTicks=queuePatients.length?queuePatients.reduce((sum,p)=>sum+p.waitTime,0)/queuePatients.length:0;
  return{
    waiting:queuePatients.length,
    avgWaitTicks,
    overloaded:queuePatients.length>Math.max(2,Math.ceil((RDEFS[rm.type].cap||1)/2))||avgWaitTicks>=Math.max(1,(2.5*DAY_TICKS)/24)
  };
}
function getHeatmapColor(score){
  if(score>=80)return'rgba(89,181,109,0.28)';
  if(score>=50)return'rgba(215,173,66,0.26)';
  if(score>=25)return'rgba(236,141,67,0.26)';
  return'rgba(214,93,93,0.28)';
}
function getRoomHeatmapData(rm,shift=currentShift()){
  const queueSummary=getRoomQueueSummary(rm);
  const roomStaff=getRoomStaffMembers(rm,shift);
  const connected=isConn(rm);
  const linked=roomHasLinkRequirements(rm);
  const disabled=isRoomTemporarilyDisabled(rm);
  const hasCoverage=RDEFS[rm.type].staffRole?!getMissingRoomRoles(rm,shift).length:true;
  if(disabled)return{score:0,color:'rgba(154,166,177,0.26)',bucket:'idle',reason:'Room disabled',idle:true};
  if(!connected||!linked)return{score:0,color:'rgba(154,166,177,0.26)',bucket:'idle',reason:'Not connected',idle:true};
  if(RDEFS[rm.type].staffRole&&!hasCoverage)return{score:0,color:'rgba(154,166,177,0.26)',bucket:'idle',reason:'Missing staff coverage',idle:true};

  const coverageScore=hasCoverage?100:0;
  const avgEnergy=roomStaff.length
    ?roomStaff.reduce((sum,member)=>sum+(member.energy??100),0)/roomStaff.length
    :100;
  const energyScore=clamp(avgEnergy,0,100);
  const queuePenalty=queueSummary.waiting*12+queueSummary.avgWaitTicks*8;
  const queueScore=clamp(100-queuePenalty,0,100);
  const onlineScore=(connected&&linked&&!disabled)?100:0;
  const score=Math.round(clamp(
    coverageScore*0.4+
    energyScore*0.3+
    queueScore*0.2+
    onlineScore*0.1
  ,0,100));

  let reason='Balanced performance';
  if(avgEnergy<55)reason='Low staff energy';
  if(queueSummary.waiting>=3||queueSummary.avgWaitTicks>=Math.max(1,(2*DAY_TICKS)/24))reason='Queue pressure';
  return{
    score,
    color:getHeatmapColor(score),
    bucket:score>=80?'strong':score>=50?'okay':score>=25?'struggling':'critical',
    reason,
    idle:false
  };
}
function getRoomPanelStatusMeta(rm,shift=currentShift()){
  const queueSummary=getRoomQueueSummary(rm);
  if(isRoomTemporarilyDisabled(rm))return{label:'Problem',chip:'danger'};
  if(!isConn(rm)||!roomHasLinkRequirements(rm))return{label:'Problem',chip:'danger'};
  if(queueSummary.overloaded)return{label:'Overloaded',chip:'overloaded'};
  if(RDEFS[rm.type].staffRole&&!roomHasRequiredStaff(rm,shift))return{label:'Needs Staff',chip:'warning'};
  const inUse=patients.some(p=>p.roomId===rm.id&&p.state==='treating');
  return{label:inUse?'Operational':'Needs Attention',chip:inUse?'operational':'warning'};
}
function getRoomTileStatusIndicator(rm,shift=currentShift()){
  const connected=isConn(rm);
  const linked=roomHasLinkRequirements(rm);
  if(isRoomTemporarilyDisabled(rm))return{color:'#d65d5d',label:'Problem'};
  if(!connected||!linked)return{color:'#d65d5d',label:'Problem'};
  if(RDEFS[rm.type].staffRole&&!roomHasRequiredStaff(rm,shift))return{color:'#d7ad42',label:'Needs staff'};
  return{color:'#59b56d',label:'Working'};
}
function getRoomOutlineStyle(rm,shift=currentShift()){
  const connected=isConn(rm);
  const linked=roomHasLinkRequirements(rm);
  if(isRoomTemporarilyDisabled(rm))return{color:'#d65d5d',width:2.4};
  if(!connected||!linked)return{color:'#d65d5d',width:2.4};
  if(RDEFS[rm.type].staffRole&&!roomHasRequiredStaff(rm,shift))return{color:'#d7ad42',width:2.4};
  return{color:'rgba(101,126,148,0.48)',width:1.8};
}
function getWaitingRoomVisualState(){
  const waiting=waitingPatientsCount();
  const capacity=Math.max(1,waitingRoomCapacity()||RDEFS.waiting_room.cap||1);
  const ratio=waiting/capacity;
  if(ratio>=1)return{fill:'#ee9a94',seat:'#dc7a72',dot:'#cb4e4e',ratio};
  if(ratio>=0.65)return{fill:'#f4c081',seat:'#e3a05a',dot:'#e9873f',ratio};
  return{fill:'#f6de7a',seat:'#f4c878',dot:'#d8b156',ratio};
}
function currentAnimTime(){return animTime||performance.now();}
function isEventFocusedRoom(rm){
  if(!rm||!eventFocusRoomId)return false;
  if(eventFocusUntil&&currentAnimTime()>eventFocusUntil){
    eventFocusRoomId=null;
    eventFocusUntil=0;
    return false;
  }
  return rm.id===eventFocusRoomId;
}
function getEventFocusAnim(rm){
  if(!isEventFocusedRoom(rm))return null;
  const pulse=(Math.sin(currentAnimTime()/180)+1)/2;
  return{
    glow:0.22+pulse*0.28,
    width:2.5+pulse*1.8,
    color:pulse>0.5?'#ff9b7a':'#ffd26a'
  };
}
function easeOutCubic(t){return 1-Math.pow(1-clamp(t,0,1),3);}
function colorWithAlpha(hex,alpha){
  if(typeof hex!=='string'||!hex.startsWith('#'))return hex;
  const raw=hex.slice(1);
  const full=raw.length===3?raw.split('').map(ch=>ch+ch).join(''):raw;
  const int=parseInt(full,16);
  const r=(int>>16)&255,g=(int>>8)&255,b=int&255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function getRoomBuildAnim(rm){
  const builtAt=rm.builtAt??0;
  if(!builtAt)return{scale:1,alpha:1,brighten:0,glow:0,outline:0};
  const age=currentAnimTime()-builtAt;
  if(age<=0)return{scale:0.94,alpha:0.25,brighten:0.22,glow:0.28,outline:3.2};
  if(age>=240)return{scale:1,alpha:1,brighten:0,glow:0,outline:0};
  const progress=clamp(age/240,0,1);
  const settle=easeOutCubic(progress);
  const pulse=Math.sin(progress*Math.PI);
  return{
    scale:0.94+0.06*settle,
    alpha:0.42+0.58*settle,
    brighten:Math.max(0,(1-settle)*0.16+pulse*0.06),
    glow:Math.max(0,(1-settle)*0.18+pulse*0.16),
    outline:Math.max(0,(1-settle)*1.2+pulse*2.2)
  };
}
function getRoomHoverAnim(rm){
  const hovered=hover.x>=0&&roomAt(hover.x,hover.y)?.id===rm.id;
  if(!hovered)return{brighten:0,glow:0};
  const pulse=(Math.sin(currentAnimTime()/220)+1)/2;
  return{brighten:0.1,glow:0.2+0.08*pulse};
}
function isSelectedRoom(rm){return !!rm&&selectedRoomId===rm.id;}
function getSelectedRoomAnim(rm){
  if(!isSelectedRoom(rm))return null;
  const pulse=(Math.sin(currentAnimTime()/260)+1)/2;
  return{
    glow:0.24+pulse*0.14,
    width:2.2+pulse*1.2,
    color:'#69b7ff'
  };
}
function getStatusDotAnim(tileStatus){
  const pulse=(Math.sin(currentAnimTime()/520)+1)/2;
  const blink=(Math.sin(currentAnimTime()/240)+1)/2;
  if(tileStatus.label==='Working')return{radius:4+0.6*pulse,alpha:0.85+0.12*pulse};
  if(tileStatus.label==='Needs staff'||tileStatus.label==='Problem')return{radius:4+0.4*blink,alpha:0.62+0.3*blink};
  return{radius:4,alpha:0.85};
}
function getRoomStaffIndicatorState(rm,shift=currentShift()){
  if(!RDEFS[rm.type].staffRole)return null;
  return roomHasRequiredStaff(rm,shift)
    ?{fill:'rgba(92,178,108,0.9)',icon:'#f4fff6',label:'+'}
    :{fill:'rgba(224,180,74,0.92)',icon:'#fffaf0',label:'!'};
}

function openStaff(){renderStaffModal();document.getElementById('staffmodal').classList.add('open');updateMenuBlurState();}
function closeStaff(){document.getElementById('staffmodal').classList.remove('open');updateMenuBlurState();}
function openEmployeeMenu(){if(typeof renderEmployeeNeedsMenu==='function')renderEmployeeNeedsMenu();document.getElementById('employeemodal').classList.add('open');updateMenuBlurState();}
function closeEmployeeMenu(){document.getElementById('employeemodal').classList.remove('open');updateMenuBlurState();}
function getSelectedRoom(){return rooms.find(r=>r.id===selectedRoomId)||null;}
function closeRoomPanel(){
  selectedRoomId=null;
  const panel=document.getElementById('roompanel');
  if(panel)panel.classList.add('hidden');
  render();
}
function openRoomPanel(roomId){
  selectedRoomId=roomId;
  renderRoomPanel();
  render();
}
function getRoomQueuePatients(rm){
  return patients.filter(p=>p.state==='waiting'&&p.needs[p.step]===rm.type);
}
function formatWaitHours(waitTicks){
  return `${((waitTicks*24)/DAY_TICKS).toFixed(1)}h`;
}
function getRoomThroughputText(rm){
  if(!isClinicalRoomType(rm.type)&&rm.type!=='waiting_room')return'Support only';
  if(!roomHasRequiredStaff(rm)||!isConn(rm)||!roomHasLinkRequirements(rm))return'0 patients/day';
  const d=RDEFS[rm.type];
  const treatingStaff=getStaffForRoom(rm.id);
  const cycle=Math.max(1,(d.tt||1)*2*getSpeedMult(rm)*getEnergyTreatmentPenalty(treatingStaff));
  const cap=Math.max(1,d.cap||1);
  return `${Math.max(0,Math.round((DAY_TICKS/cycle)*cap))} patients/day`;
}
function getRoomIssueItems(rm){
  const issues=[];
  const queueSummary=getRoomQueueSummary(rm);
  const roomStaff=getRoomStaffMembers(rm);
  if(isRoomTemporarilyDisabled(rm))issues.push({label:'Room Disabled',detail:'This room is temporarily offline.',kind:'danger'});
  if(!isConn(rm))issues.push({label:'No Corridor',detail:'Add a connected corridor to activate this room.',kind:'danger'});
  if(!roomHasLinkRequirements(rm)){
    const detail=rm.type==='ambulance_bay'
      ?'Ambulance Bay must touch both Dispatch and ER.'
      :rm.type==='dispatch_office'
        ?'Dispatch needs a linked Ambulance Bay and ER chain.'
        :'This room is missing a required link.';
    issues.push({label:'Link Problem',detail,kind:'danger'});
  }
  const missingRoles=getMissingRoomRoles(rm);
  if(missingRoles.length)issues.push({label:'Needs Staff',detail:missingRoles.map(role=>ROLES[role].label).join(' + '),kind:'warning'});
  const lowEnergyStaff=roomStaff.filter(member=>(member.energy??100)<45);
  if(lowEnergyStaff.length)issues.push({label:'Low Energy Staff',detail:lowEnergyStaff.map(member=>member.name).join(', '),kind:'warning'});
  if(queueSummary.overloaded){
    issues.push({label:'Queue Building',detail:`${queueSummary.waiting} waiting, avg wait ${formatWaitHours(queueSummary.avgWaitTicks)}.`,kind:'warning'});
  }
  return issues.length?issues:[{label:'No major issues',detail:'This room is stable right now.',kind:'stable'}];
}
function renderRoomPanel(){
  const panel=document.getElementById('roompanel');
  if(!panel)return;
  const rm=getSelectedRoom();
  if(!rm){
    panel.classList.add('hidden');
    return;
  }
  const d=RDEFS[rm.type];
  const statusMeta=getRoomPanelStatusMeta(rm);
  const roomStaff=getRoomStaffMembers(rm);
  const queueSummary=getRoomQueueSummary(rm);
  const issues=getRoomIssueItems(rm);
  document.getElementById('roompanel-name').textContent=d.name;
  document.getElementById('roompanel-type').textContent=`Type: ${d.name} - Floor ${getRoomFloor(rm)} - ${getFloorSpecialization(getRoomFloor(rm)).label}`;
    document.getElementById('roompanel-type').textContent=`Type: ${d.name} • Floor ${getRoomFloor(rm)} • ${getFloorSpecialization(getRoomFloor(rm)).label}`;
  document.getElementById('roompanel-type').textContent=`Type: ${d.name} - Floor ${getRoomFloor(rm)} - ${getFloorSpecialization(getRoomFloor(rm)).label}`;
  const statusNode=document.getElementById('roompanel-status');
  if(statusNode){
    statusNode.textContent=statusMeta.label;
    statusNode.className=`status-chip ${statusMeta.chip}`;
  }
  document.getElementById('roompanel-efficiency').textContent=`${getRoomEfficiencyPercent(rm)}%`;
  document.getElementById('roompanel-throughput').textContent=getRoomThroughputText(rm);
  document.getElementById('roompanel-staff').innerHTML=roomStaff.length
    ?roomStaff.map(member=>`<div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">${member.name}</div><div class="room-panel-item-sub">${ROLES[member.role].label}</div></div><div class="room-panel-item-value">Energy ${Math.round(member.energy??100)}%</div></div>`).join('')
    :'<div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">No active staff</div><div class="room-panel-item-sub">This room needs coverage on the current shift.</div></div></div>';
  document.getElementById('roompanel-queue').innerHTML=`<div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">Waiting</div><div class="room-panel-item-sub">${queueSummary.waiting?`${queueSummary.waiting} patients are routing here.`:'No active queue for this room.'}</div></div><div class="room-panel-item-value">${queueSummary.waiting}</div></div><div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">Avg Wait</div><div class="room-panel-item-sub">${queueSummary.waiting?'Average wait for patients targeting this room.':'No wait time building right now.'}</div></div><div class="room-panel-item-value">${queueSummary.waiting?formatWaitHours(queueSummary.avgWaitTicks):'0.0h'}</div></div>`;
  document.getElementById('roompanel-issues').innerHTML=issues.map(issue=>`<div class="room-panel-item issue ${issue.kind==='danger'?'danger':''}"><div class="room-panel-item-copy"><div class="room-panel-item-title">${issue.kind==='stable'?'OK':issue.kind==='danger'?'⚠':'⚠'} ${issue.label}</div><div class="room-panel-item-sub">${issue.detail}</div></div></div>`).join('');
  document.getElementById('roompanel-issues').innerHTML=issues.map(issue=>`<div class="room-panel-item issue ${issue.kind==='danger'?'danger':''}"><div class="room-panel-item-copy"><div class="room-panel-item-title">${issue.kind==='stable'?'OK':'&#9888;'} ${issue.label}</div><div class="room-panel-item-sub">${issue.detail}</div></div></div>`).join('');
  panel.classList.remove('hidden');
}
function updateHeatmapUI(){
  const btn=document.getElementById('heatmapbtn');
  if(btn){
    btn.textContent=heatmapOn?'Traffic On':'Traffic';
    btn.classList.toggle('on',heatmapOn);
  }
  const legend=document.getElementById('heatmaplegend');
  if(legend)legend.classList.toggle('hidden',!heatmapOn);
}
function toggleHeatmap(forceState){
  heatmapOn=typeof forceState==='boolean'?forceState:!heatmapOn;
  updateHeatmapUI();
  render();
}

function clearToolSelection(){
  selTool=null;
  buildRotation=0;
  document.querySelectorAll('.rb,.dockbtn').forEach(b=>b.classList.remove('sel'));
  updateRotateButton();
}
function updateBuildModeButton(){
  const btn=document.getElementById('buildmodebtn');
  if(btn){
    btn.textContent=buildMode?'Build On':'Build Off';
    btn.classList.toggle('on',buildMode);
  }
  document.getElementById('sidebar')?.classList.toggle('build-disabled',!buildMode);
  updateRotateButton();
}
function toggleBuildMode(forceState){
  buildMode=typeof forceState==='boolean'?forceState:!buildMode;
  if(!buildMode){
    clearToolSelection();
    document.getElementById('hint').textContent='Build mode is off. Toggle Build On to place corridors, rooms, or remove tiles.';
  }else if(!selTool&&!gameOver){
    document.getElementById('hint').textContent='Build mode is on. Pick a room from the left panel and place it on the map.';
  }
  updateBuildModeButton();
}

function sel(t){
  if(!buildMode){
    document.getElementById('hint').textContent='Build mode is off. Toggle Build On to place corridors, rooms, or remove tiles.';
    return;
  }
  if(!isToolUnlocked(t)){
    document.getElementById('hint').textContent=getMilestoneForTool(t)?.desc||`${RDEFS[t]?.name||'This room'} is still locked.`;
    return;
  }
  selTool=t;
  document.querySelectorAll('.rb,.dockbtn').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll(`[data-tool="${t}"]`).forEach(b=>b.classList.add('sel'));
  const hints={
    corridor:'Click and drag to paint corridor tiles.',
    demolish:'Click a tile or room to remove it.',
    ...Object.fromEntries(Object.entries(RDEFS).map(([k,v])=>[k,`Placing ${v.name} ($${v.cost}) — needs corridor + ${ROLES[v.staffRole].label}.`]))
  };
  Object.keys(RDEFS).forEach(k=>{
    hints[k]=`Placing ${RDEFS[k].name} ($${RDEFS[k].cost}) - needs corridor + ${getRoomRequirementText(k).replace('Needs: ','')}.`;
  });
  document.getElementById('hint').textContent=hints[t]||'';
}

function gridXY(e){const r=cv.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/T),y:Math.floor((e.clientY-r.top)/T)};}
function inBounds(x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS;}
function tileOccupied(x,y,floor=currentFloor){
  const floorGrid=getFloorGrid(floor);
  if(floorGrid[y]&&floorGrid[y][x])return true;
  for(const rm of rooms){if(getRoomFloor(rm)===floor&&x>=rm.c&&x<rm.c+rm.w&&y>=rm.r&&y<rm.r+rm.h)return true;}
  return false;
}
function tileKey(x,y){return`${x},${y}`;}
function getRoomDoorTile(room){
  return{
    x:room.c,
    y:room.r+Math.floor(room.h/2)
  };
}
function getTileCenter(x,y){
  return{
    x:x*T+T/2,
    y:y*T+T/2
  };
}
function isWalkableTile(x,y,floor=currentFloor){
  if(x<0||y<0||x>=COLS||y>=ROWS)return false;
  const floorGrid=getFloorGrid(floor);
  return floorGrid[y][x]==='corridor'||floorGrid[y][x]==='luxury_path';
}
function findCorridorPath(start,end,floor=currentFloor){
  const queue=[start];
  const cameFrom={};
  const visited=new Set([tileKey(start.x,start.y)]);

  while(queue.length){
    const current=queue.shift();

    if(current.x===end.x&&current.y===end.y){
      const path=[];
      let key=tileKey(end.x,end.y);

      while(key){
        const [x,y]=key.split(',').map(Number);
        path.unshift({x,y});
        key=cameFrom[key];
      }

      return path;
    }

    const neighbors=[
      {x:current.x+1,y:current.y},
      {x:current.x-1,y:current.y},
      {x:current.x,y:current.y+1},
      {x:current.x,y:current.y-1}
    ];

    for(const n of neighbors){
      const k=tileKey(n.x,n.y);
      if(visited.has(k))continue;

      if(isWalkableTile(n.x,n.y,floor)||(n.x===end.x&&n.y===end.y)){
        visited.add(k);
        cameFrom[k]=tileKey(current.x,current.y);
        queue.push(n);
      }
    }
  }

  return null;
}
function roomAt(x,y,floor=currentFloor){return rooms.find(r=>getRoomFloor(r)===floor&&x>=r.c&&x<r.c+r.w&&y>=r.r&&y<r.r+r.h)||null;}
function corridorAdj(rc,rr2,rw,rh,floor=currentFloor){
  const floorGrid=getFloorGrid(floor);
  for(let x=rc;x<rc+rw;x++){if(inBounds(x,rr2-1)&&isPathTile(floorGrid[rr2-1][x]))return true;if(inBounds(x,rr2+rh)&&isPathTile(floorGrid[rr2+rh][x]))return true;}
  for(let y=rr2;y<rr2+rh;y++){if(inBounds(rc-1,y)&&isPathTile(floorGrid[y][rc-1]))return true;if(inBounds(rc+rw,y)&&isPathTile(floorGrid[y][rc+rw]))return true;}
  return false;
}
function nearRoad(tile){
  if(!tile)return false;
  const entrances=rooms.filter(r=>
    getRoomFloor(r)===(tile.floor??currentFloor)&&
    (r.type==='front_entrance'||r.type==='er_entrance')
  );
  if(!entrances.length)return tile.r<=3||tile.c<=3;
  return entrances.some(r=>{
    const roomCenterX=tile.c+(tile.w/2);
    const roomCenterY=tile.r+(tile.h/2);
    const entranceCenterX=r.c+(r.w/2);
    const entranceCenterY=r.r+(r.h/2);
    return Math.abs(roomCenterX-entranceCenterX)<=4&&Math.abs(roomCenterY-entranceCenterY)<=4;
  });
}
function getRoomDoorConnections(rm,floor=getRoomFloor(rm)){
  const floorGrid=getFloorGrid(floor);
  const pickMiddle=valueList=>valueList.length?valueList[Math.floor((valueList.length-1)/2)]:null;
  const top=[],bottom=[],left=[],right=[];
  for(let x=rm.c;x<rm.c+rm.w;x++){
    if(inBounds(x,rm.r-1)&&isPathTile(floorGrid[rm.r-1][x]))top.push({x,y:rm.r-1,tile:floorGrid[rm.r-1][x]});
    if(inBounds(x,rm.r+rm.h)&&isPathTile(floorGrid[rm.r+rm.h][x]))bottom.push({x,y:rm.r+rm.h,tile:floorGrid[rm.r+rm.h][x]});
  }
  for(let y=rm.r;y<rm.r+rm.h;y++){
    if(inBounds(rm.c-1,y)&&isPathTile(floorGrid[y][rm.c-1]))left.push({x:rm.c-1,y,tile:floorGrid[y][rm.c-1]});
    if(inBounds(rm.c+rm.w,y)&&isPathTile(floorGrid[y][rm.c+rm.w]))right.push({x:rm.c+rm.w,y,tile:floorGrid[y][rm.c+rm.w]});
  }
  return{
    top:pickMiddle(top),
    bottom:pickMiddle(bottom),
    left:pickMiddle(left),
    right:pickMiddle(right)
  };
}
function isConn(rm){return corridorAdj(rm.c,rm.r,rm.w,rm.h,getRoomFloor(rm));}

function canPlacePrefabRoom(type,c,r,floor=1){
  const def=RDEFS[type];
  if(!def)return false;
  if(c<0||r<0||c+def.w>COLS||r+def.h>ROWS)return false;
  for(let y=r;y<r+def.h;y++)for(let x=c;x<c+def.w;x++)if(tileOccupied(x,y,floor))return false;
  return true;
}

function placePrefabRoom(type,c,r,floor=1){
  const def=RDEFS[type];
  if(!def||!canPlacePrefabRoom(type,c,r,floor))return null;
  const room={
    id:Date.now()+Math.random(),
    type,
    r,
    c,
    w:def.w,
    h:def.h,
    floor,
    builtAt:currentAnimTime()
  };
  rooms.push(room);
  return room;
}

function placePrefabCorridor(x,y,floor=1,pathType='corridor'){
  if(!inBounds(x,y)||tileOccupied(x,y,floor))return false;
  const floorGrid=getFloorGrid(floor);
  if(!floorGrid)return false;
  floorGrid[y][x]=pathType;
  if(currentFloor===floor)syncActiveGrid();
  return true;
}

function createStarterHospital(){
  const targetFloor=1;
  const starterRooms=[
    {type:'front_entrance',c:10,r:11},
    {type:'waiting_room',c:6,r:9},
    {type:'gp',c:6,r:6},
    {type:'gp',c:11,r:6},
    {type:'bathroom',c:11,r:9}
  ];
  const starterCorridors=[];

  for(let x=6;x<=13;x++)starterCorridors.push({x,y:8});
  for(let y=8;y<=10;y++)starterCorridors.push({x:10,y});

  let placedCount=0;
  starterCorridors.forEach(tile=>{
    if(placePrefabCorridor(tile.x,tile.y,targetFloor))placedCount++;
  });
  starterRooms.forEach(room=>{
    if(placePrefabRoom(room.type,room.c,room.r,targetFloor))placedCount++;
  });

  if(!placedCount){
    addLog('Starter hospital could not be placed here. Clear some space first.','w');
    return false;
  }

  if(currentFloor!==targetFloor)setCurrentFloor(targetFloor,true);
  else syncActiveGrid();
  addLog('Starter hospital created. Hire staff and press Play when you are ready.','g');
  updateUI();
  render();
  return true;
}

function paintCorridor(x,y){
  if(!buildMode)return;
  if(!inBounds(x,y)||tileOccupied(x,y))return;
  const pathType=isPathTool(selTool)?selTool:'corridor';
  const cost=getPathCost(pathType);
  if(!isSandboxMode&&money<cost){addLog('Not enough money!','b');return;}
  grid[y][x]=pathType;
  if(!isSandboxMode)changeMoney(-cost);
  updateUI();
}

cv.addEventListener('mousedown',e=>{
  if(e.button===2)return;
  const{x,y}=gridXY(e);dragging=true;
  if(!buildMode)return;
  if(isPathTool(selTool))paintCorridor(x,y);
  else if(selTool==='demolish')demolishAt(x,y);
  else if(selTool&&RDEFS[selTool])placeRoom(x,y);
});
cv.addEventListener('mousemove',e=>{
  const{x,y}=gridXY(e);hover={x,y};
  if(buildMode&&dragging&&isPathTool(selTool))paintCorridor(x,y);
  showTT(e,x,y);render();
});
cv.addEventListener('mouseup',()=>dragging=false);
cv.addEventListener('mouseleave',()=>{dragging=false;hover={x:-1,y:-1};document.getElementById('tt').style.display='none';render();});
cv.addEventListener('contextmenu',e=>{e.preventDefault();clearToolSelection();});
cv.addEventListener('click',e=>{
  if(buildMode&&selTool)return;
  const{x,y}=gridXY(e);
  const rm=roomAt(x,y);
  if(rm)openRoomPanel(rm.id);
  else closeRoomPanel();
});

function showTT(e,x,y){
  const tt=document.getElementById('tt');
  if(selTool)return void(tt.style.display='none');
  const rm=roomAt(x,y);
  if(rm){
    const d=RDEFS[rm.type];
    const roomSymbol=getRoomMapSymbol(rm.type);
    const roomStaff=getRoomStaffMembers(rm);
    const missingRoles=getMissingRoomRoles(rm);
    const inUse=patients.filter(p=>p.roomId===rm.id).length;
    const conn=isConn(rm);
    const linked=roomHasLinkRequirements(rm);
    const efficiency=getRoomEfficiencyPercent(rm);
    const status=getRoomStatus(rm);
    const staffLabel=roomStaff.length?roomStaff.map(member=>`${member.name} (${ROLES[member.role].label})`).join(', '):'None';
    const routeGuide=getRoomRouteGuide(rm.type);
    let html=`<b>${d.name}</b><br><span class="ts">${inUse}/${d.cap} · ${conn?'Connected':'No corridor!'}</span>`;
    html=`<b>${roomSymbol} ${d.name}</b>`;
      html+=`<br><span class="ts">Floor ${getRoomFloor(rm)} • ${getFloorSpecialization(getRoomFloor(rm)).label}</span>`;
    html+=`<br><span class="ts">Staff assigned: ${staffLabel}</span>`;
    html+=`<br><span class="ts">Efficiency: ${efficiency}%</span>`;
    html+=`<br><span class="ts">Status: <span style="color:${status.color}">${status.label}</span></span>`;
    html+=`<br><span class="ts">Patient types: ${routeGuide.uses.join(', ')}</span>`;
    html+=`<br><span class="ts">Usually before: ${routeGuide.before.join(', ')}</span>`;
    html+=`<br><span class="ts">Usually after: ${routeGuide.after.join(', ')}</span>`;
    if(heatmapOn){
      const heatmap=getRoomHeatmapData(rm);
      html+=`<br><span class="ts">Traffic: ${heatmap.idle?'Idle/offline':`${heatmap.score}%`}</span>`;
      html+=`<br><span class="ts">Issue: ${heatmap.reason}</span>`;
    }
    if(isRoomTemporarilyDisabled(rm))html+=`<br><span style="color:var(--color-text-danger)">This room is temporarily disabled.</span>`;
    else if(rm.type==='ambulance_bay'&&!linked)html+=`<br><span style="color:var(--color-text-danger)">Needs to touch both Dispatch Office and ER.</span>`;
    else if(rm.type==='dispatch_office'&&!linked)html+=`<br><span style="color:var(--color-text-danger)">Needs an Ambulance Bay linked to the ER.</span>`;
    else if(rm.type==='waiting_room'&&!linked)html+=`<br><span style="color:var(--color-text-danger)">Needs corridor connection.</span>`;
    else if(!conn)html+=`<br><span style="color:var(--color-text-danger)">Needs corridor connection.</span>`;
    else if(missingRoles.length)html+=`<br><span style="color:var(--color-text-danger)">Need ${missingRoles.map(role=>ROLES[role].label).join(' + ')} on this shift.</span>`;
    const wr=document.getElementById('cw').getBoundingClientRect();
    tt.style.left=(e.clientX-wr.left+12)+'px';tt.style.top=(e.clientY-wr.top-10)+'px';
    tt.innerHTML=html;tt.style.display='block';
  } else if(inBounds(x,y)&&isPathTile(grid[y][x])){
    const pathType=grid[y][x];
    tt.innerHTML=`<b>${pathType==='luxury_path'?'Luxury Path':'Corridor'}</b><br><span class="ts">${pathType==='luxury_path'?'Premium patient walkway':'Patient walkway'}</span>`;
    const wr=document.getElementById('cw').getBoundingClientRect();
    tt.style.left=(e.clientX-wr.left+12)+'px';tt.style.top=(e.clientY-wr.top-10)+'px';
    tt.style.display='block';
  } else tt.style.display='none';
}

function placeRoom(cx,cy){
  if(!buildMode)return;
  if(!isToolUnlocked(selTool)){addLog(`${RDEFS[selTool]?.name||'That room'} is still locked.`,'w');return;}
  const d=RDEFS[selTool];
  const buildCost=Math.max(0,Math.round(d.cost*getGrantRoomBuildCostMultiplier(selTool)));
  const footprint=getBuildFootprint(selTool);
  const hasCredit=(freeBuildCredits[selTool]||0)>0;
  if(!hasCredit&&!isSandboxMode&&money<buildCost){addLog('Not enough money!','b');return;}
  const pc=Math.max(0,Math.min(cx,COLS-footprint.w)),pr=Math.max(0,Math.min(cy,ROWS-footprint.h));
  for(let rr2=pr;rr2<pr+footprint.h;rr2++)for(let cc=pc;cc<pc+footprint.w;cc++)if(tileOccupied(cc,rr2)){addLog('Space occupied.','b');return;}
  if(!corridorAdj(pc,pr,footprint.w,footprint.h)){addLog(`${d.name} needs adjacent corridor.`,'b');return;}
  if(hasCredit){
    freeBuildCredits[selTool]--;
    addLog(`Built ${d.name} with a donor room credit.`,'g');
  }else{
    if(!isSandboxMode)changeMoney(-buildCost);
    addLog(`Built ${d.name}.`,'g');
  }
  dailyStats.roomsBuilt++;
  if(selTool==='er'&&!nearRoad({c:pc,r:pr,w:footprint.w,h:footprint.h,floor:currentFloor})){
    showWarning('ER should be near entrance');
  }
  rooms.push({id:Date.now()+Math.random(),type:selTool,r:pr,c:pc,w:footprint.w,h:footprint.h,rot:footprint.rotated?1:0,floor:currentFloor,builtAt:currentAnimTime()});
  updateUI();render();
}

function demolishAt(x,y){
  if(!buildMode)return;
  const rm=roomAt(x,y);
  if(rm){
    if(selectedRoomId===rm.id)closeRoomPanel();
    const refund=Math.floor(RDEFS[rm.type].cost*.5);
    changeMoney(refund);patients=patients.filter(p=>p.roomId!==rm.id);
    rooms=rooms.filter(r=>r.id!==rm.id);
    addLog(`Demolished ${RDEFS[rm.type].name}. +$${refund}`,'b');updateUI();return;
  }
  if(inBounds(x,y)&&isPathTile(grid[y][x])){
    const pathType=grid[y][x];
    grid[y][x]=null;
    const refund=getPathRefund(pathType);
    changeMoney(refund);
    addLog(`Removed ${pathType==='luxury_path'?'luxury path':'corridor'}. +$${refund}`,'b');
    updateUI();
  }
}

function getBuildToolName(tool){
  if(tool==='luxury_path')return 'Luxury Path';
  if(tool==='corridor')return 'Corridor';
  if(tool==='demolish')return 'Demolish';
  return RDEFS[tool]?.name||'This room';
}
function canRotateTool(tool){
  return !!RDEFS[tool]&&RDEFS[tool].w!==RDEFS[tool].h;
}
function getBuildFootprint(tool,rotation=buildRotation){
  const d=RDEFS[tool];
  if(!d)return{w:1,h:1,rotated:false};
  const rotated=canRotateTool(tool)&&(rotation%2!==0);
  return{
    w:rotated?d.h:d.w,
    h:rotated?d.w:d.h,
    rotated
  };
}
function updateRotateButton(){
  const btn=document.getElementById('rotatebtn');
  if(!btn)return;
  const rotatable=!!selTool&&canRotateTool(selTool);
  btn.disabled=!buildMode||!rotatable;
  btn.classList.toggle('on',rotatable&&buildRotation%2!==0);
  btn.textContent=rotatable?(buildRotation%2!==0?'Rotated':'Rotate'):'Rotate';
  btn.title=rotatable?`Rotate ${RDEFS[selTool].name}`:'Rotate selected room';
}
function rotateBuildTool(){
  if(!buildMode||!selTool||!canRotateTool(selTool))return;
  buildRotation=(buildRotation+1)%2;
  const fp=getBuildFootprint(selTool);
  document.getElementById('hint').textContent=`Placing ${RDEFS[selTool].name} (${fp.w}x${fp.h}) - needs corridor + ${getRoomRequirementText(selTool).replace('Needs: ','')}.`;
  updateRotateButton();
  render();
}
function sel(t){
  if(!buildMode){
    document.getElementById('hint').textContent='Build mode is off. Toggle Build On to place corridors, rooms, or remove tiles.';
    return;
  }
  if(!isToolUnlocked(t)){
    document.getElementById('hint').textContent=getMilestoneForTool(t)?.desc||`${getBuildToolName(t)} is still locked.`;
    return;
  }
  selTool=t;
  if(!canRotateTool(t))buildRotation=0;
  closeRoomPanel();
  document.querySelectorAll('.rb,.dockbtn').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll(`[data-tool="${t}"]`).forEach(b=>b.classList.add('sel'));
  updateRotateButton();
  const hints={
    corridor:'Click and drag to paint corridor tiles.',
    luxury_path:'Click and drag to paint luxury path tiles.',
    demolish:'Click a tile or room to remove it.',
    ...Object.fromEntries(Object.entries(RDEFS).map(([k,v])=>{
      const fp=getBuildFootprint(k,0);
      return[k,`Placing ${v.name} (${fp.w}x${fp.h}) - needs corridor + ${getRoomRequirementText(k).replace('Needs: ','')}.`];
    }))
  };
  document.getElementById('hint').textContent=hints[t]||'';
}

function addLog(msg,type=''){
  logs.unshift({msg,type,d:day});if(logs.length>60)logs.pop();
  document.getElementById('log').innerHTML=logs.slice(0,20).map(l=>`<div class="li ${l.type}">Day ${l.d}: ${l.msg}</div>`).join('');
}
let lastHudMoney=null;
let lastHudRep=null;
const goalProgressMemory=new Map();
const goalCompletionMemory=new Map();
function pulseStatCard(selector,className){
  const card=document.querySelector(selector);
  if(!card)return;
  card.classList.remove(className);
  void card.offsetWidth;
  card.classList.add(className);
  setTimeout(()=>card.classList.remove(className),620);
}
function pulseStat(id,className=null){
  const statMap={
    smoney:['.stat-cash','money-pop'],
    srep:['.stat-rep','rep-gain'],
    sstress:['.stat-stress','rep-loss']
  };
  const config=statMap[id];
  if(!config)return;
  pulseStatCard(config[0],className||config[1]);
}
function flashStat(id,className=null){
  pulseStat(id,className);
}
function adjustReputation(amount,reason,type=''){
  const oldRep=reputation;
  reputation=clamp(reputation+amount,0,100);

  if(Math.round(oldRep)!==Math.round(reputation)){
    const sign=amount>0?'+':'';
    addLog(`Reputation ${sign}${amount}: ${reason}`,type||(amount>0?'g':'w'));
    if(amount>0)pulseStat?.('srep','rep-gain');
    else if(amount<0)pulseStat?.('srep','rep-loss');
  }
}
function spawnHudFloat(selector,text,kind='money'){
  const card=document.querySelector(selector);
  if(!card)return;
  const node=document.createElement('div');
  node.className=`hud-float ${kind}`;
  node.textContent=text;
  card.appendChild(node);
  setTimeout(()=>node.remove(),860);
}
function triggerGameShake(kind='tiny'){
  const game=document.getElementById('game');
  if(!game)return;
  const className=kind==='emergency'?'game-shake-emergency':'game-shake-tiny';
  game.classList.remove(className);
  void game.offsetWidth;
  game.classList.add(className);
  setTimeout(()=>game.classList.remove(className),260);
}
function updateHudFeedback(){
  if(lastHudMoney!==null){
    const delta=money-lastHudMoney;
    if(delta>0){
      pulseStatCard('.stat-cash','money-pop');
      spawnHudFloat('.stat-cash',`+$${delta.toLocaleString()}`,'money');
    }
  }
  if(lastHudRep!==null){
    const delta=reputation-lastHudRep;
    const displayDelta=Math.round(delta);
    if(delta>0){
      pulseStatCard('.stat-rep','rep-gain');
      if(displayDelta!==0)spawnHudFloat('.stat-rep',`+${displayDelta}`,'rep-gain');
    }else if(delta<0){
      pulseStatCard('.stat-rep','rep-loss');
      if(displayDelta!==0)spawnHudFloat('.stat-rep',`${displayDelta}`,'rep-loss');
    }
  }
  lastHudMoney=money;
  lastHudRep=reputation;
}
function normalizeGoalKey(key){
  return String(key||'goal').replace(/[^a-z0-9_-]+/gi,'_');
}
function animateGoalCards(scope){
  const root=typeof scope==='string'?document.querySelector(scope):scope;
  if(!root)return;
  const cards=root.querySelectorAll('[data-goal-key]');
  cards.forEach(card=>{
    const key=card.dataset.goalKey;
    const fill=card.querySelector('.goal-progress-fill');
    const check=card.querySelector('.goal-check');
    const nextProgress=Number(card.dataset.progress||0);
    const wasProgress=goalProgressMemory.has(key)?goalProgressMemory.get(key):0;
    const done=card.dataset.done==='1';
    const wasDone=goalCompletionMemory.get(key)===true;
    if(fill){
      fill.style.width=`${clamp(wasProgress,0,100)}%`;
      void fill.offsetWidth;
      requestAnimationFrame(()=>{fill.style.width=`${clamp(nextProgress,0,100)}%`;});
      if(nextProgress>wasProgress+0.1){
        fill.classList.remove('goal-fill-bump');
        void fill.offsetWidth;
        fill.classList.add('goal-fill-bump');
        setTimeout(()=>fill.classList.remove('goal-fill-bump'),420);
      }
    }
    if(check&&done&&!wasDone){
      check.classList.add('goal-check-pop');
      setTimeout(()=>check.classList.remove('goal-check-pop'),620);
    }
    goalProgressMemory.set(key,nextProgress);
    goalCompletionMemory.set(key,done);
  });
}
function showToast(message,type='info'){
  const stack=document.getElementById('toast-stack');
  if(!stack)return;
  const toast=document.createElement('div');
  toast.className=`toast ${type}`;
  const meta={
    good:{icon:'✓',title:'Success'},
    warn:{icon:'!',title:'Warning'},
    danger:{icon:'✕',title:'Danger'},
    info:{icon:'i',title:'Info'}
  }[type]||{icon:'i',title:'Info'};
  meta.icon=type==='good'?'✓':type==='warn'?'⚠':type==='danger'?'✕':'ℹ';
  const icon=document.createElement('span');
  icon.className='toast-icon';
  icon.textContent=meta.icon;
  const copy=document.createElement('div');
  copy.className='toast-copy';
  const title=document.createElement('div');
  title.className='toast-title';
  title.textContent=meta.title;
  const body=document.createElement('div');
  body.className='toast-msg';
  body.textContent=message;
  copy.appendChild(title);
  copy.appendChild(body);
  toast.appendChild(icon);
  toast.appendChild(copy);
  stack.prepend(toast);
  while(stack.children.length>4)stack.removeChild(stack.lastChild);
  setTimeout(()=>{
    toast.classList.add('hide');
    setTimeout(()=>toast.remove(),240);
  },3200);
}
function showWarning(message){
  addLog(message,'w');
  showToast(message,'warn');
}
function triggerStaffSick(){
  const eligible=staff.filter(s=>s.hired&&s.state!=='out_sick'&&s.state!=='on_vacation'&&(s.issueImmunityDays??0)<=0);
  const s=eligible.length?eligible[Math.floor(Math.random()*eligible.length)]:null;
  if(!s)return;
  eventStats.staffIncidents++;
  s.active=false;
  s.state='out_sick';
  s.sickDays=1;
  addLog(`${s.name} called out sick.`,'b');
  showToast('Staff called out sick','warn');
  updateUI();
}
function randomOperationalRoom(types=null){
  const pool=rooms.filter(r=>roomHasVerticalAccess(r)&&isConn(r)&&roomHasLinkRequirements(r)&&!isRoomTemporarilyDisabled(r)&&(!types||types.includes(r.type)));
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
function spawnPatients(count=1){
  for(let i=0;i<count;i++)spawnPatient();
}
function triggerOperationsPulse(){
  const roll=Math.random();

  if(roll<0.25){
    stress=clamp(stress+5,0,100);
    addLog('Staff stress is rising due to workload.','w');
  }else if(roll<0.5){
    spawnPatients(3);
    addLog('Patient surge at the entrance.','w');
  }else if(roll<0.75){
    cleanliness=clamp(cleanliness-5,0,100);
    addLog('Cleanliness dropping in high traffic areas.','w');
  }else{
    addLog('Operations stable.','g');
  }
  updateUI();
}
function triggerPatientSurge(){
  const intakeRoom=rooms.find(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r))||null;
  spawnPatients(5);
  stress=clamp(stress+5,0,100);
  if(intakeRoom)focusEventRoom(intakeRoom,true);
  addLog('Patient surge! Intake is overwhelmed.','w');
  showToast('Patient surge','warn');
  triggerGameShake('tiny');
  updateUI();
}
function triggerEmergency(){
  eventStats.emergencies++;
  const erRoom=rooms.find(r=>r.type==='er'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r))||rooms.find(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r));
  spawnEmergencyPatient();
  stress=clamp(stress+2,0,100);
  if(erRoom)focusEventRoom(erRoom,true);
  addLog('Emergency case incoming!','w');
  showToast('Emergency case incoming','warn');
  triggerGameShake('emergency');
  updateUI();
}
function triggerEquipmentFailure(){
  const room=randomOperationalRoom(['gp','er','xray','lab','pharmacy','ward','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','surgery']);
  if(!room)return;
  disableRoom(room,5000);
  stress=clamp(stress+4,0,100);
  focusEventRoom(room,true,5000);
  addLog(`Equipment failure in ${RDEFS[room.type].name}. The room is temporarily offline.`,'b');
  showToast('Equipment failure','warn');
  updateUI();
}
function triggerPatientComplaint(){
  eventStats.complaints++;
  const lobbyRoom=rooms.find(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r))||null;
  const repLoss=getChaosRepLoss(4,currentShift());
  reputation=clamp(reputation-repLoss,0,100);
  stress=clamp(stress+3,0,100);
  if(lobbyRoom)focusEventRoom(lobbyRoom,true);
  addLog('Patient complaint filed. Reputation dropped and staff pressure increased.','b');
  showToast('Patient complaint','warn');
  updateUI();
}
function triggerStaffBurnout(){
  const activeShift=currentShift();
  const member=staff.find(s=>isStaffAvailable(s,activeShift))||randomHiredStaff();
  if(!member)return;
  eventStats.staffIncidents++;
  member.energy=clamp((member.energy??100)-28,0,100);
  member.morale=clamp((member.morale??100)-12,0,100);
  if(member.energy<25&&member.state!=='on_break')member.state='on_break';
  addLog(`${member.name} is burning out after the workload spike. Energy and morale dropped.`,'w');
  showToast('Staff burnout','warn');
  updateUI();
}
function boostMoraleAll(amount=12,energyBoost=8){
  staff.forEach(member=>{
    if(!member.hired)return;
    member.morale=clamp((member.morale??100)+amount,0,100);
    member.energy=clamp((member.energy??100)+energyBoost,0,100);
    if(member.state==='on_break'&&member.energy>=40)member.state='active';
  });
  updateUI();
}
function triggerVipPatient(){
  const gpRoom=rooms.find(r=>r.type==='vip_room'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r))||rooms.find(r=>r.type==='gp'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r))||rooms.find(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r));
  spawnVipPatient();
  stress=clamp(stress+2,0,100);
  if(gpRoom)focusEventRoom(gpRoom,true);
  addLog('VIP patient arrived. Expectations are high, but the case pays well.','w');
  showToast('VIP patient arrived','info');
  updateUI();
}
function triggerHospitalInspection(){
  const inspectionRoom=randomOperationalRoom(['waiting_room','gp','er','xray','lab','pharmacy','ward','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','surgery','head_office'])||rooms.find(r=>isConn(r))||null;
  const passed=reputation>=72&&cleanliness>=74&&stress<=65;
  if(inspectionRoom)focusEventRoom(inspectionRoom,true,3600);
  if(passed){
    reputation=clamp(reputation+4,0,100);
    score=Math.max(0,score+25);
    addLog('Hospital inspection passed. Reputation and score improved.','g');
    showToast('Inspection passed','good');
  }else{
    reputation=clamp(reputation-5,0,100);
    stress=clamp(stress+5,0,100);
    addLog('Hospital inspection found problems. Reputation fell and stress increased.','b');
    showToast('Inspection failed','warn');
  }
  updateUI();
}
function updateStress(shift=currentShift()){
  let stressChange=0;
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{speed:1,stress:0};
  const waiting=waitingPatientsCount();
  const coverage=coverageStatus(shift);
  const understaffedRooms=getUnderstaffedOperationalRooms(shift);
  stressChange+=Math.floor(waiting/3);
  if(cleanliness<70)stressChange+=2;
  if(cleanliness<50)stressChange+=4;
  stressChange+=coverage.nurseShort*2;
  stressChange+=coverage.cnaShort*2;
  stressChange+=understaffedRooms;
  stressChange+=getPassiveDramaStress(shift);
  stressChange+=getInsuranceStressLoad();
  stressChange-=getGrantOperationsStressRelief();
  stressChange-=techBonus.stress||0;
  stressChange-=getOperationsDepartmentStressRelief();
  const guards=getHiredRoleCount('security_officer',shift);
  stressChange-=guards*3;
  stressChange-=getJanitorTraitStressRelief(shift);
  stressChange-=getBathroomStressRelief(shift);
  stressChange-=getHvacStressRelief(shift);
  stressChange-=Math.ceil(getItStressReduction(shift)/4);
  if(cleanliness>=85&&waiting===0&&coverage.nurseShort===0&&coverage.cnaShort===0)stressChange-=2;
  stress=clamp(stress+stressChange,0,100);
  return stress;
}
function getStressLevel(){
  return stress;
}
function getStressState(stress){
  if(stress>=70)return{label:'High',className:'stress-high'};
  if(stress>=40)return{label:'Medium',className:'stress-medium'};
  return{label:'Low',className:'stress-low'};
}
function enableSandbox(){
  isSandboxMode=true;
  money=999999;
  researchPoints=9999;
  if(isSandboxMode){
    unlockAll();
  }
  addLog('Sandbox mode enabled','g');
  addLog('Sandbox mode: progression disabled','w');
  updateUI();
  render();
}
function recoverEnergy(shift=currentShift()){
  const staffRoomCount=countOperationalRooms('staff_room',shift);
  const lunchRoomCount=countOperationalRooms('lunch_room',shift);
  const chargeSupport=getChargeNurseSupport(shift);
  const deptHeadSupport=getDeptHeadSupport(shift);
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{breakEnergyBonus:0,breakMoraleBonus:0};
  staff.forEach(s=>{
    if(!s.hired||s.shift!==shift)return;
    let energyGain=0;
    let moraleGain=0;
    if(staffRoomCount>0){
      energyGain+=2;
      moraleGain+=1;
    }
    if(lunchRoomCount>0){
      energyGain+=1;
      moraleGain+=1;
    }
    if(s.state==='on_break'){
      energyGain+=2;
      moraleGain+=1;
      if(isChargeBreakRole(s.role)&&chargeSupport.count>0){
        energyGain+=chargeSupport.breakEnergyBonus;
        moraleGain+=chargeSupport.breakMoraleBonus;
      }
      if(isDeptHeadBreakRole(s.role)&&deptHeadSupport.active){
        energyGain+=deptHeadSupport.breakEnergyBonus;
        moraleGain+=deptHeadSupport.breakMoraleBonus;
      }
      if((staffRoomCount>0||lunchRoomCount>0)&&(techBonus.breakEnergyBonus||techBonus.breakMoraleBonus)){
        energyGain+=techBonus.breakEnergyBonus||0;
        moraleGain+=techBonus.breakMoraleBonus||0;
      }
    }
    if(!energyGain&&!moraleGain)return;
    s.energy=clamp(s.energy+energyGain,0,100);
    s.morale=clamp((s.morale??100)+moraleGain,0,100);
  });
}
function reduceStress(amount){
  stress=clamp(stress-amount,0,100);
  updateStressUI();
}
function updateStressUI(){
  const currentStress=getStressLevel();
  const state=getStressState(currentStress);
  const value=document.getElementById('sstress');
  const note=document.getElementById('sstressnote');
  const card=document.getElementById('stresscard');
  if(value)value.textContent=currentStress;
  if(note)note.textContent=state.label;
  if(card){
    card.classList.remove('stress-low','stress-medium','stress-high');
    card.classList.add(state.className);
  }
}
function pressureLevel(score){
  if(score>=70)return{label:'Danger',className:'pressure-danger'};
  if(score>=35)return{label:'Warning',className:'pressure-warning'};
  return{label:'Stable',className:'pressure-stable'};
}
function getReputationTier(){
  if(reputation>=85)return'Excellent';
  if(reputation>=70)return'Trusted';
  if(reputation>=50)return'Stable';
  if(reputation>=30)return'At Risk';
  return'Critical';
}
function getReputationStatus(){
  return getReputationTier();
}
function getPressureDashboardItems(){
  const coverage=coverageStatus();
  const waitingCount=waitingPatientsCount();
  const waitingCapacity=Math.max(1,effectiveWaitingCapacity());
  const longWaiters=patients.filter(p=>p.state==='waiting'&&p.waitTime>=getEffectiveLongWaitThreshold()).length;
  const patientVolumeScore=clamp((waitingCount/waitingCapacity)*65+longWaiters*12,0,100);

  const activeShift=currentShift();
  const activeStaff=staff.filter(s=>s.hired&&s.shift===activeShift);
  const lowEnergyCount=activeStaff.filter(s=>(s.energy??100)<45).length;
  const onBreakCount=activeStaff.filter(s=>s.state==='on_break').length;
  const burnoutScore=activeStaff.length?clamp((lowEnergyCount/activeStaff.length)*75+(onBreakCount/Math.max(1,activeStaff.length))*45,0,100):0;

  const insuranceScore=insuranceContracts.length
    ?clamp(getInsuranceTrafficBonus()*100+getInsuranceIncomeBoost()*60+getInsuranceStressLoad()*6,0,100)
    :0;

  const marketingScore=adReach>0
    ?clamp(adReach*0.75+getMarketingExtraPatientsPerDay()*5,0,100)
    :0;

  const cleanlinessScore=clamp((100-cleanliness)*1.4,0,100);

  const shortageUnits=coverage.nurseShort+coverage.cnaShort+rooms.filter(r=>roomHasVerticalAccess(r)&&isConn(r)&&getMissingRoomRoles(r,activeShift).length>0).length;
  const shortageBase=coverage.nurseNeeded+coverage.cnaNeeded+Math.max(1,rooms.filter(r=>roomHasVerticalAccess(r)&&isConn(r)&&RDEFS[r.type].staffRole).length);
  const staffingScore=clamp((shortageUnits/Math.max(1,shortageBase))*120,0,100);

  return[
    {
      title:'Patient Volume Pressure',
      value:`${waitingCount} waiting`,
      note:longWaiters>0
        ?`${longWaiters} patients are already in long-wait territory.`
        :`Capacity in use: ${Math.min(waitingCount,waitingCapacity)}/${waitingCapacity}.`,
      ...pressureLevel(patientVolumeScore)
    },
    {
      title:'Staff Burnout Risk',
      value:activeStaff.length?`${lowEnergyCount} tired / ${activeStaff.length} on shift`:'No active shift staff',
      note:onBreakCount>0
        ?`${onBreakCount} staff currently on break from low energy.`
        :'Energy levels are steady on the active shift.',
      ...pressureLevel(burnoutScore)
    },
    {
      title:'Insurance Contract Pressure',
      value:insuranceContracts.length?`${insuranceContracts.length} active contract${insuranceContracts.length===1?'':'s'}`:'No active insurance contract',
      note:insuranceContracts.length
        ?`+${Math.round(getInsuranceTrafficBonus()*100)}% volume, +${Math.round(getInsuranceIncomeBoost()*100)}% income, stress ${getInsuranceStressLoad()}.`
        :'No extra insurance-driven patient load right now.',
      ...pressureLevel(insuranceScore)
    },
    {
      title:'Marketing Pressure',
      value:adReach>0?`${Math.round(adReach)}% campaign reach`:'Campaign inactive',
      note:adReach>0
        ?`Estimated extra patients/day: +${getMarketingExtraPatientsPerDay().toFixed(1)}.`
        :'No ad-driven traffic spike is active.',
      ...pressureLevel(marketingScore)
    },
    {
      title:'Cleanliness Risk',
      value:`${Math.round(cleanliness)}% clean`,
      note:cleanliness<65
        ?'Lower cleanliness is adding avoidable hospital pressure.'
        :'Sanitation is not a major pressure source right now.',
      ...pressureLevel(cleanlinessScore)
    },
    {
      title:'Staffing Shortage Risk',
      value:`${shortageUnits} active gaps`,
      note:shortageUnits>0
        ?`${coverage.nurseShort} nurse gaps, ${coverage.cnaShort} CNA gaps, plus missing room coverage.`
        :'Current shift coverage is keeping up with room demand.',
      ...pressureLevel(staffingScore)
    }
  ];
}
function renderPressureDashboard(){
  const wrap=document.getElementById('pressure-dashboard');
  if(!wrap)return;
  wrap.innerHTML=getPressureDashboardItems().map(item=>`<div class="pressure-card ${item.className}">
    <div class="pressure-head">
      <div class="pressure-title">${item.title}</div>
      <div class="pressure-level">${item.label}</div>
    </div>
    <div class="pressure-value">${item.value}</div>
    <div class="pressure-note">${item.note}</div>
  </div>`).join('');
}
function renderStatusChip(label,kind='stable'){
  return `<span class="status-chip ${kind}">${label}</span>`;
}
function renderWarningDeck(){
  const wrap=document.getElementById('warningdeck');
  if(!wrap)return;
  const waitingCount=waitingPatientsCount();
  const warnings=[];
  if(stress>=70)warnings.push({title:'Hospital Stress',copy:`Stress is at ${Math.round(stress)}. Burnout, incidents, and reputation loss are rising.`,kind:stress>=88?'danger':'warning',chip:renderStatusChip('High Stress','high-stress'),value:`${Math.round(stress)} / 100`});
  if(debtDays>=3)warnings.push({title:'Debt Watch',copy:`The hospital has been in debt for ${debtDays} day${debtDays===1?'':'s'}.`,kind:debtDays>=7?'danger':'warning',chip:renderStatusChip(`${debtDays} Debt Days`,debtDays>=7?'danger':'warning'),value:`${debtDays} days`});
  if(waitingCount>effectiveWaitingCapacity())warnings.push({title:'Waiting Overflow',copy:getWaitingStatus(waitingCount),kind:'warning',chip:renderStatusChip('Queue Pressure','warning'),value:`${waitingCount} waiting`});
  if(cleanliness<55)warnings.push({title:'Cleanliness Risk',copy:getCleanlinessStatus(),kind:cleanliness<40?'danger':'warning',chip:renderStatusChip(cleanliness<40?'Dangerously Dirty':'Needs Attention',cleanliness<40?'danger':'warning'),value:`${Math.round(cleanliness)}% clean`});
  if(reputation<45)warnings.push({title:'Reputation Pressure',copy:getReputationStatus(),kind:reputation<25?'danger':'warning',chip:renderStatusChip(reputation<25?'Critical Trust':'Warning',reputation<25?'danger':'warning'),value:`Rep ${Math.round(reputation)}`});
  wrap.innerHTML=!warnings.length
    ?`<div class="warning-card stable">
        <div class="warning-head"><div class="warning-title">Hospital Status</div>${renderStatusChip('Stable','stable')}</div>
        <div class="warning-value">All systems normal</div>
        <div class="warning-copy">No major warnings right now. The hospital is stable.</div>
      </div>`
    :warnings.map(item=>`<div class="warning-card ${item.kind}">
        <div class="warning-head"><div class="warning-title">${item.title}</div>${item.chip}</div>
        <div class="warning-value">${item.value||''}</div>
        <div class="warning-copy">${item.copy}</div>
      </div>`).join('');
}
function renderResearchSummary(){
  const wrap=document.getElementById('researchsummary');
  if(!wrap)return;
  if(!hasBasicResearchAccess()){
    wrap.innerHTML=`<div class="summary-card"><div class="summary-head"><div class="summary-title">Research Program</div>${renderStatusChip('Locked','locked')}</div><div class="summary-copy">Build and staff a Research Department to unlock research.</div></div>`;
    return;
  }
  if(activeResearch){
    const tech=getResearchDef(activeResearch.id);
    wrap.innerHTML=`<div class="summary-card"><div class="summary-head"><div class="summary-title">${tech?.name||'Research Project'}</div>${renderStatusChip('Operational','operational')}</div><div class="summary-value">${activeResearch.totalDays-activeResearch.daysLeft}/${activeResearch.totalDays} days</div><div class="summary-copy">${tech?.rewardText||'Research in progress.'}</div><div class="summary-meta">RP available: ${researchPoints} · Researcher boost: +${getResearchDepartmentBoost().toFixed(1)}</div></div>`;
    return;
  }
  wrap.innerHTML=`<div class="summary-card"><div class="summary-head"><div class="summary-title">Research Ready</div>${renderStatusChip('Operational','operational')}</div><div class="summary-value">${researchPoints} RP</div><div class="summary-copy">${researchedTech.size} project${researchedTech.size===1?'':'s'} completed.</div><div class="summary-meta">Researcher boost: +${getResearchDepartmentBoost().toFixed(1)}</div></div>`;
}
function updateInsuranceUI(){
  const list=document.getElementById('insurance-list');
  if(!list)return;
  list.innerHTML='';

  if(!insuranceContracts.length){
    const empty=document.createElement('div');
    empty.className='summary-card';
    empty.textContent='No insurance contracts signed yet.';
    list.appendChild(empty);
    return;
  }

  insuranceContracts.forEach(c=>{
    const el=document.createElement('div');
    el.className='summary-card';
    el.textContent=`${c.name} (+${Math.round((c.incomeBoost||0)*100)}% income)`;
    list.appendChild(el);
  });
}
function renderMarketingSummary(){
  const wrap=document.getElementById('marketingsummary');
  if(!wrap)return;
  let chip='locked',title='Marketing Offline',copy='Build and staff a Marketing Office to activate campaigns.',meta='No campaign pressure is active.';
  if(hasMarketingOfficeAccess()){
    chip=adReach>0?'active-contract':'operational';
    title=adReach>0?'Marketing Active':'Marketing Ready';
    copy=`Campaign reach: ${Math.round(adReach)}%`;
    meta=`${getAdvertisingStatus()} Extra patients/day: +${getMarketingExtraPatientsPerDay().toFixed(1)}.`;
  }else if(hasMarketingOfficeBuilt()){
    chip='needs-staff';
    title='Marketing Needs Staff';
    copy='The office is built but needs a marketing manager.';
  }
  wrap.innerHTML=`<div class="summary-card"><div class="summary-head"><div class="summary-title">${title}</div>${renderStatusChip(chip==='active-contract'?'Active Contract':chip==='operational'?'Operational':chip==='needs-staff'?'Needs Staff':'Locked',chip)}</div><div class="summary-value">${Math.round(adReach)}%</div><div class="summary-copy">${copy}</div><div class="summary-meta">${meta}</div></div>`;
}
function renderBudgetPanel(){
  const wrap=document.getElementById('budgetpanel');
  if(!wrap)return;
  const budget=getBudgetSnapshot();
  const netKind=budget.net>=0?'operational':'danger';
  const estKind=budget.estNet>=0?'operational':'danger';
  wrap.innerHTML=`
    <div class="summary-card">
      <div class="summary-head">
        <div class="summary-title">Month To Date</div>
        ${renderStatusChip(`Day ${budget.daysElapsed}/30`,'info')}
      </div>
      <div class="summary-value ${budget.net>=0?'budget-positive':'budget-negative'}">${formatBudgetMoney(budget.net)}</div>
      <div class="summary-copy">Live net after current expenses, with pending treatment income included.</div>
      <div class="summary-meta">Booked income ${formatBudgetMoney(budget.bookedIncome)} · Pending ${formatBudgetMoney(budget.pendingIncome)} · Expenses ${formatBudgetMoney(budget.expenses)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-head">
        <div class="summary-title">Estimated Month End</div>
        ${renderStatusChip(budget.estNet>=0?'On Track':'Over Budget',estKind)}
      </div>
      <div class="summary-value ${budget.estNet>=0?'budget-positive':'budget-negative'}">${formatBudgetMoney(budget.estNet)}</div>
      <div class="summary-copy">Projection based on the current month pace, with payroll due included.</div>
      <div class="summary-meta">Income ${formatBudgetMoney(budget.estIncome)} · Expenses ${formatBudgetMoney(budget.estExpenses)} · Payroll due ${formatBudgetMoney(budget.payrollDue)}</div>
    </div>`;
}
function renderDepartmentPanel(){
  const wrap=document.getElementById('departmentpanel');
  if(!wrap)return;
  wrap.innerHTML=Object.entries(DEPARTMENT_DEFS).map(([key,def])=>{
    const level=getDepartmentLevel(key);
    const cost=getDepartmentUpgradeCost(key);
    const status=getDepartmentStatus(key);
    const disabled=status.chip==='locked';
    return `<div class="summary-card department-card">
      <div class="department-copy">
        <div class="summary-head">
          <div class="department-title">${def.label}</div>
          ${renderStatusChip(status.label,status.chip)}
        </div>
        <div class="department-level">Level ${level}</div>
        <div class="department-meta">${def.bonus}</div>
      </div>
      <div class="department-actions">
        <button class="panel-btn" type="button" onclick="upgradeDepartment('${key}')" ${disabled?'disabled':''}>Upgrade $${cost.toLocaleString('en-US')}</button>
      </div>
    </div>`;
  }).join('');
}
function renderGrantSummary(){
  const wrap=document.getElementById('grantsummary');
  if(!wrap)return;
  if(!hasGrantWriterOfficeBuilt()){
    wrap.innerHTML=`<div class="summary-card"><div class="summary-head"><div class="summary-title">Grant Program</div>${renderStatusChip('Locked','locked')}</div><div class="summary-copy">Build and staff a Grant Writer Office to apply for mission, staffing, and expansion grants.</div></div>`;
    return;
  }
  if(!hasGrantWriterOfficeAccess()){
    wrap.innerHTML=`<div class="summary-card"><div class="summary-head"><div class="summary-title">Grant Program</div>${renderStatusChip('Needs Staff','needs-staff')}</div><div class="summary-copy">The office is built, but it needs a Grant Writer to prepare applications and manage review periods.</div></div>`;
    return;
  }
  ensureGrantOffers();
  const ordered=grantOffers.slice().sort((a,b)=>{
    const order={review:0,active:1,available:2,denied:3};
    return (order[a.status]??9)-(order[b.status]??9);
  });
  wrap.innerHTML=ordered.map(offer=>{
    const chipLabel=offer.status==='available'?'Available':offer.status==='review'?'In Review':offer.status==='active'?'Active':'Denied';
    const chipKind=offer.status==='available'?'info':offer.status==='review'?'needs-staff':offer.status==='active'?'operational':'danger';
    const action=offer.status==='available'
      ?`<button class="panel-btn" type="button" onclick="applyForGrant('${offer.id}')">Apply</button>`
      :offer.status==='review'
        ?`<div class="summary-meta">Review ends in ${offer.daysLeft} day${offer.daysLeft===1?'':'s'}.</div>`
        :offer.status==='active'
          ?`<div class="summary-meta">Effect active for ${offer.daysLeft} day${offer.daysLeft===1?'':'s'}.</div>`
          :`<div class="summary-meta">This application failed review.</div>`;
    return `<div class="summary-card">
      <div class="summary-head">
        <div class="summary-title">${offer.label}</div>
        ${renderStatusChip(chipLabel,chipKind)}
      </div>
      <div class="summary-copy">${offer.category}</div>
      <div class="summary-meta">${offer.desc}</div>
      <div class="summary-meta">Approval chance: ${Math.round(getGrantApprovalChance(offer)*100)}%</div>
      <div class="summary-meta">${offer.rewardText}</div>
      <div class="summary-meta">${getGrantDef(offer.id)?.requirementText||''}</div>
      ${action}
    </div>`;
  }).join('');
}
function renderEndScreen(title,message,outcome='loss'){
  document.getElementById('gameovertitle').textContent=title;
  document.getElementById('gameovermsg').textContent=message;
  document.getElementById('go-days').textContent=`Ended on day ${day}`;
  document.getElementById('go-stage').textContent=`Stage reached: ${getCurrentStageName()}`;
  document.getElementById('go-treated').textContent=`Patients treated: ${totalTreated}`;
  document.getElementById('go-rep').textContent=`Final reputation: ${Math.round(reputation)}`;
  document.getElementById('go-grade').textContent=`Hospital grade: ${getHospitalGrade()}`;
  document.getElementById('go-score').textContent=`Final score: ${Math.floor(score)}`;
  document.getElementById('go-events').textContent=`Total events: ${eventStats.totalEvents||0}`;
  document.getElementById('go-emergencies').textContent=`Emergencies: ${eventStats.emergencies}`;
  document.getElementById('go-staffincidents').textContent=`Staff incidents: ${eventStats.staffIncidents}`;
  document.getElementById('go-complaints').textContent=`Complaints: ${eventStats.complaints}`;
  const titleBtn=document.querySelector('#gameoverbox .title-btn.warning');
  if(titleBtn)titleBtn.textContent='Start New Run';
  runOutcome=outcome;
}

function updateUI(){
  organizeBuildMenu();
  ensureStaffPoolCoverage();
  applyMilestoneUnlocks();
  syncStageUnlocks();
  updateFloorControls();
  updateHeatmapUI();
  const coverage=coverageStatus();
  const waitingCount=waitingPatientsCount();
  const advertBtn=document.getElementById('advertbtn');
  const researchBtn=document.getElementById('researchbtn');
  document.getElementById('smoney').textContent=money.toLocaleString('en-US');
  document.getElementById('sday').textContent=day;
  document.getElementById('sshift').textContent=currentShiftLabel();
  const scoreHud=document.getElementById('sscore');
  if(scoreHud)scoreHud.textContent=Math.floor(score);
  document.getElementById('sgrade').textContent=getHospitalGrade();
  document.getElementById('srep').textContent=Math.round(reputation);
  document.getElementById('sclean').textContent=Math.round(cleanliness);
  updateHudFeedback();
  const stageBadge=document.getElementById('stagebadge');
  if(stageBadge)stageBadge.textContent=getCurrentStageName();
  updateStressUI();
  document.getElementById('spat').textContent=researchPoints;
  document.getElementById('swait').textContent=waitingCount;
  const waitCard=document.querySelector('.stat-waiting');
  if(waitCard){
    const waitRatio=waitingCount/Math.max(1,effectiveWaitingCapacity());
    waitCard.classList.toggle('waiting-medium',waitRatio>=0.65&&waitRatio<1);
    waitCard.classList.toggle('waiting-high',waitRatio>=1);
  }
  document.getElementById('rmoney').textContent='$'+money.toLocaleString('en-US');
  const rightStage=document.getElementById('rstage');
  if(rightStage)rightStage.textContent=getCurrentStageName();
  const rightStageWarn=document.getElementById('rstagewarn');
  if(rightStageWarn)rightStageWarn.textContent=getStageProgressText();
  renderStageProgress();
  document.getElementById('rgrade').textContent=getHospitalGrade();
  document.getElementById('rgradewarn').textContent=gradeNote;
  document.getElementById('rrep').textContent=Math.round(reputation);
  const repWarn=document.getElementById('rrepwarn');
  if(repWarn){
    repWarn.textContent=getReputationTier();
  }
  const govQuota=document.getElementById('govQuota');
  if(govQuota)govQuota.textContent=`${Math.round(govRequired*100)}% Required`;
  updateGovernmentContract();
  const govPenalty=document.getElementById('govPenalty');
  if(govPenalty)govPenalty.textContent=`Next Review: ${getDaysUntilGovernmentReview()} Day${getDaysUntilGovernmentReview()===1?'':'s'}`;
  document.getElementById('rclean').textContent=Math.round(cleanliness)+'%';
  document.getElementById('rcleanwarn').textContent=getCleanlinessStatus();
  document.getElementById('rwaiting').textContent=waitingCount;
  document.getElementById('rwaitingwarn').textContent=getWaitingStatus(waitingCount);
  document.querySelector('.stat-rwait')?.classList.toggle('high',waitingCount>effectiveWaitingCapacity());
  checkGrantProgress();
  renderWarningDeck();
  renderPressureDashboard();
  renderBudgetPanel();
  renderDepartmentPanel();
  renderGrantSummary();
  renderResearchSummary();
  if(typeof renderTechTreePanel==='function')renderTechTreePanel();
  updateInsuranceUI();
  renderMarketingSummary();
  const researchPointsNode=document.getElementById('rpoints');
  if(researchPointsNode)researchPointsNode.textContent=researchPoints;
  document.getElementById('rnursecov').textContent=`${coverage.nurseAssigned} / ${coverage.nurseNeeded}`;
  document.getElementById('rnursecovwarn').textContent=getCoverageWarning(coverage.nurseAssigned,coverage.nurseNeeded,'Nurse');
  document.getElementById('rcnacov').textContent=`${coverage.cnaAssigned} / ${coverage.cnaNeeded}`;
  document.getElementById('rcnacovwarn').textContent=getCoverageWarning(coverage.cnaAssigned,coverage.cnaNeeded,'CNA');
  document.getElementById('rincome').textContent='$'+monthlyInc.toLocaleString();
  document.getElementById('rwages').textContent='$'+wageBill().toLocaleString();
  document.getElementById('rdebt').textContent=`${debtDays} day${debtDays===1?'':'s'}`;
  document.getElementById('rtreated').textContent=totalTreated;
  document.getElementById('sstaff').textContent=staff.filter(s=>s.hired).length;
  if(advertBtn){
    advertBtn.disabled=gameOver||!hasMarketingOfficeAccess()||money<getAdvertisingCost();
    advertBtn.textContent=hasMarketingOfficeAccess()
      ?`Launch Campaign ($${getAdvertisingCost().toLocaleString()})`
      :(hasMarketingOfficeBuilt()?'Staff Marketing Office':'Build Marketing Office');
  }
  if(researchBtn){
    researchBtn.disabled=false;
  }
  renderDailyGoal();
  renderStageGoals();
  renderRoomPanel();
  renderDispatchJobs();
  renderResearch();
  renderContracts();
  renderHiredStaffMenu();
  updateUnlockButtons();
  renderMilestones();
  renderSoftGuide();
  if(document.getElementById('staffmodal').classList.contains('open'))renderStaffModal();
  if(document.getElementById('employeemodal').classList.contains('open')&&typeof renderEmployeeNeedsMenu==='function')renderEmployeeNeedsMenu();
  if(gameOver)document.getElementById('hint').textContent=loseReason;
}

let tickAcc=0;
function updateDailyHospitalState(){
  const janitors=getJanitors();
  const activeShift=currentShift();
  const directorTrait=getDirectorTrait(activeShift);
  const quittingStaffIds=[];
  grantDailyResearchPoints(activeShift);
  adReach=clamp(adReach-4,0,100);
  autoHireByHR();
  autoApproveVacationsByHR();
  generateDispatchJobs(activeShift);
  progressDispatchJobs(activeShift);
  const coverage=coverageStatus(activeShift);
  const chargeSupport=getChargeNurseSupport(activeShift);
  const deptHeadSupport=getDeptHeadSupport(activeShift);
  const waitingCount=waitingPatientsCount();
  const guardProtection=getGuardProtection(activeShift);
  const nurseStationRooms=countOperationalRooms('nurse_station',activeShift);
  const staffRoomCount=countOperationalRooms('staff_room',activeShift);
  const waitOverflow=Math.max(0,waitingCount-effectiveWaitingCapacity());
    const activeMedical=staff.filter(s=>s.hired&&s.shift===activeShift&&!['janitor','intern','security_officer','hr_manager','medical_director'].includes(s.role)).length;
  const workload=Math.max(0,rooms.length*0.65+patients.length*0.45)+getInsuranceStressLoad()*0.35;
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{energyDrainMult:1};
  const janitorPower=janitors.filter(j=>j.shift===activeShift).reduce((sum,j)=>sum+(j.energy>=40?1:0.6),0);
  const sterileBonus=hasFeature('sterile_workflow')?1.2:0;
  const janitorClosetBonus=getJanitorClosetBonus(activeShift);
  const hvacCleanlinessBonus=getHvacCleanlinessBonus(activeShift);
  const janitorTraitCleanBonus=getJanitorTraitCleanBonus(activeShift);
  cleanliness=clamp(cleanliness-(1.6+workload*0.22)+(janitorPower*3.8)+janitorTraitCleanBonus+sterileBonus+janitorClosetBonus+hvacCleanlinessBonus+getOperationsDepartmentCleanBonus()+(directorTrait?.cleanlinessBonus||0)-(coverage.nurseShort*0.7)-(coverage.cnaShort*0.4)-(waitOverflow*0.45),0,100);
  const stressLevel=updateStress(activeShift);

  staff.forEach(s=>{
    if(typeof s.state!=='string')s.state='active';
    const onBreak=s.state==='on_break';
    const working=s.shift===activeShift&&!onBreak&&(s.role==='janitor'?rooms.length>0:true);
    const strain=s.role==='janitor'?Math.max(0,rooms.length/5-janitors.length*0.4):Math.max(0,patients.length/6);
    if(typeof s.morale!=='number')s.morale=100;
    if(typeof s.active!=='boolean')s.active=true;
    if(typeof s.sickDays!=='number')s.sickDays=0;
    if(typeof s.vacationDays!=='number')s.vacationDays=0;
    if(typeof s.issueImmunityDays!=='number')s.issueImmunityDays=0;
    if(typeof s.returnBoostDays!=='number')s.returnBoostDays=0;
    if(typeof s.raiseCooldown!=='number')s.raiseCooldown=0;
    if(typeof s.quitRiskDays!=='number')s.quitRiskDays=0;
    if(s.state==='out_sick'){
      s.sickDays=Math.max(0,s.sickDays-1);
      s.active=false;
      if(s.sickDays<=0){
        s.state='active';
        s.active=true;
        addLog(`${s.name} is back from sick leave.`,'g');
      }
      return;
    }
    if(s.state==='on_vacation'){
      s.vacationDays=Math.max(0,s.vacationDays-1);
      s.energy=clamp((s.energy??100)+18,0,100);
      s.morale=clamp((s.morale??100)+14,0,100);
      s.active=false;
      if(s.vacationDays<=0){
        s.state='active';
        s.active=true;
        s.issueImmunityDays=3;
        s.returnBoostDays=3;
        s.raiseRequest=null;
        s.quitRiskDays=0;
        s.burnoutLogged=false;
        s.energy=clamp(Math.max(s.energy??100,92),0,100);
        s.morale=clamp(Math.max(s.morale??100,92),0,100);
        addLog(`${s.name} is back from vacation refreshed, issue-proof, and working at peak speed for 3 days.`,'g');
      }
      return;
    }
    const burnoutDrag=s.personalityTrait?.id==='burnout_risk'?1.5:0;
    const traitEnergyDrag=(s.traits||[]).reduce((sum,t)=>sum+(t.extraEnergyDrain||0),0);
    const grantWriterBurnoutDrag=s.role==='grant_writer'&&getGrantWriterTrait(s)?.id==='burnout_prone'&&getActiveGrantOffers().length>1?2:0;
    const ambitiousDrag=s.personalityTrait?.id==='ambitious'&&working?1:0;
    const stressDrag=stressLevel*0.02;
    const energyDrain=(6+strain*2.2+burnoutDrag+traitEnergyDrag+grantWriterBurnoutDrag+ambitiousDrag+stressDrag)*(techBonus.energyDrainMult||1);
    s.energy=clamp(s.energy+(working?-energyDrain:8),0,100);
    let moraleDelta=0;
    if(s.energy<25)moraleDelta-=6;
    else if(s.energy<45)moraleDelta-=3;
    if(s.role!=='intern'){
      if(stressLevel>=70)moraleDelta-=4;
      else if(stressLevel>=40)moraleDelta-=2;
    }
    moraleDelta+=directorTrait?.moraleStressResist||0;
    if(s.personalityTrait?.stressResist)moraleDelta+=s.personalityTrait.stressResist;
    if(s.personalityTrait?.burnoutRisk&&stressLevel>=55)moraleDelta-=2;
    if(!working&&s.energy>=75)moraleDelta+=2;
    else if(!working&&s.energy>=55)moraleDelta+=1;
    if(cleanliness>=82&&stressLevel<35)moraleDelta+=1;
    if((s.role==='nurse'||s.role==='cna')&&nurseStationRooms>0)moraleDelta+=(!working?2:1)*Math.min(2,nurseStationRooms);
    if(staffRoomCount>0)moraleDelta+=(!working?2:1)*Math.min(2,staffRoomCount);
    if(['nurse','cna','charge_nurse'].includes(s.role)&&getActiveGrantOffers().some(offer=>offer.effect?.kind==='nurse_support'))moraleDelta+=1;
    moraleDelta+=getGrantNightMoraleBonus(activeShift);
    if((s.issueImmunityDays??0)>0)moraleDelta=Math.max(0,moraleDelta);
    s.morale=clamp(s.morale+moraleDelta,0,100);
    const chargeBreakTarget=isChargeBreakRole(s.role)&&s.shift===activeShift;
    const deptHeadBreakTarget=isDeptHeadBreakRole(s.role)&&s.shift===activeShift;
    const chargeBreakThreshold=chargeBreakTarget&&chargeSupport.count>0?36:25;
    const deptHeadBreakThreshold=deptHeadBreakTarget&&deptHeadSupport.active?34:25;
    const breakRecoveryThreshold=
      chargeBreakTarget&&chargeSupport.count>0?50:
      deptHeadBreakTarget&&deptHeadSupport.active?48:
      55;
    if(chargeBreakTarget&&s.energy<chargeBreakThreshold&&s.state!=='on_break'){
      s.state='on_break';
      addLog(`${s.name} is taking a guided break with Charge Nurse support.`,'');
    }else if(deptHeadBreakTarget&&s.energy<deptHeadBreakThreshold&&s.state!=='on_break'){
      s.state='on_break';
      addLog(`${s.name} is taking a guided break with Dept. Head support.`,'');
    }else if(s.energy<25&&s.state!=='on_break'){
      s.state='on_break';
      addLog(`${s.name} is taking a break due to low energy.`,'w');
    }else if(s.state==='on_break'&&s.energy>=breakRecoveryThreshold){
      s.state='active';
    }
    s.active=s.state==='active';
    if((s.issueImmunityDays??0)>0)s.issueImmunityDays=Math.max(0,s.issueImmunityDays-1);
    if((s.returnBoostDays??0)>0)s.returnBoostDays=Math.max(0,s.returnBoostDays-1);
    if(s.role==='intern'&&s.shift===activeShift&&patients.length>0){
      s.level=Math.max(1,Math.round(s.level??1));
    }
    if(s.raiseCooldown>0)s.raiseCooldown--;
    if(s.quitRiskDays>0&&(s.issueImmunityDays??0)<=0){
      const quitChance=clamp(0.05+Math.max(0,45-(s.morale??100))*0.006+(stressLevel>=70?0.05:0)-getGrantQuitRiskRelief(),0.02,0.42);
      if(!s.raiseRequest&&Math.random()<quitChance)quittingStaffIds.push(s.id);
      s.quitRiskDays=Math.max(0,s.quitRiskDays-1);
    }else if(s.quitRiskDays>0){
      s.quitRiskDays=Math.max(0,s.quitRiskDays-1);
    }
    if(s.energy<25&&!s.burnoutLogged&&(s.issueImmunityDays??0)<=0){
      addLog(`${s.name} is burning out. Performance is dropping.`,'w');
      showToast('Staff tired','warn');
      s.burnoutLogged=true;
    } else if(s.energy>45&&s.burnoutLogged){
      s.burnoutLogged=false;
    }
  });
  recoverEnergy(activeShift);

  if(cleanliness<35)dirtyDays++;
  else if(cleanliness<55)dirtyDays++;
  else dirtyDays=0;

  const avgWait=patients.length?patients.reduce((sum,p)=>sum+p.waitTime,0)/patients.length:0;
  monthRepAccum+=reputation;
  monthCleanAccum+=cleanliness;
  monthWaitAccum+=avgWait;
  monthSamples++;
  if(avgWait>8)monthHighWaitDays++;
  if(money<0)monthDebtDays++;
  reviewDailyReputation();
  if(activeMedical===0&&rooms.length>0){
    adjustReputation(-4,'no active medical coverage','w');
  }
  checkProgression();
  if(reputation<40)lowRepDays++;
  else lowRepDays=0;

  if(stressLevel>90)highStressDays++;
  else highStressDays=0;

  if(money<0){
    debtDays++;
    debtFreeDays=0;
  }else{
    debtDays=0;
    debtFreeDays++;
  }
  if(hospitalStage==='medical'&&reputation>=80&&stressLevel<=60&&money>=0)winStabilityDays++;
  else winStabilityDays=0;

  if(cleanliness<40&&janitors.length===0&&day%2===0)addLog('The facility is getting dirty. Hire janitors before patients lose confidence.','w');
  if(waitOverflow>0&&day%2===0)addLog(`Waiting room overflow: ${waitOverflow} patients are queued beyond available seating. Build more waiting space.`, 'w');
  if((coverage.nurseShort>0||coverage.cnaShort>0)&&day%2===0)addLog(`Shift staffing gap: ${coverage.nurseShort}/${coverage.nurseNeeded} nurse shortage and ${coverage.cnaShort}/${coverage.cnaNeeded} CNA shortage on ${currentShiftLabel().toLowerCase()} shift.`,'w');
  if(stressLevel>=70&&day%2===0)addLog(`Hospital stress is high at ${stressLevel}. Long waits, dirty rooms, or staffing gaps are pushing the team toward fights and reputation loss.`,'w');
  checkSecurityEvents(stressLevel,activeShift);
  maybeTriggerStaffConflict(stressLevel,activeShift);
  maybeTriggerRaiseRequest();
  quittingStaffIds.forEach(id=>{
    const member=staff.find(s=>s.id===id);
    if(member)processStaffQuit(id,`${member.name} quit after feeling undervalued on the ${member.shift} shift.`);
  });
  if(debtDays===5)addLog('Budget crisis: the hospital has been in debt for 5 days. Turn it around soon.','b');
  if(lowRepDays===3)addLog('Reputation has stayed below 40 for several days. Public confidence is starting to collapse.','b');
  if(highStressDays===2)addLog('Hospital stress has stayed above 90 for multiple days. Stabilize operations before the hospital faces emergency closure.','b');
}

function endGame(reason){
  if(gameOver)return;
  gameOver=true;
  paused=true;
  loseReason=reason;
  renderEndScreen('Hospital Closed',reason,'loss');
  document.getElementById('gameover').classList.add('open');
  updateMenuBlurState();
  addLog(reason,'b');
  updateUI();
}
function winGame(reason){
  if(gameOver)return;
  gameOver=true;
  paused=true;
  loseReason=reason;
  renderEndScreen('Run Complete',reason,'win');
  document.getElementById('gameover').classList.add('open');
  updateMenuBlurState();
  addLog(reason,'g');
  showToast('Run complete','good');
  updateUI();
}

function resetGameState(showTitle=false){
  money=STARTING_CASH;day=1;score=0;totalTreated=0;researchPoints=0;monthlyInc=0;incAccum=0;reputation=70;cleanliness=78;stress=0;adReach=0;
  floorGrids=makeFloorGrids();
  floorSpecializations=makeFloorSpecializations();
  floorPanelHidden=true;
  floorPanelPosition=null;
  currentFloor=1;
  syncActiveGrid();
  rooms=[];patients=[];staff=[];logs=[];
  departments=makeDepartments();
  techTree=makeTechTree();
  selTool=null;buildRotation=0;gameTime=0;speed=1;paused=true;patId=0;staffId=0;zoom=1;zoomVisual=1;zoomTweenFrom=1;zoomTweenStart=null;selectedRoomId=null;
  hover={x:-1,y:-1};dragging=false;
  heatmapOn=false;
  eventStats={totalEvents:0,emergencies:0,staffIncidents:0,complaints:0};
  eventMemory={};
  isSandboxMode=false;
  customCenterName=DEFAULT_CENTER_NAME;
  hospitalStage='clinic';
  buildMode=true;
  staffPool=[];currentTab='clerical';
  debtDays=0;debtFreeDays=0;winStabilityDays=0;lowRepDays=0;dirtyDays=0;highStressDays=0;gameOver=false;loseReason='';runOutcome='';
  unlockedTools=new Set(STARTING_TOOLS);unlockedRoles=new Set(STARTING_ROLES);unlockedMilestones=new Set();
  hasStarted=!showTitle;
  gradeIndex=0;gradeNote='Monthly inspectors are fully satisfied';
  monthRepAccum=0;monthCleanAccum=0;monthWaitAccum=0;monthSamples=0;monthDebtDays=0;monthHighWaitDays=0;
  resetBudgetLedger(1);
  govTreated=0;totalPatients=0;totalPublicCareTreated=0;
  govContractVisualState='monitoring';
  grantOffers=[];
  contractOffer=null;activeContract=null;lastContractId=null;insuranceContracts=[];freeBuildCredits={gp:0};
  researchedTech=new Set();unlockedFeatures=new Set();activeResearch=null;
  dispatchJobs=[];dispatchJobId=0;
  resetDailyStats();
  makeDailyGoal();
  tickAcc=0;last=null;
  operationsPulseAcc=0;
  document.getElementById('log').innerHTML='';
  document.getElementById('hint').textContent='Draw corridors first. Then place rooms. Open "+ Staff" to hire â€” unstaffed rooms run at half speed.';
  document.getElementById('hint').textContent=showTitle?'Build a layout, hire staff, then press Start Game when you are ready.':'Run is paused. Build, hire the required roles, and press play when you want the hospital to open.';
  document.getElementById('staffmodal').classList.remove('open');
  document.getElementById('employeemodal')?.classList.remove('open');
  document.getElementById('tt').style.display='none';
  applyCustomCenterName();
  softGuideDismissed=false;
  updateSpeedButton();
  updatePauseButton();
  updateBuildModeButton();
  applyZoom();
  generatePool();
  makeContractOffer();
  setMenuVisibility(showTitle);
  if(typeof initializeEventMetadata==='function')initializeEventMetadata();
  addLog(showTitle?'Hospital ready. Press Start Game when you are ready to open the doors.':'Hospital founded. Draw corridors, build rooms, then hire staff!','g');
  updateUI();
  render();
}

function startGame(){
  resetGameState(false);
  createStarterHospital();
  addLog(`Public-private care requirement active: ${Math.round(govRequired*100)}% of patients must be treated at low or no profit.`,'w');
  updateUI();
}
function startSandboxMode(){
  resetGameState(false);
  isSandboxMode=true;
  hasStarted=true;
  gameOver=false;
  paused=true;

  money=999999;
  researchPoints=9999;

  Object.keys(RDEFS).forEach(tool=>unlockedTools.add(tool));
  unlockedTools.add('luxury_path');
  Object.keys(ROLES).forEach(role=>unlockedRoles.add(role));
  RESEARCH_TREE.forEach(tech=>researchedTech.add(tech.id));
  techTree.basicTriage.unlocked=true;
  techTree.fastTrack.unlocked=true;
  techTree.criticalResponse.unlocked=true;

  setMenuVisibility(false);
  updateMenuBlurState();
  updatePauseButton();
  updateUI();
  render();

  addLog('Sandbox Mode started. All rooms, roles, and research are unlocked.','g');
  showToast('Sandbox Mode enabled','good');
}
function restartGame(){resetGameState(false);}
function quitToTitle(){
  paused=true;
  updatePauseButton();
  setMenuVisibility(true);
}
function backToGame(){
  if(!hasStarted||gameOver)return;
  setMenuVisibility(false);
}

function checkLoseConditions(){
  if(isSandboxMode)return;
  if(debtDays>=5)return endGame('Budget crisis: the hospital stayed in debt for 5 consecutive days and had to close.');
  if(lowRepDays>=5)return endGame('Public trust collapsed after reputation stayed below 40 for 5 days.');
  if(highStressDays>=3)return endGame('Hospital stress stayed above 90 for 3 consecutive days. Operations broke down and the run ended.');
  if(winStabilityDays>=3){
    return winGame('Your hospital reached Medical Center status and held strong finances, reputation, and stress control long enough to complete the run.');
  }
}

function tick(dt){
  if(paused||gameOver)return;
  operationsPulseAcc+=dt;
  while(operationsPulseAcc>=OPERATIONS_PULSE_MS){
    operationsPulseAcc-=OPERATIONS_PULSE_MS;
    triggerOperationsPulse();
  }
  tickAcc+=dt*speed;
  while(tickAcc>=TICK_MS){
    tickAcc-=TICK_MS;gameTime++;
    if(gameTime%DAY_TICKS===0){
      resolveDailyGoal();
      day++;
      resetDailyStats();
      makeDailyGoal();
      progressResearch();
      updateDailyHospitalState();
      progressGrantProgramsDay();
      progressInsuranceContractDay();
      if(day%30===0){
        governmentReview();
        reviewHospitalGrade();
        const wages=wageBill();
        if(wages>0){changeMoney(-wages);addLog(`Monthly wages paid: -$${wages.toLocaleString()}`,'w');}
        staffPool=staffPool.filter(s=>!s.hired&&getUnlockedShifts().includes(s.shift));
        ensureStaffPoolCoverage();
        addLog('New staff available in the hiring pool.','');
        resetBudgetLedger(day);
      }
      checkLoseConditions();
      updateUI();
    }
    if(gameTime%PATIENT_SPAWN_TICKS===0&&Math.random()<clamp(0.3+(reputation/140),0.18,0.92))spawnPatient();
    if(gameTime%2===0)updatePatients();
    if(gameTime%INCOME_TICKS===0)flushIncome();
    if(gameTime%EVENT_TICKS===0)randomEvent();
  }
}

function setSpd(s){speed=s;paused=false;document.querySelectorAll('.sb').forEach((b,i)=>b.classList.toggle('on',[1,2,4][i]===s));document.getElementById('pbtn').textContent='⏸';}
function togglePause(){paused=!paused;document.getElementById('pbtn').textContent=paused?'▶':'⏸';}
function updateSpeedButton(){
  const btn=document.getElementById('spdbtn');
  if(!btn)return;
  btn.textContent='Speed '+speed+'x';
  btn.classList.add('on');
}
function updatePauseButton(){
  const btn=document.getElementById('pbtn');
  if(btn)btn.textContent=paused?'Play':'Pause';
}
function updateZoomControl(){
  const label=document.getElementById('zoomlabel');
  const pct=document.getElementById('zoompct');
  const context=document.getElementById('zoomcontext');
  const slider=document.getElementById('zoomslider');
  const percent=`${Math.round(zoomVisual*100)}%`;
  if(pct)pct.textContent=percent;
  else if(label)label.textContent=percent;
  if(context)context.textContent=getZoomContextLabel(zoom);
  if(slider)slider.value=String(Math.round(zoom*100));
}
function triggerZoomFeedback(){
  const label=document.getElementById('zoomlabel');
  const wrap=document.getElementById('cw');
  if(label){
    label.classList.remove('zoom-flash');
    void label.offsetWidth;
    label.classList.add('zoom-flash');
  }
  if(wrap){
    wrap.classList.remove('zoom-bump');
    void wrap.offsetWidth;
    wrap.classList.add('zoom-bump');
  }
  clearTimeout(zoomFeedbackTimer);
  zoomFeedbackTimer=setTimeout(()=>{
    if(label)label.classList.remove('zoom-flash');
    if(wrap)wrap.classList.remove('zoom-bump');
  },190);
}
function applyZoom(){
  zoomVisual=zoom;
  zoomTweenFrom=zoom;
  zoomTweenStart=null;
  cv.style.width=`${Math.round(cv.width*zoomVisual)}px`;
  cv.style.height=`${Math.round(cv.height*zoomVisual)}px`;
  updateZoomControl();
  render();
}
function easeOutCubic(t){return 1-Math.pow(1-t,3);}
function snapZoomLevel(nextZoom){
  return ZOOM_LEVELS.reduce((closest,level)=>
    Math.abs(level-nextZoom)<Math.abs(closest-nextZoom)?level:closest
  ,ZOOM_LEVELS[0]);
}
function getZoomContextLabel(level){
  const snapped=Math.round(level*100);
  if(snapped<=80)return 'Far';
  if(snapped<=100)return 'Default';
  if(snapped<=120)return 'Close';
  if(snapped<=140)return 'Closer';
  return 'Max';
}
function updateZoomTween(ts){
  if(Math.abs(zoomVisual-zoom)<0.0005)return false;
  if(zoomTweenStart===null)zoomTweenStart=ts;
  const progress=clamp((ts-zoomTweenStart)/ZOOM_TWEEN_MS,0,1);
  zoomVisual=zoomTweenFrom+(zoom-zoomTweenFrom)*easeOutCubic(progress);
  if(progress>=1){
    zoomVisual=zoom;
    zoomTweenStart=null;
  }
  cv.style.width=`${Math.round(cv.width*zoomVisual)}px`;
  cv.style.height=`${Math.round(cv.height*zoomVisual)}px`;
  updateZoomControl();
  return true;
}
function centerMapOnRoom(room){
  const wrap=document.getElementById('cw');
  if(!wrap||!room)return;
  if(getRoomFloor(room)!==currentFloor){
    currentFloor=getRoomFloor(room);
    syncActiveGrid();
    updateFloorControls();
  }
  const roomCenterX=(room.c+room.w/2)*T*zoomVisual;
  const roomCenterY=(room.r+room.h/2)*T*zoomVisual;
  const left=clamp(roomCenterX-wrap.clientWidth/2,0,Math.max(0,wrap.scrollWidth-wrap.clientWidth));
  const top=clamp(roomCenterY-wrap.clientHeight/2,0,Math.max(0,wrap.scrollHeight-wrap.clientHeight));
  wrap.scrollTo({left,top,behavior:'smooth'});
}
function focusEventRoom(room,center=true,durationMs=3200){
  if(!room)return;
  eventFocusRoomId=room.id;
  eventFocusUntil=currentAnimTime()+durationMs;
  if(center)centerMapOnRoom(room);
  render();
}
function setZoom(nextZoom){
  const next=snapZoomLevel(clamp(nextZoom,ZOOM_LEVELS[0],ZOOM_LEVELS[ZOOM_LEVELS.length-1]));
  if(Math.abs(next-zoom)<0.0005)return;
  zoomTweenFrom=zoomVisual;
  zoom=next;
  zoomTweenStart=null;
  triggerZoomFeedback();
  updateZoomControl();
}
function nudgeZoom(direction){
  const currentIndex=Math.max(0,ZOOM_LEVELS.findIndex(level=>Math.abs(level-zoom)<0.001));
  const nextIndex=clamp(currentIndex+direction,0,ZOOM_LEVELS.length-1);
  setZoom(ZOOM_LEVELS[nextIndex]);
}
function setZoomFromSlider(value){
  const snapped=snapZoomLevel(Number(value)/100);
  const slider=document.getElementById('zoomslider');
  if(slider)slider.value=String(Math.round(snapped*100));
  setZoom(snapped);
}
function showZoomRoomLabels(){return zoomVisual>=1;}
function showZoomRoomCounters(){return zoomVisual>=1.2;}
function showZoomRoomPeople(){return zoomVisual>=1.1;}
function setSpd(s){
  speed=s;
  paused=false;
  updateSpeedButton();
  updatePauseButton();
}
function cycleSpeed(){
  const order=[1,2,4];
  const next=order[(order.indexOf(speed)+1)%order.length];
  setSpd(next);
}
function togglePause(){
  paused=!paused;
  updatePauseButton();
}
function drawMiniPerson(x,y,shirt,scale=0.8,alpha=0.82){
  ctx.save();
  ctx.globalAlpha=alpha;
  const t=currentAnimTime()/420;
  const bob=Math.sin(t+((x+y)*0.04))*1.1;
  const sway=Math.sin(t*0.82+(x*0.06))*0.08;
  ctx.translate(x,y+bob);
  ctx.rotate(sway);
  ctx.scale(scale,scale);
  ctx.fillStyle='rgba(0,0,0,0.12)';
  ctx.beginPath();ctx.ellipse(0,11,5,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f3d6ba';
  ctx.beginPath();ctx.arc(0,0,4.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=shirt;
  ctx.fillRect(-4,4,8,9);
  ctx.strokeStyle='#5c6980';
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-2,13);ctx.lineTo(-3.5,18);ctx.moveTo(2,13);ctx.lineTo(3.5,18);ctx.stroke();
  ctx.restore();
}
function drawPatientBadge(x,y,patient){
  const label=getPatientTypeShortLabel(patient?.patientType);
  if(!label)return;
  ctx.save();
  const width=Math.max(16,label.length*5.5+6);
  ctx.fillStyle='rgba(255,255,255,0.92)';
  rrect(x-width/2,y-6,width,10,5);ctx.fill();
  ctx.fillStyle=getPatientTypeColor(patient);
  ctx.font='700 7px Trebuchet MS';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(label,x,y-1);
  ctx.restore();
}
function getRoomCenter(room){
  return{
    x:room.c*T+(room.w*T)/2,
    y:room.r*T+(room.h*T)/2
  };
}
function getWaitingRoomForPatient(){
  return rooms.find(r=>
    r.type==='waiting_room'&&
    getRoomFloor(r)===currentFloor&&
    isConn(r)
  )||null;
}
function getPatientExitRoom(patient){
  const entryRoom=rooms.find(r=>r.id===patient?.entryRoomId)||null;
  if(entryRoom&&roomHasVerticalAccess(entryRoom)&&isConn(entryRoom))return entryRoom;
  if(patient?.patientType==='critical'||patient?.patientType==='emergency'){
    return getOperationalEntrance('er_entrance')||getOperationalEntrance('front_entrance')||null;
  }
  return getOperationalEntrance('front_entrance')||getOperationalEntrance('staff_entrance')||null;
}
function updatePatientMovement(){
  for(const p of patients){
    let targetRoom=null;

    if(p.state==='leaving'){
      targetRoom=getPatientExitRoom(p);
    }else if(p.roomId){
      targetRoom=rooms.find(r=>r.id===p.roomId)||null;
    }else{
      targetRoom=rooms.find(r=>r.type==='waiting_room')||null;
    }

    if(!targetRoom){
      if(p.state==='leaving')p.exitReady=true;
      continue;
    }

    const targetTile=getRoomDoorTile(targetRoom);
    const targetFloor=getRoomFloor(targetRoom);

    if(p.vx==null||p.vy==null){
      const start=getTileCenter(targetTile.x,targetTile.y);
      p.vx=start.x;
      p.vy=start.y;
      p.path=[];
      p.pathIndex=0;
    }

    const currentTile={
      x:Math.floor(p.vx/T),
      y:Math.floor(p.vy/T)
    };

    const needsNewPath=
      !p.path||
      !p.path.length||
      p.pathTargetRoom!==targetRoom.id;

    if(needsNewPath){
      const path=findCorridorPath(currentTile,targetTile,targetFloor);
      p.path=path||[targetTile];
      p.pathIndex=0;
      p.pathTargetRoom=targetRoom.id;
    }

    const nextTile=p.path[p.pathIndex];
    if(!nextTile)continue;

    const nextPos=getTileCenter(nextTile.x,nextTile.y);
    const dx=nextPos.x-p.vx;
    const dy=nextPos.y-p.vy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const speed=p.state==='leaving'?1.45:(p.urg==='urgent'?1.8:1.2);

    if(dist<speed){
      p.vx=nextPos.x;
      p.vy=nextPos.y;
      p.pathIndex++;
      if(p.state==='leaving'&&p.pathIndex>=p.path.length){
        p.exitReady=true;
      }
    }else{
      p.vx+=(dx/dist)*speed;
      p.vy+=(dy/dist)*speed;
    }
  }
}
function getPatientVisualPosition(patient,index){
  const bob=Math.sin((currentAnimTime()/180)+index)*2;
  if(patient.roomId){
    const room=rooms.find(r=>r.id===patient.roomId);
    if(room&&getRoomFloor(room)===currentFloor){
      const pos={
        x:patient.vx??getRoomCenter(room).x,
        y:patient.vy??getRoomCenter(room).y
      };
      return{
        x:pos.x,
        y:pos.y+bob
      };
    }
  }
  const waiting=getWaitingRoomForPatient();
  if(waiting){
    const pos={
      x:patient.vx??getRoomCenter(waiting).x,
      y:patient.vy??getRoomCenter(waiting).y
    };
    return{
      x:pos.x,
      y:pos.y+18+bob
    };
  }
  return null;
}
function drawPatients(){
  patients
    .forEach((p,i)=>{
      if(p.vx==null||p.vy==null)return;

      const bob=Math.sin((animTime/150)+i)*2;

      const color=
        p.urg==='urgent'?'#e26363':
        p.urg==='moderate'?'#de9a42':
        '#5e9bc7';
      drawMiniPerson(p.vx,p.vy+bob,color,0.8,p.state==='leaving'?0.58:0.82);
      if(showZoomRoomCounters()&&p.state!=='leaving')drawPatientBadge(p.vx,p.vy-8+bob,p);
    });
}
function getRoleVisualColor(role){
  const map={
    gp_doc:'#2f8aa0',
    er_doc:'#d86262',
    er_attending:'#c67b48',
    dept_attending:'#7c69c8',
    surgeon:'#b7804a',
    nurse:'#2a8c9d',
    charge_nurse:'#2f7790',
    cna:'#5f78b8',
    clerical:'#62a15b',
    pharmacist:'#b08a2d',
    janitor:'#6f9168',
    researcher:'#6b72c9',
    security_officer:'#647487',
    it_specialist:'#4e86ba',
    hr_manager:'#c07c9b',
    marketing_manager:'#d2768b',
    dispatcher:'#5f88b5',
    driver:'#7a9960',
    intern:'#7db457',
    medical_director:'#6c60d7'
  };
  return map[role]||'#2a8c9d';
}
function drawStaffRoleAccent(member,x,y,index){
  const role=member?.role||'';
  const t=currentAnimTime()/420+index*0.4;
  ctx.save();
  if(role==='gp_doc'||role==='nurse'||role==='charge_nurse'||role==='cna'||role==='er_doc'||role==='er_attending'||role==='surgeon'){
    ctx.strokeStyle='rgba(255,255,255,0.74)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(x+4,y+2,3.8,Math.PI*0.1,Math.PI*0.9);
    ctx.stroke();
  }else if(role==='researcher'){
    ctx.fillStyle='rgba(182,201,255,0.7)';
    ctx.fillRect(x-3,y+4,6,5);
  }else if(role==='clerical'||role==='hr_manager'){
    ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.fillRect(x-3,y+4,6,5);
  }else if(role==='janitor'){
    ctx.strokeStyle='rgba(255,244,188,0.72)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(x+3,y+3);
    ctx.lineTo(x+6,y+8+Math.sin(t)*0.8);
    ctx.stroke();
  }else if(role==='security_officer'){
    ctx.fillStyle='rgba(246,222,124,0.72)';
    ctx.beginPath();
    ctx.arc(x+4,y+4,2.4,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}
function drawStaffInRooms(){
  rooms.forEach(rm=>{
    if(getRoomFloor(rm)!==currentFloor)return;

    const staffList=getRoomStaffMembers(rm);
    if(!staffList.length)return;

    const center=getRoomCenter(rm);

    staffList.forEach((s,i)=>{
      const offsetX=(i%2)*10-5;
      const offsetY=Math.floor(i/2)*10;
      const pulse=Math.sin((animTime/200)+i)*1.5;

      const px=center.x+offsetX;
      const py=center.y+offsetY+pulse;
      drawMiniPerson(px,py,getRoleVisualColor(s.role),0.76,s.state==='on_break'?0.58:0.8);
      drawStaffRoleAccent(s,px,py,i);
    });
  });
}
function getRoomActivityLevel(rm){
  const treatingCount=patients.filter(p=>p.roomId===rm.id&&p.state==='treating').length;
  const waitingForRoom=patients.filter(p=>p.state==='waiting'&&p.needs?.[p.step]===rm.type).length;
  return treatingCount>0?Math.min(1,0.55+treatingCount*0.12):waitingForRoom>0?Math.min(0.42,waitingForRoom*0.08):0;
}
function drawTree(x,y,s){
  const sway=Math.sin(currentAnimTime()/1200+(x*0.01))*2.2*s;
  ctx.fillStyle='rgba(70,106,65,0.16)';
  ctx.beginPath();ctx.ellipse(x,y+11*s,12*s,5*s,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7d9e57';ctx.fillRect(x-2*s,y+1*s,4*s,14*s);
  ctx.fillStyle='#7fc06b';
  ctx.beginPath();ctx.arc(x+sway*0.2,y,12*s,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x-8*s+sway,y+4*s,8*s,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+8*s+sway,y+4*s,8*s,0,Math.PI*2);ctx.fill();
}
function drawGardenPatch(x,y,w,h,alpha=0.7){
  const grad=ctx.createLinearGradient(x,y,x,y+h);
  grad.addColorStop(0,`rgba(132,195,108,${0.2*alpha})`);
  grad.addColorStop(1,`rgba(93,156,80,${0.34*alpha})`);
  ctx.fillStyle=grad;
  rrect(x,y,w,h,14);ctx.fill();
  ctx.strokeStyle=`rgba(255,255,255,${0.22*alpha})`;
  ctx.lineWidth=1;
  rrect(x+0.5,y+0.5,w-1,h-1,14);ctx.stroke();
  ctx.fillStyle=`rgba(255,255,255,${0.16*alpha})`;
  for(let i=0;i<5;i++){
    const px=x+10+i*((w-20)/4);
    const py=y+10+((i%2)*10);
    ctx.beginPath();ctx.arc(px,py,2.2,0,Math.PI*2);ctx.fill();
  }
}
function drawAmbientCloud(cx,cy,scale=1,alpha=0.18){
  const drift=Math.sin(currentAnimTime()/5000+cx*0.003)*10*scale;
  ctx.save();
  ctx.translate(drift,Math.sin(currentAnimTime()/4200+cy*0.01)*2*scale);
  ctx.fillStyle=`rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx,cy,26*scale,14*scale,0,0,Math.PI*2);
  ctx.ellipse(cx-18*scale,cy+3*scale,18*scale,11*scale,0,0,Math.PI*2);
  ctx.ellipse(cx+18*scale,cy+2*scale,20*scale,12*scale,0,0,Math.PI*2);
  ctx.ellipse(cx+2*scale,cy-6*scale,16*scale,10*scale,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function drawAmbientParticles(){
  const base=currentAnimTime()/2200;
  for(let i=0;i<12;i++){
    const loop=(base+i*0.37)%1;
    const x=76+((i*91)+(loop*24))%(cv.width-152);
    const y=74+((i*53)+Math.sin(base*2.2+i)*18)%(cv.height-170);
    const r=1.2+(Math.sin(base*3.4+i)*0.35+0.35);
    ctx.fillStyle=`rgba(255,255,255,${0.08+((Math.sin(base*4+i)+1)/2)*0.08})`;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }
}
function drawWaterShimmer(cx,cy,rx,ry){
  const t=currentAnimTime()/900;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  ctx.clip();
  for(let i=0;i<4;i++){
    const y=cy-ry*0.45+i*(ry*0.34)+Math.sin(t+i*0.8)*2.2;
    const wave=ctx.createLinearGradient(cx-rx,y,cx+rx,y);
    wave.addColorStop(0,'rgba(255,255,255,0)');
    wave.addColorStop(0.18,'rgba(255,255,255,0.14)');
    wave.addColorStop(0.5,'rgba(255,255,255,0.26)');
    wave.addColorStop(0.82,'rgba(255,255,255,0.12)');
    wave.addColorStop(1,'rgba(255,255,255,0)');
    ctx.strokeStyle=wave;
    ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(cx-rx+10,y);
    for(let step=0;step<=8;step++){
      const px=cx-rx+10+step*((rx*2-20)/8);
      const py=y+Math.sin(t*1.6+step*0.9+i)*1.8;
      ctx.lineTo(px,py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function drawCampusPath(points,width,fill,edge){
  if(points.length<2)return;
  ctx.save();
  ctx.strokeStyle=fill;
  ctx.lineWidth=width;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.stroke();
  ctx.strokeStyle=edge;
  ctx.lineWidth=Math.max(1,width*0.14);
  ctx.stroke();
  ctx.restore();
}
function drawAmbientAmbulance(x,y,scale=1,direction=1){
  ctx.save();
  ctx.translate(x,y);
  if(direction<0)ctx.scale(-1,1);

  ctx.fillStyle='rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0,18*scale,22*scale,6*scale,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle='#f4f8fb';
  rrect(-22*scale,-8*scale,44*scale,20*scale,6*scale);
  ctx.fill();

  ctx.fillStyle='#d74949';
  ctx.fillRect(-8*scale,-8*scale,16*scale,20*scale);
  ctx.fillStyle='#ffffff';
  ctx.fillRect(-3*scale,-6*scale,6*scale,16*scale);
  ctx.fillRect(-8*scale,-1*scale,16*scale,6*scale);

  ctx.fillStyle='#bfe1f7';
  rrect(6*scale,-5*scale,12*scale,8*scale,2*scale);
  ctx.fill();
  rrect(-18*scale,-2*scale,7*scale,6*scale,2*scale);
  ctx.fill();

  const flash=((Math.sin(currentAnimTime()/180)+1)/2);
  ctx.fillStyle=`rgba(73,145,255,${0.24+flash*0.42})`;
  rrect(-5*scale,-12*scale,10*scale,4*scale,2*scale);
  ctx.fill();

  ctx.fillStyle='#3f4851';
  ctx.beginPath();ctx.arc(-13*scale,12*scale,4*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(13*scale,12*scale,4*scale,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#97a2ad';
  ctx.beginPath();ctx.arc(-13*scale,12*scale,1.6*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(13*scale,12*scale,1.6*scale,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawAmbientLotCar(x,y,scale=1,color='#4f88c4',rotation=0){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rotation);

  ctx.fillStyle='rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0,12*scale,11*scale,4*scale,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle=color;
  rrect(-9*scale,-12*scale,18*scale,24*scale,4*scale);
  ctx.fill();

  ctx.fillStyle='rgba(255,255,255,0.78)';
  rrect(-6*scale,-9*scale,12*scale,5*scale,2*scale);
  ctx.fill();
  rrect(-6*scale,1*scale,12*scale,5*scale,2*scale);
  ctx.fill();

  ctx.fillStyle='rgba(255,240,180,0.62)';
  ctx.fillRect(-7*scale,-13*scale,14*scale,2*scale);
  ctx.fillStyle='rgba(255,120,120,0.58)';
  ctx.fillRect(-7*scale,11*scale,14*scale,2*scale);

  ctx.fillStyle='#3f4851';
  ctx.beginPath();ctx.arc(-6*scale,-8*scale,2*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(6*scale,-8*scale,2*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(-6*scale,8*scale,2*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(6*scale,8*scale,2*scale,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawAmbientAmbulanceTraffic(){
  const cycle=32000;
  const t=currentAnimTime()%cycle;
  const laneY=cv.height-103;
  if(t<4500){
    const p=t/4500;
    const x=-56+p*184;
    drawAmbientAmbulance(x,laneY,0.86,1);
    return;
  }
  if(t<16200){
    const idlePulse=Math.sin(currentAnimTime()/520)*1.5;
    drawAmbientAmbulance(128+idlePulse,laneY,0.86,1);
    return;
  }
  if(t<21400){
    const p=(t-16200)/5200;
    const x=128+p*(cv.width+90);
    drawAmbientAmbulance(x,laneY,0.86,1);
    return;
  }
}
function drawAmbientParkingTraffic(){
  const carColors=['#c44f4f','#4f88c4','#d5b44d','#6ea26e','#8b75c9','#d98f59'];
  const slots=[
    {parkX:29,parkY:82,entryX:-36,entryY:82,exitX:-44,exitY:82,rotation:Math.PI/2,scale:0.84,offset:0,cycle:26000,color:carColors[0]},
    {parkX:29,parkY:206,entryX:-34,entryY:206,exitX:-42,exitY:206,rotation:Math.PI/2,scale:0.84,offset:5300,cycle:30000,color:carColors[1]},
    {parkX:29,parkY:330,entryX:-35,entryY:330,exitX:-44,exitY:330,rotation:Math.PI/2,scale:0.84,offset:11100,cycle:28000,color:carColors[2]},
    {parkX:cv.width-29,parkY:118,entryX:cv.width+36,entryY:118,exitX:cv.width+44,exitY:118,rotation:Math.PI/2,scale:0.84,offset:3400,cycle:29000,color:carColors[3]},
    {parkX:cv.width-29,parkY:248,entryX:cv.width+36,entryY:248,exitX:cv.width+46,exitY:248,rotation:Math.PI/2,scale:0.84,offset:9100,cycle:31000,color:carColors[4]},
    {parkX:cv.width-190,parkY:cv.height-129,entryX:cv.width-190,entryY:cv.height+28,exitX:cv.width-190,exitY:cv.height+34,rotation:0,scale:0.9,offset:1700,cycle:27000,color:carColors[5]},
    {parkX:cv.width-122,parkY:cv.height-129,entryX:cv.width-122,entryY:cv.height+28,exitX:cv.width-122,exitY:cv.height+34,rotation:0,scale:0.9,offset:7900,cycle:34000,color:carColors[1]}
  ];
  slots.forEach(slot=>{
    const t=(currentAnimTime()+slot.offset)%slot.cycle;
    const arrive=4200;
    const parked=9800;
    const leave=4200;
    const idlePulse=Math.sin((currentAnimTime()+slot.offset)/640)*0.6;
    let x=slot.parkX;
    let y=slot.parkY;
    if(t<arrive){
      const p=t/arrive;
      x=slot.entryX+(slot.parkX-slot.entryX)*p;
      y=slot.entryY+(slot.parkY-slot.entryY)*p;
    }else if(t<arrive+parked){
      x=slot.parkX;
      y=slot.parkY+idlePulse;
    }else if(t<arrive+parked+leave){
      const p=(t-arrive-parked)/leave;
      x=slot.parkX+(slot.exitX-slot.parkX)*p;
      y=slot.parkY+(slot.exitY-slot.parkY)*p;
    }else{
      return;
    }
    drawAmbientLotCar(x,y,slot.scale,slot.color,slot.rotation);
  });
}
function drawAmbientCampusLife(){
  const walkers=[
    {x:152,y:468,shirt:'#6aa3d8',speed:0.7,loop:86},
    {x:204,y:488,shirt:'#7bb76d',speed:0.62,loop:92},
    {x:744,y:468,shirt:'#d89d6a',speed:0.78,loop:88}
  ];
  walkers.forEach((walker,idx)=>{
    const progress=((currentAnimTime()/1000)*walker.speed+idx*0.28)%1;
    const px=walker.x+progress*walker.loop;
    const py=walker.y+Math.sin(progress*Math.PI*2+idx)*3;
    drawMiniPerson(px,py,walker.shirt,0.62,0.4);
  });
  drawAmbientParkingTraffic();
  drawAmbientAmbulanceTraffic();
}
function drawRealRoomDetails(rm,d,rx,ry,rw,rh){
  ctx.save();
  const pulse=Math.sin(animTime/300)*0.5;
  ctx.globalAlpha=0.9+pulse;
  const floorStyle=getFloorStyle(getRoomFloor(rm));

  ctx.fillStyle=floorStyle.bg;
  rrect(rx+8,ry+18,rw-16,rh-26,10);
  ctx.fill();

  ctx.globalAlpha=0.05;
  for(let i=0;i<rw;i+=8){
    ctx.fillRect(rx+i,ry,1,rh);
  }
  ctx.globalAlpha=1;

  ctx.fillStyle='rgba(255,255,255,.45)';
  rrect(rx+6,ry+6,rw-12,16,8);
  ctx.fill();

  ctx.fillStyle='#8b6d5a';
  ctx.fillRect(rx+8,ry+rh-16,18,10);
  ctx.fillStyle='#d9c2a6';
  ctx.fillRect(rx+10,ry+rh-14,4,6);

  ctx.fillStyle='rgba(180,230,255,.85)';
  for(let i=0;i<Math.min(3,Math.floor(rw/32));i++){
    const wx=rx+rw-18-(i*18),wy=ry+8;
    ctx.fillRect(wx,wy,12,8);
    ctx.strokeStyle='rgba(255,255,255,.6)';
    ctx.strokeRect(wx,wy,12,8);
  }

  if(rm.type==='waiting_room'){
    ctx.fillStyle='rgba(255,255,255,.75)';
    for(let i=0;i<3;i++){
      ctx.fillRect(rx+18+i*18,ry+rh-26,10,6);
      ctx.fillRect(rx+18+i*18,ry+rh-20,10,4);
    }
  }

  if(rm.type==='gp'||rm.type==='vip_room'){
    ctx.fillStyle='#ffffff';
    ctx.fillRect(rx+rw/2-16,ry+rh/2-6,32,12);
    ctx.fillStyle='#6c8fb5';
    ctx.fillRect(rx+rw/2-6,ry+rh/2-10,12,4);
    const blink=((Math.sin(currentAnimTime()/520)+1)/2);
    ctx.fillStyle=`rgba(132,228,178,${0.25+blink*0.45})`;
    ctx.fillRect(rx+rw/2+9,ry+rh/2-9,5,3);
  }

  if(rm.type==='er'||rm.type==='surgery'){
    ctx.fillStyle='rgba(255,255,255,.9)';
    rrect(rx+rw/2-22,ry+rh/2-10,44,20,8);
    ctx.fill();
    ctx.fillStyle='#e35b5b';
    ctx.fillRect(rx+rw/2-2,ry+rh/2-12,4,24);
    ctx.fillRect(rx+rw/2-12,ry+rh/2-2,24,4);
    const alert=((Math.sin(currentAnimTime()/180)+1)/2);
    ctx.fillStyle=`rgba(255,105,105,${0.18+alert*0.42})`;
    ctx.beginPath();
    ctx.arc(rx+rw-16,ry+16,5.5+alert*1.4,0,Math.PI*2);
    ctx.fill();
  }

  if(rm.type==='pharmacy'){
    ctx.fillStyle='rgba(255,255,255,.65)';
    for(let i=0;i<3;i++){
      ctx.fillRect(rx+16+i*22,ry+30,14,rh-42);
      const glow=((Math.sin(currentAnimTime()/620+i*0.8)+1)/2);
      ctx.fillStyle=`rgba(255,230,173,${0.08+glow*0.12})`;
      ctx.fillRect(rx+17+i*22,ry+31,12,rh-44);
      ctx.fillStyle='rgba(255,255,255,.65)';
    }
  }

  if(rm.type==='xray'||rm.type==='lab'){
    ctx.fillStyle='rgba(255,255,255,.7)';
    rrect(rx+18,ry+32,rw-36,16,6);
    ctx.fill();
    ctx.fillStyle='rgba(90,110,160,.55)';
    ctx.fillRect(rx+24,ry+37,rw-48,5);
  }

  if(rm.type==='ward'||rm.type==='single_hospital_room'||rm.type==='double_hospital_room'){
    ctx.fillStyle='#ffffff';
    for(let i=0;i<Math.min(2,Math.floor(rw/42));i++){
      const bx=rx+16+i*32;
      ctx.fillRect(bx,ry+rh/2-6,28,12);
      ctx.fillStyle='#9bd3e0';
      ctx.fillRect(bx+2,ry+rh/2-4,10,8);
      const pulse=((Math.sin(currentAnimTime()/320+i*0.6)+1)/2);
      ctx.fillStyle=`rgba(126,235,175,${0.22+pulse*0.28})`;
      ctx.fillRect(bx+17,ry+rh/2-4,7,3);
      ctx.fillStyle='#ffffff';
    }
  }

  if(rm.type==='bathroom'){
    ctx.fillStyle='rgba(255,255,255,.8)';
    ctx.fillRect(rx+rw/2-8,ry+rh/2-10,16,20);
  }

  ctx.fillStyle='rgba(0,0,0,.05)';
  ctx.fillRect(rx,ry+rh-10,rw,10);

  ctx.restore();
}
function drawRoomDecor(rm,d){
  const x=rm.c*T+4,y=rm.r*T+4,w=rm.w*T-8,h=rm.h*T-8;
  ctx.save();
  ctx.strokeStyle='rgba(60,86,106,0.16)';
  ctx.fillStyle='rgba(255,255,255,0.42)';
  const addBed=(bx,by,bw,bh)=>{
    ctx.fillStyle='rgba(255,255,255,0.84)';ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='rgba(141,194,213,0.95)';ctx.fillRect(bx+3,by+3,bw-8,bh-6);
    ctx.fillStyle='rgba(232,240,247,0.96)';ctx.fillRect(bx+bw-8,by+2,6,6);
    ctx.strokeRect(bx,by,bw,bh);
  };
  const addDesk=(bx,by,bw,bh,c)=>{
    ctx.fillStyle=c;ctx.fillRect(bx,by,bw,bh);ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillRect(bx+3,by+3,Math.max(5,bw-10),Math.max(4,bh-6));
  };
  const realDetailTypes=new Set(['waiting_room','gp','vip_room','er','surgery','pharmacy','xray','lab','ward','single_hospital_room','double_hospital_room','bathroom']);
  if(realDetailTypes.has(rm.type)){
    drawRealRoomDetails(rm,d,x,y,w,h);
    if(rm.type==='waiting_room'){
      const waitVisual=getWaitingRoomVisualState();
      const pulseTime=currentAnimTime()/280;
      const dotCount=Math.min(3,Math.max(0,waitingPatientsCount()));
      for(let i=0;i<dotCount;i++){
        const px=x+w-18-i*12;
        const bob=((Math.sin(pulseTime+i*0.9)+1)/2)*1.2;
        const py=y+h-14-bob;
        const warmBoost=waitVisual.ratio>=1?0.12:waitVisual.ratio>=0.65?0.06:0;
        const pulse=0.92+(((Math.sin(pulseTime+i*0.8)+1)/2)*(0.22+warmBoost));
        ctx.fillStyle=waitVisual.dot;
        ctx.beginPath();
        ctx.arc(px,py,3.4*pulse,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
    switch(rm.type){
      case 'front_entrance':
        ctx.fillStyle='rgba(255,255,255,0.55)';
        ctx.fillRect(x+6,y+7,w-12,h-14);
        ctx.fillStyle='#f8fdff';
        ctx.fillRect(x+8,y+9,w-16,h-18);
        ctx.fillStyle='#c9e8f8';
        ctx.fillRect(x+11,y+11,w-22,h-20);
        ctx.fillStyle='rgba(255,255,255,0.68)';
        ctx.fillRect(x+13,y+13,w-26,4);
        ctx.fillStyle='#7aa8c9';
        ctx.fillRect(x+w/2-2,y+12,4,h-22);
        ctx.fillStyle='#e5f7ff';
        ctx.fillRect(x+w/2-12,y+14,10,h-16);
        ctx.fillRect(x+w/2+2,y+14,10,h-16);
        ctx.strokeStyle='rgba(101,148,183,0.55)';
        ctx.lineWidth=1;
        ctx.strokeRect(x+w/2-12.5,y+14.5,10,Math.max(8,h-17));
        ctx.strokeRect(x+w/2+1.5,y+14.5,10,Math.max(8,h-17));
        ctx.fillStyle='#ffffff';
        ctx.fillRect(x+10,y+h-8,w-20,3);
        break;
      case 'staff_entrance':
        ctx.fillStyle='rgba(238,245,255,0.92)';
        ctx.fillRect(x+10,y+10,w-20,h-20);
        ctx.fillStyle='#b7c8e3';
        ctx.fillRect(x+12,y+12,w-24,5);
        ctx.fillStyle='#dde7f4';
        ctx.fillRect(x+w/2-7,y+14,14,h-24);
        ctx.fillStyle='#6d86ad';
        ctx.fillRect(x+w/2-2,y+14,4,h-24);
        ctx.fillStyle='#8ba0be';
        ctx.fillRect(x+8,y+h-14,w-16,4);
        break;
      case 'er_entrance':
        ctx.fillStyle='#eef2f5';
        ctx.fillRect(x+6,y+8,w-12,h-16);
        ctx.fillStyle='#c5ced7';
        ctx.fillRect(x+8,y+10,w-16,h-20);
        ctx.fillStyle='#d94b4b';
        ctx.fillRect(x+10,y+h-16,w-20,8);
        ctx.fillStyle='#fff7f7';
        ctx.fillRect(x+12,y+h-13,w-24,2);
        ctx.fillStyle='#f4fbff';
        ctx.fillRect(x+w/2-11,y+12,22,h-16);
        ctx.fillStyle='#d46767';
        ctx.fillRect(x+w/2-2,y+12,4,h-16);
        ctx.fillStyle='#ffffff';
        ctx.fillRect(x+w/2-7,y+h/2-2,14,4);
        ctx.fillRect(x+w/2-2,y+h/2-7,4,14);
        ctx.strokeStyle='rgba(255,255,255,0.8)';
        ctx.lineWidth=1.2;
        ctx.beginPath();
        ctx.moveTo(x+12,y+h-22);
        ctx.lineTo(x+20,y+h-16);
        ctx.lineTo(x+28,y+h-22);
        ctx.stroke();
        break;
      case 'waiting_room':
        const waitVisual=getWaitingRoomVisualState();
        for(let row=0;row<2;row++)for(let col=0;col<3;col++){
        const cx=x+18+col*24,cy=y+16+row*22;
        ctx.fillStyle=waitVisual.seat;ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#f0e7d8';ctx.fillRect(cx-7,cy+8,14,4);
      }
      {
        const pulseTime=currentAnimTime()/280;
        const dotCount=Math.min(3,Math.max(0,waitingPatientsCount()));
        for(let i=0;i<dotCount;i++){
          const px=x+w-18-i*12;
          const bob=((Math.sin(pulseTime+i*0.9)+1)/2)*1.2;
          const py=y+h-14-bob;
          const warmBoost=waitVisual.ratio>=1?0.12:waitVisual.ratio>=0.65?0.06:0;
          const pulse=0.92+(((Math.sin(pulseTime+i*0.8)+1)/2)*(0.22+warmBoost));
          ctx.fillStyle=waitVisual.dot;
          ctx.beginPath();
          ctx.arc(px,py,3.4*pulse,0,Math.PI*2);
          ctx.fill();
        }
      }
      break;
    case 'nurse_station':
      addDesk(x+8,y+h-18,w-16,10,'#c8edf1');
      ctx.fillStyle='#7dc9d4';ctx.fillRect(x+12,y+10,12,12);
      ctx.fillStyle='#ffffff';ctx.fillRect(x+16,y+12,4,8);ctx.fillRect(x+14,y+14,8,4);
      break;
    case 'staff_room':
      ctx.fillStyle='#e9def8';ctx.fillRect(x+10,y+12,20,12);
      ctx.fillStyle='#d4bdf4';ctx.fillRect(x+34,y+12,18,12);
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x+w-16,y+16,7,0,Math.PI*2);ctx.fill();
      break;
    case 'lunch_room':
      ctx.fillStyle='#f2c468';ctx.beginPath();ctx.arc(x+w/2,y+18,10,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff5da';ctx.beginPath();ctx.arc(x+w/2,y+18,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d79b3c';ctx.fillRect(x+12,y+h-18,w-24,8);
      break;
    case 'bathroom':
      ctx.fillStyle='#78b8d1';ctx.fillRect(x+9,y+8,w-18,h-16);
      ctx.fillStyle='#ffffff';ctx.fillRect(x+w/2-4,y+12,8,h-24);
      ctx.fillStyle='#d9f3fb';ctx.fillRect(x+11,y+h-16,w-22,6);
      break;
    case 'janitor_closet':
      ctx.fillStyle='#8fc980';ctx.fillRect(x+12,y+10,8,h-18);
      ctx.fillStyle='#f8f3d0';ctx.fillRect(x+20,y+12,14,4);
      ctx.fillStyle='#7ab0d1';ctx.fillRect(x+w-26,y+10,12,18);
      ctx.fillStyle='#ffffff';ctx.fillRect(x+w-24,y+12,8,6);
      break;
    case 'hvac_generator':
      ctx.fillStyle='#7ca28b';ctx.fillRect(x+10,y+10,w-20,h-20);
      ctx.fillStyle='#dff0e5';ctx.beginPath();ctx.arc(x+18,y+18,6,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#4e6f5a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x+18,y+12);ctx.lineTo(x+18,y+24);ctx.moveTo(x+12,y+18);ctx.lineTo(x+24,y+18);ctx.stroke();
      ctx.fillStyle='#4e6f5a';ctx.fillRect(x+w-28,y+12,16,18);
      ctx.fillStyle='#edf8ff';ctx.fillRect(x+w-25,y+15,10,8);
      ctx.fillStyle='#ffd36b';ctx.fillRect(x+w-22,y+25,4,3);
      break;
    case 'vending_machine':
      ctx.fillStyle='#d9883b';ctx.fillRect(x+10,y+8,w-20,h-16);
      ctx.fillStyle='#fff0d8';ctx.fillRect(x+13,y+11,w-26,10);
      ctx.fillStyle='#6a3a1a';ctx.fillRect(x+w/2-3,y+h-15,6,6);
      break;
    case 'drink_station':
      ctx.fillStyle='#76acd8';ctx.fillRect(x+10,y+8,w-20,h-16);
      ctx.fillStyle='#dff3ff';ctx.beginPath();ctx.arc(x+w/2,y+15,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffffff';ctx.fillRect(x+w/2-5,y+22,10,8);
      break;
    case 'atm_kiosk':
      ctx.fillStyle='#7ab082';ctx.fillRect(x+10,y+8,w-20,h-16);
      ctx.fillStyle='#e7f8ea';ctx.fillRect(x+13,y+11,w-26,8);
      ctx.fillStyle='#2f6e3b';ctx.fillRect(x+w/2-7,y+22,14,5);
      break;
    case 'security_office':
      addDesk(x+10,y+h-18,w-20,10,'#d2dae4');
      ctx.fillStyle='#5f7084';ctx.fillRect(x+w/2-10,y+10,20,16);
      ctx.fillStyle='#eef4f8';ctx.fillRect(x+w/2-3,y+12,6,12);ctx.fillRect(x+w/2-7,y+16,14,4);
      break;
    case 'it_department':
      addDesk(x+10,y+h-18,w-20,10,'#d5e7f8');
      ctx.fillStyle='#5a86b4';ctx.fillRect(x+12,y+10,16,12);
      ctx.fillStyle='#eef7ff';ctx.fillRect(x+14,y+12,12,8);
      ctx.fillStyle='#5a86b4';ctx.fillRect(x+w-28,y+10,16,12);
      ctx.fillStyle='#eef7ff';ctx.fillRect(x+w-26,y+12,12,8);
      ctx.fillStyle='#4d6f93';ctx.fillRect(x+w/2-8,y+30,16,6);
      break;
    case 'staircase':
      ctx.fillStyle='#bfa98a';
      for(let step=0;step<5;step++)ctx.fillRect(x+10+step*7,y+h-14-step*5,18,4);
      ctx.strokeStyle='#7b6a55';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x+12,y+h-10);ctx.lineTo(x+12,y+10);ctx.lineTo(x+w-12,y+10);ctx.stroke();
      break;
    case 'elevator':
      ctx.fillStyle='#8ea2b3';ctx.fillRect(x+10,y+8,w-20,h-16);
      ctx.fillStyle='#dfeaf2';ctx.fillRect(x+13,y+10,w-26,h-20);
      ctx.fillStyle='#9aaebf';ctx.fillRect(x+w/2-1,y+10,2,h-20);
      ctx.fillStyle='#eef7ff';ctx.fillRect(x+w/2-6,y+h-14,12,4);
      break;
    case 'gp':
      addBed(x+8,y+10,w-22,16);
      addDesk(x+w-28,y+h-20,18,10,'#d9c1a0');
      break;
    case 'vip_room':
      addBed(x+10,y+10,w-24,18);
      addDesk(x+w-30,y+h-20,20,10,'#f3d6a7');
      ctx.fillStyle='#d6a13f';
      ctx.beginPath();
      ctx.moveTo(x+w/2,y+10);
      ctx.lineTo(x+w/2+5,y+20);
      ctx.lineTo(x+w/2+16,y+20);
      ctx.lineTo(x+w/2+7,y+27);
      ctx.lineTo(x+w/2+11,y+38);
      ctx.lineTo(x+w/2,y+31);
      ctx.lineTo(x+w/2-11,y+38);
      ctx.lineTo(x+w/2-7,y+27);
      ctx.lineTo(x+w/2-16,y+20);
      ctx.lineTo(x+w/2-5,y+20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='rgba(255,248,214,0.95)';
      ctx.lineWidth=1.5;
      const sparkle=(sx,sy,size)=>{
        ctx.beginPath();
        ctx.moveTo(sx,sy-size);
        ctx.lineTo(sx,sy+size);
        ctx.moveTo(sx-size,sy);
        ctx.lineTo(sx+size,sy);
        ctx.moveTo(sx-size*0.7,sy-size*0.7);
        ctx.lineTo(sx+size*0.7,sy+size*0.7);
        ctx.moveTo(sx-size*0.7,sy+size*0.7);
        ctx.lineTo(sx+size*0.7,sy-size*0.7);
        ctx.stroke();
      };
      sparkle(x+18,y+18,4);
      sparkle(x+w-24,y+16,3.2);
      sparkle(x+w-16,y+h-28,2.8);
      break;
    case 'er':
      addBed(x+10,y+10,28,14);addBed(x+w-38,y+10,28,14);
      ctx.fillStyle='#d45d5d';ctx.fillRect(x+w/2-7,y+h-18,14,14);
      break;
    case 'ward':
      addBed(x+8,y+10,28,14);addBed(x+w-36,y+10,28,14);addBed(x+w/2-14,y+h-22,28,14);
      break;
    case 'single_hospital_room':
      addBed(x+10,y+10,w-22,16);
      ctx.fillStyle='#8bb8c5';ctx.fillRect(x+w-26,y+h-18,16,8);
      break;
    case 'double_hospital_room':
      addBed(x+8,y+10,28,14);addBed(x+w-36,y+10,28,14);
      ctx.fillStyle='#8bb8c5';ctx.fillRect(x+w/2-10,y+h-18,20,8);
      break;
    case 'general_icu':
      addBed(x+10,y+10,w-22,16);
      ctx.fillStyle='#d96d79';ctx.beginPath();ctx.arc(x+w-18,y+18,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f7eef0';ctx.fillRect(x+w-21,y+16,6,4);
      break;
    case 'cardiac_icu':
      addBed(x+10,y+10,w-22,16);
      ctx.fillStyle='#c94859';
      ctx.beginPath();
      ctx.moveTo(x+w-18,y+14);
      ctx.bezierCurveTo(x+w-26,y+6,x+w-34,y+18,x+w-18,y+28);
      ctx.bezierCurveTo(x+w-2,y+18,x+w-10,y+6,x+w-18,y+14);
      ctx.fill();
      break;
    case 'xray':
      ctx.fillStyle='#8ea6cd';ctx.beginPath();ctx.arc(x+w/2,y+h/2,16,0,Math.PI*2);ctx.fill();
      addBed(x+10,y+h-24,w-20,12);
      break;
    case 'pharmacy':
      for(let i=0;i<3;i++)addDesk(x+10+i*20,y+10,14,h-20,'#ecd7aa');
      break;
    case 'surgery':
      addBed(x+w/2-22,y+h/2-8,44,16);
      ctx.fillStyle='#86bdd9';ctx.beginPath();ctx.arc(x+w/2,y+18,12,0,Math.PI*2);ctx.fill();
      break;
    case 'lab':
      addDesk(x+8,y+h-18,w-16,10,'#d3c7e8');
      ctx.fillStyle='#90d29a';ctx.fillRect(x+14,y+12,6,12);ctx.fillStyle='#7cb0d8';ctx.fillRect(x+26,y+12,6,12);
      break;
    case 'head_office':
      addDesk(x+10,y+h-22,w-20,14,'#e1c49e');
      ctx.fillStyle='#7db27b';ctx.beginPath();ctx.arc(x+w-16,y+16,8,0,Math.PI*2);ctx.fill();
      break;
    case 'hr_office':
      addDesk(x+10,y+h-22,w-20,14,'#efc0d3');
      ctx.fillStyle='#ffffff';ctx.fillRect(x+12,y+12,18,14);
      ctx.strokeRect(x+12,y+12,18,14);
      ctx.fillStyle='#c97e9d';ctx.fillRect(x+34,y+14,14,10);
      break;
  }
  ctx.restore();
}
function drawRoomDoorConnections(rm,rx,ry,rw,rh){
  const doors=getRoomDoorConnections(rm);
  const drawDoor=(side,ref)=>{
    if(!ref)return;
    const luxury=ref.tile==='luxury_path';
    const fill=luxury?'rgba(250,230,163,0.92)':'rgba(228,236,244,0.94)';
    const line=luxury?'rgba(255,250,228,0.85)':'rgba(255,255,255,0.75)';
    const frame='rgba(92,72,58,0.34)';
    ctx.save();
    ctx.fillStyle=fill;
    ctx.strokeStyle=frame;
    ctx.lineWidth=1;
    if(side==='top'||side==='bottom'){
      const cx=(ref.x+0.5)*T;
      const doorW=Math.min(18,rw-12);
      const doorH=8;
      const x=cx-doorW/2;
      const y=side==='top'?ry-3:ry+rh-5;
      ctx.fillRect(x,y,doorW,doorH);
      ctx.strokeRect(x+0.5,y+0.5,doorW-1,doorH-1);
      ctx.fillStyle=line;
      ctx.fillRect(x+3,y+2,doorW-6,2);
    }else{
      const cy=(ref.y+0.5)*T;
      const doorW=8;
      const doorH=Math.min(18,rh-12);
      const x=side==='left'?rx-3:rx+rw-5;
      const y=cy-doorH/2;
      ctx.fillRect(x,y,doorW,doorH);
      ctx.strokeRect(x+0.5,y+0.5,doorW-1,doorH-1);
      ctx.fillStyle=line;
      ctx.fillRect(x+2,y+3,2,doorH-6);
    }
    ctx.restore();
  };
  drawDoor('top',doors.top);
  drawDoor('bottom',doors.bottom);
  drawDoor('left',doors.left);
  drawDoor('right',doors.right);
}
function drawRoad(){
  ctx.fillStyle='#6b6f76';
  ctx.fillRect(0,cv.height-120,cv.width,80);
}

function drawWorldBackground(ctx){
  ctx.fillStyle='#9fd39f';
  ctx.fillRect(0,0,cv.width,cv.height);

  drawRoad();

  const roadY=cv.height-120;

  ctx.strokeStyle='#fff';
  ctx.lineWidth=3;
  ctx.setLineDash([20,20]);
  ctx.beginPath();
  ctx.moveTo(0,roadY+40);
  ctx.lineTo(cv.width,roadY+40);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle='#aab3bd';
  ctx.fillRect(0,roadY+80,cv.width,120);
}
function drawCampusBackdrop(){
  drawWorldBackground(ctx);
}
function drawHospitalSiteBackdrop(floor=1){
  const w=cv.width;
  const h=cv.height;

  if(floor===1){
    drawGroundFloorSite(w,h);
  }else if(floor===2){
    drawClinicalFloorSite(w,h);
  }else{
    drawAdvancedFloorSite(w,h,floor);
  }
}

function drawGroundFloorSite(w,h){
  ctx.fillStyle='#9fcf9f';
  ctx.fillRect(0,0,w,h);

  const campus={
    x:70,
    y:48,
    w:w-140,
    h:h-170
  };
  const parking={
    left:{x:0,y:42,w:60,h:h-120},
    right:{x:w-60,y:42,w:60,h:h-120},
    bottom:{x:54,y:h-164,w:w-108,h:82}
  };

  ctx.fillStyle='#aeb6bf';
  rrect(parking.left.x,parking.left.y,parking.left.w,parking.left.h,18);
  ctx.fill();
  rrect(parking.right.x,parking.right.y,parking.right.w,parking.right.h,18);
  ctx.fill();
  rrect(parking.bottom.x,parking.bottom.y,parking.bottom.w,parking.bottom.h,22);
  ctx.fill();

  ctx.strokeStyle='rgba(255,255,255,.46)';
  ctx.lineWidth=1;
  for(let y=64;y<parking.left.y+parking.left.h-40;y+=42){
    ctx.strokeRect(16,y,26,34);
    ctx.strokeRect(w-42,y,26,34);
  }
  for(let x=82;x<parking.bottom.x+parking.bottom.w-28;x+=34){
    ctx.strokeRect(x,h-148,22,38);
  }

  ['#c44f4f','#4f88c4','#d5b44d','#6ea26e'].forEach((color,i)=>{
    ctx.fillStyle=color;
    rrect(17,76+i*92,24,16,5);
    ctx.fill();
  });
  ['#4f88c4','#d5b44d','#c44f4f','#8b75c9'].forEach((color,i)=>{
    ctx.fillStyle=color;
    rrect(w-41,96+i*92,24,16,5);
    ctx.fill();
  });
  ['#c44f4f','#4f88c4','#d5b44d'].forEach((color,i)=>{
    ctx.fillStyle=color;
    rrect(w-204+i*48,h-134,24,18,5);
    ctx.fill();
  });

  ctx.fillStyle='#d8dde2';
  rrect(campus.x,campus.y,campus.w,campus.h,26);
  ctx.fill();

  ctx.fillStyle='#e5eaee';
  rrect(campus.x+18,campus.y+18,campus.w-36,campus.h-36,22);
  ctx.fill();

  ctx.fillStyle='#626a72';
  ctx.fillRect(0,h-82,w,58);

  ctx.strokeStyle='rgba(255,255,255,.65)';
  ctx.lineWidth=3;
  ctx.setLineDash([18,16]);
  ctx.beginPath();
  ctx.moveTo(0,h-53);
  ctx.lineTo(w,h-53);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle='#7b838c';
  rrect(46,h-132,210,58,18);
  ctx.fill();

  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.font='800 12px Segoe UI';
  ctx.textAlign='center';
  ctx.fillText('AMBULANCE / DROP OFF',151,h-99);

  ctx.fillStyle='#e9dfc9';
  rrect(w/2-120,h-156,240,72,22);
  ctx.fill();

  ctx.strokeStyle='rgba(160,132,86,.35)';
  ctx.lineWidth=1;
  for(let x=w/2-104;x<w/2+120;x+=22){
    ctx.beginPath();
    ctx.moveTo(x,h-152);
    ctx.lineTo(x,h-88);
    ctx.stroke();
  }

  [[80,80,1],[250,90,1],[w-80,90,1.05],[w-120,350,1],[w-280,70,.9]].forEach(t=>{
    if(typeof drawTree==='function')drawTree(t[0],t[1],t[2]);
  });

  if(typeof drawAmbientCampusLife==='function')drawAmbientCampusLife();
}

function drawClinicalFloorSite(w,h){
  ctx.fillStyle='#eef6fb';
  ctx.fillRect(0,0,w,h);

  ctx.fillStyle='#f8fbff';
  rrect(34,34,w-68,h-68,24);
  ctx.fill();

  ctx.fillStyle='rgba(190,220,240,.28)';
  rrect(62,62,w-124,h-124,18);
  ctx.fill();

  ctx.strokeStyle='rgba(120,160,190,.16)';
  ctx.lineWidth=1;
  for(let x=62;x<w-62;x+=32){
    ctx.beginPath();
    ctx.moveTo(x,62);
    ctx.lineTo(x,h-62);
    ctx.stroke();
  }
  for(let y=62;y<h-62;y+=32){
    ctx.beginPath();
    ctx.moveTo(62,y);
    ctx.lineTo(w-62,y);
    ctx.stroke();
  }

  ctx.fillStyle='rgba(185,225,255,.55)';
  for(let x=74;x<w-90;x+=46){
    rrect(x,42,24,10,4);
    ctx.fill();
  }

  ctx.fillStyle='rgba(70,100,130,.55)';
  ctx.font='800 11px Segoe UI';
  ctx.textAlign='left';
  ctx.fillText('CLINICAL FLOOR',52,26);
}

function drawAdvancedFloorSite(w,h,floor){
  ctx.fillStyle='#e7edf5';
  ctx.fillRect(0,0,w,h);

  ctx.fillStyle='#f7f9fc';
  rrect(34,34,w-68,h-68,24);
  ctx.fill();

  ctx.fillStyle='rgba(120,150,180,.12)';
  for(let i=0;i<7;i++){
    rrect(64+i*96,58,52,18,8);
    ctx.fill();
  }

  ctx.strokeStyle='rgba(90,120,150,.13)';
  ctx.lineWidth=1;
  for(let x=50;x<w-50;x+=24){
    ctx.beginPath();
    ctx.moveTo(x,50);
    ctx.lineTo(x,h-50);
    ctx.stroke();
  }
  for(let y=50;y<h-50;y+=24){
    ctx.beginPath();
    ctx.moveTo(50,y);
    ctx.lineTo(w-50,y);
    ctx.stroke();
  }

  ctx.fillStyle='rgba(70,90,120,.6)';
  ctx.font='800 11px Segoe UI';
  ctx.textAlign='left';
  ctx.fillText(`ADVANCED CARE FLOOR ${floor}`,52,26);
}
function render(){
  ctx.clearRect(0,0,cv.width,cv.height);
  drawHospitalSiteBackdrop(currentFloor);

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(isPathTile(grid[r][c])){
      const luxury=grid[r][c]==='luxury_path';
      const floorStyle=getFloorStyle(currentFloor);
      const x=c*T,y=r*T;
      const midX=x+T/2,midY=y+T/2;
      ctx.fillStyle=luxury?'rgba(250,230,163,0.9)':floorStyle.corridor;
      ctx.fillRect(x,y,T,T);
      ctx.fillStyle=luxury?'rgba(255,247,214,0.68)':'rgba(255,255,255,0.34)';
      ctx.fillRect(x+2,y+2,T-4,3);
      ctx.fillStyle=luxury?'rgba(219,191,103,0.28)':'rgba(164,180,196,0.18)';
      ctx.fillRect(x,y+T-4,T,4);
      const flow=((currentAnimTime()/420)+(c*0.17)+(r*0.11))%1;
      ctx.fillStyle=luxury?'rgba(255,255,240,0.24)':'rgba(255,255,255,0.14)';
      if(inBounds(c-1,r)&&isPathTile(grid[r][c-1]))ctx.fillRect(x+flow*(T-8),midY-1.5,8,3);
      if(inBounds(c+1,r)&&isPathTile(grid[r][c+1]))ctx.fillRect(x+flow*(T-8),midY-1.5,8,3);
      if(inBounds(c,r-1)&&isPathTile(grid[r-1][c]))ctx.fillRect(midX-1.5,y+flow*(T-8),3,8);
      if(inBounds(c,r+1)&&isPathTile(grid[r+1][c]))ctx.fillRect(midX-1.5,y+flow*(T-8),3,8);
    }
  }

  ctx.strokeStyle='rgba(255,255,255,0.14)';ctx.lineWidth=.6;
  for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*T);ctx.lineTo(COLS*T,r*T);ctx.stroke();}
  for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*T,0);ctx.lineTo(c*T,ROWS*T);ctx.stroke();}

  for(const rm of getRoomsOnFloor()){
    const d=RDEFS[rm.type];
    const conn=isConn(rm);
    const hasStaff=roomHasRequiredStaff(rm);
    const outline=getRoomOutlineStyle(rm);
    const staffIndicator=getRoomStaffIndicatorState(rm);
    const waitingVisual=rm.type==='waiting_room'?getWaitingRoomVisualState():null;
    const buildAnim=getRoomBuildAnim(rm);
    const hoverAnim=getRoomHoverAnim(rm);
    const selectedAnim=getSelectedRoomAnim(rm);
    const eventFocusAnim=getEventFocusAnim(rm);
    const rx=rm.c*T+0.5,ry=rm.r*T+0.5,rw=rm.w*T-1,rh=rm.h*T-1;
    const cx=rx+rw/2,cy=ry+rh/2;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(buildAnim.scale,buildAnim.scale);
    ctx.translate(-cx,-cy);
    ctx.globalAlpha*=buildAnim.alpha;
    ctx.save();
    ctx.fillStyle='rgba(64,88,108,0.14)';
    ctx.shadowColor='rgba(42,66,88,0.2)';
    ctx.shadowBlur=12+(hoverAnim.glow*28);
    ctx.shadowOffsetY=5;
    ctx.fillRect(rx+2,ry+5,rw,rh);
    ctx.restore();
    ctx.fillStyle=conn?(waitingVisual?.fill||d.color):'#cfd9df';
    ctx.strokeStyle=outline.color;
    ctx.lineWidth=outline.width;
    ctx.fillRect(rx,ry,rw,rh);ctx.strokeRect(rx,ry,rw,rh);
    ctx.globalAlpha=0.05;
    ctx.fillStyle='#000';
    ctx.fillRect(rx,ry,rw,rh);
    ctx.globalAlpha=1;
    if(buildAnim.glow>0.01){
      ctx.save();
      ctx.strokeStyle=`rgba(132,203,255,${0.18+buildAnim.glow})`;
      ctx.lineWidth=buildAnim.outline;
      ctx.shadowColor=`rgba(120,196,255,${0.14+buildAnim.glow})`;
      ctx.shadowBlur=10+buildAnim.glow*26;
      ctx.strokeRect(rx-1.5,ry-1.5,rw+3,rh+3);
      ctx.restore();
    }
    const roomSheen=ctx.createLinearGradient(rx,ry,rx,ry+rh);
    roomSheen.addColorStop(0,'rgba(255,255,255,0.2)');
    roomSheen.addColorStop(0.45,'rgba(255,255,255,0.08)');
    roomSheen.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=roomSheen;
    ctx.fillRect(rx+3,ry+3,rw-6,rh-6);
    if(buildAnim.brighten>0.01){
      ctx.fillStyle=`rgba(255,255,255,${buildAnim.brighten})`;
      ctx.fillRect(rx+2.5,ry+2.5,rw-5,rh-5);
    }
    if(heatmapOn){
      const heatmap=getRoomHeatmapData(rm);
      ctx.fillStyle=heatmap.color;
      ctx.fillRect(rx+1.5,ry+1.5,rw-3,rh-3);
    }
    const activityLevel=getRoomActivityLevel(rm);
    if(activityLevel>0){
      const beat=(Math.sin(currentAnimTime()/220)+1)/2;
      ctx.fillStyle=`rgba(255,255,255,${0.03+activityLevel*0.035})`;
      ctx.fillRect(rx+2,ry+2,rw-4,rh-4);
      ctx.strokeStyle=`rgba(149,226,255,${0.1+activityLevel*0.12+beat*0.06})`;
      ctx.lineWidth=1.2+activityLevel*0.8;
      ctx.strokeRect(rx+2,ry+2,rw-4,rh-4);
    }
    if(hoverAnim.brighten>0){
      ctx.fillStyle=`rgba(255,255,255,${hoverAnim.brighten})`;
      ctx.fillRect(rx+2.5,ry+2.5,rw-5,rh-5);
      ctx.strokeStyle=`rgba(162,221,255,${hoverAnim.glow})`;
      ctx.lineWidth=1.4;
      ctx.strokeRect(rx+1.5,ry+1.5,rw-3,rh-3);
    }
    if(selectedAnim){
      ctx.save();
      ctx.strokeStyle=colorWithAlpha(selectedAnim.color,selectedAnim.glow);
      ctx.lineWidth=selectedAnim.width;
      ctx.shadowColor=colorWithAlpha(selectedAnim.color,Math.min(.5,selectedAnim.glow+.1));
      ctx.shadowBlur=12+selectedAnim.glow*16;
      ctx.strokeRect(rx-1.5,ry-1.5,rw+3,rh+3);
      ctx.restore();
    }
    if(eventFocusAnim){
      ctx.save();
      ctx.strokeStyle=colorWithAlpha(eventFocusAnim.color,eventFocusAnim.glow);
      ctx.lineWidth=eventFocusAnim.width;
      ctx.shadowColor=colorWithAlpha(eventFocusAnim.color,Math.min(.55,eventFocusAnim.glow+.12));
      ctx.shadowBlur=14+eventFocusAnim.glow*18;
      ctx.strokeRect(rx-2,ry-2,rw+4,rh+4);
      ctx.restore();
    }
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.fillRect(rx+6,ry+6,rw-12,Math.max(20,rh*0.24));
    ctx.fillStyle='rgba(255,255,255,0.18)';
    ctx.fillRect(rx+6,ry+6,rw-12,2);
    if(!hasStaff&&conn&&d.staffRole){ctx.fillStyle='rgba(214,156,64,0.12)';ctx.fillRect(rx+1.5,ry+1.5,rw-3,rh-3);}
    drawRoomDoorConnections(rm,rx,ry,rw,rh);
    drawRoomDecor(rm,d);
    const showPeopleDetail=showZoomRoomPeople();
    const showCounterDetail=showZoomRoomCounters();
    if(staffIndicator){
      const badgeX=rx+rw-17,badgeY=Math.max(ry+44,ry+rh-17);
      ctx.fillStyle='rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.arc(badgeX,badgeY,7,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle=staffIndicator.fill;
      ctx.beginPath();
      ctx.arc(badgeX,badgeY,5.5,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle=staffIndicator.icon;
      ctx.font='700 8px Trebuchet MS';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(staffIndicator.label,badgeX,badgeY+0.5);
    }

    const tileStatus=getRoomTileStatusIndicator(rm);
    const statusDotX=rx+14,statusDotY=ry+14;
    const dotAnim=getStatusDotAnim(tileStatus);
    ctx.fillStyle='rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.arc(statusDotX,statusDotY,6,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle=colorWithAlpha(tileStatus.color,dotAnim.alpha);
    ctx.beginPath();
    ctx.arc(statusDotX,statusDotY,dotAnim.radius,0,Math.PI*2);
    ctx.fill();
    if(showCounterDetail){
      const counterValue=`${patients.filter(p=>p.roomId===rm.id).length}`;
      const bubbleW=20,bubbleH=14,bubbleX=rx+rw-bubbleW-8,bubbleY=ry+8;
      ctx.fillStyle='rgba(67,92,116,0.66)';
      rrect(bubbleX,bubbleY,bubbleW,bubbleH,7);ctx.fill();
      ctx.fillStyle='rgba(244,250,255,0.96)';
      ctx.font='700 8px Trebuchet MS';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(counterValue,bubbleX+bubbleW/2,bubbleY+bubbleH/2+0.5);
    }
    ctx.restore();

  }

  if(showZoomRoomPeople()){
    drawStaffInRooms();
    drawPatients();
  }

  if(cleanliness<45){
    ctx.fillStyle='rgba(120,100,60,0.08)';
    for(let i=0;i<Math.ceil((100-cleanliness)/8);i++){
      const x=(i*97)%cv.width,y=(i*53)%cv.height;
      ctx.fillRect(x+8,y+8,8,5);
    }
  }

  if(isPathTool(selTool)&&hover.x>=0&&inBounds(hover.x,hover.y)&&!tileOccupied(hover.x,hover.y)){
    ctx.fillStyle=selTool==='luxury_path'?'rgba(255,226,123,0.72)':'rgba(255,245,183,0.72)';rrect(hover.x*T+3,hover.y*T+3,T-6,T-6,10);ctx.fill();
  } else if(selTool&&RDEFS[selTool]&&hover.x>=0){
    const d=RDEFS[selTool];
    const footprint=getBuildFootprint(selTool);
    const pc=Math.max(0,Math.min(hover.x,COLS-footprint.w)),pr=Math.max(0,Math.min(hover.y,ROWS-footprint.h));
    let ok=money>=d.cost&&corridorAdj(pc,pr,footprint.w,footprint.h);
    for(let rr2=pr;rr2<pr+footprint.h&&ok;rr2++)for(let cc=pc;cc<pc+footprint.w&&ok;cc++)if(tileOccupied(cc,rr2))ok=false;
    ctx.fillStyle=ok?'rgba(119,215,126,0.24)':'rgba(232,97,97,0.2)';
    ctx.strokeStyle=ok?'#58ad63':'#d05f5f';ctx.lineWidth=2;
    ctx.fillRect(pc*T+2,pr*T+2,footprint.w*T-4,footprint.h*T-4);ctx.strokeRect(pc*T+2,pr*T+2,footprint.w*T-4,footprint.h*T-4);
  } else if(selTool==='demolish'&&hover.x>=0){
    const rm=roomAt(hover.x,hover.y);
    if(rm){ctx.fillStyle='rgba(221,86,86,0.24)';ctx.strokeStyle='#cf4f4f';ctx.lineWidth=2;ctx.fillRect(rm.c*T+2,rm.r*T+2,rm.w*T-4,rm.h*T-4);ctx.strokeRect(rm.c*T+2,rm.r*T+2,rm.w*T-4,rm.h*T-4);}
    else if(inBounds(hover.x,hover.y)&&isPathTile(grid[hover.y][hover.x])){ctx.fillStyle='rgba(221,86,86,0.26)';rrect(hover.x*T+3,hover.y*T+3,T-6,T-6,10);ctx.fill();}
  }
}

function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}

let last=null;
function loop(ts){
  animTime=ts;
  if(last!==null)tick(ts-last);
  updatePatientMovement();
  if(updateZoomTween(ts)||patients.length)render();
  last=ts;
  requestAnimationFrame(loop);
}
resetGameState(true);
initFloorPanelDrag();
requestAnimationFrame(loop);
