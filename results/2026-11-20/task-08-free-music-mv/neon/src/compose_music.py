#!/usr/bin/env python3
"""
ORBITAL RAIN — 星降るネオンの夜
Original Cinematic Melodic Future Bass / J-Electro Composition, Synthesis, Mixing & Mastering Engine.

Key: Eb Major / C minor (Bars 0-55) -> Key Modulation +2 semitones to F Major / D minor (Bars 56-79)
Tempo: 128 BPM | Duration: 80 bars (150.0s) + 4.0s reverb tail = 154.0s | Sample Rate: 48,000 Hz
"""

import json
import math
import os
import time
import wave
import numpy as np
from scipy import signal

# ==============================================================================
# GLOBAL CONSTANTS & TIMING
# ==============================================================================
SR = 48000
BPM = 128.0
BEAT_SEC = 60.0 / BPM          # 0.46875 s
BAR_SEC = BEAT_SEC * 4.0       # 1.875 s
TOTAL_BARS = 80
MUSIC_SEC = TOTAL_BARS * BAR_SEC  # 150.0 s
TAIL_SEC = 4.0
TOTAL_SEC = MUSIC_SEC + TAIL_SEC  # 154.0 s
N_SAMPLES = int(round(TOTAL_SEC * SR))
FPS = 60
TOTAL_FRAMES = int(round(TOTAL_SEC * FPS))

RNG = np.random.default_rng(20261120)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT_DIR, "audio")
STEMS_DIR = os.path.join(AUDIO_DIR, "stems")
os.makedirs(STEMS_DIR, exist_ok=True)


# ==============================================================================
# MUSICAL PITCH & TIME HELPERS
# ==============================================================================
NOTE_MAP = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4,
    "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9,
    "A#": 10, "Bb": 10, "B": 11,
}

def note_to_midi(name: str) -> int:
    if isinstance(name, (int, float)):
        return int(name)
    if len(name) >= 3 and name[1] in ("#", "b"):
        pitch, octave = name[:2], int(name[2:])
    else:
        pitch, octave = name[:1], int(name[1:])
    return (octave + 1) * 12 + NOTE_MAP[pitch]

def midi_to_hz(midi: float) -> float:
    return 440.0 * (2.0 ** ((midi - 69.0) / 12.0))

def bar_beat_to_sample(bar: float, beat: float = 0.0) -> int:
    return int(round((bar * 4.0 + beat) * BEAT_SEC * SR))

def beats_to_samples(beats: float) -> int:
    return int(round(beats * BEAT_SEC * SR))

def add_stereo(buf: np.ndarray, sig: np.ndarray, start: int, gain: float = 1.0):
    """Safely mix a stereo (N,2) or mono (N,) signal into stereo buffer buf at sample offset start."""
    if sig.ndim == 1:
        sig = np.stack([sig, sig], axis=-1)
    n = sig.shape[0]
    if start >= buf.shape[0] or start + n <= 0:
        return
    src_s = max(0, -start)
    dst_s = max(0, start)
    length = min(n - src_s, buf.shape[0] - dst_s)
    if length > 0:
        buf[dst_s:dst_s + length] += sig[src_s:src_s + length] * gain

def pan_stereo(mono: np.ndarray, pan: float = 0.0) -> np.ndarray:
    """Equal-power stereo panning. pan in [-1.0 (L), +1.0 (R)]."""
    angle = (np.clip(pan, -1.0, 1.0) + 1.0) * 0.25 * math.pi
    return np.stack([mono * math.cos(angle), mono * math.sin(angle)], axis=-1)


# ==============================================================================
# FILTERS & DSP UTILITIES
# ==============================================================================
def butter_filter(sig: np.ndarray, cutoff, btype="low", order=2) -> np.ndarray:
    nyq = 0.5 * SR
    if isinstance(cutoff, (tuple, list)):
        wn = [np.clip(c / nyq, 1e-4, 0.995) for c in cutoff]
    else:
        wn = float(np.clip(cutoff / nyq, 1e-4, 0.995))
    sos = signal.butter(order, wn, btype=btype, output="sos")
    return signal.sosfilt(sos, sig, axis=0)

def biquad_peak(sig: np.ndarray, freq: float, q: float, gain_db: float) -> np.ndarray:
    """Audio EQ Cookbook peaking filter."""
    A = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * math.pi * freq / SR
    alpha = math.sin(w0) / (2.0 * q)
    cosw = math.cos(w0)
    b0 = 1.0 + alpha * A
    b1 = -2.0 * cosw
    b2 = 1.0 - alpha * A
    a0 = 1.0 + alpha / A
    a1 = -2.0 * cosw
    a2 = 1.0 - alpha / A
    sos = np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]])
    return signal.sosfilt(sos, sig, axis=0)

def biquad_shelf(sig: np.ndarray, freq: float, gain_db: float, kind="high", slope=0.7) -> np.ndarray:
    """High-shelf or low-shelf filter."""
    A = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * math.pi * freq / SR
    cosw = math.cos(w0)
    sinw = math.sin(w0)
    alpha = sinw / 2.0 * math.sqrt((A + 1.0 / A) * (1.0 / slope - 1.0) + 2.0)
    sq = 2.0 * math.sqrt(A) * alpha
    if kind == "high":
        b0 = A * ((A + 1) + (A - 1) * cosw + sq)
        b1 = -2 * A * ((A - 1) + (A + 1) * cosw)
        b2 = A * ((A + 1) + (A - 1) * cosw - sq)
        a0 = (A + 1) - (A - 1) * cosw + sq
        a1 = 2 * ((A - 1) - (A + 1) * cosw)
        a2 = (A + 1) - (A - 1) * cosw - sq
    else:
        b0 = A * ((A + 1) - (A - 1) * cosw + sq)
        b1 = 2 * A * ((A - 1) - (A + 1) * cosw)
        b2 = A * ((A + 1) - (A - 1) * cosw - sq)
        a0 = (A + 1) + (A - 1) * cosw + sq
        a1 = -2 * ((A - 1) + (A + 1) * cosw)
        a2 = (A + 1) + (A - 1) * cosw - sq
    sos = np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]])
    return signal.sosfilt(sos, sig, axis=0)

def dynamic_lowpass(sig: np.ndarray, cutoff_curve: np.ndarray, q: float = 0.85, block_size: int = 256) -> np.ndarray:
    """Smooth time-varying 2-pole resonant lowpass filter (block-wise stateful sosfilt)."""
    n = sig.shape[0]
    out = np.zeros_like(sig)
    zi = np.zeros((1, 2, sig.shape[1])) if sig.ndim == 2 else np.zeros((1, 2))
    for i in range(0, n, block_size):
        end = min(n, i + block_size)
        fc = float(np.clip(cutoff_curve[min(i + block_size // 2, len(cutoff_curve) - 1)], 40.0, 19500.0))
        w0 = 2.0 * math.pi * fc / SR
        cosw = math.cos(w0)
        alpha = math.sin(w0) / (2.0 * q)
        b0 = (1.0 - cosw) * 0.5
        b1 = 1.0 - cosw
        b2 = b0
        a0 = 1.0 + alpha
        a1 = -2.0 * cosw
        a2 = 1.0 - alpha
        sos = np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]])
        if i == 0:
            zi = signal.sosfilt_zi(sos)
            if sig.ndim == 2:
                zi = zi[:, :, None] * sig[0:1, :]
            else:
                zi = zi * sig[0]
        y, zi = signal.sosfilt(sos, sig[i:end], axis=0, zi=zi)
        out[i:end] = y
    return out

def make_adsr(n_samples: int, a_s: float, d_s: float, s_lvl: float, r_s: float) -> np.ndarray:
    """Generate smooth curved ADSR envelope of exact length n_samples (release occupies tail)."""
    env = np.zeros(n_samples, dtype=np.float64)
    na = min(int(a_s * SR), n_samples)
    nr = min(int(r_s * SR), max(1, n_samples - na))
    nd = min(int(d_s * SR), max(0, n_samples - na - nr))
    ns = max(0, n_samples - na - nd - nr)
    idx = 0
    if na > 0:
        env[idx:idx + na] = np.linspace(0.0, 1.0, na) ** 0.7
        idx += na
    if nd > 0:
        t = np.linspace(0.0, 1.0, nd)
        env[idx:idx + nd] = s_lvl + (1.0 - s_lvl) * np.exp(-4.5 * t)
        idx += nd
    if ns > 0:
        env[idx:idx + ns] = s_lvl
        idx += ns
    if nr > 0 and idx < n_samples:
        rem = n_samples - idx
        start_val = env[idx - 1] if idx > 0 else s_lvl
        t = np.linspace(0.0, 1.0, rem)
        env[idx:] = start_val * np.exp(-5.0 * t) * (1.0 - t)
    return env

def bandlimited_saw(phase: np.ndarray, freq_hz: float, max_harm: int = 28) -> np.ndarray:
    """Clean anti-aliased additive sawtooth wave (zero harsh aliasing!)."""
    nyq_limit = max(1, min(max_harm, int((SR * 0.44) / max(freq_hz, 20.0))))
    out = np.zeros_like(phase)
    # Gibbs-smoothed Lanczos sigma factor for silky analog top-end
    for k in range(1, nyq_limit + 1):
        sigma = math.sin(math.pi * k / (nyq_limit + 1)) / (math.pi * k / (nyq_limit + 1))
        out += (sigma / k) * np.sin(k * phase)
    return out * (2.0 / math.pi)

def bandlimited_saw_varfreq(phase: np.ndarray, avg_freq_hz: float, max_harm: int = 22) -> np.ndarray:
    return bandlimited_saw(phase, avg_freq_hz, max_harm=max_harm)

def soft_saturate(x: np.ndarray, drive: float = 1.5) -> np.ndarray:
    return np.tanh(x * drive) / math.tanh(drive)


# ==============================================================================
# STUDIO EFFECTS: SHIMMER HALL REVERB, PLATE REVERB, PING-PONG DELAY
# ==============================================================================
def build_hall_ir(decay_s: float = 3.4, predelay_s: float = 0.022, shimmer: float = 0.18, seed: int = 42) -> np.ndarray:
    """Craft a lush, true-stereo studio concert hall impulse response with early reflections & shimmer."""
    rng = np.random.default_rng(seed)
    n = int(decay_s * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2), dtype=np.float64)

    # Decorrelated stereo velvet/Gaussian diffusion tail
    raw_l = rng.standard_normal(n)
    raw_r = rng.standard_normal(n)

    # Multi-band frequency-dependent decay (high frequencies decay faster, natural air absorption)
    low_env = np.exp(-t / (decay_s * 0.34))
    mid_env = np.exp(-t / (decay_s * 0.25))
    hi_env = np.exp(-t / (decay_s * 0.14))

    for ch, raw in enumerate([raw_l, raw_r]):
        b_low = butter_filter(raw, (180.0, 900.0), btype="band", order=2) * low_env
        b_mid = butter_filter(raw, (900.0, 3800.0), btype="band", order=2) * mid_env
        b_hi = butter_filter(raw, (3800.0, 11500.0), btype="band", order=2) * hi_env
        tail = 0.55 * b_low + 0.85 * b_mid + 0.55 * b_hi
        # Gentle swell-in so reverb blooms smoothly instead of smearing transients
        swell = np.clip(t / 0.065, 0.0, 1.0) ** 1.4
        ir[:, ch] = tail * swell

    # Subtle octave-up shimmer sheen in upper harmonics
    if shimmer > 0:
        shim_l = butter_filter(rng.standard_normal(n), (2200.0, 12000.0), btype="band", order=2)
        shim_r = butter_filter(rng.standard_normal(n), (2200.0, 12000.0), btype="band", order=2)
        shim_env = (np.clip(t / 0.35, 0.0, 1.0) ** 1.8) * np.exp(-t / (decay_s * 0.36))
        # Subtle harmonic beating shimmer
        mod = 0.75 + 0.25 * np.sin(2.0 * math.pi * 1.15 * t)
        ir[:, 0] += shim_l * shim_env * mod * shimmer
        ir[:, 1] += shim_r * shim_env * (1.5 - mod) * shimmer

    # Pre-delay + crisp early reflections
    pd = int(predelay_s * SR)
    ir = np.roll(ir, pd, axis=0)
    ir[:pd] = 0.0
    early_taps = [
        (0.011, 0.22, 0.08), (0.017, 0.09, 0.20),
        (0.026, 0.16, 0.12), (0.037, 0.10, 0.15),
        (0.049, 0.11, 0.09), (0.063, 0.07, 0.10),
    ]
    for td, gl, gr in early_taps:
        idx = int(td * SR)
        if idx < n:
            ir[idx, 0] += gl
            ir[idx, 1] += gr

    # Normalize to exact unity L2 energy gain (so convolution never blows up!)
    energy_norm = np.sqrt(np.sum(ir ** 2) * 0.5) + 1e-12
    ir /= energy_norm
    return ir

