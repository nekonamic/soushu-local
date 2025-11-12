<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {getNovel, getNovelApi, getNovelMeta, type Novel} from "@/api/main";
import {formatAuthorName} from "@/utils/pathHelper";
import Skeleton from "primevue/skeleton";
import {useToast} from "primevue/usetoast";
import ViewerTopBar from "@/components/ViewerTopBar.vue";
import {useNovelStore} from "@/store/novel";
import {useAppStore} from "@/store/app";
import {novelCacheManager} from "@/utils/novelCacheManager";
import type {CachedNovel} from "@/data/novels";
import Button from "primevue/button";
import TocRulesManager from "@/components/TocRulesManager.vue";
import Drawer from "primevue/drawer";
import {DEFAULT_ENABLED_RULE_IDS, DEFAULT_TOC_RULES} from "@/utils/tocRules";
import type {Progress} from "@/types/Progress.ts";
import {useLocalStorage} from "@vueuse/core";
import { chineseConverterLazy, type ConversionMode } from "@/utils/chineseConverterLazy";
import { autoCleanText, type CleaningResult } from "@/utils/textCleaner";

const novelStore = useNovelStore();
const appStore = useAppStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const data = ref<Novel>();
const cachedNovel = ref<CachedNovel>();
const novelMeta = ref<{ tid: number; title: string; author: string; fileSize: string; pathParts: string[] }>();
const isLoading = ref(true);

const progressStore = useLocalStorage<Progress[]>('progress', [])

// 繁简转换相关状态
const conversionMode = useLocalStorage<ConversionMode | null>('chinese_conversion_mode', null);
const isConversionEnabled = computed(() => conversionMode.value !== null);

// 目录相关状态
const showToc = ref(false);
const showTocRules = ref(false);
const tocRules = ref<any[]>([]);
const tocChapters = ref<Array<{ title: string; position: number; elementId: string }>>([]);

// 应用繁简转换后的目录（状态）
const processedTocChaptersData = ref<Array<{ title: string; position: number; elementId: string }>>([]);

// 计算应用繁简转换后的目录
const processedTocChapters = computed(() => {
  if (!isConversionEnabled.value || !conversionMode.value) {
    return tocChapters.value;
  }
  return processedTocChaptersData.value;
});
const currentChapterIndex = ref(-1);
const currentChapterTitle = ref('');
const selectedRuleId = ref<number | string | null>(null);
const tocListRef = ref<HTMLElement>();
const currentChapterRef = ref<HTMLElement>();
const processedContentData = ref('');

// 获取统一的tid标识符
const getIdentifier = (): number => {
  return Number(route.params.tid);
};

// 处理后的内容状态
const processedContentText = ref('');
const isProcessingContent = ref(false);

// 计算处理后的内容
const processedContent = computed(() => {
  return processedContentText.value || processedContentData.value || data.value?.content || '';
});

// 处理内容转换的函数
const processContent = async () => {
  let content = processedContentData.value || data.value?.content || '';

  if (!content) return;

  isProcessingContent.value = true;

  try {
    // 自动清理乱码字符
    const cleaningResult = autoCleanText(content);
    if (cleaningResult.wasCleaned) {
      content = cleaningResult.text;
    }

    // 应用繁简转换
    if (content && isConversionEnabled.value && conversionMode.value) {
      try {
        content = await chineseConverterLazy.convert(content, conversionMode.value);
      } catch (error) {
        // 繁简转换失败，静默处理
      }
    }

    processedContentText.value = content;
  } finally {
    isProcessingContent.value = false;
  }
};

// 处理目录转换的函数
const processTocChapters = async () => {
  if (!isConversionEnabled.value || !conversionMode.value) {
    processedTocChaptersData.value = tocChapters.value;
    return;
  }

  try {
    const convertedChapters = await Promise.all(
      tocChapters.value.map(async (chapter) => ({
        ...chapter,
        title: await chineseConverterLazy.convert(chapter.title, conversionMode.value!)
      }))
    );
    processedTocChaptersData.value = convertedChapters;
  } catch (error) {
    // 转换失败，使用原始目录
    processedTocChaptersData.value = tocChapters.value;
  }
};

