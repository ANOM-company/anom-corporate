// モーダルの開閉。<dialog> の showModal() を使い、背面の操作とTab移動の閉じ込めはブラウザーに任せる。
// 閉じたときは、開く前にフォーカスしていた要素へ必ず戻す。
const openerOf = new WeakMap<HTMLDialogElement, HTMLElement>();

for (const trigger of document.querySelectorAll<HTMLElement>('[data-modal-open]')) {
  const dialog = document.getElementById(trigger.dataset['modalOpen'] ?? '');
  if (!(dialog instanceof HTMLDialogElement)) continue;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => {
    openerOf.set(dialog, trigger);
    dialog.showModal();
  });
}

for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[data-modal]')) {
  for (const button of dialog.querySelectorAll<HTMLElement>('[data-modal-close]')) {
    button.addEventListener('click', () => dialog.close());
  }
  // 背景（::backdrop）のクリックで閉じる
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Esc で閉じた場合も close イベントが発生する
  dialog.addEventListener('close', () => {
    openerOf.get(dialog)?.focus();
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
