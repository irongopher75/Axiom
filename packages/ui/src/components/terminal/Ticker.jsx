import React, { useRef, useState, useMemo } from 'react';
import useTerminalStore from '../../store/useTerminalStore';

const Ticker = () => {
  // Use a simple selector for equityPrices. 
  // While this returns the whole object, the Ticker NECESSARILY needs to show many symbols.
  // However, we can use useMemo to stabilize the items mapped from it.
  const equityPrices = useTerminalStore(state => state.equityPrices);
  const [paused, setPaused] = useState(false);

  // Memoize the ticker items to ensure stable references during render cycles
  const items = useMemo(() => {
    return Object.keys(equityPrices)
      .sort()
      .map(sym => {
        const q = equityPrices[sym];
        const chg = q.changePercent != null ? q.changePercent : null;
        return {
          symbol: sym,
          price: Number(q.price).toFixed(2),
          chg: chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : null,
          up: q.up ?? (chg != null ? chg >= 0 : null),
          stale: q.stale ?? false,
        };
      });
  }, [equityPrices]);

  if (items.length === 0) {
    return (
      <div style={{ height: '24px', background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: '#333' }}>FETCHING MARKET DATA...</span>
      </div>
    );
  }

  return (
    <div
      style={{ height: '24px', background: '#0A0A0A', borderTop: '1px solid #1A1A1A', overflow: 'hidden', position: 'relative' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: 'max-content',
          animation: paused ? 'none' : 'axiom-ticker 90s linear infinite',
          willChange: 'transform',
        }}
      >
        {[0, 1].map(copy =>
          items.map((item, i) => (
            <span
              key={`${copy}-${i}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 18px',
                borderRight: '1px solid #111',
                height: '100%',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                whiteSpace: 'nowrap',
              }}
            >
              {item.stale && (
                <span style={{ color: '#FFCC00', fontSize: '7px' }} title="Last close price">●</span>
              )}
              <span style={{ color: '#555' }}>{item.symbol}</span>
              <span style={{ color: item.up === true ? '#00FF41' : item.up === false ? '#FF2244' : '#888' }}>
                {item.price}
              </span>
              {item.chg && (
                <span style={{ color: item.up === true ? '#00FF41' : item.up === false ? '#FF2244' : '#888', fontSize: '9px', opacity: 0.8 }}>
                  {item.chg}
                </span>
              )}
            </span>
          ))
        )}
      </div>

      <style>{`
        @keyframes axiom-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Ticker;
