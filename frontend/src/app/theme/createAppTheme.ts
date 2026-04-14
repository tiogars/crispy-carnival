import { createTheme } from '@mui/material/styles';

import type { ThemeMode } from '../../models/AppData/types/domain';

export function createAppTheme(mode: ThemeMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#80cbc4' : '#0d47a1',
      },
      secondary: {
        main: mode === 'dark' ? '#ffcc80' : '#1565c0',
      },
      error: {
        main: '#b71c1c',
      },
      background: {
        default: mode === 'dark' ? '#0f1720' : 'linear-gradient(135deg, #eceff1 0%, #dfe5eb 100%)',
        paper: mode === 'dark' ? '#17212b' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#eceff1' : '#000000',
        secondary: mode === 'dark' ? '#b0bec5' : '#546e7a',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
      h1: {
        fontSize: '1.9rem',
        lineHeight: 1.1,
        margin: 0,
      },
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontSize: '1.25rem',
        margin: 0,
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
      body2: {
        fontSize: '0.95rem',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
            minHeight: '2rem',
            padding: '0 0.85rem',
            textTransform: 'none',
            '&.Mui-disabled': {
              pointerEvents: 'auto',
            },
          },
          containedPrimary: {
            backgroundColor: '#0d47a1',
            '&:hover': {
              backgroundColor: '#0d47a1',
            },
          },
          containedSecondary: {
            backgroundColor: '#1565c0',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          },
          containedError: {
            backgroundColor: '#b71c1c',
            '&:hover': {
              backgroundColor: '#b71c1c',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            minHeight: '2.25rem',
            borderRadius: 8,
            backgroundColor: mode === 'dark' ? 'transparent' : '#f8fbff',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });
}
