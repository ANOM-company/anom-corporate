#!/usr/bin/env python3
"""見出し用の明朝体（Noto Serif JP）を、サイトで使う文字だけに絞って WOFF2 にする。

使い方（apps/v11 で実行。ビルドや CI では実行しない）:
    python3 tools/fonts/build-serif-subset.py <NotoSerifJP[wght].ttf のパス>

- 太さ 800 の静的フォントに固定してから、src/data/site.ts に出てくる文字＋半角英数字・記号だけを残す
- 出力: public/fonts/noto-serif-jp-800-subset.woff2 と src/styles/serif-font.css（@font-face）
- 原稿（src/data/site.ts）の見出しを変えたら、この手順で作り直す
  （tests/fonts.spec.ts が、明朝体で表示する文字がすべて収録されているかを確かめる）
必要なもの: fonttools と brotli（pip install fonttools brotli）
"""

import hashlib
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
SOURCE_TEXT = ROOT / 'src' / 'data' / 'site.ts'
OUT_FONT = ROOT / 'public' / 'fonts' / 'noto-serif-jp-800-subset.woff2'
OUT_CSS = ROOT / 'src' / 'styles' / 'serif-font.css'
WEIGHT = 800


def collect_codepoints() -> list[int]:
    text = SOURCE_TEXT.read_text(encoding='utf-8')
    points = {ord(ch) for ch in text if ord(ch) >= 0x3000}
    # 半角の英数字・記号（見出しに入る可能性があるもの）
    points.update(range(0x20, 0x7F))
    # よく使う全角の約物
    points.update(ord(ch) for ch in '、。・「」『』（）！？：；〜ー―…“”‘’')
    return sorted(points)


def to_ranges(points: list[int]) -> str:
    ranges = []
    start = prev = points[0]
    for cp in points[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        ranges.append((start, prev))
        start = prev = cp
    ranges.append((start, prev))
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in ranges)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit('使い方: python3 tools/fonts/build-serif-subset.py <NotoSerifJP[wght].ttf>')
    source = Path(sys.argv[1])
    digest = hashlib.sha256(source.read_bytes()).hexdigest()

    font = TTFont(source)
    static = instancer.instantiateVariableFont(font, {'wght': WEIGHT}, updateFontNames=True)

    wanted = collect_codepoints()
    cmap = static.getBestCmap()
    covered = [cp for cp in wanted if cp in cmap]

    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=covered)
    subsetter.subset(static)
    static.flavor = 'woff2'
    static.save(OUT_FONT)

    OUT_CSS.write_text(
        '/*\n'
        ' * 見出し用の明朝体（tools/fonts/build-serif-subset.py で生成。手で編集しない）\n'
        f' * - Noto Serif JP を太さ {WEIGHT} に固定し、原稿で使う文字だけを収録（{len(covered)}文字）\n'
        ' * - unicode-range は収録文字と一致。範囲外の文字は端末の明朝体で表示する\n'
        ' * - ライセンス: SIL Open Font License 1.1（public/fonts/OFL-NotoSerifJP.txt）\n'
        ' */\n'
        '@font-face {\n'
        "  font-family: 'ANOM Serif';\n"
        '  font-style: normal;\n'
        f'  font-weight: {WEIGHT};\n'
        '  font-display: swap;\n'
        f"  src: url('/fonts/{OUT_FONT.name}') format('woff2');\n"
        f'  unicode-range: {to_ranges(covered)};\n'
        '}\n',
        encoding='utf-8',
    )
    print(f'source sha256 {digest}')
    print(f'{OUT_FONT.name}: {OUT_FONT.stat().st_size} bytes, {len(covered)} code points')


if __name__ == '__main__':
    main()
