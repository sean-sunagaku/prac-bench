"""ジオメトリ確認用の簡易描画（build/debug_geo.png）。"""
import sys, subprocess
sys.path.insert(0, '.')
import geo

S, W, H = 120, 1000, 640
def px(p): return (W/2 + p[0]*S, H/2 - p[1]*S)
def path(pts, closed=False):
    d = "M" + " L".join(f"{px(p)[0]:.1f},{px(p)[1]:.1f}" for p in pts)
    return d + ("Z" if closed else "")
g = geo.build_geometry()
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="#bfe3f0"/>']
o.append(f'<path d="{path(g["coast"], True)}" fill="#e6efc8" stroke="#345" stroke-width="1"/>')
for k in ["aoi_village", "shizu_village", "orchard", "grassland"]:
    o.append(f'<path d="{path(g[k], True)}" fill="none" stroke="#a70" stroke-dasharray="3 2"/>')
o.append(f'<path d="{path(g["road"], True)}" fill="none" stroke="#1d4f99" stroke-width="2.5"/>')
for k in ["trail_s", "trail_nw"]:
    o.append(f'<path d="{path(g[k])}" fill="none" stroke="#8a5a2b" stroke-width="1.5" stroke-dasharray="4 2"/>')
for k in ["walk_kaze", "walk_yunagi", "walk_asahi", "walk_onsen", "walk_jinja", "walk_keikoku", "walk_town_11", "walk_town_14"]:
    o.append(f'<path d="{path(g[k])}" fill="none" stroke="#c40" stroke-width="1.2" stroke-dasharray="1.5 2"/>')
o.append(f'<path d="{path(g["stream"])}" fill="none" stroke="#28c" stroke-width="1.5"/>')
o.append(f'<path d="{path(g["ferry_route"])}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 4"/>')
for b in g["aoi_breakwaters"] + g["shizu_breakwater"]:
    o.append(f'<path d="{path(b)}" fill="none" stroke="#555" stroke-width="2"/>')
for s in g["stops"]:
    x, y = px(s["xy"])
    o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="#fff" stroke="#1d4f99" stroke-width="2"/><text x="{x+6:.1f}" y="{y-6:.1f}" font-size="11" fill="#1d4f99" font-family="Hiragino Sans">{s["no"]}{s["name"]}</text>')
for no, p in g["spots"].items():
    x, y = px(p)
    o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="#e33"/><text x="{x:.1f}" y="{y+3.5:.1f}" font-size="8" fill="#fff" text-anchor="middle" font-family="Hiragino Sans">{no}</text>')
# 1 km 方眼
for i in range(-4, 5):
    o.append(f'<line x1="{px((i,-3))[0]}" y1="0" x2="{px((i,-3))[0]}" y2="{H}" stroke="#000" stroke-opacity=".08"/>')
for j in range(-3, 4):
    o.append(f'<line x1="0" y1="{px((0,j))[1]}" x2="{W}" y2="{px((0,j))[1]}" stroke="#000" stroke-opacity=".08"/>')
o.append('</svg>')
open('../build/debug_geo.svg', 'w').write("\n".join(o))
subprocess.run(["rsvg-convert", "-o", "../build/debug_geo.png", "../build/debug_geo.svg"], check=True)
print("wrote build/debug_geo.png")
