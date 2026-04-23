import React, { useEffect, useState } from 'react';
import api from '../../api';

const AviationModule = () => {
    const [flights, setFlights] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            const [flightsRes, statsRes] = await Promise.all([
                api.get('/api/v1/flights/live', { params: { limit: 50 } }),
                api.get('/api/v1/flights/stats').catch(() => ({ data: null })),
            ]);
            setFlights(flightsRes.data?.flights || []);
            setStats(statsRes.data);
            setError(null);
        } catch (e) {
            setError('Aviation feed unavailable.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 30000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6 font-mono text-[#E8E8E0] overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-[#1A1A1A] pb-4">
                <div className="flex flex-col">
                    <h2 className="text-axiom-orange text-lg font-bold tracking-[0.2em] uppercase">
                        Global Air-Traffic Intel
                    </h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">ADS-B Feed & Supply Chain Logistics</span>
                </div>
                <div className="flex gap-6 items-center">
                    {error && <span className="text-axiom-red text-[10px]">⚠ {error}</span>}
                    <div className="text-right">
                        <div className="text-[9px] text-gray-600 uppercase">Active Flights</div>
                        <div className="text-axiom-green text-sm font-bold tracking-widest">
                            {stats?.total_flights ?? flights.length ?? '--'}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] text-gray-600 uppercase">Source</div>
                        <div className="text-axiom-orange text-sm font-bold tracking-widest uppercase">
                            {loading ? '...' : 'ADS-B'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Placeholder map area */}
                <div className="flex-1 bg-[#0D0D0D] border border-[#1A1A1A] rounded-sm relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #FF6600 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                    {stats && (
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                            <div className="bg-black/80 border border-axiom-orange/30 p-3 rounded-sm">
                                <div className="text-[10px] font-bold text-axiom-orange mb-1 uppercase">Live Traffic</div>
                                <div className="text-[9px] text-gray-400">PAX: {stats.passenger_flights ?? '--'}</div>
                                <div className="text-[9px] text-gray-400">Cargo: {stats.cargo_flights ?? '--'}</div>
                            </div>
                        </div>
                    )}
                    <div className="h-full flex items-center justify-center">
                        {loading ? (
                            <span className="text-[10px] text-axiom-orange animate-pulse uppercase tracking-widest">Scanning ADSB…</span>
                        ) : (
                            <span className="text-[10px] text-gray-700 uppercase tracking-[0.5em]">{flights.length} Aircraft Tracked</span>
                        )}
                    </div>
                </div>

                {/* Flight list */}
                <div className="w-96 bg-[#0D0D0D] border border-[#1A1A1A] flex flex-col rounded-sm overflow-hidden">
                    <div className="p-3 border-b border-[#1A1A1A] flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Live Flight Feed</span>
                        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-axiom-orange animate-pulse' : 'bg-axiom-green shadow-[0_0_8px_#00FF41]'}`} />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading && flights.length === 0 ? (
                            <div className="p-6 text-center text-[10px] text-axiom-orange animate-pulse uppercase tracking-widest">Loading…</div>
                        ) : flights.length === 0 ? (
                            <div className="p-6 text-center text-[10px] text-gray-700 uppercase tracking-widest">No flights found</div>
                        ) : flights.map((f, i) => (
                            <div key={f.id ?? f.callsign ?? i} className="p-4 border-b border-[#111] hover:bg-white/5 transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-white group-hover:text-axiom-orange">{f.callsign ?? 'N/A'}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-sm border ${f.on_ground ? 'text-gray-500 border-gray-700 bg-gray-900' : 'text-axiom-orange border-axiom-orange/20 bg-axiom-orange/10'}`}>
                                        {f.on_ground ? 'Ground' : 'En-route'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                                    {f.origin && <div className="text-gray-600">FROM: <span className="text-gray-400">{f.origin}</span></div>}
                                    {f.destination && <div className="text-gray-600 text-right">TO: <span className="text-gray-400">{f.destination}</span></div>}
                                    {f.altitude_ft != null && <div className="text-gray-600">ALT: <span className="text-gray-400">{f.altitude_ft?.toLocaleString()} FT</span></div>}
                                    {f.speed_kts != null && <div className="text-gray-600 text-right">SPD: <span className="text-gray-400">{f.speed_kts} KTS</span></div>}
                                    {f.aircraft_type && <div className="text-gray-600 col-span-2">TYPE: <span className="text-gray-400">{f.aircraft_type}</span></div>}
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
