import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MetricCard from '../components/MetricCard';
import { formatCurrency, initials, showCell } from '../data/formatters';

const rankColor = (index) => (['#E9652B', '#73809A', '#A96C3D'][index] || '#E9EDF4');

function PlayerCards({ players }) {
  return (
    <Stack spacing={1} sx={{ px: 1.5, pb: 1.5 }}>
      {players.map((player) => (
        <Box key={player.player.display} sx={{ p: 1.75, bgcolor: 'background.default', borderRadius: 2.5 }}>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Avatar sx={{ bgcolor: 'primary.main', fontSize: 13, fontWeight: 800 }}>{initials(player.player.display)}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800}>{player.player.display}</Typography>
                {player.quitter.display && <Chip size="small" color="warning" label="Quitter" />}
              </Stack>
              <Link href={`mailto:${player.email.display}`} color="text.secondary" variant="body2" underline="hover" sx={{ overflowWrap: 'anywhere' }}>{showCell(player.email)}</Link>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Paid {formatCurrency(player.amountPaid)} via {showCell(player.method)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography fontWeight={800}>{formatCurrency(player.totalPayout)}</Typography>
              <Typography variant="caption" color="text.secondary">total payout</Typography>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export default function ScoreboardView({ tab }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const { summary, standings, players } = tab.data;

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={4}><MetricCard label="Jackpot" value={formatCurrency(summary.jackpotTotal)} icon={<SavingsRoundedIcon />} /></Grid>
        <Grid item xs={12} sm={4}><MetricCard label="Qualifiers" value={showCell(summary.qualifiers, '0')} icon={<EmojiEventsRoundedIcon />} color="success.main" /></Grid>
        <Grid item xs={12} sm={4}><MetricCard label="Players" value={String(summary.playerCount)} icon={<Groups2RoundedIcon />} color="primary.light" /></Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: { xs: 0, sm: 1 }, '&:last-child': { pb: { xs: 0, sm: 1 } } }}>
          <Box sx={{ px: { xs: 2.25, sm: 2.5 }, pt: 2.5, pb: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box><Typography variant="h5">Standings</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Ranked by total payout</Typography></Box>
              <Chip label={`${players.length} players`} variant="outlined" />
            </Stack>
          </Box>
          <List disablePadding>
            {standings.map((entry, index) => (
              <ListItem key={`${entry.player.display}-${entry.row}`} divider={index < standings.length - 1} sx={{ minHeight: 68, px: { xs: 2.25, sm: 2.5 } }}>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: rankColor(index), color: index < 3 ? '#FFFFFF' : 'text.primary', fontSize: 14, fontWeight: 800 }}>{index + 1}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={entry.player.display} primaryTypographyProps={{ fontWeight: 750 }} />
                <Typography fontWeight={800}>{formatCurrency(entry.totalPayout)}</Typography>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 0, md: 1 }, '&:last-child': { pb: { xs: 0, md: 1 } } }}>
          <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
            <Typography variant="h5">Player ledger</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Payments, winnings, and contact details</Typography>
          </Box>
          {desktop ? (
            <TableContainer>
              <Table aria-label="Player payment and winnings ledger">
                <TableHead>
                  <TableRow><TableCell>Player</TableCell><TableCell>Email</TableCell><TableCell>Payment</TableCell><TableCell align="right">Paid</TableCell><TableCell align="right">Winnings</TableCell><TableCell align="right">Total payout</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.player.display}>
                      <TableCell><Stack direction="row" alignItems="center" spacing={1}><Typography fontWeight={750}>{player.player.display}</Typography>{player.quitter.display && <Chip size="small" color="warning" label="Quitter" />}</Stack></TableCell>
                      <TableCell><Link href={`mailto:${player.email.display}`} color="inherit" underline="hover">{showCell(player.email)}</Link></TableCell>
                      <TableCell>{showCell(player.method)}</TableCell>
                      <TableCell align="right">{formatCurrency(player.amountPaid)}</TableCell>
                      <TableCell align="right">{formatCurrency(player.totalWinnings)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{formatCurrency(player.totalPayout)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : <PlayerCards players={players} />}
        </CardContent>
      </Card>
    </Stack>
  );
}
