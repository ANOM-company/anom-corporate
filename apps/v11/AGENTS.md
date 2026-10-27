# apps/v11 作業ルール（ANOM 自社サイト v11）

このファイルが `apps/v11/` の作業ルールの正本です。同じ階層の `CLAUDE.md` はここを参照するだけの案内です。ルールを変えるときはこのファイルだけを編集してください。

リポジトリのルートにある `CLAUDE.md` の「ビルド不要」「npm不要」・旧デザイン指定は、ルート直下の既存サイト向けです。`apps/v11/` には適用せず、このファイルに従います。

## 1. 範囲

- 作業は `apps/v11/` の中で完結させる。リポジトリのルート（既存サイトのHTML・assets・CNAME・既存の設定）と、ほかの版（`apps/v10/` など）は変更しない。
- CI定義は `.github/workflows/v11-ci.yml` の1本だけ。検証専用で、配信（deploy）はしない。

## 2. 技術構成

- Astro の静的HTML出力 + TypeScript + Tailwind CSS（`@tailwindcss/vite`）。
- Node の版は `.nvmrc`、依存の版は `package.json`（`^` なしの固定）と `package-lock.json` で固定する。依存を追加・更新したら理由と版を PR に書く。
- 今は入れないもの: React などのUIライブラリ、CMS、DB、認証、外部フォーム、外部から読み込むフォント・スクリプト、Cloudflare アダプター、サーバーコード。必要になったら別途合意してから追加する。
- 書体は Noto Serif JP（明朝の見出し。太さ 800 の部分集合）・LINE Seed JP（和文）・Outfit（欧文）の3書体。すべて `public/fonts/` に置いて自己配信し、取得元・版・加工の記録を `public/fonts/README.txt` に残す。明朝の部分集合は `tools/fonts/build-serif-subset.py` で作り、文言（`src/data/site.ts`）を変えたら作り直す。

## 3. デザインと文言

- 構成・色・見出しはオーナーのデザイン画像（PC・スマホ）に合わせる。色・書体・角丸・影・動きの値は `src/styles/global.css` の `@theme` に集約し、部品の中で色コードを増やさない。
- 文言はすべて `src/data/site.ts` に置き、部品には props で渡す。
- 実績の数値・顧客名・お客様の声・新しい料金を作らない。料金・期間・会社情報は現行サイトに載っている内容だけを使う。
- 人物の写真や、生成した架空の人物は使わない（ファーストビューの横顔は canvas と SVG で描く）。
- ロゴはオーナーが用意した原本（メインロゴ・シンボルマークの背景透過 PNG）から `tools/images/build-logos.py` で書き出した `public/images/` の画像とファビコンを使う。形・色・比率を変えない。ヘッダーだけは高さが足りないため、シンボルと「ANOM」の文字を横に並べた版を使う。社名の表記は「株式会社ANOM」。

## 4. 動き

- 動きは意味を運ぶものに絞る（悩み→サービスのつながり、出現、注目の誘導）。
- `prefers-reduced-motion: reduce` ではくり返しの動きを止める。くり返しの動きには「動きを止める」ボタン（`src/scripts/motion.ts`）で止まる仕組みを必ず付ける。JavaScript が動かないときは、くり返しの動きを1回で終える（`global.css` の `:root:not(.js)`）。
- canvas と動くイラストは、画面外・タブ非表示・停止中は描画を止める。

## 5. 部品とアクセシビリティ

- 意味のあるHTMLを優先する（メニューは `<dialog>`、開閉はボタン + `aria-expanded`）。JavaScript は補助に留め、無効でも本文・主要リンク・サービスの詳細が使えること。
- 悩みチップは HTML ではサービスへのリンク、JavaScript で `aria-pressed` のトグルボタンにする。
- 入力欄は `<label>` と結び付け、補足・エラー文は `aria-describedby` で読み上げ対象にする。誤りは入力を終えたあと（`:user-invalid`）に表示し、`aria-invalid` を合わせる。
- フォームは確認用。送信先を持たせない（CSP の `form-action 'none'` も維持）。メール送信・外部API呼び出しを実装しない。

## 6. セキュリティ

- `public/_headers` の CSP は `'self'` のみ。`unsafe-inline`・`unsafe-eval`・外部CDNを追加しない。CSPを外して検証を通さない。
- CSS/JS は外部ファイルとして出力する（`astro.config.mjs` の `inlineStylesheets: 'never'` と `assetsInlineLimit: 0`）。HTMLに `style` 属性・インラインスクリプト・`on*` 属性を書かない。
- `.env`・`*.pem`・`secrets/` の中身は読まない・表示しない・転載しない。
- `wrangler.jsonc` はローカル検証専用。本番の Worker 名・独自ドメイン・資格情報を書かない。`wrangler deploy` を実行しない。
- リポジトリは公開。内部の指示書・会話の全文・個人の端末パス・承認記録・秘密情報をコミットしない。

## 7. 検証（変更のたびに実行）

```
npm run check     # 型確認
npm run lint      # Lint
npm run build     # dist/ に静的出力
npm run test:e2e  # dist/ をローカルの Wrangler で配信してブラウザーテスト
npm run audit     # 依存の脆弱性検査（高以上で失敗）
```

- テストを飛ばす・無効化する・常に成功させる変更はしない。失敗は PR に明記する。
- 自動テストの合格だけで WCAG 適合とは言わない。PC とスマホの画面を目で確かめる。

## 8. 公開

- GitHub への push と本番公開は別の工程。本番公開・Cloudflare の設定変更・DNS 変更は、オーナーの承認なしに行わない。
- `main` へ直接 push しない。作業ブランチから PR を出す。
