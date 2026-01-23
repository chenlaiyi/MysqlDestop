import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  Key as KeyIcon
} from '@mui/icons-material';

interface TableDesignModalProps {
  open: boolean;
  onClose: () => void;
  database: string;
  tableName?: string; // 如果提供则为编辑模式，否则为创建模式
  onComplete?: () => void;
}

interface ColumnDefinition {
  name: string;
  type: string;
  length: string;
  nullable: boolean;
  defaultValue: string;
  autoIncrement: boolean;
  primaryKey: boolean;
  comment: string;
  unsigned: boolean;
  zerofill: boolean;
}

interface IndexDefinition {
  name: string;
  type: 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT';
  columns: string[];
}

const MYSQL_TYPES = [
  // 数值类型
  'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT',
  'FLOAT', 'DOUBLE', 'DECIMAL',
  // 字符串类型
  'CHAR', 'VARCHAR', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
  // 二进制类型
  'BINARY', 'VARBINARY', 'TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB',
  // 日期时间类型
  'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
  // 其他类型
  'ENUM', 'SET', 'JSON', 'BOOLEAN'
];

const TYPES_WITH_LENGTH = ['CHAR', 'VARCHAR', 'BINARY', 'VARBINARY', 'DECIMAL', 'FLOAT', 'DOUBLE', 'ENUM', 'SET'];
const NUMERIC_TYPES = ['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL'];

