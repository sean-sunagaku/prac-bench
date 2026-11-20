"""
編曲：score.py の楽譜から全トラック（ステム）を生成し、映像用のタイムラインも書き出す。
"""
import json
import os

import numpy as np

import instruments as I
import score as S
from synth import SR, mtof, pan, lp, hp, noise, TWO_PI, svf, wavetable, osc

BUILD = "/tmp/qed/build"
TAIL = 7.0
N = int((S.SONG_END + TAIL) * SR)


def T(bar, s16=0.0):
    return (bar * 16 + s16) * S.S16


class Tracks:
    def __init__(self):
        self.d = {}

    def __getitem__(self, k):
        if k not in self.d:
            self.d[k] = np.zeros((2, N), np.float32)
        return self.d[k]


EV = []


def ev(t, typ, **kw):
    d = {"t": round(float(t), 5), "type": typ}
    d.update(kw)
    EV.append(d)


# ---------------------------------------------------------------------------
# コードのボイシング
# ---------------------------------------------------------------------------
CHORDS = S.chord_events()


def chord_at(t):
    for c in CHORDS:
        if c.t0 <= t + 1e-6 < c.t1:
            return c
    return None


def chords_in(t0, t1):
    return [c for c in CHORDS if c.t1 > t0 + 1e-6 and c.t0 < t1 - 1e-6]


def pcs_of(c):
    return [(c.root_pc + iv) % 12 for iv in S.CHORD_TONES[c.qual]]


def voicings(c, lo, hi, n):
    pcs = set(pcs_of(c))
    notes = [m for m in range(lo, hi + 1) if m % 12 in pcs]
    return [notes[i:i + n] for i in range(len(notes) - n + 1)]


_prev_voicing = {}


def voice(c, key="pad", lo=55, hi=79, n=4):
    cands = voicings(c, lo, hi, n)
    prev = _prev_voicing.get(key)
    if prev is None:
        mid = (lo + hi) / 2
        v = min(cands, key=lambda v: abs(np.mean(v) - mid))
    else:
        v = min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev)) + 0.3 * abs(np.mean(v) - (lo + hi) / 2))
    _prev_voicing[key] = v
    return v


def bass_root(c, lo=28):
    r = c.root_pc
    m = lo + ((r - lo) % 12)
    return m


# ---------------------------------------------------------------------------
# サイドチェイン（キックのたびに他の楽器を一瞬下げる＝うねり）
# ---------------------------------------------------------------------------
KICKS = []


def duck_env(depth=0.6, release=0.16, shape=2.0):
    env = np.ones(N, np.float32)
    n_rel = int(release * 2.5 * SR)
    t = np.arange(n_rel) / SR
    curve = 1 - depth * np.exp(-(t / release) ** 1.0 * shape) * np.where(t < 0.004, t / 0.004, 1.0)
    curve = np.minimum(curve, 1.0).astype(np.float32)
    for tk in KICKS:
        i0 = int(tk * SR)
        i1 = min(N, i0 + n_rel)
        env[i0:i1] = np.minimum(env[i0:i1], curve[: i1 - i0])
    return env


# ---------------------------------------------------------------------------
# ドラムのヘルパー
# ---------------------------------------------------------------------------
def add_kick(tr, t, vel=1.0, kind="main", var=None):
    var = (len(KICKS) % 4) if var is None else var
    if kind == "main":
        x = I.kick(var)
        I.put(tr["kick"], x, t, vel)
        KICKS.append(t)
        ev(t, "kick", v=vel)
    elif kind == "heart":
        I.put(tr["kick"], I.heart_kick(var % 2), t, vel)
        ev(t, "heartbeat", v=vel)
    elif kind == "intro":
        I.put(tr["kick_intro"], I.kick(var), t, vel)
        KICKS.append(t)
        ev(t, "kick", v=vel * 0.6)


def add_snare(tr, t, vel=1.0, clap=True, var=None):
    var = int(t * 1000) % 4 if var is None else var
    I.put(tr["snare"], I.snare(var), t, vel * 0.8)
    if clap:
        I.put(tr["clap"], I.clap(var % 3), t, vel * 0.9)
    ev(t, "snare", v=vel)


