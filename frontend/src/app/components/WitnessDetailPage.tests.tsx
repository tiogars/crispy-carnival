import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WitnessDetailPage } from './WitnessDetailPage';

vi.mock('@remotion/player', () => ({
  Player: () => <div data-testid="mock-player" />,
}));

afterEach(() => {
  cleanup();
});

describe('WitnessDetailPage', () => {
  it('suggests extracting frames when the witness video cannot be decoded', () => {
    const onExtractSequence = vi.fn();

    render(
      <WitnessDetailPage
        film={{ id: 'test_film', displayName: 'Test Film' }}
        witness={{
          fileName: 'witness.mov',
          mediaUrl: '/media/test_film/_witness_videos/witness.mov',
          fileSizeBytes: 1024,
          frameCount: 0,
        }}
        frameUrls={[]}
        isDeleting={false}
        isExtracting={false}
        onDelete={() => undefined}
        onExtractSequence={onExtractSequence}
      />,
    );

    const video = document.querySelector('video');

    expect(video).not.toBeNull();

    fireEvent.error(video as Element);

    expect(screen.getByText(/could not decode the video file/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Extract frames from file' }));

    expect(onExtractSequence).toHaveBeenCalledTimes(1);
  });

  it('offers animated and step playback when witness frames are available', async () => {
    const user = userEvent.setup();

    render(
      <WitnessDetailPage
        film={{ id: 'test_film', displayName: 'Test Film' }}
        witness={{
          fileName: 'witness.mp4',
          mediaUrl: '/media/test_film/_witness_videos/witness/witness.mp4',
          fileSizeBytes: 1024,
          frameCount: 2,
        }}
        frameUrls={[
          '/media/test_film/_witness_videos/witness/frames/frame00001.jpg',
          '/media/test_film/_witness_videos/witness/frames/frame00002.jpg',
        ]}
        isDeleting={false}
        isExtracting={false}
        onDelete={() => undefined}
        onExtractSequence={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'animated player' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'step player' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'step player' }));

    expect(screen.getByText('Frame 1 / 2')).toBeInTheDocument();
  });
});
