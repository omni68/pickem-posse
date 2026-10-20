import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Container, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import EarningsView from './views/EarningsView';
import ScoreboardView from './views/ScoreboardView';
import SheetView from './views/SheetView';
import WeekView from './views/WeekView';
import { loadLatestWorkbook } from './data/workbookLoader';
import './App.css';

const dataUrl = `${process.env.PUBLIC_URL || ''}/data/workbook.json`;
const metadataUrl = `${process.env.PUBLIC_URL || ''}/data/workbook-meta.json`;
const loadingArtUrl = `${process.env.PUBLIC_URL || ''}/assets/loading-posse.png`;
export const MINIMUM_LOADING_MS = 700;
const loadingMessages = [
  'Rounding up the picks…',
  'Arguing with the spreadsheet…',
  'Counting questionable decisions…',
  'Checking the commissioner’s math…',
];

function StartupFrame({ children }) {
  return (
    <Box className="startup-page">
      <Box component="header" className="startup-header">
        <Container maxWidth="lg">
          <Typography className="startup-brand" component="h1">
            PICK&apos;EM POSSE
          </Typography>
        </Container>
      </Box>
      <Container maxWidth="sm" component="main" className="startup-content">
        {children}
      </Container>
    </Box>
  );
}

function LoadingState() {
  return (
    <StartupFrame>
      <Paper className="loading-card" role="status" aria-label="Loading the Pick'em Posse scoreboard">
        <Box className="loading-art-stage" aria-hidden="true">
          <Box className="loading-callout loading-callout-lock">LOCK?</Box>
          <Box className="loading-callout loading-callout-spread">THE SPREAD</Box>
          <Box
            component="img"
            src={loadingArtUrl}
            alt=""
            className="loading-posse-art"
          />
          <Box className="loading-art-shadow" />
        </Box>
        <Stack spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h5" component="p">Fetching the latest chaos</Typography>
          <Box className="loading-messages" aria-hidden="true">
            {loadingMessages.map((message) => (
              <Typography color="text.secondary" className="loading-message" key={message}>
                {message}
              </Typography>
            ))}
          </Box>
          <LinearProgress aria-label="Loading scoreboard data" className="loading-progress" />
        </Stack>
      </Paper>
    </StartupFrame>
  );
}

function TabRoute({ workbook }) {
  const { tabSlug } = useParams();
  const navigate = useNavigate();
  const tab = workbook.tabs.find((candidate) => candidate.slug === tabSlug) || workbook.tabs[0];

  return (
    <AppShell workbook={workbook} currentTab={tab} onTabChange={(nextTab) => navigate(`/tab/${nextTab.slug}`)}>
      {tab.type === 'scoreboard' && <ScoreboardView tab={tab} workbook={workbook} />}
      {tab.type === 'earnings' && <EarningsView tab={tab} />}
      {tab.type === 'week' && <WeekView tab={tab} workbook={workbook} />}
      {tab.type === 'sheet' && <SheetView tab={tab} />}
    </AppShell>
  );
}

function AppContent() {
  const [workbook, setWorkbook] = useState(null);
  const [error, setError] = useState('');
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadingTimer = window.setTimeout(() => setMinimumLoadingElapsed(true), MINIMUM_LOADING_MS);
    loadLatestWorkbook({
      dataUrl,
      metadataUrl,
      fetchImpl: (url, options = {}) => fetch(url, { ...options, signal: controller.signal }),
    })
      .then((payload) => setWorkbook(payload))
      .catch((reason) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      });
    return () => {
      controller.abort();
      window.clearTimeout(loadingTimer);
    };
  }, []);

  const firstTabPath = useMemo(
    () => (workbook?.tabs?.[0] ? `/tab/${workbook.tabs[0].slug}` : '/'),
    [workbook],
  );

  if (!minimumLoadingElapsed) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <StartupFrame>
        <Alert severity="error" variant="outlined" sx={{ width: '100%', bgcolor: 'background.paper' }}>
          Could not load the scoreboard. {error}
        </Alert>
      </StartupFrame>
    );
  }

  if (!workbook) {
    return <LoadingState />;
  }

  return (
    <Box className="app-ready">
      <Routes>
        <Route path="/tab/:tabSlug" element={<TabRoute workbook={workbook} />} />
        <Route path="*" element={<Navigate to={firstTabPath} replace />} />
      </Routes>
    </Box>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
