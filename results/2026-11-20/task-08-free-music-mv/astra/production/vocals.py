"""The vocal score and performances for 海は上へ落ちる, at 120 BPM in D."""
from dataclasses import dataclass
from pathlib import Path
import io
import os

import numpy as np
import requests
import soundfile as sf
from scipy.signal import resample_poly


ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.environ.get("TIDE_CACHE", "/tmp/umi-astra-production"))
BASE = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:18431")
RATE = 48000
ENGINE_FPS = 93.75
BEAT = .5


@dataclass(frozen=True)
class Phrase:
    bar: int
    offset: float
    words: str
    notes: list
    intensity: float


def phrase(bar, offset, words, syllables, pitches, beats, intensity):
    parts = syllables.split()
    assert len(parts) == len(pitches) == len(beats), (words, len(parts), len(pitches), len(beats))
    assert sum(beats) + offset <= 8.05, (words, sum(beats) + offset)
    return Phrase(bar, offset, words, list(zip(parts, pitches, beats)), intensity)


def refrain(bar):
    return phrase(bar, 0, "海は　上へ落ちる",
                  "う み わ _ う え え お ち る", [66,69,76,0,74,73,71,69,71,66],
                  [.5,.5,1.5,.5,.75,.25,.5,.5,.5,2], 1.0)


def unanswered(bar, last_word):
    return phrase(bar, .25, "届かなかった　ただいま" + ("を" if last_word == "お" else "に"),
                  "と ど か な か っ た た だ い ま " + last_word,
                  [66,69,69,71,73,73,74,76,74,73,71,69],
                  [.5,.5,.5,.5,.5,.25,.75,.75,.5,.5,.75,1.5], .97)


SCORE = [
    phrase(4,.25,"真鍮のキーを　三度打つ","し ん ちゅ う の き い お さ ん ど う つ",
           [66,66,66,64,62,66,66,64,62,62,64,66,62],[.5,.25,.5,.5,.5,.75,.25,.5,.5,.25,.5,.5,1.25],.83),
    phrase(6,.25,"欠けたカップが　かすかに鳴る","か け た か っ ぷ が か す か に な る",
           [64,66,69,66,66,64,62,61,62,64,66,64,61],[.5,.5,.5,.5,.25,.5,.75,.5,.25,.5,.5,.75,1.5],.84),
    phrase(8,.5,"返事を待つ　あいだだけ","へ ん じ お ま つ あ い だ だ け",
           [66,66,69,71,69,66,67,69,71,69,67],[.5,.25,.5,.5,.75,.75,.5,.5,.75,.5,1.5],.87),
    phrase(10,.25,"波も息を　止めていた","な み も い き お と め て い た",
           [66,64,62,66,69,69,71,69,66,64,64],[.5,.5,.75,.5,.5,.75,.75,.5,.5,.5,1.5],.86),
    phrase(12,.25,"水のしずくが　ひとつ","み ず の し ず く が ひ と つ",
           [64,66,67,71,69,67,66,67,69,71],[.5,.5,.75,.5,.5,.5,1,.5,.75,1.5],.91),
    phrase(14,0,"星のほうへ　ほどけた","ほ し の ほ お え ほ ど け た",
           [69,71,73,74,74,73,71,73,74,76],[.5,.5,.75,.5,.5,1,.5,.5,.75,1.75],.95),
    refrain(16),
    phrase(18,.25,"君の尾びれが　月を打つ","き み の お び れ が つ き お う つ",
           [69,71,73,74,73,71,69,67,69,71,74,71],[.5,.5,.5,.75,.5,.5,.75,.5,.5,.5,.75,1.25],.99),
    unanswered(20,"お"),
    phrase(22,0,"青い背中へ　投げた","あ お い せ な か え な げ た",
           [71,73,74,76,74,73,71,69,66,64],[.5,.5,.75,.75,.5,.5,1,.5,.75,1.5],.99),
    phrase(28,.5,"瞳のなか　小さな灯","ひ と み の な か ち い さ な ひ",
           [64,66,67,66,64,62,64,64,66,67,71],[.5,.5,.5,.5,.5,.75,.5,.25,.5,.75,1.5],.76),
    phrase(30,.25,"あれは　ここにいる私","あ れ わ こ こ に い る わ た し",
           [69,66,64,62,64,66,69,66,64,62,61],[.75,.5,1,.5,.5,.5,.5,.5,.5,.75,1],.82),
    phrase(32,.25,"待っていたのは　どっちだろう","ま っ て い た の わ ど っ ち だ ろ お",
           [66,66,69,71,69,66,64,67,67,69,71,69,67],[.5,.25,.5,.5,.5,.5,.75,.5,.25,.5,.75,.5,1.25],.84),
    phrase(34,.25,"今なら　わかる","い ま な ら わ か る",
           [66,69,71,69,66,64,64],[.75,.5,.75,1.5,.75,.75,2],.87),
    phrase(36,.25,"もう一度　あの合図","も お い ち ど あ の あ い ず",
           [64,64,66,67,71,69,71,73,74,76],[.75,.25,.5,.5,1,.5,.75,.75,.5,1.5],.94),
    phrase(38,0,"ひとつ　ふたつ　みっつ","ひ と つ _ ふ た つ _ み っ つ",
           [66,66,66,0,69,69,69,0,76,76,76],[.5,.5,.75,.25,.5,.5,.75,.75,.5,.25,1],.94),
    refrain(40),
    phrase(42,0,"ふたつの尾びれが　月を打つ","ふ た つ の お び れ が つ き お う つ",
           [66,69,71,73,74,73,71,69,67,69,71,74,71],[.5,.5,.5,.25,.75,.5,.5,.75,.5,.5,.5,.75,1.25],1.0),
    unanswered(44,"に"),
    phrase(46,0,"おかえりが　響いた","お か え り が ひ び い た",
           [71,73,74,76,78,76,74,73,74],[.5,.5,.75,.75,1.25,.5,.5,.75,2],1.03),
    phrase(48,.5,"おかえり","お か え り",[71,74,78,76],[.75,.75,1.5,3.5],.96),
    phrase(50,0,"おかえり","お か え り",[69,71,76,74],[.75,.75,1.5,4],.92),
]


