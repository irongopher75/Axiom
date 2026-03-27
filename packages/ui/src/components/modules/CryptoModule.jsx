import React, { useState, useEffect } from 'react';
import api from '../../api/index';
import useTabVisibility from '../../hooks/useTabVisibility';

const CryptoModule = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const isVisible = useTabVisibility();

    useEffect(() => {
        const fetchCrypto = async () => {
            try {
                const res = await api.get('/api/v1/quotes/macro/crypto');
                if (res.data && res.data.assets) {
                    setData(res.data.assets);
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch crypto:", err);
                setError(true);
                setLoading(false);
            }
        };

        if (isVisible) {
            fetchCrypto();
        }
        
        const poll = setInterval(() => {
            if (isVisible) fetchCrypto();
        }, 60000);
        return () => clearInterval(poll);
    }, [isVisible]);

    const renderErrorState = () => (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF2244', fontSize: '11px', fontFamily: 'IBM Plex Mono', letterSpacing: '1px' }}>
            UNABLE TO FETCH INFO
        </div>
    );

    const mono = { fontFamily: 'IBM Plex Mono, monospace' };

    return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden' }}>
        <div style={{ padding: '5px 12px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', fontSize: '11px', ...mono, color: '#888', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
            <span>CRYPTO / F5</span>
            <span>{loading && data.length > 0 ? "↻ UPDATING..." : "LIVE POLLING"}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflowY: 'auto' }}>
            {loading && data.length === 0 ? (
                <div style={{ padding: '20px', color: '#888', fontSize: '11px', ...mono }}>FETCHING CRYPTO PRICES...</div>
            ) : error ? (
                renderErrorState()
            ) : data.length === 0 ? (
                <div style={{ padding: '20px', color: '#444', fontSize: '11px', ...mono, textAlign: 'center' }}>NO LIVE CRYPTO DATA AVAILABLE</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', ...mono, textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#111', color: '#666', borderBottom: '1px solid #1A1A1A' }}>
                            <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>ASSET</th>
                            <th style={{ padding: '8px 12px', fontWeight: 'normal', textAlign: 'right' }}>PRICE</th>
                            <th style={{ padding: '8px 12px', fontWeight: 'normal', textAlign: 'right' }}>24H CHG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1A1A1A' }}>
                                <td style={{ padding: '8px 12px', color: '#D4D4D4' }}>{item.symbol}</td>
                                <td style={{ padding: '8px 12px', color: '#FFF', textAlign: 'right' }}>
                                    ${(item.price ?? 0).toLocaleString(undefined, { 
                                        minimumFractionDigits: (item.price ?? 0) < 1 ? 4 : 2, 
                                        maximumFractionDigits: (item.price ?? 0) < 1 ? 4 : 2 
                                    })}
                                </td>
                                <td style={{ padding: '8px 12px', color: item.up ? '#00FF41' : '#FF3B30', textAlign: 'right' }}>
                                    {item.up ? '+' : ''}{item.change_pct ?? '0.00'}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
    );
};

export default CryptoModule;
