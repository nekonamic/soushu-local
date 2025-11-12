<template>
  <div class="min-h-screen bg-surface-0 dark:bg-surface-950">
    <!-- 导航栏 -->
    <div class="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-300/50 dark:border-gray-700/50">
      <!-- 返回按钮 -->
      <Button
        icon="pi pi-arrow-left"
        label="返回"
        severity="secondary"
        outlined
        @click="goBack"
        size="small"
        class="flex-shrink-0"
      />

      <!-- 占位空间（右侧对齐夜间模式按钮） -->
      <div class="flex-1"></div>

      <!-- 夜间模式切换按钮 -->
      <button
        type="button"
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950 flex-shrink-0"
        @click="toggleDarkMode"
        title="切换主题"
      >
        <i :class="['pi text-base', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
      </button>
    </div>

    <!-- 页面标题区域 -->
    <div class="text-center mt-6 mb-4 px-4">
      <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 mb-2">
        缓存管理
      </h1>
      <p class="text-sm text-surface-600 dark:text-surface-400">
        管理所有缓存的小说，包括URL来源和本地上传的文件
      </p>
    </div>

    <div class="container mx-auto px-4 pt-4 pb-8">

      <!-- 统计信息 -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card class="text-center p-2 sm:p-4">
          <template #content>
            <div class="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1 sm:mb-2">
              {{ totalNovels }}
            </div>
            <div class="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
              总缓存数
            </div>
          </template>
        </Card>

        <Card class="text-center p-2 sm:p-4">
          <template #content>
            <div class="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-1 sm:mb-2">
              {{ urlNovels }}
            </div>
            <div class="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
              URL来源
            </div>
          </template>
        </Card>

        <Card class="text-center p-2 sm:p-4">
          <template #content>
            <div class="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
              {{ uploadNovels }}
            </div>
            <div class="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
              本地上传
            </div>
          </template>
        </Card>

        <Card class="text-center p-2 sm:p-4 hidden sm:block">
          <template #content>
            <div class="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1 sm:mb-2">
              {{ totalSize }}
            </div>
            <div class="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
              总大小
            </div>
          </template>
        </Card>

        <Card class="text-center p-2 sm:p-4 hidden lg:block">
          <template #content>
            <div class="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1 sm:mb-2">
              {{ recordCacheInfo ? '已缓存' : '未缓存' }}
            </div>
            <div class="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
              Record缓存
            </div>
            <div v-if="recordCacheInfo" class="text-xs text-surface-500 mt-1">
              {{ formatFileSize(recordCacheInfo.size) }}
            </div>
          </template>
        </Card>
      </div>

      <!-- 操作栏 -->
      <div class="mb-6">
        <!-- 桌面端和平板端：所有按钮和搜索框在一行 -->
        <div class="hidden sm:flex flex-wrap items-center gap-3">
          <Button
            label="刷新"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            @click="refreshCache"
            :loading="isLoading"
            size="small"
          />

          <Button
            label="添加小说"
            icon="pi pi-plus"
            @click="showAddNovelDialog = true"
            size="small"
          />

          <Button
            label="清理缓存"
            icon="pi pi-trash"
            severity="secondary"
            outlined
            @click="cleanupExpiredCache"
            :loading="isCleaning"
            size="small"
          />

          <Button
            label="刷新Record"
            icon="pi pi-refresh"
            severity="warning"
            outlined
            @click="refreshRecordCache"
            :loading="isRefreshingRecord"
            size="small"
          />

          <Button
            label="清空搜索历史"
            icon="pi pi-history"
            severity="danger"
            outlined
            @click="clearSearchHistory"
            size="small"
          />

          <!-- 搜索框 -->
          <div class="flex items-center gap-2">
            <InputText
              v-model="searchKeyword"
              placeholder="搜索缓存小说..."
              class="w-64"
            />
            <Button
              icon="pi pi-search"
              severity="secondary"
              outlined
              @click="handleSearch"
              size="small"
            />
          </div>
        </div>

        <!-- 移动端：垂直布局 -->
        <div class="sm:hidden space-y-3">
          <!-- 主要操作按钮 -->
          <div class="flex gap-2">
            <Button
              label="刷新"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              @click="refreshCache"
              :loading="isLoading"
              size="small"
              class="flex-1"
            />

            <Button
              label="添加小说"
              icon="pi pi-plus"
              @click="showAddNovelDialog = true"
              size="small"
              class="flex-1"
            />

            <!-- 更多操作按钮 -->
            <Button
              icon="pi pi-ellipsis-h"
              severity="secondary"
              outlined
              size="small"
              @click="showMobileMenu = !showMobileMenu"
              aria-label="更多操作"
            />
          </div>

          <!-- 搜索框 -->
          <div class="flex items-center gap-2">
            <InputText
              v-model="searchKeyword"
              placeholder="搜索缓存小说..."
              class="flex-1"
            />
            <Button
              icon="pi pi-search"
              severity="secondary"
              outlined
              @click="handleSearch"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- 移动端次要操作菜单 -->
      <div v-if="showMobileMenu" class="sm:hidden mb-4 p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
        <div class="grid grid-cols-2 gap-2">
          <Button
            label="清理缓存"
            icon="pi pi-trash"
            severity="secondary"
            outlined
            @click="cleanupExpiredCache"
            :loading="isCleaning"
            size="small"
            class="w-full"
          />

          <Button
            label="刷新Record"
            icon="pi pi-refresh"
            severity="warning"
            outlined
            @click="refreshRecordCache"
            :loading="isRefreshingRecord"
            size="small"
            class="w-full col-span-2"
          />

          <Button
            label="清空搜索历史"
            icon="pi pi-history"
            severity="danger"
            outlined
            @click="clearSearchHistory"
            size="small"
            class="w-full"
          />
        </div>
      </div>

      <!-- 缓存列表 -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="bg-surface-100 dark:bg-surface-800 rounded-lg p-6">
          <Skeleton width="60%" height="1rem" class="mb-2" />
          <Skeleton width="40%" height="0.875rem" class="mb-4" />
          <Skeleton width="80%" height="0.875rem" />
        </div>
      </div>

      <div v-else-if="filteredNovels.length === 0" class="text-center py-12">
        <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
        <h3 class="text-xl font-medium text-surface-600 dark:text-surface-400 mb-2">
          没有缓存小说
        </h3>
        <p class="text-surface-500">
          点击"添加小说"按钮来缓存你的第一本小说
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="novel in filteredNovels"
          :key="novel.id"
          class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 sm:p-6 transition-all hover:shadow-lg"
        >
          <!-- 小说信息区域 -->
          <div class="mb-4">
            <div class="flex items-start gap-2 mb-3">
              <h3 class="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-100 flex-1 leading-tight">
                {{ novel.title }}
              </h3>
              <Tag
                :value="novel.sourceType === 'url' ? 'URL' : novel.sourceType === 'upload' ? '本地上传' : '服务器'"
                :severity="novel.sourceType === 'url' ? 'info' : novel.sourceType === 'upload' ? 'success' : 'secondary'"
                class="text-xs flex-shrink-0"
              />
            </div>

            <div class="space-y-1 text-sm">
              <p class="text-surface-600 dark:text-surface-400">
                作者: {{ novel.author }}
              </p>
              <p class="text-surface-500">
                大小: {{ novel.fileSize }} | 字数: {{ formatWordCount(novel.wordCount) }}
              </p>
              <p class="text-xs text-surface-400">
                缓存时间: {{ formatDate(novel.lastUpdate) }}
                <span v-if="novel.sourceUrl" class="ml-2">
                  来源: {{ getDomainFromUrl(novel.sourceUrl) }}
                </span>
              </p>
            </div>
          </div>

          <!-- 操作按钮区域 -->
          <div class="flex flex-wrap gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
            <Button
              icon="pi pi-book-open"
              label="阅读"
              size="small"
              @click="e => handleCardClick(e, novel.id)"
              class="flex-1 min-w-14 max-w-18 sm:min-w-20 sm:max-w-32 mobile-button-small"
            />

            <Button
              :label="isFav(novel) ? '已收藏' : '收藏'"
              :severity="isFav(novel) ? 'warning' : 'secondary'"
              size="small"
              :outlined="!isFav(novel)"
              @click="toggleFav(novel)"
              class="flex-1 min-w-14 max-w-18 sm:min-w-20 sm:max-w-32 mobile-button-small"
            />

            <Button
              icon="pi pi-pencil"
              label="编辑"
              size="small"
              severity="info"
              outlined
              @click="openEditDialog(novel)"
              class="flex-1 min-w-14 max-w-18 sm:min-w-20 sm:max-w-32 mobile-button-small"
            />

            <Button
              v-if="novel.sourceUrl"
              icon="pi pi-sync"
              label="更新"
              size="small"
              severity="secondary"
              outlined
              @click="updateNovel(novel)"
              :loading="updatingNovels.has(novel.id)"
              class="flex-1 min-w-14 max-w-18 sm:min-w-20 sm:max-w-32 mobile-button-small"
            />

            <Button
              icon="pi pi-trash"
              label="删除"
              size="small"
              severity="danger"
              outlined
              @click="confirmDeleteNovel(novel)"
              class="flex-1 min-w-14 max-w-18 sm:min-w-20 sm:max-w-32 mobile-button-small"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 添加小说对话框 -->
    <AddNovelDialog
      v-model="showAddNovelDialog"
      @added="handleNovelAdded"
    />

    <!-- 编辑元数据对话框 -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="编辑元数据"
      :style="{ width: '90vw', maxWidth: '500px' }"
      :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    >
      <div class="space-y-4">
        <!-- 标题编辑 -->
        <div>
          <label for="edit-title" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            小说标题
          </label>
          <InputText
            id="edit-title"
            v-model="editForm.title"
            placeholder="请输入小说标题"
            class="w-full"
            :class="{ 'p-invalid': !editForm.title.trim() }"
          />
          <small v-if="!editForm.title.trim()" class="text-red-600">
            标题不能为空
          </small>
        </div>

        <!-- 作者编辑 -->
        <div>
          <label for="edit-author" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            作者名称
          </label>
          <InputText
            id="edit-author"
            v-model="editForm.author"
            placeholder="请输入作者名称"
            class="w-full"
          />
          <small class="text-surface-500">
            可选，留空将显示为"未知作者"
          </small>
        </div>

        <!-- 原始信息显示 -->
        <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
          <p class="text-sm text-surface-600 dark:text-surface-400 mb-1">原始信息：</p>
          <p class="text-sm"><strong>标题：</strong>{{ editingNovel?.title }}</p>
          <p class="text-sm"><strong>作者：</strong>{{ editingNovel?.author }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <Button
            label="取消"
            icon="pi pi-times"
            severity="secondary"
            outlined
            @click="cancelEdit"
          />
          <Button
            label="保存"
            icon="pi pi-save"
            :disabled="!editForm.title.trim()"
            @click="saveEdit"
            autofocus
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import Dialog from 'primevue/dialog'
import { novelCacheManager } from '@/utils/novelCacheManager'
import { novelFetcher } from '@/utils/novelFetcher'
import { novelManager } from '@/data/novels'
import type { CachedNovel } from '@/data/novels'
import HomeTopBar from '@/components/HomeTopBar.vue'
import AddNovelDialog from '@/components/AddNovelDialog.vue'
import { useLayout } from "@/composables/useLayout"
import { useLocalStorage } from '@vueuse/core'
import type { Fav } from '@/types/Fav'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isDarkMode, toggleDarkMode, setColors } = useLayout()

