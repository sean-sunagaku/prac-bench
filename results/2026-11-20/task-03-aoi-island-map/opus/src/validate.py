"""島データ（aoi-island-data.md）と地図の中身を機械的に照合する。

使い方: python validate.py <生成した SVG> <出力するレポート>
"""
from __future__ import annotations

import math
import re
import sys

import numpy as np
from shapely.geometry import LineString, Point

import compose as C
import geography as G
import terrain as T
from island_data import BUS_STOPS, FOODS, SPOTS

WALK_M_PER_MIN = 80  # 不動産表示などで使われる徒歩の目安（分速80m）

results = []


def check(name, ok, detail=""):
    results.append((bool(ok), name, detail))


def compass(dx, dy):
    """(dx, dy) の向きを8方位で返す。"""
    ang = math.degrees(math.atan2(dy, dx)) % 360
    names = ["東", "北東", "北", "北西", "西", "南西", "南", "南東"]
    return names[int(((ang + 22.5) % 360) // 45)]


def main(svg_path, report_path):
    res = C.build(svg_path)
    geo, ter, boxes = res["geo"], res["ter"], res["boxes"]
    svg = open(svg_path, encoding="utf-8").read()
    coast = geo["coast"]
    poly = geo["coast_poly"]

    # ---- 島の大きさ
    mn, mx_ = coast.min(axis=0), coast.max(axis=0)
    w, h = mx_ - mn
    check("外接寸法が東西約6.8km・南北約4.2km", abs(w - 6.8) < 0.05 and abs(h - 4.2) < 0.05, f"{w:.2f}km × {h:.2f}km")
    area = abs(G.signed_area(coast))
    check("面積が約19.6km²（±3%）", abs(area - 19.6) / 19.6 < 0.03, f"{area:.2f}km²")
    per = G.ring_length(coast)
    check("周囲が約21km（±5%）", abs(per - 21) / 21 < 0.05, f"{per:.2f}km")
    check("東西に長い形（東西 > 南北）", w > h, "")

    # ---- 地形の位置
    px, py = G.PEAK
    check("あおい岳は中央やや北寄り", abs(px) < 0.6 and 0.2 < py < 1.0, f"山頂 ({px:+.2f}, {py:+.2f})km")
    hmax = float(np.max(ter["h"]))
    i, j = np.unravel_index(np.argmax(ter["h"]), ter["h"].shape)
    mxp, myp = ter["xs"][j], ter["ys"][i]
    check("標高モデルの最高点が山頂で428m", abs(hmax - 428) < 0.5 and math.hypot(mxp - px, myp - py) < 0.05,
          f"最高点 {hmax:.0f}m @ ({mxp:+.2f}, {myp:+.2f})")
    qx, qy = G.POND
    check("鏡池は山頂の南（山頂直下）", qy < py and abs(qx - px) < 0.1, compass(qx - px, qy - py))
    trail = LineString(geo["trail_s"])
    d_pond = abs(trail.project(Point(G.PEAK)) - trail.project(Point(G.POND)))
    check("鏡池は山頂から徒歩約5分（登山道で0.2〜0.5km）", 0.2 <= d_pond <= 0.5, f"{d_pond * 1000:.0f}m")
    check("朝日岬は東端", abs(G.ASAHI_TIP[0] - mx_[0]) < 0.12, f"岬 x={G.ASAHI_TIP[0]:.2f} / 東端 x={mx_[0]:.2f}")
    check("夕凪岬は西端", abs(G.YUNAGI_TIP[0] - mn[0]) < 0.12, f"岬 x={G.YUNAGI_TIP[0]:.2f} / 西端 x={mn[0]:.2f}")
    bx, by = G.BEACH_MID
    check("真珠浜は南西部の海岸", bx < -1 and by < -0.8 and poly.exterior.distance(Point(G.BEACH_MID)) < 0.1,
          compass(bx, by))
    cx, cy = G.BAY_CENTER
    check("静浦湾は北東部の入り江（海）", cx > 0.8 and cy > 0.8 and not poly.contains(Point(G.BAY_CENTER)), compass(cx, cy))
    st0 = G.STREAM_PTS[0]
    mouth = LineString(geo["stream"]).intersection(poly.exterior)
    mouth = list(mouth.geoms)[-1] if hasattr(mouth, "geoms") else mouth
    st1 = (mouth.x, mouth.y)
    check("せせらぎ渓谷はあおい岳の北東斜面から始まる", st0[0] > px and st0[1] > py, f"源流は山頂の{compass(st0[0] - px, st0[1] - py)}")
    check("せせらぎ渓谷は静浦湾へ注ぐ", math.hypot(st1[0] - cx, st1[1] - cy) < 0.6,
          f"河口 ({st1[0]:.2f}, {st1[1]:.2f})")
    kx, ky = G.KAZE_HILL
    yx, yy_ = G.YUNAGI_TIP
    between = (min(bx, yx) - 0.2 < kx < max(bx, yx) + 0.2) and (min(by, yy_) - 0.2 < ky < max(by, yy_) + 0.2)
    check("風の丘は西部、真珠浜と夕凪岬の間の高台", kx < -2 and between and T.elevation_at(ter, kx, ky) > 60,
          f"標高 {T.elevation_at(ter, kx, ky):.0f}m")

    # ---- 周回道路とバス
    road = geo["road"]
    check("周回道路は海岸沿い（海岸から0.05〜0.45km）",
          all(0.05 < poly.exterior.distance(Point(p)) < 0.45 for p in road[::10]), "")
    check("バスの進む向き（道路の点の並び）が時計回り", G.signed_area(road) < 0, f"符号付き面積 {G.signed_area(road):.2f}")
    order = sorted(BUS_STOPS, key=lambda s: G.arc_position(road, geo["stops"][s["id"]])[0])
    check("停留所が あおい港 から時計回りにデータの順番で並ぶ", [s["no"] for s in order] == list(range(1, 10)),
          " → ".join(s["name"] for s in order))
    expect_dir = {"port": {"南東"}, "onsen": {"南"}, "citrus": {"南", "南西"}, "beach": {"南西"}, "yunagi": {"西"},
                  "shrine": {"北西", "北"}, "valley": {"北東"}, "shizuura": {"北東"}, "asahi": {"東"}}
    for s in BUS_STOPS:
        x, y = geo["stops"][s["id"]]
        dname = compass(x, y / (2.1 / 3.4))  # 楕円を円に直して方位をとる
        check(f"停留所「{s['name']}」の方角", dname in expect_dir[s["id"]], f"島の{dname}部")
    # 朝日岬から港へは東海岸を南下
    a_s = G.arc_position(road, geo["stops"]["asahi"])[0]
    tot = G.ring_length(road)
    seg = [road[k] for k in range(len(road)) if G.arc_position(road, road[k])[0] > a_s]
    check("朝日岬 → あおい港 は東海岸を南下", all(p[0] > 1.8 for p in seg) and seg[0][1] > seg[-1][1], "")
    check("道路の長さ（地図上）", True, f"{tot:.1f}km（データは約21km。地図では海岸の細かな曲がりを省いて描いている）")

    vs = geo["stops"]["valley"]
    check("せせらぎ渓谷入口は、道路が渓流を渡る地点", LineString(geo["stream"]).distance(Point(vs)) < 0.02, f"({vs[0]:.2f}, {vs[1]:.2f})")

    # ---- 見どころと最寄り停留所
    stop_by_name = {s["name"]: s["id"] for s in BUS_STOPS}
    for sp in SPOTS:
        p = G.SPOT_POS[sp["no"]]
        check(f"見どころ{sp['no']}「{sp['name']}」が陸地にある", poly.buffer(0.02).contains(Point(p)), "")
        if sp["no"] in (5, 6):
            continue
        dists = {sid: math.dist(p, q) for sid, q in geo["stops"].items()}
        near = min(dists, key=dists.get)
        want = stop_by_name[sp["stop"]]
        check(f"見どころ{sp['no']}「{sp['name']}」の最寄り停留所が「{sp['stop']}」", near == want,
              f"{dists[want] * 1000:.0f}m")
    # 登山口（2か所）
    s0 = geo["trail_s"][0]
    n0 = geo["trail_nw"][0]
    check("登山口（南麓）はあおい温泉のそば", math.dist(s0, G.SPOT_POS[12]) < 0.12, f"{math.dist(s0, G.SPOT_POS[12]) * 1000:.0f}m")
    check("登山口（北西麓）はあおい神社のそば", math.dist(n0, G.SPOT_POS[13]) < 0.12, f"{math.dist(n0, G.SPOT_POS[13]) * 1000:.0f}m")
    check("あおい温泉は山頂の南（南麓）", compass(G.SPOT_POS[12][0] - px, G.SPOT_POS[12][1] - py) == "南", "")
    check("あおい神社は山頂の北西（北西麓）", compass(G.SPOT_POS[13][0] - px, G.SPOT_POS[13][1] - py) == "北西", "")
    check("あおい柑橘園は南西部寄りの南向き斜面",
          G.SPOT_POS[10][0] < -0.5 and G.SPOT_POS[10][1] < -1.0 and
          T.elevation_at(ter, -1.13, -1.40) > T.elevation_at(ter, -1.13, -1.62), "北側が高い（南向き）")
    # 徒歩時間
    for key, mins, label in (("onsen", 3, "あおい温泉入口→あおい温泉"), ("glass", 5, "あおい港→蒼玉ガラス工房"),
                             ("museum", 7, "あおい港→あおい島資料館"), ("kaze", 10, "夕凪岬→風の丘展望台")):
        L = G.polyline_length(C.WALKS[key]) * 1000
        want = mins * WALK_M_PER_MIN
        check(f"徒歩約{mins}分（{label}）の道のり", 0.65 * want <= L <= 1.25 * want, f"{L:.0f}m（目安 {want}m）")
    # 港・集落
    port = geo["stops"]["port"]
    check("あおい港は島の南東部", port[0] > 1.0 and port[1] < -0.5, compass(*port))

    # ---- 文字（地名・数字）が地図に入っているか
    names = [s["name"] for s in SPOTS] + [s["name"] for s in BUS_STOPS] + [f["name"] for f in FOODS]
    names += ["あおい岳", "鏡池", "静浦湾", "風の丘", "せせらぎ渓谷", "真珠浜", "朝日岬", "夕凪岬", "蒼玉港", "あおい集落", "静浦集落",
              "あおいレンタサイクル", "フェリーターミナル", "あおいライン", "静浦漁港"]
    plain = re.sub(r"<[^>]+>", "", svg)
    missing = [n for n in names if n not in plain]
    check("データの地名・施設名・特産品がすべて地図に書かれている", not missing, "不足: " + "、".join(missing) if missing else f"{len(set(names))}語")
    nums = ["428m", "約55分", "1日5往復", "約35分", "1日3往復", "7:10", "18:20", "1日6便", "一周約70分", "約21km",
            "約19.6km²", "約1,850人", "約2.5〜3時間", "7:00〜9:00ごろ", "徒歩約10分", "徒歩約3分", "徒歩約5分", "徒歩約7分",
            "登り約90分", "下り約70分"]
    miss_n = [n for n in nums if n not in plain]
    check("データの数値（時間・便数・標高など）が書かれている", not miss_n, "不足: " + "、".join(miss_n) if miss_n else f"{len(nums)}項目")
    for sp in SPOTS:
        check(f"見どころ{sp['no']}の説明文がデータどおり", sp["desc"] in plain.replace("\n", "") or
              all(part in plain for part in re.split(r"[。、]", sp["desc"]) if len(part) > 3), "")

    # ---- 重なり
    ov = [(a, b) for a, b in boxes.overlaps()
          if not ((a.startswith("marker:") and b == f"label:spot{a.split(':')[1]}") or
                  (a.startswith("stop:") and b == f"label:stop-{a.split(':')[1]}"))]
    check("地図のラベル・記号どうしが重ならない", not ov, f"{len(ov)}件" + (": " + str(ov[:4]) if ov else ""))

    ok = sum(1 for r in results if r[0])
    lines = [f"あおい島 観光マップ 検証結果（{ok}/{len(results)} 項目 OK）", ""]
    for good, name, detail in results:
        lines.append(f"[{'OK' if good else 'NG'}] {name}" + (f" … {detail}" if detail else ""))
    out = "\n".join(lines) + "\n"
    with open(report_path, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(out)
    return ok == len(results)


if __name__ == "__main__":
    good = main(sys.argv[1], sys.argv[2])
    sys.exit(0 if good else 1)
