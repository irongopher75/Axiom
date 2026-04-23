import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Command, TrendingUp, History, Star } from 'lucide-react';
import useTerminalStore from '../../store/useTerminalStore';

/**
 * CommandPalette: A premium, keyboard-driven search and command interface.
 */
const CommandPalette = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const paletteRef = useRef(null);

    const searchSymbols = useTerminalStore(state => state.searchSymbols);
    const setActiveSymbol = useTerminalStore(state => state.setActiveSymbol);
    const watchlist = useTerminalStore(state => state.watchlist);

    useEffect(() => {
        inputRef.current?.focus();
        
        const handleClickOutside = (e) => {
            if (paletteRef.current && !paletteRef.current.contains(e.target)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const searchResults = await searchSymbols(query);
                setResults(searchResults || []);
                setSelectedIndex(0);
            } catch (err) {
                console.error("Palette search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 200);

        return () => clearTimeout(delayDebounceFn);
    }, [query, searchSymbols]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (results.length || 1));
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
        }
        if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex].symbol);
        }
    };

    const handleSelect = (symbol) => {
        setActiveSymbol(symbol);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                ref={paletteRef}
                className="w-full max-w-2xl glass-card rounded-3xl border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onKeyDown={handleKeyDown}
            >
                {/* Search Input Area */}
                <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/5">
                    <Search className="w-6 h-6 text-axiom-orange opacity-60" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value.toUpperCase())}
                        className="flex-1 bg-transparent border-none text-xl text-white focus:outline-none font-mono placeholder:text-gray-600"
                        placeholder="Search for symbols, commands, or data vectors..."
                    />
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-lg border border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <span>ESC to close</span>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    {query.length < 2 ? (
                        <div className="p-4 space-y-6">
                            {/* Recent / Watchlist Suggestions */}
                            {watchlist.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2">
                                        <Star className="w-3 h-3" /> Watchlist
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {watchlist.slice(0, 6).map((symbol) => (
                                            <button
                                                key={symbol}
                                                onClick={() => handleSelect(symbol)}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 transition-all text-left group"
                                            >
                                                <span className="font-bold text-sm">{symbol}</span>
                                                <TrendingUp className="w-3 h-3 text-axiom-green opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2">
                                    <Command className="w-3 h-3" /> Common Actions
                                </h4>
                                <div className="space-y-1">
                                    <CommandAction icon={<History className="w-4 h-4" />} label="View Portfolio History" shortcut="G H" />
                                    <CommandAction icon={<Search className="w-4 h-4" />} label="Global Market Scan" shortcut="G S" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {isSearching && (
                                <div className="p-8 text-center text-axiom-orange font-bold text-xs uppercase animate-pulse tracking-[0.3em]">
                                    Scanning Global Nodes...
                                </div>
                            )}
                            {results.map((item, index) => (
                                <button
                                    key={item.symbol}
                                    onClick={() => handleSelect(item.symbol)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`
                                        w-full flex items-center justify-between p-4 rounded-2xl transition-all
                                        ${index === selectedIndex ? 'bg-axiom-orange/10 border border-axiom-orange/20' : 'bg-transparent border border-transparent'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs
                                            ${index === selectedIndex ? 'bg-axiom-orange text-black' : 'bg-white/5 text-gray-400'}
                                        `}>
                                            {item.symbol.slice(0, 2)}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-white text-sm tracking-tight">{item.symbol}</div>
                                            <div className="text-[10px] text-gray-500 font-medium truncate max-w-[300px]">{item.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-axiom-orange opacity-60 uppercase tracking-widest px-3 py-1 border border-axiom-orange/10 rounded-lg">
                                        {item.exchange}
                                    </div>
                                </button>
                            ))}
                            {!isSearching && results.length === 0 && (
                                <div className="p-12 text-center text-gray-600 font-bold text-xs uppercase tracking-[0.2em]">
                                    No assets found matching "{query}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-gray-600 uppercase tracking-widest">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded">↵</kbd> Select</span>
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑↓</kbd> Navigate</span>
                    </div>
                    <span>AXIOM COMMAND SUBSYSTEM V1.0</span>
                </div>
            </div>
        </div>
    );
};

const CommandAction = ({ icon, label, shortcut }) => (
    <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-left text-gray-400 hover:text-white group">
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex gap-1">
            {shortcut.split(' ').map(s => (
                <kbd key={s} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] font-mono group-hover:bg-white/10">{s}</kbd>
            ))}
        </div>
    </button>
);

export default CommandPalette;
