import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Button, IconButton, Tooltip, CircularProgress, Divider, Chip, Stack, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TextField, InputAdornment } from '@mui/material';
import { Add as AddIcon, ContentCopy as CopyIcon, Refresh as RefreshIcon, EditNote as EditNoteIcon, TableChart as TableIcon, Visibility as ViewIcon, Functions as FunctionIcon, PeopleAlt as PeopleIcon, Insights as InsightsIcon, LanRounded as LanRoundedIcon, Autorenew as AutorenewIcon, Science as ScienceIcon, Search as SearchIcon, ViewList as ViewListIcon, ViewModule as ViewModuleIcon } from '@mui/icons-material';
import DatabaseNavigator from './DatabaseNavigator';
import ModernDataTable from './ModernDataTable';
import SuperSQLEditor from './SuperSQLEditor';
import SuperPerformanceMonitor from './SuperPerformanceMonitor';
import SuperConnectionWizard from './SuperConnectionWizard';
import EditRowModal from './EditRowModal';
import ConfirmationDialog from './ConfirmationDialog';
import CreateTableModal from './CreateTableModal';
import SyncWizardModal from './SyncWizardModal';
import DataExportModal from './DataExportModal';
import DatabaseBackupModal from './DatabaseBackupModal';
import ViewsPanel from './ViewsPanel';
import FunctionsPanel from './FunctionsPanel';
import EventsPanel from './EventsPanel';
import TablesOverview from './TablesOverview';
import { t } from '../i18n';

interface ModernMainViewProps {
  databases: any[];
}

interface ViewDetailState {
  name: string;
  meta: any;
  definition?: string;
  data?: any[];
}

interface RoutineDetailState {
  name: string;
  type: 'FUNCTION' | 'PROCEDURE';
  meta: any;
  definition?: string;
}

interface EventDetailState {
  name: string;
  meta: any;
  definition?: string;
}

interface RoutineParameter {
  name: string;
  type: string;
  mode: string;
  position: number;
}