// 计算文件大小是否为大文件
const isLargeFile = computed(() => {
  if (!novelMeta.value?.fileSize) return false;
  const sizeStr = novelMeta.value.fileSize.toUpperCase();
  if (sizeStr.includes('MB')) {
    const sizeNum = parseFloat(sizeStr.replace('MB', ''));
    return sizeNum > 5; // 大于5MB认为是大文件
  }
  return false;
});

// 判断是否为本地小说（tid ≤ 5000000）
const isLocalNovel = computed(() => {
  const tid = getIdentifier();
  return tid > 0 && tid <= 5000000;
});

// 判断是否为缓存小说（tid > 5000000）
const isCacheNovel = computed(() => {
  const tid = getIdentifier();
  return tid > 5000000;
});

// 判断本地小说是否已缓存
const isLocalNovelCached = ref(false);

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 处理繁简转换状态变化
const handleConversionChange = (payload: { enabled: boolean; mode: ConversionMode | null }) => {
    // 转换状态会自动通过 computed 响应
};

// 加载用户选择的目录规则
const loadUserSelectedRules = () => {
  try {
    // 优先加载当前小说保存的规则
    let selectedRuleIdValue: number | string | null = loadSelectedRuleForNovel();

    // 如果当前小说没有保存的规则，则使用全局选择的规则
    if (!selectedRuleIdValue) {
      const savedSelectedRule = localStorage.getItem('toc_selected_rule');
      if (savedSelectedRule) {
        try {
          selectedRuleIdValue = JSON.parse(savedSelectedRule);
        } catch (error) {
          console.error('解析选中规则失败:', error);
        }
      }
    }

    // 如果都没有，使用默认规则
    if (!selectedRuleIdValue && DEFAULT_ENABLED_RULE_IDS.length > 0) {
      selectedRuleIdValue = DEFAULT_ENABLED_RULE_IDS[0] ?? null;
    }

    // 加载所有规则（包括用户自定义的）
    const allRules = [...DEFAULT_TOC_RULES];

    // 加载用户自定义规则
    const savedCustomRules = localStorage.getItem('toc_custom_rules');
    if (savedCustomRules) {
      try {
        const customRules = JSON.parse(savedCustomRules);
        allRules.push(...customRules);
      } catch (error) {
        console.error('解析自定义规则失败:', error);
      }
    }

    // 加载字数分割配置
    const wordCountConfigKey = 'toc_wordCount_config';
    const savedWordCountConfig = localStorage.getItem(wordCountConfigKey);
    if (savedWordCountConfig) {
      try {
        const wordCountConfig = JSON.parse(savedWordCountConfig);
        // 更新字数分割规则的配置
        const wordCountRule = allRules.find(rule => rule.type === 'wordCount');
        if (wordCountRule && wordCountRule.type === 'wordCount') {
          wordCountRule.wordCountOptions = wordCountConfig;
        }
      } catch (error) {
        console.error('加载字数分割配置失败:', error);
      }
    }

    // 设置选中的规则
    if (selectedRuleIdValue !== null) {
      const selectedRule = allRules.find(rule => rule.id === selectedRuleIdValue);
      if (selectedRule) {
        tocRules.value = [selectedRule];
        selectedRuleId.value = selectedRuleIdValue;
      } else {
        // 如果找不到选中的规则，使用默认规则
        const defaultRule = allRules.find(rule => rule.id === DEFAULT_ENABLED_RULE_IDS[0]);
        tocRules.value = defaultRule ? [defaultRule] : [];
        selectedRuleId.value = defaultRule?.id ?? null;
      }
    } else {
      tocRules.value = [];
      selectedRuleId.value = null;
    }

  } catch (error) {
        tocRules.value = [];
    selectedRuleId.value = null;
  }
};

