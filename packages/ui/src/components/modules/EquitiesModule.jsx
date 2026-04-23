import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api';
import useTerminalStore from '../../store/useTerminalStore';

// yfinance ticker suffix per exchange
const EXCHANGE_SUFFIX = { NSE: '.NS', BSE: '.BO', TSE: '.T', NASDAQ: '', NYSE: '' };

const EXCHANGES = [
    { id: 'NSE',    label: 'NSE',    flag: '🇮🇳', currency: '₹' },
    { id: 'NASDAQ', label: 'NASDAQ', flag: '🇺🇸', currency: '$' },
    { id: 'NYSE',   label: 'NYSE',   flag: '🇺🇸', currency: '$' },
    { id: 'TSE',    label: 'TOKYO',  flag: '🇯🇵', currency: '¥' },
    { id: 'BSE',    label: 'BSE',    flag: '🇮🇳', currency: '₹' },
];

const EquitiesModule = () => {
    const setActiveSymbol = useTerminalStore(s => s.setActiveSymbol);

    const [exchange, setExchange] = useState('NSE');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
    const [symbols, setSymbols] = useState([]);   // symbol metadata rows
    const [quotes, setQuotes] = useState({});      // { symbol: quote }
    const [loadingSymbols, setLoadingSymbols] = useState(true);
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState(null); // null = not searching
    const [error, setError] = useState(null);

    const quoteTimer = useRef(null);

    // ── 1. Fetch symbol list for the current page ─────────────────────────────
    const loadSymbols = useCallback(async (exch, pg) => {
        setLoadingSymbols(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/symbols/list', {
                params: { exchange: exch, page: pg, page_size: 50 },
            });
            const data = res.data;
            setSymbols(data.symbols || []);
            setMeta({ total: data.total, total_pages: data.total_pages });
        } catch (e) {
            setError('Could not load symbol list.');
            setSymbols([]);
        } finally {
            setLoadingSymbols(false);
        }
    }, []);

    // ── 2. Batch-price the current page's symbols ─────────────────────────────
    const loadQuotes = useCallback(async (rows) => {
        if (!rows || rows.length === 0) return;
        setLoadingQuotes(true);
        try {
            const tickers = rows.map(r => r.symbol).join(',');
            const res = await api.get('/api/v1/quotes/batch', { params: { symbols: tickers } });
            setQuotes(res.data || {});
        } catch (_) {
            // quotes failing shouldn't hide the symbol list
        } finally {
            setLoadingQuotes(false);
        }
    }, []);

    // ── 3. Search ─────────────────────────────────────────────────────────────
    const runSearch = useCallback(async (q) => {
        if (!q.trim()) { setSearchResults(null); return; }
        try {
            const res = await api.get('/api/v1/search', { params: { q: q.trim() } });
            setSearchResults(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setSearchResults([]);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => runSearch(search), 300);
        return () => clearTimeout(t);
    }, [search, runSearch]);

    // Load symbols when exchange/page changes
    useEffect(() => {
        setSearchResults(null);
        setSearch('');
        setQuotes({});
        loadSymbols(exchange, page);
    }, [exchange, page, loadSymbols]);

    // Load quotes after symbols arrive, then refresh every 60s
    useEffect(() => {
        clearInterval(quoteTimer.current);
        if (symbols.length > 0) {
            loadQuotes(symbols);
            quoteTimer.current = setInterval(() => loadQuotes(symbols), 60000);
        }
        return () => clearInterval(quoteTimer.current);
    }, [symbols, loadQuotes]);

    const displayRows = searchResults ?? symbols;
    const exMeta = EXCHANGES.find(e => e.id === exchange) || EXCHANGES[0];

    return (
        <div className="h-full flex flex-col bg-[#050505] font-mono text-[#E8E8E0] overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] flex-shrink-0">
                <div>
                    <h2 className="text-axiom-orange text-lg font-bold tracking-[0.2em] uppercase">
                        Global Equities
                    </h2>
                    <span className="text-[10px] text-gray-500 uppercase">
                        {meta.total} symbols · page {page}/{meta.total_pages}
                        {loadingQuotes && <span className="ml-3 text-axiom-orange animate-pulse">Pricing…</span>}
                    </span>
                </div>

                {/* Search */}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search symbol or name…"
                    className="bg-[#0D0D0D] border border-[#1A1A1A] focus:border-axiom-orange/50 outline-none text-white text-[11px] px-3 py-2 w-64 rounded-sm placeholder-gray-700 transition-all"
                />
            </div>

            {/* ── Exchange tabs ── */}
            <div className="flex gap-1 px-6 pt-4 pb-3 border-b border-[#1A1A1A] flex-shrink-0">
                {EXCHANGES.map(ex => (
                    <button
                        key={ex.id}
                        onClick={() => { setExchange(ex.id); setPage(1); }}
                        className={`px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm transition-all ${
                            exchange === ex.id
                                ? 'bg-axiom-orange text-black'
                                : 'text-gray-500 hover:text-white hover:bg-[#1A1A1A] border border-[#1A1A1A]'
                        }`}
                    >
                        {ex.flag} {ex.label}
                    </button>
                ))}
            </div>

            {/* ── Table ── */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {error && (
                    <div className="m-6 px-4 py-3 bg-axiom-red/10 border border-axiom-red/30 text-axiom-red text-[10px] rounded-sm">
                        ⚠ {error}
                    </div>
                )}

                {loadingSymbols ? (
                    <div className="h-full flex items-center justify-center text-axiom-orange text-[10px] tracking-widest uppercase animate-pulse">
                        Loading {exMeta.label} symbols…
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#080808] border-b border-[#1A1A1A]">
                            <tr className="text-[9px] text-gray-600 uppercase tracking-widest">
                                <th className="px-6 py-3 w-8">#</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3 text-right">Price</th>
                                <th className="px-4 py-3 text-right">Change</th>
                                <th className="px-4 py-3 text-right">Prev Close</th>
                                <th className="px-4 py-3">Exchange</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[10px] text-gray-700 uppercase tracking-widest">
                                        {search ? 'No results found' : 'No data available'}
                                    </td>
                                </tr>
                            ) : displayRows.map((row, i) => {
                                const q = quotes[row.symbol];
                                const up = q?.up ?? null;
                                const rowNum = (page - 1) * 50 + i + 1;
                                return (
                                    <tr
                                        key={`${row.symbol}-${row.exchange}`}
                                        onClick={() => setActiveSymbol(row.symbol)}
                                        className="border-b border-[#111] hover:bg-white/[0.03] cursor-pointer group transition-all"
                                    >
                                        <td className="px-6 py-3 text-[10px] text-gray-700 w-8">{rowNum}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-[12px] font-bold group-hover:text-axiom-orange transition-colors">
                                                {row.symbol}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-gray-400 max-w-xs truncate">{row.name}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {q?.price != null ? (
                                                <span className="text-[12px] font-bold text-white">
                                                    {exMeta.currency}{Number(q.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-700">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {q?.change_pct != null ? (
                                                <span className={`text-[11px] font-bold ${up ? 'text-axiom-green' : 'text-axiom-red'}`}>
                                                    {up ? '▲' : '▼'} {Math.abs(q.change_pct).toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-700">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-[10px] text-gray-500">
                                            {q?.prev_close != null
                                                ? `${exMeta.currency}${Number(q.prev_close).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[9px] text-gray-600 uppercase">{row.exchange || exchange}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination ── */}
            {!search && meta.total_pages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-[#1A1A1A] flex-shrink-0">
                    <span className="text-[10px] text-gray-600 uppercase">
                        Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, meta.total)} of {meta.total}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1 text-[10px] border border-[#1A1A1A] text-gray-500 hover:text-white hover:border-axiom-orange/40 disabled:opacity-20 disabled:cursor-not-allowed rounded-sm transition-all"
                        >
                            ← PREV
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
                            disabled={page >= meta.total_pages}
                            className="px-3 py-1 text-[10px] border border-[#1A1A1A] text-gray-500 hover:text-white hover:border-axiom-orange/40 disabled:opacity-20 disabled:cursor-not-allowed rounded-sm transition-all"
                        >
                            NEXT →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquitiesModule;
