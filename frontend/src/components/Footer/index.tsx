import { Box, Container, Typography } from '@mui/material';

export const Footer = () => {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}>
      <Container>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Copyright Tiogars 2026
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Powered by React, Vite, TypeScript, and Material UI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
