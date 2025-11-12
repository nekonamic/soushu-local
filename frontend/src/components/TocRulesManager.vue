<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import {useToast} from 'primevue/usetoast';
import {DEFAULT_ENABLED_RULE_IDS, DEFAULT_TOC_RULES, type TocRule} from '@/utils/tocRules';
import {useLocalStorage} from "@vueuse/core";
import {useRoute} from 'vue-router';
import type {Progress} from "@/types/Progress.ts";

const route = useRoute();
const progressStore = useLocalStorage<Progress[]>('progress', [])

interface CustomRule {
  id: string;
  name: string;
  rule: string;
  example: string;
  enabled: boolean;
  custom: true;
}

const toast = useToast();

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'rules-change': [rules: (TocRule | CustomRule)[]];
}>();

// 创建本地响应式visible状态
const localVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const rules = ref<(TocRule | CustomRule)[]>([]);
const customRules = ref<CustomRule[]>([]);
const selectedRuleId = ref<number | string | null>(null);
const showCustomRuleDialog = ref(false);
const newCustomRule = ref({
  name: '',
  rule: ''
});
const editingCustomRuleId = ref<string | null>(null); // 当前编辑的规则ID
const testResults = ref<Map<number | string, number>>(new Map()); // 存储每个规则的测试结果
const isTesting = ref(false);

// 字数分割配置对话框
const showWordCountConfigDialog = ref(false);
const editingWordCountRule = ref<TocRule | null>(null);
const tempWordCountOptions = ref({
  wordsPerChapter: 10000,
  showFirstSentence: true
});

// 测试单个规则并更新结果
const testAndUpdateResult = async (rule: TocRule | CustomRule) => {
  const testResult = await testRule(rule);
  if (testResult) {
    testResults.value.set(rule.id, testResult.chapterCount);

    toast.add({
      severity: 'info',
      summary: '测试完成',
      detail: `"${rule.name}" 识别到 ${testResult.chapterCount} 个章节`,
      life: 3000,
    });
  } else {
    testResults.value.set(rule.id, 0);

    toast.add({
      severity: 'warn',
      summary: '测试完成',
      detail: `"${rule.name}" 未识别到章节`,
      life: 3000,
    });
  }
};

// 测试所有规则
const testAllRulesAndUpdateResults = async () => {
  isTesting.value = true;
  try {
    await testAllRules();
    // testAllRules函数会自动更新选中的最佳规则
  } finally {
    isTesting.value = false;
  }
};

// 加载默认规则（从代码中直接加载）
const loadDefaultRules = () => {
  try {
    // 直接使用代码中的默认规则
    rules.value = [...DEFAULT_TOC_RULES];

    // 直接使用默认规则，具体的规则选择由Viewer.vue根据每个小说的progress来设置
    if (DEFAULT_ENABLED_RULE_IDS.length > 0 && rules.value.some(rule => rule.id === DEFAULT_ENABLED_RULE_IDS[0])) {
      selectedRuleId.value = DEFAULT_ENABLED_RULE_IDS[0] ?? null;
    }

    // 从localStorage恢复自定义规则
    const savedCustomRules = localStorage.getItem('toc_custom_rules');
    if (savedCustomRules) {
      try {
        customRules.value = JSON.parse(savedCustomRules);
        rules.value = [...rules.value, ...customRules.value];
        // 恢复自定义规则的选中状态
        customRules.value.forEach(rule => {
          const savedCustomSelected = localStorage.getItem('toc_selected_rule');
          if (savedCustomSelected) {
            try {
              const customSelectedId = JSON.parse(savedCustomSelected);
              if (customSelectedId === rule.id) {
                selectedRuleId.value = rule.id ?? null;
              }
            } catch (error) {
              console.error('解析自定义选中规则失败:', error);
            }
          }
        });
      } catch (error) {
        console.error('解析自定义规则失败:', error);
      }
    }

  } catch (error) {
    console.error('加载默认规则失败:', error);
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '加载目录规则失败',
      life: 3000,
    });
  }
};

// 获取启用的规则（单选模式）
const getEnabledRules = computed(() => {
  if (selectedRuleId.value === null) return [];
  return rules.value.filter(rule => rule.id === selectedRuleId.value);
});

