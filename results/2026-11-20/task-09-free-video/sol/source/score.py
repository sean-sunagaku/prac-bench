"""Original stereo music and sound design for the 28-second film."""
from math import pi
from pathlib import Path
import argparse
import wave

import numpy as np

RATE = 48000
LENGTH = 28.0
TAU = 2*pi
RNG = np.random.default_rng(260520)
DRY = np.zeros((int(RATE*LENGTH),2), np.float64)
HALL = np.zeros_like(DRY)


def timebase(seconds):
    return np.arange(round(seconds*RATE), dtype=np.float64) / RATE


def smooth(t, a, b):
    shape = np.clip((t-a)/(b-a),0,1)
    return shape*shape*(3-2*shape)


def midi(n):
    return 440 * 2**((n-69)/12)


def noise(seconds, low, high):
    size = round(RATE*seconds)
    spectrum = np.fft.rfft(RNG.standard_normal(size))
    hz = np.fft.rfftfreq(size, 1/RATE)
    spectrum *= (1-np.exp(-(hz/max(low,1))**3)) * np.exp(-(hz/high)**2.6)
    signal = np.fft.irfft(spectrum, n=size)
    return signal/max(.0001, np.std(signal))


def place(signal, start, gain, pan=0, wet=.35):
    begin = round(start*RATE)
    end = min(len(DRY), begin+len(signal))
    if end<=begin:
        return
    position = np.asarray(pan)*pi/4+pi/4
    if np.ndim(position):
        position = position[:end-begin]
    wavelet = signal[:end-begin] * gain
    left, right = wavelet*np.cos(position), wavelet*np.sin(position)
    DRY[begin:end,0] += left
    DRY[begin:end,1] += right
    HALL[begin:end,0] += left*wet
    HALL[begin:end,1] += right*wet


def tines(note, start, gain, length=3.0, pan=0, muted=0.0):
    t = timebase(length)
    f = midi(note)
    base = np.zeros_like(t)
    for overtone, weight, decay in [(1,1,.72),(2.002,.31,.96),(3.008,.18,1.91),
                                    (4.019,.085,3.08),(5.041,.045,4.24),
                                    (7.087,.042,6.4),(10.12,.011,13.0)]:
        shape = exp(-overtone*.55*muted)
        base += shape*weight * np.exp(-decay*t) * np.sin(TAU*f*overtone*t + .11*overtone)
    hammer = noise(length,1100,5600) * .019 * np.exp(-67*t)
    signal = (base+hammer)*smooth(t,0,.007)*(1-smooth(t,length-.20,length))
    place(signal,start,gain,pan,.72)


def exp(x):
    return np.exp(x)


def bow(note, start, length, gain, pan, lift=False, attack=1.04):
    t = timebase(length)
    f = midi(note)
    envelope = smooth(t,0,attack)*(1-smooth(t,length-.95,length))
    bend = 0.055*np.sin(TAU*(4.4+.012*note)*t+.21*note) + .023*np.sin(TAU*.65*t)
    if lift:
        bend += -.68*np.exp(-2.8*t)
    phase = TAU*f*t + bend + RNG.uniform(0,TAU)
    wavelet = np.zeros_like(t)
    for i in range(1,16):
        shine = (1 + .18*np.sin(TAU*(.21+.034*i)*t + i*.26 + note*.8))
        strength = (1/i**1.23)*exp(-i*.136)
        valley = .78+.22*sin_shape(i, note)
        wavelet += strength*valley*shine * (
            np.sin(i*phase) + .19*np.sin(i*phase+TAU*.085*i*t+.23*i)
            + .12*np.sin(i*phase-TAU*.076*i*t+.32*i))
    bow_hiss = noise(length,330,1900)*.025*(.60+.40*np.sin(TAU*.75*t)**2)
    place((wavelet+bow_hiss)*envelope,start,gain,pan,.61)


def sin_shape(index, note):
    return np.sin(index*1.37+note*.197)


