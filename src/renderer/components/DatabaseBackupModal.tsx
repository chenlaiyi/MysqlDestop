import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider
} from '@mui/material';
import { t } from '../i18n';

interface DatabaseBackupModalProps {
  open: boolean;
  onClose: () => void;
  databases: string[];
}

function DatabaseBackupModal({ open, onClose, databases }: DatabaseBackupModalProps) {
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [backupType, setBackupType] = useState<'structure' | 'data' | 'both'>('both');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDatabase) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      setFileName(`${selectedDatabase}_backup_${timestamp}`);
    }
  }, [selectedDatabase]);

  const handleBackup = async () => {
    if (!selectedDatabase) {
      setError(t('databaseBackup.selectDatabase'));
      return;
    }

    if (!fileName.trim()) {
      setError(t('databaseBackup.fileNameRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.mysqlApi.exportDatabase(selectedDatabase, backupType);
      if (result.success) {
        // Create download link
        const blob = new Blob([result.data || ''], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName + '.sql';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        onClose();
      } else {
        setError(result.error || t('databaseBackup.backupFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('databaseBackup.backupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('databaseBackup.backupDatabase')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{t('databaseBackup.selectDatabase')}</InputLabel>
            <Select
              value={selectedDatabase}
              label={t('databaseBackup.selectDatabase')}
              onChange={(e) => setSelectedDatabase(e.target.value)}
            >
              {databases.map((db) => (
                <MenuItem key={db} value={db}>{db}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{t('databaseBackup.backupType')}</InputLabel>
            <Select
              value={backupType}
              label={t('databaseBackup.backupType')}
              onChange={(e) => setBackupType(e.target.value as 'structure' | 'data' | 'both')}
            >
              <MenuItem value="structure">{t('databaseBackup.structureOnly')}</MenuItem>
              <MenuItem value="data">{t('databaseBackup.dataOnly')}</MenuItem>
              <MenuItem value="both">{t('databaseBackup.structureAndData')}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={t('databaseBackup.fileName')}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            {backupType === 'structure' && t('databaseBackup.structureOnlyDesc')}
            {backupType === 'data' && t('databaseBackup.dataOnlyDesc')}
            {backupType === 'both' && t('databaseBackup.structureAndDataDesc')}
          </Typography>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('editRowModal.cancel')}</Button>
        <Button 
          onClick={handleBackup}
          variant="contained"
          disabled={loading || !selectedDatabase}
        >
          {loading ? <CircularProgress size={24} /> : t('databaseBackup.backup')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DatabaseBackupModal;
