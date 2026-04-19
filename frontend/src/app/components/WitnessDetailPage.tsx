import { Box, Button, Paper, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExtensionIcon from '@mui/icons-material/Extension';
import { useEffect, useState } from 'react';

import type { Film, UploadWitnessVideoResponse } from '../App.types';

type WitnessDetailPageProps = {
  film: Film | null;
  witness: UploadWitnessVideoResponse | null;
  isDeleting: boolean;
  isExtracting: boolean;
  onDelete: () => void;
  onExtractSequence: () => void;
};

export const WitnessDetailPage = ({
  film,
  witness,
  isDeleting,
  isExtracting,
  onDelete,
  onExtractSequence,
}: Readonly<WitnessDetailPageProps>) => {
  const [hasVideoError, setHasVideoError] = useState(false);

  useEffect(() => {
    setHasVideoError(false);
  }, [witness?.mediaUrl]);

  if (!film || !witness) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        }}
      >
        <Typography color="text.secondary">Select a witness video to view details.</Typography>
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
        <Typography variant="h5" sx={{ fontWeight: 600, marginBottom: 1 }}>
          {witness.fileName}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ marginBottom: 2 }}>
          {film.displayName}
        </Typography>
      </Paper>

      <Paper
        sx={{
          padding: 2,
          borderRadius: 1.5,
          boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#101418',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {witness.mediaUrl ? (
              <Button
                component="a"
                href={witness.mediaUrl}
                target="_blank"
                rel="noreferrer"
                size="small"
                variant="contained"
                color="info"
              >
                Open in new tab
              </Button>
            ) : null}
            <Button
              variant="contained"
              startIcon={<ExtensionIcon />}
              onClick={onExtractSequence}
              disabled={isExtracting}
              size="small"
            >
              Extract Sequence
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={onDelete}
              disabled={isDeleting}
              size="small"
            >
              Delete Video
            </Button>
          </Box>

          <Box
            component="video"
            src={witness.mediaUrl}
            controls
            onError={() => setHasVideoError(true)}
            onLoadedData={() => setHasVideoError(false)}
            sx={{
              width: '100%',
              height: '100%',
              maxHeight: 400,
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        </Box>

        {hasVideoError ? (
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
              This browser could not decode the video file. Open the file directly, or extract frames from the file to continue the analysis.
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
              File
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe', wordBreak: 'break-word' }}>
              {witness.fileName}
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Film
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe' }}>
              {film.displayName}
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Size
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe' }}>
              {(witness.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
            </Typography>

            <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600 }}>
              Frames
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f0fe' }}>
              {typeof witness.frameCount === 'number' ? witness.frameCount : 'Unknown'}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
