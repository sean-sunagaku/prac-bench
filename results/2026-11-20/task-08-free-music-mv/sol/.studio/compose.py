"""Original score and sound design for The Sea Remembers Dawn."""
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

STUDIO = Path(__file__).resolve().parent
RATE = 48000
BPM = 174
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 100
END = 142.5
TAU = 2 * np.pi
FRAMES = round(END * RATE)
RNG = np.random.default_rng(20261120)
BUSES = {name: np.zeros((FRAMES, 2), np.float32) for name in
         ('drums', 'bass', 'bed', 'keys', 'hook', 'air')}
KICK_TIMES = []


@lru_cache(maxsize=100)
def clock(n):
    return np.arange(n, dtype=np.float32) / RATE


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def envelope(t, length, attack, release):
    a = np.minimum(1, t / attack)
    r = np.clip(1 - (t - length) / release, 0, 1)
    return a * a * (3 - 2 * a) * r * r * (3 - 2 * r)


def place(bus, beat, wave, volume=1.0, pan=0.0, offset=0.0):
    start = round((beat * BEAT + offset) * RATE)
    stop = min(start + len(wave), FRAMES)
    if stop <= max(0, start):
        return
    w = wave[max(0, -start):stop - start]
    destination = BUSES[bus][max(start, 0):stop]
    lr = (1 + pan) * np.pi / 4
    if w.ndim == 1:
        destination[:, 0] += w * (volume * np.cos(lr))
        destination[:, 1] += w * (volume * np.sin(lr))
    else:
        destination[:, 0] += w[:, 0] * (volume * np.cos(lr) * np.sqrt(2))
        destination[:, 1] += w[:, 1] * (volume * np.sin(lr) * np.sqrt(2))


@lru_cache(maxsize=64)
def filter_design(mode, low, high):
    return signal.butter(2, (low, high) if high else low, mode, fs=RATE, output='sos')


def filt(w, mode, low, high=0):
    return signal.sosfilt(filter_design(mode, low, high), w).astype(np.float32)


def noise(n):
    return RNG.standard_normal(n, dtype=np.float32)


def piano(note, dur, touch=0.62):
    length = dur * BEAT
    t = clock(round((length + 0.96) * RATE))
    f = hz(note)
    sound = np.zeros_like(t)
    harmonics = (1, .47, .25, .22, .12, .10, .073, .047, .032, .022, .015, .010)
    for k, amp in enumerate(harmonics, start=1):
        freq = f * k * np.sqrt(1 + .00016 * k * k)
        phase = TAU * freq * t
        detune = TAU * freq * (.00095 + note * .000007) * t
        trio = .50 * np.sin(phase) + .27 * np.sin(phase + detune + .22) + .23 * np.sin(phase - detune - .39)
        decay = (.97 + .28 * length) / (1 + .14 * (k - 1))
        sound += amp * (.65 + touch * .35) ** (k - 1) * trio * np.exp(-t / decay)
    hammer = filt(noise(len(t)), 'bandpass', 450, 3200) * np.exp(-t * 61)
    hammer *= .045 + .09 * touch
    return (.72 * sound + hammer) * envelope(t, length, .005, .96)


def struck_glass(note, dur):
    t = clock(round((dur * BEAT + .48) * RATE))
    f = hz(note)
    wave = np.sin(TAU * f * t) + .27 * np.sin(TAU * f * 2.003 * t) * np.exp(-t * 11)
    wave += .11 * np.sin(TAU * f * 3.998 * t) * np.exp(-t * 32)
    wave += .08 * np.sin(TAU * f * 6.221 * t) * np.exp(-t * 49)
    return wave * np.exp(-t * 2.8) * envelope(t, dur * BEAT, .009, .47)


def strings(note, duration, seed, soft=False):
    length = duration * BEAT
    release = .82 if soft else .41
    t = clock(round((length + release) * RATE))
    rng = np.random.default_rng(seed)
    f = hz(note)
    pulse = TAU * (f * t + .22 * np.sin(TAU * rng.uniform(4.7, 5.7) * t + rng.uniform(-2, 2)))
    feather = TAU * f * (.0022 + rng.uniform(0, .0018)) * t
    phase_offset = rng.random(2) * TAU
    wave = np.zeros_like(t)
    tilt = .65 + .35 * (1 - np.exp(-t * 4))
    for h in range(1, 14):
        phase = h * pulse
        waves = .53 * np.sin(phase) + .29 * np.sin(phase + h * feather + phase_offset[0])
        waves += .18 * np.sin(phase - 1.17 * h * feather + phase_offset[1])
        cutoff = np.exp(-((h * f) / (2650 if soft else 4400)) ** 1.4)
        amp = (.80 if h == 1 else 1 / h ** .85) * cutoff
        wave += amp * waves * (tilt if h > 4 else 1)
    return np.tanh(1.02 * wave) * envelope(t, length, .37 if soft else .115, release)


