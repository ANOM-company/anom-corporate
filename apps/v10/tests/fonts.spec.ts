// 書体の確認。
// - 和文の見出しは LINE Seed JP Bold、本文・入力値は LINE Seed JP Regular、英字の補助ラベルは Outfit で
//   実際に描画される（Chromium の開発者ツールの仕組み CDP で、描画に使われた書体を確かめる）
// - 書体はすべて同じ配信元から読み込み、外部へ接続しない。先読みはせず、必要な分割ファイルだけを読み込む
// - 書体を読み込めないときも、端末の標準書体で本文と入力欄が使える
// - ライセンス全文と取得元の記録を配信している
// - 各 WOFF2 の収録文字と CSS の unicode-range が一致し、分割で欠けた文字がない
// - 見出しが文節の途中で改行しない
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const fontsDir = fileURLToPath(new URL('../public/fonts/', import.meta.url));
const fontsCss = fileURLToPath(new URL('../src/styles/fonts.css', import.meta.url));

type PlatformFont = { familyName: string; postScriptName: string; isCustomFont: boolean; glyphCount: number };

/** 要素の文字を描画するのに実際に使われた書体（CDP の CSS.getPlatformFontsForNode） */
async function renderedFonts(page: Page, selector: string): Promise<PlatformFont[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  expect(nodeId, `${selector} があること`).toBeGreaterThan(0);
  let { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  if (fonts.length === 0) {
    // textarea などは、入力値がブラウザー内部の領域（shadow root）にあるため、その中の要素で確かめる
    const { node } = await cdp.send('DOM.describeNode', { nodeId, depth: -1, pierce: true });
    const inner = node.shadowRoots?.[0]?.children?.find((child) => child.nodeType === 1);
    if (inner) {
      const { nodeIds } = await cdp.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [inner.backendNodeId] });
      ({ fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: nodeIds[0]! }));
    }
  }
  await cdp.detach();
  return fonts as PlatformFont[];
}

/** 指定した書体だけで描画されていること（端末の書体への置き換わりがない） */
function expectOnly(fonts: PlatformFont[], postScript: RegExp, what: string): void {
  expect(fonts.length, `${what}: 描画された書体があること`).toBeGreaterThan(0);
  for (const font of fonts) {
    expect(font.postScriptName, `${what}: ${JSON.stringify(fonts)}`).toMatch(postScript);
    expect(font.isCustomFont, `${what}: 自己配信の書体であること`).toBe(true);
  }
}

