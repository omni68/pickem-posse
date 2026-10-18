import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SportsFootballRoundedIcon from '@mui/icons-material/SportsFootballRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatGameStart, initials, showCell, valueTone } from '../data/formatters';
import { formatEspnKickoff, liveStatusLabel } from '../data/liveScores';
import {
  atsCoveringSide,
  atsSideOutcomes,
  atsSpreads,
  exactScoreWinners,
  jackpotRolloverWeeks,
  sortGamesByStatusAndStart,
} from '../data/week';
import useLiveScores from '../hooks/useLiveScores';

const formatOutcomeAmount = (amount) => (
  amount == null ? '—' : formatCurrency({ raw: amount, display: String(amount) })
);

function ResponsivePickAvatars({ picks }) {
  const containerRef = useRef(null);
  const [maxVisible, setMaxVisible] = useState(picks.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateMaxVisible = () => {
      const width = container.getBoundingClientRect().width;
      if (!width) return;
      const avatarWidth = 25;
      const overlappedStep = 17;
      const availableCircles = Math.max(2, Math.floor((width - avatarWidth) / overlappedStep) + 1);
      setMaxVisible(Math.min(picks.length, availableCircles));
    };

    updateMaxVisible();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateMaxVisible);
    observer.observe(container);
    return () => observer.disconnect();
  }, [picks.length]);

  return (
    <Box ref={containerRef} sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
      <AvatarGroup
        max={Math.max(2, maxVisible)}
        total={picks.length}
        sx={{ justifyContent: 'flex-end', '& .MuiAvatar-root': { width: 25, height: 25, fontSize: 9, bgcolor: 'primary.light' } }}
      >
        {picks.map((pick) => (
          <Avatar key={pick.bettor.display} title={pick.bettor.display} aria-label={pick.bettor.display}>
            {initials(pick.bettor.display)}
          </Avatar>
        ))}
      </AvatarGroup>
    </Box>
  );
}

function TeamRow({ label, team, score, picks, selectedPick, payout, final, outcome, spread, highlightLabel }) {
  const atsAmount = outcome.win ?? (outcome.lose == null ? null : Math.abs(outcome.lose));
  const formattedAtsAmount = formatOutcomeAmount(atsAmount);

  return (
    <Box
      sx={{
        position: 'relative',
        mx: highlightLabel ? -0.75 : 0,
        px: highlightLabel ? 0.75 : 0,
        pt: 1.6,
        pb: highlightLabel ? 3.8 : 1.6,
        overflow: 'hidden',
        border: highlightLabel ? '1px solid rgba(54, 160, 73, 0.45)' : '1px solid transparent',
        borderRadius: highlightLabel ? 2 : 0,
        bgcolor: highlightLabel ? 'rgba(88, 204, 112, 0.34)' : 'transparent',
        transition: 'background-color 220ms ease',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }} sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
        <Avatar sx={{ flexShrink: 0, width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 }, bgcolor: selectedPick ? 'secondary.main' : 'action.hover', color: selectedPick ? '#fff' : 'text.primary', fontSize: 13, fontWeight: 800 }}>
          {initials(team)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{team}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Chip size="small" variant="outlined" label={spread} aria-label={`${label} spread ${spread}`} />
            {selectedPick && <Chip size="small" color="secondary" label="Your pick" />}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.4 }} aria-label={`ATS win or loss ${formattedAtsAmount}`}>
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                color: 'text.secondary',
                fontSize: 13,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              ±
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>{formattedAtsAmount}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5, width: '100%' }}>
            <ResponsivePickAvatars picks={picks} />
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{picks.length} pick{picks.length === 1 ? '' : 's'}</Typography>
          </Stack>
        </Box>
        <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
          <Typography variant="h5">{score || (final ? '0' : '—')}</Typography>
          {selectedPick && <Typography variant="caption" color={valueTone(payout) === 'default' ? 'text.secondary' : `${valueTone(payout)}.main`} fontWeight={800}>{formatCurrency(payout)}</Typography>}
        </Box>
      </Stack>
      {highlightLabel && (
        <Typography
          aria-hidden="true"
          component="span"
          sx={{
            position: 'absolute',
            right: 16,
            bottom: 8,
            left: 16,
            color: 'rgba(8, 88, 42, 0.9)',
            fontSize: { xs: '0.68rem', sm: '0.74rem' },
            fontWeight: 900,
            letterSpacing: '0.08em',
            lineHeight: 1.1,
            textAlign: 'center',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {highlightLabel}
        </Typography>
      )}
    </Box>
  );
}