def mouth(note, dur, morph=.5, seed=0):
    length = dur * BEAT
    t = clock(round((length + .52) * RATE))
    f = hz(note)
    rng = np.random.default_rng(seed)
    vibrato = .13 * np.sin(TAU * rng.uniform(4.65, 5.9) * t + rng.uniform(0, TAU))
    glide = (f * .012 * .04) * (1 - np.exp(-t / .04))
    phase = TAU * (f * t - glide) + vibrato * np.minimum(1, t * 3)
    vowels = np.array([[470, 870, 2410], [775, 1210, 2630]], dtype=np.float32)
    width = [125, 165, 300]
    shift = .18 * np.sin(t * 2.3 + rng.uniform(-1, 1))
    a = np.clip(morph + shift, .04, .95)
    formants = vowels[0, :, None] * (1 - a) + vowels[1, :, None] * a
    sound = np.zeros_like(t)
    for h in range(1, 13):
        resonance = .38 * np.exp(-.5 * ((h * f - formants[0]) / width[0]) ** 2)
        resonance += .27 * np.exp(-.5 * ((h * f - formants[1]) / width[1]) ** 2)
        resonance += .08 * np.exp(-.5 * ((h * f - formants[2]) / width[2]) ** 2)
        sound += (resonance + (.39 if h == 1 else .039 / h)) * np.sin(h * phase + .25 * h*h) / h ** .33
    breath = filt(noise(len(t)), 'bandpass', 680, 3900) * .035
    movement = .93 + .07 * np.sin(t * 4.1 + seed)
    return (sound + breath) * movement * envelope(t, length, .112, .52)


def lead(note, dur, lean=0.0):
    length = dur * BEAT
    t = clock(round((length + .19) * RATE))
    f = hz(note)
    bend = f * .015 * .055 * (1 - np.exp(-t / .055))
    vibrato = .145 * np.sin(TAU * 5.38 * t) * (1 - np.exp(-t * 3.6))
    angle = TAU * (f * t - bend) + vibrato
    index = (.15 + .6 * np.exp(-t * 12)) * (1 + lean * .2)
    core = .75 * np.sin(angle + index * np.sin(2 * angle))
    core += .21 * np.sin(2 * angle + .23) + .12 * np.sin(3 * angle)
    color = (.25 + .12 * lean) * np.exp(-t * 5.8)
    core += color * np.sin(4.006 * angle) + .052 * np.sin(6 * angle) * np.exp(-t * 8)
    stereo_phase = TAU * f * .00225 * t + .26
    spread = .28 * np.sin(angle + stereo_phase) + .07 * np.sin(2 * (angle + stereo_phase) + .17)
    spread2 = .28 * np.sin(angle - stereo_phase) + .07 * np.sin(2 * (angle - stereo_phase) - .17)
    amp = (.84 + .16 * np.exp(-t * 5)) * envelope(t, length, .020, .19)
    return np.column_stack([np.tanh((core + spread) * 1.13) * amp,
                            np.tanh((core + spread2) * 1.13) * amp])


def bass(note, dur, energy, phase):
    f = hz(note)
    length = dur * BEAT
    t = clock(round((length + .085) * RATE))
    angle = TAU * f * t
    i = .4 + .38 * energy * (.5 + .5 * np.sin(TAU * t * 2.18 + phase))
    center = .87 * np.sin(angle) + .19 * np.sin(angle * 2 + .34)
    spread = []
    for detune in [-.007, .007]:
        p = angle * 2
        q = p * (1 + detune)
        tone = .44 * np.sin(p + i * np.sin(2 * p)) + .22 * np.sin(q + .30)
        tone += .09 * np.sin(q * 2) + .08 * np.sin(3 * p + .55 * np.sin(p))
        tone += .046 * np.sin(q * 5) + .028 * np.sin(7 * q)
        spread.append(np.tanh(.81 * tone))
    attack = envelope(t, length, .018, .085) * (.77 + .23 * np.exp(-t * 4))
    return np.column_stack([(center * .61 + tone * energy * .64) * attack for tone in spread])


