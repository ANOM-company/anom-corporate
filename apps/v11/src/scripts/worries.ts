// ファーストビューの悩みチップ。
// - HTML ではサービス欄へのリンク（JavaScript 無効でも対応サービスへ移動できる）
// - JavaScript が動くと、同じ見た目のトグルボタン（aria-pressed）に置き換える
// - 選ぶと「この悩みに対応するサービス」が切り替わり、PC ではチップからカードへ線が伸びる
// - 選んだ悩みは、サービス欄の同じタグの強調と、お問い合わせフォームの初期選択に引き継ぐ
import { isPaused } from './motion';

const WIDE = window.matchMedia('(min-width: 75rem)');

export function initWorries(): void {
  const stage = document.querySelector<HTMLElement>('#worries');
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  const status = document.querySelector<HTMLElement>('[data-preview-status]');
  if (!stage || !preview) return;

  const links = [...stage.querySelectorAll<HTMLAnchorElement>('a.chip')];
  const chips = links.map(upgradeToButton);
  const items = [...preview.querySelectorAll<HTMLElement>('[data-preview-item]')];
  const svg = stage.querySelector<SVGSVGElement>('[data-hero-link]');
  const path = svg?.querySelector<SVGPathElement>('[data-link-path]');
  const glow = svg?.querySelector<SVGPathElement>('[data-link-glow]');
  const dot = svg?.querySelector<SVGCircleElement>('[data-link-dot]');
  let active = chips.find((chip) => chip.classList.contains('is-active')) ?? null;
  let dotFrame = 0;

  for (const chip of chips) {
    chip.classList.remove('is-active');
    chip.setAttribute('aria-pressed', String(chip === active));
    chip.addEventListener('click', (event) => {
      ripple(chip, event);
      select(chip, true);
    });
  }

  // 最初に選ばれている悩みの線を引く（PC のみ）
  if (active) {
    shareSelection(active, false);
    window.requestAnimationFrame(() => drawLink(false));
  }

  new ResizeObserver(() => drawLink(false)).observe(stage);
  WIDE.addEventListener('change', () => drawLink(false));
  document.fonts?.ready.then(() => drawLink(false));

  function select(chip: HTMLButtonElement, byUser: boolean): void {
    const same = chip === active;
    active = chip;
    for (const other of chips) other.setAttribute('aria-pressed', String(other === chip));
    const service = chip.dataset['service'] ?? '';
    const label = chip.textContent?.trim() ?? '';

    if (!same) swapPreview(service);
    drawLink(true);
    shareSelection(chip, byUser);

    const item = items.find((el) => el.dataset['previewItem'] === service);
    const name = item?.querySelector('.preview__name')?.textContent ?? '';
    if (status && byUser) status.textContent = `「${label}」に対応するサービスは「${name}」です。`;

    document.dispatchEvent(new CustomEvent('worry:select', { detail: { chip, worry: chip.dataset['worry'], service } }));

    // スマホ・タブレット: カードが画面外なら、見える位置まで少しだけスクロールする
    if (byUser && !WIDE.matches) {
      const rect = preview!.getBoundingClientRect();
      const bottomLimit = window.innerHeight - 96;
      if (rect.bottom > bottomLimit || rect.top < 0) {
        preview!.scrollIntoView({ block: 'center', behavior: isPaused() ? 'auto' : 'smooth' });
      }
    }
  }

  function swapPreview(service: string): void {
    preview!.classList.remove('is-scanning');
    // アニメーションを最初から再生し直すため、一度レイアウトを確定させる
    void preview!.offsetWidth;
    preview!.classList.add('is-scanning');
    for (const item of items) {
      const show = item.dataset['previewItem'] === service;
      item.hidden = !show;
      item.classList.toggle('is-entering', show);
    }
  }

  /**
   * 選んだ悩みをページの他の場所へ伝える（サービス欄のタグ強調・フォームの初期選択）。
   * フォームの初期選択は、利用者が自分で選んだときだけ（最初から選ばれている見本の悩みは引き継がない）
   */
  function shareSelection(chip: HTMLButtonElement, byUser: boolean): void {
    const label = chip.textContent?.trim() ?? '';
    for (const tag of document.querySelectorAll<HTMLElement>('[data-tag]')) {
      tag.classList.toggle('is-match', tag.dataset['tag'] === label);
    }
    if (byUser) document.dispatchEvent(new CustomEvent('worry:share', { detail: { label } }));
  }

  /** PC: 選んだチップの端からカードの左端へ、曲線を引く */
  function drawLink(animate: boolean): void {
    if (!svg || !path || !glow || !dot) return;
    if (!WIDE.matches || !active) {
      path.setAttribute('d', '');
      glow.setAttribute('d', '');
      return;
    }
    const box = stage!.getBoundingClientRect();
    const from = active.getBoundingClientRect();
    const card = preview!.getBoundingClientRect();
    const x0 = from.right - box.left;
    const y0 = from.top + from.height / 2 - box.top;
    const x1 = card.left - box.left - 6;
    const y1 = card.top + Math.min(44, card.height * 0.18) - box.top;
    const dx = Math.max(60, (x1 - x0) * 0.45);
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} C${(x0 + dx).toFixed(1)} ${(y0 - 40).toFixed(1)} ${(x1 - dx).toFixed(1)} ${(y1 + 10).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    path.setAttribute('d', d);
    glow.setAttribute('d', d);

    const length = path.getTotalLength();
    window.cancelAnimationFrame(dotFrame);
    if (!animate || isPaused()) {
      path.style.strokeDasharray = 'none';
      glow.style.strokeDasharray = 'none';
      const end = path.getPointAtLength(length);
      dot.setAttribute('cx', String(end.x));
      dot.setAttribute('cy', String(end.y));
      return;
    }

    // 線を描きながら、先端の点がカードへ向かって走る
    const duration = 650;
    const begin = performance.now();
    path.style.strokeDasharray = `${length}`;
    glow.style.strokeDasharray = `${length}`;
    const step = (now: number): void => {
      const t = Math.min(1, (now - begin) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const offset = length * (1 - eased);
      path.style.strokeDashoffset = `${offset}`;
      glow.style.strokeDashoffset = `${offset}`;
      const point = path.getPointAtLength(length * eased);
      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
      if (t < 1) dotFrame = window.requestAnimationFrame(step);
    };
    dotFrame = window.requestAnimationFrame(step);
  }
}

/** リンクのチップを、同じ見た目・同じ属性のトグルボタンに置き換える */
function upgradeToButton(link: HTMLAnchorElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  for (const attr of [...link.attributes]) {
    if (attr.name === 'href') continue;
    button.setAttribute(attr.name, attr.value);
  }
  button.append(...link.childNodes);
  link.replaceWith(button);
  return button;
}

/** タップした位置から広がる波紋 */
function ripple(chip: HTMLElement, event: MouseEvent): void {
  if (isPaused()) return;
  const rect = chip.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;
  const wave = document.createElement('span');
  wave.className = 'chip__ripple';
  // キーボード操作（座標なし）のときは中央から広げる
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
  wave.style.width = `${size}px`;
  wave.style.height = `${size}px`;
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  chip.append(wave);
  wave.addEventListener('animationend', () => wave.remove());
}
