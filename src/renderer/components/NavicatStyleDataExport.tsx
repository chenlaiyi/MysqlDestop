import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  LinearProgress,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  TableChart as TableIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon
} from '@mui/icons-material';

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  supportsSchema: boolean;
  supportsData: boolean;
}

interface ExportOptions {
  format: string;
  outputPath: string;
  includeSchema: boolean;
  includeData: boolean;
  selectedTables: string[];
  whereClause?: string;
  maxRows?: number;
  encoding: string;
  compression: boolean;
  splitFiles: boolean;
  batchSize: number;
}

interface NavicatStyleDataExportProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  databases: string[];
  tables: string[];
  currentDatabase?: string;
}

const NavicatStyleDataExport: React.FC<NavicatStyleDataExportProps> = ({
  open,
  onClose,
  onExport,
  databases,
  tables,
  currentDatabase
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'sql',
    outputPath: '',
    includeSchema: true,
    includeData: true,
    selectedTables: [],
    encoding: 'utf8',
    compression: false,
    splitFiles: false,
    batchSize: 1000
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);

  const exportFormats: ExportFormat[] = [
    {
      id: 'sql',
      name: 'SQL文件',
      extension: '.sql',
      description: '标准SQL转储文件，兼容MySQL',
      supportsSchema: true,
      supportsData: true
    },
    {
      id: 'csv',
      name: 'CSV文件',
      extension: '.csv',
      description: '逗号分隔值文件，适用于数据分析',
      supportsSchema: false,
      supportsData: true
    },
    {
      id: 'json',
      name: 'JSON文件',
      extension: '.json',
      description: 'JavaScript对象表示法，适用于API数据交换',
      supportsSchema: false,
      supportsData: true
    },
    {
      id: 'xlsx',
      name: 'Excel文件',
      extension: '.xlsx',
      description: 'Microsoft Excel工作簿文件',
      supportsSchema: false,
      supportsData: true
    },
    {
      id: 'xml',
      name: 'XML文件',
      extension: '.xml',
      description: '可扩展标记语言文件',
      supportsSchema: true,
      supportsData: true
    }
  ];

  const steps = ['选择格式', '配置选项', '选择表', '导出'];

  const selectedFormat = exportFormats.find(f => f.id === exportOptions.format);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleExport();
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleExport = async () => {
    if (exportOptions.selectedTables.length === 0) {
      setExportStatus({
        success: false,
        message: '请至少选择一个表进行导出'
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // 模拟导出进度
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      await onExport(exportOptions);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setExportStatus({
        success: true,
        message: '数据导出完成！',
        details: [
          `导出格式: ${selectedFormat?.name}`,
          `表数量: ${exportOptions.selectedTables.length}`,
          `输出路径: ${exportOptions.outputPath}`,
          `包含结构: ${exportOptions.includeSchema ? '是' : '否'}`,
          `包含数据: ${exportOptions.includeData ? '是' : '否'}`
        ]
      });
      
    } catch (error) {
      setExportStatus({
        success: false,
        message: `导出失败: ${error}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleTableSelection = (tableName: string, selected: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      selectedTables: selected
        ? [...prev.selectedTables, tableName]
        : prev.selectedTables.filter(t => t !== tableName)
    }));
  };

  const selectAllTables = () => {
    setExportOptions(prev => ({
      ...prev,
      selectedTables: tables
    }));
  };

  const deselectAllTables = () => {
    setExportOptions(prev => ({
      ...prev,
      selectedTables: []
    }));
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // 选择格式
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>选择导出格式</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              选择最适合您需求的数据导出格式
            </Typography>
            
            <Box sx={{ display: 'grid', gap: 2 }}>
              {exportFormats.map((format) => (
                <Paper
                  key={format.id}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: exportOptions.format === format.id ? 2 : 1,
                    borderColor: exportOptions.format === format.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.light'
                    }
                  }}
                  onClick={() => setExportOptions(prev => ({ ...prev, format: format.id }))}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FileIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {format.name}
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                      {exportOptions.format === format.id && (
                        <CheckIcon color="primary" />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {format.description}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    {format.supportsSchema && (
                      <Chip label="支持结构" size="small" variant="outlined" />
                    )}
                    {format.supportsData && (
                      <Chip label="支持数据" size="small" variant="outlined" />
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        );

      case 1: // 配置选项
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>导出配置</Typography>
            
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="输出路径"
                value={exportOptions.outputPath}
                onChange={(e) => setExportOptions(prev => ({ ...prev, outputPath: e.target.value }))}
                placeholder="选择文件保存位置"
                InputProps={{
                  endAdornment: (
                    <Button startIcon={<FolderIcon />} onClick={() => {}}>
                      浏览
                    </Button>
                  )
                }}
              />

              {selectedFormat?.supportsSchema && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeSchema}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeSchema: e.target.checked 
                      }))}
                    />
                  }
                  label="包含表结构 (CREATE TABLE语句)"
                />
              )}

              {selectedFormat?.supportsData && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeData}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeData: e.target.checked 
                      }))}
                    />
                  }
                  label="包含表数据 (INSERT语句)"
                />
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>字符编码</InputLabel>
                  <Select
                    value={exportOptions.encoding}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      encoding: e.target.value 
                    }))}
                  >
                    <MenuItem value="utf8">UTF-8</MenuItem>
                    <MenuItem value="gbk">GBK</MenuItem>
                    <MenuItem value="latin1">Latin1</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  sx={{ flex: 1 }}
                  label="批次大小"
                  type="number"
                  value={exportOptions.batchSize}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    batchSize: parseInt(e.target.value) 
                  }))}
                  inputProps={{ min: 100, max: 10000 }}
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.compression}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        compression: e.target.checked 
                      }))}
                    />
                  }
                  label="启用压缩 (生成.zip文件)"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.splitFiles}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        splitFiles: e.target.checked 
                      }))}
                    />
                  }
                  label="分别导出每个表"
                />
              </Box>

              <TextField
                fullWidth
                label="WHERE条件 (可选)"
                value={exportOptions.whereClause || ''}
                onChange={(e) => setExportOptions(prev => ({ 
                  ...prev, 
                  whereClause: e.target.value 
                }))}
                placeholder="例如: created_at > '2023-01-01'"
                helperText="应用于所有选择的表"
              />
            </Stack>
          </Box>
        );

      case 2: // 选择表
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>选择要导出的表</Typography>
            
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={selectAllTables}>
                全选
              </Button>
              <Button variant="outlined" size="small" onClick={deselectAllTables}>
                全不选
              </Button>
              <Chip 
                label={`已选择 ${exportOptions.selectedTables.length} / ${tables.length} 个表`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List dense>
                {tables.map((tableName) => (
                  <ListItem key={tableName}>
                    <ListItemIcon>
                      <Checkbox
                        checked={exportOptions.selectedTables.includes(tableName)}
                        onChange={(e) => handleTableSelection(tableName, e.target.checked)}
                      />
                    </ListItemIcon>
                    <ListItemIcon>
                      <TableIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={tableName}
                      secondary="MySQL表"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        );

      case 3: // 导出
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>开始导出</Typography>
            
            {!isExporting && !exportStatus && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  确认导出配置：
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    <strong>格式:</strong> {selectedFormat?.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>表数量:</strong> {exportOptions.selectedTables.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>包含结构:</strong> {exportOptions.includeSchema ? '是' : '否'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>包含数据:</strong> {exportOptions.includeData ? '是' : '否'}
                  </Typography>
                  {exportOptions.whereClause && (
                    <Typography variant="body2">
                      <strong>WHERE条件:</strong> {exportOptions.whereClause}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            {isExporting && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  正在导出数据...
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={exportProgress} 
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {Math.round(exportProgress)}% 完成
                </Typography>
              </Box>
            )}

            {exportStatus && (
              <Alert 
                severity={exportStatus.success ? 'success' : 'error'}
                icon={exportStatus.success ? <CheckIcon /> : <ErrorIcon />}
              >
                <Typography variant="body1">{exportStatus.message}</Typography>
                {exportStatus.details && (
                  <Box sx={{ mt: 1 }}>
                    {exportStatus.details.map((detail, index) => (
                      <Typography key={index} variant="body2">
                        • {detail}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        style: {
          minHeight: '700px'
        }
      }}
    >
      <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white', display: 'flex', alignItems: 'center' }}>
        <ExportIcon sx={{ mr: 1 }} />
        数据导出向导
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {renderStepContent()}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, backgroundColor: '#fafafa' }}>
        <Button 
          onClick={onClose}
          disabled={isExporting}
        >
          {exportStatus ? '关闭' : '取消'}
        </Button>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {activeStep > 0 && !exportStatus && (
          <Button 
            onClick={handleBack}
            disabled={isExporting}
          >
            上一步
          </Button>
        )}
        
        {!exportStatus && (
          <Button 
            onClick={handleNext}
            variant="contained"
            disabled={
              isExporting || 
              (activeStep === 0 && !exportOptions.format) ||
              (activeStep === 1 && !exportOptions.outputPath) ||
              (activeStep === 2 && exportOptions.selectedTables.length === 0)
            }
          >
            {activeStep === steps.length - 1 ? (
              isExporting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  导出中...
                </>
              ) : (
                '开始导出'
              )
            ) : (
              '下一步'
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NavicatStyleDataExport;
