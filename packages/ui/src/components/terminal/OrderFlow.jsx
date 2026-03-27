import React, { useState, useEffect, useRef } from 'react';
import useTerminalStore from '../../store/useTerminalStore';

const LEVELS = 15;
const TICK = 0.05; // price increment per level

// Generate a stable initial order book anchored to a mid price
const initBook = (mid) => {
    const bestBid = mid - TICK / 2;
    const bestAsk = mid + TICK / 2;
    const bids = Array.from({ length: LEVELS }, (_, i) => ({
        price: parseFloat((bestBid - i * TICK).toFixed(2)),
        size: Math.floor(Math.random() * 4500 + 100),
    }));
    const asks = Array.from({ length: LEVELS }, (_, i) => ({
        price: parseFloat((bestAsk + i * TICK).toFixed(2)),
        size: Math.floor(Math.random() * 4500 + 100),
    })).reverse(); // highest ask on top
    return { bids, asks };
};

const OrderFlow = () => {
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const realPrice = useTerminalStore(state => state.equityPrices[activeSymbol]?.price ?? null);
    const midRef = useRef(realPrice);

    const [book, setBook] = useState(() => initBook(realPrice ?? 100));
    const [isSimulated, setIsSimulated] = useState(true);

    // Re-init book when symbol or real price changes meaningfully
    useEffect(() => {
        if (realPrice && Math.abs(realPrice - (midRef.current ?? 0)) > 0.5) {
            midRef.current = realPrice;
            setBook(initBook(realPrice));
        }
    }, [activeSymbol, realPrice]);

    // Slowly update sizes every 3s to simulate market microstructure
    // This is intentional and honest (labelled SIMULATED), not a render-driven artifact
    useEffect(() => {
        if (!realPrice) return; // don't animate if no real price anchor

        const interval = setInterval(() => {
            setBook(prev => ({
                bids: prev.bids.map(level => ({
                    ...level,
                    size: Math.max(50, level.size + Math.floor((Math.random() - 0.5) * 600)),
                })),
                asks: prev.asks.map(level => ({
                    ...level,
                    size: Math.max(50, level.size + Math.floor((Math.random() - 0.5) * 600)),
                })),
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, [realPrice]);

    const maxSize = Math.max(...book.bids.map(b => b.size), ...book.asks.map(a => a.size));
    const spread = realPrice
        ? ((book.asks[book.asks.length - 1]?.price ?? 0) - (book.bids[0]?.price ?? 0)).toFixed(2)
        : '---';
    const spreadPct = realPrice
        ? (((book.asks[book.asks.length - 1]?.price ?? 0) - (book.bids[0]?.price ?? 0)) / realPrice * 100).toFixed(3)
        : '---';

    if (!realPrice) {
        return (
            <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600', fontFamily: 'IBM Plex Mono' }}>
                    ORDER FLOW / DEPTH
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                    NO PRICE DATA — SELECT A SYMBOL
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '4px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600', fontFamily: 'IBM Plex Mono', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span>ORDER FLOW / DEPTH</span>
                <span style={{ color: '#FFCC00', fontSize: '8px', border: '1px solid #FFCC0033', padding: '0 4px' }} title="Sizes are simulated — real price anchor">
                    SIM DEPTH
                </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                {/* ASKS (reversed: highest on top) */}
                {book.asks.map((ask, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#FF2244', position: 'relative', marginBottom: '1px', height: '16px', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(255,34,68,0.08)', width: `${(ask.size / maxSize) * 100}%`, transition: 'width 0.8s ease' }} />
                        <span style={{ zIndex: 1 }}>{ask.price.toFixed(2)}</span>
                        <span style={{ zIndex: 1, color: '#FF4466' }}>{ask.size.toLocaleString()}</span>
                    </div>
                ))}

                {/* SPREAD */}
                <div style={{ borderTop: '1px solid #333', borderBottom: '1px solid #333', padding: '4px 0', textAlign: 'center', color: '#555', margin: '4px 0', fontSize: '9px' }}>
                    SPREAD: {spread} ({spreadPct}%)
                </div>

                {/* BIDS */}
                {book.bids.map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#00FF41', position: 'relative', marginBottom: '1px', height: '16px', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(0,255,65,0.08)', width: `${(bid.size / maxSize) * 100}%`, transition: 'width 0.8s ease' }} />
                        <span style={{ zIndex: 1 }}>{bid.price.toFixed(2)}</span>
                        <span style={{ zIndex: 1, color: '#44FF77' }}>{bid.size.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderFlow;
