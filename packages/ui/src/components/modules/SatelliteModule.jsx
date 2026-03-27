import React, { useState, useMemo, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import useTerminalStore from '../../store/useTerminalStore';

const VESSEL_COLORS = {
    'Tanker': [255, 102, 0], 'VLCC': [255, 102, 0],
    'LNG Carrier': [0, 204, 255], 'Container': [0, 255, 65],
    'Bulk Carrier': [255, 204, 0], 'default': [136, 136, 136]
};

const CHOKEPOINTS = [
    { name: 'STRAIT OF HORMUZ', lat: 26.6, lon: 56.4, count: 23, baseline: 18, commodity: 'WTI/BRENT' },
    { name: 'SUEZ CANAL', lat: 30.5, lon: 32.3, count: 11, baseline: 14, commodity: 'CRUDE/GAS' },
    { name: 'STRAIT OF MALACCA', lat: 1.5, lon: 103.9, count: 47, baseline: 42, commodity: 'LNG/CRUDE' },
    { name: 'DANISH STRAITS', lat: 55.3, lon: 12.6, count: 8, baseline: 10, commodity: 'NAT GAS' },
];

const INITIAL_VIEW_STATE = {
    longitude: 40,
    latitude: 15,
    zoom: 2,
    pitch: 0,
    bearing: 0
};

const SatelliteModule = () => {
    const { vessels } = useTerminalStore();
    const [selected, setSelected] = useState(null);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [processedVessels, setProcessedVessels] = useState([]);
    const workerRef = useRef(null);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(new URL('../../workers/dataWorker.js', import.meta.url));

        workerRef.current.onmessage = ({ data }) => {
            if (data.type === 'VESSEL_BATCH_READY') {
                setProcessedVessels(data.payload);
            }
        };

        return () => workerRef.current.terminate();
    }, []);

    // Offload processing to worker on vessel changes
    useEffect(() => {
        if (workerRef.current && vessels.length > 0) {
            const raw = vessels.filter(v => v.lat && v.lon);
            workerRef.current.postMessage({ type: 'PROCESS_VESSEL_BATCH', payload: raw });
        }
    }, [vessels]);

    const activeVessels = processedVessels;
    const sidebarVessels = useMemo(() => activeVessels.slice(0, 40), [activeVessels]);

    const layers = [
        new ScatterplotLayer({
            id: 'vessel-layer',
            data: activeVessels,
            getPosition: d => [d.lon, d.lat],
            getFillColor: d => d.color || VESSEL_COLORS.default,
            getRadius: d => (selected?.mmsi === d.mmsi ? 50000 : 25000),
            pickable: true,
            onClick: ({ object }) => setSelected(object),
            parameters: {
                depthTest: true
            },
            updateTriggers: {
                getRadius: [selected?.mmsi],
                getFillColor: [selected?.mmsi]
            }
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
            parameters: {
                depthTest: true
            }
        })
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
            <div style={{ padding: '5px 12px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', display: 'flex', gap: '24px', fontSize: '11px', fontFamily: 'IBM Plex Mono', flexShrink: 0, zIndex: 10 }}>
                <span style={{ color: '#888' }}>AIS VESSELS <span style={{ color: '#00FF41' }}>{activeVessels.length} TRACKED</span></span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: '#888' }}>SAT-AIS: <span style={{ color: '#00CCFF' }}>{activeVessels.filter(v => v.intel?.source === "Satellite AIS").length} DETECTED</span></span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: '#888' }}>PROC: <span style={{ color: '#00CCFF' }}>WEB WORKER</span></span>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <DeckGL
                        viewState={viewState}
                        onViewStateChange={e => setViewState(e.viewState)}
                        controller={true}
                        layers={layers}
                        useDevicePixels={false}
                        getTooltip={({ object }) => object && (
                            object.mmsi ? `MMSI: ${object.mmsi}\nNAME: ${object.name}\nSPEED: ${object.speed}kts` : `CHOKEPOINT: ${object.name}`
                        )}
                        style={{ background: '#000' }}
                    >
                        <Map
                            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                            reuseMaps
                        />
                    </DeckGL>

                    {selected && selected.mmsi && (
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(13,13,13,0.95)', border: '1px solid #FF6600', padding: '12px', minWidth: '220px', zIndex: 5, fontFamily: 'IBM Plex Mono', pointerEvents: 'none' }}>
                            <div style={{ color: '#FF6600', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', letterSpacing: '1px' }}>{selected.name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                                <div style={{ color: '#444' }}>STATUS</div><div style={{ color: '#00FF41' }}>IN TRANSIT</div>
                                <div style={{ color: '#444' }}>TYPE</div><div style={{ color: '#FFF' }}>{selected.type}</div>
                                <div style={{ color: '#444' }}>MMSI</div><div style={{ color: '#FFF' }}>{selected.mmsi}</div>
                                {selected.intel?.source === "Satellite AIS" && (
                                    <>
                                        <div style={{ color: '#444' }}>DETECTION</div><div style={{ color: '#00FFFF' }}>{selected.intel.source}</div>
                                        <div style={{ color: '#444' }}>SAT ID</div><div style={{ color: '#00FFFF' }}>{selected.intel.satellite}</div>
                                        <div style={{ color: '#444' }}>SIGNAL</div><div style={{ color: '#00FFFF' }}>{selected.intel.signal_dbm} dBm</div>
                                    </>
                                )}
                                <div style={{ color: '#444' }}>SPEED</div><div style={{ color: '#FFF' }}>{selected.speed} KTS</div>
                                <div style={{ color: '#444' }}>DEST</div><div style={{ color: '#FFF' }}>{selected.destination}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ width: '280px', background: '#0D0D0D', borderLeft: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, zIndex: 10 }}>
                    <div style={{ borderBottom: '1px solid #1A1A1A', padding: '6px 10px', fontSize: '11px', color: '#FF6600' }}>CHOKEPOINT SIGNAL</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeVessels.length === 0 && (
                            <div style={{ padding: '20px', color: '#333', textAlign: 'center', fontSize: '10px', fontFamily: 'IBM Plex Mono' }}>
                                WAITING FOR AIS DIFFS...
                            </div>
                        )}
                        {sidebarVessels.map(v => (
                            <div key={v.mmsi}
                                onClick={() => {
                                    setSelected(v);
                                    setViewState({ ...viewState, longitude: v.lon, latitude: v.lat, zoom: 6, transitionDuration: 1000 });
                                }}
                                style={{ padding: '8px 10px', borderBottom: '1px solid #111', cursor: 'pointer', background: selected?.mmsi === v.mmsi ? 'rgba(255,102,0,0.05)' : 'transparent', fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span style={{ color: selected?.mmsi === v.mmsi ? '#FF6600' : '#FFFFFF' }}>{v.name}</span>
                                    <span style={{ color: '#444' }}>{v.speed}kts</span>
                                </div>
                                <div style={{ color: `rgb(${(v.color || [136, 136, 136]).join(',')})`, fontSize: '9px' }}>
                                    {v.type} → {v.destination}
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
