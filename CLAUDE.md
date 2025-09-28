# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Playwright 的 Google 搜索工具，支持命令行工具和 MCP 服务器两种模式。项目使用 TypeScript 开发，通过浏览器自动化绕过搜索引擎的反爬虫机制。

## 常用开发命令

### 构建与安装
```bash
# 安装依赖
npm install

# 编译 TypeScript 代码
npm run build

# 清理编译输出
npm run clean

# 全局链接（MCP 功能需要）
npm link
```

### 开发与测试
```bash
# 开发模式运行搜索（不需要编译）
npm run dev "搜索关键词"

# 调试模式（显示浏览器界面）
npm run debug "搜索关键词"

# 运行测试搜索
npm run test

# 运行编译后的代码
npm run start "搜索关键词"
```

### MCP 服务器
```bash
# 开发模式运行 MCP 服务器
npm run mcp

# 运行编译后的 MCP 服务器
npm run mcp:build
```

## 核心架构

### 模块结构
- **src/index.ts**: CLI 命令行入口，处理命令行参数，调用搜索功能或获取 HTML 功能
- **src/search.ts**: 核心搜索实现，包含：
  - 浏览器指纹管理和反检测机制
  - 状态保存/恢复功能（减少人机验证）
  - 搜索结果解析和 HTML 获取
  - 自动切换无头/有头模式
- **src/mcp-server.ts**: MCP 服务器实现，为 AI 助手提供搜索能力
- **src/types.ts**: TypeScript 类型定义
- **src/logger.ts**: 日志管理

### 关键技术特性

#### 反爬虫机制处理
- 使用真实设备指纹配置（根据宿主机器环境自动生成）
- 浏览器状态保存和恢复（cookies、localStorage）
- 智能模式切换：先尝试无头模式，遇到验证自动切换到有头模式
- 随机化设备和区域设置

#### 搜索功能
- `googleSearch()`: 执行搜索并返回结构化结果（标题、链接、摘要）
- `getGoogleSearchPageHtml()`: 获取搜索页面的原始 HTML（已清理 CSS/JS）
- 支持网页截图保存

#### 浏览器管理
- 基于 Playwright 的 Chromium 自动化
- 状态文件默认保存在 `./browser-state.json`
- 支持自定义超时和结果数量限制

## 重要实现细节

### 指纹配置系统
`getHostMachineConfig()` 函数根据宿主机器环境生成浏览器指纹，包括：
- 设备类型（Desktop Chrome/Safari/Edge/Firefox）
- 区域设置（locale）
- 时区（timezoneId）
- 颜色方案（dark/light）
- 动画和颜色设置

### Google 域名处理
项目会根据区域自动选择合适的 Google 域名（如 google.com.hk、google.com 等），并将选择的域名保存在状态文件中以保持一致性。

### 错误处理
- 浏览器启动失败的友好提示
- 网络连接问题的自动重试
- 超时情况的优雅处理
- 详细的日志输出用于调试

## 注意事项

- 项目使用 ES 模块（"type": "module"）
- Node.js 版本要求 >= 16.0.0
- Playwright 需要下载 Chromium 浏览器（首次安装时自动执行）
- Windows 环境已做特殊适配（.cmd 文件、路径处理等）
- 状态文件包含敏感信息（cookies），需要妥善保管