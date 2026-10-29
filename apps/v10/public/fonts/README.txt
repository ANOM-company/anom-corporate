自己配信フォント（apps/v10/public/fonts/）
==========================================

このフォルダのフォントは、閲覧時に外部へ接続せず、サイトと同じ配信元から読み込みます。
@font-face の定義は src/styles/fonts.css（tools/fonts/build-fonts.py で生成）にあります。

■ Outfit
- 用途: 欧文の見出し・英字の補助ラベル・進め方の番号
- ファイル: outfit-variable.woff2（可変フォント。太さ 100〜900）
- 取得元: Google Fonts の配布リポジトリ google/fonts の ofl/outfit/Outfit[wght].ttf
          （上流: github.com/Outfitio/Outfit-Fonts、commit 902773808eb372f70fb34e8946dd1ffe604efc79）
- 版: Version 1.100
- 取得日: 2026-10-19
- 取得したファイルの SHA-256: fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade
- 加工: 形式を TTF から WOFF2 に変換しただけ（収録文字・グリフ・名前表は変更なし）
- 著作権: Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts)
- ライセンス: SIL Open Font License 1.1（OFL-Outfit.txt）

■ LINE Seed JP
- 用途: 和文の見出し（Bold 700）、本文・注記・入力値（Regular 400）、日本語の操作ラベル（Bold 700）
- ファイル: line-seed-jp-400-1〜8.woff2、line-seed-jp-700-1〜8.woff2
- 取得元: Google Fonts の配布リポジトリ google/fonts の ofl/lineseedjp/LINESeedJP-Regular.ttf・LINESeedJP-Bold.ttf
          （上流: github.com/line/seed、commit ea7a320d85172a57dc458507267d82e7c0f2d49a）
- 版: Regular は Version 1.003、Bold は Version 1.010（各ファイルの名前表による）
- 取得日: 2026-10-19
- 取得したファイルの SHA-256:
    LINESeedJP-Regular.ttf 04a6c0077ddb8ba5af3638bd76b4600708dde7b38df047b40fbe6f3af358d3c3
    LINESeedJP-Bold.ttf    67aec2dc10b3ad210d6f7d53b33bbfea42ea28e32fa3834624eee699a638d5ff
- 加工: よく使う文字の順に8ファイルへ分割し、WOFF2 に変換
    - 分割の順序は Google Fonts が日本語フォントに使う頻度順の文字グループ表
      （googlefonts/nam-files の slices/japanese_default.txt、Apache License 2.0）を利用
    - フォントの全収録文字（8,341文字）をどれかのファイルに入れ、欠落させていない
    - CSS の unicode-range は各ファイルの収録文字と一致させている
      （字形の切替のためにほかのファイルの文字と同じグリフが入る場合も、その文字の対応表（cmap）は
        そのファイルに残さない）
    - グリフの形・字形の切替（OpenType の機能）・名前表（著作権表示とライセンス）は変更なし
- 著作権: © LY Corporation
- ライセンス: SIL Open Font License 1.1（OFL-LINESeedJP.txt）

どちらのライセンスにも予約フォント名（Reserved Font Name）の指定はありません。
フォントを販売せず、ライセンス全文を同梱して配布しています。
