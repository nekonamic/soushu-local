<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getNovel, type Novel } from '@/api/main';
import Skeleton from 'primevue/skeleton';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const route = useRoute()
const data = ref<Novel>()
const isLoading = ref(false)

onMounted(async () => {
  const tidParam = route.params.tid
  const tid = Number(tidParam)

  try {
    isLoading.value = true
    data.value = await getNovel(tid)
  } catch (err: any) {
  toast.add({ severity: 'error', summary: '错误', detail: '请求失败', life: 3000 });
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <div class=" flex justify-center mx-4">
      <div class=" w-3xl flex flex-col gap-2">
        <div>
          <Skeleton width="20rem" height="2rem" class="mb-2" v-if="isLoading"></Skeleton>
          <h1 class=" text-3xl font-bold" v-else>{{ data?.title }}</h1>
        </div>
        <div>
          <Skeleton width="10rem" class="mb-2" v-if="isLoading"></Skeleton>
          <p class="text-gray-300 text-sm" v-else>tid: {{ $route.params.tid }}</p>
        </div>
        <div>
          <Skeleton width="100%" height="30rem" v-if="isLoading"></Skeleton>
          <p class=" text-lg font-light whitespace-pre-wrap" v-else>{{ data?.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
