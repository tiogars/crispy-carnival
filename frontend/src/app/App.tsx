import { useCallback, useEffect, useMemo, useState } from 'react';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import Alert from '@mui/material/Alert';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import { Player } from '@remotion/player';
import { useForm } from 'react-hook-form';

import { FilmSequenceComposition } from '../features/film-viewer/FilmSequenceComposition';

type Film = {
  id: string;
  displayName: string;
};

type Reel = {
  id: string;
  frameCount: number;
};

type ReelFramesResponse = {
  reelId: string;
  frames: string[];
};

type CreateFilmRequest = {
  displayName: string;
  firstReelName?: string;
};

type CreateFilmResponse = {
  film: Film;
};

type UploadWitnessVideoResponse = {
  fileName: string;
  mediaUrl: string;
};

type WitnessVideosResponse = {
  videos: UploadWitnessVideoResponse[];
};

type NewFilmFormValues = {
  displayName: string;
  firstReelName: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const documentationUrl =
  import.meta.env.VITE_DOCUMENTATION_URL ?? 'http://localhost:8000';
const repositoryUrl = 'https://github.com/tiogars/crispy-carnival';
const createIssueUrl = 'https://github.com/tiogars/crispy-carnival/issues/new';

const fetchJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const postJson = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Use the fallback status-based message when no JSON payload is available.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

const postFormData = async <T,>(path: string, body: FormData): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Use the fallback status-based message when no JSON payload is available.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

const deleteRequest = async (path: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Use the fallback status-based message when no JSON payload is available.
    }

    throw new Error(message);
  }
};

