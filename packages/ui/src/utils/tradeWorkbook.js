import * as XLSX from 'xlsx';

const currencyFormat = '$#,##0.00';
const percentFormat = '0.00%';
const decimalFormat = '0.00';

const asDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatMonthKey = (value) => {
    const date = asDate(value);
    if (!date) return 'Unknown';
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const buildTradeRow = (trade) => {
    const quantity = toNumber(trade.quantity);
    const entryPrice = toNumber(trade.entry_price);
    const exitPrice = trade.exit_price == null ? null : toNumber(trade.exit_price);
    const openedAt = asDate(trade.timestamp);
    const closedAt = asDate(trade.exit_timestamp);
    const grossExposure = quantity * entryPrice;
    const pnl = trade.pnl == null
        ? (exitPrice == null ? 0 : (trade.side === 'SELL' ? (entryPrice - exitPrice) : (exitPrice - entryPrice)) * quantity)
        : toNumber(trade.pnl);
    const pnlPct = grossExposure > 0 ? pnl / grossExposure : 0;
    const holdHours = openedAt && closedAt
        ? (closedAt.getTime() - openedAt.getTime()) / (1000 * 60 * 60)
        : null;

    return {
        tradeId: trade.id || '',
        status: trade.status || '',
        symbol: trade.symbol || '',
        side: trade.side || '',
        strategy: trade.strategy || 'MANUAL',
        openedAt,
        closedAt,
        holdHours,
        quantity,
        entryPrice,
        exitPrice,
        grossExposure,
        pnl,
        pnlPct,
        outcome: pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Flat',
    };
};

const appendSheet = (workbook, name, rows, cols = []) => {
    const sheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
    if (cols.length) {
        sheet['!cols'] = cols;
    }
    XLSX.utils.book_append_sheet(workbook, sheet, name);
    return sheet;
};

const setColumnFormats = (sheet, headers, formatMap) => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let col = range.s.c; col <= range.e.c; col += 1) {
        const header = headers[col];
        const format = formatMap[header];
        if (!format) continue;

        for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
            const address = XLSX.utils.encode_cell({ r: row, c: col });
            if (sheet[address]) {
                sheet[address].z = format;
            }
        }
    }
};

const addAutoFilter = (sheet) => {
    if (!sheet['!ref']) return;
    sheet['!autofilter'] = { ref: sheet['!ref'] };
};

