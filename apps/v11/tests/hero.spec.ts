// ファーストビューの悩みチップ。
// - JavaScript が動くとトグルボタン（aria-pressed）になり、最初は見本の悩みが選ばれている
// - 選ぶと「この悩みに対応するサービス」が原稿どおりのサービスに切り替わり、読み上げ用の案内が出る
// - カードのリンクでサービス欄へ移動し、そのサービスの詳細が開き、同じ悩みのタグが強調される
// - PC ではチップからカードへ線が伸びる（スマホでは線を出さない）
// - スマホでは、選んだあとにカードが画面内に来る
// チップは漂い続けていて Playwright の通常のクリックが待ち続けるため、多くのテストは動きを減らす設定で行い、
// 動いている状態の操作は clickMoving（その瞬間の位置を押す）で別に確かめる
import { test, expect, worryMap, initial, chip, visiblePreview, waitForMotionEnd, nameOf, clickMoving } from './fixtures';

test.describe('悩みチップ', () => {
  test.use({ reducedMotion: 'reduce' });

  test('9個のチップがトグルボタンになり、最初は見本の悩みが選ばれている', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('[data-chips] .chip');
    await expect(chips).toHaveCount(worryMap.length);
    for (const worry of worryMap) {
      const button = chip(page, worry.id);
      await expect(button).toHaveJSProperty('tagName', 'BUTTON');
      await expect(button).toHaveAttribute('type', 'button');
      await expect(button).not.toHaveAttribute('href');
      await expect(button).toHaveAttribute('aria-pressed', String(worry.id === initial.id));
      await expect(button).toHaveAccessibleName(nameOf(worry.label));
    }
    await expect(visiblePreview(page)).toHaveCount(1);
    await expect(visiblePreview(page).locator('.preview__name')).toHaveText(initial.name);
    // 見本の選択は読み上げない（利用者が選んだときだけ案内する）
    await expect(page.locator('[data-preview-status]')).toHaveText('');
  });

  for (const worry of worryMap) {
    test(`「${worry.label}」を選ぶと「${worry.name}」が表示される`, async ({ page }) => {
      await page.goto('/');
      await chip(page, worry.id).click();
      for (const other of worryMap) {
        await expect(chip(page, other.id)).toHaveAttribute('aria-pressed', String(other.id === worry.id));
      }
      await expect(visiblePreview(page)).toHaveCount(1);
      await expect(visiblePreview(page).locator('.preview__name')).toHaveText(worry.name);
      await expect(visiblePreview(page)).toHaveAttribute('href', `#${worry.anchor}`);
      await expect(page.locator('[data-preview-status]')).toHaveText(
        `「${worry.label}」に対応するサービスは「${worry.name}」です。`,
      );
      // サービス欄では、同じ悩みのタグだけが強調される
      const matched = page.locator('[data-tag].is-match');
      await expect(matched).toHaveCount(1);
      await expect(matched).toHaveText(worry.label);
      await expect(matched).toHaveAttribute('data-tag', worry.label);
      await expect(page.locator(`#${worry.anchor} [data-tag="${worry.label}"]`)).toHaveClass(/is-match/);
    });
  }

  test('キーボード（Enter・Space）でも選べる', async ({ page }) => {
    await page.goto('/');
    const target = worryMap.find((w) => w.service !== initial.service)!;
    await chip(page, target.id).focus();
    await page.keyboard.press('Enter');
    await expect(chip(page, target.id)).toHaveAttribute('aria-pressed', 'true');
    const next = worryMap.find((w) => w.service !== target.service)!;
    await chip(page, next.id).focus();
    await page.keyboard.press('Space');
    await expect(chip(page, next.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(visiblePreview(page).locator('.preview__name')).toHaveText(next.name);
  });

  test('カードのリンクでサービスへ移動し、そのサービスの詳細が開く', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const worry = worryMap.find((w) => w.service === 'inquiry')!;
    await chip(page, worry.id).click();
    await visiblePreview(page).click();
    await expect(page).toHaveURL(new RegExp(`#${worry.anchor}$`));
    const card = page.locator(`#${worry.anchor}`);
    await expect(card).toBeInViewport();
    await expect(card.locator('[data-svc-toggle]')).toHaveAttribute('aria-expanded', 'true');
    await expect(card.locator('[data-svc-detail]')).toBeVisible();
  });
});

