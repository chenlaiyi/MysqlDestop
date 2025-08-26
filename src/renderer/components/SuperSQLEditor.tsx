import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Alert, 
  CircularProgress, 
  Tabs, 
  Tab, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton,
  Chip,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon,
  PlayArrow as ExecuteIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  Download as ExportIcon,
  History as HistoryIcon,
  Code as FormatIcon,
  AccessTime as TimerIcon,
  Storage as DatabaseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import AceEditor from 'react-ace';
import { t } from '../i18n';
import ThemeToggleButton from './ThemeToggleButton';

// Import ace editor modes and themes
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/ext-language_tools';

interface SuperSQLEditorProps {
  currentDatabase: string | null;
}

function SuperSQLEditor({ currentDatabase }: SuperSQLEditorProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [sqlFavorites, setSqlFavorites] = useState<string[]>([]);
  const [editorTheme, setEditorTheme] = useState<string>('monokai');
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [queryStats, setQueryStats] = useState<{rowsAffected?: number, executionTime?: number} | null>(null);
  
  // v1.0.4 新增功能状态
  const [autoComplete, setAutoComplete] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [recentQueries, setRecentQueries] = useState<{query: string, timestamp: Date, executionTime?: number}[]>([]);
  
  const editorRef = useRef<any>(null);

  useEffect(() => {
    fetchSqlHistory();
    fetchSqlFavorites();
    loadRecentQueries();
    
    // v1.0.4 新增：自动保存功能
    if (autoSave) {
      const interval = setInterval(() => {
        if (query.trim()) {
          localStorage.setItem('mysql-client-draft-query', query);
        }
      }, 30000); // 每30秒自动保存
      
      return () => clearInterval(interval);
    }
  }, [autoSave, query]);

  useEffect(() => {
    // 恢复草稿查询
    const draftQuery = localStorage.getItem('mysql-client-draft-query');
    if (draftQuery && !query) {
      setQuery(draftQuery);
    }
  }, []);

  const fetchSqlHistory = async () => {
    const history = await window.mysqlApi.getSqlHistory();
    setSqlHistory(history);
  };

  const fetchSqlFavorites = async () => {
    const favorites = await window.mysqlApi.getFavoriteSql();
    setSqlFavorites(favorites);
  };

  const loadRecentQueries = () => {
    const recent = localStorage.getItem('mysql-client-recent-queries');
    if (recent) {
      setRecentQueries(JSON.parse(recent));
    }
  };

  const saveRecentQuery = (query: string, executionTime?: number) => {
    const newQuery = {
      query,
      timestamp: new Date(),
      executionTime
    };
    
    const updated = [newQuery, ...recentQueries.slice(0, 9)]; // 保留最近10个查询
    setRecentQueries(updated);
    localStorage.setItem('mysql-client-recent-queries', JSON.stringify(updated));
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      setError(t('queryEditor.queryCannotBeEmpty'));
      setResult(null);
      return;
    }

    if (!currentDatabase) {
      setError('请先选择一个数据库');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    const startTime = Date.now();

    try {
      const response = await window.mysqlApi.executeQuery(currentDatabase, query);
      const endTime = Date.now();
      const execTime = endTime - startTime;
      
      setExecutionTime(execTime);
      
      if (response.success) {
        setResult(response.data || []);
        setQueryStats({
          rowsAffected: response.data?.length || 0,
          executionTime: execTime
        });
        
        // 保存到历史记录
        await window.mysqlApi.addSqlHistory(query);
        fetchSqlHistory();
        
        // 保存到最近查询
        saveRecentQuery(query, execTime);
        
        // 清除草稿
        localStorage.removeItem('mysql-client-draft-query');
      } else {
        setError(response.error || t('queryEditor.queryExecutionFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('queryEditor.queryExecutionFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleFormatQuery = () => {
    if (editorRef.current && editorRef.current.editor) {
      const editor = editorRef.current.editor;
      const formatted = query
        .replace(/select/gi, 'SELECT')
        .replace(/from/gi, 'FROM')
        .replace(/where/gi, 'WHERE')
        .replace(/and/gi, 'AND')
        .replace(/or/gi, 'OR')
        .replace(/order by/gi, 'ORDER BY')
        .replace(/group by/gi, 'GROUP BY')
        .replace(/having/gi, 'HAVING')
        .replace(/join/gi, 'JOIN')
        .replace(/inner join/gi, 'INNER JOIN')
        .replace(/left join/gi, 'LEFT JOIN')
        .replace(/right join/gi, 'RIGHT JOIN');
      
      setQuery(formatted);
    }
  };

  const handleSaveQuery = () => {
    if (!query.trim()) return;
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (queryName.trim() && query.trim()) {
      await window.mysqlApi.addFavoriteSql(`-- ${queryName}\\n${query}`);
      fetchSqlFavorites();
      setSaveDialogOpen(false);
      setQueryName('');
    }
  };

  const handleClearEditor = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setQueryStats(null);
    setExecutionTime(null);
    localStorage.removeItem('mysql-client-draft-query');
  };

  const handleExportResults = () => {
    if (!result || result.length === 0) return;
    
    const csv = [
      Object.keys(result[0]).join(','),
      ...result.map(row => Object.values(row).join(','))
    ].join('\\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getQueryComplements = () => {
    return [
      'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'DELETE FROM',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX',
      'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
      'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
      'COUNT(*)', 'SUM()', 'AVG()', 'MIN()', 'MAX()',
      'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE',
      'BETWEEN', 'IS NULL', 'IS NOT NULL'
    ];
  };

  const editorOptions = {
    enableBasicAutocompletion: autoComplete,
    enableLiveAutocompletion: autoComplete,
    enableSnippets: true,
    showLineNumbers: true,
    tabSize: 2,
    fontSize: 14,
    showPrintMargin: false,
    showGutter: true,
    highlightActiveLine: true,
    wrap: true
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* v1.0.4 增强：工具栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DatabaseIcon />
            超级SQL编辑器
            {currentDatabase && (
              <Chip 
                label={currentDatabase} 
                size="small" 
                color="primary"
                variant="outlined"
              />
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggleButton size="small" />
            <Tooltip title="编辑器设置">
              <IconButton 
                size="small"
                onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <ButtonGroup variant="contained" size="small">
            <Button
              onClick={handleExecuteQuery}
              disabled={loading || !query.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
              color="primary"
            >
              {loading ? '执行中...' : '执行查询'}
            </Button>
            <Button
              onClick={handleFormatQuery}
              disabled={!query.trim()}
              startIcon={<FormatIcon />}
            >
              格式化
            </Button>
          </ButtonGroup>

          <ButtonGroup variant="outlined" size="small">
            <Button
              onClick={handleSaveQuery}
              disabled={!query.trim()}
              startIcon={<SaveIcon />}
            >
              保存
            </Button>
            <Button
              onClick={handleClearEditor}
              disabled={!query.trim()}
              startIcon={<ClearIcon />}
            >
              清空
            </Button>
          </ButtonGroup>

          {result && result.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportResults}
              startIcon={<ExportIcon />}
            >
              导出结果
            </Button>
          )}
        </Box>

        {/* 查询统计信息 */}
        {queryStats && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Chip 
              icon={<TimerIcon />}
              label={`执行时间: ${queryStats.executionTime}ms`}
              size="small"
              variant="outlined"
            />
            <Chip 
              label={`影响行数: ${queryStats.rowsAffected}`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </Paper>

      {/* 标签页 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label="SQL编辑器" />
        <Tab label={`历史记录 (${sqlHistory.length})`} />
        <Tab label={`收藏夹 (${sqlFavorites.length})`} />
        <Tab label={`最近查询 (${recentQueries.length})`} />
      </Tabs>

      {/* 内容区域 */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {tabValue === 0 && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* SQL编辑器 */}
            <Box sx={{ height: '40%', mb: 2 }}>
              <AceEditor
                ref={editorRef}
                mode="mysql"
                theme={editorTheme}
                name="sql-editor"
                value={query}
                onChange={setQuery}
                width="100%"
                height="100%"
                setOptions={editorOptions}
                placeholder="在此输入您的SQL查询语句..."
              />
            </Box>

            {/* 错误提示 */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* 查询结果 */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {result && result.length > 0 && (
                <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {Object.keys(result[0]).map((key) => (
                          <TableCell key={key} sx={{ fontWeight: 'bold' }}>
                            {key}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, i) => (
                            <TableCell key={i}>
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {result && result.length === 0 && !error && !loading && (
                <Alert severity="info">
                  查询执行成功，但没有返回数据
                </Alert>
              )}
            </Box>
          </Box>
        )}

        {/* 其他标签页内容保持原样... */}
        {tabValue === 1 && (
          <Paper sx={{ height: '100%', overflow: 'auto' }}>
            {/* 历史记录内容 */}
          </Paper>
        )}
        
        {/* 更多标签页... */}
      </Box>

      {/* 设置菜单 */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={() => setSettingsMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setAutoComplete(!autoComplete);
          setSettingsMenuAnchor(null);
        }}>
          {autoComplete ? '禁用' : '启用'} 自动完成
        </MenuItem>
        <MenuItem onClick={() => {
          setAutoSave(!autoSave);
          setSettingsMenuAnchor(null);
        }}>
          {autoSave ? '禁用' : '启用'} 自动保存
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          setEditorTheme('monokai');
          setSettingsMenuAnchor(null);
        }}>
          深色主题 (Monokai)
        </MenuItem>
        <MenuItem onClick={() => {
          setEditorTheme('github');
          setSettingsMenuAnchor(null);
        }}>
          浅色主题 (GitHub)
        </MenuItem>
      </Menu>

      {/* 保存查询对话框 */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>保存查询</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="查询名称"
            type="text"
            fullWidth
            variant="outlined"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>取消</Button>
          <Button onClick={handleConfirmSave} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SuperSQLEditor;
