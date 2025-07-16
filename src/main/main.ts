import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import mysql from 'mysql2/promise';
import Store from 'electron-store';
import { format } from 'sql-formatter';
import { getConnectionPool, closeAllPools } from './connectionManager';

// 区分开发和生产环境的配置
const storeOptions = {
  name: process.env.NODE_ENV === 'production' ? 'config-release' : 'config-dev'
};
const store = new Store<any>(storeOptions);

ipcMain.handle('store:get-connections', () => {
  return (store as any).get('connections', {});
});

ipcMain.handle('store:save-connection', (event, name, config) => {
  const connections = (store as any).get('connections', {});
  connections[name] = config;
  (store as any).set('connections', connections);
  return { success: true };
});

ipcMain.handle('store:delete-connection', (event, name) => {
  const connections = (store as any).get('connections', {});
  delete connections[name];
  (store as any).set('connections', connections);
  return { success: true };
});

// SQL History and Favorites
ipcMain.handle('store:add-sql-history', (event, query: string) => {
  const history = (store as any).get('sqlHistory', []);
  const newHistory = [query, ...history.filter((q: string) => q !== query)].slice(0, 50); // Keep last 50 unique queries
  (store as any).set('sqlHistory', newHistory);
  return { success: true };
});

ipcMain.handle('store:get-sql-history', () => {
  return (store as any).get('sqlHistory', []);
});

ipcMain.handle('store:clear-sql-history', () => {
  (store as any).set('sqlHistory', []);
  return { success: true };
});

ipcMain.handle('store:add-favorite-sql', (event, query: string) => {
  const favorites = (store as any).get('sqlFavorites', []);
  if (!favorites.includes(query)) {
    favorites.push(query);
    (store as any).set('sqlFavorites', favorites);
  }
  return { success: true };
});

ipcMain.handle('store:get-favorite-sql', () => {
  return (store as any).get('sqlFavorites', []);
});

ipcMain.handle('store:remove-favorite-sql', (event, query: string) => {
  const favorites = (store as any).get('sqlFavorites', []);
  const newFavorites = favorites.filter((q: string) => q !== query);
  (store as any).set('sqlFavorites', newFavorites);
  return { success: true };
});

let currentConnectionConfig: any = null;

ipcMain.handle('mysql:store-config', (event, config) => {
  currentConnectionConfig = config;
  return { success: true };
});

