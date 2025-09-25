import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// 简化的暗色主题
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});

interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  ssl?: boolean;
  connectionLimit?: number;
  timeout?: number;
  description?: string;
  tags?: string[];
  lastUsed?: Date;
  favorite?: boolean;
}

type ViewType = 'welcome' | 'connection' | 'main';

function SafeApp() {
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [connected, setConnected] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<ConnectionProfile[]>([]);
  const [loadingStep, setLoadingStep] = useState('初始化...');
  const [error, setError] = useState<string | null>(null);

  // 加载保存的连接
  useEffect(() => {
    const loadConnections = async () => {
      try {
        setLoadingStep('加载连接配置...');
        const api = (window as any).mysqlApi;
        if (!api) {
          throw new Error('mysqlApi 不可用');
        }
        
        const savedConnections = await api.getConnections();
        const profiles = Object.entries(savedConnections).map(([key, config]: [string, any]) => ({
          id: config.id || key,
          name: key,
          host: config.host,
          port: config.port,
          username: config.user,
          password: config.password,
          database: config.database,
          ssl: config.ssl,
          lastUsed: config.lastUsed ? new Date(config.lastUsed) : undefined,
          favorite: config.favorite || false,
          tags: config.tags || [],
          description: config.description
        }));
        setSavedProfiles(profiles);
        setLoadingStep('连接配置加载完成');
      } catch (error) {
        console.error('加载保存连接时出错:', error);
        setError(`加载连接失败: ${String(error)}`);
      }
    };
    loadConnections();
  }, []);

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          minHeight: '100vh', 
          bgcolor: 'background.default', 
          p: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Box sx={{ 
            maxWidth: 600, 
            p: 3, 
            bgcolor: 'paper', 
            borderRadius: 2,
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#ff4444', marginBottom: '20px' }}>应用启动失败</h2>
            <p style={{ color: '#cccccc', marginBottom: '20px' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#1976d2', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              重新加载
            </button>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
        <Box sx={{ 
          maxWidth: 800, 
          mx: 'auto', 
          p: 3, 
          bgcolor: 'paper', 
          borderRadius: 2 
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
            MySQL Desktop Client
          </h1>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>应用状态：</h3>
            <p>当前步骤: {loadingStep}</p>
            <p>当前视图: {currentView}</p>
            <p>已连接: {connected ? '是' : '否'}</p>
            <p>数据库数量: {databases.length}</p>
            <p>保存的配置数: {savedProfiles.length}</p>
          </div>

          {savedProfiles.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>已保存的连接：</h3>
              <ul>
                {savedProfiles.map(profile => (
                  <li key={profile.id} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                    <strong>{profile.name}</strong> - {profile.host}:{profile.port}
                    {profile.database && ` (${profile.database})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <p style={{ color: '#888' }}>
              这是安全模式版本。如果您看到此界面，说明基本功能正常。
            </p>
            <button 
              onClick={() => {
                setLoadingStep('尝试加载完整应用...');
                // 这里可以尝试加载完整的应用
              }}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#1976d2', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              尝试加载完整应用
            </button>
          </div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default SafeApp;