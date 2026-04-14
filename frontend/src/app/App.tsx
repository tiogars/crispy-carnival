import { useCallback, useEffect, useMemo, useState } from 'react';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import Alert from '@mui/material/Alert';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import { Player } from '@remotion/player';
import { useForm } from 'react-hook-form';

import { FilmSequenceComposition } from '../features/film-viewer/FilmSequenceComposition';

import './App.css';

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
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Film Sequence Finder</p>
          <h1 className="app-header__title">Original Reel Sequence Finder</h1>
          <p className="app-header__description">
            Choose a film, inspect its original reels, and preview every scanned image frame.
          </p>
        </div>
        <nav className="app-header__actions" aria-label="Project links">
          <a className="app-header__link" href={documentationUrl} target="_blank" rel="noreferrer">
            Open documentation
          </a>
          <a className="app-header__link" href={repositoryUrl} target="_blank" rel="noreferrer">
            <GitHubIcon fontSize="small" />
            GitHub repository
          </a>
          <a className="app-header__link" href={createIssueUrl} target="_blank" rel="noreferrer">
            <BugReportOutlinedIcon fontSize="small" />
            Create issue
          </a>
        </nav>
      </header>

      <main className="app">
        <section className="app__panel">
          <div className="app__label-row">
            <label className="app__label" htmlFor="film-select">
              Film
            </label>
            <div className="app__panel-actions">
              <button
                type="button"
                className="app__button"
                onClick={() => setCreateFilmDialogOpen(true)}
                disabled={isLoading}
              >
                Add film
              </button>
              <button
                type="button"
                className="app__button app__button--secondary"
                onClick={() => setUploadWitnessDialogOpen(true)}
                disabled={isLoading || !selectedFilmId}
              >
                Upload witness video
              </button>
            </div>
          </div>
          <select
            id="film-select"
            className="app__select"
            value={selectedFilmId}
            onChange={(event) => setSelectedFilmId(event.target.value)}
            disabled={films.length === 0 || isLoading}
          >
            {films.map((film) => (
              <option key={film.id} value={film.id}>
                {film.displayName}
              </option>
            ))}
          </select>

          <label className="app__label" htmlFor="reel-select">
            Reel Sequence
          </label>
          <select
            id="reel-select"
            className="app__select"
            value={selectedReelId}
            onChange={(event) => setSelectedReelId(event.target.value)}
            disabled={reels.length === 0 || isLoading}
          >
            {reels.map((reel) => (
              <option key={reel.id} value={reel.id}>
                {reel.id} ({reel.frameCount} frames)
              </option>
            ))}
          </select>

          <p className="app__status">
            {isLoading ? 'Loading...' : `Loaded ${frameUrls.length} frame(s) for playback.`}
          </p>
          {!selectedFilmId ? <p className="app__status">Select a film to enable witness video upload.</p> : null}
          {errorMessage ? <p className="app__error">{errorMessage}</p> : null}
        </section>

        <section className="app__preview">
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
          <div className="app__witness-video-panel">
            <div className="app__label-row">
              <label className="app__label" htmlFor="witness-video-select">
                Witness video
              </label>
              <div className="app__witness-video-actions">
                {selectedWitnessVideoUrl ? (
                  <a className="app__witness-video-link" href={selectedWitnessVideoUrl} target="_blank" rel="noreferrer">
                    Open direct file
                  </a>
                ) : (
                  <span className="app__status">No direct file available.</span>
                )}
                <button
                  type="button"
                  className="app__button app__button--danger"
                  onClick={() => setDeleteWitnessDialogOpen(true)}
                  disabled={isDeletingWitnessVideo || !selectedWitnessVideoEntry}
                >
                  Supprimer la vidéo témoin sélectionnée
                </button>
              </div>
            </div>
            <select
              id="witness-video-select"
              className="app__select"
              value={selectedWitnessVideoUrl}
              onChange={(event) => setSelectedWitnessVideoUrl(event.target.value)}
              disabled={witnessVideos.length === 0}
            >
              {witnessVideos.length === 0 ? <option value="">No witness videos</option> : null}
              {witnessVideos.map((video) => (
                <option key={video.mediaUrl} value={video.mediaUrl}>
                  {video.fileName}
                </option>
              ))}
            </select>
            {selectedWitnessVideoUrl ? (
              <video className="app__witness-video" controls preload="metadata" src={selectedWitnessVideoUrl}>
                <track kind="captions" srcLang="en" label="No captions available" />
              </video>
            ) : (
              <p className="app__status">No witness video available for this film.</p>
            )}
          </div>
        </section>
      </main>

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

      <footer className="app-footer">
        <p>Tiogars 2026</p>
        <p>Frontend served through Vite and Nginx development proxy.</p>
      </footer>
    </div>
  );
};
