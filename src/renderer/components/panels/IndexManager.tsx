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
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  Storage as IndexIcon
} from '@mui/icons-material';

interface IndexInfo {
  name: string;
  type: 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT' | 'SPATIAL';
  columns: string[];
  cardinality: number | null;
  nullable: boolean;
  indexType: string; // BTREE, HASH, FULLTEXT, SPATIAL
  comment: string;
}

interface IndexManagerProps {
  database: string;
  tableName: string;
  onRefresh?: () => void;
}

function IndexManager({ database, tableName, onRefresh }: IndexManagerProps) {
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 新建索引表单
  const [newIndexName, setNewIndexName] = useState('');
  const [newIndexType, setNewIndexType] = useState<'INDEX' | 'UNIQUE' | 'FULLTEXT'>('INDEX');
  const [newIndexColumns, setNewIndexColumns] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (database && tableName) {
      loadIndexes();
      loadTableColumns();
    }
  }, [database, tableName]);

  const loadIndexes = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.mysqlApi.executeQuery(database, `SHOW INDEX FROM \`${tableName}\``);
      if (result.success && result.data) {
        const indexMap = new Map<string, IndexInfo>();

        result.data.forEach((row: any) => {
          const keyName = row.Key_name;
          if (!indexMap.has(keyName)) {
            let indexType: IndexInfo['type'] = 'INDEX';
            if (keyName === 'PRIMARY') indexType = 'PRIMARY';
            else if (row.Non_unique === 0) indexType = 'UNIQUE';
            else if (row.Index_type === 'FULLTEXT') indexType = 'FULLTEXT';
            else if (row.Index_type === 'SPATIAL') indexType = 'SPATIAL';

            indexMap.set(keyName, {
              name: keyName,
              type: indexType,
              columns: [],
              cardinality: row.Cardinality,
              nullable: row.Null === 'YES',
              indexType: row.Index_type,
              comment: row.Index_comment || ''
            });
          }
          indexMap.get(keyName)!.columns.push(row.Column_name);
        });

        setIndexes(Array.from(indexMap.values()));
      }
    } catch (err: any) {
      setError(`加载索引失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTableColumns = async () => {
    try {
      const result = await window.mysqlApi.executeQuery(database, `SHOW COLUMNS FROM \`${tableName}\``);
      if (result.success && result.data) {
        setTableColumns(result.data.map((row: any) => row.Field));
      }
    } catch (err: any) {
      console.error('加载列信息失败:', err);
    }
  };

  const filteredIndexes = indexes.filter(idx =>
    idx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idx.columns.some(col => col.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateIndex = async () => {
    if (!newIndexName.trim()) {
      setBannerMessage({ type: 'error', text: '请输入索引名称' });
      return;
    }
    if (newIndexColumns.length === 0) {
      setBannerMessage({ type: 'error', text: '请选择至少一个列' });
      return;
    }

    setCreateLoading(true);
    try {
      const columnsStr = newIndexColumns.map(c => `\`${c}\``).join(', ');
      let sql = '';

      if (newIndexType === 'UNIQUE') {
        sql = `CREATE UNIQUE INDEX \`${newIndexName}\` ON \`${tableName}\` (${columnsStr})`;
      } else if (newIndexType === 'FULLTEXT') {
        sql = `CREATE FULLTEXT INDEX \`${newIndexName}\` ON \`${tableName}\` (${columnsStr})`;
      } else {
        sql = `CREATE INDEX \`${newIndexName}\` ON \`${tableName}\` (${columnsStr})`;
      }

      const result = await window.mysqlApi.executeQuery(database, sql);
      if (!result.success) {
        throw new Error(result.error || '创建索引失败');
      }

      setBannerMessage({ type: 'success', text: `索引 ${newIndexName} 创建成功` });
      setCreateDialogOpen(false);
      resetCreateForm();
      await loadIndexes();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteIndex = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      let sql = '';
      if (deleteTarget === 'PRIMARY') {
        sql = `ALTER TABLE \`${tableName}\` DROP PRIMARY KEY`;
      } else {
        sql = `DROP INDEX \`${deleteTarget}\` ON \`${tableName}\``;
      }

      const result = await window.mysqlApi.executeQuery(database, sql);
      if (!result.success) {
        throw new Error(result.error || '删除索引失败');
      }

      setBannerMessage({ type: 'success', text: `索引 ${deleteTarget} 已删除` });
      setDeleteTarget(null);
      await loadIndexes();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewIndexName('');
    setNewIndexType('INDEX');
    setNewIndexColumns([]);
  };

  const getIndexTypeColor = (type: IndexInfo['type']) => {
    switch (type) {
      case 'PRIMARY': return '#e74c3c';
      case 'UNIQUE': return '#9b59b6';
      case 'FULLTEXT': return '#3498db';
      case 'SPATIAL': return '#1abc9c';
      default: return '#95a5a6';
    }
  };

  const getIndexTypeLabel = (type: IndexInfo['type']) => {
    switch (type) {
      case 'PRIMARY': return '主键';
      case 'UNIQUE': return '唯一';
      case 'FULLTEXT': return '全文';
      case 'SPATIAL': return '空间';
      default: return '普通';
    }
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
            <IndexIcon sx={{ color: '#9b59b6', fontSize: 20 }} />
            <Typography variant="h6" sx={{
              color: '#2c3e50',
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              索引管理 - {tableName}
            </Typography>
            <Chip
              label={`${filteredIndexes.length} 个索引`}
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              startIcon={<AddIcon />}
              size="small"
              variant="contained"
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                bgcolor: '#9b59b6',
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#8e44ad'
                }
              }}
            >
              创建索引
            </Button>
            <Tooltip title="刷新">
              <IconButton
                onClick={loadIndexes}
                size="small"
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #e3e8ee',
                  padding: '4px',
                  '&:hover': {
                    bgcolor: '#ecf0f1',
                    transform: 'rotate(180deg)',
                    borderColor: '#9b59b6'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="搜索索引名或列名..."
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
                borderColor: '#9b59b6'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#9b59b6',
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

      {bannerMessage && (
        <Box sx={{ px: 2, pt: 2 }}>
          <Alert
            severity={bannerMessage.type}
            onClose={() => setBannerMessage(null)}
            sx={{ borderRadius: 2 }}
          >
            {bannerMessage.text}
          </Alert>
        </Box>
      )}

      {/* 表格区域 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : filteredIndexes.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchTerm ? `未找到匹配 "${searchTerm}" 的索引` : '该表没有索引'}
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
            <Table size="small">
              <TableHead>
                <TableRow sx={{
                  '& .MuiTableCell-root': {
                    backgroundColor: '#f8f9fa',
                    color: '#2c3e50',
                    fontWeight: 600,
                    borderBottom: '2px solid #e3e8ee',
                    fontSize: '0.8rem',
                    padding: '10px 12px'
                  }
                }}>
                  <TableCell>索引名</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>列</TableCell>
                  <TableCell>索引方法</TableCell>
                  <TableCell align="right">基数</TableCell>
                  <TableCell>注释</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIndexes.map((idx) => (
                  <TableRow
                    key={idx.name}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#f8f9fa'
                      },
                      '& .MuiTableCell-root': {
                        padding: '8px 12px',
                        fontSize: '0.75rem'
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {idx.type === 'PRIMARY' && (
                          <KeyIcon sx={{ color: '#e74c3c', fontSize: 14 }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {idx.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getIndexTypeLabel(idx.type)}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor: getIndexTypeColor(idx.type),
                          color: '#ffffff',
                          '& .MuiChip-label': {
                            padding: '0 6px'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {idx.columns.map((col, i) => (
                          <Chip
                            key={i}
                            label={col}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.65rem',
                              height: 18,
                              '& .MuiChip-label': {
                                padding: '0 4px'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {idx.indexType}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {idx.cardinality !== null ? idx.cardinality.toLocaleString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                        {idx.comment || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={idx.type === 'PRIMARY' ? '删除主键' : '删除索引'}>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(idx.name)}
                          sx={{ color: '#e74c3c', padding: '4px' }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 创建索引对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建索引</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="索引名称"
              value={newIndexName}
              onChange={(e) => setNewIndexName(e.target.value)}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>索引类型</InputLabel>
              <Select
                value={newIndexType}
                label="索引类型"
                onChange={(e) => setNewIndexType(e.target.value as any)}
              >
                <MenuItem value="INDEX">普通索引</MenuItem>
                <MenuItem value="UNIQUE">唯一索引</MenuItem>
                <MenuItem value="FULLTEXT">全文索引</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>选择列</InputLabel>
              <Select
                multiple
                value={newIndexColumns}
                label="选择列"
                onChange={(e) => setNewIndexColumns(e.target.value as string[])}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {tableColumns.map((col) => (
                  <MenuItem key={col} value={col}>
                    <Checkbox checked={newIndexColumns.includes(col)} size="small" />
                    <ListItemText primary={col} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }}>取消</Button>
          <Button
            onClick={handleCreateIndex}
            variant="contained"
            disabled={createLoading}
          >
            {createLoading ? <CircularProgress size={20} /> : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除索引 <strong>{deleteTarget}</strong> 吗？此操作无法撤销。
          </Typography>
          {deleteTarget === 'PRIMARY' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              删除主键可能会影响表的数据完整性和性能。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>取消</Button>
          <Button
            onClick={handleDeleteIndex}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={20} /> : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default IndexManager;
