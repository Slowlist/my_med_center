// Lightweight sound event manager.
// Centralises all SFX playback behind playSound(eventName) so the rest
// of the codebase doesn't have to know about HTMLAudioElement, file
// paths, or volume channels.
//
// Design notes:
//  - Audio files are OPTIONAL. If a file is missing or fails to load,
//    playSound silently no-ops (no console errors, no thrown errors).
//  - Each event is mapped to a channel (ui / alerts / ambience) and a
//    file path under audio/. Effective volume = master * channel.
//  - Volumes are persisted to localStorage under 'mmc_sound_v1'.
//  - A small click handler is registered globally so any element with
//    .btn / .dock-pill / .dock-popup-item / .modal-close auto-plays the
//    'button_click' SFX without per-button wiring.

(function(){
'use strict';

const STORAGE_KEY='mmc_sound_v1';
const DEFAULT_VOLUMES={master:0.7,ui:0.6,alerts:0.8,ambience:0.4};

// Event registry: name -> { channel, src }
// `src` is a path under /audio/. Files are NOT bundled — drop wav/mp3
// files matching these names into /audio/ to enable each effect.
const EVENTS={
  button_click:        {channel:'ui',       src:'audio/button_click.wav'},
  room_placed:         {channel:'ui',       src:'audio/room_placed.wav'},
  invalid_placement:   {channel:'ui',       src:'audio/invalid_placement.wav'},
  money_gained:        {channel:'ui',       src:'audio/money_gained.wav'},
  patient_treated:     {channel:'ambience', src:'audio/patient_treated.wav'},
  research_completed:  {channel:'alerts',   src:'audio/research_completed.wav'},
  grant_approved:      {channel:'alerts',   src:'audio/grant_approved.wav'},
  grant_denied:        {channel:'alerts',   src:'audio/grant_denied.wav'},
  warning:             {channel:'alerts',   src:'audio/warning.wav'},
  emergency_event:     {channel:'alerts',   src:'audio/emergency_event.wav'},
  staff_level_up:      {channel:'alerts',   src:'audio/staff_level_up.wav'},
  game_paused:         {channel:'ui',       src:'audio/game_paused.wav'},
  game_resumed:        {channel:'ui',       src:'audio/game_resumed.wav'}
};

const _cache=new Map();   // src -> HTMLAudioElement (template)
const _missing=new Set(); // srcs known to be missing
let _volumes={...DEFAULT_VOLUMES};
let _muted=false;
let _lastPlayed=new Map();// throttle by event name

// ---- Persistence -----------------------------------------------------
function _load(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return;
    const parsed=JSON.parse(raw);
    if(parsed&&typeof parsed==='object'){
      _volumes={..._volumes,...(parsed.volumes||{})};
      _muted=!!parsed.muted;
    }
  }catch(e){/* ignore */}
}
function _save(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({volumes:_volumes,muted:_muted}));}
  catch(e){/* ignore */}
}
_load();

// ---- Core ------------------------------------------------------------
function _getTemplate(src){
  if(_missing.has(src))return null;
  if(_cache.has(src))return _cache.get(src);
  let audio;
  try{
    audio=new Audio(src);
    audio.preload='auto';
    audio.addEventListener('error',()=>{_missing.add(src);_cache.delete(src);},{once:true});
  }catch(e){_missing.add(src);return null;}
  _cache.set(src,audio);
  return audio;
}

function playSound(eventName){
  if(_muted)return;
  const evt=EVENTS[eventName];
  if(!evt)return; // unknown event names fail silently
  // Throttle so rapid-fire callers don't stack identical sounds.
  const now=(typeof performance!=='undefined'?performance.now():Date.now());
  const last=_lastPlayed.get(eventName)||0;
  if(now-last<60)return;
  _lastPlayed.set(eventName,now);

  const tmpl=_getTemplate(evt.src);
  if(!tmpl)return;
  const vol=getEffectiveVolume(evt.channel);
  if(vol<=0)return;
  // Clone the node so overlapping plays work.
  let inst;
  try{inst=tmpl.cloneNode();}
  catch(e){return;}
  inst.volume=Math.max(0,Math.min(1,vol));
  // play() returns a Promise that may reject if the file is missing or
  // if autoplay is blocked — swallow it.
  try{
    const p=inst.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{
      if(_isMissingError(inst))_missing.add(evt.src);
    });
  }catch(e){/* ignore */}
}

function _isMissingError(el){
  return el&&el.error&&(el.error.code===4||el.error.code===3);
}

function getEffectiveVolume(channel){
  if(_muted)return 0;
  const ch=_volumes[channel];
  return _volumes.master*(ch==null?1:ch);
}

// ---- Settings API ----------------------------------------------------
function setVolume(channel,value){
  if(!(channel in DEFAULT_VOLUMES))return;
  _volumes[channel]=Math.max(0,Math.min(1,Number(value)||0));
  _save();
}
function getVolume(channel){return _volumes[channel];}
function getVolumes(){return {..._volumes};}
function setMuted(v){_muted=!!v;_save();}
function isMuted(){return _muted;}
function listEvents(){return Object.keys(EVENTS);}

// ---- Global button-click hook ----------------------------------------
const CLICK_SELECTOR='.btn,.dock-pill,.dock-popup-item,.modal-close,.sb,.title-menu-btn,.settings-toggle,.settings-chip,.bn-action,.tf-warn-action,.cf-warn-action,.ic-sign-btn';
function _wireClicks(){
  document.addEventListener('click',(e)=>{
    const t=e.target;
    if(!t||!t.closest)return;
    if(t.closest(CLICK_SELECTOR))playSound('button_click');
  },{capture:true,passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_wireClicks);
else _wireClicks();

// ---- Expose ----------------------------------------------------------
window.sound={
  playSound,setVolume,getVolume,getVolumes,setMuted,isMuted,listEvents,
  CHANNELS:Object.keys(DEFAULT_VOLUMES)
};
// Also expose the bare playSound so call sites can be terse.
window.playSound=playSound;

})();
