import React from 'react';

export const DebugPanel: React.FC<{lines: string[]}> = ({lines}) => (
  <div style={{fontSize:'0.78rem',color:'#c8c8c8',whiteSpace:'pre-line',border:'1px solid #2a2a2a',padding:'0.6rem',marginTop:'0.5rem',background:'#101114',borderRadius:6,height:160,overflow:'auto'}}>
    {lines.join('\n')}
  </div>
);