test.describe('書体の描画', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`@ ${viewport.width}px: 和文の見出しは Bold、本文・入力値・ボタンは指定どおり、英字ラベルは Outfit`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.locator('#contact-name').fill('髙橋 Émilie ①');
      await page.locator('#contact-message').fill('「業務の見直し」〜ご相談（全角・半角 ABC 123）');
      await page.evaluate(() => document.fonts.ready);

      expectOnly(await renderedFonts(page, '#hero-title'), /^LINESeedJP-Bold$/, 'H1');
      expectOnly(await renderedFonts(page, '#services-title'), /^LINESeedJP-Bold$/, 'H2');
      expectOnly(await renderedFonts(page, '#service-ai h3'), /^LINESeedJP-Bold$/, 'H3');
      expectOnly(await renderedFonts(page, '#top p'), /^LINESeedJP-Regular$/, '本文');
      expectOnly(await renderedFonts(page, '#contact-name'), /^LINESeedJP-Regular$/, '入力値（異体字・欧文アクセント・丸数字）');
      expectOnly(await renderedFonts(page, '#contact-message'), /^LINESeedJP-Regular$/, '入力値（約物・全角半角）');
      expectOnly(await renderedFonts(page, '[data-bottom-nav] a'), /^LINESeedJP-Bold$/, '下部バーの文字');
      // 英字の補助ラベル（例: Services）は Outfit の可変フォント（既定の名前は Thin だが、太さの軸で描画する）
      expectOnly(await renderedFonts(page, '#services p'), /^Outfit/, '英字ラベル');
      expect(
        await page.locator('#services p').first().evaluate((el) => getComputedStyle(el).fontWeight),
        '英字ラベルの太さ',
      ).toBe('600');
    });
  }

  test('外部へ接続せず、先読みせず、使う分割ファイルだけを読み込む。読み込み量を記録する', async ({ page }, testInfo) => {
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fontRequests.push(request.url());
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    expect(fontRequests.length).toBeGreaterThan(0);
    for (const url of fontRequests) {
      expect(new URL(url).origin, '同じ配信元').toBe(new URL(page.url()).origin);
      expect(new URL(url).pathname).toMatch(/^\/fonts\/(outfit-variable|line-seed-jp-(400|700)-[1-8])\.woff2$/);
    }
    await expect(page.locator('link[rel="preload"][as="font"], link[href*="fonts.googleapis"]')).toHaveCount(0);
    const lineSeed = fontRequests.filter((url) => url.includes('line-seed-jp-'));
    expect(lineSeed.length, '16ファイルすべては読み込まない').toBeLessThan(16);

    const faces = await page.evaluate(() => [...document.fonts].map((face) => ({ family: face.family, display: face.display })));
    expect(faces.length).toBe(17);
    for (const face of faces) expect(face.display, `${face.family} は読み込み前も文字を表示する`).toBe('swap');

    const sizes = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/fonts/'))
        .map((entry) => {
          const resource = entry as PerformanceResourceTiming;
          return { file: resource.name.split('/').pop() ?? '', bytes: resource.encodedBodySize };
        }),
    );
    const total = sizes.reduce((sum, item) => sum + item.bytes, 0);
    await testInfo.attach('font-transfer.json', {
      body: JSON.stringify({ viewport: '1440x900', page: '/', files: sizes, totalBytes: total }, null, 2),
      contentType: 'application/json',
    });
    expect(sizes.length).toBe(fontRequests.length);
  });

  test('部品の確認画面でも、外部の書体を読み込まない', async ({ page }) => {
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fontRequests.push(request.url());
    });
    await page.goto('/kitchen-sink/');
    await page.evaluate(() => document.fonts.ready);
    expect(fontRequests.length).toBeGreaterThan(0);
    for (const url of fontRequests) expect(new URL(url).origin).toBe(new URL(page.url()).origin);
  });
});

test.describe('書体を読み込めないとき', () => {
  test.use({ allowFailedRequests: /\/fonts\/[^/]+\.woff2$/, viewport: { width: 390, height: 844 } });

  test('端末の標準書体で本文が表示され、入力欄が使え、横にはみ出さない', async ({ page }, testInfo) => {
    await page.route('**/fonts/*.woff2', (route) => route.abort());
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('技術を、仕事の力に。');
    const h1Fonts = await renderedFonts(page, '#hero-title');
    expect(h1Fonts.length).toBeGreaterThan(0);
    for (const font of h1Fonts) expect(font.isCustomFont, '端末の書体で描画される').toBe(false);
    expect(await page.evaluate(() => [...document.fonts].some((face) => face.status === 'loaded'))).toBe(false);

    // 下部バーの操作も使える（スマホ幅では入力欄にフォーカスしている間だけ隠れるため、入力の前に確かめる）
    await expect(page.getByRole('navigation', { name: '下部メニュー' }).getByRole('link', { name: '相談する' })).toBeVisible();
    await page.locator('#contact-name').fill('髙橋 Émilie ①');
    await expect(page.locator('#contact-name')).toHaveValue('髙橋 Émilie ①');
    await expect(page.getByRole('button', { name: '送信する' })).toBeDisabled();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, '横スクロールが発生しない').toBeLessThanOrEqual(0);
    await page.screenshot({ path: testInfo.outputPath('fonts-blocked-390.png'), fullPage: true });
  });
});

test.describe('ライセンスと取得元の記録', () => {
  for (const [file, text] of [
    ['/fonts/OFL-Outfit.txt', /Copyright 2021 The Outfit Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/],
    ['/fonts/OFL-LINESeedJP.txt', /LY Corporation[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/],
    ['/fonts/README.txt', /Outfit[\s\S]*Version 1\.100[\s\S]*LINE Seed JP[\s\S]*SHA-256/],
  ] as const) {
    test(`${file} を配信している`, async ({ request }) => {
      const response = await request.get(file);
      expect(response.status()).toBe(200);
      expect(await response.text()).toMatch(text);
    });
  }
});

// ---- WOFF2 の収録文字（cmap）を読む（Node だけで実行。ブラウザーは使わない） ----

/** WOFF2 の表の名前（表の番号 0〜62 の既定の並び） */
const knownTags = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca',
  'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
];

