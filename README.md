# 点点够MySQL客户端

<div align="center">
  <img src="assets/logo.png" alt="点点够MySQL客户端" width="128" height="128">
  
  **一个专业的MySQL数据库管理工具**
  
  [![GitHub release](https://img.shields.io/github/release/chenlaiyi/MysqlDestop.svg)](https://github.com/chenlaiyi/MysqlDestop/releases)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://github.com/chenlaiyi/MysqlDestop)
</div>

基于Electron和React构建的现代化MySQL数据库管理工具，为开发者和数据库管理员提供直观、高效的数据库操作体验。

## ✨ 核心功能

### 🔗 连接管理
- 支持多个MySQL数据库连接配置
- 安全的连接信息加密存储
- 快速连接切换和管理

### 📊 数据操作  
- 直观的数据表浏览界面
- 在线数据编辑和批量操作
- 支持多种数据类型的可视化编辑
- 数据导出（JSON、CSV格式）

### 🔍 SQL编辑器
- 语法高亮和智能提示
- SQL格式化和验证
- 查询历史记录和收藏功能
- 支持复杂查询和存储过程

### 🛠️ 数据库管理
- 数据库结构浏览（表、视图、函数、事件）
- 创建和修改表结构
- 索引管理和优化建议
- 数据库备份和恢复

### 📈 性能监控
- 实时连接状态监控
- 查询性能分析
- 数据库性能指标展示

### 🎨 用户体验
- 现代化的白色主题界面
- 响应式设计，适配不同屏幕
- 多语言支持（中文/英文）
- 快捷键支持，提升操作效率

## 技术栈

- **前端**: React 19, Material-UI, TypeScript
- **桌面应用**: Electron 37
- **数据库**: MySQL2
- **构建工具**: Webpack, electron-builder

## 🖥️ 系统截图

### 主界面
*现代化的数据库管理界面*

### 连接管理
*简洁直观的连接配置*

### SQL编辑器
*专业的SQL开发环境*

## 📋 系统要求

- **操作系统**: macOS 10.12 或更高版本
- **处理器**: 支持 ARM64 (Apple Silicon) 和 x64
- **内存**: 建议 4GB 以上
- **存储**: 约 200MB 可用空间

## 🚀 快速开始

### 下载安装

1. 前往 [Releases](https://github.com/chenlaiyi/MysqlDestop/releases) 页面
2. 下载最新版本的 `.dmg` 安装包
3. 双击安装包，将应用拖拽到 Applications 文件夹
4. 启动应用，开始管理您的MySQL数据库

### 首次使用

1. **创建连接**: 点击 "新建连接" 配置您的MySQL服务器
2. **测试连接**: 确保连接参数正确
3. **开始使用**: 浏览数据库、执行查询、管理数据

## 🛠️ 开发指南

### 环境准备

确保您的开发环境安装了以下工具：

- [Node.js](https://nodejs.org/) 16.0 或更高版本
- [npm](https://www.npmjs.com/) 或 [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### 本地开发

```bash
# 克隆项目
git clone https://github.com/chenlaiyi/MysqlDestop.git
cd MysqlDestop

# 安装依赖
npm install

# 启动开发模式
npm start
```

### 构建和打包

```bash
# 构建生产版本
npm run build:prod

# 打包 macOS DMG
npm run dist

# 打包后的文件在 release/ 目录下
```

### 项目结构

```
mysql-desktop-client/
├── src/
│   ├── main/           # Electron主进程
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   └── connectionManager.ts
│   └── renderer/       # React前端
│       ├── components/ # UI组件
│       ├── locales/   # 国际化
│       └── index.tsx
├── assets/            # 静态资源
├── build/             # 构建配置
└── package.json
```

## 🤝 贡献指南

我们欢迎任何形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 **Pull Request**

### 开发规范

- 代码风格遵循 TypeScript 和 React 最佳实践
- 提交信息使用 [Conventional Commits](https://conventionalcommits.org/) 格式
- 添加必要的测试和文档

## 📖 API文档

### 数据库连接配置

```typescript
interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}
```

### IPC通信接口

主进程与渲染进程之间的通信接口：

- `store:get-connections` - 获取保存的连接列表
- `store:save-connection` - 保存新的连接配置
- `db:test-connection` - 测试数据库连接
- `db:execute-query` - 执行SQL查询

## 🔒 安全说明

- 数据库连接信息通过 electron-store 加密存储在本地
- 不会收集或上传任何用户数据
- 所有数据库操作仅在本地进行

## 📝 更新日志

### v1.0.2 (2025-07-16)

#### ✨ 新功能
- 全新白色主题UI设计
- 多数据库连接管理
- SQL查询编辑器增强
- 数据表在线编辑功能
- 性能监控面板

#### 🎨 界面改进
- 采用Material-UI设计系统
- 响应式布局优化
- 自定义应用图标

#### ⚡ 性能优化
- Webpack生产构建优化
- Electron进程性能调优
- 启动速度提升

#### 🐛 问题修复
- 修复配置文件隔离问题
- 解决macOS性能问题
- 优化内存使用

## 🎯 路线图

- [ ] 支持其他数据库类型（PostgreSQL、SQLite）
- [ ] 数据可视化图表功能
- [ ] 数据库设计工具
- [ ] 团队协作功能
- [ ] 云端配置同步
- [ ] Windows 和 Linux 版本

## 📞 支持与反馈

- **问题反馈**: [GitHub Issues](https://github.com/chenlaiyi/MysqlDestop/issues)
- **功能建议**: [GitHub Discussions](https://github.com/chenlaiyi/MysqlDestop/discussions)
- **邮件联系**: 通过GitHub联系作者

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议发布。

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个 ⭐️</p>
  <p>Made with ❤️ by 点点够团队</p>
</div>
