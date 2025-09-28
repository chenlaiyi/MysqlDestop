import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AddRounded as AddIcon,
  TravelExploreRounded as QueryIcon,
  HubRounded as ModelIcon,
  AssessmentRounded as ReportIcon,
  CloudSyncRounded as CloudIcon,
  AutoAwesomeMotionRounded as AutomateIcon,
  LanRounded as ConnectionIcon,
  SettingsRounded as SettingsIcon,
  PersonRounded as ProfileIcon,
  PlayArrowRounded as PlayIcon,
  FolderSpecialRounded as FolderIcon,
  AddCircleRounded as AddCircleIcon,
  ScienceRounded as LabIcon,
  BackupTableRounded as StructIcon,
  ViewQuiltRounded as GridViewIcon,
  ViewAgendaRounded as ListViewIcon,
  PowerSettingsNewRounded as DisconnectIcon
} from '@mui/icons-material';
import ExactMainView from './components/ExactMainView';
import WelcomeScreen from './components/WelcomeScreen';
import NewNavicatConnectionDialog, { NavicatConnectionPayload } from './components/NewNavicatConnectionDialog';
import { ConnectionProfile } from './types';

const topQuickActions = [
  { key: 'connection', label: '连接', icon: <ConnectionIcon fontSize="small" />, color: '#2ea8ff' },
  { key: 'folder', label: '资源管理', icon: <FolderIcon fontSize="small" />, color: '#38cfff' },
  { key: 'new', label: '新建', icon: <AddCircleIcon fontSize="small" />, color: '#38e0a2' },
  { key: 'query', label: '查询', icon: <QueryIcon fontSize="small" />, color: '#ffd166' },
  { key: 'model', label: '模型', icon: <ModelIcon fontSize="small" />, color: '#a367ff' },
  { key: 'table', label: '表设计', icon: <StructIcon fontSize="small" />, color: '#ff90dd' },
  { key: 'report', label: '报表', icon: <ReportIcon fontSize="small" />, color: '#1fd1ff' },
  { key: 'cloud', label: '云同步', icon: <CloudIcon fontSize="small" />, color: '#55b0ff' },
  { key: 'lab', label: '自动化', icon: <AutomateIcon fontSize="small" />, color: '#ff8f5a' },
  { key: 'lab2', label: '实验室', icon: <LabIcon fontSize="small" />, color: '#9aff76' }
];

const connectionToProfile = (payload: NavicatConnectionPayload): ConnectionProfile => ({
  id: payload.id || `${payload.name || payload.host}-${Date.now()}`,
  name: payload.name || payload.host,
  host: payload.host,
  port: payload.port,
  username: payload.user,
  password: payload.password,
  database: payload.database,
  ssl: payload.useSSL,
  connectionLimit: payload.connectionLimit,
  description: payload.description,
  tags: payload.tags,
  favorite: payload.favorite ?? false
});

const profileToStoreConfig = (profile: ConnectionProfile) => ({
  host: profile.host,
  port: profile.port,
  user: profile.username,
  password: profile.password,
  database: profile.database,
  ssl: profile.ssl,
  lastUsed: profile.lastUsed?.toISOString?.() ?? undefined,
  favorite: profile.favorite,
  tags: profile.tags,
  description: profile.description
});

