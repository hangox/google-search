# CookieCloud 集成文档

本文档介绍如何在 Google Search 工具中使用 CookieCloud 功能，以便自动同步和使用浏览器 cookies。

## 目录

- [什么是 CookieCloud](#什么是-cookiecloud)
- [为什么需要 CookieCloud](#为什么需要-cookiecloud)
- [配置 CookieCloud](#配置-cookiecloud)
- [使用方式](#使用方式)
  - [CLI 命令行使用](#cli-命令行使用)
  - [编程方式使用](#编程方式使用)
  - [MCP 服务器使用](#mcp-服务器使用)
- [工作原理](#工作原理)
- [故障排查](#故障排查)

## 什么是 CookieCloud

[CookieCloud](https://github.com/easychen/CookieCloud) 是一个开源的浏览器 Cookie 和 LocalStorage 同步工具，支持端对端加密。它允许你：

- 在多个设备之间同步浏览器 cookies
- 使用端对端加密保护数据安全
- 通过自建服务器控制数据存储位置
- 定时自动同步 cookies

## 为什么需要 CookieCloud

在使用 Google Search 工具时，集成 CookieCloud 可以带来以下好处：

1. **减少人机验证**：使用已登录的 Google 账号 cookies，可以显著降低触发人机验证（CAPTCHA）的概率
2. **个性化搜索结果**：使用你的账号搜索，可以获得更符合你偏好的搜索结果
3. **访问受限内容**：如果你的 Google 账号有特殊权限，可以访问相应的内容
4. **自动同步**：cookies 由浏览器插件自动同步到云端，无需手动导出导入

## 配置 CookieCloud

### 1. 部署 CookieCloud 服务器

首先需要部署一个 CookieCloud 服务器。有以下几种方式：

#### 方式一：使用官方 Docker 镜像

```bash
docker run -d \
  --name cookiecloud \
  -p 8088:8088 \
  easychen/cookiecloud:latest
```

#### 方式二：使用 Vercel 部署

1. Fork [CookieCloud 仓库](https://github.com/easychen/CookieCloud)
2. 在 Vercel 中导入项目
3. 部署完成后获得服务器地址

### 2. 安装浏览器扩展

在 Chrome、Firefox 或 Edge 浏览器中安装 CookieCloud 扩展：

- [Chrome Web Store](https://chrome.google.com/webstore/detail/cookiecloud/...)
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/cookiecloud/)
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cookiecloud/...)

### 3. 配置扩展

1. 打开浏览器扩展，点击"设置"
2. 填写以下信息：
   - **服务器地址**：你的 CookieCloud 服务器地址（如：`https://your-server.com`）
   - **用户 KEY（UUID）**：自动生成或手动输入一个唯一标识符
   - **端对端加密密码**：设置一个强密码，用于加密你的 cookies
3. 点击"保存"并"立即同步"

### 4. 验证配置

访问 `http://你的服务器地址/get/你的UUID`，如果返回加密数据，说明配置成功。

## 使用方式

### CLI 命令行使用

目前 CLI 不直接支持传入 CookieCloud 配置，建议通过环境变量或配置文件的方式使用。

**通过环境变量**（需要在代码中添加支持）：

```bash
export COOKIECLOUD_SERVER="https://your-server.com"
export COOKIECLOUD_UUID="your-uuid"
export COOKIECLOUD_PASSWORD="your-password"

google-search "playwright typescript"
```

### 编程方式使用

在 Node.js 或 TypeScript 项目中使用：

#### 基本使用

```typescript
import { googleSearch } from '@hangox/google-search';

const results = await googleSearch('playwright typescript', {
  limit: 10,
  timeout: 60000,
  cookieCloud: {
    server: 'https://your-server.com',
    uuid: 'your-uuid',
    password: 'your-password'
  }
});

console.log(results);
```

#### 获取 HTML 页面

```typescript
import { getGoogleSearchPageHtml } from '@hangox/google-search';

const htmlResponse = await getGoogleSearchPageHtml('playwright typescript', {
  timeout: 60000,
  cookieCloud: {
    server: 'https://your-server.com',
    uuid: 'your-uuid',
    password: 'your-password'
  }
}, true, './output.html');

console.log('HTML saved to:', htmlResponse.savedPath);
console.log('Screenshot saved to:', htmlResponse.screenshotPath);
```

#### 使用配置文件

创建配置文件 `config.json`：

```json
{
  "cookieCloud": {
    "server": "https://your-server.com",
    "uuid": "your-uuid",
    "password": "your-password"
  }
}
```

在代码中读取配置：

```typescript
import { googleSearch } from '@hangox/google-search';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const results = await googleSearch('playwright typescript', {
  limit: 10,
  ...config
});
```

### MCP 服务器使用

在 MCP 服务器配置中添加 CookieCloud 环境变量：

编辑 `~/.claude.json` 或项目的 MCP 配置文件：

```json
{
  "mcpServers": {
    "google-search": {
      "command": "google-search-mcp",
      "env": {
        "COOKIECLOUD_SERVER": "https://your-server.com",
        "COOKIECLOUD_UUID": "your-uuid",
        "COOKIECLOUD_PASSWORD": "your-password"
      }
    }
  }
}
```

然后在 MCP 服务器代码中读取这些环境变量并传递给搜索函数。

## 工作原理

### 数据流程

1. **Cookie 同步**：
   - 浏览器扩展定期从浏览器读取 cookies
   - 使用 AES-256 加密 cookies 数据
   - 上传加密数据到 CookieCloud 服务器

2. **Cookie 获取**：
   - Google Search 工具向 CookieCloud 服务器发送请求
   - 获取加密的 cookies 数据
   - 使用 MD5(UUID-密码) 的前 16 位作为密钥解密
   - 将解密后的 cookies 注入到 Playwright 浏览器上下文

3. **Cookie 注入**：
   - 在创建浏览器上下文后、访问 Google 页面前注入
   - 只注入与 `google.com` 域名相关的 cookies
   - 自动处理 cookies 的各种属性（httpOnly、secure、sameSite 等）

### 加密机制

CookieCloud 使用端对端加密：

- **加密算法**：AES-256
- **密钥生成**：`MD5(UUID + '-' + 密码).substring(0, 16)`
- **数据格式**：加密后的 JSON 对象

这意味着即使服务器被攻破，没有你的 UUID 和密码，数据也无法被解密。

### 域名过滤

为了安全和性能，工具只会注入与目标域名相关的 cookies：

```typescript
// 只获取 google.com 相关的 cookies
const cloudCookies = await getCookiesFromCloud(
  cookieCloudConfig,
  "google.com"
);
```

这确保了：
- 不会泄露其他网站的 cookies
- 减少不必要的数据传输
- 提高性能

## 故障排查

### 1. CookieCloud 服务器无法访问

**错误信息**：
```
CookieCloud服务器响应错误: 500 Internal Server Error
```

**解决方法**：
- 检查服务器地址是否正确
- 确认服务器是否正常运行
- 检查网络连接和防火墙设置

### 2. UUID 或密码错误

**错误信息**：
```
CookieCloud解密失败，请检查UUID和密码是否正确
```

**解决方法**：
- 确认 UUID 和密码与浏览器扩展中的配置一致
- 注意密码区分大小写
- 重新生成 UUID 并在两端同步配置

### 3. 没有获取到 Cookies

**日志信息**：
```
CookieCloud未返回任何Google相关的cookies
```

**可能原因**：
- 浏览器扩展未同步 cookies
- 你的浏览器中没有 Google 相关的 cookies
- 域名过滤规则不匹配

**解决方法**：
- 在浏览器中访问 Google 并登录
- 在扩展中点击"立即同步"
- 检查扩展同步日志
- 确认 CookieCloud 服务器中有数据

### 4. Cookies 注入失败

**错误信息**：
```
从CookieCloud获取cookies失败，将继续使用本地状态
```

**处理方式**：
工具会自动降级到使用本地浏览器状态，不会中断搜索过程。你可以：
- 检查完整的错误日志
- 修复配置后重试
- 或者不使用 CookieCloud，依赖本地状态文件

### 5. 调试模式

启用详细日志以排查问题：

```typescript
import logger from '@hangox/google-search/dist/logger';

// 设置日志级别为 debug
logger.level = 'debug';

const results = await googleSearch('test', {
  cookieCloud: { /* ... */ }
});
```

查看日志输出：
- `检测到CookieCloud配置，正在从云端获取cookies...`
- `从CookieCloud获取到 X 个cookies`
- `成功从CookieCloud注入cookies`

## 安全建议

1. **保护你的配置信息**：
   - 不要将 UUID 和密码提交到版本控制系统
   - 使用环境变量或配置文件管理敏感信息
   - 定期更换密码

2. **使用强密码**：
   - 密码长度至少 16 位
   - 包含大小写字母、数字和特殊字符
   - 不要使用常见密码

3. **自建服务器**：
   - 建议使用自己的服务器而不是公共服务
   - 启用 HTTPS
   - 定期备份数据

4. **限制访问**：
   - 只在可信的环境中使用
   - 不要在公共代码中硬编码配置
   - 定期检查 CookieCloud 服务器访问日志

## 参考资料

- [CookieCloud 官方仓库](https://github.com/easychen/CookieCloud)
- [CookieCloud 文档](https://github.com/easychen/CookieCloud/blob/master/README.md)
- [Google Search 工具文档](../README.md)
- [Playwright Cookies API](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies)

## 常见问题

**Q: CookieCloud 是否会上传我的所有 cookies？**

A: 是的，但数据是端对端加密的。在 Google Search 工具中使用时，只会注入 Google 相关的 cookies。

**Q: 我可以不使用 CookieCloud 吗？**

A: 当然可以。CookieCloud 是可选功能。不配置的话，工具会使用本地浏览器状态文件。

**Q: CookieCloud 配置错误会影响搜索吗？**

A: 不会。如果 CookieCloud 配置错误或获取失败，工具会自动降级到使用本地状态，继续执行搜索。

**Q: 多久需要同步一次 cookies？**

A: 浏览器扩展会自动定时同步。你也可以手动点击"立即同步"。建议每天至少同步一次。

**Q: 可以在多个项目中共享 CookieCloud 配置吗？**

A: 可以。只要使用相同的服务器地址、UUID 和密码，就可以在多个项目中共享 cookies。

---

如有其他问题，欢迎提交 [Issue](https://github.com/hangox/google-search/issues)。
