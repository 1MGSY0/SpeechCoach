import React, { useState, useEffect, useRef } from 'react';
import { DebugPanel } from './DebugPanel';
import { MetricsPanel } from './MetricsPanel';
import { TranscriptPanel } from './TranscriptPanel';
import { Avatar } from './Avatar';
import { initSession, connectSockets, getBackendStatus } from './session';

export const App: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partials, setPartials] = useState('');
  const [assistant, setAssistant] = useState('');
  const [metrics, setMetrics] = useState<string>('');
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [userLevel, setUserLevel] = useState(0);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const framesSent = useRef(0); const bytesSent = useRef(0); const partialCount = useRef(0); const tokenCount = useRef(0); const clauseCount = useRef(0); const startTs = useRef<number>(0);

  function pushDebug(line: string){
    setDebugLines(d => [...d, line]);
    if(line.startsWith('Assistant thinking')){ setAssistantThinking(true); }
    if(line.includes('LLM: first token') || line.includes('llm_done')){ setAssistantThinking(false); }
    if(line.includes('Audio WS connected') || line.includes('Events WS connected')){ setLoading(false); }
  }

  interface MetricsSummary { ttfb_first_partial_ms:number; ttfb_first_token_ms:number; ttfb_first_audio_ms:number; e2e_ms:number; }

  async function start(): Promise<void>{
    if(running) return;
    setLoading(true);
    pushDebug('Starting: init backend (stub LLM)');
  const initStatus = await initSession({ llm: 'stub' }).catch((e: unknown) => { pushDebug('Init failed: '+ String(e)); return null; });
    if(!initStatus){ setLoading(false); return; }
    pushDebug('Init status: '+JSON.stringify(initStatus));
    startTs.current = performance.now();
    // Fetch status for immediate debug context
    try {
      const status = await getBackendStatus();
      pushDebug('Backend status: '+JSON.stringify(status));
    } catch(e:any){ pushDebug('Status fetch failed: '+(e?.message||e)); }
    const conn = await connectSockets({
      onAudioStats: (f: number, b: number)=>{ framesSent.current=f; bytesSent.current=b; },
      onPartial: (text: string)=>{ setPartials(text); partialCount.current++; },
      onToken: (tok: string)=>{ setAssistant((a: string)=>a+tok); tokenCount.current++; setAssistantSpeaking(true); window.setTimeout(()=>setAssistantSpeaking(false), 250); },
      onClause: (cl: string)=>{ setAssistant((a: string)=>a+"\n[CLAUSE] "+cl+"\n"); clauseCount.current++; setAssistantSpeaking(true); window.setTimeout(()=>setAssistantSpeaking(false), 600); },
      onMetrics: (m: MetricsSummary)=>{
        const elapsed = (performance.now()-startTs.current).toFixed(0);
        setMetrics(`Frames sent: ${framesSent.current} (bytes ${bytesSent.current})\nPartials: ${partialCount.current} | Tokens: ${tokenCount.current} | Clauses: ${clauseCount.current}\nElapsed (client): ${elapsed} ms\nTTFB partial: ${m.ttfb_first_partial_ms} ms\nTTFB token: ${m.ttfb_first_token_ms} ms\nTTFB audio: ${m.ttfb_first_audio_ms} ms\nE2E: ${m.e2e_ms} ms`);
      },
      onDebug: (d: string)=> pushDebug(d),
      onError: (e: string)=> pushDebug('Socket error: '+ e),
      onUserLevel: (lvl: number)=> setUserLevel(lvl),
      onUserSpeaking: (sp: boolean)=> setUserSpeaking(sp)
    });
    if(conn){ setRunning(true); pushDebug('Sockets connected.'); } else { pushDebug('Socket connection failed.'); }
    setLoading(false);
  }

  function stop(): void {
    window.dispatchEvent(new CustomEvent('speechcoach-stop'));
    setRunning(false);
    pushDebug('Stop requested');
    // Allow a new session to start cleanly
    setAssistant('');
    setPartials('');
    setMetrics('');
    setUserLevel(0);
    setUserSpeaking(false);
    setAssistantSpeaking(false);
  }

  return (
    <div style={{display:'flex',flexDirection:'row',gap:'1.5rem',background:'#0e0e10',color:'#e0e0e0',minHeight:'100vh',padding:'1rem'}}>
      <div style={{flex:2,minWidth:360}}>
        <h2>SpeechCoach React Prototype</h2>
        <div style={{marginBottom:8}}>
          <button disabled={loading||running} onClick={start}>Start Mic</button>
          <button disabled={!running} onClick={stop}>Stop</button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <div title={`User level: ${userLevel.toFixed(3)}`} style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:12,height:12,borderRadius:6,background: userSpeaking? '#3bd16f' : '#4a4a4a', boxShadow: userSpeaking? '0 0 8px #3bd16f66':'none'}}/>
            <span style={{fontSize:12,color:'#aaa'}}>User</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:12,height:12,borderRadius:6,background: assistantSpeaking? '#4db7ff' : '#4a4a4a', boxShadow: assistantSpeaking? '0 0 8px #4db7ff66':'none'}}/>
            <span style={{fontSize:12,color:'#aaa'}}>Assistant</span>
          </div>
          {assistantThinking && <div style={{fontSize:12,color:'#d0d0d0',padding:'2px 6px',background:'#222',borderRadius:4}}>Assistant thinking…</div>}
        </div>
        {loading && <div style={{padding:'0.5rem',background:'#15161a',border:'1px solid #2a2a2a',borderRadius:6}}>Loading models / connecting…</div>}
        <TranscriptPanel label='User Partial Transcript' text={partials} />
        <TranscriptPanel label='Assistant Stream' text={assistant} />
        <MetricsPanel text={metrics} />
        <DebugPanel lines={debugLines} />
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
        <Avatar running={running} />
        <div style={{fontSize:'0.75rem',color:'#999',marginTop:8}}>{running? 'Running' : 'Idle'}</div>
      </div>
    </div>
  );
};
