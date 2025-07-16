import mysql from 'mysql2/promise';

const pools: { [key: string]: mysql.Pool } = {};

export const getConnectionPool = (config: mysql.PoolOptions) => {
  const key = JSON.stringify(config);
  if (!pools[key]) {
    pools[key] = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pools[key];
};

export const closeAllPools = async () => {
  for (const key in pools) {
    await pools[key].end();
    delete pools[key];
  }
};
