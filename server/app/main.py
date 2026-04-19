import os
import re
import shutil
import subprocess
import threading
from datetime import UTC, datetime
from json import dumps as json_dumps
from pathlib import Path
from typing import Annotated
from urllib.parse import quote
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
FILM_LIBRARY_ROOT = Path(os.getenv('FILM_LIBRARY_ROOT', str(BASE_DIR / 'data' / 'films'))).expanduser().resolve()
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'}
VIDEO_SUFFIXES = {'.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'}
WITNESS_VIDEOS_DIRNAME = '_witness_videos'
EXTRACTION_METADATA_FILENAME = '_sequence_extraction.json'
JOB_STATUS_QUEUED = 'queued'
JOB_STATUS_RUNNING = 'running'
JOB_STATUS_SUCCEEDED = 'succeeded'
JOB_STATUS_FAILED = 'failed'


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace('+00:00', 'Z')


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
    fileSizeBytes: int


class WitnessVideosResponse(BaseModel):
    videos: list[UploadWitnessVideoResponse]


class SequenceExtractionRequest(BaseModel):
    targetFps: float
    sceneThreshold: float
    minSpacingSeconds: float
    outputReelName: str | None = None
    overwriteExisting: bool = False


class SequenceExtractionAcceptedResponse(BaseModel):
    jobId: str
    status: str
    filmId: str
    witnessVideoName: str
    statusUrl: str


class SequenceExtractionJobStatusResponse(BaseModel):
    jobId: str
    status: str
    filmId: str
    witnessVideoName: str
    outputReelId: str | None = None
    progressPercent: int | None = None
    progressRatePercentPerSecond: float | None = None
    progressLabel: str | None = None
    currentStep: int | None = None
    totalSteps: int | None = None
    elapsedSeconds: float | None = None
    estimatedRemainingSeconds: float | None = None
    startedAt: str | None = None
    finishedAt: str | None = None
    message: str | None = None


class SequenceExtractionJobsHistoryResponse(BaseModel):
    jobs: list[SequenceExtractionJobStatusResponse]


SEQUENCE_EXTRACTION_JOBS: dict[str, SequenceExtractionJobStatusResponse] = {}
SEQUENCE_EXTRACTION_JOBS_LOCK = threading.Lock()


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


def _ffmpeg_is_available() -> bool:
    return shutil.which('ffmpeg') is not None


def _get_film_path_or_404(film_id: str) -> Path:
    film_path = _safe_join(FILM_LIBRARY_ROOT, film_id)

    if not film_path.exists() or not film_path.is_dir():
        raise HTTPException(status_code=404, detail='Film not found.')

    return film_path


def _get_witness_video_path_or_404(film_id: str, file_name: str) -> tuple[Path, Path]:
    film_path = _get_film_path_or_404(film_id)
    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)
    video_path = _safe_join(witness_videos_path, Path(file_name).name)

    if not video_path.exists() or not video_path.is_file():
        raise HTTPException(status_code=404, detail='Witness video not found.')

    return film_path, video_path


def _build_output_reel_id(requested_name: str | None, witness_video_name: str) -> str:
    if requested_name:
        try:
            return _build_reel_id(requested_name)
        except ValueError as error:
            raise HTTPException(status_code=400, detail='Output reel name must contain letters or numbers.') from error

    return _build_reel_id(f'{Path(witness_video_name).stem}_auto')


def _validate_sequence_extraction_request(payload: SequenceExtractionRequest) -> None:
    if payload.targetFps <= 0:
        raise HTTPException(status_code=400, detail='targetFps must be greater than 0.')

    if payload.sceneThreshold <= 0 or payload.sceneThreshold >= 1:
        raise HTTPException(status_code=400, detail='sceneThreshold must be greater than 0 and less than 1.')

    if payload.minSpacingSeconds < 0:
        raise HTTPException(status_code=400, detail='minSpacingSeconds must be greater than or equal to 0.')


