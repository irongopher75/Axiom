import { create } from "zustand";
import api from "../api";
import wsClient from "../api/wsClient";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// ------------------------------------------------------------------ //
//  Helpers                                                             //
// ------------------------------------------------------------------ //

/**
 * POST /api/v1/portfolio/metrics
 * Sends the current holdings and returns real risk metrics.
 */
async function fetchPortfolioMetrics(holdings) {
  if (!holdings || holdings.length === 0) {
    return null;
  }

  const response = await fetch(`${API_BASE}/api/v1/portfolio/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${response.status}`);
  }

  return response.json();
}

// ------------------------------------------------------------------ //
//  Store                                                               //
// ------------------------------------------------------------------ //

const useTerminalStore = create((set, get) => ({
  // ---- Core State -------------------------------------------------- //
  activeMode: 'EQUITIES',
  setActiveMode: (mode) => set({ activeMode: mode }),
  activeSymbol: 'AAPL',
  setActiveSymbol: (sym) => set({ activeSymbol: sym }),
  equityPrices: {},
  isLive: false,
  vessels: [],
  aircraft: [],
  intelFeed: [],
  _connected: false,

  // ---- Positions & Portfolio --------------------------------------- //
  positions: [],
  portfolio: [], // Legacy alias

  addPosition: (position) =>
    set((state) => ({
      positions: [...state.positions, position],
      portfolio: [...state.positions, position],
    })),

  removePosition: (symbol) =>
    set((state) => ({
      positions: state.positions.filter((p) => p.symbol !== symbol),
      portfolio: state.positions.filter((p) => p.symbol !== symbol),
    })),

  updatePosition: (symbol, updates) =>
    set((state) => {
        const newPositions = state.positions.map((p) =>
            p.symbol === symbol ? { ...p, ...updates } : p
        );
        return {
            positions: newPositions,
            portfolio: newPositions,
        };
    }),

  fetchPortfolio: async () => {
    try {
        const res = await api.get('/api/v1/trades/active');
        const legacyData = res.data.map(t => ({
            symbol: t.symbol,
            qty: t.quantity,
            avgPrice: t.entry_price,
            tradeId: t.id
        }));
        set({ 
            portfolio: legacyData,
            positions: legacyData.map(p => ({
                symbol: p.symbol,
                quantity: p.qty,
                avgPrice: p.avgPrice
            }))
        });
    } catch (e) {
        console.error('[AXIOM] Failed to fetch portfolio:', e);
    }
  },

  // ---- Watchlist --------------------------------------------------- //
  watchlist: [],
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

  // ---- Portfolio metrics ------------------------------------------- //
  portfolioMetrics: {
    drawdown:          null,
    max_drawdown:      null,
    beta:              null,
    sharpe:            null,
    total_value:       null,
    cost_basis:        null,
    unrealised_pnl_pct:null,
    lastFetched:       null,
    loading:           false,
    error:             null,
  },

  fetchPortfolioMetrics: async () => {
    const { positions } = get();
    if (positions.length === 0) return;

    set((state) => ({
      portfolioMetrics: { ...state.portfolioMetrics, loading: true, error: null },
    }));

    try {
      const holdings = positions.map((p) => ({
        symbol:   p.symbol,
        quantity: p.quantity,
        avg_cost: p.avgPrice || 0,
      }));
      const metrics = await fetchPortfolioMetrics(holdings);

      set({
        portfolioMetrics: {
          drawdown:          metrics.drawdown,
          max_drawdown:      metrics.max_drawdown,
          beta:              metrics.beta,
          sharpe:            metrics.sharpe,
          total_value:       metrics.total_value,
          cost_basis:        metrics.cost_basis,
          unrealised_pnl_pct:metrics.unrealised_pnl_pct,
          loading:           false,
          error:             null,
          lastFetched:       Date.now(),
        },
      });
    } catch (err) {
      set((state) => ({
        portfolioMetrics: { ...state.portfolioMetrics, loading: false, error: err.message },
      }));
    }
  },

  getPortfolioMetrics: () => {
    const { portfolioMetrics, positions } = get();
    return {
      drawdown:    portfolioMetrics.drawdown   ?? 0,
      beta:        portfolioMetrics.beta        ?? 1.0,
      sharpe:      portfolioMetrics.sharpe      ?? 0,
      totalValue:  portfolioMetrics.total_value  ?? 0,
      costBasis:   portfolioMetrics.cost_basis   ?? 0,
      pnlPct:      portfolioMetrics.unrealised_pnl_pct ?? 0,
      loading:     portfolioMetrics.loading,
      error:       portfolioMetrics.error,
      // ---- Legacy Aliases ---- //
      currentValue: portfolioMetrics.total_value ?? 0,
      totalCost:    portfolioMetrics.cost_basis ?? 0,
      totalPl:      (portfolioMetrics.total_value ?? 0) - (portfolioMetrics.cost_basis ?? 0),
      totalPlPct:   portfolioMetrics.unrealised_pnl_pct ?? 0,
      dayPl:        0, 
      count:        positions.length,
    };
  },

  // ---- WebSocket Connectivity -------------------------------------- //
  connect: async (forceRefresh = false) => {
    if (!forceRefresh && (get().isLive || get()._connected)) return;
    set({ _connected: true });

    // Pre-seed and fetch initial data
    get().fetchWatchlist();
    get().fetchPortfolio();

    // Connect to live WebSocket hub
    wsClient.connect();

    wsClient.on('connection_change', ({ status }) => {
        set({ isLive: status === 'CONNECTED' });
    });

    wsClient.on('SNAPSHOT', (payload) => {
        set({
            vessels: payload.vessels || [],
            aircraft: payload.aircraft || []
        });
    });

    wsClient.on('EQUITY', (payload) => {
        set((state) => ({
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
        }));
    });
  },

  // ---- Helpers ----------------------------------------------------- //
  activeChart: null,
  setActiveChart: (ticker) => set({ activeChart: ticker }),
  analysisCache: {},

  fetchAnalysis: async (ticker) => {
    const { analysisCache } = get();
    const key = ticker.toUpperCase();
    if (analysisCache[key]) return analysisCache[key];

    const response = await fetch(`${API_BASE}/api/v1/ai/analyze/${key}`);
    const data = await response.json();
    set((s) => ({ analysisCache: { ...s.analysisCache, [key]: data } }));
    return data;
  },
}));

export default useTerminalStore;
