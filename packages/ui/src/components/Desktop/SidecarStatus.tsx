// packages/ui/src/components/Desktop/SidecarStatus.tsx
// Small indicator shown in header — only renders when platform === 'desktop'
// Shows: Python sidecar connected/reconnecting/failed

import React, { useState, useEffect } from 'react';
import { config } from '../../config/api';

export function SidecarStatus() {
  const [status, setStatus] = useState<'ready' | 'starting' | 'failed' | 'crashed'>('starting');

  useEffect(() => {
    // Only run on desktop
    if (!config.isDesktop || !window.axiomDesktop) return;

    // Listen to window.axiomDesktop.onSidecarStatus
    const unsubscribe = window.axiomDesktop.onSidecarStatus((s: { status: string }) => {
      setStatus(s.status as any);
    });

    return () => unsubscribe();
  }, []);

  if (!config.isDesktop) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return '#00FF41'; // Green
      case 'starting': return '#FF9500'; // Amber
      case 'failed':
      case 'crashed': return '#FF2244'; // Red
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
