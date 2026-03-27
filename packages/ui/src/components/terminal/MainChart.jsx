import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import useTerminalStore from '../../store/useTerminalStore';
import { getQuoteHistory } from '../../api';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

const INDICATORS = [
    { id: 'SMA20', name: 'SMA 20', color: '#FF6600', type: 'MA' },
    { id: 'SMA50', name: 'SMA 50', color: '#00CCFF', type: 'MA' },
    { id: 'EMA9',  name: 'EMA 9',  color: '#FF00FF', type: 'MA' },
    { id: 'RSI14', name: 'RSI 14', color: '#FFD700', type: 'OSC' }
];

const calculateSMA = (data, period) => {
    return data.map((d, i) => {
        if (i < period - 1) return null;
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b.close, 0);
        return { time: d.time, value: sum / period };
    }).filter(d => d !== null);
};

const calculateEMA = (data, period) => {
    const k = 2 / (period + 1);
    let ema = data[0].close;
    return data.map((d, i) => {
        ema = d.close * k + ema * (1 - k);
        if (i < period - 1) return null;
        return { time: d.time, value: ema };
    }).filter(d => d !== null);
};

const calculateRSI = (data, period) => {
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    return data.map((d, i) => {
        if (i < period) return null;
        if (i > period) {
            const diff = data[i].close - data[i - 1].close;
            const gain = diff >= 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        return { time: d.time, value: 100 - (100 / (1 + rs)) };
    }).filter(d => d !== null);
};

// Generate realistic-looking OHLCV data walking backwards from latest price
// mock generator removed in favor of real API data

const MainChart = () => {
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const liveData = useTerminalStore(state => state.equityPrices[activeSymbol]);
    const [interval, setInterval] = useState('5m');
    const [visibleIndicators, setVisibleIndicators] = useState(['SMA20', 'SMA50']);
    const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
    
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candlestickSeriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const seriesRefs = useRef({}); // Stores dynamic indicator series

    const [candles, setCandles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch real history when symbol or interval changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (!activeSymbol) return;
            setIsLoading(true);
            try {
                // Map interval to yfinance format
                const yfInterval = interval.toLowerCase().replace('w', 'wk');
                const period = ['1m', '5m', '15m'].includes(interval) ? '1d' : '1mo';
                
                const res = await getQuoteHistory(activeSymbol, yfInterval, period);
                if (res.data && Array.isArray(res.data)) {
                    setCandles(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch chart history:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [activeSymbol, interval]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0D0D0D' },
                textColor: '#666',
            },
            grid: {
                vertLines: { color: '#1A1A1A' },
                horzLines: { color: '#1A1A1A' },
            },
            crosshair: {
                mode: 0,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
                shiftVisibleRangeOnNewBar: true,
            },
            handleScroll: true,
            handleScale: true,
            autoSize: false,
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#00FF41',
            downColor: '#FF2244',
            borderVisible: false,
            wickUpColor: '#00FF41',
            wickDownColor: '#FF2244',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // overlay
        });

        chart.priceScale('').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
        volumeSeriesRef.current = volumeSeries;

        // --- INDICATOR INITIALIZATION ---
        // Clear existing series refs on re-init
        seriesRefs.current = {};

        // Use ResizeObserver for robust panel resizing
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !chartContainerRef.current) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
            // Small delay to ensure fitContent works after resize
            setTimeout(() => chart.timeScale().fitContent(), 50);
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

        const data = candles;
        candlestickSeriesRef.current.setData(data);

        const volData = data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(0, 255, 65, 0.4)' : 'rgba(255, 34, 68, 0.4)'
        }));
        volumeSeriesRef.current.setData(volData);

        // --- DYNAMIC INDICATOR RENDERING ---
        INDICATORS.forEach(ind => {
            const isVisible = visibleIndicators.includes(ind.id);
            let series = seriesRefs.current[ind.id];

            if (isVisible) {
                if (!series) {
                    // Create series
                    if (ind.type === 'MA') {
                        seriesRefs.current[ind.id] = chartRef.current.addSeries(LineSeries, { 
                            color: ind.color, 
                            lineWidth: 1,
                            title: ind.name,
                            priceScaleId: 'right'
                        });
                    } else if (ind.type === 'OSC') {
                        seriesRefs.current[ind.id] = chartRef.current.addSeries(LineSeries, { 
                            color: ind.color, 
                            lineWidth: 1,
                            title: ind.name,
                            priceScaleId: 'osc' // Separate scale
                        });
                        chartRef.current.priceScale('osc').applyOptions({
                            scaleMargins: { top: 0.1, bottom: 0.7 },
                        });
                    }
                    series = seriesRefs.current[ind.id];
                }

                // Update data
                let indData = [];
                if (ind.id === 'SMA20') indData = calculateSMA(data, 20);
                else if (ind.id === 'SMA50') indData = calculateSMA(data, 50);
                else if (ind.id === 'EMA9') indData = calculateEMA(data, 9);
                else if (ind.id === 'RSI14') indData = calculateRSI(data, 14);

                series.setData(indData);
            } else if (series) {
                // Remove series
                chartRef.current.removeSeries(series);
                delete seriesRefs.current[ind.id];
            }
        });

        if (chartRef.current) {
            setTimeout(() => {
                chartRef.current.timeScale().fitContent();
            }, 50);
        }
    }, [candles, visibleIndicators]);

    // Live Data Integration
    useEffect(() => {
        if (!candlestickSeriesRef.current || !liveData || !candles.length) return;

        const live = liveData;
        const last = candles[candles.length - 1];

        const currentMinute = Math.floor(Date.now() / 1000 / 60) * 60;
        const lastCandleMinute = Math.floor(last.time / 60) * 60;
        const isNewMinute = currentMinute > lastCandleMinute;

        if (!live.price || !last.close) return;
        if (Number(live.price).toFixed(2) === Number(last.close).toFixed(2) && !isNewMinute) return;

        candlestickSeriesRef.current.update({
            time: isNewMinute ? currentMinute : last.time,
            open: isNewMinute ? live.price : last.open,
            high: isNewMinute ? live.price : Math.max(last.high, live.price),
            low: isNewMinute ? live.price : Math.min(last.low, live.price),
            close: live.price
        });
    }, [liveData, activeSymbol]);


    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'IBM Plex Mono', fontSize: '12px' }}>
                    <span style={{ color: '#FFF', fontWeight: 'bold' }}>{activeSymbol ?? 'AAPL'}</span>
                    {liveData ? (
                        <>
                            <span style={{ color: '#FFF', fontSize: '16px' }}>{Number(liveData.price).toFixed(2)}</span>
                            {liveData.changePercent != null && (
                                <span style={{ color: liveData.up ? '#00FF41' : '#FF2244', fontSize: '11px' }}>
                                    {liveData.up ? '▲' : '▼'} {Math.abs(liveData.changePercent).toFixed(2)}%
                                </span>
                            )}
                        </>
                    ) : (
                        <span style={{ color: '#333', fontSize: '13px' }}>---</span>
                    )}
                    <span style={{ color: '#444', fontSize: '9px' }}>ENGINE: LIGHTWEIGHT CHARTS</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', fontFamily: 'IBM Plex Mono', fontSize: '10px', position: 'relative' }}>
                    {/* INDICATOR TOGGLE BUTTON */}
                    <button 
                        onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                        style={{ padding: '2px 8px', border: '1px solid #333', background: showIndicatorMenu ? '#FF660022' : 'transparent', color: showIndicatorMenu ? '#FF6600' : '#888', cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: '10px', marginRight: '8px', borderRadius: '2px' }}
                    >
                        ƒx INDICATORS
                    </button>

                    {/* DROPDOWN MENU */}
                    {showIndicatorMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '4px', background: '#0D0D0D', border: '1px solid #333', zIndex: 100, width: '120px', padding: '4px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            {INDICATORS.map(ind => (
                                <div 
                                    key={ind.id} 
                                    onClick={() => {
                                        setVisibleIndicators(prev => 
                                            prev.includes(ind.id) ? prev.filter(i => i !== ind.id) : [...prev, ind.id]
                                        );
                                    }}
                                    style={{ padding: '6px 12px', cursor: 'pointer', color: visibleIndicators.includes(ind.id) ? ind.color : '#444', background: 'transparent', transition: 'all 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <span>{ind.name}</span>
                                    {visibleIndicators.includes(ind.id) && <span style={{ fontSize: '8px' }}>●</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ height: '14px', width: '1px', background: '#1A1A1A', margin: '0 4px' }} />

                    {INTERVALS.map(iv => (
                        <button key={iv} onClick={() => setInterval(iv)}
                            style={{ padding: '2px 6px', border: `1px solid ${interval === iv ? '#FF6600' : '#1A1A1A'}`, background: 'transparent', color: interval === iv ? '#FF6600' : '#666', cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                            {iv}
                        </button>
                    ))}
                </div>
            </div>

            <div ref={chartContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }} />
        </div>
    );
};

export default MainChart;
