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

// Simulate a single dice roll
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

// Count rolls "Under 50," "Over 50," and "Equal 50" over multiple plays
function countRolls(serverSeed, clientSeed, numPlays) {
  const counts = { below: 0, above: 0, middle: 0 };
  for (let nonce = 0; nonce < numPlays; nonce++) {
    const roll = getDiceRoll(serverSeed, clientSeed, nonce, 0); // cursor = 0 for single roll per play
    console.log(`Roll ${nonce}: ${roll}`);
    if (roll < 50.0) {
      counts.below++;
    } else if (roll > 50.0) {
      counts.above++;
    } else {
      counts.middle++; // Exactly 50.00
    }
  }
  return counts;
}

// Example usage
const serverSeed =
  "b1b696cca462c7198bb7002421e071afa898cc5002b8ef398d3a8be33ebcf66a";
const clientSeed = "WtlEiQKYqB";
const numPlays = 10000; // 10,000 plays = 10,000 rolls

const result = countRolls(serverSeed, clientSeed, numPlays);
console.log(`Results for ${numPlays} rolls:`);
console.log(
  `Below 50.00: ${result.below} (${((result.below / numPlays) * 100).toFixed(
    2
  )}%)`
);
console.log(
  `Above 50.00: ${result.above} (${((result.above / numPlays) * 100).toFixed(
    2
  )}%)`
);
console.log(
  `Exactly 50.00: ${result.middle} (${(
    (result.middle / numPlays) *
    100
  ).toFixed(2)}%)`
);
