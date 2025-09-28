import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Button
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  RefreshRounded as RefreshIcon,
  SearchRounded as SearchIcon,
  MoreVertRounded as MoreIcon
} from '@mui/icons-material';

interface TableInfo {
  name: string;
  engine: string | null;
  rows: number | null;
  data_length: number | null;
  index_length: number | null;
  auto_increment: number | null;
  create_time: string | null;
  update_time: string | null;
  table_comment: string | null;
}

interface DatabaseObjectsViewProps {
  database?: string | null;
  onOpenTable: (tableName: string) => void;
  onAction?: (action: ObjectActionKey, tableName: string) => void;
}

export type ObjectActionKey =
  | 'open'
  | 'design'
  | 'new'
  | 'delete'
  | 'truncate'
  | 'copy'
  | 'rename'
  | 'refresh';

const objectActionGroups: Array<{ key: ObjectActionKey; label: string; disabled?: boolean; danger?: boolean }[]> = [
  [
    { key: 'open', label: '打开表' },
    { key: 'design', label: '设计表' }
  ],
  [
    { key: 'new', label: '新建表' },
    { key: 'copy', label: '复制表' },
    { key: 'rename', label: '重命名' }
  ],
  [
    { key: 'truncate', label: '清空表', danger: true },
    { key: 'delete', label: '删除表', danger: true }
  ],
  [
    { key: 'refresh', label: '刷新' }
  ]
];

const formatBytes = (value: number | null) => {
  if (value == null) return '-';
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(value) / Math.log(1024));
  const size = value / Math.pow(1024, index);
  return `${size.toFixed(2)} ${units[index]}`;
};

const formatNumber = (value: number | null) => {
  if (value == null) return '-';
  return value.toLocaleString();
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
};