def convolve_stereo(sig: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """Fast FFT stereo convolution trimmed to original signal length."""
    n = sig.shape[0]
    out = np.zeros_like(sig)
    out[:, 0] = signal.fftconvolve(sig[:, 0], ir[:, 0], mode="full")[:n]
    out[:, 1] = signal.fftconvolve(sig[:, 1], ir[:, 1], mode="full")[:n]
    return out

def ping_pong_delay(sig: np.ndarray, delay_beats: float = 0.75, feedback: float = 0.36, lp_hz: float = 3600.0) -> np.ndarray:
    """Stereo ping-pong dotted-8th delay with warm analog feedback filtering."""
    d_samp = beats_to_samples(delay_beats)
    n = sig.shape[0]
    wet = np.zeros_like(sig)
    # Feed filtered mono sum into alternating L / R taps (up to 7 echoes)
    tap_sig = butter_filter(0.5 * (sig[:, 0] + sig[:, 1]), (250.0, lp_hz), btype="band", order=2)
    gain = 1.0
    for k in range(1, 9):
        offset = k * d_samp
        if offset >= n:
            break
        gain *= feedback
        if k % 2 == 1:
            wet[offset:, 0] += tap_sig[:n - offset] * gain
            wet[offset:, 1] += tap_sig[:n - offset] * (gain * 0.22)
        else:
            wet[offset:, 1] += tap_sig[:n - offset] * gain
            wet[offset:, 0] += tap_sig[:n - offset] * (gain * 0.22)
        # Progressively darken subsequent echoes like analog BBD/tape delay
        tap_sig = butter_filter(tap_sig, max(900.0, lp_hz * (0.82 ** k)), btype="low", order=1)
    return wet


# ==============================================================================
# INSTRUMENT SYNTHESIZERS
# ==============================================================================
def synth_felt_piano_note(midi: int, dur_s: float, vel: float = 0.8) -> np.ndarray:
    """Lush intimate felt piano with piano string stiffness, fast warm hammer thump, and stereo key spread."""
    f0 = midi_to_hz(midi)
    total_s = dur_s + 1.15
    n = int(total_s * SR)
    t = np.arange(n) / SR

    # Piano string stiffness inharmonicity B
    B = 0.00018 * (1.0 + max(0, midi - 60) * 0.04)
    # Higher velocity -> brighter upper harmonics
    bright = 0.45 + 0.55 * vel
    max_h = min(14, int((SR * 0.42) / max(f0, 30.0)))

    sig = np.zeros(n, dtype=np.float64)
    for k in range(1, max_h + 1):
        fk = f0 * k * math.sqrt(1.0 + B * k * k)
        amp = (1.0 / (k ** (1.45 - 0.35 * bright))) * (1.0 if k != 2 else 0.72)
        # Higher harmonics decay significantly faster than fundamental
        decay_rate = (0.85 + 0.42 * (k ** 1.25)) * (0.75 + 0.015 * max(0, midi - 48))
        # Subtle unison string detune (piano has 2-3 strings per key)
        det = 1.0 + 0.00045 * ((k % 3) - 1)
        ph = 2.0 * math.pi * fk * t
        part = 0.65 * np.sin(ph) + 0.35 * np.sin(ph * det + 0.4 * k)
        sig += amp * part * np.exp(-decay_rate * t)

    # Felt hammer mechanical thump (warm soft impact)
    ham_n = min(n, int(0.035 * SR))
    ham_t = np.arange(ham_n) / SR
    hammer = RNG.standard_normal(ham_n) * np.exp(-ham_t / 0.006)
    hammer = butter_filter(hammer, (120.0, 1400.0 + 1800.0 * vel), btype="band", order=2)
    sig[:ham_n] += hammer * (0.14 * vel)

    # Attack + release damper envelope
    att_n = max(1, int(0.007 * SR))
    sig[:att_n] *= np.linspace(0.0, 1.0, att_n) ** 0.6
    rel_start = int(dur_s * SR)
    if rel_start < n:
        rt = np.linspace(0.0, 1.0, n - rel_start)
        sig[rel_start:] *= np.exp(-3.6 * rt) * (1.0 - rt)

    # Gentle warm body filter
    sig = butter_filter(sig, 1800.0 + 4800.0 * vel, btype="low", order=1)
    # Realistic piano stereo imaging: lower keys slightly left, higher keys slightly right
    pan = np.clip((midi - 62) / 34.0, -0.48, 0.48)
    return pan_stereo(sig * (vel * 0.42), pan)

def synth_music_box_note(midi: int, dur_s: float, vel: float = 0.75) -> np.ndarray:
    """Crystalline celesta / anime music-box chime with delicate metallic tine transient."""
    f0 = midi_to_hz(midi)
    total_s = dur_s + 1.4
    n = int(total_s * SR)
    t = np.arange(n) / SR

    # Pure bell-like partials (fundamental + 2x + 3x + subtle celesta inharmonic sparkle)
    sig = (
        1.00 * np.sin(2.0 * math.pi * f0 * t) * np.exp(-1.55 * t)
        + 0.36 * np.sin(2.0 * math.pi * f0 * 2.001 * t + 0.2) * np.exp(-3.4 * t)
        + 0.14 * np.sin(2.0 * math.pi * f0 * 3.004 * t + 0.5) * np.exp(-5.8 * t)
        + 0.10 * np.sin(2.0 * math.pi * f0 * 5.404 * t) * np.exp(-14.0 * t)
    )
    # Tiny delicate FM shimmer on attack
    fm = np.sin(2.0 * math.pi * f0 * t + 1.4 * np.exp(-26.0 * t) * np.sin(2.0 * math.pi * f0 * 2.756 * t))
    sig = 0.78 * sig + 0.22 * fm * np.exp(-2.8 * t)

    att = max(1, int(0.0025 * SR))
    sig[:att] *= np.linspace(0.0, 1.0, att)
    sig *= np.exp(-t * 0.45)

    pan = np.clip(((midi - 72) / 22.0) + RNG.uniform(-0.12, 0.12), -0.65, 0.65)
    return pan_stereo(sig * (vel * 0.26), pan)

def synth_harp_pluck(midi: int, dur_s: float, vel: float = 0.7, pan: float = 0.0) -> np.ndarray:
    """Sparkling stereo synth-harp / crystalline pluck for 16th-note arpeggios."""
    f0 = midi_to_hz(midi)
    n = int((dur_s + 0.35) * SR)
    t = np.arange(n) / SR
    # 2 detuned bright saws + FM sparkle
    ph1 = 2.0 * math.pi * f0 * t
    ph2 = 2.0 * math.pi * (f0 * 1.0035) * t + 1.1
    raw = 0.55 * bandlimited_saw(ph1, f0, 14) + 0.45 * bandlimited_saw(ph2, f0, 14)
    # Plucky filter envelope via fast harmonic blend + LP
    bright_env = np.exp(-t / 0.065)
    body_env = np.exp(-t / max(0.14, dur_s * 0.9))
    low_body = butter_filter(raw, min(1400.0, f0 * 2.5), btype="low", order=2)
    hi_snap = butter_filter(raw, min(8500.0, f0 * 9.0), btype="low", order=2)
    sig = (0.58 * low_body * body_env + 0.62 * hi_snap * bright_env)
    att = max(1, int(0.002 * SR))
    sig[:att] *= np.linspace(0.0, 1.0, att)
    fade = min(n, int(0.03 * SR))
    sig[-fade:] *= np.linspace(1.0, 0.0, fade)
    return pan_stereo(sig * (vel * 0.24), pan)

def synth_supersaw_chord(midis: list[int], dur_s: float, vel: float = 0.85,
                         voices: int = 7, detune_semi: float = 0.26,
                         attack_s: float = 0.025, release_s: float = 0.14) -> np.ndarray:
    """Massive wide 7-voice stereo detuned Future Bass supersaw chord stack."""
    n = int((dur_s + release_s) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2), dtype=np.float64)

    detunes = np.linspace(-detune_semi, detune_semi, voices)
    pans = np.linspace(-0.88, 0.88, voices)
    # Slight center focus + lush wide wings
    v_weights = np.array([0.82, 0.92, 0.98, 1.15, 0.98, 0.92, 0.82]) if voices == 7 else np.ones(voices)

    for idx_m, m in enumerate(midis):
        f_base = midi_to_hz(m)
        note_gain = 1.0 / math.sqrt(len(midis))
        # Slightly boost top melody-supporting chord voice for luminous shimmer
        if idx_m == len(midis) - 1:
            note_gain *= 1.12
        for v in range(voices):
            ratio = 2.0 ** (detunes[v] / 12.0)
            # Slow organic analog drift
            lfo = 1.0 + 0.0008 * np.sin(2.0 * math.pi * (0.35 + 0.17 * v) * t + v * 1.3 + idx_m)
            freq = f_base * ratio
            ph = 2.0 * math.pi * freq * np.cumsum(lfo) / SR + RNG.uniform(0, 2.0 * math.pi)
            wave_v = bandlimited_saw(ph, freq, max_harm=22)
            out += pan_stereo(wave_v * (v_weights[v] * note_gain / voices), pans[v])

    env = make_adsr(n, attack_s, 0.12, 0.92, release_s)
    out *= env[:, None] * (vel * 1.15)
    return out

def synth_warm_strings_chord(midis: list[int], dur_s: float, vel: float = 0.7,
                             attack_s: float = 0.55, release_s: float = 0.75) -> np.ndarray:
    """Lush cinematic orchestral string ensemble with staggered vibrato & wooden body resonance."""
    n = int((dur_s + release_s) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2), dtype=np.float64)

    for idx_m, m in enumerate(midis):
        f_base = midi_to_hz(m)
        # 4 ensemble players per note
        for p in range(4):
            det = 2.0 ** (RNG.uniform(-0.09, 0.09) / 12.0)
            vib_rate = RNG.uniform(4.7, 5.7)
            vib_depth = 0.0045 * np.clip((t - 0.25) / 0.55, 0.0, 1.0)
            freq_t = f_base * det * (1.0 + vib_depth * np.sin(2.0 * math.pi * vib_rate * t + RNG.uniform(0, 6.28)))
            ph = 2.0 * math.pi * np.cumsum(freq_t) / SR + RNG.uniform(0, 6.28)
            w = 0.75 * bandlimited_saw(ph, f_base, max_harm=16) + 0.25 * np.sin(ph)
            pan = np.clip(((p - 1.5) * 0.42) + ((idx_m - 1.5) * 0.14), -0.82, 0.82)
            out += pan_stereo(w / (4.0 * math.sqrt(len(midis))), pan)

    # Warm orchestral string body shaping
    out = butter_filter(out, (150.0, 5200.0), btype="band", order=2)
    out = biquad_peak(out, 2400.0, 1.2, 2.5)
    out = biquad_peak(out, 680.0, 1.4, -2.0)
    env = make_adsr(n, attack_s, 0.25, 0.88, release_s)
    out *= env[:, None] * (vel * 0.34)
    return out

def synth_formant_choir_chord(midis: list[int], dur_s: float, vel: float = 0.72,
                              vowel: str = "aah", attack_s: float = 0.65, release_s: float = 0.9) -> np.ndarray:
    """Ethereal angel-choir pad using multi-band resonant human vowel formant filters."""
    n = int((dur_s + release_s) * SR)
    t = np.arange(n) / SR
    raw = np.zeros((n, 2), dtype=np.float64)

    for m in midis:
        f_base = midi_to_hz(m)
        for v in range(3):
            det = 2.0 ** (((v - 1) * 0.08 + RNG.uniform(-0.02, 0.02)) / 12.0)
            vib = 1.0 + 0.005 * np.clip(t / 0.7, 0.0, 1.0) * np.sin(2.0 * math.pi * (5.1 + 0.3 * v) * t + v)
            ph = 2.0 * math.pi * np.cumsum(f_base * det * vib) / SR + RNG.uniform(0, 6.28)
            # Glottal-like pulse + saw hybrid
            w = 0.65 * bandlimited_saw(ph, f_base, 18) + 0.35 * np.sin(ph)
            raw += pan_stereo(w / (3.0 * math.sqrt(len(midis))), (v - 1) * 0.55)

    # Formant filter banks (F1, F2, F3)
    if vowel == "ooh":
        formants = [(325.0, 75.0, 1.0), (700.0, 110.0, 0.65), (2550.0, 240.0, 0.28)]
    elif vowel == "eeh":
        formants = [(390.0, 80.0, 0.9), (2100.0, 180.0, 0.65), (2850.0, 260.0, 0.38)]
    else:  # "aah"
        formants = [(680.0, 110.0, 1.0), (1150.0, 140.0, 0.80), (2650.0, 250.0, 0.42)]

    out = np.zeros_like(raw)
    for fc, bw, g in formants:
        lo = max(80.0, fc - bw)
        hi = min(SR * 0.45, fc + bw)
        out += butter_filter(raw, (lo, hi), btype="band", order=2) * g

    # Subtle airy breath texture
    air = butter_filter(RNG.standard_normal((n, 2)), (3200.0, 8500.0), btype="band", order=2) * 0.015
    out += air
    env = make_adsr(n, attack_s, 0.3, 0.85, release_s)
    out *= env[:, None] * (vel * 0.72)
    return out

