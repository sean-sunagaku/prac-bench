"""
レンダリング本体。
  python render.py preview 12.9 64.5 ...   → 指定時刻のフレームを PNG に
  python render.py full                    → 全フレームを描いて ffmpeg で MP4 に（音声も多重化）
"""
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image

import scenes
import vis

OUT_DIR = "/tmp/qed/build/preview"
os.makedirs(OUT_DIR, exist_ok=True)


def setup():
    d = scenes.Director()
    t0 = time.time()
    atlas = vis.Atlas(d.charsets())
    print(f"atlas ready ({time.time() - t0:.1f}s)", flush=True)
    d.atlas = atlas
    eng = vis.Engine(atlas)
    return d, eng


def preview(times):
    d, eng = setup()
    for t in times:
        fr = d.frame(t)
        buf = eng.render(fr)
        img = Image.frombytes("RGB", (vis.W, vis.H), buf)
        p = f"{OUT_DIR}/f_{t:07.2f}.png"
        img.save(p)
        print("saved", p, flush=True)


def full(out_path, fps=60, start=0.0, end=None, crf=19):
    d, eng = setup()
    end = end or d.duration
    n0, n1 = int(start * fps), int(end * fps)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{vis.W}x{vis.H}",
           "-r", str(fps), "-i", "-", "-ss", str(start), "-t", str(end - start), "-i", "/tmp/qed/build/master.wav",
           "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p", "-profile:v", "high",
           "-tune", "animation", "-x264-params", "keyint=120:min-keyint=60",
           "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out_path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    for i in range(n0, n1):
        t = i / fps
        fr = d.frame(t)
        buf = eng.render(fr)
        p.stdin.write(buf)
        if (i - n0) % 300 == 0:
            el = time.time() - t0
            done = i - n0 + 1
            print(f"frame {i}/{n1}  t={t:6.2f}s  {done / el:5.1f} fps  eta {(n1 - i) / max(done / el, 1e-3) / 60:4.1f} min", flush=True)
    p.stdin.close()
    p.wait()
    print("done", out_path, f"{time.time() - t0:.0f}s")


if __name__ == "__main__":
    if sys.argv[1] == "preview":
        preview([float(x) for x in sys.argv[2:]])
    elif sys.argv[1] == "full":
        out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/qed/build/mv.mp4"
        st = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
        en = float(sys.argv[4]) if len(sys.argv) > 4 else None
        full(out, start=st, end=en)
