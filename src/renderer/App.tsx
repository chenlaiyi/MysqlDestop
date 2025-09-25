import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import ConnectionForm from './components/ConnectionForm';
import ModernMainView from './components/ModernMainView';
import ExactMainView from './components/ExactMainView';
import WelcomeScreen from './components/WelcomeScreen';

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
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
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

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [connected, setConnected] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<ConnectionProfile[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProfile, setConnectingProfile] = useState<ConnectionProfile | null>(null);

  // 加载保存的连接
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const savedConnections = await (window as any).mysqlApi.getConnections();
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
      } catch (error) {
        console.log('加载保存连接时出错:', error);
      }
    };
    loadConnections();
  }, []);

  const handleNewConnection = () => {
    setCurrentView('connection');
  };

  const handleConnect = async (profile: ConnectionProfile) => {
    console.log('连接到:', profile.name || `${profile.username}@${profile.host}`);
    setIsConnecting(true);
    setConnectingProfile(profile);
    
    try {
      const config = {
        host: profile.host,
        port: profile.port,
        user: profile.username,
        password: profile.password,
        database: profile.database,
        ssl: profile.ssl
      };
      
      console.log('尝试连接MySQL:', config);
      const result = await (window as any).mysqlApi.connect(config);
      console.log('连接结果:', result);
      
      if (result.success) {
        setConnected(true);
        // 从API返回的数据中提取数据库名称
        const dbList = (result.data || []).map((row: any) => row.Database);
        console.log('提取的数据库列表:', dbList);
        setDatabases(dbList);
        setCurrentView('main');
        
        // 更新连接的最后使用时间
        const connectionName = profile.name;
        const updatedConfig = {
          ...config,
          lastUsed: new Date().toISOString(),
          favorite: profile.favorite,
          tags: profile.tags,
          description: profile.description
        };
        
        await (window as any).mysqlApi.saveConnection(connectionName, updatedConfig);
      } else {
        alert(`连接失败: ${result.error}`);
      }
    } catch (error) {
      console.error('连接错误:', error);
      alert(`连接失败: ${error}`);
    } finally {
      setIsConnecting(false);
      setConnectingProfile(null);
    }
  };

  const wrappedHandleConnect = (profile: ConnectionProfile) => {
    console.log('App wrappedHandleConnect 被调用:', profile.name);
    handleConnect(profile);
  };

  const handleConnectFromForm = async (formData: any) => {
    const profile: ConnectionProfile = {
      id: Date.now().toString(),
      name: formData.name || `${formData.username}@${formData.host}`,
      host: formData.host,
      port: formData.port,
      username: formData.username,
      password: formData.password,
      database: formData.database,
      ssl: formData.ssl
    };
    
    console.log('从表单连接:', profile);
    await handleConnect(profile);
    return { success: true };
  };

  const handleEditConnection = (profile: ConnectionProfile) => {
    console.log('编辑连接:', profile);
    // 这里可以实现编辑功能
  };

  const handleDeleteConnection = async (profileId: string) => {
    try {
      const profile = savedProfiles.find(p => p.id === profileId);
      if (profile) {
        await (window as any).mysqlApi.deleteConnection(profile.name);
        setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
      }
    } catch (error) {
      console.error('删除连接失败:', error);
    }
  };

  const handleToggleFavorite = async (profileId: string) => {
    try {
      setSavedProfiles(prev => 
        prev.map(p => 
          p.id === profileId ? { ...p, favorite: !p.favorite } : p
        )
      );
    } catch (error) {
      console.error('切换收藏状态失败:', error);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'welcome':
        return <WelcomeScreen 
          onConnect={wrappedHandleConnect}
          onNewConnection={handleNewConnection}
          onEditConnection={handleEditConnection}
          savedProfiles={savedProfiles}
          onDeleteConnection={handleDeleteConnection}
          onToggleFavorite={handleToggleFavorite}
          isConnecting={isConnecting}
          connectingProfile={connectingProfile?.name}
        />;
      case 'connection':
        return <ConnectionForm onConnect={handleConnectFromForm} />;
      case 'main':
        if (!connected) {
          console.warn('未连接但试图显示主视图，回到欢迎界面');
          setCurrentView('welcome');
          return <WelcomeScreen 
            onConnect={handleConnect}
            onNewConnection={handleNewConnection}
            onEditConnection={handleEditConnection}
            savedProfiles={savedProfiles}
            onDeleteConnection={handleDeleteConnection}
            onToggleFavorite={handleToggleFavorite}
            isConnecting={isConnecting}
            connectingProfile={connectingProfile?.name}
          />;
        }
        
        return <ExactMainView databases={databases} />;
      default:

        return <WelcomeScreen 
          onConnect={wrappedHandleConnect}
          onNewConnection={handleNewConnection}
          onEditConnection={handleEditConnection}
          savedProfiles={savedProfiles}
          onDeleteConnection={handleDeleteConnection}
          onToggleFavorite={handleToggleFavorite}
          isConnecting={isConnecting}
          connectingProfile={connectingProfile?.name}
        />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {renderCurrentView()}
      </Box>
    </ThemeProvider>
  );
}

export default App;
