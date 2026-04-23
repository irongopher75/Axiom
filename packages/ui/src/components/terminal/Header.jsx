import React, { useEffect, useState } from 'react';
import useTerminalStore from '../../store/useTerminalStore';
import { getMe, logout } from '../../api/index';
import { useNavigate } from 'react-router-dom';
import { SidecarStatus } from '../Desktop/SidecarStatus';
import { AXIOM_CONFIG } from '../../config/constants';

const MODES = AXIOM_CONFIG.MODES;

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
        <div className="flex flex-col flex-shrink-0 bg-[#0D0D0D] border-b border-[#1A1A1A]">
            {/* Top Bar: Logo, Active Symbol, Status */}
            <div className="h-8 flex items-center justify-between px-3 border-b border-[#111]">
                <div className="flex items-center gap-4">
                    <div className="text-axiom-orange font-bold text-sm tracking-[0.2em] font-mono">
                        ▸ AXIOM
                    </div>
                    {activeSymbol && (
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-gray-600">ACTIVE:</span>
                            <span className="text-white font-bold">{activeSymbol}</span>
                            {liveData && liveData.price != null && (
                                <div className="flex items-center gap-2 ml-2">
                                    <span className="text-white text-base">
                                        {currencySign}{Number(liveData.price).toLocaleString()}
                                    </span>
                                    {liveData.changePercent != null && (
                                        <span className={`text-[10px] font-bold ${liveData.up ? 'text-axiom-green' : 'text-axiom-red'}`}>
                                            {liveData.up ? '▲' : '▼'}{Math.abs(liveData.changePercent).toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-[10px] font-mono font-black uppercase tracking-widest">
                    <button
                        onClick={onCommandPalette}
                        className="flex items-center gap-2 text-gray-500 hover:text-white border border-[#1A1A1A] hover:border-axiom-orange/50 px-2 py-0.5 transition-all bg-black/40 rounded-sm"
                        title="Press / to open command palette"
                    >
                        <span className="text-axiom-orange opacity-60">/</span> CMD
                    </button>
                    
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="text-axiom-orange border border-axiom-orange/20 bg-axiom-orange/5 px-2 py-0.5 hover:bg-axiom-orange/10 transition-all rounded-sm"
                        >
                            ★ ADMIN
                        </button>
                    )}
                    
                    <SidecarStatus />
                    
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-axiom-green shadow-[0_0_8px_#00FF41] animate-pulse' : 'bg-gray-700'}`} />
                        <span className={isLive ? 'text-axiom-green' : 'text-gray-600'}>{isLive ? 'CONNECTED' : 'OFFLINE'}</span>
                    </div>

                    <div className="text-gray-400">{time} IST</div>

                    <button
                        onClick={async () => {
                            await logout();
                            navigate('/login');
                        }}
                        className="text-axiom-red border border-axiom-red/20 px-2 py-0.5 hover:bg-axiom-red/10 transition-all rounded-sm"
                    >
                        ✖ LOGOUT
                    </button>
                </div>
            </div>

            {/* Function Key Bar */}
            <div className="h-8 flex items-center gap-1 px-1 overflow-x-auto custom-scrollbar bg-black/20">
                {MODES.map(m => {
                    const isActive = activeMode === m.label;
                    return (
                        <button
                            key={m.key}
                            onClick={() => {
                                console.log('[AXIOM] Switching mode to:', m.label);
                                setActiveMode(m.label);
                            }}
                            className={`
                                flex items-center gap-2 px-3 h-6 transition-all font-mono text-[10px] font-bold whitespace-nowrap rounded-sm
                                ${isActive 
                                    ? 'bg-axiom-orange text-black shadow-[0_0_12px_rgba(255,102,0,0.2)]' 
                                    : 'text-gray-500 hover:text-white hover:bg-[#1A1A1A]'}
                            `}
                        >
                            <span className={`text-[9px] ${isActive ? 'opacity-100' : 'opacity-40'}`}>{m.key}</span>
                            {m.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Header;
