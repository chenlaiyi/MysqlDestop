import mysql from 'mysql2/promise';

const pools: { [key: string]: mysql.Pool } = {};
const connectionConfigs: { [key: string]: mysql.PoolOptions } = {};

// 连接状态跟踪
const connectionStatus: { [key: string]: { isHealthy: boolean, lastCheckTime: number } } = {};

export const getConnectionPool = (config: mysql.PoolOptions) => {
  const key = JSON.stringify(config);
  if (!pools[key]) {
    pools[key] = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // 添加重连配置
      idleTimeout: 300000, // 5分钟空闲超时
      maxIdle: 10, // 最大空闲连接数
    });

    // 存储配置用于重连
    connectionConfigs[key] = config;
    connectionStatus[key] = { isHealthy: true, lastCheckTime: Date.now() };

    // 监听连接建立
    pools[key].on('connection', (connection) => {
      console.log('MySQL连接建立:', connection.threadId);
      connectionStatus[key] = { isHealthy: true, lastCheckTime: Date.now() };
    });
  }
  return pools[key];
};

// 检查连接健康状态
export const checkConnectionHealth = async (config: mysql.PoolOptions): Promise<boolean> => {
  const key = JSON.stringify(config);
  const status = connectionStatus[key];
  
  // 如果最近检查过且状态良好，直接返回
  if (status && status.isHealthy && (Date.now() - status.lastCheckTime) < 30000) {
    return true;
  }

  try {
    const pool = getConnectionPool(config);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    connectionStatus[key] = { isHealthy: true, lastCheckTime: Date.now() };
    return true;
  } catch (error) {
    console.error('连接健康检查失败:', error);
    connectionStatus[key] = { isHealthy: false, lastCheckTime: Date.now() };
    return false;
  }
};

// 重建连接池
export const recreatePool = (config: mysql.PoolOptions) => {
  const key = JSON.stringify(config);
  
  // 关闭旧连接池
  if (pools[key]) {
    pools[key].end().catch(console.error);
    delete pools[key];
  }
  
  // 重置状态
  connectionStatus[key] = { isHealthy: false, lastCheckTime: Date.now() };
  
  // 创建新连接池
  return getConnectionPool(config);
};

// 获取连接状态
export const getConnectionStatus = (config: mysql.PoolOptions) => {
  const key = JSON.stringify(config);
  return connectionStatus[key] || { isHealthy: false, lastCheckTime: 0 };
};

export const closeAllPools = async () => {
  for (const key in pools) {
    await pools[key].end();
    delete pools[key];
    delete connectionConfigs[key];
    delete connectionStatus[key];
  }
};