@lru_cache(maxsize=64)
def percussion(voice, variation):
    rng = np.random.default_rng(39 + variation * 71)
    durations = {'kick': .33, 'snare': .38, 'rim': .18, 'hat': .14, 'open': .59,
                 'crash': 2.4, 'tom': .52, 'click': .23, 'pulse': .61}
    t = clock(round(durations[voice] * RATE))
    rnd = rng.standard_normal(len(t), dtype=np.float32)
    if voice == 'kick':
        bend = 50.5 * t + 2.05 * (1 - np.exp(-94 * t))
        body = np.sin(TAU * bend) * np.exp(-t * 14)
        body += .25 * np.sin(TAU * 2 * bend + .29) * np.exp(-t * 42)
        beater = .27 * filt(rnd, 'bandpass', 950, 5600) * np.exp(-72 * t)
        return np.tanh(1.55 * (body + beater)) * np.minimum(1, t * 940)
    if voice in ('snare', 'rim'):
        n = filt(rnd, 'bandpass', 1260, 10600)
        layers = (np.exp(-19 * t) + .33 * np.exp(-((t - .013) / .004)**2)
                  + .22 * np.exp(-((t - .025) / .007)**2))
        p = TAU * ((177 + variation * 2) * t + .18 * (1 - np.exp(-46*t)))
        body = .60 * np.sin(p) * np.exp(-t * 38) + .14 * np.sin(p * 1.67 + .1) * np.exp(-t * 58)
        hit = .58 * n * layers + body
        if voice == 'rim':
            hit = .38 * n * np.exp(-43*t) + .37 * np.sin(p*2.016) * np.exp(-t*71)
        return np.tanh(hit * 1.34) * np.minimum(1, t * 1900)
    if voice == 'tom':
        angle = TAU * ((103 + variation * 13) * t + .75 * (1 - np.exp(-t * 34)))
        s = np.sin(angle) + .30 * np.sin(angle * 1.42) + .13 * np.sin(angle * 2.31)
        return (.74 * s * np.exp(-t * 10) + .12 * rnd * np.exp(-t * 75)) * np.minimum(1, t * 420)
    if voice == 'pulse':
        angle = TAU * (45 * t + .46 * (1 - np.exp(-t * 30)))
        return np.sin(angle) * np.exp(-t*7.2) * np.minimum(1, t*195)
    if voice == 'click':
        return (.5 * np.sin(TAU * (727 + variation * 46) * t) +
                .2 * filt(rnd, 'bandpass', 800, 6700)) * np.exp(-30*t) * np.minimum(1, t*980)
    metallic = filt(rnd, 'bandpass', 5450 if voice != 'crash' else 2950, 16000)
    for i, partial in enumerate([3371, 4841, 7717, 9551, 11921]):
        metallic += .077 * np.sin(TAU * partial * (1+.009*variation) * t + i*.7) * np.exp(-t*(18 + i*5))
    decay = {'hat': 36, 'open': 9.0, 'crash': 2.35}[voice]
    return .77 * metallic * np.exp(-t * decay) * np.minimum(1, t * (690 if voice == 'crash' else 2400))


def hit(voice, beat, volume, variation=0, pan=0., human=0.):
    if voice == 'kick':
        KICK_TIMES.append((beat * BEAT, volume))
    place('drums', beat, percussion(voice, variation % 6), volume, pan, human)


def swell(end, beats, amp, pitch=54, down=False):
    length = beats * BEAT
    t = clock(round(length * RATE))
    q = t / length
    trend = 1 - q if down else q
    mass = trend ** 1.73 * np.minimum(1, (1 - q) * (8 if down else 25)) * np.minimum(1, q * 20)
    left = noise(len(t))
    right = noise(len(t))
    angle = TAU * (hz(pitch) * t * (.72 + .48 * q * q))
    glint = .062 * np.sin(angle) + .025 * np.sin(3.01 * angle) * np.sin(q * 24)**2
    sides = []
    for field in [left, right]:
        fog = filt(field, 'bandpass', 180, 3900) * (.22 - .12 * trend)
        foam = filt(field, 'bandpass', 1520, 13000) * (.07 + trend ** 3 * .23)
        sides.append((fog + foam + glint) * mass)
    place('air', end if down else end - beats, np.column_stack(sides), amp)


