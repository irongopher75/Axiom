import React, { useEffect, useState } from 'react';
import useTerminalStore from '../../store/useTerminalStore';
import { getMe } from '../../api/index';
import { useNavigate } from 'react-router-dom';
import { SidecarStatus } from '../Desktop/SidecarStatus';

const MODES = [
    { key: 'F1', label: 'EQUITIES' },
    { key: 'F2', label: 'FIXED INCOME' },
    { key: 'F3', label: 'FOREX' },
    { key: 'F4', label: 'COMMODITIES' },
    { key: 'F5', label: 'CRYPTO' },
    { key: 'F6', label: 'SATELLITE' },
    { key: 'F7', label: 'FLEET' },
    { key: 'F8', label: 'AVIATION' },
    { key: 'F9', label: 'MACRO' },
];

const Header = ({ onCommandPalette }) => {
    const activeMode = useTerminalStore(state => state.activeMode);
    const setActiveMode = useTerminalStore(state => state.setActiveMode);
    const isLive = useTerminalStore(state => state.isLive);
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const liveData = useTerminalStore(state => state.equityPrices[activeSymbol]);
    const currency = liveData?.currency || 'USD';
    const currencySign = currency === 'INR' ? '₹' : currency === 'USDT' ? '₮' : '$';
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        getMe().then(res => setIsAdmin(res.data?.is_superuser)).catch(() => {});
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false })), 1000);
        return () => clearInterval(timer);
    }, []);

    // Bind F1-F9 keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            const match = MODES.find(m => m.key === e.key || m.key === e.code?.replace('Key', ''));
            if (match && !e.metaKey && !e.ctrlKey && !e.altKey) {
                // Only intercept actual F-key presses
                if (e.key.startsWith('F') && parseInt(e.key.slice(1)) >= 1 && parseInt(e.key.slice(1)) <= 9) {
                    e.preventDefault();
                    setActiveMode(match.label);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div style={{ background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Top Bar: Logo, Active Symbol, Status */}
            <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: '1px solid #111' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ color: '#FF6600', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px', fontFamily: 'IBM Plex Mono' }}>
                        ▸ AXIOM
                    </div>
                    {activeSymbol && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'IBM Plex Mono' }}>
                            <span style={{ color: '#555' }}>ACTIVE: </span>
                            <span style={{ color: '#FFF' }}>{activeSymbol}</span>
                            {liveData && liveData.price != null && (
                                <>
                                    <span style={{ color: '#FFF', fontSize: '16px' }}>
                                        {currencySign}{Number(liveData.price).toLocaleString()}
                                    </span>
                                    {liveData.changePercent != null && (
                                        <span style={{ color: liveData.up ? '#00FF41' : '#FF2244', fontSize: '11px' }}>
                                            {liveData.up ? '▲' : '▼'}{Math.abs(liveData.changePercent).toFixed(2)}%
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', fontFamily: 'IBM Plex Mono' }}>
                    <span
                        onClick={onCommandPalette}
                        style={{ color: '#555', cursor: 'pointer', border: '1px solid #1A1A1A', padding: '2px 8px', fontSize: '10px', letterSpacing: '0.05em' }}
                        title="Press / to open command palette"
                    >
                        / CMD
                    </span>
                    {isAdmin && (
                        <span
                            onClick={() => navigate('/admin')}
                            style={{ color: '#FF6600', cursor: 'pointer', border: '1px solid #FF660033', background: 'rgba(255,102,0,0.1)', padding: '2px 8px', fontSize: '10px', letterSpacing: '0.05em' }}
                        >
                            ★ ADMIN
                        </span>
                    )}
                    <SidecarStatus />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                            width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block',
                            background: isLive ? '#FF6600' : '#333',
                            boxShadow: isLive ? '0 0 6px #FF6600' : 'none',
                            animation: isLive ? 'pulse 2s infinite' : 'none'
                        }} />
                        <span style={{ color: isLive ? '#00FF41' : '#555' }}>{isLive ? 'CONNECTED' : 'OFFLINE'}</span>
                    </div>
                    <div style={{ color: '#FFFFFF' }}>{time} IST</div>
                    <span
                        onClick={() => {
                            localStorage.removeItem('token');
                            navigate('/login');
                        }}
                        style={{ color: '#FF2244', cursor: 'pointer', border: '1px solid #FF224433', padding: '2px 8px', fontSize: '10px', letterSpacing: '0.05em' }}
                    >
                        ✖ LOGOUT
                    </span>
                </div>
            </div>

            {/* Function Key Bar */}
            <div style={{ height: '28px', display: 'flex', alignItems: 'center', gap: '2px', padding: '0 4px', overflowX: 'auto' }}>
                {MODES.map(m => {
                    const isActive = activeMode === m.label;
                    return (
                        <button
                            key={m.key}
                            onClick={() => setActiveMode(m.label)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px', padding: '0 10px', height: '24px', border: 'none',
                                cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: '11px', whiteSpace: 'nowrap',
                                background: isActive ? '#FF6600' : 'transparent',
                                color: isActive ? '#000' : '#666',
                                transition: 'background 0.1s, color 0.1s',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.target.style.color = '#FFF'; e.target.style.background = '#1A1A1A'; } }}
                            onMouseLeave={e => { if (!isActive) { e.target.style.color = '#666'; e.target.style.background = 'transparent'; } }}
                        >
                            <span style={{ fontSize: '9px', opacity: isActive ? 1 : 0.5 }}>{m.key}</span>
                            {m.label}
                        </button>
                    );
                })}
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
        </div>
    );
};

export default Header;
