// JavaScript無効時と、動き低減の設定時の確認。
import { test, expect, trackSends } from './fixtures';

test.describe('JavaScript無効', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('トップ: 本文・主要リンク・3つの画面デモ・サイト案内がHTMLだけで使える', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('技術を、仕事の力に。');

    // 切替ボタンは出さず、3つの画面デモの説明とリンクを縦に並べる
    await expect(page.locator('[data-demo-tablist]')).toBeHidden();
    for (const [title, link] of [
      ['AI・DXの画面イメージ', 'AI・DX支援を見る'],
      ['Webの画面イメージ', 'Web制作を見る'],
      ['システムの画面イメージ', 'システム開発を見る'],
    ] as const) {
      await expect(page.getByText(title)).toBeVisible();
      await expect(page.locator('#top').getByRole('link', { name: link })).toBeVisible();
    }
    // 縦に並ぶ（重ならない）
    const boxes = await page.locator('[data-demo-panel]').evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
    );
    expect(boxes[1]!.top).toBeGreaterThanOrEqual(boxes[0]!.bottom);
    expect(boxes[2]!.top).toBeGreaterThanOrEqual(boxes[1]!.bottom);

    for (const heading of ['仕事を整える。価値を伝える。', '自社の仕事に合う仕組みを、形に。', 'まずは、今のことを聞かせてください。']) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    }

    // 下部バー: サービス・相談するは通常のアンカー、メニューはフッターの案内へのリンク
    const bar = page.getByRole('navigation', { name: '下部メニュー' });
    await expect(bar.getByRole('button')).toHaveCount(0);
    await bar.getByRole('link', { name: 'サービス' }).click();
    await expect(page).toHaveURL(/#services$/);
    await bar.getByRole('link', { name: '相談する' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await bar.getByRole('link', { name: /メニュー/ }).click();
    await expect(page).toHaveURL(/#site-navigation$/);
    const siteNav = page.getByRole('navigation', { name: 'サイト案内' });
    await expect(siteNav.locator('details')).toHaveAttribute('open');
    await siteNav.getByRole('link', { name: 'システム開発' }).click();
    await expect(page).toHaveURL(/#service-system$/);
    await expect(page.getByRole('heading', { level: 2, name: '自社の仕事に合う仕組みを、形に。' })).toBeInViewport();
  });

  test('トップの相談フォーム: 入力・Enter・送信ボタンのどれでも送信されない', async ({ page }) => {
    await page.goto('/#contact');
    const sent = trackSends(page);
    const url = page.url();
    await expect(page.locator('#contact form, form:has(#contact-name)')).toHaveCount(0);
    await page.getByLabel('お名前').fill('見本 太郎');
    await page.getByLabel('お名前').press('Enter');
    await page.getByLabel('メールアドレス').fill('name@example.com');
    await page.getByLabel('メールアドレス').press('Enter');
    await page.getByLabel('ご相談の分野').selectOption('web');
    await page.getByLabel('ご相談内容').fill('見本の相談内容です。');
    await expect(page.getByRole('button', { name: '送信する' })).toBeDisabled();
    await page.getByRole('button', { name: '送信する' }).click({ force: true });
    await page.waitForTimeout(300);
    expect(page.url()).toBe(url);
    expect(sent).toEqual([]);
  });

  test('部品の確認画面: FAQ が開閉でき、フォームの見本の送信ボタンを押しても送信されない', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const faq = page.locator('[data-faq-item]').first();
    await faq.locator('summary').click();
    await expect(faq).toHaveAttribute('open');

    const sent = trackSends(page);
    await page.getByLabel('お名前').fill('見本 太郎');
    await page.getByLabel('メールアドレス').fill('name@example.com');
    await page.getByRole('button', { name: '入力内容を確認する（送信しません）' }).click();
    await page.waitForTimeout(300);
    expect(page.url()).toMatch(/\/kitchen-sink\/$/);
    expect(sent).toEqual([]);
  });
});

test.describe('動き低減の設定', () => {
  /** 要素の計算済みスタイルの値 */
  async function styleOf(page: import('@playwright/test').Page, selector: string, property: string): Promise<string> {
    return page.evaluate(
      ([s, p]) => getComputedStyle(document.querySelector(s as string) as Element).getPropertyValue(p as string),
      [selector, property],
    );
  }

  test('通常時は動きがあり、低減設定では動きがなくなる', async ({ page }) => {
    const faqIcon = '[data-faq-item] summary [aria-hidden="true"]';
    const shape = '#demo-panel-ai .assemble';
    const menu = '#site-menu';

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/kitchen-sink/');
    expect(await styleOf(page, faqIcon, 'transition-duration')).toBe('0.18s');
    await page.goto('/');
    expect(await styleOf(page, shape, 'animation-duration')).toBe('0.64s');
    expect(await styleOf(page, menu, 'transition-duration')).toContain('0.2s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/kitchen-sink/');
    expect(await styleOf(page, faqIcon, 'transition-duration')).toBe('0s');
    await page.goto('/');
    // 図形は最初から完成した状態（遅延なし・実質0秒）
    expect(parseFloat(await styleOf(page, shape, 'animation-duration'))).toBeLessThan(0.001);
    expect(await styleOf(page, shape, 'animation-delay')).toBe('0s');
    expect(await styleOf(page, menu, 'transition-duration')).not.toMatch(/[1-9]/);
    // 本文と画面デモは、動きを待たずに完成した形で読める
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await styleOf(page, `${shape}:last-of-type`, 'opacity')).toBe('1');
  });

  test('低減設定でもメニュー・画面デモの切替はすぐに完成した表示になる', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('tab', { name: 'Web' }).click();
    await expect(page.getByRole('tabpanel')).toHaveAttribute('id', 'demo-panel-web');
    expect(await styleOf(page, '#demo-panel-web', 'opacity')).toBe('1');
    await page.getByRole('navigation', { name: '下部メニュー' }).getByRole('button', { name: /メニュー/ }).click();
    const dialog = page.getByRole('dialog', { name: 'サイトメニュー' });
    await expect(dialog).toBeVisible();
    expect(await styleOf(page, '#site-menu', 'opacity')).toBe('1');
  });
});