function TableDesignModal({ open, onClose, database, tableName, onComplete }: TableDesignModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [newTableName, setNewTableName] = useState(tableName || '');
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [indexes, setIndexes] = useState<IndexDefinition[]>([]);
  const [tableComment, setTableComment] = useState('');
  const [engine, setEngine] = useState('InnoDB');
  const [charset, setCharset] = useState('utf8mb4');
  const [collation, setCollation] = useState('utf8mb4_unicode_ci');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalColumns, setOriginalColumns] = useState<ColumnDefinition[]>([]);

  const isEditMode = !!tableName;

  useEffect(() => {
    if (open && tableName) {
      loadTableStructure();
    } else if (open && !tableName) {
      // 创建模式，添加默认列
      setColumns([createEmptyColumn()]);
      setIndexes([]);
      setNewTableName('');
      setTableComment('');
    }
  }, [open, tableName]);

  const createEmptyColumn = (): ColumnDefinition => ({
    name: '',
    type: 'VARCHAR',
    length: '255',
    nullable: true,
    defaultValue: '',
    autoIncrement: false,
    primaryKey: false,
    comment: '',
    unsigned: false,
    zerofill: false
  });

  const loadTableStructure = async () => {
    if (!tableName) return;
    setLoading(true);
    setError(null);

    try {
      // 获取表结构
      const result = await window.mysqlApi.executeQuery(database, `SHOW FULL COLUMNS FROM \`${tableName}\``);
      if (result.success && result.data) {
        const cols: ColumnDefinition[] = result.data.map((row: any) => {
          const typeMatch = row.Type.match(/^(\w+)(?:\(([^)]+)\))?(\s+unsigned)?(\s+zerofill)?/i);
          const baseType = typeMatch ? typeMatch[1].toUpperCase() : row.Type.toUpperCase();
          const length = typeMatch && typeMatch[2] ? typeMatch[2] : '';

          return {
            name: row.Field,
            type: baseType,
            length: length,
            nullable: row.Null === 'YES',
            defaultValue: row.Default || '',
            autoIncrement: row.Extra?.includes('auto_increment') || false,
            primaryKey: row.Key === 'PRI',
            comment: row.Comment || '',
            unsigned: row.Type.includes('unsigned'),
            zerofill: row.Type.includes('zerofill')
          };
        });
        setColumns(cols);
        setOriginalColumns(JSON.parse(JSON.stringify(cols)));
      }

      // 获取索引信息
      const indexResult = await window.mysqlApi.executeQuery(database, `SHOW INDEX FROM \`${tableName}\``);
      if (indexResult.success && indexResult.data) {
        const indexMap = new Map<string, IndexDefinition>();
        indexResult.data.forEach((row: any) => {
          const keyName = row.Key_name;
          if (!indexMap.has(keyName)) {
            let indexType: 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT' = 'INDEX';
            if (keyName === 'PRIMARY') indexType = 'PRIMARY';
            else if (row.Non_unique === 0) indexType = 'UNIQUE';
            else if (row.Index_type === 'FULLTEXT') indexType = 'FULLTEXT';

            indexMap.set(keyName, {
              name: keyName,
              type: indexType,
              columns: []
            });
          }
          indexMap.get(keyName)!.columns.push(row.Column_name);
        });
        setIndexes(Array.from(indexMap.values()));
      }

      // 获取表信息
      const tableInfoResult = await window.mysqlApi.executeQuery(
        database,
        `SELECT TABLE_COMMENT, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${database}' AND TABLE_NAME = '${tableName}'`
      );
      if (tableInfoResult.success && tableInfoResult.data?.[0]) {
        const info = tableInfoResult.data[0];
        setTableComment(info.TABLE_COMMENT || '');
        setEngine(info.ENGINE || 'InnoDB');
        if (info.TABLE_COLLATION) {
          setCollation(info.TABLE_COLLATION);
          setCharset(info.TABLE_COLLATION.split('_')[0]);
        }
      }
    } catch (err: any) {
      setError(`加载表结构失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    setColumns([...columns, createEmptyColumn()]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const newColumns = [...columns];
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
    setColumns(newColumns);
  };

  const handleColumnChange = (index: number, field: keyof ColumnDefinition, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };

    // 如果设置为主键，自动设置不可为空
    if (field === 'primaryKey' && value) {
      newColumns[index].nullable = false;
    }

    // 如果设置为自增，自动设置为主键和不可为空
    if (field === 'autoIncrement' && value) {
      newColumns[index].primaryKey = true;
      newColumns[index].nullable = false;
    }

    setColumns(newColumns);
  };

  const handleAddIndex = () => {
    setIndexes([...indexes, {
      name: `idx_${Date.now()}`,
      type: 'INDEX',
      columns: []
    }]);
  };

  const handleRemoveIndex = (index: number) => {
    setIndexes(indexes.filter((_, i) => i !== index));
  };

  const handleIndexChange = (index: number, field: keyof IndexDefinition, value: any) => {
    const newIndexes = [...indexes];
    newIndexes[index] = { ...newIndexes[index], [field]: value };
    setIndexes(newIndexes);
  };

  const generateCreateTableSQL = (): string => {
    const columnDefs = columns.map(col => {
      let def = `\`${col.name}\` ${col.type}`;

      if (TYPES_WITH_LENGTH.includes(col.type) && col.length) {
        def += `(${col.length})`;
      } else if (NUMERIC_TYPES.includes(col.type) && col.length) {
        def += `(${col.length})`;
      }

      if (col.unsigned && NUMERIC_TYPES.includes(col.type)) {
        def += ' UNSIGNED';
      }

      if (col.zerofill && NUMERIC_TYPES.includes(col.type)) {
        def += ' ZEROFILL';
      }

      if (!col.nullable) {
        def += ' NOT NULL';
      }

      if (col.autoIncrement) {
        def += ' AUTO_INCREMENT';
      } else if (col.defaultValue) {
        if (col.defaultValue.toUpperCase() === 'NULL') {
          def += ' DEFAULT NULL';
        } else if (col.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP') {
          def += ' DEFAULT CURRENT_TIMESTAMP';
        } else {
          def += ` DEFAULT '${col.defaultValue}'`;
        }
      }

      if (col.comment) {
        def += ` COMMENT '${col.comment.replace(/'/g, "''")}'`;
      }

      return def;
    });

    // 添加主键
    const primaryKeys = columns.filter(col => col.primaryKey).map(col => `\`${col.name}\``);
    if (primaryKeys.length > 0) {
      columnDefs.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
    }

    // 添加索引
    indexes.forEach(idx => {
      if (idx.type !== 'PRIMARY' && idx.columns.length > 0) {
        const indexCols = idx.columns.map(c => `\`${c}\``).join(', ');
        if (idx.type === 'UNIQUE') {
          columnDefs.push(`UNIQUE KEY \`${idx.name}\` (${indexCols})`);
        } else if (idx.type === 'FULLTEXT') {
          columnDefs.push(`FULLTEXT KEY \`${idx.name}\` (${indexCols})`);
        } else {
          columnDefs.push(`KEY \`${idx.name}\` (${indexCols})`);
        }
      }
    });

    let sql = `CREATE TABLE \`${newTableName}\` (\n  ${columnDefs.join(',\n  ')}\n)`;
    sql += ` ENGINE=${engine}`;
    sql += ` DEFAULT CHARSET=${charset}`;
    sql += ` COLLATE=${collation}`;

    if (tableComment) {
      sql += ` COMMENT='${tableComment.replace(/'/g, "''")}'`;
    }

    return sql;
  };

  const generateAlterTableSQL = (): string[] => {
    const statements: string[] = [];

    // 比较列变化
    const originalColNames = new Set(originalColumns.map(c => c.name));
    const newColNames = new Set(columns.map(c => c.name));

    // 删除的列
    originalColumns.forEach(origCol => {
      if (!newColNames.has(origCol.name)) {
        statements.push(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${origCol.name}\``);
      }
    });

    // 新增和修改的列
    columns.forEach((col, index) => {
      const origCol = originalColumns.find(c => c.name === col.name);

      let colDef = `\`${col.name}\` ${col.type}`;
      if (TYPES_WITH_LENGTH.includes(col.type) && col.length) {
        colDef += `(${col.length})`;
      } else if (NUMERIC_TYPES.includes(col.type) && col.length) {
        colDef += `(${col.length})`;
      }

      if (col.unsigned && NUMERIC_TYPES.includes(col.type)) {
        colDef += ' UNSIGNED';
      }

      if (!col.nullable) {
        colDef += ' NOT NULL';
      }

      if (col.autoIncrement) {
        colDef += ' AUTO_INCREMENT';
      } else if (col.defaultValue) {
        if (col.defaultValue.toUpperCase() === 'NULL') {
          colDef += ' DEFAULT NULL';
        } else if (col.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP') {
          colDef += ' DEFAULT CURRENT_TIMESTAMP';
        } else {
          colDef += ` DEFAULT '${col.defaultValue}'`;
        }
      }

      if (col.comment) {
        colDef += ` COMMENT '${col.comment.replace(/'/g, "''")}'`;
      }

      if (!origCol) {
        // 新增列
        const afterCol = index > 0 ? ` AFTER \`${columns[index - 1].name}\`` : ' FIRST';
        statements.push(`ALTER TABLE \`${tableName}\` ADD COLUMN ${colDef}${afterCol}`);
      } else if (JSON.stringify(origCol) !== JSON.stringify(col)) {
        // 修改列
        statements.push(`ALTER TABLE \`${tableName}\` MODIFY COLUMN ${colDef}`);
      }
    });

    return statements;
  };

  const handleSave = async () => {
    // 验证
    if (!newTableName.trim()) {
      setError('请输入表名');
      return;
    }

    if (columns.length === 0) {
      setError('请至少添加一个列');
      return;
    }

    const emptyNameCol = columns.find(c => !c.name.trim());
    if (emptyNameCol) {
      setError('列名不能为空');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        // 编辑模式：执行 ALTER TABLE
        const alterStatements = generateAlterTableSQL();
        for (const stmt of alterStatements) {
          const result = await window.mysqlApi.executeQuery(database, stmt);
          if (!result.success) {
            throw new Error(result.error || '执行失败');
          }
        }
      } else {
        // 创建模式：执行 CREATE TABLE
        const createSQL = generateCreateTableSQL();
        const result = await window.mysqlApi.executeQuery(database, createSQL);
        if (!result.success) {
          throw new Error(result.error || '创建表失败');
        }
      }

      if (onComplete) {
        onComplete();
      }
      handleClose();
    } catch (err: any) {
      setError(`保存失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setColumns([]);
    setIndexes([]);
    setNewTableName('');
    setTableComment('');
    setError(null);
    setActiveTab(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {isEditMode ? `编辑表: ${tableName}` : '创建新表'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && !columns.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
              <TextField
                label="表名"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                size="small"
                sx={{ width: 200 }}
                disabled={isEditMode}
              />
              <TextField
                label="注释"
                value={tableComment}
                onChange={(e) => setTableComment(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ width: 150 }}>
                <InputLabel>存储引擎</InputLabel>
                <Select
                  value={engine}
                  label="存储引擎"
                  onChange={(e) => setEngine(e.target.value)}
                >
                  <MenuItem value="InnoDB">InnoDB</MenuItem>
                  <MenuItem value="MyISAM">MyISAM</MenuItem>
                  <MenuItem value="MEMORY">MEMORY</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 150 }}>
                <InputLabel>字符集</InputLabel>
                <Select
                  value={charset}
                  label="字符集"
                  onChange={(e) => setCharset(e.target.value)}
                >
                  <MenuItem value="utf8mb4">utf8mb4</MenuItem>
                  <MenuItem value="utf8">utf8</MenuItem>
                  <MenuItem value="latin1">latin1</MenuItem>
                  <MenuItem value="gbk">gbk</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>排序规则</InputLabel>
                <Select
                  value={collation}
                  label="排序规则"
                  onChange={(e) => setCollation(e.target.value)}
                >
                  <MenuItem value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</MenuItem>
                  <MenuItem value="utf8mb4_general_ci">utf8mb4_general_ci</MenuItem>
                  <MenuItem value="utf8_general_ci">utf8_general_ci</MenuItem>
                  <MenuItem value="latin1_swedish_ci">latin1_swedish_ci</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="列" />
              <Tab label="索引" />
              <Tab label="SQL 预览" />
            </Tabs>

            {activeTab === 0 && (
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={handleAddColumn}
                  >
                    添加列
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40 }}></TableCell>
                        <TableCell sx={{ minWidth: 120 }}>列名</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>类型</TableCell>
                        <TableCell sx={{ width: 80 }}>长度</TableCell>
                        <TableCell sx={{ width: 60 }}>主键</TableCell>
                        <TableCell sx={{ width: 60 }}>非空</TableCell>
                        <TableCell sx={{ width: 60 }}>自增</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>默认值</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>注释</TableCell>
                        <TableCell sx={{ width: 100 }}>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {columns.map((col, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {col.primaryKey && (
                              <Tooltip title="主键">
                                <KeyIcon fontSize="small" color="primary" />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={col.name}
                              onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={col.type}
                              onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                              fullWidth
                            >
                              {MYSQL_TYPES.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={col.length}
                              onChange={(e) => handleColumnChange(index, 'length', e.target.value)}
                              fullWidth
                              disabled={!TYPES_WITH_LENGTH.includes(col.type) && !NUMERIC_TYPES.includes(col.type)}
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={col.primaryKey}
                              onChange={(e) => handleColumnChange(index, 'primaryKey', e.target.checked)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={!col.nullable}
                              onChange={(e) => handleColumnChange(index, 'nullable', !e.target.checked)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={col.autoIncrement}
                              onChange={(e) => handleColumnChange(index, 'autoIncrement', e.target.checked)}
                              size="small"
                              disabled={!NUMERIC_TYPES.includes(col.type)}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={col.defaultValue}
                              onChange={(e) => handleColumnChange(index, 'defaultValue', e.target.value)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={col.comment}
                              onChange={(e) => handleColumnChange(index, 'comment', e.target.value)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveColumn(index, 'up')}
                                disabled={index === 0}
                              >
                                <MoveUpIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveColumn(index, 'down')}
                                disabled={index === columns.length - 1}
                              >
                                <MoveDownIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveColumn(index)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={handleAddIndex}
                  >
                    添加索引
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 150 }}>索引名</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>类型</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>列</TableCell>
                        <TableCell sx={{ width: 80 }}>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {indexes.map((idx, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={idx.name}
                              onChange={(e) => handleIndexChange(index, 'name', e.target.value)}
                              fullWidth
                              disabled={idx.type === 'PRIMARY'}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={idx.type}
                              onChange={(e) => handleIndexChange(index, 'type', e.target.value)}
                              fullWidth
                              disabled={idx.type === 'PRIMARY'}
                            >
                              <MenuItem value="INDEX">普通索引</MenuItem>
                              <MenuItem value="UNIQUE">唯一索引</MenuItem>
                              <MenuItem value="FULLTEXT">全文索引</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              multiple
                              value={idx.columns}
                              onChange={(e) => handleIndexChange(index, 'columns', e.target.value)}
                              fullWidth
                              disabled={idx.type === 'PRIMARY'}
                            >
                              {columns.map(col => (
                                <MenuItem key={col.name} value={col.name}>{col.name}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveIndex(index)}
                              color="error"
                              disabled={idx.type === 'PRIMARY'}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 2 && (
              <Box
                sx={{
                  bgcolor: 'background.default',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                {isEditMode ? (
                  generateAlterTableSQL().length > 0 ? (
                    generateAlterTableSQL().join(';\n\n') + ';'
                  ) : (
                    <Typography color="text.secondary">无变更</Typography>
                  )
                ) : (
                  generateCreateTableSQL() + ';'
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : (isEditMode ? '保存修改' : '创建表')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TableDesignModal;
