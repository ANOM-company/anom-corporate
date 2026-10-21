// 確認用の画面記録（PC・スマホのトップ全体、メニューを開いた状態、相談フォームの表示見本）。
// 判定は他のテストで行い、ここでは監査・目視確認のための画像をテスト結果に残す（CI の成果物に含まれる）。
import { test, expect } from './fixtures';

for (const viewport of [
  { name: 'pc', width: 1440, height: 900 },
  { name: 'sp', width: 390, height: 844 },
]) {
  test(`画面記録 ${viewport.name}（${viewport.width}×${viewport.height}）`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    // 冒頭の図形の組み上がり（900ms 以内）を待ってから撮る
    await page.waitForTimeout(1000);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-top.png`) });
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-full.png`), fullPage: true });

    await page.getByRole('navigation', { name: '下部メニュー' }).getByRole('button', { name: /メニュー/ }).click();
    await expect(page.getByRole('dialog', { name: 'サイトメニュー' })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-menu.png`) });
    await page.keyboard.press('Escape');

    await page.goto('/kitchen-sink/#ks-form-states');
    await page.evaluate(() => document.fonts.ready);
    // 見本の画像に下部バーが重ならないよう、この撮影のときだけ隠す（CSSOM で指定するため CSP に触れない）
    await page.mouse.move(0, 0);
    await page.locator('[data-bottom-nav]').evaluate((el) => (el as HTMLElement).style.setProperty('visibility', 'hidden'));
    await expect(page.locator('#ks-form-states')).toBeInViewport();
    await page.locator('section[aria-labelledby="ks-form-states"]').screenshot({ path: testInfo.outputPath(`${viewport.name}-form-samples.png`) });
  });
}
