import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { GameCard, GameOfTheWeekDetails, LiveScoreMatchDialog } from './WeekView';
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

test('lets the user confirm an ambiguous ESPN matchup', () => {
  const onSelect = jest.fn();
  const candidate = {
    score: 0.86,
    event: {
      id: '401872997',
      key: 'nfl:401872997',
      league: 'nfl',
      startTime: '2026-10-18T17:00:00.000Z',
      away: { team: { displayName: 'Baltimore Ravens' } },
      home: { team: { displayName: 'Cleveland Browns' } },
      status: { state: 'post', completed: true },
    },
  };

  render(
    <ThemeProvider theme={theme}>
      <LiveScoreMatchDialog
        game={{ away: cell('Baltimore'), home: cell('Cleveland') }}
        match={{ candidates: [candidate] }}
        open
        onClose={jest.fn()}
        onSelect={onSelect}
      />
    </ThemeProvider>,
  );

  expect(screen.getByRole('heading', { name: 'Choose the live score' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Baltimore Ravens at Cleveland Browns/i }));
  expect(onSelect).toHaveBeenCalledWith(candidate.event);
});

test('highlights the live ATS leader without covering game information', () => {
  const game = {
    row: 14,
    date: cell('2026-10-18T00:00:00.000Z'),
    time: cell('1899-12-30T12:00:00.000Z'),
    away: cell('Baltimore'),
    home: cell('Cleveland'),
    homeSpread: cell(-3.5),
    dollarsAway: cell(10),
    dollarsHome: cell(10),
    scoreAway: cell(''),
    scoreHome: cell(''),
    winner: cell(''),
    picks: [],
    isGameOfTheWeek: false,
  };
  const liveEvent = {
    league: 'nfl',
    away: { score: '17' },
    home: { score: '20' },
    status: { state: 'in', completed: false, shortDetail: '4:12 - 4th' },
  };

  render(
    <ThemeProvider theme={theme}>
      <GameCard
        game={game}
        selectedBettor="all"
        liveMatch={{ status: 'automatic', event: liveEvent }}
        liveScoresReady
        onChooseLiveScore={jest.fn()}
      />
    </ThemeProvider>,
  );

  const watermark = screen.getByText('Currently covering…');
  expect(watermark.parentElement).toHaveStyle('background-color: rgba(88, 204, 112, 0.34)');
  expect(screen.getByText('Baltimore')).toBeInTheDocument();
  expect(screen.getByText('17')).toBeInTheDocument();
});

test('labels the spreadsheet ATS winner as covered', () => {
  const game = {
    row: 8,
    date: cell('2026-10-17T00:00:00.000Z'),
    time: cell('1899-12-30T12:00:00.000Z'),
    away: cell('Texas'),
    home: cell('Oklahoma'),
    homeSpread: cell(3),
    dollarsAway: cell(12),
    dollarsHome: cell(12),
    scoreAway: cell(24),
    scoreHome: cell(17),
    winner: cell('Texas'),
    picks: [],
    isGameOfTheWeek: false,
  };

  render(
    <ThemeProvider theme={theme}>
      <GameCard game={game} selectedBettor="all" onChooseLiveScore={jest.fn()} />
    </ThemeProvider>,
  );

  expect(screen.getByText('Covered')).toBeInTheDocument();
});

test('lists weekly participants who are missing a pick for the game', () => {
  const game = {
    row: 9,
    date: cell('2026-10-17T00:00:00.000Z'),
    time: cell('1899-12-30T14:30:00.000Z'),
    away: cell('Penn State'),
    home: cell('Michigan'),
    homeSpread: cell(-6.5),
    dollarsAway: cell(10),
    dollarsHome: cell(10),
    scoreAway: cell(''),
    scoreHome: cell(''),
    winner: cell(''),
    picks: [
      { bettor: cell('Alex'), side: 'away', payout: cell('') },
      { bettor: cell('Bailey'), side: null, payout: cell('') },
      { bettor: cell('Casey'), side: 'home', payout: cell('') },
    ],
    isGameOfTheWeek: false,
  };

  render(
    <ThemeProvider theme={theme}>
      <GameCard
        game={game}
        selectedBettor="all"
        weeklyPlayers={['Alex', 'Bailey', 'Casey']}
        onChooseLiveScore={jest.fn()}
      />
    </ThemeProvider>,
  );

  expect(screen.getByText('Missing Pick:')).toBeInTheDocument();
  expect(screen.getByText('Bailey')).toBeInTheDocument();
});
