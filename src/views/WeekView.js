import { useMemo, useState } from 'react';
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
import { formatCurrency, initials, showCell, valueTone } from '../data/formatters';

function TeamRow({ label, team, score, picks, selectedPick, payout, final }) {
  return (
    <Box sx={{ py: 1.6 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: selectedPick ? 'secondary.main' : 'action.hover', color: selectedPick ? '#fff' : 'text.primary', fontSize: 13, fontWeight: 800 }}>
          {initials(team)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography fontWeight={800}>{team}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            {selectedPick && <Chip size="small" color="secondary" label="Your pick" />}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 25, height: 25, fontSize: 9, bgcolor: 'primary.light' } }}>
              {picks.map((pick) => <Avatar key={pick.bettor.display}>{initials(pick.bettor.display)}</Avatar>)}
            </AvatarGroup>
            <Typography variant="caption" color="text.secondary">{picks.length} pick{picks.length === 1 ? '' : 's'}</Typography>
          </Stack>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5">{score || (final ? '0' : '—')}</Typography>
          {selectedPick && <Typography variant="caption" color={valueTone(payout) === 'default' ? 'text.secondary' : `${valueTone(payout)}.main`} fontWeight={800}>{formatCurrency(payout)}</Typography>}
        </Box>
      </Stack>
    </Box>
  );
}

function GameCard({ game, selectedBettor, jackpotTotal }) {
  const awayPicks = game.picks.filter((pick) => pick.side === 'away');
  const homePicks = game.picks.filter((pick) => pick.side === 'home');
  const bettorPick = game.picks.find((pick) => pick.bettor.display === selectedBettor);
  const final = game.winner.display !== '';
  const spread = showCell(game.homeSpread, '—');

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.25, sm: 2.75 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>{showCell(game.date, 'Date TBD')} · {showCell(game.time, 'Time TBD')}</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              <Chip size="small" color={final ? 'default' : 'warning'} label={final ? 'Final' : 'Pending'} />
              {game.isGameOfTheWeek && <Chip size="small" color="secondary" icon={<EmojiEventsRoundedIcon />} label={`Game of the Week · ${formatCurrency(jackpotTotal)}`} />}
            </Stack>
          </Box>
          <Chip size="small" variant="outlined" label={`Home ${spread}`} />
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <TeamRow label="Away" team={showCell(game.away)} score={showCell(game.scoreAway, '')} picks={awayPicks} selectedPick={bettorPick?.side === 'away'} payout={bettorPick?.payout} final={final} />
          <Divider />
          <TeamRow label="Home" team={showCell(game.home)} score={showCell(game.scoreHome, '')} picks={homePicks} selectedPick={bettorPick?.side === 'home'} payout={bettorPick?.payout} final={final} />
        </Box>

        <Divider sx={{ my: 1.25 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
          <Typography variant="caption" color="text.secondary"><strong>Away:</strong> {awayPicks.map((pick) => pick.bettor.display).join(', ') || 'No picks'}</Typography>
          <Typography variant="caption" color="text.secondary"><strong>Home:</strong> {homePicks.map((pick) => pick.bettor.display).join(', ') || 'No picks'}</Typography>
        </Stack>
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
            <Typography fontWeight={800} sx={{ mt: 0.35 }}>{value}</Typography>
          </Box>
        </Grid>
      ))}
      {(bettor.awayPrediction.display || bettor.homePrediction.display) && (
        <Grid item xs={12}>
          <Box sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', borderRadius: 2.5, p: 1.75 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Game of the Week prediction</Typography>
            <Typography fontWeight={800} sx={{ mt: 0.25 }}>{awayLabel}: {showCell(bettor.awayPrediction)} · {homeLabel}: {showCell(bettor.homePrediction)}</Typography>
          </Box>
        </Grid>
      )}
    </Grid>
  );
}

export default function WeekView({ tab }) {
  const { games, bettors, summary } = tab.data;
  const [selectedBettor, setSelectedBettor] = useState('all');
  const activeBettor = useMemo(() => bettors.find((bettor) => bettor.player.display === selectedBettor), [bettors, selectedBettor]);
  const finalGames = games.filter((game) => game.winner.display !== '').length;

  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
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
          <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 800 }}>{initials(activeBettor.player.display)}</Avatar>
              <Box><Typography variant="h6">{activeBettor.player.display}</Typography><Typography variant="body2" color="text.secondary">Weekly summary</Typography></Box>
            </Stack>
            <BettorSummary bettor={activeBettor} awayLabel={showCell(summary.awayPredictionLabel, 'Away')} homeLabel={showCell(summary.homePredictionLabel, 'Home')} />
          </CardContent>
        </Card>
      )}

      <Stack spacing={1.5}>
        {games.map((game) => <GameCard key={game.row} game={game} selectedBettor={selectedBettor} jackpotTotal={summary.jackpotTotal} />)}
      </Stack>

      <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2.5, minHeight: 64 }}>
          <Box><Typography variant="h6">Player summaries</Typography><Typography variant="body2" color="text.secondary">Exposure, winnings, rank, and predictions</Typography></Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
          <Grid container spacing={1.5}>
            {bettors.map((bettor) => (
              <Grid item xs={12} md={6} key={bettor.player.display}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Typography fontWeight={800}>{bettor.player.display}</Typography>
                      <Chip size="small" label={`#${showCell(bettor.rank)}`} />
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
