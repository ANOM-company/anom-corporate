// ヘッダーの動き。
// - ページ上部から離れたら背景を付ける
// - いま見ているセクションのメニュー項目に aria-current を付ける（PC）
// - スマホのメニュー（<dialog>）を開閉する。リンクを押したら閉じてから移動する

export function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  const onScroll = (): void => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // いま見ているセクション
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]')];
  const sections = links
    .map((link) => document.querySelector<HTMLElement>(link.hash))
    .filter((el): el is HTMLElement => el !== null);
  const visible = new Map<HTMLElement, boolean>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) visible.set(entry.target as HTMLElement, entry.isIntersecting);
      const current = sections.find((section) => visible.get(section));
      for (const link of links) {
        if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const section of sections) observer.observe(section);

  // スマホのメニュー
  const dialog = document.querySelector<HTMLDialogElement>('[data-menu]');
  const opener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !opener) return;
  opener.hidden = false;
  opener.addEventListener('click', () => {
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => opener.setAttribute('aria-expanded', 'false'));
  opener.setAttribute('aria-expanded', 'false');

  for (const link of dialog.querySelectorAll<HTMLAnchorElement>('[data-menu-link]')) {
    link.addEventListener('click', (event) => {
      const target = document.querySelector<HTMLElement>(link.hash);
      if (!target) return;
      event.preventDefault();
      dialog.close();
      // 閉じたあと（フォーカスがボタンに戻ったあと）に移動し、移動先へフォーカスを移す
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'start' });
        try {
          history.pushState(null, '', link.hash);
        } catch {
          // 埋め込み表示などで履歴を書き換えられない環境でも、移動とフォーカスは続ける
        }
        focusTarget(target);
      });
    });
  }

  // closedby="any" に未対応のブラウザーでも、背景を押したら閉じる
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (event: PointerEvent): boolean => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
      );
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (event) => {
      pressedOutside = outside(event);
    });
    dialog.addEventListener('pointerup', (event) => {
      if (pressedOutside && outside(event)) dialog.close();
    });
  }
}

/** 移動先の見出しなどへフォーカスを移す（読み上げの位置も合わせる） */
export function focusTarget(target: HTMLElement): void {
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
