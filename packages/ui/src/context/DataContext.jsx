import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, getPerformance, getActiveTrades, getTradeHistory, getSystemConfig } from '../api/index';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [activeTrades, setActiveTrades] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [systemConfig, setSystemConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

    // Global active asset state
    const [activeSymbol, setActiveSymbol] = useState('NIFTY');
    const [activeExchange, setActiveExchange] = useState('nse');

    const fetchDataCore = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const [meRes, perfRes, activeRes, histRes, configRes] = await Promise.all([
                getMe(),
                getPerformance(),
                getActiveTrades(),
                getTradeHistory(),
                getSystemConfig()
            ]);

            setUser(meRes.data);
            setPerformance(perfRes.data);
            setActiveTrades(activeRes.data);
            setTradeHistory(histRes.data);
            setSystemConfig(configRes.data);
        } catch (error) {
            console.error("Failed to fetch core data context:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                setIsAuthenticated(false);
            }
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchDataCore();
        // Polling every 30 seconds
        const intervalId = setInterval(fetchDataCore, 30000);
        return () => clearInterval(intervalId);
    }, [fetchDataCore]);

    const refreshData = async () => {
        await fetchDataCore();
    };

    return (
        <DataContext.Provider value={{
            user,
            performance,
            activeTrades,
            tradeHistory,
            systemConfig,
            loading,
            refreshData,
            activeSymbol,
            setActiveSymbol,
            activeExchange,
            setActiveExchange
        }}>
            {children}
        </DataContext.Provider>
    );
};