export const App = () => {
  const [films, setFilms] = useState<Film[]>([]);
  const [selectedFilmId, setSelectedFilmId] = useState<string>('');
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreateFilmDialogOpen, setCreateFilmDialogOpen] = useState<boolean>(false);
  const [isUploadWitnessDialogOpen, setUploadWitnessDialogOpen] = useState<boolean>(false);
  const [selectedWitnessVideo, setSelectedWitnessVideo] = useState<File | null>(null);
  const [isUploadingWitnessVideo, setUploadingWitnessVideo] = useState<boolean>(false);
  const [overwriteWitnessVideo, setOverwriteWitnessVideo] = useState<boolean>(false);
  const [witnessVideos, setWitnessVideos] = useState<UploadWitnessVideoResponse[]>([]);
  const [selectedWitnessVideoUrl, setSelectedWitnessVideoUrl] = useState<string>('');
  const [isDeleteWitnessDialogOpen, setDeleteWitnessDialogOpen] = useState<boolean>(false);
  const [isDeletingWitnessVideo, setDeletingWitnessVideo] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewFilmFormValues>({
    defaultValues: {
      displayName: '',
      firstReelName: '',
    },
  });

  const loadFilms = useCallback(async (preferredFilmId?: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = await fetchJson<{ films: Film[] }>('/api/filesystem/films');
      setFilms(payload.films);

      if (payload.films.length === 0) {
        setSelectedFilmId('');
        return;
      }

      setSelectedFilmId((currentFilmId) => {
        if (preferredFilmId && payload.films.some((film) => film.id === preferredFilmId)) {
          return preferredFilmId;
        }

        if (currentFilmId && payload.films.some((film) => film.id === currentFilmId)) {
          return currentFilmId;
        }

        return payload.films[0].id;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load films.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFilms();
  }, [loadFilms]);

  const closeCreateFilmDialog = () => {
    setCreateFilmDialogOpen(false);
    reset({ displayName: '', firstReelName: '' });
  };

  const submitCreateFilm = handleSubmit(async (values) => {
    setErrorMessage('');

    try {
      const payload = await postJson<CreateFilmResponse>('/api/filesystem/films', {
        displayName: values.displayName,
        firstReelName: values.firstReelName.trim() ? values.firstReelName : undefined,
      } satisfies CreateFilmRequest);
      await loadFilms(payload.film.id);
      setSuccessMessage(`Film "${payload.film.displayName}" created successfully.`);
      closeCreateFilmDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create film.';
      setErrorMessage(message.includes('500') ? 'error during film creation' : message);
    }
  });

  const closeUploadWitnessDialog = () => {
    setUploadWitnessDialogOpen(false);
    setSelectedWitnessVideo(null);
    setOverwriteWitnessVideo(false);
  };

  const loadWitnessVideos = useCallback(async (preferredMediaUrl?: string) => {
    if (!selectedFilmId) {
      setWitnessVideos([]);
      setSelectedWitnessVideoUrl('');
      return;
    }

    try {
      const payload = await fetchJson<WitnessVideosResponse>(`/api/filesystem/films/${selectedFilmId}/witness-videos`);

      const resolvedVideos = payload.videos.map((video) => ({
        ...video,
        mediaUrl: video.mediaUrl.startsWith('http') ? video.mediaUrl : `${apiBaseUrl}${video.mediaUrl}`,
      }));

      setWitnessVideos(resolvedVideos);
      setSelectedWitnessVideoUrl((currentVideoUrl) => {
        if (preferredMediaUrl && resolvedVideos.some((video) => video.mediaUrl === preferredMediaUrl)) {
          return preferredMediaUrl;
        }

        if (currentVideoUrl && resolvedVideos.some((video) => video.mediaUrl === currentVideoUrl)) {
          return currentVideoUrl;
        }

        return resolvedVideos[0]?.mediaUrl ?? '';
      });
    } catch {
      setWitnessVideos([]);
      setSelectedWitnessVideoUrl('');
    }
  }, [selectedFilmId]);

  const submitWitnessVideoUpload = async () => {
    if (!selectedFilmId) {
      setErrorMessage('Select a film before uploading a witness video.');
      return;
    }

    if (!selectedWitnessVideo) {
      setErrorMessage('Choose a witness video file first.');
      return;
    }

    setUploadingWitnessVideo(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedWitnessVideo);
      formData.append('overwrite', overwriteWitnessVideo ? 'true' : 'false');

      const payload = await postFormData<UploadWitnessVideoResponse>(
        `/api/filesystem/films/${selectedFilmId}/witness-video`,
        formData,
      );

      const resolvedMediaUrl = payload.mediaUrl.startsWith('http') ? payload.mediaUrl : `${apiBaseUrl}${payload.mediaUrl}`;
      await loadWitnessVideos(resolvedMediaUrl);

      setSuccessMessage(`Witness video "${payload.fileName}" uploaded successfully.`);
      closeUploadWitnessDialog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload witness video.');
    } finally {
      setUploadingWitnessVideo(false);
    }
  };

  const selectedWitnessVideoEntry = useMemo<UploadWitnessVideoResponse | null>(() => {
    const matched = witnessVideos.find((video) => video.mediaUrl === selectedWitnessVideoUrl);
    return matched ?? null;
  }, [selectedWitnessVideoUrl, witnessVideos]);

  const submitWitnessVideoDelete = async () => {
    if (!selectedFilmId || !selectedWitnessVideoEntry) {
      setErrorMessage('Select a witness video to delete.');
      return;
    }

    setDeletingWitnessVideo(true);
    setErrorMessage('');

    try {
      await deleteRequest(
        `/api/filesystem/films/${selectedFilmId}/witness-videos/${encodeURIComponent(selectedWitnessVideoEntry.fileName)}`,
      );
      await loadWitnessVideos();
      setSuccessMessage(`Witness video "${selectedWitnessVideoEntry.fileName}" deleted successfully.`);
      setDeleteWitnessDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete witness video.');
    } finally {
      setDeletingWitnessVideo(false);
    }
  };

  useEffect(() => {
    if (!selectedFilmId) {
      setReels([]);
      setSelectedReelId('');
      return;
    }

    const loadReels = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const payload = await fetchJson<{ reels: Reel[] }>(`/api/filesystem/films/${selectedFilmId}/reels`);
        setReels(payload.reels);

        if (payload.reels.length > 0) {
          setSelectedReelId(payload.reels[0].id);
        } else {
          setSelectedReelId('');
          setFrameUrls([]);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load reels.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadReels();
  }, [selectedFilmId]);

  useEffect(() => {
    if (!selectedFilmId || !selectedReelId) {
      setFrameUrls([]);
      return;
    }

    const loadFrames = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const payload = await fetchJson<ReelFramesResponse>(
          `/api/filesystem/films/${selectedFilmId}/reels/${selectedReelId}/frames`,
        );
        setFrameUrls(
          payload.frames.map((frameUrl) => (frameUrl.startsWith('http') ? frameUrl : `${apiBaseUrl}${frameUrl}`)),
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load reel frames.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFrames();
  }, [selectedFilmId, selectedReelId]);

  useEffect(() => {
    void loadWitnessVideos();
  }, [loadWitnessVideos]);

  const durationInFrames = useMemo<number>(() => {
    return frameUrls.length > 0 ? frameUrls.length : 1;
  }, [frameUrls.length]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #eceff1 0%, #dfe5eb 100%)',
        boxSizing: 'border-box',
      }}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1.5,
          padding: '1.25rem 1rem 0',
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{
              margin: 0,
              marginBottom: '0.35rem',
              color: '#546e7a',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'block',
            }}
          >
            Film Sequence Finder
          </Typography>
          <Typography variant="h1" sx={{ margin: 0 }}>
            Original Reel Sequence Finder
          </Typography>
          <Typography
            variant="body1"
            sx={{
              margin: '0.5rem 0 0',
              maxWidth: '52rem',
              color: '#455a64',
            }}
          >
            Choose a film, inspect its original reels, and preview every scanned image frame.
          </Typography>
        </Box>
        <Stack
          component="nav"
          aria-label="Project links"
          direction="row"
          flexWrap="wrap"
          gap={0.75}
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
        >
          <Link
            href={documentationUrl}
            target="_blank"
            rel="noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.45,
              minHeight: '2.5rem',
              padding: '0 0.9rem',
              border: '1px solid rgba(13, 71, 161, 0.18)',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.72)',
              color: '#0d47a1',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                background: '#ffffff',
                borderColor: 'rgba(13, 71, 161, 0.32)',
              },
            }}
          >
            Open documentation
          </Link>
          <Link
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.45,
              minHeight: '2.5rem',
              padding: '0 0.9rem',
              border: '1px solid rgba(13, 71, 161, 0.18)',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.72)',
              color: '#0d47a1',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                background: '#ffffff',
                borderColor: 'rgba(13, 71, 161, 0.32)',
              },
            }}
          >
            <GitHubIcon fontSize="small" />
            GitHub repository
          </Link>
          <Link
            href={createIssueUrl}
            target="_blank"
            rel="noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.45,
              minHeight: '2.5rem',
              padding: '0 0.9rem',
              border: '1px solid rgba(13, 71, 161, 0.18)',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.72)',
              color: '#0d47a1',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                background: '#ffffff',
                borderColor: 'rgba(13, 71, 161, 0.32)',
              },
            }}
          >
            <BugReportOutlinedIcon fontSize="small" />
            Create issue
          </Link>
        </Stack>
      </Box>

      <Box
        component="main"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          gap: 1,
          padding: 1,
          flex: 1,
          boxSizing: 'border-box',
        }}
      >
        <Paper
          component="section"
          sx={{
            borderRadius: 1.5,
            padding: 2,
            boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.75} flexWrap="wrap">
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => setCreateFilmDialogOpen(true)}
                disabled={isLoading}
                style={{ pointerEvents: 'auto' }}
              >
                Add film
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setUploadWitnessDialogOpen(true)}
                disabled={isLoading || !selectedFilmId}
                style={{ pointerEvents: 'auto' }}
              >
                Upload witness video
              </Button>
            </Box>
          </Stack>
          <FormControl fullWidth>
            <InputLabel id="film-select-label">Film</InputLabel>
            <Select
              labelId="film-select-label"
              id="film-select"
              label="Film"
              value={selectedFilmId}
              onChange={(event) => setSelectedFilmId(event.target.value)}
              disabled={films.length === 0 || isLoading}
            >
              {films.map((film) => (
                <MenuItem key={film.id} value={film.id}>
                  {film.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel id="reel-select-label">Reel Sequence</InputLabel>
            <Select
              labelId="reel-select-label"
              id="reel-select"
              label="Reel Sequence"
              value={selectedReelId}
              onChange={(event) => setSelectedReelId(event.target.value)}
              disabled={reels.length === 0 || isLoading}
            >
              {reels.map((reel) => (
                <MenuItem key={reel.id} value={reel.id}>
                  {reel.id} ({reel.frameCount} frames)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography color="text.secondary">
            {isLoading ? 'Loading...' : `Loaded ${frameUrls.length} frame(s) for playback.`}
          </Typography>
          {!selectedFilmId ? <Typography color="text.secondary">Select a film to enable witness video upload.</Typography> : null}
          {errorMessage ? <Typography color="error" fontWeight={600}>{errorMessage}</Typography> : null}
        </Paper>

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
                  onClick={() => setDeleteWitnessDialogOpen(true)}
                  disabled={isDeletingWitnessVideo || !selectedWitnessVideoEntry}
                >
                  Supprimer la vidéo témoin sélectionnée
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
                onChange={(event) => setSelectedWitnessVideoUrl(event.target.value)}
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
      </Box>

      <Dialog
        open={isCreateFilmDialogOpen}
        onClose={closeCreateFilmDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add a new film</DialogTitle>
        <Box component="form" noValidate onSubmit={submitCreateFilm}>
          <DialogContent dividers>
            <TextField
              autoFocus
              fullWidth
              label="Film name"
              placeholder="Example: The Third Man"
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              {...register('displayName', {
                required: 'Film name is required.',
                minLength: {
                  value: 2,
                  message: 'Film name must have at least 2 characters.',
                },
              })}
            />
            <TextField
              fullWidth
              margin="normal"
              label="First reel folder (optional)"
              placeholder="Example: Reel 01"
              helperText="If provided, this reel folder is created inside the film directory."
              {...register('firstReelName')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCreateFilmDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Create film
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={isDeleteWitnessDialogOpen}
        onClose={() => {
          if (!isDeletingWitnessVideo) {
            setDeleteWitnessDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirm witness video deletion</DialogTitle>
        <DialogContent dividers>
          <p>
            Delete witness video "{selectedWitnessVideoEntry?.fileName ?? ''}"?
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteWitnessDialogOpen(false)} disabled={isDeletingWitnessVideo}>
            Cancel
          </Button>
          <Button
            type="button"
            color="error"
            variant="contained"
            onClick={() => {
              void submitWitnessVideoDelete();
            }}
            disabled={isDeletingWitnessVideo || !selectedWitnessVideoEntry}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isUploadWitnessDialogOpen}
        onClose={closeUploadWitnessDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Upload witness video</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            type="file"
            slotProps={{ htmlInput: { accept: 'video/*', 'data-testid': 'witness-video-input' } }}
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              const file = input.files?.[0] ?? null;
              setSelectedWitnessVideo(file);
            }}
            helperText="The file will be saved inside the selected film under _witness_videos/."
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={overwriteWitnessVideo}
                onChange={(event) => setOverwriteWitnessVideo(event.target.checked)}
              />
            )}
            label="Overwrite existing file if name already exists"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUploadWitnessDialog} disabled={isUploadingWitnessVideo}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={() => {
              void submitWitnessVideoUpload();
            }}
            disabled={isUploadingWitnessVideo || !selectedWitnessVideo}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>

      <Box
        component="footer"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
          padding: '0 1rem 1rem',
          color: '#546e7a',
          fontSize: '0.95rem',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Typography variant="body2" sx={{ margin: 0 }}>
          Tiogars 2026
        </Typography>
        <Typography variant="body2" sx={{ margin: 0 }}>
          Frontend served through Vite and Nginx development proxy.
        </Typography>
      </Box>
    </Box>
  );
};
