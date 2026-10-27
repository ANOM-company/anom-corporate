// サービス欄の動き。
// - 各カードの詳細を開閉する（JavaScript 無効時は最初から開いている）
// - 「サービスの詳細をすべて見る」で4つまとめて開閉する
// - ページ内検索で詳細の文字が見つかったときは自動で開く（hidden="until-found" 対応ブラウザー）
// - カーソルの位置にカードの光を合わせる（マウスのみ）
// - ファーストビューのカードなどからサービスへ移動したときは、そのサービスの詳細を開いておく

export function initServices(): void {
  const cards = [...document.querySelectorAll<HTMLElement>('[data-svc]')];
  const all = document.querySelector<HTMLButtonElement>('[data-expand-all]');
  const allLabel = all?.querySelector<HTMLElement>('[data-expand-all-label]');
  const toggles: { card: HTMLElement; button: HTMLButtonElement; panel: HTMLElement; label: HTMLElement | null; name: string }[] = [];

  for (const card of cards) {
    const button = card.querySelector<HTMLButtonElement>('[data-svc-toggle]');
    const panel = card.querySelector<HTMLElement>('[data-svc-detail]');
    if (!button || !panel) continue;
    const label = button.querySelector<HTMLElement>('[data-svc-toggle-label]');
    const name = card.querySelector('h3')?.textContent?.trim() ?? '';
    toggles.push({ card, button, panel, label, name });
    button.hidden = false;
    setOpen(button, panel, label, name, false);
    button.addEventListener('click', () => {
      setOpen(button, panel, label, name, button.getAttribute('aria-expanded') !== 'true');
      syncAll();
    });
    panel.addEventListener('beforematch', () => {
      setOpen(button, panel, label, name, true);
      syncAll();
    });
  }

  if (all && toggles.length > 0) {
    all.hidden = false;
    all.addEventListener('click', () => {
      const open = all.getAttribute('aria-expanded') !== 'true';
      for (const t of toggles) setOpen(t.button, t.panel, t.label, t.name, open);
      syncAll();
    });
  }

  // ページ内リンク（#service-…）で来たサービスは、詳細を開いた状態で見せる
  const openById = (id: string): void => {
    const t = toggles.find((item) => item.card.id === id);
    if (!t) return;
    setOpen(t.button, t.panel, t.label, t.name, true);
    syncAll();
  };
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (link) openById(link.hash.slice(1));
  });
  window.addEventListener('hashchange', () => openById(location.hash.slice(1)));
  if (location.hash) openById(location.hash.slice(1));

  function syncAll(): void {
    if (!all || !allLabel) return;
    const allOpen = toggles.every((t) => t.button.getAttribute('aria-expanded') === 'true');
    all.setAttribute('aria-expanded', String(allOpen));
    allLabel.textContent = (allOpen ? all.dataset['labelClose'] : all.dataset['labelOpen']) ?? '';
  }

  // カードの光
  if (window.matchMedia('(pointer: fine)').matches) {
    for (const card of cards) {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    }
  }
}

function setOpen(button: HTMLButtonElement, panel: HTMLElement, label: HTMLElement | null, name: string, open: boolean): void {
  button.setAttribute('aria-expanded', String(open));
  if (open) panel.removeAttribute('hidden');
  else panel.setAttribute('hidden', 'until-found');
  if (label) label.textContent = `${name}を${(open ? label.dataset['close'] : label.dataset['open']) ?? ''}`;
}
