import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from pathlib import Path

# --- FILE PATH SETUP ---
SCRIPT_DIR = Path(__file__).resolve().parent
CSV_PATH = SCRIPT_DIR.parent / 'data' / 'analyzed_coin_flips.csv'
BIN_SIZE = 20 
RSI_PERIOD = 14 # Standard lookback period for RSI
# -----------------------

def create_pro_market_chart(file_path, bin_size):
    if not file_path.exists():
        print(f"Error: Could not find file at {file_path}")
        return

    df = pd.read_csv(file_path)
    df['Group'] = df.index // bin_size
    df['Running_Rate'] = df['Result'].expanding().mean()
    
    # 1. Aggregate OHLC
    candles = df.groupby('Group').agg(
        Open=('Running_Rate', 'first'),
        High=('Running_Rate', 'max'),
        Low=('Running_Rate', 'min'),
        Close=('Running_Rate', 'last'),
        Volume=('Result', 'sum')
    ).reset_index()

    # 2. Calculate RSI
    delta = candles['Close'].diff()
    gain = (delta.where(delta > 0, 0)).ewm(alpha=1/RSI_PERIOD, adjust=False).mean()
    loss = (-delta.where(delta < 0, 0)).ewm(alpha=1/RSI_PERIOD, adjust=False).mean()
    rs = gain / loss
    candles['RSI'] = 100 - (100 / (1 + rs))

    # 3. Create Subplots (3 rows: Candles, Volume, RSI)
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, 
                       vertical_spacing=0.03, row_width=[0.2, 0.2, 0.6],
                       subplot_titles=('Head Ratio', 'Volume (Heads)', 'RSI Oscillator'))

    # Add Candlestick
    fig.add_trace(go.Candlestick(
        x=candles['Group'], open=candles['Open'], high=candles['High'],
        low=candles['Low'], close=candles['Close'], name='Market'
    ), row=1, col=1)

    # Add Volume
    fig.add_trace(go.Bar(x=candles['Group'], y=candles['Volume'], name='Volume', marker_color='gray'), row=2, col=1)

    # Add RSI
    fig.add_trace(go.Scatter(x=candles['Group'], y=candles['RSI'], name='RSI', line=dict(color='purple')), row=3, col=1)
    
    # RSI Threshold Lines
    fig.add_hline(y=70, line_dash="dot", line_color="red", row=3, col=1)
    fig.add_hline(y=30, line_dash="dot", line_color="green", row=3, col=1)

    fig.update_layout(height=900, template='plotly_dark', xaxis_rangeslider_visible=False)
    fig.show()

create_pro_market_chart(CSV_PATH, BIN_SIZE)