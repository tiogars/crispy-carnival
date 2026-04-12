import os
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


def _list_image_files(folder: Path) -> list[Path]:
    return sorted(
        [
            child
            for child in folder.iterdir()
            if child.is_file() and child.suffix.lower() in IMAGE_SUFFIXES
        ],
        key=lambda path: path.name.lower(),
    )


@app.get('/health')
def get_health() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/api/filesystem/films', response_model=FilmsResponse)
def get_films() -> FilmsResponse:
    if not FILM_LIBRARY_ROOT.exists():
        return FilmsResponse(films=[])

    films = sorted([child for child in FILM_LIBRARY_ROOT.iterdir() if child.is_dir()], key=lambda path: path.name.lower())

    return FilmsResponse(
        films=[FilmItem(id=film.name, displayName=film.name.replace('_', ' ').title()) for film in films]
    )


@app.get('/api/filesystem/films/{film_id}/reels', response_model=ReelsResponse)
def get_reels(film_id: str) -> ReelsResponse:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    reels = sorted([child for child in film_path.iterdir() if child.is_dir()], key=lambda path: path.name.lower())

    response = [
        ReelItem(id=reel.name, frameCount=len(_list_image_files(reel)))
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

    image_files = _list_image_files(reel_path)

    frames = [
        f'/media/{quote(film_id)}/{quote(reel_id)}/{quote(image.name)}'
        for image in image_files
    ]

    return FramesResponse(reelId=reel_id, frames=frames)
