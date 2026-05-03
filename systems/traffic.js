// systems/traffic.js — Traffic & Parking System
// ----------------------------------------------
// Tracks visitor parking capacity, staff parking capacity, ambulance
// route quality, service/loading access, and overall congestion level.
// Surfaces a status card in the right panel when the situation is
// serious, and exposes getTrafficEffects() for other systems to read
// (patient arrival delays, reputation drag, emergency severity bump,
// supply delay risk).

// Capacity contributions per built room. The map's parkingNotes /
// emergencyAccessQuality already give a baseline; rooms add on top.
const _TRAFFIC_ROOM_CAPACITY={
  parking_expansion:{visitor:12},
  staff_parking:{staff:8},
  ambulance_bay:{ambulance:1},
  service_loading_dock:{service:1},
  traffic_management_office:{congestionRelief:1}
};

function _trafficMapBaseline(){
  const map=typeof getMapBonus==='function'?getMapBonus():{};
  // parkingPressureMultiplier (1.0=neutral, >1=tighter parking, <1=easier)
  // emergencyAccessQuality: 'congested'|'standard'|'good'|'excellent'
  const pressure=map.parkingPressureMultiplier||1;
  const accessQ=map.emergencyAccessQuality||'standard';
  // Base spaces granted by the campus itself (more pressure = fewer baseline).
  const baseVisitor=Math.round(20/Math.max(0.5,pressure));
  const baseStaff=Math.round(12/Math.max(0.5,pressure));
  const accessQuality={congested:0.55,standard:0.80,good:1.0,excellent:1.15}[accessQ]??0.80;
  const accessLabel={congested:'Congested',standard:'Standard',good:'Good',excellent:'Excellent'}[accessQ]||'Standard';
  return{baseVisitor,baseStaff,pressure,accessQuality,accessLabel};
}

// Snapshot of current traffic & parking state.
function getTrafficStatus(){
  const baseline=_trafficMapBaseline();
  const allRooms=(typeof rooms!=='undefined'?rooms:[]);
  let visitorAdded=0,staffAdded=0,ambulanceBays=0,serviceDocks=0,trafficOffices=0;
  allRooms.forEach(r=>{
    const cap=_TRAFFIC_ROOM_CAPACITY[r.type];
    if(!cap)return;
    if(cap.visitor)visitorAdded+=cap.visitor;
    if(cap.staff)staffAdded+=cap.staff;
    if(cap.ambulance)ambulanceBays++;
    if(cap.service)serviceDocks++;
    if(cap.congestionRelief)trafficOffices++;
  });
  const visitorCap=baseline.baseVisitor+visitorAdded;
  const staffCap=baseline.baseStaff+staffAdded;

  // Demand: scaled to current patient throughput and hired staff.
  const totalPatientsToday=typeof totalPatients!=='undefined'?totalPatients:0;
  const repFactor=typeof reputation!=='undefined'?Math.max(20,reputation):40;
  const visitorDemand=Math.round(((repFactor/4)+totalPatientsToday*0.05)*baseline.pressure);
  const hiredStaff=typeof staff!=='undefined'?staff.filter(s=>s.hired).length:0;
  const staffDemand=Math.round(hiredStaff*0.8*baseline.pressure);

  const visitorRatio=visitorCap?visitorDemand/visitorCap:0;
  const staffRatio=staffCap?staffDemand/staffCap:0;

  // Ambulance route quality: blends map baseline with built bays.
  const ambulanceQuality=Math.min(1.25,baseline.accessQuality+ambulanceBays*0.15);
  const ambulanceLabel=ambulanceQuality<0.6?'Blocked':ambulanceQuality<0.85?'Restricted':ambulanceQuality<1.05?'Good':'Excellent';

  // Service / loading access: 0 docks = poor, 1 = adequate, 2+ = strong.
  const serviceQuality=Math.min(1.2,0.5+serviceDocks*0.35);
  const serviceLabel=serviceDocks===0?'Limited':serviceDocks===1?'Adequate':'Strong';

  // Congestion: built up from parking saturation, base pressure, and
  // patient throughput; reduced by traffic management offices.
  let congestion=0;
  congestion+=Math.max(0,visitorRatio-0.6)*60;
  congestion+=Math.max(0,staffRatio-0.6)*40;
  congestion+=Math.max(0,(baseline.pressure-1))*40;
  congestion+=Math.max(0,(totalPatientsToday-50))*0.15;
  congestion-=trafficOffices*15;
  congestion=Math.max(0,Math.min(100,Math.round(congestion)));
  const congestionLabel=congestion>=70?'Severe':congestion>=45?'High':congestion>=25?'Moderate':'Light';

  return{
    visitor:{capacity:visitorCap,demand:visitorDemand,ratio:visitorRatio},
    staff:{capacity:staffCap,demand:staffDemand,ratio:staffRatio},
    ambulance:{quality:ambulanceQuality,label:ambulanceLabel,bays:ambulanceBays},
    service:{quality:serviceQuality,label:serviceLabel,docks:serviceDocks},
    congestion:{level:congestion,label:congestionLabel,offices:trafficOffices},
    baseline
  };
}

