# 目录规则 (TOC Rules)

这个文件包含了用于小说章节识别的目录规则系统。

## 文件说明

- `tocRules.ts`: 包含默认的目录规则定义和类型接口
- `README.md`: 本说明文档

## 核心组件

### DEFAULT_TOC_RULES
包含25种预定义的章节识别规则，覆盖各种常见的章节格式：

1. **标准章节格式**: "第一章"、"第1章"等
2. **数字分隔符**: "1、标题名称"、"2、标题名称"等
3. **大写数字分隔符**: "一、标题名称"、"二十四章 标题"等
4. **特殊符号**: "【第一章】"、"☆、标题名称"等
5. **英文章节**: "Chapter 1"、"Section 2"等
6. **古典小说**: "楔子"、"回"、"话"等格式
7. **书名序号**: "标题(12)"、"标题 124"等

### DEFAULT_ENABLED_RULE_IDS
默认启用的规则ID列表，提供良好的开箱即用体验：
- 目录(去空白)
- 目录
- 数字 分隔符 标题名称
- 大写数字 分隔符 标题名称
- 正文 标题/序号
- Chapter/Section/Part/Episode 序号 标题
- 特殊符号 序号 标题
- 特殊符号 标题(单个)
- 章/卷 序号 标题
- 书名 括号 序号
- 书名 序号
- 字数分割 分节阅读

## 使用方式

### 基本使用
```typescript
import { DEFAULT_TOC_RULES, DEFAULT_ENABLED_RULE_IDS } from '@/utils/tocRules';

// 获取默认启用的规则
const enabledRules = DEFAULT_TOC_RULES.filter(rule =>
  DEFAULT_ENABLED_RULE_IDS.includes(rule.id)
);
```

### 自定义规则
用户可以通过界面添加自定义规则，这些规则会保存到localStorage中。

## 规则格式

每个规则包含以下字段：
- `enable`: 是否启用（用于显示状态）
- `example`: 示例文本
- `id`: 唯一标识符（负数为系统规则，正数为自定义规则）
- `name`: 规则名称
- `rule`: JavaScript正则表达式
- `serialNumber`: 排序序号

## 正则表达式说明

- 使用JavaScript正则表达式语法
- 支持Unicode字符匹配
- `^` 匹配行首，`$` 匹配行尾
- `\\s` 匹配空白字符，包括中文空格
- `[\\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]` 匹配各种数字格式

## 性能优化

- 规则直接内嵌在代码中，无需外部文件加载
- 减少HTTP请求，提高加载速度
- 支持Tree Shaking，未使用的规则不会被打包
- 规则按优先级排序，避免重复匹配

## 维护说明

如需添加新的默认规则：
1. 在`DEFAULT_TOC_RULES`数组中添加新规则
2. 如需默认启用，将规则ID添加到`DEFAULT_ENABLED_RULE_IDS`
3. 更新本README文档

## 注意事项

- 规则按顺序匹配，匹配成功后立即停止
- 自定义规则ID格式为`custom_${timestamp}`
- 所有规则配置会自动保存到localStorage