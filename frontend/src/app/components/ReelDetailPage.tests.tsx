import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReelDetailPage } from './ReelDetailPage';

vi.mock('@remotion/player', () => ({
  Player: () => <div data-testid="mock-player" />,
}));

describe('ReelDetailPage', () => {
  it('renders the reel source video player for mov files when no frames are available', () => {
    render(
      <ReelDetailPage
        film={{ id: 'test_film', displayName: 'Test Film' }}
        reel={{
          id: 'reel_001',
          frameCount: 0,
          sourceVideoName: 'reel_001.mov',
          sourceVideoUrl: '/media/test_film/_reels/reel_001/reel_001.mov',
        }}
        frameUrls={[]}
        isLoading={false}
        isDeleting={false}
        isExtracting={false}
        onDelete={() => undefined}
        onExtractSequence={() => undefined}
      />, 
    );

    expect(screen.getByRole('button', { name: 'source video player' })).toHaveAttribute('aria-pressed', 'true');

    const video = document.querySelector('video');
    const source = document.querySelector('source');

    expect(video).not.toBeNull();
    expect(source).not.toBeNull();
    expect(source).toHaveAttribute('src', '/media/test_film/_reels/reel_001/reel_001.mov');
    expect(source).toHaveAttribute('type', 'video/quicktime');
    expect(screen.getByText('Playing the reel source video directly.')).toBeInTheDocument();
  });

  it('suggests extracting frames when the reel source video cannot be decoded', () => {
    render(
      <ReelDetailPage
        film={{ id: 'test_film', displayName: 'Test Film' }}
        reel={{
          id: 'reel_001',
          frameCount: 0,
          sourceVideoName: 'reel_001.mov',
          sourceVideoUrl: '/media/test_film/_reels/reel_001/reel_001.mov',
        }}
        frameUrls={[]}
        isLoading={false}
        isDeleting={false}
        isExtracting={false}
        onDelete={() => undefined}
        onExtractSequence={() => undefined}
      />,
    );

    const video = document.querySelector('video');

    expect(video).not.toBeNull();

    fireEvent.error(video as Element);

    expect(screen.getByText(/could not decode the source video/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extract frames from file' })).toBeInTheDocument();
  });
});