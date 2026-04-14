# 4.2 API Operations

The FastAPI server exposes a REST API over HTTP.
All endpoints are prefixed with `/api/filesystem/` and return JSON.
Static media files (frame images and witness videos) are served under `/media`.

## Starting the server

```bash
cd server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation (Swagger UI) is available at
`http://localhost:8000/docs`.

## Environment variable

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `FILM_LIBRARY_ROOT` | `server/data/films` | Absolute or relative path to the film dataset root. |

## Endpoints

### Health check

```text
GET /health
```

Returns `{"status":"ok"}` when the server is running.

---

### List films

```text
GET /api/filesystem/films
```

Returns all film directories found under `FILM_LIBRARY_ROOT`.

#### Response

```json
{
  "films": [
    { "id": "the_third_man", "displayName": "The Third Man" },
    { "id": "citizen_kane",  "displayName": "Citizen Kane" }
  ]
}
```

---

### Create film

```text
POST /api/filesystem/films
Content-Type: application/json
```

Creates a new film directory under `FILM_LIBRARY_ROOT`.
Optionally creates a first reel subfolder at the same time.

#### Request body

```json
{
  "displayName": "The Third Man",
  "firstReelName": "Reel 01"
}
```

| Field | Required | Description |
| ----- | -------- | ----------- |
| `displayName` | Yes | Human-readable film name. Converted to a filesystem-safe folder name. |
| `firstReelName` | No | If provided, a reel subfolder is created inside the film directory. |

#### Response — `201 Created`

```json
{
  "film": { "id": "the_third_man", "displayName": "The Third Man" }
}
```

#### Error responses

| Status | Condition |
| ------ | --------- |
| `400` | `displayName` contains no letters or numbers after normalisation. |
| `409` | A film with the same derived ID already exists. |

---

### List reels

```text
GET /api/filesystem/films/{film_id}/reels
```

Returns all reel subdirectories for a film, with their frame counts.

#### Response

```json
{
  "reels": [
    { "id": "reel_001", "frameCount": 48 },
    { "id": "reel_002", "frameCount": 62 }
  ]
}
```

#### Error responses

| Status | Condition |
| ------ | --------- |
| `404` | Film directory not found. |

---

### List frames

```text
GET /api/filesystem/films/{film_id}/reels/{reel_id}/frames
```

Returns the media URLs of all image files in a reel, sorted alphabetically.

#### Response

```json
{
  "reelId": "reel_001",
  "frames": [
    "/media/the_third_man/reel_001/frame0001.png",
    "/media/the_third_man/reel_001/frame0002.png"
  ]
}
```

Supported image extensions: `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`,
`.tif`, `.tiff`.

#### Error responses

| Status | Condition |
| ------ | --------- |
| `404` | Film or reel directory not found. |

---

### Upload witness video

```text
POST /api/filesystem/films/{film_id}/witness-video
Content-Type: multipart/form-data
```

Uploads a video file for a film and stores it under
`<film_id>/_witness_videos/`.

#### Form fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `file` | file | The video file to upload. |
| `overwrite` | boolean | Set to `true` to replace an existing file with the same name. |

#### Response — `201 Created`

```json
{
  "fileName": "witness_20240312.mp4",
  "mediaUrl": "/media/the_third_man/_witness_videos/witness_20240312.mp4"
}
```

#### Error responses

| Status | Condition |
| ------ | --------- |
| `400` | No filename supplied. |
| `404` | Film directory not found. |
| `409` | File already exists and `overwrite` is `false`. |

---

### List witness videos

```text
GET /api/filesystem/films/{film_id}/witness-videos
```

Returns all video files stored under `<film_id>/_witness_videos/`.

#### Response

```json
{
  "videos": [
    {
      "fileName": "witness_20240312.mp4",
      "mediaUrl": "/media/the_third_man/_witness_videos/witness_20240312.mp4"
    }
  ]
}
```

---

### Delete witness video

```text
DELETE /api/filesystem/films/{film_id}/witness-videos/{file_name}
```

Permanently removes a witness video file.

#### Response — `204 No Content`

#### Error responses

| Status | Condition |
| ------ | --------- |
| `404` | Film or witness video not found. |

---

## Static media

Frame images and witness videos are served as static files under the `/media`
prefix, mapped directly to `FILM_LIBRARY_ROOT`:

```text
/media/<film_id>/<reel_id>/<frame_filename>
/media/<film_id>/_witness_videos/<video_filename>
```
