import { Box, Button, FormControl, InputLabel, Link, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { Player } from '@remotion/player';

import { FilmSequenceComposition } from '../../features/film-viewer/FilmSequenceComposition';
import type { UploadWitnessVideoResponse } from '../App.types';

type FilmPreviewSectionProps = {
  frameUrls: string[];
  durationInFrames: number;
  selectedWitnessVideoUrl: string;
  witnessVideos: UploadWitnessVideoResponse[];
  selectedWitnessVideoEntry: UploadWitnessVideoResponse | null;
  isDeletingWitnessVideo: boolean;
  onDeleteSelectedWitnessVideo: () => void;
  onWitnessVideoChange: (videoUrl: string) => void;
};

export const FilmPreviewSection = ({
  frameUrls,
  durationInFrames,
  selectedWitnessVideoUrl,
  witnessVideos,
  selectedWitnessVideoEntry,
  isDeletingWitnessVideo,
  onDeleteSelectedWitnessVideo,
  onWitnessVideoChange,
}: Readonly<FilmPreviewSectionProps>) => {
  return (
    <Paper
      component="section"
      sx={{
        background: '#101418',
        borderRadius: 1.5,
        padding: 2,
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
      }}
    >
      <Player
        component={FilmSequenceComposition}
        inputProps={{ frameUrls }}
        durationInFrames={durationInFrames}
        compositionWidth={1280}
        compositionHeight={720}
        fps={24}
        controls
        autoPlay={false}
        loop
        style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden' }}
      />
      <Box
        sx={{
          marginTop: 0.85,
          padding: 0.85,
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.75} flexWrap="wrap">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
            {selectedWitnessVideoUrl ? (
              <Link
                href={selectedWitnessVideoUrl}
                target="_blank"
                rel="noreferrer"
                sx={{
                  color: '#90caf9',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Open direct file
              </Link>
            ) : (
              <Typography color="text.secondary">No direct file available.</Typography>
            )}
            <Button
              variant="contained"
              color="error"
              onClick={onDeleteSelectedWitnessVideo}
              disabled={isDeletingWitnessVideo || !selectedWitnessVideoEntry}
            >
              Delete selected witness video
            </Button>
          </Box>
        </Stack>
        <FormControl fullWidth sx={{ marginTop: 1 }}>
          <InputLabel id="witness-video-select-label">Witness video</InputLabel>
          <Select
            labelId="witness-video-select-label"
            id="witness-video-select"
            label="Witness video"
            value={selectedWitnessVideoUrl}
            onChange={(event) => onWitnessVideoChange(event.target.value)}
            disabled={witnessVideos.length === 0}
          >
            {witnessVideos.length === 0 ? <MenuItem value="">No witness videos</MenuItem> : null}
            {witnessVideos.map((video) => (
              <MenuItem key={video.mediaUrl} value={video.mediaUrl}>
                {video.fileName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedWitnessVideoUrl ? (
          <Box
            component="video"
            controls
            preload="metadata"
            src={selectedWitnessVideoUrl}
            sx={{
              width: '100%',
              marginTop: 0.75,
              borderRadius: '10px',
              background: '#000',
            }}
          >
            <track kind="captions" srcLang="en" label="No captions available" />
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ marginTop: 1 }}>
            No witness video available for this film.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