// Multipliers and risk values consumable by other systems.
function getTrafficEffects(){
  const s=getTrafficStatus();
  // Patient arrival delay: heavy congestion or bad parking shaves
  // arrival chance by up to 20%.
  let arrivalMult=1;
  arrivalMult-=Math.max(0,s.congestion.level-25)*0.0025; // up to -0.19
  arrivalMult-=Math.max(0,s.visitor.ratio-1)*0.10;       // overflow
  arrivalMult=Math.max(0.75,Math.min(1,arrivalMult));
  // Reputation drag from severe congestion or visitor parking shortage.
  let reputationDrag=0;
  if(s.visitor.ratio>=1.1) reputationDrag+=0.05;
  if(s.congestion.level>=70) reputationDrag+=0.05;
  // Emergency severity bump if ambulance route is poor.
  let emergencySeverityMult=1;
  if(s.ambulance.quality<0.6) emergencySeverityMult=1.5;
  else if(s.ambulance.quality<0.85) emergencySeverityMult=1.2;
  // Supply delay risk if service access is limited.
  const supplyDelayRisk=s.service.docks===0?0.35:s.service.docks===1?0.10:0;
  return{arrivalMult,reputationDrag,emergencySeverityMult,supplyDelayRisk,status:s};
}

function _trafficSeverity(s){
  if(s.congestion.level>=70||s.visitor.ratio>=1.25||s.ambulance.quality<0.6) return'high';
  if(s.congestion.level>=45||s.visitor.ratio>=1.0||s.staff.ratio>=1.0||s.service.docks===0) return'med';
  return'low';
}

