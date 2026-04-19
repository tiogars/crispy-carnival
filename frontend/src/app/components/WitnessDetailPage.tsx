import { Box, Button, Link, Paper, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExtensionIcon from '@mui/icons-material/Extension';

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
        <Typography color="text.secondary" variant="body2" sx={{ marginBottom: 2 }}>
          Size: {(witness.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
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
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            marginBottom: 2,
          }}
        >
          <Box
            component="video"
            src={witness.mediaUrl}
            controls
            sx={{
              width: '100%',
              height: '100%',
              maxHeight: 400,
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        </Box>

        {witness.mediaUrl ? (
          <Link
            href={witness.mediaUrl}
            target="_blank"
            rel="noreferrer"
            sx={{
              color: '#90caf9',
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: 2,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Open in new tab
          </Link>
        ) : null}

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            startIcon={<ExtensionIcon />}
            onClick={onExtractSequence}
            disabled={isExtracting}
          >
            Extract Sequence
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={onDelete}
            disabled={isDeleting}
          >
            Delete Video
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
