# ANOM コーポレートサイト — プロジェクト CLAUDE.md

> **適用範囲の注記（2026-10-18 追加・以下の本文より優先）**
> - 本文の「ビルド工程を持ち込まない／npm不要」などの旧ビルド不要ルールと、§3・§4 の旧デザイン指定は、**ルート直下の既存サイト向け**です。
> - `apps/v10/` は Astro＋Tailwind CSS を使い、同フォルダの `apps/v10/AGENTS.md` のルールに従います。本文の「ビルド不要」とは衝突しますが、`apps/v10/` に限り同フォルダのルールを優先します。
> - 現在の本番配信は **Cloudflare** です。本文 §1・§6・§8 の「GitHub Pages」「push で自動反映」の記述は現状と異なります。**GitHub への push と本番公開は別の工程**です。
> - 共通の秘密情報の保護（§0-6・§7）と、本番公開前の承認は、引き続きリポジトリ全体で有効です。

> このファイルは **anom-corporate リポジトリの技術司令塔**。
> ブランド・事業方針は `../../CLAUDE.md`（claude 秘書）と `~/.claude/CLAUDE.md`（グローバル）を参照。
>
> **2026-06-11 に全面刷新**: 旧Astro版（v1〜v3）は `archive/astro-v3` ブランチに完全保存。
> 現行は **ビルド不要の静的サイト**（HTML/CSS/JS直書き、npm不要）。

---

## 0. 絶対ルール

1. **ビルド工程を持ち込まない** — npm/バンドラ不要のまま保つ。テキスト修正→push だけで公開が完結する状態を守る
2. **コメントは日本語** — 保守する人（非エンジニア含む）が読める状態を維持
3. **ライブラリは `assets/vendor/` の同梱版を使う** — CDN直リンクに戻さない（供給網リスク・障害対策）。更新時はバージョンを明記してファイル差し替え
4. **CSPを壊さない** — 外部サービス追加時は index.html のCSPメタに追記。inlineスクリプト/styleは書かない（CSPで遮断される）
5. **ブランドアセット準拠** — `../ブランドアセット/` の色・ロゴ使用ルールに従う
6. **シークレットをコミットしない** — Web3Formsのアクセスキーは公開可能設計のため例外（ドメイン制限を併用）
7. **実装後はプレビューで確認** — `preview_start: anom-site`（port 4500）でPC/モバイル両方を目視

## 1. リポジトリ概要

- **GitHub:** https://github.com/tapiAI-coder/anom-corporate
- **公開:** GitHub Pages（main ブランチ / ルート配信）
- **本番URL:** https://anom-ai.com/ （独自ドメイン。GitHub Pagesのカスタムドメイン機能で接続）
- **ブランチ:** `main`=本番 ／ `archive/astro-v3`=旧Astro版アーカイブ（触らない・消さない）

## 2. ファイル構成と編集の早見表

```
anom-corporate/
├── index.html          ← 本編1ページ（文言修正はここ）
├── privacy.html        ← プライバシーポリシー
├── 404.html            ← Not Foundページ
├── robots.txt          ← ★URL変更時に更新
├── sitemap.xml         ← ★URL変更時に更新
├── assets/
│   ├── css/style.css   ← 全スタイル（冒頭に目次コメントあり）
│   ├── js/
│   │   ├── config.js   ← 運用設定（Web3Formsキー・メールアドレス）★運用で触るのは原則ここだけ
│   │   ├── main.js     ← 起動・ナビ・スクロール制御
│   │   ├── particles.js← 旧WebGL粒子（v6で読み込み停止・ファイル温存）
│   │   ├── animations.js← GSAPスクロール演出・カーソル演出
│   │   └── form.js     ← フォーム送信処理
│   ├── vendor/         ← 同梱ライブラリ（GSAP 3.12.5 / ScrollTrigger 3.12.5 / Lenis 1.1.14 ※Three.js r128は読込停止・温存）
│   ├── img/            ← favicon / apple-touch-icon / ogp / hero-tex.webp（静止フォールバック）/ seq/（スクラブ連番: hero・shindan・line・grow・build 各61枚）※svc-*.webp等は未参照の温存分
│   └── video/          ← 原盤動画（hero-tex-loop.mp4・svc-*.mp4。未参照・スクラブ再分割用に温存）
└── docs/               ← 本番化計画.md / 運用マニュアル.md
```

**★URL を含むファイル**（ドメイン変更時に一括更新）: index.html（canonical / og:url / og:image / JSON-LD）、robots.txt、sitemap.xml

