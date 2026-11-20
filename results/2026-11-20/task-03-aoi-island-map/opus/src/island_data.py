"""あおい島データ（aoi-island-data.md）を構造化したもの。

地図・ガイドに出す地名・数値・説明文は、すべてこのファイルから差し込む。
データにない施設名や時刻はここに書かない（推測で足した値には note を付ける）。
"""

ISLAND = {
    "name": "あおい島",
    "prefecture": "蒼玉県",
    "area": "約19.6km²",
    "size": "東西約6.8km・南北約4.2km",
    "perimeter": "約21km",
    "population": "約1,850人",
    "village": "あおい集落",
    "peak": "あおい岳",
    "peak_height": "428m",
}

# 区分（データの3分類）
CATEGORIES = {
    "nature": {"label": "自然・展望", "color": "#1F8A5B", "light": "#E3F3EA"},
    "food": {"label": "食・買い物・体験", "color": "#E8772E", "light": "#FDEEE2"},
    "culture": {"label": "温泉・神社・文化", "color": "#C2416B", "light": "#F9E6EC"},
}

# 周回線の停留所（あおい港から時計回り）
BUS_STOPS = [
    {"no": 1, "id": "port", "name": "あおい港", "near": "フェリーターミナル、みなと市場"},
    {"no": 2, "id": "onsen", "name": "あおい温泉入口", "near": "あおい温泉"},
    {"no": 3, "id": "citrus", "name": "柑橘園前", "near": "あおい柑橘園"},
    {"no": 4, "id": "beach", "name": "真珠浜", "near": "真珠浜海水浴場"},
    {"no": 5, "id": "yunagi", "name": "夕凪岬", "near": "夕凪岬、風の丘"},
    {"no": 6, "id": "shrine", "name": "あおい神社前", "near": "あおい神社"},
    {"no": 7, "id": "valley", "name": "せせらぎ渓谷入口", "near": "せせらぎ渓谷"},
    {"no": 8, "id": "shizuura", "name": "静浦", "near": "静浦集落・静浦漁港"},
    {"no": 9, "id": "asahi", "name": "朝日岬", "near": "朝日岬・灯台"},
]

BUS = {
    "line": "あおい島バス「周回線」",
    "direction": "時計回り",
    "runs": "1日6便",
    "loop": "一周約70分",
}

ROAD = {"name": "あおい島周回線", "nick": "あおいライン", "length": "約21km"}

ACCESS = {
    "mainland_port": "蒼玉港",
    "island_port": "あおい港",
    "ferry": {"time": "約55分", "runs": "1日5往復", "note": "車両の積載可"},
    "jet": {"time": "約35分", "runs": "1日3往復", "note": "旅客のみ"},
    "first": "本土発7:10",
    "last": "島発18:20",
    "season": "季節により変動",
}

CYCLE = {
    "name": "あおいレンタサイクル",
    "where": "あおい港フェリーターミナル横",
    "ebike": "電動アシスト自転車あり",
    "loop": "一周（約21km）は寄り道なしで約2.5〜3時間",
}

