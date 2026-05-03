import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-formatjs', {
            idInterpolationPattern: '[sha512:contenthash:base64:6]',
            ast: true,
          }],
        ],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'Corredor CRM',
        short_name: 'Corredor',
        theme_color: '#0f172a',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
    // Uploads source maps to Sentry during production builds.
    // Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars.
    // No-ops when SENTRY_AUTH_TOKEN is unset (local dev / CI without the secret).
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.SENTRY_RELEASE ?? process.env.GITHUB_SHA?.slice(0, 8),
        setCommits: { auto: true },
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ['dist/**/*.map'],
      },
      // Disable the plugin entirely if no auth token is available
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      external: [
        'bullmq',
        'ioredis',
        '@sentry/node',
        '@opentelemetry/api',
        '@opentelemetry/sdk-node',
        'nodemailer',
      ],
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.match(/\/react\//)) return 'react';
          if (id.includes('@tanstack/react-router')) return 'router';
          if (id.includes('@tanstack/react-query') || id.includes('@trpc/')) return 'query';
          if (id.includes('maplibre-gl')) return 'map';
          if (id.includes('pdfjs-dist') || id.includes('react-pdf')) return 'pdf';
          if (id.includes('@tiptap/')) return 'editor';
          if (id.includes('@dnd-kit/')) return 'dnd';
          if (id.includes('@sentry/') || id.includes('posthog')) return 'telemetry';
          if (id.includes('react-intl') || id.includes('@formatjs/')) return 'intl';
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/e2e/**', '**/*.d.ts'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
