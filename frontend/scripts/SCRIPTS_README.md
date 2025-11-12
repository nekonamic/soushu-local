# 构建脚本说明

## 自动版本号更新脚本

本目录包含自动更新版本号的脚本，用于在构建时生成基于时间和内容的hash值，并更新到环境变量文件中。

## 文件说明

### `update-version.js` (推荐)
- **功能**: 完整的Node.js脚本，支持内容hash生成
- **依赖**: 无额外依赖，使用Node.js内置模块
- **特性**:
  - 基于package.json和源文件内容生成hash
  - 支持多种环境
  - 完整的错误处理
  - 跨平台兼容

### `update-version.bat` (Windows备用)
- **功能**: Windows批处理脚本，简单版本
- **依赖**: 仅Windows系统
- **特性**:
  - 使用随机数生成简单hash
  - 仅适用于Windows环境

## 使用方法

### 1. 自动集成构建（推荐）

```bash
# 标准构建（自动检测环境）
npm run build

# 生产环境构建
npm run build:prod

# 开发环境构建
npm run build:dev
```

### 2. 手动更新版本号

```bash
# 更新版本号（根据NODE_ENV环境）
npm run update-version

# 强制生产环境版本号
npm run update-version:prod

# 强制开发环境版本号
npm run update-version:dev
```

### 3. 直接运行脚本

```bash
# Node.js脚本
node scripts/update-version.js

# Windows批处理
scripts\update-version.bat
```

## 版本号格式

脚本会根据环境生成不同格式的版本号：

- **生产环境**: `prod-YYYY-MM-DD-{hash}` (例如: `prod-2024-12-09-a1b2c3d4`)
- **开发环境**: `dev-YYYY-MM-DD-{hash}` (例如: `dev-2024-12-09-e5f6g7h8`)
- **其他环境**: `{env}-YYYY-MM-DD-{hash}`

## 环境变量

脚本会读取以下环境变量：

- `NODE_ENV`: 构建环境 (`production` | `development` | 其他)

## 生成的文件

脚本执行后会更新以下文件：

1. `.env.production` - 生产环境配置
2. `.env.development` - 开发环境配置
3. `.version` - 临时文件，包含当前版本号

## 示例输出

```
🚀 开始更新版本号...
📋 环境信息: production
📅 时间: 2024-12-09 143022
🔧 生成版本号: prod-2024-12-09-a1b2c3d4
✅ 已更新 .env.production 中的 VITE_PROJECT_HASH: prod-2024-12-09-a1b2c3d4
✨ 版本号更新完成！成功更新 1 个文件
📝 版本号已保存到 .version 文件
```

## 注意事项

1. 脚本会自动创建不存在的环境文件（从`.env.example`复制）
2. 如果环境变量文件中没有`VITE_PROJECT_HASH`，会自动添加
3. 生成的版本号会自动同步到应用中显示
4. 建议在CI/CD流程中使用`NODE_ENV=production`确保生成正确的生产版本号

## 故障排除

如果遇到权限问题，可以尝试：
```bash
# Linux/macOS
chmod +x scripts/update-version.js

# Windows
# 以管理员身份运行命令提示符
```