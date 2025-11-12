<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useAppStore } from '@/store/app'
import { getApiBase as getGlobalApiBase } from '@/api/main'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()
const appStore = useAppStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单数据
const apiBaseInput = ref('')
const isTesting = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// 默认API选项
const defaultOptions = [
  {
    label: '系统默认',
    value: `${import.meta.env.VITE_API_BASE}`,
    description: '系统默认'
  },
  {
    label: '当前域名',
    value: `${window.location.protocol}//${window.location.host}`,
    description: '使用当前访问的域名作为API服务器'
  },
  {
    label: '自定义',
    value: 'custom',
    description: '手动输入API服务器地址'
  }
]

const selectedOption = ref('')

// 监听对话框打开，初始化数据
watch(visible, (newValue) => {
  if (newValue) {
    const currentApiBase = appStore.apiBase || getGlobalApiBase()

    // 检查是否匹配默认选项
    const matchingOption = defaultOptions.find(option =>
      option.value !== 'custom' && option.value === currentApiBase
    )

    if (matchingOption) {
      selectedOption.value = matchingOption.value
      apiBaseInput.value = ''
    } else {
      selectedOption.value = 'custom'
      apiBaseInput.value = currentApiBase
    }

    testResult.value = null
  }
})

// 保存自定义输入的值，避免切换选项时丢失
let customInputBackup = ''

// 监听选项变化
watch(selectedOption, (newValue) => {
  if (newValue === 'custom') {
    // 恢复自定义输入的值
    if (customInputBackup) {
      apiBaseInput.value = customInputBackup
    } else if (!apiBaseInput.value) {
      apiBaseInput.value = 'https://'
    }
  } else {
    // 保存当前自定义输入的值，然后设置为预设选项
    if (selectedOption.value === 'custom') {
      customInputBackup = apiBaseInput.value
    }
    apiBaseInput.value = newValue
  }
  testResult.value = null
})

// 获取当前API Base
const currentApiBase = computed(() => {
  return selectedOption.value === 'custom' ? apiBaseInput.value : selectedOption.value
})

// 测试API连接
const testConnection = async () => {
  const apiBase = currentApiBase.value.trim()

  if (!apiBase) {
    testResult.value = {
      success: false,
      message: '请输入API服务器地址'
    }
    return
  }

  // 验证URL格式
  try {
    new URL(apiBase)
  } catch {
    testResult.value = {
      success: false,
      message: 'API地址格式不正确'
    }
    return
  }

  isTesting.value = true
  testResult.value = null

  try {
    const result = await appStore.testApiConnection(apiBase)
    testResult.value = result
  } catch (error) {
    testResult.value = {
      success: false,
      message: '测试过程中发生错误'
    }
  } finally {
    isTesting.value = false
  }
}

// 保存设置
const saveSettings = () => {
  const apiBase = currentApiBase.value.trim()

  if (!apiBase) {
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '请输入API服务器地址',
      life: 3000
    })
    return
  }

  // 保存API Base并立即更新全局状态
  appStore.setApiBase(apiBase)

  // 强制更新组件状态，确保UI立即响应
  nextTick(() => {
    console.log('API Base已更新为:', apiBase)
    // console.log('当前appStore.apiBase:', appStore.apiBase)
    // console.log('当前全局API Base:', getGlobalApiBase())
  })

  toast.add({
    severity: 'success',
    summary: '保存成功',
    detail: `API服务器已更新为: ${apiBase}`,
    life: 1000
  })

  visible.value = false
}

// 重置为默认值
const resetToDefault = () => {
  const defaultBase = `${window.location.protocol}//${window.location.host}`
  const matchingOption = defaultOptions.find(option => option.value === defaultBase)

  if (matchingOption) {
    selectedOption.value = matchingOption.value
    apiBaseInput.value = ''
  } else {
    selectedOption.value = 'custom'
    apiBaseInput.value = defaultBase
  }

  testResult.value = null
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="API设置"
    :style="{ width: '90vw', maxWidth: '500px' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
  >
    <div class="space-y-6">
      <!-- 模式信息 -->
      <Message severity="info" :closable="false">
        <div class="flex items-center gap-2">
          <i class="pi pi-info-circle"></i>
          <span>当前模式：{{ appStore.modeText }}</span>
        </div>
      </Message>

      <!-- 默认选项 -->
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
          快速选择
        </label>
        <div class="space-y-2">
          <div
            v-for="option in defaultOptions"
            :key="option.value"
            class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
            :class="[
              selectedOption === option.value
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-surface-300 dark:border-surface-600 hover:border-primary hover:bg-surface-50 dark:hover:bg-surface-800'
            ]"
            @click="selectedOption = option.value"
          >
            <div class="flex items-center gap-2">
              <input
                type="radio"
                :name="'api-option'"
                :value="option.value"
                v-model="selectedOption"
                class="w-4 h-4 text-primary focus:ring-primary"
              />
              <label :for="option.value" class="font-medium cursor-pointer">
                {{ option.label }}
              </label>
            </div>
            <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
              {{ option.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- 自定义API地址 -->
      <div v-if="selectedOption === 'custom'">
        <label for="api-base" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          API服务器地址
        </label>
        <InputText
          id="api-base"
          v-model="apiBaseInput"
          placeholder="https://api.example.com"
          class="w-full"
          :class="{ 'p-invalid': testResult && !testResult.success }"
        />
        <small class="text-surface-500">
          请输入完整的API服务器地址，包含协议（http://或https://）
        </small>
      </div>

      <!-- 当前配置显示 -->
      <div v-if="selectedOption !== 'custom' || apiBaseInput">
        <div class="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
          <p class="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            当前配置：
          </p>
          <p class="text-sm text-surface-600 dark:text-surface-400 font-mono break-all">
            {{ currentApiBase }}
          </p>
        </div>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult" class="space-y-2">
        <div
          class="flex items-center gap-2 p-3 rounded-lg"
          :class="[
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          ]"
        >
          <i :class="testResult.success ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"></i>
          <span class="text-sm font-medium">
            {{ testResult.message }}
          </span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-col sm:flex-row gap-3">
        <Button
          label="测试连接"
          icon="pi pi-plug"
          severity="secondary"
          outlined
          :loading="isTesting"
          :disabled="!currentApiBase.trim()"
          @click="testConnection"
          class="flex-1"
        />

        <Button
          label="重置默认"
          icon="pi pi-undo"
          severity="secondary"
          outlined
          @click="resetToDefault"
          class="flex-1"
        />
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
          label="保存设置"
          icon="pi pi-save"
          :disabled="!currentApiBase.trim()"
          @click="saveSettings"
          autofocus
        />
      </div>
    </template>
  </Dialog>
</template>
