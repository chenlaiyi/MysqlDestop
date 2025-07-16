import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { t } from '../i18n';

interface SyncPlanViewProps {
  plan: string[];
  onExecute: () => void;
  onCancel: () => void;
}

const SyncPlanView: React.FC<SyncPlanViewProps> = ({ plan, onExecute, onCancel }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('syncPlanView.synchronizationPlan')}
      </Typography>
      <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', mb: 2 }}>
        <pre>{plan.join('\n')}</pre>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} sx={{ mr: 1 }}>
          {t('syncPlanView.cancel')}
        </Button>
        <Button onClick={onExecute} variant="contained">
          {t('syncPlanView.execute')}
        </Button>
      </Box>
    </Box>
  );
};

export default SyncPlanView;
