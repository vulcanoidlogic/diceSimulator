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
  const counts = { below: 0, above: 0, middle: 0, binaryOutcomes: "" };
  let overUnder = "";
  console.log(`Row,Value,OV-UN,Nonce`);
  for (let nonce = 0; nonce < numPlays; nonce++) {
    const roll = getDiceRoll(serverSeed, clientSeed, nonce, 0); // cursor = 0 for single roll per play
    if (roll < 50.0) {
      counts.below++;
      overUnder = "UN";
      counts.binaryOutcomes += "0,";
    } else if (roll >= 50.0) {
      counts.above++;
      overUnder = "OV";
      counts.binaryOutcomes += "1,";
    } else {
      counts.middle++; // Exactly 50.00
      overUnder = "EQ";
    }
    console.log(`${nonce + 1},${roll},${overUnder},${nonce}`);
  }
  return counts;
}

// Start
// July 26, 2025 nasty under seed
// const serverSeed =
//   "b1b696cca462c7198bb7002421e071afa898cc5002b8ef398d3a8be33ebcf66a";
// const clientSeed = "WtlEiQKYqB";
// const serverSeed =
//   "99590e90f0872355787c8eda97d318e777c2adf9e000f66f582d9f2d900591dc";
// const clientSeed = "xXG7tg66wb";
// const serverSeed =
//   "feb2276e511e619bf7c34e3026a26bbb1d7248da3a25378ef0fcaac36a580904";
const serverSeed =
  "bd3bf42b0460e7fcee3cc7c72c8f6ee62a344db67a88cd1035601e0ebabfbad6";
const clientSeed = "tyc6G63pVx";
const numPlays = 10000;

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
console.log(`${result.binaryOutcomes}`);
