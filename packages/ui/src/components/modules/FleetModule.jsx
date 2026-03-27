import React, { useState, useEffect, useRef } from 'react';
import useTerminalStore from '../../store/useTerminalStore';

const FleetModule = () => {
    const { vessels } = useTerminalStore();
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

    // Offload processing to worker
    useEffect(() => {
        if (workerRef.current && vessels.length > 0) {
            workerRef.current.postMessage({ type: 'PROCESS_VESSEL_BATCH', payload: vessels });
        }
    }, [vessels]);

    const mono = { fontFamily: 'IBM Plex Mono, monospace' };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden' }}>
            <div style={{ padding: '5px 12px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', fontSize: '11px', ...mono, color: '#888', flexShrink: 0 }}>
                FLEET / AIS · ACTIVE: <span style={{ color: '#00FF41' }}>{vessels.length}</span> · POLLING: <span style={{ color: '#00CCFF' }}>AISSTREAM</span>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {processedVessels.length === 0 ? (
                        <div style={{ padding: '20px', color: '#444', fontSize: '11px', ...mono }}>
                            {vessels.length > 0 ? "PROCESSING VESSEL DATA..." : "WAITING FOR AIS DATA..."}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', ...mono, textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#111', color: '#666', borderBottom: '1px solid #1A1A1A' }}>
                                    <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>NAME</th>
                                    <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>TYPE</th>
                                    <th style={{ padding: '8px 12px', fontWeight: 'normal', textAlign: 'right' }}>SPEED</th>
                                    <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>SOURCE / SIG</th>
                                    <th style={{ padding: '8px 12px', fontWeight: 'normal', textAlign: 'right' }}>DESTINATION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedVessels.map((v, i) => (
                                    <tr key={v.mmsi || i} style={{ borderBottom: '1px solid #1A1A1A' }}>
                                        <td style={{ padding: '8px 12px', color: '#FFF' }}>{v.name || 'UNKNOWN'}</td>
                                        <td style={{ padding: '8px 12px', color: `rgb(${v.color.join(',')})` }}>{v.type}</td>
                                        <td style={{ padding: '8px 12px', color: '#888', textAlign: 'right' }}>{v.speed} kts</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            {v.intel?.source === "Satellite AIS" ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '8px', background: 'rgba(0, 255, 255, 0.1)', color: '#00FFFF', padding: '1px 4px', borderRadius: '2px', border: '1px solid rgba(0, 255, 255, 0.2)', fontWeight: 'bold' }}>SAT-AIS</span>
                                                    <span style={{ color: '#444' }}>{v.intel.satellite} / {v.intel.signal_dbm}dBm</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#333' }}>TERRESTRIAL</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 12px', color: '#D4D4D4', textAlign: 'right' }}>{v.destination}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FleetModule;
