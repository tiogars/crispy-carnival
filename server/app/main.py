import os
import re
import shutil
import subprocess
import threading
from io import BytesIO
from datetime import UTC, datetime
from json import JSONDecodeError, loads as json_loads
from json import dumps as json_dumps
from pathlib import Path
from typing import Annotated
from urllib.parse import quote
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
FILM_LIBRARY_ROOT = Path(os.getenv('FILM_LIBRARY_ROOT', str(BASE_DIR / 'data' / 'films'))).expanduser().resolve()
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'}
VIDEO_SUFFIXES = {'.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'}
WITNESS_VIDEOS_DIRNAME = '_witness_videos'
REELS_DIRNAME = '_reels'
FRAMES_DIRNAME = 'frames'
SEQUENCES_DIRNAME = 'sequences'
EXTRACTION_METADATA_FILENAME = '_sequence_extraction.json'
REEL_SOURCE_VIDEO_PREFIX = '_source_video'
JOB_STATUS_QUEUED = 'queued'
JOB_STATUS_RUNNING = 'running'
JOB_STATUS_SUCCEEDED = 'succeeded'
JOB_STATUS_FAILED = 'failed'
TEST_FILM_ID = 'Test1'
TEST_WITNESS_ID = 'witness1'
TEST_REEL_IDS = ('B1', 'B2', 'B3')
TEST_REEL_FRAME_START = 100000
TEST_WITNESS_FRAME_START = 1000000
TEST_WITNESS_SEQUENCE = (
    ('B3', 2),
    ('B3', 3),
    ('B2', 1),
    ('B2', 2),
    ('B1', 3),
    ('B1', 4),
    ('B2', 3),
    ('B2', 4),
    ('B1', 1),
    ('B1', 2),
)



def _build_media_entry_dir_name(file_name: str, fallback_name: str) -> str:
    stem = re.sub(r'[^a-zA-Z0-9]+', '_', Path(file_name).stem.lower()).strip('_')

    if not stem:
        stem = fallback_name

    return stem


def _get_witness_video_entry_path(witness_videos_path: Path, file_name: str) -> Path:
    return _safe_join(witness_videos_path, _build_media_entry_dir_name(file_name, 'witness'))


def _get_witness_frames_path(witness_videos_path: Path, file_name: str) -> Path:
    return _safe_join(_get_witness_video_entry_path(witness_videos_path, file_name), FRAMES_DIRNAME)


def _get_witness_sequences_path(witness_videos_path: Path, file_name: str) -> Path:
    return _safe_join(_get_witness_video_entry_path(witness_videos_path, file_name), SEQUENCES_DIRNAME)


def _get_reels_root_path(film_path: Path) -> Path:
    return _safe_join(film_path, REELS_DIRNAME)


def _get_reel_path(film_path: Path, reel_id: str) -> Path:
    reels_root = _get_reels_root_path(film_path)
    return _safe_join(reels_root, reel_id)


def _get_reel_frames_path(reel_path: Path) -> Path:
    return _safe_join(reel_path, FRAMES_DIRNAME)


def _get_reel_sequences_path(reel_path: Path) -> Path:
    return _safe_join(reel_path, SEQUENCES_DIRNAME)


def _find_video_file_in_folder(folder: Path) -> Path | None:
    candidates = [
        child
        for child in folder.iterdir()
        if child.is_file() and child.suffix.lower() in VIDEO_SUFFIXES
    ]

    if not candidates:
        return None

    candidates.sort(key=lambda path: path.name.lower())
    return candidates[0]


def _find_legacy_witness_video_path(witness_videos_path: Path, file_name: str) -> Path:
    return _safe_join(witness_videos_path, Path(file_name).name)


def _get_witness_frame_count(witness_videos_path: Path, file_name: str) -> int | None:
    frames_path = _get_witness_frames_path(witness_videos_path, file_name)

    if not frames_path.exists() or not frames_path.is_dir():
        legacy_frames_path = _safe_join(
            witness_videos_path,
            f"{_build_media_entry_dir_name(file_name, 'witness')}_{Path(file_name).suffix.lower().strip('.') or 'video'}_frames",
        )

        if not legacy_frames_path.exists() or not legacy_frames_path.is_dir():
            return None

        return _count_image_files(legacy_frames_path)

    return _count_image_files(frames_path)


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace('+00:00', 'Z')