def add_hat(tr, t, vel=0.5, open_=False, p=0.25):
    x = I.hat(int(t * 97) % 3, decay=0.28 if open_ else 0.042)
    I.put(tr["hats"], pan(x, p), t, vel)
    ev(t, "ohat" if open_ else "hat", v=vel)


def add_crash(tr, t, vel=1.0, var=0):
    I.put(tr["crash"], I.crash(var), t, vel)
    ev(t, "crash", v=vel)


def roll(tr, b0, b1, rate_from=4, rate_to=16, vel0=0.3, vel1=1.0, until=None):
    """スネアロール（rate: 1小節あたりの打数, 指数的に増加）"""
    t0, t1 = T(b0), T(b1) if until is None else until
    t = t0
    while t < t1 - 1e-6:
        x = (t - t0) / (T(b1) - t0)
        rate = rate_from * (rate_to / rate_from) ** x
        step = S.BAR / rate
        # グリッドに揃える
        add_snare(tr, t, vel0 + (vel1 - vel0) * x ** 1.5, clap=False)
        t += step


# ---------------------------------------------------------------------------
# 各パターン
# ---------------------------------------------------------------------------
def four_floor(tr, b0, b1, clap=True, ohat=True, chat=True, shaker=False, vel=1.0, skip_last_beat=False):
    for b in range(b0, b1):
        for beat in range(4):
            if skip_last_beat and b == b1 - 1 and beat == 3:
                continue
            add_kick(tr, T(b, beat * 4), vel)
        if clap:
            add_snare(tr, T(b, 4), 0.85 * vel)
            if not (skip_last_beat and b == b1 - 1):
                add_snare(tr, T(b, 12), 0.85 * vel)
        for s in range(16):
            if skip_last_beat and b == b1 - 1 and s >= 12:
                continue
            if ohat and s % 4 == 2:
                add_hat(tr, T(b, s), 0.42 * vel, open_=True, p=0.15)
            elif chat:
                add_hat(tr, T(b, s), (0.22 if s % 2 else 0.32) * vel, p=-0.25)
            if shaker:
                I.put(tr["shaker"], pan(I.shaker(s % 3), 0.45), T(b, s), (0.35 if s % 2 else 0.2) * vel)


def octave_bass(tr, b0, b1, vel=1.0, stop_at=None, mid=0.6, cutoff=900):
    for b in range(b0, b1):
        for s in range(0, 16, 2):
            t = T(b, s)
            if stop_at is not None and t >= stop_at - 1e-6:
                return
            c = chord_at(t + 0.01)
            if c is None:
                continue
            r = bass_root(c)
            m = r + (12 if s % 4 == 2 else 0)
            I.put(tr["bass"], pan(I.bass_note(m, S.S16 * 1.8, vel, cutoff=cutoff, mid=mid), 0), t)


def sustained_chords(tr, b0, b1, name="chords", lo=57, hi=81, n=4, vel=1.0, cutoff=5200.0, attack=0.01,
                     release=0.35, detune=0.18, cutoff_fn=None, stop_at=None, shape="saw"):
    for c in chords_in(T(b0), T(b1)):
        t0 = max(c.t0, T(b0))
        t1 = min(c.t1, T(b1))
        if stop_at is not None:
            t1 = min(t1, stop_at)
        if t1 <= t0:
            continue
        v = voice(c, name, lo, hi, n)
        for m in v:
            if cutoff_fn is not None:
                cf = (lambda n_, t0=t0: cutoff_fn(t0 + np.arange(n_) / SR))
            else:
                cf = None
            x = I.supersaw(m, t1 - t0, vel, cutoff=cutoff, attack=attack, release=release, detune=detune,
                           cutoff_env=cf, seed=int(t0 * 10), shape=shape)
            I.put(tr[name], x, t0)
        ev(t0, "chord", sym=c.sym, root=c.root_pc, notes=v, track=name)


