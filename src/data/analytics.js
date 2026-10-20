import { cellNumber, gameStartTimestamp } from './formatters';

const normalizedName = (value) => String(value || '').trim().toLowerCase();

const NFL_TEAM_ALIASES = new Set([
  'arizona', 'arizona cardinals',
  'atlanta', 'atlanta falcons',
  'baltimore', 'baltimore ravens',
  'buffalo', 'buffalo bills',
  'carolina', 'carolina panthers',
  'chicago', 'chicago bears',
  'cincinnati', 'cincinnati bengals',
  'cleveland', 'cleveland browns',
  'dallas', 'dallas cowboys',
  'denver', 'denver broncos',
  'detroit', 'detroit lions',
  'green bay', 'green bay packers',
  'houston', 'houston texans',
  'indianapolis', 'indianapolis colts',
  'jacksonville', 'jacksonville jaguars',
  'kansas city', 'kansas city chiefs',
  'las vegas', 'las vegas raiders',
  'la chargers', 'los angeles chargers',
  'la rams', 'los angeles rams',
  'miami', 'miami dolphins',
  'minnesota', 'minnesota vikings',
  'new england', 'new england patriots',
  'new orleans', 'new orleans saints',
  'ny giants', 'new york giants',
  'ny jets', 'new york jets',
  'philadelphia', 'philadelphia eagles',
  'pittsburgh', 'pittsburgh steelers',
  'san francisco', 'san francisco 49ers',
  'seattle', 'seattle seahawks',
  'tampa bay', 'tampa bay buccaneers',
  'tennessee', 'tennessee titans',
  'washington', 'washington commanders',
]);

const normalizedTeamName = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const teamCellName = (cell) => normalizedTeamName(cell?.display || cell?.raw);

export const footballLeagueForGame = (game) => {
  if (game?.league === 'nfl' || game?.league === 'college-football') return game.league;
  return NFL_TEAM_ALIASES.has(teamCellName(game?.away)) && NFL_TEAM_ALIASES.has(teamCellName(game?.home))
    ? 'nfl'
    : 'college-football';
};

const populatedNumber = (value) => {
  if (!value || (value.raw === '' && !value.display)) return null;
  return cellNumber(value);
};

export const rankSortedRows = (rows, metricKey) => {
  let rank = 0;
  let previousValue;

  return rows.map((row, index) => {
    const value = row[metricKey];
    if (index === 0 || !Object.is(value, previousValue)) rank = index + 1;
    previousValue = value;
    return { ...row, rank };
  });
};

