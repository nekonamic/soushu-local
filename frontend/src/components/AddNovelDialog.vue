<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="添加小说"
    :style="{ width: '90vw', maxWidth: '600px' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
  >
    <div class="space-y-6">
      <!-- Tab选择 -->
      <div class="flex justify-center">
        <div class="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
          <button
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'url'
                ? 'bg-primary text-primary-contrast'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
            ]"
            @click="activeTab = 'url'"
          >
            <i class="pi pi-link mr-2"></i>
            URL链接
          </button>
          <button
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'custom'
                ? 'bg-primary text-primary-contrast'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
            ]"
            @click="activeTab = 'custom'"
          >
            <i class="pi pi-code mr-2"></i>
            自定义解析
          </button>
          <button
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'upload'
                ? 'bg-primary text-primary-contrast'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
            ]"
            @click="activeTab = 'upload'"
          >
            <i class="pi pi-upload mr-2"></i>
            本地文件
          </button>
        </div>
      </div>

      <!-- URL输入区域 -->
      <div v-if="activeTab === 'url'" class="space-y-4">
        <div>
          <label for="novel-url" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            小说链接
          </label>
          <InputText
            id="novel-url"
            v-model="urlInput"
            placeholder="请输入txt文件的URL链接"
            :class="{ 'p-invalid': urlError }"
            class="w-full"
          />
          <small v-if="urlError" class="text-red-500">
            {{ urlError }}
            <div v-if="urlValidationError?.type === 'cors'" class="mt-2">
              <Button
                label="强制添加"
                icon="pi pi-exclamation-triangle"
                size="small"
                severity="warning"
                @click="forceAddUrl"
                :loading="isLoading"
              />
              <div class="text-xs text-surface-500 mt-1">
                由于CORS限制无法验证，但你可以强制添加此链接
              </div>
            </div>
          </small>
          <small v-if="!urlError" class="text-surface-500">支持HTTP/HTTPS直链的txt文件</small>
        </div>

        <div v-if="urlPreview" class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
          <h4 class="font-medium mb-2">小说预览</h4>
          <div class="space-y-1 text-sm">
            <p><strong>标题:</strong> {{ urlPreview.title }}</p>
            <p><strong>作者:</strong> {{ urlPreview.author }}</p>
            <p><strong>大小:</strong> {{ urlPreview.fileSize }}</p>
          </div>
        </div>
      </div>

      <!-- 自定义解析区域 -->
      <div v-if="activeTab === 'custom'" class="space-y-4">
        <div>
          <label for="custom-url" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            JSON接口链接
          </label>
          <InputText
            id="custom-url"
            v-model="customUrlInput"
            placeholder="请输入返回JSON数据的API接口链接"
            :class="{ 'p-invalid': customUrlError }"
            class="w-full"
          />
          <small v-if="customUrlError" class="text-red-500">
            {{ customUrlError }}
          </small>
          <small v-if="!customUrlError" class="text-surface-500">支持返回JSON数据的HTTP/HTTPS接口</small>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="title-path" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              标题路径 <span class="text-xs text-surface-500">(可选，默认: title)</span>
            </label>
            <InputText
              id="title-path"
              v-model="customTitlePath"
              placeholder="例如: results.record.filename"
              class="w-full"
            />
            <small class="text-surface-500">使用点号分隔路径，如 data.title</small>
          </div>

          <div>
            <label for="content-path" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              内容路径 <span class="text-xs text-surface-500">(可选，默认: content)</span>
            </label>
            <InputText
              id="content-path"
              v-model="customContentPath"
              placeholder="例如: data.content"
              class="w-full"
            />
            <small class="text-surface-500">指向小说正文内容的路径</small>
          </div>

          <div>
            <label for="author-path" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              作者路径 <span class="text-xs text-surface-500">(可选，默认: author)</span>
            </label>
            <InputText
              id="author-path"
              v-model="customAuthorPath"
              placeholder="例如: data.author"
              class="w-full"
            />
            <small class="text-surface-500">作者信息路径，可留空</small>
          </div>

          <div class="flex items-end">
            <Button
              label="预览解析"
              icon="pi pi-eye"
              severity="secondary"
              outlined
              @click="previewCustomJson"
              :loading="isPreviewing"
              :disabled="!customUrlInput"
            />
          </div>
        </div>

        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h5 class="font-medium text-blue-800 dark:text-blue-200 mb-2">
            <i class="pi pi-info-circle mr-2"></i>使用说明
          </h5>
          <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• 路径使用点号分隔，如 <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">data.items[0].title</code></li>
            <li>• 支持数组索引，如 <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">results[0].content</code></li>
            <li>• 留空则使用默认路径：title、content、author</li>
            <li>• 系统会智能匹配常见字段名</li>
          </ul>
        </div>

        <div v-if="customPreview" class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
          <h4 class="font-medium mb-2">解析预览</h4>
          <div class="space-y-1 text-sm">
            <p><strong>标题:</strong> {{ customPreview.title || '未找到' }}</p>
            <p><strong>作者:</strong> {{ customPreview.author || '未找到' }}</p>
            <p><strong>内容长度:</strong> {{ customPreview.contentLength ? customPreview.contentLength.toLocaleString() + ' 字符' : '未找到' }}</p>
            <p><strong>内容预览:</strong> {{ customPreview.contentPreview || '未找到' }}</p>
          </div>
        </div>

        <div v-if="customError" class="text-red-500 text-sm">
          {{ customError }}
        </div>
      </div>

      <!-- 文件上传区域 -->
      <div v-if="activeTab === 'upload'" class="space-y-4">
        <div
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-surface-300 dark:border-surface-600 hover:border-primary'
          ]"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <i class="pi pi-cloud-upload text-4xl text-surface-400 mb-4"></i>
          <p class="text-lg font-medium text-surface-700 dark:text-surface-300 mb-2">
            拖拽文件到这里，或者点击选择文件
          </p>
          <p class="text-sm text-surface-500 mb-4">支持TXT格式，最大25MB</p>
          <input
            ref="fileInput"
            type="file"
            accept=".txt"
            class="hidden"
            @change="onFileSelect"
          />
          <Button
            label="选择文件"
            icon="pi pi-file"
            severity="secondary"
            outlined
            @click="fileInput?.click()"
          />
        </div>

        <div v-if="uploadError" class="text-red-500 text-sm">
          {{ uploadError }}
        </div>

        <div v-if="filePreview" class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
          <h4 class="font-medium mb-2">文件预览</h4>
          <div class="space-y-1 text-sm">
            <p><strong>文件名:</strong> {{ filePreview.name }}</p>
            <p><strong>大小:</strong> {{ formatFileSize(filePreview.size) }}</p>
            <p><strong>类型:</strong> {{ filePreview.type || 'text/plain' }}</p>
            <p><strong>最后修改:</strong> {{ formatDate(filePreview.lastModified) }}</p>
          </div>
        </div>
      </div>

      <!-- 加载进度 -->
      <div v-if="isLoading" class="space-y-2">
        <ProgressBar :value="progress.percentage" class="w-full" />
        <p class="text-sm text-center text-surface-600 dark:text-surface-400">
          {{ progressText }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <Button
          label="取消"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="visible = false"
        />
        <Button
          label="添加到缓存"
          icon="pi pi-plus"
          :disabled="!canAdd || isLoading"
          :loading="isLoading"
          @click="handleAddNovel"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ProgressBar from 'primevue/progressbar'
import { useConfirm } from 'primevue/useconfirm'
import { novelFetcher } from '@/utils/novelFetcher'
import { novelCacheManager } from '@/utils/novelCacheManager'
import type { CachedNovel } from '@/data/novels'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'added', novel: CachedNovel): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()
const confirm = useConfirm()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const activeTab = ref<'url' | 'custom' | 'upload'>('url')

