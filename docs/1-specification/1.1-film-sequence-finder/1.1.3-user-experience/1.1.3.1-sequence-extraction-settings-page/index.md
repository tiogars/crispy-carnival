# 1.1.3.1 Sequence Extraction Settings Page

## Goal

Define a dedicated settings surface that lets an operator configure and launch
scene-based sequence extraction from a selected witness video.

## Placement

- Entry point: a **Extract sequence** action in the witness video area.
- Presentation: a dedicated page or full-screen dialog.
- Visibility: only available when a film and witness video are selected.

## Layout

The page is split into three areas:

| Area | Purpose |
| ---- | ------- |
| **Source summary** | Confirms the selected film and witness video. |
| **Extraction settings** | Lets the user review and edit FFmpeg-related parameters. |
| **Execution panel** | Shows validation messages, job status, and primary actions. |

## Source Summary

Display the following read-only fields:

- `Film`
- `Witness video`
- `Video filename`
- `Detected duration` when available
- `Detected resolution` when available

## Extraction Settings

### Required Fields

| Field | Type | Default | Purpose |
| ----- | ---- | ------- | ------- |
| `Target FPS` | number | `2` | Sampling rate before scene selection. |
| `Scene threshold` | decimal | `0.30` | FFmpeg scene sensitivity threshold. |
| `Minimum spacing (seconds)` | decimal | `1.0` | Minimum gap between accepted frames. |

### Optional Fields

| Field | Type | Default | Purpose |
| ----- | ---- | ------- | ------- |
| `Output reel name` | text | auto-generated | Human-readable reel identifier. |
| `Overwrite existing reel` | boolean | `false` | Allows replacement when the target reel already exists. |

### Inline Guidance

The page should explain:

- lower `Scene threshold` means more extracted frames;
- higher `Scene threshold` means fewer, stricter cuts;
- `0.25` to `0.40` is the recommended range for most videos;
- `Target FPS` controls how many frames per second are evaluated before scene
  detection.

## Advanced Information

The page may include a collapsible technical note showing the backend filter
logic:

```text
fps={target_fps},select='gt(scene,{scene_threshold})'
```

This note is informative only. The user does not edit the raw FFmpeg command
directly.

## Actions

| Action | Behaviour |
| ------ | --------- |
| `Reset to defaults` | Restores recommended values. |
| `Cancel` | Closes the page without starting extraction. |
| `Start extraction` | Validates parameters and submits the job. |

## Validation Rules

- `Target FPS` must be greater than `0`.
- `Scene threshold` must be greater than `0` and less than `1`.
- `Minimum spacing (seconds)` must be `0` or greater.
- `Output reel name`, when provided, must be filesystem-safe after
  normalization.

Validation errors must appear inline next to the relevant field and in a form
summary above the primary action.

## Status States

The execution panel must show:

- `Ready` before submission.
- `Running` while the backend job is active.
- `Succeeded` with the generated reel identifier.
- `Failed` with a user-facing explanation.

## Success Behaviour

After a successful run:

- refresh the reel list for the selected film;
- automatically select the generated reel when possible;
- offer a direct action to open the reel in the main player.

## Windows Requirement Notice

If FFmpeg is missing from the backend environment, the page should display a
clear setup hint for Windows:

```powershell
winget install ffmpeg
```

The hint should also recommend opening a new terminal and verifying the
installation with:

```powershell
ffmpeg -version
```
