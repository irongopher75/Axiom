import React, { useState, useRef, useEffect } from 'react';
import useTerminalStore from '../../store/useTerminalStore';
import { config } from '../../config/api';

const AiAnalystPanel = () => {
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const portfolio = useTerminalStore(state => state.portfolio);
    const getPortfolioMetrics = useTerminalStore(state => state.getPortfolioMetrics);
    const equityPrices = useTerminalStore(state => state.equityPrices);

    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'QuantHFT AI Analyst online. I have access to live market data, your portfolio, and macro context. Ask me anything — technical analysis, risk assessment, options strategy, or market commentary.' }
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

    const buildContext = () => {
        // Build market context
        const metrics = getPortfolioMetrics();
        const activePx = equityPrices[activeSymbol];
        
        return {
            active_symbol: {
                ticker: activeSymbol,
                price: activePx?.price || 0,
            },
            portfolio: {
                total_value: metrics.currentValue,
                cash_available: 48200, 
                margin_used_pct: 28,
                unrealized_pnl: metrics.totalPl,
                unrealized_pnl_pct: metrics.totalPlPct,
                daily_pnl: metrics.dayPl,
                positions: portfolio.map(p => {
                    const live = equityPrices[p.symbol];
                    const pnl = live ? (live.price - p.avgPrice) * p.qty : 0;
                    return {
                        sym: p.symbol, side: 'LONG', qty: p.qty, avg_cost: p.avgPrice,
                        curr_price: live?.price, pnl: pnl,
                        pnl_pct: (pnl / (p.avgPrice * p.qty)) * 100
                    };
                }),
                risk_metrics: {
                    portfolio_beta: metrics.beta,
                    sharpe_ratio_ytd: metrics.sharpe,
                    max_drawdown_ytd: metrics.drawdown + "%",
                }
            },
            macro: {
                vix: { price: 15.42 },
                us_10y_yield: 4.21,
                spx: { price: 5234 }
            }
        };
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;
        
        const newMsg = { role: 'user', content: inputValue.trim() };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');
        setIsLoading(true);

        const market_context = buildContext();
        
        try {
            // Use centralized config
            const backendUrl = config.apiBase;
            const response = await fetch(`${backendUrl}/api/v1/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, newMsg], // Must match Anthropic schema
                    market_context: market_context
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // Create a placeholder for assistant msg
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;
                        if (!dataStr) continue;
                        
                        try {
                            const data = JSON.parse(dataStr);
                            
                            if (data.error) {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content += `\n[Error: ${data.error}]`;
                                    return newMsgs;
                                });
                                continue;
                            }

                            if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content += data.delta.text;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // ignore json parse errors for incomplete chunks
                        }
                    }
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `[Connection Error: ${error.message}]` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div style={{ height: '100%', background: '#0D0D0D', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden' }}>
            <div style={{ background: '#0F1215', borderBottom: '1px solid rgba(255,165,0,0.3)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: '11px', color: '#FF9500', letterSpacing: '1px', textTransform: 'uppercase' }}>◆ AI Market Analyst</div>
                    <div style={{ fontSize: '9px', color: '#606058' }}>claude-3-5-sonnet-20241022 · Real-time analysis</div>
                </div>
                <div style={{ fontSize: '9px', color: '#606058', textAlign: 'right' }}>
                    Context-aware · Portfolio data included
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '1px', color: msg.role === 'user' ? '#FF9500' : '#06B6D4' }}>
                            {msg.role === 'user' ? 'YOU>' : 'AI>'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#E8E8E0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '1px', color: '#06B6D4' }}>AI&gt;</div>
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

            <div style={{ display: 'flex', borderTop: '1px solid rgba(255,165,0,0.3)', background: '#0f1215', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', color: '#FF9500', padding: '0 10px', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(255,165,0,0.15)', whiteSpace: 'nowrap' }}>
                    QUERY&gt;
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask the AI analyst..."
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#E8E8E0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', padding: '10px 12px' }}
                    autoComplete="off"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    style={{ padding: '0 14px', background: 'rgba(255,149,0,0.1)', border: 'none', borderLeft: '1px solid rgba(255,165,0,0.15)', color: '#FF9500', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', cursor: isLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.5px', transition: 'all 0.1s' }}
                    onMouseOver={(e) => { if(!isLoading) e.target.style.background = 'rgba(255,149,0,0.2)'; }}
                    onMouseOut={(e) => { if(!isLoading) e.target.style.background = 'rgba(255,149,0,0.1)'; }}
                >
                    SEND ↵
                </button>
            </div>
        </div>
    );
};

export default AiAnalystPanel;
