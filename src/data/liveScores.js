import { gameStartTimestamp } from './formatters';

export const LIVE_SCORE_POLL_MS = 30_000;
export const SCHEDULED_SCORE_POLL_MS = 120_000;
export const ESPN_SPORTS = ['nfl', 'college-football'];

const CENTRAL_TIME_ZONE = 'America/Chicago';
const MATCH_THRESHOLD = 0.9;
const MATCH_MARGIN = 0.12;
const MAX_AUTOMATIC_KICKOFF_DIFFERENCE_MINUTES = 6 * 60;
const MAX_CANDIDATE_KICKOFF_DIFFERENCE_MINUTES = 36 * 60;

const cellText = (cell) => String(cell?.display || cell?.raw || '').trim();

export const normalizeTeamName = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/#\s*\d+/g, ' ')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

export const espnTeamAliases = (team = {}) => [...new Set([
  team.location,
  team.name,
  team.displayName,
  team.shortDisplayName,
  team.abbreviation,
].map(normalizeTeamName).filter(Boolean))];

const tokenSimilarity = (left, right) => {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return (2 * overlap) / (leftTokens.size + rightTokens.size);
};

const editSimilarity = (left, right) => {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return 1 - (previous[right.length] / Math.max(left.length, right.length));
};

export const teamMatchScore = (spreadsheetName, espnTeam) => {
  const source = normalizeTeamName(spreadsheetName);
  if (!source) return 0;

  return espnTeamAliases(espnTeam).reduce((best, alias) => {
    if (source === alias) return 1;

    let score = 0;
    const shorter = source.length <= alias.length ? source : alias;
    const longer = source.length > alias.length ? source : alias;
    if (shorter.length >= 4 && (` ${longer} `).includes(` ${shorter} `)) score = 0.92;

    const tokens = tokenSimilarity(source, alias);
    if (tokens >= 0.66) score = Math.max(score, 0.8 + (tokens * 0.12));

    const edits = editSimilarity(source, alias);
    if (Math.min(source.length, alias.length) >= 4 && edits >= 0.82) {
      score = Math.max(score, edits * 0.9);
    }
    return Math.max(best, score);
  }, 0);
};

const centralParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

export const centralWallTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const parts = centralParts(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
};

const dateKey = (timestamp) => {
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
};

export const scoreboardDatesForGames = (games = []) => {
  const dates = new Set();
  games.forEach((game) => {
    const timestamp = gameStartTimestamp(game.date, game.time);
    if (!Number.isFinite(timestamp)) return;
    [-1, 0, 1].forEach((offset) => dates.add(dateKey(timestamp + (offset * 24 * 60 * 60 * 1000))));
  });
  return [...dates].filter(Boolean).sort();
};

const eventKey = (event) => `${event.league}:${event.id}`;

export const normalizeEspnEvent = (event, league) => {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const away = competitors.find((competitor) => competitor.homeAway === 'away');
  const home = competitors.find((competitor) => competitor.homeAway === 'home');
  if (!event?.id || !away?.team || !home?.team) return null;

  const status = competition?.status || event.status || {};
  const statusType = status.type || {};
  const normalized = {
    id: String(event.id),
    league,
    startTime: event.date || competition?.date || '',
    away: { team: away.team, score: String(away.score ?? '') },
    home: { team: home.team, score: String(home.score ?? '') },
    status: {
      state: statusType.state || 'pre',
      completed: Boolean(statusType.completed),
      description: statusType.description || '',
      detail: statusType.detail || statusType.shortDetail || '',
      shortDetail: statusType.shortDetail || statusType.detail || '',
      period: Number(status.period || 0),
      displayClock: status.displayClock || '',
    },
  };
  return { ...normalized, key: eventKey(normalized) };
};

const kickoffScore = (differenceMinutes, spreadsheetStart, espnStart) => {
  if (differenceMinutes <= 15) return 1;
  if (differenceMinutes <= 90) return 0.9;
  if (differenceMinutes <= 360) return 0.75;
  if (dateKey(spreadsheetStart) === dateKey(espnStart)) return 0.55;
  if (differenceMinutes <= MAX_CANDIDATE_KICKOFF_DIFFERENCE_MINUTES) return 0.25;
  return 0;
};