export function GameOfTheWeekDetails({ game, selectedPrediction, jackpotResult, jackpotTotal }) {
  const winners = (jackpotResult?.winners || []).filter((bettor) => bettor?.player?.display);
  const hasPrediction = Boolean(
    selectedPrediction?.player?.display
    && selectedPrediction?.awayPrediction?.display !== ''
    && selectedPrediction?.homePrediction?.display !== '',
  );
  const selectedWon = hasPrediction
    && winners.some((bettor) => bettor.player.display === selectedPrediction.player.display);
  const winnerNames = winners.map((bettor) => bettor.player.display).join(', ');
  const rolloverWeeks = jackpotResult?.rolloverWeeks || 1;
  const gameIsFinal = Boolean(game?.winner?.display);

  return (
    <Box sx={{ mt: 1.75, p: 1.75, borderRadius: 2.5, bgcolor: 'background.default' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>Exact-score jackpot</Typography>
          <Typography fontWeight={800} sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
            {!gameIsFinal && 'Waiting for the final score'}
            {gameIsFinal && winners.length > 0 && `Won by ${winnerNames}`}
            {gameIsFinal && winners.length === 0 && `No winner · ${rolloverWeeks} ${rolloverWeeks === 1 ? 'week’s' : 'weeks’'} worth in the jackpot`}
          </Typography>
        </Box>
        <Chip color={winners.length ? 'success' : 'default'} label={formatCurrency(jackpotTotal)} />
      </Stack>

      {hasPrediction && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={0.75}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>{selectedPrediction.player.display}&apos;s prediction</Typography>
              <Typography fontWeight={800} sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
                {showCell(game.away)} {showCell(selectedPrediction.awayPrediction)} · {showCell(game.home)} {showCell(selectedPrediction.homePrediction)}
              </Typography>
            </Box>
            {gameIsFinal && <Chip size="small" color={selectedWon ? 'success' : 'default'} label={selectedWon ? 'Exact score' : 'No exact score'} />}
          </Stack>
        </>
      )}
    </Box>
  );
}

const leagueLabel = (league) => (league === 'nfl' ? 'NFL' : 'College football');

export function LiveScoreMatchDialog({ game, match, open, onClose, onSelect }) {
  const candidates = match?.candidates || [];
  const matchup = game ? `${showCell(game.away)} at ${showCell(game.home)}` : 'this game';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="live-score-match-title">
      <DialogTitle id="live-score-match-title">Choose the live score</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary">
          We could not confidently match {matchup}. Select the ESPN game that should provide its score.
        </Typography>
        {candidates.length ? (
          <List disablePadding sx={{ mt: 1.5 }}>
            {candidates.map((candidate) => {
              const { event } = candidate;
              const confidence = Math.round(candidate.score * 100);
              return (
                <ListItemButton
                  key={event.key}
                  onClick={() => onSelect(event)}
                  sx={{
                    alignItems: 'flex-start',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={`${event.away.team.displayName} at ${event.home.team.displayName}`}
                    secondary={`${leagueLabel(event.league)} · ${formatEspnKickoff(event.startTime)} · ${liveStatusLabel(event)} · ${confidence}% match`}
                    primaryTypographyProps={{ fontWeight: 800, sx: { overflowWrap: 'anywhere' } }}
                    secondaryTypographyProps={{ sx: { mt: 0.5, overflowWrap: 'anywhere' } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Box sx={{ mt: 2, p: 2, borderRadius: 2.5, bgcolor: 'background.default' }}>
            <Typography variant="body2">No ESPN games were found near this kickoff.</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap' }}>
        <Button color="inherit" onClick={() => onSelect(null)}>Don&apos;t use a live score</Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

export function GameCard({
  game,
  selectedBettor,
  selectedPrediction,
  jackpotResult,
  jackpotTotal,
  liveMatch,
  liveScoresReady,
  liveScoreError,
  onChooseLiveScore,
}) {
  const awayPicks = game.picks.filter((pick) => pick.side === 'away');
  const homePicks = game.picks.filter((pick) => pick.side === 'home');
  const bettorPick = game.picks.find((pick) => pick.bettor.display === selectedBettor);
  const final = game.winner.display !== '';
  const liveEvent = final ? null : liveMatch?.event;
  const liveInProgress = liveEvent?.status.state === 'in';
  const liveIsFinal = liveEvent?.status.state === 'post' || liveEvent?.status.completed;
  const liveScoreAvailable = liveInProgress || liveIsFinal;
  const awayScore = liveScoreAvailable ? liveEvent.away.score : showCell(game.scoreAway, '');
  const homeScore = liveScoreAvailable ? liveEvent.home.score : showCell(game.scoreHome, '');
  const coveringSide = final
    ? atsCoveringSide(game)
    : liveScoreAvailable
      ? atsCoveringSide(game, { awayScore: liveEvent.away.score, homeScore: liveEvent.home.score })
      : null;
  const coveringLabel = final || liveIsFinal ? 'Covered' : 'Currently covering…';
  const needsMatch = !final
    && liveScoresReady
    && !liveEvent
    && ['ambiguous', 'unmatched', 'ignored'].includes(liveMatch?.status);
  const spreads = atsSpreads(game.homeSpread);
  const outcomes = atsSideOutcomes(game);

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} spacing={{ xs: 1.25, sm: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1.45, whiteSpace: 'normal' }}>{formatGameStart(game.date, game.time)}</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              {!liveEvent && <Chip size="small" color={final ? 'default' : 'warning'} label={final ? 'Final' : 'Pending'} />}
              {liveEvent && (
                <Chip
                  size="small"
                  color={liveInProgress ? 'error' : liveIsFinal ? 'default' : 'warning'}
                  icon={liveInProgress ? <SensorsRoundedIcon /> : undefined}
                  label={liveInProgress ? `Live · ${liveStatusLabel(liveEvent)}` : liveStatusLabel(liveEvent)}
                  aria-label={`ESPN status ${liveStatusLabel(liveEvent)}`}
                />
              )}
              {liveEvent && <Chip size="small" variant="outlined" label="ESPN" />}
              {game.isGameOfTheWeek && <Chip size="small" color="secondary" icon={<EmojiEventsRoundedIcon />} label="Game of the week" />}
            </Stack>
            {needsMatch && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<LinkRoundedIcon />}
                onClick={() => onChooseLiveScore(game)}
                sx={{ mt: 1 }}
              >
                Choose live score
              </Button>
            )}
            {!final && liveScoreError && !liveEvent && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Live score temporarily unavailable
              </Typography>
            )}
          </Box>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <TeamRow label="Away" team={showCell(game.away)} score={awayScore} picks={awayPicks} selectedPick={bettorPick?.side === 'away'} payout={bettorPick?.payout} final={final || liveIsFinal} outcome={outcomes.away} spread={spreads.away} highlightLabel={coveringSide === 'away' ? coveringLabel : ''} />
          <Divider />
          <TeamRow label="Home" team={showCell(game.home)} score={homeScore} picks={homePicks} selectedPick={bettorPick?.side === 'home'} payout={bettorPick?.payout} final={final || liveIsFinal} outcome={outcomes.home} spread={spreads.home} highlightLabel={coveringSide === 'home' ? coveringLabel : ''} />
        </Box>

        <Divider sx={{ my: 1.25 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}><strong>Away:</strong> {awayPicks.map((pick) => pick.bettor.display).join(', ') || 'No picks'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}><strong>Home:</strong> {homePicks.map((pick) => pick.bettor.display).join(', ') || 'No picks'}</Typography>
        </Stack>

        {game.isGameOfTheWeek && (
          <GameOfTheWeekDetails
            game={game}
            selectedPrediction={selectedPrediction}
            jackpotResult={jackpotResult}
            jackpotTotal={jackpotTotal}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BettorSummary({ bettor, awayLabel, homeLabel }) {
  return (
    <Grid container spacing={1.25}>
      {[
        ['Current week', formatCurrency(bettor.currentWinnings)],
        ['Remaining exposure', formatCurrency(bettor.remainingExposure)],
        ['Cumulative', formatCurrency(bettor.cumulativeWinnings)],
        ['Rank', `#${showCell(bettor.rank)}`],
        ['Jackpot', formatCurrency(bettor.jackpotEarnings)],
        ['Cash call', showCell(bettor.cashCall, 'Clear')],
      ].map(([label, value]) => (
        <Grid item xs={6} sm={4} key={label}>
          <Box sx={{ bgcolor: 'background.default', borderRadius: 2.5, p: 1.5, height: '100%' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={750}>{label}</Typography>
            <Typography fontWeight={800} sx={{ mt: 0.35, overflowWrap: 'anywhere' }}>{value}</Typography>
          </Box>
        </Grid>
      ))}
      {(bettor.awayPrediction.display || bettor.homePrediction.display) && (
        <Grid item xs={12}>
          <Box sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', borderRadius: 2.5, p: 1.75 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Game of the Week prediction</Typography>
            <Typography fontWeight={800} sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>{awayLabel}: {showCell(bettor.awayPrediction)} · {homeLabel}: {showCell(bettor.homePrediction)}</Typography>
          </Box>
        </Grid>
      )}
    </Grid>
  );
}

export default function WeekView({ tab, workbook }) {
  const { games, bettors, summary } = tab.data;
  const [selectedBettor, setSelectedBettor] = useState('all');
  const [matchingGame, setMatchingGame] = useState(null);
  const activeBettor = useMemo(() => bettors.find((bettor) => bettor.player.display === selectedBettor), [bettors, selectedBettor]);
  const orderedGames = useMemo(() => sortGamesByStatusAndStart(games), [games]);
  const finalGames = games.filter((game) => game.winner.display !== '').length;
  const liveScores = useLiveScores({
    games,
    spreadsheetId: workbook?.source?.spreadsheetId,
    tab,
  });
  const matchingResult = matchingGame ? liveScores.matches[matchingGame.row] : null;
  const jackpotResult = useMemo(() => ({
    winners: exactScoreWinners(tab),
    rolloverWeeks: jackpotRolloverWeeks(workbook, tab),
  }), [tab, workbook]);

  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5">Games and picks</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Filter to highlight one player’s picks and payouts.</Typography>
              {!liveScores.hasLoaded && games.length > finalGames && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>Finding live scores…</Typography>
              )}
              {liveScores.lastUpdated && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Live scores updated {liveScores.lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  {liveScores.isRefreshing ? ' · Refreshing…' : ''}
                </Typography>
              )}
            </Box>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
              <InputLabel id={`${tab.slug}-bettor-label`}>Player</InputLabel>
              <Select labelId={`${tab.slug}-bettor-label`} value={selectedBettor} label="Player" onChange={(event) => setSelectedBettor(event.target.value)}>
                <MenuItem value="all">All players</MenuItem>
                {bettors.map((bettor) => <MenuItem value={bettor.player.display} key={bettor.player.display}>{bettor.player.display}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={4}><MetricCard label="Games" value={`${finalGames}/${games.length} final`} icon={<SportsFootballRoundedIcon />} color="primary.light" /></Grid>
        <Grid item xs={12} sm={4}><MetricCard label="Players" value={String(bettors.length)} icon={<Groups2RoundedIcon />} /></Grid>
        <Grid item xs={12} sm={4}><MetricCard label="Jackpot" value={formatCurrency(summary.jackpotTotal)} icon={<SavingsRoundedIcon />} color="success.main" /></Grid>
      </Grid>

      {activeBettor && (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 800 }}>{initials(activeBettor.player.display)}</Avatar>
              <Box sx={{ minWidth: 0 }}><Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{activeBettor.player.display}</Typography><Typography variant="body2" color="text.secondary">Weekly summary</Typography></Box>
            </Stack>
            <BettorSummary bettor={activeBettor} awayLabel={showCell(summary.awayPredictionLabel, 'Away')} homeLabel={showCell(summary.homePredictionLabel, 'Home')} />
          </CardContent>
        </Card>
      )}

      <Stack spacing={1.5}>
        {orderedGames.map((game) => (
          <GameCard
            key={game.row}
            game={game}
            selectedBettor={selectedBettor}
            selectedPrediction={activeBettor}
            jackpotResult={jackpotResult}
            jackpotTotal={summary.jackpotTotal}
            liveMatch={liveScores.matches[game.row]}
            liveScoresReady={liveScores.hasLoaded}
            liveScoreError={liveScores.error}
            onChooseLiveScore={setMatchingGame}
          />
        ))}
      </Stack>

      <LiveScoreMatchDialog
        game={matchingGame}
        match={matchingResult}
        open={Boolean(matchingGame)}
        onClose={() => setMatchingGame(null)}
        onSelect={(event) => {
          liveScores.confirmMatch(matchingGame, event);
          setMatchingGame(null);
        }}
      />

      <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: { xs: 2, sm: 2.5 }, minHeight: 64 }}>
          <Box sx={{ minWidth: 0 }}><Typography variant="h6">Player summaries</Typography><Typography variant="body2" color="text.secondary">Exposure, winnings, rank, and predictions</Typography></Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
          <Grid container spacing={1.5}>
            {bettors.map((bettor) => (
              <Grid item xs={12} md={6} key={bettor.player.display}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5, minWidth: 0 }}>
                      <Typography fontWeight={800} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{bettor.player.display}</Typography>
                      <Chip size="small" label={`#${showCell(bettor.rank)}`} sx={{ flexShrink: 0 }} />
                    </Stack>
                    <BettorSummary bettor={bettor} awayLabel={showCell(summary.awayPredictionLabel, 'Away')} homeLabel={showCell(summary.homePredictionLabel, 'Home')} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
