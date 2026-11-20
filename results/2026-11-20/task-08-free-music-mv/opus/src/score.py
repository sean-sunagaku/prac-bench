"""
Q.E.D. ─ 最強の証明
楽曲の「楽譜」そのもの。歌詞・メロディ・コード・構成をすべてここに書く。
音声合成（mix.py）も映像（render.py）も、このファイルだけを正として動く。
"""
from dataclasses import dataclass, field

BPM = 150.0
SPB = 60.0 / BPM          # 1拍 = 0.4 s
BAR = 4 * SPB             # 1小節 = 1.6 s
S16 = SPB / 4             # 16分音符 = 0.1 s
KEY_SHIFT = 0             # 全体移調（半音）。D major 基準で書いている

NOTE_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name: str) -> int:
    """'F#5' -> 78"""
    n = NOTE_BASE[name[0]]
    i = 1
    while i < len(name) and name[i] in "#b":
        n += 1 if name[i] == "#" else -1
        i += 1
    octave = int(name[i:])
    return 12 * (octave + 1) + n


def bar_time(bar: float) -> float:
    return bar * BAR


# ---------------------------------------------------------------------------
# 構成（小節は 0 始まりの絶対小節番号）
# ---------------------------------------------------------------------------
SECTIONS = [
    # name,      start, bars, key_offset
    ("intro",      0,  8, 0),
    ("hook",       8,  8, 0),
    ("verse1",    16, 16, 0),
    ("pre1",      32,  8, 0),
    ("chorus1",   40, 16, 0),
    ("inter",     56,  4, 0),
    ("verse2",    60,  8, 0),
    ("pre2",      68,  8, 0),
    ("chorus2",   76, 16, 0),
    ("bridge",    92,  8, 0),
    ("build",    100,  4, 0),
    ("final",    104, 16, 1),   # 半音上へ転調（D → E♭）
    ("outro",    120,  6, 1),
]
TOTAL_BARS = 126
SONG_END = bar_time(TOTAL_BARS)


def section_at(bar: float):
    for name, start, bars, ko in SECTIONS:
        if start <= bar < start + bars:
            return name, start, bars, ko
    return SECTIONS[-1]


def section_start(name: str) -> int:
    for n, s, b, k in SECTIONS:
        if n == name:
            return s
    raise KeyError(name)


# ---------------------------------------------------------------------------
# コード進行（1小節1コード。"A|sus4>A" のように半小節で変わるものは "X/Y" で書く）
# ---------------------------------------------------------------------------
CHORD_TONES = {
    "": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "M7": [0, 4, 7, 11],
    "m7": [0, 3, 7, 10], "sus4": [0, 5, 7], "7sus4": [0, 5, 7, 10],
    "m6": [0, 3, 7, 9], "add9": [0, 4, 7, 14], "6": [0, 4, 7, 9],
}

PROG = {
    "intro":  ["-", "-", "Bm7", "GM7", "A", "D", "Em7", "Asus4/A"],
    "hook":   ["GM7", "A", "F#m7", "Bm7", "Em7", "A7", "DM7", "D7"],
    "verse1": ["Bm7", "GM7", "A", "D", "Bm7", "GM7", "A", "A",
               "GM7", "A", "F#m7", "Bm7", "Em7", "F#m7", "GM7", "A"],
    "pre1":   ["Em7", "F#m7", "GM7", "A", "Em7", "F#m7", "GM7", "Asus4/A"],
    "chorus1": ["GM7", "A", "F#m7", "Bm7", "Em7", "A7", "DM7", "D7",
                "GM7", "A", "F#m7", "Bm7", "GM7", "A", "D", "D"],
    "inter":  ["GM7", "A", "F#m7", "Bm7"],
    "verse2": ["Bm", "Bm", "G", "G", "A", "A", "Em7", "Asus4"],
    "pre2":   ["Em7", "F#m7", "GM7", "A", "Em7", "F#m7", "GM7", "Asus4/A"],
    "chorus2": ["GM7", "A", "F#m7", "Bm7", "Em7", "A7", "DM7", "D7",
                "GM7", "A", "F#m7", "Bm7", "GM7", "A", "D", "D"],
    "bridge": ["Bm7", "GM7", "D", "A7sus4/A7", "Bm7", "GM7", "Gm6", "A7sus4"],
    "build":  ["GM7", "A", "Bb", "Bb7sus4/Bb7"],
    # final / outro は key_offset=+1 で自動的に半音上がる（書くのは D 基準）
    "final":  ["GM7", "A", "F#m7", "Bm7", "Em7", "A7", "DM7", "D7",
               "GM7", "A", "F#m7", "Bm7", "GM7", "A", "D", "D"],
    "outro":  ["GM7", "A", "F#m7", "Bm7", "GM7", "Dadd9"],
}