def synth_expressive_lead(notes: list[tuple[float, float, int, float]],
                          glide_s: float = 0.042, bright: float = 1.0,
                          octave_double: float = 0.0, vib_depth: float = 0.0065) -> np.ndarray:
    """
    Monophonic expressive singing lead synthesizer with true legato portamento,
    delayed human vibrato, harmonic breath warmth, and optional soaring octave double!
    notes: list of (start_beat, dur_beats, midi, velocity)
    """
    if not notes:
        return np.zeros((N_SAMPLES, 2), dtype=np.float64)

    # Build continuous pitch & gate trajectories across the full song for smooth portamento
    freq_curve = np.full(N_SAMPLES, midi_to_hz(notes[0][2]), dtype=np.float64)
    amp_curve = np.zeros(N_SAMPLES, dtype=np.float64)
    vib_env = np.zeros(N_SAMPLES, dtype=np.float64)

    prev_end = -10.0
    prev_hz = midi_to_hz(notes[0][2])

    for start_b, dur_b, midi, vel in notes:
        s0 = int(round(start_b * BEAT_SEC * SR))
        dur_samp = int(round(dur_b * BEAT_SEC * SR))
        rel_samp = int(round(0.11 * SR))
        s1 = min(N_SAMPLES, s0 + dur_samp + rel_samp)
        if s0 >= N_SAMPLES or dur_samp <= 0:
            continue

        hz = midi_to_hz(midi)
        seg_n = s1 - s0
        is_legato = (start_b - prev_end) < 0.08

        if is_legato and prev_hz != hz:
            gn = min(seg_n, int(glide_s * SR))
            t_g = np.linspace(0.0, 1.0, gn)
            # Smooth S-curve pitch slide in log-frequency space
            blend = 0.5 - 0.5 * np.cos(math.pi * t_g)
            freq_curve[s0:s0 + gn] = np.exp(np.log(prev_hz) * (1.0 - blend) + np.log(hz) * blend)
            freq_curve[s0 + gn:s1] = hz
        else:
            freq_curve[s0:s1] = hz

        # Expressive swell envelope per note
        att = 0.018 if not is_legato else 0.010
        env = make_adsr(seg_n, att, 0.14, 0.84, min(0.11, (s1 - s0) / SR * 0.4)) * vel
        # Phrase tail swell for sustained notes
        amp_curve[s0:s1] = np.maximum(amp_curve[s0:s1], env)

        # Delayed vibrato ramps up gently after 0.16s of sustained note
        nt = np.arange(seg_n) / SR
        vib_env[s0:s1] = np.clip((nt - 0.14) / 0.28, 0.0, 1.0)

        prev_end = start_b + dur_b
        prev_hz = hz

    # Only synthesize active non-zero spans to keep computation crisp & fast
    t_all = np.arange(N_SAMPLES) / SR
    vib_mod = 1.0 + vib_depth * vib_env * np.sin(2.0 * math.pi * 5.6 * t_all)
    inst_freq = freq_curve * vib_mod
    ph_main = 2.0 * math.pi * np.cumsum(inst_freq) / SR

    # Dual slightly-detuned silky saw + warm triangle core + subtle unison L/R spread
    ph_l = 2.0 * math.pi * np.cumsum(inst_freq * 1.0038) / SR + 0.7
    ph_r = 2.0 * math.pi * np.cumsum(inst_freq * 0.9962) / SR + 2.1

    # Core singing harmonic waveform (anti-aliased additive harmonics 1..10)
    def silky_voice(ph):
        w = (
            1.00 * np.sin(ph)
            + 0.62 * np.sin(2.0 * ph)
            + 0.40 * np.sin(3.0 * ph)
            + 0.25 * np.sin(4.0 * ph)
            + 0.16 * np.sin(5.0 * ph)
            + 0.11 * np.sin(6.0 * ph)
            + 0.07 * np.sin(7.0 * ph)
            + 0.045 * np.sin(8.0 * ph)
        )
        return w / 1.9

    core = silky_voice(ph_main)
    left = 0.55 * core + 0.45 * silky_voice(ph_l)
    right = 0.55 * core + 0.45 * silky_voice(ph_r)

    if octave_double > 0.0:
        oct_w = 0.75 * np.sin(2.0 * ph_main) + 0.35 * np.sin(4.0 * ph_main) + 0.15 * np.sin(6.0 * ph_main)
        left += oct_w * octave_double * 0.55
        right += oct_w * octave_double * 0.55

    sig = np.stack([left, right], axis=-1) * amp_curve[:, None]
    # Soft expressive drive & vocal presence sculpting
    sig = soft_saturate(sig, 1.35)
    lp_hz = 2800.0 + 5400.0 * bright
    sig = butter_filter(sig, (180.0, lp_hz), btype="band", order=2)
    sig = biquad_peak(sig, 2800.0, 1.1, 3.0)
    return sig * 0.36

def synth_sub_and_reese_bass(notes: list[tuple[float, float, int, float, float]]) -> np.ndarray:
    """
    Hybrid pro bass:
    - Ultra-clean MONO pure sine + gentle 2nd harmonic sub-bass (below 110 Hz)
    - Warm stereo gritty Moog/Reese mid-bass layer controlled by grit parameter (0..1)
    notes: (start_beat, dur_beats, midi, vel, grit)
    """
    out = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    for start_b, dur_b, midi, vel, grit in notes:
        s0 = int(round(start_b * BEAT_SEC * SR))
        dur_s = dur_b * BEAT_SEC
        n = int((dur_s + 0.06) * SR)
        if n <= 0:
            continue
        t = np.arange(n) / SR
        f0 = midi_to_hz(midi)
        ph = 2.0 * math.pi * f0 * t

        # Pure mono sub foundation (clean sine + tiny warm 2nd harmonic so laptops/phones hear the bass too!)
        sub = np.sin(ph) + 0.18 * np.sin(2.0 * ph) + 0.05 * np.sin(3.0 * ph)
        env = make_adsr(n, 0.008, 0.08, 0.90, 0.055)
        sub_stereo = np.stack([sub, sub], axis=-1) * env[:, None] * (vel * 0.44)

        if grit > 0.02:
            # Stereo detuned Reese mid-bass above 115 Hz
            ph_l = 2.0 * math.pi * (f0 * 2.0 * 1.0055) * t + RNG.uniform(0, 6.28)
            ph_r = 2.0 * math.pi * (f0 * 2.0 * 0.9945) * t + RNG.uniform(0, 6.28)
            mid_l = bandlimited_saw(ph_l, f0 * 2.0, 14)
            mid_r = bandlimited_saw(ph_r, f0 * 2.0, 14)
            mid = np.stack([mid_l, mid_r], axis=-1)
            mid = soft_saturate(mid, 1.8 + 1.2 * grit)
            mid = butter_filter(mid, (115.0, 750.0 + 1850.0 * grit), btype="band", order=2)
            sub_stereo += mid * env[:, None] * (vel * grit * 0.25)

        add_stereo(out, sub_stereo, s0)
    return out


# ==============================================================================
# PRO DRUM SYNTHESIS & FX
# ==============================================================================
def synth_kick(punch: float = 1.0, sub_tail: float = 0.24) -> np.ndarray:
    """Modern punchy EDM/Future-Bass kick: pitch-swept sine + crisp click transient + warm saturation."""
    n = int((sub_tail + 0.18) * SR)
    t = np.arange(n) / SR
    # Pitch envelope: 175 Hz -> 46 Hz exponential sweep
    f_t = 46.0 + 135.0 * np.exp(-t / 0.024) + 28.0 * np.exp(-t / 0.075)
    ph = 2.0 * math.pi * np.cumsum(f_t) / SR
    body = np.sin(ph) * np.exp(-t / sub_tail)
    # Crisp transient beater click
    click = np.sin(2.0 * math.pi * 2400.0 * t) * np.exp(-t / 0.0028)
    click += butter_filter(RNG.standard_normal(n), (1500.0, 7000.0), btype="band", order=2) * np.exp(-t / 0.004) * 0.45
    sig = body * 0.95 + click * (0.28 * punch)
    # Micro 1.5ms ramp to avoid DC pop
    att = max(1, int(0.0012 * SR))
    sig[:att] *= np.linspace(0.0, 1.0, att)
    sig = soft_saturate(sig, 1.55)
    sig = butter_filter(sig, 28.0, btype="high", order=2)
    return np.stack([sig, sig], axis=-1) * 0.88

def synth_snare(big: bool = True, pitch_mult: float = 1.0) -> np.ndarray:
    """Layered stadium/Future-Bass snare: punchy 190Hz shell + micro-clap burst + airy stereo snap."""
    dur = 0.42 if big else 0.24
    n = int(dur * SR)
    t = np.arange(n) / SR

    # Shell tone drop (250 Hz -> 165 Hz)
    f_t = (165.0 + 95.0 * np.exp(-t / 0.016)) * pitch_mult
    ph = 2.0 * math.pi * np.cumsum(f_t) / SR
    shell = np.sin(ph) * np.exp(-t / 0.068)

    # Crisp wide stereo snare wires
    wire_l = butter_filter(RNG.standard_normal(n), (900.0, 11500.0), btype="band", order=2)
    wire_r = butter_filter(RNG.standard_normal(n), (900.0, 11500.0), btype="band", order=2)
    wire_env = np.exp(-t / (0.14 if big else 0.075))
    wires = np.stack([wire_l, wire_r], axis=-1) * wire_env[:, None]

    # Layered handclap micro-bursts for huge modern pop/EDM crack
    clap = np.zeros((n, 2), dtype=np.float64)
    for delay_ms, g in [(0.0, 0.55), (0.009, 0.48), (0.017, 0.40)]:
        d = int(delay_ms * SR)
        if d < n:
            cl_t = np.arange(n - d) / SR
            c_n = butter_filter(RNG.standard_normal((n - d, 2)), (1100.0, 6200.0), btype="band", order=2)
            clap[d:] += c_n * np.exp(-cl_t / 0.022)[:, None] * g

    sig = np.stack([shell, shell], axis=-1) * 0.65 + wires * (0.62 if big else 0.45) + clap * (0.38 if big else 0.22)
    sig = soft_saturate(sig, 1.45)
    return sig * (0.76 if big else 0.52)

def synth_rim_click() -> np.ndarray:
    """Delicate wood/glass rim click for Verse 1 intimacy."""
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    sig = (np.sin(2.0 * math.pi * 880.0 * t) * 0.55 + np.sin(2.0 * math.pi * 1720.0 * t) * 0.45) * np.exp(-t / 0.008)
    sig += butter_filter(RNG.standard_normal(n), (1800.0, 6500.0), btype="band", order=2) * np.exp(-t / 0.005) * 0.35
    return pan_stereo(sig * 0.36, 0.14)

def synth_hihat(open_hat: bool = False, vel: float = 0.7) -> np.ndarray:
    """Metallic 808/acoustic-hybrid crisp hi-hat."""
    dur = 0.28 if open_hat else 0.055
    n = int(dur * SR)
    t = np.arange(n) / SR
    # 6 inharmonic metallic partials
    metal = np.zeros(n)
    for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0):
        metal += np.sign(np.sin(2.0 * math.pi * f * t + RNG.uniform(0, 6.28)))
    metal = butter_filter(metal / 6.0, 6500.0, btype="high", order=2)
    air = butter_filter(RNG.standard_normal(n), (7500.0, 16500.0), btype="band", order=2)
    env = np.exp(-t / (0.095 if open_hat else 0.015))
    sig = (0.32 * metal + 0.68 * air) * env * (vel * 0.24)
    pan = RNG.uniform(-0.28, 0.28)
    return pan_stereo(sig, pan)

def synth_crash(dur_s: float = 2.8, vel: float = 0.8) -> np.ndarray:
    """Shimmering stereo crash cymbal impact."""
    n = int(dur_s * SR)
    t = np.arange(n) / SR
    l = butter_filter(RNG.standard_normal(n), (3200.0, 16000.0), btype="band", order=2)
    r = butter_filter(RNG.standard_normal(n), (3200.0, 16000.0), btype="band", order=2)
    env = (1.0 - np.exp(-t / 0.008)) * np.exp(-t / 0.85)
    return np.stack([l, r], axis=-1) * env[:, None] * (vel * 0.32)

def synth_sub_impact(root_midi: int = 32, dur_s: float = 2.4, vel: float = 0.9) -> np.ndarray:
    """Cinematic thunderous sub-drop impact for act transitions & drops."""
    n = int(dur_s * SR)
    t = np.arange(n) / SR
    f_end = midi_to_hz(root_midi)
    f_t = f_end * (1.0 + 1.35 * np.exp(-t / 0.22))
    ph = 2.0 * math.pi * np.cumsum(f_t) / SR
    sub = np.sin(ph) * np.exp(-t / 0.72)
    att = max(1, int(0.006 * SR))
    sub[:att] *= np.linspace(0.0, 1.0, att)
    boom = butter_filter(RNG.standard_normal((n, 2)), (60.0, 520.0), btype="band", order=2) * np.exp(-t / 0.38)[:, None] * 0.22
    return (np.stack([sub, sub], axis=-1) * 0.65 + boom) * vel

def synth_riser(dur_s: float, f_start: float = 180.0, f_end: float = 9500.0, root_midi: int = 58, vel: float = 0.75) -> np.ndarray:
    """Exhilarating stereo white-noise sweep + rising harmonic synth swarm uplifter."""
    n = int(dur_s * SR)
    t = np.arange(n) / SR
    prog = t / dur_s

    # Stereo rising filtered noise
    noise = RNG.standard_normal((n, 2))
    fc_curve = f_start * ((f_end / f_start) ** (prog ** 1.35))
    swept = dynamic_lowpass(noise, fc_curve, q=2.6, block_size=256)
    swept = butter_filter(swept, 240.0, btype="high", order=2)

    # Rising pitch harmonic shimmer tones
    f0 = midi_to_hz(root_midi)
    pitch_curve = f0 * (2.0 ** (prog * 1.5))  # rises 1.5 octaves!
    ph1 = 2.0 * math.pi * np.cumsum(pitch_curve * 1.004) / SR
    ph2 = 2.0 * math.pi * np.cumsum(pitch_curve * 0.996) / SR
    tone = np.stack([np.sin(ph1) + 0.4 * np.sin(2 * ph1), np.sin(ph2) + 0.4 * np.sin(2 * ph2)], axis=-1)

    env = (prog ** 2.1) * np.clip((dur_s - t) / 0.04, 0.0, 1.0)
    return (swept * 0.30 + tone * 0.16) * env[:, None] * vel

