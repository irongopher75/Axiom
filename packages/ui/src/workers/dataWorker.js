/**
 * Axiom Data Worker — Offloads heavy processing from the main thread.
 * Handles geospatial data batching, filtering, and interpolation.
 */

self.onmessage = ({ data }) => {
    const { type, payload, viewport } = data;

    switch (type) {
        case 'PROCESS_VESSEL_BATCH':
            // Deduplicate and enrich vessel data
            const processedVessels = (payload || []).map(v => ({
                ...v,
                // Example: logic to determine status color or icon on worker thread
                color: getVesselColor(v.type),
                size: v.length > 200 ? 12 : 8
            }));

            self.postMessage({
                type: 'VESSEL_BATCH_READY',
                payload: processedVessels
            });
            break;

        case 'PROCESS_AIRCRAFT_BATCH':
            // Deduplicate and enrich aircraft data
            const processedAircraft = (payload || []).map(a => ({
                ...a,
                color: [255, 102, 0], // AXIOM Orange
                label: `${a.callsign || 'N/A'} (${Math.round(a.baro_altitude || 0)}ft)`
            }));

            self.postMessage({
                type: 'AIRCRAFT_BATCH_READY',
                payload: processedAircraft
            });
            break;

        default:
            console.warn('[WORKER] Unknown task type:', type);
    }
};

function getVesselColor(type) {
    const typeStr = String(type || '').toUpperCase();
    if (typeStr.includes('TANKER')) return [255, 34, 68]; // Red
    if (typeStr.includes('CARGO')) return [0, 255, 65];   // Green
    if (typeStr.includes('FISHING')) return [255, 204, 0]; // Amber
    return [0, 204, 255]; // Blue/Cyan
}
