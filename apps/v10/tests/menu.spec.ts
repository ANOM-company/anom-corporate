// 下部バーと展開メニュー（<dialog>）の確認。
// 開閉・フォーカスの戻り先・メニュー内リンクの移動・背面の操作とスクロールの停止・連続操作・短い画面。
import type { Page } from '@playwright/test';
import { test, expect, walkDialog } from './fixtures';

const bar = (page: Page) => page.getByRole('navigation', { name: '下部メニュー' });
const menuButton = (page: Page) => bar(page).getByRole('button', { name: /メニュー/ });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'サイトメニュー' });

/** 開いているダイアログの数・ボタンの状態・背面のスクロール停止が一致しているか */
async function menuState(page: Page) {
  return page.evaluate(() => {
    const button = document.querySelector('[data-menu-button]');
    return {
      open: document.querySelectorAll('dialog[open]').length,
      expanded: button?.getAttribute('aria-expanded'),
      locked: document.documentElement.hasAttribute('data-scroll-locked'),
      scrollY: window.scrollY,
      hash: location.hash,
    };
  });
}

test.describe('下部バー', () => {
  for (const width of [390, 1440]) {
    test(`@ ${width}px: 3項目が画面下中央に常に表示され、メニューはダイアログを開くボタン`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const nav = bar(page);
      await expect(nav.getByRole('link', { name: 'サービス' })).toHaveAttribute('href', '#services');
      await expect(nav.getByRole('link', { name: '相談する' })).toHaveAttribute('href', '#contact');
      await expect(menuButton(page)).toBeVisible();
      await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(menuButton(page)).toHaveAttribute('aria-controls', 'site-menu');
      // JavaScript 有効時は、フッターへのリンク版のメニューは隠れる
      await expect(nav.locator('[data-menu-fallback]')).toBeHidden();

      const box = await nav.boundingBox();
      if (!box) throw new Error('下部バーが見つかりません');
      // 画面下中央。PC は最大 440px、スマホは左右 16px の余白
      // （中央は本文の表示域の中央。scrollbar-gutter: stable でスクロールバーの溝を確保しているため、その分を除いた
      //   body の幅で測る。スクロールバーが幅を取らないスマホ実機では画面の中央と同じ）
      const contentWidth = await page.evaluate(() => document.body.getBoundingClientRect().width);
      expect(Math.abs(box.x + box.width / 2 - contentWidth / 2)).toBeLessThanOrEqual(1);
      if (width >= 768) {
        expect(box.width).toBeLessThanOrEqual(440);
        expect(800 - (box.y + box.height)).toBeCloseTo(24, 0);
      } else {
        expect(box.x).toBeCloseTo(16, 0);
        expect(800 - (box.y + box.height)).toBeCloseTo(12, 0);
      }
      expect(box.height).toBeGreaterThanOrEqual(64);

      // スクロールしても表示されたまま
      await page.mouse.wheel(0, 3000);
      await expect(nav).toBeInViewport({ ratio: 1 });
    });
  }

  test('「相談する」は相談分野と入力済みの内容を変えない', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('お名前').fill('見本 太郎');
    await page.getByLabel('ご相談の分野').selectOption('system');
    await bar(page).getByRole('link', { name: 'サービス' }).click();
    await bar(page).getByRole('link', { name: '相談する' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.getByLabel('ご相談の分野')).toHaveValue('system');
    await expect(page.getByLabel('お名前')).toHaveValue('見本 太郎');
  });
});

