import React, { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useTerminalStore from '../../store/useTerminalStore';

const PortfolioRisk = () => {
    // 1. Stable static actions
    const addPosition = useTerminalStore(state => state.addPosition);
    const removePosition = useTerminalStore(state => state.removePosition);
    const getPortfolioMetrics = useTerminalStore(state => state.getPortfolioMetrics);

    // 2. Stable array reference
    const equityPrices = useTerminalStore(state => state.equityPrices);
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const activeCurrency = useTerminalStore(state => state.equityPrices[activeSymbol]?.currency || 'USD');
    const currencySign = activeCurrency === 'INR' ? '₹' : activeCurrency === 'USDT' ? '₮' : '$';
    const portfolio = useTerminalStore(state => state.portfolio);

    // 3. SURGICAL: Only re-render if a symbol WE HOLD changes price
    const heldPrices = useTerminalStore(useShallow(state => {
        const prices = {};
        state.portfolio.forEach(p => {
            const live = state.equityPrices[p.symbol];
            if (live) prices[p.symbol] = live;
        });
        return prices;
    }));

    const [isAdding, setIsAdding] = useState(false);
    const [viewMode, setViewMode] = useState('SUMMARY'); // SUMMARY or POSITIONS
    const [newSymbol, setNewSymbol] = useState('');
    const [newQty, setNewQty] = useState('');
    const [newPrice, setNewPrice] = useState('');

    // Metrics derived only when portfolio or held prices actually change
    const metrics = useMemo(() => getPortfolioMetrics(), [portfolio, heldPrices]);

    const handleAdd = (e) => {
        e.preventDefault();
        const sym = newSymbol.toUpperCase().trim();
        if (!sym || !newQty || !newPrice) return;

        // Verification: Check if symbol exists in store
        if (!equityPrices[sym]) {
            alert(`Symbol "${sym}" not found. Please search and select it in the command palette first.`);
            return;
        }

        addPosition({
            symbol: sym,
            qty: parseFloat(newQty),
            avgPrice: parseFloat(newPrice)
        });
        setNewSymbol('');
        setNewQty('');
        setNewPrice('');
        setIsAdding(false);
    };

    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span
                        onClick={() => setViewMode('SUMMARY')}
                        style={{ cursor: 'pointer', color: viewMode === 'SUMMARY' ? '#FF6600' : '#444' }}
                    >
                        SUMMARY
                    </span>
                    <span style={{ color: '#1A1A1A' }}>/</span>
                    <span
                        onClick={() => setViewMode('POSITIONS')}
                        style={{ cursor: 'pointer', color: viewMode === 'POSITIONS' ? '#FF6600' : '#444' }}
                    >
                        POSITIONS
                    </span>
                </div>
            </div>

            <div style={{ padding: '10px', fontFamily: 'IBM Plex Mono', fontSize: '11px', lineHeight: '1.6', flex: 1, overflowY: 'auto' }}>
                {viewMode === 'SUMMARY' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>DAY P&L</div>
                                <div style={{ fontSize: '18px', color: metrics.dayPl >= 0 ? '#00FF41' : '#FF2244', fontWeight: 'bold' }}>
                                    {metrics.dayPl >= 0 ? '+' : ''}{currencySign}{Math.abs(metrics.dayPl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>TOTAL P&L</div>
                                <div style={{ fontSize: '18px', color: metrics.totalPl >= 0 ? '#00FF41' : '#FF2244', fontWeight: 'bold' }}>
                                    {metrics.totalPl >= 0 ? '+' : ''}{currencySign}{Math.abs(metrics.totalPl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '10px', color: metrics.totalPlPct >= 0 ? '#00FF41' : '#FF2244', opacity: 0.8 }}>
                                    ({metrics.totalPlPct >= 0 ? '+' : ''}{metrics.totalPlPct.toFixed(2)}%)
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>DRAWDOWN</span>
                                <span style={{ color: '#FF2244' }}>{metrics.drawdown}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>BETA</span>
                                <span style={{ color: '#FFF' }}>{metrics.beta}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>SHARPE</span>
                                <span style={{ color: '#FFF' }}>{metrics.sharpe}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            style={{ padding: '4px', background: '#111', border: '1px solid #222', color: isAdding ? '#FF6600' : '#888', fontSize: '10px', cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}
                        >
                            {isAdding ? 'CANCEL' : '+ ADD'}
                        </button>

                        {isAdding && (
                            <form onSubmit={handleAdd} style={{ padding: '10px', background: '#0A0A0A', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        placeholder="SEARCH SYMBOL..."
                                        value={newSymbol}
                                        onChange={e => setNewSymbol(e.target.value)}
                                        onFocus={() => setNewSymbol('')} // Clear to show full list on focus
                                        style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '11px', padding: '6px', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' }}
                                    />
                                    {isAdding && document.activeElement && newSymbol.length >= 0 && (
                                         <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '120px', overflowY: 'auto', background: '#111', border: '1px solid #333', borderTop: 'none', zIndex: 10 }}>
                                            {Object.keys(equityPrices)
                                                .filter(sym => sym.toLowerCase().includes(newSymbol.toLowerCase()))
                                                .sort()
                                                .map(sym => (
                                                    <div 
                                                        key={sym} 
                                                        onMouseDown={() => setNewSymbol(sym)} // Use mousedown to fire before blur
                                                        style={{ padding: '4px 6px', cursor: 'pointer', fontSize: '10px', color: '#BBB', borderBottom: '1px solid #222' }}
                                                    >
                                                        {sym}
                                                    </div>
                                            ))}
                                            {Object.keys(equityPrices).filter(sym => sym.toLowerCase().includes(newSymbol.toLowerCase())).length === 0 && (
                                                 <div style={{ padding: '4px 6px', fontSize: '10px', color: '#666' }}>NO RESULTS</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <input
                                        placeholder="QTY"
                                        type="number"
                                        value={newQty}
                                        onChange={e => setNewQty(e.target.value)}
                                        style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '11px', padding: '6px', fontFamily: 'IBM Plex Mono' }}
                                    />
                                    <input
                                        placeholder="AVG PRICE"
                                        type="number"
                                        value={newPrice}
                                        onChange={e => setNewPrice(e.target.value)}
                                        style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '11px', padding: '6px', fontFamily: 'IBM Plex Mono' }}
                                    />
                                </div>
                                <button type="submit" style={{ padding: '6px', background: '#FF6600', color: '#000', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    CONFIRM
                                </button>
                                {newSymbol && !equityPrices[newSymbol.toUpperCase()] && (
                                    <div style={{ fontSize: '9px', color: '#FF2244', textAlign: 'center' }}>SYMBOL OVERRIDE: VERIFICATION REQUIRED</div>
                                )}
                            </form>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {portfolio.length === 0 && !isAdding && <div style={{ color: '#444', textAlign: 'center', padding: '20px' }}>NO POSITIONS</div>}
                            {portfolio.map(pos => {
                                const live = equityPrices[pos.symbol];
                                const curSign = live?.currency === 'INR' ? '₹' : live?.currency === 'USDT' ? '₮' : '$';
                                const pl = live ? (live.price - pos.avgPrice) * pos.qty : 0;
                                return (
                                    <div key={pos.symbol} style={{ borderBottom: '1px solid #111', paddingBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '12px', color: '#FFF', fontWeight: 'bold' }}>{pos.symbol} × {pos.qty}</span>
                                            <button
                                                onClick={() => removePosition(pos.symbol)}
                                                style={{ background: 'transparent', border: 'none', color: '#333', fontSize: '8px', cursor: 'pointer', padding: 0 }}
                                            >
                                                [REMOVE]
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <div style={{ fontSize: '10px', color: '#666' }}>
                                                AVG: {curSign}{pos.avgPrice.toLocaleString()} | LIVE: {curSign}{live?.price?.toLocaleString() || '---'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: pl >= 0 ? '#00FF41' : '#FF2244', fontWeight: 'bold' }}>
                                                {pl >= 0 ? '+' : ''}{Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '15px', borderTop: '1px solid #1A1A1A', paddingTop: '10px', color: '#444', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{metrics.count} POSITIONS ACTIVE</span>
                        <span>VALUE: {currencySign}{metrics.currentValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioRisk;
