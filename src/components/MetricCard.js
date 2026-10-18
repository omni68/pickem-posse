import { Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function MetricCard({ label, value, icon, color = 'secondary.main', caption }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.75 } } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={{ xs: 1.25, sm: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>{label}</Typography>
            <Typography variant="h4" sx={{ mt: 0.5, fontSize: { xs: '1.65rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>{value}</Typography>
            {caption && <Typography variant="caption" color="text.secondary">{caption}</Typography>}
          </Box>
          {icon && <Avatar sx={{ flexShrink: 0, bgcolor: color, color: '#fff' }}>{icon}</Avatar>}
        </Stack>
      </CardContent>
    </Card>
  );
}