def harmony_note(note):
    scale = [n for n in range(24, 100) if n % 12 in {1,2,4,6,7,9,11}]
    return scale[scale.index(note) - 2]


def perform(item, harmony=False):
    preroll = 32
    notes = [dict(frame_length=preroll, lyric="")]
    cursor, note_info = 0., []
    for i, (syllable, pitch, length) in enumerate(item.notes):
        end = cursor + length * BEAT * ENGINE_FPS
        frames = round(end) - round(cursor)
        n = dict(frame_length=frames, lyric="" if syllable == "_" else syllable, id=str(i))
        if pitch:
            n["key"] = harmony_note(pitch) if harmony else pitch
        notes.append(n)
        note_info.append((preroll+round(cursor),preroll+round(end), pitch))
        cursor = end
    notes.append(dict(frame_length=28, lyric=""))
    q = requests.post(BASE+"/sing_frame_audio_query", params={"speaker":6000}, json={"notes":notes}, timeout=120)
    if not q.ok:
        raise ValueError(f"{item.words} {q.status_code} {q.text[:300]}")
    query = q.json()
    f0 = np.asarray(query["f0"])
    for a,b,pitch in note_info:
        if pitch and b-a > 36:
            seconds = np.arange(b-a)/ENGINE_FPS
            depth = .115 if harmony else .20
            start = np.clip((seconds-.23)/.31, 0, 1)
            shape = depth*start*np.sin(2*np.pi*(4.9+(.15 if harmony else 0))*seconds + .6)
            f0[a:b] *= np.exp2(shape / 12)
    query["f0"] = f0.tolist()
    query["outputSamplingRate"] = 24000
    r = requests.post(BASE+"/frame_synthesis", params={"speaker":6000}, json=query, timeout=120)
    r.raise_for_status()
    wave, sr = sf.read(io.BytesIO(r.content), dtype="float32")
    assert sr == 24000
    return resample_poly(wave, 2, 1).astype("float32"), preroll/ENGINE_FPS


def stamp(seconds):
    milli = round(seconds*1000)
    return f"{milli//3600000:02d}:{milli//60000%60:02d}:{milli//1000%60:02d},{milli%1000:03d}"


def main():
    CACHE.mkdir(exist_ok=True, parents=True)
    vocal_cache = CACHE/"phrases"
    vocal_cache.mkdir(exist_ok=True)
    lead = np.zeros(112*RATE, dtype="float32")
    backing = np.zeros_like(lead)
    cues = []
    for item in SCORE:
        start = item.bar * 2 + item.offset * BEAT
        end = start + sum(length for _,_,length in item.notes)*BEAT
        cues.append((start,end,item.words))
        for harm in [False,True]:
            if harm and not (item.bar in {18,22,36} or 40<=item.bar<=50): continue
            cache_file = vocal_cache/f"{item.bar:02d}-{'harmony' if harm else 'lead'}.wav"
            if cache_file.exists():
                wave, _ = sf.read(cache_file, dtype="float32")
                preroll = 32/ENGINE_FPS
            else:
                wave, preroll = perform(item,harm)
                sf.write(cache_file,wave,RATE,subtype="FLOAT")
            offset = round((start-preroll + (.024 if harm else 0))*RATE)
            bus = backing if harm else lead
            bus[offset:offset+len(wave)] += wave*item.intensity
        print(item.bar, item.words, flush=True)
    sf.write(CACHE/"vocal.wav",lead,RATE,subtype="FLOAT")
    sf.write(CACHE/"harmony.wav",backing,RATE,subtype="FLOAT")
    out = ROOT/"release"
    out.mkdir(exist_ok=True)
    (out/"海は上へ落ちる.srt").write_text("\n\n".join(f"{i}\n{stamp(a)} --> {stamp(b)}\n{w}" for i,(a,b,w) in enumerate(cues,1))+"\n",encoding="utf-8")
    breaks = {4,12,16,28,36,40,48}
    lyrics = ["海は上へ落ちる", "THE SEA FALLS UP"]
    for item in SCORE:
        if item.bar in breaks: lyrics.append("")
        lyrics.append(item.words)
    lyrics += ["","歌　VOICEVOX:波音リツ"]
    (out/"海は上へ落ちる 歌詞.txt").write_text("\n".join(lyrics)+"\n", encoding="utf-8")


if __name__ == "__main__":
    main()