// URL链接相关
const urlInput = ref('')
const urlError = ref('')
const urlPreview = ref<{ title: string; author: string; fileSize: string } | null>(null)
const urlValidationError = ref<{ type: string; message: string } | null>(null)
const showForceAdd = ref(false)

// 自定义解析相关
const customUrlInput = ref('')
const customUrlError = ref('')
const customTitlePath = ref('')
const customContentPath = ref('')
const customAuthorPath = ref('')
const customPreview = ref<{ title: string; author: string; contentLength: number; contentPreview: string } | null>(null)
const customError = ref('')
const isPreviewing = ref(false)

const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const uploadError = ref('')
const filePreview = ref<File | null>(null)
const isDragOver = ref(false)

const isLoading = ref(false)
const progress = ref({ loaded: 0, total: 0, percentage: 0 })
const progressText = ref('')

const canAdd = computed(() => {
  if (activeTab.value === 'url') {
    return urlInput.value.trim() && !urlError.value
  } else if (activeTab.value === 'custom') {
    return customUrlInput.value.trim() && !customUrlError.value && customPreview.value
  } else {
    return selectedFile.value && !uploadError.value
  }
})

// URL验证和预览
const validateUrl = async (url: string) => {
  urlError.value = ''
  urlPreview.value = null

  if (!url.trim()) {
    urlError.value = '请输入URL链接'
    return
  }

  try {
    new URL(url) // 验证URL格式
  } catch {
    urlError.value = 'URL格式不正确'
    return
  }

  if (!url.match(/^https?:\/\/.+/)) {
    urlError.value = '请输入HTTP或HTTPS链接'
    return
  }

  try {
    // 使用新的URL验证方法
    const validationResult = await novelFetcher.checkUrlValidityPublic(url)

    if (!validationResult.valid) {
      // 保存详细的错误信息
      urlValidationError.value = {
        type: validationResult.error?.type || 'unknown',
        message: validationResult.error?.message || '未知错误'
      }

      // 设置用户友好的错误信息
      urlError.value = validationResult.error?.message || 'URL验证失败'

      // 如果是CORS错误，显示强制添加选项
      if (validationResult.error?.type === 'cors') {
        showForceAdd.value = true
      }
      return
    }

    // 清除错误状态
    urlValidationError.value = null
    showForceAdd.value = false

    // 获取预览信息（只获取头部，不下载完整内容）
    const response = await fetch(url, { headers: { 'Range': 'bytes=0-1023' } })
    if (response.ok) {
      const content = await response.text()
      // 使用静态方法提取信息
      const extractInfo = (content: string, url: string) => {
        // 从URL提取文件名作为默认标题
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1] || '未知小说AddNovelDialog'
        const defaultTitle = fileName.replace(/\.[^/.]+$/, '') || '未知小说未知小说AddNovelDialog'

        let title = defaultTitle
        let author = '未知作者'

        // 尝试从内容中提取标题
        const titlePatterns = [
          /^.*?《(.+?)》/m,
          /^.*?书名[：:]\s*(.+?)$/m,
          /^.*?标题[：:]\s*(.+?)$/m,
          /^(.+?)\n.*第.*?章/m,
        ]

        for (const pattern of titlePatterns) {
          const match = content.match(pattern)
          if (match && match[1]) {
            title = match[1].trim()
            break
          }
        }

        // 尝试提取作者信息
        const authorPatterns = [
          /作者[：:]\s*(.+?)$/m,
          /作者[：:]\s*(.+?)\n/m,
          /著\s*(.+?)$/m,
          /编写[：:]\s*(.+?)$/m,
        ]

        for (const pattern of authorPatterns) {
          const match = content.match(pattern)
          if (match && match[1]) {
            author = match[1].trim()
            break
          }
        }

        if (title.length > 50) {
          title = title.substring(0, 47) + '...'
        }

        // 简单的大小估算
        const contentLength = content.length
        const fileSize = contentLength > 1024 * 1024
          ? `${(contentLength / (1024 * 1024)).toFixed(2)} MB`
          : contentLength > 1024
          ? `${(contentLength / 1024).toFixed(2)} KB`
          : `${contentLength} B`

        return { title, author, fileSize }
      }

      const { title, author, fileSize } = extractInfo(content, url)
      urlPreview.value = { title, author, fileSize }
    }
  } catch (error) {
    urlValidationError.value = {
      type: 'unknown',
      message: (error instanceof Error ? error.message : String(error)) || 'URL验证过程中发生未知错误'
    }
    urlError.value = (error instanceof Error ? error.message : String(error)) || 'URL验证失败'
  }
}

