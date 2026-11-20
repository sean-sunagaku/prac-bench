"""
DSP エンジン。楽器の音は、すべて sin() の足し算から作る。
  - オシレーターの波形（ノコギリ・矩形など）は、倍音の sin を足して作ったウェーブテーブル
  - ノイズも「全周波数の sin をランダム位相で足したもの」（逆FFT）として作る
フィルター・コンプ・リバーブなどのエフェクトは numba で 1 サンプルずつ処理する。
"""
import numpy as np
from numba import njit
from scipy.signal import sosfilt

SR = 48000
TWO_PI = 2.0 * np.pi


# ---------------------------------------------------------------------------
# sin の足し算で作るノイズ
# ---------------------------------------------------------------------------
_NOISE = None


def sine_noise_bank(n=1 << 21, seed=7):
    """全 FFT ビン（= 全周波数の sin）を、同じ振幅・ランダム位相で足し合わせた信号。"""
    global _NOISE
    if _NOISE is None:
        rng = np.random.default_rng(seed)
        m = n // 2 + 1
        spec = np.exp(1j * rng.uniform(0, TWO_PI, m))
        spec[0] = 0.0
        x = np.fft.irfft(spec, n)
        _NOISE = (x / np.std(x) * 0.33).astype(np.float32)
    return _NOISE


def noise(n, seed=0):
    bank = sine_noise_bank()
    rng = np.random.default_rng(seed)
    start = rng.integers(0, len(bank) - n - 1) if n < len(bank) - 1 else 0
    if n < len(bank) - 1:
        return bank[start:start + n].copy()
    reps = n // len(bank) + 1
    return np.tile(bank, reps)[:n].copy()


# ---------------------------------------------------------------------------
# 倍音加算ウェーブテーブル
# ---------------------------------------------------------------------------
TABLE_N = 4096
_tables = {}


def harmonic_amps(shape, nh):
    k = np.arange(1, nh + 1, dtype=np.float64)
    if shape == "sine":
        a = np.zeros(nh); a[0] = 1.0
    elif shape == "saw":
        a = ((-1.0) ** (k + 1)) / k * (2 / np.pi)
    elif shape == "square":
        a = np.where(k % 2 == 1, 1.0 / k, 0.0) * (4 / np.pi)
    elif shape == "tri":
        a = np.where(k % 2 == 1, ((-1.0) ** ((k - 1) / 2)) / (k * k), 0.0) * (8 / np.pi ** 2)
    elif shape == "warm":      # ノコギリより柔らかい（1/k^1.4）
        a = 1.0 / k ** 1.4
    elif shape == "organ":     # 1,2,3,4,6,8 倍音
        a = np.zeros(nh)
        for h, g in [(1, 1.0), (2, 0.6), (3, 0.35), (4, 0.25), (6, 0.12), (8, 0.08)]:
            if h <= nh:
                a[h - 1] = g
    elif shape == "hollow":    # 奇数倍音寄り＋少し偶数
        a = np.where(k % 2 == 1, 1.0 / k, 0.25 / k)
    else:
        raise ValueError(shape)
    return a