const App: React.FC = () => {
  const theme = useTheme();
  const [savedProfiles, setSavedProfiles] = useState<ConnectionProfile[]>([]);
  const [connectedProfile, setConnectedProfile] = useState<ConnectionProfile | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProfileId, setConnectingProfileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionDialogMode, setConnectionDialogMode] = useState<'create' | 'edit'>('create');
  const [connectionDialogProfile, setConnectionDialogProfile] = useState<ConnectionProfile | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const savedConnections = await window.mysqlApi.getConnections();
      const profiles = Object.entries(savedConnections || {}).map(([key, config]: [string, any]) => ({
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
      console.error('加载保存连接时出错:', error);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleConnect = async (profile: ConnectionProfile) => {
    setIsConnecting(true);
    setConnectingProfileId(profile.id);
    setConnectionError(null);

    try {
      const config = {
        host: profile.host,
        port: profile.port,
        user: profile.username,
        password: profile.password,
        database: profile.database,
        ssl: profile.ssl
      };

      const result = await window.mysqlApi.connect(config);

      if (result.success) {
        setConnectedProfile(profile);
        const dbList = (result.data || []).map((row: any) => row.Database || row.database || row);
        setDatabases(dbList);
        const updatedProfile: ConnectionProfile = {
          ...profile,
          lastUsed: new Date()
        };
        setSavedProfiles((prev) => {
          const others = prev.filter((item) => item.id !== updatedProfile.id);
          return [updatedProfile, ...others];
        });
        await window.mysqlApi.saveConnection(profile.name, {
          ...profileToStoreConfig(profile),
          lastUsed: new Date().toISOString()
        });
      } else {
        throw new Error(result.error || '连接失败');
      }
    } catch (error: any) {
      console.error('连接错误:', error);
      setConnectionError(error?.message || String(error));
      alert(`连接失败: ${error}`);
    } finally {
      setIsConnecting(false);
      setConnectingProfileId(null);
    }
  };

  const handleSelectProfile = (profileId: string) => {
    const profile = savedProfiles.find((item) => item.id === profileId);
    if (profile) {
      handleConnect(profile);
    }
  };

  const handleToggleFavorite = async (profileId: string) => {
    setSavedProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId ? { ...profile, favorite: !profile.favorite } : profile
      )
    );

    const profile = savedProfiles.find((item) => item.id === profileId);
    if (profile) {
      await window.mysqlApi.saveConnection(profile.name, {
        ...profileToStoreConfig(profile),
        favorite: !profile.favorite
      });
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    const profile = savedProfiles.find((item) => item.id === profileId);
    if (!profile) return;
    await window.mysqlApi.deleteConnection(profile.name);
    setSavedProfiles((prev) => prev.filter((item) => item.id !== profileId));
    if (connectedProfile?.id === profileId) {
      setConnectedProfile(null);
      setDatabases([]);
    }
  };

  const handleConnectionDialogSave = async (payload: NavicatConnectionPayload) => {
    const normalized = connectionToProfile(payload);
    setShowConnectionDialog(false);
    setConnectionDialogProfile(null);
    setConnectionDialogMode('create');
    await window.mysqlApi.saveConnection(normalized.name, profileToStoreConfig(normalized));
    await loadConnections();
    await handleConnect(normalized);
  };

  const handleDisconnect = () => {
    setConnectedProfile(null);
    setDatabases([]);
    setConnectionError(null);
  };

  const openCreateConnectionDialog = () => {
    setConnectionDialogMode('create');
    setConnectionDialogProfile(null);
    setShowConnectionDialog(true);
  };

  const openEditConnectionDialog = (profile: ConnectionProfile) => {
    setConnectionDialogMode('edit');
    setConnectionDialogProfile(profile);
    setShowConnectionDialog(true);
  };

  const connectionStatusChip = useMemo(() => {
    if (isConnecting) {
      return <Chip color="primary" variant="outlined" icon={<PlayIcon fontSize="small" />} label="连接中" />;
    }
    if (connectedProfile) {
      return <Chip color="success" variant="filled" icon={<PlayIcon fontSize="small" />} label="连接就绪" sx={{ fontWeight: 600 }} />;
    }
    return <Chip variant="outlined" label="未连接" sx={{ fontWeight: 600 }} />;
  }, [connectedProfile, isConnecting]);

  const isConnected = Boolean(connectedProfile);

  const navigatorProfiles = useMemo(() => {
    if (connectedProfile && !savedProfiles.some((profile) => profile.id === connectedProfile.id)) {
      return [connectedProfile, ...savedProfiles];
    }
    return savedProfiles;
  }, [savedProfiles, connectedProfile]);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const topBarBg = 'linear-gradient(180deg, rgba(33,40,54,0.98) 0%, rgba(19,24,33,0.98) 100%)';
  const separatorColor = alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.08 : 0.16);

  const HEADER_HEIGHT = 88;
  const FOOTER_HEIGHT = 52;

  return (
    <Box
      sx={{
        height: '100vh',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box
        component="header"
        sx={{
          px: 3,
          py: 1.5,
          backgroundImage: topBarBg,
          borderBottom: `1px solid ${alpha(separatorColor, 0.8)}`,
          boxShadow: '0 18px 36px rgba(4, 5, 12, 0.45)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={3}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            {topQuickActions.map((action) => (
              <Tooltip key={action.key} title={action.label} placement="bottom">
                <IconButton
                  size="medium"
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: alpha(action.color, 0.28),
                    color: '#ffffff',
                    border: `1px solid ${alpha(action.color, 0.6)}`,
                    boxShadow: `0 10px 22px ${alpha(action.color, 0.35)}`,
                    '&:hover': {
                      bgcolor: alpha(action.color, 0.36),
                      boxShadow: `0 12px 24px ${alpha(action.color, 0.4)}`
                    }
                  }}
                >
                  {action.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {connectionStatusChip}
            {connectedProfile && (
              <Tooltip title="关闭连接">
                <span>
                  <IconButton
                    color="error"
                    onClick={handleDisconnect}
                    sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.4)}` }}
                  >
                    <DisconnectIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={openCreateConnectionDialog}
              sx={{ boxShadow: '0 12px 24px rgba(48, 162, 255, 0.22)' }}
            >
              新建连接
            </Button>
          </Stack>

          <Stack direction="row" spacing={1.25} alignItems="center">
            {(['grid', 'list'] as const).map((modeKey) => {
              const isActive = viewMode === modeKey;
              const Icon = modeKey === 'grid' ? GridViewIcon : ListViewIcon;
              return (
                <IconButton
                  key={modeKey}
                  size="small"
                  onClick={() => handleViewModeChange(modeKey)}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(theme.palette.common.white, isActive ? 0.2 : 0.06)}`,
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.28)
                      : alpha(theme.palette.common.white, 0.05),
                    color: isActive
                      ? theme.palette.primary.light
                      : alpha(theme.palette.text.secondary, 0.8),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.32)
                    }
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              );
            })}
            <IconButton
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                bgcolor: alpha(theme.palette.common.white, 0.05)
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: alpha(theme.palette.common.white, 0.08),
                color: alpha(theme.palette.common.white, 0.78),
                fontSize: 16,
                border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`
              }}
            >
              <ProfileIcon fontSize="small" />
            </Avatar>
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          pt: `${HEADER_HEIGHT}px`,
          pb: `${FOOTER_HEIGHT}px`
        }}
      >
      <Box
        sx={{
          height: '100%',
          overflow: 'auto',
          px: 3,
          py: 3
        }}
      >
          {isConnected ? (
            <ExactMainView
              databases={databases}
              savedProfiles={navigatorProfiles}
              activeProfile={connectedProfile}
              connected={isConnected}
              isConnecting={isConnecting}
              onSelectProfile={handleSelectProfile}
              onNewConnection={openCreateConnectionDialog}
              onToggleFavorite={handleToggleFavorite}
              onDeleteProfile={handleDeleteProfile}
              onRefreshDatabases={() => connectedProfile && handleConnect(connectedProfile)}
              onDisconnect={handleDisconnect}
            />
          ) : (
            <WelcomeScreen
              onConnect={handleConnect}
              onNewConnection={openCreateConnectionDialog}
              onEditConnection={openEditConnectionDialog}
              savedProfiles={savedProfiles}
              onDeleteConnection={handleDeleteProfile}
              onToggleFavorite={handleToggleFavorite}
              isConnecting={isConnecting}
              connectingProfile={connectingProfileId || undefined}
            />
          )}
        </Box>
      </Box>

      <Box
        component="footer"
        sx={{
          px: 3,
          py: 1,
          borderTop: `1px solid ${separatorColor}`,
          backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.04),
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {connectedProfile
              ? `${connectedProfile.host}:${connectedProfile.port} (${databases.length} 库)`
              : '尚未建立数据库连接'}
          </Typography>
          {connectionError && (
            <Typography variant="caption" color={theme.palette.error.main}>
              {connectionError}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Navicat 风格 UI · 点点够 MySQL
          </Typography>
        </Stack>
      </Box>

      <NewNavicatConnectionDialog
        open={showConnectionDialog}
        onClose={() => {
          setShowConnectionDialog(false);
          setConnectionDialogMode('create');
          setConnectionDialogProfile(null);
        }}
        onSave={handleConnectionDialogSave}
        profile={connectionDialogProfile
          ? {
              id: connectionDialogProfile.id,
              name: connectionDialogProfile.name,
              host: connectionDialogProfile.host,
              port: connectionDialogProfile.port,
              user: connectionDialogProfile.username,
              password: connectionDialogProfile.password,
              database: connectionDialogProfile.database,
              useSSL: Boolean(connectionDialogProfile.ssl),
              useSSH: false,
              charset: 'utf8mb4',
              timezone: 'local',
              connectionLimit: connectionDialogProfile.connectionLimit ?? 10,
              tags: connectionDialogProfile.tags ?? [],
              description: connectionDialogProfile.description,
              favorite: connectionDialogProfile.favorite ?? false
            }
          : undefined}
        mode={connectionDialogMode}
      />
    </Box>
  );
};

export default App;
