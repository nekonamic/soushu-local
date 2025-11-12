import type { CachedNovel } from '@/data/novels'

interface CacheItem {
  tid: number | string  // 统一使用tid作为键
  data: CachedNovel
  content: string
  timestamp: number
  expiresAt: number
}

class NovelCacheManager {
  private readonly DB_NAME = 'NovelCacheDB'
  private readonly DB_VERSION = 2
  private readonly STORE_NAME = 'novels'
  // 移除过期机制，缓存永久保存

  private db: IDBDatabase | null = null

  // 重置数据库
  async resetDatabase(): Promise<void> {
    console.log('重置数据库...')

    // 关闭当前数据库连接
    if (this.db) {
      this.db.close()
      this.db = null
    }

    // 删除数据库
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME)
      deleteRequest.onerror = () => reject(deleteRequest.error)
      deleteRequest.onsuccess = () => {
        console.log('数据库已删除')
        resolve()
      }
    })
  }

  // 初始化IndexedDB
  async initDB(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        // console.log('数据库初始化成功')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        console.log(`数据库升级: 从版本 ${oldVersion} 到版本 ${db.version}`)

        // 删除旧的存储以确保干净的状态
        if (db.objectStoreNames.contains(this.STORE_NAME)) {
          console.log('删除旧的对象存储')
          db.deleteObjectStore(this.STORE_NAME)
        }

        // 创建新的对象存储
        console.log('创建新的对象存储，keyPath: tid')
        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'tid' })
        store.createIndex('sourceType', 'sourceType', { unique: false })
        store.createIndex('lastUpdate', 'lastUpdate', { unique: false })
      }
    })
  }

  // 为缓存小说生成唯一tid（从5000000开始，避免与本地小说冲突）
  generateCacheTid(): number {
    // 生成1000000-9999999之间的随机数作为缓存小说的tid
    return Math.floor(Math.random() * 9000000) + 5000000
  }

  // 生成文件校验和
  async generateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 缓存小说
  async cacheNovel(
    novel: Omit<CachedNovel, 'cacheSize' | 'lastUpdate' | 'checksum'>,
    content: string
  ): Promise<number> {
    const tid = this.generateCacheTid()
    const checksum = await this.generateChecksum(content)
    const cacheSize = content.length

    const cachedNovel: CachedNovel = {
      ...novel,
      id: tid, // 确保使用正确的tid作为id
      cacheSize,
      lastUpdate: new Date(),
      checksum
    }

    // 统一使用IndexedDB
    await this.cacheToIndexedDB(tid, cachedNovel, content)

    return tid
  }

  // 缓存本地小说（从服务器获取的小说）
  async cacheLocalNovel(tid: number, title: string, author: string, content: string): Promise<void> {
    const checksum = await this.generateChecksum(content)
    const cacheSize = content.length

    const cachedNovel: CachedNovel = {
      id: tid,
      title,
      author,
      filePath: `/local/${tid}`, // 虚拟路径
      fileSize: this.formatFileSize(cacheSize),
      wordCount: content.length,
      sourceType: 'local',
      pathParts: ['本地服务器', author || '未知作者'],
      cacheSize,
      lastUpdate: new Date(),
      checksum
    }

    // 统一使用IndexedDB
    await this.cacheToIndexedDB(tid, cachedNovel, content)
  }

  // 检查本地小说是否已缓存
  async isLocalNovelCached(tid: number): Promise<boolean> {
    return this.isCached(tid)
  }

  // 获取缓存的本地小说
  async getCachedLocalNovel(tid: number): Promise<{ novel: CachedNovel; content: string } | null> {
    return this.getCachedNovel(tid)
  }

  // 缓存到IndexedDB
  private async cacheToIndexedDB(tid: number | string, novel: CachedNovel, content: string): Promise<void> {
    await this.initDB()

    if (!this.db) throw new Error('数据库初始化失败')

    console.log(`准备缓存到IndexedDB，tid: ${tid} (类型: ${typeof tid})`)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)

      const cacheItem: CacheItem = {
        tid, // 使用tid作为键
        data: novel,
        content,
        timestamp: Date.now(),
        expiresAt: Number.MAX_SAFE_INTEGER // 设置为最大值，表示永不过期
      }

      console.log('存储缓存项详细信息:')
      console.log('- tid:', cacheItem.tid, '(类型:', typeof cacheItem.tid, ')')
      console.log('- 小说标题:', novel.title)
      // console.log('- 内容长度:', content.length)
      console.log('- 存储时间戳:', new Date(cacheItem.timestamp).toLocaleString())
      console.log('- 过期时间戳:', new Date(cacheItem.expiresAt).toLocaleString())
      console.log('- 当前时间:', new Date().toLocaleString())

      const request = store.put(cacheItem)
      request.onerror = () => {
        console.error('IndexedDB存储错误:', request.error)
        console.error('错误详情:', {
          name: request.error?.name,
          message: request.error?.message,
          tid: cacheItem.tid,
          tidType: typeof cacheItem.tid
        })
        reject(request.error)
      }
      request.onsuccess = () => {
        console.log('IndexedDB存储成功，tid:', tid)
        resolve()
      }
    })
  }

  // 检查缓存是否存在
  async isCached(tid: number | string): Promise<boolean> {
    await this.initDB()
    if (!this.db) return false

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(tid)

      request.onerror = () => resolve(false)
      request.onsuccess = () => {
        const cacheItem: CacheItem = request.result
        if (!cacheItem) {
          resolve(false)
          return
        }

        if (Date.now() > cacheItem.expiresAt) {
          // 删除过期缓存
          this.deleteCachedNovel(tid)
          resolve(false)
        } else {
          resolve(true)
        }
      }
    })
  }

  // 获取缓存小说
  async getCachedNovel(tid: number | string): Promise<{ novel: CachedNovel; content: string } | null> {
    await this.initDB()
    if (!this.db) {
      console.log('数据库未初始化，返回null')
      return null
    }

    console.log(`尝试获取缓存小说，tid: ${tid} (类型: ${typeof tid})`)

    // 首先检查所有缓存项的状态
    // this.debugAllCacheItems().then(debugInfo => {
    //   console.log('当前数据库状态:', debugInfo)
    // })

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)

      // console.log('准备查询数据库，store.name:', store.name)
      // console.log('查询的tid值:', tid, '类型:', typeof tid)

      const request = store.get(tid)

      request.onerror = (error) => {
        console.error('获取缓存小说错误:', error)
        console.error('错误详情:', request.error)
        resolve(null)
      }
      request.onsuccess = () => {
        const cacheItem: CacheItem = request.result
        // console.log('获取到的缓存项:', cacheItem)
        // console.log('request.result类型:', typeof request.result)

        if (!cacheItem) {
          // console.log('缓存项不存在，尝试手动遍历查找')

          // 手动遍历所有项来查找
          const getAllRequest = store.getAll()
          getAllRequest.onsuccess = () => {
            const allItems = getAllRequest.result
            console.log('数据库中所有缓存项:', allItems)
            console.log('所有项的数量:', allItems.length)

            // allItems.forEach((item, index) => {
            //   console.log(`项 ${index}: tid=${item.tid}, 类型=${typeof item.tid}, 标题=${item.data?.title}`)
            // })

            // 检查是否有tid匹配但类型不匹配的情况
            const foundByStringMatch = allItems.find(item => String(item.tid) === String(tid))
            if (foundByStringMatch) {
              console.log('通过字符串匹配找到项:', foundByStringMatch)
            } else {
              console.log('完全未找到匹配项')
            }
          }

          resolve(null)
          return
        }

        // 移除过期检查，缓存永久保存

        // 将字符串日期转换回Date对象
        const novel = { ...cacheItem.data }

        // console.log('最终返回的小说数据:', novel)
        // console.log('内容长度:', cacheItem.content?.length || 0)

        resolve({
          novel,
          content: cacheItem.content
        })
      }
    })
  }

  // 删除缓存小说
  // 更新缓存小说元数据
  async updateNovelMetadata(tid: number | string, updates: { title?: string; author?: string }): Promise<void> {
    await this.initDB()
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)

      // 首先获取现有的缓存项
      const getRequest = store.get(tid)

      getRequest.onerror = () => reject(getRequest.error)
      getRequest.onsuccess = () => {
        const cacheItem: CacheItem = getRequest.result
        if (!cacheItem) {
          reject(new Error(`缓存项不存在: ${tid}`))
          return
        }

        // 更新元数据
        const updatedNovel: CachedNovel = {
          ...cacheItem.data,
          ...updates,
          lastUpdate: new Date() // 更新修改时间
        }

        // 更新缓存项
        const updatedCacheItem: CacheItem = {
          ...cacheItem,
          data: updatedNovel
        }

        const putRequest = store.put(updatedCacheItem)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }
    })
  }

  async deleteCachedNovel(tid: number | string): Promise<void> {
    await this.initDB()
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)
        const request = store.delete(tid)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    }
  }

  // 获取所有缓存小说列表
  async getAllCachedNovels(): Promise<CachedNovel[]> {
    // 从IndexedDB获取所有缓存
    const dbNovels = await this.getAllFromIndexedDB()
    return dbNovels.sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
  }

  // 从IndexedDB获取所有缓存
  private async getAllFromIndexedDB(): Promise<CachedNovel[]> {
    await this.initDB()
    if (!this.db) return []

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.getAll()

      request.onerror = () => resolve([])
      request.onsuccess = () => {
        const cacheItems: CacheItem[] = request.result
        // 移除过期检查，返回所有缓存项
        const validNovels = cacheItems.map(item => {
          // 将字符串日期转换回Date对象
          const novel = { ...item.data }
          if (typeof novel.lastUpdate === 'string') {
            novel.lastUpdate = new Date(novel.lastUpdate)
          }
          return novel
        })

        resolve(validNovels)
      }
    })
  }

  // 批量删除缓存
  private async deleteMultipleCachedNovels(tids: (number | string)[]): Promise<void> {
    await this.initDB()
    if (this.db) {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)

        let completed = 0
        const total = tids.length

        tids.forEach(tid => {
          const request = store.delete(tid)
          request.onerror = () => completed++
          request.onsuccess = () => {
            completed++
            if (completed === total) {
              resolve()
            }
          }
        })

        if (total === 0) resolve()
      })
    }
  }

  // 检查URL是否有效
  async checkUrlValidity(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      return false
    }
  }

  // 获取缓存总大小
  async getCacheSize(): Promise<number> {
    // 直接从IndexedDB计算大小
    const dbNovels = await this.getAllFromIndexedDB()
    return dbNovels.reduce((sum, novel) => sum + novel.cacheSize, 0)
  }

  // 清理过期缓存（已移除过期机制，保留方法以防其他地方调用）
  async cleanupExpiredCache(): Promise<void> {
    console.log('缓存过期机制已移除，所有缓存将永久保存')
    // 不执行任何清理操作
  }

  // 清空所有缓存
  async clearAllCache(): Promise<void> {
    await this.initDB()
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    }
  }

  // 调试方法：查看所有缓存项
  async debugAllCacheItems(): Promise<{ count: number; items: any[] }> {
    await this.initDB()
    if (!this.db) {
      return { count: 0, items: [] }
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.getAll()

      request.onerror = () => resolve({ count: 0, items: [] })
      request.onsuccess = () => {
        const items = request.result
        const debugInfo = items.map(item => ({
          tid: item.tid,
          tidType: typeof item.tid,
          title: item.data?.title,
          expiresAt: new Date(item.expiresAt).toLocaleString(),
          isExpired: Date.now() > item.expiresAt,
          contentLength: item.content?.length || 0
        }))

        resolve({
          count: items.length,
          items: debugInfo
        })
      }
    })
  }

  // 迁移localStorage中的旧数据到IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    const CACHE_PREFIX = 'novel_cache_'
    const keysToMigrate: string[] = []

    // 找出所有需要迁移的localStorage key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToMigrate.push(key)
      }
    }

    if (keysToMigrate.length === 0) return

    console.log(`发现 ${keysToMigrate.length} 个localStorage缓存项，开始迁移到IndexedDB...`)

    let migratedCount = 0
    for (const key of keysToMigrate) {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          const cacheItem: CacheItem = JSON.parse(item)
          if (Date.now() <= cacheItem.expiresAt) {
            // 迁移有效数据到IndexedDB
            await this.cacheToIndexedDB(
              key.replace(CACHE_PREFIX, ''),
              cacheItem.data,
              cacheItem.content
            )
            migratedCount++
          }
        }
        // 删除localStorage中的数据
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`迁移缓存项失败: ${key}`, error)
      }
    }

    console.log(`成功迁移 ${migratedCount} 个缓存项到IndexedDB`)
  }
}

export const novelCacheManager = new NovelCacheManager()