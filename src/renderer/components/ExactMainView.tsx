import React, { useState, useEffect } from 'react';
import { Box, Tab, Tabs, Typography, Paper, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import SimpleNavigator from './SimpleNavigator';
import ExactDataTable from './ExactDataTable';

interface ExactMainViewProps {
  databases: any[];
  onDatabaseChange?: (database: string) => void;
  onTableChange?: (table: string) => void;
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
  onDatabaseChange, 
  onTableChange 
}) => {
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tabs, setTabs] = useState<TabInfo[]>([
    { id: 'welcome', label: '开始页', closable: false }
  ]);
  const [activeTab, setActiveTab] = useState('welcome');

  const handleDatabaseSelect = (database: string) => {
    setSelectedDatabase(database);
    onDatabaseChange?.(database);
  };

  const handleTableSelect = (database: string, table: string) => {
    setSelectedDatabase(database);
    setSelectedTable(table);
    onDatabaseChange?.(database);
    onTableChange?.(table);

    // 创建新的标签页
    const tabId = `${database}.${table}`;
    const existingTab = tabs.find(tab => tab.id === tabId);
    
    if (!existingTab) {
      const newTab: TabInfo = {
        id: tabId,
        label: table,
        database,
        table,
        closable: true
      };
      setTabs(prev => [...prev, newTab]);
    }
    
    setActiveTab(tabId);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    const tab = tabs.find(t => t.id === newValue);
    if (tab && tab.database && tab.table) {
      setSelectedDatabase(tab.database);
      setSelectedTable(tab.table);
      onDatabaseChange?.(tab.database);
      onTableChange?.(tab.table);
    }
  };

  const handleTabClose = (tabId: string) => {
    const tabToClose = tabs.find(tab => tab.id === tabId);
    if (!tabToClose || !tabToClose.closable) return;

    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTab === tabId) {
      const newActiveTab = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'welcome';
      setActiveTab(newActiveTab);
      
      const newTab = newTabs.find(t => t.id === newActiveTab);
      if (newTab && newTab.database && newTab.table) {
        setSelectedDatabase(newTab.database);
        setSelectedTable(newTab.table);
        onDatabaseChange?.(newTab.database);
        onTableChange?.(newTab.table);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex',
      bgcolor: '#2E2E2E',
      overflow: 'hidden'
    }}>
      {/* 左侧导航面板 */}
      <Box sx={{ 
        width: 280, 
        height: '100%',
        bgcolor: '#2B3A4A',
        borderRight: '1px solid #555555',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <SimpleNavigator
          selectedDatabase={selectedDatabase}
          selectedTable={selectedTable}
          onDatabaseSelect={handleDatabaseSelect}
          onTableSelect={handleTableSelect}
          onRefresh={handleRefresh}
          key={refreshKey}
        />
      </Box>

      {/* 右侧内容区域 */}
      <Box sx={{ 
        flex: 1, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#2E2E2E'
      }}>
        {/* 标签栏 */}
        <Box sx={{
          borderBottom: '1px solid #555555',
          bgcolor: '#2E2E2E',
          minHeight: 36
        }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              '& .MuiTabs-flexContainer': {
                height: 36
              },
              '& .MuiTab-root': {
                minHeight: 36,
                height: 36,
                color: '#CCCCCC',
                fontSize: '0.8rem',
                textTransform: 'none',
                minWidth: 120,
                maxWidth: 200,
                px: 1,
                '&.Mui-selected': {
                  color: '#ffffff',
                  bgcolor: '#3E3E3E'
                },
                '&:hover': {
                  bgcolor: '#3A3A3A'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4A90E2',
                height: 2
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    width: '100%',
                    minWidth: 0
                  }}>
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
                          color: 'inherit',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* 标签页内容 */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {tabs.map((tab) => (
            <Box
              key={tab.id}
              hidden={activeTab !== tab.id}
              sx={{ height: '100%', overflow: 'hidden' }}
            >
              {tab.id === 'welcome' ? (
                <Box sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#2E2E2E'
                }}>
                  <Typography variant="h6" sx={{ color: '#CCCCCC' }}>
                    选择一个表开始查看数据
                  </Typography>
                </Box>
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
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ExactMainView;
