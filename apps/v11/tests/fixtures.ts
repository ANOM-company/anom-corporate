// 共通のテスト部品。
// - すべてのテストで、ブラウザーの実行エラー・コンソールエラー・読み込み失敗を記録し、
//   1件でもあればテストを失敗させる（CSP違反もコンソールエラーとして検出される）
// - ページ移動・送信・通信の発生を数える trackSends
// - 原稿（src/data/site.ts）から、悩みとサービスの対応表を作る
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { services, worries, initialWorry } from '../src/data/site';

/** 横はみ出しを確かめる画面幅（320〜390 はスマホ、768/1024 はタブレット、1200 以上は PC） */
export const widths = [320, 360, 390, 768, 1024, 1200, 1280, 1440, 1920] as const;

/** 悩みチップごとの、対応するサービスの名前とアンカー */
export const worryMap = worries.map((worry) => {
  const service = services.items.find((s) => s.id === worry.service);
  if (!service) throw new Error(`サービスが見つかりません: ${worry.service}`);
  return { id: worry.id, label: worry.label, service: service.id, name: service.name, anchor: service.anchor };
});

export const initial = worryMap.find((w) => w.id === initialWorry)!;
export { services };

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

/** 動き（CSS の transition と animation の有限のもの）が終わるまで待つ。漂い続ける動きは対象外 */
export async function waitForMotionEnd(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .every((animation) => animation.playState !== 'running' && !animation.pending),
  );
}

/** 悩みチップ（JavaScript でボタンになったもの） */
export function chip(page: Page, worryId: string) {
  return page.locator(`[data-chips] [data-worry="${worryId}"]`);
}

/** チップの名前（区切りごとの改行で、読み上げ名に空白が入ることがある）に一致する正規表現 */
export function nameOf(label: string): RegExp {
  return new RegExp(`^${[...label].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s?')}$`);
}

/**
 * 漂っている悩みチップを、その瞬間の中央の位置でクリックする（人が動いている的を押すのと同じ）。
 * Playwright の通常のクリックは、要素が止まるまで待つため使えない
 */
export async function clickMoving(page: Page, worryId: string): Promise<void> {
  const box = await chip(page, worryId).boundingBox();
  if (!box) throw new Error(`チップが見つかりません: ${worryId}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** いま表示されている「この悩みに対応するサービス」のカード */
export function visiblePreview(page: Page) {
  return page.locator('[data-preview-item]:not([hidden])');
}
