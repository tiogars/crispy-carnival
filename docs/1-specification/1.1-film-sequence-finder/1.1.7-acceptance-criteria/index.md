# 1.1.7 Acceptance Criteria

## Functional Criteria

- A user can select a film from available folders.
- A user can list reel sequences for the selected film.
- A user can load and preview all frames for the selected reel.
- A user can select a witness video for the selected film.
- A user can launch sequence extraction with configurable `fps` and
	`scene_threshold` parameters.
- A successful extraction creates a reel that is immediately previewable in the
	existing viewer.

## Technical Criteria

- FastAPI endpoints respond with typed JSON payloads.
- Frontend uses Remotion to render reel frame sequences.
- Media files are served from backend static routes.
- The backend can execute FFmpeg scene-based extraction for supported video
	inputs.
- Long-running extraction is exposed through an asynchronous job contract.

## Quality Criteria

- Frontend typecheck passes.
- Frontend production build succeeds.
- Backend starts successfully and serves API routes.
- Extraction parameter validation rejects unsupported values with clear error
	messages.
