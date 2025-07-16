import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Fade,
  Container,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DatabaseIcon from '@mui/icons-material/Storage';

const WelcomeContainer = styled(Container)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#ffffff',
}));

const WelcomePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(6),
  textAlign: 'center',
  maxWidth: 500,
  borderRadius: theme.spacing(3),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: '#ffffff',
  border: '1px solid #e0e0e0',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}));

const LogoImage = styled('img')({
  width: 120,
  height: 120,
  objectFit: 'contain',
  marginBottom: 16,
});

const AppTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: '#1976d2',
  marginBottom: theme.spacing(1),
  fontSize: '2.5rem',
}));

const AppSlogan = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(4),
  fontSize: '1.1rem',
  fontStyle: 'italic',
}));

interface WelcomeScreenProps {
  onGetStarted: () => void;
  hasSavedConnections?: boolean;
  onQuickConnect?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted, hasSavedConnections, onQuickConnect }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <WelcomeContainer maxWidth={false}>
      <Fade in={show} timeout={1000}>
        <WelcomePaper elevation={0}>
          <LogoContainer>
            <LogoImage 
              src="./assets/logo.png" 
              alt="点点够MySQL客户端 Logo"
              onError={(e) => {
                // 如果图片加载失败，显示默认图标
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const iconElement = target.nextElementSibling as HTMLElement;
                if (iconElement) {
                  iconElement.style.display = 'block';
                }
              }}
            />
            <DatabaseIcon 
              sx={{ 
                fontSize: 120, 
                color: 'primary.main',
                display: 'none' // 默认隐藏，只在图片加载失败时显示
              }} 
            />
          </LogoContainer>

          <Stack spacing={3}>
            <Box>
              <AppTitle variant="h3">
                点点够MySQL客户端
              </AppTitle>
              <AppSlogan variant="body1">
                点点够数据库mysql版本
              </AppSlogan>
            </Box>

            <Typography variant="body1" color="text.secondary">
              功能强大的MySQL数据库管理工具
            </Typography>

            <Typography variant="body2" color="text.secondary">
              支持数据库连接、表管理、查询编辑、数据同步等功能
            </Typography>

            <Button
              variant="contained"
              size="large"
              onClick={onGetStarted}
              sx={{
                mt: 2,
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {hasSavedConnections ? '管理连接' : '开始使用'}
            </Button>

            {hasSavedConnections && onQuickConnect && (
              <Button
                variant="outlined"
                size="large"
                onClick={onQuickConnect}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    color: 'primary.dark',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                快速连接
              </Button>
            )}
          </Stack>
        </WelcomePaper>
      </Fade>
    </WelcomeContainer>
  );
};

export default WelcomeScreen;
