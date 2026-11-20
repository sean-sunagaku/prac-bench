"""
映像用の音響特徴を、映像の 1 フレームごとに計算して保存する。
映像は「楽譜（score / events）」と「実際の音（ここで作る特徴）」の両方で動かす。
"""
import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d

BUILD = "/tmp/qed/build"
SR = 48000
FPS = 60
NB = 96          # 対数周波数バンド数


def env_follow(x, att, rel):
    out = np.empty_like(x)
    e = 0.0
    for i, v in enumerate(x):
        c = att if v > e else rel
        e = c * e + (1 - c) * v
        out[i] = e
    return out


def frame_rms(mono, n_frames):
    hop = SR // FPS
    pad = np.concatenate([mono, np.zeros(hop * (n_frames + 2) - len(mono) if hop * (n_frames + 2) > len(mono) else 0, np.float32)])
    fr = pad[: hop * n_frames].reshape(n_frames, hop)
    return np.sqrt(np.mean(fr ** 2, axis=1) + 1e-12)


def main():
    x, sr = sf.read(f"{BUILD}/master.wav", dtype="float32")
    x = x.T
    mono = x.mean(axis=0)
    n_frames = int(len(mono) / SR * FPS)
    hop = SR // FPS
    win = 4096
    w = np.hanning(win).astype(np.float32)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    edges = np.geomspace(30, 16000, NB + 1)
    band_idx = [np.where((freqs >= edges[i]) & (freqs < edges[i + 1]))[0] for i in range(NB)]
    # 狭いバンドは最寄りのビンで代用
    for i in range(NB):
        if len(band_idx[i]) == 0:
            band_idx[i] = np.array([np.argmin(np.abs(freqs - np.sqrt(edges[i] * edges[i + 1])))])
    padded = np.concatenate([np.zeros(win // 2, np.float32), mono, np.zeros(win, np.float32)])
    spec = np.zeros((n_frames, NB), np.float32)
    for f in range(n_frames):
        c = f * hop
        seg = padded[c: c + win] * w
        mag = np.abs(np.fft.rfft(seg))
        spec[f] = [mag[ix].mean() for ix in band_idx]
    sdb = 20 * np.log10(spec + 1e-7)
    # バンドごとの傾きを補正（高域を持ち上げて見た目を均す）
    tilt = np.linspace(0, 18, NB)
    sdb = sdb + tilt[None, :]
    lo, hi = np.percentile(sdb, 5), np.percentile(sdb, 99.7)
    sn = np.clip((sdb - lo) / (hi - lo), 0, 1)
    # 時間方向のスムージング（立ち上がり速く、減衰ゆっくり）
    sm = np.zeros_like(sn)
    e = np.zeros(NB, np.float32)
    for f in range(n_frames):
        v = sn[f]
        e = np.where(v > e, 0.35 * e + 0.65 * v, 0.82 * e + 0.18 * v)
        sm[f] = e

    feats = {"spec": sm.astype(np.float32), "spec_raw": sn.astype(np.float32)}
    rms = frame_rms(mono, n_frames)
    feats["rms"] = rms
    feats["rms_db"] = 20 * np.log10(rms + 1e-9)
    # 帯域エネルギー
    feats["low"] = sm[:, : NB // 5].mean(axis=1)
    feats["mid"] = sm[:, NB // 5: 3 * NB // 5].mean(axis=1)
    feats["high"] = sm[:, 3 * NB // 5:].mean(axis=1)

    # ステムの包絡線
    stems = ["kick", "snare", "clap", "hats", "bass", "chords", "lead", "arp", "bells", "keys", "pad", "strings",
             "fx", "demo", "heart", "sine", "sine_pad", "vox_lead", "vox_choir", "vox_harm", "vox_pad", "stabs", "crash"]
    for s in stems:
        try:
            a = np.load(f"{BUILD}/stems/{s}.npy")
        except FileNotFoundError:
            continue
        m = a.mean(axis=0) if a.ndim == 2 else a
        r = frame_rms(m, n_frames)
        r = r / (np.percentile(r[r > 1e-5], 98) + 1e-9) if np.any(r > 1e-5) else r
        feats["env_" + s] = np.clip(env_follow(r, 0.3, 0.85), 0, 1.5).astype(np.float32)
    np.savez_compressed(f"{BUILD}/features.npz", **feats)
    print("frames", n_frames, "features", list(feats.keys()))


if __name__ == "__main__":
    main()