# Bass, close harmonic voicing, and the lightest note of each chord.
FMIN = (30, (42, 49, 52, 56, 57, 61, 64), 73)
DMAJ = (38, (45, 50, 54, 57, 61, 64, 68), 69)
A_MAJ = (33, (45, 52, 57, 59, 61, 64, 69), 76)
A_OVER_E = (40, (45, 52, 56, 57, 61, 64, 71), 76)
C_SHARP = (37, (44, 49, 53, 56, 59, 61, 68), 73)
C_SUS = (37, (44, 49, 54, 56, 59, 61, 68), 73)
E_MAJ = (40, (47, 52, 56, 59, 64, 66, 71), 76)
A_OVER_C = (37, (45, 52, 57, 59, 61, 64, 69), 76)
BMIN = (35, (47, 50, 54, 57, 61, 62, 66), 74)
F_MAJOR = (30, (42, 49, 54, 56, 58, 61, 68), 78)

NIGHT = [FMIN, DMAJ, A_OVER_E, C_SHARP, FMIN, DMAJ, E_MAJ, C_SUS]
FIRST_DROP = [FMIN, DMAJ, A_OVER_E, C_SHARP, DMAJ, A_MAJ, E_MAJ, FMIN]
SUBMERGED = [BMIN, BMIN, DMAJ, DMAJ, FMIN, FMIN, C_SUS, C_SHARP,
             BMIN, DMAJ, A_OVER_E, E_MAJ]
DAWN = [DMAJ, E_MAJ, A_OVER_C, FMIN, DMAJ, A_MAJ, E_MAJ, FMIN]
OUT = [DMAJ, E_MAJ, A_MAJ, A_MAJ, DMAJ, C_SUS, F_MAJOR, F_MAJOR]
MAIN = [
    [(0.5, 73, .43), (1, 76, .22), (1.25, 78, 1.24), (2.75, 81, .65), (3.5, 80, .37)],
    [(0, 78, 1.11), (1.25, 76, .56), (2, 73, 1.16), (3.5, 76, .39)],
    [(0, 78, .64), (.75, 85, 1.30), (2.25, 83, .43), (2.75, 81, .53), (3.5, 78, .40)],
    [(0, 77, .91), (1, 73, .68), (2, 71, .43), (2.5, 73, .79)],
    [(0.5, 73, .43), (1, 76, .22), (1.25, 78, 1.24), (2.75, 81, .44), (3.25, 85, .58)],
    [(0, 83, .99), (1.25, 81, .54), (2, 76, .80), (3, 78, .71)],
    [(0, 80, .62), (.75, 83, .63), (1.5, 88, .87), (2.5, 85, .62), (3.25, 83, .61)],
    [(0, 85, .63), (.75, 81, .59), (1.5, 80, .57), (2.25, 78, 1.63)],
]
FIRST_DAWN = [
    [(0, 81, .35), (.5, 73, .44), (1, 76, .22), (1.25, 78, 1.23), (2.75, 81, .68), (3.5, 80, .38)],
    [(0, 78, 1.07), (1.25, 76, .61), (2, 80, 1.16), (3.5, 83, .39)],
    [(0, 81, .65), (.75, 85, 1.28), (2.25, 88, .43), (2.75, 85, .62), (3.5, 83, .39)],
    [(0, 81, .96), (1, 78, .79), (2, 76, .42), (2.5, 78, 1.12)],
] + MAIN[4:]
COUNTER = [
    [(0, 69, 2.45), (3, 68, .75)],
    [(0, 71, 1.5), (1.75, 68, 2)],
    [(0, 64, 2), (2.25, 69, 1.5)],
    [(0, 68, 1.46), (1.65, 73, 2.2)],
    [(0, 69, 1.22), (1.5, 71, .56), (2.25, 73, 1.48)],
    [(0, 76, 2.6), (3, 73, .81)],
    [(0, 71, 1.1), (1.25, 68, 2.4)],
    [(0, 69, 1.45), (2, 66, 1.9)],
]


