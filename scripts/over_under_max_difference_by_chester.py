import pandas as pd

# Read the CSV file with proper encoding
df = pd.read_csv('S:\\SAIC\\Git_projects\\homeProjects\\diceSimulator\\data\\2025-12-18-C7DIFO-MZ--cd29699a63122662e13ef1d5ef0912d6beea12e93429b7ad143ecd802e7a06f6\\with-trial-sorted_with_outcome.csv', 
                 encoding='latin1')

# Calculate absolute difference and find max for each Chester
df['AbsDifference'] = df['Difference'].abs()
max_differences = df.loc[df.groupby('Chester')['AbsDifference'].idxmax()]

# Print the result
print(max_differences[['TrialNumber', 'Chester', 'Difference']])