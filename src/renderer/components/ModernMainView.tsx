import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Button, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon, Brightness4 as DarkModeIcon } from '@mui/icons-material';
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

  const handleDatabaseClick = async (dbName: string) => {
    if (selectedDatabase === dbName) {
      setSelectedDatabase(null);
      setSelectedTable(null);
      setTableData(null);
      setError(null);
    } else {
      setSelectedDatabase(dbName);
      setSelectedTable(null);
      setTableData(null);
      setError(null);

      if (!tables[dbName]) {
        setLoadingTables(dbName);
        try {
          const result = await window.mysqlApi.getTables(dbName);
          if (result.success) {
            setTables((prev) => ({ ...prev, [dbName]: result.data || [] }));
          } else {
            setError(result.error || t('mainView.failedToLoadTables'));
          }
        } catch (err: any) {
          setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
        } finally {
          setLoadingTables(null);
        }
      }
    }
  };

  const handleTableClick = async (dbName: string, tableName: string, newPage: number = 0, newRowsPerPage: number = rowsPerPage) => {
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

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      bgcolor: '#121212'
    }}>
      {/* Left Navigation - 深色主题 */}
      <Box sx={{
        width: 320,
        bgcolor: '#2d2d2d',
        borderRight: '1px solid #444444',
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
          onRefresh={() => window.location.reload()}
        />
      </Box>

      {/* Main Content Area - Enhanced with modern card design */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        bgcolor: '#f8f9fa',
        position: 'relative'
      }}>
        {/* Top Toolbar */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: 1
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {selectedDatabase ? `数据库: ${selectedDatabase}` : 'MySQL 客户端'}
            {selectedTable && ` / 表: ${selectedTable}`}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="主题切换">
              <IconButton 
                size="medium"
                sx={{
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <DarkModeIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              m: 3,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
              border: '1px solid #ffebee'
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Enhanced Toolbar with modern card design */}
        <Box sx={{ 
          p: 3, 
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e3e8ee',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Box sx={{
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2c3e50',
              fontWeight: 600,
              mr: 'auto'
            }}>
              {selectedDatabase && selectedTable 
                ? `${selectedDatabase} → ${selectedTable}` 
                : selectedDatabase 
                  ? selectedDatabase
                  : '数据库管理'
              }
            </Typography>
            
            <Button 
              variant="outlined" 
              onClick={() => setIsDatabaseBackupModalOpen(true)}
              sx={{ 
                color: '#3498db',
                borderColor: '#3498db',
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  bgcolor: '#ebf3fd',
                  borderColor: '#2980b9',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(52, 152, 219, 0.15)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {t('databaseBackup.backupDatabase')}
            </Button>
            
            {selectedTable && tableData && (
              <Button 
                variant="outlined" 
                onClick={() => setIsDataExportModalOpen(true)}
                sx={{ 
                  color: '#27ae60',
                  borderColor: '#27ae60',
                  borderRadius: 2,
                  px: 3,
                  '&:hover': {
                    bgcolor: '#eafaf1',
                    borderColor: '#229954',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(39, 174, 96, 0.15)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {t('dataExport.exportData')}
              </Button>
            )}
            
            <Button 
              variant="outlined"
              onClick={() => setIsSyncWizardOpen(true)}
              sx={{ 
                color: '#9b59b6',
                borderColor: '#9b59b6',
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  bgcolor: '#f4f1f7',
                  borderColor: '#8e44ad',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(155, 89, 182, 0.15)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {t('mainView.synchronize')}
            </Button>
            
            <Button 
              variant={showPerformanceMonitor ? "contained" : "outlined"}
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              sx={{ 
                color: showPerformanceMonitor ? '#ffffff' : '#e67e22',
                backgroundColor: showPerformanceMonitor ? '#e67e22' : 'transparent',
                borderColor: '#e67e22',
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  bgcolor: showPerformanceMonitor ? '#d35400' : '#fef9e7',
                  borderColor: '#d35400',
                  transform: 'translateY(-1px)',
                  boxShadow: `0 4px 12px ${showPerformanceMonitor ? 'rgba(230, 126, 34, 0.3)' : 'rgba(230, 126, 34, 0.15)'}`
                },
                transition: 'all 0.2s ease'
              }}
            >
              {t('performanceMonitor.title')}
            </Button>
            
            <Button 
              variant={showQueryEditor ? "contained" : "outlined"}
              onClick={() => setShowQueryEditor(!showQueryEditor)}
              sx={{ 
                color: showQueryEditor ? '#ffffff' : '#e74c3c',
                backgroundColor: showQueryEditor ? '#e74c3c' : 'transparent',
                borderColor: '#e74c3c',
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  bgcolor: showQueryEditor ? '#c0392b' : '#fdedec',
                  borderColor: '#c0392b',
                  transform: 'translateY(-1px)',
                  boxShadow: `0 4px 12px ${showQueryEditor ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.15)'}`
                },
                transition: 'all 0.2s ease'
              }}
            >
              {t('queryEditor.sqlQueryEditor')}
            </Button>
          </Box>
        </Box>

        {/* Content with enhanced styling */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          bgcolor: '#f8f9fa',
          p: 3
        }}>
          {showPerformanceMonitor && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <SuperPerformanceMonitor currentDatabase={selectedDatabase || undefined} />
            </Box>
          )}
          
          {showQueryEditor && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <SuperSQLEditor currentDatabase={selectedDatabase} />
            </Box>
          )}

          {/* Views Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'views' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <ViewsPanel 
                database={selectedDatabase}
                onViewSelect={(viewName, viewData) => {
                  console.log('Selected view:', viewName, viewData);
                  // TODO: Handle view selection (e.g., show view data)
                }}
              />
            </Box>
          )}

          {/* Functions Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'functions' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <FunctionsPanel 
                database={selectedDatabase}
                onFunctionSelect={(functionName, functionData) => {
                  console.log('Selected function:', functionName, functionData);
                  // TODO: Handle function selection (e.g., show function details)
                }}
              />
            </Box>
          )}

          {/* Events Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'events' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <EventsPanel 
                database={selectedDatabase}
                onEventSelect={(eventName, eventData) => {
                  console.log('Selected event:', eventName, eventData);
                  // TODO: Handle event selection (e.g., show event details)
                }}
              />
            </Box>
          )}

          {/* Tables Overview Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'tables' && selectedDatabase && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              height: 'calc(100% - 24px)'
            }}>
              <TablesOverview 
                database={selectedDatabase}
                tables={tables[selectedDatabase] || []}
                onTableSelect={(tableName) => handleTableClick(selectedDatabase, tableName)}
                onRefresh={() => handleDatabaseClick(selectedDatabase)}
                loading={loadingTables === selectedDatabase}
              />
            </Box>
          )}
          
          {!showQueryEditor && !showPerformanceMonitor && !selectedFeature && selectedTable && tableData && (
            <Box sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
                onExportData={() => setIsDataExportModalOpen(true)}
                onRefreshData={() => selectedDatabase && selectedTable && handleTableClick(selectedDatabase, selectedTable)}
                tableName={selectedTable || undefined}
                loading={loadingTableData !== null}
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
