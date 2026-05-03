// ── Delegation & Automation Panel ────────────────────────────────────────────

function openDelegationPanel(){
  renderDelegationPanel();
  document.getElementById('delegationmodal').classList.add('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}
function closeDelegationPanel(){
  document.getElementById('delegationmodal').classList.remove('open');
  if(typeof updateMenuBlurState==='function')updateMenuBlurState();
}

function _delCapitalize(s){return s?s[0].toUpperCase()+s.slice(1):'';}

function renderDelegationPanel(){
  const content=document.getElementById('delegation-content');
  const summaryEl=document.getElementById('delegation-summary');
  if(!content)return;

  const r=id=>researchedTech&&researchedTech.has(id);
  const tb=getTechBonus();
  const amplified=!!tb.delegationAmplify;

  const active=AUTOMATION_ROLES.filter(role=>r(role.unlock)).length;
  const total=AUTOMATION_ROLES.length;

  if(summaryEl){
    const ampNote=amplified?' · All policies amplified by Operations Command Center':'';
    summaryEl.textContent=`${active} of ${total} delegation roles active${ampNote}`;
    summaryEl.className='del-summary'+(active>0?' has-active':'');
  }

  content.innerHTML=AUTOMATION_ROLES.map(role=>{
    const unlocked=r(role.unlock);
    const improved=role.improvedBy&&r(role.improvedBy);
    const branchLabel=_delCapitalize(role.unlockBranch);

    if(!unlocked){
      return(
        '<div class="del-card del-locked">'+
          '<div class="del-card-head">'+
            '<span class="del-icon">'+role.icon+'</span>'+
            '<div class="del-title-col">'+
              '<div class="del-title">'+role.label+'</div>'+
              '<span class="del-chip del-chip-locked">🔒 Locked</span>'+
            '</div>'+
          '</div>'+
          '<div class="del-desc">'+role.desc+'</div>'+
          '<div class="del-unlock-row">'+
            '<span class="del-unlock-label">Requires:</span>'+
            '<span class="del-unlock-node">'+role.unlockLabel+'</span>'+
            '<span class="del-unlock-branch">'+branchLabel+' research</span>'+
          '</div>'+
          '<div class="del-effect-preview">'+role.effect+'</div>'+
        '</div>'
      );
    }

    const ampBadge=amplified?'<span class="del-chip del-chip-amp">⚡ Amplified</span>':'';
    const impBadge=improved?('<span class="del-chip del-chip-improved">✓ '+role.improvedLabel+'</span>'):'';
    const pendingImprove=(!improved&&role.improvedBy)
      ?('<div class="del-improve-hint">'+
          '<span class="del-improve-label">Improveable:</span> <strong>'+role.improvedLabel+'</strong> — '+role.improvedEffect+
        '</div>')
      :'';

    return(
      '<div class="del-card del-active">'+
        '<div class="del-card-head">'+
          '<span class="del-icon">'+role.icon+'</span>'+
          '<div class="del-title-col">'+
            '<div class="del-title">'+role.label+'</div>'+
            '<div class="del-chip-row">'+
              '<span class="del-chip del-chip-active">● Active</span>'+
              ampBadge+impBadge+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="del-effect">'+role.effect+'</div>'+
        pendingImprove+
      '</div>'
    );
  }).join('');
}
