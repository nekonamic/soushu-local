/**
 * 路径处理工具函数
 */

export interface PathInfo {
  platform?: string
  author: string
  fullAuthorName: string
  pathParts: string[]
}

/**
 * 解析路径信息
 */
export function parsePathInfo(pathParts: string[]): PathInfo {
  let platform: string | undefined
  let author: string
  let fullAuthorName: string

  if (pathParts.length >= 3) {
    // 3层及以上：.../作者名/小说名
    platform = pathParts[0] || undefined
    author = pathParts[pathParts.length - 2] || '未知作者' // 倒数第二个是作者名
    fullAuthorName = pathParts.slice(0, -1).join(' / ') // 除最后一个外的所有目录
  } else if (pathParts.length >= 2) {
    // 2层：作者名/小说名
    platform = undefined
    author = pathParts[pathParts.length - 2] || '未知作者' // 倒数第二个是作者名
    fullAuthorName = pathParts[0] || '未知作者'
  } else {
    // 1层或其他情况
    platform = undefined
    author = '未知作者'
    fullAuthorName = '未知作者'
  }

  return {
    platform,
    author,
    fullAuthorName,
    pathParts
  }
}

/**
 * 格式化作者显示名称
 */
export function formatAuthorName(pathParts: string[]): string {
  if (pathParts.length >= 2) {
    // 直接返回倒数第二个目录名作为作者名
    return pathParts[pathParts.length - 2] || '未知作者'
  }
  return '未知作者'
}

/**
 * 格式化作者和平台显示
 */
export function formatAuthorWithPlatform(pathParts: string[]): { author: string; platform?: string } {
  const { platform, author } = parsePathInfo(pathParts)
  return { author, platform }
}

/**
 * 获取路径层级
 */
export function getPathDepth(pathParts: string[]): number {
  return pathParts.length
}

/**
 * 格式化完整的路径显示
 */
export function formatFullPath(pathParts: string[]): string {
  return pathParts.join(' / ')
}

/**
 * 判断是否包含平台信息
 */
export function hasPlatform(pathParts: string[]): boolean {
  return pathParts.length >= 3
}

/**
 * 按平台分组小说
 */
export function groupByPlatform(novels: Array<{ pathParts: string[] }>): Map<string, Array<{ pathParts: string[] }>> {
  const groups = new Map<string, Array<{ pathParts: string[] }>>()

  novels.forEach(novel => {
    const { platform } = parsePathInfo(novel.pathParts)
    const key = platform || '无平台'

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(novel)
  })

  return groups
}

/**
 * 按作者分组小说
 */
export function groupByAuthor(novels: Array<{ pathParts: string[] }>): Map<string, Array<{ pathParts: string[] }>> {
  const groups = new Map<string, Array<{ pathParts: string[] }>>()

  novels.forEach(novel => {
    const { author } = parsePathInfo(novel.pathParts)

    if (!groups.has(author)) {
      groups.set(author, [])
    }
    groups.get(author)!.push(novel)
  })

  return groups
}

/**
 * 获取平台和作者的组合名称
 */
export function getPlatformAuthorCombo(pathParts: string[]): string {
  const { platform, fullAuthorName } = parsePathInfo(pathParts)
  return platform ? `${platform} / ${fullAuthorName}` : fullAuthorName
}