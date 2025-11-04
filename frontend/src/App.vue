<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmDialog';
</script>

<template>
  <Toast />
  <RouterView />
  <ConfirmDialog />
</template>

<style scoped></style>
