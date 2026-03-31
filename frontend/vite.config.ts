import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            manifest: {
                name: 'LPAPP - Manajemen Santri',
                short_name: 'LPAPP',
                theme_color: '#059669',
                background_color: '#f8fafc',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: '/logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/logo.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true
            }
        })
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: true,
    },
    preview: {
        host: '0.0.0.0',
        port: 5173,
    },
})

