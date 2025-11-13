<script setup lang="ts">
import { useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import { searchNovels, randomNovels } from "@/api/main";
import { useSearchStore } from "@/store/search";
import { useToast } from "primevue/usetoast";
import HomeTopBar from "@/components/HomeTopBar.vue";
import type { Fav } from "@/types/Fav";
import { useConfirm } from "primevue/useconfirm";
import { registerSW } from "virtual:pwa-register";
import { downloadNovel } from "@/utils/download";
import { useProgress, useFavorites, useHistory } from "@/composables/useLocal";

const history = useHistory();
const progress = useProgress();
const favorites = useFavorites();

const toast = useToast();

const confirm = useConfirm();

const searchStore = useSearchStore();

const router = useRouter();

const rows = ref(20);

const isLoading = ref(false);

const offset = ref(0);

const isFav = (tid: number) => favorites.value.some((f) => f.tid === tid);

const drawerVisible = ref(false);

const addFav = (tid: number, title: string) => {
	const fav: Fav = { tid, title };
	if (!isFav(tid)) {
		favorites.value.push(fav);
	}
};

const removeFav = (tid: number) => {
	favorites.value = favorites.value.filter((f) => f.tid !== tid);
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

	offset.value = (searchStore.page - 1) * rows.value;
});

async function fetchData(isNewSearch: boolean) {
	if (isNewSearch) {
		if (!history.value.includes(searchStore.keyword)) {
			history.value.unshift(searchStore.keyword);
		}
		if (history.value.length > 20) {
			history.value = history.value.slice(0, 20);
		}

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
		if (isNewSearch) {
			toast.add({
				severity: "success",
				summary: "完成",
				detail: `匹配到${searchStore.total}个文档`,
				life: 4000,
			});
		}
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

	setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 50);
}

async function fetchRandomData() {
	searchStore.records = [];
	searchStore.total = 0;
	searchStore.page = 1;
	offset.value = (searchStore.page - 1) * rows.value;

	try {
		isLoading.value = true;
		const res = await randomNovels();
		searchStore.records = [];
		searchStore.records = res.records;
		searchStore.total = res.total;
		toast.add({
			severity: "success",
			summary: "完成",
			detail: `随机获取20个文档`,
			life: 4000,
		});
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
      class="w-full! md:w-80! lg:w-120! bg-surface-50! dark:bg-surface-700!">
      <div v-if="favorites.length === 0" class="text-center text-gray-500 mt-4">
        暂无收藏
      </div>
      <div class="flex flex-col gap-4" v-else>
        <a v-for="item in favorites" :key="item.tid" :href="`/${item.tid}`" @click="e => handleCardClick(e, item.tid)"
          class="block">
          <Card class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-900! cursor-pointer">
            <template #title>
              <div class="flex justify-between items-center">
                <p class="font-bold mr-2 break-all">{{ item.title }}</p>
                <div
                  class="flex items-center justify-center h-10 w-10 rounded-full cursor-pointer transition-all duration-200 hover:bg-surface-300 dark:hover:bg-surface-700"
                  @click.stop.prevent="isFav(item.tid) ? removeFav(item.tid) : addFav(item.tid, item.title)">
                  <i :class="['pi', isFav(item.tid) ? 'pi-star-fill' : 'pi-star']" :style="{
                    color: isFav(item.tid)
                      ? 'var(--p-button-primary-background)'
                      : 'var(--p-text-color)',
                    fontSize: '1.25rem'
                  }" />
                </div>
              </div>
            </template>
            <template #content>
              <ProgressBar :value="Math.floor(progress.find(p => p.tid === item.tid)?.progress ?? 0)" />
            </template>
          </Card>
        </a>
      </div>
    </Drawer>
    <div>
      <div class=" flex flex-col items-center justify-center gap-4">
        <div class=" flex flex-col items-center justify-center mt-40 md:mb-10 mb-4">
          <h1
            class=" text-5xl font-bold bg-linear-to-bl from-violet-500 to-fuchsia-500 inline-block text-transparent bg-clip-text p-1">
            搜书吧: 大図書館</h1>
          <h6 class=" text-gray-300 mt-2">搜书吧全文搜索(FTS)</h6>
        </div>
        <div class=" max-w-7xl w-full px-8 flex flex-col gap-4">
          <Form @submit="fetchData(true)" class="flex justify-center flex-col gap-4">
            <div class="flex flex-col gap-2">
              <AutoComplete v-model="searchStore.keyword" placeholder="搜索..."
                :inputStyle="{ width: '100%', fontSize: '16px' }" :suggestions="history" :completeOnFocus="true" />
              <div class="flex justify-between">
                <div class="flex flex-col gap-2">
                  <Message size="small" severity="secondary" variant="simple">
                    <div class=" flex flex-row items-center gap-2">
                      <p>搜索指南</p>
                      <router-link to="/doc">
                        <i class="pi pi-question-circle"></i>
                      </router-link>
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
                <div class="flex flex-row gap-2 sm:gap-4 items-center">
                  <Button icon="pi pi-sync" aria-label="Save" @click="fetchRandomData" />
                  <Button icon="pi pi-star-fill" aria-label="Save" @click="drawerVisible = true" />
                </div>
              </div>
            </div>
          </Form>
          <div class="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4" v-if="isLoading">
            <Skeleton height="15rem"
              class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer"
              v-for="_ in 20"></Skeleton>
          </div>
          <div class="columns-1 sm:columns-2 md:columns-3 gap-4" v-else>
            <a v-for="item in searchStore.records" :key="item.tid" :href="`/${item.tid}`"
              @click="e => handleCardClick(e, item.tid)" class="block mb-4 break-inside-avoid">
              <Card
                class="transition-colors duration-200 hover:bg-surface-100! dark:hover:bg-surface-800! cursor-pointer">
                <template #title>
                  <div class="flex justify-between">
                    <p class="font-bold break-all mr-2">{{ item.title }}</p>
                  </div>
                </template>
                <template #content>
                  <div class=" flex flex-row justify-between">
                    <div class="flex items-center justify-center">
                      <p class="m-0 text-sm text-gray-500">字数: {{ item.count.toLocaleString() }}字</p>
                    </div>
                    <div class=" flex flex-row">
                      <div
                        class="flex items-center justify-center h-10 w-10 rounded-full cursor-pointer transition-all duration-200 hover:bg-surface-300 dark:hover:bg-surface-700"
                        @click.stop.prevent="downloadNovel(item.tid)">
                        <i class="pi pi-download" :style="{ fontSize: '1.25rem' }" />
                      </div>
                      <div
                        class="flex items-center justify-center h-10 w-10 rounded-full cursor-pointer transition-all duration-200 hover:bg-surface-300 dark:hover:bg-surface-700"
                        @click.stop.prevent="isFav(item.tid) ? removeFav(item.tid) : addFav(item.tid, item.title)">
                        <i :class="['pi', isFav(item.tid) ? 'pi-star-fill' : 'pi-star']" :style="{
                          color: isFav(item.tid)
                            ? 'var(--p-button-primary-background)'
                            : 'var(--p-text-color)',
                          fontSize: '1.25rem'
                        }" />
                      </div>
                    </div>
                  </div>
                </template>
              </Card>
            </a>
          </div>
          <div>
            <Paginator :rows=rows :totalRecords=searchStore.total v-model:first="offset" @page="onPageChange"
              v-if="searchStore.total !== 0" :template="{
                '640px': 'PrevPageLink CurrentPageReport NextPageLink JumpToPageInput',
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
