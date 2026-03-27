import React, { useState, useMemo, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import useTerminalStore from '../../store/useTerminalStore';

const TYPE_COLOR = {
    CARGO: [255, 102, 0],
    PAX: [0, 204, 255],
    default: [136, 136, 136]
};

const INITIAL_VIEW_STATE = {
    longitude: 15,
    latitude: 30,
    zoom: 2,
    pitch: 0,
    bearing: 0
};

const AviationModule = () => {
    const { aircraft } = useTerminalStore();
    const [filter, setFilter] = useState('ALL');
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [selected, setSelected] = useState(null);
    const [processedAircraft, setProcessedAircraft] = useState([]);
    const workerRef = useRef(null);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(new URL('../../workers/dataWorker.js', import.meta.url));

        workerRef.current.onmessage = ({ data }) => {
            if (data.type === 'AIRCRAFT_BATCH_READY') {
                setProcessedAircraft(data.payload);
            }
        };

        return () => workerRef.current.terminate();
    }, []);

    // Offload processing to worker
    useEffect(() => {
        if (workerRef.current && aircraft.length > 0) {
            const active = aircraft.filter(f => f.lat && f.lon);
            const filtered = filter === 'ALL' ? active : active.filter(f => f.type === filter);
            workerRef.current.postMessage({ type: 'PROCESS_AIRCRAFT_BATCH', payload: filtered });
        }
    }, [aircraft, filter]);

    const displayFlights = processedAircraft;
    const sidebarFlights = useMemo(() => displayFlights.slice(0, 30), [displayFlights]);

    const layers = [
        new ScatterplotLayer({
            id: 'aircraft-layer',
            data: displayFlights,
            getPosition: d => [d.lon, d.lat],
            getFillColor: d => TYPE_COLOR[d.type] || TYPE_COLOR.default,
            getRadius: d => (selected?.icao24 === d.icao24 ? 30000 : 15000),
            pickable: true,
            onClick: ({ object }) => setSelected(object),
            parameters: {
                depthTest: true
            },
            updateTriggers: {
                getRadius: [selected?.icao24],
                getFillColor: [selected?.icao24]
            }
        })
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
            <div style={{ padding: '5px 12px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', display: 'flex', gap: '20px', fontSize: '11px', fontFamily: 'IBM Plex Mono', flexShrink: 0, alignItems: 'center', zIndex: 10 }}>
                <span style={{ color: '#FF6600' }}>▸ AVIATION / ADS-B</span>
                <span style={{ color: '#888' }}>ACTIVE: <span style={{ color: '#00CCFF' }}>{displayFlights.length.toLocaleString()}</span></span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: '#888' }}>PROC: <span style={{ color: '#00CCFF' }}>WORKER / V3</span></span>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                    {['ALL', 'CARGO', 'PAX'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{ padding: '1px 8px', border: `1px solid ${filter === f ? '#FF6600' : '#1A1A1A'}`, background: 'transparent', color: filter === f ? '#FF6600' : '#555', fontFamily: 'IBM Plex Mono', fontSize: '10px', cursor: 'pointer' }}>
                            {f}
                        </button>
                    ))}
                </div>
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
                            `FLIGHT: ${object.callsign}\nALT: ${Math.round(object.baro_altitude || 0).toLocaleString()}ft\nSPD: ${Math.round(object.velocity || 0)}kts\nHDG: ${Math.round(object.true_track || 0)}°`
                        )}
                        style={{ background: '#000' }}
                    >
                        <Map
                            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                            reuseMaps
                        />
                    </DeckGL>

                    {selected && (
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(13,13,13,0.95)', border: '1px solid #FF6600', padding: '12px', minWidth: '220px', zIndex: 5, fontFamily: 'IBM Plex Mono', pointerEvents: 'none' }}>
                            <div style={{ color: '#FF6600', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', letterSpacing: '1px' }}>{selected.callsign}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                                <div style={{ color: '#444' }}>ICAO24</div><div style={{ color: '#FFF' }}>{selected.icao24}</div>
                                <div style={{ color: '#444' }}>COUNTRY</div><div style={{ color: '#FFF' }}>{selected.origin_country}</div>
                                <div style={{ color: '#444' }}>ALTITUDE</div><div style={{ color: '#00CCFF' }}>{Math.round(selected.baro_altitude || 0).toLocaleString()} FT</div>
                                <div style={{ color: '#444' }}>SPEED</div><div style={{ color: '#FFF' }}>{Math.round(selected.velocity || 0)} KTS</div>
                                <div style={{ color: '#444' }}>HEADING</div><div style={{ color: '#FFF' }}>{Math.round(selected.true_track || 0)}°</div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ width: '280px', background: '#0D0D0D', borderLeft: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, zIndex: 10 }}>
                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', fontSize: '11px', color: '#FF6600' }}>
                        ADS-B FEED
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {displayFlights.length === 0 && (
                            <div style={{ padding: '20px', color: '#333', fontFamily: 'IBM Plex Mono', fontSize: '10px', textAlign: 'center' }}>
                                WAITING FOR ADS-B DIFFS...
                            </div>
                        )}
                        {sidebarFlights.map((f, i) => (
                            <div key={f.icao24 || i}
                                onClick={() => {
                                    setSelected(f);
                                    setViewState({ ...viewState, longitude: f.lon, latitude: f.lat, zoom: 6, transitionDuration: 1000 });
                                }}
                                style={{ padding: '7px 10px', borderBottom: '1px solid #111', fontFamily: 'IBM Plex Mono', fontSize: '10px', cursor: 'pointer', background: selected?.icao24 === f.icao24 ? 'rgba(255,102,0,0.05)' : 'transparent' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span style={{ color: `rgb(${TYPE_COLOR[f.type]?.join(',') || TYPE_COLOR.default.join(',')})` }}>{f.callsign}</span>
                                    <span style={{ color: '#444' }}>{f.type}</span>
                                </div>
                                <div style={{ color: '#555' }}>
                                    {f.origin_country} · {Math.round(f.baro_altitude || 0).toLocaleString()}ft · {Math.round(f.velocity || 0)}kts
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AviationModule;
