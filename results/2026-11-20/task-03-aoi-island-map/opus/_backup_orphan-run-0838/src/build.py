"""あおい島 観光マップ一式を組み立てる。

  /tmp/aoi-venv/bin/python -I src/build.py

出力（作業フォルダ直下）:
  index.html            … Web 版の観光マップ（1ファイルで完結。フォント・地形画像も埋め込み）
  aoi-island-map.svg    … 地図のベクター版（フォント埋め込み）
  print.html            … 印刷用（A3 横・2ページ：表＝地図、裏＝ガイド）
  build/validation.txt  … 島データとの照合結果
"""
from __future__ import annotations

import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)

import geo  # noqa: E402
import terrain  # noqa: E402
import render_map  # noqa: E402
import render_inset  # noqa: E402
import fonts  # noqa: E402
from aoi_data import (ACCESS, BUS, CYCLE, DATA_DATE, FOODS, GROUPS, ISLAND, ROAD, SPOTS,  # noqa: E402
                      STOPS, TIPS)

E = html.escape
STOP_NAME = {s["id"]: s["name"] for s in STOPS}

# ------------------------------------------------------------------ スポットの付帯情報


def spot_meta(sp):
    no = sp["no"]
    rows = [("場所", "あおい岳の山頂直下、南側" if no == 6 else sp["place"])]
    if no == 5:
        rows.append(("最寄りのバス停", "「あおい温泉入口」または「あおい神社前」"))
        rows.append(("登山口", "南麓のあおい温泉側と、北西麓のあおい神社側の2か所"))
    elif no == 6:
        rows.append(("行き方", "山頂から南へ徒歩約5分。登山とセットで訪れる場所"))
    else:
        st = f"「{STOP_NAME[sp['stop']]}」"
        if sp["walk"]:
            w = sp["walk"].replace("あおい港から", "")
            st += f"から{w}"
        rows.append(("最寄りのバス停", st))
    if sp["best"]:
        rows.append(("おすすめ", sp["best"]))
    rows.append(("登山の目安" if no == 5 else "滞在の目安", sp["stay"]))
    return rows


def best_tag(sp):
    b = sp["best"] or ""
    if "早朝" in b:
        return '<span class="tag am">早朝</span>'
    if "夕方" in b:
        return '<span class="tag pm">夕方</span>'
    return ""

# ------------------------------------------------------------------ 本文の部品


def lead_html():
    return ("<strong>あおい島</strong>は、本土の蒼玉港からフェリーで約55分、高速船で約35分の蒼玉県の離島です。"
            "東西約6.8km・南北約4.2kmの楕円形で、周囲は約21km、約1,850人が暮らしています。"
            "中央やや北寄りにそびえるあおい岳（428m）は、島のほぼどこからでも見えます。"
            "東の朝日岬で朝日を、西の夕凪岬で夕日を眺めて、そのあいだを周回線バスやレンタサイクルでめぐりましょう。")


