import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from pathlib import Path

# --- FILE PATH SETUP ---
SCRIPT_DIR = Path(__file__).resolve().parent
CSV_PATH = SCRIPT_DIR.parent / 'data' / 'analyzed_coin_flips.csv'
BIN_SIZE = 20 
# -----------------------

def create_ema_market_chart(file_path, bin_size):
    if not file_path.exists():
        print(f"Error: Could not find file at {file_path}")
        return

    df = pd.read_csv(file_path)
    df['Group'] = df.index // bin_size
    df['Running_Rate'] = df['Result'].expanding().mean()
    
    # Aggregate OHLC and Volume
    candles = df.groupby('Group').agg(
        Open=('Running_Rate', 'first'),
        High=('Running_Rate', 'max'),
        Low=('Running_Rate', 'min'),
        Close=('Running_Rate', 'last'),
        Volume=('Result', 'sum')
    ).reset_index()

    # Calculate EMA (Exponential Moving Average) 
    # A span of 10 sessions helps identify the momentum trend
    candles['EMA'] = candles['Close'].ewm(span=10, adjust=False).mean()

    # Create Subplots
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                       vertical_spacing=0.05, row_width=[0.2, 0.7])

    # Add Candlestick
    fig.add_trace(go.Candlestick(
        x=candles['Group'], open=candles['Open'], high=candles['High'],
        low=candles['Low'], close=candles['Close'], name='Market Ratio'
    ), row=1, col=1)

    # Add the EMA Line (The "Momentum" line)
    fig.add_trace(go.Scatter(
        x=candles['Group'], y=candles['EMA'], 
        line=dict(color='yellow', width=2), name='EMA (Trend)'
    ), row=1, col=1)

    # Add Volume Bars
    fig.add_trace(go.Bar(
        x=candles['Group'], y=candles['Volume'], name='Heads Count',
        marker_color='royalblue', opacity=0.7
    ), row=2, col=1)

    fig.update_layout(
        title='Coin Flip Analysis: Candlesticks + EMA Trend',
        template='plotly_dark',
        xaxis_rangeslider_visible=False
    )

    fig.show()

create_ema_market_chart(CSV_PATH, BIN_SIZE)