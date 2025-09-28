import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Stack
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  RefreshRounded as RefreshIcon,
  VisibilityRounded as ViewIcon,
  ContentCopyRounded as CopyIcon,
  DownloadRounded as ExportIcon,
  LaunchRounded as OpenIcon,
  DeleteSweepRounded as ClearIcon,
  AddRounded as AddIcon,
  CloseRounded as CloseIcon
} from '@mui/icons-material';
import SimpleNavigator from './SimpleNavigator';
import ExactDataTable from './ExactDataTable';
import DatabaseObjectsView, { ObjectActionKey } from './DatabaseObjectsView';
import { ConnectionProfile } from '../types';

interface ExactMainViewProps {
  databases: string[];
  savedProfiles: ConnectionProfile[];
  activeProfile: ConnectionProfile | null;
  connected: boolean;
  isConnecting?: boolean;
  onSelectProfile: (profileId: string) => void;
  onNewConnection: () => void;
  onToggleFavorite: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onRefreshDatabases: () => void;
  onDatabaseChange?: (database: string) => void;
  onTableChange?: (table: string) => void;
  onDisconnect: () => void;
}

interface TabInfo {
  id: string;
  label: string;
  database?: string;
  table?: string;
  closable: boolean;
}

const ExactMainView: React.FC<ExactMainViewProps> = ({
  databases,
  savedProfiles,
  activeProfile,
  connected,
  isConnecting,
  onSelectProfile,
  onNewConnection,
  onToggleFavorite,
  onDeleteProfile,
  onRefreshDatabases,
  onDatabaseChange,
  onTableChange,
  onDisconnect
}) => {
  const theme = useTheme();

  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tabs, setTabs] = useState<TabInfo[]>([
    { id: 'objects', label: '对象', closable: false }
  ]);
  const [activeTab, setActiveTab] = useState('objects');

  useEffect(() => {
    if (!connected) {
      setSelectedDatabase(null);
      setSelectedTable(null);
      setTabs([{ id: 'objects', label: '对象', closable: false }]);
      setActiveTab('objects');
    }
  }, [connected]);

  useEffect(() => {
    if (selectedDatabase && !databases.includes(selectedDatabase)) {
      setSelectedDatabase(null);
      setSelectedTable(null);
      setActiveTab('objects');
    }
  }, [databases, selectedDatabase]);

  const handleDatabaseSelect = (database: string) => {
    setSelectedDatabase(database);
    onDatabaseChange?.(database);
  };

  const handleTableSelect = (database: string, table: string) => {
    setSelectedDatabase(database);
    setSelectedTable(table);
    onDatabaseChange?.(database);
    onTableChange?.(table);

    const tabId = `${database}.${table}`;
    const existingTab = tabs.find((tab) => tab.id === tabId);

    if (!existingTab) {
      const newTab: TabInfo = {
        id: tabId,
        label: table,
        database,
        table,
        closable: true
      };
      setTabs((prev) => [...prev, newTab]);
    }

    setActiveTab(tabId);
  };

  const handleOpenTableFromObjects = (tableName: string) => {
    if (selectedDatabase) {
      handleTableSelect(selectedDatabase, tableName);
    }
  };

  const handleObjectsAction = (action: ObjectActionKey, tableName: string) => {
    switch (action) {
      case 'open':
        handleOpenTableFromObjects(tableName);
        break;
      case 'refresh':
        handleRefresh();
        break;
      default:
        console.info(`Action "${action}" triggered for table ${tableName}`);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    const tab = tabs.find((t) => t.id === newValue);
    if (tab && tab.database && tab.table) {
      setSelectedDatabase(tab.database);
      setSelectedTable(tab.table);
      onDatabaseChange?.(tab.database);
      onTableChange?.(tab.table);
    }
  };

  const handleTabClose = (tabId: string) => {
    const tabToClose = tabs.find((tab) => tab.id === tabId);
    if (!tabToClose || !tabToClose.closable) return;

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTab === tabId) {
      const fallbackTab = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'objects';
      setActiveTab(fallbackTab);
      const fallback = newTabs.find((t) => t.id === fallbackTab);
      if (fallback && fallback.database && fallback.table) {
        setSelectedDatabase(fallback.database);
        setSelectedTable(fallback.table);
        onDatabaseChange?.(fallback.database);
        onTableChange?.(fallback.table);
      } else {
        setSelectedTable(null);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    onRefreshDatabases();
  };

  const infoSurface = 'linear-gradient(180deg, rgba(25,32,45,0.96) 0%, rgba(12,17,27,0.98) 100%)';
  const borderColor = alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.06 : 0.12);
  const headerBg = alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.32 : 0.06);
  const toolbarBg = alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.36 : 0.08);

  const workspaceActions = [
    { key: 'refresh', label: '刷新', icon: <RefreshIcon fontSize="small" />, onClick: handleRefresh, color: '#2ea8ff' },
    { key: 'open', label: '打开', icon: <OpenIcon fontSize="small" />, onClick: () => undefined, color: '#38cfff' },
    { key: 'view', label: '预览', icon: <ViewIcon fontSize="small" />, onClick: () => undefined, color: '#ffd166' },
    { key: 'export', label: '导出', icon: <ExportIcon fontSize="small" />, onClick: () => undefined, color: '#7a7cff' },
    { key: 'copy', label: '复制', icon: <CopyIcon fontSize="small" />, onClick: () => undefined, color: '#38e0a2' },
    { key: 'clear', label: '清除', icon: <ClearIcon fontSize="small" />, onClick: () => undefined, color: '#ff8f5a' },
    { key: 'new', label: '新建', icon: <AddIcon fontSize="small" />, onClick: onNewConnection, color: '#9aff76' }
  ];

  const workspaceTitle = useMemo(() => {
    if (activeTab === 'objects') {
      if (selectedDatabase) {
        return `${selectedDatabase} · 对象`;
      }
      return '对象';
    }
    if (selectedTable && selectedDatabase) {
      return `${selectedTable}@${selectedDatabase}`;
    }
    if (selectedDatabase) {
      return `${selectedDatabase}`;
    }
    if (activeProfile) {
      return `${activeProfile.name}`;
    }
    return '请选择数据库';
  }, [activeTab, selectedTable, selectedDatabase, activeProfile]);

  const workspaceSubtitle = useMemo(() => {
    if (activeTab === 'objects') {
      if (isConnecting) {
        return '正在连接并获取表信息...';
      }
      if (selectedDatabase) {
        return `当前库：${selectedDatabase} · 双击表可打开数据视图`;
      }
      return '请选择数据库以查看对象列表';
    }
    if (isConnecting) {
      return '正在连接到服务器...';
    }
    if (activeProfile) {
      return `${activeProfile.host}:${activeProfile.port} · ${activeProfile.username}`;
    }
    return '未建立连接';
  }, [activeTab, selectedDatabase, activeProfile, isConnecting]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${borderColor}`,
        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.92 : 1)
      }}
    >
      <Box
        sx={{
          width: { xs: 260, md: 300 },
          flexShrink: 0,
          borderRight: `1px solid ${borderColor}`,
          backgroundImage: infoSurface,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <SimpleNavigator
          savedProfiles={savedProfiles}
          activeProfile={activeProfile}
          connected={connected}
          isConnecting={isConnecting}
          selectedDatabase={selectedDatabase}
          selectedTable={selectedTable}
          onDatabaseSelect={handleDatabaseSelect}
          onTableSelect={handleTableSelect}
          onProfileSelect={onSelectProfile}
          onNewConnection={onNewConnection}
          onToggleFavorite={onToggleFavorite}
          onDeleteProfile={onDeleteProfile}
          onRefresh={handleRefresh}
          onDisconnect={onDisconnect}
          databases={databases}
          key={refreshKey}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: 'linear-gradient(180deg, rgba(18,24,35,0.92) 0%, rgba(11,16,26,0.96) 100%)'
        }}
      >
        <Box
          sx={{
            borderBottom: `1px solid ${borderColor}`,
            backgroundColor: headerBg,
            px: 3,
            py: 2
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            justifyContent="space-between"
          >
            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ letterSpacing: -0.2 }}>
                {workspaceTitle}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">
                  {workspaceSubtitle}
                </Typography>
                {selectedDatabase && (
                  <Chip
                    size="small"
                    label={`库：${selectedDatabase}`}
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.16),
                      color: alpha(theme.palette.common.white, 0.85)
                    }}
                  />
                )}
                {selectedTable && (
                  <Chip
                    size="small"
                    label={`表：${selectedTable}`}
                    sx={{
                      backgroundColor: alpha(theme.palette.secondary.main, 0.16),
                      color: alpha(theme.palette.common.white, 0.85)
                    }}
                  />
                )}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {workspaceActions.map((action) => (
                <Tooltip title={action.label} key={action.key}>
                  <IconButton
                    size="small"
                    onClick={action.onClick}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: alpha(action.color, 0.22),
                      color: '#ffffff',
                      border: `1px solid ${alpha(action.color, 0.45)}`,
                      boxShadow: `0 10px 20px ${alpha(action.color, 0.3)}`,
                      '&:hover': {
                        bgcolor: alpha(action.color, 0.32)
                      }
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            borderBottom: `1px solid ${borderColor}`,
            backgroundColor: toolbarBg,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            px: 2
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              '& .MuiTabs-flexContainer': {
                height: 44,
                gap: 6
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                height: 2,
                borderRadius: 999
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      minWidth: 0
                    }}
                  >
                    <Typography
                      variant="inherit"
                      sx={{
                        flex: 1,
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label}
                    </Typography>
                    {tab.closable && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTabClose(tab.id);
                        }}
                        sx={{
                          ml: 0.5,
                          color: alpha(theme.palette.text.secondary, 0.8),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.14),
                            color: theme.palette.primary.light
                          }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                }
                sx={{
                  minHeight: 44,
                  height: 44,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: tab.id === activeTab ? theme.palette.primary.light : alpha(theme.palette.text.secondary, 0.78),
                  borderRadius: 1.5,
                  px: 1.5,
                  minWidth: 140,
                  bgcolor: tab.id === activeTab
                    ? alpha(theme.palette.primary.main, 0.24)
                    : alpha(theme.palette.common.white, 0.04),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.18)
                  }
                }}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.75 : 0.94) }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Box
                key={tab.id}
                role="tabpanel"
                hidden={!isActive}
                sx={{
                  height: '100%',
                  display: isActive ? 'flex' : 'none',
                  flexDirection: 'column',
                  minHeight: 0
                }}
              >
                {tab.id === 'objects' ? (
                  <DatabaseObjectsView
                    key={`objects-${selectedDatabase ?? 'none'}`}
                    database={selectedDatabase}
                    onOpenTable={handleOpenTableFromObjects}
                    onAction={handleObjectsAction}
                  />
                ) : (
                  tab.database && tab.table && (
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                      <ExactDataTable database={tab.database} table={tab.table} key={`${tab.database}-${tab.table}`} />
                    </Box>
                  )
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default ExactMainView;