ICON_BUS = '<svg width="22" height="22" viewBox="-8 -8 16 16" aria-hidden="true" style="color:#1f4f9e"><rect x="-6" y="-6.5" width="12" height="11.5" rx="2.4" fill="currentColor"/><rect x="-4.4" y="-4.8" width="8.8" height="4.4" rx="1" fill="#fff"/><circle cx="-3.4" cy="2.4" r="1" fill="#fff"/><circle cx="3.4" cy="2.4" r="1" fill="#fff"/></svg>'
ICON_CLOCK = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#1f4f9e" stroke-width="2.4"/><path d="M12 7v5.5l3.5 2" fill="none" stroke="#1f4f9e" stroke-width="2.4" stroke-linecap="round"/></svg>'
ICON_LOOP = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="#1f4f9e" stroke-width="2.4" stroke-linecap="round"/><path d="M17.6 3.6v4.2h-4.2" fill="none" stroke="#1f4f9e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICON_ROAD = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21 10.5 3M16 21 13.5 3" stroke="#7d6f56" stroke-width="2.2" stroke-linecap="round"/><path d="M12 5v3M12 11v3M12 17v3" stroke="#1f4f9e" stroke-width="2.2" stroke-linecap="round"/></svg>'
ICON_WALK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4.5" r="2.2" fill="currentColor"/><path d="M11 9.5 8.5 13l2.5 1.5M11 9.5l3 1.5 2 3M11 9.5 10 15l-2 6M10.8 15l3 2 1.2 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICON_BIKE = '<svg viewBox="-9 -9 18 18" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="-4.6" cy="2.4" r="3.6"/><circle cx="4.6" cy="2.4" r="3.6"/><path d="M-4.6 2.4 L-1.4 -3.6 L3.4 -3.6 L4.6 2.4 M-1.4 -3.6 L0.4 2.4 L3.4 -3.6 M-2.6 -5.6 H-0.4"/></g></svg>'
ICON_BUS_S = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><rect x="-6" y="-6.5" width="12" height="11.5" rx="2.4" fill="currentColor"/><rect x="-4.4" y="-4.8" width="8.8" height="4.4" rx="1" fill="#fff"/></svg>'
ICON_HIKE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20 9.5 8l4 6 2.5-3.5L21 20Z" fill="currentColor"/></svg>'


