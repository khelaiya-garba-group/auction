import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loader = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ padding: '3rem' }}>
      <Loader2 className="animate-spin" size={48} color="var(--accent-green)" />
      <p className="text-muted" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>{message}</p>
    </div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="glass-panel" style={{ height: '350px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '100%', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
      <div style={{ width: '70%', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 2s infinite' }}></div>
      <div style={{ width: '40%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 2s infinite' }}></div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
