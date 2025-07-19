// Importing the crypto module for cryptographic operations
const crypto = require("crypto");

// Global boolean to control the use of random seeds
const useRandomSeed = true;
const debugMode = true;
// If useRandomSeed is false, use predefined values, otherwise generate random seeds
const randomServerSeed = useRandomSeed
  ? generateRandomServerSeed(64)
  : "0c22dd77691589646481a242dd0dd1ed4ff2b237849ce7b90a778dc1386f51c8";
// const randomServerSeed = useRandomSeed ? generateRandomServerSeed(64) : '664215b82cdc4de92f351bf54022425661dac1a6c1bc1a3d26c5b3f7a505bc62';
const randomClientSeed = useRandomSeed
  ? generateRandomClientSeed(10)
  : "gtxW2CqnTj";
// const startNonce = useRandomSeed ? Math.floor(Math.random() * 1000000) + 1 : 1;
const startNonce = 1;

// Setting initial parameters for the simulation
const startTime = Date.now();
let chance = 50,
  baseBet = 1, // Initial bet amount (configurable parameter)
  unit = 1, // Unit size for D'Alembert increase/decrease (configurable)
  balance = 1000000,
  // totalBets = 1680000,
  totalBets = 50000,
  houseEdge = 1,
  payOut = (100 - houseEdge) / (chance / 100) / 100,
  trackZScoreAfterTrialsCnt = 1000, // Start tracking z-score and p-value after this many bets
  win = 0, // 0: no bet, 1: win, -1: loss
  profit = 0,
  totalWagered = 0,
  winCount = 0,
  winRatio = 0,
  betCount = 1,
  progress;

