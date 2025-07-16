import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';
import { t } from '../i18n';

interface EditRowModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  rowData: any | null;
  columns: string[];
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function EditRowModal({ open, onClose, onSave, rowData, columns }: EditRowModalProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (rowData) {
      setFormData(rowData);
    } else {
      const emptyData: any = {};
      columns.forEach(col => emptyData[col] = '');
      setFormData(emptyData);
    }
  }, [rowData, columns]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          {rowData ? t('editRowModal.editRow') : t('editRowModal.addRow')}
        </Typography>
        {columns.map(col => (
          <TextField
            key={col}
            name={col}
            label={col}
            value={formData[col] || ''}
            onChange={handleChange}
            fullWidth
            margin="normal"
            disabled={rowData && col === columns[0]} // Disable editing of primary key
          />
        ))}
        <Button onClick={handleSave}>{t('editRowModal.save')}</Button>
        <Button onClick={onClose}>{t('editRowModal.cancel')}</Button>
      </Box>
    </Modal>
  );
}

export default EditRowModal;
