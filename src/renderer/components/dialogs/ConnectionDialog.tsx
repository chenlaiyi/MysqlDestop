import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  StorageRounded as StorageIcon,
  ShieldRounded as ShieldIcon,
  LanRounded as SshIcon,
  HttpRounded as HttpIcon,
  SettingsRounded as AdvancedIcon,
  BugReportRounded as TestIcon,
  StarRounded as StarIcon,
  StarOutlineRounded as StarOutlineIcon
} from '@mui/icons-material';

export interface NavicatConnectionPayload {
  id?: string;
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
  sshConfig?: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  };
  useHTTP?: boolean;
  httpConfig?: {
    url: string;
    username?: string;
    password?: string;
    useBasicAuth?: boolean;
  };
  charset: string;
  timezone: string;
  connectionLimit: number;
  description?: string;
  tags: string[];
  favorite?: boolean;
}

interface NavicatConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: NavicatConnectionPayload) => void;
  profile?: NavicatConnectionPayload;
  mode: 'create' | 'edit';
}

const tabs = [
  { key: 'general', label: '常规', icon: <StorageIcon fontSize="small" /> },
  { key: 'advanced', label: '高级', icon: <AdvancedIcon fontSize="small" /> },
  { key: 'database', label: '数据库', icon: <StorageIcon fontSize="small" /> },
  { key: 'ssl', label: 'SSL', icon: <ShieldIcon fontSize="small" /> },
  { key: 'ssh', label: 'SSH', icon: <SshIcon fontSize="small" /> },
  { key: 'http', label: 'HTTP', icon: <HttpIcon fontSize="small" /> }
] as const;

const defaultPayload: NavicatConnectionPayload = {
  name: '',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: '',
  useSSL: false,
  useSSH: false,
  charset: 'utf8mb4',
  timezone: 'local',
  connectionLimit: 10,
  tags: [],
  favorite: false
};

