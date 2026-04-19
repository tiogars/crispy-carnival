# crispy-carnival

Film Sequence Finder is a Vite + React + TypeScript application used to find
original reel image sequences from a selected film and preview them with
Remotion.

## Features

- Browse films discovered from a local filesystem film library.
- Select a reel sequence and preview every scanned image frame.
- Remotion-powered player with play, pause, loop, and scrub controls.
- Create new film entries and optional first-reel folders directly from the UI.
- Upload and manage witness videos associated with each film.
- Lightweight FastAPI backend — no database required, data lives on disk.

## Project structure

```text
crispy-carnival/
├── frontend/         # Vite + React + TypeScript SPA
│   └── src/
│       ├── app/      # Root component and styles
│       └── features/ # FilmSequenceComposition (Remotion)
├── server/           # FastAPI filesystem API
│   ├── app/
│   │   └── main.py   # All routes and helpers
│   └── data/films/   # Default film library root
├── proxy/            # nginx reverse-proxy config
├── docs/             # MkDocs documentation source
└── docker-compose.yml
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.11+

## Getting started

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:5173`.

### Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`.

### Docker (recommended for container runtime)

```bash
docker compose up -d
```

App available at `http://localhost:3000`.

Compose variants:

- `docker-compose.yml`: run prebuilt images from GitHub Container Registry.
- `docker-compose-local.yml`: build frontend/api locally and run the stack.
- `docker-compose-dev.yml`: run hot-reload services for local source development.

## Available scripts

| Script | Description |
| ------ | ----------- |
| `pnpm dev` | Start the Vite development server at `http://localhost:5173`. |
| `pnpm build` | Bundle the webapp for production into `dist/`. |
| `pnpm preview` | Preview the production build locally. |
| `pnpm typecheck` | Run TypeScript type-checking without emitting files. |
| `pnpm test` | Run the Vitest test suite once. |
| `pnpm test:watch` | Run Vitest in interactive watch mode. |
| `pnpm storybook` | Launch Storybook component explorer on port 6006. |
| `pnpm build-storybook` | Build static Storybook for deployment. |

## Technology stack

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| Vite | 8 | Frontend build tool and dev server |
| React | 19 | UI component library |
| TypeScript | 6 | Static type checking |
| Remotion + `@remotion/player` | 4 | Frame-sequence playback |
| MUI (Material UI) | 9 | UI component library |
| react-hook-form | 7 | Form state management |
| FastAPI | latest | Backend REST API |
| Uvicorn | latest | ASGI server |
| Python | 3.11+ | Backend runtime |
| MkDocs Material | — | Documentation site |

## Environment variables

**Frontend** (`frontend/.env`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `VITE_API_BASE_URL` | `""` (same origin) | Base URL of the FastAPI server. |
| `VITE_DOCUMENTATION_URL` | `http://localhost:8000` | URL for the documentation link in the header. |

**Backend** (environment or `server/.env`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `FILM_LIBRARY_ROOT` | `server/data/films` | Absolute or relative path to the film dataset root. |

## Film dataset contract

The film library must follow this directory layout:

```text
FILM_LIBRARY_ROOT/
  <film_id>/
    <reel_id>/
      frame0001.png
      frame0002.png
      …
    _witness_videos/       # optional — populated by the UI
      witness_clip.mp4
```

Each `<film_id>` folder represents one film. Each `<reel_id>` subfolder
contains the scanned image frames for one reel, named so that alphabetical
sort gives the correct playback order.

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Health check — returns `{"status":"ok"}`. |
| `GET` | `/api/filesystem/films` | List all films. |
| `POST` | `/api/filesystem/films` | Create a new film directory. |
| `DELETE` | `/api/filesystem/films/{film_id}` | Delete a film directory. |
| `GET` | `/api/filesystem/films/{film_id}/reels` | List reels for a film. |
| `GET` | `/api/filesystem/films/{film_id}/reels/{reel_id}/frames` | List frame URLs for a reel. |
| `GET` | `/api/filesystem/films/{film_id}/witness-videos` | List witness videos for a film. |
| `POST` | `/api/filesystem/films/{film_id}/witness-video` | Upload a witness video. |
| `DELETE` | `/api/filesystem/films/{film_id}/witness-videos/{file_name}` | Delete a witness video. |

## Documentation

Full MkDocs documentation is in `docs/`. Build and preview:

```bash
pip install mkdocs-material
mkdocs serve -f docs/settings/mkdocs.yml
```

Documentation available at `http://localhost:8000`.
