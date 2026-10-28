// お問い合わせフォーム（確認用のため、どこにも送信しない）。
// - 空のまま送ると、最初の誤りの欄へ移り、誤りの説明が表示され、aria-invalid が付く
// - 入力を終えた時点（欄を離れたとき）で誤りを表示し、直すと消える
// - 正しく入力して送ると「確認できました（実際には送信していません）」が出て、通信は一切起きない
// - ファーストビューで自分で選んだ悩みは、フォームで最初から選ばれる（見本の初期選択は引き継がない）
// - 「無料で相談する」はお名前の欄へ移動する
import { test, expect, trackSends, worryMap, initial, chip } from './fixtures';
import { contact } from '../src/data/site';

test.describe('お問い合わせフォーム', () => {
  // 漂うチップを通常のクリックで押すため、動きを減らす設定で行う（hero.spec.ts 参照）
  test.use({ reducedMotion: 'reduce' });

  test('空のまま送ると、お名前の欄へ移り、誤りが表示される', async ({ page }) => {
    await page.goto('/');
    const submit = page.locator('[data-submit]');
    await expect(submit).toBeEnabled();
    await submit.click();
    const name = page.locator('#contact-name');
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-name-error')).toBeVisible();
    await expect(page.locator('#contact-name-error')).toHaveText(contact.fields.name.error);
    await expect(page.locator('#contact-email-error')).toBeVisible();
    await expect(page.locator('[data-form-status]')).toHaveText('');
    // 任意の欄には誤りを付けない
    await expect(page.locator('#contact-company')).not.toHaveAttribute('aria-invalid');
  });

  test('欄を離れた時点で誤りを表示し、直すと消える', async ({ page }) => {
    await page.goto('/');
    const email = page.locator('#contact-email');
    const error = page.locator('#contact-email-error');
    await expect(error).toBeHidden();
    await email.fill('taro');
    await expect(error).toBeHidden();
    await email.blur();
    await expect(error).toBeVisible();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await email.fill('taro@example.com');
    await expect(error).toBeHidden();
    await expect(email).not.toHaveAttribute('aria-invalid');
  });

  test('正しく入力して送ると確認の表示が出て、通信は起きない', async ({ page }) => {
    await page.goto('/');
    const sent = trackSends(page);
    await page.locator('#contact-name').fill('山田 太郎');
    await page.locator('#contact-email').fill('taro@example.com');
    await page.locator('#contact-message').fill('確認のテストです。');
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-form-status]')).toHaveText(contact.previewDone);
    await expect(page).toHaveURL(/\/$/);
    expect(sent).toEqual([]);
    // 送信先の指定がない（CSP の form-action 'none' と二重の守り）
    await expect(page.locator('[data-contact-form]')).not.toHaveAttribute('action');
  });

  test('自分で選んだ悩みだけが、フォームで最初から選ばれる', async ({ page }) => {
    await page.goto('/');
    const pill = (label: string) => page.locator(`input[name="worries"][value="${label}"]`);
    // 見本の初期選択は引き継がない
    await expect(pill(initial.label)).not.toBeChecked();
    await expect(page.locator('input[name="worries"]:checked')).toHaveCount(0);

    const first = worryMap.find((w) => w.id === 'documents')!;
    await chip(page, first.id).click();
    await expect(pill(first.label)).toBeChecked();
    await expect(page.locator('[data-worry-hint]')).toBeVisible();

    // 選び直すと入れ替わる
    const second = worryMap.find((w) => w.id === 'staffing')!;
    await chip(page, second.id).click();
    await expect(pill(second.label)).toBeChecked();
    await expect(pill(first.label)).not.toBeChecked();

    // フォームで自分で選んだあとは、上の選択で書き換えない
    await pill(first.label).check();
    const third = worryMap.find((w) => w.id === 'complex')!;
    await chip(page, third.id).click();
    await expect(pill(third.label)).not.toBeChecked();
    await expect(pill(first.label)).toBeChecked();
    await expect(pill(second.label)).toBeChecked();
  });

  test('悩みの選択肢に重複がなく、どのチップの悩みも選べる', async ({ page }) => {
    await page.goto('/');
    const values = await page.locator('input[name="worries"]').evaluateAll((els) =>
      els.map((el) => (el as HTMLInputElement).value),
    );
    expect(new Set(values).size).toBe(values.length);
    for (const worry of worryMap) expect(values).toContain(worry.label);
  });

  test('「無料で相談する」でお名前の欄へ移動する', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-focus-name]').click();
    await expect(page.locator('#contact-name')).toBeFocused();
    await expect(page.locator('#contact-name')).toBeInViewport();
  });
});
