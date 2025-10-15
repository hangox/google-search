# 如何对接 CookieCloud

本文档介绍如何在任意项目中对接 [CookieCloud](https://github.com/easychen/CookieCloud)，实现从云端获取和使用浏览器 cookies。

## 目录

- [CookieCloud 简介](#cookiecloud-简介)
- [对接前准备](#对接前准备)
- [实现步骤](#实现步骤)
- [完整代码示例](#完整代码示例)
- [注意事项](#注意事项)
- [测试验证](#测试验证)

## CookieCloud 简介

CookieCloud 是一个用于同步浏览器 Cookie 和 LocalStorage 的工具，特点：

- **端对端加密**：使用 AES 加密，服务器无法读取原始数据
- **自动同步**：浏览器插件定时自动同步
- **跨设备**：支持多设备间同步 cookies
- **自托管**：可以部署自己的服务器

## 对接前准备

### 1. 需要的配置信息

对接 CookieCloud 需要三个配置项：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `server` | CookieCloud 服务器地址 | `https://your-server.com` |
| `uuid` | 用户唯一标识符（在浏览器插件中生成） | `your-uuid-here` |
| `password` | 端对端加密密码 | `your-password-here` |

### 2. 理解 API 接口

CookieCloud 只有一个获取接口：

```
GET {server}/get/{uuid}
```

**响应格式**：
```json
{
  "encrypted": "U2FsdGVkX1+xxx...",  // AES 加密后的数据
  "update_at": "2025-01-15 10:30:00"
}
```

### 3. 理解加密方案

**密钥生成**：
```
key = MD5(uuid + '-' + password).substring(0, 16)
```

**加密算法**：AES

**编码方式**：UTF-8

**解密后的数据结构**：
```json
{
  "cookie_data": {
    "domain1.com": [
      {
        "name": "cookie_name",
        "value": "cookie_value",
        "domain": ".domain1.com",
        "path": "/",
        "expires": 1234567890,
        "httpOnly": true,
        "secure": true,
        "sameSite": "Lax"
      }
    ],
    "domain2.com": [...]
  },
  "local_storage_data": {
    "domain1.com": {
      "key1": "value1"
    }
  }
}
```

## 实现步骤

### 步骤 1: 安装加密库

**Node.js / TypeScript 项目**：

```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

**Python 项目**：

```bash
pip install pycryptodome
```

**Go 项目**：

```go
import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/md5"
)
```

### 步骤 2: 实现解密函数

**TypeScript 实现**：

```typescript
import CryptoJS from 'crypto-js';

interface DecryptedData {
  cookie_data: {
    [domain: string]: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
    }>;
  };
  local_storage_data?: any;
}

function decryptCookieCloud(
  uuid: string,
  encrypted: string,
  password: string
): DecryptedData {
  // 生成解密密钥：MD5(uuid-password) 的前 16 位
  const key = CryptoJS.MD5(uuid + '-' + password).toString().substring(0, 16);

  // 使用 AES 解密
  const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);

  // 解析 JSON
  return JSON.parse(decrypted);
}
```

**Python 实现**：

```python
import hashlib
import json
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64

def decrypt_cookie_cloud(uuid: str, encrypted: str, password: str) -> dict:
    # 生成密钥
    key_string = f"{uuid}-{password}"
    key = hashlib.md5(key_string.encode()).hexdigest()[:16].encode()

    # Base64 解码
    encrypted_bytes = base64.b64decode(encrypted)

    # 提取 IV（前 16 字节）
    iv = encrypted_bytes[:16]
    ciphertext = encrypted_bytes[16:]

    # AES 解密
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)

    # 解析 JSON
    return json.loads(decrypted.decode('utf-8'))
```

**Go 实现**：

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/md5"
    "encoding/base64"
    "encoding/json"
    "fmt"
)

type CookieData struct {
    CookieData map[string][]Cookie `json:"cookie_data"`
    LocalStorageData map[string]interface{} `json:"local_storage_data"`
}

type Cookie struct {
    Name     string `json:"name"`
    Value    string `json:"value"`
    Domain   string `json:"domain"`
    Path     string `json:"path"`
    Expires  int64  `json:"expires"`
    HttpOnly bool   `json:"httpOnly"`
    Secure   bool   `json:"secure"`
    SameSite string `json:"sameSite"`
}

func decryptCookieCloud(uuid, encrypted, password string) (*CookieData, error) {
    // 生成密钥
    keyString := uuid + "-" + password
    hash := md5.Sum([]byte(keyString))
    key := hash[:16]

    // Base64 解码
    encryptedBytes, err := base64.StdEncoding.DecodeString(encrypted)
    if err != nil {
        return nil, err
    }

    // 创建 AES cipher
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    // 提取 IV 和密文
    iv := encryptedBytes[:aes.BlockSize]
    ciphertext := encryptedBytes[aes.BlockSize:]

    // CBC 模式解密
    mode := cipher.NewCBCDecrypter(block, iv)
    mode.CryptBlocks(ciphertext, ciphertext)

    // 去除 padding
    ciphertext = unpadPKCS7(ciphertext)

    // 解析 JSON
    var data CookieData
    err = json.Unmarshal(ciphertext, &data)
    return &data, err
}
```

### 步骤 3: 实现获取函数

**TypeScript 实现**：

```typescript
async function getCookiesFromCloud(
  server: string,
  uuid: string,
  password: string,
  targetDomain?: string
): Promise<Cookie[]> {
  // 构建请求 URL
  const url = `${server}/get/${uuid}`;

  // 发起请求
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`服务器响应错误: ${response.status}`);
  }

  const json = await response.json();
  if (!json || !json.encrypted) {
    throw new Error('未获取到加密数据');
  }

  // 解密数据
  const { cookie_data } = decryptCookieCloud(uuid, json.encrypted, password);

  // 提取 cookies
  let cookies: Cookie[] = [];
  for (const domain in cookie_data) {
    // 如果指定了目标域名，只返回匹配的
    if (targetDomain && !domain.includes(targetDomain)) {
      continue;
    }
    cookies = cookies.concat(cookie_data[domain]);
  }

  return cookies;
}
```

**Python 实现**：

```python
import requests
from typing import List, Dict, Optional

def get_cookies_from_cloud(
    server: str,
    uuid: str,
    password: str,
    target_domain: Optional[str] = None
) -> List[Dict]:
    # 构建请求 URL
    url = f"{server}/get/{uuid}"

    # 发起请求
    response = requests.get(url)
    response.raise_for_status()

    json_data = response.json()
    if not json_data or 'encrypted' not in json_data:
        raise ValueError('未获取到加密数据')

    # 解密数据
    decrypted = decrypt_cookie_cloud(uuid, json_data['encrypted'], password)
    cookie_data = decrypted['cookie_data']

    # 提取 cookies
    cookies = []
    for domain, domain_cookies in cookie_data.items():
        # 如果指定了目标域名，只返回匹配的
        if target_domain and target_domain not in domain:
            continue
        cookies.extend(domain_cookies)

    return cookies
```

### 步骤 4: 处理 Cookie 格式

不同的自动化工具对 cookie 格式有不同要求，需要进行转换：

**Playwright 格式**：

```typescript
interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

function convertToPlaywrightFormat(cloudCookie: any): PlaywrightCookie {
  return {
    name: cloudCookie.name,
    value: cloudCookie.value,
    domain: cloudCookie.domain,
    path: cloudCookie.path,
    expires: cloudCookie.expires,
    httpOnly: cloudCookie.httpOnly,
    secure: cloudCookie.secure,
    sameSite: cloudCookie.sameSite === 'unspecified' ? 'Lax' : cloudCookie.sameSite,
  };
}
```

**Selenium 格式**：

```python
def convert_to_selenium_format(cloud_cookie: dict) -> dict:
    return {
        'name': cloud_cookie['name'],
        'value': cloud_cookie['value'],
        'domain': cloud_cookie['domain'],
        'path': cloud_cookie['path'],
        'expiry': cloud_cookie['expires'],
        'httpOnly': cloud_cookie['httpOnly'],
        'secure': cloud_cookie['secure'],
        'sameSite': 'Lax' if cloud_cookie['sameSite'] == 'unspecified' else cloud_cookie['sameSite']
    }
```

**Puppeteer 格式**：

```typescript
interface PuppeteerCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

function convertToPuppeteerFormat(cloudCookie: any): PuppeteerCookie {
  return {
    name: cloudCookie.name,
    value: cloudCookie.value,
    domain: cloudCookie.domain,
    path: cloudCookie.path,
    expires: cloudCookie.expires,
    httpOnly: cloudCookie.httpOnly,
    secure: cloudCookie.secure,
    sameSite: cloudCookie.sameSite === 'unspecified' ? 'Lax' : cloudCookie.sameSite,
  };
}
```

### 步骤 5: 注入 Cookies

**Playwright 示例**：

```typescript
import { chromium } from 'playwright';

async function searchWithCookies() {
  // 启动浏览器
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // 获取并注入 cookies
  const cookies = await getCookiesFromCloud(
    'https://your-server.com',
    'your-uuid',
    'your-password',
    'google.com'
  );

  const playwrightCookies = cookies.map(convertToPlaywrightFormat);
  await context.addCookies(playwrightCookies);

  // 访问页面
  const page = await context.newPage();
  await page.goto('https://www.google.com');

  // ... 执行操作

  await browser.close();
}
```

**Selenium 示例**：

```python
from selenium import webdriver

def search_with_cookies():
    # 启动浏览器
    driver = webdriver.Chrome()

    # 先访问域名（Selenium 要求）
    driver.get('https://www.google.com')

    # 获取并注入 cookies
    cookies = get_cookies_from_cloud(
        'https://your-server.com',
        'your-uuid',
        'your-password',
        'google.com'
    )

    for cookie in cookies:
        selenium_cookie = convert_to_selenium_format(cookie)
        driver.add_cookie(selenium_cookie)

    # 刷新页面以应用 cookies
    driver.refresh()

    # ... 执行操作

    driver.quit()
```

**Puppeteer 示例**：

```javascript
const puppeteer = require('puppeteer');

async function searchWithCookies() {
  // 启动浏览器
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 获取并注入 cookies
  const cookies = await getCookiesFromCloud(
    'https://your-server.com',
    'your-uuid',
    'your-password',
    'google.com'
  );

  const puppeteerCookies = cookies.map(convertToPuppeteerFormat);
  await page.setCookie(...puppeteerCookies);

  // 访问页面
  await page.goto('https://www.google.com');

  // ... 执行操作

  await browser.close();
}
```

## 完整代码示例

### TypeScript 完整实现

```typescript
import CryptoJS from 'crypto-js';

// 类型定义
interface CookieCloudConfig {
  server: string;
  uuid: string;
  password: string;
}

interface CloudCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

interface DecryptedData {
  cookie_data: {
    [domain: string]: CloudCookie[];
  };
  local_storage_data?: any;
}

// 解密函数
function decryptCookieCloud(
  uuid: string,
  encrypted: string,
  password: string
): DecryptedData {
  try {
    const key = CryptoJS.MD5(uuid + '-' + password).toString().substring(0, 16);
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('解密失败，请检查 UUID 和密码是否正确');
  }
}

// 获取 Cookies
export async function getCookiesFromCloud(
  config: CookieCloudConfig,
  targetDomain?: string
): Promise<CloudCookie[]> {
  const { server, uuid, password } = config;

  // 构建请求 URL
  const url = `${server}/get/${uuid}`;

  // 发起请求
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (!json || !json.encrypted) {
    throw new Error('未获取到加密数据');
  }

  // 解密数据
  const { cookie_data } = decryptCookieCloud(uuid, json.encrypted, password);

  // 提取并过滤 cookies
  let cookies: CloudCookie[] = [];
  for (const domain in cookie_data) {
    if (targetDomain && !domain.includes(targetDomain)) {
      continue;
    }
    cookies = cookies.concat(cookie_data[domain]);
  }

  return cookies;
}

// 验证配置
export function isValidConfig(config: CookieCloudConfig): boolean {
  return !!(config && config.server && config.uuid && config.password);
}
```

### Python 完整实现

```python
import hashlib
import json
import base64
import requests
from typing import List, Dict, Optional
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

class CookieCloudClient:
    def __init__(self, server: str, uuid: str, password: str):
        self.server = server
        self.uuid = uuid
        self.password = password

    def _decrypt(self, encrypted: str) -> dict:
        """解密 CookieCloud 数据"""
        try:
            # 生成密钥
            key_string = f"{self.uuid}-{self.password}"
            key = hashlib.md5(key_string.encode()).hexdigest()[:16].encode()

            # Base64 解码
            encrypted_bytes = base64.b64decode(encrypted)

            # 提取 IV 和密文
            iv = encrypted_bytes[:16]
            ciphertext = encrypted_bytes[16:]

            # AES 解密
            cipher = AES.new(key, AES.MODE_CBC, iv)
            decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)

            return json.loads(decrypted.decode('utf-8'))
        except Exception as e:
            raise ValueError(f'解密失败: {e}')

    def get_cookies(self, target_domain: Optional[str] = None) -> List[Dict]:
        """获取 cookies"""
        # 构建请求 URL
        url = f"{self.server}/get/{self.uuid}"

        # 发起请求
        response = requests.get(url)
        response.raise_for_status()

        json_data = response.json()
        if not json_data or 'encrypted' not in json_data:
            raise ValueError('未获取到加密数据')

        # 解密数据
        decrypted = self._decrypt(json_data['encrypted'])
        cookie_data = decrypted['cookie_data']

        # 提取并过滤 cookies
        cookies = []
        for domain, domain_cookies in cookie_data.items():
            if target_domain and target_domain not in domain:
                continue
            cookies.extend(domain_cookies)

        return cookies

    @staticmethod
    def is_valid_config(server: str, uuid: str, password: str) -> bool:
        """验证配置是否有效"""
        return bool(server and uuid and password)

# 使用示例
if __name__ == '__main__':
    client = CookieCloudClient(
        server='https://your-server.com',
        uuid='your-uuid',
        password='your-password'
    )

    cookies = client.get_cookies(target_domain='google.com')
    print(f'获取到 {len(cookies)} 个 cookies')
```

## 注意事项

### 1. 安全性

- ✅ **使用 HTTPS**：确保 CookieCloud 服务器使用 HTTPS
- ✅ **保护配置**：不要将 UUID 和 password 硬编码在代码中
- ✅ **使用环境变量**：通过环境变量或配置文件管理敏感信息
- ✅ **域名过滤**：只获取需要的域名 cookies，避免泄露

### 2. 错误处理

建议实现优雅的错误处理机制：

```typescript
async function getCookiesSafely(config: CookieCloudConfig): Promise<CloudCookie[]> {
  try {
    return await getCookiesFromCloud(config);
  } catch (error) {
    console.error('获取 CookieCloud cookies 失败:', error);
    // 返回空数组，让程序继续执行
    return [];
  }
}
```

### 3. 性能优化

- 缓存 cookies：避免频繁请求
- 设置超时：防止请求hang住
- 并发控制：限制同时请求数量

```typescript
// 带缓存的实现
class CookieCloudCache {
  private cache: Map<string, { cookies: CloudCookie[], timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5分钟

  async getCookies(config: CookieCloudConfig, domain?: string): Promise<CloudCookie[]> {
    const cacheKey = `${config.uuid}-${domain || 'all'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.cookies;
    }

    const cookies = await getCookiesFromCloud(config, domain);
    this.cache.set(cacheKey, { cookies, timestamp: Date.now() });
    return cookies;
  }
}
```

### 4. sameSite 属性处理

CookieCloud 中的 `sameSite` 值可能是 `unspecified`，需要转换：

```typescript
function normalizeSameSite(sameSite: string): 'Strict' | 'Lax' | 'None' {
  const normalized = sameSite.toLowerCase();
  if (normalized === 'strict') return 'Strict';
  if (normalized === 'none') return 'None';
  return 'Lax'; // 默认值，包括 'unspecified'
}
```

## 测试验证

### 1. 验证配置

```bash
# 直接访问 API 测试
curl https://your-server.com/get/your-uuid
```

应该返回类似：
```json
{
  "encrypted": "U2FsdGVkX1+xxx...",
  "update_at": "2025-01-15 10:30:00"
}
```

### 2. 测试解密

编写单元测试验证解密功能：

```typescript
describe('CookieCloud', () => {
  it('should decrypt correctly', () => {
    const uuid = 'test-uuid';
    const password = 'test-password';
    const encrypted = 'xxx'; // 从实际 API 获取

    const result = decryptCookieCloud(uuid, encrypted, password);
    expect(result).toHaveProperty('cookie_data');
  });
});
```

### 3. 端到端测试

```typescript
async function testCookieInjection() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  // 注入 cookies
  const cookies = await getCookiesFromCloud({
    server: 'https://your-server.com',
    uuid: 'your-uuid',
    password: 'your-password'
  }, 'google.com');

  await context.addCookies(cookies.map(convertToPlaywrightFormat));

  // 访问页面验证
  const page = await context.newPage();
  await page.goto('https://www.google.com');

  // 检查是否已登录
  const isLoggedIn = await page.locator('[aria-label*="Account"]').isVisible();
  console.log('Is logged in:', isLoggedIn);

  await browser.close();
}
```

## 参考资料

- [CookieCloud 官方仓库](https://github.com/easychen/CookieCloud)
- [Playwright Cookies API](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies)
- [Selenium Cookies API](https://www.selenium.dev/documentation/webdriver/interactions/cookies/)
- [Puppeteer Cookies API](https://pptr.dev/api/puppeteer.page.setcookie)

---

**更新日期**: 2025-01-15
