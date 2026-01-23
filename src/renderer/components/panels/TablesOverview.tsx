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
  DialogActions
} from '@mui/material';
import {
  TableChart as TableIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Settings as DesignIcon
} from '@mui/icons-material';
import { t } from '../../i18n';
import TableDesignModal from '../dialogs/TableDesignModal';

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
  onRefresh: () => void | Promise<void>;
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
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [structureTarget, setStructureTarget] = useState<string | null>(null);
  const [structureSql, setStructureSql] = useState('');
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [structureSuccess, setStructureSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [designTableName, setDesignTableName] = useState<string | undefined>(undefined);

  const filteredTables = detailedTables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (table.table_comment && table.table_comment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sanitizeIdentifier = (name: string) => `\`${name.replace(/`/g, '``')}\``;

  const openStructureDialog = async (tableName: string) => {
    if (!database) return;
    setStructureDialogOpen(true);
    setStructureTarget(tableName);
    setStructureSql('');
    setStructureError(null);
    setStructureSuccess(null);
    setStructureLoading(true);
    try {
      const result = await window.mysqlApi.executeQuery(
        `SHOW CREATE TABLE ${sanitizeIdentifier(tableName)}`,
        database
      );
      if (!result.success) {
        throw new Error(result.error || t('tablesOverview.loadStructureFailed'));
      }
      const row = Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
      const createSql = row ? row['Create Table'] || row['Create Table '] || '' : '';
      setStructureSql(createSql);
      if (!createSql) {
        setStructureError(t('tablesOverview.noStructureSql'));
      }
    } catch (error: any) {
      setStructureError(error.message || t('tablesOverview.loadStructureFailed'));
    } finally {
      setStructureLoading(false);
    }
  };

  const closeStructureDialog = () => {
    if (structureLoading) return;
    setStructureDialogOpen(false);
    setStructureTarget(null);
    setStructureSql('');
    setStructureError(null);
    setStructureSuccess(null);
  };

  const handleStructureSave = async () => {
    if (!database || !structureTarget) return;
    if (!structureSql.trim()) {
      setStructureError(t('tablesOverview.structureEmpty'));
      return;
    }
    setStructureLoading(true);
    setStructureError(null);
    setStructureSuccess(null);
    try {
      const result = await window.mysqlApi.executeQuery(structureSql, database);
      if (!result.success) {
        throw new Error(result.error || t('tablesOverview.structureSaveFailed'));
      }
      setStructureSuccess(t('tablesOverview.structureSavedSuccess'));
      setBannerMessage({
        type: 'success',
        text: t('tablesOverview.structureSavedBanner', { table: structureTarget })
      });
      await Promise.resolve(onRefresh());
    } catch (error: any) {
      setStructureError(error.message || t('tablesOverview.structureSaveFailed'));
    } finally {
      setStructureLoading(false);
    }
  };

  const handleDeleteTable = (tableName: string) => {
    setDeleteTarget(tableName);
  };

  const handleOpenDesignModal = (tableName?: string) => {
    setDesignTableName(tableName);
    setDesignModalOpen(true);
  };

  const handleCloseDesignModal = () => {
    setDesignModalOpen(false);
    setDesignTableName(undefined);
  };

  const handleDesignComplete = async () => {
    setBannerMessage({
      type: 'success',
      text: designTableName ? `表 ${designTableName} 已更新` : '新表已创建'
    });
    await Promise.resolve(onRefresh());
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
  };

  const confirmDeleteTable = async () => {
    if (!database || !deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result = await window.mysqlApi.dropTable(database, deleteTarget);
      if (!result.success) {
        throw new Error(result.error || t('tablesOverview.deleteFailed'));
      }
      setBannerMessage({
        type: 'success',
        text: t('tablesOverview.deleteSuccessBanner', { table: deleteTarget })
      });
      setDeleteTarget(null);
      await Promise.resolve(onRefresh());
    } catch (error: any) {
      setBannerMessage({
        type: 'error',
        text: error.message || t('tablesOverview.deleteFailed')
      });
    } finally {
      setDeleteLoading(false);
    }
  };

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
              {t('tablesOverview.title', { database })}
            </Typography>
            <Chip 
              label={t('tablesOverview.totalTables', { count: filteredTables.length })}
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
              onClick={() => handleOpenDesignModal()}
              sx={{
                bgcolor: '#3498db',
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#2980b9'
                }
              }}
            >
              创建表
            </Button>
            <Tooltip title={t('tablesOverview.refreshTables')}>
              <IconButton
                onClick={() => { void onRefresh(); }}
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
        </Box>
        
        <TextField
          fullWidth
          size="small"
          placeholder={t('tablesOverview.searchPlaceholder')}
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
      {loading || loadingDetails ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
        ) : filteredTables.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchTerm ? t('tablesOverview.noSearchResult', { keyword: searchTerm }) : t('tablesOverview.noTables')}
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
                fontSize: '0.5rem',
                padding: '4px 8px',
                lineHeight: 0.95
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
                height: 24,
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
                  <TableCell>{t('tablesOverview.columns.name')}</TableCell>
                  <TableCell>{t('tablesOverview.columns.engine')}</TableCell>
                  <TableCell align="right">{t('tablesOverview.columns.rows')}</TableCell>
                  <TableCell align="right">{t('tablesOverview.columns.dataSize')}</TableCell>
                  <TableCell align="right">{t('tablesOverview.columns.indexSize')}</TableCell>
                  <TableCell align="right">{t('tablesOverview.columns.autoIncrement')}</TableCell>
                  <TableCell>{t('tablesOverview.columns.createdAt')}</TableCell>
                  <TableCell>{t('tablesOverview.columns.comment')}</TableCell>
                  <TableCell align="center">{t('tablesOverview.columns.actions')}</TableCell>
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
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.5rem' }}>
                          {table.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={table.engine || t('tablesOverview.engineUnknown')}
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
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.5rem' }}>
                        {table.rows !== undefined ? formatNumber(table.rows) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.5rem' }}>
                        {table.data_length !== undefined ? formatFileSize(table.data_length) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.5rem' }}>
                        {table.index_length !== undefined ? formatFileSize(table.index_length) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.5rem' }}>
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
                        <Tooltip title={t('tablesOverview.viewData')}>
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
                        <Tooltip title="设计表结构">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDesignModal(table.name);
                            }}
                            sx={{ color: '#9b59b6', padding: '2px' }}
                          >
                            <DesignIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('tablesOverview.editStructure')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStructureDialog(table.name);
                            }}
                            sx={{ color: '#f39c12', padding: '2px' }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('tablesOverview.deleteTable')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTable(table.name);
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

      <Dialog
        open={structureDialogOpen}
        onClose={closeStructureDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {structureTarget ? t('tablesOverview.structureDialogTitle', { table: structureTarget }) : t('tablesOverview.structureDialogFallback')}
        </DialogTitle>
        <DialogContent dividers>
          {structureLoading && !structureSql && !structureError ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                {t('tablesOverview.loadingStructure')}
              </Typography>
            </Box>
          ) : (
            <Box>
              {structureError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {structureError}
                </Alert>
              )}
              {structureSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {structureSuccess}
                </Alert>
              )}
              <TextField
                fullWidth
                multiline
                minRows={12}
                label={t('tablesOverview.structureSqlLabel')}
                value={structureSql}
                onChange={(e) => setStructureSql(e.target.value)}
                InputProps={{
                  sx: {
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 13,
                    lineHeight: 1.6
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStructureDialog} disabled={structureLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleStructureSave}
            disabled={structureLoading || !structureSql.trim()}
            variant="contained"
          >
            {structureLoading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={closeDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('tablesOverview.deleteDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('tablesOverview.deleteDialogMessage', { table: deleteTarget || '' })}
          </Typography>
          {bannerMessage?.type === 'error' && deleteTarget && (
            <Alert severity="error">
              {bannerMessage.text}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirmDeleteTable}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? t('common.working') : t('tablesOverview.deleteConfirmButton')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 表设计模态框 */}
      <TableDesignModal
        open={designModalOpen}
        onClose={handleCloseDesignModal}
        database={database}
        tableName={designTableName}
        onComplete={handleDesignComplete}
      />
    </Box>
  );
}

export default TablesOverview;
