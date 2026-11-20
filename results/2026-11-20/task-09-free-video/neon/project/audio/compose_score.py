"""
compose_score.py — Studio-Grade Procedural Cinematic Soundtrack & Frame-Synced Foley SFX
for "KAIROS — Weaving Light" (44.0 seconds @ 120 BPM = 22 Bars, 48 kHz Stereo).

Synthesizes:
  - Expressive felt piano / celesta (multi-partial inharmonic decay + hammer transient)
  - Glass marimba / crystalline arpeggios with stereo ping-pong delay
  - Warm analog supersaw orchestral synth pads & choir formants with resonant LPF sweeps
  - Deep cello & sub-bass brass swells
  - Cinematic taiko / sub-impact percussion & risers
  - Frame-accurate foley SFX (water-light ripples, shard lock clicks, astrolabe Doppler whooshes,
    supernova IMAX expansion drop)
  - Lush stereo Schroeder/FDN cathedral hall reverb + warm mastering chain (-13.5 LUFS)
"""
import math
import os
import wave
import numpy as np
from scipy.signal import butter, filtfilt, lfilter, sosfilt

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM          # 0.500 s
BAR = BEAT * 4.0           # 2.000 s
DURATION = 44.0            # 22 bars exact
N_SAMPLES = int(SR * DURATION)


def midi_to_hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


# ---------------------------------------------------------------------------
# Filter & DSP Utilities
# ---------------------------------------------------------------------------
def lowpass(x, cutoff_hz, order=3):
    nyq = 0.5 * SR
    wn = np.clip(cutoff_hz / nyq, 0.0005, 0.99)
    sos = butter(order, wn, btype="low", output="sos")
    return sosfilt(sos, x)


def highpass(x, cutoff_hz, order=2):
    nyq = 0.5 * SR
    wn = np.clip(cutoff_hz / nyq, 0.0005, 0.99)
    sos = butter(order, wn, btype="high", output="sos")
    return sosfilt(sos, x)


def bandpass(x, low_hz, high_hz, order=2):
    nyq = 0.5 * SR
    w1 = np.clip(low_hz / nyq, 0.0005, 0.97)
    w2 = np.clip(high_hz / nyq, w1 + 0.001, 0.99)
    sos = butter(order, [w1, w2], btype="band", output="sos")
    return sosfilt(sos, x)


def time_varying_lpf(x, cutoff_env_hz, q=0.75):
    """Fast block-wise state-variable 2-pole resonant low-pass filter."""
    block = 128
    n = len(x)
    y = np.zeros(n, dtype=np.float64)
    low = 0.0
    band = 0.0
    inv_q = 1.0 / max(0.5, q)
    for start in range(0, n, block):
        end = min(n, start + block)
        fc = float(np.clip(cutoff_env_hz[start], 40.0, 16000.0))
        f = 2.0 * math.sin(math.pi * fc / SR)
        f = min(f, 0.85)
        seg = x[start:end]
        out_seg = np.empty_like(seg)
        for i in range(len(seg)):
            low += f * band
            high = seg[i] - low - inv_q * band
            band += f * high
            out_seg[i] = low
        y[start:end] = out_seg
    return y


def stereo_pan(mono, pan: float):
    """Equal-power pan: pan in [-1, 1]."""
    angle = (np.clip(pan, -1.0, 1.0) + 1.0) * 0.25 * math.pi
    return np.stack([mono * math.cos(angle), mono * math.sin(angle)], axis=1)


def add_stereo(buf, sig, start_sec: float, gain: float = 1.0):
    i0 = int(round(start_sec * SR))
    if i0 >= len(buf) or i0 + len(sig) <= 0:
        return
    s0 = max(0, -i0)
    d0 = max(0, i0)
    length = min(len(sig) - s0, len(buf) - d0)
    if length > 0:
        buf[d0 : d0 + length] += sig[s0 : s0 + length] * gain


def ping_pong_delay(stereo, delay_sec=0.375, feedback=0.42, mix=0.28, lp_hz=3200.0):
    """Dotted-eighth stereo ping-pong delay."""
    d = int(round(delay_sec * SR))
    n = len(stereo)
    wet = np.zeros_like(stereo)
    buf_l = stereo[:, 0].copy()
    buf_r = stereo[:, 1].copy()
    # 6 echo taps for zero-loop-overhead silky ping-pong
    cur_l = lowpass(buf_l, lp_hz, 2)
    cur_r = lowpass(buf_r, lp_hz, 2)
    g = feedback
    for tap in range(1, 7):
        shift = tap * d
        if shift >= n:
            break
        if tap % 2 == 1:
            wet[shift:, 0] += cur_r[:-shift] * g
            wet[shift:, 1] += cur_l[:-shift] * g
        else:
            wet[shift:, 0] += cur_l[:-shift] * g
            wet[shift:, 1] += cur_r[:-shift] * g
        g *= feedback * 0.88
    return stereo * (1.0 - mix * 0.35) + wet * mix


