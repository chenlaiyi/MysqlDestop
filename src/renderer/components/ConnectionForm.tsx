import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { t } from '../i18n';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#424242',
    },
  },
});

interface ConnectionFormProps {
  onConnect: (config: any) => Promise<{ success: boolean; error?: string; data?: any }>;
}

function ConnectionForm({ onConnect }: ConnectionFormProps) {
  const [host, setHost] = useState('localhost');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState(3306);
  const [connectionName, setConnectionName] = useState('');
  const [savedConnections, setSavedConnections] = useState<{[key: string]: any}>({});
  const [selectedConnection, setSelectedConnection] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConnections = async () => {
      const connections = await window.mysqlApi.getConnections();
      setSavedConnections(connections);
    };
    loadConnections();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    const config = { host, user, password, port: Number(port) };
    const result = await onConnect(config);

    setLoading(false);
    if (!result.success) {
      setError(result.error || t('connectionForm.anUnknownErrorOccurred'));
    }
  };

  const handleSaveConnection = async () => {
    if (!connectionName) {
      setError(t('connectionForm.connectionNameCannotBeEmpty'));
      return;
    }
    const config = { host, user, password, port: Number(port) };
    await window.mysqlApi.saveConnection(connectionName, config);
    const connections = await window.mysqlApi.getConnections();
    setSavedConnections(connections);
    setError(null);
  };

  const handleDeleteConnection = async (name: string) => {
    await window.mysqlApi.deleteConnection(name);
    const connections = await window.mysqlApi.getConnections();
    setSavedConnections(connections);
    setSelectedConnection('');
    setError(null);
  };

  const handleLoadConnection = (event: any) => {
    const name = event.target.value;
    setSelectedConnection(name);
    const config = savedConnections[name];
    if (config) {
      setHost(config.host);
      setUser(config.user);
      setPassword(config.password);
      setPort(config.port);
      setConnectionName(name);
    }
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            {t('connectionForm.connectToMySQL')}
          </Typography>
          <Box component="form" sx={{ mt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="saved-connections-label">{t('connectionForm.loadSavedConnection')}</InputLabel>
              <Select
                labelId="saved-connections-label"
                value={selectedConnection}
                label={t('connectionForm.loadSavedConnection')}
                onChange={handleLoadConnection}
              >
                <MenuItem value=""><em>{t('connectionForm.none')}</em></MenuItem>
                {Object.keys(savedConnections).map((name) => (
                  <MenuItem value={name} key={name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      {name}
                      <IconButton edge="end" aria-label="delete" onClick={(e) => {
                        e.stopPropagation(); // Prevent selecting the item when clicking delete
                        handleDeleteConnection(name);
                      }}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              required
              fullWidth
              id="host"
              label={t('connectionForm.host')}
              name="host"
              autoFocus
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="user"
              label={t('connectionForm.user')}
              id="user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
            <TextField
              margin="normal"
              fullWidth
              name="password"
              label={t('connectionForm.password')}
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="port"
              label={t('connectionForm.port')}
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
            <TextField
              margin="normal"
              fullWidth
              label={t('connectionForm.connectionName')}
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
            />
            <Button
              type="button"
              fullWidth
              variant="outlined"
              sx={{ mt: 1, mb: 1 }}
              onClick={handleSaveConnection}
            >
              {t('connectionForm.saveConnection')}
            </Button>
            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 1, mb: 2 }}
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('connectionForm.connect')}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default ConnectionForm;
