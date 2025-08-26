import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  localPort?: number;
  remoteHost?: string;
  remotePort?: number;
  keepAlive?: boolean;
  timeout?: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  ssl?: boolean;
}

export interface TunnelConnection {
  id: string;
  sshConfig: SSHConfig;
  dbConfig: DatabaseConfig;
  localPort: number;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

export class EnhancedSSHTunnel {
  private static instance: EnhancedSSHTunnel;
  private connections: Map<string, TunnelConnection> = new Map();
  private sshClients: Map<string, Client> = new Map();
  private portCounter = 33060; // 起始端口

  public static getInstance(): EnhancedSSHTunnel {
    if (!EnhancedSSHTunnel.instance) {
      EnhancedSSHTunnel.instance = new EnhancedSSHTunnel();
    }
    return EnhancedSSHTunnel.instance;
  }

  /**
   * 创建SSH隧道连接 (模仿Navicat的SSH隧道功能)
   */
  async createTunnel(
    connectionId: string,
    sshConfig: SSHConfig,
    dbConfig: DatabaseConfig
  ): Promise<TunnelConnection> {
    try {
      // 检查是否已存在连接
      if (this.connections.has(connectionId) && this.connections.get(connectionId)!.isActive) {
        return this.connections.get(connectionId)!;
      }

      const localPort = this.getNextAvailablePort();
      
      const connectConfig: ConnectConfig = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        keepaliveInterval: sshConfig.keepAlive ? 30000 : 0,
        readyTimeout: sshConfig.timeout || 30000,
      };

      // 设置认证方式
      if (sshConfig.privateKey) {
        const keyPath = this.resolveKeyPath(sshConfig.privateKey);
        connectConfig.privateKey = fs.readFileSync(keyPath);
        if (sshConfig.passphrase) {
          connectConfig.passphrase = sshConfig.passphrase;
        }
      } else if (sshConfig.password) {
        connectConfig.password = sshConfig.password;
      }

      const client = new Client();
      
      return new Promise((resolve, reject) => {
        client.on('ready', () => {
          console.log(`SSH连接已建立: ${sshConfig.host}:${sshConfig.port}`);
          
          // 创建端口转发
          client.forwardIn('localhost', localPort, (err) => {
            if (err) {
              reject(new Error(`端口转发失败: ${err.message}`));
              return;
            }

            const tunnelConnection: TunnelConnection = {
              id: connectionId,
              sshConfig,
              dbConfig,
              localPort,
              isActive: true,
              createdAt: new Date(),
              lastUsed: new Date()
            };

            this.connections.set(connectionId, tunnelConnection);
            this.sshClients.set(connectionId, client);

            console.log(`SSH隧道已创建: localhost:${localPort} -> ${dbConfig.host}:${dbConfig.port}`);
            resolve(tunnelConnection);
          });
        });

        client.on('error', (err) => {
          console.error('SSH连接错误:', err);
          reject(new Error(`SSH连接失败: ${err.message}`));
        });

        client.on('end', () => {
          console.log('SSH连接已断开');
          this.markConnectionInactive(connectionId);
        });

        client.connect(connectConfig);
      });

    } catch (error) {
      console.error('创建SSH隧道时出错:', error);
      throw error;
    }
  }

  /**
   * 测试SSH连接 (类似Navicat的测试连接功能)
   */
  async testSSHConnection(sshConfig: SSHConfig): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const client = new Client();
      
      const connectConfig: ConnectConfig = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        readyTimeout: 10000,
      };

      if (sshConfig.privateKey) {
        try {
          const keyPath = this.resolveKeyPath(sshConfig.privateKey);
          connectConfig.privateKey = fs.readFileSync(keyPath);
          if (sshConfig.passphrase) {
            connectConfig.passphrase = sshConfig.passphrase;
          }
        } catch (error) {
          resolve({ 
            success: false, 
            message: `私钥文件读取失败: ${error}` 
          });
          return;
        }
      } else if (sshConfig.password) {
        connectConfig.password = sshConfig.password;
      }

      client.on('ready', () => {
        const latency = Date.now() - startTime;
        client.end();
        resolve({ 
          success: true, 
          message: `SSH连接成功！延迟: ${latency}ms`,
          latency 
        });
      });

      client.on('error', (err) => {
        resolve({ 
          success: false, 
          message: `SSH连接失败: ${err.message}` 
        });
      });

      setTimeout(() => {
        client.end();
        resolve({ 
          success: false, 
          message: '连接超时' 
        });
      }, 15000);

      client.connect(connectConfig);
    });
  }

  /**
   * 获取活动连接列表
   */
  getActiveConnections(): TunnelConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isActive);
  }

  /**
   * 关闭SSH隧道
   */
  async closeTunnel(connectionId: string): Promise<void> {
    const client = this.sshClients.get(connectionId);
    const connection = this.connections.get(connectionId);

    if (client) {
      client.end();
      this.sshClients.delete(connectionId);
    }

    if (connection) {
      connection.isActive = false;
      console.log(`SSH隧道已关闭: ${connectionId}`);
    }
  }

  /**
   * 关闭所有隧道
   */
  async closeAllTunnels(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(id => this.closeTunnel(id));
    await Promise.all(promises);
    this.connections.clear();
    this.sshClients.clear();
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats() {
    const activeCount = this.getActiveConnections().length;
    const totalCount = this.connections.size;
    
    return {
      active: activeCount,
      total: totalCount,
      inactive: totalCount - activeCount,
      ports: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        localPort: conn.localPort,
        remoteHost: `${conn.dbConfig.host}:${conn.dbConfig.port}`,
        isActive: conn.isActive
      }))
    };
  }

  private getNextAvailablePort(): number {
    const usedPorts = Array.from(this.connections.values()).map(conn => conn.localPort);
    
    while (usedPorts.includes(this.portCounter)) {
      this.portCounter++;
    }
    
    return this.portCounter++;
  }

  private markConnectionInactive(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
    }
  }

  private resolveKeyPath(keyPath: string): string {
    if (path.isAbsolute(keyPath)) {
      return keyPath;
    }
    
    // 处理相对路径和 ~ 符号
    if (keyPath.startsWith('~/')) {
      return path.join(process.env.HOME || '', keyPath.slice(2));
    }
    
    return path.resolve(keyPath);
  }

  /**
   * 保存SSH配置到加密存储 (类似Navicat的配置保存)
   */
  async saveSSHConfig(name: string, config: SSHConfig): Promise<void> {
    // 这里可以实现配置的加密保存
    // 类似Navicat将连接信息保存到本地
    console.log(`保存SSH配置: ${name}`);
  }

  /**
   * 加载保存的SSH配置
   */
  async loadSSHConfigs(): Promise<Record<string, SSHConfig>> {
    // 这里可以实现从加密存储中加载配置
    console.log('加载SSH配置');
    return {};
  }
}

export default EnhancedSSHTunnel;
