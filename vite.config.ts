import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BUILD_ID = Date.now().toString(36)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: `个人OS`,
        short_name: '个人OS',
        description: '量化人生RPG系统 — 属性面板+每日打卡',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `/life-rpg/?v=${BUILD_ID}`,
        scope: '/life-rpg/',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // 不预缓存 index.html — 让导航请求走网络，解决 iOS PWA 更新卡死
        globPatterns: ['**/*.{js,css,svg,png,json,ico}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // 导航请求（HTML 页面）走网络优先，保证始终拿到最新版
        runtimeCaching: [
          {
            urlPattern: /\/life-rpg\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/life-rpg\/index\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
        ],
      },
    }),
  ],
  base: '/life-rpg/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
