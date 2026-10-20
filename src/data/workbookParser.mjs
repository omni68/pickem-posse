const WEEK_TAB_PATTERN = /^week\s+\d+$/i;
const POSTSEASON_TAB_PATTERN = /^(bowl week|wildcard|division|conference|super bowl)$/i;

function slugify(value) {
  return String(value || "sheet")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "sheet";
}

function columnName(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function trimMatrix(matrix = []) {
  const rows = matrix.map((row) => (Array.isArray(row) ? [...row] : []));
  while (rows.length && rows[rows.length - 1].every((value) => value == null || value === "")) {
    rows.pop();
  }

  let width = 0;
  rows.forEach((row) => {
    for (let index = row.length - 1; index >= 0; index -= 1) {
      if (row[index] != null && row[index] !== "") {
        width = Math.max(width, index + 1);
        break;
      }
    }
  });

  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null));
}

function matrixValue(matrix, row, column) {
  return matrix?.[row]?.[column] ?? null;
}

function cell(rawValues, formattedValues, row, column) {
  const raw = matrixValue(rawValues, row, column);
  const formatted = matrixValue(formattedValues, row, column);
  return {
    raw: raw ?? formatted ?? null,
    display: formatted == null ? (raw == null ? "" : String(raw)) : String(formatted),
  };
}

function isFilled(value) {
  if (value && typeof value === "object" && "display" in value) {
    return value.display !== "";
  }
  return value != null && value !== "";
}

function contiguousRows(formattedValues, startRow, keyColumn) {
  const rows = [];
  for (let row = startRow; row < formattedValues.length; row += 1) {
    if (!isFilled(matrixValue(formattedValues, row, keyColumn))) break;
    rows.push(row);
  }
  return rows;
}

function tabType(title) {
  if (title.toLowerCase() === "scoreboard") return "scoreboard";
  if (title.toLowerCase() === "weekly earnings") return "earnings";
  if (WEEK_TAB_PATTERN.test(title) || POSTSEASON_TAB_PATTERN.test(title)) return "week";
  return "sheet";
}

function parseScoreboard(rawValues, formattedValues) {
  const playerRows = contiguousRows(formattedValues, 3, 0);
  const players = playerRows.map((row) => ({
    row: row + 1,
    player: cell(rawValues, formattedValues, row, 0),
    amountPaid: cell(rawValues, formattedValues, row, 1),
    method: cell(rawValues, formattedValues, row, 2),
    quitter: cell(rawValues, formattedValues, row, 3),
    email: cell(rawValues, formattedValues, row, 4),
    payouts: cell(rawValues, formattedValues, row, 6),
    jackpotAllocation: cell(rawValues, formattedValues, row, 7),
    totalWinnings: cell(rawValues, formattedValues, row, 8),
    totalPayout: cell(rawValues, formattedValues, row, 9),
  }));

  const standings = [];
  for (let row = 3; row < formattedValues.length; row += 1) {
    const player = cell(rawValues, formattedValues, row, 16);
    if (!isFilled(player)) continue;
    standings.push({
      row: row + 1,
      player,
      totalPayout: cell(rawValues, formattedValues, row, 15),
    });
  }

  return {
    summary: {
      jackpotTotal: cell(rawValues, formattedValues, 1, 7),
      qualifiers: cell(rawValues, formattedValues, 1, 8),
      playerCount: players.length,
    },
    players,
    standings,
  };
}

function uniquePeriodLabels(columns) {
  const counts = new Map();
  return columns.map((column) => {
    const count = (counts.get(column.label) || 0) + 1;
    counts.set(column.label, count);
    return {
      ...column,
      label: count === 1 ? column.label : `${column.label} ${count}`,
      sourceLabel: column.label,
    };
  });
}

