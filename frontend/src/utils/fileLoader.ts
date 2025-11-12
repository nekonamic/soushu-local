import { buildFileUrl } from './fileServer'

export interface LoadChunkResult {
  content: string
  isComplete: boolean
  totalSize?: number
  loadedSize?: number
  progress?: number
}

export interface FileLoadOptions {
  chunkSize?: number
  startFrom?: number
  encoding?: string
}

class FileLoader {
  private static readonly DEFAULT_CHUNK_SIZE = 50000 // 50KB
  private static readonly MAX_FILE_SIZE_FOR_CACHE = 1024 * 1024 * 2 // 2MB

  // 缓存已加载的文件内容
  private fileCache = new Map<string, string>()
  private loadingPromises = new Map<string, Promise<string>>()

  /**
   * 加载文件的完整内容
   * @param url 文件URL（可以是相对路径）
   * @param options 加载选项
   * @returns 文件内容
   */
  async loadFile(url: string, options: FileLoadOptions = {}): Promise<string> {
    const { encoding = 'utf-8' } = options

    // 构建完整的文件URL
    const fileUrl = buildFileUrl(url)

    // 检查缓存（使用原始URL作为key）
    if (this.fileCache.has(url)) {
      return this.fileCache.get(url)!
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!
    }

    // 创建加载Promise
    const loadingPromise = this.doLoadFile(fileUrl)
    this.loadingPromises.set(url, loadingPromise)

    try {
      const content = await loadingPromise

      // 如果文件不大，缓存内容
      const fileSize = new Blob([content]).size
      if (fileSize <= FileLoader.MAX_FILE_SIZE_FOR_CACHE) {
        this.fileCache.set(url, content)
      }

      return content
    } finally {
      // 清理加载Promise
      this.loadingPromises.delete(url)
    }
  }

  /**
   * 分块加载文件内容
   * @param url 文件URL（可以是相对路径）
   * @param options 加载选项
   * @returns 加载结果
   */
  async loadFileChunk(
    url: string,
    options: FileLoadOptions = {}
  ): Promise<LoadChunkResult> {
    const {
      chunkSize = FileLoader.DEFAULT_CHUNK_SIZE,
      startFrom = 0,
      encoding = 'utf-8'
    } = options

    // 构建完整的文件URL
    const fileUrl = buildFileUrl(url)

    try {
      // 首先尝试获取文件大小
      const headResponse = await fetch(fileUrl, { method: 'HEAD' })
      if (!headResponse.ok) {
        throw new Error(`无法获取文件信息: ${fileUrl}`)
      }

      const contentLength = headResponse.headers.get('content-length')
      const totalSize = contentLength ? parseInt(contentLength, 10) : undefined

      // 检查是否已有缓存内容
      if (this.fileCache.has(url)) {
        const cachedContent = this.fileCache.get(url)!
        const endPosition = Math.min(startFrom + chunkSize, cachedContent.length)
        const chunkContent = cachedContent.substring(startFrom, endPosition)

        return {
          content: chunkContent,
          isComplete: endPosition >= cachedContent.length,
          totalSize: cachedContent.length,
          loadedSize: endPosition,
          progress: (endPosition / cachedContent.length) * 100
        }
      }

      // 使用Range请求获取文件片段
      const range = `bytes=${startFrom}-${startFrom + chunkSize - 1}`
      const response = await fetch(fileUrl, {
        headers: { Range: range }
      })

      if (!response.ok) {
        // 如果服务器不支持Range请求，回退到完整加载
        if (response.status === 416 || !response.headers.get('content-range')) {
          return this.loadFileAsChunk(url, startFrom, chunkSize)
        }
        throw new Error(`加载文件失败: ${fileUrl}`)
      }

      const content = await response.text()
      const contentRange = response.headers.get('content-range')
      const isComplete = this.isCompleteFromRange(contentRange)

      return {
        content,
        isComplete,
        totalSize,
        loadedSize: startFrom + content.length,
        progress: totalSize ? ((startFrom + content.length) / totalSize) * 100 : undefined
      }
    } catch (error) {
      console.error('加载文件块失败:', error)
      throw error
    }
  }

  /**
   * 流式加载大文件
   * @param url 文件URL（可以是相对路径）
   * @param onChunk 每个块的回调函数
   * @param options 加载选项
   */
  async loadFileStream(
    url: string,
    onChunk: (chunk: string, progress: number) => void,
    options: FileLoadOptions = {}
  ): Promise<void> {
    const { chunkSize = FileLoader.DEFAULT_CHUNK_SIZE } = options
    let currentPosition = 0
    let isComplete = false

    while (!isComplete) {
      try {
        const result = await this.loadFileChunk(url, {
          chunkSize,
          startFrom: currentPosition
        })

        onChunk(result.content, result.progress || 0)

        currentPosition += result.content.length
        isComplete = result.isComplete

        // 避免过快加载导致界面卡顿
        if (!isComplete) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      } catch (error) {
        console.error('流式加载失败:', error)
        throw error
      }
    }
  }

  /**
   * 清理缓存
   * @param url 可选，指定URL则只清理该文件的缓存
   */
  clearCache(url?: string): void {
    if (url) {
      this.fileCache.delete(url)
      this.loadingPromises.delete(url)
    } else {
      this.fileCache.clear()
      this.loadingPromises.clear()
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { count: number; size: number } {
    let totalSize = 0
    this.fileCache.forEach(content => {
      totalSize += new Blob([content]).size
    })

    return {
      count: this.fileCache.size,
      size: totalSize
    }
  }

  // 私有方法

  private async doLoadFile(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load file: ${url}`)
    }
    return response.text()
  }

  private async loadFileAsChunk(
    url: string,
    startFrom: number,
    chunkSize: number
  ): Promise<LoadChunkResult> {
    const fullContent = await this.loadFile(url)
    const endPosition = Math.min(startFrom + chunkSize, fullContent.length)
    const chunkContent = fullContent.substring(startFrom, endPosition)

    return {
      content: chunkContent,
      isComplete: endPosition >= fullContent.length,
      totalSize: fullContent.length,
      loadedSize: endPosition,
      progress: (endPosition / fullContent.length) * 100
    }
  }

  private isCompleteFromRange(contentRange: string | null): boolean {
    if (!contentRange) return false

    // 解析 Content-Range 头，例如: "bytes 0-49999/123456"
    const match = contentRange.match(/bytes \d+-\d+\/(\d+)/)
    if (!match) return false

    const totalSize = parseInt(match[1] || '0', 10)
    const currentMatch = contentRange.match(/bytes (\d+)-(\d+)\//)
    if (!currentMatch) return false

    const endByte = parseInt(currentMatch[2] || '0', 10)
    return endByte >= totalSize - 1
  }
}

// 创建单例实例
export const fileLoader = new FileLoader()

// 便捷函数
export const loadFile = (url: string, options?: FileLoadOptions) => fileLoader.loadFile(url, options)
export const loadFileChunk = (url: string, options?: FileLoadOptions) => fileLoader.loadFileChunk(url, options)
export const loadFileStream = (
  url: string,
  onChunk: (chunk: string, progress: number) => void,
  options?: FileLoadOptions
) => fileLoader.loadFileStream(url, onChunk, options)
export const clearFileCache = (url?: string) => fileLoader.clearCache(url)