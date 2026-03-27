import React, { useState } from 'react';
import IntelligencePanel from './IntelligencePanel';
import AiAnalystPanel from './AiAnalystPanel';

const IntelligenceTabs = () => {
    const [activeTab, setActiveTab] = useState('ANALYST');

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
            <div style={{ display: 'flex', background: '#0F1215', borderBottom: '1px solid #1A1A1A', flexShrink: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
                <div 
                    onClick={() => setActiveTab('SIGNALS')}
                    style={{ flex: 1, padding: '7px 4px', textAlign: 'center', fontSize: '9px', letterSpacing: '0.8px', color: activeTab === 'SIGNALS' ? '#FF9500' : '#606058', cursor: 'pointer', borderRight: '1px solid #1A1A1A', background: activeTab === 'SIGNALS' ? 'rgba(255,149,0,0.05)' : 'transparent', borderBottom: activeTab === 'SIGNALS' ? '2px solid #FF9500' : 'none', textTransform: 'uppercase', transition: 'all 0.1s' }}
                >
                    ML SIGNALS
                </div>
                <div 
                    onClick={() => setActiveTab('ANALYST')}
                    style={{ flex: 1, padding: '7px 4px', textAlign: 'center', fontSize: '9px', letterSpacing: '0.8px', color: activeTab === 'ANALYST' ? '#06B6D4' : '#606058', cursor: 'pointer', background: activeTab === 'ANALYST' ? 'rgba(6,182,212,0.05)' : 'transparent', borderBottom: activeTab === 'ANALYST' ? '2px solid #06B6D4' : 'none', textTransform: 'uppercase', transition: 'all 0.1s' }}
                >
                    ◆ AI ANALYST
                </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 'SIGNALS' ? <IntelligencePanel /> : <AiAnalystPanel />}
            </div>
        </div>
    );
};

export default IntelligenceTabs;
