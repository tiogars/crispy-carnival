import os
import re
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
FILM_LIBRARY_ROOT = Path(os.getenv('FILM_LIBRARY_ROOT', str(BASE_DIR / 'data' / 'films'))).expanduser().resolve()
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'}


class FilmItem(BaseModel):
    id: str
    displayName: str


class ReelItem(BaseModel):
    id: str
    frameCount: int


class FilmsResponse(BaseModel):
    films: list[FilmItem]


class ReelsResponse(BaseModel):
    reels: list[ReelItem]


class FramesResponse(BaseModel):
    reelId: str
    frames: list[str]


class CreateFilmRequest(BaseModel):
    displayName: str
    firstReelName: str | None = None


class CreateFilmResponse(BaseModel):
    film: FilmItem


app = FastAPI(
    title='Film Sequence Finder API',
    version='1.0.0',
    description='Filesystem-backed API to locate original reel image sequences from a selected film.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.mount('/media', StaticFiles(directory=FILM_LIBRARY_ROOT, check_dir=False), name='media')


def _safe_join(root: Path, fragment: str) -> Path:
    candidate = (root / fragment).resolve()

    if root not in candidate.parents and candidate != root:
        raise HTTPException(status_code=400, detail='Invalid path fragment.')

    return candidate


def _list_image_filenames(folder: Path) -> list[str]:
    # Use os.scandir to avoid Path object allocations and os.path.splitext to
    # avoid Path() construction per entry – critical for reels with 100k+ frames.
    names: list[str] = []

    with os.scandir(folder) as entries:
        for entry in entries:
            if not entry.is_file(follow_symlinks=False):
                continue

            _, ext = os.path.splitext(entry.name)

            if ext.lower() in IMAGE_SUFFIXES:
                names.append(entry.name)

    names.sort(key=str.lower)
    return names


def _count_image_files(folder: Path) -> int:
    # Fast path for large reel folders: avoid sorting and Path object allocations.
    count = 0

    with os.scandir(folder) as entries:
        for entry in entries:
            if not entry.is_file(follow_symlinks=False):
                continue

            _, ext = os.path.splitext(entry.name)

            if ext.lower() in IMAGE_SUFFIXES:
                count += 1

    return count


def _format_film_display_name(film_id: str) -> str:
    return film_id.replace('_', ' ').title()


def _build_film_id(display_name: str) -> str:
    normalized = re.sub(r'[^a-zA-Z0-9]+', '_', display_name.strip().lower()).strip('_')

    if not normalized:
        raise ValueError('Film name must contain letters or numbers.')

    return normalized


def _build_reel_id(reel_name: str) -> str:
    normalized = re.sub(r'[^a-zA-Z0-9]+', '_', reel_name.strip().lower()).strip('_')

    if not normalized:
        raise ValueError('First reel name must contain letters or numbers.')

    return normalized


@app.get('/health')
def get_health() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/api/filesystem/films', response_model=FilmsResponse)
def get_films() -> FilmsResponse:
    if not FILM_LIBRARY_ROOT.exists():
        return FilmsResponse(films=[])

    films = sorted([child for child in FILM_LIBRARY_ROOT.iterdir() if child.is_dir()], key=lambda path: path.name.lower())

    return FilmsResponse(
        films=[FilmItem(id=film.name, displayName=_format_film_display_name(film.name)) for film in films]
    )


@app.post(
    '/api/filesystem/films',
    status_code=201,
    responses={
        400: {'description': 'Invalid film name.'},
        409: {'description': 'Film already exists.'},
        500: {'description': 'error during film creation'},
    },
)
def create_film(payload: CreateFilmRequest) -> CreateFilmResponse:
    try:
        film_id = _build_film_id(payload.displayName)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    try:
        FILM_LIBRARY_ROOT.mkdir(parents=True, exist_ok=True)

        film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

        if film_path.exists():
            raise HTTPException(status_code=409, detail='A film with this name already exists.')

        film_path.mkdir(parents=False, exist_ok=False)

        if payload.firstReelName:
            try:
                reel_id = _build_reel_id(payload.firstReelName)
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

            reel_path = _safe_join(film_path, reel_id)
            reel_path.mkdir(parents=False, exist_ok=False)

        return CreateFilmResponse(
            film=FilmItem(id=film_id, displayName=_format_film_display_name(film_id))
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail='error during film creation') from error


@app.get('/api/filesystem/films/{film_id}/reels', response_model=ReelsResponse)
def get_reels(film_id: str) -> ReelsResponse:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    reels = sorted([child for child in film_path.iterdir() if child.is_dir()], key=lambda path: path.name.lower())

    response = [
        ReelItem(id=reel.name, frameCount=_count_image_files(reel))
        for reel in reels
    ]

    return ReelsResponse(reels=response)


@app.get('/api/filesystem/films/{film_id}/reels/{reel_id}/frames', response_model=FramesResponse)
def get_reel_frames(film_id: str, reel_id: str) -> FramesResponse:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    reel_path = _safe_join(film_path, reel_id)

    if not reel_path.exists() or not reel_path.is_dir():
        raise HTTPException(status_code=404, detail='Reel not found.')

    image_names = _list_image_filenames(reel_path)

    frames = [
        f'/media/{quote(film_id)}/{quote(reel_id)}/{quote(name)}'
        for name in image_names
    ]

    return FramesResponse(reelId=reel_id, frames=frames)
