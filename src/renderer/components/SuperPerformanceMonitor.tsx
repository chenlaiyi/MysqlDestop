import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  QueryStats as QueryStatsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface PerformanceData {
  connections: {
    total: number;
    active: number;
    max: number;
  };
  queries: {
    total: number;
    slow: number;
    avgTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface SuperPerformanceMonitorProps {
  currentDatabase?: string;
}

const SuperPerformanceMonitor: React.FC<SuperPerformanceMonitorProps> = ({ currentDatabase }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5秒
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [processlist, setProcesslist] = useState<any[]>([]);

  useEffect(() => {
    fetchPerformanceData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 模拟性能数据获取 - 在实际应用中这里会调用真实的API
      const mockData: PerformanceData = {
        connections: {
          total: Math.floor(Math.random() * 100) + 20,
          active: Math.floor(Math.random() * 50) + 10,
          max: 151
        },
        queries: {
          total: Math.floor(Math.random() * 10000) + 5000,
          slow: Math.floor(Math.random() * 10) + 2,
          avgTime: Math.random() * 100 + 50
        },
        memory: {
          used: Math.floor(Math.random() * 8000) + 2000,
          total: 16384,
          percentage: 0
        },
        storage: {
          used: Math.floor(Math.random() * 50000) + 10000,
          total: 100000,
          percentage: 0
        },
        uptime: Math.floor(Math.random() * 1000000) + 500000,
        status: 'healthy'
      };

      // 计算百分比
      mockData.memory.percentage = (mockData.memory.used / mockData.memory.total) * 100;
      mockData.storage.percentage = (mockData.storage.used / mockData.storage.total) * 100;

      // 确定状态
      if (mockData.memory.percentage > 90 || mockData.storage.percentage > 90) {
        mockData.status = 'critical';
      } else if (mockData.memory.percentage > 75 || mockData.storage.percentage > 75 || mockData.queries.slow > 5) {
        mockData.status = 'warning';
      }

      setPerformanceData(mockData);

      // 获取慢查询
      const slowQueriesData = [
        {
          query: 'SELECT * FROM large_table WHERE complex_condition...',
          time: 15.6,
          database: currentDatabase || 'test_db',
          timestamp: new Date()
        },
        {
          query: 'UPDATE users SET status = 1 WHERE created_at < ...',
          time: 8.2,
          database: currentDatabase || 'test_db',
          timestamp: new Date()
        }
      ];
      setSlowQueries(slowQueriesData);

      // 获取进程列表
      const processData = [
        {
          id: 1,
          user: 'root',
          host: 'localhost',
          db: currentDatabase || 'test_db',
          command: 'Query',
          time: 0,
          state: 'executing',
          info: 'SELECT * FROM users'
        },
        {
          id: 2,
          user: 'app_user',
          host: '192.168.1.100',
          db: currentDatabase || 'app_db',
          command: 'Sleep',
          time: 300,
          state: 'waiting',
          info: null
        }
      ];
      setProcesslist(processData);

    } catch (err: any) {
      setError(err.message || '获取性能数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <CheckCircleIcon color="info" />;
    }
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <IconButton size="small" onClick={fetchPerformanceData} sx={{ ml: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 标题和控制 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon color="primary" />
          性能监控中心
          {currentDatabase && (
            <Chip label={currentDatabase} size="small" color="primary" variant="outlined" />
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="自动刷新"
          />
          
          <Tooltip title="手动刷新">
            <IconButton onClick={fetchPerformanceData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {performanceData && (
        <>
          {/* 系统状态概览 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getStatusIcon(performanceData.status)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    系统状态
                  </Typography>
                </Box>
                <Chip 
                  label={performanceData.status === 'healthy' ? '健康' : 
                         performanceData.status === 'warning' ? '警告' : '严重'} 
                  color={getStatusColor(performanceData.status) as any}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  运行时间: {formatUptime(performanceData.uptime)}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <StorageIcon color="primary" />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    连接数
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {performanceData.connections.active}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  总计: {performanceData.connections.total} / 最大: {performanceData.connections.max}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <QueryStatsIcon color="primary" />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    查询统计
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {performanceData.queries.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  慢查询: {performanceData.queries.slow} | 平均: {performanceData.queries.avgTime.toFixed(1)}ms
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SpeedIcon color="primary" />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    性能指标
                  </Typography>
                </Box>
                <Typography variant="h4" color={performanceData.queries.avgTime > 100 ? 'error' : 'success'}>
                  {performanceData.queries.avgTime.toFixed(1)}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  平均响应时间
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* 资源使用情况 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <MemoryIcon sx={{ mr: 1 }} />
                内存使用
              </Typography>
              <Box sx={{ mb: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceData.memory.percentage}
                  color={performanceData.memory.percentage > 80 ? 'error' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatBytes(performanceData.memory.used * 1024 * 1024)} / {formatBytes(performanceData.memory.total * 1024 * 1024)} 
                ({performanceData.memory.percentage.toFixed(1)}%)
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <StorageIcon sx={{ mr: 1 }} />
                存储使用
              </Typography>
              <Box sx={{ mb: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceData.storage.percentage}
                  color={performanceData.storage.percentage > 80 ? 'error' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatBytes(performanceData.storage.used * 1024 * 1024)} / {formatBytes(performanceData.storage.total * 1024 * 1024)} 
                ({performanceData.storage.percentage.toFixed(1)}%)
              </Typography>
            </Paper>
          </Box>

          {/* 详细信息 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <WarningIcon sx={{ mr: 1 }} />
                慢查询记录
              </Typography>
              {slowQueries.length > 0 ? (
                <List dense>
                  {slowQueries.map((query, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <TrendingUpIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={query.query.substring(0, 50) + '...'}
                        secondary={`执行时间: ${query.time}s | 数据库: ${query.database}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  暂无慢查询记录
                </Typography>
              )}
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <QueryStatsIcon sx={{ mr: 1 }} />
                活动进程
              </Typography>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>用户</TableCell>
                      <TableCell>数据库</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>时间</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {processlist.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell>{process.id}</TableCell>
                        <TableCell>{process.user}</TableCell>
                        <TableCell>{process.db}</TableCell>
                        <TableCell>
                          <Chip 
                            label={process.state} 
                            size="small"
                            color={process.command === 'Query' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{process.time}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </>
      )}

      {loading && !performanceData && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <LinearProgress sx={{ width: '50%' }} />
        </Box>
      )}
    </Box>
  );
};

export default SuperPerformanceMonitor;