// 生成目录
const generateToc = () => {
  if (!data.value?.content) return;

  // 检查当前选中的规则是否是字数分割规则
  const currentRule = tocRules.value.find(rule => rule.id === selectedRuleId.value);

  if (currentRule && 'type' in currentRule && currentRule.type === 'wordCount') {
    // 从localStorage加载最新的配置
    const wordCountConfigKey = 'toc_wordCount_config';
    const savedWordCountConfig = localStorage.getItem(wordCountConfigKey);

    let wordCountOptions = {
      wordsPerChapter: 10000,
      showFirstSentence: true
    };

    if (savedWordCountConfig) {
      try {
        wordCountOptions = JSON.parse(savedWordCountConfig);
      } catch (error) {
        console.error('解析字数分割配置失败:', error);
      }
    }

    generateTocByWordCount(wordCountOptions.wordsPerChapter, wordCountOptions.showFirstSentence);
    return;
  }

  // 清理乱码后再处理
  let content = data.value.content;
  const cleaningResult = autoCleanText(content);
  if (cleaningResult.wasCleaned) {
    content = cleaningResult.text;
  }

  const lines = content.split('\n');
  const chapters: Array<{ title: string; position: number; elementId: string }> = [];
  const processedContent: string[] = [];

  let currentPosition = 0;
  let chapterIndex = 0;

  lines.forEach((line, index) => {
    let isChapter = false;
    let chapterTitle = '';

    // 只使用选中的规则匹配章节
    if (selectedRuleId.value !== null) {
      const selectedRule = tocRules.value.find(rule => rule.id === selectedRuleId.value);

      if (selectedRule && (!('type' in selectedRule) || selectedRule.type !== 'wordCount')) {
        try {
          const regex = new RegExp(selectedRule.rule);

          if (regex.test(line)) {
            // 提取章节标题 - 使用trim后的内容（用于显示）
            chapterTitle = line.trim();

            // 限制标题长度
            if (chapterTitle.length > 50) {
              chapterTitle = chapterTitle.substring(0, 47) + '...';
            }

            const elementId = `chapter-${chapterIndex}`;
            chapters.push({
              title: chapterTitle,
              position: currentPosition,
              elementId
            });

            isChapter = true;
            chapterIndex++;

            // 重置正则表达式的lastIndex，避免状态问题
            regex.lastIndex = 0;
          }
        } catch (error) {
          console.error(`正则匹配错误 [${selectedRule.name}]:`, error);
        }
      }
    }

    // 如果是章节行，在前面添加锚点标记并加粗章节标题的前面部分
    if (isChapter) {
      const elementId = `chapter-${chapterIndex - 1}`;
      // 只对前30个字符加粗
      const boldLength = Math.min(30, line.length);
      const boldPart = line.substring(0, boldLength);
      const normalPart = line.length > 30 ? line.substring(30) : '';
      processedContent.push(`<div id="${elementId}" class="chapter-marker"></div><strong>${boldPart}</strong>${normalPart}`);
    } else {
      processedContent.push(line);
    }

    currentPosition += line.length + 1;
  });

  tocChapters.value = chapters;

  // 保存处理后的内容
  processedContentData.value = processedContent.join('\n');

  if (chapters.length === 0) {
    toast.add({
      severity: 'warn',
      summary: '提示',
      detail: '未识别到章节目录，请尝试调整匹配规则',
      life: 3000,
    });
  } else {
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: `识别到 ${chapters.length} 个章节`,
      life: 2000,
    });
  }

  // 处理目录转换
  processTocChapters();
};

