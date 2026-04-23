import React, { useState, useMemo, useEffect, useRef } from 'react';
import useTerminalStore from '../../store/useTerminalStore';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// AISStream API key
const AISSTREAM_API_KEY = '654b15355acdd8886171bd02b36a88ff4fa82fd3';
const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';

const VESSEL_COLORS = {
    'Tanker':       [255, 102, 0],
    'VLCC':         [255, 102, 0],
    'LNG Carrier':  [0, 204, 255],
    'Container':    [0, 255, 65],
    'Bulk Carrier': [255, 204, 0],
    'Cargo':        [255, 204, 0],
    'Passenger':    [0, 204, 255],
    'Tug':          [200, 200, 200],
    'default':      [136, 136, 136],
};

const CHOKEPOINTS = [
    { name: 'STRAIT OF HORMUZ',    lat: 26.6, lon: 56.4,  commodity: 'WTI/BRENT' },
    { name: 'SUEZ CANAL',          lat: 30.5, lon: 32.3,  commodity: 'CRUDE/GAS' },
    { name: 'STRAIT OF MALACCA',   lat: 1.5,  lon: 103.9, commodity: 'LNG/CRUDE' },
    { name: 'DANISH STRAITS',      lat: 55.3, lon: 12.6,  commodity: 'NAT GAS' },
];

const INITIAL_VIEW_STATE = { longitude: 40, latitude: 15, zoom: 2, pitch: 0, bearing: 0 };

function getVesselColor(typeCode) {
    if (typeCode >= 80 && typeCode <= 89) return VESSEL_COLORS['Tanker'];
    if (typeCode >= 70 && typeCode <= 79) return VESSEL_COLORS['Cargo'];
    if (typeCode >= 60 && typeCode <= 69) return VESSEL_COLORS['Passenger'];
    if (typeCode >= 30 && typeCode <= 32) return VESSEL_COLORS['Tug'];
    return VESSEL_COLORS['default'];
}

