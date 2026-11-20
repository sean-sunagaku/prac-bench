"""印刷用（A3 横・2ページ）の HTML。表＝地図、裏＝ガイド。"""
from __future__ import annotations

import html

from aoi_data import ACCESS, CYCLE, DATA_DATE, FOODS, GROUPS, SPOTS, STOPS

E = html.escape

NEAR = {
    "minato": [(8, "すぐ隣"), (11, "徒歩約5分"), (14, "徒歩約7分")],
    "onsen": [(12, "徒歩約3分"), (5, "温泉側の登山口"), (6, "山頂から南へ約5分")],
    "kankitsu": [(10, None)],
    "shinju": [(4, None)],
    "yunagi": [(2, None), (3, "徒歩約10分")],
    "jinja": [(13, None), (5, "神社側の登山口")],
    "keikoku": [(7, None)],
    "shizuura": [(9, "朝市 7:00〜9:00ごろ")],
    "asahi": [(1, None)],
}
NOTES = {"minato": "フェリーターミナル・あおいレンタサイクル", "shizuura": "静浦集落・静浦漁港"}


def badge(no):
    sp = SPOTS[no - 1]
    return f'<span class="b" style="--c:{GROUPS[sp["group"]]["color"]}">{no}</span>'


def route_block():
    rows = []
    for st in STOPS:
        near = "、".join(f'{badge(no)}{E(SPOTS[no-1]["short"])}' + (f'<small>（{E(n)}）</small>' if n else "")
                        for no, n in NEAR[st["id"]])
        note = f'<small class="nn">{E(NOTES[st["id"]])}</small>' if st["id"] in NOTES else ""
        rows.append(f'<li><span class="sd">{st["no"]}</span><div><b>{E(st["name"])}</b>{" <em>起点</em>" if st["no"] == 1 else ""}'
                    f'<div class="nr">{near}{note}</div></div></li>')
    rows.append('<li class="ret"><span class="sd"><svg width="13" height="13" viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="#1f4f9e" stroke-width="3" stroke-linecap="round"/><path d="M17.6 3.6v4.2h-4.2" fill="none" stroke="#1f4f9e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>あおい港へ戻る</b><div class="nr">東海岸を南下して帰着</div></div></li>')
    return ('<ol class="proute">' + "".join(rows) + '</ol>')


def spot_lines():
    o = []
    for sp in SPOTS:
        no = sp["no"]
        if no == 5:
            acc = "バス停「あおい温泉入口」または「あおい神社前」／登り約90分・下り約70分"
        elif no == 6:
            acc = "山頂から南へ徒歩約5分／滞在15分"
        else:
            st = next(s["name"] for s in STOPS if s["id"] == sp["stop"])
            w = (sp["walk"] or "").replace("あおい港から", "")
            acc = f"バス停「{st}」" + (f"から{w}" if w else "") + f"／滞在{sp['stay']}"
        best = f'<em class="{"am" if "早朝" in (sp["best"] or "") else ("pm" if "夕方" in (sp["best"] or "") else "")}">おすすめ：{E(sp["best"])}</em>' if sp["best"] else ""
        o.append(f'<li>{badge(no)}<div><b>{E(sp["name"])}</b><span class="ct">{E(sp["cat"])}</span>{best}'
                 f'<p>{E(sp["desc"])}</p><p class="ac">{E(acc)}</p></div></li>')
    return '<ol class="pspots">' + "".join(o) + '</ol>'


