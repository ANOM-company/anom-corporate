# 構成と設計方針

## ディレクトリ

```
apps/v10/
├── astro.config.mjs      静的出力・CSS/JSの外部ファイル化・Tailwind（Vite プラグイン）
├── wrangler.jsonc        ローカル配信の設定（dist/ を配信、404-page 方式）
├── playwright.config.ts  ブラウザーテストの設定（Wrangler を起動して dist/ をテスト）
├── public/
│   ├── _headers          CSP などのレスポンスヘッダー（dist/ にコピーされる）
│   ├── fonts/            自己配信の書体（WOFF2）・ライセンス全文・取得元の記録
│   └── favicon.svg
├── src/
│   ├── components/       共通部品（Button・Input・Select・Checkbox・Card・Navigation・Modal・FAQ・CTA など）と
│   │                     トップの区画（HomeHero・HeroDemo・ServiceFeature・SystemFeature・WorkflowExample・
│   │                     AboutSection・ProcessSection・LearningSection・ContactSection）、下部バー（BottomNav）、
│   │                     展開メニュー（MenuDialog）、ヘッダー・フッター
│   ├── data/home.ts      トップの文言（部品には文言を持たせない）
│   ├── layouts/          全ページ共通の骨組み（下部バー・展開メニュー・フッターを含む）
│   ├── pages/            / ・ /kitchen-sink/ ・ 404
│   ├── scripts/          補助スクリプト（モーダル・下部バー・画面デモの切替・相談フォーム・部品見本）
│   ├── styles/
│   │   ├── global.css    設計トークンと基本スタイル
│   │   └── fonts.css     @font-face（tools/fonts/build-fonts.py で生成）
│   └── site.ts           サイト名・メニュー項目・下部バーの項目
├── tools/fonts/          書体の分割・変換スクリプト（手元で実行。ビルド・CIでは使わない）
└── tests/                Playwright のテスト
```

## トップページ（`/`）

上から次の順に並び、各区画にページ内リンク用の id があります。

| 区画 | id | 内容 |
|---|---|---|
| 冒頭 | `top` | 見出し・説明・「提供サービスを見る」と、3つの画面デモ（AI・DX／Web／システム）の切替 |
| 提供サービス | `services`・`service-ai`・`service-web` | AI・DX支援と Web制作・運用保守を同じ構成・同じ大きさで並べる |
| システム開発 | `service-system` | 独立した区画と相談ボタン。スマホ幅は 本文→図→相談ボタン の縦順、PC は本文と図を左右に置き相談ボタンは本文の下（HTML の順も 本文→図→相談ボタン） |
| 支援のイメージ | `examples` | 説明用の例（実績ではないことを明示し、操作できる要素を置かない） |
| ANOMの考え方 | `about` | |
| 相談からの進め方 | `process` | 4つの段階 |
| 学びの計画 | `learning` | 2項目とも「構想中」。日程・料金・申込みは置かない |
| 相談フォーム | `contact`・`contact-privacy` | 入力だけを確かめる確認版（後述） |
| サイト案内（フッター） | `site-navigation` | 展開メニューと同じ項目。JavaScript が無効のときのメニューの代わり |

トップ以外のページでは、下部バー・メニュー・フッターのリンクはトップの該当位置（`/#...`）へ移ります（`src/site.ts` の `anchorHref`）。

## 画面デモの切替（`src/scripts/hero-tabs.ts`）

- WAI-ARIA のタブの構造（`tablist`・`tab`・`tabpanel`）で、矢印・Home・End でタブ間を移動し、Enter／Space で表示を切り替える（手動切替）
- 3つのパネルを同じ格子のマスに重ね、選んでいないパネルは `hidden`（見た目は `visibility: hidden`）にする。高さが変わらないため、切り替えても下の本文が動かない
- 図形は最初の表示で1回だけ組み上がる（900ms 以内）。切替時は選んだパネルだけが短く現れる（320ms）
- JavaScript が無効のときはタブを出さず、3つの説明とリンクを縦に並べる（`@media (scripting: none)`）

## 下部バーと展開メニュー

