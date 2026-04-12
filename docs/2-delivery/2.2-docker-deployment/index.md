# 2.2 Docker Deployment

This section describes the production-style local runtime using Docker Compose.

## Services

- `frontend`: static Vite build served by nginx.
- `api`: FastAPI service serving filesystem endpoints and media files.
- `proxy`: nginx reverse proxy exposed to users.

## Recommended Runtime Topology

1. `api` mounts the film library from `./server/data/films` to `/data/films`.
2. `frontend` serves the SPA on internal Docker network.
3. `proxy` routes:
	 - `/api` -> `api:8000`
	 - `/media` -> `api:8000`
	 - `/` -> `frontend:80`

## Start the stack

```bash
docker compose up -d --build
```

App URL: `http://localhost:3000`

## Stop the stack

```bash
docker compose down
```

## Hot-reload development variant

Use the `dev` profile from the main Compose file to avoid image rebuilds on
source changes.

### Services

- `frontend-dev`: Vite dev server with HMR.
- `api-dev`: FastAPI with `uvicorn --reload`.
- `proxy-dev`: nginx reverse-proxy exposing a single entrypoint.

### Start

```bash
docker compose stop proxy frontend api
docker compose up -d --build frontend-dev api-dev proxy-dev
```

This sequence avoids a port conflict on `3000` by stopping the standard proxy
before starting the dev proxy.

### Logs (optional)

```bash
docker compose logs -f frontend-dev api-dev proxy-dev
```

### Stop

```bash
docker compose down
```

### Runtime URLs

- App (via proxy): `http://localhost:3000`
- Health (via proxy): `http://localhost:3000/health`

### Hot-reload behavior

- Frontend code edits under `src/` refresh through Vite HMR.
- Backend code edits under `server/app/` reload FastAPI automatically.
- Dataset updates under `server/data/films/` are visible without rebuild.

## Optional docs service

MkDocs is isolated behind the `docs` profile:

```bash
docker compose --profile docs up -d mkdocs
```

Docs URL: `http://localhost:8000`

## Minimal validation checklist

1. `http://localhost:3000/health` returns `{"status":"ok"}`.
2. `http://localhost:3000/api/filesystem/films` returns film folders.
3. `http://localhost:3000/media/...` serves frame images.
4. Main UI at `http://localhost:3000/` can load films and reels.

## Film dataset location

Place datasets in:

```text
server/data/films/
	<film_id>/
		<reel_id>/
			frame0001.png
```
