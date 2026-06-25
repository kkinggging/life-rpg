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
          { src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // 只用 precache 图标，JS/CSS/HTML 全部走运行时缓存
        globPatterns: ['icon.svg'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // HTML — 网络优先，60秒缓存
          {
            urlPattern: /\/life-rpg\/.*\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 },
            },
          },
          // JS bundles — 网络优先，5分钟缓存
          {
            urlPattern: /\/life-rpg\/assets\/.*\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 300 },
            },
          },
          // CSS — 网络优先
          {
            urlPattern: /\/life-rpg\/assets\/.*\.css$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'css-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 300 },
            },
          },
          // 导航请求 — 网络优先
          {
            urlPattern: /\/life-rpg\/$/,
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
