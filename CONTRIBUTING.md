# 贡献指南

感谢您对点点够MySQL客户端项目的关注！我们非常欢迎社区贡献。

## 🚀 快速开始

### 开发环境设置

1. Fork 本仓库到您的GitHub账户
2. 克隆您的Fork到本地：
   ```bash
   git clone https://github.com/YOUR_USERNAME/MysqlDestop.git
   cd MysqlDestop
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动开发环境：
   ```bash
   npm start
   ```

### 分支策略

- `main` - 主分支，包含稳定的发布版本
- `develop` - 开发分支，最新的开发进度
- `feature/*` - 功能分支，开发新功能
- `bugfix/*` - 修复分支，修复问题
- `hotfix/*` - 热修复分支，紧急修复

## 📝 提交规范

我们使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

### 提交类型

- `feat`: 新功能
- `fix`: 问题修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

### 提交格式

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 示例

```bash
feat(ui): 添加数据导出功能

- 支持CSV和JSON格式导出
- 添加导出进度显示
- 优化大数据量导出性能

Closes #123
```

## 🐛 问题报告

### 在提交Issue前

1. 搜索现有Issues，确认问题未被报告
2. 确保使用最新版本
3. 提供详细的问题描述

### Issue模板

**问题描述**
简洁明了地描述问题

**复现步骤**
1. 进入 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

**预期行为**
描述您期望发生的行为

**实际行为**
描述实际发生的行为

**环境信息**
- 操作系统: [e.g. macOS 12.0]
- 应用版本: [e.g. 1.0.2]
- Node.js版本: [e.g. 16.14.0]

**截图**
如果适用，添加截图来帮助解释问题

## 💡 功能建议

我们欢迎新功能建议！请通过GitHub Discussions或Issues提交：

1. 描述功能的用途和价值
2. 提供使用场景
3. 考虑实现的复杂度
4. 是否愿意参与开发

## 🔧 代码标准

### TypeScript/JavaScript

- 使用TypeScript进行类型安全
- 遵循ESLint规则
- 使用Prettier格式化代码
- 函数和变量使用驼峰命名
- 常量使用大写下划线命名

### React组件

- 使用函数组件和Hooks
- 组件名使用PascalCase
- Props接口以Props结尾命名
- 合理使用memo和useMemo优化性能

### 样式

- 使用Material-UI主题系统
- 保持一致的设计语言
- 支持响应式设计
- 考虑无障碍访问

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并监听变化
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 测试要求

- 新功能必须包含相应测试
- 保持测试覆盖率在80%以上
- 编写清晰的测试用例描述
- 测试应该独立且可重复

## 📦 构建和发布

### 本地构建

```bash
# 开发构建
npm run build

# 生产构建
npm run build:prod

# 打包应用
npm run dist
```

### 发布流程

1. 更新版本号和CHANGELOG
2. 创建Pull Request到main分支
3. 代码审查通过后合并
4. 创建GitHub Release
5. 自动构建和发布

## 🤝 Pull Request流程

### 准备工作

1. 确保您的分支基于最新的main分支
2. 运行测试确保通过
3. 更新相关文档
4. 检查代码风格

### PR描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] 问题修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化

## 变更描述
简要描述此PR的变更内容

## 测试说明
- [ ] 已添加/更新测试
- [ ] 所有测试通过
- [ ] 已手动测试

## 相关Issue
Closes #(issue number)

## 截图
如果有UI变更，请提供截图
```

### 代码审查

- 所有PR需要至少一人审查
- 解决审查意见后方可合并
- 保持礼貌和建设性的讨论

## 📞 获取帮助

- **开发问题**: 通过GitHub Issues提问
- **使用问题**: 查看文档或提交Issue
- **实时讨论**: GitHub Discussions

## 🏆 贡献者认可

我们会在README中感谢所有贡献者，包括：

- 代码贡献
- 文档改进
- 问题报告
- 功能建议
- 社区支持

---

再次感谢您的贡献！每一份帮助都让项目变得更好。