const cachedNovels = ref<CachedNovel[]>([])
const isLoading = ref(false)
const isCleaning = ref(false)
const isRefreshingRecord = ref(false)
const searchKeyword = ref('')
const showAddNovelDialog = ref(false)
const showMobileMenu = ref(false)
const showEditDialog = ref(false)
const editingNovel = ref<CachedNovel | null>(null)
const editForm = ref({ title: '', author: '' })
const updatingNovels = ref(new Set<number>())
const recordCacheInfo = ref<{ exists: boolean; timestamp: number; size: number } | null>(null)

// 收藏夹相关
const favorites = useLocalStorage<Fav[]>('favorites', [])

const goBack = () => {
  router.push('/')
}
// 计算统计数据
const totalNovels = computed(() => cachedNovels.value.length)
const urlNovels = computed(() => cachedNovels.value.filter(n => n.sourceType === 'url').length)
const uploadNovels = computed(() => cachedNovels.value.filter(n => n.sourceType === 'upload').length)

// 计算总大小
const totalSize = computed(() => {
  const totalBytes = cachedNovels.value.reduce((sum, novel) => sum + novel.cacheSize, 0)
  if (totalBytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(totalBytes) / Math.log(k))
  return parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
})

// 过滤小说
const filteredNovels = computed(() => {
  if (!searchKeyword.value.trim()) {
    return cachedNovels.value
  }

  const keyword = searchKeyword.value.toLowerCase()
  return cachedNovels.value.filter(novel =>
    novel.title.toLowerCase().includes(keyword) ||
    novel.author.toLowerCase().includes(keyword)
  )
})