def chord_for(bar):
    if 28 <= bar < 44:
        return FIRST_DROP[(bar - 28) % 8]
    if 44 <= bar < 56:
        return SUBMERGED[bar - 44]
    if 56 <= bar < 68:
        return DAWN[(bar - 56) % 8] if bar != 67 else C_SUS
    if 68 <= bar < 92:
        return DAWN[(bar - 68) % 8]
    if bar >= 92:
        return OUT[bar - 92]
    return NIGHT[bar % 8]


def section(bar):
    if bar < 8:
        return 'intro'
    if bar < 20:
        return 'verse'
    if bar < 28:
        return 'build'
    if bar < 44:
        return 'drop'
    if bar < 56:
        return 'deep'
    if bar < 68:
        return 'rise'
    if bar < 92:
        return 'dawn'
    return 'coda'


for bar in range(BARS):
    part = section(bar)
    pos = bar * 4
    low, chord, bright = chord_for(bar)
    big = part in ('drop', 'dawn')
    hush = part in ('intro', 'deep', 'coda')
    if bar % 2 == 0 or not hush:
        span = 7.32 if hush and chord_for(min(bar + 1, 99))[0] == low else 3.72
        for i, note in enumerate(chord):
            if span > 4 and bar == 98:
                span = 7.95
            amp = .047 if part == 'intro' else .042
            if part == 'dawn':
                amp = .075
            if part == 'drop':
                amp = .038
            if part == 'deep':
                amp = .035
            if part == 'coda':
                amp = .043 * (1 - max(0, bar - 95) * .09)
            position = (-.54, .58, -.74, .73, -.36, .37, .05)[i]
            place('bed', pos + i*.015, strings(note, span, (bar+7)*17+i, hush), amp,
                  position, offset=float(RNG.uniform(-.020, .020)) if bar else 0)
    if hush:
        if bar % 2 == 0:
            place('keys', pos, piano(low + 12, 4.2, .41), .129, -.18)
            for idx, note in enumerate([chord[3], chord[4], chord[-1]]):
                place('keys', pos + .53 + idx * .45, piano(note, 3.25 - idx * .52, .45), .084, [-.22, .17, .27][idx])
        if part == 'intro':
            motifs = [(1.25, 73, 1.2), (2.5, 76, 1), (3.5, 78, 2.35)] if bar in [0, 4] else []
            if bar in (2, 6):
                motifs = [(0., 81, 1.9), (2.0, 80, .79), (3.0, 76, 1.68)]
        elif part == 'deep':
            motifs = [(1.5, 73, 1.3), (3.0, 76, .8)] if bar % 4 == 0 else []
            if bar % 4 == 1:
                motifs = [(0., 78, 2.35), (2.75, 81, 1.)]
            if bar % 4 == 2:
                motifs = [(0.5, 85, 2.2), (3, 81, .84)]
        else:
            end_notes = {92: [(0.25, 73, .65), (1.25, 76, .67), (2.0, 78, 1.7)],
                         93: [(0, 80, .96), (1.5, 76, 1.8)],
                         94: [(0, 81, 1.05), (1.5, 85, 1.3), (3.25, 83, .68)],
                         95: [(0, 81, 2.55)], 96: [(0, 76, 1.1), (1.5, 73, 2.18)],
                         97: [(1.25, 68, 1.7)], 98: [(0, 66, 2.7), (2.5, 73, 2.8)],
                         99: [(0, 78, 3.8)]}
            motifs = end_notes.get(bar, [])
        for off, note, dur in motifs:
            place('keys', pos+off, piano(note, dur, .56), .23 if bar < 98 else .178, .05)
            place('keys', pos+off, struck_glass(note+12, min(dur, 1.8)), .027, -.24)
    else:
        energy = .5 if part in ('verse', 'rise') else .74
        if big:
            energy = .93 if part == 'dawn' else .84
        pluck_order = (0, 3, 5, 2, 4, 6, 3, 5)
        for i, offset in enumerate([.0, .5, .75, 1.5, 2.0, 2.75, 3.0, 3.50]):
            if part == 'verse' and i in (2, 7):
                continue
            note = chord[pluck_order[i]] + (12 if i in (2, 4, 5, 7) else 0)
            amp = (.051 if big else .096) * (1.23 if i in (0, 4) else .78)
            pan = -.33 if i % 2 == 0 else .36
            place('keys', pos+offset, struck_glass(note, .65 if i % 2 else .9), amp, pan,
                  offset=float(RNG.uniform(-.008, .009)))
            if part == 'dawn' and i in (0, 3, 6):
                place('keys', pos+offset, piano(note, .6, .68), .077, -.22 * pan)
        if big:
            pattern = ([(0, 1.39, 0), (1.50, .84, 0), (2.50, .81, 0), (3.50, .33, 12)] if bar % 2 == 0
                       else [(0, .77, 0), (.875, .57, 0), (1.50, .86, 0), (2.50, .94, 0), (3.50, .35, 7)])
            for i, (off, dur, shift) in enumerate(pattern):
                place('bass', pos+off, bass(low + shift, dur, energy, bar + i), .40 if part == 'dawn' else .389)
        else:
            if bar in (25, 27, 65, 67):
                pattern = [(0, .97), (1.25, .59), (2, .45), (2.75, .43), (3.5, .32)]
            else:
                pattern = [(0, 1.27), (1.5, 1.31), (3, .77)]
            for i, (off, dur) in enumerate(pattern):
                place('bass', pos+off, bass(low, dur, energy * .8, i), .211 if part == 'rise' else .23)

    if part in ('deep', 'rise', 'dawn') or bar in (5, 6, 7, 96, 97, 98):
        if part == 'dawn':
            use = COUNTER[(bar - 68) % 8]
            level = .109 if bar >= 76 else .087
        elif part == 'rise':
            use = COUNTER[(bar - 56) % 8]
            level = .162 if bar < 64 else .128
        else:
            use = [(0.58, chord[4]+12, 3.28), (1.5, chord[2]+12, 2.61)]
            level = .121 if part == 'deep' else .048
        for i, (off, note, dur) in enumerate(use):
            for j, (spread, delay) in enumerate([(-.59, .0), (.58, .023)]):
                place('bed', pos + off, mouth(note, dur, .31 + .42 * (bar/100), 3 * bar + i + j + 3),
                      level * (1 if j == 0 else .89), spread, delay)
    if big:
        motif = (FIRST_DAWN if part == 'dawn' else MAIN)[(bar - (68 if part == 'dawn' else 28)) % 8]
        if bar in (40, 84):
            motif = MAIN[0]
        if bar in (43, 91):
            motif = motif[:3] + [(2.25, 78, 1.72), (3, 85, .69)]
        for i, (off, note, dur) in enumerate(motif):
            accent = 1.05 if i == 0 or dur > 1 else .85
            amp = (.267 if part == 'drop' else .277) * accent
            place('hook', pos+off, lead(note, dur, .92 if part == 'dawn' else .27), amp)
            if part == 'dawn':
                place('hook', pos+off, mouth(note, dur, .79, bar*9+i), .081 * accent, -.11)
                if bar >= 76 and dur > .52:
                    place('hook', pos+off, strings(note-12, min(2.4, dur+.21), bar*17+i),
                          .079, .55 if i % 2 else -.56)
            if i == 0 or dur >= 1:
                place('keys', pos+off+0.017, piano(note, .67, .62), .082, -.18)
    elif part == 'verse' and bar in (8, 9, 12, 14, 15, 18, 19):
        for i, (off, note, dur) in enumerate(MAIN[(bar - 8) % 8]):
            if i < 3:
                place('keys', pos+off, piano(note - (12 if bar < 12 else 0), dur, .61), .175, .06)
                place('keys', pos+off+.03, struck_glass(note, dur), .048, -.27)
    elif part == 'rise' and bar in (59, 61, 63, 65, 66, 67):
        for off, note, dur in MAIN[(bar - 56) % 8][:3]:
            place('hook', pos + off, mouth(note, dur, .36, bar+note), .104)
            place('keys', pos + off, piano(note, dur, .45), .097, -.15)

    if big:
        kick_pattern = [[0, 1.50, 2.50], [0, 1.75, 2.50, 3.75], [0, 1.50, 2.75],
                        [0, .75, 1.75, 2.50]][bar % 4]
        if bar in (43, 75, 83, 91):
            kick_pattern = [0, 1.50] if bar in (43, 91) else [0, 1.50, 2.75, 3.50]
        for i, off in enumerate(kick_pattern):
            hit('kick', pos+off, (.69 if part == 'dawn' else .67) * (1 if i == 0 else .87), i+bar)
        for off in (1.0, 3.0):
            hit('snare', pos+off, .559 if part == 'dawn' else .529, bar+round(off))
            hit('rim', pos+off+.025, .067, bar, -.18)
        if bar % 2 == 1:
            hit('snare', pos+2.26, .14, bar, .17, human=.004)
        if bar % 4 == 2:
            hit('rim', pos+.72, .116, bar, -.32, human=-.007)
            hit('snare', pos+3.75, .191, bar, .19)
        hat_pattern = [.25, .50, .75, 1.50, 1.75, 2.0, 2.25, 2.50, 2.75, 3.50, 3.75]
        for i, off in enumerate(hat_pattern):
            kind = 'open' if i in (1, 5, 9) and bar not in (43, 91) else 'hat'
            amp = (.126 if kind == 'open' else .090) * float(RNG.uniform(.63, 1.05))
            hit(kind, pos+off, amp, bar+i, (i % 3 - 1) * .38, human=float(RNG.uniform(-.007, .009)))
        if bar in (28, 32, 36, 40, 68, 72, 76, 80, 84, 88):
            hit('crash', pos, .22 if bar in (28, 68, 84) else .124, bar, -.35)
        if bar in (35, 39, 43, 75, 79, 83, 87, 91):
            for i, off in enumerate([2.25, 2.75, 3.25, 3.5, 3.75]):
                hit('tom', pos+off, .155 + i * .035, 5-i, -.42 + i * .21)
        if bar in (43, 91):
            hit('pulse', pos + 3.75, .26, bar)
    elif part in ('verse', 'build', 'rise'):
        if part == 'rise' and bar < 60:
            hit('pulse', pos, .259, bar)
            hit('click', pos+2.73, .091, bar, -.25)
        else:
            for off in ([0, 2.5] if bar % 2 == 0 else [0, 1.75, 3.5]):
                hit('kick', pos+off, .461 if part != 'build' else .508, bar+round(off))
            hit('rim' if bar < 16 or 60 <= bar < 64 else 'snare', pos+2,
                .359 if part == 'build' else .281, bar, .08)
            for i, off in enumerate([.5, 1.5, 2.5, 3.25, 3.5]):
                hit('open' if i in (1, 4) else 'hat', pos+off,
                    (.077 if i in (1, 4) else .059) * float(RNG.uniform(.79, 1.21)), bar+i, (-1)**i*.46)
        if bar in (23, 25, 26, 27, 63, 65, 66, 67):
            fill = [.0, .5, 1., 1.5, 2., 2.5, 2.75, 3., 3.25, 3.5, 3.75] if bar in (27, 67) else [2., 2.5, 3.0, 3.5]
            for i, off in enumerate(fill):
                if bar in (27, 67) and off == 3.75:
                    continue
                hit('snare' if bar >= 25 and bar != 63 else 'tom', pos+off,
                    .08 + .025*i, i+bar, (i % 3 - 1) * .27, human=float(RNG.uniform(-.008, .007)))
    elif bar < 6 and bar % 2 == 0 or part == 'deep' and bar % 2 == 0 or bar in (92, 94, 98):
        hit('pulse', pos, .19 if bar < 7 else .24, bar)
        if part == 'deep':
            hit('click', pos+2.75, .075, bar, -.49)


