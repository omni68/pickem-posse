import { cellNumber } from './formatters';

const normalizedName = (value) => String(value || '').trim().toLowerCase();

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

export const buildPlayerAnalytics = (scoreboardTab, weekTabs = [], earningsTab = null) => {
  const metricsByPlayer = new Map();

  for (const player of scoreboardTab?.data?.players || []) {
    metricsByPlayer.set(normalizedName(player.player.display), {
      player: player.player.display,
      quitter: Boolean(player.quitter.display),
      totalPayout: cellNumber(player.totalPayout) || 0,
      totalEarnings: cellNumber(player.totalWinnings) || 0,
      bestPayout: null,
      bestPayoutWeek: '',
      worstPayout: null,
      worstPayoutWeek: '',
      totalPicks: 0,
      correctPicks: 0,
      correctPickPercentage: null,
      bestPickPercentage: null,
      bestPickWeek: '',
      bestWeekCorrectPicks: 0,
      bestWeekTotalPicks: 0,
      worstPickPercentage: null,
      worstPickWeek: '',
      worstWeekCorrectPicks: 0,
      worstWeekTotalPicks: 0,
    });
  }

  for (const tab of weekTabs) {
    const weeklyMetrics = new Map();

    for (const game of tab?.data?.games || []) {
      const winner = normalizedName(game.winner?.display);
      const away = normalizedName(game.away?.display);
      const home = normalizedName(game.home?.display);
      const winningSide = winner && winner === away ? 'away' : winner && winner === home ? 'home' : null;

      for (const pick of game.picks || []) {
        if (!pick?.side || !pick?.bettor?.display) continue;
        const key = normalizedName(pick.bettor.display);
        const metrics = metricsByPlayer.get(key);
        if (!metrics) continue;
        metrics.totalPicks += 1;
        if (winningSide && pick.side === winningSide) metrics.correctPicks += 1;

        const week = weeklyMetrics.get(key) || { totalPicks: 0, correctPicks: 0 };
        week.totalPicks += 1;
        if (winningSide && pick.side === winningSide) week.correctPicks += 1;
        weeklyMetrics.set(key, week);
      }
    }

    for (const [key, week] of weeklyMetrics) {
      const metrics = metricsByPlayer.get(key);
      const percentage = (week.correctPicks / week.totalPicks) * 100;

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

  return [...metricsByPlayer.values()].map((metrics) => ({
    ...metrics,
    correctPickPercentage: metrics.totalPicks
      ? (metrics.correctPicks / metrics.totalPicks) * 100
      : null,
  }));
};
