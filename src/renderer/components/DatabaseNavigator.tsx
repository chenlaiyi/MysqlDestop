import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  Chip
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  TableChart as TableIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Functions as FunctionIcon,
  Event as EventIcon,
  Code as QueryIcon,
  Backup as BackupIcon
} from '@mui/icons-material';
import { t } from '../i18n';

interface DatabaseNavigatorProps {
  databases: any[];
  selectedDatabase: string | null;
  selectedTable: string | null;
  tables: { [key: string]: any[] };
  onDatabaseSelect: (dbName: string) => void;
  onTableSelect: (dbName: string, tableName: string) => void;
  onDatabaseFeatureSelect?: (dbName: string, feature: string) => void;
  onRefresh: () => void;
}

// Database feature categories
const DATABASE_FEATURES = [
  { key: 'tables', icon: TableIcon, label: '表', color: 'primary' },
  { key: 'views', icon: ViewIcon, label: '视图', color: 'secondary' },
  { key: 'functions', icon: FunctionIcon, label: '函数', color: 'success' },
  { key: 'events', icon: EventIcon, label: '事件', color: 'warning' },
  { key: 'queries', icon: QueryIcon, label: '查询', color: 'info' },
  { key: 'backup', icon: BackupIcon, label: '备份', color: 'error' }
] as const;

function DatabaseNavigator({
  databases,
  selectedDatabase,
  selectedTable,
  tables,
  onDatabaseSelect,
  onTableSelect,
  onDatabaseFeatureSelect,
  onRefresh
}: DatabaseNavigatorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const filteredDatabases = databases.filter(db =>
    db.Database.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleDatabase = (dbName: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
    }
    setExpandedDatabases(newExpanded);
    onDatabaseSelect(dbName);
  };

  const toggleFeature = (featureKey: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureKey)) {
      newExpanded.delete(featureKey);
    } else {
      newExpanded.add(featureKey);
    }
    setExpandedFeatures(newExpanded);
  };

  const handleFeatureClick = (dbName: string, feature: string) => {
    if (onDatabaseFeatureSelect) {
      onDatabaseFeatureSelect(dbName, feature);
    }
  };

  const handleTableSelect = (dbName: string, tableName: string) => {
    onTableSelect(dbName, tableName);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      bgcolor: '#2B3A4A',  // 深蓝色背景
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #555555'
    }}>
      {/* 搜索框区域 */}
      <Box sx={{ 
        p: 1.5, 
        borderBottom: '1px solid #555555',
      }}>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索数据库..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#CCCCCC' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#3E3E3E',
              borderRadius: 1,
              height: 28,
              '& fieldset': {
                borderColor: '#555555',
              },
              '&:hover fieldset': {
                borderColor: '#4A90E2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#4A90E2',
                borderWidth: 1
              },
            },
            '& .MuiInputBase-input': {
              color: '#ffffff',
              fontSize: '0.8rem',
              padding: '4px 8px'
            }
          }}
        />
      </Box>

      {/* 数据库列表 */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: 4
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: '#2B3A4A'
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#555555',
          borderRadius: 2,
          '&:hover': {
            bgcolor: '#666666'
          }
        }
      }}>
        {filteredDatabases.length === 0 ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            px: 2,
            textAlign: 'center'
          }}>
            <StorageIcon sx={{ fontSize: 32, color: '#666666', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#CCCCCC' }}>
              暂无数据库
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
          {filteredDatabases.map((db) => {
            const dbName = db.Database;
            const isExpanded = expandedDatabases.has(dbName);
            const dbTables = tables[dbName] || [];
            const isDatabaseSelected = selectedDatabase === dbName;
            
            return (
              <React.Fragment key={dbName}>
                {/* 数据库节点 */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => toggleDatabase(dbName)}
                    selected={isDatabaseSelected && !selectedTable}
                    sx={{
                      py: 0.5,
                      px: 1.5,
                      minHeight: 24,
                      '&:hover': {
                        bgcolor: '#3A4A5A',
                      },
                      '&.Mui-selected': {
                        bgcolor: '#4A90E2',
                        '&:hover': {
                          bgcolor: '#357ABD'
                        }
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24, mr: 0.5 }}>
                      <DatabaseIcon 
                        fontSize="small" 
                        sx={{ 
                          color: isDatabaseSelected ? '#ffffff' : '#4A90E2',
                          fontSize: 14
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={dbName}
                      primaryTypographyProps={{
                        fontSize: '0.8rem',
                        fontWeight: isDatabaseSelected ? 500 : 400,
                        color: isDatabaseSelected ? '#ffffff' : '#ffffff'
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isExpanded ? 
                        <ExpandLess 
                          fontSize="small" 
                          sx={{ 
                            color: isDatabaseSelected ? '#ffffff' : '#CCCCCC',
                            fontSize: 14
                          }} 
                        /> : 
                        <ExpandMore 
                          fontSize="small" 
                          sx={{ 
                            color: isDatabaseSelected ? '#ffffff' : '#CCCCCC',
                            fontSize: 14
                          }} 
                        />
                      }
                    </Box>
                  </ListItemButton>
                </ListItem>

                {/* 表列表 */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {dbTables.map((table, index) => {
                      const tableName = table.Tables_in_1 || table[Object.keys(table)[0]];
                      const isTableSelected = selectedDatabase === dbName && selectedTable === tableName;
                      
                      return (
                        <ListItem key={index} disablePadding>
                          <ListItemButton
                            onClick={() => handleTableSelect(dbName, tableName)}
                            selected={isTableSelected}
                            sx={{
                              py: 0.25,
                              px: 1,
                              ml: 2.5,
                              minHeight: 20,
                              '&:hover': {
                                bgcolor: '#3A4A5A',
                              },
                              '&.Mui-selected': {
                                bgcolor: '#357ABD',
                                '&:hover': {
                                  bgcolor: '#2E6AA8'
                                }
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 20, mr: 0.5 }}>
                              <TableIcon 
                                fontSize="small" 
                                sx={{ 
                                  color: isTableSelected ? '#ffffff' : '#4A90E2',
                                  fontSize: 12
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText 
                              primary={tableName}
                              primaryTypographyProps={{
                                fontSize: '0.75rem',
                                fontWeight: isTableSelected ? 500 : 400,
                                color: isTableSelected ? '#ffffff' : '#ffffff'
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })}
        </List>
        )}
      </Box>
    </Box>
  );
}

export default DatabaseNavigator;
