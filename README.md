# 点点够 MySQL Desktop

<div align="center">
  <img src="assets/logo.png" alt="点点够MySQL客户端" width="128" height="128">
  <p><strong>Navicat 风格的现代 MySQL 桌面客户端</strong></p>

  <a href="https://github.com/chenlaiyi/MysqlDestop/releases"><img src="https://img.shields.io/github/v/release/chenlaiyi/MysqlDestop.svg" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/chenlaiyi/MysqlDestop"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Apple%20Silicon%20%26%20Intel-lightgrey.svg" alt="Platform"></a>
</div>

点点够 MySQL Desktop 基于 Electron + React + Material UI 构建，为 Mac 用户提供轻量、直观且专业的 MySQL 数据库管理体验。1.0.4 版本全新引入 Navicat 风格的暗色界面，整合连接向导、表格编辑、性能监控等工作流，帮助开发者与 DBA 更快完成日常运维任务。

## 🌟 亮点特性

| 分类 | 功能 | 说明 |
| --- | --- | --- |
| 连接管理 | 多连接配置、收藏、最近使用 | 连接信息本地加密存储，支持快速切换、收藏标记与最近连接入口 |
| 安全访问 | SSH Tunnel、SSL | 内置 `ssh2` / `ssh2-promise` 创建安全隧道，兼容 SSL 连接 |
| 数据浏览 | Navicat 风格数据表、批量选择、列显隐、单元格编辑 | Exact Data Table 支持分页、排序、模糊搜索、列管理，并可双击单元格直接编辑保存 |
| 对象视图 | 数据库对象总览、右键菜单 | "对象" 标签页列出表名、行数、长度、引擎、创建/修改时间等信息，右键即可复制、重命名、清空、删除或打开 |
| SQL 编辑 | React Ace 编辑器、格式化、历史记录 | 提供语法高亮、自动补全、查询历史保存与快照回滚 |
| 数据维护 | 导出 CSV/JSON、结构管理、备份向导 | 集成表结构浏览、数据导出与备份计划配置 |
| 性能监控 | 实时连接状态、慢查询分析 | Super Performance Monitor 面板展示连接指标与执行耗时 |
| 多语言 | 中文 / 英文 | `src/renderer/locales` 中提供多语言资源，界面可即时切换 |

> 🎨 **全新 UI**：主题色与组件半径全面对齐 Navicat 深色视觉，顶部命令栏 + 侧边导航 + 主操作区的三栏布局让操作路径更清晰。

## 🖼️ 预览

> 当前预览图正在准备中，可在应用中直接体验 Navicat 风格暗色界面；欢迎通过 PR 补充高清截图。

## 📦 安装体验

1. 访问 [Releases](https://github.com/chenlaiyi/MysqlDestop/releases) 页面下载最新 `.dmg` 包。
2. 将应用拖拽至 `Applications` 文件夹。
3. 首次启动如遇安全提示，可在「系统设置 → 隐私与安全性」中允许运行。
4. 启动应用，按照连接向导快速接入 MySQL 实例。

## ⚙️ 系统要求

- **操作系统**：macOS 12 (Monterey) 或更高版本（Apple Silicon / Intel）
- **数据库**：MySQL 5.7、8.0 及兼容分支
- **内存**：建议 ≥ 4 GB
- **网络**：可访问目标数据库或 SSH 跳板机

## 🛠️ 本地开发

```bash
# 克隆项目
git clone https://github.com/chenlaiyi/MysqlDestop.git
cd MysqlDestop

# 安装依赖
npm install

# 启动开发模式（编译 + Electron）
npm start

# 仅编译 TypeScript 与前端资源（无 Electron）
npm run build
```

### 常用脚本

| 指令 | 说明 |
| --- | --- |
| `npm start` | 编译主/渲染进程并启动 Electron |
| `npm run build` | TypeScript 编译 + Webpack 打包（开发） |
| `npm run build:prod` | 生产环境构建（`NODE_ENV=production`） |
| `npm run dist` | 使用 electron-builder 打包 macOS DMG（不发布） |
| `npm run dist:dmg` | 仅生成 macOS DMG 包 |

### 目录结构

```
MysqlDestop/
├── assets/                     # 图标、字体等静态资源
├── src/
│   ├── main/                   # Electron 主进程：连接管理、SSH、IPC
│   └── renderer/               # React 前端
│       ├── components/         # Navicat 风格 UI 组件
│       ├── theme/              # 自定义主题与暗色调
│       ├── locales/            # i18n 资源
│       └── App.tsx             # 顶层布局
├── build/                      # electron-builder 配置
├── release/                    # 打包产物输出目录
├── package.json
└── README.md
```

## 🧩 技术栈

- **桌面框架**：Electron 37
- **前端框架**：React 19 + TypeScript 5
- **UI 库**：Material UI 7（深度定制主题与组件覆盖）
- **代码编辑**：Ace Editor (`react-ace`)
- **数据库驱动**：mysql2、node-ssh、electron-store、xlsx
- **打包**：Webpack 5、electron-builder 24

## 🤝 参与贡献

1. Fork 本仓库并创建特性分支：`git checkout -b feat/my-feature`
2. 提交前确保通过 TypeScript 检查：`npx tsc --noEmit`
3. 使用约定式提交信息，例如 `feat: add navicat style toolbar`
4. 推送并创建 Pull Request，描述变更动机与验证方式

> 若改善了界面或补充了资源，请同步更新 README 以保持文档一致。

## 📚 数据与 IPC 约定

- 渲染进程通过 `window.mysqlApi` 与主进程通信：
  - `connect(config)`：建立数据库连接并返回库列表
  - `getConnections()` / `saveConnection()`：管理本地保存的连接
  - `getTables(database)` / `getTableData(database, table, options)`：获取表结构与数据
- 敏感配置通过 `electron-store` 加密保存，仅存于本地设备。

## 🗺️ 更新日志

- **v1.0.4 (2025-09-28)**
  - Navicat 风格暗色主题全面上线，统一按钮、列表、标签页视觉
  - 重构应用外壳：顶部工具栏、侧边导航、实时状态卡片
  - Exact Data Table 支持列显隐、分页跳转、主题化高亮
  - Navigator、欢迎页、连接向导全面焕新
- **v1.0.2 (2025-07-16)**
  - 首个公开版本，提供白色主题、SQL 编辑器、数据导出与性能监控

更多历史条目参见 [RELEASE_NOTES.md](RELEASE_NOTES.md)。

## 🚧 路线图

- [ ] 适配 PostgreSQL / SQLite 等多数据库
- [ ] 提供数据可视化面板与监控大屏
- [ ] 增强 ER 图 / 模型设计工具
- [ ] 团队协作与配置同步能力
- [ ] Windows / Linux 桌面版本

## 📣 支持与反馈

- 提交问题：[GitHub Issues](https://github.com/chenlaiyi/MysqlDestop/issues)
- 功能建议：[GitHub Discussions](https://github.com/chenlaiyi/MysqlDestop/discussions)
- 其他沟通：通过 GitHub Profile 联系维护者

## 📄 许可证

本项目使用 [MIT License](LICENSE)。使用过程中请遵守相关开源协议，引用时附带版权声明。

---

<div align="center">
  <p>如果这个项目对你有帮助，欢迎点亮一颗 ⭐️</p>
  <p>Made with ❤️ by 点点够团队</p>
</div>