// 按字数分割生成目录
const generateTocByWordCount = (wordsPerChapter: number, showFirstSentence: boolean) => {
  if (!data.value?.content) return;

  // 清理乱码后再处理
  let content = data.value.content;
  const cleaningResult = autoCleanText(content);
  if (cleaningResult.wasCleaned) {
    content = cleaningResult.text;
  }
  const chapters: Array<{ title: string; position: number; elementId: string }> = [];
  const processedContent: string[] = [];

  // 中文数字转换函数
  const toChineseNumber = (num: number): string => {
    const chinese = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (num <= 10) return chinese[num] || num.toString();
    if (num < 20) return '十' + (chinese[num - 10] || '');
    if (num < 100) {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      return (tens > 1 ? (chinese[tens] || '') : '') + '十' + (ones > 0 ? (chinese[ones] || '') : '');
    }
    // 对于更大的数字，使用简化的表示
    return num.toString();
  };

  // 提取第一句话的函数
  const extractFirstSentence = (text: string, maxLength: number = 20): string => {
    // 移除多余的空白字符
    const cleanText = text.trim();

    // 寻找句号、问号、感叹号等句子结束符
    const sentenceEnders = /[。！？.!?]/;
    const match = cleanText.match(sentenceEnders);

    if (match && match.index !== undefined) {
      const sentence = cleanText.substring(0, match.index + 1);
      return sentence.length > maxLength ? sentence.substring(0, maxLength - 1) + '...' : sentence;
    }

    // 如果没有找到句子结束符，返回前maxLength个字符
    return cleanText.length > maxLength ? cleanText.substring(0, maxLength - 1) + '...' : cleanText;
  };

  let currentPosition = 0;
  let chapterIndex = 0;

  // 按字符分割（一个汉字算一个字符）
  while (currentPosition < content.length) {
    const remainingChars = content.length - currentPosition;
    const chapterSize = Math.min(wordsPerChapter, remainingChars);
    const chapterEnd = currentPosition + chapterSize;

    let chapterContent = content.substring(currentPosition, chapterEnd);
    let chapterTitle = `（${toChineseNumber(chapterIndex + 1)}）`;

    // 如果需要显示第一句话
    if (showFirstSentence && chapterContent.trim()) {
      const firstSentence = extractFirstSentence(chapterContent);
      if (firstSentence) {
        chapterTitle += ` ${firstSentence}`;
      }
    }

    // 限制标题长度
    if (chapterTitle.length > 50) {
      chapterTitle = chapterTitle.substring(0, 47) + '...';
    }

    const elementId = `word-chapter-${chapterIndex}`;
    chapters.push({
      title: chapterTitle,
      position: currentPosition,
      elementId
    });

    // 在章节开始处添加锚点标记和加粗的章节标题
    processedContent.push(`<div id="${elementId}" class="chapter-marker"></div><strong>${chapterTitle}</strong>\n\n${chapterContent}`);

    currentPosition = chapterEnd;
    chapterIndex++;
  }

  tocChapters.value = chapters;
  processedContentData.value = processedContent.join('');

  if (chapters.length === 0) {
    toast.add({
      severity: 'warn',
      summary: '提示',
      detail: '内容为空，无法生成目录',
      life: 3000,
    });
  } else {
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: `按${wordsPerChapter}字分割，生成 ${chapters.length} 个章节`,
      life: 2000,
    });
  }

  // 处理目录转换
  processTocChapters();
};

// 跳转到指定章节
const scrollToChapter = (chapter: { title: string; position: number; elementId: string }, index: number) => {
  currentChapterIndex.value = index;

  // 首先尝试使用锚点跳转
  const element = document.getElementById(chapter.elementId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  } else {
    // 如果锚点不存在，回退到计算位置
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const targetPosition = (chapter.position / data.value!.content.length) * scrollHeight;

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }

  // 更新当前章节信息
  currentChapterTitle.value = chapter.title;

  // 关闭目录（在移动端）
  if (window.innerWidth < 768) {
    showToc.value = false;
  }
};

// 更新当前章节（基于滚动位置）
const updateCurrentChapter = () => {
  if (!data.value?.content || tocChapters.value.length === 0) {
    return;
  }

  const currentScrollY = window.scrollY || document.documentElement.scrollTop;

  // 找到当前应该显示的章节
  let currentIndex = -1;
  let currentTitle = '';

  // 使用DOM元素位置进行精确定位
  for (let i = tocChapters.value.length - 1; i >= 0; i--) {
    const chapter = tocChapters.value[i];
    if (chapter) {
      const element = document.getElementById(chapter.elementId);
      if (element) {
        const elementTop = element.getBoundingClientRect().top + window.scrollY;
        if (currentScrollY >= elementTop - 100) { // 给100px的容差
          currentIndex = i;
          currentTitle = chapter.title;
          break;
        }
      }
    }
  }

  // 如果DOM元素不存在，回退到估算方法
  if (currentIndex === -1) {
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const scrollPercentage = scrollHeight > 0 ? currentScrollY / scrollHeight : 0;

    for (let i = tocChapters.value.length - 1; i >= 0; i--) {
      const chapter = tocChapters.value[i];
      if (chapter) {
        const chapterPosition = chapter.position / data.value!.content.length;
        if (scrollPercentage >= chapterPosition) {
          currentIndex = i;
          currentTitle = chapter.title;
          break;
        }
      }
    }
  }

  // 更新章节索引和标题
  if (currentIndex !== currentChapterIndex.value) {
    currentChapterIndex.value = currentIndex;
    currentChapterTitle.value = currentTitle;
  }
};

