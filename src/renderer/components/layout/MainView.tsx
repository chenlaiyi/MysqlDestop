import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CloseRounded as CloseIcon
} from '@mui/icons-material';
import SimpleNavigator from './Navigator';
import ExactDataTable from '../data/DataTable';
import DatabaseObjectsView, { ObjectActionKey } from '../panels/DatabaseObjectsView';
import { ConnectionProfile } from '../../types';

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

const NAVIGATOR_WIDTH = 260;

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
    { id: 'objects', label: '对象浏览器', closable: false }
  ]);
  const [activeTab, setActiveTab] = useState('objects');

  useEffect(() => {
    if (!connected) {
      setSelectedDatabase(null);
      setSelectedTable(null);
      setTabs([{ id: 'objects', label: '对象浏览器', closable: false }]);
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

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        bgcolor: 'background.default'
      }}
    >
      {/* 左侧导航栏 */}
      <Box
        sx={{
          width: NAVIGATOR_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
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

      {/* 右侧主内容区 */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* 标签栏 */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            px: 1
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              '& .MuiTabs-flexContainer': { height: 40 },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
                height: 2
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                      {tab.label}
                    </Typography>
                    {tab.closable && (
                      <Tooltip title="关闭">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTabClose(tab.id);
                          }}
                          sx={{
                            p: 0.25,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
                sx={{
                  minHeight: 40,
                  textTransform: 'none',
                  fontWeight: tab.id === activeTab ? 600 : 400,
                  px: 1.5,
                  minWidth: 'auto'
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* 内容区 */}
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                  flexDirection: 'column'
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
                    <ExactDataTable
                      database={tab.database}
                      table={tab.table}
                      key={`${tab.database}-${tab.table}`}
                    />
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
