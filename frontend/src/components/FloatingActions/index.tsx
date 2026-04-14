import { SpeedDial, SpeedDialAction } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import type { FloatingActionsProps } from './FloatingActions.types';

export function FloatingActions({ actions }: Readonly<FloatingActionsProps>) {
  return (
    <SpeedDial
      ariaLabel="Primary actions"
      icon={<AddIcon />}
      sx={{
        position: 'fixed',
        right: '1.5rem',
        bottom: '1.5rem',
      }}
    >
      {actions.map((action) => (
        <SpeedDialAction
          key={action.label}
          icon={action.icon}
          tooltipTitle={action.label}
          onClick={action.onClick}
        />
      ))}
    </SpeedDial>
  );
}
