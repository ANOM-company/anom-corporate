# ANOM Web Starter v1（apps/v10）

静的サイト制作用の最小のひな形です。Astro（静的HTML出力）＋ TypeScript ＋ Tailwind CSS で、共通部品と検証用ページ・ブラウザーテスト・検証用CIを含みます。

- 配色・書体は仮テーマです。ANOM V10 の採用デザインではありません。
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
- アクセシビリティ検査（axe）の全指摘は、各テストの添付（`axe-*.json`）としてレポートに残る

どちらも Git の対象外です。CI では成果物（artifact）としてアップロードされます。

## ページ

- `/` … ひな形の案内
- `/kitchen-sink/` … 各部品と状態の確認画面
- 存在しないURL … `404.html` を 404 ステータスで返す（Wrangler の `404-page` 方式）

## 配信について

`wrangler.jsonc` はローカル検証専用です（`workers_dev` / `preview_urls` は false、資格情報なし）。このひな形からクラウドへの配信は行いません。