// 强制添加URL（跳过验证）
const forceAddUrl = () => {
  const url = urlInput.value.trim()
  if (!url) return

  confirm.require({
    message: `由于CORS限制，无法验证此URL，是否要强制添加？

URL: ${url}
错误类型: ${urlValidationError.value?.type || 'unknown'}

这将直接尝试缓存内容，如果失败会显示具体错误信息。`,
    header: '确认强制添加',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      addUrlNovelForce(url)
    },
    reject: () => {
      // 用户取消
    }
  })
}

// 强制添加URL小说的实现
const addUrlNovelForce = async (url: string) => {
  isLoading.value = true
  progressText.value = '正在强制添加小说，请稍候...'

  try {
    // 直接尝试缓存，跳过验证
    const result = await novelFetcher.cacheNovelFromUrl(url, {
      onProgress: (progressInfo) => {
        progress.value = progressInfo
        progressText.value = `下载中: ${progressInfo.percentage}% (${progressInfo.loaded}/${progressInfo.total})`
      }
    })

    if (result && result.cachedNovel) {
      toast.add({
        severity: 'success',
        summary: '添加成功',
        detail: `《${result.cachedNovel.title}》已添加到缓存`,
        life: 3000
      })

      emit('added', result.cachedNovel)
      visible.value = false
      resetForm()
    } else {
      throw new Error('缓存结果为空')
    }
  } catch (error) {
    console.error('强制添加失败:', error)
    toast.add({
      severity: 'error',
      summary: '添加失败',
      detail: `无法添加小说: ${error instanceof Error ? error.message : String(error)}`,
      life: 5000
    })
  } finally {
    isLoading.value = false
    progressText.value = ''
    progress.value = { loaded: 0, total: 0, percentage: 0 }
  }
}

