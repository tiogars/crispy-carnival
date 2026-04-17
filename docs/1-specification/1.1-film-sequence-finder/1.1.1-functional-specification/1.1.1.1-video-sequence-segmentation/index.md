# 1.1.1.1 Video Sequence Segmentation

## Goal

Provide a configurable function that extracts representative frames from a
selected witness video and stores the result as a new reel candidate for the
currently selected film.

## Primary User Story

As an operator, I want to select a witness video in the application and launch
scene-based extraction so that I can generate a reel candidate without leaving
the product.

## Preconditions

- A film is selected in the UI.
- At least one witness video exists for the selected film.
- The selected witness video is readable by the backend.
- FFmpeg is available in the backend runtime environment.

## Functional Workflow

1. The user selects a film.
2. The user selects a witness video associated with that film.
3. The user opens a sequence segmentation form.
4. The user reviews or updates extraction parameters.
5. The user submits the extraction request.
6. The backend validates the request and starts an extraction job.
7. The backend runs FFmpeg scene detection on the selected witness video.
8. The backend writes extracted frames to a generated reel directory.
9. The application refreshes reel candidates and selects the new reel when the
   job completes successfully.

## Function Contract

### Inputs

- `film_id`: target film identifier.
- `witness_video_name`: selected source video filename.
- `target_fps`: frame sampling rate applied before scene selection.
- `scene_threshold`: FFmpeg scene-change threshold used by
  `select='gt(scene,threshold)'`.
- `min_spacing_seconds`: minimum gap between accepted frames to reduce near-
  duplicates.
- `output_reel_name`: optional human-readable reel identifier. When omitted,
  the backend generates a deterministic name.
- `overwrite_existing`: optional boolean allowing replacement of a previously
  generated reel with the same name.

### Recommended Defaults

- `target_fps = 2`
- `scene_threshold = 0.30`
- `min_spacing_seconds = 1.0`
- `overwrite_existing = false`

### Threshold Guidance

Use `scene_threshold` as a tuning parameter rather than a fixed constant.

- `0.10` to `0.20`: high sensitivity, useful for exhaustive review, prone to
  false positives.
- `0.25` to `0.40`: recommended operating range for most witness videos.
- `0.50` and above: strict mode for hard cuts only.

The application should explain that a lower threshold creates more candidate
frames and a higher threshold creates fewer, cleaner cuts.

## Processing Rules

- The extraction implementation must be based on FFmpeg scene scoring.
- The baseline filter chain is:

```text
fps={target_fps},select='gt(scene,{scene_threshold})'
```

- The backend may append additional filters or post-processing to enforce
  `min_spacing_seconds` and output normalization.
- Frames must be exported in deterministic filename order.
- The extraction result must remain compatible with the existing reel viewer.
- Unsupported video formats must fail validation before job execution.

## Output Contract

On success, the function creates a new reel candidate under the selected film
with:

- extracted frame image files;
- optional extraction metadata for traceability;
- a status indicating successful completion.

The generated reel must immediately appear in reel listings returned by the
backend.

## Error Cases

- No film selected.
- No witness video selected.
- Witness video file missing on disk.
- FFmpeg unavailable or execution failure.
- Invalid parameter values such as `target_fps <= 0` or a threshold outside the
  supported range.
- Output reel name collision when overwrite is disabled.

Each failure must return an actionable message that the UI can display without
exposing internal command details.

## API Expectations

The implementation should expose:

- a command endpoint to start extraction for a selected witness video;
- a status endpoint to poll job progress;
- existing reel listing endpoints to discover the generated output.

Long-running extraction must be modeled as an asynchronous job rather than a
synchronous HTTP request.

## UX Expectations

- The extraction action is disabled until a witness video is selected.
- The parameter form starts with recommended defaults.
- The UI shows running, succeeded, and failed states.
- The UI allows the operator to inspect the generated reel immediately after a
  successful run.

## Non-Goals

- Automatic selection of the best threshold from content analysis alone.
- Timeline editing, manual shot merging, or manual frame curation.
- Semantic grouping of scenes by people, objects, or locations.
