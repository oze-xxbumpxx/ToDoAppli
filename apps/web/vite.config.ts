import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * 純粋な SPA。API は別オリジン（http://localhost:3000）で動く。
 *
 * dev プロキシを置いていないのは、本番でも別オリジンになるため。
 * プロキシで同一オリジンに見せかけると、CORS の設定ミスがローカルで露見しない。
 * API 側は main.ts で WEB_ORIGIN を許可済み（docs/06-infra-ci.md 6.4）。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
