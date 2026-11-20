"""
VOICEVOX の歌唱 API でヴォーカルを合成する。
score.py の音符（絶対時刻）から、セクション単位でフレーム列を組み立てて合成し、
48 kHz のトラックとして正確な位置に配置する。
"""
import hashlib
import json
import os
import urllib.request

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

import score as S

BASE = "http://127.0.0.1:50021"
VV_FPS = 24000 / 256          # 93.75 frames/s（1フレーム = 256サンプル @24k）
SR = 48000
CACHE = "/tmp/qed/build/vox"
os.makedirs(CACHE, exist_ok=True)

QUERY_SPEAKER = 6000          # 歌唱用の音程・音量予測モデル（波音リツ）


def _post(path, body, raw=False):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=600) as r:
        data = r.read()
    return data if raw else json.loads(data)


def build_score(notes, lead=0.4, tail=0.4):
    """絶対時刻の音符列 -> VOICEVOX Score。フレーム境界は絶対時刻で丸めるのでドリフトしない。"""
    T0 = notes[0].t0 - lead
    fi = lambda t: int(round((t - T0) * VV_FPS))
    out = []
    cur = 0
    for n in notes:
        a, b = fi(n.t0), fi(n.t1)
        if a > cur:
            gap = a - cur
            if gap < 6 and out and out[-1]["key"] is not None:
                out[-1]["frame_length"] += gap      # 極短の休符は前の音に吸収
            else:
                out.append({"key": None, "frame_length": gap, "lyric": ""})
        elif a < cur:          # 前の音と重なる場合は前を削る
            a = cur
        out.append({"key": int(n.key), "frame_length": max(1, b - a), "lyric": n.mora})
        cur = max(b, a + 1)
    out.append({"key": None, "frame_length": int(round(tail * VV_FPS)), "lyric": ""})
    return T0, {"notes": out}


def get_query(score_json):
    h = hashlib.sha1(json.dumps(score_json, sort_keys=True).encode()).hexdigest()[:16]
    p = f"{CACHE}/q_{h}.json"
    if os.path.exists(p):
        return json.load(open(p))
    q = _post(f"/sing_frame_audio_query?speaker={QUERY_SPEAKER}", score_json)
    json.dump(q, open(p, "w"))
    return q


def synth_query(q, speaker):
    h = hashlib.sha1((json.dumps(q, sort_keys=True) + str(speaker)).encode()).hexdigest()[:16]
    p = f"{CACHE}/w_{h}.wav"
    if not os.path.exists(p):
        w = _post(f"/frame_synthesis?speaker={speaker}", q, raw=True)
        open(p, "wb").write(w)
    x, sr = sf.read(p, dtype="float32")
    if x.ndim > 1:
        x = x.mean(axis=1)
    assert sr == 24000, sr
    return resample_poly(x, 2, 1).astype(np.float32)


def vary_query(q, cents_sd=6.0, seed=0, drift_hz=0.35, scoop=0.0):
    """合唱用：f0 にゆっくりした揺らぎ（ピッチのばらつき）を加える。"""
    rng = np.random.default_rng(seed)
    f0 = np.array(q["f0"], dtype=np.float64)
    n = len(f0)
    t = np.arange(n) / VV_FPS
    # 2つのゆっくりした正弦＋ランダム位相 -> 人間の合唱のような微妙なズレ
    dev = (np.sin(2 * np.pi * drift_hz * t + rng.uniform(0, 6.28)) * 0.6 +
           np.sin(2 * np.pi * drift_hz * 2.3 * t + rng.uniform(0, 6.28)) * 0.4) * cents_sd
    dev += rng.normal(0, cents_sd * 0.4)
    f0 = np.where(f0 > 0, f0 * 2 ** (dev / 1200.0), 0.0)
    q2 = dict(q)
    q2["f0"] = f0.tolist()
    return q2


def transpose_query_f0(q, semis):
    f0 = np.array(q["f0"], dtype=np.float64)
    q2 = dict(q)
    q2["f0"] = np.where(f0 > 0, f0 * 2 ** (semis / 12.0), 0.0).tolist()
    return q2


def group_by_section(vnotes):
    groups = {}
    for n in vnotes:
        groups.setdefault(n.section, []).append(n)
    return groups


def render_notes(notes, speaker, total_len, variation=None, f0_semis=0.0):
    """notes（同一セクション内の VNote 列）を合成し、total_len サンプルのバッファに配置。"""
    buf = np.zeros(total_len, dtype=np.float32)
    # 長すぎるフレーズは途中の長い休符で分割（APIの安定性のため）
    chunks = [[]]
    for n in notes:
        if chunks[-1] and n.t0 - chunks[-1][-1].t1 > 1.0:
            chunks.append([])
        chunks[-1].append(n)
    for ch in chunks:
        T0, sc = build_score(ch)
        q = get_query(sc)
        if variation is not None:
            q = vary_query(q, **variation)
        if f0_semis:
            q = transpose_query_f0(q, f0_semis)
        y = synth_query(q, speaker)
        i0 = int(round(T0 * SR))
        if i0 < 0:
            y = y[-i0:]
            i0 = 0
        i1 = min(total_len, i0 + len(y))
        buf[i0:i1] += y[: i1 - i0]
    return buf


if __name__ == "__main__":
    import sys
    vn, ll = S.expand_lines()
    total = int((S.SONG_END + 6) * SR)
    spk = int(sys.argv[1]) if len(sys.argv) > 1 else 3009
    buf = np.zeros(total, dtype=np.float32)
    for sec, notes in group_by_section(vn).items():
        print("render", sec, len(notes))
        buf += render_notes(notes, spk, total)
    sf.write(f"/tmp/qed/build/lead_{spk}.wav", buf, SR, subtype="FLOAT")
    print("peak", np.abs(buf).max())
