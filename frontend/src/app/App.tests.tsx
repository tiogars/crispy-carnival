import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

      if (method === 'GET' && path === '/api/filesystem/films/new_film/reels') {
        return Promise.resolve(jsonResponse({ reels: [] }));
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

    await waitFor(() => {
      expect((screen.getByRole('combobox', { name: 'Film' }) as HTMLSelectElement).value).toBe('new_film');
    });
  });

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
  });

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
  });
});
