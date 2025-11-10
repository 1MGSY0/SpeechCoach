export interface SocketCallbacks {
  onAudioStats: (frames: number, bytes: number) => void;
  onPartial: (text: string) => void;
  onToken: (tok: string) => void;
  onClause: (clause: string) => void;
  onMetrics: (m: any) => void;
  onDebug: (d: string) => void;
  onError: (e: string) => void;
  onUserLevel?: (level: number) => void; // optional: mic RMS level 0..1
  onUserSpeaking?: (speaking: boolean) => void; // optional: simple VAD flag
}

// Dev: use Vite proxy with relative paths to avoid CORS/host issues.
// REST calls use '/api/*' and WebSockets use ws(s)://location.host

export async function initSession(options?: { llm?: 'stub'|'llama' }){
  const q = options?.llm ? ('?llm='+options.llm) : '';
  const r = await fetch('/api/init'+q);
  if(!r.ok) throw new Error('init failed '+r.status);
  return r.json();
}

export async function getBackendStatus(){
  const r = await fetch('/api/status');
  if(!r.ok) throw new Error('status failed '+r.status);
  return r.json();
}

export async function connectSockets(cb: SocketCallbacks){
  let audioSocket: WebSocket | null = null;
  let eventSocket: WebSocket | null = null;
  let mediaStream: MediaStream | null = null;
  // Playback context for TTS audio
  let playCtx: AudioContext | null = null;
  let playHead = 0;
  let assistantMuteUntil = 0; // ms epoch; don't send mic audio while assistant is playing
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } as MediaTrackConstraints
    } as MediaStreamConstraints);
    cb.onDebug('getUserMedia granted');
  }catch(e:any){ cb.onError('getUserMedia error '+e?.message||e); return null; }
  // Build WS URLs early and try connecting events WS first so we get server-side debug even if audio pipeline fails
  const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const audioUrl = `${wsProto}//${location.host}/ws/audio`;
  const eventsUrl = `${wsProto}//${location.host}/ws/events`;
  cb.onDebug(`Connecting WS (relative): audio=${audioUrl} events=${eventsUrl}`);
  // Set up audio pipeline (wrapped in try/catch so failures don't block WS connection attempts)
  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  try{
    audioCtx = new (window.AudioContext|| (window as any).webkitAudioContext)();
    cb.onDebug(`AudioContext created (sampleRate=${audioCtx.sampleRate})`);
    const source = audioCtx.createMediaStreamSource(mediaStream);
    // ScriptProcessor requires a power-of-two buffer size. Use 4096 for wide compatibility.
    processor = audioCtx.createScriptProcessor(4096,1,1);
    source.connect(processor); processor.connect(audioCtx.destination);
  }catch(e:any){
    cb.onError('Audio pipeline init error: '+(e?.message||e));
  }
  try{
    audioSocket = new WebSocket(audioUrl);
  }catch(e:any){ cb.onError('Audio WS create failed: '+(e?.message||e)); return null; }
  audioSocket.binaryType='arraybuffer';
  audioSocket.onopen = () => cb.onDebug('Audio WS connected');
  audioSocket.onerror = () => cb.onError('Audio WS error');
  audioSocket.onclose = () => cb.onDebug('Audio WS closed');
  let frames=0, bytes=0;
  if(processor && audioCtx){
    let vadSpeaking = false; const vadHigh = 0.03; const vadLow = 0.02;
    let sending = false; let hangUntil = 0; const hangMs = 200; // keep sending briefly after speech end
    const preBufs: Array<ArrayBuffer> = []; const preLimit = 3; // a little preroll to avoid cutting starts
    processor.onaudioprocess = e => {
      if(!audioSocket || audioSocket.readyState!==1) return;
      const input = e.inputBuffer.getChannelData(0);
      const targetRate=16000; const sr=audioCtx!.sampleRate; const ratio = sr/targetRate;
      // Simple RMS level for user speaking indicator
      let sumsq = 0; for(let i=0;i<input.length;i++){ const s=input[i]; sumsq += s*s; }
      const rms = Math.sqrt(sumsq / input.length);
      cb.onUserLevel?.(rms);
      const now = performance.now();
      if(!vadSpeaking && rms > vadHigh){ vadSpeaking = true; cb.onUserSpeaking?.(true); sending = true; }
      else if(vadSpeaking && rms < vadLow){ vadSpeaking = false; cb.onUserSpeaking?.(false); hangUntil = now + hangMs; }
      const samples:number[]=[]; for(let i=0;i<input.length;i+=ratio){ samples.push(input[Math.floor(i)]); }
      const buf = new ArrayBuffer(samples.length*2); const view = new DataView(buf);
      for(let i=0;i<samples.length;i++){ const s=Math.max(-1,Math.min(1,samples[i])); view.setInt16(i*2, s<0?s*0x8000:s*0x7FFF, true); }
      const shouldSend = (sending || now < hangUntil) && (Date.now() > assistantMuteUntil);
      if(shouldSend){
        // if just started, flush preroll
        if(preBufs.length){ try{ preBufs.forEach(b => audioSocket!.send(b)); frames += preBufs.length; bytes += preBufs.reduce((a,b)=>a+b.byteLength,0); preBufs.length=0; }catch{} }
        try{ audioSocket!.send(buf); frames++; bytes += buf.byteLength; cb.onAudioStats(frames, bytes); }catch{}
      } else {
        // keep small preroll history but don't send
        preBufs.push(buf); if(preBufs.length>preLimit) preBufs.shift();
      }
    };
  } else {
    cb.onDebug('Audio processor not available; continuing with WS only');
  }
  try{
    eventSocket = new WebSocket(eventsUrl);
  }catch(e:any){ cb.onError('Events WS create failed: '+(e?.message||e)); try{audioSocket?.close();}catch{} return null; }
  eventSocket.onopen = () => cb.onDebug('Events WS connected');
  eventSocket.onerror = () => cb.onError('Events WS error');
  eventSocket.onclose = () => cb.onDebug('Events WS closed');
  eventSocket.onmessage = ev => {
    let msg: any; try{ msg=JSON.parse(ev.data);}catch{ return; }
    switch(msg.event){
      case 'debug': cb.onDebug(msg.text); break;
      case 'partial': cb.onPartial(msg.text); break;
      case 'token': cb.onToken(msg.text); break;
      case 'clause': {
        cb.onClause(msg.text);
        if(msg.audio_b64){
          try{
            if(!playCtx){ playCtx = new (window.AudioContext|| (window as any).webkitAudioContext)(); playHead = playCtx.currentTime; }
            const binary = atob(msg.audio_b64);
            const bytes = new Uint8Array(binary.length);
            for(let i=0;i<binary.length;i++){ bytes[i] = binary.charCodeAt(i); }
            playCtx.decodeAudioData(bytes.buffer).then(buf => {
              const src = playCtx!.createBufferSource();
              src.buffer = buf;
              src.connect(playCtx!.destination);
              const when = Math.max(playCtx!.currentTime, playHead);
              src.start(when);
              playHead = when + buf.duration;
              // Mute mic streaming while assistant audio plays (plus small margin)
              const nowMs = Date.now();
              const addMs = Math.ceil((playHead - playCtx!.currentTime) * 1000) + 120;
              assistantMuteUntil = nowMs + addMs;
            }).catch(()=>{});
          }catch{}
        }
        break;
      }
      case 'metrics': cb.onMetrics(msg); break;
    }
  };
  // Optional: timeout if sockets fail to open soon
  setTimeout(() => {
    if(audioSocket && audioSocket.readyState !== 1){ cb.onError('Audio WS not connected (timeout)'); }
    if(eventSocket && eventSocket.readyState !== 1){ cb.onError('Events WS not connected (timeout)'); }
  }, 3000);
  const stopHandler = () => {
    try{ audioSocket?.send(JSON.stringify({control:'stop'})); }catch{}
    try{ processor?.disconnect(); }catch{}
    try{ audioCtx?.close(); }catch{}
    try{ playCtx?.close(); }catch{}
    try{ audioSocket?.close(); }catch{}
    try{ eventSocket?.close(); }catch{}
    try{ mediaStream?.getTracks().forEach(t=>t.stop()); }catch{}
    window.removeEventListener('speechcoach-stop', stopHandler);
  };
  window.addEventListener('speechcoach-stop', stopHandler);
  return {audioSocket, eventSocket};
}
