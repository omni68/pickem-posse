import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#18233A', light: '#31405F', contrastText: '#FFFFFF' },
    secondary: { main: '#E9652B', dark: '#B84318', contrastText: '#FFFFFF' },
    success: { main: '#16835F' },
    warning: { main: '#C67A13' },
    background: { default: '#F4F6FA', paper: '#FFFFFF' },
    text: { primary: '#152033', secondary: '#68738A' },
    divider: '#E4E8F0',
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.04em' },
    h2: { fontWeight: 800, letterSpacing: '-0.035em' },
    h3: { fontWeight: 750, letterSpacing: '-0.025em' },
    h4: { fontWeight: 750, letterSpacing: '-0.02em' },
    h5: { fontWeight: 750, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: '1px solid #E4E8F0' } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiButtonBase: { defaultProps: { disableRipple: false } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
});

export default theme;
