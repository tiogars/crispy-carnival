# crispy-carnival

Film Sequence Finder is a Vite + React + TypeScript application used to find
original reel image sequences from a selected film and preview them with
Remotion.

## Architecture

- Frontend: Vite, React, TypeScript, Remotion Player
- Backend: FastAPI filesystem API in `server/`
- Data source: filesystem directories mounted as film library

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.11+

## Frontend setup

```bash
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:5173`.

## Backend setup

```bash
cd server
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`.

## Environment variables

Frontend:

- `VITE_API_BASE_URL` (default: `http://localhost:8000`)

Backend:

- `FILM_LIBRARY_ROOT` (default: `server/data/films`)

## Film dataset contract

```text
FILM_LIBRARY_ROOT/
  <film_id>/
    <reel_id>/
      frame0001.png
      frame0002.png
```

## API endpoints

- `GET /health`
- `GET /api/filesystem/films`
- `GET /api/filesystem/films/{film_id}/reels`
- `GET /api/filesystem/films/{film_id}/reels/{reel_id}/frames`

## Documentation

MkDocs source is in `docs/`. Build and preview with your existing MkDocs
workflow.
