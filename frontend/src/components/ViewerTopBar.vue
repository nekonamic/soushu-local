<script setup lang="ts">
import { useLayout } from "@/composables/useLayout";
import { ref, onMounted, computed, watch } from "vue";
const { isDarkMode, toggleDarkMode, setColors } = useLayout();
import { useEventListener } from "@vueuse/core";
import { useNovelStore } from "@/store/novel";
import type { Fav } from "@/types/Fav";
import Slider from 'primevue/slider';
import { useRoute } from "vue-router";
import { useLocalStorage } from "@vueuse/core";
import type { Progress } from "@/types/Progress";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { novelCacheManager } from "@/utils/novelCacheManager";
import { chineseConverterLazy, type ConversionMode } from "@/utils/chineseConverterLazy";

const favorites = useLocalStorage<Fav[]>('favorites', [])
const progressStore = useLocalStorage<Progress[]>('progress', [])

const props = defineProps<{
  tocChaptersCount?: number;
  hasTocChapters?: boolean;
  isLocalNovel?: boolean;
  isLocalNovelCached?: boolean;
  novelData?: any;
  novelMeta?: { author: string };
}>();

const emit = defineEmits<{
  'show-toc': [];
  'show-toc-rules': [];
  'cache-novel': [];
  'conversion-change': [payload: { enabled: boolean; mode: ConversionMode | null }];
}>();

const toast = useToast();
const route = useRoute();
const tid = Number(route.params.tid);

// 繁简转换相关状态
const conversionMode = useLocalStorage<ConversionMode | null>('chinese_conversion_mode', null);
const isConversionEnabled = computed(() => conversionMode.value !== null);

// 切换繁简转换
const toggleConversion = () => {
  if (conversionMode.value === 's2t') {
    // 当前是简体转繁体，切换为繁体转简体
    conversionMode.value = 't2s';
    toast.add({
      severity: 'info',
      summary: '繁简转换',
      detail: '已切换为繁体转简体',
      life: 2000,
    });
  } else {
    // 当前是繁体转简体或未启用，切换为简体转繁体
    conversionMode.value = 's2t';
    toast.add({
      severity: 'info',
      summary: '繁简转换',
      detail: '已切换为简体转繁体',
      life: 2000,
    });
  }

  // 通知父组件转换状态改变
  emit('conversion-change', {
    enabled: isConversionEnabled.value,
    mode: conversionMode.value
  });
};

// 获取按钮提示文字
const getTooltipText = () => {
  if (!isConversionEnabled.value) {
    return '开启繁简转换（繁→简）';
  }
  if (conversionMode.value === 't2s') {
    return '繁体转简体（当前模式）';
  }
  return '简体转繁体（当前模式）';
};

// 获取ARIA标签文字
const getAriaLabel = () => {
  if (!isConversionEnabled.value) {
    return '开启繁简转换，将繁体中文转换为简体中文';
  }
  if (conversionMode.value === 't2s') {
    return '繁体转简体，当前模式：将繁体中文转换为简体中文';
  }
  return '简体转繁体，当前模式：将简体中文转换为繁体中文';
};

// 获取按钮文字
const getButtonText = () => {
  if (!isConversionEnabled.value) {
    return '简';
  }
  if (conversionMode.value === 't2s') {
    return '简'; // 繁→简体，显示"简"
  }
  return '繁'; // 简→繁体，显示"繁"
};

// 缓存当前本地小说
const cacheCurrentNovel = async () => {
  if (!props.isLocalNovel || !props.novelData) return;

  try {
    const novelTid = props.novelData.tid;
    const title = props.novelData.title;
    const author = props.novelMeta?.author || '未知作者';
    const content = props.novelData.content;

    toast.add({
      severity: "info",
      summary: "缓存中",
      detail: "正在缓存小说，请稍候...",
      life: 3000,
    });

    await novelCacheManager.cacheLocalNovel(novelTid, title, author, content);

    toast.add({
      severity: "success",
      summary: "缓存成功",
      detail: "小说已缓存到本地",
      life: 3000,
    });

    // 通知父组件更新缓存状态
    emit('cache-novel');
  } catch (err: any) {
    console.error('缓存小说失败:', err);
    toast.add({
      severity: "error",
      summary: "缓存失败",
      detail: err.message || "缓存小说失败",
      life: 3000,
    });
  }
};

