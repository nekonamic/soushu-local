import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '搜书吧: 大図書館',
        short_name: '大図書館',
        description: '搜书吧全文搜索',
        theme_color: '#8b5cf6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // 简化的缓存配置，只使用预缓存
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg}',
          // 匹配所有字体文件，包括带有hash的PrimeIcons文件
          '**/primeicons*.{woff,woff2,ttf,eot,svg}',
          '**/*.{woff,woff2,ttf,eot,svg}'
        ]
      },
      devOptions: {
        enabled: true,
      }
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
