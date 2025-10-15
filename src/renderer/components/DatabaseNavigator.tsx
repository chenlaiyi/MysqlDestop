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
  Chip,
  Tooltip
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  TableChart as TableIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  LanRounded as LanRoundedIcon,
  Add as AddIcon,
  Edit as EditIcon,
  LinkOff as DisconnectIcon,
  Autorenew as AutorenewIcon
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
      background: 'linear-gradient(180deg, #1b222e 0%, #11151d 100%)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #0d1117'
    }}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid #0d1117'
        }}
      >
        <Tooltip title={t('mainView.toolbar.connection')} arrow>
          <IconButton size="small" sx={{ color: '#6adf9b' }}>
            <LanRoundedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('mainView.toolbar.newQuery')} arrow>
          <IconButton size="small" sx={{ color: '#6fb6ff' }}>
            <AddIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('mainView.toolbar.editConnection', { defaultValue: '编辑连接' })} arrow>
          <IconButton size="small" sx={{ color: '#9aa6c8' }}>
            <EditIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('mainView.toolbar.disconnect', { defaultValue: '断开连接' })} arrow>
          <IconButton size="small" sx={{ color: '#ff7878' }}>
            <DisconnectIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('mainView.toolbar.automation')} arrow>
          <IconButton size="small" sx={{ color: '#6adfff' }}>
            <AutorenewIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={t('tablesOverview.refreshTables')} arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => { void onRefresh(); }}
              sx={{
                bgcolor: '#1f2531',
                color: '#e0e6f6',
                border: '1px solid #2a303b',
                width: 30,
                height: 30,
                '&:hover': {
                  bgcolor: '#2b3445',
                  borderColor: '#4a79c5'
                }
              }}
            >
              <RefreshIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: 4
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: '#151922'
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#2a303b',
          borderRadius: 2,
          '&:hover': {
            bgcolor: '#3a4250'
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
            <StorageIcon sx={{ fontSize: 32, color: '#4a79c5', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#a0a8c0' }}>
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
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => toggleDatabase(dbName)}
                    selected={isDatabaseSelected && !selectedTable}
                    sx={{
                      py: 0.5,
                      px: 1.5,
                      minHeight: 28,
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: '#222937'
                      },
                      '&.Mui-selected': {
                        bgcolor: '#2a3345',
                        '&:hover': {
                          bgcolor: '#323e53'
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24, mr: 0.5 }}>
                      <DatabaseIcon 
                        fontSize="small" 
                        sx={{ 
                          color: isDatabaseSelected ? '#75a5ff' : '#5f7bc2',
                          fontSize: 16
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={dbName}
                      primaryTypographyProps={{
                        fontSize: '0.82rem',
                        fontWeight: isDatabaseSelected ? 600 : 500,
                        color: isDatabaseSelected ? '#eef3ff' : '#c4cada'
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isExpanded ? 
                        <ExpandLess 
                          fontSize="small" 
                          sx={{ 
                            color: isDatabaseSelected ? '#75a5ff' : '#6f7687',
                            fontSize: 18
                          }} 
                        /> : 
                        <ExpandMore 
                          fontSize="small" 
                          sx={{ 
                            color: isDatabaseSelected ? '#75a5ff' : '#6f7687',
                            fontSize: 18
                          }} 
                        />
                      }
                    </Box>
                  </ListItemButton>
                </ListItem>

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
                              py: 0.35,
                              px: 1,
                              ml: 2.5,
                              minHeight: 24,
                              borderRadius: 1,
                              '&:hover': {
                                bgcolor: '#202733'
                              },
                              '&.Mui-selected': {
                                bgcolor: '#273448',
                                '&:hover': {
                                  bgcolor: '#31425a'
                                }
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 20, mr: 0.75 }}>
                              <TableIcon 
                                fontSize="small" 
                                sx={{ 
                                  color: isTableSelected ? '#75a5ff' : '#5f7bc2',
                                  fontSize: 14
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText 
                              primary={tableName}
                              primaryTypographyProps={{
                                fontSize: '0.76rem',
                                fontWeight: isTableSelected ? 600 : 400,
                                color: isTableSelected ? '#eef3ff' : '#c4cada'
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

      <Box sx={{ 
        p: 1.25,
        borderTop: '1px solid #0d1117',
        backgroundColor: '#131722'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="搜索数据库..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#7f8797' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1b1f29',
                borderRadius: 1,
                height: 32,
                '& fieldset': {
                  borderColor: '#2c3240',
                },
                '&:hover fieldset': {
                  borderColor: '#3f8cff',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3f8cff',
                  borderWidth: 1
                },
              },
              '& .MuiInputBase-input': {
                color: '#e9eefc',
                fontSize: '0.8rem',
                padding: '6px 8px'
              }
            }}
          />
          <Tooltip title={t('tablesOverview.refreshTables')}>
            <span>
              <IconButton
                size="small"
                onClick={() => { void onRefresh(); }}
                sx={{
                  bgcolor: '#1b1f29',
                  color: '#e0e6f6',
                  border: '1px solid #2c3240',
                  width: 30,
                  height: 30,
                  '&:hover': {
                    bgcolor: '#253043',
                    borderColor: '#4a79c5'
                  }
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

export default DatabaseNavigator;
