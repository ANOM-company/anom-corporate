# ANOM Web Starter v1（apps/v10）

静的サイト制作用のひな形です。Astro（静的HTML出力）＋ TypeScript ＋ Tailwind CSS で、共通部品・ページ・ブラウザーテスト・検証用CIを含みます。

- トップページ（`/`）は ANOM V10 のトップ画面と下部メニューの確認版です。掲載内容は確認中で、公開用の確定版ではありません。相談フォームは入力だけを確かめる版で、どこにも送信しません。
- 書体は Outfit と LINE Seed JP を `public/fonts/` から自己配信します（取得元・版・ライセンスは `public/fonts/README.txt`）。
- 作業ルールは [`AGENTS.md`](./AGENTS.md)、構成は [`docs/architecture.md`](./docs/architecture.md) を参照してください。

## 必要なもの

- Node.js **24.22.0**（`.nvmrc` に記載。`engine-strict` のため 24 系以外では導入が止まります）
- npm 11 系（Node 24.22.0 に同梱）

## 導入

```bash
cd apps/v10
npm ci                                  # package-lock.json どおりに導入
npx playwright install --with-deps chromium   # テスト用ブラウザー（初回のみ）
```

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（http://localhost:4321/）。CSPヘッダーはかからない |
| `npm run check` | 型確認（`astro check`） |
| `npm run lint` | Lint（ESLint：JS・TS・.astro） |
| `npm run build` | `dist/` に静的ファイルを出力 |
| `npm run preview` | `dist/` をローカルの Wrangler で配信（http://127.0.0.1:8788/）。`_headers` と 404 を本番と同じ方式で確認できる |
| `npm run test:e2e` | ブラウザーテスト。ビルド済みの `dist/` を Wrangler で配信して実行する（先に `npm run build`） |
| `npm run audit` | 依存の脆弱性検査（高・重大があれば失敗） |

検証をまとめて再実行する場合:

```bash
npm ci && npm run check && npm run lint && npm run build && npm run test:e2e && npm run audit
```

## テスト結果の保存場所

- `playwright-report/`：HTML レポート（`npx playwright show-report` で表示）
- `test-results/`：画面幅ごとのスクリーンショット、失敗時のトレース、`results.json`（集計）
- `test-results/screens-*/`：PC・スマホのトップ全体、メニューを開いた状態、相談フォームの表示見本の画像
- アクセシビリティ検査（axe）の全指摘は、各テストの添付（`axe-*.json`）としてレポートに残る
- 書体の読み込み量（`font-transfer.json`）、表示のずれと操作の応答の計測値（`metrics-*.json`）も各テストの添付に残る

どちらも Git の対象外です。CI では成果物（artifact）としてアップロードされます。

## ページ

- `/` … トップ（冒頭・提供サービス・システム開発・支援のイメージ・ANOMの考え方・相談からの進め方・学びの計画・相談フォーム）
- `/kitchen-sink/` … 各部品と状態の確認画面（相談フォームの各状態の表示見本を含む）
- 存在しないURL … `404.html` を 404 ステータスで返す（Wrangler の `404-page` 方式）

## 書体の差し替え

書体の分割・変換は `tools/fonts/build-fonts.py`（Python・fonttools・brotli）で手元で行い、生成物（`public/fonts/*.woff2` と `src/styles/fonts.css`）をコミットします。ビルドやCIでは実行しません。入力ファイルと手順はスクリプト冒頭のコメントを参照してください。

## 配信について

`wrangler.jsonc` はローカル検証専用です（`workers_dev` / `preview_urls` は false、資格情報なし）。このひな形からクラウドへの配信は行いません。
