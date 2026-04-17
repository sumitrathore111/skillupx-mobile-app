import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/',
  build: {
    // Optimize chunk splitting for faster loading (Core Web Vitals)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React runtime + helmet (helmet uses React context, must be bundled together)
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('react-helmet-async')) {
            return 'react-core';
          }
          // Router - loaded early but separate
          if (id.includes('react-router')) {
            return 'router';
          }
          // Animation library (~150KB) - defer loading
          if (id.includes('framer-motion') || id.includes('popmotion')) {
            return 'framer-motion';
          }
          // Monaco code editor (~1MB+ — only loaded on CodeArena)
          if (id.includes('monaco') || id.includes('@monaco-editor')) {
            return 'monaco';
          }
          // Three.js 3D rendering (~600KB — only loaded where needed)
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three';
          }
          // PDF/Canvas export utilities (~250KB)
          if (id.includes('html2canvas') || id.includes('jspdf')) {
            return 'export';
          }
          // Real-time communication
          if (id.includes('socket.io')) {
            return 'socket';
          }
          // Icon library - tree-shake properly
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Date/time utilities
          if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
            return 'date-utils';
          }
          // Form handling
          if (id.includes('react-hook-form') || id.includes('zod')) {
            return 'forms';
          }
        },
      },
    },
    // Inline small assets for fewer HTTP requests
    assetsInlineLimit: 4096,
    // Disable source maps in production for smaller bundles
    sourcemap: false,
    // Enable CSS code splitting for faster initial load
    cssCodeSplit: true,
    // Use esbuild for faster minification
    minify: 'esbuild',
    // Target modern browsers for smaller output (es2020 prevents TDZ issues with react-helmet-async)
    target: 'es2020',
    // Aggressive chunk size warning threshold
    chunkSizeWarningLimit: 500,
    // Enable CSS minification
    cssMinify: 'esbuild',
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
    // Exclude heavy deps from pre-bundling
    exclude: ['@monaco-editor/react', 'three'],
  },
  // Improve dev server performance
  server: {
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/Public/HomePage.tsx'],
    },
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Legal comments to separate file
    legalComments: 'none',
  },
})