// 监听URL输入变化
watch(urlInput, (newUrl) => {
  if (newUrl.trim()) {
    const timeout = setTimeout(() => validateUrl(newUrl), 500)
    return () => clearTimeout(timeout)
  }
})

// 文件处理
const onFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length > 0) {
    const file = files[0]
    if (file) {
      handleFileSelect(file)
    }
  }
}

const handleFileSelect = async (file: File) => {
  uploadError.value = ''
  selectedFile.value = file
  filePreview.value = file

  // 验证文件类型
  // 常见文本和代码文件后缀列表
  const supportedTextExtensions = [
    // 纯文本文件
    '.txt', '.text',

    // 代码文件
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',  // JavaScript/TypeScript相关
    '.html', '.htm', '.css', '.scss', '.sass', '.less',  // 网页相关
    '.json', '.xml', '.yaml', '.yml',  // 数据格式
    '.md', '.markdown',  // Markdown文档
    '.py', '.java', '.c', '.cpp', '.h', '.hpp',  // 编程语言
    '.php', '.rb', '.go', '.rs', '.swift', '.kt',  // 更多编程语言
    '.sql', '.sh', '.bash', '.zsh', '.ps1',  // 脚本和shell
    '.csv', '.log', '.ini', '.conf', '.config'  // 配置和数据文件
  ]
  // 检查是否支持该后缀
  const isSupported = supportedTextExtensions.some(ext => file.name.endsWith(ext))

  if (!isSupported) {
    throw new Error(`不支持的文件格式。支持的文件类型：${supportedTextExtensions.join(', ')}`)
  }
  // 验证文件
  // if (!file.name.toLowerCase().endsWith('.txt')) {
  //   uploadError.value = '只支持TXT文件格式'
  //   return
  // }

  const maxSize = 25 * 1024 * 1024 // 25MB
  if (file.size > maxSize) {
    uploadError.value = '文件大小不能超过25MB'
    return
  }
}

