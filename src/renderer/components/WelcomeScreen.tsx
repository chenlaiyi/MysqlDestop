import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Paper,
  Avatar,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Storage as StorageIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Computer as ComputerIcon,
  AccessTime as AccessTimeIcon,
  Security as SecurityIcon,
  CloudOff as CloudOffIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import SuperConnectionWizard from './SuperConnectionWizard';
import TestConnectionDialog from './TestConnectionDialog';

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

interface WelcomeScreenProps {
  onConnect: (profile: ConnectionProfile) => void;
  onNewConnection: () => void;
  onEditConnection: (profile: ConnectionProfile) => void;
  savedProfiles: ConnectionProfile[];
  onDeleteConnection: (profileId: string) => void;
  onToggleFavorite: (profileId: string) => void;
  isConnecting?: boolean;
  connectingProfile?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onConnect,
  onNewConnection,
  onEditConnection,
  savedProfiles = [],
  onDeleteConnection,
  onToggleFavorite,
  isConnecting = false,
  connectingProfile
}) => {
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | undefined>(undefined);
  const [showTestDialog, setShowTestDialog] = useState(false);

  // 包装连接函数以添加调试信息
  const handleConnectClick = (profile: ConnectionProfile) => {
    console.log('连接到:', profile.name || `${profile.username}@${profile.host}`);
    onConnect(profile);
  };

  const handleNewConnection = () => {
    setEditingProfile(undefined);
    setIsWizardOpen(true);
  };

  const handleEditConnection = (profile: ConnectionProfile) => {
    setEditingProfile(profile);
    setIsWizardOpen(true);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
    setEditingProfile(undefined);
  };

  const handleWizardConnect = (profile: ConnectionProfile) => {
    setIsWizardOpen(false);
    setEditingProfile(undefined);
    onConnect(profile);
  };

  const formatLastUsed = (lastUsed?: Date) => {
    if (!lastUsed) return '从未使用';
    
    const now = new Date();
    const diff = now.getTime() - lastUsed.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚使用';
  };

  const getConnectionIcon = (profile: ConnectionProfile) => {
    if (profile.ssl) {
      return <SecurityIcon color="success" />;
    }
    return <StorageIcon color="primary" />;
  };

  // 按最近使用时间和收藏状态排序
  const sortedProfiles = [...savedProfiles].sort((a, b) => {
    // 收藏的排在前面
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    
    // 然后按最近使用时间排序
    const aTime = a.lastUsed?.getTime() || 0;
    const bTime = b.lastUsed?.getTime() || 0;
    return bTime - aTime;
  });

  const favoriteProfiles = sortedProfiles.filter(p => p.favorite);
  const recentProfiles = sortedProfiles.filter(p => !p.favorite).slice(0, 5);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex',
      bgcolor: '#f8f9fa'
    }}>
      {/* 左侧连接列表 */}
      <Box sx={{
        width: 360,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 2
      }}>
        {/* 标题栏 */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            MySQL 客户端
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            管理您的数据库连接
          </Typography>
        </Box>

        {/* 新建连接按钮 */}
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewConnection}
            fullWidth
            size="large"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              mb: 1
            }}
          >
            连接 +
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setShowTestDialog(true)}
            fullWidth
            size="small"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            测试Navicat连接
          </Button>
        </Box>

        {/* 连接列表 */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
          {savedProfiles.length === 0 ? (
            <Paper sx={{ 
              p: 3, 
              textAlign: 'center', 
              bgcolor: 'grey.50',
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2
            }}>
              <CloudOffIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无保存的连接
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                点击上方的"连接 +"按钮创建您的第一个数据库连接
              </Typography>
            </Paper>
          ) : (
            <>
              {/* 收藏连接 */}
              {favoriteProfiles.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    color: 'text.secondary',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <StarIcon sx={{ fontSize: 16 }} />
                    收藏连接
                  </Typography>
                  <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {favoriteProfiles.map((profile) => (
                      <ListItem
                        key={profile.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'primary.50',
                            transform: 'translateY(-1px)',
                            boxShadow: 2
                          }
                        }}
                        onMouseEnter={() => setHoveredProfile(profile.id)}
                        onMouseLeave={() => setHoveredProfile(null)}
                        onClick={() => handleConnectClick(profile)}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ 
                            bgcolor: profile.ssl ? 'success.main' : 'primary.main',
                            width: 32,
                            height: 32
                          }}>
                            {getConnectionIcon(profile)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {profile.name || `${profile.username}@${profile.host}`}
                              </span>
                              {isConnecting && connectingProfile === profile.id && (
                                <LinearProgress sx={{ width: 60, height: 2 }} />
                              )}
                            </span>
                          }
                          secondary={
                            <span>
                              <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {profile.host}:{profile.port}
                                {profile.database && ` / ${profile.database}`}
                              </span>
                              <span style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                {profile.ssl && (
                                  <Chip label="SSL" size="small" color="success" variant="outlined" />
                                )}
                                {profile.tags?.map(tag => (
                                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                                ))}
                              </span>
                            </span>
                          }
                        />
                        {hoveredProfile === profile.id && (
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="编辑连接">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditConnection(profile);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="取消收藏">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite(profile.id);
                                  }}
                                >
                                  <StarIcon fontSize="small" color="warning" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="删除连接">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConnection(profile.id);
                                  }}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 最近连接 */}
              {recentProfiles.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    color: 'text.secondary',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                    最近连接
                  </Typography>
                  <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {recentProfiles.map((profile) => (
                      <ListItem
                        key={profile.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'primary.50',
                            transform: 'translateY(-1px)',
                            boxShadow: 2
                          }
                        }}
                        onMouseEnter={() => setHoveredProfile(profile.id)}
                        onMouseLeave={() => setHoveredProfile(null)}
                        onClick={() => handleConnectClick(profile)}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ 
                            bgcolor: profile.ssl ? 'success.main' : 'grey.400',
                            width: 32,
                            height: 32
                          }}>
                            {getConnectionIcon(profile)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.875rem' }}>
                                {profile.name || `${profile.username}@${profile.host}`}
                              </span>
                              {isConnecting && connectingProfile === profile.id && (
                                <LinearProgress sx={{ width: 60, height: 2 }} />
                              )}
                            </span>
                          }
                          secondary={
                            <span>
                              <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', display: 'block' }}>
                                {profile.host}:{profile.port}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {formatLastUsed(profile.lastUsed)}
                              </span>
                            </span>
                          }
                        />
                        {hoveredProfile === profile.id && (
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="编辑连接">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditConnection(profile);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="添加到收藏">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite(profile.id);
                                  }}
                                >
                                  <StarBorderIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="删除连接">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConnection(profile.id);
                                  }}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* 底部信息 */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'grey.50'
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            点点够 MySQL 客户端 v1.0.4
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            已保存 {savedProfiles.length} 个连接
          </Typography>
        </Box>
      </Box>

      {/* 右侧主要内容区域 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        bgcolor: '#f8f9fa'
      }}>
        {/* 欢迎内容 */}
        <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
          {/* Logo区域 */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: 3
            }}>
              <StorageIcon sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            
            <Typography variant="h3" sx={{ 
              fontWeight: 700, 
              mb: 2,
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}>
              点点够 MySQL 客户端
            </Typography>
            
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
              专业的 MySQL 数据库管理工具
            </Typography>
          </Box>

          {/* 功能特色 */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: 3, 
            mb: 4 
          }}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <ComputerIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>现代化界面</Typography>
              <Typography variant="body2" color="text.secondary">
                简洁直观的用户界面，支持深色模式
              </Typography>
            </Card>
            
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>安全连接</Typography>
              <Typography variant="body2" color="text.secondary">
                支持SSL加密连接，保护数据安全
              </Typography>
            </Card>
            
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <PlayArrowIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>高效查询</Typography>
              <Typography variant="body2" color="text.secondary">
                智能SQL编辑器，语法高亮和自动补全
              </Typography>
            </Card>
          </Box>

          {/* 操作提示 */}
          {savedProfiles.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                欢迎使用！请在左上角点击"连接 +"按钮创建您的第一个数据库连接。
              </Typography>
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                在左侧选择一个连接开始使用，或创建新的连接。
              </Typography>
            </Alert>
          )}

          {/* 快速操作 */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleNewConnection}
              sx={{ px: 4, py: 1.5, borderRadius: 3 }}
            >
              新建连接
            </Button>
            
            {savedProfiles.length > 0 && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleConnectClick(savedProfiles[0])}
                sx={{ px: 4, py: 1.5, borderRadius: 3 }}
              >
                连接最近使用
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Connection Wizard */}
      <SuperConnectionWizard
        open={isWizardOpen}
        onClose={handleWizardClose}
        onConnect={handleWizardConnect}
        initialProfile={editingProfile}
        savedProfiles={savedProfiles}
      />

      {/* Test Connection Dialog */}
      {showTestDialog && (
        <TestConnectionDialog onClose={() => setShowTestDialog(false)} />
      )}
    </Box>
  );
};

export default WelcomeScreen;
