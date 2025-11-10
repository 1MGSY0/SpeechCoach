import React from 'react';
export const TranscriptPanel: React.FC<{label: string; text: string}> = ({label, text}) => (
  <div style={{marginTop:'0.5rem'}}>
    <strong>{label}</strong>
    <div style={{whiteSpace:'pre-wrap',border:'1px solid #2a2a2a',padding:'0.6rem',marginTop:'0.3rem',height:180,overflow:'auto',background:'#141416',borderRadius:6}}>{text}</div>
  </div>
);
