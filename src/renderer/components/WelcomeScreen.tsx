import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AddRounded as AddIcon,
  AccessTimeRounded as AccessTimeIcon,
  CloudOffRounded as EmptyIcon,
  EditRounded as EditIcon,
  FavoriteRounded as StarIcon,
  FavoriteBorderRounded as StarBorderIcon,
  PlayArrowRounded as PlayIcon,
  SearchRounded as SearchIcon,
  DeleteRounded as DeleteIcon
} from '@mui/icons-material';
import SuperConnectionWizard from './SuperConnectionWizard';
import TestConnectionDialog from './TestConnectionDialog';

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

interface WelcomeScreenProps {
  onConnect: (profile: ConnectionProfile) => void;
  onNewConnection: () => void;
  onEditConnection: (profile: ConnectionProfile) => void;
  savedProfiles: ConnectionProfile[];
  onDeleteConnection: (profileId: string) => void;
  onToggleFavorite: (profileId: string) => void;
  isConnecting?: boolean;
  connectingProfile?: string;
}

const formatLastUsed = (lastUsed?: Date | string | number) => {
  if (!lastUsed) {
    return '尚未使用';
  }

  const parsed =
    lastUsed instanceof Date
      ? lastUsed
      : typeof lastUsed === 'number'
        ? new Date(lastUsed)
        : new Date(lastUsed);

  if (Number.isNaN(parsed.getTime())) {
    return '尚未使用';
  }

  const diff = Date.now() - parsed.getTime();
  if (diff < 0) {
    return '刚刚';
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    return '刚刚';
  }

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} 分钟前`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} 小时前`;
  }

  if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} 天前`;
  }

  return parsed.toLocaleDateString();
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onConnect,
  onNewConnection,
  onEditConnection,
  savedProfiles = [],
  onDeleteConnection,
  onToggleFavorite,
  isConnecting = false,
  connectingProfile
}) => {
  const theme = useTheme();
  const panelBg = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.98);
  const borderColor = alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.06 : 0.12);
  const iconColor = alpha(theme.palette.text.secondary, 0.76);
  const iconHoverColor = theme.palette.primary.main;
  const listHoverBg = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1);
  const listActiveBg = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.14);
  const [searchTerm, setSearchTerm] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | undefined>();
  const [showTestDialog, setShowTestDialog] = useState(false);

  const handleConnectClick = (profile: ConnectionProfile) => {
    onConnect(profile);
  };

  const openCreateWizard = () => {
    setEditingProfile(undefined);
    setIsWizardOpen(true);
  };

  const openEditWizard = (profile: ConnectionProfile) => {
    setEditingProfile(profile);
    setIsWizardOpen(true);
    onEditConnection(profile);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
    setEditingProfile(undefined);
  };

  const handleWizardConnect = (profile: ConnectionProfile) => {
    setIsWizardOpen(false);
    setEditingProfile(undefined);
    onConnect(profile);
  };

  const connectionIcon = (profile: ConnectionProfile) => {
    const labelSource = profile.name || profile.host || 'DB';
    return (
      <Avatar
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          color: theme.palette.primary.main,
          width: 40,
          height: 40,
          fontSize: 16,
          fontWeight: 600
        }}
      >
        {labelSource.slice(0, 2).toUpperCase()}
      </Avatar>
    );
  };

  const sortedProfiles = useMemo(() => {
    const list = [...savedProfiles];
    list.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      const aTime = a.lastUsed?.getTime() ?? 0;
      const bTime = b.lastUsed?.getTime() ?? 0;
      return bTime - aTime;
    });
    return list;
  }, [savedProfiles]);

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return sortedProfiles;
    return sortedProfiles.filter((profile) => {
      const target = `${profile.name ?? ''} ${profile.host} ${profile.database ?? ''}`.toLowerCase();
      return target.includes(searchTerm.toLowerCase());
    });
  }, [sortedProfiles, searchTerm]);

  const favoriteCount = useMemo(
    () => savedProfiles.filter((profile) => profile.favorite).length,
    [savedProfiles]
  );

    const latestProfile = sortedProfiles[0];

    const renderProfileRow = (profile: ConnectionProfile) => {
      const isActive = isConnecting && connectingProfile === profile.id;

      return (
        <ListItemButton
          key={profile.id}
          onClick={() => handleConnectClick(profile)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: theme.shape.borderRadius,
            px: 2,
            py: 1.5,
            border: `1px solid ${borderColor}`,
            backgroundColor: isActive ? listActiveBg : alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.02 : 0.05),
            transition: 'all .2s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: listHoverBg
            }
          }}
        >
          {connectionIcon(profile)}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {profile.name || `${profile.username}@${profile.host}`}
              </Typography>
              {profile.favorite && (
                <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {profile.host}:{profile.port}
              {profile.database ? ` · ${profile.database}` : ''}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <AccessTimeIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
              <Typography variant="caption" color="text.secondary">
                {formatLastUsed(profile.lastUsed)}{profile.ssl ? ' · SSL' : ''}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              aria-label="toggle favorite"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(profile.id);
              }}
            >
              {profile.favorite ? <StarIcon color="warning" fontSize="small" /> : <StarBorderIcon fontSize="small" />}
            </IconButton>
            <IconButton
              aria-label="edit"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                openEditWizard(profile);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="delete"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteConnection(profile.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </ListItemButton>
      );
    };

    return (
      <>
        <Stack spacing={3} sx={{ width: '100%' }}>
  <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: theme.shape.borderRadius }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h5" fontWeight={600} color="text.primary">
                    我的数据库连接
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    统一管理常用连接，快速发起和继续数据库会话。
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateWizard}
                  >
                    新建连接
                  </Button>
                  <Button variant="outlined" onClick={() => setShowTestDialog(true)}>
                    测试连接
                  </Button>
                </Stack>
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <TextField
                  size="small"
                  placeholder="搜索连接名称 / 主机 / 数据库"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ flex: 1, maxWidth: 480 }}
                />
                <Stack direction="row" spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    共 {savedProfiles.length} 个连接
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    收藏 {favoriteCount} 个
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>

  <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: theme.shape.borderRadius }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                保存的连接
              </Typography>
              {filteredProfiles.length === 0 ? (
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      width: 56,
                      height: 56
                    }}
                  >
                    <EmptyIcon />
                  </Avatar>
                  <Typography variant="subtitle1" color="text.secondary">
                    {savedProfiles.length === 0 ? '尚未保存连接' : '没有匹配的结果'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    {savedProfiles.length === 0
                      ? '使用上方的“新建连接”按钮开始配置。'
                      : '尝试调整关键字，或直接创建一个新的连接。'}
                  </Typography>
                </Stack>
              ) : (
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {filteredProfiles.map(renderProfileRow)}
                </List>
              )}
            </Stack>
          </Paper>

  <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: theme.shape.borderRadius }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  下一步要做什么？
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {latestProfile
                    ? `最近一次连接：${latestProfile.name || `${latestProfile.username}@${latestProfile.host}`}`
                    : '创建第一个连接后，可从这里快速跳转。'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={() => latestProfile && handleConnectClick(latestProfile)}
                  disabled={!latestProfile}
                >
                  连接最近记录
                </Button>
                <Button variant="outlined" onClick={onNewConnection}>
                  查看连接列表
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <SuperConnectionWizard
          open={isWizardOpen}
          onClose={handleWizardClose}
          onConnect={handleWizardConnect}
          initialProfile={editingProfile}
          savedProfiles={savedProfiles}
        />

        {showTestDialog && (
          <TestConnectionDialog onClose={() => setShowTestDialog(false)} />
        )}
      </>
    );
};

export default WelcomeScreen;
