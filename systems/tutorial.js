const TUTORIAL_PREF_KEY='mmcTutorialCompletedV3';

let tutorialActive=false;
let tutorialStep=0;
let tutorialCompleted=false;
let tutorialCardPosition=null;
let tutorialDragState=null;
let tutorialFreshScenario=false;
let _tutorialRequested=false;
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

function tutorialStepIndexById(id){
  return TUTORIAL_STEPS.findIndex(s=>s.id===id);
}
function tutorialStepIs(id){
  return getTutorialStepDef()?.id===id;
}
function tutorialStepIsAtOrAfter(id){
  const idx=tutorialStepIndexById(id);
  return idx>=0&&tutorialStep>=idx;
}
function tutorialStepIsBefore(id){
  const idx=tutorialStepIndexById(id);
  return idx>=0&&tutorialStep<idx;
}
function hasTutorialFullControl(){
  return !tutorialActive||tutorialCompleted||isSandboxMode||gameOver||tutorialStepIs('release');
}
function getPlayerCorridorTileCount(){
  const floorGrid=getFloorGrid(1);
  if(!floorGrid)return 0;
  const managed=new Set(tutorialManagedTiles.filter(t=>t.floor===1).map(t=>`${t.x},${t.y}`));
  let count=0;
  for(let y=0;y<floorGrid.length;y++){
    const row=floorGrid[y];if(!row)continue;
    for(let x=0;x<row.length;x++){
      if(row[x]==='corridor'&&!managed.has(`${x},${y}`))count++;
    }
  }
  return count;
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
  tutorialGhostState={waiting_room:{completedAt:0,quality:null},gp:{completedAt:0,quality:null}};
  buildMode=false;
  clearToolSelection();
  updateBuildModeButton();
  paused=true;
  updatePauseButton();
  if(currentFloor!==1)setCurrentFloor(1,true);
  updateUI();
  render();
}

function getTutorialStepDef(){
  return TUTORIAL_STEPS[tutorialStep]||null;
}

function shouldDeclutterTutorialUI(){
  return tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&tutorialStepIsBefore('start_clock');
}

function getTutorialPanelSummaryText(panel){
  return panel?.querySelector('summary')?.textContent?.trim()||'';
}

