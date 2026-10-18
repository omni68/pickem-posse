import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Container, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import EarningsView from './views/EarningsView';
import ScoreboardView from './views/ScoreboardView';
import SheetView from './views/SheetView';
import WeekView from './views/WeekView';
import './App.css';

const dataUrl = `${process.env.PUBLIC_URL || ''}/data/workbook.json`;
const loadingArtUrl = `${process.env.PUBLIC_URL || ''}/assets/loading-posse.png`;
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
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

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
          <Typography
            color="text.secondary"
            className="loading-message"
            key={loadingMessages[messageIndex]}
          >
            {loadingMessages[messageIndex]}
          </Typography>
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
      {tab.type === 'scoreboard' && <ScoreboardView tab={tab} />}
      {tab.type === 'earnings' && <EarningsView tab={tab} />}
      {tab.type === 'week' && <WeekView tab={tab} />}
      {tab.type === 'sheet' && <SheetView tab={tab} />}
    </AppShell>
  );
}

function AppContent() {
  const [workbook, setWorkbook] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(dataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Workbook request failed (${response.status})`);
        return response.json();
      })
      .then((payload) => setWorkbook(payload))
      .catch((reason) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      });
    return () => controller.abort();
  }, []);

  const firstTabPath = useMemo(
    () => (workbook?.tabs?.[0] ? `/tab/${workbook.tabs[0].slug}` : '/'),
    [workbook],
  );

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
    <Routes>
      <Route path="/tab/:tabSlug" element={<TabRoute workbook={workbook} />} />
      <Route path="*" element={<Navigate to={firstTabPath} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
