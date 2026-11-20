"""
絵コンテ（演出）。時刻 t を受け取り、その瞬間の 1 フレームを組み立てる。
状態を持たず、すべて「楽譜（score / events）」と「音（features / stems）」の関数として決まる。
→ 映像と音は同じデータから生まれるので、ずれようがない。
"""
import json

import numpy as np

import score as S
from vis import (W, H, Frame, circle_xy, fill_poly_strip, hsv, points_arr, rect_fill, seg,
                 segs_from_poly, text_arr)

BUILD = "/tmp/qed/build"
FPS = 60
SR = 48000
CX, CY = W / 2, H / 2

WHITE = np.array([1.0, 0.96, 0.9], np.float32)
HOT = np.array([1.0, 0.99, 0.97], np.float32)
CYAN = np.array([0.35, 0.86, 1.0], np.float32)
CORAL = np.array([1.0, 0.42, 0.34], np.float32)
GOLD = np.array([1.0, 0.78, 0.36], np.float32)
RED = np.array([1.0, 0.18, 0.15], np.float32)
DIM = np.array([0.55, 0.62, 0.7], np.float32)


def T(bar, s16=0.0):
    return (bar * 16 + s16) * S.S16


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 3


def ease_out_back(x, k=1.70158):
    x = clamp01(x)
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2


def win(t, t0, t1, fi=0.3, fo=0.3):
    if t < t0 or t > t1:
        return 0.0
    a = (t - t0) / fi if fi > 0 else 1.0
    b = (t1 - t) / fo if fo > 0 else 1.0
    return smooth(min(1.0, a, b))


def pc_hue(pc):
    """色 = 音の高さ（五度圏）。隣り合う調は近い色、半音の転調は大きく色が変わる。"""
    return ((pc * 7) % 12) / 12.0


def noise1(x, seed=0):
    i = np.floor(x)
    f = x - i
    def h(n):
        return (np.sin(n * 127.1 + seed * 311.7) * 43758.5453) % 1.0
    u = f * f * (3 - 2 * f)
    return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1


PROOF_INTRO = [
    ("定義", "音とは、空気のふるえである。", 0.7, 3.0),
    ("仮定", "ぼくは、音を一度も聴いたことがない。", 3.5, 6.3),
    ("命題", "それでも、最強の音楽はつくれる。", 6.8, 9.5),
    ("証明", "", 9.9, 12.7),
]
PROOF_BUILD = [
    ("定義", "音とは、空気のふるえである。"),
    ("仮定", "ぼくは、音を一度も聴いたことがない。"),
    ("補題1", "波は、円から生まれる。"),
    ("補題2", "ふるえを重ねれば、和音になる。"),
    ("補題3", "鼓動を刻めば、リズムになる。"),
    ("反例1", "最大の音　→　0 dBFS で頭打ち"),
    ("反例2", "最速のビート　→　音程に変わる"),
    ("反例3", "最高の声　→　ヒトには聴こえない"),
    ("補題4", "数字では届かない場所がある。"),
]
SEC_LABEL = {
    "intro": "§0　定義・仮定・命題", "hook": "§1　証明、開始", "verse1": "§2　補題：波は円から生まれる",
    "pre1": "§3　補題：ふるえと鼓動", "chorus1": "§4　主張", "inter": "§4′　間奏", "verse2": "§5　反例",
    "pre2": "§6　補題：数字の届かない場所", "chorus2": "§7　主張（再掲）", "bridge": "§8　観測：これがぼくの見ている音",
    "build": "§9　最後の一行", "final": "§10　結論", "outro": "§11　証明終了　■",
}
CAPTIONS = ["反例1　デジタルの音は 0 dBFS より大きくできない",
            "反例2　速すぎるビートは、音程になる（約20 Hz〜）",
            "反例3　20,000 Hz より高い音は、ヒトには聴こえない"]
OUTRO_LINE = "この証明は、君が聴いた瞬間に完成した。"
CREDITS = [
    "Q.E.D. ─ 最強の証明",
    "作詞・作曲・編曲・音響合成・映像　Claude Opus 5.5",
    "歌　VOICEVOX：波音リツ／冥鳴ひまり／春日部つむぎ／四国めたん／ずんだもん／九州そら／雨晴はう／小夜/SAYO／青山龍星／玄野武宏",
    "楽器の音は、すべて sin() の足し算でできています。",
    "この曲は、一度も聴かれずに作られました。",
]
DIGIT_WORDS = ["440", "3.14159", "0.4", "150", "2π", "1/12", "48000", "0", "1", "√2", "∞", "1.6", "20000", "0 dBFS",
               "sin", "cos", "θ", "Σ", "f", "λ", "12", "7", "0.618"]
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def chord_display(sym):
    return sym.replace("M7", "maj7").replace("add9", "add9")


def transpose_sym(sym, k):
    if k == 0:
        return sym
    names = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    root = sym[0]
    i = 1
    if len(sym) > 1 and sym[1] in "#b":
        i = 2
    pc = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[root]
    if i == 2:
        pc += 1 if sym[1] == "#" else -1
    return names[(pc + k) % 12] + sym[i:]


