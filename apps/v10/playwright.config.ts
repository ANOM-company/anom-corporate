// Playwright の設定。ビルド済みの dist/ をローカルの Wrangler で配信してテストする。
// 先に `npm run build` が必要（未ビルドなら tests/global-setup.ts が止める）。
import { defineConfig, devices } from '@playwright/test';

const port = 8788;
const isCI = Boolean(process.env['CI']);
// クラウド環境などでブラウザーを取得できない場合だけ、手元のChromiumを使うための逃げ道（CIでは使わない）
const executablePath = process.env['PW_CHROMIUM_EXECUTABLE'] || undefined;

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  // 再試行で失敗を隠さない
  retries: 0,
  globalTimeout: 15 * 60 * 1000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
