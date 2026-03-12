import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiBaseUrl = (env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const devApiProxyTarget = (env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:4000').replace(/\/+$/, '');
  const useRelativeApiBase = apiBaseUrl.startsWith('/');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
      proxy: useRelativeApiBase
        ? {
            [apiBaseUrl]: {
              target: devApiProxyTarget,
              changeOrigin: true,
              rewrite: (requestPath) =>
                requestPath === apiBaseUrl
                  ? '/'
                  : requestPath.replace(new RegExp(`^${apiBaseUrl}`), ''),
            },
          }
        : undefined,
    },
  };
});
