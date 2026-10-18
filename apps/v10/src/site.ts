// サイト全体で共有する表示用の設定（サイト名・ナビの項目）。
// 実案件ではここを差し替える。会社情報など未確定の内容は書かない。
import type { NavItem } from './components/Navigation.astro';

export const siteName = 'ANOM Web Starter';

export const navItems: NavItem[] = [
  { label: 'はじめに', href: '/' },
  { label: '部品の確認画面', href: '/kitchen-sink/' },
];

export const footerNote = 'ANOM Web Starter v1 の検証用ひな形です。表示中の配色・書体は仮テーマです。';
