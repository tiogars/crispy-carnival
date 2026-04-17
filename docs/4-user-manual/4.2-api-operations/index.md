# 4.2 API Operations

The FastAPI server exposes a REST API over HTTP.
Filesystem endpoints are prefixed with `/api/filesystem/` and asynchronous
extraction job endpoints are prefixed with `/api/sequence-extraction/`.
All API endpoints return JSON except file upload requests and `204` delete
responses.
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

### Start sequence extraction

```text
POST /api/filesystem/films/{film_id}/witness-videos/{file_name}/sequence-extraction
Content-Type: application/json
```

Starts an asynchronous FFmpeg-based extraction job for the selected witness
video.

#### Request body

```json
{
  "targetFps": 2,
  "sceneThreshold": 0.3,
  "minSpacingSeconds": 1.0,
  "outputReelName": "witness_20240312_auto",
  "overwriteExisting": false
}
```

| Field | Required | Description |
| ----- | -------- | ----------- |
| `targetFps` | Yes | Number of frames per second evaluated before scene selection. Must be greater than `0`. |
| `sceneThreshold` | Yes | FFmpeg scene sensitivity threshold. Must be greater than `0` and less than `1`. |
| `minSpacingSeconds` | Yes | Minimum delay between accepted frames. Must be `0` or greater. |
| `outputReelName` | No | Optional target reel name. If omitted, the backend generates one. |
| `overwriteExisting` | No | When `true`, replaces an existing generated reel with the same target name. |

#### Response — `202 Accepted`

```json
{
  "jobId": "seqext_20260416_001",
  "status": "queued",
  "filmId": "the_third_man",
  "witnessVideoName": "witness_20240312.mp4",
  "statusUrl": "/api/sequence-extraction/jobs/seqext_20260416_001"
}
```

#### Error responses

| Status | Condition |
| ------ | --------- |
| `400` | Invalid parameter values or invalid reel name. |
| `404` | Film or witness video not found. |
| `409` | Output reel already exists and `overwriteExisting` is `false`. |
| `503` | FFmpeg is not available in the server runtime environment. |

---

### Get sequence extraction job status

```text
GET /api/sequence-extraction/jobs/{job_id}
```

Returns the current state of an asynchronous sequence extraction job.

#### Response

```json
{
  "jobId": "seqext_20260416_001",
  "status": "succeeded",
  "filmId": "the_third_man",
  "witnessVideoName": "witness_20240312.mp4",
  "outputReelId": "witness_20240312_auto",
  "startedAt": "2026-04-16T18:42:10Z",
  "finishedAt": "2026-04-16T18:42:18Z",
  "message": "Sequence extraction completed successfully."
}
```

#### Status values

| Status | Meaning |
| ------ | ------- |
| `queued` | The request was accepted and is waiting to start. |
| `running` | FFmpeg extraction is in progress. |
| `succeeded` | Extraction completed and the generated reel is available. |
| `failed` | Extraction stopped with an error that can be shown to the user. |

#### Error responses

| Status | Condition |
| ------ | --------- |
| `404` | Job ID not found or expired. |

---

## Static media

Frame images and witness videos are served as static files under the `/media`
prefix, mapped directly to `FILM_LIBRARY_ROOT`:

```text
/media/<film_id>/<reel_id>/<frame_filename>
/media/<film_id>/_witness_videos/<video_filename>
```

Generated reels created by sequence extraction are exposed through the same reel
media path pattern as imported reels.
