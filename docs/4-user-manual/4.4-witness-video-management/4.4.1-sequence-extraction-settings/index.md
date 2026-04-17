# 4.4.1 Sequence Extraction Settings

This page describes the proposed settings screen used to extract a reel
candidate from a selected witness video.

## Purpose

The settings screen lets an operator configure the FFmpeg-based extraction
parameters before starting a sequence extraction job.

The backend uses FFmpeg scene detection to keep representative frames from the
selected witness video rather than every frame.

## How to open the settings screen

1. Select a film.
2. Select a witness video for that film.
3. Click **Extract sequence**.

The action remains disabled until both the film and witness video are selected.

## Screen content

### Source summary

The top of the page confirms the selected source:

- film name;
- witness video name;
- duration when available;
- resolution when available.

### Settings form

| Field | Default | Description |
| ----- | ------- | ----------- |
| **Target FPS** | `2` | Number of frames per second evaluated before scene detection. |
| **Scene threshold** | `0.30` | Sensitivity of scene detection. Lower values keep more frames. |
| **Minimum spacing (seconds)** | `1.0` | Prevents near-duplicate extractions that happen too close together. |
| **Output reel name** | Auto-generated | Optional name for the generated reel folder. |
| **Overwrite existing reel** | Off | Replaces a generated reel that uses the same target name. |

### Recommended threshold ranges

| Threshold range | Typical effect |
| --------------- | -------------- |
| `0.10` to `0.20` | Very sensitive. Produces many frames and more false positives. |
| `0.25` to `0.40` | Recommended default range for most witness videos. |
| `0.50+` | Strict mode. Keeps mainly hard cuts. |

## Technical note

The extraction logic is based on the FFmpeg filter chain below:

```text
fps={target_fps},select='gt(scene,{scene_threshold})'
```

This means:

- `fps` reduces the number of frames evaluated each second;
- `scene_threshold` controls how much visual change is required to keep a
  frame.

## Primary actions

- **Reset to defaults** restores the recommended values.
- **Start extraction** submits the job.
- **Cancel** closes the screen without changes.

## Status feedback

The screen should show one of these states:

- `Ready`
- `Running`
- `Succeeded`
- `Failed`

On success, the UI should refresh the reel list and make the generated reel
easy to open in the viewer.

## Installing FFmpeg on Windows

On Windows, install FFmpeg with `winget`:

```powershell
winget install ffmpeg
```

After installation:

1. Open a new terminal so the updated `PATH` is available.
2. Verify FFmpeg is installed:

```powershell
ffmpeg -version
```

If the command is still not found, verify that the FFmpeg installation path was
added to the system `PATH` and restart the terminal again.

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `Start extraction` is disabled | No film or witness video selected. | Select both before opening the screen. |
| Too many extracted frames | `Scene threshold` is too low. | Increase the threshold, for example from `0.30` to `0.40`. |
| Too few extracted frames | `Scene threshold` is too high. | Lower the threshold, for example from `0.30` to `0.20`. |
| Extraction fails immediately | FFmpeg is missing or not available in `PATH`. | Install FFmpeg with `winget install ffmpeg` and verify with `ffmpeg -version`. |
