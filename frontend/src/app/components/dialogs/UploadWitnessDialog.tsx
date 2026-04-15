import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField } from '@mui/material';

type UploadWitnessDialogProps = {
  open: boolean;
  isUploading: boolean;
  selectedWitnessVideo: File | null;
  overwriteWitnessVideo: boolean;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onOverwriteChange: (overwrite: boolean) => void;
  onUpload: () => void;
};

export const UploadWitnessDialog = ({
  open,
  isUploading,
  selectedWitnessVideo,
  overwriteWitnessVideo,
  onClose,
  onFileChange,
  onOverwriteChange,
  onUpload,
}: Readonly<UploadWitnessDialogProps>) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload witness video</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          type="file"
          slotProps={{ htmlInput: { accept: 'video/*', 'data-testid': 'witness-video-input' } }}
          onChange={(event) => {
            const input = event.target as HTMLInputElement;
            const file = input.files?.[0] ?? null;
            onFileChange(file);
          }}
          helperText="The file will be saved inside the selected film under _witness_videos/."
        />
        <FormControlLabel
          control={<Checkbox checked={overwriteWitnessVideo} onChange={(event) => onOverwriteChange(event.target.checked)} />}
          label="Overwrite existing file if name already exists"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button type="button" variant="contained" onClick={onUpload} disabled={isUploading || !selectedWitnessVideo}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};
