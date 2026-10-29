// スマホ用メニュー（<details>）の補助。開閉そのものは HTML だけで動く。
// ここでは Esc で閉じてメニューボタンへフォーカスを戻す操作だけを足す。
for (const menu of document.querySelectorAll<HTMLDetailsElement>('[data-nav-menu]')) {
  const summary = menu.querySelector('summary');
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      summary?.focus();
    }
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