// 切换规则选择状态（单选模式）
const selectRule = (ruleId: number | string) => {
  selectedRuleId.value = ruleId;
  saveSelectedRule();
};

// 保存选中的规则（单选模式）
const saveSelectedRule = () => {
  // 保存规则选择到当前小说的progress中

  const tid = Number(route.params.tid);
  const key = progressStore.value.findIndex(item => item.tid === tid);

  if (key !== -1 && selectedRuleId.value !== null) {
    progressStore.value[key]!.selectedRuleId = selectedRuleId.value;
  }

  emit('rules-change', getEnabledRules.value);
};

// 添加/更新自定义规则
const addCustomRule = () => {
  if (!newCustomRule.value.name.trim() || !newCustomRule.value.rule.trim()) {
    toast.add({
      severity: 'warn',
      summary: '警告',
      detail: '请填写规则名称和正则表达式',
      life: 3000,
    });
    return;
  }

  try {
    // 测试正则表达式是否有效
    new RegExp(newCustomRule.value.rule);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '正则表达式格式不正确',
      life: 3000,
    });
    return;
  }

  if (editingCustomRuleId.value) {
    // 编辑模式：更新现有规则
    const index = customRules.value.findIndex(rule => rule.id === editingCustomRuleId.value);
    if (index !== -1 && customRules.value[index]) {
      customRules.value[index]!.name = newCustomRule.value.name;
      customRules.value[index]!.rule = newCustomRule.value.rule;

      // 同时更新rules数组中的对应项
      const ruleIndex = rules.value.findIndex(rule => rule.id === editingCustomRuleId.value);
      if (ruleIndex !== -1 && rules.value[ruleIndex]) {
        rules.value[ruleIndex]!.name = newCustomRule.value.name;
        rules.value[ruleIndex]!.rule = newCustomRule.value.rule;
      }
    }

    localStorage.setItem('toc_custom_rules', JSON.stringify(customRules.value));

    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '自定义规则更新成功',
      life: 3000,
    });
  } else {
    // 添加模式：创建新规则
    const customRule: CustomRule = {
      id: `custom_${Date.now()}`,
      name: newCustomRule.value.name,
      rule: newCustomRule.value.rule,
      example: `自定义规则示例`,
      enabled: true,
      custom: true
    };

    customRules.value.push(customRule);
    rules.value.push(customRule);
    selectedRuleId.value = customRule.id ?? null;

    localStorage.setItem('toc_custom_rules', JSON.stringify(customRules.value));

    saveSelectedRule();

    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '自定义规则添加成功',
      life: 3000,
    });
  }

  // 重置表单
  newCustomRule.value = { name: '', rule: '' };
  editingCustomRuleId.value = null;
  showCustomRuleDialog.value = false;
};

// 开始编辑自定义规则
const editCustomRule = (ruleId: string) => {
  const rule = customRules.value.find(r => r.id === ruleId);
  if (rule) {
    newCustomRule.value = {
      name: rule.name,
      rule: rule.rule
    };
    editingCustomRuleId.value = ruleId;
    showCustomRuleDialog.value = true;
  }
};

// 取消自定义规则对话框
const cancelCustomRuleDialog = () => {
  newCustomRule.value = { name: '', rule: '' };
  editingCustomRuleId.value = null;
  showCustomRuleDialog.value = false;
};

// 删除自定义规则
const removeCustomRule = (ruleId: string) => {
  const index = customRules.value.findIndex(rule => rule.id === ruleId);
  if (index !== -1) {
    customRules.value.splice(index, 1);
    rules.value = rules.value.filter(rule => rule.id !== ruleId);

    // 如果删除的是当前选中的规则，重置为默认规则
    if (selectedRuleId.value === ruleId) {
      if (DEFAULT_ENABLED_RULE_IDS.length > 0 && rules.value.some(rule => rule.id === DEFAULT_ENABLED_RULE_IDS[0])) {
        selectedRuleId.value = DEFAULT_ENABLED_RULE_IDS[0] ?? null;
      } else {
        selectedRuleId.value = null;
      }
    }

    localStorage.setItem('toc_custom_rules', JSON.stringify(customRules.value));
    saveSelectedRule();

    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '自定义规则删除成功',
      life: 3000,
    });
  }
};

