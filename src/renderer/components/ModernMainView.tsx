import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Button, Fab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import DatabaseNavigator from './DatabaseNavigator';
import ModernDataTable from './ModernDataTable';
import EnhancedQueryEditor from './EnhancedQueryEditor';
import PerformanceMonitor from './PerformanceMonitor';
import EditRowModal from './EditRowModal';
import ConfirmationDialog from './ConfirmationDialog';
import CreateTableModal from './CreateTableModal';
import SyncWizardModal from './SyncWizardModal';
import DataExportModal from './DataExportModal';
import DatabaseBackupModal from './DatabaseBackupModal';
import ViewsPanel from './ViewsPanel';
import FunctionsPanel from './FunctionsPanel';
import EventsPanel from './EventsPanel';
import { t } from '../i18n';

interface ModernMainViewProps {
  databases: any[];
}

function ModernMainView({ databases }: ModernMainViewProps) {
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
      } else {
        setError(result.error || t('mainView.failedToLoadTableData'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
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
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#ffffff' }}>
      {/* Left Navigation */}
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

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#ffffff' }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ m: 2 }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Toolbar */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: '#e0e0e0', 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          alignItems: 'center',
          bgcolor: '#ffffff'
        }}>
          <Button 
            variant="outlined" 
            onClick={() => setIsDatabaseBackupModalOpen(true)}
            sx={{ 
              color: '#1976d2',
              borderColor: '#1976d2',
              '&:hover': {
                bgcolor: '#f5f5f5',
                borderColor: '#1565c0'
              }
            }}
          >
            {t('databaseBackup.backupDatabase')}
          </Button>
          
          {selectedTable && tableData && (
            <Button 
              variant="outlined" 
              onClick={() => setIsDataExportModalOpen(true)}
              sx={{ 
                color: '#1976d2',
                borderColor: '#1976d2',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                  borderColor: '#1565c0'
                }
              }}
            >
              {t('dataExport.exportData')}
            </Button>
          )}
          
          <Button 
            variant="outlined"
            onClick={() => setIsSyncWizardOpen(true)}
            sx={{ 
              color: '#1976d2',
              borderColor: '#1976d2',
              '&:hover': {
                bgcolor: '#f5f5f5',
                borderColor: '#1565c0'
              }
            }}
          >
            {t('mainView.synchronize')}
          </Button>
          
          <Button 
            variant={showPerformanceMonitor ? "contained" : "outlined"}
            onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
            sx={{ 
              color: showPerformanceMonitor ? '#ffffff' : '#1976d2',
              backgroundColor: showPerformanceMonitor ? '#1976d2' : 'transparent',
              borderColor: '#1976d2',
              '&:hover': {
                bgcolor: showPerformanceMonitor ? '#1565c0' : '#f5f5f5',
                borderColor: '#1565c0'
              }
            }}
          >
            {t('performanceMonitor.title')}
          </Button>
          
          <Button 
            variant={showQueryEditor ? "contained" : "outlined"}
            onClick={() => setShowQueryEditor(!showQueryEditor)}
            sx={{ 
              color: showQueryEditor ? '#ffffff' : '#1976d2',
              backgroundColor: showQueryEditor ? '#1976d2' : 'transparent',
              borderColor: '#1976d2',
              '&:hover': {
                bgcolor: showQueryEditor ? '#1565c0' : '#f5f5f5',
                borderColor: '#1565c0'
              }
            }}
          >
            {t('queryEditor.sqlQueryEditor')}
          </Button>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#ffffff' }}>
          {showPerformanceMonitor && (
            <PerformanceMonitor currentDatabase={selectedDatabase} />
          )}
          
          {showQueryEditor && (
            <EnhancedQueryEditor currentDatabase={selectedDatabase} />
          )}

          {/* Views Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'views' && selectedDatabase && (
            <ViewsPanel 
              database={selectedDatabase}
              onViewSelect={(viewName, viewData) => {
                console.log('Selected view:', viewName, viewData);
                // TODO: Handle view selection (e.g., show view data)
              }}
            />
          )}

          {/* Functions Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'functions' && selectedDatabase && (
            <FunctionsPanel 
              database={selectedDatabase}
              onFunctionSelect={(functionName, functionData) => {
                console.log('Selected function:', functionName, functionData);
                // TODO: Handle function selection (e.g., show function details)
              }}
            />
          )}

          {/* Events Panel */}
          {!showQueryEditor && !showPerformanceMonitor && selectedFeature === 'events' && selectedDatabase && (
            <EventsPanel 
              database={selectedDatabase}
              onEventSelect={(eventName, eventData) => {
                console.log('Selected event:', eventName, eventData);
                // TODO: Handle event selection (e.g., show event details)
              }}
            />
          )}
          
          {!showQueryEditor && !showPerformanceMonitor && !selectedFeature && selectedTable && tableData && (
            <ModernDataTable
              data={tableData}
              totalCount={totalRows}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              onAddRow={() => handleOpenModal(null)}
              onEditRow={(row) => handleOpenModal(row)}
              onDeleteRow={handleDeleteRow}
              onDeleteRows={handleDeleteRows} // 新增：批量删除
              onExportData={() => setIsDataExportModalOpen(true)}
              onUpdateCell={handleUpdateCell}
              tableName={selectedTable}
              loading={loadingTableData === `${selectedDatabase}.${selectedTable}`}
            />
          )}

          {!showQueryEditor && !showPerformanceMonitor && !selectedFeature && !selectedTable && (
            <Box sx={{ 
              p: 4, 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <Typography variant="h4" color="text.secondary" gutterBottom>
                {t('mainView.welcomeMessage')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('mainView.selectTableToView')}
              </Typography>
              {selectedDatabase && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateTableModalOpen(true)}
                >
                  {t('mainView.createTable')}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Floating Action Button */}
      {selectedTable && !showQueryEditor && !showPerformanceMonitor && !selectedFeature && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenModal(null)}
        >
          <AddIcon />
        </Fab>
      )}

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
