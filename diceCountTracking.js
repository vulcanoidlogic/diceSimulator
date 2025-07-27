// diceCountTracking.js
// CLI-based Node.js script to track dice outcomes mimicking Stake.us with CSV output

const crypto = require("crypto");

let outcomes = [];

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

// Modified to generate a dice roll in [0, 100)
function getDiceResult(serverSeed, clientSeed, nonce) {
  const rng = byteGenerator(serverSeed, clientSeed, nonce, 0);
  const bytes = [];
  for (let i = 0; i < 4; i++) {
    bytes.push(rng.next().value);
  }
  const floatResult = bytes.reduce(
    (acc, value, i) => acc + value / Math.pow(256, i + 1),
    0
  );
  return floatResult * 100; // Scale to [0, 100)
}

// Function to calculate probability of sequences
function hasLowProbabilitySequence(outcomes) {
  if (outcomes.length < 10) return false;

  // Check last 20 outcomes
  const window = outcomes.slice(-20);

  // Check for 10 consecutive Over or Under
  for (let i = 0; i <= window.length - 10; i++) {
    const slice = window.slice(i, i + 10);
    if (
      slice.every((outcome) => outcome.result === "Over") ||
      slice.every((outcome) => outcome.result === "Under")
    ) {
      return true;
    }
  }

  // Check for 5 consecutive high (>=75) or low (<=25) rolls
  const consecutiveThreshold25 = 6;
  for (let i = 0; i <= window.length - consecutiveThreshold25; i++) {
    const slice = window.slice(i, i + consecutiveThreshold25);
    if (
      slice.every((outcome) => outcome.number >= 75) ||
      slice.every((outcome) => outcome.number <= 25)
    ) {
      return true;
    }
  }

  // Check for 5 consecutive high (>=90) or low (<=10) rolls
  const consecutiveThreshold10 = 4;
  for (let i = 0; i <= window.length - consecutiveThreshold10; i++) {
    const slice = window.slice(i, i + consecutiveThreshold10);
    if (
      slice.every((outcome) => outcome.number >= 90) ||
      slice.every((outcome) => outcome.number <= 10)
    ) {
      return true;
    }
  }

  return false;
}

// Function to log a single outcome as a CSV line
function logOutcome(outcome, index) {
  const lowProb = hasLowProbabilitySequence(outcomes.slice(0, index + 1))
    ? "*"
    : "";
  const csvLine = `${index + 1},${outcome.number.toFixed(2)},${
    outcome.result === "Over" ? "OV" : "UN"
  },${lowProb}`;
  console.log(csvLine);
}

// Main function to process a dice roll
function processDiceRoll(number) {
  const isOver = number > 50; // Adjust threshold if needed
  const outcome = {
    number: number,
    result: isOver ? "Over" : "Under",
  };

  outcomes.push(outcome);

  // Keep only the last 20 outcomes
  if (outcomes.length > 20) {
    outcomes = outcomes.slice(-20);
  }

  logOutcome(outcome, outcomes.length - 1);
}

// Simulate dice rolls (replace with your own loop or trigger)
function simulateDiceRolls(
  count = 20,
  serverSeed = "defaultServerSeed",
  clientSeed = "defaultClientSeedExample"
) {
  // Print CSV header
  console.log("Row,Number,OV/UN,LOW_PROB");
  for (let i = 0; i < count; i++) {
    const nonce = i; // Increment nonce for each roll
    const number = getDiceResult(serverSeed, clientSeed, nonce);
    processDiceRoll(number);
  }
}

// Run the simulation
simulateDiceRolls(
  10000,
  "bd3bf42b0460e7fcee3cc7c72c8f6ee62a344db67a88cd1035601e0ebabfbad6",
  "tyc6G63pVx"
); // Run 20 rolls for testing
