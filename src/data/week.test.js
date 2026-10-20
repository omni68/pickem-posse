import {
  atsCoveringSide,
  atsSideOutcomes,
  atsSpreads,
  exactScoreWinners,
  jackpotRolloverWeeks,
  missingPlayersForGame,
  sortGamesByStatusAndStart,
  weeklyPlayerCount,
  weeklyPlayersWithPicks,
} from './week';

const cell = (raw) => ({ raw, display: raw === '' ? '' : String(raw) });

const week = (id, predictions, finalScore = [21, 17]) => ({
  id,
  type: 'week',
  data: {
    games: [{
      isGameOfTheWeek: true,
      winner: cell('Away'),
      scoreAway: cell(finalScore[0]),
      scoreHome: cell(finalScore[1]),
    }],
    bettors: predictions.map(([name, away, home]) => ({
      player: cell(name),
      awayPrediction: cell(away),
      homePrediction: cell(home),
      jackpotEarnings: cell(''),
    })),
  },
});

test('calculates the potential ATS win and loss for each side', () => {
  expect(atsSideOutcomes({ dollarsAway: cell(18), dollarsHome: cell(10) })).toEqual({
    away: { win: 10, lose: -10 },
    home: { win: 18, lose: -18 },
  });
});

test('shows inverse signed spreads for both teams and EVEN for a pick-em', () => {
  expect(atsSpreads(cell(3.5))).toEqual({ away: '-3.5', home: '+3.5' });
  expect(atsSpreads(cell(-14.5))).toEqual({ away: '+14.5', home: '-14.5' });
  expect(atsSpreads(cell(0))).toEqual({ away: 'EVEN', home: 'EVEN' });
  expect(atsSpreads(cell(''))).toEqual({ away: '—', home: '—' });
});

test('identifies the team currently covering from the live score and home spread', () => {
  const game = {
    away: cell('Baltimore'),
    home: cell('Cleveland'),
    homeSpread: cell(-3.5),
    winner: cell(''),
  };
  expect(atsCoveringSide(game, { awayScore: 17, homeScore: 20 })).toBe('away');
  expect(atsCoveringSide(game, { awayScore: 16, homeScore: 20 })).toBe('home');
});

test('uses the spreadsheet winner for final games and leaves pushes unhighlighted', () => {
  const game = {
    away: cell('Baltimore'),
    home: cell('Cleveland'),
    homeSpread: cell(-3),
    scoreAway: cell(20),
    scoreHome: cell(20),
  };
  expect(atsCoveringSide({ ...game, winner: cell('Cleveland') })).toBe('home');
  expect(atsCoveringSide({ ...game, winner: cell('PUSH') })).toBeNull();
});

test('sorts pending games first and orders each status chronologically', () => {
  const games = [
    { row: 1, date: cell('2026-10-17T00:00:00Z'), time: cell('1899-12-30T13:00:00Z'), winner: cell('Final A') },
    { row: 2, date: cell('2026-10-18T00:00:00Z'), time: cell('1899-12-30T18:00:00Z'), winner: cell('') },
    { row: 3, date: cell('2026-10-18T00:00:00Z'), time: cell('1899-12-30T14:00:00Z'), winner: cell('') },
    { row: 4, date: cell('2026-10-16T00:00:00Z'), time: cell('1899-12-30T19:00:00Z'), winner: cell('Final B') },
  ];

  expect(sortGamesByStatusAndStart(games).map((game) => game.row)).toEqual([3, 2, 4, 1]);
  expect(games.map((game) => game.row)).toEqual([1, 2, 3, 4]);
});

test('counts only unique players who made at least one pick that week', () => {
  const games = [
    {
      picks: [
        { bettor: cell('Alex'), side: 'away' },
        { bettor: cell('Bailey'), side: null },
        { bettor: cell('Casey'), side: 'home' },
      ],
    },
    {
      picks: [
        { bettor: cell('Alex'), side: 'home' },
        { bettor: cell('Bailey'), side: '' },
        { bettor: cell('casey'), side: 'away' },
      ],
    },
  ];

  expect(weeklyPlayerCount(games)).toBe(2);
  expect(weeklyPlayersWithPicks(games)).toEqual(['Alex', 'Casey']);
  expect(missingPlayersForGame(games[0], ['Alex', 'Bailey', 'Casey'])).toEqual(['Bailey']);
});

test('finds every bettor with the exact Game-of-the-Week score', () => {
  const tab = week('2', [['Alex', 21, 17], ['Bailey', 20, 17], ['Casey', 21, 17]]);
  expect(exactScoreWinners(tab).map((bettor) => bettor.player.display)).toEqual(['Alex', 'Casey']);
});

test('counts consecutive jackpot weeks since the last exact-score winner', () => {
  const weekZero = week('0', [['Alex', 21, 17]]);
  const weekOne = week('1', [['Alex', 10, 7]]);
  const weekTwo = week('2', [['Alex', 14, 10]]);
  const workbook = { tabs: [weekTwo, weekOne, weekZero] };

  expect(jackpotRolloverWeeks(workbook, weekTwo)).toBe(2);
});
