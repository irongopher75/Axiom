import { ShoppingBag, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, Search, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { executeManualTrade } from '../../api/index';
import { useData } from '../../context/DataContext';
import { useEffect, useRef, useState } from 'react';
import useTerminalStore from '../../store/useTerminalStore';
import { exportTradesWorkbook } from '../../utils/tradeWorkbook';

const getExchangeInfo = (symbol) => {
    if (symbol?.endsWith('.BO')) return { label: 'BSE', currency: '₹' };
    if (symbol?.endsWith('.T')) return { label: 'TYO', currency: '¥' };
    if (symbol?.endsWith('.L')) return { label: 'LSE', currency: '£' };
    if (!symbol?.includes('.')) return { label: 'US', currency: '$' };
    return { label: 'NSE', currency: '₹' };
};

const TradingTerminal = ({ symbol, currentPrice, onTradeSuccess }) => {
    const { systemConfig, setActiveSymbol, tradeHistory, activeTrades, performance, user } = useData();
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(currentPrice);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);

    // Dropdown state
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const dropdownRef = useRef(null);

    const searchSymbols = useTerminalStore(state => state.searchSymbols);

    // Debounced search effect
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchSymbols(searchQuery);
                setSearchResults(results || []);
            } catch (err) {
                console.error("Global search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
                setSearchQuery(''); // Revert view to global symbol
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectStock = (s) => {
        setActiveSymbol(s);
        setSearchQuery('');
        setIsDropdownOpen(false);
    };
    // Sync price if it changes in dashboard but not edited by user
    useEffect(() => {
        setPrice(currentPrice);
    }, [currentPrice]);

    const handleTrade = async (side) => {
        setLoading(true);
        setError(null);
        setStatus(null);
        try {
            await executeManualTrade(symbol, side, quantity, parseFloat(price));
            if (onTradeSuccess) onTradeSuccess();
            // Reset quantity after success
            setQuantity(1);
            setStatus(`${side} order routed successfully.`);
        } catch (err) {
            setError(err.response?.data?.detail || "Trade execution failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        setError(null);
        setStatus(null);

        try {
            const fileName = exportTradesWorkbook({
                userEmail: user?.email,
                activeTrades,
                tradeHistory,
                performance,
            });
            setStatus(`Trade workbook downloaded as ${fileName}. Open it in Numbers for the full breakdown.`);
        } catch (err) {
            console.error('Trade export failed:', err);
            setError('Trade export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const totalTrades = (tradeHistory?.length || 0) + (activeTrades?.length || 0);

    return (
        <div className="glass-card rounded-[2.5rem] p-8 border-white/5 flex flex-col gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="flex justify-between items-center relative z-10">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-blue-400" />
                    Trade Terminal
                </h3>
                <div className={`px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest border ${currentPrice ? 'border-green-500/20 text-green-400' : 'border-white/5 text-gray-400'}`}>
                    {currentPrice ? 'HFT Engine Live' : 'Initializing...'}
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Instrument</label>
                    <div className="relative group/input">
                        <input
                            type="text"
                            value={searchQuery || symbol}
                            onChange={(e) => {
                                setSearchQuery(e.target.value.toUpperCase());
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-premium font-mono font-bold uppercase tracking-tight"
                            placeholder="SEARCH ASSET"
                        />
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-400 transition-colors pointer-events-none" />
                        <ChevronDown className="w-3 h-3 absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    </div>

                    {/* Auto-suggest Dropdown */}
                    {isDropdownOpen && searchQuery.length > 0 && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full glass-panel premium-blur rounded-2xl p-2 shadow-2xl z-50 animate-slide-up">
                            <div className="space-y-1">
                                {isSearching && <div className="p-4 text-center text-[10px] text-blue-400 font-bold uppercase animate-pulse">Scanning Global Vectors...</div>}
                                {searchResults.map((stock, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectStock(stock.symbol)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group/item text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs font-bold text-white tracking-tight">{stock.symbol}</div>
                                            <div className="text-[9px] text-gray-500 font-medium uppercase tracking-tighter truncate max-w-[150px]">{stock.name}</div>
                                        </div>
                                        <div className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{stock.exchange}</div>
                                    </button>
                                ))}
                                {!isSearching && searchResults.length === 0 && (
                                    <div className="p-4 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                        No vectors match
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Quantity</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Price (Limit)</label>
                        <input
                            type="number"
                            step="0.05"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-[10px] font-bold uppercase leading-tight">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {status && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-blue-300 text-[10px] font-bold uppercase leading-tight">
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        {status}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                        onClick={() => handleTrade('BUY')}
                        disabled={loading || !symbol || searchQuery.length > 0}
                        className="py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-premium active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 hover-scale"
                    >
                        {loading ? <Clock className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                        Buy {symbol}
                    </button>
                    <button
                        onClick={() => handleTrade('SELL')}
                        disabled={loading || !symbol || searchQuery.length > 0}
                        className="py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-premium active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover-scale"
                    >
                        {loading ? <Clock className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4" />}
                        Sell {symbol}
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Numbers Export</div>
                            <div className="text-[10px] text-gray-400 leading-relaxed mt-1">
                                Export every trade into dedicated sheets with overview, symbol analysis, and monthly performance.
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-white">{totalTrades}</div>
                            <div className="text-[9px] uppercase tracking-widest text-gray-600">tracked trades</div>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting || totalTrades === 0}
                        className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-premium active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 border border-white/10"
                    >
                        {exporting ? <Clock className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
                        Export To Numbers
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest font-mono">EST. Margin Required ({(systemConfig?.margin_multiplier || 1)}x):</span>
                <span className="text-xs font-mono font-bold text-white">{getExchangeInfo(symbol).currency}{((quantity * price) / (systemConfig?.margin_multiplier || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
        </div>
    );
};

export default TradingTerminal;
