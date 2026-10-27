// JavaScript 無効時と、動きを減らす設定・「動きを止める」ボタンの確認。
// - JavaScript 無効: チップはサービス欄へのリンク、カード・サービスの詳細・下部バーは見えたまま、
//   送信ボタンは押せない（どこにも送らない）。「動きを止める」ボタンが使えないので、くり返しの動きは1回で終わる
// - 端末で動きを減らしている: 漂い続ける動きがなく、「動きを止める」ボタンも出さない
// - 「動きを止める」: 押すと漂い続ける動きが止まり、名前が「動きを再開する」に変わる。再読み込みしても止まったまま
import type { Page } from '@playwright/test';
import { test, expect, worryMap, initial, services } from './fixtures';

/** 再生中の、終わりのない動き（CSS アニメーション）の数 */
async function runningLoops(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length,
  );
}

test.describe('JavaScript 無効', () => {
  test.use({ javaScriptEnabled: false });

  for (const width of [390, 1440]) {
    test(`${width}px: 主な内容と移動が使える`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      for (const worry of worryMap) {
        const link = page.locator(`[data-chips] [data-worry="${worry.id}"]`);
        await expect(link).toHaveJSProperty('tagName', 'A');
        await expect(link).toHaveAttribute('href', `#${worry.anchor}`);
      }
      await expect(page.locator('[data-preview-item]:not([hidden]) .preview__name')).toHaveText(initial.name);
      for (const service of services.items) {
        await expect(page.locator(`#${service.anchor} [data-svc-detail]`)).toBeVisible();
        await expect(page.locator(`#${service.anchor} [data-svc-toggle]`)).toBeHidden();
      }
      await expect(page.locator('[data-expand-all]')).toBeHidden();
      await expect(page.locator('[data-submit]')).toBeDisabled();
      await expect(page.locator('[data-bottom-bar]')).toBeVisible();
      await expect(page.locator('[data-motion-toggle]')).toBeHidden();
      // 止めるボタンが使えないので、くり返しの動きは1回で終わる
      const counts = await page.evaluate(() =>
        [...new Set([...document.querySelectorAll('body *')].map((el) => getComputedStyle(el).animationIterationCount))],
      );
      expect(counts).not.toContain('infinite');

      // チップのリンクでサービス欄へ移動できる
      const target = worryMap.find((w) => w.service === 'web-dx')!;
      await page.locator(`[data-chips] [data-worry="${target.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${target.anchor}$`));
      await expect(page.locator(`#${target.anchor}`)).toBeInViewport();
    });
  }
});

test.describe('端末で動きを減らしている', () => {
  test.use({ reducedMotion: 'reduce' });

  test('漂い続ける動きがなく、「動きを止める」ボタンも出さない', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-motion-toggle]')).toBeHidden();
    expect(await runningLoops(page)).toBe(0);
    // 出現の演出で隠れたままの要素がない
    await expect(page.locator('.is-pending')).toHaveCount(0);
  });
});

test.describe('「動きを止める」ボタン', () => {
  test('押すと動きが止まり、再読み込みしても止まったまま。もう一度押すと再開する', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const toggle = page.locator('[data-motion-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAccessibleName('動きを止める');
    await expect(toggle).not.toHaveAttribute('aria-pressed');
    expect(await runningLoops(page)).toBeGreaterThan(0);

    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/is-paused/);
    await expect(toggle).toHaveAccessibleName('動きを再開する');
    expect(await runningLoops(page)).toBe(0);
    await expect(page.locator('.is-pending')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/is-paused/);
    await expect(toggle).toHaveAccessibleName('動きを再開する');
    expect(await runningLoops(page)).toBe(0);

    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/is-paused/);
    await expect(toggle).toHaveAccessibleName('動きを止める');
    await expect.poll(() => runningLoops(page)).toBeGreaterThan(0);
  });
});
