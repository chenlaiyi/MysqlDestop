import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { 
  Brightness4 as DarkModeIcon, 
  Brightness7 as LightModeIcon 
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';

interface ThemeToggleButtonProps {
  size?: 'small' | 'medium' | 'large';
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ size = 'medium' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Tooltip title={isDark ? '切换到浅色主题' : '切换到深色主题'}>
      <IconButton 
        onClick={toggleTheme} 
        size={size}
        sx={{
          color: 'text.primary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggleButton;
