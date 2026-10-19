// 初回表示とデモ切替の「跳ね」と、操作の応答の確認。
// - レイアウトのずれ（Layout Shift）をブラウザーの PerformanceObserver で測り、合計が 0.1 未満であること
//   （Core Web Vitals の CLS の「良好」の基準。ここでは区切りを設けず全件を足した、より厳しい値で判定する）
// - 通常の条件と、通信と処理を遅くした条件（CDP の通信制限 + CPU 4倍遅延）の両方で測る
// - デモの切替・メニューの開閉では、本文の位置がまったく動かないこと（ずれの値が 0）
// - 操作への応答（Event Timing の処理時間）が 200ms 以内（INP の「良好」の基準）
// - 測った数値は、条件とともにテスト結果へ添付する（報告に使う）
import { writeFileSync } from 'node:fs';
import type { CDPSession, Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures';

type Shift = { value: number; hadRecentInput: boolean; time: number; sources: string[] };
type EventEntry = { name: string; duration: number; time: number; target: string };
type Metrics = { shifts: Shift[]; events: EventEntry[]; ready: Record<string, number> };

/** 通信制限の条件（Chrome の開発者ツールの「低速4G」と同じ値） */
const slow4g = { latency: 562.5, downloadThroughput: (1.44 * 1024 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 };
const cpuRate = 4;

/** ページを開く前に、ずれ・操作の応答・スクリプトの準備完了の時刻を記録する仕組みを入れる */
async function installObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const describe = (node: Node | null): string => {
      if (!(node instanceof Element)) return node?.nodeName ?? '';
      return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}`;
    };
    const metrics = { shifts: [], events: [], ready: {} } as {
      shifts: unknown[];
      events: unknown[];
      ready: Record<string, number>;
    };
    (window as unknown as { __metrics: typeof metrics }).__metrics = metrics;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources?: { node: Node | null }[];
      })[]) {
        metrics.shifts.push({
          value: entry.value,
          hadRecentInput: entry.hadRecentInput,
          time: entry.startTime,
          sources: (entry.sources ?? []).map((source) => describe(source.node)),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { target?: Node | null })[]) {
        metrics.events.push({ name: entry.name, duration: entry.duration, time: entry.startTime, target: describe(entry.target ?? null) });
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    const mark = (): void => {
      if (metrics.ready['tabs'] === undefined && document.querySelector('[data-demo-tablist] [role="tab"]')) {
        metrics.ready['tabs'] = performance.now();
      }
      if (metrics.ready['menu'] === undefined && document.querySelector('[data-menu-button]:not([hidden])')) {
        metrics.ready['menu'] = performance.now();
      }
    };
    new MutationObserver(mark).observe(document, { subtree: true, childList: true, attributes: true });
  });
}

async function readMetrics(page: Page): Promise<Metrics> {
  return page.evaluate(() => (window as unknown as { __metrics: Metrics }).__metrics);
}

/** 通信と処理を遅くする（CDP） */
async function throttle(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...slow4g });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  return cdp;
}

/** 表示の節目の時刻（ナビゲーション開始からのミリ秒） */
async function timings(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]));
    const fonts = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/fonts/'))
      .map((entry) => (entry as PerformanceResourceTiming).responseEnd);
    const scripts = performance
      .getEntriesByType('resource')
      .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === 'script')
      .map((entry) => (entry as PerformanceResourceTiming).responseEnd);
    const round = (value: number | undefined): number => Math.round(value ?? -1);
    return {
      firstContentfulPaint: round(paint['first-contentful-paint']),
      domContentLoaded: round(nav.domContentLoadedEventEnd),
      load: round(nav.loadEventEnd),
      scriptsLoaded: round(Math.max(0, ...scripts)),
      fontsLoaded: round(Math.max(0, ...fonts)),
      fontFiles: fonts.length,
    };
  });
}

const sum = (shifts: Shift[]): number => shifts.reduce((total, shift) => total + shift.value, 0);

async function attach(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

for (const condition of ['通常', '低速4G+CPU4倍'] as const) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`${condition} @ ${viewport.width}px: 初回表示とデモ切替・メニューでレイアウトが跳ねず、操作がすぐ応答する`, async ({ page }, testInfo) => {
      const throttled = condition !== '通常';
      test.setTimeout(throttled ? 120_000 : 30_000);
      await page.setViewportSize(viewport);
      await installObservers(page);
      const cdp = throttled ? await throttle(page) : null;

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      let earlyFaces = -1;
      if (cdp) {
        // 書体の読み込み前の表示を記録する（page.screenshot は書体の読み込みを待つため、CDP で直接撮る）
        earlyFaces = await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'loaded').length);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(testInfo.outputPath(`slow-early-${viewport.width}.png`), Buffer.from(data, 'base64'));
      }
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      const loaded = await readMetrics(page);
      const loadShift = sum(loaded.shifts.filter((shift) => !shift.hadRecentInput));
      if (throttled) await page.screenshot({ path: testInfo.outputPath(`slow-loaded-${viewport.width}.png`) });

      // 書体の切替のあとも、横にはみ出さない
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      expect(loaded.ready['tabs'], 'タブの準備ができた').toBeGreaterThan(0);
      expect(loaded.ready['menu'], 'メニューの準備ができた').toBeGreaterThan(0);

      // デモ切替: 入力の直後を含め、ずれが一切起きない
      const before = loaded.shifts.length;
      const bodyTop = await page.locator('#services').evaluate((el) => el.getBoundingClientRect().top);
      for (const name of ['Web', 'システム', 'AI・DX']) {
        await page.getByRole('tab', { name }).click();
        await page.waitForTimeout(450);
      }
      expect(await page.locator('#services').evaluate((el) => el.getBoundingClientRect().top)).toBe(bodyTop);

      // メニューの開閉でも、背面の本文はずれない
      await page.getByRole('navigation', { name: '下部メニュー' }).getByRole('button', { name: /メニュー/ }).click();
      await expect(page.getByRole('dialog', { name: 'サイトメニュー' })).toBeVisible();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: '閉じる' }).click();
      await expect(page.getByRole('dialog', { name: 'サイトメニュー' })).toBeHidden();
      await page.waitForTimeout(300);

      const after = await readMetrics(page);
      const interactionShifts = after.shifts.slice(before);
      const clicks = after.events.filter((entry) => ['pointerdown', 'pointerup', 'click', 'keydown'].includes(entry.name));
      const slowest = Math.max(0, ...clicks.map((entry) => entry.duration));

      await attach(testInfo, `metrics-${throttled ? 'slow' : 'normal'}-${viewport.width}.json`, {
        condition: throttled
          ? { network: 'latency 562.5ms / down 1.44Mbps / up 675kbps', cpuSlowdown: cpuRate }
          : { network: 'ローカル（制限なし）', cpuSlowdown: 1 },
        viewport,
        layoutShiftOnLoad: Number(loadShift.toFixed(4)),
        loadShiftSources: loaded.shifts.flatMap((shift) => shift.sources),
        layoutShiftOnInteraction: Number(sum(interactionShifts).toFixed(4)),
        interactionShiftSources: interactionShifts.flatMap((shift) => shift.sources),
        loadedFontFacesAtEarlyScreenshot: earlyFaces,
        readyMs: Object.fromEntries(Object.entries(loaded.ready).map(([key, value]) => [key, Math.round(value)])),
        timings: await timings(page),
        slowestInteractionMs: Math.round(slowest),
        interactionsOver16ms: clicks.map((entry) => ({ name: entry.name, ms: Math.round(entry.duration), target: entry.target })),
      });

      expect(loadShift, `初回表示のずれ: ${JSON.stringify(loaded.shifts)}`).toBeLessThan(0.1);
      expect(sum(interactionShifts), `操作時のずれ: ${JSON.stringify(interactionShifts)}`).toBe(0);
      expect(slowest, `操作への応答: ${JSON.stringify(clicks)}`).toBeLessThanOrEqual(200);
    });
  }
}
