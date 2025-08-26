import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Toolbar,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewColumn as ViewColumnIcon,
  GetApp as ExportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as PrevPageIcon,
  ChevronRight as NextPageIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { t } from '../i18n';

interface ModernDataTableProps {
  data: any[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onAddRow: () => void;
  onEditRow: (row: any) => void;
  onDeleteRow: (row: any) => void;
  onDeleteRows?: (rows: any[]) => void; // 新增批量删除支持
  onExportData: () => void;
  onUpdateCell?: (rowIndex: number, column: string, value: any) => void;
  onRefreshData?: () => void; // 新增：刷新数据回调
  onReconnect?: () => Promise<boolean>; // 新增：重连回调
  tableName?: string;
  loading?: boolean;
  connectionError?: boolean; // 新增：连接错误状态
}

function ModernDataTable({
  data,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onAddRow,
  onEditRow,
  onDeleteRow,
  onDeleteRows,
  onExportData,
  onUpdateCell,
  onRefreshData,
  onReconnect,
  tableName,
  loading = false,
  connectionError = false
}: ModernDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, column: string} | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // v1.0.4 新增：高级过滤功能
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // 新增：重连相关状态
  const [reconnecting, setReconnecting] = useState(false);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [reconnectMessage, setReconnectMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // v1.0.4 增强：支持全局搜索和列级过滤
  const filteredData = data.filter(row => {
    // 全局搜索
    const matchesGlobalSearch = searchTerm === '' || 
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // 列级过滤
    const matchesColumnFilters = Object.entries(columnFilters).every(([column, filter]) => {
      if (!filter) return true;
      const cellValue = String(row[column] || '').toLowerCase();
      return cellValue.includes(filter.toLowerCase());
    });
    
    return matchesGlobalSearch && matchesColumnFilters;
  });

  // Apply pagination to filtered data (fixed 1000 rows per page)
  const paginatedData = filteredData.slice(
    page * 1000,
    page * 1000 + 1000
  );

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleEdit = () => {
    if (selectedRow) {
      onEditRow(selectedRow);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedRow) {
      setDeleteConfirmOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (selectedRows.size > 0) {
      // Handle batch delete
      const rowsToDelete = Array.from(selectedRows).map(index => paginatedData[index]);
      if (onDeleteRows) {
        onDeleteRows(rowsToDelete);
      } else {
        // Fallback: call single delete for each row
        rowsToDelete.forEach(row => onDeleteRow(row));
      }
      setSelectedRows(new Set());
    } else if (selectedRow) {
      // Handle single row delete
      onDeleteRow(selectedRow);
      setSelectedRow(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  // 新增：重连处理函数
  const handleReconnect = async () => {
    if (!onReconnect) return;
    
    setReconnecting(true);
    setShowReconnectDialog(false);
    
    try {
      const success = await onReconnect();
      if (success) {
        setSnackbarMessage('重连成功！');
        setSnackbarSeverity('success');
        setShowSnackbar(true);
        
        // 重连成功后刷新数据
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setSnackbarMessage('重连失败，请检查网络连接或数据库服务状态');
        setSnackbarSeverity('error');
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('重连过程中发生错误:', error);
      setSnackbarMessage('重连过程中发生错误');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    } finally {
      setReconnecting(false);
    }
  };

  const handleRefresh = () => {
    if (onRefreshData) {
      onRefreshData();
    }
  };

  const showReconnectPrompt = () => {
    setShowReconnectDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size > 0) {
      setDeleteConfirmOpen(true);
    }
  };

  const handleRowSelect = (rowIndex: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: paginatedData.length }, (_, i) => i)));
    }
  };

  const handleCellClick = (rowIndex: number, column: string, value: any) => {
    setEditingCell({ rowIndex, column });
    setEditValue(value === null ? '' : value);
  };

