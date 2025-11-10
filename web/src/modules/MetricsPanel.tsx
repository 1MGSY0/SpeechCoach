import React from 'react';
export const MetricsPanel: React.FC<{text: string}> = ({text}) => (
  <div style={{fontSize:'0.78rem',color:'#c8c8c8',whiteSpace:'pre-line',border:'1px dashed #2a2a2a',padding:'0.6rem',marginTop:'0.5rem',background:'#101114',borderRadius:6}}>
    {text}
  </div>
);
