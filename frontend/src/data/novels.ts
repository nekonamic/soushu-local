import type { Novel, Record, PagedResult } from '@/api/main'
import { recordCacheManager } from '@/utils/recordCacheManager'
import { buildFileUrl } from '@/utils/fileServer'

// Novel data management system

export interface NovelInfo {
  id: number
  title: string
  author: string
  filePath: string
  fileSize: string
  wordCount: number
  content?: string
  isLoaded?: boolean
  pathParts: string[]  // 新增：路径部分数组，如 ['平台', '作者名']
}

export interface CachedNovel extends NovelInfo {
  sourceUrl?: string        // 原始URL（URL来源的小说）
  cacheSize: number        // 缓存大小（字节）
  lastUpdate: Date         // 最后更新时间
  sourceType: 'local' | 'url' | 'upload'  // 来源类型
  checksum?: string        // 文件校验和，用于检测变化
}

export interface SearchResult {
  id: number
  title: string
  count: number
  author: string
}

class NovelManager {
  private novels: NovelInfo[] = []
  private isInitialized = false

  async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      let recordData: [string, string, string][]

      // 先尝试从缓存获取
      const cachedRecord = await recordCacheManager.getCachedRecord()
      if (cachedRecord) {
        console.log('使用缓存的 record.json 数据')
        recordData = cachedRecord
      } else {
        console.log('从网络获取 record.json 数据')
        // 从网络加载 record.json 文件
        const response = await fetch('/novels/record.json')
        if (!response.ok) {
          console.error('Failed to load record.json')
        }

        recordData = await response.json()
        // 缓存数据
        await recordCacheManager.cacheRecord(recordData)
      }

      // 解析记录数据，生成小说列表
      this.novels = recordData
        .filter((item): item is [string, string, string] => {
          // 过滤掉格式不正确的数据
          return Array.isArray(item) &&
                 item.length >= 3 &&
                 typeof item[0] === 'string' &&
                 typeof item[1] === 'string' &&
                 typeof item[2] === 'string' &&
                 item[0].trim() !== ''
        })
        .map((item, index) => {
          // 新格式：["路径", "大小", "字数"]
          const [filePath, size, wordCountStr] = item

          // 验证文件路径
          if (!filePath || filePath.trim() === '') {
            throw new Error(`文件路径为空或无效: ${filePath}`)
          }

          // 从文件路径提取标题（去掉扩展名）
          const pathParts = filePath.split('/').filter(part => part.trim() !== '')
          const fileName = pathParts[pathParts.length - 1]

          if (!fileName) {
            throw new Error(`无法从路径提取文件名: ${filePath}`)
          }

          const title = fileName.replace(/\.[^/.]+$/, '') || '未知标题' // 移除文件扩展名

          // 解析字数
          let wordCount = 0
          if (wordCountStr && wordCountStr.includes('字')) {
            const num = parseInt(wordCountStr.replace('字', ''))
            wordCount = isNaN(num) ? 0 : num
          }

          // 解析路径部分，支持多层目录结构
          let author = '未知作者'
          if (pathParts.length >= 2) {
            const authorName = pathParts[pathParts.length - 2]
            author = authorName || '未知作者'
          } else if (pathParts.length === 1) {
            // 1层：直接在根目录
            author = '未知作者'
          }

          return {
            id: index + 1, // 使用数组索引作为ID
            title: title.trim(),
            author: author.trim(),
            filePath: `/novels/${filePath}`,
            fileSize: size || '未知大小',
            wordCount,
            isLoaded: false,
            pathParts // 保存原始路径部分
          }
        })