  const handleCellSave = () => {
    if (editingCell && onUpdateCell) {
      const { rowIndex, column } = editingCell;
      let processedValue = editValue;
      
      // Convert empty string to null for database
      if (processedValue === '') {
        processedValue = null;
      } else if (typeof data[rowIndex][column] === 'number') {
        // Try to convert to number if original was number
        const numValue = Number(processedValue);
        if (!isNaN(numValue)) {
          processedValue = numValue;
        }
      } else if (typeof data[rowIndex][column] === 'boolean') {
        // Convert to boolean if original was boolean
        processedValue = processedValue === 'true' || processedValue === '1';
      }
      
      onUpdateCell(rowIndex, column, processedValue);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleCellSave();
    } else if (event.key === 'Escape') {
      handleCellCancel();
    }
  };

  const getDataType = (value: any): string => {
    if (value === null) return 'null';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    return 'string';
  };

  const renderCellValue = (value: any, rowIndex: number, column: string) => {
    // Check if this cell is being edited
    if (editingCell && editingCell.rowIndex === rowIndex && editingCell.column === column) {
      return (
        <TextField
          size="small"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={handleKeyPress}
          autoFocus
          sx={{ 
            '& .MuiOutlinedInput-root': {
              fontSize: '0.55rem',
              minHeight: 'auto'
            },
            '& .MuiInputBase-input': {
              padding: '0px 3px',
              fontSize: '0.55rem'
            }
          }}
        />
      );
    }

    // Render clickable cell value
    const cellContent = (() => {
      if (value === null) {
        return <Chip label="NULL" size="small" variant="outlined" color="default" />;
      }
      if (typeof value === 'boolean') {
        return <Chip label={value ? 'TRUE' : 'FALSE'} size="small" color={value ? 'success' : 'error'} />;
      }
      if (typeof value === 'number') {
        return <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>{value}</Typography>;
      }
      if (value instanceof Date) {
        return <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{value.toLocaleString()}</Typography>;
      }
      return <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(value)}</Typography>;
    })();

