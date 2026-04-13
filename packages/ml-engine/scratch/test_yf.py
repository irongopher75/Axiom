import yfinance as yf
import pandas as pd
import numpy as np

ticker = "AAPL"
data = yf.download(ticker, period="1d", interval="5m", progress=False, auto_adjust=True)
print(f"Initial Columns: {data.columns}")

if isinstance(data.columns, pd.MultiIndex):
    data.columns = data.columns.get_level_values(0)

print(f"Flattened Columns: {data.columns}")
row = data.iloc[0]
print(f"Data type of 'Open' column in row: {type(row['Open'])}")
print(f"Value of 'Open' column in row: {row['Open']}")