def pads(tr, b0, b1, vel=1.0, cutoff=2000.0, lo=52, hi=76, attack=0.6):
    for c in chords_in(T(b0), T(b1)):
        t0, t1 = max(c.t0, T(b0)), min(c.t1, T(b1))
        for m in voice(c, "pad", lo, hi, 4):
            I.put(tr["pad"], I.pad(m, t1 - t0, vel, cutoff=cutoff, attack=attack), t0)


def strings_part(tr, b0, b1, vel=1.0, lo=55, hi=81):
    for c in chords_in(T(b0), T(b1)):
        t0, t1 = max(c.t0, T(b0)), min(c.t1, T(b1))
        for m in voice(c, "str", lo, hi, 4):
            I.put(tr["strings"], I.strings(m, t1 - t0, vel), t0)


def keys_comp(tr, b0, b1, vel=0.75, pattern=((0, 6), (6, 6), (12, 4)), lo=54, hi=74):
    for b in range(b0, b1):
        for (s, d) in pattern:
            t = T(b, s)
            c = chord_at(t + 0.01)
            if c is None:
                continue
            for k, m in enumerate(voice(c, "keys", lo, hi, 4)):
                x = I.epiano(m, d * S.S16 * 0.95, vel * (0.9 if s else 1.0))
                I.put(tr["keys"], pan(x, -0.55 + 0.37 * k), t + k * 0.004)


def keys_whole(tr, b0, b1, vel=0.6, lo=54, hi=74):
    for c in chords_in(T(b0), T(b1)):
        t0, t1 = max(c.t0, T(b0)), min(c.t1, T(b1))
        for k, m in enumerate(voice(c, "keys", lo, hi, 4)):
            x = I.epiano(m, (t1 - t0) * 0.98, vel)
            I.put(tr["keys"], pan(x, -0.25 + 0.17 * k), t0 + k * 0.012)
        r = bass_root(c, 40)
        I.put(tr["keys"], pan(I.epiano(r, (t1 - t0) * 0.98, vel * 0.8), 0), t0)


def arp(tr, b0, b1, vel=0.5, lo=62, rate=16, octaves=2, pattern="up", name="arp", decay=0.22, stop_at=None,
        vel_fn=None):
    step = 16 // rate
    for b in range(b0, b1):
        for s in range(0, 16, step):
            t = T(b, s)
            if stop_at is not None and t >= stop_at - 1e-6:
                return
            c = chord_at(t + 0.01)
            if c is None:
                continue
            pcs = sorted(set(pcs_of(c)), key=lambda p: (p - c.root_pc) % 12)
            notes = []
            for o in range(octaves):
                for p in pcs:
                    m = lo + ((p - lo) % 12) + 12 * o
                    notes.append(m)
            notes = sorted(set(notes))
            idx = (b * 16 + s) // step
            if pattern == "up":
                m = notes[idx % len(notes)]
            elif pattern == "updown":
                L = len(notes)
                k = idx % (2 * L - 2)
                m = notes[k if k < L else 2 * L - 2 - k]
            else:
                m = notes[(idx * 3) % len(notes)]
            v = vel if vel_fn is None else vel * vel_fn(t)
            x = I.sine_pluck(m, S.S16 * step * 0.9, v * (1.0 if s % 4 == 0 else 0.75), decay=decay)
            I.put(tr[name], pan(x, 0.75 * np.sin(idx * 0.9)), t)
            ev(t, "arp", m=int(m), v=round(float(v), 3)) if name == "arp" else None


