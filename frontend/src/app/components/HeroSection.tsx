import { Box, Typography } from '@mui/material';

export const HeroSection = () => {
  return (
    <Box
      sx={{
        padding: '1.25rem 1rem 0',
      }}
    >
      <Typography
        variant="overline"
        sx={{
          margin: 0,
          marginBottom: '0.35rem',
          color: '#546e7a',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          display: 'block',
        }}
      >
        Film Sequence Finder
      </Typography>
      <Typography
        variant="body1"
        sx={{
          margin: '0.5rem 0 0',
          maxWidth: '52rem',
          color: '#455a64',
        }}
      >
        Choose a film, inspect its original reels, and preview every scanned image frame.
      </Typography>
    </Box>
  );
};
