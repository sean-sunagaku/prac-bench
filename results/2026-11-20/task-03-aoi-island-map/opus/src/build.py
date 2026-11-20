"""成果物一式を作る：SVG（本体）→ 検証レポート → PNG（Chrome ヘッドレスで書き出し）。

使い方:
    python build.py            # 作業フォルダ直下に aoi-island-map.svg / .png と build/validation.txt を出力
環境変数:
    AOI_FONT_DIR  フォント（TTF）を置いたフォルダ（既定 /tmp/aoi2-fonts）
    CHROME        Google Chrome の実行ファイル
"""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import validate  # noqa: E402

CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def main():
    svg = os.path.join(ROOT, "aoi-island-map.svg")
    png = os.path.join(ROOT, "aoi-island-map.png")
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    ok = validate.main(svg, os.path.join(ROOT, "build", "validation.txt"))
    if os.path.exists(CHROME):
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=2400,1800",
                        "--force-device-scale-factor=2", "--virtual-time-budget=5000",
                        f"--screenshot={png}", "file://" + svg], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("SVG:", svg, os.path.getsize(svg) // 1024, "KB")
    if os.path.exists(png):
        print("PNG:", png, os.path.getsize(png) // 1024, "KB")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
