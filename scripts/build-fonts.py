#!/usr/bin/env python3
"""
重新切分台北黑體的網頁字型子集。

為什麼需要自己切：
上游的 webfont 套件是按 Unicode 區塊順序切分 CJK，但繁體中文常用字平均散佈在
整個 U+4E00–U+9FFF，導致一頁 200 個中文字幾乎命中每一個區塊 —— 實測首頁要下載
37 個檔、7.88 MB。

這裡改成只切一份「常用字」子集：ASCII、全形標點、注音，加上 Big5 一級字
（5401 個常用字）。Big5 的一級／二級分區本身就是繁中的字頻分級，且 Python 內建
big5 編碼表，不需要外部字表檔就能離線重現。

刻意不使用 unicode-range：
它的唯一好處是「頁面沒用到這些字時就不下載」，但本站必定是滿版中文，子集一定會被
下載 —— 精確列出六千多個碼位只會讓 CSS 多出 60 KB 以上的 render-blocking 體積。
子集未收錄的罕用字，瀏覽器會自動退到 font stack 的下一個字型（蘋方／微軟正黑），
只有該字的字形不同，不會缺字。

用法：
    python3 -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python scripts/build-fonts.py

產出（已納入版控，平時不需重跑）：
    src/fonts/*.woff2
    src/fonts/taipei-sans-tc.css
"""

from __future__ import annotations

import hashlib
import pathlib
import sys
import urllib.request

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / '.fontcache'
OUT = ROOT / 'src' / 'fonts'

# 台北黑體 Beta 1.000，OFL-1.1。
# 原始來源為 https://github.com/vp-tw/taipei-sans-tc （以 Git LFS 存放，下載極慢），
# 這裡改走 jsdelivr 上的 @fontpkg/taipei-sans-tc-beta —— sha256 與原始來源逐位元相同，
# 下方的雜湊檢查同時扮演「確認取得的是同一份字型」的角色。
SOURCES = [
    (
        'Regular',
        400,
        'https://cdn.jsdelivr.net/npm/@fontpkg/taipei-sans-tc-beta@1.0.0/TaipeiSansTCBeta-Regular.ttf',
        '8cc967e1e428c552701c461e8169e6ae76c7a23694ea1a6a786d6746adec53c4',
    ),
    (
        'Bold',
        700,
        'https://cdn.jsdelivr.net/npm/@fontpkg/taipei-sans-tc-beta@1.0.0/TaipeiSansTCBeta-Bold.ttf',
        '5249d3bdda9c9f4c62840e804b4d2530b7f4dfab6d68fb508c120b0e7e600419',
    ),
]

# 非漢字但必備的區段：拉丁、全形標點、注音、常用符號
BASE_RANGES = [
    (0x0020, 0x007E),  # Basic Latin
    (0x00A0, 0x00FF),  # Latin-1 Supplement
    (0x2010, 0x203B),  # 常用標點、破折號、引號
    (0x2460, 0x2473),  # 圈號 ①②③
    (0x2500, 0x254B),  # 製表符
    (0x25A0, 0x25CF),  # 幾何圖形
    (0x3000, 0x303F),  # CJK 標點
    (0x3100, 0x312F),  # 注音符號
    (0xFE30, 0xFE4F),  # CJK 相容標點
    (0xFF00, 0xFFEF),  # 全形英數與標點
]


def big5_level1() -> set[int]:
    """用 Big5 編碼表推出符號區與一級字（常用字 5401）的 Unicode 碼位。"""
    codes: set[int] = set()

    # lead byte A1–A3 為符號區，A4–C6 為一級字；C9 以後是二級字（次常用），不收。
    for lead in range(0xA1, 0xC7):
        for trail in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
            try:
                codes.add(ord(bytes((lead, trail)).decode('big5')))
            except UnicodeDecodeError:
                continue

    return codes


def fetch(url: str, sha256: str, dest: pathlib.Path) -> pathlib.Path:
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == sha256:
        return dest

    print(f'  下載 {dest.name} …')
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)

    digest = hashlib.sha256(dest.read_bytes()).hexdigest()
    if digest != sha256:
        sys.exit(f'sha256 不符：{dest.name}\n  預期 {sha256}\n  實際 {digest}')
    return dest


def build_subset(src: pathlib.Path, codepoints: set[int], out: pathlib.Path) -> set[int]:
    """切出子集並回傳實際涵蓋的碼位（字型未收錄的字會被剔除）。"""
    options = subset.Options()
    options.flavor = 'woff2'
    options.hinting = False          # 螢幕上看不出差別，但檔案小很多
    options.desubroutinize = False
    options.notdef_outline = False
    options.layout_features = ['kern', 'liga', 'vert', 'vrt2']
    options.drop_tables += ['DSIG']

    font = subset.load_font(str(src), options)
    covered = codepoints & set(font.getBestCmap().keys())

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=covered)
    subsetter.subset(font)

    out.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(out), options)
    font.close()
    return covered


def main() -> None:
    base = {code for lo, hi in BASE_RANGES for code in range(lo, hi + 1)}
    charset = base | big5_level1()
    print(f'目標字集：{len(charset)} 個碼位')

    # 舊版分層產物，改版後不再使用
    for stale in OUT.glob('*-common.woff2'):
        stale.unlink()
    for stale in OUT.glob('*-ext.woff2'):
        stale.unlink()

    faces: list[str] = []

    for name, weight, url, sha256 in SOURCES:
        ttf = fetch(url, sha256, CACHE / f'TaipeiSansTCBeta-{name}.ttf')

        out = OUT / f'taipei-sans-tc-{name.lower()}.woff2'
        covered = build_subset(ttf, charset, out)
        print(f'  {out.name}: {len(covered)} 字 / {out.stat().st_size / 1024:.0f} KB')

        faces.append(
            '@font-face {\n'
            "  font-family: 'Taipei Sans TC';\n"
            '  font-style: normal;\n'
            f'  font-weight: {weight};\n'
            '  font-display: swap;\n'
            f"  src: local('Taipei Sans TC Beta {name}'), local('TaipeiSansTCBeta-{name}'),\n"
            f"       url('./{out.name}') format('woff2');\n"
            '}'
        )

    css = (
        '/* 台北黑體 Taipei Sans TC Beta 1.000 —— 授權：SIL Open Font License 1.1\n'
        ' * 來源：https://github.com/vp-tw/taipei-sans-tc\n'
        ' *\n'
        ' * 本檔與同目錄的 woff2 由 scripts/build-fonts.py 產生，請勿手動編輯。\n'
        ' * 收錄 Big5 一級字（常用字）；未收錄的罕用字由 font stack 的下一個字型接手。\n'
        ' */\n\n' + '\n\n'.join(faces) + '\n'
    )
    (OUT / 'taipei-sans-tc.css').write_text(css, encoding='utf-8')
    print(f'完成：{OUT / "taipei-sans-tc.css"}')


if __name__ == '__main__':
    main()
