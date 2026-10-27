// お問い合わせフォーム（確認用。どこにも送信しない）。
// - 送信ボタンを有効にし、入力に問題がなければ「確認できました（実際には送信していません）」を表示する
// - 入力の誤りの表示（:user-invalid）と、読み上げ用の aria-invalid をそろえる
// - ファーストビューで選んだ悩みを、まだ悩みを触っていなければ最初から選んでおく
// - サービス欄の「このサービスについて相談する」から来たら、相談のサービスとして表示する
import { focusTarget } from './header';

export function initContact(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const pills = [...form.querySelectorAll<HTMLInputElement>('input[name="worries"]')];
  const hint = form.querySelector<HTMLElement>('[data-worry-hint]');
  const topic = form.querySelector<HTMLElement>('[data-topic]');
  const topicName = form.querySelector<HTMLElement>('[data-topic-name]');
  const topicInput = form.querySelector<HTMLInputElement>('[data-topic-input]');
  let pillsTouched = false;
  let lastShared: HTMLInputElement | null = null;

  if (submit) submit.disabled = false;

  // aria-invalid を :user-invalid の見た目と合わせる
  const syncAria = (event: Event): void => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    if (field.matches(':user-invalid')) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  };
  form.addEventListener('blur', syncAria, true);
  form.addEventListener('input', (event) => {
    if ((event.target as HTMLElement).getAttribute('aria-invalid') === 'true') syncAria(event);
    if (status?.textContent) status.textContent = '';
  });
  // 送信しようとして誤りがあったとき（ブラウザーが最初の誤りの欄へフォーカスを移す）
  form.addEventListener(
    'invalid',
    (event) => {
      (event.target as HTMLElement).setAttribute('aria-invalid', 'true');
    },
    true,
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!status) return;
    status.textContent = status.dataset['done'] ?? '';
  });

  for (const pill of pills) {
    pill.addEventListener('change', () => {
      pillsTouched = true;
    });
  }

  document.addEventListener('worry:share', (event) => {
    const label = (event as CustomEvent<{ label: string }>).detail.label;
    if (pillsTouched) return;
    if (lastShared) lastShared.checked = false;
    const match = pills.find((pill) => pill.value === label) ?? null;
    if (match) match.checked = true;
    lastShared = match;
    if (hint) hint.hidden = !match;
  });

  // 「このサービスについて相談する」
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-consult]')) {
    link.addEventListener('click', () => {
      const id = link.dataset['consult'] ?? '';
      const name = document.querySelector(`[data-svc="${id}"] h3`)?.textContent?.trim() ?? '';
      if (!topic || !topicName || !topicInput || !name) return;
      topicName.textContent = name;
      topicInput.value = name;
      topic.hidden = false;
    });
  }
  form.querySelector<HTMLButtonElement>('[data-topic-clear]')?.addEventListener('click', () => {
    if (!topic || !topicInput) return;
    topic.hidden = true;
    topicInput.value = '';
    form.querySelector<HTMLInputElement>('#contact-name')?.focus();
  });

  // 「無料で相談する」はお名前の欄へ移動して入力を始められるようにする
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-focus-name]')) {
    link.addEventListener('click', (event) => {
      const name = form.querySelector<HTMLInputElement>('#contact-name');
      if (!name) return;
      event.preventDefault();
      name.scrollIntoView({ block: 'center' });
      focusTarget(name);
    });
  }
}
