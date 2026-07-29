import { safeStorage } from 'electron';

const SAFE_STORAGE_PREFIX = 'safe-storage:';
const SECRET_FIELDS = new Set([
  'password',
  'passphrase',
  'privateKey',
  'sslKey'
]);

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const encryptSecret = (value: string): string => {
  if (!value || value.startsWith(SAFE_STORAGE_PREFIX)) {
    return value;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统安全存储当前不可用，连接凭据未保存');
  }

  return `${SAFE_STORAGE_PREFIX}${safeStorage.encryptString(value).toString('base64')}`;
};

const decryptSecret = (value: string): string => {
  if (!value.startsWith(SAFE_STORAGE_PREFIX)) {
    return value;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统安全存储当前不可用，无法读取已保存的连接凭据');
  }

  const payload = value.slice(SAFE_STORAGE_PREFIX.length);
  return safeStorage.decryptString(Buffer.from(payload, 'base64'));
};

const transformSecrets = (
  value: unknown,
  transform: (secret: string) => string
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => transformSecrets(item, transform));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (SECRET_FIELDS.has(key) && typeof child === 'string') {
        return [key, transform(child)];
      }

      return [key, transformSecrets(child, transform)];
    })
  );
};

export const protectConnectionSecrets = <T>(value: T): T => (
  transformSecrets(value, encryptSecret) as T
);

export const revealConnectionSecrets = <T>(value: T): T => (
  transformSecrets(value, decryptSecret) as T
);
