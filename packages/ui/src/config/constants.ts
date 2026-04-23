// packages/ui/src/config/constants.ts
// Centralized configuration constants for AXIOM

export const AXIOM_CONFIG = {
  // Application
  APP_NAME: 'AXIOM',
  VERSION: '1.0.0',

  // Session
  SESSION_TOKEN_KEY: 'axiom_session_token',

  // API Endpoints - Desktop uses local sidecar, web uses remote
  DESKTOP: {
    API_BASE: 'http://localhost:18432',
    WS_BASE: 'ws://localhost:18432',
  },
  WEB: {
    API_BASE: 'http://localhost:8000',
    WS_BASE: 'ws://localhost:8000',
  },

  // External Services
  NEWS_WS_URL: 'wss://news.axiom.app/feed',

  // WebSocket
  WS_HEARTBEAT_INTERVAL_MS: 30000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_BASE_DELAY_MS: 1000,
  WS_BATCH_FLUSH_MS: 50,

  // Trading Defaults
  DEFAULT_INITIAL_CAPITAL: 1000000,
  DEFAULT_SLIPPAGE: 0.0001,
  ALLOWED_EXCHANGES: ['NSE', 'BSE', 'US'],

  // Technical Indicators
  RSI_WINDOW: 14,
  SMA_FAST: 20,
  SMA_MEDIUM: 50,
  SMA_SLOW: 200,
  ATR_WINDOW: 14,

  // Prediction Thresholds
  BULLISH_SCORE_THRESHOLD: 3.0,
  BEARISH_SCORE_THRESHOLD: -3.0,
  MOD_BULLISH_THRESHOLD: 1.0,
  MOD_BEARISH_THRESHOLD: -1.0,

  // UI
  MODES: [
    { key: 'F1', label: 'EQUITIES' },
    { key: 'F2', label: 'FIXED INCOME' },
    { key: 'F3', label: 'FOREX' },
    { key: 'F4', label: 'COMMODITIES' },
    { key: 'F5', label: 'CRYPTO' },
    { key: 'F6', label: 'SATELLITE' },
    { key: 'F7', label: 'FLEET' },
    { key: 'F8', label: 'AVIATION' },
    { key: 'F9', label: 'MACRO' },
  ] as const,
} as const;

export type ModeKey = typeof AXIOM_CONFIG.MODES[number]['label'];