// 测试规则
// 测试规则
const testRule = async (rule: TocRule | CustomRule) => {
  // 获取当前Viewer组件的内容
  const viewerContent = getCurrentNovelContent();
  if (!viewerContent) {
    toast.add({
      severity: 'warn',
      summary: '无法测试',
      detail: '请先打开一本小说进行测试',
      life: 3000,
    });
    return null;
  }

  let testResult;
  if ('type' in rule && rule.type === 'wordCount') {
    // 测试字数分割规则
    const wordCountOptions = rule.wordCountOptions || { wordsPerChapter: 10000, showFirstSentence: true };
    testResult = testWordCountRule(viewerContent, wordCountOptions);
  } else {
    // 测试正则规则
    testResult = testRegexRule(viewerContent, rule.rule);
  }

  return testResult;
};

// 一键测试所有规则
const testAllRules = async () => {
  const viewerContent = getCurrentNovelContent();
  if (!viewerContent) {
    toast.add({
      severity: 'warn',
      summary: '无法测试',
      detail: '请先打开一本小说进行测试',
      life: 3000,
    });
    return;
  }

  const results = [];
  // 清空之前的测试结果
  testResults.value.clear();

  for (const rule of rules.value) {
    try {
      let result;
      if ('type' in rule && rule.type === 'wordCount') {
        const wordCountOptions = rule.wordCountOptions || { wordsPerChapter: 10000, showFirstSentence: true };
        result = testWordCountRule(viewerContent, wordCountOptions);
      } else {
        result = testRegexRule(viewerContent, rule.rule);
      }

      // 更新测试结果到Map中
      testResults.value.set(rule.id, result.chapterCount);

      results.push({
        id: rule.id,
        name: rule.name,
        chapterCount: result.chapterCount
      });
    } catch (error) {
      console.error(`测试规则 ${rule.name} 失败:`, error);
      testResults.value.set(rule.id, 0);
    }
  }

  // 找到最佳的规则
  const bestRule = results.sort((a, b) => b.chapterCount - a.chapterCount)[0];
  if (bestRule && bestRule.chapterCount > 0) {
    selectRule(bestRule.id);

    toast.add({
      severity: 'success',
      summary: '测试完成',
      detail: `推荐使用"${bestRule.name}"，识别到 ${bestRule.chapterCount} 个章节`,
      life: 4000,
    });
  } else {
    toast.add({
      severity: 'info',
      summary: '测试完成',
      detail: '所有规则都未能识别到章节',
      life: 3000,
    });
  }

  return results;
};

// 获取当前小说内容（通过全局方法）
const getCurrentNovelContent = (): string | null => {
  // 使用Viewer组件提供的全局方法
  if ((window as any).getCurrentNovelContent) {
    return (window as any).getCurrentNovelContent();
  }

  return null;
};

// 测试字数分割规则
const testWordCountRule = (content: string, options: { wordsPerChapter: number; showFirstSentence: boolean }) => {
  const wordsPerChapter = options.wordsPerChapter || 10000;
  let chapterCount = 0;
  let currentPosition = 0;

  while (currentPosition < content.length) {
    const remainingChars = content.length - currentPosition;
    const chapterSize = Math.min(wordsPerChapter, remainingChars);
    currentPosition += chapterSize;
    chapterCount++;
  }

  return { chapterCount };
};

// 测试正则规则
const testRegexRule = (content: string, regexPattern: string) => {
  let chapterCount = 0;
  const matchedLines: string[] = [];

  try {
    const regex = new RegExp(regexPattern);
    const lines = content.split('\n');

    for (const line of lines) {
      if (regex.test(line)) {
        chapterCount++;
        matchedLines.push(line.trim());
        // 重置正则表达式的lastIndex，避免状态问题
        regex.lastIndex = 0;
      }
    }
  } catch (error) {
    console.error('正则表达式错误:', error);
  }

  return { chapterCount };
};

// 重置为默认规则
const resetToDefault = () => {
  if (DEFAULT_ENABLED_RULE_IDS.length > 0 && rules.value.some(rule => rule.id === DEFAULT_ENABLED_RULE_IDS[0])) {
    selectedRuleId.value = DEFAULT_ENABLED_RULE_IDS[0] ?? null;
  } else {
    selectedRuleId.value = null;
  }

  saveSelectedRule();

  toast.add({
    severity: 'success',
    summary: '成功',
    detail: '已重置为默认规则',
    life: 3000,
  });
};