def cathedral_reverb(stereo, rt60=3.4, wet_mix=0.32, predelay_ms=26.0):
    """Lush algorithmic stereo cathedral hall reverb via shaped filtered noise convolution IR."""
    ir_len = int(SR * min(4.8, rt60 * 1.35))
    rng = np.random.default_rng(20261120)
    t = np.arange(ir_len) / SR
    decay = np.exp(-6.9077 * t / rt60)
    # Frequency-dependent damping (highs decay faster like real stone hall)
    decay_hi = np.exp(-6.9077 * t / (rt60 * 0.45))

    ir = np.zeros((ir_len, 2), dtype=np.float64)
    pre = int(SR * predelay_ms / 1000.0)
    for ch in range(2):
        n_lo = lowpass(rng.standard_normal(ir_len), 1600.0, 2) * decay
        n_hi = bandpass(rng.standard_normal(ir_len), 1600.0, 7500.0, 2) * decay_hi * 0.55
        tail = n_lo + n_hi
        # Smooth attack envelope on IR tail
        att = int(SR * 0.045)
        tail[:att] *= np.linspace(0.0, 1.0, att) ** 1.5
        # Early reflections
        er_times = [0.011, 0.019, 0.029, 0.041, 0.057] if ch == 0 else [0.014, 0.023, 0.034, 0.046, 0.063]
        for idx, et in enumerate(er_times):
            pos = int(et * SR)
            if pos < ir_len:
                tail[pos] += (0.35 * (0.75 ** idx)) * (1 if idx % 2 == 0 else -1)
        ir[pre:, ch] = tail[: ir_len - pre]

    # Normalize IR energy
    rms = np.sqrt(np.mean(ir ** 2))
    ir /= max(rms * 24.0, 1e-6)

    # Fast FFT convolution
    n_out = len(stereo)
    fft_n = 1 << (n_out + ir_len - 1).bit_length()
    wet = np.zeros_like(stereo)
    for ch in range(2):
        S = np.fft.rfft(stereo[:, ch], fft_n)
        H = np.fft.rfft(ir[:, ch], fft_n)
        wet[:, ch] = np.fft.irfft(S * H, fft_n)[:n_out]
    wet = highpass(wet, 110.0, 2)
    return stereo * (1.0 - wet_mix * 0.35) + wet * wet_mix


# ---------------------------------------------------------------------------
# Instrument Synthesizers
# ---------------------------------------------------------------------------
def synth_felt_piano(midi_note: float, dur: float, vel: float = 0.8, brightness: float = 1.0):
    """Warm Olafur-Arnalds-style felt piano with subtle inharmonicity & soft hammer thump."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi_note)
    sig = np.zeros(n, dtype=np.float64)

    # Slightly detuned unison strings + warm partials
    B = 0.00018  # piano string stiffness inharmonicity
    partials = [
        (1, 1.00, 1.00),
        (2, 0.42 * brightness, 1.35),
        (3, 0.22 * brightness, 1.85),
        (4, 0.11 * brightness, 2.50),
        (5, 0.05 * brightness, 3.30),
        (6, 0.025 * brightness, 4.20),
    ]
    base_tau = max(1.1, 3.8 - (midi_note - 48) * 0.045)
    for k, amp, d_mul in partials:
        fk = f0 * k * math.sqrt(1.0 + B * k * k)
        if fk > 11000:
            continue
        env = np.exp(-t / (base_tau / d_mul))
        # Subtle 2-string chorus beating
        w = 0.55 * np.sin(2 * math.pi * fk * t) + 0.45 * np.sin(2 * math.pi * (fk * 1.0007) * t + 0.4)
        sig += amp * env * w

    # Soft felt hammer transient (filtered noise thump)
    rng = np.random.default_rng(int(midi_note * 137 + dur * 100))
    thump_n = min(n, int(SR * 0.045))
    thump = lowpass(rng.standard_normal(thump_n), 450.0 * brightness, 2)
    thump *= np.exp(-np.arange(thump_n) / (SR * 0.009)) * 0.18
    sig[:thump_n] += thump

    # Soft attack + release
    att = min(n, int(SR * 0.014))
    sig[:att] *= np.linspace(0.0, 1.0, att) ** 1.4
    rel = min(n, int(SR * 0.18))
    sig[-rel:] *= np.linspace(1.0, 0.0, rel) ** 1.5
    return sig * vel * 0.26


def synth_crystal_bell(midi_note: float, dur: float, vel: float = 0.7):
    """Shimmering celesta / crystalline glass marimba."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi_note)
    sig = np.zeros(n, dtype=np.float64)
    # Glass/celesta modal ratios
    modes = [(1.0, 1.0, 1.2), (2.0, 0.35, 1.9), (3.005, 0.18, 2.8), (4.76, 0.07, 4.5)]
    for ratio, amp, decay_rate in modes:
        f = f0 * ratio
        if f > 14000:
            continue
        sig += amp * np.sin(2 * math.pi * f * t) * np.exp(-t * decay_rate * (1.2 / max(0.4, dur * 0.5)))
    att = min(n, int(SR * 0.004))
    sig[:att] *= np.linspace(0.0, 1.0, att)
    rel = min(n, int(SR * 0.08))
    sig[-rel:] *= np.linspace(1.0, 0.0, rel)
    return sig * vel * 0.17


