<script setup lang="ts">
import { useRouter } from "vue-router";
import { onMounted, onUnmounted, ref, computed, nextTick } from "vue";
import InputText from "primevue/inputtext";
import RadioButton from "primevue/radiobutton";
import RadioButtonGroup from "primevue/radiobuttongroup";
import Card from "primevue/card";
import Paginator from "primevue/paginator";
import {
  searchNovels,
  searchNovelsApi,
  formatWordCount,
  getAllNovelList,
  getRandomRecommendations,
  type Record,
  getNovelApi
} from "@/api/main";
import { getRandomNovels, getNovelById } from "@/data/novels";
import { formatAuthorName } from "@/utils/pathHelper";
import Skeleton from "primevue/skeleton";
import { useSearchStore } from "@/store/search";
import Message from "primevue/message";
import Form from "@primevue/forms/form";
import { useToast } from "primevue/usetoast";
import Drawer from "primevue/drawer";
import Button from "primevue/button";
import HomeTopBar from "@/components/HomeTopBar.vue";
import type { Fav } from "@/types/Fav";
import { useConfirm } from "primevue/useconfirm";
import { registerSW } from "virtual:pwa-register";
import ProgressBar from 'primevue/progressbar';
import { useLocalStorage } from "@vueuse/core";
import type { Progress } from "@/types/Progress";
import AddNovelDialog from "@/components/AddNovelDialog.vue";
import ApiSettingsDialog from "@/components/ApiSettingsDialog.vue";
import type { CachedNovel } from "@/data/novels";
import { useAppStore } from "@/store/app";
import { novelCacheManager } from "@/utils/novelCacheManager";
import { getNovel } from "@/api/main";

const favorites = useLocalStorage<Fav[]>('favorites', [])
const history = useLocalStorage<string[]>('history', [])
const progress = useLocalStorage<Progress[]>('progress', [])
const appStore = useAppStore()

// 是否显示作者信息
const showAuthor = useLocalStorage<boolean>('show-author', true)

// 搜索建议相关状态
const showSuggestions = ref(false)

// 过滤后的搜索历史
const filteredHistory = computed(() => {
  if (!searchStore.keyword) return [];
  return history.value.filter(h =>
    h.toLowerCase().includes(searchStore.keyword.toLowerCase())
  );
});

// 延迟隐藏建议列表
const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

// 主动隐藏建议列表（用于失去焦点时）
const hideSuggestionsImmediate = () => {
  showSuggestions.value = false;
};

// 搜索框引用
const searchInputRef = ref<HTMLInputElement>();

const toast = useToast();

const confirm = useConfirm();

const searchStore = useSearchStore();

const router = useRouter();

// 添加小说对话框状态
const showAddNovelDialog = ref(false);

// 处理小说添加成功
const handleNovelAdded = (novel: CachedNovel) => {
  // 可以在这里添加额外的处理逻辑
  // 比如刷新搜索结果、显示通知等
  console.log('小说已添加到缓存:', novel);
};

const rows = ref(20);

const isLoading = ref(false);

const offset = ref(0);

// 随机推荐相关状态
const isLoadingRandom = ref(false);
const showRandomResults = ref(false);
const randomResults = ref<Record[]>([]);

const isFav = (tid: number) => favorites.value.some((f) => f.tid === tid);

const drawerVisible = ref(false);

// 缓存相关状态
const cachingNovels = ref<Set<number>>(new Set());
const cachedNovels = ref<Set<number>>(new Set());

const addFav = (tid: number, title: string) => {
  const fav: Fav = { tid, title };
  if (!isFav(tid)) {
    favorites.value.push(fav);
  }
};

// 获取小说的路径信息
const getNovelPathInfo = (tid: number) => {
  const result = searchStore.records.find(r => r.tid === tid);
  return result?.pathParts || [];
};

const removeFav = (tid: number) => {
  favorites.value = favorites.value.filter((f) => f.tid !== tid);
};

// 检查小说是否已缓存
const isNovelCached = async (tid: number): Promise<boolean> => {
  if (cachedNovels.value.has(tid)) {
    return true;
  }
  const isCached = await novelCacheManager.isLocalNovelCached(tid);
  if (isCached) {
    cachedNovels.value.add(tid);
  }
  return isCached;
};

