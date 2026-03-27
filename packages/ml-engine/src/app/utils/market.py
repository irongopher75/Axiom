# app/utils/market.py
import yfinance as yf

# Centralized mapping for AXIOM symbols to yfinance tickers
AXIOM_TICKER_MAP = {
    "AAPL": "AAPL",
    "AMZN": "AMZN",
    "BABA": "BABA",
    "BTCUSDT": "BTC-USD",
    "COST": "COST",
    "ETHUSDT": "ETH-USD",
    "GOOGL": "GOOG",
    "HDFC": "HDFCBANK.NS",
    "INFY": "INFY.NS",
    "META": "META",
    "MSFT": "MSFT",
    "NFLX": "NFLX",
    "NVDA": "NVDA",
    "ONGC": "ONGC.NS",
    "QCOM": "QCOM",
    "RELIANCE": "RELIANCE.NS",
    "SBUX": "SBUX",
    "SOLUSDT": "SOL-USD",
    "TCS": "TCS.NS",
    "TSLA": "TSLA",
    "UBER": "UBER",
    "WIPRO": "WIPRO.NS",
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "DOW JONES": "^DJI",
    "S&P 500": "^GSPC",
}

AXIOM_ESSENTIALS = {
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
    "DXY": "DX-Y.NYB",
    "GOLD": "GC=F",
    "SILVER": "SI=F",
    "CRUDE": "CL=F",
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "SOL": "SOL-USD"
}

def get_yf_ticker(symbol: str) -> str:
    """
    Returns the yfinance ticker for a given AXIOM symbol.
    Now supports global symbols dynamic resolution.
    """
    symbol = symbol.upper().strip()
    
    # Check "Essentials" shorthand first
    if symbol in AXIOM_ESSENTIALS:
        return AXIOM_ESSENTIALS[symbol]
        
    # Standard AXIOM mapping (preserved for backward compatibility)
    if symbol in AXIOM_TICKER_MAP:
        return AXIOM_TICKER_MAP[symbol]
        
    # If it's already a yfinance-style ticker (has dot, caret, or dash for crypto)
    if "." in symbol or "^" in symbol or "-" in symbol:
        return symbol
        
    # Smart Fallback: If it's a 3-4 letter code and doesn't match US giants, 
    # it might be literal or need a suffix. 
    # For now, we return as-is for US stocks (AAPL, TSLA) 
    # or rely on the Search API to provide the fully-qualified ticker (e.g. RELIANCE.NS)
    return symbol

def get_display_name(ticker: str) -> str:
    """Returns the display name for a given yfinance ticker."""
    # Check Essentials reverse
    for display_name, yf_ticker in AXIOM_ESSENTIALS.items():
        if yf_ticker == ticker:
            return display_name
            
    # Check standard map reverse
    for display_name, yf_ticker in AXIOM_TICKER_MAP.items():
        if yf_ticker == ticker:
            return display_name
            
    # Clean up yfinance suffixes for common display
    if ".NS" in ticker: return ticker.replace(".NS", "")
    if ".BO" in ticker: return ticker.replace(".BO", "")
    if "-USD" in ticker: return ticker.replace("-USD", "")
    if ticker.startswith("^"): return ticker.replace("^", "")
    
    return ticker
