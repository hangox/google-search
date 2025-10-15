import CryptoJS from 'crypto-js';
import { CookieCloudConfig } from './types.js';
import logger from './logger.js';

/**
 * CookieCloud返回的数据结构
 */
interface CookieCloudResponse {
  encrypted?: string;
  [key: string]: any;
}

/**
 * 解密后的数据结构
 */
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

/**
 * Playwright Cookie格式
 */
export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

/**
 * 解密CookieCloud加密数据
 * @param uuid 用户KEY·UUID
 * @param encrypted 加密的数据
 * @param password 端对端加密密码
 * @returns 解密后的数据
 */
function cookieDecrypt(uuid: string, encrypted: string, password: string): DecryptedData {
  try {
    // 生成解密密钥：MD5(uuid-password)的前16位
    const theKey = CryptoJS.MD5(uuid + '-' + password).toString().substring(0, 16);

    // 使用AES解密
    const decrypted = CryptoJS.AES.decrypt(encrypted, theKey).toString(CryptoJS.enc.Utf8);

    // 解析JSON
    const parsed = JSON.parse(decrypted);
    return parsed;
  } catch (error) {
    logger.error({ error }, 'CookieCloud解密失败');
    throw new Error('CookieCloud解密失败，请检查UUID和密码是否正确');
  }
}

/**
 * 从CookieCloud获取Cookies
 * @param config CookieCloud配置
 * @param targetDomain 目标域名（可选），如果指定则只返回该域名的cookies
 * @returns Playwright格式的cookies数组
 */
export async function getCookiesFromCloud(
  config: CookieCloudConfig,
  targetDomain?: string
): Promise<PlaywrightCookie[]> {
  const { server, uuid, password } = config;

  // 验证配置
  if (!server || !uuid || !password) {
    throw new Error('CookieCloud配置不完整，需要提供server、uuid和password');
  }

  try {
    // 构建请求URL
    const url = `${server}/get/${uuid}`;
    logger.info(`从CookieCloud获取cookies: ${url}`);

    // 发起请求
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CookieCloud服务器响应错误: ${response.status} ${response.statusText}`);
    }

    const json: CookieCloudResponse = await response.json();

    // 检查是否有加密数据
    if (!json || !json.encrypted) {
      throw new Error('CookieCloud返回数据为空或没有加密数据');
    }

    // 解密数据
    const { cookie_data } = cookieDecrypt(uuid, json.encrypted, password);

    // 转换为Playwright格式的cookies
    let cookies: PlaywrightCookie[] = [];

    for (const domain in cookie_data) {
      // 如果指定了目标域名，只处理匹配的域名
      if (targetDomain && !domain.includes(targetDomain)) {
        continue;
      }

      const domainCookies = cookie_data[domain].map(item => {
        // 处理sameSite字段，unspecified转为Lax
        let sameSite: 'Strict' | 'Lax' | 'None' = 'Lax';
        if (item.sameSite === 'strict') {
          sameSite = 'Strict';
        } else if (item.sameSite === 'none') {
          sameSite = 'None';
        } else {
          sameSite = 'Lax'; // unspecified 或其他值都转为 Lax
        }

        return {
          name: item.name,
          value: item.value,
          domain: item.domain,
          path: item.path,
          expires: item.expires,
          httpOnly: item.httpOnly,
          secure: item.secure,
          sameSite,
        };
      });

      cookies = cookies.concat(domainCookies);
    }

    logger.info(`从CookieCloud获取到 ${cookies.length} 个cookies`);
    if (targetDomain) {
      logger.info(`过滤后目标域名 ${targetDomain} 的cookies: ${cookies.length} 个`);
    }

    return cookies;
  } catch (error) {
    logger.error({ error }, '从CookieCloud获取cookies失败');
    throw error;
  }
}

/**
 * 检查CookieCloud配置是否有效
 * @param config CookieCloud配置
 * @returns 配置是否有效
 */
export function isValidCookieCloudConfig(config?: CookieCloudConfig): boolean {
  return !!(config && config.server && config.uuid && config.password);
}
