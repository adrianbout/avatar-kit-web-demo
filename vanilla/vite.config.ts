import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { avatarkitVitePlugin } from '@spatialwalk/avatarkit/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    // Use SDK's Vite plugin to automatically handle WASM configuration
    // This plugin automatically:
    // - Sets correct MIME type for WASM files in dev server
    // - Copies WASM files to dist/assets/ during build
    // - Generates _headers file for Cloudflare Pages
    // - Configures optimizeDeps, assetsInclude, and assetsInlineLimit
    avatarkitVitePlugin(),
  ],
  root: __dirname,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
      },
    },
  },
  server: {
    port: 5174,
    open: true,
  },
  publicDir: false,
})
