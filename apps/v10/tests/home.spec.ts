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
      await expect(h1).toHaveText('仕事を、もっと自由に。');
      const lead = page.locator('#top p').filter({ hasText: 'AI・DX支援、Web制作、システム開発で、' });
      for (const target of [h1, lead, page.locator('#top').getByRole('link', { name: 'サービスを見る' })]) {
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
      for (const name of ['AI・DX', 'Web', 'System']) {
        await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
      }
      // 説明用のイメージであることを示すラベルが常に見える
      await expect(page.getByRole('tabpanel').getByText('説明用イメージ')).toBeVisible();
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
    // 切替の動きは図だけで 360ms 以内。説明文（パネル）は動かさずにすぐ切り替える
    await page.getByRole('tab', { name: 'Web' }).click();
    const switchTiming = await page.evaluate(() => ({
      visual: Number(document.querySelector('[data-view-visual="web"]')?.getAnimations()[0]?.effect?.getComputedTiming().endTime ?? 0),
      panel: document.querySelector('#demo-panel-web')?.getAnimations().length ?? -1,
    }));
    expect(switchTiming.visual).toBeGreaterThan(0);
    expect(switchTiming.visual).toBeLessThanOrEqual(360);
    expect(switchTiming.panel).toBe(0);
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
    // システム開発は主力2枠の下の独立した枠（専用の見出し・相談ボタン）。冒頭の画面デモからも移れる
    const system = await profile('service-system');
    expect(system.top, 'システム開発の枠は主力2枠の下').toBeGreaterThanOrEqual(ai.top + ai.height);
    await page.getByRole('tab', { name: 'System', exact: true }).click();
    await page.locator('#top').getByRole('link', { name: 'システム開発を見る' }).click();
    await expect(page).toHaveURL(/#service-system$/);
    await expect(page.getByRole('heading', { level: 3, name: '仕事に合う仕組みをつくる。' })).toBeInViewport();
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

  test('システム開発: スマホ幅は 本文→図→相談ボタン の縦順、PC は本文と図を左右に置き相談ボタンは本文の下。HTMLの順も同じ', async ({
    page,
  }, testInfo) => {
    const layout = async () =>
      page.locator('#service-system').evaluate((section) => {
        const box = (el: Element | null) => {
          const rect = el!.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        };
        const heading = section.querySelector('#service-system-title');
        const examples = section.querySelector('ul');
        const figure = section.querySelector('ol');
        const cta = section.querySelector('a[data-consult-field="system"]');
        // HTML（読み上げ・Tab）の順: 前の要素の後ろに次の要素があるか
        const follows = (a: Element | null, b: Element | null) => Boolean(a!.compareDocumentPosition(b!) & Node.DOCUMENT_POSITION_FOLLOWING);
        return {
          domOrder: follows(heading, examples) && follows(examples, figure) && follows(figure, cta),
          heading: box(heading),
          examples: box(examples),
          figure: box(figure),
          cta: box(cta),
        };
      });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const sp = await layout();
    expect(sp.domOrder, 'HTML の順が 本文→図→相談ボタン').toBe(true);
    expect(sp.figure.top, '図は本文（相談例）の下').toBeGreaterThanOrEqual(sp.examples.bottom);
    expect(sp.cta.top, '相談ボタンは図の下').toBeGreaterThanOrEqual(sp.figure.bottom);
    // 記録用の画像に下部バーが重ならないよう、撮影の前だけ隠す（CSSOM で指定するため CSP に触れない）
    await page.locator('[data-bottom-nav]').evaluate((el) => (el as HTMLElement).style.setProperty('visibility', 'hidden'));
    await page.locator('#service-system').screenshot({ path: testInfo.outputPath('service-system-390.png') });

    await page.setViewportSize({ width: 1440, height: 900 });
    const pc = await layout();
    expect(pc.domOrder).toBe(true);
    expect(pc.figure.left, '図は本文の右').toBeGreaterThanOrEqual(pc.heading.right);
    expect(pc.figure.left).toBeGreaterThanOrEqual(pc.examples.right);
    expect(pc.cta.top, '相談ボタンは本文の下').toBeGreaterThanOrEqual(pc.examples.bottom);
    expect(Math.abs(pc.cta.left - pc.heading.left), '相談ボタンは本文と同じ左列').toBeLessThanOrEqual(1);
    expect(pc.cta.right).toBeLessThanOrEqual(pc.figure.left);
    await page.locator('#service-system').screenshot({ path: testInfo.outputPath('service-system-1440.png') });
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
    await expect(page.locator('#examples').getByText('説明用イメージ')).toBeVisible();
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
    await page.locator('#site-navigation').getByRole('link', { name: 'システム開発' }).click();
    await expect(page).toHaveURL(/#service-system$/);
    await bar(page).getByRole('link', { name: '相談する' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await page.goBack();
    await expect(page).toHaveURL(/#service-system$/);
    await page.goBack();
    await expect(page).toHaveURL(/#services$/);
    await page.goForward();
    await expect(page).toHaveURL(/#service-system$/);
    await expect(page.getByRole('heading', { level: 3, name: '仕事に合う仕組みをつくる。' })).toBeInViewport();
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
      await expect(tab(page, id === 'web' ? 'Web' : 'System')).toHaveAttribute('aria-controls', `demo-panel-${id}`);
    }
  });

  test('キーボード: 矢印で移動、Enter／Spaceで表示、Home／End、隠れたパネルには入れない', async ({ page }) => {
    await page.goto('/');
    // Tab で選択中のタブへ入る（冒頭の2つ目のボタンの次）
    await page.locator('#top').getByRole('link', { name: '相談する' }).focus();
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
    await expect(tab(page, 'System')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(tab(page, 'System')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'AI・DX')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tab(page, 'AI・DX')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tab(page, 'System')).toBeFocused();

    // 選択中のタブから Tab: パネル → パネル内のリンク。隠れたパネルのリンクへは進まない
    await page.keyboard.press('Tab');
    await expect(page.locator('#demo-panel-system')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#top').getByRole('link', { name: 'システム開発を見る' })).toBeFocused();
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => document.activeElement?.closest('[data-demo-panel]')?.id ?? 'outside');
    expect(next).toBe('outside');

    // パネル内のリンクでサービス説明へ移る
    await page.locator('#top').getByRole('link', { name: 'システム開発を見る' }).click();
    await expect(page).toHaveURL(/#service-system$/);
  });

  test('クリックの連打: 最後に選んだパネルだけが表示され、下の本文は動かない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(1000); // 初回の組み上がりを終える
    const before = await page.locator('#services').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const panelsBefore = await page.locator('[data-demo-panels]').boundingBox();
    for (const name of ['Web', 'System', 'AI・DX', 'Web', 'System', 'Web']) {
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

  /** 主な見出しと本文の文字サイズ（px） */
  const sizeTargets = ['#hero-title', '#services-title', '#service-ai h3', '#contact-title', '#top h1 + p'];
  async function fontSizes(page: Page): Promise<number[]> {
    return page.evaluate((selectors) => selectors.map((s) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize)), sizeTargets);
  }

  /** 見出しが自分の列の中に収まり（はみ出し・切れがない）、指定した要素と重ならない */
  async function headingsFit(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const problems: string[] = [];
      const name = (el: Element) => `${el.tagName.toLowerCase()}「${(el.textContent ?? '').trim().slice(0, 12)}」`;
      const viewport = document.documentElement.clientWidth;
      for (const heading of document.querySelectorAll('main h1, main h2, main h3')) {
        const rect = heading.getBoundingClientRect();
        if (rect.width === 0) continue; // 表示していない画面デモのパネルの中など
        const parent = heading.parentElement!.getBoundingClientRect();
        if (heading.scrollWidth > heading.clientWidth + 1) problems.push(`${name(heading)} の中身が横にはみ出す`);
        if (rect.left < parent.left - 1 || rect.right > parent.right + 1) problems.push(`${name(heading)} が列からはみ出す`);
        if (rect.right > viewport + 1) problems.push(`${name(heading)} が画面の右端を越える`);
      }
      const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      for (const [a, b] of [
        ['#hero-title', '[data-demo-tabs]'],
        ['#hero-title', '#top h1 + p'],
        ['#contact-title', '#contact fieldset'],
        ['#services-title', '#service-ai'],
      ] as const) {
        if (intersects(document.querySelector(a)!.getBoundingClientRect(), document.querySelector(b)!.getBoundingClientRect())) {
          problems.push(`${a} と ${b} が重なる`);
        }
      }
      return problems;
    });
  }

  /** 冒頭（見出しと画面デモ）・相談欄（説明と入力欄）が左右に並んでいるか、縦に積まれているか */
  async function splitLayout(page: Page): Promise<{ hero: string; contact: string; h1PhraseLines: number[] }> {
    return page.evaluate(() => {
      const arrangement = (a: string, b: string) => {
        const first = document.querySelector(a)!.getBoundingClientRect();
        const second = document.querySelector(b)!.getBoundingClientRect();
        if (second.left >= first.right) return '左右';
        if (second.top >= first.bottom) return '縦';
        return '重なり';
      };
      const h1 = document.querySelector('#hero-title')!;
      const h1PhraseLines = [...h1.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')
        .map((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top))).size;
        });
      return { hero: arrangement('#hero-title', '[data-demo-tabs]'), contact: arrangement('#contact-title', '#contact fieldset'), h1PhraseLines };
    });
  }

  test('文字の大きさ 200%: 横にはみ出さず、下部バーは伸びて、本文とフッターの最後まで隠れない', async ({ page }, testInfo) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const barBefore = await bar(page).boundingBox();
      const sizesBefore = await fontSizes(page);
      const layoutBefore = await splitLayout(page);
      // 文字だけを拡大する（ブラウザーの文字サイズ設定 200% 相当。CSSOM で指定するため CSP に触れない）
      await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%'));
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${viewport.width}px: 横スクロールなし`).toBeLessThanOrEqual(0);
      // 見出しも本文と同じ比率で大きくなる（H1・H2・H3・本文の実寸で確かめる）
      const sizesAfter = await fontSizes(page);
      await testInfo.attach(`text-200-sizes-${viewport.width}.json`, {
        body: JSON.stringify(Object.fromEntries(sizeTargets.map((s, i) => [s, { before: sizesBefore[i], after: sizesAfter[i] }]))),
        contentType: 'application/json',
      });
      sizeTargets.forEach((target, i) => {
        expect(sizesAfter[i]! / sizesBefore[i]!, `${viewport.width}px: ${target} の文字サイズ ${sizesBefore[i]}→${sizesAfter[i]}px`).toBeGreaterThanOrEqual(1.95);
      });
      // 大きくなった見出しは折り返しで収まり、列からはみ出したり、ほかの要素に重なったりしない
      expect(await headingsFit(page), `${viewport.width}px`).toEqual([]);
      // PC 幅: 通常の文字サイズでは左右に並び、200% では冒頭・相談欄を1列にして、H1 は文節ごとの行のまま
      const layoutAfter = await splitLayout(page);
      if (viewport.width >= 1024) {
        expect(layoutBefore, `${viewport.width}px: 通常の文字サイズ`).toEqual({ hero: '左右', contact: '左右', h1PhraseLines: [1, 1] });
        expect(layoutAfter, `${viewport.width}px: 文字 200%`).toEqual({ hero: '縦', contact: '縦', h1PhraseLines: [1, 1] });
      }
      await page.screenshot({ path: testInfo.outputPath(`text-200-top-${viewport.width}.png`) });
      await page.locator('#contact-title').scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`text-200-contact-${viewport.width}.png`) });
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

test.describe('見出しの大きさ・本文の行間・折り返し・図の中の重なり', () => {
  test('どの画面幅でも、見出しは H1 ＞ H2 ＞ H3 の順に大きい（サービスの見出しが区画の見出しを上回らない）', async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const sizes = await page.evaluate(() => {
        // 展開メニュー（閉じている <dialog>）の中の見出しは、ページの見出しの並びとは別に扱う
        const of = (selector: string) =>
          [...document.querySelectorAll<HTMLElement>(selector)]
            .filter((el) => !el.closest('dialog'))
            .map((el) => ({ text: (el.textContent ?? '').trim().slice(0, 16), px: parseFloat(getComputedStyle(el).fontSize) }));
        return { h1: of('h1'), h2: of('h2'), h3: of('h3') };
      });
      expect(sizes.h1.length, `${width}px`).toBe(1);
      expect(sizes.h2.length, `${width}px`).toBeGreaterThan(0);
      expect(sizes.h3.length, `${width}px`).toBeGreaterThan(0);
      const smallestH2 = Math.min(...sizes.h2.map((item) => item.px));
      const largestH2 = Math.max(...sizes.h2.map((item) => item.px));
      expect(largestH2, `${width}px: H2 は H1 より小さい`).toBeLessThan(sizes.h1[0]!.px);
      for (const h3 of sizes.h3) {
        expect(h3.px, `${width}px: H3「${h3.text}」は H2（${smallestH2}px）より小さい`).toBeLessThan(smallestH2);
      }
    }
  });

  for (const width of [390, 1440]) {
    test(`@ ${width}px: 本文の段落の行間は 1.8（文字サイズを指定していない段落も同じ）`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const paragraphs = await page.evaluate(() => {
        const japanese = /[\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Han}]/u;
        return [...document.querySelectorAll<HTMLElement>('main p, main li, main dd, footer p')]
          .filter((el) => [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && japanese.test(node.textContent ?? '')))
          .filter((el) => (el.textContent ?? '').trim().length > 30)
          .map((el) => {
            const style = getComputedStyle(el);
            const px = parseFloat(style.fontSize);
            return { text: (el.textContent ?? '').trim().slice(0, 14), px, ratio: Math.round((parseFloat(style.lineHeight) / px) * 100) / 100 };
          });
      });
      expect(paragraphs.length).toBeGreaterThanOrEqual(10);
      for (const paragraph of paragraphs) {
        // 本文（16px・18px）は 1.8、小さな注記（14px）は 1.7
        const expected = paragraph.px >= 16 ? 1.8 : 1.7;
        expect(paragraph.ratio, `「${paragraph.text}」（${paragraph.px}px）`).toBe(expected);
      }
    });

    test(`@ ${width}px: 画面デモの浮いた札は、3つの画面のどれでも図の中の文字（MESSAGE・ACTION など）に重ならない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      for (const [name, id] of [
        ['AI・DX', 'ai'],
        ['Web', 'web'],
        ['System', 'system'],
      ] as const) {
        await page.getByRole('tab', { name, exact: true }).click();
        await expect(page.locator('[data-demo-tabs]')).toHaveAttribute('data-view', id);
        // 切替のクロスフェードと冒頭の組み立てが終わってから測る
        await page.waitForFunction(
          (view) => document.querySelector(`[data-view-visual="${view}"]`)!.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running' || animation.timeline !== document.timeline),
          id,
        );
        const covered = await page.evaluate((view) => {
          const figure = document.querySelector(`[data-view-visual="${view}"]`)!;
          const notes = [...figure.querySelectorAll('.depth-float')].map((note) => note.firstElementChild!.getBoundingClientRect());
          // 札はスクロールに合わせて最大 8px 上へ動く（global.css の depth-float）。動いた先でも重ならないこと
          const drift = 8;
          const hits: string[] = [];
          const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = (node.textContent ?? '').trim();
            if (!text || node.parentElement?.closest('.depth-float')) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              if (notes.some((note) => rect.right > note.left && rect.left < note.right && rect.bottom > note.top - drift && rect.top < note.bottom)) {
                hits.push(text);
              }
            }
          }
          return { notes: notes.length, hits };
        }, id);
        expect(covered.notes, `${name}: 札は2枚`).toBe(2);
        expect(covered.hits, `${name}: 札の下に隠れる文字`).toEqual([]);
      }
    });
  }

  test.describe('スマホと同じ条件（スクロールバーが幅を取らない）', () => {
    test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });

    test('320×568 の最初の画面: 最初のボタン「サービスを見る」が下部バーの上に全部見える', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const button = await page.locator('#top').getByRole('link', { name: 'サービスを見る' }).boundingBox();
      const nav = await bar(page).boundingBox();
      if (!button || !nav) throw new Error('ボタンまたは下部バーが見つかりません');
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(button.y + button.height, 'ボタンの下端が、下部バーの上端より 8px 以上 上にある').toBeLessThanOrEqual(nav.y - 8);
      // 下部バーの3項目は1段で、「メニュー」は1行
      const menu = await bar(page).getByRole('button', { name: 'メニュー' }).boundingBox();
      expect(menu?.height).toBeLessThanOrEqual(52);
      // 余白を詰めるのは高さの低いスマホだけ。390×844 では通常の余白のまま
      const tight = await page.locator('#top').evaluate((section) => getComputedStyle(section).paddingTop);
      await page.setViewportSize({ width: 390, height: 844 });
      const normal = await page.locator('#top').evaluate((section) => getComputedStyle(section).paddingTop);
      expect(tight).toBe('24px');
      expect(normal).toBe('40px');
    });
  });

  test('フッターの案内: 項目は語の途中で折り返さず、案内の幅が足りないとき（1024px）は2列、広いときは4列', async ({ page }) => {
    for (const { width, columns } of [
      { width: 768, columns: 2 },
      { width: 1024, columns: 2 },
      { width: 1280, columns: 4 },
      { width: 1440, columns: 4 },
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const result = await page.evaluate(() => {
        const nav = document.querySelector('#site-navigation')!;
        const groups = [...nav.querySelectorAll('ul')].map((list) => Math.round(list.getBoundingClientRect().left));
        // 各リンクの文言（状態の表示を含む）が何行になっているか
        const wrapped = [...nav.querySelectorAll('a')].flatMap((link) => {
          // 文字の上下の中央で行を数える（状態の表示［構想中］は文字が小さく、同じ行でも上端の位置が違うため）
          const centers: number[] = [];
          const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent ?? '';
            for (let i = 0; i < text.length; i++) {
              if (!text[i]!.trim()) continue;
              const range = document.createRange();
              range.setStart(node, i);
              range.setEnd(node, i + 1);
              const rect = range.getBoundingClientRect();
              centers.push((rect.top + rect.bottom) / 2);
            }
          }
          const lines = Math.max(...centers) - Math.min(...centers) > 8 ? 2 : 1;
          return lines > 1 ? [(link.textContent ?? '').trim().replace(/\s+/g, ' ')] : [];
        });
        return { columns: new Set(groups).size, wrapped };
      });
      expect(result.wrapped, `${width}px: 折り返した項目`).toEqual([]);
      expect(result.columns, `${width}px: 案内の列数`).toBe(columns);
    }
  });

  test('相談欄の「個人情報の取り扱い（確認用案）を読む」は、押せる高さ 44px 以上', async ({ page }) => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const link = page.locator('#contact').getByRole('link', { name: '個人情報の取り扱い（確認用案）を読む' });
      const box = await link.boundingBox();
      if (!box) throw new Error('リンクが見つかりません');
      expect(box.height, `${width}px`).toBeGreaterThanOrEqual(44);
      await expect(link).toHaveAttribute('href', '#contact-privacy');
    }
  });
});

