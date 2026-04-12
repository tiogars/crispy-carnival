# 1.1.5 Technical Methodology

## Design Principles

- Keep backend endpoints focused on filesystem read operations.
- Keep frontend state explicit and type-safe.
- Keep media URL generation deterministic and secure.

## API Strategy

- `GET /api/filesystem/films`
- `GET /api/filesystem/films/{film_id}/reels`
- `GET /api/filesystem/films/{film_id}/reels/{reel_id}/frames`

## Frontend Strategy

- Load films on startup.
- Load reels when film changes.
- Load frames when reel changes.
- Render frame sequence with Remotion player.
