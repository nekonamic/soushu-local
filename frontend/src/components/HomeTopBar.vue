<script setup lang="ts">
import { useLayout } from "@/composables/useLayout";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Menu from "primevue/menu";
import { novelFetcher } from "@/utils/novelFetcher";
import { useAppStore } from "@/store/app";

interface Props {
  showAddNovelDialog?: boolean;
  favorites?: any[];
  drawerVisible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAddNovelDialog: false,
  favorites: () => [],
  drawerVisible: false
});

const emit = defineEmits<{
  (e: 'update:showAddNovelDialog', value: boolean): void;
  (e: 'update:drawerVisible', value: boolean): void;
}>();

const { isDarkMode, toggleDarkMode, setColors } = useLayout();
import { useEventListener } from "@vueuse/core";

const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const appStore = useAppStore();

const isHidden = ref(false);
const menu = ref();
const modeMenu = ref();

// 使用计算属性管理对话框状态
const showAddNovelDialog = computed({
  get: () => props.showAddNovelDialog,
  set: (value) => emit('update:showAddNovelDialog', value)
});

let lastScrollY = window.scrollY;

// 获取项目版本号
const projectVersion = import.meta.env.VITE_PROJECT_HASH || 'unknown';

// 复制版本号到剪贴板
const copyVersion = async () => {
  try {
    await navigator.clipboard.writeText(projectVersion);
    // toast.add({
    //   severity: 'success',
    //   summary: '复制成功',
    //   detail: `版本号 ${projectVersion} 已复制到剪贴板`,
    //   life: 2000
    // });
  } catch (error) {
    // 降级方案：使用传统的复制方法
    try {
      const textArea = document.createElement('textarea');
      textArea.value = projectVersion;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      toast.add({
        severity: 'success',
        summary: '复制成功',
        detail: `版本号 ${projectVersion} 已复制到剪贴板`,
        life: 2000
      });
    } catch (fallbackError) {
      toast.add({
        severity: 'error',
        summary: '复制失败',
        detail: '无法复制版本号到剪贴板',
        life: 3000
      });
    }
  }
};

// 菜单项
const menuItems = [
  {
    label: '缓存管理',
    icon: 'pi pi-database',
    command: () => {
      router.push('/cache');
    }
  },
  {
    label: '添加小说',
    icon: 'pi pi-plus',
    command: () => {
      showAddNovelDialog.value = true;
    }
  },
  {
    separator: true
  },
  {
    label: 'API设置',
    icon: 'pi pi-server',
    command: () => {
      appStore.showApiSettingsDialog();
    }
  },
  {
    label: `版本: ${projectVersion}`,
    icon: 'pi pi-info-circle',
    command: copyVersion,
    class: 'cursor-pointer'
  },
  {
    separator: true
  },
  {
    label: '设置',
    icon: 'pi pi-cog',
    command: () => {
      // toast.add({
      //   severity: 'info',
      //   summary: '设置',
      //   detail: '设置功能即将上线',
      //   life: 500
      // });
    }
  }
];

// 模式切换菜单项
const modeMenuItems = [
  {
    label: appStore.isApiMode ? '切换到纯前端模式' : '切换到API模式',
    icon: appStore.isApiMode ? 'pi pi-mobile' : 'pi pi-server',
    command: async () => {
      await appStore.toggleMode();
    }
  }
];

const modeStatusItems = computed(() => [
  {
    label: '当前模式',
    icon: appStore.modeIcon,
    disabled: true,
    class: 'font-semibold'
  }
]);

onMounted(() => {
	setColors();

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	if (mediaQuery.matches && !isDarkMode.value) {
		toggleDarkMode();
	} else if (!mediaQuery.matches && isDarkMode.value) {
		toggleDarkMode();
	}
});

const handleScroll = () => {
	const currentScrollY = window.scrollY;
	if (currentScrollY > lastScrollY) {
		isHidden.value = true;
	} else {
		isHidden.value = false;
	}
	lastScrollY = currentScrollY;
};

useEventListener(window, "scroll", handleScroll);

const toggleMenu = (event: Event) => {
  menu.value.toggle(event);
};

const showUrlInputDialog = () => {
  // 这个方法将被AddNovelDialog组件调用
  showAddNovelDialog.value = true;
};

// 切换模式菜单
const toggleModeMenu = (event: MouseEvent) => {
  modeMenu.value?.toggle(event);
};

// 暴露给子组件使用
defineExpose({
  showUrlInputDialog
});
</script>

<template>
  <div
    :class="['fixed top-0 left-0 w-full flex items-center justify-between p-4 transition-transform duration-300', isHidden ? '-translate-y-full' : 'translate-y-0', 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md', 'border-b border-gray-300/50 dark:border-gray-700/50', 'z-50']">

    <!-- 左侧：收藏按钮 -->
    <div class="flex items-center gap-2">
      <Button
        icon="pi pi-star-fill"
        severity="secondary"
        text
        rounded
        @click="$emit('update:drawerVisible', true)"
        class="w-10 h-10"
        title="收藏夹"
        aria-label="收藏夹"
      />
    </div>

    <!-- 右侧：其他按钮 -->
    <div class="flex items-center gap-2">
      <!-- 模式切换按钮 -->
      <Button
        type="button"
        severity="secondary"
        text
        rounded
        @click="toggleModeMenu"
        class=" h-10"
        :title="appStore.modeText"
        aria-label="模式切换"
      ><i :class="appStore.modeIcon" class="text-sm"></i>
        <span class="text-sm text-surface-600 dark:text-surface-400">{{ appStore.modeText }}</span>
      </Button>

      <!-- 模式切换菜单 -->
      <Menu
        ref="modeMenu"
        :model="modeMenuItems"
        :popup="true"
        class="w-48"
      />

      <!-- 菜单按钮 -->
      <Button
        type="button"
        icon="pi pi-bars"
        severity="secondary"
        text
        rounded
        @click="toggleMenu"
        class="w-10 h-10"
        aria-label="菜单"
      />

      <!-- 主题切换按钮 -->
      <button type="button"
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
        @click="toggleDarkMode"
        title="切换主题">
        <i :class="['pi text-base', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
      </button>

      <!-- 菜单 -->
      <Menu
          ref="menu"
          :model="menuItems"
          :popup="true"
          class="w-48"
      />
    </div>
  </div>

  </template>

<style scoped></style>
