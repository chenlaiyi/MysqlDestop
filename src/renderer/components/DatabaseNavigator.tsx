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
      width: 280, 
      height: '100%', 
      bgcolor: '#ffffff',
      borderRight: 1,
      borderColor: '#e0e0e0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: '#e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <StorageIcon sx={{ color: '#1976d2' }} />
          <Typography variant="h6" sx={{ flex: 1, color: '#000000' }}>
            {t('navigator.databases')}
          </Typography>
          <IconButton 
            size="small" 
            onClick={onRefresh}
            sx={{ 
              color: '#666666',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <TextField
          size="small"
          fullWidth
          placeholder={t('navigator.searchDatabases')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#666666' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: '#e0e0e0',
              },
              '&:hover fieldset': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
              },
            },
            '& .MuiInputBase-input': {
              color: '#000000',
            }
          }}
        />
      </Box>

      {/* Database List */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#ffffff' }}>
        <List dense disablePadding>
          {filteredDatabases.map((db) => {
            const dbName = db.Database;
            const isExpanded = expandedDatabases.has(dbName);
            const dbTables = tables[dbName] || [];
            
            return (
              <React.Fragment key={dbName}>
                {/* Database Header */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => toggleDatabase(dbName)}
                    selected={selectedDatabase === dbName && !selectedTable}
                    sx={{
                      pl: 2,
                      bgcolor: selectedDatabase === dbName && !selectedTable ? '#e3f2fd' : 'transparent',
                      '&:hover': {
                        bgcolor: '#f5f5f5'
                      },
                      '&.Mui-selected': {
                        bgcolor: '#e3f2fd',
                        '&:hover': {
                          bgcolor: '#e3f2fd'
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <DatabaseIcon 
                        fontSize="small" 
                        sx={{ 
                          color: selectedDatabase === dbName ? '#1976d2' : '#666666' 
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={dbName}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: selectedDatabase === dbName ? 'medium' : 'normal',
                        color: '#000000'
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isExpanded ? 
                        <ExpandLess fontSize="small" sx={{ color: '#666666' }} /> : 
                        <ExpandMore fontSize="small" sx={{ color: '#666666' }} />
                      }
                    </Box>
                  </ListItemButton>
                </ListItem>

                {/* Database Features */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {DATABASE_FEATURES.map((feature) => {
                      const featureKey = `${dbName}-${feature.key}`;
                      const isFeatureExpanded = expandedFeatures.has(featureKey);
                      const FeatureIcon = feature.icon;
                      
                      return (
                        <React.Fragment key={feature.key}>
                          {/* Feature Category */}
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => {
                                if (feature.key === 'tables') {
                                  toggleFeature(featureKey);
                                } else {
                                  handleFeatureClick(dbName, feature.key);
                                }
                              }}
                              sx={{
                                pl: 4,
                                py: 0.5,
                                '&:hover': {
                                  bgcolor: 'action.hover'
                                }
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <FeatureIcon 
                                  fontSize="small" 
                                  color={feature.color as any}
                                />
                              </ListItemIcon>
                              <ListItemText 
                                primary={feature.label}
                                primaryTypographyProps={{
                                  fontSize: '0.8rem'
                                }}
                              />
                              {feature.key === 'tables' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {dbTables.length > 0 && (
                                    <Chip 
                                      label={dbTables.length} 
                                      size="small" 
                                      variant="outlined"
                                      sx={{ height: 18, fontSize: '0.7rem' }}
                                    />
                                  )}
                                  {isFeatureExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                </Box>
                              )}
                            </ListItemButton>
                          </ListItem>

                          {/* Tables List (only for tables feature) */}
                          {feature.key === 'tables' && (
                            <Collapse in={isFeatureExpanded} timeout="auto" unmountOnExit>
                              <List component="div" disablePadding>
                                {dbTables.map((table, index) => {
                                  const tableName = table.name || table[Object.keys(table)[0]];
                                  const isSelected = selectedDatabase === dbName && selectedTable === tableName;
                                  
                                  return (
                                    <ListItem key={index} disablePadding>
                                      <ListItemButton
                                        onClick={() => handleTableSelect(dbName, tableName)}
                                        selected={isSelected}
                                        sx={{
                                          pl: 6,
                                          py: 0.25,
                                          bgcolor: isSelected ? 'action.selected' : 'transparent',
                                          '&:hover': {
                                            bgcolor: 'action.hover'
                                          }
                                        }}
                                      >
                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                          <TableIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary={tableName}
                                          primaryTypographyProps={{
                                            fontSize: '0.75rem',
                                            color: isSelected ? 'primary.main' : 'text.primary'
                                          }}
                                        />
                                        {table.rowCount !== undefined && (
                                          <Chip 
                                            label={table.rowCount} 
                                            size="small" 
                                            variant="outlined"
                                            sx={{ height: 16, fontSize: '0.65rem' }}
                                          />
                                        )}
                                      </ListItemButton>
                                    </ListItem>
                                  );
                                })}
                              </List>
                            </Collapse>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}

export default DatabaseNavigator;