export const scoreGameCandidate = (game, event) => {
  const spreadsheetStart = gameStartTimestamp(game.date, game.time);
  const espnStart = centralWallTimestamp(event.startTime);
  const kickoffDifferenceMinutes = Number.isFinite(spreadsheetStart) && Number.isFinite(espnStart)
    ? Math.abs(spreadsheetStart - espnStart) / 60_000
    : Number.POSITIVE_INFINITY;
  const awayScore = teamMatchScore(cellText(game.away), event.away.team);
  const homeScore = teamMatchScore(cellText(game.home), event.home.team);
  const timeScore = kickoffScore(kickoffDifferenceMinutes, spreadsheetStart, espnStart);
  const score = (awayScore * 0.4) + (homeScore * 0.4) + (timeScore * 0.2);

  return {
    event,
    score,
    awayScore,
    homeScore,
    timeScore,
    kickoffDifferenceMinutes,
    exactTeams: awayScore === 1 && homeScore === 1,
  };
};

export const matchGameToEvents = (game, events = []) => {
  const candidates = events
    .map((event) => scoreGameCandidate(game, event))
    .filter((candidate) => candidate.kickoffDifferenceMinutes <= MAX_CANDIDATE_KICKOFF_DIFFERENCE_MINUTES)
    .sort((left, right) => right.score - left.score || left.kickoffDifferenceMinutes - right.kickoffDifferenceMinutes);

  const top = candidates[0];
  const runnerUp = candidates[1];
  if (!top) return { status: 'unmatched', event: null, candidates: [] };

  const margin = runnerUp ? top.score - runnerUp.score : 1;
  const exactAndUnique = top.exactTeams
    && top.kickoffDifferenceMinutes <= MAX_AUTOMATIC_KICKOFF_DIFFERENCE_MINUTES
    && (!runnerUp?.exactTeams || margin >= MATCH_MARGIN);
  const highConfidence = top.score >= MATCH_THRESHOLD
    && top.awayScore >= 0.82
    && top.homeScore >= 0.82
    && margin >= MATCH_MARGIN;

  return {
    status: exactAndUnique || highConfidence ? 'automatic' : 'ambiguous',
    event: exactAndUnique || highConfidence ? top.event : null,
    bestCandidate: top,
    candidates: candidates.slice(0, 6),
    confidence: top.score,
    margin,
  };
};

export const gameFingerprint = (tab, game) => [
  tab?.id || tab?.slug || '',
  game?.row || game?.index || '',
  normalizeTeamName(cellText(game?.away)),
  normalizeTeamName(cellText(game?.home)),
  gameStartTimestamp(game?.date, game?.time),
].join('|');

export const confirmedEventIsValid = (game, event) => (
  Boolean(event)
  && teamMatchScore(cellText(game.away), event.away.team) >= 0.82
  && teamMatchScore(cellText(game.home), event.home.team) >= 0.82
);

export const fetchEspnScoreboards = async (games, { fetcher = fetch, signal } = {}) => {
  const dates = scoreboardDatesForGames(games);
  if (!dates.length) return [];

  const requests = ESPN_SPORTS.flatMap((league) => dates.map(async (date) => {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard?dates=${date}&limit=200`;
    const response = await fetcher(url, { signal });
    if (!response.ok) throw new Error(`ESPN ${league} scoreboard request failed (${response.status})`);
    const payload = await response.json();
    return (payload.events || []).map((event) => normalizeEspnEvent(event, league)).filter(Boolean);
  }));

  const results = await Promise.allSettled(requests);
  const successful = results.filter((result) => result.status === 'fulfilled');
  if (!successful.length) {
    const firstError = results.find((result) => result.status === 'rejected');
    throw firstError?.reason || new Error('Live scores are unavailable.');
  }

  const uniqueEvents = new Map();
  successful.forEach((result) => result.value.forEach((event) => uniqueEvents.set(event.key, event)));
  return [...uniqueEvents.values()];
};

export const formatEspnKickoff = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Kickoff TBD';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
};

export const liveStatusLabel = (event) => {
  if (!event) return '';
  if (event.status.state === 'in') return event.status.shortDetail || event.status.detail || 'Live';
  if (event.status.state === 'post' || event.status.completed) return 'Final';
  return event.status.shortDetail || event.status.detail || 'Scheduled';
};