class FilmItem(BaseModel):
    id: str
    displayName: str


class ReelItem(BaseModel):
    id: str
    frameCount: int
    sourceVideoName: str | None = None
    sourceVideoUrl: str | None = None


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
    frameCount: int | None = None


class UploadReelVideoResponse(BaseModel):
    reel: ReelItem
    sourceVideoName: str


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


def _build_media_url(film_id: str, film_path: Path, file_path: Path) -> str:
    relative_parts = file_path.relative_to(film_path).parts
    encoded_parts = '/'.join(quote(part) for part in relative_parts)
    return f'/media/{quote(film_id)}/{encoded_parts}'


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


def _build_test_frame_name(frame_number: int) -> str:
    return f'frame{frame_number}.jpg'


def _get_test_reel_background_color(reel_id: str) -> tuple[int, int, int]:
    if reel_id == 'B1':
        return (32, 76, 148)

    if reel_id == 'B2':
        return (34, 115, 78)

    return (128, 72, 28)


def _build_test_frame_bytes(reel_id: str, frame_position: int, frame_name: str) -> bytes:
    label = f'{reel_id} F{frame_position} ({frame_name[:-4]})'
    image = Image.new('RGB', (960, 540), _get_test_reel_background_color(reel_id))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()

    # Add a readable translucent block behind the text for visual clarity.
    draw.rectangle((48, 220, 912, 320), fill=(10, 10, 10))
    draw.text((64, 255), label, fill=(255, 255, 255), font=font)

    output = BytesIO()
    image.save(output, format='JPEG', quality=90)
    return output.getvalue()


def _create_test_film_structure(film_path: Path) -> None:
    reels_root = _get_reels_root_path(film_path)
    witness_root = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)
    witness_entry_path = _safe_join(witness_root, TEST_WITNESS_ID)
    witness_frames_path = _safe_join(witness_entry_path, FRAMES_DIRNAME)

    reels_root.mkdir(parents=False, exist_ok=True)
    witness_root.mkdir(parents=False, exist_ok=True)
    witness_entry_path.mkdir(parents=False, exist_ok=True)
    witness_frames_path.mkdir(parents=False, exist_ok=True)

    for reel_id in TEST_REEL_IDS:
        reel_path = _get_reel_path(film_path, reel_id)
        reel_frames_path = _get_reel_frames_path(reel_path)

        reel_path.mkdir(parents=False, exist_ok=True)
        reel_frames_path.mkdir(parents=False, exist_ok=True)

        for frame_index in range(4):
            reel_frame_name = _build_test_frame_name(TEST_REEL_FRAME_START + frame_index)
            reel_frame_position = frame_index + 1
            reel_frame_bytes = _build_test_frame_bytes(reel_id, reel_frame_position, reel_frame_name)
            _safe_join(reel_frames_path, reel_frame_name).write_bytes(reel_frame_bytes)

    for witness_index, (reel_id, reel_frame_position) in enumerate(TEST_WITNESS_SEQUENCE):
        source_frame_name = _build_test_frame_name(TEST_REEL_FRAME_START + (reel_frame_position - 1))
        source_frame_path = _safe_join(_get_reel_frames_path(_get_reel_path(film_path, reel_id)), source_frame_name)
        witness_frame_name = _build_test_frame_name(TEST_WITNESS_FRAME_START + witness_index)
        target_frame_path = _safe_join(witness_frames_path, witness_frame_name)
        shutil.copy2(source_frame_path, target_frame_path)


def _get_witness_video_path_or_404(film_id: str, file_name: str) -> tuple[Path, Path]:
    film_path = _get_film_path_or_404(film_id)
    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)

    entry_path = _get_witness_video_entry_path(witness_videos_path, file_name)
    video_path = _safe_join(entry_path, Path(file_name).name)

    if not video_path.exists() or not video_path.is_file():
        legacy_video_path = _find_legacy_witness_video_path(witness_videos_path, file_name)

        if legacy_video_path.exists() and legacy_video_path.is_file():
            return film_path, legacy_video_path

        raise HTTPException(status_code=404, detail='Witness video not found.')

    return film_path, video_path


