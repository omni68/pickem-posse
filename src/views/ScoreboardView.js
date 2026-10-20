import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import MetricCard from '../components/MetricCard';
import { buildPlayerAnalytics, rankSortedRows } from '../data/analytics';
import { formatCurrency, showCell } from '../data/formatters';

const rankColor = (index) => (['#E9652B', '#73809A', '#A96C3D'][index] || '#E9EDF4');

const standingsMetrics = [
  { key: 'totalPayout', label: 'Payout $' },
  { key: 'totalEarnings', label: 'Earnings $' },
  { key: 'amountPaid', label: 'Amount Paid $' },
  { key: 'returnOnAmountPaid', label: 'Return on Amount Paid %' },
  { key: 'performanceVsField', label: 'Performance vs. Field' },
  { key: 'contrarianWins', label: 'Contrarian King' },
  { key: 'participationRate', label: 'Participation Rate' },
  { key: 'bestPayout', label: 'Best Payout $' },
  { key: 'worstPayout', label: 'Worst Payout $' },
  { key: 'correctPickPercentage', label: 'Correct Pick %' },
  { key: 'bestPickPercentage', label: 'Best Pick %' },
  { key: 'worstPickPercentage', label: 'Worst Pick %' },
  { key: 'closestExactScore', label: 'Closest Exact Score' },
  { key: 'averageExactScoreError', label: 'Average Exact-Score Error' },
  { key: 'longestHeater', label: 'Longest Heater' },
];

const defaultOrderForMetric = (metricKey) => (
  metricKey === 'worstPickPercentage'
  || metricKey === 'worstPayout'
  || metricKey === 'closestExactScore'
  || metricKey === 'averageExactScoreError'
    ? 'asc'
    : 'desc'
);

const currencyValue = (value) => formatCurrency({ raw: value, display: String(value) });
const percentageValue = (value, signed = false) => {
  if (value == null) return '—';
  const prefix = signed && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
};

