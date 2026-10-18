// JavaScript無効時と、動き低減の設定時の確認。
import { test, expect } from './fixtures';

test.describe('JavaScript無効', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });

  test('本文・主要リンク・メニュー・FAQがHTMLだけで使える', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('静的サイト制作のための最小のひな形');
    await expect(page.getByText('このひな形に含まれるもの')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: '部品の確認画面を開く' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'フッター' }).getByRole('link', { name: '部品の確認画面' })).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'メイン' });
    await nav.locator('summary').click();
    await nav.locator('details').getByRole('link', { name: '部品の確認画面' }).click();
    await expect(page).toHaveURL('/kitchen-sink/');
    await expect(page.getByText('入力内容はどこにも送信されません')).toBeVisible();

    const faq = page.locator('[data-faq-item]').first();
    await faq.locator('summary').click();
    await expect(faq).toHaveAttribute('open');
  });

  test('フォームの送信ボタンを押しても送信されない', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const sent: string[] = [];
    page.on('request', (request) => {
      // ページ移動・送信・通信（fetch/XHR）だけを数える（画像などの遅延読み込みは除く）
      if (['document', 'fetch', 'xhr', 'ping'].includes(request.resourceType()) || request.method() !== 'GET') {
        sent.push(`${request.method()} ${request.url()}`);
      }
    });
    await page.getByLabel('お名前').fill('見本 太郎');
    await page.getByLabel('メールアドレス').fill('name@example.com');
    await page.getByRole('button', { name: '入力内容を確認する（送信しません）' }).click();
    await page.waitForTimeout(300);
    expect(page.url()).toMatch(/\/kitchen-sink\/$/);
    expect(sent).toEqual([]);
  });
});

test.describe('動き低減の設定', () => {
  test('通常時は動きがあり、低減設定では動きがなくなる', async ({ page }) => {
    const icon = '[data-faq-item] summary [aria-hidden="true"]';
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).transitionDuration, icon)).toBe('0.2s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    expect(await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).transitionDuration, icon)).toBe('0s');
  });
});
