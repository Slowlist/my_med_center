const TUTORIAL_PREF_KEY='mmcTutorialCompletedV2';

let tutorialActive=false;
let tutorialStep=0;
let tutorialCompleted=false;
let tutorialCardPosition=null;
let tutorialDragState=null;
let tutorialFreshScenario=false;
let tutorialManagedTiles=[];
let tutorialStepEvents=new Set();
let tutorialGhostState={};

function getTutorialScenarioLayout(){
  const center=Math.floor(COLS/2);
  return{
    demoWaiting:{c:Math.max(3,center-5),r:2},
    demoGp:{c:Math.min(COLS-3,center+2),r:2},
    demoPath:[
      {x:center-1,y:3},
      {x:center,y:3},
      {x:center+1,y:3},
      {x:center,y:4},
      {x:center,y:5}
    ],
    practicePath:[
      {x:center,y:7},
      {x:center,y:8},
      {x:center,y:9},
      {x:center,y:10},
      {x:center,y:11}
    ],
    practiceWaiting:{c:center-4,r:8},
    practiceGp:{c:center+1,r:7}
  };
}

function getTutorialGhostLayout(){
  const layout=getTutorialScenarioLayout();
  return{
    corridor:{
      type:'corridor',
      tiles:layout.practicePath
    },
    waiting_room:{
      type:'waiting_room',
      c:layout.practiceWaiting.c,
      r:layout.practiceWaiting.r,
      w:RDEFS.waiting_room.w,
      h:RDEFS.waiting_room.h,
      label:'Waiting Room'
    },
    gp:{
      type:'gp',
      c:layout.practiceGp.c,
      r:layout.practiceGp.r,
      w:RDEFS.gp.w,
      h:RDEFS.gp.h,
      label:'GP Office'
    }
  };
}

function getStoredTutorialCompleted(){
  try{
    return localStorage.getItem(TUTORIAL_PREF_KEY)==='1';
  }catch{
    return false;
  }
}

function persistTutorialPreference(){
  try{
    localStorage.setItem(TUTORIAL_PREF_KEY,tutorialCompleted?'1':'0');
  }catch{}
}

function applySavedTutorialPreference(){
  tutorialCompleted=tutorialCompleted||getStoredTutorialCompleted();
  if(tutorialCompleted)tutorialActive=false;
}

function isTutorialVisibleContext(){
  const titleScreen=document.getElementById('titlescreen');
  return !titleScreen||titleScreen.classList.contains('hidden');
}

function clearTutorialHighlights(){
  document.querySelectorAll('.tutorial-highlight').forEach(node=>node.classList.remove('tutorial-highlight'));
}

function hasTutorialFullControl(){
  return !tutorialActive||tutorialCompleted||isSandboxMode||gameOver||tutorialStep>=8;
}

function isTutorialScenarioFresh(){
  return rooms.length===0&&staff.every(member=>!member.hired)&&totalTreated===0&&day<=1;
}

function getPlayerTutorialRooms(type){
  return rooms.filter(room=>room.type===type&&!room.tutorialDemo);
}

function hasPlayerTutorialHire(role){
  return staff.some(member=>member.hired&&member.role===role&&!member.tutorialDemo);
}

function isTutorialHospitalNamed(){
  return sanitizeCustomCenterName(customCenterName)!==DEFAULT_CENTER_NAME;
}

function getTutorialDemoRooms(){
  return rooms.filter(room=>room.tutorialDemo);
}

function getTutorialDemoStaff(){
  return staff.filter(member=>member.tutorialDemo);
}

function trackTutorialTile(x,y,mode){
  tutorialManagedTiles.push({x,y,floor:1,mode});
}

function placeTutorialTile(x,y,mode='demo'){
  const floorGrid=getFloorGrid(1);
  if(!floorGrid||y<0||y>=ROWS||x<0||x>=COLS)return;
  if(tileOccupied(x,y,1))return;
  floorGrid[y][x]='corridor';
  trackTutorialTile(x,y,mode);
  if(currentFloor===1)syncActiveGrid();
}

function clearTutorialTiles(mode){
  const floorGrid=getFloorGrid(1);
  if(!floorGrid)return;
  tutorialManagedTiles=tutorialManagedTiles.filter(tile=>{
    if(tile.mode!==mode)return true;
    if(tile.floor===1&&floorGrid[tile.y]?.[tile.x]==='corridor')floorGrid[tile.y][tile.x]=null;
    return false;
  });
  if(currentFloor===1)syncActiveGrid();
}

function makeTutorialRoom(type,c,r){
  const def=RDEFS[type];
  if(!def)return null;
  const room={
    id:Date.now()+Math.random(),
    type,
    r,
    c,
    w:def.w,
    h:def.h,
    floor:1,
    builtAt:currentAnimTime(),
    tutorialDemo:true
  };
  rooms.push(room);
  return room;
}

function hireTutorialDemoRole(role){
  const member=genStaffMember(role,'day');
  member.hired=true;
  member.tutorialDemo=true;
  staff.push(member);
  return member;
}

function setupTutorialDemoScenario(){
  if(!tutorialFreshScenario)return;
  if(getTutorialDemoRooms().length||getTutorialDemoStaff().length)return;
  const layout=getTutorialScenarioLayout();
  makeTutorialRoom('waiting_room',layout.demoWaiting.c,layout.demoWaiting.r);
  makeTutorialRoom('gp',layout.demoGp.c,layout.demoGp.r);
  layout.demoPath.forEach(tile=>placeTutorialTile(tile.x,tile.y,'demo'));
  hireTutorialDemoRole('clerical');
  hireTutorialDemoRole('gp_doc');
  if(currentFloor!==1)setCurrentFloor(1,true);
  paused=true;
  buildMode=false;
  clearToolSelection();
  updatePauseButton();
  updateBuildModeButton();
  addLog('Tutorial demo clinic prepared. Watch the basic patient flow first.','g');
  updateUI();
  render();
}