/** WOFF2 のファイルから、収録文字の一覧（cmap の Unicode 部分）を取り出す */
function woff2Codepoints(buffer: Buffer): Set<number> {
  expect(buffer.toString('latin1', 0, 4)).toBe('wOF2');
  const numTables = buffer.readUInt16BE(12);
  const compressedSize = buffer.readUInt32BE(20);
  let offset = 48;
  const readBase128 = (): number => {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = buffer[offset++]!;
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error('UIntBase128 が長すぎる');
  };
  let streamOffset = 0;
  let cmap: { start: number; length: number } | null = null;
  for (let i = 0; i < numTables; i += 1) {
    const flags = buffer[offset++]!;
    let tag = knownTags[flags & 0x3f];
    if ((flags & 0x3f) === 63) {
      tag = buffer.toString('latin1', offset, offset + 4);
      offset += 4;
    }
    const version = flags >> 6;
    const origLength = readBase128();
    // glyf / loca は 0 が変換あり、そのほかの表は 0 が変換なし
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    const length = transformed ? readBase128() : origLength;
    if (tag === 'cmap') cmap = { start: streamOffset, length };
    streamOffset += length;
  }
  if (!cmap) throw new Error('cmap がない');
  const stream = brotliDecompressSync(buffer.subarray(offset, offset + compressedSize));
  const table = stream.subarray(cmap.start, cmap.start + cmap.length);

  const codepoints = new Set<number>();
  const count = table.readUInt16BE(2);
  for (let i = 0; i < count; i += 1) {
    const platform = table.readUInt16BE(4 + i * 8);
    const encoding = table.readUInt16BE(6 + i * 8);
    const sub = table.subarray(table.readUInt32BE(8 + i * 8));
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    const format = sub.readUInt16BE(0);
    if (format === 4) {
      const segments = sub.readUInt16BE(6) / 2;
      const ends = 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const rangeOffsets = deltas + segments * 2;
      for (let s = 0; s < segments; s += 1) {
        const end = sub.readUInt16BE(ends + s * 2);
        const start = sub.readUInt16BE(starts + s * 2);
        const delta = sub.readUInt16BE(deltas + s * 2);
        const rangeOffset = sub.readUInt16BE(rangeOffsets + s * 2);
        for (let cp = start; cp <= end && cp !== 0xffff; cp += 1) {
          let glyph: number;
          if (rangeOffset === 0) {
            glyph = (cp + delta) & 0xffff;
          } else {
            const at = rangeOffsets + s * 2 + rangeOffset + (cp - start) * 2;
            glyph = sub.readUInt16BE(at);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) codepoints.add(cp);
        }
      }
    } else if (format === 12) {
      const groups = sub.readUInt32BE(12);
      for (let g = 0; g < groups; g += 1) {
        const start = sub.readUInt32BE(16 + g * 12);
        const end = sub.readUInt32BE(20 + g * 12);
        for (let cp = start; cp <= end; cp += 1) codepoints.add(cp);
      }
    }
  }
  return codepoints;
}

/** fonts.css の @font-face ごとの、ファイル名と unicode-range の文字一覧 */
function cssRanges(): { file: string; weight: string; codepoints: Set<number> }[] {
  const css = readFileSync(fontsCss, 'utf8');
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const file = /url\('\/fonts\/([^']+)'\)/.exec(body!)![1]!;
    const weight = /font-weight:\s*([^;]+);/.exec(body!)![1]!;
    const range = /unicode-range:\s*([^;]+);/.exec(body!)![1]!;
    const codepoints = new Set<number>();
    for (const part of range.split(',')) {
      const [from, to] = part.trim().replace(/^U\+/, '').split('-');
      expect(part, 'ワイルドカードを使わない').not.toContain('?');
      const start = parseInt(from!, 16);
      const end = to ? parseInt(to, 16) : start;
      for (let cp = start; cp <= end; cp += 1) codepoints.add(cp);
    }
    return { file, weight, codepoints };
  });
}