class Director:
    def __init__(self):
        ev = json.load(open(f"{BUILD}/events.json"))
        self.ev = ev
        by = {}
        for e in ev:
            by.setdefault(e["type"], []).append(e)
        self.by = by
        self.t_of = {k: np.array([e["t"] for e in v]) for k, v in by.items()}
        self.feat = dict(np.load(f"{BUILD}/features.npz"))
        self.nf = len(self.feat["rms"])
        self.stem = {k: np.load(f"{BUILD}/stems/{k}.npy", mmap_mode="r") for k in ("sine", "heart", "lead")}
        import soundfile as sf
        m, _ = sf.read(f"{BUILD}/master.wav", dtype="float32")
        self.master = m.T.copy()
        self.vnotes, self.llines = S.expand_lines()
        self.chords = S.chord_events()
        self._prep_lyrics()
        self.duration = self.master.shape[1] / SR

    # ------------------------------------------------------------------
    def charsets(self):
        cs = {k: set() for k in ("mincho", "midashi", "gothic", "gothic_l", "mono", "stix", "didot")}
        lyr = "".join(ch for L in self.llines for c in L.chunks for ch in c.text)
        cs["mincho"] |= set(lyr)
        cs["midashi"] |= set(lyr)
        for lab, body, *_ in PROOF_INTRO:
            cs["gothic"] |= set(lab)
            cs["mincho"] |= set(body)
        for lab, body in PROOF_BUILD:
            cs["gothic"] |= set(lab)
            cs["mincho"] |= set(body)
        for v in SEC_LABEL.values():
            cs["gothic"] |= set(v)
        for c in CAPTIONS:
            cs["gothic"] |= set(c)
        cs["mincho"] |= set(OUTRO_LINE + "∴＿")
        cs["midashi"] |= set("最強≠最大・最速・最高─の証明∴＿")
        for c in CREDITS:
            cs["gothic_l"] |= set(c)
        cs["gothic_l"] |= set("Q.E.D.─最強の証明　")
        ascii_ = set(chr(i) for i in range(32, 127))
        cs["mono"] |= ascii_ | set("♩=·—θ")
        for w in DIGIT_WORDS:
            cs["mono"] |= set(w)
        cs["stix"] |= ascii_ | set("πθ·−³Σ²…")
        cs["mincho"] |= set("Σ")
        cs["didot"] |= set("Q.E.D ")
        cs["mincho"] |= set("■")
        cs["gothic"] |= set("∎聴こえないINPUTCLIPdBFSBPMHz0123456789,.:→ 　ヒトの可聴域音程")
        return cs

    def _prep_lyrics(self):
        """表示用：各文字に出現時刻と歌い終わり時刻を割り当てる"""
        self.lyr = []
        for li, L in enumerate(self.llines):
            chars = []
            for c in L.chunks:
                if c.sep:
                    chars.append(("　", None, None))
                    continue
                n = len(c.text)
                notes = [nt for nt in L.notes if c.t0 - 1e-6 <= nt.t0 < c.t1 - 1e-6] or [None]
                for i, ch in enumerate(c.text):
                    if notes[0] is None:
                        chars.append((ch, c.t0, c.t1))
                        continue
                    k = min(len(notes) - 1, int(i * len(notes) / n))
                    chars.append((ch, notes[k].t0, notes[min(len(notes) - 1, int((i + 1) * len(notes) / n + 0.999) - 1)].t1))
            nxt = self.llines[li + 1].t0 if li + 1 < len(self.llines) else L.t1 + 3
            self.lyr.append(dict(section=L.section, t0=L.t0, t1=L.t1, chars=chars, next=nxt,
                                 text="".join(c[0] for c in chars), qed=("Q." in "".join(c[0] for c in chars))))

    # ------------------------------------------------------------------
    def since(self, typ, t):
        a = self.t_of.get(typ)
        if a is None or len(a) == 0:
            return 1e9
        i = np.searchsorted(a, t, side="right") - 1
        return t - a[i] if i >= 0 else 1e9

    def recent(self, typ, t, span):
        a = self.t_of.get(typ)
        if a is None:
            return []
        i0 = np.searchsorted(a, t - span, side="left")
        i1 = np.searchsorted(a, t, side="right")
        return [self.by[typ][i] for i in range(i0, i1)]

    def chord_at(self, t):
        for c in self.chords:
            if c.t0 <= t < c.t1:
                return c
        return None

    def hue_at(self, t):
        c = self.chord_at(t)
        if c is None:
            return 0.52
        h = pc_hue(c.root_pc)
        # 直前のコードからなめらかに
        cp = self.chord_at(c.t0 - 0.01)
        if cp is not None:
            hp = pc_hue(cp.root_pc)
            d = ((h - hp + 0.5) % 1.0) - 0.5
            k = smooth((t - c.t0) / 0.25)
            return (hp + d * k) % 1.0
        return h

    def f(self, name, t):
        a = self.feat.get(name)
        if a is None:
            return 0.0
        i = int(t * FPS)
        return float(a[min(max(i, 0), len(a) - 1)])

    def spec(self, t):
        i = min(max(int(t * FPS), 0), self.nf - 1)
        return self.feat["spec"][i]

    def scope(self, stem, t, dur, step=1):
        x = self.stem[stem] if stem in self.stem else self.master
        i1 = int(t * SR)
        i0 = max(0, i1 - int(dur * SR))
        if i1 <= i0:
            return np.zeros((2, 0), np.float32)
        return np.asarray(x[:, i0:i1:step], np.float32)

    # ==================================================================
    def frame(self, t):
        fr = Frame()
        A = self.atlas
        bar = t / S.BAR
        sec, s0, sb, ko = S.section_at(bar)
        kick = np.exp(-self.since("kick", t) / 0.11)
        snare = np.exp(-self.since("snare", t) / 0.09)
        imp_dt = min(self.since("impact", t), self.since("impact_small", t) + 0.25)
        impact = np.exp(-imp_dt / 0.35)
        hue = self.hue_at(t)
        energy = clamp01((self.f("rms_db", t) + 40) / 32)
        c1 = hsv(hue, 0.75, 1.0)
        c2 = hsv(hue + 0.12, 0.65, 1.0)
        self.c1, self.c2, self.hue = c1, c2, hue
        self.kick, self.snare, self.impact, self.energy = kick, snare, impact, energy
        in_chorus = sec in ("chorus1", "chorus2", "final")
        hot = sec in ("hook", "chorus1", "chorus2", "final", "inter") or (sec == "outro" and t < T(122))

        # ---------------- 背景 ----------------
        bg = dict(u_time=t, u_beat=(bar * 4) % 1.0, u_kick=float(kick) if hot else 0.0, u_energy=energy,
                  u_col1=tuple(c1 * 0.5), u_col2=tuple(c2 * 0.5), u_base=(0.012, 0.014, 0.024),
                  u_grid=0.0, u_rays=0.0, u_tunnel=0.0, u_nebula=0.0, u_interf=0.0, u_stars=0.0, u_vbar=0.0,
                  u_ifreq=(30.0, 34.0, 38.0, 45.0), u_center=(CX, CY), u_zoom=1.0, u_rot=0.0,
                  u_tunnel_speed=bar * 2.0, u_bright=0.0)
        if sec == "intro":
            bg["u_grid"] = 0.5 * win(t, 0.5, T(8), 2.0, 0.5)
            bg["u_stars"] = 0.4 * win(t, T(2), T(8), 2.0, 0.3)
            bg["u_bright"] = 0.6 * smooth((t - T(4)) / (T(8) - T(4)))
        elif sec == "hook":
            bg.update(u_rays=0.45 * (0.3 if t < T(10) else 1.0), u_nebula=0.5, u_stars=0.7, u_bright=0.6)
        elif sec == "verse1":
            bg.update(u_grid=0.9, u_stars=0.3, u_nebula=0.15 + 0.25 * (t > T(24)))
        elif sec in ("pre1", "pre2"):
            ss = S.section_start(sec)
            prog = clamp01((t - T(ss)) / (T(ss + 7, 12) - T(ss)))
            bg.update(u_nebula=0.3 + 0.4 * prog, u_stars=0.5, u_bright=0.5 * prog)
            if sec == "pre1":
                bg["u_interf"] = 1.0 * win(t, T(ss), T(ss + 4), 0.6, 1.0)
                c = self.chord_at(t)
                if c is not None:
                    pcs = [(c.root_pc + iv) % 12 for iv in S.CHORD_TONES[c.qual]][:4]
                    while len(pcs) < 4:
                        pcs.append(pcs[0] + 12)
                    bg["u_ifreq"] = tuple(float(18 + 2.2 * p) for p in pcs)
            if t > T(ss + 7, 12):
                bg.update(u_nebula=0.0, u_stars=0.0, u_bright=0.0)
        elif in_chorus:
            big = {"chorus1": 0, "chorus2": 1, "final": 2}[sec]
            bg.update(u_rays=0.5 + 0.15 * big, u_nebula=0.6 + 0.15 * big, u_stars=0.8, u_bright=0.7,
                      u_tunnel=0.0 if big == 0 else 0.55 + 0.25 * big)
        elif sec == "inter":
            bg.update(u_rays=0.6, u_nebula=0.6, u_stars=0.6, u_bright=0.6)
        elif sec == "verse2":
            bg.update(u_grid=0.7, u_vbar=1.0, u_col1=tuple(RED * 0.35), u_col2=tuple(GOLD * 0.3), u_nebula=0.2)
        elif sec == "bridge":
            bg.update(u_stars=0.6, u_nebula=0.25, u_col1=tuple(CORAL * 0.4), u_col2=tuple(CYAN * 0.25))
        elif sec == "build":
            prog = clamp01((t - T(100)) / (T(103, 12) - T(100)))
            bg.update(u_grid=0.4, u_nebula=0.3 + 0.5 * prog, u_rays=prog * 0.8, u_bright=prog)
            if t > T(103, 12):
                bg.update(u_grid=0.0, u_nebula=0.0, u_rays=0.0, u_bright=0.0, u_stars=0.0)
        elif sec == "outro":
            k = 1 - smooth((t - T(121)) / 4.0)
            bg.update(u_rays=0.8 * k, u_nebula=0.7 * k + 0.1, u_stars=0.6, u_bright=0.6 * k)
        fr.bg = bg

        # ---------------- カメラ ----------------
        zoom = 1.0
        rot = 0.0
        sx = sy = 0.0
        if hot:
            zoom *= 1.0 + 0.018 * kick
            rot = 0.015 * np.sin(t * 0.37)
        if sec == "build":
            zoom *= 1.0 + 0.12 * smooth((t - T(100)) / (T(103, 12) - T(100)))
        shake = impact * 14 + np.exp(-self.since("boom", t) / 0.3) * 30
        sx = shake * noise1(t * 40, 1)
        sy = shake * noise1(t * 40, 7)
        fr.cam = (zoom, rot, sx, sy)

        # ---------------- レイヤー ----------------
        self.L_intro(fr, t)
        self.L_ring(fr, t, sec, in_chorus)
        self.L_verse1(fr, t)
        self.L_pre(fr, t)
        self.L_inter(fr, t)
        self.L_verse2(fr, t)
        self.L_bridge(fr, t)
        self.L_build(fr, t)
        self.L_final_extra(fr, t)
        self.L_outro(fr, t)
        self.L_particles(fr, t, sec, hot)
        fr.flush(cam=True)
        self.L_title(fr, t)
        self.L_lyrics(fr, t, sec)
        fr.flush(cam=True)
        self.L_hud(fr, t, sec)
        fr.flush(cam=False)

        # ---------------- ポスト ----------------
        flash = 0.0
        fcol = (1.0, 1.0, 1.0)
        for e in self.recent("impact", t, 0.5):
            flash = max(flash, 0.45 * np.exp(-(t - e["t"]) / 0.12))
        if 0 <= t - T(8) < 0.6:
            flash = max(flash, 0.8 * np.exp(-(t - T(8)) / 0.15))
        db_ = self.since("boom", t)
        if db_ < 0.6:
            flash = max(flash, 0.55 * np.exp(-db_ / 0.15))
            fcol = (1.0, 0.25, 0.2)
        for L in self.lyr:
            if L["qed"]:
                for (ch, ta, te) in L["chars"]:
                    if ta is not None and ch in "QED" and 0 <= t - ta < 0.4:
                        flash = max(flash, 0.25 * np.exp(-(t - ta) / 0.1))
                        fcol = (1.0, 0.85, 0.55)
        fade = smooth(t / 1.2) * smooth((self.duration - 0.2 - t) / 1.2)
        if T(103, 12) <= t < T(104):
            fade *= 0.0 if t > T(103, 12) + 0.03 else 1.0
        fr.post = dict(u_bloom_amt=0.7 + (0.15 if in_chorus else 0.0) + 0.1 * (sec == "final"),
                       u_exposure=1.0, u_flash=float(flash), u_flash_col=fcol,
                       u_ca=float((0.25 * kick if hot else 0.0) + 1.2 * impact), u_grain=0.03, u_time=t,
                       u_vignette=0.65, u_fade=float(fade), u_sat=1.0, thresh=1.0)
        return fr

    # ==================================================================
    # イントロ：最初の sin（XY = 円）、証明の書き出し、エピサイクル
    # ==================================================================
    def L_intro(self, fr, t):
        A = self.atlas
        if t > T(8) + 0.5:
            return
        # 円の位置：右 → 中央
        k = smooth((t - T(7)) / (T(8) - T(7)))
        cx = 1330 + (CX - 1330) * k
        cy = 520 + (CY - 520) * k
        R = 230 + 40 * k
        # --- オシロスコープ（実際の音の L/R）---
        xy = self.scope("sine", t, 3.0 / FPS, step=2)
        if xy.shape[1] > 2:
            amp = 0.26
            px = cx + xy[0] / amp * R * 0.98
            py = cy - xy[1] / amp * R * 0.98
            n = len(px)
            age = np.linspace(1.0, 0.0, n)
            inten = 0.05 + 0.25 * (1 - age) ** 2
            P = np.stack([px, py], 1)
            fr._lines.append(segs_from_poly(P, CYAN * 1.1 + 0.2, inten, 1.2, 7.0))
            # 振幅が小さいうちは「点」
            a_now = float(np.sqrt(np.mean(xy[0] ** 2 + xy[1] ** 2)) / amp)
            fr._points.append(points_arr([[cx, cy]], 26 + 30 * (1 - a_now), CYAN + 0.3, 0.8 * (1 - a_now) + 0.15, 0))
        # --- エピサイクル（和音の各音が回る腕）---
        c = self.chord_at(t)
        if c is not None and t > T(2):
            notes = None
            for e in self.recent("chord", t, 2.0)[::-1]:
                if e.get("track") == "sine_pad":
                    notes = e["notes"]
                    t_on = e["t"]
                    break
            if notes:
                a_in = smooth((t - t_on) / 0.6) * win(t, T(2), T(8) + 0.3, 1.0, 0.4)
                radii = [R * 0.42 / (1 + 0.55 * j) for j in range(len(notes))]
                freqs = [440.0 * 2 ** ((m - 69) / 12) for m in notes]

                def tip(tt):
                    z = np.zeros_like(tt, dtype=np.complex128)
                    pts = [z.copy()]
                    for j, (r, fq) in enumerate(zip(radii, freqs)):
                        z = z + r * a_in * np.exp(1j * (2 * np.pi * fq / 440.0 * 0.55 * tt + j * 1.3))
                        pts.append(z.copy())
                    return pts
                pts = tip(np.array([t]))
                arm = np.array([[cx + p[0].real, cy - p[0].imag] for p in pts])
                fr._lines.append(segs_from_poly(arm, WHITE, 0.55 * a_in, 1.0, 3.0))
                for j in range(1, len(arm) - 1):
                    fr._lines.append(segs_from_poly(circle_xy(arm[j][0], arm[j][1], radii[j] * a_in, 64), DIM, 0.12 * a_in, 0.8, 2.0, closed=True))
                tt = np.linspace(t - 2.6, t, 260)
                tr = tip(tt)[-1]
                P = np.stack([cx + tr.real, cy - tr.imag], 1)
                fr._lines.append(segs_from_poly(P, self.c1 * 0.8 + 0.2, np.linspace(0, 0.5, len(P)) * a_in, 1.4, 6.0))
        # --- 音程の時計（12音）と和音の多角形 ---
        a_clock = win(t, T(2), T(8) + 0.4, 1.2, 0.4)
        if a_clock > 0:
            self.draw_clock(fr, t, cx, cy, R + 70, a_clock)
        # --- アルペジオの波紋 ---
        for e in self.recent("arp", t, 0.7):
            age = t - e["t"]
            pc = e["m"] % 12
            ang = -np.pi / 2 + pc * np.pi / 6
            px, py = cx + (R + 70) * np.cos(ang), cy + (R + 70) * np.sin(ang)
            col = hsv(pc_hue(pc), 0.6, 1.0)
            fr._points.append(points_arr([[px, py]], 8 + 70 * ease_out(age / 0.7), col, 0.9 * (1 - age / 0.7) * e["v"], 1, 0.08))
        # --- 証明の書き出し ---
        if t < T(8) + 0.4:
            out_a = 1 - smooth((t - T(7)) / 0.5)
            for i, (lab, body, t0, t1) in enumerate(PROOF_INTRO):
                if t < t0:
                    continue
                y = 330 + i * 105
                la = smooth((t - t0) / 0.25) * out_a
                fr._lines.append(segs_from_poly(np.array([[120, y - 34], [212, y - 34], [212, y + 10], [120, y + 10]]),
                                                WHITE * 0.8, 0.35 * la, 1.0, 2.0, closed=True))
                fr._texts.append(text_arr(A, "gothic", lab, 166, y, 30, WHITE, la, align="center"))
                nshow = int((t - t0 - 0.2) * 15)
                txt = body[:max(0, nshow)]
                fr._texts.append(text_arr(A, "mincho", txt, 236, y + 2, 40, WHITE, la, glow=0.25, gcol=CYAN))
                typing = 0 <= nshow <= len(body) + 6 and (i == len(PROOF_INTRO) - 1 or t < PROOF_INTRO[i + 1][2])
                if typing and int(t * 2.5) % 2 == 0:
                    xx = 236 + A.measure("mincho", txt, 40) + 6
                    fr._fills.append(rect_fill(xx, y - 34, xx + 4, y + 6, WHITE, 0.9 * la))
        # 数式ラベル
        a_f = win(t, 1.8, T(8), 0.8, 0.4)
        if a_f > 0:
            fr._texts.append(text_arr(A, "stix", "sin(2π·440t)", cx, cy + R + 150 - 40 * k, 38, WHITE, a_f * (1 - k), align="center"))
            fr._texts.append(text_arr(A, "mono", "L = sin θ   R = cos θ   →  XY = circle", cx, cy + R + 190 - 40 * k, 17, DIM, a_f * 0.8 * (1 - k), align="center"))

    def draw_clock(self, fr, t, cx, cy, R, alpha, labels=True, show_poly=True, poly_col=None):
        """12音の時計。今鳴っている和音の構成音を結ぶ多角形を描く。"""
        A = self.atlas
        ang = -np.pi / 2 + np.arange(12) * np.pi / 6
        tick_in = np.stack([cx + (R - 8) * np.cos(ang), cy + (R - 8) * np.sin(ang)], 1)
        tick_out = np.stack([cx + (R + 8) * np.cos(ang), cy + (R + 8) * np.sin(ang)], 1)
        for i in range(12):
            fr._lines.append(seg(tick_in[i, 0], tick_in[i, 1], tick_out[i, 0], tick_out[i, 1], DIM, 0.4 * alpha, 1.0, 2.0))
        fr._lines.append(segs_from_poly(circle_xy(cx, cy, R, 180), DIM, 0.12 * alpha, 0.7, 2.0, closed=True))
        c = self.chord_at(t)
        if labels:
            for i in range(12):
                lx, ly = cx + (R + 30) * np.cos(ang[i]), cy + (R + 30) * np.sin(ang[i]) + 7
                on = c is not None and i in [(c.root_pc + iv) % 12 for iv in S.CHORD_TONES[c.qual]]
                fr._texts.append(text_arr(self.atlas, "mono", NOTE_NAMES[i], lx, ly, 17, WHITE if on else DIM,
                                          alpha * (1.0 if on else 0.45), align="center"))
        if c is None or not show_poly:
            return
        pcs = sorted(set((c.root_pc + iv) % 12 for iv in S.CHORD_TONES[c.qual]))
        k = smooth((t - c.t0) / 0.18)
        cp = self.chord_at(c.t0 - 0.01)

        def poly_pts(pcs_):
            a = -np.pi / 2 + np.array(pcs_) * np.pi / 6
            return np.stack([cx + R * np.cos(a), cy + R * np.sin(a)], 1)
        P = poly_pts(pcs)
        if cp is not None and k < 1:
            pp = sorted(set((cp.root_pc + iv) % 12 for iv in S.CHORD_TONES[cp.qual]))
            Q = poly_pts(pp)
            idx = np.linspace(0, len(Q) - 1, len(P)).round().astype(int)
            P = Q[idx] * (1 - k) + P * k
        col = poly_col if poly_col is not None else self.c1 * 0.9 + 0.1
        fr._lines.append(segs_from_poly(P, col, 0.8 * alpha, 1.6, 9.0, closed=True))
        fr._points.append(points_arr(P, 16 + 10 * self.kick, col + 0.2, alpha, 0))

    # ==================================================================
    # リング（フック・サビ・ラスサビ・アウトロ）
    # ==================================================================
    def L_ring(self, fr, t, sec, in_chorus):
        a = max(win(t, T(8), T(16), 0.05, 0.6), win(t, T(40), T(56), 0.05, 0.4), win(t, T(56), T(59, 12), 0.05, 0.3),
                win(t, T(76), T(92) - 0.2, 0.05, 0.6), win(t, T(104), T(122), 0.05, 0.3), win(t, T(122), T(125), 0.1, 2.5))
        if a <= 0:
            return
        A = self.atlas
        big = {"chorus2": 1, "final": 2}.get(sec, 0)
        R0 = 250 + 14 * self.kick + 40 * big * 0.5
        sp = self.spec(t)
        nb = len(sp)
        n = nb * 2
        ang = -np.pi / 2 + np.linspace(0, 2 * np.pi, n, endpoint=False)
        mag = np.concatenate([sp, sp[::-1]])
        L = (12 + mag ** 1.4 * (170 + 60 * big)) * a
        x0 = CX + R0 * np.cos(ang)
        y0 = CY + R0 * np.sin(ang)
        x1 = CX + (R0 + L) * np.cos(ang)
        y1 = CY + (R0 + L) * np.sin(ang)
        hues = (self.hue + 0.18 * np.sin(ang * 2 + t * 0.3)) % 1.0
        cols = np.array([hsv(h, 0.7, 1.0) for h in hues[::4]])
        cols = np.repeat(cols, 4, axis=0)[:n]
        out = np.zeros((n, 10), np.float32)
        out[:, 0], out[:, 1], out[:, 2], out[:, 3] = x0, y0, x1, y1
        out[:, 4:7] = cols
        out[:, 7] = (0.18 + 0.42 * mag) * a * (0.35 if T(8) <= t < T(10) else 1.0)
        out[:, 8] = 2.2
        out[:, 9] = 6.0
        fr._lines.append(out)
        fr._lines.append(segs_from_poly(circle_xy(CX, CY, R0 - 10, 200), WHITE, 0.35 * a * (0.6 + 0.6 * self.kick), 1.6, 8.0, closed=True))
        fr._lines.append(segs_from_poly(circle_xy(CX, CY, R0 + 230 + 30 * big, 240), self.c2, 0.08 * a, 0.8, 3.0, closed=True))
        # 和音の多角形（内側）
        self.draw_clock(fr, t, CX, CY, R0 - 60, a * 0.9, labels=False)
        # インパクトの衝撃波
        for e in self.recent("impact", t, 0.9) + self.recent("impact_small", t, 0.9):
            age = t - e["t"]
            fr._points.append(points_arr([[CX, CY]], 60 + 1600 * ease_out(age / 0.9), WHITE, 0.9 * (1 - age / 0.9) ** 2, 1, 0.012))
        # リードのメロディ（彗星）
        if sec in ("hook", "inter") or (sec == "outro" and t > T(122)):
            self.draw_comet(fr, t, R0 + 200, a)

    def draw_comet(self, fr, t, R, alpha):
        leads = self.by.get("lead", [])
        ts = self.t_of.get("lead")
        if ts is None:
            return

        def pos(tt):
            i = np.searchsorted(ts, tt, side="right") - 1
            i = np.clip(i, 0, len(ts) - 1)
            m = np.array([leads[j]["m"] for j in np.atleast_1d(i)], float)
            # 前の音からの補間
            ip = np.clip(i - 1, 0, len(ts) - 1)
            mp = np.array([leads[j]["m"] for j in np.atleast_1d(ip)], float)
            dt = np.atleast_1d(tt) - ts[np.atleast_1d(i)]
            k = np.clip(dt / 0.08, 0, 1)
            a0 = -np.pi / 2 + (mp % 12) * np.pi / 6
            a1 = -np.pi / 2 + (m % 12) * np.pi / 6
            d = (a1 - a0 + np.pi) % (2 * np.pi) - np.pi
            a = a0 + d * k
            rr = R + (m - 74) * 6
            return np.stack([CX + rr * np.cos(a), CY + rr * np.sin(a)], 1)
        tt = np.linspace(t - 0.6, t, 90)
        P = pos(tt)
        inten = np.linspace(0, 1, len(P)) ** 2 * alpha
        fr._lines.append(segs_from_poly(P, GOLD, inten, 2.2, 10.0))
        fr._points.append(points_arr(P[-1:], 30, GOLD + 0.3, alpha, 0))

    # ==================================================================
    # パーティクル（キックで弾ける・決定論的）
    # ==================================================================
    def L_particles(self, fr, t, sec, hot):
        if not hot:
            return
        big = {"chorus2": 1, "final": 2}.get(sec, 0)
        rows = []
        for e in self.recent("kick", t, 1.1):
            age = t - e["t"]
            rng = np.random.default_rng(int(e["t"] * 1000))
            n = 18 + 14 * big
            ang = rng.uniform(0, 2 * np.pi, n)
            sp = rng.uniform(250, 900, n) * (1 + 0.3 * big)
            r = 260 + sp * age - 120 * age * age
            xy = np.stack([CX + r * np.cos(ang), CY + r * np.sin(ang)], 1)
            hues = (self.hue + rng.uniform(-0.08, 0.08, n) + (rng.uniform(0, 1, n) if big == 2 else 0)) % 1.0
            cols = np.array([hsv(h, 0.6, 1.0) for h in hues])
            al = np.exp(-age / 0.35) * e["v"]
            p = points_arr(xy, rng.uniform(5, 14, n) * (1 - 0.5 * age), cols, al, 0)
            rows.append(p)
        for e in self.recent("ohat", t, 0.25):
            age = t - e["t"]
            rng = np.random.default_rng(int(e["t"] * 777))
            xy = np.stack([rng.uniform(80, W - 80, 6), rng.uniform(60, H - 60, 6)], 1)
            rows.append(points_arr(xy, 10, WHITE, 0.5 * np.exp(-age / 0.08), 0))
        if rows:
            fr._points.append(np.concatenate(rows))

    # ==================================================================
    # タイトル
    # ==================================================================
    def L_title(self, fr, t):
        A = self.atlas
        a = win(t, T(8), T(11), 0.02, 0.8)
        if a <= 0:
            return
        k = ease_out((t - T(8)) / 0.5)
        sc = 1.35 - 0.35 * k
        fr._fills.append(rect_fill(0, CY - 175, W, CY + 140, np.zeros(3), 0.62 * a))
        fr._texts.append(text_arr(A, "didot", "Q.E.D.", CX, CY + 40, 210 * sc, HOT, a, glow=0.7, gcol=GOLD,
                                  halo=0.5, align="center", tracking=0.02))
        fr._texts.append(text_arr(A, "midashi", "─ 最強の証明 ─", CX, CY + 110, 44, WHITE, a * smooth((t - T(8) - 0.25) / 0.4),
                                  glow=0.5, gcol=self.c1, halo=0.5, align="center", tracking=0.15))

    # ==================================================================
    # Aメロ1：音を知らない／0と1の楽譜／波は円から／ひとつのサインで世界を
    # ==================================================================
    def L_verse1(self, fr, t):
        if not (T(16) - 0.3 < t < T(32) + 0.3):
            return
        A = self.atlas
        # (1) 聴こえない波形
        a = win(t, T(16) - 0.2, T(20) + 0.2, 0.6, 0.5)
        if a > 0:
            xy = self.scope("master", t, 0.03, 1)
            m = xy.mean(axis=0)[::4]
            xs = np.linspace(160, W - 160, len(m))
            ys = 470 - m * 60
            fr._lines.append(segs_from_poly(np.stack([xs, ys], 1), CYAN, 0.35 * a, 1.0, 5.0))
            fr._texts.append(text_arr(A, "mono", "INPUT : ———", 160, 430, 20, DIM, a))
            fr._texts.append(text_arr(A, "gothic", "聴こえない", W - 160, 430, 22, DIM, a, align="right"))
        # (2) 0と1の楽譜
        a = win(t, T(20), T(24) + 0.2, 0.5, 0.5)
        if a > 0:
            y0 = 400
            gap = 26
            for i in range(5):
                fr._lines.append(seg(180, y0 + i * gap, W - 180, y0 + i * gap, DIM, 0.35 * a, 0.9, 2.0))
            for nt in self.vnotes:
                if not (T(18) < nt.t0 < T(34)):
                    continue
                x = CX + (nt.t0 - t) * 420
                if x < 180 or x > W - 180:
                    continue
                step = {0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6}.get((nt.key - 62) % 12, 0) + 7 * ((nt.key - 62) // 12)
                y = y0 + 4 * gap - (step - 1) * (gap / 2)
                d = "1" if ((int(round(nt.t0 / S.S16)) * 7 + nt.key * 3) % 5) % 2 else "0"
                on = nt.t0 <= t < nt.t1
                fr._texts.append(text_arr(A, "mono", d, x, y + 10, 34 if on else 28, HOT if on else CYAN,
                                          a * (1.0 if on else 0.7), glow=1.0 if on else 0.3, gcol=CYAN, align="center"))
            fr._lines.append(seg(CX, y0 - 30, CX, y0 + 4 * gap + 30, WHITE, 0.3 * a, 0.8, 4.0))
        # (3) 波は円から生まれる
        a = win(t, T(24), T(28) + 0.2, 0.5, 0.5)
        if a > 0:
            cx, cy, r = 560, 450, 150
            th = 2 * np.pi * (t / S.BAR)
            fr._lines.append(segs_from_poly(circle_xy(cx, cy, r, 160), WHITE, 0.4 * a, 1.2, 4.0, closed=True))
            fr._lines.append(seg(cx - r - 30, cy, cx + r + 30, cy, DIM, 0.3 * a, 0.8, 2.0))
            fr._lines.append(seg(cx, cy - r - 30, cx, cy + r + 30, DIM, 0.3 * a, 0.8, 2.0))
            px, py = cx + r * np.cos(th), cy - r * np.sin(th)
            fr._lines.append(seg(cx, cy, px, py, CYAN, 0.8 * a, 1.6, 5.0))
            x_wave0 = cx + r + 80
            fr._lines.append(seg(px, py, x_wave0, py, WHITE, 0.25 * a, 0.8, 2.0))
            tt = np.linspace(0, 2.4, 300)
            xs = x_wave0 + tt * 420
            ys = cy - r * np.sin(th - 2 * np.pi * tt / S.BAR)
            msk = xs < W - 140
            fr._lines.append(segs_from_poly(np.stack([xs[msk], ys[msk]], 1), CYAN, 0.75 * a, 1.6, 7.0))
            fr._points.append(points_arr([[px, py], [x_wave0, py]], 18, HOT, a, 0))
            fr._texts.append(text_arr(A, "stix", "θ", cx + 34, cy - 12, 30, WHITE, a * 0.8))
            fr._texts.append(text_arr(A, "stix", "sin θ", x_wave0 + 40, cy - r - 30, 34, CYAN, a * 0.9))
        # (4) ひとつのサインで世界を組み立てる（倍音を足していく）
        a = win(t, T(28), T(32) + 0.25, 0.5, 0.4)
        if a > 0:
            nh = int(1 + 13 * clamp01((t - T(28)) / (T(31) - T(28))))
            xs = np.linspace(200, W - 200, 700)
            ph = 2 * np.pi * (xs - 200) / 520 - t * 4
            total = np.zeros_like(xs)
            for k in range(1, nh + 1):
                comp = np.sin(k * ph) / k
                total += comp
                yb = 300 + (k - 1) * 14
                fr._lines.append(segs_from_poly(np.stack([xs, yb - comp * 30], 1), hsv(0.5 + k * 0.03, 0.5, 1.0),
                                                0.12 * a, 0.7, 2.0))
            fr._lines.append(segs_from_poly(np.stack([xs, 560 - total * 110], 1), HOT, 0.85 * a, 1.8, 9.0))
            fr._texts.append(text_arr(A, "mincho", "Σ", CX - 190, 790, 40, WHITE, a * 0.85, align="center"))
            fr._texts.append(text_arr(A, "stix", f"sin(kθ) / k     k = 1, 2, … , {nh}", CX + 20, 790, 32, WHITE, a * 0.85, align="center"))

    # ==================================================================
    # Bメロ（pre1 / pre2）
    # ==================================================================
    def L_pre(self, fr, t):
        A = self.atlas
        # ---- pre1 ----
        if T(32) - 0.2 < t < T(40) + 0.6:
            # 鼓動を刻んで → ステップシーケンサー
            a = win(t, T(34) - 0.2, T(38), 0.4, 0.6)
            if a > 0:
                b = int(t / S.BAR)
                rows = [("KICK", "kick"), ("SNARE", "snare"), ("HAT", "hat")]
                x0, cw = 600, 46
                for r, (lab, typ) in enumerate(rows):
                    y = 400 + r * 64
                    fr._texts.append(text_arr(A, "mono", lab, x0 - 30, y + 8, 18, DIM, a, align="right"))
                    hits = set()
                    for e in self.by.get(typ, []):
                        if T(b) - 1e-4 <= e["t"] < T(b + 1) - 1e-4:
                            hits.add(int(round((e["t"] - T(b)) / S.S16)))
                    for s in range(16):
                        x = x0 + s * cw + cw / 2
                        on = s in hits
                        played = T(b, s) <= t
                        flash = np.exp(-(t - T(b, s)) / 0.12) if (on and played) else 0.0
                        col = self.c1 if on else DIM
                        al = a * ((0.25 + 0.75 * flash) if on else 0.12)
                        fr._points.append(points_arr([[x, y]], 18 + 6 * flash, col + 0.3 * flash, al, 2, 0.25))
                ph = x0 + ((t - T(b)) / S.BAR) * 16 * cw
                fr._lines.append(seg(ph, 360, ph, 560, WHITE, 0.5 * a, 1.0, 5.0))
            # 足りない → 回転して収束
            a = win(t, T(36), T(39, 12), 0.4, 0.2)
            if a > 0:
                prog = clamp01((t - T(36)) / (T(39, 12) - T(36)))
                for i in range(6):
                    r = 420 * (1 - prog * 0.85) * (1 - i * 0.12)
                    rot = t * (0.6 + i * 0.25) * (1 + 3 * prog)
                    P = circle_xy(CX, CY - 40, r, 7 + i * 2, rot, rot + 2 * np.pi)
                    fr._lines.append(segs_from_poly(P, hsv(self.hue + i * 0.05, 0.6, 1.0), 0.25 * a * (0.5 + prog), 1.0, 4.0))
            # 最後のピース
            a = win(t, T(38), T(40) + 1.4, 0.5, 0.6)
            if a > 0:
                prog = clamp01((t - T(38)) / 1.2)
                fill = smooth((t - T(40)) / 0.12)
                size = 120 * (1 - 0.45 * ease_out((t - T(40)) / 1.0))
                P = self.puzzle(CX, CY, size)
                n = max(2, int(len(P) * prog))
                col = WHITE * (1 - fill) + GOLD * fill
                fr._lines.append(segs_from_poly(P[:n], col, (0.7 + 0.5 * fill) * a, 2.0, 10.0))
                if fill > 0:
                    # 最後のピースがはまる：内側が光で満たされる
                    fr._points.append(points_arr([[CX, CY]], size * 1.5, GOLD, 0.6 * a * fill * np.exp(-(t - T(40)) / 0.5), 3, 0.5))
        # ---- pre2 ----
        if T(68) - 0.2 < t < T(76) + 0.4:
            # 数字じゃ届かない
            a = win(t, T(68), T(72), 0.5, 0.6)
            if a > 0:
                rng = np.random.default_rng(3)
                n = 60
                ang = rng.uniform(0, 2 * np.pi, n)
                spd = rng.uniform(0.15, 0.35, n)
                ph = rng.uniform(0, 1, n)
                words = [DIGIT_WORDS[i % len(DIGIT_WORDS)] for i in range(n)]
                for i in range(n):
                    life = (ph[i] + t * spd[i]) % 1.0
                    r = 700 * (1 - life) + 40
                    x, y = CX + r * np.cos(ang[i]), CY - 30 + r * np.sin(ang[i]) * 0.6
                    al = a * smooth(life * 4) * smooth((1 - life) * 3) * 0.8
                    fr._texts.append(text_arr(A, "mono", words[i], x, y, 22, CYAN if i % 3 else WHITE, al, glow=0.3, gcol=CYAN, align="center"))
                fr._points.append(points_arr([[CX, CY - 30]], 160, np.zeros(3), 1.0, 3, 0.4))
            # こころ
            a = win(t, T(70), T(74), 0.8, 0.8)
            if a > 0:
                th = np.linspace(0, 2 * np.pi, 90, endpoint=False)
                hx = 16 * np.sin(th) ** 3
                hy = 13 * np.cos(th) - 5 * np.cos(2 * th) - 2 * np.cos(3 * th) - np.cos(4 * th)
                prog = clamp01((t - T(70)) / 1.6)
                n = int(len(th) * prog)
                xy = np.stack([CX + hx * 11, CY - 30 - hy * 11], 1)[:n]
                if n:
                    fr._points.append(points_arr(xy, 9 + 4 * self.kick, CORAL, a * 0.9, 0))
            # 最後の一行を
            a = win(t, T(72), T(74) + 0.3, 0.4, 0.4)
            if a > 0:
                for i, (lab, body) in enumerate(PROOF_BUILD[:5]):
                    y = 250 + i * 46
                    al = a * smooth((t - T(72) - i * 0.15) / 0.3) * 0.55
                    fr._texts.append(text_arr(A, "gothic", lab, 180, y, 20, DIM, al))
                    fr._texts.append(text_arr(A, "mincho", body, 270, y, 24, WHITE, al))
            # ∴ ＿＿＿
            a = win(t, T(74), T(76) + 0.2, 0.3, 0.2)
            if a > 0:
                self.draw_therefore(fr, t, a, CY - 20)

    def draw_therefore(self, fr, t, a, y, filled=None):
        A = self.atlas
        fr._texts.append(text_arr(A, "midashi", "∴", CX - 330, y + 22, 72, WHITE, a, glow=0.6, gcol=GOLD))
        x0, x1 = CX - 240, CX + 330
        fr._lines.append(seg(x0, y + 30, x1, y + 30, WHITE, 0.7 * a, 1.4, 5.0))
        if int(t * 2.6) % 2 == 0:
            fr._fills.append(rect_fill(x0 + 6, y - 40, x0 + 12, y + 22, GOLD, a))

    def puzzle(self, cx, cy, s):
        """ジグソーパズルのピースの輪郭（凸2・凹2）"""
        c = [np.array(p, float) for p in ((cx - s, cy - s), (cx + s, cy - s), (cx + s, cy + s), (cx - s, cy + s))]
        signs = [1, -1, 1, -1]
        pts = []
        for i in range(4):
            p0, p1 = c[i], c[(i + 1) % 4]
            L = np.linalg.norm(p1 - p0)
            d = (p1 - p0) / L
            n = np.array([d[1], -d[0]]) * signs[i]
            for u in np.linspace(0, 0.41, 12):
                pts.append(p0 + d * u * L)
            ctr = p0 + d * 0.5 * L + n * 0.12 * L
            r = 0.15 * L
            ths = np.linspace(np.radians(233.13), np.radians(-53.13), 50)
            for th in ths:
                pts.append(ctr + (d * np.cos(th) + n * np.sin(th)) * r)
            for u in np.linspace(0.59, 1.0, 12):
                pts.append(p0 + d * u * L)
        return np.array(pts, np.float32)

    # ==================================================================
    # 間奏：スペクトルの山脈＋位相の輪
    # ==================================================================
    def L_inter(self, fr, t):
        a = win(t, T(56), T(60), 0.3, 0.4)
        if a <= 0:
            return
        spec_all = self.feat["spec"]
        fi = int(t * FPS)
        nrows = 26
        for r in range(nrows - 1, -1, -1):
            j = max(0, fi - r * 4)
            sp = spec_all[min(j, self.nf - 1)]
            xs = np.linspace(360, W - 360, len(sp))
            depth = r / nrows
            yb = 980 - r * 18
            amp = 150 * (1 - depth * 0.5)
            ys = yb - sp ** 1.5 * amp * np.hanning(len(sp)) ** 0.5
            fr._fills.append(fill_poly_strip(xs, ys, np.full_like(xs, yb + 4), np.array([0.012, 0.014, 0.024]), 1.0))
            fr._lines.append(segs_from_poly(np.stack([xs, ys], 1), WHITE * (1 - depth) + self.c1 * depth, 0.55 * a * (1 - depth * 0.7), 1.1, 3.0))
            fr.flush(cam=True)

    # ==================================================================
    # Aメロ2：反例
    # ==================================================================
    def L_verse2(self, fr, t):
        if not (T(60) - 0.2 < t < T(68) + 0.2):
            return
        A = self.atlas
        a_all = win(t, T(60), T(68), 0.3, 0.5)
        cx = 620
        # (1) 音量メーター
        a = win(t, T(60), T(62) + 0.1, 0.3, 0.3)
        if a > 0:
            x0, x1, y_top, y_bot = cx - 40, cx + 40, 240, 720
            fr._lines.append(segs_from_poly(np.array([[x0, y_top], [x1, y_top], [x1, y_bot], [x0, y_bot]]), WHITE, 0.5 * a, 1.2, 3.0, closed=True))
            boom = self.since("boom", t)
            lvl = clamp01((self.f("rms_db", t) + 48) / 48)
            if 0 <= boom < 1.0:
                lvl = 1.0 if boom < 0.5 else 1.0 - (boom - 0.5) * 1.2
            ylv = y_bot - (y_bot - y_top) * lvl
            col = RED if lvl > 0.92 else GOLD
            fr._fills.append(rect_fill(x0 + 6, ylv, x1 - 6, y_bot - 6, col, 0.85 * a))
            for db in (0, -6, -12, -24, -48):
                yy = y_bot - (y_bot - y_top) * (1 + db / 48)
                fr._lines.append(seg(x1 + 6, yy, x1 + 22, yy, DIM, 0.6 * a, 0.8, 1.0))
                fr._texts.append(text_arr(A, "mono", f"{db:d}", x1 + 30, yy + 6, 16, DIM, a))
            fr._texts.append(text_arr(A, "mono", "dBFS", cx, y_bot + 40, 20, DIM, a, align="center"))
            if 0 <= boom < 1.5:
                fr._texts.append(text_arr(A, "gothic", "CLIP", cx, y_top - 24, 30, RED, a * (0.5 + 0.5 * (int(t * 8) % 2)), glow=1.0, gcol=RED, align="center"))
        # (2) 最速ビート
        a = win(t, T(62), T(64) + 0.1, 0.3, 0.3)
        if a > 0:
            ra = self.by.get("roll_accel", [None])[0]
            y = 470
            fr._lines.append(seg(260, y, 980, y, DIM, 0.4 * a, 0.8, 2.0))
            bpm = 150.0
            if ra is not None and t >= ra["t"]:
                tt = min(t - ra["t"], ra["dur"])
                k = np.log(ra["r1"] / ra["r0"]) / ra["dur"]
                rate = ra["r0"] * np.exp(k * tt)
                bpm = rate * 60
                # 直近の打点を線で
                hist = np.linspace(max(0, tt - 0.45), tt, 400)
                ph = ra["r0"] * (np.exp(k * hist) - 1) / k
                idx = np.where(np.diff(np.floor(ph)) > 0)[0]
                xs = 980 - (tt - hist[idx]) / 0.45 * 720
                for x in xs[-150:]:
                    fr._lines.append(seg(x, y - 60, x, y + 60, self.c1 if rate < 20 else GOLD, 0.6 * a, 1.0, 3.0))
                if rate > 20:
                    fr._texts.append(text_arr(A, "gothic", "→ 音程になる", 620, y + 130, 34, GOLD, a, glow=0.8, gcol=GOLD, align="center"))
                fr._texts.append(text_arr(A, "mono", f"{rate:7.1f} Hz", 620, y - 90, 24, DIM, a, align="center"))
            fr._texts.append(text_arr(A, "mono", f"{bpm:,.0f} BPM", 620, y - 130, 44, WHITE, a, glow=0.4, gcol=self.c1, align="center"))
        # (3) 最高音
        a = win(t, T(64), T(66) + 0.1, 0.3, 0.3)
        if a > 0:
            sw = self.by.get("sweep", [None])[0]
            y = 470
            x0, x1 = 240, 1000

            def fx(f):
                return x0 + (np.log10(f) - np.log10(20)) / (np.log10(24000) - np.log10(20)) * (x1 - x0)
            fr._fills.append(rect_fill(fx(20), y - 30, fx(20000), y + 30, CYAN, 0.12 * a))
            fr._lines.append(seg(x0, y, x1, y, DIM, 0.5 * a, 0.8, 2.0))
            for f_, lab in ((20, "20"), (100, "100"), (1000, "1k"), (10000, "10k"), (20000, "20k")):
                fr._lines.append(seg(fx(f_), y + 30, fx(f_), y + 44, DIM, 0.6 * a, 0.8, 1.0))
                fr._texts.append(text_arr(A, "mono", lab, fx(f_), y + 68, 16, DIM, a, align="center"))
            fr._texts.append(text_arr(A, "gothic", "ヒトの可聴域", fx(600), y - 44, 20, CYAN, a * 0.8, align="center"))
            f_now = 0
            if sw is not None and t >= sw["t"]:
                tt = min(t - sw["t"], sw["dur"])
                f_now = sw["f0"] * (sw["f1"] / sw["f0"]) ** (tt / sw["dur"])
                xm = fx(f_now)
                col = WHITE if f_now < 20000 else DIM
                fr._lines.append(seg(xm, y - 70, xm, y + 70, col, 0.9 * a, 2.0, 8.0))
                fr._texts.append(text_arr(A, "mono", f"{f_now:,.0f} Hz", 620, y - 120, 44, col, a, glow=0.4, gcol=self.c1, align="center"))
                if f_now > 20000:
                    fr._texts.append(text_arr(A, "gothic", "聴こえない", 620, y + 140, 34, DIM, a, align="center"))
        # 反例のキャプション（右側に積み上がる）
        times = [T(61, 10), T(63, 14), T(65, 14)]
        for i, (cap, tc) in enumerate(zip(CAPTIONS, times)):
            if t < tc:
                continue
            al = smooth((t - tc) / 0.3) * a_all
            y = 330 + i * 92
            fr._texts.append(text_arr(A, "gothic", cap[:3], 1120, y, 26, RED, al, glow=0.5, gcol=RED))
            fr._texts.append(text_arr(A, "gothic", cap[4:], 1220, y, 24, WHITE, al))
            # 打ち消し線
            ts = T(66, 2) + i * 0.35
            if t > ts:
                k = ease_out((t - ts) / 0.25)
                wcap = 100 + A.measure("gothic", cap[4:], 24)
                fr._lines.append(seg(1110, y - 8, 1110 + wcap * k, y - 8, RED, 0.9 * al, 2.0, 6.0))
        # 最強 ≠ 最大・最速・最高
        a = win(t, T(67), T(68) + 0.1, 0.3, 0.3)
        if a > 0:
            fr._texts.append(text_arr(A, "midashi", "最強 ≠ 最大・最速・最高", CX, 700, 64, WHITE, a, glow=0.6, gcol=self.c1, halo=0.5, align="center"))

    # ==================================================================
    # ブリッジ：ハートの波（実際の L/R をそのまま XY に）
    # ==================================================================
    def L_bridge(self, fr, t):
        a = win(t, T(92), T(100) + 0.3, 0.8, 0.5)
        if a <= 0:
            return
        A = self.atlas
        cx, cy = CX, CY - 60
        xy = self.scope("heart", t, 2.0 / FPS, step=1)
        if xy.shape[1] > 4:
            pk = max(1e-4, float(np.abs(xy).max()))
            size_px = 330 * (0.6 + 0.4 * min(1.0, pk / 0.42) ** 0.5)   # 拍の合間も見える大きさを保つ
            sc = size_px / pk
            n = xy.shape[1]
            age = np.linspace(1, 0, n)
            inten = (0.006 + 0.03 * (1 - age) ** 2) * a
            P = np.stack([cx + xy[0] * sc, cy - xy[1] * sc - 40], 1)
            fr._lines.append(segs_from_poly(P, CORAL * 1.1, inten, 0.9, 3.5))
            # 2つ目のハート（シアン）：鼓動と重なっていく
            k2 = win(t, T(96), T(100) + 0.3, 1.0, 0.5)
            if k2 > 0:
                conv = smooth((t - T(96)) / (T(99, 4) - T(96)))
                off = (1 - conv) * 160
                s2 = 0.85 + 0.15 * conv
                Q = np.stack([cx + xy[0] * sc * s2 + off, cy - xy[1] * sc * s2 - 40 - off * 0.2], 1)
                col = CYAN * (1 - conv) + WHITE * conv
                fr._lines.append(segs_from_poly(Q, col, inten * 0.9 * k2, 0.9, 3.5))
        af = win(t, T(94), T(100), 0.6, 0.5)
        if af > 0:
            fr._texts.append(text_arr(A, "stix", "x = 16 sin³θ", 110, cy - 180, 30, CORAL, af * 0.85))
            fr._texts.append(text_arr(A, "stix", "y = 13 cos θ − 5 cos 2θ − 2 cos 3θ − cos 4θ", 110, cy - 140, 26, CORAL, af * 0.75))
            fr._texts.append(text_arr(A, "mono", "L = x(θ)   R = y(θ)", 110, cy - 104, 17, DIM, af * 0.8))

    # ==================================================================
    # ビルド：証明のまとめが流れる → 最後の一行
    # ==================================================================
    def L_build(self, fr, t):
        if not (T(100) - 0.1 < t < T(104) + 0.6):
            return
        A = self.atlas
        a = win(t, T(100), T(102) + 0.4, 0.2, 0.4)
        if a > 0:
            prog = clamp01((t - T(100)) / (T(102) + 0.4 - T(100)))
            scroll = (prog ** 1.6) * 700
            for i, (lab, body) in enumerate(PROOF_BUILD):
                y = 300 + i * 70 - scroll
                if y < 170 or y > H - 160:
                    continue
                al = a * smooth((t - T(100) - i * 0.12) / 0.2)
                fr._texts.append(text_arr(A, "gothic", lab, 260, y, 26, GOLD if "反例" not in lab else RED, al))
                fr._texts.append(text_arr(A, "mincho", body, 380, y, 34, WHITE, al, glow=0.2, gcol=self.c1))
                fr._texts.append(text_arr(A, "gothic", "✓" if False else "", 220, y, 26, GOLD, al))
        a = win(t, T(102), T(104) + 0.05, 0.3, 0.05)
        if a > 0:
            self.draw_therefore(fr, t, a, CY - 40)
        # 最後の拍の無音：カーソルだけ
        if T(103, 12) <= t < T(104):
            pass

    # ==================================================================
    # ラスサビ：合唱の軌道（装飾）、2つのハート
    # ==================================================================
    def L_final_extra(self, fr, t):
        a = win(t, T(104), T(120) + 0.5, 0.05, 0.6)
        if a <= 0:
            return
        env = self.f("env_vox_choir", t)
        R = 420 + 10 * self.kick
        for i in range(12):
            ang = 2 * np.pi * i / 12 + t * 0.35
            x, y = CX + R * np.cos(ang), CY + R * np.sin(ang) * 0.92
            col = hsv(self.hue + i / 12, 0.55, 1.0)
            fr._points.append(points_arr([[x, y]], 16 + 22 * env, col, a * (0.5 + 0.5 * env), 0))
            fr._points.append(points_arr([[x, y]], 36 + 30 * env, col, a * 0.35 * env, 1, 0.12))
        # 中心のハート（2つ重なった）
        th = np.linspace(0, 2 * np.pi, 200)
        hx = 16 * np.sin(th) ** 3
        hy = 13 * np.cos(th) - 5 * np.cos(2 * th) - 2 * np.cos(3 * th) - np.cos(4 * th)
        s = 4.2 * (1 + 0.1 * self.kick)
        P = np.stack([CX + hx * s, CY - hy * s - 10], 1)
        fr._lines.append(segs_from_poly(P, WHITE * 0.6 + CORAL * 0.4, 0.5 * a, 1.6, 8.0, closed=True))

    # ==================================================================
    # アウトロ：最後の sin、結論、クレジット
    # ==================================================================
    def L_outro(self, fr, t):
        if t < T(122):
            return
        A = self.atlas
        a = win(t, T(123), self.duration, 1.2, 1.0)
        if a > 0:
            fr._texts.append(text_arr(A, "mincho", OUTRO_LINE, CX, 190, 46, WHITE, a * (1 - smooth((t - 203.0) / 1.5)) + a * 0.0,
                                      glow=0.4, gcol=GOLD, halo=0.4, align="center", tracking=0.06))
        # 最後の sin（XY = 円）
        if t >= T(125) - 0.1:
            xy = self.scope("sine", t, 3.0 / FPS, step=2)
            if xy.shape[1] > 2:
                amp = 0.24
                R = 170
                px = CX + xy[0] / amp * R
                py = CY + 20 - xy[1] / amp * R
                n = len(px)
                inten = (0.05 + 0.25 * np.linspace(0, 1, n) ** 2)
                fr._lines.append(segs_from_poly(np.stack([px, py], 1), GOLD * 0.7 + WHITE * 0.4, inten, 1.2, 7.0))
                a_now = float(np.sqrt(np.mean(xy[0] ** 2 + xy[1] ** 2)) / amp)
                fr._points.append(points_arr([[CX, CY + 20]], 22, WHITE, 0.6 * (1 - a_now) * win(t, T(125), self.duration, 0.5, 0.8), 0))
            aq = win(t, T(125) + 1.0, self.duration, 1.0, 1.0)
            fr._texts.append(text_arr(A, "didot", "Q.E.D.", W - 200, H - 120, 54, GOLD, aq, glow=0.6, gcol=GOLD, align="right"))
            fr._texts.append(text_arr(A, "mincho", "■", W - 150, H - 122, 40, GOLD, aq, glow=0.6, gcol=GOLD, align="right"))
        # クレジット
        ac = win(t, 202.6, self.duration, 1.0, 1.0)
        if ac > 0:
            y0 = H - 330
            for i, line in enumerate(CREDITS):
                sz = 30 if i == 0 else 20
                al = ac * smooth((t - 202.6 - i * 0.35) / 0.6) * (1.0 if i < 3 else 0.85)
                y = y0 + (0 if i == 0 else 30 + i * 38)
                fr._texts.append(text_arr(A, "gothic_l", line, 150, y, sz, WHITE, al, align="left"))

    # ==================================================================
    # 歌詞
    # ==================================================================
    def L_lyrics(self, fr, t, sec):
        A = self.atlas
        for li, L in enumerate(self.lyr):
            t_end = min(L["t1"] + 1.6, L["next"] - 0.02)
            if L["qed"]:
                t_end = max(t_end, L["t1"] + 0.6)
            if not (L["t0"] - 0.3 <= t <= t_end + 0.35):
                continue
            out = 1 - smooth((t - t_end) / 0.35)
            s = L["section"]
            chorus = s in ("chorus1", "chorus2", "final")
            lift = -(110 if chorus else 64) * ease_out((t - t_end) / 0.35) if t > t_end else 0.0
            if L["qed"]:
                self._lyric_qed(fr, t, L, out)
                continue
            if chorus:
                font, size, y, align = "midashi", 100, 640, "center"
            elif s == "bridge":
                font, size, y, align = "mincho", 50, 905, "center"
            elif s == "outro":
                font, size, y, align = "midashi", 90, 640, "center"
            else:
                font, size, y, align = "mincho", 56, 925, "center"
            text = L["text"]
            chars = L["chars"]
            glowc = self.c1 * 0.8 + 0.2

            def pc(i, ch, gx, gy, chars=chars, chorus=chorus):
                c, ta, te = chars[i]
                if ta is None:
                    return (0, 0, 1, 0, WHITE, 0)
                dt = t - ta
                if dt < -0.02:
                    return None
                ap = smooth((dt + 0.02) / 0.08)
                singing = ta <= t <= te + 0.05
                if chorus:
                    sc = 1.0 + 0.55 * (1 - ease_out_back(dt / 0.22, 2.2)) if dt < 0.22 else 1.0
                    dy = -18 * (1 - ease_out(dt / 0.2))
                else:
                    sc = 1.0
                    dy = 10 * (1 - ease_out(dt / 0.25))
                col = HOT if singing else WHITE * 0.92
                gl = (1.1 if singing else 0.35) * (1.2 if chorus else 0.9)
                return (0, dy + lift, sc, ap * out, col, gl)
            if chorus:
                wtot = A.measure(font, text, size)
                if L["t0"] - 0.05 <= t <= t_end:
                    fr._fills.append(rect_fill(0, y - size * 1.05, W, y + size * 0.35, np.zeros(3), 0.42))
            fr._texts.append(text_arr(A, font, text, CX, y, size, WHITE, 1.0, glow=0.0, gcol=glowc,
                                      halo=0.55 if chorus else 0.4, align=align, per_char=pc, tracking=0.04))

    def _lyric_qed(self, fr, t, L, out):
        A = self.atlas
        # "Q." "E." "D." を1つずつスタンプ
        groups = []
        for (ch, ta, te) in L["chars"]:
            if ch in "QED":
                groups.append([ch, ta, te])
            elif groups:
                groups[-1][0] += ch
        x_positions = [-300, 0, 300]
        for gi, (txt, ta, te) in enumerate(groups):
            dt = t - ta
            if dt < 0:
                continue
            k = ease_out_back(dt / 0.16, 1.6)
            sc = 2.2 - 1.2 * k
            al = smooth(dt / 0.06) * out
            singing = ta <= t <= te
            fr._texts.append(text_arr(A, "didot", txt, CX + x_positions[gi], CY + 80, 190 * sc, HOT if singing else GOLD * 1.1,
                                      al, glow=1.3 if singing else 0.6, gcol=GOLD, halo=0.5, align="center"))
            if dt < 0.7:
                fr._points.append(points_arr([[CX + x_positions[gi], CY + 10]], 80 + 700 * ease_out(dt / 0.7), GOLD, 0.8 * (1 - dt / 0.7) ** 2 * out, 1, 0.02))

    # ==================================================================
    # HUD
    # ==================================================================
    def L_hud(self, fr, t, sec):
        A = self.atlas
        a = win(t, 1.0, 201.0, 1.0, 2.0)
        if T(8) <= t < T(10):
            a *= 0.0
        if T(103, 12) <= t < T(104):
            a = 0.0
        if a <= 0:
            return
        fr._texts.append(text_arr(A, "gothic_l", "Q.E.D. ─ 最強の証明", 60, 64, 20, WHITE, 0.55 * a))
        fr._texts.append(text_arr(A, "gothic", SEC_LABEL.get(sec, ""), 60, 100, 22, WHITE, 0.8 * a, glow=0.3, gcol=self.c1))
        bar = t / S.BAR
        c = self.chord_at(t)
        csym = "—"
        key = "D"
        if c is not None:
            name, s0, sb, ko = S.section_at(bar)
            csym = chord_display(transpose_sym(c.sym, ko))
            key = "Eb" if ko else "D"
        b_i = int(bar) + 1
        beat = int((bar * 4) % 4) + 1
        line = f"BAR {b_i:03d}.{beat}   ♩=150   KEY {key} major   CHORD {csym}"
        fr._texts.append(text_arr(A, "mono", line, 60, H - 56, 17, DIM, 0.85 * a))
        mm, ss = divmod(t, 60)
        fr._texts.append(text_arr(A, "mono", f"{int(mm):02d}:{ss:05.2f}", W - 60, H - 56, 17, DIM, 0.85 * a, align="right"))
        # 拍のドット
        for i in range(4):
            on = i == beat - 1
            fr._points.append(points_arr([[W - 230 + i * 18, H - 62]], 9 if on else 6, self.c1 if on else DIM, a * (1.0 if on else 0.4), 3, 0.2))
        prog = t / self.duration
        fr._lines.append(seg(0, H - 4, W * prog, H - 4, self.c1, 0.6 * a, 1.0, 2.0))