function clearTutorialDemoScenario(){
  clearTutorialTiles('demo');
  const removedRoomIds=new Set(getTutorialDemoRooms().map(room=>room.id));
  rooms=rooms.filter(room=>!room.tutorialDemo);
  staff=staff.filter(member=>!member.tutorialDemo);
  patients=patients.filter(patient=>!removedRoomIds.has(patient.roomId));
  if([...removedRoomIds].includes(selectedRoomId))closeRoomPanel();
  if(currentFloor===1)syncActiveGrid();
}

function ensureTutorialPracticePath(){
  const layout=getTutorialScenarioLayout();
  if(tutorialManagedTiles.some(tile=>tile.mode==='practice'))return;
  layout.practicePath.forEach(tile=>placeTutorialTile(tile.x,tile.y,'practice'));
  if(currentFloor!==1)setCurrentFloor(1,true);
}

function prepareTutorialPracticeScenario(){
  if(!tutorialFreshScenario)return;
  clearTutorialDemoScenario();
  ensureTutorialPracticePath();
  tutorialGhostState={waiting_room:{completedAt:0,quality:null},gp:{completedAt:0,quality:null}};
  buildMode=true;
  updateBuildModeButton();
  if(currentFloor!==1)setCurrentFloor(1,true);
  addLog('Practice lane ready. Build your own clinic around the highlighted corridor.','');
  updateUI();
  render();
}

function getTutorialStepDef(){
  return TUTORIAL_STEPS[tutorialStep]||null;
}

function shouldDeclutterTutorialUI(){
  return tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&tutorialStep<8;
}

function getTutorialPanelSummaryText(panel){
  return panel?.querySelector('summary')?.textContent?.trim()||'';
}

function getTutorialRelevantBuildSectionTitle(){
  const stepId=getTutorialStepDef()?.id;
  if(['build_waiting','build_gp'].includes(stepId))return'Patient Rooms';
  return null;
}

function getTutorialTargetSelectors(){
  const step=getTutorialStepDef();
  if(!step)return[];
  const selectors=Array.isArray(step.highlight)?step.highlight:[step.highlight].filter(Boolean);
  return selectors.filter(Boolean);
}

function applyTutorialLayoutState(){
  const declutter=shouldDeclutterTutorialUI();
  const allowedPanels=new Set(['Warnings','Goals','Stats']);
  document.querySelectorAll('#rp .menu-panel').forEach(panel=>{
    const summary=getTutorialPanelSummaryText(panel);
    const keepVisible=!declutter||allowedPanels.has(summary);
    panel.classList.toggle('tutorial-hidden',!keepVisible);
    if(keepVisible&&declutter&&summary!=='Stats')panel.setAttribute('open','');
  });
  const floorPanel=document.getElementById('floorswitchpanel');
  if(floorPanel)floorPanel.classList.toggle('tutorial-hidden',declutter);
  const heatmapBtn=document.getElementById('heatmapbtn');
  if(heatmapBtn)heatmapBtn.classList.toggle('tutorial-hidden',declutter);

  const relevantSection=getTutorialRelevantBuildSectionTitle();
  document.querySelectorAll('#sidebar .build-section').forEach(section=>{
    const summary=section.querySelector('summary')?.textContent?.trim()||'';
    if(!declutter||!relevantSection){
      section.classList.remove('tutorial-dim');
      return;
    }
    const active=summary===relevantSection;
    section.classList.toggle('tutorial-dim',!active);
    if(active)section.setAttribute('open','');
    else section.removeAttribute('open');
  });

  const stepId=getTutorialStepDef()?.id;
  const focusedTool=stepId==='build_waiting'?'waiting_room':stepId==='build_gp'?'gp':null;
  document.querySelectorAll('#sidebar .rb[data-tool]').forEach(btn=>{
    const isFocused=focusedTool&&btn.dataset.tool===focusedTool;
    btn.classList.toggle('tutorial-button-dim',!!(declutter&&focusedTool&&!isFocused));
  });
}

function applyTutorialHighlights(){
  clearTutorialHighlights();
  if(!tutorialActive||tutorialCompleted||isSandboxMode||!isTutorialVisibleContext()||gameOver)return;
  const step=getTutorialStepDef();
  const targets=Array.isArray(step?.highlight)?step.highlight:[step?.highlight].filter(Boolean);
  targets.forEach(selector=>{
    document.querySelectorAll(selector).forEach(node=>node.classList.add('tutorial-highlight'));
  });
}

function getTutorialGoalText(step){
  if(!step)return'';
  if(!step.goal)return step.goalText||'Use Next to continue.';
  return step.goal()?'Goal complete.':(step.goalText||'Waiting for action...');
}

function showTutorialHint(message){
  const hint=document.getElementById('hint');
  if(hint)hint.textContent=message;
}

function onTutorialStepEnter(step){
  if(!step||tutorialStepEvents.has(`enter:${step.id}`))return;
  tutorialStepEvents.add(`enter:${step.id}`);
  if(step.onEnter)step.onEnter();
}

function onTutorialStepComplete(step){
  if(!step||tutorialStepEvents.has(`complete:${step.id}`))return;
  tutorialStepEvents.add(`complete:${step.id}`);
  if(step.onComplete)step.onComplete();
}

function advanceTutorialStep(){
  const step=getTutorialStepDef();
  if(!step)return;
  if(step.goal&&!step.goal())return;
  onTutorialStepComplete(step);
  if(step.onAdvance)step.onAdvance();
  tutorialStep++;
  if(tutorialStep>=TUTORIAL_STEPS.length){
    completeTutorial();
    return;
  }
  onTutorialStepEnter(getTutorialStepDef());
  renderTutorial();
}

