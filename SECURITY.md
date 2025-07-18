# 安全政策

## 支持的版本

我们会为以下版本提供安全更新：

| 版本 | 支持状态 |
| --- | --- |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x: |

## 报告安全漏洞

如果您发现了安全漏洞，请不要在公开的Issue中报告。

请通过以下方式私下联系我们：

1. 通过GitHub的私人消息联系项目维护者
2. 发送邮件到项目维护者（通过GitHub profile获取联系方式）

在报告中请包含：

- 漏洞的详细描述
- 重现步骤（如果可能）
- 潜在的影响
- 建议的修复方案（如果有）

我们承诺：

- 在24小时内确认收到您的报告
- 在合理时间内提供修复时间表
- 在修复发布后公开致谢（除非您希望保持匿名）

## 安全最佳实践

### 数据保护

- 所有数据库连接信息都在本地加密存储
- 不会向外部服务器传输敏感信息
- 应用程序不包含遥测或数据收集功能

### 使用建议

- 定期更新到最新版本
- 不要在不安全的网络环境中使用
- 保护好您的数据库访问凭据
- 定期备份重要数据

感谢您帮助我们保持项目的安全！
