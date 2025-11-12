interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface ReadingProgress {
  novelId: number
  title: string
  progress: number  // 0-100
  page: number
  scrollPosition: number
  timestamp: number
}

interface SearchHistory {
  keyword: string
  target: 'title' | 'content' | 'both'
  timestamp: number
  resultCount: number
}

interface UserPreferences {
  fontSize: number
  lineHeight: number
  theme: 'light' | 'dark' | 'auto'
  autoScroll: boolean
  scrollSpeed: number
}

class CacheManager {
  private readonly CACHE_PREFIX = 'novel_reader_'
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24小时
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB

  // 缓存操作
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      }

      const cacheKey = this.getCacheKey(key)
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('缓存设置失败:', error)
      // 如果存储空间不足，清理过期缓存
      this.cleanupExpiredCache()
      try {
        const cacheKey = this.getCacheKey(key)
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl
        }))
      } catch (retryError) {
        console.warn('重试缓存设置失败:', retryError)
      }
    }
  }

  get<T>(key: string): T | null {
    try {
      const cacheKey = this.getCacheKey(key)
      const cachedItem = localStorage.getItem(cacheKey)

      if (!cachedItem) return null

      const parsedItem: CacheItem<T> = JSON.parse(cachedItem)

      // 检查是否过期
      if (Date.now() > parsedItem.expiresAt) {
        this.remove(key)
        return null
      }

      return parsedItem.data
    } catch (error) {
      console.warn('缓存读取失败:', error)
      this.remove(key)
      return null
    }
  }

  remove(key: string): void {
    try {
      const cacheKey = this.getCacheKey(key)
      localStorage.removeItem(cacheKey)
    } catch (error) {
      console.warn('缓存删除失败:', error)
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('缓存清空失败:', error)
    }
  }

  // 阅读进度管理
  saveReadingProgress(progress: Omit<ReadingProgress, 'timestamp'>): void {
    const progressData: ReadingProgress = {
      ...progress,
      timestamp: Date.now()
    }

    try {
      const progressList = this.get<ReadingProgress[]>('reading_progress') || []
      const existingIndex = progressList.findIndex(p => p.novelId === progress.novelId)

      if (existingIndex !== -1) {
        progressList[existingIndex] = progressData
      } else {
        progressList.push(progressData)
      }

      // 只保留最近100条记录
      if (progressList.length > 100) {
        progressList.sort((a, b) => b.timestamp - a.timestamp)
        progressList.splice(100)
      }

      this.set('reading_progress', progressList, 7 * 24 * 60 * 60 * 1000) // 7天
    } catch (error) {
      console.error('保存阅读进度失败:', error)
    }
  }

  getReadingProgress(novelId: number): ReadingProgress | null {
    try {
      const progressList = this.get<ReadingProgress[]>('reading_progress') || []
      return progressList.find(p => p.novelId === novelId) || null
    } catch (error) {
      console.error('获取阅读进度失败:', error)
      return null
    }
  }

  getAllReadingProgress(): ReadingProgress[] {
    try {
      return this.get<ReadingProgress[]>('reading_progress') || []
    } catch (error) {
      console.error('获取所有阅读进度失败:', error)
      return []
    }
  }

  removeReadingProgress(novelId: number): void {
    try {
      const progressList = this.get<ReadingProgress[]>('reading_progress') || []
      const filteredList = progressList.filter(p => p.novelId !== novelId)
      this.set('reading_progress', filteredList, 7 * 24 * 60 * 60 * 1000)
    } catch (error) {
      console.error('删除阅读进度失败:', error)
    }
  }

  // 搜索历史管理
  saveSearchHistory(search: Omit<SearchHistory, 'timestamp'>): void {
    try {
      const historyList = this.get<SearchHistory[]>('search_history') || []

      // 检查是否已存在相同的搜索
      const existingIndex = historyList.findIndex(
        h => h.keyword === search.keyword && h.target === search.target
      )

      const searchData: SearchHistory = {
        ...search,
        timestamp: Date.now()
      }

      if (existingIndex !== -1) {
        historyList[existingIndex] = searchData
      } else {
        historyList.unshift(searchData)
      }

      // 只保留最近50条记录
      if (historyList.length > 50) {
        historyList.splice(50)
      }

      this.set('search_history', historyList, 30 * 24 * 60 * 60 * 1000) // 30天
    } catch (error) {
      console.error('保存搜索历史失败:', error)
    }
  }

  getSearchHistory(limit: number = 20): SearchHistory[] {
    try {
      const historyList = this.get<SearchHistory[]>('search_history') || []
      return historyList.slice(0, limit)
    } catch (error) {
      console.error('获取搜索历史失败:', error)
      return []
    }
  }

  clearSearchHistory(): void {
    this.remove('search_history')
  }

  // 用户偏好设置
  saveUserPreferences(preferences: Partial<UserPreferences>): void {
    try {
      const currentPrefs = this.getUserPreferences()
      const updatedPrefs = { ...currentPrefs, ...preferences }
      this.set('user_preferences', updatedPrefs)
    } catch (error) {
      console.error('保存用户偏好失败:', error)
    }
  }

  getUserPreferences(): UserPreferences {
    return this.get<UserPreferences>('user_preferences') || {
      fontSize: 18,
      lineHeight: 1.8,
      theme: 'auto',
      autoScroll: false,
      scrollSpeed: 50
    }
  }

  // 小说内容缓存
  cacheNovelContent(novelId: number, content: string): void {
    try {
      // 检查内容大小，只缓存小于5MB的内容
      const contentSize = new Blob([content]).size
      if (contentSize > 5 * 1024 * 1024) {
        console.warn(`小说内容过大，跳过缓存: ${contentSize} bytes`)
        return
      }

      const cacheKey = `novel_content_${novelId}`
      this.set(cacheKey, content, 24 * 60 * 60 * 1000) // 24小时
    } catch (error) {
      console.error('缓存小说内容失败:', error)
    }
  }

  getCachedNovelContent(novelId: number): string | null {
    try {
      const cacheKey = `novel_content_${novelId}`
      return this.get<string>(cacheKey)
    } catch (error) {
      console.error('获取缓存小说内容失败:', error)
      return null
    }
  }

  // 缓存统计
  getCacheStats(): {
    totalSize: number
    itemCount: number
    expiredCount: number
  } {
    try {
      let totalSize = 0
      let itemCount = 0
      let expiredCount = 0

      const keys = Object.keys(localStorage)
      const currentTime = Date.now()

      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              const parsedItem = JSON.parse(value)

              totalSize += new Blob([value]).size
              itemCount++

              if (currentTime > parsedItem.expiresAt) {
                expiredCount++
              }
            }
          } catch (error) {
            // 忽略解析错误的项目
          }
        }
      })

      return { totalSize, itemCount, expiredCount }
    } catch (error) {
      console.error('获取缓存统计失败:', error)
      return { totalSize: 0, itemCount: 0, expiredCount: 0 }
    }
  }

  // 清理过期缓存
  cleanupExpiredCache(): void {
    try {
      const keys = Object.keys(localStorage)
      const currentTime = Date.now()
      let cleanedCount = 0

      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              const parsedItem = JSON.parse(value)
              if (currentTime > parsedItem.expiresAt) {
                localStorage.removeItem(key)
                cleanedCount++
              }
            }
          } catch (error) {
            // 移除损坏的缓存项
            localStorage.removeItem(key)
            cleanedCount++
          }
        }
      })

      if (cleanedCount > 0) {
        console.log(`清理了 ${cleanedCount} 个过期缓存项`)
      }
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  }

  // 私有方法
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`
  }
}

// 创建单例实例
export const cacheManager = new CacheManager()

// 便捷函数
export const setCache = <T>(key: string, data: T, ttl?: number) => cacheManager.set(key, data, ttl)
export const getCache = <T>(key: string) => cacheManager.get<T>(key)
export const removeCache = (key: string) => cacheManager.remove(key)
export const clearCache = () => cacheManager.clear()

// 阅读进度相关
export const saveReadingProgress = (progress: Omit<ReadingProgress, 'timestamp'>) =>
  cacheManager.saveReadingProgress(progress)
export const getReadingProgress = (novelId: number) =>
  cacheManager.getReadingProgress(novelId)
export const getAllReadingProgress = () =>
  cacheManager.getAllReadingProgress()

// 搜索历史相关
export const saveSearchHistory = (search: Omit<SearchHistory, 'timestamp'>) =>
  cacheManager.saveSearchHistory(search)
export const getSearchHistory = (limit?: number) =>
  cacheManager.getSearchHistory(limit)

// 用户偏好相关
export const saveUserPreferences = (preferences: Partial<UserPreferences>) =>
  cacheManager.saveUserPreferences(preferences)
export const getUserPreferences = () =>
  cacheManager.getUserPreferences()

// 小说内容缓存
export const cacheNovelContent = (novelId: number, content: string) =>
  cacheManager.cacheNovelContent(novelId, content)
export const getCachedNovelContent = (novelId: number) =>
  cacheManager.getCachedNovelContent(novelId)