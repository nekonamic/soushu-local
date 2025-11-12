/**
 * 中文繁简转换工具
 * 使用 OpenCC 进行高质量的中文字符转换
 */

import * as OpenCC from 'opencc-js';

export type ConversionMode = 's2t' | 't2s' | 's2hk' | 'hk2s' | 's2tw' | 'tw2s' | 'tw2t';

export interface ConversionConfig {
  mode: ConversionMode;
  enabled: boolean;
}

class ChineseConverter {
  private converters: Map<ConversionMode, (text: string) => string> = new Map();
  private isInitialized = false;

  /**
   * 初始化转换器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 简体转繁体
      this.converters.set('s2t', OpenCC.Converter({ from: 'cn', to: 'hk' }));

      // 繁体转简体
      this.converters.set('t2s', OpenCC.Converter({ from: 'hk', to: 'cn' }));

      // 简体转香港繁体
      this.converters.set('s2hk', OpenCC.Converter({ from: 'cn', to: 'hk' }));

      // 香港繁体转简体
      this.converters.set('hk2s', OpenCC.Converter({ from: 'hk', to: 'cn' }));

      // 简体转台湾繁体
      this.converters.set('s2tw', OpenCC.Converter({ from: 'cn', to: 'tw' }));

      // 台湾繁体转简体
      this.converters.set('tw2s', OpenCC.Converter({ from: 'tw', to: 'cn' }));

      // 台湾繁体转香港繁体
      this.converters.set('tw2t', OpenCC.Converter({ from: 'tw', to: 'hk' }));

      this.isInitialized = true;
      console.log('中文转换器初始化成功');
    } catch (error) {
      console.error('中文转换器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 转换文本
   * @param text 要转换的文本
   * @param mode 转换模式
   * @returns 转换后的文本
   */
  convert(text: string, mode: ConversionMode): string {
    if (!this.isInitialized) {
      console.warn('转换器未初始化，返回原文本');
      return text;
    }

    const converter = this.converters.get(mode);
    if (!converter) {
      console.warn(`不支持的转换模式: ${mode}`);
      return text;
    }

    try {
      return converter(text);
    } catch (error) {
      console.error('文本转换失败:', error);
      return text;
    }
  }

  /**
   * 简体转繁体
   */
  simplifiedToTraditional(text: string): string {
    return this.convert(text, 's2t');
  }

  /**
   * 繁体转简体
   */
  traditionalToSimplified(text: string): string {
    return this.convert(text, 't2s');
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

  /**
   * 检查转换器是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// 创建单例实例
export const chineseConverter = new ChineseConverter();

// 便捷函数
export const convertText = (text: string, mode: ConversionMode): string => {
  return chineseConverter.convert(text, mode);
};

export const simplifiedToTraditional = (text: string): string => {
  return chineseConverter.simplifiedToTraditional(text);
};

export const traditionalToSimplified = (text: string): string => {
  return chineseConverter.traditionalToSimplified(text);
};