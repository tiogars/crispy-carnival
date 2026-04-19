import { Box, Button, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useState } from 'react';

type ImageStepPlayerProps = {
  frameUrls: string[];
};

export const ImageStepPlayer = ({ frameUrls }: ImageStepPlayerProps) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const goToPreviousFrame = () => {
    setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextFrame = () => {
    setCurrentFrameIndex((prev) => Math.min(frameUrls.length - 1, prev + 1));
  };

  if (frameUrls.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#0f1114',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f5f7fa',
          fontSize: 18,
        }}
      >
        No frames available
      </Box>
    );
  }

  const currentFrameUrl = frameUrls[currentFrameIndex];
  const canGoPrevious = currentFrameIndex > 0;
  const canGoNext = currentFrameIndex < frameUrls.length - 1;

  return (
    <Box>
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
        <img
          src={currentFrameUrl}
          alt={`Frame ${currentFrameIndex}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          marginTop: 1.5,
        }}
      >
        <Button
          variant="contained"
          disabled={!canGoPrevious}
          onClick={goToPreviousFrame}
          startIcon={<ChevronLeftIcon />}
        >
          Previous
        </Button>

        <Typography
          sx={{
            minWidth: '120px',
            textAlign: 'center',
            fontWeight: 600,
            color: '#90caf9',
          }}
        >
          Frame {currentFrameIndex + 1} / {frameUrls.length}
        </Typography>

        <Button
          variant="contained"
          disabled={!canGoNext}
          onClick={goToNextFrame}
          endIcon={<ChevronRightIcon />}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};
