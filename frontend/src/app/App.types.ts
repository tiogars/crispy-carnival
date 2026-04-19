export type NavigationNode = 'home' | `film-${string}` | `witnesses-${string}` | `witness-${string}` | `reels-${string}` | `reel-${string}` | `sequences-${string}`;

export type Film = {
  id: string;
  displayName: string;
};

export type Reel = {
  id: string;
  frameCount: number;
};

export type ReelFramesResponse = {
  reelId: string;
  frames: string[];
};

export type CreateFilmRequest = {
  displayName: string;
  firstReelName?: string;
};

export type CreateFilmResponse = {
  film: Film;
};

export type UploadWitnessVideoResponse = {
  fileName: string;
  mediaUrl: string;
  fileSizeBytes: number;
};

export type WitnessVideosResponse = {
  videos: UploadWitnessVideoResponse[];
};

export type SequenceExtractionRequest = {
  targetFps: number;
  sceneThreshold: number;
  minSpacingSeconds: number;
  outputReelName?: string;
  overwriteExisting?: boolean;
};

export type SequenceExtractionAcceptedResponse = {
  jobId: string;
  status: 'queued';
  filmId: string;
  witnessVideoName: string;
  statusUrl: string;
};

export type SequenceExtractionJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type SequenceExtractionJobStatusResponse = {
  jobId: string;
  status: SequenceExtractionJobStatus;
  filmId: string;
  witnessVideoName: string;
  outputReelId: string | null;
  progressPercent: number | null;
  progressRatePercentPerSecond: number | null;
  progressLabel: string | null;
  currentStep: number | null;
  totalSteps: number | null;
  elapsedSeconds: number | null;
  estimatedRemainingSeconds: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
};

export type SequenceExtractionJobsHistoryResponse = {
  jobs: SequenceExtractionJobStatusResponse[];
};

export type SequenceExtractionFormValues = {
  targetFps: string;
  sceneThreshold: string;
  minSpacingSeconds: string;
  outputReelName: string;
  overwriteExisting: boolean;
};

export type NewFilmFormValues = {
  displayName: string;
  firstReelName: string;
};
