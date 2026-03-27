import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, Command, Globe } from 'lucide-react';
import { getSymbols } from '../../api/index';
import { useData } from '../../context/DataContext';
import React, { useState, useEffect, useRef } from 'react';

const Header = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [stockDatabase, setStockDatabase] = useState([]);
    const { user, activeExchange, setActiveExchange, setActiveSymbol } = useData();

    useEffect(() => {
        const fetchSymbols = async () => {
            try {
                const res = await getSymbols(activeExchange);
                setStockDatabase(res.data);
                setSearchQuery(''); // Clear search on exchange change
            } catch (err) {
                console.error(`Failed to fetch symbols for ${activeExchange}:`, err);
            }
        };
        fetchSymbols();
    }, [activeExchange]);

    const getSimilarStocks = (query) => {
        if (!query) return [];
        return stockDatabase.filter(s =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8); // Limit results for performance
    };

    const handleSelectStock = (symbol) => {
        setIsDropdownOpen(false);
        setSearchQuery('');
        setActiveSymbol(symbol);

        // If not on dashboard or stock page, navigate to dashboard to show it
        const path = window.location.pathname;
        if (path !== '/dashboard' && !path.startsWith('/stock/')) {
            navigate('/dashboard');
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = () => setIsDropdownOpen(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);
    return (
        <header className="glass-panel h-20 px-8 flex items-center justify-between sticky top-0 z-40 mb-6 border-b-0 border-white/5 mt-4 mx-6 rounded-2xl">
            <div className="flex items-center gap-4 lg:hidden">
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                    <Menu className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">TradeX</span>
                </div>
            </div>

            {/* Premium Apple-Style Search with Auto-suggest */}
            <div className="hidden md:flex flex-col relative group w-[420px] transition-all duration-500">
                <div className="flex items-center relative gap-2">
                    {/* Exchange Selector */}
                    <select
                        value={activeExchange}
                        onChange={(e) => setActiveExchange(e.target.value)}
                        className="glass-input pl-8 pr-4 py-2.5 text-xs text-white uppercase tracking-widest font-bold border-none bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 transition-all appearance-none"
                    >
                        <option value="nse">NSE</option>
                        <option value="bse">BSE</option>
                        <option value="us">USA</option>
                        <option value="japan">JAP</option>
                        <option value="uk">LSE</option>
                    </select>
                    <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />

                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder={`Search ${activeExchange.toUpperCase()} symbols...`}
                            className="w-full pl-10 pr-12 py-2.5 glass-input text-gray-300 placeholder-gray-600 focus:placeholder-gray-500 transition-all text-sm"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-gray-600 border border-gray-700/50 rounded px-1.5 py-0.5 pointer-events-none group-focus-within:opacity-0 transition-opacity">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </div>
                    </div>
                </div>

                {/* Search Result Dropdown */}
                {isDropdownOpen && searchQuery.length >= 1 && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full glass-panel rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 border border-white/10 overflow-hidden">
                        <div className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest flex justify-between items-center">
                            <span>Market Discoveries</span>
                            <span className="text-blue-500">Similar Assets</span>
                        </div>
                        <div className="space-y-1">
                            {getSimilarStocks(searchQuery).map((stock, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelectStock(stock.symbol)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group/item text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">
                                            {stock.symbol[0]}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white tracking-tight">{stock.symbol}</div>
                                            <div className="text-[10px] text-gray-500 font-medium">{activeExchange.toUpperCase()} · {stock.sector}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {stock.price ? (
                                            <>
                                                <div className="text-xs font-mono font-bold text-white">₹{stock.price}</div>
                                                <div className="text-[9px] text-green-400 font-bold">+{stock.change}%</div>
                                            </>
                                        ) : (
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Active</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {getSimilarStocks(searchQuery).length === 0 && (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-gray-700 mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No matching vectors found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-6">
                {/* Notifications */}
                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-premium hover-press relative group">
                        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-900 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    </button>
                </div>

                <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                {/* Profile */}
                <div
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-3 cursor-pointer group p-1.5 pr-3 hover:bg-white/5 rounded-xl transition-premium hover-press border border-transparent hover:border-white/5"
                >
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 p-[1px]">
                            <div className="w-full h-full rounded-[11px] bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                {/* Avatar Placeholder */}
                                <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                    {user?.email ? user.email.substring(0, 2).toUpperCase() : 'ME'}
                                </span>
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full border border-gray-900"></div>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors w-24 truncate">
                            {user?.email || 'User'}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">
                            {user?.is_superuser ? 'System Admin' : 'Standard Tier'}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