// 拖拽处理
const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file) {
      handleFileSelect(file)
    }
  }
}

// 自定义JSON解析预览
const previewCustomJson = async () => {
  customError.value = ''
  customPreview.value = null
  isPreviewing.value = true

  if (!customUrlInput.value.trim()) {
    customError.value = '请输入JSON接口链接'
    isPreviewing.value = false
    return
  }

  try {
    new URL(customUrlInput.value) // 验证URL格式
  } catch {
    customError.value = 'URL格式不正确'
    isPreviewing.value = false
    return
  }

  try {
    const config = {
      titlePath: customTitlePath.value.trim() || undefined,
      contentPath: customContentPath.value.trim() || undefined,
      authorPath: customAuthorPath.value.trim() || undefined
    }

    const preview = await novelFetcher.previewCustomJson(customUrlInput.value, config)
    customPreview.value = preview
  } catch (error) {
    customError.value = error instanceof Error ? error.message : '预览失败'
  } finally {
    isPreviewing.value = false
  }
}

// 添加小说
const handleAddNovel = async () => {
  isLoading.value = true
  progress.value = { loaded: 0, total: 0, percentage: 0 }
  progressText.value = '正在添加小说...'

  try {
    let result: { cachedNovel: CachedNovel; content: string }

    if (activeTab.value === 'url') {
      progressText.value = '正在从URL获取小说...'
      result = await novelFetcher.cacheNovelFromUrl(urlInput.value, {
        onProgress: (p) => {
          progress.value = p
          progressText.value = `下载中: ${p.percentage}%`
        }
      })
    } else if (activeTab.value === 'custom') {
      progressText.value = '正在从自定义接口获取小说...'
      const config = {
        titlePath: customTitlePath.value.trim() || undefined,
        contentPath: customContentPath.value.trim() || undefined,
        authorPath: customAuthorPath.value.trim() || undefined
      }
      result = await novelFetcher.cacheNovelFromCustomUrl(customUrlInput.value, config, {
        onProgress: (p) => {
          progress.value = p
          progressText.value = `获取中: ${p.percentage}%`
        }
      })
    } else {
      if (!selectedFile.value) {
        throw new Error('请选择文件')
      }

      progressText.value = '正在处理文件...'
      result = await novelFetcher.cacheUploadedNovel(selectedFile.value)
      progress.value = { loaded: 100, total: 100, percentage: 100 }
    }

    toast.add({
      severity: 'success',
      summary: '添加成功',
      detail: `"${result.cachedNovel.title}" 已添加到缓存`,
      life: 3000
    })

    emit('added', result.cachedNovel)
    visible.value = false
    resetForm()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '添加失败',
      detail: error instanceof Error ? error.message : String(error),
      life: 5000
    })
  } finally {
    isLoading.value = false
    progress.value = { loaded: 0, total: 0, percentage: 0 }
  }
}

// 重置表单
const resetForm = () => {
  activeTab.value = 'url'
  urlInput.value = ''
  urlError.value = ''
  urlPreview.value = null
  urlValidationError.value = null
  showForceAdd.value = false

  // 重置自定义解析相关字段
  customUrlInput.value = ''
  customUrlError.value = ''
  customTitlePath.value = ''
  customContentPath.value = ''
  customAuthorPath.value = ''
  customPreview.value = null
  customError.value = ''
  isPreviewing.value = false

  selectedFile.value = null
  uploadError.value = ''
  filePreview.value = null
  isLoading.value = false
  progress.value = { loaded: 0, total: 0, percentage: 0 }
  progressText.value = ''
}

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>

<style scoped>
:deep(.p-dialog-content) {
  padding: 1.5rem;
}

:deep(.p-progressbar-value) {
  transition: width 0.3s ease;
}
</style>