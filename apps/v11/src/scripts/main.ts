// ページの起動役。各部品の動きをここから順に始める。
import { isPaused, isUserPaused, onMotionChange, prefersReducedMotion, setUserPaused } from './motion';
import { initHeader } from './header';
import { initReveal } from './reveal';
import { initWorries } from './worries';
import { initHeroCanvas } from './hero-canvas';
import { initServices } from './services';
import { initContact } from './contact';
import { initBottomBar } from './bottom-bar';
import { initVisualPause } from './visual-pause';

function initMotionToggle(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  const text = button?.querySelector<HTMLElement>('.motion-toggle__text');
  if (!button || !text) return;

  const render = (): void => {
    // 端末の設定で動きを減らしている場合は、すでに止まっているのでボタンを出さない
    button.hidden = prefersReducedMotion();
    // 押すと名前が「止める」⇔「再開する」に変わるので、aria-pressed は付けない（名前と状態が二重にならないように）
    const paused = isUserPaused();
    button.classList.toggle('is-stopped', paused);
    text.textContent = (paused ? text.dataset['labelPlay'] : text.dataset['labelPause']) ?? '';
  };

  button.addEventListener('click', () => {
    setUserPaused(!isUserPaused());
    if (isPaused()) document.dispatchEvent(new CustomEvent('motion:paused'));
  });
  onMotionChange(render);
  render();
}

// くり返しの動きを有効にする合図（global.css 参照。JavaScript 無効時は動きを1回で終える）
document.documentElement.classList.add('js');

initMotionToggle();
initHeader();
initWorries();
initServices();
initContact();
initBottomBar();
initReveal();
initVisualPause();
initHeroCanvas();
