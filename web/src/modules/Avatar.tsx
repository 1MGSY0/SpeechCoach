import React, { useEffect, useState } from 'react';

export const Avatar: React.FC<{running: boolean}> = ({running}) => {
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if(!running){ setMouthOpen(false); return; }
    let id = window.setInterval(()=>{
      // Fake mouth animation timer; in a real app, drive from audio RMS or visemes
      setMouthOpen(v=>!v);
    }, 120);
    return ()=> window.clearInterval(id);
  }, [running]);
  return (
    <div style={{width:180,height:180,borderRadius:6,background:'#1d1f24',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',boxShadow:'0 0 0 2px #2a2a2a inset'}}>
      <div style={{position:'absolute',bottom:36,width:60,height: mouthOpen? 60:28, background: mouthOpen? '#d24':'#a33', borderRadius:'0 0 40px 40px', transition:'height .08s ease, background .15s'}}/>
    </div>
  );
};
