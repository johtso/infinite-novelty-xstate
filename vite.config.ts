import preact from '@preact/preset-vite';
import { ConfigEnv, defineConfig, UserConfigExport } from 'vite';

export default function ({ }: ConfigEnv): UserConfigExport {
  return defineConfig({
    plugins: [preact()],
    resolve: {
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat'
      },
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