def synth_rain_bed(dur_s: float) -> np.ndarray:
    """Atmospheric binaural midnight rain texture with soft distant raindrops (zero harshness)."""
    n = int(dur_s * SR)
    # Soft pink-ish rain wash
    l = butter_filter(RNG.standard_normal(n), (350.0, 5200.0), btype="band", order=1)
    r = butter_filter(RNG.standard_normal(n), (350.0, 5200.0), btype="band", order=1)
    rain = np.stack([l, r], axis=-1) * 0.045

    # Delicate sparse water droplet pings
    n_drops = int(dur_s * 14)
    for _ in range(n_drops):
        pos = int(RNG.uniform(0.05, dur_s - 0.1) * SR)
        dn = int(0.025 * SR)
        dt = np.arange(dn) / SR
        f = RNG.uniform(1400.0, 4600.0)
        drop = np.sin(2.0 * math.pi * f * (1.0 + 0.25 * dt / 0.025) * dt) * np.exp(-dt / 0.0045)
        add_stereo(rain, pan_stereo(drop * RNG.uniform(0.015, 0.045), RNG.uniform(-0.85, 0.85)), pos)
    return rain


# ==============================================================================
# COMPLETE MUSICAL SCORE & ARRANGEMENT (80 BARS @ 128 BPM)
# ==============================================================================
def get_chord_progression():
    """
    Returns list of 80 tuples: (bar_idx, chord_name, bass_midi, chord_midis, section_name)
    Bars 0-55: Eb Major / C minor
    Bars 56-79: F Major / D minor (+2 semitone modulation!)
    """
    # Voicing dictionary (Eb Major / C minor) — carefully voice-led around C4-Bb4
    V_EB = {
        "Abmaj7": (note_to_midi("Ab1"), [note_to_midi(n) for n in ("Ab3", "C4", "Eb4", "G4", "Bb4")]),
        "Bb6":    (note_to_midi("Bb1"), [note_to_midi(n) for n in ("Bb3", "D4", "F4", "G4", "C5")]),
        "Bb7":    (note_to_midi("Bb1"), [note_to_midi(n) for n in ("Bb3", "D4", "F4", "Ab4", "C5")]),
        "Bb11":   (note_to_midi("Bb1"), [note_to_midi(n) for n in ("Bb3", "Eb4", "F4", "Ab4", "C5")]),
        "Bb13":   (note_to_midi("Bb1"), [note_to_midi(n) for n in ("Bb3", "D4", "G4", "Ab4", "C5")]),
        "Cm9":    (note_to_midi("C2"),  [note_to_midi(n) for n in ("C4", "D4", "Eb4", "G4", "Bb4")]),
        "Gm7":    (note_to_midi("G1"),  [note_to_midi(n) for n in ("G3", "Bb3", "D4", "F4", "A4")]),
        "Eb/G":   (note_to_midi("G1"),  [note_to_midi(n) for n in ("G3", "Bb3", "Eb4", "F4", "G4")]),
        "Ebmaj9": (note_to_midi("Eb1"), [note_to_midi(n) for n in ("Eb3", "G3", "Bb3", "D4", "F4")]),
        "Fm9":    (note_to_midi("F1"),  [note_to_midi(n) for n in ("F3", "Ab3", "C4", "Eb4", "G4")]),
        "G7#5":   (note_to_midi("G1"),  [note_to_midi(n) for n in ("G3", "B3", "Eb4", "F4", "Bb4")]),
        "G7":     (note_to_midi("G1"),  [note_to_midi(n) for n in ("G3", "B3", "D4", "F4", "G4")]),
        "Bb/D":   (note_to_midi("D2"),  [note_to_midi(n) for n in ("D4", "F4", "Bb4", "C5")]),
        # Pivot dominant into F Major:
        "C9sus4": (note_to_midi("C2"),  [note_to_midi(n) for n in ("C4", "F4", "G4", "Bb4", "D5")]),
        "C13sus": (note_to_midi("C2"),  [note_to_midi(n) for n in ("C4", "E4", "G4", "Bb4", "D5")]),
    }

    # Voicing dictionary (F Major / D minor — transposed +2 semitones!)
    V_F = {
        "Bbmaj7": (note_to_midi("Bb1"), [note_to_midi(n) for n in ("Bb3", "D4", "F4", "A4", "C5")]),
        "C7":     (note_to_midi("C2"),  [note_to_midi(n) for n in ("C4", "E4", "G4", "Bb4", "D5")]),
        "C13":    (note_to_midi("C2"),  [note_to_midi(n) for n in ("C4", "E4", "A4", "Bb4", "D5")]),
        "C9sus4": (note_to_midi("C2"),  [note_to_midi(n) for n in ("C4", "F4", "G4", "Bb4", "D5")]),
        "Am7":    (note_to_midi("A1"),  [note_to_midi(n) for n in ("A3", "C4", "E4", "G4", "B4")]),
        "Dm9":    (note_to_midi("D2"),  [note_to_midi(n) for n in ("D4", "E4", "F4", "A4", "C5")]),
        "Gm9":    (note_to_midi("G1"),  [note_to_midi(n) for n in ("G3", "Bb3", "D4", "F4", "A4")]),
        "Fmaj9":  (note_to_midi("F1"),  [note_to_midi(n) for n in ("F3", "A3", "C4", "E4", "G4")]),
        "C/E":    (note_to_midi("E1"),  [note_to_midi(n) for n in ("E3", "G3", "C4", "D4", "G4")]),
        "A7#5":   (note_to_midi("A1"),  [note_to_midi(n) for n in ("A3", "C#4", "F4", "G4", "C5")]),
    }

    plan = [
        # Act 1: Prologue (Bars 0-7)
        ("Abmaj7", "prologue"), ("Bb6", "prologue"), ("Cm9", "prologue"), ("Eb/G", "prologue"),
        ("Abmaj7", "prologue"), ("Bb6", "prologue"), ("Gm7", "prologue"), ("Cm9", "prologue"),
        # Act 2A: Verse 1 Groove Intro (Bars 8-11)
        ("Abmaj7", "verse_a"), ("Bb6", "verse_a"), ("Cm9", "verse_a"), ("Eb/G", "verse_a"),
        # Act 2B: Verse 1 Melody (Bars 12-19)
        ("Abmaj7", "verse_b"), ("Bb6", "verse_b"), ("Cm9", "verse_b"), ("Eb/G", "verse_b"),
        ("Fm9", "verse_b"), ("Gm7", "verse_b"), ("Abmaj7", "verse_b"), ("Bb11", "verse_b"),
        # Act 3: Pre-Chorus Build-Up (Bars 20-27)
        ("Fm9", "buildup"), ("Gm7", "buildup"), ("Abmaj7", "buildup"), ("Bb6", "buildup"),
        ("Cm9", "buildup"), ("Eb/G", "buildup"), ("Abmaj7", "buildup"), ("Bb11", "buildup"),
        # Act 4A: Drop 1 Half-Time Future Bass (Bars 28-35)
        ("Abmaj7", "drop1_a"), ("Bb7", "drop1_a"), ("Gm7", "drop1_a"), ("Cm9", "drop1_a"),
        ("Fm9", "drop1_a"), ("Bb13", "drop1_a"), ("Ebmaj9", "drop1_a"), ("G7#5", "drop1_a"),
        # Act 4B: Drop 1B 4-on-the-Floor Surge (Bars 36-43)
        ("Abmaj7", "drop1_b"), ("Bb7", "drop1_b"), ("Gm7", "drop1_b"), ("Cm9", "drop1_b"),
        ("Fm9", "drop1_b"), ("Gm7", "drop1_b"), ("Abmaj7", "drop1_b"), ("Bb11", "drop1_b"),
        # Act 5: Breakdown / Bridge "Zero Gravity" (Bars 44-55)
        ("Cm9", "bridge"), ("Abmaj7", "bridge"), ("Ebmaj9", "bridge"), ("Bb/D", "bridge"),
        ("Fm9", "bridge"), ("Cm9", "bridge"), ("Abmaj7", "bridge"), ("G7", "bridge"),
        ("Abmaj7", "bridge_build"), ("Bb6", "bridge_build"), ("C9sus4", "bridge_build"), ("C13sus", "bridge_build"),
        # Act 6A: Final Climax Drop 2 in F MAJOR! (Bars 56-63)
        ("Bbmaj7", "drop2_a"), ("C7", "drop2_a"), ("Am7", "drop2_a"), ("Dm9", "drop2_a"),
        ("Gm9", "drop2_a"), ("C13", "drop2_a"), ("Fmaj9", "drop2_a"), ("A7#5", "drop2_a"),
        # Act 6B: Final Climax Counterpoint Surge (Bars 64-71)
        ("Bbmaj7", "drop2_b"), ("C7", "drop2_b"), ("Am7", "drop2_b"), ("Dm9", "drop2_b"),
        ("Gm9", "drop2_b"), ("Am7", "drop2_b"), ("Bbmaj7", "drop2_b"), ("C13", "drop2_b"),
        # Act 7: Outro "First Light (Dawn)" in F Major (Bars 72-79)
        ("Fmaj9", "outro"), ("C/E", "outro"), ("Dm9", "outro"), ("Bbmaj7", "outro"),
        ("Gm9", "outro"), ("C9sus4", "outro"), ("Fmaj9", "outro"), ("Fmaj9", "outro"),
    ]
    assert len(plan) == TOTAL_BARS
    result = []
    for bar, (cname, sec) in enumerate(plan):
        table = V_EB if bar < 56 else V_F
        bass_m, voicing = table[cname]
        result.append((bar, cname, bass_m, voicing, sec))
    return result


