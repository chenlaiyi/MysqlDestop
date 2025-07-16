import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  TextField
} from '@mui/material';
import {
  Event as EventIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface EventsPanelProps {
  database: string;
  onEventSelect?: (eventName: string, eventData: any) => void;
}

interface EventInfo {
  EVENT_NAME: string;
  EVENT_TYPE: string;
  EXECUTE_AT: string | null;
  INTERVAL_VALUE: number | null;
  INTERVAL_FIELD: string | null;
  STATUS: string;
  EVENT_DEFINITION: string;
  DEFINER: string;
  CREATED: string;
  LAST_ALTERED: string;
  EVENT_COMMENT: string;
}

function EventsPanel({ database, onEventSelect }: EventsPanelProps) {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);
  const [eventDefinitionDialog, setEventDefinitionDialog] = useState(false);
  const [eventDefinition, setEventDefinition] = useState<string>('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const loadEvents = async () => {
    if (!database) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).mysqlApi.getEvents(database);
      if (result.success) {
        setEvents(result.data);
      } else {
        setError(result.error || '获取事件失败');
      }
    } catch (err) {
      setError('获取事件时发生错误');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventDefinition = async (eventName: string) => {
    try {
      const result = await (window as any).mysqlApi.getEventDefinition(database, eventName);
      if (result.success && result.data.length > 0) {
        setEventDefinition(result.data[0]['Create Event'] || '');
        setEventDefinitionDialog(true);
      } else {
        setError('获取事件定义失败');
      }
    } catch (err) {
      setError('获取事件定义时发生错误');
      console.error('Error loading event definition:', err);
    }
  };

  const toggleEventExpand = (eventName: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventName)) {
      newExpanded.delete(eventName);
    } else {
      newExpanded.add(eventName);
    }
    setExpandedEvents(newExpanded);
  };

  const handleEventSelect = (event: EventInfo) => {
    setSelectedEvent(event);
    if (onEventSelect) {
      onEventSelect(event.EVENT_NAME, event);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ENABLED':
        return 'success';
      case 'DISABLED':
        return 'error';
      case 'SLAVESIDE_DISABLED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (eventType: string) => {
    switch (eventType.toUpperCase()) {
      case 'ONE TIME':
        return <PlayIcon fontSize="small" />;
      case 'RECURRING':
        return <ScheduleIcon fontSize="small" />;
      default:
        return <EventIcon fontSize="small" />;
    }
  };

  const formatInterval = (event: EventInfo) => {
    if (event.EVENT_TYPE === 'ONE TIME') {
      return event.EXECUTE_AT ? `执行时间: ${formatDate(event.EXECUTE_AT)}` : '一次性事件';
    } else if (event.EVENT_TYPE === 'RECURRING') {
      if (event.INTERVAL_VALUE && event.INTERVAL_FIELD) {
        return `每 ${event.INTERVAL_VALUE} ${event.INTERVAL_FIELD}`;
      }
      return '循环事件';
    }
    return '未知类型';
  };

  useEffect(() => {
    loadEvents();
  }, [database]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          加载事件中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={loadEvents} startIcon={<RefreshIcon />}>
          重试
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon color="warning" />
            事件 ({events.length})
          </Typography>
          <IconButton size="small" onClick={loadEvents} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Events List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {events.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              该数据库中没有事件
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              事件调度器可能未启用，或当前用户没有查看事件的权限
            </Typography>
          </Box>
        ) : (
          <List dense>
            {events.map((event) => (
              <React.Fragment key={event.EVENT_NAME}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleEventSelect(event)}
                    selected={selectedEvent?.EVENT_NAME === event.EVENT_NAME}
                  >
                    <ListItemIcon>
                      {getTypeIcon(event.EVENT_TYPE)}
                    </ListItemIcon>
                    <ListItemText
                      primary={event.EVENT_NAME}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip 
                            label={event.STATUS} 
                            size="small" 
                            color={getStatusColor(event.STATUS)}
                            variant="outlined"
                          />
                          <Chip 
                            label={event.EVENT_TYPE} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {event.DEFINER}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEventExpand(event.EVENT_NAME);
                      }}
                    >
                      {expandedEvents.has(event.EVENT_NAME) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </ListItemButton>
                </ListItem>

                <Collapse in={expandedEvents.has(event.EVENT_NAME)} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                    <Card variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          事件信息
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            创建时间: {formatDate(event.CREATED)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            最后修改: {formatDate(event.LAST_ALTERED)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            类型: {event.EVENT_TYPE}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            状态: {event.STATUS}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {formatInterval(event)}
                        </Typography>
                        {event.EVENT_COMMENT && (
                          <Typography variant="body2" color="text.secondary">
                            注释: {event.EVENT_COMMENT}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions sx={{ pt: 0 }}>
                        <Button
                          size="small"
                          startIcon={<CodeIcon />}
                          onClick={() => loadEventDefinition(event.EVENT_NAME)}
                        >
                          查看定义
                        </Button>
                        <Button
                          size="small"
                          startIcon={<InfoIcon />}
                          onClick={() => handleEventSelect(event)}
                        >
                          详细信息
                        </Button>
                      </CardActions>
                    </Card>
                  </Box>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Event Definition Dialog */}
      <Dialog
        open={eventDefinitionDialog}
        onClose={() => setEventDefinitionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          事件定义 - {selectedEvent?.EVENT_NAME}
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={15}
            value={eventDefinition}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDefinitionDialog(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EventsPanel;
