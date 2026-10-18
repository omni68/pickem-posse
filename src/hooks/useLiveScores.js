import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIVE_SCORE_POLL_MS,
  SCHEDULED_SCORE_POLL_MS,
  centralWallTimestamp,
  confirmedEventIsValid,
  fetchEspnScoreboards,
  gameFingerprint,
  matchGameToEvents,
} from '../data/liveScores';

const STORAGE_PREFIX = 'pickem-live-score:v1';

const selectionKey = (spreadsheetId, fingerprint) => (
  `${STORAGE_PREFIX}:${spreadsheetId || 'workbook'}:${fingerprint}`
);

const readSelection = (spreadsheetId, fingerprint) => {
  try {
    const value = window.localStorage.getItem(selectionKey(spreadsheetId, fingerprint));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeSelection = (spreadsheetId, fingerprint, selection) => {
  try {
    window.localStorage.setItem(selectionKey(spreadsheetId, fingerprint), JSON.stringify(selection));
  } catch {
    // Live matching still works when storage is unavailable.
  }
};

const pollDelay = (events) => {
  if (events.some((event) => event.status.state === 'in')) return LIVE_SCORE_POLL_MS;

  const now = centralWallTimestamp(new Date());
  const nearKickoff = events.some((event) => {
    if (event.status.state !== 'pre') return false;
    const kickoff = centralWallTimestamp(event.startTime);
    const minutesUntilKickoff = (kickoff - now) / 60_000;
    return minutesUntilKickoff >= -360 && minutesUntilKickoff <= 30;
  });
  return nearKickoff ? LIVE_SCORE_POLL_MS : SCHEDULED_SCORE_POLL_MS;
};

export default function useLiveScores({ games = [], spreadsheetId, tab }) {
  const pendingGames = useMemo(
    () => games.filter((game) => !game.winner?.display),
    [games],
  );
  const pendingSignature = useMemo(
    () => pendingGames.map((game) => gameFingerprint(tab, game)).join('~'),
    [pendingGames, tab],
  );
  const [events, setEvents] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(pendingGames.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    const stored = {};
    pendingGames.forEach((game) => {
      const fingerprint = gameFingerprint(tab, game);
      const selection = readSelection(spreadsheetId, fingerprint);
      if (selection) stored[fingerprint] = selection;
    });
    setSelections(stored);
  }, [pendingSignature, pendingGames, spreadsheetId, tab]);

  useEffect(() => {
    if (!pendingGames.length) {
      setEvents([]);
      setHasLoaded(true);
      setError('');
      return undefined;
    }

    let active = true;
    let timer;
    let controller;
    let latestEvents = [];

    const schedule = () => {
      if (!active || document.visibilityState === 'hidden') return;
      timer = window.setTimeout(load, pollDelay(latestEvents));
    };

    const load = async () => {
      if (!active || document.visibilityState === 'hidden') return;
      controller?.abort();
      controller = new AbortController();
      setIsRefreshing(true);
      try {
        const nextEvents = await fetchEspnScoreboards(pendingGames, { signal: controller.signal });
        if (!active) return;
        latestEvents = nextEvents;
        setEvents(nextEvents);
        setError('');
        setLastUpdated(new Date());
      } catch (reason) {
        if (active && reason?.name !== 'AbortError') {
          setError('Live scores are temporarily unavailable.');
        }
      } finally {
        if (active) {
          setHasLoaded(true);
          setIsRefreshing(false);
          schedule();
        }
      }
    };

    const handleVisibility = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'hidden') {
        controller?.abort();
      } else {
        load();
      }
    };

    setHasLoaded(false);
    load();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pendingSignature, pendingGames]);

  const matches = useMemo(() => {
    const result = {};
    pendingGames.forEach((game) => {
      const fingerprint = gameFingerprint(tab, game);
      const automatic = matchGameToEvents(game, events);
      const selection = selections[fingerprint];

      if (selection?.ignored) {
        result[game.row] = { ...automatic, status: 'ignored', event: null };
        return;
      }

      if (selection?.eventKey) {
        const confirmedEvent = events.find((event) => event.key === selection.eventKey);
        if (confirmedEventIsValid(game, confirmedEvent)) {
          result[game.row] = {
            ...automatic,
            status: 'confirmed',
            event: confirmedEvent,
          };
          return;
        }
      }

      result[game.row] = automatic;
    });
    return result;
  }, [events, pendingGames, selections, tab]);

  const confirmMatch = useCallback((game, event) => {
    const fingerprint = gameFingerprint(tab, game);
    const selection = event
      ? { eventKey: event.key, confirmedAt: new Date().toISOString() }
      : { ignored: true, confirmedAt: new Date().toISOString() };
    writeSelection(spreadsheetId, fingerprint, selection);
    setSelections((current) => ({ ...current, [fingerprint]: selection }));
  }, [spreadsheetId, tab]);

  return {
    confirmMatch,
    error,
    hasLoaded,
    isRefreshing,
    lastUpdated,
    matches,
  };
}
