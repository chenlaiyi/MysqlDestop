import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Typography,
  Toolbar,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface ExactDataTableProps {
  database: string;
  table: string;
}

const ExactDataTable: React.FC<ExactDataTableProps> = ({ database, table }) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = page * rowsPerPage;
      const result = await window.mysqlApi.getTableData(database, table, rowsPerPage, offset);
      
      if (result.success) {
        setData(result.data || []);
        setTotalCount(result.totalCount || 0);
        
        if (result.data && result.data.length > 0) {
          setColumns(Object.keys(result.data[0]));
        }
      } else {
        setError(result.error || '加载数据失败');
      }
    } catch (err: any) {
      setError(err.message || '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [database, table, page, rowsPerPage]);

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
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title="刷新">
          <IconButton
            size="small"
            onClick={loadData}
            sx={{ color: '#CCCCCC', '&:hover': { color: '#4A90E2' } }}
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
      <TableContainer sx={{ 
        flex: 1,
        bgcolor: '#2E2E2E',
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
                  color: '#ffffff'
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
              {columns.map((column) => (
                <TableCell
                  key={column}
                  sx={{
                    bgcolor: '#3E3E3E',
                    borderBottom: '1px solid #555555',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => {
              const isItemSelected = isSelected(index);
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
                    }
                  }}
                >
                  <TableCell
                    padding="checkbox"
                    sx={{
                      borderBottom: '1px solid #555555',
                      bgcolor: 'inherit'
                    }}
                  >
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      sx={{ color: '#CCCCCC' }}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      sx={{
                        borderBottom: '1px solid #555555',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        bgcolor: 'inherit'
                      }}
                    >
                      {row[column] !== null && row[column] !== undefined
                        ? String(row[column])
                        : ''}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页器 */}
      <Box sx={{
        borderTop: '1px solid #555555',
        bgcolor: '#353535'
      }}>
        <TablePagination
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="每页行数:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 行`}
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
