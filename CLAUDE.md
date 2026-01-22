# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

点点够 MySQL Desktop 是一个基于 Electron + React + Material UI 构建的 MySQL 桌面客户端，采用 Navicat 风格的暗色界面设计。

## 常用命令

```bash
# 开发模式（编译 + 启动 Electron）
npm start

# 仅编译（TypeScript + Webpack）
npm run build

# 生产环境构建
npm run build:prod

# 打包 macOS DMG
npm run dist

# TypeScript 类型检查
npx tsc --noEmit
```

## 架构概述

### 进程架构（Electron）

项目采用 Electron 的主进程/渲染进程分离架构：

- **主进程** (`src/main/`)
  - `main.ts`: 应用入口，窗口管理，IPC 处理器注册
  - `preload.ts`: 通过 `contextBridge` 暴露 `window.mysqlApi` 给渲染进程
  - `connectionManager.ts`: MySQL 连接池管理，支持健康检查和自动重连

- **渲染进程** (`src/renderer/`)
  - `App.tsx`: 顶层布局，连接状态管理
  - `components/`: UI 组件
  - `theme/ThemeProvider.tsx`: MUI 主题配置（深色/浅色）

### IPC 通信

渲染进程通过 `window.mysqlApi` 与主进程通信，主要 API：

```typescript
// 连接管理
window.mysqlApi.connect(config)
window.mysqlApi.getConnections()
window.mysqlApi.saveConnection(name, config)
window.mysqlApi.checkHealth()
window.mysqlApi.reconnect()

// 数据操作
window.mysqlApi.getTables(database)
window.mysqlApi.getTableData(database, table, limit, offset, orderBy, orderDirection, searchTerm)
window.mysqlApi.executeQuery(query, database)
window.mysqlApi.insertRow(database, table, data)
window.mysqlApi.updateRow(database, table, primaryKey, primaryKeyValue, data)
window.mysqlApi.deleteRow(database, table, primaryKey, primaryKeyValue)

// 数据库对象
window.mysqlApi.getViews(database)
window.mysqlApi.getFunctions(database)
window.mysqlApi.getProcedures(database)
window.mysqlApi.getEvents(database)
```

### 数据持久化

使用 `electron-store` 存储连接配置和 SQL 历史，配置文件按环境区分：
- 开发环境: `config-dev`
- 生产环境: `config-release`

### 构建配置

Webpack 配置 (`webpack.config.js`) 包含三个入口：
1. 渲染进程 (`electron-renderer`)
2. 主进程 (`electron-main`)
3. 预加载脚本 (`electron-preload`)

## 关键类型定义

```typescript
// src/renderer/types.ts
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
  // ...
}
```

## 提交规范

使用约定式提交信息：
- `feat:` 新功能
- `fix:` 修复
- `chore:` 构建/工具变更
- `docs:` 文档更新
