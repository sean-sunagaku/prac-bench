"""使う文字だけに絞った Web フォント（woff2, base64）を作る。

Zen Maru Gothic / Shippori Mincho B1（いずれも SIL Open Font License 1.1）を
サブセット化し、別名（AoiMaru / AoiMincho）で埋め込む。
"""
from __future__ import annotations

import base64
import io
import os

from fontTools import subset
from fontTools.ttLib import TTFont

FONT_DIR = os.environ.get("AOI_FONT_DIR", "/tmp/aoi-fonts")

FACES = [
    ("AoiMaru", 500, "ZenMaruGothic-Medium.ttf"),
    ("AoiMaru", 700, "ZenMaruGothic-Bold.ttf"),
    ("AoiMaru", 900, "ZenMaruGothic-Black.ttf"),
    ("AoiMincho", 800, "ShipporiMinchoB1-ExtraBold.ttf"),
]

BASE_CHARS = (
    "0123456789０１２３４５６７８９abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    " !\"#$%&'()*+,-./:;<=>?@[]^_`{|}~、。・ー〜「」『』（）［］【】〈〉《》：；！？…―─→←↑↓⇔⇄"
    "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭%％・／＋－×÷°㎞㎡²³m"
)


def _subset_woff2(path, text):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    font = TTFont(path)
    sub = subset.Subsetter(options=opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return buf.getvalue()


def font_face_css(text: str, mincho_text: str | None = None) -> str:
    chars = "".join(sorted(set(text + BASE_CHARS)))
    mchars = "".join(sorted(set((mincho_text or text) + BASE_CHARS)))
    rules = []
    total = 0
    for family, weight, fname in FACES:
        data = _subset_woff2(os.path.join(FONT_DIR, fname), mchars if family == "AoiMincho" else chars)
        total += len(data)
        b64 = base64.b64encode(data).decode("ascii")
        rules.append(
            "@font-face{font-family:'%s';font-weight:%d;font-style:normal;font-display:block;"
            "src:url(data:font/woff2;base64,%s) format('woff2');}" % (family, weight, b64)
        )
    print(f"  fonts: {len(chars)} chars, {total/1024:.0f} KB (woff2)")
    return "\n".join(rules)
