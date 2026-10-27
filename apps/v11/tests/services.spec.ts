// サービス欄。
// - 各カードの詳細は閉じた状態で始まり、ボタンで開閉できる（閉じている間もページ内検索で見つかる）
// - 「サービスの詳細をすべて見る」で4つまとめて開閉でき、ボタンの名前が切り替わる
// - 「このサービスについて相談する」でお問い合わせ欄へ移り、相談のサービスとして表示される
import { test, expect, services } from './fixtures';

test.describe('サービスの詳細', () => {
  test('ボタンで1つずつ開閉できる', async ({ page }) => {
    await page.goto('/');
    for (const service of services.items) {
      const card = page.locator(`#${service.anchor}`);
      const toggle = card.locator('[data-svc-toggle]');
      const detail = card.locator('[data-svc-detail]');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toHaveAttribute('aria-controls', `${service.anchor}-detail`);
      await expect(toggle).toHaveAccessibleName(`${service.name}を${services.open}`);
      await expect(detail).toHaveAttribute('hidden', 'until-found');
      await expect(detail).toBeHidden();

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle).toHaveAccessibleName(`${service.name}を${services.close}`);
      await expect(detail).toBeVisible();

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(detail).toBeHidden();
    }
  });

  test('「すべて見る」で4つまとめて開閉できる', async ({ page }) => {
    await page.goto('/');
    const all = page.locator('[data-expand-all]');
    await expect(all).toBeVisible();
    await expect(all).toHaveAccessibleName(services.expandAll);
    await all.click();
    await expect(all).toHaveAttribute('aria-expanded', 'true');
    await expect(all).toHaveAccessibleName(services.collapseAll);
    await expect(page.locator('[data-svc-detail]:visible')).toHaveCount(services.items.length);

    await all.click();
    await expect(all).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-svc-detail]:visible')).toHaveCount(0);

    // 1つずつ全部開くと、「すべて閉じる」の表示にそろう
    for (const service of services.items) await page.locator(`#${service.anchor} [data-svc-toggle]`).click();
    await expect(all).toHaveAccessibleName(services.collapseAll);
  });

  test('「このサービスについて相談する」でお問い合わせ欄へ移り、相談のサービスが表示される', async ({ page }) => {
    await page.goto('/');
    const service = services.items.find((s) => s.id === 'web-dx')!;
    const card = page.locator(`#${service.anchor}`);
    await card.locator('[data-svc-toggle]').click();
    await card.locator('[data-consult]').click();
    await expect(page).toHaveURL(/#contact$/);
    const topic = page.locator('[data-topic]');
    await expect(topic).toBeVisible();
    await expect(page.locator('[data-topic-name]')).toHaveText(service.name);
    await expect(page.locator('[data-topic-input]')).toHaveValue(service.name);

    await page.locator('[data-topic-clear]').click();
    await expect(topic).toBeHidden();
    await expect(page.locator('[data-topic-input]')).toHaveValue('');
    await expect(page.locator('#contact-name')).toBeFocused();
  });
});