test.describe('展開メニュー', () => {
  test('マウス: 開くと見出しへフォーカスし、背面のスクロールを止め、「閉じる」でボタンへ戻る', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.mouse.wheel(0, 1200);
    await page.waitForFunction(() => window.scrollY > 0);
    const before = await menuState(page);

    await menuButton(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'サイトメニュー' })).toBeFocused();
    let state = await menuState(page);
    expect(state).toMatchObject({ open: 1, expanded: 'true', locked: true, hash: before.hash });
    await page.screenshot({ path: testInfo.outputPath('menu-open-390.png') });

    // 背面はスクロールしない
    await page.mouse.move(195, 40);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(200);
    expect((await menuState(page)).scrollY).toBe(before.scrollY);

    // 9項目（提供中3・ANOMを知る3・これから1・共通2）と「閉じる」
    const links = dialog(page).getByRole('link');
    await expect(links).toHaveCount(9);
    await expect(dialog(page).getByRole('link', { name: /学びの計画\s*［構想中］/ })).toBeVisible();
    await expect(dialog(page).locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);

    await dialog(page).getByRole('button', { name: '閉じる' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    state = await menuState(page);
    expect(state).toMatchObject({ open: 0, expanded: 'false', locked: false, scrollY: before.scrollY, hash: before.hash });
  });

  test('キーボード: Enterで開き、Tab・Shift+Tabは背景へ移らず、Escでボタンへ戻る', async ({ page }) => {
    await page.goto('/');
    await menuButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'サイトメニュー' })).toBeFocused();

    // 見出しは通常の Tab 順に入らない。次の Tab で最初のリンクへ
    await page.keyboard.press('Tab');
    await expect(dialog(page).getByRole('link', { name: 'AI・DX支援' })).toBeFocused();
    await walkDialog(page, 'Tab', 12);
    await walkDialog(page, 'Shift+Tab', 12);

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false, hash: '' });
  });

  test('背景（暗幕）で押して離すと閉じ、パネル内から外へのドラッグでは閉じない', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await menuButton(page).click();
    await expect(dialog(page)).toBeVisible();

    // パネル内（見出し）で押して、暗幕の上で離す
    const heading = await page.getByRole('heading', { level: 2, name: 'サイトメニュー' }).boundingBox();
    if (!heading) throw new Error('見出しが見つかりません');
    await page.mouse.move(heading.x + 10, heading.y + 10);
    await page.mouse.down();
    await page.mouse.move(40, 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    await expect(dialog(page)).toBeVisible();
    expect((await menuState(page)).open).toBe(1);

    // 暗幕で押して離す
    await page.mouse.click(40, 40);
    await expect(dialog(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false });
  });

  test('タップ: 開閉でき、閉じるとボタンへ戻る', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');
    await menuButton(page).tap();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole('button', { name: '閉じる' }).tap();
    await expect(dialog(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    await menuButton(page).tap();
    await dialog(page).getByRole('link', { name: 'Web制作・運用保守' }).tap();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/#service-web$/);
    await expect(page.getByRole('heading', { level: 3, name: '伝わるWebをつくり、育てていく。' })).toBeFocused();
    await context.close();
  });

  for (const [label, anchor, heading, level] of [
    ['AI・DX支援', 'service-ai', '仕事の無駄を減らし、人が力を発揮できる現場へ。', 3],
    ['Web制作・運用保守', 'service-web', '伝わるWebをつくり、育てていく。', 3],
    ['システム開発', 'service-system', '自社の仕事に合う仕組みを、形に。', 2],
    ['支援のイメージ', 'examples', 'どんな変化をつくるのか。', 2],
    ['ANOMの考え方', 'about', '無駄を減らし、人の力を活かす。', 2],
    ['相談からの進め方', 'process', '今の状況を聞くところから。', 2],
    ['学びの計画', 'learning', 'AIを、もっと身近な選択肢に。', 2],
    ['トップへ', 'top', '技術を、仕事の力に。', 1],
    ['相談する', 'contact', 'まずは、今のことを聞かせてください。', 2],
  ] as const) {
    test(`メニューの「${label}」: 閉じてから #${anchor} へ移り、見出しへフォーカスする`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      if (anchor === 'top') await page.mouse.wheel(0, 2000);
      await menuButton(page).click();
      await dialog(page).getByRole('link', { name: label }).click();
      await expect(dialog(page)).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
      const target = page.getByRole('heading', { level, name: heading });
      await expect(target).toBeFocused();
      await expect(target).toBeInViewport();
      expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false });
    });
  }

  test('キーボードでメニューの「相談する」を選ぶと、相談の見出しへ移り、分野は変わらない', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('ご相談の分野').selectOption('web');
    await menuButton(page).focus();
    await page.keyboard.press('Enter');
    const link = dialog(page).getByRole('link', { name: '相談する' });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: 'まずは、今のことを聞かせてください。' })).toBeFocused();
    await expect(page.getByLabel('ご相談の分野')).toHaveValue('web');
    // 見出しの次の Tab は、相談欄の中の要素へ進む（背面や先頭に戻らない）
    await page.keyboard.press('Tab');
    const inContact = await page.evaluate(() => document.getElementById('contact')?.contains(document.activeElement));
    expect(inContact).toBe(true);
  });

  test('戻る／進む: メニューのリンクで移動した後に戻っても、メニューは再び開かない', async ({ page }) => {
    await page.goto('/');
    await menuButton(page).click();
    await dialog(page).getByRole('link', { name: 'ANOMの考え方' }).click();
    await expect(page).toHaveURL(/#about$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(dialog(page)).toBeHidden();
    await page.goForward();
    await expect(page).toHaveURL(/#about$/);
    await expect(dialog(page)).toBeHidden();
    expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false });
  });

  test('連続操作: 開閉を素早く繰り返しても、パネル・背面の停止・ボタンの状態が一致する', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 6; i += 1) {
      await menuButton(page).click({ noWaitAfter: true });
      await page.keyboard.press('Escape');
    }
    expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false });
    await expect(menuButton(page)).toBeFocused();

    // ボタンの二度押し: 2回目が開いたパネルに当たる場合もあるが、どちらの結果でも状態は一致し、パネルは1つまで
    await menuButton(page).dblclick();
    await page.waitForTimeout(400);
    const afterDouble = await menuState(page);
    expect(afterDouble.open).toBeLessThanOrEqual(1);
    expect(afterDouble.expanded).toBe(afterDouble.open === 1 ? 'true' : 'false');
    expect(afterDouble.locked).toBe(afterDouble.open === 1);

    // 開いた状態から、閉じる操作の連打
    if (afterDouble.open === 0) await menuButton(page).click();
    await expect(dialog(page)).toBeVisible();
    const close = dialog(page).getByRole('button', { name: '閉じる' });
    await close.click();
    await page.evaluate(() => (document.querySelector('[data-modal-close]') as HTMLElement | null)?.click());
    await expect(dialog(page)).toBeHidden();
    expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false });
    await expect(menuButton(page)).toBeFocused();
  });

  for (const viewport of [
    { width: 390, height: 500, name: 'スマホの短い画面' },
    { width: 640, height: 360, name: '短い横向き相当' },
    { width: 320, height: 568, name: '320px 幅' },
  ]) {
    test(`${viewport.name}（${viewport.width}×${viewport.height}）: 全項目と「閉じる」に届き、パネルが画面内に収まる`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await menuButton(page).click();
      await expect(dialog(page)).toBeVisible();
      await page.waitForTimeout(400); // 開く動き（320ms）の完了を待つ
      const panel = await dialog(page).boundingBox();
      if (!panel) throw new Error('メニューが見つかりません');
      expect(panel.y, '上端に 16px 以上の余白').toBeGreaterThanOrEqual(16);
      expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
      // 左右 12px の余白（右端は本文の表示域 = スクロールバーの溝を除いた body の端から測る）
      const contentWidth = await page.evaluate(() => document.body.getBoundingClientRect().width);
      expect(panel.x).toBeGreaterThanOrEqual(12 - 0.5);
      expect(panel.x + panel.width).toBeLessThanOrEqual(contentWidth - 12 + 0.5);
      expect(Math.abs(panel.x + panel.width / 2 - contentWidth / 2), '左右の中央').toBeLessThanOrEqual(1);
      await expect(page.getByRole('heading', { level: 2, name: 'サイトメニュー' })).toBeInViewport({ ratio: 1 });
      await expect(dialog(page).getByRole('button', { name: '閉じる' })).toBeInViewport({ ratio: 1 });

      // Tab で順に移動すると、各リンクが項目の欄の中に見える位置までスクロールされる
      for (let i = 0; i < 10; i += 1) {
        await page.keyboard.press('Tab');
        const box = await page.evaluate(() => {
          const rect = document.activeElement?.getBoundingClientRect();
          return rect ? { top: rect.top, bottom: rect.bottom, text: document.activeElement?.textContent?.trim() } : null;
        });
        if (!box) throw new Error('フォーカスがありません');
        expect(box.top, `${box.text} が見える`).toBeGreaterThanOrEqual(panel.y - 0.5);
        expect(box.bottom, `${box.text} が見える`).toBeLessThanOrEqual(panel.y + panel.height + 0.5);
      }
      // 文字は小さくしない（項目のリンクは 18px のまま）
      const fontSize = await dialog(page).getByRole('link').first().evaluate((el) => getComputedStyle(el).fontSize);
      expect(fontSize).toBe('18px');
      await page.screenshot({ path: testInfo.outputPath(`menu-${viewport.width}x${viewport.height}.png`) });
    });
  }

  test('開いたまま画面幅を変えても、パネルが画面内に収まる', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await menuButton(page).click();
    await expect(dialog(page)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 600 });
    await page.waitForTimeout(400);
    const panel = await dialog(page).boundingBox();
    if (!panel) throw new Error('メニューが見つかりません');
    const contentWidth = await page.evaluate(() => document.body.getBoundingClientRect().width);
    expect(panel.x).toBeGreaterThanOrEqual(11.5);
    expect(panel.x + panel.width).toBeLessThanOrEqual(contentWidth - 11.5);
    expect(panel.y).toBeGreaterThanOrEqual(16);
    expect(panel.y + panel.height).toBeLessThanOrEqual(600);
    await expect(dialog(page).getByRole('button', { name: '閉じる' })).toBeInViewport({ ratio: 1 });
  });

  test('トップ以外のページ: メニューのリンクでトップの該当位置へ移る', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    await menuButton(page).click();
    await dialog(page).getByRole('link', { name: 'システム開発' }).click();
    await expect(page).toHaveURL(/\/#service-system$/);
    await expect(page.getByRole('heading', { level: 2, name: '自社の仕事に合う仕組みを、形に。' })).toBeInViewport();
    expect(await menuState(page)).toMatchObject({ open: 0, expanded: 'false', locked: false });
  });
});