function _trafficWarnings(s){
  // Structured, actionable warnings. Each entry follows the unified
  // shape: { id, title, severity, cause, consequence, fixes, action }.
  const out=[];
  if(s.congestion.level>=45){
    out.push({
      id:'tf_congestion',
      title:'High Congestion',
      severity:s.congestion.level>=70?'high':'med',
      cause:`Congestion level is ${s.congestion.level}% (${s.congestion.label}).`,
      consequence:'Patient arrivals are delayed and reputation may fall.',
      fixes:['Build a Traffic Management Office','Add a Parking Expansion','Avoid stacking marketing-heavy contracts'],
      action:{label:'Open Build',selector:'#dock-build'}
    });
  }
  if(s.visitor.ratio>=1.0){
    out.push({
      id:'tf_visitor_parking',
      title:'Visitor Parking Full',
      severity:s.visitor.ratio>=1.25?'high':'med',
      cause:`Visitor demand ${s.visitor.demand} exceeds ${s.visitor.capacity} spaces.`,
      consequence:'Reputation and patient satisfaction fall as visitors circle the lot.',
      fixes:['Build a Parking Expansion','Add another Parking Expansion if space allows'],
      action:{label:'Build Parking',selector:'[data-tool="parking_expansion"]'}
    });
  }
  if(s.staff.ratio>=1.0){
    out.push({
      id:'tf_staff_parking',
      title:'Staff Parking Full',
      severity:s.staff.ratio>=1.25?'high':'med',
      cause:`Staff demand ${s.staff.demand} exceeds ${s.staff.capacity} spaces.`,
      consequence:'Staff arrivals are delayed at shift change.',
      fixes:['Build Staff Parking','Reduce duplicate hires until parking expands'],
      action:{label:'Build Staff Parking',selector:'[data-tool="staff_parking"]'}
    });
  }
  if(s.ambulance.quality<0.6){
    out.push({
      id:'tf_ambulance_blocked',
      title:'Ambulance Route Blocked',
      severity:'high',
      cause:'No usable ambulance route to the ER.',
      consequence:'Emergency events hit ~1.5× harder and patients arrive in worse shape.',
      fixes:['Build an Ambulance Bay','Ensure Dispatch + ER are operational'],
      action:{label:'Build Ambulance Bay',selector:'[data-tool="ambulance_bay"]'}
    });
  }else if(s.ambulance.quality<0.85){
    out.push({
      id:'tf_ambulance_restricted',
      title:'Ambulance Route Restricted',
      severity:'med',
      cause:'Ambulance access quality is below normal.',
      consequence:'Emergency response is ~1.2× more severe than baseline.',
      fixes:['Build another Ambulance Bay','Consider a Dispatch Office upgrade'],
      action:{label:'Build Ambulance Bay',selector:'[data-tool="ambulance_bay"]'}
    });
  }
  if(s.service.docks===0){
    out.push({
      id:'tf_service_access',
      title:'No Service Access',
      severity:'med',
      cause:'No Service Loading Dock on the campus.',
      consequence:'Supply delay risk is elevated (~35%).',
      fixes:['Build a Service Loading Dock'],
      action:{label:'Build Service Dock',selector:'[data-tool="service_loading_dock"]'}
    });
  }
  if(s.baseline.pressure>=1.2&&s.congestion.offices===0){
    out.push({
      id:'tf_pressure_unmanaged',
      title:'Unmanaged Traffic Pressure',
      severity:'med',
      cause:`Map pressure is ×${s.baseline.pressure.toFixed(2)} but no Traffic Management Office is built.`,
      consequence:'Congestion will keep climbing as the hospital grows.',
      fixes:['Build a Traffic Management Office'],
      action:{label:'Build Traffic Office',selector:'[data-tool="traffic_management_office"]'}
    });
  }
  return out;
}

function _tfSevClass(sev){return sev==='high'?'tf-warn--high':'tf-warn--med';}

function _renderTrafficWarnings(warnings){
  if(!warnings||!warnings.length)return'';
  return`<ul class="tf-warn-list">${warnings.map(w=>`
    <li class="tf-warn ${_tfSevClass(w.severity)}">
      <div class="tf-warn-head"><span class="tf-warn-title">⚠ ${w.title}</span><span class="tf-warn-sev tf-severity--${w.severity}">${w.severity==='high'?'High':'Watch'}</span></div>
      <div class="tf-warn-line"><span class="tf-warn-lbl">Cause:</span> ${w.cause}</div>
      <div class="tf-warn-line"><span class="tf-warn-lbl">Consequence:</span> ${w.consequence}</div>
      ${w.fixes&&w.fixes.length?`<ul class="tf-warn-fixes">${w.fixes.map(f=>`<li>${f}</li>`).join('')}</ul>`:''}
      ${w.action?`<button type="button" class="tf-warn-action" onclick="bnTriggerAction&&bnTriggerAction('${w.action.selector}')">${w.action.label} →</button>`:''}
    </li>`).join('')}</ul>`;
}