# 見どころ14件（番号・区分・説明はデータどおり）
SPOTS = [
    {"no": 1, "cat": "nature", "name": "朝日岬・あおい灯台", "short": "朝日岬・あおい灯台", "kind": "自然・展望",
     "desc": "島の東端の岬と白い灯台。島で一番早く朝日が見られる場所。",
     "stop": "朝日岬", "walk": None, "best": "早朝", "stay": "30分", "icon": "lighthouse"},
    {"no": 2, "cat": "nature", "name": "夕凪岬", "short": "夕凪岬", "kind": "自然・展望",
     "desc": "島の西端の岬。夕日が海に沈む様子で知られる。",
     "stop": "夕凪岬", "walk": None, "best": "夕方", "stay": "30分", "icon": "sunset"},
    {"no": 3, "cat": "nature", "name": "風の丘展望台", "short": "風の丘展望台", "kind": "展望",
     "desc": "西部の高台にある展望台。真珠浜と夕凪岬の両方を見渡せる。",
     "stop": "夕凪岬", "walk": "徒歩約10分", "best": None, "stay": "20分", "icon": "view"},
    {"no": 4, "cat": "nature", "name": "真珠浜海水浴場", "short": "真珠浜海水浴場", "kind": "自然・海",
     "desc": "白砂と遠浅の海が続く、島で唯一の海水浴場。",
     "stop": "真珠浜", "walk": None, "best": "午前〜午後", "stay": "1〜2時間", "icon": "beach"},
    {"no": 5, "cat": "nature", "name": "あおい岳登山", "short": "あおい岳登山", "kind": "自然・登山",
     "desc": "標高428m。登山口は南麓のあおい温泉側と、北西麓のあおい神社側の2か所。山頂からは島を一周見渡せる。",
     "stop": "あおい温泉入口／あおい神社前", "walk": None, "best": None, "stay": "登り約90分・下り約70分",
     "icon": "mountain"},
    {"no": 6, "cat": "nature", "name": "鏡池", "short": "鏡池", "kind": "自然",
     "desc": "あおい岳の山頂直下にある小さな池。風のない日は水面に空が映る。",
     "stop": "山頂から南へ徒歩約5分", "walk": None, "best": None, "stay": "15分", "icon": "pond"},
    {"no": 7, "cat": "nature", "name": "せせらぎ渓谷", "short": "せせらぎ渓谷", "kind": "自然",
     "desc": "あおい岳の北東斜面から静浦湾へ流れる清流沿いの渓谷。遊歩道と小さな滝がある。",
     "stop": "せせらぎ渓谷入口", "walk": None, "best": None, "stay": "40分", "icon": "waterfall"},
    {"no": 8, "cat": "food", "name": "みなと市場", "short": "みなと市場", "kind": "食・買い物",
     "desc": "あおい港に隣接する市場。島の魚介や特産品が並び、食堂では海鮮丼が食べられる。",
     "stop": "あおい港", "walk": "すぐ隣", "best": "到着直後か帰り際", "stay": "40分", "icon": "market"},
    {"no": 9, "cat": "food", "name": "静浦の朝市と漁師町", "short": "静浦の朝市と漁師町", "kind": "食・町並み",
     "desc": "静浦漁港のそばで開かれる朝市（7:00〜9:00ごろ）。漁師町の古い町並みも残る。",
     "stop": "静浦", "walk": None, "best": "早朝", "stay": "40分", "icon": "fish"},
    {"no": 10, "cat": "food", "name": "あおい柑橘園", "short": "あおい柑橘園", "kind": "食・体験",
     "desc": "南向きの斜面に広がる柑橘園。名物「あおいみかん」の収穫体験（秋〜冬）と、ジュース・ジャムの販売。",
     "stop": "柑橘園前", "walk": None, "best": None, "stay": "40分", "icon": "citrus"},
    {"no": 11, "cat": "food", "name": "蒼玉ガラス工房", "short": "蒼玉ガラス工房", "kind": "体験・工芸",
     "desc": "島の砂を使った青いガラス「蒼玉ガラス」の工房。小物作りの体験ができる。",
     "stop": "あおい港", "walk": "徒歩約5分", "best": None, "stay": "60分（体験込み）", "icon": "glass"},
    {"no": 12, "cat": "culture", "name": "あおい温泉", "short": "あおい温泉", "kind": "温泉",
     "desc": "あおい岳の南麓にある温泉。日帰り入浴ができる島唯一の温泉施設。",
     "stop": "あおい温泉入口", "walk": "徒歩約3分", "best": None, "stay": "60分", "icon": "onsen"},
    {"no": 13, "cat": "culture", "name": "あおい神社", "short": "あおい神社", "kind": "神社",
     "desc": "あおい岳の北西麓に鎮座する、島の守り神をまつる神社。参道の石段と大木で知られる。",
     "stop": "あおい神社前", "walk": None, "best": None, "stay": "30分", "icon": "torii"},
    {"no": 14, "cat": "culture", "name": "あおい島資料館", "short": "あおい島資料館", "kind": "文化",
     "desc": "島の漁業と暮らしの歴史を紹介する小さな資料館。雨の日の立ち寄り先にもなる。",
     "stop": "あおい港", "walk": "徒歩約7分", "best": None, "stay": "30分", "icon": "museum"},
]

FOODS = [
    {"name": "あおいみかん", "desc": "島の名物の柑橘。ジュースやジャム、ソフトクリームもある", "where": "あおい柑橘園、みなと市場", "icon": "citrus"},
    {"name": "島の海鮮丼", "desc": "静浦漁港に揚がった魚介の丼", "where": "みなと市場の食堂、静浦の朝市", "icon": "donburi"},
    {"name": "あおいひじき", "desc": "静浦湾周辺で採れるひじき。土産物として販売", "where": "みなと市場、静浦", "icon": "hijiki"},
    {"name": "蒼玉ガラス", "desc": "島の砂を使った青いガラス工芸品", "where": "蒼玉ガラス工房", "icon": "glass"},
]
