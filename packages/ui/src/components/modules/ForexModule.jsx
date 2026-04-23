import React, { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import api from '../../api';

const ForexModule = () => {
    const [pairs, setPairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadData = async () => {
        try {
            const res = await api.get('/api/v1/quotes/macro/fx');
            const assets = res.data?.assets || [];
            setPairs(assets.map(a => ({
                symbol: a.symbol,
                price: a.price?.toFixed(4) ?? '--',
                change: `${a.change_pct >= 0 ? '+' : ''}${a.change_pct?.toFixed(2) ?? '0.00'}%`,
                up: a.up,
            })));
            setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }));
            setError(null);
        } catch (e) {
            setError('FX data unavailable.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 30000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6 font-mono text-[#E8E8E0] overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                    <h2 className="text-axiom-orange text-lg font-bold tracking-[0.2em] uppercase">Global FX Dashboard</h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Real-time Currency Spreads</span>
                </div>
                <div className="flex items-center gap-4">
                    {error && <span className="text-axiom-red text-[10px]">⚠ {error}</span>}
                    {lastUpdated && !loading && (
                        <span className="text-[9px] text-gray-600 uppercase">Updated {lastUpdated}</span>
                    )}
                    {loading && <span className="text-[9px] text-axiom-orange animate-pulse uppercase">Fetching...</span>}
                </div>
            </div>

            {pairs.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 min-h-0 content-start overflow-y-auto custom-scrollbar">
                    {pairs.map(pair => (
                        <div key={pair.symbol} className="bg-[#0D0D0D] border border-[#1A1A1A] hover:border-axiom-orange/30 transition-all p-5 rounded-sm flex flex-col group cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-bold group-hover:text-axiom-orange transition-colors">{pair.symbol}</span>
                                    <div className="text-[22px] font-bold mt-1 text-white tabular-nums">{pair.price}</div>
                                </div>
                                <div className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${pair.up ? 'text-axiom-green bg-axiom-green/10' : 'text-axiom-red bg-axiom-red/10'}`}>
                                    {pair.change}
                                </div>
                            </div>
                            <div className="h-12 -mx-2 mt-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[{ v: 0.9 }, { v: 1 }, { v: 0.95 }, { v: 1.05 }, { v: 1 }]}>
                                        <defs>
                                            <linearGradient id={`grad-${pair.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={pair.up ? '#00FF41' : '#FF2244'} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={pair.up ? '#00FF41' : '#FF2244'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="v" stroke={pair.up ? '#00FF41' : '#FF2244'} fillOpacity={1} fill={`url(#grad-${pair.symbol})`} strokeWidth={1.5} isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            ) : !loading ? (
                <div className="flex-1 flex items-center justify-center text-gray-700 text-[10px] tracking-widest uppercase">
                    No FX data available
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-axiom-orange text-[10px] tracking-widest uppercase animate-pulse">
                    Loading FX rates…
                </div>
            )}
        </div>
    );
};

export default ForexModule;
