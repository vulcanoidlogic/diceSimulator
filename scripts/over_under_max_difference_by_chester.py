import pandas as pd

# Read the CSV file with proper encoding
df = pd.read_csv('S:\\SAIC\\Git_projects\\homeProjects\\diceSimulator\\data\\with-trial-sorted_with_outcome.csv', 
                 encoding='latin1')

# Calculate absolute difference and find max for each Chester
df['AbsDifference'] = df['Difference'].abs()
max_differences = df.loc[df.groupby('Chester')['AbsDifference'].idxmax()]

# Print the result
print(max_differences[['TrialNumber', 'Chester', 'Difference']])