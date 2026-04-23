import React, { useEffect, useState } from 'react';
import api from '../../api';

const MacroModule = () => {
    const [yields, setYields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            const res = await api.get('/api/v1/quotes/macro/yields');
            setYields(res.data?.US || []);
            setError(null);
        } catch (e) {
            setError('Macro data unavailable.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 120000);
        return () => clearInterval(id);
    }, []);

    // Central bank rates — these change infrequently, keep as constants updated each cycle
    const CB_RATES = [
        { bank: 'FEDERAL RESERVE', rate: '5.25–5.50%', trend: 'HOLD', color: '#FF6600' },
        { bank: 'ECB', rate: '4.50%', trend: 'HOLD', color: '#00CCFF' },
        { bank: 'BOE', rate: '5.25%', trend: 'HOLD', color: '#00FF41' },
        { bank: 'BOJ', rate: '0.10%', trend: 'HAWKISH', color: '#FF2244' },
    ];

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6 font-mono text-[#E8E8E0] overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-[#1A1A1A] pb-4">
                <div className="flex flex-col">
                    <h2 className="text-axiom-orange text-lg font-bold tracking-[0.2em] uppercase">Macro-Economic Terminal</h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Global Indicators & Central Bank Policy</span>
                </div>
                <div className="flex items-center gap-4">
                    {error && <span className="text-axiom-red text-[10px]">⚠ {error}</span>}
                    {loading && <span className="text-[9px] text-axiom-orange animate-pulse uppercase">Updating...</span>}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-8 min-h-0 overflow-y-auto custom-scrollbar">
                {/* Yield Curve Snapshot */}
                <div className="flex flex-col bg-[#0D0D0D] border border-[#1A1A1A] rounded-sm overflow-hidden">
                    <div className="p-3 border-b border-[#1A1A1A] flex justify-between">
                        <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">US Treasury Yields</span>
                        {loading && <span className="text-[9px] text-axiom-orange animate-pulse">LIVE</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {yields.length === 0 && !loading ? (
                            <div className="p-6 text-center text-[10px] text-gray-700 uppercase tracking-widest">No data</div>
                        ) : yields.map(y => (
                            <div key={y.maturity} className="flex items-center justify-between px-4 py-3 border-b border-[#111] hover:bg-white/5">
                                <span className="text-[11px] font-bold text-gray-300">{y.maturity}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] tabular-nums text-white font-bold">{y.yield?.toFixed(3)}%</span>
                                    <span className={`text-[10px] font-bold ${y.up ? 'text-axiom-green' : 'text-axiom-red'}`}>
                                        {y.up ? '▲' : '▼'} {Math.abs(y.chg_bps ?? 0).toFixed(1)} bps
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Central Bank Rates */}
                <div className="flex flex-col gap-6">
                    <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 rounded-sm">
                        <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-6 block">Central Bank Benchmark Rates</span>
                        <div className="grid grid-cols-2 gap-6">
                            {CB_RATES.map(cb => (
                                <div key={cb.bank} className="flex flex-col">
                                    <span className="text-[9px] text-gray-600 font-bold mb-1">{cb.bank}</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-bold text-white tabular-nums">{cb.rate}</span>
                                        <span className="text-[9px] font-bold" style={{ color: cb.color }}>{cb.trend}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-[#0D0D0D] border border-[#1A1A1A] p-5 rounded-sm flex flex-col">
                        <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-4">Macro Signals</span>
                        <div className="space-y-3 text-xs text-gray-400 overflow-y-auto custom-scrollbar leading-relaxed">
                            <p className="border-l-2 border-axiom-orange pl-3 bg-axiom-orange/5 py-2">
                                <span className="text-axiom-orange font-bold mr-2">US:</span>
                                Labor market remains resilient. Rate cuts deferred pending CPI below 2.5%.
                            </p>
                            <p className="border-l-2 border-axiom-green pl-3 bg-axiom-green/5 py-2">
                                <span className="text-axiom-green font-bold mr-2">EU:</span>
                                ECB hawkish stance softening. Manufacturing PMI contraction deepening.
                            </p>
                            <p className="border-l-2 border-axiom-red pl-3 bg-axiom-red/5 py-2">
                                <span className="text-axiom-red font-bold mr-2">JP:</span>
                                BOJ signaling exit from ultra-loose policy. JPY carry unwind risk elevated.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MacroModule;
