import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

type DeleteWitnessDialogProps = {
  open: boolean;
  isDeleting: boolean;
  selectedFileName: string;
  onClose: () => void;
  onConfirmDelete: () => void;
};

export const DeleteWitnessDialog = ({
  open,
  isDeleting,
  selectedFileName,
  onClose,
  onConfirmDelete,
}: Readonly<DeleteWitnessDialogProps>) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Confirm witness video deletion</DialogTitle>
      <DialogContent dividers>
        <p>Delete witness video "{selectedFileName}"?</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button type="button" color="error" variant="contained" onClick={onConfirmDelete} disabled={isDeleting || !selectedFileName}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