base.describe('分割ファイルの収録文字', () => {
  base('各 WOFF2 の収録文字が unicode-range と一致し、太さごとに重複・欠落がない', () => {
    const faces = cssRanges();
    const woff2Files = readdirSync(fontsDir).filter((name) => name.endsWith('.woff2'));
    expect(faces.map((face) => face.file).sort(), 'CSS とファイルが一対一').toEqual(woff2Files.sort());
    expect(faces.length).toBe(17);

    for (const face of faces) {
      const inFile = woff2Codepoints(readFileSync(`${fontsDir}${face.file}`));
      // Outfit は改行コード（U+0D）だけを範囲から外している（描画に関係しないため）
      if (face.file === 'outfit-variable.woff2') inFile.delete(0x0d);
      const missing = [...inFile].filter((cp) => !face.codepoints.has(cp));
      const extra = [...face.codepoints].filter((cp) => !inFile.has(cp));
      expect(missing.map((cp) => cp.toString(16)), `${face.file}: ファイルにあるのに範囲にない文字`).toEqual([]);
      expect(extra.map((cp) => cp.toString(16)), `${face.file}: 範囲にあるのにファイルにない文字`).toEqual([]);
    }

    for (const weight of ['400', '700']) {
      const parts = faces.filter((face) => face.file.startsWith('line-seed-jp-') && face.weight === weight);
      expect(parts.length).toBe(8);
      const union = new Set<number>();
      let sum = 0;
      for (const part of parts) {
        sum += part.codepoints.size;
        part.codepoints.forEach((cp) => union.add(cp));
      }
      expect(union.size, `${weight}: 範囲が重ならない`).toBe(sum);
      // 元のフォントの全収録文字（README の記録と同じ 8,341 文字）
      expect(union.size, `${weight}: 元のフォントの文字をすべて含む`).toBe(8341);
      for (const cp of [0x9ad9, 0xc9, 0x2460, 0x301c, 0xff5e, 0x3042, 0x30a2, 0x4e00, 0x3001, 0x3002]) {
        expect(union.has(cp), `U+${cp.toString(16)}`).toBe(true);
      }
    }
  });
});

test.describe('見出しの改行', () => {
  for (const width of [320, 360, 390, 768, 1024, 1280, 1440]) {
    test(`@ ${width}px: H1 は文節の途中で改行せず、H2 も文節で折り返す設定で枠に収まる`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const h1 = await page.locator('#hero-title').evaluate((el) => {
        // 文節は <wbr> で区切った文字列。文節ごとに、描画された行の数と右端を測る
        const box = el.getBoundingClientRect();
        const phrases = [...el.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')
          .map((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
            return {
              text: node.textContent,
              lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
              right: Math.max(...rects.map((rect) => rect.right)),
              max: box.right,
            };
          });
        return { fontSize: parseFloat(getComputedStyle(el).fontSize), wordBreak: getComputedStyle(el).wordBreak, phrases };
      });
      expect(h1.phrases.map((phrase) => phrase.text)).toEqual(['技術を、', '仕事の力に。']);
      expect(h1.wordBreak).toBe('keep-all');
      for (const phrase of h1.phrases) {
        expect(phrase.lines, `「${phrase.text}」が1行に収まる`).toBe(1);
        expect(phrase.right, `「${phrase.text}」が見出しの幅に収まる`).toBeLessThanOrEqual(phrase.max + 1);
      }
      const h2 =await page.locator('main h2').evaluateAll((els) =>
        els.map((el) => ({ wordBreak: getComputedStyle(el).wordBreak, overflow: el.scrollWidth - el.clientWidth })),
      );
      for (const item of h2) {
        expect(item.wordBreak).toBe('auto-phrase');
        expect(item.overflow, 'H2 が枠からはみ出さない').toBeLessThanOrEqual(0);
      }
      await testInfo.attach(`h1-${width}.json`, {
        body: JSON.stringify({ width, h1FontSizePx: h1.fontSize, phrases: h1.phrases.map((p) => p.text) }),
        contentType: 'application/json',
      });
    });
  }
});
