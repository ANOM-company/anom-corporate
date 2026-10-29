// フォーカス表示のコントラスト確認（WCAG 2.2 の非テキストのコントラスト 3:1 を目安）。
// - 計算値: Tab で移動できる全要素について、輪郭色・縁取り色・実際の背後の地の色を取り出して比を計算する
// - 描画値: 明るい地と暗い地の代表的なボタンを撮影し、輪郭の周囲の実際のピクセル色で比を計算する
// どちらも基準を下げず、輪郭の太さ（2px以上）も確認する。
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

type Rgb = [number, number, number];

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function parseRgb(value: string): Rgb {
  const m = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!m) throw new Error(`色を読み取れません: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const MIN = 3;

type Indicator = { key: number; label: string; ring: string; ringWidth: number; ringStyle: string; halo: string; behind: string };

async function readIndicator(page: Page): Promise<Indicator | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    // 色の切り替え（transition）の途中ではなく、落ち着いた後の値を読む
    for (const animation of el.getAnimations()) animation.finish();
    const style = getComputedStyle(el);
    // 要素の背後の地: 祖先をたどり、最初に不透明な背景色を持つ要素の色
    let behind = getComputedStyle(document.documentElement).backgroundColor;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      const alpha = bg.startsWith('rgba') ? Number(bg.split(',')[3]?.replace(')', '')) : 1;
      if (bg !== 'transparent' && alpha > 0) {
        behind = bg;
        break;
      }
    }
    return {
      key: [...document.querySelectorAll('*')].indexOf(el),
      label: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 20)}"`,
      ring: style.outlineColor,
      ringWidth: parseFloat(style.outlineWidth),
      ringStyle: style.outlineStyle,
      halo: style.boxShadow,
      behind,
    };
  });
}

function expectIndicator(info: Indicator): void {
  const ring = parseRgb(info.ring);
  const halo = parseRgb(info.halo);
  const behind = parseRgb(info.behind);
  const where = `${info.label}（輪郭 ${info.ring} / 縁取り ${info.halo} / 地 ${info.behind}）`;
  expect(info.ringStyle, where).not.toBe('none');
  expect(info.ringWidth, where).toBeGreaterThanOrEqual(2);
  // 輪郭は内外を縁取りに挟まれるため、縁取りとの比が 3:1 以上
  expect(contrast(ring, halo), `輪郭と縁取り: ${where}`).toBeGreaterThanOrEqual(MIN);
  // 一番外側（縁取り）か輪郭のどちらかが、背後の地と 3:1 以上
  expect(Math.max(contrast(halo, behind), contrast(ring, behind)), `地との比: ${where}`).toBeGreaterThanOrEqual(MIN);
}

for (const { name, path, allow404 } of [
  { name: 'top', path: '/', allow404: false },
  { name: 'kitchen-sink', path: '/kitchen-sink/', allow404: false },
  { name: '404', path: '/missing/', allow404: true },
]) {
  test.describe(`フォーカス表示の計算値: ${name}`, () => {
    test.use({ allowNotFoundDocument: allow404, viewport: { width: 1440, height: 900 } });

    test('Tabで移動できる全要素で、輪郭が隣り合う色と 3:1 以上', async ({ page }) => {
      await page.goto(path);
      const seen = new Set<number>();
      let darkChecked = false;
      // 一巡して最初の要素へ戻るまで（上限120回）すべて検査する
      for (let i = 0; i < 120; i += 1) {
        await page.keyboard.press('Tab');
        const info = await readIndicator(page);
        if (!info) continue;
        if (seen.has(info.key)) break;
        seen.add(info.key);
        expectIndicator(info);
        if (luminance(parseRgb(info.behind)) < 0.05) darkChecked = true;
      }
      expect(seen.size).toBeGreaterThan(3);
      // 暗い地（CTA・画面デモ・下部バー）の上の要素も検査していること（下部バーは全ページにある）
      expect(darkChecked, '暗い地の上の要素も検査していること').toBe(true);
    });
  });
}