def synth_supersaw_pad(midi_notes, dur: float, cutoff_start=500.0, cutoff_end=3400.0, vel=0.65, chorus=True):
    """Lush wide stereo analog orchestral synth pad with moving resonant low-pass filter."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    left = np.zeros(n, dtype=np.float64)
    right = np.zeros(n, dtype=np.float64)

    detunes = [-0.011, -0.0055, -0.002, 0.0, 0.0022, 0.0058, 0.0115]
    pans = [-0.85, -0.55, -0.25, 0.0, 0.25, 0.55, 0.85]

    for note in midi_notes:
        f0 = midi_to_hz(note)
        for dt_ratio, p in zip(detunes, pans):
            f = f0 * (1.0 + dt_ratio)
            # Slow organic vibrato
            vib = 1.0 + 0.0018 * np.sin(2 * math.pi * (4.6 + p * 0.4) * t)
            phase = np.cumsum(f * vib / SR)
            # Band-limited warm saw (sum of first 12 harmonics to avoid aliasing!)
            w = np.zeros(n, dtype=np.float64)
            max_h = min(14, int(11000.0 / max(f, 30.0)))
            for h in range(1, max_h + 1):
                w += ((-1.0) ** (h + 1)) * (1.0 / h) * np.sin(2 * math.pi * h * phase)
            angle = (p + 1.0) * 0.25 * math.pi
            left += w * math.cos(angle)
            right += w * math.sin(angle)

    norm = 1.0 / (len(midi_notes) * len(detunes) * 0.7)
    left *= norm
    right *= norm

    # Filter sweep envelope
    cut_env = np.linspace(cutoff_start, cutoff_end, n)
    left = time_varying_lpf(left, cut_env, q=1.15)
    right = time_varying_lpf(right, cut_env, q=1.15)

    # Smooth pad envelope
    env = np.ones(n, dtype=np.float64)
    att = min(n // 2, int(SR * min(0.9, dur * 0.28)))
    rel = min(n // 2, int(SR * min(1.1, dur * 0.30)))
    env[:att] = np.sin(np.linspace(0, math.pi / 2, att)) ** 1.4
    env[-rel:] = np.cos(np.linspace(0, math.pi / 2, rel)) ** 1.4

    out = np.stack([left * env, right * env], axis=1)
    return out * vel * 0.34


def synth_sub_brass_bass(midi_note: float, dur: float, vel: float = 0.8, grit: float = 0.35):
    """Deep Hans-Zimmer-style warm sub + brassy low-end foundation (mono-centered <120Hz)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi_note)
    # Clean sub sine + octave saw with warm LPF
    sub = np.sin(2 * math.pi * f0 * t)
    brass = np.zeros(n, dtype=np.float64)
    for h in range(1, 9):
        brass += (1.0 / (h ** 1.05)) * np.sin(2 * math.pi * (f0 * h) * t)
    brass = lowpass(brass, 220.0 + grit * 520.0, 3)

    env = np.ones(n)
    att = min(n // 3, int(SR * 0.08))
    rel = min(n // 3, int(SR * 0.25))
    env[:att] = np.linspace(0, 1, att) ** 1.2
    env[-rel:] = np.linspace(1, 0, rel) ** 1.5

    mono = (sub * 0.65 + brass * 0.55) * env * vel * 0.34
    return np.stack([mono, mono], axis=1)


def synth_ostinato_string(midi_note: float, dur: float, vel: float = 0.65):
    """Crisp bowed spiccato cinematic string ostinato hit."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi_note)
    sig = np.zeros(n, dtype=np.float64)
    for h in range(1, 10):
        if f0 * h < 9000:
            sig += (1.0 / (h ** 0.9)) * np.sin(2 * math.pi * f0 * h * t)
    sig = lowpass(sig, 2600.0, 2)
    env = np.exp(-t / max(0.06, dur * 0.42))
    att = min(n, int(SR * 0.012))
    env[:att] *= np.linspace(0, 1, att)
    return sig * env * vel * 0.20


# ---------------------------------------------------------------------------
# Cinematic Percussion & Frame-Synced Sound Design (SFX)
# ---------------------------------------------------------------------------
def sfx_sub_impact(dur=2.6, vel=1.0, start_hz=92.0, end_hz=30.0):
    """Theater-grade sub-bass cinema impact (BRAAAM/BOOM)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = end_hz + (start_hz - end_hz) * np.exp(-t * 14.0)
    phase = np.cumsum(2 * math.pi * freq / SR)
    boom = np.sin(phase) * np.exp(-t * 1.45)

    # Punchy mid-low transient crack
    rng = np.random.default_rng(77)
    noise = bandpass(rng.standard_normal(n), 80.0, 950.0, 2) * np.exp(-t * 11.0) * 0.55
    hi_shimmer = bandpass(rng.standard_normal(n), 1800.0, 6500.0, 2) * np.exp(-t * 4.0) * 0.14

    mono = np.tanh((boom * 1.15 + noise) * 1.3) * 0.72
    stereo = np.stack([mono + hi_shimmer, mono - hi_shimmer * 0.85], axis=1)
    att = int(SR * 0.004)
    stereo[:att] *= np.linspace(0, 1, att)[:, None]
    return stereo * vel * 0.65


def sfx_taiko_hit(vel=0.85, pitch_hz=68.0, accent=False):
    """Deep cinematic taiko / orchestral floor-tom strike."""
    dur = 0.75 if accent else 0.45
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = pitch_hz + (pitch_hz * 1.3) * np.exp(-t * 34.0)
    body = np.sin(np.cumsum(2 * math.pi * freq / SR)) * np.exp(-t * (4.2 if accent else 6.8))
    rng = np.random.default_rng(int(pitch_hz * 10))
    skin = bandpass(rng.standard_normal(n), 140.0, 1600.0, 2) * np.exp(-t * 24.0) * (0.55 if accent else 0.35)
    sig = np.tanh((body + skin) * 1.4) * vel * (0.48 if accent else 0.32)
    return stereo_pan(sig, 0.0 if accent else (0.18 if int(pitch_hz) % 2 else -0.18))


def sfx_crystal_click(vel=0.35, pan=0.0, pitch=2400.0):
    """Precision metallic-crystal lock-in micro-click for Act II shards."""
    dur = 0.09
    n = int(SR * dur)
    t = np.arange(n) / SR
    ping = (
        np.sin(2 * math.pi * pitch * t) * np.exp(-t * 65.0)
        + 0.45 * np.sin(2 * math.pi * pitch * 1.618 * t) * np.exp(-t * 85.0)
    )
    return stereo_pan(ping * vel * 0.25, pan)


def sfx_whoosh(dur=1.6, pan_start=-0.85, pan_end=0.85, vel=0.55, f_peak=2200.0):
    """Stereo Doppler cinematic pass-by whoosh (ring fly-through / camera whip)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(int(f_peak + dur * 100))
    noise = rng.standard_normal(n)
    bell = np.sin(math.pi * t / dur) ** 2.2
    cut_env = 180.0 + (f_peak - 180.0) * bell
    filtered = time_varying_lpf(highpass(noise, 90.0, 2), cut_env, q=2.0) * bell
    # Add subtle tonal resonant sweep
    tone_f = 120.0 + 260.0 * bell
    tone = np.sin(np.cumsum(2 * math.pi * tone_f / SR)) * bell * 0.15
    mono = (filtered * 0.45 + tone) * vel
    pan_env = np.linspace(pan_start, pan_end, n)
    angle = (pan_env + 1.0) * 0.25 * math.pi
    return np.stack([mono * np.cos(angle), mono * np.sin(angle)], axis=1)


def sfx_riser(dur=3.8, vel=0.65):
    """Epic rising tension swell + harmonic shimmer leading into a musical drop."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    p = (t / dur) ** 2.0
    rng = np.random.default_rng(909)
    noise = rng.standard_normal(n)
    cut = 250.0 + 7200.0 * p
    sw = time_varying_lpf(highpass(noise, 180.0, 2), cut, q=2.8) * (p ** 1.1) * 0.40

    # Rising fifth shimmer tones (A4 -> D5 -> A5)
    shimmer = np.zeros(n)
    for f_start, f_end, g in [(220.0, 440.0, 0.25), (330.0, 660.0, 0.18), (440.0, 880.0, 0.14)]:
        f_inst = f_start * ((f_end / f_start) ** p)
        shimmer += g * np.sin(np.cumsum(2 * math.pi * f_inst / SR))
    shimmer *= p ** 1.5

    # Clean cut at end for dramatic breath
    fade_out = int(SR * 0.03)
    env = np.ones(n)
    env[-fade_out:] = np.linspace(1.0, 0.0, fade_out)
    left = (sw + shimmer * 0.85) * env * vel * 0.55
    right = (sw * 0.92 + shimmer * 1.05) * env * vel * 0.55
    return np.stack([left, right], axis=1)


def sfx_shimmer_wash(dur=4.2, vel=0.50):
    """Airy ethereal cymbal / aurora crystalline wash on transition."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(404)
    l_noise = bandpass(rng.standard_normal(n), 2800.0, 11500.0, 2)
    r_noise = bandpass(rng.standard_normal(n), 2800.0, 11500.0, 2)
    env = np.exp(-t * 0.95) * np.minimum(1.0, t / 0.08)
    # Add high D-major crystalline resonance
    chord = sum(np.sin(2 * math.pi * midi_to_hz(m) * t) for m in [74, 81, 86, 90]) * 0.06
    return np.stack([(l_noise * 0.28 + chord) * env, (r_noise * 0.28 + chord) * env], axis=1) * vel


# ---------------------------------------------------------------------------
# Master Musical Arrangement (22 Bars = 44.0 Seconds @ 120 BPM)
# ---------------------------------------------------------------------------
def build_score():
    dry_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)    # Bass, drums, impacts
    music_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)  # Pads, piano, strings -> reverb
    arp_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)    # Arps -> ping-pong delay -> reverb
    sfx_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)    # Foley & cinematic SFX

    # =========================================================================
    # ACT I (Bars 1-4: 0.0s - 8.0s) — THE VOID & THE SPARK (D minor, sparse, haunting)
    # =========================================================================
    # Deep breathing D1/A1 warm sub-drone
    add_stereo(dry_bus, synth_sub_brass_bass(38, 8.2, vel=0.52, grit=0.05), 0.0)  # D2
    add_stereo(music_bus, synth_supersaw_pad([50, 57, 62, 65], 8.2, cutoff_start=260, cutoff_end=720, vel=0.42), 0.2)

    # Haunting felt-piano motif: D - A - F - E - D
    act1_piano = [
        (0.5, 62, 3.2, 0.72, -0.15),   # D4
        (2.0, 69, 3.0, 0.78, 0.18),    # A4
        (3.5, 77, 2.8, 0.80, 0.25),    # F5
        (4.5, 76, 2.5, 0.74, 0.10),    # E5
        (5.5, 74, 3.0, 0.76, -0.10),   # D5
        (6.5, 69, 2.2, 0.68, -0.22),   # A4
    ]
    for ts, m, d, v, pan in act1_piano:
        add_stereo(music_bus, stereo_pan(synth_felt_piano(m, d, v, brightness=0.85), pan), ts)

    # Crystalline water-ripple pings synced to Act I ripples (2.0s, 4.0s, 6.0s)
    for ts, m, pan in [(2.0, 86, -0.35), (4.0, 81, 0.35), (6.0, 88, -0.20)]:
        add_stereo(arp_bus, stereo_pan(synth_crystal_bell(m, 2.4, vel=0.58), pan), ts)

    # Gentle riser into Act II cut at 8.0s
    add_stereo(sfx_bus, sfx_riser(2.2, vel=0.45), 5.75)

    # =========================================================================
    # ACT II (Bars 5-8: 8.0s - 16.0s) — CRYSTALLIZATION (Dm -> Bbmaj7 -> C -> Dm)
    # =========================================================================
    add_stereo(dry_bus, sfx_sub_impact(2.4, vel=0.82), 8.0)
    add_stereo(sfx_bus, sfx_shimmer_wash(2.8, vel=0.38), 8.0)

    act2_chords = [
        (8.0,  38, [50, 57, 62, 65, 69], 600, 1200),  # Dm9
        (10.0, 34, [46, 53, 58, 62, 69], 750, 1500),  # Bbmaj7
        (12.0, 36, [48, 55, 60, 64, 67], 950, 1900),  # C
        (14.0, 38, [50, 57, 62, 65, 69], 1150, 2400), # Dm
    ]
    for ts, bass_m, chord_m, c0, c1 in act2_chords:
        add_stereo(dry_bus, synth_sub_brass_bass(bass_m, 2.15, vel=0.68, grit=0.22), ts)
        add_stereo(music_bus, synth_supersaw_pad(chord_m, 2.25, cutoff_start=c0, cutoff_end=c1, vel=0.52), ts)

    # Sparkling 8th/16th crystalline arpeggio (geometric assembly feel!)
    arp_patterns = [
        [62, 69, 74, 77, 81, 77, 74, 69],  # Dm
        [58, 65, 70, 74, 81, 74, 70, 65],  # Bbmaj7
        [60, 67, 72, 76, 79, 76, 72, 67],  # C
        [62, 69, 74, 77, 81, 86, 81, 74],  # Dm ascending
    ]
    for bar_i, pat in enumerate(arp_patterns):
        t_bar = 8.0 + bar_i * BAR
        for step in range(8):
            ts = t_bar + step * (BEAT * 0.5)
            m = pat[step]
            pan = -0.55 + (step / 7.0) * 1.1
            add_stereo(arp_bus, stereo_pan(synth_crystal_bell(m, 0.75, vel=0.64 + bar_i * 0.05), pan), ts)
            # Precision mechanical-crystal shard click synced to every 2nd step
            if step % 2 == 0 or bar_i >= 2:
                add_stereo(sfx_bus, sfx_crystal_click(vel=0.30, pan=pan * 0.8, pitch=2200 + step * 240), ts)

    # Piano melody counter-notes
    for ts, m, v in [(8.0, 74, 0.72), (10.0, 77, 0.75), (12.0, 76, 0.76), (13.0, 79, 0.78), (14.0, 81, 0.82)]:
        add_stereo(music_bus, stereo_pan(synth_felt_piano(m, 2.0, v, brightness=1.0), 0.12), ts)

    # Rising build into Act III drop at 16.0s
    add_stereo(sfx_bus, sfx_riser(2.5, vel=0.68), 13.45)

    # =========================================================================
    # ACT III (Bars 9-12: 16.0s - 24.0s) — CELESTIAL ASTROLABE (Momentum & Scale!)
    # =========================================================================
    add_stereo(dry_bus, sfx_sub_impact(2.5, vel=0.95), 16.0)

    act3_chords = [
        (16.0, 38, [50, 57, 62, 65, 69], 1300, 2200),  # Dm
        (18.0, 34, [46, 53, 58, 62, 65], 1500, 2600),  # Bb
        (20.0, 41, [53, 60, 65, 69, 72], 1800, 3200),  # F
        (22.0, 33, [45, 52, 57, 62, 64], 2200, 4800),  # Asus4 -> massive dominant lift!
    ]
    for ts, bass_m, chord_m, c0, c1 in act3_chords:
        add_stereo(dry_bus, synth_sub_brass_bass(bass_m, 2.08, vel=0.84, grit=0.48), ts)
        add_stereo(music_bus, synth_supersaw_pad(chord_m, 2.15, cutoff_start=c0, cutoff_end=c1, vel=0.66), ts)

    # Driving spiccato string ostinato (8th notes pulsing with astrolabe gears!)
    ost_roots = [50, 46, 53, 45]
    for bar_i, root in enumerate(ost_roots):
        t_bar = 16.0 + bar_i * BAR
        notes = [root, root + 7, root + 12, root + 7, root, root + 7, root + 12, root + 14]
        for step in range(8):
            ts = t_bar + step * (BEAT * 0.5)
            # Leave dramatic 0.22s breath right before Bar 13 (24.0s) climax!
            if ts >= 23.72:
                continue
            v = 0.78 if step % 4 == 0 else 0.56
            pan = -0.35 if step % 2 == 0 else 0.35
            add_stereo(music_bus, stereo_pan(synth_ostinato_string(notes[step], 0.24, vel=v), pan), ts)
            # High crystalline pulse
            add_stereo(arp_bus, stereo_pan(synth_crystal_bell(notes[step] + 24, 0.45, vel=0.45), -pan), ts)

    # Epic Taiko percussion groove across Bars 9-12
    for bar_i in range(4):
        t_bar = 16.0 + bar_i * BAR
        # Beats: 1 (heavy), 2.5, 3 (medium), 4, 4.5
        hits = [
            (0.00, 0.92, 62.0, True),
            (0.75, 0.58, 86.0, False),
            (1.00, 0.78, 68.0, True),
            (1.50, 0.65, 82.0, False),
            (1.75, 0.62, 92.0, False),
        ]
        if bar_i == 3:
            # Accelerating climactic drum roll before breath-stop!
            hits = [
                (0.00, 0.92, 62.0, True),
                (0.50, 0.76, 72.0, False),
                (0.75, 0.78, 78.0, False),
                (1.00, 0.88, 68.0, True),
                (1.25, 0.82, 82.0, False),
                (1.375, 0.84, 88.0, False),
                (1.50, 0.94, 65.0, True),
            ]
        for off, v, pitch, acc in hits:
            add_stereo(dry_bus, sfx_taiko_hit(vel=v, pitch_hz=pitch, accent=acc), t_bar + off)

    # Stereo Doppler whooshes as camera dives THROUGH the giant golden astrolabe rings!
    add_stereo(sfx_bus, sfx_whoosh(1.4, -0.9, 0.9, vel=0.58, f_peak=2600.0), 18.4)
    add_stereo(sfx_bus, sfx_whoosh(1.3, 0.9, -0.9, vel=0.62, f_peak=3200.0), 20.6)

    # Massive 3.4s Riser into IMAX Expansion Supernova Drop at 24.0s!
    add_stereo(sfx_bus, sfx_riser(3.45, vel=0.92), 20.30)

    # =========================================================================
    # ACT IV (Bars 13-17: 24.0s - 34.0s) — PRISMATIC ASCENSION (CLIMAX IN D MAJOR!)
    # =========================================================================
    add_stereo(dry_bus, sfx_sub_impact(3.2, vel=1.12, start_hz=110.0, end_hz=28.0), 24.0)
    add_stereo(sfx_bus, sfx_shimmer_wash(4.5, vel=0.72), 24.0)

    # Radiant triumphant progression: Dmaj9 -> Gmaj7#11 -> Bm9 -> Aadd9 -> Dmaj9
    act4_chords = [
        (24.0, 38, [50, 57, 62, 66, 69, 76], 3400, 6200),  # Dmaj9 (Euphoric!)
        (26.0, 43, [43, 55, 62, 66, 71, 73], 3600, 6600),  # Gmaj7#11 (Lydian magic!)
        (28.0, 35, [47, 54, 59, 62, 66, 73], 3400, 6400),  # Bm9 (Emotional lift!)
        (30.0, 33, [45, 52, 57, 61, 64, 71], 3600, 7000),  # Aadd9 (Soaring peak!)
        (32.0, 38, [50, 57, 62, 66, 74, 76], 4200, 2600),  # Dmaj9 -> gliding down into Act V!
    ]
    for ts, bass_m, chord_m, c0, c1 in act4_chords:
        add_stereo(dry_bus, synth_sub_brass_bass(bass_m, 2.15, vel=0.95, grit=0.58), ts)
        add_stereo(music_bus, synth_supersaw_pad(chord_m, 2.35, cutoff_start=c0, cutoff_end=c1, vel=0.84), ts)

    # Soaring heroic lead melody (layered piano + crystal bell octave doubling!)
    hero_melody = [
        (24.0, 74, 1.5, 0.90),  # D5
        (25.0, 78, 1.0, 0.88),  # F#5
        (25.5, 81, 1.2, 0.92),  # A5
        (26.0, 83, 1.6, 0.95),  # B5
        (27.0, 81, 1.2, 0.88),  # A5
        (27.5, 78, 1.0, 0.86),  # F#5
        (28.0, 86, 1.8, 0.98),  # D6 (peak!)
        (29.0, 85, 1.2, 0.92),  # C#6
        (29.5, 81, 1.2, 0.88),  # A5
        (30.0, 83, 1.4, 0.94),  # B5
        (31.0, 85, 1.2, 0.96),  # C#6
        (32.0, 86, 2.4, 1.00),  # D6 soaring hold!
    ]
    for ts, m, d, v in hero_melody:
        add_stereo(music_bus, stereo_pan(synth_felt_piano(m, d + 0.5, v, brightness=1.25), -0.08), ts)
        add_stereo(arp_bus, stereo_pan(synth_crystal_bell(m, d + 0.4, vel=v * 0.72), 0.14), ts)

    # Sparkling cascading 16th-note aurora arpeggios across climax
    climax_arps = [
        [62, 66, 69, 74, 78, 81, 86, 81],
        [67, 71, 74, 78, 81, 83, 86, 83],
        [59, 66, 71, 74, 78, 81, 83, 78],
        [61, 64, 69, 73, 76, 81, 85, 81],
        [62, 66, 69, 74, 78, 81, 86, 90],
    ]
    for bar_i, pat in enumerate(climax_arps):
        t_bar = 24.0 + bar_i * BAR
        for step in range(8):
            ts = t_bar + step * (BEAT * 0.5)
            pan = math.sin(step * 0.9 + bar_i) * 0.72
            add_stereo(arp_bus, stereo_pan(synth_crystal_bell(pat[step], 0.85, vel=0.58), pan), ts)

    # Thunderous heroic drums (Bars 13-16, pulling back smoothly on Bar 17)
    for bar_i in range(4):
        t_bar = 24.0 + bar_i * BAR
        for off, v, p, acc in [
            (0.00, 0.96, 58.0, True),
            (0.50, 0.62, 82.0, False),
            (1.00, 0.88, 64.0, True),
            (1.50, 0.72, 78.0, False),
            (1.75, 0.68, 88.0, False),
        ]:
            add_stereo(dry_bus, sfx_taiko_hit(vel=v, pitch_hz=p, accent=acc), t_bar + off)
    # Bar 17 single triumphant downbeat then release
    add_stereo(dry_bus, sfx_taiko_hit(vel=0.88, pitch_hz=58.0, accent=True), 32.0)

    # High-speed monolith pass-by whooshes
    add_stereo(sfx_bus, sfx_whoosh(1.5, -0.8, 0.8, vel=0.45, f_peak=3600.0), 26.2)
    add_stereo(sfx_bus, sfx_whoosh(1.6, 0.8, -0.8, vel=0.45, f_peak=3400.0), 29.8)

    # =========================================================================
    # ACT V (Bars 18-22: 34.0s - 44.0s) — LIVING HORIZON & KAIROS FINALE
    # =========================================================================
    add_stereo(sfx_bus, sfx_shimmer_wash(4.2, vel=0.52), 34.0)

    # Serene warm emotional pads resolving home to Dmaj9
    add_stereo(dry_bus, synth_sub_brass_bass(38, 4.2, vel=0.55, grit=0.06), 34.0)  # D2
    add_stereo(music_bus, synth_supersaw_pad([50, 57, 62, 66, 73], 4.5, cutoff_start=2200, cutoff_end=1100, vel=0.58), 34.0)
    add_stereo(dry_bus, synth_sub_brass_bass(38, 4.5, vel=0.42, grit=0.03), 38.0)
    add_stereo(music_bus, synth_supersaw_pad([50, 57, 62, 66, 69, 76], 5.2, cutoff_start=1250, cutoff_end=420, vel=0.46), 38.0)

    # Opening piano motif reborn in radiant D MAJOR (chills moment!)
    finale_piano = [
        (34.5, 62, 3.4, 0.78, -0.15),  # D4
        (35.5, 69, 3.2, 0.80, 0.12),   # A4
        (36.5, 78, 3.2, 0.84, 0.22),   # F#5 (was F5 in Act I — now Major!)
        (37.5, 76, 3.0, 0.78, 0.08),   # E5
        (38.5, 74, 3.8, 0.80, -0.10),  # D5
        # Final suspended Dadd9 resolution chord right as "K A I R O S" appears!
        (40.0, 50, 3.8, 0.68, -0.18),  # D3
        (40.04, 62, 3.8, 0.72, -0.06), # D4
        (40.08, 69, 3.8, 0.74, 0.08),  # A4
        (40.12, 76, 3.8, 0.74, 0.18),  # E5
        (40.16, 78, 3.8, 0.76, 0.26),  # F#5
    ]
    for ts, m, d, v, pan in finale_piano:
        add_stereo(music_bus, stereo_pan(synth_felt_piano(m, d, v, brightness=0.92), pan), ts)

    # Delicate final crystal sparkle as KAIROS title unveils at 38.5s & 40.2s
    add_stereo(arp_bus, stereo_pan(synth_crystal_bell(86, 3.2, vel=0.52), -0.25), 38.5)
    add_stereo(arp_bus, stereo_pan(synth_crystal_bell(90, 3.4, vel=0.48), 0.25), 40.2)

    # =========================================================================
    # MIXING & MASTERING CHAIN
    # =========================================================================
    print("Applying stereo ping-pong delay & cathedral hall reverb...", flush=True)
    arp_wet = ping_pong_delay(arp_bus, delay_sec=BEAT * 0.75, feedback=0.44, mix=0.38, lp_hz=4200.0)
    reverb_send = music_bus + arp_wet * 0.85 + sfx_bus * 0.45
    reverb_out = cathedral_reverb(reverb_send, rt60=3.4, wet_mix=0.36, predelay_ms=26.0)

    mix = dry_bus + reverb_out + sfx_bus * 0.75

    # Clean sub rumble below 26 Hz
    mix[:, 0] = highpass(mix[:, 0], 26.0, 2)
    mix[:, 1] = highpass(mix[:, 1], 26.0, 2)

    # Gentle stereo width enhancement on highs while keeping sub-bass tight mono
    mid = 0.5 * (mix[:, 0] + mix[:, 1])
    side = 0.5 * (mix[:, 0] - mix[:, 1])
    side = highpass(side, 120.0, 2) * 1.15
    mix = np.stack([mid + side, mid - side], axis=1)

    # Smooth fade-in (0.3s) and organic fade-out to absolute silence (42.5s -> 44.0s)
    fin = int(SR * 0.25)
    fout = int(SR * 1.6)
    mix[:fin] *= np.linspace(0.0, 1.0, fin)[:, None] ** 1.2
    mix[-fout:] *= np.linspace(1.0, 0.0, fout)[:, None] ** 1.8

    # Warm analog soft-clip mastering + peak normalization (-1.0 dBFS)
    rms = np.sqrt(np.mean(mix ** 2))
    target_rms = 0.185  # ~ -14.6 dBFS RMS -> rich cinematic dynamic range!
    mix *= target_rms / max(rms, 1e-6)
    mix = np.tanh(mix * 1.12) / math.tanh(1.12)
    peak = np.max(np.abs(mix))
    if peak > 0.891:
        mix *= 0.891 / peak  # -1.0 dBTP ceiling

    return mix


def save_wav_24bit(path: str, stereo: np.ndarray):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # 24-bit PCM stereo WAV
    clipped = np.clip(stereo, -1.0, 1.0)
    ints = np.round(clipped * 8388607.0).astype(np.int32)
    # Pack 3 little-endian bytes per sample
    flat = ints.reshape(-1)
    raw = np.empty((len(flat), 3), dtype=np.uint8)
    raw[:, 0] = flat & 0xFF
    raw[:, 1] = (flat >> 8) & 0xFF
    raw[:, 2] = (flat >> 16) & 0xFF
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(3)
        wf.setframerate(SR)
        wf.writeframes(raw.tobytes())


if __name__ == "__main__":
    out_wav = "project/audio/kairos_master.wav"
    audio = build_score()
    save_wav_24bit(out_wav, audio)
    rms_db = 20 * math.log10(float(np.sqrt(np.mean(audio ** 2))) + 1e-9)
    peak_db = 20 * math.log10(float(np.max(np.abs(audio))) + 1e-9)
    print(f"Saved mastered 48kHz/24-bit score -> {out_wav} | RMS: {rms_db:.1f} dBFS | Peak: {peak_db:.2f} dBFS")
