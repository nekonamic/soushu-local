import type { CachedNovel } from '@/data/novels'
import { novelCacheManager } from './novelCacheManager'

export interface FetchProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FetchOptions {
  onProgress?: (progress: FetchProgress) => void
  timeout?: number
  retries?: number
}

export interface UrlValidationError {
  type: 'cors' | 'network' | 'server' | 'timeout' | 'unknown'
  message: string
  originalError?: any
}

export interface CustomJsonConfig {
  titlePath?: string
  contentPath?: string
  authorPath?: string
}

export interface CustomJsonPreview {
  title: string
  author: string
  contentLength: number
  contentPreview: string
}

class NovelFetcher {
  private readonly DEFAULT_TIMEOUT = 30000 // 30秒
  private readonly MAX_RETRIES = 3
  private readonly CHUNK_SIZE = 1024 * 1024 // 1MB

  // 从URL获取小说内容
  async fetchNovelFromUrl(
    url: string,
    options: FetchOptions = {}
  ): Promise<{ content: string; title: string; author: string; fileSize: string }> {
    const { timeout = this.DEFAULT_TIMEOUT, retries = this.MAX_RETRIES, onProgress } = options

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`尝试获取URL小说 (${attempt}/${retries}):`, url)

        // 首先检查URL有效性
        const isValid = await this.checkUrlValidity(url, timeout)
        if (isValid !== true) {
          const errorInfo = isValid as UrlValidationError
          throw new Error(`${errorInfo.message} (${errorInfo.type})`)
        }

        // 获取文件内容
        const content = await this.fetchContent(url, { timeout, onProgress })

        // 提取小说信息
        const { title, author } = this.extractNovelInfo(content, url)
        const fileSize = this.formatFileSize(content.length)

        console.log(`成功获取小说: ${title}, 大小: ${fileSize}`)

