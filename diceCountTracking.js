// diceCountTracking.js
// CLI-based Node.js script to track dice outcomes mimicking Stake.us with CSV output
const crypto = require("crypto");
class DiceRoll {
  constructor() {
    this.nonce = 0;
    this.row = 1;
    this.number = 0.0;
    this.ovUnEq50 = "EQ"; // OV, UN
    this.isLowProbability = "";
    this.reverse50WL = ""; // W, L
    this.reverse50Val = 0; // 1, -1
    this.nextPlay = 0.0; // number from previous roll
    this.plReverse50 = 0.0;
  }

  assignNumber(number) {
    this.number = number;

    const isOver = this.number > 50; // Adjust threshold if needed
    this.ovUnEq50 = isOver ? "OV" : "UN";
  }

  getNumberDisplay() {
    return this.number.toFixed(2);
  }

  getNextPlayDisplay() {
    return this.nextPlay.toFixed(2);
  }

  getPLReverse50Display() {
    return this.plReverse50.toFixed(2);
  }

  getCSVLine() {
    const csvLine = `${this.row},${this.getNumberDisplay()},${this.ovUnEq50},${
      this.isLowProbability
    },${this.reverse50WL},${
      this.reverse50Val
    },${this.getNextPlayDisplay()},${this.getPLReverse50Display()}`;
    return csvLine;
  }
}

class DiceRollManager {
  constructor() {
    this.diceRolls = [];
    this.initialize();
  }

  initialize() {
    console.log("Initialize DiceRollManager");
  }

  createDiceRoll() {
    const diceRoll = new DiceRoll();
    diceRoll.row = this.diceRolls.length + 1;
    this.diceRolls.push(diceRoll);
    return diceRoll;
  }

  getCount() {
    return this.diceRolls.length;
  }
}

let manager = new DiceRollManager();

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

// Generate a dice roll in [0, 100)
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
function assignHasLowProbabilitySequence(newestRoll) {
  // Use only the last 20 outcomes for probability checks
  const recentRolls = manager.diceRolls.slice(-20);
  if (recentRolls.length < 10) return false;

  // Check for 10 consecutive Over or Under
  for (let i = 0; i <= recentRolls.length - 10; i++) {
    const slice = recentRolls.slice(i, i + 10);
    if (
      slice.every((roll) => roll.ovUnEq50 === "OV") ||
      slice.every((roll) => roll.ovUnEq50 === "UN")
    ) {
      newestRoll.isLowProbability = "CON_10";
    }
  }

  // Check for 5 consecutive high (>=75) or low (<=25) rolls
  for (let i = 0; i <= recentRolls.length - 5; i++) {
    const slice = recentRolls.slice(i, i + 5);
    if (
      slice.every((roll) => roll.number >= 75) ||
      slice.every((roll) => roll.number <= 25)
    ) {
      newestRoll.isLowProbability = "CON_25_75";
    }
  }
}

function assignReversalResult(newestRoll) {
  // Check for reversal patterns in the last 20 outcomes}
  const recentRolls = manager.diceRolls.slice(-2);
  if (recentRolls.length < 2) return;

  const secondNewestRoll = recentRolls[recentRolls.length - 2];

  newestRoll.nextPlay = secondNewestRoll.number;
  if (secondNewestRoll.number <= 50) {
    newestRoll.nextPlay = 100 - secondNewestRoll.number;
  }

  if (
    (secondNewestRoll.ovUnEq50 === "OV" &&
      newestRoll.number <= secondNewestRoll.number) ||
    (secondNewestRoll.ovUnEq50 === "UN" &&
      newestRoll.number > secondNewestRoll.number)
  ) {
    newestRoll.reverse50WL = "W";
    newestRoll.reverse50Val = 1;
    newestRoll.plReverse50 = 100.0 / newestRoll.nextPlay - 1.02;
  } else {
    newestRoll.reverse50WL = "L";
    newestRoll.reverse50Val = -1;
    newestRoll.plReverse50 = -1;
  }
}

function logDiceRoll(roll) {
  const csvLine = roll.getCSVLine();
  console.log(csvLine);
}

// Main function to process a dice roll
function processDiceRoll(roll) {
  assignHasLowProbabilitySequence(roll);
  assignReversalResult(roll);
  logDiceRoll(roll);
}

// Simulate dice rolls (replace with your own loop or trigger)
function simulateDiceRolls(
  count = 20,
  serverSeed = "serverSeedExample",
  clientSeed = "clientSeedExample"
) {
  // Print CSV header
  console.log(
    "Row,Number,OV/UN,LOW_PROB,REVERSE_WL,REVERSE_VAL,NEXT_GUESS,CURRENT_PL,CUME_PL"
  );
  for (let i = 0; i < count; i++) {
    const nonce = i; // Increment nonce for each roll
    const roll = manager.createDiceRoll();
    roll.nonce = nonce;
    roll.assignNumber(getDiceResult(serverSeed, clientSeed, roll.nonce));
    processDiceRoll(roll);
  }
}

// Run the simulation
// simulateDiceRolls(
//   10000,
//   "9ffc838d845949595ed16ff4d1f24b7263559ec7a1cf25a4681a51aa7a95836a",
//   "KapGnsupbw"
// );
// simulateDiceRolls(
//   10000,
//   "2eaffe5858ef6914cd79aca54439a807b5348c589c2b48c5c26762d512155dce",
//   "y2m15V6I7-"
// );
// simulateDiceRolls(
//   10000,
//   "cd64cf54d8a10a65d69f3afc9031d3402012c063fc32ed283b8db79bfc91655b",
//   "kXA7YUDhAb"
// );
// simulateDiceRolls(
//   10000,
//   "664215b82cdc4de92f351bf54022425661dac1a6c1bc1a3d26c5b3f7a505bc62",
//   "2UvhERpUjd"
// );
// simulateDiceRolls(
//   10000,
//   "5a029e1f0037c6dcb187e9bd3ef3a42bcde2965e2c4f4cf4435b800b71c8c6f3",
//   "TlfT4skVct"
// );
// simulateDiceRolls(
//   10000,
//   "bd3bf42b0460e7fcee3cc7c72c8f6ee62a344db67a88cd1035601e0ebabfbad6",
//   "tyc6G63pVx"
// );
// simulateDiceRolls(
//   10000,
//   "8f5a4a8a93cacc55da974d0c6a5512a3e7bc320b3131a5940f78be4aae191c2f",
//   "NYqnIp_6QD"
// );
// simulateDiceRolls(
//   10000,
//   "0fe4bb7345ba2524df829bbe82598abc7152f75e46098a76e56eec05b91fd4cd",
//   "TzSi6p9EPy"
// );
simulateDiceRolls(
  10000,
  "061bb8bc2bf803f9ce756cc4afbf868c7bc89667ef02462e7fa35a6134800644",
  "L8cdf9Tg3e"
);
