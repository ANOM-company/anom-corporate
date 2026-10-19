// モーダルの開閉。<dialog> の showModal() を使い、背面の操作を止める処理はブラウザーに任せる。
// - モーダルが開いている間、背景のページ要素へはフォーカスが移らない
//   （最後の要素の次はブラウザーの操作部へ移ることがあり、そこから戻るとモーダルの先頭に戻る）
// - Esc・閉じるボタン・背景クリックで閉じたときは、開く前にフォーカスしていた要素へ戻す
// - モーダル内の同じページ内リンク（href="#..."）は、モーダルを閉じてから移動先へフォーカスを渡す
const openerOf = new WeakMap<HTMLDialogElement, HTMLElement>();
// 閉じた後にフォーカスを渡す移動先（ページ内リンクで閉じたときだけ設定する）
const destinationOf = new WeakMap<HTMLDialogElement, HTMLElement>();

for (const trigger of document.querySelectorAll<HTMLElement>('[data-modal-open]')) {
  const dialog = document.getElementById(trigger.dataset['modalOpen'] ?? '');
  if (!(dialog instanceof HTMLDialogElement)) continue;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => {
    openerOf.set(dialog, trigger);
    destinationOf.delete(dialog);
    dialog.showModal();
  });
}

for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[data-modal]')) {
  for (const button of dialog.querySelectorAll<HTMLElement>('[data-modal-close]')) {
    button.addEventListener('click', () => dialog.close());
  }

  // ページ内リンク: 背面の要素はモーダル表示中は操作できないため、先に閉じてから移動する
  for (const link of dialog.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!target || dialog.contains(target)) return;
      event.preventDefault();
      destinationOf.set(dialog, target);
      dialog.close();
    });
  }

  // 背景（::backdrop）のクリックで閉じる
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Esc で閉じた場合も close イベントが発生する
  dialog.addEventListener('close', () => {
    const destination = destinationOf.get(dialog);
    destinationOf.delete(dialog);
    if (!destination) {
      openerOf.get(dialog)?.focus();
      return;
    }
    // 見出しなどフォーカスできない要素は、スクリプトからだけフォーカスできるようにする
    if (destination.tabIndex < 0 && !destination.hasAttribute('tabindex')) {
      destination.setAttribute('tabindex', '-1');
    }
    history.pushState(null, '', `#${destination.id}`);
    destination.focus();
    destination.scrollIntoView({ block: 'start' });
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
