// 時間差表示（Staggered Reveal）: 装飾の部品だけを、画面に入ったとき1回、順に少し現れさせる。
// - 対象は [data-reveal] の中の [data-reveal-item]（説明図・画面の絵など。本文は対象にしない）
// - 読み込み時にすでに画面内にあるものは、そのまま表示する（表示中の部品を一度隠すちらつきを作らない）
// - 動き低減の設定・IntersectionObserver が使えない環境では何もしない（最初から完成した状態のまま）
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const groups = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];

if (!reduce && 'IntersectionObserver' in window && groups.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const group = entry.target as HTMLElement;
        group.dataset['reveal'] = 'done';
        observer.unobserve(group);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  const viewport = window.innerHeight;
  for (const group of groups) {
    const rect = group.getBoundingClientRect();
    // 画面の下より先にあるものだけを隠して待つ
    if (rect.top > viewport) {
      group.dataset['reveal'] = 'pending';
      observer.observe(group);
    }
  }
}

// このファイルをモジュールとして扱う（グローバル変数と名前が衝突しないように）
export {};
