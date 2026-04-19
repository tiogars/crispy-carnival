import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@remotion/player', () => ({
  Player: () => <div data-testid="mock-player" />,
}));

const jsonResponse = (payload: unknown, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App create film modal', () => {
  it('creates a film, sends optional reel name, and shows a success snackbar', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';

      if (method === 'GET' && path === '/api/filesystem/films') {
        const callsToFilms = fetchMock.mock.calls.filter(
          ([url, requestInit]) => String(url) === '/api/filesystem/films' && (requestInit?.method ?? 'GET') === 'GET',
        ).length;

        if (callsToFilms > 1) {
          return Promise.resolve(
            jsonResponse({
              films: [
                { id: 'existing_film', displayName: 'Existing Film' },
                { id: 'new_film', displayName: 'New Film' },
              ],
            }),
          );
        }

        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/new_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/new_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/new_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'POST' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            film: { id: 'new_film', displayName: 'New Film' },
          }, 201),
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add film' }));

    await user.type(screen.getByLabelText('Film name'), 'New Film');
    await user.type(screen.getByLabelText('First reel folder (optional)'), 'Reel 01');
    await user.click(screen.getByRole('button', { name: 'Create film' }));

    await screen.findByText('Film "New Film" created successfully.');

    const postCall = fetchMock.mock.calls.find(
      ([url, requestInit]) => String(url) === '/api/filesystem/films' && requestInit?.method === 'POST',
    );

    expect(postCall).toBeDefined();
    expect(postCall?.[1]?.body).toBe(
      JSON.stringify({
        displayName: 'New Film',
        firstReelName: 'Reel 01',
      }),
    );

    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/filesystem/films')).toBe(true);
  }, 20000);

  it('renders API error message when create film fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'POST' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse(
            {
              detail: 'A film with this name already exists.',
            },
            409,
          ),
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add film' }));
    await user.type(screen.getByLabelText('Film name'), 'Existing Film');
    await user.click(screen.getByRole('button', { name: 'Create film' }));

    await screen.findByText('A film with this name already exists.');
  }, 10000);

  it('shows a normalized message when create film returns 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'POST' && path === '/api/filesystem/films') {
        return Promise.resolve(new Response('internal error', { status: 500 }));
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add film' }));
    await user.type(screen.getByLabelText('Film name'), 'New Film');
    await user.click(screen.getByRole('button', { name: 'Create film' }));

    await screen.findByText('error during film creation');
  }, 10000);

  it('uploads a witness video for the selected film from the dedicated modal', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const witnessVideosCalls = fetchMock.mock.calls.filter(
        ([url, requestInit]) =>
          String(url) === '/api/filesystem/films/existing_film/witness-videos' && (requestInit?.method ?? 'GET') === 'GET',
      ).length;

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        if (witnessVideosCalls > 1) {
          return Promise.resolve(
            jsonResponse({
              videos: [
                {
                  fileName: 'witness.mp4',
                  mediaUrl: '/media/existing_film/_witness_videos/witness.mp4',
                },
              ],
            }),
          );
        }

        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'POST' && path === '/api/filesystem/films/existing_film/witness-video') {
        return Promise.resolve(
          jsonResponse({
            fileName: 'witness.mp4',
            mediaUrl: '/media/existing_film/_witness_videos/witness.mp4',
          }, 201),
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Upload witness video' }));

    const file = new File(['fake-video'], 'witness.mp4', { type: 'video/mp4' });
    await user.upload(screen.getByTestId('witness-video-input'), file);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await screen.findByText('Witness video "witness.mp4" uploaded. Use the Extract sequence action in the toolbar when ready.');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Upload witness video' })).toBeNull();
    });
    await screen.findByRole('link', { name: 'Open direct file' }, { timeout: 10000 });

    const uploadCall = fetchMock.mock.calls.find(
      ([url, requestInit]) =>
        String(url) === '/api/filesystem/films/existing_film/witness-video' && requestInit?.method === 'POST',
    );

    expect(uploadCall).toBeDefined();
    expect(uploadCall?.[1]?.body).toBeInstanceOf(FormData);

    const uploadBody = uploadCall?.[1]?.body as FormData;
    expect(uploadBody.get('overwrite')).toBe('false');
  }, 20000);

  it('uploads a video from the reels page and navigates to the imported reel detail page', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const reelsCalls = fetchMock.mock.calls.filter(
        ([url, requestInit]) =>
          String(url) === '/api/filesystem/films/existing_film/reels' && (requestInit?.method ?? 'GET') === 'GET',
      ).length;

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        if (reelsCalls > 1) {
          return Promise.resolve(
            jsonResponse({
              reels: [{ id: 'imported_reel', frameCount: 2 }],
            }),
          );
        }

        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'POST' && path === '/api/filesystem/films/existing_film/reel-video') {
        return Promise.resolve(
          jsonResponse(
            {
              reel: {
                id: 'imported_reel',
                frameCount: 2,
              },
              sourceVideoName: 'reel-source.mp4',
            },
            201,
          ),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels/imported_reel/frames') {
        return Promise.resolve(
          jsonResponse({
            reelId: 'imported_reel',
            frames: [],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Existing Film' }));
    await user.click(await screen.findByRole('button', { name: 'Reels' }));
    await user.click(await screen.findByRole('button', { name: 'Upload video' }));

    const uploadDialog = await screen.findByRole('dialog', { name: 'Upload video' });
    const file = new File(['fake-video'], 'reel-source.mp4', { type: 'video/mp4' });
    await user.upload(within(uploadDialog).getByTestId('reel-video-input'), file);
    await user.type(within(uploadDialog).getByLabelText('Reel name (optional)'), 'Imported Reel');
    await user.click(within(uploadDialog).getByRole('button', { name: 'Upload video' }));

    await screen.findByText('Video "reel-source.mp4" uploaded as reel "imported_reel". Use the Extract sequence action in the toolbar when ready.');
    await screen.findByText('imported_reel');

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, requestInit]) =>
            String(url) === '/api/filesystem/films/existing_film/reels/imported_reel/frames' &&
            (requestInit?.method ?? 'GET') === 'GET',
        ),
      ).toBe(true);
    });

    const uploadCall = fetchMock.mock.calls.find(
      ([url, requestInit]) =>
        String(url) === '/api/filesystem/films/existing_film/reel-video' && requestInit?.method === 'POST',
    );

    expect(uploadCall).toBeDefined();
    expect(uploadCall?.[1]?.body).toBeInstanceOf(FormData);

    const uploadBody = uploadCall?.[1]?.body as FormData;
    expect(uploadBody.get('overwrite')).toBe('false');
    expect(uploadBody.get('reel_name')).toBe('Imported Reel');
  }, 20000);

  it('deletes selected witness video after confirmation from preview area', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const witnessVideosCalls = fetchMock.mock.calls.filter(
        ([url, requestInit]) =>
          String(url) === '/api/filesystem/films/existing_film/witness-videos' && (requestInit?.method ?? 'GET') === 'GET',
      ).length;

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        if (witnessVideosCalls > 1) {
          return Promise.resolve(jsonResponse({ videos: [] }));
        }

        return Promise.resolve(
          jsonResponse({
            videos: [
              {
                fileName: 'witness.mp4',
                mediaUrl: '/media/existing_film/_witness_videos/witness.mp4',
              },
            ],
          }),
        );
      }

      if (method === 'DELETE' && path === '/api/filesystem/films/existing_film/witness-videos/witness.mp4') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await screen.findByRole('link', { name: 'Open direct file' }, { timeout: 10000 });
    await user.click(screen.getByRole('button', { name: 'Delete selected witness video' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await screen.findByText('Witness video "witness.mp4" deleted successfully.');

    const deleteCall = fetchMock.mock.calls.find(
      ([url, requestInit]) =>
        String(url) === '/api/filesystem/films/existing_film/witness-videos/witness.mp4' && requestInit?.method === 'DELETE',
    );

    expect(deleteCall).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Open direct file' })).toBeNull();
  }, 10000);

  it('shows a delete film action for selected film and deletes it after confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const filmsCalls = fetchMock.mock.calls.filter(
        ([url, requestInit]) => String(url) === '/api/filesystem/films' && (requestInit?.method ?? 'GET') === 'GET',
      ).length;

      if (method === 'GET' && path === '/api/filesystem/films') {
        if (filmsCalls > 1) {
          return Promise.resolve(
            jsonResponse({
              films: [{ id: 'other_film', displayName: 'Other Film' }],
            }),
          );
        }

        return Promise.resolve(
          jsonResponse({
            films: [
              { id: 'existing_film', displayName: 'Existing Film' },
              { id: 'other_film', displayName: 'Other Film' },
            ],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/other_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/other_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/other_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'DELETE' && path === '/api/filesystem/films/existing_film') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Existing Film' }));
    await user.click(await screen.findByRole('button', { name: 'Delete film' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await screen.findByText('Film "Existing Film" deleted successfully.');

    const deleteCall = fetchMock.mock.calls.find(
      ([url, requestInit]) => String(url) === '/api/filesystem/films/existing_film' && requestInit?.method === 'DELETE',
    );

    expect(deleteCall).toBeDefined();
    expect(await screen.findByRole('button', { name: 'Other Film' })).toBeInTheDocument();
  }, 10000);

  it('starts sequence extraction, polls job status, and selects the generated reel', async () => {
    let jobStatusCalls = 0;
    let historyCalls = 0;

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const reelsCalls = fetchMock.mock.calls.filter(
        ([url, requestInit]) =>
          String(url) === '/api/filesystem/films/existing_film/reels' && (requestInit?.method ?? 'GET') === 'GET',
      ).length;

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        if (reelsCalls > 1) {
          return Promise.resolve(
            jsonResponse({
              reels: [{ id: 'witness_auto', frameCount: 2 }],
            }),
          );
        }

        return Promise.resolve(jsonResponse({ reels: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(
          jsonResponse({
            videos: [
              {
                fileName: 'witness.mp4',
                mediaUrl: '/media/existing_film/_witness_videos/witness.mp4',
              },
            ],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        historyCalls += 1;

        if (historyCalls < 2) {
          return Promise.resolve(jsonResponse({ jobs: [] }));
        }

        return Promise.resolve(
          jsonResponse({
            jobs: [
              {
                jobId: 'seqext_123',
                status: 'succeeded',
                filmId: 'existing_film',
                witnessVideoName: 'witness.mp4',
                outputReelId: 'witness_auto',
                progressPercent: 100,
                progressRatePercentPerSecond: 12.5,
                progressLabel: 'Completed',
                currentStep: 4,
                totalSteps: 4,
                elapsedSeconds: 8,
                estimatedRemainingSeconds: 0,
                startedAt: '2026-04-16T18:42:10Z',
                finishedAt: '2026-04-16T18:42:18Z',
                message: 'Sequence extraction completed successfully.',
              },
            ],
          }),
        );
      }

      if (method === 'POST' && path === '/api/filesystem/films/existing_film/witness-videos/witness.mp4/sequence-extraction') {
        return Promise.resolve(
          jsonResponse(
            {
              jobId: 'seqext_123',
              status: 'queued',
              filmId: 'existing_film',
              witnessVideoName: 'witness.mp4',
              statusUrl: '/api/sequence-extraction/jobs/seqext_123',
            },
            202,
          ),
        );
      }

      if (method === 'GET' && path === '/api/sequence-extraction/jobs/seqext_123') {
        jobStatusCalls += 1;

        if (jobStatusCalls === 1) {
          return Promise.resolve(
            jsonResponse({
              jobId: 'seqext_123',
              status: 'running',
              filmId: 'existing_film',
              witnessVideoName: 'witness.mp4',
              outputReelId: 'witness_auto',
              progressPercent: 64,
              progressRatePercentPerSecond: 8,
              progressLabel: 'Extracting frames',
              currentStep: 2,
              totalSteps: 4,
              elapsedSeconds: 8,
              estimatedRemainingSeconds: 5,
              startedAt: '2026-04-16T18:42:10Z',
              finishedAt: null,
              message: 'FFmpeg processed 7.7s of 12.0s.',
            }),
          );
        }

        return Promise.resolve(
          jsonResponse({
            jobId: 'seqext_123',
            status: 'succeeded',
            filmId: 'existing_film',
            witnessVideoName: 'witness.mp4',
            outputReelId: 'witness_auto',
            progressPercent: 100,
            progressRatePercentPerSecond: 12.5,
            progressLabel: 'Completed',
            currentStep: 4,
            totalSteps: 4,
            elapsedSeconds: 8,
            estimatedRemainingSeconds: 0,
            startedAt: '2026-04-16T18:42:10Z',
            finishedAt: '2026-04-16T18:42:18Z',
            message: 'Sequence extraction completed successfully.',
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels/witness_auto/frames') {
        return Promise.resolve(
          jsonResponse({
            reelId: 'witness_auto',
            frames: [
              '/media/existing_film/witness_auto/frame00001.jpg',
              '/media/existing_film/witness_auto/frame00002.jpg',
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Extract sequence' }));
    await user.clear(screen.getByLabelText('Output reel name'));
    await user.type(screen.getByLabelText('Output reel name'), 'Witness Auto');
    await user.click(screen.getByRole('button', { name: 'Start extraction' }));

    const postCall = fetchMock.mock.calls.find(
      ([url, requestInit]) =>
        String(url) === '/api/filesystem/films/existing_film/witness-videos/witness.mp4/sequence-extraction' &&
        requestInit?.method === 'POST',
    );

    expect(postCall).toBeDefined();
    expect(postCall?.[1]?.body).toBe(
      JSON.stringify({
        targetFps: 2,
        sceneThreshold: 0.3,
        minSpacingSeconds: 1,
        outputReelName: 'Witness Auto',
        overwriteExisting: false,
      }),
    );

    await screen.findByText('Sequence extraction "witness_auto" completed successfully.', {}, { timeout: 10000 });

    await waitFor(
      () => {
        expect(
          fetchMock.mock.calls.some(
            ([url, requestInit]) =>
              String(url) === '/api/filesystem/films/existing_film/reels/witness_auto/frames' &&
              (requestInit?.method ?? 'GET') === 'GET',
          ),
        ).toBe(true);
      },
      { timeout: 10000 },
    );

    await screen.findByText('Recent extraction history');
    await screen.findByText((content) =>
      content.includes('Elapsed: 8s') && content.includes('Remaining: 0s') && content.includes('Speed: 12.5%/s'),
    );
  }, 20000);

  it('shows uploaded file, sequences, and frames under a reel tree item', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';

      if (method === 'GET' && path === '/api/filesystem/films') {
        return Promise.resolve(
          jsonResponse({
            films: [{ id: 'existing_film', displayName: 'Existing Film' }],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels') {
        return Promise.resolve(
          jsonResponse({
            reels: [
              {
                id: 'source_reel',
                frameCount: 2,
                sourceVideoName: 'source-reel.mp4',
                sourceVideoUrl: '/media/existing_film/_reels/source_reel/source-reel.mp4',
              },
              {
                id: 'source_reel_auto',
                frameCount: 1,
                sourceVideoName: null,
                sourceVideoUrl: null,
              },
            ],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels/source_reel/sequences') {
        return Promise.resolve(
          jsonResponse({
            reels: [
              {
                id: 'source_reel_auto',
                frameCount: 1,
                sourceVideoName: null,
                sourceVideoUrl: null,
              },
            ],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/witness-videos') {
        return Promise.resolve(jsonResponse({ videos: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/sequence-extraction-jobs') {
        return Promise.resolve(jsonResponse({ jobs: [] }));
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels/source_reel/frames') {
        return Promise.resolve(
          jsonResponse({
            reelId: 'source_reel',
            frames: ['/media/existing_film/_reels/source_reel/frames/frame00001.jpg'],
          }),
        );
      }

      if (method === 'GET' && path === '/api/filesystem/films/existing_film/reels/source_reel_auto/frames') {
        return Promise.resolve(
          jsonResponse({
            reelId: 'source_reel_auto',
            frames: ['/media/existing_film/_reels/source_reel_auto/frames/frame00001.jpg'],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Existing Film' }));
    await user.click(await screen.findByRole('button', { name: 'Reels' }));
    await user.click(await screen.findByRole('button', { name: 'source_reel (2f)' }));

    await screen.findByRole('button', { name: 'Uploaded file: source-reel.mp4' });
    const sequencesButton = await screen.findByRole('button', { name: 'Sequences found from file' });
    await screen.findByRole('button', { name: 'Frames (all frames from the film)' });

    await user.click(sequencesButton);
    const sequenceReelButtons = await screen.findAllByRole('button', { name: 'source_reel_auto (1f)' });

    expect(sequenceReelButtons).toHaveLength(2);

    await user.click(sequenceReelButtons[sequenceReelButtons.length - 1]);

    await screen.findByRole('heading', { name: 'source_reel_auto' });
  }, 20000);
});
