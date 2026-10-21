// 冒頭の画面デモの切替（WAI のタブの設計パターン・手動で選ぶ方式）。
// - Tab で選択中のタブへ入り、左右矢印でタブ間を移動、Home／End で先頭／末尾へ移動する
// - Enter／Space またはクリック・タップで表示を切り替える（矢印での移動だけでは切り替えない）
// - 選んでいないパネルは hidden（表示・読み上げ・Tab移動の対象外）。パネル自体は Tab で入れる
// - 自動では切り替えない。連打しても最後の選択だけが表示され、動きは待ち行列にならない
// HTML は最初から先頭が選ばれた見た目で出力しているため、このスクリプトの実行で表示は動かない。
for (const root of document.querySelectorAll<HTMLElement>('[data-demo-tabs]')) {
  const tablist = root.querySelector<HTMLElement>('[data-demo-tablist]');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-demo-tab]')];
  const panels = tabs.map((tab) => document.getElementById(tab.dataset['demoTab'] ?? ''));
  if (!tablist || tabs.length === 0 || panels.some((panel) => !panel)) continue;

  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', tablist.dataset['label'] ?? '');
  tabs.forEach((tab, index) => {
    const panel = panels[index] as HTMLElement;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
  });

  const select = (selected: number): void => {
    tabs.forEach((tab, index) => {
      const active = index === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.toggleAttribute('data-selected', active);
      (panels[index] as HTMLElement).hidden = !active;
    });
  };
  select(Math.max(0, tabs.findIndex((tab) => tab.hasAttribute('data-selected'))));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-selected') === 'true') return;
      // 利用者が切り替えたときだけ、短い切替の動きを付ける（初回の組み上がりは繰り返さない）
      root.setAttribute('data-demo-switched', '');
      select(index);
    });
  });

  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (current - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    tabs[next]?.focus();
  });
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
