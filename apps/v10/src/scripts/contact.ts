// 相談フォーム（確認版）の補助。送信・通信は一切行わない。
// 1. サービス欄の相談ボタン（a[data-consult-field]）: 通常どおり #contact へ移動しつつ、相談分野だけを設定する。
//    氏名・会社・メール・本文など、ほかの入力は変更しない。変更したことは見出し直後の状態文で伝える
// 2. スマホ幅でフォームの文字入力欄・選択欄にフォーカスしている間は、下部バーを一時的に隠す
//    （visibility で隠すため、Tab移動・読み上げの対象からも外れる。フォーカスが外れたら戻す）
// 3. 下部バーを表示したままの幅（タブレット・PC）で複数行の入力欄にフォーカスしたときは、欄の全体が
//    下部バーより上に見える位置へ移す（ブラウザーはカーソルの行だけを画面内に出すため、欄の下側がバーに隠れる）
const select = document.querySelector<HTMLSelectElement>('select[data-consult-select]');
const status = document.querySelector<HTMLElement>('[data-contact-status]');

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-consult-field]')) {
  link.addEventListener('click', () => {
    if (!select) return;
    const option = [...select.options].find((item) => item.value === link.dataset['consultField']);
    if (!option) return;
    select.value = option.value;
    if (status) status.textContent = (status.dataset['template'] ?? '').replace('{field}', option.text);
  });
}

const form = document.querySelector<HTMLElement>('[data-contact-form]');
const bar = document.querySelector<HTMLElement>('[data-bottom-nav]');

const isTypingField = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(form?.contains(target)) &&
  target.matches('input:not([type="checkbox"]):not([type="radio"]), select, textarea');

if (form && bar) {
  form.addEventListener('focusin', (event) => {
    if (isTypingField(event.target)) bar.setAttribute('data-input-active', '');
    if (event.target instanceof HTMLTextAreaElement && getComputedStyle(bar).visibility !== 'hidden') {
      // html の scroll-padding-bottom（下部バーの高さ＋余白）を差し引いた位置に収める
      event.target.scrollIntoView({ block: 'nearest' });
    }
  });
  form.addEventListener('focusout', (event) => {
    if (!isTypingField(event.relatedTarget)) bar.removeAttribute('data-input-active');
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
