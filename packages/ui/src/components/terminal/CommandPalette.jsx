import React, { useState, useEffect, useRef } from 'react';
import useTerminalStore from '../../store/useTerminalStore';

const CommandPalette = ({ onClose }) => {
    const { setActiveSymbol, setActiveMode, searchSymbols } = useTerminalStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const debounceRef = useRef(null);

    const MODES = {
        'EQUITIES': 'EQUITIES', 'BONDS': 'FIXED INCOME', 'FOREX': 'FOREX',
        'COMMODITIES': 'COMMODITIES', 'CRYPTO': 'CRYPTO', 'SAT': 'SATELLITE',
        'SATELLITE': 'SATELLITE', 'FLEET': 'FLEET', 'AVIATION': 'AVIATION', 'MACRO': 'MACRO',
    };

    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults([]);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            const searchRes = await searchSymbols(query);
            if (Array.isArray(searchRes)) {
                setResults(searchRes);
            }
            setIsLoading(false);
            setSelectedIndex(0);
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query, searchSymbols]);

    const handleSelect = (item) => {
        if (typeof item === 'string') {
            const q = item.toUpperCase().trim();
            if (MODES[q]) {
                setActiveMode(MODES[q]);
            } else {
                setActiveSymbol(q);
            }
        } else {
            setActiveSymbol(item.symbol);
        }
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results.length > 0 && results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            } else {
                handleSelect(query);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '100px', backdropFilter: 'blur(4px)' }}>
            <div style={{ width: '640px', background: '#0D0D0D', border: '1px solid #FF6600', boxShadow: '0 0 30px rgba(255,102,0,0.2)' }}>
                <form onSubmit={(e) => e.preventDefault()}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: '12px', borderBottom: '1px solid #1A1A1A' }}>
                        <span style={{ color: '#FF6600', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}>{'>'}</span>
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search any stock, index (NIFTY 50), or mode (MACRO)..."
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontFamily: 'IBM Plex Mono', fontSize: '15px' }}
                        />
                        {isLoading && <span style={{ color: '#FF6600', fontSize: '10px' }}>SEARCHING...</span>}
                    </div>
                </form>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {results.map((res, i) => (
                        <div
                            key={res.symbol}
                            onClick={() => handleSelect(res)}
                            onMouseEnter={() => setSelectedIndex(i)}
                            style={{
                                padding: '12px 16px',
                                background: selectedIndex === i ? 'rgba(255,102,0,0.1)' : 'transparent',
                                borderLeft: `2px solid ${selectedIndex === i ? '#FF6600' : 'transparent'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.1s ease',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: selectedIndex === i ? '#FF6600' : '#FFF', fontSize: '13px', fontWeight: 'bold', fontFamily: 'IBM Plex Mono' }}>{res.symbol}</span>
                                <span style={{ color: '#666', fontSize: '11px' }}>{res.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', padding: '2px 6px', background: '#1A1A1A', color: '#888', borderRadius: '2px' }}>{res.exchange}</span>
                                <span style={{ fontSize: '9px', padding: '2px 6px', background: '#222', color: '#FF6600', borderRadius: '2px' }}>{res.typeDisp}</span>
                            </div>
                        </div>
                    ))}

                    {query && !isLoading && results.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
                            No results found. Press ENTER to search exactly for "{query.toUpperCase()}"
                        </div>
                    )}
                </div>

                {!query && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #1A1A1A' }}>
                        <div style={{ color: '#888888', fontSize: '10px', marginBottom: '10px', letterSpacing: '0.1em' }}>QUICK MODES</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['EQUITIES', 'FIXED INCOME', 'FOREX', 'COMMODITIES', 'CRYPTO', 'SATELLITE', 'FLEET', 'AVIATION', 'MACRO'].map(m => (
                                <span key={m} onClick={() => { setActiveMode(m); onClose(); }}
                                    style={{ cursor: 'pointer', padding: '3px 10px', border: '1px solid #1A1A1A', color: '#888888', fontSize: '11px', fontFamily: 'IBM Plex Mono' }}>
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ padding: '8px 16px', borderTop: '1px solid #111', color: '#333', fontSize: '9px', fontFamily: 'IBM Plex Mono', display: 'flex', justifyContent: 'space-between' }}>
                    <span>↑↓ TO NAVIGATE · ENTER TO SELECT</span>
                    <span>AXIOM GLOBAL DISCOVERY v4.0</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
