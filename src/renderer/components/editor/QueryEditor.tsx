import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  FormatAlignLeft as FormatIcon
} from '@mui/icons-material';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/ext-language_tools';

interface QueryEditorProps {
  database: string | null;
  isDark?: boolean;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ database, isDark = true }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);
  const editorRef = useRef<any>(null);

  const handleExecute = async () => {
    if (!query.trim()) {
      setError('请输入 SQL 语句');
      return;
    }

    if (!database) {
      setError('请先选择数据库');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setColumns([]);

    const startTime = Date.now();

    try {
      const response = await window.mysqlApi.executeQuery(database, query);
      const endTime = Date.now();
      setExecutionTime(endTime - startTime);

      if (response.success) {
        const data = response.data || [];
        setResult(data);
        setRowCount(data.length);
        if (data.length > 0) {
          setColumns(Object.keys(data[0]));
        }
        // 保存到历史记录
        try {
          await window.mysqlApi.addSqlHistory(query);
        } catch (e) {
          // 忽略历史记录保存错误
        }
      } else {
        setError(response.error || '查询执行失败');
      }
    } catch (err: any) {
      setError(err.message || '查询执行失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFormat = async () => {
    if (!query.trim()) return;

    setFormatting(true);
    try {
      const response = await window.mysqlApi.formatQuery(query);
      if (response.success && response.data) {
        setQuery(response.data);
      } else {
        setError(response.error || '格式化失败');
      }
    } catch (err: any) {
      setError(err.message || '格式化失败');
    } finally {
      setFormatting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter 执行查询
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
    // Ctrl/Cmd + Shift + F 格式化
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
      e.preventDefault();
      handleFormat();
    }
  };

  const handleCopyResult = () => {
    if (!result || result.length === 0) return;
    const csv = [
      columns.join('\t'),
      ...result.map(row => columns.map(col => row[col] ?? '').join('\t'))
    ].join('\n');
    navigator.clipboard.writeText(csv);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
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
          gap: 1
        }}
      >
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ExecuteIcon />}
          onClick={handleExecute}
          disabled={loading || !query.trim()}
          sx={{ minWidth: 80 }}
        >
          {loading ? '执行中' : '执行'}
        </Button>

        <Tooltip title="格式化 SQL (Ctrl+Shift+F)">
          <span>
            <IconButton
              size="small"
              onClick={handleFormat}
              disabled={formatting || !query.trim()}
            >
              {formatting ? <CircularProgress size={18} /> : <FormatIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        {database && (
          <Chip label={database} size="small" variant="outlined" />
        )}

        <Box sx={{ flex: 1 }} />

        {executionTime !== null && (
          <Typography variant="caption" color="text.secondary">
            耗时: {executionTime}ms
          </Typography>
        )}

        {rowCount > 0 && (
          <>
            <Typography variant="caption" color="text.secondary">
              |
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rowCount} 行
            </Typography>
          </>
        )}

        {result && result.length > 0 && (
          <Tooltip title="复制结果">
            <IconButton size="small" onClick={handleCopyResult}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* SQL 编辑器 */}
      <Box sx={{ height: '40%', minHeight: 150 }} onKeyDown={handleKeyDown}>
        <AceEditor
          ref={editorRef}
          mode="mysql"
          theme={isDark ? 'monokai' : 'github'}
          name="query-editor"
          value={query}
          onChange={setQuery}
          width="100%"
          height="100%"
          fontSize={13}
          showPrintMargin={false}
          showGutter={true}
          highlightActiveLine={true}
          placeholder="输入 SQL 语句... (Ctrl+Enter 执行)"
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            wrap: true
          }}
        />
      </Box>

      {/* 结果区域 */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: 1, borderColor: 'divider' }}>
        {error && (
          <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {result && result.length > 0 && (
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {result.map((row, idx) => (
                  <TableRow key={idx} hover>
                    {columns.map((col) => (
                      <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {result && result.length === 0 && !error && (
          <Box sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
            查询执行成功，无返回数据
          </Box>
        )}

        {!result && !error && !loading && (
          <Box sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
            输入 SQL 语句并点击执行，或按 Ctrl+Enter
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default QueryEditor;