def mist():
    t = timebase(LENGTH)
    fade = smooth(t,0,.20)*(1-smooth(t,26.10,LENGTH))
    brume = (.58+.23*np.sin(TAU*.142*t)+.19*np.sin(TAU*.312*t+1.14))
    for i,pan in enumerate([-.88,.84,0]):
        source = noise(LENGTH,36 if i==2 else 91, 246 if i==2 else 1270)
        gust = np.clip(.64+.21*np.sin(TAU*(.217+.054*i)*t+i*.7),0,1)
        shelter = (1-.39*smooth(t,5.0,10.5)+.62*smooth(t,18.8,21.1))
        place(source*fade*brume*gust*shelter, 0, .049 if i<2 else .060, pan, .108)
    t = timebase(3.12)
    whistle = np.sin(TAU*(372*t - 29.3*t*t + 1.9*t**3))*.27
    slip = smooth(t,0,.63) * (.35+.65*smooth(t,.50,2.94)) * (1-smooth(t,2.91,3.12))
    place((.60*noise(3.12,194,3600)+whistle)*slip, .32, .10, -.65+.53*smooth(t,.40,2.2), .20)


def contact():
    time = 82/24
    t = timebase(.86)
    wavelet = (.80*np.sin(TAU*(65*t + 21*(1-exp(-16*t))/16))
               + .37*np.sin(TAU*97*t)*exp(-9*t))
    grit = noise(.86,420,5230)*exp(-31*t)*.53
    place((wavelet*exp(-6.7*t)+grit)*smooth(t,0,.007),time,.44,.04,.29)
    t = timebase(1.94)
    rub = noise(1.94,214,5100)*smooth(t,0,.031)*exp(-3.62*t)
    place(rub,time+.02,.106,-.24,.22)
    for i in range(35):
        delay = .059+(RNG.random()**2)*1.59
        duration = RNG.uniform(.033,.126)
        t = timebase(duration)
        ping = np.sin(TAU*RNG.uniform(240,970)*t)
        particle = (noise(duration,490,5100)*.34+ping*.35)*exp(-59*t)*smooth(t,0,.0026)
        place(particle,time+delay,.036*(1-delay/2),RNG.uniform(-.89,.95),.21)


def release_sound():
    for i, start in enumerate([6.68,7.02,7.30,7.72,8.24]):
        t = timebase(.83)
        click = noise(.83,580,5100)*exp(-29*t)
        scrape = noise(.83,106,1880)*smooth(t,.007,.13)*exp(-5.8*t)
        ring = (.45*np.sin(TAU*midi(62+3*i)*t)+.18*np.sin(TAU*midi(74+3*i)*t))*exp(-8*t)
        place((.53*click+.32*scrape+.40*ring)*smooth(t,0,.006),start,.102,-.52+i*.26,.37)
    t = timebase(6.5)
    seed = (.51*np.sin(TAU*(90*t + 9.0*t**2)) + .19*np.sin(TAU*(174*t+18*t*t)))
    trace = noise(6.5,327,4170)*(.33+.31*np.sin(TAU*(3.1*t+.28*t*t))**2)
    glow = smooth(t,.04,2.4)*(1-smooth(t,4.1,6.5))
    place((seed*.78+trace*.62)*glow,7.45,.077,.22*np.sin(t*1.3), .82)
    for start, pan in [(11.14,-.49),(12.85,.56),(13.52,-.35),(15.31,.42),(16.55,-.10)]:
        t = timebase(1.53)
        flutter = noise(1.53,460,3500) * (1+.29*np.sin(TAU*(5.8*t-1.2*t*t)))
        envelope = smooth(t,0,.28)*(1-smooth(t,.24,1.53))
        place(flutter*envelope,start,.026,pan,.52)


def dawn_sound():
    start = 19.30
    t = timebase(5.23)
    air = noise(5.23,134,2100) * (.67+.33*np.sin(TAU*.49*t + .8))
    swell = smooth(t,0,.78)*(1-smooth(t,1.94,5.23))
    place(air*swell,start,.105,.38,.62)
    t = timebase(4.3)
    warmth = np.sin(TAU*(48*t + 6*(1-exp(-3*t)))) + .26*np.sin(TAU*93*t)
    place(warmth*exp(-1.3*t)*smooth(t,0,.084)*(1-smooth(t,3.7,4.3)),19.42,.15,0,.44)
    for i, start in enumerate([20.67,21.22,21.86,22.39,22.77,23.42,24.09,24.50,25.16]):
        notes = [74,78,81,86,83,81,76,78,74]
        tines(notes[i],start,.046-i*.002,2.1,(-1)**i*(.59+.04*(i%4)),.03)


