import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField } from '@mui/material';

type UploadReelVideoDialogProps = {
  open: boolean;
  isUploading: boolean;
  selectedVideo: File | null;
  reelName: string;
  overwriteExisting: boolean;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onReelNameChange: (value: string) => void;
  onOverwriteChange: (overwrite: boolean) => void;
  onUpload: () => void;
};

export const UploadReelVideoDialog = ({
  open,
  isUploading,
  selectedVideo,
  reelName,
  overwriteExisting,
  onClose,
  onFileChange,
  onReelNameChange,
  onOverwriteChange,
  onUpload,
}: Readonly<UploadReelVideoDialogProps>) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload video</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          type="file"
          slotProps={{ htmlInput: { accept: 'video/*', 'data-testid': 'reel-video-input' } }}
          onChange={(event) => {
            const input = event.target as HTMLInputElement;
            const file = input.files?.[0] ?? null;
            onFileChange(file);
          }}
          helperText="The uploaded video will be converted into frames and stored as a reel under the selected film."
        />
        <TextField
          fullWidth
          margin="normal"
          label="Reel name (optional)"
          value={reelName}
          onChange={(event) => onReelNameChange(event.target.value)}
          helperText="Leave blank to use the uploaded file name."
        />
        <FormControlLabel
          control={<Checkbox checked={overwriteExisting} onChange={(event) => onOverwriteChange(event.target.checked)} />}
          label="Overwrite existing reel if name already exists"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button type="button" variant="contained" onClick={onUpload} disabled={isUploading || !selectedVideo}>
          Upload video
        </Button>
      </DialogActions>
    </Dialog>
  );
};