## 3. デザインシステム（v6・タイポ主役エディトリアル 2026-07改修）

| トークン | 値 | 用途 |
|---|---|---|
| `--paper` | `#F4F2EC` | 地の色（温白の紙。サイト全体の基調） |
| `--paper-2` | `#ECE9E0` | 一段沈めた紙（メディア下地・フォーム背景・個人レーン） |
| `--ink` | `#16130E` | 主役の文字色（温かい黒＝インク） |
| `--ink-soft` / `--soft` | `#4A443B` / `#6C665C` | 補助見出し／本文・補足 |
| `--hair` / `--hair-2` | ink14% / ink28% | 罫線／強い罫線・ホバー |
| `--black` / `--on-black` | `#100F0C` / `#EFEBE2` | 効かせどころの黒面（自己言及バンド）とその文字 |
| `--accent` | `#3D39B8` | 抑えた藍（フォーム状態などごく僅かに） |

- **v6の原則**: タイポグラフィ主役。カード面・グラデ・グロー・光の装飾を排し、明朝の大見出し＋罫線（hairline）＋大胆な余白で構成する。参照思想: Vercel（余白と抑制）／Obys・Locomotive（タイポと間）
- 書体: Zen Old Mincho（見出し）+ Zen Kaku Gothic New（本文）+ Fraunces italic（欧文アクセント）、Google Fonts
- **フォント追加時の鉄則**: 日本語Webフォントは1ウェイト増やすごとにUnicodeサブセット分割で数十ファイルのリクエストが増える（2026-07に500超リクエスト事故→使用ウェイトのみに絞って解決済み）。CSSで実際に使うウェイトだけ読み込むこと
- サービスは3つの柱: 導入・伴走（主軸）／育てる／つくる・支える。6個並列にしない
- 旧v5（折衷ダーク・インディゴ）/ v4（白基調）は git 履歴参照。旧v3（Astro）はarchiveブランチ参照

## 4. 演出アーキテクチャ（v6）

- **原則**: Restraint beats spectacle（抑制が見せ場に勝る）。意味を運ぶ動きだけを、控えめに実装する
- **駆動**: Lenis慣性 + GSAP ScrollTrigger（出現・scrub系）+ Intersection Observer（動画の省電力再生）。生のscrollイベント監視はしない。`ScrollTrigger.config({ignoreMobileResize:true})` 維持
- **ヒーロー**: タイポ主役（温白の紙に明朝の大見出し）。スクロールで静かに退場（**ピンなし**。モバイルのアドレスバー伸縮対策としてpinは今後も使わない。退場フェードは削り演出が読めるよう18%地点から開始）
- **ヒーローの削り演出（`.kezuru`）**: メインコピーの「ムダ」をスクロールで削る。語を包むspanに**筆の一閃**（両端がテーパーする塗りパス1本）を重ね、clipPathの矩形幅をscrubで広げて左→右に描く。引き終わると語がopacity .3へ薄まる。**CSS標準状態＝線が引き切られた完成形**（JS無効・低減設定でも意味が通る）。文字分割splitCharsは入れ子要素の中まで分割する（br/svgは除外）
- **物語インタールード（`.interlude`）**: 「乖離→合流」をコピーの前半/後半の"間合い"だけで表現。①`#divergence`＝2語が**ほぼ密着した塊から**上下左右に離れていく（移動量は2語間の実余白をJSで実測、invalidateOnRefreshで再計測） ②`#convergence`＝上下に割れた語が一行に揃う。**CSSの標準状態が完成形**なので、JS無効・reduced-motionでも意味が通る（制御: animations.js `setupInterlude`）。乖離セクションのみ黒背景（--black×--on-black）＝問題は闇・解決は紙、の明暗でも物語る
- **サービス連動**: 4ブロック（`data-svc`）のカード出現＋メディア枠 `.svc-media`（額装した窓。大カード=4:5・柱2/3=16:10）。動画は手前600pxで読込・画面内のみ再生・タブ非表示で停止。素材 `assets/img/svc-*.webp`・`assets/video/svc-*.mp4` が未配置でも下地（--paper-2）表示で壊れない
- **ヴィネット方式のメディア（2026-07-05にキャラクター版へ進化）**: 4枠の背景は**墨の棒人間キャラによる物語動画のスクロールスクラブ**（`assets/img/seq/{shindan,line,grow,build}/`各61枚。診断=PCの前で困るお客様のもとへANOMが来て道具が整う／柱1=現場で二人が見上げる絡まりがほどけて1本に／柱2=ANOMが伝授しお客様が猛タイピング・書類の山が積み上がる／柱3=ANOMが筆でこのサイトの窓を描き上げる）。キャラ設計図は`../ブランドアセット/ANOMキャラクター設計図.webp`（ANOM=塗りつぶし頭＋大筆／お客様=輪郭頭。新素材は必ずこれをnano_banana_proの参照画像にして生成）。その上にDOMオーバーレイ（診断の吹き出し3つ＝物語順b1→b3ans→b2の`[data-at]`ポップ／柱1ラベル`.vl-k`／柱3の実物コピー`.vb-real`）。フォールバック=各シーケンス最終コマ。制御は `setupSeqScrub`＋`setupVignettes`。**CSS標準状態＝完成したシーン**。UseCases4カードには期間の大数字 `.uc-term`
- **カーソルの奥行き（cursor-depth-3dスキル適用）**: ヒーローは多層視差（背景の墨=-10、小さなラベル類=+5〜9。見出しと本文は動かさない＝可読性の鉄則）、サービス4枠は最大±2.5度のカーソルチルト。精密ポインタのみ（タッチ・低減設定は無効。実装は initPointerFX 末尾）
- **ヒーロー質感 `.hero-tex`**: **キャラクター版スクロールスクラブ**＝ANOMの棒人間キャラが「ムダ」の墨の塊を筆で削り落としていく物語（`assets/img/seq/hero/`61枚をcanvasへコマ送り。scroll-video-scrubスキル適用、エンジンは animations.js `setupSeqScrub`・合図は`data-seq`属性）。multiply合成・opacity .46・yPercent 7の薄いパララックス併用。スマホ・低減設定・JS無効は`assets/img/hero-tex.webp`＝振りかぶった開始フレームの静止画（bg位置72% 28%）
- **支援の流れ `.flow-steps`**: 1本の線が5結節点を通って満ちる道のりレール（CSS変数 `--flow-p` をsetupFlowRailがscrubで駆動。スマホは縦レール、低減設定は満ちた完成形で静止）。STEP01に「ここまで無料」タグ
- **HTML側の合図**: `.reveal` `.reveal-group` `.split` `.magnetic` `data-svc` `.interlude`（詳細はanimations.js冒頭コメント）。セクション追加時はこれらを付けるだけで演出が適用される
- **廃止済み（v6・再追加しない）**: WebGL粒子（three.min.js / particles.jsは読み込み停止・ファイル温存）、ヒーローpinトンネル、背景ブロブ、サービス連動グロー、カード3Dチルト、2本線SVGインタールード

