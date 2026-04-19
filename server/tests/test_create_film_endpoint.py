from pathlib import Path

from fastapi.testclient import TestClient

from app import main


client = TestClient(main.app)


def test_create_film_returns_exact_500_payload_on_unexpected_error(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)

    def raise_runtime_error(root: Path, fragment: str) -> Path:
        raise RuntimeError('simulated failure')

    monkeypatch.setattr(main, '_safe_join', raise_runtime_error)

    response = client.post(
        '/api/filesystem/films',
        json={
            'displayName': 'Test Film',
        },
    )

    assert response.status_code == 500
    assert response.json() == {'detail': 'error during film creation'}


def test_add_test_film_creates_expected_reels_and_witness_frames(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)

    response = client.post('/api/filesystem/films/add-test', json={})

    assert response.status_code == 201
    assert response.json() == {
        'film': {
            'id': 'Test1',
            'displayName': 'Test1',
        }
    }

    film_path = tmp_path / 'Test1'
    assert film_path.exists()

    for reel_id in ('B1', 'B2', 'B3'):
        reel_frames_path = film_path / '_reels' / reel_id / 'frames'
        expected_frame_names = [f'frame{100000 + index}.jpg' for index in range(4)]

        assert reel_frames_path.exists()
        assert sorted(frame.name for frame in reel_frames_path.iterdir()) == expected_frame_names

    b1_frames_path = film_path / '_reels' / 'B1' / 'frames'
    assert (b1_frames_path / 'frame100000.jpg').read_bytes() != (b1_frames_path / 'frame100001.jpg').read_bytes()

    witness_frames_path = film_path / '_witness_videos' / 'witness1' / 'frames'
    expected_witness_frames = [f'frame{1000000 + index}.jpg' for index in range(10)]
    assert witness_frames_path.exists()
    assert sorted(frame.name for frame in witness_frames_path.iterdir()) == expected_witness_frames

    expected_mapping = [
        ('B3', 'frame100001.jpg'),
        ('B3', 'frame100002.jpg'),
        ('B2', 'frame100000.jpg'),
        ('B2', 'frame100001.jpg'),
        ('B1', 'frame100002.jpg'),
        ('B1', 'frame100003.jpg'),
        ('B2', 'frame100002.jpg'),
        ('B2', 'frame100003.jpg'),
        ('B1', 'frame100000.jpg'),
        ('B1', 'frame100001.jpg'),
    ]

    for witness_index, (reel_id, source_frame_name) in enumerate(expected_mapping):
        witness_frame_name = f'frame{1000000 + witness_index}.jpg'
        witness_frame_path = witness_frames_path / witness_frame_name
        source_frame_path = film_path / '_reels' / reel_id / 'frames' / source_frame_name

        assert witness_frame_path.read_bytes() == source_frame_path.read_bytes()


