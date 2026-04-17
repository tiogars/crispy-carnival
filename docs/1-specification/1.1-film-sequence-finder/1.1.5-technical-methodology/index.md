# 1.1.5 Technical Methodology

## Design Principles

- Keep backend endpoints focused on filesystem read operations.
- Isolate long-running media extraction in explicit backend job flows.
- Keep frontend state explicit and type-safe.
- Keep media URL generation deterministic and secure.

## API Strategy

- `GET /api/filesystem/films`
- `GET /api/filesystem/films/{film_id}/reels`
- `GET /api/filesystem/films/{film_id}/reels/{reel_id}/frames`
- `POST /api/filesystem/films/{film_id}/witness-videos/{video_name}/sequence-extraction`
- `GET /api/sequence-extraction/jobs/{job_id}`

## Frontend Strategy

- Load films on startup.
- Load reels when film changes.
- Load frames when reel changes.
- Load witness videos when film changes.
- Start extraction from the selected witness video with sensible defaults.
- Poll extraction status and refresh reels when a job succeeds.
- Render frame sequence with Remotion player.

## Extraction Strategy

- Validate parameters before invoking FFmpeg.
- Use FFmpeg scene detection with a default threshold of `0.30` and document
	that it is tunable.
- Persist extraction metadata alongside generated frames for auditability.
- Keep output directories compatible with the existing reel listing contract.