def _build_select_expression(scene_threshold: float, min_spacing_seconds: float) -> str:
    scene_expr = f'gt(scene\\,{scene_threshold})'

    if min_spacing_seconds <= 0:
        return scene_expr

    spacing_expr = f"if(isnan(prev_selected_t)\\,1\\,gte(t-prev_selected_t\\,{min_spacing_seconds}))"
    return f'{scene_expr}*{spacing_expr}'


def _build_sequence_extraction_command(
    video_path: Path,
    output_dir: Path,
    target_fps: float,
    scene_threshold: float,
    min_spacing_seconds: float,
) -> list[str]:
    select_expression = _build_select_expression(scene_threshold, min_spacing_seconds)
    filter_graph = f"fps={target_fps},select='{select_expression}'"

    return [
        'ffmpeg',
        '-y',
        '-progress',
        'pipe:1',
        '-nostats',
        '-i',
        str(video_path),
        '-filter:v',
        filter_graph,
        '-vsync',
        'vfr',
        '-f',
        'image2',
        str(output_dir / 'frame%05d.jpg'),
    ]


def _update_sequence_extraction_job(job_id: str, **changes: str | int | float | None) -> None:
    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        job = SEQUENCE_EXTRACTION_JOBS[job_id]
        updated = job.model_copy(update=changes)
        SEQUENCE_EXTRACTION_JOBS[job_id] = updated


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None

    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None


def _get_job_elapsed_seconds(job_id: str) -> float | None:
    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        job = SEQUENCE_EXTRACTION_JOBS.get(job_id)

    if job is None:
        return None

    started_at = _parse_iso_datetime(job.startedAt)

    if started_at is None:
        return None

    finished_at = _parse_iso_datetime(job.finishedAt)
    end_time = finished_at if finished_at is not None else datetime.now(UTC)

    return max(0.0, (end_time - started_at).total_seconds())


