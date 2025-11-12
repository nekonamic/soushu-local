<script setup lang="ts">
import { useLayout } from "@/composables/useLayout";
import { ref, onMounted } from "vue";
const { isDarkMode, toggleDarkMode, setColors } = useLayout();
import { useEventListener } from "@vueuse/core";

const isHidden = ref(false);
let lastScrollY = window.scrollY;

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
</script>

<template>
  <div
    :class="['fixed top-0 left-0 w-full flex items-center flex-row-reverse p-2 transition-transform duration-300', isHidden ? '-translate-y-full' : 'translate-y-0', 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md', 'border-b border-gray-300/50 dark:border-gray-700/50', 'z-50']">
    <button type="button"
      class="mx-4 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-600 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
      @click="toggleDarkMode">
      <i :class="['pi text-base', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
    </button>
  </div>
</template>

<style scoped></style>
