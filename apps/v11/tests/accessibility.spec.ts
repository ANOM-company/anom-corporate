// アクセシビリティの自動検査（axe-core）。重大（critical）・深刻（serious）な指摘は0件を求める。
// 自動検査で見つかるのは一部の問題だけなので、これをもってWCAG適合とはしない。
import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect, clickMoving, waitForMotionEnd } from './fixtures';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function audit(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  await waitForMotionEnd(page);
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  // 全指摘（軽微なものを含む）を、該当した要素とともに記録として残す
  const details = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
  }));
  await testInfo.attach(`axe-${label}.json`, {
    body: JSON.stringify({ url: page.url(), details, incomplete: results.incomplete.map((v) => v.id) }, null, 2),
    contentType: 'application/json',
  });
  const blocking = details.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(blocking, `${label}: 重大・深刻な指摘`).toEqual([]);
}

/** 出現の演出を待たずに全体を検査できるよう、ページ全体を一度スクロールする */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

for (const width of [360, 1440]) {
  test.describe(`axe @ ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('トップページ（最初の状態）', async ({ page }, testInfo) => {
      await page.goto('/');
      await scrollThrough(page);
      await audit(page, testInfo, `top-${width}`);
    });

    test('悩みを選び、サービスの詳細をすべて開き、フォームの誤りを表示した状態', async ({ page }, testInfo) => {
      await page.goto('/');
      await clickMoving(page, 'inquiry-time');
      await page.locator('[data-expand-all]').click();
      await page.locator('[data-submit]').click();
      await scrollThrough(page);
      await audit(page, testInfo, `interacted-${width}`);
    });
  });
}

test('axe @ 390px: メニューを開いた状態', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-menu-open]').click();
  await expect(page.locator('[data-menu]')).toBeVisible();
  await audit(page, testInfo, 'menu-390');
});

test('axe @ 1440px: 動きを止めた状態', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-motion-toggle]').click();
  await audit(page, testInfo, 'paused-1440');
});