## 5. お問い合わせフォーム

- Web3Forms（無料・サーバーレス）。キーは `assets/js/config.js` の `FORM_ACCESS_KEY`
- キー未設定時は送信せずメール案内を表示（安全動作）
- スパム対策: ハニーポット（botcheck）+ Web3Forms側フィルタ。**Web3Forms管理画面でドメイン制限を設定すること**
- 送信テスト手順は `docs/運用マニュアル.md`

## 6. 開発ワークフロー

```
プレビュー起動: preview_start「anom-site」（npx serve, port 4500）
確認:           PC / モバイル両方のスクリーンショット + コンソールエラーゼロ
公開:           git add → commit → push（GitHub Pagesが自動反映、数分）
戻す:           git revert（直前の公開を取り消し）
```

**既知の注意**: CSPメタはプレビューパネルのスクリーンショット機構と干渉する（撮影タイムアウト）。
撮影検証が必要な時だけCSP行を一時コメントアウトし、**検証後に必ず戻す**。
また、プレビューのモバイルエミュレーションはWebGLレイヤーを等倍合成するため粒子が大きく/見切れて写ることがある（実機では正常。DOM座標プローブで検証済み）。

## 7. セキュリティ設計（変更時に維持すること）

- CSPメタ: `script-src 'self'`（インラインJS禁止）・接続先は fonts / web3forms のみ許可
- vendor同梱 + バージョン固定（CDN改ざん・障害の影響を受けない）
- referrer-policy: strict-origin-when-cross-origin
- 外部リンクは `rel="noopener"`（target=_blank時）
- `.env` はgitignore済み（現状シークレットなし）

## 8. 公開・ドメイン

- GitHub Pages: Settings → Pages → Deploy from branch → main / (root)
- 独自ドメイン接続時: ①Pagesにカスタムドメイン設定 ②DNSにCNAME/Aレコード ③★URLファイル一括更新 ④HTTPS強制ON
- 旧Astro版のPages設定はGitHub Actions経由だったが、現行はブランチ配信（Actionsワークフローなし）
