// 配信と書体の確認。
// - 応答ヘッダー（CSP など）を public/_headers のとおりに返す。外部への接続や送信を許可しない
// - 存在しないURLは 404 ページを 404 で返す
// - 検索エンジンに載せない（確認用）
// - 明朝の見出しは自己配信の書体（ANOM Serif = Noto Serif JP の部分集合）だけで描画され、欠けた文字がない
// - 読み込むファイルはすべて同じ配信元から
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

test('応答ヘッダー', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  const headers = response!.headers();
  const csp = headers['content-security-policy'] ?? '';
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ]) {
    expect(csp, directive).toContain(directive);
  }
  expect(csp).not.toContain('unsafe-inline');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-robots-tag']).toContain('noindex');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('読み込むファイルはすべて同じ配信元から', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const origin = new URL(page.url()).origin;
  expect(urls.filter((url) => !url.startsWith(origin) && !url.startsWith('data:'))).toEqual([]);
});

test('HTML にインラインのスクリプト・スタイル・イベント属性がない（CSP で止まるため）', async ({ request }) => {
  for (const path of ['/', '/no-such-page/']) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html, path).not.toMatch(/<style[\s>]/i);
    expect(html, path).not.toMatch(/\sstyle=/i);
    expect(html, path).not.toMatch(/\son[a-z]+=/i);
  }
});

test.describe('404', () => {
  test.use({ allowNotFoundDocument: true });

  test('存在しないURLは 404 ページを返す', async ({ page }) => {
    const response = await page.goto('/no-such-page/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });
});

type PlatformFont = { familyName: string; postScriptName: string; isCustomFont: boolean; glyphCount: number };

/** 要素の文字を描画するのに実際に使われた書体（CDP の CSS.getPlatformFontsForNode） */
async function renderedFonts(page: Page, selector: string): Promise<PlatformFont[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  expect(nodeId, `${selector} があること`).toBeGreaterThan(0);
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  await cdp.detach();
  return fonts as PlatformFont[];
}

test.describe('明朝の見出し', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const selector of ['.hero__title .nb', '#solution-title', '#services-title', '.philosophy__text .q-ch', '.contact__lead-line']) {
    test(`${selector} は自己配信の明朝だけで描画される`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const fonts = await renderedFonts(page, selector);
      expect(fonts.length).toBeGreaterThan(0);
      for (const font of fonts) {
        // 欧文の引用符などは英字用の Outfit で描くことがあるので、和文の明朝以外は自己配信であることだけ確かめる
        expect(font.isCustomFont, JSON.stringify(fonts)).toBe(true);
      }
      expect(fonts.some((font) => /NotoSerifJP/i.test(font.postScriptName)), JSON.stringify(fonts)).toBe(true);
    });
  }

  test('明朝の部分集合に、明朝で表示する文字がすべて入っている', async ({ page }) => {
    await page.goto('/');
    const css = readFileSync(fileURLToPath(new URL('../src/styles/serif-font.css', import.meta.url)), 'utf8');
    const ranges = [...(css.match(/unicode-range:([^;]+);/)?.[1] ?? '').matchAll(/U\+([0-9A-F]+)(?:-([0-9A-F]+))?/gi)].map(
      (m) => [parseInt(m[1]!, 16), parseInt(m[2] ?? m[1]!, 16)] as const,
    );
    expect(ranges.length).toBeGreaterThan(0);
    const serifText = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((el) => getComputedStyle(el).fontFamily.includes('ANOM Serif'))
        .map((el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(''))
        .join(''),
    );
    const missing = [...new Set([...serifText.replace(/\s/g, '')])].filter((ch) => {
      const code = ch.codePointAt(0)!;
      return !ranges.some(([from, to]) => code >= from && code <= to);
    });
    expect(missing).toEqual([]);
  });
});
