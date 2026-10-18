const test = require("node:test");
const assert = require("node:assert/strict");
const { discoverBettorBlocks, normalizeWorkbook, validateWorkbook } = require("./workbook-parser.cjs");

function matrix(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(null));
}

function formatted(raw) {
  return raw.map((row) => row.map((value) => (value == null ? null : String(value))));
}

function baseSheets(bettorCount = 2) {
  const scoreboard = matrix(bettorCount + 5, 17);
  scoreboard[1][7] = 100;
  scoreboard[1][8] = bettorCount;
  scoreboard[2][0] = "Player";
  scoreboard[2][1] = "Amount Paid";
  scoreboard[2][16] = "Player";
  for (let index = 0; index < bettorCount; index += 1) {
    scoreboard[3 + index][0] = `Player ${index + 1}`;
    scoreboard[3 + index][1] = 100;
    scoreboard[3 + index][16] = `Player ${index + 1}`;
    scoreboard[3 + index][15] = 100 - index * 10;
  }

  const earnings = matrix(bettorCount + 5, 5);
  earnings[1][3] = "Week 0";
  earnings[2][0] = "Rank";
  earnings[2][1] = "Player";
  earnings[2][2] = "Winnings";
  for (let index = 0; index < bettorCount; index += 1) {
    earnings[3 + index][0] = index + 1;
    earnings[3 + index][1] = `Player ${index + 1}`;
    earnings[3 + index][2] = 10 - index;
    earnings[3 + index][3] = 10 - index;
  }

  const width = 15 + bettorCount * 4;
  const week = matrix(45, width);
  week[3][0] = "Game of the Week";
  week[4][0] = "9/1/2026";
  week[4][1] = "7:00 PM";
  week[4][2] = "Away Team";
  week[4][3] = "Home Team";
  week[4][4] = -3.5;
  week[4][11] = 21;
  week[4][12] = 24;
  week[4][13] = "Home Team";
  week[37][11] = 100;
  for (let index = 0; index < bettorCount; index += 1) {
    const column = 15 + index * 4;
    week[1][column] = `Player ${index + 1}`;
    week[2][column] = "Away";
    week[2][column + 1] = "Home";
    week[2][column + 2] = "Payout";
    week[4][column + (index % 2)] = 2;
    week[4][column + 2] = index % 2 ? 2 : -2;
    week[39][column + 2] = index % 2 ? 2 : -2;
    week[41][column + 2] = 10 - index;
    week[42][column + 2] = index + 1;
  }

  return [
    { sheetId: 10, title: "Week 0", index: 2, rawValues: week, formattedValues: formatted(week) },
    { sheetId: 11, title: "Scoreboard", index: 0, rawValues: scoreboard, formattedValues: formatted(scoreboard) },
    { sheetId: 12, title: "Weekly Earnings", index: 1, rawValues: earnings, formattedValues: formatted(earnings) },
  ];
}

test("normalizes workbook tabs in source order", () => {
  const workbook = normalizeWorkbook({ title: "Test", sheets: baseSheets() });
  assert.deepEqual(workbook.tabs.map((tab) => tab.title), ["Scoreboard", "Weekly Earnings", "Week 0"]);
  assert.deepEqual(workbook.tabs.map((tab) => tab.type), ["scoreboard", "earnings", "week"]);
  assert.deepEqual(validateWorkbook(workbook), []);
});

test("discovers bettor blocks and game picks structurally", () => {
  const workbook = normalizeWorkbook({ title: "Test", sheets: baseSheets(2) });
  const week = workbook.tabs.find((tab) => tab.type === "week");
  assert.equal(week.data.bettors.length, 2);
  assert.equal(week.data.games.length, 1);
  assert.equal(week.data.games[0].isGameOfTheWeek, true);
  assert.deepEqual(week.data.games[0].picks.map((pick) => pick.side), ["away", "home"]);
});

test("supports more bettors than the previous hard-coded limit", () => {
  const source = baseSheets(18);
  const weekSheet = source.find((sheet) => sheet.title === "Week 0");
  assert.equal(discoverBettorBlocks(weekSheet.rawValues, weekSheet.formattedValues).length, 18);
  const workbook = normalizeWorkbook({ title: "Test", sheets: source });
  assert.equal(workbook.tabs.find((tab) => tab.type === "week").data.bettors.length, 18);
});

test("validation reports a missing workbook contract", () => {
  const errors = validateWorkbook({ version: 1, tabs: [] });
  assert.ok(errors.some((error) => error.includes("No workbook tabs")));
  assert.ok(errors.some((error) => error.includes("Scoreboard")));
});