let _trafficLastHash='';
function renderTrafficCard(){
  const card=document.getElementById('traffic-card');
  if(!card)return;
  const s=getTrafficStatus();
  const sev=_trafficSeverity(s);
  // Only show in the right panel when serious (medium or high).
  if(sev==='low'){
    if(_trafficLastHash!==''){card.hidden=true;card.innerHTML='';_trafficLastHash='';}
    return;
  }
  const warnings=_trafficWarnings(s);
  const hash=`${sev}|${s.congestion.level}|${Math.round(s.visitor.ratio*100)}|${s.ambulance.label}|${s.service.docks}|${warnings.map(w=>w.id).join(',')}`;
  if(hash===_trafficLastHash){card.hidden=false;return;}
  _trafficLastHash=hash;

  const sevLabel=sev==='high'?'Critical':'Watch';
  card.className=`traffic-card traffic-card--${sev}`;
  card.innerHTML=`
    <div class="tf-head">
      <span class="tf-kicker">🚦 Traffic & Parking</span>
      <span class="tf-severity tf-severity--${sev}">${sevLabel}</span>
    </div>
    <div class="tf-stats">
      <div class="tf-stat"><span class="tf-stat-l">Congestion</span><span class="tf-stat-v tf-bar"><span class="tf-bar-fill tf-bar--${sev}" style="width:${s.congestion.level}%"></span></span><span class="tf-stat-n">${s.congestion.label}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Visitor parking</span><span class="tf-stat-v">${s.visitor.demand} / ${s.visitor.capacity}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Staff parking</span><span class="tf-stat-v">${s.staff.demand} / ${s.staff.capacity}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Ambulance route</span><span class="tf-stat-v">${s.ambulance.label}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Service access</span><span class="tf-stat-v">${s.service.label}</span></div>
    </div>
    ${_renderTrafficWarnings(warnings)}
    <div class="tf-fixes">Build: Parking Expansion · Staff Parking · Ambulance Bay · Service Loading Dock · Traffic Management Office</div>
  `;
  card.hidden=false;
  if(window.animPolish)window.animPolish.polishWarningEnter(card);
}

// Render full status (used in the Reports view in the future). Returns
// HTML that callers can drop into a panel.
function renderTrafficReport(){
  const s=getTrafficStatus();
  const warnings=_trafficWarnings(s);
  const sev=_trafficSeverity(s);
  return`<div class="traffic-report traffic-card--${sev}">
    <div class="tf-head"><span class="tf-kicker">🚦 Traffic & Parking</span><span class="tf-severity tf-severity--${sev}">${sev==='high'?'Critical':sev==='med'?'Watch':'Stable'}</span></div>
    <div class="tf-stats">
      <div class="tf-stat"><span class="tf-stat-l">Congestion</span><span class="tf-stat-n">${s.congestion.label} (${s.congestion.level}%)</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Visitor parking</span><span class="tf-stat-v">${s.visitor.demand} / ${s.visitor.capacity}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Staff parking</span><span class="tf-stat-v">${s.staff.demand} / ${s.staff.capacity}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Ambulance route</span><span class="tf-stat-v">${s.ambulance.label}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Service access</span><span class="tf-stat-v">${s.service.label}</span></div>
      <div class="tf-stat"><span class="tf-stat-l">Map baseline</span><span class="tf-stat-v">Pressure ×${s.baseline.pressure.toFixed(2)} · ${s.baseline.accessLabel} access</span></div>
    </div>
    ${warnings.length?_renderTrafficWarnings(warnings):'<div class="tf-fixes">All clear — traffic and parking are healthy.</div>'}
  </div>`;
}

// Hook into updateUI so the card refreshes alongside the rest of the
// right panel (mirrors advisor + bottleneck wiring).
if(typeof updateUI==='function'){
  const _origUpdateUIForTraffic=updateUI;
  updateUI=function(){
    _origUpdateUIForTraffic.apply(this,arguments);
    try{renderTrafficCard();}catch(e){console.warn('renderTrafficCard failed',e);}
  };
}

// Light, defensive integration with patient arrival rate: if traffic
// effects are loaded, dampen the per-tick spawn chance using
// arrivalMult. We patch getPatientTrafficChance() once at load time.
if(typeof getPatientTrafficChance==='function'){
  const _origPTC=getPatientTrafficChance;
  getPatientTrafficChance=function(){
    const base=_origPTC.apply(this,arguments);
    try{return base*(getTrafficEffects().arrivalMult||1);}catch(e){return base;}
  };
}

if(document.readyState!=='loading')renderTrafficCard();
else document.addEventListener('DOMContentLoaded',renderTrafficCard);
