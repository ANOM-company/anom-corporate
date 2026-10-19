// 操作の確認: ナビゲーション・モーダル・FAQ・フォーム・Tab移動とフォーカス表示。
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

test.describe('ナビゲーション', () => {
  test('スマホ幅: メニューを開閉でき、Escで閉じるとメニューボタンへ戻る', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'メイン' });
    const menuButton = nav.locator('summary', { hasText: 'メニュー' });
    const mobileLink = nav.locator('details').getByRole('link', { name: '部品の確認画面' });

    await expect(menuButton).toBeVisible();
    await expect(mobileLink).toBeHidden();

    await menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(mobileLink).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(mobileLink).toBeHidden();
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await mobileLink.click();
    await expect(page).toHaveURL('/kitchen-sink/');
    await expect(page.getByRole('heading', { level: 1, name: '部品の確認画面' })).toBeVisible();
  });

  test('PC幅: リンクが常に表示され、現在のページが示される', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/kitchen-sink/');
    const nav = page.getByRole('navigation', { name: 'メイン' });
    await expect(nav.locator('summary')).toBeHidden();
    const current = nav.getByRole('link', { name: '部品の確認画面' });
    await expect(current).toBeVisible();
    await expect(current).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'はじめに' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('モーダル', () => {
  type FocusState = { index: number; isBody: boolean; label: string };

  /** 現在のフォーカスが、モーダル内の何番目の要素か（-1 = モーダル外）。body/なし は isBody */
  async function focusState(page: Page): Promise<FocusState> {
    return page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      const items = dialog
        ? [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, summary')]
        : [];
      const active = document.activeElement;
      return {
        index: active ? items.indexOf(active as HTMLElement) : -1,
        isBody: !active || active === document.body,
        label: active ? `${active.tagName.toLowerCase()} "${(active.textContent ?? '').trim().slice(0, 20)}"` : '(なし)',
      };
    });
  }

  /**
   * Tab（または Shift+Tab）を繰り返し、次を確かめる。
   * - 背景のページ要素へは一度もフォーカスが移らない
   * - body になる（= ブラウザーの操作部へ出た）のは、端の要素の直後だけで、次の操作で反対側の端へ戻る
   * - モーダル内の操作可能な要素をすべて通る
   */
  async function walk(page: Page, key: 'Tab' | 'Shift+Tab', count: number): Promise<void> {
    const total = await page.evaluate(
      () =>
        document
          .querySelector('dialog[open]')
          ?.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, summary').length ?? 0,
    );
    expect(total).toBeGreaterThanOrEqual(2);
    const forward = key === 'Tab';
    const edgeBefore = forward ? total - 1 : 0;
    const edgeAfter = forward ? 0 : total - 1;
    const visited = new Set<number>();
    let previous = await focusState(page);
    expect(previous.index, `開始位置: ${previous.label}`).toBeGreaterThanOrEqual(0);
    visited.add(previous.index);

    for (let i = 0; i < count; i += 1) {
      await page.keyboard.press(key);
      const current = await focusState(page);
      const step = `${key} ${i + 1} 回目: ${previous.label} → ${current.label}`;
      if (current.isBody) {
        // ブラウザーの操作部へ出るのは、端の要素からだけ
        expect(previous.index, step).toBe(edgeBefore);
      } else {
        expect(current.index, `背景のページ要素へ移っていないこと ${step}`).toBeGreaterThanOrEqual(0);
        if (previous.isBody) {
          // ブラウザーの操作部から戻ると、モーダルの反対側の端へ戻る
          expect(current.index, step).toBe(edgeAfter);
        } else {
          const expected = forward ? (previous.index + 1) % total : (previous.index - 1 + total) % total;
          expect(current.index, step).toBe(expected);
        }
        visited.add(current.index);
      }
      previous = current;
    }
    expect(visited.size, 'モーダル内の要素をすべて通ること').toBe(total);
    // 最後はモーダル内に戻っている
    if (previous.isBody) await page.keyboard.press(key);
    expect((await focusState(page)).index).toBeGreaterThanOrEqual(0);
  }

  test('Tab・Shift+Tabで背景のページ要素へフォーカスが移らず、Escで開くボタンへ戻る', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const trigger = page.getByRole('button', { name: 'モーダルを開く' });
    const dialog = page.getByRole('dialog', { name: 'モーダルの見本' });

    await expect(dialog).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();

    await walk(page, 'Tab', 7);
    await walk(page, 'Shift+Tab', 7);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('「閉じる」ボタンと背景クリックで閉じ、フォーカスが戻る', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const trigger = page.getByRole('button', { name: 'モーダルを開く' });
    const dialog = page.getByRole('dialog', { name: 'モーダルの見本' });

    await trigger.click();
    await dialog.getByRole('button', { name: '閉じる' }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test.describe('モーダル内のページ内リンク', () => {
    async function expectMovedToFaq(page: Page): Promise<void> {
      const dialog = page.locator('#ks-dialog');
      await expect(dialog).toBeHidden();
      expect(await dialog.evaluate((el) => (el as HTMLDialogElement).open)).toBe(false);
      await expect(page).toHaveURL(/#ks-faq-title$/);
      const heading = page.getByRole('heading', { level: 2, name: 'FAQ（よくある質問）' });
      await expect(heading).toBeFocused();
      await expect(heading).toBeInViewport();
    }

    test('キーボード: リンクでモーダルを閉じ、FAQ見出しへ移り、続けてFAQを開閉できる', async ({ page }) => {
      await page.goto('/kitchen-sink/');
      const trigger = page.getByRole('button', { name: 'モーダルを開く' });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const link = page.getByRole('dialog').getByRole('link', { name: 'よくある質問の見本へ' });
      await link.focus();
      await page.keyboard.press('Enter');
      await expectMovedToFaq(page);

      // 見出しの次の Tab で最初の質問へ進み、Enter で開閉できる
      await page.keyboard.press('Tab');
      const firstItem = page.locator('#ks-faq [data-faq-item]').first();
      await expect(firstItem.locator('summary')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(firstItem).toHaveAttribute('open');
      await page.keyboard.press('Enter');
      await expect(firstItem).not.toHaveAttribute('open');
    });

    test('マウス: リンクでモーダルを閉じ、FAQ見出しへ移り、FAQを開ける。その後のEscでは開くボタンへ戻る', async ({ page }) => {
      await page.goto('/kitchen-sink/');
      const trigger = page.getByRole('button', { name: 'モーダルを開く' });
      await trigger.click();
      await page.getByRole('dialog').getByRole('link', { name: 'よくある質問の見本へ' }).click();
      await expectMovedToFaq(page);

      const firstItem = page.locator('#ks-faq [data-faq-item]').first();
      await firstItem.locator('summary').click();
      await expect(firstItem).toHaveAttribute('open');

      // リンクで閉じた後も、通常の閉じ方では従来どおり開くボタンへ戻る
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'モーダルの見本' });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  });
});

test.describe('FAQ', () => {
  test('details/summary で構成され、キーボードで開閉できる', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('[data-faq-item]');
    await expect(items).toHaveCount(3);
    const first = items.first();
    const summary = first.locator('summary');
    await expect(first).not.toHaveAttribute('open');

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('open');
    await expect(first.getByText('サイト制作の土台')).toBeVisible();

    await page.keyboard.press('Space');
    await expect(first).not.toHaveAttribute('open');
  });
});

test.describe('フォームの見本', () => {
  test('ラベルと補足が結び付き、静的なエラー状態が読み上げ対象になっている', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    await expect(page.getByLabel('お名前')).toHaveAttribute('required');
    await expect(page.getByLabel('メールアドレス')).toHaveAccessibleDescription(/見本のため/);
    await expect(page.getByLabel('内容')).toBeVisible();
    const errorField = page.getByLabel('エラー状態の入力欄');
    await expect(errorField).toHaveAttribute('aria-invalid', 'true');
    await expect(errorField).toHaveAccessibleDescription(/形式が正しくありません/);
    await expect(page.getByText('入力内容はどこにも送信されません')).toBeVisible();
  });

  test('エラー表示と案内を出し、どこにも送信しない', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const sent: string[] = [];
    page.on('request', (request) => {
      // ページ移動・送信・通信（fetch/XHR）だけを数える（画像などの遅延読み込みは除く）
      if (['document', 'fetch', 'xhr', 'ping'].includes(request.resourceType()) || request.method() !== 'GET') {
        sent.push(`${request.method()} ${request.url()}`);
      }
    });
    const url = page.url();
    const name = page.getByLabel('お名前');
    const email = page.getByLabel('メールアドレス');
    const submit = page.getByRole('button', { name: '入力内容を確認する（送信しません）' });
    const status = page.getByRole('status');

    await submit.click();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('入力してください。');
    await expect(name).toBeFocused();
    await expect(status).toContainText('エラーがあります');

    await name.fill('見本 太郎');
    await email.fill('not-an-email');
    await submit.click();
    await expect(name).not.toHaveAttribute('aria-invalid');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription(/形式が正しくありません/);

    await email.fill('name@example.com');
    await submit.click();
    await expect(email).not.toHaveAttribute('aria-invalid');
    await expect(status).toHaveText('入力内容に問題はありません。これは見本のため、送信は行われません。');

    expect(page.url()).toBe(url);
    expect(sent, 'フォーム操作でリクエストが発生しないこと').toEqual([]);
  });
});

test.describe('Tab移動とフォーカス', () => {
  test('最初のTabで「本文へ移動」が見え、Enterで本文へ移る', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: '本文へ移動' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('Tabで移動した要素すべてにフォーカス表示がある', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/kitchen-sink/');
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return {
          label: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 20)}" ${el.id}`,
          outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
          disabled: el.matches(':disabled'),
        };
      });
      if (!info) continue;
      seen.add(info.label);
      expect(info.outline, `フォーカス表示: ${info.label}`).toBe(true);
      expect(info.disabled, `無効な要素にフォーカスしない: ${info.label}`).toBe(false);
    }
    expect(seen.size).toBeGreaterThan(15);
  });
});
