import os
import re
import shutil
from pathlib import Path
from typing import Annotated
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
FILM_LIBRARY_ROOT = Path(os.getenv('FILM_LIBRARY_ROOT', str(BASE_DIR / 'data' / 'films'))).expanduser().resolve()
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'}
VIDEO_SUFFIXES = {'.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'}
WITNESS_VIDEOS_DIRNAME = '_witness_videos'


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


class UploadWitnessVideoResponse(BaseModel):
    fileName: str
    mediaUrl: str


class WitnessVideosResponse(BaseModel):
    videos: list[UploadWitnessVideoResponse]


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


def _list_video_filenames(folder: Path) -> list[str]:
    names: list[str] = []

    with os.scandir(folder) as entries:
        for entry in entries:
            if not entry.is_file(follow_symlinks=False):
                continue

            _, ext = os.path.splitext(entry.name)

            if ext.lower() in VIDEO_SUFFIXES:
                names.append(entry.name)

    names.sort(key=str.lower)
    return names


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


@app.post(
    '/api/filesystem/films/{film_id}/witness-video',
    status_code=201,
    responses={
        400: {'description': 'Invalid file payload.'},
        404: {'description': 'Film not found.'},
        409: {'description': 'A witness video with this name already exists.'},
        500: {'description': 'Error during witness video upload.'},
    },
)
def upload_witness_video(
    film_id: str,
    file: Annotated[UploadFile, File(...)],
    overwrite: Annotated[bool, Form()] = False,
) -> UploadWitnessVideoResponse:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    file_name = Path(file.filename or '').name

    if not file_name:
        raise HTTPException(status_code=400, detail='A witness video file is required.')

    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)
    witness_videos_path.mkdir(parents=False, exist_ok=True)

    target_path = _safe_join(witness_videos_path, file_name)

    if target_path.exists() and not overwrite:
        raise HTTPException(status_code=409, detail='A witness video with this name already exists.')

    try:
        with target_path.open('wb') as output_stream:
            shutil.copyfileobj(file.file, output_stream)
    except Exception as error:
        raise HTTPException(status_code=500, detail='Error during witness video upload.') from error
    finally:
        file.file.close()

    return UploadWitnessVideoResponse(
        fileName=file_name,
        mediaUrl=f'/media/{quote(film_id)}/{quote(WITNESS_VIDEOS_DIRNAME)}/{quote(file_name)}',
    )


@app.get(
    '/api/filesystem/films/{film_id}/witness-videos',
    response_model=WitnessVideosResponse,
    responses={
        404: {'description': 'Film not found.'},
    },
)
def get_witness_videos(film_id: str) -> WitnessVideosResponse:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)

    if not witness_videos_path.exists() or not witness_videos_path.is_dir():
        return WitnessVideosResponse(videos=[])

    videos = [
        UploadWitnessVideoResponse(
            fileName=file_name,
            mediaUrl=f'/media/{quote(film_id)}/{quote(WITNESS_VIDEOS_DIRNAME)}/{quote(file_name)}',
        )
        for file_name in _list_video_filenames(witness_videos_path)
    ]

    return WitnessVideosResponse(videos=videos)


@app.delete(
    '/api/filesystem/films/{film_id}/witness-videos/{file_name}',
    status_code=204,
    responses={
        404: {'description': 'Witness video not found.'},
    },
)
def delete_witness_video(film_id: str, file_name: str) -> None:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)
    video_path = _safe_join(witness_videos_path, Path(file_name).name)

    if not video_path.exists() or not video_path.is_file():
        raise HTTPException(status_code=404, detail='Witness video not found.')

    video_path.unlink()
