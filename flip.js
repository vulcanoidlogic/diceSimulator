const crypto = require("crypto"); // Node.js crypto module

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

// Simulate a single coin flip event
function getFlipResult(serverSeed, clientSeed, nonce, cursor) {
  const rng = byteGenerator(serverSeed, clientSeed, nonce, cursor);
  const bytes = [];
  for (let i = 0; i < 4; i++) {
    bytes.push(rng.next().value);
  }
  const floatResult = bytes.reduce(
    (acc, value, i) => acc + value / Math.pow(256, i + 1),
    0
  );
  return floatResult <= 0.5 ? "tails" : "heads";
}

// Simulate one play (20 flips) for a given nonce
function simulateFlipPlay(serverSeed, clientSeed, nonce) {
  const results = [];
  for (let cursor = 0; cursor < 20; cursor++) {
    const result = getFlipResult(serverSeed, clientSeed, nonce, cursor);
    results.push(result);
  }
  return results;
}

// Count Tails and Heads over multiple plays
function countFlips(serverSeed, clientSeed, numPlays) {
  const counts = { tails: 0, heads: 0 };
  for (let nonce = 0; nonce < numPlays; nonce++) {
    const playResults = simulateFlipPlay(serverSeed, clientSeed, nonce);
    playResults.forEach((result) => {
      counts[result]++;
    });
  }
  return counts;
}

// Example usage
const serverSeed = "exampleServerSeed1234567890abcdef1234567890abcdef";
const clientSeed = "exampleClientSeed";
const numPlays = 5000; // 5,000 plays = 5,000 * 20 = 100,000 flips

const result = countFlips(serverSeed, clientSeed, numPlays);
const totalFlips = numPlays * 20;
console.log(`Results for ${numPlays} plays (${totalFlips} flips):`);
console.log(
  `Tails: ${result.tails} (${((result.tails / totalFlips) * 100).toFixed(2)}%)`
);
console.log(
  `Heads: ${result.heads} (${((result.heads / totalFlips) * 100).toFixed(2)}%)`
);