export const metricLeaders = (rows, metricKey, { ascending = false, eligible = () => true } = {}) => {
  const candidates = rows.filter((row) => (
    eligible(row)
    && row[metricKey] != null
    && Number.isFinite(row[metricKey])
  ));
  if (!candidates.length) return { value: null, players: [] };

  const value = candidates.reduce((best, row) => (
    ascending ? Math.min(best, row[metricKey]) : Math.max(best, row[metricKey])
  ), ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

  return {
    value,
    players: candidates
      .filter((row) => Object.is(row[metricKey], value))
      .map((row) => row.player)
      .sort((left, right) => left.localeCompare(right)),
  };
};

export const buildPlayerAnalytics = (scoreboardTab, weekTabs = [], earningsTab = null) => {
  const metricsByPlayer = new Map();
  const streakEventsByPlayer = new Map();

  for (const player of scoreboardTab?.data?.players || []) {
    metricsByPlayer.set(normalizedName(player.player.display), {
      player: player.player.display,
      quitter: Boolean(player.quitter.display),
      totalPayout: cellNumber(player.totalPayout) || 0,
      totalEarnings: cellNumber(player.totalWinnings) || 0,
      amountPaid: cellNumber(player.amountPaid) || 0,
      returnOnAmountPaid: null,
      performanceVsField: null,
      comparisonPicks: 0,
      comparisonCorrectPicks: 0,
      fieldComparisonPicks: 0,
      fieldComparisonCorrectPicks: 0,
      contrarianWins: 0,
      contrarianPicks: 0,
      participationPicks: 0,
      participationOpportunities: 0,
      participationRate: null,
      exactScoreErrorTotal: 0,
      exactScorePredictionCount: 0,
      averageExactScoreError: null,
      longestHeater: 0,
      bestPayout: null,
      bestPayoutWeek: '',
      worstPayout: null,
      worstPayoutWeek: '',
      totalPicks: 0,
      correctPicks: 0,
      correctPickPercentage: null,
      nflTotalPicks: 0,
      nflCorrectPicks: 0,
      nflCorrectPickPercentage: null,
      cfbTotalPicks: 0,
      cfbCorrectPicks: 0,
      cfbCorrectPickPercentage: null,
      bestPickPercentage: null,
      bestPickWeek: '',
      bestWeekCorrectPicks: 0,
      bestWeekTotalPicks: 0,
      worstPickPercentage: null,
      worstPickWeek: '',
      worstWeekCorrectPicks: 0,
      worstWeekTotalPicks: 0,
      closestExactScore: null,
      closestExactScoreWeek: '',
      closestExactScoreAwayPrediction: null,
      closestExactScoreHomePrediction: null,
      closestExactScoreAwayActual: null,
      closestExactScoreHomeActual: null,
    });
  }

  for (const [tabIndex, tab] of weekTabs.entries()) {
    const weeklyMetrics = new Map();

    const featuredGame = (tab?.data?.games || []).find((game) => game.isGameOfTheWeek);
    const awayActual = populatedNumber(featuredGame?.scoreAway);
    const homeActual = populatedNumber(featuredGame?.scoreHome);
    const featuredGameIsFinal = Boolean(featuredGame?.winner?.display)
      && awayActual != null
      && homeActual != null;

    if (featuredGameIsFinal) {
      for (const bettor of tab?.data?.bettors || []) {
        const metrics = metricsByPlayer.get(normalizedName(bettor.player?.display));
        const awayPrediction = populatedNumber(bettor.awayPrediction);
        const homePrediction = populatedNumber(bettor.homePrediction);
        if (!metrics || awayPrediction == null || homePrediction == null) continue;

        const difference = Math.abs(awayPrediction - awayActual) + Math.abs(homePrediction - homeActual);
        metrics.exactScoreErrorTotal += difference;
        metrics.exactScorePredictionCount += 1;
        if (metrics.closestExactScore == null || difference < metrics.closestExactScore) {
          metrics.closestExactScore = difference;
          metrics.closestExactScoreWeek = tab.title;
          metrics.closestExactScoreAwayPrediction = awayPrediction;
          metrics.closestExactScoreHomePrediction = homePrediction;
          metrics.closestExactScoreAwayActual = awayActual;
          metrics.closestExactScoreHomeActual = homeActual;
        }
      }
    }

    const games = tab?.data?.games || [];
    for (const [gameIndex, game] of games.entries()) {
      const winner = normalizedName(game.winner?.display);
      const away = normalizedName(game.away?.display);
      const home = normalizedName(game.home?.display);
      const winningSide = winner && winner === away ? 'away' : winner && winner === home ? 'home' : null;
      const league = footballLeagueForGame(game);
      const validPicks = (game.picks || []).filter((pick) => (
        pick?.side
        && pick?.bettor?.display
        && metricsByPlayer.has(normalizedName(pick.bettor.display))
      ));
      const sideCounts = validPicks.reduce((counts, pick) => ({
        ...counts,
        [pick.side]: (counts[pick.side] || 0) + 1,
      }), {});

      for (const pick of validPicks) {
        const key = normalizedName(pick.bettor.display);
        const metrics = metricsByPlayer.get(key);
        metrics.totalPicks += 1;
        if (winningSide && pick.side === winningSide) metrics.correctPicks += 1;
        if (league === 'nfl') {
          metrics.nflTotalPicks += 1;
          if (winningSide && pick.side === winningSide) metrics.nflCorrectPicks += 1;
        } else {
          metrics.cfbTotalPicks += 1;
          if (winningSide && pick.side === winningSide) metrics.cfbCorrectPicks += 1;
        }

        const week = weeklyMetrics.get(key) || { totalPicks: 0, correctPicks: 0 };
        week.totalPicks += 1;
        if (winningSide && pick.side === winningSide) week.correctPicks += 1;
        weeklyMetrics.set(key, week);

        if (!winningSide) continue;

        const correct = pick.side === winningSide;
        const otherPicks = validPicks.filter((candidate) => normalizedName(candidate.bettor.display) !== key);
        if (otherPicks.length) {
          metrics.comparisonPicks += 1;
          if (correct) metrics.comparisonCorrectPicks += 1;
          metrics.fieldComparisonPicks += otherPicks.length;
          metrics.fieldComparisonCorrectPicks += otherPicks.filter((candidate) => candidate.side === winningSide).length;
        }

        if ((sideCounts[pick.side] || 0) / validPicks.length < 0.5) {
          metrics.contrarianPicks += 1;
          if (correct) metrics.contrarianWins += 1;
        }

        const streakEvents = streakEventsByPlayer.get(key) || [];
        streakEvents.push({
          correct,
          start: gameStartTimestamp(game.date, game.time),
          fallbackOrder: (tabIndex * 1000) + gameIndex,
        });
        streakEventsByPlayer.set(key, streakEvents);
      }
    }

    for (const [key, week] of weeklyMetrics) {
      const metrics = metricsByPlayer.get(key);
      const percentage = (week.correctPicks / week.totalPicks) * 100;
      metrics.participationPicks += week.totalPicks;
      metrics.participationOpportunities += games.length;

      if (metrics.bestPickPercentage == null || percentage > metrics.bestPickPercentage) {
        metrics.bestPickPercentage = percentage;
        metrics.bestPickWeek = tab.title;
        metrics.bestWeekCorrectPicks = week.correctPicks;
        metrics.bestWeekTotalPicks = week.totalPicks;
      }

      if (metrics.worstPickPercentage == null || percentage < metrics.worstPickPercentage) {
        metrics.worstPickPercentage = percentage;
        metrics.worstPickWeek = tab.title;
        metrics.worstWeekCorrectPicks = week.correctPicks;
        metrics.worstWeekTotalPicks = week.totalPicks;
      }
    }
  }

  for (const [key, events] of streakEventsByPlayer) {
    const metrics = metricsByPlayer.get(key);
    let currentStreak = 0;
    events
      .sort((left, right) => (left.start - right.start) || (left.fallbackOrder - right.fallbackOrder))
      .forEach((event) => {
        currentStreak = event.correct ? currentStreak + 1 : 0;
        metrics.longestHeater = Math.max(metrics.longestHeater, currentStreak);
      });
  }

  for (const bettor of earningsTab?.data?.bettors || []) {
    const metrics = metricsByPlayer.get(normalizedName(bettor.player?.display));
    if (!metrics) continue;

    for (const period of bettor.periods || []) {
      if (period.value?.raw === '' && !period.value?.display) continue;
      const payout = cellNumber(period.value);
      if (payout == null) continue;

      if (metrics.bestPayout == null || payout > metrics.bestPayout) {
        metrics.bestPayout = payout;
        metrics.bestPayoutWeek = period.label;
      }

      if (metrics.worstPayout == null || payout < metrics.worstPayout) {
        metrics.worstPayout = payout;
        metrics.worstPayoutWeek = period.label;
      }
    }
  }

  return [...metricsByPlayer.values()].map((metrics) => {
    const playerComparisonPercentage = metrics.comparisonPicks
      ? (metrics.comparisonCorrectPicks / metrics.comparisonPicks) * 100
      : null;
    const fieldComparisonPercentage = metrics.fieldComparisonPicks
      ? (metrics.fieldComparisonCorrectPicks / metrics.fieldComparisonPicks) * 100
      : null;

    return {
      ...metrics,
      correctPickPercentage: metrics.totalPicks
        ? (metrics.correctPicks / metrics.totalPicks) * 100
        : null,
      nflCorrectPickPercentage: metrics.nflTotalPicks
        ? (metrics.nflCorrectPicks / metrics.nflTotalPicks) * 100
        : null,
      cfbCorrectPickPercentage: metrics.cfbTotalPicks
        ? (metrics.cfbCorrectPicks / metrics.cfbTotalPicks) * 100
        : null,
      returnOnAmountPaid: metrics.amountPaid
        ? (metrics.totalEarnings / metrics.amountPaid) * 100
        : null,
      performanceVsField: playerComparisonPercentage == null || fieldComparisonPercentage == null
        ? null
        : playerComparisonPercentage - fieldComparisonPercentage,
      playerComparisonPercentage,
      fieldComparisonPercentage,
      participationRate: metrics.participationOpportunities
        ? (metrics.participationPicks / metrics.participationOpportunities) * 100
        : null,
      averageExactScoreError: metrics.exactScorePredictionCount
        ? metrics.exactScoreErrorTotal / metrics.exactScorePredictionCount
        : null,
    };
  });
};
