import { Client } from 'ssh2';
import { createServer } from 'net';
import { AddressInfo } from 'net';

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
}

interface TunnelConfig {
  srcHost: string;
  srcPort: number;
  dstHost: string;
  dstPort: number;
}

export class SSHTunnel {
  private client: Client;
  private isConnected: boolean = false;
  private localPort: number = 0;

  constructor(private sshConfig: SSHConfig) {
    this.client = new Client();
  }

  async createTunnel(tunnelConfig: TunnelConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        console.log('SSH连接已建立');
        this.isConnected = true;

        // 创建本地服务器用于端口转发
        const server = createServer((socket) => {
          this.client.forwardOut(
            tunnelConfig.srcHost,
            tunnelConfig.srcPort,
            tunnelConfig.dstHost,
            tunnelConfig.dstPort,
            (err: Error | undefined, stream: any) => {
              if (err) {
                console.error('端口转发失败:', err);
                socket.end();
                return;
              }
              socket.pipe(stream).pipe(socket);
            }
          );
        });

        server.listen(0, 'localhost', () => {
          const address = server.address() as AddressInfo;
          if (address) {
            this.localPort = address.port;
            console.log(`SSH隧道已建立，本地端口: ${this.localPort}`);
            resolve(this.localPort);
          }
        });

        server.on('error', (err: Error) => {
          reject(err);
        });
      });

      this.client.on('error', (err: Error) => {
        reject(err);
      });

      // 连接SSH服务器
      this.client.connect(this.sshConfig);
    });
  }

  disconnect(): void {
    if (this.isConnected) {
      this.client.end();
      this.isConnected = false;
      console.log('SSH连接已断开');
    }
  }

  getLocalPort(): number {
    return this.localPort;
  }

  isActive(): boolean {
    return this.isConnected;
  }
}
