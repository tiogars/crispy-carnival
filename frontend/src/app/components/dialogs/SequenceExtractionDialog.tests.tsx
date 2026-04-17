import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SequenceExtractionDialog } from './SequenceExtractionDialog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SequenceExtractionDialog', () => {
  it('renders fine-grained progress details for a running extraction job', () => {
    render(
      <SequenceExtractionDialog
        open
        selectedFilmId="existing_film"
        selectedWitnessVideoName="witness.mp4"
        isSubmitting={false}
        values={{
          targetFps: '2',
          sceneThreshold: '0.30',
          minSpacingSeconds: '1.0',
          outputReelName: 'Witness Auto',
          overwriteExisting: false,
        }}
        jobStatus={{
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
        }}
        errorMessage=""
        onClose={() => {}}
        onFieldChange={() => {}}
        onSubmit={() => {}}
        onResetDefaults={() => {}}
      />,
    );

    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('FFmpeg processed 7.7s of 12.0s.')).toBeInTheDocument();
    expect(screen.getByText('Extracting frames')).toBeInTheDocument();
    expect(screen.getByText('Elapsed: 8s | Remaining: 5s')).toBeInTheDocument();
    expect(screen.getByText('Estimated speed: 8.00%/s')).toBeInTheDocument();
  }, 10000);
});