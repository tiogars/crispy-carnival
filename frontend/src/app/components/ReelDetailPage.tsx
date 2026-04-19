import { Box, Button, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExtensionIcon from '@mui/icons-material/Extension';
import { Player } from '@remotion/player';
import { useEffect, useState } from 'react';

import type { Film, Reel } from '../App.types';
import { FilmSequenceComposition } from '../../features/film-viewer/FilmSequenceComposition';
import { ImageStepPlayer } from '../../features/film-viewer/ImageStepPlayer';

const getVideoMimeType = (fileNameOrUrl: string | null | undefined) => {
  if (!fileNameOrUrl) {
    return undefined;
  }

  const normalizedValue = fileNameOrUrl.split('?')[0]?.toLowerCase() ?? '';

  if (normalizedValue.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (normalizedValue.endsWith('.mp4')) {
    return 'video/mp4';
  }

  if (normalizedValue.endsWith('.m4v')) {
    return 'video/x-m4v';
  }

  if (normalizedValue.endsWith('.webm')) {
    return 'video/webm';
  }

  if (normalizedValue.endsWith('.avi')) {
    return 'video/x-msvideo';
  }

  if (normalizedValue.endsWith('.mkv')) {
    return 'video/x-matroska';
  }

  return undefined;
};

type ReelDetailPageProps = {
  film: Film | null;
  reel: Reel | null;
  frameUrls: string[];
  isLoading: boolean;
  isDeleting: boolean;
  isExtracting: boolean;
  onDelete: () => void;
  onExtractSequence: () => void;
};

export const ReelDetailPage = ({
  film,
  reel,
  frameUrls,
  isLoading,
  isDeleting,
  isExtracting,
  onDelete,
  onExtractSequence,
}: Readonly<ReelDetailPageProps>) => {
  const hasFrames = frameUrls.length > 0;
  const hasSourceVideo = Boolean(reel?.sourceVideoUrl);
  const defaultPlayerMode = hasFrames ? 'animated' : 'source';
  const [playerMode, setPlayerMode] = useState<'animated' | 'source' | 'step'>(defaultPlayerMode);
  const [hasSourceVideoError, setHasSourceVideoError] = useState(false);

  useEffect(() => {
    setPlayerMode(defaultPlayerMode);
    setHasSourceVideoError(false);
  }, [defaultPlayerMode, reel?.id, reel?.sourceVideoUrl]);

  const handlePlayerModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'animated' | 'source' | 'step' | null,
  ) => {
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

  const durationInFrames = hasFrames ? frameUrls.length : 1;
  const sourceVideoMimeType = getVideoMimeType(reel.sourceVideoName ?? reel.sourceVideoUrl);
  const shouldSuggestFrameExtraction = playerMode === 'source' && hasSourceVideoError;

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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1,
            marginBottom: 1,
            flexWrap: 'wrap',
          }}
        >
          {reel.sourceVideoUrl ? (
            <Button
              component="a"
              href={reel.sourceVideoUrl}
              target="_blank"
              rel="noreferrer"
              variant="contained"
              color="info"
              size="small"
            >
              Open source video
            </Button>
          ) : null}
          <Button
            variant="contained"
            size="small"
            startIcon={<ExtensionIcon />}
            onClick={onExtractSequence}
            disabled={isExtracting}
          >
            Extract sequence
          </Button>
          <Button
            variant="contained"
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={onDelete}
            disabled={isDeleting}
          >
            Delete video
          </Button>
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
            {hasSourceVideo ? (
              <ToggleButton value="source" aria-label="source video player">
                Source video
              </ToggleButton>
            ) : null}
            <ToggleButton value="animated" aria-label="animated player">
              Animated
            </ToggleButton>
            <ToggleButton value="step" aria-label="step player">
              Step
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {playerMode === 'source' && hasSourceVideo ? (
          <Box
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="video"
              controls
              preload="metadata"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={() => setHasSourceVideoError(true)}
              onLoadedData={() => setHasSourceVideoError(false)}
            >
              <source src={reel.sourceVideoUrl ?? undefined} type={sourceVideoMimeType} />
            </Box>
          </Box>
        ) : playerMode === 'animated' ? (
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

        {shouldSuggestFrameExtraction ? (
          <Box
            sx={{
              marginTop: 1,
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <Typography variant="body2" sx={{ color: '#ffb4ab' }}>
              This browser could not decode the source video. Open the direct file to inspect it, or extract frames from the file to continue working with this reel.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExtensionIcon />}
              onClick={onExtractSequence}
              disabled={isExtracting}
            >
              Extract frames from file
            </Button>
          </Box>
        ) : null}

        <Box
          sx={{
            marginTop: 1,
            padding: 1.25,
            borderRadius: 1,
            backgroundColor: '#121a24',
            border: '1px solid rgba(144, 202, 249, 0.28)',
            display: 'grid',
            gap: 0.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 700 }}>
            Details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(90px, auto) 1fr', columnGap: 1, rowGap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Reel
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe', wordBreak: 'break-word' }}>
              {reel.id}
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Film
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe' }}>
              {film.displayName}
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Frames
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe' }}>
              {reel.frameCount}
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Source video
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe', wordBreak: 'break-word' }}>
              {reel.sourceVideoName ?? 'Unavailable'}
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Playback
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe' }}>
              {isLoading
                ? 'Loading...'
                : hasFrames
                  ? `Loaded ${frameUrls.length} frame(s) for playback.`
                  : reel.sourceVideoUrl
                    ? 'Playing the reel source video directly.'
                    : 'No playback media available.'}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
