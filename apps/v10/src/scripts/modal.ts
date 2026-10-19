// モーダル（展開メニューを含む）の開閉。<dialog> の showModal() を使い、背面の操作を止める処理はブラウザーに任せる。
// - モーダルが開いている間、背景のページ要素へはフォーカスが移らない
//   （最後の要素の次はブラウザーの操作部へ移ることがあり、そこから戻るとモーダルの先頭に戻る）
// - Esc・閉じるボタン・背景クリックで閉じたときは、開く前にフォーカスしていた要素へ戻す
// - モーダル内の同じページ内リンク（href="#..."）は、モーダルを閉じてから移動先へフォーカスを渡す
//   （移動先がセクションなど操作できない要素のときは、その中の最初の見出しへ）
// - 背景クリックは、背景で押して背景で離したときだけ閉じる（中から外へのドラッグでは閉じない）
// - 開いている間は背面のスクロールを止める。開閉ボタンに aria-expanded があれば状態を合わせる
// - 中に data-modal-focus を付けた要素があれば、開いたときにそこへフォーカスする
const openerOf = new WeakMap<HTMLDialogElement, HTMLElement>();
// 閉じた後にフォーカスを渡す移動先（ページ内リンクで閉じたときだけ設定する）
const destinationOf = new WeakMap<HTMLDialogElement, HTMLElement>();

const syncScrollLock = (): void => {
  document.documentElement.toggleAttribute('data-scroll-locked', document.querySelector('dialog[open]') !== null);
};

/** 移動先そのものか、操作できない要素ならその中の最初の見出し */
const focusTargetOf = (destination: HTMLElement): HTMLElement => {
  if (destination.matches('h1, h2, h3, h4, h5, h6') || destination.tabIndex >= 0) return destination;
  return destination.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? destination;
};

for (const trigger of document.querySelectorAll<HTMLElement>('[data-modal-open]')) {
  const dialog = document.getElementById(trigger.dataset['modalOpen'] ?? '');
  if (!(dialog instanceof HTMLDialogElement)) continue;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => {
    // 連続操作で二重に開いたり、背面のロックが重なったりしないようにする
    if (dialog.open) return;
    openerOf.set(dialog, trigger);
    destinationOf.delete(dialog);
    dialog.showModal();
    if (trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'true');
    syncScrollLock();
    dialog.querySelector<HTMLElement>('[data-modal-focus]')?.focus();
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

  // 背景（::backdrop）で押して、背景で離したときだけ閉じる
  let pressedOnBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => {
    pressedOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', (event) => {
    const fromBackdrop = pressedOnBackdrop && event.target === dialog;
    pressedOnBackdrop = false;
    if (fromBackdrop) dialog.close();
  });

  // Esc で閉じた場合も close イベントが発生する
  dialog.addEventListener('close', () => {
    // 閉じた直後に開き直された場合は、開いた側の状態を優先する
    if (dialog.open) return;
    const opener = openerOf.get(dialog);
    if (opener?.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'false');
    syncScrollLock();

    const destination = destinationOf.get(dialog);
    destinationOf.delete(dialog);
    if (!destination) {
      opener?.focus();
      return;
    }
    const focusTarget = focusTargetOf(destination);
    // 見出しなどフォーカスできない要素は、スクリプトからだけフォーカスできるようにする
    if (focusTarget.tabIndex < 0 && !focusTarget.hasAttribute('tabindex')) {
      focusTarget.setAttribute('tabindex', '-1');
    }
    history.pushState(null, '', `#${destination.id}`);
    focusTarget.focus({ preventScroll: true });
    destination.scrollIntoView({ block: 'start' });
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