def build_melody_notes():
    """
    Compose expressive, memorable melodies across all acts!
    Returns dict of note lists: (start_beat, dur_beats, midi, velocity)
    """
    def add_phrase(target, start_bar, events, transpose=0):
        b0 = start_bar * 4.0
        for rel_b, dur_b, nstr, vel in events:
            target.append((b0 + rel_b, dur_b, note_to_midi(nstr) + transpose, vel))

    # --- 1. OPENING & OUTRO MUSIC BOX MOTIF ---
    mbox = []
    # Bars 0-7 (Prologue — delicate, aching, sparkling)
    prologue_motif = [
        # Bar 0 (Abmaj7)
        (0.0, 1.0, "G5", 0.72), (1.0, 0.5, "Eb5", 0.62), (1.5, 1.0, "C5", 0.66), (2.5, 1.5, "G5", 0.76),
        # Bar 1 (Bb6)
        (4.0, 1.0, "F5", 0.70), (5.0, 0.5, "D5", 0.62), (5.5, 1.0, "G5", 0.74), (6.5, 1.5, "F5", 0.66),
        # Bar 2 (Cm9)
        (8.0, 1.0, "Eb5", 0.72), (9.0, 0.5, "D5", 0.62), (9.5, 1.0, "C5", 0.68), (10.5, 0.75, "G5", 0.78), (11.25, 0.75, "Bb5", 0.80),
        # Bar 3 (Eb/G)
        (12.0, 2.0, "G5", 0.72), (14.0, 1.0, "F5", 0.64), (15.0, 1.0, "Eb5", 0.62),
        # Bar 4 (Abmaj7)
        (16.0, 1.0, "G5", 0.76), (17.0, 0.5, "Ab5", 0.70), (17.5, 1.0, "Bb5", 0.80), (18.5, 1.5, "C6", 0.85),
        # Bar 5 (Bb6)
        (20.0, 1.0, "Bb5", 0.76), (21.0, 0.5, "G5", 0.68), (21.5, 1.0, "F5", 0.70), (22.5, 1.5, "D5", 0.65),
        # Bar 6 (Gm7)
        (24.0, 1.0, "F5", 0.72), (25.0, 0.5, "G5", 0.70), (25.5, 1.0, "Bb5", 0.76), (26.5, 1.5, "G5", 0.70),
        # Bar 7 (Cm9)
        (28.0, 2.0, "Eb5", 0.74), (30.0, 1.0, "D5", 0.64), (31.0, 1.0, "G5", 0.72),
    ]
    add_phrase(mbox, 0, prologue_motif)

    # Golden silence glass chime right before Drop 1 (Bar 27 beat 3.0) & Drop 2 (Bar 55 beat 3.0)
    add_phrase(mbox, 27, [(2.75, 1.25, "Eb6", 0.92), (3.25, 1.0, "Bb5", 0.80), (3.5, 1.0, "G5", 0.74)])
    add_phrase(mbox, 55, [(2.75, 1.25, "F6", 0.95), (3.25, 1.0, "C6", 0.85), (3.5, 1.0, "A5", 0.78)])

    # Outro Dawn Reprise in F Major (Bars 72-79 — opening motif transformed into peaceful sunrise!)
    outro_motif = [
        # Bar 72 (Fmaj9)
        (0.0, 1.5, "A5", 0.76), (1.5, 0.5, "G5", 0.64), (2.0, 1.0, "F5", 0.68), (3.0, 1.0, "C6", 0.78),
        # Bar 73 (C/E)
        (4.0, 1.5, "G5", 0.72), (5.5, 0.5, "A5", 0.66), (6.0, 2.0, "E5", 0.64),
        # Bar 74 (Dm9)
        (8.0, 1.0, "F5", 0.72), (9.0, 0.5, "E5", 0.62), (9.5, 1.0, "D5", 0.64), (10.5, 1.5, "A5", 0.76),
        # Bar 75 (Bbmaj7)
        (12.0, 1.5, "G5", 0.70), (13.5, 0.5, "F5", 0.64), (14.0, 2.0, "D5", 0.62),
        # Bar 76 (Gm9)
        (16.0, 1.0, "A5", 0.72), (17.0, 0.5, "Bb5", 0.68), (17.5, 1.0, "C6", 0.76), (18.5, 1.5, "A5", 0.68),
        # Bar 77 (C9sus4)
        (20.0, 1.5, "G5", 0.68), (21.5, 0.5, "F5", 0.62), (22.0, 2.0, "G5", 0.65),
        # Bar 78-79 (Fmaj9 — luminous dawn resolution)
        (24.0, 1.5, "C6", 0.74), (25.5, 1.0, "A5", 0.66), (26.5, 1.5, "G5", 0.60),
        (28.0, 4.0, "F5", 0.72), (29.5, 2.5, "C6", 0.52),
    ]
    add_phrase(mbox, 72, outro_motif)

    # --- 2. VERSE 1 LEAD MELODY (Bars 12-19) ---
    lead_verse = []
    verse_phrase = [
        # Bar 12 (Abmaj7)
        (0.0, 0.75, "G5", 0.78), (0.75, 0.25, "F5", 0.70), (1.0, 0.5, "Eb5", 0.74),
        (1.5, 0.5, "C5", 0.68), (2.0, 1.0, "Bb4", 0.72), (3.0, 1.0, "G4", 0.66),
        # Bar 13 (Bb6)
        (4.0, 0.75, "C5", 0.74), (4.75, 0.25, "D5", 0.72), (5.0, 0.5, "Eb5", 0.76),
        (5.5, 0.5, "F5", 0.78), (6.0, 1.5, "G5", 0.84),
        # Bar 14 (Cm9)
        (8.0, 0.75, "Bb5", 0.86), (8.75, 0.25, "G5", 0.76), (9.0, 0.5, "F5", 0.74),
        (9.5, 0.5, "Eb5", 0.72), (10.0, 1.0, "D5", 0.75), (11.0, 0.5, "Eb5", 0.72), (11.5, 0.5, "F5", 0.76),
        # Bar 15 (Eb/G)
        (12.0, 1.5, "G5", 0.84), (13.5, 0.5, "F5", 0.74), (14.0, 1.0, "Eb5", 0.74), (15.0, 0.85, "D5", 0.68),
        # Bar 16 (Fm9)
        (16.0, 0.75, "Eb5", 0.80), (16.75, 0.25, "F5", 0.76), (17.0, 0.5, "G5", 0.82),
        (17.5, 0.5, "Ab5", 0.84), (18.0, 1.0, "G5", 0.82), (19.0, 0.5, "F5", 0.74), (19.5, 0.5, "Eb5", 0.72),
        # Bar 17 (Gm7)
        (20.0, 0.75, "D5", 0.76), (20.75, 0.25, "Eb5", 0.74), (21.0, 0.5, "F5", 0.80),
        (21.5, 0.5, "G5", 0.84), (22.0, 1.6, "Bb5", 0.90),
        # Bar 18 (Abmaj7)
        (24.0, 0.75, "C6", 0.92), (24.75, 0.25, "Bb5", 0.82), (25.0, 0.5, "G5", 0.80),
        (25.5, 0.5, "F5", 0.76), (26.0, 1.0, "Eb5", 0.78), (27.0, 0.5, "F5", 0.78), (27.5, 0.5, "G5", 0.82),
        # Bar 19 (Bb11)
        (28.0, 1.75, "F5", 0.84), (29.75, 0.75, "Eb5", 0.76), (30.5, 1.25, "D5", 0.74),
    ]
    add_phrase(lead_verse, 12, verse_phrase)

    # Pre-Chorus Rising Motif (Bars 20-27)
    buildup_phrase = [
        (0.0, 1.5, "Eb5", 0.78), (1.5, 0.5, "F5", 0.76), (2.0, 2.0, "G5", 0.84),
        (4.0, 1.5, "F5", 0.80), (5.5, 0.5, "G5", 0.82), (6.0, 2.0, "Bb5", 0.88),
        (8.0, 1.0, "G5", 0.84), (9.0, 0.5, "Ab5", 0.82), (9.5, 0.5, "Bb5", 0.88), (10.0, 2.0, "C6", 0.92),
        (12.0, 1.5, "Bb5", 0.86), (13.5, 0.5, "G5", 0.82), (14.0, 1.75, "F5", 0.84),
        (16.0, 1.0, "G5", 0.86), (17.0, 1.0, "Bb5", 0.90), (18.0, 1.0, "C6", 0.94), (19.0, 1.0, "D6", 0.96),
        (20.0, 1.5, "Eb6", 0.98), (21.5, 0.5, "D6", 0.92), (22.0, 2.0, "Bb5", 0.94),
        (24.0, 1.0, "C6", 0.96), (25.0, 1.0, "D6", 0.98), (26.0, 2.0, "Eb6", 1.00),
        (28.0, 2.4, "F6", 1.00),  # Cuts sharply at Bar 27 beat 2.4 for GOLDEN SILENCE!
    ]
    add_phrase(lead_verse, 20, buildup_phrase)

    # --- 3. ANTHEMIC CHORUS / DROP HOOK (Eb Major for Drop 1, +2 transposed to F Major for Drop 2!) ---
    chorus_pass1 = [
        # Bar +0 (Abmaj7 / Bbmaj7)
        (0.0, 0.75, "Eb6", 0.96), (0.75, 0.25, "D6", 0.88), (1.0, 0.5, "C6", 0.92),
        (1.5, 0.5, "Bb5", 0.88), (2.0, 1.0, "G5", 0.90), (3.0, 0.5, "Eb5", 0.84), (3.5, 0.5, "G5", 0.88),
        # Bar +1 (Bb7 / C7)
        (4.0, 0.75, "Bb5", 0.94), (4.75, 0.25, "C6", 0.90), (5.0, 0.5, "D6", 0.96),
        (5.5, 0.5, "C6", 0.90), (6.0, 1.0, "Bb5", 0.92), (7.0, 0.85, "F5", 0.84),
        # Bar +2 (Gm7 / Am7)
        (8.0, 0.75, "D6", 0.96), (8.75, 0.25, "C6", 0.88), (9.0, 0.5, "Bb5", 0.92),
        (9.5, 0.5, "G5", 0.88), (10.0, 1.0, "F5", 0.88), (11.0, 0.5, "G5", 0.88), (11.5, 0.5, "Bb5", 0.92),
        # Bar +3 (Cm9 / Dm9)
        (12.0, 1.5, "C6", 0.96), (13.5, 0.5, "Bb5", 0.88), (14.0, 1.0, "G5", 0.88),
        (15.0, 0.5, "Eb5", 0.84), (15.5, 0.5, "F5", 0.88),
        # Bar +4 (Fm9 / Gm9)
        (16.0, 0.75, "G5", 0.92), (16.75, 0.25, "Ab5", 0.88), (17.0, 0.5, "Bb5", 0.92),
        (17.5, 0.5, "C6", 0.96), (18.0, 1.0, "Eb6", 0.98), (19.0, 0.5, "D6", 0.92), (19.5, 0.5, "C6", 0.90),
        # Bar +5 (Bb13 / C13)
        (20.0, 0.75, "Bb5", 0.92), (20.75, 0.25, "G5", 0.86), (21.0, 0.5, "F5", 0.86),
        (21.5, 0.5, "G5", 0.90), (22.0, 1.5, "D6", 0.96), (23.5, 0.5, "C6", 0.90),
        # Bar +6 (Ebmaj9 / Fmaj9)
        (24.0, 1.5, "Bb5", 0.94), (25.5, 0.5, "G5", 0.86), (26.0, 1.0, "Eb5", 0.86),
        (27.0, 0.5, "F5", 0.86), (27.5, 0.5, "G5", 0.90),
        # Bar +7 (G7#5 / A7#5 — iconic emotional chromatic turnaround!)
        (28.0, 1.0, "B5", 0.94), (29.0, 1.0, "D6", 0.96), (30.0, 1.0, "Eb6", 0.98), (31.0, 0.9, "D6", 0.92),
    ]

    chorus_pass2 = [
        # Bars +0..+3 same iconic hook (reinforcing catchiness!)
        (0.0, 0.75, "Eb6", 0.98), (0.75, 0.25, "D6", 0.90), (1.0, 0.5, "C6", 0.94),
        (1.5, 0.5, "Bb5", 0.90), (2.0, 1.0, "G5", 0.92), (3.0, 0.5, "Eb5", 0.86), (3.5, 0.5, "G5", 0.90),
        (4.0, 0.75, "Bb5", 0.95), (4.75, 0.25, "C6", 0.92), (5.0, 0.5, "D6", 0.98),
        (5.5, 0.5, "C6", 0.92), (6.0, 1.0, "Bb5", 0.94), (7.0, 0.85, "F5", 0.86),
        (8.0, 0.75, "D6", 0.98), (8.75, 0.25, "C6", 0.90), (9.0, 0.5, "Bb5", 0.94),
        (9.5, 0.5, "G5", 0.90), (10.0, 1.0, "F5", 0.90), (11.0, 0.5, "G5", 0.92), (11.5, 0.5, "Bb5", 0.95),
        (12.0, 1.5, "C6", 0.98), (13.5, 0.5, "Bb5", 0.90), (14.0, 1.0, "G5", 0.90),
        (15.0, 0.5, "Eb5", 0.86), (15.5, 0.5, "F5", 0.90),
        # Bars +4..+7 SOARING HIGH CLIMAX!
        (16.0, 0.75, "G5", 0.94), (16.75, 0.25, "Ab5", 0.90), (17.0, 0.5, "Bb5", 0.94),
        (17.5, 0.5, "C6", 0.98), (18.0, 1.0, "Eb6", 1.00), (19.0, 1.0, "F6", 1.00),
        (20.0, 1.5, "G6", 1.00), (21.5, 0.5, "F6", 0.96), (22.0, 1.0, "D6", 0.94), (23.0, 1.0, "Bb5", 0.90),
        (24.0, 1.0, "Eb6", 0.98), (25.0, 0.5, "D6", 0.92), (25.5, 0.5, "C6", 0.94),
        (26.0, 1.0, "Bb5", 0.92), (27.0, 1.0, "G5", 0.88),
        (28.0, 1.0, "F5", 0.88), (29.0, 0.5, "G5", 0.90), (29.5, 0.5, "Bb5", 0.94), (30.0, 2.0, "C6", 0.98),
    ]

    lead_drop1 = []
    add_phrase(lead_drop1, 28, chorus_pass1, transpose=0)
    add_phrase(lead_drop1, 36, chorus_pass2, transpose=0)

    lead_drop2 = []
    # KEY CHANGE +2 SEMITONES (F Major)!!
    add_phrase(lead_drop2, 56, chorus_pass1, transpose=2)
    # Final 4 bars end on radiant triumphant F6 resolution!
    chorus_pass2_finale = chorus_pass2[:-4] + [
        (28.0, 1.0, "G5", 0.94), (29.0, 0.5, "Bb5", 0.96), (29.5, 0.5, "C6", 0.98), (30.0, 2.0, "D6", 1.00),
        (32.0, 3.5, "Eb6", 1.00),  # Transposed +2 => soaring F6 landing cleanly on Bar 72 beat 1!
    ]
    add_phrase(lead_drop2, 64, chorus_pass2_finale, transpose=2)

    # --- 4. BRIDGE SOLO VIOLIN / EMOTIONAL MELODY (Bars 44-55) ---
    lead_bridge = []
    bridge_phrase = [
        # Bar 44 (Cm9) - Bar 47 (Bb/D)
        (0.0, 2.0, "G5", 0.76), (2.0, 1.0, "F5", 0.70), (3.0, 1.0, "Eb5", 0.72),
        (4.0, 1.5, "C5", 0.70), (5.5, 0.5, "Eb5", 0.68), (6.0, 2.0, "G5", 0.76),
        (8.0, 1.5, "Bb5", 0.82), (9.5, 0.5, "G5", 0.74), (10.0, 2.0, "F5", 0.74),
        (12.0, 2.0, "D5", 0.70), (14.0, 1.0, "Eb5", 0.72), (15.0, 1.0, "F5", 0.74),
        # Bar 48 (Fm9) - Bar 51 (G7)
        (16.0, 1.5, "G5", 0.78), (17.5, 0.5, "Ab5", 0.76), (18.0, 2.0, "C6", 0.86),
        (20.0, 1.5, "Bb5", 0.80), (21.5, 0.5, "G5", 0.74), (22.0, 2.0, "Eb5", 0.74),
        (24.0, 1.5, "F5", 0.76), (25.5, 0.5, "G5", 0.78), (26.0, 2.0, "Ab5", 0.82),
        (28.0, 2.0, "G5", 0.80), (30.0, 2.0, "B5", 0.84),
        # Bar 52-55 (Bridge Build & Pivot to F Major!)
        (32.0, 1.5, "C6", 0.88), (33.5, 0.5, "Bb5", 0.84), (34.0, 2.0, "G5", 0.86),
        (36.0, 1.5, "Bb5", 0.90), (37.5, 0.5, "C6", 0.92), (38.0, 2.0, "D6", 0.94),
        (40.0, 1.5, "F6", 0.96), (41.5, 0.5, "E6", 0.92), (42.0, 2.0, "D6", 0.95),
        (44.0, 2.4, "G6", 1.00),  # Cuts for breath silence before Key Change!
    ]
    add_phrase(lead_bridge, 44, bridge_phrase)

    # --- 5. COUNTER-MELODY FOR FINAL CLIMAX (Bars 64-71 — interwoven soaring counterline!) ---
    counter_climax = []
    counter_phrase = [
        (0.0, 1.0, "A5", 0.75), (1.0, 1.0, "F5", 0.72), (2.0, 2.0, "D5", 0.70),
        (4.0, 1.0, "G5", 0.76), (5.0, 1.0, "A5", 0.78), (6.0, 2.0, "E5", 0.72),
        (8.0, 1.0, "E5", 0.74), (9.0, 1.0, "G5", 0.78), (10.0, 2.0, "C6", 0.82),
        (12.0, 2.0, "A5", 0.80), (14.0, 2.0, "F5", 0.74),
        (16.0, 1.0, "Bb5", 0.82), (17.0, 1.0, "C6", 0.84), (18.0, 2.0, "D6", 0.88),
        (20.0, 2.0, "C6", 0.86), (22.0, 2.0, "A5", 0.82),
        (24.0, 1.5, "F5", 0.80), (25.5, 0.5, "G5", 0.82), (26.0, 2.0, "A5", 0.86),
        (28.0, 2.0, "G5", 0.84), (30.0, 2.0, "C6", 0.90),
    ]
    add_phrase(counter_climax, 64, counter_phrase)

    return {
        "mbox": mbox,
        "lead_verse": lead_verse,
        "lead_drop1": lead_drop1,
        "lead_bridge": lead_bridge,
        "lead_drop2": lead_drop2,
        "counter_climax": counter_climax,
    }


