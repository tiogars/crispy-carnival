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