ROUTE_NEAR = {
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
ROUTE_NOTES = {"minato": "フェリーターミナル\nあおいレンタサイクル", "shizuura": "静浦集落・静浦漁港"}
# ループ上の位置（島の地理に合わせる：上＝北海岸、右＝東端、下＝南海岸、左＝西端）
LOOP_POS = {
    "jinja": ("top", 27), "keikoku": ("top", 55), "shizuura": ("top", 76),
    "asahi": ("right", None),
    "minato": ("bottom", 76), "onsen": ("bottom", 58), "kankitsu": ("bottom", 41), "shinju": ("bottom", 24),
    "yunagi": ("left", None),
}


def near_buttons(stop_id):
    items = []
    for no, note in ROUTE_NEAR[stop_id]:
        sp = SPOTS[no - 1]
        col = GROUPS[sp["group"]]["color"]
        small = f"<small>{E(note)}</small>" if note else ""
        items.append(f'<li><button type="button" class="near-btn" data-spot="{no}" style="--c:{col}">'
                     f'<span class="n">{no}</span><span>{E(sp["short"])}{small}</span></button></li>')
    return "".join(items)


def route_html():
    o = ['<ul class="route-facts">',
         f'<li>{ICON_BUS}あおい港を起点に時計回り</li>',
         f'<li>{ICON_CLOCK}一周 約70分</li>',
         f'<li>{ICON_LOOP}1日6便</li>',
         f'<li>{ICON_ROAD}周回道路「あおいライン」全長約21km</li>',
         '</ul>']
    # --- PC：周回ループ
    o.append('<div class="loop" role="group" aria-label="周回線の停留所。上が北海岸、下が南海岸。あおい港から時計回りに一周">')
    o.append('<div class="loop-ring" aria-hidden="true"></div>')
    o.append('<div class="loop-center" aria-hidden="true"><div><svg width="74" height="40" viewBox="0 0 74 40"><path d="M2 38 L26 10 L33 18 L41 6 L72 38 Z" fill="#d7ead0"/><path d="M41 6 L48 15 L44 14 L39 18 L35 13 Z" fill="#fff"/></svg>'
             '<p class="t">周回線</p><p class="s">あおい港を出て時計回り<br>一周 約70分・1日6便</p></div></div>')
    arrows = [("top", 41, "r"), ("top", 65.5, "r"), ("right", 34, "d"), ("right", 66, "d"),
              ("bottom", 67, "l"), ("bottom", 49.5, "l"), ("bottom", 32.5, "l"), ("left", 66, "u"), ("left", 34, "u")]
    for side, pos, d in arrows:
        if side in ("left", "right"):
            st_ = f"--y:{168 + 236 * pos / 100:.1f}px"
        else:
            st_ = f"--p:{pos}%"
        o.append(f'<span class="la la-{d} on-{side}" style="{st_}" aria-hidden="true"></span>')
    for st in STOPS:
        side, pos = LOOP_POS[st["id"]]
        note = f'<li class="near-note">{E(ROUTE_NOTES[st["id"]]).replace(chr(10), "<br>")}</li>' if st["id"] in ROUTE_NOTES else ""
        start = '<em>起点・終点</em>' if st["no"] == 1 else ""
        style = f' style="--p:{pos}%"' if pos is not None else ""
        o.append(f'<div class="ls on-{side}{" start" if st["no"] == 1 else ""}"{style}>'
                 f'<button type="button" class="dot" data-stop-go="{st["id"]}" aria-label="{st["no"]}番目の停留所 {E(st["name"])} を地図で表示">{st["no"]}</button>'
                 f'<div class="lab"><button type="button" class="name" data-stop-go="{st["id"]}" tabindex="-1">{E(st["name"])}{start}</button>'
                 f'<ul class="near">{near_buttons(st["id"])}{note}</ul></div></div>')
    o.append('</div>')
    # --- スマホ：縦の一覧
    o.append('<ol class="route" aria-label="周回線の停留所（あおい港から時計回りの順）">')
    for st in STOPS:
        cls = ' class="start"' if st["no"] == 1 else ""
        note = f'<p class="near-note">{E(ROUTE_NOTES[st["id"]]).replace(chr(10), "・")}</p>' if st["id"] in ROUTE_NOTES else ""
        start = '<em>起点・終点</em>' if st["no"] == 1 else ""
        o.append(f'<li{cls}><button type="button" class="dot" data-stop-go="{st["id"]}" aria-label="{st["no"]}番目 {E(st["name"])} を地図で表示">{st["no"]}</button>'
                 f'<span class="arrow" aria-hidden="true"></span>'
                 f'<button type="button" class="name" data-stop-go="{st["id"]}">{E(st["name"])}{start}</button>'
                 f'<ul class="near">{near_buttons(st["id"])}</ul>{note}</li>')
    o.append('<li class="return"><span class="dot" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="#1f4f9e" stroke-width="2.6" stroke-linecap="round"/><path d="M17.6 3.6v4.2h-4.2" fill="none" stroke="#1f4f9e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="name">あおい港へ</span>'
             '<p class="near-note">東海岸を南下して帰着</p></li>')
    o.append('</ol>')
    o.append('<p class="route-foot">時計回りの周回運行なので、港へ戻るときはそのまま乗り続けて島を一周します。'
             '1日6便のため、途中で降りるときは次の便の時刻を確かめておきましょう。</p>')
    return "\n".join(o)


def spots_html():
    o = []
    order = [("nature", "自然・展望"), ("food", "食・買い物・体験"), ("culture", "温泉・神社・文化")]
    for key, label in order:
        items = [s for s in SPOTS if s["group"] == key]
        col = GROUPS[key]["color"]
        o.append(f'<div class="group" style="--c:{col}"><h3 class="group-head"><i></i>{E(label)}<span>{len(items)}か所</span></h3><div class="cards">')
        for sp in items:
            meta = "".join(f"<dt>{E(k)}</dt><dd>{E(v)}</dd>" for k, v in spot_meta(sp))
            o.append(f'<article class="card" id="card-{sp["no"]}" style="--c:{col}">'
                     f'<div class="card-head"><span class="card-no">{sp["no"]}</span><div><h3>{E(sp["name"])}{best_tag(sp)}</h3>'
                     f'<p class="cat">{E(sp["cat"])}</p></div></div>'
                     f'<p class="desc">{E(sp["desc"])}</p><dl class="meta">{meta}</dl>'
                     f'<button type="button" class="to-map" data-spot="{sp["no"]}">地図で見る</button></article>')
        o.append('</div></div>')
    return "\n".join(o)


COURSES = [
    {"id": "A", "title": "港まち歩き", "how": "徒歩だけ・約2時間30分",
     "why": "船を降りてすぐ、または帰りの船までの時間に。雨の日の立ち寄り先にもなります。",
     "steps": [("start", "あおい港（フェリーターミナル）"),
               ("spot", 8, "海鮮丼でお昼、島の特産品も", "40分"),
               ("walk", "港から徒歩約5分"),
               ("spot", 11, "蒼玉ガラスの小物作り体験", "60分"),
               ("walk", "あおい集落の中を歩いて"),
               ("spot", 14, "島の漁業と暮らしの歴史", "30分"),
               ("walk", "あおい港まで徒歩約7分"),
               ("end", "あおい港")],
     "foot": "滞在の合計は約2時間10分。歩く時間を足して約2時間30分です。"},
    {"id": "B", "title": "西の浜と岬へ", "how": "周回線バス・半日（約4時間）",
     "why": "白砂の真珠浜でのんびりしてから、風の丘と夕凪岬へ。",
     "steps": [("start", "あおい港から周回線バスに乗る"),
               ("bus", "時計回りに「真珠浜」で降りる"),
               ("spot", 4, "白砂と遠浅の海", "1〜2時間"),
               ("bus", "次の便で「夕凪岬」で降りる"),
               ("walk", "バス停から徒歩約10分"),
               ("spot", 3, "真珠浜と夕凪岬を見渡す", "20分"),
               ("spot", 2, "島の西端の岬。夕方が見頃", "30分"),
               ("bus", "そのまま乗って北海岸・東海岸を回る"),
               ("end", "あおい港")],
     "foot": "バスに乗る時間は合計でちょうど一周分（約70分）。夕方の夕凪岬で終えるなら、帰りの船（最終は島発18:20目安）から逆算を。"},
    {"id": "C", "title": "あおい岳に登って温泉へ", "how": "周回線バス＋登山・約5時間30分",
     "why": "島の最高峰から島を一周見渡し、下山後は日帰り温泉で汗を流します。",
     "steps": [("start", "あおい港から周回線バスに乗る"),
               ("bus", "「あおい温泉入口」で降りる"),
               ("hike", "温泉側の登山口から登る（登り約90分）"),
               ("spot", 6, "風のない日は水面に空が映る", "15分"),
               ("spot", 5, "標高428m。山頂から島を一周見渡せる", None),
               ("hike", "同じ道を下る（下り約70分）"),
               ("spot", 12, "日帰り入浴。バス停から徒歩約3分", "60分"),
               ("bus", "「あおい温泉入口」から乗って島を一周"),
               ("end", "あおい港")],
     "foot": "登山は往復と山頂・鏡池での滞在で約3時間。温泉とバス（合計で一周分の約70分）を足して約5時間30分です。"},
    {"id": "D", "title": "自転車で島一周", "how": "レンタサイクル・1日（約8時間）",
     "why": "電動アシスト自転車で、あおいラインを時計回りに。好きな場所で止まれます。",
     "steps": [("start", "あおいレンタサイクル（フェリーターミナル横）"),
               ("bike", "あおいラインを時計回りに"),
               ("spot", 10, "あおいみかんのジュースやジャム", "40分"),
               ("spot", 4, "白砂の浜でひと休み", "1時間"),
               ("spot", 3, "夕凪岬のバス停から徒歩約10分", "20分"),
               ("spot", 2, "島の西端の岬", "30分"),
               ("spot", 13, "参道の石段と大木", "30分"),
               ("spot", 7, "遊歩道と小さな滝", "40分"),
               ("bike", "静浦の漁師町を通って東端へ"),
               ("spot", 1, "白い灯台の岬", "30分"),
               ("spot", 8, "帰り際におみやげ", "40分"),
               ("end", "あおい港")],
     "foot": "走るだけなら一周約2.5〜3時間。滞在と徒歩を足して約8時間です。静浦の朝市は7:00〜9:00ごろだけなので、このコースでは町並みを眺めて通ります。"},
]


def courses_html():
    o = []
    move_icon = {"walk": ICON_WALK, "bus": ICON_BUS_S, "bike": ICON_BIKE, "hike": ICON_HIKE}
    for c in COURSES:
        st = []
        for s in c["steps"]:
            kind = s[0]
            if kind in ("start", "end"):
                st.append(f'<li class="mv"><span class="mk">{ICON_BUS_S if "バス" in s[1] else ("●" if kind == "start" else "◎")}</span>{E(s[1])}</li>'
                          if False else f'<li class="mv"><span class="mk" aria-hidden="true">{"発" if kind == "start" else "着"}</span>{E(s[1])}</li>')
            elif kind == "spot":
                no, note, stay = s[1], s[2], s[3]
                sp = SPOTS[no - 1]
                col = GROUPS[sp["group"]]["color"]
                stay_h = f'<span class="st">{E(stay)}</span>' if stay else ""
                st.append(f'<li style="--c:{col}"><span class="mk">{no}</span><b>{E(sp["short"])}</b>{stay_h}<br>'
                          f'<span style="color:var(--sub);font-size:13.5px">{E(note)}</span></li>')
            else:
                st.append(f'<li class="mv"><span class="mk" aria-hidden="true">{move_icon[kind]}</span>{E(s[1])}</li>')
        o.append(f'<article class="course" id="course-card-{c["id"]}">'
                 f'<div class="course-head"><span class="course-id">{c["id"]}</span><div><h3>{E(c["title"])}</h3>'
                 f'<p class="how">{E(c["how"])}</p></div></div>'
                 f'<p class="why">{E(c["why"])}</p><ol class="steps">{"".join(st)}</ol>'
                 f'<div class="course-foot"><p>{E(c["foot"])}</p>'
                 f'<button type="button" class="show-course" data-show-course="{c["id"]}">地図でコースを見る</button></div></article>')
    return "\n".join(o)


def timenotes_html():
    items = [
        ("#f5a623", "早朝が見頃", "1 朝日岬・あおい灯台（島で一番早い朝日）、9 静浦の朝市（7:00〜9:00ごろ）"),
        ("#ef6a50", "夕方が見頃", "2 夕凪岬（夕日が海に沈む）"),
        ("#1f4f9e", "船の時刻", "始発は本土発7:10、最終は島発18:20が目安（季節により変動）。コースは帰りの船から逆算を。"),
        ("#7d9aa3", "回れる数の目安", "バスなら半日（約4時間）で2〜3か所、1日（約8時間）で4〜6か所。あおい岳登山（約3時間）を入れるとコースの主軸に。"),
    ]
    return ('<ul class="time-notes">' + "".join(
        f'<li style="--k:{k}"><b>{E(t)}</b>{E(d)}</li>' for k, t, d in items) + '</ul>')


def access_html(inset_svg):
    ferry = ACCESS["ferry"]
    jet = ACCESS["jetfoil"]
    return f'''<div class="access">
  <div>
    <div class="box">
      <h3>本土の蒼玉港 ⇔ あおい港</h3>
      <table class="ferry">
        <thead><tr><th scope="col">船</th><th scope="col">所要時間</th><th scope="col">便数</th><th scope="col">メモ</th></tr></thead>
        <tbody>
          <tr><th scope="row">フェリー</th><td>約{ferry["minutes"]}分</td><td>1日{ferry["round_trips"]}往復</td><td>{E(ferry["note"])}</td></tr>
          <tr><th scope="row">高速船</th><td>約{jet["minutes"]}分</td><td>1日{jet["round_trips"]}往復</td><td>{E(jet["note"])}</td></tr>
        </tbody>
      </table>
      <p class="note">運航時間の目安：{E(ACCESS["hours"])}。</p>
    </div>
    <div class="box">
      <h3>島の中の移動</h3>
      <div class="movers">
        <div class="mover"><span class="ic" style="color:#1f4f9e">{ICON_BUS_S.replace('<svg ', '<svg width="24" height="24" ')}</span><div><h4>周回線バス（あおい島バス）</h4>
          <p>あおい港を起点に、周回道路を時計回りに一周してあおい港へ戻ります。一周約70分、1日6便。停留所は全部で9か所です。</p></div></div>
        <div class="mover"><span class="ic" style="color:#2f8a6a;background:#e8f5ef">{ICON_BIKE.replace('<svg ', '<svg width="26" height="26" ')}</span><div><h4>{E(CYCLE["name"])}</h4>
          <p>{E(CYCLE["place"])}。{E(CYCLE["ebike"])}。{E(CYCLE["loop"])}です。</p></div></div>
        <div class="mover"><span class="ic" style="background:#f4efe4">{ICON_ROAD}</span><div><h4>あおい島周回線（あおいライン）</h4>
          <p>あおい港を起点に、島の海岸沿いを一周する全長約21kmの道路。バスもレンタサイクルもこの道を走ります。</p></div></div>
      </div>
    </div>
  </div>
  <figure class="inset-card" style="margin:0">
    <h3>あおい港のまわり（歩いて回れる範囲）</h3>
    {inset_svg}
    <figcaption><p>フェリーターミナルのそばに、みなと市場・蒼玉ガラス工房・あおい島資料館が集まっています。</p></figcaption>
  </figure>
</div>'''


FOOD_ICONS = {
    "あおいみかん": '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="27" r="15" fill="#f39a1e"/><circle cx="19" cy="22" r="4" fill="#ffc35c" opacity=".8"/><path d="M24 12c1-4 5-6 9-5-1 4-5 6-9 5Z" fill="#4f8d43"/><path d="M24 12v3" stroke="#6b4a2b" stroke-width="2" stroke-linecap="round"/></svg>',
    "島の海鮮丼": '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 24h34c0 9-7.6 16-17 16S7 33 7 24Z" fill="#1f4f9e"/><path d="M9 24c3-6 9-8 15-8s12 2 15 8Z" fill="#fff"/><path d="M13 22c3-3 7-4 10-3l-2 4Z" fill="#f2765c"/><path d="M23 19c4-2 8-1 11 2l-4 2Z" fill="#ff9f7a"/><circle cx="31" cy="21.5" r="2.4" fill="#f39a1e"/><path d="M17 31h14" stroke="#7fb6e8" stroke-width="2" stroke-linecap="round"/></svg>',
    "あおいひじき": '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="32" rx="17" ry="7" fill="#e9eef0"/><path d="M12 30c4-6 6 2 10-4s6 2 10-4 4 4 6 2" fill="none" stroke="#2f3a2f" stroke-width="2.6" stroke-linecap="round"/><path d="M14 33c4-4 7 1 11-3s6 2 9-2" fill="none" stroke="#46523f" stroke-width="2.2" stroke-linecap="round"/></svg>',
    "蒼玉ガラス": '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 8h10v6c6 3 9 9 9 16 0 7-6 11-14 11s-14-4-14-11c0-7 3-13 9-16Z" fill="#2f7fc9"/><path d="M19 8h10v6c6 3 9 9 9 16 0 7-6 11-14 11" fill="#1f5fa8" opacity=".55"/><path d="M15 26c1-4 3-7 6-8" stroke="#bfe3ff" stroke-width="2.4" stroke-linecap="round"/></svg>',
}


def foods_html():
    o = ['<div class="foods">']
    for f in FOODS:
        o.append(f'<div class="food">{FOOD_ICONS[f["name"]]}<h3>{E(f["name"])}</h3><p>{E(f["desc"])}</p>'
                 f'<p class="where">買える・食べられる場所：{E(f["where"])}</p></div>')
    o.append('</div>')
    return "\n".join(o)


def spots_json():
    d = {}
    for sp in SPOTS:
        d[sp["no"]] = {"name": sp["name"], "cat": sp["cat"], "group": sp["group"],
                       "group_label": "見どころ：" + GROUPS[sp["group"]]["label"],
                       "desc": sp["desc"], "meta": spot_meta(sp)}
    return json.dumps(d, ensure_ascii=False)

# ------------------------------------------------------------------ 組み立て


def collect_text(s):
    s = re.sub(r"data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+", "", s)
    return "".join(re.findall(r">([^<>]+)<", s)) + "".join(re.findall(r'"([^"]*)"', s))


def mincho_text(svg, page):
    parts = re.findall(r'font-family="AoiMincho[^"]*"[^>]*>([^<]+)<', svg)
    parts += re.findall(r"<h[1-3][^>]*>(.*?)</h[1-3]>", page)
    parts += [sp["name"] for sp in SPOTS] + [c["title"] for c in COURSES]
    return re.sub(r"<[^>]+>", "", "".join(parts))


def build(render_png=True):
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    g = geo.build_geometry()
    report = geo.validate(g, verbose=False)
    t = terrain.build(g)
    report += ["", "地形（標高モデル）:"] + terrain.report(g, t["h"])
    svg_web, L = render_map.build_map_svg(g, t, web=True)
    svg_print, _ = render_map.build_map_svg(g, t, web=False)
    ov = [o for o in L.overlaps() if not (o[0].endswith("sub") or o[1].endswith("sub"))]
    report += ["", f"ラベルの重なり: {len(ov)} 件"] + [f"  {a} / {b}" for a, b in ov]
    inset = render_inset.build_inset_svg(g)

    tpl = open(os.path.join(HERE, "templates", "index.html"), encoding="utf-8").read()
    page = (tpl.replace("<!--@MAP@-->", svg_web)
               .replace("<!--@LEAD@-->", lead_html())
               .replace("<!--@ROUTE@-->", route_html())
               .replace("<!--@SPOTS@-->", spots_html())
               .replace("<!--@TIMENOTES@-->", timenotes_html())
               .replace("<!--@COURSES@-->", courses_html())
               .replace("<!--@ACCESS@-->", access_html(inset))
               .replace("<!--@FOODS@-->", foods_html())
               .replace("<!--@DATE@-->", DATA_DATE)
               .replace("/*@SPOTS_JSON@*/", spots_json())
               .replace("/*@STOPS_JSON@*/", json.dumps({s["id"]: s["name"] for s in STOPS}, ensure_ascii=False))
               .replace("/*@COURSES_JSON@*/", json.dumps({c["id"]: c["title"] for c in COURSES}, ensure_ascii=False)))
    # 印刷版
    import render_print
    pprint = render_print.build_print(svg_print, inset, COURSES, g)
    import render_sheet
    sheet = render_sheet.build_sheet_svg(svg_print, COURSES)
    all_text = collect_text(page) + collect_text(pprint) + collect_text(sheet)
    css = fonts.font_face_css(all_text, mincho_text(svg_web, page) + mincho_text(svg_print, pprint) + mincho_text(sheet, ""))
    page = page.replace("/*@FONTS@*/", css)
    pprint = pprint.replace("/*@FONTS@*/", css)
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(page)
    open(os.path.join(ROOT, "build", "print.html"), "w", encoding="utf-8").write(pprint)
    # 1枚で完結する SVG（地図＋ガイド欄、フォント・地形画像とも埋め込み）
    svg_alone = '<?xml version="1.0" encoding="UTF-8"?>\n' + sheet.replace("<!--@STYLE@-->", f"<style>{css}</style>", 1)
    open(os.path.join(ROOT, "aoi-island-map.svg"), "w", encoding="utf-8").write(svg_alone)
    open(os.path.join(ROOT, "build", "validation.txt"), "w", encoding="utf-8").write("\n".join(report) + "\n")
    print("\n".join(report))
    print(f"index.html {len(page)/1024:.0f} KB / print.html {len(pprint)/1024:.0f} KB / svg {len(svg_alone)/1024:.0f} KB")
    return page


CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def export():
    """PNG と A3 PDF を Chrome（ヘッドレス）で書き出す。"""
    import subprocess
    import render_sheet
    svg = os.path.join(ROOT, "aoi-island-map.svg")
    png = os.path.join(ROOT, "aoi-island-map.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={render_map.W},{render_sheet.SHEET_H}", "--virtual-time-budget=8000",
                    f"--screenshot={png}", "file://" + svg], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdf = os.path.join(ROOT, "aoi-island-map_A3.pdf")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
                    f"--print-to-pdf={pdf}", "file://" + os.path.join(ROOT, "build", "print.html")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("exported:", os.path.basename(png), os.path.basename(pdf))


if __name__ == "__main__":
    build()
    if "--no-export" not in sys.argv:
        export()
