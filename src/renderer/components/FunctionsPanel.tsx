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
  TextField,
  Tabs,
  Tab
} from '@mui/material';
import {
  Functions as FunctionIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Storage as ProcedureIcon,
  PlayArrow as ExecuteIcon
} from '@mui/icons-material';

interface FunctionsPanelProps {
  database: string;
  onFunctionSelect?: (functionName: string, functionData: any) => void;
}

interface FunctionInfo {
  FUNCTION_NAME?: string;
  PROCEDURE_NAME?: string;
  ROUTINE_TYPE: string;
  RETURN_TYPE?: string;
  ROUTINE_DEFINITION: string;
  DEFINER: string;
  CREATED: string;
  LAST_ALTERED: string;
  SQL_MODE: string;
  ROUTINE_COMMENT: string;
}

function FunctionsPanel({ database, onFunctionSelect }: FunctionsPanelProps) {
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [procedures, setProcedures] = useState<FunctionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FunctionInfo | null>(null);
  const [definitionDialog, setDefinitionDialog] = useState(false);
  const [definition, setDefinition] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [tabValue, setTabValue] = useState(0);

  const loadFunctions = async () => {
    if (!database) return;
    
    setLoading(true);
    setError(null);
    try {
      const [functionsResult, proceduresResult] = await Promise.all([
        (window as any).mysqlApi.getFunctions(database),
        (window as any).mysqlApi.getProcedures(database)
      ]);

      if (functionsResult.success) {
        setFunctions(functionsResult.data);
      } else {
        setError(functionsResult.error || '获取函数失败');
      }

      if (proceduresResult.success) {
        setProcedures(proceduresResult.data);
      } else {
        setError(prev => prev ? `${prev}; 获取存储过程失败` : '获取存储过程失败');
      }
    } catch (err) {
      setError('获取函数和存储过程时发生错误');
      console.error('Error loading functions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDefinition = async (name: string, type: 'FUNCTION' | 'PROCEDURE') => {
    try {
      const result = type === 'FUNCTION' 
        ? await (window as any).mysqlApi.getFunctionDefinition(database, name)
        : await (window as any).mysqlApi.getProcedureDefinition(database, name);

      if (result.success && result.data.length > 0) {
        const key = type === 'FUNCTION' ? 'Create Function' : 'Create Procedure';
        setDefinition(result.data[0][key] || '');
        setDefinitionDialog(true);
      } else {
        setError(`获取${type === 'FUNCTION' ? '函数' : '存储过程'}定义失败`);
      }
    } catch (err) {
      setError(`获取${type === 'FUNCTION' ? '函数' : '存储过程'}定义时发生错误`);
      console.error('Error loading definition:', err);
    }
  };

  const toggleItemExpand = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemSelect = (item: FunctionInfo) => {
    setSelectedItem(item);
    if (onFunctionSelect) {
      const name = item.FUNCTION_NAME || item.PROCEDURE_NAME || '';
      onFunctionSelect(name, item);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  useEffect(() => {
    loadFunctions();
  }, [database]);

  const renderItemsList = (items: FunctionInfo[], type: 'FUNCTION' | 'PROCEDURE') => {
    if (items.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          {type === 'FUNCTION' ? (
            <FunctionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          ) : (
            <ProcedureIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          )}
          <Typography variant="body1" color="text.secondary">
            该数据库中没有{type === 'FUNCTION' ? '函数' : '存储过程'}
          </Typography>
        </Box>
      );
    }

    return (
      <List dense>
        {items.map((item) => {
          const name = item.FUNCTION_NAME || item.PROCEDURE_NAME || '';
          return (
            <React.Fragment key={name}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleItemSelect(item)}
                  selected={!!(selectedItem && (selectedItem.FUNCTION_NAME || selectedItem.PROCEDURE_NAME) === name)}
                >
                  <ListItemIcon>
                    {type === 'FUNCTION' ? (
                      <FunctionIcon fontSize="small" color="success" />
                    ) : (
                      <ProcedureIcon fontSize="small" color="info" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {item.RETURN_TYPE && (
                          <Chip 
                            label={item.RETURN_TYPE} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {item.DEFINER}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemExpand(name);
                    }}
                  >
                    {expandedItems.has(name) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </ListItemButton>
              </ListItem>

              <Collapse in={expandedItems.has(name)} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                  <Card variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {type === 'FUNCTION' ? '函数' : '存储过程'}信息
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          创建时间: {formatDate(item.CREATED)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          最后修改: {formatDate(item.LAST_ALTERED)}
                        </Typography>
                        {item.RETURN_TYPE && (
                          <Typography variant="caption" color="text.secondary">
                            返回类型: {item.RETURN_TYPE}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          SQL模式: {item.SQL_MODE || '默认'}
                        </Typography>
                      </Box>
                      {item.ROUTINE_COMMENT && (
                        <Typography variant="body2" color="text.secondary">
                          注释: {item.ROUTINE_COMMENT}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ pt: 0 }}>
                      <Button
                        size="small"
                        startIcon={<CodeIcon />}
                        onClick={() => loadDefinition(name, type)}
                      >
                        查看定义
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ExecuteIcon />}
                        onClick={() => handleItemSelect(item)}
                      >
                        执行
                      </Button>
                    </CardActions>
                  </Card>
                </Box>
              </Collapse>
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          加载函数和存储过程中...
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
        <Button variant="outlined" onClick={loadFunctions} startIcon={<RefreshIcon />}>
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
            <FunctionIcon color="success" />
            函数与存储过程
          </Typography>
          <IconButton size="small" onClick={loadFunctions} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`函数 (${functions.length})`} />
          <Tab label={`存储过程 (${procedures.length})`} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tabValue === 0 && renderItemsList(functions, 'FUNCTION')}
        {tabValue === 1 && renderItemsList(procedures, 'PROCEDURE')}
      </Box>

      {/* Definition Dialog */}
      <Dialog
        open={definitionDialog}
        onClose={() => setDefinitionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedItem?.ROUTINE_TYPE === 'FUNCTION' ? '函数' : '存储过程'}定义 - {selectedItem?.FUNCTION_NAME || selectedItem?.PROCEDURE_NAME}
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={15}
            value={definition}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDefinitionDialog(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FunctionsPanel;
