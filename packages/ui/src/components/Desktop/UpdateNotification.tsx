// packages/ui/src/components/Desktop/UpdateNotification.tsx
// Shown when electron-updater detects a new version
// Appears as a slim banner at top of screen

import React, { useState, useEffect } from 'react';
import { config } from '../../config/api';

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!config.isDesktop || !window.axiomDesktop) return;

    const unsubs = [
      window.axiomDesktop.onUpdateAvailable((info: any) => setUpdateInfo(info)),
      window.axiomDesktop.onUpdateProgress((p: number) => setProgress(p))
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (!config.isDesktop || !updateInfo) return null;

  return (
    <div style={{
      background: '#FF9500',
      color: '#000',
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '6px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      fontFamily: 'IBM Plex Mono, monospace',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
    }}>
      <span>AXIOM v{updateInfo.version} AVAILABLE</span>
      
      {progress > 0 && progress < 100 ? (
        <div style={{ width: '100px', height: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#000' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => window.axiomDesktop.installUpdate()}
            style={{ 
              background: '#000', 
              color: '#FF9500', 
              border: 'none', 
              padding: '2px 8px', 
              fontSize: '10px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            UPDATE NOW
          </button>
          <button 
            onClick={() => setUpdateInfo(null)}
            style={{ 
              background: 'transparent', 
              color: '#000', 
              border: '1px solid #000', 
              padding: '2px 8px', 
              fontSize: '10px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
}
