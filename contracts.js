// Contracts are isolated here so donor requests and mission-style goals can scale cleanly.
function makeContractOffer(){
  const pool=CONTRACT_LIBRARY.filter(c=>c.id!==lastContractId);
  const pick=(pool.length?pool:CONTRACT_LIBRARY)[Math.floor(Math.random()*(pool.length?pool.length:CONTRACT_LIBRARY.length))];
  lastContractId=pick.id;
  contractOffer={id:pick.id,title:pick.title,desc:pick.desc,rewardText:pick.rewardText,...pick.create()};
}
function makeInsuranceOffer(){
  return null;
}
function acceptContract(){
  if(activeContract||!contractOffer)return;
  activeContract={...contractOffer};
  contractOffer=null;
  addLog(`Accepted contract: ${activeContract.title}.`,'');
  updateUI();
}
function addInsuranceContract(plan){
  if(!plan)return;
  insuranceContracts.push(plan);
  addLog(`Signed ${plan.name} insurance contract`,'g');
  updateUI();
}
function acceptInsuranceContract(id){
  const option=insuranceOptions.find(item=>item.id===id);
  if(!option||insuranceContracts.some(contract=>contract.id===id))return;
  addInsuranceContract({...option,daysLeft:option.durationDays});
}
function progressInsuranceContractDay(){
  if(!insuranceContracts.length)return;
  insuranceContracts=insuranceContracts.filter(contract=>{
    contract.daysLeft=Math.max(0,(contract.daysLeft??contract.durationDays)-1);
    if(contract.daysLeft<=0){
      addLog(`${contract.name} expired. Insurance referrals have ended.`,'w');
      return false;
    }
    return true;
  });
  updateUI();
}
function completeActiveContract(){
  if(!activeContract)return;
  const techBonus=typeof getTechBonus==='function'?getTechBonus():{contractRewardMult:1};
  if(activeContract.reward.kind==='money'){
    const reward=Math.round(activeContract.reward.amount*(techBonus.contractRewardMult||1));
    changeMoney(reward);
    addLog(`${activeContract.title} completed. Donor bonus: +$${reward.toLocaleString()}.`,'g');
  }else if(activeContract.reward.kind==='free_room'){
    freeBuildCredits[activeContract.reward.roomType]=(freeBuildCredits[activeContract.reward.roomType]||0)+activeContract.reward.amount;
    addLog(`${activeContract.title} completed. Donated reward: ${RDEFS[activeContract.reward.roomType].name} room credit.`,'g');
  }
  activeContract=null;
  makeContractOffer();
  updateUI();
}
function renderContracts(){
  const wraps=[document.getElementById('contracts'),document.getElementById('contractpanel')].filter(Boolean);
  if(!wraps.length)return;
  const freeGp=freeBuildCredits.gp?`<div class="cr">Free GP room credits: ${freeBuildCredits.gp}</div>`:'';
  let html=freeGp;
  html+=insuranceContracts.map(contract=>`<div class="cc">
      <div class="ct">${contract.name}</div>
      <div class="cd">Insurance contract active</div>
      <div class="cp">Days left: ${contract.daysLeft}</div>
      <div class="cp">Income boost: +${Math.round((contract.incomeBoost||0)*100)}%</div>
      <div class="cp">Patient boost: +${Math.round((contract.patientBoost||0)*100)}%</div>
      <div class="cr">Stress load: ${contract.stress||0}</div>
    </div>`).join('');
  html+=insuranceOptions
    .filter(option=>!insuranceContracts.some(contract=>contract.id===option.id))
    .map(option=>`<div class="cc">
      <div class="ct">${option.name}</div>
      <div class="cd">Insurance contract offer</div>
      <div class="cp">Income boost: +${Math.round((option.incomeBoost||0)*100)}%</div>
      <div class="cp">Patient boost: +${Math.round((option.patientBoost||0)*100)}%</div>
      <div class="cp">Term: ${option.durationDays} days</div>
      <div class="cr">Stress load: ${option.stress||0}</div>
      <button onclick="acceptInsuranceContract('${option.id}')">Accept Insurance Contract</button>
    </div>`).join('');
  if(activeContract){
    html+=`<div class="cc">
      <div class="ct">${activeContract.title}</div>
      <div class="cd">${activeContract.desc}</div>
      <div class="cp">Progress: ${activeContract.progress}/${activeContract.target}</div>
      <div class="cr">${activeContract.reward.kind==='money'?`Reward on completion: $${activeContract.reward.amount.toLocaleString()}`:`Reward on completion: 1 free ${RDEFS[activeContract.reward.roomType].name}`}</div>
    </div>`;
  }else if(contractOffer){
    html+=`<div class="cc">
      <div class="ct">${contractOffer.title}</div>
      <div class="cd">${contractOffer.desc}</div>
      <div class="cr">${contractOffer.rewardText}</div>
      <button onclick="acceptContract()">Accept Contract</button>
    </div>`;
  }else{
    html+=`<div class="cc"><div class="cd">No donor request is active right now.</div></div>`;
  }
  wraps.forEach(wrap=>{wrap.innerHTML=html;});
}