def wavetable(shape, f_max):
    nh = max(1, int((SR * 0.45) / max(f_max, 1.0)))
    nh = min(nh, TABLE_N // 2 - 1)
    key = (shape, nh)
    t = _tables.get(key)
    if t is None:
        a = harmonic_amps(shape, nh)
        spec = np.zeros(TABLE_N // 2 + 1, dtype=np.complex128)
        # sin(kx) は irfft 上では -i/2 * N の係数
        spec[1:nh + 1] = -1j * a * TABLE_N / 2.0
        t = np.fft.irfft(spec, TABLE_N).astype(np.float32)
        _tables[key] = t
    return t


@njit(cache=True, fastmath=True)
def osc(table, freq, phase0):
    N = table.shape[0]
    n = freq.shape[0]
    out = np.empty(n, np.float32)
    ph = phase0
    for i in range(n):
        x = ph * N
        i0 = int(x)
        fr = x - i0
        i0 = i0 % N
        i1 = (i0 + 1) % N
        out[i] = table[i0] + (table[i1] - table[i0]) * fr
        ph += freq[i] / 48000.0
        if ph >= 1.0:
            ph -= np.floor(ph)
    return out


@njit(cache=True, fastmath=True)
def sine_osc(freq, phase0):
    n = freq.shape[0]
    out = np.empty(n, np.float32)
    ph = phase0
    for i in range(n):
        out[i] = np.sin(2.0 * np.pi * ph)
        ph += freq[i] / 48000.0
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=True, fastmath=True)
def fm_osc(freq, ratio, index_env, fb, phase0):
    """2 オペレーター FM（sin を sin で揺らす）"""
    n = freq.shape[0]
    out = np.empty(n, np.float32)
    pc = phase0
    pm = 0.0
    prev = 0.0
    for i in range(n):
        m = np.sin(2.0 * np.pi * pm + fb * prev)
        prev = m
        out[i] = np.sin(2.0 * np.pi * pc + index_env[i] * m)
        pc += freq[i] / 48000.0
        pm += freq[i] * ratio / 48000.0
        if pc >= 1.0:
            pc -= 1.0
        if pm >= 1.0:
            pm -= np.floor(pm)
    return out


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


# ---------------------------------------------------------------------------
# エンベロープ
# ---------------------------------------------------------------------------
def adsr(n_gate, n_total, a=0.005, d=0.1, s=0.7, r=0.2, curve=3.0):
    """n_gate: 押している長さ（サンプル）、n_total: 余韻込みの全長"""
    env = np.zeros(n_total, np.float32)
    A = max(1, int(a * SR)); D = max(1, int(d * SR)); R = max(1, int(r * SR))
    t = np.arange(n_total)
    # attack
    ia = np.minimum(t, A)
    env_a = (ia / A)
    # decay（指数）
    td = np.clip(t - A, 0, None) / D
    env_d = s + (1 - s) * np.exp(-curve * td)
    e = np.where(t < A, env_a, env_d)
    # release
    g = min(n_gate, n_total)
    lvl = e[g - 1] if g > 0 else 0.0
    tr = np.clip(t - g, 0, None) / R
    rel = lvl * np.exp(-curve * 1.6 * tr)
    e = np.where(t < g, e, rel)
    env[:] = e
    return env


def perc_env(n, a=0.002, decay=0.3, curve=1.0):
    t = np.arange(n) / SR
    A = max(1e-4, a)
    e = np.where(t < A, t / A, np.exp(-(t - A) / max(decay, 1e-4) * curve))
    return e.astype(np.float32)


# ---------------------------------------------------------------------------
# フィルター
# ---------------------------------------------------------------------------
@njit(cache=True, fastmath=True)
def svf(x, cutoff, q, mode):
    """TPT 状態変数フィルター。cutoff は毎サンプル配列。mode 0=LP 1=BP 2=HP 3=notch"""
    n = x.shape[0]
    out = np.empty(n, np.float32)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(n):
        fc = cutoff[i]
        if fc > 21000.0:
            fc = 21000.0
        if fc < 10.0:
            fc = 10.0
        g = np.tan(np.pi * fc / 48000.0)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            out[i] = v2
        elif mode == 1:
            out[i] = v1 * k
        elif mode == 2:
            out[i] = x[i] - k * v1 - v2
        else:
            out[i] = x[i] - k * v1
    return out


def lp(x, fc, q=0.707):
    c = np.full(len(x), fc, np.float32) if np.isscalar(fc) else fc.astype(np.float32)
    return svf(x.astype(np.float32), c, q, 0)


def hp(x, fc, q=0.707):
    c = np.full(len(x), fc, np.float32) if np.isscalar(fc) else fc.astype(np.float32)
    return svf(x.astype(np.float32), c, q, 2)


def bp(x, fc, q=1.0):
    c = np.full(len(x), fc, np.float32) if np.isscalar(fc) else fc.astype(np.float32)
    return svf(x.astype(np.float32), c, q, 1)


# --- RBJ biquad（固定 EQ 用）---------------------------------------------------
def _biquad(kind, f0, gain_db=0.0, q=0.707):
    A = 10 ** (gain_db / 40)
    w0 = TWO_PI * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2 * q)
    if kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == "lowshelf":
        sq = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    elif kind == "highshelf":
        sq = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return np.concatenate([b, a])


def eq(x, bands):
    """bands: [(kind, f0, gain_db, q), ...]  x: (2, n) or (n,)"""
    sos = np.array([_biquad(k, f, g, q) for (k, f, g, q) in bands])
    return sosfilt(sos, x, axis=-1).astype(np.float32)


