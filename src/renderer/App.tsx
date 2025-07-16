import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConnectionForm from './components/ConnectionForm';
import ModernMainView from './components/ModernMainView';
import WelcomeScreen from './components/WelcomeScreen';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      dark: '#1565c0',
      light: '#42a5f5',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#424242',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f5f5f5',
          color: '#000000',
          fontWeight: 'bold',
          borderBottom: '2px solid #e0e0e0',
        },
        body: {
          color: '#000000',
          borderBottom: '1px solid #e0e0e0',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }
      }
    }
  }
});

function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'connection' | 'main'>('welcome');
  const [connected, setConnected] = useState(false);
  const [databases, setDatabases] = useState<any[]>([]);
  const [hasSavedConnections, setHasSavedConnections] = useState(false);

  // 检查是否有保存的连接
  useEffect(() => {
    const checkSavedConnections = async () => {
      try {
        if (window.mysqlApi && window.mysqlApi.getConnections) {
          const connections = await window.mysqlApi.getConnections();
          setHasSavedConnections(Object.keys(connections).length > 0);
        }
      } catch (error) {
        console.log('检查保存连接时出错:', error);
      }
    };
    checkSavedConnections();
  }, []);

  const handleGetStarted = () => {
    setCurrentView('connection');
  };

  const handleQuickConnect = () => {
    // 直接跳转到连接表单，用户可以从保存的连接中选择
    setCurrentView('connection');
  };

  const handleConnect = async (config: any) => {
    const result = await window.mysqlApi.connect(config);
    if (result.success) {
      await window.mysqlApi.storeConfig(config);
      setConnected(true);
      setDatabases(result.data || []);
      setCurrentView('main');
    }
    return result;
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'welcome':
        return <WelcomeScreen 
          onGetStarted={handleGetStarted} 
          hasSavedConnections={hasSavedConnections}
          onQuickConnect={handleQuickConnect}
        />;
      case 'connection':
        return <ConnectionForm onConnect={handleConnect} />;
      case 'main':
        return <ModernMainView databases={databases} />;
      default:
        return <WelcomeScreen 
          onGetStarted={handleGetStarted}
          hasSavedConnections={hasSavedConnections}
          onQuickConnect={handleQuickConnect}
        />;
    }
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      {renderCurrentView()}
    </ThemeProvider>
  );
}

export default App;