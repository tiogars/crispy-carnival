import type { BaseSyntheticEvent } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

import type { NewFilmFormValues } from '../../App.types';

type CreateFilmDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  errors: FieldErrors<NewFilmFormValues>;
  register: UseFormRegister<NewFilmFormValues>;
  onClose: () => void;
  onSubmit: (event?: BaseSyntheticEvent) => void | Promise<void>;
};

export const CreateFilmDialog = ({
  open,
  isSubmitting,
  errors,
  register,
  onClose,
  onSubmit,
}: Readonly<CreateFilmDialogProps>) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add a new film</DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Film name"
            placeholder="Example: The Third Man"
            error={Boolean(errors.displayName)}
            helperText={errors.displayName?.message}
            {...register('displayName', {
              required: 'Film name is required.',
              minLength: {
                value: 2,
                message: 'Film name must have at least 2 characters.',
              },
            })}
          />
          <TextField
            fullWidth
            margin="normal"
            label="First reel folder (optional)"
            placeholder="Example: Reel 01"
            helperText="If provided, this reel folder is created inside the film directory."
            {...register('firstReelName')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Create film
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
