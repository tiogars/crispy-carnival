# 1.1.2 Data and Persistence

## Source of Truth

The source of truth is the filesystem mounted for the FastAPI service.

## Directory Contract

```text
FILM_LIBRARY_ROOT/
  <film_id>/
    <reel_id>/
      frame0001.png
      frame0002.png
      ...
```

## Data Rules

- Film IDs are folder names under `FILM_LIBRARY_ROOT`.
- Reel IDs are folder names under each film folder.
- Frames are image files sorted by filename, case-insensitive.
- Supported image types: `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tif`, `.tiff`.
