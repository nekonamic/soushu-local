<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import RadioButtonGroup from 'primevue/radiobuttongroup';
import Card from 'primevue/card';
import Paginator from 'primevue/paginator';
import Button from 'primevue/button';
import axios from 'axios';

const router = useRouter()

const searchRef = ref("");
const searchTarget = ref("title");

interface novel {
  tid: number;
  title: string;
  contentFragment: string;
}

async function search() {
  try {
    const response: AxiosResponse<User> = await axios.get(`/api/search/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

function goViewer() {
  router.push(`/10086`)
}
</script>

<template>
  <div>
    <div class=" flex flex-col items-center justify-center gap-4">
      <div class=" flex flex-col items-center justify-center mt-36 mb-10">
        <h1
          class=" text-5xl font-bold bg-linear-to-bl from-violet-500 to-fuchsia-500 inline-block text-transparent bg-clip-text p-1">
          搜书吧 - 大図書館</h1>
        <h6 class=" text-gray-300 mt-2">搜书吧本地全文搜索(Full Text Search)</h6>
      </div>
      <div class=" mx-8 flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div>
            <InputText v-model="searchRef" placeholder="搜索..." class=" w-full p-inputtext-lg" @keyup.enter="search" />
          </div>
          <div>
            <div class="flex flex-col gap-2">
              <RadioButtonGroup v-model="searchTarget" name="ingredient" class="flex flex-wrap gap-4">
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
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Card class=" transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
            @click="goViewer" v-for="_ in 10">
            <template #title>
              <p class=" font-bold">标题</p>
            </template>
            <template #content>
              <p class="m-0">
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae
                numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis
                esse, cupiditate neque
                quas!
              </p>
            </template>
          </Card>
        </div>
        <div>
          <Paginator :rows="10" :totalRecords="120">
            <template #container="{ first, last, page, pageCount, prevPageCallback, nextPageCallback, totalRecords }">
              <div
                class="flex items-center gap-4 border border-primary bg-transparent rounded-full w-full py-1 px-2 justify-between">
                <Button icon="pi pi-chevron-left" rounded variant="text" @click="prevPageCallback"
                  :disabled="page === 0" />
                <div class="text-color font-medium">
                  <span class="hidden sm:block">Showing {{ first }} to {{ last }} of {{ totalRecords }}</span>
                  <span class="block sm:hidden">Page {{ page + 1 }} of {{ pageCount }}</span>
                </div>
                <Button icon="pi pi-chevron-right" rounded variant="text" @click="nextPageCallback"
                  :disabled="page === pageCount - 1" />
              </div>
            </template>
          </Paginator>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
