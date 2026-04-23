import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';

const BOND_SYMBOLS = ['US10Y', 'US02Y', 'GS29', 'AAPL30', 'JPM27'];

const FixedIncomeModule = () => {
    const [yields, setYields] = useState([]);
    const [bonds, setBonds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const [yieldsRes, bondsRes] = await Promise.all([
                    api.get('/api/v1/quotes/macro/yields'),
                    api.get('/api/v1/quotes/batch', { params: { symbols: BOND_SYMBOLS.join(',') } }),
                ]);
                if (cancelled) return;

                // Flatten US curve into chart-friendly format
                const curve = (yieldsRes.data?.US || []).map(y => ({
                    tenor: y.maturity,
                    yield: y.yield,
                    up: y.up,
                }));
                setYields(curve);

                // Turn batch quotes into bond rows
                const batchData = bondsRes.data || {};
                const rows = Object.entries(batchData).map(([symbol, q]) => ({
                    symbol,
                    price: q.price?.toFixed(2) ?? '--',
                    change: q.change_pct != null
                        ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%`
                        : '--',
                    up: q.up ?? true,
                }));
                setBonds(rows);
            } catch (e) {
                if (!cancelled) setError('Failed to load Fixed Income data.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetch();
        const interval = setInterval(fetch, 60000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    const tenYear = yields.find(y => y.tenor === '10Y');

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6 font-mono text-[#E8E8E0] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h2 className="text-axiom-orange text-lg font-bold tracking-widest">FIXED INCOME DESK</h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Yield Curve & Credit Monitor</span>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-[10px] text-gray-600">US 10Y YIELD</div>
                        <div className={`text-sm font-bold ${tenYear?.up ? 'text-axiom-green' : 'text-axiom-red'}`}>
                            {tenYear ? `${tenYear.yield.toFixed(3)}%` : '--'}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-2 bg-axiom-red/10 border border-axiom-red/30 text-axiom-red text-[10px] rounded-sm">
                    ⚠ {error}
                </div>
            )}

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Yield Curve */}
                <div className="col-span-8 bg-[#0D0D0D] border border-[#1A1A1A] p-4 flex flex-col rounded-sm">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Treasury Yield Curve</span>
                        {loading && <span className="text-[9px] text-axiom-orange animate-pulse">FETCHING...</span>}
                    </div>
                    <div className="flex-1">
                        {yields.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={yields}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                                    <XAxis dataKey="tenor" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ background: '#0D0D0D', border: '1px solid #FF6600', fontSize: '11px', color: '#FFF' }}
                                        itemStyle={{ color: '#FF6600' }}
                                        formatter={v => [`${v.toFixed(3)}%`, 'Yield']}
                                    />
                                    <Line type="monotone" dataKey="yield" stroke="#FF6600" strokeWidth={2} dot={{ fill: '#FF6600', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-700 text-[10px] tracking-widest uppercase">
                                {loading ? 'Loading yield curve…' : 'No data'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bond Tape */}
                <div className="col-span-4 bg-[#0D0D0D] border border-[#1A1A1A] flex flex-col rounded-sm overflow-hidden">
                    <div className="p-3 border-b border-[#1A1A1A] flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Active Bonds</span>
                        <span className={`text-[9px] ${loading ? 'text-axiom-orange animate-pulse' : 'text-axiom-green'}`}>
                            {loading ? 'UPDATING' : 'LIVE'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {bonds.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#0D0D0D] text-[9px] text-gray-600 uppercase">
                                    <tr>
                                        <th className="p-3 font-medium">Symbol</th>
                                        <th className="p-3 font-medium">Price</th>
                                        <th className="p-3 font-medium">Chg</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {bonds.map(b => (
                                        <tr key={b.symbol} className="border-b border-[#111] hover:bg-white/5 transition-colors cursor-pointer group">
                                            <td className="p-3 font-bold group-hover:text-axiom-orange">{b.symbol}</td>
                                            <td className="p-3">{b.price}</td>
                                            <td className={`p-3 font-bold ${b.up ? 'text-axiom-green' : 'text-axiom-red'}`}>{b.change}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-6 text-center text-[10px] text-gray-700 uppercase tracking-widest">
                                {loading ? 'Loading…' : 'No bond data'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FixedIncomeModule;
