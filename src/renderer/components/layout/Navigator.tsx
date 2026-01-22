import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  StorageRounded as DatabaseIcon,
  TableChartRounded as TableIcon,
  SearchRounded as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  RefreshRounded as RefreshIcon
} from '@mui/icons-material';
import { ConnectionProfile } from '../../types';

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

const SimpleNavigator: React.FC<SimpleNavigatorProps> = ({
  activeProfile,
  connected,
  isConnecting,
  databases: propDatabases = [],
  selectedDatabase,
  selectedTable,
  onDatabaseSelect,
  onTableSelect,
  onRefresh
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

  if (!connected) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {isConnecting ? '正在连接...' : '请先连接数据库'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部：连接信息和刷新按钮 */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>
            {activeProfile?.name || '数据库'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {databases.length} 个数据库
          </Typography>
        </Box>
        <Tooltip title="刷新">
          <IconButton size="small" onClick={onRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 搜索框 */}
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索数据库..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'action.hover'
            }
          }}
        />
      </Box>

      {/* 数据库列表 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense disablePadding>
          {filteredDatabases.map((database) => {
            const isExpanded = expandedDatabases.has(database);
            const isSelected = selectedDatabase === database;
            const databaseTables = tables[database] || [];

            return (
              <Box key={database}>
                <ListItemButton
                  onClick={() => toggleDatabase(database)}
                  selected={isSelected && !selectedTable}
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {isExpanded ? (
                      <ExpandMoreIcon fontSize="small" />
                    ) : (
                      <ChevronRightIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <DatabaseIcon
                      fontSize="small"
                      color={isSelected ? 'primary' : 'action'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={database}
                    primaryTypographyProps={{
                      variant: 'body2',
                      noWrap: true,
                      fontWeight: isSelected ? 600 : 400
                    }}
                  />
                  {loadingTablesFor === database && (
                    <CircularProgress size={14} />
                  )}
                </ListItemButton>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List dense disablePadding sx={{ pl: 4 }}>
                    {databaseTables.map((table) => {
                      const isTableSelected = selectedDatabase === database && selectedTable === table;
                      return (
                        <ListItemButton
                          key={table}
                          onClick={() => onTableSelect(database, table)}
                          selected={isTableSelected}
                          sx={{ py: 0.25 }}
                        >
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <TableIcon
                              fontSize="small"
                              color={isTableSelected ? 'primary' : 'action'}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={table}
                            primaryTypographyProps={{
                              variant: 'body2',
                              noWrap: true,
                              fontWeight: isTableSelected ? 600 : 400
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                    {databaseTables.length === 0 && !loadingTablesFor && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ pl: 4, py: 1, display: 'block' }}
                      >
                        无表
                      </Typography>
                    )}
                  </List>
                </Collapse>
              </Box>
            );
          })}

          {filteredDatabases.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 2, textAlign: 'center' }}
            >
              {searchTerm ? '无匹配结果' : '无数据库'}
            </Typography>
          )}
        </List>
      </Box>
    </Box>
  );
};

export default SimpleNavigator;