test.describe('チップとカードをつなぐ線', () => {
  test.use({ reducedMotion: 'reduce' });

  test('PC: 選んだチップの右端からカードの左端へ線が伸びる', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const worry = worryMap.find((w) => w.id === 'inquiry-time')!;
    await chip(page, worry.id).click();
    await waitForMotionEnd(page);
    const path = page.locator('[data-link-path]');
    await expect(path).toHaveAttribute('d', /^M[\d.]+ [\d.]+ C/);
    const geometry = await page.evaluate((id) => {
      const stage = document.querySelector('#worries')!.getBoundingClientRect();
      const from = document.querySelector(`[data-chips] [data-worry="${id}"]`)!.getBoundingClientRect();
      const card = document.querySelector('[data-preview]')!.getBoundingClientRect();
      const d = document.querySelector('[data-link-path]')!.getAttribute('d') ?? '';
      const nums = d.match(/-?[\d.]+/g)!.map(Number);
      return {
        start: { x: nums[0]! + stage.left, y: nums[1]! + stage.top },
        end: { x: nums[nums.length - 2]! + stage.left, y: nums[nums.length - 1]! + stage.top },
        chipRight: from.right,
        chipMiddle: from.top + from.height / 2,
        cardLeft: card.left,
        cardTop: card.top,
        cardBottom: card.bottom,
      };
    }, worry.id);
    // 押したチップはカーソルが乗って少し拡大する（scale 1.04）ので、その分の差は許す
    expect(Math.abs(geometry.start.x - geometry.chipRight)).toBeLessThan(6);
    expect(Math.abs(geometry.start.y - geometry.chipMiddle)).toBeLessThan(3);
    expect(geometry.end.x).toBeLessThan(geometry.cardLeft);
    expect(geometry.cardLeft - geometry.end.x).toBeLessThan(10);
    expect(geometry.end.y).toBeGreaterThan(geometry.cardTop);
    expect(geometry.end.y).toBeLessThan(geometry.cardBottom);
  });

  test('スマホ: 線は出さない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await chip(page, 'documents').click();
    await expect(page.locator('[data-link-path]')).toHaveAttribute('d', '');
    await expect(page.locator('[data-hero-link]')).toBeHidden();
  });
});

test.describe('動いている状態での操作', () => {
  for (const width of [390, 1440]) {
    test(`${width}px: 漂っているチップを押しても選べて、線とカードが動きながら切り替わる`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const worry = worryMap.find((w) => w.service === 'inquiry')!;
      await clickMoving(page, worry.id);
      await expect(chip(page, worry.id)).toHaveAttribute('aria-pressed', 'true');
      await expect(visiblePreview(page).locator('.preview__name')).toHaveText(worry.name);
      await expect(page.locator('[data-preview]')).toHaveClass(/is-scanning/);
      if (width >= 1200) await expect(page.locator('[data-link-path]')).toHaveAttribute('d', /^M/);
    });
  }
});

test.describe('スマホでの選択', () => {
  test.use({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });

  test('タップすると、対応するサービスのカードが画面内に来る', async ({ page }) => {
    await page.goto('/');
    const worry = worryMap.find((w) => w.service === 'web-dx')!;
    await chip(page, worry.id).tap();
    await expect(visiblePreview(page).locator('.preview__name')).toHaveText(worry.name);
    await expect(page.locator('[data-preview]')).toBeInViewport({ ratio: 0.9 });
  });
});
