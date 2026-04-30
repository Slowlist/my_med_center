// Dispatch jobs stay isolated here so transport gameplay can grow without bloating the core loop.
function getDispatchGenerationCapacity(shift=currentShift()){
  const dispatchRooms=countOperationalRooms('dispatch_office',shift);
  if(dispatchRooms<=0)return 0;
  return dispatchRooms+getItDispatchBoost(shift);
}
function getDispatchProgressCapacity(shift=currentShift()){
  return Math.min(getDispatchGenerationCapacity(shift),getHiredRoleCount('driver',shift));
}
function makeDispatchJob(){
  const templates=[
    {title:'Patient Transfer Run',desc:'Move a stabilized patient between care sites.',money:[900,1300],rep:2,days:2},
    {title:'Supply Courier Route',desc:'Rush urgent medication and blood packs to a satellite clinic.',money:[700,1100],rep:1,days:1},
    {title:'Field Pickup Call',desc:'Coordinate a safe pickup from a city incident scene.',money:[1200,1800],rep:3,days:3}
  ];
  const pick=templates[Math.floor(Math.random()*templates.length)];
  const rewardMoney=pick.money[0]+Math.floor(Math.random()*(pick.money[1]-pick.money[0]+1));
  return{id:dispatchJobId++,title:pick.title,desc:pick.desc,rewardMoney,rewardRep:pick.rep,daysLeft:pick.days,totalDays:pick.days,status:'queued'};
}
function generateDispatchJobs(shift=currentShift()){
  const capacity=getDispatchGenerationCapacity(shift);
  if(capacity<=0||dispatchJobs.length>=5)return;
  const attempts=Math.min(2,capacity);
  for(let i=0;i<attempts;i++){
    if(dispatchJobs.length>=5)break;
    if(Math.random()<0.65){
      const job=makeDispatchJob();
      dispatchJobs.push(job);
      addLog(`Dispatch received a new job: ${job.title}.`,'');
    }
  }
}
function progressDispatchJobs(shift=currentShift()){
  const capacity=getDispatchProgressCapacity(shift);
  if(capacity<=0)return;
  const working=dispatchJobs.slice(0,capacity);
  working.forEach(job=>{
    job.status='in_progress';
    job.daysLeft=Math.max(0,job.daysLeft-1);
    if(job.daysLeft<=0){
      changeMoney(job.rewardMoney);
      reputation=clamp(reputation+job.rewardRep,0,100);
      const interns=getInternsOnShift(shift);
      if(interns.length){
        const intern=interns[Math.floor(Math.random()*interns.length)];
        giveXP(intern,1);
      }
      addLog(`Dispatch completed: ${job.title}. +$${job.rewardMoney.toLocaleString()} and +${job.rewardRep} reputation.`,'g');
      showToast('Dispatch completed','info');
    }
  });
  dispatchJobs=dispatchJobs.filter(job=>job.daysLeft>0);
}
function renderDispatchJobs(){
  const wrap=document.getElementById('dispatchjobs');
  if(!wrap)return;
  const generation=getDispatchGenerationCapacity();
  const progress=getDispatchProgressCapacity();
  const linkedBay=hasOperationalRoom('ambulance_bay');
  let html=`<div class="dispatch-card"><div class="dispatch-title">Dispatch Ops</div><div class="dispatch-desc">Office capacity: ${generation} · Drivers ready: ${getHiredRoleCount('driver')}</div><div class="dispatch-meta">${generation>0?'Jobs will appear over time.':linkedBay?'Build and staff a Dispatch Office to receive calls.':'Build an Ambulance Bay linked to Dispatch and ER to activate transport operations.'}</div></div>`;
  if(!dispatchJobs.length){
    html+=`<div class="dispatch-card"><div class="dispatch-title">No Active Jobs</div><div class="dispatch-desc">${generation>0?'The board is clear for now.':linkedBay?'Research Dispatch Network, build the office, and hire a dispatcher.':'Research Dispatch Network, then link an Ambulance Bay to both Dispatch and ER.'}</div><div class="dispatch-meta">${progress>0?'Drivers are ready for the next call.':'Hire drivers to complete transport jobs.'}</div></div>`;
  }else{
    html+=dispatchJobs.map(job=>`<div class="dispatch-card ${job.status==='in_progress'?'active':''}"><div class="dispatch-title">${job.title}</div><div class="dispatch-desc">${job.desc}</div><div class="dispatch-meta">Time left: ${job.daysLeft}/${job.totalDays} days</div><div class="dispatch-reward">Reward: $${job.rewardMoney.toLocaleString()} · +${job.rewardRep} reputation</div></div>`).join('');
  }
  wrap.innerHTML=html;
}
