<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useLayout } from '@/composables/useLayout';
import { onMounted } from 'vue';
const { isDarkMode, toggleDarkMode, setColors } = useLayout();
import Toast from 'primevue/toast';

onMounted(() => {
  setColors();
})
</script>

<template>
  <Toast />
  <div class="flex items-center flex-row-reverse">
      <button type="button"
        class="mx-4 mt-4 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
        @click="toggleDarkMode">
        <i :class="['pi text-base', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
      </button>
    </div>
  <RouterView />
</template>

<style scoped></style>
