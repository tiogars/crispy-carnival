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


def test_upload_witness_video_creates_file_in_dedicated_film_subfolder(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    film_path = tmp_path / 'test_film'
    film_path.mkdir(parents=True, exist_ok=True)

    response = client.post(
        '/api/filesystem/films/test_film/witness-video',
        files={'file': ('witness.mp4', b'video-bytes', 'video/mp4')},
    )

    assert response.status_code == 201
    assert response.json() == {
        'fileName': 'witness.mp4',
        'mediaUrl': '/media/test_film/_witness_videos/witness.mp4',
    }
    assert (film_path / '_witness_videos' / 'witness.mp4').read_bytes() == b'video-bytes'


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
    video_path = tmp_path / 'test_film' / '_witness_videos' / 'witness.mp4'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'old-bytes')

    response = client.post(
        '/api/filesystem/films/test_film/witness-video',
        files={'file': ('witness.mp4', b'new-bytes', 'video/mp4')},
        data={'overwrite': 'true'},
    )

    assert response.status_code == 201
    assert video_path.read_bytes() == b'new-bytes'


def test_get_witness_videos_lists_video_media_urls(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    witness_folder = tmp_path / 'test_film' / '_witness_videos'
    witness_folder.mkdir(parents=True, exist_ok=True)
    (witness_folder / 'b.mov').write_bytes(b'1')
    (witness_folder / 'a.mp4').write_bytes(b'2')
    (witness_folder / 'ignore.txt').write_text('x')

    response = client.get('/api/filesystem/films/test_film/witness-videos')

    assert response.status_code == 200
    assert response.json() == {
        'videos': [
            {'fileName': 'a.mp4', 'mediaUrl': '/media/test_film/_witness_videos/a.mp4'},
            {'fileName': 'b.mov', 'mediaUrl': '/media/test_film/_witness_videos/b.mov'},
        ]
    }


def test_delete_witness_video_removes_selected_file(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    video_path = tmp_path / 'test_film' / '_witness_videos' / 'witness.mp4'
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b'video-bytes')

    response = client.delete('/api/filesystem/films/test_film/witness-videos/witness.mp4')

    assert response.status_code == 204
    assert not video_path.exists()


def test_delete_witness_video_returns_404_when_missing(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(main, 'FILM_LIBRARY_ROOT', tmp_path)
    witness_folder = tmp_path / 'test_film' / '_witness_videos'
    witness_folder.mkdir(parents=True, exist_ok=True)

    response = client.delete('/api/filesystem/films/test_film/witness-videos/missing.mp4')

    assert response.status_code == 404
    assert response.json() == {'detail': 'Witness video not found.'}
