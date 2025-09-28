export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  ssl?: boolean;
  connectionLimit?: number;
  timeout?: number;
  description?: string;
  tags?: string[];
  lastUsed?: Date;
  favorite?: boolean;
}