def _find_reel_source_video_path(reel_path: Path) -> Path | None:
    source_video_path = _find_video_file_in_folder(reel_path)

    if source_video_path is not None:
        return source_video_path

    for child in reel_path.iterdir():
        if not child.is_dir() or child.name in {FRAMES_DIRNAME, SEQUENCES_DIRNAME}:
            continue

        nested_source_video = _find_video_file_in_folder(child)

        if nested_source_video is not None:
            return nested_source_video

    return None


def _read_sequence_extraction_metadata(output_dir: Path) -> dict[str, object] | None:
    metadata_path = output_dir / EXTRACTION_METADATA_FILENAME

    if not metadata_path.exists() or not metadata_path.is_file():
        return None

    try:
        return json_loads(metadata_path.read_text(encoding='utf-8'))
    except (OSError, JSONDecodeError):
        return None


def _build_reel_item(film_id: str, film_path: Path, reel_path: Path) -> ReelItem:
    source_video_path = _find_reel_source_video_path(reel_path)
    frames_path = _get_reel_frames_path(reel_path)

    return ReelItem(
        id=reel_path.name,
        frameCount=_count_image_files(frames_path) if frames_path.exists() else 0,
        sourceVideoName=source_video_path.name if source_video_path is not None else None,
        sourceVideoUrl=_build_media_url(film_id, film_path, source_video_path) if source_video_path is not None else None,
    )


def _get_reel_source_video_path_or_404(film_id: str, reel_id: str) -> tuple[Path, Path]:
    film_path = _get_film_path_or_404(film_id)
    reel_path = _get_reel_path(film_path, reel_id)

    if not reel_path.exists() or not reel_path.is_dir():
        raise HTTPException(status_code=404, detail='Reel not found.')

    source_video_path = _find_reel_source_video_path(reel_path)

    if source_video_path is None:
        raise HTTPException(status_code=404, detail='Source reel video not found. Re-import the reel from video to enable extraction.')

    return film_path, source_video_path


def _remove_witness_frames_if_present(film_id: str, file_name: str) -> None:
    film_path = _get_film_path_or_404(film_id)
    witness_videos_path = _safe_join(film_path, WITNESS_VIDEOS_DIRNAME)

    if not witness_videos_path.exists() or not witness_videos_path.is_dir():
        return

    witness_entry_path = _get_witness_video_entry_path(witness_videos_path, file_name)

    if witness_entry_path.exists() and witness_entry_path.is_dir():
        shutil.rmtree(witness_entry_path, ignore_errors=True)
        return

    frames_path = _get_witness_frames_path(witness_videos_path, file_name)

    if frames_path.exists() and frames_path.is_dir():
        shutil.rmtree(frames_path, ignore_errors=True)


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
    filter_graph = f"fps={target_fps},select='{select_expression}',showinfo"

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


def _build_reel_import_command(video_path: Path, output_dir: Path) -> list[str]:
    return [
        'ffmpeg',
        '-y',
        '-i',
        str(video_path),
        '-vsync',
        '0',
        str(output_dir / 'frame%05d.jpg'),
    ]


def _import_reel_video_frames(video_path: Path, output_dir: Path) -> None:
    result = subprocess.run(
        _build_reel_import_command(video_path, output_dir),
        check=False,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or 'ffmpeg failed to import the reel video.')


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


def _get_media_frame_count(video_path: Path) -> int | None:
    ffprobe_path = shutil.which('ffprobe')

    if ffprobe_path is None:
        return None

    try:
        result = subprocess.run(
            [
                ffprobe_path,
                '-v',
                'error',
                '-count_frames',
                '-select_streams',
                'v:0',
                '-show_entries',
                'stream=nb_read_frames,nb_frames',
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                str(video_path),
            ],
            check=False,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
        )
    except Exception:
        return None

    if result.returncode != 0:
        return None

    raw_values = [line.strip() for line in result.stdout.splitlines() if line.strip() and line.strip() != 'N/A']

    for raw_value in raw_values:
        try:
            frame_count = int(raw_value)
        except ValueError:
            continue

        if frame_count > 0:
            return frame_count

    return None


