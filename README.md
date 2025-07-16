# 点点够MySQL客户端

一个专业的MySQL数据库管理工具，基于Electron和React构建。

## 功能特性

- 🔗 多数据库连接管理
- 📊 直观的数据表浏览和编辑
- 🔍 SQL查询编辑器（支持语法高亮）
- 📝 SQL历史记录和收藏
- 🎨 现代化的白色主题界面
- ⚡ 优化的性能表现

## 技术栈

- **前端**: React 19, Material-UI, TypeScript
- **桌面应用**: Electron 37
- **数据库**: MySQL2
- **构建工具**: Webpack, electron-builder

## 系统要求

- macOS 10.12 或更高版本
- 支持 ARM64 (Apple Silicon) 和 x64 处理器

## 安装使用

1. 下载最新的 `.dmg` 安装包
2. 双击安装包并将应用拖拽到 Applications 文件夹
3. 启动应用，配置您的MySQL数据库连接

## 开发

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm start
```

### 构建生产版本

```bash
npm run build:prod
```

### 打包DMG

```bash
npm run dist
```

## 版本历史

### v1.0.2
- 🎨 全新白色主题设计
- ⚡ 性能优化和启动速度提升
- 🔧 修复配置文件隔离问题
- 🖼️ 添加自定义应用图标
- 🐛 修复生产环境下的各种问题

## 许可证

MIT License

## 作者

点点够团队
