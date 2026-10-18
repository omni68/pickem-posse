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
        { player: cell('Alex'), quitter: cell(''), totalWinnings: cell(100), totalPayout: cell(200) },
        { player: cell('Bailey'), quitter: cell('Yes'), totalWinnings: cell(50), totalPayout: cell(125) },
        { player: cell('Casey'), quitter: cell(''), totalWinnings: cell(0), totalPayout: cell(75) },
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
  expect(analytics.find((player) => player.player === 'Alex')).toMatchObject({ totalPayout: 200, totalEarnings: 100, totalPicks: 2, correctPicks: 1, correctPickPercentage: 50 });
  expect(analytics.find((player) => player.player === 'Bailey')).toMatchObject({ quitter: true, totalPicks: 1, correctPicks: 1, correctPickPercentage: 100 });
  expect(analytics.find((player) => player.player === 'Casey')).toMatchObject({ totalPicks: 0, correctPickPercentage: null });
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