PRINT_FLOWS = {
    "A": [("s", 8, "40分"), ("m", "徒歩約5分"), ("s", 11, "60分"), ("m", "集落を歩いて"), ("s", 14, "30分"), ("m", "徒歩約7分で港へ")],
    "B": [("m", "バスで「真珠浜」へ"), ("s", 4, "1〜2時間"), ("m", "次の便で「夕凪岬」へ"), ("m", "徒歩約10分"), ("s", 3, "20分"),
          ("s", 2, "30分"), ("m", "バスで北・東海岸を回って港へ")],
    "C": [("m", "バスで「あおい温泉入口」へ"), ("m", "登り約90分"), ("s", 6, "15分"), ("s", 5, "山頂"), ("m", "下り約70分"),
          ("s", 12, "60分"), ("m", "バスで島を一周して港へ")],
    "D": [("m", "レンタサイクルで時計回り"), ("s", 10, "40分"), ("s", 4, "1時間"), ("s", 3, "20分"), ("s", 2, "30分"),
          ("s", 13, "30分"), ("s", 7, "40分"), ("s", 1, "30分"), ("s", 8, "40分")],
}
PRINT_FOOT = {
    "A": "雨の日にも",
    "B": "バス乗車は合計で一周分の約70分",
    "C": "登山は鏡池・山頂の滞在込みで約3時間",
    "D": "走るだけなら一周約2.5〜3時間",
}


def course_lines(courses):
    o = []
    for c in courses:
        parts = []
        for s in PRINT_FLOWS[c["id"]]:
            if s[0] == "s":
                parts.append(f'{badge(s[1])}{E(SPOTS[s[1]-1]["short"])}<small>{E(s[2])}</small>')
            else:
                parts.append(f'<span class="mv">{E(s[1])}</span>')
        o.append(f'<div class="pc"><div class="pch"><span class="cid">{c["id"]}</span><b>{E(c["title"])}</b>'
                 f'<span class="how">{E(c["how"])}</span></div>'
                 f'<p class="flow">{" → ".join(parts)}<span class="cf">（{E(PRINT_FOOT[c["id"]])}）</span></p></div>')
    return "".join(o)


