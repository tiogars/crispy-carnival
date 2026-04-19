import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';

import type { SequenceExtractionFormValues, SequenceExtractionJobStatusResponse } from '../../App.types';

const getStatusSeverity = (status: SequenceExtractionJobStatusResponse['status'] | undefined) => {
  if (status === 'failed') {
    return 'error' as const;
  }

  if (status === 'succeeded') {
    return 'success' as const;
  }

  return 'info' as const;
};

const formatRemainingDuration = (remainingSeconds: number) => {
  const roundedSeconds = Math.max(0, Math.round(remainingSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
};

const formatElapsedDuration = (elapsedSeconds: number) => {
  return formatRemainingDuration(elapsedSeconds);
};

const formatProgressRate = (ratePercentPerSecond: number) => {
  return `${ratePercentPerSecond.toFixed(ratePercentPerSecond >= 10 ? 1 : 2)}%/s`;
};

const getDerivedElapsedSeconds = (
  jobStatus: SequenceExtractionJobStatusResponse | null,
  currentTimestamp: number,
) => {
  if (!jobStatus) {
    return null;
  }

  if (jobStatus.elapsedSeconds !== null) {
    return jobStatus.elapsedSeconds;
  }

  if (jobStatus.status !== 'running' || !jobStatus.startedAt) {
    return null;
  }

  const startedAtTimestamp = Date.parse(jobStatus.startedAt);

  if (Number.isNaN(startedAtTimestamp) || currentTimestamp <= startedAtTimestamp) {
    return null;
  }

  return Math.max(0, (currentTimestamp - startedAtTimestamp) / 1000);
};

type ProgressStatusPanelProps = {
  jobStatus: SequenceExtractionJobStatusResponse;
  statusSeverity: 'error' | 'success' | 'info';
  hasProgressValue: boolean;
  displayedElapsedSeconds: number | null;
  displayedRemainingSeconds: number | null;
};

const ProgressStatusPanel = ({
  jobStatus,
  statusSeverity,
  hasProgressValue,
  displayedElapsedSeconds,
  displayedRemainingSeconds,
}: Readonly<ProgressStatusPanelProps>) => {
  const hasStepInformation = jobStatus.currentStep !== null && jobStatus.totalSteps !== null;
  const hasElapsed = displayedElapsedSeconds !== null;
  const hasRemaining = displayedRemainingSeconds !== null;
  const hasRate = jobStatus.progressRatePercentPerSecond !== null;

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Alert severity={statusSeverity}>
        <strong>Status:</strong> {jobStatus.status}
        {jobStatus.progressLabel ? ` - ${jobStatus.progressLabel}` : ''}
      </Alert>

      <Box>
        <LinearProgress
          variant={hasProgressValue ? 'determinate' : 'indeterminate'}
          value={hasProgressValue ? jobStatus.progressPercent ?? 0 : undefined}
          sx={{ height: 10, borderRadius: 999 }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            mt: 0.75,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {jobStatus.progressLabel ?? 'Waiting for progress updates'}
          </Typography>
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {hasProgressValue ? `${jobStatus.progressPercent}%` : 'In progress'}
          </Typography>
        </Box>
        {hasStepInformation ? (
          <Typography variant="caption" color="text.secondary">
            Step {jobStatus.currentStep} of {jobStatus.totalSteps}
          </Typography>
        ) : null}
        {hasElapsed || hasRemaining ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {hasElapsed ? `Elapsed: ${formatElapsedDuration(displayedElapsedSeconds)}` : 'Elapsed: --'}
            {' | '}
            {hasRemaining ? `Remaining: ${formatRemainingDuration(displayedRemainingSeconds)}` : 'Remaining: --'}
          </Typography>
        ) : null}
        {hasRate ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Estimated speed: {formatProgressRate(jobStatus.progressRatePercentPerSecond ?? 0)}
          </Typography>
        ) : null}
      </Box>

      {jobStatus.message ? <Typography variant="body2">{jobStatus.message}</Typography> : null}
    </Box>
  );
};

type SequenceExtractionDialogProps = {
  open: boolean;
  selectedFilmId: string;
  selectedSourceLabel?: string;
  selectedSourceName?: string;
  selectedWitnessVideoName?: string;
  isSubmitting: boolean;
  values: SequenceExtractionFormValues;
  jobStatus: SequenceExtractionJobStatusResponse | null;
  errorMessage: string;
  onClose: () => void;
  onFieldChange: (field: keyof SequenceExtractionFormValues, value: string | boolean) => void;
  onSubmit: () => void;
  onResetDefaults: () => void;
};

