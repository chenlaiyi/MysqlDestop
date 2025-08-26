declare global {
  interface Window {
    mysqlApi: {
      connect: (config: any) => Promise<{ success: boolean; error?: string; data?: any[] }>;
      getTables: (database: string) => Promise<{ success: boolean; error?: string; data?: any[] }>;
      getTableDetails: (database: string) => Promise<{ success: boolean; error?: string; data?: any[] }>;
      getTableData: (database: string, table: string, limit?: number, offset?: number) => Promise<{ success: boolean; error?: string; data?: any[]; totalCount?: number }>;
      storeConfig: (config: any) => Promise<{ success: boolean }>;
      getConnections: () => Promise<{[key: string]: any}>;
      saveConnection: (name: string, config: any) => Promise<{ success: boolean }>;
      deleteConnection: (name: string) => Promise<{ success: boolean }>;
      insertRow: (database: string, table: string, data: any) => Promise<{ success: boolean; error?: string }>;
      updateRow: (database: string, table: string, primaryKey: string, primaryKeyValue: any, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteRow: (database: string, table: string, primaryKey: string, primaryKeyValue: any) => Promise<{ success: boolean; error?: string }>;
      generateSyncPlan: (source: any, target: any, options: any) => Promise<{ success: boolean; error?: string; data?: string[] }>;
      executeSyncPlan: (target: any, plan: string[]) => Promise<{ success: boolean; error?: string }>;
      executeQuery: (query: string, database?: string) => Promise<{ success: boolean; error?: string; data?: any[] }>;
      formatQuery: (query: string) => Promise<{ success: boolean; error?: string; data?: string }>;
      addSqlHistory: (query: string) => Promise<{ success: boolean }>;
      getSqlHistory: () => Promise<string[]>;
      clearSqlHistory: () => Promise<{ success: boolean }>;
      addFavoriteSql: (query: string) => Promise<{ success: boolean }>;
      getFavoriteSql: () => Promise<string[]>;
      removeFavoriteSql: (query: string) => Promise<{ success: boolean }>;
      createDatabase: (dbName: string) => Promise<{ success: boolean; error?: string }>;
      dropDatabase: (dbName: string) => Promise<{ success: boolean; error?: string }>;
      createTable: (dbName: string, tableName: string, columns: { name: string, type: string, primaryKey: boolean, autoIncrement: boolean, nullable: boolean }[]) => Promise<{ success: boolean; error?: string }>;
      dropTable: (dbName: string, tableName: string) => Promise<{ success: boolean; error?: string }>;
      exportDatabase: (database: string, exportType: 'structure' | 'data' | 'both') => Promise<{ success: boolean; error?: string; data?: string }>;
      // 新增：连接健康检查和重连
      checkHealth: () => Promise<{ success: boolean; error?: string; isHealthy?: boolean; lastCheckTime?: number; config?: any }>;
      reconnect: () => Promise<{ success: boolean; error?: string; message?: string }>;
    };
  }
}

export {};