def test_add_test_film_returns_409_when_test_film_already_exists(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    (tmp_path / 'Test1').mkdir(parents=True, exist_ok=True)

    response = client.post('/api/filesystem/films/add-test', json={})

    assert response.status_code == 409
    assert response.json() == {'detail': 'A film with this name already exists.'}


def test_upload_witness_video_creates_file_in_dedicated_film_subfolder(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    monkeypatch.setattr(main, '_get_media_frame_count', lambda _video_path: 240)

    film_path = tmp_path / 'test_film'
    film_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/witness-video',
        files={'file': ('witness.mp4', b'video-bytes', 'video/mp4')},
    )

    assert response.status_code == 201
    assert response.json() == {
        'fileName': 'witness.mp4',
        'mediaUrl': '/media/test_film/_witness_videos/witness/witness.mp4',
        'fileSizeBytes': 11,
        'frameCount': 240,
    }
    assert (film_path / '_witness_videos' / 'witness' / 'witness.mp4').read_bytes() == b'video-bytes'
    assert (film_path / '_witness_videos' / 'witness' / 'frames').exists()
    assert not (film_path / '_witness_videos' / 'witness' / 'frames' / 'frame00001.jpg').exists()
    assert (film_path / '_witness_videos' / 'witness' / 'sequences').exists()


def test_delete_film_removes_film_directory(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    film_path = tmp_path / 'test_film'
    (film_path / 'reel_01').mkdir(parents=True, exist_ok=True)
    (film_path / 'reel_01' / 'frame00001.jpg').write_bytes(b'frame')

    response = client.delete('/api/filesystem/films/test_film')

    assert response.status_code == 204
    assert not film_path.exists()


def test_delete_film_returns_404_when_missing(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)

    response = client.delete('/api/filesystem/films/missing_film')

    assert response.status_code == 404
    assert response.json() == {'detail': 'Film not found.'}


def test_upload_witness_video_returns_404_when_film_does_not_exist(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)

    response = client.post(
        '/api/filesystem/films/missing_film/witness-video',
        files={'file': ('witness.mp4', b'video-bytes', 'video/mp4')},
    )

    assert response.status_code == 404
    assert response.json() == {'detail': 'Film not found.'}


def test_upload_witness_video_overwrites_existing_file_when_flag_is_true(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)

    video_path = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'witness.mp4'
    witness_frames_path = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'frames'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'old-bytes')
    witness_frames_path.mkdir(parents=True, exist_ok=True)
    (witness_frames_path / 'frame00001.jpg').write_bytes(b'old-frame')

    response = client.post(
        '/api/filesystem/films/test_film/witness-video',
        files={'file': ('witness.mp4', b'new-bytes', 'video/mp4')},
        data={'overwrite': 'true'},
    )

    assert response.status_code == 201
    assert video_path.read_bytes() == b'new-bytes'
    assert not (witness_frames_path / 'frame00001.jpg').exists()


def test_upload_witness_video_does_not_require_ffmpeg_for_mp4(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: False)
    monkeypatch.setattr(main, '_get_media_frame_count', lambda _video_path: None)
    film_path = tmp_path / 'test_film'
    film_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/witness-video',
        files={'file': ('witness.mp4', b'video-bytes', 'video/mp4')},
    )

    assert response.status_code == 201
    assert response.json()['frameCount'] is None


def test_upload_witness_video_does_not_require_ffmpeg_for_non_mp4(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: False)
    film_path = tmp_path / 'test_film'
    film_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/witness-video',
        files={'file': ('witness.mov', b'video-bytes', 'video/quicktime')},
    )

    assert response.status_code == 201
    assert response.json()['frameCount'] is None


