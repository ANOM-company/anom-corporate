// トップページ（/）の内容と操作の確認。
// 初回表示・サービスの扱い・学びの計画・アンカー・画面デモの切替・相談分野の引き継ぎ・送信しない構造・
// 下部バーとの重なり・文字拡大と短い画面。
import type { Page } from '@playwright/test';
import { test, expect, anchors, trackSends } from './fixtures';

const bar = (page: Page) => page.getByRole('navigation', { name: '下部メニュー' });

test.describe('初回表示', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`@ ${viewport.width}px: 見出し・説明・主リンク・3つのサービス名が、動きを待たずに最初の画面で読める`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveText('技術を、仕事の力に。');
      const lead = page.locator('#top p').filter({ hasText: 'AI・DX支援、Web制作、システム開発。' });
      for (const target of [h1, lead, page.getByRole('link', { name: '提供サービスを見る' })]) {
        await expect(target).toBeInViewport();
      }
      // 本文・見出しには動き（フェード等）がなく、最初から不透明
      const animated = await page.evaluate(() =>
        [...document.querySelectorAll('#top h1, #top h1 *, #top p, #top a')]
          .filter((el) => el.getAnimations().length > 0 || getComputedStyle(el).opacity !== '1')
          .map((el) => el.outerHTML.slice(0, 80)),
      );
      expect(animated).toEqual([]);
      // 3つのサービス名（説明文）と切替ラベル
      await expect(lead).toContainText('AI・DX支援');
      await expect(lead).toContainText('Web制作');
      await expect(lead).toContainText('システム開発');
      for (const name of ['AI・DX', 'Web', 'システム']) {
        await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
      }
      // 説明用デモのラベルが常に見える
      await expect(page.getByRole('tabpanel').getByText('説明用デモ')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`top-first-view-${viewport.width}.png`) });
    });
  }

  test('冒頭の図形の組み上がりは 900ms 以内で、1回だけ', async ({ page }) => {
    await page.goto('/');
    const timing = await page.evaluate(() => {
      const animations = [...document.querySelectorAll('.assemble')].flatMap((el) => el.getAnimations());
      return animations.map((a) => {
        const t = a.effect?.getComputedTiming();
        return { end: Number(t?.endTime ?? 0), iterations: Number(t?.iterations ?? 0) };
      });
    });
    expect(timing.length).toBeGreaterThan(0);
    expect(Math.max(...timing.map((t) => t.end))).toBeLessThanOrEqual(900);
    expect(timing.every((t) => t.iterations === 1)).toBe(true);
    // 切替（説明用デモ）の動きは 360ms 以内
    await page.getByRole('tab', { name: 'Web' }).click();
    const switchDuration = await page.evaluate(() =>
      Number(document.querySelector('#demo-panel-web')?.getAnimations()[0]?.effect?.getComputedTiming().endTime ?? 0),
    );
    expect(switchDuration).toBeGreaterThan(0);
    expect(switchDuration).toBeLessThanOrEqual(360);
  });
});