# ---------------------------------------------------------------------------
# ダイナミクス
# ---------------------------------------------------------------------------
@njit(cache=True, fastmath=True)
def _comp_gain(det, thr, ratio, att, rel, knee):
    n = det.shape[0]
    g = np.empty(n, np.float32)
    ca = np.exp(-1.0 / (att * 48000.0))
    cr = np.exp(-1.0 / (rel * 48000.0))
    env = 0.0
    for i in range(n):
        lvl = 20.0 * np.log10(det[i] + 1e-9)
        over = lvl - thr
        if over <= -knee / 2:
            gr = 0.0
        elif over >= knee / 2:
            gr = over * (1.0 - 1.0 / ratio)
        else:
            z = over + knee / 2
            gr = (1.0 - 1.0 / ratio) * z * z / (2.0 * knee)
        if gr > env:
            env = ca * env + (1 - ca) * gr
        else:
            env = cr * env + (1 - cr) * gr
        g[i] = 10.0 ** (-env / 20.0)
    return g


def compress(x, thr=-18.0, ratio=4.0, att=0.005, rel=0.12, knee=6.0, makeup=0.0, sc=None):
    """x: (2,n)。sc: サイドチェイン信号（無ければ自分自身）"""
    det = np.max(np.abs(x), axis=0) if sc is None else np.abs(sc)
    g = _comp_gain(det.astype(np.float32), thr, ratio, att, rel, knee)
    return (x * g[None, :] * (10 ** (makeup / 20))).astype(np.float32), g


@njit(cache=True, fastmath=True)
def _release(g, cr):
    out = np.empty_like(g)
    prev = 1.0
    for i in range(g.shape[0]):
        rec = prev + (1.0 - prev) * (1.0 - cr)   # 1 へ向かって指数的にしか戻れない
        v = g[i] if g[i] < rec else rec
        out[i] = v
        prev = v
    return out