def _get_video_fps(video_path: Path) -> float | None:
    ffprobe_path = shutil.which('ffprobe')

    if ffprobe_path is None:
        return None

    result = subprocess.run(
        [
            ffprobe_path,
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'stream=r_frame_rate',
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

    raw = result.stdout.strip()

    if '/' in raw:
        try:
            num, den = raw.split('/', 1)
            fps = int(num) / int(den)
            return fps if fps > 0 else None
        except (ValueError, ZeroDivisionError):
            return None

    try:
        fps = float(raw)
        return fps if fps > 0 else None
    except ValueError:
        return None


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
) -> list[float]:
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    pts_times: list[float] = []
    stderr_lines: list[str] = []

    def _read_stderr() -> None:
        assert process.stderr is not None
        for line in process.stderr:
            stripped = line.strip()
            stderr_lines.append(stripped)
            match = re.search(r'\bpts_time:(\S+)', stripped)
            if match:
                try:
                    pts_times.append(float(match.group(1)))
                except ValueError:
                    pass

    stderr_thread = threading.Thread(target=_read_stderr, daemon=True)
    stderr_thread.start()

    assert process.stdout is not None

    for raw_line in process.stdout:
        line = raw_line.strip()
        progress_seconds = _parse_ffmpeg_progress_seconds(line)

        if progress_seconds is not None:
            _update_extraction_runtime_progress(job_id, progress_seconds, duration_seconds)

    stderr_thread.join()
    return_code = process.wait()

    if return_code != 0:
        stderr_output = '\n'.join(stderr_lines)
        raise subprocess.CalledProcessError(return_code, command, output='', stderr=stderr_output)

    return pts_times


def _rename_frames_to_original_numbers(output_dir: Path, pts_times: list[float], original_fps: float) -> None:
    image_files = sorted(output_dir.glob('frame*.jpg'))
    pairs = list(zip(image_files, pts_times))

    renames: list[tuple[Path, Path]] = []
    used_names: set[str] = set()

    for frame_file, pts_time in pairs:
        frame_number = round(pts_time * original_fps)
        new_name = f'frame{frame_number:05d}.jpg'

        while new_name in used_names:
            frame_number += 1
            new_name = f'frame{frame_number:05d}.jpg'

        used_names.add(new_name)
        renames.append((frame_file, output_dir / new_name))

    for source, target in sorted(renames, key=lambda x: x[1].name, reverse=True):
        if source != target:
            source.rename(target)


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
        output_dir.mkdir(parents=True, exist_ok=False)
        original_fps = _get_video_fps(video_path)
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

        pts_times = _execute_sequence_extraction_command(job_id, command, duration_seconds)

        if original_fps is not None and pts_times:
            _rename_frames_to_original_numbers(output_dir, pts_times, original_fps)
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
        _get_reels_root_path(film_path).mkdir(parents=False, exist_ok=True)
        _safe_join(film_path, WITNESS_VIDEOS_DIRNAME).mkdir(parents=False, exist_ok=True)

        if payload.firstReelName:
            try:
                reel_id = _build_reel_id(payload.firstReelName)
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

            reel_path = _get_reel_path(film_path, reel_id)
            reel_path.mkdir(parents=False, exist_ok=False)
            _get_reel_frames_path(reel_path).mkdir(parents=False, exist_ok=True)
            _get_reel_sequences_path(reel_path).mkdir(parents=False, exist_ok=True)

        return CreateFilmResponse(
            film=FilmItem(id=film_id, displayName=_format_film_display_name(film_id))
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail='error during film creation') from error


@app.post(
    '/api/filesystem/films/add-test',
    status_code=201,
    responses={
        409: {'description': 'Film already exists.'},
        500: {'description': 'error during film creation'},
    },
)
def create_test_film() -> CreateFilmResponse:
    try:
        FILM_LIBRARY_ROOT.mkdir(parents=True, exist_ok=True)

        film_path = _safe_join(FILM_LIBRARY_ROOT, TEST_FILM_ID)

        if film_path.exists():
            raise HTTPException(status_code=409, detail='A film with this name already exists.')

        film_path.mkdir(parents=False, exist_ok=False)
        _create_test_film_structure(film_path)

        return CreateFilmResponse(
            film=FilmItem(id=TEST_FILM_ID, displayName=_format_film_display_name(TEST_FILM_ID))
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail='error during film creation') from error


@app.delete(
    '/api/filesystem/films/{film_id}',
    status_code=204,
    responses={
        404: {'description': 'Film not found.'},
    },
)
def delete_film(film_id: str) -> None:
    film_path = _get_film_path_or_404(film_id)
    shutil.rmtree(film_path)


@app.get(
    '/api/filesystem/films/{film_id}/reels',
    responses={
        404: {'description': 'Film not found.'},
    },
)
def get_reels(film_id: str) -> ReelsResponse:
    film_path = _get_film_path_or_404(film_id)
    reels_root = _get_reels_root_path(film_path)

    if not reels_root.exists() or not reels_root.is_dir():
        return ReelsResponse(reels=[])

    reels = sorted(
        [child for child in reels_root.iterdir() if child.is_dir()],
        key=lambda path: path.name.lower(),
    )

    return ReelsResponse(reels=[_build_reel_item(film_id, film_path, reel) for reel in reels])


@app.get(
    '/api/filesystem/films/{film_id}/reels/{reel_id}/sequences',
    responses={
        404: {'description': 'Film or reel not found.'},
    },
)
def get_reel_sequences(film_id: str, reel_id: str) -> ReelsResponse:
    film_path, source_video_path = _get_reel_source_video_path_or_404(film_id, reel_id)
    reels_root = _get_reels_root_path(film_path)

    if not reels_root.exists() or not reels_root.is_dir():
        return ReelsResponse(reels=[])

    sequence_reels = []

    for candidate in sorted(
        [child for child in reels_root.iterdir() if child.is_dir() and child.name != reel_id],
        key=lambda path: path.name.lower(),
    ):
        metadata = _read_sequence_extraction_metadata(_get_reel_frames_path(candidate))

        if metadata is None:
            continue

        if metadata.get('witnessVideoName') != source_video_path.name:
            continue

        sequence_reels.append(_build_reel_item(film_id, film_path, candidate))

    return ReelsResponse(reels=sequence_reels)


@app.delete(
    '/api/filesystem/films/{film_id}/reels/{reel_id}',
    status_code=204,
    responses={
        404: {'description': 'Reel not found.'},
    },
)
def delete_reel(film_id: str, reel_id: str) -> None:
    film_path = _get_film_path_or_404(film_id)
    reel_path = _get_reel_path(film_path, reel_id)

    if not reel_path.exists() or not reel_path.is_dir():
        raise HTTPException(status_code=404, detail='Reel not found.')

    shutil.rmtree(reel_path)


@app.get(
    '/api/filesystem/films/{film_id}/reels/{reel_id}/frames',
    responses={
        404: {'description': 'Film or reel not found.'},
    },
)
def get_reel_frames(film_id: str, reel_id: str) -> FramesResponse:
    film_path = _get_film_path_or_404(film_id)

    reel_path = _get_reel_path(film_path, reel_id)

    if not reel_path.exists() or not reel_path.is_dir():
        raise HTTPException(status_code=404, detail='Reel not found.')

    frames_path = _get_reel_frames_path(reel_path)

    if not frames_path.exists() or not frames_path.is_dir():
        image_names = []
    else:
        image_names = _list_image_filenames(frames_path)

    frames = [
        f'/media/{quote(film_id)}/{quote(REELS_DIRNAME)}/{quote(reel_id)}/{quote(FRAMES_DIRNAME)}/{quote(name)}'
        for name in image_names
    ]

    return FramesResponse(reelId=reel_id, frames=frames)


@app.post(
    '/api/filesystem/films/{film_id}/reel-video',
    status_code=201,
    responses={
        400: {'description': 'Invalid file payload.'},
        404: {'description': 'Film not found.'},
        409: {'description': 'A reel with this name already exists.'},
        500: {'description': 'Error during reel video upload.'},
    },
)
def upload_reel_video(
    film_id: str,
    file: Annotated[UploadFile, File(...)],
    overwrite: Annotated[bool, Form()] = False,
    reel_name: Annotated[str | None, Form()] = None,
) -> UploadReelVideoResponse:
    film_path = _get_film_path_or_404(film_id)

    file_name = Path(file.filename or '').name

    if not file_name:
        raise HTTPException(status_code=400, detail='A reel video file is required.')

    try:
        reel_id = _build_reel_id(reel_name if reel_name else Path(file_name).stem)
    except ValueError as error:
        raise HTTPException(status_code=400, detail='Reel name must contain letters or numbers.') from error

    if reel_id in {WITNESS_VIDEOS_DIRNAME, REELS_DIRNAME}:
        raise HTTPException(status_code=400, detail='Reel name is reserved.')

    reels_root = _get_reels_root_path(film_path)
    reels_root.mkdir(parents=False, exist_ok=True)
    target_path = _get_reel_path(film_path, reel_id)

    if target_path.exists():
        if not overwrite:
            raise HTTPException(status_code=409, detail='A reel with this name already exists.')

        if target_path.is_dir():
            shutil.rmtree(target_path)
        else:
            target_path.unlink()

    target_path.mkdir(parents=False, exist_ok=False)

    source_video_path = target_path / file_name
    temp_video_path = target_path / f'_upload_{uuid4().hex}{Path(file_name).suffix}'
    frames_path = _get_reel_frames_path(target_path)
    sequences_path = _get_reel_sequences_path(target_path)

    try:
        with temp_video_path.open('wb') as output_stream:
            shutil.copyfileobj(file.file, output_stream)

        shutil.copy2(temp_video_path, source_video_path)
        frames_path.mkdir(parents=False, exist_ok=True)
        sequences_path.mkdir(parents=False, exist_ok=True)
    except HTTPException:
        raise
    except Exception as error:
        shutil.rmtree(target_path, ignore_errors=True)
        raise HTTPException(status_code=500, detail='Error during reel video upload.') from error
    finally:
        file.file.close()

        if temp_video_path.exists():
            temp_video_path.unlink()

    return UploadReelVideoResponse(
        reel=ReelItem(
            id=reel_id,
            frameCount=0,
            sourceVideoName=file_name,
            sourceVideoUrl=_build_media_url(film_id, film_path, source_video_path),
        ),
        sourceVideoName=file_name,
    )


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

    witness_entry_path = _get_witness_video_entry_path(witness_videos_path, file_name)
    target_path = _safe_join(witness_entry_path, file_name)
    frames_path = _get_witness_frames_path(witness_videos_path, file_name)
    sequences_path = _get_witness_sequences_path(witness_videos_path, file_name)

    if witness_entry_path.exists() and not overwrite:
        raise HTTPException(status_code=409, detail='A witness video with this name already exists.')

    if overwrite and witness_entry_path.exists() and witness_entry_path.is_dir():
        shutil.rmtree(witness_entry_path, ignore_errors=True)

    try:
        witness_entry_path.mkdir(parents=False, exist_ok=True)
        frames_path.mkdir(parents=False, exist_ok=True)
        sequences_path.mkdir(parents=False, exist_ok=True)

        with target_path.open('wb') as output_stream:
            shutil.copyfileobj(file.file, output_stream)
    except Exception as error:
        if witness_entry_path.exists() and witness_entry_path.is_dir():
            shutil.rmtree(witness_entry_path, ignore_errors=True)
        raise HTTPException(status_code=500, detail='Error during witness video upload.') from error
    finally:
        file.file.close()

    return UploadWitnessVideoResponse(
        fileName=file_name,
        mediaUrl=f'/media/{quote(film_id)}/{quote(WITNESS_VIDEOS_DIRNAME)}/{quote(witness_entry_path.name)}/{quote(file_name)}',
        fileSizeBytes=target_path.stat().st_size,
        frameCount=_get_media_frame_count(target_path),
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

    videos: list[UploadWitnessVideoResponse] = []

    for child in sorted(witness_videos_path.iterdir(), key=lambda path: path.name.lower()):
        if child.is_dir():
            video_path = _find_video_file_in_folder(child)

            if video_path is None:
                continue

            videos.append(
                UploadWitnessVideoResponse(
                    fileName=video_path.name,
                    mediaUrl=f'/media/{quote(film_id)}/{quote(WITNESS_VIDEOS_DIRNAME)}/{quote(child.name)}/{quote(video_path.name)}',
                    fileSizeBytes=video_path.stat().st_size,
                    frameCount=_get_witness_frame_count(witness_videos_path, video_path.name),
                )
            )
            continue

        if child.is_file() and child.suffix.lower() in VIDEO_SUFFIXES:
            videos.append(
                UploadWitnessVideoResponse(
                    fileName=child.name,
                    mediaUrl=f'/media/{quote(film_id)}/{quote(WITNESS_VIDEOS_DIRNAME)}/{quote(child.name)}',
                    fileSizeBytes=child.stat().st_size,
                    frameCount=_get_witness_frame_count(witness_videos_path, child.name),
                )
            )

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

    if video_path.parent.name in {WITNESS_VIDEOS_DIRNAME, ''}:
        video_path.unlink()
    else:
        shutil.rmtree(video_path.parent, ignore_errors=True)

    _remove_witness_frames_if_present(film_id, file_name)


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
    witness_sequences_path = _safe_join(video_path.parent, SEQUENCES_DIRNAME)
    witness_sequences_path.mkdir(parents=False, exist_ok=True)
    output_reel_id = _build_output_reel_id(payload.outputReelName, file_name)
    output_dir = _safe_join(witness_sequences_path, output_reel_id)

    if output_dir.exists() and not payload.overwriteExisting:
        raise HTTPException(status_code=409, detail='An extraction folder with this name already exists.')

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


@app.post(
    '/api/filesystem/films/{film_id}/reels/{reel_id}/sequence-extraction',
    status_code=202,
    responses={
        400: {'description': 'Invalid extraction parameters.'},
        404: {'description': 'Film, reel, or reel source video not found.'},
        409: {'description': 'Output reel already exists.'},
        503: {'description': 'FFmpeg is not available.'},
    },
)
def start_reel_sequence_extraction(
    film_id: str,
    reel_id: str,
    payload: SequenceExtractionRequest,
    background_tasks: BackgroundTasks,
) -> SequenceExtractionAcceptedResponse:
    _validate_sequence_extraction_request(payload)

    if not _ffmpeg_is_available():
        raise HTTPException(status_code=503, detail='FFmpeg is not available in the server runtime environment.')

    film_path, source_video_path = _get_reel_source_video_path_or_404(film_id, reel_id)
    reel_path = _get_reel_path(film_path, reel_id)
    output_reel_id = _build_output_reel_id(payload.outputReelName, reel_id)
    reels_root = _get_reels_root_path(film_path)
    output_reel_path = _safe_join(reels_root, output_reel_id)
    output_dir = _safe_join(output_reel_path, FRAMES_DIRNAME)

    if output_reel_id in {WITNESS_VIDEOS_DIRNAME, REELS_DIRNAME}:
        raise HTTPException(status_code=400, detail='Output reel name is reserved.')

    if output_reel_path.exists() and not payload.overwriteExisting:
        raise HTTPException(status_code=409, detail='A reel with this name already exists.')

    if output_reel_path.exists() and payload.overwriteExisting:
        shutil.rmtree(output_reel_path, ignore_errors=True)

    if output_reel_path == reel_path:
        raise HTTPException(status_code=400, detail='Output reel name must be different from source reel.')

    output_reel_path.mkdir(parents=False, exist_ok=True)
    _safe_join(output_reel_path, SEQUENCES_DIRNAME).mkdir(parents=False, exist_ok=True)

    job_id = f'seqext_{uuid4().hex}'
    job = SequenceExtractionJobStatusResponse(
        jobId=job_id,
        status=JOB_STATUS_QUEUED,
        filmId=film_id,
        witnessVideoName=source_video_path.name,
        outputReelId=output_reel_id,
        progressPercent=0,
        progressRatePercentPerSecond=None,
        progressLabel='Queued',
        currentStep=0,
        totalSteps=4,
        elapsedSeconds=0.0,
        estimatedRemainingSeconds=None,
        startedAt=None,
        finishedAt=None,
        message='Sequence extraction job accepted.',
    )

    with SEQUENCE_EXTRACTION_JOBS_LOCK:
        SEQUENCE_EXTRACTION_JOBS[job_id] = job

    background_tasks.add_task(
        _run_sequence_extraction_job,
        job_id,
        film_id,
        source_video_path.name,
        source_video_path,
        output_dir,
        output_reel_id,
        payload,
    )

    return SequenceExtractionAcceptedResponse(
        jobId=job_id,
        status=JOB_STATUS_QUEUED,
        filmId=film_id,
        witnessVideoName=source_video_path.name,
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
