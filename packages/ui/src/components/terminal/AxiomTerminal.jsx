import React, { useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import Header from './Header';
import MainChart from './MainChart';
import AiAnalystPanel from './AiAnalystPanel';
import TradingTerminal from '../dashboard/TradingTerminal';
import useTerminalStore from '../../store/useTerminalStore';

/**
 * AxiomTerminal: The primary orchestration component for the terminal view.
 * Built with glassmorphism aesthetics and resizable layout panels.
 */
const AxiomTerminal = () => {
    const activeSymbol = useTerminalStore(state => state.activeSymbol);
    const activeMode = useTerminalStore(state => state.activeMode);
    const [showAiPanel, setShowAiPanel] = useState(true);

    return (
        <div className="flex flex-col h-screen w-screen bg-[#000000] text-[#E8E8E0] font-mono overflow-hidden">
            {/* ─── Header ───────────────────────────────────────────────────────────── */}
            <Header onCommandPalette={() => console.log('Command Palette Triggered')} />

            {/* ─── Main Content Area ────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 relative">
                <Group direction="horizontal">
                    
                    {/* ─── Left Sidebar: Trading & Control ───────────────────────────── */}
                    <Panel defaultSize={20} minSize={15} className="bg-[#0D0D0D] border-r border-[#1A1A1A]">
                        <div className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar">
                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em]">Execution Terminal</span>
                                <div className="w-2 h-2 rounded-full bg-[#FF6600] shadow-[0_0_8px_#FF6600]" />
                            </div>
                            
                            <TradingTerminal 
                                symbol={activeSymbol || 'AAPL'} 
                                currentPrice={150.00} // Placeholder, will sync with store
                                onTradeSuccess={() => console.log('Trade Executed Successfully')}
                            />

                            <div className="mt-8">
                                <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em] mb-4 block">System Metrics</span>
                                <div className="space-y-3">
                                    <MetricItem label="Latency" value="1.2ms" color="#00FF41" />
                                    <MetricItem label="Engine" value="Vector v4.2" color="#00CCFF" />
                                    <MetricItem label="Status" value="Optimized" color="#FF6600" />
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Separator className="w-[1px] bg-[#1A1A1A] hover:bg-[#FF6600] transition-colors duration-200" />

                    {/* ─── Center Body: Main Chart & Visualization ───────────────────── */}
                    <Panel defaultSize={55} minSize={30}>
                        <div className="h-full flex flex-col bg-[#050505]">
                            <MainChart />
                        </div>
                    </Panel>

                    <Separator className="w-[1px] bg-[#1A1A1A] hover:bg-[#FF6600] transition-colors duration-200" />

                    {/* ─── Right Sidebar: AI Analyst & Signal Feed ──────────────────── */}
                    {showAiPanel && (
                        <Panel defaultSize={25} minSize={20} className="bg-[#0D0D0D] border-l border-[#1A1A1A]">
                            <AiAnalystPanel />
                        </Panel>
                    )}

                </Group>
            </div>

            {/* ─── Footer / Status Bar ──────────────────────────────────────────────── */}
            <div className="h-6 flex items-center justify-between px-4 bg-[#0D0D0D] border-t border-[#1A1A1A] text-[9px] font-black text-[#555] uppercase tracking-[0.2em] flex-shrink-0 select-none">
                <div className="flex items-center gap-6">
                    <div className="flex gap-2 items-center">
                        <span className="text-[#333]">MODE:</span>
                        <span className="text-[#666]">{activeMode}</span>
                    </div>
                    <div className="w-[1px] h-3 bg-[#1A1A1A]" />
                    <div className="flex gap-2 items-center">
                        <span className="text-[#333]">NODE:</span>
                        <span className="text-[#666]">AXIOM-PRIMARY-1</span>
                    </div>
                </div>
                
                <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] shadow-[0_0_8px_#00FF41]" />
                        <span className="text-[#00FF41]">SYSTEM NOMINAL</span>
                    </div>
                    <div className="w-[1px] h-3 bg-[#1A1A1A]" />
                    <span className="text-[#222]">© 2026 AXM-TECH-CORP</span>
                </div>
            </div>
        </div>
    );
};

const MetricItem = ({ label, value, color }) => (
    <div className="flex justify-between items-center text-[11px]">
        <span className="text-[#666]">{label}</span>
        <span style={{ color }}>{value}</span>
    </div>
);

export default AxiomTerminal;
