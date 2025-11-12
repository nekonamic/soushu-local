interface RecordCacheItem {
  key: string
  data: [string, string, string][]
  timestamp: number
  checksum?: string
}

class RecordCacheManager {
  private readonly DB_NAME = 'RecordCacheDB'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'records'
  private readonly RECORD_KEY = 'novels_record'

  private db: IDBDatabase | null = null

  // 初始化IndexedDB
  async initDB(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // 生成校验和
  async generateChecksum(data: [string, string, string][]): Promise<string> {
    const encoder = new TextEncoder()
    const dataStr = JSON.stringify(data)
    const dataArray = encoder.encode(dataStr)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 缓存记录数据
  async cacheRecord(recordData: [string, string, string][]): Promise<void> {
    await this.initDB()

    if (!this.db) throw new Error('数据库初始化失败')

    const checksum = await this.generateChecksum(recordData)

    const cacheItem: RecordCacheItem = {
      key: this.RECORD_KEY,
      data: recordData,
      timestamp: Date.now(),
      checksum
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)

      const request = store.put(cacheItem)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // 获取缓存的记录
  async getCachedRecord(): Promise<[string, string, string][] | null> {
    await this.initDB()
    if (!this.db) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(this.RECORD_KEY)

      request.onerror = () => resolve(null)
      request.onsuccess = () => {
        const cacheItem: RecordCacheItem = request.result
        if (!cacheItem) {
          resolve(null)
          return
        }

        resolve(cacheItem.data)
      }
    })
  }

  // 检查是否有缓存
  async hasCachedRecord(): Promise<boolean> {
    await this.initDB()
    if (!this.db) return false

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(this.RECORD_KEY)

      request.onerror = () => resolve(false)
      request.onsuccess = () => {
        resolve(!!request.result)
      }
    })
  }

  // 获取缓存信息
  async getCacheInfo(): Promise<{ exists: boolean; timestamp: number; size: number } | null> {
    await this.initDB()
    if (!this.db) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(this.RECORD_KEY)

      request.onerror = () => resolve(null)
      request.onsuccess = () => {
        const cacheItem: RecordCacheItem = request.result
        if (!cacheItem) {
          resolve(null)
          return
        }

        resolve({
          exists: true,
          timestamp: cacheItem.timestamp,
          size: JSON.stringify(cacheItem.data).length
        })
      }
    })
  }

  // 清除缓存
  async clearCache(): Promise<void> {
    await this.initDB()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.delete(this.RECORD_KEY)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // 强制刷新：先清除缓存，然后重新获取
  async forceRefresh(): Promise<[string, string, string][]> {
    await this.clearCache()

    try {
      const response = await fetch('/novels/record.json?t=' + Date.now())
      if (!response.ok) {
        throw new Error('Failed to load record.json')
      }

      const recordData: [string, string, string][] = await response.json()
      await this.cacheRecord(recordData)

      return recordData
    } catch (error) {
      console.error('强制刷新失败:', error)
      throw error
    }
  }
}

export const recordCacheManager = new RecordCacheManager()