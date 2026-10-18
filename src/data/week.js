import { cellNumber, gameStartTimestamp } from './formatters';

const positiveAmount = (value) => {
  const amount = cellNumber(value);
  return amount == null ? null : Math.abs(amount);
};

const negativeAmount = (value) => {
  const amount = positiveAmount(value);
  return amount == null ? null : (amount === 0 ? 0 : -amount);
};

export const atsSideOutcomes = (game) => ({
  away: {
    win: positiveAmount(game?.dollarsHome),
    lose: negativeAmount(game?.dollarsHome),
  },
  home: {
    win: positiveAmount(game?.dollarsAway),
    lose: negativeAmount(game?.dollarsAway),
  },
});

const signedSpread = (value) => (value > 0 ? `+${value}` : String(value));

export const atsSpreads = (homeSpread) => {
  if (!homeSpread || (homeSpread.raw === '' && !homeSpread.display)) return { away: '—', home: '—' };
  const home = cellNumber(homeSpread);
  if (home == null) return { away: '—', home: '—' };
  if (home === 0) return { away: 'EVEN', home: 'EVEN' };
  return {
    away: signedSpread(-home),
    home: signedSpread(home),
  };
};

const comparableTeamName = (value) => {
  const source = value && typeof value === 'object' ? (value.display || value.raw || '') : value;
  return String(source || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const scoreNumber = (value) => {
  const raw = value?.raw ?? value;
  if (raw === '' || raw == null) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
};

export const atsCoveringSide = (game, scores = {}) => {
  const recordedWinner = comparableTeamName(game?.winner);
  if (recordedWinner) {
    if (recordedWinner === comparableTeamName(game?.away)) return 'away';
    if (recordedWinner === comparableTeamName(game?.home)) return 'home';
    return null;
  }

  const awayScore = scoreNumber(scores.awayScore ?? game?.scoreAway);
  const homeScore = scoreNumber(scores.homeScore ?? game?.scoreHome);
  const homeSpread = scoreNumber(game?.homeSpread);
  if (awayScore == null || homeScore == null || homeSpread == null) return null;

  const adjustedHomeScore = homeScore + homeSpread;
  if (awayScore > adjustedHomeScore) return 'away';
  if (awayScore < adjustedHomeScore) return 'home';
  return null;
};

export const sortGamesByStatusAndStart = (games = []) => [...games].sort((left, right) => {
  const statusDifference = Number(Boolean(left.winner?.display)) - Number(Boolean(right.winner?.display));
  if (statusDifference !== 0) return statusDifference;

  const leftStart = gameStartTimestamp(left.date, left.time);
  const rightStart = gameStartTimestamp(right.date, right.time);
  if (leftStart !== rightStart) return leftStart - rightStart;

  return (left.index ?? left.row ?? 0) - (right.index ?? right.row ?? 0);
});

export const gameOfTheWeek = (tab) => tab?.data?.games?.find((game) => game.isGameOfTheWeek);

export const exactScoreWinners = (tab) => {
  const game = gameOfTheWeek(tab);
  if (!game || !game.winner?.display) return [];
  const awayScore = cellNumber(game.scoreAway);
  const homeScore = cellNumber(game.scoreHome);
  if (awayScore == null || homeScore == null) return [];

  return (tab.data.bettors || []).filter((bettor) => {
    const recordedWinner = (cellNumber(bettor.jackpotEarnings) || 0) > 0;
    const exactPrediction = cellNumber(bettor.awayPrediction) === awayScore
      && cellNumber(bettor.homePrediction) === homeScore;
    return recordedWinner || exactPrediction;
  });
};

export const jackpotRolloverWeeks = (workbook, currentTab) => {
  const chronologicalTabs = (workbook?.tabs || []).filter((tab) => tab.type === 'week').reverse();
  const currentIndex = chronologicalTabs.findIndex((tab) => tab.id === currentTab.id);
  if (currentIndex < 0) return 1;

  let weeks = 1;
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (exactScoreWinners(chronologicalTabs[index]).length) break;
    weeks += 1;
  }
  return weeks;
};
