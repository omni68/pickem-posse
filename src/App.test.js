import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import App from './App';
import theme from './theme';

const workbook = {
  version: 1,
  generatedAt: '2026-10-18T00:00:00.000Z',
  source: { title: "2026 Pick'em Scoreboard", url: '' },
  tabs: [
    {
      id: '1',
      title: 'Scoreboard',
      slug: 'scoreboard',
      type: 'scoreboard',
      dimensions: { rows: 5, columns: 17 },
      grid: [],
      data: {
        summary: { jackpotTotal: { raw: 50, display: '$50' }, qualifiers: { raw: 1, display: '1' }, playerCount: 1 },
        standings: [{ row: 4, player: { raw: 'Alex Smith', display: 'Alex Smith' }, totalPayout: { raw: 125, display: '$125' } }],
        players: [{
          player: { raw: 'Alex Smith', display: 'Alex Smith' },
          amountPaid: { raw: 100, display: '$100' },
          method: { raw: 'Venmo', display: 'Venmo' },
          quitter: { raw: null, display: '' },
          email: { raw: 'alex@example.com', display: 'alex@example.com' },
          totalWinnings: { raw: 25, display: '$25' },
          totalPayout: { raw: 125, display: '$125' },
        }],
      },
    },
    {
      id: '2',
      title: 'Weekly Earnings',
      slug: 'weekly-earnings',
      type: 'earnings',
      dimensions: { rows: 5, columns: 5 },
      grid: [],
      data: { periods: [], bettors: [] },
    },
  ],
};

beforeEach(() => {
  window.location.hash = '';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => workbook });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows the animated posse while workbook data is loading', async () => {
  let resolveFetch;
  global.fetch = jest.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));

  render(<ThemeProvider theme={theme}><App /></ThemeProvider>);

  expect(screen.getByRole('heading', { name: "PICK'EM POSSE" })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: "Loading the Pick'em Posse scoreboard" })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Scoreboard' })).not.toBeInTheDocument();

  await act(async () => {
    resolveFetch({ ok: true, json: async () => workbook });
  });
  expect(await screen.findByRole('heading', { name: 'Scoreboard' })).toBeInTheDocument();
  expect(screen.getByText("PICK'EM POSSE")).toBeInTheDocument();
});

test('loads the scoreboard and exposes workbook navigation', async () => {
  render(<ThemeProvider theme={theme}><App /></ThemeProvider>);
  expect(await screen.findByRole('heading', { name: 'Scoreboard' })).toBeInTheDocument();
  expect(screen.getAllByText('Alex Smith').length).toBeGreaterThan(0);
  expect(screen.getByRole('table', { name: 'Standings' })).toBeInTheDocument();
  expect(screen.getAllByText('Payout $').length).toBeGreaterThan(0);
  expect(screen.queryByRole('heading', { name: 'Player ledger' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Analytics' })).not.toBeInTheDocument();

  fireEvent.mouseDown(screen.getByLabelText('View and sort by'));
  expect(await screen.findByRole('option', { name: 'Earnings $' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Best Payout $' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Worst Payout $' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Best Pick %' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Worst Pick %' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: 'Worst Payout $' }));
  expect(screen.getByRole('columnheader', { name: 'Worst Payout $' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sort descending' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Open workbook navigation' }));
  expect(await screen.findByText('Choose a sheet to explore.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Weekly Earnings/i })).toBeInTheDocument();
});

test('navigates to a workbook tab from the bottom-right menu', async () => {
  render(<ThemeProvider theme={theme}><App /></ThemeProvider>);
  await screen.findByRole('heading', { name: 'Scoreboard' });
  fireEvent.click(screen.getByRole('button', { name: 'Open workbook navigation' }));
  fireEvent.click(await screen.findByRole('button', { name: /Weekly Earnings/i }));
  await waitFor(() => expect(window.location.hash).toContain('/tab/weekly-earnings'));
  expect(await screen.findByRole('heading', { name: 'Weekly Earnings' })).toBeInTheDocument();
});
