"""Instrument voices and a small sampler for the system General MIDI instrument bank."""
from functools import lru_cache
from pathlib import Path
import math
import struct

import numpy as np
from scipy import signal

RATE = 48000
TAU = 2*np.pi
BANK_PATH = Path("/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")


def chunks(data):
    pos = 0
    while pos+8 <= len(data):
        kind = data[pos:pos+4]
        size, = struct.unpack_from("<I", data, pos+4)
        payload = data[pos+8:pos+8+size]
        if kind == b"LIST":
            yield payload[:4], payload[4:]
        else:
            yield kind, payload
        pos += 8+size+(size%2)


class InstrumentBank:
    def __init__(self, path=BANK_PATH):
        root = dict(chunks(path.read_bytes()[12:]))
        self.waves, self.regions = [], {}
        for _, blob in chunks(root[b"wvpl"]):
            w = dict(chunks(blob))
            fmt, channels, rate, _, _, bits = struct.unpack_from("<HHIIHH", w[b"fmt "])
            assert fmt == 1 and channels == 1
            if bits == 8:
                a = (np.frombuffer(w[b"data"], "u1").astype("float32")-128)/128
            else:
                a = np.frombuffer(w[b"data"], "<i2").astype("float32")/32768
            self.waves.append((rate,a))
        for _, blob in chunks(root[b"lins"]):
            inst = dict(chunks(blob))
            _, bank, program = struct.unpack_from("<III",inst[b"insh"])
            regions = []
            for _, blob2 in chunks(inst[b"lrgn"]):
                reg = dict(chunks(blob2))
                low, high, vlo, vhi = struct.unpack_from("<HHHH",reg[b"rgnh"])
                ws = reg[b"wsmp"]
                _, root_key, cents, _, _, loops = struct.unpack_from("<IHhiII",ws)
                index = struct.unpack_from("<I", reg[b"wlnk"],8)[0]
                loop = struct.unpack_from("<II",ws,28) if loops else None
                regions.append((low,high,vlo,vhi,root_key,cents,index,loop))
            self.regions[bank,program] = regions

    @lru_cache(maxsize=768)
    def play(self, program, key, duration, drum=False, velocity=92):
        regions = self.regions[(1<<31 if drum else 0,program)]
        reg = next(r for r in regions if r[0]<=key<=r[1] and r[2]<=velocity<=r[3])
        _,_,_,_,base,cents,index,loop = reg
        source_rate, sample = self.waves[index]
        if drum:
            length = min(duration,len(sample)/source_rate*2)
        else:
            length = duration+.26
        t = time_axis(length)
        position = t * source_rate * 2**((key-base+cents/100)/12)
        if loop and not drum:
            start, size = loop
            position = np.where(position < start+size, position, start+np.mod(position-start,size))
        wave = np.interp(position, np.arange(len(sample)),sample,left=0,right=0).astype("float32")
        wave /= max(np.max(abs(wave)),.23)
        if not drum:
            if program in [0,4,11,24,26,27,31,33]:
                wave *= .70*np.exp(-t/(1.0 if program in [0,4,11] else .48))+.30
            wave *= np.exp(-np.maximum(t-duration,0)/.052)
        fade = min(len(wave),round(.007*RATE))
        if fade:
            wave[-fade:] *= np.linspace(1,0,fade)
        return wave


@lru_cache(maxsize=320)
def time_axis(seconds):
    return (np.arange(max(1,round(seconds*RATE)),dtype="float64")/RATE)


def freq(key):
    return 440*2**((key-69)/12)


def filt(wave, cutoff, mode="lowpass", order=2, axis=-1):
    sos = signal.butter(order,cutoff,btype=mode,fs=RATE,output="sos").astype("float32")
    return signal.sosfilt(sos,wave.astype("float32"),axis=axis).astype("float32")


def tone_end(y, t, held, release):
    tail = np.exp(-np.maximum(t-held,0)/release)
    return (y*tail*np.clip((t[-1]-t)/.012,0,1)).astype("float32")


