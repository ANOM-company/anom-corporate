// 操作の確認: ナビゲーション・モーダル・FAQ・フォーム・Tab移動とフォーカス表示。
import { test, expect, describeFocus } from './fixtures';

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
  test('キーボードで開き、Tabは内側に留まり、Escで閉じてフォーカスが戻る', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const trigger = page.getByRole('button', { name: 'モーダルを開く' });
    const dialog = page.getByRole('dialog', { name: 'モーダルの見本' });

    await expect(dialog).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 6; i += 1) {
      const inside = await page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('dialog[open]');
        // 最後の要素の次はブラウザーUIへ抜けることがある（body扱い）が、背面の要素には移らない
        return active === document.body || Boolean(modal?.contains(active));
      });
      expect(inside, `Tab ${i} 回目: ${await describeFocus(page)}`).toBe(true);
      await page.keyboard.press('Tab');
    }

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
