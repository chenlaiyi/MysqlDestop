import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  StorageRounded as ConnectionIcon,
  TableChartRounded as TableIcon,
  ViewListRounded as ViewIcon,
  SearchRounded as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  SettingsRounded as SettingsIcon
} from '@mui/icons-material';

interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  ssl?: boolean;
  favorite?: boolean;
  lastUsed?: Date;
}

interface ConnectionSidebarProps {
  profiles: ConnectionProfile[];
  activeProfile: ConnectionProfile | null;
  databases: string[];
  selectedDatabase: string | null;
  selectedTable: string | null;
  isConnecting: boolean;
  connectingProfileId: string | null;
  onConnect: (profile: ConnectionProfile) => void;
  onDisconnect: () => void;
  onNewConnection: () => void;
  onEditConnection: (profile: ConnectionProfile) => void;
  onDeleteConnection: (profileId: string) => void;
  onToggleFavorite: (profileId: string) => void;
  onDatabaseSelect: (database: string) => void;
  onTableSelect: (database: string, table: string) => void;
  onViewSelect: (database: string, view: string) => void;
}

const ConnectionSidebar: React.FC<ConnectionSidebarProps> = ({
  profiles,
  activeProfile,
  databases,
  selectedDatabase,
  selectedTable,
  isConnecting,
  connectingProfileId,
  onConnect,
  onDisconnect,
  onNewConnection,
  onEditConnection,
  onDeleteConnection,
  onToggleFavorite,
  onDatabaseSelect,
  onTableSelect,
  onViewSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [tables, setTables] = useState<{ [key: string]: string[] }>({});
  const [views, setViews] = useState<{ [key: string]: string[] }>({});
  const [loadingTablesFor, setLoadingTablesFor] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; profile: ConnectionProfile } | null>(null);

  // 当连接成功时自动展开该连接
  useEffect(() => {
    if (activeProfile) {
      setExpandedConnections((prev) => new Set(prev).add(activeProfile.id));
    }
  }, [activeProfile?.id]);

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    const lower = searchTerm.toLowerCase();
    return profiles.filter((p) =>
      `${p.name} ${p.host}`.toLowerCase().includes(lower)
    );
  }, [profiles, searchTerm]);

  const handleConnectionClick = (profile: ConnectionProfile) => {
    if (activeProfile?.id === profile.id) {
      // 已连接，切换展开状态
      const newExpanded = new Set(expandedConnections);
      if (newExpanded.has(profile.id)) {
        newExpanded.delete(profile.id);
      } else {
        newExpanded.add(profile.id);
      }
      setExpandedConnections(newExpanded);
    } else {
      // 未连接，发起连接
      onConnect(profile);
    }
  };

  const handleConnectionDoubleClick = (profile: ConnectionProfile) => {
    if (activeProfile?.id !== profile.id) {
      onConnect(profile);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, profile: ConnectionProfile) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, profile });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const toggleDatabase = async (database: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(database)) {
      newExpanded.delete(database);
      setExpandedDatabases(newExpanded);
      return;
    }

    newExpanded.add(database);
    setExpandedDatabases(newExpanded);
    onDatabaseSelect(database);

    // 加载表和视图
    const needLoadTables = !tables[database];
    const needLoadViews = !views[database];

    if (needLoadTables || needLoadViews) {
      try {
        setLoadingTablesFor(database);

        // 并行加载表和视图
        const promises: Promise<any>[] = [];
        if (needLoadTables) {
          promises.push(window.mysqlApi.getTables(database));
        }
        if (needLoadViews) {
          promises.push(window.mysqlApi.getViews(database));
        }

        const results = await Promise.all(promises);
        let resultIndex = 0;

        if (needLoadTables) {
          const tablesResult = results[resultIndex++];
          if (tablesResult.success) {
            const rows: string[] = (tablesResult.data || []).map((row: any) => {
              const keys = Object.keys(row);
              return keys.length > 0 ? row[keys[0]] : 'unknown';
            });
            setTables((prev) => ({ ...prev, [database]: rows }));
          }
        }

        if (needLoadViews) {
          const viewsResult = results[resultIndex++];
          if (viewsResult.success) {
            const viewRows: string[] = (viewsResult.data || []).map((row: any) => {
              return row.VIEW_NAME || row.TABLE_NAME || Object.values(row)[0] || 'unknown';
            });
            setViews((prev) => ({ ...prev, [database]: viewRows }));
          }
        }
      } finally {
        setLoadingTablesFor(null);
      }
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* 连接列表 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense disablePadding sx={{ py: 0.5 }}>
          {filteredProfiles.map((profile) => {
            const isActive = activeProfile?.id === profile.id;
            const isExpanded = expandedConnections.has(profile.id);
            const isThisConnecting = isConnecting && connectingProfileId === profile.id;

            return (
              <Box key={profile.id}>
                <ListItemButton
                  onClick={() => handleConnectionClick(profile)}
                  onDoubleClick={() => handleConnectionDoubleClick(profile)}
                  onContextMenu={(e) => handleContextMenu(e, profile)}
                  sx={{
                    py: 0.5,
                    minHeight: 32,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    {isActive && isExpanded ? (
                      <ExpandMoreIcon sx={{ fontSize: 16 }} />
                    ) : isActive ? (
                      <ChevronRightIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <Box sx={{ width: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <ConnectionIcon
                      sx={{ fontSize: 18 }}
                      color={isActive ? 'primary' : 'action'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={profile.name}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      noWrap: true,
                      color: isActive ? 'primary.main' : 'text.primary'
                    }}
                  />
                  {isThisConnecting && <CircularProgress size={14} />}
                </ListItemButton>

                {/* 数据库列表 */}
                <Collapse in={isActive && isExpanded} timeout="auto" unmountOnExit>
                  <List dense disablePadding>
                    {databases.map((database) => {
                      const isDbExpanded = expandedDatabases.has(database);
                      const isDbSelected = selectedDatabase === database;
                      const dbTables = tables[database] || [];

                      return (
                        <Box key={database}>
                          <ListItemButton
                            onClick={() => toggleDatabase(database)}
                            sx={{ py: 0.25, pl: 5, minHeight: 28 }}
                          >
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              {isDbExpanded ? (
                                <ExpandMoreIcon sx={{ fontSize: 14 }} />
                              ) : (
                                <ChevronRightIcon sx={{ fontSize: 14 }} />
                              )}
                            </ListItemIcon>
                            <ListItemIcon sx={{ minWidth: 22 }}>
                              <ConnectionIcon
                                sx={{ fontSize: 16 }}
                                color={isDbSelected ? 'primary' : 'action'}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={database}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontSize: 12,
                                fontWeight: isDbSelected ? 600 : 400,
                                noWrap: true
                              }}
                            />
                            {loadingTablesFor === database && (
                              <CircularProgress size={12} />
                            )}
                          </ListItemButton>

                          {/* 表列表 */}
                          <Collapse in={isDbExpanded} timeout="auto" unmountOnExit>
                            <List dense disablePadding>
                              {dbTables.map((table) => {
                                const isTableSelected =
                                  selectedDatabase === database && selectedTable === table;
                                return (
                                  <ListItemButton
                                    key={table}
                                    onClick={() => onTableSelect(database, table)}
                                    sx={{ py: 0.25, pl: 9, minHeight: 26 }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 22 }}>
                                      <TableIcon
                                        sx={{ fontSize: 14 }}
                                        color={isTableSelected ? 'primary' : 'action'}
                                      />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={table}
                                      primaryTypographyProps={{
                                        variant: 'body2',
                                        fontSize: 12,
                                        fontWeight: isTableSelected ? 600 : 400,
                                        noWrap: true
                                      }}
                                    />
                                  </ListItemButton>
                                );
                              })}
                              {/* 视图列表 */}
                              {(views[database] || []).map((view) => (
                                <ListItemButton
                                  key={`view-${view}`}
                                  onClick={() => onViewSelect(database, view)}
                                  sx={{ py: 0.25, pl: 9, minHeight: 26 }}
                                >
                                  <ListItemIcon sx={{ minWidth: 22 }}>
                                    <ViewIcon
                                      sx={{ fontSize: 14 }}
                                      color="action"
                                    />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={view}
                                    primaryTypographyProps={{
                                      variant: 'body2',
                                      fontSize: 12,
                                      fontStyle: 'italic',
                                      noWrap: true
                                    }}
                                  />
                                </ListItemButton>
                              ))}
                            </List>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            );
          })}

          {filteredProfiles.length === 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ p: 2, display: 'block', textAlign: 'center' }}
            >
              {searchTerm ? '无匹配结果' : '暂无连接'}
            </Typography>
          )}
        </List>
      </Box>

      {/* 底部搜索和设置 */}
      <Box
        sx={{
          p: 1,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <IconButton size="small">
          <SettingsIcon fontSize="small" />
        </IconButton>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18 }} color="action" />
              </InputAdornment>
            ),
            sx: { fontSize: 13, height: 28 }
          }}
        />
      </Box>

      {/* 右键菜单 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu && activeProfile?.id === contextMenu.profile.id ? (
          <MenuItem onClick={() => { onDisconnect(); handleCloseContextMenu(); }}>
            关闭连接
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { contextMenu && onConnect(contextMenu.profile); handleCloseContextMenu(); }}>
            打开连接
          </MenuItem>
        )}
        <MenuItem onClick={() => { contextMenu && onEditConnection(contextMenu.profile); handleCloseContextMenu(); }}>
          编辑连接
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { contextMenu && onDeleteConnection(contextMenu.profile.id); handleCloseContextMenu(); }}>
          删除连接
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ConnectionSidebar;
