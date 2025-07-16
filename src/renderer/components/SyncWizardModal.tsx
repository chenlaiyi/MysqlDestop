import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, Stepper, Step, StepLabel, Select, MenuItem, FormControl, InputLabel, CircularProgress, Paper, Alert, SelectChangeEvent, Checkbox, FormControlLabel } from '@mui/material';
import SyncPlanView from './SyncPlanView';
import { t } from '../i18n';
import ConfirmationDialog from './ConfirmationDialog';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 800,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
};

interface SyncWizardModalProps {
  open: boolean;
  onClose: () => void;
}

const steps = [t('syncWizardModal.selectSourceTarget'), t('syncWizardModal.reviewSyncPlan'), t('syncWizardModal.executeSync')];

function SyncWizardModal({ open, onClose }: SyncWizardModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [connections, setConnections] = useState<{[key: string]: any}>({});
  const [sourceConnection, setSourceConnection] = useState('');
  const [targetConnection, setTargetConnection] = useState('');
  const [sourceDatabases, setSourceDatabases] = useState<any[]>([]);
  const [targetDatabases, setTargetDatabases] = useState<any[]>([]);
  const [sourceDatabase, setSourceDatabase] = useState('');
  const [targetDatabase, setTargetDatabase] = useState('');
  const [syncStructure, setSyncStructure] = useState(true);
  const [syncData, setSyncData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncPlan, setSyncPlan] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isConfirmExecuteOpen, setIsConfirmExecuteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchConnections = async () => {
        const result = await window.mysqlApi.getConnections();
        setConnections(result);
      };
      fetchConnections();
    }
  }, [open]);

  const handleConnectionChange = async (event: SelectChangeEvent<string>, type: 'source' | 'target') => {
    const connectionName = event.target.value;
    if (type === 'source') {
      setSourceConnection(connectionName);
      setSourceDatabases([]);
      setSourceDatabase('');
    } else {
      setTargetConnection(connectionName);
      setTargetDatabases([]);
      setTargetDatabase('');
    }

    if (connectionName) {
      setLoading(true);
      const config = connections[connectionName];
      const result = await window.mysqlApi.connect(config);
      if (result.success) {
        if (type === 'source') {
          setSourceDatabases(result.data || []);
        } else {
          setTargetDatabases(result.data || []);
        }
      }
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError('');
    setSyncPlan([]);
    const result = await window.mysqlApi.generateSyncPlan(
      { connection: sourceConnection, database: sourceDatabase },
      { connection: targetConnection, database: targetDatabase },
      { syncStructure, syncData }
    );
    if (result.success) {
      setSyncPlan(result.data || []);
      setActiveStep(1);
    } else {
      setError(result.error || t('syncWizardModal.failedToGenerateSyncPlan'));
    }
    setLoading(false);
  };

  const handleExecutePlan = async () => {
    setLoading(true);
    setError('');
    setSyncSuccess(false);
    const result = await window.mysqlApi.executeSyncPlan(
      { connection: targetConnection, database: targetDatabase },
      syncPlan
    );
    if (result.success) {
      setSyncSuccess(true);
      setActiveStep(2);
    } else {
      setError(result.error || t('syncWizardModal.failedToExecuteSyncPlan'));
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      handleGeneratePlan();
    } else if (activeStep === 1) {
      setIsConfirmExecuteOpen(true); // Show confirmation dialog before executing
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleConfirmExecute = () => {
    setIsConfirmExecuteOpen(false);
    handleExecutePlan();
  };

  const handleCancelExecute = () => {
    setIsConfirmExecuteOpen(false);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <React.Fragment>
        <Box sx={style}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            {t('syncWizardModal.databaseSynchronizationWizard')}
          </Typography>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && <Alert severity="error">{error}</Alert>}

          {activeStep === 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
              <Box sx={{ width: 'calc(50% - 16px)', mx: 1, mb: 2 }}>
                <Typography variant="subtitle1">{t('syncWizardModal.source')}</Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('syncWizardModal.connection')}</InputLabel>
                  <Select value={sourceConnection} label={t('syncWizardModal.connection')} onChange={(e) => handleConnectionChange(e, 'source')}>
                    {Object.keys(connections).map(name => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal" disabled={!sourceConnection || loading}>
                  <InputLabel>{t('syncWizardModal.database')}</InputLabel>
                  <Select value={sourceDatabase} label={t('syncWizardModal.database')} onChange={(e) => setSourceDatabase(e.target.value)}>
                    {sourceDatabases.map(db => (
                      <MenuItem key={db.Database} value={db.Database}>{db.Database}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: 'calc(50% - 16px)', mx: 1, mb: 2 }}>
                <Typography variant="subtitle1">{t('syncWizardModal.target')}</Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('syncWizardModal.connection')}</InputLabel>
                  <Select value={targetConnection} label={t('syncWizardModal.connection')} onChange={(e) => handleConnectionChange(e, 'target')}>
                    {Object.keys(connections).map(name => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal" disabled={!targetConnection || loading}>
                  <InputLabel>{t('syncWizardModal.database')}</InputLabel>
                  <Select value={targetDatabase} label={t('syncWizardModal.database')} onChange={(e) => setTargetDatabase(e.target.value)}>
                    {targetDatabases.map(db => (
                      <MenuItem key={db.Database} value={db.Database}>{db.Database}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: 'calc(100% - 16px)', mx: 1, mb: 2 }}>
                <FormControlLabel control={<Checkbox checked={syncStructure} onChange={(e) => setSyncStructure(e.target.checked)} />} label={t('syncWizardModal.syncStructure')} />
                <FormControlLabel control={<Checkbox checked={syncData} onChange={(e) => setSyncData(e.target.checked)} />} label={t('syncWizardModal.syncData')} />
              </Box>
              {loading && <CircularProgress />}
            </Box>
          )}

          {activeStep === 1 && (
            <SyncPlanView plan={syncPlan} onExecute={handleExecutePlan} onCancel={handleBack} />
          )}

          {activeStep === 2 && (
            <Box>
              {syncSuccess ? (
                <Alert severity="success">{t('syncWizardModal.synchronizationCompletedSuccessfully')}</Alert>
              ) : (
                <Alert severity="error">{t('syncWizardModal.synchronizationFailed')}</Alert>
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, mt: 'auto' }}>
            <Button
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              {t('syncWizardModal.back')}
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep < steps.length - 1 && (
              <Button onClick={handleNext} disabled={loading || (activeStep === 0 && (!sourceDatabase || !targetDatabase))}>
                {activeStep === 0 ? t('syncWizardModal.generatePlan') : t('syncWizardModal.executePlan')}
              </Button>
            )}
            {activeStep === steps.length - 1 && (
              <Button onClick={onClose}> {t('syncWizardModal.finish')}</Button>
            )}
          </Box>
        </Box>
        {isConfirmExecuteOpen && (
          <ConfirmationDialog
            open={isConfirmExecuteOpen}
            title={t('syncWizardModal.confirmExecuteTitle')}
            message={t('syncWizardModal.confirmExecuteMessage')}
            onConfirm={handleConfirmExecute}
            onCancel={handleCancelExecute}
          />
        )}
      </React.Fragment>
    </Modal>
  );
}

export default SyncWizardModal;
