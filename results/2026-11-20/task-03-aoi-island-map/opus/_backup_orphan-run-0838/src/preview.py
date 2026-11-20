"""地図だけを Chrome で描いて確認する（build/preview_map.png）。"""
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import geo
import terrain
import render_map
import fonts

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "..", "build")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def chrome_shot(html_path, png_path, w, h, scale=1):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--force-device-scale-factor={scale}",
                    f"--window-size={w},{h}", "--virtual-time-budget=6000", "--run-all-compositor-stages-before-draw",
                    f"--screenshot={png_path}", "file://" + os.path.abspath(html_path)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main(scale=1, crop=None):
    t0 = time.time()
    g = geo.build_geometry()
    geo.validate(g, verbose=False)
    t = terrain.build(g)
    svg, L = render_map.build_map_svg(g, t, web=False)
    texts = "".join(re.findall(r">([^<>]+)<", svg))
    css = fonts.font_face_css(texts)
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}
html,body{{margin:0;padding:0;background:#fff}} svg{{display:block}}</style></head><body>{svg}</body></html>"""
    path = os.path.join(BUILD, "preview_map.html")
    open(path, "w").write(html)
    out = os.path.join(BUILD, "preview_map.png")
    chrome_shot(path, out, render_map.W, render_map.H, scale)
    ov = [o for o in L.overlaps() if not (o[0].endswith("sub") and o[1] == o[0][:-3]) and not (o[1].endswith("sub") and o[0] == o[1][:-3])]
    print(f"done in {time.time()-t0:.1f}s, svg {len(svg)/1024:.0f} KB, overlaps: {len(ov)}")
    for a, b in ov:
        print("  overlap:", a, "<->", b)


if __name__ == "__main__":
    main(scale=float(sys.argv[1]) if len(sys.argv) > 1 else 1)
