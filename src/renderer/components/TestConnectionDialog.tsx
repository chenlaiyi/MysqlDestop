import React, { useState } from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import NewNavicatConnectionDialog from './NewNavicatConnectionDialog';

interface TestConnectionDialogProps {
  onClose?: () => void;
}

const TestConnectionDialog: React.FC<TestConnectionDialogProps> = ({ onClose }) => {
  const [open, setOpen] = useState(false);

  const handleSave = (profile: any) => {
    console.log('新连接配置:', profile);
    // 这里可以保存到实际的连接管理器
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        测试Navicat风格连接对话框
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => setOpen(true)}
        >
          打开连接对话框
        </Button>

        {onClose && (
          <Button 
            variant="outlined" 
            onClick={handleClose}
          >
            关闭测试
          </Button>
        )}
      </Box>

      <NewNavicatConnectionDialog
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        mode="create"
      />
    </Paper>
  );
};

export default TestConnectionDialog;
