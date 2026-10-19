// 共通のテスト部品。
// - すべてのテストで、ブラウザーの実行エラー・コンソールエラー・同一オリジンの読み込み失敗を記録し、
//   1件でもあればテストを失敗させる（CSP違反もコンソールエラーとして検出される）
// - モーダル（展開メニューを含む）の Tab 移動を確かめる walkDialog
// - ページ移動・送信・通信の発生を数える trackSends
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const pages = [
  { name: 'top', path: '/' },
  { name: 'kitchen-sink', path: '/kitchen-sink/' },
] as const;

/** 横はみ出しを確かめる画面幅（320 / 390 はスマホ、768 はタブレット、1440 は PC） */
export const widths = [320, 360, 390, 768, 1440] as const;

/** トップページに必ず存在するアンカー（設計のアンカー台帳） */
export const anchors = [
  'top',
  'services',
  'service-ai',
  'service-web',
  'service-system',
  'examples',
  'about',
  'process',
  'learning',
  'contact',
  'contact-privacy',
  'site-navigation',
] as const;

type Fixtures = {
  browserErrors: string[];
  /** 404ページを開くテストだけ、本文の404によるコンソール出力を許可する */
  allowNotFoundDocument: boolean;
  /** フォントの読み込みを意図的に止めるテストだけ、そのURLの読み込み失敗を許可する */
  allowFailedRequests: RegExp | null;
};

export const test = base.extend<Fixtures>({
  allowNotFoundDocument: [false, { option: true }],
  allowFailedRequests: [null, { option: true }],
  browserErrors: [
    async ({ page, allowNotFoundDocument, allowFailedRequests }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (allowNotFoundDocument && text.includes('404')) return;
        if (allowFailedRequests && text.includes('net::ERR_FAILED')) return;
        errors.push(`console.error: ${text}`);
      });
      page.on('requestfailed', (request) => {
        if (allowFailedRequests?.test(request.url())) return;
        errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`);
      });
      await use(errors);
      expect(errors, 'ブラウザーの実行エラーがないこと').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** ページ移動・送信・通信（fetch/XHR/ping）と GET 以外のリクエストを記録する（画像などの読み込みは除く） */
export function trackSends(page: Page): string[] {
  const sent: string[] = [];
  page.on('request', (request) => {
    if (['document', 'fetch', 'xhr', 'ping'].includes(request.resourceType()) || request.method() !== 'GET') {
      sent.push(`${request.method()} ${request.url()}`);
    }
  });
  return sent;
}

type FocusState = { index: number; isBody: boolean; label: string };

/** 現在のフォーカスが、開いているモーダル内の何番目の操作要素か（-1 = モーダル外）。body/なし は isBody */
async function focusState(page: Page): Promise<FocusState> {
  return page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    const items = dialog
      ? [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, summary')]
      : [];
    const active = document.activeElement;
    return {
      index: active ? items.indexOf(active as HTMLElement) : -1,
      isBody: !active || active === document.body,
      label: active ? `${active.tagName.toLowerCase()} "${(active.textContent ?? '').trim().slice(0, 20)}"` : '(なし)',
    };
  });
}

/**
 * 開いているモーダルの中で Tab（または Shift+Tab）を繰り返し、次を確かめる。
 * - 背景のページ要素へは一度もフォーカスが移らない
 * - body になる（= ブラウザーの操作部へ出た）のは、端の要素の直後だけで、次の操作で反対側の端へ戻る
 * - モーダル内の操作可能な要素をすべて通る
 * 開始時点で、モーダル内の操作要素のどれかにフォーカスがあること。
 */
export async function walkDialog(page: Page, key: 'Tab' | 'Shift+Tab', count: number): Promise<void> {
  const total = await page.evaluate(
    () =>
      document
        .querySelector('dialog[open]')
        ?.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, summary').length ?? 0,
  );
  expect(total).toBeGreaterThanOrEqual(2);
  const forward = key === 'Tab';
  const edgeBefore = forward ? total - 1 : 0;
  const edgeAfter = forward ? 0 : total - 1;
  const visited = new Set<number>();
  let previous = await focusState(page);
  expect(previous.index, `開始位置: ${previous.label}`).toBeGreaterThanOrEqual(0);
  visited.add(previous.index);

  for (let i = 0; i < count; i += 1) {
    await page.keyboard.press(key);
    const current = await focusState(page);
    const step = `${key} ${i + 1} 回目: ${previous.label} → ${current.label}`;
    if (current.isBody) {
      // ブラウザーの操作部へ出るのは、端の要素からだけ
      expect(previous.index, step).toBe(edgeBefore);
    } else {
      expect(current.index, `背景のページ要素へ移っていないこと ${step}`).toBeGreaterThanOrEqual(0);
      if (previous.isBody) {
        // ブラウザーの操作部から戻ると、モーダルの反対側の端へ戻る
        expect(current.index, step).toBe(edgeAfter);
      } else {
        const expected = forward ? (previous.index + 1) % total : (previous.index - 1 + total) % total;
        expect(current.index, step).toBe(expected);
      }
      visited.add(current.index);
    }
    previous = current;
  }
  expect(visited.size, 'モーダル内の要素をすべて通ること').toBe(total);
  // 最後はモーダル内に戻っている
  if (previous.isBody) await page.keyboard.press(key);
  expect((await focusState(page)).index).toBeGreaterThanOrEqual(0);
}