// 加载缓存列表
const loadCachedNovels = async () => {
  isLoading.value = true
  try {
    cachedNovels.value = await novelCacheManager.getAllCachedNovels()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载缓存列表',
      life: 3000
    })
  } finally {
    isLoading.value = false
  }
}

// 刷新缓存
const refreshCache = () => {
  loadCachedNovels()
}

// 清理过期缓存
const cleanupExpiredCache = async () => {
  isCleaning.value = true
  try {
    await novelCacheManager.cleanupExpiredCache()
    await loadCachedNovels()

    toast.add({
      severity: 'success',
      summary: '清理完成',
      detail: '已清理过期缓存',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '清理失败',
      detail: '无法清理过期缓存',
      life: 3000
    })
  } finally {
    isCleaning.value = false
  }
}

// 搜索
const handleSearch = () => {
  // 搜索逻辑已在computed中处理
}

// 刷新record缓存
const refreshRecordCache = async () => {
  isRefreshingRecord.value = true

  try {
    await novelManager.refreshCache()
    await loadRecordCacheInfo()

    toast.add({
      severity: 'success',
      summary: '刷新成功',
      detail: 'Record缓存已更新',
      life: 3000
    })
  } catch (error) {
    console.error('刷新record缓存失败:', error)
    toast.add({
      severity: 'error',
      summary: '刷新失败',
      detail: error || '刷新record缓存失败',
      life: 5000
    })
  } finally {
    isRefreshingRecord.value = false
  }
}

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
      // 清空localStorage中的搜索历史
      localStorage.removeItem('history');

      toast.add({
        severity: 'success',
        summary: '清空成功',
        detail: '搜索历史已清空',
        life: 3000
      });
    }
  });
}

