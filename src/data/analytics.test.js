import { buildPlayerAnalytics, rankSortedRows } from './analytics';

const cell = (raw) => ({ raw, display: raw === '' ? '' : String(raw) });

test('uses competition ranking for tied values across any metric', () => {
  const descending = rankSortedRows([
    { player: 'Clark', score: 100 },
    { player: 'Josh', score: 100 },
    { player: 'Joseph', score: 90 },
    { player: 'Alex', score: 80 },
    { player: 'Bailey', score: 80 },
  ], 'score');
  expect(descending.map(({ rank }) => rank)).toEqual([1, 1, 3, 4, 4]);

  const ascending = rankSortedRows([
    { player: 'Clark', payout: -20 },
    { player: 'Josh', payout: -20 },
    { player: 'Joseph', payout: 0 },
  ], 'payout');
  expect(ascending.map(({ rank }) => rank)).toEqual([1, 1, 3]);
});

test('calculates individualized ATS accuracy using each player’s actual pick count', () => {
  const scoreboard = {
    data: {
      players: [
        { player: cell('Alex'), quitter: cell(''), amountPaid: cell(150), totalWinnings: cell(100), totalPayout: cell(200) },
        { player: cell('Bailey'), quitter: cell('Yes'), amountPaid: cell(100), totalWinnings: cell(50), totalPayout: cell(125) },
        { player: cell('Casey'), quitter: cell(''), amountPaid: cell(''), totalWinnings: cell(0), totalPayout: cell(75) },
      ],
    },
  };
  const weeks = [{
    data: {
      games: [
        {
          away: cell('Away A'), home: cell('Home A'), winner: cell('Away A'),
          picks: [
            { bettor: cell('Alex'), side: 'away' },
            { bettor: cell('Bailey'), side: 'away' },
          ],
        },
        {
          away: cell('Away B'), home: cell('Home B'), winner: cell('Home B'),
          picks: [{ bettor: cell('Alex'), side: 'away' }],
        },
      ],
    },
  }];

  const analytics = buildPlayerAnalytics(scoreboard, weeks);
  expect(analytics.find((player) => player.player === 'Alex')).toMatchObject({ amountPaid: 150, totalPayout: 200, totalEarnings: 100, totalPicks: 2, correctPicks: 1, correctPickPercentage: 50 });
  expect(analytics.find((player) => player.player === 'Bailey')).toMatchObject({ amountPaid: 100, quitter: true, totalPicks: 1, correctPicks: 1, correctPickPercentage: 100 });
  expect(analytics.find((player) => player.player === 'Casey')).toMatchObject({ amountPaid: 0, totalPicks: 0, correctPickPercentage: null });
});

test('finds each player’s best and worst single-week pick percentages', () => {
  const scoreboard = {
    data: {
      players: [
        { player: cell('Alex'), quitter: cell(''), totalWinnings: cell(100), totalPayout: cell(200) },
        { player: cell('Bailey'), quitter: cell(''), totalWinnings: cell(50), totalPayout: cell(125) },
      ],
    },
  };
  const weeks = [
    {
      title: 'Week 1',
      data: {
        games: [{
          away: cell('Away A'), home: cell('Home A'), winner: cell('Away A'),
          picks: [
            { bettor: cell('Alex'), side: 'away' },
            { bettor: cell('Bailey'), side: 'home' },
          ],
        }],
      },
    },
    {
      title: 'Week 2',
      data: {
        games: [
          {
            away: cell('Away B'), home: cell('Home B'), winner: cell('Home B'),
            picks: [
              { bettor: cell('Alex'), side: 'home' },
              { bettor: cell('Bailey'), side: 'home' },
            ],
          },
          {
            away: cell('Away C'), home: cell('Home C'), winner: cell('Away C'),
            picks: [
              { bettor: cell('Alex'), side: 'home' },
              { bettor: cell('Bailey'), side: 'away' },
            ],
          },
        ],
      },
    },
  ];

  const analytics = buildPlayerAnalytics(scoreboard, weeks);
  expect(analytics.find((player) => player.player === 'Alex')).toMatchObject({
    bestPickPercentage: 100,
    bestPickWeek: 'Week 1',
    bestWeekCorrectPicks: 1,
    bestWeekTotalPicks: 1,
    worstPickPercentage: 50,
    worstPickWeek: 'Week 2',
    worstWeekCorrectPicks: 1,
    worstWeekTotalPicks: 2,
  });
  expect(analytics.find((player) => player.player === 'Bailey')).toMatchObject({
    bestPickPercentage: 100,
    bestPickWeek: 'Week 2',
    worstPickPercentage: 0,
    worstPickWeek: 'Week 1',
  });
});