function parseEarnings(rawValues, formattedValues) {
  const columns = [];
  const width = Math.max(rawValues[0]?.length || 0, formattedValues[0]?.length || 0);
  for (let column = 3; column < width; column += 1) {
    const rowThreeLabel = matrixValue(formattedValues, 2, column);
    const rowTwoLabel = matrixValue(formattedValues, 1, column);
    const label = rowThreeLabel || rowTwoLabel;
    if (!isFilled(label)) continue;
    columns.push({
      column,
      columnName: columnName(column),
      key: `${slugify(label)}-${columnName(column).toLowerCase()}`,
      label: String(label),
    });
  }

  const periods = uniquePeriodLabels(columns);
  const bettorRows = contiguousRows(formattedValues, 3, 1);
  const bettors = bettorRows.map((row) => ({
    row: row + 1,
    rank: cell(rawValues, formattedValues, row, 0),
    player: cell(rawValues, formattedValues, row, 1),
    winnings: cell(rawValues, formattedValues, row, 2),
    periods: periods.map((period) => ({
      key: period.key,
      label: period.label,
      sourceLabel: period.sourceLabel,
      value: cell(rawValues, formattedValues, row, period.column),
    })),
  }));

  return { periods, bettors };
}

function discoverBettorBlocks(rawValues, formattedValues) {
  const width = Math.max(
    ...rawValues.map((row) => row.length),
    ...formattedValues.map((row) => row.length),
    0,
  );
  const blocks = [];
  for (let column = 0; column <= width - 3; column += 1) {
    const away = String(matrixValue(formattedValues, 2, column) || "").trim().toLowerCase();
    const home = String(matrixValue(formattedValues, 2, column + 1) || "").trim().toLowerCase();
    const payout = String(matrixValue(formattedValues, 2, column + 2) || "").trim().toLowerCase();
    const player = cell(rawValues, formattedValues, 1, column);
    if (away === "away" && home === "home" && payout === "payout" && isFilled(player)) {
      blocks.push({ column, player });
      column += 2;
    }
  }
  return blocks;
}

function parseWeek(rawValues, formattedValues, title) {
  const bettorBlocks = discoverBettorBlocks(rawValues, formattedValues);
  const gameRows = [];
  for (let row = 4; row < Math.min(formattedValues.length, 24); row += 1) {
    const away = cell(rawValues, formattedValues, row, 2);
    const home = cell(rawValues, formattedValues, row, 3);
    if (isFilled(away) && isFilled(home)) gameRows.push(row);
  }

  const firstGameRow = gameRows[0];
  const gameOfTheWeekMarker = firstGameRow == null
    ? ""
    : String(matrixValue(formattedValues, firstGameRow - 1, 0) || "").toLowerCase();

  const games = gameRows.map((row, gameIndex) => {
    const picks = bettorBlocks.map((block) => {
      const awayAmount = cell(rawValues, formattedValues, row, block.column);
      const homeAmount = cell(rawValues, formattedValues, row, block.column + 1);
      const awayNumber = Number(awayAmount.raw);
      const homeNumber = Number(homeAmount.raw);
      const side = Number.isFinite(awayNumber) && awayNumber !== 0
        ? "away"
        : Number.isFinite(homeNumber) && homeNumber !== 0
          ? "home"
          : null;
      return {
        bettor: block.player,
        side,
        awayAmount,
        homeAmount,
        payout: cell(rawValues, formattedValues, row, block.column + 2),
      };
    });

    return {
      row: row + 1,
      index: gameIndex,
      isGameOfTheWeek: row === firstGameRow && gameOfTheWeekMarker.includes("game of the week"),
      date: cell(rawValues, formattedValues, row, 0),
      time: cell(rawValues, formattedValues, row, 1),
      away: cell(rawValues, formattedValues, row, 2),
      home: cell(rawValues, formattedValues, row, 3),
      homeSpread: cell(rawValues, formattedValues, row, 4),
      favorite: cell(rawValues, formattedValues, row, 5),
      dollarsAway: cell(rawValues, formattedValues, row, 7),
      dollarsHome: cell(rawValues, formattedValues, row, 9),
      scoreAway: cell(rawValues, formattedValues, row, 11),
      scoreHome: cell(rawValues, formattedValues, row, 12),
      winner: cell(rawValues, formattedValues, row, 13),
      picks,
    };
  });

  const bettors = bettorBlocks.map((block) => ({
    player: block.player,
    column: columnName(block.column),
    totalBetsAway: cell(rawValues, formattedValues, 24, block.column),
    totalBetsHome: cell(rawValues, formattedValues, 24, block.column + 1),
    weeklyExposure: cell(rawValues, formattedValues, 26, block.column + 2),
    remainingExposure: cell(rawValues, formattedValues, 27, block.column + 2),
    currentWeek: cell(rawValues, formattedValues, 29, block.column + 2),
    jackpotContribution: cell(rawValues, formattedValues, 31, block.column + 2),
    awayPrediction: cell(rawValues, formattedValues, 33, block.column + 2),
    homePrediction: cell(rawValues, formattedValues, 34, block.column + 2),
    jackpotEarnings: cell(rawValues, formattedValues, 37, block.column + 2),
    currentWinnings: cell(rawValues, formattedValues, 39, block.column + 2),
    cumulativeWinnings: cell(rawValues, formattedValues, 41, block.column + 2),
    rank: cell(rawValues, formattedValues, 42, block.column + 2),
    cashCall: cell(rawValues, formattedValues, 43, block.column + 2),
  }));

  return {
    weekNumber: WEEK_TAB_PATTERN.test(title) ? Number(title.match(/\d+/)?.[0]) : null,
    games,
    bettors,
    summary: {
      jackpotTotal: cell(rawValues, formattedValues, 37, 11),
      awayPredictionLabel: cell(rawValues, formattedValues, 33, 11),
      homePredictionLabel: cell(rawValues, formattedValues, 34, 11),
    },
  };
}