function getTutorialRelevantBuildSectionTitle(){
  const stepId=getTutorialStepDef()?.id;
  if(['build_waiting','build_gp'].includes(stepId))return'Patient Rooms';
  if(stepId==='build_corridor')return'Pathways';
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
  const heatmapBtn2=document.getElementById('heatmapbtn2');
  if(heatmapBtn2)heatmapBtn2.classList.toggle('tutorial-hidden',declutter);

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
  const focusedTool=stepId==='build_waiting'?'waiting_room':stepId==='build_gp'?'gp':stepId==='build_corridor'?'corridor':null;
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
  const advancedLocked=tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&tutorialStepIsBefore('research_basics');
  card.classList.toggle('modal-docked',!!getActiveTutorialModalBox());
  document.getElementById('researchbtn')?.classList.toggle('tutorial-muted',advancedLocked);
  document.getElementById('contractbtn')?.classList.toggle('tutorial-muted',advancedLocked);
  document.getElementById('advertbtn')?.classList.toggle('tutorial-muted',advancedLocked);
  ['researchbtn','grantbtn','contractbtn','deptbtn','delegationbtn','executivebtn'].forEach(id=>{
    document.getElementById(id)?.classList.toggle('early-muted',advancedLocked);
  });
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
    if(typeof selectedCampusId!=='undefined')selectedCampusId='asherville_community_hospital';
    _tutorialRequested=true;
    startGame(selectedDifficulty,'asherville_community_hospital');
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
    ['contractmodal','contractbox'],
    ['delegationmodal','delegationbox']
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
  if(stepId==='placement_logic')return true;
  if(stepId==='build_corridor')return true;
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
    showTutorialHint('Good placement — keeping rooms close means shorter walks and less confusion for patients.');
    addLog(`Good placement for ${ghost.label}. Nearby rooms reduce travel and confusion.`,'g');
    showToast('Good placement','good');
  }else{
    showTutorialHint('That works, but closer rooms reduce travel and confusion.');
    addLog(`${ghost.label} placed away from the suggested spot — it will still work, but closer is better.`,'w');
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
  if(!ghost||!['placement_logic','build_corridor','build_waiting'].includes(getTutorialStepDef()?.id))return;
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
  if(step.id==='placement_logic'){
    const ghosts=getTutorialGhostLayout();
    drawTutorialGhostCorridor();
    drawTutorialGhostRoom(ghosts.waiting_room,'waiting_room');
    drawTutorialGhostRoom(ghosts.gp,'gp');
    ctx.save();
    ctx.font='700 11px Segoe UI, sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='bottom';
    // Waiting area label
    const wxc=(ghosts.waiting_room.c+ghosts.waiting_room.w/2)*T;
    const wyt=ghosts.waiting_room.r*T-6;
    ctx.fillStyle='rgba(70,130,200,0.15)';
    ctx.beginPath();
    ctx.roundRect(wxc-52,wyt-18,104,20,5);
    ctx.fill();
    ctx.fillStyle='rgba(35,85,170,0.90)';
    ctx.fillText('Waiting Area',wxc,wyt);
    // Treatment area label
    const gxc=(ghosts.gp.c+ghosts.gp.w/2)*T;
    const gyt=ghosts.gp.r*T-6;
    ctx.fillStyle='rgba(70,130,200,0.15)';
    ctx.beginPath();
    ctx.roundRect(gxc-58,gyt-18,116,20,5);
    ctx.fill();
    ctx.fillStyle='rgba(35,85,170,0.90)';
    ctx.fillText('Treatment Area',gxc,gyt);
    // Future zones hint — below the practice area
    const futureY=Math.max(ghosts.waiting_room.r,ghosts.gp.r)*T+ghosts.waiting_room.h*T+T*2.5;
    const futureX=(ghosts.waiting_room.c+ghosts.gp.c+ghosts.gp.w)*T/2;
    ctx.font='italic 10px Segoe UI, sans-serif';
    ctx.fillStyle='rgba(90,110,160,0.55)';
    ctx.fillText('Future zones: ER · Diagnostics · Inpatient · Admin',futureX,futureY);
    ctx.restore();
    return;
  }
  if(step.id==='build_corridor'){
    drawTutorialGhostCorridor();
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
  const stepId=getTutorialStepDef()?.id;
  if(stepId==='build_corridor')return tool==='corridor';
  if(stepId==='build_waiting')return tool==='waiting_room'||tool==='corridor';
  if(stepId==='build_gp')return tool==='gp'||tool==='corridor';
  if(tutorialStepIsAtOrAfter('build_corridor'))return !['demolish','luxury_path'].includes(tool);
  return false;
}

function tutorialAllowsStaffMenu(){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return true;
  return tutorialStepIsAtOrAfter('hire_staff');
}

function tutorialAllowsPauseToggle(){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return true;
  return tutorialStepIsAtOrAfter('start_clock');
}

function tutorialAllowsAdvancedMenus(menuType=''){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return true;

  const stepId=getTutorialStepDef()?.id;

  if(menuType==='contracts'&&['grants_contracts','public_contract'].includes(stepId))return true;
  if(menuType==='grants'&&['grants_contracts'].includes(stepId))return true;
  if(menuType==='research'&&stepId==='research_basics')return true;
  if(menuType==='departments'&&['research_basics','grants_contracts'].includes(stepId))return true;
  if(menuType==='delegation'&&stepId==='research_basics')return true;
  if(menuType==='executive'&&stepId==='release')return true;

  return hasTutorialFullControl();
}

function tutorialAllowsHire(candidate){
  if(!tutorialActive||tutorialCompleted||isSandboxMode||gameOver)return true;
  const stepId=getTutorialStepDef()?.id;
  if(stepId!=='hire_staff')return hasTutorialFullControl()||tutorialStepIsAtOrAfter('staff_traits');
  if(!candidate)return true;
  if(candidate.role==='clerical'&&!hasPlayerTutorialHire('clerical'))return true;
  if(candidate.role==='gp_doc'&&!hasPlayerTutorialHire('gp_doc'))return true;
  if(candidate.role==='nurse'&&!hasPlayerTutorialHire('nurse'))return true;
  if(candidate.role==='janitor'&&!hasPlayerTutorialHire('janitor'))return true;
  return false;
}

function tutorialBlockedMessage(type){
  if(type==='welcome')return'Take a moment to read the welcome step, then press Next.';
  if(type==='name')return'Name your hospital first.';
  if(type==='placement')return'Read the placement tip first — press Next to continue.';
  if(type==='corridor')return'Place a few corridor tiles first to connect the entrance.';
  if(type==='waiting')return'Build a Waiting Room next.';
  if(type==='gp')return'Build a GP Office next.';
  if(type==='staff')return'Hire Clerical, a GP Doctor, a Nurse, and a Janitor next.';
  if(type==='traits')return'Read the staff traits tip, then press Next.';
  if(type==='play')return'Press Play to start the clinic day.';
  if(type==='advanced')return'Finish the basic clinic tutorial first.';
  return'Finish the highlighted tutorial step first.';
}

function tutorialBlockedForCurrentStep(){
  const id=getTutorialStepDef()?.id;
  if(id==='welcome')return'welcome';
  if(id==='name_hospital')return'name';
  if(id==='placement_logic')return'placement';
  if(id==='build_corridor')return'corridor';
  if(id==='build_waiting')return'waiting';
  if(id==='build_gp')return'gp';
  if(id==='hire_staff')return'staff';
  if(id==='staff_traits')return'traits';
  if(id==='start_clock')return'play';
  return'advanced';
}

const TUTORIAL_STEPS=[
  {
    id:'welcome',
    title:'Welcome to My Medical Center',
    text:'Left: build palette. Center: your map. Right: goals, warnings, stats. Bottom: hospital controls. Press Next to begin.',
    progressLabel:'Step 1 / 15',
    highlight:['#sidebar','#cw','#rp','.bottom-dock'],
    goalText:'Press Next to start.',
    onEnter:()=>{
      prepareTutorialPracticeScenario();
      showTutorialHint('Take a quick look at the panels around the map, then press Next.');
    }
  },
  {
    id:'name_hospital',
    title:'Name Your Hospital',
    text:'Type a name in the Center Name box. Every clinic deserves an identity.',
    progressLabel:'Step 2 / 15',
    highlight:['#mapbottommeta','#custom-center-name'],
    goal:()=>isTutorialHospitalNamed(),
    goalText:'Enter a custom hospital name.',
    onEnter:()=>{
      const input=document.getElementById('custom-center-name');
      input?.focus();
      input?.select?.();
      showTutorialHint('Give your hospital a name, then press Next.');
    }
  },
  {
    id:'placement_logic',
    title:'Room Placement Matters',
    text:'Keep Waiting and GP close. Group future zones (ER, Diagnostics, Inpatient, Admin) so staff and patients do not cross the whole hospital. Corridors link everything to the entrance.',
    progressLabel:'Step 3 / 15',
    highlight:['#cw'],
    goalText:'Press Next when ready.',
    onEnter:()=>{
      clearToolSelection();
      buildMode=false;
      updateBuildModeButton();
      showTutorialHint('Ghost outlines on the map show good spots. Closer rooms = shorter walks.');
    }
  },
  {
    id:'build_corridor',
    title:'Build a Corridor',
    text:'Patients walk on corridors. Pick the Corridor tool and lay a short path from the entrance toward the highlighted area.',
    progressLabel:'Step 4 / 15',
    highlight:['#sidebar','.rb[data-tool="corridor"]','#cw'],
    goal:()=>getPlayerCorridorTileCount()>=3,
    goalText:'Place at least 3 corridor tiles.',
    onEnter:()=>{
      buildMode=true;
      updateBuildModeButton();
      sel('corridor');
      showTutorialHint('Click and drag with the Corridor tool to lay a path from the entrance.');
    },
    onComplete:()=>{
      addLog('Corridor laid. Your hospital now has a path patients can follow.','g');
      showToast('Path connected','good');
    }
  },
  {
    id:'build_waiting',
    title:'Build a Waiting Room',
    text:'Place a Waiting Room beside the corridor. Patients arrive and queue here before treatment.',
    progressLabel:'Step 5 / 15',
    highlight:['#sidebar','.rb[data-tool="waiting_room"]','#cw'],
    goal:()=>getPlayerTutorialRooms('waiting_room').length>=1,
    goalText:'Place 1 Waiting Room.',
    onEnter:()=>{
      buildMode=true;
      updateBuildModeButton();
      sel('waiting_room');
      showTutorialHint('Place a Waiting Room next to your corridor.');
    }
  },
  {
    id:'build_gp',
    title:'Build a GP Office',
    text:'Place a GP Office close to the Waiting Room. Shorter walks = faster care.',
    progressLabel:'Step 6 / 15',
    highlight:['#sidebar','.rb[data-tool="gp"]','#cw'],
    goal:()=>getPlayerTutorialRooms('gp').length>=1,
    goalText:'Place 1 GP Office.',
    onEnter:()=>{
      buildMode=true;
      updateBuildModeButton();
      sel('gp');
      showTutorialHint('Place a GP Office near the Waiting Room.');
    }
  },
  {
    id:'hire_staff',
    title:'Hire Required Staff',
    text:'Open Staff and hire one Clerical, one GP Doctor, one Nurse, and one Janitor. Each room needs the right role to function.',
    progressLabel:'Step 7 / 15',
    highlight:['#staffbtn'],
    goal:()=>hasPlayerTutorialHire('clerical')&&hasPlayerTutorialHire('gp_doc')&&hasPlayerTutorialHire('nurse')&&hasPlayerTutorialHire('janitor'),
    goalText:'Hire Clerical, GP Doctor, Nurse, and Janitor.',
    onEnter:()=>{
      clearToolSelection();
      buildMode=false;
      updateBuildModeButton();
      showTutorialHint('Open the Staff menu and hire one of each required role.');
    },
    onComplete:()=>{
      addLog('Clinic staffed. Your rooms now have the coverage they need.','g');
      showToast('Clinic staffed','good');
    }
  },
  {
    id:'staff_traits',
    title:'Staff Traits and Needs',
    text:'Every staff member has traits and needs. Traits are permanent bonuses or quirks. Needs (breaks, pay, morale) must be watched in the Employee panel before burnout sets in.',
    progressLabel:'Step 8 / 15',
    highlight:['#staffbtn','#employeebtn'],
    goalText:'Press Next to continue.',
    onEnter:()=>{
      if(typeof closeStaff==='function')closeStaff();
      clearToolSelection();
      showTutorialHint('Use the Employee panel to spot morale and quit-risk warnings early.');
    }
  },
  {
    id:'start_clock',
    title:'Press Play',
    text:'Press Play to start the day. Patients will begin arriving. You can pause at any time.',
    progressLabel:'Step 9 / 15',
    highlight:['#pbtn'],
    goal:()=>hasStarted&&!paused,
    goalText:'Press Play.',
    onEnter:()=>{
      clearToolSelection();
      showTutorialHint('Press Play to let patients arrive.');
    }
  },
  {
    id:'watch_flow',
    title:'Watch Patient Flow',
    text:'Patients arrive, wait, then walk to the GP Office for treatment. Watch them move through your clinic.',
    progressLabel:'Step 10 / 15',
    highlight:['#cw','#swait'],
    goal:()=>totalTreated>=1,
    goalText:'Treat 1 patient.',
    onEnter:()=>{
      showTutorialHint('Follow a patient from arrival to treatment.');
    }
  },
  {
    id:'wait_stress_rep',
    title:'Waiting, Stress, and Reputation',
    text:'Long waits raise Stress. High Stress drains Reputation. When WAIT or STRESS turns red — act fast.',
    progressLabel:'Step 11 / 15',
    highlight:['#swait','#sstress','#srep'],
    goalText:'Press Next to continue.',
    onEnter:()=>{
      showTutorialHint('WAIT and STRESS are your early warning signals.');
    }
  },
  {
    id:'public_contract',
    title:'Asherville Public Care Agreement',
    text:'Asherville granted you this land in exchange for public care. Meet the quota each cycle to keep funding and reputation healthy.',
    progressLabel:'Step 12 / 15',
    highlight:['#gov-contract'],
    goalText:'Review the agreement, then press Next.',
    onEnter:()=>{
      showTutorialHint('The Asherville agreement is on the right side of the screen.');
    }
  },
  {
    id:'research_basics',
    title:'Research Basics',
    text:'Research permanently improves how your hospital runs and unlocks delegation roles, departments, and new rooms. Open Research to see the branches.',
    progressLabel:'Step 13 / 15',
    highlight:['#researchbtn'],
    goalText:'Open Research, then press Next.',
    onEnter:()=>{
      showTutorialHint('Open the Research panel and skim the branches. Pick one direction at a time.');
    }
  },
  {
    id:'grants_contracts',
    title:'Grants vs Contracts',
    text:'Grants fund growth (apply early — they take time). Insurance Contracts add income and volume but pressure your rooms and staff. Use both, but grow deliberately.',
    progressLabel:'Step 14 / 15',
    highlight:['#grantbtn','#contractbtn'],
    goalText:'Skim Grants and Contracts, then press Next.',
    onEnter:()=>{
      showTutorialHint('Open Grants and Contracts to see what is available before signing anything heavy.');
    }
  },
  {
    id:'release',
    title:'Full Control Unlocked',
    text:'The basics are done. Grow carefully, protect the agreement, invest in research, watch staff morale, and use delegation as you scale. The hospital is yours.',
    progressLabel:'Step 15 / 15',
    highlight:['#researchbtn','#contractbtn','#delegationbtn','#executivebtn','#employeebtn','#rp'],
    goalText:'Press Finish to take full control.',
    onEnter:()=>{
      showTutorialHint('Full control unlocked. Expand carefully and keep all systems healthy.');
      showToast('Full control unlocked','good');
      addLog('Tutorial complete. All hospital systems are now in play.','g');
    }
  }
];

applySavedTutorialPreference();
if(typeof window!=='undefined'){
  window.requestTutorial=function(flag){_tutorialRequested=!!flag;};
}

{
  const originalStartGame=startGame;
  startGame=function(...args){
    const wantTutorial=_tutorialRequested;
    _tutorialRequested=false;
    originalStartGame(...args);
    if(wantTutorial&&!tutorialCompleted)startTutorial(true);
    else renderTutorial();
  };

  const originalRestartGame=restartGame;
  restartGame=function(...args){
    const wantTutorial=_tutorialRequested;
    _tutorialRequested=false;
    originalRestartGame(...args);
    if(wantTutorial&&!tutorialCompleted)startTutorial(true);
    else renderTutorial();
  };

  const originalStartSandboxMode=startSandboxMode;
  startSandboxMode=function(...args){
    tutorialActive=false;
    tutorialFreshScenario=false;
    tutorialStepEvents.clear();
    clearTutorialHighlights();
    originalStartSandboxMode(...args);
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
      showTutorialHint(tutorialBlockedMessage(tutorialBlockedForCurrentStep()));
      return;
    }
    originalSel(tool);
  };

  const originalPaintCorridor=paintCorridor;
  paintCorridor=function(x,y){
    if(tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&!hasTutorialFullControl()&&!tutorialAllowsTool('corridor')){
      showTutorialHint(tutorialBlockedMessage(tutorialBlockedForCurrentStep()));
      return;
    }
    originalPaintCorridor(x,y);
  };

  const originalPlaceRoom=placeRoom;
  placeRoom=function(cx,cy){
    if(selTool&&!tutorialAllowsTool(selTool)){
      showTutorialHint(tutorialBlockedMessage(tutorialBlockedForCurrentStep()));
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
    if(tutorialActive&&!tutorialCompleted&&!isSandboxMode&&!gameOver&&!hasTutorialFullControl()&&forceState!==true){
      const stepId=getTutorialStepDef()?.id;
      if(['build_corridor','build_waiting','build_gp'].includes(stepId)){
        showTutorialHint('Keep Build Mode on while you place the highlighted pieces.');
        return;
      }
    }
    originalToggleBuildMode(forceState);
  };

  const originalOpenStaff=openStaff;
  openStaff=function(){
    if(!tutorialAllowsStaffMenu()){
      showTutorialHint(tutorialBlockedMessage(tutorialBlockedForCurrentStep()));
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
      showTutorialHint(tutorialBlockedMessage(tutorialBlockedForCurrentStep()));
      return;
    }
    originalTogglePause();
    updateTutorialProgress();
  };

  const originalOpenGrantMenu=openGrantMenu;
  openGrantMenu=function(){
    if(!tutorialAllowsAdvancedMenus('grants')){
      showTutorialHint(tutorialBlockedMessage('advanced'));
      return;
    }
    originalOpenGrantMenu();
  };

  if(typeof openDeptMenu==='function'){
    const originalOpenDeptMenu=openDeptMenu;
    openDeptMenu=function(){
      if(!tutorialAllowsAdvancedMenus('departments')){
        showTutorialHint(tutorialBlockedMessage('advanced'));
        return;
      }
      originalOpenDeptMenu();
    };
  }

  if(typeof openDelegationPanel==='function'){
    const originalOpenDelegationPanel=openDelegationPanel;
    openDelegationPanel=function(){
      if(!tutorialAllowsAdvancedMenus('delegation')){
        showTutorialHint(tutorialBlockedMessage('advanced'));
        return;
      }
      originalOpenDelegationPanel();
    };
  }

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

  if(typeof openExecutiveModal==='function'){
    const originalOpenExecutiveModal=openExecutiveModal;
    openExecutiveModal=function(){
      if(!tutorialAllowsAdvancedMenus('executive')){
        showTutorialHint(tutorialBlockedMessage('advanced'));
        return;
      }
      originalOpenExecutiveModal();
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
