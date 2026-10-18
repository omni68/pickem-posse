import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { GameOfTheWeekDetails } from './WeekView';
import theme from '../theme';

const cell = (raw) => ({ raw, display: raw === '' ? '' : String(raw) });

test('renders jackpot status when no individual player is selected', () => {
  render(
    <ThemeProvider theme={theme}>
      <GameOfTheWeekDetails
        game={{ winner: cell('Away'), away: cell('Away'), home: cell('Home') }}
        selectedPrediction={undefined}
        jackpotResult={{ winners: [], rolloverWeeks: 3 }}
        jackpotTotal={cell(51)}
      />
    </ThemeProvider>,
  );

  expect(screen.getByText('No winner · 3 weeks’ worth in the jackpot')).toBeInTheDocument();
  expect(screen.queryByText(/prediction/i)).not.toBeInTheDocument();
});
