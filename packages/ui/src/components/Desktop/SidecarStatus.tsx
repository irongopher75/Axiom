// packages/ui/src/components/Desktop/SidecarStatus.tsx
// ML Engine sidecar status indicator using pure Tauri

import React, { useState, useEffect } from 'react';
import { useDesktop } from '../../hooks/useDesktop';

export function SidecarStatus() {
  const [status, setStatus] = useState<'ready' | 'starting' | 'failed' | 'crashed'>('starting');
  const desktop = useDesktop();

  useEffect(() => {
    // Initial status check
    desktop.getSidecarStatus().then(setStatus);

    // Listen for sidecar ready event
    const unsubscribe = desktop.onSidecarStatus(() => {
      setStatus('ready');
    });

    return () => unsubscribe();
  }, [desktop]);

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return '#00FF41';
      case 'starting': return '#FF9500';
      case 'failed':
      case 'crashed': return '#FF2244';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ready': return 'ML ENGINE READY';
      case 'starting': return 'ML ENGINE STARTING...';
      case 'failed': return 'ML ENGINE FAILED';
      case 'crashed': return 'ML ENGINE CRASHED';
      default: return 'ML ENGINE UNKNOWN';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '15px' }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: getStatusColor(),
        boxShadow: status === 'ready' ? '0 0 8px rgba(0, 255, 65, 0.4)' : 'none'
      }} />
      <span style={{
        fontSize: '9px',
        color: '#606058',
        fontFamily: 'IBM Plex Mono, monospace',
        letterSpacing: '0.5px'
      }}>
        {getStatusText()}
      </span>
    </div>
  );
}