const SatelliteModule = () => {
    const [vessels, setVessels] = useState(new Map());
    const setGlobalVessels = useTerminalStore(s => s.setVessels);
    const [selected, setSelected] = useState(null);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [wsStatus, setWsStatus] = useState('CONNECTING');
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    // AISStream WebSocket connection
    useEffect(() => {
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;
            setWsStatus('CONNECTING');
            const ws = new WebSocket(AISSTREAM_WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                if (cancelled) { ws.close(); return; }
                setWsStatus('CONNECTED');
                ws.send(JSON.stringify({
                    APIKey: AISSTREAM_API_KEY,
                    BoundingBoxes: [[[-90, -180], [90, 180]]], // global
                    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
                }));
            };

            ws.onmessage = (ev) => {
                if (cancelled) return;
                try {
                    const msg = JSON.parse(ev.data);
                    const mmsi = msg.MetaData?.MMSI;
                    if (!mmsi) return;

                    setVessels(prev => {
                        const next = new Map(prev);
                        const existing = next.get(mmsi) || {};
                        if (msg.MessageType === 'PositionReport') {
                            const pos = msg.Message?.PositionReport;
                            next.set(mmsi, {
                                ...existing,
                                mmsi,
                                lat: pos?.Latitude,
                                lon: pos?.Longitude,
                                speed: pos?.SpeedOverGround?.toFixed(1),
                                heading: pos?.TrueHeading,
                                name: msg.MetaData?.ShipName?.trim() || `MMSI-${mmsi}`,
                                color: getVesselColor(existing.typeCode || 0),
                            });
                        } else if (msg.MessageType === 'ShipStaticData') {
                            const sd = msg.Message?.ShipStaticData;
                            next.set(mmsi, {
                                ...existing,
                                mmsi,
                                name: sd?.ShipName?.trim() || existing.name || `MMSI-${mmsi}`,
                                destination: sd?.Destination?.trim(),
                                typeCode: sd?.Type,
                                color: getVesselColor(sd?.Type || 0),
                            });
                        }
                        return next;
                    });
                } catch (_) {}
            };

            ws.onerror = () => setWsStatus('ERROR');

            ws.onclose = () => {
                if (cancelled) return;
                setWsStatus('RECONNECTING');
                reconnectTimer.current = setTimeout(connect, 5000);
            };
        };

        connect();

        return () => {
            cancelled = true;
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, []);
    
    // Sync to global store every 1s
    useEffect(() => {
        const id = setInterval(() => {
            if (vessels.size > 0) {
                setGlobalVessels(Array.from(vessels.values()));
            }
        }, 1000);
        return () => clearInterval(id);
    }, [vessels, setGlobalVessels]);

    const activeVessels = useMemo(() =>
        Array.from(vessels.values()).filter(v => v.lat && v.lon),
        [vessels]
    );

    const sidebarVessels = useMemo(() => activeVessels.slice(0, 60), [activeVessels]);

    const layers = [
        new ScatterplotLayer({
            id: 'vessel-layer',
            data: activeVessels,
            getPosition: d => [d.lon, d.lat],
            getFillColor: d => d.color || VESSEL_COLORS.default,
            getRadius: d => (selected?.mmsi === d.mmsi ? 50000 : 18000),
            pickable: true,
            onClick: ({ object }) => setSelected(object),
            parameters: { depthTest: true },
            updateTriggers: { getRadius: [selected?.mmsi], getFillColor: [selected?.mmsi] },
        }),
        new ScatterplotLayer({
            id: 'chokepoint-layer',
            data: CHOKEPOINTS,
            getPosition: d => [d.lon, d.lat],
            getFillColor: [255, 204, 0, 40],
            getLineColor: [255, 204, 0, 200],
            stroked: true,
            lineWidthMinPixels: 1,
            getRadius: 150000,
            pickable: true,
            parameters: { depthTest: true },
        }),
    ];

    const STATUS_COLORS = { CONNECTED: '#00FF41', CONNECTING: '#FF9500', RECONNECTING: '#FF9500', ERROR: '#FF2244' };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
            {/* Status bar */}
            <div style={{ padding: '5px 12px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', display: 'flex', gap: '24px', fontSize: '11px', fontFamily: 'IBM Plex Mono', flexShrink: 0, zIndex: 10 }}>
                <span style={{ color: '#888' }}>
                    AIS VESSELS <span style={{ color: '#00FF41' }}>{activeVessels.length} TRACKED</span>
                </span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: '#888' }}>
                    STREAM: <span style={{ color: STATUS_COLORS[wsStatus] ?? '#888' }}>{wsStatus}</span>
                </span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: '#888' }}>SOURCE: <span style={{ color: '#00CCFF' }}>AISSTREAM.IO</span></span>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* Map */}
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <DeckGL
                        viewState={viewState}
                        onViewStateChange={e => setViewState(e.viewState)}
                        controller={true}
                        layers={layers}
                        useDevicePixels={false}
                        getTooltip={({ object }) => object && (
                            object.mmsi
                                ? `${object.name ?? 'Unknown'}\nMMSI: ${object.mmsi}\nSpeed: ${object.speed ?? '--'} kts`
                                : `CHOKEPOINT: ${object.name}\n${object.commodity}`
                        )}
                        style={{ background: '#000' }}
                    >
                        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" reuseMaps />
                    </DeckGL>

                    {selected?.mmsi && (
                        <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(13,13,13,0.95)', border: '1px solid #FF6600', padding: 12, minWidth: 220, zIndex: 5, fontFamily: 'IBM Plex Mono', pointerEvents: 'none' }}>
                            <div style={{ color: '#FF6600', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>{selected.name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
                                <div style={{ color: '#444' }}>MMSI</div><div style={{ color: '#FFF' }}>{selected.mmsi}</div>
                                <div style={{ color: '#444' }}>SPEED</div><div style={{ color: '#FFF' }}>{selected.speed ?? '--'} KTS</div>
                                {selected.destination && <>
                                    <div style={{ color: '#444' }}>DEST</div><div style={{ color: '#FFF' }}>{selected.destination}</div>
                                </>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div style={{ width: 280, background: '#0D0D0D', borderLeft: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, zIndex: 10 }}>
                    <div style={{ borderBottom: '1px solid #1A1A1A', padding: '6px 10px', fontSize: 11, color: '#FF6600', fontFamily: 'IBM Plex Mono' }}>
                        LIVE VESSEL FEED
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {sidebarVessels.length === 0 ? (
                            <div style={{ padding: 20, color: '#333', textAlign: 'center', fontSize: 10, fontFamily: 'IBM Plex Mono' }}>
                                {wsStatus === 'CONNECTED' ? 'Waiting for AIS data...' : `${wsStatus}...`}
                            </div>
                        ) : sidebarVessels.map(v => (
                            <div
                                key={v.mmsi}
                                onClick={() => {
                                    setSelected(v);
                                    setViewState({ ...viewState, longitude: v.lon, latitude: v.lat, zoom: 6, transitionDuration: 1000 });
                                }}
                                style={{ padding: '8px 10px', borderBottom: '1px solid #111', cursor: 'pointer', background: selected?.mmsi === v.mmsi ? 'rgba(255,102,0,0.05)' : 'transparent', fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ color: selected?.mmsi === v.mmsi ? '#FF6600' : '#FFF' }}>{v.name}</span>
                                    <span style={{ color: '#444' }}>{v.speed ?? '--'}kts</span>
                                </div>
                                <div style={{ color: `rgb(${(v.color || [136, 136, 136]).join(',')})`, fontSize: 9 }}>
                                    {v.destination ? `→ ${v.destination}` : `MMSI: ${v.mmsi}`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatelliteModule;
