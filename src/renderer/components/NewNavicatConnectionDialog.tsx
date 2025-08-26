import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  IconButton,
  Paper,
  Divider,
  Stack
} from '@mui/material';
import {
  Security as SecurityIcon,
  VpnKey as SshIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  BugReport as TestIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface ConnectionProfile {
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
  charset: string;
  timezone: string;
  connectionLimit: number;
  tags: string[];
}

interface NavicatStyleConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: ConnectionProfile) => void;
  profile?: ConnectionProfile;
  mode: 'create' | 'edit';
}

const NavicatStyleConnectionDialog: React.FC<NavicatStyleConnectionDialogProps> = ({
  open,
  onClose,
  onSave,
  profile,
  mode
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState<ConnectionProfile>({
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
    tags: []
  });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({ ...profile });
    } else {
      setFormData({
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
        tags: []
      });
    }
  }, [profile, open]);

  const handleChange = (field: keyof ConnectionProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSSHChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sshConfig: {
        ...prev.sshConfig,
        [field]: value
      } as any
    }));
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // 这里调用后端的测试连接API
      const response = await (window as any).electronAPI?.testConnection(formData);
      setTestResult(response);
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试失败: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.host || !formData.user) {
      setTestResult({
        success: false,
        message: '请填写必要的连接信息'
      });
      return;
    }

    onSave(formData);
    onClose();
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      handleChange('tags', [...formData.tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const TabPanel = ({ children, value, index }: any) => (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        style: {
          minHeight: '600px',
          backgroundColor: '#f5f5f5'
        }
      }}
    >
      <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white', display: 'flex', alignItems: 'center' }}>
        <StorageIcon sx={{ mr: 1 }} />
        {mode === 'create' ? '新建MySQL连接' : '编辑MySQL连接'}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab icon={<StorageIcon />} label="基本设置" />
            <Tab icon={<SshIcon />} label="SSH隧道" />
            <Tab icon={<SecurityIcon />} label="SSL安全" />
            <Tab icon={<SettingsIcon />} label="高级设置" />
          </Tabs>
        </Box>

        {/* 基本设置面板 */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="连接名称"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="给这个连接起个名字"
                required
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="主机名或IP地址"
                  value={formData.host}
                  onChange={(e) => handleChange('host', e.target.value)}
                  required
                  sx={{ flex: 3 }}
                />
                <TextField
                  label="端口"
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleChange('port', parseInt(e.target.value))}
                  required
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="用户名"
                  value={formData.user}
                  onChange={(e) => handleChange('user', e.target.value)}
                  required
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="密码"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                fullWidth
                label="初始数据库"
                value={formData.database || ''}
                onChange={(e) => handleChange('database', e.target.value)}
                placeholder="连接后自动选择的数据库（可选）"
              />

              {/* 标签管理 */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>连接标签</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="添加标签"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <IconButton onClick={addTag} color="primary">
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>
            </Stack>
          </Box>
        </TabPanel>

        {/* SSH隧道面板 */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ p: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.useSSH}
                  onChange={(e) => handleChange('useSSH', e.target.checked)}
                />
              }
              label="使用SSH隧道"
            />
            
            {formData.useSSH && (
              <Paper sx={{ p: 3, mt: 2, backgroundColor: '#f9f9f9' }}>
                <Stack spacing={3}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="SSH主机"
                      value={formData.sshConfig?.host || ''}
                      onChange={(e) => handleSSHChange('host', e.target.value)}
                      sx={{ flex: 3 }}
                    />
                    <TextField
                      label="SSH端口"
                      type="number"
                      value={formData.sshConfig?.port || 22}
                      onChange={(e) => handleSSHChange('port', parseInt(e.target.value))}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="SSH用户名"
                      value={formData.sshConfig?.username || ''}
                      onChange={(e) => handleSSHChange('username', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="SSH密码"
                      type="password"
                      value={formData.sshConfig?.password || ''}
                      onChange={(e) => handleSSHChange('password', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label="私钥文件路径"
                    value={formData.sshConfig?.privateKey || ''}
                    onChange={(e) => handleSSHChange('privateKey', e.target.value)}
                    placeholder="例如: ~/.ssh/id_rsa"
                  />
                  <TextField
                    fullWidth
                    label="私钥密码"
                    type="password"
                    value={formData.sshConfig?.passphrase || ''}
                    onChange={(e) => handleSSHChange('passphrase', e.target.value)}
                  />
                </Stack>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* SSL安全面板 */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ p: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.useSSL}
                  onChange={(e) => handleChange('useSSL', e.target.checked)}
                />
              }
              label="使用SSL连接"
            />
            
            {formData.useSSL && (
              <Paper sx={{ p: 3, mt: 2, backgroundColor: '#f9f9f9' }}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="客户端证书文件"
                    value={formData.sslCert || ''}
                    onChange={(e) => handleChange('sslCert', e.target.value)}
                    placeholder="客户端证书文件路径"
                  />
                  <TextField
                    fullWidth
                    label="客户端密钥文件"
                    value={formData.sslKey || ''}
                    onChange={(e) => handleChange('sslKey', e.target.value)}
                    placeholder="客户端密钥文件路径"
                  />
                  <TextField
                    fullWidth
                    label="CA证书文件"
                    value={formData.sslCA || ''}
                    onChange={(e) => handleChange('sslCA', e.target.value)}
                    placeholder="CA证书文件路径"
                  />
                </Stack>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* 高级设置面板 */}
        <TabPanel value={currentTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>字符集</InputLabel>
                  <Select
                    value={formData.charset}
                    onChange={(e) => handleChange('charset', e.target.value)}
                  >
                    <MenuItem value="utf8mb4">utf8mb4</MenuItem>
                    <MenuItem value="utf8">utf8</MenuItem>
                    <MenuItem value="latin1">latin1</MenuItem>
                    <MenuItem value="gbk">gbk</MenuItem>
                    <MenuItem value="big5">big5</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>时区</InputLabel>
                  <Select
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                  >
                    <MenuItem value="local">本地时区</MenuItem>
                    <MenuItem value="Z">UTC</MenuItem>
                    <MenuItem value="+08:00">Asia/Shanghai</MenuItem>
                    <MenuItem value="+00:00">GMT</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                fullWidth
                label="连接池大小"
                type="number"
                value={formData.connectionLimit}
                onChange={(e) => handleChange('connectionLimit', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 100 }}
              />
            </Stack>
          </Box>
        </TabPanel>

        {/* 测试结果显示 */}
        {testResult && (
          <Box sx={{ p: 3, pt: 0 }}>
            <Alert 
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {testResult.message}
              {testResult.latency && (
                <Typography variant="caption" display="block">
                  响应时间: {testResult.latency}ms
                </Typography>
              )}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 3, backgroundColor: '#fafafa' }}>
        <Button
          startIcon={<TestIcon />}
          onClick={handleTestConnection}
          disabled={isLoading}
          variant="outlined"
        >
          {isLoading ? '测试中...' : '测试连接'}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>
          取消
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!formData.name || !formData.host || !formData.user}
        >
          {mode === 'create' ? '创建' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NavicatStyleConnectionDialog;