    return (
      <Box 
        onClick={() => handleCellClick(rowIndex, column, value)}
        sx={{ 
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        {cellContent}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', bgcolor: '#ffffff' }}>
      {/* Top Toolbar with Add/Remove buttons */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: 1.5,
        py: 0.5,
        borderBottom: 1,
        borderColor: '#e0e0e0',
        bgcolor: '#fafafa',
        minHeight: 36
      }}>
        {/* Left: Add/Remove buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={t('dataTable.addRow')}>
            <IconButton 
              onClick={onAddRow} 
              color="primary"
              size="small"
              sx={{ 
                bgcolor: '#1976d2',
                color: '#ffffff',
                '&:hover': { bgcolor: '#1565c0' },
                width: 24,
                height: 24
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={selectedRows.size > 0 ? `删除选中的 ${selectedRows.size} 行` : '删除选中行'}>
            <span>
              <IconButton 
                onClick={handleDeleteSelected}
                disabled={selectedRows.size === 0}
                size="small"
                sx={{ 
                  bgcolor: selectedRows.size > 0 ? '#d32f2f' : '#e0e0e0',
                  color: selectedRows.size > 0 ? '#ffffff' : '#9e9e9e',
                  '&:hover': { bgcolor: selectedRows.size > 0 ? '#c62828' : '#e0e0e0' },
                  '&:disabled': { 
                    bgcolor: '#e0e0e0',
                    color: '#9e9e9e'
                  },
                  width: 24,
                  height: 24
                }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {selectedRows.size > 0 && (
            <Typography variant="body2" sx={{ color: '#424242' }}>
              已选择 {selectedRows.size} 行
            </Typography>
          )}
        </Box>

        {/* Right: Enhanced Search and Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Advanced Search */}
          <TextField
            size="small"
            placeholder={t('dataTable.searchInTable')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#666666' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ color: '#666666' }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ 
              width: 240,
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
          
          {/* Quick Filter */}
          <Tooltip title="快速过滤选项">
            <IconButton
              size="small"
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              sx={{ 
                color: Object.keys(columnFilters).length > 0 ? '#1976d2' : '#666666',
                bgcolor: Object.keys(columnFilters).length > 0 ? '#e3f2fd' : 'transparent'
              }}
            >
              <FilterIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Column Visibility */}
          <Tooltip title="显示/隐藏列">
            <IconButton
              size="small"
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              sx={{ color: '#666666' }}
            >
              <ViewColumnIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={t('dataTable.export')}>
            <IconButton 
              onClick={onExportData} 
              size="small"
              sx={{ 
                color: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#e8f5e8'
                }
              }}
            >
              <ExportIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* 新增：刷新按钮 */}
          <Tooltip title="刷新数据">
            <IconButton 
              onClick={handleRefresh} 
              size="small"
              disabled={loading || reconnecting}
              sx={{ 
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: '#e3f2fd'
                }
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* 新增：连接状态指示器 */}
          {connectionError && (
            <Tooltip title="数据库连接异常，点击重新连接">
              <IconButton 
                onClick={showReconnectPrompt} 
                size="small"
                disabled={reconnecting}
                sx={{ 
                  color: '#d32f2f',
                  '&:hover': {
                    backgroundColor: '#ffebee'
                  }
                }}
              >
                {reconnecting ? (
                  <CircularProgress size={16} sx={{ color: '#d32f2f' }} />
                ) : (
                  <WarningIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* 新增：连接状态提醒 */}
      {connectionError && !showReconnectDialog && (
        <Alert 
          severity="warning" 
          sx={{ mx: 2, mb: 1 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={showReconnectPrompt}
              disabled={reconnecting}
              startIcon={reconnecting ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              {reconnecting ? '重连中...' : '重新连接'}
            </Button>
          }
        >
          数据库连接已断开，部分功能可能无法正常使用
        </Alert>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)', bgcolor: '#ffffff' }}>
        <Table stickyHeader size="small" sx={{ 
          '& .MuiTableCell-root': { 
            padding: '0px 3px', // 进一步减少内边距
            fontSize: '0.55rem', // 更小的字体
            lineHeight: 0.8, // 进一步减少行高
            borderBottom: '1px solid #e0e0e0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#000000'
          },
          '& .MuiTableRow-root': {
            height: 14, // 更紧凑的行高
            minHeight: 14,
            '&:hover': {
              backgroundColor: '#f5f5f5',
            }
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            padding: '1px 3px', // 表头也减少padding
            fontSize: '0.8rem', // 表头字体再大一些
            fontWeight: 600,
            backgroundColor: '#fafafa',
            borderBottom: '2px solid #e0e0e0',
            color: '#000000',
            height: 26 // 表头再高一些
          },
          '& .MuiCheckbox-root': {
            padding: '0px',
            color: '#1976d2',
            '&.Mui-checked': {
              color: '#1976d2',
            }
          }
        }}>
          <TableHead>
            <TableRow>
              {/* Select All checkbox */}
              <TableCell 
                sx={{ 
                  fontWeight: 'bold',
                  bgcolor: '#fafafa',
                  color: '#000000',
                  borderBottom: '2px solid #e0e0e0',
                  width: 40,
                  padding: '1px 3px !important'
                }}
              >
                <Checkbox
                  size="small"
                  indeterminate={selectedRows.size > 0 && selectedRows.size < paginatedData.length}
                  checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                  onChange={handleSelectAll}
                  sx={{ 
                    padding: '0px',
                    color: '#1976d2',
                    '&.Mui-checked': {
                      color: '#1976d2',
                    }
                  }}
                />
              </TableCell>
              
              {/* v1.0.4 增强：支持列隐藏 */}
              {columns.filter(column => !hiddenColumns.has(column)).map((column) => (
                <TableCell 
                  key={column}
                  sx={{ 
                    fontWeight: 'bold',
                    bgcolor: '#fafafa',
                    color: '#000000',
                    borderBottom: 1,
                    borderColor: 'divider',
                    padding: '1px 3px !important',
                    '& .MuiTableCell-root': {
                      color: '#000000 !important'
                    }
                  }}
                >
                  {column}
                </TableCell>
              ))}
              <TableCell 
                sx={{ 
                  fontWeight: 'bold',
                  bgcolor: '#fafafa',
                  color: '#000000',
                  borderBottom: 1,
                  borderColor: 'divider',
                  width: 50,
                  padding: '1px 3px !important',
                  '& .MuiTableCell-root': {
                    color: '#000000 !important'
                  }
                }}
              >
                {t('dataTable.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, paginatedIndex) => {
              // Calculate the actual index in the original data
              const actualIndex = data.findIndex(dataRow => 
                Object.keys(dataRow).every(key => dataRow[key] === row[key])
              );
              
              return (
                <TableRow
                  key={actualIndex}
                  hover
                  selected={selectedRows.has(paginatedIndex)}
                  sx={{ 
                    height: 14,
                    minHeight: 14,
                    '&:hover': { bgcolor: 'action.hover' },
                    '&.Mui-selected': { bgcolor: 'action.selected' },
                    '& .MuiTableCell-root': {
                      padding: '0px 3px !important',
                      borderBottom: '1px solid rgba(224, 224, 224, 0.5)',
                      fontSize: '0.55rem',
                      height: 14,
                      lineHeight: 0.8
                    }
                  }}
                >
                  {/* Selection checkbox */}
                  <TableCell sx={{ padding: '0px 3px !important', width: 40 }}>
                    <Checkbox
                      size="small"
                      checked={selectedRows.has(paginatedIndex)}
                      onChange={() => handleRowSelect(paginatedIndex)}
                      sx={{ padding: '0px' }}
                    />
                  </TableCell>
                  
                  {/* v1.0.4 增强：支持列隐藏 */}
                  {columns.filter(column => !hiddenColumns.has(column)).map((column) => (
                    <TableCell key={column} sx={{ padding: '0px 3px !important' }}>
                      {renderCellValue(row[column], actualIndex, column)}
                    </TableCell>
                  ))}
                  <TableCell sx={{ padding: '0px 3px !important', width: 50 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, row)}
                      sx={{ padding: '0px' }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: 1.5,
        py: 0.5,
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 48,
        gap: 1
      }}>
        {/* Left: Fixed rows per page info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 120 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            每页 1000 行
          </Typography>
        </Box>

        {/* Center: Page info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            第 {page + 1} 页，共 {Math.ceil(filteredData.length / 1000)} 页
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
            |
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            已选择 {paginatedData.length} 行（共 {filteredData.length} 行）
          </Typography>
        </Box>

        {/* Right: Navigation buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 250 }}>
          <Tooltip title="首页">
            <span>
              <IconButton 
                size="small" 
                onClick={() => onPageChange(0)}
                disabled={page === 0}
                sx={{ 
                  '&:disabled': { 
                    color: 'action.disabled' 
                  }
                }}
              >
                <FirstPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="上一页">
            <span>
              <IconButton 
                size="small" 
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                sx={{ 
                  '&:disabled': { 
                    color: 'action.disabled' 
                  }
                }}
              >
                <PrevPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* Page number input */}
          <TextField
            size="small"
            value={page + 1}
            onChange={(e) => {
              const newPage = parseInt(e.target.value) - 1;
              const maxPage = Math.ceil(filteredData.length / 1000) - 1;
              if (!isNaN(newPage) && newPage >= 0 && newPage <= maxPage) {
                onPageChange(newPage);
              }
            }}
            sx={{ 
              width: 70,
              mx: 1,
              '& .MuiOutlinedInput-root': {
                height: 32,
                fontSize: '0.875rem'
              },
              '& input': {
                textAlign: 'center',
                p: 0.5
              }
            }}
          />

          <Tooltip title="下一页">
            <span>
              <IconButton 
                size="small" 
                onClick={() => onPageChange(page + 1)}
                disabled={page >= Math.ceil(filteredData.length / 1000) - 1}
                sx={{ 
                  '&:disabled': { 
                    color: 'action.disabled' 
                  }
                }}
              >
                <NextPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="末页">
            <span>
              <IconButton 
                size="small" 
                onClick={() => onPageChange(Math.ceil(filteredData.length / 1000) - 1)}
                disabled={page >= Math.ceil(filteredData.length / 1000) - 1}
                sx={{ 
                  '&:disabled': { 
                    color: 'action.disabled' 
                  }
                }}
              >
                <LastPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          {t('dataTable.edit')}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          {t('dataTable.delete')}
        </MenuItem>
      </Menu>

      {/* Empty State */}
      {data.length === 0 && !loading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('dataTable.noData')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dataTable.noDataDescription')}
          </Typography>
          <Button variant="contained" onClick={onAddRow} startIcon={<AddIcon />}>
            {t('dataTable.addFirstRow')}
          </Button>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          确认删除
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {selectedRows.size > 0 
              ? `确定要删除选中的 ${selectedRows.size} 行数据吗？此操作无法撤销。`
              : '确定要删除这行数据吗？此操作无法撤销。'
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            取消
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* v1.0.4 新增：列过滤菜单 */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 300, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            列过滤器
          </Typography>
          {columns.map((column) => (
            <TextField
              key={column}
              size="small"
              label={column}
              value={columnFilters[column] || ''}
              onChange={(e) => setColumnFilters(prev => ({
                ...prev,
                [column]: e.target.value
              }))}
              sx={{ mb: 1, width: '100%' }}
              InputProps={{
                endAdornment: columnFilters[column] && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setColumnFilters(prev => {
                        const newFilters = { ...prev };
                        delete newFilters[column];
                        return newFilters;
                      })}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          ))}
          <Button
            size="small"
            onClick={() => setColumnFilters({})}
            sx={{ mt: 1 }}
          >
            清除所有过滤器
          </Button>
        </Box>
      </Menu>

      {/* v1.0.4 新增：列可见性菜单 */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 250, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            显示/隐藏列
          </Typography>
          {columns.map((column) => (
            <FormControlLabel
              key={column}
              control={
                <Checkbox
                  size="small"
                  checked={!hiddenColumns.has(column)}
                  onChange={(e) => {
                    const newHidden = new Set(hiddenColumns);
                    if (e.target.checked) {
                      newHidden.delete(column);
                    } else {
                      newHidden.add(column);
                    }
                    setHiddenColumns(newHidden);
                  }}
                />
              }
              label={column}
              sx={{ display: 'block', mb: 0.5 }}
            />
          ))}
          <Button
            size="small"
            onClick={() => setHiddenColumns(new Set())}
            sx={{ mt: 1 }}
          >
            显示所有列
          </Button>
        </Box>
      </Menu>

      {/* 新增：重连确认对话框 */}
      <Dialog
        open={showReconnectDialog}
        onClose={() => setShowReconnectDialog(false)}
        aria-labelledby="reconnect-dialog-title"
        aria-describedby="reconnect-dialog-description"
      >
        <DialogTitle id="reconnect-dialog-title">
          数据库连接异常
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reconnect-dialog-description">
            检测到数据库连接已断开或超时。这可能是由于长时间未操作或网络问题导致的。
            点击"重新连接"尝试恢复连接，或者点击"取消"继续当前操作。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReconnectDialog(false)} color="primary">
            取消
          </Button>
          <Button 
            onClick={handleReconnect} 
            color="primary" 
            variant="contained"
            disabled={reconnecting}
            startIcon={reconnecting ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            {reconnecting ? '重连中...' : '重新连接'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新增：通知消息 */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ModernDataTable;
