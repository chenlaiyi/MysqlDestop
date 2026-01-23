import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  LinkRounded as ConnectIcon,
  PostAddRounded as NewQueryIcon,
  TableChartRounded as TableIcon,
  ViewListRounded as ViewIcon,
  FunctionsRounded as FunctionIcon,
  PeopleRounded as UserIcon,
  HelpOutlineRounded as OtherIcon,
  SearchRounded as QueryIcon,
  BackupRounded as BackupIcon,
  SmartToyRounded as AutoRunIcon,
  BarChartRounded as ChartIcon,
  InsightsRounded as ModelIcon,
  CloseRounded as CloseIcon,
  CodeRounded as SqlIcon,
  EventRounded as EventIcon
} from '@mui/icons-material';
import ConnectionSidebar from './components/layout/ConnectionSidebar';
import NewNavicatConnectionDialog, { NavicatConnectionPayload } from './components/dialogs/ConnectionDialog';
import ThemeToggleButton from './components/common/ThemeToggleButton';
import ExactDataTable from './components/data/DataTable';
import QueryEditor from './components/editor/QueryEditor';
import TablesOverview from './components/panels/TablesOverview';
import ViewsPanel from './components/panels/ViewsPanel';
import FunctionsPanel from './components/panels/FunctionsPanel';
import EventsPanel from './components/panels/EventsPanel';
import { ConnectionProfile } from './types';
import { useTheme } from './theme/ThemeProvider';

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

const TOOLBAR_HEIGHT = 70;
const SIDEBAR_WIDTH = 200;

interface TabItem {
  id: string;
  type: 'table' | 'query' | 'tables-overview' | 'views-panel' | 'functions-panel' | 'events-panel';
  label: string;
  database: string;
  table?: string;  // 仅 table 类型需要
}

let queryCounter = 0;

