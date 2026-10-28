// ヒーローの「考える横顔」の形。canvas の粒子演出（hero-canvas.ts）と、
// JavaScript 無効時・読み込み前に出す SVG（Hero.astro）の両方がこの形を使う。
// 座標は幅100×高さ120の箱の中の値。左を向き、少し上を見上げている横顔。

export const PROFILE_BOX = { width: 100, height: 120 } as const;

export const PROFILE: readonly (readonly [number, number])[] = [
  [50, 6], // 頭頂
  [38, 8.5],
  [30, 13.5],
  [27, 19.5], // 額
  [24.5, 27.5], // 眉
  [25.5, 31.5], // 鼻の付け根
  [21.5, 36.5],
  [18.5, 40], // 鼻先
  [23.5, 42.2], // 鼻の下
  [23, 45], // 上唇
  [25, 46.8],
  [23.6, 48.6], // 下唇
  [25.8, 51.2],
  [24.6, 54.6], // あご先
  [28.2, 58.6],
  [37.5, 60.8], // あごの下
  [39.2, 66.5],
  [40.2, 74.5], // のど
  [31, 83],
  [16, 92.5],
  [6, 104],
  [3, 120],
  [100, 120],
  [98, 104],
  [86, 92],
  [70, 82], // 首の後ろ
  [64.5, 70],
  [65.5, 58], // うなじ
  [73.5, 47],
  [77, 34], // 後頭部
  [74, 20],
  [64, 9.5],
];

/** 頭の中の「考えている」中心（光が脈打つ位置） */
export const BRAIN: readonly [number, number] = [54, 29];

/** 目の位置（小さな光の点） */
export const EYE: readonly [number, number] = [31.5, 33];

/**
 * 点列を通る、なめらかな閉じた曲線の SVG パス（Catmull-Rom → 3次ベジェ）。
 * scale・offset で箱の座標を描画先の座標へ変換する。
 */
export function smoothPath(
  points: readonly (readonly [number, number])[],
  scale = 1,
  offsetX = 0,
  offsetY = 0,
): string {
  const n = points.length;
  const at = (i: number): readonly [number, number] => points[((i % n) + n) % n] as readonly [number, number];
  const fx = (v: number): string => (offsetX + v * scale).toFixed(2);
  const fy = (v: number): string => (offsetY + v * scale).toFixed(2);
  const [sx, sy] = at(0);
  let d = `M${fx(sx)} ${fy(sy)}`;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${fx(c1x)} ${fy(c1y)} ${fx(c2x)} ${fy(c2y)} ${fx(x2)} ${fy(y2)}`;
  }
  return `${d} Z`;
}

/** なめらかな曲線の上の点を、ほぼ等間隔に count 個取り出す（scale・offset は smoothPath と同じ） */
export function sampleOutline(
  points: readonly (readonly [number, number])[],
  count: number,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
): [number, number][] {
  const n = points.length;
  const at = (i: number): readonly [number, number] => points[((i % n) + n) % n] as readonly [number, number];
  const dense: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    for (let k = 0; k < 12; k += 1) {
      const t = k / 12;
      const u = 1 - t;
      const x = u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2;
      const y = u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2;
      dense.push([x, y]);
    }
  }
  const lengths = [0];
  for (let i = 1; i < dense.length; i += 1) {
    const [ax, ay] = dense[i - 1] as [number, number];
    const [bx, by] = dense[i] as [number, number];
    lengths.push((lengths[i - 1] as number) + Math.hypot(bx - ax, by - ay));
  }
  const total = lengths[lengths.length - 1] as number;
  const result: [number, number][] = [];
  let j = 0;
  for (let k = 0; k < count; k += 1) {
    const target = (k / count) * total;
    while (j < lengths.length - 1 && (lengths[j + 1] as number) < target) j += 1;
    const [x, y] = dense[j] as [number, number];
    result.push([offsetX + x * scale, offsetY + y * scale]);
  }
  return result;
}
