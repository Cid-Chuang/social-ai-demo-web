/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  test: {
    // useTask 的測試需要 React 的 render 環境
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // 釘死測試用的環境變數，避免測試結果隨各人的 .env.local 而不同
    env: {
      VITE_API_BASE_URL: 'https://api.test',
      VITE_USE_MOCK: 'false',
    },
  },
})