def test_get_witness_videos_lists_video_media_urls(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    witness_folder = tmp_path / 'test_film' / '_witness_videos'
    (witness_folder / 'a').mkdir(parents=True, exist_ok=True)
    (witness_folder / 'b').mkdir(parents=True, exist_ok=True)
    (witness_folder / 'a' / 'a.mp4').write_bytes(b'2')
    (witness_folder / 'b' / 'b.mov').write_bytes(b'1')
    (witness_folder / 'a' / 'frames').mkdir(parents=True, exist_ok=True)
    (witness_folder / 'a' / 'frames' / 'frame00001.jpg').write_bytes(b'frame-1')
    (witness_folder / 'a' / 'frames' / 'frame00002.jpg').write_bytes(b'frame-2')
    (witness_folder / 'ignore.txt').write_text('x')

    response = client.get('/api/filesystem/films/test_film/witness-videos')

    assert response.status_code == 200
    assert response.json() == {
        'videos': [
            {'fileName': 'a.mp4', 'mediaUrl': '/media/test_film/_witness_videos/a/a.mp4', 'fileSizeBytes': 1, 'frameCount': 2},
            {'fileName': 'b.mov', 'mediaUrl': '/media/test_film/_witness_videos/b/b.mov', 'fileSizeBytes': 1, 'frameCount': None},
        ]
    }


def test_delete_witness_video_removes_selected_file(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    witness_folder_path = tmp_path / 'test_film' / '_witness_videos' / 'witness'
    video_path = witness_folder_path / 'witness.mp4'
    frames_path = witness_folder_path / 'frames'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'video-bytes')
    frames_path.mkdir(parents=True, exist_ok=True)
    (frames_path / 'frame00001.jpg').write_bytes(b'frame')

    response = client.delete('/api/filesystem/films/test_film/witness-videos/witness.mp4')

    assert response.status_code == 204
    assert not video_path.exists()
    assert not frames_path.exists()
    assert not witness_folder_path.exists()


def test_delete_witness_video_returns_404_when_missing(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    witness_folder = tmp_path / 'test_film' / '_witness_videos'
    witness_folder.mkdir(parents=True, exist_ok=True)

    response = client.delete('/api/filesystem/films/test_film/witness-videos/missing.mp4')

    assert response.status_code == 404
    assert response.json() == {'detail': 'Witness video not found.'}


def test_get_reels_excludes_witness_video_folder(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    film_path = tmp_path / 'test_film'
    (film_path / '_witness_videos').mkdir(parents=True, exist_ok=True)
    (film_path / '_reels' / 'reel_001' / 'frames').mkdir(parents=True, exist_ok=True)
    (film_path / '_reels' / 'reel_001' / 'frames' / 'frame0001.jpg').write_bytes(b'x')
    (film_path / '_reels' / 'reel_001' / 'reel_001.mov').write_bytes(b'video')

    response = client.get('/api/filesystem/films/test_film/reels')

    assert response.status_code == 200
    assert response.json() == {
        'reels': [
            {
                'id': 'reel_001',
                'frameCount': 1,
                'sourceVideoName': 'reel_001.mov',
                'sourceVideoUrl': '/media/test_film/_reels/reel_001/reel_001.mov',
            }
        ]
    }


def test_get_reel_sequences_returns_reels_generated_from_source_reel_video(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    reels_root = tmp_path / 'test_film' / '_reels'

    source_reel_path = reels_root / 'source_reel'
    (source_reel_path / 'frames').mkdir(parents=True, exist_ok=True)
    (source_reel_path / 'source-reel.mp4').write_bytes(b'video')

    matching_sequence_path = reels_root / 'source_reel_auto'
    (matching_sequence_path / 'frames').mkdir(parents=True, exist_ok=True)
    (matching_sequence_path / 'frames' / 'frame00001.jpg').write_bytes(b'frame')
    (matching_sequence_path / 'frames' / main.EXTRACTION_METADATA_FILENAME).write_text(
        main.json_dumps(
            {
                'witnessVideoName': 'source-reel.mp4',
                'outputReelId': 'source_reel_auto',
            }
        ),
        encoding='utf-8',
    )

    other_sequence_path = reels_root / 'other_sequence'
    (other_sequence_path / 'frames').mkdir(parents=True, exist_ok=True)
    (other_sequence_path / 'frames' / 'frame00001.jpg').write_bytes(b'frame')
    (other_sequence_path / 'frames' / main.EXTRACTION_METADATA_FILENAME).write_text(
        main.json_dumps(
            {
                'witnessVideoName': 'different-source.mp4',
                'outputReelId': 'other_sequence',
            }
        ),
        encoding='utf-8',
    )

    response = client.get('/api/filesystem/films/test_film/reels/source_reel/sequences')

    assert response.status_code == 200
    assert response.json() == {
        'reels': [
            {
                'id': 'source_reel_auto',
                'frameCount': 1,
                'sourceVideoName': None,
                'sourceVideoUrl': None,
            }
        ]
    }


def test_delete_reel_removes_selected_reel_folder(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    reel_path = tmp_path / 'test_film' / '_reels' / 'reel_001'
    (reel_path / 'frames').mkdir(parents=True, exist_ok=True)
    (reel_path / 'frames' / 'frame0001.jpg').write_bytes(b'x')

    response = client.delete('/api/filesystem/films/test_film/reels/reel_001')

    assert response.status_code == 204
    assert not reel_path.exists()


def test_delete_reel_returns_404_when_missing(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    (tmp_path / 'test_film').mkdir(parents=True, exist_ok=True)

    response = client.delete('/api/filesystem/films/test_film/reels/missing_reel')

    assert response.status_code == 404
    assert response.json() == {'detail': 'Reel not found.'}


def test_upload_reel_video_creates_reel_folder_from_uploaded_video(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)

    film_path = tmp_path / 'test_film'
    film_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/reel-video',
        files={'file': ('reel-source.mp4', b'video-bytes', 'video/mp4')},
    )

    assert response.status_code == 201
    assert response.json() == {
        'reel': {
            'id': 'reel_source',
            'frameCount': 0,
            'sourceVideoName': 'reel-source.mp4',
            'sourceVideoUrl': '/media/test_film/_reels/reel_source/reel-source.mp4',
        },
        'sourceVideoName': 'reel-source.mp4',
    }
    assert (film_path / '_reels' / 'reel_source' / 'frames').exists()
    assert not (film_path / '_reels' / 'reel_source' / 'frames' / 'frame00001.jpg').exists()
    assert (film_path / '_reels' / 'reel_source' / 'reel-source.mp4').read_bytes() == b'video-bytes'
    assert (film_path / '_reels' / 'reel_source' / 'sequences').exists()


def test_upload_reel_video_does_not_require_ffmpeg(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: False)

    film_path = tmp_path / 'test_film'
    film_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/reel-video',
        files={'file': ('reel-source.mp4', b'video-bytes', 'video/mp4')},
    )

    assert response.status_code == 201
    assert response.json()['reel']['frameCount'] == 0


def test_start_sequence_extraction_returns_503_when_ffmpeg_is_missing(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: False)
    video_path = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'witness.mp4'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'video-bytes')

    response = client.post(
        '/api/filesystem/films/test_film/witness-videos/witness.mp4/sequence-extraction',
        json={
            'targetFps': 2,
            'sceneThreshold': 0.3,
            'minSpacingSeconds': 1.0,
        },
    )

    assert response.status_code == 503
    assert response.json() == {'detail': 'FFmpeg is not available in the server runtime environment.'}


def test_start_sequence_extraction_returns_409_when_output_reel_exists(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: True)
    video_path = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'witness.mp4'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'video-bytes')
    existing_reel_path = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'sequences' / 'custom_reel'
    existing_reel_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/witness-videos/witness.mp4/sequence-extraction',
        json={
            'targetFps': 2,
            'sceneThreshold': 0.3,
            'minSpacingSeconds': 1.0,
            'outputReelName': 'Custom Reel',
        },
    )

    assert response.status_code == 409
    assert response.json() == {'detail': 'An extraction folder with this name already exists.'}


def test_start_sequence_extraction_creates_reel_and_job_status(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    main.SEQUENCE_EXTRACTION_JOBS.clear()
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: True)
    monkeypatch.setattr(main, '_get_media_duration_seconds', lambda _video_path: 12.0)
    video_path = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'witness.mp4'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'video-bytes')

    def fake_execute_sequence_extraction_command(job_id: str, command: list[str], duration_seconds: float | None):
        output_pattern = Path(command[-1])
        output_pattern.parent.mkdir(parents=True, exist_ok=True)
        (output_pattern.parent / 'frame00001.jpg').write_bytes(b'frame-1')
        (output_pattern.parent / 'frame00002.jpg').write_bytes(b'frame-2')
        assert duration_seconds is not None
        assert abs(duration_seconds - 12.0) < 0.0001
        main._update_sequence_extraction_job(
            job_id,
            progressPercent=76,
            progressRatePercentPerSecond=8.1,
            progressLabel='Extracting frames',
            currentStep=2,
            totalSteps=4,
            elapsedSeconds=9.4,
            estimatedRemainingSeconds=2.1,
            message='FFmpeg processed 9.4s of 12.0s.',
        )

    monkeypatch.setattr(main, '_execute_sequence_extraction_command', fake_execute_sequence_extraction_command)

    response = client.post(
        '/api/filesystem/films/test_film/witness-videos/witness.mp4/sequence-extraction',
        json={
            'targetFps': 2,
            'sceneThreshold': 0.3,
            'minSpacingSeconds': 1.0,
            'outputReelName': 'Witness Auto',
        },
    )

    assert response.status_code == 202
    body = response.json()
    assert body['status'] == 'queued'
    assert body['filmId'] == 'test_film'
    assert body['witnessVideoName'] == 'witness.mp4'
    assert body['statusUrl'] == f"/api/sequence-extraction/jobs/{body['jobId']}"

    status_response = client.get(body['statusUrl'])

    assert status_response.status_code == 200
    payload = status_response.json()

    assert payload == {
        'jobId': body['jobId'],
        'status': 'succeeded',
        'filmId': 'test_film',
        'witnessVideoName': 'witness.mp4',
        'outputReelId': 'witness_auto',
        'progressPercent': 100,
        'progressRatePercentPerSecond': payload['progressRatePercentPerSecond'],
        'progressLabel': 'Completed',
        'currentStep': 4,
        'totalSteps': 4,
        'elapsedSeconds': payload['elapsedSeconds'],
        'estimatedRemainingSeconds': 0.0,
        'startedAt': payload['startedAt'],
        'finishedAt': payload['finishedAt'],
        'message': 'Sequence extraction completed successfully.',
    }
    assert payload['elapsedSeconds'] is not None
    assert payload['elapsedSeconds'] >= 0
    assert payload['progressRatePercentPerSecond'] is not None
    assert payload['progressRatePercentPerSecond'] > 0

    output_dir = tmp_path / 'test_film' / '_witness_videos' / 'witness' / 'sequences' / 'witness_auto'
    assert (output_dir / 'frame00001.jpg').read_bytes() == b'frame-1'
    assert (output_dir / 'frame00002.jpg').read_bytes() == b'frame-2'
    metadata = (output_dir / main.EXTRACTION_METADATA_FILENAME).read_text(encoding='utf-8')
    assert '"witnessVideoName": "witness.mp4"' in metadata
    assert '"outputReelId": "witness_auto"' in metadata


