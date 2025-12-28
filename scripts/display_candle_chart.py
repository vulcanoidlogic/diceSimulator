import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from pathlib import Path

# This gets the directory where your script is currently saved
SCRIPT_DIR = Path(__file__).resolve().parent

# This goes up one level (..) and then into the 'data' folder
DATA_FILE = SCRIPT_DIR.parent / 'data' / 'analyzed_coin_flips.csv'

print(f"Looking for file at: {DATA_FILE}")

# --- CONFIGURATION ---
csv_file = DATA_FILE
bin_size = 20  # Trials per candle
# ---------------------

def create_pro_market_chart(file_path, bin_size):
    df = pd.read_csv(file_path)
    
    # 1. Prepare Data Bins
    df['Group'] = df.index // bin_size
    df['Running_Rate'] = df['Result'].expanding().mean()
    
    # 2. Aggregate OHLC and Volume
    candles = df.groupby('Group').agg(
        Open=('Running_Rate', 'first'),
        High=('Running_Rate', 'max'),
        Low=('Running_Rate', 'min'),
        Close=('Running_Rate', 'last'),
        Volume=('Result', 'sum')
    ).reset_index()

    # 3. Calculate Support & Resistance (Top/Bottom of the recent range)
    resistance_level = candles['High'].quantile(0.95)  # The "Ceiling"
    support_level = candles['Low'].quantile(0.05)     # The "Floor"

    # 4. Create Subplots
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                       vertical_spacing=0.05, row_width=[0.2, 0.7])

    # Add Candlestick
    fig.add_trace(go.Candlestick(
        x=candles['Group'], open=candles['Open'], high=candles['High'],
        low=candles['Low'], close=candles['Close'], name='Market Ratio'
    ), row=1, col=1)

    # Add Resistance (Red Line)
    fig.add_hline(y=resistance_level, line_dash="dot", line_color="red", 
                  annotation_text="Resistance (Ceiling)", row=1, col=1)
    
    # Add Support (Green Line)
    fig.add_hline(y=support_level, line_dash="dot", line_color="green", 
                  annotation_text="Support (Floor)", row=1, col=1)

    # Add Volume Bars
    fig.add_trace(go.Bar(
        x=candles['Group'], y=candles['Volume'], name='Heads Count',
        marker_color='royalblue', opacity=0.7
    ), row=2, col=1)

    # 5. Styling
    fig.update_layout(
        title=f'Technical Analysis of Coin Flips: Support & Resistance',
        yaxis_title='Head Ratio',
        yaxis2_title='Volume',
        template='plotly_dark',
        xaxis_rangeslider_visible=False
    )

    fig.show()

create_pro_market_chart(csv_file, bin_size)