<script setup lang="ts">
import { useLayout } from "@/composables/useLayout";
import { ref, onMounted, computed, watch } from "vue";
const { isDarkMode, toggleDarkMode, setColors } = useLayout();
import { useEventListener } from "@vueuse/core";
import { useNovelStore } from "@/store/novel";
import type { Fav } from "@/types/Fav";
import { useRoute } from "vue-router";
import { useLocalStorage } from "@vueuse/core";
import type { Progress } from "@/types/Progress";
import { downloadNovel } from "@/utils/download";

const favorites = useLocalStorage<Fav[]>("favorites", []);
const progressStore = useLocalStorage<Progress[]>("progress", []);

const route = useRoute();
const tid = Number(route.params.tid);

onMounted(async () => {
  setColors();

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  if (mediaQuery.matches && !isDarkMode.value) {
    toggleDarkMode();
  } else if (!mediaQuery.matches && isDarkMode.value) {
    toggleDarkMode();
  }

  const index = progressStore.value.findIndex((item) => item.tid === tid);


  if (index !== -1) {
    await new Promise<void>((resolve) => {
      if (!novelStore.isLoading) return resolve();

      const stop = watch(
        () => !novelStore.isLoading,
        (val) => {
          if (val) {
            stop();
            resolve();
          }
        }
      );
    });

    slideValue.value = progressStore.value[index]!.progress;
  }
});

const novelStore = useNovelStore();

const slideValue = ref(0);
const isDragging = ref(false);

const onSlideStart = () => {
  isDragging.value = true;
};

const onSlideEnd = () => {
  isDragging.value = false;
};

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
    if (currentScrollY > lastScrollY) {
      isHidden.value = true;
    } else {
      isHidden.value = false;
    }
    lastScrollY = currentScrollY;
  }
};

useEventListener(window, "scroll", handleScroll);

const updateProgress = () => {
  const scrollTop = window.scrollY;
  const scrollHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  if (!isDragging.value) {
    slideValue.value = progress;
  }

  const index = progressStore.value.findIndex((item) => item.tid === tid);

  if (index !== -1) {
    progressStore.value[index]!.progress = progress;
  } else {
    progressStore.value.push({ tid, progress });
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
      behavior: "smooth",
    });
  }
});
</script>

<template>
  <div
    :class="['fixed top-0 left-0 w-full transition-transform duration-300', isHidden ? 'translate-y-[calc(-100%+0.25rem)]' : 'translate-y-0']">
    <div
      :class="['flex flex-row items-center justify-between p-2', 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md', 'border-b border-gray-300/50 dark:border-gray-700/50', 'z-50']">
      <div class="flex flex-row">
        <button type="button"
          class="mx-4 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-600 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
          @click="toggleFav">
          <i :class="['pi text-base', { 'pi-star-fill': isFav, 'pi-star': !isFav }]" />
        </button>
        <button type="button"
          class="mx-4 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-600 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
          @click="downloadNovel(tid)">
          <i class="pi pi-download" />
        </button>
      </div>
      <button type="button"
        class="mx-4 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-600 transition-all text-surface-900 dark:text-surface-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:focus-visible:ring-offset-surface-950"
        @click="toggleDarkMode">
        <i :class="['pi text-base', { 'pi-moon': isDarkMode, 'pi-sun': !isDarkMode }]" />
      </button>
    </div>
    <Slider v-model="slideValue" @change="onSlideStart" @slideend="onSlideEnd" />
  </div>
</template>

<style scoped></style>
