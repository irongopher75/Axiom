import { getWsUrl } from './index';
import { getSessionToken } from './index';

/**
 * AxiomWSClient — Standalone event-driven WebSocket hub.
 * Logic-agnostic: handles reconnection and routing, but doesn't manage state.
 */
class AxiomWSClient {
    constructor() {
        this.ws = null;
        this.handlers = new Map();
        this.batchHandlers = new Map();
        this.messageQueues = new Map();
        this.batchTimers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.clientId = 'CL-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        this.batchConfig = new Map([
            ['EQUITY', { maxItems: 100, waitMs: 50 }],
        ]);
        
        // Use getWsUrl which now respects central config
        this.url = getWsUrl(this.clientId);
        
        this.pingInterval = null;
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
            }
        }, 30000); // 30s heartbeat
    }

    stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    clearBatchState() {
        this.batchTimers.forEach((timer) => clearTimeout(timer));
        this.batchTimers.clear();
        this.messageQueues.clear();
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        // Re-resolve URL at connect time to pick up injected config
        this.url = getWsUrl(this.clientId);
        const token = getSessionToken();
        if (!token) {
            this.emit('connection_change', { status: 'AUTH_REQUIRED' });
            return;
        }
        
        console.log(`[AXIOM-WS] Connecting to terminal...`);
        this.ws = new WebSocket(this.url, ['axiom-v1', `bearer.${token}`]);

        this.ws.onopen = () => {
            console.log('[AXIOM-WS] Connection established.');
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.emit('connection_change', { status: 'CONNECTED' });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const { type } = data;
                const payload = data.payload || data;
                const batchConfig = this.batchConfig.get(type);

                if (batchConfig) {
                    this.enqueueBatch(type, payload, batchConfig);
                } else if (this.handlers.has(type)) {
                    this.handlers.get(type).forEach(handler => handler(payload));
                }
            } catch (err) {
                console.error('[AXIOM-WS] Failed to parse message:', err);
            }
        };

        this.ws.onclose = () => {
            this.stopHeartbeat();
            this.clearBatchState();
            this.emit('connection_change', { status: 'DISCONNECTED' });
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                console.warn(`[AXIOM-WS] Disconnected. Reconnecting in ${delay}ms...`);
                setTimeout(() => this.connect(), delay);
            }
        };

        this.ws.onerror = (err) => {
            console.error('[AXIOM-WS] WebSocket error:', err);
        };
    }

    /**
     * Subscribe to a specific message type.
     * Multiple handlers can subscribe to the same type.
     */
    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        return () => this.off(type, handler);
    }

    onBatch(type, handler) {
        if (!this.batchHandlers.has(type)) {
            this.batchHandlers.set(type, new Set());
        }
        this.batchHandlers.get(type).add(handler);
        return () => this.offBatch(type, handler);
    }

    /**
     * Unsubscribe from a specific message type.
     */
    off(type, handler) {
        if (this.handlers.has(type)) {
            this.handlers.get(type).delete(handler);
        }
    }

    offBatch(type, handler) {
        if (this.batchHandlers.has(type)) {
            this.batchHandlers.get(type).delete(handler);
        }
    }

    emit(type, payload) {
        if (this.handlers.has(type)) {
            this.handlers.get(type).forEach(handler => handler(payload));
        }
    }

    enqueueBatch(type, payload, config) {
        const queue = this.messageQueues.get(type) || [];
        queue.push(payload);
        this.messageQueues.set(type, queue);

        if (queue.length >= config.maxItems) {
            this.flushBatch(type);
            return;
        }

        if (this.batchTimers.has(type)) return;
        const timer = setTimeout(() => this.flushBatch(type), config.waitMs);
        this.batchTimers.set(type, timer);
    }

    flushBatch(type) {
        const timer = this.batchTimers.get(type);
        if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(type);
        }

        const queued = this.messageQueues.get(type);
        if (!queued?.length) return;

        this.messageQueues.set(type, []);

        if (this.batchHandlers.has(type)) {
            this.batchHandlers.get(type).forEach(handler => handler(queued));
            return;
        }

        queued.forEach(item => this.emit(type, item));
    }

    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('[AXIOM-WS] Cannot send: socket not open.');
        }
    }
}

// Singleton instance
const wsClient = new AxiomWSClient();
export default wsClient;