// 配置字数分割规则
const configureWordCountRule = (rule: TocRule | CustomRule) => {
  if ('type' in rule && rule.type === 'wordCount' && rule.wordCountOptions) {
    editingWordCountRule.value = rule as TocRule;
    tempWordCountOptions.value = { ...rule.wordCountOptions };
    showWordCountConfigDialog.value = true;
  }
};

// 确认字数分割配置
const confirmWordCountConfig = () => {
  if (!editingWordCountRule.value) return;

  // 保存当前编辑的规则ID
  const editingRuleId = editingWordCountRule.value.id;

  // 更新规则的配置
  editingWordCountRule.value.wordCountOptions = { ...tempWordCountOptions.value };

  // 保存配置到localStorage
  const wordCountConfigKey = 'toc_wordCount_config';
  localStorage.setItem(wordCountConfigKey, JSON.stringify(tempWordCountOptions.value));

  showWordCountConfigDialog.value = false;
  editingWordCountRule.value = null;

  // 如果当前选中的是字数分割规则，重新生成目录
  if (selectedRuleId.value === editingRuleId) {
    saveSelectedRule();
  }

  toast.add({
    severity: 'success',
    summary: '配置成功',
    detail: `字数分割配置已更新：每${tempWordCountOptions.value.wordsPerChapter}字`,
    life: 3000,
  });
};

// 加载字数分割配置
const loadWordCountConfig = () => {
  const wordCountConfigKey = 'toc_wordCount_config';
  const savedConfig = localStorage.getItem(wordCountConfigKey);
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      tempWordCountOptions.value = config;

      // 更新规则中的配置
      const wordCountRule = rules.value.find(rule => 'type' in rule && rule.type === 'wordCount') as TocRule | undefined;
      if (wordCountRule && wordCountRule.type === 'wordCount') {
        wordCountRule.wordCountOptions = config;
      }
    } catch (error) {
      console.error('加载字数分割配置失败:', error);
    }
  }
};

onMounted(() => {
  // 直接加载默认规则，不需要等待visible状态
  loadDefaultRules();
  // 加载字数分割配置
  loadWordCountConfig();
});
</script>

