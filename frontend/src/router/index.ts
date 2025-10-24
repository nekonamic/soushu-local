import { createRouter, createWebHistory } from 'vue-router'
import Main from '@/views/Home.vue'
import Viewer from '@/views/Viewer.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      component: Main,
    },
    {
      path: '/:tid',
      name: 'viewer',
      component: Viewer,
    },
  ],
})

export default router
