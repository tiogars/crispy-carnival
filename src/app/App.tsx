import { useEffect, useMemo, useState } from 'react';
import { Player } from '@remotion/player';

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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

const fetchJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const App = () => {
  const [films, setFilms] = useState<Film[]>([]);
  const [selectedFilmId, setSelectedFilmId] = useState<string>('');
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadFilms = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const payload = await fetchJson<{ films: Film[] }>('/api/filesystem/films');
        setFilms(payload.films);

        if (payload.films.length > 0) {
          setSelectedFilmId(payload.films[0].id);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load films.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFilms();
  }, []);

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

  const durationInFrames = useMemo<number>(() => {
    return frameUrls.length > 0 ? frameUrls.length : 1;
  }, [frameUrls.length]);

  return (
    <main className="app">
      <section className="app__panel">
        <h1>Original Reel Sequence Finder</h1>
        <p>Choose a film, inspect its original reels, and preview every scanned image frame.</p>

        <label className="app__label" htmlFor="film-select">
          Film
        </label>
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
      </section>
    </main>
  );
};
