// テスト前の確認: ビルド済みの成果物が無ければ、テストを始めずに失敗させる。
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const required = ['dist/index.html', 'dist/kitchen-sink/index.html', 'dist/404.html', 'dist/_headers'];

export default function globalSetup(): void {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const missing = required.filter((file) => !existsSync(`${root}/${file}`));
  if (missing.length > 0) {
    throw new Error(`ビルド済みの成果物がありません: ${missing.join(', ')}。先に npm run build を実行してください。`);
  }
}
