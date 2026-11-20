"""
楽器。どれも sin の足し算（加算ウェーブテーブル / FM / sinノイズ）から作る。
各関数は「1音ぶんのサンプル列」を返すか、トラックバッファに直接書き込む。
"""
import functools

import numpy as np

from synth import (SR, TWO_PI, adsr, bp, chorus, fm_osc, hp, lp, mtof, noise, osc,
                   pan, perc_env, sine_osc, softclip, svf, wavetable)


def put(buf, x, t0, gain=1.0):
    """buf: (2,N) or (N,), x: (2,n) or (n,) を時刻 t0 に足し込む"""
    i0 = int(round(t0 * SR))
    if i0 >= buf.shape[-1]:
        return
    # 末尾 6 ms をなめらかに 0 へ（切れ目のプチノイズ防止）
    nf = min(288, x.shape[-1] // 4)
    if nf > 8:
        x = x.copy()
        x[..., -nf:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nf))).astype(np.float32)
    if i0 < 0:
        x = x[..., -i0:]
        i0 = 0
    n = min(x.shape[-1], buf.shape[-1] - i0)
    if x.ndim == 1 and buf.ndim == 2:
        buf[:, i0:i0 + n] += gain * x[:n]
    else:
        buf[..., i0:i0 + n] += gain * x[..., :n]


# ===========================================================================
# ドラム
# ===========================================================================
@functools.lru_cache(maxsize=None)
def kick(var=0, f0=160.0, f1=50.0, pd=0.035, decay=0.24, click=0.28, drive=2.0):
    n = int(decay * 3.0 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(100 + var)
    f0 = f0 * (1 + rng.uniform(-0.01, 0.01))
    f = f1 + (f0 - f1) * np.exp(-t / pd) + 260 * np.exp(-t / 0.004)
    ph = np.cumsum(f) / SR
    body = np.sin(TWO_PI * ph)
    env = np.where(t < 0.0015, t / 0.0015, 1.0) * np.exp(-t / decay) ** 1.2
    body = body * env
    cl = hp(noise(n, 11 + var), 2500) * np.exp(-t / 0.0035) * click * 2.0
    out = softclip(body * drive + cl, 1.2) * 0.95
    return out.astype(np.float32)


@functools.lru_cache(maxsize=None)
def heart_kick(var=0):
    """ブリッジ用のやわらかい「ドクン」"""
    return (kick(var, f0=110.0, f1=42.0, pd=0.05, decay=0.32, click=0.05, drive=1.2) * 0.8).astype(np.float32)


@functools.lru_cache(maxsize=None)
def snare(var=0, tone=1.0, snap=1.0, decay=0.19):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(200 + var)
    f = 185 * (1 + 0.5 * np.exp(-t / 0.01)) * (1 + rng.uniform(-0.01, 0.01))
    body = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-t / 0.075)
    body2 = np.sin(TWO_PI * np.cumsum(f * 1.78) / SR) * np.exp(-t / 0.045) * 0.5
    nz = noise(n, 21 + var)
    nz = hp(nz, 1400) * 0.7 + bp(nz, 5200, 0.8) * 0.6
    nz = nz * np.exp(-t / decay)
    att = np.where(t < 0.001, t / 0.001, 1.0)
    out = (body + body2) * tone * 0.9 + nz * snap * 1.1
    return (softclip(out * att * 1.4, 1.1) * 0.8).astype(np.float32)