const DatabaseObjectsView: React.FC<DatabaseObjectsViewProps> = ({ database, onOpenTable, onAction }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    table: TableInfo;
  } | null>(null);
  const [designDialog, setDesignDialog] = useState<{ table: string; createSQL: string } | null>(null);
  const [pending, setPending] = useState(false);

  const fetchTables = async () => {
    if (!database) return;
    setLoading(true);
    setError(null);
    try {
      const response = await window.mysqlApi.getTableDetails(database);
      if (response.success) {
        setTables(response.data || []);
      } else {
        setError(response.error || '获取表信息失败');
      }
    } catch (err: any) {
      setError(err.message || '获取表信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (database) {
      fetchTables();
    } else {
      setTables([]);
    }
  }, [database]);

  const filteredTables = useMemo(() => {
    if (!search) return tables;
    return tables.filter((table) => {
      const target = `${table.name} ${table.table_comment ?? ''}`.toLowerCase();
      return target.includes(search.toLowerCase());
    });
  }, [tables, search]);

  const handleContextClose = () => setContextMenu(null);

  const sanitizeIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

  const execQueries = async (queries: string[], successMsg?: string) => {
    if (!database || queries.length === 0) return;
    setPending(true);
    try {
      for (const sql of queries) {
        const result = await window.mysqlApi.executeQuery(sql, database);
        if (!result.success) {
          throw new Error(result.error || '执行失败');
        }
      }
      if (successMsg) {
        window.alert(successMsg);
      }
      await fetchTables();
      if (contextMenu) {
        onAction?.('refresh', contextMenu.table.name);
      }
    } catch (err: any) {
      window.alert(err.message || err || '执行失败');
    } finally {
      setPending(false);
    }
  };

  const handleAction = async (action: ObjectActionKey) => {
    if (!contextMenu) return;
    const tableName = contextMenu.table.name;
    switch (action) {
      case 'open':
        onOpenTable(tableName);
        break;
      case 'design': {
        if (!database) break;
        setPending(true);
        try {
          const sql = `SHOW CREATE TABLE ${sanitizeIdentifier(tableName)}`;
          const res = await window.mysqlApi.executeQuery(sql, database);
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const createSQL = res.data[0]['Create Table'] || res.data[0]['Create View'] || JSON.stringify(res.data[0], null, 2);
            setDesignDialog({ table: tableName, createSQL });
            onAction?.(action, tableName);
          } else {
            throw new Error(res.error || '未获取到建表语句');
          }
        } catch (err: any) {
          window.alert(err.message || '获取建表语句失败');
        } finally {
          setPending(false);
        }
        break;
      }
      case 'new': {
        const newName = window.prompt('请输入新表名称 (默认包含 id 自增主键)', `${tableName}_copy`);
        if (!newName) break;
        const sql = `CREATE TABLE ${sanitizeIdentifier(newName)} (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n)`;
        await execQueries([sql], `已创建表 ${newName}`);
        onAction?.(action, tableName);
        break;
      }
      case 'copy': {
        const copyName = window.prompt('请输入复制后的表名称', `${tableName}_copy`);
        if (!copyName) break;
        await execQueries([
          `CREATE TABLE ${sanitizeIdentifier(copyName)} LIKE ${sanitizeIdentifier(tableName)};`,
          `INSERT INTO ${sanitizeIdentifier(copyName)} SELECT * FROM ${sanitizeIdentifier(tableName)};`
        ], `已复制表到 ${copyName}`);
        onAction?.(action, tableName);
        break;
      }
      case 'rename': {
        const newName = window.prompt('请输入新的表名', tableName);
        if (!newName || newName === tableName) break;
        await execQueries(
          [`RENAME TABLE ${sanitizeIdentifier(tableName)} TO ${sanitizeIdentifier(newName)};`],
          `已将表重命名为 ${newName}`
        );
        onAction?.(action, tableName);
        break;
      }
      case 'truncate': {
        if (window.confirm(`确定要清空表 ${tableName} 吗？此操作不可恢复。`)) {
          await execQueries([
            `TRUNCATE TABLE ${sanitizeIdentifier(tableName)};`
          ], `已清空表 ${tableName}`);
          onAction?.(action, tableName);
        }
        break;
      }
      case 'delete': {
        if (window.confirm(`确定要删除表 ${tableName} 吗？此操作不可恢复。`)) {
          if (database) {
            setPending(true);
            try {
              const res = await window.mysqlApi.dropTable(database, tableName);
              if (!res.success) {
                throw new Error(res.error || '删除失败');
              }
              window.alert(`已删除表 ${tableName}`);
              await fetchTables();
              onAction?.(action, tableName);
            } catch (err: any) {
              window.alert(err.message || '删除失败');
            } finally {
              setPending(false);
            }
          }
        }
        break;
      }
      case 'refresh':
        await fetchTables();
        onAction?.(action, tableName);
        break;
      default:
        console.info(`Action "${action}" triggered for table ${tableName}`);
    }
    handleContextClose();
  };

  const surface = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.98);
  const headerBg = theme.palette.mode === 'dark'
    ? '#1c2332'
    : '#f2f5ff';
  const borderColor = alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.08 : 0.16);

  if (!database) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: surface,
          border: `1px dashed ${borderColor}`
        }}
      >
        <Typography variant="h6" color="text.secondary">
          请选择数据库以查看对象信息
        </Typography>
        <Typography variant="body2" color="text.secondary">
          在左侧导航中选择数据库，或通过顶部工具新建连接。
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: surface,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.08),
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <TextField
          size="small"
          placeholder="搜索表名或备注..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 260 }}
        />
        <Tooltip title="刷新">
          <span>
            <IconButton onClick={fetchTables} disabled={loading || pending}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {loading
            ? '加载中...'
            : `共 ${tables.length} 个表 · 当前筛选 ${filteredTables.length} 个`}
        </Typography>
      </Box>

      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.16 : 0.3)
          }
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Table size="small" stickyHeader sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }}>名</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }} align="right">
                  行
                </TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }} align="right">
                  数据长度
                </TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }} align="right">
                  索引长度
                </TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }}>引擎</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }}>自增</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }}>创建日期</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }}>修改日期</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 5 }}>备注</TableCell>
                <TableCell sx={{ width: 48, backgroundColor: headerBg, position: 'sticky', top: 0, zIndex: 6 }}>
                  <MoreIcon fontSize="small" color="disabled" />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTables.map((table) => (
                <TableRow
                  key={table.name}
                  hover
                  onDoubleClick={() => onOpenTable(table.name)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({
                      mouseX: event.clientX + 2,
                      mouseY: event.clientY - 6,
                      table
                    });
                  }}
                  sx={{ cursor: 'default' }}
                >
                  <TableCell>{table.name}</TableCell>
                  <TableCell align="right">{formatNumber(table.rows)}</TableCell>
                  <TableCell align="right">{formatBytes(table.data_length)}</TableCell>
                  <TableCell align="right">{formatBytes(table.index_length)}</TableCell>
                  <TableCell>{table.engine ?? '-'}</TableCell>
                  <TableCell>{table.auto_increment ?? '-'}</TableCell>
                  <TableCell>{formatDate(table.create_time)}</TableCell>
                  <TableCell>{formatDate(table.update_time)}</TableCell>
                  <TableCell>{table.table_comment || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setContextMenu({
                          mouseX: event.clientX + 2,
                          mouseY: event.clientY - 6,
                          table
                        });
                      }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTables.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {search ? '没有匹配的表' : '未找到表信息'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Divider sx={{ borderColor }} />

      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.03 : 0.06)
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {database ? `${database} · 共 ${tables.length} 张表` : '未选择数据库'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          右键表名称以查看更多操作
        </Typography>
      </Box>

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleContextClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {contextMenu.table.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {contextMenu.table.table_comment || '无备注'}
            </Typography>
          </Box>
        )}
        <Divider />
        {objectActionGroups.map((group, groupIndex) => (
          <Box key={`group-${groupIndex}`} sx={{ minWidth: 180 }}>
            {group.map((action) => (
              <MenuItem
                key={action.key}
                onClick={() => handleAction(action.key)}
                disabled={pending || action.disabled}
                sx={{
                  color: action.danger ? theme.palette.error.main : undefined,
                  fontWeight: action.danger ? 600 : undefined
                }}
              >
                {action.label}
              </MenuItem>
            ))}
            {groupIndex !== objectActionGroups.length - 1 && <Divider />}
          </Box>
        ))}
      </Menu>

      <Dialog
        open={Boolean(designDialog)}
        onClose={() => setDesignDialog(null)}
        fullWidth
        maxWidth="md"
      >
        {designDialog && (
          <>
            <DialogTitle>{`设计表 · ${designDialog.table}`}</DialogTitle>
            <DialogContent dividers>
              <TextField
                fullWidth
                multiline
                minRows={12}
                value={designDialog.createSQL}
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDesignDialog(null)}>关闭</Button>
              <Button
                onClick={() => {
                  navigator.clipboard
                    .writeText(designDialog.createSQL)
                    .then(() => window.alert('已复制建表语句'))
                    .catch((err) => window.alert(err.message || '复制失败'));
                }}
              >
                复制 SQL
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default DatabaseObjectsView;
