#!/usr/bin/env python3
"""
自己配信用フォント（WOFF2）と @font-face の CSS を作るスクリプト。
ビルドや CI では実行しない。フォントを差し替えるときだけ手元で実行し、生成物をコミットする。

必要なもの: Python 3、fonttools、brotli（pip install fonttools brotli）
入力（すべて公式配布元から取得したもの。取得元と版は public/fonts/README.txt に記録する）:
  --slices   Google Fonts が日本語フォントの分割に使う頻度順の文字グループ表
             （googlefonts/nam-files の slices/japanese_default.txt、Apache License 2.0）
  --regular  LINESeedJP-Regular.ttf（google/fonts の ofl/lineseedjp/）
  --bold     LINESeedJP-Bold.ttf
  --outfit   Outfit[wght].ttf（google/fonts の ofl/outfit/）
出力:
  --fonts-dir  public/fonts/（WOFF2）
  --css        src/styles/fonts.css（@font-face）

LINE Seed JP は、頻度順の文字グループ（全120）を8つにまとめて分割する。
- 各ファイルの unicode-range は、そのファイルに実際に入っている文字と完全に一致させる
- フォントにある文字はすべてどれかのファイルに入れる（頻度表にない文字は先頭のファイルへ）
- グリフの形・字形の切替（OpenType の機能）・名前表（著作権表示とライセンス）は変更しない
Outfit は文字範囲を変えず、形式だけを WOFF2 に変換する（可変フォントの太さの軸を保持）。
"""
import argparse
import os
import re

from fontTools import subset
from fontTools.ttLib import TTFont

# 頻度順の文字グループ（1が最も使われる）を、どこで区切ってファイルにするか
BOUNDS = [8, 16, 24, 32, 44, 60, 84, 120]


def ranges(codepoints):
    cps = sorted(codepoints)
    out = []
    start = prev = cps[0]
    for cp in cps[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        out.append((start, prev))
        start = prev = cp
    out.append((start, prev))
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in out)


def load_slices(path):
    text = open(path, encoding='utf-8').read()
    blocks = re.findall(r'subsets \{(.*?)\}', text, re.S)
    # ファイル内は優先度の低い順に並んでいるため、逆順にして「よく使う順」にする
    return [[int(c) for c in re.findall(r'codepoints: (\d+)', b)] for b in blocks][::-1]


def options():
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']  # 字形の切替（縦書き・約物の詰めなど）をすべて残す
    opts.name_IDs = ['*']  # 著作権表示・ライセンスを含む名前表をすべて残す
    opts.name_languages = ['*']
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.hinting = True
    return opts


def split_line_seed(path, weight, slices, fonts_dir):
    cmap = set(TTFont(path).getBestCmap())
    groups = []
    seen = set()
    start = 0
    for bound in BOUNDS:
        group = set()
        for s in slices[start:bound]:
            group.update(cp for cp in s if cp in cmap and cp not in seen)
        seen |= group
        groups.append(group)
        start = bound
    groups[0] |= cmap - seen  # 頻度表にない文字（ラテン文字の補助など）も欠落させない
    assert set().union(*groups) == cmap, 'フォントの全文字がどれかのファイルに入っていること'
    faces = []
    for index, group in enumerate(groups, start=1):
        name = f'line-seed-jp-{weight}-{index}.woff2'
        font = TTFont(path)
        subsetter = subset.Subsetter(options())
        subsetter.populate(unicodes=sorted(group))
        subsetter.subset(font)
        # 字形の切替（OpenType の機能）でほかのグループの文字と同じグリフが加わると、
        # その文字の対応も cmap に残る。unicode-range と一致させるため、このグループの文字だけに戻す
        for table in font['cmap'].tables:
            if table.format != 14:  # 異体字セレクターの表（このフォントにはない）は対象外
                table.cmap = {cp: glyph for cp, glyph in table.cmap.items() if cp in group}
        assert set(font.getBestCmap()) == group, f'{name}: 収録文字が範囲と一致すること'
        font.flavor = 'woff2'
        font.save(os.path.join(fonts_dir, name))
        faces.append((name, ranges(group), len(group)))
    return faces


def main():
    parser = argparse.ArgumentParser()
    for key in ('slices', 'regular', 'bold', 'outfit', 'fonts-dir', 'css'):
        parser.add_argument(f'--{key}', required=True)
    args = parser.parse_args()

    slices = load_slices(args.slices)
    css = [
        '/*',
        ' * 自己配信フォントの @font-face（tools/fonts/build-fonts.py で生成。手で編集しない）',
        ' * - Outfit（可変フォント 100〜900）: 欧文の見出し・補助ラベル',
        ' * - LINE Seed JP 400 / 700: 和文の見出し・本文・操作ラベル。よく使う文字順に8分割し、',
        ' *   unicode-range で必要なファイルだけを読み込む（各範囲はファイルの収録文字と一致）',
        ' * - font-display: swap。読み込み前・失敗時は端末の標準書体で表示する',
        ' * - ライセンス: SIL Open Font License 1.1（public/fonts/ の OFL-*.txt）',
        ' */',
    ]

    outfit = TTFont(args.outfit)
    outfit_cmap = set(outfit.getBestCmap()) - {0x0D}  # 改行コードは描画に関係しないため範囲から除く
    outfit.flavor = 'woff2'
    outfit.save(os.path.join(args.fonts_dir, 'outfit-variable.woff2'))
    css += [
        '@font-face {',
        "  font-family: 'Outfit';",
        '  font-style: normal;',
        '  font-weight: 100 900;',
        '  font-display: swap;',
        "  src: url('/fonts/outfit-variable.woff2') format('woff2');",
        f'  unicode-range: {ranges(outfit_cmap)};',
        '}',
    ]

    for weight, path in ((400, args.regular), (700, args.bold)):
        # 範囲の狭いファイル（よく使う文字）を後に書く。範囲は重ならないため順序に意味はないが、読みやすさのため
        for name, unicode_range, count in reversed(split_line_seed(path, weight, slices, args.fonts_dir)):
            css += [
                f'/* {name}: {count}文字 */',
                '@font-face {',
                "  font-family: 'LINE Seed JP';",
                '  font-style: normal;',
                f'  font-weight: {weight};',
                '  font-display: swap;',
                f"  src: url('/fonts/{name}') format('woff2');",
                f'  unicode-range: {unicode_range};',
                '}',
            ]

    with open(args.css, 'w', encoding='utf-8') as f:
        f.write('\n'.join(css) + '\n')


if __name__ == '__main__':
    main()
