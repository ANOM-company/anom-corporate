// サービスの動くイラスト（ServiceVisual）を、画面外にある間は止める（電池と処理の節約）。
export function initVisualPause(): void {
  const visuals = [...document.querySelectorAll<SVGSVGElement>('[data-visual]')];
  if (visuals.length === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
    },
    { rootMargin: '120px 0px' },
  );
  for (const visual of visuals) {
    visual.classList.add('is-offscreen');
    observer.observe(visual);
  }
}
