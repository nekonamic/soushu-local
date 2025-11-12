import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export interface AppState {
  // 保留 localStorage 存储功能用于其他数据
  settings: Record<string, any> | import('@vueuse/core').RemovableRef<Record<string, any>>
}

export const useAuthStore = defineStore('auth', {
  state: (): AppState => ({
    // 保留 localStorage 存储功能，可用于应用设置或其他数据
    settings: useLocalStorage('app-settings', {} as Record<string, any>)
  }),

  getters: {
    // 认证始终有效 - 移除所有认证检查
    isValidAuth(): boolean {
      return true
    },

    // 获取应用设置
    getSettings(): Record<string, any> {
      return this.settings
    }
  },

  actions: {
    // 初始化 - 简化为空函数，保留接口兼容性
    initAuth() {
      // 不再需要认证初始化
    },

    // 清除设置
    clearSettings() {
      this.settings = {}
    },

    // 设置应用配置
    setSetting(key: string, value: any) {
      this.settings[key] = value
    },

    // 获取应用配置
    getSetting(key: string, defaultValue?: any): any {
      return this.settings[key] ?? defaultValue
    },

    // 权限检查 - 始终返回 true
    hasPermission(): boolean {
      return true
    },

    // 为了兼容性保留的方法，但不再有实际功能
    authenticate(): boolean {
      return true
    },

    clearAuth() {
      // 不再需要清除认证状态
    }
  }
})