def test_start_reel_sequence_extraction_creates_reel_and_job_status(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    main.SEQUENCE_EXTRACTION_JOBS.clear()
    monkeypatch.setattr(main, '_ffmpeg_is_available', lambda: True)
    monkeypatch.setattr(main, '_get_media_duration_seconds', lambda _video_path: 14.0)

    reel_path = tmp_path / 'test_film' / '_reels' / 'source_reel'
    reel_path.mkdir(parents=True, exist_ok=True)
    (reel_path / 'source-reel.mp4').write_bytes(b'reel-video-bytes')

    def fake_execute_sequence_extraction_command(job_id: str, command: list[str], duration_seconds: float | None):
        output_pattern = Path(command[-1])
        output_pattern.parent.mkdir(parents=True, exist_ok=True)
        (output_pattern.parent / 'frame00001.jpg').write_bytes(b'frame-1')
        (output_pattern.parent / 'frame00002.jpg').write_bytes(b'frame-2')
        assert duration_seconds is not None
        assert abs(duration_seconds - 14.0) < 0.0001
        main._update_sequence_extraction_job(
            job_id,
            progressPercent=84,
            progressRatePercentPerSecond=9.7,
            progressLabel='Extracting frames',
            currentStep=2,
            totalSteps=4,
            elapsedSeconds=11.2,
            estimatedRemainingSeconds=2.3,
            message='FFmpeg processed 11.2s of 14.0s.',
        )

    monkeypatch.setattr(main, '_execute_sequence_extraction_command', fake_execute_sequence_extraction_command)

    response = client.post(
        '/api/filesystem/films/test_film/reels/source_reel/sequence-extraction',
        json={
            'targetFps': 2,
            'sceneThreshold': 0.3,
            'minSpacingSeconds': 1.0,
            'outputReelName': 'Source Reel Auto',
        },
    )

    assert response.status_code == 202
    body = response.json()
    assert body['status'] == 'queued'
    assert body['filmId'] == 'test_film'
    assert body['witnessVideoName'] == 'source-reel.mp4'
    assert body['statusUrl'] == f"/api/sequence-extraction/jobs/{body['jobId']}"

    status_response = client.get(body['statusUrl'])

    assert status_response.status_code == 200
    payload = status_response.json()

    assert payload == {
        'jobId': body['jobId'],
        'status': 'succeeded',
        'filmId': 'test_film',
        'witnessVideoName': 'source-reel.mp4',
        'outputReelId': 'source_reel_auto',
        'progressPercent': 100,
        'progressRatePercentPerSecond': payload['progressRatePercentPerSecond'],
        'progressLabel': 'Completed',
        'currentStep': 4,
        'totalSteps': 4,
        'elapsedSeconds': payload['elapsedSeconds'],
        'estimatedRemainingSeconds': 0.0,
        'startedAt': payload['startedAt'],
        'finishedAt': payload['finishedAt'],
        'message': 'Sequence extraction completed successfully.',
    }
    assert payload['elapsedSeconds'] is not None
    assert payload['elapsedSeconds'] >= 0
    assert payload['progressRatePercentPerSecond'] is not None
    assert payload['progressRatePercentPerSecond'] > 0

    output_dir = tmp_path / 'test_film' / '_reels' / 'source_reel_auto' / 'frames'
    assert (output_dir / 'frame00001.jpg').read_bytes() == b'frame-1'
    assert (output_dir / 'frame00002.jpg').read_bytes() == b'frame-2'
    metadata = (output_dir / main.EXTRACTION_METADATA_FILENAME).read_text(encoding='utf-8')
    assert '"witnessVideoName": "source-reel.mp4"' in metadata
    assert '"outputReelId": "source_reel_auto"' in metadata


def test_get_sequence_extraction_job_status_returns_404_when_missing(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    main.SEQUENCE_EXTRACTION_JOBS.clear()

    response = client.get('/api/sequence-extraction/jobs/missing-job')

    assert response.status_code == 404
    assert response.json() == {'detail': 'Job not found.'}


def test_get_sequence_extraction_jobs_history_returns_latest_jobs_first(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    (tmp_path / 'test_film').mkdir(parents=True, exist_ok=True)
    main.SEQUENCE_EXTRACTION_JOBS.clear()
    main.SEQUENCE_EXTRACTION_JOBS.update(
        {
            'seqext_old': main.SequenceExtractionJobStatusResponse(
                jobId='seqext_old',
                status='succeeded',
                filmId='test_film',
                witnessVideoName='witness-old.mp4',
                outputReelId='old_reel',
                progressPercent=100,
                progressRatePercentPerSecond=7.5,
                progressLabel='Completed',
                currentStep=4,
                totalSteps=4,
                elapsedSeconds=12.0,
                estimatedRemainingSeconds=0.0,
                startedAt='2026-04-16T18:40:00Z',
                finishedAt='2026-04-16T18:40:12Z',
                message='Sequence extraction completed successfully.',
            ),
            'seqext_new': main.SequenceExtractionJobStatusResponse(
                jobId='seqext_new',
                status='failed',
                filmId='test_film',
                witnessVideoName='witness-new.mp4',
                outputReelId='new_reel',
                progressPercent=73,
                progressRatePercentPerSecond=8.4,
                progressLabel='Failed',
                currentStep=2,
                totalSteps=4,
                elapsedSeconds=8.7,
                estimatedRemainingSeconds=None,
                startedAt='2026-04-16T18:45:00Z',
                finishedAt='2026-04-16T18:45:09Z',
                message='Sequence extraction failed.',
            ),
        }
    )

    response = client.get('/api/filesystem/films/test_film/sequence-extraction-jobs')

    assert response.status_code == 200
    assert response.json() == {
        'jobs': [
            {
                'jobId': 'seqext_new',
                'status': 'failed',
                'filmId': 'test_film',
                'witnessVideoName': 'witness-new.mp4',
                'outputReelId': 'new_reel',
                'progressPercent': 73,
                'progressRatePercentPerSecond': 8.4,
                'progressLabel': 'Failed',
                'currentStep': 2,
                'totalSteps': 4,
                'elapsedSeconds': 8.7,
                'estimatedRemainingSeconds': None,
                'startedAt': '2026-04-16T18:45:00Z',
                'finishedAt': '2026-04-16T18:45:09Z',
                'message': 'Sequence extraction failed.',
            },
            {
                'jobId': 'seqext_old',
                'status': 'succeeded',
                'filmId': 'test_film',
                'witnessVideoName': 'witness-old.mp4',
                'outputReelId': 'old_reel',
                'progressPercent': 100,
                'progressRatePercentPerSecond': 7.5,
                'progressLabel': 'Completed',
                'currentStep': 4,
                'totalSteps': 4,
                'elapsedSeconds': 12.0,
                'estimatedRemainingSeconds': 0.0,
                'startedAt': '2026-04-16T18:40:00Z',
                'finishedAt': '2026-04-16T18:40:12Z',
                'message': 'Sequence extraction completed successfully.',
            },
        ]
    }
