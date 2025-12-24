import pandas as pd

# Load the CSV file
df = pd.read_csv(r"S:\SAIC\Git_projects\homeProjects\diceSimulator\data\with-trial-sorted.csv", encoding="latin1")

# Initialize Outcome column with empty string
df['Outcome'] = ''

# Iterate through all rows except the last one
for i in range(len(df) - 1):
    current_guess = df.loc[i, 'NextGuess']
    current_right_guess_count = df.loc[i, 'RightGuessCount']
    next_right_guess_count = df.loc[i + 1, 'RightGuessCount']
    
    # if current_guess == 'over':
        # Win if next RightGuessCount is greater than current RightGuessCount
    if next_right_guess_count > current_right_guess_count:
        df.loc[i, 'Outcome'] = 'W'
    else:
        df.loc[i, 'Outcome'] = 'L'
    # elif current_guess == 'under':
    #     # Win if next RightGuessCount equals current RightGuessCount (no increase)
    #     if next_right_guess_count == current_right_guess_count:
    #         df.loc[i, 'Outcome'] = 'W'
    #     else:
    #         df.loc[i, 'Outcome'] = 'L'

# The last row has no next row to compare, so it remains empty or can be marked as N/A
# df.loc[len(df) - 1, 'Outcome'] = 'N/A'  # Uncomment if you want to mark the last row

# Save the updated CSV file
df.to_csv(r"S:\SAIC\Git_projects\homeProjects\diceSimulator\data\with-trial-sorted_with_outcome.csv", index=False, encoding='utf-8')

print("Processing complete! File saved with Outcome column.")
print(f"\nFirst few rows with outcomes:")
print(df.head(10))