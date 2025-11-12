<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import { useAppStore } from "@/store/app";
import { setApiBase } from "@/api/main";

const appStore = useAppStore();

// 确保应用启动时API设置正确加载
onMounted(() => {
  // 双重保险：如果appStore中有自定义API Base，确保全局变量也已设置
  if (appStore.apiBase) {
    setApiBase(appStore.apiBase);
  }
});
</script>

<template>
  <Toast />
  <RouterView />
  <ConfirmDialog />
</template>

<style scoped></style>