test.describe('フォーカス表示の計算値: 展開メニュー（深い青の地）', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('メニュー内のTabで移動できる全要素で、輪郭が隣り合う色と 3:1 以上', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: '下部メニュー' }).getByRole('button', { name: /メニュー/ }).click();
    await expect(page.getByRole('dialog', { name: 'サイトメニュー' })).toBeVisible();
    const seen = new Set<number>();
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const info = await readIndicator(page);
      if (!info) continue;
      if (seen.has(info.key)) break;
      seen.add(info.key);
      expectIndicator(info);
      expect(luminance(parseRgb(info.behind)), `深い青の地: ${info.label}`).toBeLessThan(0.05);
    }
    // 9つのリンクと「閉じる」
    expect(seen.size).toBe(10);
  });
});

test.describe('フォーカス表示の描画値', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /** 要素の左側を撮影し、左端から外側へ水平に並ぶピクセル色を返す（[0] が要素の左端のすぐ外） */
  async function sampleLeftOf(page: Page, selector: string): Promise<Rgb[]> {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error(`要素が見つかりません: ${selector}`);
    const x = Math.round(box.x);
    const y = Math.round(box.y + box.height / 2);
    const png = await page.screenshot({ clip: { x: x - 16, y, width: 16, height: 1 } });
    // CSP のかからない空のページで画像を読み、ピクセルを取り出す
    const blank = await page.context().newPage();
    const pixels = await blank.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, 1).data;
      const out: [number, number, number][] = [];
      for (let i = img.width - 1; i >= 0; i -= 1) out.push([data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!]);
      return out;
    }, png.toString('base64'));
    await blank.close();
    return pixels;
  }

  for (const target of [
    { name: '明るい地の主要ボタン', text: '主要ボタン', selector: '#ks-button ~ div button:first-child', dark: false },
    { name: '暗い地（CTA）のボタン', text: 'トップへ戻る', selector: '[aria-labelledby="cta-title"] a', dark: true },
  ]) {
    test(`${target.name}: 撮影した輪郭と隣り合う色が 3:1 以上`, async ({ page }, testInfo) => {
      await page.goto('/kitchen-sink/');
      const element = page.locator(target.selector);
      await expect(element).toHaveText(target.text);
      await element.scrollIntoViewIfNeeded();
      const before = await sampleLeftOf(page, target.selector);

      // キーボード操作でフォーカスを当てる（直前の要素から Tab）
      await element.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(element).toBeFocused();
      await page.waitForTimeout(400); // 色の切り替え（transition）が落ち着くのを待つ
      const after = await sampleLeftOf(page, target.selector);
      // 目視確認用にフォーカス中の見た目を保存する
      const box = await element.boundingBox();
      if (box) {
        await page.screenshot({
          path: testInfo.outputPath(`focus-${target.dark ? 'dark' : 'light'}.png`),
          clip: { x: box.x - 24, y: box.y - 24, width: box.width + 48, height: box.height + 48 },
        });
      }

      // 要素 | 白 2px | 輪郭 3px | 白 2px | 地。サブピクセルの境目を避けて中央付近を読む
      const inner = after[0]!;
      const ring = after[3]!;
      const outer = after[5]!;
      const ground = after[12]!;
      const report = JSON.stringify({ inner, ring, outer, ground, before: before.slice(0, 13) });
      expect(contrast(ring, inner), `輪郭と内側 ${report}`).toBeGreaterThanOrEqual(MIN);
      expect(contrast(ring, outer), `輪郭と外側 ${report}`).toBeGreaterThanOrEqual(MIN);
      expect(Math.max(contrast(outer, ground), contrast(ring, ground)), `地との比 ${report}`).toBeGreaterThanOrEqual(MIN);
      // フォーカス前とは見た目が変わっていること（輪郭の範囲のどこかが、フォーカス前の色から 3:1 以上変化）
      const change = Math.max(...[0, 3, 5].map((i) => contrast(before[i]!, after[i]!)));
      expect(change, `フォーカス前後の変化 ${report}`).toBeGreaterThanOrEqual(MIN);
      if (target.dark) expect(luminance(ground), `暗い地であること ${report}`).toBeLessThan(0.05);
    });
  }
});