test('finds each player’s best and worst weekly payouts and ignores empty periods', () => {
  const scoreboard = {
    data: {
      players: [
        { player: cell('Alex'), quitter: cell(''), totalWinnings: cell(100), totalPayout: cell(200) },
        { player: cell('Bailey'), quitter: cell(''), totalWinnings: cell(50), totalPayout: cell(125) },
      ],
    },
  };
  const earnings = {
    data: {
      bettors: [
        {
          player: cell('Alex'),
          periods: [
            { label: 'Week 1', value: cell(-20) },
            { label: 'Week 2', value: cell(40) },
            { label: 'Week 3', value: cell('') },
          ],
        },
        {
          player: cell('Bailey'),
          periods: [
            { label: 'Week 1', value: cell(0) },
            { label: 'Week 2', value: cell(-10) },
          ],
        },
      ],
    },
  };

  const analytics = buildPlayerAnalytics(scoreboard, [], earnings);
  expect(analytics.find((player) => player.player === 'Alex')).toMatchObject({
    bestPayout: 40,
    bestPayoutWeek: 'Week 2',
    worstPayout: -20,
    worstPayoutWeek: 'Week 1',
  });
  expect(analytics.find((player) => player.player === 'Bailey')).toMatchObject({
    bestPayout: 0,
    bestPayoutWeek: 'Week 1',
    worstPayout: -10,
    worstPayoutWeek: 'Week 2',
  });
});

test('finds each player’s closest finalized Game-of-the-Week score prediction', () => {
  const scoreboard = {
    data: {
      players: [
        { player: cell('Alex'), quitter: cell(''), totalWinnings: cell(0), totalPayout: cell(0) },
        { player: cell('Bailey'), quitter: cell(''), totalWinnings: cell(0), totalPayout: cell(0) },
        { player: cell('Casey'), quitter: cell(''), totalWinnings: cell(0), totalPayout: cell(0) },
      ],
    },
  };
  const weeks = [
    {
      title: 'Week 1',
      data: {
        games: [{ isGameOfTheWeek: true, winner: cell('Away'), scoreAway: cell(21), scoreHome: cell(17), picks: [] }],
        bettors: [
          { player: cell('Alex'), awayPrediction: cell(20), homePrediction: cell(17) },
          { player: cell('Bailey'), awayPrediction: cell(14), homePrediction: cell(10) },
          { player: cell('Casey'), awayPrediction: cell(''), homePrediction: cell('') },
        ],
      },
    },
    {
      title: 'Week 2',
      data: {
        games: [{ isGameOfTheWeek: true, winner: cell('Home'), scoreAway: cell(30), scoreHome: cell(27), picks: [] }],
        bettors: [
          { player: cell('Alex'), awayPrediction: cell(28), homePrediction: cell(24) },
          { player: cell('Bailey'), awayPrediction: cell(29), homePrediction: cell(27) },
        ],
      },
    },
    {
      title: 'Week 3',
      data: {
        games: [{ isGameOfTheWeek: true, winner: cell(''), scoreAway: cell(''), scoreHome: cell(''), picks: [] }],
        bettors: [{ player: cell('Alex'), awayPrediction: cell(0), homePrediction: cell(0) }],
      },
    },
  ];

  const analytics = buildPlayerAnalytics(scoreboard, weeks);
  expect(analytics.find((player) => player.player === 'Alex')).toMatchObject({
    closestExactScore: 1,
    closestExactScoreWeek: 'Week 1',
    closestExactScoreAwayPrediction: 20,
    closestExactScoreHomePrediction: 17,
    closestExactScoreAwayActual: 21,
    closestExactScoreHomeActual: 17,
  });
  expect(analytics.find((player) => player.player === 'Bailey')).toMatchObject({
    closestExactScore: 1,
    closestExactScoreWeek: 'Week 2',
  });
  expect(analytics.find((player) => player.player === 'Casey')).toMatchObject({
    closestExactScore: null,
  });
});

