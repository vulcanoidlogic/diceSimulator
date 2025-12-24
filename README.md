powershell -ExecutionPolicy Bypass -File .\run_dalembert.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\add_trial_number.ps1 -Input .\data\2025-12-24-a-I4fzSSWc8w-71002afbc2a0c8810583a9c5a7614c6d1c9625426b57645a7a537f5e7aeec98e\over-under.csv -Output .\data\with-trial.csv
powershell -ExecutionPolicy Bypass -File .\scripts\sort_by_chester.ps1 .\data\with-trial.csv > .\data\with-trial-sorted.csv

pandasai-env\Scripts\activate
python scripts\add_win_loss.py
python scripts\over_under_max_difference_by_chester.py


# Dice-Betting-Simulator
JavaScript Dice Betting Simulator

# Crypto Gambling Simulation

This repository contains a Node.js script for simulating gambling strategies using cryptographic operations. The script calculates outcomes based on server and client seeds, simulating a gambling environment with customizable parameters.

## Features

- Cryptographically secure dice roll simulation.
- Configurable betting strategies.
- Calculation of win/loss streaks and betting efficiency.

## How to Use

1. watch this video: https://www.youtube.com/watch?v=5cGhw82-2pE
2. Clone the repository. [git clone https://github.com/btcgambler/Dice-Betting-Simulator.git]
3. Install Node.js if not already installed. - Linux [sudo apt install nodejs] Windows/Max [https://nodejs.org/en/download]
4. Change directory
3. Run the script using [node simulateDice.cjs]

## Configuration

Edit the following parameters in the script to customize your simulation:

- `chance`: Winning chance percentage.
- `baseBet`: Base bet amount.
- `totalBets`: Total number of bets in the simulation.
- `houseEdge`: House edge percentage.
- `increaseOnLoss`: Multiplier for bet amount on a loss.

## Debugging

Set `debugMode` to `true` for detailed console output and analysis of each bet.

## Disclaimer

This script is for educational and simulation purposes only. Gambling can be addictive and should be approached responsibly.

## Contribution

Feel free to fork this repository and contribute to its development.

---

Happy simulating and gamble smart!