test.describe('サービスの扱い', () => {
  test('AI・DX支援と Web制作・運用保守は同じ構成・同じ大きさ。システム開発は独立した入口', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const profile = async (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          h3: el.querySelectorAll('h3').length,
          examples: el.querySelectorAll('li').length,
          cta: [...el.querySelectorAll('a[href="#contact"]')].map((a) => getComputedStyle(a).backgroundColor),
          figure: el.querySelectorAll('svg[aria-hidden="true"]').length,
        };
      });
    const ai = await profile('service-ai');
    const web = await profile('service-web');
    expect(ai.width).toBe(web.width);
    expect(ai.height).toBe(web.height);
    expect(ai.top).toBe(web.top);
    expect({ ...ai, width: 0, height: 0, top: 0 }).toEqual({ ...web, width: 0, height: 0, top: 0 });
    expect(ai.h3).toBe(1);
    expect(ai.examples).toBe(3);
    expect(ai.cta).toHaveLength(1);

    await expect(page.getByRole('link', { name: 'AI・DX支援を相談する' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Web制作・運用保守を相談する' })).toBeVisible();
    // システム開発への独立した入口（サービス欄のリンク・専用のセクション・相談ボタン）
    await page.getByRole('link', { name: 'システム開発も相談できます' }).click();
    await expect(page).toHaveURL(/#service-system$/);
    await expect(page.getByRole('heading', { level: 2, name: '自社の仕事に合う仕組みを、形に。' })).toBeInViewport();
    await expect(page.locator('#service-system').getByRole('link', { name: 'システム開発を相談する' })).toBeVisible();
    for (const step of ['入力する', '整理する', '確認する']) {
      await expect(page.locator('#service-system ol').getByText(step)).toBeVisible();
    }
  });

  test('スマホ幅: AI・DX → Web の順に縦並び', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const ai = await page.locator('#service-ai').boundingBox();
    const web = await page.locator('#service-web').boundingBox();
    expect(ai && web && web.y >= ai.y + ai.height).toBe(true);
  });

  test('学びの計画は2項目とも「構想中」と文字で示し、日程・料金・申込みを置かない', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('#learning li');
    await expect(items).toHaveCount(2);
    for (const item of await items.all()) {
      await expect(item).toContainText('構想中');
    }
    await expect(page.locator('#learning')).toContainText('内容や開催時期は未定です。');
    await expect(page.locator('#learning').getByRole('link')).toHaveCount(0);
    await expect(page.locator('#learning').getByRole('button')).toHaveCount(0);
  });

  test('実績・数値・料金・お客様の声に当たる表記を置かない', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('main').innerText();
    // 金額・件数・割合・期間の数値、料金・無料・実績・お客様の声などの語
    expect(text).not.toMatch(/[0-9０-９][0-9０-９,]*\s*(円|万|件|社|%|％|日以内|時間以内)/);
    expect(text).not.toMatch(/料金|無料|実績|導入事例|お客様の声|削減率|即日/);
    // 支援のイメージは見本であることを明記する
    await expect(page.locator('#examples')).toContainText('機能を説明するための画面イメージです。実案件や稼働中の製品ではありません。');
    await expect(page.locator('#examples')).toContainText('サンプル案件A');
    await expect(page.locator('#examples').getByText('説明用デモ')).toBeVisible();
    // 支援のイメージの画面枠は装飾で、フォーカスできる操作を持たない
    const focusable = await page
      .locator('#examples [aria-hidden="true"]')
      .evaluateAll((els) => els.flatMap((el) => [...el.querySelectorAll('a, button, input, select, textarea, [tabindex]')]).length);
    expect(focusable).toBe(0);
  });
});

