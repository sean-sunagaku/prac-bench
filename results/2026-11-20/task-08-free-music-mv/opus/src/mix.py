"""
ミックスとマスタリング。ステムを読み込み、EQ・コンプ・サイドチェイン・リバーブを掛けて 2mix にする。
聴けないので、ラウドネス・ピーク・帯域バランスは数値とスペクトログラムで確認する（analyze.py）。
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

import score as S
from synth import SR, compress, db, eq, limit, lp, hp, pingpong, reverb, softclip, chorus, svf

BUILD = "/tmp/qed/build"
ST = BUILD + "/stems"


def load(name):
    p = f"{ST}/{name}.npy"
    if not os.path.exists(p):
        return None
    return np.load(p)


def T(bar, s16=0.0):
    return (bar * 16 + s16) * S.S16


def duck_env(kicks, n, depth=0.6, release=0.15):
    env = np.ones(n, np.float32)
    n_rel = int(release * 3 * SR)
    t = np.arange(n_rel) / SR
    curve = (1 - depth * np.exp(-(t / release) * 2.2) * np.clip(t / 0.003, 0, 1)).astype(np.float32)
    for tk in kicks:
        i0 = int(tk * SR)
        i1 = min(n, i0 + n_rel)
        if i0 < n:
            env[i0:i1] = np.minimum(env[i0:i1], curve[: i1 - i0])
    return env


def automation(points, n):
    """[(time, value), ...] を線形補間した毎サンプル配列"""
    ts = np.array([p[0] for p in points]) * SR
    vs = np.array([p[1] for p in points])
    return np.interp(np.arange(n), ts, vs).astype(np.float32)


def section_dynamics(n):
    """曲の起伏：Aメロは引いて、サビで開く。ラストサビが一番大きい。（楽器バスにだけ掛ける）"""
    P = [
        (0.0, 0.0), (T(8) - 0.05, 0.0), (T(8), 0.0), (T(16) - 0.05, 0.0),
        (T(16), -6.0), (T(24) - 0.05, -6.0), (T(24), -4.0), (T(32) - 0.05, -4.0),
        (T(32), -4.0), (T(39, 12), -1.0), (T(40), 0.0), (T(56) - 0.05, 0.0),
        (T(56), -0.5), (T(60) - 0.05, -0.5), (T(60), -2.5), (T(68) - 0.05, -2.5),
        (T(68), -3.5), (T(75, 12), -1.0), (T(76), 0.0), (T(92) - 0.05, 0.0),
        (T(92), -5.0), (T(100) - 0.05, -4.0), (T(100), -5.0), (T(103, 12), -1.5),
        (T(104), 0.8), (T(120) - 0.05, 0.8), (T(120), 0.5), (T(122), -1.5), (T(126) + 6, -3.0),
    ]
    return 10 ** (automation(P, n) / 20)


def vocal_duck(vox_mono, depth_db=3.0):
    """リードが歌っている間だけ、伴奏を少し下げる（歌の居場所を空ける）"""
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    e = np.abs(vox_mono)
    e = maximum_filter1d(e, int(0.01 * SR))
    e = uniform_filter1d(e, int(0.12 * SR))
    ref = np.percentile(e[e > 1e-4], 90) if np.any(e > 1e-4) else 1.0
    x = np.clip(e / (ref + 1e-9), 0, 1)
    return 10 ** (-depth_db * x / 20)


def mid_duck(x, g_mid, lo=900.0, hi=4800.0):
    """x を 3 バンドに分け、中域（歌の明瞭度帯）だけに g_mid を掛けて戻す（ダイナミックEQ）"""
    low = eq(x, [("lp", lo, 0, 0.707), ("lp", lo, 0, 0.707)])
    high = eq(x, [("hp", hi, 0, 0.707), ("hp", hi, 0, 0.707)])
    mid = x - low - high
    return (low + mid * g_mid[None, :] + high).astype(np.float32)


def vocal_chain(x, air=0.25, comp_thr=-20.0):
    x = eq(x, [("hp", 95, 0, 0.7), ("peak", 320, -2.5, 1.0), ("peak", 3100, 2.5, 0.8),
               ("peak", 6500, -1.0, 2.0), ("highshelf", 9000, 2.0, 0.7)])
    x, _ = compress(x, thr=comp_thr, ratio=3.5, att=0.003, rel=0.09, knee=6, makeup=4.0)
    # エキサイター：高域を歪ませて 12 kHz より上の倍音を作る（VOICEVOX は 24 kHz 出力のため）
    h = eq(x, [("hp", 4500, 0, 0.7)])
    h = np.tanh(h * 4.0) * 0.25
    h = eq(h, [("hp", 10000, 0, 0.7), ("hp", 10000, 0, 0.7)])
    return (x + h * air).astype(np.float32)


def main(out_wav=f"{BUILD}/master.wav", target_lufs=-10.5):
    kicks = np.load(f"{ST}/_kicks.npy")
    lead_ref = load("chords")
    n = lead_ref.shape[1]
    duck = duck_env(kicks, n, 0.65, 0.14)
    duck_soft = duck_env(kicks, n, 0.35, 0.12)

    sends_room = np.zeros((2, n), np.float32)
    sends_hall = np.zeros((2, n), np.float32)
    sends_plate = np.zeros((2, n), np.float32)
    sends_delay = np.zeros((2, n), np.float32)
    sends_vdelay = np.zeros((2, n), np.float32)
    buses = {k: np.zeros((2, n), np.float32) for k in ("drums", "bass", "music", "vox", "fx", "pure")}

    def add(bus, x, gain_db=0.0, room=0.0, hall=0.0, plate=0.0, delay=0.0, vdelay=0.0):
        if x is None:
            return
        g = db(gain_db)
        y = x * g
        buses[bus][:] += y
        if room:
            sends_room[:] += y * room
        if hall:
            sends_hall[:] += y * hall
        if plate:
            sends_plate[:] += y * plate
        if delay:
            sends_delay[:] += y * delay
        if vdelay:
            sends_vdelay[:] += y * vdelay

    # ---------------- ドラム ----------------
    kick = load("kick")
    kick = eq(kick, [("hp", 32, 0, 0.7), ("lowshelf", 60, 1.0, 0.7), ("peak", 320, -3.0, 1.2), ("peak", 3500, 2.0, 1.0)])
    add("drums", kick, -11.5)
    ki = load("kick_intro")
    if ki is not None:
        cf = automation([(0, 200), (T(6), 200), (T(7.5), 1200), (T(8), 4000)], n)
        ki = np.stack([svf(ki[0], cf, 0.9, 0), svf(ki[1], cf, 0.9, 0)])
        add("drums", ki, -8.0)
    sn = load("snare")
    sn = eq(sn, [("hp", 120, 0, 0.7), ("peak", 200, 1.5, 1.0), ("peak", 5000, 1.0, 0.8)])
    add("drums", sn, -9.0, room=0.25, hall=0.1)
    cl = load("clap")
    add("drums", cl, -10.0, room=0.3, hall=0.15)
    add("drums", load("hats"), -12.0, room=0.08)
    add("drums", load("shaker"), -15.0, room=0.1)
    add("drums", load("crash"), -12.5, hall=0.12)

    # ---------------- ベース ----------------
    bass = load("bass")
    bass = eq(bass, [("hp", 30, 0, 0.7), ("peak", 250, -2.0, 1.0), ("peak", 900, 1.5, 1.0)])
    add("bass", bass * duck[None, :], -7.5)

    # ---------------- 和音・メロディ ----------------
    chords = eq(load("chords"), [("hp", 180, 0, 0.7), ("peak", 600, -2.0, 0.9), ("highshelf", 8000, 1.0, 0.7)])
    add("music", chords * duck[None, :], -11.0, hall=0.18)
    add("music", load("stabs") * duck_soft[None, :], -16.0, hall=0.15, delay=0.12)
    keys = eq(load("keys"), [("hp", 120, 0, 0.7), ("peak", 2500, 1.0, 1.0)])
    add("music", chorus(keys[0] * 0.5 + keys[1] * 0.5, mix=0.25) * 0.0 + keys, -9.0, hall=0.22)
    add("music", load("pad") * duck_soft[None, :], -11.0, hall=0.3)
    add("music", eq(load("strings"), [("peak", 2500, -3, 0.8)]), -11.0, hall=0.3)
    add("music", load("arp"), -10.0, hall=0.2, delay=0.25)
    add("music", eq(load("bells"), [("peak", 2500, -3, 0.8)]), -16.0, hall=0.3, delay=0.2)
    lead = eq(load("lead"), [("hp", 200, 0, 0.7), ("peak", 2800, 1.5, 1.0)])
    add("music", lead, -9.0, hall=0.2, delay=0.2)
    add("music", load("sine_pad"), -6.0, hall=0.35)

    # ---------------- 効果音・実演 ----------------
    add("fx", load("fx"), -11.0)
    demo = load("demo")
    add("fx", demo, -3.0, hall=0.1)
    # 純粋な sin（イントロ・アウトロ）とハートは、XY の形を崩さないようにほぼ素のまま
    add("pure", load("sine"), -3.0, hall=0.05)
    heart = load("heart")
    add("pure", heart, -5.0, hall=0.12)

    # ---------------- ヴォーカル ----------------
    vl = vocal_chain(load("vox_lead"), air=0.3, comp_thr=-23)
    np.save(f"{BUILD}/bus_lead.npy", vl * db(2.5))
    add("vox", vl, 2.5, plate=0.16, vdelay=0.07)
    vd = vocal_chain(load("vox_double"), air=0.2)
    add("vox", eq(vd, [("peak", 3000, -3, 1.0)]), -14.5, plate=0.2)
    vh = vocal_chain(load("vox_harm"), air=0.2)
    add("vox", eq(vh, [("peak", 3000, -3, 1.0)]), -13.0, plate=0.22)
    vc = eq(vocal_chain(load("vox_choir"), air=0.15, comp_thr=-22), [("peak", 3000, -3.5, 0.9), ("peak", 250, -2, 1.0)])
    add("vox", vc, -16.5, plate=0.25, hall=0.15)
    vp = vocal_chain(load("vox_pad"), air=0.15)
    vp = eq(vp, [("hp", 250, 0, 0.7), ("lp", 9000, 0, 0.7)])
    add("vox", vp * duck_soft[None, :], -18.0, hall=0.4)

    # ---------------- 空間系リターン ----------------
    print("reverbs...")
    room = reverb(sends_room, rt60=0.9, size=0.55, damp_hz=7000, predelay_ms=8)
    hall = reverb(sends_hall, rt60=2.6, size=1.2, damp_hz=6000, predelay_ms=25)
    plate = reverb(sends_plate, rt60=1.7, size=0.8, damp_hz=8000, predelay_ms=35, hp_hz=300)
    dly = pingpong(sends_delay, S.SPB * 0.75, fb=0.38, damp_hz=4000)
    vdly = pingpong(sends_vdelay, S.SPB, fb=0.3, damp_hz=3500)
    hall = hall * duck_soft[None, :]

    # ---------------- バス処理 ----------------
    drums, _ = compress(buses["drums"], thr=-12, ratio=2.0, att=0.01, rel=0.1, knee=6, makeup=1.0)
    drums = softclip(drums, 1.1)
    drums = eq(drums, [("peak", 2000, -3.0, 0.8)])
    drums = mid_duck(drums, vocal_duck(load("vox_lead")[0] + load("vox_lead")[1], 3.5), lo=800, hi=5000)
    music, _ = compress(buses["music"], thr=-16, ratio=1.8, att=0.02, rel=0.2, knee=8)
    vox, _ = compress(buses["vox"], thr=-14, ratio=2.0, att=0.005, rel=0.12, knee=6, makeup=1.0)

    dyn = section_dynamics(n)
    vduck = vocal_duck(load("vox_lead")[0] + load("vox_lead")[1], 3.0)
    music = eq(music, [("peak", 3000, -2.0, 1.0)])
    vduck_mid = vocal_duck(load("vox_lead")[0] + load("vox_lead")[1], 6.0)
    music = mid_duck(music, vduck_mid)
    inst = (drums + buses["bass"] + music * vduck[None, :] + buses["fx"]
            + room * db(-4) + hall * db(-3) * vduck[None, :] + dly * db(-9)) * dyn[None, :]
    mixbus = inst + vox + buses["pure"] + plate * db(-3) + vdly * db(-12)
    np.save(f"{BUILD}/bus_inst.npy", inst)
    for nm, arr in (("drums", drums), ("music", music * vduck[None, :]), ("fx", buses["fx"]), ("bassb", buses["bass"]),
                    ("rev", room * db(-4) + hall * db(-3) * vduck[None, :] + dly * db(-9))):
        np.save(f"{BUILD}/bus_{nm}.npy", arr * dyn[None, :])
    np.save(f"{BUILD}/bus_vox.npy", vox)

    # ---------------- マスター ----------------
    m = eq(mixbus, [("hp", 26, 0, 0.7), ("lowshelf", 60, -1.0, 0.7), ("peak", 280, -1.0, 0.8),
                    ("highshelf", 11000, 1.5, 0.7)])
    m, _ = compress(m, thr=-12, ratio=1.5, att=0.03, rel=0.2, knee=8)
    np.save(f"{BUILD}/premaster.npy", m)

    # ラウドネスを目標に合わせてからリミッター（2回で収束させる）
    gain = 0.0
    for it in range(3):
        y = softclip(m * db(gain), 1.05)
        y, g = limit(y, ceiling_db=-1.2, look_ms=1.5, rel=0.06)
        sf.write(out_wav, y.T, SR, subtype="PCM_24")
        lufs, tp = measure(out_wav)
        print(f"iter {it}: gain {gain:+.2f} dB -> {lufs:.2f} LUFS, TP {tp:.2f} dBTP, min gain {20*np.log10(g.min()):.1f} dB")
        if abs(lufs - target_lufs) < 0.3:
            break
        gain += (target_lufs - lufs)
    # 末尾の無音処理：最後の sin が消えた後 0.5 秒で切る
    return out_wav


def measure(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = r.stderr
    lufs = float(txt.split("Integrated loudness:")[1].split("I:")[1].split("LUFS")[0])
    tp = float(txt.split("True peak:")[1].split("Peak:")[1].split("dBFS")[0])
    return lufs, tp


if __name__ == "__main__":
    main()