// 处理目录规则变化
const handleTocRulesChange = (rules: any[]) => {
  tocRules.value = rules;
  // 更新选中的规则ID
  if (rules.length > 0) {
    selectedRuleId.value = rules[0].id;
  }
  // 如果内容已加载，立即重新生成目录
  if (data.value?.content) {
    nextTick(() => {
      generateToc();
    });
  }
};

// 当目录打开时，自动滚动到当前章节
const scrollToCurrentChapter = () => {
  if (!showToc.value) {
    return;
  }

  // 如果 tocListRef 还没有准备好，等待更长时间
  nextTick(() => {
    // 增加延时确保DOM完全渲染
    setTimeout(() => {
      const tocContainer = tocListRef.value;
      if (!tocContainer) {
        // 再等待一段时间后重试
        setTimeout(() => {
          if (tocListRef.value) {
            scrollToCurrentChapter();
          }
        }, 500);
        return;
      }

      // 如果当前章节信息不完整，主动计算
      if (currentChapterIndex.value === -1 || !currentChapterTitle.value) {
        updateCurrentChapter();
      }

      // 查找当前章节对应的目录项
      let targetElement: HTMLElement | null = null;

      // 优先使用 data-chapter-index 属性查找
      if (currentChapterIndex.value >= 0 && currentChapterIndex.value < tocChapters.value.length) {
        const chapterElements = tocContainer.querySelectorAll('[data-chapter-index]');
        targetElement = chapterElements[currentChapterIndex.value] as HTMLElement;
      }

      // 如果没找到，尝试用文本内容匹配
      if (!targetElement && currentChapterTitle.value) {
        const chapterLinks = tocContainer.querySelectorAll('a');
        chapterLinks.forEach((link) => {
          if (link.textContent?.trim() === currentChapterTitle.value.trim()) {
            targetElement = link as HTMLElement;
          }
        });
      }

      // 如果还是没找到，尝试根据滚动位置估算当前章节
      if (!targetElement) {
        const currentScrollY = window.scrollY || document.documentElement.scrollTop;

        for (let i = 0; i < tocChapters.value.length; i++) {
          const chapter = tocChapters.value[i];
          if (chapter && chapter.position && currentScrollY >= chapter.position - 100) { // 给100px的容差
            const chapterElements = tocContainer.querySelectorAll('[data-chapter-index]');
            targetElement = chapterElements[i] as HTMLElement;
            // 更新当前章节信息
            currentChapterIndex.value = i;
            currentChapterTitle.value = chapter.title;
            break;
          }
        }
      }

      // 如果找到了当前章节元素，滚动到它并居中显示
      if (targetElement) {
        // 移除其他可能的高亮
        const allHighlighted = tocContainer.querySelectorAll('.bg-blue-100, .dark\\:bg-blue-900');
        allHighlighted.forEach(el => {
          el.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'transition-colors', 'duration-300');
        });

        // 添加高亮样式
        targetElement.classList.add('bg-blue-100', 'dark:bg-blue-900', 'transition-colors', 'duration-300');

        const containerHeight = tocContainer.clientHeight;
        const elementRect = targetElement.getBoundingClientRect();
        const containerRect = tocContainer.getBoundingClientRect();
        const scrollTop = tocContainer.scrollTop;

        // 计算目标位置，让当前章节显示在容器中间
        const offsetTop = elementRect.top - containerRect.top + scrollTop;
        const targetScrollTop = offsetTop - (containerHeight / 2) + (elementRect.height / 2);

        tocContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });

        // 2秒后移除高亮效果
        setTimeout(() => {
          if (targetElement) {
            targetElement.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'transition-colors', 'duration-300');
          }
        }, 2000);
      } else {
        // 如果没有找到当前章节，滚动到第一个章节
        const firstChapter = tocContainer.querySelector('a');
        if (firstChapter) {
          firstChapter.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    }, 300); // 增加延时到300ms
  });
};