test.describe('アンカー', () => {
  test('設計のアンカーがすべて1つずつあり、ページ内リンクの移動先がすべて存在する', async ({ page }) => {
    await page.goto('/');
    for (const id of anchors) {
      await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
    }
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => href === '#' || !document.getElementById(decodeURIComponent(href.slice(1)))),
    );
    expect(missing).toEqual([]);
    // ダイアログ内に id を複製しない
    expect(await page.locator('#site-menu [id]').evaluateAll((els) => els.map((el) => el.id))).toEqual(['site-menu-title']);
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`@ ${viewport.width}px: URL のハッシュで直接開くと、その位置が表示される`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const id of anchors) {
        await page.goto(`/#${id}`);
        const target = page.locator(`[id="${id}"]`);
        await expect(target, id).toBeInViewport();
        // 見出しを持つ移動先は、見出しが画面内で、下部バーに隠れていない
        const heading = target.locator('h1, h2, h3').first();
        if ((await heading.count()) > 0) {
          await expect(heading, id).toBeInViewport();
          const headingBox = await heading.boundingBox();
          const barBox = await bar(page).boundingBox();
          if (headingBox && barBox) expect(headingBox.y + headingBox.height, id).toBeLessThanOrEqual(barBox.y);
        }
      }
    });
  }

  test('戻る／進むで、ページ内の移動の履歴をたどれる', async ({ page }) => {
    await page.goto('/');
    await bar(page).getByRole('link', { name: 'サービス' }).click();
    await expect(page).toHaveURL(/#services$/);
    await page.getByRole('link', { name: 'システム開発も相談できます' }).click();
    await expect(page).toHaveURL(/#service-system$/);
    await bar(page).getByRole('link', { name: '相談する' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await page.goBack();
    await expect(page).toHaveURL(/#service-system$/);
    await page.goBack();
    await expect(page).toHaveURL(/#services$/);
    await page.goForward();
    await expect(page).toHaveURL(/#service-system$/);
    await expect(page.getByRole('heading', { level: 2, name: '自社の仕事に合う仕組みを、形に。' })).toBeInViewport();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

test.describe('画面デモの切替（タブ）', () => {
  const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });

  test('WAI のタブの構造で、選んだパネルだけを表示・読み上げの対象にする', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: '画面デモの切替' });
    await expect(tablist.getByRole('tab')).toHaveCount(3);
    await expect(tab(page, 'AI・DX')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'Web')).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    const panel = page.getByRole('tabpanel', { name: 'AI・DX' });
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('tabindex', '0');
    await expect(page.locator('#demo-panel-web')).toBeHidden();
    await expect(page.locator('#demo-panel-system')).toBeHidden();
    for (const id of ['web', 'system']) {
      await expect(tab(page, id === 'web' ? 'Web' : 'システム')).toHaveAttribute('aria-controls', `demo-panel-${id}`);
    }
  });

  test('キーボード: 矢印で移動、Enter／Spaceで表示、Home／End、隠れたパネルには入れない', async ({ page }) => {
    await page.goto('/');
    // Tab で選択中のタブへ入る
    await page.getByRole('link', { name: '提供サービスを見る' }).focus();
    await page.keyboard.press('Tab');
    await expect(tab(page, 'AI・DX')).toBeFocused();

    // 矢印ではフォーカスだけが移り、表示は変わらない
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'Web')).toBeFocused();
    await expect(tab(page, 'AI・DX')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(tab(page, 'Web')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#demo-panel-web')).toBeVisible();
    await expect(page.locator('#demo-panel-ai')).toBeHidden();
    await expect(tab(page, 'Web')).toBeFocused();

    await page.keyboard.press('End');
    await expect(tab(page, 'システム')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(tab(page, 'システム')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'AI・DX')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tab(page, 'AI・DX')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tab(page, 'システム')).toBeFocused();

    // 選択中のタブから Tab: パネル → パネル内のリンク。隠れたパネルのリンクへは進まない
    await page.keyboard.press('Tab');
    await expect(page.locator('#demo-panel-system')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'システム開発を見る' })).toBeFocused();
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => document.activeElement?.closest('[data-demo-panel]')?.id ?? 'outside');
    expect(next).toBe('outside');

    // パネル内のリンクでサービス説明へ移る
    await page.getByRole('link', { name: 'システム開発を見る' }).click();
    await expect(page).toHaveURL(/#service-system$/);
  });

  test('クリックの連打: 最後に選んだパネルだけが表示され、下の本文は動かない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(1000); // 初回の組み上がりを終える
    const before = await page.locator('#services').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const panelsBefore = await page.locator('[data-demo-panels]').boundingBox();
    for (const name of ['Web', 'システム', 'AI・DX', 'Web', 'システム', 'Web']) {
      await tab(page, name).click({ noWaitAfter: true });
    }
    await expect(tab(page, 'Web')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.locator('#demo-panel-web')).toBeVisible();
    // 各パネルの表示位置・領域が変わらず、下のセクションも押し動かされない
    const after = await page.locator('#services').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const panelsAfter = await page.locator('[data-demo-panels]').boundingBox();
    expect(after).toBe(before);
    expect(panelsAfter?.height).toBe(panelsBefore?.height);
    // 選択したタブ以外のリンクは開いていない
    expect(page.url()).toMatch(/\/$/);
  });
});

