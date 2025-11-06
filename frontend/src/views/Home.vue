<script setup lang="ts">
import { useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import InputText from "primevue/inputtext";
import RadioButton from "primevue/radiobutton";
import RadioButtonGroup from "primevue/radiobuttongroup";
import Card from "primevue/card";
import Paginator from "primevue/paginator";
import { searchNovels } from "@/api/main";
import Skeleton from "primevue/skeleton";
import { useSearchStore } from "@/store/search";
import Message from "primevue/message";
import Form from "@primevue/forms/form";
import { useToast } from "primevue/usetoast";
import Drawer from "primevue/drawer";
import Button from "primevue/button";
import HomeTopBar from "@/components/HomeTopBar.vue";
import type { Fav } from "@/types/Fav";
import { useFavsStore } from "@/store/favs";
import { useConfirm } from "primevue/useconfirm";
import { registerSW } from "virtual:pwa-register";
import ProgressBar from 'primevue/progressbar';
import { useProgressStore } from "@/store/progress";

const progressStore = useProgressStore()

const toast = useToast();

const confirm = useConfirm();

const searchStore = useSearchStore();

const router = useRouter();

const rows = ref(20);

const isLoading = ref(false);

const offset = ref(0);

const favsStore = useFavsStore();

const isFav = (tid: number) => favsStore.favs.some((f) => f.tid === tid);

const drawerVisible = ref(false);

const addFav = (tid: number, title: string) => {
	const fav: Fav = { tid, title };
	if (!isFav(tid)) {
		favsStore.favs.push(fav);
		saveFavs();
	}
};

const removeFav = (tid: number) => {
	favsStore.favs = favsStore.favs.filter((f) => f.tid !== tid);
	saveFavs();
};
const saveFavs = () => {
	localStorage.setItem("favorites", JSON.stringify(favsStore.favs));
};

onMounted(() => {
	const updateSW = registerSW({
		immediate: true,

		onNeedRefresh() {
			confirm.require({
				header: "更新可用",
				message: "检测到新版本，是否立即刷新？",
				icon: "pi pi-refresh",
				acceptProps: {
					label: "立即更新",
				},
				rejectProps: {
					label: "稍后",
					severity: "secondary",
					outlined: true,
				},
				accept: () => {
					updateSW(true);
					toast.add({
						severity: "info",
						summary: "更新中",
						detail: "正在刷新以加载最新版本…",
						life: 3000,
					});
				},
				reject: () => {
					toast.add({
						severity: "warn",
						summary: "已取消",
						detail: "稍后可手动刷新更新",
						life: 3000,
					});
				},
			});
		},

		onOfflineReady() {
			toast.add({
				severity: "success",
				summary: "更新完成",
				detail: "已准备好离线使用",
				life: 4000,
			});
		},
	});

	const storedFavs = localStorage.getItem("favorites");
	if (storedFavs) favsStore.favs = JSON.parse(storedFavs);
	offset.value = (searchStore.page - 1) * rows.value;
});

async function fetchData(isNewSearch: boolean) {
	if (isNewSearch) {
		searchStore.records = [];
		searchStore.total = 0;
		searchStore.page = 1;
		offset.value = (searchStore.page - 1) * rows.value;
	}

	try {
		isLoading.value = true;
		const res = await searchNovels(
			searchStore.target,
			searchStore.keyword,
			searchStore.page,
		);
		searchStore.records = [];
		searchStore.records = res.records;
		searchStore.total = res.total;
	} catch (err) {
		toast.add({
			severity: "error",
			summary: "错误",
			detail: "搜索失败",
			life: 3000,
		});
	} finally {
		isLoading.value = false;
	}

	window.scrollTo({
		top: 0,
		behavior: "smooth",
	});
}

function handleCardClick(event: MouseEvent, tid: number) {
	if (event.button === 0) {
		event.preventDefault();
		router.push(`/${tid}`);
	}
}

function onPageChange(event: { page: number }) {
	if (!isLoading.value) {
		searchStore.page = event.page + 1;
		fetchData(false);
	}
}
</script>

<template>
  <div>
    <HomeTopBar />
    <Drawer v-model:visible="drawerVisible" header="收藏夹" position="left" :dismissable="true"
      class="w-full! md:w-80! lg:w-120! dark:bg-surface-700!">
      <div v-if="favsStore.favs.length === 0" class="text-center text-gray-500 mt-4">
        暂无收藏
      </div>
      <div class="flex flex-col gap-4" v-else>
        <a v-for="item in favsStore.favs" :key="item.tid" :href="`/${item.tid}`"
          @click="e => handleCardClick(e, item.tid)" class="block">
          <Card class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-900! cursor-pointer">
            <template #title>
              <div class="flex justify-between">
                <p class="font-bold mr-2 break-all">{{ item.title }}</p>
                <i v-if="isFav(item.tid)" class="pi pi-star-fill" @click.stop.prevent="removeFav(item.tid)"
                  :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                <i v-else class="pi pi-star" @click.stop.prevent="addFav(item.tid, item.title)"
                  :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
              </div>
            </template>
            <template #content>
              <p class="m-0 text-sm text-gray-300">tid: {{ item.tid }}</p>
              <ProgressBar :value="progressStore.progress.find(p => p.tid === item.tid)?.progress ?? 0"></ProgressBar>
            </template>
          </Card>
        </a>
      </div>
    </Drawer>
    <div class=" overflow-x-hidden">
      <div class=" flex flex-col items-center justify-center gap-4">
        <div class=" flex flex-col items-center justify-center mt-40 md:mb-10 mb-4">
          <h1
            class=" text-5xl font-bold bg-linear-to-bl from-violet-500 to-fuchsia-500 inline-block text-transparent bg-clip-text p-1">
            搜书吧: 大図書館</h1>
          <h6 class=" text-gray-300 mt-2">搜书吧全文搜索(FTS)</h6>
        </div>
        <div class="w-full px-8 flex flex-col gap-4">
          <Form @submit="fetchData(true)" class="flex justify-center flex-col gap-4">
            <div class="flex flex-col gap-2">
              <InputText v-model="searchStore.keyword" placeholder="搜索..." class=" w-full p-inputtext-lg" />
              <div class="flex justify-between">
                <div class="flex flex-col gap-2">
                  <Message size="small" severity="secondary" variant="simple">
                    <div class=" flex flex-row items-center gap-2">
                      <p>支持使用布尔运算符</p>
                      <a href="https://docs.rs/tantivy/latest/tantivy/query/struct.QueryParser.html" target="_blank"
                        rel="noopener">
                        <i class="pi pi-question-circle"></i>
                      </a>
                    </div>
                  </Message>
                  <div class="flex justify-between">
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
                <div>
                  <Button icon="pi pi-star-fill" aria-label="Save" @click="drawerVisible = true" />
                </div>
              </div>
            </div>
          </Form>
          <div class="grid md:grid-cols-2 grid-cols-1 gap-4" v-if="isLoading">
            <Skeleton height="15rem"
              class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
              v-for="_ in 10"></Skeleton>
          </div>
          <div class="grid md:grid-cols-2 grid-cols-1 gap-4" v-else>
            <a v-for="item in searchStore.records" :key="item.tid" :href="`/${item.tid}`"
              @click="e => handleCardClick(e, item.tid)" class="block">
              <Card
                class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer">
                <template #title>
                  <div class="flex justify-between">
                    <p class="font-bold break-all">{{ item.title }}</p>
                    <i v-if="isFav(item.tid)" class="pi pi-star-fill" @click.stop.prevent="removeFav(item.tid)"
                      :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }"></i>
                    <i v-else class="pi pi-star" @click.stop.prevent="addFav(item.tid, item.title)"
                      :style="{ color: 'var(--p-button-primary-background)', fontSize: '1.5rem' }">
                    </i>
                  </div>
                </template>
                <template #content>
                  <p class="m-0 break-all">{{ item.snippet }}</p>
                </template>
              </Card>
            </a>
          </div>
          <div>
            <Paginator :rows=rows :totalRecords=searchStore.total v-model:first="offset" @page="onPageChange"
              v-if="searchStore.total !== 0" :template="{
                '640px': 'PrevPageLink CurrentPageReport NextPageLink',
                '960px': 'FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink',
                '1300px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
                default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink JumpToPageDropdown JumpToPageInput'
              }">
            </Paginator>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
