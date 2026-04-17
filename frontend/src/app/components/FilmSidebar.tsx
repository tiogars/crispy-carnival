import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from '@mui/material';

import type { Film, Reel } from '../App.types';

type FilmSidebarProps = {
  films: Film[];
  reels: Reel[];
  isLoading: boolean;
  selectedFilmId: string;
  selectedReelId: string;
  frameCount: number;
  errorMessage: string;
  onAddFilm: () => void;
  onUploadWitnessVideo: () => void;
  onFilmChange: (filmId: string) => void;
  onReelChange: (reelId: string) => void;
};

export const FilmSidebar = ({
  films,
  reels,
  isLoading,
  selectedFilmId,
  selectedReelId,
  frameCount,
  errorMessage,
  onAddFilm,
  onUploadWitnessVideo,
  onFilmChange,
  onReelChange,
}: Readonly<FilmSidebarProps>) => {
  return (
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.75,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={onAddFilm} disabled={isLoading} style={{ pointerEvents: 'auto' }}>
            Add film
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={onUploadWitnessVideo}
            disabled={isLoading || !selectedFilmId}
            style={{ pointerEvents: 'auto' }}
          >
            Upload witness video
          </Button>
        </Box>
      </Box>
      <FormControl fullWidth>
        <InputLabel id="film-select-label">Film</InputLabel>
        <Select
          labelId="film-select-label"
          id="film-select"
          label="Film"
          value={selectedFilmId}
          onChange={(event) => onFilmChange(event.target.value)}
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
          onChange={(event) => onReelChange(event.target.value)}
          disabled={reels.length === 0 || isLoading}
        >
          {reels.map((reel) => (
            <MenuItem key={reel.id} value={reel.id}>
              {reel.id} ({reel.frameCount} frames)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography color="text.secondary">{isLoading ? 'Loading...' : `Loaded ${frameCount} frame(s) for playback.`}</Typography>
      {selectedFilmId ? null : <Typography color="text.secondary">Select a film to enable witness video upload.</Typography>}
      {errorMessage ? <Typography color="error" fontWeight={600}>{errorMessage}</Typography> : null}
    </Paper>
  );
};
