// 動きの設定をまとめる。
// - 端末の「視差効果を減らす（動きを減らす）」設定がオンなら、最初から止める
// - ヒーローの「動きを止める」ボタンで止めた状態は、この端末に保存して次回も引き継ぐ
// - 止めている間は <html> に .is-paused を付け、CSS のくり返しアニメーションも止める

type Listener = (paused: boolean) => void;

const STORAGE_KEY = 'anom-v11-motion-paused';
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set<Listener>();

function readSaved(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let userPaused = readSaved();

function apply(): void {
  const paused = isPaused();
  document.documentElement.classList.toggle('is-paused', paused);
  for (const listener of listeners) listener(paused);
}

export function prefersReducedMotion(): boolean {
  return media.matches;
}

export function isPaused(): boolean {
  return media.matches || userPaused;
}

export function isUserPaused(): boolean {
  return userPaused;
}

export function setUserPaused(value: boolean): void {
  userPaused = value;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 保存できない環境（プライベートブラウズなど）では、このページの間だけ有効
  }
  apply();
}

export function onMotionChange(listener: Listener): void {
  listeners.add(listener);
}

media.addEventListener('change', apply);
apply();
