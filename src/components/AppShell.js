import { useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  Fab,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  SwipeableDrawer,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';

const tabIcon = (type) => {
  if (type === 'scoreboard') return <EmojiEventsRoundedIcon />;
  if (type === 'earnings') return <LeaderboardRoundedIcon />;
  if (type === 'week') return <CalendarMonthRoundedIcon />;
  return <TableRowsRoundedIcon />;
};

export default function AppShell({ workbook, currentTab, onTabChange, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const generated = new Date(workbook.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime())
    ? 'Workbook snapshot'
    : `Updated ${generated.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const selectTab = (tab) => {
    onTabChange(tab);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', pb: 'calc(104px + env(safe-area-inset-bottom))' }}>
      <Box
        component="header"
        sx={{
          color: 'primary.contrastText',
          background: 'linear-gradient(140deg, #10192D 0%, #243557 72%, #31486F 100%)',
          pt: 'max(28px, env(safe-area-inset-top))',
          pb: { xs: 7, sm: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.72, letterSpacing: '0.16em', fontWeight: 800 }}>
                PICK&apos;EM POSSE
              </Typography>
              <Typography variant="h3" component="h1" sx={{ mt: 0.5, fontSize: { xs: '2rem', sm: '2.65rem' } }}>
                {currentTab.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.72 }}>{generatedLabel}</Typography>
            </Box>
            <Chip label={`${workbook.tabs.length} sheets`} sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'inherit', mt: 0.5 }} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ mt: { xs: -4, sm: -5 } }}>{children}</Container>

      <Fab
        color="secondary"
        aria-label="Open workbook navigation"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        sx={{
          position: 'fixed',
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          right: 'max(20px, calc(env(safe-area-inset-right) + 16px))',
          bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 16px))',
          width: 60,
          height: 60,
          boxShadow: '0 14px 35px rgba(131, 53, 18, 0.35)',
        }}
      >
        <MenuRoundedIcon fontSize="large" />
      </Fab>

      <SwipeableDrawer
        anchor="right"
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        disableDiscovery
        PaperProps={{
          sx: {
            width: { xs: 'min(88vw, 380px)', sm: 400 },
            borderRadius: '24px 0 0 24px',
            pb: 'calc(92px + env(safe-area-inset-bottom))',
          },
        }}
      >
        <Box sx={{ p: 3, pt: 'max(28px, env(safe-area-inset-top))' }}>
          <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: '0.14em', fontWeight: 800 }}>Workbook</Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>{workbook.source.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Choose a sheet to explore.</Typography>
        </Box>
        <Divider />
        <List sx={{ px: 1.5, py: 2 }}>
          {workbook.tabs.map((tab) => (
            <ListItemButton
              key={tab.id}
              selected={tab.slug === currentTab.slug}
              onClick={() => selectTab(tab)}
              sx={{ borderRadius: 2.5, minHeight: 58, mb: 0.5 }}
            >
              <ListItemAvatar sx={{ minWidth: 48 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: tab.slug === currentTab.slug ? 'secondary.main' : 'action.hover',
                    color: tab.slug === currentTab.slug ? 'secondary.contrastText' : 'text.secondary',
                  }}
                >
                  {tabIcon(tab.type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={tab.title}
                secondary={`${tab.dimensions.rows} rows · ${tab.dimensions.columns} columns`}
                primaryTypographyProps={{ fontWeight: 750 }}
              />
            </ListItemButton>
          ))}
        </List>
      </SwipeableDrawer>
    </Box>
  );
}
