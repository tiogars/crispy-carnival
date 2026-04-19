import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WitnessDetailPage } from './WitnessDetailPage';

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
});