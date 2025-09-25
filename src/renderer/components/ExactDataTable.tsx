import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Remove as RemoveIcon,
  ViewColumn as ViewColumnIcon
} from '@mui/icons-material';

interface ExactDataTableProps {
  database: string;
  table: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatches = (text: string, keyword: string): React.ReactNode => {
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
            bgcolor: 'rgba(74, 144, 226, 0.3)',
            color: '#ffffff',
            borderRadius: 0.5,
            px: 0.3
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
  const ROWS_PER_PAGE_MAX = 500;
  const ROWS_PER_PAGE_STEP = 10;

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
          const newlyDiscovered = resolvedColumns.filter(
            (col) => !prevSet.has(col) && !columns.includes(col)
          );

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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
        bgcolor: '#2E2E2E'
      }}>
        <CircularProgress sx={{ color: '#4A90E2' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#2E2E2E'
    }}>
      {/* 工具栏 */}
      <Box sx={{
        p: 1.5,
        borderBottom: '1px solid #555555',
        bgcolor: '#353535',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <TextField
          size="small"
          placeholder="搜索..."
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
            width: 200,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#2E2E2E',
              height: 32,
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
              padding: '6px 8px'
            }
          }}
        />

        <Box sx={{ ml: 2 }}>
          <Typography variant="caption" sx={{ color: '#CCCCCC', display: 'block' }}>
            {`总行数: ${totalCount.toLocaleString()} | 当前: ${fromRow === 0 ? 0 : `${fromRow}-${toRow}`}`}
          </Typography>
          <Typography variant="caption" sx={{ color: '#888888', display: 'block' }}>
            {`第 ${totalCount === 0 ? 0 : page + 1}/${effectiveTotalPages} 页 | 已选 ${selected.length} 行`}
          </Typography>
        </Box>
        
        <Tooltip title="列显示">
          <span>
            <IconButton
              size="small"
              onClick={handleOpenColumnMenu}
              disabled={columns.length === 0}
              sx={{
                color: '#CCCCCC',
                '&:hover': { color: '#4A90E2' },
                '&.Mui-disabled': {
                  color: '#555555'
                }
              }}
            >
              <ViewColumnIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title="刷新">
          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={loading}
            sx={{
              color: '#CCCCCC',
              '&:hover': { color: '#4A90E2' },
              '&.Mui-disabled': {
                color: '#555555'
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="导出">
          <IconButton
            size="small"
            sx={{ color: '#CCCCCC', '&:hover': { color: '#4A90E2' } }}
          >
            <ExportIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="添加">
          <IconButton
            size="small"
            sx={{ color: '#CCCCCC', '&:hover': { color: '#4A90E2' } }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
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
            primaryTypographyProps={{ fontSize: '0.78rem', color: '#888888' }}
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
                  fontSize: '0.85rem',
                  color: disableHide ? '#777777' : '#ffffff'
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
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ m: 1, '& .MuiAlert-message': { color: '#ffffff' } }}
        >
          {error}
        </Alert>
      )}

      {/* 数据表格 */}
      <Box sx={{ position: 'relative', flex: 1 }}>
        {loading && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              zIndex: 2,
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4A90E2'
              }
            }}
          />
        )}
        <TableContainer sx={{ 
          height: '100%',
          bgcolor: '#2E2E2E',
          overflowX: 'auto',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: '#2E2E2E'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#555555',
            borderRadius: 4,
            '&:hover': {
              bgcolor: '#666666'
            }
          }
        }}>
          <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{
                  bgcolor: '#3E3E3E',
                  borderBottom: '1px solid #555555',
                  color: '#ffffff',
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
                  sx={{ color: '#CCCCCC' }}
                />
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: '#3E3E3E',
                  borderBottom: '1px solid #555555',
                  color: '#ffffff',
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
                          bgcolor: '#3E3E3E',
                          borderBottom: '1px solid #555555',
                          color: '#ffffff',
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
                          sx={{
                            color: '#ffffff',
                            '&.Mui-active': {
                              color: '#4A90E2'
                            },
                            '& .MuiTableSortLabel-icon': {
                              color: '#4A90E2'
                            }
                          }}
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
                    '&:hover': {
                      bgcolor: '#3A3A3A !important'
                    },
                    '&.Mui-selected': {
                      bgcolor: '#2E4A6B !important'
                    },
                    '&:hover td': {
                      bgcolor: '#3A3A3A !important'
                    },
                    '&.Mui-selected td': {
                      bgcolor: '#2E4A6B !important'
                    }
                  }}
                >
                  <TableCell
                    padding="checkbox"
                    sx={{
                      borderBottom: '1px solid #555555',
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
                      sx={{ color: '#CCCCCC' }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: '1px solid #555555',
                      color: '#888888',
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
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column}
                      sx={{
                        borderBottom: '1px solid #555555',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        bgcolor: 'inherit'
                      }}
                    >
                      <Tooltip
                        title={row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                        disableHoverListener={row[column] === null || row[column] === undefined || String(row[column]) === ''}
                        arrow
                        placement="top-start"
                        enterDelay={600}
                      >
                        <Box component="span">
                          {row[column] !== null && row[column] !== undefined
                            ? highlightMatches(String(row[column]), debouncedSearchTerm)
                            : ''}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {!loading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={emptyColSpan}
                  sx={{
                    borderBottom: '1px solid #555555',
                    color: '#CCCCCC',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    bgcolor: '#2E2E2E'
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
          borderTop: '1px solid #555555',
          bgcolor: '#353535',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.5,
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#CCCCCC' }}>
              每页行数
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="减少每页行数">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleDecreaseRowsPerPage}
                    disabled={rowsPerPage <= ROWS_PER_PAGE_MIN}
                    sx={{
                      color: '#CCCCCC',
                      '&:hover': { color: '#4A90E2' },
                      '&.Mui-disabled': { color: '#555555' }
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="body2" sx={{ color: '#ffffff', minWidth: 32, textAlign: 'center' }}>
                {rowsPerPage}
              </Typography>
              <Tooltip title="增加每页行数">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleIncreaseRowsPerPage}
                    disabled={rowsPerPage >= ROWS_PER_PAGE_MAX}
                    sx={{
                      color: '#CCCCCC',
                      '&:hover': { color: '#4A90E2' },
                      '&.Mui-disabled': { color: '#555555' }
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        <TablePagination
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100, 200, 500]}
          labelRowsPerPage="每页:"
          labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} 共 ${count} 行`}
          sx={{
            color: '#ffffff',
            '& .MuiTablePagination-select': {
              color: '#ffffff'
            },
            '& .MuiTablePagination-selectIcon': {
              color: '#CCCCCC'
            },
            '& .MuiIconButton-root': {
              color: '#CCCCCC',
              '&:hover': {
                bgcolor: '#4A4A4A'
              },
              '&.Mui-disabled': {
                color: '#666666'
              }
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default ExactDataTable;
