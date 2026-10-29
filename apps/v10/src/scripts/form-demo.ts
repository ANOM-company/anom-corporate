// 入力フォームの「見本」用。送信は一切行わない（fetch・メール送信なし）。
// 送信ボタンを押すと入力内容を確認し、エラー表示または「送信されません」の案内を出すだけ。
const messages = {
  valueMissing: '入力してください。',
  typeMismatch: '形式が正しくありません（例: name@example.com）。',
} as const;

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-demo-form]')) {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  form.noValidate = true;

  form.addEventListener('submit', (event) => {
    // 見本なので、どの場合も送信を止める
    event.preventDefault();
    let firstInvalid: HTMLInputElement | HTMLTextAreaElement | null = null;

    for (const field of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
      const error = document.getElementById(`${field.id}-error`);
      const message = field.validity.valueMissing
        ? messages.valueMissing
        : field.validity.typeMismatch
          ? messages.typeMismatch
          : '';
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        firstInvalid ??= field;
      } else {
        field.removeAttribute('aria-invalid');
      }
      if (error) error.textContent = message;
    }

    if (status) {
      status.textContent = firstInvalid
        ? '入力内容にエラーがあります。各項目のメッセージを確認してください。'
        : '入力内容に問題はありません。これは見本のため、送信は行われません。';
    }
    firstInvalid?.focus();
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