test('calculates ROI, field performance, contrarian wins, participation, exact-score average, and heaters', () => {
  const scoreboard = {
    data: {
      players: [
        { player: cell('Alex'), quitter: cell(''), amountPaid: cell(100), totalWinnings: cell(50), totalPayout: cell(150) },
        { player: cell('Bailey'), quitter: cell(''), amountPaid: cell(200), totalWinnings: cell(-20), totalPayout: cell(180) },
        { player: cell('Casey'), quitter: cell(''), amountPaid: cell(0), totalWinnings: cell(0), totalPayout: cell(0) },
      ],
    },
  };
  const game = (date, away, home, winner, picks, extra = {}) => ({
    date: cell(date),
    time: cell('1899-12-30T12:00:00.000Z'),
    away: cell(away),
    home: cell(home),
    winner: cell(winner),
    picks: picks.map(([player, side]) => ({ bettor: cell(player), side })),
    ...extra,
  });
  const weeks = [
    {
      title: 'Week 1',
      data: {
        games: [
          game('2026-09-01T00:00:00.000Z', 'Away A', 'Home A', 'Away A', [['Alex', 'away'], ['Bailey', 'home']], {
            isGameOfTheWeek: true,
            scoreAway: cell(21),
            scoreHome: cell(17),
          }),
          game('2026-09-02T00:00:00.000Z', 'Away B', 'Home B', 'Home B', [['Alex', 'away'], ['Bailey', 'home'], ['Casey', 'away']]),
          game('2026-09-03T00:00:00.000Z', 'Away C', 'Home C', '', [['Alex', 'away'], ['Casey', 'away']]),
        ],
        bettors: [
          { player: cell('Alex'), awayPrediction: cell(20), homePrediction: cell(17) },
          { player: cell('Bailey'), awayPrediction: cell(14), homePrediction: cell(10) },
          { player: cell('Casey'), awayPrediction: cell(''), homePrediction: cell('') },
        ],
      },
    },
    {
      title: 'Week 2',
      data: {
        games: [
          game('2026-09-08T00:00:00.000Z', 'Away D', 'Home D', 'Away D', [['Alex', 'away'], ['Bailey', 'away'], ['Casey', 'home']], {
            isGameOfTheWeek: true,
            scoreAway: cell(30),
            scoreHome: cell(27),
          }),
          game('2026-09-09T00:00:00.000Z', 'Away E', 'Home E', 'Home E', [['Alex', 'home'], ['Bailey', 'away'], ['Casey', 'home']]),
        ],
        bettors: [
          { player: cell('Alex'), awayPrediction: cell(28), homePrediction: cell(24) },
          { player: cell('Bailey'), awayPrediction: cell(29), homePrediction: cell(27) },
          { player: cell('Casey'), awayPrediction: cell(31), homePrediction: cell(28) },
        ],
      },
    },
  ];

  const analytics = buildPlayerAnalytics(scoreboard, weeks);
  const alex = analytics.find((player) => player.player === 'Alex');
  const bailey = analytics.find((player) => player.player === 'Bailey');
  const casey = analytics.find((player) => player.player === 'Casey');

  expect(alex).toMatchObject({
    returnOnAmountPaid: 50,
    contrarianWins: 0,
    participationPicks: 5,
    participationOpportunities: 5,
    participationRate: 100,
    averageExactScoreError: 3,
    exactScorePredictionCount: 2,
    longestHeater: 2,
  });
  expect(alex.performanceVsField).toBeCloseTo(32.142857);

  expect(bailey).toMatchObject({
    returnOnAmountPaid: -10,
    contrarianWins: 1,
    contrarianPicks: 2,
    participationPicks: 4,
    participationOpportunities: 5,
    participationRate: 80,
    averageExactScoreError: 7.5,
    longestHeater: 2,
  });
  expect(bailey.performanceVsField).toBeCloseTo(-7.142857);

  expect(casey).toMatchObject({
    returnOnAmountPaid: null,
    participationRate: 80,
    averageExactScoreError: 2,
    exactScorePredictionCount: 1,
    longestHeater: 1,
  });
  expect(casey.performanceVsField).toBeCloseTo(-33.333333);
});
