/**
 * 文件服务器URL工具
 */

/**
 * 获取文件服务器的基础URL
 * @returns 文件服务器基础URL
 */
export const getFileServerBase = (): string => {
  const fileServerBase = import.meta.env.VITE_FILE_SERVER_BASE;

  // 如果环境变量存在且不为空，使用配置的地址
  if (fileServerBase && fileServerBase.trim() !== '') {
    // 确保URL以 / 结尾
    const base = fileServerBase.trim();
    return base.endsWith('/') ? base : `${base}/`;
  }

  // 否则使用当前域名
  const currentOrigin = window.location.origin;
  return `${currentOrigin}/`;
};

/**
 * 构建完整的文件URL
 * @param path 文件路径
 * @returns 完整的文件URL
 */
export const buildFileUrl = (path: string): string => {
  const base = getFileServerBase();

  // 确保路径不以 / 开头
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  return `${base}${cleanPath}`;
};

/**
 * 检查URL是否为当前域名
 * @param url 要检查的URL
 * @returns 是否为当前域名
 */
export const isCurrentDomain = (url: string): boolean => {
  const currentOrigin = window.location.origin;
  const urlOrigin = new URL(url).origin;
  return urlOrigin === currentOrigin;
};