test.describe('相談フォーム（確認版）', () => {
  test('ラベル・必須／任意・補足が結び付き、確認版である旨と送信できない理由を示す', async ({ page }) => {
    await page.goto('/');
    const contact = page.locator('#contact');
    await expect(contact.getByText('確認用プレビューです。入力内容は送信されません。')).toBeVisible();
    await expect(contact.getByText('「必須」の項目は入力が必要です。')).toBeVisible();
    for (const [label, attrs] of [
      ['お名前', { required: '', autocomplete: 'name', maxlength: '100' }],
      ['会社名・屋号', { autocomplete: 'organization', maxlength: '100' }],
      ['メールアドレス', { required: '', type: 'email', autocomplete: 'email', maxlength: '254' }],
      ['ご相談内容', { required: '', maxlength: '3000' }],
    ] as const) {
      const field = page.getByLabel(label);
      for (const [name, value] of Object.entries(attrs)) await expect(field, `${label} ${name}`).toHaveAttribute(name, value);
    }
    await expect(page.getByLabel('会社名・屋号')).not.toHaveAttribute('required');
    await expect(contact.locator('label[for="contact-company"]')).toContainText('任意');
    await expect(contact.locator('label[for="contact-name"]')).toContainText('必須');
    await expect(page.getByLabel('ご相談内容')).toHaveAccessibleDescription(/困っていること、実現したいことなど/);
    await expect(page.getByLabel('ご相談内容')).not.toHaveAttribute('placeholder');
    const select = page.getByLabel('ご相談の分野');
    await expect(select).toHaveAttribute('required');
    await expect(select).toHaveValue('');
    expect(await select.locator('option').allTextContents()).toEqual([
      '選択してください',
      'AI・DX支援',
      'Web制作・運用保守',
      'システム開発',
      'その他・まだ決まっていない',
    ]);
    const privacy = page.getByLabel('個人情報の取り扱いを確認しました');
    await expect(privacy).not.toBeChecked();
    await expect(privacy).toHaveAttribute('required');
    await expect(privacy).toHaveAccessibleDescription(/個人情報の取り扱い（確認用案）/);
    const send = page.getByRole('button', { name: '送信する' });
    await expect(send).toBeDisabled();
    await expect(send).toHaveAccessibleDescription('確認用プレビューのため、送信ボタンは押せません。入力内容はどこにも送信されません。');
    // 個人情報の説明（確認用案）。未作成のページやメールアドレスへのリンクを置かない
    await expect(page.locator('#contact-privacy')).toContainText('記載内容は確認中です。フォームは送信されません。');
    expect(await page.locator('a[href^="mailto:"], a[href*="/privacy"]').count()).toBe(0);
  });

  test('送信元になる form がなく、Enter・クリックでも送信・ページ移動・GET が起きない', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('form').count()).toBe(0);
    expect(await page.locator('[form]').count()).toBe(0);
    await expect(page.locator('fieldset[data-contact-form] > legend')).toHaveText('ご相談の内容');
    const sent = trackSends(page);
    const url = page.url();
    await page.getByLabel('お名前').fill('見本 太郎');
    await page.getByLabel('お名前').press('Enter');
    await page.getByLabel('会社名・屋号').fill('見本株式会社');
    await page.getByLabel('会社名・屋号').press('Enter');
    await page.getByLabel('メールアドレス').fill('name@example.com');
    await page.getByLabel('メールアドレス').press('Enter');
    await page.getByLabel('ご相談の分野').selectOption('other');
    await page.getByLabel('ご相談内容').fill('見本の相談内容です。');
    await page.getByLabel('個人情報の取り扱いを確認しました').check();
    await page.getByLabel('個人情報の取り扱いを確認しました').press('Enter');
    await page.getByRole('button', { name: '送信する' }).click({ force: true });
    await page.waitForTimeout(300);
    expect(page.url()).toBe(url);
    expect(sent, 'フォーム操作でリクエストが発生しないこと').toEqual([]);
    // 成功を装う表示を出さない
    await expect(page.getByText('お問い合わせを受け付けました')).toHaveCount(0);
    await expect(page.getByLabel('お名前')).toHaveValue('見本 太郎');
  });

  test('サービス欄の相談ボタンで分野を引き継ぎ、ほかの入力は残す。状態文で伝える', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('お名前').fill('見本 太郎');
    await page.getByLabel('会社名・屋号').fill('見本商店');
    await page.getByLabel('メールアドレス').fill('name@example.com');
    await page.getByLabel('ご相談内容').fill('サイトを見直したい');
    const status = page.locator('#contact [role="status"]');

    await page.getByRole('link', { name: 'Web制作・運用保守を相談する' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.getByLabel('ご相談の分野')).toHaveValue('web');
    await expect(status).toHaveText('ご相談の分野を「Web制作・運用保守」にしました。ほかの入力内容はそのままです。');
    // 状態文はフォームの見出しの直後
    const order = await page.evaluate(() => {
      const heading = document.getElementById('contact-title');
      const statusEl = document.querySelector('#contact [role="status"]');
      return heading && statusEl ? heading.compareDocumentPosition(statusEl) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
    });
    expect(order).toBeTruthy();

    // メニューで別の場所へ移動して戻っても、入力は消えない
    await bar(page).getByRole('button', { name: /メニュー/ }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'システム開発' }).click();
    await page.locator('#service-system').getByRole('link', { name: 'システム開発を相談する' }).click();
    await expect(page.getByLabel('ご相談の分野')).toHaveValue('system');
    await expect(status).toContainText('「システム開発」');
    await page.getByRole('link', { name: 'AI・DX支援を相談する' }).click();
    await expect(page.getByLabel('ご相談の分野')).toHaveValue('ai');
    await expect(page.getByLabel('お名前')).toHaveValue('見本 太郎');
    await expect(page.getByLabel('会社名・屋号')).toHaveValue('見本商店');
    await expect(page.getByLabel('メールアドレス')).toHaveValue('name@example.com');
    await expect(page.getByLabel('ご相談内容')).toHaveValue('サイトを見直したい');
  });

  test('スマホ幅: 文字入力・選択欄にフォーカスしている間だけ下部バーを隠し、Tab順と読み上げからも外す', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#contact');
    const nav = bar(page);
    await expect(nav).toBeVisible();
    for (const label of ['お名前', 'メールアドレス', 'ご相談の分野', 'ご相談内容']) {
      await page.getByLabel(label).focus();
      await expect(nav, label).toBeHidden();
      // 隠れた要素は役割でたどれないため、属性で取り出して確かめる
      expect(await page.locator('[data-bottom-nav]').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    }
    // 隠れている間は Tab で入れない（ご相談内容 → チェックボックス → 説明へのリンク …）
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('個人情報の取り扱いを確認しました')).toBeFocused();
    await expect(nav).toBeVisible();
    // フォーム外へ移ると戻る
    await page.getByRole('link', { name: 'サービスに戻る' }).focus();
    await expect(nav).toBeVisible();
    // 補助リンクで移動できる
    await page.getByRole('link', { name: 'ページ上部へ' }).click();
    await expect(page).toHaveURL(/#top$/);
  });

  test('PC幅: 入力中も下部バーは表示したまま', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#contact');
    await page.getByLabel('お名前').focus();
    await expect(bar(page)).toBeVisible();
  });
});

