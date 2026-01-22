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
  Visibility as ViewIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Edit as EditIcon
} from '@mui/icons-material';

interface ViewsPanelProps {
  database: string;
  onViewSelect?: (viewName: string, viewData: any) => void;
}

interface ViewInfo {
  VIEW_NAME: string;
  VIEW_DEFINITION: string;
  CHECK_OPTION: string;
  IS_UPDATABLE: string;
  DEFINER: string;
  SECURITY_TYPE: string;
}

function ViewsPanel({ database, onViewSelect }: ViewsPanelProps) {
  const [views, setViews] = useState<ViewInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<ViewInfo | null>(null);
  const [viewDefinitionDialog, setViewDefinitionDialog] = useState(false);
  const [viewDefinition, setViewDefinition] = useState<string>('');
  const [expandedViews, setExpandedViews] = useState<Set<string>>(new Set());

  const loadViews = async () => {
    if (!database) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).mysqlApi.getViews(database);
      if (result.success) {
        setViews(result.data);
      } else {
        setError(result.error || '获取视图失败');
      }
    } catch (err) {
      setError('获取视图时发生错误');
      console.error('Error loading views:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadViewDefinition = async (viewName: string) => {
    try {
      const result = await (window as any).mysqlApi.getViewDefinition(database, viewName);
      if (result.success && result.data.length > 0) {
        setViewDefinition(result.data[0]['Create View'] || '');
        setViewDefinitionDialog(true);
      } else {
        setError('获取视图定义失败');
      }
    } catch (err) {
      setError('获取视图定义时发生错误');
      console.error('Error loading view definition:', err);
    }
  };

  const toggleViewExpand = (viewName: string) => {
    const newExpanded = new Set(expandedViews);
    if (newExpanded.has(viewName)) {
      newExpanded.delete(viewName);
    } else {
      newExpanded.add(viewName);
    }
    setExpandedViews(newExpanded);
  };

  const handleViewSelect = (view: ViewInfo) => {
    setSelectedView(view);
    if (onViewSelect) {
      onViewSelect(view.VIEW_NAME, view);
    }
  };

  useEffect(() => {
    loadViews();
  }, [database]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          加载视图中...
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
        <Button variant="outlined" onClick={loadViews} startIcon={<RefreshIcon />}>
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
            <ViewIcon color="secondary" />
            视图 ({views.length})
          </Typography>
          <IconButton size="small" onClick={loadViews} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Views List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {views.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ViewIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              该数据库中没有视图
            </Typography>
          </Box>
        ) : (
          <List dense>
            {views.map((view) => (
              <React.Fragment key={view.VIEW_NAME}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleViewSelect(view)}
                    selected={selectedView?.VIEW_NAME === view.VIEW_NAME}
                  >
                    <ListItemIcon>
                      <ViewIcon fontSize="small" color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={view.VIEW_NAME}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip 
                            label={view.IS_UPDATABLE === 'YES' ? '可更新' : '只读'} 
                            size="small" 
                            color={view.IS_UPDATABLE === 'YES' ? 'success' : 'default'}
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {view.DEFINER}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleViewExpand(view.VIEW_NAME);
                      }}
                    >
                      {expandedViews.has(view.VIEW_NAME) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </ListItemButton>
                </ListItem>

                <Collapse in={expandedViews.has(view.VIEW_NAME)} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                    <Card variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          视图信息
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            安全类型: {view.SECURITY_TYPE}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            检查选项: {view.CHECK_OPTION || '无'}
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions sx={{ pt: 0 }}>
                        <Button
                          size="small"
                          startIcon={<CodeIcon />}
                          onClick={() => loadViewDefinition(view.VIEW_NAME)}
                        >
                          查看定义
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleViewSelect(view)}
                        >
                          查询数据
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

      {/* View Definition Dialog */}
      <Dialog
        open={viewDefinitionDialog}
        onClose={() => setViewDefinitionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          视图定义 - {selectedView?.VIEW_NAME}
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={15}
            value={viewDefinition}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDefinitionDialog(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ViewsPanel;