def _get_media_duration_seconds(video_path: Path) -> float | None:
    ffprobe_path = shutil.which('ffprobe')

    if ffprobe_path is None:
        return None

    result = subprocess.run(
        [
            ffprobe_path,
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            str(video_path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        return None

    try:
        duration_seconds = float(result.stdout.strip())
    except ValueError:
        return None

    return duration_seconds if duration_seconds > 0 else None


def _parse_ffmpeg_progress_seconds(progress_line: str) -> float | None:
    if progress_line.startswith('out_time_ms='):
        try:
            return float(progress_line.split('=', 1)[1]) / 1_000_000
        except ValueError:
            return None

    if progress_line.startswith('out_time_us='):
        try:
            return float(progress_line.split('=', 1)[1]) / 1_000_000
        except ValueError:
            return None

    if progress_line.startswith('out_time='):
        raw_value = progress_line.split('=', 1)[1]

        try:
            hours, minutes, seconds = raw_value.split(':')
            return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
        except ValueError:
            return None

    return None


def _update_extraction_runtime_progress(job_id: str, processed_seconds: float | None, duration_seconds: float | None) -> None:
    elapsed_seconds = _get_job_elapsed_seconds(job_id)

    if processed_seconds is None or duration_seconds is None or duration_seconds <= 0:
        _update_sequence_extraction_job(
            job_id,
            progressPercent=50,
            progressRatePercentPerSecond=None,
            progressLabel='Extracting frames',
            currentStep=2,
            totalSteps=4,
            elapsedSeconds=elapsed_seconds,
            estimatedRemainingSeconds=None,
            message='FFmpeg is extracting representative frames.',
        )
        return

    bounded_ratio = min(max(processed_seconds / duration_seconds, 0), 1)
    progress_percent = min(95, max(10, int(10 + bounded_ratio * 85)))
    raw_estimated_remaining_seconds = None
    raw_progress_rate = None

    if elapsed_seconds is not None and bounded_ratio > 0:
        estimated_total_seconds = elapsed_seconds / bounded_ratio
        raw_estimated_remaining_seconds = max(0.0, estimated_total_seconds - elapsed_seconds)

    if elapsed_seconds is not None and elapsed_seconds > 0:
        raw_progress_rate = progress_percent / elapsed_seconds

    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        previous_job = SEQUENCE_EXTRACTION_JOBS[job_id]
        previous_eta_seconds = previous_job.estimatedRemainingSeconds
        previous_progress_rate = previous_job.progressRatePercentPerSecond

    smoothed_eta_seconds = raw_estimated_remaining_seconds
    smoothed_progress_rate = raw_progress_rate

    if raw_estimated_remaining_seconds is not None and previous_eta_seconds is not None:
        smoothed_eta_seconds = max(0.0, previous_eta_seconds * 0.7 + raw_estimated_remaining_seconds * 0.3)

    if raw_progress_rate is not None and previous_progress_rate is not None:
        smoothed_progress_rate = max(0.0, previous_progress_rate * 0.7 + raw_progress_rate * 0.3)

    _update_sequence_extraction_job(
        job_id,
        progressPercent=progress_percent,
        progressRatePercentPerSecond=smoothed_progress_rate,
        progressLabel='Extracting frames',
        currentStep=2,
        totalSteps=4,
        elapsedSeconds=elapsed_seconds,
        estimatedRemainingSeconds=smoothed_eta_seconds,
        message=f'FFmpeg processed {processed_seconds:.1f}s of {duration_seconds:.1f}s.',
    )


def _execute_sequence_extraction_command(
    job_id: str,
    command: list[str],
    duration_seconds: float | None,
) -> None:
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    assert process.stdout is not None

    for raw_line in process.stdout:
        line = raw_line.strip()
        progress_seconds = _parse_ffmpeg_progress_seconds(line)

        if progress_seconds is not None:
            _update_extraction_runtime_progress(job_id, progress_seconds, duration_seconds)

    stderr_output = process.stderr.read() if process.stderr is not None else ''
    return_code = process.wait()

    if return_code != 0:
        raise subprocess.CalledProcessError(return_code, command, output='', stderr=stderr_output)


def _write_sequence_extraction_metadata(
    output_dir: Path,
    film_id: str,
    witness_video_name: str,
    output_reel_id: str,
    payload: SequenceExtractionRequest,
    job_id: str,
    status: str,
) -> None:
    metadata = {
        'jobId': job_id,
        'status': status,
        'filmId': film_id,
        'witnessVideoName': witness_video_name,
        'outputReelId': output_reel_id,
        'targetFps': payload.targetFps,
        'sceneThreshold': payload.sceneThreshold,
        'minSpacingSeconds': payload.minSpacingSeconds,
        'overwriteExisting': payload.overwriteExisting,
        'generatedAt': _utc_now_iso(),
    }

    (output_dir / EXTRACTION_METADATA_FILENAME).write_text(
        json_dumps(metadata, indent=2),
        encoding='utf-8',
    )


def _run_sequence_extraction_job(
    job_id: str,
    film_id: str,
    witness_video_name: str,
    video_path: Path,
    output_dir: Path,
    output_reel_id: str,
    payload: SequenceExtractionRequest,
) -> None:
    _update_sequence_extraction_job(
        job_id,
        status=JOB_STATUS_RUNNING,
        progressPercent=5,
        progressRatePercentPerSecond=None,
        progressLabel='Preparing extraction',
        currentStep=1,
        totalSteps=4,
        elapsedSeconds=0.0,
        estimatedRemainingSeconds=None,
        startedAt=_utc_now_iso(),
        message='Preparing sequence extraction job.',
    )

    try:
        output_dir.mkdir(parents=False, exist_ok=False)
        duration_seconds = _get_media_duration_seconds(video_path)

        _update_sequence_extraction_job(
            job_id,
            progressPercent=10,
            progressRatePercentPerSecond=None,
            progressLabel='Analyzing source video',
            currentStep=1,
            totalSteps=4,
            elapsedSeconds=_get_job_elapsed_seconds(job_id),
            estimatedRemainingSeconds=None,
            message='Source video metadata resolved. Starting FFmpeg extraction.',
        )

        command = _build_sequence_extraction_command(
            video_path=video_path,
            output_dir=output_dir,
            target_fps=payload.targetFps,
            scene_threshold=payload.sceneThreshold,
            min_spacing_seconds=payload.minSpacingSeconds,
        )

        _execute_sequence_extraction_command(job_id, command, duration_seconds)
        _update_sequence_extraction_job(
            job_id,
            progressPercent=98,
            progressRatePercentPerSecond=(100 / elapsed_seconds) if (elapsed_seconds := _get_job_elapsed_seconds(job_id)) and elapsed_seconds > 0 else None,
            progressLabel='Finalizing output',
            currentStep=3,
            totalSteps=4,
            elapsedSeconds=elapsed_seconds,
            estimatedRemainingSeconds=1.0,
            message='Writing extraction metadata.',
        )
        _write_sequence_extraction_metadata(output_dir, film_id, witness_video_name, output_reel_id, payload, job_id, JOB_STATUS_SUCCEEDED)
        _update_sequence_extraction_job(
            job_id,
            status=JOB_STATUS_SUCCEEDED,
            outputReelId=output_reel_id,
            progressPercent=100,
            progressRatePercentPerSecond=(100 / elapsed_seconds) if (elapsed_seconds := _get_job_elapsed_seconds(job_id)) and elapsed_seconds > 0 else None,
            progressLabel='Completed',
            currentStep=4,
            totalSteps=4,
            elapsedSeconds=elapsed_seconds,
            estimatedRemainingSeconds=0.0,
            finishedAt=_utc_now_iso(),
            message='Sequence extraction completed successfully.',
        )
    except Exception as error:
        if output_dir.exists():
            shutil.rmtree(output_dir, ignore_errors=True)

        message = 'Sequence extraction failed.'

        if isinstance(error, subprocess.CalledProcessError):
            stderr = (error.stderr or '').strip()

            if stderr:
                message = stderr.splitlines()[-1]

        _update_sequence_extraction_job(
            job_id,
            status=JOB_STATUS_FAILED,
            progressLabel='Failed',
            progressRatePercentPerSecond=None,
            elapsedSeconds=_get_job_elapsed_seconds(job_id),
            estimatedRemainingSeconds=None,
            finishedAt=_utc_now_iso(),
            message=message,
        )


@app.get('/health')
def get_health() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/api/filesystem/films')
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


@app.get(
    '/api/filesystem/films/{film_id}/reels',
    responses={
        404: {'description': 'Film not found.'},
    },
)
def get_reels(film_id: str) -> ReelsResponse:
    film_path = _get_film_path_or_404(film_id)

    reels = sorted(
        [child for child in film_path.iterdir() if child.is_dir() and child.name != WITNESS_VIDEOS_DIRNAME],
        key=lambda path: path.name.lower(),
    )

    response = [
        ReelItem(id=reel.name, frameCount=_count_image_files(reel))
        for reel in reels
    ]

    return ReelsResponse(reels=response)


@app.get(
    '/api/filesystem/films/{film_id}/reels/{reel_id}/frames',
    responses={
        404: {'description': 'Film or reel not found.'},
    },
)
def get_reel_frames(film_id: str, reel_id: str) -> FramesResponse:
    film_path = _get_film_path_or_404(film_id)

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
    film_path = _get_film_path_or_404(film_id)

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
        fileSizeBytes=target_path.stat().st_size,
    )


@app.get(
    '/api/filesystem/films/{film_id}/witness-videos',
    responses={
        404: {'description': 'Film not found.'},
    },
)
def get_witness_videos(film_id: str) -> WitnessVideosResponse:
    film_path = _get_film_path_or_404(film_id)

    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)

    if not witness_videos_path.exists() or not witness_videos_path.is_dir():
        return WitnessVideosResponse(videos=[])

    videos = [
        UploadWitnessVideoResponse(
            fileName=file_name,
            mediaUrl=f'/media/{quote(film_id)}/{quote(WITNESS_VIDEOS_DIRNAME)}/{quote(file_name)}',
            fileSizeBytes=(witness_videos_path / file_name).stat().st_size,
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
    _, video_path = _get_witness_video_path_or_404(film_id, file_name)

    video_path.unlink()


@app.post(
    '/api/filesystem/films/{film_id}/witness-videos/{file_name}/sequence-extraction',
    status_code=202,
    responses={
        400: {'description': 'Invalid extraction parameters.'},
        404: {'description': 'Film or witness video not found.'},
        409: {'description': 'Output reel already exists.'},
        503: {'description': 'FFmpeg is not available.'},
    },
)
def start_sequence_extraction(
    film_id: str,
    file_name: str,
    payload: SequenceExtractionRequest,
    background_tasks: BackgroundTasks,
) -> SequenceExtractionAcceptedResponse:
    _validate_sequence_extraction_request(payload)

    if not _ffmpeg_is_available():
        raise HTTPException(status_code=503, detail='FFmpeg is not available in the server runtime environment.')

    film_path, video_path = _get_witness_video_path_or_404(film_id, file_name)
    output_reel_id = _build_output_reel_id(payload.outputReelName, file_name)
    output_dir = _safe_join(film_path, output_reel_id)

    if output_reel_id == WITNESS_VIDEOS_DIRNAME:
        raise HTTPException(status_code=400, detail='Output reel name is reserved.')

    if output_dir.exists() and not payload.overwriteExisting:
        raise HTTPException(status_code=409, detail='A reel with this name already exists.')

    if output_dir.exists() and payload.overwriteExisting:
        shutil.rmtree(output_dir, ignore_errors=True)

    job_id = f'seqext_{uuid4().hex}'
    job = SequenceExtractionJobStatusResponse(
        jobId=job_id,
        status=JOB_STATUS_QUEUED,
        filmId=film_id,
        witnessVideoName=Path(file_name).name,
        outputReelId=output_reel_id,
        progressPercent=0,
        progressRatePercentPerSecond=None,
        progressLabel='Queued',
        currentStep=0,
        totalSteps=4,
        elapsedSeconds=0.0,
        estimatedRemainingSeconds=None,
        message='Sequence extraction job accepted.',
    )

    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        SEQUENCE_EXTRACTION_JOBS[job_id] = job

    background_tasks.add_task(
        _run_sequence_extraction_job,
        job_id,
        film_id,
        Path(file_name).name,
        video_path,
        output_dir,
        output_reel_id,
        payload,
    )

    return SequenceExtractionAcceptedResponse(
        jobId=job_id,
        status=JOB_STATUS_QUEUED,
        filmId=film_id,
        witnessVideoName=Path(file_name).name,
        statusUrl=f'/api/sequence-extraction/jobs/{job_id}',
    )


@app.get(
    '/api/sequence-extraction/jobs/{job_id}',
    responses={
        404: {'description': 'Job not found.'},
    },
)
def get_sequence_extraction_job_status(job_id: str) -> SequenceExtractionJobStatusResponse:
    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        job = SEQUENCE_EXTRACTION_JOBS.get(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail='Job not found.')

    return job


@app.get(
    '/api/filesystem/films/{film_id}/sequence-extraction-jobs',
    responses={
        404: {'description': 'Film not found.'},
    },
)
def get_sequence_extraction_jobs_history(film_id: str) -> SequenceExtractionJobsHistoryResponse:
    _get_film_path_or_404(film_id)

    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        matching_jobs = [job for job in SEQUENCE_EXTRACTION_JOBS.values() if job.filmId == film_id]

    sorted_jobs = sorted(
        matching_jobs,
        key=lambda job: job.finishedAt or job.startedAt or '',
        reverse=True,
    )

    return SequenceExtractionJobsHistoryResponse(jobs=sorted_jobs)
