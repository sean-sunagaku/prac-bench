"""
ヴォーカル編曲：リード、ダブル、ハモリ、ラストサビの合唱（10キャラクター・16パート）、「アー」のコーラスパッド。
「最強なんて ひとりじゃ 証明できない」— だからラストサビは、みんなで歌う。
"""
import os
from dataclasses import replace

import numpy as np

import score as S
import vocals as V
from arrange import N, T, chord_at, voice, pcs_of

BUILD = "/tmp/qed/build"

LEAD = 3009          # 波音リツ ノーマル
HARM = 3014          # 冥鳴ひまり
HARM2 = 3008         # 春日部つむぎ
CHOIR_F = [3008, 3002, 3003, 3016, 3010, 3046]   # つむぎ / めたん / ずんだもん / 九州そら / 雨晴はう / 小夜
CHOIR_M = [3013, 3011]                           # 青山龍星 / 玄野武宏
PAD_SINGERS = [3014, 3002, 3008, 3010]

CREDITS = {
    3009: "波音リツ", 3014: "冥鳴ひまり", 3008: "春日部つむぎ", 3002: "四国めたん", 3003: "ずんだもん",
    3016: "九州そら", 3010: "雨晴はう", 3046: "小夜/SAYO", 3013: "青山龍星", 3011: "玄野武宏",
}


def key_root_of(section):
    return (2 + S.key_offset_of(section) + S.KEY_SHIFT) % 12


def diatonic_shift(m, root, steps):
    scale = [(root + iv) % 12 for iv in (0, 2, 4, 5, 7, 9, 11)]
    pc = m % 12
    if pc not in scale:
        return m - 3 if steps < 0 else m + 4
    i = scale.index(pc)
    j = i + steps
    octs, jj = divmod(j, 7)
    target_pc = scale[jj]
    # m からの距離
    base = m - pc
    cand = base + target_pc + 12 * octs
    if steps < 0 and cand >= m:
        cand -= 12
    if steps > 0 and cand <= m:
        cand += 12
    return cand


def harmonize(notes, steps):
    out = []
    for n in notes:
        r = key_root_of(n.section)
        out.append(replace(n, key=diatonic_shift(n.key, r, steps)))
    return out


def shift_buf(x, ms):
    k = int(ms * 1e-3 * V.SR)
    if k > 0:
        return np.concatenate([np.zeros(k, np.float32), x[:-k]])
    if k < 0:
        return np.concatenate([x[-k:], np.zeros(-k, np.float32)])
    return x


def render_group(notes, speaker, variation=None, f0_semis=0.0):
    buf = np.zeros(N, np.float32)
    for sec, ns in V.group_by_section(notes).items():
        buf += V.render_notes(ns, speaker, N, variation=variation, f0_semis=f0_semis)
    return buf


def pan2(x, p):
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)]).astype(np.float32)


def build_vocals():
    vn, ll = S.expand_lines()
    stems = {k: np.zeros((2, N), np.float32) for k in ("vox_lead", "vox_double", "vox_harm", "vox_choir", "vox_pad")}

    # --- リード ---
    lead = render_group(vn, LEAD)
    stems["vox_lead"] += pan2(lead, 0.0)
    np.save(f"{BUILD}/stems/vox_lead_mono.npy", lead)

    chorus_secs = ("chorus1", "chorus2", "final")
    ch_notes = [n for n in vn if n.section in chorus_secs or n.section == "outro"]

    # --- ダブル（同じ歌い手、ピッチとタイミングを少しずらして左右に）---
    for k, (p, ms, seed) in enumerate(((-0.45, 9, 11), (0.45, -7, 12))):
        d = render_group(ch_notes, LEAD, variation=dict(cents_sd=7, seed=seed))
        stems["vox_double"] += pan2(shift_buf(d, ms), p)

    # --- 下ハモ（3度下）---
    h1_notes = [n for n in vn if (n.section == "chorus1" and n.t0 >= T(48)) or n.section in ("chorus2", "final", "outro")
                or (n.section in ("pre2",) and n.t0 >= T(72))]
    h1 = harmonize(h1_notes, -2)
    hb = render_group(h1, HARM, variation=dict(cents_sd=4, seed=21))
    stems["vox_harm"] += pan2(shift_buf(hb, 5), -0.3)
    fin_h = [n for n in h1 if n.section in ("final", "outro")]
    hb2 = render_group(fin_h, HARM2, variation=dict(cents_sd=5, seed=22))
    stems["vox_harm"] += pan2(shift_buf(hb2, -6), 0.3)
    # chorus2 の後半は上ハモ（3度上）も
    up_notes = [n for n in vn if n.section in ("chorus2", "final") and n.t0 >= T(S.section_start(n.section) + 8)]
    up = harmonize(up_notes, +2)
    ub = render_group(up, HARM2, variation=dict(cents_sd=5, seed=23))
    stems["vox_harm"] += pan2(shift_buf(ub, 8), 0.45) * 0.8

    # --- ラストサビ：合唱（女声6・男声2・下ハモ2）---
    fin = [n for n in vn if n.section in ("final", "outro")]
    rng = np.random.default_rng(5)
    for i, spk in enumerate(CHOIR_F):
        c = render_group(fin, spk, variation=dict(cents_sd=9, seed=100 + i, drift_hz=0.3 + 0.07 * i))
        p = np.linspace(-0.85, 0.85, len(CHOIR_F))[i]
        stems["vox_choir"] += pan2(shift_buf(c, rng.uniform(-18, 18)), p) * 0.55
    male = [replace(n, key=n.key - 12) for n in fin]
    for i, spk in enumerate(CHOIR_M):
        c = render_group(male, spk, variation=dict(cents_sd=7, seed=200 + i))
        stems["vox_choir"] += pan2(shift_buf(c, rng.uniform(-12, 12)), (-0.5, 0.5)[i]) * 0.75
    fin_h_low = harmonize(fin, -2)
    for i, spk in enumerate((3002, 3016)):
        c = render_group(fin_h_low, spk, variation=dict(cents_sd=8, seed=300 + i))
        stems["vox_choir"] += pan2(shift_buf(c, rng.uniform(-15, 15)), (-0.7, 0.7)[i]) * 0.5

    # --- 「アー」のコーラスパッド（chorus2 / final / bridge後半）---
    def ah_pad(b0, b1, section_name, singers, gain=1.0, lo=60, hi=79):
        parts = [[], [], []]
        for b in range(b0, b1):
            c = chord_at(T(b) + 0.01)
            v = voice(c, "ahpad", lo, hi, 3)
            for k in range(3):
                parts[k].append(S.VNote(T(b), T(b + 1) - 0.02, int(v[k]), "ア", -1, section_name))
        for k, part in enumerate(parts):
            for j, spk in enumerate(singers[k % len(singers)::3] or singers[:1]):
                x = render_group(part, spk, variation=dict(cents_sd=6, seed=400 + k * 10 + j))
                stems["vox_pad"] += pan2(x, (-0.6, 0.0, 0.6)[k]) * gain

    ah_pad(76, 92, "chorus2", PAD_SINGERS, 0.5)
    ah_pad(96, 100, "bridge", PAD_SINGERS, 0.45, lo=57, hi=76)
    ah_pad(104, 122, "final", PAD_SINGERS, 0.6)
    return stems


if __name__ == "__main__":
    import time
    t = time.time()
    st = build_vocals()
    for k, v in st.items():
        np.save(f"{BUILD}/stems/{k}.npy", v)
        print(k, float(np.abs(v).max()))
    print("vocals in", time.time() - t)
