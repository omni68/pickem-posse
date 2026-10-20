import {
  centralWallTimestamp,
  confirmedEventIsValid,
  espnTeamAliases,
  fetchEspnScoreboards,
  formatEspnKickoff,
  liveStatusLabel,
  matchGameToEvents,
  normalizeTeamName,
  scoreboardDatesForGames,
  teamMatchScore,
} from './liveScores';

const cell = (raw) => ({ raw, display: raw === '' ? '' : String(raw) });
const team = (location, name, abbreviation) => ({
  location,
  name,
  abbreviation,
  displayName: `${location} ${name}`,
  shortDisplayName: location,
});

const game = {
  row: 14,
  date: cell('2026-10-18T00:00:00.000Z'),
  time: cell('1899-12-30T12:00:00.000Z'),
  away: cell('Baltimore'),
  home: cell('Cleveland'),
  winner: cell(''),
};

const event = (id, away, home, startTime = '2026-10-18T17:00:00.000Z') => ({
  id,
  key: `nfl:${id}`,
  league: 'nfl',
  startTime,
  away: { team: away, score: '10' },
  home: { team: home, score: '13' },
  status: { state: 'post', completed: true, shortDetail: 'Final' },
});

test('normalizes spreadsheet names and builds aliases entirely from ESPN team fields', () => {
  const ravens = team('Baltimore', 'Ravens', 'BAL');
  expect(normalizeTeamName('#12  Texas Tech')).toBe('texas tech');
  expect(espnTeamAliases(ravens)).toEqual(expect.arrayContaining(['baltimore', 'ravens', 'baltimore ravens', 'bal']));
  expect(teamMatchScore('Baltimore', ravens)).toBe(1);
  expect(teamMatchScore('Baltimore Ravens', ravens)).toBe(1);
});

test('compares ESPN UTC kickoffs as Central wall-clock values', () => {
  expect(centralWallTimestamp('2026-10-18T17:00:00.000Z')).toBe(Date.UTC(2026, 9, 18, 12, 0));
  expect(scoreboardDatesForGames([game])).toEqual(['20261017', '20261018', '20261019']);
  expect(formatEspnKickoff('2026-10-18T17:00:00.000Z')).toBe('Sun Oct 18, 2026 @ 12pm CDT');
});

test('does not display ESPN scheduled timestamps in their source timezone', () => {
  expect(liveStatusLabel({
    status: { state: 'pre', shortDetail: '10/22 - 8:15 PM EDT' },
  })).toBe('Scheduled');
});

test('automatically matches a unique date, away team, and home team', () => {
  const ravens = team('Baltimore', 'Ravens', 'BAL');
  const browns = team('Cleveland', 'Browns', 'CLE');
  const result = matchGameToEvents(game, [
    event('correct', ravens, browns),
    event('other', team('Buffalo', 'Bills', 'BUF'), team('Cleveland', 'Browns', 'CLE')),
  ]);

  expect(result.status).toBe('automatic');
  expect(result.event.id).toBe('correct');
  expect(confirmedEventIsValid(game, result.event)).toBe(true);
});

test('requires confirmation when two candidates are equally plausible', () => {
  const ravens = team('Baltimore', 'Ravens', 'BAL');
  const browns = team('Cleveland', 'Browns', 'CLE');
  const result = matchGameToEvents(game, [
    event('one', ravens, browns),
    event('two', ravens, browns),
  ]);

  expect(result.status).toBe('ambiguous');
  expect(result.event).toBeNull();
  expect(result.candidates).toHaveLength(2);
});

test('invalidates a confirmed event when the spreadsheet matchup changes', () => {
  const selected = event(
    'selected',
    team('Baltimore', 'Ravens', 'BAL'),
    team('Cleveland', 'Browns', 'CLE'),
  );
  const changedGame = { ...game, home: cell('Pittsburgh') };
  expect(confirmedEventIsValid(changedGame, selected)).toBe(false);
});

test('keeps successful scoreboard data when one ESPN source fails', async () => {
  const rawEvent = {
    id: '401872997',
    date: '2026-10-18T17:00:00.000Z',
    status: { type: { state: 'post', completed: true } },
    competitions: [{ competitors: [
      { homeAway: 'away', score: '10', team: team('Baltimore', 'Ravens', 'BAL') },
      { homeAway: 'home', score: '13', team: team('Cleveland', 'Browns', 'CLE') },
    ] }],
  };
  const fetcher = jest.fn((url) => {
    if (url.includes('/college-football/')) return Promise.reject(new Error('College feed unavailable'));
    return Promise.resolve({ ok: true, json: async () => ({ events: [rawEvent] }) });
  });

  const events = await fetchEspnScoreboards([game], { fetcher });
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ key: 'nfl:401872997', league: 'nfl' });
});

test('reports an error when every ESPN request fails', async () => {
  const fetcher = jest.fn().mockRejectedValue(new Error('Offline'));
  await expect(fetchEspnScoreboards([game], { fetcher })).rejects.toThrow('Offline');
});