// Byte generator for cryptographic randomness
function* byteGenerator(serverSeed, clientSeed, nonce, cursor) {
  let currentRound = Math.floor(cursor / 32);
  let currentRoundCursor = cursor % 32;

  while (true) {
    const hmac = crypto.createHmac("sha256", serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${currentRound}`);
    const buffer = hmac.digest();

    while (currentRoundCursor < 32) {
      yield buffer[currentRoundCursor];
      currentRoundCursor += 1;
    }

    currentRoundCursor = 0;
    currentRound += 1;
  }
}

// Utility function to introduce a delay
function betDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to simulate a dice roll using server and client seeds, nonce, and cursor
function getDiceRoll(serverSeed, clientSeed, nonce, cursor) {
  const rng = byteGenerator(serverSeed, clientSeed, nonce, cursor);
  const bytes = [];
  for (let i = 0; i < 4; i++) {
    bytes.push(rng.next().value);
  }

  const floatResult = bytes.reduce(
    (acc, value, i) => acc + value / Math.pow(256, i + 1),
    0
  );
  const roll = Math.floor(floatResult * 10001) / 100;
  return roll;
}

// Utility functions to generate random seeds
function generateRandomClientSeed(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function generateRandomServerSeed(length) {
  let result = [];
  const hexRef = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ];

  for (let n = 0; n < length; n++) {
    result.push(hexRef[Math.floor(Math.random() * 16)]);
  }

  return result.join("");
}

// Approximate standard normal CDF for p-value calculation
function normalCDF(z) {
  // Using the Abramowitz and Stegun approximation for standard normal CDF
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  const t = 1 / (1 + p * Math.abs(z));
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  let cdf = 1 - c * Math.exp((-z * z) / 2) * poly;

  if (z < 0) {
    cdf = 1 - cdf;
  }

  return cdf;
}

// Calculate cumulative z-score and one-tailed p-value for proportion of overs
function calculateCumulativeStats(overCount, totalRolls) {
  if (totalRolls === 0) {
    return { cumZScore: 0, cumPValue: 0.5 };
  }
  const p = 0.5; // Expected proportion of overs
  const pHat = overCount / totalRolls; // Observed proportion
  const stdError = Math.sqrt((p * (1 - p)) / totalRolls); // sqrt(0.25 / n)
  const z = (pHat - p) / stdError; // Z-score = 2 * (pHat - 0.5) * sqrt(n)
  const pValue = 1 - normalCDF(z); // One-tailed: P(Z >= z) for more overs

  return {
    cumZScore: z,
    cumPValue: pValue,
  };
}

// Helper function for Chester's random guess (unchanged)
function chesterGuess() {
  return Math.random() < 0.5; // true for "over" (≥ 50), false for "under" (< 50)
}

// Main function to analyze bets with Chester strategy
async function analyzeBets(
  serverSeed,
  clientSeed,
  startNonce,
  numberOfBets,
  initialBet,
  unitSize
) {
  let currentStreak = 0; // Tracks loss streak for Martingale
  let maxStreak = 0;
  let maxStreakNonce = 0;
  let nonce = startNonce;
  let bet = 0; // Current bet, starts at 0 until streak threshold is met
  const baseBet = initialBet; // Store base bet for when betting starts
  let chesterStreak = 0; // Tracks Chester's consecutive correct (positive) or incorrect (negative) guesses
  let betAgainstChester = 0; // 1: bet Chester is wrong, -1: bet Chester is right, 0: no bet
  let chesterGuessDirection = true; // Chester's initial guess (true: over, false: under)

  // Initialize min/max z-score and p-value trackers
  let maxCumZScore = -Infinity;
  let minCumZScore = Infinity;
  let maxCumPValue = -Infinity;
  let minCumPValue = Infinity;
  let overCount = 0; // Track number of "over" outcomes
  let isReversedStreak = false; // Flag to track if Chester's streak is reversed

  while (betCount < numberOfBets) {
    // Only deduct bet from balance if there was a bet placed
    if (betAgainstChester !== 0) {
      balance -= bet;
      totalWagered += bet; // Update total wagered
    }

    // Chester makes a new guess before every roll
    chesterGuessDirection = chesterGuess(); // New random guess for next roll
    const roll = getDiceRoll(serverSeed, clientSeed, nonce, 0);

    if (roll >= 50) {
      overCount++; // Increment for roll ≥ 50
    }
    const cumStats = calculateCumulativeStats(overCount, betCount + 1); // Cumulative stats

    // Update min/max z-score and p-value
    if (betCount > trackZScoreAfterTrialsCnt) {
      maxCumZScore = Math.max(maxCumZScore, cumStats.cumZScore);
      minCumZScore = Math.min(minCumZScore, cumStats.cumZScore);
      maxCumPValue = Math.max(maxCumPValue, cumStats.cumPValue);
      minCumPValue = Math.min(minCumPValue, cumStats.cumPValue);
    }

    // Determine if Chester's guess was correct
    const chesterWasCorrect =
      (chesterGuessDirection && roll >= 50) ||
      (!chesterGuessDirection && roll < 50);

    // Update Chester's streak.  Positive streak for correct guesses, negative for incorrect
    betAgainstChester = 0; // No bet
    win = 0; // Default to no bet
    isReversedStreak = false;
    if (chesterWasCorrect) {
      if (chesterStreak >= 6) {
        betAgainstChester = 1; // Bet Chester will be wrong
        win = -1;
        if (bet < 0.01) bet = baseBet;
        else bet *= 2;
      }
      // If continue guess right streak, increment.  If guess wrong streak ended, reset to 1
      if (chesterStreak >= 0) {
        chesterStreak = chesterStreak + 1;
        // bet = 0.0;
      } else {
        win = 1;
        bet *= 2;
        chesterStreak = 1; // Reset to 1 if guess wrong streak ended
        isReversedStreak = true; // Mark that Chester's streak was reversed
      }
    } else {
      if (chesterStreak <= -6) {
        betAgainstChester = -1; // Bet Chester will be right
        win = -1;
        if (bet < 0.01) bet = baseBet;
        else bet *= 2;
      }
      // If continue guess wrong streak, decrement.  If guess right streak ended, reset to -1
      if (chesterStreak <= 0) {
        chesterStreak = chesterStreak - 1;
        // bet = 0.0;
      } else {
        win = 1;
        bet *= 2;
        chesterStreak = -1; // Reset to -1 if guess right streak ended
        isReversedStreak = true; // Mark that Chester's streak was reversed
      }
    }

    console.log(
      `isReversedStreak: ${isReversedStreak}, chesterStreak: ${chesterStreak}`
    );

    if (isReversedStreak) {
      profit += (payOut - 1) * bet;
    } else {
      profit -= bet;
    }

    // Determine betting amount and direction
    // if (chesterStreak >= 6) {
    //   betAgainstChester = 1; // Bet Chester will be wrong
    //   if (bet < 0.01) bet = baseBet; // Start betting at baseBet
    //   // bet += baseBet; // Start betting at baseBet
    // } else if (chesterStreak <= -6) {
    //   betAgainstChester = -1; // Bet Chester will be right
    //   if (bet < 0.01) bet = baseBet; // Start betting at baseBet
    //   // bet += baseBet; // Start betting at baseBet
    // } else {
    //   betAgainstChester = 0; // No bet
    //   bet = 0.0; // No bet until streak reaches ±6
    // }

    // Process bet if bet > 0
    if (betAgainstChester !== 0) {
      // win = -1; // Default to loss
      // // win = betAgainstChester === 1 ? !chesterWasCorrect : chesterWasCorrect; // Determine win based on Chester's guess
      // if (betAgainstChester === 1 && !chesterWasCorrect) {
      //   win = 1;
      // }
      // if (betAgainstChester === -1 && chesterWasCorrect) {
      //   win = 1;
      // }

      if (win > 0) {
        // winCount++;
        // profit += bet * (payOut - 1); // Update profit
        // balance += bet * payOut; // Update balance
        // // currentStreak = 0;
        // // Reset after win
        // bet = 0; // Reset to no betting until next streak threshold
        // // chesterStreak = 0; // Reset Chester's streak
        // // betAgainstChester = 0; // Reset to betting Chester is right
      } else if (win < 0) {
        // profit -= bet; // Update profit
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          maxStreakNonce = nonce;
        }
        // bet *= 2; // Martingale: double bet after loss
      }
    } else {
      win = 0; // No bet placed, so win is NA
    }

    progress = (betCount / numberOfBets) * 100; // Update progress

    winRatio = (winCount / betCount || 1) * 100; // Avoid division by zero

    console.log(
      [
        "BetCnt: " + betCount,
        "Result: " + roll.toFixed(2),
        "CumZ: " + cumStats.cumZScore.toFixed(4),
        "CumP: " + cumStats.cumPValue.toFixed(6),
        "Chester Guess: " + (chesterGuessDirection ? "Over" : "Under"),
        "Chester Correct: " + chesterWasCorrect,
        "Chester Streak: " + chesterStreak,
        "Bet Against Chester: " + betAgainstChester,
        "Bet: " + bet.toFixed(8),
        "Profit: " + profit.toFixed(8),
        "Balance: " + balance.toFixed(8),
        "Total Wagered: " + totalWagered.toFixed(8),
        "Win Ratio: " + winRatio.toFixed(2),
        "Current Streak: " + currentStreak,
        "Worst Streak: " + maxStreak,
        "Server Seed: " + serverSeed,
        "Client Seed: " + clientSeed,
        "Nonce: " + nonce,
        "ProgressPct: " + progress.toFixed(4),
      ].join(" | ")
    );
    // await betDelay(100); // Uncomment if delay is needed

    if (isReversedStreak) {
      // If Chester's streak was reversed, reset the bet to baseBet
      bet = 0.0;
    }

    nonce++;
    betCount++;
  }

  return {
    betCount: betCount,
    maxLossStreak: maxStreak,
    maxStreakNonce: maxStreakNonce,
    maxCumZScore: maxCumZScore,
    minCumZScore: minCumZScore,
    maxCumPValue: maxCumPValue,
    minCumPValue: minCumPValue,
  };
}

// Analyze bets with D'Alembert strategy
const result = analyzeBets(
  randomServerSeed, // Server Seed
  randomClientSeed, // Client Seed
  startNonce, // Starting nonce position
  totalBets, // Total number of bets to analyze
  baseBet, // Initial bet amount
  unit // Unit size for D'Alembert
);

// Calculating and displaying the results
result.then((result) => {
  const endTime = Date.now();
  const runTimeSeconds = (endTime - startTime) / 1000;
  const betsPerSecond = result.betCount / runTimeSeconds;
  console.log("Complete!");
  console.log(
    [
      "Total Profit: " + profit.toFixed(8),
      "Win Ratio: " + winRatio.toFixed(2) + "%",
      "Max Cum Z-Score: " + result.maxCumZScore.toFixed(4),
      "Min Cum Z-Score: " + result.minCumZScore.toFixed(4),
      "Max Cum P-Value: " + result.maxCumPValue.toFixed(6),
      "Min Cum P-Value: " + result.minCumPValue.toFixed(6),
      "Max Loss Streak: " + result.maxLossStreak,
      "Final Balance: " + balance.toFixed(8),
      "Total Bets: " + result.betCount,
      "Total Wagered: " + totalWagered.toFixed(8),
    ].join(" | ")
  );
});