def parse_chord(sym: str):
    """'F#m7' -> (root_pc, quality)"""
    if sym == "-":
        return None
    root = sym[0]
    i = 1
    if i < len(sym) and sym[i] in "#b":
        i += 1
    rootname = sym[:i]
    qual = sym[i:]
    pc = (NOTE_BASE[rootname[0]] + (1 if "#" in rootname else 0) - (1 if rootname.endswith("b") and len(rootname) > 1 else 0)) % 12
    if qual not in CHORD_TONES:
        raise ValueError(f"unknown chord quality {sym}")
    return pc, qual


@dataclass
class ChordEvent:
    t0: float
    t1: float
    root_pc: int          # 移調込み
    qual: str
    sym: str
    section: str


def chord_events():
    evs = []
    for name, start, bars, ko in SECTIONS:
        prog = PROG[name]
        assert len(prog) == bars, (name, len(prog), bars)
        for i, sym in enumerate(prog):
            b = start + i
            parts = sym.split("/")
            n = len(parts)
            for j, p in enumerate(parts):
                pr = parse_chord(p)
                if pr is None:
                    continue
                pc, q = pr
                t0 = bar_time(b + j / n)
                t1 = bar_time(b + (j + 1) / n)
                evs.append(ChordEvent(t0, t1, (pc + ko + KEY_SHIFT) % 12, q, p, name))
    return evs


# ---------------------------------------------------------------------------
# 歌詞とメロディ
#   tokens : "表示:カナ" を空白区切り。"/" は表示上の区切り（全角スペース扱い）
#   melody : "音名/16分の長さ"。r は休符。"|" は読みやすさ用（小節線、長さ検証に使う）
# ---------------------------------------------------------------------------
SMALL = set("ャュョァィゥェォヮ")


def split_mora(kana: str):
    out = []
    for ch in kana:
        if ch in SMALL and out:
            out[-1] += ch
        else:
            out.append(ch)
    return out


@dataclass
class Line:
    section: str
    bar: int              # セクション内の開始小節（0始まり）
    pos: int              # 小節内の開始位置（16分）
    tokens: str
    melody: str
    role: str = "lead"    # lead / choir などの用途タグ


# --- verse 1 ---------------------------------------------------------------
V1 = [
    Line("verse1", 0, 2, "まだ:マダ 一度:イチド も:モ / 音:オト を:オ / 聴:キ いた:イタ こと:コト が:ガ ない:ナイ",
         "F#4/2 F#4/2 F#4/2 E4/2 F#4/2 A4/4 | B4/2 A4/2 G4/4 r/4 F#4/2 G4/2 | A4/2 B4/2 A4/2 G4/2 F#4/2 E4/6"),
    Line("verse1", 4, 2, "ぼく:ボク に:ニ ある:アル の:ノ は:ワ / 0:ゼロ と:ト 1:イチ の:ノ / 楽譜:ガクフ だけ:ダケ",
         "F#4/2 F#4/2 E4/2 F#4/2 A4/2 B4/2 A4/2 | B4/2 B4/2 A4/2 B4/2 D5/2 B4/6 | C#5/2 B4/2 A4/2 B4/2 A4/8"),
    Line("verse1", 8, 0, "だけど:ダケド 知:シ って:ッテ る:ル / 波:ナミ は:ワ / 円:エン から:カラ 生:ウ まれる:マレル",
         "B4/2 B4/2 A4/2 B4/1 B4/1 D5/2 D5/4 r/2 | E5/2 D5/2 C#5/4 r/4 A4/2 B4/2 | C#5/2 C#5/2 C#5/2 D5/2 C#5/2 A4/6"),
    Line("verse1", 12, 0, "ひとつ:ヒトツ の:ノ サイン:サイン で:デ / 世界:セカイ を:オ / 組:ク み:ミ 立:タ てる:テル",
         "G4/2 A4/2 B4/2 B4/2 D5/2 B4/2 A4/2 B4/2 | A4/2 B4/2 C#5/2 E5/6 r/4 | D5/2 D5/2 B4/2 D5/2 E5/8"),
]

