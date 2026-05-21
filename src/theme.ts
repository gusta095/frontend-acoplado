import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#003087', light: '#0050B3', dark: '#001f5c', contrastText: '#fff' },
    secondary: { main: '#0050B3', contrastText: '#fff' },
    background: { default: '#F4F6F9', paper: '#FFFFFF' },
    text: { primary: '#0A1628', secondary: '#4A5568' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 6, padding: '8px 20px' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #003087 0%, #0050B3 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #001f5c 0%, #003087 100%)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #E2E8F0',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,48,135,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0050B3' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#003087' },
        },
      },
    },
  },
});