for bar, width, amp, note in [(8, 5.0, .38, 49), (20, 6, .46, 54), (26, 7.75, .54, 52),
                              (28, 7.5, 1.17, 49), (36, 4, .48, 54), (44, 3, .46, 54),
                              (56, 9, .66, 56), (64, 5, .51, 57), (68, 10.5, 1.24, 57),
                              (76, 3.75, .56, 61), (84, 4, .66, 57), (92, 4, .45, 49)]:
    swell(bar * 4 - (.24 if bar in (28, 68) else 0), width, amp, note)
for bar, width, amp, note in [(0, 19, .45, 42), (28, 8, .74, 42), (44, 10, .56, 42),
                              (68, 10, .76, 49), (84, 8, .57, 49), (92, 18, .43, 42)]:
    swell(bar*4, width, amp, note, True)
for beat, vol in [(0, .25), (8, .16), (28*4, .41), (44*4, .32), (56*4, .20), (68*4, .48), (84*4, .28), (92*4, .24)]:
    hit('pulse', beat, vol)
    hit('crash', beat+.04, vol*.41, round(beat), .43)

# Ocean atmosphere, made from filtered noise modulated at irregular tidal periods.
t = clock(FRAMES)
for channel in range(2):
    tide = filt(noise(FRAMES), 'bandpass', 86, 1200)
    spray = filt(noise(FRAMES), 'bandpass', 2100, 6900)
    slow = .49 + .30*np.sin(t*.82+channel*.58) + .17*np.sin(t*.49-channel*.82)
    level = np.interp(t, np.array([0, 8, 20, 44, 48, 56, 68, 88, 92, 98, 100])*BAR,
                      [.108, .098, .061, .075, .135, .11, .063, .045, .12, .12, .073])
    BUSES['air'][:, channel] += (tide * slow + spray * slow**1.8 * .22) * level