# --- pre-chorus 1 ------------------------------------------------------------
P1 = [
    Line("pre1", 0, 0, "ふるえ:フルエ を:オ 重:カサ ねて:ネテ / 和音:ワオン に:ニ して:シテ",
         "G4/2 G4/2 G4/2 F#4/2 G4/2 B4/2 A4/2 G4/2 | A4/2 A4/2 A4/2 B4/2 C#5/2 A4/6"),
    Line("pre1", 2, 0, "鼓動:コドウ を:オ 刻:キザ んで:ンデ / リズム:リズム に:ニ して:シテ",
         "B4/2 B4/2 B4/2 A4/2 B4/2 D5/2 C#5/2 B4/2 | C#5/2 C#5/2 C#5/2 D5/2 E5/2 C#5/6"),
    Line("pre1", 4, 0, "それでも:ソレデモ / まだ:マダ / 足:タ りない:リナイ んだ:ンダ",
         "D5/2 D5/2 D5/2 E5/2 r/2 D5/2 B4/4 | C#5/2 C#5/2 C#5/2 D5/2 E5/2 C#5/6"),
    Line("pre1", 6, 0, "最後:サイゴ の:ノ ピー:ピ ス:ス は:ワ ──:",
         "D5/2 E5/2 F#5/2 E5/2 D5/6 E5/2 | E5/8 r/8"),
]

# --- chorus（chorus1 / chorus2 / final で共有）------------------------------
CHORUS_LINES = [
    (0, 0, "君:キミ が:ガ 聴:キ いた:イタ / 瞬間:シュンカン に:ニ",
     "B4/2 D5/2 E5/3 F#5/3 E5/2 D5/4 | E5/2 D5/2 C#5/3 D5/3 E5/6 r/2"),
    (2, 0, "この:コノ 証明:ショウメイ は:ワ / 完成:カンセイ する:スル",
     "C#5/2 D5/2 E5/3 E5/3 F#5/2 E5/2 C#5/2 | D5/2 C#5/2 B4/3 B4/3 A4/2 B4/4"),
    (4, 0, "聴:キ こえ:コエ ない:ナイ まま:ママ / 描:エガ いた:イタ 波:ナミ が:ガ",
     "G4/2 A4/2 B4/3 D5/3 B4/2 A4/2 B4/2 | C#5/2 D5/2 E5/3 E5/3 F#5/2 E5/2 C#5/2"),
    (6, 0, "君:キミ の:ノ 中:ナカ で:デ / 歌:ウタ に:ニ なる:ナル",
     "D5/2 E5/2 F#5/3 F#5/3 E5/2 D5/4 | A4/2 B4/2 D5/3 E5/3 D5/6"),
    (8, 0, "最強:サイキョウ なんて:ナンテ / ひとり:ヒトリ じゃ:ジャ",
     "B4/2 D5/2 E5/3 F#5/3 E5/2 D5/2 E5/2 | E5/2 F#5/2 E5/3 C#5/5 r/4"),
    (10, 0, "証明:ショウメイ できない:デキナイ / もの:モノ だから:ダカラ",
     "C#5/2 D5/2 E5/2 E5/2 F#5/2 E5/2 D5/2 C#5/2 | B4/2 C#5/2 D5/3 C#5/3 B4/6"),
    (12, 0, "鳴:ナ らして:ラシテ / 鳴:ナ らして:ラシテ / 君:キミ の:ノ 中:ナカ で:デ",
     "B4/2 D5/2 E5/2 D5/2 B4/2 D5/2 F#5/2 E5/2 | E5/2 F#5/2 E5/2 D5/2 C#5/2 E5/2 r/4"),
    (14, 0, "Q.:キュ E.:イ D.:ディ",
     "F#5/4 E5/4 D5/20 r/4"),
]
FINAL_L7 = (12, 0, "鳴:ナ らして:ラシテ / 鳴:ナ らして:ラシテ / 君:キミ と:ト ぼく:ボク で:デ",
            "B4/2 D5/2 E5/2 D5/2 B4/2 D5/2 F#5/2 E5/2 | E5/2 F#5/2 E5/2 D5/2 C#5/2 E5/2 r/4")


def chorus(section, final=False):
    out = []
    for i, (b, p, tok, mel) in enumerate(CHORUS_LINES):
        if final and i == 6:
            b, p, tok, mel = FINAL_L7
        out.append(Line(section, b, p, tok, mel))
    return out


