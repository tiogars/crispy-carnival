import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Player } from '@remotion/player';
import { useState } from 'react';

import type { Film, Reel } from '../App.types';
import { FilmSequenceComposition } from '../../features/film-viewer/FilmSequenceComposition';
import { ImageStepPlayer } from '../../features/film-viewer/ImageStepPlayer';

type ReelDetailPageProps = {
  film: Film | null;
  reel: Reel | null;
  frameUrls: string[];
  isLoading: boolean;
};

export const ReelDetailPage = ({
  film,
  reel,
  frameUrls,
  isLoading,
}: Readonly<ReelDetailPageProps>) => {
  const [playerMode, setPlayerMode] = useState<'animated' | 'step'>('animated');

  const handlePlayerModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'animated' | 'step' | null) => {
    if (newMode !== null) {
      setPlayerMode(newMode);
    }
  };

  if (!film || !reel) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        }}
      >
        <Typography color="text.secondary">Select a reel to view frames.</Typography>
      </Paper>
    );
  }

  const durationInFrames = frameUrls.length > 0 ? frameUrls.length : 1;

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
        <Typography variant="h5" sx={{ fontWeight: 600, marginBottom: 1 }}>
          {reel.id}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ marginBottom: 1 }}>
          {film.displayName}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {reel.frameCount} frames
        </Typography>
      </Paper>

      <Paper
        component="section"
        sx={{
          background: '#101418',
          borderRadius: 1.5,
          padding: 2,
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
          <ToggleButtonGroup
            value={playerMode}
            exclusive
            onChange={handlePlayerModeChange}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              '& .MuiToggleButton-root': {
                color: '#90caf9',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(144, 202, 249, 0.2)',
                  color: '#fff',
                },
              },
            }}
          >
            <ToggleButton value="animated" aria-label="animated player">
              Animated
            </ToggleButton>
            <ToggleButton value="step" aria-label="step player">
              Step
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {playerMode === 'animated' ? (
          <Player
            acknowledgeRemotionLicense
            component={FilmSequenceComposition}
            inputProps={{ frameUrls }}
            durationInFrames={durationInFrames}
            compositionWidth={1280}
            compositionHeight={720}
            fps={24}
            controls
            autoPlay={false}
            loop
            style={{ aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden' }}
          />
        ) : (
          <ImageStepPlayer frameUrls={frameUrls} />
        )}

        <Typography color="text.secondary" sx={{ marginTop: 1 }}>
          {isLoading ? 'Loading...' : `Loaded ${frameUrls.length} frame(s) for playback.`}
        </Typography>
      </Paper>
    </Box>
  );
};
