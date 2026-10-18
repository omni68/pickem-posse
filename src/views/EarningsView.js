import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import MetricCard from '../components/MetricCard';
import { cellNumber, formatCurrency, initials, showCell, valueTone } from '../data/formatters';

function PeriodCards({ periods }) {
  return (
    <Grid container spacing={1.25}>
      {periods.map((period) => (
        <Grid item xs={6} sm={4} md={3} key={period.key}>
          <Box sx={{ p: 1.75, bgcolor: 'background.default', borderRadius: 2.5, minHeight: 82 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={750}>{period.label}</Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }} color={valueTone(period.value) === 'default' ? 'text.primary' : `${valueTone(period.value)}.main`}>
              {formatCurrency(period.value)}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

export default function EarningsView({ tab }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const { bettors } = tab.data;
  const [selectedName, setSelectedName] = useState(bettors[0]?.player.display || '');
  const selected = useMemo(
    () => bettors.find((bettor) => bettor.player.display === selectedName) || bettors[0],
    [bettors, selectedName],
  );
  const activePeriods = selected?.periods.filter((period) => period.value.display !== '') || [];

  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5">Season earnings</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Choose a player to review every scoring period.</Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
              <InputLabel id="earnings-player-label">Player</InputLabel>
              <Select labelId="earnings-player-label" value={selectedName} label="Player" onChange={(event) => setSelectedName(event.target.value)}>
                {bettors.map((bettor) => <MenuItem key={bettor.player.display} value={bettor.player.display}>{bettor.player.display}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {selected && (
        <>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}><MetricCard label="Rank" value={`#${showCell(selected.rank, '—')}`} icon={<LeaderboardRoundedIcon />} /></Grid>
            <Grid item xs={12} sm={4}><MetricCard label="Season winnings" value={formatCurrency(selected.winnings)} icon={<PaidRoundedIcon />} color="success.main" /></Grid>
            <Grid item xs={12} sm={4}><MetricCard label="Scoring periods" value={String(activePeriods.length)} icon={<TimelineRoundedIcon />} color="primary.light" /></Grid>
          </Grid>

          <Card>
            <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
              <Typography variant="h5">{selected.player.display}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>Weekly and postseason results</Typography>
              <PeriodCards periods={selected.periods} />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent sx={{ p: { xs: 0, md: 1 }, '&:last-child': { pb: { xs: 0, md: 1 } } }}>
          <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
            <Typography variant="h5">Leaderboard</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Current cumulative winnings</Typography>
          </Box>
          {desktop ? (
            <TableContainer>
              <Table aria-label="Season earnings leaderboard">
                <TableHead>
                  <TableRow><TableCell>Rank</TableCell><TableCell>Player</TableCell><TableCell align="right">Winnings</TableCell><TableCell>Latest result</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {bettors.map((bettor) => {
                    const latest = [...bettor.periods].reverse().find((period) => period.value.display !== '');
                    return (
                      <TableRow key={bettor.player.display} hover onClick={() => setSelectedName(bettor.player.display)} sx={{ cursor: 'pointer' }}>
                        <TableCell><Chip size="small" label={`#${showCell(bettor.rank)}`} /></TableCell>
                        <TableCell sx={{ fontWeight: 750 }}>{bettor.player.display}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{formatCurrency(bettor.winnings)}</TableCell>
                        <TableCell>{latest ? `${latest.label}: ${formatCurrency(latest.value)}` : 'No results'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <List disablePadding>
              {bettors.map((bettor, index) => (
                <ListItem key={bettor.player.display} divider={index < bettors.length - 1} onClick={() => setSelectedName(bettor.player.display)} sx={{ px: 2.25, minHeight: 68 }}>
                  <ListItemAvatar><Avatar sx={{ bgcolor: 'primary.main', fontSize: 13, fontWeight: 800 }}>{initials(bettor.player.display)}</Avatar></ListItemAvatar>
                  <ListItemText primary={bettor.player.display} secondary={`Rank #${showCell(bettor.rank)}`} primaryTypographyProps={{ fontWeight: 750 }} />
                  <Typography fontWeight={800} color={(cellNumber(bettor.winnings) || 0) >= 0 ? 'success.main' : 'error.main'}>{formatCurrency(bettor.winnings)}</Typography>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
