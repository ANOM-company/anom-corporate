// JavaScript無効時と、動き低減の設定時の確認。
import type { Page } from '@playwright/test';
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

  test('文字の大きさ 200%（320×568・390×844）: 下部バーが縦に並んでも、ページの最下端でフッターの最後の内容とバーの間が 24px 以上あく', async ({
    page,
  }, testInfo) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await setTextScale(page, '200%');
      const result = await pageEnd(page);
      await testInfo.attach(`nojs-text-200-end-${viewport.width}.json`, { body: JSON.stringify(result), contentType: 'application/json' });
      expect(result.rows, `${viewport.width}px: 下部バーは縦3段`).toBe(3);
      expect(result.atEnd, `${viewport.width}px: ページの最下端まで移動できる`).toBe(true);
      expect(result.gap, `${viewport.width}px: フッターの最後の内容と下部バーの間`).toBeGreaterThanOrEqual(24);
      await page.screenshot({ path: testInfo.outputPath(`nojs-text-200-end-${viewport.width}.png`) });
    }
  });

  test('文字サイズと画面の幅を変えても、下部バーの高さの初期値が実際の高さと合い、フッターの下の余白がスクリプト有効時と同じになる', async ({
    page,
  }, testInfo) => {
    const cases = [
      ...[320, 360, 390, 414, 640, 768].flatMap((width) =>
        ['100%', '110%', '125%', '150%', '175%', '200%'].map((scale) => ({ width, scale })),
      ),
      // 文字 200% で縦3段と横1段が切り替わる境目の前後（境目の画面の幅はスクロールバーの溝の幅で前後する）
      ...Array.from({ length: 41 }, (_, i) => ({ width: 580 + i, scale: '200%' })),
    ];
    await page.goto('/');
    const results = [];
    for (const { width, scale } of cases) {
      await page.setViewportSize({ width, height: 800 });
      await setTextScale(page, scale);
      results.push({ width, scale, ...(await pageEnd(page)) });
    }
    await testInfo.attach('nojs-bar-fallback.json', { body: JSON.stringify(results), contentType: 'application/json' });
    // スクリプト有効時のフッターの下の余白は「実際のバーの高さ＋下端の余白＋1.5rem＋1.5rem」。無効時もこれと 1px 以内で一致する
    const mismatched = results.filter((r) => Math.abs(r.footerPadding - r.expectedPadding) > 1);
    expect(mismatched, '下部バーの高さの初期値が実際の高さと合わない幅・文字サイズ').toEqual([]);
    expect(
      results.filter((r) => r.gap < 24),
      'フッターの最後の内容と下部バーの間が 24px 未満の幅・文字サイズ',
    ).toEqual([]);
    // 境目の前後で、縦3段と横1段の両方を確かめている
    expect(new Set(results.filter((r) => r.scale === '200%' && r.width >= 580).map((r) => r.rows))).toEqual(new Set([1, 3]));
  });
});

/** 文字だけを拡大する（ブラウザーの文字サイズ設定の代わり。page.evaluate はページのスクリプトが無効でも動く） */
async function setTextScale(page: Page, scale: string) {
  await page.evaluate(async (size) => {
    document.documentElement.style.setProperty('font-size', size);
    await document.fonts.ready;
  }, scale);
}

/**
 * ページの最下端まで移動したときの、下部バーとフッターの位置関係。
 * - gap: フッターの最後のリンクの下端から、下部バーの上端までの距離
 * - footerPadding: フッターの最後の内容より下の余白（フッターと中の区画の下の余白の合計）
 * - expectedPadding: スクリプト有効時と同じ計算（実際のバーの高さ＋下端の余白＋1.5rem＋1.5rem）
 */
async function pageEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('[data-bottom-nav]')!;
    const bar = nav.getBoundingClientRect();
    const items = [...nav.querySelectorAll<HTMLElement>('li')];
    const footer = document.querySelector('footer')!;
    const inner = footer.firstElementChild!;
    const last = [...footer.querySelectorAll('a')].at(-1)!.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const offset = innerHeight - bar.bottom;
    return {
      rows: new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
      barHeight: bar.height,
      offset,
      atEnd: Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) <= 1,
      gap: bar.top - last.bottom,
      footerPadding: parseFloat(getComputedStyle(footer).paddingBottom) + parseFloat(getComputedStyle(inner).paddingBottom),
      expectedPadding: bar.height + offset + 3 * rem,
    };
  });
}

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
    expect(await styleOf(page, faqIcon, 'transition-property')).toBe('none');
    expect(await styleOf(page, faqIcon, 'transition-duration')).toBe('0s');
    await page.goto('/');
    // 図形は動きを持たず、最初から完成した状態（時間を極小にするのではなく、動きそのものがない）
    expect(await styleOf(page, shape, 'animation-name')).toBe('none');
    expect(await styleOf(page, menu, 'transition-property')).toBe('none');
    expect(await page.evaluate(() => document.getAnimations().length), 'ページ上で動いているものがない').toBe(0);
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

    // 選んだ直後（クリックの処理と同じ流れの中。次の描画を待たない）でも、パネルは完成した表示で、動きが付かない。
    // 動きの時間を極小にしただけだと、この時点では動きの1コマ目（透明・ずれた位置）が読み取れる
    const rightAfterSelect = await page.evaluate(() => {
      document.querySelector<HTMLElement>('#demo-tab-system')?.click();
      const panel = document.querySelector('#demo-panel-system') as HTMLElement;
      const style = getComputedStyle(panel);
      return { hidden: panel.hidden, opacity: style.opacity, transform: style.transform, animations: panel.getAnimations().length };
    });
    expect(rightAfterSelect).toEqual({ hidden: false, opacity: '1', transform: 'none', animations: 0 });

    await page.getByRole('navigation', { name: '下部メニュー' }).getByRole('button', { name: /メニュー/ }).click();
    const dialog = page.getByRole('dialog', { name: 'サイトメニュー' });
    await expect(dialog).toBeVisible();
    expect(await styleOf(page, '#site-menu', 'opacity')).toBe('1');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // メニューも、開いた直後から最終の位置・不透明度で、閉じた直後には表示が残らない
    const rightAfterOpen = await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-menu-button]')?.click();
      const menu = document.querySelector('#site-menu') as HTMLDialogElement;
      const style = getComputedStyle(menu);
      const opened = { open: menu.open, opacity: style.opacity, translate: style.translate, animations: menu.getAnimations().length };
      menu.close();
      return { opened, displayAfterClose: getComputedStyle(menu).display };
    });
    expect(rightAfterOpen).toEqual({ opened: { open: true, opacity: '1', translate: '0px', animations: 0 }, displayAfterClose: 'none' });
  });
});
