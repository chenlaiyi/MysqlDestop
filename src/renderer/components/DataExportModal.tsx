import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio,
  TextField,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { t } from '../i18n';

interface DataExportModalProps {
  open: boolean;
  onClose: () => void;
  database: string;
  table: string;
  data: any[];
}

function DataExportModal({ open, onClose, database, table, data }: DataExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'sql'>('csv');
  const [fileName, setFileName] = useState(`${database}_${table}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!fileName.trim()) {
      setError(t('dataExport.fileNameRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let content = '';
      let fileExtension = '';

      switch (exportFormat) {
        case 'csv':
          content = exportToCSV(data);
          fileExtension = '.csv';
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          fileExtension = '.json';
          break;
        case 'sql':
          content = exportToSQL(data, table);
          fileExtension = '.sql';
          break;
      }

      // Create download link
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName + fileExtension;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError(err.message || t('dataExport.exportFailed'));
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const exportToSQL = (data: any[], tableName: string) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const insertStatements = data.map(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        return value;
      }).join(', ');
      
      return `INSERT INTO \`${tableName}\` (\`${headers.join('`, `')}\`) VALUES (${values});`;
    });
    
    return insertStatements.join('\n');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dataExport.exportData')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">{t('dataExport.exportFormat')}</FormLabel>
            <RadioGroup
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'sql')}
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
              <FormControlLabel value="sql" control={<Radio />} label="SQL" />
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            label={t('dataExport.fileName')}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('editRowModal.cancel')}</Button>
        <Button 
          onClick={handleExport}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : t('dataExport.export')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DataExportModal;
