# 2.1.4 Testing Plan

## Frontend

- TypeScript typecheck (`pnpm typecheck`)
- Production build (`pnpm build`)
- Manual validation of extraction form defaults and state transitions

## Backend

- Start server (`uvicorn app.main:app --reload`)
- Smoke-test API routes (`/health`, film/reel/frame endpoints)
- Validate extraction endpoint parameter handling
- Validate FFmpeg execution against a sample witness video

## Manual Validation

1. Add sample film directories under `server/data/films`.
2. Upload or provide a sample witness video under the selected film.
3. Select film and reel in the UI.
4. Run extraction with default parameters and verify job completion.
5. Verify expected generated frame count and playback.
6. Repeat with a lower and higher `scene_threshold` to confirm output volume
	changes as expected.
