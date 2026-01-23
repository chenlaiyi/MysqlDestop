import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Slider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  AccountTree as ERIcon
} from '@mui/icons-material';

interface TableNode {
  name: string;
  columns: ColumnInfo[];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  nullable: boolean;
}

interface Relation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
}

interface ERDiagramProps {
  database: string;
}

const TABLE_WIDTH = 200;
const COLUMN_HEIGHT = 24;
const HEADER_HEIGHT = 32;
const PADDING = 8;

function ERDiagram({ database }: ERDiagramProps) {
  const [tables, setTables] = useState<TableNode[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ table: string; startX: number; startY: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showRelations, setShowRelations] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (database) {
      loadERData();
    }
  }, [database]);

  const loadERData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取所有表
      const tablesResult = await window.mysqlApi.getTables(database);
      if (!tablesResult.success) {
        throw new Error(tablesResult.error || '获取表列表失败');
      }

      // 从返回数据中提取表名
      const tableNames: string[] = (tablesResult.data || []).map((row: any) => {
        // SHOW TABLES 返回的列名是 Tables_in_<database>
        const keys = Object.keys(row);
        return row[keys[0]];
      });
      const tableNodes: TableNode[] = [];

      // 获取每个表的列信息
      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const columnsResult = await window.mysqlApi.executeQuery(
          database,
          `SHOW FULL COLUMNS FROM \`${tableName}\``
        );

        if (columnsResult.success && columnsResult.data) {
          const columns: ColumnInfo[] = columnsResult.data.map((row: any) => ({
            name: row.Field,
            type: row.Type.split('(')[0].toUpperCase(),
            isPrimaryKey: row.Key === 'PRI',
            isForeignKey: row.Key === 'MUL',
            nullable: row.Null === 'YES'
          }));

          // 计算表的位置（网格布局）
          const cols = Math.ceil(Math.sqrt(tableNames.length));
          const row = Math.floor(i / cols);
          const col = i % cols;

          tableNodes.push({
            name: tableName,
            columns,
            x: 50 + col * (TABLE_WIDTH + 100),
            y: 50 + row * 300,
            width: TABLE_WIDTH,
            height: HEADER_HEIGHT + columns.length * COLUMN_HEIGHT + PADDING * 2
          });
        }
      }

      setTables(tableNodes);

      // 获取外键关系
      const relationsResult = await window.mysqlApi.executeQuery(
        database,
        `SELECT
          CONSTRAINT_NAME,
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = '${database}'
          AND REFERENCED_TABLE_NAME IS NOT NULL`
      );

      if (relationsResult.success && relationsResult.data) {
        const rels: Relation[] = relationsResult.data.map((row: any) => ({
          fromTable: row.TABLE_NAME,
          fromColumn: row.COLUMN_NAME,
          toTable: row.REFERENCED_TABLE_NAME,
          toColumn: row.REFERENCED_COLUMN_NAME,
          constraintName: row.CONSTRAINT_NAME
        }));
        setRelations(rels);
      }
    } catch (err: any) {
      setError(`加载 ER 图失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleCenter = () => {
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleMouseDown = (e: React.MouseEvent, tableName?: string) => {
    if (tableName) {
      const table = tables.find(t => t.name === tableName);
      if (table) {
        setDragging({
          table: tableName,
          startX: e.clientX - table.x * zoom,
          startY: e.clientY - table.y * zoom
        });
      }
    } else {
      setPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const newX = (e.clientX - dragging.startX) / zoom;
      const newY = (e.clientY - dragging.startY) / zoom;
      setTables(prev => prev.map(t =>
        t.name === dragging.table ? { ...t, x: newX, y: newY } : t
      ));
    } else if (panning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [dragging, panning, panStart, zoom]);

  const handleMouseUp = () => {
    setDragging(null);
    setPanning(false);
  };

  const getColumnY = (table: TableNode, columnName: string): number => {
    const columnIndex = table.columns.findIndex(c => c.name === columnName);
    return table.y + HEADER_HEIGHT + PADDING + columnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
  };

  const renderRelationLine = (relation: Relation, index: number) => {
    const fromTable = tables.find(t => t.name === relation.fromTable);
    const toTable = tables.find(t => t.name === relation.toTable);

    if (!fromTable || !toTable) return null;

    const fromY = getColumnY(fromTable, relation.fromColumn);
    const toY = getColumnY(toTable, relation.toColumn);

    // 确定连接点
    let fromX: number, toX: number;
    if (fromTable.x + fromTable.width < toTable.x) {
      // from 在 to 左边
      fromX = fromTable.x + fromTable.width;
      toX = toTable.x;
    } else if (toTable.x + toTable.width < fromTable.x) {
      // from 在 to 右边
      fromX = fromTable.x;
      toX = toTable.x + toTable.width;
    } else {
      // 重叠，使用右侧
      fromX = fromTable.x + fromTable.width;
      toX = toTable.x + toTable.width;
    }

    // 贝塞尔曲线控制点
    const midX = (fromX + toX) / 2;
    const controlOffset = Math.abs(fromX - toX) * 0.3;

    const path = `M ${fromX} ${fromY}
                  C ${fromX + controlOffset} ${fromY},
                    ${toX - controlOffset} ${toY},
                    ${toX} ${toY}`;

    return (
      <g key={index}>
        <path
          d={path}
          fill="none"
          stroke="#3498db"
          strokeWidth={2}
          strokeDasharray="5,3"
          opacity={0.7}
        />
        {/* 箭头 */}
        <circle cx={toX} cy={toY} r={4} fill="#3498db" />
        <circle cx={fromX} cy={fromY} r={3} fill="#e74c3c" />
      </g>
    );
  };

  const renderTable = (table: TableNode) => {
    return (
      <g
        key={table.name}
        transform={`translate(${table.x}, ${table.y})`}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e, table.name);
        }}
        style={{ cursor: dragging?.table === table.name ? 'grabbing' : 'grab' }}
      >
        {/* 表背景 */}
        <rect
          width={table.width}
          height={table.height}
          rx={8}
          fill="#ffffff"
          stroke="#e3e8ee"
          strokeWidth={2}
          filter="url(#shadow)"
        />

        {/* 表头 */}
        <rect
          width={table.width}
          height={HEADER_HEIGHT}
          rx={8}
          fill="#3498db"
        />
        <rect
          y={HEADER_HEIGHT - 8}
          width={table.width}
          height={8}
          fill="#3498db"
        />

        {/* 表名 */}
        <text
          x={table.width / 2}
          y={HEADER_HEIGHT / 2 + 5}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={13}
          fontWeight={600}
        >
          {table.name}
        </text>

        {/* 列 */}
        {table.columns.map((column, index) => {
          const y = HEADER_HEIGHT + PADDING + index * COLUMN_HEIGHT;
          return (
            <g key={column.name}>
              {/* 列背景（悬停效果） */}
              <rect
                x={0}
                y={y}
                width={table.width}
                height={COLUMN_HEIGHT}
                fill="transparent"
                className="column-row"
              />

              {/* 主键/外键图标 */}
              {column.isPrimaryKey && (
                <text x={8} y={y + 16} fontSize={12} fill="#e74c3c">🔑</text>
              )}
              {column.isForeignKey && !column.isPrimaryKey && (
                <text x={8} y={y + 16} fontSize={12} fill="#9b59b6">🔗</text>
              )}

              {/* 列名 */}
              <text
                x={column.isPrimaryKey || column.isForeignKey ? 28 : 12}
                y={y + 16}
                fontSize={11}
                fill="#2c3e50"
              >
                {column.name}
              </text>

              {/* 类型 */}
              <text
                x={table.width - 8}
                y={y + 16}
                textAnchor="end"
                fontSize={10}
                fill="#95a5a6"
              >
                {column.type}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const handleExportSVG = () => {
    const svgElement = document.getElementById('er-diagram-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${database}_er_diagram.svg`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <Box sx={{
        p: 1.5,
        borderBottom: '1px solid #e3e8ee',
        bgcolor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ERIcon sx={{ color: '#27ae60', fontSize: 20 }} />
          <Typography variant="h6" sx={{
            color: '#2c3e50',
            fontWeight: 600,
            fontSize: '1rem'
          }}>
            ER 图 - {database}
          </Typography>
          <Chip
            label={`${tables.length} 表, ${relations.length} 关系`}
            size="small"
            variant="outlined"
            sx={{
              borderColor: '#e3e8ee',
              color: '#7f8c8d',
              bgcolor: '#ffffff',
              fontSize: '0.65rem',
              height: 20
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showRelations}
                onChange={(e) => setShowRelations(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="caption">显示关系</Typography>}
          />

          <Box sx={{ width: 100, mx: 1 }}>
            <Slider
              value={zoom}
              min={0.3}
              max={2}
              step={0.1}
              onChange={(_, value) => setZoom(value as number)}
              size="small"
            />
          </Box>

          <Tooltip title="放大">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="缩小">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="居中">
            <IconButton size="small" onClick={handleCenter}>
              <CenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="刷新">
            <IconButton size="small" onClick={loadERData}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="导出 SVG">
            <IconButton size="small" onClick={handleExportSVG}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 画布区域 */}
      <Box
        ref={canvasRef}
        sx={{
          flex: 1,
          overflow: 'hidden',
          bgcolor: '#f5f6fa',
          backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          cursor: panning ? 'grabbing' : 'default',
          position: 'relative'
        }}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : tables.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Alert severity="info">该数据库没有表</Alert>
          </Box>
        ) : (
          <svg
            id="er-diagram-svg"
            width="100%"
            height="100%"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
              </filter>
            </defs>

            {/* 关系线 */}
            {showRelations && relations.map((rel, index) => renderRelationLine(rel, index))}

            {/* 表 */}
            {tables.map(table => renderTable(table))}
          </svg>
        )}
      </Box>

      {/* 图例 */}
      <Box sx={{
        p: 1,
        borderTop: '1px solid #e3e8ee',
        bgcolor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        justifyContent: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography fontSize={12}>🔑</Typography>
          <Typography variant="caption" color="text.secondary">主键</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography fontSize={12}>🔗</Typography>
          <Typography variant="caption" color="text.secondary">外键</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 2, bgcolor: '#3498db', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">关系</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          提示: 拖拽表可调整位置，拖拽空白区域可平移画布
        </Typography>
      </Box>
    </Box>
  );
}

export default ERDiagram;
