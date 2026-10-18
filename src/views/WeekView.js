import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  AvatarGroup,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
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
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatGameStart, initials, showCell, valueTone } from '../data/formatters';
import {
  atsSideOutcomes,
  atsSpreads,
  exactScoreWinners,
  jackpotRolloverWeeks,
  sortGamesByStatusAndStart,
} from '../data/week';

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

function TeamRow({ label, team, score, picks, selectedPick, payout, final, outcome, spread }) {
  const atsAmount = outcome.win ?? (outcome.lose == null ? null : Math.abs(outcome.lose));
  const formattedAtsAmount = formatOutcomeAmount(atsAmount);

  return (
    <Box sx={{ py: 1.6 }}>
      <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }} sx={{ minWidth: 0 }}>
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

function GameCard({ game, selectedBettor, selectedPrediction, jackpotResult, jackpotTotal }) {
  const awayPicks = game.picks.filter((pick) => pick.side === 'away');
  const homePicks = game.picks.filter((pick) => pick.side === 'home');
  const bettorPick = game.picks.find((pick) => pick.bettor.display === selectedBettor);
  const final = game.winner.display !== '';
  const spreads = atsSpreads(game.homeSpread);
  const outcomes = atsSideOutcomes(game);

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} spacing={{ xs: 1.25, sm: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1.45, whiteSpace: 'normal' }}>{formatGameStart(game.date, game.time)}</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              <Chip size="small" color={final ? 'default' : 'warning'} label={final ? 'Final' : 'Pending'} />
              {game.isGameOfTheWeek && <Chip size="small" color="secondary" icon={<EmojiEventsRoundedIcon />} label="Game of the week" />}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <TeamRow label="Away" team={showCell(game.away)} score={showCell(game.scoreAway, '')} picks={awayPicks} selectedPick={bettorPick?.side === 'away'} payout={bettorPick?.payout} final={final} outcome={outcomes.away} spread={spreads.away} />
          <Divider />
          <TeamRow label="Home" team={showCell(game.home)} score={showCell(game.scoreHome, '')} picks={homePicks} selectedPick={bettorPick?.side === 'home'} payout={bettorPick?.payout} final={final} outcome={outcomes.home} spread={spreads.home} />
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
  const activeBettor = useMemo(() => bettors.find((bettor) => bettor.player.display === selectedBettor), [bettors, selectedBettor]);
  const orderedGames = useMemo(() => sortGamesByStatusAndStart(games), [games]);
  const finalGames = games.filter((game) => game.winner.display !== '').length;
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
          />
        ))}
      </Stack>

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