function renderTutorial(){
  const card=document.getElementById('tutorialcard');
  if(!card)return;
  const step=getTutorialStepDef();
  const advancedLocked=tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&tutorialStep<8;
  card.classList.toggle('modal-docked',!!getActiveTutorialModalBox());
  document.getElementById('researchbtn')?.classList.toggle('tutorial-muted',advancedLocked);
  document.getElementById('contractbtn')?.classList.toggle('tutorial-muted',advancedLocked);
  document.getElementById('advertbtn')?.classList.toggle('tutorial-muted',advancedLocked);
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver||!isTutorialVisibleContext()){
    card.classList.add('hidden');
    clearTutorialHighlights();
    applyTutorialLayoutState();
    return;
  }
  if(!step){
    card.classList.add('hidden');
    clearTutorialHighlights();
    applyTutorialLayoutState();
    return;
  }
  card.classList.remove('hidden');
  applyTutorialCardPosition();
  document.getElementById('tutorial-progress').textContent=step.progressLabel||`Step ${tutorialStep+1} / ${TUTORIAL_STEPS.length}`;
  document.getElementById('tutorial-title').textContent=step.title;
  document.getElementById('tutorial-text').textContent=step.text;
  document.getElementById('tutorial-goal').textContent=getTutorialGoalText(step);
  const nextBtn=document.getElementById('tutorial-next');
  const needsAction=!!step.goal&&!step.goal();
  nextBtn.disabled=needsAction;
  nextBtn.textContent=tutorialStep===TUTORIAL_STEPS.length-1?'Finish':(step.goal?'Next Step':'Next');
  applyTutorialLayoutState();
  applyTutorialHighlights();
}

function completeTutorial(){
  tutorialActive=false;
  tutorialCompleted=true;
  tutorialStep=TUTORIAL_STEPS.length-1;
  tutorialFreshScenario=false;
  tutorialGhostState={};
  tutorialStepEvents.clear();
  persistTutorialPreference();
  clearTutorialHighlights();
  showTutorialHint("You're now running your own clinic. Expand, manage staff, and grow into a medical center.");
  renderTutorial();
}

function skipTutorial(){
  if(getTutorialDemoRooms().length||getTutorialDemoStaff().length){
    clearTutorialDemoScenario();
    updateUI();
    render();
  }
  tutorialActive=false;
  tutorialCompleted=true;
  tutorialFreshScenario=false;
  tutorialGhostState={};
  tutorialStepEvents.clear();
  persistTutorialPreference();
  clearTutorialHighlights();
  if(typeof saveGame==='function'&&hasStarted&&!gameOver){
    try{saveGame();}catch{}
  }
  renderTutorial();
}

function nextTutorialStep(){
  if(!tutorialActive)return;
  advanceTutorialStep();
}

function acceptTutorialCenterName(){
  const step=getTutorialStepDef();
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return;
  if(step?.id!=='name_hospital')return;
  updateTutorialProgress();
  if(step.goal&&step.goal())advanceTutorialStep();
}

function startTutorial(preferFreshScenario=false){
  if(isSandboxMode)return;
  if(tutorialCompleted&&!preferFreshScenario){
    renderTutorial();
    return;
  }
  tutorialActive=true;
  tutorialStepEvents.clear();
  tutorialCardPosition=null;
  tutorialFreshScenario=preferFreshScenario&&isTutorialScenarioFresh();
  tutorialStep=tutorialFreshScenario?0:1;
  onTutorialStepEnter(getTutorialStepDef());
  renderTutorial();
}

function beginTutorial(){
  if(isSandboxMode)return;
  tutorialCompleted=false;
  tutorialActive=false;
  tutorialStep=0;
  tutorialFreshScenario=false;
  tutorialGhostState={};
  tutorialCardPosition=null;
  tutorialStepEvents.clear();
  persistTutorialPreference();
  if(!hasStarted||gameOver){
    startGame();
    return;
  }
  startTutorial(false);
  updateTutorialProgress();
}

function updateTutorialProgress(){
  if(tutorialCompleted||isSandboxMode){
    tutorialActive=false;
    renderTutorial();
    return;
  }
  if(!tutorialActive){
    renderTutorial();
    return;
  }
  let guard=0;
  while(guard<TUTORIAL_STEPS.length){
    const step=getTutorialStepDef();
    if(!step||!step.goal||!step.goal())break;
    advanceTutorialStep();
    if(!tutorialActive)return;
    guard++;
  }
  renderTutorial();
}

function maybeResumeTutorialAfterLoad(){
  tutorialFreshScenario=getTutorialDemoRooms().length>0||getTutorialDemoStaff().length>0;
  if(!tutorialFreshScenario&&(!tutorialGhostState||typeof tutorialGhostState!=='object'))tutorialGhostState={};
  if(tutorialCompleted||isSandboxMode||!hasStarted||gameOver){
    tutorialActive=false;
    renderTutorial();
    return;
  }
  if(!tutorialActive&&tutorialStep===0&&totalTreated===0){
    tutorialActive=true;
  }
  onTutorialStepEnter(getTutorialStepDef());
  updateTutorialProgress();
}

function clampTutorialCardPosition(left,top){
  const card=document.getElementById('tutorialcard');
  const wrap=document.getElementById('cw');
  if(!card||!wrap)return{left,top};
  const maxLeft=Math.max(12,wrap.clientWidth-card.offsetWidth-12);
  const maxTop=Math.max(12,wrap.clientHeight-card.offsetHeight-12);
  return{
    left:clamp(left,12,maxLeft),
    top:clamp(top,12,maxTop)
  };
}

