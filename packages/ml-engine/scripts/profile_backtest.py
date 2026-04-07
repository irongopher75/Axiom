import asyncio
import time
import pandas as pd
import numpy as np
from backtester import VectorizedBacktester
import logging

# Configure dummy logging
logging.basicConfig(level=logging.INFO)

async def main():
    symbol = "RELIANCE.NS"
    bt = VectorizedBacktester(symbol, initial_capital=100000.0)
    
    print("--- Performance Benchmarking: Vectorized Backtester ---")
    
    # 1. Warm up (fetch data once)
    print(f"Fetching data for {symbol}...")
    await bt.analyzer.fetch_data(period="2y", interval="1h")
    
    # 2. Measure actual logic time
    start_time = time.perf_counter()
    # We'll run the backtest logic. Since bt.run calls fetch_data, 
    # we'll ensure data_router handles the cache.
    result = await bt.run(period="2y", interval="1h")
    end_time = time.perf_counter()
    
    duration = (end_time - start_time) * 1000 # in ms
    print(f"Logic execution took {duration:.2f} ms for {len(result['equity_curve'])} points.")
    
    if duration < 100: # 100ms for 3500 points is very good for Python
        print("PERFORMANCE: SUCCESS")
    else:
        print("PERFORMANCE: WARNING (Slow execution)")

if __name__ == "__main__":
    asyncio.run(main())