# ==============================================================================
# RENDER ALL STEMS, MIX & MASTER
# ==============================================================================
def compose_and_render():
    t_start = time.time()
    print("=== Composing & Synthesizing: ORBITAL RAIN (星降るネオンの夜) ===")
    chords = get_chord_progression()
    melodies = build_melody_notes()

    # Allocate stereo stem buffers
    stems = {
        "kick":   np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "snare":  np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "hats":   np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "bass":   np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "chords": np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "lead":   np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "arp":    np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "piano":  np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "choir":  np.zeros((N_SAMPLES, 2), dtype=np.float64),
        "fx":     np.zeros((N_SAMPLES, 2), dtype=np.float64),
    }

    kick_triggers = []   # (sample_idx, strength) for authentic sidechain pumping!
    snare_triggers = []  # (sample_idx, strength) for visual beat metadata

    # Pre-synthesize reusable drum one-shots
    kick_soft = butter_filter(synth_kick(punch=0.45, sub_tail=0.18), 320.0, btype="low", order=2) * 0.72
    kick_hard = synth_kick(punch=1.15, sub_tail=0.25)
    snare_big = synth_snare(big=True)
    snare_tight = synth_snare(big=False)
    rim_click = synth_rim_click()
    crash_big = synth_crash(2.9, 0.82)

    # --------------------------------------------------------------------------
    # 1. DRUMS & PERCUSSION
    # --------------------------------------------------------------------------
    print("[1/7] Synthesizing drums & percussion...")
    for bar, cname, bass_m, voicing, sec in chords:
        if sec in ("verse_a", "verse_b"):
            # Soft warm 4-on-the-floor pulse
            for b in range(4):
                pos = bar_beat_to_sample(bar, b)
                add_stereo(stems["kick"], kick_soft, pos, 0.85 if b == 0 else 0.72)
                kick_triggers.append((pos, 0.35))
            # Rim clicks on 2 & 4
            for b in (1.0, 3.0):
                pos = bar_beat_to_sample(bar, b)
                add_stereo(stems["snare"], rim_click, pos, 0.90)
                snare_triggers.append((pos, 0.35))
            # Shimmering swung 16th hi-hats starting bar 10
            if bar >= 10:
                for step in range(16):
                    swing = 0.035 if (step % 2 == 1) else 0.0
                    pos = bar_beat_to_sample(bar, step * 0.25 + swing)
                    vel = 0.65 if step % 4 == 2 else (0.38 if step % 2 == 0 else 0.24)
                    is_open = (step == 14 and bar % 2 == 1)
                    add_stereo(stems["hats"], synth_hihat(is_open, vel), pos)

        elif sec == "buildup":
            prog = (bar - 20) / 8.0
            # Heartbeat kick accelerates
            if bar < 24:
                for b in range(4):
                    pos = bar_beat_to_sample(bar, b)
                    add_stereo(stems["kick"], kick_hard, pos, 0.75 + 0.15 * prog)
                    kick_triggers.append((pos, 0.55))
            elif bar < 27:
                for step in range(8):
                    pos = bar_beat_to_sample(bar, step * 0.5)
                    add_stereo(stems["kick"], kick_hard, pos, 0.80)
                    kick_triggers.append((pos, 0.50))
            else:
                # Bar 27: beats 0..2.25 frantic build then SILENCE!
                for step in range(9):
                    pos = bar_beat_to_sample(bar, step * 0.25)
                    add_stereo(stems["kick"], kick_hard, pos, 0.75)
                    kick_triggers.append((pos, 0.45))

            # Accelerating snare roll with upward pitch rise
            if bar < 24:
                steps_per_bar = 4
            elif bar < 26:
                steps_per_bar = 8
            elif bar == 26:
                steps_per_bar = 16
            else:
                steps_per_bar = 20  # Stops at beat 2.5!
            for s in range(steps_per_bar):
                beat_pos = s * (4.0 / steps_per_bar) if bar < 27 else s * 0.125
                if bar == 27 and beat_pos >= 2.5:
                    break
                pos = bar_beat_to_sample(bar, beat_pos)
                pitch = 0.92 + 0.35 * ((bar - 20 + beat_pos / 4.0) / 8.0)
                vel = 0.35 + 0.60 * ((bar - 20 + beat_pos / 4.0) / 8.0)
                add_stereo(stems["snare"], synth_snare(big=False, pitch_mult=pitch), pos, vel)
                snare_triggers.append((pos, vel * 0.6))

        elif sec == "drop1_a":
            # EPIC HALF-TIME FUTURE BASS GROOVE!
            # Kick pattern: beat 0.0, syncopated 1.5 (alt bars), 2.75 (or 3.5 pickup)
            k_beats = [0.0, 1.5, 2.75] if (bar % 2 == 0) else [0.0, 0.75, 2.75, 3.5]
            for kb in k_beats:
                pos = bar_beat_to_sample(bar, kb)
                add_stereo(stems["kick"], kick_hard, pos, 1.0 if kb == 0.0 else 0.88)
                kick_triggers.append((pos, 0.92))
            # Gigantic stadium snare on beat 2.0 (half-time backbeat!)
            spos = bar_beat_to_sample(bar, 2.0)
            add_stereo(stems["snare"], snare_big, spos, 1.0)
            snare_triggers.append((spos, 1.0))
            # Ghost snare pickup on beat 3.75 every 4th bar
            if bar % 4 == 3:
                gpos = bar_beat_to_sample(bar, 3.5)
                add_stereo(stems["snare"], snare_tight, gpos, 0.65)
                snare_triggers.append((gpos, 0.5))
            # Trap/Future-Bass crispy hi-hat groove with occasional 32nd-note sparkle rolls
            for step in range(16):
                pos = bar_beat_to_sample(bar, step * 0.25 + (0.02 if step % 2 else 0.0))
                vel = 0.78 if step % 4 == 0 else (0.58 if step % 2 == 0 else 0.38)
                is_open = (step in (6, 14))
                add_stereo(stems["hats"], synth_hihat(is_open, vel), pos)
            if bar % 2 == 1:
                for r in range(4):
                    pos = bar_beat_to_sample(bar, 3.5 + r * 0.125)
                    add_stereo(stems["hats"], synth_hihat(False, 0.55 + 0.08 * r), pos)

        elif sec in ("drop1_b", "drop2_a", "drop2_b"):
            # DRIVING 4-ON-THE-FLOOR ANTHEMIC J-ELECTRO CLIMAX!
            energy = 1.05 if sec == "drop2_b" else 1.0
            for b in range(4):
                pos = bar_beat_to_sample(bar, b)
                add_stereo(stems["kick"], kick_hard, pos, energy)
                kick_triggers.append((pos, 0.88))
            # Extra syncopated kick pickup every 4th bar
            if bar % 4 == 3:
                pos = bar_beat_to_sample(bar, 3.5)
                add_stereo(stems["kick"], kick_hard, pos, 0.82)
                kick_triggers.append((pos, 0.65))
            # Punchy snares on beats 1 & 3
            for b in (1.0, 3.0):
                pos = bar_beat_to_sample(bar, b)
                add_stereo(stems["snare"], snare_big, pos, 0.92 * energy)
                snare_triggers.append((pos, 0.95))
            # Driving offbeat open hats + energetic 16ths
            for step in range(16):
                pos = bar_beat_to_sample(bar, step * 0.25)
                if step % 4 == 2:
                    add_stereo(stems["hats"], synth_hihat(True, 0.85 * energy), pos)
                else:
                    vel = 0.55 if step % 2 == 0 else 0.35
                    add_stereo(stems["hats"], synth_hihat(False, vel * energy), pos)
            # Epic snare fill at final bar of drop2_b (bar 71)
            if bar == 71:
                for step in range(8):
                    pos = bar_beat_to_sample(bar, 2.0 + step * 0.25)
                    add_stereo(stems["snare"], synth_snare(True, 0.95 + 0.04 * step), pos, 0.72 + 0.04 * step)
                    snare_triggers.append((pos, 0.85))

        elif sec == "bridge_build":
            # Bars 52-55: Orchestral heartbeat build into Key Change!
            if bar < 55:
                step_sz = 1.0 if bar < 54 else 0.5
                n_k = int(4.0 / step_sz)
                for k in range(n_k):
                    pos = bar_beat_to_sample(bar, k * step_sz)
                    add_stereo(stems["kick"], kick_hard, pos, 0.75 + 0.06 * (bar - 52))
                    kick_triggers.append((pos, 0.55))
            else:
                # Bar 55 beats 0..2.25 snare & kick rush -> GOLDEN SILENCE at beat 2.5!
                for k in range(10):
                    pos = bar_beat_to_sample(bar, k * 0.25)
                    add_stereo(stems["kick"], kick_hard, pos, 0.85)
                    add_stereo(stems["snare"], synth_snare(False, 0.95 + 0.04 * k), pos, 0.55 + 0.04 * k)
                    kick_triggers.append((pos, 0.5))
                    snare_triggers.append((pos, 0.7))

        # Crash cymbals at major structural impacts
        if bar in (28, 36, 44, 56, 64, 72):
            add_stereo(stems["hats"], crash_big, bar_beat_to_sample(bar, 0.0), 0.95 if bar >= 56 else 0.80)

    # --------------------------------------------------------------------------
    # 2. BUILD SMOOTH SIDECHAIN DUCKING ENVELOPE FROM KICK TRIGGERS
    # --------------------------------------------------------------------------
    sc_duck = np.zeros(N_SAMPLES, dtype=np.float64)
    sc_len = int(0.24 * SR)
    sc_t = np.arange(sc_len) / SR
    sc_shape = (1.0 - np.exp(-sc_t / 0.004)) * np.exp(-sc_t / 0.072)
    sc_shape /= np.max(sc_shape)
    for pos, strength in kick_triggers:
        end = min(N_SAMPLES, pos + sc_len)
        seg = end - pos
        if seg > 0:
            sc_duck[pos:end] = np.maximum(sc_duck[pos:end], sc_shape[:seg] * strength)

    # --------------------------------------------------------------------------
    # 3. PIANO & MUSIC BOX
    # --------------------------------------------------------------------------
    print("[2/7] Synthesizing felt piano & crystalline music box...")
    # Felt piano rich chord voicings in Prologue, Verse, Bridge, and Outro
    for bar, cname, bass_m, voicing, sec in chords:
        if sec in ("prologue", "bridge", "outro"):
            vel_base = 0.68 if sec == "prologue" else (0.74 if sec == "bridge" else 0.64)
            # Arpeggiated rolled warm chord on beat 0 + bass root octave
            notes_to_play = [bass_m + 12] + voicing
            for idx, m in enumerate(notes_to_play):
                offset = bar_beat_to_sample(bar, idx * 0.045)
                dur = BAR_SEC * (1.05 if bar < 78 else 1.8)
                add_stereo(stems["piano"], synth_felt_piano_note(m, dur, vel_base * RNG.uniform(0.90, 1.05)), offset)
            # Gentle flowing inner 8th-note piano accompaniment in Bridge & Outro
            if sec in ("bridge", "outro") and bar < 78:
                for step_b, note_idx in [(1.5, 1), (2.0, 2), (2.5, 3), (3.0, 2), (3.5, 4 % len(voicing))]:
                    pos = bar_beat_to_sample(bar, step_b)
                    m = voicing[note_idx % len(voicing)]
                    add_stereo(stems["piano"], synth_felt_piano_note(m, BEAT_SEC * 1.4, vel_base * 0.62), pos)
        elif sec in ("verse_a", "verse_b"):
            # Soft warm piano chord hits on beat 0 & 2.5
            for b, vscale in [(0.0, 0.56), (2.5, 0.42)]:
                for idx, m in enumerate(voicing[:4]):
                    pos = bar_beat_to_sample(bar, b + idx * 0.025)
                    add_stereo(stems["piano"], synth_felt_piano_note(m, BEAT_SEC * 2.0, vscale), pos)

    # Crystalline music box melody (Prologue, Pre-Drop Chimes, Dawn Outro)
    for start_b, dur_b, midi, vel in melodies["mbox"]:
        pos = int(round(start_b * BEAT_SEC * SR))
        add_stereo(stems["piano"], synth_music_box_note(midi, dur_b * BEAT_SEC, vel), pos)

    # --------------------------------------------------------------------------
    # 4. BASS (CLEAN MONO SUB + WARM STEREO REESE)
    # --------------------------------------------------------------------------
    print("[3/7] Synthesizing sub-bass & stereo Reese bass...")
    bass_notes = []
    for bar, cname, bass_m, voicing, sec in chords:
        b0 = bar * 4.0
        if sec in ("verse_a", "verse_b"):
            bass_notes.append((b0, 3.85, bass_m, 0.78, 0.15))
        elif sec == "buildup":
            if bar < 27:
                bass_notes.append((b0, 3.85, bass_m, 0.84, 0.35 + 0.06 * (bar - 20)))
            else:
                bass_notes.append((b0, 2.45, bass_m, 0.90, 0.75))
        elif sec == "drop1_a":
            # Half-time Future Bass rhythmic sub-bass with syncopated octave jump!
            bass_notes.append((b0, 1.45, bass_m, 0.96, 0.68))
            bass_notes.append((b0 + 1.5, 1.2, bass_m, 0.90, 0.65))
            bass_notes.append((b0 + 2.75, 1.15, bass_m + (12 if bar % 4 == 3 else 0), 0.92, 0.72))
        elif sec in ("drop1_b", "drop2_a", "drop2_b"):
            grit = 0.85 if sec.startswith("drop2") else 0.72
            bass_notes.append((b0, 1.9, bass_m, 0.98, grit))
            bass_notes.append((b0 + 2.0, 1.45, bass_m, 0.96, grit))
            bass_notes.append((b0 + 3.5, 0.45, bass_m + 12, 0.84, grit * 0.9))
        elif sec == "bridge":
            bass_notes.append((b0, 3.9, bass_m, 0.62, 0.0))
        elif sec == "bridge_build":
            dur = 2.45 if bar == 55 else 3.9
            bass_notes.append((b0, dur, bass_m, 0.84, 0.35 + 0.12 * (bar - 52)))
        elif sec == "outro" and bar <= 77:
            bass_notes.append((b0, 3.9, bass_m, 0.52 * (1.0 - (bar - 72) * 0.12), 0.0))
    stems["bass"] = synth_sub_and_reese_bass(bass_notes)
    # Apply tight sidechain ducking to bass so kick hits with surgical clarity
    stems["bass"] *= (1.0 - 0.72 * sc_duck)[:, None]

    # --------------------------------------------------------------------------
    # 5. MASSIVE SUPERSAW CHORDS + DYNAMIC FILTER AUTOMATION + FUTURE BASS LFO
    # --------------------------------------------------------------------------
    print("[4/7] Synthesizing 7-voice supersaw chords & automated filter sweeps...")
    raw_chords = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    cutoff_curve = np.full(N_SAMPLES, 12000.0, dtype=np.float64)

    for bar, cname, bass_m, voicing, sec in chords:
        s0 = bar_beat_to_sample(bar, 0.0)
        s1 = min(N_SAMPLES, bar_beat_to_sample(bar + 1, 0.0))
        if sec == "buildup":
            dur = BEAT_SEC * (2.45 if bar == 27 else 3.95)
            add_stereo(raw_chords, synth_supersaw_chord(voicing, dur, vel=0.78), s0)
            # Sweeping lowpass filter opening exponentially from 380 Hz -> 11,500 Hz!
            p0 = (bar - 20) / 7.6
            p1 = min(1.0, (bar - 19) / 7.6)
            ramp = np.linspace(p0, p1, s1 - s0)
            cutoff_curve[s0:s1] = 380.0 * ((11500.0 / 380.0) ** (ramp ** 1.15))

        elif sec == "drop1_a":
            # Iconic Future Bass rhythmic supersaw stabs/swells!
            # Pattern: dotted-quarter swell, syncopated hit, snare-aligned bloom
            hits = [(0.0, 1.35, 0.96), (1.5, 0.45, 0.82), (2.0, 1.35, 0.98), (3.5, 0.42, 0.80)]
            for hb, hd, hv in hits:
                hs = bar_beat_to_sample(bar, hb)
                add_stereo(raw_chords, synth_supersaw_chord(voicing, hd * BEAT_SEC, vel=hv, attack_s=0.015, release_s=0.09), hs)
            # Lush Future Bass filter wobble movement synced to beats
            t_bar = np.arange(s1 - s0) / SR
            lfo = 0.5 + 0.5 * np.sin(2.0 * math.pi * (BPM / 60.0) * 0.5 * t_bar - 0.5)
            cutoff_curve[s0:s1] = 2800.0 + 7800.0 * lfo

        elif sec in ("drop1_b", "drop2_a", "drop2_b"):
            vel = 1.02 if sec.startswith("drop2") else 0.94
            # Massive sustained wall + crisp eighth-beat rhythm shimmer
            add_stereo(raw_chords, synth_supersaw_chord(voicing, BAR_SEC * 0.99, vel=vel, attack_s=0.018, release_s=0.10), s0)
            cutoff_curve[s0:s1] = 9500.0 if sec == "drop1_b" else 13500.0

        elif sec == "bridge_build":
            dur = BEAT_SEC * (2.45 if bar == 55 else 3.95)
            add_stereo(raw_chords, synth_supersaw_chord(voicing, dur, vel=0.84), s0)
            p0 = (bar - 52) / 3.6
            p1 = min(1.0, (bar - 51) / 3.6)
            ramp = np.linspace(p0, p1, s1 - s0)
            cutoff_curve[s0:s1] = 450.0 * ((12500.0 / 450.0) ** (ramp ** 1.1))

    stems["chords"] = dynamic_lowpass(raw_chords, cutoff_curve, q=0.95, block_size=256)
    stems["chords"] = butter_filter(stems["chords"], 175.0, btype="high", order=2)
    # Lush heavy Future-Bass sidechain pumping on supersaw chords!
    stems["chords"] *= (1.0 - 0.78 * sc_duck)[:, None]

    # --------------------------------------------------------------------------
    # 6. ORCHESTRAL STRINGS & ETHEREAL FORMANT CHOIR
    # --------------------------------------------------------------------------
    print("[5/7] Synthesizing orchestral strings & ethereal formant choir...")
    for bar, cname, bass_m, voicing, sec in chords:
        s0 = bar_beat_to_sample(bar, 0.0)
        if sec == "prologue" and bar >= 4:
            add_stereo(stems["choir"], synth_warm_strings_chord(voicing, BAR_SEC, vel=0.45, attack_s=0.65, release_s=0.7), s0)
        elif sec == "verse_b" and bar >= 16:
            add_stereo(stems["choir"], synth_warm_strings_chord(voicing, BAR_SEC, vel=0.52, attack_s=0.35, release_s=0.5), s0)
        elif sec == "buildup":
            dur = BEAT_SEC * (2.45 if bar == 27 else 4.0)
            add_stereo(stems["choir"], synth_warm_strings_chord(voicing, dur, vel=0.62, attack_s=0.25, release_s=0.3), s0)
        elif sec in ("drop1_b", "drop2_a", "drop2_b"):
            # Soaring high string ensemble + angel choir supporting the climax!
            high_voicing = [m + 12 for m in voicing[1:]]
            v_str = 0.72 if sec == "drop2_b" else 0.56
            add_stereo(stems["choir"], synth_warm_strings_chord(high_voicing, BAR_SEC, vel=v_str, attack_s=0.18, release_s=0.35), s0)
            if sec.startswith("drop2"):
                vowel = "aah" if (bar % 2 == 0) else "ooh"
                add_stereo(stems["choir"], synth_formant_choir_chord(voicing, BAR_SEC, vel=0.66, vowel=vowel, attack_s=0.2, release_s=0.35), s0)
        elif sec == "bridge":
            # ZERO GRAVITY: Sacred ethereal choir + warm strings!
            vowel = "ooh" if (bar < 48) else "aah"
            add_stereo(stems["choir"], synth_formant_choir_chord(voicing, BAR_SEC, vel=0.82, vowel=vowel, attack_s=0.55, release_s=0.75), s0)
            add_stereo(stems["choir"], synth_warm_strings_chord(voicing, BAR_SEC, vel=0.52, attack_s=0.6, release_s=0.7), s0)
        elif sec == "bridge_build":
            dur = BEAT_SEC * (2.45 if bar == 55 else 4.0)
            add_stereo(stems["choir"], synth_formant_choir_chord(voicing, dur, vel=0.88, vowel="aah", attack_s=0.25, release_s=0.25), s0)
        elif sec == "outro":
            fade_v = max(0.2, 0.72 - (bar - 72) * 0.08)
            dur = BAR_SEC * (1.8 if bar == 79 else 1.0)
            add_stereo(stems["choir"], synth_warm_strings_chord(voicing, dur, vel=fade_v, attack_s=0.5, release_s=1.1), s0)
            if bar <= 76:
                add_stereo(stems["choir"], synth_formant_choir_chord(voicing, BAR_SEC, vel=fade_v * 0.75, vowel="ooh", attack_s=0.5, release_s=0.9), s0)

    stems["choir"] = butter_filter(stems["choir"], 180.0, btype="high", order=2)
    stems["choir"] *= (1.0 - 0.42 * sc_duck)[:, None]

    # --------------------------------------------------------------------------
    # 7. SPARKLING 16TH-NOTE STEREO ARPEGGIOS
    # --------------------------------------------------------------------------
    print("[6/7] Synthesizing sparkling arpeggios, expressive leads & cinematic FX...")
    for bar, cname, bass_m, voicing, sec in chords:
        if sec in ("verse_a", "verse_b", "buildup", "drop1_b", "bridge_build", "drop2_a", "drop2_b"):
            # Build sparkling ascending-descending chord tone pattern
            ext = [m + 12 for m in voicing] + [voicing[0] + 24, voicing[2] + 24]
            pattern = [0, 1, 2, 4, 3, 2, 1, 5, 0, 2, 3, 4, 6, 4, 3, 1]
            vel_scale = {
                "verse_a": 0.48, "verse_b": 0.56, "buildup": 0.72,
                "drop1_b": 0.76, "bridge_build": 0.78, "drop2_a": 0.80, "drop2_b": 0.90,
            }[sec]
            for step in range(16):
                if (bar in (27, 55)) and step >= 10:
                    break  # Respect Golden Silence!
                m = ext[pattern[step] % len(ext)]
                pos = bar_beat_to_sample(bar, step * 0.25)
                pan = math.sin(step * 0.78) * 0.72
                accent = 1.15 if step % 4 == 0 else (0.95 if step % 2 == 0 else 0.78)
                add_stereo(stems["arp"], synth_harp_pluck(m, BEAT_SEC * 0.35, vel_scale * accent, pan), pos)
    stems["arp"] = butter_filter(stems["arp"], 240.0, btype="high", order=2)
    stems["arp"] *= (1.0 - 0.50 * sc_duck)[:, None]

    # --------------------------------------------------------------------------
    # 8. EXPRESSIVE SINGING LEADS & COUNTER-MELODIES
    # --------------------------------------------------------------------------
    stems["lead"] += synth_expressive_lead(melodies["lead_verse"], glide_s=0.048, bright=0.68, octave_double=0.0, vib_depth=0.0055) * 0.82
    stems["lead"] += synth_expressive_lead(melodies["lead_drop1"], glide_s=0.036, bright=1.00, octave_double=0.32, vib_depth=0.0068) * 1.05
    stems["lead"] += synth_expressive_lead(melodies["lead_bridge"], glide_s=0.065, bright=0.58, octave_double=0.0, vib_depth=0.0075) * 0.80
    stems["lead"] += synth_expressive_lead(melodies["lead_drop2"], glide_s=0.034, bright=1.15, octave_double=0.48, vib_depth=0.0072) * 1.14
    # Counterpoint sparkling voice in final climax bars 64-71
    counter_sig = synth_expressive_lead(melodies["counter_climax"], glide_s=0.04, bright=0.85, octave_double=0.25, vib_depth=0.006)
    stems["lead"] += np.stack([counter_sig[:, 0] * 0.55, counter_sig[:, 1] * 0.30], axis=-1) * 0.58

    # Subtle sparkling bell reinforcement on main Chorus Hook downbeats for crisp anime-anthem shine
    for key_lead in ("lead_drop1", "lead_drop2"):
        for start_b, dur_b, midi, vel in melodies[key_lead]:
            if dur_b >= 0.7:
                pos = int(round(start_b * BEAT_SEC * SR))
                add_stereo(stems["arp"], synth_music_box_note(midi, dur_b * BEAT_SEC * 0.7, vel * 0.42), pos)

    # --------------------------------------------------------------------------
    # 9. ATMOSPHERE, RAIN, RISERS & CINEMATIC IMPACTS
    # --------------------------------------------------------------------------
    # Rain atmosphere in Prologue (Bars 0-10) & Dawn Outro (Bars 72-80)
    rain_intro = synth_rain_bed(21.0)
    t_ri = np.arange(rain_intro.shape[0]) / SR
    rain_intro *= (np.clip(t_ri / 1.5, 0.0, 1.0) * np.clip((21.0 - t_ri) / 5.5, 0.0, 1.0))[:, None]
    add_stereo(stems["fx"], rain_intro, 0)

    rain_outro = synth_rain_bed(20.0)
    t_ro = np.arange(rain_outro.shape[0]) / SR
    rain_outro *= (np.clip(t_ro / 3.0, 0.0, 1.0) * np.clip((20.0 - t_ro) / 4.5, 0.0, 1.0))[:, None] * 0.78
    add_stereo(stems["fx"], rain_outro, bar_beat_to_sample(71, 2.0))

    # Risers into Drop 1 (Bars 23..27.5) & Drop 2 Key Change (Bars 52..55.5)
    add_stereo(stems["fx"], synth_riser(BAR_SEC * 4.55, 160.0, 10500.0, note_to_midi("Bb4"), 0.85), bar_beat_to_sample(23, 0.0))
    add_stereo(stems["fx"], synth_riser(BAR_SEC * 3.55, 180.0, 12000.0, note_to_midi("C5"), 0.95), bar_beat_to_sample(52, 0.0))
    # Subtle uplift into Verse 1B & Drop 1B
    add_stereo(stems["fx"], synth_riser(BAR_SEC * 1.9, 250.0, 5500.0, note_to_midi("Eb5"), 0.45), bar_beat_to_sample(10, 0.0))
    add_stereo(stems["fx"], synth_riser(BAR_SEC * 1.9, 260.0, 7000.0, note_to_midi("G5"), 0.55), bar_beat_to_sample(34, 0.0))
    add_stereo(stems["fx"], synth_riser(BAR_SEC * 1.9, 280.0, 8200.0, note_to_midi("A5"), 0.60), bar_beat_to_sample(62, 0.0))

    # Sub-drop cinematic impacts at every major act boundary
    impacts = [
        (8,  "Ab1", 0.55),
        (28, "Ab1", 1.00),
        (36, "Ab1", 0.85),
        (44, "C2",  0.92),
        (56, "Bb1", 1.08),
        (64, "Bb1", 0.90),
        (72, "F1",  0.88),
    ]
    for b_idx, nstr, vel in impacts:
        add_stereo(stems["fx"], synth_sub_impact(note_to_midi(nstr), 2.5, vel), bar_beat_to_sample(b_idx, 0.0))

    # --------------------------------------------------------------------------
    # 10. STUDIO SENDS: SHIMMER HALL REVERB, PLATE REVERB, PING-PONG DELAY
    # --------------------------------------------------------------------------
    print("[7/7] Applying studio convolution shimmer reverb, ping-pong delay & mastering...")
    ir_hall = build_hall_ir(decay_s=2.65, predelay_s=0.022, shimmer=0.16, seed=101)
    ir_plate = build_hall_ir(decay_s=1.25, predelay_s=0.012, shimmer=0.0, seed=202)

    # Ping-pong dotted-8th delay on Lead & Arp
    delay_bus = stems["lead"] * 0.28 + stems["arp"] * 0.26 + stems["piano"] * 0.16
    delay_wet = ping_pong_delay(delay_bus, delay_beats=0.75, feedback=0.34, lp_hz=4200.0)

    # Lush Shimmer Hall Reverb Send (unity-normalized IR => clean musical depth!)
    hall_send = (
        stems["piano"] * 0.56
        + stems["lead"] * 0.48
        + stems["choir"] * 0.62
        + stems["arp"] * 0.42
        + stems["chords"] * 0.34
        + stems["fx"] * 0.35
        + delay_wet * 0.28
    )
    hall_wet = convolve_stereo(hall_send, ir_hall)
    hall_wet = butter_filter(hall_wet, (220.0, 9500.0), btype="band", order=2)
    # Duck reverb slightly on kick hits so drops stay razor-punchy!
    hall_wet *= (1.0 - 0.55 * sc_duck)[:, None]

    # Dramatic Golden-Silence reverb choke right before Drop 1 (bar 27.55..28.0) & Drop 2 (bar 55.55..56.0)!
    # Lets ONLY the crystalline solo glass chime breathe in pure silence before impact!
    for choke_bar in (27, 55):
        cs0 = bar_beat_to_sample(choke_bar, 2.45)
        cs1 = bar_beat_to_sample(choke_bar, 2.72)
        cs2 = bar_beat_to_sample(choke_bar + 1, 0.0)
        if cs1 > cs0 and cs2 > cs1:
            hall_wet[cs0:cs1] *= np.linspace(1.0, 0.08, cs1 - cs0)[:, None]
            hall_wet[cs1:cs2] *= 0.08
            delay_wet[cs0:cs1] *= np.linspace(1.0, 0.05, cs1 - cs0)[:, None]
            delay_wet[cs1:cs2] *= 0.05

    # Crisp Drum Plate Reverb Send (Snare & Hats)
    plate_send = stems["snare"] * 0.36 + stems["hats"] * 0.18
    plate_wet = convolve_stereo(plate_send, ir_plate)
    plate_wet = butter_filter(plate_wet, (320.0, 11000.0), btype="band", order=2)

    # --------------------------------------------------------------------------
    # 11. MIXING & MASTERING CHAIN (PRO RADIO-READY BALANCE & DYNAMICS)
    # --------------------------------------------------------------------------
    # Slight bright air lift on supersaws & hats; silky warm glue on lead
    chords_eq = biquad_shelf(stems["chords"], 5200.0, 3.0, kind="high")
    hats_eq = biquad_shelf(stems["hats"], 8000.0, 3.2, kind="high")
    lead_eq = biquad_peak(stems["lead"], 2800.0, 1.1, 0.8)
    lead_eq = biquad_peak(lead_eq, 950.0, 1.0, 1.2)

    mix = (
        stems["kick"]   * 0.94
        + stems["snare"]  * 0.94
        + hats_eq         * 1.48
        + stems["bass"]   * 0.98
        + chords_eq       * 1.56
        + lead_eq         * 0.82
        + stems["arp"]    * 1.82
        + stems["piano"]  * 1.48
        + stems["choir"]  * 1.78
        + stems["fx"]     * 0.92
        + delay_wet       * 0.52
        + hall_wet        * 0.45
        + plate_wet       * 0.38
    )

    # 1) Sub-bass mono centering below 130 Hz (club/headphone tight low-end!)
    low_band = butter_filter(mix, 130.0, btype="low", order=2)
    hi_band = mix - low_band
    low_mono = 0.5 * (low_band[:, 0] + low_band[:, 1])
    mix = np.stack([low_mono, low_mono], axis=-1) + hi_band

    # 2) Clean sub-sonic DC high-pass at 28 Hz
    mix = butter_filter(mix, 28.0, btype="high", order=2)

    # 3) Musical Mid/Side Mastering EQ (balanced warm low-end, crisp sparkling air, healthy +stereo corr!)
    mid = 0.5 * (mix[:, 0] + mix[:, 1])
    side = 0.5 * (mix[:, 0] - mix[:, 1])
    mid = biquad_peak(mid, 300.0, 1.2, -1.5)
    mid = biquad_shelf(mid, 72.0, 2.2, kind="low")
    mid = biquad_shelf(mid, 8500.0, 2.5, kind="high")
    side = biquad_shelf(side, 7000.0, 3.0, kind="high")
    side = butter_filter(side, 160.0, btype="high", order=2) * 0.95
    mix = np.stack([mid + side, mid - side], axis=-1)

    # 4) Warm analog tape bus saturation + transparent lookahead mastering limiter
    # Calibrate Climax (Drop 2) RMS to ~ -10.5 dBFS while preserving dramatic dynamic arc across acts!
    rms_climax = np.sqrt(np.mean(mix[bar_beat_to_sample(56):bar_beat_to_sample(72)] ** 2)) + 1e-12
    target_climax_rms = 0.285  # ~ -10.9 dBFS climax RMS => ~ -10 LUFS integrated, punchy & dynamic!
    mix *= (target_climax_rms / rms_climax)

    # Subtle harmonic warmth before limiting
    mix = np.tanh(mix * 1.05) / 1.05

    # Transparent lookahead peak limiter targeting -0.55 dBFS ceiling (0.938)
    peak_env = np.max(np.abs(mix), axis=1)
    from scipy.ndimage import maximum_filter1d
    la_peaks = maximum_filter1d(peak_env, size=int(0.004 * SR))
    ceiling = 0.935
    gain_req = np.where(la_peaks > ceiling, ceiling / (la_peaks + 1e-12), 1.0)
    b_sm, a_sm = signal.butter(1, 28.0 / (0.5 * SR), btype="low")
    gain_smooth = np.minimum(gain_req, signal.filtfilt(b_sm, a_sm, gain_req))
    mix *= gain_smooth[:, None]

    # Hard-safe true-peak micro-clipper at -0.45 dBFS (~0.95)
    mix = np.clip(mix, -0.95, 0.95)

    # Clean fade-in (50ms) and smooth outro fade-out (2.5s at end of tail)
    fi = int(0.05 * SR)
    mix[:fi] *= np.linspace(0.0, 1.0, fi)[:, None]
    fo = int(2.5 * SR)
    mix[-fo:] *= (np.linspace(1.0, 0.0, fo) ** 1.5)[:, None]

    # --------------------------------------------------------------------------
    # 12. EXPORT MASTER WAV, STEMS & 60FPS AUDIO-REACTIVE ANALYSIS JSON
    # --------------------------------------------------------------------------
    master_wav = os.path.join(AUDIO_DIR, "orbital_rain_master.wav")
    write_wav_16bit(master_wav, mix)

    # Save stems for inspection/verification
    for name, buf in stems.items():
        write_wav_16bit(os.path.join(STEMS_DIR, f"stem_{name}.wav"), np.clip(buf, -0.98, 0.98))

    # Compute exact 60fps per-stem & 64-band FFT audio-reactive analysis for the GPU MV renderer!
    analysis = compute_mv_analysis(mix, stems, chords)
    analysis_path = os.path.join(AUDIO_DIR, "analysis.json")
    with open(analysis_path, "w") as f:
        json.dump(analysis, f)

    peak_db = 20.0 * math.log10(float(np.max(np.abs(mix))) + 1e-12)
    rms_db = 20.0 * math.log10(float(np.sqrt(np.mean(mix ** 2))) + 1e-12)
    drop_rms_db = 20.0 * math.log10(float(np.sqrt(np.mean(mix[bar_beat_to_sample(56):bar_beat_to_sample(72)] ** 2))) + 1e-12)
    print(f"Done in {time.time() - t_start:.1f}s!")
    print(f"Master WAV: {master_wav}")
    print(f"Stats -> Peak: {peak_db:.2f} dBFS | Integrated RMS: {rms_db:.2f} dBFS | Climax RMS: {drop_rms_db:.2f} dBFS")