def build_print(svg_map, inset, courses, g):
    ferry, jet = ACCESS["ferry"], ACCESS["jetfoil"]
    foods = "".join(f'<li><b>{E(f["name"])}</b>{E(f["desc"])}<small>（{E(f["where"])}）</small></li>' for f in FOODS)
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>あおい島 観光マップ（印刷用 A3）</title>
<style>
/*@FONTS@*/
@page{{size:A3 landscape;margin:0}}
:root{{--ink:#183447;--sub:#4a6370;--bus:#1f4f9e;--line:#d3e2e4;--sea:#164f7a;--course:#e2457a;
  --maru:AoiMaru,'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif;--mincho:AoiMincho,'Shippori Mincho B1','Hiragino Mincho ProN',serif}}
*{{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
html,body{{margin:0;padding:0;background:#fff;color:var(--ink);font-family:var(--maru);font-weight:500}}
.page{{width:420mm;height:297mm;overflow:hidden;position:relative;break-after:page;page-break-after:always}}
.page:last-child{{break-after:auto;page-break-after:auto}}
/* 表面 */
.p1{{background:#0f3a5c}}
.p1 svg{{display:block;width:420mm;height:auto}}
.strip{{position:absolute;left:0;right:0;bottom:0;height:21.4mm;display:flex;align-items:center;gap:26px;padding:0 30px;color:#fff;font-size:14px;font-weight:700}}
.strip b{{font-family:var(--mincho);font-size:20px;font-weight:800;letter-spacing:.04em}}
.strip .sp{{flex:1}}
.strip .r{{text-align:right;font-size:12.5px;color:#cfe6ef;line-height:1.5}}
/* 裏面 */
.p2{{background:#f3f8f7;padding:26px 34px 22px}}
.p2 header{{display:flex;align-items:flex-end;gap:28px;border-bottom:2px solid var(--sea);padding-bottom:12px;margin-bottom:16px}}
.p2 h1{{margin:0;font-family:var(--mincho);font-weight:800;font-size:40px;line-height:1;color:var(--sea);letter-spacing:.06em}}
.p2 header p{{margin:0;font-size:13.5px;line-height:1.7;max-width:62em}}
.cols{{display:grid;grid-template-columns:440px 1fr 455px;gap:22px;height:calc(297mm - 26px - 22px - 80px)}}
.p2 h2{{margin:0 0 8px;font-family:var(--mincho);font-weight:800;font-size:21px;color:#0f3a5c}}
.p2 h2 small{{font-family:var(--maru);font-size:12px;color:var(--sub);font-weight:700;margin-left:8px}}
.blk{{background:#fff;border-radius:14px;padding:11px 14px;margin-bottom:10px}}
.b{{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;background:var(--c);color:#fff;font-size:10.5px;font-weight:900;margin-right:3px;vertical-align:-3px}}
.proute{{list-style:none;margin:0;padding:0;position:relative}}
.proute::before{{content:"";position:absolute;left:10px;top:8px;bottom:12px;width:5px;background:var(--bus);border-radius:3px}}
.proute li{{display:grid;grid-template-columns:26px 1fr;gap:8px;padding:0 0 4px;position:relative;font-size:12.5px;line-height:1.45}}
.sd{{position:relative;z-index:1;width:25px;height:25px;border-radius:50%;background:#fff;border:3.5px solid var(--bus);display:grid;place-items:center;font-size:11px;font-weight:900;color:var(--bus)}}
.proute li:first-child .sd{{background:var(--bus);color:#fff}}
.proute b{{font-size:13.5px;color:var(--bus);font-weight:900}}
.proute em{{font-style:normal;font-size:10.5px;background:var(--bus);color:#fff;border-radius:999px;padding:0 7px;margin-left:4px}}
.proute .nr{{font-size:12px}}
.proute small{{color:var(--sub);font-weight:700}}
.proute .nn{{display:block}}
.proute .ret .sd{{border-style:dashed}}
.facts{{margin:0 0 8px;font-size:12.5px;font-weight:800}}
table{{width:100%;border-collapse:collapse;font-size:12.5px}}
th,td{{text-align:left;padding:4px 5px;border-bottom:1px solid var(--line)}}
tbody th{{color:var(--bus)}}
.small{{font-size:11.5px;color:var(--sub);margin:6px 0 0;line-height:1.55}}
.mv2{{margin:0;padding:0;list-style:none;font-size:12.5px;line-height:1.6}}
.mv2 li{{margin-bottom:5px}}
.mv2 b{{color:var(--bus)}}
.pspots{{list-style:none;margin:0;padding:0;columns:2;column-gap:16px}}
.pspots li{{break-inside:avoid;display:grid;grid-template-columns:22px 1fr;gap:5px;margin:0 0 8px;font-size:12px;line-height:1.5}}
.pspots .b{{width:20px;height:20px;font-size:11px;margin-top:1px}}
.pspots b{{font-size:13.5px;font-weight:900}}
.pspots .ct{{font-size:10.5px;color:var(--sub);font-weight:800;margin-left:6px}}
.pspots em{{display:inline-block;font-style:normal;font-size:10.5px;font-weight:800;border-radius:5px;padding:0 5px;margin-left:5px;background:#eef3f4}}
.pspots em.am{{background:#fff1d6;color:#9a5a00}}
.pspots em.pm{{background:#ffe3dc;color:#a83a22}}
.pspots p{{margin:1px 0 0}}
.pspots .ac{{color:var(--sub);font-weight:700;font-size:11.5px}}
.pc{{border-left:5px solid var(--course);padding:2px 0 2px 10px;margin-bottom:10px}}
.pch{{display:flex;align-items:center;gap:8px;font-size:14.5px}}
.cid{{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:7px;background:var(--course);color:#fff;font-weight:900;font-size:13px}}
.pch b{{font-family:var(--mincho);font-weight:800}}
.how{{font-size:11.5px;color:var(--sub);font-weight:800}}
.flow{{margin:3px 0 2px;font-size:12px;line-height:1.75}}
.flow small{{color:var(--sub);margin-left:2px;font-weight:700}}
.flow .mv{{color:var(--sub);font-size:11px;font-weight:700}}
.cf{{font-size:10.5px;color:var(--sub);margin-left:4px}}
.tips{{margin:0 0 10px;padding:0;list-style:none;font-size:11.5px;line-height:1.55}}
.tips li{{margin-bottom:4px;padding-left:10px;border-left:4px solid var(--k)}}
.inset svg{{display:block;width:auto;height:var(--ih,314px);margin:0 auto;border-radius:10px}}
.foods{{list-style:none;margin:0;padding:0;font-size:12px;line-height:1.5;display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}}
.foods b{{display:block;font-size:13px}}
.foods small{{color:var(--sub);font-weight:700}}
.p2 footer{{position:absolute;left:34px;right:34px;bottom:12px;font-size:11px;color:var(--sub);display:flex;justify-content:space-between}}
</style></head><body>
<section class="page p1">
{svg_map}
<div class="strip"><b>あおい島 観光マップ</b><span>周回線バス：あおい港から時計回り・一周約70分・1日6便</span>
<span class="sp"></span><span class="r">見どころの詳しい案内・モデルコースは裏面へ<br>地名・施設名はすべて架空です（島データ {DATA_DATE} 版）</span></div>
</section>
<section class="page p2">
<header><h1>あおい島ガイド</h1><p>本土の蒼玉港からフェリーで約55分、高速船で約35分。東西約6.8km・南北約4.2km、周囲約21kmの島に約1,850人が暮らしています。中央やや北寄りのあおい岳（428m）は島のほぼどこからでも見えます。地図の番号は、このページの見どころの番号と同じです。</p></header>
<div class="cols">
 <div>
  <div class="blk"><h2>周回線バスの停留所<small>あおい港から時計回りの順</small></h2>
   <p class="facts">一周約70分・1日6便。港へ戻るときもそのまま乗り続けて一周します。</p>{route_block()}</div>
  <div class="blk"><h2>島への行き方</h2>
   <table><thead><tr><th>蒼玉港 ⇔ あおい港</th><th>所要</th><th>便数</th><th>メモ</th></tr></thead>
   <tbody><tr><th>フェリー</th><td>約{ferry["minutes"]}分</td><td>1日{ferry["round_trips"]}往復</td><td>{E(ferry["note"])}</td></tr>
   <tr><th>高速船</th><td>約{jet["minutes"]}分</td><td>1日{jet["round_trips"]}往復</td><td>{E(jet["note"])}</td></tr></tbody></table>
   <p class="small">運航時間の目安：{E(ACCESS["hours"])}</p></div>
  <div class="blk"><h2>島の中の移動</h2><ul class="mv2">
   <li><b>周回線バス</b>　あおい港を起点に周回道路を時計回りに一周。一周約70分、1日6便。</li>
   <li><b>{E(CYCLE["name"])}</b>　{E(CYCLE["place"])}。{E(CYCLE["ebike"])}。一周（約21km）は寄り道なしで約2.5〜3時間。</li>
   <li><b>あおい島周回線（あおいライン）</b>　あおい港を起点に海岸沿いを一周する全長約21kmの道路。</li></ul></div>
 </div>
 <div>
  <div class="blk"><h2>見どころ 14か所<small>番号は地図と同じ</small></h2>{spot_lines()}</div>
  <div class="blk"><h2>島の味とおみやげ</h2><ul class="foods">{foods}</ul></div>
 </div>
 <div>
  <div class="blk"><h2>モデルコース<small>バスの待ち時間は含みません</small></h2>
   <ul class="tips">
   <li style="--k:#f5a623">早朝が見頃：朝日岬（島で一番早い朝日）、静浦の朝市（7:00〜9:00ごろ）　<span style="color:#ef6a50">夕方が見頃：夕凪岬</span></li>
   <li style="--k:#1f4f9e">船：始発は本土発7:10、最終は島発18:20が目安（季節により変動）。帰りの船から逆算を</li>
   <li style="--k:#7d9aa3">バスなら半日で2〜3か所、1日で4〜6か所が目安。あおい岳登山は約3時間</li></ul>
   {course_lines(courses)}</div>
  <div class="blk inset"><h2>あおい港のまわり<small>歩いて回れる範囲</small></h2>{inset}</div>
 </div>
</div>
<footer><span>あおい島 観光マップ（地名・施設名はすべて架空です）</span><span>船・バスの時刻は季節により変わります。地図の航路の向きは模式的に描いています。</span></footer>
</section>
</body></html>'''