- 下部バー（`BottomNav`）は「サービス／相談する／メニュー」。画面下中央に固定し、PC は最大 440px
- 「メニュー」は `<dialog>` を下から上へ開くボタン（`aria-expanded`・`aria-controls`）。JavaScript が無効のときは、フッターのサイト案内へのリンクになる
- 展開メニュー（`MenuDialog`）は下記「モーダルとフォーカス」の仕組みを使う。開くと見出しへフォーカスし、背面のスクロールを止める（`html[data-scroll-locked]`）。項目が収まらない短い画面では項目の部分だけを縦にスクロールし、見出しと「閉じる」は常に見える
- サイトの案内のため `role="menu"` は使わず、通常のナビゲーションのリンクにする
- 文字サイズの設定を大きくしてバーの幅が `--container-bar-stack`（16.25rem。4文字のラベルが3等分の1列に入る最小の幅）を下回るときは、3項目を HTML の順に縦に並べ、各ラベルを1行に収める。横のままだとラベルが1文字ずつ折り返し、背の高くなったバーの丸い角の外へ文字が出て明るい地に重なるため。縦のときはバーの角の丸みを項目の丸みに合わせ（`--radius-bar-stack`）、押せる高さは 44px 以上を保つ（`--spacing-tap`）。判定はバーの幅で行うため、`<nav>` を `@container` とし、色・丸み・影は中の `<ul>` に付ける（通常の文字サイズの見た目は従来どおり）
- 下部バーの高さは `--bar-height`（`src/scripts/bottom-nav.ts` が文字の拡大に合わせて更新）。`html` の `scroll-padding-bottom` とフッター下の余白に使い、ページ内リンク・Tab 移動の行き先がバーの裏に隠れないようにする
- スクリプトが動く前と JavaScript が無効のときは、横1段の高さ `--bar-height-row`（4rem）を使う。JavaScript が無効のまま文字を大きくして下部バーが縦に並ぶ幅では、フッターの中で縦3段の高さ `--bar-height-stack` との差（`--bar-stack-extra`）を下の余白に足し、フッターの最後の内容とバーの間を有効時と同じだけ空ける。フッターは画面の幅いっぱいの `@container` のため、境目は `--container-page-bar-stack`（`--container-bar-stack`＋バーの左右の余白 2rem）。`html` の `scroll-padding-bottom` は画面全体の設定でバーの並び方を CSS で知る方法がないため、JavaScript 無効時は横1段の高さのまま

## 相談フォーム（確認版）

- `<form>` 要素を置かず、入力欄を `<fieldset>` でまとめる。送信ボタンは無効（`disabled`）で、理由を `aria-describedby` で読み上げる。JavaScript の有無にかかわらず、Enter やクリックで送信・ページ移動・通信が起きない（CSP も `form-action 'none'`）
- サービス欄の相談ボタンは、通常の `#contact` へのリンクとして移動しつつ、相談分野だけを設定する。ほかの入力は変えず、変えたことを見出し直後の状態文（`role="status"`）で伝える
- スマホ幅では、文字入力・選択欄にフォーカスしている間だけ下部バーを隠す（`visibility: hidden` のため Tab 順・読み上げからも外れる）。PC・タブレットでは表示したままにし、複数行の入力欄にフォーカスしたときは欄の全体がバーより上に見える位置へ移す
- 送信中・受付完了・送信失敗・入力不備の各状態は、部品の確認画面（`/kitchen-sink/#ks-form-states`）に「表示見本」として並べる。実際の送信結果としては表示しない

## 書体

- 和文は LINE Seed JP（見出し・操作ラベルは Bold 700、本文・入力値は Regular 400）、英字の補助ラベルと欧文の見出しは Outfit（可変フォント）
- `public/fonts/` から自己配信し、外部へは接続しない。先読み（preload）はしない。`font-display: swap` で、読み込み前や失敗時は端末の標準書体で表示する。`font-synthesis: none` で、太字・斜体の擬似的な合成をしない
- LINE Seed JP は、よく使う文字の順に太さごとに8ファイルへ分割し、`unicode-range` で必要なファイルだけを読み込む。各ファイルの収録文字と `unicode-range` は一致させ、元のフォントの全8,341文字をどれかのファイルに入れている（テストで WOFF2 の収録文字表を読んで確認）
- 見出しは文節の途中で改行しない（H1 は `<wbr>` と `word-break: keep-all`、H2・H3 は `word-break: auto-phrase`）

## 設計トークン

`src/styles/global.css` の `@theme` で、Tailwind のユーティリティ名として使える値を定義しています。

