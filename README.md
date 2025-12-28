--> Ignore this one:  powershell -ExecutionPolicy Bypass -File .\run_dalembert.ps1

One-Time per session:
pandasai-env\Scripts\activate

SET WORKING_FOLDER=S:\SAIC\Git_projects\homeProjects\diceSimulator\data\CHANGE_ME_2025-12-08-XOLtbN09vo-e18e882184bf6a04c047af4eee7bddece23cb3a22fc1736221970832b38f6d89
echo %WORKING_FOLDER%
powershell -ExecutionPolicy Bypass -File .\scripts\add_trial_number.ps1 -Input %WORKING_FOLDER%\over-under.csv -Output .\data\with-trial.csv
powershell -ExecutionPolicy Bypass -File .\scripts\sort_by_chester.ps1 .\data\with-trial.csv > .\data\with-trial-sorted.csv

python scripts\add_win_loss.py

python scripts\over_under_max_difference_by_chester.py > %WORKING_FOLDER%\max-difference.txt

After this, move all newly-created files to correct folder so they aren't overwritten.

python scripts/display_candle_chart.py
python scripts/ema_chart.py
python scripts/ema_rsi_chart.py
>python scripts/all_chart_components.py


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