test.describe('下部バーとの重なり・文字拡大・短い画面', () => {
  /** Tab で全要素を巡り、フォーカスした要素が下部バーの裏に隠れていないことを確かめる */
  async function expectNothingHiddenBehindBar(page: Page, label: string): Promise<{ count: number; tall: string[] }> {
    const seen = new Set<string>();
    const tall: string[] = [];
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const navEl = document.querySelector('[data-bottom-nav]') as HTMLElement;
        const rect = el.getBoundingClientRect();
        const barRect = navEl.getBoundingClientRect();
        return {
          key: `${[...document.querySelectorAll('*')].indexOf(el)}`,
          label: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 16)}" ${el.id}`,
          inBar: navEl.contains(el),
          barVisible: getComputedStyle(navEl).visibility !== 'hidden',
          bottom: rect.bottom,
          top: rect.top,
          barTop: barRect.top,
          viewport: window.innerHeight,
        };
      });
      if (!info) continue;
      if (seen.has(info.key)) break;
      seen.add(info.key);
      if (info.inBar) continue;
      const visibleBottom = info.barVisible ? info.barTop : info.viewport;
      if (info.bottom - info.top > visibleBottom + 1) {
        // 見える範囲（画面上端から下部バーまで）より背の高い要素（短い横向き画面の画面デモ）は全体を出せないため、
        // 見える範囲いっぱいに表示され、下部バーの裏にだけ隠れていることがないことを確かめる
        expect(info.top, `${label}: ${info.label} が見える範囲を覆う`).toBeLessThanOrEqual(1);
        expect(info.bottom, `${label}: ${info.label} が見える範囲を覆う`).toBeGreaterThanOrEqual(visibleBottom - 1);
        tall.push(info.label);
        continue;
      }
      expect(info.top, `${label}: ${info.label} が画面内`).toBeGreaterThanOrEqual(-1);
      expect(info.bottom, `${label}: ${info.label} が画面内`).toBeLessThanOrEqual(info.viewport + 1);
      if (info.barVisible) {
        expect(info.bottom, `${label}: ${info.label} が下部バーに隠れない`).toBeLessThanOrEqual(info.barTop + 1);
      }
    }
    return { count: seen.size, tall };
  }

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 640, height: 360 },
  ]) {
    test(`${viewport.width}×${viewport.height}: Tab で移動した操作が下部バーに隠れない`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const { count, tall } = await expectNothingHiddenBehindBar(page, `${viewport.width}px`);
      expect(count).toBeGreaterThan(30);
      // 見える範囲より背の高い要素は、短い横向き画面の画面デモだけ
      if (viewport.height >= 500) expect(tall).toEqual([]);
      else expect(tall.every((item) => item.includes('demo-panel-'))).toBe(true);
    });
  }

  test('文字の大きさ 200%: 横にはみ出さず、下部バーは伸びて、本文とフッターの最後まで隠れない', async ({ page }, testInfo) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const barBefore = await bar(page).boundingBox();
      // 文字だけを拡大する（ブラウザーの文字サイズ設定 200% 相当。CSSOM で指定するため CSP に触れない）
      await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%'));
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${viewport.width}px: 横スクロールなし`).toBeLessThanOrEqual(0);
      const barAfter = await bar(page).boundingBox();
      expect(barAfter!.height).toBeGreaterThan(barBefore!.height);
      // 下部バーの高さが余白の計算に反映されている
      const barHeightVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bar-height'));
      expect(parseFloat(barHeightVar)).toBeCloseTo(barAfter!.height, -1);
      // 最下部までスクロールすると、フッター最後のリンクがバーより上に見える
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(100);
      const last = page.locator('footer a').last();
      const lastBox = await last.boundingBox();
      const barBox = await bar(page).boundingBox();
      expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(barBox!.y);
      await page.screenshot({ path: testInfo.outputPath(`text-200-${viewport.width}.png`) });
    }
  });

  test('ブラウザーの拡大 200% 相当（1280×800 の半分の 640×400）: 横にはみ出さない', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 400 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(bar(page)).toBeInViewport({ ratio: 1 });
  });
});
