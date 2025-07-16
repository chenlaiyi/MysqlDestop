import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { t } from '../i18n';

interface PerformanceMonitorProps {
  currentDatabase: string | null;
}

function PerformanceMonitor({ currentDatabase }: PerformanceMonitorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processlist, setProcesslist] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({});
  const [variables, setVariables] = useState<any>({});
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadPerformanceData();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const loadPerformanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load process list
      const processlistResult = await window.mysqlApi.executeQuery('SHOW PROCESSLIST');
      if (processlistResult.success) {
        setProcesslist(processlistResult.data || []);
      }

      // Load server status
      const statusResult = await window.mysqlApi.executeQuery('SHOW STATUS');
      if (statusResult.success) {
        const statusObj: any = {};
        statusResult.data?.forEach((row: any) => {
          statusObj[row.Variable_name] = row.Value;
        });
        setStatus(statusObj);
      }

      // Load server variables
      const variablesResult = await window.mysqlApi.executeQuery('SHOW VARIABLES');
      if (variablesResult.success) {
        const variablesObj: any = {};
        variablesResult.data?.forEach((row: any) => {
          variablesObj[row.Variable_name] = row.Value;
        });
        setVariables(variablesObj);
      }

      // Load slow queries if slow query log is enabled
      if (variables.slow_query_log === 'ON') {
        const slowQueryResult = await window.mysqlApi.executeQuery(
          `SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10`
        );
        if (slowQueryResult.success) {
          setSlowQueries(slowQueryResult.data || []);
        }
      }

    } catch (err: any) {
      setError(err.message || t('performanceMonitor.loadDataFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = (command: string) => {
    switch (command) {
      case 'Sleep': return 'default';
      case 'Query': return 'primary';
      case 'Connect': return 'success';
      default: return 'secondary';
    }
  };

  const formatBytes = (bytes: string | number) => {
    const num = parseInt(bytes.toString());
    if (isNaN(num)) return bytes;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (num === 0) return '0 Bytes';
    const i = Math.floor(Math.log(num) / Math.log(1024));
    return Math.round(num / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: string | number) => {
    const n = parseInt(num.toString());
    if (isNaN(n)) return num;
    return n.toLocaleString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">{t('performanceMonitor.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('performanceMonitor.refreshInterval')}</InputLabel>
            <Select
              value={refreshInterval}
              label={t('performanceMonitor.refreshInterval')}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <MenuItem value={5}>5s</MenuItem>
              <MenuItem value={10}>10s</MenuItem>
              <MenuItem value={30}>30s</MenuItem>
              <MenuItem value={60}>60s</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? t('performanceMonitor.stopAutoRefresh') : t('performanceMonitor.startAutoRefresh')}
          </Button>
          <Button variant="contained" onClick={loadPerformanceData} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : t('performanceMonitor.refresh')}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Server Overview */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 250, flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('performanceMonitor.connections')}</Typography>
              <Typography variant="h4" color="primary">
                {formatNumber(status.Threads_connected || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('performanceMonitor.maxConnections')}: {formatNumber(variables.max_connections || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ minWidth: 250, flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('performanceMonitor.queries')}</Typography>
              <Typography variant="h4" color="success.main">
                {formatNumber(status.Queries || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('performanceMonitor.qps')}: {Math.round((status.Queries || 0) / (status.Uptime || 1))}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ minWidth: 250, flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('performanceMonitor.innodb')}</Typography>
              <Typography variant="h4" color="info.main">
                {formatBytes(status.Innodb_buffer_pool_bytes_data || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('performanceMonitor.bufferPool')}: {formatBytes(variables.innodb_buffer_pool_size || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ minWidth: 250, flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('performanceMonitor.uptime')}</Typography>
              <Typography variant="h4" color="warning.main">
                {Math.floor((status.Uptime || 0) / 86400)}d
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.floor(((status.Uptime || 0) % 86400) / 3600)}h {Math.floor(((status.Uptime || 0) % 3600) / 60)}m
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Process List */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('performanceMonitor.processlist')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('performanceMonitor.id')}</TableCell>
                  <TableCell>{t('performanceMonitor.user')}</TableCell>
                  <TableCell>{t('performanceMonitor.host')}</TableCell>
                  <TableCell>{t('performanceMonitor.database')}</TableCell>
                  <TableCell>{t('performanceMonitor.command')}</TableCell>
                  <TableCell>{t('performanceMonitor.time')}</TableCell>
                  <TableCell>{t('performanceMonitor.state')}</TableCell>
                  <TableCell>{t('performanceMonitor.info')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processlist.map((process, index) => (
                  <TableRow key={index}>
                    <TableCell>{process.Id}</TableCell>
                    <TableCell>{process.User}</TableCell>
                    <TableCell>{process.Host}</TableCell>
                    <TableCell>{process.db || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={process.Command} 
                        size="small" 
                        color={getConnectionStatus(process.Command)}
                      />
                    </TableCell>
                    <TableCell>{process.Time}s</TableCell>
                    <TableCell>{process.State || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {process.Info || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Slow Queries */}
      {variables.slow_query_log === 'ON' && slowQueries.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>{t('performanceMonitor.slowQueries')}</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('performanceMonitor.startTime')}</TableCell>
                    <TableCell>{t('performanceMonitor.userHost')}</TableCell>
                    <TableCell>{t('performanceMonitor.queryTime')}</TableCell>
                    <TableCell>{t('performanceMonitor.lockTime')}</TableCell>
                    <TableCell>{t('performanceMonitor.rowsExamined')}</TableCell>
                    <TableCell>{t('performanceMonitor.sqlText')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slowQueries.map((query, index) => (
                    <TableRow key={index}>
                      <TableCell>{query.start_time}</TableCell>
                      <TableCell>{query.user_host}</TableCell>
                      <TableCell>{query.query_time}s</TableCell>
                      <TableCell>{query.lock_time}s</TableCell>
                      <TableCell>{query.rows_examined}</TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {query.sql_text}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default PerformanceMonitor;
