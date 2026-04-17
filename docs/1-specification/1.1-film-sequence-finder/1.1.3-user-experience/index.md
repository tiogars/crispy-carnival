# 1.1.3 User Experience

## Main Views

- Selection panel for film and reel choices.
- Witness video selection and extraction actions for the selected film.
- Playback area for the frame sequence.

## Detailed Topics

- [1.1.3.1 Sequence Extraction Settings Page](1.1.3.1-sequence-extraction-settings-page/index.md)

## UX Requirements

- The app must show loading state during API calls.
- Empty datasets must render clear, non-blocking messages.
- Playback controls must allow scrubbing and replay.
- The layout must remain usable on desktop and mobile widths.
- The extraction action must remain disabled until a film and witness video are
	selected.
- The extraction form must prefill recommended defaults for `fps` and
	`scene_threshold`.
- The UI must expose progress, success, and failure feedback for extraction
	jobs.
- On success, the generated reel must be easy to open and review in the main
	player area.