def bells_arp(tr, b0, b1, vel=0.4, lo=79, rate=8):
    step = 16 // rate
    for b in range(b0, b1):
        for s in range(0, 16, step):
            t = T(b, s)
            c = chord_at(t + 0.01)
            if c is None:
                continue
            pcs = sorted(set(pcs_of(c)))
            notes = sorted(set(lo + ((p - lo) % 12) for p in pcs))
            m = notes[((b * 16 + s) // step * 2) % len(notes)]
            I.put(tr["bells"], pan(I.bell(m, vel, 1.6), 0.5 * np.sin(b * 16 + s)), t)


def sine_pad(tr, midi_list, t0, dur, vel=0.5, name="sine_pad", attack=0.5, release=1.5):
    n = int((dur + release * 3) * SR)
    t = np.arange(n) / SR
    env = np.clip(t / attack, 0, 1) ** 2 * np.where(t > dur, np.exp(-(t - dur) / release), 1.0)
    for k, m in enumerate(midi_list):
        f = mtof(m)
        x = (np.sin(TWO_PI * f * t + k) + 0.18 * np.sin(TWO_PI * 2 * f * t) + 0.06 * np.sin(TWO_PI * 3 * f * t))
        x *= env * vel * 0.18 * (1 + 0.05 * np.sin(TWO_PI * (0.3 + 0.1 * k) * t))
        I.put(tr[name], pan(x.astype(np.float32), -0.5 + k / max(1, len(midi_list) - 1)), t0)


def lead_from(notes, shift=0, **kw):
    return I.lead_line([(a, b, m + shift) for (a, b, m) in notes], N, **kw)


def bell_melody(tr, notes, shift=12, vel=0.35, name="bells"):
    for (a, b, m) in notes:
        I.put(tr[name], pan(I.bell(m + shift, vel, 1.8), 0.2), a)


# ---------------------------------------------------------------------------
# 本体
# ---------------------------------------------------------------------------
def build_arrangement():
    tr = Tracks()
    sec = {n: (s, b) for (n, s, b, k) in S.SECTIONS}
    for (n, s, b, k) in S.SECTIONS:
        ev(T(s), "section", name=n, bars=b)

    # ======================= INTRO (0-7) =======================
    # 最初のひとつの音：440 Hz の sin（L=sin, R=cos → XY で円）
    I.put(tr["sine"], I.quad_sine(440.0, T(8) - 0.0, fade_in=2.0, fade_out=0.25, amp=0.26), 0.0)
    ev(0.0, "sine_on", f=440.0)
    for c in chords_in(T(2), T(8)):
        v = voice(c, "intro", 57, 76, 4)
        sine_pad(tr, v, c.t0, c.t1 - c.t0, vel=0.55 if c.t0 < T(4) else 0.7)
        ev(c.t0, "chord", sym=c.sym, root=c.root_pc, notes=v, track="sine_pad")
    arp(tr, 4, 8, vel=0.42, lo=62, rate=16, octaves=2, pattern="updown",
        vel_fn=lambda t: 0.45 + 0.55 * min(1, (t - T(4)) / (T(8) - T(4))))
    for c in chords_in(T(4), T(8)):
        r = bass_root(c, 33)
        n_ = int((c.t1 - c.t0 + 0.3) * SR)
        tt = np.arange(n_) / SR
        x = np.sin(TWO_PI * mtof(r) * tt) * np.clip(tt / 0.3, 0, 1) * np.where(tt > c.t1 - c.t0, np.exp(-(tt - (c.t1 - c.t0)) / 0.08), 1) * 0.35
        I.put(tr["bass"], pan(x.astype(np.float32), 0), c.t0)
    for b in range(6, 8):
        for beat in range(4):
            add_kick(tr, T(b, beat * 4), 0.55 + 0.25 * (b - 6), kind="intro")
    roll(tr, 7, 8, rate_from=8, rate_to=32, vel0=0.15, vel1=0.8, until=T(7, 15))
    I.put(tr["fx"], I.riser(T(8) - T(6), seed=1, tonal_midi=57), T(6), 0.55)
    I.put(tr["fx"], I.reverse_cymbal(1.6, 0), T(8) - 1.6, 0.6)
    ev(T(6), "riser", dur=T(8) - T(6))

    # ======================= HOOK (8-15) =======================
    I.put(tr["fx"], I.impact(), T(8), 0.9)
    ev(T(8), "impact")
    add_crash(tr, T(8), 1.0)
    four_floor(tr, 8, 16, shaker=False)
    octave_bass(tr, 8, 16)
    sustained_chords(tr, 8, 16, vel=0.9, cutoff=4800)
    hook_mel = S.chorus_melody_notes("hook", 8, range(4))
    tr["lead"][:] += lead_from(hook_mel, cutoff=6000)
    bell_melody(tr, hook_mel, 12, 0.22)
    for (a, b, m) in hook_mel:
        ev(a, "lead", m=int(m), d=round(b - a, 3))
    arp(tr, 8, 16, vel=0.25, lo=74, rate=16, octaves=1)
    for s in (12, 13, 14, 15):
        add_snare(tr, T(15, s), 0.5 + 0.1 * (s - 12), clap=False)
    I.put(tr["fx"], I.downlifter(1.6, 1), T(15.5), 0.35)

    # ======================= VERSE 1 (16-31) =======================
    keys_comp(tr, 16, 32, vel=0.7)
    pads(tr, 16, 32, vel=0.6, cutoff=1400)
    for b in range(16, 32):
        c = chord_at(T(b) + 0.01)
        if b < 24:
            add_kick(tr, T(b, 0), 0.8)
            add_kick(tr, T(b, 10), 0.6)
            for s in range(0, 16, 2):
                add_hat(tr, T(b, s), 0.2 if s % 4 else 0.26)
            I.put(tr["bass"], pan(I.bass_note(bass_root(c), S.BAR * 0.95, 0.8, mid=0.25, cutoff=500), 0), T(b))
        else:
            for s in (0, 6, 10):
                add_kick(tr, T(b, s), 0.85 if s == 0 else 0.65)
            add_snare(tr, T(b, 4), 0.7)
            add_snare(tr, T(b, 12), 0.7)
            for s in range(16):
                add_hat(tr, T(b, s), 0.18 if s % 2 else 0.25)
            for (s, d) in ((0, 3), (3, 3), (6, 4), (10, 2), (12, 4)):
                I.put(tr["bass"], pan(I.bass_note(bass_root(c), d * S.S16 * 0.9, 0.85, mid=0.4, cutoff=700), 0), T(b, s))
    arp(tr, 24, 32, vel=0.22, lo=69, rate=8, octaves=2)
    for s in (12, 14, 15):
        add_snare(tr, T(31, s), 0.6, clap=False)
    I.put(tr["fx"], I.reverse_cymbal(1.2, 1), T(32) - 1.2, 0.4)

    # ======================= PRE 1 / PRE 2 =======================
    def pre(b0, extra=False):
        add_crash(tr, T(b0), 0.6, 1)
        stop = T(b0 + 7, 12)
        for b in range(b0, b0 + 8):
            if b < b0 + 6:
                for beat in range(4):
                    add_kick(tr, T(b, beat * 4), 0.9)
            else:
                for s in range(0, 16, 2):
                    if T(b, s) < stop - 1e-6:
                        add_kick(tr, T(b, s), 0.8 + 0.1 * (s / 16))
            if b < b0 + 4:
                add_snare(tr, T(b, 4), 0.6)
                add_snare(tr, T(b, 12), 0.6)
            for s in range(0, 16, 2):
                if T(b, s) < stop - 1e-6:
                    add_hat(tr, T(b, s + 0), 0.24)
        roll(tr, b0 + 4, b0 + 8, rate_from=8, rate_to=32, vel0=0.25, vel1=1.0, until=stop)
        octave_bass(tr, b0, b0 + 8, vel=0.9, stop_at=stop, mid=0.45)
        sweep = lambda t: 500.0 * (9000.0 / 500.0) ** np.clip((t - T(b0)) / (stop - T(b0)), 0, 1) ** 1.3
        sustained_chords(tr, b0, b0 + 8, name="chords", vel=0.8, cutoff_fn=sweep, attack=0.05, stop_at=stop)
        keys_comp(tr, b0, b0 + 4, vel=0.6)
        arp(tr, b0, b0 + 8, vel=0.3, lo=66, rate=16, octaves=2, stop_at=stop,
            vel_fn=lambda t: 0.6 + 0.4 * (t - T(b0)) / (stop - T(b0)))
        if extra:
            strings_part(tr, b0, b0 + 8, vel=0.8)
        I.put(tr["fx"], I.riser(stop - T(b0 + 4), seed=2 + b0, tonal_midi=62), T(b0 + 4), 0.6)
        ev(T(b0 + 4), "riser", dur=stop - T(b0 + 4))
        I.put(tr["fx"], I.reverse_cymbal(0.8, 2), T(b0 + 8) - 0.8, 0.7)
        ev(stop, "break", dur=T(b0 + 8) - stop)

    pre(32)
    pre(68, extra=True)

    # ======================= CHORUS =======================
    def chorus_block(b0, big=0, key_shift=0):
        I.put(tr["fx"], I.impact(), T(b0), 1.0)
        ev(T(b0), "impact")
        add_crash(tr, T(b0), 1.0)
        add_crash(tr, T(b0 + 8), 0.8, 2)
        ev(T(b0 + 8), "impact_small")
        four_floor(tr, b0, b0 + 16, shaker=True)
        octave_bass(tr, b0, b0 + 16, vel=1.0)
        sustained_chords(tr, b0, b0 + 16, vel=0.85 + 0.1 * big, cutoff=5200 + 1500 * big, detune=0.18 + 0.04 * big)
        # 裏で跳ねる sin のコード
        for b in range(b0, b0 + 16):
            for (s, d) in ((0, 2), (3, 2), (6, 2), (10, 2), (12, 2), (14, 2)):
                t = T(b, s)
                c = chord_at(t + 0.01)
                for m in voice(c, "stab", 64, 84, 3):
                    I.put(tr["stabs"], pan(I.sine_pluck(m, d * S.S16, 0.5, decay=0.12, bright=0.6), (-0.6, 0.6)[(b * 16 + s) % 2]), t)
        bells_arp(tr, b0, b0 + 16, vel=0.28 + 0.1 * big, lo=81, rate=8)
        if big >= 1:
            strings_part(tr, b0, b0 + 16, vel=0.7 + 0.3 * big)
            mel = S.chorus_melody_notes("x", b0, range(8), shift=key_shift)
            bell_melody(tr, mel, 12, 0.16 + 0.06 * big)
        for s in (8, 10, 12, 13, 14, 15):
            add_snare(tr, T(b0 + 15, s), 0.5 + 0.06 * s, clap=False)

    chorus_block(40, big=0)
    # ======================= INTER (56-59) =======================
    add_crash(tr, T(56), 0.8)
    four_floor(tr, 56, 60, shaker=True, skip_last_beat=True)
    octave_bass(tr, 56, 60, stop_at=T(59, 12))
    sustained_chords(tr, 56, 60, vel=0.85, stop_at=T(59, 12))
    inter_mel = S.chorus_melody_notes("inter", 56, range(2))
    tr["lead"][:] += lead_from(inter_mel, cutoff=6500)
    bell_melody(tr, inter_mel, 12, 0.22)
    for (a, b, m) in inter_mel:
        ev(a, "lead", m=int(m), d=round(b - a, 3))
    arp(tr, 56, 60, vel=0.25, lo=74, rate=16, octaves=1, stop_at=T(59, 12))
    I.put(tr["fx"], I.downlifter(1.4, 2), T(59, 8), 0.4)

    # ======================= VERSE 2 「反例」 (60-67) =======================
    for i, b in enumerate((60, 62, 64)):
        c = chord_at(T(b) + 0.01)
        # グルーヴ小節
        for s in (0, 3, 10):
            add_kick(tr, T(b, s), 0.95 if s == 0 else 0.7)
        add_snare(tr, T(b, 8), 1.0)
        for s in range(16):
            add_hat(tr, T(b, s), 0.26 if s % 2 == 0 else 0.15)
        I.put(tr["bass"], pan(I.growl_bass(bass_root(c, 30) + 12 * 0, S.BAR * 0.98, 0.9, rate_hz=5.0), 0), T(b))
        pads(tr, b, b + 1, vel=0.5, cutoff=1200)
        # 反例の小節：歌が終わると全部止まって「実演」
        bb = b + 1
        add_kick(tr, T(bb, 0), 0.9)
        I.put(tr["bass"], pan(I.growl_bass(bass_root(c, 30), S.S16 * 3.8, 0.9, rate_hz=5.0), 0), T(bb))
    # 反例1：最大音量
    tb = T(61, 8)
    I.put(tr["demo"], I.impact(dur=3.0, f0=90, f1=28), tb, 2.6)
    I.put(tr["demo"], np.stack([I.kick(1, drive=3.5)] * 2), tb, 1.6)
    ev(tb, "boom")
    # 反例2：最速ビート（打撃の間隔が縮み、やがて音程になる）
    t0, t1 = T(63, 4), T(64)
    dur = t1 - t0
    rate0, rate1 = 6.0, 880.0
    n_ = int(dur * SR)
    tt = np.arange(n_) / SR
    # 瞬間レート r(t) = r0 * (r1/r0)^(t/dur) の位相を積分して打点を出す
    k = np.log(rate1 / rate0) / dur
    phase = rate0 * (np.exp(k * tt) - 1) / k
    hits = np.searchsorted(phase, np.arange(1, int(phase[-1]) + 1))
    click_len = int(0.004 * SR)
    ct = np.arange(click_len) / SR
    click = (np.sin(TWO_PI * 2400 * ct) * 0.6 + np.sin(TWO_PI * 5100 * ct) * 0.3) * np.exp(-ct / 0.0012)
    sig = np.zeros(n_ + click_len, np.float32)
    snr = I.snare(0)[: int(0.05 * SR)]
    for j, h in enumerate(hits):
        r_here = rate0 * np.exp(k * tt[min(h, n_ - 1)])
        if r_here < 40:
            seg = snr[: min(len(snr), int(SR / r_here))] * 0.9
            sig[h:h + len(seg)] += seg
        sig[h:h + click_len] += click * (0.35 + 0.4 * min(1, r_here / 200))
    sig = sig[:n_] * np.clip((dur - tt) / 0.05, 0, 1)
    I.put(tr["demo"], pan(sig, 0), t0, 0.9)
    ev(t0, "roll_accel", dur=dur, r0=rate0, r1=rate1)
    # 反例3：最高音（20 kHz を超えると聴こえない）
    t0, t1 = T(65, 4), T(66)
    dur = t1 - t0
    n_ = int(dur * SR)
    tt = np.arange(n_) / SR
    f = 1200 * (23000 / 1200) ** (tt / dur)
    amp = np.clip((15000 - f) / 6000 + 0.15, 0.0, 1.0) * np.clip(tt / 0.02, 0, 1)
    amp *= np.where(f > 22000, 0, 1)
    sw = np.sin(TWO_PI * np.cumsum(f) / SR) * amp * 0.22
    I.put(tr["demo"], pan(sw.astype(np.float32), 0), t0)
    ev(t0, "sweep", dur=dur, f0=1200, f1=23000)
    # 「ぜんぶちがった」：止まって、やわらかい和音だけ
    for c in chords_in(T(66), T(68)):
        v = voice(c, "intro", 57, 76, 4)
        sine_pad(tr, v, c.t0, c.t1 - c.t0, vel=0.6, attack=0.3)
    ev(T(66), "allwrong")
    I.put(tr["fx"], I.reverse_cymbal(1.6, 3), T(68) - 1.6, 0.5)

    # ======================= CHORUS 2 (76-91) =======================
    chorus_block(76, big=1)
    I.put(tr["fx"], I.downlifter(2.0, 3), T(91, 8), 0.4)

    # ======================= BRIDGE (92-99) =======================
    keys_whole(tr, 92, 100, vel=0.55)
    pads(tr, 92, 100, vel=0.55, cutoff=1300, attack=1.0)
    for b in range(92, 100):
        for half in (0, 8):
            t = T(b, half)
            c = chord_at(t + 0.01)
            r = 45 + ((c.root_pc - 45) % 12)    # A2〜G#3
            I.put(tr["heart"], I.heart_voice(r + 12, S.S16 * 1.6, 0.9, decay=0.12, sustain=0.35), t)
            I.put(tr["heart"], I.heart_voice(r + 12, S.S16 * 2.6, 0.75, decay=0.18, sustain=0.3), t + S.S16 * 2)
            ev(t, "heart", m=int(r + 12))
            ev(t + S.S16 * 2, "heart", m=int(r + 12), second=True)
            if b < 99:
                add_kick(tr, t, 0.55, kind="heart")
                add_kick(tr, t + S.S16 * 2, 0.4, kind="heart")
    strings_part(tr, 96, 100, vel=0.6)
    roll(tr, 99, 100, rate_from=8, rate_to=16, vel0=0.1, vel1=0.4)

    # ======================= BUILD (100-103) =======================
    stop = T(103, 12)
    for b in range(100, 104):
        step = 2 if b < 102 else 1
        for s in range(0, 16, step):
            t = T(b, s)
            if t < stop - 1e-6:
                add_kick(tr, t, 0.75 + 0.05 * (b - 100))
    roll(tr, 100, 104, rate_from=8, rate_to=32, vel0=0.2, vel1=0.6, until=stop)
    sweep = lambda t: 600.0 * (12000.0 / 600.0) ** np.clip((t - T(100)) / (stop - T(100)), 0, 1) ** 1.2
    sustained_chords(tr, 100, 104, vel=0.9, cutoff_fn=sweep, stop_at=stop, attack=0.05)
    octave_bass(tr, 100, 104, vel=0.95, stop_at=stop)
    strings_part(tr, 100, 104, vel=0.8)
    I.put(tr["fx"], I.riser(stop - T(100), seed=9, tonal_midi=58), T(100), 0.5)
    ev(T(100), "riser", dur=stop - T(100))
    ev(stop, "silence", dur=T(104) - stop)

    # ======================= FINAL (104-119) E♭ =======================
    chorus_block(104, big=2, key_shift=1)
    # 最後の Q.E.D. の後のタグ
    # ======================= OUTRO (120-125) =======================
    add_crash(tr, T(120), 1.0, 3)
    I.put(tr["fx"], I.impact(), T(120), 0.7)
    ev(T(120), "impact")
    four_floor(tr, 120, 122, shaker=True)
    octave_bass(tr, 120, 122)
    sustained_chords(tr, 120, 122, vel=0.9, cutoff=6500)
    strings_part(tr, 120, 126, vel=0.8)
    outro_mel = S.chorus_melody_notes("outro", 122, range(2), shift=1)
    bell_melody(tr, outro_mel, 0, 0.35)
    for (a, b, m) in outro_mel:
        ev(a, "lead", m=int(m + 0), d=round(b - a, 3))
    pads(tr, 122, 126, vel=0.6, cutoff=1800)
    keys_whole(tr, 122, 126, vel=0.45)
    # 最後に残るひとつの sin（E♭5、XY で円）
    fin_t = T(125)
    I.put(tr["sine"], I.quad_sine(float(mtof(75)), TAIL + T(126) - fin_t - 0.5, fade_in=1.2, fade_out=3.0, amp=0.24), fin_t)
    ev(fin_t, "sine_on", f=float(mtof(75)))
    add_kick(tr, T(124), 0.5, kind="heart")
    add_kick(tr, T(124, 2), 0.35, kind="heart")
    return tr


if __name__ == "__main__":
    import time
    t = time.time()
    tr = build_arrangement()
    print("arranged in", time.time() - t)
    os.makedirs(BUILD + "/stems", exist_ok=True)
    for k, v in tr.d.items():
        np.save(f"{BUILD}/stems/{k}.npy", v)
        print(k, float(np.abs(v).max()))
    np.save(f"{BUILD}/stems/_kicks.npy", np.array(KICKS))
    json.dump(sorted(EV, key=lambda e: e["t"]), open(f"{BUILD}/events.json", "w"), ensure_ascii=False)
    print("events", len(EV))
