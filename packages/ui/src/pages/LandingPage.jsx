import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Play, Activity } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const particleCount = 20;
    const particles = Array.from({ length: particleCount });

    return (
        <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden selection:bg-blue-500/30 font-sans">
            {/* Header / Nav */}
            <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${scrolled ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
                <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white group cursor-pointer" onClick={() => navigate('/')}>
                            TradeX<span className="text-blue-500">.AI</span>
                        </h1>
                    </div>

                    <div className="hidden md:flex items-center gap-10">
                        {['Features', 'Social Proof', 'Pricing', 'Technology'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate('/auth')}
                        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all active:scale-95"
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative h-screen flex flex-col items-center justify-center pt-20 px-8">
                <div className="hero-particles">
                    {particles.map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-blue-500/20 rounded-full blur-[1px] animate-particle"
                            style={{
                                width: Math.random() * 3 + 1 + 'px',
                                height: Math.random() * 3 + 1 + 'px',
                                top: Math.random() * 100 + '%',
                                animationDuration: Math.random() * 20 + 10 + 's',
                                animationDelay: Math.random() * 10 + 's'
                            }}
                        />
                    ))}
                </div>
                <div className="hero-glow" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none" />

                <div className="relative z-10 text-center max-w-5xl mx-auto">
                    <motion.h1
                        className="text-5xl md:text-8xl font-bold tracking-tight mb-8"
                    >
                        Algorithmic Precision <br />
                        <span className="text-gradient-primary">Meets Human Strategy</span>
                    </motion.h1>

                    <motion.p
                        className="text-lg md:text-2xl text-gray-400 font-normal max-w-3xl mx-auto mb-12 leading-relaxed"
                    >
                        Deploy institutional-grade trading algorithms powered by <br className="hidden md:block" />
                        real-time ML inference and quantum-optimized execution.
                    </motion.p>

                    <motion.div
                        className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                        <button
                            onClick={() => navigate('/auth')}
                            className="group relative h-14 px-10 rounded-2xl bg-gradient-to-r from-blue-600/60 to-purple-600/40 backdrop-blur-md border border-white/10 text-lg font-bold transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            Start Trading Free
                        </button>

                        <button className="h-14 px-10 rounded-2xl border border-white/20 hover:border-white/40 text-lg font-semibold transition-all flex items-center gap-3 active:scale-95">
                            <Play className="w-5 h-5 fill-white" />
                            Watch Demo
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 1.2 }}
                        className="mt-32 inline-flex flex-col items-center"
                    >
                        <div className="glass-card px-8 py-5 rounded-[2rem] flex flex-col items-center gap-2 relative group overflow-hidden border-white/10">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                <span className="text-[12px] font-mono font-bold tracking-widest text-gray-400 uppercase">Live Performance</span>
                            </div>
                            <div className="text-4xl font-mono font-bold text-gradient-primary">
                                +24.8% <span className="text-xl">YTD</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-12 flex flex-col items-center gap-4 text-gray-500"
                >
                    <div className="w-6 h-10 rounded-full border-2 border-white/10 relative">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-2 bg-blue-500 rounded-full scroll-indicator-dot" />
                    </div>
                </motion.div>
            </section>

            {/* SOCIAL PROOF SECTION */}
            <section id="social-proof" className="relative py-32 bg-gray-950/50">
                <div className="max-w-7xl mx-auto px-8 text-center">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold mb-20 tracking-tight"
                    >
                        Trusted by Ambitious Traders Worldwide
                    </motion.h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-32">
                        {[
                            { label: 'Capital Deployed', value: '₹12.5Cr', color: 'blue' },
                            { label: 'Active Traders', value: '847', color: 'purple' },
                            { label: 'Average Win Rate', value: '68%', color: 'green' },
                            { label: 'System Uptime', value: '99.9%', color: 'blue' }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-4xl md:text-6xl font-mono font-bold mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                    {stat.value}
                                </div>
                                <div className="text-gray-500 font-medium tracking-wide uppercase text-[10px] md:text-sm">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="flex overflow-hidden relative group">
                        <motion.div
                            animate={{ x: [0, -1000] }}
                            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                            className="flex gap-8 whitespace-nowrap"
                        >
                            {[1, 2, 3, 1, 2, 3].map((_, i) => (
                                <div key={i} className="glass-card w-[340px] p-8 rounded-2xl flex flex-col items-start gap-4 text-left whitespace-normal shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/5">
                                            <Activity className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">Rohan S.</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-black">Retail Trader</div>
                                        </div>
                                    </div>
                                    <div className="flex text-yellow-500 text-xs">★★★★★</div>
                                    <p className="text-gray-400 text-sm leading-relaxed italic">
                                        "The sub-200ms signal latency is a game-changer for my intraday positions. TradeX has completely transformed how I approach the NIFTY 50."
                                    </p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FEATURES SHOWCASE */}
            <section id="features" className="py-32 px-8">
                <div className="max-w-7xl mx-auto space-y-48">
                    {/* Feature 1: Signals */}
                    <div className="flex flex-col md:flex-row items-center gap-20">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1 relative"
                        >
                            <div className="glass-panel p-8 rounded-3xl border-white/10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                                <div className="flex flex-col gap-6">
                                    {[
                                        { symbol: 'RELIANCE', type: 'BUY', conf: '85%' },
                                        { symbol: 'INFY', type: 'SELL', conf: '72%' }
                                    ].map((sig, i) => (
                                        <div key={i} className="glass-card p-4 rounded-xl flex items-center justify-between border-white/5">
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-bold mb-1 tracking-widest">SIGNAL</div>
                                                <div className="text-lg font-bold">{sig.symbol}</div>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-lg text-sm font-black ${sig.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {sig.type}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500 font-bold mb-1">CONFIDENCE</div>
                                                <div className="font-mono text-blue-400">{sig.conf}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1"
                        >
                            <h3 className="text-4xl font-bold mb-6 tracking-tight">Lightning-Fast Signal Detection</h3>
                            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                                Our multi-timeframe consensus engine analyzes MACD, RSI, and Price Action volume profiles in real-time, delivering sub-200ms latency execution signals.
                            </p>
                            <ul className="space-y-4">
                                {['12 concurrent strategies', '1-minute to 1-week timeframes', '99.2% uptime SLA'].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-gray-300 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* Feature 2: Analytics */}
                    <div className="flex flex-col md:flex-row-reverse items-center gap-20">
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1"
                        >
                            <div className="glass-panel p-10 rounded-3xl border-white/10 shadow-2xl">
                                <Activity className="w-12 h-12 text-blue-500 mb-6" />
                                <div className="space-y-6">
                                    <div className="h-2 w-3/4 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-indigo-500" />
                                    </div>
                                    <div className="h-2 w-1/2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-indigo-500" />
                                    </div>
                                    <div className="flex justify-between font-mono text-xs text-blue-400 pt-6 border-t border-white/5">
                                        <span>SHARPE: 1.87</span>
                                        <span>DRAWDOWN: 6.2%</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1"
                        >
                            <h3 className="text-4xl font-bold mb-6 tracking-tight">Institutional Performance Metrics</h3>
                            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                                Quantify your edge with institutional risk metrics. From Monte Carlo simulations to Sharpe ratio attribution, track every detail of your strategy performance.
                            </p>
                            <ul className="space-y-4">
                                {['Daily P&L tracking', 'Strategy attribution', 'Tax loss harvesting'].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-gray-300 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* Feature 3: Backtesting */}
                    <div className="flex flex-col md:flex-row items-center gap-20">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1 relative"
                        >
                            <div className="glass-panel p-8 rounded-3xl border-white/10 shadow-2xl">
                                <Activity className="w-12 h-12 text-purple-500 mb-6" />
                                <div className="p-6 bg-gray-950/50 rounded-2xl border border-white/5 font-mono text-xs space-y-2">
                                    <div className="text-gray-500">// Run Backtest: Mean Reversion</div>
                                    <div className="text-green-400">SUCCESS: 478 trades</div>
                                    <div className="text-purple-400">PROFIT: +42.5%</div>
                                    <div className="text-blue-400">WIN RATE: 68%</div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1"
                        >
                            <h3 className="text-4xl font-bold mb-6 tracking-tight">Validate Before You Deploy</h3>
                            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                                Our backtesting engine simulates 5 years of historical data with realistic slippage and commission models, ensuring your edge is statistically sound.
                            </p>
                            <ul className="space-y-4">
                                {['5 years of historical data', 'Realistic fill simulation', 'Parameter optimization'].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-gray-300 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* PRICING SECTION */}
            <section id="pricing" className="py-32 bg-gray-950/80">
                <div className="max-w-7xl mx-auto px-8 text-center uppercase tracking-widest text-xs font-bold text-gray-500 mb-20">Transparent Value</div>
                <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Starter */}
                    <div className="glass-card p-10 rounded-3xl border-white/5 flex flex-col items-center">
                        <h3 className="text-2xl font-bold mb-4">Starter</h3>
                        <div className="text-5xl font-mono font-bold mb-8">₹0<span className="text-lg text-gray-500">/mo</span></div>
                        <ul className="space-y-4 text-gray-400 mb-10 text-sm">
                            <li>• Paper trading only</li>
                            <li>• 3 basic strategies</li>
                            <li>• Daily signals</li>
                            <li className="opacity-30">• Live broker execution</li>
                            <li className="opacity-30">• Priority support</li>
                        </ul>
                        <button onClick={() => navigate('/auth')} className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-bold">Get Started</button>
                    </div>

                    {/* Pro */}
                    <div className="glass-card p-12 rounded-[2.5rem] border-blue-500/30 ring-2 ring-blue-500/20 relative scale-105 shadow-[0_0_50px_rgba(59,130,246,0.2)] bg-blue-500/5">
                        <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">MOST POPULAR</div>
                        <h3 className="text-2xl font-bold mb-4 text-blue-400">Professional</h3>
                        <div className="text-5xl font-mono font-bold mb-8">₹2,999<span className="text-lg text-gray-500">/mo</span></div>
                        <ul className="space-y-4 text-gray-300 mb-10 text-sm">
                            <li>✓ Live broker execution</li>
                            <li>✓ Unlimited strategies</li>
                            <li>✓ Real-time execution</li>
                            <li>✓ Sub-200ms alerts</li>
                            <li>✓ Priority Discord support</li>
                        </ul>
                        <button onClick={() => navigate('/auth')} className="w-full py-5 rounded-[1.2rem] bg-blue-600 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-500/40">Start Free Trial</button>
                    </div>

                    {/* Enterprise */}
                    <div className="glass-card p-10 rounded-3xl border-purple-500/20 flex flex-col items-center">
                        <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
                        <div className="text-5xl font-mono font-bold mb-8 text-purple-400">Custom</div>
                        <ul className="space-y-4 text-gray-400 mb-10 text-sm">
                            <li>• Dedicated infrastructure</li>
                            <li>• White-label dashboard</li>
                            <li>• Full API access</li>
                            <li>• Custom strategy build</li>
                            <li>• 24/7 dedicated RM</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 transition-all font-bold">Contact Sales</button>
                    </div>
                </div>
            </section>

            {/* TECH STACK */}
            <section id="technology" className="py-40 bg-gray-950">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Institutional Technology</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">Built on the same architecture used by global quant funds for reliability and speed.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: 'FastAPI', desc: 'Async Core' },
                            { name: 'React 18', desc: 'Modern UI' },
                            { name: 'Redis', desc: 'Live Cache' },
                            { name: 'TensorFlow', desc: 'ML Inference' },
                            { name: 'MongoDB', desc: 'NoSQL' },
                            { name: 'WebSocket', desc: 'Live Stream' },
                            { name: 'Stripe', desc: 'Payments' },
                            { name: 'AWS', desc: 'Cloud Host' }
                        ].map((tech, i) => (
                            <div key={i} className="glass-card p-8 rounded-2xl border-white/5 text-center group transition-all hover:-translate-y-2">
                                <div className="w-12 h-12 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                                    <Activity className="w-5 h-5 text-gray-500 group-hover:text-blue-400" />
                                </div>
                                <div className="font-bold text-white mb-1 text-sm">{tech.name}</div>
                                <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{tech.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-40 px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="glass-panel p-16 md:p-24 rounded-[3.5rem] text-center border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                        <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to Transform Your Trading?</h2>
                        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">Join 847 traders already using TradeX.AI to achieve consistent algorithmic profits.</p>
                        <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto mb-10">
                            <input type="email" placeholder="Enter your email" className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-blue-500 transition-all" />
                            <button onClick={() => navigate('/auth')} className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-500/30">Get Started →</button>
                        </div>
                        <div className="flex flex-wrap justify-center gap-8 text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                            <span>🔒 Bank-Grade Security</span>
                            <span>✓ No Credit Card Required</span>
                            <span>📱 Mobile & Desktop</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-24 border-t border-white/5 bg-gray-950">
                <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
                    <div>
                        <h4 className="font-bold mb-8 text-white uppercase text-xs tracking-widest">Product</h4>
                        <ul className="space-y-4 text-gray-500 text-sm">
                            {['Features', 'Pricing', 'Backtesting', 'API Docs', 'Changelog'].map(l => <li key={l} className="hover:text-white cursor-pointer transition-colors transition-all">{l}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-8 text-white uppercase text-xs tracking-widest">Company</h4>
                        <ul className="space-y-4 text-gray-500 text-sm">
                            {['About Us', 'Careers', 'Blog', 'Press Kit', 'Contact'].map(l => <li key={l} className="hover:text-white cursor-pointer transition-colors transition-all">{l}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-8 text-white uppercase text-xs tracking-widest">Resources</h4>
                        <ul className="space-y-4 text-gray-500 text-sm">
                            {['Documentation', 'Tutorials', 'Webinars', 'Community', 'Status'].map(l => <li key={l} className="hover:text-white cursor-pointer transition-colors transition-all">{l}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-8 text-white uppercase text-xs tracking-widest">Legal</h4>
                        <ul className="space-y-4 text-gray-500 text-sm">
                            {['Terms of Service', 'Privacy Policy', 'Risk Disclosure', 'Cookie Policy'].map(l => <li key={l} className="hover:text-white cursor-pointer transition-colors transition-all">{l}</li>)}
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-8 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">© 2024 TradeX.AI. Institutional-Grade Execution.</div>
                    <div className="flex gap-4">
                        {['twitter', 'linkedin', 'github', 'discord'].map(s => <div key={s} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600/20 transition-all cursor-pointer"><Activity className="w-5 h-5 text-gray-400 hover:text-blue-400" /></div>)}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
