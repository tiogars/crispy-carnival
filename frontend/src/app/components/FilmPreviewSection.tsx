import { Box, Button, FormControl, InputLabel, Link, MenuItem, Paper, Select, Typography } from '@mui/material';
import { Player } from '@remotion/player';

import { FilmSequenceComposition } from '../../features/film-viewer/FilmSequenceComposition';
import type { SequenceExtractionJobStatusResponse, UploadWitnessVideoResponse } from '../App.types';

const formatDuration = (seconds: number | null) => {
  if (seconds === null) {
    return '--';
  }

  const roundedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
  }

  return `${remainingSeconds}s`;
};

const formatProgressRate = (ratePercentPerSecond: number | null) => {
  if (ratePercentPerSecond === null) {
    return '--';
  }

  return `${ratePercentPerSecond.toFixed(ratePercentPerSecond >= 10 ? 1 : 2)}%/s`;
};

const formatHistoryTimestamp = (value: string | null) => {
  if (!value) {
    return 'Pending';
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
};

type FilmPreviewSectionProps = {
  frameUrls: string[];
  durationInFrames: number;
  selectedWitnessVideoUrl: string;
  witnessVideos: UploadWitnessVideoResponse[];
  selectedWitnessVideoEntry: UploadWitnessVideoResponse | null;
  extractionHistory: SequenceExtractionJobStatusResponse[];
  isDeletingWitnessVideo: boolean;
  isExtractingSequence: boolean;
  onDeleteSelectedWitnessVideo: () => void;
  onOpenSequenceExtraction: () => void;
  onWitnessVideoChange: (videoUrl: string) => void;
};

export const FilmPreviewSection = ({
  frameUrls,
  durationInFrames,
  selectedWitnessVideoUrl,
  witnessVideos,
  selectedWitnessVideoEntry,
  extractionHistory,
  isDeletingWitnessVideo,
  isExtractingSequence,
  onDeleteSelectedWitnessVideo,
  onOpenSequenceExtraction,
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.75,
            flexWrap: 'wrap',
          }}
        >
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
              color="secondary"
              onClick={onOpenSequenceExtraction}
              disabled={isExtractingSequence || !selectedWitnessVideoEntry}
            >
              Extract sequence
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={onDeleteSelectedWitnessVideo}
              disabled={isDeletingWitnessVideo || !selectedWitnessVideoEntry}
            >
              Delete selected witness video
            </Button>
          </Box>
        </Box>
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

        <Box
          sx={{
            marginTop: 1,
            paddingTop: 1,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gap: 0.75,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: '#e3f2fd', fontWeight: 700 }}>
            Recent extraction history
          </Typography>
          {extractionHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No extraction job recorded for this film yet.
            </Typography>
          ) : (
            extractionHistory.slice(0, 5).map((job) => (
              <Box
                key={job.jobId}
                sx={{
                  padding: 1,
                  borderRadius: 1,
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'grid',
                  gap: 0.3,
                }}
              >
                <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                  {job.outputReelId ?? job.jobId} · {job.status}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Video: {job.witnessVideoName} · Updated: {formatHistoryTimestamp(job.finishedAt ?? job.startedAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Elapsed: {formatDuration(job.elapsedSeconds)} | Remaining: {formatDuration(job.estimatedRemainingSeconds)} | Speed:{' '}
                  {formatProgressRate(job.progressRatePercentPerSecond)}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Paper>
  );
};
