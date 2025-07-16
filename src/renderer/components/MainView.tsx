import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, TablePagination } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import { t } from '../i18n';
import EditRowModal from './EditRowModal';
import SyncWizardModal from './SyncWizardModal';
import QueryEditor from './QueryEditor';
import EnhancedQueryEditor from './EnhancedQueryEditor';
import ConfirmationDialog from './ConfirmationDialog';
import CreateTableModal from './CreateTableModal';
import DataExportModal from './DataExportModal';
import DatabaseBackupModal from './DatabaseBackupModal';
import PerformanceMonitor from './PerformanceMonitor';
import DatabaseNavigator from './DatabaseNavigator';
import ModernDataTable from './ModernDataTable';

interface MainViewProps {
  databases: any[];
}

function MainView({ databases }: MainViewProps) {
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<{ [key: string]: any[] }>({});
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [loadingTables, setLoadingTables] = useState<string | null>(null);
  const [loadingTableData, setLoadingTableData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isSyncWizardOpen, setIsSyncWizardOpen] = useState(false);
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [isCreateDbModalOpen, setIsCreateDbModalOpen] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [dbToDelete, setDbToDelete] = useState<string | null>(null);
  const [isConfirmDeleteDbOpen, setIsConfirmDeleteDbOpen] = useState(false);
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isConfirmDeleteTableOpen, setIsConfirmDeleteTableOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [isDataExportModalOpen, setIsDataExportModalOpen] = useState(false);
  const [isDatabaseBackupModalOpen, setIsDatabaseBackupModalOpen] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  const handleDatabaseClick = async (dbName: string) => {
    if (selectedDatabase === dbName) {
      setSelectedDatabase(null); // Collapse if already selected
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

  const handleChangePage = (event: unknown, newPage: number) => {
    if (selectedDatabase && selectedTable) {
      handleTableClick(selectedDatabase, selectedTable, newPage, rowsPerPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedDatabase && selectedTable) {
      handleTableClick(selectedDatabase, selectedTable, 0, parseInt(event.target.value, 10));
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
            handleTableClick(selectedDatabase, selectedTable); // Refresh data
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

  const handleConfirmDelete = async () => {
    if (!selectedDatabase || !selectedTable || !rowToDelete) return;

    const primaryKey = Object.keys(rowToDelete)[0];
    const primaryKeyValue = rowToDelete[primaryKey];

    try {
      const result = await window.mysqlApi.deleteRow(selectedDatabase, selectedTable, primaryKey, primaryKeyValue);
      if (result.success) {
        handleTableClick(selectedDatabase, selectedTable); // Refresh data
      } else {
        setError(result.error || t('mainView.failedToDeleteRow'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setIsConfirmDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setRowToDelete(null);
  };

  const handleCreateDatabase = async () => {
    if (!newDbName.trim()) {
      setError(t('mainView.databaseNameCannotBeEmpty'));
      return;
    }
    try {
      const result = await window.mysqlApi.createDatabase(newDbName);
      if (result.success) {
        // Refresh databases list
        window.location.reload(); // Simple reload for now
      } else {
        setError(result.error || t('mainView.failedToCreateDatabase'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setIsCreateDbModalOpen(false);
      setNewDbName('');
    }
  };

  const handleDeleteDatabase = (dbName: string) => {
    setDbToDelete(dbName);
    setIsConfirmDeleteDbOpen(true);
  };

  const handleConfirmDeleteDatabase = async () => {
    if (!dbToDelete) return;
    try {
      const result = await window.mysqlApi.dropDatabase(dbToDelete);
      if (result.success) {
        // Refresh databases list
        window.location.reload(); // Simple reload for now
      } else {
        setError(result.error || t('mainView.failedToDeleteDatabase'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setIsConfirmDeleteDbOpen(false);
      setDbToDelete(null);
    }
  };

  const handleCancelDeleteDatabase = () => {
    setIsConfirmDeleteDbOpen(false);
    setDbToDelete(null);
  };

  const handleCreateTable = async (tableName: string, columns: any[]) => {
    if (!selectedDatabase) {
      setError(t('mainView.selectDatabaseToCreateTable'));
      return;
    }
    try {
      const result = await window.mysqlApi.createTable(selectedDatabase, tableName, columns);
      if (result.success) {
        // Refresh tables list for the selected database
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

  const handleDeleteTable = (tableName: string) => {
    if (!selectedDatabase) return;
    setTableToDelete(tableName);
    setIsConfirmDeleteTableOpen(true);
  };

  const handleConfirmDeleteTable = async () => {
    if (!selectedDatabase || !tableToDelete) return;
    try {
      const result = await window.mysqlApi.dropTable(selectedDatabase, tableToDelete);
      if (result.success) {
        handleDatabaseClick(selectedDatabase); // Refresh tables list
      } else {
        setError(result.error || t('mainView.failedToDeleteTable'));
      }
    } catch (err: any) {
      setError(err.message || t('connectionForm.anUnknownErrorOccurred'));
    } finally {
      setIsConfirmDeleteTableOpen(false);
      setTableToDelete(null);
    }
  };

  const handleCancelDeleteTable = () => {
    setIsConfirmDeleteTableOpen(false);
    setTableToDelete(null);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box sx={{ width: 240, flexShrink: 0, borderRight: 1, borderColor: 'divider', overflowY: 'auto', position: 'sticky', top: 0, height: '100vh' }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          {t('mainView.databases')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ m: 2 }}
          onClick={() => setIsCreateDbModalOpen(true)}
        >
          {t('mainView.createDatabase')}
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ m: 2 }}
          onClick={() => selectedDatabase ? setIsCreateTableModalOpen(true) : setError(t('mainView.selectDatabaseToCreateTable'))}
          disabled={!selectedDatabase}
        >
          {t('mainView.createTable')}
        </Button>
        <List>
          {databases.map((db) => (
            <React.Fragment key={db.Database}>
              <ListItem
                component="button"
                onClick={() => handleDatabaseClick(db.Database)}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={(e) => {
                    e.stopPropagation(); // Prevent selecting the item when clicking delete
                    handleDeleteDatabase(db.Database);
                  }}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={db.Database} />
                {loadingTables === db.Database && <CircularProgress size={20} />}
                {selectedDatabase === db.Database ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              {selectedDatabase === db.Database && tables[db.Database] && (
                <List component="div" disablePadding sx={{ pl: 4 }}>
                  {tables[db.Database].map((table, index) => {
                    const tableName = table[Object.keys(table)[0]];
                    return (
                      <ListItem
                        component="button"
                        key={index}
                        onClick={() => handleTableClick(db.Database, tableName)}
                        secondaryAction={
                          <IconButton edge="end" aria-label="delete" onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTable(tableName);
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={tableName} />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            {selectedTable && !showQueryEditor && <Button variant="contained" onClick={() => handleOpenModal(null)} sx={{ mr: 1 }}>{t('mainView.addNewRow')}</Button>}
            <Button variant="contained" color="secondary" onClick={() => setIsSyncWizardOpen(true)} sx={{ mr: 1 }}>{t('mainView.synchronize')}</Button>
            <Button variant="contained" onClick={() => setShowQueryEditor(!showQueryEditor)}>
              {showQueryEditor ? t('mainView.hideQueryEditor') : t('mainView.showQueryEditor')}
            </Button>
          </Box>
          <Box>
            <Button variant="contained" color="secondary" onClick={() => setIsDatabaseBackupModalOpen(true)} sx={{ mr: 1 }}>
              {t('databaseBackup.backupDatabase')}
            </Button>
            {selectedTable && tableData && (
              <Button variant="contained" color="info" onClick={() => setIsDataExportModalOpen(true)} sx={{ mr: 1 }}>
                {t('dataExport.exportData')}
              </Button>
            )}
            <Button variant="contained" color="warning" onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)} sx={{ mr: 1 }}>
              {showPerformanceMonitor ? t('performanceMonitor.hide') : t('performanceMonitor.show')}
            </Button>
          </Box>
        </Box>
        {showQueryEditor ? (
          <EnhancedQueryEditor currentDatabase={selectedDatabase} />
        ) : (
          <>
            {loadingTableData && <CircularProgress />}
            {tableData && tableData.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {Object.keys(tableData[0]).map((key) => (
                        <TableCell key={key}>{key}</TableCell>
                      ))}
                      <TableCell>{t('mainView.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableData.map((row, index) => (
                      <TableRow 
                        key={index} 
                        onClick={() => setSelectedRowIndex(index)}
                        sx={{ backgroundColor: selectedRowIndex === index ? 'action.selected' : 'transparent' }}
                      >
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i}>{String(value)}</TableCell>
                        ))}
                        <TableCell>
                          <IconButton onClick={() => handleOpenModal(row)} size="small"><EditIcon /></IconButton>
                          <IconButton onClick={() => handleDeleteRow(row)} size="small"><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {tableData && totalRows > 0 && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalRows}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            )}
            {tableData && tableData.length === 0 && !loadingTableData && (
              <Typography>{t('mainView.noDataInThisTable')}</Typography>
            )}
          </>
        )}
        {isModalOpen && (
          <EditRowModal
            open={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveRow}
            rowData={editingRow}
            columns={tableData ? Object.keys(tableData[0]) : []}
          />
        )}
        <SyncWizardModal open={isSyncWizardOpen} onClose={() => setIsSyncWizardOpen(false)} />
        {isConfirmDialogOpen && rowToDelete && (
          <ConfirmationDialog
            open={isConfirmDialogOpen}
            title={t('mainView.confirmDeleteTitle')}
            message={t('mainView.areYouSureToDeleteRow', { primaryKey: Object.keys(rowToDelete)[0], primaryKeyValue: rowToDelete[Object.keys(rowToDelete)[0]] })}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
        <Dialog open={isCreateDbModalOpen} onClose={() => setIsCreateDbModalOpen(false)}>
          <DialogTitle>{t('mainView.createDatabase')}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={t('mainView.databaseName')}
              type="text"
              fullWidth
              variant="standard"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateDbModalOpen(false)}>{t('editRowModal.cancel')}</Button>
            <Button onClick={handleCreateDatabase}>{t('mainView.create')}</Button>
          </DialogActions>
        </Dialog>
        {isConfirmDeleteDbOpen && dbToDelete && (
          <ConfirmationDialog
            open={isConfirmDeleteDbOpen}
            title={t('mainView.confirmDeleteDatabaseTitle')}
            message={t('mainView.areYouSureToDeleteDatabase', { dbName: dbToDelete })}
            onConfirm={handleConfirmDeleteDatabase}
            onCancel={handleCancelDeleteDatabase}
          />
        )}
        {isConfirmDeleteTableOpen && tableToDelete && selectedDatabase && (
          <ConfirmationDialog
            open={isConfirmDeleteTableOpen}
            title={t('mainView.confirmDeleteTableTitle')}
            message={t('mainView.areYouSureToDeleteTable', { tableName: tableToDelete, dbName: selectedDatabase })}
            onConfirm={handleConfirmDeleteTable}
            onCancel={handleCancelDeleteTable}
          />
        )}
        <CreateTableModal
          open={isCreateTableModalOpen}
          onClose={() => setIsCreateTableModalOpen(false)}
          onCreate={handleCreateTable}
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
        
        {showPerformanceMonitor && (
          <PerformanceMonitor currentDatabase={selectedDatabase} />
        )}
      </Box>
    </Box>
  );
}

export default MainView;
