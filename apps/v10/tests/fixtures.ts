// 共通のテスト部品。
// - すべてのテストで、ブラウザーの実行エラー・コンソールエラー・同一オリジンの読み込み失敗を記録し、
//   1件でもあればテストを失敗させる（CSP違反もコンソールエラーとして検出される）
import { test as base, expect } from '@playwright/test';

export const pages = [
  { name: 'top', path: '/' },
  { name: 'kitchen-sink', path: '/kitchen-sink/' },
] as const;

export const widths = [360, 768, 1440] as const;

type Fixtures = {
  browserErrors: string[];
  /** 404ページを開くテストだけ、本文の404によるコンソール出力を許可する */
  allowNotFoundDocument: boolean;
};

export const test = base.extend<Fixtures>({
  allowNotFoundDocument: [false, { option: true }],
  browserErrors: [
    async ({ page, allowNotFoundDocument }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (allowNotFoundDocument && text.includes('404')) return;
        errors.push(`console.error: ${text}`);
      });
      page.on('requestfailed', (request) => {
        errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`);
      });
      await use(errors);
      expect(errors, 'ブラウザーの実行エラーがないこと').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