test.describe('ヘッダー', () => {
  test('公式ロゴ・主なリンク・相談するボタン。PC は全部、スマホ幅はロゴと相談するだけを出す', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const header = page.locator('body > header');
    await expect(header.getByRole('link', { name: 'ANOM', exact: true }).getByRole('img', { name: 'ANOM' })).toBeVisible();
    const nav = header.getByRole('navigation', { name: 'メインメニュー' });
    for (const [name, hash] of [
      ['サービス', 'services'],
      ['ANOMについて', 'about'],
      ['相談する', 'contact'],
    ] as const) {
      await nav.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(nav.getByRole('link', { name: 'サービス' })).toBeHidden();
    await expect(nav.getByRole('link', { name: 'ANOMについて' })).toBeHidden();
    await expect(nav.getByRole('link', { name: '相談する' })).toBeVisible();
  });
});

test.describe('考え方', () => {
  for (const width of [320, 390, 1440]) {
    test(`@ ${width}px: 一文は「無駄を減らし、」で改行し、強調の線は文字の下にあり本文を隠さない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/#philosophy');
      const heading = page.locator('#philosophy-title');
      await expect(heading).toContainText('無駄を減らし、人が力を発揮できる仕事へ。');
      const lines = await heading.evaluate((el) => {
        const before = el.firstElementChild!.getBoundingClientRect();
        const emphasis = el.querySelector('.scroll-highlight')!;
        const firstRect = emphasis.getClientRects()[0]!;
        return { beforeBottom: before.bottom, emphasisTop: firstRect.top, color: getComputedStyle(emphasis).color, headingColor: getComputedStyle(el).color };
      });
      expect(lines.emphasisTop, '強調の部分は次の行から始まる').toBeGreaterThanOrEqual(lines.beforeBottom - 1);
      // 強調は線（背景）だけで、文字の色は見出しと同じ
      expect(lines.color).toBe(lines.headingColor);
    });
  }
});

test.describe('スクロールに連動する線', () => {
  // 線の進み具合を読む（進め方のレールは伸び率、ANOMについての線は残りの長さ、考え方の強調は線の幅）
  const progress = (page: Page) =>
    page.evaluate(() => {
      const css = (selector: string) => getComputedStyle(document.querySelector(selector)!);
      return {
        rail: css('.step-rail-fill').scale,
        line: css('.draw-line').strokeDashoffset,
        highlight: css('.scroll-highlight').backgroundSize,
      };
    });
  // 対象の上端を、画面の高さに対する割合の位置へ合わせる（0 = 画面の上端、1 = 下端）
  const scrollTopTo = (page: Page, selector: string, ratio: number) =>
    page.evaluate(
      ([target, at]) => {
        const top = document.querySelector(target)!.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top - window.innerHeight * at);
      },
      [selector, ratio] as const,
    );

  for (const viewport of [
    { width: 390, height: 844, axis: '縦' },
    { width: 1440, height: 900, axis: '横' },
  ]) {
    test(`@ ${viewport.width}px: 進め方の${viewport.axis}の線・ANOMについての線・考え方の強調が、スクロールの量に合わせて進む`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize(viewport);
      await page.goto('/');
      // 動きが実際に付いている（ビルド時の圧縮で指定が無効になっていない）
      const running = await page.evaluate(() =>
        ['.step-rail-fill', '.draw-line', '.scroll-highlight', '.depth-float'].map(
          (selector) => document.querySelector(selector)!.getAnimations().length,
        ),
      );
      expect(running).toEqual([1, 1, 1, 1]);
      // 画面に入る前は、線がまだ引かれていない
      const before = await progress(page);
      expect(before.rail).toBe(viewport.axis === '縦' ? '1 0' : '0 1');
      expect(before.line).toBe('1px');

      // 進め方: 区画が画面を通り過ぎると、線は最後まで引かれる
      await scrollTopTo(page, '.step-rail', -0.6);
      await expect.poll(async () => (await progress(page)).rail).toBe('1');
      // ANOMについて: 図が画面の上の方まで来ると、線は最後まで引かれる
      await scrollTopTo(page, '.draw-on-scroll', 0.05);
      await expect.poll(async () => (await progress(page)).line).toBe('0px');
      // 考え方: 一文が画面の上の方まで来ると、強調の線は幅いっぱいになる
      await scrollTopTo(page, '.scroll-highlight', 0.1);
      await expect.poll(async () => (await progress(page)).highlight).toMatch(/^100% /);
    });

    test(`@ ${viewport.width}px: 進め方の点は線の上に並び、線と点は読み上げの対象外。段階は番号つきの見出しで読める`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/#process');
      const section = page.locator('#process');
      await expect(section.getByRole('listitem')).toHaveCount(4);
      for (const name of ['01 相談', '02 現状整理', '03 提案', '04 伴走']) {
        await expect(section.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
      }
      const geometry = await section.evaluate((el) => {
        const track = el.querySelector('.step-rail-track')!;
        const box = track.getBoundingClientRect();
        const nodes = [...el.querySelectorAll('.step-rail-node')];
        return {
          hidden: [track, ...nodes].every((part) => part.closest('[aria-hidden="true"]') !== null),
          trackX: box.left + box.width / 2,
          trackY: box.top + box.height / 2,
          trackTop: box.top,
          trackBottom: box.bottom,
          nodes: nodes.map((node) => {
            const rect = node.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          }),
        };
      });
      expect(geometry.hidden).toBe(true);
      expect(geometry.nodes).toHaveLength(4);
      for (const node of geometry.nodes) {
        if (viewport.axis === '縦') {
          expect(Math.abs(node.x - geometry.trackX), '点は縦の線の上').toBeLessThanOrEqual(1);
          expect(node.y).toBeGreaterThanOrEqual(geometry.trackTop - 1);
          expect(node.y).toBeLessThanOrEqual(geometry.trackBottom);
        } else {
          expect(Math.abs(node.y - geometry.trackY), '点は横の線の上').toBeLessThanOrEqual(1);
        }
      }
    });
  }

  test('動き低減の設定では、線は最初から引き切られていて動かない', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await progress(page)).toEqual({ rail: 'none', line: '0px', highlight: expect.stringMatching(/^100% /) });
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test('文字の大きさ 200%（1440px）: 進め方は1列と縦の線に戻り、「目指す流れ」の番号は途中で折れない', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#process');
    const layout = () =>
      page.evaluate(() => {
        const track = document.querySelector('.step-rail-track')!.getBoundingClientRect();
        const steps = [...document.querySelectorAll('#process li')].map((li) => Math.round(li.getBoundingClientRect().left));
        const nodes = [...document.querySelectorAll('.step-rail-node')].map((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left + rect.width / 2;
        });
        const numbers = [...document.querySelectorAll('#about li > span')].map((span) => span.getClientRects().length);
        return {
          rail: track.height > track.width ? '縦' : '横',
          columns: new Set(steps).size,
          nodesOnTrack: nodes.every((x) => Math.abs(x - (track.left + track.width / 2)) <= 1),
          numberLines: numbers,
        };
      });
    expect(await layout()).toEqual({ rail: '横', columns: 4, nodesOnTrack: false, numberLines: [1, 1, 1] });
    await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%'));
    await expect.poll(layout).toEqual({ rail: '縦', columns: 1, nodesOnTrack: true, numberLines: [1, 1, 1] });
  });

  test('ANOMについての図は読み上げの対象外の装飾で、同じ内容を本文で読める', async ({ page }) => {
    await page.goto('/#about');
    const section = page.locator('#about');
    const figure = section.locator('.draw-on-scroll');
    await expect(figure).toHaveAttribute('aria-hidden', 'true');
    await expect(figure).toContainText('秋田');
    await expect(figure).toContainText('関東');
    await expect(section.locator('p').filter({ hasText: '秋田と関東の機会の差を小さくしたい。' })).toBeVisible();
    await expect(section.getByRole('listitem')).toHaveText(['01無駄を減らす', '02人や時間を活かす', '03売上の向上を目指す']);
  });
});

test.describe('お悩み別（開閉）', () => {
  const titles = ['同じ情報を、何度も書き写している。', '会社の魅力が、うまく伝わっていない。', '今のツールが、仕事に合っていない。'] as const;

  test('WAI のアコーディオン: 見出しの中のボタンで開閉し、先頭だけ開く。閉じた中身へは Tab で入らない', async ({ page }) => {
    await page.goto('/#challenges');
    const section = page.locator('#challenges');
    await expect(section.getByRole('button')).toHaveCount(3);
    for (const [index, title] of titles.entries()) {
      const button = section.getByRole('heading', { level: 3, name: title }).getByRole('button');
      await expect(button).toHaveAccessibleName(title);
      await expect(button).toHaveAttribute('aria-expanded', index === 0 ? 'true' : 'false');
      const panel = page.locator(`#${await button.getAttribute('aria-controls')}`);
      await expect(panel).toHaveAttribute('role', 'region');
      if (index === 0) await expect(panel.getByRole('link')).toBeVisible();
      else await expect(panel.getByRole('link')).toBeHidden();
    }
    await expect(section.getByRole('region', { name: titles[0] })).toContainText('できる支援');

    // Tab: 開いたパネルのリンクには入り、閉じたパネルのリンクは飛ばす
    const button = (index: 0 | 1 | 2) => section.getByRole('button', { name: titles[index] });
    await button(0).focus();
    await page.keyboard.press('Tab');
    await expect(section.getByRole('link', { name: 'AI・DX支援を見る' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(1)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(2)).toBeFocused();

    // Enter で開き、Space で閉じる
    await page.keyboard.press('Enter');
    await expect(button(2)).toHaveAttribute('aria-expanded', 'true');
    await expect(section.getByRole('link', { name: 'システム開発を見る' })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(button(2)).toHaveAttribute('aria-expanded', 'false');
    await expect(section.getByRole('link', { name: 'システム開発を見る' })).toBeHidden();

    // 連打しても、最後の状態と aria-expanded・表示が一致する（5回で開いた状態）
    for (let i = 0; i < 5; i += 1) await button(1).click({ noWaitAfter: true });
    await expect(button(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(section.getByRole('link', { name: 'Web制作・運用保守を見る' })).toBeVisible();
    // パネルのリンクで関連するサービスへ移る
    await section.getByRole('link', { name: 'Web制作・運用保守を見る' }).click();
    await expect(page).toHaveURL(/#service-web$/);
  });

  test('動き低減の設定: 開閉はすぐに完成した表示になる', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#challenges');
    const state = await page.evaluate(() => {
      const trigger = document.querySelector<HTMLButtonElement>('#challenges [data-accordion-trigger]:not([aria-expanded="true"])')!;
      trigger.click();
      const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
      return { rows: getComputedStyle(panel).gridTemplateRows, visibility: getComputedStyle(panel.firstElementChild!).visibility, animations: document.getAnimations().length };
    });
    expect(state.visibility).toBe('visible');
    expect(state.rows).not.toBe('0px');
    expect(state.animations).toBe(0);
  });
});

test.describe('装飾の動き', () => {
  test('時間差表示は装飾の絵だけ。本文は隠さず、絵は画面に入ると表示される', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(1000); // 冒頭の組み立てを終える
    // 透明になっているのは、読み上げ対象外の装飾だけ
    const hiddenContent = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((el) => getComputedStyle(el).opacity === '0' && !el.closest('[aria-hidden="true"]'))
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    expect(hiddenContent).toEqual([]);
    const group = page.locator('#examples [data-reveal]');
    await expect(group).toHaveAttribute('data-reveal', 'pending');
    await expect(page.locator('#examples ol').getByText('情報が、あちこちに散らばっている')).toHaveCSS('opacity', '1');
    await group.scrollIntoViewIfNeeded();
    await expect(group).toHaveAttribute('data-reveal', 'done');
    await expect(group.locator('[data-reveal-item]').last()).toHaveCSS('opacity', '1');
  });

  test('冒頭の組み立ては同じタブで1回だけ。再読み込みでは完成した図をすぐに表示する', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // ほかのページを先に開いても、トップの初回は組み立てを再生する
    await page.goto('/kitchen-sink/');
    await page.goto('/');
    const assembling = () =>
      page.evaluate(() => ({
        seen: document.documentElement.hasAttribute('data-hero-seen'),
        animations: [...document.querySelectorAll('.assemble')].flatMap((el) => el.getAnimations()).length,
      }));
    const first = await assembling();
    expect(first.seen).toBe(false);
    expect(first.animations).toBeGreaterThan(0);
    await page.reload();
    expect(await assembling()).toEqual({ seen: true, animations: 0 });
  });
});
