import React, { useEffect, useState } from 'react';
import api from '../../api';

const CommoditiesModule = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            const res = await api.get('/api/v1/quotes/macro/commodities');
            const assets = res.data?.assets || [];
            setData(assets);
            setError(null);
        } catch (e) {
            setError('Commodity data unavailable.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 60000);
        return () => clearInterval(id);
    }, []);

    // Group by inferred category
    const groups = data.reduce((acc, item) => {
        let cat = 'OTHER';
        const s = item.symbol.toUpperCase();
        if (['CRUDE OIL', 'NATURAL GAS', 'HEATING OIL', 'GASOLINE', 'BRENT'].some(k => s.includes(k))) cat = 'ENERGY';
        else if (['GOLD', 'SILVER', 'COPPER', 'PLATINUM', 'PALLADIUM'].some(k => s.includes(k))) cat = 'METALS';
        else if (['CORN', 'WHEAT', 'SOY', 'COFFEE', 'SUGAR', 'COTTON'].some(k => s.includes(k))) cat = 'AGRICULTURE';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    if (Object.keys(groups).length === 0 && !loading) groups['ALL'] = data;

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6 font-mono text-[#E8E8E0] overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-[#1A1A1A] pb-4">
                <div className="flex flex-col">
                    <h2 className="text-axiom-orange text-lg font-bold tracking-[0.3em] uppercase">Commodity Terminal</h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Spot & Futures Prices</span>
                </div>
                <div className="flex items-center gap-3">
                    {error && <span className="text-axiom-red text-[10px]">⚠ {error}</span>}
                    {loading && <span className="text-[9px] text-axiom-orange animate-pulse uppercase">Fetching...</span>}
                </div>
            </div>

            {loading && data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-axiom-orange text-[10px] tracking-widest uppercase animate-pulse">
                    Loading commodity prices…
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {Object.keys(groups).map(cat => (
                        <div key={cat} className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-black text-gray-400 tracking-[0.2em]">{cat}</span>
                                <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {groups[cat].map(item => (
                                    <div key={item.symbol} className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 rounded-sm hover:border-axiom-orange/30 transition-all cursor-pointer group">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold group-hover:text-axiom-orange transition-colors truncate mr-2">{item.symbol}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.up ? 'bg-axiom-green' : 'bg-axiom-red'}`} />
                                        </div>
                                        <div className="text-xl font-bold text-white tabular-nums">
                                            ${Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                        <div className={`text-[10px] font-bold mt-1 ${item.up ? 'text-axiom-green' : 'text-axiom-red'}`}>
                                            {item.change_pct >= 0 ? '+' : ''}{item.change_pct?.toFixed(2)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommoditiesModule;
