import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# --- CONFIGURATION: ADJUST SENSITIVITY HERE ---
csv_file = 'your_flips.csv'  # Name of your input file
window_size = 30             # Lower = more jittery/sensitive; Higher = smoother
sensitivity = 1.5            # 1.0 (very tight) to 3.0 (very loose)
# ----------------------------------------------

def analyze_flips(file_path, window, sigma_mult):
    # Load data
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return

    # 1. Calculate Moving Average
    df['Moving_Avg'] = df['Result'].rolling(window=window).mean()

    # 2. Statistical Control Limits (Binomial Distribution)
    p_expected = 0.5
    # Standard deviation of the proportion: sqrt(p*q / n)
    sigma = np.sqrt((p_expected * (1 - p_expected)) / window)
    
    ucl = p_expected + (sigma_mult * sigma)
    lcl = p_expected - (sigma_mult * sigma)

    # 3. Detect "Sharp" Trends
    # A simple indicator if the average is increasing or decreasing
    df['Slope'] = df['Moving_Avg'].diff()
    
    # 4. Visualization
    plt.figure(figsize=(14, 7))
    
    # Plot the Moving Average
    plt.plot(df.index, df['Moving_Avg'], label=f'{window}-Trial Moving Avg', color='#1f77b4', lw=2)
    
    # Plot Control Limits
    plt.axhline(y=p_expected, color='black', linestyle='-', alpha=0.3, label='Fairness (0.5)')
    plt.axhline(y=ucl, color='#d62728', linestyle='--', label=f'Upper Limit ({ucl:.2%})')
    plt.axhline(y=lcl, color='#d62728', linestyle='--', label=f'Lower Limit ({lcl:.2%})')

    # Fill the "Normal" area
    plt.fill_between(df.index, lcl, ucl, color='gray', alpha=0.1)

    # Highlight points outside the limits (The "Bias Events")
    bias_events = df[(df['Moving_Avg'] > ucl) | (df['Moving_Avg'] < lcl)]
    plt.scatter(bias_events.index, bias_events['Moving_Avg'], color='red', s=20, zorder=5, label='Bias Alert')

    # Formatting
    plt.title(f'Mechanical Coin Analysis (Window: {window}, Sensitivity: {sigma_mult}σ)', fontsize=14)
    plt.ylabel('Proportion of Heads', fontsize=12)
    plt.xlabel('Trial Number', fontsize=12)
    plt.ylim(0, 1)
    plt.grid(True, which='both', linestyle=':', alpha=0.5)
    plt.legend(loc='upper right', frameon=True)
    
    plt.tight_layout()
    plt.show()
    
    # Optional: Save analyzed data to new CSV
    df.to_csv('analyzed_results.csv', index=False)
    print("Analysis complete. Check 'analyzed_results.csv' for details.")

# Run the analysis
analyze_flips(csv_file, window_size, sensitivity)