// 缓存小说
const cacheNovel = async (tid: number, title: string) => {
  if (cachingNovels.value.has(tid)) {
    return;
  }

  try {
    cachingNovels.value.add(tid);

    toast.add({
      severity: 'info',
      summary: '开始缓存',
      detail: `正在缓存《${title}》`,
      life: 2000
    });

    // 获取小说内容
    let content: string;
    let author: string = '';

    if (appStore.isApiMode) {
      // API模式：从API获取内容
      const novel = await getNovelApi(tid);
      content = novel.content;
    } else {
      // 前端模式：从本地获取
      const novelInfo = getNovelById(tid);
      if (!novelInfo) {
        const novel = await getNovelApi(tid);
        content = novel.content;
      } else{
        const novel = await getNovel(tid);
        content = novel.content;
        author = novelInfo?.author || '';
      }
    }

    // 缓存小说
    await novelCacheManager.cacheLocalNovel(tid, title, author, content);
    cachedNovels.value.add(tid);

    toast.add({
      severity: 'success',
      summary: '缓存成功',
      detail: `《${title}》已缓存到本地`,
      life: 3000
    });

  } catch (error) {
    console.error('缓存小说失败:', error);
    toast.add({
      severity: 'error',
      summary: '缓存失败',
      detail: error instanceof Error ? error.message : '缓存过程中发生错误',
      life: 5000
    });
  } finally {
    cachingNovels.value.delete(tid);
  }
};

// 初始化缓存状态
const initializeCacheStatus = async () => {
  for (const fav of favorites.value) {
    await isNovelCached(fav.tid);
  }
};

// 清空搜索历史
const clearSearchHistory = () => {
  confirm.require({
    header: '清空搜索历史',
    message: '确定要清空所有搜索历史记录吗？此操作不可撤销。',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: {
      label: '确定',
      severity: 'danger'
    },
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true
    },
    accept: () => {
      history.value = [];
      toast.add({
        severity: 'success',
        summary: '清空成功',
        detail: '搜索历史已清空',
        life: 3000
      });
    }
  });
};

