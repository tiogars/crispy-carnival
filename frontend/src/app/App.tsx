import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Typography } from '@mui/material';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Header } from '../components/Header';
import {
  CreateFilmRequest,
  CreateFilmResponse,
  Film,
  NavigationNode,
  NewFilmFormValues,
  Reel,
  ReelFramesResponse,
  SequenceExtractionAcceptedResponse,
  SequenceExtractionFormValues,
  SequenceExtractionJobsHistoryResponse,
  SequenceExtractionJobStatusResponse,
  SequenceExtractionRequest,
  UploadReelVideoResponse,
  UploadWitnessVideoResponse,
  WitnessVideosResponse,
} from './App.types';
import { AppFooter } from './components/AppFooter';
import { AppNavigationTree } from './components/AppNavigationTree';
import { DashboardPage } from './components/DashboardPage';
import { FilmPreviewSection } from './components/FilmPreviewSection';
import { FilmSidebar } from './components/FilmSidebar';
import { ReelDetailPage } from './components/ReelDetailPage';
import { ReelsPage } from './components/ReelsPage';
import { WitnessDetailPage } from './components/WitnessDetailPage';
import { WitnessesPage } from './components/WitnessesPage';
import { CreateFilmDialog } from './components/dialogs/CreateFilmDialog';
import { DeleteWitnessDialog } from './components/dialogs/DeleteWitnessDialog';
import { SequenceExtractionDialog } from './components/dialogs/SequenceExtractionDialog';
import { UploadReelVideoDialog } from './components/dialogs/UploadReelVideoDialog';
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

const defaultSequenceExtractionValues: SequenceExtractionFormValues = {
  targetFps: '2',
  sceneThreshold: '0.30',
  minSpacingSeconds: '1.0',
  outputReelName: '',
  overwriteExisting: false,
};

type SequenceExtractionSource = {
  type: 'witness' | 'reel';
  name: string;
};

