// 操作の確認: ヘッダー型ナビゲーションの見本・モーダル・FAQ・フォームの見本・Tab移動とフォーカス表示。
// （V10 の下部バー・展開メニューは menu.spec.ts、トップの各機能は home.spec.ts）
import type { Page } from '@playwright/test';
import { test, expect, trackSends, walkDialog } from './fixtures';

// ヘッダー型ナビゲーションは、V10 のトップでは下部バーに置き換えたため、部品の確認画面の見本で確かめる
test.describe('ナビゲーション（ヘッダー型の部品見本）', () => {
  test('スマホ幅: メニューを開閉でき、Escで閉じるとメニューボタンへ戻る', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/kitchen-sink/');
    const nav = page.getByRole('navigation', { name: 'ナビゲーションの見本' });
    const menuButton = nav.locator('summary', { hasText: 'メニュー' });
    const mobileLink = nav.locator('details').getByRole('link', { name: 'トップ' });

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
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: '技術を、仕事の力に。' })).toBeVisible();
  });

  test('PC幅: リンクが常に表示され、現在のページが示される', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/kitchen-sink/');
    const nav = page.getByRole('navigation', { name: 'ナビゲーションの見本' });
    await expect(nav.locator('summary')).toBeHidden();
    const current = nav.getByRole('link', { name: '部品の確認画面' }).first();
    await expect(current).toBeVisible();
    await expect(current).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'トップ' }).first().click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('モーダル', () => {
  test('Tab・Shift+Tabで背景のページ要素へフォーカスが移らず、Escで開くボタンへ戻る', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const trigger = page.getByRole('button', { name: 'モーダルを開く' });
    const dialog = page.getByRole('dialog', { name: 'モーダルの見本' });

    await expect(dialog).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();

    await walkDialog(page, 'Tab', 7);
    await walkDialog(page, 'Shift+Tab', 7);

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

// FAQ はトップから外したため、部品の確認画面の見本で確かめる
test.describe('FAQ', () => {
  test('details/summary で構成され、キーボードで開閉できる', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const items = page.locator('#ks-faq [data-faq-item]');
    await expect(items).toHaveCount(2);
    const first = items.first();
    const summary = first.locator('summary');
    await expect(first).not.toHaveAttribute('open');

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('open');
    await expect(first.getByText('回答の見本です')).toBeVisible();

    await page.keyboard.press('Space');
    await expect(first).not.toHaveAttribute('open');
  });
});

test.describe('フォームの見本', () => {
  test('ラベルと補足が結び付き、静的なエラー状態が読み上げ対象になっている', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    await expect(page.getByLabel('お名前')).toHaveAttribute('required');
    await expect(page.getByLabel('メールアドレス')).toHaveAccessibleDescription(/見本のため/);
    await expect(page.getByLabel('内容', { exact: true })).toBeVisible();
    const errorField = page.getByLabel('エラー状態の入力欄');
    await expect(errorField).toHaveAttribute('aria-invalid', 'true');
    await expect(errorField).toHaveAccessibleDescription(/形式が正しくありません/);
    // 部品の確認画面には同じ趣旨の注記が2つ（入力の見本・表示見本）あるため、入力の見本の注記を指定する
    await expect(page.getByText('このフォームは入力とエラー表示の見本です。送信ボタンを押しても、入力内容はどこにも送信されません。')).toBeVisible();
  });

  test('エラー表示と案内を出し、どこにも送信しない', async ({ page }) => {
    await page.goto('/kitchen-sink/');
    const sent = trackSends(page);
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

  for (const path of ['/', '/kitchen-sink/']) {
    test(`${path}: Tabで移動した要素すべてにフォーカス表示がある`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      const seen = new Set<string>();
      for (let i = 0; i < 60; i += 1) {
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
  }
});
