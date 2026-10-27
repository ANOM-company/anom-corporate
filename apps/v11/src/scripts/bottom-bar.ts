// 画面下の相談バー。
// - ファーストビューの相談ボタンが見えている間と、お問い合わせ欄が見えている間は隠す
// - 隠している間は inert を付けて、Tab キーで見えないボタンへ移動しないようにする

export function initBottomBar(): void {
  const bar = document.querySelector<HTMLElement>('[data-bottom-bar]');
  const heroCtas = document.querySelector<HTMLElement>('.hero__ctas');
  const contact = document.querySelector<HTMLElement>('#contact');
  if (!bar || !heroCtas || !contact) return;

  const state = { hero: true, contact: false };
  const update = (): void => {
    const hide = state.hero || state.contact;
    bar.classList.toggle('is-hidden', hide);
    bar.inert = hide;
  };

  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        state.hero = entry.isIntersecting;
      }
      update();
    },
    { threshold: 0 },
  ).observe(heroCtas);

  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) state.contact = entry.isIntersecting;
      update();
    },
    { rootMargin: '0px 0px -30% 0px' },
  ).observe(contact);

  update();
}
