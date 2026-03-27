import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { getMacroYields, getMacroFx } from '../../api';

const CENTRAL_BANKS = [
    { name: 'FED', rate: '5.25–5.50%', next: 'May 1', status: 'HOLD', color: '#FFCC00' },
    { name: 'RBI', rate: '6.50%', next: 'Apr 5', status: 'HOLD', color: '#FFCC00' },
    { name: 'ECB', rate: '4.50%', next: 'Apr 11', status: 'CUT', color: '#00FF41' },
    { name: 'BOJ', rate: '0.10%', next: 'Apr 26', status: 'HIKE', color: '#FF2244' },
    { name: 'BOE', rate: '5.25%', next: 'May 9', status: 'HOLD', color: '#FFCC00' },
];

const ECONOMIC_CALENDAR = [
    { date: 'MAR 12', event: 'US CPI (Feb)', exp: '3.1%', prior: '3.1%', impact: 'HIGH' },
    { date: 'MAR 14', event: 'US PPI (Feb)', exp: '1.2%', prior: '0.9%', impact: 'MED' },
    { date: 'MAR 20', event: 'FOMC Rate Decision', exp: '5.50%', prior: '5.50%', impact: 'HIGH' },
    { date: 'MAR 22', event: 'US PCE Price Index', exp: '2.5%', prior: '2.4%', impact: 'HIGH' },
    { date: 'APR 5', event: 'US NFP (Mar)', exp: '200K', prior: '275K', impact: 'HIGH' },
];

const IMPACT_COLOR = { HIGH: '#FF2244', MED: '#FFCC00', LOW: '#888888' };

const MacroModule = () => {
    const [selectedCurve, setSelectedCurve] = useState('US');
    const [yieldCurves, setYieldCurves] = useState(null);
    const [fxPairs, setFxPairs] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            try {
                const [yieldsRes, fxRes] = await Promise.all([
                    getMacroYields(),
                    getMacroFx()
                ]);
                
                if (mounted) {
                    if (yieldsRes.data && Object.keys(yieldsRes.data).length > 0) {
                        setYieldCurves(yieldsRes.data);
                    }
                    // Fix: Backend returns { assets: [...] }
                    const fxData = fxRes.data?.assets || fxRes.data;
                    if (Array.isArray(fxData)) {
                        setFxPairs(fxData);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch live macro data.", err);
                if (mounted) setError(true);
            }
        };

        fetchData();
        const poll = setInterval(fetchData, 60000); // Poll macro data every 60s

        return () => { 
            mounted = false; 
            clearInterval(poll);
        };
    }, []);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden' }}>
            <div style={{ padding: '5px 12px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', fontSize: '11px', fontFamily: 'IBM Plex Mono', color: '#888', flexShrink: 0 }}>
                MACRO DASHBOARD / F9 · FEAR & GREED: <span style={{ color: '#FFCC00' }}>52 NEUTRAL</span> · VIX: <span style={{ color: '#00FF41' }}>13.24</span> · INTRADAY: <span style={{ color: '#00CCFF' }}>{new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left: Yield Curves */}
                <div style={{ flex: 1, borderRight: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: '#FF6600', fontSize: '11px', fontFamily: 'IBM Plex Mono' }}>SOVEREIGN YIELD CURVES</span>
                        {yieldCurves && Object.keys(yieldCurves).map(c => (
                            <span key={c} onClick={() => setSelectedCurve(c)}
                                style={{ cursor: 'pointer', color: selectedCurve === c ? '#FF6600' : '#888', fontSize: '11px', fontFamily: 'IBM Plex Mono', borderBottom: selectedCurve === c ? '1px solid #FF6600' : 'none', paddingBottom: '2px' }}>
                                {c}
                            </span>
                        ))}
                    </div>
                    <div style={{ flex: 1, padding: '10px' }}>
                        {error || !yieldCurves ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF2244', fontSize: '11px', fontFamily: 'IBM Plex Mono', letterSpacing: '1px' }}>
                                UNABLE TO FETCH INFO
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={yieldCurves[selectedCurve]}>
                                <CartesianGrid strokeDasharray="2 2" stroke="#1A1A1A" />
                                <XAxis dataKey="maturity" tick={{ fill: '#888', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#888', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
                                <Tooltip formatter={(v) => [`${v}%`, 'Yield']} contentStyle={{ background: '#0D0D0D', border: '1px solid #1A1A1A', color: '#FFF', fontSize: 10 }} />
                                <Line type="monotone" dataKey="yield" stroke="#00CCFF" strokeWidth={2} dot={{ fill: '#00CCFF', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        )}
                    </div>

                    {/* FX Heatmap row */}
                    <div style={{ borderTop: '1px solid #1A1A1A', padding: '8px 10px' }}>
                        <div style={{ fontSize: '11px', color: '#FF6600', fontFamily: 'IBM Plex Mono', marginBottom: '8px' }}>FX RATES</div>
                        {error || !fxPairs ? (
                            <div style={{ color: '#FF2244', fontSize: '11px', fontFamily: 'IBM Plex Mono', letterSpacing: '1px', marginTop: '12px' }}>
                                UNABLE TO FETCH INFO
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {fxPairs.map((fx, idx) => (
                                    <div key={fx.symbol || idx} style={{ padding: '6px 10px', border: '1px solid #1A1A1A', background: fx.up ? 'rgba(0,255,65,0.05)' : 'rgba(255,34,68,0.05)', fontFamily: 'IBM Plex Mono', fontSize: '10px', minWidth: '110px' }}>
                                        <div style={{ color: '#888', fontSize: '9px' }}>{fx.symbol}</div>
                                        <div style={{ color: '#FFF' }}>{fx.price}</div>
                                        <div style={{ color: fx.up ? '#00FF41' : '#FF2244', fontSize: '9px' }}>{fx.up ? '+' : ''}{fx.change_pct}%</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Central Banks + Calendar */}
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600', fontFamily: 'IBM Plex Mono' }}>CENTRAL BANKS</div>
                    {CENTRAL_BANKS.map(cb => (
                        <div key={cb.name} style={{ padding: '8px 12px', borderBottom: '1px solid #111', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{cb.name}</span>
                                <span style={{ color: cb.color, border: `1px solid ${cb.color}`, padding: '1px 6px', fontSize: '9px' }}>{cb.status}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>RATE: <span style={{ color: '#FFF' }}>{cb.rate}</span></span>
                                <span style={{ color: '#888' }}>NEXT: {cb.next}</span>
                            </div>
                        </div>
                    ))}

                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600', fontFamily: 'IBM Plex Mono', marginTop: '4px' }}>ECONOMIC CALENDAR (7d)</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {ECONOMIC_CALENDAR.map((ev, i) => (
                            <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #111', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span style={{ color: '#888' }}>{ev.date}</span>
                                    <span style={{ color: IMPACT_COLOR[ev.impact], fontSize: '9px', border: `1px solid ${IMPACT_COLOR[ev.impact]}`, padding: '1px 4px' }}>{ev.impact}</span>
                                </div>
                                <div style={{ color: '#FFF', marginBottom: '2px' }}>{ev.event}</div>
                                <div style={{ color: '#888' }}>EXP: <span style={{ color: '#FFCC00' }}>{ev.exp}</span> · PRIOR: {ev.prior}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MacroModule;
