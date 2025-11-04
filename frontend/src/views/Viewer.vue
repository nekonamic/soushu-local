<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getNovel, type Novel } from '@/api/main';
import Skeleton from 'primevue/skeleton';
import { useToast } from 'primevue/usetoast';
import { useEventListener } from '@vueuse/core'
import ViewerTopBar from '@/components/ViewerTopBar.vue';
import { useNovelStore } from '@/store/novel';

const novelStore = useNovelStore();

const toast = useToast();

const route = useRoute()
const data = ref<Novel>()
const scrollKey = `scroll-${route.params.tid}`

const handelScroll = () => {
  if (!novelStore.isLoading) {
    localStorage.setItem(scrollKey, String(window.scrollY))
  }
}

useEventListener(window, 'scroll', handelScroll)

onMounted(async () => {
  const tid = Number(route.params.tid)

  try {
    data.value = await getNovel(tid)
    novelStore.tid = data.value.tid;
    novelStore.title = data.value.title;
  } catch (err: any) {
    toast.add({ severity: 'error', summary: '错误', detail: '请求失败', life: 3000 });
  } finally {
    novelStore.isLoading = false
  }

  await nextTick()

  const savedY = Number(localStorage.getItem(scrollKey))
  if (savedY) window.scrollTo({ top: savedY, behavior: 'smooth' })
})

onUnmounted(() => {
  novelStore.tid = 0;
  novelStore.title = '';
  novelStore.isLoading = true;
})
</script>

<template>
  <div>
    <div class="overflow-x-hidden">
      <ViewerTopBar />
      <div class=" flex justify-center mt-20 px-4">
        <div class=" max-w-3xl w-full flex flex-col gap-2">
          <div>
            <Skeleton width="20rem" height="2rem" class="mb-2" v-if="novelStore.isLoading"></Skeleton>
            <h1 class=" text-3xl font-bold break-all" v-else>{{ data?.title }}</h1>
          </div>
          <div>
            <Skeleton width="10rem" class="mb-2" v-if="novelStore.isLoading"></Skeleton>
            <p class="text-gray-300 text-sm" v-else>tid: {{ $route.params.tid }}</p>
          </div>
          <div>
            <Skeleton width="100%" height="30rem" v-if="novelStore.isLoading"></Skeleton>
            <p class=" text-lg font-light whitespace-pre-wrap break-all" v-else>{{ data?.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
