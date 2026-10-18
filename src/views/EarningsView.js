import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import MetricCard from '../components/MetricCard';
import { formatCurrency, showCell, valueTone } from '../data/formatters';

function PeriodCards({ periods }) {
  return (
    <Grid container spacing={1.25}>
      {periods.map((period) => (
        <Grid item xs={6} sm={4} md={3} key={period.key} sx={{ minWidth: 0 }}>
          <Box sx={{ p: 1.75, bgcolor: 'background.default', borderRadius: 2.5, minHeight: 82 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{period.label}</Typography>
            <Typography variant="h6" sx={{ mt: 0.5, overflowWrap: 'anywhere' }} color={valueTone(period.value) === 'default' ? 'text.primary' : `${valueTone(period.value)}.main`}>
              {formatCurrency(period.value)}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

export default function EarningsView({ tab }) {
  const { bettors } = tab.data;
  const [selectedName, setSelectedName] = useState(bettors[0]?.player.display || '');
  const selected = useMemo(
    () => bettors.find((bettor) => bettor.player.display === selectedName) || bettors[0],
    [bettors, selectedName],
  );
  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box sx={{ minWidth: 0 }}>
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
            <Grid item xs={12} sm={6}><MetricCard label="Rank" value={`#${showCell(selected.rank, '—')}`} icon={<LeaderboardRoundedIcon />} /></Grid>
            <Grid item xs={12} sm={6}><MetricCard label="Season winnings" value={formatCurrency(selected.winnings)} icon={<PaidRoundedIcon />} color="success.main" /></Grid>
          </Grid>

          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>{selected.player.display}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>Weekly and postseason results</Typography>
              <PeriodCards periods={selected.periods} />
            </CardContent>
          </Card>
        </>
      )}

    </Stack>
  );
}
