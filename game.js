// Core bootstrap, shared state, rendering, and the main loop stay here.
const T=32;let COLS=27,ROWS=15;
const RES_SCALE=2; // HiDPI backing-store multiplier — doubles render resolution while keeping CSS size unchanged.
let buildableMask=null; // 2D bool [ROWS][COLS] — false = non-buildable terrain
let terrainMask=null;   // 2D string [ROWS][COLS] — 'grass'|'road'|'parking'|'water'|'tree'|'cliff'|null
let selectedCampusId='regional_medical_center';
let campusSupplyCostMult=1;
const MAX_FLOORS=10;
const FLOOR_SPECIALIZATIONS={
  unchosen:{
    id:'unchosen',label:'Unchosen',icon:'❔',color:'#94a3b8',
    description:'No specialization yet. Choose one to unlock buildable rooms and passive bonuses for this floor.',
    unlockedRooms:[],reservedRooms:[],
    bonuses:{},drawbacks:{},
    bonusText:[],drawbackText:[],
    placeholder:true
  },
  general_patient_care:{
    id:'general_patient_care',label:'General Patient Care',name:'General Patient Care',icon:'🏥',color:'#5fa9d6',
    description:'Everyday clinic and inpatient care. Waiting rooms, GP, wards, and patient services.',
    // Floor 1 always defaults to this spec, so the front/staff entrances live here.
    unlockedRooms:['waiting_room','gp','ward','single_hospital_room','double_hospital_room','front_entrance','staff_entrance'],
    reservedRooms:[],
    bonuses:{generalSpeedBonus:0.08,publicReputationBonus:1,waitThresholdAdd:2},
    drawbacks:{},
    bonusText:['General patient-flow rooms (GP, Ward, Waiting) treat 8% faster','Patients wait +2 ticks before reputation drops','Reputation +1 / month from public mission'],
    drawbackText:['No specialty revenue boost']
  },
  emergency_critical:{
    id:'emergency_critical',label:'Emergency & Critical Care',name:'Emergency & Critical Care',icon:'🚨',color:'#d65f5f',
    description:'ER, trauma, ICU, ambulance intake, and crisis response.',
    unlockedRooms:['er','er_entrance','ambulance_bay','general_icu','cardiac_icu','observation_room','trauma_bay','blood_bank'],
    reservedRooms:['Trauma Bay','Observation Room','Blood Bank'],
    bonuses:{emergencySpeedBonus:0.12},
    drawbacks:{wageBillMult:1.05,stressBaselineAdd:1,stressGrowthMult:1.10},
    bonusText:['ER, ICU & Surgery treat 12% faster on this floor'],
    drawbackText:['Hospital wage bill +5%','+1 baseline stress per day','Stress grows 10% faster while staffed']
  },
  diagnostics:{
    id:'diagnostics',label:'Diagnostics',name:'Diagnostics',icon:'🧪',color:'#9e6fc4',
    description:'Lab, imaging, and pathology under one roof.',
    unlockedRooms:['lab','xray','ct_scan','mri','ultrasound','mammography','core_lab','hematology_lab','clinical_chemistry_lab','urinalysis_lab','microbiology_lab','histology_cytology_lab','molecular_diagnostics_lab','specimen_receiving','blood_bank','pharmacy','it_department'],
    reservedRooms:['CT Scanner','MRI','Blood Bank','Pathology'],
    bonuses:{diagnosticSpeedBonus:0.15},
    drawbacks:{diagnosticCostMult:1.12},
    bonusText:['Lab, X-Ray & Radiology run 15% faster on this floor'],
    drawbackText:['Diagnostic room build cost +12%','Outages on this floor hurt more (descriptive — future task)']
  },
  surgical:{
    id:'surgical',label:'Surgical Services',name:'Surgical Services',icon:'⚕️',color:'#5fc4a3',
    description:'Operating rooms, perioperative care, and recovery.',
    unlockedRooms:['operating_room','surgery','pre_op','pacu','surgical_recovery','sterile_processing','plastic_surgery_or','anesthesia_office','surgical_icu','blood_bank','hvac_generator'],
    reservedRooms:['Operating Room','Pre-Op','PACU','Sterile Processing','Surgical ICU'],
    bonuses:{surgicalSpeedBonus:0.10,surgicalRevenueMult:1.08},
    drawbacks:{},
    bonusText:['Surgery & recovery treat 10% faster on this floor','Surgical room revenue +8% on this floor'],
    drawbackText:['Cleanliness failures and blackouts hit harder (descriptive — future task)']
  },
  womens_family:{
    id:'womens_family',label:"Women's Health & Family Care",name:"Women's Health & Family Care",icon:'👶',color:'#e58fb8',
    description:'OB/GYN, birth center, fertility, and family services.',
    unlockedRooms:['obgyn','labor_delivery','postpartum_room','nursery','womens_imaging','fertility_consult_office','ivf_procedure_room','embryology_lab_room','andrology_lab','cryogenic_storage','fertility_records_office','counseling_office'],
    reservedRooms:['Labor & Delivery','Postpartum','Nursery'],
    bonuses:{publicReputationBonus:1},
    drawbacks:{},
    bonusText:['Reputation +1 / month from family-care mission','Specialty fertility/family revenue (descriptive — future task)'],
    drawbackText:['Higher ethics & record-keeping risk (descriptive — future task)']
  },
  operations_admin:{
    id:'operations_admin',label:'Operations & Administration',name:'Operations & Administration',icon:'📋',color:'#7a8aa3',
    description:'HR, IT, finance, grants, compliance, and internal ops.',
    unlockedRooms:['executive_office','board_room','finance_office','contract_office','grant_writer_office','government_compliance_office','hr_office','training_office','employee_wellness_office','shift_supervisor_office','it_department','dispatch_office','facilities_office','head_office','administration'],
    reservedRooms:['Finance Office','Contract Office','Executive Suites'],
    bonuses:{grantApprovalBonus:0.05,staffMoraleBonus:1,govCompliancePressure:-0.03,hiringPoolBonus:1},
    drawbacks:{privateRevenueMult:0.95},
    bonusText:['Grant approval odds +5%','+1 staff morale per day','Government compliance pressure −3%','+1 candidate per role in the hiring pool'],
    drawbackText:['Private patient revenue −5% (admin floors don\'t earn at the bedside)']
  },
  research_university:{
    id:'research_university',label:'Research & University',name:'Research & University',icon:'🎓',color:'#c8a85f',
    description:'Academic medicine, training, and prestige.',
    unlockedRooms:['research_department','clinical_trials_office','research_lab','ethics_board_office','data_review_office','lecture_hall','residency_office','simulation_training_center','student_center','library_study_room','it_department','grant_writer_office','conference_room','teaching_intern_office'],
    reservedRooms:['Lecture Hall','Residency Office','Clinical Trials Office','Ethics Board','Student Center'],
    bonuses:{dailyResearchPoints:1,researchSpeedBonus:0.10,grantApprovalBonus:0.03,traineeXpBonus:0.10},
    drawbacks:{generalSpeedPenalty:0.05},
    bonusText:['+1 RP per day','Active research projects 10% faster','Grant approval odds +3%','Training mistakes 10% less damaging (mentoring)'],
    drawbackText:['Patient throughput 5% slower (academic overhead)']
  },
  private_specialty:{
    id:'private_specialty',label:'Private Specialty Care',name:'Private Specialty Care',icon:'👑',color:'#b78bd9',
    description:'VIP, elective, and premium services.',
    unlockedRooms:['vip_room','premium_recovery_suite','concierge_desk','private_lounge','executive_wellness_clinic','cosmetic_consult_office','plastic_surgery_or','aesthetic_procedure_room','luxury_recovery_suite','marketing_office','premium_waiting_lounge','cosmetic_recovery_suite'],
    reservedRooms:['Concierge Desk','VIP Lounge','Donor Suite'],
    bonuses:{privateRevenueMult:1.15,privateRoomFloorRevMult:1.08},
    drawbacks:{govCompliancePressure:0.05},
    bonusText:['Private patient revenue +15%','Private rooms on this floor earn an extra +8%'],
    drawbackText:['Government compliance pressure +5% — *only when below public-care quota*']
  },
  digital_automation:{
    id:'digital_automation',label:'Digital & Automation',name:'Digital & Automation',icon:'💻',color:'#5fc4d6',
    description:'Servers, AI, automation, and hospital systems.',
    unlockedRooms:['server_room','data_backup_room','network_hub','telecom_room','cybersecurity_office','ai_operations_center','patient_flow_command_center','digital_records_office','automation_monitoring_room','it_department','research_department'],
    reservedRooms:['Server Room','AI Ops','Network Hub'],
    bonuses:{researchSpeedBonus:0.05},
    drawbacks:{},
    bonusText:['Active research projects +5% faster','Stronger automation & earlier warnings (descriptive — future task)'],
    drawbackText:['IT failures more disruptive without backups (descriptive — future task)']
  },
  manufacturing_supply:{
    id:'manufacturing_supply',label:'Manufacturing & Supply',name:'Manufacturing & Supply',icon:'⚙️',color:'#d6a35f',
    description:'Supply, in-house production, sterile processing.',
    unlockedRooms:['central_supply','supply_warehouse','inventory_control_office','loading_receiving_room','sterile_processing','medical_supply_workshop','three_d_printing_lab','biomedical_engineering_lab','prosthetics_workshop','compounding_pharmacy','quality_control_office','hvac_generator'],
    reservedRooms:['Central Supply','Sterile Processing','3D Printing Lab'],
    bonuses:{manufacturingRoomCostMult:0.92},
    drawbacks:{},
    bonusText:['Room construction on this floor costs 8% less'],
    drawbackText:['Sterile failure & quality-control events bite harder (descriptive — future task)']
  }
};
// Universal rooms allowed on every specialized floor (per task spec).
const FLOOR_SPEC_UNIVERSAL_ROOMS=new Set([
  'bathroom','staff_room','lunch_room','nurse_station','janitor_closet',
  'security_office','vending_machine','drink_station','atm_kiosk',
  'elevator','staircase','corridor','luxury_path'
]);
// `general` is preserved as a runtime alias to general_patient_care for any
// caller (or save) that still references the v1.22 key directly.
FLOOR_SPECIALIZATIONS.general=FLOOR_SPECIALIZATIONS.general_patient_care;
// Maps legacy v1.22/v1.23 floor specialization keys → v1.24 keys for save migration.
const FLOOR_SPEC_LEGACY_MAP={
  general:'general_patient_care',
  general_patient_care:'general_patient_care',
  admissions:'general_patient_care',pediatrics:'general_patient_care',
  emergency:'emergency_critical',
  emergency_critical:'emergency_critical',
  cardiac:'emergency_critical',trauma:'emergency_critical',critical_care:'emergency_critical',
  diagnostics:'diagnostics',
  surgical:'surgical',
  womens_family:'womens_family',
  admin:'operations_admin',
  operations_admin:'operations_admin',
  research:'research_university',
  research_university:'research_university',
  private:'private_specialty',
  private_specialty:'private_specialty',
  vip:'private_specialty',
  digital_automation:'digital_automation',
  manufacturing_supply:'manufacturing_supply'
};
// Diminishing-returns ladder when stacking the same specialization across multiple floors.
const FLOOR_SPEC_DIMINISH=[1.0,0.7,0.5,0.35,0.25];
const STARTING_CASH=500000;
const DIFFICULTY_PRESETS={
  guided:{
    id:'guided',label:'Guided Clinic',icon:'🌱',
    desc:'Forgiving for new players. More cash, calmer government, fewer events, and slower burnout.',
    color:'#22c55e',
    startCash:750000,startRep:80,startCleanliness:85,startStress:0,
    govQuota:0.25,
    stressGrowthMult:0.6,cleanDecayMult:0.65,fatigueMult:0.7,
    eventFreqMult:0.5,bonusEventChance:0,
    loseDebtDays:10,loseLowRepDays:10,loseHighStressDays:6
  },
  standard:{
    id:'standard',label:'Standard Hospital',icon:'🏥',
    desc:'The intended balanced experience. Rewards careful management without extra punishment.',
    color:'#3b82f6',
    startCash:500000,startRep:70,startCleanliness:78,startStress:0,
    govQuota:0.35,
    stressGrowthMult:1.0,cleanDecayMult:1.0,fatigueMult:1.0,
    eventFreqMult:1.0,bonusEventChance:0,
    loseDebtDays:5,loseLowRepDays:5,loseHighStressDays:3
  },
  pressure:{
    id:'pressure',label:'Public Pressure',icon:'🔴',
    desc:'Hard mode. Less cash, higher government quotas, faster staff burnout, and more chaotic events.',
    color:'#ef4444',
    startCash:280000,startRep:55,startCleanliness:65,startStress:10,
    govQuota:0.50,
    stressGrowthMult:1.6,cleanDecayMult:1.5,fatigueMult:1.4,
    eventFreqMult:1.0,bonusEventChance:0.45,
    loseDebtDays:3,loseLowRepDays:3,loseHighStressDays:2
  }
};
let selectedDifficulty='standard';
let hospitalName='Asherville Medical Center';
let tutorialEnabled=true;
let lastSetupData=null;
const SETUP_STORAGE_KEY='mmc_last_setup_v1';
try{
  const _raw=localStorage.getItem(SETUP_STORAGE_KEY);
  if(_raw){
    const _saved=JSON.parse(_raw);
    if(_saved&&typeof _saved==='object'){
      lastSetupData=_saved;
      if(typeof _saved.hospitalName==='string'&&_saved.hospitalName.trim())hospitalName=_saved.hospitalName.trim().slice(0,60);
    }
  }
}catch{}
function getDifficulty(){return isSandboxMode?DIFFICULTY_PRESETS.standard:(DIFFICULTY_PRESETS[selectedDifficulty]||DIFFICULTY_PRESETS.standard);}

const CEO_ARCHETYPES=[
  {id:'public_mission',archetype:'Public Mission CEO',name:'Dr. Elena Marsh',icon:'🏥',salary:8000,
   desc:'A veteran public health administrator. Optimizes for community outcomes and government compliance.',
   bestFor:'Government contracts, public care grants, community reputation',
   bonuses:{govPenaltyMult:0.50,grantApprovalBonus:0.12,govCompliancePressure:-0.05},
   negativeTrait:{label:'Political Scrutiny',desc:'Government audits and public accountability demands increase significantly.'},
   negativeEffect:{auditChanceMult:2.0,govCompliancePressure:0.10},adaptationDays:30},
  {id:'corporate_growth',archetype:'Corporate Growth CEO',name:'Marcus Chen',icon:'📈',salary:10000,
   desc:'A results-driven executive from the private sector. Prioritizes insurance revenue and private patient volume.',
   bestFor:'Insurance contracts, private patient revenue, financial growth',
   bonuses:{privateRevenueMult:1.25,insuranceIncomeMult:1.20,patientTrafficBonus:0.10},
   negativeTrait:{label:'Public Care Friction',desc:'Government public care pressure increases significantly under corporate focus.'},
   negativeEffect:{govCompliancePressure:0.15},adaptationDays:25},
  {id:'operations',archetype:'Operations CEO',name:'Priya Vasquez',icon:'⚙️',salary:9000,
   desc:'A logistics expert who cuts waste and keeps everything running smoothly.',
   bestFor:'Stress management, cleanliness, operational efficiency',
   bonuses:{stressReductionBonus:3,cleanDecayMult:0.75,roomCostMult:0.90},
   negativeTrait:{label:'Bureaucratic Overhead',desc:'Heavy process requirements slow staff morale and increase admin costs.'},
   negativeEffect:{staffMoraleBonus:-6,wageBillMult:1.10},adaptationDays:20},
  {id:'academic',archetype:'Academic CEO',name:'Prof. James Okafor',icon:'🎓',salary:8500,
   desc:'A distinguished professor turned hospital leader. Research output and trainee development excel.',
   bestFor:'Research points, training programs, academic grants',
   bonuses:{researchSpeedBonus:0.35,dailyResearchPoints:2,grantApprovalBonus:0.08},
   negativeTrait:{label:'Training Mishaps',desc:'Focus on teaching increases training mistake events and admin overhead.'},
   negativeEffect:{trainingMistakeChanceMult:2.5,wageBillMult:1.08},adaptationDays:25},
  {id:'ai_visionary',archetype:'AI Visionary CEO',name:'Sasha Nomura',icon:'🤖',salary:11000,
   desc:'A tech entrepreneur who believes AI will transform healthcare. Digital research and automation surge.',
   bestFor:'Digital research, IT systems, automation efficiency',
   bonuses:{researchSpeedBonus:0.40,dailyResearchPoints:3,stressReductionBonus:2},
   negativeTrait:{label:'Cyber Fragility',desc:'IT outages and system failures have amplified and devastating consequences.'},
   negativeEffect:{itOutagePenaltyMult:3.0},adaptationDays:35},
  {id:'manufacturing',archetype:'Manufacturing CEO',name:'Dana Kowalski',icon:'🏭',salary:8000,
   desc:'Built hospitals from the supply chain up. Facilities and equipment are cheaper and more reliable.',
   bestFor:'Construction costs, supply chains, room maintenance',
   bonuses:{roomCostMult:0.80,corridorCostMult:0.75},
   negativeTrait:{label:'Sterile Pressure',desc:'Industrial workflow focus increases the damage from sterile failure events.'},
   negativeEffect:{sterileFailurePenaltyMult:2.5},adaptationDays:20},
];
const CEO_LEGACY_EVENTS={
  public_mission:[
    {id:'health_summit',icon:'🏛️',title:'Community Health Summit',rarity:'rare',
     desc:'Dr. Marsh has organized a regional health summit attended by ministry officials. The hospital\'s public care record draws national praise.',
     impact:'+$4,000 government recognition grant. Reputation +6. Grant approval improved.',
     apply(){changeMoney(4000);adjustReputation(6,'Community Health Summit recognition','g');researchPoints+=5;addLog('Community Health Summit: Dr. Marsh earned government recognition. +$4,000 and reputation boost.','g');}},
    {id:'public_award',icon:'🏅',title:'Public Health Award',rarity:'rare',
     desc:'Dr. Marsh receives a national public health leadership award. The hospital gains significant public trust and media coverage.',
     impact:'Reputation +9. Score +25. Public perception improves.',
     apply(){adjustReputation(9,'National Public Health Award','g');score=Math.max(0,score+25);addLog('Public Health Award: Dr. Marsh recognized nationally. Major reputation boost.','g');}},
  ],
  corporate_growth:[
    {id:'investor_windfall',icon:'💰',title:'Investor Relations Windfall',rarity:'rare',
     desc:'Marcus Chen\'s private sector connections generate a direct cash injection from partner investors impressed by the hospital\'s growth metrics.',
     impact:'+$9,000 direct cash bonus from private sector partnership.',
     apply(){changeMoney(9000);addLog('Investor Relations Windfall: Marcus Chen secured a $9,000 private investment bonus.','g');}},
    {id:'referral_network',icon:'📈',title:'Premium Referral Network',rarity:'rare',
     desc:'Marcus Chen activates a premium patient referral agreement. A wave of high-value private patients arrive and insurance reimbursement spikes.',
     impact:'+$6,000 revenue surge. Reputation +3 from high-profile care.',
     apply(){changeMoney(6000);adjustReputation(3,'Premium referral network activated','g');addLog('Premium Referral Network: Marcus Chen drove a private patient surge. +$6,000.','g');}},
  ],
  operations:[
    {id:'efficiency_report',icon:'📋',title:'Operational Excellence Report',rarity:'rare',
     desc:'Priya Vasquez publishes an operational efficiency report that results in a government efficiency bonus and dramatically improves internal metrics.',
     impact:'Stress −20. Cleanliness +12. +$3,500 efficiency grant.',
     apply(){stress=clamp(stress-20,0,100);cleanliness=clamp(cleanliness+12,0,100);changeMoney(3500);addLog('Operational Excellence Report: Priya Vasquez cut stress and earned a $3,500 efficiency grant.','g');}},
    {id:'process_dividend',icon:'⚙️',title:'Process Optimization Dividend',rarity:'rare',
     desc:'Priya Vasquez\'s process overhaul uncovers supply efficiencies. A dividend is issued to hospital operations from recovered budget.',
     impact:'+$5,000 recovered budget. Cleanliness +8. Score +15.',
     apply(){changeMoney(5000);cleanliness=clamp(cleanliness+8,0,100);score=Math.max(0,score+15);addLog('Process Optimization Dividend: Priya Vasquez recovered $5,000 from supply efficiencies.','g');}},
  ],
  academic:[
    {id:'research_publication',icon:'📚',title:'Landmark Research Publication',rarity:'legendary',
     desc:'Prof. Okafor publishes a landmark paper in a major medical journal. The hospital\'s research credibility surges nationally.',
     impact:'+35 Research Points. Reputation +6. Score +20.',
     apply(){researchPoints+=35;adjustReputation(6,'Landmark research publication','g');score=Math.max(0,score+20);addLog('Landmark Research Publication: Prof. Okafor published nationally. +35 RP and major reputation gain.','g');}},
    {id:'academic_grant',icon:'🎓',title:'Academic Excellence Grant',rarity:'rare',
     desc:'Prof. Okafor\'s academic reputation attracts a major unrestricted research endowment from a university partner.',
     impact:'+$8,000 academic endowment. +15 Research Points.',
     apply(){changeMoney(8000);researchPoints+=15;addLog('Academic Excellence Grant: Prof. Okafor secured an $8,000 academic endowment.','g');}},
  ],
  ai_visionary:[
    {id:'ai_breakthrough',icon:'🤖',title:'AI Efficiency Breakthrough',rarity:'legendary',
     desc:'Sasha Nomura\'s AI strategy produces a breakthrough in clinical prediction. Automation savings and research output surge across the hospital.',
     impact:'+30 Research Points. +$6,000 from automation savings. Stress −10.',
     apply(){researchPoints+=30;changeMoney(6000);stress=clamp(stress-10,0,100);adjustReputation(4,'AI efficiency breakthrough recognized','g');addLog('AI Efficiency Breakthrough: Sasha Nomura\'s AI strategy generated +30 RP and $6,000 in savings.','g');}},
    {id:'digital_partnership',icon:'💻',title:'Digital Health Partnership',rarity:'rare',
     desc:'Sasha Nomura closes a digital health data partnership. The hospital receives a technology stipend and research momentum increases.',
     impact:'+$5,500 technology stipend. +20 Research Points. Reputation +3.',
     apply(){changeMoney(5500);researchPoints+=20;adjustReputation(3,'Digital health partnership signed','g');addLog('Digital Health Partnership: Sasha Nomura closed a $5,500 technology deal. +20 RP.','g');}},
  ],
  manufacturing:[
    {id:'supply_windfall',icon:'🏭',title:'Supply Chain Windfall',rarity:'rare',
     desc:'Dana Kowalski\'s supply network generates surplus inventory that is sold at a profit. Sterile reserves are replenished as a side benefit.',
     impact:'+$6,500 from surplus sales. Cleanliness +14.',
     apply(){changeMoney(6500);cleanliness=clamp(cleanliness+14,0,100);addLog('Supply Chain Windfall: Dana Kowalski sold surplus inventory for $6,500. Sterile reserves replenished.','g');}},
    {id:'cost_achievement',icon:'🔧',title:'Cost Optimization Achievement',rarity:'rare',
     desc:'Dana Kowalski\'s relentless cost discipline produces a verified savings achievement recognized by industry peers and the hospital board.',
     impact:'+$5,000 cost savings return. Reputation +4. Score +15.',
     apply(){changeMoney(5000);adjustReputation(4,'Cost optimization achievement recognized','g');score=Math.max(0,score+15);addLog('Cost Optimization Achievement: Dana Kowalski generated $5,000 in verified savings.','g');}},
  ],
};
const CEO_LEGACY_COOLDOWN_MIN=15;
const CEO_LEGACY_COOLDOWN_MAX=22;

const BOARD_MEMBER_TYPES=[
  {id:'finance_strategist',name:'Finance Strategist',icon:'💼',category:'Finance',salary:3000,
   description:'A CFO-level director who keeps the books tight and squeezes more value from every patient.',
   bonusText:'Patient revenue +10%.',
   drawbackText:'Staff raise requests cost 15% more.',
   effects:{bonus:{privateRevenueMult:1.10,insuranceIncomeMult:1.10},drawback:{raiseCostMult:1.15}},
   bestFor:'Hospitals leaning on private and insured patients for cash flow.'},
  {id:'construction_executive',name:'Construction Executive',icon:'🏗️',category:'Construction',salary:2500,
   description:'Brings a network of contractors that cuts large-scale construction costs.',
   bonusText:'All room and corridor construction costs reduced by 20%.',
   drawbackText:'GP Offices and Waiting Rooms cost 50% more.',
   effects:{bonus:{roomCostMult:0.80,corridorCostMult:0.80},drawback:{waitingRoomCostMult:1.50,gpCostMult:1.50}},
   bestFor:'Players doing heavy expansions, new floors, and corridor build-outs.'},
  {id:'insurance_exec',name:'Insurance Network Executive',icon:'📋',category:'Contracts',salary:3500,
   description:'Former insurance industry insider who can squeeze more value out of every contract.',
   bonusText:'Insurance contract rewards +25%.',
   drawbackText:'Government public care requirement increases by 5%.',
   effects:{bonus:{insuranceIncomeMult:1.25},drawback:{govRequirementBonus:0.05}},
   bestFor:'Private-leaning hospitals living off insurance contracts.'},
  {id:'government_liaison',name:'Government Liaison',icon:'🏛️',category:'Government',salary:2800,
   description:'Has relationships throughout the healthcare ministry. Keeps the regulators friendly.',
   bonusText:'Government penalties −25%, public care grants approve more easily.',
   drawbackText:'Private insurance contracts pay 10% less.',
   effects:{bonus:{govPenaltyMult:0.75,grantApprovalBonus:0.10},drawback:{insuranceIncomeMult:0.90}},
   bestFor:'Public-care heavy hospitals chasing grants and dodging fines.'},
  {id:'tech_investor',name:'Tech Investor',icon:'💻',category:'Research & IT',salary:3000,
   description:'Funds digital infrastructure so research and automation upgrades complete faster.',
   bonusText:'Research speed +20% and +1 RP/day — digital and automation upgrades unlock sooner.',
   drawbackText:'IT outage penalties are 25% worse.',
   effects:{bonus:{researchSpeedBonus:0.20,dailyResearchPoints:1},drawback:{itOutagePenaltyMult:1.25}},
   bestFor:'Tech-forward hospitals leaning on research and IT-driven upgrades.'},
  {id:'manufacturing_investor',name:'Manufacturing Investor',icon:'⚙️',category:'Operations',salary:2500,
   description:'Owns supply-chain operations that bring down facility running costs.',
   bonusText:'Room and corridor costs reduced — supplies and manufacturing rooms are cheaper.',
   drawbackText:'Sterile failure events have stronger penalties.',
   effects:{bonus:{roomCostMult:0.90,corridorCostMult:0.90},drawback:{sterileFailurePenaltyMult:1.50}},
   bestFor:'Hospitals running large supply, lab, and pharmacy operations.'},
  {id:'public_health_philanthropist',name:'Public Health Philanthropist',icon:'❤️',category:'Reputation',salary:1500,
   description:'A charity patron who funds community health and boosts your public standing.',
   bonusText:'Grant rewards +20% and public-care reputation gains increase.',
   drawbackText:'Private and VIP room costs increase.',
   effects:{bonus:{grantRewardMult:1.20,publicReputationBonus:0.20},drawback:{privateRoomCostMult:1.30}},
   bestFor:'Public-mission hospitals living off grants and reputation.'},
];
const ASHERVILLE_LORE_EVENTS=[
  'Public Care Review',
  'City Council Hearing',
  'Community Protest',
  'Emergency Funding Vote',
  'Land Use Audit',
  "Mayor's Visit"
];
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
function _applyCanvasBackingStore(){
  // Set the backing store to RES_SCALE× the logical pixel size, then scale the
  // context so all draw code can keep using logical (T-based) coordinates.
  cv.width=COLS*T*RES_SCALE;
  cv.height=ROWS*T*RES_SCALE;
  ctx.setTransform(RES_SCALE,0,0,RES_SCALE,0,0);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
}
_applyCanvasBackingStore();
function resizeCanvasForCampus(){_applyCanvasBackingStore();if(typeof applyZoom==='function')applyZoom();}
function makeEmptyGrid(){return Array.from({length:ROWS},()=>Array(COLS).fill(null));}
function makeFullBuildableMask(){return Array.from({length:ROWS},()=>Array(COLS).fill(true));}
function makeEmptyTerrainMask(){return Array.from({length:ROWS},()=>Array(COLS).fill('grass'));}
function isBuildableTile(x,y,floor=currentFloor){
  if(x<0||y<0||x>=COLS||y>=ROWS)return false;
  if(floor!==1)return true; // upper floors fully open
  if(!buildableMask)return true;
  return buildableMask[y]&&buildableMask[y][x]!==false;
}
// ───────────────────────── Campus catalog ────────────────────────────────
function _carveTerrain(buildable,terrain,x0,y0,w,h,kind,blockBuild=true){
  for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){
    if(y<0||y>=terrain.length||x<0||x>=terrain[0].length)continue;
    terrain[y][x]=kind;
    if(blockBuild)buildable[y][x]=false;
  }
}
const CAMPUSES={
  greenfield_valley:{
    id:'greenfield_valley',name:'Greenfield Valley',shortName:'Greenfield',icon:'🌾',color:'#65a30d',
    subtitle:'Open rural/suburban build site',theme:'Open rural/suburban build site',
    desc:'A wide open greenfield site with plenty of undeveloped land, simple roads, and low early pressure. The most flexible map for players who want creative freedom.',
    traits:['-10% expansion costs','Reduced renovation penalties','Lower early reputation'],
    bonuses:[
      'Expansion costs -10%',
      'Renovation penalties slightly reduced',
      'More room for large specialty buildings like Auditorium or Prisoner Treatment Wing'
    ],
    drawbacks:[
      'Lower starting reputation',
      'Lower patient volume early',
      'Fewer contract opportunities until reputation grows',
      'Service lines may need more investment to become profitable'
    ],
    playstyle:'Creative sandbox — flexible build order, design freely.',
    parkingNotes:'Small starter parking area south of the lot — easy to expand.',
    parking:{
      visitor:'Small starter lot south of the main entrance.',
      staff:'Shared with visitors until expanded.'
    },
    ambulanceRoute:'Simple south rural road — easy approach, low congestion.',
    expansionZones:['Entire greenfield is one open expansion zone — build any direction.'],
    features:[
      'Large Open Expansion Area',
      'Flexible Layout',
      'Rural Access Road',
      'Low Congestion',
      'Easy Expansion'
    ],
    recommendedFor:'Sandbox, Guided Clinic, players who want to design freely, and the Manufacturing & Supply path.',
    difficulty:{label:'Easy',rating:1},
    buildableStyle:{color:'#cfe6cf',label:'Open meadow'},
    background:{kind:'image',value:'assets/campus-regional.png',fallbackColor:'#cfe6cf'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-regional.png',cols:44,rows:26,defaultFor:'sandbox',
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      for(let x=0;x<c;x++){t[r-1][x]='road';b[r-1][x]=false;}
      return{buildable:b,terrain:t};
    },
    entranceEdges:['south'],
    accessEdges:{front:['south'],staff:['south'],ambulance:['south'],service:['south']},
    starter:{
      rooms:[{type:'front_entrance',c:14,r:24},{type:'waiting_room',c:10,r:12},{type:'gp',c:10,r:9},{type:'gp',c:15,r:9},{type:'bathroom',c:15,r:12}],
      corridors:[{x:10,y:11},{x:11,y:11},{x:12,y:11},{x:13,y:11},{x:14,y:11},{x:15,y:11},{x:16,y:11},{x:14,y:12},{x:14,y:13},{x:14,y:14},{x:14,y:15},{x:14,y:16},{x:14,y:17},{x:14,y:18},{x:14,y:19},{x:14,y:20},{x:14,y:21},{x:14,y:22},{x:14,y:23}]
    },
    startTweaks:{}
  },
  regional_medical_center:{
    id:'regional_medical_center',name:'Regional Medical Center',shortName:'Regional',icon:'🏥',color:'#3b82f6',
    subtitle:'Balanced suburban medical campus',theme:'Balanced suburban medical campus',
    desc:'A large regional hospital campus near a highway exit with room for expansion, visitor parking, service/loading access, and a dedicated emergency entrance. The best all-around map for standard play.',
    traits:['+5% patient flow','+5% service efficiency','3 expansion zones'],
    bonuses:[
      '+5% general patient flow — well-organized roads',
      '+5% service efficiency — strong loading access',
      'Expansion zones unlock easier than on urban maps'
    ],
    drawbacks:[
      'Larger campus = longer travel if departments are spread out',
      'Parking demand grows faster as the hospital expands'
    ],
    playstyle:'Balanced growth — flexible build order, good for first full playthroughs.',
    parkingNotes:'Visitor lots on the left, right, and lower-center; visitor loop drop-off ringed around the main entrance.',
    parking:{
      visitor:'Three visitor lots: west, east, and additional south of the loop.',
      staff:'Shared overflow in the additional south lot.'
    },
    ambulanceRoute:'East side: highway-fed emergency direct access into the ambulance bay.',
    expansionZones:['North Expansion Zone','West Expansion Zone','South Expansion Zone'],
    features:[
      'North Expansion Zone',
      'West Expansion Zone',
      'South Expansion Zone',
      'Emergency Direct Access',
      'Service/Loading Deliveries',
      'Visitor Loop Drop-Off/Pick-Up',
      'Highway Exit Access'
    ],
    recommendedFor:'Standard Hospital difficulty and first full playthroughs.',
    difficulty:{label:'Normal',rating:3},
    buildableStyle:{color:'#3b82f6',label:'Hospital building footprint'},
    background:{kind:'image',value:'assets/campus-regional-medical.png',fallbackColor:'#cfe0c8'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-regional-medical.png',cols:44,rows:26,isDefault:true,
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      // double-row road south
      for(let x=0;x<c;x++){t[r-1][x]='road';b[r-1][x]=false;t[r-2][x]='road';b[r-2][x]=false;}
      // parking strips left/right
      for(let y=2;y<r-3;y++){t[y][0]='parking';b[y][0]=false;t[y][c-1]='parking';b[y][c-1]=false;}
      _carveTerrain(b,t,1,0,2,2,'tree');_carveTerrain(b,t,c-3,0,2,2,'tree');
      return{buildable:b,terrain:t};
    },
    entranceEdges:['south'],
    accessEdges:{front:['south'],staff:['south'],ambulance:['south'],service:['south']},
    starter:{
      // Regional: south-facing FE pressed up against the road, classic centered seed.
      rooms:[{type:'front_entrance',c:14,r:23},{type:'waiting_room',c:10,r:11},{type:'gp',c:10,r:8},{type:'gp',c:15,r:8},{type:'bathroom',c:15,r:11}],
      corridors:[{x:10,y:10},{x:11,y:10},{x:12,y:10},{x:13,y:10},{x:14,y:10},{x:15,y:10},{x:16,y:10},{x:14,y:11},{x:14,y:12},{x:14,y:13},{x:14,y:14},{x:14,y:15},{x:14,y:16},{x:14,y:17},{x:14,y:18},{x:14,y:19},{x:14,y:20},{x:14,y:21},{x:14,y:22}]
    },
    startTweaks:{cashMult:1.1}
  },
  asherville_community_hospital:{
    id:'asherville_community_hospital',name:'Asherville Community Hospital',shortName:'Asherville',icon:'🌲',color:'#10b981',
    subtitle:'Community hospital campus',theme:'Community hospital campus',
    desc:'A clean, community-focused hospital campus with a simple main entrance, clear visitor parking, staff parking, a pond/green space, and a dedicated emergency entrance. Supports the Asherville public care agreement theme.',
    traits:['+10% Asherville Trust','+5% community grant approval','Lower early-game stress'],
    bonuses:[
      '+10% Asherville Trust gain from public care',
      '+5% grant approval for community/public care grants',
      'Slightly lower early-game stress'
    ],
    drawbacks:[
      'Fewer expansion zones than the regional map',
      'Lower private specialty appeal than downtown or university maps'
    ],
    playstyle:'Public-care focused — best for learning the game and community-driven hospitals.',
    parkingNotes:'Visitor parking on the right, staff parking on the left.',
    parking:{
      visitor:'Right-side visitor lot near the main entrance.',
      staff:'Left-side staff lot, separated from visitor flow.'
    },
    ambulanceRoute:'Upper road into the emergency entrance on the upper right.',
    expansionZones:['Rear (north) green strip — small but available'],
    features:[
      'Staff Parking',
      'Visitor Parking',
      'Service Access',
      'Emergency Entrance',
      'Ambulance Access',
      'Community Green Space'
    ],
    recommendedFor:'Guided Clinic difficulty, tutorial, and the Traditional Community Hospital path.',
    difficulty:{label:'Easy',rating:1},
    buildableStyle:{color:'#3b82f6',label:'Hospital building footprint'},
    background:{kind:'image',value:'assets/campus-asherville-community.png',fallbackColor:'#cfe0c8'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-asherville-community.png',cols:44,rows:26,defaultFor:'tutorial',
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      // pond NE quadrant — irregular oval
      for(let y=0;y<6;y++)for(let x=c-8;x<c;x++){
        const dx=(x-(c-4))/4, dy=(y-2.5)/2.5;
        if(dx*dx+dy*dy<=1){t[y][x]='water';b[y][x]=false;}
      }
      for(let x=0;x<c;x++){t[r-1][x]='road';b[r-1][x]=false;}
      [[2,1],[3,2],[1,4],[5,1],[1,8],[2,12]].forEach(([x,y])=>{if(b[y]?.[x]!==false){t[y][x]='tree';b[y][x]=false;}});
      return{buildable:b,terrain:t};
    },
    entranceEdges:['south'],
    accessEdges:{front:['south'],staff:['south'],ambulance:['south'],service:['south']},
    starter:{
      // Suburban: pond pinches NE — seed shifts west and adds a staff room.
      rooms:[{type:'front_entrance',c:11,r:24},{type:'waiting_room',c:7,r:12},{type:'gp',c:7,r:9},{type:'staff_room',c:12,r:9},{type:'bathroom',c:12,r:12}],
      corridors:[{x:7,y:11},{x:8,y:11},{x:9,y:11},{x:10,y:11},{x:11,y:11},{x:12,y:11},{x:13,y:11},{x:11,y:12},{x:11,y:13},{x:11,y:14},{x:11,y:15},{x:11,y:16},{x:11,y:17},{x:11,y:18},{x:11,y:19},{x:11,y:20},{x:11,y:21},{x:11,y:22},{x:11,y:23}]
    },
    startTweaks:{repBonus:5}
  },
  riverside_district:{
    id:'riverside_district',name:'Riverside District',shortName:'Riverside',icon:'⚓',color:'#0891b2',
    subtitle:'Waterfront hospital campus',theme:'Waterfront hospital campus',
    desc:'A scenic hospital campus built near water with a large buildable zone, visitor parking, service entrance, emergency entrance, and green space. The waterfront location boosts reputation but limits expansion flexibility.',
    traits:['+5% reputation','+10% private appeal','Waterfront limits expansion'],
    bonuses:[
      '+5% reputation gain from patient satisfaction',
      '+10% private/visitor appeal',
      'Better for wellness, fertility, university, or private specialty services'
    ],
    drawbacks:[
      'Expansion is more limited due to water boundary',
      'Emergency routes can be longer or more sensitive to congestion',
      'Construction costs slightly higher because of waterfront zoning'
    ],
    playstyle:'Prestige & patient satisfaction — premium care in a tight footprint.',
    parkingNotes:'Staff parking on the left, visitor parking on the right — large dual lots.',
    parking:{
      visitor:'Right-side visitor lot near the main entrance loop.',
      staff:'Left-side staff lot, separated from visitor flow.'
    },
    ambulanceRoute:'Right-side ambulance access road into the upper-right emergency entrance.',
    expansionZones:['Rear (north) road frontage — limited'],
    features:[
      'Waterfront Path',
      'Green Space',
      'Visitor Drop-Off',
      'Dual Parking Lots',
      'Emergency Entrance',
      'Service Entrance'
    ],
    recommendedFor:'Private Specialty Care, Women’s Health & Family Care, and University Hospital paths.',
    difficulty:{label:'Normal',rating:3},
    buildableStyle:{color:'#c8a96a',label:'Hospital buildable area'},
    background:{kind:'image',value:'assets/campus-riverside-district.png',fallbackColor:'#cde6dd'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-riverside-district.png',cols:44,rows:26,
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      for(let y=0;y<r;y++){
        const w=4+Math.round(Math.sin(y*0.55)*1.2);
        for(let x=0;x<w;x++){t[y][x]='water';b[y][x]=false;}
      }
      for(let y=0;y<r;y++){t[y][c-1]='road';b[y][c-1]=false;t[y][c-2]='road';b[y][c-2]=false;}
      return{buildable:b,terrain:t};
    },
    entranceEdges:['east'],
    accessEdges:{front:['east'],staff:['east'],ambulance:['east'],service:['east']},
    starter:{
      // Waterfront: east-facing FE adjacent to the harbor road; corridor routes east of waiting room to avoid overlap.
      rooms:[{type:'front_entrance',c:40,r:8},{type:'waiting_room',c:20,r:6},{type:'nurse_station',c:20,r:3},{type:'gp',c:14,r:3},{type:'bathroom',c:14,r:6}],
      corridors:[{x:14,y:5},{x:15,y:5},{x:16,y:5},{x:17,y:5},{x:18,y:5},{x:19,y:5},{x:20,y:5},{x:21,y:5},{x:22,y:5},{x:23,y:5},{x:24,y:5},{x:25,y:5},{x:24,y:6},{x:24,y:7},{x:24,y:8},{x:25,y:8},{x:26,y:8},{x:27,y:8},{x:28,y:8},{x:29,y:8},{x:30,y:8},{x:31,y:8},{x:32,y:8},{x:33,y:8},{x:34,y:8},{x:35,y:8},{x:36,y:8},{x:37,y:8},{x:38,y:8},{x:39,y:8}]
    },
    startTweaks:{supplyMult:0.9}
  },
  hillside_health_medical_campus:{
    id:'hillside_health_medical_campus',name:'Hillside Health Medical Campus',shortName:'Hillside',icon:'⛰️',color:'#a16207',
    subtitle:'Hillside/coastal elevated campus',theme:'Hillside/coastal elevated campus',
    desc:'A dramatic hillside medical campus built on elevated terrain with terraced roads, scenic views, a dedicated ambulance route, and limited flat buildable land. Rewards careful planning and strong operations.',
    traits:['+10% prestige','Protected ER route','+15% construction cost'],
    bonuses:[
      '+10% reputation/prestige from scenic campus',
      'Emergency route is protected from normal visitor traffic',
      'Strong fit for high-end/private or research hospitals'
    ],
    drawbacks:[
      'Construction costs +15%',
      'Expansion costs +20%',
      'Service/loading delays more likely unless Operations is upgraded',
      'Fewer easy expansion zones'
    ],
    playstyle:'Logistics & emergency routing — careful planning rewarded; harder map.',
    parkingNotes:'Combined staff & visitor parking on the left; additional visitor parking on the right.',
    parking:{
      visitor:'Right-side visitor lot, plus shared lot on the left.',
      staff:'Combined staff & visitor lot on the left.'
    },
    ambulanceRoute:'Dedicated red ambulance route climbing from the lower left into the left-side emergency entrance and ambulance bay.',
    expansionZones:['North expansion zone (future build) — single terraced plot'],
    features:[
      'Dedicated Ambulance Route',
      'Retaining Wall/Terrace',
      'Elevated Buildable Zone',
      'Service Access',
      'Staff Parking',
      'Scenic Campus Bonus'
    ],
    recommendedFor:'Public Pressure difficulty, experienced players, AI Hospital, Research/University, or Private Specialty paths.',
    difficulty:{label:'Advanced',rating:4},
    buildableStyle:{color:'#c8a96a',label:'Elevated buildable plateau'},
    background:{kind:'image',value:'assets/campus-hillside-health.png',fallbackColor:'#dad0bd'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-hillside-health.png',cols:44,rows:26,
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      // jagged cliff west
      for(let y=0;y<r;y++){
        const w=3+(y%4===0?1:0)+(y%3===0?1:0);
        for(let x=0;x<w;x++){t[y][x]='cliff';b[y][x]=false;}
      }
      for(let y=0;y<r;y++){t[y][c-1]='road';b[y][c-1]=false;}
      [[c-4,2],[c-6,4],[c-3,15]].forEach(([x,y])=>{if(b[y]?.[x]!==false){t[y][x]='tree';b[y][x]=false;}});
      return{buildable:b,terrain:t};
    },
    entranceEdges:['east'],
    accessEdges:{front:['east'],staff:['east'],ambulance:['east'],service:['east']},
    starter:{
      // Hillside: east FE pressed against valley road; corridor routes east of waiting room.
      rooms:[{type:'front_entrance',c:41,r:10},{type:'waiting_room',c:20,r:8},{type:'gp',c:20,r:5},{type:'gp',c:14,r:5},{type:'lunch_room',c:14,r:8}],
      corridors:[{x:14,y:7},{x:15,y:7},{x:16,y:7},{x:17,y:7},{x:18,y:7},{x:19,y:7},{x:20,y:7},{x:21,y:7},{x:22,y:7},{x:23,y:7},{x:24,y:7},{x:25,y:7},{x:26,y:7},{x:26,y:8},{x:26,y:9},{x:26,y:10},{x:27,y:10},{x:28,y:10},{x:29,y:10},{x:30,y:10},{x:31,y:10},{x:32,y:10},{x:33,y:10},{x:34,y:10},{x:35,y:10},{x:36,y:10},{x:37,y:10},{x:38,y:10},{x:39,y:10},{x:40,y:10}]
    },
    startTweaks:{cashMult:0.95}
  },
  riverdale_university_health_campus:{
    id:'riverdale_university_health_campus',name:'Riverdale University Health Campus',shortName:'University',icon:'🎓',color:'#7c3aed',
    subtitle:'University medical campus',theme:'University medical campus',
    desc:'A hospital campus connected to academic and research buildings, with an academic quad, student health demand, research partnerships, staff parking, visitor parking, service access, and a dedicated emergency route.',
    traits:['+15% research','+10% education grants','Faster intern XP'],
    bonuses:[
      '+15% Research Point generation',
      '+10% university/education grant approval',
      'Interns/residents gain XP faster',
      'Auditorium and Student Medical Center generate more value on this map'
    ],
    drawbacks:[
      'Student surges can increase patient volume during academic terms',
      'Training mistake events are more likely',
      'Administrative complexity increases slightly'
    ],
    playstyle:'Teaching & research — push research and student-facing rooms.',
    parkingNotes:'Two parking lots flanking the main entrance drop-off.',
    parking:{
      visitor:'Two ground-level visitor lots flanking the main entrance loop.',
      staff:'Shared with visitors in both flanking lots.'
    },
    ambulanceRoute:'Right-side ambulance access road into the upper-right emergency entrance.',
    expansionZones:['South green space (limited)','East-side service annex'],
    features:[
      'Academic & Research Buildings',
      'Academic Quad',
      'Student Health Demand',
      'University Partnership',
      'Emergency Only Access',
      'Service Access & Loading'
    ],
    recommendedFor:'University Hospital path, Research & University floor specialization, Auditorium, Student Center, Clinical Trials, Residency Program.',
    difficulty:{label:'Normal / Advanced',rating:3.5},
    buildableStyle:{color:'#a78bfa',label:'University buildable zone'},
    background:{kind:'image',value:'assets/campus-riverdale-university.png',fallbackColor:'#d6cfe7'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-riverdale-university.png',cols:44,rows:26,
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      // river N — irregular band rows 0..2
      for(let x=0;x<c;x++){
        const top=Math.round(2+Math.sin(x*0.45)*0.8);
        for(let y=0;y<top;y++){t[y][x]='water';b[y][x]=false;}
      }
      for(let x=0;x<c;x++){t[r-1][x]='road';b[r-1][x]=false;}
      return{buildable:b,terrain:t};
    },
    entranceEdges:['south'],
    accessEdges:{front:['south'],staff:['south'],ambulance:['south'],service:['south']},
    starter:{
      // Riverdale: teaching hospital — includes a research department; FE adjacent to the road.
      rooms:[{type:'front_entrance',c:14,r:24},{type:'waiting_room',c:10,r:12},{type:'gp',c:10,r:9},{type:'research_department',c:15,r:9},{type:'bathroom',c:21,r:12}],
      corridors:[{x:10,y:11},{x:11,y:11},{x:12,y:11},{x:13,y:11},{x:14,y:11},{x:15,y:11},{x:16,y:11},{x:17,y:11},{x:18,y:11},{x:19,y:11},{x:20,y:11},{x:21,y:11},{x:14,y:12},{x:14,y:13},{x:14,y:14},{x:14,y:15},{x:14,y:16},{x:14,y:17},{x:14,y:18},{x:14,y:19},{x:14,y:20},{x:14,y:21},{x:14,y:22},{x:14,y:23}]
    },
    startTweaks:{researchBonus:50}
  },
  downtown_core:{
    id:'downtown_core',name:'Downtown Core',shortName:'Downtown',icon:'🏙️',color:'#dc2626',
    subtitle:'Dense urban hospital site',theme:'Dense urban hospital site',
    desc:'A compact urban hospital site surrounded by city streets, limited space, high patient volume, high public demand, and strong access to contracts. Profitable but stressful.',
    traits:['+15% patient volume','+10% contracts','+15% construction cost'],
    bonuses:[
      '+15% patient volume',
      '+10% insurance contract availability',
      '+10% public care demand and public visibility',
      'Better contract opportunities'
    ],
    drawbacks:[
      'Parking/crowding pressure rises faster',
      'Construction and renovation costs +15%',
      'Public care failures hurt reputation more',
      'Expansion is limited and expensive'
    ],
    playstyle:'High-pressure urban — high volume, build vertically.',
    parkingNotes:'Very limited on-site parking — patients lean on city garages and transit.',
    parking:{
      visitor:'Limited curb stalls — most patients use off-site city garages.',
      staff:'Off-site — transit subsidy (flavor).'
    },
    ambulanceRoute:'Dedicated north avenue — fast but congestion-sensitive.',
    expansionZones:['Central core only','Vertical floors via elevator/staircase (expensive)'],
    features:[
      'Limited Parking',
      'High Foot Traffic',
      'City Street Emergency Access',
      'Service Alley',
      'Vertical Expansion Emphasis',
      'Public Visibility'
    ],
    recommendedFor:'Experienced players, Public Pressure difficulty, government/public care challenge, CEO/board strategy, high-density hospital planning.',
    difficulty:{label:'Hard',rating:5},
    buildableStyle:{color:'#e5cfcf',label:'Urban infill plot'},
    background:{kind:'image',value:'assets/campus-downtown.png',fallbackColor:'#e5cfcf'},
    unlock:{type:'always',label:'Always available'},
    image:'assets/campus-downtown.png',cols:44,rows:26,
    build(c,r){
      const b=Array.from({length:r},()=>Array(c).fill(true));
      const t=Array.from({length:r},()=>Array(c).fill('grass'));
      for(let x=0;x<c;x++){t[0][x]='road';b[0][x]=false;t[r-1][x]='road';b[r-1][x]=false;}
      for(let y=0;y<r;y++){t[y][0]='road';b[y][0]=false;}
      // sidewalks
      for(let x=1;x<c;x++){t[1][x]='parking';b[1][x]=false;t[r-2][x]='parking';b[r-2][x]=false;}
      for(let y=1;y<r-1;y++){t[y][1]='parking';b[y][1]=false;}
      return{buildable:b,terrain:t};
    },
    entranceEdges:['north','south','west'],
    accessEdges:{front:['south'],staff:['west'],ambulance:['north'],service:['west']},
    starter:{
      // Downtown: very tight footprint; FE pressed against south sidewalk-then-road.
      rooms:[{type:'front_entrance',c:14,r:23},{type:'waiting_room',c:10,r:11},{type:'gp',c:10,r:8},{type:'gp',c:15,r:8},{type:'bathroom',c:15,r:11}],
      corridors:[{x:10,y:10},{x:11,y:10},{x:12,y:10},{x:13,y:10},{x:14,y:10},{x:15,y:10},{x:16,y:10},{x:14,y:11},{x:14,y:12},{x:14,y:13},{x:14,y:14},{x:14,y:15},{x:14,y:16},{x:14,y:17},{x:14,y:18},{x:14,y:19},{x:14,y:20},{x:14,y:21},{x:14,y:22}]
    },
    startTweaks:{repBonus:10}
  }
};
// Back-compat: older saves and code paths may reference 'regional'.
const _CAMPUS_ALIASES={regional:'regional_medical_center',suburban:'asherville_community_hospital',waterfront:'riverside_district',hillside:'hillside_health_medical_campus',riverdale:'riverdale_university_health_campus',downtown:'downtown_core',flat:'greenfield_valley'};
function getCampus(id){
  if(id&&_CAMPUS_ALIASES[id])id=_CAMPUS_ALIASES[id];
  return CAMPUSES[id]||CAMPUSES.regional_medical_center;
}
// Data-driven map API. CAMPUSES is the canonical store; MAP_DEFS is a stable
// alias other systems / future tools can target without knowing the legacy
// "campus" naming.
const MAP_DEFS=CAMPUSES;
// Standardized gameplay modifiers per map. Surfaced to the player in the
// New Game picker and applied at runtime by getMapBonus() consumers below.
const _MAP_MODIFIER_DEFAULTS={
  difficultyRating:3,theme:'general',
  patientVolumeMultiplier:1,
  expansionCostMultiplier:1,
  constructionCostMultiplier:1,
  renovationCostMultiplier:1,
  governmentPressureMultiplier:1,
  publicCareDemandMultiplier:1,
  insuranceOpportunityMultiplier:1,
  emergencyAccessQuality:'standard',
  parkingPressureMultiplier:1,
  researchMultiplier:1,
  recommendedPlaystyle:'Balanced'
};
const _MAP_MODIFIER_OVERRIDES={
  asherville_community_hospital:{
    difficultyRating:1,theme:'community',
    patientVolumeMultiplier:0.95,expansionCostMultiplier:1.10,
    constructionCostMultiplier:0.95,renovationCostMultiplier:0.95,
    governmentPressureMultiplier:0.85,publicCareDemandMultiplier:1.10,
    insuranceOpportunityMultiplier:0.85,emergencyAccessQuality:'standard',
    parkingPressureMultiplier:0.90,researchMultiplier:0.90,
    recommendedPlaystyle:'Public-care community hospital'
  },
  regional_medical_center:{
    difficultyRating:2,theme:'suburban',
    patientVolumeMultiplier:1.00,expansionCostMultiplier:0.95,
    constructionCostMultiplier:1.00,renovationCostMultiplier:1.00,
    governmentPressureMultiplier:1.00,publicCareDemandMultiplier:1.00,
    insuranceOpportunityMultiplier:1.00,emergencyAccessQuality:'good',
    parkingPressureMultiplier:1.00,researchMultiplier:1.00,
    recommendedPlaystyle:'Balanced general hospital'
  },
  riverside_district:{
    difficultyRating:2.5,theme:'waterfront',
    patientVolumeMultiplier:1.00,expansionCostMultiplier:1.15,
    constructionCostMultiplier:1.10,renovationCostMultiplier:1.10,
    governmentPressureMultiplier:1.00,publicCareDemandMultiplier:0.95,
    insuranceOpportunityMultiplier:1.10,emergencyAccessQuality:'standard',
    parkingPressureMultiplier:1.05,researchMultiplier:1.00,
    recommendedPlaystyle:'Prestige & private specialty'
  },
  hillside_health_medical_campus:{
    difficultyRating:4,theme:'elevated',
    patientVolumeMultiplier:0.95,expansionCostMultiplier:1.20,
    constructionCostMultiplier:1.15,renovationCostMultiplier:1.15,
    governmentPressureMultiplier:1.00,publicCareDemandMultiplier:1.00,
    insuranceOpportunityMultiplier:1.05,emergencyAccessQuality:'excellent',
    parkingPressureMultiplier:1.10,researchMultiplier:1.05,
    recommendedPlaystyle:'Logistics-focused premium hospital'
  },
  riverdale_university_health_campus:{
    difficultyRating:3.5,theme:'university',
    patientVolumeMultiplier:1.05,expansionCostMultiplier:1.05,
    constructionCostMultiplier:1.05,renovationCostMultiplier:1.00,
    governmentPressureMultiplier:1.00,publicCareDemandMultiplier:1.00,
    insuranceOpportunityMultiplier:1.00,emergencyAccessQuality:'good',
    parkingPressureMultiplier:1.05,researchMultiplier:1.20,
    recommendedPlaystyle:'Teaching & research'
  },
  downtown_core:{
    difficultyRating:5,theme:'urban',
    patientVolumeMultiplier:1.20,expansionCostMultiplier:1.25,
    constructionCostMultiplier:1.15,renovationCostMultiplier:1.15,
    governmentPressureMultiplier:1.15,publicCareDemandMultiplier:1.15,
    insuranceOpportunityMultiplier:1.15,emergencyAccessQuality:'congested',
    parkingPressureMultiplier:1.40,researchMultiplier:1.00,
    recommendedPlaystyle:'High-volume urban hospital'
  },
  greenfield_valley:{
    difficultyRating:1,theme:'rural',
    patientVolumeMultiplier:0.85,expansionCostMultiplier:0.85,
    constructionCostMultiplier:0.90,renovationCostMultiplier:0.95,
    governmentPressureMultiplier:0.95,publicCareDemandMultiplier:0.90,
    insuranceOpportunityMultiplier:0.85,emergencyAccessQuality:'standard',
    parkingPressureMultiplier:0.80,researchMultiplier:0.95,
    recommendedPlaystyle:'Sandbox / creative builder'
  }
};
Object.keys(MAP_DEFS).forEach(id=>{
  MAP_DEFS[id].mapModifiers=Object.assign({},
    _MAP_MODIFIER_DEFAULTS,
    _MAP_MODIFIER_OVERRIDES[id]||{},
    {id,name:MAP_DEFS[id].name});
});
function getMapBonus(id){
  const camp=getCampus(id||(typeof selectedCampusId!=='undefined'?selectedCampusId:null));
  return (camp&&camp.mapModifiers)||_MAP_MODIFIER_DEFAULTS;
}
window.getMapBonus=getMapBonus;
function getMapDef(id){return getCampus(id);}
function listMapDefs(includeSandbox){
  const all=Object.values(MAP_DEFS);
  return all;
}
// Unlock gate. Today every map but `flat` (sandbox-only) is always available;
// the helper exists so future content can flip individual maps to e.g.
// {type:'reputation',value:80} or {type:'campaign',value:'chapter-3'}.
function isMapUnlocked(id,mode){
  const camp=getCampus(id); if(!camp) return false;
  const u=camp.unlock||{type:'always'};
  if(u.type==='sandbox-only') return mode==='sandbox';
  if(u.type==='always') return true;
  if(u.type==='reputation') return (typeof reputation==='number')&&reputation>=(u.value||0);
  return true;
}
window.isMapUnlocked=isMapUnlocked;
// Derive entrance / emergency / service / parking cell coords from
// accessEdges so every map exposes the same shape, even ones that haven't
// been hand-tuned. Safe placeholders — never throws.
function getMapEntrancePoints(id){
  const camp=getCampus(id); if(!camp) return null;
  const c=camp.cols, r=camp.rows;
  const ae=camp.accessEdges||{front:['south'],staff:['south'],ambulance:['south'],service:['south']};
  const pickEdgeCell=(edge,offset)=>{
    const cx=Math.floor(c/2), cy=Math.floor(r/2);
    const off=offset||0;
    if(edge==='north') return {c:Math.min(c-1,Math.max(0,cx+off)),r:1};
    if(edge==='south') return {c:Math.min(c-1,Math.max(0,cx+off)),r:r-2};
    if(edge==='east')  return {c:c-2,r:Math.min(r-1,Math.max(0,cy+off))};
    if(edge==='west')  return {c:1,  r:Math.min(r-1,Math.max(0,cy+off))};
    return {c:cx,r:r-2};
  };
  const firstEdge=k=>(Array.isArray(ae[k])&&ae[k][0])||(Array.isArray(ae.front)&&ae.front[0])||'south';
  return {
    public:    camp.entrancePoints?.public    || pickEdgeCell(firstEdge('front'),0),
    emergency: camp.entrancePoints?.emergency || pickEdgeCell(firstEdge('ambulance'),3),
    service:   camp.entrancePoints?.service   || pickEdgeCell(firstEdge('service'),-3),
    staff:     camp.entrancePoints?.staff     || pickEdgeCell(firstEdge('staff'),-1)
  };
}
window.MAP_DEFS=MAP_DEFS;
window.getMapDef=getMapDef;
window.listMapDefs=listMapDefs;
window.getMapEntrancePoints=getMapEntrancePoints;
function applyCampus(id){
  const camp=getCampus(id);
  selectedCampusId=camp.id;
  COLS=camp.cols;ROWS=camp.rows;
  const m=camp.build(COLS,ROWS);
  buildableMask=m.buildable;terrainMask=m.terrain;
  // Rebuild floor grids to the new ROWS/COLS BEFORE any render path runs, so
  // resizeCanvasForCampus -> applyZoom -> render() doesn't index a stale grid.
  if(typeof floorGrids!=='undefined'){
    floorGrids=makeFloorGrids();
    if(typeof syncActiveGrid==='function')syncActiveGrid();
  }
  resizeCanvasForCampus();
}
function makeFloorGrids(){return Array.from({length:MAX_FLOORS},()=>makeEmptyGrid());}
function makeFloorSpecializations(){return Object.fromEntries(Array.from({length:MAX_FLOORS},(_,idx)=>[idx+1,idx===0?'general_patient_care':'unchosen']));}
function _floorGridIsEmpty(g){
  if(!Array.isArray(g))return true;
  for(const row of g){if(!Array.isArray(row))continue;for(const cell of row){if(cell)return false;}}
  return true;
}
function migrateFloorSpecializations(raw,floorGrids,savedVersion){
  const out=makeFloorSpecializations();
  if(!raw||typeof raw!=='object')return out;
  let migrated=0;
  const remappedFloors=[];
  for(let f=1;f<=MAX_FLOORS;f++){
    const k=raw[f];
    if(!k)continue;
    let resolved=null;
    if(FLOOR_SPECIALIZATIONS[k])resolved=k;
    else{
      const remap=FLOOR_SPEC_LEGACY_MAP[k];
      if(remap&&FLOOR_SPECIALIZATIONS[remap]){
        resolved=remap;
        migrated++;
        remappedFloors.push(`F${f} ${k}→${remap}`);
      }
    }
    // Per task spec: any stored-but-unknown floor spec falls back to
    // General Patient Care (never silently to "unchosen", which would block
    // building on that floor).
    if(!resolved&&k&&k!=='unchosen')resolved='general_patient_care';
    if(!resolved)continue;
    out[f]=resolved;
  }
  // Floor 1 is never re-prompted on existing saves: an unchosen Floor 1
  // becomes General Patient Care silently.
  if(out[1]==='unchosen')out[1]='general_patient_care';
  if(migrated>0&&typeof addLog==='function'){
    const detail=remappedFloors.slice(0,4).join(', ')+(remappedFloors.length>4?'…':'');
    setTimeout(()=>addLog(`Save migrated to v1.24 floor specializations: ${migrated} remapped (${detail}).`,'w'),60);
  }
  return out;
}

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
  parking_expansion:{name:'Parking Expansion',color:'#e0e6ee',border:'#6f7a8a',cost:1800,w:3,h:2,cap:0,icon:'PK',rev:0,tt:0,staffRole:null},
  staff_parking:{name:'Staff Parking',color:'#dde8d6',border:'#6e8a4f',cost:1500,w:2,h:2,cap:0,icon:'SP',rev:0,tt:0,staffRole:null},
  service_loading_dock:{name:'Service Loading Dock',color:'#e8dec9',border:'#8a7a5a',cost:2000,w:3,h:2,cap:0,icon:'SL',rev:0,tt:0,staffRole:null},
  traffic_management_office:{name:'Traffic Management Office',color:'#cfe0ff',border:'#3f6ab3',cost:2400,w:2,h:2,cap:0,icon:'TM',rev:0,tt:0,staffRole:'clerical'},
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
  cosmetic_consult_office:{name:'Cosmetic Consultation Office',color:'#ffe1f1',border:'#c860a0',cost:3200,w:2,h:2,cap:1,icon:'CC',rev:520,tt:3,staffRole:'surgeon',supportRoles:['clerical']},
  plastic_surgery_or:{name:'Plastic Surgery OR',color:'#ffd9ec',border:'#c860a0',cost:8800,w:3,h:3,cap:1,icon:'OR',rev:1900,tt:8,staffRole:'surgeon',supportRoles:['nurse']},
  cosmetic_recovery_suite:{name:'Cosmetic Recovery Suite',color:'#ffe7f4',border:'#c860a0',cost:3600,w:3,h:2,cap:2,icon:'CR',rev:520,tt:5,staffRole:'nurse',supportRoles:['cna']},
  aesthetic_procedure_room:{name:'Aesthetic Procedure Room',color:'#ffe1f1',border:'#c860a0',cost:5400,w:2,h:2,cap:1,icon:'AP',rev:980,tt:5,staffRole:'surgeon',supportRoles:['nurse']},
  premium_waiting_lounge:{name:'Premium Waiting Lounge',color:'#ffefe8',border:'#c860a0',cost:2600,w:3,h:2,cap:6,icon:'PW',rev:0,tt:0,staffRole:null},
  student_health_clinic:{name:'Student Health Clinic',color:'#cfe5d8',border:'#5d9a78',cost:3800,w:3,h:2,cap:5,icon:'SH',rev:180,tt:3,staffRole:'gp_doc',supportRoles:['nurse','clerical']},
  counseling_center:{name:'Counseling Center',color:'#d8ecdf',border:'#5d9a78',cost:3200,w:2,h:2,cap:2,icon:'CN',rev:160,tt:5,staffRole:'gp_doc',supportRoles:['nurse']},
  sports_medicine_office:{name:'Sports Medicine Office',color:'#d4ecdb',border:'#5d9a78',cost:3400,w:2,h:2,cap:2,icon:'SM',rev:220,tt:4,staffRole:'gp_doc',supportRoles:['nurse']},
  vaccination_clinic:{name:'Vaccination Clinic',color:'#d4ecdb',border:'#5d9a78',cost:2400,w:2,h:2,cap:3,icon:'VX',rev:140,tt:2,staffRole:'nurse',supportRoles:['clerical']},
  teaching_intern_office:{name:'Teaching/Intern Office',color:'#dceadb',border:'#5d9a78',cost:2800,w:2,h:2,cap:2,icon:'TI',rev:0,tt:0,staffRole:'intern'},
  donor_screening_office:{name:'Donor Screening Office',color:'#cfe5f5',border:'#3f7fb0',cost:3600,w:2,h:2,cap:2,icon:'DS',rev:280,tt:4,staffRole:'dept_attending',supportRoles:['nurse']},
  cryogenic_storage:{name:'Cryogenic Storage Room',color:'#cfe5f5',border:'#3f7fb0',cost:6800,w:3,h:2,cap:0,icon:'CY',rev:0,tt:0,staffRole:'dept_attending'},
  andrology_lab:{name:'Andrology Lab',color:'#cfe5f5',border:'#3f7fb0',cost:5400,w:3,h:2,cap:1,icon:'AL',rev:480,tt:5,staffRole:'dept_attending',supportRoles:['nurse']},
  fertility_records_office:{name:'Fertility Records Office',color:'#dde9f5',border:'#3f7fb0',cost:2200,w:2,h:2,cap:1,icon:'FR',rev:0,tt:0,staffRole:'clerical'},
  fertility_consult_office:{name:'Fertility Consultation Office',color:'#e3d6f5',border:'#7d57b0',cost:3800,w:2,h:2,cap:1,icon:'FC',rev:580,tt:4,staffRole:'dept_attending',supportRoles:['nurse']},
  ivf_procedure_room:{name:'IVF Procedure Room',color:'#e3d6f5',border:'#7d57b0',cost:8800,w:3,h:3,cap:1,icon:'IV',rev:1700,tt:8,staffRole:'surgeon',supportRoles:['nurse']},
  embryology_lab_room:{name:'Embryology Lab',color:'#ddd0f0',border:'#7d57b0',cost:7200,w:3,h:2,cap:1,icon:'EL',rev:1200,tt:6,staffRole:'dept_attending',supportRoles:['nurse']},
  ivf_recovery_room:{name:'IVF Recovery Room',color:'#ebe1f5',border:'#7d57b0',cost:3400,w:3,h:2,cap:2,icon:'IR',rev:340,tt:5,staffRole:'nurse',supportRoles:['cna']},
  prisoner_wing:{name:'Prisoner Treatment Wing',color:'#cfd2d8',border:'#525866',cost:9200,w:10,h:5,cap:6,icon:'PW',rev:0,tt:0,staffRole:null,firstFloorOnly:true},
  auditorium:{name:'Auditorium / Conference Center',color:'#f1e5cf',border:'#946d2c',cost:11800,w:10,h:6,cap:0,icon:'AU',rev:0,tt:0,staffRole:null,firstFloorOnly:true},
};
const RENOVATION_EXEMPT_TYPES=new Set(['vending_machine','drink_station','atm_kiosk','parking_expansion','staff_parking','service_loading_dock']);
const ROOM_ESTABLISHED_DAYS=90;
const FLOOR_RENOVATION_DAYS=30;
const FLOOR_RENOVATION_SPEED_MULT=0.33;
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
  cosmetic_consult_office:'CCO',
  plastic_surgery_or:'POR',
  cosmetic_recovery_suite:'CRS',
  aesthetic_procedure_room:'APR',
  premium_waiting_lounge:'PWL',
  student_health_clinic:'SHC',
  counseling_center:'CCN',
  sports_medicine_office:'SMO',
  vaccination_clinic:'VAC',
  teaching_intern_office:'TIO',
  donor_screening_office:'DSO',
  cryogenic_storage:'CRY',
  andrology_lab:'ANL',
  fertility_records_office:'FRO',
  fertility_consult_office:'FCO',
  ivf_procedure_room:'IVR',
  embryology_lab_room:'EMB',
  ivf_recovery_room:'IRR',
  prisoner_wing:'PRW',
  auditorium:'AUD',
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
  cosmetic_consult_office:'💄',
  plastic_surgery_or:'💉',
  cosmetic_recovery_suite:'🛌',
  aesthetic_procedure_room:'✨',
  premium_waiting_lounge:'🛋️',
  student_health_clinic:'🎓',
  counseling_center:'🗣️',
  sports_medicine_office:'🏃',
  vaccination_clinic:'💉',
  teaching_intern_office:'📚',
  donor_screening_office:'🧾',
  cryogenic_storage:'🧊',
  andrology_lab:'🔬',
  fertility_records_office:'📁',
  fertility_consult_office:'💬',
  ivf_procedure_room:'🧬',
  embryology_lab_room:'🧫',
  ivf_recovery_room:'🛏️',
  prisoner_wing:'🚓',
  auditorium:'🎤',
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
  operations:{label:'Operations',baseCost:4000,startLevel:1,rooms:['administration','case_management','security_office','hr_office','hvac_generator'],bonus:`Lower stress and steadier cleanliness`},
  admin:{label:'Administration',baseCost:3000,startLevel:1,rooms:['head_office','grant_writer_office','administration'],bonus:`Better compliance, grants and contracts`},
  digital:{label:'Digital Infrastructure',baseCost:3500,startLevel:1,rooms:['it_department'],bonus:`Faster research and better automation`}
};
function makeDepartments(){
  return{
    er:{level:1},
    lab:{level:1},
    ward:{level:1},
    operations:{level:1},
    admin:{level:1},
    digital:{level:1}
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
const STARTING_TOOLS=['corridor','front_entrance','staff_entrance','waiting_room','nurse_station','staff_room','lunch_room','bathroom','janitor_closet','hvac_generator','research_department','grant_writer_office','vending_machine','drink_station','atm_kiosk','it_department','marketing_office','hr_office','staircase','elevator','gp','prisoner_wing','auditorium','demolish','parking_expansion','staff_parking','service_loading_dock','traffic_management_office'];
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
    id:'medicaid_partnership',
    name:'Medicaid Partnership',
    category:'public',icon:'\ud83c\udfe5',color:'#66bb6a',
    patientBoost:0.35,reimbursementMult:0.75,incomeBoost:0,stress:3,
    govCompliancePressure:-0.05,reputationGain:0.5,publicCriticismRisk:0,
    durationDays:30,
    desc:'High-volume public patients at Medicaid rates. Helps government compliance but strains capacity.',
    riskWarning:'Low reimbursement \u2014 ensure adequate staffing and capacity'
  },
  {
    id:'private_network',
    name:'Private Insurance Network',
    category:'private',icon:'\ud83e\udd1d',color:'#42a5f5',
    patientBoost:0.20,reimbursementMult:1.15,incomeBoost:0.10,stress:2,
    govCompliancePressure:0.03,reputationGain:0,publicCriticismRisk:0.10,
    durationDays:21,
    desc:'Moderate private patient flow at better reimbursement rates. Balanced risk and reward.',
    riskWarning:'Moderate pressure on government compliance'
  },
  {
    id:'city_overflow',
    name:'City Care Overflow',
    category:'public',icon:'\ud83c\udfd9',color:'#ffa726',
    patientBoost:0.55,reimbursementMult:0.65,incomeBoost:0,stress:8,
    govCompliancePressure:-0.08,reputationGain:1.5,publicCriticismRisk:0,
    durationDays:14,
    desc:'City emergency overflow \u2014 massive public patient surge at low rates. High reputation upside, high overload risk.',
    riskWarning:'\u26a0 Very high volume \u2014 serious risk of overload and staff burnout'
  },
  {
    id:'corporate_health',
    name:'Corporate Health Plan',
    category:'private',icon:'\ud83d\udcbc',color:'#ab6ff0',
    patientBoost:0.15,reimbursementMult:1.65,incomeBoost:0.25,stress:1,
    govCompliancePressure:0.10,reputationGain:-0.3,publicCriticismRisk:0.30,
    durationDays:28,
    desc:'Premium-paying corporate patients demanding top-tier care. Lucrative but puts public obligations at risk.',
    riskWarning:'\u26a0 Strong risk: government compliance becomes significantly harder'
  }
];
const STAFF_REROLL_COST=750;
const SHIFTS=['day','night'];
const SAVE_KEY='cityHospitalBuilderSaveV1';
const DEFAULT_CENTER_NAME='Community Hospital Management Sim';
const REP_LONG_WAIT_THRESHOLD=16;
const REP_UNTREATED_LEAVE_THRESHOLD=28;
const RESEARCH_TREE=[
  // -- CLINICAL CARE --
  {id:'basic_triage',name:'Basic Triage',branch:'clinical',tier:1,
   desc:'Formal ER triage protocols cut patient handling time and improve GP flow.',
   cost:30,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['basic_triage'],
   rewardText:'ER and GP treatment speed +10%'},
  {id:'rapid_assessment',name:'Rapid Assessment Unit',branch:'clinical',tier:1,
   desc:'Structured intake assessment reduces GP bottlenecks and gets patients seen faster.',
   cost:40,days:3,requires:[],unlockTools:[],unlockRoles:['cna'],unlockFeatures:['rapid_assessment'],
   rewardText:'Unlocks CNAs; GP treatment speed +10%'},
  {id:'fast_track',name:'Fast Track Care',branch:'clinical',tier:2,
   desc:'A dedicated fast-track lane clears non-urgent patients before they clog the system.',
   cost:55,days:4,requires:['basic_triage'],unlockTools:[],unlockRoles:[],unlockFeatures:['triage_protocols','fast_track'],
   rewardText:'Basic patients clear faster; longer wait tolerance'},
  {id:'icu_protocols',name:'ICU Protocols',branch:'clinical',tier:3,
   desc:'Intensive care pathways reduce ward mortality pressure and improve post-surgical recovery.',
   cost:100,days:8,requires:['fast_track','rapid_assessment'],unlockTools:[],unlockRoles:[],unlockFeatures:['icu_protocols'],
   rewardText:'Ward treatment speed +20%; stress from critical patients reduced'},
  // -- DIAGNOSTICS --
  {id:'basic_imaging',name:'Basic Imaging',branch:'diagnostics',tier:1,
   desc:'X-ray infrastructure standards improve routing accuracy and imaging throughput.',
   cost:30,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['basic_imaging'],
   rewardText:'X-Ray matters more in patient routing'},
  {id:'lab_safety_standards',name:'Lab Safety Standards',branch:'diagnostics',tier:1,
   desc:'Strict lab protocols reduce processing errors and improve daily throughput.',
   cost:25,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['lab_safety_standards'],
   rewardText:'Lab daily throughput +10%; fewer diagnostic errors'},
  {id:'faster_lab_processing',name:'Faster Lab Processing',branch:'diagnostics',tier:2,
   desc:'Streamlined workflows cut Lab and X-Ray turnaround time significantly.',
   cost:55,days:4,requires:['basic_imaging'],unlockTools:[],unlockRoles:[],unlockFeatures:['faster_lab_processing'],
   rewardText:'Lab and X-Ray treatment time reduced'},
  {id:'pharmacy_integration',name:'Pharmacy Integration',branch:'diagnostics',tier:2,
   desc:'Linking pharmacy data with diagnostic results speeds up prescription fulfilment.',
   cost:65,days:5,requires:['lab_safety_standards'],unlockTools:[],unlockRoles:[],unlockFeatures:['pharmacy_integration'],
   rewardText:'Pharmacy revenue +15%; prescription delays reduced'},
  {id:'automated_testing',name:'Automated Testing Protocols',branch:'diagnostics',tier:3,
   desc:'Automated assays and batch testing pipelines dramatically speed up diagnostic throughput.',
   cost:100,days:8,requires:['faster_lab_processing','pharmacy_integration'],unlockTools:[],unlockRoles:[],unlockFeatures:['automated_testing'],
   rewardText:'Diagnostic speed +25%; Lab bottlenecks significantly reduced'},
  // -- OPERATIONS --
  {id:'sterile_workflow',name:'Sterile Workflow',branch:'operations',tier:1,
   desc:'Standardized cleaning routines reduce grime buildup throughout the campus.',
   cost:50,days:3,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['sterile_workflow'],
   rewardText:'Improves daily cleanliness'},
  {id:'staff_scheduling',name:'Staff Scheduling',branch:'operations',tier:1,
   desc:'Optimized shift rotation and task assignment slows staff energy drain.',
   cost:30,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['staff_scheduling'],
   rewardText:'Staff energy drains slower'},
  {id:'fatigue_management',name:'Fatigue Management',branch:'operations',tier:2,
   desc:'Workload balancing tools reduce burnout pressure on high-stress days.',
   cost:60,days:5,requires:['staff_scheduling'],unlockTools:[],unlockRoles:[],unlockFeatures:['fatigue_management'],
   rewardText:'High-stress days cost less morale; burnout risk reduced'},
  {id:'break_optimization',name:'Break Optimization',branch:'operations',tier:2,
   desc:'Structured break schedules mean staff return to work more energized.',
   cost:55,days:4,requires:['staff_scheduling'],unlockTools:[],unlockRoles:[],unlockFeatures:['break_optimization'],
   rewardText:'Staff Room and Lunch Room restore more morale and energy'},
  {id:'burnout_prevention',name:'Burnout Prevention Program',branch:'operations',tier:3,
   desc:'Hospital-wide wellbeing program limits cumulative staff stress and prevents turnover.',
   cost:100,days:8,requires:['break_optimization','fatigue_management'],unlockTools:[],unlockRoles:[],unlockFeatures:['burnout_prevention'],
   rewardText:'Energy and morale recover faster; burnout events less frequent'},
  // -- ADMINISTRATION --
  {id:'government_compliance',name:'Government Compliance Office',branch:'administration',tier:1,
   desc:'A dedicated compliance desk reduces audit penalties and government pressure.',
   cost:30,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['government_compliance'],
   rewardText:'Government audit penalties reduced by 50%'},
  {id:'grant_research_program',name:'Grant Research Program',branch:'administration',tier:1,
   desc:'Formalizes grant prospecting and application workflows for better success rates.',
   cost:40,days:3,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['grant_research_program'],
   rewardText:'Grant approval chance +10%; extra RP from active grants'},
  {id:'contract_negotiation',name:'Contract Negotiation',branch:'administration',tier:2,
   desc:'Training your admin team in negotiation secures better terms on all contracts.',
   cost:55,days:4,requires:['government_compliance'],unlockTools:[],unlockRoles:[],unlockFeatures:['contract_negotiation'],
   rewardText:'Contract rewards +25%; insurance stress reduced'},
  {id:'insurance_optimization',name:'Insurance Optimization',branch:'administration',tier:2,
   desc:'Systematic insurance review and billing workflows reduce claim disputes.',
   cost:65,days:5,requires:['grant_research_program'],unlockTools:[],unlockRoles:[],unlockFeatures:['insurance_optimization'],
   rewardText:'Insurance stress relief +1; billing disputes reduced'},
  {id:'audit_shield',name:'Audit Shield',branch:'administration',tier:3,
   desc:'Comprehensive documentation and pre-audit preparation limits government penalties.',
   cost:100,days:8,requires:['contract_negotiation','insurance_optimization'],unlockTools:[],unlockRoles:[],unlockFeatures:['audit_shield'],
   rewardText:'Audit failure days recover faster; government penalty cap lowered'},
  // -- DIGITAL INFRASTRUCTURE --
  {id:'digital_filing',name:'Digital Filing System',branch:'digital',tier:1,
   desc:'Replacing paper records with a digital filing system boosts researcher and admin efficiency.',
   cost:35,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['digital_filing'],
   rewardText:'IT Department grants +0.5 bonus RP/day'},
  {id:'hospital_wifi',name:'Hospital-Wide Wi-Fi',branch:'digital',tier:2,identityPath:'ai',
   desc:'Campus-wide wireless connectivity lets staff access data from anywhere in the building.',
   cost:55,days:4,requires:['digital_filing'],unlockTools:[],unlockRoles:[],unlockFeatures:['hospital_wifi'],
   rewardText:'All departments get a small treatment speed bonus; IT stress reduction improved'},
  {id:'electronic_health_records',name:'Electronic Health Records',branch:'digital',tier:2,
   desc:'A unified EHR system eliminates duplicate work and speeds up patient intake and discharge.',
   cost:70,days:5,requires:['digital_filing'],unlockTools:[],unlockRoles:[],unlockFeatures:['electronic_health_records'],
   rewardText:'Patient routing accuracy improved; discharge time reduced'},
  {id:'clinical_decision_support',name:'Clinical Decision Support',branch:'digital',tier:3,
   desc:'AI-assisted alerts and decision trees guide clinical staff through complex cases faster.',
   cost:110,days:9,requires:['hospital_wifi','electronic_health_records'],unlockTools:[],unlockRoles:[],unlockFeatures:['clinical_decision_support'],
   rewardText:'Diagnostic speed +20%; high-risk patients flagged earlier'},
  // -- PATIENT ACCESS --
  {id:'care_team_program',name:'Care Team Program',branch:'access',tier:1,
   desc:'Launch the hospital training pipeline to unlock CNAs for inpatient support coverage.',
   cost:28,days:2,requires:[],unlockTools:[],unlockRoles:['cna'],unlockFeatures:[],
   rewardText:'Unlocks CNAs'},
  {id:'dispatch_network',name:'Dispatch Network',branch:'access',tier:1,
   desc:'Build a dispatch office to coordinate patient flow across the hospital.',
   cost:60,days:4,requires:[],unlockTools:['dispatch_office','ambulance_bay'],unlockRoles:['dispatcher','driver'],unlockFeatures:[],
   rewardText:'Unlocks Dispatch Office, Ambulance Bay, Dispatchers, and Drivers'},
  {id:'triage_protocols',name:'Triage Protocols',branch:'access',tier:2,
   desc:'Formal triage gives patients more time before long waits damage public trust.',
   cost:45,days:3,requires:['dispatch_network'],unlockTools:[],unlockRoles:[],unlockFeatures:['triage_protocols'],
   rewardText:'Patients tolerate longer waits'},
  {id:'discharge_planning',name:'Discharge Planning',branch:'access',tier:2,
   desc:'Structured discharge processes turn beds over faster and reduce patient backlog.',
   cost:50,days:3,requires:['care_team_program'],unlockTools:[],unlockRoles:[],unlockFeatures:['discharge_planning'],
   rewardText:'Patient discharge speed +15%; bed turnover improved'},
  {id:'public_care_standards',name:'Public Care Standards',branch:'access',tier:3,
   desc:'Formal public care commitments improve government quota compliance and community trust.',
   cost:90,days:7,requires:['triage_protocols','discharge_planning'],unlockTools:[],unlockRoles:[],unlockFeatures:['public_care_standards'],
   rewardText:'Government care quota compliance easier; public reputation bonus'}

,
  // -- COMMUNITY HOSPITAL PATH --
  {id:'community_care_charter',name:'Community Care Charter',branch:'access',tier:1,identityPath:'community',
   desc:'A formal commitment to serve the local community shapes your hospital culture and builds public trust.',
   cost:35,days:2,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['community_care_charter'],
   rewardText:'Counts toward Community Hospital identity; public trust improved'},
  {id:'social_services_desk',name:'Social Services Desk',branch:'administration',tier:2,identityPath:'community',
   desc:'A dedicated social work team connects vulnerable patients to support services and reduces avoidable readmissions.',
   cost:55,days:4,requires:['community_care_charter','government_compliance'],unlockTools:[],unlockRoles:[],unlockFeatures:['social_services_desk'],
   rewardText:'Counts toward Community Hospital identity; vulnerable patient outcomes better'},
  {id:'public_health_outreach',name:'Public Health Outreach',branch:'access',tier:2,identityPath:'community',
   desc:'A standing community outreach program runs vaccination drives, screening events, and education campaigns across the catchment area.',
   cost:55,days:4,requires:['community_care_charter'],unlockTools:[],unlockRoles:[],unlockFeatures:['public_health_outreach'],
   rewardText:'Counts toward Community Hospital identity; positive reputation gains improved'},
  {id:'regional_referral_network',name:'Regional Referral Network',branch:'access',tier:3,identityPath:'community',
   desc:'Formal referral agreements with regional clinics route public-care patients to your hospital and back to community providers smoothly.',
   cost:80,days:6,requires:['public_health_outreach','public_care_standards'],unlockTools:[],unlockRoles:[],unlockFeatures:['regional_referral_network'],
   rewardText:'Counts toward Community Hospital identity; public quota easier to meet'},
  // -- AI HOSPITAL PATH --
  {id:'staff_tablets',name:'Staff Tablets',branch:'digital',tier:2,identityPath:'ai',
   desc:'Equipping all clinical staff with tablets eliminates paper forms and enables real-time data entry at the bedside.',
   cost:60,days:4,requires:['hospital_wifi'],unlockTools:[],unlockRoles:[],unlockFeatures:['staff_tablets'],
   rewardText:'Counts toward AI Hospital identity; admin overhead reduced; staff efficiency improved'},
  {id:'ai_operations_center',name:'AI Operations Center',branch:'digital',tier:3,identityPath:'ai',
   desc:'A hospital-wide AI hub optimizes patient routing, staffing allocation, and supply ordering in real time.',
   cost:130,days:10,requires:['clinical_decision_support','staff_tablets'],unlockTools:[],unlockRoles:[],unlockFeatures:['ai_operations_center'],
   rewardText:'Counts toward AI Hospital identity; all-department efficiency improved'},
  {id:'predictive_patient_flow',name:'Predictive Patient Flow',branch:'digital',tier:3,identityPath:'ai',
   desc:'Predictive demand modelling forecasts patient arrivals and pre-allocates staff and beds before queues build.',
   cost:95,days:7,requires:['staff_tablets','electronic_health_records'],unlockTools:[],unlockRoles:[],unlockFeatures:['predictive_patient_flow'],
   rewardText:'Counts toward AI Hospital identity; waiting pressure reduced'},
  {id:'automated_triage',name:'Automated Triage',branch:'clinical',tier:3,identityPath:'ai',
   desc:'AI-driven triage at intake routes each patient to the right department instantly using vitals, history, and load data.',
   cost:90,days:7,requires:['fast_track','clinical_decision_support'],unlockTools:[],unlockRoles:[],unlockFeatures:['automated_triage'],
   rewardText:'Counts toward AI Hospital identity; ER throughput improved'},
  // -- MANUFACTURING HOSPITAL PATH --
  {id:'central_supply_standards',name:'Central Supply Standards',branch:'operations',tier:1,identityPath:'manufacturing',
   desc:'Standardized central supply procedures reduce waste, prevent stockouts, and lower procurement costs.',
   cost:40,days:3,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['central_supply_standards'],
   rewardText:'Counts toward Manufacturing Hospital identity; supply management costs reduced'},
  {id:'inhouse_supply_production',name:'In-House Supply Production',branch:'operations',tier:2,identityPath:'manufacturing',
   desc:'On-site production of consumables reduces dependence on external supply chains.',
   cost:80,days:6,requires:['central_supply_standards','sterile_workflow'],unlockTools:[],unlockRoles:[],unlockFeatures:['inhouse_supply_production'],
   rewardText:'Counts toward Manufacturing Hospital identity; supply shortages less severe'},
  {id:'biomedical_engineering_lab',name:'Biomedical Engineering Lab',branch:'operations',tier:3,identityPath:'manufacturing',
   desc:'An in-house biomedical engineering team repairs, calibrates, and prototypes medical equipment on site.',
   cost:110,days:9,requires:['inhouse_supply_production'],unlockTools:[],unlockRoles:[],unlockFeatures:['biomedical_engineering_lab'],
   rewardText:'Counts toward Manufacturing Hospital identity; equipment downtime reduced'},
  {id:'sterile_processing_department',name:'Sterile Processing Department',branch:'operations',tier:2,identityPath:'manufacturing',
   desc:'A dedicated sterile processing department reprocesses instruments and consumables in-house at industrial scale.',
   cost:70,days:5,requires:['sterile_workflow','central_supply_standards'],unlockTools:[],unlockRoles:[],unlockFeatures:['sterile_processing_department'],
   rewardText:'Counts toward Manufacturing Hospital identity; cleanliness and sterile reserves improved'},
  {id:'tools_3d_printed',name:'3D Printed Medical Tools',branch:'operations',tier:3,identityPath:'manufacturing',
   desc:'On-site additive manufacturing prints custom surgical guides, splints, and replacement parts on demand.',
   cost:100,days:8,requires:['biomedical_engineering_lab'],unlockTools:[],unlockRoles:[],unlockFeatures:['tools_3d_printed'],
   rewardText:'Counts toward Manufacturing Hospital identity; equipment replacement costs reduced'},
  // -- UNIVERSITY HOSPITAL PATH --
  {id:'teaching_hospital_charter',name:'Teaching Hospital Charter',branch:'administration',tier:1,identityPath:'university',
   desc:'Formally establishing your hospital as a teaching institution attracts residents and opens academic grant channels.',
   cost:45,days:3,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['teaching_hospital_charter'],
   rewardText:'Counts toward University Hospital identity; grants more accessible'},
  {id:'residency_program',name:'Residency Program',branch:'clinical',tier:2,identityPath:'university',
   desc:'Hosting a residency program brings motivated junior doctors who contribute to patient care and accelerate research.',
   cost:70,days:5,requires:['teaching_hospital_charter','rapid_assessment'],unlockTools:[],unlockRoles:[],unlockFeatures:['residency_program'],
   rewardText:'Counts toward University Hospital identity; staff XP gain improved'},
  {id:'clinical_trials_office',name:'Clinical Trials Office',branch:'administration',tier:2,identityPath:'university',
   desc:'A dedicated clinical trials office attracts external funding and accelerates in-house research timelines.',
   cost:65,days:4,requires:['teaching_hospital_charter','grant_research_program'],unlockTools:[],unlockRoles:[],unlockFeatures:['clinical_trials_office'],
   rewardText:'Counts toward University Hospital identity; research speed improved'},
  {id:'research_ethics_committee',name:'Research Ethics Committee',branch:'administration',tier:3,identityPath:'university',
   desc:'A formal research ethics review board legitimises clinical trials and unlocks higher-prestige academic publications.',
   cost:85,days:6,requires:['clinical_trials_office'],unlockTools:[],unlockRoles:[],unlockFeatures:['research_ethics_committee'],
   rewardText:'Counts toward University Hospital identity; trial approval and publication prestige improved'},
  // -- PRIVATE SPECIALTY PATH (placeholder) --
  {id:'private_wing_planning',name:'Private Wing Planning',branch:'administration',tier:1,identityPath:'private',
   desc:'Feasibility studies and architectural plans for a dedicated private patient wing. Foundation for the Private Specialty path.',
   cost:50,days:4,requires:[],unlockTools:[],unlockRoles:[],unlockFeatures:['private_wing_planning'],
   rewardText:'Placeholder: Private Specialty path in development'},
  {id:'vip_patient_services',name:'VIP Patient Services',branch:'access',tier:2,identityPath:'private',
   desc:'Premium amenities, dedicated staff, and concierge intake for private patients. Early step toward the Private Specialty identity.',
   cost:80,days:5,requires:['private_wing_planning'],unlockTools:[],unlockRoles:[],unlockFeatures:['vip_patient_services'],
   rewardText:'Placeholder: Private Specialty path in development'}

,
  // -- DIGITAL INFRASTRUCTURE BRANCH --
  {id:'department_workstations',name:'Department Workstations',branch:'digital',tier:2,
   desc:'Installing dedicated workstations in each clinical and admin department eliminates shared-terminal queues and speeds up all documentation.',
   cost:55,days:4,requires:['digital_filing'],unlockTools:[],unlockRoles:[],unlockFeatures:['department_workstations'],
   rewardText:'Staff efficiency improved; +1 RP/day when IT Department is operational'},
  {id:'digital_backup_system',name:'Digital Backup System',branch:'digital',tier:2,
   desc:'Automated off-site backups protect patient records from hardware failures, cyber outages, and government audits.',
   cost:60,days:4,requires:['digital_filing'],unlockTools:[],unlockRoles:[],unlockFeatures:['digital_backup_system'],
   rewardText:'Audit penalty protection improved; documentation failure risk reduced'},
  {id:'server_room_upgrade',name:'Server Room Upgrade',branch:'digital',tier:3,
   desc:'Dedicated on-site servers give every digital system a stable, fast backbone — accelerating research processing and department coordination.',
   cost:95,days:7,requires:['department_workstations','digital_backup_system'],unlockTools:[],unlockRoles:[],unlockFeatures:['server_room_upgrade'],
   rewardText:'Research speed improved; IT department output boosted; +1.5 RP/day'},
  {id:'automated_patient_flow',name:'Automated Patient Flow System',branch:'digital',tier:3,
   desc:'Smart digital triage routing directs each patient to the correct department automatically, cutting bottlenecks and reducing time-to-treatment.',
   cost:90,days:7,requires:['hospital_wifi','staff_tablets'],unlockTools:[],unlockRoles:[],unlockFeatures:['automated_patient_flow'],
   rewardText:'Waiting pressure significantly reduced; ER and discharge throughput improved'},
  {id:'predictive_operations_ai',name:'Predictive Operations AI',branch:'digital',tier:4,
   desc:'A hospital-wide predictive AI monitors all metrics in real time and surfaces warnings before problems escalate into crises.',
   cost:150,days:12,requires:['automated_patient_flow','server_room_upgrade'],unlockTools:[],unlockRoles:[],unlockFeatures:['predictive_operations_ai'],
   rewardText:'Global efficiency improved; passive stress reduced; event warnings trigger earlier'},
  // -- ADMINISTRATION (delegation unlocks) --
  {id:'hr_workflow_system',name:'HR Workflow System',branch:'administration',tier:2,
   desc:'Standardized HR workflows accelerate hiring, onboarding, and staff retention programs.',
   cost:60,days:4,requires:['government_compliance'],unlockTools:[],unlockRoles:[],unlockFeatures:['hr_workflow_system'],
   rewardText:'Unlocks HR Recruiter delegation — quit risk reduced, morale floor improves'},
  {id:'contract_review_process',name:'Contract Review Process',branch:'administration',tier:2,
   desc:'A formal review pipeline speeds up contract evaluation, reduces legal risk, and improves payout terms.',
   cost:65,days:5,requires:['contract_negotiation'],unlockTools:[],unlockRoles:[],unlockFeatures:['contract_review_process'],
   rewardText:'Unlocks Contract Analyst delegation — contract revenue +4%'},
  {id:'grant_management_platform',name:'Grant Management Platform',branch:'administration',tier:3,
   desc:'A centralized platform tracks all grant applications, deadlines, and compliance requirements.',
   cost:80,days:6,requires:['grant_research_program'],unlockTools:[],unlockRoles:[],unlockFeatures:['grant_management_platform'],
   rewardText:'Unlocks Grant Coordinator delegation — grant approval odds +4%'},
  {id:'compliance_tracking',name:'Compliance Tracking',branch:'administration',tier:2,
   desc:'Automated compliance monitoring catches government and public care requirement gaps before they become penalties.',
   cost:55,days:4,requires:['government_compliance'],unlockTools:[],unlockRoles:[],unlockFeatures:['compliance_tracking'],
   rewardText:'Unlocks Compliance Support delegation — government penalty multiplier reduced'},
  // -- OPERATIONS (delegation unlocks) --
  {id:'preventive_maintenance',name:'Preventive Maintenance',branch:'operations',tier:2,
   desc:'Scheduled maintenance rounds prevent equipment failures and reduce unplanned operational disruptions.',
   cost:50,days:3,requires:['staff_scheduling'],unlockTools:[],unlockRoles:[],unlockFeatures:['preventive_maintenance'],
   rewardText:'Unlocks Operations Coordinator delegation — passive chaos reduced'},
  {id:'operations_command_center',name:'Operations Command Center',branch:'operations',tier:3,
   desc:'A centralized dashboard gives administrators real-time visibility into all departments simultaneously.',
   cost:90,days:7,requires:['staff_scheduling','preventive_maintenance'],unlockTools:[],unlockRoles:[],unlockFeatures:['operations_command_center'],
   rewardText:'Amplifies all active delegation policies; operations coordination improved'},
  // -- PATIENT ACCESS (delegation unlocks) --
  {id:'patient_navigation_program',name:'Patient Navigation Program',branch:'access',tier:2,
   desc:'Dedicated patient navigators guide intake, routing, and discharge — reducing confusion and wait time pressure.',
   cost:55,days:4,requires:['triage_protocols'],unlockTools:[],unlockRoles:[],unlockFeatures:['patient_navigation_program'],
   rewardText:'Unlocks Patient Flow Coordinator delegation — wait pressure -1'},
  // -- LATE-STAGE SPECIALTY SERVICE LINES --
  {id:'specialty_care_strategy',name:'Specialty Care Strategy',branch:'administration',tier:3,
   desc:'Establishes the leadership framework, compliance scaffolding, and capital plan needed to launch dedicated specialty service lines beyond core hospital operations.',
   cost:90,days:7,requires:['digital_backup_system'],unlockTools:[],unlockRoles:[],unlockFeatures:['specialty_care_strategy'],
   rewardText:'Unlocks the Specialty Service Line research branch (cosmetic, campus, reproductive medicine)'},
  {id:'cosmetic_surgery_program',name:'Cosmetic Surgery Program',branch:'access',tier:3,identityPath:'private',
   desc:'A premium cosmetic surgery program leverages the private wing to attract elective patients with high willingness-to-pay.',
   cost:100,days:8,requires:['specialty_care_strategy','vip_patient_services'],unlockTools:['cosmetic_consult_office','plastic_surgery_or','cosmetic_recovery_suite','aesthetic_procedure_room','premium_waiting_lounge'],unlockRoles:[],unlockFeatures:['cosmetic_surgery_program'],
   rewardText:'Unlocks the full Plastic Surgery / Cosmetic Medicine service line; counts toward Private Specialty identity'},
  {id:'campus_health_partnership',name:'Campus Health Partnership',branch:'access',tier:3,identityPath:'university',
   desc:'A partnership with a local university brings a steady flow of student patients and academic visibility to the hospital.',
   cost:90,days:7,requires:['specialty_care_strategy','teaching_hospital_charter'],unlockTools:['student_health_clinic','counseling_center','sports_medicine_office','vaccination_clinic','teaching_intern_office'],unlockRoles:['intern'],unlockFeatures:['campus_health_partnership'],
   rewardText:'Unlocks the University Student Medical Center service line; counts toward University Hospital identity'},
  {id:'reproductive_medicine_program',name:'Reproductive Medicine Program',branch:'clinical',tier:3,
   desc:'A clinical program for reproductive medicine establishes consultation pathways, donor screening, and the foundation for cryogenic and embryology services.',
   cost:95,days:7,requires:['specialty_care_strategy'],unlockTools:[],unlockRoles:[],unlockFeatures:['reproductive_medicine_program'],
   rewardText:'Gateway to Sperm Bank and IVF Center service lines'},
  {id:'cryogenic_storage_systems',name:'Cryogenic Storage Systems',branch:'operations',tier:3,
   desc:'Liquid-nitrogen cryogenic storage infrastructure enables long-term preservation of donor samples and embryos under strict environmental controls.',
   cost:90,days:7,requires:['reproductive_medicine_program','ethics_compliance_review'],unlockTools:['donor_screening_office','cryogenic_storage','andrology_lab','fertility_records_office'],unlockRoles:[],unlockFeatures:['cryogenic_storage_systems'],
   rewardText:'Unlocks the Sperm Bank service line; required for IVF Center'},
  {id:'embryology_lab_standards',name:'Embryology Lab Standards',branch:'diagnostics',tier:3,
   desc:'Certified embryology lab protocols cover gamete handling, fertilization, culture, and transfer to clinical-grade success rates.',
   cost:105,days:8,requires:['reproductive_medicine_program','cryogenic_storage_systems'],unlockTools:['fertility_consult_office','ivf_procedure_room','embryology_lab_room','ivf_recovery_room'],unlockRoles:[],unlockFeatures:['embryology_lab_standards'],
   rewardText:'Unlocks the IVF Center service line'},
  {id:'ethics_compliance_review',name:'Ethics and Compliance Review',branch:'administration',tier:3,
   desc:'A standing ethics and compliance review board safeguards reproductive medicine and cosmetic programs from regulatory risk and reputational damage.',
   cost:80,days:6,requires:['reproductive_medicine_program'],unlockTools:[],unlockRoles:[],unlockFeatures:['ethics_compliance_review'],
   rewardText:'Required to build any Sperm Bank or IVF service-line room; reduces audit and complaint penalties'}
];

const FIRST_NAMES=['Alex','Sam','Jordan','Morgan','Taylor','Casey','Riley','Quinn','Avery','Blake','Drew','Hayden','Jamie','Kendall','Logan','Mason','Parker','Reese','Skyler','Tatum','Chris','Dana','Evan','Frankie','Glen'];
const LAST_NAMES=['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Clark','Lewis','Lee','Walker','Hall','Young','Allen'];

// Legacy pools — retained so old saves whose staff carry these IDs still resolve through traitById.
// New staff are never generated from these pools; they are not in any active pick path.
const PERSONALITY_TRAITS=[
  {id:'calm',label:'Calm',desc:'Handles stressful days with less morale loss.',group:'personality',type:'positive',tone:'good',icon:'🧘',stressResist:2},
  {id:'difficult',label:'Difficult',desc:'Creates more workplace friction and chaos.',group:'personality',type:'negative',tone:'bad',icon:'😡',dramaEvent:true,chaosRepPenalty:1},
  {id:'ambitious',label:'Ambitious',desc:'Pushes harder for output and revenue.',group:'personality',type:'positive',tone:'good',icon:'💰',revMult:1.08},
  {id:'friendly',label:'Friendly',desc:'Patients leave happier after treatment.',group:'personality',type:'positive',tone:'good',icon:'🙂',scoreMult:2,waitAdd:-1},
  {id:'burnout_risk',label:'Burnout Risk',desc:'Loses energy faster under pressure.',group:'personality',type:'negative',tone:'bad',icon:'🔥',burnoutRisk:true},
];
const WORK_TRAITS=[
  {id:'fast_worker',label:'Fast Worker',desc:'Finishes treatment faster.',group:'work',type:'job',tone:'good',icon:'⚡',speedMult:0.78},
  {id:'careful',label:'Careful',desc:'Produces steadier, cleaner work.',group:'work',type:'job',tone:'good',icon:'🛡️',revMult:1.06,scoreMult:1},
  {id:'sloppy',label:'Sloppy',desc:'More likely to cause setbacks.',group:'work',type:'job',tone:'bad',icon:'⚠️',errorChance:0.08},
  {id:'mentor',label:'Mentor',desc:'Helps interns learn faster.',group:'work',type:'job',tone:'good',icon:'🧠',mentor:true},
  {id:'learner',label:'Learner',desc:'Picks up routines faster over time.',group:'work',type:'job',tone:'good',icon:'📘',speedMult:0.94,xpBoost:1},
];
const DIRECTOR_TRAITS=[
  {id:'clinical_vision',label:'Clinical Vision',desc:'Treatment speed rises sharply across every staffed department.',group:'director',type:'job',tone:'good',icon:'🏥',hospitalSpeedMult:0.84},
  {id:'patient_champion',label:'Patient Champion',desc:'Patients wait longer before trust drops, and care earns more reputation.',group:'director',type:'job',tone:'good',icon:'⭐',waitThresholdAdd:5,repOnTreat:1},
  {id:'operations_titan',label:'Operations Titan',desc:'Cleanliness holds better and stress hits morale less hard.',group:'director',type:'job',tone:'good',icon:'🔧',cleanlinessBonus:4,moraleStressResist:2},
  {id:'grant_magnet',label:'Grant Magnet',desc:'Revenue and scores jump when the hospital is performing well.',group:'director',type:'job',tone:'good',icon:'💎',hospitalRevMult:1.18,hospitalScoreBonus:2},
  {id:'academic_star',label:'Academic Star',desc:'Research credibility opens doors. Research moves faster and grant reviewers give extra weight to applications.',group:'director',type:'job',tone:'good',icon:'🎓',researchSpeedBonus:0.12,grantApprovalBonus:0.04},
  {id:'public_mission_leader',label:'Public Mission Leader',desc:'The hospital feels like it genuinely serves the community. Community grants get a boost and morale holds steadier.',group:'director',type:'job',tone:'good',icon:'🏛️',communityGrantBonus:0.06,moraleStressResist:1},
  {id:'private_networker',label:'Private Networker',desc:'Connected to every board room in the city. Private grant success rises and hospital revenue gets a sustained lift.',group:'director',type:'job',tone:'good',icon:'🤝',hospitalRevMult:1.10,privateGrantBonus:0.06},
  {id:'automation_evangelist',label:'Automation Evangelist',desc:'Pushes the whole hospital toward efficiency. Hospital-wide speed improves and revenue edges up.',group:'director',type:'job',tone:'good',icon:'🤖',hospitalSpeedMult:0.92,revMult:1.05}
];

// -- Delegation / Automation Role Registry --
const AUTOMATION_ROLES=[
  {id:'admin_automation',label:'Admin Automation',icon:'🗄️',
   desc:'Digital filing reduces administrative paperwork and speeds up routine processing.',
   effect:'IT research point income +0.5/day; admin workflows process faster.',
   unlock:'digital_filing',unlockLabel:'Digital Filing System',unlockBranch:'digital',
   improvedBy:null},
  {id:'shift_supervisor',label:'Shift Supervisor',icon:'📋',
   desc:'Automated shift handoff coordination reduces gaps between day and night teams.',
   effect:'Staff energy drains 12% more slowly across both shifts.',
   unlock:'staff_scheduling',unlockLabel:'Staff Scheduling',unlockBranch:'operations',
   improvedBy:'staff_tablets',improvedLabel:'Staff Tablets',
   improvedEffect:'Real-time tablet comms cut discharge time and improve GP throughput.'},
  {id:'patient_flow_coordinator',label:'Patient Flow Coordinator',icon:'🔀',
   desc:'Dedicated patient navigators route each intake to the right department without bottlenecks.',
   effect:'Wait pressure reduced by 1. Intake-to-treatment routing more accurate.',
   unlock:'patient_navigation_program',unlockLabel:'Patient Navigation Program',unlockBranch:'access',
   improvedBy:'discharge_planning',improvedLabel:'Discharge Planning',
   improvedEffect:'Structured discharge keeps beds available sooner — bed turnover +15%.'},
  {id:'hr_recruiter',label:'HR Recruiter',icon:'👥',
   desc:'Standardized hiring workflows surface better candidates and reduce staff attrition.',
   effect:'Staff quit risk reduced (8%). Morale floor improves hospital-wide.',
   unlock:'hr_workflow_system',unlockLabel:'HR Workflow System',unlockBranch:'administration',
   improvedBy:null},
  {id:'contract_analyst',label:'Contract Analyst',icon:'📑',
   desc:'Formal contract review pipeline accelerates negotiations and improves payout terms.',
   effect:'Active contract revenue multiplier +4% on all contracts.',
   unlock:'contract_review_process',unlockLabel:'Contract Review Process',unlockBranch:'administration',
   improvedBy:null},
  {id:'grant_coordinator',label:'Grant Coordinator',icon:'🎯',
   desc:'Centralized grant tracking keeps applications on deadline and compliance airtight.',
   effect:'Grant approval odds +4% across all active applications.',
   unlock:'grant_management_platform',unlockLabel:'Grant Management Platform',unlockBranch:'administration',
   improvedBy:null},
  {id:'compliance_support',label:'Compliance Support',icon:'✅',
   desc:'Automated monitoring flags government and public care requirement gaps before penalties land.',
   effect:'Government penalty multiplier reduced; public care compliance easier to maintain.',
   unlock:'compliance_tracking',unlockLabel:'Compliance Tracking',unlockBranch:'administration',
   improvedBy:null},
  {id:'operations_coordinator',label:'Operations Coordinator',icon:'⚙️',
   desc:'Preventive maintenance rounds keep equipment running and eliminate surprise operational failures.',
   effect:'Passive chaos reduced by 1 each tick. Hospital stress drain slightly lower.',
   unlock:'preventive_maintenance',unlockLabel:'Preventive Maintenance',unlockBranch:'operations',
   improvedBy:'operations_command_center',improvedLabel:'Operations Command Center',
   improvedEffect:'Full operational visibility amplifies every active delegation policy.'},
  {id:'advanced_automation',label:'Advanced Automation',icon:'🖥️',
   desc:'Server infrastructure enables deeper automation across clinical and administrative workflows.',
   effect:'Research pipeline faster (+1.5 RP/day from Server Room); all automation more effective.',
   unlock:'server_room_upgrade',unlockLabel:'Server Room Upgrade',unlockBranch:'digital',
   improvedBy:null},
  {id:'ai_operations',label:'AI Operations Manager',icon:'🤖',
   desc:'Predictive AI monitors patient flow, staffing needs, and resource allocation in real time.',
   effect:'Wait pressure -2; passive stress relief +3/day; earlier warnings on critical events.',
   unlock:'predictive_operations_ai',unlockLabel:'Predictive Operations AI',unlockBranch:'digital',
   improvedBy:null},
];
const CHARGE_NURSE_TRAITS=[
  {id:'steady_rounds',label:'Steady Rounds',desc:'Runs tight break rotations. Staff recover faster and more fully.',group:'charge',type:'job',tone:'good',icon:'🔄',breakEnergyBonus:1,breakMoraleBonus:1},
  {id:'floor_commander',label:'Floor Commander',desc:'Runs the ward with authority. Nursing staff resist stress better.',group:'charge',type:'job',tone:'good',icon:'👑',nurseStressResist:2},
  {id:'mentor_charge',label:'Mentor Charge',desc:'Actively grows interns and CNAs. Accelerates their development.',group:'charge',type:'job',tone:'good',icon:'🧠',mentor:true},
  {id:'overscheduler',label:'Overscheduler',desc:'Books every shift solid. Good throughput, but staff burn out faster.',group:'charge',type:'job',tone:'bad',icon:'📅',energyDrainMult:1.1},
];
const GRANT_WRITER_TRAITS=[
  {id:'policy_whisperer',label:'Policy Whisperer',desc:'Speaks bureaucrat fluently. Government grant approval odds climb significantly.',group:'grant_writer',type:'job',tone:'good',icon:'🏛️',governmentGrantBonus:0.10},
  {id:'form_wizard',label:'Form Wizard',desc:'Fills applications faster than most read them. Review time drops by a day and odds tick up.',group:'grant_writer',type:'job',tone:'good',icon:'🪄',reviewDaysOffset:-1,grantApprovalBonus:0.04},
  {id:'foundation_charmer',label:'Foundation Charmer',desc:'Private foundations and donors simply trust this person. Non-government grant success rises sharply.',group:'grant_writer',type:'job',tone:'good',icon:'🤝',privateGrantBonus:0.10},
  {id:'budget_storyteller',label:'Budget Storyteller',desc:'Makes every dollar tell a compelling story. Approved grants pay out more cash.',group:'grant_writer',type:'job',tone:'good',icon:'📊',grantRewardMult:1.18},
  {id:'compliance_shark',label:'Compliance Shark',desc:'Knows every rule, dot, and comma. Approval odds rise and audit risk drops.',group:'grant_writer',type:'job',tone:'good',icon:'🦈',grantApprovalBonus:0.06},
  {id:'community_voice',label:'Community Voice',desc:'Authentic grassroots credibility. Public care and outreach grants land at a higher rate.',group:'grant_writer',type:'job',tone:'good',icon:'🌍',communityGrantBonus:0.10},
  {id:'deadline_sprinter',label:'Deadline Sprinter',desc:'Best work happens under pressure. Applications finish 2 days faster — but the rush adds a small failure risk.',group:'grant_writer',type:'job',tone:'neutral',icon:'⏱️',reviewDaysOffset:-2,grantApprovalPenalty:0.05},
  {id:'red_tape_acrobat',label:'Red Tape Acrobat',desc:'Navigates government bureaucracy like an Olympic sport. Better government approval and a small overall odds boost.',group:'grant_writer',type:'job',tone:'good',icon:'🎭',governmentGrantBonus:0.07,grantApprovalBonus:0.03},
  {id:'perfectionist',label:'Perfectionist',desc:'Better approval odds, but applications take an extra day to finalize.',group:'grant_writer',type:'job',tone:'neutral',icon:'🔍',grantApprovalBonus:0.05,reviewDaysOffset:1},
  {id:'disorganized',label:'Disorganized',desc:'Applications take longer and approval odds drop slightly.',group:'grant_writer',type:'job',tone:'bad',icon:'🗂️',grantApprovalPenalty:0.04,reviewDaysOffset:1},
  {id:'weak_documentation',label:'Weak Documentation',desc:'Sloppy paperwork tanks approval chances across the board.',group:'grant_writer',type:'job',tone:'bad',icon:'📄',grantApprovalPenalty:0.08},
  {id:'burnout_prone',label:'Burnout Prone',desc:'Loses energy fast when juggling multiple active grants. One at a time is safest.',group:'grant_writer',type:'job',tone:'bad',icon:'🔥'}
];
const DOCTOR_TRAITS=[
  {id:'diagnosis_bloodhound',label:'Diagnosis Bloodhound',desc:'Sniffs out the answer before anyone else. Diagnostic rooms run faster and scores jump.',group:'doctor',type:'job',tone:'good',icon:'🔬',diagnosticSpeedMult:0.86,scoreMult:2},
  {id:'bedside_legend',label:'Bedside Legend',desc:'Patients remember this doctor long after discharge. Reputation climbs with every successful case.',group:'doctor',type:'job',tone:'good',icon:'🌟',repOnTreat:1,scoreMult:2,waitAdd:-1},
  {id:'speedy_rounds',label:'Speedy Rounds',desc:'Moves through the ward like a warm breeze. Treatment speed is noticeably faster across all rooms.',group:'doctor',type:'job',tone:'good',icon:'⚡',speedMult:0.88},
  {id:'protocol_nerd',label:'Protocol Nerd',desc:'Follows every guideline to the letter. Slower, but dramatically more reliable — errors are rare.',group:'doctor',type:'job',tone:'neutral',icon:'📋',speedMult:1.08,errorChance:-0.04},
  {id:'specialist_brain',label:'Specialist Brain',desc:'Deep expertise in complex cases. Diagnostic speed and revenue per case both rise.',group:'doctor',type:'job',tone:'good',icon:'🧩',diagnosticSpeedMult:0.90,revMult:1.06},
  {id:'tough_case_hunter',label:'Tough Case Hunter',desc:'Gravitates toward the hardest patients. Scores climb on difficult cases and revenue reflects it.',group:'doctor',type:'job',tone:'good',icon:'🏆',scoreMult:3,revMult:1.04},
  {id:'clipboard_commander',label:'Clipboard Commander',desc:'Organized beyond reproach. Slightly faster work with noticeably fewer documentation errors.',group:'doctor',type:'job',tone:'good',icon:'📎',speedMult:0.93,errorChance:-0.02},
  {id:'calm_surgeon_hands',label:'Calm Surgeon Hands',desc:'Absolutely steady under pressure. Errors drop significantly, even during the busiest surges.',group:'doctor',type:'job',tone:'good',icon:'🖐️',errorChance:-0.05,speedMult:0.95},
  {id:'rushed_clinician',label:'Rushed Clinician',desc:'Fast — sometimes dangerously so. Great throughput, but errors creep in.',group:'doctor',type:'job',tone:'bad',icon:'💨',speedMult:0.84,errorChance:0.06}
];
const NURSE_TRAITS=[
  {id:'comfort_radar',label:'Comfort Radar',desc:'Senses patient discomfort before it becomes a complaint. Wait frustration drops and scores climb.',group:'nurse',type:'job',tone:'good',icon:'📡',waitAdd:-2,scoreMult:1},
  {id:'steady_rounds_nurse',label:'Steady Rounds',desc:'Consistent, rhythmic care. Treatment speed stays reliable even during heavy patient loads.',group:'nurse',type:'job',tone:'good',icon:'🔄',speedMult:0.94,errorChance:-0.02},
  {id:'triage_sense',label:'Triage Sense',desc:'Prioritizes perfectly. Patients get seen in the right order, reducing wait frustration and improving scores.',group:'nurse',type:'job',tone:'good',icon:'🎯',waitAdd:-1,scoreMult:1,speedMult:0.96},
  {id:'medication_memory',label:'Medication Memory',desc:'Never misses a dose or interaction. Error rate drops and revenue holds steadier.',group:'nurse',type:'job',tone:'good',icon:'💊',errorChance:-0.04,revMult:1.03},
  {id:'charge_nurse_aura',label:'Charge Nurse Aura',desc:'Natural leader energy on the floor. Co-workers hold morale better and resist stress during hard shifts.',group:'nurse',type:'job',tone:'good',icon:'👑',teamMoraleBonus:true,stressResist:1},
  {id:'bed_turnover_pro',label:'Bed Turnover Pro',desc:'Rooms reset faster after each patient. Throughput improves meaningfully during busy periods.',group:'nurse',type:'job',tone:'good',icon:'🛏️',speedMult:0.90},
  {id:'patient_whisperer',label:'Patient Whisperer',desc:'Gets patients to calm down and cooperate. Reputation rises and wait tolerance improves.',group:'nurse',type:'job',tone:'good',icon:'🌸',repOnTreat:1,waitAdd:-2},
  {id:'shift_anchor',label:'Shift Anchor',desc:'The calm at the eye of every storm. Holds morale and stress steady when the ward gets chaotic.',group:'nurse',type:'job',tone:'good',icon:'⚓',stressResist:2,errorChance:-0.02},
  {id:'overextended_nurse',label:'Overextended',desc:'Takes on too many patients at once. Energy drains unusually fast — rest them before they crash.',group:'nurse',type:'job',tone:'bad',icon:'😮‍💨',energyDrainMult:1.15}
];
const JANITOR_TRAITS=[
  {id:'mop_wizard',label:'Mop Wizard',desc:'The floor has never been cleaner. Highest raw cleanliness output of any janitor trait.',group:'janitor_role',type:'job',tone:'good',icon:'🧹',janitorCleanBonus:1.6},
  {id:'germ_detective',label:'Germ Detective',desc:'Finds contamination before it spreads. Solid cleanliness bonus and slightly fewer staff incidents.',group:'janitor_role',type:'job',tone:'good',icon:'🔍',janitorCleanBonus:1.2,errorChance:-0.02},
  {id:'trash_route_genius',label:'Trash Route Genius',desc:'Planned the optimal route years ago and never deviates. Efficient coverage, good cleanliness gain.',group:'janitor_role',type:'job',tone:'good',icon:'🗺️',janitorCleanBonus:0.9,speedMult:0.92},
  {id:'spill_psychic',label:'Spill Psychic',desc:'Arrives before the spill happens. Strong cleanliness output and a mystery air of foresight.',group:'janitor_role',type:'job',tone:'good',icon:'🔮',janitorCleanBonus:1.3},
  {id:'quiet_cleaner',label:'Quiet Cleaner',desc:'Nobody hears them, nobody bothers them. Their silent presence keeps the ward calm and slightly boosts staff morale.',group:'janitor_role',type:'job',tone:'good',icon:'🤫',janitorCleanBonus:0.7,teamMoraleBonus:true},
  {id:'floor_shine_fanatic',label:'Floor Shine Fanatic',desc:'Obsessed with the floor in particular. The absolute highest cleanliness bonus — nothing else comes close.',group:'janitor_role',type:'job',tone:'good',icon:'✨',janitorCleanBonus:1.8},
  {id:'biohazard_brave',label:'Biohazard Brave',desc:'Tackles the worst messes without flinching. Good cleanliness output and solid stress resistance.',group:'janitor_role',type:'job',tone:'good',icon:'☣️',janitorCleanBonus:1.0,stressResist:2},
  {id:'misses_corners',label:'Misses Corners',desc:'Leaves behind small messes that quietly pile up. Cleanliness score bleeds downward over time.',group:'janitor_role',type:'job',tone:'bad',icon:'😬',janitorCleanBonus:-1.2}
];
const SECURITY_TRAITS=[
  {id:'de_escalator',label:'De-escalator',desc:'Defuses conflicts before they spiral into incidents. Strong protection bonus.',group:'security_role',type:'job',tone:'good',icon:'🕊️',guardProtectionBonus:0.12},
  {id:'lobby_hawk',label:'Lobby Hawk',desc:'Never misses a thing at the entrance. Proactive presence keeps incidents from starting.',group:'security_role',type:'job',tone:'good',icon:'🦅',guardProtectionBonus:0.10,guardStressReductionBonus:1},
  {id:'calm_presence',label:'Calm Presence',desc:'Just being in the room helps. Stress on the floor drops and patients feel safer.',group:'security_role',type:'job',tone:'good',icon:'😌',guardStressReductionBonus:2,guardProtectionBonus:0.06},
  {id:'night_watch',label:'Night Watch',desc:'Built for the overnight. Excellent protection during night shifts and high personal stress tolerance.',group:'security_role',type:'job',tone:'good',icon:'🌙',guardProtectionBonus:0.08,stressResist:2},
  {id:'crowd_control_pro',label:'Crowd Control Pro',desc:'Handles high-patient-volume situations with authority. Highest raw protection bonus in the pool.',group:'security_role',type:'job',tone:'good',icon:'🚧',guardProtectionBonus:0.15},
  {id:'missing_badge_detector',label:'Missing Badge Detector',desc:'Spots unauthorized staff before they cause problems. Small but consistent protection and error reduction.',group:'security_role',type:'job',tone:'good',icon:'🪪',guardProtectionBonus:0.06,errorChance:-0.02},
  {id:'gentle_giant',label:'Gentle Giant',desc:'Imposing but approachable. Strong protection without scaring patients — even earns a small rep bonus.',group:'security_role',type:'job',tone:'good',icon:'🐘',guardProtectionBonus:0.08,repOnTreat:1},
  {id:'intimidating',label:'Intimidating',desc:'Effective deterrent, but patients feel watched. Protection works — reputation takes a small hit.',group:'security_role',type:'job',tone:'bad',icon:'😠',guardProtectionBonus:0.08,securityRepPenalty:1}
];
const UNIVERSAL_POSITIVE_TRAITS=[
  {id:'calm_under_fire',label:'Calm Under Fire',desc:'Ice-cold in a crisis. Morale barely moves during high-stress or emergency events.',type:'positive',tone:'good',icon:'🧊',stressResist:3},
  {id:'people_person',label:'People Person',desc:'Instantly puts patients at ease. Every interaction lifts satisfaction scores and reduces wait frustration.',type:'positive',tone:'good',icon:'🤗',scoreMult:1,waitAdd:-1},
  {id:'fast_learner',label:'Fast Learner',desc:'Picks up new skills at double speed. Gains XP significantly faster from every shift.',type:'positive',tone:'good',icon:'📘',xpBoost:2},
  {id:'team_glue',label:'Team Glue',desc:'The glue that holds the ward together. Co-workers on the same shift gain a small morale buffer.',type:'positive',tone:'good',icon:'🫂',teamGlue:true},
  {id:'detail_hawk',label:'Detail Hawk',desc:'Catches mistakes before they happen. Measurably reduces the chance of treatment errors.',type:'positive',tone:'good',icon:'🦅',errorChance:-0.05},
  {id:'optimist',label:'Optimist',desc:'Bounces back from setbacks faster than anyone else. Morale recovers quicker after bad events.',type:'positive',tone:'good',icon:'🌈',moraleRecoveryBonus:2},
  {id:'reliable_clockwork',label:'Reliable Clockwork',desc:'Never misses a shift, no matter what. Immune to random sick-day call-outs.',type:'positive',tone:'good',icon:'⏰',sickDayImmune:true},
  {id:'mentor_energy',label:'Mentor Energy',desc:'Loves developing junior staff. Interns on the same shift gain XP noticeably faster.',type:'positive',tone:'good',icon:'🧠',mentor:true,xpBoost:1},
  {id:'cool_head',label:'Cool Head',desc:'Stays rational when chaos peaks. Reduces passive drama stress and holds morale during emergencies.',type:'positive',tone:'good',icon:'🌊',chaosResist:1,stressResist:1},
  {id:'patient_favorite',label:'Patient Favorite',desc:'Patients specifically ask for this person. Satisfaction scores jump after every successful interaction.',type:'positive',tone:'good',icon:'⭐',scoreMult:2},
  {id:'big_picture_thinker',label:'Big Picture Thinker',desc:'Sees how every role fits together. Rooms this staff member is assigned to run slightly faster.',type:'positive',tone:'good',icon:'🔭',deptSpeedBonus:0.04},
  {id:'budget_minded',label:'Budget Minded',desc:'Cost-conscious and resourceful. Requests a slightly lower salary than peers at the same level.',type:'positive',tone:'good',icon:'💰',budgetMinded:true},
];
const UNIVERSAL_NEGATIVE_TRAITS=[
  {id:'coffee_dependent',label:'Coffee Dependent',desc:"Needs caffeine to function. When morale dips below 65 they work noticeably slower — keep them happy or keep the coffee flowing.",type:'negative',tone:'bad',icon:'☕',coffeeDep:true},
  {id:'chaos_magnet',label:'Chaos Magnet',desc:"Trouble finds them without trying. Their presence adds a small but consistent drip of drama stress to the ward.",type:'negative',tone:'bad',icon:'🌀',dramaEvent:true},
  {id:'paperwork_allergic',label:'Paperwork Allergic',desc:"Breaks out in a cold sweat near forms. Admin tasks slow them down and they occasionally stir up minor chaos when deadlines loom.",type:'negative',tone:'bad',icon:'📄',dramaEvent:true,speedMult:1.05},
  {id:'drama_sprinkler',label:'Drama Sprinkler',desc:"Doesn't start fires — just walks through the room and somehow everything ignites. Adds steady drama stress to the shift.",type:'negative',tone:'bad',icon:'🚿',dramaEvent:true},
  {id:'vanishing_act',label:'Vanishing Act',desc:"Disappears precisely when the waiting room hits capacity. During patient surges they work measurably slower — nobody knows where they went.",type:'negative',tone:'bad',icon:'🪄',vanishingAct:true},
  {id:'perfection_spiral',label:'Perfection Spiral',desc:"Checks everything three times. Works slower than average but is genuinely less error-prone — whether that trade-off is worth it is up to you.",type:'negative',tone:'bad',icon:'🌀',speedMult:1.10,errorChance:-0.04},
  {id:'snack_bandit',label:'Snack Bandit',desc:"Clocks the vending machine harder than their patients. Takes breaks earlier and more often than normal staff.",type:'negative',tone:'bad',icon:'🍫',snackBandit:true},
  {id:'reply_all_menace',label:'Reply-All Menace',desc:"Sends 47-recipient emails about the break room thermostat. Adds low-level chaos to the whole shift and slows down their own output.",type:'negative',tone:'bad',icon:'📧',dramaEvent:true,speedMult:1.04},
  {id:'fragile_ego',label:'Fragile Ego',desc:"Takes every bad day personally. When morale events turn negative their morale drops 40% harder than anyone else on the team.",type:'negative',tone:'bad',icon:'🥚',fragileEgo:true},
  {id:'shift_gremlin',label:'Shift Gremlin',desc:"Functional at full energy; a liability when running low. Below 40 energy their output drops sharply — rest them before they crater.",type:'negative',tone:'bad',icon:'👺',shiftGremlin:true},
  {id:'overexplainer',label:'Overexplainer',desc:"Takes 12 minutes to say what could be said in 2. Slightly slower overall, but interns on the same shift absorb their ramblings and gain XP a bit faster.",type:'negative',tone:'bad',icon:'🗣️',speedMult:1.06,xpAura:0.2},
  {id:'i_know_a_shortcut',label:'I Know a Shortcut',desc:"Confidently wrong. Works faster than average but cuts corners — error chance is noticeably higher. Great throughput; terrifying quality.",type:'negative',tone:'bad',icon:'🗺️',speedMult:0.88,errorChance:0.06},
  {id:'meeting_summoner',label:'Meeting Summoner',desc:"Believes every problem needs a meeting to solve it. Without an Administration room their scheduling chaos slows down the whole operation.",type:'negative',tone:'bad',icon:'📅',meetingSummoner:true},
  {id:'inbox_goblin',label:'Inbox Goblin',desc:"Has 4,000 unread emails and is proud of it. Grant, contract, and admin tasks take longer — and their general distraction nudges drama up.",type:'negative',tone:'bad',icon:'📥',dramaEvent:true,speedMult:1.06},
  {id:'supply_hoarder',label:'Supply Hoarder',desc:"Keeps a private cache of gloves, forms, and mystery boxes under their desk. Slightly drains shared resources each shift but stock is rarely fully depleted.",type:'negative',tone:'bad',icon:'📦',extraEnergyDrain:0.7},
];
// Unified staff XP / leveling table. Applies to every employee, including interns.
// Title, salary multiplier, negative-trait strength multiplier, XP needed to reach the next level.
const LEVEL_TIERS=[
  {level:1,title:'New Hire',     salaryMultiplier:1.00,negativeTraitStrength:1.00,xpToNext:60},
  {level:2,title:'Experienced',  salaryMultiplier:1.15,negativeTraitStrength:0.85,xpToNext:120},
  {level:3,title:'Specialist',   salaryMultiplier:1.35,negativeTraitStrength:0.70,xpToNext:200},
  {level:4,title:'Senior',       salaryMultiplier:1.60,negativeTraitStrength:0.50,xpToNext:320},
  {level:5,title:'Veteran',      salaryMultiplier:2.00,negativeTraitStrength:0.30,xpToNext:0},
];
function getLevelTier(level){
  const idx=Math.max(0,Math.min(LEVEL_TIERS.length-1,(Number(level)||1)-1));
  return LEVEL_TIERS[idx];
}
function effectiveSalary(member){
  if(!member)return 0;
  return Math.round((member.salary||0)*(member.salaryMultiplier||1));
}
// Multiplier (0..1) applied to a negative-trait effect — Level 5 only feels 30% of the original.
function negImpact(member){
  if(!member)return 1;
  return Math.max(0,Math.min(1,member.negativeTraitStrength??1));
}
// Scales an "above 1" multiplier (e.g. speedMult 1.15 = 15% slower) toward 1 by the strength factor.
function scaleAboveOneMult(mult,strength){
  if(!Number.isFinite(mult)||mult===1)return 1;
  return 1+(mult-1)*Math.max(0,Math.min(1,strength??1));
}
const CLERICAL_JOB_TRAITS=[
  {id:'rapid_filer',label:'Rapid Filer',desc:'Processes patient intake fast. Less waiting at the front desk.',group:'clerical',type:'job',tone:'good',icon:'⚡',waitAdd:-1},
  {id:'warm_welcome',label:'Warm Welcome',desc:'Front desk feels inviting. New arrivals leave a better impression.',group:'clerical',type:'job',tone:'good',icon:'🙌',scoreMult:1},
  {id:'billing_hawk',label:'Billing Hawk',desc:'Catches billing errors early. Small but reliable income boost.',group:'clerical',type:'job',tone:'good',icon:'📋',revMult:1.04},
  {id:'claim_negotiator',label:'Claim Negotiator',desc:'Fights insurance companies on every claim. Revenue per patient ticks up noticeably.',group:'clerical',type:'job',tone:'good',icon:'💼',revMult:1.06},
  {id:'intake_ninja',label:'Intake Ninja',desc:'Processes new arrivals at light speed. Faster turnaround and shorter waits at the desk.',group:'clerical',type:'job',tone:'good',icon:'🥷',speedMult:0.92,waitAdd:-1},
  {id:'voicemail_hero',label:'Voicemail Hero',desc:'Returns every call by end of shift. Fewer dropped follow-ups and a steady morale lift for the team.',group:'clerical',type:'job',tone:'good',icon:'📞',errorChance:-0.02,teamMoraleBonus:true},
  {id:'paper_pusher',label:'Paper Pusher',desc:'By the book and slow about it. Intake runs a little behind.',group:'clerical',type:'job',tone:'bad',icon:'📄',waitAdd:1},
  {id:'desk_drama_queen',label:'Desk Drama Queen',desc:'Treats the front desk like a reality show. Adds chronic drama and slows down intake.',group:'clerical',type:'job',tone:'bad',icon:'🎭',dramaEvent:true,speedMult:1.04},
];
const IT_JOB_TRAITS=[
  {id:'cable_whisperer',label:'Cable Whisperer',desc:'Every wire in its place. Research systems run faster and a small revenue efficiency bonus applies.',group:'it_role',type:'job',tone:'good',icon:'🔌',researchSpeedBonus:0.08,revMult:1.02},
  {id:'server_goblin',label:'Server Goblin',desc:'Lives in the server room. Research pipeline moves noticeably faster when they are on shift.',group:'it_role',type:'job',tone:'good',icon:'🖥️',researchSpeedBonus:0.12},
  {id:'wifi_wizard',label:'Wi-Fi Wizard',desc:'Signal is five bars everywhere, all the time. Staff morale gets a small lift and revenue ticks up.',group:'it_role',type:'job',tone:'good',icon:'📶',teamMoraleBonus:true,revMult:1.02},
  {id:'patch_day_hero',label:'Patch Day Hero',desc:'Updates everything before vulnerabilities become problems. Fewer system errors and a small efficiency gain.',group:'it_role',type:'job',tone:'good',icon:'🛡️',errorChance:-0.03,revMult:1.02},
  {id:'printer_exorcist',label:'Printer Exorcist',desc:'The printer works. Nobody knows how. Staff morale quietly improves when this IT specialist is around.',group:'it_role',type:'job',tone:'good',icon:'🖨️',teamMoraleBonus:true},
  {id:'data_guardian',label:'Data Guardian',desc:'Protects records with religious devotion. Error rates across the department drop noticeably.',group:'it_role',type:'job',tone:'good',icon:'🔒',errorChance:-0.04},
  {id:'automation_tinkerer',label:'Automation Tinkerer',desc:'Automates anything that sits still long enough. Revenue efficiency and research speed both improve.',group:'it_role',type:'job',tone:'good',icon:'⚙️',revMult:1.05,researchSpeedBonus:0.06},
  {id:'helpdesk_saint',label:'Helpdesk Saint',desc:'Responds to every ticket with patience and a smile. Staff morale and stress resistance both improve.',group:'it_role',type:'job',tone:'good',icon:'😇',teamMoraleBonus:true,stressResist:1},
  {id:'cable_chaos',label:'Cable Chaos',desc:'Keeps everything running — somehow. Nobody dares touch the server room. Occasional mysterious glitches.',group:'it_role',type:'job',tone:'bad',icon:'🌀',errorChance:0.03}
];
const MARKETING_JOB_TRAITS=[
  {id:'spin_doctor',label:'Spin Doctor',desc:'Reputation recovers faster after bad press or poor events.',group:'marketing_role',type:'job',tone:'good',icon:'💬',reputationRecoveryBonus:true},
  {id:'community_megaphone',label:'Community Megaphone',desc:'Public care image improves. Modest reputation gain over time and patients leave happier.',group:'marketing_role',type:'job',tone:'good',icon:'📢',scoreMult:1,repOnTreat:1},
  {id:'viral_moment',label:'Viral Moment',desc:'Occasionally generates a big reputation spike from nothing.',group:'marketing_role',type:'job',tone:'good',icon:'📈',viralReputationChance:true},
  {id:'brand_architect',label:'Brand Architect',desc:'Builds a memorable hospital identity. Reputation recovers faster after bad press and care earns more rep.',group:'marketing_role',type:'job',tone:'good',icon:'🏷️',reputationRecoveryBonus:true,repOnTreat:1},
  {id:'social_savant',label:'Social Media Savant',desc:'Hospital trends weekly. Patient satisfaction scores rise and viral reputation moments happen more often.',group:'marketing_role',type:'job',tone:'good',icon:'📱',viralReputationChance:true,scoreMult:1},
  {id:'partnership_broker',label:'Partnership Broker',desc:'Lines up community deals nobody else could. Community grants land more often and reputation rises.',group:'marketing_role',type:'job',tone:'good',icon:'🤝',communityGrantBonus:0.05,repOnTreat:1},
  {id:'overbiller',label:'Overbiller',desc:'Promises more than the hospital delivers. Complaint and drama risk.',group:'marketing_role',type:'job',tone:'bad',icon:'📊',chaosRepPenalty:1,dramaEvent:true},
  {id:'outdated_playbook',label:'Outdated Playbook',desc:'Still pitching 2010 marketing tactics. Slower campaigns and small reputation drag.',group:'marketing_role',type:'job',tone:'bad',icon:'📺',speedMult:1.05,chaosRepPenalty:1},
];
const HR_JOB_TRAITS=[
  {id:'conflict_sponge',label:'Conflict Sponge',desc:'Absorbs workplace drama so the rest of the floor does not have to. Incidents become less frequent.',group:'hr_role',type:'job',tone:'good',icon:'🧽',incidentReductionBonus:true},
  {id:'benefits_brain',label:'Benefits Brain',desc:'Staff feel taken care of. Quit risk drops and morale baseline improves across the board.',group:'hr_role',type:'job',tone:'good',icon:'📋',quitRiskReduction:true,teamMoraleBonus:true},
  {id:'hiring_radar',label:'Hiring Radar',desc:'Spots talent instantly. Better hires mean better team output over time.',group:'hr_role',type:'job',tone:'good',icon:'🎯',revMult:1.02},
  {id:'vacation_planner',label:'Vacation Planner',desc:'Times every vacation perfectly for minimal disruption. Staff morale and stress resistance both improve.',group:'hr_role',type:'job',tone:'good',icon:'🏖️',teamMoraleBonus:true,stressResist:1},
  {id:'exit_interview_wizard',label:'Exit Interview Wizard',desc:'Turns every exit into a learning moment. Staff are slower to reach the quit-risk threshold.',group:'hr_role',type:'job',tone:'good',icon:'🚪',quitRiskReduction:true},
  {id:'raise_negotiator',label:'Raise Negotiator',desc:'Finds the salary sweet spot every time. Revenue efficiency edges up as staff satisfaction holds steady.',group:'hr_role',type:'job',tone:'good',icon:'💬',revMult:1.03},
  {id:'culture_builder',label:'Culture Builder',desc:'The hospital feels like a team. Strong morale buffer and stress resistance for the whole ward.',group:'hr_role',type:'job',tone:'good',icon:'🏗️',teamMoraleBonus:true,stressResist:2},
  {id:'by_the_book_hr',label:'By the Book',desc:'Compliance is perfect but zero flexibility. Everything requires a form, a signature, and a waiting period.',group:'hr_role',type:'job',tone:'neutral',icon:'📜'}
];
const RESEARCHER_JOB_TRAITS=[
  {id:'lab_rat_royalty',label:'Lab Rat Royalty',desc:'In their element. Research speed jumps significantly and occasional bursts of extra points occur.',group:'researcher_role',type:'job',tone:'good',icon:'🐀',researchSpeedBonus:0.12,researchBurstChance:true},
  {id:'hypothesis_machine',label:'Hypothesis Machine',desc:'Never stops generating ideas. Steady, fast research output every shift.',group:'researcher_role',type:'job',tone:'good',icon:'💡',researchSpeedBonus:0.10},
  {id:'grant_synergy',label:'Grant Synergy',desc:'Research direction perfectly aligns with funding priorities. Grant approval odds tick up alongside research speed.',group:'researcher_role',type:'job',tone:'good',icon:'🔗',grantApprovalBonus:0.05,researchSpeedBonus:0.05},
  {id:'peer_review_beast',label:'Peer Review Beast',desc:'Work holds up to scrutiny every time. Reliable research output with a lower error rate.',group:'researcher_role',type:'job',tone:'good',icon:'📚',researchSpeedBonus:0.08,errorChance:-0.03},
  {id:'prototype_brain',label:'Prototype Brain',desc:'Turns ideas into working results fast. Research breakthroughs translate into revenue gains.',group:'researcher_role',type:'job',tone:'good',icon:'🧪',revMult:1.06},
  {id:'citation_goblin',label:'Citation Goblin',desc:'Cites everything, impresses everyone. Grant reviewers love the documentation — approval odds rise.',group:'researcher_role',type:'job',tone:'good',icon:'📎',grantApprovalBonus:0.06},
  {id:'ethical_compass',label:'Ethical Compass',desc:'Every decision is the right one. Lower error rate and stress holds steady during controversial research cycles.',group:'researcher_role',type:'job',tone:'good',icon:'🧭',errorChance:-0.04,stressResist:1},
  {id:'scattered_genius',label:'Scattered Genius',desc:'Brilliant but unpredictable. Research output swings between surprising highs and confusing lows.',group:'researcher_role',type:'job',tone:'neutral',icon:'🌀',randomRpVariance:true}
];
const INTERN_JOB_TRAITS=[
  {id:'eager_learner',label:'Eager Learner',desc:'Absorbs experience twice as fast. Levels up visibly faster.',group:'intern_role',type:'job',tone:'good',icon:'📖',xpBoost:2},
  {id:'shadow_mode',label:'Shadow Mode',desc:'Quietly watches and learns. Steady, modest XP growth.',group:'intern_role',type:'job',tone:'neutral',icon:'👤',xpBoost:1},
  {id:'nervous_novice',label:'Nervous Novice',desc:'Shaky confidence. More errors early, but improves with time.',group:'intern_role',type:'job',tone:'bad',icon:'😰',errorChance:0.05,xpBoost:1},
];
const PARAMEDIC_JOB_TRAITS=[
  {id:'radio_voice',label:'Radio Voice',desc:'Crystal-clear comms, zero miscommunications. Dispatch jobs complete faster and coordination improves.',group:'paramedic_role',type:'job',tone:'good',icon:'📻',dispatchSpeedBonus:true,speedMult:0.94},
  {id:'route_genius',label:'Route Genius',desc:'Knows every shortcut through the city. Faster dispatch runs and better revenue per job.',group:'paramedic_role',type:'job',tone:'good',icon:'🗺️',dispatchSpeedBonus:true,revMult:1.04},
  {id:'siren_sense',label:'Siren Sense',desc:'Anticipates emergencies before the call comes in. Better outcomes on critical dispatch runs.',group:'paramedic_role',type:'job',tone:'good',icon:'🚨',emergencyOutcomeBonus:true},
  {id:'city_map_brain',label:'City Map Brain',desc:'The entire city grid is memorized. Dispatches arrive faster — every single time.',group:'paramedic_role',type:'job',tone:'good',icon:'🧠',dispatchSpeedBonus:true},
  {id:'smooth_operator',label:'Smooth Operator',desc:'Calm hands and clear head on every run. Fewer errors and notably faster scene management.',group:'paramedic_role',type:'job',tone:'good',icon:'😎',errorChance:-0.03,speedMult:0.92},
  {id:'fuel_saver',label:'Fuel Saver',desc:'Efficient routes, efficient everything. Operational costs edge down and revenue per run rises.',group:'paramedic_role',type:'job',tone:'good',icon:'⛽',revMult:1.03},
  {id:'backroad_wizard',label:'Backroad Wizard',desc:'Knows roads nobody else does. Surprisingly fast dispatch times and solid emergency outcomes.',group:'paramedic_role',type:'job',tone:'good',icon:'🛤️',dispatchSpeedBonus:true,speedMult:0.90},
  {id:'adrenaline_junkie',label:'Adrenaline Junkie',desc:'Absolutely flies through every run. Fast — but cuts corners. Higher error risk than almost anyone.',group:'paramedic_role',type:'job',tone:'bad',icon:'⚡',speedMult:0.88,errorChance:0.05}
];
const CNA_JOB_TRAITS=[
  {id:'room_reset_pro',label:'Room Reset Pro',desc:'Turns over patient rooms at impressive speed. Throughput gets a measurable boost during busy shifts.',group:'cna_role',type:'job',tone:'good',icon:'🔃',speedMult:0.90},
  {id:'gentle_helper',label:'Gentle Helper',desc:'Patients feel genuinely cared for by this CNA. Satisfaction scores and wait tolerance both improve.',group:'cna_role',type:'job',tone:'good',icon:'🤲',waitAdd:-1,scoreMult:1},
  {id:'lift_team_hero',label:'Lift Team Hero',desc:'Safe, efficient, and dependable with patient transfers. Fewer errors and slightly faster workflows.',group:'cna_role',type:'job',tone:'good',icon:'💪',errorChance:-0.02,speedMult:0.93},
  {id:'call_bell_ninja',label:'Call Bell Ninja',desc:'Responds before anyone even sees the light. Dramatically reduces patient wait frustration.',group:'cna_role',type:'job',tone:'good',icon:'🔔',waitAdd:-2},
  {id:'supply_runner',label:'Supply Runner',desc:'Always knows where the extra gloves are. Fast, efficient, and keeps the floor stocked.',group:'cna_role',type:'job',tone:'good',icon:'🏃',speedMult:0.92},
  {id:'night_shift_rock',label:'Night Shift Rock',desc:'Built for the overnight grind. Resists stress better and burns energy more slowly during night shifts.',group:'cna_role',type:'job',tone:'good',icon:'🌙',stressResist:2,energyDrainMult:0.92},
  {id:'task_overloader',label:'Task Overloader',desc:'Volunteers for absolutely everything. Admirable dedication — but burns out faster than almost anyone.',group:'cna_role',type:'job',tone:'bad',icon:'📚',energyDrainMult:1.12}
];
const DISPATCHER_JOB_TRAITS=[
  {id:'command_voice',label:'Command Voice',desc:'Crystal-clear instructions over the radio. Dispatch jobs complete faster with fewer mix-ups.',group:'dispatcher_role',type:'job',tone:'good',icon:'📡',dispatchSpeedBonus:true,errorChance:-0.02},
  {id:'incident_juggler',label:'Incident Juggler',desc:'Tracks four calls without breaking a sweat. Faster dispatch and better overall throughput.',group:'dispatcher_role',type:'job',tone:'good',icon:'🤹',dispatchSpeedBonus:true,speedMult:0.92},
  {id:'protocol_keeper',label:'Protocol Keeper',desc:'Knows every code and call type. Fewer dispatch errors and a steady revenue lift per run.',group:'dispatcher_role',type:'job',tone:'good',icon:'📖',errorChance:-0.04,revMult:1.03},
  {id:'pulse_reader',label:'Pulse Reader',desc:'Reads urgency through the phone. Better outcomes on critical calls and faster dispatch overall.',group:'dispatcher_role',type:'job',tone:'good',icon:'❤️',emergencyOutcomeBonus:true,dispatchSpeedBonus:true},
  {id:'panic_proof',label:'Panic Proof',desc:'Stays glacially calm during mass-casualty calls. Strong stress resistance and a lower error rate.',group:'dispatcher_role',type:'job',tone:'good',icon:'🧊',stressResist:2,errorChance:-0.02},
  {id:'clipboard_dispatcher',label:'Clipboard Dispatcher',desc:'Logs every call in triplicate. Slightly slower but billing is airtight — revenue holds steady.',group:'dispatcher_role',type:'job',tone:'good',icon:'📋',revMult:1.05,speedMult:0.96},
  {id:'coffee_brigade_chief',label:'Coffee Brigade Chief',desc:'Keeps the dispatch crew caffeinated and morale high. Whole team feels it on every shift.',group:'dispatcher_role',type:'job',tone:'good',icon:'☕',teamMoraleBonus:true,dispatchSpeedBonus:true},
  {id:'mic_hog',label:'Mic Hog',desc:'Loves the radio a little too much. Long-winded transmissions slow the queue and stir up small chaos.',group:'dispatcher_role',type:'job',tone:'bad',icon:'🎤',speedMult:1.06,dramaEvent:true},
];
const DRIVER_JOB_TRAITS=[
  {id:'lead_foot',label:'Lead Foot',desc:'Always shaves minutes off the run. Fastest dispatch times — and a higher error risk.',group:'driver_role',type:'job',tone:'neutral',icon:'🏎️',dispatchSpeedBonus:true,speedMult:0.88,errorChance:0.04},
  {id:'road_zen_master',label:'Road Zen Master',desc:'Unbothered by traffic. Quick dispatch with notably fewer mistakes en route.',group:'driver_role',type:'job',tone:'good',icon:'🧘',dispatchSpeedBonus:true,errorChance:-0.03},
  {id:'parking_savant',label:'Parking Savant',desc:'Always finds the closest spot. Saves precious minutes and small revenue gains add up.',group:'driver_role',type:'job',tone:'good',icon:'🅿️',dispatchSpeedBonus:true,revMult:1.04},
  {id:'gentle_brake',label:'Gentle Brake',desc:'Smooth, careful, professional. Patients arrive in better condition for treatment.',group:'driver_role',type:'job',tone:'good',icon:'🛞',emergencyOutcomeBonus:true,errorChance:-0.02},
  {id:'night_route_owl',label:'Night Route Owl',desc:'Built for the overnight runs. Strong stress resistance and fast dispatch even at 3 AM.',group:'driver_role',type:'job',tone:'good',icon:'🦉',stressResist:2,dispatchSpeedBonus:true},
  {id:'glove_box_chef',label:'Glove Box Chef',desc:'Has a sandwich for every shift. Resourceful — revenue per run ticks up. Stops at every drive-through.',group:'driver_role',type:'job',tone:'neutral',icon:'🥪',revMult:1.03,speedMult:1.04},
  {id:'convoy_captain',label:'Convoy Captain',desc:'Coordinates rigs like a fleet commander. Crew morale rises and dispatch flows smoothly.',group:'driver_role',type:'job',tone:'good',icon:'🚐',teamMoraleBonus:true,dispatchSpeedBonus:true},
  {id:'lost_in_loops',label:'Lost in Loops',desc:'Misses the same exit four times a week. Slower dispatch and more on-route incidents.',group:'driver_role',type:'job',tone:'bad',icon:'🌀',speedMult:1.10,errorChance:0.05},
];
const PHARMACIST_JOB_TRAITS=[
  {id:'script_savant',label:'Script Savant',desc:'Reads every prescription perfectly. Major drop in dispensing errors and a small revenue gain.',group:'pharmacist_role',type:'job',tone:'good',icon:'💊',errorChance:-0.05,revMult:1.05},
  {id:'compound_chef',label:'Compound Chef',desc:'Custom-mixes meds with chef-like precision. Pharmacy revenue rises significantly.',group:'pharmacist_role',type:'job',tone:'good',icon:'⚗️',revMult:1.10},
  {id:'interaction_radar',label:'Interaction Radar',desc:'Catches drug interactions everyone else missed. Fewer errors and higher patient satisfaction.',group:'pharmacist_role',type:'job',tone:'good',icon:'🛰️',errorChance:-0.06,scoreMult:1},
  {id:'inventory_hawk',label:'Inventory Hawk',desc:'Never lets a stock-out happen. Faster dispensing and steady revenue.',group:'pharmacist_role',type:'job',tone:'good',icon:'📦',revMult:1.06,speedMult:0.94},
  {id:'patient_counselor',label:'Patient Counselor',desc:'Walks every patient through their meds. Reputation rises and wait frustration drops.',group:'pharmacist_role',type:'job',tone:'good',icon:'🗣️',repOnTreat:1,scoreMult:1,waitAdd:-1},
  {id:'lab_partner',label:'Lab Partner',desc:'Treats pharmacy and lab as one unit. Diagnostic rooms run faster and revenue ticks up.',group:'pharmacist_role',type:'job',tone:'good',icon:'🔬',diagnosticSpeedMult:0.92,revMult:1.03},
  {id:'bulk_buyer',label:'Bulk Buyer',desc:'Negotiates the best vendor deals. Big revenue gain — but the occasional bargain pill goes wrong.',group:'pharmacist_role',type:'job',tone:'neutral',icon:'💰',revMult:1.08,errorChance:0.02},
  {id:'label_mixer',label:'Label Mixer',desc:'Confidently grabs the wrong bottle. Quick on the dispense, but errors creep in.',group:'pharmacist_role',type:'job',tone:'bad',icon:'😵‍💫',speedMult:0.92,errorChance:0.06},
];

function traitById(id){
  return UNIVERSAL_POSITIVE_TRAITS.find(t=>t.id===id)||
    UNIVERSAL_NEGATIVE_TRAITS.find(t=>t.id===id)||
    DIRECTOR_TRAITS.find(t=>t.id===id)||
    CHARGE_NURSE_TRAITS.find(t=>t.id===id)||
    GRANT_WRITER_TRAITS.find(t=>t.id===id)||
    DOCTOR_TRAITS.find(t=>t.id===id)||
    NURSE_TRAITS.find(t=>t.id===id)||
    JANITOR_TRAITS.find(t=>t.id===id)||
    SECURITY_TRAITS.find(t=>t.id===id)||
    CLERICAL_JOB_TRAITS.find(t=>t.id===id)||
    IT_JOB_TRAITS.find(t=>t.id===id)||
    MARKETING_JOB_TRAITS.find(t=>t.id===id)||
    HR_JOB_TRAITS.find(t=>t.id===id)||
    RESEARCHER_JOB_TRAITS.find(t=>t.id===id)||
    INTERN_JOB_TRAITS.find(t=>t.id===id)||
    PARAMEDIC_JOB_TRAITS.find(t=>t.id===id)||
    CNA_JOB_TRAITS.find(t=>t.id===id)||
    DISPATCHER_JOB_TRAITS.find(t=>t.id===id)||
    DRIVER_JOB_TRAITS.find(t=>t.id===id)||
    PHARMACIST_JOB_TRAITS.find(t=>t.id===id)||
    PERSONALITY_TRAITS.find(t=>t.id===id)||
    WORK_TRAITS.find(t=>t.id===id)||null;
}
function getJobTraitPool(role){
  if(role==='medical_director')return DIRECTOR_TRAITS;
  if(role==='charge_nurse')return CHARGE_NURSE_TRAITS;
  if(role==='grant_writer')return GRANT_WRITER_TRAITS;
  if(['gp_doc','er_doc','er_attending','dept_attending','surgeon'].includes(role))return DOCTOR_TRAITS;
  if(role==='nurse')return NURSE_TRAITS;
  if(role==='cna')return CNA_JOB_TRAITS;
  if(role==='janitor')return JANITOR_TRAITS;
  if(role==='security_officer')return SECURITY_TRAITS;
  if(role==='clerical')return CLERICAL_JOB_TRAITS;
  if(role==='it_specialist')return IT_JOB_TRAITS;
  if(role==='marketing_manager')return MARKETING_JOB_TRAITS;
  if(role==='hr_manager')return HR_JOB_TRAITS;
  if(role==='researcher')return RESEARCHER_JOB_TRAITS;
  if(role==='intern')return INTERN_JOB_TRAITS;
  if(role==='paramedic')return PARAMEDIC_JOB_TRAITS;
  if(role==='dispatcher')return DISPATCHER_JOB_TRAITS;
  if(role==='driver')return DRIVER_JOB_TRAITS;
  if(role==='pharmacist')return PHARMACIST_JOB_TRAITS;
  return CLERICAL_JOB_TRAITS;
}
function getSpecialTraitPoolForRole(role){
  return getJobTraitPool(role);
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
  const key=floorSpecializations?.[floor];
  if(key&&key!=='unchosen'&&FLOOR_SPECIALIZATIONS[key]&&!FLOOR_SPECIALIZATIONS[key].placeholder)return key;
  if(key&&FLOOR_SPEC_LEGACY_MAP[key]&&FLOOR_SPECIALIZATIONS[FLOOR_SPEC_LEGACY_MAP[key]])return FLOOR_SPEC_LEGACY_MAP[key];
  // Stored-but-unknown keys fall back to general_patient_care (per task spec);
  // a missing key on floor 1 also defaults to general; otherwise stays unchosen
  // so the picker can pop on first visit / connector unlock.
  if(key&&key!=='unchosen')return 'general_patient_care';
  return floor===1?'general_patient_care':'unchosen';
}
function getFloorSpecialization(floor=currentFloor){
  return FLOOR_SPECIALIZATIONS[getFloorSpecializationKey(floor)]||FLOOR_SPECIALIZATIONS.unchosen;
}
function isRoomAllowedOnFloor(tool,floor=currentFloor){
  if(!tool||tool==='demolish')return true;
  const isBuildableTool=!!RDEFS[tool]||isPathTool(tool);
  if(!isBuildableTool)return true;
  const def=RDEFS[tool];
  if(def&&def.firstFloorOnly)return floor===1;
  if(isSandboxMode)return true;
  const spec=getFloorSpecialization(floor);
  if(!spec||spec.id==='unchosen')return false;
  if(FLOOR_SPEC_UNIVERSAL_ROOMS.has(tool))return true;
  if(isPathTool(tool))return true;
  return (spec.unlockedRooms||[]).includes(tool);
}
function getFloorSpecLockReason(tool,floor=currentFloor){
  const def=RDEFS[tool];
  if(def&&def.firstFloorOnly&&floor!==1)return `${def.name} can only be built on Floor 1`;
  const spec=getFloorSpecialization(floor);
  if(!spec||spec.id==='unchosen')return `Choose a specialization for Floor ${floor} first`;
  return `Not allowed on Floor ${floor} (${spec.label})`;
}
function isRoomEstablished(rm){
  if(!rm)return false;
  const built=rm.builtDay??1;
  return (day-built)>=ROOM_ESTABLISHED_DAYS;
}
function isFloorRenovating(floor){
  const r=floorRenovations&&floorRenovations[floor];
  return !!(r&&r.active&&(r.daysLeft||0)>0);
}
function getFloorRenovationDaysLeft(floor){
  const r=floorRenovations&&floorRenovations[floor];
  return (r&&r.active)?(r.daysLeft||0):0;
}
function startFloorRenovation(floor){
  if(!floorRenovations)floorRenovations={};
  floorRenovations[floor]={active:true,daysLeft:FLOOR_RENOVATION_DAYS,startedDay:day};
  addLog(`Floor ${floor} entered renovation: speed reduced by 67% for ${FLOOR_RENOVATION_DAYS} days.`,'w');
  if(typeof showToast==='function')showToast(`Floor ${floor} renovation: ${FLOOR_RENOVATION_DAYS} days at 0.33x speed`,'warn');
  if(typeof updateFloorControls==='function')updateFloorControls();
}
function getFloorSpeedMultiplier(floor){
  return isFloorRenovating(floor)?FLOOR_RENOVATION_SPEED_MULT:1;
}
function getFloorRenovationSpeedMult(floor){return getFloorSpeedMultiplier(floor);}
function gateEstablishedRoomChange(rm,onConfirm){
  if(!rm){onConfirm&&onConfirm();return true;}
  const floor=getRoomFloor(rm);
  if(isFloorRenovating(floor)){onConfirm&&onConfirm();return true;}
  if(RENOVATION_EXEMPT_TYPES.has(rm.type)){onConfirm&&onConfirm();return true;}
  if(!isRoomEstablished(rm)){onConfirm&&onConfirm();return true;}
  openRenovationConfirmModal(rm,()=>{
    startFloorRenovation(floor);
    onConfirm&&onConfirm({skipRenovation:true});
  });
  return false;
}
function tickFloorRenovations(){
  if(!floorRenovations)return;
  Object.keys(floorRenovations).forEach(fk=>{
    const f=Number(fk);
    const r=floorRenovations[fk];
    if(!r||!r.active)return;
    r.daysLeft=Math.max(0,(r.daysLeft||0)-1);
    if(r.daysLeft<=0){
      delete floorRenovations[fk];
      addLog(`Floor ${f} renovation complete.`,'g');
      if(typeof showToast==='function')showToast(`Floor ${f} renovation complete`,'good');
    }
  });
  if(typeof updateFloorControls==='function')updateFloorControls();
}
function getSpecializedFloorCounts(){
  const counts={};
  if(!floorSpecializations)return counts;
  const limit=typeof getUnlockedFloorLimit==='function'?getUnlockedFloorLimit():MAX_FLOORS;
  for(let f=1;f<=Math.min(limit,MAX_FLOORS);f++){
    const k=floorSpecializations[f];
    if(!k||k==='unchosen'||!FLOOR_SPECIALIZATIONS[k])continue;
    counts[k]=(counts[k]||0)+1;
  }
  return counts;
}
function _floorSpecScale(n){
  let s=0;
  for(let i=0;i<n;i++)s+=FLOOR_SPEC_DIMINISH[Math.min(i,FLOOR_SPEC_DIMINISH.length-1)];
  return s;
}
// True when the player is below the public-care quota; gates Private Care
// scrutiny so it only applies when public care is being neglected.
function _isUnderPublicCareQuota(){
  if(typeof govRequired!=='number'||typeof totalPatients!=='number'||totalPatients<=0)return false;
  return getPublicCareRate()<govRequired;
}
function getFloorSpecializationBonus(){
  const b={
    grantApprovalBonus:0,
    dailyResearchPoints:0,
    researchSpeedBonus:0,
    privateRevenueMult:1,
    govCompliancePressure:0,
    wageBillMult:1,
    stressBaselineAdd:0,
    staffMoraleBonus:0,
    publicReputationBonus:0,
    diagnosticCostMult:1,
    hiringPoolBonus:0,
    traineeXpBonus:0,
    waitThresholdAdd:0
  };
  const counts=getSpecializedFloorCounts();
  Object.entries(counts).forEach(([key,n])=>{
    const spec=FLOOR_SPECIALIZATIONS[key];
    if(!spec)return;
    const scale=_floorSpecScale(n);
    const bo=spec.bonuses||{};
    const dr=spec.drawbacks||{};
    b.grantApprovalBonus+=(bo.grantApprovalBonus||0)*scale;
    b.dailyResearchPoints+=(bo.dailyResearchPoints||0)*scale;
    b.researchSpeedBonus+=(bo.researchSpeedBonus||0)*scale;
    b.govCompliancePressure+=(bo.govCompliancePressure||0)*scale;
    // Private compliance penalty only fires when below the public-care quota.
    if(key==='private_specialty'){
      if(_isUnderPublicCareQuota())b.govCompliancePressure+=(dr.govCompliancePressure||0)*scale;
    }else{
      b.govCompliancePressure+=(dr.govCompliancePressure||0)*scale;
    }
    b.hiringPoolBonus+=(bo.hiringPoolBonus||0)*scale;
    b.traineeXpBonus+=(bo.traineeXpBonus||0)*scale;
    b.stressBaselineAdd+=(dr.stressBaselineAdd||0)*scale;
    b.staffMoraleBonus+=(bo.staffMoraleBonus||0)*scale;
    b.publicReputationBonus+=(bo.publicReputationBonus||0)*scale;
    b.waitThresholdAdd+=(bo.waitThresholdAdd||0)*scale;
    if(bo.privateRevenueMult)b.privateRevenueMult*=Math.pow(bo.privateRevenueMult,scale);
    if(dr.privateRevenueMult)b.privateRevenueMult*=Math.pow(dr.privateRevenueMult,scale);
    if(dr.wageBillMult)b.wageBillMult*=Math.pow(dr.wageBillMult,scale);
    if(dr.diagnosticCostMult)b.diagnosticCostMult*=Math.pow(dr.diagnosticCostMult,scale);
    // Note: emergency_critical's stressGrowthMult is consumed directly in
    // updateStress() (gated by an actually-staffed emergency floor), not here.
  });
  return b;
}
function _floorSpecRoomScale(floor){
  if(!floorSpecializations)return 0;
  const key=floorSpecializations[floor];
  if(!key||key==='unchosen')return 0;
  let position=0;
  for(let f=1;f<=floor;f++){
    if(floorSpecializations[f]===key)position++;
  }
  if(position<=0)return 0;
  return FLOOR_SPEC_DIMINISH[Math.min(position-1,FLOOR_SPEC_DIMINISH.length-1)];
}
function getFloorSpecializationRoomSpeedMult(rm){
  if(!rm)return 1;
  const floor=getRoomFloor(rm);
  const spec=getFloorSpecialization(floor);
  if(!spec||spec.id==='unchosen')return 1;
  const scale=_floorSpecRoomScale(floor);
  if(scale<=0)return 1;
  const t=rm.type;
  let m=1;
  if(spec.id==='general_patient_care'&&['gp','ward','waiting_room','med_surg','single_hospital_room','double_hospital_room','pediatrics'].includes(t)){
    m*=1-((spec.bonuses.generalSpeedBonus||0)*scale);
  }
  if(spec.id==='emergency_critical'&&['er','general_icu','cardiac_icu','surgery','dispatch_office','ambulance_bay','trauma_bay','observation_room'].includes(t)){
    m*=1-((spec.bonuses.emergencySpeedBonus||0)*scale);
  }
  if(spec.id==='diagnostics'&&['lab','xray','radiology'].includes(t)){
    m*=1-((spec.bonuses.diagnosticSpeedBonus||0)*scale);
  }
  if(spec.id==='surgical'&&['surgery','plastic_surgery_or','operating_room','pacu','surgical_recovery'].includes(t)){
    m*=1-((spec.bonuses.surgicalSpeedBonus||0)*scale);
  }
  if(spec.id==='research_university'&&isClinicalRoomType(t)){
    m*=1+((spec.drawbacks?.generalSpeedPenalty||0)*scale);
  }
  return m;
}
function isSurgicalRoomType(t){return ['surgery','plastic_surgery_or','operating_room','pacu','surgical_recovery'].includes(t);}
function isPrivateRoomType(t){return ['vip_room','single_hospital_room','double_hospital_room','premium_recovery_suite','luxury_recovery_suite','cosmetic_recovery_suite','aesthetic_procedure_room'].includes(t);}
function getFloorSpecializationRoomRevMult(rm){
  if(!rm)return 1;
  const floor=getRoomFloor(rm);
  const spec=getFloorSpecialization(floor);
  if(!spec||spec.id==='unchosen')return 1;
  const scale=_floorSpecRoomScale(floor);
  if(scale<=0)return 1;
  let m=1;
  if(spec.id==='surgical'&&isSurgicalRoomType(rm.type)){
    const v=spec.bonuses?.surgicalRevenueMult;
    if(v)m*=1+((v-1)*scale);
  }
  if(spec.id==='private_specialty'&&isPrivateRoomType(rm.type)){
    const v=spec.bonuses?.privateRoomFloorRevMult;
    if(v)m*=1+((v-1)*scale);
  }
  return m;
}
function isDiagnosticTool(tool){return ['lab','xray','radiology'].includes(tool);}
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
  const prevKey=floorSpecializations[floor];
  floorSpecializations[floor]=key;
  const spec=getFloorSpecialization(floor);
  if(key==='unchosen'){
    addLog(`Floor ${floor} specialization cleared.`,'w');
  }else if(prevKey&&prevKey!=='unchosen'&&prevKey!==key){
    addLog(`Floor ${floor} renovated to ${spec.icon} ${spec.label}.`,'g');
    showToast(`Floor ${floor} → ${spec.label}`,'good');
  }else{
    addLog(`Floor ${floor} specialized for ${spec.icon} ${spec.label}.`,'g');
    showToast(`Floor ${floor} → ${spec.label}`,'good');
  }
  if(selTool&&!isRoomAllowedOnFloor(selTool,floor))selTool=null;
  updateUI();
  render();
}
function openFloorSpecModal(floor=currentFloor,opts={}){
  const modal=document.getElementById('floorspecmodal');
  if(!modal)return;
  modal.dataset.floor=String(floor);
  modal.dataset.mode=opts.renovate?'renovate':'choose';
  modal.classList.add('open');
  renderFloorSpecModal();
}
function closeFloorSpecModal(force){
  const modal=document.getElementById('floorspecmodal');
  if(!modal)return;
  const floor=Number(modal.dataset.floor||currentFloor);
  const isRenovate=modal.dataset.mode==='renovate';
  // Cancelling on an unchosen floor defaults it to General Patient Care so
  // the floor is never left in an unbuildable state.
  if(!isRenovate&&getFloorSpecializationKey(floor)==='unchosen'){
    setFloorSpecialization('general_patient_care',floor);
  }
  modal.classList.remove('open');
}
function getFloorRenovationCost(floor){
  const roomsOnFloor=Array.isArray(rooms)?rooms.filter(r=>(r.floor||1)===floor).length:0;
  const _mapMult=(typeof getMapBonus==='function'?(getMapBonus().renovationCostMultiplier||1):1);
  return Math.round((25000+roomsOnFloor*2500)*_mapMult);
}
function chooseFloorSpec(key){
  const modal=document.getElementById('floorspecmodal');
  const floor=modal?Number(modal.dataset.floor||currentFloor):currentFloor;
  const isRenovate=modal&&modal.dataset.mode==='renovate';
  if(isRenovate){
    const currentKey=getFloorSpecializationKey(floor);
    if(currentKey===key){closeFloorSpecModal(true);return;}
    const cost=getFloorRenovationCost(floor);
    if(!isSandboxMode&&money<cost){
      addLog(`Renovating Floor ${floor} costs $${cost.toLocaleString()} — not enough cash on hand.`,'b');
      showToast(`Need $${cost.toLocaleString()} to renovate`,'warn');
      return;
    }
    const spec=FLOOR_SPECIALIZATIONS[key];
    if(!confirm(`Renovate Floor ${floor} to ${spec.icon} ${spec.label} for $${cost.toLocaleString()}?\n\nExisting rooms keep working, but new construction is restricted to the new specialization. Diminishing returns apply if you stack the same specialization.`))return;
    if(!isSandboxMode){
      changeMoney(-cost);
      addLog(`Floor ${floor} renovation paid: -$${cost.toLocaleString()}.`,'b');
    }
  }
  setFloorSpecialization(key,floor);
  closeFloorSpecModal(true);
}
function renderFloorSpecModal(){
  const modal=document.getElementById('floorspecmodal');
  const panel=document.getElementById('floorspec-content');
  const title=document.getElementById('floorspecmodal-title');
  const sub=document.getElementById('floorspecmodal-subtitle');
  const closeBtn=document.getElementById('floorspecmodal-close');
  if(!modal||!panel)return;
  const floor=Number(modal.dataset.floor||currentFloor);
  const isRenovate=modal.dataset.mode==='renovate';
  const currentKey=getFloorSpecializationKey(floor);
  const mandatory=!isRenovate&&currentKey==='unchosen';
  if(closeBtn)closeBtn.style.display=mandatory?'none':'';
  if(title)title.textContent=isRenovate
    ?`Renovate Floor ${floor}`
    :`Choose a Specialization for Floor ${floor}`;
  if(sub)sub.textContent=isRenovate
    ?'Switching specialization changes which rooms you can build going forward. Existing rooms keep working. Stacking the same specialization on multiple floors yields diminishing returns.'
    :'Specialization shapes which rooms you can build here and adds passive bonuses (and drawbacks) hospital-wide. Stacking the same specialization on multiple floors yields diminishing returns.';
  const counts=getSpecializedFloorCounts();
  // Render order is taken straight from the data table so adding a new
  // specialization requires no UI change.
  const order=Object.keys(FLOOR_SPECIALIZATIONS).filter(k=>k!=='general'&&!FLOOR_SPECIALIZATIONS[k].placeholder);
  let html=`<div class="floorspec-grid">`;
  order.forEach(key=>{
    const spec=FLOOR_SPECIALIZATIONS[key];
    if(!spec||spec.placeholder)return;
    const active=currentKey===key;
    const stackCount=counts[key]||0;
    const stackLabel=stackCount>0?`<span class="floorspec-stack">${stackCount} floor${stackCount===1?'':'s'} active</span>`:'';
    const bonusList=(spec.bonusText||[]).map(t=>`<div class="exec-pill good">${t}</div>`).join('');
    const drawbackList=(spec.drawbackText||[]).map(t=>`<div class="exec-pill bad">${t}</div>`).join('');
    const unlockedNames=(spec.unlockedRooms||[]).filter(t=>RDEFS[t]).map(t=>RDEFS[t].name);
    const unlockedList=unlockedNames.length?`<div class="floorspec-reserved-row"><div class="floorspec-reserved-label">Buildable rooms (${unlockedNames.length}):</div><div class="floorspec-reserved-list">${unlockedNames.map(r=>`<span class="floorspec-reserved-chip floorspec-unlocked-chip">${r}</span>`).join('')}</div></div>`:'';
    const reservedList=(spec.reservedRooms||[]).length?`<div class="floorspec-reserved-row"><div class="floorspec-reserved-label">Future rooms (reserved):</div><div class="floorspec-reserved-list">${spec.reservedRooms.map(r=>`<span class="floorspec-reserved-chip">${r}</span>`).join('')}</div></div>`:'';
    html+=`<div class="exec-card floorspec-card${active?' exec-card-active floorspec-card-active':' exec-card-available'}" style="--spec-color:${spec.color};border-left:4px solid ${spec.color};">
      <div class="exec-card-head">
        <span class="exec-icon" style="background:${spec.color}22;color:${spec.color};">${spec.icon}</span>
        <div class="exec-card-title-wrap">
          <div class="exec-card-name" style="color:${spec.color};">${spec.label}</div>
          <div class="exec-card-archetype">${active?'Currently active on this floor':spec.id==='general_patient_care'?'Balanced — safe default':'Specialized'}</div>
        </div>
        ${stackLabel}
      </div>
      <div class="exec-desc">${spec.description||''}</div>
      <div class="exec-bonus-row">
        <div class="exec-bonus-col">
          <div class="exec-pill-head">Bonuses</div>
          ${bonusList||'<div class="floorspec-empty">No passive bonuses.</div>'}
        </div>
        <div class="exec-bonus-col">
          <div class="exec-pill-head">Drawbacks</div>
          ${drawbackList||'<div class="floorspec-empty">No drawbacks.</div>'}
        </div>
      </div>
      ${unlockedList}
      ${reservedList}
      <button class="exec-hire-btn floorspec-pick-btn" ${active?'disabled':''} onclick="chooseFloorSpec('${key}')">${active?'Already Active':isRenovate?`Renovate to ${spec.label}`:`Choose ${spec.label}`}</button>
    </div>`;
  });
  html+=`</div>`;
  if(isRenovate){
    const cost=getFloorRenovationCost(floor);
    html+=`<div class="floorspec-foot">Renovating Floor ${floor} costs <strong>$${cost.toLocaleString()}</strong> ($25,000 base + $2,500 per existing room). Existing rooms keep working — only future construction is restricted.</div>`;
  }
  panel.innerHTML=html;
}
function syncActiveGrid(){grid=getFloorGrid(currentFloor);}
function getRoomsOnFloor(floor=currentFloor){return rooms.filter(room=>getRoomFloor(room)===floor);}
function floorHasVerticalConnector(floor){
  return rooms.some(room=>getRoomFloor(room)===floor&&['staircase','elevator'].includes(room.type)&&isConn(room)&&!isRoomTemporarilyDisabled(room));
}
function getUnlockedFloorLimit(){
  if(isSandboxMode)return MAX_FLOORS;
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
  const renoSuffix=isFloorRenovating(currentFloor)?` · 🛠 Renovation ${getFloorRenovationDaysLeft(currentFloor)}d (33% speed)`:'';
  if(label)label.textContent=`Floor ${currentFloor}${renoSuffix}`;
  if(meta)meta.textContent=`Unlocked ${unlockedLimit}/${MAX_FLOORS}${renoSuffix}`;
  if(panelMeta)panelMeta.textContent=`Unlocked ${unlockedLimit}/${MAX_FLOORS}${renoSuffix}`;
  if(specializationCurrent){
    const summary=(floorSpecialty.bonusText||[]).slice(0,2).join(' • ')||(floorSpecialty.id==='unchosen'?'No bonuses yet — choose a specialization':'No active bonuses');
    const accent=floorSpecialty.color||'#5fa9d6';
    specializationCurrent.innerHTML=`<span class="floor-spec-badge" style="color:${accent};border-left:3px solid ${accent};padding-left:6px;">${floorSpecialty.icon} ${floorSpecialty.label}</span><span class="floor-spec-summary" title="${(floorSpecialty.bonusText||[]).concat(floorSpecialty.drawbackText||[]).join(' • ')}">${summary}</span>`;
  }
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
      const accent=floorMeta.color||'#5fa9d6';
      const isActive=floor===currentFloor;
      const styleAttr=unlocked&&isActive?` style="background:linear-gradient(180deg, ${accent}, ${accent}cc);border-color:${accent};color:#fff;"`:(unlocked?` style="border-left:3px solid ${accent};"`:'');
      return `<button class="${stateClass}" type="button" ${unlocked?'':'disabled'} aria-label="Switch to floor ${floor}"${styleAttr} onclick="setCurrentFloor(${floor})">Floor ${floor}${lockText}<br><span style="font-size:9px;font-weight:600;opacity:${unlocked?'.92':'.64'}">${floorMeta.icon} ${floorMeta.label}</span></button>`;
    }).join('');
  }
  if(specializationList){
    const isUnchosen=getFloorSpecializationKey(currentFloor)==='unchosen';
    specializationList.innerHTML=isUnchosen
      ? `<button class="floor-specialization-action choose" type="button" aria-label="Choose specialization for floor ${currentFloor}" onclick="openFloorSpecModal(${currentFloor})">Choose Specialization…</button>`
      : `<button class="floor-specialization-action renovate" type="button" aria-label="Renovate floor ${currentFloor}" onclick="openFloorSpecModal(${currentFloor},{renovate:true})">🛠 Renovate Floor</button>`;
  }
  if(typeof _renderBuildCards==='function'&&_buildMenuState&&_buildMenuState.tab==='locked'){
    _renderBuildCards();
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
  if(!silent&&target!==1&&getFloorSpecializationKey(target)==='unchosen'&&!document.getElementById('floorspecmodal')?.classList.contains('open')){
    setTimeout(()=>openFloorSpecModal(target),60);
  }
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
  const jobPool=getJobTraitPool(member.role);
  const oldTraits=Array.isArray(member.traits)?member.traits:[];
  // Role-aware legacy ID remap for renamed traits (preserve role-specific identity).
  const remapLegacyId=(id)=>{
    if(!id)return id;
    if(member.role==='marketing_manager'&&id==='community_voice')return 'community_megaphone';
    return id;
  };
  // Fill each trait slot independently so migration never clobbers a valid existing slot.
  if(!member.positiveTrait){
    const oldPos=member.personalityTrait||oldTraits.find(t=>UNIVERSAL_POSITIVE_TRAITS.some(p=>p.id===t.id));
    member.positiveTrait=oldPos&&UNIVERSAL_POSITIVE_TRAITS.some(p=>p.id===oldPos.id)
      ?{...oldPos}
      :pickTrait(UNIVERSAL_POSITIVE_TRAITS);
  }
  if(!member.jobTrait){
    const oldSpecial=member.specialTrait||oldTraits.find(t=>{
      const remap=remapLegacyId(t.id);
      return jobPool&&jobPool.some(base=>base.id===remap);
    });
    const lookupId=oldSpecial?remapLegacyId(oldSpecial.id):null;
    // Prefer the role's own pool first to avoid cross-role id collisions, then fall back to global lookup.
    const roleMatch=lookupId&&jobPool?jobPool.find(base=>base.id===lookupId):null;
    const rawJob=roleMatch||(lookupId?traitById(lookupId):null);
    member.jobTrait=rawJob?{...rawJob}:pickTrait(jobPool);
  }
  if(!member.negativeTrait){
    const oldNeg=oldTraits.find(t=>UNIVERSAL_NEGATIVE_TRAITS.some(n=>n.id===t.id));
    member.negativeTrait=oldNeg?{...oldNeg}:pickTrait(UNIVERSAL_NEGATIVE_TRAITS);
  }
  // Apply legacy ID remap to an already-set jobTrait so renamed IDs (e.g. marketing 'community_voice'
  // -> 'community_megaphone') get pulled forward instead of resolving to a different role's pool.
  if(member.jobTrait&&remapLegacyId(member.jobTrait.id)!==member.jobTrait.id){
    const remappedId=remapLegacyId(member.jobTrait.id);
    const replacement=(jobPool&&jobPool.find(base=>base.id===remappedId))||traitById(remappedId);
    if(replacement)member.jobTrait={...replacement};
  }
  // Canonicalize each slot from its source pool when possible so partially-migrated saves
  // pick up current label / desc / tone / icon / effect fields rather than carrying stale shape.
  const canonPositive=UNIVERSAL_POSITIVE_TRAITS.find(t=>t.id===member.positiveTrait?.id);
  if(canonPositive)member.positiveTrait={...canonPositive};
  const canonJob=(jobPool&&jobPool.find(t=>t.id===member.jobTrait?.id))||(member.jobTrait?.id?traitById(member.jobTrait.id):null);
  if(canonJob)member.jobTrait={...canonJob};
  const canonNegative=UNIVERSAL_NEGATIVE_TRAITS.find(t=>t.id===member.negativeTrait?.id);
  if(canonNegative)member.negativeTrait={...canonNegative};
  // Normalize type fields
  member.positiveTrait={...member.positiveTrait,type:'positive'};
  member.jobTrait={...member.jobTrait,type:'job'};
  member.negativeTrait={...member.negativeTrait,type:'negative'};
  // Level / XP / perk back-fill (applies to interns and non-interns alike).
  member.level=Math.max(1,Math.min(LEVEL_TIERS.length,Math.round(Number(member.level)||1)));
  member.xp=Math.max(0,Number.isFinite(member.xp)?member.xp:0);
  const tier=getLevelTier(member.level);
  member.xpToNext=tier.xpToNext;
  member.salaryMultiplier=tier.salaryMultiplier;
  member.negativeTraitStrength=tier.negativeTraitStrength;
  if(!Array.isArray(member.extraPerks))member.extraPerks=[];
  // Build the per-frame trait list. Negative trait numeric fields are scaled toward neutral
  // by negativeTraitStrength so every consumer that reads s.traits[*] auto-applies the level effect.
  const negStrength=member.negativeTraitStrength;
  const negSrc=member.negativeTrait;
  const negScaled={...negSrc,type:'negative',_scaled:true};
  if(Number.isFinite(negSrc.speedMult))negScaled.speedMult=scaleAboveOneMult(negSrc.speedMult,negStrength);
  if(Number.isFinite(negSrc.errorChance))negScaled.errorChance=negSrc.errorChance*negStrength;
  if(Number.isFinite(negSrc.extraEnergyDrain))negScaled.extraEnergyDrain=negSrc.extraEnergyDrain*negStrength;
  if(Number.isFinite(negSrc.energyDrainMult))negScaled.energyDrainMult=scaleAboveOneMult(negSrc.energyDrainMult,negStrength);
  if(Number.isFinite(negSrc.waitAdd))negScaled.waitAdd=negSrc.waitAdd*negStrength;
  member.traits=[member.positiveTrait,member.jobTrait,negScaled,...(member.extraPerks||[])];
  // Backward compat: gameplay code that reads specialTrait gets jobTrait
  member.specialTrait=member.jobTrait;
  member.personalityTrait=member.positiveTrait;
  member.workTrait=null;
  return member;
}

let isSandboxMode=false;
let currentCEO=null;
let boardMembers=[];
const MAX_BOARD_MEMBERS=5;
let ceoLegacyCooldown=0;
let researchPoints=0;
let money=STARTING_CASH,day=1,score=0,totalTreated=0,monthlyInc=0,incAccum=0,reputation=70,cleanliness=78,stress=0,adReach=0;
let auditoriumCrowdingDays=0,prisonerWingActive=false;
let floorGrids=makeFloorGrids();
let floorSpecializations=makeFloorSpecializations();
let floorPanelHidden=true;
let floorPanelPosition=null;
let currentFloor=1;
let floorRenovations={};
let grid=floorGrids[0];
let rooms=[],patients=[],staff=[],logs=[];
let selTool=null,buildRotation=0,gameTime=0,speed=1,paused=false,patId=0,staffId=0,zoom=1,zoomVisual=1,zoomTweenFrom=1,zoomTweenStart=null,zoomFeedbackTimer=null,selectedRoomId=null;
let departments=makeDepartments();
let techTree=makeTechTree();
let hover={x:-1,y:-1},dragging=false;
let eventFocusRoomId=null,eventFocusUntil=0;
let eventStats={totalEvents:0,emergencies:0,staffIncidents:0,complaints:0};
let eventMemory={};
let specialtyServiceStats={cosmeticCases:0,studentVisits:0,spermDeposits:0,ivfCycles:0,ethicsReviews:0,complianceIncidents:0,cryoReliability:100,universityContractActive:false};
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
let researchedTech=new Set(),unlockedFeatures=new Set(),activeResearch=null,researchLog=[],researchMilestonesFired=new Set(),unlockedIdentities=new Set();
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
let statsHistory=[];
let staffShiftFilter='day';
let staffTraitFilter='';
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
    {label:'Draw corridors to connect your rooms',done:hasAnyCorridorBuilt()},
    {label:'Place a Waiting Room — patients queue here',done:rooms.some(r=>r.type==='waiting_room')},
    {label:'Place a GP Office — first treatment room',done:rooms.some(r=>r.type==='gp')},
    {label:'Hire a Clerical worker for patient intake',done:staff.some(s=>s.hired&&s.role==='clerical')},
    {label:'Hire a GP Doctor to staff the GP Office',done:staff.some(s=>s.hired&&s.role==='gp_doc')},
    {label:'Hire a Nurse for treatment support',done:staff.some(s=>s.hired&&s.role==='nurse')},
    {label:'Hire a Janitor to keep the clinic clean',done:staff.some(s=>s.hired&&s.role==='janitor')},
    {label:'Press Play to start the clinic day',done:hasStarted&&!paused},
    {label:'Treat your first patient',done:typeof totalTreated==='number'&&totalTreated>=1}
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
  if(totalPatients===0)return'Status: Monitoring — Asherville is watching for your first intake.';
  return getPublicCareRate()>=govRequired
    ?'Status: Compliant — Asherville officials are satisfied with your public care levels.'
    :'Status: At Risk — public care levels are slipping. Future funding may be reviewed.';
}
function getDaysUntilGovernmentReview(){
  return Math.max(1,30-((day-1)%30));
}
function updateGovernmentContract(){
  const panel=document.getElementById('gov-contract');
  const current=document.getElementById('govCurrent');
  const status=document.getElementById('govStatus');
  if(!panel||!current||!status)return;
  const quotaEl=document.getElementById('govQuota');
  const penaltyEl=document.getElementById('govPenalty');
  const barFillEl=document.getElementById('govBarFill');
  const barReqEl=document.getElementById('govBarReq');
  const pressureHintEl=document.getElementById('govPressureHint');

  // Match the modal's effective-required math so contract pressure / leadership bonuses are reflected.
  const boost=typeof getInsuranceBoost==='function'?getInsuranceBoost():{govCompliancePressure:0};
  const lb=typeof getLeadershipBonus==='function'?getLeadershipBonus():{govCompliancePressure:0,govRequirementBonus:0};
  const govPressure=(boost.govCompliancePressure||0)+(lb.govCompliancePressure||0);
  const govReqBonus=lb.govRequirementBonus||0;
  const baseReq=(typeof govRequired!=='undefined'?govRequired:0.35);
  const effectiveRequired=Math.min(0.9,baseReq+Math.max(0,govPressure)+govReqBonus);
  const rate=typeof getPublicCareRate==='function'?getPublicCareRate():0;
  const hasPatients=(typeof totalPatients!=='undefined'&&totalPatients>0);
  const pct=Math.round(rate*100);
  const reqPct=Math.round(effectiveRequired*100);
  // Absolute 0..100% scale so the required marker reads as a real threshold tick.
  const barFill=Math.min(100,Math.max(0,Math.round(rate*100)));
  const reqMarkerPos=Math.min(99,Math.max(1,Math.round(effectiveRequired*100)));
  const days=typeof getDaysUntilGovernmentReview==='function'?getDaysUntilGovernmentReview():30;

  let nextState='monitoring';
  let statusLabel='Monitoring';
  let statusCls='ic-gov-status--idle';
  panel.classList.remove('warning','danger');

  if(!hasPatients){
    statusLabel='Monitoring';
    statusCls='ic-gov-status--idle';
    nextState='monitoring';
  }else if(rate>=effectiveRequired){
    statusLabel='Compliant';
    statusCls='ic-gov-status--ok';
    nextState='compliant';
  }else if(rate>=effectiveRequired-0.08){
    statusLabel='At Risk';
    statusCls='ic-gov-status--warn';
    panel.classList.add('warning');
    nextState='warning';
  }else{
    statusLabel='Non-Compliant';
    statusCls='ic-gov-status--danger';
    panel.classList.add('danger');
    nextState='danger';
  }

  current.textContent=pct+'%';
  if(quotaEl)quotaEl.textContent=reqPct+'%';
  if(penaltyEl)penaltyEl.textContent=`Next Review: ${days} day${days===1?'':'s'}`;
  status.textContent=statusLabel;
  status.classList.remove('ic-gov-status--idle','ic-gov-status--ok','ic-gov-status--warn','ic-gov-status--danger');
  status.classList.add(statusCls);
  if(barFillEl){
    barFillEl.style.width=barFill+'%';
    barFillEl.classList.remove('ic-gm-ok','ic-gm-warn','ic-gm-danger');
    barFillEl.classList.add(nextState==='compliant'?'ic-gm-ok':nextState==='warning'?'ic-gm-warn':nextState==='danger'?'ic-gm-danger':'ic-gm-ok');
  }
  if(barReqEl){
    barReqEl.style.left=reqMarkerPos+'%';
    barReqEl.title=`Required: ${reqPct}%`;
  }
  if(pressureHintEl){
    // Mirror the modal's ic-gov-pressure-warn threshold (>0.04) so the hint only
    // surfaces when contract pressure has meaningfully shifted the target.
    if(govPressure>0.04){
      pressureHintEl.textContent=`\u26a0 Active contracts raise your effective target by +${Math.round(govPressure*100)}pp \u2014 compliance is harder to maintain.`;
      pressureHintEl.hidden=false;
    }else{
      pressureHintEl.textContent='';
      pressureHintEl.hidden=true;
    }
  }
  const meter=panel.querySelector('.gov-card-meter');
  if(meter){
    meter.setAttribute('aria-valuenow',String(pct));
    meter.setAttribute('aria-valuemax','100');
    meter.setAttribute('aria-valuetext',`${pct}% of ${reqPct}% required`);
  }
  const consEl=document.getElementById('govConsequence');
  if(consEl){
    let consText;
    if(nextState==='compliant')consText='Reward: city grant + reputation gain at next review.';
    else if(nextState==='warning')consText=`At Risk: lift public care above ${reqPct}% before review or grants and rep take a hit.`;
    else if(nextState==='danger')consText=`Non-Compliant: review will cut funding and reputation. Take public-care patients now.`;
    else consText='Treat enough low/no-profit patients to stay compliant and earn the city grant.';
    consEl.textContent=consText;
  }

  if(govContractVisualState!==nextState){
    panel.classList.add('panel-pulse');
    setTimeout(()=>panel.classList.remove('panel-pulse'),500);
    govContractVisualState=nextState;
  }
}
function getLeadershipBonus(){
  const b={govPenaltyMult:1,grantApprovalBonus:0,privateRevenueMult:1,patientTrafficBonus:0,
    researchSpeedBonus:0,dailyResearchPoints:0,roomCostMult:1,corridorCostMult:1,
    insuranceIncomeMult:1,govCompliancePressure:0,stressReductionBonus:0,
    staffMoraleBonus:0,wageBillMult:1,auditChanceMult:1,sterileFailurePenaltyMult:1,
    trainingMistakeChanceMult:1,itOutagePenaltyMult:1,cleanDecayMult:1,
    waitingRoomCostMult:1,gpCostMult:1,
    raiseCostMult:1,govRequirementBonus:0,grantRewardMult:1,
    privateRoomCostMult:1,publicReputationBonus:0};
  function _applyMult(src,field,strength){
    if(src[field]==null)return;
    b[field]*=1+(src[field]-1)*strength;
  }
  function _applyAdd(src,field,strength){
    if(!src[field])return;
    b[field]+=src[field]*strength;
  }
  function applyBonusBlock(src,strength=1,isNeg=false){
    if(!src)return;
    // multiplicative fields
    if(!isNeg){
      if(src.govPenaltyMult!=null)b.govPenaltyMult*=src.govPenaltyMult;
      if(src.privateRevenueMult!=null)b.privateRevenueMult*=src.privateRevenueMult;
      if(src.roomCostMult!=null)b.roomCostMult*=src.roomCostMult;
      if(src.corridorCostMult!=null)b.corridorCostMult*=src.corridorCostMult;
      if(src.insuranceIncomeMult!=null)b.insuranceIncomeMult*=src.insuranceIncomeMult;
      if(src.wageBillMult!=null)b.wageBillMult*=src.wageBillMult;
      if(src.sterileFailurePenaltyMult!=null)b.sterileFailurePenaltyMult*=src.sterileFailurePenaltyMult;
      if(src.waitingRoomCostMult!=null)b.waitingRoomCostMult*=src.waitingRoomCostMult;
      if(src.gpCostMult!=null)b.gpCostMult*=src.gpCostMult;
      if(src.cleanDecayMult!=null)b.cleanDecayMult*=src.cleanDecayMult;
    } else {
      // negative CEO effects: scale by negStrength
      _applyMult(src,'govPenaltyMult',strength);
      _applyMult(src,'privateRevenueMult',strength);
      _applyMult(src,'roomCostMult',strength);
      _applyMult(src,'corridorCostMult',strength);
      _applyMult(src,'insuranceIncomeMult',strength);
      _applyMult(src,'wageBillMult',strength);
      _applyMult(src,'sterileFailurePenaltyMult',strength);
      _applyMult(src,'auditChanceMult',strength);
      _applyMult(src,'trainingMistakeChanceMult',strength);
      _applyMult(src,'itOutagePenaltyMult',strength);
    }
    // multiplicative fields shared by both bonus and drawback (board members)
    if(src.raiseCostMult!=null)b.raiseCostMult*=src.raiseCostMult;
    if(src.grantRewardMult!=null)b.grantRewardMult*=src.grantRewardMult;
    if(src.privateRoomCostMult!=null)b.privateRoomCostMult*=src.privateRoomCostMult;
    // additive fields
    _applyAdd(src,'grantApprovalBonus',strength);
    _applyAdd(src,'patientTrafficBonus',strength);
    _applyAdd(src,'researchSpeedBonus',strength);
    _applyAdd(src,'dailyResearchPoints',strength);
    _applyAdd(src,'govCompliancePressure',strength);
    _applyAdd(src,'stressReductionBonus',strength);
    _applyAdd(src,'staffMoraleBonus',strength);
    _applyAdd(src,'govRequirementBonus',strength);
    _applyAdd(src,'publicReputationBonus',strength);
  }
  if(currentCEO){
    const adaptPct=Math.min(1,(currentCEO.daysInRole||0)/Math.max(1,currentCEO.adaptationDays||30));
    const negStrength=Math.max(0.25,1-(adaptPct*0.75));
    currentCEO.negativeTraitStrength=negStrength;
    currentCEO.adaptationProgress=adaptPct;
    applyBonusBlock(currentCEO.bonuses,1,false);
    applyBonusBlock(currentCEO.negativeEffect,negStrength,true);
  }
  (boardMembers||[]).forEach(m=>{
    const eff=m.effects||{bonus:m.bonus,drawback:m.drawback};
    applyBonusBlock(eff.bonus,1,false);
    applyBonusBlock(eff.drawback,1,false);
  });
  // Floor specialization passive bonuses fold into the leadership aggregator so
  // existing consumers (grant approval, research, private revenue, scrutiny,
  // wages, morale) automatically pick them up.
  if(typeof getFloorSpecializationBonus==='function'){
    const fb=getFloorSpecializationBonus();
    b.grantApprovalBonus+=fb.grantApprovalBonus||0;
    b.dailyResearchPoints+=fb.dailyResearchPoints||0;
    b.researchSpeedBonus+=fb.researchSpeedBonus||0;
    b.privateRevenueMult*=fb.privateRevenueMult||1;
    b.govCompliancePressure+=fb.govCompliancePressure||0;
    b.wageBillMult*=fb.wageBillMult||1;
    b.staffMoraleBonus+=fb.staffMoraleBonus||0;
    b.publicReputationBonus+=fb.publicReputationBonus||0;
  }
  // Hospital identity path bonuses fold into the same aggregator so consumers
  // (event resolution, supply costs, audit penalties) automatically pick them up.
  if(typeof IDENTITY_PATHS!=='undefined'&&typeof isIdentityUnlocked==='function'){
    const _idMult=(field,v)=>{if(v!=null&&b[field]!=null)b[field]*=v;};
    const _idAdd=(field,v)=>{if(v!=null&&b[field]!=null)b[field]+=v;};
    IDENTITY_PATHS.forEach(path=>{
      if(path.placeholder)return;
      if(!isIdentityUnlocked(path.id))return;
      [path.bonuses,path.drawbacks].forEach(src=>{
        if(!src)return;
        // Only fields whose authoritative consumer reads from getLeadershipBonus
        // are mapped here. governmentPenaltyMult and researchPointBonus are
        // applied via getTechBonus to avoid double-counting against their
        // respective consumers.
        _idAdd('publicReputationBonus',src.publicReputationBonus);
        _idMult('sterileFailurePenaltyMult',src.sterileFailurePenaltyMult);
        _idMult('trainingMistakeChanceMult',src.trainingMistakeChanceMult);
        _idMult('itOutagePenaltyMult',src.itOutagePenaltyMult);
      });
    });
  }
  return b;
}
function leadershipPayroll(){
  let total=0;
  if(currentCEO)total+=currentCEO.salary||0;
  (boardMembers||[]).forEach(m=>total+=m.salary||0);
  return total;
}

function governmentReview(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{governmentPenaltyMult:1};
  const boost=getInsuranceBoost();
  const govPressure=(boost.govCompliancePressure||0)+(getLeadershipBonus().govCompliancePressure||0);
  const govReqBonus=getLeadershipBonus().govRequirementBonus||0;
  const effectiveRequired=clamp(govRequired+Math.max(0,govPressure)+govReqBonus,0,0.9);
  if(boost.patients>0.5){
    govRequired=clamp(govRequired+0.05,0,0.8);
    addLog('Government increased public care quota due to high private patient volume. Treat more uninsured patients or drop a private contract to keep the ratio safe.','w');
    showToast('Quota raised — treat more public patients','warn');
  }
  if(govPressure>=0.10){
    addLog('Corporate contracts are straining your government compliance position.','w');
  }
  const percent=govTreated/Math.max(totalPatients,1);
  const repGain=boost.reputationGain||0;
  if(repGain>0){adjustReputation(Math.round(repGain),'Public contract reputation benefit','g');}
  else if(repGain<0){adjustReputation(Math.round(repGain),'Private contract public image cost','b');}

  if(percent<effectiveRequired){
    const hasCorpActive=insuranceContracts.some(c=>c.id==='corporate_health');
    const leadBonus=getLeadershipBonus();
    const penMult=(techBonus.governmentPenaltyMult||1)*(leadBonus.govPenaltyMult||1)*(getMapBonus().governmentPressureMultiplier||1);
    adjustReputation(-Math.max(1,Math.round(5*penMult)),'Asherville Public Care Review penalty','b');
    changeMoney(-Math.max(500,Math.round(2000*penMult)));
    const flavorEvent=ASHERVILLE_LORE_EVENTS[Math.floor(Math.random()*ASHERVILLE_LORE_EVENTS.length)];
    if(hasCorpActive)addLog(`${flavorEvent}: Corporate Health Plan is diverting resources from your Asherville public care duty. Drop the Corporate contract or treat more uninsured patients to stay above quota.`,'b');
    else addLog(`Asherville Public Care Review failed — ${flavorEvent.toLowerCase()} convened over insufficient public care. Treat more uninsured patients or research Government Compliance to soften penalties.`,'b');
    showToast('Public Care Review failed — raise public-care ratio','warn');
  }else{
    const repBonus=percent>=govRequired+0.1?3:2;
    adjustReputation(repBonus,'Asherville officials satisfied with public care levels','g');
    addLog('Public Care Review passed. Asherville officials are satisfied.','g');
    showToast('Public Care Review passed','good');
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
  const positiveTrait=pickTrait(UNIVERSAL_POSITIVE_TRAITS);
  const jobPool=getJobTraitPool(role);
  const jobTrait=pickTrait(jobPool);
  const negativeTrait=pickTrait(UNIVERSAL_NEGATIVE_TRAITS);
  // Salary nudges from specific traits (only IDs that actually exist in the active pools).
  if(positiveTrait.id==='budget_minded')salary=Math.round(salary*0.95);
  if(jobTrait.id==='rushed_clinician')salary=Math.round(salary*1.03);
  salary+=Math.round((Math.random()-.5)*salary*0.12);
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
    positiveTrait,
    jobTrait,
    negativeTrait,
    traits:[positiveTrait,jobTrait,negativeTrait],
    xp:0,
    level:1,
    xpToNext:LEVEL_TIERS[0].xpToNext,
    salaryMultiplier:LEVEL_TIERS[0].salaryMultiplier,
    negativeTraitStrength:LEVEL_TIERS[0].negativeTraitStrength,
    extraPerks:[]
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
  if(showTitle)renderTitleChallengeList();
  updateTitleMenuActions();
  updateTitleFooterMeta();
  updateMenuBlurState();
}
function hasSavedGame(){
  try{return !!(typeof SAVE_KEY!=='undefined' && localStorage.getItem(SAVE_KEY));}
  catch(e){return false;}
}
function getLatestPatchVersion(){
  try{
    const m=String(PATCH_NOTES_TEXT||'').match(/v(\d+(?:\.\d+){1,2})/g);
    return m&&m.length?m[0]:'v1.23';
  }catch(e){return 'v1.23';}
}
function updateTitleFooterMeta(){
  const v=document.getElementById('title-footer-version');
  if(v)v.textContent=`Version ${getLatestPatchVersion().replace(/^v/,'')}`;
  const y=document.getElementById('title-footer-year');
  if(y)y.textContent=String(new Date().getFullYear());
}
const TITLE_CHALLENGE_ICONS={guided:'💚',standard:'🏥',pressure:'👥',sandbox:'🛠️'};
const TITLE_SANDBOX_DESC='Unlimited money. Build without limits.';
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderTitleChallengeList(){
  const host=document.getElementById('title-challenge-list');
  if(!host)return;
  const presets=(typeof DIFFICULTY_PRESETS==='object'&&DIFFICULTY_PRESETS)?DIFFICULTY_PRESETS:{};
  const order=['guided','standard','pressure'].filter(id=>presets[id]);
  const items=order.map(id=>{
    const p=presets[id];
    const blurb=p.desc||'';
    const icon=TITLE_CHALLENGE_ICONS[id]||p.icon||'•';
    return `<button class="challenge-card challenge-${id}" type="button" data-challenge="${escapeHtml(id)}" onclick="selectChallengeMode('${escapeHtml(id)}')">`+
      `<span class="challenge-icon" aria-hidden="true">${escapeHtml(icon)}</span>`+
      `<span class="challenge-text"><span class="challenge-title">${escapeHtml(p.label||id)}</span>`+
      `<span class="challenge-desc">${escapeHtml(blurb)}</span></span></button>`;
  });
  items.push(`<button class="challenge-card challenge-sandbox" type="button" data-challenge="sandbox" onclick="selectChallengeMode('sandbox')">`+
    `<span class="challenge-icon" aria-hidden="true">${TITLE_CHALLENGE_ICONS.sandbox}</span>`+
    `<span class="challenge-text"><span class="challenge-title">Sandbox</span>`+
    `<span class="challenge-desc">${TITLE_SANDBOX_DESC}</span></span></button>`);
  host.innerHTML=items.join('');
}
let _challengeLaunching=false;
function selectChallengeMode(id){
  if(_challengeLaunching)return;
  _challengeLaunching=true;
  const host=document.getElementById('title-challenge-list');
  if(host){
    host.querySelectorAll('.challenge-card').forEach(el=>el.classList.remove('selected','launching'));
    const target=host.querySelector(`.challenge-card[data-challenge="${id}"]`);
    if(target){target.classList.add('selected','launching');}
  }
  setTimeout(()=>{
    _challengeLaunching=false;
    if(id==='sandbox'){if(typeof openCampusSelect==='function')openCampusSelect('sandbox');else if(typeof startSandboxMode==='function')startSandboxMode();return;}
    selectedDifficulty=id;
    if(typeof openCampusSelect==='function')openCampusSelect('newgame');
    else if(typeof startGame==='function')startGame(id);
  },220);
}
function updateTitleMenuActions(){
  const backBtn=document.getElementById('backtogamebtn');
  if(!backBtn)return;
  const inRun=hasStarted&&!gameOver;
  const cc=document.getElementById('title-current-campus');
  if(cc){
    if(inRun&&typeof getCampus==='function'){
      const camp=getCampus(selectedCampusId);
      cc.innerHTML=`<img src="${camp.image}" alt=""><div class="tcc-text"><div class="tcc-label">Current Campus</div><div class="tcc-name" style="color:${camp.color}">${camp.icon} ${camp.name}</div></div>`;
      cc.classList.remove('hidden');
    }else{
      cc.classList.add('hidden');
    }
  }
  const hasSave=hasSavedGame();
  const canContinue=inRun||hasSave;
  const lbl=document.getElementById('title-continue-label');
  if(lbl){
    lbl.textContent=inRun?'Resume Run':'Continue';
    backBtn.classList.toggle('title-continue-resume',inRun);
    backBtn.classList.toggle('title-continue-disabled',!canContinue);
    backBtn.disabled=!canContinue;
    backBtn.setAttribute('aria-disabled',canContinue?'false':'true');
    backBtn.classList.remove('hidden');
  }else{
    backBtn.classList.toggle('hidden',!inRun);
  }
}
function continueFromTitle(){
  if(hasStarted&&!gameOver){backToGame();return;}
  if(!hasSavedGame())return;
  if(typeof loadGame==='function')loadGame();
}
function confirmQuitGame(){
  const inRun=hasStarted&&!gameOver;
  const msg=inRun
    ?'Quit My Medical Center? You will leave your current run — make sure you have saved any progress you want to keep.'
    :'Close My Medical Center?';
  if(!confirm(msg))return;
  try{window.location.reload();}catch(e){try{window.close();}catch(_e){}}
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
  const settingsOpen=document.getElementById('settingsmodal')?.classList.contains('open');
  const statsOpen=document.getElementById('statsmodal')?.classList.contains('open');
  const deptOpen=document.getElementById('deptmodal')?.classList.contains('open');
  const grantOpen=document.getElementById('grantmodal')?.classList.contains('open');
  const budgetOpen=document.getElementById('budgetmodal')?.classList.contains('open');
  const marketingOpen=document.getElementById('marketingmodal')?.classList.contains('open');
  const rosterOpen=document.getElementById('rostermodal')?.classList.contains('open');
  const dispatchOpen=document.getElementById('dispatchmodal')?.classList.contains('open');
  game.classList.toggle('menu-open',titleOpen||staffOpen||employeeOpen||researchOpen||contractOpen||patchOpen||eventOpen||gameOverOpen||stageOpen||settingsOpen||statsOpen||deptOpen||grantOpen||budgetOpen||marketingOpen||rosterOpen||dispatchOpen);
}
(function installLauncherModalEscape(){
  if(typeof document==='undefined')return;
  if(window.__rpModalEscapeInstalled)return;
  window.__rpModalEscapeInstalled=true;
  // Modals tracked by updateMenuBlurState() that should close on Escape.
  // Each entry: [elementId, closeFnName, openClass, invertOpen]
  // - invertOpen=true means "open" is signalled by the ABSENCE of the class (event-modal uses 'hidden').
  const modalRegistry=[
    ['stagemodal','closeStageModal','open',false],
    ['staffmodal','closeStaff','open',false],
    ['employeemodal','closeEmployeeMenu','open',false],
    ['deptmodal','closeDeptMenu','open',false],
    ['grantmodal','closeGrantMenu','open',false],
    ['researchmodal','closeResearchMenu','open',false],
    ['contractmodal','closeContractMenu','open',false],
    ['patchmodal','closePatchNotesMenu','open',false],
    ['settingsmodal','closeSettings','open',false],
    ['statsmodal','closeStats','open',false],
    ['budgetmodal','closeBudgetMenu','open',false],
    ['marketingmodal','closeMarketingMenu','open',false],
    ['rostermodal','closeRosterMenu','open',false],
    ['dispatchmodal','closeDispatchMenu','open',false],
    ['event-modal','closeEventModal','hidden',true]
  ];
  const openOrder=[]; // stack of currently-open modal ids; last = most recent
  function isOpen(entry){
    const el=document.getElementById(entry[0]);
    if(!el)return false;
    const has=el.classList.contains(entry[2]);
    return entry[3]?!has:has;
  }
  function watch(entry){
    const el=document.getElementById(entry[0]);
    if(!el)return;
    let wasOpen=isOpen(entry);
    if(wasOpen)openOrder.push(entry[0]);
    const obs=new MutationObserver(()=>{
      const nowOpen=isOpen(entry);
      if(nowOpen===wasOpen)return;
      wasOpen=nowOpen;
      const idx=openOrder.indexOf(entry[0]);
      if(idx!==-1)openOrder.splice(idx,1);
      if(nowOpen)openOrder.push(entry[0]);
    });
    obs.observe(el,{attributes:true,attributeFilter:['class']});
  }
  function init(){modalRegistry.forEach(watch);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  document.addEventListener('keydown',function(ev){
    if(ev.key!=='Escape')return;
    for(let i=openOrder.length-1;i>=0;i--){
      const id=openOrder[i];
      const entry=modalRegistry.find(e=>e[0]===id);
      if(!entry)continue;
      if(!isOpen(entry))continue;
      const fn=window[entry[1]];
      if(typeof fn==='function'){fn();ev.preventDefault();return;}
    }
  });
})();
function openBudgetMenu(){
  const modal=document.getElementById('budgetmodal');
  if(!modal)return;
  modal.classList.add('open');
  if(typeof renderBudgetPanel==='function')renderBudgetPanel();
  updateMenuBlurState();
}
function closeBudgetMenu(){
  const modal=document.getElementById('budgetmodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function openMarketingMenu(){
  const modal=document.getElementById('marketingmodal');
  if(!modal)return;
  modal.classList.add('open');
  if(typeof renderMarketingSummary==='function')renderMarketingSummary();
  updateMenuBlurState();
}
function closeMarketingMenu(){
  const modal=document.getElementById('marketingmodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function openRosterMenu(){
  const modal=document.getElementById('rostermodal');
  if(!modal)return;
  modal.classList.add('open');
  if(typeof renderHiredStaffMenu==='function')renderHiredStaffMenu();
  updateMenuBlurState();
}
function closeRosterMenu(){
  const modal=document.getElementById('rostermodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function openDispatchMenu(){
  const modal=document.getElementById('dispatchmodal');
  if(!modal)return;
  modal.classList.add('open');
  if(typeof renderDispatchJobs==='function')renderDispatchJobs();
  updateMenuBlurState();
}
function closeDispatchMenu(){
  const modal=document.getElementById('dispatchmodal');
  if(!modal)return;
  modal.classList.remove('open');
  updateMenuBlurState();
}
function setLauncherBadge(id,count,kind){
  const badge=document.getElementById(id);
  if(!badge)return;
  if(!count){
    badge.classList.add('hidden');
    badge.textContent='';
    return;
  }
  badge.classList.remove('hidden');
  badge.textContent=typeof count==='number'?(count>9?'9+':String(count)):'';
  badge.classList.toggle('rp-badge-warn',kind==='warn');
  badge.classList.toggle('rp-badge-danger',kind==='danger');
}
function updateLauncherBadges(){
  const budgetSnap=typeof getBudgetSnapshot==='function'?getBudgetSnapshot():null;
  const budgetWarn=(typeof debtDays!=='undefined'&&debtDays>0)||(budgetSnap&&budgetSnap.net<0);
  setLauncherBadge('badge-budget',budgetWarn?'!':0,(typeof debtDays!=='undefined'&&debtDays>=3)?'danger':'warn');
  const raiseRequests=(typeof staff!=='undefined'?staff:[]).filter(s=>s.hired&&s.raiseRequest).length;
  setLauncherBadge('badge-roster',raiseRequests,raiseRequests?'warn':null);
  const dispatchCount=(typeof dispatchJobs!=='undefined'?dispatchJobs.length:0);
  setLauncherBadge('badge-dispatch',dispatchCount,dispatchCount?'warn':null);
  setLauncherBadge('badge-contracts',(typeof contractOffer!=='undefined'&&contractOffer)?'!':0,'warn');
  let insuranceFlag=0,insuranceKind=null;
  if(typeof insuranceOffer!=='undefined'&&insuranceOffer){insuranceFlag='!';insuranceKind='warn';}
  else if(typeof insuranceContracts!=='undefined'&&insuranceContracts.length===0){insuranceFlag='!';insuranceKind='warn';}
  setLauncherBadge('badge-insurance',insuranceFlag,insuranceKind);
  let marketingFlag=0,marketingKind=null;
  if(typeof hasMarketingOfficeBuilt==='function'&&hasMarketingOfficeBuilt()&&typeof hasMarketingOfficeAccess==='function'&&!hasMarketingOfficeAccess()){
    marketingFlag='!';marketingKind='warn';
  }
  setLauncherBadge('badge-marketing',marketingFlag,marketingKind);
  const availableGrants=(typeof grantOffers!=='undefined'?grantOffers.filter(o=>o.status==='available').length:0);
  setLauncherBadge('badge-grants',availableGrants,availableGrants?'warn':null);
  const rp=(typeof researchPoints!=='undefined'?researchPoints:0);
  const researchActive=typeof activeResearch!=='undefined'&&activeResearch;
  const researchReady=rp>0&&!researchActive;
  setLauncherBadge('badge-research',researchReady?rp:0,researchReady?'warn':null);
  let techFlag=0;
  if(typeof techTree!=='undefined'&&techTree&&typeof techTree==='object'){
    techFlag=Object.values(techTree).filter(t=>t&&t.unlocked&&!t.purchased&&!t.applied).length;
  }
  setLauncherBadge('badge-tech',techFlag,techFlag?'warn':null);
  let deptFlag=0;
  if(typeof departments!=='undefined'&&departments&&typeof departments==='object'){
    if(typeof getUnlockableDepartmentCount==='function'){
      deptFlag=getUnlockableDepartmentCount()||0;
    }else{
      deptFlag=Object.values(departments).filter(d=>d&&d.unlockable&&!d.unlocked).length;
    }
  }
  setLauncherBadge('badge-dept',deptFlag,deptFlag?'warn':null);
  const statsFlag=(typeof stress!=='undefined'&&stress>=70)||(typeof debtDays!=='undefined'&&debtDays>=3);
  setLauncherBadge('badge-stats',statsFlag?'!':0,'warn');
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
function openGrantMenu(){
  const modal=document.getElementById('grantmodal');
  if(!modal)return;
  modal.classList.add('open');
  renderGrants();
  updateMenuBlurState();
}
function closeGrantMenu(){
  const modal=document.getElementById('grantmodal');
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
  const adminBonus=Math.round((getFloorSpecializationBonus().hiringPoolBonus||0));
  const target=2+Math.max(0,adminBonus);
  Object.keys(ROLES).forEach(role=>{
    allowedShifts.forEach(shift=>{
      while(staffPool.filter(s=>!s.hired&&s.role===role&&s.shift===shift).length<target)staffPool.push(genStaffMember(role,shift));
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
function setStaffTraitFilter(val){
  staffTraitFilter=val||'';
  const clearBtn=document.getElementById('staff-search-clear');
  if(clearBtn)clearBtn.style.display=staffTraitFilter?'inline-block':'none';
  renderStaffModal();
  const input=document.getElementById('staff-search-input');
  if(input&&document.activeElement!==input)input.focus();
}
function staffMatchesTraitFilter(s,q){
  if(!q)return true;
  const lq=q.toLowerCase();
  return(s.traits||[]).some(t=>
    (t.label||'').toLowerCase().includes(lq)||
    (t.desc||'').toLowerCase().includes(lq)||
    (t.id||'').replace(/_/g,' ').toLowerCase().includes(lq)
  )||(s.name||'').toLowerCase().includes(lq)||(ROLES[s.role]?.label||'').toLowerCase().includes(lq);
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
const SPECIALTY_SERVICE_LINES={
  cosmetic_consult_office:{research:'cosmetic_surgery_program',label:'Cosmetic Surgery Program',line:'cosmetic'},
  plastic_surgery_or:{research:'cosmetic_surgery_program',label:'Cosmetic Surgery Program',line:'cosmetic'},
  cosmetic_recovery_suite:{research:'cosmetic_surgery_program',label:'Cosmetic Surgery Program',line:'cosmetic'},
  aesthetic_procedure_room:{research:'cosmetic_surgery_program',label:'Cosmetic Surgery Program',line:'cosmetic'},
  premium_waiting_lounge:{research:'cosmetic_surgery_program',label:'Cosmetic Surgery Program',line:'cosmetic'},
  student_health_clinic:{research:'campus_health_partnership',label:'Campus Health Partnership',line:'university'},
  counseling_center:{research:'campus_health_partnership',label:'Campus Health Partnership',line:'university'},
  sports_medicine_office:{research:'campus_health_partnership',label:'Campus Health Partnership',line:'university'},
  vaccination_clinic:{research:'campus_health_partnership',label:'Campus Health Partnership',line:'university'},
  teaching_intern_office:{research:'campus_health_partnership',label:'Campus Health Partnership',line:'university'},
  donor_screening_office:{research:'cryogenic_storage_systems',label:'Cryogenic Storage Systems',line:'sperm_bank',ethics:true},
  cryogenic_storage:{research:'cryogenic_storage_systems',label:'Cryogenic Storage Systems',line:'sperm_bank',ethics:true},
  andrology_lab:{research:'cryogenic_storage_systems',label:'Cryogenic Storage Systems',line:'sperm_bank',ethics:true},
  fertility_records_office:{research:'cryogenic_storage_systems',label:'Cryogenic Storage Systems',line:'sperm_bank',ethics:true},
  fertility_consult_office:{research:'embryology_lab_standards',label:'Embryology Lab Standards',line:'ivf',ethics:true},
  ivf_procedure_room:{research:'embryology_lab_standards',label:'Embryology Lab Standards',line:'ivf',ethics:true},
  embryology_lab_room:{research:'embryology_lab_standards',label:'Embryology Lab Standards',line:'ivf',ethics:true},
  ivf_recovery_room:{research:'embryology_lab_standards',label:'Embryology Lab Standards',line:'ivf',ethics:true}
};
const SPECIALTY_LINE_ROOMS={
  cosmetic:['cosmetic_consult_office','plastic_surgery_or','cosmetic_recovery_suite','aesthetic_procedure_room','premium_waiting_lounge'],
  university:['student_health_clinic','counseling_center','sports_medicine_office','vaccination_clinic','teaching_intern_office'],
  sperm_bank:['donor_screening_office','cryogenic_storage','andrology_lab','fertility_records_office'],
  ivf:['fertility_consult_office','ivf_procedure_room','embryology_lab_room','ivf_recovery_room','cryogenic_storage']
};
const SPECIALTY_LINE_CORE_ROOMS={
  cosmetic:['cosmetic_consult_office','plastic_surgery_or','cosmetic_recovery_suite','aesthetic_procedure_room','premium_waiting_lounge'],
  university:['student_health_clinic','counseling_center','sports_medicine_office','vaccination_clinic','teaching_intern_office'],
  sperm_bank:['donor_screening_office','andrology_lab','fertility_records_office'],
  ivf:['fertility_consult_office','ivf_procedure_room','embryology_lab_room','ivf_recovery_room']
};
const SPECIALTY_LINE_PROCEDURE_ROOMS={
  cosmetic:['plastic_surgery_or','aesthetic_procedure_room'],
  university:['student_health_clinic'],
  sperm_bank:['andrology_lab'],
  ivf:['ivf_procedure_room','embryology_lab_room']
};
function specialtyLineHasOperationalRoom(line){
  const types=SPECIALTY_LINE_CORE_ROOMS[line]||[];
  return types.some(t=>typeof hasOperationalRoom==='function'&&hasOperationalRoom(t));
}
function specialtyLineFullyOperational(line){
  const procedure=SPECIALTY_LINE_PROCEDURE_ROOMS[line]||[];
  if(!procedure.length||typeof hasOperationalRoom!=='function')return false;
  const procOk=procedure.some(t=>hasOperationalRoom(t));
  if(!procOk)return false;
  if(line==='sperm_bank')return hasOperationalRoom('cryogenic_storage')&&(hasOperationalRoom('andrology_lab')||hasOperationalRoom('fertility_records_office'));
  if(line==='ivf')return hasOperationalRoom('cryogenic_storage')&&hasOperationalRoom('ivf_procedure_room')&&hasOperationalRoom('embryology_lab_room');
  return true;
}
function specialtyLineHasBuiltRoom(line){
  const types=SPECIALTY_LINE_ROOMS[line]||[];
  return types.some(t=>typeof hasBuiltRoom==='function'&&hasBuiltRoom(t));
}
function specialtyLineUnlocked(line){
  const tech={cosmetic:'cosmetic_surgery_program',university:'campus_health_partnership',sperm_bank:'cryogenic_storage_systems',ivf:'embryology_lab_standards'}[line];
  return !!(tech&&researchedTech.has(tech));
}
function getSpecialtyRoomLockReason(tool){
  const cfg=SPECIALTY_SERVICE_LINES[tool];
  if(!cfg)return null;
  if(isSandboxMode)return null;
  if(hospitalStage!=='medical')return'Reach Medical Center stage';
  if((reputation||0)<75)return'Reputation 75+ required';
  if(getDepartmentLevel('admin')<3)return'Administration department level 3 required';
  if(!researchedTech.has('digital_backup_system'))return'Research: Digital Backup System';
  if(!researchedTech.has(cfg.research))return`Research: ${cfg.label}`;
  if(cfg.ethics&&!researchedTech.has('ethics_compliance_review'))return'Research: Ethics and Compliance Review';
  return null;
}
function isToolUnlocked(tool){
  if(isSandboxMode)return true;
  if(!unlockedTools.has(tool))return false;
  if(SPECIALTY_SERVICE_LINES[tool]&&getSpecialtyRoomLockReason(tool))return false;
  if(tool==='prisoner_wing'){
    const hasSec=rooms.some(r=>r.type==='security_office')||staff.some(s=>s.hired&&s.role==='security_officer');
    if(!hasSec)return false;
  }
  return true;
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
  const _def=RDEFS[tool];
  if(_def&&_def.firstFloorOnly&&currentFloor!==1){
    return `${_def.name} can only be built on Floor 1`;
  }
  if(tool==='prisoner_wing'&&unlockedTools.has(tool)){
    return 'Build a Security Office or hire a Guard';
  }
  const milestone=getMilestoneForTool(tool);
  if(milestone)return`Unlock: ${milestone.name}`;
  if(SPECIALTY_SERVICE_LINES[tool]){
    const reason=getSpecialtyRoomLockReason(tool);
    if(reason)return reason;
  }
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
  if(type==='prisoner_wing')return'Stable corrections contract income; increases security pressure (Floor 1 only, unlock via Security Office or Guard)';
  if(type==='auditorium')return'Large event space — periodic conference cash + reputation; takes valuable first-floor space (Floor 1 only)';
  if(type==='case_management')return'Needs: clerical discharge and care coordination';
  if(type==='cosmetic_consult_office')return'Needs: surgeon + clerical consult intake';
  if(type==='plastic_surgery_or')return'Needs: surgeon + nurse cosmetic operating room';
  if(type==='cosmetic_recovery_suite')return'Needs: nurse + CNA post-op recovery';
  if(type==='aesthetic_procedure_room')return'Needs: surgeon + nurse non-surgical aesthetics';
  if(type==='premium_waiting_lounge')return'Needs: VIP/private patient waiting area';
  if(type==='student_health_clinic')return'Needs: GP doctor + nurse + clerical campus intake';
  if(type==='counseling_center')return'Needs: GP doctor + nurse student counseling';
  if(type==='sports_medicine_office')return'Needs: GP doctor + nurse sports medicine';
  if(type==='vaccination_clinic')return'Needs: nurse + clerical vaccination drive';
  if(type==='teaching_intern_office')return'Needs: intern training + mentorship';
  if(type==='donor_screening_office')return'Needs: dept. attending + nurse donor screening';
  if(type==='cryogenic_storage')return'Needs: dept. attending cryogenic preservation';
  if(type==='andrology_lab')return'Needs: dept. attending + nurse andrology services';
  if(type==='fertility_records_office')return'Needs: clerical fertility records management';
  if(type==='fertility_consult_office')return'Needs: dept. attending + nurse fertility consult';
  if(type==='ivf_procedure_room')return'Needs: surgeon + nurse IVF procedure room';
  if(type==='embryology_lab_room')return'Needs: dept. attending + nurse embryology lab';
  if(type==='ivf_recovery_room')return'Needs: nurse + CNA IVF recovery';
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
  if(key==='admin'&&!rooms.some(r=>['head_office','grant_writer_office','administration','case_management'].includes(r.type)))return{chip:'locked',label:'Build Admin Area'};
  if(key==='digital'&&!rooms.some(r=>r.type==='it_department'))return{chip:'locked',label:'Build IT Department'};
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
  if(d.level>=5){addLog(`${def.label} is already at max level.`,'w');return;}
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
function isClinicalRoomType(type){return ['gp','vip_room','er','ward','surgery','xray','pharmacy','lab','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','med_surg','pediatrics','obgyn','radiology','rehab','cardiology','oncology','behavioral_health','geriatrics','cosmetic_consult_office','plastic_surgery_or','cosmetic_recovery_suite','aesthetic_procedure_room','student_health_clinic','counseling_center','sports_medicine_office','vaccination_clinic','donor_screening_office','andrology_lab','fertility_consult_office','ivf_procedure_room','embryology_lab_room','ivf_recovery_room'].includes(type);}
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
      if(t.dramaEvent)passiveChaos+=1*(t.type==='negative'?negImpact(s):1);
      if(t.chaosResist)passiveChaos=Math.max(0,passiveChaos-t.chaosResist);
    });
  });
  passiveChaos=Math.max(0,passiveChaos-(getTechBonus().passiveChaosReduction||0));
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
function getGrantAdminBonus(){
  if(typeof departments==='undefined'||!departments)return 0;
  const lvl=departments?.admin?.level??1;
  return[0,0.02,0.04,0.07,0.10][Math.min(4,lvl-1)];
}
function getGrantAuditFailurePenalty(){
  return recentAuditFailureDays>0?0.12:0;
}
function getGrantApprovalChance(offer){
  const def=getGrantDef(offer?.id);
  const baseChance=(def?.successChance??0.70)-0.25;
  const grantWriterSkill=getGrantWriterSkillBonus();
  const grantTraitBonus=Number.isFinite(offer?.grantTraitApprovalBonus)?offer.grantTraitApprovalBonus:getGrantWriterOfferModifiers(offer).approval;
  const reputationBonus=clamp((reputation-50)/500,-0.08,0.1);
  const complianceBonus=getGrantGovernmentComplianceBonus();
  const adminBonus=getGrantAdminBonus();
  const stressPenalty=getGrantStressPenalty();
  const cleanlinessPenalty=getGrantDirtyPenalty();
  const auditPenalty=getGrantAuditFailurePenalty();
  const chance=
    baseChance
    +grantWriterSkill
    +grantTraitBonus
    +reputationBonus
    +complianceBonus
    +adminBonus
    +getLeadershipBonus().grantApprovalBonus
    -stressPenalty
    -cleanlinessPenalty
    -auditPenalty;
  return clamp(chance,0.10,0.95);
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
      return hospitalStage!=='clinic';
    case 'accessibility_improvement':
      return getUnlockedFloorLimit()>1;
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
function applyGrantDailyEffect(offer){
  const def=getGrantDef(offer?.id);
  if(!def)return;
  const eff=def.effect||{};
  switch(eff.kind){
    case 'public_subsidy':
      if(eff.subsidyPerCase&&govTreated>0){
        changeMoney(Math.round(eff.subsidyPerCase*Math.min(govTreated,6)));
      }
      break;
    case 'nurse_support':
      if(eff.moralePerDay){
        staff.filter(s=>s.hired&&['nurse','cna','charge_nurse'].includes(s.role))
          .forEach(s=>{s.morale=clamp((s.morale??100)+eff.moralePerDay,0,100);});
      }
      break;
    case 'energy_efficiency':
    case 'burnout_prevention':
      if(eff.stressRelief){stress=clamp(stress-eff.stressRelief,0,100);}
      if(eff.kind==='burnout_prevention'&&eff.moralePerDay===undefined){
        staff.filter(s=>s.hired&&['nurse','cna'].includes(s.role))
          .forEach(s=>{s.energy=clamp((s.energy??100)+0.5,0,100);});
      }
      break;
    case 'technology_boost':
      if(eff.rpPerDay&&typeof researchPoints!=='undefined'){researchPoints+=eff.rpPerDay;}
      break;
    case 'night_support':
      staff.filter(s=>s.hired&&s.shift==='night')
        .forEach(s=>{s.morale=clamp((s.morale??100)+0.5,0,100);});
      break;
    default:break;
  }
}
function activateGrantOffer(offer,def){
  if(!offer||!def)return;
  const effect=def.effect||{};
  const baseMult=Number.isFinite(offer.grantRewardMult)?offer.grantRewardMult:1;
  const rewardMult=baseMult*(getLeadershipBonus().grantRewardMult||1);
  if(effect.approvalCash)changeMoney(Math.round(effect.approvalCash*rewardMult));
  if(def.id==='community_health_access'){
    if(effect.reputation)adjustReputation(effect.reputation,'Community Health Access grant success','g');
    offer.completed=true;
    addLog(`${offer.label} approved. Community funding received.`,'g');
    showToast('Grant approved','good');
    if(window.animPolish)window.animPolish.polishGrant(true,offer.label);
    if(window.playSound)window.playSound('grant_approved');
    expireGrantOffer(offer);
    return;
  }
  if(def.id==='behavioral_health_access'){
    freeBuildCredits.behavioral_health=(freeBuildCredits.behavioral_health||0)+1;
    offer.completed=true;
    addLog(`${offer.label} approved. Behavioral Health funding and one room credit awarded.`,'g');
    showToast('Grant approved','good');
    if(window.animPolish)window.animPolish.polishGrant(true,offer.label);
    if(window.playSound)window.playSound('grant_approved');
    expireGrantOffer(offer);
    return;
  }
  if((effect.durationDays||offer.durationDays||0)>0){
    offer.status='active';
    offer.daysLeft=effect.durationDays||offer.durationDays;
    addLog(`${offer.label} approved. Grant effect active for ${offer.daysLeft} days.`,'g');
    showToast('Grant approved','good');
    if(window.animPolish)window.animPolish.polishGrant(true,offer.label);
    if(window.playSound)window.playSound('grant_approved');
    return;
  }
  offer.completed=true;
  addLog(`${offer.label} approved. Funding secured.`,'g');
  showToast('Grant approved','good');
  if(window.animPolish)window.animPolish.polishGrant(true,offer.label);
  if(window.playSound)window.playSound('grant_approved');
  expireGrantOffer(offer);
}
function denyGrantOffer(offer){
  if(!offer)return;
  offer.status='denied';
  offer.daysLeft=2;
  addLog(`${offer.label} was denied after review. Hire a Grant Writer or upgrade Administration to raise approval odds on the next application.`,'w');
  showToast(`${offer.label} denied — hire a Grant Writer`,'warn');
  if(window.animPolish)window.animPolish.polishGrant(false,offer.label);
  if(window.playSound)window.playSound('grant_denied');
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
      applyGrantDailyEffect(offer);
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
  return REP_LONG_WAIT_THRESHOLD+(hasFeature('triage_protocols')?6:0)+getLunchRoomPatienceBonus()+getBathroomPatienceBonus()+getAmenityPatienceBonus()+(directorTrait?.waitThresholdAdd||0)+(getFloorSpecializationBonus().waitThresholdAdd||0);
}
function getEffectiveUntreatedLeaveThreshold(){
  const directorTrait=getDirectorTrait();
  return REP_UNTREATED_LEAVE_THRESHOLD+(hasFeature('triage_protocols')?8:0)+getLunchRoomPatienceBonus()+getBathroomPatienceBonus()+getAmenityPatienceBonus()+3+(directorTrait?.waitThresholdAdd||0)+(getFloorSpecializationBonus().waitThresholdAdd||0);
}
function levelUpIntern(staffMember){
  if(staffMember.role!=='intern')return;
  // Route the intern level-up through the unified engine so they pick up the same tier
  // bonuses (salary multiplier, negative-trait softening, perks) as everyone else.
  // levelUpStaff itself fires promoteIntern at Lv 3 — no second call needed here.
  levelUpStaff(staffMember);
}
// Veteran-tier perks pulled from the strongest existing positives so this stays data-driven.
const VETERAN_PERK_IDS=['mentor_energy','calm_under_fire','team_glue','cool_head','reliable_clockwork','detail_hawk'];
function pickLevelPerkFor(member,tier){
  const exclude=new Set([
    member.positiveTrait?.id,
    member.jobTrait?.id,
    ...(member.extraPerks||[]).map(p=>p&&p.id)
  ].filter(Boolean));
  let pool=[];
  if(tier===5){
    pool=UNIVERSAL_POSITIVE_TRAITS.filter(t=>VETERAN_PERK_IDS.includes(t.id)&&!exclude.has(t.id));
  }
  if(!pool.length){
    const jobPool=(typeof getJobTraitPool==='function')?(getJobTraitPool(member.role)||[]):[];
    const goodJob=jobPool.filter(t=>(t.tone==='good')&&!exclude.has(t.id));
    pool=[...UNIVERSAL_POSITIVE_TRAITS.filter(t=>!exclude.has(t.id)),...goodJob];
  }
  if(!pool.length)return null;
  const pick=pool[Math.floor(Math.random()*pool.length)];
  return {...pick,type:'positive',group:'bonus',_perk:true};
}
function levelUpStaff(member){
  if(!member)return;
  const cur=Math.max(1,Math.round(member.level||1));
  if(cur>=LEVEL_TIERS.length){
    member.xp=0;
    member.xpToNext=0;
    return;
  }
  const next=cur+1;
  // Carry overflow XP into the next tier instead of discarding it,
  // so a single big award can advance multiple levels cleanly.
  const prevToNext=member.xpToNext||getLevelTier(cur).xpToNext;
  const overflow=Math.max(0,(member.xp||0)-prevToNext);
  member.level=next;
  const tier=getLevelTier(next);
  member.xp=overflow;
  member.xpToNext=tier.xpToNext;
  member.salaryMultiplier=tier.salaryMultiplier;
  member.negativeTraitStrength=tier.negativeTraitStrength;
  let gained=null;
  if(next===3||next===5){
    gained=pickLevelPerkFor(member,next);
    if(gained){
      if(!Array.isArray(member.extraPerks))member.extraPerks=[];
      member.extraPerks.push(gained);
    }
  }
  // Re-normalize so traits[], scaled negative effect, and back-compat fields refresh.
  normalizeStaffMember(member);
  const msg=`${member.name} leveled up to ${tier.title}${gained?` and gained ${gained.label}`:''}.`;
  if(typeof addLog==='function')addLog(msg,'g');
  if(typeof showToast==='function')showToast(`${member.name} → ${tier.title}${gained?` (+${gained.label})`:''}`,'good');
  if(window.animPolish)window.animPolish.polishLevelUp(member,tier);
  if(window.playSound)window.playSound('staff_level_up');
  // Intern auto-promotion on reaching Specialist (Lv 3) — preserves the legacy intern flow
  // regardless of which entry point (giveXP / awardStaffXp / awardInternXp) drove the level-up.
  if(member.role==='intern'&&next>=3&&typeof promoteIntern==='function'){
    promoteIntern(member);
  }
}
function awardStaffXp(member,amount,reason='shift'){
  if(!member||!member.hired)return;
  if(!(amount>0))return;
  if((member.level||1)>=LEVEL_TIERS.length)return;
  // ±15% wobble so coworkers drift apart.
  const wobble=1+(Math.random()-0.5)*0.30;
  // Mentor / Fast Learner amplifiers self + same-shift mentors.
  let mult=1;
  if((member.traits||[]).some(t=>t.xpBoost))mult*=1.4;
  if(staff.some(s=>s.hired&&s.shift===member.shift&&s.id!==member.id&&(s.traits||[]).some(t=>t.mentor||t.xpBoost))){
    mult*=1.15;
  }
  // University Hospital identity / training tech bonus.
  const techMult=(typeof getTechBonus==='function'?(getTechBonus().trainingXpMult||1):1);
  const grantMult=(typeof getGrantTrainingXpMultiplier==='function'?getGrantTrainingXpMultiplier():1);
  // Explicit University Hospital identity bonus: residency program / teaching-charter unlocks
  // accelerate every employee's growth, reflecting the academic-medicine path.
  let universityMult=1;
  if(typeof hasFeature==='function'){
    if(hasFeature('residency_program'))universityMult*=1.15;
    if(hasFeature('teaching_hospital_charter'))universityMult*=1.08;
    if(hasFeature('clinical_trials_office'))universityMult*=1.05;
  }
  // Matching floor specialization: if the staffer's assigned room sits on a floor
  // whose specialization buffs that room type (speedMult < 1), they learn faster there.
  let floorSpecMult=1;
  if(member.assignedRoom&&typeof getFloorSpecializationRoomSpeedMult==='function'){
    const assigned=typeof member.assignedRoom==='object'
      ?member.assignedRoom
      :(Array.isArray(rooms)?rooms.find(r=>r&&r.id===member.assignedRoom):null);
    if(assigned){
      const sp=getFloorSpecializationRoomSpeedMult(assigned);
      if(Number.isFinite(sp)&&sp<1)floorSpecMult=1.10;
    }
  }
  const final=Math.max(0,amount*wobble*mult*techMult*grantMult*universityMult*floorSpecMult);
  member.xp=(member.xp||0)+final;
  // Optional debug breadcrumb.
  if(typeof window!=='undefined'&&window.__xpDebug){
    (window.__xpLog=window.__xpLog||[]).push({n:member.name,r:reason,a:+final.toFixed(2),total:+member.xp.toFixed(2)});
  }
  while((member.xpToNext||0)>0&&member.xp>=member.xpToNext&&(member.level||1)<LEVEL_TIERS.length){
    levelUpStaff(member);
  }
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
  // Interns share the unified XP pipeline. Promotion at Specialist (Lv 3) is handled
  // inside levelUpStaff via the explicit intern-promotion hook.
  awardStaffXp(staffMember,amount,'intern');
}
function awardInternXp(roomType,shift=currentShift(),baseAmount=1){
  if(!isClinicalRoomType(roomType))return;
  const interns=getInternsOnShift(shift);
  if(!interns.length)return;
  // Preserve the original intern XP flow: pick one intern per treated case, applying
  // additive bonuses for nearby mentors. Trait/grant/tech/identity multipliers are NOT
  // re-applied here because awardStaffXp (via giveXP) already applies all of them — doing
  // it twice would double-multiply intern leveling speed.
  const mentorBoost=staff.filter(s=>s.hired&&s.shift===shift&&(s.traits||[]).some(t=>t.mentor)).length*0.35;
  const explainerBoost=staff.filter(s=>s.hired&&s.shift===shift&&(s.traits||[]).some(t=>t.xpAura)).length*0.2;
  const teachingOfficeMult=hasOperationalRoom('teaching_intern_office')?1.5:1;
  const intern=interns[Math.floor(Math.random()*interns.length)];
  giveXP(intern,(baseAmount+mentorBoost+explainerBoost)*teachingOfficeMult);
}
function processSpecialtyServiceLineDaily(){
  if(!hasStarted||gameOver||isSandboxMode)return;
  let recurring=0;
  // Cosmetic line: premium private patient demand + recurring elective revenue
  if(specialtyLineFullyOperational('cosmetic')){
    const orCount=countOperationalRooms('plastic_surgery_or')+countOperationalRooms('aesthetic_procedure_room');
    const electiveRevenue=300+orCount*180;
    recurring+=electiveRevenue;
    if(Math.random()<0.35&&hasOperationalRoom('plastic_surgery_or')){
      const vipBonus=420+Math.round(Math.random()*380);
      changeMoney(vipBonus);
      monthlyInc=(monthlyInc||0)+vipBonus;
      specialtyServiceStats.cosmeticCases=(specialtyServiceStats.cosmeticCases||0)+1;
      if(typeof spawnPatient==='function'&&Math.random()<0.6)spawnPatient();
    }
    if(typeof getPublicCareRate==='function'){
      const rate=getPublicCareRate();
      const required=typeof govRequired!=='undefined'?govRequired:0.5;
      if(rate<required-0.1&&Math.random()<0.06){
        reputation=clamp(reputation-1,0,100);
        addLog('Public-care backlash: the luxury cosmetic wing is drawing criticism while public-care quotas slip.','b');
      }
    }
  }
  // University SHC: recurring student-care income + seasonal surge with real patient spawn
  if(specialtyLineFullyOperational('university')){
    const baseContract=specialtyServiceStats.universityContractActive?160:80;
    const surgeWindow=(day%90)<14;
    const lineRooms=SPECIALTY_LINE_ROOMS.university.filter(t=>hasOperationalRoom(t)).length;
    const surge=surgeWindow?Math.round(baseContract*0.75)+lineRooms*30:0;
    recurring+=baseContract+surge;
    specialtyServiceStats.studentVisits=(specialtyServiceStats.studentVisits||0)+(surgeWindow?3:1);
    if(surgeWindow&&day%90===0)addLog('Seasonal student surge: campus volume is spiking at the Student Health Clinic.','w');
    if(surgeWindow&&typeof spawnPatient==='function'){
      const extra=1+lineRooms;
      for(let i=0;i<extra&&Math.random()<0.7;i++)spawnPatient();
    }
  }
  // Sperm Bank line: cryogenic storage daily income + scandal risk if records/lab quality lapses
  if(specialtyLineFullyOperational('sperm_bank')){
    recurring+=160;
    specialtyServiceStats.spermDeposits=(specialtyServiceStats.spermDeposits||0)+1;
    const recordsOk=hasOperationalRoom('fertility_records_office');
    const labOk=hasOperationalRoom('andrology_lab');
    const reliability=Math.max(0,Math.min(100,specialtyServiceStats.cryoReliability||100));
    const reliabilityRisk=reliability<70?0.012:0;
    const scandalRisk=(recordsOk?0:0.012)+(labOk?0:0.012)+(cleanliness<70?0.012:0)+reliabilityRisk;
    if(scandalRisk>0&&Math.random()<scandalRisk){
      const repHit=researchedTech.has('ethics_compliance_review')?-2:-5;
      reputation=clamp(reputation+repHit,0,100);
      specialtyServiceStats.complianceIncidents=(specialtyServiceStats.complianceIncidents||0)+1;
      addLog('Sperm bank scandal: gaps in records or lab quality have surfaced. Reputation slipped.','b');
    }
    if(typeof spawnPatient==='function'&&Math.random()<0.25)spawnPatient();
  }
  // IVF line: per-cycle outcomes with reputation swings
  if(specialtyLineFullyOperational('ivf')){
    recurring+=220;
    if(Math.random()<0.25){
      const compliant=researchedTech.has('ethics_compliance_review');
      const successRate=compliant?0.7:0.55;
      if(Math.random()<successRate){
        specialtyServiceStats.ivfCycles=(specialtyServiceStats.ivfCycles||0)+1;
        reputation=clamp(reputation+2,0,100);
        changeMoney(900);monthlyInc=(monthlyInc||0)+900;
        if(Math.random()<0.15)addLog('IVF success: a cycle at the fertility center produced a confirmed pregnancy. Reputation rose.','g');
      }else{
        reputation=clamp(reputation-3,0,100);
        if(Math.random()<0.25)addLog('IVF setback: a cycle at the fertility center did not succeed. Reputation slipped.','b');
      }
    }
    if(typeof spawnPatient==='function'&&Math.random()<0.2)spawnPatient();
  }
  if(recurring>0){changeMoney(recurring);monthlyInc=(monthlyInc||0)+recurring;}
  // Cryogenic stability risk: tracked separately via cryoReliability metric
  if(hasOperationalRoom('cryogenic_storage')){
    if(typeof specialtyServiceStats.cryoReliability!=='number')specialtyServiceStats.cryoReliability=100;
    const upkeep=researchedTech.has('cryogenic_storage_systems')?0.4:0.15;
    specialtyServiceStats.cryoReliability=Math.min(100,specialtyServiceStats.cryoReliability+upkeep);
    if(cleanliness<60)specialtyServiceStats.cryoReliability-=0.6;
    if(stress>70)specialtyServiceStats.cryoReliability-=0.4;
    specialtyServiceStats.cryoReliability=Math.max(0,specialtyServiceStats.cryoReliability);
    if(Math.random()<0.015){
      const reliable=specialtyServiceStats.cryoReliability>=70&&cleanliness>=70&&stress<70;
      if(!reliable&&Math.random()<0.5){
        const cost=cleanliness<50?1800:900;
        changeMoney(-cost);
        specialtyServiceStats.cryoReliability=Math.max(0,specialtyServiceStats.cryoReliability-8);
        addLog(`Cryogenic storage minor incident: maintenance and sample loss cost $${cost.toLocaleString()}.`,'w');
      }
    }
  }
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
  showToast('Security incident — hire Security Officers','warn');
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
  const raiseMult=getLeadershipBonus().raiseCostMult||1;
  // Raise amount is shown to the player as a real-dollar increase to take-home pay,
  // so we size it from EFFECTIVE salary. The accept/issue handlers compensate by
  // dividing by salaryMultiplier before adding to base — see acceptRaiseRequest.
  return Math.max(200,Math.round(effectiveSalary(member)*0.1*raiseMult/50)*50);
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
  addLog(`${member.name} requested a raise after a rough stretch on the ${member.shift} shift. Open the Employees panel to approve, deny, or counter — denying repeatedly raises quit risk.`,'w');
  showToast(`${member.name} wants a raise — open Employees`,'warn');
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
  showToast('Staff conflict — lower stress on this shift','warn');
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
  let income=0,patients=0,stressImpact=0,reimbursementMult=1,
      govCompliancePressure=0,reputationGain=0,publicCriticismRisk=0;
  insuranceContracts.forEach(c=>{
    income+=c.incomeBoost||0;
    patients+=c.patientBoost||0;
    stressImpact+=c.stress||0;
    if(c.reimbursementMult)reimbursementMult*=c.reimbursementMult;
    govCompliancePressure+=c.govCompliancePressure||0;
    reputationGain+=c.reputationGain||0;
    publicCriticismRisk+=c.publicCriticismRisk||0;
  });
  income*=getLeadershipBonus().insuranceIncomeMult||1;
  income*=getMapBonus().insuranceOpportunityMultiplier||1;
  return{income,patients,stressImpact,reimbursementMult,
    govCompliancePressure,reputationGain,publicCriticismRisk};
}
function getInsuranceGovPressure(){return getInsuranceBoost().govCompliancePressure;}
function getInsuranceReputationGain(){return getInsuranceBoost().reputationGain;}
function getInsuranceCriticismRisk(){return getInsuranceBoost().publicCriticismRisk;}
function getInsuranceTrafficBonus(){
  return getInsuranceBoost().patients;
}
function getInsuranceIncomeBoost(){
  return getInsuranceBoost().income;
}
function getInsuranceRevenueMultiplier(){
  const b=getInsuranceBoost();
  return(1+b.income)*b.reimbursementMult;
}
function getInsuranceStressLoad(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{insuranceStressRelief:0};
  return Math.max(0,getInsuranceBoost().stressImpact-(techBonus.insuranceStressRelief||0));
}
function getPatientTrafficChance(){
  return clamp(getBasePatientTrafficChance()+getAdvertisingTrafficBonus()+getInsuranceTrafficBonus()+(getLeadershipBonus().patientTrafficBonus||0),0.12,0.99);
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
    addLog('Advertising is locked until a staffed Marketing Office is operating. Build a Marketing Office and hire a Marketing Specialist to launch campaigns.','w');
    showToast('Build & staff a Marketing Office first','warn');
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
const BUILD_CATEGORY_DEFS=[
  {id:'core',label:'Core',tools:['corridor','luxury_path','front_entrance','staff_entrance','er_entrance','staircase','elevator','demolish']},
  {id:'clinical',label:'Clinical',tools:['waiting_room','gp','vip_room','er','ward','med_surg','pediatrics','obgyn','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','surgery','rehab','pharmacy','behavioral_health','geriatrics']},
  {id:'diagnostics',label:'Diagnostics',tools:['radiology','xray','lab','cardiology','oncology']},
  {id:'admin',label:'Admin',tools:['head_office','administration','hr_office','marketing_office','grant_writer_office','case_management','security_office','it_department','research_department','dispatch_office']},
  {id:'support',label:'Support',tools:['nurse_station','staff_room','lunch_room','bathroom','janitor_closet','hvac_generator','vending_machine','drink_station','atm_kiosk','ambulance_bay']},
  {id:'specialty',label:'Specialty',tools:['cosmetic_consult_office','plastic_surgery_or','cosmetic_recovery_suite','aesthetic_procedure_room','premium_waiting_lounge','student_health_clinic','counseling_center','sports_medicine_office','vaccination_clinic','teaching_intern_office','donor_screening_office','cryogenic_storage','andrology_lab','fertility_records_office','fertility_consult_office','ivf_procedure_room','embryology_lab_room','ivf_recovery_room','prisoner_wing','auditorium']},
];
const BUILD_TOOL_CATEGORY={};
BUILD_CATEGORY_DEFS.forEach(c=>c.tools.forEach(t=>{BUILD_TOOL_CATEGORY[t]=c.id;}));
const _buildMenuState={tab:'core',search:''};
let _buildCardCache=null;
function _ensureBuildCardCache(sidebar){
  if(_buildCardCache)return;
  const buttons=Array.from(sidebar.querySelectorAll('.rb'));
  _buildCardCache=new Map();
  buttons.forEach(btn=>{
    const tool=btn.dataset.tool;
    if(!tool)return;
    btn.dataset.category=BUILD_TOOL_CATEGORY[tool]||'support';
    _buildCardCache.set(tool,btn.outerHTML);
  });
}
function _toolMatchesSearch(tool,q){
  if(!q)return true;
  const def=RDEFS[tool];
  const cat=BUILD_TOOL_CATEGORY[tool]||'';
  const reqText=def?(typeof getRoomRequirementText==='function'?getRoomRequirementText(tool):''):'';
  const lockText=(typeof getToolLockedText==='function')?getToolLockedText(tool):'';
  const hay=[tool,def?.name||'',cat,reqText,lockText].join(' ').toLowerCase();
  return hay.includes(q);
}
function _renderBuildCards(){
  const list=document.getElementById('build-list');
  if(!list||!_buildCardCache)return;
  const tab=_buildMenuState.tab;
  const q=(_buildMenuState.search||'').trim().toLowerCase();
  const allTools=[];
  BUILD_CATEGORY_DEFS.forEach(c=>c.tools.forEach(t=>{if(_buildCardCache.has(t))allTools.push(t);}));
  let pool;
  if(tab==='locked'){
    pool=allTools.filter(t=>{
      if(t==='corridor'||t==='luxury_path'||t==='demolish')return false;
      const unlocked=isToolUnlocked(t);
      const allowed=(typeof isRoomAllowedOnFloor==='function')?isRoomAllowedOnFloor(t,currentFloor):true;
      return !unlocked||!allowed;
    });
  }else{
    const cat=BUILD_CATEGORY_DEFS.find(c=>c.id===tab);
    pool=cat?cat.tools.filter(t=>_buildCardCache.has(t)):allTools;
  }
  pool=pool.filter(t=>_toolMatchesSearch(t,q));
  if(!pool.length){
    list.innerHTML=`<div class="build-empty">No rooms match.</div>`;
  }else{
    list.innerHTML=pool.map(t=>_buildCardCache.get(t)).join('');
  }
  if(typeof updateUnlockButtons==='function')updateUnlockButtons();
}
function setBuildTab(id){
  _buildMenuState.tab=id;
  document.querySelectorAll('#build-tabs .build-tab').forEach(b=>{
    b.classList.toggle('active',b.dataset.tab===id);
  });
  _renderBuildCards();
}
function setBuildSearch(v){
  _buildMenuState.search=v||'';
  _renderBuildCards();
}
const DOCK_MENUS={
  people:{title:'People',items:[
    {label:'Hire Staff',icon:'👥',desc:'Browse and hire applicants',fn:'openStaff'},
    {label:'Manage Employees',icon:'🧑‍⚕️',desc:'Schedules, morale, energy',fn:'openEmployeeMenu'},
    {label:'Roster & Wages',icon:'📋',desc:'Active staff list & raises',fn:'openRosterMenu'},
    {label:'Staff Traits',icon:'⭐',desc:'Trait list (in Manage Employees)',fn:'openEmployeeMenu'},
  ]},
  hospital:{title:'Hospital',items:[
    {label:'Departments',icon:'🏢',desc:'Department upgrades and bonuses',fn:'openDeptMenu'},
    {label:'Research',icon:'🔬',desc:'Research lab projects',fn:'openResearchMenu'},
    {label:'Floors',icon:'🛗',desc:'Switch and manage floors',fn:'dockOpenFloors'},
    {label:'Traffic / Heatmap',icon:'🌡️',desc:'Toggle the patient-flow heatmap',fn:'dockOpenHeatmap'},
    {label:'Renovation',icon:'🛠️',desc:'Click a placed room to renovate it',fn:'dockHintRenovation'},
  ]},
  management:{title:'Management',items:[
    {label:'Budget',icon:'💰',desc:'Income, expenses, debt',fn:'openBudgetMenu'},
    {label:'Grants',icon:'📝',desc:'Government & community grants',fn:'openGrantMenu'},
    {label:'Contracts',icon:'📑',desc:'Insurance & public-care agreement',fn:'openContractMenu'},
    {label:'Insurance',icon:'🛡️',desc:'Insurance plans only',fn:'openInsuranceMenu'},
    {label:'Executives',icon:'💼',desc:'Hire and manage executives',fn:'openExecutiveModal'},
    {label:'Delegation',icon:'🗂️',desc:'Delegate tasks to leadership',fn:'openDelegationPanel'},
  ]},
  reports:{title:'Reports',items:[
    {label:'Stats',icon:'📊',desc:'Snapshot, pressure, 90-day trends',fn:'openStats'},
    {label:'Recent Log',icon:'📜',desc:'Open the right-panel log',fn:'dockOpenLog'},
    {label:'Patch Notes',icon:'📰',desc:'Recent patch notes',fn:'openPatchNotesMenu'},
    {label:'Dev Log',icon:'🛠️',desc:'Background dev log',fn:'dockOpenDevLog'},
    {label:'Public Care History',icon:'🏗️',desc:'Past public-care reviews (in Contracts)',fn:'openContractMenu'},
  ]},
};
let _dockOpenKey=null;
function dockClosePopup(){
  const pop=document.getElementById('dock-popup');
  if(pop){pop.hidden=true;pop.innerHTML='';pop.removeAttribute('data-key');}
  document.querySelectorAll('.dock-pill').forEach(b=>b.classList.remove('dock-active'));
  _dockOpenKey=null;
}
function dockToggleMenu(key,btn){
  const pop=document.getElementById('dock-popup');
  if(!pop||!DOCK_MENUS[key])return;
  if(_dockOpenKey===key){dockClosePopup();return;}
  dockClosePopup();
  const menu=DOCK_MENUS[key];
  pop.innerHTML=`<div class="dock-popup-title">${menu.title}</div>`+
    menu.items.map((it,i)=>`<button type="button" class="dock-popup-item" data-idx="${i}">
      <span class="dock-popup-icon">${it.icon}</span>
      <span class="dock-popup-text"><span class="dock-popup-label">${it.label}</span><span class="dock-popup-desc">${it.desc}</span></span>
    </button>`).join('');
  pop.dataset.key=key;
  pop.hidden=false;
  pop.querySelectorAll('.dock-popup-item').forEach(el=>{
    el.addEventListener('click',()=>{
      const idx=parseInt(el.dataset.idx,10);
      const item=menu.items[idx];
      dockClosePopup();
      const fn=window[item.fn];
      if(typeof fn==='function')fn();
      else document.getElementById('hint').textContent=`${item.label} is not available yet.`;
    });
  });
  if(btn){
    const r=btn.getBoundingClientRect();
    pop.style.left=(r.left+r.width/2)+'px';
    pop.style.bottom=(window.innerHeight-r.top+8)+'px';
  }
  btn?.classList.add('dock-active');
  _dockOpenKey=key;
}
function dockHandleBuild(){
  if(typeof toggleBuildMode==='function')toggleBuildMode();
  if(typeof focusBuilder==='function')focusBuilder();
}
function dockOpenFloors(){
  const t=document.getElementById('floorpaneltoggle');
  if(t){t.click();return;}
  document.getElementById('hint').textContent='Use the floor pill on the right of the map.';
}
function dockOpenHeatmap(){
  if(typeof toggleHeatmap==='function')toggleHeatmap();
  else document.getElementById('hint').textContent='Heatmap unavailable.';
}
function dockHintRenovation(){
  document.getElementById('hint').textContent='Click any placed room on the map to open its renovation menu.';
}
function dockOpenLog(){
  const log=document.getElementById('log');
  if(log)log.scrollIntoView({behavior:'smooth',block:'nearest'});
  if(typeof pulsePanel==='function')pulsePanel('rp');
}
function dockOpenDevLog(){
  if(typeof openPatchNotesMenu==='function')openPatchNotesMenu('devlog');
}
document.addEventListener('click',e=>{
  if(_dockOpenKey===null)return;
  const pop=document.getElementById('dock-popup');
  if(!pop)return;
  if(pop.contains(e.target))return;
  if(e.target.closest('.dock-pill'))return;
  dockClosePopup();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')dockClosePopup();});
function organizeBuildMenu(){
  const sidebar=document.getElementById('sidebar');
  if(!sidebar)return;
  if(sidebar.dataset.grouped!=='1'){
    _ensureBuildCardCache(sidebar);
    const tabsHtml=BUILD_CATEGORY_DEFS.map(c=>`<button type="button" class="build-tab${c.id===_buildMenuState.tab?' active':''}" data-tab="${c.id}" onclick="setBuildTab('${c.id}')">${c.label}</button>`).join('')+
      `<button type="button" class="build-tab${_buildMenuState.tab==='locked'?' active':''}" data-tab="locked" onclick="setBuildTab('locked')">Locked</button>`;
    sidebar.innerHTML=`
      <div id="build-toolbar">
        <input id="build-search" type="search" placeholder="Search rooms…" oninput="setBuildSearch(this.value)" value="${_buildMenuState.search.replace(/"/g,'&quot;')}">
        <div id="build-tabs">${tabsHtml}</div>
      </div>
      <div id="build-list"></div>`;
    sidebar.dataset.grouped='1';
  }
  _renderBuildCards();
}
function updateDockButtons(){
  document.querySelectorAll('.dockbtn[data-tool]').forEach(btn=>{
    const tool=btn.dataset.tool;
    const unlocked=isToolUnlocked(tool);
    const allowedHere=isRoomAllowedOnFloor(tool,currentFloor);
    const usable=unlocked&&allowedHere;
    btn.disabled=!usable;
    btn.classList.toggle('locked',!usable);
    btn.classList.toggle('floor-locked',unlocked&&!allowedHere);
    btn.classList.toggle('sel',selTool===tool);
    if(unlocked&&!allowedHere){
      btn.title=getFloorSpecLockReason(tool,currentFloor);
    }else if(!unlocked){
      btn.title=getToolLockedText(tool);
    }else{
      btn.title='';
    }
  });
}
function updateUnlockButtons(){
  document.querySelectorAll('.rb[data-tool]').forEach(btn=>{
    const tool=btn.dataset.tool;
    const unlocked=isToolUnlocked(tool);
    const allowedHere=isRoomAllowedOnFloor(tool,currentFloor);
    const usable=unlocked&&allowedHere;
    const def=RDEFS[tool];
    btn.disabled=!usable;
    btn.classList.toggle('locked',!usable);
    btn.classList.toggle('floor-locked',unlocked&&!allowedHere);
    const desc=btn.querySelector('.rd');
    if(desc){
      if(!unlocked)desc.textContent=getToolLockedText(tool);
      else if(!allowedHere)desc.textContent=getFloorSpecLockReason(tool,currentFloor);
      else desc.textContent=(RDEFS[tool]?getRoomRequirementText(tool):btn.dataset.desc);
    }
    if(def){
      btn.style.background=usable?`linear-gradient(180deg, ${def.color}55, ${def.color}22)`: `linear-gradient(180deg, ${def.color}28, ${def.color}12)`;
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
    if(!usable&&selTool===tool)selTool=null;
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

  if(staffMember.negativeTrait?.id==='burnout_risk'||staffMember.personalityTrait?.id==='burnout_risk'){
    // Veteran staff feel less of the burnout penalty.
    penalty*=(1+0.1*negImpact(staffMember));
  }

  return penalty;
}
function getSpeedMult(rm){
  const d=RDEFS[rm.type];
  const s=getAssignedStaffForRoomRole(rm.id,d.staffRole);if(!s)return 2;
  let m=1;s.traits.forEach(t=>{
    if(t.speedMult)m*=t.speedMult;
    if(t.diagnosticSpeedMult&&['lab','xray','radiology'].includes(rm.type))m*=t.diagnosticSpeedMult;
    if(t.deptSpeedBonus)m*=(1-t.deptSpeedBonus);
  });
  // Boolean negative-trait penalties are scaled by the staff member's negative-trait strength
  // so a Veteran with the same flaw only feels 30% of the original slow-down.
  const _negFx=typeof negImpact==='function'?negImpact(s):1;
  if((s.traits||[]).some(t=>t.coffeeDep)&&(s.morale??100)<65)m*=(1+0.15*_negFx);
  if((s.traits||[]).some(t=>t.shiftGremlin)&&(s.energy??100)<40)m*=(1+0.20*_negFx);
  if((s.traits||[]).some(t=>t.vanishingAct)&&patients.length>8)m*=(1+0.18*_negFx);
  if((s.traits||[]).some(t=>t.meetingSummoner)&&!hasOperationalRoom('administration'))m*=(1+0.10*_negFx);
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
  m*=getFloorSpecializationRoomSpeedMult(rm);
  if(!RENOVATION_EXEMPT_TYPES.has(rm.type)&&isFloorRenovating(getRoomFloor(rm))){
    m/=FLOOR_RENOVATION_SPEED_MULT;
  }
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
  m*=getLeadershipBonus().privateRevenueMult||1;
  m*=getFloorSpecializationRoomRevMult(rm);
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
// Room Efficiency
// ---------------
// Each operational room gets a 0–150% efficiency score driven by the
// factors listed in the spec (staff, traits, corridor, cleanliness, floor
// specialization, department upgrades, research, renovation, nearby
// supporting rooms, hospital stress, outage). The score is surfaced in the
// room panel as a labeled breakdown, and the *environmental* portion (the
// signals not already baked into getSpeedMult/getRevMult — cleanliness,
// stress, nearby support, outage) is applied as a multiplier on patient
// treatment time and revenue, so the number meaningfully affects play.
const ROOM_TO_DEPARTMENT_KEY={
  er:'er',general_icu:'er',cardiac_icu:'er',surgery:'er',trauma_bay:'er',pacu:'er',observation_room:'er',
  lab:'lab',xray:'lab',radiology:'lab',
  ward:'ward',med_surg:'ward',single_hospital_room:'ward',double_hospital_room:'ward',geriatrics:'ward',oncology:'ward',pediatrics:'ward',
  administration:'admin',hr_office:'admin',head_office:'admin',case_management:'admin'
};
function _getNearbySupportRooms(rm){
  // Same-floor rooms within ~5 tiles of the room edge that boost or
  // smooth the workflow. Doesn't double-count the room itself.
  if(!rm||!rooms)return[];
  const supports=new Set(['nurse_station','janitor_closet','it_department','dispatch_office','staff_room','administration','pharmacy','hr_office']);
  const floor=getRoomFloor(rm);
  const cx=rm.c+rm.w/2,cy=rm.r+rm.h/2;
  return rooms.filter(o=>o!==rm&&getRoomFloor(o)===floor&&supports.has(o.type)&&isConn(o)&&!isRoomTemporarilyDisabled(o)&&Math.hypot((o.c+o.w/2)-cx,(o.r+o.h/2)-cy)<=Math.max(rm.w,rm.h)+5);
}
function _isOutageImpactingRoom(rm){
  // Treat the temporary-disable flag as the canonical "outage" signal —
  // power/digital event handlers call disableRoom() on affected rooms.
  return !!(rm&&isRoomTemporarilyDisabled(rm));
}
function getRoomEfficiencyDetail(rm,shift=currentShift()){
  const factors=[];
  const push=(label,delta)=>{ if(delta!==0)factors.push({label,delta:Math.round(delta)}); };
  const d=RDEFS[rm.type];
  if(!d)return{percent:0,factors:[{label:'Unknown room',delta:0}],environmentMultiplier:1};
  const connected=isConn(rm);
  const linked=roomHasLinkRequirements(rm);
  // Hard zero conditions short-circuit so the breakdown reads clearly.
  if(_isOutageImpactingRoom(rm)){
    return{percent:0,factors:[{label:'Power/digital outage — room offline',delta:-100}],environmentMultiplier:0};
  }
  if(!connected){
    return{percent:0,factors:[{label:'Not connected to corridor',delta:-100}],environmentMultiplier:0};
  }
  if(!linked){
    return{percent:0,factors:[{label:'Missing required link',delta:-100}],environmentMultiplier:0};
  }
  // Support rooms (no clinical staff role) still get a basic readout.
  if(!d.staffRole){
    let pct=100;
    push('Support room operational',0);
    if(!RENOVATION_EXEMPT_TYPES.has(rm.type)&&isFloorRenovating(getRoomFloor(rm))){
      const reno=Math.round((1-getFloorSpeedMultiplier(getRoomFloor(rm)))*100);
      push('Floor renovation slowdown',-reno);
      pct=Math.round(100*getFloorSpeedMultiplier(getRoomFloor(rm)));
    }
    return{percent:pct,factors,environmentMultiplier:1};
  }
  if(!roomHasRequiredStaff(rm,shift)){
    return{percent:0,factors:[{label:'Required staff missing',delta:-100}],environmentMultiplier:0};
  }
  // Base + factor breakdown.
  let pct=100;
  push('Base operational',0);
  // 1. Required staff present — full coverage gets a flat boost.
  const missing=getMissingRoomRoles(rm,shift);
  if(missing.length===0){ pct+=20; push('Required staff present',+20); }
  // 2. Staff level/traits — derived from getSpeedMult & getRevMult deviation
  //    from neutral 1.0; cap the swing so traits don't dominate the number.
  const treatingStaff=getStaffForRoom(rm.id);
  const speedSignal=clamp((1-Math.min(2,getSpeedMult(rm)))*40,-20,20); // faster→positive
  if(Math.abs(speedSignal)>=1){ pct+=speedSignal; push(speedSignal>0?'Skilled/fast staff & traits':'Slow staff or trait penalties',speedSignal); }
  const revSignal=clamp((getRevMult(rm)-1)*30,-15,15);
  if(Math.abs(revSignal)>=1){ pct+=revSignal; push(revSignal>0?'High-value staff bonuses':'Reduced staff revenue output',revSignal); }
  // 3. Corridor connection — already required above, but credit it.
  pct+=10; push('Connected to corridor',+10);
  // 4. Cleanliness — ±20 around the 50% baseline.
  const cleanDelta=clamp(((typeof cleanliness!=='undefined'?cleanliness:70)-50)*0.4,-20,20);
  if(Math.abs(cleanDelta)>=1){ pct+=cleanDelta; push(cleanDelta>0?'Strong cleanliness':'Poor cleanliness',cleanDelta); }
  // 5. Floor specialization match — read from the existing speed-mult helper.
  const specMult=getFloorSpecializationRoomSpeedMult(rm);
  if(specMult<0.99){ pct+=10; push('Floor specialization match',+10); }
  else if(specMult>1.01){ pct-=10; push('Floor specialization mismatch',-10); }
  // 6. Department upgrade level — +5 per level above 1 in the matching dept.
  const deptKey=ROOM_TO_DEPARTMENT_KEY[rm.type];
  if(deptKey&&typeof getDepartmentLevel==='function'){
    const lvl=getDepartmentLevel(deptKey)||1;
    const deptBonus=Math.max(0,lvl-1)*5;
    if(deptBonus){ pct+=deptBonus; push(`Department upgrade Lv${lvl}`,+deptBonus); }
  }
  // 7. Relevant research — derive from techBonus speed signals.
  const techBonus=typeof getTechBonus==='function'?getTechBonus():null;
  if(techBonus){
    const isDx=['lab','xray','radiology'].includes(rm.type);
    const research=(techBonus.speed>1?5:0)
      +(rm.type==='er'&&techBonus.erSpeed>1?5:0)
      +(rm.type==='gp'&&techBonus.gpSpeed>1?5:0)
      +(isDx&&techBonus.diagnosticSpeed>1?5:0);
    if(research){ pct+=research; push('Research bonus',+research); }
  }
  // 8. Renovation slowdown — flat -25 while the floor is renovating.
  if(!RENOVATION_EXEMPT_TYPES.has(rm.type)&&isFloorRenovating(getRoomFloor(rm))){
    pct-=25; push('Floor renovation slowdown',-25);
  }
  // 9. Nearby supporting rooms — +3 each, cap +15.
  const nearby=_getNearbySupportRooms(rm);
  if(nearby.length){
    const bonus=Math.min(15,nearby.length*3);
    pct+=bonus; push(`Nearby support rooms (${nearby.length})`,+bonus);
  }
  // 10. Hospital stress — −1 per 5 above 50, cap −10.
  const stressNow=typeof stress!=='undefined'?stress:0;
  if(stressNow>50){
    const sp=-Math.min(10,Math.floor((stressNow-50)/5));
    if(sp){ pct+=sp; push('High hospital stress',sp); }
  }
  // Compute the *environmental* multiplier — only the signals not already
  // baked into getSpeedMult/getRevMult, so applying it doesn't double-count.
  const envDelta=cleanDelta+(nearby.length?Math.min(15,nearby.length*3):0)+(stressNow>50?-Math.min(10,Math.floor((stressNow-50)/5)):0);
  const environmentMultiplier=clamp(1+envDelta/100,0.7,1.25);
  return{percent:Math.round(clamp(pct,0,150)),factors,environmentMultiplier};
}
function getRoomEfficiencyPercent(rm,shift=currentShift()){
  return getRoomEfficiencyDetail(rm,shift).percent;
}
function getRoomEfficiencyMultiplier(rm,shift=currentShift()){
  return getRoomEfficiencyDetail(rm,shift).environmentMultiplier;
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
  const _ageDays=Math.max(0,day-(rm.builtDay??1));
  const _established=isRoomEstablished(rm);
  const _floorReno=isFloorRenovating(getRoomFloor(rm));
  const _ageBadge=_established?` · ⭐ Established (Day ${rm.builtDay??1}, ${_ageDays}d)`:` · Built day ${rm.builtDay??1} (${_ageDays}d)`;
  const _renoBadge=_floorReno?` · 🛠 Floor ${getRoomFloor(rm)} Renovation Active: ${getFloorRenovationDaysLeft(getRoomFloor(rm))} days remaining, speed -67%`:'';
  document.getElementById('roompanel-name').textContent=d.name;
  document.getElementById('roompanel-type').textContent=`Type: ${d.name} • Floor ${getRoomFloor(rm)} • ${getFloorSpecialization(getRoomFloor(rm)).label}${_ageBadge}${_renoBadge}`;
  const statusNode=document.getElementById('roompanel-status');
  if(statusNode){
    statusNode.textContent=statusMeta.label;
    statusNode.className=`status-chip ${statusMeta.chip}`;
  }
  const _eff=getRoomEfficiencyDetail(rm);
  document.getElementById('roompanel-efficiency').textContent=`${_eff.percent}%`;
  const breakdownNode=document.getElementById('roompanel-efficiency-breakdown');
  if(breakdownNode){
    breakdownNode.innerHTML=_eff.factors.map(f=>{
      const sign=f.delta>0?'+':(f.delta<0?'':'');
      const tone=f.delta>0?'good':(f.delta<0?'bad':'muted');
      return `<div class="eff-factor ${tone}"><span class="eff-factor-label">${f.label}</span><span class="eff-factor-delta">${f.delta===0?'•':sign+f.delta+'%'}</span></div>`;
    }).join('');
  }
  document.getElementById('roompanel-throughput').textContent=getRoomThroughputText(rm);
  document.getElementById('roompanel-staff').innerHTML=roomStaff.length
    ?roomStaff.map(member=>`<div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">${member.name}</div><div class="room-panel-item-sub">${ROLES[member.role].label}</div></div><div class="room-panel-item-value">Energy ${Math.round(member.energy??100)}%</div></div>`).join('')
    :'<div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">No active staff</div><div class="room-panel-item-sub">This room needs coverage on the current shift.</div></div></div>';
  document.getElementById('roompanel-queue').innerHTML=`<div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">Waiting</div><div class="room-panel-item-sub">${queueSummary.waiting?`${queueSummary.waiting} patients are routing here.`:'No active queue for this room.'}</div></div><div class="room-panel-item-value">${queueSummary.waiting}</div></div><div class="room-panel-item"><div class="room-panel-item-copy"><div class="room-panel-item-title">Avg Wait</div><div class="room-panel-item-sub">${queueSummary.waiting?'Average wait for patients targeting this room.':'No wait time building right now.'}</div></div><div class="room-panel-item-value">${queueSummary.waiting?formatWaitHours(queueSummary.avgWaitTicks):'0.0h'}</div></div>`;
  document.getElementById('roompanel-issues').innerHTML=issues.map(issue=>`<div class="room-panel-item issue ${issue.kind==='danger'?'danger':''}"><div class="room-panel-item-copy"><div class="room-panel-item-title">${issue.kind==='stable'?'OK':'&#9888;'} ${issue.label}</div><div class="room-panel-item-sub">${issue.detail}</div></div></div>`).join('');
  panel.classList.remove('hidden');
}
function updateHeatmapUI(){
  const btn=document.getElementById('heatmapbtn');
  if(btn){
    btn.textContent=heatmapOn?'Traffic On':'Traffic';
    btn.classList.toggle('on',heatmapOn);
  }
  const btn2=document.getElementById('heatmapbtn2');
  if(btn2){
    btn2.innerHTML=heatmapOn?'\u{1F4CA} Heatmap On':'\u{1F4CA} Heatmap';
    btn2.classList.toggle('on',heatmapOn);
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
    const specReason=typeof getSpecialtyRoomLockReason==='function'?getSpecialtyRoomLockReason(t):'';
    document.getElementById('hint').textContent=specReason||getMilestoneForTool(t)?.desc||`${RDEFS[t]?.name||'This room'} is still locked.`;
    return;
  }
  selTool=t;
  document.querySelectorAll('.rb,.dockbtn').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll(`[data-tool="${t}"]`).forEach(b=>b.classList.add('sel'));
  const hints={
    corridor:'Click and drag to paint corridor tiles.',
    demolish:'Click a tile or room to remove it.',
    ...Object.fromEntries(Object.entries(RDEFS).map(([k,v])=>[k,`Placing ${v.name} ($${v.cost}) — needs corridor${v.staffRole&&ROLES[v.staffRole]?` + ${ROLES[v.staffRole].label}`:''}.`]))
  };
  Object.keys(RDEFS).forEach(k=>{
    hints[k]=`Placing ${RDEFS[k].name} ($${RDEFS[k].cost}) - needs corridor + ${getRoomRequirementText(k).replace('Needs: ','')}.`;
  });
  document.getElementById('hint').textContent=hints[t]||'';
}

function gridXY(e){const r=cv.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/T),y:Math.floor((e.clientY-r.top)/T)};}
function inBounds(x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS;}
function tileOccupied(x,y,floor=currentFloor){
  if(!isBuildableTile(x,y,floor))return true;
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
function _tileTouchesEntranceEdge(tile,edges){
  // Legacy edge-proximity fallback when terrainMask is missing.
  const w=tile.w||1,h=tile.h||1;
  if(edges.includes('south')&&tile.r+h>=ROWS-4)return true;
  if(edges.includes('north')&&tile.r<=3)return true;
  if(edges.includes('west')&&tile.c<=3)return true;
  if(edges.includes('east')&&tile.c+w>=COLS-4)return true;
  return false;
}
function _entranceAccessOK(tile,accessType){
  // Terrain-aware adjacency: room must be orthogonally adjacent to a road or
  // parking tile that lies along one of the campus's allowed edges for this
  // access type (front/staff/ambulance/service).
  const camp=(typeof getCampus==='function')?getCampus(selectedCampusId):null;
  const accMap=(camp&&camp.accessEdges)||{};
  const edges=accMap[accessType]||(camp&&camp.entranceEdges)||['south'];
  if(!terrainMask)return _tileTouchesEntranceEdge(tile,edges);
  const w=tile.w||1,h=tile.h||1;
  for(let r=tile.r-1;r<=tile.r+h;r++){
    for(let c=tile.c-1;c<=tile.c+w;c++){
      if(r<0||r>=ROWS||c<0||c>=COLS)continue;
      // Skip cells inside the room footprint
      if(r>=tile.r&&r<tile.r+h&&c>=tile.c&&c<tile.c+w)continue;
      const k=terrainMask[r]&&terrainMask[r][c];
      if(k!=='road'&&k!=='parking')continue;
      if(edges.includes('south')&&r>=Math.floor(ROWS*0.6))return true;
      if(edges.includes('north')&&r<=Math.ceil(ROWS*0.4))return true;
      if(edges.includes('west')&&c<=Math.ceil(COLS*0.4))return true;
      if(edges.includes('east')&&c>=Math.floor(COLS*0.6))return true;
    }
  }
  return false;
}
function nearRoad(tile){
  if(!tile)return false;
  const entrances=rooms.filter(r=>
    getRoomFloor(r)===(tile.floor??currentFloor)&&
    (r.type==='front_entrance'||r.type==='er_entrance')
  );
  if(!entrances.length){
    // No entrance yet — fall back to road-adjacency along campus front edge
    return _entranceAccessOK(tile,'front');
  }
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
const NO_CORRIDOR_REQUIRED=new Set(['parking_expansion','staff_parking','service_loading_dock','ambulance_bay']);
function isConn(rm){if(NO_CORRIDOR_REQUIRED.has(rm.type))return true;return corridorAdj(rm.c,rm.r,rm.w,rm.h,getRoomFloor(rm));}

function canPlacePrefabRoom(type,c,r,floor=1){
  const def=RDEFS[type];
  if(!def)return false;
  if(def.firstFloorOnly&&floor!==1)return false;
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
    builtAt:currentAnimTime(),
    builtDay:day
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
  const camp=getCampus(selectedCampusId);
  const starterRooms=(camp.starter&&camp.starter.rooms)?camp.starter.rooms.slice():[];
  const starterCorridors=(camp.starter&&camp.starter.corridors)?camp.starter.corridors.slice():[];

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

let _corridorBlockToastShown=false;
function paintCorridor(x,y){
  if(!buildMode)return;
  if(!inBounds(x,y)||tileOccupied(x,y))return;
  const pathType=isPathTool(selTool)?selTool:'corridor';
  if(!isRoomAllowedOnFloor(pathType,currentFloor)){
    const reason=getFloorSpecLockReason(pathType,currentFloor);
    if(reason&&(!dragging||!_corridorBlockToastShown)){
      showToast(reason,'warn');
      _corridorBlockToastShown=true;
      setTimeout(()=>{_corridorBlockToastShown=false;},1500);
    }
    return;
  }
  const cost=Math.max(1,Math.round(getPathCost(pathType)*getLeadershipBonus().corridorCostMult*(getMapBonus().expansionCostMultiplier||1)));
  if(!isSandboxMode&&money<cost){addLog('Not enough money!','b');return;}
  grid[y][x]=pathType;
  if(!isSandboxMode)changeMoney(-cost);
  updateUI();
}

let _spaceHeld=false;
let _panState=null;
const _cw=document.getElementById('cw');
function _isPanGesture(e){
  // Middle-mouse, space-held + left, or left-click drag when no build tool is selected.
  if(e.button===1)return true;
  if(e.button===0&&_spaceHeld)return true;
  if(e.button===0&&!(buildMode&&selTool))return true;
  return false;
}
function _startPan(e){
  if(!_cw)return false;
  _panState={
    startX:e.clientX,startY:e.clientY,
    scrollLeft:_cw.scrollLeft,scrollTop:_cw.scrollTop,
    moved:false
  };
  if(_cw)_cw.classList.add('cw-panning');
  return true;
}
function _updatePan(e){
  if(!_panState||!_cw)return;
  const dx=e.clientX-_panState.startX;
  const dy=e.clientY-_panState.startY;
  if(Math.abs(dx)+Math.abs(dy)>3)_panState.moved=true;
  _cw.scrollLeft=_panState.scrollLeft-dx;
  _cw.scrollTop=_panState.scrollTop-dy;
}
function _endPan(){
  const moved=_panState&&_panState.moved;
  _panState=null;
  if(_cw)_cw.classList.remove('cw-panning');
  return moved;
}
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!e.repeat){
    const t=e.target;const tag=t&&t.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||(t&&t.isContentEditable))return;
    _spaceHeld=true;if(_cw)_cw.classList.add('cw-pan-ready');e.preventDefault();
  }
});
window.addEventListener('keyup',e=>{
  if(e.code==='Space'){_spaceHeld=false;if(_cw)_cw.classList.remove('cw-pan-ready');}
});
window.addEventListener('blur',()=>{_spaceHeld=false;if(_cw){_cw.classList.remove('cw-pan-ready');_cw.classList.remove('cw-panning');}_panState=null;});

cv.addEventListener('mousedown',e=>{
  if(e.button===2)return;
  if(_isPanGesture(e)){
    if(_startPan(e)){e.preventDefault();return;}
  }
  const{x,y}=gridXY(e);dragging=true;
  if(!buildMode)return;
  if(isPathTool(selTool))paintCorridor(x,y);
  else if(selTool==='demolish')demolishAt(x,y);
  else if(selTool&&RDEFS[selTool])placeRoom(x,y);
});
window.addEventListener('mousemove',e=>{
  if(_panState){_updatePan(e);return;}
});
cv.addEventListener('mousemove',e=>{
  if(_panState)return;
  const{x,y}=gridXY(e);hover={x,y};
  if(buildMode&&dragging&&isPathTool(selTool))paintCorridor(x,y);
  showTT(e,x,y);render();
});
window.addEventListener('mouseup',e=>{
  if(_panState){const moved=_endPan();if(moved){_suppressNextClick=true;}}
  dragging=false;
});
cv.addEventListener('mouseleave',()=>{if(_panState)return;dragging=false;hover={x:-1,y:-1};document.getElementById('tt').style.display='none';render();});
cv.addEventListener('contextmenu',e=>{e.preventDefault();clearToolSelection();});
let _suppressNextClick=false;
cv.addEventListener('click',e=>{
  if(_suppressNextClick){_suppressNextClick=false;return;}
  if(buildMode&&selTool)return;
  const{x,y}=gridXY(e);
  const rm=roomAt(x,y);
  if(rm)openRoomPanel(rm.id);
  else closeRoomPanel();
});

// ── Placement info card (shown while hovering with a build tool) ─────────────
// Data-driven recommendations. Each entry is a list of room TYPES this room
// works best near. Used to show "Best near:" hints and to color the placement
// card green/yellow based on actual proximity on the current floor.
const ROOM_BEST_NEAR={
  waiting_room:['front_entrance','gp','er','reception'],
  gp:['waiting_room','nurse_station','lab','pharmacy'],
  er:['er_entrance','ambulance_bay','trauma_bay','general_icu','nurse_station'],
  ambulance_bay:['er','dispatch_office'],
  dispatch_office:['ambulance_bay','er'],
  trauma_bay:['er','general_icu','blood_bank'],
  general_icu:['er','trauma_bay','nurse_station'],
  cardiac_icu:['er','general_icu','nurse_station'],
  observation_room:['er','nurse_station'],
  lab:['gp','er','radiology','specimen_receiving'],
  xray:['gp','er','radiology'],
  ct_scan:['er','radiology','xray'],
  mri:['radiology','ct_scan'],
  ultrasound:['gp','obgyn','radiology'],
  pharmacy:['gp','er','ward','nurse_station'],
  nurse_station:['gp','er','ward','single_hospital_room','double_hospital_room'],
  ward:['nurse_station','gp'],
  single_hospital_room:['nurse_station','ward'],
  double_hospital_room:['nurse_station','ward'],
  med_surg:['nurse_station','operating_room','pacu'],
  pediatrics:['gp','nurse_station','waiting_room'],
  obgyn:['ultrasound','labor_delivery','postpartum_room'],
  labor_delivery:['obgyn','postpartum_room','nursery'],
  postpartum_room:['labor_delivery','nursery','nurse_station'],
  nursery:['labor_delivery','postpartum_room'],
  operating_room:['pre_op','pacu','sterile_processing','surgical_recovery'],
  pre_op:['operating_room'],
  pacu:['operating_room','surgical_recovery'],
  surgical_recovery:['pacu','operating_room'],
  sterile_processing:['operating_room','central_supply'],
  plastic_surgery_or:['pre_op','pacu','cosmetic_consult_office'],
  vip_room:['concierge_desk','private_lounge','premium_waiting_lounge'],
  premium_recovery_suite:['vip_room','concierge_desk'],
  research_department:['research_lab','grant_writer_office','clinical_trials_office'],
  research_lab:['research_department','specimen_receiving'],
  clinical_trials_office:['research_department','ethics_board_office'],
  grant_writer_office:['research_department','finance_office','administration'],
  hr_office:['administration','training_office','employee_wellness_office'],
  training_office:['hr_office','teaching_intern_office'],
  teaching_intern_office:['training_office','gp','er'],
  it_department:['server_room','data_backup_room','administration'],
  server_room:['it_department','data_backup_room'],
  data_backup_room:['server_room','it_department'],
  central_supply:['sterile_processing','loading_receiving_room','operating_room'],
  loading_receiving_room:['central_supply','supply_warehouse'],
  supply_warehouse:['central_supply','loading_receiving_room'],
  staff_room:['nurse_station','gp','er'],
  lunch_room:['waiting_room','gp','staff_room'],
  bathroom:['waiting_room','gp','er'],
  janitor_closet:['bathroom','ward','nurse_station'],
};
// Floor specializations where each room type "shines". A room placed on a
// matching specialization gets a green ideal-floor chip; off-spec gets yellow.
function getRoomIdealSpecKeys(type){
  const out=[];
  Object.values(FLOOR_SPECIALIZATIONS).forEach(spec=>{
    if(!spec||!Array.isArray(spec.unlockedRooms))return;
    if(spec.unlockedRooms.includes(type))out.push(spec.id);
  });
  return out;
}
// Smallest Chebyshev distance from this footprint to any existing room on the
// same floor whose type is in `types`. Returns Infinity if none found.
function _nearestRoomOfTypes(pc,pr,w,h,types,floor){
  if(!Array.isArray(types)||!types.length)return Infinity;
  const set=new Set(types);
  let best=Infinity;
  for(const rm of rooms){
    if(!rm||!set.has(rm.type))continue;
    if(getRoomFloor(rm)!==floor)continue;
    const dx=Math.max(0,Math.max(rm.c-(pc+w-1),pc-(rm.c+rm.w-1)));
    const dy=Math.max(0,Math.max(rm.r-(pr+h-1),pr-(rm.r+rm.h-1)));
    const d=Math.max(dx,dy);
    if(d<best)best=d;
  }
  return best;
}
function _bestNearLabels(type){
  const list=ROOM_BEST_NEAR[type]||[];
  return list.map(t=>RDEFS[t]?.name||t).filter(Boolean);
}
function showPlacementCard(e,x,y){
  const tt=document.getElementById('tt');
  if(!tt||!selTool||!RDEFS[selTool]){tt.style.display='none';return;}
  const d=RDEFS[selTool];
  const fp=getBuildFootprint(selTool);
  const pc=Math.max(0,Math.min(x,COLS-fp.w)),pr=Math.max(0,Math.min(y,ROWS-fp.h));
  // Status check (mirrors the ghost-rect logic in render()).
  let occupied=false;
  if(inBounds(x,y)){
    for(let rr2=pr;rr2<pr+fp.h&&!occupied;rr2++)
      for(let cc=pc;cc<pc+fp.w&&!occupied;cc++)
        if(tileOccupied(cc,rr2))occupied=true;
  }
  const allowedFloor=isRoomAllowedOnFloor(selTool,currentFloor);
  const hasCorridor=corridorAdj(pc,pr,fp.w,fp.h);
  const affordable=money>=d.cost||(freeBuildCredits[selTool]||0)>0||isSandboxMode;
  const blocked=!inBounds(x,y)||occupied||!allowedFloor;
  // Best-near proximity scoring.
  const bestNear=_bestNearLabels(selTool);
  const bestTypes=ROOM_BEST_NEAR[selTool]||[];
  const dist=inBounds(x,y)?_nearestRoomOfTypes(pc,pr,fp.w,fp.h,bestTypes,currentFloor):Infinity;
  const idealSpecs=getRoomIdealSpecKeys(selTool);
  const curSpecKey=getFloorSpecializationKey(currentFloor);
  const onIdealSpec=idealSpecs.includes(curSpecKey);
  // Pick the headline color: red blocked → blue tutorial → yellow caveat → green good.
  let toneClass='good',toneLabel='Good placement',toneColor='#5fa86b';
  if(blocked){toneClass='bad';toneLabel=!allowedFloor?'Blocked on this floor':occupied?'Tile occupied':'Out of bounds';toneColor='#cf5a5a';}
  else if(!hasCorridor){toneClass='bad';toneLabel='No corridor access';toneColor='#cf5a5a';}
  else if(!affordable){toneClass='warn';toneLabel='Not enough cash';toneColor='#c98e2a';}
  else if((bestTypes.length&&dist===Infinity)||(idealSpecs.length&&!onIdealSpec)||(bestTypes.length&&dist>5)){
    toneClass='warn';toneLabel='Works, not ideal';toneColor='#c98e2a';
  }
  // Tutorial-suggested override: if there's an active tutorial highlight on this tool, use blue.
  const tutHighlight=document.querySelector('.tutorial-highlight [data-tool="'+selTool+'"], .tutorial-highlight#cw');
  if(!blocked&&tutHighlight&&toneClass!=='bad'){toneClass='tut';toneLabel='Tutorial suggestion';toneColor='#3d7fb6';}
  const reqText=(typeof getRoomRequirementText==='function')?getRoomRequirementText(selTool).replace(/^Needs:\s*/,''):'';
  const purpose=(typeof getRoomRouteGuide==='function')?(()=>{
    const g=getRoomRouteGuide(selTool);
    if(!g||!g.uses)return d.name;
    return `Serves ${g.uses.slice(0,3).join(', ')}`;
  })():d.name;
  const buildCostMult=getGrantRoomBuildCostMultiplier(selTool);
  const liveCost=Math.round(d.cost*(Number.isFinite(buildCostMult)?buildCostMult:1));
  const idealSpecLabels=idealSpecs.map(k=>FLOOR_SPECIALIZATIONS[k]?.label||k);
  const bestNearText=bestNear.length?bestNear.slice(0,4).join(', '):'No required neighbors';
  const idealText=idealSpecLabels.length?idealSpecLabels.slice(0,3).join(', '):'Any specialization';
  const proximityNote=bestTypes.length
    ?(dist===Infinity?'⚠ No recommended neighbor on this floor yet'
      :dist===0?'✓ Adjacent to a recommended neighbor'
      :dist<=3?'✓ Close to a recommended neighbor'
      :'• Far from recommended neighbors')
    :'';
  let html=`<div style="font-weight:700;color:${toneColor};font-size:12px">${d.name}</div>`;
  html+=`<div class="ts" style="margin-top:1px">${purpose}</div>`;
  html+=`<div style="margin-top:6px;padding:3px 6px;border-radius:8px;background:${toneColor}22;color:${toneColor};font-weight:600;font-size:10.5px;display:inline-block">${toneLabel}</div>`;
  html+=`<div class="ts" style="margin-top:6px"><b>Cost:</b> $${liveCost.toLocaleString()}${liveCost!==d.cost?` <span style="opacity:.7">(base $${d.cost.toLocaleString()})</span>`:''}</div>`;
  html+=`<div class="ts"><b>Size:</b> ${fp.w} × ${fp.h}</div>`;
  if(reqText)html+=`<div class="ts"><b>Needs:</b> ${reqText}</div>`;
  html+=`<div class="ts"><b>Best near:</b> ${bestNearText}</div>`;
  html+=`<div class="ts"><b>Ideal floor:</b> ${idealText}${onIdealSpec?' ✓':''}</div>`;
  if(proximityNote)html+=`<div class="ts" style="margin-top:2px">${proximityNote}</div>`;
  if(!blocked&&!hasCorridor)html+=`<div style="color:#cf5a5a;margin-top:4px">⚠ This room needs corridor access to function.</div>`;
  if(!allowedFloor){
    const reason=(typeof getFloorSpecLockReason==='function')?getFloorSpecLockReason(selTool,currentFloor):'';
    html+=`<div style="color:#cf5a5a;margin-top:4px">⛔ ${reason||'Not allowed on this floor.'}</div>`;
  }
  if(!affordable&&!blocked&&hasCorridor)html+=`<div style="color:#c98e2a;margin-top:4px">Need $${(liveCost-money).toLocaleString()} more.</div>`;
  tt.innerHTML=html;
  tt.style.display='block';
  tt.style.maxWidth='240px';
  const wr=document.getElementById('cw').getBoundingClientRect();
  placeTooltip(tt,e,wr);
}
function showTT(e,x,y){
  const tt=document.getElementById('tt');
  if(selTool&&RDEFS[selTool]){showPlacementCard(e,x,y);return;}
  if(selTool)return void(tt.style.display='none');
  // Reset width that the placement card might have set.
  tt.style.maxWidth='';
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
    tt.innerHTML=html;tt.style.display='block';
    placeTooltip(tt,e,wr);
  } else if(inBounds(x,y)&&isPathTile(grid[y][x])){
    const pathType=grid[y][x];
    tt.innerHTML=`<b>${pathType==='luxury_path'?'Luxury Path':'Corridor'}</b><br><span class="ts">${pathType==='luxury_path'?'Premium patient walkway':'Patient walkway'}</span>`;
    const wr=document.getElementById('cw').getBoundingClientRect();
    tt.style.display='block';
    placeTooltip(tt,e,wr);
  } else tt.style.display='none';
}

function placeTooltip(tt,e,wr){
  const margin=8;
  const tw=tt.offsetWidth||180;
  const th=tt.offsetHeight||40;
  let left=e.clientX-wr.left+12;
  let top=e.clientY-wr.top-10;
  if(left+tw+margin>wr.width)left=Math.max(margin,e.clientX-wr.left-tw-12);
  if(top+th+margin>wr.height)top=Math.max(margin,e.clientY-wr.top-th-12);
  if(left<margin)left=margin;
  if(top<margin)top=margin;
  tt.style.left=left+'px';
  tt.style.top=top+'px';
}

function placeRoom(cx,cy){
  if(!buildMode)return;
  if(!isToolUnlocked(selTool)){addLog(`${RDEFS[selTool]?.name||'That room'} is still locked.`,'w');if(window.playSound)window.playSound('invalid_placement');return;}
  if(!isRoomAllowedOnFloor(selTool,currentFloor)){
    const reason=getFloorSpecLockReason(selTool,currentFloor);
    addLog(`${RDEFS[selTool]?.name||'That room'} can't be built on this floor — ${reason}.`,'w');
    showToast(reason,'warn');
    if(window.playSound)window.playSound('invalid_placement');
    return;
  }
  const d=RDEFS[selTool];
  const _lb=getLeadershipBonus();
  const _typeRoomMult=(selTool==='waiting_room'?_lb.waitingRoomCostMult:1)*(selTool==='gp'?_lb.gpCostMult:1);
  const _isPrivateRoom=(selTool==='vip_room'||selTool==='single_hospital_room'||selTool==='double_hospital_room');
  const _privateMult=_isPrivateRoom?(_lb.privateRoomCostMult||1):1;
  const _floorSpec=getFloorSpecialization(currentFloor);
  const _diagMult=(_floorSpec.id==='diagnostics'&&isDiagnosticTool(selTool))?(_floorSpec.drawbacks?.diagnosticCostMult||1):1;
  const _mfgMult=(_floorSpec.id==='manufacturing_supply')?(_floorSpec.bonuses?.manufacturingRoomCostMult||1):1;
  const _mapMult=getMapBonus().constructionCostMultiplier||1;
  const buildCost=Math.max(0,Math.round(d.cost*getGrantRoomBuildCostMultiplier(selTool)*_lb.roomCostMult*_typeRoomMult*_privateMult*_diagMult*_mfgMult*_mapMult));
  const footprint=getBuildFootprint(selTool);
  const hasCredit=(freeBuildCredits[selTool]||0)>0;
  if(!hasCredit&&!isSandboxMode&&money<buildCost){addLog('Not enough money!','b');if(window.playSound)window.playSound('invalid_placement');return;}
  const pc=Math.max(0,Math.min(cx,COLS-footprint.w)),pr=Math.max(0,Math.min(cy,ROWS-footprint.h));
  for(let rr2=pr;rr2<pr+footprint.h;rr2++)for(let cc=pc;cc<pc+footprint.w;cc++)if(tileOccupied(cc,rr2)){addLog('Space occupied.','b');if(window.playSound)window.playSound('invalid_placement');return;}
  if(!corridorAdj(pc,pr,footprint.w,footprint.h)){addLog(`${d.name} needs adjacent corridor.`,'b');if(window.playSound)window.playSound('invalid_placement');return;}
  // Entrance/access rooms must be adjacent to a road or parking tile along the
  // campus's declared edge for that access type.
  const _accessType=(selTool==='ambulance_bay')?'ambulance':((selTool==='staff_entrance')?'staff':((selTool==='front_entrance'||selTool==='er_entrance')?'front':null));
  if(_accessType){
    if(!_entranceAccessOK({c:pc,r:pr,w:footprint.w,h:footprint.h},_accessType)){
      const camp=(typeof getCampus==='function')?getCampus(selectedCampusId):null;
      const accMap=(camp&&camp.accessEdges)||{};
      const edges=accMap[_accessType]||(camp&&camp.entranceEdges)||['south'];
      const edgeLabel=edges.join('/');
      addLog(`${d.name} must be adjacent to a road on the ${edgeLabel} edge of this campus.`,'b');
      showToast(`Needs road access on ${edgeLabel} edge`,'warn');
      return;
    }
  }
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
  // Soft hint: if we have recommended neighbors and at least one exists on this
  // floor but the player placed far from it, nudge them gently. Doesn't block.
  if(typeof ROOM_BEST_NEAR!=='undefined'&&Array.isArray(ROOM_BEST_NEAR[selTool])){
    const types=ROOM_BEST_NEAR[selTool];
    const dist=_nearestRoomOfTypes(pc,pr,footprint.w,footprint.h,types,currentFloor);
    if(Number.isFinite(dist)&&dist>5){
      showToast('That works, but closer rooms reduce travel and confusion.','info');
    }
  }
  {const _newRm={id:Date.now()+Math.random(),type:selTool,r:pr,c:pc,w:footprint.w,h:footprint.h,rot:footprint.rotated?1:0,floor:currentFloor,builtAt:currentAnimTime(),builtDay:day};rooms.push(_newRm);if(window.animPolish)window.animPolish.polishPlaceRoom(_newRm);if(window.playSound)window.playSound('room_placed');}
  // Vertical connectors physically span every floor — mirror the same
  // footprint on every higher floor so the shaft/staircase exists end-to-end.
  // Skips any floor where the footprint is already occupied; no extra cost.
  if(selTool==='staircase'||selTool==='elevator'){
    let mirroredCount=0;
    let skippedCount=0;
    for(let f=currentFloor+1;f<=MAX_FLOORS;f++){
      let blocked=false;
      for(let rr2=pr;rr2<pr+footprint.h&&!blocked;rr2++){
        for(let cc=pc;cc<pc+footprint.w&&!blocked;cc++){
          if(tileOccupied(cc,rr2,f))blocked=true;
        }
      }
      if(blocked){skippedCount++;continue;}
      {const _mRm={id:Date.now()+Math.random(),type:selTool,r:pr,c:pc,w:footprint.w,h:footprint.h,rot:footprint.rotated?1:0,floor:f,builtAt:currentAnimTime(),builtDay:day};rooms.push(_mRm);if(window.animPolish)window.animPolish.polishPlaceRoom(_mRm);}
      mirroredCount++;
    }
    if(mirroredCount>0)addLog(`${d.name} extended to floor${mirroredCount===1?'':'s'} above (${mirroredCount} added).`,'g');
    if(skippedCount>0)addLog(`${skippedCount} floor${skippedCount===1?'':'s'} above already had something at that spot — ${d.name} skipped there.`,'w');
  }
  // Vertical connectors unlock the next floor — prompt its specialization picker
  // immediately so players choose at the moment of unlock (not on first visit).
  if((selTool==='staircase'||selTool==='elevator')&&currentFloor<MAX_FLOORS){
    const nextFloor=currentFloor+1;
    if(getFloorSpecializationKey(nextFloor)==='unchosen'&&!document.getElementById('floorspecmodal')?.classList.contains('open')){
      setTimeout(()=>openFloorSpecModal(nextFloor),120);
    }
  }
  updateUI();render();
}

let _pendingRenovationConfirm=null;
function openRenovationConfirmModal(rm,onConfirm){
  const modal=document.getElementById('renomodal');
  const sub=document.getElementById('renomodal-subtitle');
  const btn=document.getElementById('renomodal-confirm');
  if(!modal||!sub||!btn){onConfirm&&onConfirm();return;}
  _pendingRenovationConfirm=onConfirm;
  const floor=getRoomFloor(rm);
  const ageDays=day-(rm.builtDay??1);
  sub.innerHTML=`<strong>${RDEFS[rm.type].name}</strong> on Floor ${floor} is Established (Day ${rm.builtDay??1}, ${ageDays} day${ageDays===1?'':'s'} old).<br>` +
    `Established rooms are permanent infrastructure — once they have been part of your hospital for ${ROOM_ESTABLISHED_DAYS} days, replacing them is a major construction project. ` +
    `Changing it requires a floor renovation. Renovation will reduce this floor's speed by 67% for 30 days. ` +
    `Small amenities (vending, drinks, ATMs) are exempt and free to change.`;
  btn.onclick=()=>{
    const cb=_pendingRenovationConfirm;
    _pendingRenovationConfirm=null;
    closeRenovationConfirmModal();
    if(typeof cb==='function')cb();
  };
  modal.style.display='flex';
  modal.classList.add('open');
}
function closeRenovationConfirmModal(){
  const modal=document.getElementById('renomodal');
  if(modal){modal.classList.remove('open');modal.style.display='none';}
  _pendingRenovationConfirm=null;
}
function _performDemolishRoom(rm){
  if(!rm)return;
  if(selectedRoomId===rm.id)closeRoomPanel();
  const refund=Math.floor(RDEFS[rm.type].cost*.5);
  changeMoney(refund);
  patients=patients.filter(p=>p.roomId!==rm.id);
  rooms=rooms.filter(r=>r.id!==rm.id);
  addLog(`Demolished ${RDEFS[rm.type].name}. +$${refund}`,'b');
  updateUI();
  render();
}
function demolishAt(x,y){
  if(!buildMode)return;
  const rm=roomAt(x,y);
  if(rm){
    gateEstablishedRoomChange(rm,()=>_performDemolishRoom(rm));
    return;
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
    const specReason=typeof getSpecialtyRoomLockReason==='function'?getSpecialtyRoomLockReason(t):'';
    document.getElementById('hint').textContent=specReason||getMilestoneForTool(t)?.desc||`${getBuildToolName(t)} is still locked.`;
    return;
  }
  if(!isRoomAllowedOnFloor(t,currentFloor)){
    const reason=getFloorSpecLockReason(t,currentFloor)||`Not allowed on this floor's specialization.`;
    document.getElementById('hint').textContent=reason;
    showToast(reason,'warn');
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
  // Apply public reputation bonus (Community identity, board members) on positive gains
  if(amount>0){
    const lb=typeof getLeadershipBonus==='function'?getLeadershipBonus():null;
    const repBonus=lb?.publicReputationBonus||0;
    if(repBonus>0)amount=Math.max(amount,Math.round(amount*(1+repBonus)));
  }
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
      if(window.playSound)window.playSound('money_gained');
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
  if(window.playSound&&(type==='warn'||type==='danger'))window.playSound(type==='danger'?'emergency_event':'warning');
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
  const eligible=staff.filter(s=>s.hired&&s.state!=='out_sick'&&s.state!=='on_vacation'&&(s.issueImmunityDays??0)<=0&&!(s.traits||[]).some(t=>t.sickDayImmune));
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
  addLog('Patient surge! Intake is overwhelmed. Add a Waiting Room near the entrance, hire a Triage Nurse, or build a second GP Office to clear the backlog.','w');
  showToast('Patient surge — add waiting capacity','warn');
  triggerGameShake('tiny');
  awardCrisisXp(2);
  updateUI();
}
function triggerEmergency(){
  eventStats.emergencies++;
  const erRoom=rooms.find(r=>r.type==='er'&&roomHasVerticalAccess(r)&&isConn(r)&&roomHasRequiredStaff(r))||rooms.find(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r));
  spawnEmergencyPatient();
  stress=clamp(stress+2,0,100);
  if(erRoom)focusEventRoom(erRoom,true);
  addLog('Emergency case incoming! Make sure your ER is staffed and connected — patients will divert to Waiting if no ER is open.','w');
  showToast('Emergency incoming — staff the ER','warn');
  triggerGameShake('emergency');
  awardCrisisXp(3);
  updateUI();
}
function triggerEquipmentFailure(){
  const room=randomOperationalRoom(['gp','er','xray','lab','pharmacy','ward','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','surgery']);
  if(!room)return;
  disableRoom(room,5000);
  stress=clamp(stress+4,0,100);
  // Replacement-parts/supply cost — Manufacturing identity reduces this via supplyCostMult
  const supplyMult=(typeof getTechBonus==='function'?(getTechBonus().supplyCostMult||1):1)*(campusSupplyCostMult||1);
  const repairCost=Math.round(900*supplyMult);
  changeMoney(-repairCost);
  focusEventRoom(room,true,5000);
  addLog(`Equipment failure in ${RDEFS[room.type].name}. The room is offline for a few seconds and replacement parts cost $${repairCost.toLocaleString()}. Upgrade the Operations department or research IT reliability to reduce these.`,'b');
  showToast(`${RDEFS[room.type].name} offline — repairs underway`,'warn');
  awardCrisisXp(2);
  updateUI();
}
// Hand a small XP burst to every active on-shift employee when a crisis event fires.
// This is the "experienced through fire" loop: emergencies, surges, and equipment
// failures all teach staff something. Routed through the unified XP engine.
function awardCrisisXp(amount=2){
  if(typeof awardStaffXp!=='function')return;
  const shift=typeof currentShift==='function'?currentShift():null;
  staff.forEach(s=>{
    if(!s.hired)return;
    if(shift&&s.shift!==shift)return;
    if(s.state==='off_duty'||s.state==='on_break')return;
    awardStaffXp(s,amount,'crisis');
  });
}
function triggerPatientComplaint(){
  eventStats.complaints++;
  const lobbyRoom=rooms.find(r=>r.type==='waiting_room'&&roomHasVerticalAccess(r)&&isConn(r))||null;
  const repLoss=getChaosRepLoss(4,currentShift());
  reputation=clamp(reputation-repLoss,0,100);
  stress=clamp(stress+3,0,100);
  if(lobbyRoom)focusEventRoom(lobbyRoom,true);
  addLog('Patient complaint filed. Reputation and morale took a hit — shorten waiting times, raise cleanliness, or add staff on the busy shift to reduce repeats.','b');
  showToast('Complaint filed — reduce wait times','warn');
  updateUI();
}
function triggerStaffBurnout(){
  const activeShift=currentShift();
  const member=staff.find(s=>isStaffAvailable(s,activeShift))||randomHiredStaff();
  if(!member)return;
  eventStats.staffIncidents++;
  // Veteran staff weather burnout events better — softens the energy/morale hit.
  const burnoutImpact=typeof negImpact==='function'?negImpact(member):1;
  member.energy=clamp((member.energy??100)-Math.round(28*burnoutImpact),0,100);
  member.morale=clamp((member.morale??100)-Math.round(12*burnoutImpact),0,100);
  if(member.energy<25&&member.state!=='on_break')member.state='on_break';
  addLog(`${member.name} is burning out after the workload spike. Energy and morale dropped — give staff break rooms, hire on the busy shift, or use the Delegation panel to share workload.`,'w');
  showToast(`${member.name} burning out — add breaks or staff`,'warn');
  // Even an incident teaches the wider crew something — small XP burst to peers on shift.
  awardCrisisXp(1);
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
function triggerAiEfficiencySurge(){
  let rpGain=18+Math.floor(Math.random()*12);
  rpGain=Math.max(1,Math.round(rpGain*(getMapBonus().researchMultiplier||1)));
  const cashGain=2000+Math.floor(Math.random()*1500);
  researchPoints+=rpGain;
  changeMoney(cashGain);
  stress=clamp(stress-6,0,100);
  const itRoom=rooms.find(r=>r.type==='it_department'&&isConn(r))||null;
  if(itRoom)focusEventRoom(itRoom,true,3000);
  addLog('AI efficiency surge: +'+rpGain+' RP and +$'+cashGain.toLocaleString()+' from optimised hospital operations.','g');
  showToast('AI efficiency surge','good');
  updateUI();
}
function triggerSupplyChainWindfall(mode){
  if(mode==='sell'){
    const cash=5000+Math.floor(Math.random()*2500);
    changeMoney(cash);
    addLog('Supply surplus sold: +$'+cash.toLocaleString()+' from in-house production overflow.','g');
    showToast('Supply surplus sold','good');
  }else{
    const cash=2500+Math.floor(Math.random()*1000);
    changeMoney(cash);
    cleanliness=clamp(cleanliness+10,0,100);
    reputation=clamp(reputation+3,0,100);
    addLog('Supply surplus reinvested in sterile reserves. Cleanliness and reputation improved.','g');
    showToast('Sterile reserves stocked','good');
  }
  updateUI();
}

function triggerResearchBreakthrough(rpAmount){
  rpAmount=rpAmount||(40+Math.floor(Math.random()*30));
  rpAmount=Math.max(1,Math.round(rpAmount*(getMapBonus().researchMultiplier||1)));
  researchPoints+=rpAmount;
  reputation=clamp(reputation+5,0,100);
  const itRoom=rooms.find(r=>r.type==='it_department'&&isConn(r))||null;
  if(itRoom)focusEventRoom(itRoom,true,3200);
  addLog('Research breakthrough! +'+rpAmount+' RP and reputation boost from a major clinical discovery.','g');
  showToast('Research breakthrough!','good');
  updateUI();
}

function triggerCommunityGrant(amount){
  amount=amount||(4000+Math.floor(Math.random()*2000));
  changeMoney(amount);
  // Route through adjustReputation so Community identity publicReputationBonus applies.
  adjustReputation(4,'Community hospital recognition','g');
  const lobby=rooms.find(r=>r.type==='waiting_room'&&isConn(r))||null;
  if(lobby)focusEventRoom(lobby,true,3200);
  addLog('Community hospital recognition: +$'+amount.toLocaleString()+' government grant received.','g');
  showToast('Community grant received','good');
  updateUI();
}

function triggerItOutage(){
  const itRoom=rooms.find(r=>r.type==='it_department'&&isConn(r))||null;
  const _itMult=getLeadershipBonus().itOutagePenaltyMult||1;
  stress=clamp(stress+Math.round(10*_itMult),0,100);
  researchPoints=Math.max(0,researchPoints-Math.round(5*_itMult));
  const downMs=Math.round(6000*_itMult);
  if(itRoom){disableRoom(itRoom,downMs);focusEventRoom(itRoom,true,4200);}
  addLog('IT systems outage! Research and digital operations disrupted. Build an IT Department, hire an IT Specialist, and upgrade the IT department to shorten future outages.','b');
  showToast('IT outage — staff the IT Department','warn');
  triggerGameShake('tiny');
  updateUI();
}
function triggerSterileFailure(){
  const sterileRoom=randomOperationalRoom(['ward','surgery','single_hospital_room','double_hospital_room','general_icu','cardiac_icu','lab'])||rooms.find(r=>isConn(r))||null;
  const _sterileMult=getLeadershipBonus().sterileFailurePenaltyMult||1;
  const repLoss=getChaosRepLoss(8,currentShift());
  reputation=clamp(reputation-Math.round(repLoss*_sterileMult),0,100);
  cleanliness=clamp(cleanliness-Math.round(18*_sterileMult),0,100);
  stress=clamp(stress+Math.round(12*_sterileMult),0,100);
  if(sterileRoom)focusEventRoom(sterileRoom,true,4200);
  addLog('Sterile processing failure! Contamination risk triggered a ward lockdown. Hire more janitors, upgrade Operations, or build a Sterile Processing room to prevent this.','b');
  showToast('Sterile failure — raise cleanliness','warn');
  triggerGameShake('tiny');
  updateUI();
}
function triggerTrainingMistake(){
  const trainee=staff.find(s=>s.hired&&(s.role==='resident'||s.role==='intern'));
  const name=trainee?trainee.name:'A junior doctor';
  const traineeXp=getFloorSpecializationBonus().traineeXpBonus||0;
  const repLoss=getChaosRepLoss(5,currentShift())*Math.max(0.5,1-traineeXp);
  const stressGain=Math.round(8*Math.max(0.5,1-traineeXp));
  reputation=clamp(reputation-repLoss,0,100);
  stress=clamp(stress+stressGain,0,100);
  const suffix=traineeXp>0?' Research-floor mentoring softened the impact.':'';
  addLog(name+' made a procedural error during training. Patient care disrupted. Pair trainees with senior staff or specialize a floor for Research/Training to soften these.'+suffix,'b');
  showToast(`${name} — training mistake`,'warn');
  updateUI();
}
function triggerBlackout(){
  eventStats.crises=(eventStats.crises||0)+1;
  const hasBackup=hasOperationalRoom('hvac_generator');
  const hasDigitalBackup=researchedTech.has('digital_backup_system');
  const hasItRoom=countOperationalRooms('it_department')>0;
  const hasItStaff=staff.some(s=>s.role==='it_specialist'&&isStaffAvailable(s));
  const opsReady=getDepartmentLevel('operations')>=3;
  const score=(hasBackup?1:0)+(hasDigitalBackup?1:0)+(hasItRoom?1:0)+(hasItStaff?1:0)+(opsReady?1:0);
  const focusRoom=rooms.find(r=>r.type==='hvac_generator'&&isConn(r))
    ||rooms.find(r=>r.type==='it_department'&&isConn(r))
    ||randomOperationalRoom(['surgery','general_icu','cardiac_icu','lab']);
  if(focusRoom)focusEventRoom(focusRoom,true,4500);
  if(score>=3){
    adjustReputation(2,'Blackout — backup systems held','g');
    reduceStress(3);
    addLog('Blackout: backup power and digital failovers held. Surgery and ICU stayed online.','g');
    setEventOutcome('blackout','Backup power and digital failovers held — Surgery and ICU stayed online (+2 reputation, stress relieved).');
    showToast('Blackout — systems held','good');
  }else{
    const targets=['surgery','general_icu','cardiac_icu','lab','it_department'];
    const candidates=rooms.filter(r=>targets.includes(r.type)&&isConn(r));
    const picks=candidates.sort(()=>Math.random()-0.5).slice(0,Math.min(3,candidates.length));
    picks.forEach(r=>disableRoom(r,7000));
    stress=clamp(stress+8,0,100);
    adjustReputation(-4,'Blackout disrupted critical care','b');
    addLog('Blackout: critical rooms went dark. Surgery, ICU, and digital systems stalled.','b');
    setEventOutcome('blackout',`Backup was thin — ${picks.length} critical room${picks.length===1?'':'s'} went offline, stress and reputation slipped (−4 reputation, +8 stress).`);
    showToast('Blackout','warn');
    triggerGameShake('tiny');
  }
  updateUI();
}
function triggerCarPileup(){
  eventStats.emergencies=(eventStats.emergencies||0)+1;
  const hasER=hasOperationalRoom('er');
  const hasBay=hasOperationalRoom('ambulance_bay');
  const hasDispatch=hasOperationalRoom('dispatch_office');
  const hasSurgery=hasOperationalRoom('surgery');
  const hasInpatient=['ward','med_surg','single_hospital_room','double_hospital_room','general_icu','cardiac_icu'].some(t=>hasOperationalRoom(t));
  const hasBlood=hasOperationalRoom('blood_bank');
  const coreReady=hasER&&hasBay&&hasDispatch&&hasSurgery&&hasInpatient;
  const score=(coreReady?5:((hasER?1:0)+(hasBay?1:0)+(hasDispatch?1:0)+(hasSurgery?1:0)+(hasInpatient?1:0)))+(hasBlood?1:0);
  const erRoom=rooms.find(r=>r.type==='er'&&isConn(r))
    ||rooms.find(r=>r.type==='ambulance_bay'&&isConn(r))
    ||rooms.find(r=>r.type==='waiting_room'&&isConn(r));
  if(typeof spawnEmergencyPatient==='function'){
    for(let i=0;i<4;i++)spawnEmergencyPatient();
  }
  if(erRoom)focusEventRoom(erRoom,true,5000);
  if(coreReady){
    adjustReputation(5,'Car pileup handled cleanly','g');
    addLog('Car pileup: ER, dispatch, and surgery teams absorbed the surge. Crisis handled.','g');
    setEventOutcome('car_pileup','ER, dispatch, and surgery teams absorbed the surge — reputation rose (+5 reputation).');
    showToast('Pileup handled','good');
    triggerGameShake('emergency');
  }else{
    if(typeof spawnPatient==='function'){
      for(let i=0;i<3;i++)spawnPatient();
    }
    stress=clamp(stress+10,0,100);
    adjustReputation(-6,'Car pileup overwhelmed response','b');
    addLog('Car pileup: response was patchy. Patients piled up in the lobby and waits spiked.','b');
    setEventOutcome('car_pileup','Lobby overflowed and waits spiked — reputation took a hit (−6 reputation, +10 stress).');
    showToast('Pileup overwhelmed — staff your ER','warn');
    triggerGameShake('emergency');
  }
  updateUI();
}
function triggerPublicCareReview(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{};
  const lead=typeof getLeadershipBonus==='function'?getLeadershipBonus():{};
  const govPressure=lead.govCompliancePressure||0;
  const govReqBonus=lead.govRequirementBonus||0;
  const required=clamp((typeof govRequired!=='undefined'?govRequired:0.35)+Math.max(0,govPressure)+govReqBonus,0,0.9);
  const rate=totalPatients>0?govTreated/totalPatients:1;
  const adminReady=getDepartmentLevel('admin')>=3;
  const hasGovLiaison=(typeof boardMembers!=='undefined'&&boardMembers||[]).some(m=>m.id==='government_liaison');
  const isPublicMissionCEO=(typeof currentCEO!=='undefined'&&currentCEO)?currentCEO.id==='public_mission':false;
  const hasComplianceTech=researchedTech.has('government_compliance')||researchedTech.has('compliance_tracking')||researchedTech.has('audit_shield');
  const meetsQuota=totalPatients===0?true:rate>=required;
  const score=(meetsQuota?2:0)+(adminReady?1:0)+(hasGovLiaison?1:0)+(isPublicMissionCEO?1:0)+(hasComplianceTech?1:0);
  const adminRoom=rooms.find(r=>r.type==='administration'&&isConn(r))
    ||rooms.find(r=>r.type==='head_office'&&isConn(r))
    ||rooms.find(r=>r.type==='waiting_room'&&isConn(r));
  if(adminRoom)focusEventRoom(adminRoom,true,4000);
  if(score>=3){
    const grant=3500+Math.floor(Math.random()*1500);
    changeMoney(grant);
    adjustReputation(4,'Public Care Review passed','g');
    addLog(`Public Care Review: officials commended your public-care record. +$${grant.toLocaleString()} grant approved.`,'g');
    setEventOutcome('public_care_review',`Officials commended the public-care record — +$${grant.toLocaleString()} grant approved (+4 reputation).`);
    showToast('Public Care Review passed','good');
  }else{
    const penaltyMult=(techBonus.governmentPenaltyMult||1)*(lead.govPenaltyMult||1);
    const penalty=Math.max(800,Math.round(2400*penaltyMult));
    changeMoney(-penalty);
    const repHit=Math.max(2,Math.round(5*penaltyMult));
    adjustReputation(-repHit,'Public Care Review penalty','b');
    addLog(`Public Care Review: regulators flagged compliance gaps. −$${penalty.toLocaleString()} fine and reputation hit.`,'b');
    setEventOutcome('public_care_review',`Regulators flagged compliance gaps — −$${penalty.toLocaleString()} fine and reputation hit (−${repHit} reputation).`);
    showToast('Public Care Review failed — raise public-care ratio','warn');
  }
  updateUI();
}
function triggerNurseBurnoutWave(){
  eventStats.staffIncidents=(eventStats.staffIncidents||0)+1;
  const hasStaffRoom=hasOperationalRoom('staff_room')||hasBuiltRoom('staff_room');
  const hasLunchRoom=hasOperationalRoom('lunch_room')||hasBuiltRoom('lunch_room');
  const hasHr=staff.some(s=>s.role==='hr_manager'&&isStaffAvailable(s));
  const hasChargeNurse=staff.some(s=>s.role==='charge_nurse'&&isStaffAvailable(s));
  const opsReady=getDepartmentLevel('operations')>=3;
  const fatigueResearch=researchedTech.has('fatigue_management')||researchedTech.has('burnout_prevention')||researchedTech.has('hr_workflow_system');
  const score=(hasStaffRoom?1:0)+(hasLunchRoom?1:0)+(hasHr?1:0)+(hasChargeNurse?1:0)+(opsReady?1:0)+(fatigueResearch?1:0);
  const nurses=staff.filter(s=>(s.role==='nurse'||s.role==='cna')&&isStaffAvailable(s));
  if(score>=3){
    nurses.forEach(n=>{
      n.morale=clamp((n.morale??100)+6,0,100);
      n.energy=clamp((n.energy??100)+4,0,100);
    });
    reduceStress(4);
    addLog('Nurse burnout wave: HR and break spaces caught it early. Morale recovered without losses.','g');
    setEventOutcome('nurse_burnout_wave','HR and break spaces caught it early — nurse morale recovered (+morale, +energy, stress relieved).');
    showToast('Burnout wave absorbed','good');
  }else{
    const sorted=nurses.slice().sort((a,b)=>(a.energy??100)-(b.energy??100));
    const tiredNurse=sorted[0]||null;
    nurses.forEach(n=>{
      n.morale=clamp((n.morale??100)-10,0,100);
      n.energy=clamp((n.energy??100)-15,0,100);
      if((n.energy??100)<25&&n.state!=='on_break')n.state='on_break';
    });
    stress=clamp(stress+10,0,100);
    const nurseRoom=rooms.find(r=>['ward','med_surg','single_hospital_room','double_hospital_room'].includes(r.type)&&isConn(r));
    if(nurseRoom){disableRoom(nurseRoom,6000);focusEventRoom(nurseRoom,true,5000);}
    if(tiredNurse&&Math.random()<0.4){
      tiredNurse.quitRiskDays=(tiredNurse.quitRiskDays||0)+2;
      addLog(`Nurse burnout wave: ${tiredNurse.name} is at quit-risk after the workload spike. Ward speed dropped briefly.`,'b');
      setEventOutcome('nurse_burnout_wave',`${tiredNurse.name} is at quit-risk and ward speed dropped briefly (−morale, −energy, +10 stress).`);
    }else{
      addLog('Nurse burnout wave: nurse morale collapsed and ward speed dropped briefly.','b');
      setEventOutcome('nurse_burnout_wave','Nurse morale collapsed and ward speed dropped briefly (−morale, −energy, +10 stress).');
    }
    showToast('Nurses burning out — add break rooms','warn');
  }
  updateUI();
}
function triggerMedicationShortage(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{supplyShortageChanceMult:1,supplyCostMult:1};
  const supplyCostMult=(techBonus.supplyCostMult??1)*(campusSupplyCostMult||1);
  const supplyChanceMult=techBonus.supplyShortageChanceMult??1;
  const pharmCount=countOperationalRooms('pharmacy');
  const hasPharmacist=staff.some(s=>s.role==='pharmacist'&&isStaffAvailable(s));
  const hasContract=(typeof activeContract!=='undefined'&&!!activeContract)
    ||(typeof insuranceContracts!=='undefined'&&insuranceContracts&&insuranceContracts.length>0);
  const hasManufacturingPath=supplyChanceMult<1||supplyCostMult<1;
  const supplyResearch=researchedTech.has('central_supply_standards')
    ||researchedTech.has('inhouse_supply_production')
    ||researchedTech.has('preventive_maintenance');
  const score=(pharmCount>=2?2:pharmCount>=1?1:0)+(hasPharmacist?1:0)+(hasContract?1:0)+(hasManufacturingPath?1:0)+(supplyResearch?1:0);
  const pharm=rooms.find(r=>r.type==='pharmacy'&&isConn(r));
  if(pharm)focusEventRoom(pharm,true,5000);
  if(score>=3){
    const minorCost=Math.max(200,Math.round(800*supplyCostMult));
    changeMoney(-minorCost);
    addLog(`Medication shortage: alternate suppliers covered the gap. Minor cost of $${minorCost.toLocaleString()} only.`,'g');
    setEventOutcome('medication_shortage',`Alternate suppliers covered the gap — only −$${minorCost.toLocaleString()} minor cost.`);
    showToast('Shortage averted','good');
  }else{
    if(pharm)disableRoom(pharm,7000);
    const cost=Math.max(900,Math.round(2200*supplyCostMult));
    changeMoney(-cost);
    stress=clamp(stress+6,0,100);
    adjustReputation(-3,'Medication shortage delays','b');
    addLog(`Medication shortage: pharmacy stalled and emergency supplies cost $${cost.toLocaleString()}. Patients delayed.`,'b');
    setEventOutcome('medication_shortage',`Pharmacy stalled and emergency supplies cost $${cost.toLocaleString()} — patients delayed (−3 reputation, +6 stress).`);
    showToast('Pharmacy stalled — hire a Pharmacist','warn');
  }
  updateUI();
}

function triggerServerOutage(){
  eventStats.crises=(eventStats.crises||0)+1;
  const hasDigitalBackup=researchedTech.has('digital_backup_system');
  const itCount=countOperationalRooms('it_department');
  const hasItStaff=staff.some(s=>s.role==='it_specialist'&&isStaffAvailable(s));
  const hasComplianceResearch=researchedTech.has('audit_shield')||researchedTech.has('compliance_tracking');
  const score=(itCount>=2?2:itCount>=1?1:0)+(hasDigitalBackup?1:0)+(hasItStaff?1:0)+(hasComplianceResearch?1:0);
  const focusRoom=rooms.find(r=>r.type==='it_department'&&isConn(r))
    ||randomOperationalRoom(['head_office','administration']);
  if(focusRoom)focusEventRoom(focusRoom,true,4500);
  if(score>=3){
    reduceStress(2);
    addLog('Server outage: backups and IT failover restored services within minutes. No data lost.','g');
    setEventOutcome('server_outage','Backups and IT failover restored services within minutes — no data lost (stress eased).');
    showToast('Servers restored','good');
  }else{
    const targets=['it_department','administration','head_office'];
    const candidates=rooms.filter(r=>targets.includes(r.type)&&isConn(r));
    const picks=candidates.sort(()=>Math.random()-0.5).slice(0,Math.min(2,candidates.length));
    picks.forEach(r=>disableRoom(r,6500));
    const rpHit=Math.min(researchPoints,4+Math.floor(Math.random()*4));
    if(rpHit>0)researchPoints=Math.max(0,researchPoints-rpHit);
    stress=clamp(stress+7,0,100);
    adjustReputation(-3,'Server outage disrupted services','b');
    addLog(`Server outage: digital filing, tablets, and automation went down. ${rpHit>0?'−'+rpHit+' RP from corrupted research notes.':''}`,'b');
    setEventOutcome('server_outage',`Digital filing, tablets, and automation went down — ${picks.length} room${picks.length===1?'':'s'} stalled${rpHit>0?', −'+rpHit+' RP':''} (−3 reputation, +7 stress).`);
    showToast('Servers down — staff the IT Department','warn');
    triggerGameShake('tiny');
  }
  updateUI();
}
function triggerCommunityProtest(){
  eventStats.crises=(eventStats.crises||0)+1;
  const lead=typeof getLeadershipBonus==='function'?getLeadershipBonus():{};
  const required=clamp((typeof govRequired!=='undefined'?govRequired:0.35)+Math.max(0,lead.govCompliancePressure||0),0,0.9);
  const rate=totalPatients>0?govTreated/totalPatients:1;
  const meetsQuota=totalPatients===0?true:rate>=required;
  const guardCount=getHiredRoleCount('security_officer',currentShift());
  const hasOutreachResearch=researchedTech.has('government_compliance')||researchedTech.has('compliance_tracking');
  const hasGovLiaison=(typeof boardMembers!=='undefined'&&boardMembers||[]).some(m=>m.id==='government_liaison');
  const isPublicMissionCEO=(typeof currentCEO!=='undefined'&&currentCEO)?currentCEO.id==='public_mission':false;
  const score=(meetsQuota?2:0)+(guardCount>=2?2:guardCount>=1?1:0)+(hasOutreachResearch?1:0)+(hasGovLiaison?1:0)+(isPublicMissionCEO?1:0);
  const lobby=rooms.find(r=>r.type==='waiting_room'&&isConn(r))
    ||rooms.find(r=>r.type==='er_entrance'&&isConn(r))
    ||rooms.find(r=>isConn(r));
  if(lobby)focusEventRoom(lobby,true,4500);
  if(score>=4){
    adjustReputation(3,'Community protest defused','g');
    addLog('Community protest: outreach and security defused the crowd. Coverage was actually positive.','g');
    setEventOutcome('community_protest','Outreach and security defused the crowd — coverage was positive (+3 reputation).');
    showToast('Protest defused','good');
  }else{
    const repHit=score>=2?4:8;
    stress=clamp(stress+6,0,100);
    adjustReputation(-repHit,'Community protest backlash','b');
    addLog(`Community protest: backlash spread on local news. Reputation took a ${repHit}-point hit and stress rose.`,'b');
    setEventOutcome('community_protest',`Backlash spread on local news — reputation took a ${repHit}-point hit and stress rose (−${repHit} reputation, +6 stress).`);
    showToast('Protest — meet the public-care quota','warn');
  }
  updateUI();
}
function triggerMayorVisit(){
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{};
  const lead=typeof getLeadershipBonus==='function'?getLeadershipBonus():{};
  const required=clamp((typeof govRequired!=='undefined'?govRequired:0.35)+Math.max(0,lead.govCompliancePressure||0),0,0.9);
  const rate=totalPatients>0?govTreated/totalPatients:1;
  const meetsQuota=totalPatients===0?true:rate>=required;
  const goodRep=reputation>=70;
  const lowStress=stress<=45;
  const cleanOk=cleanliness>=70;
  const adminReady=getDepartmentLevel('admin')>=3||getDepartmentLevel('operations')>=3;
  const hasCEO=(typeof currentCEO!=='undefined'&&currentCEO)?true:false;
  const score=(goodRep?2:0)+(lowStress?1:0)+(cleanOk?1:0)+(meetsQuota?1:0)+(adminReady?1:0)+(hasCEO?1:0);
  const adminRoom=rooms.find(r=>r.type==='head_office'&&isConn(r))
    ||rooms.find(r=>r.type==='administration'&&isConn(r))
    ||rooms.find(r=>r.type==='waiting_room'&&isConn(r));
  if(adminRoom)focusEventRoom(adminRoom,true,4500);
  if(score>=5){
    const grant=4500+Math.floor(Math.random()*2500);
    changeMoney(grant);
    adjustReputation(6,'Mayor visit — glowing review','g');
    addLog(`Mayor visit: glowing review on the local news. +$${grant.toLocaleString()} discretionary funding approved.`,'g');
    setEventOutcome('mayor_visit',`Glowing review on the local news — +$${grant.toLocaleString()} discretionary funding (+6 reputation).`);
    showToast('Mayor impressed','good');
  }else if(score>=3){
    const grant=1500+Math.floor(Math.random()*1000);
    changeMoney(grant);
    adjustReputation(2,'Mayor visit — polite nod','g');
    addLog(`Mayor visit: a polite nod and a small $${grant.toLocaleString()} grant.`,'g');
    setEventOutcome('mayor_visit',`A polite nod and a small +$${grant.toLocaleString()} grant (+2 reputation).`);
    showToast('Mayor visit','info');
  }else{
    const repHit=4+Math.floor(Math.random()*3);
    adjustReputation(-repHit,'Mayor visit — bad press','b');
    stress=clamp(stress+4,0,100);
    addLog(`Mayor visit: bad press after the tour. Reputation slipped ${repHit} points.`,'b');
    setEventOutcome('mayor_visit',`Bad press after the tour — reputation slipped ${repHit} points (−${repHit} reputation, +4 stress).`);
    showToast('Mayor unimpressed — raise reputation','warn');
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
  stressChange-=getLeadershipBonus().stressReductionBonus||0;
  stressChange+=getFloorSpecializationBonus().stressBaselineAdd||0;
  stressChange-=getOperationsDepartmentStressRelief();
  const guards=getHiredRoleCount('security_officer',shift);
  stressChange-=guards*3;
  stressChange-=getJanitorTraitStressRelief(shift);
  stressChange-=getBathroomStressRelief(shift);
  stressChange-=getHvacStressRelief(shift);
  stressChange-=Math.ceil(getItStressReduction(shift)/4);
  if(cleanliness>=85&&waiting===0&&coverage.nurseShort===0&&coverage.cnaShort===0)stressChange-=2;
  // Emergency-floor stress-growth penalty only applies while at least one
  // emergency_critical floor has a staffed clinical room this shift.
  let emergencyGrowthMult=1;
  const emergencySpec=FLOOR_SPECIALIZATIONS.emergency_critical;
  const emergencyDraw=emergencySpec?.drawbacks?.stressGrowthMult||0;
  if(emergencyDraw){
    const emergencyFloors=new Set();
    for(let f=1;f<=MAX_FLOORS;f++){if(getFloorSpecializationKey(f)==='emergency_critical')emergencyFloors.add(f);}
    if(emergencyFloors.size>0){
      const staffedEmergencyFloors=new Set();
      rooms.forEach(rm=>{
        if(staffedEmergencyFloors.size>=emergencyFloors.size)return;
        const fl=getRoomFloor(rm);
        if(!emergencyFloors.has(fl))return;
        const def=RDEFS[rm.type];
        if(!def||!def.staffRole)return;
        if(!isClinicalRoomType(rm.type))return;
        if(roomHasRequiredStaff(rm,shift))staffedEmergencyFloors.add(fl);
      });
      if(staffedEmergencyFloors.size>0)emergencyGrowthMult=Math.pow(emergencyDraw,_floorSpecScale(staffedEmergencyFloors.size));
    }
  }
  const stressMult=(isSandboxMode?1:getDifficulty().stressGrowthMult)*emergencyGrowthMult;
  stress=clamp(stress+stressChange*stressMult,0,100);
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
function getStableHint(){
  if(!hasStarted||paused)return'Press Play to start treating patients.';
  if(!rooms.some(r=>r.type==='gp'&&!r.tutorialDemo))return'Build a GP Office to begin treating patients.';
  if(!staff.some(s=>s.hired&&s.role==='janitor'))return'No janitor on staff — cleanliness will fall over time.';
  if(money<20000)return'Cash is low — consider applying for a grant to stabilize finances.';
  if(reputation<60&&reputation>=45)return'Reputation below 60 — reduce wait times and meet the government quota to build trust.';
  if(totalPatients>0&&govTreated/Math.max(totalPatients,1)<govRequired-0.03)return'Government quota is slipping — prioritize public patients over private ones.';
  if(stress<20&&reputation>=70)return'Running well — research or department upgrades can improve efficiency further.';
  return'Keep monitoring wait times, cleanliness, staff morale, and the government quota.';
}

function updateContextHint(){
  if(typeof tutorialActive!=='undefined'&&tutorialActive&&!tutorialCompleted)return;
  const hint=document.getElementById('hint');
  if(!hint)return;
  if(!hasStarted){hint.textContent='Press Play to start the simulation.';return;}
  if(paused){hint.textContent='Paused — press Play to resume.';return;}
  if(stress>=88){hint.textContent='Critical stress — add a Staff Room or Janitor Closet and hire a Janitor immediately.';return;}
  if(reputation<30){hint.textContent='Reputation critical — clear the queue, reduce stress, and meet the government quota.';return;}
  if(debtDays>=7){hint.textContent='Debt mounting — apply for a grant or accept a contract to bring in revenue.';return;}
  if(cleanliness<40){hint.textContent='Dangerously dirty — hire a Janitor and add a Janitor Closet near busy rooms.';return;}
  const waitN=waitingPatientsCount();
  if(waitN>effectiveWaitingCapacity()*1.5){hint.textContent='Waiting overflow — build a second Waiting Room or hire more treatment staff.';return;}
  if(stress>=70){hint.textContent='Stress rising — add a Staff Room, hire a Janitor, or reduce insurance contracts.';return;}
  if(cleanliness<55){hint.textContent='Cleanliness dropping — hire a Janitor to prevent a health risk.';return;}
  if(totalPatients>0&&govTreated/Math.max(totalPatients,1)<govRequired-0.05){hint.textContent='Government quota behind — prioritize public patients and review active contracts.';return;}
  if(!staff.some(s=>s.hired&&s.role==='janitor')){hint.textContent='Tip: No janitor on staff — cleanliness will fall without one.';return;}
  if(money<15000){hint.textContent='Cash low — apply for a grant or review your contract offers.';return;}
  hint.textContent=getStableHint();
}

function renderWarningDeck(){
  const wrap=document.getElementById('warningdeck');
  if(!wrap)return;
  const waitingCount=waitingPatientsCount();
  const warnings=[];
  if(stress>=70)warnings.push({title:'Hospital Stress',copy:`Stress is at ${Math.round(stress)}. Burnout, incidents, and reputation loss are rising.`,fix:stress>=88?'Add a Staff Room and hire a Janitor immediately. Reduce insurance contracts if needed.':'Add a Staff Room, hire a Janitor, or reduce active insurance contracts.',kind:stress>=88?'danger':'warning',chip:renderStatusChip('High Stress','high-stress'),value:`${Math.round(stress)} / 100`});
  if(debtDays>=3)warnings.push({title:'Debt Watch',copy:`The hospital has been in debt for ${debtDays} day${debtDays===1?'':'s'}.`,fix:debtDays>=7?'Apply for a grant, review staff salaries, or accept an insurance contract for more revenue.':'Apply for a grant or accept a contract to bring in more income.',kind:debtDays>=7?'danger':'warning',chip:renderStatusChip(`${debtDays} Debt Days`,debtDays>=7?'danger':'warning'),value:`${debtDays} days`});
  if(waitingCount>effectiveWaitingCapacity())warnings.push({title:'Waiting Overflow',copy:getWaitingStatus(waitingCount),fix:'Add a second Waiting Room, or hire more treatment staff to clear the queue faster.',kind:'warning',chip:renderStatusChip('Queue Pressure','warning'),value:`${waitingCount} waiting`});
  if(cleanliness<55)warnings.push({title:'Cleanliness Risk',copy:getCleanlinessStatus(),fix:cleanliness<40?'Hire a Janitor immediately and add a Janitor Closet near your busiest rooms.':'Hire a Janitor or add a Janitor Closet to the clinic.',kind:cleanliness<40?'danger':'warning',chip:renderStatusChip(cleanliness<40?'Dangerously Dirty':'Needs Attention',cleanliness<40?'danger':'warning'),value:`${Math.round(cleanliness)}% clean`});
  if(reputation<45)warnings.push({title:'Reputation Pressure',copy:getReputationStatus(),fix:'Reduce wait times, clear the queue, and meet your government quota to recover trust.',kind:reputation<25?'danger':'warning',chip:renderStatusChip(reputation<25?'Critical Trust':'Warning',reputation<25?'danger':'warning'),value:`Rep ${Math.round(reputation)}`});
  if(hasStarted&&totalPatients>0&&govTreated/Math.max(totalPatients,1)<govRequired-0.05)warnings.push({title:'Government Quota Risk',copy:`Public care rate is ${Math.round(govTreated/Math.max(totalPatients,1)*100)}% — required ${Math.round(govRequired*100)}%. Missing the quota at review triggers a reputation and funding penalty.`,fix:'Prioritize public patients. Avoid accepting new private contracts until the quota recovers.',kind:govTreated/Math.max(totalPatients,1)<govRequired-0.15?'danger':'warning',chip:renderStatusChip('Quota Behind','warning'),value:`${Math.round(govTreated/Math.max(totalPatients,1)*100)}% / ${Math.round(govRequired*100)}% needed`});
  wrap.innerHTML=!warnings.length
    ?`<div class="warning-card stable">
        <div class="warning-head"><div class="warning-title">Hospital Status</div>${renderStatusChip('Stable','stable')}</div>
        <div class="warning-value">All systems normal</div>
        <div class="warning-copy">${getStableHint()}</div>
      </div>`
    :warnings.map(item=>`<div class="warning-card ${item.kind}">
        <div class="warning-head"><div class="warning-title">${item.title}</div>${item.chip}</div>
        <div class="warning-value">${item.value||''}</div>
        <div class="warning-copy">${item.copy}</div>
        ${item.fix?`<div class="warning-fix">→ Fix: ${item.fix}</div>`:''}
      </div>`).join('');
  updateContextHint();
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
  updateGovernmentContract();
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
  updateDifficultyBadge();
  updateExecutiveBadge();
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
  const _rdebtwarn=document.getElementById('rdebtwarn');
  if(_rdebtwarn){const _ldd=getDifficulty().loseDebtDays;_rdebtwarn.textContent=`${_ldd} day${_ldd===1?'':'s'} in debt triggers closure`;}
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
  updateLauncherBadges();
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
  if(currentCEO){
    currentCEO.daysInRole=(currentCEO.daysInRole||0)+1;
    const adapted=currentCEO.daysInRole>=currentCEO.adaptationDays;
    if(adapted){
      if(ceoLegacyCooldown<=0){
        triggerCeoLegacyEvent();
      } else {
        ceoLegacyCooldown--;
      }
    }
  }
  const _ldRp=getLeadershipBonus().dailyResearchPoints||0;
  if(_ldRp>0){
    const _mapResMult=getMapBonus().researchMultiplier||1;
    researchPoints+=Math.max(0,Math.round(_ldRp*_mapResMult));
  }
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
  const teamGlueBonus=Math.min(2,staff.filter(s=>s.hired&&s.shift===activeShift&&(s.traits||[]).some(t=>t.teamGlue)).length);
  const teamMoraleAura=Math.min(2,staff.filter(s=>s.hired&&s.shift===activeShift&&s.active!==false&&(s.traits||[]).some(t=>t.teamMoraleBonus)).length);
  const janitorPower=janitors.filter(j=>j.shift===activeShift).reduce((sum,j)=>sum+(j.energy>=40?1:0.6),0);
  const sterileBonus=hasFeature('sterile_workflow')?1.2:0;
  const janitorClosetBonus=getJanitorClosetBonus(activeShift);
  const hvacCleanlinessBonus=getHvacCleanlinessBonus(activeShift);
  const janitorTraitCleanBonus=getJanitorTraitCleanBonus(activeShift);
  const _cleanDecay=(1.6+workload*0.22)*(isSandboxMode?1:getDifficulty().cleanDecayMult)*getLeadershipBonus().cleanDecayMult;
  cleanliness=clamp(cleanliness-_cleanDecay+(janitorPower*3.8)+janitorTraitCleanBonus+sterileBonus+janitorClosetBonus+hvacCleanlinessBonus+getOperationsDepartmentCleanBonus()+(directorTrait?.cleanlinessBonus||0)-(coverage.nurseShort*0.7)-(coverage.cnaShort*0.4)-(waitOverflow*0.45),0,100);
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
    const burnoutDrag=(s.negativeTrait?.id==='burnout_risk'||s.personalityTrait?.id==='burnout_risk')?1.5*negImpact(s):0;
    const traitEnergyDrag=(s.traits||[]).reduce((sum,t)=>sum+(t.extraEnergyDrain||0),0);
    const grantWriterBurnoutDrag=s.role==='grant_writer'&&getGrantWriterTrait(s)?.id==='burnout_prone'&&getActiveGrantOffers().length>1?2:0;
    const ambitiousDrag=s.personalityTrait?.id==='ambitious'&&working?1:0;
    const stressDrag=stressLevel*0.02;
    const _fatigueMult=isSandboxMode?1:getDifficulty().fatigueMult;
    const energyDrain=(6+strain*2.2+burnoutDrag+traitEnergyDrag+grantWriterBurnoutDrag+ambitiousDrag+stressDrag)*(techBonus.energyDrainMult||1)*_fatigueMult;
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
    if((s.negativeTrait?.burnoutRisk||s.personalityTrait?.burnoutRisk)&&stressLevel>=55)moraleDelta-=2*negImpact(s);
    if(!working&&s.energy>=75)moraleDelta+=2;
    else if(!working&&s.energy>=55)moraleDelta+=1;
    if(cleanliness>=82&&stressLevel<35)moraleDelta+=1;
    if((s.role==='nurse'||s.role==='cna')&&nurseStationRooms>0)moraleDelta+=(!working?2:1)*Math.min(2,nurseStationRooms);
    if(staffRoomCount>0)moraleDelta+=(!working?2:1)*Math.min(2,staffRoomCount);
    if(['nurse','cna','charge_nurse'].includes(s.role)&&getActiveGrantOffers().some(offer=>offer.effect?.kind==='nurse_support'))moraleDelta+=1;
    moraleDelta+=getGrantNightMoraleBonus(activeShift);
    if(teamGlueBonus>0)moraleDelta+=teamGlueBonus;
    if(teamMoraleAura>0)moraleDelta+=teamMoraleAura;
    moraleDelta+=getLeadershipBonus().staffMoraleBonus||0;
    if(s.morale<100)(s.traits||[]).forEach(t=>{if(t.moraleRecoveryBonus)moraleDelta+=t.moraleRecoveryBonus;});
    if(moraleDelta<0)(s.traits||[]).forEach(t=>{if(t.fragileEgo)moraleDelta=Math.round(moraleDelta*(1+0.4*negImpact(s)));});
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
    }else if(s.energy<((s.traits||[]).some(t=>t.snackBandit)?(25+10*negImpact(s)):25)&&s.state!=='on_break'){
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
    // Unified XP: every active employee — interns included — earns a small slice of XP
    // per day they actually work. Interns additionally get patient-presence XP from
    // awardInternXp; both feed the same level engine.
    if(working&&typeof awardStaffXp==='function'){
      let base=s.role==='intern'?0.4:0.6;
      // Floor-specialization bonus — uses the floor where THIS employee actually works
      // (any room they are assigned to), not the player's currently-viewed floor.
      const assignedRoom=s.assignedRoom?rooms.find(r=>r.id===s.assignedRoom):null;
      if(assignedRoom){
        const workFloor=getRoomFloor(assignedRoom);
        const fs=(typeof getFloorSpecialization==='function')?getFloorSpecialization(workFloor):null;
        if(fs&&fs.id&&fs.id!=='unchosen'){
          const roleMatchesFloor=(
            (fs.id==='diagnostics'&&['gp_doc','er_doc','er_attending','dept_attending'].includes(s.role))||
            (fs.id==='surgery'&&s.role==='surgeon')||
            (fs.id==='inpatient'&&['nurse','cna'].includes(s.role))||
            (fs.id==='administration'&&['clerical','hr_manager','grant_writer'].includes(s.role))
          );
          if(roleMatchesFloor)base+=0.4;
        }
        // Training-room XP boost: staff assigned to teaching/simulation rooms learn faster.
        if(['simulation_training_center','lecture_hall','residency_office','teaching_intern_office','library_study_room'].includes(assignedRoom.type)){
          base*=1.5;
        }
      }
      // Crisis / emergency event days give a small additional XP burst.
      if(typeof getStressLevel==='function'&&getStressLevel()>=70)base+=0.3;
      awardStaffXp(s,base,'shift');
    }
    if(s.raiseCooldown>0)s.raiseCooldown--;
    if(s.quitRiskDays>0&&(s.issueImmunityDays??0)<=0){
      // Veteran loyalty: higher level → less likely to walk out (caps at -3% for Lv 5).
      const veteranLoyalty=Math.max(0,(1-negImpact(s))*0.04);
      const quitChance=clamp(0.05+Math.max(0,45-(s.morale??100))*0.006+(stressLevel>=70?0.05:0)-getGrantQuitRiskRelief()-(getTechBonus().quitRiskReduction||0)-veteranLoyalty,0.02,0.42);
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
  // Prisoner Treatment Wing — daily corrections income + security pressure
  const operationalPrisonerWings=rooms.filter(r=>r.type==='prisoner_wing'&&isConn(r)&&!isRoomTemporarilyDisabled(r));
  prisonerWingActive=operationalPrisonerWings.length>0;
  if(operationalPrisonerWings.length){
    let corrPay=0;
    let pressure=0;
    operationalPrisonerWings.forEach(rm=>{
      const sm=getFloorSpeedMultiplier(getRoomFloor(rm));
      const specBonus=getFloorSpecializationRoomSpeedMult(rm)<1?1.1:1;
      corrPay+=Math.round(800*sm*specBonus);
      pressure+=1.2*sm;
    });
    if(corrPay>0){
      changeMoney(corrPay);
      monthlyInc=(monthlyInc||0)+corrPay;
    }
    stress=clamp(stress+pressure,0,100);
    if(day%5===0&&corrPay>0)addLog(`Corrections contract paid $${corrPay.toLocaleString()} from Prisoner Treatment Wing.`,'g');
  }
  // Auditorium — periodic conference event every 30 days
  const operationalAuditoriums=rooms.filter(r=>r.type==='auditorium'&&isConn(r)&&!isRoomTemporarilyDisabled(r));
  if(operationalAuditoriums.length&&day>1&&day%30===0){
    let confPay=0;
    operationalAuditoriums.forEach(rm=>{
      const sm=getFloorSpeedMultiplier(getRoomFloor(rm));
      const specBonus=1+Math.max(0,(getFloorSpecializationRoomSpeedMult(rm)<1?0.1:0));
      confPay+=Math.round(5000*sm*specBonus);
    });
    changeMoney(confPay);
    monthlyInc=(monthlyInc||0)+confPay;
    reputation=clamp(reputation+2,0,100);
    auditoriumCrowdingDays=Math.max(auditoriumCrowdingDays||0,3);
    addLog(`Auditorium hosted a medical conference: +$${confPay.toLocaleString()}, +2 reputation (3-day crowding pulse).`,'g');
    if(typeof showToast==='function')showToast(`Conference hosted: +$${confPay.toLocaleString()}, +2 rep`,'good');
  }
  if((auditoriumCrowdingDays||0)>0){
    stress=clamp(stress+2.5,0,100);
    auditoriumCrowdingDays=Math.max(0,auditoriumCrowdingDays-1);
  }
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
  const _diff=DIFFICULTY_PRESETS[selectedDifficulty]||DIFFICULTY_PRESETS.standard;
  money=_diff.startCash;day=1;score=0;totalTreated=0;researchPoints=0;monthlyInc=0;incAccum=0;reputation=_diff.startRep;cleanliness=_diff.startCleanliness;stress=_diff.startStress;adReach=0;
  floorGrids=makeFloorGrids();
  floorSpecializations=makeFloorSpecializations();
  floorPanelHidden=true;
  floorPanelPosition=null;
  currentFloor=1;
  floorRenovations={};
  auditoriumCrowdingDays=0;
  prisonerWingActive=false;
  syncActiveGrid();
  rooms=[];patients=[];staff=[];logs=[];
  departments=makeDepartments();
  techTree=makeTechTree();
  selTool=null;buildRotation=0;gameTime=0;speed=1;paused=true;patId=0;staffId=0;zoom=1;zoomVisual=1;zoomTweenFrom=1;zoomTweenStart=null;selectedRoomId=null;
  hover={x:-1,y:-1};dragging=false;
  heatmapOn=false;
  eventStats={totalEvents:0,emergencies:0,staffIncidents:0,complaints:0};
  eventMemory={};
  specialtyServiceStats={cosmeticCases:0,studentVisits:0,spermDeposits:0,ivfCycles:0,ethicsReviews:0,complianceIncidents:0,cryoReliability:100,universityContractActive:false};
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
  currentCEO=null;boardMembers=[];ceoLegacyCooldown=0;
  grantOffers=[];
  contractOffer=null;activeContract=null;lastContractId=null;insuranceContracts=[];freeBuildCredits={gp:0};
  researchedTech=new Set();unlockedFeatures=new Set();activeResearch=null;unlockedIdentities=new Set();
  dispatchJobs=[];dispatchJobId=0;
  resetDailyStats();
  makeDailyGoal();
  tickAcc=0;last=null;
  if(typeof lastAutoSaveDay!=='undefined')lastAutoSaveDay=0;
  statsHistory=[];
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

function startGame(difficultyId,campusId){
  if(difficultyId)selectedDifficulty=difficultyId;
  if(campusId)selectedCampusId=campusId;
  applyCampus(selectedCampusId);
  resetGameState(false);
  applyHospitalName(hospitalName);
  saveStartingSetup();
  // Apply campus tweaks
  const _camp=getCampus(selectedCampusId);
  const _tw=_camp.startTweaks||{};
  if(_tw.cashMult)money=Math.round(money*_tw.cashMult);
  if(_tw.repBonus)reputation=Math.min(100,reputation+_tw.repBonus);
  if(_tw.researchBonus)researchPoints+=_tw.researchBonus;
  campusSupplyCostMult=(_tw.supplyMult&&_tw.supplyMult>0)?_tw.supplyMult:1;
  govRequired=(DIFFICULTY_PRESETS[selectedDifficulty]||DIFFICULTY_PRESETS.standard).govQuota;
  createStarterHospital();
  addLog(`Public-private care requirement active: ${Math.round(govRequired*100)}% of patients must be treated at low or no profit.`,'w');
  updateUI();
  maybePromptFloorSpecialization();
}
function applyHospitalName(name){
  const clean=(typeof sanitizeCustomCenterName==='function'?sanitizeCustomCenterName(name):((typeof name==='string'?name.trim():'').slice(0,60)||'Asherville Medical Center'));
  hospitalName=clean;
  try{customCenterName=clean;}catch{}
  try{
    document.title=clean+' — My Medical Center';
    const tag=document.getElementById('hospital-name-tag');
    if(tag)tag.textContent=clean;
    const input=document.getElementById('center-name-input');
    if(input)input.value=clean;
  }catch{}
}
function saveStartingSetup(){
  const data={
    difficulty:selectedDifficulty,
    campus:selectedCampusId,
    hospitalName:hospitalName,
    tutorialEnabled:!!tutorialEnabled,
    sandbox:!!isSandboxMode,
    startedAt:Date.now()
  };
  lastSetupData=data;
  try{localStorage.setItem(SETUP_STORAGE_KEY,JSON.stringify(data));}catch{}
}
function _escAttr(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);}
function openSetupFinalize(){
  const host=document.getElementById('newgame-finalize');
  if(!host){startGame(selectedDifficulty,selectedCampusId);return;}
  const camp=getCampus(selectedCampusId);
  const diff=DIFFICULTY_PRESETS[selectedDifficulty]||DIFFICULTY_PRESETS.standard;
  const tutorialDefault=(selectedDifficulty==='guided_clinic')?true:!!tutorialEnabled;
  tutorialEnabled=tutorialDefault;
  const nameVal=_escAttr(hospitalName||'Asherville Medical Center');
  host.innerHTML=`<div class="setup-final-inner">
    <div class="setup-final-steps">
      <span class="setup-step done">1 · Difficulty</span>
      <span class="setup-step done">2 · Map</span>
      <span class="setup-step active">3 · Name</span>
      <span class="setup-step active">4 · Tutorial</span>
    </div>
    <div class="setup-final-header">
      <div class="setup-final-title">Final touches</div>
      <div class="setup-final-sub">${diff.icon} ${_escAttr(diff.label)} · ${camp.icon||'🏥'} ${_escAttr(camp.shortName||camp.name||'')}</div>
    </div>
    <div class="setup-final-body">
      <label class="setup-field">
        <span class="setup-field-label">Hospital name</span>
        <input id="setup-hospital-name" class="setup-field-input" type="text" maxlength="60" value="${nameVal}" placeholder="Asherville Medical Center" autocomplete="off">
        <span class="setup-field-help">Shown in the browser tab and on saves. You can rename later.</span>
      </label>
      <label class="setup-field setup-field-toggle">
        <input id="setup-tutorial-toggle" type="checkbox" ${tutorialDefault?'checked':''}>
        <span class="setup-field-label">Play tutorial</span>
        <span class="setup-field-help">${selectedDifficulty==='guided_clinic'?'Recommended for Guided Clinic — walks you through your first hour.':'Optional. A short guided intro to the core systems.'}</span>
      </label>
    </div>
    <div class="setup-final-actions">
      <button class="setup-back-btn" type="button" onclick="closeSetupFinalize();openCampusSelect('newgame')">← Back to Map</button>
      <button class="setup-start-btn" type="button" onclick="confirmSetupFinalize()">Start Run →</button>
    </div>
  </div>`;
  host.classList.add('open');
  setTimeout(()=>{const i=document.getElementById('setup-hospital-name');if(i){i.focus();i.select();}},50);
}
function closeSetupFinalize(){
  const host=document.getElementById('newgame-finalize');
  if(host){host.classList.remove('open');host.innerHTML='';}
}
function confirmSetupFinalize(){
  const i=document.getElementById('setup-hospital-name');
  const t=document.getElementById('setup-tutorial-toggle');
  const name=(i&&i.value?i.value:'').trim()||'Asherville Medical Center';
  hospitalName=name.slice(0,60);
  tutorialEnabled=!!(t&&t.checked);
  if(typeof window!=='undefined'&&typeof window.requestTutorial==='function')window.requestTutorial(tutorialEnabled);
  closeSetupFinalize();
  startGame(selectedDifficulty,selectedCampusId);
}
if(typeof window!=='undefined'){
  window.openSetupFinalize=openSetupFinalize;
  window.closeSetupFinalize=closeSetupFinalize;
  window.confirmSetupFinalize=confirmSetupFinalize;
  window.applyHospitalName=applyHospitalName;
  window.getStartingSetup=function(){return lastSetupData;};
}
function maybePromptFloorSpecialization(){
  if(typeof getFloorSpecializationKey!=='function')return;
  if(currentFloor===1)return;
  if(!isFloorUnlocked(currentFloor))return;
  if(getFloorSpecializationKey(currentFloor)!=='unchosen')return;
  if(document.getElementById('floorspecmodal')?.classList.contains('open'))return;
  setTimeout(()=>openFloorSpecModal(currentFloor),200);
}
function openDifficultySelect(){
  const picker=document.getElementById('difficulty-picker');
  if(!picker)return;
  const presets=Object.values(DIFFICULTY_PRESETS);
  const cur=DIFFICULTY_PRESETS[selectedDifficulty]||DIFFICULTY_PRESETS.standard;
  let cards='';
  presets.forEach(p=>{
    const sel=selectedDifficulty===p.id;
    cards+=`<button class="diff-card${sel?' diff-card-selected':''}" data-tt-difficulty="${p.id}" style="--diff-color:${p.color}" onclick="selectedDifficulty='${p.id}';openDifficultySelect()">
      <div class="diff-card-top"><span class="diff-card-icon">${p.icon}</span><span class="diff-card-label">${p.label}</span>${sel?`<span class="diff-card-check" style="background:${p.color}">✓</span>`:''}</div>
      <div class="diff-card-desc">${p.desc}</div>
      <div class="diff-card-stats">
        <span title="Starting cash">💰 $${(p.startCash/1000).toFixed(0)}k start</span>
        <span title="Starting reputation">⭐ ${p.startRep} rep</span>
        <span title="Government public care quota">📋 ${Math.round(p.govQuota*100)}% quota</span>
        <span title="Days in debt allowed before loss">⚖️ ${p.loseDebtDays}d debt limit</span>
      </div>
    </button>`;
  });
  picker.innerHTML=`<div class="diff-picker-inner">
    <div class="setup-final-steps" style="margin-bottom:14px;">
      <span class="setup-step active">1 · Difficulty</span>
      <span class="setup-step">2 · Map</span>
      <span class="setup-step">3 · Name</span>
      <span class="setup-step">4 · Tutorial</span>
    </div>
    <div class="diff-picker-header">
      <div class="diff-picker-title">Choose Difficulty</div>
      <div class="diff-picker-sub">Sets your starting resources and how much pressure the hospital faces. Cannot be changed mid-run.</div>
    </div>
    <div class="diff-picker-cards">${cards}</div>
    <div class="diff-picker-actions">
      <button class="diff-confirm-btn" onclick="closeDifficultySelect();openCampusSelect('newgame')">Continue → Choose Campus</button>
      <button class="diff-back-btn" onclick="closeDifficultySelect()">← Back to Menu</button>
    </div>
    <div class="diff-sandbox-note">Want to build freely without any pressure? <button class="diff-sandbox-link" onclick="closeDifficultySelect();openCampusSelect('sandbox')">🧪 Use Sandbox Mode instead</button></div>
  </div>`;
  picker.classList.add('open');
}
function closeDifficultySelect(){
  const picker=document.getElementById('difficulty-picker');
  if(picker)picker.classList.remove('open');
}
let _campusPickerOpen=false;
function openCampusSelect(mode){
  mode=mode||'newgame';
  const picker=document.getElementById('campus-picker');
  if(!picker)return;
  if(!_campusPickerOpen){
    if(mode==='sandbox')selectedCampusId='greenfield_valley';
    else if(!getCampus(selectedCampusId))selectedCampusId='regional_medical_center';
  }
  _campusPickerOpen=true;
  const list=Object.values(CAMPUSES);
  const cur=getCampus(selectedCampusId);
  const cards=list.map(c=>{
    const sel=selectedCampusId===c.id;
    const unlocked=isMapUnlocked(c.id,mode);
    const traitsHtml=(c.traits||[]).map(t=>`<span title="${t}">${t}</span>`).join('');
    const bonusesHtml=(c.bonuses||[]).slice(0,2).map(b=>`<li>${b}</li>`).join('');
    const drawbacksHtml=(c.drawbacks||[]).slice(0,2).map(b=>`<li>${b}</li>`).join('');
    const playstyle=c.playstyle?`<div class="campus-card-playstyle"><b>Playstyle:</b> ${c.playstyle}</div>`:'';
    const _mm=c.mapModifiers||{};
    const _fmtMult=(v,inv)=>{
      if(v==null||v===1)return null;
      const pct=Math.round((v-1)*100);
      const sign=pct>0?'+':'';
      const cls=(inv?pct<0:pct>0)?'mm-up':'mm-down';
      return {cls,text:`${sign}${pct}%`};
    };
    const mmRows=[
      ['Patients',_fmtMult(_mm.patientVolumeMultiplier,false)],
      ['Build cost',_fmtMult(_mm.constructionCostMultiplier,true)],
      ['Expansion cost',_fmtMult(_mm.expansionCostMultiplier,true)],
      ['Renovation cost',_fmtMult(_mm.renovationCostMultiplier,true)],
      ['Gov pressure',_fmtMult(_mm.governmentPressureMultiplier,true)],
      ['Public-care demand',_fmtMult(_mm.publicCareDemandMultiplier,false)],
      ['Insurance income',_fmtMult(_mm.insuranceOpportunityMultiplier,false)],
      ['Research',_fmtMult(_mm.researchMultiplier,false)],
      ['Parking pressure',_fmtMult(_mm.parkingPressureMultiplier,true)]
    ].filter(([,v])=>v).map(([label,v])=>`<span class="mm-chip ${v.cls}">${label} <b>${v.text}</b></span>`).join('');
    const ergaQual=_mm.emergencyAccessQuality?`<span class="mm-chip mm-info">ER access: <b>${_mm.emergencyAccessQuality}</b></span>`:'';
    const mmHtml=(mmRows||ergaQual)?`<div class="campus-card-mm"><b>Map effects</b><div class="mm-chips">${ergaQual}${mmRows}</div></div>`:'';
    const lockBadge=unlocked?'':`<div class="campus-card-lock">🔒 ${(c.unlock&&c.unlock.label)||'Locked'}</div>`;
    const onClick=unlocked?`selectedCampusId='${c.id}';openCampusSelect('${mode}')`:'';
    const diff=c.difficulty||{label:'—',rating:0};
    const diffR=Math.max(0,Math.min(5,Math.round((diff.rating||0)*2)/2));
    const fullStars=Math.floor(diffR);
    const halfStar=diffR-fullStars>=0.5?1:0;
    const emptyStars=5-fullStars-halfStar;
    const stars='★'.repeat(fullStars)+(halfStar?'⯨':'')+'☆'.repeat(emptyStars);
    const diffClass='diff-'+(diff.label||'').toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'');
    const themeLine=c.theme?`<div class="campus-card-theme">${c.theme}</div>`:'';
    return `<button class="campus-card${sel?' campus-card-selected':''}${unlocked?'':' campus-card-locked'}" data-tt-map="${c.id}" style="--campus-color:${c.color}"${unlocked?` onclick="${onClick}"`:' disabled'}>
      <div class="campus-card-img"><img src="${c.image}" alt="${c.name}" loading="lazy" onerror="this.style.display='none';this.parentNode.classList.add('campus-card-img-fallback')"></div>
      <div class="campus-card-body">
        <div class="campus-card-top"><span class="campus-card-icon">${c.icon}</span><span class="campus-card-label">${c.name}</span>${sel?`<span class="campus-card-check" style="background:${c.color}">✓</span>`:''}</div>
        ${themeLine}
        <div class="campus-card-difficulty ${diffClass}" title="Map difficulty: ${diff.label}"><span class="cc-diff-label">Difficulty</span><span class="cc-diff-stars">${stars}</span><span class="cc-diff-name">${diff.label}</span></div>
        <div class="campus-card-desc">${c.desc}</div>
        ${playstyle}
        ${bonusesHtml?`<div class="campus-card-pluses"><b>Bonuses</b><ul>${bonusesHtml}</ul></div>`:''}
        ${drawbacksHtml?`<div class="campus-card-minuses"><b>Drawbacks</b><ul>${drawbacksHtml}</ul></div>`:''}
        ${mmHtml}
        <div class="campus-card-traits">${traitsHtml}</div>
        <div class="campus-card-dim">${c.cols}×${c.rows} grid</div>
        ${lockBadge}
      </div>
    </button>`;
  }).join('');
  const startLabel=mode==='sandbox'
    ? `🧪 Start Sandbox — ${cur.icon} ${cur.shortName}`
    : `Start Run — ${cur.icon} ${cur.shortName}`;
  const startCall=mode==='sandbox'
    ? `closeCampusSelect();startSandboxMode('${cur.id}')`
    : `closeCampusSelect();openSetupFinalize()`;
  const backCall=mode==='sandbox'
    ? `closeCampusSelect()`
    : `closeCampusSelect();openDifficultySelect()`;
  picker.innerHTML=`<div class="campus-picker-inner">
    ${mode==='sandbox'?'':`<div class="setup-final-steps" style="margin-bottom:14px;">
      <span class="setup-step done">1 · Difficulty</span>
      <span class="setup-step active">2 · Map</span>
      <span class="setup-step">3 · Name</span>
      <span class="setup-step">4 · Tutorial</span>
    </div>`}
    <div class="campus-picker-header">
      <div class="campus-picker-title">${mode==='sandbox'?'Sandbox Campus':'Choose Your Campus'}</div>
      <div class="campus-picker-sub">Each campus has a different shape, surrounding terrain, and small starting tweaks. Cannot be changed mid-run.</div>
    </div>
    <div class="campus-picker-cards">${cards}</div>
    <div class="campus-picker-actions">
      <button class="campus-confirm-btn" onclick="${startCall}">${startLabel}</button>
      <button class="campus-back-btn" onclick="${backCall}">← Back</button>
    </div>
  </div>`;
  picker.classList.add('open');
}
function closeCampusSelect(){
  const picker=document.getElementById('campus-picker');
  if(picker)picker.classList.remove('open');
  _campusPickerOpen=false;
}
function updateCampusBadge(){
  const badge=document.getElementById('campus-badge');
  if(!badge)return;
  if(!hasStarted){badge.style.display='none';closeMapInfoMenu();return;}
  const c=getCampus(selectedCampusId);
  const sub=c.subtitle?` <span class="map-dropdown-sub">${c.subtitle}</span>`:'';
  badge.innerHTML=`<span class="map-dropdown-icon">${c.icon}</span><span class="map-dropdown-name">${c.name}</span>${sub}<span class="map-dropdown-caret">\u25BE</span>`;
  badge.style.color=c.color;
  badge.style.borderColor=c.color;
  badge.style.display='';
  badge.title=c.name+(c.subtitle?' — '+c.subtitle:'')+'\n'+c.desc+'\nClick for map details.';
  if(document.getElementById('map-info-menu')?.style.display==='block')renderMapInfoMenu();
}
function _mapEdgeLabel(edges){
  if(!Array.isArray(edges)||!edges.length)return 'unknown';
  return edges.map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(' / ');
}
function renderMapInfoMenu(){
  const menu=document.getElementById('map-info-menu');
  if(!menu)return;
  const c=getCampus(selectedCampusId);
  const ae=c.accessEdges||{};
  const pts=getMapEntrancePoints(c.id)||{};
  const traits=(c.traits||[]).map(t=>`<li>${t}</li>`).join('');
  const bonuses=(c.bonuses||[]).map(t=>`<li>${t}</li>`).join('');
  const drawbacks=(c.drawbacks||[]).map(t=>`<li>${t}</li>`).join('');
  const zones=(c.expansionZones||[]).map(t=>`<li>${t}</li>`).join('');
  const fmtPt=p=>p?`(col ${p.c}, row ${p.r})`:'—';
  const visitor=(c.parking&&c.parking.visitor)||c.parkingNotes||'No notes recorded.';
  const staffPark=(c.parking&&c.parking.staff)||'Shared with visitors.';
  const playstyle=c.playstyle?`<div class="map-info-playstyle"><b>Recommended playstyle:</b> ${c.playstyle}</div>`:'';
  const buildable=c.buildableStyle?`<div><b>Buildable terrain</b><span><span class="map-info-swatch" style="background:${c.buildableStyle.color}"></span>${c.buildableStyle.label}</span></div>`:'';
  menu.innerHTML=`<div class="map-info-card" style="--map-accent:${c.color}">
    <div class="map-info-head">
      <span class="map-info-icon">${c.icon}</span>
      <div class="map-info-titles">
        <div class="map-info-name">${c.name}</div>
        <div class="map-info-sub">${c.subtitle||c.theme||''}</div>
      </div>
    </div>
    <div class="map-info-desc">${c.desc||''}</div>
    ${playstyle}
    ${traits?`<ul class="map-info-traits">${traits}</ul>`:''}
    <div class="map-info-grid">
      <div><b>Size</b><span>${c.cols} × ${c.rows} tiles</span></div>
      <div><b>Theme</b><span>${c.theme||'—'}</span></div>
      <div><b>Difficulty</b><span>${(c.difficulty&&c.difficulty.label)||'—'}${c.difficulty?` (${'★'.repeat(Math.floor(c.difficulty.rating||0))}${(c.difficulty.rating||0)%1>=0.5?'⯨':''}${'☆'.repeat(5-Math.floor(c.difficulty.rating||0)-((c.difficulty.rating||0)%1>=0.5?1:0))})`:''}</span></div>
      ${buildable}
      <div><b>Main entrance</b><span>${_mapEdgeLabel(ae.front)} ${fmtPt(pts.public)}</span></div>
      <div><b>Emergency entrance</b><span>${_mapEdgeLabel(ae.ambulance)} ${fmtPt(pts.emergency)}</span></div>
      <div><b>Ambulance route</b><span>${c.ambulanceRoute||_mapEdgeLabel(ae.ambulance)+' approach'}</span></div>
      <div><b>Service / loading</b><span>${_mapEdgeLabel(ae.service)} ${fmtPt(pts.service)}</span></div>
      <div><b>Staff entrance</b><span>${_mapEdgeLabel(ae.staff)} ${fmtPt(pts.staff)}</span></div>
      <div><b>Visitor parking</b><span>${visitor}</span></div>
      <div><b>Staff parking</b><span>${staffPark}</span></div>
    </div>
    ${bonuses?`<div class="map-info-section map-info-bonuses"><b>Bonuses</b><ul>${bonuses}</ul></div>`:''}
    ${drawbacks?`<div class="map-info-section map-info-drawbacks"><b>Drawbacks</b><ul>${drawbacks}</ul></div>`:''}
    ${zones?`<div class="map-info-section"><b>Expansion zones</b><ul>${zones}</ul></div>`:''}
    ${(c.features&&c.features.length)?`<div class="map-info-section"><b>Map features</b><ul>${c.features.map(f=>`<li>${f}</li>`).join('')}</ul></div>`:''}
    ${c.recommendedFor?`<div class="map-info-section"><b>Recommended for</b><span style="font-size:11px;color:#243b5a;">${c.recommendedFor}</span></div>`:''}
    <div class="map-info-foot">Map cannot be changed mid-run. Start a new game to pick a different campus.</div>
  </div>`;
}
function toggleMapInfoMenu(ev){
  if(ev&&ev.stopPropagation)ev.stopPropagation();
  const menu=document.getElementById('map-info-menu');
  const badge=document.getElementById('campus-badge');
  if(!menu||!badge)return;
  if(menu.style.display==='block'){closeMapInfoMenu();return;}
  renderMapInfoMenu();
  menu.style.display='block';
  // Position the (now-fixed) menu just below the badge so it floats above
  // any HUD/sidebar that would otherwise clip it.
  const r=badge.getBoundingClientRect();
  menu.style.left='auto';
  menu.style.right=(window.innerWidth-r.right)+'px';
  menu.style.top=(r.bottom+8)+'px';
  badge.setAttribute('aria-expanded','true');
  setTimeout(()=>{document.addEventListener('click',_mapInfoOutsideClick,{once:true});},0);
}
function _mapInfoOutsideClick(e){
  const menu=document.getElementById('map-info-menu');
  const badge=document.getElementById('campus-badge');
  if(!menu)return;
  if(menu.contains(e.target)||(badge&&badge.contains(e.target))){
    document.addEventListener('click',_mapInfoOutsideClick,{once:true});
    return;
  }
  closeMapInfoMenu();
}
function closeMapInfoMenu(){
  const menu=document.getElementById('map-info-menu');
  const badge=document.getElementById('campus-badge');
  if(menu)menu.style.display='none';
  if(badge)badge.setAttribute('aria-expanded','false');
}
window.toggleMapInfoMenu=toggleMapInfoMenu;
window.closeMapInfoMenu=closeMapInfoMenu;
function updateExecutiveBadge(){
  const badge=document.getElementById('execlegacybadge');
  if(!badge)return;
  if(!currentCEO){badge.classList.add('hidden');return;}
  const adapted=currentCEO.daysInRole>=(currentCEO.adaptationDays||30);
  badge.classList.toggle('hidden',!adapted);
}
function updateDifficultyBadge(){updateCampusBadge();return _updateDifficultyBadgeInner();}
function _updateDifficultyBadgeInner(){
  const badge=document.getElementById('difficulty-badge');
  if(!badge)return;
  if(!hasStarted){badge.style.display='none';return;}
  if(isSandboxMode){badge.textContent='🧪 Sandbox';badge.className='difficulty-badge diff-badge-sandbox';badge.style.display='';}
  else{const d=getDifficulty();badge.textContent=d.icon+' '+d.label;badge.className='difficulty-badge diff-badge-'+d.id;badge.style.display='';}
}
function startSandboxMode(campusId){
  selectedCampusId=(campusId&&getCampus(campusId)&&CAMPUSES[getCampus(campusId).id])?getCampus(campusId).id:'greenfield_valley';
  applyCampus(selectedCampusId);
  resetGameState(false);
  // Reset campus runtime modifiers from the active campus to prevent leaks
  const _sct=(getCampus(selectedCampusId).startTweaks)||{};
  campusSupplyCostMult=(_sct.supplyMult&&_sct.supplyMult>0)?_sct.supplyMult:1;
  isSandboxMode=true;
  hasStarted=true;
  gameOver=false;
  paused=true;

  money=999999;
  researchPoints=9999;

  Object.keys(RDEFS).forEach(tool=>unlockedTools.add(tool));
  unlockedTools.add('luxury_path');
  Object.keys(ROLES).forEach(role=>unlockedRoles.add(role));
  RESEARCH_TREE.forEach(tech=>{
    researchedTech.add(tech.id);
    (tech.unlockTools||[]).forEach(t=>unlockedTools.add(t));
    (tech.unlockRoles||[]).forEach(r=>unlockedRoles.add(r));
    (tech.unlockFeatures||[]).forEach(f=>unlockedFeatures.add(f));
  });
  if(typeof evaluateIdentityUnlocks==='function')evaluateIdentityUnlocks();

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
  const _ld=getDifficulty();
  if(debtDays>=_ld.loseDebtDays)return endGame(`Budget crisis: the hospital stayed in debt for ${_ld.loseDebtDays} consecutive days and had to close.`);
  if(lowRepDays>=_ld.loseLowRepDays)return endGame(`Public trust collapsed after reputation stayed below 40 for ${_ld.loseLowRepDays} days.`);
  if(highStressDays>=_ld.loseHighStressDays)return endGame(`Hospital stress stayed above 90 for ${_ld.loseHighStressDays} consecutive days. Operations broke down and the run ended.`);
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
      statsHistory.push({d:day,money:Math.round(money),rep:Math.round(reputation),clean:Math.round(cleanliness),stress:Math.round(stress),treated:totalTreated,income:monthlyInc});
      if(statsHistory.length>90)statsHistory.shift();
      resetDailyStats();
      makeDailyGoal();
      progressResearch();
      tickFloorRenovations();
      updateDailyHospitalState();
      progressGrantProgramsDay();
      progressInsuranceContractDay();
      processSpecialtyServiceLineDaily();
      if(day%30===0){
        governmentReview();
        reviewHospitalGrade();
        const wages=wageBill();
        if(wages>0){changeMoney(-wages);addLog(`Monthly wages paid: -$${wages.toLocaleString()}`,'w');}
        const leaderPay=leadershipPayroll();
        if(leaderPay>0){changeMoney(-leaderPay);addLog(`Leadership payroll: -$${leaderPay.toLocaleString()} (CEO & Board).`,'w');}
        staffPool=staffPool.filter(s=>!s.hired&&getUnlockedShifts().includes(s.shift));
        ensureStaffPoolCoverage();
        addLog('New staff available in the hiring pool.','');
        resetBudgetLedger(day);
      }
      checkLoseConditions();
      updateUI();
      if(typeof autoSave==='function')autoSave();
    }
    if(gameTime%PATIENT_SPAWN_TICKS===0&&Math.random()<clamp((0.3+(reputation/140))*(getMapBonus().patientVolumeMultiplier||1),0.10,0.99))spawnPatient();
    if(gameTime%2===0)updatePatients();
    if(gameTime%INCOME_TICKS===0)flushIncome();
    if(gameTime%EVENT_TICKS===0){
      const _evd=isSandboxMode?null:getDifficulty();
      if(!_evd||Math.random()<_evd.eventFreqMult)randomEvent();
      if(_evd&&_evd.bonusEventChance>0&&Math.random()<_evd.bonusEventChance)randomEvent();
    }
  }
}

function setSpd(s){speed=s;paused=false;document.querySelectorAll('.sb').forEach((b,i)=>b.classList.toggle('on',[1,2,4][i]===s));document.getElementById('pbtn').textContent='⏸';}
function togglePause(){paused=!paused;document.getElementById('pbtn').textContent=paused?'▶':'⏸';if(window.playSound)window.playSound(paused?'game_paused':'game_resumed');}
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
  cv.style.width=`${Math.round(COLS*T*zoomVisual)}px`;
  cv.style.height=`${Math.round(ROWS*T*zoomVisual)}px`;
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
  cv.style.width=`${Math.round(COLS*T*zoomVisual)}px`;
  cv.style.height=`${Math.round(ROWS*T*zoomVisual)}px`;
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
      if(window.animPolish)window.animPolish.drawMovementShadow(ctx,p.vx,p.vy,0.8);
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
      if(window.animPolish)window.animPolish.drawMovementShadow(ctx,px,py,0.76);
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
    const x=76+((i*91)+(loop*24))%((COLS*T)-152);
    const y=74+((i*53)+Math.sin(base*2.2+i)*18)%((ROWS*T)-170);
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
  const laneY=(ROWS*T)-103;
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
    const x=128+p*((COLS*T)+90);
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
    {parkX:(COLS*T)-29,parkY:118,entryX:(COLS*T)+36,entryY:118,exitX:(COLS*T)+44,exitY:118,rotation:Math.PI/2,scale:0.84,offset:3400,cycle:29000,color:carColors[3]},
    {parkX:(COLS*T)-29,parkY:248,entryX:(COLS*T)+36,entryY:248,exitX:(COLS*T)+46,exitY:248,rotation:Math.PI/2,scale:0.84,offset:9100,cycle:31000,color:carColors[4]},
    {parkX:(COLS*T)-190,parkY:(ROWS*T)-129,entryX:(COLS*T)-190,entryY:(ROWS*T)+28,exitX:(COLS*T)-190,exitY:(ROWS*T)+34,rotation:0,scale:0.9,offset:1700,cycle:27000,color:carColors[5]},
    {parkX:(COLS*T)-122,parkY:(ROWS*T)-129,entryX:(COLS*T)-122,entryY:(ROWS*T)+28,exitX:(COLS*T)-122,exitY:(ROWS*T)+34,rotation:0,scale:0.9,offset:7900,cycle:34000,color:carColors[1]}
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
  ctx.fillRect(0,(ROWS*T)-120,(COLS*T),80);
}

function drawWorldBackground(ctx){
  ctx.fillStyle='#9fd39f';
  ctx.fillRect(0,0,(COLS*T),(ROWS*T));

  drawRoad();

  const roadY=(ROWS*T)-120;

  ctx.strokeStyle='#fff';
  ctx.lineWidth=3;
  ctx.setLineDash([20,20]);
  ctx.beginPath();
  ctx.moveTo(0,roadY+40);
  ctx.lineTo((COLS*T),roadY+40);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle='#aab3bd';
  ctx.fillRect(0,roadY+80,(COLS*T),120);
}
function drawCampusBackdrop(){
  drawWorldBackground(ctx);
}
function drawHospitalSiteBackdrop(floor=1){
  const w=(COLS*T);
  const h=(ROWS*T);

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
function drawHospitalZoneOverlay(){
  if(!hospitalStage||hospitalStage==='clinic')return;
  const stageIdx=STAGE_ORDER.indexOf(hospitalStage);
  const ZONES=[
    {label:'ER & Emergency',   c:18,r:0, w:9, h:8, minIdx:1,
     fill:'rgba(210,70,70,0.04)',   stroke:'rgba(200,70,70,0.18)',  text:'rgba(170,50,50,0.44)'},
    {label:'Diagnostics',      c:17,r:8, w:10,h:7, minIdx:1,
     fill:'rgba(50,110,200,0.04)',  stroke:'rgba(50,110,200,0.18)', text:'rgba(40,90,180,0.44)'},
    {label:'Inpatient',        c:7, r:8, w:10,h:7, minIdx:2,
     fill:'rgba(50,155,90,0.04)',   stroke:'rgba(50,155,90,0.18)',  text:'rgba(35,130,70,0.44)'},
    {label:'Admin & Support',  c:0, r:9, w:7, h:6, minIdx:2,
     fill:'rgba(120,70,200,0.04)',  stroke:'rgba(120,70,200,0.18)', text:'rgba(100,55,175,0.44)'}
  ];
  ctx.save();
  for(const z of ZONES){
    if(stageIdx<z.minIdx)continue;
    const x=z.c*T,y=z.r*T,w=z.w*T,h=z.h*T;
    ctx.fillStyle=z.fill;
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=z.stroke;
    ctx.lineWidth=1.2;
    ctx.setLineDash([7,5]);
    ctx.strokeRect(x+1,y+1,w-2,h-2);
    ctx.setLineDash([]);
    ctx.font='italic 10px Segoe UI,sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='top';
    ctx.fillStyle=z.text;
    ctx.fillText(z.label,x+w/2,y+5);
  }
  ctx.restore();
}

function drawCampusTerrain(){
  if(currentFloor!==1||!terrainMask)return;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=terrainMask[r]&&terrainMask[r][c];
    if(!k||k==='grass')continue;
    const x=c*T,y=r*T;
    let fill=null;
    if(k==='water'){fill='#7fc4d9';}
    else if(k==='road'){fill='#5d6770';}
    else if(k==='parking'){fill='#a9b3bd';}
    else if(k==='tree'){fill='#5e9e63';}
    else if(k==='cliff'){fill='#7a6650';}
    if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,T,T);}
    if(k==='road'){
      ctx.strokeStyle='rgba(255,255,255,.55)';
      ctx.lineWidth=2;ctx.setLineDash([6,6]);
      ctx.beginPath();ctx.moveTo(x,y+T/2);ctx.lineTo(x+T,y+T/2);ctx.stroke();
      ctx.setLineDash([]);
    }else if(k==='tree'){
      ctx.fillStyle='#3d7a45';ctx.beginPath();ctx.arc(x+T/2,y+T/2,T*0.36,0,Math.PI*2);ctx.fill();
    }else if(k==='parking'){
      ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;
      ctx.strokeRect(x+5,y+5,T-10,T-10);
    }else if(k==='water'){
      ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x+4,y+T*0.4);ctx.quadraticCurveTo(x+T/2,y+T*0.5,x+T-4,y+T*0.4);ctx.stroke();
    }
  }
}
function render(){
  ctx.clearRect(0,0,(COLS*T),(ROWS*T));
  drawHospitalSiteBackdrop(currentFloor);
  drawCampusTerrain();

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

  drawHospitalZoneOverlay();
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
    if(window.animPolish){window.animPolish.drawRoomPlaceFx(ctx,rm,rx,ry,rw,rh);window.animPolish.drawRoomActivityFx(ctx,rm,rx,ry,rw,rh);}
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
      const x=(i*97)%(COLS*T),y=(i*53)%(ROWS*T);
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

// ── CEO Legacy Events ────────────────────────────────────────────────────────
function triggerCeoLegacyEvent(){
  if(!currentCEO)return;
  const pool=CEO_LEGACY_EVENTS[currentCEO.id];
  if(!pool||!pool.length)return;
  const evt=pool[Math.floor(Math.random()*pool.length)];
  const ceoName=currentCEO.name;
  showEvent({
    icon:evt.icon,
    category:'opportunity',
    rarity:evt.rarity||'rare',
    title:evt.title,
    desc:`${evt.desc}\n\n— ${ceoName}, ${currentCEO.archetype} (Day ${currentCEO.daysInRole} in role)`,
    impactHtml:`<div style="color:#4ade80;font-weight:600;padding:4px 0;">${evt.impact}</div>`,
    choices:[
      {label:'Excellent',type:'primary',action(){evt.apply();showToast(evt.title,'good');updateUI();}},
    ]
  });
  ceoLegacyCooldown=CEO_LEGACY_COOLDOWN_MIN+Math.floor(Math.random()*(CEO_LEGACY_COOLDOWN_MAX-CEO_LEGACY_COOLDOWN_MIN+1));
}
// ── End CEO Legacy Events ────────────────────────────────────────────────────

// ── Executive Leadership Modal ──────────────────────────────────────────────
function openExecutiveModal(){
  const modal=document.getElementById('executivemodal');
  if(modal){modal.classList.add('open');renderExecutiveModal();}
}
function closeExecutiveModal(){
  const modal=document.getElementById('executivemodal');
  if(modal)modal.classList.remove('open');
}
function hireCEO(id){
  if(currentCEO){addLog('Dismiss current CEO first.','w');return;}
  const def=CEO_ARCHETYPES.find(c=>c.id===id);
  if(!def)return;
  if(!isSandboxMode&&money<def.salary){addLog('Not enough money to hire this CEO.','b');return;}
  currentCEO={...def,daysInRole:0};
  ceoLegacyCooldown=CEO_LEGACY_COOLDOWN_MIN+Math.floor(Math.random()*(CEO_LEGACY_COOLDOWN_MAX-CEO_LEGACY_COOLDOWN_MIN+1));
  addLog(`${def.name} (${def.archetype}) hired as CEO. Salary: $${def.salary.toLocaleString()}/month.`,'g');
  showToast(`${def.name} hired as CEO`,'good');
  renderExecutiveModal();updateUI();
}
function fireCEO(){
  if(!currentCEO)return;
  addLog(`${currentCEO.name} removed as CEO.`,'w');
  showToast('CEO removed','warn');
  currentCEO=null;
  renderExecutiveModal();updateUI();
}
function hireBoardMember(id){
  if(boardMembers.length>=MAX_BOARD_MEMBERS){addLog('Board is full (5/5 seats).','w');return;}
  if(boardMembers.some(m=>m.id===id)){addLog('That board member type is already seated.','w');return;}
  const def=BOARD_MEMBER_TYPES.find(m=>m.id===id);
  if(!def)return;
  boardMembers.push({...def});
  addLog(`${def.name} joined the Board of Directors. Salary: $${def.salary.toLocaleString()}/month.`,'g');
  showToast(`${def.name} joined the board`,'good');
  renderExecutiveModal();updateUI();
}
function fireBoardMember(id){
  const idx=boardMembers.findIndex(m=>m.id===id);
  if(idx<0)return;
  const m=boardMembers[idx];
  boardMembers.splice(idx,1);
  addLog(`${m.name} removed from the board.`,'w');
  showToast('Board member removed','warn');
  renderExecutiveModal();updateUI();
}
function _leadershipBonusLines(bonuses,isBonus){
  const lines=[];
  const f=(val,fmt)=>fmt;
  if(bonuses.govPenaltyMult!=null&&bonuses.govPenaltyMult!==1)lines.push(isBonus?`Gov penalties ${Math.round((1-bonuses.govPenaltyMult)*100)}% lower`:`Gov penalties ${Math.round((bonuses.govPenaltyMult-1)*100)}% higher`);
  if(bonuses.grantApprovalBonus)lines.push(`Grant approval ${isBonus?'+':''}${Math.round(bonuses.grantApprovalBonus*100)}%`);
  if(bonuses.privateRevenueMult!=null&&bonuses.privateRevenueMult!==1)lines.push(`Private revenue ${isBonus?'+':''}${Math.round((bonuses.privateRevenueMult-1)*100)}%`);
  if(bonuses.insuranceIncomeMult!=null&&bonuses.insuranceIncomeMult!==1)lines.push(`Insurance income ${isBonus?'+':''}${Math.round((bonuses.insuranceIncomeMult-1)*100)}%`);
  if(bonuses.patientTrafficBonus)lines.push(`Patient traffic +${Math.round(bonuses.patientTrafficBonus*100)}%`);
  if(bonuses.researchSpeedBonus)lines.push(`Research speed +${Math.round(bonuses.researchSpeedBonus*100)}%`);
  if(bonuses.dailyResearchPoints)lines.push(`+${bonuses.dailyResearchPoints} RP/day`);
  if(bonuses.roomCostMult!=null&&bonuses.roomCostMult!==1)lines.push(`Room costs ${isBonus?Math.round((1-bonuses.roomCostMult)*100)+'% lower':Math.round((bonuses.roomCostMult-1)*100)+'% higher'}`);
  if(bonuses.corridorCostMult!=null&&bonuses.corridorCostMult!==1)lines.push(`Corridor costs ${isBonus?Math.round((1-bonuses.corridorCostMult)*100)+'% lower':Math.round((bonuses.corridorCostMult-1)*100)+'% higher'}`);
  if(bonuses.stressReductionBonus)lines.push(`Stress relief +${bonuses.stressReductionBonus}/day`);
  if(bonuses.cleanDecayMult!=null&&bonuses.cleanDecayMult<1)lines.push(`Cleanliness decay ${Math.round((1-bonuses.cleanDecayMult)*100)}% slower`);
  if(bonuses.wageBillMult!=null&&bonuses.wageBillMult!==1)lines.push(`Wage bill ${isBonus?Math.round((1-bonuses.wageBillMult)*100)+'% lower':Math.round((bonuses.wageBillMult-1)*100)+'% higher'}`);
  if(bonuses.govCompliancePressure&&isBonus&&bonuses.govCompliancePressure<0)lines.push(`Gov compliance pressure reduced`);
  if(bonuses.govCompliancePressure&&!isBonus&&bonuses.govCompliancePressure>0)lines.push(`Gov compliance pressure increases`);
  if(bonuses.sterileFailurePenaltyMult&&bonuses.sterileFailurePenaltyMult>1)lines.push(`Sterile failure impact ${Math.round((bonuses.sterileFailurePenaltyMult-1)*100)}% worse`);
  if(bonuses.trainingMistakeChanceMult&&bonuses.trainingMistakeChanceMult>1)lines.push(`Training mistake impact ${Math.round((bonuses.trainingMistakeChanceMult-1)*100)}% worse`);
  if(bonuses.itOutagePenaltyMult&&bonuses.itOutagePenaltyMult>1)lines.push(`IT outage impact ${Math.round((bonuses.itOutagePenaltyMult-1)*100)}% worse`);
  if(bonuses.auditChanceMult&&bonuses.auditChanceMult>1)lines.push(`Audit frequency ${Math.round((bonuses.auditChanceMult-1)*100)}% higher`);
  if(bonuses.staffMoraleBonus&&bonuses.staffMoraleBonus<0)lines.push(`Staff morale ${bonuses.staffMoraleBonus}/day`);
  if(bonuses.waitingRoomCostMult&&bonuses.waitingRoomCostMult>1)lines.push(`Waiting rooms cost ${Math.round((bonuses.waitingRoomCostMult-1)*100)}% more`);
  if(bonuses.gpCostMult&&bonuses.gpCostMult>1)lines.push(`GP offices cost ${Math.round((bonuses.gpCostMult-1)*100)}% more`);
  return lines;
}
function renderExecutiveModal(){
  const panel=document.getElementById('executive-panel');
  if(!panel)return;
  const lb=getLeadershipBonus();
  const seatedIds=new Set(boardMembers.map(m=>m.id));

  let html='';

  // ── CEO Section ──
  html+=`<div class="exec-section-head">Chief Executive Officer</div>`;
  if(currentCEO){
    const ceo=currentCEO;
    const daysIn=ceo.daysInRole||0;
    const adaptPct=Math.min(1,daysIn/Math.max(1,ceo.adaptationDays));
    const negStrength=Math.max(0.25,1-(adaptPct*0.75));
    const negImpactPct=Math.round(negStrength*100);
    const adaptDaysLeft=Math.max(0,ceo.adaptationDays-daysIn);
    const fullyAdapted=daysIn>=ceo.adaptationDays;
    const barPct=Math.round(adaptPct*100);
    const adaptStatusLabel=fullyAdapted
      ? '★ Fully Adapted — Legacy Events Active'
      : `Day ${daysIn} / ${ceo.adaptationDays} — ${adaptDaysLeft} day${adaptDaysLeft===1?'':'s'} remaining`;
    const negImpactLabel=fullyAdapted
      ? `Negative Impact: 25% <span class="exec-neg-pct adapted">(minimum — stabilised)</span>`
      : `Negative Impact: ${negImpactPct}% <span class="exec-neg-pct">(reduces as CEO adapts)</span>`;
    html+=`<div class="exec-card exec-card-active">
      <div class="exec-card-head">
        <span class="exec-icon">${ceo.icon}</span>
        <div class="exec-card-title-wrap">
          <div class="exec-card-name">${ceo.name}</div>
          <div class="exec-card-archetype">${ceo.archetype}</div>
        </div>
        <div class="exec-salary">$${ceo.salary.toLocaleString()}<span class="exec-salary-unit">/mo</span></div>
      </div>
      <div class="exec-adapt-wrap">
        <div class="exec-adapt-label">${adaptStatusLabel}</div>
        <div class="exec-adapt-bar"><div class="exec-adapt-fill" style="width:${barPct}%"></div></div>
      </div>
      <div class="exec-bonus-row">
        <div class="exec-bonus-col">
          <div class="exec-pill-head">Bonuses (always active)</div>
          ${_leadershipBonusLines(ceo.bonuses,true).map(l=>`<div class="exec-pill good">${l}</div>`).join('')}
        </div>
        <div class="exec-bonus-col">
          <div class="exec-pill-head">${negImpactLabel}</div>
          <div class="exec-neg-label">${ceo.negativeTrait.label}</div>
          <div class="exec-neg-desc${fullyAdapted?' adapted':''}">${fullyAdapted?'Impact stabilised at 25% — long-term risk persists but is greatly reduced.':ceo.negativeTrait.desc}</div>
          ${!fullyAdapted?`<div class="exec-adapt-note">Long-term risk decreases as the CEO adapts to the hospital.</div>`:''}
        </div>
      </div>
      <button class="exec-fire-btn" onclick="fireCEO()">Remove CEO</button>
    </div>`;
  } else {
    html+=`<div class="exec-empty-note">No CEO hired — choose one below to unlock leadership bonuses.</div>`;
    html+=`<div class="exec-cards-grid">`;
    CEO_ARCHETYPES.forEach(ceo=>{
      const bonusLines=_leadershipBonusLines(ceo.bonuses,true);
      html+=`<div class="exec-card exec-card-available" onclick="hireCEO('${ceo.id}')">
        <div class="exec-card-head">
          <span class="exec-icon">${ceo.icon}</span>
          <div class="exec-card-title-wrap">
            <div class="exec-card-name">${ceo.name}</div>
            <div class="exec-card-archetype">${ceo.archetype}</div>
          </div>
          <div class="exec-salary">$${ceo.salary.toLocaleString()}<span class="exec-salary-unit">/mo</span></div>
        </div>
        <div class="exec-desc">${ceo.desc}</div>
        <div class="exec-bonus-row">
          <div class="exec-bonus-col">
            <div class="exec-pill-head">Bonuses</div>
            ${bonusLines.map(l=>`<div class="exec-pill good">${l}</div>`).join('')}
          </div>
          <div class="exec-bonus-col">
            <div class="exec-pill-head">Negative Trait</div>
            <div class="exec-neg-label">${ceo.negativeTrait.label}</div>
            <div class="exec-neg-desc">${ceo.negativeTrait.desc}</div>
            <div class="exec-adapt-note">Adapts over ${ceo.adaptationDays} days in role</div>
          </div>
        </div>
        <button class="exec-hire-btn" onclick="event.stopPropagation();hireCEO('${ceo.id}')">Hire — $${ceo.salary.toLocaleString()}/mo</button>
      </div>`;
    });
    html+=`</div>`;
  }

  // ── Board Section ──
  const seatsLabel=`Board Seats: ${boardMembers.length}/${MAX_BOARD_MEMBERS}`;
  html+=`<div class="exec-section-head" style="margin-top:18px">Board of Directors <span class="exec-board-count">${seatsLabel}</span></div>`;
  if(boardMembers.length===0){
    html+=`<div class="exec-empty-note">No board members appointed — choose up to ${MAX_BOARD_MEMBERS} below to shape your hospital's strategy.</div>`;
  } else {
    html+=`<div class="exec-board-active">`;
    boardMembers.forEach(m=>{
      const cat=m.category?`<span class="exec-board-cat">${m.category}</span>`:'';
      const bestFor=m.bestFor?`<div class="exec-board-bestfor"><strong>Best for:</strong> ${m.bestFor}</div>`:'';
      html+=`<div class="exec-board-card">
        <span class="exec-icon-sm">${m.icon}</span>
        <div class="exec-board-info">
          <div class="exec-board-name">${m.name} ${cat}</div>
          <div class="exec-board-bonus">+ ${m.bonusText||m.bonusDesc||''}</div>
          <div class="exec-board-drawback">− ${m.drawbackText||m.drawbackDesc||''}</div>
          ${bestFor}
        </div>
        <div class="exec-board-right">
          <div class="exec-salary-sm">$${m.salary.toLocaleString()}/mo</div>
          <button class="exec-fire-btn-sm" onclick="fireBoardMember('${m.id}')">Remove</button>
        </div>
      </div>`;
    });
    html+=`</div>`;
  }
  const available=BOARD_MEMBER_TYPES.filter(m=>!seatedIds.has(m.id));
  if(boardMembers.length>=MAX_BOARD_MEMBERS){
    html+=`<div class="exec-empty-note">All ${MAX_BOARD_MEMBERS} board seats are filled. Remove a member to appoint someone else.</div>`;
  } else if(available.length>0){
    html+=`<div class="exec-available-head">Available Board Members</div>`;
    html+=`<div class="exec-board-grid">`;
    available.forEach(m=>{
      const cat=m.category?`<span class="exec-board-cat">${m.category}</span>`:'';
      const bestFor=m.bestFor?`<div class="exec-board-bestfor"><strong>Best for:</strong> ${m.bestFor}</div>`:'';
      html+=`<div class="exec-board-avail">
        <div class="exec-board-avail-head">
          <span class="exec-icon-sm">${m.icon}</span>
          <div>
            <div class="exec-board-name">${m.name} ${cat}</div>
            <div class="exec-salary-sm">$${m.salary.toLocaleString()}/mo</div>
          </div>
        </div>
        <div class="exec-board-avail-desc">${m.description||m.desc||''}</div>
        <div class="exec-pill good" style="margin:4px 0 2px"><strong>Bonus:</strong> ${m.bonusText||m.bonusDesc||''}</div>
        <div class="exec-pill bad"><strong>Drawback:</strong> ${m.drawbackText||m.drawbackDesc||''}</div>
        ${bestFor}
        <button class="exec-hire-btn-sm" onclick="hireBoardMember('${m.id}')">Add to Board — $${m.salary.toLocaleString()}/mo</button>
      </div>`;
    });
    html+=`</div>`;
  }

  panel.innerHTML=html;
}
// ── End Executive Leadership Modal ──────────────────────────────────────────

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
