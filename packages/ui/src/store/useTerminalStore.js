import { create } from 'zustand';
import api from '../api/index';
import wsClient from '../api/wsClient';

const useTerminalStore = create((set, get) => ({
    activeMode: 'EQUITIES',
    activeSymbol: 'AAPL',
    isLive: false,

    // LIVE DATA STREAMS
    equityPrices: {}, // { symbol: { price, volume, timestamp } }
    watchlist: [],
    vessels: [],
    aircraft: [],
    intelFeed: [],
    portfolio: [],

    // UI STATE
    panels: {
        watchlist: true,
        mainChart: true,
        orderFlow: true,
        intelligence: true,
        globalIntel: true,
    },

    // ACTIONS
    setActiveMode: (mode) => set({ activeMode: mode }),
    setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
    setLiveStatus: (status) => set({ isLive: status }),

    togglePanel: (panelName) => set((state) => ({
        panels: { ...state.panels, [panelName]: !state.panels[panelName] }
    })),

    addPosition: (pos) => set((state) => ({
        portfolio: [...state.portfolio, pos]
    })),

    removePosition: (symbol) => set((state) => ({
        portfolio: state.portfolio.filter(p => p.symbol !== symbol)
    })),

    fetchPortfolio: async () => {
        try {
            const res = await api.get('/api/v1/trades/active');
            set({ portfolio: res.data.map(t => ({
                symbol: t.symbol,
                qty: t.quantity,
                avgPrice: t.entry_price,
                tradeId: t.id
            })) });
        } catch (e) {
            console.error('[AXIOM] Failed to fetch portfolio:', e);
        }
    },

    fetchWatchlist: async () => {
        try {
            const res = await api.get('/api/v1/users/watchlist');
            set({ watchlist: res.data });
            return res.data;
        } catch (e) {
            console.error('[AXIOM] Failed to fetch watchlist:', e);
            return [];
        }
    },

    addToWatchlist: async (symbol) => {
        try {
            const res = await api.post(`/api/v1/users/watchlist/${symbol}`);
            set({ watchlist: res.data });
            // Re-fetch batch to get the price immediately
            get().connect(true); 
        } catch (e) {
            console.error('[AXIOM] Failed to add to watchlist:', e);
        }
    },

    removeFromWatchlist: async (symbol) => {
        try {
            const res = await api.delete(`/api/v1/users/watchlist/${symbol}`);
            set({ watchlist: res.data });
        } catch (e) {
            console.error('[AXIOM] Failed to remove from watchlist:', e);
        }
    },

    getPortfolioMetrics: () => {
        const { portfolio, equityPrices } = get();
        let totalCost = 0;
        let currentValue = 0;
        let dayPl = 0;

        portfolio.forEach(pos => {
            const live = equityPrices[pos.symbol];
            const cost = pos.qty * pos.avgPrice;
            totalCost += cost;

            if (live) {
                const value = pos.qty * live.price;
                currentValue += value;
                // Simplified Day P&L calculation: (current - close) * qty
                // Since we might not have 'previous close' easily, we'll use (current - avg) * qty for total
                // but for "DAY P&L" specifically we need the delta from open/close.
                // For now, let's use the changePercent if available.
                if (live.changePercent) {
                    dayPl += (value * (live.changePercent / 100));
                }
            } else {
                currentValue += cost; // Fallback to cost if no live price
            }
        });

        const totalPl = currentValue - totalCost;
        const totalPlPct = totalCost > 0 ? (totalPl / totalCost) * 100 : 0;

        return {
            dayPl,
            totalPl,
            totalPlPct,
            currentValue,
            totalCost,
            count: portfolio.length,
            // Mocking these for now as they require benchmark correlation and historical data
            drawdown: -3.4,
            beta: 1.12,
            sharpe: 1.84
        };
    },

    // WEBSOCKET HUB CONNECTION
    connect: async (forceRefresh = false) => {
        if (!forceRefresh && (get().isLive || get()._connected)) return;
        set({ _connected: true });

        // Step 0: Ensure watchlist and portfolio are loaded
        if (get().watchlist.length === 0) {
            await get().fetchWatchlist();
        }
        if (get().portfolio.length === 0) {
            await get().fetchPortfolio();
        }

        // Step 1: Pre-seed with real last-close prices from yfinance
        const fetchLastKnownPrices = async () => {
            try {
                const res = await api.get('/api/v1/quotes/batch');
                const data = res.data;
                const priceMap = {};
                for (const [symbol, quote] of Object.entries(data)) {
                    priceMap[symbol] = {
                        price: quote.price,
                        volume: 0,
                        timestamp: Date.now(),
                        changePercent: quote.change_pct,
                        up: quote.up,
                        stale: quote.stale,
                        currency: quote.currency || 'USD',
                    };
                }
                set({ equityPrices: priceMap });
                console.log(`[AXIOM] Pre-seeded ${Object.keys(priceMap).length} symbols`);
            } catch (e) {
                console.warn('[AXIOM] Last-known price fetch failed');
            }
        };
        fetchLastKnownPrices();

        // Step 2: Connect to live WebSocket hub via wsClient
        wsClient.connect();

        wsClient.on('connection_change', ({ status }) => {
            set({ isLive: status === 'CONNECTED' });
        });

        wsClient.on('SNAPSHOT', (payload) => {
            set({
                vessels: payload.vessels || [],
                aircraft: payload.aircraft || []
            });
            console.log(`[AXIOM] Received snapshot: ${payload.vessels?.length} vessels, ${payload.aircraft?.length} aircraft`);
        });

        wsClient.on('EQUITY', (payload) => {
            set((state) => {
                const current = state.equityPrices[payload.symbol];
                // Only update if something actually changed to avoid over-rendering
                if (current && current.price === payload.price && current.volume === payload.volume) {
                    return state;
                }
                return {
                    equityPrices: {
                        ...state.equityPrices,
                        [payload.symbol]: {
                            price: payload.price,
                            volume: payload.volume,
                            timestamp: payload.timestamp,
                            changePercent: payload.change_pct,
                            up: payload.up,
                            currency: payload.currency || state.equityPrices[payload.symbol]?.currency || 'USD'
                        }
                    }
                };
            });
        });

        wsClient.on('VESSEL_DIFF', (payload) => {
            set((state) => {
                const newVessels = [...state.vessels];
                const { updated, removed } = payload;
                if (!updated && !removed) return state;

                (updated || []).forEach(v => {
                    const idx = newVessels.findIndex(exist => exist.mmsi === v.mmsi);
                    if (idx !== -1) newVessels[idx] = { ...newVessels[idx], ...v };
                    else newVessels.push(v);
                });
                const finalVessels = newVessels.filter(v => !(removed || []).includes(v.mmsi));
                return { vessels: finalVessels };
            });
        });

        wsClient.on('AIRCRAFT_DIFF', (payload) => {
            set((state) => {
                const newAircraft = [...state.aircraft];
                const { updated, removed } = payload;
                if (!updated && !removed) return state;

                (updated || []).forEach(a => {
                    const idx = newAircraft.findIndex(exist => exist.icao24 === a.icao24);
                    if (idx !== -1) newAircraft[idx] = { ...newAircraft[idx], ...a };
                    else newAircraft.push(a);
                });
                const finalAircraft = newAircraft.filter(a => !(removed || []).includes(a.icao24));
                return { aircraft: finalAircraft };
            });
        });

        wsClient.on('NEWS', (payload) => {
            set((state) => {
                const newFeed = [payload, ...state.intelFeed].slice(0, 100);
                return { intelFeed: newFeed };
            });
        });
    },

    sendCmd: (type, payload) => {
        wsClient.send({ type, ...payload });
    },

    searchSymbols: async (query) => {
        try {
            const res = await api.get(`/api/v1/search?q=${query}`);
            return res.data;
        } catch (e) {
            console.error('[AXIOM] Symbol search failed:', e);
            return [];
        }
    }
}));

export default useTerminalStore;
