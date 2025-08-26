import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TableChart as TableIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface TableInfo {
  name: string;
  engine?: string;
  rows?: number;
  data_length?: number;
  index_length?: number;
  auto_increment?: number;
  create_time?: string;
  update_time?: string;
  table_comment?: string;
}

interface TablesOverviewProps {
  database: string;
  tables: TableInfo[];
  onTableSelect: (tableName: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

function TablesOverview({ 
  database, 
  tables, 
  onTableSelect, 
  onRefresh,
  loading = false 
}: TablesOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [detailedTables, setDetailedTables] = useState<TableInfo[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const filteredTables = detailedTables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (table.table_comment && table.table_comment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 获取表的详细信息
  useEffect(() => {
    const fetchTableDetails = async () => {
      if (!database || tables.length === 0) return;
      
      setLoadingDetails(true);
      try {
        // 调用API获取表的详细信息
        const result = await window.mysqlApi.getTableDetails(database);
        if (result.success) {
          setDetailedTables(result.data || []);
        } else {
          setDetailedTables(tables);
        }
      } catch (error) {
        console.error('获取表详细信息失败:', error);
        setDetailedTables(tables);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchTableDetails();
  }, [database, tables]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部区域 */}
      <Box sx={{ 
        p: 2,
        borderBottom: '1px solid #e3e8ee',
        bgcolor: '#f8f9fa'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableIcon sx={{ color: '#3498db', fontSize: 20 }} />
            <Typography variant="h6" sx={{ 
              color: '#2c3e50',
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              {database} - 表概览
            </Typography>
            <Chip 
              label={`${filteredTables.length} 个表`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: '#e3e8ee',
                color: '#7f8c8d',
                bgcolor: '#ffffff',
                fontSize: '0.65rem',
                height: 20
              }}
            />
          </Box>
          
          <Tooltip title="刷新表信息">
            <IconButton 
              onClick={onRefresh}
              size="small"
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e3e8ee',
                padding: '4px',
                '&:hover': {
                  bgcolor: '#ecf0f1',
                  transform: 'rotate(180deg)',
                  borderColor: '#3498db'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        
        <TextField
          fullWidth
          size="small"
          placeholder="搜索表名或注释..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#bdc3c7', fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#ffffff',
              borderRadius: 2,
              fontSize: '0.75rem',
              '& fieldset': {
                borderColor: '#e3e8ee'
              },
              '&:hover fieldset': {
                borderColor: '#3498db'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#3498db',
                borderWidth: 1
              }
            },
            '& .MuiInputBase-input': {
              padding: '6px 8px',
              fontSize: '0.75rem'
            }
          }}
        />
      </Box>

      {/* 表格区域 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {loading || loadingDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        ) : filteredTables.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchTerm ? `未找到匹配 "${searchTerm}" 的表` : '该数据库中没有表'}
          </Alert>
        ) : (
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Table size="small" sx={{
              '& .MuiTableCell-root': {
                fontSize: '0.55rem',
                padding: '4px 8px',
                lineHeight: 1.1
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                backgroundColor: '#f8f9fa',
                color: '#2c3e50',
                fontWeight: 600,
                borderBottom: '2px solid #e3e8ee',
                fontSize: '0.8rem', // 表头字体再大一些
                padding: '10px 8px', // 表头再增加一些内边距
                height: 36 // 表头高度再增加
              },
              '& .MuiTableBody-root .MuiTableRow-root': {
                height: 28,
                minHeight: 28,
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer'
                }
              },
              '& .MuiTableBody-root .MuiTableCell-root': {
                padding: '1px 8px',
                borderBottom: '1px solid rgba(224, 224, 224, 0.3)',
                lineHeight: 1.0
              }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>表名</TableCell>
                  <TableCell>引擎</TableCell>
                  <TableCell align="right">行数</TableCell>
                  <TableCell align="right">数据大小</TableCell>
                  <TableCell align="right">索引大小</TableCell>
                  <TableCell align="right">自增值</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>注释</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTables.map((table) => (
                  <TableRow 
                    key={table.name}
                    onClick={() => onTableSelect(table.name)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TableIcon sx={{ color: '#3498db', fontSize: 12 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.55rem' }}>
                          {table.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={table.engine || 'Unknown'}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.5rem',
                          height: 16,
                          borderColor: table.engine === 'InnoDB' ? '#27ae60' : '#95a5a6',
                          color: table.engine === 'InnoDB' ? '#27ae60' : '#95a5a6',
                          '& .MuiChip-label': {
                            padding: '0 4px'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.55rem' }}>
                        {table.rows !== undefined ? formatNumber(table.rows) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.55rem' }}>
                        {table.data_length !== undefined ? formatFileSize(table.data_length) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.55rem' }}>
                        {table.index_length !== undefined ? formatFileSize(table.index_length) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.55rem' }}>
                        {table.auto_increment !== undefined ? table.auto_increment : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.5rem' }}>
                        {formatDate(table.create_time || '')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.5rem',
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={table.table_comment}
                      >
                        {table.table_comment || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.2 }}>
                        <Tooltip title="查看数据">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTableSelect(table.name);
                            }}
                            sx={{ color: '#3498db', padding: '2px' }}
                          >
                            <ViewIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑结构">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: 实现编辑表结构功能
                            }}
                            sx={{ color: '#f39c12', padding: '2px' }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除表">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: 实现删除表功能
                            }}
                            sx={{ color: '#e74c3c', padding: '2px' }}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}

export default TablesOverview;
