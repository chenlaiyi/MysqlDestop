import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TableSortLabel,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import type { TextFieldProps } from '@mui/material/TextField';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Remove as RemoveIcon,
  ViewColumn as ViewColumnIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft as PrevPageIcon,
  KeyboardArrowRight as NextPageIcon,
  Upload as ImportIcon,
  Storage as IndexIcon
} from '@mui/icons-material';
import DataImportModal from '../dialogs/DataImportModal';
import IndexManager from '../panels/IndexManager';

interface ExactDataTableProps {
  database: string;
  table: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatches = (
  text: string,
  keyword: string,
  highlightSx: Record<string, unknown>
): React.ReactNode => {
  if (!keyword) {
    return text;
  }

  const escaped = escapeRegExp(keyword);
  const regex = new RegExp(`(${escaped})`, 'ig');
  const segments = text.split(regex);
  const lowerKeyword = keyword.toLowerCase();

  return segments.map((segment, idx) => {
    if (!segment) {
      return null;
    }
    if (segment.toLowerCase() === lowerKeyword) {
      return (
        <Box
          component="span"
          key={`match-${idx}`}
          sx={{
            borderRadius: 0.5,
            px: 0.3,
            ...highlightSx
          }}
        >
          {segment}
        </Box>
      );
    }
    return (
      <React.Fragment key={`text-${idx}`}>
        {segment}
      </React.Fragment>
    );
  });
};

const ExactDataTable: React.FC<ExactDataTableProps> = ({ database, table }) => {
  const ROWS_PER_PAGE_MIN = 10;
  const ROWS_PER_PAGE_MAX = 1000;
  const ROWS_PER_PAGE_STEP = 10;

  const theme = useTheme();
  const highlightSx = useMemo(
    () => ({
      backgroundColor: alpha(theme.palette.primary.main, 0.24),
      color: theme.palette.primary.contrastText
    }),
    [theme]
  );

  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnMenuAnchorEl, setColumnMenuAnchorEl] = useState<null | HTMLElement>(null);
  const isColumnMenuOpen = Boolean(columnMenuAnchorEl);
  const [pageInput, setPageInput] = useState('1');
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    column: string;
    value: string;
    original: any;
  } | null>(null);
  const [isSavingCell, setIsSavingCell] = useState(false);

  // 添加行对话框状态
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [isAddingRow, setIsAddingRow] = useState(false);

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 导出对话框状态
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'sql'>('csv');
  const [exportFileName, setExportFileName] = useState('');

  // 导入对话框状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 索引管理对话框状态
  const [indexManagerOpen, setIndexManagerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = page * rowsPerPage;
      const result = await window.mysqlApi.getTableData(
        database,
        table,
        rowsPerPage,
        offset,
        sortField || undefined,
        sortField ? sortDirection : undefined,
        debouncedSearchTerm || undefined
      );
      
      if (result.success) {
        setData(result.data || []);
        setTotalCount(result.totalCount || 0);

        let resolvedColumns: string[] = [];
        if (Array.isArray(result.columns) && result.columns.length > 0) {
          resolvedColumns = result.columns;
        } else if (result.data && result.data.length > 0) {
          resolvedColumns = Object.keys(result.data[0]);
        }

        setColumns(resolvedColumns);
        setVisibleColumns((prev) => {
          if (resolvedColumns.length === 0) {
            return [];
          }

          if (prev.length === 0) {
            return resolvedColumns;
          }

          const prevSet = new Set(prev);
          const filteredPrev = prev.filter((col) => resolvedColumns.includes(col));
          const newlyDiscovered = resolvedColumns.filter((col) => !prevSet.has(col));

          if (filteredPrev.length === 0) {
            return resolvedColumns;
          }

          return [...filteredPrev, ...newlyDiscovered];
        });

        setSelected([]);
      } else {
        setError(result.error || '加载数据失败');
      }
    } catch (err: any) {
      setError(err.message || '发生未知错误');
    } finally {
      setLoading(false);
    }
  }, [database, table, rowsPerPage, page, sortField, sortDirection, debouncedSearchTerm]);

  useEffect(() => {
    setPage(0);
  }, [database, table]);

  useEffect(() => {
    setPage(0);
    setSortField(null);
    setSortDirection('asc');
    setSelected([]);
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setVisibleColumns([]);
    setColumnMenuAnchorEl(null);
    setPageInput('1');
  }, [database, table]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(0);
    }, 400);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const nextPageInput = totalCount === 0 ? '1' : String(page + 1);
    setPageInput(nextPageInput);
  }, [page, totalCount]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map((_, index) => index);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleRowClick = (event: React.MouseEvent<unknown>, index: number) => {
    const selectedIndex = selected.indexOf(index);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, index);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (index: number) => selected.indexOf(index) !== -1;

  const handleSort = (column: string) => {
    if (sortField === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(column);
      setSortDirection('asc');
    }
    setPage(0);
  };

  const handleRefresh = () => {
    void loadData();
  };

  const adjustRowsPerPage = (delta: number) => {
    setRowsPerPage((prev) => {
      const next = Math.min(ROWS_PER_PAGE_MAX, Math.max(ROWS_PER_PAGE_MIN, prev + delta));
      if (next !== prev) {
        setPage(0);
      }
      return next;
    });
  };

  const handleDecreaseRowsPerPage = () => adjustRowsPerPage(-ROWS_PER_PAGE_STEP);
  const handleIncreaseRowsPerPage = () => adjustRowsPerPage(ROWS_PER_PAGE_STEP);
  const handleOpenColumnMenu = (event: React.MouseEvent<HTMLElement>) => {
    setColumnMenuAnchorEl(event.currentTarget);
  };

  const handleCloseColumnMenu = () => setColumnMenuAnchorEl(null);

  const handleToggleColumnVisibility = (column: string) => {
    setVisibleColumns((prev) => {
      const isVisible = prev.includes(column);
      if (isVisible) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((col) => col !== column);
      }

      const next = [...prev, column];
      return columns.filter((col) => next.includes(col));
    });
  };

  const startEditingCell = (rowIndex: number, column: string) => {
    const row = data[rowIndex];
    if (!row) return;
    const currentValue = row[column];
    setEditingCell({
      rowIndex,
      column,
      value: currentValue == null ? '' : String(currentValue),
      original: currentValue
    });
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingCell) return;
    setEditingCell({ ...editingCell, value: event.target.value });
  };

  const cancelEditingCell = () => {
    setEditingCell(null);
  };

  const commitEditingCell = async () => {
    if (!editingCell) return;
    const { rowIndex, column, value, original } = editingCell;
    const row = data[rowIndex];
    if (!row) {
      setEditingCell(null);
      return;
    }

    if (value === original || columns.length === 0) {
      setEditingCell(null);
      return;
    }

    const primaryKey = columns[0];
    const primaryKeyValue = row[primaryKey];

    if (primaryKeyValue === undefined) {
      alert('无法确定主键，无法保存。');
      setEditingCell(null);
      return;
    }

    try {
      setIsSavingCell(true);
      const result = await window.mysqlApi.updateRow(
        database,
        table,
        primaryKey,
        primaryKeyValue,
        { [column]: value }
      );

      if (!result.success) {
        throw new Error(result.error || '更新失败');
      }

      setData((prev) => {
        const next = [...prev];
        next[rowIndex] = { ...next[rowIndex], [column]: value };
        return next;
      });
      setEditingCell(null);
    } catch (error: any) {
      alert(error?.message || '更新失败');
      setEditingCell(null);
    } finally {
      setIsSavingCell(false);
    }
  };

  // 添加行功能
  const handleOpenAddRowDialog = () => {
    const emptyData: Record<string, string> = {};
    columns.forEach(col => emptyData[col] = '');
    setNewRowData(emptyData);
    setAddRowDialogOpen(true);
  };

  const handleCloseAddRowDialog = () => {
    setAddRowDialogOpen(false);
    setNewRowData({});
  };

  const handleNewRowDataChange = (column: string, value: string) => {
    setNewRowData(prev => ({ ...prev, [column]: value }));
  };

  const handleAddRow = async () => {
    if (columns.length === 0) return;

    setIsAddingRow(true);
    try {
      const result = await window.mysqlApi.insertRow(database, table, newRowData);
      if (!result.success) {
        throw new Error(result.error || '添加失败');
      }
      handleCloseAddRowDialog();
      loadData(); // 刷新数据
    } catch (error: any) {
      alert(error?.message || '添加行失败');
    } finally {
      setIsAddingRow(false);
    }
  };

  // 删除行功能
  const handleOpenDeleteDialog = () => {
    if (selected.length === 0) {
      alert('请先选择要删除的行');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteRows = async () => {
    if (selected.length === 0 || columns.length === 0) return;

    setIsDeleting(true);
    const primaryKey = columns[0];

    try {
      for (const index of selected) {
        const row = data[index];
        if (!row) continue;
        const primaryKeyValue = row[primaryKey];
        if (primaryKeyValue === undefined) continue;

        const result = await window.mysqlApi.deleteRow(database, table, primaryKey, primaryKeyValue);
        if (!result.success) {
          throw new Error(result.error || `删除行 ${primaryKeyValue} 失败`);
        }
      }
      setSelected([]);
      handleCloseDeleteDialog();
      loadData(); // 刷新数据
    } catch (error: any) {
      alert(error?.message || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 导出功能
  const handleOpenExportDialog = () => {
    setExportFileName(`${database}_${table}`);
    setExportDialogOpen(true);
  };

  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };

  const exportToCSV = (exportData: any[]) => {
    if (exportData.length === 0) return '';
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const strValue = String(value);
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(',')
      )
    ].join('\n');
    return csvContent;
  };

  const exportToSQL = (exportData: any[], tableName: string) => {
    if (exportData.length === 0) return '';
    const headers = Object.keys(exportData[0]);
    const insertStatements = exportData.map(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        return value;
      }).join(', ');
      return `INSERT INTO \`${tableName}\` (\`${headers.join('`, `')}\`) VALUES (${values});`;
    });
    return insertStatements.join('\n');
  };

  const handleExport = () => {
    if (!exportFileName.trim()) {
      alert('请输入文件名');
      return;
    }

    let content = '';
    let fileExtension = '';

    switch (exportFormat) {
      case 'csv':
        content = exportToCSV(data);
        fileExtension = '.csv';
        break;
      case 'json':
        content = JSON.stringify(data, null, 2);
        fileExtension = '.json';
        break;
      case 'sql':
        content = exportToSQL(data, table);
        fileExtension = '.sql';
        break;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName + fileExtension;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    handleCloseExportDialog();
  };

  const handleColumnMenuToggle = (event: React.MouseEvent, column: string) => {
    event.preventDefault();
    event.stopPropagation();
    handleToggleColumnVisibility(column);
  };

  const handleColumnCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, column: string) => {
    event.stopPropagation();
    handleToggleColumnVisibility(column);
  };

  const handleShowAllColumns = () => {
    setVisibleColumns(columns);
    handleCloseColumnMenu();
  };

  const totalPages = rowsPerPage > 0 ? Math.ceil(totalCount / rowsPerPage) : 0;
  const effectiveTotalPages = totalPages > 0 ? totalPages : 1;

  const handleFirstPage = () => {
    if (page > 0) {
      setPage(0);
    }
  };

  const handleLastPage = () => {
    if (totalPages > 0 && page < totalPages - 1) {
      setPage(totalPages - 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (totalPages === 0) {
      return;
    }
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const commitPageInput = (value: string) => {
    const numeric = parseInt(value, 10);
    if (Number.isNaN(numeric)) {
      setPageInput(String(page + 1));
      return;
    }
    const safeTotal = totalPages > 0 ? totalPages : 1;
    const clamped = Math.min(Math.max(numeric, 1), safeTotal);
    setPage(clamped - 1);
    setPageInput(String(clamped));
  };

  const handlePageInputChange: TextFieldProps['onChange'] = (event) => {
    setPageInput(event.target.value.replace(/[^0-9]/g, ''));
  };

  const handlePageInputBlur: TextFieldProps['onBlur'] = (event) => {
    commitPageInput(event.target.value);
  };

  const handlePageInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitPageInput(pageInput);
    }
  };
  const fromRow = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const toRow = totalCount === 0 ? 0 : Math.min(totalCount, (page + 1) * rowsPerPage);
  const emptyColSpan = Math.max(visibleColumns.length + 2, 1);

  if (loading && data.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        bgcolor: 'background.default'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}
    >
      {/* 工具栏 */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          position: 'sticky',
          top: 0,
          zIndex: 6
        }}
      >
        <TextField
          size="small"
          placeholder="搜索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 200 }}
        />

        <Box sx={{ ml: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {`总行数: ${totalCount.toLocaleString()} | 当前: ${fromRow === 0 ? 0 : `${fromRow}-${toRow}`}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {`第 ${totalCount === 0 ? 0 : page + 1}/${effectiveTotalPages} 页 | 已选 ${selected.length} 行`}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="跳到首页">
            <span>
              <IconButton size="small" onClick={handleFirstPage} disabled={page === 0}>
                <FirstPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="上一页">
            <span>
              <IconButton size="small" onClick={handlePrevPage} disabled={page === 0}>
                <PrevPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <TextField
            size="small"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            sx={{ width: 70 }}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 1, style: { textAlign: 'center' } }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 60 }}>
            {`/ ${effectiveTotalPages}`}
          </Typography>
          <Tooltip title="下一页">
            <span>
              <IconButton size="small" onClick={handleNextPage} disabled={totalPages === 0 || page >= totalPages - 1}>
                <NextPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="跳到末页">
            <span>
              <IconButton size="small" onClick={handleLastPage} disabled={totalPages === 0 || page >= totalPages - 1}>
                <LastPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Tooltip title="列显示">
          <span>
            <IconButton size="small" onClick={handleOpenColumnMenu} disabled={columns.length === 0}>
              <ViewColumnIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="刷新">
          <IconButton size="small" onClick={handleRefresh} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="导出">
          <IconButton size="small" onClick={handleOpenExportDialog} disabled={data.length === 0}>
            <ExportIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="添加行">
          <IconButton size="small" onClick={handleOpenAddRowDialog} disabled={columns.length === 0}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="导入数据">
          <IconButton size="small" onClick={() => setImportDialogOpen(true)}>
            <ImportIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="索引管理">
          <IconButton size="small" onClick={() => setIndexManagerOpen(true)}>
            <IndexIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={`删除选中 (${selected.length})`}>
          <span>
            <IconButton size="small" onClick={handleOpenDeleteDialog} disabled={selected.length === 0}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={columnMenuAnchorEl}
        open={isColumnMenuOpen}
        onClose={handleCloseColumnMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
      >
        <MenuItem disabled dense>
          <ListItemText
            primary="可显示列"
            primaryTypographyProps={{ fontSize: '0.78rem', color: 'text.secondary' }}
          />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        {columns.map((column) => {
          const checked = visibleColumns.includes(column);
          const disableHide = checked && visibleColumns.length === 1;
          return (
            <MenuItem
              key={column}
              dense
              onClick={(event) => handleColumnMenuToggle(event, column)}
              disabled={disableHide}
              sx={{ minWidth: 220 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Checkbox
                  edge="start"
                  size="small"
                  checked={checked}
                  onChange={(event) => handleColumnCheckboxChange(event, column)}
                  disableRipple
                  tabIndex={-1}
                />
              </ListItemIcon>
              <ListItemText
                primary={column}
                primaryTypographyProps={{
                  fontSize: '0.85rem'
                }}
              />
            </MenuItem>
          );
        })}
        {columns.length > 0 && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem dense onClick={handleShowAllColumns}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <ViewColumnIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="显示全部列"
                primaryTypographyProps={{ fontSize: '0.85rem' }}
              />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* 数据表格 */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              zIndex: 2
            }}
          />
        )}
        <TableContainer
          sx={{
            flex: 1,
            minHeight: 0,
            bgcolor: 'background.paper',
            overflowX: 'auto',
            overflowY: 'auto'
          }}
        >
          <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{
                  bgcolor: 'background.paper',
                  borderBottom: 1,
                  borderColor: 'divider',
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  width: 48,
                  minWidth: 48,
                  maxWidth: 48
                }}
              >
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < data.length}
                  checked={data.length > 0 && selected.length === data.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: 'background.paper',
                  borderBottom: 1,
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  width: 72,
                  minWidth: 72,
                  position: 'sticky',
                  left: 48,
                  zIndex: 3
                }}
              >
                序号
              </TableCell>
                  {visibleColumns.map((column) => {
                    const isSorted = sortField === column;
                    return (
                      <TableCell
                        key={column}
                        sortDirection={isSorted ? sortDirection : false}
                        sx={{
                          bgcolor: 'background.paper',
                          borderBottom: 1,
                          borderColor: 'divider',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <TableSortLabel
                          active={isSorted}
                          direction={isSorted ? sortDirection : 'asc'}
                          onClick={() => handleSort(column)}
                          hideSortIcon={!isSorted}
                        >
                          {column}
                        </TableSortLabel>
                      </TableCell>
                    );
                  })}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => {
              const isItemSelected = isSelected(index);
                const globalIndex = fromRow + index;
              return (
                <TableRow
                  hover
                  key={index}
                  selected={isItemSelected}
                  onClick={(event) => handleRowClick(event, index)}
                  sx={{
                    cursor: 'pointer',
                    height: 36
                  }}
                >
                  <TableCell
                    padding="checkbox"
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: 'inherit',
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      width: 48,
                      minWidth: 48,
                      maxWidth: 48
                    }}
                  >
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      width: 72,
                      minWidth: 72,
                      bgcolor: 'inherit',
                      position: 'sticky',
                      left: 48,
                      zIndex: 2
                    }}
                  >
                    {globalIndex}
                  </TableCell>
                  {visibleColumns.map((column) => {
                    const isEditing = editingCell && editingCell.rowIndex === index && editingCell.column === column;
                    const cellValue = row[column];
                    return (
                      <TableCell
                        key={column}
                        sx={{
                          borderBottom: 1,
                          borderColor: 'divider',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap',
                          bgcolor: 'inherit',
                          position: 'relative'
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          if (!isSavingCell) {
                            startEditingCell(index, column);
                          }
                        }}
                      >
                        {isEditing ? (
                          <TextField
                            size="small"
                            fullWidth
                            autoFocus
                            value={editingCell.value}
                            onChange={handleEditChange}
                            onBlur={() => void commitEditingCell()}
                            onClick={(event) => event.stopPropagation()}
                            disabled={isSavingCell}
                            InputProps={{
                              sx: {
                                fontSize: '0.8rem',
                                py: 0.25
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void commitEditingCell();
                              } else if (event.key === 'Escape') {
                                event.preventDefault();
                                cancelEditingCell();
                              }
                            }}
                          />
                        ) : (
                          <Tooltip
                            title={cellValue !== null && cellValue !== undefined ? String(cellValue) : ''}
                            disableHoverListener={cellValue === null || cellValue === undefined || String(cellValue) === ''}
                            arrow
                            placement="top-start"
                            enterDelay={600}
                          >
                            <Box component="span">
                              {cellValue !== null && cellValue !== undefined
                                ? highlightMatches(String(cellValue), debouncedSearchTerm, highlightSx)
                                : ''}
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {!loading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={emptyColSpan}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* 分页器 */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          gap: 2,
          position: 'sticky',
          bottom: 0,
          zIndex: 5
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {totalCount === 0
            ? '暂无记录'
            : `记录 ${fromRow.toLocaleString()}-${toRow.toLocaleString()} / ${totalCount.toLocaleString()}`}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            每页 {rowsPerPage} 行
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="减少每页行数">
              <span>
                <IconButton size="small" onClick={handleDecreaseRowsPerPage} disabled={rowsPerPage <= ROWS_PER_PAGE_MIN}>
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="增加每页行数">
              <span>
                <IconButton size="small" onClick={handleIncreaseRowsPerPage} disabled={rowsPerPage >= ROWS_PER_PAGE_MAX}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* 添加行对话框 */}
      <Dialog open={addRowDialogOpen} onClose={handleCloseAddRowDialog} maxWidth="sm" fullWidth>
        <DialogTitle>添加新行</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {columns.map((col, index) => (
              <TextField
                key={col}
                label={col}
                value={newRowData[col] || ''}
                onChange={(e) => handleNewRowDataChange(col, e.target.value)}
                fullWidth
                size="small"
                autoFocus={index === 0}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddRowDialog}>取消</Button>
          <Button
            onClick={handleAddRow}
            variant="contained"
            disabled={isAddingRow}
          >
            {isAddingRow ? <CircularProgress size={20} /> : '添加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除选中的 {selected.length} 行数据吗？此操作无法撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>取消</Button>
          <Button
            onClick={handleDeleteRows}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : '删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导出对话框 */}
      <Dialog open={exportDialogOpen} onClose={handleCloseExportDialog} maxWidth="sm" fullWidth>
        <DialogTitle>导出数据</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">导出格式</FormLabel>
              <RadioGroup
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'sql')}
              >
                <FormControlLabel value="csv" control={<Radio />} label="CSV" />
                <FormControlLabel value="json" control={<Radio />} label="JSON" />
                <FormControlLabel value="sql" control={<Radio />} label="SQL (INSERT 语句)" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label="文件名"
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              size="small"
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              将导出当前页 {data.length} 行数据
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog}>取消</Button>
          <Button onClick={handleExport} variant="contained">
            导出
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入对话框 */}
      <DataImportModal
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        database={database}
        tables={[table]}
        onImportComplete={() => loadData()}
      />

      {/* 索引管理对话框 */}
      <Dialog
        open={indexManagerOpen}
        onClose={() => setIndexManagerOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <IndexManager
          database={database}
          tableName={table}
          onRefresh={() => loadData()}
        />
      </Dialog>
    </Box>
  );
};

export default ExactDataTable;
