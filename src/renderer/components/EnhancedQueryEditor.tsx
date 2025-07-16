import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, CircularProgress, Tabs, Tab, List, ListItem, ListItemText, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import AceEditor from 'react-ace';
import { t } from '../i18n';

// Import ace editor modes and themes
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/ext-language_tools';

interface EnhancedQueryEditorProps {
  currentDatabase: string | null;
}

function EnhancedQueryEditor({ currentDatabase }: EnhancedQueryEditorProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [sqlFavorites, setSqlFavorites] = useState<string[]>([]);
  const [theme, setTheme] = useState<'monokai' | 'github'>('monokai');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    fetchSqlHistory();
    fetchSqlFavorites();
  }, []);

  const fetchSqlHistory = async () => {
    const history = await window.mysqlApi.getSqlHistory();
    setSqlHistory(history);
  };

  const fetchSqlFavorites = async () => {
    const favorites = await window.mysqlApi.getFavoriteSql();
    setSqlFavorites(favorites);
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      setError(t('queryEditor.queryCannotBeEmpty'));
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await window.mysqlApi.executeQuery(query, currentDatabase || undefined);
      if (response.success) {
        setResult(response.data || null);
        await window.mysqlApi.addSqlHistory(query);
        fetchSqlHistory();
      } else {
        setError(response.error || t('connectionForm.anUnknownErrorOccurred'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleFormatQuery = async () => {
    if (!query.trim()) {
      setError(t('queryEditor.queryCannotBeEmpty'));
      return;
    }
    try {
      const response = await window.mysqlApi.formatQuery(query);
      if (response.success) {
        setQuery(response.data || '');
        setError(null);
      } else {
        setError(response.error || t('connectionForm.anUnknownErrorOccurred'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    }
  };

  const handleAddFavorite = async () => {
    if (!query.trim()) {
      setError(t('queryEditor.queryCannotBeEmpty'));
      return;
    }
    await window.mysqlApi.addFavoriteSql(query);
    fetchSqlFavorites();
  };

  const handleRemoveFavorite = async (favQuery: string) => {
    await window.mysqlApi.removeFavoriteSql(favQuery);
    fetchSqlFavorites();
  };

  const handleClearHistory = async () => {
    await window.mysqlApi.clearSqlHistory();
    fetchSqlHistory();
  };

  const handleLoadQuery = (q: string) => {
    setQuery(q);
    setTabValue(0);
  };

  const handleEditorLoad = (editor: any) => {
    editorRef.current = editor;
    
    // Add MySQL keywords for autocomplete
    const mysqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
      'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'UNION', 'GROUP', 'ORDER', 'BY',
      'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'BETWEEN', 'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'FOREIGN',
      'UNIQUE', 'AUTO_INCREMENT', 'DEFAULT', 'CHECK', 'CONSTRAINT'
    ];

    const mysqlFunctions = [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER',
      'DATE', 'NOW', 'CURDATE', 'CURTIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND'
    ];

    const mysqlDataTypes = [
      'INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'FLOAT', 'DOUBLE',
      'DECIMAL', 'BLOB', 'JSON', 'CHAR', 'BINARY', 'VARBINARY', 'TINYINT', 'SMALLINT',
      'MEDIUMINT', 'BIGINT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT'
    ];

    const allCompletions = [
      ...mysqlKeywords.map(word => ({ name: word, value: word, meta: 'keyword' })),
      ...mysqlFunctions.map(word => ({ name: word, value: word + '()', meta: 'function' })),
      ...mysqlDataTypes.map(word => ({ name: word, value: word, meta: 'datatype' }))
    ];

    const langTools = (window as any).ace.require('ace/ext/language_tools');
    const customCompleter = {
      getCompletions: function(editor: any, session: any, pos: any, prefix: any, callback: any) {
        callback(null, allCompletions);
      }
    };
    
    langTools.addCompleter(customCompleter);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{t('queryEditor.sqlQueryEditor')}</Typography>
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} aria-label="query editor tabs">
        <Tab label={t('queryEditor.editorTab')} />
        <Tab label={t('queryEditor.historyTab')} />
        <Tab label={t('queryEditor.favoritesTab')} />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Box sx={{ mb: 2, mt: 2 }}>
            <AceEditor
              mode="mysql"
              theme={theme}
              value={query}
              onChange={setQuery}
              name="sql-editor"
              editorProps={{ $blockScrolling: true }}
              onLoad={handleEditorLoad}
              fontSize={14}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              width="100%"
              height="300px"
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
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleExecuteQuery}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('queryEditor.executeQuery')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleFormatQuery}
              disabled={loading}
            >
              {t('queryEditor.formatQuery')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleAddFavorite}
              disabled={loading}
              startIcon={<FavoriteBorderIcon />}
            >
              {t('queryEditor.addFavorite')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setTheme(theme === 'monokai' ? 'github' : 'monokai')}
            >
              {theme === 'monokai' ? 'Light Theme' : 'Dark Theme'}
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {result && result.length > 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(result[0]).map((key) => (
                      <TableCell key={key}>{key}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, i) => (
                        <TableCell key={i}>{String(value)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {result && result.length === 0 && !error && !loading && (
            <Alert severity="info">{t('queryEditor.queryExecutedSuccessfullyNoRowsReturned')}</Alert>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box sx={{ mt: 2 }}>
          <Button onClick={handleClearHistory} variant="outlined" sx={{ mb: 2 }}>
            {t('queryEditor.clearHistory')}
          </Button>
          <List>
            {sqlHistory.length > 0 ? (
              sqlHistory.map((histQuery, index) => (
                <ListItem key={index} secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFavorite(histQuery)}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemText 
                    primary={histQuery} 
                    onClick={() => handleLoadQuery(histQuery)} 
                    sx={{ cursor: 'pointer' }} 
                  />
                </ListItem>
              ))
            ) : (
              <Typography>{t('queryEditor.noHistory')}</Typography>
            )}
          </List>
        </Box>
      )}

      {tabValue === 2 && (
        <Box sx={{ mt: 2 }}>
          <List>
            {sqlFavorites.length > 0 ? (
              sqlFavorites.map((favQuery, index) => (
                <ListItem key={index} secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFavorite(favQuery)}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemText 
                    primary={favQuery} 
                    onClick={() => handleLoadQuery(favQuery)} 
                    sx={{ cursor: 'pointer' }} 
                  />
                </ListItem>
              ))
            ) : (
              <Typography>{t('queryEditor.noFavorites')}</Typography>
            )}
          </List>
        </Box>
      )}
    </Box>
  );
}

export default EnhancedQueryEditor;
