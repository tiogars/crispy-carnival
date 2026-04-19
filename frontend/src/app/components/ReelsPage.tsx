import ExtensionIcon from '@mui/icons-material/Extension';
import { Box, Button, Card, CardActionArea, CardContent, Grid, Paper, Typography } from '@mui/material';

import type { Film, Reel } from '../App.types';

type ReelsPageProps = {
  film: Film | null;
  reels: Reel[];
  isLoading: boolean;
  selectedReelId: string;
  onUploadVideo: () => void;
  onExtractSelectedReel: () => void;
  onSelectReel: (reelId: string) => void;
};

export const ReelsPage = ({
  film,
  reels,
  isLoading,
  selectedReelId,
  onUploadVideo,
  onExtractSelectedReel,
  onSelectReel,
}: Readonly<ReelsPageProps>) => {
  if (!film) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        }}
      >
        <Typography color="text.secondary">Select a film to view reels.</Typography>
      </Paper>
    );
  }

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
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Reels
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {film.displayName}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={onUploadVideo} disabled={isLoading}>
              Upload video
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExtensionIcon />}
              onClick={onExtractSelectedReel}
              disabled={isLoading || !selectedReelId}
            >
              Extract sequence
            </Button>
          </Box>
        </Box>
      </Paper>

      {reels.length === 0 ? (
        <Paper
          sx={{
            padding: 4,
            textAlign: 'center',
            borderRadius: 1.5,
            boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
          }}
        >
          <Typography color="text.secondary">
            No reels yet. Upload a video to import a reel, or extract sequences from a witness video.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {reels.map((reel) => (
            <Grid key={reel.id} size={{ xs: 12, sm: 6, md: 4 }}>
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
                <CardActionArea onClick={() => onSelectReel(reel.id)}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        marginBottom: 1,
                      }}
                    >
                      {reel.id}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {reel.frameCount} frames
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