const App: React.FC = () => {
  const muiTheme = useMuiTheme();
  const { isDark } = useTheme();
  const [savedProfiles, setSavedProfiles] = useState<ConnectionProfile[]>([]);
  const [connectedProfile, setConnectedProfile] = useState<ConnectionProfile | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProfileId, setConnectingProfileId] = useState<string | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionDialogMode, setConnectionDialogMode] = useState<'create' | 'edit'>('create');
  const [connectionDialogProfile, setConnectionDialogProfile] = useState<ConnectionProfile | null>(null);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

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
        setSelectedDatabase(null);
        setSelectedTable(null);

        const updatedProfile: ConnectionProfile = { ...profile, lastUsed: new Date() };
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
      alert(`连接失败: ${error?.message || error}`);
    } finally {
      setIsConnecting(false);
      setConnectingProfileId(null);
    }
  };

  const handleDisconnect = () => {
    setConnectedProfile(null);
    setDatabases([]);
    setSelectedDatabase(null);
    setSelectedTable(null);
    setTabs([]);
    setActiveTabId(null);
  };

  const handleRefreshDatabases = async () => {
    if (!connectedProfile) return;
    try {
      const config = {
        host: connectedProfile.host,
        port: connectedProfile.port,
        user: connectedProfile.username,
        password: connectedProfile.password,
        database: connectedProfile.database,
        ssl: connectedProfile.ssl
      };
      const result = await window.mysqlApi.connect(config);
      if (result.success) {
        const dbList = (result.data || []).map((row: any) => row.Database || row.database || row);
        setDatabases(dbList);
      }
    } catch (error) {
      console.error('刷新数据库列表失败:', error);
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
      handleDisconnect();
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

  const handleDatabaseSelect = (database: string) => {
    setSelectedDatabase(database);
    setSelectedTable(null);
  };

  const handleTableSelect = (database: string, table: string) => {
    setSelectedDatabase(database);
    setSelectedTable(table);

    // 添加或激活标签页
    const tabId = `table:${database}.${table}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (!existingTab) {
      setTabs(prev => [...prev, { id: tabId, type: 'table', label: table, database, table }]);
    }
    setActiveTabId(tabId);
  };

  const handleViewSelect = (database: string, view: string) => {
    setSelectedDatabase(database);

    // 视图也使用 DataTable 展示，类型为 'table'
    const tabId = `view:${database}.${view}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (!existingTab) {
      setTabs(prev => [...prev, { id: tabId, type: 'table', label: `${view} (视图)`, database, table: view }]);
    }
    setActiveTabId(tabId);
  };

  // 新建查询标签页
  const handleNewQuery = () => {
    if (!connectedProfile) {
      alert('请先连接数据库');
      return;
    }
    queryCounter++;
    const tabId = `query:${queryCounter}`;
    const db = selectedDatabase || databases[0] || '';
    setTabs(prev => [...prev, { id: tabId, type: 'query', label: `查询 ${queryCounter}`, database: db }]);
    setActiveTabId(tabId);
  };

  // 打开表管理面板
  const handleOpenTablesPanel = () => {
    if (!connectedProfile) {
      alert('请先连接数据库');
      return;
    }
    const db = selectedDatabase || databases[0] || '';
    if (!db) {
      alert('请先选择数据库');
      return;
    }
    const tabId = `tables-overview:${db}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (!existingTab) {
      setTabs(prev => [...prev, { id: tabId, type: 'tables-overview', label: `表 - ${db}`, database: db }]);
    }
    setActiveTabId(tabId);
  };

  // 打开视图管理面板
  const handleOpenViewsPanel = () => {
    if (!connectedProfile) {
      alert('请先连接数据库');
      return;
    }
    const db = selectedDatabase || databases[0] || '';
    if (!db) {
      alert('请先选择数据库');
      return;
    }
    const tabId = `views-panel:${db}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (!existingTab) {
      setTabs(prev => [...prev, { id: tabId, type: 'views-panel', label: `视图 - ${db}`, database: db }]);
    }
    setActiveTabId(tabId);
  };

  // 打开函数管理面板
  const handleOpenFunctionsPanel = () => {
    if (!connectedProfile) {
      alert('请先连接数据库');
      return;
    }
    const db = selectedDatabase || databases[0] || '';
    if (!db) {
      alert('请先选择数据库');
      return;
    }
    const tabId = `functions-panel:${db}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (!existingTab) {
      setTabs(prev => [...prev, { id: tabId, type: 'functions-panel', label: `函数 - ${db}`, database: db }]);
    }
    setActiveTabId(tabId);
  };

  // 打开事件管理面板
  const handleOpenEventsPanel = () => {
    if (!connectedProfile) {
      alert('请先连接数据库');
      return;
    }
    const db = selectedDatabase || databases[0] || '';
    if (!db) {
      alert('请先选择数据库');
      return;
    }
    const tabId = `events-panel:${db}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (!existingTab) {
      setTabs(prev => [...prev, { id: tabId, type: 'events-panel', label: `事件 - ${db}`, database: db }]);
    }
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  const handleOpenTableFromObjects = (tableName: string) => {
    if (selectedDatabase) {
      handleTableSelect(selectedDatabase, tableName);
    }
  };

  const sortedProfiles = useMemo(() => {
    return [...savedProfiles].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      const aTime = a.lastUsed?.getTime() ?? 0;
      const bTime = b.lastUsed?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [savedProfiles]);

  // 工具栏按钮
  const toolbarButtons = [
    { icon: <ConnectIcon />, label: '连接', onClick: openCreateConnectionDialog, color: '#666' },
    { icon: <NewQueryIcon />, label: '新建查询', onClick: handleNewQuery, color: '#e74c3c' },
    { icon: <TableIcon />, label: '表', onClick: handleOpenTablesPanel, color: '#3498db' },
    { icon: <ViewIcon />, label: '视图', onClick: handleOpenViewsPanel, color: '#9b59b6' },
    { icon: <FunctionIcon />, label: '函数', onClick: handleOpenFunctionsPanel, color: '#e67e22' },
    { icon: <EventIcon />, label: '事件', onClick: handleOpenEventsPanel, color: '#1abc9c' },
    { icon: <QueryIcon />, label: '查询', onClick: handleNewQuery, color: '#f39c12' },
    { icon: <BackupIcon />, label: '备份', onClick: () => {}, color: '#27ae60' },
    { icon: <AutoRunIcon />, label: '自动运行', onClick: () => {}, color: '#e91e63' },
    { icon: <ModelIcon />, label: '模型', onClick: () => {}, color: '#00bcd4' },
    { icon: <ChartIcon />, label: '图表', onClick: () => {}, color: '#673ab7' },
  ];

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* 顶部工具栏 */}
      <Box
        sx={{
          height: TOOLBAR_HEIGHT,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          px: 1,
          gap: 0.5,
          bgcolor: 'background.paper'
        }}
      >
        {toolbarButtons.map((btn, index) => (
          <Tooltip key={index} title={btn.label}>
            <Box
              onClick={btn.onClick}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                borderRadius: 1,
                minWidth: 50,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Box sx={{ color: btn.color, fontSize: 24 }}>{btn.icon}</Box>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>
                {btn.label}
              </Typography>
            </Box>
          </Tooltip>
        ))}
        <Box sx={{ flex: 1 }} />
        <ThemeToggleButton size="small" />
      </Box>

      {/* 主体区域 */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 左侧连接列表 */}
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }}
        >
          <ConnectionSidebar
            profiles={sortedProfiles}
            activeProfile={connectedProfile}
            databases={databases}
            selectedDatabase={selectedDatabase}
            selectedTable={selectedTable}
            isConnecting={isConnecting}
            connectingProfileId={connectingProfileId}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onNewConnection={openCreateConnectionDialog}
            onEditConnection={openEditConnectionDialog}
            onDeleteConnection={handleDeleteProfile}
            onToggleFavorite={handleToggleFavorite}
            onDatabaseSelect={handleDatabaseSelect}
            onTableSelect={handleTableSelect}
            onViewSelect={handleViewSelect}
            onRefreshDatabases={handleRefreshDatabases}
          />
        </Box>

        {/* 右侧内容区 */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          {/* 标签栏 - 只在有打开的标签时显示 */}
          {tabs.length > 0 && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Tabs
                value={activeTabId || false}
                onChange={(_, val) => setActiveTabId(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 36, '& .MuiTabs-indicator': { height: 2 } }}
              >
                {tabs.map((tab) => (
                  <Tab
                    key={tab.id}
                    value={tab.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {tab.type === 'query' ? (
                          <SqlIcon sx={{ fontSize: 14 }} />
                        ) : tab.type === 'tables-overview' ? (
                          <TableIcon sx={{ fontSize: 14 }} />
                        ) : tab.type === 'views-panel' ? (
                          <ViewIcon sx={{ fontSize: 14 }} />
                        ) : tab.type === 'functions-panel' ? (
                          <FunctionIcon sx={{ fontSize: 14 }} />
                        ) : tab.type === 'events-panel' ? (
                          <EventIcon sx={{ fontSize: 14 }} />
                        ) : (
                          <TableIcon sx={{ fontSize: 14 }} />
                        )}
                        <span>{tab.label}</span>
                        <CloseIcon
                          sx={{ fontSize: 14, ml: 0.5, '&:hover': { color: 'error.main' } }}
                          onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                        />
                      </Box>
                    }
                    sx={{ minHeight: 36, textTransform: 'none', fontSize: 13 }}
                  />
                ))}
              </Tabs>
            </Box>
          )}

          {/* 内容区 */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {activeTabId && activeTab ? (
              activeTab.type === 'query' ? (
                <QueryEditor database={activeTab.database} isDark={isDark} />
              ) : activeTab.type === 'tables-overview' ? (
                <TablesOverview
                  database={activeTab.database}
                  tables={[]}
                  onTableSelect={(tableName) => handleTableSelect(activeTab.database, tableName)}
                  onRefresh={() => {}}
                />
              ) : activeTab.type === 'views-panel' ? (
                <ViewsPanel database={activeTab.database} />
              ) : activeTab.type === 'functions-panel' ? (
                <FunctionsPanel database={activeTab.database} />
              ) : activeTab.type === 'events-panel' ? (
                <EventsPanel database={activeTab.database} />
              ) : (
                <ExactDataTable database={activeTab.database} table={activeTab.table!} />
              )
            ) : (
              <Box sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary'
              }}>
                <Typography variant="body2">
                  {connectedProfile ? '请在左侧选择表，或点击"新建查询"' : '请双击左侧连接以打开数据库'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
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
