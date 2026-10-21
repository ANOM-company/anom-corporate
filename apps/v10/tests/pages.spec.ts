// ページ単位の確認: HTTPステータス・セキュリティヘッダー・表示幅・リンクとアセット・生成物のインライン有無。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { test, expect, pages, widths } from './fixtures';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

const expectedHeaders: Record<string, RegExp> = {
  'content-security-policy': /default-src 'self'; script-src 'self'; style-src 'self'.*form-action 'none'; frame-ancestors 'none'/,
  'x-content-type-options': /^nosniff$/,
  'referrer-policy': /^strict-origin-when-cross-origin$/,
  'x-robots-tag': /noindex/,
};

test.describe('HTTPステータスとヘッダー', () => {
  for (const { name, path } of pages) {
    test(`${name}: 200 とセキュリティヘッダー`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      for (const [key, pattern] of Object.entries(expectedHeaders)) {
        expect(headers[key], key).toMatch(pattern);
      }
      // CSPでインライン実行・外部オリジンを許可していないこと
      expect(headers['content-security-policy']).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
    });
  }

  test('存在しないURLは 404 ステータスと404ページ・同じヘッダー', async ({ request }) => {
    const response = await request.get('/this-page-does-not-exist/');
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('ページが見つかりません');
    const headers = response.headers();
    for (const [key, pattern] of Object.entries(expectedHeaders)) {
      expect(headers[key], key).toMatch(pattern);
    }
  });

  test('_headers ファイル自体は配信されない', async ({ request }) => {
    const response = await request.get('/_headers');
    expect(response.status()).toBe(404);
  });
});

test.describe('404ページの表示', () => {
  test.use({ allowNotFoundDocument: true });
  test('404ページから主要ページへ戻れる', async ({ page }) => {
    const response = await page.goto('/missing/page/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'トップへ戻る' }).click();
    await expect(page).toHaveURL('/');
  });
});

async function checkOverflow(page: Page, width: number, path: string, shot: string): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        // 装飾（aria-hidden）は親の overflow-hidden で切り取られるため対象外
        const decorative = el.closest('[aria-hidden="true"]');
        return !decorative && rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
      })
      .slice(0, 5)
      .map((el) => el.outerHTML.slice(0, 120)),
  }));
  expect(overflow.scrollWidth, '横スクロールが発生しないこと').toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.offenders, '画面外へはみ出す要素がないこと').toEqual([]);
  await page.screenshot({ path: shot, fullPage: true });
}

test.describe('表示幅ごとの横はみ出し', () => {
  for (const width of widths) {
    for (const { name, path } of pages) {
      test(`${name} @ ${width}px`, async ({ page }, testInfo) => {
        await checkOverflow(page, width, path, testInfo.outputPath(`${name}-${width}.png`));
      });
    }
  }

  test.describe('404ページ', () => {
    test.use({ allowNotFoundDocument: true });
    for (const width of widths) {
      test(`404 @ ${width}px`, async ({ page }, testInfo) => {
        await checkOverflow(page, width, '/missing/', testInfo.outputPath(`404-${width}.png`));
      });
    }
  });
});

test.describe('リンクとアセット', () => {
  for (const { name, path } of pages) {
    test(`${name}: 同一オリジンのリンク・CSS・JS・画像がすべて読み込める`, async ({ page, request, baseURL }) => {
      await page.goto(path);
      const urls = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => out.push(a.href));
        document.querySelectorAll<HTMLLinkElement>('link[href]').forEach((l) => out.push(l.href));
        document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => out.push(s.src));
        document.querySelectorAll<HTMLImageElement>('img[src]').forEach((i) => out.push(i.src));
        return out;
      });
      expect(urls.length).toBeGreaterThan(0);
      const origin = new URL(baseURL ?? '').origin;
      const external = urls.filter((url) => new URL(url).origin !== origin);
      expect(external, '外部オリジンへのリンク・読み込みがないこと').toEqual([]);

      for (const url of new Set(urls)) {
        const target = new URL(url);
        if (target.hash && target.pathname === new URL(page.url()).pathname) {
          // 同じページ内のアンカーは、飛び先の要素があること
          await expect(page.locator(`[id="${decodeURIComponent(target.hash.slice(1))}"]`), url).toHaveCount(1);
          continue;
        }
        const response = await request.get(target.pathname);
        expect(response.status(), url).toBe(200);
      }
    });
  }
});

test.describe('通信先', () => {
  for (const { name, path } of pages) {
    for (const width of [390, 1440]) {
      test(`${name} @ ${width}px: 表示中のすべての通信が同一オリジン（フォントを含む）`, async ({ page, baseURL }) => {
        const requests: string[] = [];
        page.on('request', (request) => requests.push(request.url()));
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        // ページ全体を表示させ、遅れて読み込まれるものも含める
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForLoadState('networkidle');
        const origin = new URL(baseURL ?? '').origin;
        expect(requests.length).toBeGreaterThan(0);
        expect(
          requests.filter((url) => new URL(url).origin !== origin),
          '外部への通信がないこと',
        ).toEqual([]);
      });
    }
  }
});

test.describe('生成物の確認', () => {
  function htmlFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return htmlFiles(full);
      return full.endsWith('.html') ? [full] : [];
    });
  }

  test('HTMLにインラインのスクリプト・スタイル・イベント属性がない（CSPに合う）', () => {
    const files = htmlFiles(distDir);
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const html = readFileSync(file, 'utf8');
      expect(html, file).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
      expect(html, file).not.toMatch(/<style[\s>]/);
      expect(html, file).not.toMatch(/\sstyle="/);
      expect(html, file).not.toMatch(/\son[a-z]+="/);
      expect(html, file).toContain('<meta name="robots" content="noindex, nofollow">');
    }
  });
});
