import React, { useState, useRef, useEffect } from 'react';
import useTerminalStore from '../../store/useTerminalStore';
import { config } from '../../config/api';

const AiAnalystPanel = () => {
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const portfolio = useTerminalStore(state => state.portfolio);
    const getPortfolioMetrics = useTerminalStore(state => state.getPortfolioMetrics);
    const equityPrices = useTerminalStore(state => state.equityPrices);

    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'QUANTITATIVE INSIGHT ENGINE [ONLINE]\n\nI am an independent market analyzer powered by pure mathematical indicators. I have direct access to your live portfolio, risk metrics, and local ML data streams. Mention a ticker (e.g. $AAPL) for a technical breakdown.' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const msgsEndRef = useRef(null);

    const scrollToBottom = () => {
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;
        
        const newMsg = { role: 'user', content: inputValue.trim() };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');
        setIsLoading(true);
        
        try {
            const backendUrl = config.apiBase;
            const response = await fetch(`${backendUrl}/api/v1/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMsg.content })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.reply || 'Analysis complete. No significant signals detected.' 
            }]);

        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `[ENGINE ERROR: ${error.message}]` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden' }}>
            <div style={{ background: '#0F1215', borderBottom: '1px solid rgba(0, 182, 212, 0.3)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: '11px', color: '#06B6D4', letterSpacing: '1px', textTransform: 'uppercase' }}>◆ QUANTITATIVE INSIGHT ENGINE</div>
                    <div style={{ fontSize: '9px', color: '#606058' }}>Independent · Mathematical Analysis · Local Sidecar</div>
                </div>
                <div style={{ fontSize: '9px', color: '#606058', textAlign: 'right' }}>
                    Live telemetry enabled
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '1px', color: msg.role === 'user' ? '#FF9500' : '#06B6D4' }}>
                            {msg.role === 'user' ? 'USER>' : 'ENGINE>'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#E8E8E0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '1px', color: '#06B6D4' }}>ENGINE&gt;</div>
                        <div style={{ fontSize: '11px', color: '#E8E8E0', lineHeight: '1.6' }}>
                            <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', height: '18px' }}>
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#06B6D4', animation: 'ldot 1s infinite' }} />
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#06B6D4', animation: 'ldot 1s infinite 0.2s' }} />
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#06B6D4', animation: 'ldot 1s infinite 0.4s' }} />
                            </span>
                            <style>{`@keyframes ldot { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
                        </div>
                    </div>
                )}
                <div ref={msgsEndRef} />
            </div>

            <div style={{ display: 'flex', borderTop: '1px solid rgba(0, 182, 212, 0.3)', background: '#0f1215', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', color: '#06B6D4', padding: '0 10px', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(0, 182, 212, 0.15)', whiteSpace: 'nowrap' }}>
                    INQUIRY&gt;
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask for ticker analysis (e.g. $AAPL)..."
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#E8E8E0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', padding: '10px 12px' }}
                    autoComplete="off"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    style={{ padding: '0 14px', background: 'rgba(6, 182, 212, 0.1)', border: 'none', borderLeft: '1px solid rgba(0, 182, 212, 0.15)', color: '#06B6D4', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', cursor: isLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.5px', transition: 'all 0.1s' }}
                    onMouseOver={(e) => { if(!isLoading) e.target.style.background = 'rgba(6, 182, 212, 0.2)'; }}
                    onMouseOut={(e) => { if(!isLoading) e.target.style.background = 'rgba(6, 182, 212, 0.1)'; }}
                >
                    RUN ↵
                </button>
            </div>
        </div>
    );
};

export default AiAnalystPanel;