function MetricValue({ metric, player }) {
  if (metric.key === 'returnOnAmountPaid') {
    return (
      <Box>
        <Typography fontWeight={800}>{percentageValue(player.returnOnAmountPaid)}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
          {player.returnOnAmountPaid == null
            ? 'No amount paid'
            : `${currencyValue(player.totalEarnings)} earnings on ${currencyValue(player.amountPaid)} paid`}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'performanceVsField') {
    return (
      <Box>
        <Typography fontWeight={800}>
          {player.performanceVsField == null ? '—' : `${percentageValue(player.performanceVsField, true)} pts`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
          {player.performanceVsField == null
            ? 'No comparable finalized picks'
            : `Player ${percentageValue(player.playerComparisonPercentage)} · Field ${percentageValue(player.fieldComparisonPercentage)}`}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'contrarianWins') {
    return (
      <Box>
        <Typography fontWeight={800}>{player.contrarianWins} {player.contrarianWins === 1 ? 'win' : 'wins'}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {player.contrarianPicks
            ? `${player.contrarianWins}/${player.contrarianPicks} minority-side picks won`
            : 'No minority-side picks'}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'participationRate') {
    return (
      <Box>
        <Typography fontWeight={800}>{percentageValue(player.participationRate)}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {player.participationOpportunities
            ? `${player.participationPicks}/${player.participationOpportunities} picks submitted`
            : 'No participating weeks'}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'averageExactScoreError') {
    const error = player.averageExactScoreError;
    return (
      <Box>
        <Typography fontWeight={800}>{error == null ? '—' : `${error.toFixed(1)} points off`}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {error == null
            ? 'No finalized predictions'
            : `${player.exactScorePredictionCount} final ${player.exactScorePredictionCount === 1 ? 'prediction' : 'predictions'}`}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'longestHeater') {
    return (
      <Box>
        <Typography fontWeight={800}>{player.longestHeater} {player.longestHeater === 1 ? 'pick' : 'picks'}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {player.longestHeater ? 'Consecutive correct picks' : 'No correct-pick streak'}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'closestExactScore') {
    const difference = player.closestExactScore;
    return (
      <Box>
        <Typography fontWeight={800}>
          {difference == null ? '—' : `${difference} ${difference === 1 ? 'point' : 'points'} off`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
          {difference == null ? 'No finalized predictions' : player.closestExactScoreWeek}
        </Typography>
        {difference != null && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Pick (A–H): {player.closestExactScoreAwayPrediction}–{player.closestExactScoreHomePrediction}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Actual (A–H): {player.closestExactScoreAwayActual}–{player.closestExactScoreHomeActual}
            </Typography>
          </>
        )}
      </Box>
    );
  }

  if (metric.key === 'bestPayout' || metric.key === 'worstPayout') {
    const best = metric.key === 'bestPayout';
    const payout = player[metric.key];
    const week = player[best ? 'bestPayoutWeek' : 'worstPayoutWeek'];

    return (
      <Box>
        <Typography fontWeight={800}>{payout == null ? '—' : currencyValue(payout)}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
          {payout == null ? 'No weekly payouts' : week}
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'correctPickPercentage') {
    return (
      <Box>
        <Typography fontWeight={800}>
          {player.correctPickPercentage == null ? '—' : `${player.correctPickPercentage.toFixed(1)}%`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {player.correctPicks}/{player.totalPicks} correct
        </Typography>
      </Box>
    );
  }

  if (metric.key === 'bestPickPercentage' || metric.key === 'worstPickPercentage') {
    const best = metric.key === 'bestPickPercentage';
    const percentage = player[metric.key];
    const week = player[best ? 'bestPickWeek' : 'worstPickWeek'];
    const correctPicks = player[best ? 'bestWeekCorrectPicks' : 'worstWeekCorrectPicks'];
    const totalPicks = player[best ? 'bestWeekTotalPicks' : 'worstWeekTotalPicks'];

    return (
      <Box>
        <Typography fontWeight={800}>{percentage == null ? '—' : `${percentage.toFixed(1)}%`}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
          {percentage == null ? 'No weekly picks' : `${week} · ${correctPicks}/${totalPicks} correct`}
        </Typography>
      </Box>
    );
  }

  return <Typography fontWeight={800}>{currencyValue(player[metric.key])}</Typography>;
}

function StandingsTable({ rows }) {
  const [metricKey, setMetricKey] = useState('totalPayout');
  const [order, setOrder] = useState('desc');
  const metric = standingsMetrics.find((option) => option.key === metricKey);
  const rankedRows = useMemo(() => {
    const sortedRows = [...rows].sort((left, right) => {
      const leftValue = left[metricKey];
      const rightValue = right[metricKey];
      if (leftValue == null && rightValue == null) return left.player.localeCompare(right.player);
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;
      const comparison = leftValue - rightValue;
      return comparison === 0
        ? left.player.localeCompare(right.player)
        : comparison * (order === 'asc' ? 1 : -1);
    });
    return rankSortedRows(sortedRows, metricKey);
  }, [rows, metricKey, order]);

  return (
    <Card>
      <CardContent sx={{ p: { xs: 0, sm: 1 }, '&:last-child': { pb: { xs: 0, sm: 1 } } }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2.5, pb: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h5">Standings</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Ranked by {metric.label.toLowerCase()}
              </Typography>
            </Box>
            <Chip label={`${rows.length} players`} variant="outlined" />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="standings-metric-label">View and sort by</InputLabel>
              <Select
                labelId="standings-metric-label"
                value={metricKey}
                label="View and sort by"
                onChange={(event) => {
                  setMetricKey(event.target.value);
                  setOrder(defaultOrderForMetric(event.target.value));
                }}
              >
                {standingsMetrics.map((option) => (
                  <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton
              aria-label={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`}
              onClick={() => setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
              sx={{ flexShrink: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              {order === 'asc' ? <ArrowUpwardRoundedIcon /> : <ArrowDownwardRoundedIcon />}
            </IconButton>
          </Stack>
        </Box>

        <TableContainer sx={{ overflowX: 'hidden' }}>
          <Table aria-label="Standings" sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { xs: 54, sm: 70 }, px: { xs: 1, sm: 2 } }}>Rank</TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 } }}>Player</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    width: {
                      xs: metric.key === 'closestExactScore' ? 142 : 118,
                      sm: metric.key === 'closestExactScore' ? 220 : 180,
                    },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  {metric.label}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rankedRows.map((player) => (
                <TableRow key={player.player} hover>
                  <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: rankColor(player.rank - 1), color: player.rank <= 3 ? '#FFFFFF' : 'text.primary', fontSize: 14, fontWeight: 800 }}>
                      {player.rank}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ minWidth: 0, px: { xs: 1, sm: 2 } }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={0.75}>
                      <Typography fontWeight={750} sx={{ maxWidth: '100%', overflowWrap: 'anywhere' }}>{player.player}</Typography>
                      {player.quitter && <Chip size="small" color="warning" label="Quitter" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ px: { xs: 1, sm: 2 } }}>
                    <MetricValue metric={metric} player={player} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

export default function ScoreboardView({ tab, workbook }) {
  const { summary } = tab.data;
  const standings = useMemo(
    () => buildPlayerAnalytics(
      tab,
      workbook.tabs.filter((candidate) => candidate.type === 'week'),
      workbook.tabs.find((candidate) => candidate.type === 'earnings'),
    ),
    [tab, workbook],
  );

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={4}><MetricCard label="Jackpot" value={formatCurrency(summary.jackpotTotal)} icon={<SavingsRoundedIcon />} /></Grid>
        <Grid item xs={12} sm={4}><MetricCard label="Qualifiers" value={showCell(summary.qualifiers, '0')} icon={<EmojiEventsRoundedIcon />} color="success.main" /></Grid>
        <Grid item xs={12} sm={4}><MetricCard label="Players" value={String(summary.playerCount)} icon={<Groups2RoundedIcon />} color="primary.light" /></Grid>
      </Grid>

      <StandingsTable rows={standings} />
    </Stack>
  );
}