def rhodes(note, seconds, force=.77):
    t = time_axis(seconds+.43)
    f = freq(note)
    phi = TAU*f*t
    strike = (1.6*force*np.exp(-t/.16)+.15)*np.sin(2*phi)
    w = .70*np.sin(phi+strike)+.20*np.sin(2*phi+.70*strike)+.10*np.sin(3.005*phi)*np.exp(-t/.50)
    trem = 1+.038*np.sin(TAU*3.6*t+note)
    w *= (1-np.exp(-t/.005))*(.66*np.exp(-t/.65)+.34*np.exp(-t/2.7))*trem
    return tone_end(w,t,seconds,.09)


def pad(note, seconds, variation):
    t = time_axis(seconds+.80)
    f = freq(note)
    phi = TAU*f*t
    drift = .24*np.sin(TAU*.72*t+variation)+.10*np.sin(TAU*4.8*t+note*.65)
    left, right = np.zeros_like(t), np.zeros_like(t)
    for h,gain in [(1,.72),(2,.26),(3,.15),(4,.065),(5,.052),(7,.027)]:
        left += gain*(.60*np.sin(h*(phi*.9982+drift))+.40*np.sin(h*(phi*1.0012-drift*.40)+.7))
        right += gain*(.58*np.sin(h*(phi*1.0021+drift*.65)+.36)+.42*np.sin(h*(phi*.9993-drift*.58)+.5))
    env = (1-np.exp(-t/.26))*(.94+.06*np.sin(TAU*.45*t+variation))
    return np.stack([tone_end(left*env,t,seconds,.21),tone_end(right*env,t,seconds,.21)])


def electric_bass(note, seconds, strength, glide=0):
    t = time_axis(seconds+.13)
    f = freq(note)
    phi = TAU*f*(t + (2**(glide/12)-1)*.060*(1-np.exp(-t/.060)))
    wave = .88*np.sin(phi)+.33*np.sin(2*phi+.19)*(.48+.52*np.exp(-t/.16))
    for h in range(3,11):
        wave += strength*.54/h*np.cos(h*phi-.3*h)*np.exp(-t*(h*.85+2))
    wave = np.tanh(wave*1.36)*(.74+.26*np.exp(-t/.18))*(1-np.exp(-t/.005))
    return tone_end(wave,t,seconds,.027)


def beacon(note, held=.28):
    t = time_axis(held+1.12)
    p = TAU*freq(note)*t
    wave = .64*np.sin(p+.82*np.exp(-t/.16)*np.sin(2.00*p))
    wave += .20*np.sin(p*2.003)*np.exp(-t/.38)+.075*np.sin(4.96*p+.4)*np.exp(-t/.19)
    wave *= (1-np.exp(-t/.009))*(.68*np.exp(-t/.47)+.32*np.exp(-t/.93))
    return tone_end(wave,t,held,.28)


def kick():
    t=time_axis(.55)
    phase=TAU*(48*t+98*.036*(1-np.exp(-t/.036))+95*.006*(1-np.exp(-t/.006)))
    transient=.07*np.sin(TAU*1670*t)*np.exp(-t/.005)
    return ((np.tanh(1.6*np.sin(phase))*(1-np.exp(-t/.0017))*np.exp(-t/.126))+transient).astype("float32")


def snare(seed):
    rng=np.random.default_rng(seed)
    t=time_axis(.32)
    n=filt(rng.normal(0,1,len(t)),[820,10200],"bandpass")
    body_phase=TAU*(178*t+91*.019*(1-np.exp(-t/.019)))
    body=.50*np.sin(body_phase)*np.exp(-t/.064)+.16*np.sin(body_phase*1.67)*np.exp(-t/.035)
    burst=.82*np.exp(-t/.067)+.20*np.exp(-np.maximum(t-.018,0)/.04)*(t>.018)
    return ((body+n*burst*.64)*(1-np.exp(-t/.001))).astype("float32")


def wash(seconds,seed,ascending=True):
    rng=np.random.default_rng(seed)
    t=time_axis(seconds)
    breath=filt(rng.normal(0,1,len(t)),[420,9500],"bandpass")
    lower=filt(breath,1900)
    pos=t/seconds if ascending else 1-t/seconds
    env=np.maximum(0,pos)**2.3
    return ((lower*(1-pos)+breath*pos)*env*.63*np.clip((seconds-t)/.045,0,1)).astype("float32")