| 種類 | 例 | 使い方 |
|---|---|---|
| 色 | `--color-ink`, `--color-brand`, `--color-danger` | `text-ink`, `bg-brand`, `border-danger` |
| 図形の色 | `--color-shape`, `--color-shape-line`, `--color-shape-accent` など | 画面デモ・サービスの図の SVG（`fill-shape` など） |
| 書体 | `--font-sans`（LINE Seed JP）, `--font-heading`（Outfit → LINE Seed JP）, `--font-latin`（Outfit） | `font-sans`, `font-latin` |
| 文字サイズ | `--text-base` 〜 `--text-3xl`, `--text-display`（H1）, `--text-heading`（H2）, `--text-subheading`（行間付き） | `text-xl`, `text-display` など |
| 幅（見出し・区画） | `--container-hero-title`（トップの H1 の最大幅 6.5em）, `--container-split`（12列の区画を左右に分ける幅 56rem）, `--container-bar-stack`（下部バーを横1段に並べる最小の幅 16.25rem）, `--container-page-bar-stack`（同じ境目をフッターの幅で表したもの 18.25rem） | `max-w-(--container-hero-title)`, `lg:@split:grid-cols-12`, `@max-bar-stack:grid-cols-1`, `@max-page-bar-stack:pb-(--bar-stack-extra)` |
| 余白 | `--spacing`（基準 0.25rem）, `--spacing-section`, `--spacing-tap`（押せる範囲の最小の高さ 44px） | `p-4`, `py-(--spacing-section)`, `min-h-tap` |
| 幅 | `--container-content`, `--container-prose`, `--container-menu`, `--container-bar` | `.container-content`, `max-w-(--container-prose)` |
| 角丸 | `--radius-control`, `--radius-card`, `--radius-demo`, `--radius-bar-stack`（縦に並べた下部バー） | `rounded-control`, `rounded-bar-stack` など |
| 動き | `--duration-fast`, `--duration-base`, `--duration-build`, `--duration-switch`, `--duration-menu-open` / `-close`, `--ease-standard` | `duration-(--duration-base) ease-standard` |
| 下部バー | `--bar-height`（スクリプトが設定）, `--bar-height-row`・`--bar-height-stack`（初期値）, `--bar-offset`, `--bar-clearance`, `--bar-stack-extra`（`:root` の変数） | 固定位置・余白の計算 |
| フォーカス表示 | `--color-focus`（輪郭）, `--color-focus-halo`（白の縁取り） | `:focus-visible` で自動適用（部品側の指定は不要） |

フォーカス表示は「要素 | 白 2px | 青の輪郭 3px | 白 2px | 地」の二重輪郭です。明るい地では青の輪郭が、暗い地では外側の白が、隣り合う色と 3:1 以上になります。

動き低減の設定（`prefers-reduced-motion: reduce`）では、時間の値を 0 にし、すべての要素の `animation` と `transition` を `none` にします。時間を極小にするだけでは動きの1コマ目（透明・ずれた位置）が残ることがあるため、動きそのものを外して完成した状態をすぐに表示します（各 `@keyframes` の終わりは要素の通常の状態と同じです）。

### 文字サイズと文字の拡大

- 文字サイズはすべて rem で指定し、見出し（`--text-display` / `--text-heading` / `--text-subheading` / `--text-3xl`）は画面幅の区切り（640 / 768 / 1024 / 1280px）ごとに段階で大きくします（値は `global.css` の `:root`）。画面幅（vw）や列幅（cqi）を混ぜないため、ブラウザーの文字サイズ設定を上げると見出しも本文と同じ比率で大きくなります。
- 冒頭・ANOMの考え方・相談・フッターの12列の区画は、`@container` を付けたセクションの幅が `--container-split`（56rem）以上で、かつ画面幅 1024px 以上のときだけ左右に分けます。rem は文字サイズに比例するため、文字サイズ設定を大きくすると1列に戻り、大きな見出しを広い幅で折り返します（通常の文字サイズでは従来どおり 1024px 以上で左右）。
- トップの H1「技術を、／仕事の力に。」は、最大幅（6.5em）で常に文節ごとの2行にします。後半の文節（約6em）は入り、2つの文節を合わせた長さ（字幅の狭い端末の書体でも約8.7em）は入らない幅のため、書体の読み込みの前後や端末の書体の違いで改行位置と高さが変わりません。

## セキュリティヘッダーと CSP

- `public/_headers` で全URLに CSP・`X-Content-Type-Options: nosniff`・`Referrer-Policy`・`X-Robots-Tag: noindex, nofollow` などを付けます。404 応答にも同じヘッダーが付くことをテストで確認しています。
- CSP は `script-src 'self'; style-src 'self'` などすべて同一オリジンのみ。インライン実行を許可しないため、ビルド設定で CSS/JS を必ず外部ファイルに出力し、生成された HTML にインラインのスクリプト・スタイル・`style` 属性・`on*` 属性がないことをテストで確認しています。
- `form-action 'none'` とし、部品の確認画面のフォームの見本は `method="dialog"` で送信先を持ちません。トップの相談フォームは `<form>` 自体を置きません。
- 書体を含め、閲覧時の通信はすべて同一オリジンです（テストで全リクエストを確認）。

## モーダルとフォーカス