const NewNavicatConnectionDialog: React.FC<NavicatConnectionDialogProps> = ({
  open,
  onClose,
  onSave,
  profile,
  mode
}) => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState<NavicatConnectionPayload>(defaultPayload);
  const [newTag, setNewTag] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({ ...defaultPayload, ...profile });
    } else {
      setFormData(defaultPayload);
    }
    setCurrentTab(0);
    setTestResult(null);
  }, [profile, open]);

  const handleChange = <K extends keyof NavicatConnectionPayload>(field: K, value: NavicatConnectionPayload[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSSHChange = (field: keyof NonNullable<NavicatConnectionPayload['sshConfig']>, value: string | number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      useSSH: true,
      sshConfig: {
        host: prev.sshConfig?.host ?? '',
        port: prev.sshConfig?.port ?? 22,
        username: prev.sshConfig?.username ?? '',
        ...prev.sshConfig,
        [field]: value
      }
    }));
  };

  const handleHTTPChange = (field: keyof NonNullable<NavicatConnectionPayload['httpConfig']>, value: string | boolean | undefined) => {
    setFormData((prev) => ({
      ...prev,
      useHTTP: true,
      httpConfig: {
        url: prev.httpConfig?.url ?? '',
        ...prev.httpConfig,
        [field]: value
      }
    }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (formData.tags.includes(newTag.trim())) return;
    handleChange('tags', [...formData.tags, newTag.trim()]);
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    handleChange('tags', formData.tags.filter((item) => item !== tag));
  };

  const canSave = useMemo(() => formData.name && formData.host && formData.user && formData.port > 0, [formData]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await window.mysqlApi.connect({
        host: formData.host,
        port: formData.port,
        user: formData.user,
        password: formData.password,
        database: formData.database,
        ssl: formData.useSSL
      });
      if (result.success) {
        setTestResult({ success: true, message: '连接成功' });
      } else {
        setTestResult({ success: false, message: result.error || '连接失败' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error?.message || '连接发生错误' });
    } finally {
      setIsTesting(false);
    }
  };

  const paletteBg = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.94 : 1);
  const titleBg = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.96);
  const borderColor = alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.08 : 0.12);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: paletteBg,
          borderRadius: 3,
          border: `1px solid ${borderColor}`,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: titleBg,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            background: alpha(theme.palette.primary.main, 0.16),
            color: theme.palette.primary.contrastText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <StorageIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {mode === 'create' ? '新建连接 · MySQL' : '编辑连接 · MySQL'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            配置 Navicat 风格的连接属性
          </Typography>
        </Box>
        <Tooltip title={formData.favorite ? '取消收藏' : '收藏此连接'}>
          <IconButton onClick={() => handleChange('favorite', !formData.favorite)}>
            {formData.favorite ? (
              <StarIcon color="warning" />
            ) : (
              <StarOutlineIcon sx={{ color: alpha(theme.palette.text.secondary, 0.7) }} />
            )}
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent sx={{ px: 0, py: 0 }}>
        <Tabs
          value={currentTab}
          onChange={(_, value) => setCurrentTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${borderColor}`,
            px: 2,
            backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.16 : 0.04)
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.key}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
              value={index}
              sx={{
                minHeight: 46,
                fontWeight: 600,
                textTransform: 'none'
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ px: 4, py: 3 }}>
          {currentTab === 0 && (
            <Stack spacing={3}>
              <TextField
                label="连接名称"
                value={formData.name}
                onChange={(event) => handleChange('name', event.target.value)}
                required
                fullWidth
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="主机名 / IP"
                  value={formData.host}
                  onChange={(event) => handleChange('host', event.target.value)}
                  required
                  sx={{ flex: 3 }}
                />
                <TextField
                  label="端口"
                  type="number"
                  value={formData.port}
                  onChange={(event) => handleChange('port', Number(event.target.value))}
                  required
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="用户名"
                  value={formData.user}
                  onChange={(event) => handleChange('user', event.target.value)}
                  required
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="密码"
                  type="password"
                  value={formData.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  sx={{ flex: 1 }}
                />
              </Stack>
              <TextField
                label="默认数据库"
                value={formData.database ?? ''}
                onChange={(event) => handleChange('database', event.target.value)}
                placeholder="连接后自动选择的数据库（可选）"
              />
              <Stack spacing={1}>
                <Typography variant="subtitle2">标签</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    placeholder="输入标签后回车"
                    value={newTag}
                    onChange={(event) => setNewTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button size="small" onClick={addTag}>
                            添加
                          </Button>
                        </InputAdornment>
                      )
                    }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {formData.tags.map((tag) => (
                    <Button key={tag} size="small" variant="outlined" onClick={() => removeTag(tag)}>
                      {tag}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Stack>
          )}

          {currentTab === 1 && (
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>字符集</InputLabel>
                  <Select value={formData.charset} label="字符集" onChange={(event) => handleChange('charset', event.target.value)}>
                    <MenuItem value="utf8mb4">utf8mb4</MenuItem>
                    <MenuItem value="utf8">utf8</MenuItem>
                    <MenuItem value="latin1">latin1</MenuItem>
                    <MenuItem value="gbk">gbk</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>时区</InputLabel>
                  <Select value={formData.timezone} label="时区" onChange={(event) => handleChange('timezone', event.target.value)}>
                    <MenuItem value="local">本地时区</MenuItem>
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="Asia/Shanghai">Asia/Shanghai</MenuItem>
                    <MenuItem value="GMT">GMT</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="连接池上限"
                type="number"
                value={formData.connectionLimit}
                onChange={(event) => handleChange('connectionLimit', Number(event.target.value))}
                inputProps={{ min: 1, max: 512 }}
                sx={{ maxWidth: 240 }}
              />
              <TextField
                label="描述"
                multiline
                minRows={3}
                value={formData.description ?? ''}
                onChange={(event) => handleChange('description', event.target.value)}
              />
            </Stack>
          )}

          {currentTab === 2 && (
            <Stack spacing={3}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                在此可以设置与数据库相关的默认路径或其他属性。
              </Alert>
              <TextField
                label="初始查询语句"
                placeholder="连接后执行的 SQL（可选）"
                multiline
                minRows={4}
                value={formData.description || ''}
                onChange={(event) => handleChange('description', event.target.value)}
              />
            </Stack>
          )}

          {currentTab === 3 && (
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.useSSL}
                    onChange={(event) => handleChange('useSSL', event.target.checked)}
                  />
                }
                label="启用 SSL 加密"
              />
              {formData.useSSL && (
                <Stack spacing={2}>
                  <TextField
                    label="客户端证书"
                    value={formData.sslCert ?? ''}
                    onChange={(event) => handleChange('sslCert', event.target.value)}
                    placeholder="选择或输入证书路径"
                  />
                  <TextField
                    label="客户端密钥"
                    value={formData.sslKey ?? ''}
                    onChange={(event) => handleChange('sslKey', event.target.value)}
                    placeholder="选择或输入密钥路径"
                  />
                  <TextField
                    label="CA 证书"
                    value={formData.sslCA ?? ''}
                    onChange={(event) => handleChange('sslCA', event.target.value)}
                    placeholder="选择或输入CA证书"
                  />
                </Stack>
              )}
            </Stack>
          )}

          {currentTab === 4 && (
            <Stack spacing={3}>
              <FormControlLabel
                control={<Switch checked={formData.useSSH} onChange={(event) => handleChange('useSSH', event.target.checked)} />}
                label="使用 SSH 隧道"
              />
              {formData.useSSH && (
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="SSH 主机"
                      value={formData.sshConfig?.host ?? ''}
                      onChange={(event) => handleSSHChange('host', event.target.value)}
                      sx={{ flex: 3 }}
                    />
                    <TextField
                      label="SSH 端口"
                      type="number"
                      value={formData.sshConfig?.port ?? 22}
                      onChange={(event) => handleSSHChange('port', Number(event.target.value))}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="SSH 用户"
                      value={formData.sshConfig?.username ?? ''}
                      onChange={(event) => handleSSHChange('username', event.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="SSH 密码"
                      type="password"
                      value={formData.sshConfig?.password ?? ''}
                      onChange={(event) => handleSSHChange('password', event.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  <TextField
                    label="私钥路径"
                    value={formData.sshConfig?.privateKey ?? ''}
                    onChange={(event) => handleSSHChange('privateKey', event.target.value)}
                    placeholder="例如 ~/.ssh/id_rsa"
                  />
                  <TextField
                    label="私钥密码"
                    type="password"
                    value={formData.sshConfig?.passphrase ?? ''}
                    onChange={(event) => handleSSHChange('passphrase', event.target.value)}
                  />
                </Stack>
              )}
            </Stack>
          )}

          {currentTab === 5 && (
            <Stack spacing={3}>
              <FormControlLabel
                control={<Switch checked={Boolean(formData.useHTTP)} onChange={(event) => handleChange('useHTTP', event.target.checked)} />}
                label="启用 HTTP 通道"
              />
              {formData.useHTTP && (
                <Stack spacing={2}>
                  <TextField
                    label="HTTP 通道地址"
                    value={formData.httpConfig?.url ?? ''}
                    onChange={(event) => handleHTTPChange('url', event.target.value)}
                    placeholder="http(s)://..."
                  />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="用户名"
                      value={formData.httpConfig?.username ?? ''}
                      onChange={(event) => handleHTTPChange('username', event.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="密码"
                      type="password"
                      value={formData.httpConfig?.password ?? ''}
                      onChange={(event) => handleHTTPChange('password', event.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(formData.httpConfig?.useBasicAuth)}
                        onChange={(event) => handleHTTPChange('useBasicAuth', event.target.checked)}
                      />
                    }
                    label="使用 Basic Auth 认证"
                  />
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ borderColor }} />

      {testResult && (
        <Box sx={{ px: 4, pt: 2 }}>
          <Alert severity={testResult.success ? 'success' : 'error'}>{testResult.message}</Alert>
        </Box>
      )}

      <DialogActions sx={{ px: 4, py: 2.5, backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.14 : 0.04) }}>
        <Button
          variant="outlined"
          startIcon={<TestIcon />}
          onClick={handleTestConnection}
          disabled={isTesting}
        >
          {isTesting ? '测试中...' : '测试连接'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => onSave(formData)} disabled={!canSave}>
          {mode === 'create' ? '保存' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewNavicatConnectionDialog;
