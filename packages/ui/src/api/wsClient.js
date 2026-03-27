import { getWsUrl } from './index';

/**
 * AxiomWSClient — Standalone event-driven WebSocket hub.
 * Logic-agnostic: handles reconnection and routing, but doesn't manage state.
 */
class AxiomWSClient {
    constructor() {
        this.ws = null;
        this.handlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.clientId = 'CL-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        
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

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        // Re-resolve URL at connect time to pick up injected config
        this.url = getWsUrl(this.clientId);
        
        console.log(`[AXIOM-WS] Connecting to terminal...`);
        this.ws = new WebSocket(this.url);

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

                if (this.handlers.has(type)) {
                    this.handlers.get(type).forEach(handler => handler(data.payload || data));
                }
            } catch (err) {
                console.error('[AXIOM-WS] Failed to parse message:', err);
            }
        };

        this.ws.onclose = () => {
            this.stopHeartbeat();
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

    /**
     * Unsubscribe from a specific message type.
     */
    off(type, handler) {
        if (this.handlers.has(type)) {
            this.handlers.get(type).delete(handler);
        }
    }

    emit(type, payload) {
        if (this.handlers.has(type)) {
            this.handlers.get(type).forEach(handler => handler(payload));
        }
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