ネイティブの `<dialog>`（`showModal()`）を使い、独自のTab閉じ込め処理は入れていません。保証しているのは「モーダル表示中に背景のページ要素へフォーカスが移らないこと」です。最後（先頭）の要素の次でブラウザーの操作部へ移ることがあり、そこから戻るとモーダルの反対側の端に戻ります。テストはこの順序どおりであることを確認し、ページ内でのフォーカス喪失は失敗として扱います。

モーダル内のページ内リンクは、モーダルを閉じてから移動先へフォーカスを渡します（見出しなどには `tabindex="-1"` を付けます）。Esc・閉じるボタン・背景クリックで閉じた場合は、開いたボタンへ戻します。

## 404

`wrangler.jsonc` の `assets.not_found_handling: "404-page"` により、存在しないURLには `dist/404.html` が 404 ステータスで返ります。

## テストの範囲

| 観点 | ファイル |
|---|---|
| HTTPステータス・ヘッダー・404・`_headers` 非公開、生成HTMLにインライン要素がない | `tests/pages.spec.ts` |
| 320 / 360 / 390 / 768 / 1440px の横はみ出し（スクリーンショット保存） | `tests/pages.spec.ts` |
| リンク・CSS・JS・画像の読み込み、表示中の通信がすべて同一オリジン | `tests/pages.spec.ts` |
| トップ: 初回表示（動きを待たない）、サービスの扱い（AI・DX と Web が同じ構成・大きさ、システム開発の独立した入口、構想中の表示、実績・料金の表記なし）、アンカー・ハッシュ直開き・戻る／進む、画面デモのタブ（キーボード・連打・ずれなし）、相談フォーム（ラベル・送信しない・分野の引継ぎ・下部バーの一時非表示）、システム開発の並び順（スマホ: 本文→図→相談ボタン、PC: 左右）、下部バーとの重なり（Tab 全巡回・文字 200%: 見出しの実寸が2倍・はみ出し・重なり・区画の1列化・短い画面） | `tests/home.spec.ts` |
| 下部バーと展開メニュー（マウス・タップ・キーボード・Esc・背景・ドラッグ・全リンクの移動先・戻る／進む・連打・短い画面・幅の変更、文字 200% の下部バー: ラベルが1行・文字が背景の丸い形の内側・縦並び・操作） | `tests/menu.spec.ts` |
| 書体（実際に描画された書体・外部通信なし・読み込み量・読み込めないときの表示・ライセンス・分割ファイルの収録文字・見出しの改行） | `tests/fonts.spec.ts` |
| 表示のずれ（初回表示・デモ切替・メニュー）と操作の応答。通常と通信制限＋CPU 4倍遅延の両方で計測し、数値を添付。字幅の狭い端末の書体（Windows: Yu Gothic UI／Meiryo UI、Linux: IPA Pゴシック）で先に表示し、自己配信の書体に切り替わっても H1 の改行と高さが変わらないこと | `tests/loading.spec.ts` |
| 部品見本: ナビ、モーダル（Tab・Shift+Tab で背景へ移らない・Esc とフォーカス復帰・内部のページ内リンク）、FAQ、フォームのラベルとエラー、Tab移動・本文へ移動 | `tests/interactions.spec.ts` |
| フォーカス表示と隣り合う色のコントラスト（全Tab停止位置の計算値。展開メニューの中を含む。明暗の地の撮影ピクセル） | `tests/focus-contrast.spec.ts` |
| JavaScript無効時の本文・リンク・メニュー・画面デモ・相談フォーム・ページ最下端の余白（文字 200% で下部バーが縦に並んでも、フッターの最後の内容とバーの間が 24px 以上。文字サイズと画面の幅を変えても、下部バーの高さの初期値が実際の高さと合う）、動き低減（動きがなく、切替・メニューを開いた直後から完成した表示） | `tests/no-js-and-motion.spec.ts` |
| axe による自動検査（各ページ、部品見本のエラー・モーダル表示中、トップの展開メニュー表示中・相談分野の引継ぎ後。開閉などの動きが終わってから判定。重大・深刻は0件で合格、全指摘を該当要素とともに添付） | `tests/accessibility.spec.ts` |
| 監査・目視確認用の画面記録（PC・スマホのトップ全体、メニュー、フォームの表示見本） | `tests/screens.spec.ts` |

すべてのテストで、ブラウザーの実行エラー・コンソールエラー（CSP違反を含む）・同一オリジンの読み込み失敗が1件でもあれば失敗します（`tests/fixtures.ts`）。

自動検査で確認できるのはアクセシビリティの一部です。スクリーンリーダーでの読み上げ、拡大表示、実機での操作などは別途人の確認が必要です。