function getTutorialTargetBounds(){
  const selectors=getTutorialTargetSelectors();
  let bounds=null;
  selectors.forEach(selector=>{
    document.querySelectorAll(selector).forEach(node=>{
      const rect=node.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      if(!bounds){
        bounds={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};
        return;
      }
      bounds.left=Math.min(bounds.left,rect.left);
      bounds.top=Math.min(bounds.top,rect.top);
      bounds.right=Math.max(bounds.right,rect.right);
      bounds.bottom=Math.max(bounds.bottom,rect.bottom);
    });
  });
  return bounds;
}

function getActiveTutorialModalBox(){
  const modalTargets=[
    ['staffmodal','staffbox'],
    ['researchmodal','researchbox'],
    ['contractmodal','contractbox']
  ];
  for(const [modalId,boxId] of modalTargets){
    const modal=document.getElementById(modalId);
    const box=document.getElementById(boxId);
    if(modal?.classList.contains('open')&&box)return box;
  }
  return null;
}

function applyTutorialCardPosition(){
  const card=document.getElementById('tutorialcard');
  const wrap=document.getElementById('cw');
  if(!card)return;
  if(!tutorialCardPosition){
    if(wrap&&tutorialActive&&!tutorialCompleted){
      const wrapRect=wrap.getBoundingClientRect();
      const activeModalBox=getActiveTutorialModalBox();
      if(activeModalBox){
        const modalRect=activeModalBox.getBoundingClientRect();
        const candidates=[
          {
            left:Math.max(12,modalRect.right-wrapRect.left-card.offsetWidth-18),
            top:Math.max(12,modalRect.top-wrapRect.top+18)
          },
          {
            left:Math.max(12,modalRect.right-wrapRect.left-card.offsetWidth-18),
            top:Math.max(12,modalRect.bottom-wrapRect.top-card.offsetHeight-18)
          },
          {
            left:Math.max(12,modalRect.left-wrapRect.left+18),
            top:Math.max(12,modalRect.bottom-wrapRect.top-card.offsetHeight-18)
          }
        ];
        const target=getTutorialTargetBounds();
        const overlaps=(a,b)=>!!(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
        const cardRectFrom=(candidate)=>({
          left:wrapRect.left+candidate.left,
          top:wrapRect.top+candidate.top,
          right:wrapRect.left+candidate.left+card.offsetWidth,
          bottom:wrapRect.top+candidate.top+card.offsetHeight
        });
        const pick=candidates.find(candidate=>!overlaps(cardRectFrom(candidate),target))||candidates[0];
        const clamped=clampTutorialCardPosition(pick.left,pick.top);
        card.style.left=`${clamped.left}px`;
        card.style.top=`${clamped.top}px`;
        card.style.bottom='auto';
        return;
      }
      const target=getTutorialTargetBounds();
      const leftCandidate={
        left:18,
        top:wrap.clientHeight-card.offsetHeight-18
      };
      const rightCandidate={
        left:Math.max(18,wrap.clientWidth-card.offsetWidth-18),
        top:wrap.clientHeight-card.offsetHeight-18
      };
      const cardRectFrom=(candidate)=>({
        left:wrapRect.left+candidate.left,
        top:wrapRect.top+candidate.top,
        right:wrapRect.left+candidate.left+card.offsetWidth,
        bottom:wrapRect.top+candidate.top+card.offsetHeight
      });
      const overlaps=(a,b)=>!!(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
      const pick=(target&&overlaps(cardRectFrom(leftCandidate),target))?rightCandidate:leftCandidate;
      card.style.left=`${pick.left}px`;
      card.style.top=`${pick.top}px`;
      card.style.bottom='auto';
      return;
    }
    card.style.left='18px';
    card.style.top='';
    card.style.bottom='18px';
    return;
  }
  const nextPos=clampTutorialCardPosition(tutorialCardPosition.left,tutorialCardPosition.top);
  tutorialCardPosition=nextPos;
  card.style.left=`${Math.round(nextPos.left)}px`;
  card.style.top=`${Math.round(nextPos.top)}px`;
  card.style.bottom='auto';
}

function initTutorialDrag(){
  const card=document.getElementById('tutorialcard');
  const wrap=document.getElementById('cw');
  if(!card||!wrap||card.dataset.dragReady==='1')return;
  card.dataset.dragReady='1';

  const stopDrag=()=>{
    tutorialDragState=null;
    document.removeEventListener('mousemove',onDragMove);
    document.removeEventListener('mouseup',stopDrag);
  };

  const onDragMove=(event)=>{
    if(!tutorialDragState)return;
    const wrapRect=wrap.getBoundingClientRect();
    const nextLeft=event.clientX-wrapRect.left-tutorialDragState.offsetX;
    const nextTop=event.clientY-wrapRect.top-tutorialDragState.offsetY;
    tutorialCardPosition=clampTutorialCardPosition(nextLeft,nextTop);
    applyTutorialCardPosition();
  };

  card.addEventListener('mousedown',event=>{
    const dragHandle=event.target.closest('[data-tutorial-drag]');
    if(!dragHandle)return;
    const cardRect=card.getBoundingClientRect();
    tutorialDragState={
      offsetX:event.clientX-cardRect.left,
      offsetY:event.clientY-cardRect.top
    };
    if(!tutorialCardPosition){
      const wrapRect=wrap.getBoundingClientRect();
      tutorialCardPosition={
        left:cardRect.left-wrapRect.left,
        top:cardRect.top-wrapRect.top
      };
    }
    document.addEventListener('mousemove',onDragMove);
    document.addEventListener('mouseup',stopDrag);
    event.preventDefault();
  });

  window.addEventListener('resize',()=>{
    if(tutorialCardPosition)applyTutorialCardPosition();
  });
}

function getTutorialFlowRooms(){
  const waiting=rooms.find(room=>room.tutorialDemo&&room.type==='waiting_room')||null;
  const gp=rooms.find(room=>room.tutorialDemo&&room.type==='gp')||null;
  return{waiting,gp};
}

function getGhostRoomAlpha(ghostKey){
  const state=tutorialGhostState?.[ghostKey];
  if(!state?.completedAt)return 1;
  const elapsed=currentAnimTime()-state.completedAt;
  return clamp(1-(elapsed/900),0,1);
}

function shouldRenderGhostRoom(ghostKey){
  const alpha=getGhostRoomAlpha(ghostKey);
  const stepId=getTutorialStepDef()?.id;
  if(alpha>0&&tutorialGhostState?.[ghostKey]?.completedAt)return true;
  if(stepId==='build_waiting'&&ghostKey==='waiting_room')return true;
  if(stepId==='build_gp')return ghostKey==='waiting_room'||ghostKey==='gp';
  if(stepId==='hire_staff')return ghostKey==='waiting_room'||ghostKey==='gp';
  return false;
}

function rectsIntersect(a,b){
  return a.c<a.c+a.w&&b.c<b.c+b.w&&a.c+a.w>b.c&&b.c+b.w>a.c&&a.r+a.h>b.r&&b.r+b.h>a.r;
}

function roomMatchesGhostNear(room,spec){
  const expanded={
    c:spec.c-2,
    r:spec.r-2,
    w:spec.w+4,
    h:spec.h+4
  };
  const roomRect={c:room.c,r:room.r,w:room.w,h:room.h};
  const exactRect={c:spec.c,r:spec.r,w:spec.w,h:spec.h};
  return{
    near:rectsIntersect(roomRect,expanded),
    overlap:rectsIntersect(roomRect,exactRect)
  };
}

function handleTutorialGhostPlacement(room){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver||currentFloor!==1||!room||room.tutorialDemo)return;
  if(!['waiting_room','gp'].includes(room.type))return;
  const ghost=getTutorialGhostLayout()[room.type];
  if(!ghost)return;
  const match=roomMatchesGhostNear(room,ghost);
  tutorialGhostState[room.type]={
    completedAt:currentAnimTime(),
    quality:match.near?'good':'far'
  };
  if(match.near){
    showTutorialHint('Good placement. Closer rooms reduce travel and confusion.');
    addLog(`Good placement for ${ghost.label}.`,'g');
    showToast('Good placement','good');
  }else{
    showTutorialHint('That works, but rooms closer together reduce travel and confusion.');
    addLog(`${ghost.label} placed farther from the suggested layout, but it will still work.`,'w');
    showToast('Placement accepted','info');
  }
}

function drawTutorialGhostRoom(spec,ghostKey){
  const alpha=getGhostRoomAlpha(ghostKey);
  if(alpha<=0)return;
  const x=spec.c*T+2,y=spec.r*T+2,w=spec.w*T-4,h=spec.h*T-4;
  ctx.save();
  ctx.shadowColor='rgba(116,168,214,0.18)';
  ctx.shadowBlur=10;
  ctx.fillStyle=`rgba(168,205,238,${0.08*alpha})`;
  rrect(x,y,w,h,18);ctx.fill();
  ctx.shadowBlur=0;
  ctx.setLineDash([8,6]);
  ctx.lineWidth=2;
  ctx.strokeStyle=`rgba(116,168,214,${0.52*alpha})`;
  rrect(x+1,y+1,w-2,h-2,17);ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawTutorialGhostCorridor(){
  const ghost=getTutorialGhostLayout().corridor;
  if(!ghost||getTutorialStepDef()?.id!=='build_waiting')return;
  ctx.save();
  ctx.setLineDash([5,6]);
  ghost.tiles.forEach(tile=>{
    const x=tile.x*T+8,y=tile.y*T+8,size=T-16;
    ctx.fillStyle='rgba(171,205,235,0.08)';
    ctx.strokeStyle='rgba(126,170,208,0.34)';
    ctx.lineWidth=1.5;
    rrect(x,y,size,size,10);ctx.fill();ctx.stroke();
  });
  ctx.restore();
}

function drawTutorialArrow(fromX,fromY,toX,toY){
  const dx=toX-fromX,dy=toY-fromY;
  const angle=Math.atan2(dy,dx);
  const head=12;
  ctx.save();
  ctx.strokeStyle='rgba(79,160,255,0.9)';
  ctx.fillStyle='rgba(79,160,255,0.95)';
  ctx.lineWidth=4;
  ctx.setLineDash([10,8]);
  ctx.beginPath();
  ctx.moveTo(fromX,fromY);
  ctx.lineTo(toX,toY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(toX,toY);
  ctx.lineTo(toX-head*Math.cos(angle-Math.PI/7),toY-head*Math.sin(angle-Math.PI/7));
  ctx.lineTo(toX-head*Math.cos(angle+Math.PI/7),toY-head*Math.sin(angle+Math.PI/7));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderTutorialMapOverlay(){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver||currentFloor!==1)return;
  const step=getTutorialStepDef();
  if(!step)return;
  if(step.id==='demo'){
    const flow=getTutorialFlowRooms();
    if(!flow.waiting||!flow.gp)return;
    const fromX=(flow.waiting.c+flow.waiting.w)*T-10;
    const fromY=(flow.waiting.r+flow.waiting.h/2)*T;
    const toX=(flow.gp.c*T)+10;
    const toY=(flow.gp.r+flow.gp.h/2)*T;
    drawTutorialArrow(fromX,fromY,toX,toY);
    ctx.save();
    ctx.font='700 12px Segoe UI';
    ctx.fillStyle='rgba(45,101,165,0.95)';
    ctx.fillText('Patient flow',Math.min(fromX,toX)-8,Math.min(fromY,toY)-12);
    ctx.restore();
    return;
  }
  if(['build_waiting','build_gp','hire_staff'].includes(step.id)||getGhostRoomAlpha('waiting_room')>0||getGhostRoomAlpha('gp')>0){
    const ghosts=getTutorialGhostLayout();
    drawTutorialGhostCorridor();
    if(getTutorialStepDef()?.id==='build_waiting'||getGhostRoomAlpha('waiting_room')>0)drawTutorialGhostRoom(ghosts.waiting_room,'waiting_room');
    if(getTutorialStepDef()?.id==='build_gp'||getGhostRoomAlpha('gp')>0)drawTutorialGhostRoom(ghosts.gp,'gp');
    if(getPlayerTutorialRooms('waiting_room').length&&getPlayerTutorialRooms('gp').length){
      const waitingRoom=getPlayerTutorialRooms('waiting_room')[0];
      const gpRoom=getPlayerTutorialRooms('gp')[0];
      const fromX=(waitingRoom.c+waitingRoom.w)*T-10;
      const fromY=(waitingRoom.r+waitingRoom.h/2)*T;
      const toX=(gpRoom.c*T)+10;
      const toY=(gpRoom.r+gpRoom.h/2)*T;
      drawTutorialArrow(fromX,fromY,toX,toY);
    }
  }
}

function tutorialAllowsTool(tool){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return true;
  if(hasTutorialFullControl())return true;
  if(tutorialStep===0)return false;
  if(tutorialStep===1)return false;
  if(tutorialStep===2)return tool==='waiting_room';
  if(tutorialStep===3)return tool==='gp';
  return !['demolish','corridor','luxury_path'].includes(tool);
}

function tutorialAllowsStaffMenu(){
  return !tutorialActive||tutorialCompleted||isSandboxMode||gameOver||tutorialStep>=4;
}

function tutorialAllowsPauseToggle(){
  return !tutorialActive||tutorialCompleted||isSandboxMode||gameOver||tutorialStep>=5;
}

function tutorialAllowsAdvancedMenus(menuType=''){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return true;

  const stepId=getTutorialStepDef()?.id;

  if(menuType==='contracts'&&['grants','insurance_contracts','public_contract'].includes(stepId))return true;
  if(menuType==='research'&&stepId==='research_tree')return true;
  if(menuType==='departments'&&stepId==='department_upgrades')return true;

  return hasTutorialFullControl();
}

function tutorialAllowsHire(candidate){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver||tutorialStep!==4)return true;
  if(!candidate)return true;
  if(candidate.role==='clerical'&&!hasPlayerTutorialHire('clerical'))return true;
  if(candidate.role==='gp_doc'&&!hasPlayerTutorialHire('gp_doc'))return true;
  if(candidate.role==='nurse'&&!hasPlayerTutorialHire('nurse'))return true;
  if(candidate.role==='janitor'&&!hasPlayerTutorialHire('janitor'))return true;
  return false;
}

function tutorialBlockedMessage(type){
  if(type==='demo')return'Watch the quick demo first, then press Next.';
  if(type==='name')return'Name your hospital first.';
  if(type==='waiting')return'Build a Waiting Room first.';
  if(type==='gp')return'Build a GP Office next.';
  if(type==='staff')return'Hire Clerical, a GP Doctor, a Nurse, and a Janitor next.';
  if(type==='play')return'Press Play to start the clinic day.';
  if(type==='advanced')return'Finish the basic clinic tutorial first.';
  return'Finish the highlighted tutorial step first.';
}

const TUTORIAL_STEPS=[
  {
    id:'demo',
    title:'Welcome to My Medical Center',
    text:'Left builds rooms, the middle is your hospital, and the right shows goals and problems.',
    progressLabel:'Step 1 / 16',
    highlight:['#sidebar','#cw','#rp'],
    goalText:'Press Next to start your own clinic.',
    onEnter:()=>{
      setupTutorialDemoScenario();
      showTutorialHint('This demo shows the basic flow: wait first, treatment second.');
    },
    onAdvance:prepareTutorialPracticeScenario
  },
  {
      id:'name_hospital',
      title:'Name Your Hospital',
      text:'Type a hospital name in the Center Name box at the bottom.',
      progressLabel:'Step 2 / 16',
      highlight:['#mapbottommeta','#custom-center-name'],
      goal:()=>isTutorialHospitalNamed(),
      goalText:'Enter a custom hospital name.',
      onEnter:()=>{
        const input=document.getElementById('custom-center-name');
        input?.focus();
        input?.select?.();
        showTutorialHint('Give your hospital a name before you start building.');
      }
  },
  {
      id:'build_waiting',
      title:'Build a Waiting Room',
      text:'Build a Waiting Room so patients have somewhere to enter and sit.',
      progressLabel:'Step 3 / 16',
      highlight:['#sidebar','.rb[data-tool="waiting_room"]','#cw'],
      goal:()=>getPlayerTutorialRooms('waiting_room').length>=1,
      goalText:'Place 1 Waiting Room.',
      onEnter:()=>{
        buildMode=true;
        updateBuildModeButton();
        sel('waiting_room');
        showTutorialHint('Place a Waiting Room beside the path.');
      },
    onComplete:()=>{
      addLog('Good placement. Patients now have a place to enter and wait.','g');
      showToast('Good placement','good');
    }
  },
  {
      id:'build_gp',
      title:'Build a GP Office',
      text:'Build a GP Office so patients can get basic treatment.',
      progressLabel:'Step 4 / 16',
      highlight:['#sidebar','.rb[data-tool="gp"]','#cw'],
      goal:()=>getPlayerTutorialRooms('gp').length>=1,
      goalText:'Place 1 GP Office.',
      onEnter:()=>{
        buildMode=true;
        updateBuildModeButton();
        sel('gp');
        showTutorialHint('Place a GP Office near the Waiting Room.');
      },
    onComplete:()=>{
      addLog('Good placement. Your clinic now has a working treatment room.','g');
      showToast('Good placement','good');
    }
  },
  {
      id:'placement_logic',
      title:'Room Placement Matters',
      text:'Rooms work best when they connect to corridors and sit near the departments they support. Waiting and GP should stay close early, while ER, diagnostics, and inpatient rooms will need their own zones later.',
      progressLabel:'Step 5 / 16',
      highlight:['#cw'],
      goalText:'Press Next to continue.',
    onEnter:()=>{
      clearToolSelection();
      showTutorialHint('Keep rooms connected to corridors and keep related care areas close together.');
    }
  },
  {
      id:'hire_staff',
      title:'Hire Staff',
      text:'Hire the people your clinic needs to run.',
      progressLabel:'Step 6 / 16',
      highlight:['#staffbtn'],
      goal:()=>hasPlayerTutorialHire('clerical')&&hasPlayerTutorialHire('gp_doc')&&hasPlayerTutorialHire('nurse')&&hasPlayerTutorialHire('janitor'),
      goalText:'Hire Clerical, GP Doctor, Nurse, and Janitor.',
    onEnter:()=>{
      clearToolSelection();
      showTutorialHint('Open Staff and hire Clerical, GP Doctor, Nurse, and Janitor.');
    },
    onComplete:()=>{
      addLog('Clinic staffed. Your rooms now have the coverage they need.','g');
      showToast('Clinic staffed','good');
    }
  },
  {
      id:'start_clock',
      title:'Press Play',
      text:'Press Play to start time and let patients arrive.',
      progressLabel:'Step 7 / 16',
      highlight:['#pbtn'],
      goal:()=>hasStarted&&!paused,
      goalText:'Press Play.',
    onEnter:()=>{
      closeStaff();
      clearToolSelection();
      showTutorialHint('Press Play to let patients arrive and move through the clinic.');
    }
  },
  {
      id:'watch_flow',
      title:'Watch the Clinic Flow',
      text:'Let a few patients move through the clinic.',
      progressLabel:'Step 8 / 16',
      highlight:['#cw','#swait','#srep'],
      goal:()=>totalTreated>=2,
      goalText:'Treat 2 patients.',
    onEnter:()=>{
      showTutorialHint('Watch waiting and reputation while at least 2 patients move through care.');
    }
  },
  {
      id:'public_contract',
      title:'Government Care Requirement',
      text:'The city helped provide this land. In exchange, your hospital must treat enough public patients at low or no profit. If you fall behind, reputation and funding can suffer.',
      progressLabel:'Step 9 / 16',
      highlight:['#gov-contract'],
      goalText:'Review the Government Contract panel, then press Next.',
    onEnter:()=>{
      showTutorialHint('Public care keeps the city deal alive, even when it is not very profitable.');
    }
  },
  {
      id:'grants',
      title:'Apply for Grants',
      text:'Grants help fund public care, staffing, infrastructure, and department upgrades. A Grant Writer improves approval chances, but grants take time and may fail if your hospital is unstable.',
      progressLabel:'Step 10 / 16',
      highlight:['#grantsummary','#staffbtn'],
      goalText:'Open the Grants panel or hire a Grant Writer when available.',
    onEnter:()=>{
      showTutorialHint('Grant Writers improve approvals, but grants still take time and can fail.');
    }
  },
  {
      id:'insurance_contracts',
      title:'Insurance Contracts',
      text:'Insurance contracts increase patient traffic and revenue, but they can overload waiting rooms, staff, and public care obligations. Do not accept every contract just because it pays more.',
      progressLabel:'Step 11 / 16',
      highlight:['#insurance-panel','#contractbtn'],
      goalText:'Open Contracts and review an insurance offer.',
    onEnter:()=>{
      showTutorialHint('More contracts can mean more money, but they also create more hospital pressure.');
    }
  },
  {
      id:'department_upgrades',
      title:'Upgrade Departments',
      text:'Departments are larger systems made from rooms and staff. Upgrading ER, Diagnostics, Operations, or Administration improves how the hospital performs without micromanaging individual patients.',
      progressLabel:'Step 12 / 16',
      highlight:['#departmentpanel'],
      goalText:'Open the Departments panel and review one upgrade.',
    onEnter:()=>{
      showTutorialHint('Departments improve larger hospital systems instead of only one room at a time.');
    }
  },
  {
      id:'employee_needs',
      title:'Watch Employee Needs',
      text:'Employees need breaks, raises, and sometimes vacation. Use the employee tools before low morale turns into burnout or resignations.',
      progressLabel:'Step 13 / 16',
      highlight:['#employeebtn','#staffbtn'],
      goalText:'Press Next to continue.',
    onEnter:()=>{
      showTutorialHint('Staff who are ignored too long will work worse, ask for help, or leave.');
    }
  },
  {
      id:'room_rotation',
      title:'Rotate Before You Place',
      text:'Some rooms fit better when rotated. Use Rotate to make layouts cleaner and keep key pathways open.',
      progressLabel:'Step 14 / 16',
      highlight:['#rotatebtn','#cw'],
      goalText:'Press Next to continue.',
    onEnter:()=>{
      showTutorialHint('Rotation helps larger rooms fit without blocking corridors or entrances.');
    }
  },
  {
      id:'research_tree',
      title:'Use the Tech Tree',
      text:'Research changes how the hospital behaves. Clinical upgrades improve care flow, Diagnostics reduces bottlenecks, Operations protects staff and cleanliness, and Administration improves grants and contracts.',
      progressLabel:'Step 15 / 16',
      highlight:['#researchbtn'],
      goalText:'Open Research and review the available tech branches.',
    onEnter:()=>{
      showTutorialHint('The Tech Tree changes how the whole hospital runs, not just one room.');
    }
  },
  {
      id:'release',
      title:'You Run the Clinic Now',
      text:'The basics are done. Grow carefully, use the new systems, and keep your public care contract healthy.',
      progressLabel:'Step 16 / 16',
    highlight:['#researchbtn','#contractbtn','#employeebtn','#rp'],
    goalText:'Press Finish to continue with full control.',
    onEnter:()=>{
      showTutorialHint('You have full control now. Expand carefully, protect reputation, and keep the city contract in good shape.');
      showToast('Full control unlocked','good');
      addLog('Tutorial complete. Research, contracts, grants, departments, employees, and the larger hospital systems are now in play.','g');
    }
  }
];

applySavedTutorialPreference();

{
  const originalStartGame=startGame;
  startGame=function(){
    originalStartGame();
    if(!tutorialCompleted)startTutorial(true);
    else renderTutorial();
  };

  const originalRestartGame=restartGame;
  restartGame=function(){
    originalRestartGame();
    if(!tutorialCompleted)startTutorial(true);
    else renderTutorial();
  };

  const originalStartSandboxMode=startSandboxMode;
  startSandboxMode=function(){
    tutorialActive=false;
    tutorialFreshScenario=false;
    tutorialStepEvents.clear();
    clearTutorialHighlights();
    originalStartSandboxMode();
    renderTutorial();
  };

  const originalLoadGame=loadGame;
  loadGame=function(){
    originalLoadGame();
    tutorialStepEvents.clear();
    maybeResumeTutorialAfterLoad();
  };

  const originalUpdateUI=updateUI;
  updateUI=function(){
    originalUpdateUI();
    updateTutorialProgress();
  };

  const originalRender=render;
  render=function(){
    originalRender();
    renderTutorialMapOverlay();
  };

  const originalSel=sel;
  sel=function(tool){
    if(!tutorialAllowsTool(tool)){
      const blockType=tutorialStep===0?'demo':tutorialStep===1?'name':tutorialStep===2?'waiting':tutorialStep===3?'gp':'staff';
      showTutorialHint(tutorialBlockedMessage(blockType));
      return;
    }
    originalSel(tool);
  };

  const originalPaintCorridor=paintCorridor;
  paintCorridor=function(x,y){
    if(tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&!hasTutorialFullControl()){
      showTutorialHint('The tutorial already placed the path you need. Focus on the highlighted room step.');
      return;
    }
    originalPaintCorridor(x,y);
  };

  const originalPlaceRoom=placeRoom;
  placeRoom=function(cx,cy){
    if(selTool&&!tutorialAllowsTool(selTool)){
      const blockType=tutorialStep===2?'waiting':tutorialStep===3?'gp':'staff';
      showTutorialHint(tutorialBlockedMessage(blockType));
      return;
    }
    const beforeCount=rooms.length;
    originalPlaceRoom(cx,cy);
    if(rooms.length>beforeCount){
      handleTutorialGhostPlacement(rooms[rooms.length-1]);
    }
  };

  const originalToggleBuildMode=toggleBuildMode;
  toggleBuildMode=function(forceState){
    if(tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&tutorialStep>=2&&tutorialStep<=3&&forceState!==true){
      showTutorialHint('Keep Build Mode on while you place the highlighted clinic rooms.');
      return;
    }
    originalToggleBuildMode(forceState);
  };

  const originalOpenStaff=openStaff;
  openStaff=function(){
    if(!tutorialAllowsStaffMenu()){
      showTutorialHint(tutorialBlockedMessage(
        tutorialStep===0?'demo':
        tutorialStep===1?'name':
        tutorialStep===2?'waiting':
        tutorialStep===3?'gp':
        'play'
      ));
      return;
    }
    originalOpenStaff();
  };

  const originalHireStaff=hireStaff;
  hireStaff=function(id){
    const candidate=staffPool.find(member=>member.id===id)||staff.find(member=>member.id===id&&!member.hired);
    if(!tutorialAllowsHire(candidate)){
      showTutorialHint('For this step, hire Clerical, GP Doctor, Nurse, and Janitor first.');
      return;
    }
    originalHireStaff(id);
  };

  const originalTogglePause=togglePause;
  togglePause=function(){
    if(!tutorialAllowsPauseToggle()){
      showTutorialHint(tutorialBlockedMessage(tutorialStep===0?'demo':'play'));
      return;
    }
    originalTogglePause();
    updateTutorialProgress();
  };

  const originalOpenResearchMenu=openResearchMenu;
  openResearchMenu=function(){
    if(!tutorialAllowsAdvancedMenus('research')){
      showTutorialHint(tutorialBlockedMessage('advanced'));
      return;
    }
    originalOpenResearchMenu();
  };

  const originalOpenContractMenu=openContractMenu;
  openContractMenu=function(){
    if(!tutorialAllowsAdvancedMenus('contracts')){
      showTutorialHint(tutorialBlockedMessage('advanced'));
      return;
    }
    originalOpenContractMenu();
  };

  if(typeof buyAdvertising==='function'){
    const originalBuyAdvertising=buyAdvertising;
    buyAdvertising=function(){
      if(!tutorialAllowsAdvancedMenus('contracts')){
        showTutorialHint(tutorialBlockedMessage('advanced'));
        return;
      }
      originalBuyAdvertising();
    };
  }

  const originalQuitToTitle=quitToTitle;
  quitToTitle=function(){
    originalQuitToTitle();
    renderTutorial();
  };

  const originalBackToGame=backToGame;
  backToGame=function(){
    originalBackToGame();
    renderTutorial();
    updateTutorialProgress();
  };
}

initTutorialDrag();
renderTutorial();
