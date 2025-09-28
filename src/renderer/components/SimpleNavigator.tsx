import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  StorageRounded as DatabaseIcon,
  TableChartRounded as TableIcon,
  SearchRounded as SearchIcon,
  StarRounded as StarIcon,
  StarOutlineRounded as StarOutlineIcon,
  DeleteRounded as DeleteIcon,
  AddRounded as AddIcon,
  RefreshRounded as RefreshIcon,
  PowerSettingsNewRounded as DisconnectIcon
} from '@mui/icons-material';
import { ConnectionProfile } from '../types';

interface SimpleNavigatorProps {
  savedProfiles: ConnectionProfile[];
  activeProfile: ConnectionProfile | null;
  connected: boolean;
  isConnecting?: boolean;
  databases?: string[];
  selectedDatabase?: string | null;
  selectedTable?: string | null;
  onProfileSelect: (profileId: string) => void;
  onNewConnection: () => void;
  onToggleFavorite: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onDatabaseSelect: (database: string) => void;
  onTableSelect: (database: string, table: string) => void;
  onRefresh: () => void;
  onDisconnect?: () => void;
}

const getInitials = (text: string) => {
  if (!text) return 'DB';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const SimpleNavigator: React.FC<SimpleNavigatorProps> = ({
  savedProfiles,
  activeProfile,
  connected,
  isConnecting,
  databases: propDatabases = [],
  selectedDatabase,
  selectedTable,
  onProfileSelect,
  onNewConnection,
  onToggleFavorite,
  onDeleteProfile,
  onDatabaseSelect,
  onTableSelect,
  onRefresh,
  onDisconnect
}) => {
  const theme = useTheme();
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<{ [key: string]: string[] }>({});
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTablesFor, setLoadingTablesFor] = useState<string | null>(null);

  useEffect(() => {
    setDatabases(propDatabases.map((db) => (typeof db === 'string' ? db : (db as any).Database || 'unknown')));
  }, [propDatabases]);

  useEffect(() => {
    setTables({});
    setExpandedDatabases(new Set());
  }, [activeProfile?.id]);

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return savedProfiles;
    const lower = searchTerm.toLowerCase();
    return savedProfiles.filter((profile) => `${profile.name} ${profile.host}`.toLowerCase().includes(lower));
  }, [savedProfiles, searchTerm]);

  const filteredDatabases = useMemo(() => {
    if (!searchTerm) return databases;
    const lower = searchTerm.toLowerCase();
    return databases.filter((db) => db.toLowerCase().includes(lower));
  }, [databases, searchTerm]);

  const toggleDatabase = async (database: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (expandedDatabases.has(database)) {
      newExpanded.delete(database);
      setExpandedDatabases(newExpanded);
      return;
    }

    newExpanded.add(database);
    setExpandedDatabases(newExpanded);

    if (!tables[database]) {
      try {
        setLoadingTablesFor(database);
        const result = await window.mysqlApi.getTables(database);
        if (result.success) {
          const rows: string[] = (result.data || []).map((row: any) => {
            const keys = Object.keys(row);
            if (keys.length === 0) return 'unknown_table';
            return row[keys[0]];
          });
          setTables((prev) => ({ ...prev, [database]: rows }));
        }
      } finally {
        setLoadingTablesFor(null);
      }
    }
    onDatabaseSelect(database);
  };

  const listBg = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.08 : 0.02);
  const hoverBg = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12);
  const activeBg = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.26 : 0.18);
  const borderColor = alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.12 : 0.16);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1px solid ${borderColor}` }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.34 : 0.08),
            border: `1px solid ${alpha(borderColor, 0.7)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.2
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
            <Stack spacing={0.4}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                当前连接
              </Typography>
              <Typography variant="subtitle2" fontWeight={600}>
                {activeProfile ? activeProfile.name : '未选择连接'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeProfile ? `${activeProfile.host}:${activeProfile.port}` : '选择连接以查看数据库'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="刷新连接">
                <span>
                  <IconButton
                    size="small"
                    onClick={onRefresh}
                    disabled={!activeProfile || isConnecting}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 1.2,
                      bgcolor: alpha(theme.palette.primary.main, 0.22),
                      color: theme.palette.primary.light,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.55)}`
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
              {activeProfile && (
                <Tooltip title="关闭连接">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onDisconnect?.()}
                      disabled={!connected || isConnecting}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: 1.2,
                        bgcolor: alpha(theme.palette.error.main, 0.18),
                        color: theme.palette.error.light,
                        border: `1px solid ${alpha(theme.palette.error.main, 0.45)}`
                      }}
                    >
                      <DisconnectIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="新建连接">
                <IconButton
                  size="small"
                  onClick={onNewConnection}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 1.2,
                    bgcolor: alpha('#38e0a2', 0.25),
                    color: '#cdfde7',
                    border: `1px solid ${alpha('#38e0a2', 0.55)}`
                  }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {connected ? `已加载 ${databases.length} 个数据库` : '尚未连接到服务器'}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: 1,
          pb: 2,
          '&::-webkit-scrollbar': {
            width: 6
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(borderColor, 0.6),
            borderRadius: 3
          }
        }}
      >
        <List dense disablePadding>
          {filteredProfiles.map((profile) => {
            const isActive = activeProfile?.id === profile.id;
            const avatarColor = alpha(theme.palette.primary.main, isActive ? 0.28 : 0.18);
            return (
              <React.Fragment key={profile.id}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => onProfileSelect(profile.id)}
                    selected={isActive}
                    sx={{
                      borderRadius: theme.shape.borderRadius,
                      alignItems: 'flex-start',
                      py: 1,
                      backgroundColor: isActive ? activeBg : 'transparent',
                      '&.Mui-selected:hover': {
                        backgroundColor: activeBg
                      },
                      '&:hover': {
                        backgroundColor: hoverBg
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: 14,
                          bgcolor: avatarColor,
                          color: theme.palette.primary.contrastText
                        }}
                      >
                        {getInitials(profile.name)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle2" color="text.primary" noWrap>
                            {profile.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleFavorite(profile.id);
                            }}
                          >
                            {profile.favorite ? (
                              <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                            ) : (
                              <StarOutlineIcon sx={{ fontSize: 16, color: alpha(theme.palette.text.secondary, 0.8) }} />
                            )}
                          </IconButton>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {profile.host}:{profile.port}
                        </Typography>
                      }
                    />
                    <Tooltip title="删除连接">
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteProfile(profile.id);
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                </ListItem>

                {isActive && connected && (
                  <Box sx={{ ml: 2.5, mt: 0.5 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontSize: 11 }}>
                      数据库
                    </Typography>
                    {filteredDatabases.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        未获取到数据库列表
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {filteredDatabases.map((database) => {
                          const isDatabaseSelected = selectedDatabase === database;
                          const isExpanded = expandedDatabases.has(database);
                          const databaseTables = tables[database] || [];
                          return (
                            <React.Fragment key={database}>
                              <ListItem disablePadding>
                                <ListItemButton
                                  onClick={() => toggleDatabase(database)}
                                  selected={isDatabaseSelected && !selectedTable}
                                  sx={{
                                    borderRadius: theme.shape.borderRadius,
                                    ml: 0.5,
                                    mr: 0.5,
                                    py: 0.6,
                                    '&.Mui-selected': {
                                      backgroundColor: activeBg,
                                      '&:hover': {
                                        backgroundColor: activeBg
                                      }
                                    },
                                    '&:hover': {
                                      backgroundColor: hoverBg
                                    }
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <DatabaseIcon sx={{ fontSize: 18, color: isDatabaseSelected ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.9) }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" noWrap>
                                        {database}
                                      </Typography>
                                    }
                                  />
                                  {loadingTablesFor === database ? (
                                    <CircularProgress size={14} />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      {databaseTables.length}
                                    </Typography>
                                  )}
                                </ListItemButton>
                              </ListItem>

                              {isExpanded && databaseTables.length > 0 && (
                                <List disablePadding dense sx={{ ml: 3 }}>
                                  {databaseTables.map((table) => {
                                    const isTableSelected = selectedDatabase === database && selectedTable === table;
                                    return (
                                      <ListItem disablePadding key={table}>
                                        <ListItemButton
                                          onClick={() => onTableSelect(database, table)}
                                          selected={isTableSelected}
                                          sx={{
                                            borderRadius: theme.shape.borderRadius,
                                            ml: 0.5,
                                            py: 0.45,
                                            '&.Mui-selected': {
                                              backgroundColor: activeBg,
                                              '&:hover': {
                                                backgroundColor: activeBg
                                              }
                                            },
                                            '&:hover': {
                                              backgroundColor: hoverBg
                                            }
                                          }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 24 }}>
                                            <TableIcon sx={{ fontSize: 16, color: isTableSelected ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.85) }} />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={
                                              <Typography variant="body2" noWrap>
                                                {table}
                                              </Typography>
                                            }
                                          />
                                        </ListItemButton>
                                      </ListItem>
                                    );
                                  })}
                                </List>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </List>
                    )}
                  </Box>
                )}
              </React.Fragment>
            );
          })}

          {filteredProfiles.length === 0 && (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                没有匹配的连接
              </Typography>
              <Button variant="text" size="small" onClick={onNewConnection} sx={{ mt: 1 }}>
                新建连接
              </Button>
            </Box>
          )}
        </List>
      </Box>

      <Box sx={{ px: 2, pt: 1, pb: 2, borderTop: `1px solid ${alpha(borderColor, 0.6)}` }}>
        <TextField
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={connected ? '筛选数据库或表...' : '搜索连接...'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: listBg,
              borderRadius: theme.shape.borderRadius,
              '& fieldset': {
                borderColor: alpha(borderColor, 0.6)
              },
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 1
              }
            },
            '& .MuiInputBase-input': {
              fontSize: 13
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default SimpleNavigator;
