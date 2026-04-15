# 2.2 Docker Deployment

This section describes the Docker Compose runtime variants.

## Compose files

- `docker-compose.yml`: runs prebuilt images from GitHub Container Registry.
- `docker-compose-local.yml`: builds frontend/api locally and runs the stack.
- `docker-compose-dev.yml`: runs hot-reload services against local source code.

Compose stack names:

```yaml
docker-compose.yml       -> name: crispy-carnival
docker-compose-local.yml -> name: crispy-carnival-local
docker-compose-dev.yml   -> name: crispy-carnival-dev
```

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

## Start the stack (GHCR images)

```bash
docker compose -f docker-compose.yml up -d
```

App URL: `http://localhost:3000`

## Stop the stack

```bash
docker compose -f docker-compose.yml down
```

## Start the stack (local build images)

```bash
docker compose -f docker-compose-local.yml up -d
```

This mode builds `frontend` and `api` from local Dockerfiles before starting.

## Hot-reload development stack

### Dev services

- `frontend`: Vite dev server with HMR.
- `api`: FastAPI with `uvicorn --reload`.
- `proxy`: nginx reverse-proxy exposing a single entrypoint.

### Start

```bash
docker compose -f docker-compose-dev.yml up -d --build
```

### Logs (optional)

```bash
docker compose -f docker-compose-dev.yml logs -f frontend api proxy
```

### Stop

```bash
docker compose -f docker-compose-dev.yml down
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
docker compose -f docker-compose.yml --profile docs up -d mkdocs
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
