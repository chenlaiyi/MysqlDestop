import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Cloud as CloudIcon,
  Computer as ComputerIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon,
  ImportExport as ImportExportIcon
} from '@mui/icons-material';

interface ConnectionProfile {
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

interface SuperConnectionWizardProps {
  open: boolean;
  onClose: () => void;
  onConnect: (profile: ConnectionProfile) => void;
  initialProfile?: ConnectionProfile;
  savedProfiles?: ConnectionProfile[];
}

const SuperConnectionWizard: React.FC<SuperConnectionWizardProps> = ({
  open,
  onClose,
  onConnect,
  initialProfile,
  savedProfiles = []
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [connectionProfile, setConnectionProfile] = useState<ConnectionProfile>({
    id: '',
    name: '',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: '',
    ssl: false,
    connectionLimit: 10,
    timeout: 60000,
    description: '',
    tags: [],
    favorite: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    status: 'success' | 'error' | 'warning' | null;
    message: string;
    details?: any;
  }>({ status: null, message: '' });
  const [selectedSavedProfile, setSelectedSavedProfile] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const steps = [
    {
      label: '选择连接方式',
      description: '选择新建连接或使用已保存的连接配置'
    },
    {
      label: '基本配置',
      description: '设置数据库连接的基本信息'
    },
    {
      label: '高级设置',
      description: '配置SSL、连接池等高级选项'
    },
    {
      label: '测试连接',
      description: '验证连接配置并测试连接'
    },
    {
      label: '保存配置',
      description: '保存连接配置以便将来使用'
    }
  ];

  useEffect(() => {
    if (initialProfile) {
      setConnectionProfile(initialProfile);
      setActiveStep(1); // 跳过选择连接方式步骤
    }
  }, [initialProfile]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setConnectionProfile({
      id: '',
      name: '',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: '',
      ssl: false,
      connectionLimit: 10,
      timeout: 60000,
      description: '',
      tags: [],
      favorite: false
    });
    setConnectionTestResult({ status: null, message: '' });
    setSelectedSavedProfile('');
  };

  const handleProfileChange = (field: keyof ConnectionProfile, value: any) => {
    setConnectionProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLoadSavedProfile = (profileId: string) => {
    const profile = savedProfiles.find(p => p.id === profileId);
    if (profile) {
      setConnectionProfile({ ...profile });
      setSelectedSavedProfile(profileId);
      setActiveStep(2); // 跳到高级设置
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult({ status: null, message: '' });

    try {
      // 使用真实的MySQL连接API进行测试
      const testConfig = {
        host: connectionProfile.host,
        port: connectionProfile.port,
        user: connectionProfile.username,
        password: connectionProfile.password,
        database: connectionProfile.database,
        ssl: connectionProfile.ssl
      };

      console.log('测试连接配置:', testConfig);
      const result = await window.mysqlApi.connect(testConfig);
      
      if (result.success) {
        setConnectionTestResult({
          status: 'success',
          message: '连接测试成功！',
          details: {
            serverVersion: '未知版本',
            charset: 'utf8mb4',
            databaseCount: result.data?.length || 0,
            databases: result.data?.map((db: any) => db.Database).slice(0, 3).join(', ') || ''
          }
        });
      } else {
        setConnectionTestResult({
          status: 'error',
          message: `连接失败：${result.error || '未知错误'}`,
          details: {
            error: result.error || 'Connection failed',
            suggestion: '请检查主机地址、端口、用户名和密码是否正确'
          }
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        status: 'error',
        message: '连接测试出现异常',
        details: { 
          error: error?.message || 'Unknown error',
          suggestion: '请检查网络连接和防火墙设置'
        }
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveProfile = () => {
    const profileToSave = {
      ...connectionProfile,
      id: connectionProfile.id || `profile_${Date.now()}`,
      lastUsed: new Date()
    };
    
    // 在实际应用中这里会保存到本地存储或数据库
    console.log('保存连接配置:', profileToSave);
    
    // 完成并连接
    onConnect(profileToSave);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !connectionProfile.tags?.includes(newTag.trim())) {
      handleProfileChange('tags', [...(connectionProfile.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleProfileChange('tags', connectionProfile.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              选择连接方式
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 3 }}>
              <Card 
                sx={{ 
                  cursor: 'pointer', 
                  border: selectedSavedProfile === '' ? 2 : 1,
                  borderColor: selectedSavedProfile === '' ? 'primary.main' : 'divider'
                }}
                onClick={() => {
                  setSelectedSavedProfile('');
                  setActiveStep(1);
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <ComputerIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">新建连接</Typography>
                  <Typography variant="body2" color="text.secondary">
                    创建一个全新的数据库连接配置
                  </Typography>
                </CardContent>
              </Card>

              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: savedProfiles.length === 0 ? 1 : 2,
                  borderColor: savedProfiles.length === 0 ? 'divider' : 'info.main',
                  opacity: savedProfiles.length === 0 ? 0.5 : 1
                }}
                onClick={() => savedProfiles.length > 0 && setActiveStep(0.5)}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <SaveIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                  <Typography variant="h6">已保存的连接</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {savedProfiles.length > 0 ? `使用 ${savedProfiles.length} 个已保存的连接` : '暂无已保存的连接'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {savedProfiles.length > 0 && activeStep === 0.5 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  选择已保存的连接
                </Typography>
                <List>
                  {savedProfiles.map((profile) => (
                    <ListItem 
                      key={profile.id}
                      onClick={() => handleLoadSavedProfile(profile.id)}
                      sx={{ 
                        border: 1, 
                        borderColor: 'divider', 
                        mb: 1, 
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <StorageIcon color={profile.favorite ? 'warning' : 'inherit'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={profile.name || `${profile.username}@${profile.host}:${profile.port}`}
                        secondary={
                          <span>
                            <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              {profile.host}:{profile.port} | {profile.database || '未指定数据库'}
                            </span>
                            {profile.tags && profile.tags.length > 0 && (
                              <span style={{ display: 'block', marginTop: '4px' }}>
                                {profile.tags.map(tag => (
                                  <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                                ))}
                              </span>
                            )}
                          </span>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              基本连接配置
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
              <TextField
                label="连接名称"
                value={connectionProfile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                placeholder="我的MySQL连接"
                helperText="为这个连接起一个易识别的名称"
              />
              
              <TextField
                label="主机地址"
                value={connectionProfile.host}
                onChange={(e) => handleProfileChange('host', e.target.value)}
                required
                helperText="数据库服务器的IP地址或域名"
              />
              
              <TextField
                label="端口"
                type="number"
                value={connectionProfile.port}
                onChange={(e) => handleProfileChange('port', parseInt(e.target.value) || 3306)}
                required
                helperText="MySQL服务器端口，默认3306"
              />
              
              <TextField
                label="用户名"
                value={connectionProfile.username}
                onChange={(e) => handleProfileChange('username', e.target.value)}
                required
                helperText="数据库登录用户名"
              />
              
              <TextField
                label="密码"
                type={showPassword ? 'text' : 'password'}
                value={connectionProfile.password}
                onChange={(e) => handleProfileChange('password', e.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
                helperText="数据库登录密码"
              />
              
              <TextField
                label="默认数据库"
                value={connectionProfile.database}
                onChange={(e) => handleProfileChange('database', e.target.value)}
                placeholder="可选"
                helperText="连接后默认使用的数据库"
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <TextField
                label="连接描述"
                value={connectionProfile.description}
                onChange={(e) => handleProfileChange('description', e.target.value)}
                multiline
                rows={2}
                fullWidth
                placeholder="对这个连接的简要说明..."
                helperText="可选：添加对此连接的说明"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                标签管理
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {connectionProfile.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="添加标签"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  size="small"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} variant="outlined" size="small">
                  添加
                </Button>
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              高级连接设置
            </Typography>
            
            <Accordion expanded={showAdvancedSettings} onChange={() => setShowAdvancedSettings(!showAdvancedSettings)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">连接池和性能设置</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                  <TextField
                    label="连接池大小"
                    type="number"
                    value={connectionProfile.connectionLimit}
                    onChange={(e) => handleProfileChange('connectionLimit', parseInt(e.target.value) || 10)}
                    helperText="最大并发连接数"
                  />
                  
                  <TextField
                    label="连接超时(ms)"
                    type="number"
                    value={connectionProfile.timeout}
                    onChange={(e) => handleProfileChange('timeout', parseInt(e.target.value) || 60000)}
                    helperText="连接超时时间，单位毫秒"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">安全设置</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch
                      checked={connectionProfile.ssl}
                      onChange={(e) => handleProfileChange('ssl', e.target.checked)}
                    />
                  }
                  label="启用SSL加密连接"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  建议在生产环境中启用SSL以确保数据传输安全
                </Typography>
              </AccordionDetails>
            </Accordion>

            <FormControlLabel
              control={
                <Switch
                  checked={connectionProfile.favorite}
                  onChange={(e) => handleProfileChange('favorite', e.target.checked)}
                />
              }
              label="标记为收藏连接"
              sx={{ mt: 2 }}
            />
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              测试数据库连接
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              在保存连接配置之前，建议先测试连接以确保配置正确。
            </Alert>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                连接信息预览
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="服务器地址" 
                    secondary={`${connectionProfile.host}:${connectionProfile.port}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="用户名" 
                    secondary={connectionProfile.username}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="默认数据库" 
                    secondary={connectionProfile.database || '未指定'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="SSL加密" 
                    secondary={connectionProfile.ssl ? '启用' : '禁用'}
                  />
                </ListItem>
              </List>
            </Paper>

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                startIcon={isTestingConnection ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                size="large"
              >
                {isTestingConnection ? '正在测试连接...' : '测试连接'}
              </Button>
            </Box>

            {connectionTestResult.status && (
              <Alert 
                severity={connectionTestResult.status} 
                sx={{ mb: 2 }}
                icon={
                  connectionTestResult.status === 'success' ? <CheckCircleIcon /> :
                  connectionTestResult.status === 'error' ? <ErrorIcon /> : <WarningIcon />
                }
              >
                <Typography variant="subtitle2">
                  {connectionTestResult.message}
                </Typography>
                {connectionTestResult.details && (
                  <Box sx={{ mt: 1 }}>
                    {connectionTestResult.status === 'success' && (
                      <Typography variant="body2">
                        服务器版本: {connectionTestResult.details.serverVersion}<br />
                        字符集: {connectionTestResult.details.charset}<br />
                        数据库数量: {connectionTestResult.details.databaseCount}<br />
                        可用数据库: {connectionTestResult.details.databases}
                      </Typography>
                    )}
                    {connectionTestResult.status === 'error' && (
                      <Typography variant="body2">
                        错误详情: {connectionTestResult.details.error}<br />
                        建议: {connectionTestResult.details.suggestion}
                      </Typography>
                    )}
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              保存连接配置
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              连接配置已准备就绪！您可以选择保存此配置以便将来使用。
            </Alert>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                配置摘要
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
                <Typography variant="body2">
                  <strong>名称:</strong> {connectionProfile.name || '未命名连接'}
                </Typography>
                <Typography variant="body2">
                  <strong>地址:</strong> {connectionProfile.host}:{connectionProfile.port}
                </Typography>
                <Typography variant="body2">
                  <strong>用户:</strong> {connectionProfile.username}
                </Typography>
                <Typography variant="body2">
                  <strong>数据库:</strong> {connectionProfile.database || '未指定'}
                </Typography>
                <Typography variant="body2">
                  <strong>SSL:</strong> {connectionProfile.ssl ? '启用' : '禁用'}
                </Typography>
                <Typography variant="body2">
                  <strong>收藏:</strong> {connectionProfile.favorite ? '是' : '否'}
                </Typography>
              </Box>
              
              {connectionProfile.tags && connectionProfile.tags.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" component="span">
                    <strong>标签:</strong> 
                  </Typography>
                  {connectionProfile.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" sx={{ ml: 0.5 }} />
                  ))}
                </Box>
              )}
              
              {connectionProfile.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>描述:</strong> {connectionProfile.description}
                </Typography>
              )}
            </Paper>

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveProfile}
                startIcon={<SaveIcon />}
                size="large"
              >
                保存并连接
              </Button>
            </Box>
          </Box>
        );

      default:
        return '未知步骤';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon color="primary" />
          <Typography variant="h6">
            MySQL 连接向导
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 1 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="subtitle1">{step.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                {getStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={
                        (index === 3 && connectionTestResult.status !== 'success') ||
                        (index === 1 && (!connectionProfile.host || !connectionProfile.username))
                      }
                    >
                      {index === steps.length - 1 ? '完成' : '下一步'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      上一步
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              连接配置完成！
            </Typography>
            <Typography variant="body1" gutterBottom>
              您的 MySQL 连接配置已成功创建并保存。正在建立数据库连接...
            </Typography>
            <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
              创建新连接
            </Button>
          </Paper>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          取消
        </Button>
        {activeStep < steps.length && (
          <Button onClick={handleReset} variant="outlined">
            重置
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SuperConnectionWizard;
