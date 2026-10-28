#!/usr/bin/env python3
"""ロゴの原本（背景透過 PNG）から、サイトで使うロゴ画像とファビコンを書き出す。

使い方（apps/v11 で実行。ビルドや CI では実行しない）:
    python3 tools/images/build-logos.py <メインロゴ背景透過.png> <シンボルマーク単体背景透過.png>

- 原本は 1024×1024 の背景透過 PNG（メインロゴ = シンボル・「ANOM」・英字の縦組み）。ロゴの形と色は変えない
- 出力（public/ の下）:
    images/logo.png             メインロゴ（縦組み・原本どおり）。フッター用
    images/logo-horizontal.png  シンボルと「ANOM」の文字を横に並べたもの。高さの低いヘッダー用（英字は小さすぎて読めないため省く）
    favicon.png                 32px（白地。暗い色のタブでもロゴの黒い部分が見えるように）
    icon-192.png                192px（白地）
    apple-touch-icon.png        180px（白地。iPhone のホーム画面用）
- 画像は表示サイズの約3倍で書き出す（高精細の画面でもぼやけないように）
必要なもの: Pillow（pip install pillow）
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public'
WHITE = (255, 255, 255, 255)


def load(path: str) -> Image.Image:
    image = Image.open(path).convert('RGBA')
    if image.size != (1024, 1024):
        sys.exit(f'{path}: 1024×1024 の原本を指定してください（{image.size}）')
    return image


def trim(image: Image.Image) -> Image.Image:
    """透明な余白を切り落とす"""
    box = image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return image.crop(box)


def rows_with_ink(image: Image.Image) -> list[tuple[int, int]]:
    """不透明な画素がある行のまとまり（上から: シンボル・「ANOM」・英字）"""
    alpha = image.getchannel('A').point(lambda a: 255 if a > 16 else 0)
    width, height = image.size
    pixels = alpha.load()
    groups: list[tuple[int, int]] = []
    start = None
    for y in range(height):
        filled = any(pixels[x, y] for x in range(width))
        if filled and start is None:
            start = y
        elif not filled and start is not None:
            groups.append((start, y - 1))
            start = None
    if start is not None:
        groups.append((start, height - 1))
    return groups


def resize_to_height(image: Image.Image, height: int) -> Image.Image:
    width = round(image.width * height / image.height)
    return image.resize((width, height), Image.LANCZOS)


def save_png(image: Image.Image, path: Path) -> None:
    """紺と黒の2色のロゴなので、64色のパレット PNG にして軽くする（輪郭のなめらかさは保たれる）"""
    path.parent.mkdir(parents=True, exist_ok=True)
    image.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)
    print(f'{path.relative_to(ROOT)}  {image.width}×{image.height}  {path.stat().st_size:,} bytes')


def icon(symbol: Image.Image, size: int, padding: float) -> Image.Image:
    """白地の正方形の中央にシンボルを置く"""
    inner = round(size * (1 - padding * 2))
    mark = symbol.copy()
    mark.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), WHITE)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas.convert('RGB')


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main_logo = load(sys.argv[1])
    symbol = trim(load(sys.argv[2]))

    # フッター用: 縦組みのメインロゴをそのまま（余白だけ切り落として幅 540px）
    stacked = trim(main_logo)
    save_png(stacked.resize((540, round(stacked.height * 540 / stacked.width)), Image.LANCZOS), OUT / 'images' / 'logo.png')

    # ヘッダー用: シンボル（高さ 96px）＋「ANOM」の文字（シンボルの半分の高さ）を横に並べる
    groups = rows_with_ink(main_logo)
    if len(groups) != 3:
        sys.exit(f'メインロゴを「シンボル・ANOM・英字」の3段に分けられませんでした（{groups}）')
    top, bottom = groups[1]
    wordmark = trim(main_logo.crop((0, top, main_logo.width, bottom + 1)))
    mark_h = 96
    mark = resize_to_height(symbol, mark_h)
    word = resize_to_height(wordmark, round(mark_h * 0.42))
    gap = round(mark_h * 0.28)
    lockup = Image.new('RGBA', (mark.width + gap + word.width, mark_h), (0, 0, 0, 0))
    lockup.alpha_composite(mark, (0, 0))
    # 文字の下端をシンボルの下端にそろえる
    lockup.alpha_composite(word, (mark.width + gap, mark_h - word.height))
    save_png(lockup, OUT / 'images' / 'logo-horizontal.png')

    # ファビコン類（白地）
    save_png(icon(symbol, 32, 0.06), OUT / 'favicon.png')
    save_png(icon(symbol, 192, 0.1), OUT / 'icon-192.png')
    save_png(icon(symbol, 180, 0.12), OUT / 'apple-touch-icon.png')


if __name__ == '__main__':
    main()
