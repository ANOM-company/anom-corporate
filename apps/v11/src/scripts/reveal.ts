// スクロールで要素が現れる演出（[data-reveal]）。
// - 読み込み時に画面外にある要素だけを一度隠し（.is-pending）、画面に入ったら表示する（.is-shown）
//   最初から見えている要素は隠さないので、ちらつかない
// - [data-reveal-group] の子は少しずつ遅らせて出す。[data-split] は中の1文字ずつ（.q-ch）を遅らせる
// - 動きを減らす設定・一時停止中は何もしない（すべて最初から表示）
import { isPaused } from './motion';

export function initReveal(): void {
  if (isPaused()) return;

  for (const group of document.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
    [...group.querySelectorAll<HTMLElement>(':scope > [data-reveal]')].forEach((el, i) => {
      el.style.setProperty('--reveal-i', String(i));
    });
  }
  for (const split of document.querySelectorAll<HTMLElement>('[data-split]')) {
    [...split.querySelectorAll<HTMLElement>('.q-ch')].forEach((ch, i) => ch.style.setProperty('--i', String(i)));
  }

  const viewport = window.innerHeight;
  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter(
    (el) => el.getBoundingClientRect().top > viewport * 0.92,
  );
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add('is-shown');
        el.classList.remove('is-pending');
        observer.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  for (const el of targets) {
    el.classList.add('is-pending');
    observer.observe(el);
  }

  // 一時停止されたら、まだ隠れている要素もすぐに表示する
  document.addEventListener('motion:paused', () => {
    for (const el of targets) {
      el.classList.remove('is-pending');
      el.classList.add('is-shown');
    }
  });
}
