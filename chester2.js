const crypto = require("crypto");

// Function to generate a random seed
function generateSeed() {
  return crypto.randomBytes(32).toString("hex");
}

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

// Generate seeds
const clientSeed = generateSeed();
const serverSeed = generateSeed();

// Number of rolls to simulate
const numRolls = 100;

// Initialize counters for summary and streak tracking
let over50Count = 0;
let currentStreak = 1;
let lastOutcome = null;
const streaks = [];

// Output CSV header
console.log("Row,Dice Roll,OV-UN,Consecutive");

// Simulate rolls and output as CSV
for (let i = 1; i <= numRolls; i++) {
  const roll = getDiceRoll(serverSeed, clientSeed, i, 0).toFixed(2);
  const outcome = roll >= 50 ? "OV" : "UN";
  if (roll >= 50) over50Count++;

  // Track consecutive outcomes
  if (i === 1) {
    streaks.push(currentStreak);
  } else {
    if (outcome === lastOutcome) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    streaks.push(currentStreak);
  }
  lastOutcome = outcome;

  console.log(`${i},${roll},${outcome},${currentStreak}`);
}

// Calculate percentage over 50
const percentOver50 = ((over50Count / numRolls) * 100).toFixed(2);

// Output summary row
console.log(
  `Summary,Client Seed: ${clientSeed},Server Seed: ${serverSeed},Percent Over 50: ${percentOver50}%`
);