      this.isInitialized = true
      console.log(`已加载 ${this.novels.length} 本小说`)
    } catch (error) {
      console.error('初始化小说管理器失败:', error)
      throw error
    }
  }

  getAllNovels(): NovelInfo[] {
    this.ensureInitialized()
    return this.novels
  }

  getNovelById(id: number): NovelInfo | undefined {
    this.ensureInitialized()
    return this.novels.find(novel => novel.id === id)
  }

  async loadNovelContent(id: number): Promise<string> {
    this.ensureInitialized()

    const novel = this.getNovelById(id)
    if (!novel) {
      throw new Error(`未找到ID为 ${id} 的小说`)
    }

    // 如果已经加载过内容，直接返回
    if (novel.content) {
      return novel.content
    }

    try {
      const fileUrl = buildFileUrl(novel.filePath)
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to load novel file: ${fileUrl}`)
      }

      const content = await response.text()
      novel.content = content
      novel.isLoaded = true

      return content
    } catch (error) {
      console.error(`加载小说内容失败: ${novel.title}`, error)
      throw error
    }
  }

  async loadNovelContentChunk(id: number, chunkSize: number = 50000): Promise<{ content: string; isComplete: boolean }> {
    this.ensureInitialized()

    const novel = this.getNovelById(id)
    if (!novel) {
      throw new Error(`未找到ID为 ${id} 的小说`)
    }

    // 如果已经加载过完整内容，返回分块
    if (novel.content) {
      const totalLength = novel.content.length
      const currentLength = Math.min(chunkSize, totalLength)
      const content = novel.content.substring(0, currentLength)
      return {
        content,
        isComplete: currentLength >= totalLength
      }
    }

    try {
      const fileUrl = buildFileUrl(novel.filePath)
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to load novel file: ${fileUrl}`)
      }

      const content = await response.text()
      novel.content = content
      novel.isLoaded = true

      const totalLength = content.length
      const currentLength = Math.min(chunkSize, totalLength)
      const chunkContent = content.substring(0, currentLength)

      return {
        content: chunkContent,
        isComplete: currentLength >= totalLength
      }
    } catch (error) {
      console.error(`加载小说内容失败: ${novel.title}`, error)
      throw error
    }
  }

  async searchNovels(keyword: string, target: 'title' | 'author' | 'both' = 'title'): Promise<SearchResult[]> {
    this.ensureInitialized()

    // 输入验证
    if (!keyword || !keyword.trim()) {
      return []
    }

    const trimmedKeyword = keyword.trim()
    const lowerKeyword = trimmedKeyword.toLowerCase()
    const results: SearchResult[] = []

    try {
      for (const novel of this.novels) {
        // 验证小说数据完整性
        if (!novel || novel.id === undefined || !novel.title) {
          console.warn('跳过无效的小说数据:', novel)
          continue
        }

        let matchScore = 0
        let contentLength = 0

        // 搜索标题
        if (target === 'title' || target === 'both') {
          if (novel.title && novel.title.toLowerCase().includes(lowerKeyword)) {
            matchScore += 10
          }
        }

        // 搜索作者
        if (target === 'author' || target === 'both') {
          if (novel.author && novel.author.toLowerCase().includes(lowerKeyword)) {
            matchScore += 8 // 作者匹配分数略低于标题匹配
            contentLength = novel.wordCount > 0 ? novel.wordCount : 0
          }
        }

        // 只有匹配分数大于0才添加到结果中
        if (matchScore > 0) {
          results.push({
            author: novel?.author,
            id: novel.id,
            title: novel.title,
            count: contentLength || novel.wordCount
          })
        }
      }

      // 按匹配分数排序（标题匹配优先）
      return results.sort((a, b) => {
        const novelA = this.novels.find(n => n.id === a.id)
        const novelB = this.novels.find(n => n.id === b.id)

        if (!novelA || !novelB) {
          console.warn('排序时找不到小说数据:', { a: a.id, b: b.id })
          return 0
        }

        const scoreA = this.getMatchScore(novelA, lowerKeyword, target)
        const scoreB = this.getMatchScore(novelB, lowerKeyword, target)
        return scoreB - scoreA
      })

    } catch (error) {
      console.error('搜索过程中发生错误:', error)
      throw new Error('搜索失败，请稍后重试')
    }
  }

  // 判断是否为小文件（小于2MB）
  private isSmallFile(fileSize: string): boolean {
    if (!fileSize) {
      return false
    }

    const sizeStr = fileSize.toUpperCase().trim()
    if (sizeStr.includes('MB')) {
      const sizeNum = parseFloat(sizeStr.replace('MB', '').trim())
      return !isNaN(sizeNum) && sizeNum < 2
    } else if (sizeStr.includes('KB')) {
      const sizeNum = parseFloat(sizeStr.replace('KB', '').trim())
      return !isNaN(sizeNum) && sizeNum > 0
    } else if (sizeStr.includes('B')) {
      const sizeNum = parseFloat(sizeStr.replace('B', '').trim())
      return !isNaN(sizeNum) && sizeNum < 2 * 1024 * 1024 // 2MB
    }
    return false
  }

  // 计算匹配分数
  private getMatchScore(novel: NovelInfo, keyword: string, target: 'title' | 'author' | 'both'): number {
    let score = 0

    // 输入验证
    if (!novel || !keyword || typeof keyword !== 'string') {
      return score
    }

    const lowerKeyword = keyword.toLowerCase().trim()
    if (!lowerKeyword) {
      return score
    }

    // 标题匹配分数
    if (target === 'title' || target === 'both') {
      if (novel.title && typeof novel.title === 'string') {
        const titleLower = novel.title.toLowerCase()
        if (titleLower.includes(lowerKeyword)) {
          // 完全匹配分数更高
          if (titleLower === lowerKeyword) {
            score += 20
          } else {
            score += 10
          }
        }
      }
    }

    // 作者匹配分数
    if (target === 'author' || target === 'both') {
      if (novel.author && typeof novel.author === 'string') {
        const authorLower = novel.author.toLowerCase()
        if (authorLower.includes(lowerKeyword)) {
          // 完全匹配分数更高
          if (authorLower === lowerKeyword) {
            score += 16
          } else {
            score += 8
          }
        }
      }
    }

    return score
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('小说管理器未初始化，请先调用 init()或刷新页面')
    }
  }

  // 强制刷新缓存
  async refreshCache(): Promise<void> {
    console.log('强制刷新 record.json 缓存')

    try {
      // 强制刷新缓存
      const recordData = await recordCacheManager.forceRefresh()

      // 重新解析数据
      this.novels = recordData
        .filter((item): item is [string, string, string] => {
          return Array.isArray(item) &&
                 item.length >= 3 &&
                 typeof item[0] === 'string' &&
                 typeof item[1] === 'string' &&
                 typeof item[2] === 'string' &&
                 item[0].trim() !== ''
        })
        .map((item, index) => {
          const [filePath, size, wordCountStr] = item

          if (!filePath || filePath.trim() === '') {
            throw new Error(`文件路径为空或无效: ${filePath}`)
          }

          const pathParts = filePath.split('/').filter(part => part.trim() !== '')
          const fileName = pathParts[pathParts.length - 1]

          if (!fileName) {
            throw new Error(`无法从路径提取文件名: ${filePath}`)
          }

          const title = fileName.replace(/\.[^/.]+$/, '') || '未知标题'

          let wordCount = 0
          if (wordCountStr && wordCountStr.includes('字')) {
            const num = parseInt(wordCountStr.replace('字', ''))
            wordCount = isNaN(num) ? 0 : num
          }

          let author = '未知作者'
          if (pathParts.length >= 2) {
            const authorName = pathParts[pathParts.length - 2]
            author = authorName || '未知作者'
          } else if (pathParts.length === 1) {
            author = '未知作者'
          }

          return {
            id: index + 1,
            title: title.trim(),
            author: author.trim(),
            filePath: `/novels/${filePath}`,
            fileSize: size || '未知大小',
            wordCount,
            isLoaded: false,
            pathParts
          }
        })

      console.log(`缓存刷新完成，重新加载了 ${this.novels.length} 本小说`)
    } catch (error) {
      console.error('刷新缓存失败:', error)
      throw error
    }
  }

  // 获取缓存信息
  async getCacheInfo(): Promise<{ exists: boolean; timestamp: number; size: number } | null> {
    return recordCacheManager.getCacheInfo()
  }

  // 随机推荐小说
  async getRandomNovels(count: number = 10): Promise<SearchResult[]> {
    this.ensureInitialized();

    if (this.novels.length === 0) return [];

    // 随机选择小说
    const shuffled = [...this.novels].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, this.novels.length));

    // console.log(selected);
    return selected.map(novel => ({
      id: novel.id,
      title: novel.title,
      author: novel.author,
      count: novel.wordCount
    }));
  }
}

// 创建单例实例
export const novelManager = new NovelManager()

// 便捷函数
export const initializeNovels = () => novelManager.init()
export const getAllNovels = () => novelManager.getAllNovels()
export const getNovelById = (id: number) => novelManager.getNovelById(id)
export const loadNovelContent = (id: number) => novelManager.loadNovelContent(id)
export const searchNovels = (keyword: string, target?: 'title' | 'author' | 'both') =>
  novelManager.searchNovels(keyword, target)
export const getRandomNovels = (count?: number) => novelManager.getRandomNovels(count)