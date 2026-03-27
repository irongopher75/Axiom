import React from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import useTerminalStore from '../../store/useTerminalStore';
import Header from './Header';
import Ticker from './Ticker';
import CommandPalette from './CommandPalette';

// F1 - Equities
import EquitiesModule from '../modules/EquitiesModule';
// F6 - Satellite
import SatelliteModule from '../modules/SatelliteModule';
// F7 - Fleet & Commodities
import FleetModule from '../modules/FleetModule';
// F8 - Aviation
import AviationModule from '../modules/AviationModule';
// F9 - Macro
import MacroModule from '../modules/MacroModule';
// F2-F5 stubs
import FixedIncomeModule from '../modules/FixedIncomeModule';
import ForexModule from '../modules/ForexModule';
import CommoditiesModule from '../modules/CommoditiesModule';
import CryptoModule from '../modules/CryptoModule';

const MODULE_MAP = {
    'EQUITIES': EquitiesModule,
    'FIXED INCOME': FixedIncomeModule,
    'FOREX': ForexModule,
    'COMMODITIES': CommoditiesModule,
    'CRYPTO': CryptoModule,
    'SATELLITE': SatelliteModule,
    'FLEET': FleetModule,
    'AVIATION': AviationModule,
    'MACRO': MacroModule,
};

const AxiomTerminal = () => {
    const { activeMode, connect } = useTerminalStore();
    const [cmdOpen, setCmdOpen] = React.useState(false);

    React.useEffect(() => {
        connect();
    }, []);

    React.useEffect(() => {
        const handler = (e) => {
            if (e.key === '/') {
                e.preventDefault();
                setCmdOpen(true);
            }
            if (e.key === 'Escape') setCmdOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const ActiveModule = MODULE_MAP[activeMode] || EquitiesModule;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#000000', color: '#FFFFFF', fontFamily: 'IBM Plex Sans Condensed, sans-serif', overflow: 'hidden' }}>
            <Header onCommandPalette={() => setCmdOpen(true)} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <ActiveModule />
            </div>
            <Ticker />
            {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
        </div>
    );
};

export default AxiomTerminal;
