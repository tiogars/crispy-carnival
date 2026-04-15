import { Box, Typography } from '@mui/material';

export const AppFooter = () => {
  return (
    <Box
      component="footer"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
        padding: '0 1rem 1rem',
        color: '#546e7a',
        fontSize: '0.95rem',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Typography variant="body2" sx={{ margin: 0 }}>
        Tiogars 2026
      </Typography>
      <Typography variant="body2" sx={{ margin: 0 }}>
        Frontend served through Vite and Nginx development proxy.
      </Typography>
    </Box>
  );
};
