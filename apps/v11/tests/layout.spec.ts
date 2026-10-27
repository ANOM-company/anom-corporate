// 画面幅ごとの崩れの確認。
// - どの幅でも横にはみ出さない（横スクロールが出ない）
// - PC: 悩みチップ同士、チップとカードが重ならない（漂う動きは止めて確かめる）
// - スマホ: チップは3列に並び、どのチップも2行までに収まる
// - 見出しと悩みチップは、区切った文節の途中で改行しない
import type { Page } from '@playwright/test';
import { test, expect, widths } from './fixtures';

type Box = { x: number; y: number; width: number; height: number; label: string };

async function chipBoxes(page: Page): Promise<Box[]> {
  return page.locator('[data-chips] .chip').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, label: el.textContent?.trim() ?? '' };
    }),
  );
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

for (const width of widths) {
  test(`${width}px: 横にはみ出さない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
  });
}

test.describe('PC のチップ配置', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const width of [1200, 1280, 1366, 1440, 1920]) {
    test(`${width}px: チップ同士・チップとカードが重ならない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const boxes = await chipBoxes(page);
      expect(boxes).toHaveLength(9);
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          expect(overlaps(boxes[i]!, boxes[j]!), `${boxes[i]!.label} と ${boxes[j]!.label}`).toBe(false);
        }
      }
      const card = await page.locator('[data-preview]').boundingBox();
      expect(card).not.toBeNull();
      for (const box of boxes) {
        expect(overlaps(box, { ...card!, label: 'カード' }), `${box.label} とカード`).toBe(false);
      }
      // 見出しの列にもはみ出さない
      const copy = await page.locator('.hero__copy').boundingBox();
      for (const box of boxes) expect(box.x, box.label).toBeGreaterThan(copy!.x + copy!.width);
    });
  }
});

test.describe('スマホのチップ配置', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const width of [360, 390, 430]) {
    test(`${width}px: 3列に並び、どのチップも2行までに収まる`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const boxes = await chipBoxes(page);
      const columns = new Set(boxes.map((b) => Math.round(b.x)));
      expect(columns.size).toBe(3);
      const lineHeight = await page
        .locator('[data-chips] .chip')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      for (const box of boxes) {
        const lines = await page
          .locator('[data-chips] .chip__label')
          .nth(boxes.indexOf(box))
          .evaluate((el, lh) => Math.round(el.getBoundingClientRect().height / lh), lineHeight);
        expect(lines, box.label).toBeLessThanOrEqual(2);
      }
    });
  }
});

test.describe('文節の途中で改行しない', () => {
  for (const width of [360, 390, 768, 1440]) {
    test(`${width}px: 見出しとチップの区切り（.nb）は1行に収まる`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const broken = await page.locator('.nb').evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length > 0 && !el.closest('[hidden], .sr-only'))
          .filter((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const tops = [...range.getClientRects()].filter((r) => r.width > 0).map((r) => r.top);
            // 大きさの違う文字（引用符など）の上端のずれは許し、1行分ほど下がっていたら改行とみなす
            const fontSize = parseFloat(getComputedStyle(el).fontSize);
            return Math.max(...tops) - Math.min(...tops) > fontSize * 0.8;
          })
          .map((el) => el.textContent?.trim()),
      );
      expect(broken).toEqual([]);
    });
  }
});
