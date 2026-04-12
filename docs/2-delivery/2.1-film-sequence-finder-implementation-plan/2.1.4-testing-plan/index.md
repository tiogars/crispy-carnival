# 2.1.4 Testing Plan

## Frontend

- TypeScript typecheck (`pnpm typecheck`)
- Production build (`pnpm build`)

## Backend

- Start server (`uvicorn app.main:app --reload`)
- Smoke-test API routes (`/health`, film/reel/frame endpoints)

## Manual Validation

1. Add sample film directories under `server/data/films`.
2. Select film and reel in the UI.
3. Verify expected frame count and playback.