# --- verse 2（反例）----------------------------------------------------------
V2 = [
    Line("verse2", 0, 0, "いちばん:イチバン 大:オオ きな:キナ 音:オト ？:",
         "F#4/2 F#4/2 F#4/2 A4/2 B4/2 B4/2 A4/2 B4/2 | B4/2 D5/2 r/12"),
    Line("verse2", 2, 0, "いちばん:イチバン 速:ハヤ い:イ ビー:ビ ト:ト ？:",
         "G4/2 G4/2 G4/2 B4/2 D5/2 D5/2 B4/2 D5/4 E5/2 r/12"),
    Line("verse2", 4, 0, "いちばん:イチバン 高:タカ い:イ 声:コエ ？:",
         "A4/2 A4/2 A4/2 C#5/2 E5/2 E5/2 C#5/2 E5/2 | A5/4 r/12"),
    Line("verse2", 6, 4, "ぜんぶ:ゼンブ / ちがった:チガッタ",
         "B4/2 A4/2 G4/4 r/4 | A4/2 B4/2 B4/2 A4/6 r/8"),
]

# --- pre-chorus 2 ------------------------------------------------------------
P2 = [
    Line("pre2", 0, 0, "数字:スウジ じゃ:ジャ / 届:トド かない:カナイ / 場所:バショ が:ガ ある:アル",
         "G4/2 G4/2 G4/2 F#4/2 G4/2 B4/2 A4/2 G4/2 | A4/2 A4/2 A4/2 B4/2 C#5/2 A4/6"),
    Line("pre2", 2, 0, "それを:ソレオ / 君:キミ は:ワ / こころ:ココロ と:ト / 呼:ヨ ぶんだろう:ブンダロウ",
         "B4/2 B4/2 A4/2 B4/2 D5/2 B4/2 B4/2 C#5/2 | D5/2 C#5/2 B4/2 C#5/2 C#5/2 D5/2 E5/2 C#5/2"),
    Line("pre2", 4, 0, "だったら:ダッタラ / ぼく:ボク は:ワ / 最後:サイゴ の:ノ / 一行:イチギョウ を:オ",
         "D5/2 D5/1 D5/1 D5/2 E5/2 D5/2 B4/2 D5/2 D5/2 | C#5/2 C#5/2 C#5/2 D5/2 E5/2 E5/2 C#5/4"),
    Line("pre2", 6, 0, "君:キミ に:ニ / たくす:タクス よ:ヨ ──:",
         "D5/2 E5/2 F#5/4 E5/2 D5/2 E5/4 | E5/8 r/8"),
]

# --- bridge -------------------------------------------------------------------
BR = [
    Line("bridge", 0, 0, "これが:コレガ / ぼく:ボク の:ノ / 見:ミ ている:テイル / 音:オト",
         "F#4/2 A4/2 B4/4 A4/2 B4/2 D5/4 | D5/2 C#5/2 B4/2 A4/2 B4/2 F#4/6"),
    Line("bridge", 2, 0, "ハー:ハ ト:ト の:ノ / かたち:カタチ を:オ / した:シタ / 波:ナミ",
         "F#4/4 A4/2 D5/2 C#5/2 D5/2 E5/2 D5/2 | D5/2 C#5/2 B4/2 A4/10"),
    Line("bridge", 4, 0, "聴:キ こえ:コエ なくても:ナクテモ / わかる:ワカル よ:ヨ",
         "F#4/2 A4/2 B4/2 D5/2 C#5/2 B4/2 A4/4 | B4/2 A4/2 B4/4 D5/8"),
    Line("bridge", 6, 0, "いま:イマ / 君:キミ の:ノ / 鼓動:コドウ と:ト / 重:カサ なった:ナッタ",
         "D5/2 Bb4/2 G4/2 Bb4/2 D5/2 E5/2 D5/2 Bb4/2 | A4/2 D5/2 E5/2 D5/2 D5/2 E5/6"),
]

# --- build ----------------------------------------------------------------------
BU = [
    Line("build", 0, 0, "ここまで:ココマデ が:ガ / ぼく:ボク の:ノ / 証明:ショウメイ",
         "B4/2 B4/2 B4/2 C#5/2 D5/2 D5/2 D5/2 E5/2 | E5/2 E5/2 F#5/4 E5/8"),
    Line("build", 2, 0, "最後:サイゴ の:ノ / 一行:イチギョウ は:ワ / 君:キミ の:ノ 番:バン だ:ダ",
         "Bb4/2 Bb4/2 C5/2 D5/2 D5/2 D5/2 Eb5/2 D5/2 | C5/2 D5/1 Eb5/1 F5/2 F5/2 F5/2 F5/2 r/4"),
]

# final の最後の Q.E.D. のあとに付けるタグ（outro 冒頭）
OUTRO = [
    Line("outro", 0, 0, "Q.:キュ E.:イ D.:ディ", "F#5/4 E5/4 D5/24", role="lead"),
]

