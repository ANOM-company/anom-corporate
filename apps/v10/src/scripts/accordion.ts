// お悩み別の開閉（WAI のアコーディオンの設計パターン）。
// - JavaScript が使えるときだけ、見出しの文字を開閉ボタン（button）に置き換える（無効時はすべて開いたまま）
// - 初期表示は先頭だけを開く。button の aria-expanded とパネルの data-collapsed を、操作のたびに同時に書き換える
//   （連打しても、最後の状態と aria-expanded が一致する）
// - 閉じたパネルの中身は CSS で visibility: hidden になり、Tab 移動・読み上げの対象から外れる（global.css の .accordion-panel）
// - 開閉の動きは、初期の状態を決めた後にだけ付ける（読み込み時に閉じる動きを見せない）
for (const root of document.querySelectorAll<HTMLElement>('[data-accordion]')) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-accordion-item]')];
  items.forEach((item, index) => {
    const trigger = item.querySelector<HTMLButtonElement>('[data-accordion-trigger]');
    const label = item.querySelector<HTMLElement>('[data-accordion-static]');
    const panel = document.getElementById(trigger?.getAttribute('aria-controls') ?? '');
    if (!trigger || !label || !panel) return;

    const set = (open: boolean): void => {
      trigger.setAttribute('aria-expanded', String(open));
      panel.toggleAttribute('data-collapsed', !open);
    };
    trigger.hidden = false;
    label.hidden = true;
    set(index === 0);
    trigger.addEventListener('click', () => set(trigger.getAttribute('aria-expanded') !== 'true'));
  });
  // 次の描画から開閉の動きを有効にする
  requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute('data-accordion-ready', '')));
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
