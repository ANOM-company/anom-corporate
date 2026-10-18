# 構成と設計方針

## ディレクトリ

```
apps/v10/
├── astro.config.mjs      静的出力・CSS/JSの外部ファイル化・Tailwind（Vite プラグイン）
├── wrangler.jsonc        ローカル配信の設定（dist/ を配信、404-page 方式）
├── playwright.config.ts  ブラウザーテストの設定（Wrangler を起動して dist/ をテスト）
├── public/
│   ├── _headers          CSP などのレスポンスヘッダー（dist/ にコピーされる）
│   └── favicon.svg
├── src/
│   ├── components/       共通部品（Button・Input・Card・Navigation・Modal・Hero・Services・FAQ・CTA・Footer）
│   ├── layouts/          全ページ共通の骨組み
│   ├── pages/            / ・ /kitchen-sink/ ・ 404
│   ├── scripts/          部品の補助スクリプト（ナビのEsc・モーダル・フォーム見本）
│   ├── styles/global.css 設計トークンと基本スタイル
│   └── site.ts           サイト名・ナビ項目など表示用の設定
└── tests/                Playwright のテスト
```

## 設計トークン

`src/styles/global.css` の `@theme` で、Tailwind のユーティリティ名として使える値を定義しています。

| 種類 | 例 | 使い方 |
|---|---|---|
| 色 | `--color-ink`, `--color-brand`, `--color-danger` | `text-ink`, `bg-brand`, `border-danger` |
| 書体 | `--font-sans`（端末の標準書体） | `font-sans` |
| 文字サイズ | `--text-base` 〜 `--text-3xl`（行間付き） | `text-xl` など |
| 余白 | `--spacing`（基準 0.25rem）, `--spacing-section` | `p-4`, `py-(--spacing-section)` |
| 幅 | `--container-content`, `--container-prose` | `.container-content`, `max-w-(--container-prose)` |
| 動き | `--duration-fast`, `--duration-base`, `--ease-standard` | `duration-(--duration-base) ease-standard` |

動き低減の設定（`prefers-reduced-motion: reduce`）では、時間の値を 0 にし、すべての transition / animation を止めます。

## セキュリティヘッダーと CSP

- `public/_headers` で全URLに CSP・`X-Content-Type-Options: nosniff`・`Referrer-Policy`・`X-Robots-Tag: noindex, nofollow` などを付けます。404 応答にも同じヘッダーが付くことをテストで確認しています。
- CSP は `script-src 'self'; style-src 'self'` などすべて同一オリジンのみ。インライン実行を許可しないため、ビルド設定で CSS/JS を必ず外部ファイルに出力し、生成された HTML にインラインのスクリプト・スタイル・`style` 属性・`on*` 属性がないことをテストで確認しています。
- `form-action 'none'` とし、フォームの見本は `method="dialog"` で送信先を持ちません。

## 404

`wrangler.jsonc` の `assets.not_found_handling: "404-page"` により、存在しないURLには `dist/404.html` が 404 ステータスで返ります。

## テストの範囲

| 観点 | ファイル |
|---|---|
| HTTPステータス・ヘッダー・404・`_headers` 非公開 | `tests/pages.spec.ts` |
| 360 / 768 / 1440px の横はみ出し（スクリーンショット保存） | `tests/pages.spec.ts` |
| リンク・CSS・JS・画像の読み込み、外部オリジンなし | `tests/pages.spec.ts` |
| 生成HTMLにインライン要素がない | `tests/pages.spec.ts` |
| ナビ（スマホ・PC）、モーダル（Tab・Esc・フォーカス復帰）、FAQ、フォームのラベルとエラー | `tests/interactions.spec.ts` |
| Tab移動・フォーカス表示・本文へ移動 | `tests/interactions.spec.ts` |
| JavaScript無効時の本文・リンク・メニュー、動き低減 | `tests/no-js-and-motion.spec.ts` |
| axe による自動検査（重大・深刻は0件で合格、全指摘を添付） | `tests/accessibility.spec.ts` |

すべてのテストで、ブラウザーの実行エラー・コンソールエラー（CSP違反を含む）・同一オリジンの読み込み失敗が1件でもあれば失敗します（`tests/fixtures.ts`）。

自動検査で確認できるのはアクセシビリティの一部です。スクリーンリーダーでの読み上げ、拡大表示、実機での操作などは別途人の確認が必要です。