// 进度管理：每个小说使用独立的localStorage键
const getProgressKey = (tid: number) => progressStore.value.findIndex(item => item.tid === tid);

// 加载小说的选择规则
const loadSelectedRuleForNovel = (): number | string | null => {
  const tid = getIdentifier();
  const key = getProgressKey(tid);

  return  progressStore.value[key]!.selectedRuleId ?? -25;
};

// 统一的小说内容加载方法（缓存优先）
const loadNovelContent = async (tid: number) => {
  try {
    // 1. 首先尝试从缓存加载（所有类型的小说都先检查缓存）
    const cachedResult = await novelCacheManager.getCachedNovel(tid);

    if (cachedResult) {
      // 使用缓存内容
      isLocalNovelCached.value = true;
      cachedNovel.value = cachedResult.novel;
      data.value = {
        tid: tid,
        title: cachedResult.novel.title,
        content: cachedResult.content
      };

      // 构造元数据
      novelMeta.value = {
        tid,
        title: cachedResult.novel.title,
        author: cachedResult.novel.author,
        fileSize: cachedResult.novel.fileSize,
        pathParts: cachedResult.novel.pathParts
      };

      // 设置novel store
      novelStore.tid = tid;
      novelStore.title = cachedResult.novel.title;

      toast.add({
        severity: "success",
        summary: "成功",
        detail: "从缓存加载小说完成",
        life: 2000,
      });

      isLoading.value = false;
      novelStore.isLoading = false;
      return;
    }

    // 2. 缓存不存在，根据模式决定加载方式
    if (appStore.isApiMode) {
      // API模式：直接从API服务器加载
      try {
        data.value = await getNovelApi(tid);

        // 构造元数据
        novelMeta.value = {
          tid,
          title: data.value.title,
          author: '未知作者', // API返回中没有作者信息
          fileSize: formatFileSize(data.value.content.length),
          pathParts: [data.value.title]
        };

        // 设置novel store
        novelStore.tid = data.value.tid;
        novelStore.title = data.value.title;

        toast.add({
          severity: "success",
          summary: "成功",
          detail: "从API服务器加载小说完成",
          life: 2000,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '加载失败';
        throw new Error(`API服务器加载失败: ${errorMessage}`);
      }
    } else {
      // 前端模式：按tid范围判断
      if (tid > 5000000) {
        // 这是缓存小说（URL来源或上传），但缓存不存在
        throw new Error('缓存小说不存在或已过期，无法从服务器获取');
      }

      // 这是本地小说，从服务器加载

      // 先加载元数据
      novelMeta.value = await getNovelMeta(tid);

      // 对于大文件，显示加载进度
      if (isLargeFile.value) {
        toast.add({
          severity: "info",
          summary: "提示",
          detail: `正在加载大文件 (${novelMeta.value.fileSize})，请稍候...`,
          life: 2000,
        });
      }

      // 加载完整内容
      data.value = await getNovel(tid);

      novelStore.tid = data.value.tid;
      novelStore.title = data.value.title;
    }

    toast.add({
      severity: "success",
      summary: "成功",
      detail: "小说加载完成",
      life: 2000,
    });
  } catch (err: any) {
    console.error('加载小说失败:', err);
    toast.add({
      severity: "error",
      summary: "错误",
      detail: err.message || "加载小说失败",
      life: 3000,
    });
  } finally {
    isLoading.value = false;
    novelStore.isLoading = false;
  }
};

// 处理来自导航栏的缓存事件
const handleCacheNovelEvent = async () => {
  if (!isLocalNovel.value || !data.value) return;

  // 检查是否已经缓存
  const alreadyCached = await novelCacheManager.isLocalNovelCached(data.value.tid);
  if (alreadyCached) {
    isLocalNovelCached.value = true;
    return;
  }

  try {
    isLocalNovelCached.value = true;
  } catch (err: any) {
    console.error('更新缓存状态失败:', err);
    // 即使更新状态失败，也不影响缓存功能
  }
};

// 下载小说为txt文件
const downloadNovelAsTxt = () => {
  if (!data.value || !data.value.content) {
    toast.add({
      severity: "error",
      summary: "下载失败",
      detail: "小说内容未加载完成",
      life: 3000,
    });
    return;
  }

  try {
    // 创建文件内容
    const title = data.value.title || '未知小说';
    const author = novelMeta.value?.author || '未知作者';
    const tid = data.value.tid;

    // 准备文件内容
    const fileContent = `${title}\n作者: ${author}\nID: ${tid}\n${'='.repeat(50)}\n\n${data.value.content}`;

    // 创建Blob对象
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // 设置下载属性
    const fileName = `${title.replace(/[<>:"/\\|?*]/g, '')}.txt`;
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理资源
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: "success",
      summary: "下载成功",
      detail: `《${title}》已下载为 ${fileName}`,
      life: 3000,
    });
  } catch (error) {
    console.error('下载失败:', error);
    toast.add({
      severity: "error",
      summary: "下载失败",
      detail: error instanceof Error ? error.message : "下载过程中发生错误",
      life: 3000,
    });
  }
};