def limit(x, ceiling_db=-1.0, look_ms=1.5, rel=0.08, oversample=4):
    """オフライン先読みリミッター。4倍オーバーサンプルでサンプル間ピークも抑える。
    m = 区間最小（±L）→ 区間平均（±L）とすると、必ず g[i] <= 必要ゲイン[i] になる。"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    from scipy.signal import resample_poly
    ceiling = 10 ** (ceiling_db / 20)
    L = max(1, int(look_ms * 1e-3 * SR))
    pk = np.zeros(x.shape[1], np.float32)
    for c in range(x.shape[0]):
        up = resample_poly(x[c], oversample, 1)
        up = np.abs(up[: x.shape[1] * oversample]).reshape(-1, oversample).max(axis=1)
        pk = np.maximum(pk, up.astype(np.float32))
    req = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9)).astype(np.float32)
    m = minimum_filter1d(req, size=2 * L + 1, mode="nearest")
    g = uniform_filter1d(m, size=2 * L + 1, mode="nearest").astype(np.float32)
    g = np.minimum(g, m * 0 + g)
    g = _release(g, float(np.exp(-1.0 / (rel * SR))))
    y = x * g[None, :]
    return y.astype(np.float32), g


def softclip(x, drive=1.0):
    return (np.tanh(x * drive) / np.tanh(drive)).astype(np.float32)


# ---------------------------------------------------------------------------
# 空間系
# ---------------------------------------------------------------------------
@njit(cache=True, fastmath=True)
def _fdn(xl, xr, lens, gains, damp, mod_depth, mod_rate, out_l, out_r):
    n = xl.shape[0]
    L = lens.shape[0]
    maxlen = 0
    for j in range(L):
        if lens[j] > maxlen:
            maxlen = lens[j]
    size = maxlen + 64
    buf = np.zeros((L, size), np.float32)
    w = np.zeros(L, np.int64)
    lpst = np.zeros(L, np.float32)
    y = np.zeros(L, np.float32)
    s = np.zeros(L, np.float32)
    phs = np.zeros(L, np.float64)
    for j in range(L):
        phs[j] = j * 0.77
    for i in range(n):
        # 読み出し（ゆっくり揺らして金属的な響きを防ぐ）
        for j in range(L):
            md = mod_depth * (0.5 + 0.5 * np.sin(phs[j]))
            phs[j] += 2 * np.pi * mod_rate * (1.0 + 0.13 * j) / 48000.0
            pos = w[j] - lens[j] - md
            while pos < 0:
                pos += size
            i0 = int(pos)
            fr = pos - i0
            a = buf[j, i0 % size]
            b = buf[j, (i0 + 1) % size]
            v = a + (b - a) * fr
            # 減衰の周波数依存（1次ローパス）
            lpst[j] = lpst[j] + damp * (v - lpst[j])
            y[j] = lpst[j] * gains[j]
        # Householder 行列で混ぜる
        tot = 0.0
        for j in range(L):
            tot += y[j]
        tot *= 2.0 / L
        for j in range(L):
            s[j] = y[j] - tot
        inl = xl[i]
        inr = xr[i]
        for j in range(L):
            inp = inl if (j % 2 == 0) else inr
            buf[j, w[j] % size] = s[j] + inp
            w[j] = (w[j] + 1) % size
        ol = 0.0
        orr = 0.0
        for j in range(L):
            if j % 2 == 0:
                ol += y[j] * (1.0 if j % 4 == 0 else -1.0)
            else:
                orr += y[j] * (1.0 if j % 4 == 1 else -1.0)
        out_l[i] = ol
        out_r[i] = orr


def reverb(x, rt60=2.2, size=1.0, damp_hz=6000.0, predelay_ms=20.0, mod=6.0, hp_hz=200.0):
    """x: (2,n) -> wet (2,n)"""
    base = np.array([1031, 1327, 1523, 1801, 2053, 2311, 2633, 2903, 3209, 3517, 3833, 4127], np.float64)
    lens = (base * size * (SR / 44100)).astype(np.int64)
    gains = (10 ** (-3.0 * lens / (rt60 * SR))).astype(np.float32)
    damp = float(1 - np.exp(-TWO_PI * damp_hz / SR))
    pd = int(predelay_ms * 1e-3 * SR)
    xin = hp(x[0], hp_hz), hp(x[1], hp_hz)
    xl = np.concatenate([np.zeros(pd, np.float32), xin[0]])[: x.shape[1]]
    xr = np.concatenate([np.zeros(pd, np.float32), xin[1]])[: x.shape[1]]
    ol = np.zeros_like(xl)
    orr = np.zeros_like(xr)
    _fdn(xl, xr, lens, gains, np.float32(damp), mod, 0.6, ol, orr)
    wet = np.stack([ol, orr]) * 0.35
    return wet.astype(np.float32)


@njit(cache=True, fastmath=True)
def _pingpong(xl, xr, d, fb, damp, out_l, out_r):
    n = xl.shape[0]
    size = d + 2
    bl = np.zeros(size, np.float32)
    br = np.zeros(size, np.float32)
    w = 0
    sl = 0.0
    sr_ = 0.0
    for i in range(n):
        r = (w - d) % size
        dl = bl[r]
        dr = br[r]
        sl = sl + damp * (dl - sl)
        sr_ = sr_ + damp * (dr - sr_)
        out_l[i] = sl
        out_r[i] = sr_
        bl[w] = 0.5 * (xl[i] + xr[i]) + sr_ * fb
        br[w] = sl * fb
        w = (w + 1) % size


def pingpong(x, delay_s, fb=0.35, damp_hz=4500.0):
    d = int(delay_s * SR)
    ol = np.zeros(x.shape[1], np.float32)
    orr = np.zeros(x.shape[1], np.float32)
    _pingpong(x[0].astype(np.float32), x[1].astype(np.float32), d, fb,
              float(1 - np.exp(-TWO_PI * damp_hz / SR)), ol, orr)
    return np.stack([ol, orr])


@njit(cache=True, fastmath=True)
def _chorus(x, out, base, depth, rate, phase):
    n = x.shape[0]
    size = int(base + depth + 4)
    buf = np.zeros(size, np.float32)
    w = 0
    for i in range(n):
        buf[w] = x[i]
        d = base + depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * i / 48000.0 + phase))
        pos = w - d
        while pos < 0:
            pos += size
        i0 = int(pos)
        fr = pos - i0
        a = buf[i0 % size]
        b = buf[(i0 + 1) % size]
        out[i] = a + (b - a) * fr
        w = (w + 1) % size


def chorus(x, mix=0.5, base_ms=12.0, depth_ms=4.0, rate=0.6):
    """mono or stereo -> stereo"""
    if x.ndim == 1:
        x = np.stack([x, x])
    out = np.zeros_like(x)
    for c in range(2):
        tmp = np.zeros(x.shape[1], np.float32)
        _chorus(x[c].astype(np.float32), tmp, base_ms * 48, depth_ms * 48, rate * (1 + 0.1 * c), c * 1.7)
        out[c] = tmp
    return ((1 - mix) * x + mix * out).astype(np.float32)


def pan(mono, p):
    """p: -1(左)..+1(右)、等パワー"""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)]).astype(np.float32)


def db(x):
    return 10 ** (x / 20)
