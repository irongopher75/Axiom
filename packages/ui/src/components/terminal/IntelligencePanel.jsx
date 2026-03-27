import React, { useEffect, useState } from 'react';
import api from '../../api/index';
import useTerminalStore from '../../store/useTerminalStore';

const IntelligencePanel = () => {
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const [signal, setSignal] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!activeSymbol) return;
        setLoading(true);

        api.get(`/api/v1/predict/${activeSymbol}`)
            .then(res => {
                setSignal(res.data);
                setLoading(false);
            })
            .catch(() => {
                // Fallback to mock on error
                setSignal({
                    prediction: 'NEUTRAL', confidence: 0.55,
                    regime: 'RANGING', rsi: 52.1, macd: 0.0011,
                    total_score: 0.2, current_price: null
                });
                setLoading(false);
            });
    }, [activeSymbol]);

    const predColor = signal?.prediction === 'BULLISH' ? '#00FF41'
        : signal?.prediction === 'BEARISH' ? '#FF2244'
            : '#FFCC00';

    const confPct = signal ? Math.round((signal.confidence ?? 0.5) * 100) : 50;

    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <span>ML INTELLIGENCE / {activeSymbol || '---'}</span>
                {loading && <span style={{ color: '#555' }}>COMPUTING...</span>}
            </div>

            <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
                {/* Primary Signal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: predColor, letterSpacing: '0.05em' }}>
                        {signal?.prediction ?? '---'}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#555' }}>CONFIDENCE</div>
                        <div style={{ fontSize: '18px', color: '#FFF' }}>{confPct}%</div>
                    </div>
                </div>

                {/* Confidence Bar */}
                <div style={{ height: '3px', background: '#1A1A1A', borderRadius: '0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${confPct}%`, background: predColor, transition: 'width 0.5s ease' }} />
                </div>

                {/* Grid metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                    {[
                        { label: 'REGIME', value: signal?.regime ?? '---' },
                        { label: 'SCORE', value: signal?.total_score?.toFixed(2) ?? '---' },
                        { label: 'RSI', value: signal?.rsi?.toFixed(1) ?? '---' },
                        { label: 'MACD', value: signal?.macd?.toFixed(4) ?? '---' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#111', padding: '6px 8px', border: '1px solid #1A1A1A' }}>
                            <div style={{ color: '#555', marginBottom: '2px' }}>{label}</div>
                            <div style={{ color: '#FFF' }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Signal breakdown bars */}
                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>STRATEGY BREAKDOWN</div>
                {[
                    { name: 'SCALP', weight: 0.4 },
                    { name: 'MOMENTUM', weight: 0.35 },
                    { name: 'MEAN-REV', weight: 0.25 },
                ].map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                        <span style={{ color: '#555', width: '70px' }}>{s.name}</span>
                        <div style={{ flex: 1, height: '3px', background: '#1A1A1A' }}>
                            <div style={{ height: '100%', width: `${s.weight * 100}%`, background: '#FF6600' }} />
                        </div>
                        <span style={{ color: '#888' }}>{(s.weight * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IntelligencePanel;
