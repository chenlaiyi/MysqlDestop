import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, PaletteOptions, alpha } from '@mui/material/styles';
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
    // v1.0.4 新增：从本地存储读取主题偏好
    const savedTheme = localStorage.getItem('mysql-client-theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  useEffect(() => {
    // 保存主题偏好到本地存储
    localStorage.setItem('mysql-client-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = useMemo(() => {
    const base = createTheme();

    const palette: PaletteOptions = {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: isDark ? '#30a2ff' : '#3b82f6',
        light: isDark ? '#57b6ff' : '#60a5fa',
        dark: isDark ? '#1f6dcf' : '#1d4ed8',
        contrastText: '#ffffff'
      },
      secondary: {
        main: isDark ? '#7a7cff' : '#6366f1',
        light: isDark ? '#9ea0ff' : '#818cf8',
        dark: isDark ? '#5254e5' : '#4f46e5',
        contrastText: '#0b101a'
      },
      background: {
        default: isDark ? '#0d111a' : '#f2f4f9',
        paper: isDark ? '#171c25' : '#ffffff'
      },
      divider: isDark ? 'rgba(125, 145, 170, 0.26)' : 'rgba(15, 23, 42, 0.12)',
      text: {
        primary: isDark ? '#e5ecff' : '#0F172A',
        secondary: isDark ? 'rgba(186, 196, 210, 0.85)' : 'rgba(15, 23, 42, 0.6)'
      },
      info: {
        main: isDark ? '#3da5ff' : '#0ea5e9'
      },
      success: {
        main: isDark ? '#38d399' : '#16A34A'
      },
      warning: {
        main: isDark ? '#f8c55b' : '#F59E0B'
      },
      error: {
        main: isDark ? '#f26d78' : '#DC2626'
      }
    };

    const elevationShadow = (opacity: number) =>
      `0 24px 64px rgba(4, 7, 12, ${opacity})`;

    const themedShadows = base.shadows.map((shadow, index) => {
      if (index === 0) return 'none';
      if (index === 1) return elevationShadow(isDark ? 0.45 : 0.08);
      if (index === 2) return elevationShadow(isDark ? 0.52 : 0.12);
      if (index === 3) return elevationShadow(isDark ? 0.6 : 0.18);
      return shadow;
    });

    return createTheme({
      palette,
      shape: {
        borderRadius: 6
      },
      typography: {
        fontFamily: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 600, letterSpacing: '-0.015em' },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 600 },
        body1: { letterSpacing: '-0.005em' },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0.2 }
      },
      shadows: themedShadows as typeof base.shadows,
      components: {
        MuiCssBaseline: {
          styleOverrides: (themeParam) => {
            const { palette: themePalette } = themeParam;
            return {
              body: {
                backgroundColor: themePalette.background?.default,
                color: themePalette.text?.primary
              },
              '#root': {
                minHeight: '100vh'
              },
              a: {
                color: themePalette.primary?.main,
                textDecoration: 'none'
              },
              '::-webkit-scrollbar': {
                width: 8,
                height: 8
              },
              '::-webkit-scrollbar-thumb': {
                borderRadius: 999,
                backgroundColor: alpha(isDark ? '#5B708F' : '#93A3B8', isDark ? 0.6 : 0.4)
              },
              '::-webkit-scrollbar-track': {
                backgroundColor: 'transparent'
              }
            };
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: ({ theme }) => {
              const radius = Number(theme.shape.borderRadius);
              return {
                backgroundImage: 'none',
                borderRadius: radius,
                border: `1px solid ${alpha(theme.palette.common.white, isDark ? 0.05 : 0.08)}`,
                boxShadow: isDark
                  ? '0 28px 48px rgba(0,0,0,0.46)'
                  : elevationShadow(0.12)
              };
            }
          }
        },
        MuiCard: {
          styleOverrides: {
            root: ({ theme }) => {
              const radius = Number(theme.shape.borderRadius) + 2;
              return {
                borderRadius: radius,
                backgroundImage: isDark ? 'none' : 'linear-gradient(160deg, rgba(60,108,255,0.06) 0%, rgba(255,255,255,0.2) 100%)',
                backdropFilter: isDark ? 'none' : 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.common.white, isDark ? 0.08 : 0.12)}`
              };
            }
          }
        },
        MuiButton: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: Number(theme.shape.borderRadius),
              paddingLeft: theme.spacing(2),
              paddingRight: theme.spacing(2),
              paddingTop: theme.spacing(0.9),
              paddingBottom: theme.spacing(0.9),
              boxShadow: 'none'
            }),
            containedPrimary: ({ theme }) => ({
              backgroundImage: 'none',
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                boxShadow: theme.shadows[2]
              }
            }),
            outlined: ({ theme }) => ({
              borderWidth: 1,
              '&:hover': {
                borderWidth: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.12)
              }
            })
          }
        },
        MuiIconButton: {
          styleOverrides: {
            root: ({ theme }) => {
              const radius = Math.max(Number(theme.shape.borderRadius) - 2, 2);
              return {
                borderRadius: radius,
                transition: 'all .2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12)
                }
              };
            }
          }
        },
        MuiListItemButton: {
          styleOverrides: {
            root: ({ theme }) => {
              const radius = Math.max(Number(theme.shape.borderRadius) - 1, 2);
              return {
                borderRadius: radius,
                transition: 'all .2s ease',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.16),
                  boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : theme.shadows[1]
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1)
                }
              };
            }
          }
        },
        MuiChip: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: Number(theme.shape.borderRadius),
              fontWeight: 600,
              letterSpacing: 0.3,
              backgroundColor: alpha(theme.palette.common.white, isDark ? 0.06 : 0.04)
            })
          }
        },
        MuiTabs: {
          styleOverrides: {
            root: ({ theme }) => ({
              minHeight: 44
            }),
            indicator: ({ theme }) => ({
              height: 4,
              borderRadius: Number(theme.shape.borderRadius),
              background: theme.palette.primary.main
            })
          }
        },
        MuiTab: {
          styleOverrides: {
            root: ({ theme }) => ({
              minHeight: 44,
              padding: theme.spacing(0.5, 2),
              borderRadius: Math.max(Number(theme.shape.borderRadius) - 1, 2),
              textTransform: 'none',
              fontWeight: 600,
              '&.Mui-selected': {
                color: theme.palette.text.primary
              }
            })
          }
        },
        MuiAvatar: {
          styleOverrides: {
            root: ({ theme }) => ({
              boxShadow: theme.shadows[1]
            })
          }
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor: alpha(theme.palette.common.white, isDark ? 0.04 : 0.02),
              borderRadius: Number(theme.shape.borderRadius),
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.common.white, isDark ? 0.08 : 0.16)
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.primary.main, 0.6)
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: 1
              }
            })
          }
        },
        MuiMenu: {
          styleOverrides: {
            paper: ({ theme }) => ({
              backgroundColor: theme.palette.background.paper,
              borderRadius: Number(theme.shape.borderRadius),
              border: `1px solid ${alpha(theme.palette.common.white, isDark ? 0.05 : 0.12)}`
            })
          }
        },
        MuiTableCell: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderBottom: `1px solid ${alpha(theme.palette.common.white, isDark ? 0.08 : 0.12)}`,
              color: theme.palette.text.secondary
            }),
            head: ({ theme }) => ({
              backgroundColor: alpha(theme.palette.common.white, isDark ? 0.04 : 0.06),
              color: alpha(theme.palette.common.white, isDark ? 0.72 : 0.7),
              fontWeight: 600,
              borderBottom: `1px solid ${alpha(theme.palette.common.white, isDark ? 0.12 : 0.16)}`
            })
          }
        },
        MuiTableRow: {
          styleOverrides: {
            root: ({ theme }) => ({
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.08 : 0.04)
              }
            })
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
