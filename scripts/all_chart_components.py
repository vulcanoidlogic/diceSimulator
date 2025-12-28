import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from pathlib import Path

# --- CONFIGURATION ---
SCRIPT_DIR = Path(__file__).resolve().parent
# Adjust this path to your specific setup
CSV_PATH = SCRIPT_DIR.parent / 'data' / 'analyzed_coin_flips.csv'

BIN_SIZE = 20 
RSI_PERIOD = 14
BB_PERIOD = 20  # Lookback for Bollinger Bands
BB_STD = 2      # Standard deviations for the bands
# -----------------------

def create_ultimate_market_chart(file_path, bin_size):
    if not file_path.exists():
        print(f"Error: Could not find file at {file_path}")
        return

    df = pd.read_csv(file_path)
    df['Group'] = df.index // bin_size
    df['Running_Rate'] = df['Result'].expanding().mean()
    
    # 1. Aggregate OHLC and Volume
    candles = df.groupby('Group').agg(
        Open=('Running_Rate', 'first'),
        High=('Running_Rate', 'max'),
        Low=('Running_Rate', 'min'),
        Close=('Running_Rate', 'last'),
        Volume=('Result', 'sum')
    ).reset_index()

    # 2. Calculate Bollinger Bands
    candles['MA20'] = candles['Close'].rolling(window=BB_PERIOD).mean()
    candles['STD'] = candles['Close'].rolling(window=BB_PERIOD).std()
    candles['Upper_BB'] = candles['MA20'] + (BB_STD * candles['STD'])
    candles['Lower_BB'] = candles['MA20'] - (BB_STD * candles['STD'])

    # 3. Calculate RSI
    delta = candles['Close'].diff()
    gain = (delta.where(delta > 0, 0)).ewm(alpha=1/RSI_PERIOD, adjust=False).mean()
    loss = (-delta.where(delta < 0, 0)).ewm(alpha=1/RSI_PERIOD, adjust=False).mean()
    rs = gain / loss
    candles['RSI'] = 100 - (100 / (1 + rs))

    # 4. Create Subplots
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, 
                       vertical_spacing=0.03, row_width=[0.2, 0.2, 0.6],
                       subplot_titles=('Head Ratio w/ Bollinger Bands', 'Volume', 'RSI'))

    # Add Bollinger Bands (Shaded Area)
    fig.add_trace(go.Scatter(x=candles['Group'], y=candles['Upper_BB'], line=dict(color='rgba(173, 216, 230, 0.2)'), showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=candles['Group'], y=candles['Lower_BB'], line=dict(color='rgba(173, 216, 230, 0.2)'), fill='tonexty', fillcolor='rgba(173, 216, 230, 0.1)', name='Bollinger Bands'), row=1, col=1)

    # Add Candlestick
    fig.add_trace(go.Candlestick(x=candles['Group'], open=candles['Open'], high=candles['High'], low=candles['Low'], close=candles['Close'], name='Coin Price'), row=1, col=1)

    # Add Volume
    fig.add_trace(go.Bar(x=candles['Group'], y=candles['Volume'], name='Heads Count', marker_color='orange'), row=2, col=1)

    # Add RSI
    fig.add_trace(go.Scatter(x=candles['Group'], y=candles['RSI'], name='RSI', line=dict(color='magenta')), row=3, col=1)
    fig.add_hline(y=70, line_dash="dot", line_color="red", row=3, col=1)
    fig.add_hline(y=30, line_dash="dot", line_color="green", row=3, col=1)

    fig.update_layout(height=900, template='plotly_dark', xaxis_rangeslider_visible=False, showlegend=True)
    fig.show()

create_ultimate_market_chart(CSV_PATH, BIN_SIZE)