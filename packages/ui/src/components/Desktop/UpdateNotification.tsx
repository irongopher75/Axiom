// packages/ui/src/components/Desktop/UpdateNotification.tsx
// Update notification using pure Tauri updater plugin

import React, { useState, useEffect } from 'react';
import { useDesktop } from '../../hooks/useDesktop';

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const desktop = useDesktop();

  useEffect(() => {
    const unsubs = [
      desktop.onUpdateAvailable((info) => setUpdateInfo(info)),
      desktop.onUpdateProgress((p) => setProgress(p))
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [desktop]);

  if (!updateInfo) return null;

  const handleUpdate = async () => {
    try {
      await desktop.installUpdate();
    } catch (err) {
      console.error('Update installation failed:', err);
    }
  };

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
            onClick={handleUpdate}
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