# Use independently timed pre-delays and a convolved, dense stereo chamber.
def reverberate(wave, seconds, decay, seed):
    rng = np.random.default_rng(seed)
    t = clock(round(seconds*RATE))
    output = np.zeros_like(wave)
    for side in range(2):
        impulse = filt(rng.standard_normal(len(t), dtype=np.float32), 'bandpass', 245, 6900)
        impulse *= np.exp(-decay*t) * np.minimum(1, t * 33)
        impulse[:round(.017*RATE)] = 0
        for i, (delay, level) in enumerate([(.023, .30), (.039, -.23), (.059, .19), (.078, .16), (.112, -.10)]):
            impulse[round((delay + side * .002 * i)*RATE)] += level*15
        impulse *= .92 / np.linalg.norm(impulse)
        crossfade = .81 * wave[:, side] + .19 * wave[:, 1-side]
        output[:, side] = signal.oaconvolve(crossfade, impulse)[:len(wave)]
    return output


duck = np.ones(FRAMES, np.float32)
for second, volume in KICK_TIMES:
    count = round(.185 * RATE)
    release = clock(count)
    groove = 1 - min(volume*.70, .47) * np.exp(-release * 21.5)
    first = round(second*RATE)
    duck[first:first+count] = np.minimum(groove, duck[first:first+count])
