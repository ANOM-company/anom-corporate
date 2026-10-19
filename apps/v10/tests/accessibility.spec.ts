// アクセシビリティの自動検査（axe-core）。重大（critical）・深刻（serious）な指摘は0件を求める。
// 自動検査で見つかるのは一部の問題だけなので、これをもってWCAG適合とはしない。
import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect, pages } from './fixtures';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * 開閉・切替・組み上がりの動き（CSS の transition と animation）がすべて終わるまで待つ。
 * 動きの途中（例: 閉じかけて半透明のメニュー）の色や重なりを、静止した画面の指摘として扱わないため。
 * 判定の基準や対象は変えない。
 */
async function waitForMotionEnd(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running' && !animation.pending),
  );
}

async function audit(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  await waitForMotionEnd(page);
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
  }));
  // 全指摘（軽微なものを含む）を、該当した要素（セレクター・HTML・理由）とともに記録として残す
  const details = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
  }));
  await testInfo.attach(`axe-${label}.json`, {
    body: JSON.stringify({ url: page.url(), violations: summary, details, incomplete: results.incomplete.map((v) => v.id) }, null, 2),
    contentType: 'application/json',
  });
  const blocking = details.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(blocking, `${label}: 重大・深刻な指摘`).toEqual([]);
}

for (const width of [360, 1440]) {
  test.describe(`axe @ ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const { name, path } of pages) {
      test(name, async ({ page }, testInfo) => {
        await page.goto(path);
        await audit(page, testInfo, `${name}-${width}`);
      });
    }

    test('kitchen-sink: エラー表示中とモーダル表示中', async ({ page }, testInfo) => {
      await page.goto('/kitchen-sink/');
      await page.getByRole('button', { name: '入力内容を確認する（送信しません）' }).click();
      await audit(page, testInfo, `form-errors-${width}`);
      await page.getByRole('button', { name: 'モーダルを開く' }).click();
      await audit(page, testInfo, `modal-open-${width}`);
    });

    test('top: 展開メニュー表示中と、相談分野を引き継いだ状態', async ({ page }, testInfo) => {
      await page.goto('/');
      await page.getByRole('navigation', { name: '下部メニュー' }).getByRole('button', { name: /メニュー/ }).click();
      const dialog = page.getByRole('dialog', { name: 'サイトメニュー' });
      await expect(dialog).toBeVisible();
      await audit(page, testInfo, `top-menu-open-${width}`);
      // 閉じる動き（200ms）の途中でも、背面のボタンは押せる（閉じかけの面は操作を受けない）
      await page.keyboard.press('Escape');
      await page.locator('#service-web a[data-consult-field="web"]').click();
      await expect(page.locator('[data-contact-status]')).not.toBeEmpty();
      // 閉じ終わって画面から消えたことを確かめてから判定する
      await expect(dialog).toBeHidden();
      await expect(page.locator('#site-menu')).toHaveCSS('display', 'none');
      await audit(page, testInfo, `top-contact-handoff-${width}`);
    });
  });
}

test.describe('axe 404', () => {
  test.use({ allowNotFoundDocument: true });
  test('404', async ({ page }, testInfo) => {
    await page.goto('/missing/');
    await audit(page, testInfo, '404');
  });
});
