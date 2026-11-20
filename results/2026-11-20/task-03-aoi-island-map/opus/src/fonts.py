"""フォントの読み込み・文字幅の計測・使う文字だけに絞った埋め込み用 WOFF2 の生成。

使用フォント（いずれも SIL Open Font License 1.1）
- M PLUS Rounded 1c（Medium / Bold / ExtraBold）：本文・ラベル
- Kaisei Tokumin ExtraBold：タイトル・見出し
- Kaisei Decol Bold：地形の名前（山・湾・丘など）
- Cormorant Garamond Italic（600 にインスタンス化）：欧文の飾り
"""
from __future__ import annotations

import base64
import io
import os

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

FONT_DIR = os.environ.get("AOI_FONT_DIR", "/tmp/aoi2-fonts")

FONTS = {
    # key: (file, css family, css weight)
    "body": ("MPLUSRounded1c-Medium.ttf", "AoiRounded", 500),
    "bold": ("MPLUSRounded1c-Bold.ttf", "AoiRounded", 700),
    "heavy": ("MPLUSRounded1c-ExtraBold.ttf", "AoiRounded", 800),
    "title": ("KaiseiTokumin-ExtraBold.ttf", "AoiTitle", 800),
    "feature": ("KaiseiDecol-Bold.ttf", "AoiFeature", 700),
    "latin": ("CormorantGaramond-Italic-VF.ttf", "AoiLatin", 600),
}

_cache: dict[str, TTFont] = {}
_used: dict[str, set] = {k: set() for k in FONTS}


def _load(key):
    if key not in _cache:
        path = os.path.join(FONT_DIR, FONTS[key][0])
        f = TTFont(path)
        if "fvar" in f:
            from fontTools.varLib import instancer
            f = instancer.instantiateVariableFont(f, {"wght": FONTS[key][2]})
        _cache[key] = f
    return _cache[key]


def register(key, text):
    _used[key].update(text)


def text_width(key, text, size, letter_spacing=0.0):
    f = _load(key)
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    upm = f["head"].unitsPerEm
    w = 0
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            w += upm * 0.5
        else:
            w += hmtx[g][0]
    return w / upm * size + letter_spacing * size * max(len(text) - 1, 0)


def missing_glyphs(key, text):
    cmap = _load(key).getBestCmap()
    return sorted({ch for ch in text if ord(ch) not in cmap and not ch.isspace()})


def font_face_css():
    """使った文字だけに絞った WOFF2 を data URI で埋め込む @font-face 群。"""
    css = []
    for key, (file, family, weight) in FONTS.items():
        chars = _used[key]
        if not chars:
            continue
        f = _load(key)
        buf = io.BytesIO()
        f.save(buf)
        buf.seek(0)
        sub = TTFont(buf)
        opts = Options()
        opts.flavor = "woff2"
        opts.layout_features = ["kern", "palt", "liga"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.hinting = False
        s = Subsetter(opts)
        s.populate(text="".join(sorted(chars)) + " ")
        s.subset(sub)
        # 別名にしておく（端末にある同名フォントと混ざらないように）
        out = io.BytesIO()
        sub.flavor = "woff2"
        sub.save(out)
        data = base64.b64encode(out.getvalue()).decode("ascii")
        css.append(
            f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:normal;"
            f"src:url(data:font/woff2;base64,{data}) format('woff2');}}"
        )
    return "\n".join(css)


def used_summary():
    return {k: len(v) for k, v in _used.items()}