export const App = () => {
  const [selectedNavigationNode, setSelectedNavigationNode] = useState<NavigationNode | ''>('home' as NavigationNode);
  const [films, setFilms] = useState<Film[]>([]);
  const [selectedFilmId, setSelectedFilmId] = useState<string>('');
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  const [reelsByFilmId, setReelsByFilmId] = useState<Record<string, Reel[]>>({});
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreateFilmDialogOpen, setCreateFilmDialogOpen] = useState<boolean>(false);
  const [isUploadWitnessDialogOpen, setUploadWitnessDialogOpen] = useState<boolean>(false);
  const [isUploadReelDialogOpen, setUploadReelDialogOpen] = useState<boolean>(false);
  const [selectedWitnessVideo, setSelectedWitnessVideo] = useState<File | null>(null);
  const [selectedReelVideo, setSelectedReelVideo] = useState<File | null>(null);
  const [isUploadingWitnessVideo, setUploadingWitnessVideo] = useState<boolean>(false);
  const [isUploadingReelVideo, setUploadingReelVideo] = useState<boolean>(false);
  const [overwriteReelVideo, setOverwriteReelVideo] = useState<boolean>(false);
  const [reelUploadName, setReelUploadName] = useState<string>('');
  const [overwriteWitnessVideo, setOverwriteWitnessVideo] = useState<boolean>(false);
  const [witnessVideos, setWitnessVideos] = useState<UploadWitnessVideoResponse[]>([]);
  const [witnessesByFilmId, setWitnessesByFilmId] = useState<Record<string, UploadWitnessVideoResponse[]>>({});
  const [selectedWitnessVideoUrl, setSelectedWitnessVideoUrl] = useState<string>('');
  const [selectedWitnessFileName, setSelectedWitnessFileName] = useState<string>('');
  const [isDeleteFilmDialogOpen, setDeleteFilmDialogOpen] = useState<boolean>(false);
  const [isDeletingFilm, setDeletingFilm] = useState<boolean>(false);
  const [isDeleteWitnessDialogOpen, setDeleteWitnessDialogOpen] = useState<boolean>(false);
  const [isDeletingWitnessVideo, setDeletingWitnessVideo] = useState<boolean>(false);
  const [isSequenceExtractionDialogOpen, setSequenceExtractionDialogOpen] = useState<boolean>(false);
  const [isStartingSequenceExtraction, setStartingSequenceExtraction] = useState<boolean>(false);
  const [sequenceExtractionValues, setSequenceExtractionValues] = useState<SequenceExtractionFormValues>(
    defaultSequenceExtractionValues,
  );
  const [sequenceExtractionSource, setSequenceExtractionSource] = useState<SequenceExtractionSource | null>(null);
  const [sequenceExtractionErrorMessage, setSequenceExtractionErrorMessage] = useState<string>('');
  const [sequenceExtractionJob, setSequenceExtractionJob] = useState<SequenceExtractionJobStatusResponse | null>(null);
  const [sequenceExtractionHistory, setSequenceExtractionHistory] = useState<SequenceExtractionJobStatusResponse[]>([]);
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

  const loadReelsForFilm = useCallback(async (filmId: string, preferredReelId?: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = await fetchJson<{ reels: Reel[] }>(`/api/filesystem/films/${filmId}/reels`);
      setReelsByFilmId((prev) => ({
        ...prev,
        [filmId]: payload.reels,
      }));

      if (filmId === selectedFilmId) {
        setReels(payload.reels);

        if (payload.reels.length === 0) {
          setSelectedReelId('');
          setFrameUrls([]);
          return;
        }

        setSelectedReelId((currentReelId) => {
          if (preferredReelId && payload.reels.some((reel) => reel.id === preferredReelId)) {
            return preferredReelId;
          }

          if (currentReelId && payload.reels.some((reel) => reel.id === currentReelId)) {
            return currentReelId;
          }

          return payload.reels[0].id;
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load reels.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilmId]);

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

  const closeUploadReelDialog = () => {
    setUploadReelDialogOpen(false);
    setSelectedReelVideo(null);
    setOverwriteReelVideo(false);
    setReelUploadName('');
  };

  const closeSequenceExtractionDialog = () => {
    if (sequenceExtractionJob?.status === 'queued' || sequenceExtractionJob?.status === 'running' || isStartingSequenceExtraction) {
      return;
    }

    setSequenceExtractionDialogOpen(false);
    setSequenceExtractionSource(null);
    setSequenceExtractionErrorMessage('');
  };

  const resetSequenceExtractionDefaults = () => {
    setSequenceExtractionValues(defaultSequenceExtractionValues);
    setSequenceExtractionErrorMessage('');
  };

  const loadWitnessVideos = useCallback(async (filmId?: string, preferredMediaUrl?: string) => {
    const targetFilmId = filmId || selectedFilmId;

    if (!targetFilmId) {
      setWitnessVideos([]);
      setSelectedWitnessVideoUrl('');
      return;
    }

    try {
      const payload = await fetchJson<WitnessVideosResponse>(`/api/filesystem/films/${targetFilmId}/witness-videos`);

      const resolvedVideos = payload.videos.map((video) => ({
        ...video,
        mediaUrl: video.mediaUrl.startsWith('http') ? video.mediaUrl : `${apiBaseUrl}${video.mediaUrl}`,
      }));

      setWitnessesByFilmId((prev) => ({
        ...prev,
        [targetFilmId]: resolvedVideos,
      }));

      if (targetFilmId === selectedFilmId) {
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
      }
    } catch {
      if (targetFilmId === selectedFilmId) {
        setWitnessVideos([]);
        setSelectedWitnessVideoUrl('');
      }
      setWitnessesByFilmId((prev) => ({
        ...prev,
        [targetFilmId]: [],
      }));
    }
  }, [selectedFilmId]);

  const loadSequenceExtractionHistory = useCallback(async () => {
    if (!selectedFilmId) {
      setSequenceExtractionHistory([]);
      return;
    }

    try {
      const payload = await fetchJson<SequenceExtractionJobsHistoryResponse>(
        `/api/filesystem/films/${selectedFilmId}/sequence-extraction-jobs`,
      );
      setSequenceExtractionHistory(payload.jobs);
    } catch {
      setSequenceExtractionHistory([]);
    }
  }, [selectedFilmId]);

  const loadAllWitnessVideosForTreeView = useCallback(async () => {
    const newWitnessesByFilmId: Record<string, UploadWitnessVideoResponse[]> = {};

    for (const film of films) {
      try {
        const payload = await fetchJson<WitnessVideosResponse>(`/api/filesystem/films/${film.id}/witness-videos`);

        const resolvedVideos = payload.videos.map((video) => ({
          ...video,
          mediaUrl: video.mediaUrl.startsWith('http') ? video.mediaUrl : `${apiBaseUrl}${video.mediaUrl}`,
        }));

        newWitnessesByFilmId[film.id] = resolvedVideos;
      } catch {
        newWitnessesByFilmId[film.id] = [];
      }
    }

    setWitnessesByFilmId(newWitnessesByFilmId);
  }, [films]);

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
      const uploadedWitness: UploadWitnessVideoResponse = {
        ...payload,
        mediaUrl: resolvedMediaUrl,
      };

      setWitnessesByFilmId((prev) => {
        const existing = prev[selectedFilmId] ?? [];
        const withoutSameName = existing.filter((video) => video.fileName !== uploadedWitness.fileName);

        return {
          ...prev,
          [selectedFilmId]: [...withoutSameName, uploadedWitness],
        };
      });

      setWitnessVideos((current) => {
        const withoutSameName = current.filter((video) => video.fileName !== uploadedWitness.fileName);
        return [...withoutSameName, uploadedWitness];
      });
      setSelectedWitnessVideoUrl(uploadedWitness.mediaUrl);
      setSelectedWitnessFileName(uploadedWitness.fileName);
      setSelectedNavigationNode(`witness-${selectedFilmId}-${uploadedWitness.fileName}`);

      void loadWitnessVideos(selectedFilmId, resolvedMediaUrl);

      setSuccessMessage(`Witness video "${payload.fileName}" uploaded successfully.`);
      closeUploadWitnessDialog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload witness video.');
    } finally {
      setUploadingWitnessVideo(false);
    }
  };

  const submitReelVideoUpload = async () => {
    if (!selectedFilmId) {
      setErrorMessage('Select a film before uploading a reel video.');
      return;
    }

    if (!selectedReelVideo) {
      setErrorMessage('Choose a reel video file first.');
      return;
    }

    setUploadingReelVideo(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedReelVideo);
      formData.append('overwrite', overwriteReelVideo ? 'true' : 'false');

      if (reelUploadName.trim()) {
        formData.append('reel_name', reelUploadName.trim());
      }

      const payload = await postFormData<UploadReelVideoResponse>(
        `/api/filesystem/films/${selectedFilmId}/reel-video`,
        formData,
      );

      await loadReelsForFilm(selectedFilmId, payload.reel.id);
      setSelectedReelId(payload.reel.id);
      setSelectedNavigationNode(`reel-${selectedFilmId}-${payload.reel.id}`);
      setSuccessMessage(`Video "${payload.sourceVideoName}" imported as reel "${payload.reel.id}".`);
      closeUploadReelDialog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload reel video.');
    } finally {
      setUploadingReelVideo(false);
    }
  };

  const submitWitnessVideoDelete = async () => {
    if (!selectedFilmId || !currentWitness) {
      setErrorMessage('Select a witness video to delete.');
      return;
    }

    setDeletingWitnessVideo(true);
    setErrorMessage('');

    try {
      await deleteRequest(
        `/api/filesystem/films/${selectedFilmId}/witness-videos/${encodeURIComponent(currentWitness.fileName)}`,
      );
      await loadWitnessVideos(selectedFilmId);
      setSuccessMessage(`Witness video "${currentWitness.fileName}" deleted successfully.`);
      setDeleteWitnessDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete witness video.');
    } finally {
      setDeletingWitnessVideo(false);
    }
  };

  const submitFilmDelete = async () => {
    if (!selectedFilmId || !currentFilm) {
      setErrorMessage('Select a film to delete.');
      return;
    }

    setDeletingFilm(true);
    setErrorMessage('');

    const deletedFilmId = selectedFilmId;
    const deletedFilmName = currentFilm.displayName;
    const fallbackFilm = films.find((film) => film.id !== deletedFilmId) ?? null;

    try {
      await deleteRequest(`/api/filesystem/films/${deletedFilmId}`);

      setReelsByFilmId((previous) => {
        const next = { ...previous };
        delete next[deletedFilmId];
        return next;
      });
      setWitnessesByFilmId((previous) => {
        const next = { ...previous };
        delete next[deletedFilmId];
        return next;
      });

      if (fallbackFilm) {
        setSelectedFilmId(fallbackFilm.id);
        setSelectedNavigationNode(`film-${fallbackFilm.id}`);
      } else {
        setSelectedFilmId('');
        setSelectedNavigationNode('home');
      }

      setSelectedReelId('');
      setFrameUrls([]);
      setWitnessVideos([]);
      setSelectedWitnessVideoUrl('');
      setSelectedWitnessFileName('');
      await loadFilms(fallbackFilm?.id);
      setSuccessMessage(`Film "${deletedFilmName}" deleted successfully.`);
      setDeleteFilmDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete film.');
    } finally {
      setDeletingFilm(false);
    }
  };

  const submitSequenceExtraction = async () => {
    if (!selectedFilmId || !sequenceExtractionSource) {
      setSequenceExtractionErrorMessage('Select a film and a source video before starting extraction.');
      return;
    }

    const targetFps = Number(sequenceExtractionValues.targetFps);
    const sceneThreshold = Number(sequenceExtractionValues.sceneThreshold);
    const minSpacingSeconds = Number(sequenceExtractionValues.minSpacingSeconds);

    if (!Number.isFinite(targetFps) || targetFps <= 0) {
      setSequenceExtractionErrorMessage('Target FPS must be greater than 0.');
      return;
    }

    if (!Number.isFinite(sceneThreshold) || sceneThreshold <= 0 || sceneThreshold >= 1) {
      setSequenceExtractionErrorMessage('Scene threshold must be greater than 0 and less than 1.');
      return;
    }

    if (!Number.isFinite(minSpacingSeconds) || minSpacingSeconds < 0) {
      setSequenceExtractionErrorMessage('Minimum spacing must be greater than or equal to 0.');
      return;
    }

    setStartingSequenceExtraction(true);
    setSequenceExtractionErrorMessage('');

    try {
      const endpoint = sequenceExtractionSource.type === 'witness'
        ? `/api/filesystem/films/${selectedFilmId}/witness-videos/${encodeURIComponent(sequenceExtractionSource.name)}/sequence-extraction`
        : `/api/filesystem/films/${selectedFilmId}/reels/${encodeURIComponent(sequenceExtractionSource.name)}/sequence-extraction`;

      const payload = await postJson<SequenceExtractionAcceptedResponse>(
        endpoint,
        {
          targetFps,
          sceneThreshold,
          minSpacingSeconds,
          outputReelName: sequenceExtractionValues.outputReelName.trim() || undefined,
          overwriteExisting: sequenceExtractionValues.overwriteExisting,
        } satisfies SequenceExtractionRequest,
      );

      setSequenceExtractionJob({
        jobId: payload.jobId,
        status: payload.status,
        filmId: payload.filmId,
        witnessVideoName: payload.witnessVideoName,
        outputReelId: null,
        progressPercent: 0,
        progressRatePercentPerSecond: null,
        progressLabel: 'Queued',
        currentStep: 0,
        totalSteps: 4,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: null,
        startedAt: null,
        finishedAt: null,
        message: 'Sequence extraction job accepted.',
      });
    } catch (error) {
      setSequenceExtractionErrorMessage(error instanceof Error ? error.message : 'Unable to start sequence extraction.');
    } finally {
      setStartingSequenceExtraction(false);
    }
  };

  const refreshSequenceExtractionJob = useCallback(async (jobId: string) => {
    try {
      const payload = await fetchJson<SequenceExtractionJobStatusResponse>(`/api/sequence-extraction/jobs/${jobId}`);
      setSequenceExtractionJob(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh extraction status.';

      setSequenceExtractionErrorMessage(message);
      setSequenceExtractionJob((currentJob) => {
        if (!currentJob) {
          return currentJob;
        }

        return {
          ...currentJob,
          status: 'failed',
          message,
        };
      });
    }
  }, []);

  useEffect(() => {
    if (!selectedFilmId) {
      setReels([]);
      setSelectedReelId('');
      return;
    }

    void loadReelsForFilm(selectedFilmId);
  }, [loadReelsForFilm, selectedFilmId]);

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
    void loadWitnessVideos(selectedFilmId);
  }, [loadWitnessVideos, selectedFilmId]);

  useEffect(() => {
    void loadSequenceExtractionHistory();
  }, [loadSequenceExtractionHistory]);

  useEffect(() => {
    void loadAllWitnessVideosForTreeView();
  }, [loadAllWitnessVideosForTreeView]);

  useEffect(() => {
    if (!sequenceExtractionJob) {
      return;
    }

    if (sequenceExtractionJob.status === 'succeeded') {
      void loadReelsForFilm(selectedFilmId, sequenceExtractionJob.outputReelId ?? undefined);
      void loadSequenceExtractionHistory();
      setSuccessMessage(`Sequence extraction "${sequenceExtractionJob.outputReelId ?? sequenceExtractionJob.jobId}" completed successfully.`);
      setSequenceExtractionDialogOpen(false);
      setSequenceExtractionErrorMessage('');
      setSequenceExtractionJob(null);
      resetSequenceExtractionDefaults();
      return;
    }

    if (sequenceExtractionJob.status === 'failed') {
      void loadSequenceExtractionHistory();
      setSequenceExtractionErrorMessage(sequenceExtractionJob.message ?? 'Sequence extraction failed.');
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void refreshSequenceExtractionJob(sequenceExtractionJob.jobId);
    }, 1000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [loadReelsForFilm, loadSequenceExtractionHistory, refreshSequenceExtractionJob, selectedFilmId, sequenceExtractionJob]);

  useEffect(() => {
    setSequenceExtractionDialogOpen(false);
    setSequenceExtractionSource(null);
    setSequenceExtractionErrorMessage('');
    setSequenceExtractionJob(null);
    resetSequenceExtractionDefaults();
  }, [selectedFilmId]);

  const durationInFrames = useMemo<number>(() => {
    return frameUrls.length > 0 ? frameUrls.length : 1;
  }, [frameUrls.length]);

  const currentFilm = useMemo(() => films.find((f) => f.id === selectedFilmId) || null, [films, selectedFilmId]);
  const currentReel = useMemo(() => reels.find((r) => r.id === selectedReelId) || null, [reels, selectedReelId]);
  const currentWitness = useMemo(
    () => witnessVideos.find((w) => w.mediaUrl === selectedWitnessVideoUrl) || null,
    [witnessVideos, selectedWitnessVideoUrl],
  );

  const parseNavigationNode = (nodeId: string) => {
    if (nodeId === 'home') {
      return { type: 'home' as const };
    }

    if (nodeId.startsWith('film-')) {
      const filmId = nodeId.replace('film-', '');
      return { type: 'film' as const, filmId };
    }

    if (nodeId.startsWith('witnesses-')) {
      const filmId = nodeId.replace('witnesses-', '');
      return { type: 'witnesses' as const, filmId };
    }

    if (nodeId.startsWith('witness-')) {
      const parts = nodeId.replace('witness-', '').split('-');
      const filmId = parts[0];
      const fileName = parts.slice(1).join('-');
      return { type: 'witness' as const, filmId, fileName };
    }

    if (nodeId.startsWith('reels-')) {
      const filmId = nodeId.replace('reels-', '');
      return { type: 'reels' as const, filmId };
    }

    if (nodeId.startsWith('reel-')) {
      const parts = nodeId.replace('reel-', '').split('-');
      const filmId = parts[0];
      const reelId = parts.slice(1).join('-');
      return { type: 'reel' as const, filmId, reelId };
    }

    return { type: 'home' as const };
  };

  const navigationContext = parseNavigationNode(selectedNavigationNode);

  const handleNavigationNodeSelect = (nodeId: string) => {
    setSelectedNavigationNode(nodeId as NavigationNode | '');

    const context = parseNavigationNode(nodeId);

    if (context.type === 'film') {
      setSelectedFilmId(context.filmId);
    } else if (context.type === 'witnesses') {
      setSelectedFilmId(context.filmId);
    } else if (context.type === 'witness') {
      setSelectedFilmId(context.filmId);
      const film = films.find((f) => f.id === context.filmId);
      if (film) {
        const filmWitnesses = witnessesByFilmId[context.filmId] || [];
        const witness = filmWitnesses.find((w) => w.fileName === context.fileName);
        if (witness) {
          setSelectedWitnessVideoUrl(witness.mediaUrl);
          setSelectedWitnessFileName(witness.fileName);
        }
      }
    } else if (context.type === 'reels') {
      setSelectedFilmId(context.filmId);
    } else if (context.type === 'reel') {
      setSelectedFilmId(context.filmId);
      setSelectedReelId(context.reelId);
    }
  };

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

      <Box
        component="main"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
          gap: 1,
          padding: 1,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <AppNavigationTree
          films={films}
          reels={reelsByFilmId}
          witnessVideos={witnessesByFilmId}
          selectedNode={selectedNavigationNode}
          onNodeSelect={handleNavigationNodeSelect}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          {navigationContext.type === 'home' && (
            <DashboardPage
              films={films}
              isLoading={isLoading}
              onAddFilm={() => setCreateFilmDialogOpen(true)}
              onSelectFilm={(filmId) => {
                setSelectedFilmId(filmId);
                setSelectedNavigationNode(`film-${filmId}`);
              }}
            />
          )}

          {navigationContext.type === 'film' && (
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {currentFilm?.displayName}
                </Typography>
                <Button
                  type="button"
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteFilmDialogOpen(true)}
                  disabled={!currentFilm || isDeletingFilm}
                >
                  Delete film
                </Button>
              </Paper>
            </Box>
          )}

          {navigationContext.type === 'witnesses' && (
            <WitnessesPage
              film={currentFilm}
              witnessVideos={witnessesByFilmId[navigationContext.filmId] || []}
              isLoading={isLoading}
              onUploadWitness={() => setUploadWitnessDialogOpen(true)}
              onSelectWitness={(fileName) => {
                setSelectedWitnessFileName(fileName);
                const filmWitnesses = witnessesByFilmId[navigationContext.filmId] || [];
                const witness = filmWitnesses.find((w) => w.fileName === fileName);
                if (witness) {
                  setSelectedWitnessVideoUrl(witness.mediaUrl);
                  setSelectedNavigationNode(`witness-${navigationContext.filmId}-${fileName}`);
                }
              }}
            />
          )}

          {navigationContext.type === 'witness' && (
            <WitnessDetailPage
              film={currentFilm}
              witness={currentWitness}
              isDeleting={isDeletingWitnessVideo}
              isExtracting={isStartingSequenceExtraction || sequenceExtractionJob?.status === 'queued' || sequenceExtractionJob?.status === 'running'}
              onDelete={() => setDeleteWitnessDialogOpen(true)}
              onExtractSequence={() => {
                if (!currentWitness) {
                  return;
                }

                setSequenceExtractionSource({ type: 'witness', name: currentWitness.fileName });
                setSequenceExtractionDialogOpen(true);
                setSequenceExtractionErrorMessage('');
              }}
            />
          )}

          {navigationContext.type === 'reels' && (
            <ReelsPage
              film={currentFilm}
              reels={reelsByFilmId[navigationContext.filmId] || []}
              isLoading={isLoading}
              onUploadVideo={() => setUploadReelDialogOpen(true)}
              onSelectReel={(reelId) => {
                setSelectedReelId(reelId);
                setSelectedNavigationNode(`reel-${navigationContext.filmId}-${reelId}`);
              }}
            />
          )}

          {navigationContext.type === 'reel' && (
            <ReelDetailPage
              film={currentFilm}
              reel={currentReel}
              frameUrls={frameUrls}
              isLoading={isLoading}
              isExtracting={isStartingSequenceExtraction || sequenceExtractionJob?.status === 'queued' || sequenceExtractionJob?.status === 'running'}
              onExtractSequence={() => {
                if (!currentReel) {
                  return;
                }

                setSequenceExtractionSource({ type: 'reel', name: currentReel.id });
                setSequenceExtractionDialogOpen(true);
                setSequenceExtractionErrorMessage('');
              }}
            />
          )}
        </Box>
      </Box>

      <CreateFilmDialog
        open={isCreateFilmDialogOpen}
        isSubmitting={isSubmitting}
        errors={errors}
        register={register}
        onClose={closeCreateFilmDialog}
        onSubmit={submitCreateFilm}
      />

      <Dialog
        open={isDeleteFilmDialogOpen}
        onClose={() => {
          if (!isDeletingFilm) {
            setDeleteFilmDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirm film deletion</DialogTitle>
        <DialogContent dividers>
          <p>Delete film "{currentFilm?.displayName ?? ''}"?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteFilmDialogOpen(false)} disabled={isDeletingFilm}>
            Cancel
          </Button>
          <Button
            type="button"
            color="error"
            variant="contained"
            onClick={() => {
              void submitFilmDelete();
            }}
            disabled={isDeletingFilm || !currentFilm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteWitnessDialog
        open={isDeleteWitnessDialogOpen}
        isDeleting={isDeletingWitnessVideo}
        selectedFileName={currentWitness?.fileName ?? ''}
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

      <UploadReelVideoDialog
        open={isUploadReelDialogOpen}
        isUploading={isUploadingReelVideo}
        selectedVideo={selectedReelVideo}
        reelName={reelUploadName}
        overwriteExisting={overwriteReelVideo}
        onClose={closeUploadReelDialog}
        onFileChange={setSelectedReelVideo}
        onReelNameChange={setReelUploadName}
        onOverwriteChange={setOverwriteReelVideo}
        onUpload={() => {
          void submitReelVideoUpload();
        }}
      />

      <SequenceExtractionDialog
        open={isSequenceExtractionDialogOpen}
        selectedFilmId={selectedFilmId}
        selectedSourceLabel={sequenceExtractionSource?.type === 'reel' ? 'Reel video' : 'Witness video'}
        selectedSourceName={sequenceExtractionSource?.name ?? ''}
        isSubmitting={isStartingSequenceExtraction}
        values={sequenceExtractionValues}
        jobStatus={sequenceExtractionJob}
        errorMessage={sequenceExtractionErrorMessage}
        onClose={closeSequenceExtractionDialog}
        onFieldChange={(field, value) => {
          setSequenceExtractionValues((currentValues) => ({
            ...currentValues,
            [field]: value,
          }));
        }}
        onSubmit={() => {
          void submitSequenceExtraction();
        }}
        onResetDefaults={resetSequenceExtractionDefaults}
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