def write_wav_16bit(path: str, stereo: np.ndarray):
    clipped = np.clip(stereo, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def compute_mv_analysis(mix: np.ndarray, stems: dict[str, np.ndarray], chords) -> dict:
    """Extract frame-accurate 60fps stem envelopes, beat pulses & 48-band log-spaced FFT spectrum."""
    hop = SR // FPS  # Exact 800 samples per frame!
    n_frames = N_SAMPLES // hop
    win = np.hanning(2048)
    freqs = np.fft.rfftfreq(2048, 1.0 / SR)
    n_bands = 48
    edges = np.geomspace(38.0, 14500.0, n_bands + 1)
    band_masks = []
    for b in range(n_bands):
        idx = np.where((freqs >= edges[b]) & (freqs < edges[b + 1]))[0]
        if len(idx) == 0:
            idx = np.array([int(np.argmin(np.abs(freqs - edges[b])))])
        band_masks.append(idx)

    # Per-stem RMS envelopes smoothed cleanly
    def stem_env(buf: np.ndarray, attack=0.65, release=0.22):
        mono = 0.5 * (buf[:, 0] + buf[:, 1])
        vals = np.zeros(n_frames, dtype=np.float64)
        for i in range(n_frames):
            seg = mono[i * hop:(i + 1) * hop]
            vals[i] = math.sqrt(float(np.mean(seg ** 2)) + 1e-12)
        p98 = float(np.percentile(vals, 98.5)) + 1e-6
        vals = np.clip(vals / p98, 0.0, 1.35)
        out = np.zeros(n_frames, dtype=np.float64)
        cur = 0.0
        for i in range(n_frames):
            alpha = attack if vals[i] > cur else release
            cur = cur + alpha * (vals[i] - cur)
            out[i] = cur
        return np.round(out, 4).tolist()

    spectrum = np.zeros((n_frames, n_bands), dtype=np.float32)
    mix_mono = 0.5 * (mix[:, 0] + mix[:, 1])
    for i in range(n_frames):
        center = i * hop + hop // 2
        s0 = max(0, center - 1024)
        seg = mix_mono[s0:s0 + 2048]
        if len(seg) < 2048:
            seg = np.pad(seg, (0, 2048 - len(seg)))
        mag = np.abs(np.fft.rfft(seg * win)) / 1024.0
        for b, idxs in enumerate(band_masks):
            v = float(np.mean(mag[idxs]))
            # Log-compressed musical display scaling + high-frequency tilt compensation
            tilt = 1.0 + 0.055 * b
            spectrum[i, b] = math.log1p(v * 26.0 * tilt)

    # Normalize & temporally smooth spectrum
    sp_max = float(np.percentile(spectrum, 99.5)) + 1e-6
    spectrum = np.clip(spectrum / sp_max, 0.0, 1.0)
    for i in range(1, n_frames):
        spectrum[i] = np.where(spectrum[i] > spectrum[i - 1],
                               0.65 * spectrum[i] + 0.35 * spectrum[i - 1],
                               0.22 * spectrum[i] + 0.78 * spectrum[i - 1])

    return {
        "fps": FPS,
        "bpm": BPM,
        "total_sec": TOTAL_SEC,
        "n_frames": n_frames,
        "n_bands": n_bands,
        "kick": stem_env(stems["kick"], 0.88, 0.18),
        "snare": stem_env(stems["snare"], 0.90, 0.20),
        "bass": stem_env(stems["bass"], 0.55, 0.16),
        "chords": stem_env(stems["chords"], 0.50, 0.14),
        "lead": stem_env(stems["lead"], 0.65, 0.18),
        "arp": stem_env(stems["arp"], 0.75, 0.24),
        "piano": stem_env(stems["piano"], 0.70, 0.14),
        "choir": stem_env(stems["choir"], 0.35, 0.12),
        "energy": stem_env(mix, 0.45, 0.14),
        "spectrum": np.round(spectrum, 3).tolist(),
    }


if __name__ == "__main__":
    compose_and_render()
