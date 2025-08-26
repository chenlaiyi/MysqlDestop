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
  CircularProgress
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Storage as DatabaseIcon,
  TableChart as TableIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface SimpleNavigatorProps {
  selectedDatabase?: string | null;
  selectedTable?: string | null;
  onDatabaseSelect: (database: string) => void;
  onTableSelect: (database: string, table: string) => void;
  onRefresh: () => void;
}

const SimpleNavigator: React.FC<SimpleNavigatorProps> = ({
  selectedDatabase,
  selectedTable,
  onDatabaseSelect,
  onTableSelect,
  onRefresh
}) => {
  const [databases, setDatabases] = useState<any[]>([]);
  const [tables, setTables] = useState<{ [key: string]: any[] }>({});
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDatabases = async () => {
    setLoading(true);
    try {
      // 使用存储的连接配置重新连接并获取数据库列表
      const connections = await window.mysqlApi.getConnections();
      if (connections && connections.length > 0) {
        const config = connections[0]; // 使用第一个连接配置
        const result = await window.mysqlApi.connect(config);
        if (result.success) {
          setDatabases(result.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (dbName: string) => {
    try {
      const result = await window.mysqlApi.getTables(dbName);
      if (result.success) {
        setTables(prev => ({ ...prev, [dbName]: result.data || [] }));
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  };

  useEffect(() => {
    loadDatabases();
  }, []);

  const toggleDatabase = async (dbName: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (expandedDatabases.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
      if (!tables[dbName]) {
        await loadTables(dbName);
      }
    }
    setExpandedDatabases(newExpanded);
    onDatabaseSelect(dbName);
  };

  const handleTableSelect = (database: string, table: string) => {
    onTableSelect(database, table);
  };

  const filteredDatabases = databases.filter(db => 
    db.Database?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      bgcolor: '#2B3A4A',
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
        {loading ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100px'
          }}>
            <CircularProgress sx={{ color: '#4A90E2' }} size={24} />
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
};

export default SimpleNavigator;
