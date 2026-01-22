import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('mysql-client-theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('mysql-client-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const theme = useMemo(() => {
    // 深色模式采用现代深蓝灰配色，类似 VS Code / JetBrains
    const darkPalette = {
      primary: { main: '#4fc3f7', light: '#8bf6ff', dark: '#0093c4' },
      secondary: { main: '#ce93d8', light: '#ffc4ff', dark: '#9c64a6' },
      background: {
        default: '#1e1e2e',  // 主背景 - 深蓝灰
        paper: '#262637'     // 卡片/面板背景 - 稍浅
      },
      surface: {
        sidebar: '#252536',  // 侧边栏
        toolbar: '#2a2a3c',  // 工具栏
        hover: 'rgba(255, 255, 255, 0.05)',
        active: 'rgba(79, 195, 247, 0.15)'
      },
      divider: 'rgba(255, 255, 255, 0.08)',
      text: {
        primary: '#e4e4ef',
        secondary: 'rgba(228, 228, 239, 0.65)'
      },
      success: { main: '#66bb6a' },
      warning: { main: '#ffb74d' },
      error: { main: '#ef5350' }
    };

    // 浅色模式采用清爽的灰白配色
    const lightPalette = {
      primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
      secondary: { main: '#7c4dff', light: '#b47cff', dark: '#3f1dcb' },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff'
      },
      surface: {
        sidebar: '#fafafa',
        toolbar: '#ffffff',
        hover: 'rgba(0, 0, 0, 0.04)',
        active: 'rgba(25, 118, 210, 0.08)'
      },
      divider: 'rgba(0, 0, 0, 0.12)',
      text: {
        primary: '#212121',
        secondary: 'rgba(0, 0, 0, 0.6)'
      },
      success: { main: '#2e7d32' },
      warning: { main: '#ed6c02' },
      error: { main: '#d32f2f' }
    };

    const palette = isDark ? darkPalette : lightPalette;

    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: palette.primary,
        secondary: palette.secondary,
        background: palette.background,
        divider: palette.divider,
        text: palette.text,
        success: palette.success,
        warning: palette.warning,
        error: palette.error,
        // 自定义扩展颜色
        action: {
          hover: palette.surface.hover,
          selected: palette.surface.active
        }
      },
      shape: { borderRadius: 6 },
      typography: {
        fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
        button: { fontWeight: 600, textTransform: 'none' }
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '::-webkit-scrollbar': { width: 8, height: 8 },
            '::-webkit-scrollbar-thumb': {
              borderRadius: 4,
              backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
              }
            },
            '::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
          }
        },
        MuiButton: {
          styleOverrides: {
            root: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: { backgroundImage: 'none' }
          }
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderColor: palette.divider
            },
            head: {
              fontWeight: 600,
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
            }
          }
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              '&:hover': {
                backgroundColor: palette.surface.hover
              },
              '&.Mui-selected': {
                backgroundColor: palette.surface.active,
                '&:hover': {
                  backgroundColor: palette.surface.active
                }
              }
            }
          }
        },
        MuiTab: {
          styleOverrides: {
            root: {
              '&:hover': {
                backgroundColor: palette.surface.hover
              }
            }
          }
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              }
            }
          }
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundColor: palette.background.paper,
              border: `1px solid ${palette.divider}`
            }
          }
        }
      }
    });
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default CustomThemeProvider;
