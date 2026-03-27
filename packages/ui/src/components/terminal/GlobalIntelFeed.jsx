import React, { useEffect, useState, useCallback } from 'react';
import api, { API_URL } from '../../api/index';

const CATEGORIES = ['ALL', 'EQUITY', 'MACRO', 'COMMODITY', 'CRYPTO', 'VESSEL', 'AVIATION', 'GEOPOLITICS', 'GEO'];
const SEVERITIES = ['ALL', 'RED', 'AMBER', 'GREEN'];

const SEV_COLOR = { RED: '#FF2244', AMBER: '#FFCC00', GREEN: '#00FF41' };
const CAT_COLOR = {
    EQUITY: '#00FF41', MACRO: '#FFCC00', COMMODITY: '#FF6600',
    CRYPTO: '#00CCFF', VESSEL: '#00CCFF', AVIATION: '#00CCFF',
    GEOPOLITICS: '#FF2244', GEO: '#FF6600', GENERAL: '#888',
};

const SEV_RANK = { RED: 3, AMBER: 2, GREEN: 1 };

const GlobalIntelFeed = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [catFilter, setCatFilter] = useState('ALL');
    const [sevFilter, setSevFilter] = useState('ALL');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const elapsedRef = React.useRef(null);

    const startTimer = () => {
        setElapsed(0);
        elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    };
    const stopTimer = () => {
        if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    };

    const fetchFeed = useCallback(async () => {
        startTimer();
        try {
            const params = { limit: 60 };
            if (catFilter !== 'ALL') params.category = catFilter;
            if (sevFilter !== 'ALL') params.severity = sevFilter;

            const res = await api.get('/api/v1/news/feed', { params });
            setArticles(res.data.articles || []);
            setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour12: false }));
            setError(null);
        } catch (e) {
            setError(`${e.response?.data?.detail || e.message || 'Network error'}`);
        } finally {
            setLoading(false);
            stopTimer();
        }
    }, [catFilter, sevFilter]);

    // Initial fetch + auto-refresh every 5 min
    useEffect(() => {
        setLoading(true);
        fetchFeed();
        const interval = setInterval(fetchFeed, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchFeed]);

    // Re-fetch when filters change
    useEffect(() => {
        fetchFeed();
    }, [catFilter, sevFilter]);

    const forceRefresh = async () => {
        setLoading(true);
        try {
            await api.post('/api/v1/news/refresh');
        } catch (_) { }
        await fetchFeed();
    };

    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: '#FF6600', letterSpacing: '0.06em', fontFamily: 'IBM Plex Mono' }}>
                    GLOBAL INTELLIGENCE FEED
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {lastRefresh && (
                        <span style={{ color: '#333', fontSize: '9px', fontFamily: 'IBM Plex Mono' }}>
                            {lastRefresh}
                        </span>
                    )}
                    <button onClick={forceRefresh}
                        style={{ background: 'transparent', border: '1px solid #1A1A1A', color: '#555', fontFamily: 'IBM Plex Mono', fontSize: '9px', cursor: 'pointer', padding: '1px 6px' }}
                        title="Force refresh">
                        ↺
                    </button>
                </div>
            </div>

            {/* Category filter pills */}
            <div style={{ display: 'flex', gap: '3px', padding: '5px 8px', borderBottom: '1px solid #111', overflowX: 'auto', flexShrink: 0 }}>
                {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                        style={{ padding: '1px 7px', border: `1px solid ${catFilter === c ? '#FF6600' : '#1A1A1A'}`, background: catFilter === c ? 'rgba(255,102,0,0.08)' : 'transparent', color: catFilter === c ? '#FF6600' : '#444', fontFamily: 'IBM Plex Mono', fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {c}
                    </button>
                ))}
                <div style={{ width: '1px', background: '#1A1A1A', margin: '0 3px', flexShrink: 0 }} />
                {SEVERITIES.slice(1).map(s => (
                    <button key={s} onClick={() => setSevFilter(sevFilter === s ? 'ALL' : s)}
                        style={{ padding: '1px 7px', border: `1px solid ${sevFilter === s ? SEV_COLOR[s] : '#1A1A1A'}`, background: 'transparent', color: sevFilter === s ? SEV_COLOR[s] : '#444', fontFamily: 'IBM Plex Mono', fontSize: '9px', cursor: 'pointer' }}>
                        {s}
                    </button>
                ))}
            </div>

            {/* Feed body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && (
                    <div style={{ padding: '20px', color: '#444', fontFamily: 'IBM Plex Mono', fontSize: '10px', textAlign: 'center' }}>
                        <div style={{ color: '#FF6600', marginBottom: '6px' }}>FETCHING INTELLIGENCE...</div>
                        <div style={{ color: '#333' }}>{elapsed}s — scraping Finnhub + GDELT</div>
                    </div>
                )}
                {error && !loading && (
                    <div style={{ padding: '12px', color: '#FF2244', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                        {error}<br />
                        <span style={{ color: '#444', fontSize: '9px' }}>Backend: {API_URL}</span>
                    </div>
                )}
                {!loading && !error && articles.length === 0 && (
                    <div style={{ padding: '12px', color: '#444', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                        No articles match current filters.
                    </div>
                )}
                {!loading && !error && articles.map((a, i) => (
                    <a
                        key={i}
                        href={a.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'block', padding: '8px 10px', borderBottom: '1px solid #111', borderLeft: `2px solid ${SEV_COLOR[a.severity] ?? '#333'}`, textDecoration: 'none', cursor: a.url ? 'pointer' : 'default' }}
                    >
                        {/* Meta row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ color: CAT_COLOR[a.category] ?? '#888', fontSize: '9px', fontFamily: 'IBM Plex Mono' }}>
                                    {a.category}
                                </span>
                                <span style={{ color: '#333', fontSize: '8px', fontFamily: 'IBM Plex Mono' }}>
                                    {a.data_source}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {/* Severity score pill */}
                                <span style={{ color: SEV_COLOR[a.severity], fontSize: '8px', fontFamily: 'IBM Plex Mono', border: `1px solid ${SEV_COLOR[a.severity]}22`, padding: '0 4px' }}>
                                    {a.severity_score}
                                </span>
                                <span style={{ color: '#333', fontSize: '9px', fontFamily: 'IBM Plex Mono' }}>
                                    {a.published_fmt}
                                </span>
                            </div>
                        </div>

                        {/* Headline */}
                        <div style={{ color: '#CCC', fontSize: '10px', fontFamily: 'IBM Plex Mono', lineHeight: '1.5', marginBottom: '2px' }}>
                            {a.headline}
                        </div>

                        {/* Sentiment */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{
                                fontSize: '9px',
                                fontFamily: 'IBM Plex Mono',
                                color: a.sentiment_color || (a.sentiment === 'BULLISH' ? '#00FF41' : a.sentiment === 'BEARISH' ? '#FF2244' : '#444'),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: a.sentiment_color || '#444' }}></span>
                                {a.sentiment} {a.sentiment_score !== undefined ? `(${a.sentiment_score})` : ''}
                            </span>
                            {a.source && (
                                <span style={{ fontSize: '9px', color: '#333', fontFamily: 'IBM Plex Mono' }}>
                                    via {a.source}
                                </span>
                            )}
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default GlobalIntelFeed;
