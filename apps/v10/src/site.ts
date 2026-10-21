// サイト全体で共有する表示用の設定（サイト名・下部メニュー・展開メニュー・フッターの案内）。
// 会社情報など未確定の内容は書かない。リンク先はトップページ内のアンカー（#...）で持つ。

export const siteName = 'ANOM';

/** 画面上部の案内（確認版であることを示す） */
export const previewNotice = 'V10の確認用プレビューです。掲載内容は確認中で、相談フォームは送信されません。';

export const footerNote = 'このページは公開前の確認用プレビューです。';

export type MenuLink = {
  label: string;
  /** トップページ内のアンカー（# を除く） */
  anchor: string;
  /** 「構想中」など、提供状態を文字で示す補足 */
  status?: string;
};
export type MenuGroup = { title: string; links: MenuLink[] };

/** 展開メニューとフッターの案内に並べる項目（同じ順序・同じ表示名） */
export const siteMenu: MenuGroup[] = [
  {
    title: '提供中サービス',
    links: [
      { label: 'AI・DX支援', anchor: 'service-ai' },
      { label: 'Web制作・運用保守', anchor: 'service-web' },
      { label: 'システム開発', anchor: 'service-system' },
    ],
  },
  {
    title: 'ANOMを知る',
    links: [
      { label: '支援のイメージ', anchor: 'examples' },
      { label: 'ANOMの考え方', anchor: 'about' },
      { label: '相談からの進め方', anchor: 'process' },
    ],
  },
  {
    title: 'これから',
    links: [{ label: '学びの計画', anchor: 'learning', status: '構想中' }],
  },
  {
    title: '共通',
    links: [
      { label: 'トップへ', anchor: 'top' },
      { label: '相談する', anchor: 'contact' },
    ],
  },
];

/** 下部バーの常設項目 */
export const bottomNav = {
  services: { label: 'サービス', anchor: 'services' },
  contact: { label: '相談する', anchor: 'contact' },
  menu: { label: 'メニュー', title: 'サイトメニュー', close: '閉じる' },
};

export const privacyLink = { label: '個人情報の取り扱い（確認用案）', anchor: 'contact-privacy' };

/** トップページ内なら「#id」、ほかのページからは「/#id」でトップの該当位置へ移動する */
export function anchorHref(anchor: string, isHome: boolean): string {
  return isHome ? `#${anchor}` : `/#${anchor}`;
}
