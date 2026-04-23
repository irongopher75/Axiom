/**
 * Axiom Data Worker — Offloads heavy processing from the main thread.
 * Handles geospatial data batching, filtering, and interpolation.
 */

self.onmessage = ({ data }) => {
    const { type, payload } = data;

    switch (type) {
        case 'PROCESS_VESSEL_BATCH': {
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
        }

        case 'PROCESS_AIRCRAFT_BATCH': {
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
        }

        case 'CALCULATE_INDICATORS': {
            const candles = payload?.candles || [];
            const visibleIndicators = payload?.visibleIndicators || [];
            const indicatorData = {};

            visibleIndicators.forEach((indicatorId) => {
                if (indicatorId === 'SMA20') indicatorData[indicatorId] = calculateSMA(candles, 20);
                else if (indicatorId === 'SMA50') indicatorData[indicatorId] = calculateSMA(candles, 50);
                else if (indicatorId === 'EMA9') indicatorData[indicatorId] = calculateEMA(candles, 9);
                else if (indicatorId === 'RSI14') indicatorData[indicatorId] = calculateRSI(candles, 14);
            });

            self.postMessage({
                type: 'INDICATORS_READY',
                payload: {
                    key: payload?.key,
                    indicatorData,
                }
            });
            break;
        }

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

function calculateSMA(data, period) {
    if (!Array.isArray(data) || data.length < period) return [];

    const result = [];
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
        sum += Number(data[i]?.close || 0);

        if (i >= period) {
            sum -= Number(data[i - period]?.close || 0);
        }

        if (i >= period - 1) {
            result.push({ time: data[i].time, value: sum / period });
        }
    }

    return result;
}

function calculateEMA(data, period) {
    if (!Array.isArray(data) || data.length < period) return [];

    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = Number(data[0]?.close || 0);

    for (let i = 0; i < data.length; i++) {
        const close = Number(data[i]?.close || 0);
        ema = i === 0 ? close : close * multiplier + ema * (1 - multiplier);

        if (i >= period - 1) {
            result.push({ time: data[i].time, value: ema });
        }
    }

    return result;
}

function calculateRSI(data, period) {
    if (!Array.isArray(data) || data.length <= period) return [];

    let gains = 0;
    let losses = 0;
    const result = [];

    for (let i = 1; i <= period; i++) {
        const diff = Number(data[i]?.close || 0) - Number(data[i - 1]?.close || 0);
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < data.length; i++) {
        if (i > period) {
            const diff = Number(data[i]?.close || 0) - Number(data[i - 1]?.close || 0);
            const gain = diff > 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;
            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        }

        const rs = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgGain / avgLoss;
        result.push({
            time: data[i].time,
            value: 100 - (100 / (1 + rs))
        });
    }

    return result;
}
