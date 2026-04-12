# FastAPI server

This API exposes filesystem operations for film reel sequence discovery.

## Setup

```bash
cd server
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Filesystem convention

`FILM_LIBRARY_ROOT` must contain one folder per film, and each film folder must
contain one folder per reel sequence.

Example:

```text
server/data/films/
  movie_a/
    reel_001/
      frame0001.png
      frame0002.png
    reel_002/
      frame0001.png
```
