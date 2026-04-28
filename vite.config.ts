import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ command }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    base: command === 'build' ? '/TESTE_ENIGAMI/' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