BUSES['bass'] *= duck[:, None]
BUSES['bed'] *= (.66 + .34 * duck[:, None])
BUSES['keys'] *= (.83 + .17 * duck[:, None])

# Two tempo-locked throws add space to the motif without blurring the center.
hook = BUSES['hook']
for delay, amount in [(.75, .151), (1.50, .105), (2.25, .067), (3.0, .041)]:
    d = round(delay*BEAT*RATE)
    hook[d:] += hook[:-d, ::-1].copy() * amount
keys = BUSES['keys']
for delay, amount in [(1.5, .113), (3, .073)]:
    d = round(delay*BEAT*RATE)
    keys[d:] += keys[:-d, ::-1].copy() * amount
room = reverberate(keys*.42 + BUSES['bed']*.36 + hook*.28 + BUSES['air']*.15,
                   2.41, 2.11, 1704)
drum_room = reverberate(BUSES['drums']*.15, .65, 5.3, 1699)
mix = sum(BUSES.values()) + room + drum_room
for channel in range(2):
    mix[:, channel] = filt(mix[:, channel], 'highpass', 23)
# The downbeats at bars 28 and 68 arrive after a short intake of silence.
for bar in (28, 68):
    a, b, c = [round((bar*4 + rel) * BEAT * RATE) for rel in (-.46, -.23, -.007)]
    mix[a:b, :] *= np.linspace(1, .29, b-a)[:, None]
    mix[b:c, :] *= np.linspace(.29, .34, c-b)[:, None]
    mix[c:c+515, :] *= np.linspace(.34, 1, 515)[:, None]
# Keep the end of the cadence audible and ramp to digital silence at the cut.
mix *= (np.clip(t/.36, 0, 1) * np.clip((END-t)/2.0, 0, 1) ** 1.55)[:, None]
mix = np.tanh(mix * 1.12) * .93
wavfile.write(STUDIO / 'premaster.wav', RATE, mix.astype(np.float32))
print(f'{BPM} BPM | {BAR:.8f} sec/bar | {END:.3f} sec | max {np.max(np.abs(mix)):.3f}')
for bar in [0, 8, 20, 28, 44, 56, 68, 84, 92]:
    print(f'{bar:02d} {bar*BAR:6.2f}s rms {20*np.log10(np.sqrt(np.mean(mix[round(bar*BAR*RATE):round((bar+4)*BAR*RATE)]**2))):6.2f} dBFS')
