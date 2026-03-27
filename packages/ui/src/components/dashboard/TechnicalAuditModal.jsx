import { X, Activity, ShieldCheck, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';

const getExchangeInfo = (symbol) => {
    if (symbol?.endsWith('.BO')) return { label: 'BSE', currency: '₹' };
    if (symbol?.endsWith('.T')) return { label: 'TYO', currency: '¥' };
    if (symbol?.endsWith('.L')) return { label: 'LSE', currency: '£' };
    if (!symbol?.includes('.')) return { label: 'US', currency: '$' };
    return { label: 'NSE', currency: '₹' };
};

const TechnicalAuditModal = ({ isOpen, onClose, data, symbol }) => {
    if (!isOpen || !data) return null;

    const MetricRow = ({ label, value, subValue, color = "text-white" }) => (
        <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 group">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
            <div className="text-right">
                <div className={`text-sm font-mono font-bold ${color}`}>{value}</div>
                {subValue && <div className="text-[9px] text-gray-600 font-bold uppercase">{subValue}</div>}
            </div>
        </div>
    );

    const IndicatorCard = ({ title, children, icon: Icon }) => (
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Icon size={16} />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest">{title}</h4>
            </div>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-gray-950 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Visual Accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Activity size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                {symbol} <span className="text-blue-500">Technical Audit</span>
                            </h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[3px]">Institutional Analytics Payload</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Summary Section */}
                        <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Price (LTP)', value: `${getExchangeInfo(symbol).currency}${data.current_price.toLocaleString()}`, color: 'text-white' },
                                { label: 'Inference', value: data.prediction, color: data.prediction === 'BULLISH' ? 'text-green-400' : 'text-red-400' },
                                { label: 'Confidence', value: `${(data.confidence * 100).toFixed(1)}%`, color: 'text-blue-400' },
                                { label: 'Volatility', value: `${data.vol_ratio}%`, color: 'text-gray-400' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className={`text-lg font-mono font-bold ${item.color}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Moving Averages */}
                        <IndicatorCard title="Trend Trajectory" icon={TrendingUp}>
                            <MetricRow label="SMA 20 (FAST)" value={`${getExchangeInfo(symbol).currency}${data.sma_20.toLocaleString()}`} subValue="Short-term Vector" />
                            <MetricRow label="SMA 50 (MED)" value={`${getExchangeInfo(symbol).currency}${data.sma_50.toLocaleString()}`} subValue="Structural Average" />
                            <MetricRow label="SMA 200 (SLOW)" value={`${getExchangeInfo(symbol).currency}${data.sma_200.toLocaleString()}`} subValue="Institutional Anchor" />
                            <div className="mt-4 p-4 rounded-xl bg-blue-500/5 text-blue-400 text-[10px] font-bold flex items-center gap-2">
                                <Target size={12} />
                                {data.current_price > data.sma_50 ? "Trading above 50-day Mean (Bullish Structure)" : "Below 50-day Mean (Bearish Structure)"}
                            </div>
                        </IndicatorCard>

                        {/* Oscillators & Volatility */}
                        <IndicatorCard title="Oscillators & Range" icon={Zap}>
                            <MetricRow
                                label="RSI (14)"
                                value={data.rsi}
                                color={data.rsi > 70 ? "text-red-400" : data.rsi < 30 ? "text-green-400" : "text-white"}
                                subValue={data.rsi > 70 ? "Overbought" : data.rsi < 30 ? "Oversold" : "Neutral Range"}
                            />
                            <MetricRow label="MACD Histogram" value={data.macd} subValue="Momentum Delta" />
                            <MetricRow label="Volume POC" value={`${getExchangeInfo(symbol).currency}${data.poc.toLocaleString()}`} subValue="Point of Control" />
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                    <span>Relative Strength Index</span>
                                    <span>{data.rsi}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${data.rsi > 70 ? 'bg-red-500' : data.rsi < 30 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${data.rsi}%` }}
                                    />
                                </div>
                            </div>
                        </IndicatorCard>

                        {/* Bollinger Bands */}
                        <IndicatorCard title="Volatility Envelopes" icon={ShieldCheck}>
                            <MetricRow label="BB Upper Band" value={`${getExchangeInfo(symbol).currency}${data.bb_upper.toLocaleString()}`} subValue="Resistance Extremum" />
                            <MetricRow label="BB Basis" value={`${getExchangeInfo(symbol).currency}${data.sma_20.toLocaleString()}`} subValue="Mean Reversion Target" />
                            <MetricRow label="BB Lower Band" value={`${getExchangeInfo(symbol).currency}${data.bb_lower.toLocaleString()}`} subValue="Support Extremum" />
                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[10px] italic text-gray-400">
                                    Volatility Bandwidth: {((data.bb_upper - data.bb_lower) / data.sma_20 * 100).toFixed(2)}%
                                </p>
                            </div>
                        </IndicatorCard>

                        {/* HFT Strategy Payload */}
                        <div className="col-span-1 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-3xl p-8 flex flex-col justify-between">
                            <div>
                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6">Execution Strategy</h4>
                                <p className="text-lg font-bold text-white leading-tight mb-4">
                                    {data.strategy}
                                </p>
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest">
                                    <ShieldCheck size={14} />
                                    Risk Params Synchronized
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-between items-center shrink-0">
                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                        Neural Audit v4.1 • {new Date().toLocaleTimeString()}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                    >
                        Close Audit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TechnicalAuditModal;
