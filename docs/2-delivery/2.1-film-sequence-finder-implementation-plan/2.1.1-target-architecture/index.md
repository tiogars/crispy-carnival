# 2.1.1 Target Architecture

```text
React + Vite + TypeScript + Remotion
            |
            v
        FastAPI
            |
            v
     FFmpeg extraction runner
            |
            v
      Filesystem film library
```

The frontend consumes JSON endpoints and media URLs from FastAPI. FastAPI
coordinates FFmpeg-based extraction jobs and persists generated reels back into
the film library structure.
