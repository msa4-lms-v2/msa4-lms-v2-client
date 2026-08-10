import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Auth는 아직 스켈레톤이라 포트가 확정되지 않았다 - Spring Boot 기본값(8080)으로 가정한다.
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // msa4-lms-v2-payment: application.yaml 기준 8083. /api/academic-status도 RefundController가 여기서 처리한다.
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
})
