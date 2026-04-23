import React, { useEffect, useState } from 'react';
import api from '../../api';

const CryptoModule = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadData = async () => {
        try {
            const res = await api.get('/api/v1/quotes/macro/crypto');
            const raw = res.data?.assets || [];
            setAssets(raw);
            setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }));
            setError(null);
        } catch (e) {
            setError('Crypto feed unavailable.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 15000); // faster refresh for crypto
        return () => clearInterval(id);
    }, []);

    const COIN_COLORS = { BTC: '#F7931A', ETH: '#627EEA', SOL: '#14F195', DOGE: '#C8A951', LINK: '#2A5ADA', ADA: '#0033AD' };

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6 font-mono text-[#E8E8E0] overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                    <h2 className="text-axiom-orange text-lg font-bold tracking-[0.2em] uppercase flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-axiom-orange animate-pulse" />
                        Digital Asset Terminal
                    </h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Cross-Chain Liquidity & Execution</span>
                </div>
                <div className="flex items-center gap-4">
                    {error && <span className="text-axiom-red text-[10px]">⚠ {error}</span>}
                    {lastUpdated && (
                        <span className="text-[9px] text-gray-600 uppercase">Updated {lastUpdated}</span>
                    )}
                    {loading && <span className="text-[9px] text-axiom-orange animate-pulse">UPDATING...</span>}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-[#0D0D0D] border border-[#1A1A1A] rounded-sm overflow-hidden">
                <div className="grid grid-cols-5 p-4 border-b border-[#1A1A1A] text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <div className="col-span-2">Asset</div>
                    <div>Price (USD)</div>
                    <div>24h Change</div>
                    <div>Trend</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading && assets.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-axiom-orange text-[10px] tracking-widest uppercase animate-pulse">
                            Loading digital assets…
                        </div>
                    ) : assets.map(asset => {
                        const ticker = asset.symbol.replace('/USD', '').replace('-USD', '');
                        const color = COIN_COLORS[ticker] || '#FF6600';
                        return (
                            <div key={asset.symbol} className="grid grid-cols-5 p-4 border-b border-[#111] hover:bg-white/5 transition-all cursor-pointer group">
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-[10px]"
                                        style={{ background: color }}>
                                        {ticker[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold group-hover:text-axiom-orange transition-colors">{ticker}</div>
                                        <div className="text-[10px] text-gray-600">{asset.symbol}</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm font-bold tabular-nums">
                                    ${Number(asset.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                                <div className={`flex items-center text-sm font-bold ${asset.up ? 'text-axiom-green' : 'text-axiom-red'}`}>
                                    {asset.up ? '▲' : '▼'} {Math.abs(asset.change_pct ?? 0).toFixed(2)}%
                                </div>
                                <div className="flex items-center">
                                    <div className={`w-16 h-1.5 rounded-full ${asset.up ? 'bg-axiom-green' : 'bg-axiom-red'}`}
                                        style={{ opacity: 0.3 + Math.min(Math.abs(asset.change_pct ?? 0) / 10, 0.7) }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CryptoModule;
