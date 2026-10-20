// 下部バーの補助。
// 1. JavaScript が使えるときだけ、「メニュー」をフッターへのリンクから展開メニューを開くボタンに置き換える
//    （開閉・フォーカス制御は src/scripts/modal.ts。リンクとボタンは同じ見た目なので表示は動かない）
// 2. バーの実際の高さを --bar-height に反映する。文字拡大などでバーが伸びても、本文・フッターの下の余白と
//    フォーカス時のスクロール位置（scroll-padding-bottom）がバーの高さに追従する
for (const bar of document.querySelectorAll<HTMLElement>('[data-bottom-nav]')) {
  const fallback = bar.querySelector<HTMLElement>('[data-menu-fallback]');
  const button = bar.querySelector<HTMLButtonElement>('[data-menu-button]');
  const dialog = document.getElementById(button?.dataset['modalOpen'] ?? '');
  if (fallback && button && dialog instanceof HTMLDialogElement) {
    button.hidden = false;
    fallback.hidden = true;
  }

  const update = (): void => {
    // スタイル属性は使わず、CSSOM で変数だけを書き換える（CSP の style-src 'self' のまま動く）
    document.documentElement.style.setProperty('--bar-height', `${Math.ceil(bar.getBoundingClientRect().height)}px`);
  };
  update();
  new ResizeObserver(update).observe(bar);
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
