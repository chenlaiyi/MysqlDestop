import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface DataImportModalProps {
  open: boolean;
  onClose: () => void;
  database: string;
  tables: string[];
  onImportComplete?: () => void;
}

type ImportFormat = 'csv' | 'json' | 'sql';

interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  include: boolean;
}

function DataImportModal({ open, onClose, database, tables, onImportComplete }: DataImportModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [importFormat, setImportFormat] = useState<ImportFormat>('csv');
  const [selectedTable, setSelectedTable] = useState('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetColumns, setTargetColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['选择文件', '配置映射', '执行导入'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      parseFileContent(content);
    };
    reader.onerror = () => {
      setError('读取文件失败');
    };
    reader.readAsText(file);
  };

  const parseFileContent = (content: string) => {
    try {
      if (importFormat === 'csv') {
        parseCSV(content);
      } else if (importFormat === 'json') {
        parseJSON(content);
      } else if (importFormat === 'sql') {
        // SQL 文件直接执行，不需要解析
        setParsedData([]);
        setSourceColumns([]);
      }
    } catch (err: any) {
      setError(`解析文件失败: ${err.message}`);
    }
  };

  const parseCSV = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      setError('CSV 文件为空');
      return;
    }

    const delimiter = csvDelimiter;
    const headers = hasHeader
      ? lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
      : lines[0].split(delimiter).map((_, i) => `column_${i + 1}`);

    const dataStartIndex = hasHeader ? 1 : 0;
    const data = lines.slice(dataStartIndex).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });

    setSourceColumns(headers);
    setParsedData(data);
  };

  const parseJSON = (content: string) => {
    const data = JSON.parse(content);
    const dataArray = Array.isArray(data) ? data : [data];

    if (dataArray.length === 0) {
      setError('JSON 文件为空');
      return;
    }

    const headers = Object.keys(dataArray[0]);
    setSourceColumns(headers);
    setParsedData(dataArray);
  };

  const loadTargetColumns = async () => {
    if (!selectedTable || !database) return;

    try {
      const result = await window.mysqlApi.getTableData(database, selectedTable, 1, 0);
      if (result.success && result.columns) {
        setTargetColumns(result.columns);
        // 自动映射同名列
        const mappings: ColumnMapping[] = sourceColumns.map(src => {
          const matchingTarget = result.columns?.find(
            (t: string) => t.toLowerCase() === src.toLowerCase()
          );
          return {
            sourceColumn: src,
            targetColumn: matchingTarget || '',
            include: !!matchingTarget
          };
        });
        setColumnMappings(mappings);
      }
    } catch (err: any) {
      setError(`加载目标表结构失败: ${err.message}`);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!fileContent) {
        setError('请先选择文件');
        return;
      }
      if (importFormat !== 'sql' && !selectedTable) {
        setError('请选择目标表');
        return;
      }
      if (importFormat !== 'sql') {
        await loadTargetColumns();
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleMappingChange = (index: number, field: keyof ColumnMapping, value: any) => {
    setColumnMappings(prev => {
      const newMappings = [...prev];
      newMappings[index] = { ...newMappings[index], [field]: value };
      return newMappings;
    });
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      if (importFormat === 'sql') {
        // 直接执行 SQL 文件
        const statements = fileContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--'));

        let success = 0;
        let failed = 0;

        for (const statement of statements) {
          try {
            const result = await window.mysqlApi.executeQuery(database, statement);
            if (result.success) {
              success++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }

        setImportResult({ success, failed });
      } else {
        // CSV/JSON 导入
        const includedMappings = columnMappings.filter(m => m.include && m.targetColumn);

        if (includedMappings.length === 0) {
          setError('请至少选择一个列进行导入');
          setLoading(false);
          return;
        }

        let success = 0;
        let failed = 0;

        for (const row of parsedData) {
          const insertData: any = {};
          for (const mapping of includedMappings) {
            insertData[mapping.targetColumn] = row[mapping.sourceColumn];
          }

          try {
            const result = await window.mysqlApi.insertRow(database, selectedTable, insertData);
            if (result.success) {
              success++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }

        setImportResult({ success, failed });
      }

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(`导入失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFileContent('');
    setFileName('');
    setParsedData([]);
    setSourceColumns([]);
    setTargetColumns([]);
    setColumnMappings([]);
    setError(null);
    setImportResult(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>导入格式</InputLabel>
              <Select
                value={importFormat}
                label="导入格式"
                onChange={(e) => {
                  setImportFormat(e.target.value as ImportFormat);
                  setFileContent('');
                  setFileName('');
                  setParsedData([]);
                }}
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="sql">SQL</MenuItem>
              </Select>
            </FormControl>

            {importFormat !== 'sql' && (
              <FormControl fullWidth size="small">
                <InputLabel>目标表</InputLabel>
                <Select
                  value={selectedTable}
                  label="目标表"
                  onChange={(e) => setSelectedTable(e.target.value)}
                >
                  {tables.map(table => (
                    <MenuItem key={table} value={table}>{table}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {importFormat === 'csv' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  label="分隔符"
                  value={csvDelimiter}
                  onChange={(e) => setCsvDelimiter(e.target.value)}
                  sx={{ width: 100 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)}
                    />
                  }
                  label="首行为标题"
                />
              </Box>
            )}

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept={importFormat === 'csv' ? '.csv' : importFormat === 'json' ? '.json' : '.sql'}
              onChange={handleFileSelect}
            />

            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ alignSelf: 'flex-start' }}
            >
              选择文件
            </Button>

            {fileName && (
              <Typography variant="body2" color="text.secondary">
                已选择: {fileName}
                {parsedData.length > 0 && ` (${parsedData.length} 行数据)`}
              </Typography>
            )}

            {parsedData.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>数据预览 (前 5 行)</Typography>
                <TableContainer sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {sourceColumns.map(col => (
                          <TableCell key={col} sx={{ fontWeight: 600 }}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          {sourceColumns.map(col => (
                            <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        );

      case 1:
        if (importFormat === 'sql') {
          return (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                SQL 文件将直接执行，无需配置列映射。
              </Typography>
              <Typography variant="body2">
                文件包含约 {fileContent.split(';').filter(s => s.trim() && !s.trim().startsWith('--')).length} 条 SQL 语句
              </Typography>
            </Box>
          );
        }

        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>列映射配置</Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">导入</TableCell>
                    <TableCell>源列</TableCell>
                    <TableCell>目标列</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {columnMappings.map((mapping, idx) => (
                    <TableRow key={idx}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={mapping.include}
                          onChange={(e) => handleMappingChange(idx, 'include', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{mapping.sourceColumn}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={mapping.targetColumn}
                          onChange={(e) => handleMappingChange(idx, 'targetColumn', e.target.value)}
                          fullWidth
                          displayEmpty
                        >
                          <MenuItem value="">-- 不导入 --</MenuItem>
                          {targetColumns.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {loading ? (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>正在导入数据...</Typography>
              </>
            ) : importResult ? (
              <>
                <Typography variant="h6" color="success.main" gutterBottom>
                  导入完成
                </Typography>
                <Typography>
                  成功: {importResult.success} 条，失败: {importResult.failed} 条
                </Typography>
              </>
            ) : (
              <>
                <Typography gutterBottom>
                  准备导入 {importFormat === 'sql'
                    ? `${fileContent.split(';').filter(s => s.trim() && !s.trim().startsWith('--')).length} 条 SQL 语句`
                    : `${parsedData.length} 行数据到 ${selectedTable}`
                  }
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={loading}
                >
                  开始导入
                </Button>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>导入数据到 {database}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        {activeStep > 0 && !importResult && (
          <Button onClick={handleBack} disabled={loading}>上一步</Button>
        )}
        {activeStep < steps.length - 1 && (
          <Button onClick={handleNext} variant="contained">下一步</Button>
        )}
        {importResult && (
          <Button onClick={handleClose} variant="contained">完成</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default DataImportModal;
