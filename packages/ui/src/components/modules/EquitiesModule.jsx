import React from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import Watchlist from '../terminal/Watchlist';
import MainChart from '../terminal/MainChart';
import OrderFlow from '../terminal/OrderFlow';
import IntelligenceTabs from '../terminal/IntelligenceTabs';
import GlobalIntelFeed from '../terminal/GlobalIntelFeed';
import PortfolioRisk from '../terminal/PortfolioRisk';

const EquitiesModule = () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
        <PanelGroup direction="horizontal" resizeTargetMinimumSize={5}>
            <Panel defaultSize={20} minSize={15}>
                <PanelGroup direction="vertical">
                    <Panel defaultSize={55}>
                        <Watchlist />
                    </Panel>
                    <PanelResizeHandle style={{ height: '1px', background: '#1A1A1A', cursor: 'row-resize' }} />
                    <Panel defaultSize={45}>
                        <PortfolioRisk />
                    </Panel>
                </PanelGroup>
            </Panel>

            <PanelResizeHandle style={{ width: 1, minWidth: 1, flexShrink: 0, background: '#1A1A1A', cursor: 'col-resize' }} />

            <Panel defaultSize={55} minSize={30}>
                <PanelGroup direction="horizontal" style={{ display: 'flex', flexDirection: 'row', height: '100%', minHeight: 0 }} resizeTargetMinimumSize={5}>
                    <Panel defaultSize={75} minSize={50} style={{ minWidth: 0 }}>
                        <MainChart />
                    </Panel>
                    <PanelResizeHandle style={{ width: 1, minWidth: 1, flexShrink: 0, background: '#1A1A1A', cursor: 'col-resize' }} />
                    <Panel defaultSize={25} minSize={18} style={{ minWidth: 0 }}>
                        <IntelligenceTabs />
                    </Panel>
                </PanelGroup>
            </Panel>

            <PanelResizeHandle style={{ width: 1, minWidth: 1, flexShrink: 0, background: '#1A1A1A', cursor: 'col-resize' }} />

            <Panel defaultSize={25} minSize={18}>
                <PanelGroup direction="vertical">
                    <Panel defaultSize={55}>
                        <OrderFlow />
                    </Panel>
                    <PanelResizeHandle style={{ height: '1px', background: '#1A1A1A', cursor: 'row-resize' }} />
                    <Panel defaultSize={45}>
                        <GlobalIntelFeed />
                    </Panel>
                </PanelGroup>
            </Panel>
        </PanelGroup>
    </div>
);

export default EquitiesModule;
