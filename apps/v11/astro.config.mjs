// @ts-check
// Astro の設定。静的HTMLだけを dist/ に出力する（サーバーコード・アダプターなし）。
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // CSPで inline を許可しないため、CSSは常に外部ファイルにする
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // 小さなJS/CSSも data: や inline に埋め込まず、必ずファイルとして出す
      assetsInlineLimit: 0,
    },
  },
});