ipcMain.handle('mysql:connect', async (event, config) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    const pool = getConnectionPool(config);
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SHOW DATABASES;');
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

// DDL Operations
ipcMain.handle('mysql:createDatabase', async (event, dbName: string) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool(currentConnectionConfig);
    connection = await pool.getConnection();
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ??`, [dbName]);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:dropDatabase', async (event, dbName: string) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool(currentConnectionConfig);
    connection = await pool.getConnection();
    await connection.execute(`DROP DATABASE IF EXISTS ??`, [dbName]);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:createTable', async (event, dbName: string, tableName: string, columns: { name: string, type: string, primaryKey: boolean, autoIncrement: boolean, nullable: boolean }[]) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database: dbName });
    connection = await pool.getConnection();

    const columnDefinitions = columns.map(col => {
      let def = `\`${col.name}\` ${col.type}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (!col.nullable) def += ' NOT NULL';
      return def;
    }).join(', ');

    const createTableSql = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnDefinitions});`;
    await connection.execute(createTableSql);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:getTables', async (event, database) => {
  console.log('Received request for tables in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`SHOW TABLES;`);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mysql:getTableData', async (event, database, table, limit?: number, offset?: number) => {
  console.log('Received request for data from table:', table, 'in database:', database, 'limit:', limit, 'offset:', offset);
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    connection = await pool.getConnection();
    let querySql = `SELECT * FROM ??`;
    const queryParams = [table];

    if (limit !== undefined && offset !== undefined) {
      querySql += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const [rows] = await connection.query(querySql, queryParams);

    // Get total count for pagination
    const [countRows] = await connection.query(`SELECT COUNT(*) as count FROM ??`, [table]) as any[];
    const totalCount = countRows[0].count;

    connection.release();
    return { success: true, data: rows, totalCount };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:insertRow', async (event, database, table, data) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    connection = await pool.getConnection();
    const [result] = await connection.query(`INSERT INTO ?? SET ?`, [table, data]);
    connection.release();
    return { success: true, data: result };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:updateRow', async (event, database, table, primaryKey, primaryKeyValue, data) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    connection = await pool.getConnection();
    const [result] = await connection.query(`UPDATE ?? SET ? WHERE ?? = ?`, [table, data, primaryKey, primaryKeyValue]);
    connection.release();
    return { success: true, data: result };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:deleteRow', async (event, database, table, primaryKey, primaryKeyValue) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    connection = await pool.getConnection();
    const [result] = await connection.query(`DELETE FROM ?? WHERE ?? = ?`, [table, primaryKey, primaryKeyValue]);
    connection.release();
    return { success: true, data: result };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:executeQuery', async (event, query: string, database?: string) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const config = database ? { ...currentConnectionConfig, database } : currentConnectionConfig;
    const pool = getConnectionPool(config);
    connection = await pool.getConnection();
    const [rows] = await connection.query(query);
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

ipcMain.handle('mysql:formatQuery', async (event, query: string) => {
  try {
    const formattedQuery = format(query, { language: 'mysql' });
    return { success: true, data: formattedQuery };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mysql:generateSyncPlan', async (event, source, target, options) => {
  let sourceConn, targetConn;
  const connections = (store as any).get('connections', {});
  try {
    const sourcePool = getConnectionPool({ ...connections[source.connection], database: source.database });
    const targetPool = getConnectionPool({ ...connections[target.connection], database: target.database });
    sourceConn = await sourcePool.getConnection();
    targetConn = await targetPool.getConnection();

    const [sourceTableRows] = await sourceConn.query('SHOW FULL TABLES WHERE TABLE_TYPE LIKE \'BASE TABLE\'') as [any[], any];
    const [targetTableRows] = await targetConn.query('SHOW FULL TABLES WHERE TABLE_TYPE LIKE \'BASE TABLE\'') as [any[], any];
    const sourceTables = sourceTableRows.map((row: any) => Object.values(row)[0] as string);
    const targetTables = targetTableRows.map((row: any) => Object.values(row)[0] as string);

    const [sourceViewRows] = await sourceConn.query('SHOW FULL TABLES WHERE TABLE_TYPE LIKE \'VIEW\'') as [any[], any];
    const [targetViewRows] = await targetConn.query('SHOW FULL TABLES WHERE TABLE_TYPE LIKE \'VIEW\'') as [any[], any];
    const sourceViews = sourceViewRows.map((row: any) => Object.values(row)[0] as string);
    const targetViews = targetViewRows.map((row: any) => Object.values(row)[0] as string);

    const [sourceProcedureRows] = await sourceConn.query('SHOW PROCEDURE STATUS WHERE Db = ?', [source.database]) as [any[], any];
    const [targetProcedureRows] = await targetConn.query('SHOW PROCEDURE STATUS WHERE Db = ?', [target.database]) as [any[], any];
    const sourceProcedures = sourceProcedureRows.map((row: any) => row.Name);
    const targetProcedures = targetProcedureRows.map((row: any) => row.Name);

    const [sourceFunctionRows] = await sourceConn.query('SHOW FUNCTION STATUS WHERE Db = ?', [source.database]) as [any[], any];
    const [targetFunctionRows] = await targetConn.query('SHOW FUNCTION STATUS WHERE Db = ?', [target.database]) as [any[], any];
    const sourceFunctions = sourceFunctionRows.map((row: any) => row.Name);
    const targetFunctions = targetFunctionRows.map((row: any) => row.Name);

    const plan = [];

    // Structure sync
    if (options.syncStructure) {
      // Table sync
      for (const table of sourceTables) {
        if (!targetTables.includes(table)) {
          const [createTableRows] = await sourceConn.query(`SHOW CREATE TABLE ??;`, [table]) as [any[], any];
          plan.push(createTableRows[0]['Create Table'] + ';');
        }
      }

      // View sync
      for (const view of sourceViews) {
        const [createViewRows] = await sourceConn.query(`SHOW CREATE VIEW ??;`, [view]) as [any[], any];
        const createViewSql = createViewRows[0]['Create View'];
        if (!targetViews.includes(view)) {
          plan.push(createViewSql + ';');
        } else {
          const [targetCreateViewRows] = await targetConn.query(`SHOW CREATE VIEW ??;`, [view]) as [any[], any];
          const targetCreateViewSql = targetCreateViewRows[0]['Create View'];
          if (createViewSql !== targetCreateViewSql) {
            plan.push(`DROP VIEW IF EXISTS \`${view}\`;`);
            plan.push(createViewSql + ';');
          }
        }
      }
      for (const view of targetViews) {
        if (!sourceViews.includes(view)) {
          plan.push(`DROP VIEW IF EXISTS \`${view}\`;`);
        }
      }

      // Procedure sync
      for (const procedure of sourceProcedures) {
        const [createProcedureRows] = await sourceConn.query(`SHOW CREATE PROCEDURE ??;`, [procedure]) as [any[], any];
        const createProcedureSql = createProcedureRows[0]['Create Procedure'];
        if (!targetProcedures.includes(procedure)) {
          plan.push(createProcedureSql + ';');
        } else {
          const [targetCreateProcedureRows] = await targetConn.query(`SHOW CREATE PROCEDURE ??;`, [procedure]) as [any[], any];
          const targetCreateProcedureSql = targetCreateProcedureRows[0]['Create Procedure'];
          if (createProcedureSql !== targetCreateProcedureSql) {
            plan.push(`DROP PROCEDURE IF EXISTS \`${procedure}\`;`);
            plan.push(createProcedureSql + ';');
          }
        }
      }
      for (const procedure of targetProcedures) {
        if (!sourceProcedures.includes(procedure)) {
          plan.push(`DROP PROCEDURE IF EXISTS \`${procedure}\`;`);
        }
      }

      // Function sync
      for (const func of sourceFunctions) {
        const [createFunctionRows] = await sourceConn.query(`SHOW CREATE FUNCTION ??;`, [func]) as [any[], any];
        const createFunctionSql = createFunctionRows[0]['Create Function'];
        if (!targetFunctions.includes(func)) {
          plan.push(createFunctionSql + ';');
        } else {
          const [targetCreateFunctionRows] = await targetConn.query(`SHOW CREATE FUNCTION ??;`, [func]) as [any[], any];
          const targetCreateFunctionSql = targetCreateFunctionRows[0]['Create Function'];
          if (createFunctionSql !== targetCreateFunctionSql) {
            plan.push(`DROP FUNCTION IF EXISTS \`${func}\`;`);
            plan.push(createFunctionSql + ';');
          }
        }
      }
      for (const func of targetFunctions) {
        if (!sourceFunctions.includes(func)) {
          plan.push(`DROP FUNCTION IF EXISTS \`${func}\`;`);
        }
      }
    }

    // Data sync
    if (options.syncData) {
      for (const table of sourceTables) {
        if (targetTables.includes(table)) {
          const [sourceData] = await sourceConn.query(`SELECT * FROM ??;`, [table]) as [any[], any];
          const [targetData] = await targetConn.query(`SELECT * FROM ??;`, [table]) as [any[], any];
          
          if (sourceData.length === 0) continue; // Skip if source table is empty

          const primaryKey = Object.keys(sourceData[0])[0];

          const sourceMap = new Map(sourceData.map((row: any) => [row[primaryKey], row]));
          const targetMap = new Map(targetData.map((row: any) => [row[primaryKey], row]));

          // Inserts
          for (const [key, value] of sourceMap.entries()) {
            if (!targetMap.has(key)) {
              plan.push(mysql.format(`INSERT INTO ?? SET ?;`, [table, value]));
            }
          }

          // Updates
          for (const [key, sourceRow] of sourceMap.entries()) {
            if (targetMap.has(key)) {
              const targetRow = targetMap.get(key);
              if (JSON.stringify(sourceRow) !== JSON.stringify(targetRow)) {
                plan.push(mysql.format(`UPDATE ?? SET ? WHERE ?? = ?;`, [table, sourceRow, primaryKey, key]));
              }
            }
          }

          // Deletes
          for (const key of targetMap.keys()) {
            if (!sourceMap.has(key)) {
              plan.push(mysql.format(`DELETE FROM ?? WHERE ?? = ?;`, [table, primaryKey, key]));
            }
          }
        }
      }
    }

    return { success: true, data: plan };

  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (sourceConn) sourceConn.release();
    if (targetConn) targetConn.release();
  }
});

ipcMain.handle('mysql:executeSyncPlan', async (event, target, plan) => {
  let connection: mysql.PoolConnection | undefined;
  try {
    const connections = (store as any).get('connections', {}) as {[key: string]: any};
    const targetConfig = connections[target.connection];
    if (!targetConfig) {
      throw new Error(`Target connection '${target.connection}' not found.`);
    }
    const pool = getConnectionPool({ ...targetConfig, database: target.database });
    connection = await pool.getConnection();

    await connection.beginTransaction();

    for (const sql of plan) {
      try {
        await connection.query(sql);
      } catch (error) {
        await connection.rollback();
        throw error; 
      }
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

// Database export functionality
ipcMain.handle('mysql:exportDatabase', async (event, database: string, exportType: 'structure' | 'data' | 'both') => {
  let connection: mysql.PoolConnection | undefined;
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    connection = await pool.getConnection();

    let exportContent = `-- Database Export: ${database}\n-- Generated on: ${new Date().toISOString()}\n-- Export Type: ${exportType}\n\n`;
    
    if (exportType === 'structure' || exportType === 'both') {
      exportContent += `-- Database Structure\n`;
      exportContent += `CREATE DATABASE IF NOT EXISTS \`${database}\`;\n`;
      exportContent += `USE \`${database}\`;\n\n`;

      // Export tables structure
      const [tables] = await connection.query('SHOW TABLES') as [any[], any];
      for (const tableRow of tables) {
        const tableName = Object.values(tableRow)[0] as string;
        const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``) as [any[], any];
        exportContent += `-- Table: ${tableName}\n`;
        exportContent += `${createTableResult[0]['Create Table']};\n\n`;
      }

      // Export views
      const [views] = await connection.query('SHOW FULL TABLES WHERE TABLE_TYPE LIKE \'VIEW\'') as [any[], any];
      for (const viewRow of views) {
        const viewName = Object.values(viewRow)[0] as string;
        const [createViewResult] = await connection.query(`SHOW CREATE VIEW \`${viewName}\``) as [any[], any];
        exportContent += `-- View: ${viewName}\n`;
        exportContent += `${createViewResult[0]['Create View']};\n\n`;
      }
    }

    if (exportType === 'data' || exportType === 'both') {
      exportContent += `-- Database Data\n`;
      const [tables] = await connection.query('SHOW TABLES') as [any[], any];
      
      for (const tableRow of tables) {
        const tableName = Object.values(tableRow)[0] as string;
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``) as [any[], any];
        
        if (rows.length > 0) {
          exportContent += `-- Data for table: ${tableName}\n`;
          const columns = Object.keys(rows[0]);
          
          for (const row of rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return value;
            }).join(', ');
            
            exportContent += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values});\n`;
          }
          exportContent += '\n';
        }
      }
    }

    return { success: true, data: exportContent };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  } finally {
    if (connection) connection.release();
  }
});

// Get Views
ipcMain.handle('mysql:getViews', async (event, database) => {
  console.log('Received request for views in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        TABLE_NAME as VIEW_NAME,
        VIEW_DEFINITION,
        CHECK_OPTION,
        IS_UPDATABLE,
        DEFINER,
        SECURITY_TYPE
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [database]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get View Definition
ipcMain.handle('mysql:getViewDefinition', async (event, database, viewName) => {
  console.log('Received request for view definition:', viewName, 'in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`SHOW CREATE VIEW ??`, [viewName]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get Functions
ipcMain.handle('mysql:getFunctions', async (event, database) => {
  console.log('Received request for functions in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        ROUTINE_NAME as FUNCTION_NAME,
        ROUTINE_TYPE,
        DATA_TYPE as RETURN_TYPE,
        ROUTINE_DEFINITION,
        DEFINER,
        CREATED,
        LAST_ALTERED,
        SQL_MODE,
        ROUTINE_COMMENT
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'
      ORDER BY ROUTINE_NAME
    `, [database]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get Function Definition
ipcMain.handle('mysql:getFunctionDefinition', async (event, database, functionName) => {
  console.log('Received request for function definition:', functionName, 'in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`SHOW CREATE FUNCTION ??`, [functionName]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get Procedures (Stored Procedures)
ipcMain.handle('mysql:getProcedures', async (event, database) => {
  console.log('Received request for procedures in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        ROUTINE_NAME as PROCEDURE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION,
        DEFINER,
        CREATED,
        LAST_ALTERED,
        SQL_MODE,
        ROUTINE_COMMENT
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `, [database]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get Procedure Definition
ipcMain.handle('mysql:getProcedureDefinition', async (event, database, procedureName) => {
  console.log('Received request for procedure definition:', procedureName, 'in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`SHOW CREATE PROCEDURE ??`, [procedureName]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get Events
ipcMain.handle('mysql:getEvents', async (event, database) => {
  console.log('Received request for events in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        EVENT_NAME,
        EVENT_TYPE,
        EXECUTE_AT,
        INTERVAL_VALUE,
        INTERVAL_FIELD,
        STATUS,
        EVENT_DEFINITION,
        DEFINER,
        CREATED,
        LAST_ALTERED,
        EVENT_COMMENT
      FROM INFORMATION_SCHEMA.EVENTS 
      WHERE EVENT_SCHEMA = ?
      ORDER BY EVENT_NAME
    `, [database]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

// Get Event Definition
ipcMain.handle('mysql:getEventDefinition', async (event, database, eventName) => {
  console.log('Received request for event definition:', eventName, 'in database:', database);
  try {
    if (!currentConnectionConfig) {
      throw new Error('No active connection configuration found.');
    }
    const pool = getConnectionPool({ ...currentConnectionConfig, database });
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`SHOW CREATE EVENT ??`, [eventName]);
    connection.release();
    return { success: true, data: rows };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '点点够MySQL客户端',
    icon: path.join(__dirname, '../../assets/logo.png'),
    show: false, // 延迟显示，等待加载完成
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // 防止后台节流
      spellcheck: false, // 禁用拼写检查
      webSecurity: true,
      experimentalFeatures: false,
      enableWebSQL: false,
      v8CacheOptions: 'code', // 启用V8代码缓存
    },
  });

  // 窗口加载完成后显示
  win.once('ready-to-show', () => {
    win.show();
    
    // 可选：启动时聚焦窗口
    if (process.platform === 'darwin') {
      win.focus();
    }
  });

  win.loadFile(path.join(__dirname, '../index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeAllPools().then(() => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});