function ModernMainView({ databases }: ModernMainViewProps) {
  if (!databases) {
    console.warn('数据库列表为空');
  }
  
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<{ [key: string]: any[] }>({});
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [loadingTables, setLoadingTables] = useState<string | null>(null);
  const [loadingTableData, setLoadingTableData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isSyncWizardOpen, setIsSyncWizardOpen] = useState(false);
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [isDataExportModalOpen, setIsDataExportModalOpen] = useState(false);
  const [isDatabaseBackupModalOpen, setIsDatabaseBackupModalOpen] = useState(false);
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false); // 新增：连接错误状态
  const [rowsToDelete, setRowsToDelete] = useState<any[] | null>(null); // 批量删除的行
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false); // 批量删除确认对话框

  const [viewDetail, setViewDetail] = useState<ViewDetailState | null>(null);
  const [viewDetailLoading, setViewDetailLoading] = useState(false);
  const [viewDetailError, setViewDetailError] = useState<string | null>(null);

  const [routineDetail, setRoutineDetail] = useState<RoutineDetailState | null>(null);
  const [routineDetailLoading, setRoutineDetailLoading] = useState(false);
  const [routineDetailError, setRoutineDetailError] = useState<string | null>(null);

  const [eventDetail, setEventDetail] = useState<EventDetailState | null>(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [eventDetailError, setEventDetailError] = useState<string | null>(null);

  const [routineParams, setRoutineParams] = useState<RoutineParameter[]>([]);
  const [routineParamValues, setRoutineParamValues] = useState<Record<string, string>>({});
  const [routineExecuting, setRoutineExecuting] = useState(false);
  const [routineExecuteResult, setRoutineExecuteResult] = useState<any>(null);
  const [routineExecuteError, setRoutineExecuteError] = useState<string | null>(null);

  const [viewModeToggle, setViewModeToggle] = useState<'list' | 'grid'>('list');
  const [toolbarSearch, setToolbarSearch] = useState('');

  const sanitizeIdentifier = (name: string) => `\`${name.replace(/`/g, '``')}\``;

  const coerceRoutineValue = (param: RoutineParameter, rawValue: string) => {
    if (rawValue === '' || rawValue === undefined || rawValue === null) {
      return null;
    }
    const type = (param.type || '').toLowerCase();
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double') || type.includes('numeric')) {
      const numeric = Number(rawValue);
      if (Number.isNaN(numeric)) {
        throw new Error(t('mainView.routineValueNotNumber', { name: param.name }));
      }
      return numeric;
    }
    if (type.includes('bool')) {
      if (['1', 'true', 'TRUE', 'yes', 'YES'].includes(rawValue)) {
        return true;
      }
      if (['0', 'false', 'FALSE', 'no', 'NO'].includes(rawValue)) {
        return false;
      }
      throw new Error(t('mainView.routineValueNotBoolean', { name: param.name }));
    }
    return rawValue;
  };

  const resetFeatureDetails = () => {
    setViewDetail(null);
    setViewDetailLoading(false);
    setViewDetailError(null);
    setRoutineDetail(null);
    setRoutineDetailLoading(false);
    setRoutineDetailError(null);
    setEventDetail(null);
    setEventDetailLoading(false);
    setEventDetailError(null);
    setRoutineParams([]);
    setRoutineParamValues({});
    setRoutineExecuting(false);
    setRoutineExecuteResult(null);
    setRoutineExecuteError(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (clipError) {
      console.warn('复制到剪贴板失败:', clipError);
    }
  };

  const loadTablesForDatabase = async (dbName: string) => {
    setLoadingTables(dbName);
    try {
      const result = await window.mysqlApi.getTables(dbName);
      if (result.success) {
        const tableList = result.data || [];
        setTables((prev) => ({ ...prev, [dbName]: tableList }));
        if (selectedDatabase === dbName && selectedTable) {
          const exists = tableList.some((item: any) => {
            const tableName = Object.values(item)[0];
            return tableName === selectedTable;
          });
          if (!exists) {
            setSelectedTable(null);
            setTableData(null);
          }
        }
      } else {
        setError(result.error || t('mainView.failedToLoadTables'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setLoadingTables(null);
    }
  };

  const handleDatabaseClick = async (dbName: string) => {
    if (selectedDatabase === dbName) {
      setSelectedDatabase(null);
      setSelectedTable(null);
      setTableData(null);
      setError(null);
      resetFeatureDetails();
    } else {
      setSelectedDatabase(dbName);
      setSelectedTable(null);
      setTableData(null);
      setError(null);
      resetFeatureDetails();

      if (!tables[dbName]) {
        await loadTablesForDatabase(dbName);
      }
    }
  };

  const refreshTablesForSelectedDatabase = async () => {
    if (selectedDatabase) {
      await loadTablesForDatabase(selectedDatabase);
    }
  };

  const handleTableClick = async (dbName: string, tableName: string, newPage: number = 0, newRowsPerPage: number = rowsPerPage) => {
    resetFeatureDetails();
    setSelectedTable(tableName);
    setTableData(null);
    setError(null);
    setLoadingTableData(`${dbName}.${tableName}`);
    setPage(newPage);
    setRowsPerPage(newRowsPerPage);

    try {
      const offset = newPage * newRowsPerPage;
      const result = await window.mysqlApi.getTableData(dbName, tableName, newRowsPerPage, offset);
      if (result.success) {
        setTableData(result.data || []);
        setTotalRows(result.totalCount || 0);
        setConnectionError(false); // 成功时清除连接错误状态
      } else {
        setError(result.error || t('mainView.failedToLoadTableData'));
        // 检查是否是连接相关错误
        if ((result as any).needsReconnect) {
          setConnectionError(true);
        }
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
      // 检查是否是连接相关错误
      if (err.message && (
        err.message.includes('Connection lost') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('timeout') ||
        err.message.includes('PROTOCOL_CONNECTION_LOST')
      )) {
        setConnectionError(true);
      }
    } finally {
      setLoadingTableData(null);
    }
  };

  const handleChangePage = (newPage: number) => {
    if (selectedDatabase && selectedTable) {
      handleTableClick(selectedDatabase, selectedTable, newPage, rowsPerPage);
    }
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    if (selectedDatabase && selectedTable) {
      handleTableClick(selectedDatabase, selectedTable, 0, newRowsPerPage);
    }
  };

  const handleOpenModal = (row: any | null) => {
    setEditingRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRow(null);
  };

  const handleSaveRow = async (data: any) => {
    if (!selectedDatabase || !selectedTable) return;

    try {
      let result;
      if (editingRow) {
        const primaryKey = Object.keys(editingRow)[0];
        const primaryKeyValue = editingRow[primaryKey];
        result = await window.mysqlApi.updateRow(selectedDatabase, selectedTable, primaryKey, primaryKeyValue, data);
      } else {
        result = await window.mysqlApi.insertRow(selectedDatabase, selectedTable, data);
      }

      if (result.success) {
        handleTableClick(selectedDatabase, selectedTable);
      } else {
        setError(result.error || t('mainView.failedToSaveRow'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    }
  };

  const handleDeleteRow = (row: any) => {
    setRowToDelete(row);
    setIsConfirmDialogOpen(true);
  };

  // 新增：批量删除处理
  const handleDeleteRows = (rows: any[]) => {
    setRowsToDelete(rows);
    setIsBatchDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDatabase || !selectedTable || !rowToDelete) return;

    const primaryKey = Object.keys(rowToDelete)[0];
    const primaryKeyValue = rowToDelete[primaryKey];

    try {
      const result = await window.mysqlApi.deleteRow(
        selectedDatabase,
        selectedTable,
        primaryKey,
        primaryKeyValue
      );

      if (result.success) {
        await handleTableClick(selectedDatabase, selectedTable);
        setError(null);
      } else {
        setError(result.error || t('mainView.failedToDeleteRow'));
      }
    } catch (error: any) {
      setError(error.message || t('mainView.failedToDeleteRow'));
    } finally {
      setIsConfirmDialogOpen(false);
      setRowToDelete(null);
    }
  };

  // 新增：重连数据库
  const handleReconnect = async (): Promise<boolean> => {
    try {
      const result = await window.mysqlApi.reconnect();
      if (result.success) {
        setConnectionError(false);
        setError(null);
        return true;
      } else {
        setError(result.error || '重连失败');
        return false;
      }
    } catch (error: any) {
      setError(error.message || '重连过程中发生错误');
      return false;
    }
  };

  // 新增：刷新当前表数据
  const handleRefreshData = () => {
    if (selectedDatabase && selectedTable) {
      handleTableClick(selectedDatabase, selectedTable, page, rowsPerPage);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (!selectedDatabase || !selectedTable || !rowsToDelete || rowsToDelete.length === 0) return;

    try {
      // 串行删除每一行，以确保数据一致性
      for (const row of rowsToDelete) {
        const primaryKey = Object.keys(row)[0];
        const primaryKeyValue = row[primaryKey];
        
        const result = await window.mysqlApi.deleteRow(
          selectedDatabase,
          selectedTable,
          primaryKey,
          primaryKeyValue
        );

        if (!result.success) {
          throw new Error(result.error || `删除行 ${primaryKeyValue} 失败`);
        }
      }

      // 所有删除成功后刷新表格数据
      await handleTableClick(selectedDatabase, selectedTable);
      setError(null);
    } catch (error: any) {
      setError(error.message || t('mainView.failedToDeleteRow'));
    } finally {
      setIsBatchDeleteDialogOpen(false);
      setRowsToDelete(null);
    }
  };

  const handleUpdateCell = async (rowIndex: number, column: string, value: any) => {
    if (!selectedDatabase || !selectedTable || !tableData) return;

    try {
      const row = tableData[rowIndex];
      const primaryKey = Object.keys(row)[0]; // Assume first column is primary key
      const primaryKeyValue = row[primaryKey];

      const result = await window.mysqlApi.updateRow(
        selectedDatabase,
        selectedTable,
        primaryKey,
        primaryKeyValue,
        { [column]: value }
      );

      if (result.success) {
        // Update local state
        const updatedData = [...tableData];
        updatedData[rowIndex] = { ...updatedData[rowIndex], [column]: value };
        setTableData(updatedData);
        setError(null);
      } else {
        setError(result.error || t('mainView.updateFailed'));
      }
    } catch (error: any) {
      setError(error.message || t('mainView.updateFailed'));
    }
  };

  const handleCreateTable = async (tableName: string, columns: any[]) => {
    if (!selectedDatabase) {
      setError(t('mainView.selectDatabaseToCreateTable'));
      return;
    }
    try {
      const result = await window.mysqlApi.createTable(selectedDatabase, tableName, columns);
      if (result.success) {
        handleDatabaseClick(selectedDatabase);
      } else {
        setError(result.error || t('mainView.failedToCreateTable'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setIsCreateTableModalOpen(false);
    }
  };

  const handleDatabaseFeatureSelect = (dbName: string, feature: string) => {
    setSelectedDatabase(dbName);
    setSelectedTable(null);
    setTableData(null);
    setError(null);
    resetFeatureDetails();
    setSelectedFeature(feature);
    
    // Handle different feature selections
    switch (feature) {
      case 'tables':
        // 显示表概览，不需要特殊处理
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
        break;
      case 'views':
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
        break;
      case 'functions':
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
        break;
      case 'events':
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
        break;
      case 'queries':
        setShowQueryEditor(true);
        setShowPerformanceMonitor(false);
        break;
      case 'backup':
        setIsDatabaseBackupModalOpen(true);
        break;
      default:
        setSelectedFeature(null);
        break;
    }
  };

  const handleViewSelect = async (viewName: string, viewMeta: any) => {
    if (!selectedDatabase) return;
    setRoutineDetail(null);
    setEventDetail(null);
    setViewDetail({
      name: viewName,
      meta: viewMeta
    });
    setViewDetailLoading(true);
    setViewDetailError(null);

    try {
      const [definitionResult, dataResult] = await Promise.all([
        window.mysqlApi.getViewDefinition(selectedDatabase, viewName),
        window.mysqlApi.executeQuery(`SELECT * FROM ${sanitizeIdentifier(viewName)} LIMIT 100`, selectedDatabase)
      ]);

      if (!definitionResult.success) {
        throw new Error(definitionResult.error || t('mainView.loadViewDefinitionFailed'));
      }

      if (!dataResult.success) {
        throw new Error(dataResult.error || t('mainView.loadViewDataFailed'));
      }

      const definitionRow = definitionResult.data && definitionResult.data[0];
      const definition = definitionRow ? definitionRow['Create View'] || definitionRow['Create View '] || '' : '';
      const previewData = Array.isArray(dataResult.data) ? dataResult.data : [];

      setViewDetail({
        name: viewName,
        meta: viewMeta,
        definition,
        data: previewData
      });
    } catch (err: any) {
      setViewDetailError(err.message || t('mainView.loadViewDataFailed'));
    } finally {
      setViewDetailLoading(false);
    }
  };

  const refreshViewDetail = () => {
    if (selectedDatabase && viewDetail) {
      handleViewSelect(viewDetail.name, viewDetail.meta);
    }
  };

  const handleRoutineSelect = async (routineName: string, routineMeta: any): Promise<RoutineParameter[]> => {
    if (!selectedDatabase) return [] as RoutineParameter[];
    const routineType = (routineMeta?.ROUTINE_TYPE || (routineMeta?.FUNCTION_NAME ? 'FUNCTION' : 'PROCEDURE')).toUpperCase() as 'FUNCTION' | 'PROCEDURE';
    setViewDetail(null);
    setEventDetail(null);
    setRoutineDetail({
      name: routineName,
      type: routineType,
      meta: routineMeta
    });
    setRoutineDetailLoading(true);
    setRoutineDetailError(null);
    setRoutineParams([]);
    setRoutineParamValues({});
    setRoutineExecuteResult(null);
    setRoutineExecuteError(null);
    setRoutineExecuting(false);

    let paramsData: RoutineParameter[] = [];
    try {
      const definitionResult = routineType === 'FUNCTION'
        ? await window.mysqlApi.getFunctionDefinition(selectedDatabase, routineName)
        : await window.mysqlApi.getProcedureDefinition(selectedDatabase, routineName);

      if (!definitionResult.success) {
        throw new Error(definitionResult.error || t('mainView.loadRoutineDefinitionFailed'));
      }

      const key = routineType === 'FUNCTION' ? 'Create Function' : 'Create Procedure';
      const definitionRow = definitionResult.data && definitionResult.data[0];
      const definition = definitionRow ? definitionRow[key] || '' : '';

      setRoutineDetail({
        name: routineName,
        type: routineType,
        meta: routineMeta,
        definition
      });
    } catch (err: any) {
      setRoutineDetailError(err.message || t('mainView.loadRoutineDefinitionFailed'));
    }

    try {
      const paramsResult = await window.mysqlApi.getRoutineParameters(selectedDatabase, routineName, routineType);
      if (!paramsResult.success) {
        throw new Error(paramsResult.error || t('mainView.loadRoutineParametersFailed'));
      }
      paramsData = (paramsResult.data || []).map((row: any, index: number) => {
        const nameRaw = row.PARAMETER_NAME || row.parameter_name;
        const position = typeof row.ORDINAL_POSITION === 'number' ? row.ORDINAL_POSITION : row.ordinal_position || index + 1;
        return {
          name: nameRaw ? String(nameRaw) : `param${position}`,
          type: row.DTD_IDENTIFIER || row.dtd_identifier || '',
          mode: (row.PARAMETER_MODE || row.parameter_mode || 'IN').toUpperCase(),
          position
        };
      });
      setRoutineParams(paramsData);
      const initialValues = paramsData.reduce<Record<string, string>>((acc, param) => {
        acc[param.name] = '';
        return acc;
      }, {});
      setRoutineParamValues(initialValues);
    } catch (err: any) {
      setRoutineDetailError(prev => prev || err.message || t('mainView.loadRoutineParametersFailed'));
    } finally {
      setRoutineDetailLoading(false);
    }
    return paramsData;
  };

  const refreshRoutineDetail = () => {
    if (selectedDatabase && routineDetail) {
      handleRoutineSelect(routineDetail.name, routineDetail.meta);
    }
  };

  const handleRoutineExecuteRequest = async (routineName: string, routineMeta: any) => {
    const params = await handleRoutineSelect(routineName, routineMeta);
    if (params.length === 0) {
      await handleRoutineExecute();
    }
  };

  const handleRoutineParamChange = (paramName: string, value: string) => {
    setRoutineParamValues((prev) => ({ ...prev, [paramName]: value }));
  };

  const resetRoutineParamInputs = () => {
    const initial = routineParams.reduce<Record<string, string>>((acc, param) => {
      acc[param.name] = '';
      return acc;
    }, {});
    setRoutineParamValues(initial);
    setRoutineExecuteResult(null);
    setRoutineExecuteError(null);
  };

  const handleRoutineExecute = async () => {
    if (!selectedDatabase || !routineDetail) return;
    if (routineParams.some(param => param.mode !== 'IN')) {
      setRoutineExecuteError(t('mainView.routineOutParamUnsupported'));
      return;
    }

    const orderedParams = [...routineParams].sort((a, b) => a.position - b.position);
    try {
      const args = orderedParams.map((param) => {
        const current = routineParamValues[param.name] ?? '';
        return coerceRoutineValue(param, current);
      });

      setRoutineExecuting(true);
      setRoutineExecuteError(null);
      const execResult = await window.mysqlApi.executeRoutine(
        selectedDatabase,
        routineDetail.name,
        routineDetail.type,
        args
      );

      if (!execResult.success) {
        throw new Error(execResult.error || t('mainView.routineExecuteFailed'));
      }

      setRoutineExecuteResult(execResult.data ?? []);
    } catch (error: any) {
      setRoutineExecuteError(error.message || t('mainView.routineExecuteFailed'));
      setRoutineExecuteResult(null);
    } finally {
      setRoutineExecuting(false);
    }
  };

  const extractRoutineResultSets = (data: any): any[][] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0])) {
        return data.filter((item) => Array.isArray(item)) as any[][];
      }
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !('affectedRows' in data[0])) {
        return [data as any[]];
      }
    } else if (typeof data === 'object') {
      if (!('affectedRows' in data)) {
        return [[data]];
      }
    }
    return [];
  };

  const renderRoutineResultSets = () => {
    if (!routineExecuteResult) {
      return null;
    }
    const resultSets = extractRoutineResultSets(routineExecuteResult);
    if (resultSets.length === 0) {
      return (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {t('mainView.routineExecuteNoResult')}
        </Alert>
      );
    }

    return resultSets.map((rows, index) => {
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return (
        <Box key={`routine-result-${index}`} sx={{ mb: index === resultSets.length - 1 ? 0 : 3 }}>
          {resultSets.length > 1 && (
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('mainView.routineResultSetTitle', { index: index + 1 })}
            </Typography>
          )}
          {rows.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {t('mainView.routineExecuteNoRows')}
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 240, borderRadius: 1, border: '1px solid #ecf0f1' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column} sx={{ fontWeight: 600 }}>
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} hover>
                      {columns.map((column) => (
                        <TableCell key={column} sx={{ fontFamily: 'Menlo, monospace', fontSize: 13 }}>
                          {row[column] === null || row[column] === undefined
                            ? 'NULL'
                            : typeof row[column] === 'object'
                              ? JSON.stringify(row[column])
                              : String(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      );
    });
  };

  const handleEventSelect = async (eventName: string, eventMeta: any) => {
    if (!selectedDatabase) return;
    setViewDetail(null);
    setRoutineDetail(null);
    setEventDetail({
      name: eventName,
      meta: eventMeta
    });
    setEventDetailLoading(true);
    setEventDetailError(null);

    try {
      const definitionResult = await window.mysqlApi.getEventDefinition(selectedDatabase, eventName);

      if (!definitionResult.success) {
        throw new Error(definitionResult.error || t('mainView.loadEventDefinitionFailed'));
      }

      const definitionRow = definitionResult.data && definitionResult.data[0];
      const definition = definitionRow ? definitionRow['Create Event'] || '' : '';

      setEventDetail({
        name: eventName,
        meta: eventMeta,
        definition
      });
    } catch (err: any) {
      setEventDetailError(err.message || t('mainView.loadEventDefinitionFailed'));
    } finally {
      setEventDetailLoading(false);
    }
  };

  const refreshEventDetail = () => {
    if (selectedDatabase && eventDetail) {
      handleEventSelect(eventDetail.name, eventDetail.meta);
    }
  };

  const renderPlaceholder = (message: string) => (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: '#7f8c8d',
      gap: 1.5,
      px: 4
    }}>
      <Typography variant="h6" sx={{ fontWeight: 500 }}>{message}</Typography>
    </Box>
  );

  const renderViewDetailContent = () => {
    if (viewDetailLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            {t('mainView.loadingView')}
          </Typography>
        </Box>
      );
    }

    if (viewDetailError) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {viewDetailError}
          </Alert>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshViewDetail}>
            {t('mainView.retryLoad')}
          </Button>
        </Box>
      );
    }

    if (!viewDetail) {
      return renderPlaceholder(t('mainView.selectViewHint'));
    }

    const meta = viewDetail.meta || {};
    const previewRows = viewDetail.data || [];
    const previewColumns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #ecf0f1' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {viewDetail.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {meta.DEFINER}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color={meta.IS_UPDATABLE === 'YES' ? 'success' : 'default'}
                label={meta.IS_UPDATABLE === 'YES' ? t('mainView.viewUpdatable') : t('mainView.viewReadOnly')}
              />
              {meta.SECURITY_TYPE && (
                <Chip size="small" variant="outlined" label={`${t('mainView.viewSecurity')}: ${meta.SECURITY_TYPE}`} />
              )}
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('mainView.viewDefinitionTitle')}
          </Typography>
          <Box sx={{
            position: 'relative',
            borderRadius: 1,
            border: '1px solid #ecf0f1',
            bgcolor: '#fafafa',
            p: 2,
            maxHeight: 240,
            overflow: 'auto',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6
          }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
              <Tooltip title={t('mainView.copyDefinition')}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => viewDetail.definition && copyToClipboard(viewDetail.definition)}
                    disabled={!viewDetail.definition}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('mainView.refresh')}>
                <IconButton size="small" onClick={refreshViewDetail} disabled={viewDetailLoading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', mb: 0 }}>
              {viewDetail.definition || t('mainView.noDefinition')}
            </Typography>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #ecf0f1', flex: 1, minHeight: 240 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('mainView.viewDataPreviewTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('mainView.viewDataPreviewSubtitle')}
            </Typography>
          </Stack>
          {previewRows.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {t('mainView.noViewData')}
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: '100%', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {previewColumns.map((column) => (
                      <TableCell key={column} sx={{ fontWeight: 600 }}>
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} hover>
                      {previewColumns.map((column) => (
                        <TableCell key={column}>
                          <Typography variant="body2" sx={{ fontFamily: 'Menlo, monospace' }}>
                            {String(row[column] ?? '')}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #ecf0f1' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('mainView.routineExecutionTitle')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleRoutineExecute}
                disabled={routineExecuting || routineParams.some(param => param.mode !== 'IN')}
              >
                {routineExecuting ? t('mainView.routineExecuting') : t('mainView.routineExecute')}
              </Button>
              <Button variant="outlined" onClick={resetRoutineParamInputs} disabled={routineExecuting}>
                {t('mainView.routineReset')}
              </Button>
            </Stack>
          </Stack>

          {routineParams.some(param => param.mode !== 'IN') && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {t('mainView.routineOutParamUnsupported')}
            </Alert>
          )}

          {routineParams.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
              {t('mainView.routineNoParams')}
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                mb: 2
              }}
            >
              {routineParams.map((param) => (
                <TextField
                  key={param.name}
                  label={`${param.name} (${param.type}${param.mode ? `, ${param.mode}` : ''})`}
                  value={routineParamValues[param.name] ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleRoutineParamChange(param.name, event.target.value)}
                  size="small"
                  disabled={param.mode !== 'IN'}
                  helperText={param.mode !== 'IN' ? t('mainView.routineOutParamHint') : undefined}
                />
              ))}
            </Box>
          )}

          {routineExecuteError && (
            <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
              {routineExecuteError}
            </Alert>
          )}

          {routineExecuteResult && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {t('mainView.routineResultTitle')}
              </Typography>
              {renderRoutineResultSets()}
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  const renderRoutineDetailContent = () => {
    if (routineDetailLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            {t('mainView.loadingRoutine')}
          </Typography>
        </Box>
      );
    }

    if (routineDetailError) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {routineDetailError}
          </Alert>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshRoutineDetail}>
            {t('mainView.retryLoad')}
          </Button>
        </Box>
      );
    }

    if (!routineDetail) {
      return renderPlaceholder(t('mainView.selectRoutineHint'));
    }

    const meta = routineDetail.meta || {};

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #ecf0f1' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {routineDetail.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {meta.DEFINER}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color={routineDetail.type === 'FUNCTION' ? 'primary' : 'info'}
                label={routineDetail.type === 'FUNCTION' ? t('mainView.functionLabel') : t('mainView.procedureLabel')}
              />
              {meta.RETURN_TYPE && (
                <Chip size="small" variant="outlined" label={`${t('mainView.returnType')}: ${meta.RETURN_TYPE}`} />
              )}
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mb: 2 }}>
            {meta.CREATED && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.createdAt', { time: new Date(meta.CREATED).toLocaleString() })}
              </Typography>
            )}
            {meta.LAST_ALTERED && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.lastAlteredAt', { time: new Date(meta.LAST_ALTERED).toLocaleString() })}
              </Typography>
            )}
            {meta.ROUTINE_COMMENT && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.commentLabel', { comment: meta.ROUTINE_COMMENT })}
              </Typography>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('mainView.routineDefinitionTitle')}
          </Typography>
          <Box sx={{
            position: 'relative',
            borderRadius: 1,
            border: '1px solid #ecf0f1',
            bgcolor: '#fafafa',
            p: 2,
            maxHeight: 320,
            overflow: 'auto',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6
          }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
              <Tooltip title={t('mainView.copyDefinition')}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => routineDetail.definition && copyToClipboard(routineDetail.definition)}
                    disabled={!routineDetail.definition}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('mainView.refresh')}>
                <IconButton size="small" onClick={refreshRoutineDetail} disabled={routineDetailLoading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', mb: 0 }}>
              {routineDetail.definition || t('mainView.noDefinition')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderEventDetailContent = () => {
    if (eventDetailLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            {t('mainView.loadingEvent')}
          </Typography>
        </Box>
      );
    }

    if (eventDetailError) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {eventDetailError}
          </Alert>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshEventDetail}>
            {t('mainView.retryLoad')}
          </Button>
        </Box>
      );
    }

    if (!eventDetail) {
      return renderPlaceholder(t('mainView.selectEventHint'));
    }

    const meta = eventDetail.meta || {};

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #ecf0f1' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {eventDetail.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {meta.DEFINER}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color={
                  meta.STATUS === 'ENABLED'
                    ? 'success'
                    : meta.STATUS === 'DISABLED'
                      ? 'default'
                      : 'warning'
                }
                label={`${t('mainView.eventStatus')}: ${meta.STATUS}`}
              />
              {meta.EVENT_TYPE && (
                <Chip size="small" variant="outlined" label={`${t('mainView.eventType')}: ${meta.EVENT_TYPE}`} />
              )}
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mb: 2 }}>
            {meta.EXECUTE_AT && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.eventExecuteAt', { time: new Date(meta.EXECUTE_AT).toLocaleString() })}
              </Typography>
            )}
            {meta.INTERVAL_VALUE && meta.INTERVAL_FIELD && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.eventInterval', { value: meta.INTERVAL_VALUE, field: meta.INTERVAL_FIELD })}
              </Typography>
            )}
            {meta.EVENT_COMMENT && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.commentLabel', { comment: meta.EVENT_COMMENT })}
              </Typography>
            )}
            {meta.LAST_ALTERED && (
              <Typography variant="caption" color="text.secondary">
                {t('mainView.lastAlteredAt', { time: new Date(meta.LAST_ALTERED).toLocaleString() })}
              </Typography>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('mainView.eventDefinitionTitle')}
          </Typography>
          <Box sx={{
            position: 'relative',
            borderRadius: 1,
            border: '1px solid #ecf0f1',
            bgcolor: '#fafafa',
            p: 2,
            maxHeight: 320,
            overflow: 'auto',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6
          }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
              <Tooltip title={t('mainView.copyDefinition')}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => eventDetail.definition && copyToClipboard(eventDetail.definition)}
                    disabled={!eventDetail.definition}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('mainView.refresh')}>
                <IconButton size="small" onClick={refreshEventDetail} disabled={eventDetailLoading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', mb: 0 }}>
              {eventDetail.definition || t('mainView.noDefinition')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  };

  const toolbarButtons = [
    {
      key: 'connection',
      label: t('mainView.toolbar.connection'),
      icon: <LanRoundedIcon fontSize="inherit" />,
      color: '#6ecf97',
      onClick: () => {
        setSelectedFeature(null);
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
      },
      isActive: () => !selectedFeature && !showQueryEditor && !showPerformanceMonitor
    },
    {
      key: 'query',
      label: t('mainView.toolbar.newQuery'),
      icon: <EditNoteIcon fontSize="inherit" />,
      color: '#ff9e64',
      onClick: () => {
        setSelectedFeature(null);
        setShowPerformanceMonitor(false);
        setShowQueryEditor(true);
      },
      isActive: () => showQueryEditor
    },
    {
      key: 'tables',
      label: t('mainView.toolbar.table'),
      icon: <TableIcon fontSize="inherit" />,
      color: '#6fb6ff',
      onClick: () => {
        setSelectedFeature('tables');
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
      },
      isActive: () => selectedFeature === 'tables'
    },
    {
      key: 'views',
      label: t('mainView.toolbar.view'),
      icon: <ViewIcon fontSize="inherit" />,
      color: '#b698ff',
      onClick: () => {
        setSelectedFeature('views');
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
      },
      isActive: () => selectedFeature === 'views'
    },
    {
      key: 'functions',
      label: t('mainView.toolbar.function'),
      icon: <FunctionIcon fontSize="inherit" />,
      color: '#ffd66f',
      onClick: () => {
        setSelectedFeature('functions');
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
      },
      isActive: () => selectedFeature === 'functions'
    },
    {
      key: 'users',
      label: t('mainView.toolbar.user'),
      icon: <PeopleIcon fontSize="inherit" />,
      color: '#75aaff',
      onClick: () => {
        setSelectedFeature('events');
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
      },
      isActive: () => selectedFeature === 'events'
    },
    {
      key: 'queryBuilder',
      label: t('mainView.toolbar.search'),
      icon: <SearchIcon fontSize="inherit" />,
      color: '#61e3c1',
      onClick: () => {
        setSelectedFeature(null);
        setShowPerformanceMonitor(false);
        setShowQueryEditor(true);
      },
      isActive: () => showQueryEditor
    },
    {
      key: 'backup',
      label: t('mainView.toolbar.backup'),
      icon: <InsightsIcon fontSize="inherit" />,
      color: '#ffb874',
      onClick: () => setIsDatabaseBackupModalOpen(true),
      isActive: () => false
    },
    {
      key: 'schedule',
      label: t('mainView.toolbar.automation'),
      icon: <AutorenewIcon fontSize="inherit" />,
      color: '#6adfff',
      onClick: () => setIsSyncWizardOpen(true),
      isActive: () => false
    },
    {
      key: 'model',
      label: t('mainView.toolbar.model'),
      icon: <ScienceIcon fontSize="inherit" />,
      color: '#ffb3ff',
      onClick: () => {
        setSelectedFeature('tables');
        setShowQueryEditor(false);
        setShowPerformanceMonitor(false);
      },
      isActive: () => false
    }
  ];



  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      bgcolor: '#14171f'
    }}>
      {/* Left Navigation */}
      <Box sx={{
        width: 280,
        background: 'linear-gradient(180deg, #1d2430 0%, #12161f 100%)',
        borderRight: '1px solid #10141b',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <DatabaseNavigator
          databases={databases}
          selectedDatabase={selectedDatabase}
          selectedTable={selectedTable}
          tables={tables}
          onDatabaseSelect={handleDatabaseClick}
          onTableSelect={handleTableClick}
          onDatabaseFeatureSelect={handleDatabaseFeatureSelect}
          onRefresh={() => { void refreshTablesForSelectedDatabase(); }}
        />
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        bgcolor: '#181c24',
        position: 'relative'
      }}>
        {/* Navicat-style Toolbar */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: '#1f232c',
            borderBottom: '1px solid #10141b',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box sx={{ minWidth: 220 }}>
            <Typography variant="h6" sx={{ color: '#f4f7ff', fontWeight: 600 }}>
              {selectedDatabase && selectedTable
                ? `${selectedDatabase} → ${selectedTable}`
                : selectedDatabase
                ? selectedDatabase
                : t('mainView.navOverview')}
            </Typography>
            {connectionError && (
              <Typography variant="body2" sx={{ color: '#ff6b6b', mt: 0.5 }}>
                {connectionError}
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ flexWrap: 'nowrap', justifyContent: 'flex-start', overflowX: 'auto' }}
            >
              {toolbarButtons.map((item) => {
                const active = item.isActive();
                const iconColor = active ? '#ffffff' : item.color;

                return (
                  <Tooltip key={item.key} title={item.label} placement="bottom" arrow>
                    <IconButton
                      onClick={item.onClick}
                      size="small"
                      disableRipple
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        color: iconColor,
                        backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                        border: active ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.04)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.12)',
                          borderColor: 'rgba(255,255,255,0.2)',
                          color: '#ffffff'
                        }
                      }}
                    >
                      {React.cloneElement(item.icon, { fontSize: 'inherit' })}
                    </IconButton>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
            <Tooltip title={t('mainView.toolbar.listView')} arrow>
              <IconButton
                size="small"
                onClick={() => setViewModeToggle('list')}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  color: viewModeToggle === 'list' ? '#ffffff' : '#7f8797',
                  backgroundColor: viewModeToggle === 'list' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: viewModeToggle === 'list' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#ffffff'
                  }
                }}
              >
                <ViewListIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('mainView.toolbar.gridView')} arrow>
              <IconButton
                size="small"
                onClick={() => setViewModeToggle('grid')}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  color: viewModeToggle === 'grid' ? '#ffffff' : '#7f8797',
                  backgroundColor: viewModeToggle === 'grid' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: viewModeToggle === 'grid' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#ffffff'
                  }
                }}
              >
                <ViewModuleIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <TextField
              size="small"
              value={toolbarSearch}
              onChange={(e) => setToolbarSearch(e.target.value)}
              placeholder={t('mainView.toolbar.searchPlaceholder')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#7f8797' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: 200,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#1b1f29',
                  height: 34,
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: '#2c3240'
                  },
                  '&:hover fieldset': {
                    borderColor: '#3f8cff'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3f8cff'
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#e9eefc',
                  fontSize: '0.8rem'
                }
              }}
            />
          </Box>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              m: 3,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.25)',
              border: '1px solid rgba(244, 67, 54, 0.4)',
              backgroundColor: 'rgba(244, 67, 54, 0.12)',
              color: '#ff8a80'
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Content area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          bgcolor: '#181c24',
          p: 3
        }}>
          {showPerformanceMonitor && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden'
            }}>
              <SuperPerformanceMonitor currentDatabase={selectedDatabase || undefined} />
            </Box>
          )}
          
          {showQueryEditor && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden'
            }}>
              <SuperSQLEditor currentDatabase={selectedDatabase} />
            </Box>
          )}

          {/* Views Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'views' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden',
              minHeight: 480
            }}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                <Box sx={{ width: 360, borderRight: '1px solid #ecf0f1', bgcolor: '#fdfdfd', overflow: 'hidden' }}>
                  <ViewsPanel 
                    database={selectedDatabase}
                    onViewSelect={handleViewSelect}
                  />
                </Box>
                <Box sx={{ flex: 1, bgcolor: '#ffffff', overflow: 'auto', p: 3 }}>
                  {renderViewDetailContent()}
                </Box>
              </Box>
            </Box>
          )}

          {/* Functions Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'functions' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden',
              minHeight: 480
            }}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                <Box sx={{ width: 360, borderRight: '1px solid #ecf0f1', bgcolor: '#fdfdfd', overflow: 'hidden' }}>
                  <FunctionsPanel 
                    database={selectedDatabase}
                    onRoutineSelect={async (name, data) => { await handleRoutineSelect(name, data); }}
                    onRoutineExecute={handleRoutineExecuteRequest}
                  />
                </Box>
                <Box sx={{ flex: 1, bgcolor: '#ffffff', overflow: 'auto', p: 3 }}>
                  {renderRoutineDetailContent()}
                </Box>
              </Box>
            </Box>
          )}

          {/* Events Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'events' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden',
              minHeight: 480
            }}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                <Box sx={{ width: 360, borderRight: '1px solid #ecf0f1', bgcolor: '#fdfdfd', overflow: 'hidden' }}>
                  <EventsPanel 
                    database={selectedDatabase}
                    onEventSelect={handleEventSelect}
                  />
                </Box>
                <Box sx={{ flex: 1, bgcolor: '#ffffff', overflow: 'auto', p: 3 }}>
                  {renderEventDetailContent()}
                </Box>
              </Box>
            </Box>
          )}

          {/* Tables Overview Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'tables' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden',
              height: 'calc(100% - 24px)'
            }}>
              <TablesOverview 
                database={selectedDatabase}
                tables={tables[selectedDatabase] || []}
                onTableSelect={(tableName) => handleTableClick(selectedDatabase, tableName)}
                onRefresh={refreshTablesForSelectedDatabase}
                loading={loadingTables === selectedDatabase}
              />
            </Box>
          )}
          
          {!showQueryEditor && !showPerformanceMonitor && !selectedFeature && selectedTable && tableData && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e1e6ef',
              overflow: 'hidden'
            }}>
              <ModernDataTable
                data={tableData}
                totalCount={totalRows}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                onAddRow={() => handleOpenModal(null)}
                onEditRow={(row: any) => handleOpenModal(row)}
                onDeleteRow={(row: any) => handleDeleteRow(row)}
                onDeleteRows={handleDeleteRows}
                onExportData={() => setIsDataExportModalOpen(true)}
                onRefreshData={() => selectedDatabase && selectedTable && handleTableClick(selectedDatabase, selectedTable)}
                onReconnect={handleReconnect}
                tableName={selectedTable || undefined}
                loading={loadingTableData !== null}
                connectionError={connectionError}
              />
            </Box>
          )}

          {!showQueryEditor && !showPerformanceMonitor && !selectedFeature && !selectedTable && (
            <Box sx={{ 
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              p: 6, 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100% - 48px)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <Box sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <Typography sx={{ fontSize: 48, color: '#bdc3c7' }}>📊</Typography>
              </Box>
              <Typography variant="h4" sx={{ 
                color: '#2c3e50',
                fontWeight: 600,
                mb: 2
              }}>
                {t('mainView.welcomeMessage')}
              </Typography>
              <Typography variant="body1" sx={{ 
                color: '#7f8c8d',
                mb: 4,
                maxWidth: 400,
                lineHeight: 1.6,
                fontFamily: 'Tapgo, "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Arial", sans-serif',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>
                {t('mainView.selectTableToView')}
              </Typography>
              {selectedDatabase && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateTableModalOpen(true)}
                  sx={{
                    bgcolor: '#3498db',
                    color: '#ffffff',
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    boxShadow: '0 4px 16px rgba(52, 152, 219, 0.3)',
                    '&:hover': {
                      bgcolor: '#2980b9',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(52, 152, 219, 0.4)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {t('mainView.createTable')}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          borderTop: '1px solid #10141b',
          bgcolor: '#131722',
          color: '#a0a8c0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 0.75,
          fontSize: '0.75rem'
        }}
      >
        <Typography variant="caption" sx={{ color: '#7f8797' }}>
          {selectedTable ? `${t('dataTable.tableData')} · ${tableData ? tableData.length : 0} 条` : t('mainView.navOverview')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#7f8797' }}>
          {selectedDatabase || 'Navicat Premium'}
        </Typography>
      </Box>

      {/* Modals */}
      <EditRowModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRow}
        rowData={editingRow}
        columns={tableData && tableData.length > 0 ? Object.keys(tableData[0]) : []}
      />

      <ConfirmationDialog
        open={isConfirmDialogOpen}
        title={t('mainView.confirmDeleteRowTitle')}
        message={rowToDelete ? t('mainView.areYouSureToDeleteRow', { 
          primaryKey: Object.keys(rowToDelete)[0], 
          primaryKeyValue: rowToDelete[Object.keys(rowToDelete)[0]] 
        }) : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDialogOpen(false)}
      />

      {/* 批量删除确认对话框 */}
      <ConfirmationDialog
        open={isBatchDeleteDialogOpen}
        title={t('mainView.confirmBatchDeleteTitle')}
        message={rowsToDelete ? t('mainView.confirmBatchDeleteMessage', { count: rowsToDelete.length }) : ''}
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setIsBatchDeleteDialogOpen(false)}
      />

      <CreateTableModal
        open={isCreateTableModalOpen}
        onClose={() => setIsCreateTableModalOpen(false)}
        onCreate={handleCreateTable}
      />

      <SyncWizardModal
        open={isSyncWizardOpen}
        onClose={() => setIsSyncWizardOpen(false)}
      />

      {selectedTable && selectedDatabase && tableData && (
        <DataExportModal
          open={isDataExportModalOpen}
          onClose={() => setIsDataExportModalOpen(false)}
          database={selectedDatabase}
          table={selectedTable}
          data={tableData}
        />
      )}

      <DatabaseBackupModal
        open={isDatabaseBackupModalOpen}
        onClose={() => setIsDatabaseBackupModalOpen(false)}
        databases={databases.map(db => db.Database)}
      />
    </Box>
  );
}

export default ModernMainView;
