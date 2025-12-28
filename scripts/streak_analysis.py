import pandas as pd
import numpy as np
from pathlib import Path

# --- FILE PATH SETUP ---
SCRIPT_DIR = Path(__file__).resolve().parent
CSV_PATH = SCRIPT_DIR.parent / 'data' / 'analyzed_coin_flips.csv'
# -----------------------

def get_max_streak(data):
    """Calculates the longest consecutive run of 1s in a series."""
    # Find groups of consecutive values
    streaks = data.groupby((data != data.shift()).cumsum()).cumcount() + 1
    # Filter only for heads (1s) and get the max
    heads_only = streaks[data == 1]
    return heads_only.max() if not heads_only.empty else 0

def run_streak_analysis(file_path):
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return

    df = pd.read_csv(file_path)
    actual_results = df['Result']
    total_flips = len(actual_results)
    
    # 1. Analyze your actual streak
    my_max_streak = get_max_streak(actual_results)
    
    # 2. Simulate 10,000 fair coin sessions of the same length
    sim_streaks = []
    for _ in range(10000):
        sim_data = pd.Series(np.random.randint(0, 2, size=total_flips))
        sim_streaks.append(get_max_streak(sim_data))
    
    # 3. Calculate "Rarity" (p-value)
    # What % of fair simulations had a streak as long or longer than yours?
    rarity = sum(1 for s in sim_streaks if s >= my_max_streak) / 10000
    avg_sim_streak = np.mean(sim_streaks)

    print(f"--- STREAK ANALYSIS (N={total_flips}) ---")
    print(f"Your Longest Streak: {my_max_streak} Heads")
    print(f"Expected Longest Streak (Avg): {avg_sim_streak:.2f} Heads")
    print(f"Rarity: {rarity:.2%}")
    
    if rarity < 0.05:
        print("RESULT: Statistically Significant! Your machine likely has a physical bias.")
    else:
        print("RESULT: Normal. This streak happens often in fair random sequences.")

run_streak_analysis(CSV_PATH)