// 加载record缓存信息
const loadRecordCacheInfo = async () => {
  try {
    recordCacheInfo.value = await novelManager.getCacheInfo()
  } catch (error) {
    console.warn('加载record缓存信息失败:', error)
    recordCacheInfo.value = null
  }
}

// 打开小说
const openNovel = (novel: CachedNovel) => {
  // 使用统一的路由格式
  router.push(`/${novel.id}`)
}
function handleCardClick(event: MouseEvent, tid: number) {
  if (event.button === 0) {
    event.preventDefault();
    router.push(`/${tid}`);
  }
}

// 收藏夹相关方法
const isFav = (novel: CachedNovel) => {
  // 检查是否在收藏夹中，优先通过cacheKey匹配，其次通过tid匹配
  return favorites.value.some((f) =>
    f.cacheKey === `cached_${novel.id}` || f.tid === novel.id
  );
};

const addFav = (novel: CachedNovel) => {
  const fav: Fav = {
    tid: novel.id,
    title: novel.title,
    cacheKey: `cached_${novel.id}` // 使用特定前缀标识缓存小说
  };
  if (!isFav(novel)) {
    favorites.value.push(fav);
    toast.add({
      severity: "success",
      summary: "收藏成功",
      detail: `已将《${novel.title}》添加到收藏夹`,
      life: 2000,
    });
  }
};

const removeFav = (novel: CachedNovel) => {
  favorites.value = favorites.value.filter((f) =>
    !(f.cacheKey === `cached_${novel.id}` || f.tid === novel.id)
  );
  toast.add({
    severity: "warn",
    summary: "取消收藏",
    detail: `已将《${novel.title}》从收藏夹移除`,
    life: 2000,
  });
};

const toggleFav = (novel: CachedNovel) => {
  if (isFav(novel)) {
    removeFav(novel);
  } else {
    addFav(novel);
  }
};

// 更新URL小说
const updateNovel = async (novel: CachedNovel) => {
  if (!novel.sourceUrl) return

  updatingNovels.value.add(novel.id)

  try {
    toast.add({
      severity: 'info',
      summary: '更新中',
      detail: '正在检查URL是否有效并更新内容...',
      life: 3000
    })

    const result = await novelFetcher.updateUrlNovel(novel.id, novel.sourceUrl)

    if (result.updated) {
      toast.add({
        severity: 'success',
        summary: '更新成功',
        detail: '小说内容已更新',
        life: 3000
      })
      await loadCachedNovels()
    } else {
      toast.add({
        severity: 'info',
        summary: '无需更新',
        detail: '小说内容已是最新',
        life: 3000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '更新失败',
      detail: error,
      life: 5000
    })
  } finally {
    updatingNovels.value.delete(novel.id)
  }
}

// 确认删除
const confirmDeleteNovel = (novel: CachedNovel) => {
  confirm.require({
    message: `确定要删除《${novel.title}》吗？此操作不可撤销。`,
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      deleteNovel(novel)
    },
    reject: () => {
      // 取消删除
    }
  })
}

