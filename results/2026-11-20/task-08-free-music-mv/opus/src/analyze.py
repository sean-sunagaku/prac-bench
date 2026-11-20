"""
「耳の代わり」の分析ツール。ぼくは音を聴けないので、目で確かめる。
  - 全体スペクトログラム（対数周波数）＋セクション境界
  - 短時間ラウドネスの推移
  - セクション別の平均スペクトル（ピンクノイズ傾斜との比較）
  - ステレオ相関
"""
import sys

import matplotlib
import numpy as np
import soundfile as sf

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import signal

import score as S


def k_weight(x, sr):
    # BS.1770 の K 特性（近似：シェルフ + ハイパス）
    from synth import eq
    return eq(x, [("highshelf", 1680, 4.0, 0.71), ("hp", 38, 0, 0.5)])


def main(path, out_png):
    x, sr = sf.read(path, dtype="float32")
    x = x.T
    mono = x.mean(axis=0)
    fig = plt.figure(figsize=(18, 13))
    gs = fig.add_gridspec(4, 2, height_ratios=[2.2, 1, 1.4, 1])

    # 1) スペクトログラム
    ax = fig.add_subplot(gs[0, :])
    f, t, Z = signal.stft(mono, sr, nperseg=4096, noverlap=4096 - 1024)
    P = 20 * np.log10(np.abs(Z) + 1e-9)
    ax.pcolormesh(t, f, P, vmin=-110, vmax=-20, shading="auto", cmap="magma")
    ax.set_yscale("symlog", linthresh=200)
    ax.set_ylim(30, 22000)
    for (n, s, b, k) in S.SECTIONS:
        ax.axvline(S.bar_time(s), color="cyan", lw=0.6)
        ax.text(S.bar_time(s) + 0.5, 15000, n, color="cyan", fontsize=8)
    ax.set_title("spectrogram (mono)")

    # 2) 短時間ラウドネス（3秒窓、K特性の近似）
    ax = fig.add_subplot(gs[1, :])
    kw = k_weight(x, sr)
    win = int(3 * sr)
    hop = int(0.5 * sr)
    ts, ls = [], []
    for i in range(0, kw.shape[1] - win, hop):
        seg = kw[:, i:i + win]
        ms = np.mean(seg ** 2, axis=1).sum()
        ls.append(-0.691 + 10 * np.log10(ms + 1e-12))
        ts.append((i + win / 2) / sr)
    ax.plot(ts, ls)
    ax.set_ylim(-40, -4)
    ax.grid(alpha=0.3)
    for (n, s, b, k) in S.SECTIONS:
        ax.axvline(S.bar_time(s), color="gray", lw=0.6)
    ax.set_title("short-term loudness (approx LUFS, 3s)")

    # 3) セクション別平均スペクトル
    ax = fig.add_subplot(gs[2, 0])
    for (n, s, b, k) in S.SECTIONS:
        i0, i1 = int(S.bar_time(s) * sr), int(S.bar_time(s + b) * sr)
        ff, pxx = signal.welch(mono[i0:i1], sr, nperseg=8192)
        # 1/3 オクターブで平滑化
        sm = np.convolve(10 * np.log10(pxx + 1e-15), np.ones(9) / 9, mode="same")
        ax.semilogx(ff[1:], sm[1:], lw=1, label=n)
    ref = -45 - 10 * np.log10(np.linspace(1, 1000, 100))
    ax.semilogx(np.linspace(20, 20000, 100), ref, "k--", lw=0.7, label="pink ref")
    ax.set_xlim(25, 20000)
    ax.set_ylim(-130, -30)
    ax.legend(fontsize=6, ncol=2)
    ax.grid(alpha=0.3)
    ax.set_title("avg spectrum per section")

    # 4) 帯域別エネルギー比（サビ）
    ax = fig.add_subplot(gs[2, 1])
    bands = [(20, 60), (60, 150), (150, 400), (400, 1000), (1000, 2500), (2500, 6000), (6000, 12000), (12000, 20000)]
    names = [f"{a}-{b}" for a, b in bands]
    for sec in ("verse1", "chorus1", "chorus2", "final", "bridge"):
        s = S.section_start(sec)
        b = [bb for (nn, ss, bb, kk) in S.SECTIONS if nn == sec][0]
        i0, i1 = int(S.bar_time(s) * sr), int(S.bar_time(s + b) * sr)
        ff, pxx = signal.welch(mono[i0:i1], sr, nperseg=8192)
        e = [10 * np.log10(pxx[(ff >= a) & (ff < bb2)].sum() + 1e-15) for a, bb2 in bands]
        ax.plot(range(len(bands)), e, marker="o", label=sec)
    ax.set_xticks(range(len(bands)))
    ax.set_xticklabels(names, rotation=30, fontsize=7)
    ax.legend(fontsize=7)
    ax.grid(alpha=0.3)
    ax.set_title("band energy (dB)")

    # 5) ステレオ相関・ピーク
    ax = fig.add_subplot(gs[3, :])
    cs, tts, pk = [], [], []
    w = int(0.5 * sr)
    for i in range(0, x.shape[1] - w, w):
        l, r = x[0, i:i + w], x[1, i:i + w]
        c = np.sum(l * r) / (np.sqrt(np.sum(l * l) * np.sum(r * r)) + 1e-12)
        cs.append(c)
        pk.append(20 * np.log10(np.abs(x[:, i:i + w]).max() + 1e-9))
        tts.append(i / sr)
    ax.plot(tts, cs, label="L/R correlation")
    ax2 = ax.twinx()
    ax2.plot(tts, pk, color="r", lw=0.6, label="peak dBFS")
    ax2.set_ylim(-40, 0)
    ax.set_ylim(-1, 1)
    ax.grid(alpha=0.3)
    ax.set_title("stereo correlation (blue) / peak dBFS (red)")
    plt.tight_layout()
    plt.savefig(out_png, dpi=60)
    print("saved", out_png)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
