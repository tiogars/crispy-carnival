# 1.1.1 Functional Specification

## Functional Scope

- List available films from a server-side filesystem root.
- For a selected film, list original reel sequence directories.
- For a selected reel, list image frames in deterministic order.
- Preview the full frame sequence in a player UI.

## User Flow

1. Open the webapp.
2. Select a film from the film selector.
3. Select a reel sequence from the reel selector.
4. Play, pause, and scrub the frame sequence in the Remotion player.

## Non-Goals

- Automatic computer vision extraction of reels from video files.
- Metadata enrichment from external movie databases.
