import mysql from 'mysql2/promise';
import { EnhancedSSHTunnel, SSHConfig, DatabaseConfig, TunnelConnection } from './enhancedSshTunnel';
import Store from 'electron-store';
import * as crypto from 'crypto';

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  useSSL: boolean;
  sslCert?: string;
  sslKey?: string;
  sslCA?: string;
  useSSH: boolean;
  sshConfig?: SSHConfig;
  charset: string;
  timezone: string;
  connectionLimit: number;
  tags: string[];
  lastConnected?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface QueryResult {
  fields: any[];
  rows: any[];
  affectedRows?: number;
  insertId?: number;
  warningCount?: number;
  message?: string;
  executionTime: number;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalQueries: number;
  avgQueryTime: number;
  lastActivity: Date;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  error?: string;
  size?: number;
  duration: number;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
  duration: number;
  affectedTables?: number;
}

export class EnhancedConnectionManager {
  private connections: Map<string, any> = new Map();
  private sshTunnels: Map<string, EnhancedSSHTunnel> = new Map();
  private tunnelConnections: Map<string, TunnelConnection> = new Map();
  private store: Store;
  private profiles: ConnectionProfile[] = [];
  private stats: Map<string, ConnectionStats> = new Map();

  constructor() {
    this.store = new Store({
      name: 'connection-profiles',
      encryptionKey: process.env.ENCRYPTION_KEY || 'default-key'
    });
    this.loadProfiles();
  }

  // 生成唯一ID
  private generateId(): string {
    return crypto.randomUUID();
  }

