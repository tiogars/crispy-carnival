import { Box, Button, Card, CardActionArea, CardContent, Grid, Paper, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';

import type { Film, UploadWitnessVideoResponse } from '../App.types';

type WitnessesPageProps = {
  film: Film | null;
  witnessVideos: UploadWitnessVideoResponse[];
  isLoading: boolean;
  onUploadWitness: () => void;
  onSelectWitness: (fileName: string) => void;
};

export const WitnessesPage = ({
  film,
  witnessVideos,
  isLoading,
  onUploadWitness,
  onSelectWitness,
}: Readonly<WitnessesPageProps>) => {
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
        <Typography color="text.secondary">Select a film to view witnesses.</Typography>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Witnesses
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {film.displayName}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<UploadIcon />}
          onClick={onUploadWitness}
          disabled={isLoading}
        >
          Upload Video
        </Button>
      </Paper>

      {witnessVideos.length === 0 ? (
        <Paper
          sx={{
            padding: 4,
            textAlign: 'center',
            borderRadius: 1.5,
            boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
          }}
        >
          <Typography color="text.secondary" sx={{ marginBottom: 2 }}>
            No witness videos yet. Upload your first video to get started.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<UploadIcon />}
            onClick={onUploadWitness}
            disabled={isLoading}
          >
            Upload Video
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {witnessVideos.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={video.fileName}>
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
                <CardActionArea onClick={() => onSelectWitness(video.fileName)}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        marginBottom: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {video.fileName}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Size: {(video.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
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