// 删除小说
const deleteNovel = async (novel: CachedNovel) => {
  try {
    await novelCacheManager.deleteCachedNovel(novel.id)
    await loadCachedNovels()

    toast.add({
      severity: 'success',
      summary: '删除成功',
      detail: `已删除《${novel.title}》`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: error,
      life: 3000
    })
  }
}

// 打开编辑对话框
const openEditDialog = (novel: CachedNovel) => {
  editingNovel.value = novel
  editForm.value = {
    title: novel.title,
    author: novel.author
  }
  showEditDialog.value = true
}

// 保存编辑
const saveEdit = async () => {
  if (!editingNovel.value) return

  try {
    await novelCacheManager.updateNovelMetadata(editingNovel.value.id, {
      title: editForm.value.title.trim(),
      author: editForm.value.author.trim()
    })

    toast.add({
      severity: 'success',
      summary: '更新成功',
      detail: `《${editForm.value.title}》的元数据已更新`,
      life: 3000
    })

    await loadCachedNovels()
    showEditDialog.value = false
    editingNovel.value = null
  } catch (error) {
    console.error('更新失败:', error)
    toast.add({
      severity: 'error',
      summary: '更新失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  }
}

// 取消编辑
const cancelEdit = () => {
  showEditDialog.value = false
  editingNovel.value = null
  editForm.value = { title: '', author: '' }
}

// 处理小说添加成功
const handleNovelAdded = (novel: CachedNovel) => {
  toast.add({
    severity: 'success',
    summary: '添加成功',
    detail: `《${novel.title}》已添加到缓存`,
    life: 3000
  })
  loadCachedNovels()
  showAddNovelDialog.value = false
}

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatWordCount = (count: number): string => {
  if (count === 0) return '未知'
  return count.toLocaleString() + '字'
}

const formatDate = (date: Date): string => {
  try {
    // 检查日期是否有效
    if (!date || isNaN(date.getTime())) {
      return '未知时间'
    }

    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch (error) {
    console.warn('日期格式化失败:', error, date)
    return '未知时间'
  }
}

const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return '未知域名'
  }
}

onMounted(() => {
  setColors()
  loadCachedNovels()
  loadRecordCacheInfo()
})
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 移动端触摸优化 */
@media (max-width: 640px) {
  /* 增加按钮触摸区域 */
  :deep(.p-button) {
    min-height: 44px;
    padding: 0.75rem 1rem;
  }

  /* 手机端小按钮样式 */
  :deep(.mobile-button-small) {
    min-height: 32px !important;
    max-width: 70px !important;
    padding: 0.375rem 0.375rem !important;
    font-size: 0.75rem !important;
  }

  :deep(.mobile-button-small .p-button-label) {
    font-size: 0.75rem !important;
  }

  :deep(.mobile-button-small .p-button-icon) {
    font-size: 0.75rem !important;
  }

  /* 优化输入框触摸体验 */
  :deep(.p-inputtext) {
    min-height: 44px;
    font-size: 16px; /* 防止iOS缩放 */
  }

  /* 卡片间距优化 */
  .bg-surface-50 {
    margin-bottom: 1rem;
  }

  /* 标签文字大小优化 */
  :deep(.p-tag) {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }

  /* 骨架屏优化 */
  :deep(.p-skeleton) {
    min-height: 20px;
  }
}

/* 平板端优化 */
@media (min-width: 641px) and (max-width: 1024px) {
  .bg-surface-50 {
    padding: 1rem;
  }
}

/* 按钮悬停效果优化 */
:deep(.p-button:hover) {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

/* 卡片悬停效果 */
.bg-surface-50:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

/* 桌面端按钮宽度限制 */
@media (min-width: 641px) {
  :deep(.p-button) {
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 大屏幕进一步优化 */
@media (min-width: 1024px) {
  :deep(.p-button) {
    max-width: 128px;
  }
}
</style>