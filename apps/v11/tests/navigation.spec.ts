// ヘッダー・メニュー・画面下の相談バー。
// - スマホ: メニュー（dialog）を開くと閉じるボタンへ移り、Esc で閉じて開いたボタンへ戻る。
//   メニューのリンクでは閉じてから移動先へスクロールする
// - PC: メニューボタンは出さず、ナビゲーションを常に表示する
// - 相談バー: ファーストビューの相談ボタンが見えている間とお問い合わせ欄では隠し（Tab でも移れない）、
//   それ以外では表示する
import { test, expect } from './fixtures';
import { nav } from '../src/data/site';

test.describe('スマホのメニュー', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('開くと閉じるボタンへ移り、Esc で閉じて元のボタンへ戻る', async ({ page }) => {
    await page.goto('/');
    const open = page.locator('[data-menu-open]');
    const dialog = page.locator('[data-menu]');
    await expect(open).toBeVisible();
    await expect(open).toHaveAccessibleName(nav.menuOpen);
    await open.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveJSProperty('open', true);
    await expect(page.getByRole('button', { name: nav.menuClose })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('閉じるボタンで閉じられる', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-menu-open]').click();
    await page.getByRole('button', { name: nav.menuClose }).click();
    await expect(page.locator('[data-menu]')).toBeHidden();
  });

  for (const item of nav.items) {
    test(`メニューの「${item.label}」で閉じてから移動する`, async ({ page }) => {
      await page.goto('/');
      await page.locator('[data-menu-open]').click();
      await page.locator('[data-menu] .menu__link', { hasText: item.label }).click();
      await expect(page.locator('[data-menu]')).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`${item.href}$`));
      await expect(page.locator(item.href)).toBeInViewport();
    });
  }
});

test.describe('PC のヘッダー', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('メニューボタンは出さず、ナビゲーションを表示する', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-menu-open]')).toBeHidden();
    for (const item of nav.items) {
      await expect(page.locator('.header [data-nav-link]', { hasText: item.label })).toBeVisible();
    }
  });

  test('スクロールすると、いまいるセクションのリンクに印が付く', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.querySelector('#services')!.scrollIntoView({ behavior: 'instant' }));
    await expect(page.locator('.header [data-nav-link][href="#services"]')).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('画面下の相談バー', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('ファーストビューとお問い合わせ欄では隠し、それ以外では表示する', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('[data-bottom-bar]');
    await expect(bar).toHaveClass(/is-hidden/);
    await expect(bar).toHaveJSProperty('inert', true);

    await page.evaluate(() => document.querySelector('#services')!.scrollIntoView({ behavior: 'instant' }));
    await expect(bar).not.toHaveClass(/is-hidden/);
    await expect(bar).toHaveJSProperty('inert', false);
    await expect(bar.locator('a[href="#contact"]')).toBeVisible();
    await expect(bar.locator('a[href="#services"]')).toBeVisible();

    await page.evaluate(() => document.querySelector('#contact')!.scrollIntoView({ behavior: 'instant' }));
    await expect(bar).toHaveClass(/is-hidden/);
    await expect(bar).toHaveJSProperty('inert', true);
  });
});
