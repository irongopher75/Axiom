import axios from 'axios';
import { config } from '../config/api';

export const API_URL = config.apiBase;

const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Ensure baseURL is always current with config (handles late injection from Electron)
api.interceptors.request.use(
    (axiosConfig) => {
        axiosConfig.baseURL = config.apiBase;
        
        const token = localStorage.getItem('token');
        if (token) {
            axiosConfig.headers['Authorization'] = `Bearer ${token}`;
        }
        return axiosConfig;
    },
    (error) => Promise.reject(error)
);

export const getWsUrl = (clientId) => {
    const token = localStorage.getItem('token');
    const tokenQuery = token ? `?token=${token}` : '';
    
    // config.wsBase is a dynamic getter
    const wsBase = config.wsBase.endsWith('/') ? config.wsBase.slice(0, -1) : config.wsBase;
    return `${wsBase}/api/v1/ws/terminal/${clientId}${tokenQuery}`;
};

// Interceptor to handle 401/403 (Unauthorized/Forbidden)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const isAuthPage = window.location.pathname === '/' || window.location.pathname === '/login';
            if (!isAuthPage) {
                localStorage.removeItem('token');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const response = await api.post('/api/v1/users/token', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
};

export const register = async (email, password) => {
    return await api.post('/api/v1/users/register', { email, password });
};

export const getMe = async () => {
    return await api.get('/api/v1/users/me');
};

export const getQuoteHistory = async (symbol, interval = '5m', period = '1d') => {
    return await api.get(`/api/v1/quotes/history/${symbol}`, {
        params: { interval, period }
    });
};

export const getPrediction = async (symbol, interval = '1h', period = '1mo') => {
    return await api.get(`/api/v1/predict/${symbol}`, {
        params: { interval, period }
    });
}

export const getMyHistory = async () => {
    return await api.get('/api/v1/predict/history/me');
}

export const getSymbols = async (exchange) => {
    return await api.get(`/api/v1/predict/symbols/${exchange}`);
}

// --- Backtesting API ---
export const runBacktest = async (symbol, period = '1y', interval = '1d', initial_capital = 100000) => {
    return await api.post('/api/v1/backtest/run', null, {
        params: { symbol, period, interval, initial_capital }
    });
}

export const getBacktestHistory = async () => {
    return await api.get('/api/v1/backtest/history');
}

export const getBacktestResult = async (runId) => {
    return await api.get(`/api/v1/backtest/${runId}`);
}

export const getPendingUsers = async () => {
    return await api.get('/api/v1/admin/pending-users');
}

export const approveUser = async (user_id) => {
    return await api.post(`/api/v1/admin/approve/${user_id}`);
}

export const getActiveTrades = async () => {
    return await api.get('/api/v1/trades/active');
}

export const getTradeHistory = async () => {
    return await api.get('/api/v1/trades/history');
}

export const getPerformance = async () => {
    return await api.get('/api/v1/trades/performance');
}

export const executeManualTrade = async (symbol, side, quantity, price) => {
    return await api.post('/api/v1/trades/execute', { symbol, side, quantity, price });
}

export const closeTrade = async (tradeId) => {
    return await api.post(`/api/v1/trades/close/${tradeId}`);
}

export const getSystemConfig = async () => {
    return await api.get('/api/v1/trades/config');
}

export const getMacroYields = async () => {
    return await api.get('/api/v1/quotes/macro/yields');
}

export const getMacroFx = async () => {
    return await api.get('/api/v1/quotes/macro/fx');
}

export default api;