onMounted(() => {
  setColors();

  const index = progressStore.value.findIndex(item => item.tid === tid)

  if (index !== -1) {
    slideValue.value = progressStore.value[index]!.progress
  }
})

const novelStore = useNovelStore();

const slideValue = ref(0)
const isDragging = ref(false)

const onSlideStart = () => {
  isDragging.value = true
}

const onSlideEnd = () => {
  isDragging.value = false
}

const isFav = computed(() =>
    favorites.value.some((f) => f.tid === novelStore.tid),
);

function toggleFav() {
  isFav.value ? removeFav() : addFav();
}

const addFav = () => {
  const fav: Fav = {
    tid: novelStore.tid,
    title: novelStore.title,
  };
  if (!isFav.value) {
    favorites.value.push(fav);
  }
};

const removeFav = () => {
  favorites.value = favorites.value.filter((f) => f.tid !== novelStore.tid);
};


const isHidden = ref(false);
let lastScrollY = window.scrollY;

const handleScroll = () => {
  if (!isDragging.value) {
    const currentScrollY = window.scrollY;
    isHidden.value = currentScrollY > lastScrollY;
    lastScrollY = currentScrollY;
  }
};

useEventListener(window, "scroll", handleScroll);

const updateProgress = () => {
  const scrollTop = window.scrollY;
  const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight;
  const progress =
      scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  if (!isDragging.value) {
    slideValue.value = progress
  }

  const index = progressStore.value.findIndex(item => item.tid === tid)

  if (index !== -1) {
    progressStore.value[index]!.progress = progress
  } else {
    // 创建新的Progress对象时，保持现有的selectedRuleId或使用默认值
    progressStore.value.push({
      tid,
      progress,
      title: props.novelData?.title || '未知小说',
      selectedRuleId: undefined  // 让Viewer.vue中的逻辑来设置
    })
  }
};

useEventListener(window, "scroll", updateProgress);

watch(slideValue, (val) => {
  if (isDragging.value) {
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const targetScroll = (val / 100) * scrollHeight;
    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });

  }
});
</script>

<template>
  <div
      :class="['fixed top-0 left-0 w-full transition-transform duration-300', isHidden ? 'translate-y-[calc(-100%+0.25rem)]' : 'translate-y-0']">
    <div
        :class="['flex flex-row items-center justify-between p-4', 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md', 'border-b border-gray-300/50 dark:border-gray-700/50', 'z-50']">
      <!-- 左侧按钮组 -->
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-list"
          label="目录"
          size="small"
          severity="info"
          text
          @click="emit('show-toc')"
          :disabled="!props.hasTocChapters"
          v-tooltip="'查看目录'"
        />
        <Button
          icon="pi pi-cog"
          size="small"
          severity="secondary"
          text
          @click="emit('show-toc-rules')"
          v-tooltip="'目录规则设置'"
        />
      </div>

      <!-- 右侧按钮组 -->
      <div class="flex items-center gap-2">
        <!-- 缓存按钮 -->
        <Button
          v-if="props.isLocalNovel && !props.isLocalNovelCached"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          text
          @click="cacheCurrentNovel"
          v-tooltip="'缓存小说'"
        />
        <!-- 已缓存状态 -->
        <div v-else-if="props.isLocalNovel && props.isLocalNovelCached"
             class="w-10 h-10 flex items-center justify-center text-green-400"
             v-tooltip="'已缓存'">
          <i class="pi pi-check-circle text-lg"></i>
        </div>

        <!-- 繁简转换按钮 -->
        <button type="button"
                class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950 text-sm font-bold"
                :aria-label="getAriaLabel()"
                @click="toggleConversion"
                v-tooltip="getTooltipText()">
          {{ getButtonText() }}
        </button>

        <button type="button"
                class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
                @click="toggleFav">
          <i :class="['pi text-lg', { 'pi-star-fill': isFav, 'pi-star': !isFav }]" />
        </button>
        <button type="button"
                class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
                @click="toggleDarkMode">
          <i :class="['pi text-lg', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
        </button>
      </div>
    </div>
    <Slider v-model="slideValue" @change="onSlideStart" @slideend="onSlideEnd" />
  </div>
</template>

<style scoped></style>