function parseTab(sheet, usedSlugs) {
  const rawValues = trimMatrix(sheet.rawValues || []);
  const formattedValues = trimMatrix(sheet.formattedValues || sheet.rawValues || []);
  const type = tabType(sheet.title);
  const baseSlug = slugify(sheet.title);
  const duplicateCount = usedSlugs.get(baseSlug) || 0;
  usedSlugs.set(baseSlug, duplicateCount + 1);
  const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;

  let data = {};
  if (type === "scoreboard") data = parseScoreboard(rawValues, formattedValues);
  if (type === "earnings") data = parseEarnings(rawValues, formattedValues);
  if (type === "week") data = parseWeek(rawValues, formattedValues, sheet.title);

  return {
    id: String(sheet.sheetId ?? sheet.index ?? slug),
    title: sheet.title,
    slug,
    index: Number(sheet.index || 0),
    type,
    data,
    grid: formattedValues,
    dimensions: {
      rows: formattedValues.length,
      columns: Math.max(...formattedValues.map((row) => row.length), 0),
    },
  };
}

function normalizeWorkbook(source) {
  if (!source || !Array.isArray(source.sheets)) {
    throw new Error("Workbook source must include a sheets array.");
  }
  const usedSlugs = new Map();
  const sheets = [...source.sheets].sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
  const tabs = sheets.map((sheet) => parseTab(sheet, usedSlugs));

  return {
    version: 1,
    generatedAt: source.generatedAt || new Date().toISOString(),
    source: {
      spreadsheetId: source.spreadsheetId || "",
      title: source.title || "Pick'em Scoreboard",
      url: source.url || "",
      revision: source.revision == null ? null : String(source.revision),
      revisionCheckedAt: source.revisionCheckedAt || "",
    },
    tabs,
  };
}

function validateWorkbook(workbook) {
  const errors = [];
  if (workbook?.version !== 1) errors.push("Unsupported workbook version.");
  if (!Array.isArray(workbook?.tabs) || workbook.tabs.length === 0) errors.push("No workbook tabs were generated.");
  const slugs = new Set();
  for (const tab of workbook?.tabs || []) {
    if (!tab.title || !tab.slug) errors.push("Each tab needs a title and slug.");
    if (slugs.has(tab.slug)) errors.push(`Duplicate tab slug: ${tab.slug}`);
    slugs.add(tab.slug);
    if (!Array.isArray(tab.grid)) errors.push(`Tab ${tab.title} is missing its grid data.`);
  }
  if (!(workbook?.tabs || []).some((tab) => tab.type === "scoreboard")) errors.push("Scoreboard tab not found.");
  if (!(workbook?.tabs || []).some((tab) => tab.type === "earnings")) errors.push("Weekly Earnings tab not found.");
  if (!(workbook?.tabs || []).some((tab) => tab.type === "week")) errors.push("No weekly or postseason tabs were found.");
  return errors;
}

export {
  cell,
  columnName,
  discoverBettorBlocks,
  normalizeWorkbook,
  slugify,
  tabType,
  trimMatrix,
  validateWorkbook,
};
