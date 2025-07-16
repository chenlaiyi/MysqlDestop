import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, CircularProgress, Tabs, Tab, List, ListItem, ListItemText, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import { t } from '../i18n';

interface QueryEditorProps {
  currentDatabase: string | null;
}

function QueryEditor({ currentDatabase }: QueryEditorProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 for editor, 1 for history, 2 for favorites
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [sqlFavorites, setSqlFavorites] = useState<string[]>([]);

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
        await window.mysqlApi.addSqlHistory(query); // Add to history on successful execution
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
    setTabValue(0); // Switch back to editor tab
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
          <TextField
            label={t('queryEditor.sqlQuery')}
            multiline
            rows={10}
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            variant="outlined"
            sx={{ mb: 2, mt: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
          <Button onClick={handleClearHistory} variant="outlined" sx={{ mb: 2 }}>{t('queryEditor.clearHistory')}</Button>
          <List>
            {sqlHistory.length > 0 ? (
              sqlHistory.map((histQuery, index) => (
                <ListItem key={index} secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFavorite(histQuery)}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemText primary={histQuery} onClick={() => handleLoadQuery(histQuery)} sx={{ cursor: 'pointer' }} />
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
                  <ListItemText primary={favQuery} onClick={() => handleLoadQuery(favQuery)} sx={{ cursor: 'pointer' }} />
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

export default QueryEditor;