// 监听目录打开状态，自动滚动到当前章节
watch(showToc, (newShowToc) => {
  if (newShowToc) {
    // 等待 Sidebar 组件完全渲染后再尝试滚动
    nextTick(() => {
      setTimeout(() => {
        scrollToCurrentChapter();
      }, 100); // 给 Sidebar 组件一些时间来完成渲染
    });
  }
});

// 监听繁简转换状态变化，重新处理内容和目录
watch([isConversionEnabled, conversionMode], () => {
  processContent();
  processTocChapters();
});

onMounted(async () => {
  const identifier = getIdentifier();

  // 加载用户选择的目录规则
  loadUserSelectedRules();

  // 统一加载逻辑：缓存优先
  await loadNovelContent(identifier);

  await nextTick();

  // 如果内容已加载且有目录规则，生成目录
  if (data.value?.content && tocRules.value.length > 0) {
    generateToc();
  }

  // 处理内容转换
  processContent();

  const tid = Number(route.params.tid);
  const index = progressStore.value.findIndex(item => item.tid === tid)

  if (index !== -1) {
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const targetScroll = (progressStore.value[index]!.progress / 100) * scrollHeight;
    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  }

  // 提供全局方法供其他组件获取当前小说内容
  (window as any).getCurrentNovelContent = (): string | null => {
    return data.value?.content || null;
  };
});

onUnmounted(() => {
  novelStore.tid = 0;
  novelStore.title = "";
  novelStore.isLoading = true;

  // 清理滚动事件监听器
  if ((window as any)._progressCleanup) {
    (window as any)._progressCleanup();
    delete (window as any)._progressCleanup;
  }

  // 清理全局方法
  if ((window as any).getCurrentNovelContent) {
    delete (window as any).getCurrentNovelContent;
  }
});
</script>