def compose():
    # A short recurring figure starts as a question in minor and resolves in D major.
    for note,start,gain,pan in [
        (62,.36,.084,-.34),(69,1.24,.062,.30),(64,2.11,.057,-.05),
        (65,4.40,.070,.36),(62,5.31,.055,-.3),(69,6.20,.068,.35),
        (62,8.44,.080,-.34),(69,9.15,.059,.38),(72,9.63,.064,-.13),
        (74,10.28,.083,.35),(76,11.40,.057,-.22),(77,12.21,.073,.42),
        (74,13.11,.069,-.28),(69,13.53,.064,.34),(72,14.11,.090,-.13),
        (79,15.00,.067,.36),(77,15.47,.074,-.29),(76,16.46,.057,.25),
        (74,17.26,.056,-.07),(81,18.05,.046,.35),
        (62,19.42,.111,-.15),(69,19.98,.073,.31),(74,20.62,.093,-.36),
        (78,21.45,.105,.04),(81,22.01,.080,.40),(76,23.03,.062,-.24),
        (74,24.33,.086,.32),(69,25.30,.062,-.28),(62,25.79,.077,-.03),
    ]:
        tines(note,start,gain,3.0,pan, .37 if start<8 else .17)
    for start,end,notes,gain in [
        (.18,5.28,[38,45,52,57],.048),
        (4.16,9.42,[34,41,53,57],.043),
        (8.14,13.31,[41,48,57,60,64],.064),
        (12.29,17.09,[43,50,57,58,65],.071),
        (16.14,19.43,[45,52,55,62,64,69],.085),
        (19.30,23.99,[38,45,54,57,62,66],.099),
        (22.72,27.91,[38,47,54,57,62,64],.071),
    ]:
        for i,note in enumerate(notes):
            pan = [-.09,-.62,.47,.23,-.44,.62][i]
            bow(note,start+i*.054,end-start-i*.054,gain*(.95 if i==0 else .62),pan, i>2,.96)
    for note, start, end, gain, pan in [
        (57,9.98,11.57,.057,-.42),(60,11.31,13.19,.073,-.34),
        (62,12.89,15.05,.090,.29),(65,14.52,16.64,.083,.15),
        (64,16.31,18.22,.085,.27),(69,17.77,19.40,.074,-.30),
        (66,20.68,24.28,.092,.27),(64,23.48,26.26,.063,-.20)
    ]:
        bow(note,start,end-start,gain,pan,True,.46)


def reverb(send):
    # Decorrelated early reflections leading to a restrained diffuse stereo tail.
    n = len(send)
    tracks = []
    for channel in (0,1):
        duration = 2.72
        t = timebase(duration)
        blur = noise(duration,185,3900)
        ir = blur * exp(-3.26*t) * smooth(t,.019,.061) * .00150
        for delay, gain in [(0.025,.089),(.039,.064),(.062,.044),(.086,.045),(.122,.036),(.148,.035)]:
            ir[round((delay+channel*.007+.006*RNG.random())*RATE)] += gain
        size = 1<<(n+len(ir)-1).bit_length()
        signal = .78*send[:,channel]+.22*send[:,1-channel]
        tracks.append(np.fft.irfft(np.fft.rfft(signal,size)*np.fft.rfft(ir,size),size)[:n])
    return np.stack(tracks,axis=1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output",type=Path)
    args = parser.parse_args()
    mist()
    compose()
    contact()
    release_sound()
    dawn_sound()
    t = timebase(LENGTH)
    mix = (DRY+reverb(HALL))*((1-smooth(t,26.65,LENGTH))*smooth(t,0,.032))[:,None]
    mix = np.tanh(mix*1.22)
    mix *= .865/np.max(np.abs(mix))
    with wave.open(str(args.output), "wb") as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(np.round(mix*32767).astype("<i2").tobytes())


if __name__ == "__main__":
    main()
