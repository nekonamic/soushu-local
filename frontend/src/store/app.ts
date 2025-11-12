import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { setApiBase, getApiBase, initializeNovels } from "@/api/main";
import { useAuthStore } from "@/stores/auth";

export type AppMode = 'frontend' | 'api';

export const useAppStore = defineStore("app", {
  state: () => {
    // 初始化时从localStorage读取API设置
    const savedApiBase = useLocalStorage<string>('api-base', '');

    // 如果有保存的API Base，立即设置到全局变量
    if (savedApiBase.value) {
      setApiBase(savedApiBase.value);
    }

    return {
      // 应用模式：frontend（纯前端）或 api（后端API）
      mode: useLocalStorage<AppMode>('app-mode', 'frontend'),

      // API Base配置
      apiBase: savedApiBase,

      // 是否显示API设置对话框
      showApiSettings: false,
    };
  },

  getters: {
    // 是否为API模式
    isApiMode: (state) => state.mode === 'api',

    // 是否为前端模式
    isFrontendMode: (state) => state.mode === 'frontend',

    // 是否允许使用API模式（移除认证限制）
    canUseApiMode: () => {
      return true;
    },

    // 当前API Base（如果为空则使用默认值）
    currentApiBase: (state) => {
      return state.apiBase || getApiBase();
    },

    // 模式显示文本
    modeText: (state) => {
      return state.mode === 'api' ? 'API模式' : '纯前端模式';
    },

    // 模式图标
    modeIcon: (state) => {
      return state.mode === 'api' ? 'pi pi-server' : 'pi pi-mobile';
    },
  },

  actions: {
    // 切换到API模式
    switchToApiMode() {
      this.mode = 'api';
      if (this.apiBase) {
        setApiBase(this.apiBase);
      }
    },

    // 切换到前端模式
    async switchToFrontendMode() {
      this.mode = 'frontend';
      // 确保前端数据已初始化
      try {
        await initializeNovels();
      } catch (error) {
        console.error('切换到前端模式时初始化数据失败:', error);
        // 不抛出错误，允许用户继续使用，但会在后续操作中看到错误
      }
    },

    // 设置API Base
    setApiBase(base: string) {
      this.apiBase = base;
      // 无论当前模式如何，都要设置全局API Base，以便切换模式时能立即生效
      setApiBase(base);
    },

    // 切换模式
    async toggleMode() {
      if (this.mode === 'api') {
        await this.switchToFrontendMode();
      } else {
        this.switchToApiMode();
      }
    },

    // 显示API设置对话框
    showApiSettingsDialog() {
      this.showApiSettings = true;
    },

    // 隐藏API设置对话框
    hideApiSettingsDialog() {
      this.showApiSettings = false;
    },

    // 测试API连接
    async testApiConnection(base: string): Promise<{ success: boolean; message: string }> {
      try {
        // 临时设置API Base进行测试
        const originalBase = getApiBase();
        setApiBase(base);

        // 测试API连接
        const response = await fetch(`${base}/api/search?keyword=test&page=1&target=title`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000), // 5秒超时
        });

        // 恢复原始API Base
        setApiBase(originalBase);

        if (response.ok) {
          return { success: true, message: '连接成功！' };
        } else {
          return { success: false, message: `服务器错误: ${response.status} ${response.statusText}` };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '连接失败'
        };
      }
    },
  },
});