<template>
  <div>
    <div class="overflow-x-hidden">
      <ViewerTopBar
        :toc-chapters-count="tocChapters.length"
        :has-toc-chapters="processedTocChapters.length > 0"
        :is-local-novel="isLocalNovel"
        :is-local-novel-cached="isLocalNovelCached"
        :novel-data="data"
        :novel-meta="novelMeta"
        @show-toc="showToc = true"
        @show-toc-rules="showTocRules = true"
        @cache-novel="handleCacheNovelEvent"
        @conversion-change="handleConversionChange"
      />
      <div class=" flex justify-center mt-20 px-4">
        <div class=" max-w-3xl w-full flex flex-col gap-2">
          <!-- 标题区域 -->
          <div>
            <Skeleton width="20rem" height="2rem" class="mb-2" v-if="isLoading"></Skeleton>
            <h1 class=" text-3xl font-bold break-all" v-else>{{ data?.title }}</h1>
          </div>

          <!-- 元数据区域 -->
          <div>
            <Skeleton width="10rem" class="mb-2" v-if="isLoading"></Skeleton>
            <div v-else class="flex flex-col gap-2 text-gray-300 text-sm">
              <div class="flex flex-wrap gap-4">
                <p>tid: {{ $route.params.tid }}</p>
                <p v-if="novelMeta">作者: {{ formatAuthorName(novelMeta.pathParts) }}</p>
                <p v-if="novelMeta">文件大小: {{ novelMeta.fileSize }}</p>
                <p v-if="isCacheNovel && cachedNovel" class="text-blue-400">
                  来源: {{ cachedNovel.sourceType === 'url' ? 'URL链接' : cachedNovel.sourceType === 'upload' ? '本地上传' : '本地文件' }}
                </p>
              </div>

              <!-- 操作按钮区域 -->
              <div v-if="!isLoading && data" class="flex gap-2 flex-wrap">
                <!-- 下载按钮（所有小说都可以下载） -->
                <Button
                  icon="pi pi-file-import"
                  label="下载TXT"
                  size="small"
                  severity="success"
                  outlined
                  @click="downloadNovelAsTxt"
                />
              </div>
            </div>
          </div>

          <!-- 加载进度条（仅大文件显示） -->
          <div v-if="isLoading && isLargeFile">
            <p class="text-gray-400 text-sm mb-2">正在加载小说内容...</p>
          </div>

          <!-- 内容区域 -->
          <div>
            <Skeleton width="100%" height="30rem" v-if="isLoading"></Skeleton>
            <div v-else-if="data" class=" text-lg font-light whitespace-pre-wrap break-all novel-content">
              <div v-html="processedContent"></div>
            </div>
            <div v-else class="text-gray-400 text-center py-8">
              <p>加载失败，请刷新页面重试</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 目录侧边栏 -->
    <Drawer
      v-model:visible="showToc"
      header="目录"
      :baseZIndex="9999"
      :style="{ width: '320px' }"
      :contentStyle="{ height: 'calc(100% - 60px)', display: 'flex', flexDirection: 'column' }"
    >
      <div class="flex flex-col h-full gap-4">
        <!-- 目录信息 -->
        <div v-if="tocChapters.length > 0" class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
          共识别到 {{ tocChapters.length }} 个章节
        </div>

        <!-- 章节列表 -->
        <div class="space-y-1 flex-1 overflow-y-auto" ref="tocListRef" style="min-height: 0;">
          <div
            v-for="(chapter, index) in processedTocChapters"
            :key="chapter.elementId"
            :ref="el => { if (el && index === currentChapterIndex) currentChapterRef = el as HTMLElement; }"
            :data-chapter-index="index"
            class="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors"
            :class="{
              'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200': index === currentChapterIndex,
              'hover:bg-gray-100 dark:hover:bg-gray-800': index !== currentChapterIndex
            }"
            @click="scrollToChapter(chapter, index)"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ chapter.title }}
              </div>
            </div>
            <div
              v-if="index === currentChapterIndex"
              class="text-xs text-blue-600 dark:text-blue-400"
            >
              当前
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="tocChapters.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          <i class="pi pi-list text-4xl mb-4 block opacity-50"></i>
          <p class="text-sm">未识别到章节目录</p>
          <p class="text-xs mt-2">请调整目录匹配规则或重新生成</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            icon="pi pi-refresh"
            label="重新生成"
            size="small"
            severity="secondary"
            outlined
            @click="generateToc()"
          />
          <Button
            icon="pi pi-cog"
            label="规则设置"
            size="small"
            severity="secondary"
            outlined
            @click="showTocRules = true; showToc = false"
          />
        </div>
      </div>
    </Drawer>

    <!-- 目录规则管理 -->
    <TocRulesManager
      v-model:visible="showTocRules"
      @rules-change="handleTocRulesChange"
    />
  </div>
</template>