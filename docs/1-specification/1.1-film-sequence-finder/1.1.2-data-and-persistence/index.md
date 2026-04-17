# 1.1.2 Data and Persistence

## Source of Truth

The source of truth is the filesystem mounted for the FastAPI service.

## Directory Contract

```text
FILM_LIBRARY_ROOT/
  <film_id>/
    _witness_videos/
      <video_filename>
    <reel_id>/
      frame0001.png
      frame0002.png
      ...
```

Generated reel candidates may also include:

```text
FILM_LIBRARY_ROOT/
  <film_id>/
    <generated_reel_id>/
      frame00001.jpg
      frame00002.jpg
      _sequence_extraction.json
```

## Data Rules

- Film IDs are folder names under `FILM_LIBRARY_ROOT`.
- Reel IDs are folder names under each film folder.
- Witness videos are stored under `_witness_videos/` and are excluded from reel
  listings.
- Frames are image files sorted by filename, case-insensitive.
- Supported image types: `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tif`, `.tiff`.
- Generated reels must use the same frame listing contract as imported reels.
- `_sequence_extraction.json`, when present, stores the source video name,
  extraction parameters, generation timestamp, and job outcome metadata.
