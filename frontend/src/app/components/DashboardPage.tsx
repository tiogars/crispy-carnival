import { Box, Button, Card, CardActionArea, CardContent, Grid, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import type { Film } from '../App.types';

type DashboardPageProps = {
  films: Film[];
  isLoading: boolean;
  onAddFilm: () => void;
  onSelectFilm: (filmId: string) => void;
};

export const DashboardPage = ({
  films,
  isLoading,
  onAddFilm,
  onSelectFilm,
}: Readonly<DashboardPageProps>) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
      }}
    >
      <Paper
        sx={{
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Films
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddFilm}
          disabled={isLoading}
        >
          Add Film
        </Button>
      </Paper>

      {films.length === 0 ? (
        <Paper
          sx={{
            padding: 4,
            textAlign: 'center',
            borderRadius: 1.5,
            boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
          }}
        >
          <Typography color="text.secondary" sx={{ marginBottom: 2 }}>
            No films yet. Create your first film to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddFilm}
            disabled={isLoading}
          >
            Create Film
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {films.map((film) => (
            <Grid key={film.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  borderRadius: 1.5,
                  boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(17, 25, 40, 0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea onClick={() => onSelectFilm(film.id)}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        marginBottom: 1,
                      }}
                    >
                      {film.displayName}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      ID: {film.id}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
