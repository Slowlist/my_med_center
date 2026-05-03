// Lightweight animation polish layer.
// Centralises small, optional flourishes layered on top of the existing
// game animations. Everything here checks the user's reduced-motion
// preference and silently no-ops when reduced motion is requested.
//
// Hooks into:
//   - placeRoom            -> expanding ring on canvas (drawRoomPlaceFx)
//   - draw room loop       -> subtle activity pulse (drawRoomActivityFx)
//   - drawPatients/Staff   -> soft ground shadow when moving
//   - completeResearch     -> screen banner
//   - approve/denyGrant    -> screen banner
//   - staff level-up       -> screen banner
//   - warning render       -> slide-in CSS class
//
// All DOM banners share a single floating layer (#anim-banner-layer)
// inserted on first use so we don't pollute index.html.

(function(){
'use strict';

let _reduceMotionMQ=null;
function prefersReducedMotion(){
  if(_reduceMotionMQ===null){
    try{_reduceMotionMQ=window.matchMedia('(prefers-reduced-motion: reduce)');}
    catch(e){_reduceMotionMQ={matches:false};}
  }
  return!!_reduceMotionMQ.matches;
}

// --- DOM banner layer --------------------------------------------------
function _ensureBannerLayer(){
  let layer=document.getElementById('anim-banner-layer');
  if(layer)return layer;
  layer=document.createElement('div');
  layer.id='anim-banner-layer';
  document.body.appendChild(layer);
  return layer;
}

function _showBanner(opts){
  if(prefersReducedMotion())return;
  const layer=_ensureBannerLayer();
  const node=document.createElement('div');
  node.className=`anim-banner anim-banner--${opts.kind||'info'}`;
  node.innerHTML=`
    <span class="anim-banner-icon">${opts.icon||'✨'}</span>
    <div class="anim-banner-copy">
      <span class="anim-banner-title">${_esc(opts.title||'')}</span>
      ${opts.subtitle?`<span class="anim-banner-sub">${_esc(opts.subtitle)}</span>`:''}
    </div>`;
  layer.appendChild(node);
  // Cap concurrent banners to keep things calm.
  while(layer.children.length>3)layer.removeChild(layer.firstChild);
  setTimeout(()=>{
    node.classList.add('anim-banner--out');
    setTimeout(()=>node.remove(),320);
  },opts.duration||1700);
}

function _esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// --- Public DOM helpers ------------------------------------------------
function polishResearchComplete(name){
  _showBanner({kind:'research',icon:'🔬',title:'Research Complete',subtitle:name||'',duration:2000});
}
function polishGrant(approved,name){
  _showBanner({
    kind:approved?'grant-ok':'grant-bad',
    icon:approved?'🏛️':'⛔',
    title:approved?'Grant Approved':'Grant Denied',
    subtitle:name||'',
    duration:1900
  });
}
function polishLevelUp(member,tier){
  const who=member?.name||'Staff';
  const role=tier?.title||'Promoted';
  _showBanner({kind:'levelup',icon:'⭐',title:`${who} → ${role}`,subtitle:'Level Up',duration:1900});
}

// --- Warning slide-in --------------------------------------------------
function polishWarningEnter(el){
  if(!el||prefersReducedMotion())return;
  el.classList.remove('anim-warn-in');
  // force reflow so the animation replays on subsequent renders
  void el.offsetWidth;
  el.classList.add('anim-warn-in');
}

// --- Room placement: timestamp + canvas FX -----------------------------
function polishPlaceRoom(rm){
  if(!rm)return;
  rm._placedAt=(typeof currentAnimTime==='function')?currentAnimTime():Date.now();
}

function drawRoomPlaceFx(ctx,rm,rx,ry,rw,rh){
  if(!rm||!rm._placedAt||prefersReducedMotion())return;
  const now=(typeof currentAnimTime==='function')?currentAnimTime():Date.now();
  const dt=now-rm._placedAt;
  const dur=520;
  if(dt<0||dt>dur)return;
  const t=dt/dur;
  const eased=1-Math.pow(1-t,2);
  const cx=rx+rw/2,cy=ry+rh/2;
  const maxR=Math.max(rw,rh)*0.75;
  const r=10+eased*maxR;
  const a=(1-t)*0.55;
  ctx.save();
  ctx.strokeStyle=`rgba(120,200,255,${a})`;
  ctx.lineWidth=2.2;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.stroke();
  ctx.fillStyle=`rgba(180,220,255,${a*0.25})`;
  ctx.fillRect(rx,ry,rw,rh);
  ctx.restore();
}

// --- Room activity pulse ----------------------------------------------
// Brief glow boost when treatment completes inside a room. Caller pokes
// `pulseRoomActivity(rm)` whenever that event fires; renderer reads it.
function pulseRoomActivity(rm){
  if(!rm)return;
  rm._pulseAt=(typeof currentAnimTime==='function')?currentAnimTime():Date.now();
}

function drawRoomActivityFx(ctx,rm,rx,ry,rw,rh){
  if(!rm||!rm._pulseAt||prefersReducedMotion())return;
  const now=(typeof currentAnimTime==='function')?currentAnimTime():Date.now();
  const dt=now-rm._pulseAt;
  const dur=600;
  if(dt<0||dt>dur)return;
  const t=dt/dur;
  const a=(1-t)*0.45;
  ctx.save();
  ctx.strokeStyle=`rgba(140,230,170,${a})`;
  ctx.lineWidth=2;
  ctx.strokeRect(rx-1,ry-1,rw+2,rh+2);
  ctx.restore();
}

// --- Movement shadow (patients & staff) -------------------------------
function drawMovementShadow(ctx,x,y,scale){
  if(prefersReducedMotion())return;
  const t=(typeof currentAnimTime==='function')?currentAnimTime():Date.now();
  const wob=Math.sin(t/180+x*0.01)*0.25+1;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(x,y+8*scale,5*scale*wob,1.8*scale,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// --- Expose ------------------------------------------------------------
window.animPolish={
  prefersReducedMotion,
  polishResearchComplete,
  polishGrant,
  polishLevelUp,
  polishWarningEnter,
  polishPlaceRoom,
  drawRoomPlaceFx,
  pulseRoomActivity,
  drawRoomActivityFx,
  drawMovementShadow
};

})();
