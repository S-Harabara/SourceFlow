import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(), 
    tailwindcss(),
    // @ts-ignore
    (wasm.default || wasm)(),
    // @ts-ignore
    (topLevelAwait.default || topLevelAwait)()
  ],
  worker: {
    plugins: () => [
      // @ts-ignore
      (wasm.default || wasm)(),
      // @ts-ignore
      (topLevelAwait.default || topLevelAwait)()
    ]
  },
  base: './', // CRITICAL for Electron local file loading
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext' // Support top-level await from Wasm
  }
});
