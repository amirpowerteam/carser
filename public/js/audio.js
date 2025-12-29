// Audio singleton and helper API for Ketab Jibi
(function(){
  if(window.KJAudio) return;
  const audio = window.sharedPlayer || new Audio();
  audio.preload = audio.preload || 'auto';
  try{ audio.crossOrigin = 'anonymous'; }catch(e){}
  window.sharedPlayer = audio;

  const listeners = {};
  const on = (ev, fn) => { audio.addEventListener(ev, fn); listeners[ev] = listeners[ev] || new Set(); listeners[ev].add(fn); };
  const off = (ev, fn) => { try{ audio.removeEventListener(ev, fn); if(listeners[ev]) listeners[ev].delete(fn); }catch(e){} };

  const setSource = async (src) => {
    if(!src) return false;
    let finalSrc = src;
    try{
      if(typeof src === 'string' && src.startsWith('/uploads/')){
        const filename = src.replace(/^\/uploads\//, '');
        finalSrc = `/media/${encodeURIComponent(filename)}`;
      } else if(typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))){
        try{ const u = new URL(src); if(u.origin !== location.origin) finalSrc = `/proxy?url=${encodeURIComponent(src)}`; }catch(e){}
      }
    }catch(e){}

    // quick HEAD check
    try{
      const ctrl = new AbortController(); const id = setTimeout(()=>ctrl.abort(), 4000);
      const res = await fetch(finalSrc, { method: 'HEAD', signal: ctrl.signal }); clearTimeout(id);
      if(!res.ok) return false;
    }catch(e){ return false; }

    audio.src = finalSrc;
    try{ audio.load(); }catch(e){}
    return true;
  };

  const play = async () => { try{ await audio.play(); return true; }catch(e){ return false; } };
  const pause = ()=>{ try{ audio.pause(); }catch(e){} };
  const seek = (t)=>{ try{ audio.currentTime = t; }catch(e){} };
  const setRate = (r)=>{ try{ audio.playbackRate = Number(r)||1; }catch(e){} };

  // persistence helpers
  const saveState = ()=>{
    try{ if(!audio.src) return; const s = { src: audio.src, time: Math.floor(audio.currentTime||0), paused: audio.paused, speed: audio.playbackRate }; localStorage.setItem('kj_player_state', JSON.stringify(s)); }catch(e){}
  };
  const restoreState = async ()=>{
    try{ const s = JSON.parse(localStorage.getItem('kj_player_state')||'null'); if(!s || !s.src) return; audio.src = s.src; audio.currentTime = s.time||0; audio.playbackRate = s.speed||1; if(!s.paused) { try{ await audio.play(); }catch(e){} } }catch(e){}
  };

  // wire periodic save
  setInterval(saveState, 1000);
  audio.addEventListener('pause', saveState);
  audio.addEventListener('play', saveState);

  window.KJAudio = {
    audio,
    on, off,
    setSource, play, pause, seek, setRate,
    saveState, restoreState,
    getState: ()=>({ src: audio.src, time: Math.floor(audio.currentTime||0), paused: audio.paused, speed: audio.playbackRate, duration: audio.duration || 0 })
  };
  // restore once on load
  try{ window.addEventListener('load', ()=>{ window.KJAudio.restoreState().catch(()=>{}); }); }catch(e){}
})();
