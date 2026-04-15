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
};

export type WitnessVideosResponse = {
  videos: UploadWitnessVideoResponse[];
};

export type NewFilmFormValues = {
  displayName: string;
  firstReelName: string;
};
