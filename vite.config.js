import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Atento',
        short_name: 'Atento',
        description: 'Seu co-piloto IA para TDAH',
        theme_color: '#060a0e',
        background_color: '#060a0e',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  build: {
    // O SDK do Firebase sozinho tem ~564kB minificado (166kB gzip) e já está
    // isolado no próprio chunk — não há mais o que dividir.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Separa as libs pesadas em chunks próprios (cache melhor, aviso de 500kB some)
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@google/generative-ai')) return 'genai';
          if (id.includes('react')) return 'react';
          return 'vendor';
        },
      },
    },
  },
})
