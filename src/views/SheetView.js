import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

const columnName = (index) => {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

export default function SheetView({ tab }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const rows = tab.grid
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.some((value) => value != null && value !== ''));
  return (
    <Card>
      <CardContent sx={{ p: { xs: 0, sm: 1 }, '&:last-child': { pb: { xs: 0, sm: 1 } } }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
          <Typography variant="h5">Sheet details</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Every populated workbook value, organized by source row.</Typography>
        </Box>
        {desktop ? (
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table size="small" stickyHeader aria-label={`${tab.title} workbook values`}>
              <TableBody>
                {rows.map(({ row, index }) => (
                  <TableRow key={index}>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', fontWeight: 800 }}>{index + 1}</TableCell>
                    {row.map((value, columnIndex) => <TableCell key={columnIndex} sx={{ whiteSpace: 'nowrap' }}>{value ?? ''}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Stack spacing={1.25} sx={{ px: 1.5, pb: 1.5 }}>
            {rows.map(({ row, index }) => (
              <Box key={index} sx={{ p: 1.75, bgcolor: 'background.default', borderRadius: 2.5 }}>
                <Chip size="small" label={`Row ${index + 1}`} sx={{ mb: 1.25 }} />
                <Stack spacing={0.75}>
                  {row.map((value, columnIndex) => value != null && value !== '' ? (
                    <Stack direction="row" spacing={1.25} key={columnIndex} alignItems="baseline" sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ minWidth: 28 }}>{columnName(columnIndex)}</Typography>
                      <Typography variant="body2" sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{value}</Typography>
                    </Stack>
                  ) : null)}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