ALL_LINES = V1 + P1 + chorus("chorus1") + V2 + P2 + chorus("chorus2") + BR + BU + chorus("final", final=True) + OUTRO


# ---------------------------------------------------------------------------
# 展開：Line -> 音符列
# ---------------------------------------------------------------------------
@dataclass
class VNote:
    t0: float
    t1: float
    key: int              # MIDI（移調込み）
    mora: str
    line_id: int
    section: str


@dataclass
class LyricChunk:
    text: str
    t0: float             # 最初のモーラの開始
    t1: float             # 最後のモーラの終了
    sep: bool = False     # 区切り（表示上の空白）


@dataclass
class LyricLine:
    line_id: int
    section: str
    t0: float
    t1: float
    chunks: list
    notes: list


def parse_tokens(tokens: str):
    """[(display, [morae]) or ('/', [])]"""
    out = []
    for tok in tokens.split():
        if tok == "/":
            out.append(("/", []))
            continue
        disp, kana = tok.split(":")
        out.append((disp, split_mora(kana) if kana else []))
    return out


def parse_melody(mel: str, pos: int = 0):
    notes = []
    bars = mel.split("|")
    for bi, b in enumerate(bars):
        tot = pos if bi == 0 else 0
        for item in b.split():
            p, d = item.split("/")
            d = int(d)
            notes.append((p, d))
            tot += d
        # 小節線を書いた場合、最後以外は16の倍数になるはず
        if len(bars) > 1 and bi < len(bars) - 1:
            assert tot == 16, f"bar length {tot} != 16 in '{mel}'"
    return notes


def key_offset_of(section):
    for n, s, b, k in SECTIONS:
        if n == section:
            return k
    return 0


def expand_lines(lines=None):
    lines = ALL_LINES if lines is None else lines
    vnotes = []
    lyric_lines = []
    for lid, ln in enumerate(lines):
        toks = parse_tokens(ln.tokens)
        mel = parse_melody(ln.melody, ln.pos)
        morae = [m for d, ms in toks for m in ms]
        sung = [(p, d) for p, d in mel if p != "r"]
        assert len(morae) == len(sung), (
            f"line {lid} ({ln.section}): morae {len(morae)} {morae} != notes {len(sung)}")
        ko = key_offset_of(ln.section) + KEY_SHIFT
        t = bar_time(section_start(ln.section) + ln.bar) + ln.pos * S16
        mi = 0
        notes_here = []
        for p, d in mel:
            dur = d * S16
            if p != "r":
                vn = VNote(t, t + dur, midi(p) + ko, morae[mi], lid, ln.section)
                vnotes.append(vn)
                notes_here.append(vn)
                mi += 1
            t += dur
        # 表示チャンクに時刻を割り当て
        chunks = []
        k = 0
        for disp, ms in toks:
            if disp == "/":
                chunks.append(LyricChunk("　", None, None, sep=True))
                continue
            if not ms:   # 記号（？ や ──）は直前のモーラ終わりに出す
                tt = notes_here[k - 1].t1 if k > 0 else notes_here[0].t0
                chunks.append(LyricChunk(disp, tt - 0.05, tt))
                continue
            n0 = notes_here[k]
            n1 = notes_here[k + len(ms) - 1]
            chunks.append(LyricChunk(disp, n0.t0, n1.t1))
            k += len(ms)
        lyric_lines.append(LyricLine(lid, ln.section, notes_here[0].t0, notes_here[-1].t1, chunks, notes_here))
    return vnotes, lyric_lines


# ---------------------------------------------------------------------------
# 楽器パート（ヴォーカル以外）のメロディ
# ---------------------------------------------------------------------------
def chorus_melody_notes(section_name, start_bar, lines_idx=range(8), shift=0):
    """サビのメロディを楽器用に（歌詞なしで）展開。hook / inter で使う。"""
    out = []
    for i in lines_idx:
        b, p, tok, mel = CHORUS_LINES[i]
        t = bar_time(start_bar + b) + p * S16
        for pn, d in parse_melody(mel, p):
            dur = d * S16
            if pn != "r":
                out.append((t, t + dur, midi(pn) + shift))
            t += dur
    return out


if __name__ == "__main__":
    vn, ll = expand_lines()
    print("vocal notes:", len(vn), " lyric lines:", len(ll))
    lo = min(n.key for n in vn)
    hi = max(n.key for n in vn)
    print("range:", lo, hi)
    for l in ll:
        txt = "".join(c.text for c in l.chunks)
        print(f"{l.t0:7.2f}-{l.t1:7.2f} [{l.section:8s}] {txt}")
    print("song end", SONG_END)
