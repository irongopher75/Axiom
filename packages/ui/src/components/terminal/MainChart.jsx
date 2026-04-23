import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import useTerminalStore from '../../store/useTerminalStore';
import { getQuoteHistory } from '../../api';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

const INDICATORS = [
    { id: 'SMA20', name: 'SMA 20', color: '#FF6600', type: 'MA' },
    { id: 'SMA50', name: 'SMA 50', color: '#00CCFF', type: 'MA' },
    { id: 'EMA9', name: 'EMA 9', color: '#FF00FF', type: 'MA' },
    { id: 'RSI14', name: 'RSI 14', color: '#FFD700', type: 'OSC' }
];

const MainChart = () => {
    const activeSymbol = useTerminalStore((state) => state.activeSymbol);
    const liveData = useTerminalStore((state) => state.equityPrices[activeSymbol]);
    const [interval, setInterval] = useState('5m');
    const [visibleIndicators, setVisibleIndicators] = useState(['SMA20', 'SMA50']);
    const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
    const [candles, setCandles] = useState([]);
    const [indicatorData, setIndicatorData] = useState({});

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candlestickSeriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const seriesRefs = useRef({});
    const workerRef = useRef(null);
    const workerRequestKeyRef = useRef(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../../workers/dataWorker.js', import.meta.url));
        workerRef.current.onmessage = ({ data }) => {
            if (data?.type !== 'INDICATORS_READY') return;
            const { key, indicatorData: nextIndicatorData } = data.payload || {};
            if (!key || key !== workerRequestKeyRef.current) return;
            setIndicatorData(nextIndicatorData || {});
        };

        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!activeSymbol) return;

            try {
                const yfInterval = interval.toLowerCase().replace('w', 'wk');
                const period = ['1m', '5m', '15m'].includes(interval) ? '1d' : '1mo';
                const res = await getQuoteHistory(activeSymbol, yfInterval, period);
                setCandles(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch chart history:', err);
            }
        };

        fetchHistory();
    }, [activeSymbol, interval]);

    useEffect(() => {
        if (!workerRef.current) return;
        const requestKey = `${activeSymbol || ''}:${interval}:${candles.length}:${visibleIndicators.join(',')}`;
        workerRequestKeyRef.current = requestKey;
        workerRef.current.postMessage({
            type: 'CALCULATE_INDICATORS',
            payload: {
                key: requestKey,
                candles,
                visibleIndicators
            }
        });
    }, [activeSymbol, interval, candles, visibleIndicators]);

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
            crosshair: { mode: 0 },
            rightPriceScale: { borderVisible: false },
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
            priceScaleId: '',
        });

        chart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
        volumeSeriesRef.current = volumeSeries;
        seriesRefs.current = {};

        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries.length || !chartContainerRef.current) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
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

        candlestickSeriesRef.current.setData(candles);
        volumeSeriesRef.current.setData(
            candles.map((d) => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(0, 255, 65, 0.4)' : 'rgba(255, 34, 68, 0.4)'
            }))
        );

        INDICATORS.forEach((indicator) => {
            const isVisible = visibleIndicators.includes(indicator.id);
            let series = seriesRefs.current[indicator.id];

            if (isVisible) {
                if (!series) {
                    seriesRefs.current[indicator.id] = chartRef.current.addSeries(LineSeries, {
                        color: indicator.color,
                        lineWidth: 1,
                        title: indicator.name,
                        priceScaleId: indicator.type === 'OSC' ? 'osc' : 'right'
                    });
                    if (indicator.type === 'OSC') {
                        chartRef.current.priceScale('osc').applyOptions({
                            scaleMargins: { top: 0.1, bottom: 0.7 },
                        });
                    }
                    series = seriesRefs.current[indicator.id];
                }

                series.setData(indicatorData[indicator.id] || []);
            } else if (series) {
                chartRef.current.removeSeries(series);
                delete seriesRefs.current[indicator.id];
            }
        });

        setTimeout(() => chartRef.current?.timeScale().fitContent(), 50);
    }, [candles, visibleIndicators, indicatorData]);

    useEffect(() => {
        if (!candlestickSeriesRef.current || !liveData || !candles.length) return;

        const last = candles[candles.length - 1];
        const currentMinute = Math.floor(Date.now() / 1000 / 60) * 60;
        const lastCandleMinute = Math.floor(last.time / 60) * 60;
        const isNewMinute = currentMinute > lastCandleMinute;

        if (!liveData.price || !last.close) return;
        if (Number(liveData.price).toFixed(2) === Number(last.close).toFixed(2) && !isNewMinute) return;

        candlestickSeriesRef.current.update({
            time: isNewMinute ? currentMinute : last.time,
            open: isNewMinute ? liveData.price : last.open,
            high: isNewMinute ? liveData.price : Math.max(last.high, liveData.price),
            low: isNewMinute ? liveData.price : Math.min(last.low, liveData.price),
            close: liveData.price
        });
    }, [liveData, candles]);

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
                    <button
                        onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                        style={{ padding: '2px 8px', border: '1px solid #333', background: showIndicatorMenu ? '#FF660022' : 'transparent', color: showIndicatorMenu ? '#FF6600' : '#888', cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: '10px', marginRight: '8px', borderRadius: '2px' }}
                    >
                        fx INDICATORS
                    </button>

                    {showIndicatorMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '4px', background: '#0D0D0D', border: '1px solid #333', zIndex: 100, width: '120px', padding: '4px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            {INDICATORS.map((indicator) => (
                                <div
                                    key={indicator.id}
                                    onClick={() => setVisibleIndicators((prev) => (prev.includes(indicator.id) ? prev.filter((id) => id !== indicator.id) : [...prev, indicator.id]))}
                                    style={{ padding: '6px 12px', cursor: 'pointer', color: visibleIndicators.includes(indicator.id) ? indicator.color : '#444', background: 'transparent', transition: 'all 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <span>{indicator.name}</span>
                                    {visibleIndicators.includes(indicator.id) && <span style={{ fontSize: '8px' }}>●</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ height: '14px', width: '1px', background: '#1A1A1A', margin: '0 4px' }} />

                    {INTERVALS.map((iv) => (
                        <button
                            key={iv}
                            onClick={() => setInterval(iv)}
                            style={{ padding: '2px 6px', border: `1px solid ${interval === iv ? '#FF6600' : '#1A1A1A'}`, background: 'transparent', color: interval === iv ? '#FF6600' : '#666', cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}
                        >
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