        return {
          content,
          title,
          author,
          fileSize
        }
      } catch (error) {
        console.warn(`第${attempt}次尝试失败:`, error)
        if (attempt === retries) {
          throw new Error(`获取小说失败: ${error}`)
        }
        // 等待一段时间后重试
        await this.delay(1000 * attempt)
      }
    }

    throw new Error('获取小说失败：超过最大重试次数')
  }

  // 检查URL有效性
  private async checkUrlValidity(url: string, timeout: number): Promise<boolean | UrlValidationError> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      console.log('检查URL有效性:', url)
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      })

      clearTimeout(timeoutId)
      console.log('HEAD请求成功:', response.status, response.statusText)

      if (!response.ok) {
        return {
          type: 'server',
          message: `服务器返回错误状态: ${response.status} ${response.statusText}`,
          originalError: new Error(`HTTP ${response.status}`)
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text')) {
        return {
          type: 'server',
          message: `URL指向的不是文本文件，内容类型: ${contentType || '未知'}`,
          originalError: new Error('Invalid content type')
        }
      }

      return true
    } catch (error) {
      clearTimeout(timeoutId)
      console.log('HEAD请求失败，尝试GET请求:', error)

      if (error === 'AbortError') {
        return {
          type: 'timeout',
          message: '请求超时',
          originalError: error
        }
      }

      // 如果HEAD请求失败，尝试GET请求
      try {
        const getSuccess = await this.tryGetRequest(url, timeout)
        if (getSuccess) {
          return true
        } else {
          return this.detectErrorType(error)
        }
      } catch (getError) {
        return this.detectErrorType(error)
      }
    }
  }

  // 尝试GET请求检查有效性
  private async tryGetRequest(url: string, timeout: number): Promise<boolean> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Range': 'bytes=0-1023' } // 只获取前1KB检查
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      clearTimeout(timeoutId)
      return false
    }
  }

  // 获取文件内容
  private async fetchContent(
    url: string,
    options: { timeout: number; onProgress?: (progress: FetchProgress) => void }
  ): Promise<string> {
    const { timeout, onProgress } = options
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      if (!response.body) {
        throw new Error('无法读取响应内容')
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        loaded += value.length

        // 报告进度
        if (onProgress && total > 0) {
          onProgress({
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100)
          })
        }
      }

      clearTimeout(timeoutId)

      // 合并所有块
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const combinedArray = new Uint8Array(totalLength)
      let offset = 0

      for (const chunk of chunks) {
        combinedArray.set(chunk, offset)
        offset += chunk.length
      }

      // 尝试解码内容
      return this.decodeContent(combinedArray)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('下载超时')
      }
      throw error
    }
  }

  // 解码内容（处理不同编码）
  private decodeContent(bytes: Uint8Array): string {
    try {
      // 首先尝试UTF-8
      const decoder = new TextDecoder('utf-8', { fatal: true })
      return decoder.decode(bytes)
    } catch (error) {
      // UTF-8失败，尝试GBK
      try {
        // 简单的GBK检测和解码
        const gbkContent = this.decodeGBK(bytes)
        return gbkContent
      } catch (gbkError) {
        // 都失败，使用fallback
        const fallbackDecoder = new TextDecoder('utf-8', { fatal: false })
        return fallbackDecoder.decode(bytes)
      }
    }
  }

  // 简单的GBK解码（基础实现）
  private decodeGBK(bytes: Uint8Array): string {
    // 这里只是一个基础实现，实际项目中可能需要更复杂的GBK解码
    // 可以考虑使用第三方库如 iconv-lite
    try {
      const decoder = new TextDecoder('gbk', { fatal: false })
      return decoder.decode(bytes)
    } catch (error) {
      // 如果浏览器不支持GBK，使用ISO-8859-1作为fallback
      const decoder = new TextDecoder('iso-8859-1')
      return decoder.decode(bytes)
    }
  }

  // 提取小说信息
  private extractNovelInfo(content: string, url: string): { title: string; author: string } {
    // 从URL提取文件名作为默认标题
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1] || '未知小说novelFetcher'
    const defaultTitle = fileName.replace(/\.[^/.]+$/, '') || '未知小说未知小说novelFetcher'

    // 尝试从内容中提取标题（查找常见的标题模式）
    const titlePatterns = [
      /^.*?《(.+?)》/m, // 《标题》格式
      /^.*?书名[：:]\s*(.+?)$/m, // 书名：xxx
      /^.*?标题[：:]\s*(.+?)$/m, // 标题：xxx
      /^(.+?)\n.*第.*?章/m, // 第一行是标题，第二行是章节
    ]

    let title = defaultTitle
    let author = '未知作者'

    for (const pattern of titlePatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        title = match[1].trim()
        break
      }
    }

    // 尝试提取作者信息
    const authorPatterns = [
      /作者[：:]\s*(.+?)$/m,
      /作者[：:]\s*(.+?)\n/m,
      /著\s*(.+?)$/m,
      /编写[：:]\s*(.+?)$/m,
    ]

    for (const pattern of authorPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        author = match[1].trim()
        break
      }
    }

    // 如果标题太长，截取
    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }

    return { title, author }
  }

  // 格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 检测URL验证错误类型
  private detectErrorType(error: any): UrlValidationError {
    console.log('检测URL验证错误:', error)

    // CORS错误检测
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return {
        type: 'cors',
        message: 'CORS跨域访问被阻止。目标服务器不允许来自此域名的访问，这通常是正常的安全限制。',
        originalError: error
      }
    }

    // 网络错误
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('NetworkError')) {
      return {
        type: 'network',
        message: '网络连接错误，请检查网络连接或URL是否正确。',
        originalError: error
      }
    }

    // 超时错误
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      return {
        type: 'timeout',
        message: '请求超时，服务器响应时间过长，请稍后重试。',
        originalError: error
      }
    }

    // HTTP错误
    if (error instanceof Error && error.message.includes('HTTP错误')) {
      return {
        type: 'server',
        message: `服务器错误: ${error.message}`,
        originalError: error
      }
    }

    // 未知错误
    const errorMessage = error instanceof Error ? error.message : '无法确定错误类型'
    return {
      type: 'unknown',
      message: `未知错误: ${errorMessage}`,
      originalError: error
    }
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 处理文件上传
  async handleFileUpload(file: File): Promise<{ content: string; title: string; author: string; fileSize: string }> {
    // 验证文件类型
    // 常见文本和代码文件后缀列表
    const supportedTextExtensions = [
      // 纯文本文件
      '.txt', '.text',

      // 代码文件
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',  // JavaScript/TypeScript相关
      '.html', '.htm', '.css', '.scss', '.sass', '.less',  // 网页相关
      '.json', '.xml', '.yaml', '.yml',  // 数据格式
      '.md', '.markdown',  // Markdown文档
      '.py', '.java', '.c', '.cpp', '.h', '.hpp',  // 编程语言
      '.php', '.rb', '.go', '.rs', '.swift', '.kt',  // 更多编程语言
      '.sql', '.sh', '.bash', '.zsh', '.ps1',  // 脚本和shell
      '.csv', '.log', '.ini', '.conf', '.config'  // 配置和数据文件
    ]
    // 检查是否支持该后缀
    const isSupported = supportedTextExtensions.some(ext => file.name.endsWith(ext))

    if (!isSupported) {
      throw new Error(`不支持的文件格式。支持的文件类型：${supportedTextExtensions.join(', ')}`)
    }
    // if (!file.name.toLowerCase().endsWith('.txt')) {
    //   throw new Error('只支持TXT文件格式')
    // }

    // 验证文件大小（25MB限制）
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过25MB')
    }

    try {
      const content = await this.readFileAsText(file)
      const { title, author } = this.extractNovelInfo(content, file.name)
      const fileSize = this.formatFileSize(file.size)

      return {
        content,
        title,
        author,
        fileSize
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`文件读取失败: ${errorMessage}`)
    }
  }

  // 读取文件内容
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const result = event.target?.result
        if (typeof result === 'string') {
          resolve(result)
        } else {
          reject(new Error('文件读取结果不是文本格式'))
        }
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsText(file, 'utf-8')
    })
  }

  // 缓存从URL获取的小说
  async cacheNovelFromUrl(
    url: string,
    options: FetchOptions = {}
  ): Promise<{ cachedNovel: CachedNovel; content: string }> {
    const { content, title, author, fileSize } = await this.fetchNovelFromUrl(url, options)

    const tid = await novelCacheManager.cacheNovel({
      id: 0, // cacheNovel方法会忽略这个id并生成新的
      title,
      author,
      filePath: url, // 对于URL小说，filePath就是URL
      fileSize,
      wordCount: content.length,
      sourceUrl: url,
      sourceType: 'url',
      pathParts: ['在线资源', author || '未知作者']
    }, content)

    const finalCachedNovel: CachedNovel = {
      id: tid,
      title,
      author,
      filePath: url,
      fileSize,
      wordCount: content.length,
      sourceUrl: url,
      sourceType: 'url',
      pathParts: ['在线资源', author || '未知作者'],
      cacheSize: content.length,
      lastUpdate: new Date()
    }

    return {
      cachedNovel: finalCachedNovel,
      content
    }
  }

  // 缓存上传的小说
  async cacheUploadedNovel(file: File): Promise<{ cachedNovel: CachedNovel; content: string }> {
    const { content, title, author, fileSize } = await this.handleFileUpload(file)

    const tid = await novelCacheManager.cacheNovel({
      id: 0, // cacheNovel方法会忽略这个id并生成新的
      title,
      author,
      filePath: file.name, // 对于上传文件，filePath是文件名
      fileSize,
      wordCount: content.length,
      sourceType: 'upload',
      pathParts: ['本地上传', author || '未知作者']
    }, content)

    const finalCachedNovel: CachedNovel = {
      id: tid,
      title,
      author,
      filePath: file.name,
      fileSize,
      wordCount: content.length,
      sourceType: 'upload',
      pathParts: ['本地上传', author || '未知作者'],
      cacheSize: content.length,
      lastUpdate: new Date()
    }

    return {
      cachedNovel: finalCachedNovel,
      content
    }
  }

  // 公共方法：检查URL有效性（返回详细错误信息）
  async checkUrlValidityPublic(url: string, timeout: number = 10000): Promise<{ valid: boolean; error?: UrlValidationError }> {
    try {
      const result = await this.checkUrlValidity(url, timeout)
      if (result === true) {
        return { valid: true }
      } else {
        return { valid: false, error: result as UrlValidationError }
      }
    } catch (error) {
      return { valid: false, error: this.detectErrorType(error) }
    }
  }

  // 更新URL缓存的小说
  async updateUrlNovel(tid: number, url: string): Promise<{ content: string; updated: boolean }> {
    try {
      // 检查URL是否有效
      const isValid = await this.checkUrlValidity(url, 10000)
      if (!isValid) {
        throw new Error('URL已失效，无法更新')
      }

      // 获取新的内容
      const { content, title, author, fileSize } = await this.fetchNovelFromUrl(url)

      // 获取现有缓存
      const existing = await novelCacheManager.getCachedNovel(tid)
      if (!existing) {
        throw new Error('找不到现有缓存')
      }

      // 简单判断是否有更新（这里简化处理，因为checksum是内部生成的）
      const isUpdated = existing.novel.fileSize !== fileSize || existing.novel.wordCount !== content.length

      if (isUpdated) {
        // 更新缓存
        const updatedNovel = {
          ...existing.novel,
          title,
          author,
          fileSize,
          wordCount: content.length,
          lastUpdate: new Date(),
          cacheSize: content.length
        }

        await novelCacheManager.cacheNovel(updatedNovel, content)
      }

      return { content, updated: isUpdated }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      throw new Error(`更新失败: ${errorMessage}`)
    }
  }

  // JSON路径解析器 - 类似lodash.get()的功能
  private parseJsonPath(obj: any, path: string): any {
    if (!path || !obj) return undefined

    try {
      // 处理数组索引，如 items[0].title
      const pathParts = path.split('.')
      let current = obj

      for (const part of pathParts) {
        if (current === null || current === undefined) {
          return undefined
        }

        // 处理数组索引
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
        if (arrayMatch) {
          const propName = arrayMatch[1]
          const indexStr = arrayMatch[2]
          if (propName && indexStr) {
            const index = parseInt(indexStr, 10)
            current = current[propName]
            if (Array.isArray(current)) {
              current = current[index]
            } else {
              return undefined
            }
          } else {
            return undefined
          }
        } else {
          current = current[part]
        }
      }

      return current
    } catch (error) {
      return undefined
    }
  }

  // 智能查找值，支持多个备选路径
  private findValueByPaths(obj: any, paths: string[]): any {
    for (const path of paths) {
      const value = this.parseJsonPath(obj, path)
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }
    return undefined
  }

  // 从自定义JSON接口预览小说信息
  async previewCustomJson(url: string, config: CustomJsonConfig): Promise<CustomJsonPreview> {
    try {
      // 获取JSON数据
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
      }

      const jsonData = await response.json()

      // 定义默认的备选路径
      const defaultTitlePaths = ['title', 'name', 'filename', 'bookname', 'book_title']
      const defaultContentPaths = ['content', 'text', 'data', 'body', 'novel_content']
      const defaultAuthorPaths = ['author', 'writer', 'creator', 'auth', 'novel_author']

      // 构建查找路径列表
      const titlePaths = config.titlePath
        ? [config.titlePath, ...defaultTitlePaths]
        : defaultTitlePaths

      const contentPaths = config.contentPath
        ? [config.contentPath, ...defaultContentPaths]
        : defaultContentPaths

      const authorPaths = config.authorPath
        ? [config.authorPath, ...defaultAuthorPaths]
        : defaultAuthorPaths

      // 提取值
      const title = this.findValueByPaths(jsonData, titlePaths) || '未知小说'
      const content = this.findValueByPaths(jsonData, contentPaths)
      const author = this.findValueByPaths(jsonData, authorPaths) || '未知作者'

      // 验证必要字段
      if (!content) {
        throw new Error('无法找到小说内容，请检查内容路径配置')
      }

      // 确保内容是字符串
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content)

      // 生成预览信息
      const contentPreview = contentStr.length > 200
        ? contentStr.substring(0, 200) + '...'
        : contentStr

      return {
        title: String(title),
        author: String(author),
        contentLength: contentStr.length,
        contentPreview
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接')
      }
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      throw new Error(`预览失败: ${errorMessage}`)
    }
  }

  // 从自定义JSON接口获取并缓存小说
  async cacheNovelFromCustomUrl(
    url: string,
    config: CustomJsonConfig,
    options: FetchOptions = {}
  ): Promise<{ cachedNovel: CachedNovel; content: string }> {
    const { timeout = this.DEFAULT_TIMEOUT, onProgress } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // 开始请求
      onProgress?.({ loaded: 10, total: 100, percentage: 10 })

      // 获取JSON数据
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
      }

      onProgress?.({ loaded: 30, total: 100, percentage: 30 })

      const jsonData = await response.json()

      onProgress?.({ loaded: 50, total: 100, percentage: 50 })

      // 使用与预览相同的逻辑提取数据
      const defaultTitlePaths = ['title', 'name', 'filename', 'bookname', 'book_title']
      const defaultContentPaths = ['content', 'text', 'data', 'body', 'novel_content']
      const defaultAuthorPaths = ['author', 'writer', 'creator', 'auth', 'novel_author']

      const titlePaths = config.titlePath
        ? [config.titlePath, ...defaultTitlePaths]
        : defaultTitlePaths

      const contentPaths = config.contentPath
        ? [config.contentPath, ...defaultContentPaths]
        : defaultContentPaths

      const authorPaths = config.authorPath
        ? [config.authorPath, ...defaultAuthorPaths]
        : defaultAuthorPaths

      const title = this.findValueByPaths(jsonData, titlePaths) || '未知小说'
      const content = this.findValueByPaths(jsonData, contentPaths)
      const author = this.findValueByPaths(jsonData, authorPaths) || '未知作者'

      if (!content) {
        throw new Error('无法找到小说内容，请检查内容路径配置')
      }

      onProgress?.({ loaded: 70, total: 100, percentage: 70 })

      // 确保内容是字符串
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
      const fileSize = this.formatFileSize(contentStr.length)

      // 创建缓存小说对象
      const cachedNovel: CachedNovel = {
        id: Date.now(), // 使用时间戳作为ID
        title: String(title),
        author: String(author),
        filePath: '', // 缓存小说不需要文件路径
        sourceType: 'url',
        sourceUrl: url,
        fileSize,
        wordCount: contentStr.length,
        lastUpdate: new Date(),
        cacheSize: contentStr.length,
        pathParts: [String(title)]
      }

      onProgress?.({ loaded: 90, total: 100, percentage: 90 })

      // 缓存到本地
      await novelCacheManager.cacheNovel(cachedNovel, contentStr)

      onProgress?.({ loaded: 100, total: 100, percentage: 100 })

      return { cachedNovel, content: contentStr }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接')
      }
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      throw new Error(`获取小说失败: ${errorMessage}`)
    }
  }
}

export const novelFetcher = new NovelFetcher()