  // 创建连接配置文件
  async createProfile(profileData: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<ConnectionProfile> {
    const profile: ConnectionProfile = {
      ...profileData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false
    };

    this.profiles.push(profile);
    await this.saveProfiles();
    return profile;
  }

  // 更新连接配置文件
  async updateProfile(id: string, profileData: Partial<ConnectionProfile>): Promise<ConnectionProfile | null> {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.profiles[index] = {
      ...this.profiles[index],
      ...profileData,
      updatedAt: new Date()
    };

    await this.saveProfiles();
    return this.profiles[index];
  }

  // 删除连接配置文件
  async deleteProfile(id: string): Promise<boolean> {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return false;

    // 关闭连接
    await this.closeConnection(id);
    
    this.profiles.splice(index, 1);
    await this.saveProfiles();
    return true;
  }

  // 获取所有配置文件
  getProfiles(): ConnectionProfile[] {
    return [...this.profiles];
  }

  // 获取单个配置文件
  getProfile(id: string): ConnectionProfile | null {
    return this.profiles.find(p => p.id === id) || null;
  }

  // 测试连接
  async testConnection(profile: ConnectionProfile): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      let dbConfig: DatabaseConfig = {
        host: profile.host,
        port: profile.port,
        user: profile.user,
        password: profile.password,
        database: profile.database
      };

      // 如果使用SSH隧道
      if (profile.useSSH && profile.sshConfig) {
        const tunnel = new EnhancedSSHTunnel();
        const tunnelConnection = await tunnel.createTunnel('test', profile.sshConfig, dbConfig);
        
        dbConfig = {
          host: '127.0.0.1',
          port: tunnelConnection.localPort,
          user: profile.user,
          password: profile.password,
          database: profile.database
        };

        // 测试完成后关闭隧道
        await tunnel.closeTunnel(tunnelConnection.id);
      }

      const connectionConfig: any = {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        charset: profile.charset || 'utf8mb4',
        timezone: profile.timezone || 'local',
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000,
        ssl: profile.useSSL ? {
          rejectUnauthorized: false,
          cert: profile.sslCert,
          key: profile.sslKey,
          ca: profile.sslCA
        } : undefined
      };

      const connection = await mysql.createConnection(connectionConfig);
      
      // 测试连接
      await connection.ping();
      
      const latency = Date.now() - startTime;
      
      await connection.end();
      
      return {
        success: true,
        message: '连接成功',
        latency
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '连接失败'
      };
    }
  }

  // 建立连接
  async connect(profileId: string): Promise<{ success: boolean; message: string; connectionId?: string }> {
    const profile = this.getProfile(profileId);
    if (!profile) {
      return { success: false, message: '配置文件不存在' };
    }

    try {
      // 如果已经连接，返回现有连接
      if (this.connections.has(profileId)) {
        return { success: true, message: '连接已存在', connectionId: profileId };
      }

      let dbConfig: DatabaseConfig = {
        host: profile.host,
        port: profile.port,
        user: profile.user,
        password: profile.password,
        database: profile.database
      };

      // 如果使用SSH隧道
      if (profile.useSSH && profile.sshConfig) {
        const tunnel = new EnhancedSSHTunnel();
        const tunnelConnection = await tunnel.createTunnel(profileId, profile.sshConfig, dbConfig);
        
        this.sshTunnels.set(profileId, tunnel);
        this.tunnelConnections.set(profileId, tunnelConnection);

        dbConfig = {
          host: '127.0.0.1',
          port: tunnelConnection.localPort,
          user: profile.user,
          password: profile.password,
          database: profile.database
        };
      }

      const connectionConfig: any = {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        charset: profile.charset || 'utf8mb4',
        timezone: profile.timezone || 'local',
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000,
        ssl: profile.useSSL ? { rejectUnauthorized: false } : undefined
      };

      const connection = await mysql.createConnection(connectionConfig);
      this.connections.set(profileId, connection);

      // 更新配置文件状态
      await this.updateProfile(profileId, {
        isActive: true,
        lastConnected: new Date()
      });

      // 初始化统计
      this.stats.set(profileId, {
        totalConnections: 1,
        activeConnections: 1,
        totalQueries: 0,
        avgQueryTime: 0,
        lastActivity: new Date()
      });

      return {
        success: true,
        message: '连接成功',
        connectionId: profileId
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '连接失败'
      };
    }
  }

  // 关闭连接
  async closeConnection(profileId: string): Promise<boolean> {
    try {
      // 关闭数据库连接
      const connection = this.connections.get(profileId);
      if (connection) {
        await connection.end();
        this.connections.delete(profileId);
      }

      // 关闭SSH隧道
      const tunnel = this.sshTunnels.get(profileId);
      const tunnelConnection = this.tunnelConnections.get(profileId);
      if (tunnel && tunnelConnection) {
        await tunnel.closeTunnel(tunnelConnection.id);
        this.sshTunnels.delete(profileId);
        this.tunnelConnections.delete(profileId);
      }

      // 更新配置文件状态
      await this.updateProfile(profileId, { isActive: false });

      // 清理统计
      this.stats.delete(profileId);

      return true;
    } catch (error) {
      console.error('关闭连接失败:', error);
      return false;
    }
  }

  // 执行查询
  async executeQuery(profileId: string, sql: string): Promise<QueryResult> {
    const connection = this.connections.get(profileId);
    if (!connection) {
      throw new Error('连接不存在');
    }

    const startTime = Date.now();
    
    try {
      const [rows, fields] = await connection.execute(sql);
      const executionTime = Date.now() - startTime;

      // 更新统计
      this.updateStats(profileId, executionTime);

      return {
        fields: fields || [],
        rows: Array.isArray(rows) ? rows : [],
        executionTime
      };
    } catch (error: any) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }

  // 获取数据库列表
  async getDatabases(profileId: string): Promise<string[]> {
    const result = await this.executeQuery(profileId, 'SHOW DATABASES');
    return result.rows.map((row: any) => row.Database);
  }

  // 获取表列表
  async getTables(profileId: string, database?: string): Promise<any[]> {
    let sql = 'SHOW TABLES';
    if (database) {
      sql = `SHOW TABLES FROM \`${database}\``;
    }
    
    const result = await this.executeQuery(profileId, sql);
    return result.rows;
  }

  // 获取表结构
  async getTableStructure(profileId: string, database: string, table: string): Promise<any[]> {
    const sql = `DESCRIBE \`${database}\`.\`${table}\``;
    const result = await this.executeQuery(profileId, sql);
    return result.rows;
  }

  // 备份数据库
  async backupDatabase(profileId: string, database: string, options: {
    includeTables?: string[];
    excludeTables?: string[];
    dataOnly?: boolean;
    structureOnly?: boolean;
    filePath?: string;
  } = {}): Promise<BackupResult> {
    const startTime = Date.now();
    
    try {
      // 这里应该实现实际的备份逻辑
      // 使用 mysqldump 或者自定义导出逻辑
      
      return {
        success: true,
        filePath: options.filePath || `/tmp/backup_${database}_${Date.now()}.sql`,
        size: 0,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  // 恢复数据库
  async restoreDatabase(profileId: string, filePath: string, targetDatabase?: string): Promise<RestoreResult> {
    const startTime = Date.now();
    
    try {
      // 这里应该实现实际的恢复逻辑
      
      return {
        success: true,
        duration: Date.now() - startTime,
        affectedTables: 0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  // 获取连接统计
  getConnectionStats(profileId: string): ConnectionStats | null {
    return this.stats.get(profileId) || null;
  }

  // 获取所有活动连接
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  // 私有方法：更新统计
  private updateStats(profileId: string, queryTime: number): void {
    const stats = this.stats.get(profileId);
    if (stats) {
      stats.totalQueries++;
      stats.avgQueryTime = (stats.avgQueryTime * (stats.totalQueries - 1) + queryTime) / stats.totalQueries;
      stats.lastActivity = new Date();
    }
  }

  // 私有方法：加密密钥
  private getEncryptionKey(): string {
    let key = (this.store as any).get('encryptionKey') as string;
    if (!key) {
      key = crypto.randomBytes(32).toString('hex');
      (this.store as any).set('encryptionKey', key);
    }
    return key;
  }

  // 私有方法：保存配置文件
  private async saveProfiles(): Promise<void> {
    const profilesData = this.profiles.map(profile => ({
      ...profile,
      password: this.encryptPassword(profile.password)
    }));
    (this.store as any).set('profiles', profilesData);
  }

  // 私有方法：加载配置文件
  private loadProfiles(): void {
    const profilesData = (this.store as any).get('profiles', []) as ConnectionProfile[];
    this.profiles = profilesData.map(profile => ({
      ...profile,
      password: this.decryptPassword(profile.password),
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
      lastConnected: profile.lastConnected ? new Date(profile.lastConnected) : undefined
    }));
  }

  // 私有方法：加密密码
  private encryptPassword(password: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // 私有方法：解密密码
  private decryptPassword(encryptedPassword: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedPassword.split(':');
      if (parts.length !== 2) {
        return encryptedPassword; // 兼容旧格式
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return encryptedPassword; // 如果解密失败，返回原始密码
    }
  }
}
