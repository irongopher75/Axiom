import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getPerformance } from '../../api/index';
import {
    Activity,
    TrendingUp,
    LogOut,
    PieChart,
    LineChart,
    RefreshCcw,
    ScrollText,
    Settings
} from 'lucide-react';

const navItems = [
    { icon: Activity, label: 'Dashboard', path: '/dashboard' },
    { icon: TrendingUp, label: 'Live Signals', path: '/signals', badge: 'LIVE' },
    { icon: PieChart, label: 'Portfolio', path: '/portfolio' },
    { icon: LineChart, label: 'Analytics', path: '/analytics' },
    { icon: RefreshCcw, label: 'Backtesting', path: '/backtest' },
    { icon: ScrollText, label: 'History', path: '/history' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = ({ isOpen, closeSidebar }) => {
    const navigate = useNavigate();
    const [performance, setPerformance] = useState(null);

    useEffect(() => {
        const fetchPerf = async () => {
            try {
                const res = await getPerformance();
                setPerformance(res.data);
            } catch (err) {
                console.warn("Sidebar perf fetch failed");
            }
        };
        fetchPerf();
        const interval = setInterval(fetchPerf, 60000); // Sync every minute
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
        if (closeSidebar) closeSidebar();
    };

    const totalEquity = performance?.total_equity || 1000000;
    const pnlPercent = performance ? ((performance.total_pnl / performance.initial_balance) * 100).toFixed(2) : "0.00";

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside className={`fixed lg:sticky lg:top-0 lg:h-screen left-0 z-50 w-[260px] glass-panel border-r border-white/5 transform transition-all duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Logo Area - Apple Inspired Wordmark */}
                <div className="h-[72px] px-8 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-[-0.5px]">
                            TradeX<span className="text-blue-500">.AI</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-[6px] h-[6px] rounded-full ${performance ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                            <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                                {performance ? 'Systems online' : 'Connecting...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Total Equity Minimal Card */}
                <div className="px-5 mb-8">
                    <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl group transition-all duration-300">
                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Total equity</p>
                        <h3 className="text-2xl font-semibold text-white font-mono tracking-tight mb-2">
                            ₹{Math.round(performance?.total_equity || 0).toLocaleString()}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-[11px] font-bold ${parseFloat(pnlPercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                <TrendingUp size={10} /> {parseFloat(pnlPercent) >= 0 ? '+' : ''}{pnlPercent}% Total
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation - Segmented & Minimal */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={closeSidebar}
                            className={({ isActive }) => `
                                group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-premium relative overflow-hidden
                                ${isActive
                                    ? 'bg-gradient-to-r from-blue-500/10 to-transparent text-white border border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.1)]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/[0.03] border border-transparent'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Sidebar Indicator */}
                                    {/* Active Sidebar Indicator - Apple Style Dot */}
                                    {isActive && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />}

                                    <div className="flex items-center gap-3.5">
                                        <item.icon size={20} className={`shrink-0 transition-colors ${isActive ? 'text-blue-500' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                        <span className="tracking-tight">{item.label}</span>
                                    </div>

                                    {item.badge && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-[4px] h-[4px] rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-green-500/80 uppercase tracking-tighter">Live</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Sign Out - Dedicated Bottom Section */}
                <div className="p-6 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 px-5 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-400 hover:bg-white/[0.03] w-full transition-all group"
                    >
                        <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
                        <span className="tracking-tight">Sign out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