<template>
  <Dialog
    v-model:visible="localVisible"
    modal
    header="目录规则设置"
    :style="{ width: '90vw', maxWidth: '800px', minWidth: '320px' }"
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
  >
    <div class="flex flex-col gap-4">
      <!-- 操作按钮区域 -->
      <div class="flex gap-2 flex-wrap">
        <Button
          icon="pi pi-plus"
          label="添加自定义规则"
          size="small"
          severity="secondary"
          outlined
          @click="showCustomRuleDialog = true"
        />
        <Button
          icon="pi pi-play"
          label="一键测试所有规则"
          size="small"
          severity="info"
          outlined
          :loading="isTesting"
          @click="testAllRulesAndUpdateResults"
        />
        <Button
          icon="pi pi-refresh"
          label="重置为默认"
          size="small"
          severity="secondary"
          outlined
          @click="resetToDefault"
        />
      </div>

      <!-- 规则列表 -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="rule in rules"
          :key="rule.id"
          class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <RadioButton
            :model-value="selectedRuleId"
            :value="rule.id"
            @update:model-value="selectRule(rule.id)"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-sm">{{ rule.name }}</span>
              <span
                v-if="(rule as CustomRule).custom"
                class="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded"
              >
                自定义
              </span>
              <!-- 显示测试结果 -->
              <span
                v-if="testResults.has(rule.id) && testResults.get(rule.id)! > 0"
                class="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded"
              >
                {{ testResults.get(rule.id) }}章
              </span>
              <span
                v-else-if="testResults.has(rule.id) && testResults.get(rule.id) === 0"
                class="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 rounded"
              >
                未匹配
              </span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              示例: {{ rule.example }}
            </div>
            <div v-if="(rule as CustomRule).custom" class="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
              {{ rule.rule }}
            </div>
            <div v-else class="text-xs text-gray-500 dark:text-gray-400 italic">
              系统内置规则
            </div>
          </div>

          <div class="flex gap-1">
            <Button
              icon="pi pi-search"
              size="small"
              severity="secondary"
              text
              @click="testAndUpdateResult(rule)"
              v-tooltip="'测试规则'"
            />
            <Button
              v-if="'type' in rule && rule.type === 'wordCount'"
              icon="pi pi-cog"
              size="small"
              severity="info"
              text
              @click="configureWordCountRule(rule)"
              v-tooltip="'配置字数分割'"
            />
            <Button
              v-if="(rule as CustomRule).custom"
              icon="pi pi-pencil"
              size="small"
              severity="info"
              text
              @click="editCustomRule(rule.id as string)"
              v-tooltip="'编辑规则'"
            />
            <Button
              v-if="(rule as CustomRule).custom"
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              @click="removeCustomRule(rule.id as string)"
              v-tooltip="'删除规则'"
            />
          </div>
        </div>
      </div>

      <!-- 规则说明 -->
      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p class="mb-2">使用说明：</p>
        <ul class="list-disc list-inside space-y-1 text-xs">
          <li>选择一个目录识别规则（单选模式）</li>
          <li>推荐使用通用规则，能适配大部分小说格式</li>
          <li>可以添加自定义规则来识别特殊格式的目录</li>
          <li>正则表达式支持JavaScript语法</li>
        </ul>
      </div>
    </div>

    <!-- 添加/编辑自定义规则对话框 -->
    <Dialog
      v-model:visible="showCustomRuleDialog"
      modal
      :header="editingCustomRuleId ? '编辑自定义规则' : '添加自定义规则'"
      :style="{ width: '90vw', maxWidth: '600px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">规则名称</label>
          <InputText
            v-model="newCustomRule.name"
            placeholder="例如：特殊章节格式"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">正则表达式</label>
          <InputText
            v-model="newCustomRule.rule"
            placeholder="例如：^第[0-9]+章.*$"
            class="w-full font-mono"
          />
        </div>

        <div class="text-sm text-gray-600 dark:text-gray-400">
          <p class="mb-2">正则表达式提示：</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>使用 ^ 匹配行首</li>
            <li>使用 $ 匹配行尾</li>
            <li>使用 .* 匹配任意字符</li>
            <li>使用 [0-9] 匹配数字</li>
            <li>使用 + 匹配一个或多个</li>
            <li>使用 ? 匹配零个或一个</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="取消"
            severity="secondary"
            text
            @click="cancelCustomRuleDialog"
          />
          <Button
            :label="editingCustomRuleId ? '保存' : '添加'"
            @click="addCustomRule"
          />
        </div>
      </template>
    </Dialog>

    <!-- 字数分割配置对话框 -->
    <Dialog
      v-model:visible="showWordCountConfigDialog"
      modal
      header="字数分割配置"
      :style="{ width: '50vw', maxWidth: '500px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">每章字数</label>
          <InputText
            :model-value="tempWordCountOptions.wordsPerChapter.toString()"
            type="number"
            placeholder="10000"
            class="w-full"
            @input="tempWordCountOptions.wordsPerChapter = Number(($event.target as HTMLInputElement)?.value || 10000)"
          />
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            默认10000字，可根据需要调整
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">显示选项</label>
          <div class="flex items-center">
            <input
              type="checkbox"
              v-model="tempWordCountOptions.showFirstSentence"
              id="tempShowFirstSentence"
              class="mr-2"
            />
            <label for="tempShowFirstSentence" class="text-sm">
              在章节标题中显示第一句话（最多20个字符）
            </label>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            章节标题格式：（一）第一句话内容...
          </p>
        </div>

        <div class="text-sm text-gray-600 dark:text-gray-400">
          <p class="mb-2">说明：</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>按指定字数自动分割生成章节</li>
            <li>章节序号使用中文数字：（一）、（二）、（三）...</li>
            <li>支持显示章节第一句话作为标题补充</li>
            <li>适用于没有明确章节结构的文本</li>
            <li>配置会自动保存，刷新页面后仍然有效</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="取消"
            severity="secondary"
            outlined
            @click="showWordCountConfigDialog = false"
          />
          <Button
            label="保存配置"
            @click="confirmWordCountConfig"
          />
        </div>
      </template>
    </Dialog>
  </Dialog>
</template>