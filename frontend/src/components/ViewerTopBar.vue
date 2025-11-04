<script setup lang="ts">
import { useLayout } from "@/composables/useLayout";
import { ref, onMounted, computed } from "vue";
const { isDarkMode, toggleDarkMode, setColors } = useLayout();
import { useEventListener } from "@vueuse/core";
import { useFavsStore } from "@/store/favs";
import { useNovelStore } from "@/store/novel";
import type { Fav } from "@/types/Fav";

const novelStore = useNovelStore();

const favsStore = useFavsStore();

const isFav = computed(() =>
	favsStore.favs.some((f) => f.tid === novelStore.tid),
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
		favsStore.favs.push(fav);
		saveFavs();
	}
};

const removeFav = () => {
	favsStore.favs = favsStore.favs.filter((f) => f.tid !== novelStore.tid);
	saveFavs();
};
const saveFavs = () => {
	localStorage.setItem("favorites", JSON.stringify(favsStore.favs));
};

const handelScroll = () => {
	updateProgress();
};

useEventListener(window, "scroll", handelScroll);

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

const scrollProgress = ref(0);
const updateProgress = () => {
	const scrollTop = window.scrollY;
	const scrollHeight =
		document.documentElement.scrollHeight - window.innerHeight;
	scrollProgress.value =
		scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
};
</script>

<template>
  <div :class="['fixed top-0 left-0 w-full transition-transform duration-300', isHidden ? 'translate-y-[calc(-100%+0.25rem)]' : 'translate-y-0']">
    <div
      :class="['flex flex-row items-center justify-between p-4', 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md', 'border-b border-gray-300/50 dark:border-gray-700/50', 'z-50']">
      <button type="button"
        class="mx-4 w-12 h-6 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
        @click="toggleFav">
        <i :class="['pi text-base', { 'pi-star-fill': isFav, 'pi-star': !isFav }]" />
      </button>
      <button type="button"
        class="mx-4 w-12 h-6 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
        @click="toggleDarkMode">
        <i :class="['pi text-base', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
      </button>
    </div>
    <div class="w-full h-1 bg-gray-200 z-50">
      <div class="h-1 bg-linear-to-bl from-violet-500 to-fuchsia-500 transition-all duration-100"
        :style="{ width: scrollProgress + '%' }"></div>
    </div>
  </div>
</template>

<style scoped></style>