@functools.lru_cache(maxsize=None)
def clap(var=0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    nz = noise(n, 31 + var)
    nz = bp(nz, 1250, 1.1) * 1.4 + bp(nz, 2600, 1.5) * 0.6
    env = np.zeros(n)
    for k, off in enumerate([0.0, 0.0095, 0.0185, 0.029]):
        tt = t - off
        e = np.where(tt >= 0, np.exp(-np.clip(tt, 0, None) / (0.0055 if k < 3 else 0.13)), 0.0)
        env = np.maximum(env, e * (0.8 if k < 3 else 1.0))
    return (softclip(nz * env * 1.6, 1.2) * 0.7).astype(np.float32)


_HAT_F = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.65


@functools.lru_cache(maxsize=None)
def hat(var=0, decay=0.045, bright=1.0):
    n = int(max(decay * 6, 0.08) * SR)
    t = np.arange(n) / SR
    sq = np.zeros(n, np.float32)
    for k, f in enumerate(_HAT_F):
        tab = wavetable("square", f * 1.02)
        sq += osc(tab, np.full(n, f, np.float32), (k * 0.137 + var * 0.05) % 1.0)
    metal = bp(sq, 9500, 1.2) * 0.6 + hp(sq, 8000) * 0.5
    nz = hp(noise(n, 41 + var), 7500) * 0.6
    out = (metal + nz) * np.exp(-t / decay) * np.where(t < 0.0007, t / 0.0007, 1.0)
    return (hp(out, 6000) * 0.9 * bright).astype(np.float32)


@functools.lru_cache(maxsize=None)
def crash(var=0, decay=2.4):
    n = int(decay * 3 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(300 + var)
    out = np.zeros((2, n), np.float32)
    for c in range(2):
        nz = noise(n, 51 + var * 2 + c)
        sq = np.zeros(n, np.float32)
        for k in range(14):
            f = rng.uniform(380, 9000)
            sq += osc(wavetable("square", f), np.full(n, f, np.float32), rng.uniform())
        mix = hp(nz, 3500) * 0.8 + bp(sq, 6500, 0.7) * 0.25
        env = np.where(t < 0.004, t / 0.004, 1.0) * (0.75 * np.exp(-t / decay) + 0.25 * np.exp(-t / 0.15))
        out[c] = mix * env
    return (out * 0.55).astype(np.float32)


@functools.lru_cache(maxsize=None)
def shaker(var=0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    nz = bp(noise(n, 61 + var), 7800, 0.9)
    env = np.where(t < 0.012, t / 0.012, np.exp(-(t - 0.012) / 0.035))
    return (nz * env * 0.7).astype(np.float32)


def impact(dur=3.0, f0=72.0, f1=30.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    boom = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    nz = lp(noise(n, 71), 1800) * np.exp(-t / 0.25) * 0.8
    cr = crash(7, 2.8)[:, :n] * 0.6
    mono = softclip((boom * 1.3 + nz) * np.where(t < 0.002, t / 0.002, 1.0), 1.3)
    return (np.stack([mono, mono]) + cr).astype(np.float32)


def riser(dur, f_lo=250.0, f_hi=9000.0, seed=0, tonal_midi=None):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    fc = f_lo * (f_hi / f_lo) ** (x ** 1.4)
    out = np.zeros((2, n), np.float32)
    for c in range(2):
        nz = noise(n, 81 + seed * 3 + c)
        out[c] = svf(nz, fc.astype(np.float32), 2.5, 1) * 0.9
    amp = x ** 2.2
    out *= amp[None, :]
    if tonal_midi is not None:
        # 半音で 1 オクターブせり上がる supersaw
        m = tonal_midi + 12 * x ** 1.6
        f = mtof(m).astype(np.float32)
        tab = wavetable("saw", float(f.max()) * 1.05)
        s = np.zeros(n, np.float32)
        for k, dt in enumerate([-0.12, -0.05, 0.0, 0.05, 0.12]):
            s += osc(tab, f * 2 ** (dt / 12), k * 0.21)
        s = lp(s, (500 + 7000 * x ** 2).astype(np.float32)) * 0.18 * amp
        out += np.stack([s, s])
    return out.astype(np.float32)


def downlifter(dur=2.0, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    fc = 9000 * (200 / 9000) ** x
    out = np.zeros((2, n), np.float32)
    for c in range(2):
        out[c] = svf(noise(n, 91 + seed + c), fc.astype(np.float32), 2.0, 1) * (1 - x) ** 2 * 0.8
    return out


def reverse_cymbal(dur=1.6, seed=0):
    c = crash(11 + seed, 2.0)
    n = int(dur * SR)
    seg = c[:, :n][:, ::-1].copy()
    fade = np.linspace(0, 1, n) ** 2
    return (seg * fade[None, :] * 1.2).astype(np.float32)


# ===========================================================================
# 音程楽器
# ===========================================================================
def sine_pluck(midi_n, dur, vel=1.0, decay=0.28, bright=0.35):
    """sin + 弱い 2,3 倍音。イントロの主役の音。"""
    tail = decay * 4
    n = int((dur + tail) * SR)
    t = np.arange(n) / SR
    f = mtof(midi_n)
    x = (np.sin(TWO_PI * f * t) + bright * np.sin(TWO_PI * 2 * f * t) * np.exp(-t / (decay * 0.5))
         + bright * 0.4 * np.sin(TWO_PI * 3 * f * t) * np.exp(-t / (decay * 0.3)))
    env = np.where(t < 0.002, t / 0.002, np.exp(-t / decay))
    rel = np.where(t > dur, np.exp(-(t - dur) / 0.05), 1.0)
    return (x * env * rel * vel * 0.5).astype(np.float32)


_BELL_R = [1.0, 2.0, 3.0, 4.16, 5.43, 6.79, 8.21]
_BELL_A = [1.0, 0.55, 0.35, 0.25, 0.18, 0.11, 0.07]
_BELL_D = [1.8, 1.1, 0.8, 0.5, 0.38, 0.28, 0.2]


def bell(midi_n, vel=1.0, length=2.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = mtof(midi_n)
    x = np.zeros(n)
    for r, a, d in zip(_BELL_R, _BELL_A, _BELL_D):
        if f * r < 18000:
            x += a * np.sin(TWO_PI * f * r * t + r) * np.exp(-t / d)
    x *= np.where(t < 0.001, t / 0.001, 1.0)
    return (x * vel * 0.25).astype(np.float32)


def epiano(midi_n, dur, vel=0.8):
    """FM エレピ：sin を sin で揺らす（DX 系の考え方）"""
    tail = 0.6
    n = int((dur + tail) * SR)
    t = np.arange(n) / SR
    f = np.full(n, mtof(midi_n), np.float32)
    idx = (0.4 + 2.2 * vel * np.exp(-t / 0.5)).astype(np.float32)
    body = fm_osc(f, 1.0, idx, 0.0, 0.0)
    tine_idx = (1.5 * vel * np.exp(-t / 0.035)).astype(np.float32)
    tine = fm_osc(f, 14.0, tine_idx, 0.0, 0.25) * np.exp(-t / 0.12) * 0.25
    amp = np.exp(-t / (1.6 - 0.008 * (midi_n - 60)))
    amp *= np.where(t < 0.002, t / 0.002, 1.0)
    amp *= np.where(t > dur, np.exp(-(t - dur) / 0.12), 1.0)
    trem = 1.0 + 0.08 * np.sin(TWO_PI * 4.2 * t)
    return ((body + tine) * amp * trem * vel * 0.35).astype(np.float32)


def supersaw(midi_n, dur, vel=1.0, cutoff=5000.0, detune=0.18, voices=7, attack=0.01, release=0.35,
             q=0.8, cutoff_env=None, seed=0, shape="saw"):
    """デチューンしたノコギリ7本（各ノコギリは sin の倍音加算）→ ステレオ"""
    n_gate = int(dur * SR)
    n = int((dur + release * 3) * SR)
    f = mtof(midi_n)
    tab = wavetable(shape, f * 1.03)
    rng = np.random.default_rng(seed + int(midi_n * 7))
    offs = np.linspace(-1, 1, voices) * detune
    out = np.zeros((2, n), np.float32)
    for k, o in enumerate(offs):
        fr = np.full(n, f * 2 ** (o / 12), np.float32)
        v = osc(tab, fr, rng.uniform())
        p = np.linspace(-1.0, 1.0, voices)[k]
        out += pan(v, p)
    out /= np.sqrt(voices)
    env = adsr(n_gate, n, a=attack, d=0.25, s=0.85, r=release)
    if cutoff_env is None:
        c = np.full(n, cutoff, np.float32)
    else:
        c = cutoff_env(n).astype(np.float32)
    for ch in range(2):
        out[ch] = svf(out[ch], c, q, 0)
    return (out * env[None, :] * vel * 0.32).astype(np.float32)


def pad(midi_n, dur, vel=1.0, cutoff=2200.0, attack=0.6, release=1.4, seed=0):
    n_gate = int(dur * SR)
    n = int((dur + release * 3) * SR)
    f = mtof(midi_n)
    tab = wavetable("warm", f * 1.02)
    rng = np.random.default_rng(seed + int(midi_n))
    out = np.zeros((2, n), np.float32)
    for k, o in enumerate([-0.09, 0.0, 0.09]):
        v = osc(tab, np.full(n, f * 2 ** (o / 12), np.float32), rng.uniform())
        out += pan(v, [-0.6, 0.0, 0.6][k])
    for ch in range(2):
        out[ch] = lp(out[ch], cutoff, 0.6)
    env = adsr(n_gate, n, a=attack, d=0.5, s=0.9, r=release, curve=2.0)
    return (out * env[None, :] * vel * 0.22).astype(np.float32)


def strings(midi_n, dur, vel=1.0, attack=0.35, release=0.9, seed=0, cutoff=4200.0):
    n_gate = int(dur * SR)
    n = int((dur + release * 3) * SR)
    f = mtof(midi_n)
    tab = wavetable("saw", f * 1.04)
    rng = np.random.default_rng(seed + int(midi_n * 3))
    t = np.arange(n) / SR
    out = np.zeros((2, n), np.float32)
    for k in range(5):
        vib = 1 + 0.0045 * np.sin(TWO_PI * (5.1 + 0.37 * k) * t + rng.uniform(0, 6.28)) * np.clip(t / 0.5, 0, 1)
        fr = (f * 2 ** (rng.uniform(-0.08, 0.08) / 12) * vib).astype(np.float32)
        out += pan(osc(tab, fr, rng.uniform()), np.linspace(-0.7, 0.7, 5)[k])
    for ch in range(2):
        out[ch] = lp(hp(out[ch], 180), cutoff, 0.5)
    env = adsr(n_gate, n, a=attack, d=0.3, s=0.95, r=release, curve=2.0)
    return (out * env[None, :] * vel * 0.16).astype(np.float32)


def bass_note(midi_n, dur, vel=1.0, cutoff=900.0, sub=1.0, mid=0.6, glide_from=None):
    n_gate = int(dur * SR)
    n = int((dur + 0.08) * SR)
    f = mtof(midi_n)
    fr = np.full(n, f, np.float32)
    if glide_from is not None:
        g = int(0.03 * SR)
        fr[:g] = np.linspace(mtof(glide_from), f, g)
    s = sine_osc(fr, 0.0) * sub
    m = osc(wavetable("saw", f * 2.1), fr * 2, 0.0)
    t = np.arange(n) / SR
    cenv = (cutoff * (0.6 + 1.2 * np.exp(-t / 0.08))).astype(np.float32)
    m = svf(m, cenv, 0.9, 0) * mid
    env = adsr(n_gate, n, a=0.003, d=0.2, s=0.8, r=0.03)
    return (softclip((s + m) * env * 1.3, 1.4) * vel * 0.55).astype(np.float32)


def growl_bass(midi_n, dur, vel=1.0, rate_hz=3.75, seed=0):
    n_gate = int(dur * SR)
    n = int((dur + 0.06) * SR)
    t = np.arange(n) / SR
    f = mtof(midi_n)
    a = osc(wavetable("saw", f * 1.02), np.full(n, f, np.float32), 0.0)
    b = osc(wavetable("square", f * 1.02 * 1.004), np.full(n, f * 1.004, np.float32), 0.3)
    lfo = 0.5 - 0.5 * np.cos(TWO_PI * rate_hz * t)
    c = (180 + 2200 * lfo ** 1.5).astype(np.float32)
    x = svf(a + 0.7 * b, c, 2.2, 0)
    s = sine_osc(np.full(n, f, np.float32), 0.0) * 0.9
    env = adsr(n_gate, n, a=0.004, d=0.2, s=0.9, r=0.03)
    return (softclip((x * 1.2 + s) * env * 1.8, 2.0) * vel * 0.42).astype(np.float32)


def lead_line(notes, n_total, glide=0.045, vib_depth=0.18, vib_rate=5.6, cutoff=5200.0, shape="saw",
              octave_sub=0.35, detune=0.07):
    """モノフォニックのリード。notes: [(t0, t1, midi)]。ポルタメント付きで1本の線として鳴らす。"""
    if not notes:
        return np.zeros((2, n_total), np.float32)
    t_start = notes[0][0]
    t_end = notes[-1][1] + 0.4
    i0 = int(t_start * SR)
    n = int((t_end - t_start) * SR)
    t = np.arange(n) / SR + t_start
    pitch = np.zeros(n)
    gate = np.zeros(n)
    since = np.zeros(n)
    prev = None
    for (a, b, m) in notes:
        ia = int((a - t_start) * SR)
        ib = int((b - t_start) * SR)
        seg = np.arange(ib - ia) / SR
        if prev is not None and a - prev[1] < 0.02:
            p = m + (prev[2] - m) * np.exp(-seg / glide)
        else:
            p = np.full(ib - ia, float(m))
        pitch[ia:ib] = p
        gate[ia:ib] = 1.0
        since[ia:ib] = seg
        prev = (a, b, m)
    # 休符中は直前の音程を保持
    last = pitch[0]
    for i in range(n):
        if gate[i] == 0:
            pitch[i] = last
        else:
            last = pitch[i]
    vib = vib_depth * np.sin(TWO_PI * vib_rate * t) * np.clip((since - 0.18) / 0.25, 0, 1)
    f = mtof(pitch + vib).astype(np.float32)
    tab = wavetable(shape, float(f.max()) * 1.02)
    a = osc(tab, f * 2 ** (detune / 12), 0.0)
    b = osc(tab, f * 2 ** (-detune / 12), 0.37)
    sub = osc(wavetable("square", float(f.max()) / 2 * 1.02), f / 2, 0.11) * octave_sub
    # ゲートを滑らかに（アタック 4ms / リリース 80ms）
    from scipy.ndimage import uniform_filter1d
    g = gate.copy()
    env = np.zeros(n)
    e = 0.0
    ca = np.exp(-1 / (0.004 * SR))
    cr = np.exp(-1 / (0.08 * SR))
    for i in range(n):
        tgt = g[i]
        e = (ca if tgt > e else cr) * e + (1 - (ca if tgt > e else cr)) * tgt
        env[i] = e
    c = (cutoff * (0.55 + 0.45 * env)).astype(np.float32)
    x = svf(a + b + sub, c, 0.9, 0) * env * 0.25
    out = np.zeros((2, n_total), np.float32)
    seg = chorus(x.astype(np.float32), mix=0.35, base_ms=9, depth_ms=3, rate=0.5)
    m = min(n, n_total - i0)
    out[:, i0:i0 + m] = seg[:, :m]
    return out


def heart_voice(midi_n, dur, vel=1.0, attack=0.012, decay=0.25, sustain=0.55, release=0.25):
    """ハートの形の波。L = x(θ), R = y(θ)。オシロスコープの XY で見ると ♥ になる。
    x = 16 sin^3 θ = 12 sin θ - 4 sin 3θ
    y = 13 cos θ - 5 cos 2θ - 2 cos 3θ - cos 4θ   （どちらも sin/cos の足し算）"""
    n_gate = int(dur * SR)
    n = int((dur + release * 3) * SR)
    t = np.arange(n) / SR
    th = TWO_PI * mtof(midi_n) * t
    x = (12 * np.sin(th) - 4 * np.sin(3 * th)) / 17.0
    y = (13 * np.cos(th) - 5 * np.cos(2 * th) - 2 * np.cos(3 * th) - np.cos(4 * th)) / 17.0
    env = adsr(n_gate, n, a=attack, d=decay, s=sustain, r=release)
    return (np.stack([x, y]) * env[None, :] * vel * 0.5).astype(np.float32)


def quad_sine(freq, dur, fade_in=0.8, fade_out=1.0, amp=0.3):
    """L = sin, R = cos。XY で見ると円になる、最初のひとつの音。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    th = TWO_PI * freq * t
    env = np.clip(t / fade_in, 0, 1) ** 2 * np.clip((dur - t) / fade_out, 0, 1)
    return (np.stack([np.sin(th), np.cos(th)]) * env[None, :] * amp).astype(np.float32)
