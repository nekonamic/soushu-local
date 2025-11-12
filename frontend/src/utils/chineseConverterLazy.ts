/**
 * 延迟加载的中文繁简转换工具
 * 用于减少初始包大小
 */

export type ConversionMode = 's2t' | 't2s' | 's2hk' | 'hk2s' | 's2tw' | 'tw2s' | 'tw2t';

export interface ConversionConfig {
  mode: ConversionMode;
  enabled: boolean;
}

class ChineseConverterLazy {
  private converter: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 延迟初始化转换器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // 动态导入 opencc-js
      const OpenCC = await import('opencc-js');

      // 初始化转换器
      this.converter = {
        s2t: OpenCC.Converter({ from: 'cn', to: 'hk' }),
        t2s: OpenCC.Converter({ from: 'hk', to: 'cn' }),
        s2hk: OpenCC.Converter({ from: 'cn', to: 'hk' }),
        hk2s: OpenCC.Converter({ from: 'hk', to: 'cn' }),
        s2tw: OpenCC.Converter({ from: 'cn', to: 'tw' }),
        tw2s: OpenCC.Converter({ from: 'tw', to: 'cn' }),
        tw2t: OpenCC.Converter({ from: 'tw', to: 'hk' })
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('中文转换器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 转换文本
   */
  async convert(text: string, mode: ConversionMode): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.converter || !this.converter[mode]) {
      console.warn(`不支持的转换模式: ${mode}`);
      return text;
    }

    try {
      return this.converter[mode](text);
    } catch (error) {
      console.error('文本转换失败:', error);
      return text;
    }
  }

  /**
   * 检查转换器是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取支持的转换模式
   */
  getSupportedModes(): { value: ConversionMode; label: string; description: string }[] {
    return [
      { value: 's2t', label: '简→繁', description: '简体中文转繁体中文' },
      { value: 't2s', label: '繁→简', description: '繁体中文转简体中文' },
      { value: 's2hk', label: '简→港', description: '简体中文转香港繁体' },
      { value: 'hk2s', label: '港→简', description: '香港繁体转简体中文' },
      { value: 's2tw', label: '简→台', description: '简体中文转台湾繁体' },
      { value: 'tw2s', label: '台→简', description: '台湾繁体转简体中文' },
      { value: 'tw2t', label: '台→港', description: '台湾繁体转香港繁体' },
    ];
  }
}

// 创建单例实例
export const chineseConverterLazy = new ChineseConverterLazy();

// 便捷函数
export const convertTextLazy = async (text: string, mode: ConversionMode): Promise<string> => {
  return await chineseConverterLazy.convert(text, mode);
};