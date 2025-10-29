<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import RadioButtonGroup from 'primevue/radiobuttongroup';
import Card from 'primevue/card';
import Paginator from 'primevue/paginator';
import { searchNovels } from '@/api/main';
import Skeleton from 'primevue/skeleton';
import { useSearchStore } from '@/store/search';
import Message from 'primevue/message';
import Form from '@primevue/forms/form';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const searchStore = useSearchStore();

const router = useRouter()

const rows = ref(20);

const isLoading = ref(false)

const offset = ref(0)

const keyword = ref("")

onMounted(() => {
  offset.value = (searchStore.page - 1) * rows.value;
})

async function search() {
  if (keyword.value != searchStore.keyword.trim()) {
    keyword.value = searchStore.keyword.trim();
    searchStore.records = [];
    searchStore.total = 0;
    searchStore.page = 1;
    offset.value = (searchStore.page - 1) * rows.value;
  }

  try {
    isLoading.value = true;
    const res = await searchNovels(searchStore.target, keyword.value, searchStore.page);
    searchStore.records = [];
    searchStore.records = res.records;
    searchStore.total = res.total;
  } catch (err) {
    toast.add({ severity: 'error', summary: '错误', detail: '搜索失败', life: 3000 });
  } finally {
    isLoading.value = false;
  }
}

function goViewer(tid: number) {
  router.push(`/${tid}`);
}

function onPageChange(event: { page: number }) {
  if (!isLoading.value) {
    searchStore.page = event.page + 1;
    search();
  }
}
</script>

<template>
  <div>
    <div class=" flex flex-col items-center justify-center gap-4">
      <div class=" flex flex-col items-center justify-center md:mt-36 mt-16 md:mb-10 mb-4">
        <h1
          class=" text-5xl font-bold bg-linear-to-bl from-violet-500 to-fuchsia-500 inline-block text-transparent bg-clip-text p-1">
          搜书吧: 大図書館</h1>
        <h6 class=" text-gray-300 mt-2">搜书吧全文搜索(FTS)</h6>
      </div>
      <div class="w-full px-8 flex flex-col gap-4">
        <Form @submit="search" class="flex justify-center flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex flex-col gap-2">
              <InputText v-model="searchStore.keyword" placeholder="搜索..." class=" w-full p-inputtext-lg" />
              <Message size="small" severity="secondary" variant="simple">使用空格间隔关键词
              </Message>
            </div>
            <div class="flex flex-col gap-2">
              <RadioButtonGroup v-model="searchStore.target" name="ingredient" class="flex flex-wrap gap-4">
                <div class="flex items-center gap-2">
                  <RadioButton inputId="title" value="title" />
                  <label for="title">标题</label>
                </div>
                <div class="flex items-center gap-2">
                  <RadioButton inputId="content" value="content" />
                  <label for="content">内容</label>
                </div>
                <div class="flex items-center gap-2">
                  <RadioButton inputId="both" value="both" />
                  <label for="both">全部</label>
                </div>
              </RadioButtonGroup>
            </div>
          </div>
        </Form>
        <div class="grid md:grid-cols-2 grid-cols-1 gap-4" v-if="isLoading">
          <Skeleton height="15rem"
            class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
            v-for="_ in 10"></Skeleton>
        </div>
        <div class="grid md:grid-cols-2 grid-cols-1 gap-4" v-else>
          <Card class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
            v-for="item in searchStore.records" :key="item.tid" @click="goViewer(item.tid)">
            <template #title>
              <p class="font-bold">{{ item.title }}</p>
            </template>
            <template #content>
              <p class="m-0">{{ item.snippet }}</p>
            </template>
          </Card>
        </div>
        <div>
          <Paginator :rows=rows :totalRecords=searchStore.total v-model:first="offset" @page="onPageChange"
            v-if="searchStore.total !== 0">
          </Paginator>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
