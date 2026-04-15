import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import { Box } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import { useForm } from 'react-hook-form';

import { Header } from '../components/Header';
import {
  CreateFilmResponse,
  CreateFilmRequest,
  Film,
  NewFilmFormValues,
  Reel,
  ReelFramesResponse,
  UploadWitnessVideoResponse,
  WitnessVideosResponse,
} from './App.types';
import { AppFooter } from './components/AppFooter';
import { FilmPreviewSection } from './components/FilmPreviewSection';
import { FilmSidebar } from './components/FilmSidebar';
import { HeroSection } from './components/HeroSection';
import { CreateFilmDialog } from './components/dialogs/CreateFilmDialog';
import { DeleteWitnessDialog } from './components/dialogs/DeleteWitnessDialog';
import { UploadWitnessDialog } from './components/dialogs/UploadWitnessDialog';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const documentationUrl =
  import.meta.env.VITE_DOCUMENTATION_URL ?? 'http://localhost:8000';
const swaggerApiUrl = 'http://localhost:8000/docs';

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
      <Header swaggerUrl={swaggerApiUrl} documentationHref={documentationUrl} />
      <HeroSection />

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
        <FilmSidebar
          films={films}
          reels={reels}
          isLoading={isLoading}
          selectedFilmId={selectedFilmId}
          selectedReelId={selectedReelId}
          frameCount={frameUrls.length}
          errorMessage={errorMessage}
          onAddFilm={() => setCreateFilmDialogOpen(true)}
          onUploadWitnessVideo={() => setUploadWitnessDialogOpen(true)}
          onFilmChange={setSelectedFilmId}
          onReelChange={setSelectedReelId}
        />
        <FilmPreviewSection
          frameUrls={frameUrls}
          durationInFrames={durationInFrames}
          selectedWitnessVideoUrl={selectedWitnessVideoUrl}
          witnessVideos={witnessVideos}
          selectedWitnessVideoEntry={selectedWitnessVideoEntry}
          isDeletingWitnessVideo={isDeletingWitnessVideo}
          onDeleteSelectedWitnessVideo={() => setDeleteWitnessDialogOpen(true)}
          onWitnessVideoChange={setSelectedWitnessVideoUrl}
        />
      </Box>

      <CreateFilmDialog
        open={isCreateFilmDialogOpen}
        isSubmitting={isSubmitting}
        errors={errors}
        register={register}
        onClose={closeCreateFilmDialog}
        onSubmit={submitCreateFilm}
      />

      <DeleteWitnessDialog
        open={isDeleteWitnessDialogOpen}
        isDeleting={isDeletingWitnessVideo}
        selectedFileName={selectedWitnessVideoEntry?.fileName ?? ''}
        onClose={() => {
          if (!isDeletingWitnessVideo) {
            setDeleteWitnessDialogOpen(false);
          }
        }}
        onConfirmDelete={() => {
          void submitWitnessVideoDelete();
        }}
      />

      <UploadWitnessDialog
        open={isUploadWitnessDialogOpen}
        isUploading={isUploadingWitnessVideo}
        selectedWitnessVideo={selectedWitnessVideo}
        overwriteWitnessVideo={overwriteWitnessVideo}
        onClose={closeUploadWitnessDialog}
        onFileChange={setSelectedWitnessVideo}
        onOverwriteChange={setOverwriteWitnessVideo}
        onUpload={() => {
          void submitWitnessVideoUpload();
        }}
      />

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

      <AppFooter />
    </Box>
  );
};
