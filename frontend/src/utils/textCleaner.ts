/**
 * 文本清理工具
 * 用于处理正文中的乱码字符
 */

export interface CleaningResult {
  cleanedText: string;
  removedChars: number;
  replacedChars: number;
}

export class TextCleaner {
  /**
   * 常见的乱码字符模式
   */
  private static readonly GARBAGE_PATTERNS = [
    // 控制字符和不可见字符
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    // 常见的乱码符号组合（包含测试文本中的字符）
    /[����ƮŮ]/g,
    // 更精确的乱码字符范围（只包含确定的控制字符和乱码）
    /[\u0080-\u009f]/g,
    // 连续的特殊字符（可能是乱码）- 明确包含emoji范围
    /[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\uff01-\uff5e\u2000-\u206f\u2e80-\u2eff\u2f00-\u2fdf\u2600-\u26ff\u2700-\u27bf\u1f300-\u1f9ff\u1f600-\u1f64f\u1f300-\u1f5ff\u1f680-\u1f6ff\u1f1e0-\u1f1ff\u1f900-\u1f9ff\u1fa70-\u1faff\s\d\w\.,!?;:()[\]{}'"。，！？；：（）【】""''\n\r\t]{3,}/g,
    // 孤立的异常字符
    /(?<![\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])[��Ů����Ʈ](?![\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])/g,
  ];

  /**
   * 清理文本中的乱码字符
   */
  static cleanGarbledText(text: string, options: {
    removeControlChars?: boolean;
    replaceUnknownChars?: boolean;
    preservePunctuation?: boolean;
  } = {}): CleaningResult {
    const {
      removeControlChars = true,
      replaceUnknownChars = true,
      preservePunctuation = true
    } = options;

    let cleanedText = text;
    let removedChars = 0;
    let replacedChars = 0;

    // 移除控制字符
    if (removeControlChars) {
      const before = cleanedText.length;
      cleanedText = cleanedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      removedChars += before - cleanedText.length;
    }

    // 替换常见的乱码字符
    if (replaceUnknownChars) {
      // 替换为空格（保持文本结构）
      const garbageChars = /[����]/g;
      const before = cleanedText.length;
      cleanedText = cleanedText.replace(garbageChars, ' ');
      replacedChars += (before - cleanedText.length);

      // 替换其他异常字符
      const weirdChars = /[��Ů����]/g;
      const before2 = cleanedText.length;
      cleanedText = cleanedText.replace(weirdChars, '');
      removedChars += before2 - cleanedText.length;
    }

    // 清理连续的特殊字符（可能是乱码）
    const consecutiveSpecialChars = /[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\uff01-\uff5e\s\d\w\.,!?;:()[\]{}'"。，！？；：（）【】""'']/g;
    cleanedText = cleanedText.replace(consecutiveSpecialChars, (match) => {
      // 如果匹配的字符太多，可能是乱码，直接删除
      if (match.length > 5) {
        removedChars += match.length;
        return '';
      }
      // 否则替换为空格
      replacedChars += match.length;
      return ' ';
    });

    // 注意：不处理空白字符，保持原有的格式和缩进

    return {
      cleanedText,
      removedChars,
      replacedChars
    };
  }

  /**
   * 智能清理文本
   */
  static smartClean(text: string): CleaningResult {
    let cleanedText = text;
    let totalRemoved = 0;
    let totalReplaced = 0;

    // 第一步：检测明显的乱码模式
    const obviousGarbage = /[����ƮŮ]+/g;
    if (obviousGarbage.test(text)) {
      const result = this.cleanGarbledText(text, {
        removeControlChars: true,
        replaceUnknownChars: true,
        preservePunctuation: true
      });
      cleanedText = result.cleanedText;
      totalRemoved += result.removedChars;
      totalReplaced += result.replacedChars;
    }

    // 第二步：检测和修复常见的乱码模式
    // 例如："锟斤拷" -> 乱码字符
    cleanedText = cleanedText.replace(/锟斤拷/g, '');
    totalRemoved += 3;

    // 第三步：清理异常的Unicode字符
    cleanedText = cleanedText.replace(/[\uE000-\uF8FF\uFFF0-\uFFFF]/g, '');
    totalRemoved += (cleanedText.match(/[\uE000-\uF8FF\uFFF0-\uFFFF]/g) || []).length;

    // 注意：不处理空白字符，保持原有的格式和缩进

    return {
      cleanedText,
      removedChars: totalRemoved,
      replacedChars: totalReplaced
    };
  }

  /**
   * 检测文本中是否包含乱码
   */
  static detectGarbledText(text: string): {
    hasGarbled: boolean;
    severity: 'low' | 'medium' | 'high';
    patterns: string[];
  } {
    const patterns: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // 检测常见乱码字符
    if (/[����ƮŮ]/.test(text)) {
      patterns.push('常见乱码字符');
      severity = 'high';
    }

    // 检测连续的特殊字符
    if (/[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\uff01-\uff5e\u2000-\u206f\u2e80-\u2eff\u2f00-\u2fdf\u2600-\u26ff\u2700-\u27bf\u1f300-\u1f9ff\u1f600-\u1f64f\u1f300-\u1f5ff\u1f680-\u1f6ff\u1f1e0-\u1f1ff\u1f900-\u1f9ff\u1fa70-\u1faff\s\d\w\.,!?;:()[\]{}'"。，！？；：（）【】""''\n\r\t]{5,}/.test(text)) {
      patterns.push('连续特殊字符');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // 检测控制字符
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
      patterns.push('控制字符');
      severity = 'high';
    }

    // 检测异常Unicode字符
    if (/[\uE000-\uF8FF\uFFF0-\uFFFF]/.test(text)) {
      patterns.push('异常Unicode字符');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    return {
      hasGarbled: patterns.length > 0,
      severity,
      patterns
    };
  }

  /**
   * 自动清理并返回结果
   */
  static autoClean(text: string): {
    text: string;
    wasCleaned: boolean;
    report: {
      removedChars: number;
      replacedChars: number;
      patterns: string[];
      severity: 'low' | 'medium' | 'high';
    };
  } {
    const detection = this.detectGarbledText(text);

    if (!detection.hasGarbled) {
      return {
        text,
        wasCleaned: false,
        report: {
          removedChars: 0,
          replacedChars: 0,
          patterns: [],
          severity: 'low'
        }
      };
    }

    const cleaning = this.smartClean(text);

    return {
      text: cleaning.cleanedText,
      wasCleaned: true,
      report: {
        removedChars: cleaning.removedChars,
        replacedChars: cleaning.replacedChars,
        patterns: detection.patterns,
        severity: detection.severity
      }
    };
  }
}

// 便捷函数
export const cleanText = (text: string): string => {
  return TextCleaner.smartClean(text).cleanedText;
};

export const autoCleanText = (text: string) => {
  return TextCleaner.autoClean(text);
};