export const SequenceExtractionDialog = ({
  open,
  selectedFilmId,
  selectedSourceLabel = 'Witness video',
  selectedSourceName,
  selectedWitnessVideoName,
  isSubmitting,
  values,
  jobStatus,
  errorMessage,
  onClose,
  onFieldChange,
  onSubmit,
  onResetDefaults,
}: Readonly<SequenceExtractionDialogProps>) => {
  const isJobActive = jobStatus?.status === 'queued' || jobStatus?.status === 'running';
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const statusSeverity = getStatusSeverity(jobStatus?.status);
  const hasProgressValue = typeof jobStatus?.progressPercent === 'number';
  const resolvedSourceName = selectedSourceName ?? selectedWitnessVideoName ?? '';
  const displayedElapsedSeconds = useMemo(
    () => getDerivedElapsedSeconds(jobStatus, currentTimestamp),
    [currentTimestamp, jobStatus],
  );
  const displayedRemainingSeconds = jobStatus?.estimatedRemainingSeconds ?? null;

  useEffect(() => {
    if (jobStatus?.status !== 'running') {
      return undefined;
    }

    setCurrentTimestamp(Date.now());

    const intervalId = globalThis.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [jobStatus?.status]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Sequence extraction settings</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Source film
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{selectedFilmId || 'No film selected'}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {selectedSourceLabel}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{resolvedSourceName || `No ${selectedSourceLabel.toLowerCase()} selected`}</Typography>
          </Box>

          <Alert severity="info">
            Install FFmpeg on Windows with <strong>winget install ffmpeg</strong>, then open a new terminal and run{' '}
            <strong>ffmpeg -version</strong> to verify the installation.
          </Alert>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          {jobStatus ? (
            <ProgressStatusPanel
              jobStatus={jobStatus}
              statusSeverity={statusSeverity}
              hasProgressValue={hasProgressValue}
              displayedElapsedSeconds={displayedElapsedSeconds}
              displayedRemainingSeconds={displayedRemainingSeconds}
            />
          ) : null}

          <TextField
            fullWidth
            label="Target FPS"
            type="number"
            value={values.targetFps}
            onChange={(event) => onFieldChange('targetFps', event.target.value)}
            slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }}
            helperText="Number of frames per second evaluated before scene detection."
            disabled={isSubmitting || isJobActive}
          />

          <TextField
            fullWidth
            label="Scene threshold"
            type="number"
            value={values.sceneThreshold}
            onChange={(event) => onFieldChange('sceneThreshold', event.target.value)}
            slotProps={{ htmlInput: { min: 0.01, max: 0.99, step: 0.01 } }}
            helperText="Recommended range: 0.25 to 0.40. Lower values keep more frames."
            disabled={isSubmitting || isJobActive}
          />

          <TextField
            fullWidth
            label="Minimum spacing (seconds)"
            type="number"
            value={values.minSpacingSeconds}
            onChange={(event) => onFieldChange('minSpacingSeconds', event.target.value)}
            slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
            helperText="Minimum gap between accepted frames to reduce near-duplicates."
            disabled={isSubmitting || isJobActive}
          />

          <TextField
            fullWidth
            label="Output reel name"
            value={values.outputReelName}
            onChange={(event) => onFieldChange('outputReelName', event.target.value)}
            helperText="Leave empty to let the backend generate a deterministic reel name."
            disabled={isSubmitting || isJobActive}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={values.overwriteExisting}
                onChange={(event) => onFieldChange('overwriteExisting', event.target.checked)}
                disabled={isSubmitting || isJobActive}
              />
            }
            label="Overwrite existing reel if the target name already exists"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onResetDefaults} disabled={isSubmitting || isJobActive}>
          Reset to defaults
        </Button>
        <Button onClick={onClose} disabled={isSubmitting || isJobActive}>
          Cancel
        </Button>
        <Button type="button" variant="contained" onClick={onSubmit} disabled={isSubmitting || isJobActive}>
          Start extraction
        </Button>
      </DialogActions>
    </Dialog>
  );
};