const buildOverviewSheet = ({ userEmail, exportDate, totals, symbolRows, monthlyRows, performance, activeCount }) => {
    const rows = [
        ['AXIOM Trade Export'],
        ['Prepared For', userEmail || 'Unknown user'],
        ['Exported At', exportDate.toISOString()],
        ['Compatible With', 'Apple Numbers / Microsoft Excel'],
        [],
        ['Portfolio Snapshot'],
        ['Metric', 'Value'],
        ['Closed Trades', totals.closedTrades],
        ['Open Trades', activeCount],
        ['Realized PnL', totals.realizedPnl],
        ['Average Trade Return', totals.avgPnlPct],
        ['Win Rate', totals.winRate],
        ['Profit Factor', totals.profitFactor],
        ['Average Hold (Hours)', totals.avgHoldHours],
        ['Best Trade', totals.bestTrade],
        ['Worst Trade', totals.worstTrade],
        ['Net Exposure', toNumber(performance?.active_exposure)],
        ['Total Equity', toNumber(performance?.total_equity)],
        [],
        ['Top Symbols'],
        ['Symbol', 'Closed Trades', 'Net PnL', 'Win Rate'],
        ...symbolRows.slice(0, 8).map((row) => [row.symbol, row.closedTrades, row.netPnl, row.winRate]),
        [],
        ['Monthly Performance'],
        ['Month', 'Closed Trades', 'Net PnL', 'Average Return'],
        ...monthlyRows.map((row) => [row.month, row.closedTrades, row.netPnl, row.avgReturn]),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
    sheet['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];

    [
        'B10', 'B16', 'B17',
    ].forEach((cell) => {
        if (sheet[cell]) sheet[cell].z = currencyFormat;
    });
    ['B11', 'B12'].forEach((cell) => {
        if (sheet[cell]) sheet[cell].z = percentFormat;
    });
    if (sheet.B13) sheet.B13.z = decimalFormat;
    if (sheet.B14) sheet.B14.z = decimalFormat;

    const topSymbolsStart = 22;
    for (let row = topSymbolsStart; row < topSymbolsStart + symbolRows.slice(0, 8).length; row += 1) {
        if (sheet[`C${row}`]) sheet[`C${row}`].z = currencyFormat;
        if (sheet[`D${row}`]) sheet[`D${row}`].z = percentFormat;
    }

    const monthlyStart = 26 + symbolRows.slice(0, 8).length;
    for (let row = monthlyStart; row < monthlyStart + monthlyRows.length; row += 1) {
        if (sheet[`C${row}`]) sheet[`C${row}`].z = currencyFormat;
        if (sheet[`D${row}`]) sheet[`D${row}`].z = percentFormat;
    }

    return sheet;
};

export function exportTradesWorkbook({
    userEmail,
    activeTrades = [],
    tradeHistory = [],
    performance = null,
}) {
    const exportDate = new Date();
    const closedRows = tradeHistory.map(buildTradeRow);
    const openRows = activeTrades.map(buildTradeRow);

    const realizedPnl = closedRows.reduce((sum, trade) => sum + trade.pnl, 0);
    const winners = closedRows.filter((trade) => trade.pnl > 0);
    const losers = closedRows.filter((trade) => trade.pnl < 0);
    const avgPnlPct = closedRows.length
        ? closedRows.reduce((sum, trade) => sum + trade.pnlPct, 0) / closedRows.length
        : 0;
    const avgHoldHours = closedRows.length
        ? closedRows.reduce((sum, trade) => sum + (trade.holdHours ?? 0), 0) / closedRows.length
        : 0;

    const symbolMap = new Map();
    closedRows.forEach((trade) => {
        const current = symbolMap.get(trade.symbol) || {
            symbol: trade.symbol,
            closedTrades: 0,
            netPnl: 0,
            wins: 0,
            avgHoldHours: 0,
        };
        current.closedTrades += 1;
        current.netPnl += trade.pnl;
        current.avgHoldHours += trade.holdHours ?? 0;
        if (trade.pnl > 0) current.wins += 1;
        symbolMap.set(trade.symbol, current);
    });

    const symbolRows = Array.from(symbolMap.values())
        .map((row) => ({
            symbol: row.symbol,
            closedTrades: row.closedTrades,
            netPnl: row.netPnl,
            winRate: row.closedTrades ? row.wins / row.closedTrades : 0,
            avgHoldHours: row.closedTrades ? row.avgHoldHours / row.closedTrades : 0,
        }))
        .sort((left, right) => right.netPnl - left.netPnl);

    const monthMap = new Map();
    closedRows.forEach((trade) => {
        const key = formatMonthKey(trade.closedAt);
        const current = monthMap.get(key) || {
            month: key,
            closedTrades: 0,
            netPnl: 0,
            avgReturnAccumulator: 0,
        };
        current.closedTrades += 1;
        current.netPnl += trade.pnl;
        current.avgReturnAccumulator += trade.pnlPct;
        monthMap.set(key, current);
    });

    const monthlyRows = Array.from(monthMap.values())
        .map((row) => ({
            month: row.month,
            closedTrades: row.closedTrades,
            netPnl: row.netPnl,
            avgReturn: row.closedTrades ? row.avgReturnAccumulator / row.closedTrades : 0,
        }))
        .sort((left, right) => left.month.localeCompare(right.month));

    const workbook = XLSX.utils.book_new();

    const overviewSheet = buildOverviewSheet({
        userEmail,
        exportDate,
        activeCount: openRows.length,
        performance,
        symbolRows,
        monthlyRows,
        totals: {
            closedTrades: closedRows.length,
            realizedPnl,
            avgPnlPct,
            winRate: closedRows.length ? winners.length / closedRows.length : 0,
            profitFactor: losers.length
                ? winners.reduce((sum, trade) => sum + trade.pnl, 0) / Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0))
                : winners.length ? winners.reduce((sum, trade) => sum + trade.pnl, 0) : 0,
            avgHoldHours,
            bestTrade: winners.length ? Math.max(...winners.map((trade) => trade.pnl)) : 0,
            worstTrade: losers.length ? Math.min(...losers.map((trade) => trade.pnl)) : 0,
        },
    });
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    const closedSheet = appendSheet(
        workbook,
        'Closed Trades',
        closedRows,
        [
            { wch: 38 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
            { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
        ],
    );
    setColumnFormats(closedSheet, Object.keys(closedRows[0] || {}), {
        openedAt: 'yyyy-mm-dd hh:mm',
        closedAt: 'yyyy-mm-dd hh:mm',
        holdHours: decimalFormat,
        quantity: decimalFormat,
        entryPrice: currencyFormat,
        exitPrice: currencyFormat,
        grossExposure: currencyFormat,
        pnl: currencyFormat,
        pnlPct: percentFormat,
    });
    addAutoFilter(closedSheet);

    const openSheet = appendSheet(
        workbook,
        'Open Trades',
        openRows,
        [
            { wch: 38 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
            { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
        ],
    );
    setColumnFormats(openSheet, Object.keys(openRows[0] || {}), {
        openedAt: 'yyyy-mm-dd hh:mm',
        closedAt: 'yyyy-mm-dd hh:mm',
        holdHours: decimalFormat,
        quantity: decimalFormat,
        entryPrice: currencyFormat,
        exitPrice: currencyFormat,
        grossExposure: currencyFormat,
        pnl: currencyFormat,
        pnlPct: percentFormat,
    });
    addAutoFilter(openSheet);

    const symbolSheet = appendSheet(
        workbook,
        'Symbol Analysis',
        symbolRows,
        [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }],
    );
    setColumnFormats(symbolSheet, Object.keys(symbolRows[0] || {}), {
        netPnl: currencyFormat,
        winRate: percentFormat,
        avgHoldHours: decimalFormat,
    });
    addAutoFilter(symbolSheet);

    const monthlySheet = appendSheet(
        workbook,
        'Monthly Analysis',
        monthlyRows,
        [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }],
    );
    setColumnFormats(monthlySheet, Object.keys(monthlyRows[0] || {}), {
        netPnl: currencyFormat,
        avgReturn: percentFormat,
    });
    addAutoFilter(monthlySheet);

    const fileName = `axiom-trades-${exportDate.toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName, { compression: true });
    return fileName;
}