// 删除单条搜索历史
const removeSearchHistoryItem = (keyword: string, event: MouseEvent) => {
  // 阻止事件冒泡，防止触发搜索框的blur事件
  event.preventDefault();
  event.stopPropagation();

  const index = history.value.indexOf(keyword);
  if (index > -1) {
    history.value.splice(index, 1);
    // 不显示toast提示，保持界面简洁
  }

  // 确保搜索框保持焦点
  setTimeout(() => {
    const searchInput = document.querySelector('input[placeholder="搜索..."]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, 0);
};

// 获取收藏项的进度
// const getProgressForItem = (item: Fav) => {
//   if (item.cacheKey) {
//     return progress.value.find(p => p.cacheKey === item.cacheKey)?.progress ?? 0;
//   } else {
//     return progress.value.find(p => p.tid === item.tid)?.progress ?? 0;
//   }
// };

onMounted(async () => {
  const updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      confirm.require({
        header: "更新可用",
        message: "检测到新版本，是否立即刷新？",
        icon: "pi pi-refresh",
        acceptProps: {
          label: "立即更新",
        },
        rejectProps: {
          label: "稍后",
          severity: "secondary",
          outlined: true,
        },
        accept: () => {
          updateSW(true);
          toast.add({
            severity: "info",
            summary: "更新中",
            detail: "正在刷新以加载最新版本…",
            life: 3000,
          });
        },
        reject: () => {
          toast.add({
            severity: "warn",
            summary: "已取消",
            detail: "稍后可手动刷新更新",
            life: 3000,
          });
        },
      });
    },

    onOfflineReady() {
      toast.add({
        severity: "success",
        summary: "更新完成",
        detail: "已准备好离线使用",
        life: 4000,
      });
    },
  });

  offset.value = (searchStore.page - 1) * rows.value;

  // 根据模式决定初始加载策略
  if (appStore.isApiMode) {
    // API模式：只有在搜索关键词不为空时才执行初始加载
    if (searchStore.keyword.trim()) {
      await fetchData(true);
    } else {
      // 初始化空状态
      searchStore.records = [];
      searchStore.total = 0;
      searchStore.page = 1;
      offset.value = 0;
    }
  } else {
    // 纯前端模式：默认加载所有小说列表
    await fetchData(true);
  }

  // 点击外部区域隐藏搜索建议
  document.addEventListener('click', handleClickOutside);

  // 初始化缓存状态
  await initializeCacheStatus();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 点击外部区域隐藏搜索建议
const handleClickOutside = (event: Event) => {
  const searchContainer = document.querySelector('.relative');
  if (searchContainer && !searchContainer.contains(event.target as Node)) {
    showSuggestions.value = false;
  }
};

async function fetchData(isNewSearch: boolean) {
  // API模式：如果关键词为空，清空结果并返回，不执行搜索
  if (appStore.isApiMode && !searchStore.keyword.trim()) {
    searchStore.records = [];
    searchStore.total = 0;
    searchStore.page = 1;
    offset.value = 0;
    return;
  }

  // 纯前端模式：即使关键词为空也显示所有小说

  if (isNewSearch) {
    // 只有在关键词不为空时才添加到搜索历史（适用于所有模式）
    if (searchStore.keyword.trim() && !history.value.includes(searchStore.keyword)) {
      history.value.unshift(searchStore.keyword);
    }
    if (history.value.length > 20) {
      history.value = history.value.slice(0, 20);
    }

    searchStore.records = [];
    searchStore.total = 0;
    searchStore.page = 1;
    offset.value = (searchStore.page - 1) * rows.value;
  }

  try {
    isLoading.value = true;
    let res;

    if (appStore.isApiMode) {
      // API模式搜索
      const apiTarget = searchStore.target === 'author' ? 'title' : searchStore.target;
      const apiRes = await searchNovelsApi(
        apiTarget as 'title' | 'content' | 'both',
        searchStore.keyword,
        searchStore.page,
      );

      // 转换API响应为Record类型
      res = {
        total: apiRes.total,
        page: apiRes.page,
        page_size: apiRes.page_size,
        records: apiRes.records.map(item => ({
          tid: item.tid,
          title: item.title,
          count: item.count, // 使用API返回的正确字数信息
          author: undefined,
          pathParts: undefined
        }))
      };
    } else {
      // 前端模式搜索（支持标题、作者、全部）
      res = await searchNovels(
        searchStore.target,
        searchStore.keyword,
        searchStore.page,
      );
    }

    searchStore.records = res.records;
    searchStore.total = res.total;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '搜索失败';
    const modeText = appStore.modeText;

    toast.add({
      severity: "error",
      summary: "搜索失败",
      detail: `${modeText} - ${errorMessage}`,
      life: 3000,
    });
  } finally {
    isLoading.value = false;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function handleCardClick(event: MouseEvent, tid: number) {
  if (event.button === 0) {
    event.preventDefault();
    router.push(`/${tid}`);
  }
}

function onPageChange(event: { page: number }) {
  if (!isLoading.value) {
    searchStore.page = event.page + 1;
    fetchData(false);
  }
}

// 选择搜索历史
const selectHistory = (item: string) => {
  searchStore.keyword = item;
  // 只有当选择的关键词不为空时才触发搜索
  if (item.trim()) {
    fetchData(true);
  }
}

// 清除搜索
const clearSearch = () => {
  searchStore.keyword = '';
  showSuggestions.value = false;
  // 清除搜索后，如果是纯前端模式则重新加载所有小说，API模式则清空结果
  if (!appStore.isApiMode) {
    fetchData(true);
  } else {
    // API模式下清空搜索结果
    searchStore.records = [];
    searchStore.total = 0;
    searchStore.page = 1;
    offset.value = 0;
  }
}

// 随机推荐小说
const fetchRandomRecommendations = async () => {
  isLoadingRandom.value = true;
  showRandomResults.value = false;
  randomResults.value = [];

  try {
    let res;

    if (appStore.isApiMode) {
      // API模式：使用中文句号搜索
      res = await getRandomRecommendations();
      randomResults.value = res.records;
    } else {
      // 纯前端模式：从本地小说中随机选择
      const randomNovels = await getRandomNovels(9);
      console.log(randomNovels);
      // 转换为Record格式
      randomResults.value = randomNovels.map(item => {
        const novel = getNovelById(item.id);
        return {
          tid: item.id,
          title: item.title,
          count: item.count,
          author: item.author,
          pathParts: novel?.pathParts
        };
      });
    }

    showRandomResults.value = true;

    // toast.add({
    //   severity: "success",
    //   summary: "随机推荐",
    //   detail: appStore.isApiMode ? "已为您推荐随机小说" : "已从本地库中随机推荐",
    //   life: 2000,
    // });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '随机推荐失败';

    toast.add({
      severity: "error",
      summary: "推荐失败",
      detail: errorMessage,
      life: 3000,
    });
  } finally {
    isLoadingRandom.value = false;
  }
};

// 返回搜索模式
const backToSearch = () => {
  showRandomResults.value = false;
  randomResults.value = [];
};
</script>

<template>
  <div>
    <HomeTopBar
      :showAddNovelDialog="showAddNovelDialog"
      :favorites="favorites"
      :drawerVisible="drawerVisible"
      @update:showAddNovelDialog="showAddNovelDialog = $event"
      @update:drawerVisible="drawerVisible = $event"
    />
    <Drawer v-model:visible="drawerVisible" header="收藏夹" position="left" :dismissable="true"
      class="w-full! md:w-80! lg:w-120! bg-surface-50! dark:bg-surface-700!">
      <div v-if="favorites.length === 0" class="text-center text-gray-500 mt-4">
        暂无收藏
      </div>
      <div class="flex flex-col gap-4" v-else>
        <a v-for="item in favorites" :key="item.tid" :href="`/${item.tid}`" @click="e => handleCardClick(e, item.tid)"
          class="block">
          <Card class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-900! cursor-pointer">
            <template #title>
              <div class="flex justify-between">
                <p class="font-bold mr-2 break-all flex-1">{{ item.title }}</p>
                <div class="flex items-center gap-2">
                  <!-- 缓存按钮 -->
                  <Button
                    @click.stop.prevent="cacheNovel(item.tid, item.title)"
                    :disabled="cachingNovels.has(item.tid)"
                    :loading="cachingNovels.has(item.tid)"
                    size="small"
                    severity="secondary"
                    text
                    rounded
                    :title="cachedNovels.has(item.tid) ? '已缓存' : '缓存到本地'"
                    class="w-8 h-8 p-0"
                  >
                    <i :class="[
                      cachingNovels.has(item.tid) ? 'pi pi-spin pi-spinner' :
                      cachedNovels.has(item.tid) ? 'pi pi-check' : 'pi pi-download'
                    ]"
                    :style="{
                      color: cachedNovels.has(item.tid) ? 'var(--p-green-500)' : 'var(--p-text-color)'
                    }"></i>
                  </Button>
                  <!-- 收藏按钮 -->
                  <i v-if="isFav(item.tid)" class="pi pi-star-fill" @click.stop.prevent="removeFav(item.tid)"
                    :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                  <i v-else class="pi pi-star" @click.stop.prevent="addFav(item.tid, item.title)"
                    :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                </div>
              </div>
            </template>
            <template #content>
              <ProgressBar :value="Math.floor(progress.find(p => p.tid === item.tid)?.progress ?? 0)" />
            </template>
          </Card>
        </a>
      </div>
    </Drawer>
    <div class=" overflow-x-hidden">
      <div class=" flex flex-col items-center justify-center ">
        <div class=" flex flex-col items-center justify-center mt-25 md:mb-10 mb-4">
          <h1
            class=" text-5xl font-bold bg-linear-to-bl from-violet-500 to-fuchsia-500 text-transparent bg-clip-text p-1 text-center px-4">
            <span class="block sm:inline">搜书吧<span class="hidden sm:inline">：</span></span>
            <span class="block sm:inline mt-2 sm:mt-0">大図書館</span>
          </h1>
          <h6 class=" text-gray-300 mt-2">搜书吧全文搜索(FTS)</h6>

        </div>
        <div class=" max-w-7xl w-full px-8 flex flex-col gap-4">
          <!-- 搜索功能 -->
          <Form @submit="fetchData(true)" class="flex justify-center flex-col gap-4">
            <div class="flex flex-col gap-2">
              <!-- 自定义搜索输入框 -->
              <div class="relative">
                <InputText
                  ref="searchInputRef"
                  v-model="searchStore.keyword"
                  placeholder="搜索..."
                  class="w-full pr-24"
                  :style="{ fontSize: '16px' }"
                  @keyup.enter="fetchData(true)"
                  @focus="showSuggestions = true"
                  @blur="hideSuggestions"
                />
                <!-- 清除按钮 -->
                <button
                  v-if="searchStore.keyword"
                  type="button"
                  @click="clearSearch"
                  class="absolute right-10 top-1/2 transform -translate-y-1/2 p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  title="清除搜索"
                >
                  <i class="pi pi-times text-lg"></i>
                </button>
                <!-- 放大镜图标 -->
                <button
                  type="button"
                  @click="fetchData(true)"
                  class="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  title="搜索"
                >
                  <i class="pi pi-search text-lg"></i>
                </button>

                <!-- 搜索历史下拉 -->
                <div
                  v-if="showSuggestions && searchStore.keyword && filteredHistory.length > 0"
                  class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
                >
                  <!-- 清空历史记录按钮 -->
                  <div
                    v-if="filteredHistory.length > 1"
                    @mousedown="clearSearchHistory"
                    class="px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer text-sm flex items-center justify-between border-b border-surface-200 dark:border-surface-700 text-red-600 dark:text-red-400"
                  >
                    <span class="flex items-center">
                      <i class="pi pi-trash mr-2"></i>
                      清空搜索历史
                    </span>
                    <span class="text-xs text-surface-500">
                      ({{ filteredHistory.length }} 条)
                    </span>
                  </div>
                  <div
                    v-for="(item, index) in filteredHistory"
                    :key="index"
                    class="group px-4 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer text-sm flex items-center justify-between"
                  >
                    <div
                      @mousedown="selectHistory(item)"
                      class="flex items-center flex-1 min-w-0"
                    >
                      <i class="pi pi-history mr-2 text-surface-400 flex-shrink-0"></i>
                      <span class="truncate">{{ item }}</span>
                    </div>
                    <button
                      @mousedown.stop="removeSearchHistoryItem(item, $event)"
                      class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 dark:text-red-400 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                      title="删除此记录"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-4">
                <!-- 搜索选项区域 -->
                <div class="flex flex-col gap-2">
                  <Message size="small" severity="secondary" variant="simple">
                    <div class=" flex flex-row items-center gap-2">
                      <p>搜索指南</p>
                      <router-link to="/doc">
                        <i class="pi pi-question-circle"></i>
                      </router-link>
                    </div>
                  </Message>
                  <div class="flex flex-col ">
                    <RadioButtonGroup v-model="searchStore.target" name="ingredient" class="flex flex-wrap gap-4">
                      <!-- 纯前端模式选项 -->
                      <template v-if="!appStore.isApiMode">
                        <div class="flex items-center gap-2">
                          <RadioButton inputId="title" value="title" />
                          <label for="title">标题</label>
                        </div>
                        <div class="flex items-center gap-2">
                          <RadioButton inputId="author" value="author" />
                          <label for="author">作者</label>
                        </div>
                        <div class="flex items-center gap-2">
                          <RadioButton inputId="both" value="both" />
                          <label for="both">全部</label>
                        </div>
                      </template>

                      <!-- API模式选项 -->
                      <template v-else>
                        <div class="flex items-center gap-2">
                          <RadioButton inputId="title" value="title" />
                          <label for="title">标题</label>
                        </div>
                        <div class="flex items-center gap-2">
                          <RadioButton inputId="content" value="content" />
                          <label for="content">正文</label>
                        </div>
                        <div class="flex items-center gap-2">
                          <RadioButton inputId="both" value="both" />
                          <label for="both">全部</label>
                        </div>
                      </template>
                    </RadioButtonGroup>

                    <!-- 显示作者开关和随机推荐 -->
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          id="show-author"
                          v-model="showAuthor"
                          class="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                        <label for="show-author" class="text-surface-600 dark:text-surface-400 cursor-pointer">
                          显示作者信息
                        </label>
                      </div>

                      <!-- 随机推荐按钮 -->
                      <Button
                        icon="pi pi-refresh"
                        label="随机推荐"
                        aria-label="Random"
                        @click="fetchRandomRecommendations"
                        :loading="isLoadingRandom"
                        severity="secondary"
                        outlined
                        size="small"
                        class="flex-shrink-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>

          <!-- 小说内容 -->
            <!-- 随机推荐标题 -->
          <div v-if="showRandomResults" class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
              随机推荐结果
              <span class="text-sm text-surface-600 dark:text-surface-400 ml-2">
                ({{ randomResults.length }} 本小说)
              </span>
            </h2>
            <Button
              icon="pi pi-arrow-left"
              label="返回搜索"
              severity="secondary"
              outlined
              @click="backToSearch"
              size="small"
            />
          </div>

          <!-- 随机推荐加载状态 -->
          <div class="grid md:grid-cols-2 grid-cols-1 gap-4" v-if="isLoadingRandom">
            <Skeleton height="15rem"
              class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
              v-for="_ in 10"></Skeleton>
          </div>

          <!-- 随机推荐结果 -->
          <div class="columns-1 sm:columns-2 md:columns-3 gap-4" v-else-if="showRandomResults">
            <a v-for="item in randomResults" :key="item.tid" :href="`/${item.tid}`"
              @click="e => handleCardClick(e, item.tid)" class="block mb-4 break-inside-avoid">
              <Card
                class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer">
                <template #title>
                  <div class="flex justify-between">
                    <p class="font-bold break-all mr-2">{{ item.title }}</p>
                    <i v-if="isFav(item.tid)" class="pi pi-star-fill" @click.stop.prevent="removeFav(item.tid)"
                      :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                    <i v-else class="pi pi-star" @click.stop.prevent="addFav(item.tid, item.title)"
                      :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                  </div>
                </template>
                <template #content>
                  <div class="flex justify-between items-center gap-2">
                    <p v-if="showAuthor && item.author" class="m-0 text-sm text-gray-400 flex-shrink-0">
                      作者: {{ item.author || formatAuthorName(getNovelPathInfo(item.tid)) }}
                    </p>
                    <p class="m-0 text-sm text-gray-500" :class="{ 'text-right': showAuthor && item.author }">
                      字数: {{ formatWordCount(item.count) }}
                    </p>
                  </div>
                </template>
              </Card>
            </a>
          </div>

          <!-- 搜索结果 -->
          <template v-else>
            <div class="grid md:grid-cols-2 grid-cols-1 gap-4" v-if="isLoading">
              <Skeleton height="15rem"
                class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
                v-for="_ in 10"></Skeleton>
            </div>
            <div class="columns-1 sm:columns-2 md:columns-3 gap-4" v-else>
              <a v-for="item in searchStore.records" :key="item.tid" :href="`/${item.tid}`"
                @click="e => handleCardClick(e, item.tid)" class="block mb-4 break-inside-avoid">
                <Card
                  class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer">
                  <template #title>
                    <div class="flex justify-between">
                      <p class="font-bold break-all mr-2">{{ item.title }}</p>
                      <i v-if="isFav(item.tid)" class="pi pi-star-fill" @click.stop.prevent="removeFav(item.tid)"
                        :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                      <i v-else class="pi pi-star" @click.stop.prevent="addFav(item.tid, item.title)"
                        :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                    </div>
                  </template>
                  <template #content>
                    <div class="flex justify-between items-center gap-2">
                      <p v-if="showAuthor && item.author" class="m-0 text-sm text-gray-400 flex-shrink-0">
                        作者: {{ formatAuthorName(getNovelPathInfo(item.tid)) }}
                      </p>
                      <p class="m-0 text-sm text-gray-500" :class="{ 'text-right': showAuthor && item.author }">
                        字数: {{ formatWordCount(item.count) }}
                      </p>
                    </div>
                  </template>
                </Card>
              </a>
            </div>
          </template>
          <!-- 分页器 - 只在搜索模式下显示 -->
          <div v-if="!showRandomResults">
            <Paginator :rows=rows :totalRecords=searchStore.total v-model:first="offset" @page="onPageChange"
              v-if="searchStore.total !== 0" :template="{
                // '480px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink JumpToPageDropdown JumpToPageInput',
                // '640px': 'PrevPageLink CurrentPageReport NextPageLink',
                // '960px': 'FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink',
                // '1300px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
                default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink JumpToPageDropdown JumpToPageInput'
              }">
            </Paginator>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 添加小说对话框 -->
  <AddNovelDialog
    v-model="showAddNovelDialog"
    @added="handleNovelAdded"
  />

  <!-- API设置对话框 -->
  <ApiSettingsDialog
    v-model="appStore.showApiSettings"
  />
</template>
