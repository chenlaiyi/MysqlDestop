import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, IconButton, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { t } from '../i18n';

interface CreateTableModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (tableName: string, columns: any[]) => void;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const mysqlDataTypes = [
  'INT', 'VARCHAR(255)', 'TEXT', 'DATE', 'DATETIME', 'BOOLEAN',
  'FLOAT', 'DOUBLE', 'DECIMAL(10,2)', 'BLOB', 'JSON',
];

function CreateTableModal({ open, onClose, onCreate }: CreateTableModalProps) {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<any[]>([
    { name: '', type: 'INT', primaryKey: false, autoIncrement: false, nullable: false }
  ]);

  const handleColumnChange = (index: number, field: string, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    // Disable autoIncrement if not primary key or not INT
    if (field === 'primaryKey' && !value) {
      newColumns[index].autoIncrement = false;
    } else if (field === 'type' && !value.includes('INT')) {
      newColumns[index].autoIncrement = false;
    }
    setColumns(newColumns);
  };

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', type: 'VARCHAR(255)', primaryKey: false, autoIncrement: false, nullable: true }]);
  };

  const handleRemoveColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    setColumns(newColumns);
  };

  const handleCreate = () => {
    if (!tableName.trim()) {
      alert(t('createTableModal.tableNameCannotBeEmpty'));
      return;
    }
    if (columns.some(col => !col.name.trim())) {
      alert(t('createTableModal.columnNameCannotBeEmpty'));
      return;
    }
    onCreate(tableName, columns);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          {t('createTableModal.createTable')}
        </Typography>
        <TextField
          label={t('createTableModal.tableName')}
          fullWidth
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          margin="normal"
        />

        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
          {t('createTableModal.columns')}
        </Typography>
        {
          columns.map((col, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField
                label={t('createTableModal.columnName')}
                value={col.name}
                onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                size="small"
                sx={{ flex: 2 }}
              />
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel>{t('createTableModal.dataType')}</InputLabel>
                <Select
                  value={col.type}
                  label={t('createTableModal.dataType')}
                  onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                >
                  {mysqlDataTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={col.primaryKey}
                    onChange={(e) => handleColumnChange(index, 'primaryKey', e.target.checked)}
                  />
                }
                label={t('createTableModal.primaryKey')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={col.autoIncrement}
                    onChange={(e) => handleColumnChange(index, 'autoIncrement', e.target.checked)}
                    disabled={!col.primaryKey || !col.type.includes('INT')}
                  />
                }
                label={t('createTableModal.autoIncrement')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={col.nullable}
                    onChange={(e) => handleColumnChange(index, 'nullable', e.target.checked)}
                  />
                }
                label={t('createTableModal.nullable')}
              />
              <IconButton onClick={() => handleRemoveColumn(index)} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          ))
        }
        <Button startIcon={<AddIcon />} onClick={handleAddColumn} sx={{ mt: 2 }}>
          {t('createTableModal.addColumn')}
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            {t('editRowModal.cancel')}
          </Button>
          <Button variant="contained" onClick={handleCreate}>
            {t('createTableModal.create')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default CreateTableModal;
