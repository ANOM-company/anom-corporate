# apps/v10 作業ルール（ANOM Web Starter v1）

このファイルが `apps/v10/` の作業ルールの正本です。同じ階層の `CLAUDE.md` はここを参照するだけの案内です。ルールを変えるときはこのファイルだけを編集してください。

リポジトリのルートにある `CLAUDE.md` の「ビルド不要」「npm不要」・旧デザイン指定は、ルート直下の既存サイト向けです。`apps/v10/` には適用せず、このファイルに従います。

## 1. 範囲

- 作業は `apps/v10/` の中で完結させる。リポジトリのルート（既存サイトのHTML・assets・CNAME・既存の設定）は変更しない。
- CI定義は次の2本。本番へ配信するワークフローは置かない。
  - `.github/workflows/v10-ci.yml`：検証専用。ジョブ `v10-quality` は main の必須チェック。
  - `.github/workflows/preview.yml`：PRごとの確認用プレビュー。本番とは別の Worker に版を置くだけで、本番には配信しない（使い方は `.github/preview/README.md`）。

## 2. 技術構成

- Astro の静的HTML出力 + TypeScript + Tailwind CSS（`@tailwindcss/vite`）。
- Node の版は `.nvmrc`、依存の版は `package.json`（`^` なしの固定）と `package-lock.json` で固定する。依存を追加・更新したら理由と版を PR に書く。
- 今は入れないもの: React などのUIライブラリ、CMS、DB、認証、外部フォーム、3D、動画、外部から読み込むフォント、Cloudflare アダプター、サーバーコード。必要になったら別途合意してから追加する。
- 書体はオーナー指定の Outfit と LINE Seed JP の2書体だけを使う。どちらも公式配布元から取得した WOFF2 を `public/fonts/` に置いて自己配信し、ライセンス全文と取得元・版の記録（`public/fonts/README.txt`）を同梱する。分割・変換は `tools/fonts/build-fonts.py` で行い、ビルドやCIでは実行しない。Google Fonts・外部CDNから閲覧時に読み込む方式や、ほかの書体の追加はしない。読み込めない場合は端末の標準書体で表示する。

## 3. デザインの決め方

- 色・書体・余白・文字サイズ・角丸・動きは `src/styles/global.css` の `@theme` に集約する。部品の中で色コードや任意の値を直書きしない。
- 現在の値は仮テーマ。ANOM V10 の採用デザインとして扱わない・表示しない。
- 動きは `--duration-*` と `--ease-standard` だけを使い、`prefers-reduced-motion: reduce` で止まることを保つ。

## 4. 部品（`src/components/`）

- 文言は部品に持たせず、ページ側から props / slot で渡す。
- 意味のあるHTMLを優先する（FAQ・スマホメニューは `<details>`、モーダルは `<dialog>`）。JavaScript は補助に留め、無効でも本文と主要リンクが使えること。
- 入力欄は必ず `<label>` と結び付け、補足・エラー文は `aria-describedby` で読み上げ対象にする。
- フォームは見本のみ。メール送信・外部API呼び出しを実装しない。

## 5. 内容のルール

- 実績の数値・顧客名・お客様の声・料金・未確定の会社情報を作らない・載せない。
- 未承認の画像・ロゴ・内部文書を取り込まない。手元で見えない素材を「存在しない」と決めつけず、代わりの素材も作らない。
- リポジトリは公開。内部の指示書・会話の全文・個人の端末パス・承認記録・秘密情報をコミットしない。

## 6. セキュリティ

- `public/_headers` の CSP は `'self'` のみ。`unsafe-inline`・`unsafe-eval`・外部CDNを追加しない。CSPを外して検証を通さない。
- CSS/JS は外部ファイルとして出力する（`astro.config.mjs` の `inlineStylesheets: 'never'` と `assetsInlineLimit: 0`）。HTMLに `style` 属性・インラインスクリプト・`on*` 属性を書かない。
- `.env`・`*.pem`・`secrets/` の中身は読まない・表示しない・転載しない。
- `wrangler.jsonc` はローカル検証専用。本番の Worker 名・独自ドメイン・資格情報を書かない。`wrangler deploy` を実行しない。

## 7. 検証（変更のたびに実行）

```
npm run check     # 型確認
npm run lint      # Lint
npm run build     # dist/ に静的出力
npm run test:e2e  # dist/ をローカルの Wrangler で配信してブラウザーテスト
npm run audit     # 依存の脆弱性検査（高以上で失敗）
```

- テストを飛ばす・無効化する・常に成功させる変更はしない。失敗は PR に明記する。
- 自動テストの合格だけで WCAG 適合とは言わない。

## 8. 公開

- GitHub への push と本番公開は別の工程。本番公開・Cloudflare の設定変更・DNS 変更は、オーナーの承認なしに行わない。
- `main` へ直接 push しない。作業ブランチから PR を出す。
- PR の本文は `.github/pull_request_template.md` の見出しに沿って書く。
- PR を出すと、確認用プレビューの URL が PR のコメントに書かれる（閲覧制限あり。本番ではない）。プレビューにも本番の顧客データ・認証情報を入れない。
