// ヒーロー背景の canvas 演出「考える横顔」。
// - 粒子が集まって横顔になり、近い粒子どうしを細い線でつなぐ（AI のネットワークのイメージ）
// - 頭の中心が脈打ち、ときどき光の点（考え）が悩みチップへ飛んでいく
// - 背景には光の帯がゆっくり流れる
// - 悩みチップが選ばれると、そのチップへ光の点がまとまって飛ぶ（worries.ts が worry:select を送る）
// - 止める条件: 動きを減らす設定・一時停止ボタン・画面外・タブが裏にあるとき（止めたときは静止画を1枚描く）
import { BRAIN, EYE, PROFILE, sampleOutline, smoothPath } from '../lib/profile';
import { isPaused, onMotionChange } from './motion';

type Particle = {
  hx: number;
  hy: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  delay: number;
  brain: boolean;
  edge: boolean;
};

type Thought = {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  born: number;
  life: number;
  bright: boolean;
};

type Spark = { a: number; b: number; born: number };

type Ribbon = {
  y: number;
  tilt: number;
  amp: number;
  len: number;
  speed: number;
  width: number;
  alpha: number;
  phase: number;
};

const INTRO_MS = 1900;
const RIBBONS: Ribbon[] = [
  { y: 0.72, tilt: -0.34, amp: 0.07, len: 1.25, speed: 0.035, width: 0.16, alpha: 0.5, phase: 0 },
  { y: 0.58, tilt: -0.42, amp: 0.09, len: 0.95, speed: 0.05, width: 0.07, alpha: 0.42, phase: 2.1 },
  { y: 0.84, tilt: -0.26, amp: 0.05, len: 1.6, speed: 0.028, width: 0.1, alpha: 0.38, phase: 4.2 },
  { y: 0.42, tilt: -0.5, amp: 0.06, len: 1.1, speed: 0.042, width: 0.045, alpha: 0.3, phase: 1.3 },
];

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** global.css の @theme の色を「r, g, b」の形で読む（配色を変えると canvas の色も変わる）。読めないときは既定値 */
function themeRgb(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  let hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value.slice(1) : fallback.slice(1);
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function initHeroCanvas(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  const slot = document.querySelector<HTMLElement>('[data-head-slot]');
  const ctx = canvas?.getContext('2d');
  if (!hero || !canvas || !slot || !ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let scale = 1;
  let originX = 0;
  let originY = 0;
  let outline = new Path2D();
  let particles: Particle[] = [];
  let thoughts: Thought[] = [];
  let sparks: Spark[] = [];
  let linkDistance = 40;
  let introStart = performance.now();
  let lastThought = 0;
  let lastSpark = 0;
  let frame = 0;
  let inView = true;
  let compact = false;
  const pointer = { x: -9999, y: -9999 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  const color = {
    brand: themeRgb('brand', '#2563eb'),
    bright: themeRgb('brand-bright', '#3b82f6'),
    deep: themeRgb('brand-deep', '#1e3a8a'),
    glow: themeRgb('glow', '#93c5fd'),
    sky: themeRgb('sky', '#60a5fa'),
  };

  const toCanvas = (nx: number, ny: number): [number, number] => [originX + nx * scale, originY + ny * scale];

  function layout(): void {
    const box = hero!.getBoundingClientRect();
    const head = slot!.getBoundingClientRect();
    width = box.width;
    height = box.height;
    compact = width < 768;
    dpr = Math.min(window.devicePixelRatio || 1, width * height > 900_000 ? 1.5 : 2);
    canvas!.width = Math.round(width * dpr);
    canvas!.height = Math.round(height * dpr);

    // 横顔（幅100×高さ120）を枠の下端・左右中央に合わせて収める
    scale = Math.min(head.width / 100, head.height / 120);
    originX = head.left - box.left + (head.width - 100 * scale) / 2;
    originY = head.top - box.top + (head.height - 120 * scale);
    outline = new Path2D(smoothPath(PROFILE, scale, originX, originY));
    linkDistance = scale * (compact ? 11 : 9.5);
    buildParticles();
  }

  function buildParticles(): void {
    const area = 100 * scale * 120 * scale * 0.5;
    const target = Math.round(Math.min(280, Math.max(110, area / 520)));
    const list: Particle[] = [];
    const [bx, by] = BRAIN;
    ctx!.setTransform(1, 0, 0, 1, 0, 0);

    let guard = 0;
    while (list.length < target && guard < target * 40) {
      guard += 1;
      const nx = rand(2, 98);
      const ny = rand(4, 119);
      // 肩まわりは粒を少なめにして、頭に目が行くようにする
      if (ny > 64 && Math.random() > 0.38) continue;
      const [x, y] = toCanvas(nx, ny);
      if (!ctx!.isPointInPath(outline, x, y)) continue;
      list.push(makeParticle(x, y, Math.hypot(nx - bx, ny - by) < 15, false));
    }

    // 輪郭の上にも粒を並べ、横顔の形が読み取れるようにする
    const edgeCount = compact ? 54 : 84;
    for (const [x, y] of sampleOutline(PROFILE, edgeCount, scale, originX, originY)) {
      if (y > originY + 117 * scale) continue;
      list.push(makeParticle(x, y, false, true));
    }
    particles = list;
  }

  function makeParticle(x: number, y: number, brain: boolean, edge: boolean): Particle {
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.max(width, height) * rand(0.15, 0.55);
    return {
      hx: x,
      hy: y,
      sx: x + Math.cos(angle) * spread,
      sy: y + Math.sin(angle) * spread,
      x,
      y,
      r: edge ? rand(0.9, 1.5) : brain ? rand(1.3, 2.3) : rand(0.8, 1.9),
      phase: Math.random() * Math.PI * 2,
      speed: rand(0.5, 1.2),
      delay: Math.random() * 520,
      brain,
      edge,
    };
  }

  function chipTargets(): HTMLElement[] {
    return [...hero!.querySelectorAll<HTMLElement>('.chip')];
  }

  function spawnThought(target: HTMLElement, now: number, bright: boolean): void {
    const box = hero!.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (rect.width === 0) return;
    const [x0, y0] = toCanvas(BRAIN[0] + rand(-4, 4), BRAIN[1] + rand(-4, 4));
    const x1 = rect.left - box.left + rect.width / 2;
    const y1 = rect.top - box.top + rect.height / 2;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const bend = rand(-0.35, 0.35) * Math.hypot(x1 - x0, y1 - y0);
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    thoughts.push({
      x0,
      y0,
      cx: mx + (nx / len) * bend,
      cy: my + (ny / len) * bend - 30,
      x1,
      y1,
      born: now,
      life: bright ? rand(700, 950) : rand(1500, 2300),
      bright,
    });
  }

  function drawRibbons(t: number): void {
    const fade = compact ? 0.55 : 1;
    for (const ribbon of RIBBONS) {
      const top: [number, number][] = [];
      const bottom: [number, number][] = [];
      const step = Math.max(18, width / 48);
      for (let x = -step; x <= width + step; x += step) {
        const u = x / width;
        const base = height * (ribbon.y + ribbon.tilt * (u - 0.5));
        const wave = Math.sin((u / ribbon.len) * Math.PI * 2 + t * ribbon.speed * Math.PI * 2 + ribbon.phase);
        const y = base + wave * height * ribbon.amp + tilt.y * -0.4;
        const thick =
          height * ribbon.width * (0.55 + 0.45 * Math.sin((u / (ribbon.len * 0.7)) * Math.PI * 2 - t * ribbon.speed * 4 + ribbon.phase * 2));
        top.push([x + tilt.x * -0.4, y]);
        bottom.push([x + tilt.x * -0.4, y + thick]);
      }
      const gradient = ctx!.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `rgba(${color.glow}, 0)`);
      gradient.addColorStop(0.35, `rgba(${color.glow}, ${ribbon.alpha * 0.55 * fade})`);
      gradient.addColorStop(0.7, `rgba(${color.sky}, ${ribbon.alpha * fade})`);
      gradient.addColorStop(1, `rgba(${color.glow}, 0)`);
      ctx!.beginPath();
      ctx!.moveTo(top[0]![0], top[0]![1]);
      for (const [x, y] of top) ctx!.lineTo(x, y);
      for (let i = bottom.length - 1; i >= 0; i -= 1) ctx!.lineTo(bottom[i]![0], bottom[i]![1]);
      ctx!.closePath();
      ctx!.fillStyle = gradient;
      ctx!.fill();

      // 帯の上の縁だけ白く光らせて、絹のような質感にする
      ctx!.beginPath();
      ctx!.moveTo(top[0]![0], top[0]![1]);
      for (const [x, y] of top) ctx!.lineTo(x, y);
      ctx!.strokeStyle = `rgba(255, 255, 255, ${0.75 * fade})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();
    }
  }

  function draw(now: number, animate: boolean): void {
    const t = now / 1000;
    const intro = animate ? Math.min(1, (now - introStart) / INTRO_MS) : 1;

    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;

    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, width, height);

    ctx!.save();
    ctx!.translate(tilt.x, tilt.y);

    // 頭の中の光（ゆっくり脈打つ）
    const [bx, by] = toCanvas(BRAIN[0], BRAIN[1]);
    const pulse = animate ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0.6;
    const glowR = scale * (22 + pulse * 6);
    const glow = ctx!.createRadialGradient(bx, by, 0, bx, by, glowR);
    glow.addColorStop(0, `rgba(${color.sky}, ${0.42 * intro})`);
    glow.addColorStop(0.45, `rgba(${color.bright}, ${0.16 * intro})`);
    glow.addColorStop(1, `rgba(${color.bright}, 0)`);
    ctx!.fillStyle = glow;
    ctx!.beginPath();
    ctx!.arc(bx, by, glowR, 0, Math.PI * 2);
    ctx!.fill();

    // 粒の位置（登場時は散らばった位置から集まり、その後は小さく揺れる）
    const drift = scale * 0.7;
    const reach = scale * 16;
    for (const p of particles) {
      const k = animate ? easeOut(Math.min(1, Math.max(0, (now - introStart - p.delay) / (INTRO_MS - 520)))) : 1;
      let x = p.sx + (p.hx - p.sx) * k;
      let y = p.sy + (p.hy - p.sy) * k;
      if (animate) {
        x += Math.sin(t * p.speed + p.phase) * drift;
        y += Math.cos(t * p.speed * 0.8 + p.phase) * drift;
      }
      const dx = x - (pointer.x - tilt.x);
      const dy = y - (pointer.y - tilt.y);
      const d = Math.hypot(dx, dy);
      if (d < reach && d > 0.01) {
        const push = Math.pow(1 - d / reach, 2) * reach * 0.45;
        x += (dx / d) * push;
        y += (dy / d) * push;
      }
      p.x = x;
      p.y = y;
    }

    // 近い粒どうしをつなぐ線（濃さを3段階に分けてまとめて描く）
    const buckets = [new Path2D(), new Path2D(), new Path2D()];
    const maxD2 = linkDistance * linkDistance;
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i]!;
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;
        const level = d2 < maxD2 * 0.2 ? 2 : d2 < maxD2 * 0.5 ? 1 : 0;
        buckets[level]!.moveTo(a.x, a.y);
        buckets[level]!.lineTo(b.x, b.y);
      }
    }
    ctx!.lineWidth = 0.7;
    const linkAlpha = [0.1, 0.18, 0.28];
    buckets.forEach((path, i) => {
      ctx!.strokeStyle = `rgba(${color.brand}, ${linkAlpha[i]! * intro})`;
      ctx!.stroke(path);
    });

    // 輪郭
    const edgeAlpha = animate ? Math.max(0, (now - introStart - 700) / 1200) : 1;
    ctx!.strokeStyle = `rgba(${color.brand}, ${0.38 * Math.min(1, edgeAlpha)})`;
    ctx!.lineWidth = 1.1;
    ctx!.stroke(outline);

    // ニューロンの発火（頭の中の線がときどき明るく光る）
    if (animate && now - lastSpark > 260 && intro >= 1) {
      lastSpark = now;
      const brain = particles.filter((p) => p.brain);
      if (brain.length > 2) {
        const a = Math.floor(Math.random() * brain.length);
        const b = Math.floor(Math.random() * brain.length);
        sparks.push({ a: particles.indexOf(brain[a]!), b: particles.indexOf(brain[b]!), born: now });
      }
    }
    sparks = sparks.filter((s) => now - s.born < 700);
    for (const spark of sparks) {
      const a = particles[spark.a];
      const b = particles[spark.b];
      if (!a || !b) continue;
      const life = (now - spark.born) / 700;
      ctx!.strokeStyle = `rgba(${color.sky}, ${0.75 * (1 - life)})`;
      ctx!.lineWidth = 1.4;
      ctx!.beginPath();
      ctx!.moveTo(a.x, a.y);
      ctx!.lineTo(b.x, b.y);
      ctx!.stroke();
    }

    // 粒
    for (const p of particles) {
      const k = animate ? Math.min(1, Math.max(0, (now - introStart - p.delay) / 600)) : 1;
      const twinkle = animate ? 0.6 + 0.4 * Math.sin(t * 2 * p.speed + p.phase) : 0.85;
      ctx!.fillStyle = p.brain
        ? `rgba(${color.sky}, ${twinkle * k})`
        : `rgba(${color.brand}, ${(p.edge ? 0.75 : 0.55) * twinkle * k})`;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx!.fill();
    }

    // 目の光
    const [ex, ey] = toCanvas(EYE[0], EYE[1]);
    ctx!.fillStyle = `rgba(${color.deep}, ${0.8 * intro})`;
    ctx!.beginPath();
    ctx!.arc(ex, ey, Math.max(1.6, scale * 0.65), 0, Math.PI * 2);
    ctx!.fill();
    ctx!.restore();

    // 肩から下は背景に溶けるように消す（横顔の下端の線も見せない）
    const fadeTop = originY + 82 * scale;
    const fadeEnd = originY + 116 * scale;
    const fade = ctx!.createLinearGradient(0, fadeTop, 0, fadeEnd);
    fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fade.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx!.globalCompositeOperation = 'destination-out';
    ctx!.fillStyle = fade;
    ctx!.fillRect(0, fadeTop, width, fadeEnd - fadeTop);
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, fadeEnd, width, height - fadeEnd);

    // 光の帯は横顔の後ろに描く
    ctx!.globalCompositeOperation = 'destination-over';
    drawRibbons(animate ? t : 0);
    ctx!.globalCompositeOperation = 'source-over';

    // 考えの光（頭からチップへ飛ぶ）
    if (animate) {
      if (intro >= 1 && now - lastThought > (compact ? 1700 : 1100)) {
        lastThought = now;
        const chips = chipTargets();
        const pick = chips[Math.floor(Math.random() * chips.length)];
        if (pick) spawnThought(pick, now, false);
      }
      thoughts = thoughts.filter((th) => now - th.born < th.life);
      for (const th of thoughts) {
        const life = (now - th.born) / th.life;
        for (let k = 0; k < 7; k += 1) {
          const u = Math.max(0, easeOut(life) - k * 0.025);
          const v = 1 - u;
          const x = v * v * th.x0 + 2 * v * u * th.cx + u * u * th.x1 + tilt.x * v;
          const y = v * v * th.y0 + 2 * v * u * th.cy + u * u * th.y1 + tilt.y * v;
          const alpha = (1 - k / 7) * Math.sin(Math.PI * Math.min(1, life * 1.05)) * (th.bright ? 1 : 0.7);
          ctx!.fillStyle = th.bright ? `rgba(${color.brand}, ${alpha})` : `rgba(${color.bright}, ${alpha})`;
          ctx!.beginPath();
          ctx!.arc(x, y, (th.bright ? 3 : 2.2) * (1 - k * 0.1), 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }
  }

  function loop(now: number): void {
    frame = 0;
    if (!shouldRun()) return;
    draw(now, true);
    frame = window.requestAnimationFrame(loop);
  }

  function shouldRun(): boolean {
    return inView && !document.hidden && !isPaused();
  }

  function start(): void {
    if (frame || !shouldRun()) return;
    frame = window.requestAnimationFrame(loop);
  }

  function stop(): void {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function refresh(): void {
    if (shouldRun()) start();
    else {
      stop();
      // 止めた状態でも、横顔が完成した静止画を1枚描いておく
      introStart = -INTRO_MS;
      thoughts = [];
      draw(performance.now(), false);
    }
  }

  layout();
  if (isPaused()) introStart = -INTRO_MS;
  refresh();
  hero.classList.add('hero-live');

  let resizeFrame = 0;
  new ResizeObserver(() => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      const before = particles.length;
      layout();
      // サイズが変わっただけなら登場演出はくり返さない
      if (before > 0) introStart = -INTRO_MS;
      if (!frame) draw(performance.now(), false);
    });
  }).observe(hero);

  new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    refresh();
  }).observe(hero);

  document.addEventListener('visibilitychange', refresh);
  onMotionChange(refresh);

  // 精密なポインター（マウス）だけ、カーソルに合わせて少し奥行きを付ける
  if (window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', (event) => {
      const box = hero.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      tilt.tx = (pointer.x / box.width - 0.5) * -14;
      tilt.ty = (pointer.y / box.height - 0.5) * -10;
    });
    hero.addEventListener('pointerleave', () => {
      pointer.x = -9999;
      pointer.y = -9999;
      tilt.tx = 0;
      tilt.ty = 0;
    });
  }

  // 悩みチップが選ばれたら、そのチップへ光をまとめて飛ばす
  document.addEventListener('worry:select', (event) => {
    const chip = (event as CustomEvent<{ chip: HTMLElement }>).detail.chip;
    if (!frame) return;
    const now = performance.now();
    for (let i = 0; i < 7; i += 1) {
      spawnThought(chip, now + i * 50, true);
    }
  });
}
