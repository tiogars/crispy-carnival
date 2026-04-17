# 1.1.1 Functional Specification

## Functional Scope

- List available films from a server-side filesystem root.
- For a selected film, list original reel sequence directories.
- For a selected reel, list image frames in deterministic order.
- Preview the full frame sequence in a player UI.
- For a selected witness video, configure and run a scene-based sequence
	extraction workflow that creates a new reel candidate.

## Detailed Topics

- [1.1.1.1 Video Sequence Segmentation](1.1.1.1-video-sequence-segmentation/index.md)

## User Flow

1. Open the webapp.
2. Select a film from the film selector.
3. Select a reel sequence from the reel selector.
4. Play, pause, and scrub the frame sequence in the Remotion player.
5. Optionally select a witness video for the same film.
6. Configure extraction parameters and launch sequence segmentation.
7. Review the generated reel candidate in the same player UI.

## Non-Goals

- Shot classification or semantic understanding of scene content.
- Full computer vision-based editorial detection beyond FFmpeg scene-change
	scoring.
- Metadata enrichment from external movie databases.
