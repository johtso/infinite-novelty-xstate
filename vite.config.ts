import react from '@vitejs/plugin-react';
import { ConfigEnv, defineConfig, UserConfigExport } from 'vite';
import svgrPlugin from 'vite-plugin-svgr';

export default function ({ }: ConfigEnv): UserConfigExport {
  return defineConfig({
    plugins: [
      // preact(),
      react(),
      svgrPlugin()
    ],
    resolve: {
      // alias: {
      //   'react': 'preact/compat',
      //   'react-dom': 'preact/compat'
      // },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        }
      }
    }
  })
}
