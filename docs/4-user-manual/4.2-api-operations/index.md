# 4.2 API Operations

## Endpoints

- `GET /health`
- `GET /api/filesystem/films`
- `GET /api/filesystem/films/{film_id}/reels`
- `GET /api/filesystem/films/{film_id}/reels/{reel_id}/frames`

## Example startup

```bash
cd server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment variable

- `FILM_LIBRARY_ROOT`: absolute or relative path to the film dataset root.
