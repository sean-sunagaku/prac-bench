"""Arrange, perform and mix the original score. All musical and drum events are authored here."""
from pathlib import Path
import math
import os
import numpy as np
import soundfile as sf
from scipy import signal
from pedalboard import Compressor, Reverb, HighShelfFilter, PeakFilter

from instruments import RATE, TAU, InstrumentBank, beacon, electric_bass, filt, kick, pad, rhodes, snare, time_axis, wash

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.environ.get("TIDE_CACHE","/tmp/umi-astra-production"))
SECONDS, BEAT = 112, .5
N = RATE*SECONDS
bank = InstrumentBank()
rng = np.random.default_rng(220114)
buses = {name:np.zeros((2,N),dtype="float32") for name in
         ["drums","perc","bass","keys","guitar","pads","bow","signal","sea","lead","harmony"]}
kicks = []

# Bass notes and close voicings. The F-sharp and C-sharp inversions keep the
# harmony moving underneath the recurring F-sharp / A / E lantern signal.
CHORDS = {
    "Bm9": (35,[57,62,66,69,73]),
    "G9": (31,[55,59,62,66,69]),
    "Df": (30,[57,62,64,66,69]),
    "A9": (33,[57,61,64,69,71]),
    "D9": (38,[57,61,64,66,69]),
    "Ac": (37,[57,61,64,69,71]),
    "E9": (40,[55,59,62,66,71]),
    "As": (33,[55,59,62,64,69]),
    "A7": (33,[55,57,61,64,69]),
    "Fsm": (30,[57,61,64,68,73]),
    "Ag": (31,[57,61,64,69,71]),
    "D6": (38,[57,59,62,64,66]),
    "Gd": (38,[55,59,62,66,69]),
}
REFRAIN=["D9","Ac","Bm9","G9","Df","A9","E9","As"]
CHANGES = (["Bm9","G9","Df","As"] + ["Bm9","G9","Df","A9"]*2 + ["E9","G9","Df","As"]
           + REFRAIN + ["Bm9","G9","Df","A9"]
           + ["E9","G9","Df","A9","Bm9","G9","Df","A9"]
           + ["E9","G9","Df","As"] + REFRAIN
           + ["G9","Ag","Fsm","As","D6","Bm9","Gd","D6"])
assert len(CHANGES)==56


def put(bus, second, wave, gain, pan=0):
    offset = round(second*RATE)
    start, src = max(0,offset), max(0,-offset)
    length = min(wave.shape[-1]-src,N-start)
    if length<=0: return
    w = wave[...,src:src+length]
    angle = (pan+1)*math.pi/4
    target=buses[bus][:,start:start+length]
    if w.ndim == 1:
        target[0] += w*gain*math.cos(angle)
        target[1] += w*gain*math.sin(angle)
    else:
        target[0] += w[0]*gain
        target[1] += w[1]*gain


def drum(second,note,gain,pan=0,kit=0):
    wave=bank.play(kit,note,2.,True)
    put("perc" if note in [42,44,46,49,51,54,69,70,75,82] else "drums",second,wave,gain,pan)


def kick_at(second,velocity):
    kicks.append(second)
    put("drums",second,kick_wave,.88*velocity)
    drum(second+.001,36,.26*velocity)


def backbeat(second,velocity,wide):
    i=int(second*11)%len(snares)
    put("drums",second,snares[i],.33*velocity,.03)
    drum(second+.001,38,.48*velocity,-.03)
    if wide:
        drum(second+.014,39,.25*velocity,.32)
        drum(second+.024,39,.14*velocity,-.48)


kick_wave=kick()
snares=[snare(725+i) for i in range(7)]


def rhythm(bar,kind):
    s=bar*2
    if kind in ["intro","coda","still"]: return
    chorus=kind in ["lift","last","tide","tag"]
    velocity=1 if chorus else (.79 if kind=="build" else .68)
    trip = bar%4
    if kind=="verse":
        kick_positions=([0,2.5],[0,1.75,3.5],[0,2,2.75],[0,1.5,2.75])[trip]
    elif kind=="quiet":
        kick_positions=[0,2.75] if bar%2==0 else [0,2.5]
    elif kind=="build":
        kick_positions=[0,2,3.5] if bar%2==0 else [0,1.5,2,3.25]
    elif kind=="tide":
        kick_positions=([0,.75,2,3.5],[0,1.5,2.75],[0,.75,2.25,3.5],[0,1.5,2.5,3.25])[trip]
    else:
        kick_positions=([0,1.5,2.5,3.5],[0,1.75,2.5],[0,.75,2,3.5],[0,1.5,2.75,3.5])[trip]
    stop=2.62 if bar in [15,39] else (3.52 if bar in [27,51] else 4)
    for j,k in enumerate(kick_positions):
        if k<stop: kick_at(s+k*BEAT,velocity*(1 if j==0 else [.91,.80,.87][j%3]))
    hits = [2] if kind in ["quiet"] or bar in [4,5] else [1,3]
    for j,h in enumerate(hits):
        if h>=stop: continue
        if kind in ["verse","quiet"] and bar<8 or kind=="quiet":
            drum(s+h*BEAT+.012,37,.37,-.10)
            put("drums",s+h*BEAT+.014,snares[(bar+j)%7],.074)
        else:
            backbeat(s+h*BEAT+.008,velocity*(.91+.09*j),chorus or kind=="build")
    if chorus or kind=="build" or bar%4==3:
        ghosts=[.75,2.72] if bar%2==0 else [1.68,2.75,3.81]
        for g in ghosts:
            if g<stop: drum(s+g*BEAT+.005,40,.075+(.06 if chorus else 0),-.18)
    steps=16 if chorus or kind=="build" else 8
    for i in range(steps):
        pos=i*4/steps
        if pos>=stop or (steps==16 and i%4==3 and (i+bar)%3==0): continue
        accent = [1,.39,.73,.40][i%4] if steps==16 else [1,.65,.87,.55][i%4]
        if steps==8 and kind=="quiet" and i%2: continue
        timing=(.014 if i%2 and steps==16 else .004)+rng.uniform(-.003,.003)
        if i%4==2 and chorus and (i+2*bar)%8==2:
            drum(s+pos*BEAT+timing,46,.17*velocity,.36)
        else:
            drum(s+pos*BEAT+timing,42,(.16 if steps==16 else .18)*accent*velocity,.28)
        if chorus and i%2==1:
            drum(s+pos*BEAT+.021,82,.105*accent,-.43)
    if chorus:
        for p in ([.5,2.25] if bar%2==0 else [1.5,3.25]):
            if p<stop: drum(s+p*BEAT+.014,75,.085,-.45)
    if bar in [11,23,27,35,47,51]:
        for i,n in enumerate([48,45,43]):
            pos=3.25+.25*i
            if pos<stop: drum(s+pos*BEAT,n,.27+.035*i,(-.33,.04,.34)[i])
    if bar in [15,39]:
        for i in range(7 if bar==39 else 5):
            u=1+i*.25
            if u<stop: drum(s+u*BEAT,40,.17+.022*i,(-1)**i*.27)
    if bar in [16,24,40,44,48]:
        drum(s+.01,49,.29 if bar in [16,40] else .17,-.48)
        drum(s+.04,51,.11,.45)


def bassline(bar,kind,root):
    s=bar*2
    if kind in ["intro","coda","still"]:
        if bar in [0,1,28,29,30,31,52,54,55]:
            put("bass",s,electric_bass(root,1.34 if bar!=55 else 1.42,.31),.29)
        return
    if kind in ["lift","last","tide","tag"]:
        events=[(0,0,.77),(.82,12,.32),(1.5,0,.49),(2.25,7,.40),(2.82,12,.34),(3.5,0,.40)]
        if bar%2: events=[(0,0,1.25),(1.5,7,.32),(2,0,.68),(2.93,12,.24),(3.5,-2,.34)]
    elif kind=="quiet":
        events=[(0,0,1.55),(2.5,7,.62)]
    else:
        events=[(0,0,1.22),(1.75,12,.31),(2.5,0,.66),(3.5,7,.34)]
        if bar%2: events=[(0,0,1.62),(2,7,.39),(2.75,0,.65)]
    for i,(beat,interval,length) in enumerate(events):
        if bar in [15,39] and beat+length>2.66: continue
        if i==len(events)-1 and bar%2==1 and interval==-2:
            pitch=CHORDS[CHANGES[bar+1]][0]+(12 if root<34 else 0)-1
        else: pitch=root+interval
        loud=.58 if kind in ["lift","last","tide","tag"] else .43
        put("bass",s+beat*BEAT,electric_bass(pitch,length*BEAT,.8,-1 if i and interval==12 else 0),loud*(1 if i==0 else .84))
        put("bass",s+beat*BEAT+.002,bank.play(33,pitch,length*BEAT),.17 if loud>.5 else .11)


def comp(bar,kind,tones):
    s=bar*2
    lively=kind in ["lift","last","tide","tag"]
    quiet=kind in ["still","coda","intro"]
    held=1.13 if bar in [15,39] else (1.78 if not quiet else 1.86)
    for j,note in enumerate(tones):
        if j==0 and not quiet: continue
        put("pads",s+j*.012,pad(note,held,.62*bar+j),(.044 if lively else .034)*(1 if j<4 else .65))
    # Piano attacks are played as little two-hand gestures, with space left for the voice.
    pulses = [(0,1.13,.95),(2.75,.43,.53)] if not quiet else [(0,1.62,.87)]
    if lively: pulses=[(0,.60,.98),(1.5,.31,.65),(2.75,.47,.73)]
    if bar in [15,39]: pulses=[(0,.95,.83)]
    for beat,held,accent in pulses:
        for j,note in enumerate(tones):
            delay=j*(.018 if quiet else .009)+rng.uniform(-.002,.002)
            pan=-.30+(j-2)*.09
            put("keys",s+beat*BEAT+delay,rhodes(note,held,.80),accent*(.102 if quiet else .088),pan)
            put("keys",s+beat*BEAT+delay+.005,bank.play(0,note,held),accent*(.13 if quiet else .085),pan+.08)
    # Alternating picked upper strings, then a stereo strum in the refrain.
    if quiet:
        if bar in [1,3,28,30,53,54]:
            for j,b in enumerate([1.5,2.25,3]):
                n=tones[[1,3,4][j]]
                put("guitar",s+b*BEAT,bank.play(24,n,.42),.16-j*.023,.31)
    elif lively:
        for beat in ([.5,1.75,2.5,3.5] if bar%2==0 else [.5,1.5,2.75,3.5]):
            for j,n in enumerate(tones[1:4]):
                hold=.16 if beat not in [1.75,2.75] else .23
                put("guitar",s+beat*BEAT+j*.007,bank.play(27,n,hold),.077,.58)
                put("guitar",s+beat*BEAT+.017+j*.008,bank.play(26,n,hold),.060,-.54)
        if kind in ["last","tide"]:
            for j,b in enumerate([.25,.75,1.25,1.75,2.25,2.75,3.25,3.75]):
                n=(tones[2:]+tones[:2])[[0,1,2,1,3,1,2,1][j]]+(12 if j%4==0 else 0)
                put("guitar",s+b*BEAT,bank.play(31,n,.12),.075,-.19)
    else:
        for j,b in enumerate([.5,1.75,2.5,3.25]):
            if bar in [15,39] and b>2.3: continue
            put("guitar",s+b*BEAT,bank.play(27,tones[[1,3,2,4][(j+bar)%4]],.22),.16 if j%2==0 else .12,.38)


def bowed_line(bar, notes, level):
    for beat,n,dur in notes:
        y=bank.play(48,n,dur*BEAT).copy()
        t=np.arange(len(y))/RATE
        y*= (1-np.exp(-t/.090))*(.78+.22*np.sin(np.clip(t/(dur*BEAT),0,1)*np.pi))
        put("bow",bar*2+beat*BEAT,y,level,-.30)
        put("bow",bar*2+beat*BEAT+.021,y,level*.58,.46)


for i,name in enumerate(CHANGES):
    if i<4: kind="intro"
    elif i<12: kind="verse"
    elif i<16: kind="build"
    elif i<24: kind="lift"
    elif i<28: kind="tide"
    elif i<32: kind="still"
    elif i<36: kind="quiet"
    elif i<40: kind="build"
    elif i<48: kind="last"
    elif i<52: kind="tag"
    else: kind="coda"
    root,voicing=CHORDS[name]
    rhythm(i,kind)
    bassline(i,kind,root)
    comp(i,kind,voicing)
    if i in [13,37]: bowed_line(i,[(0,67,2.6),(3,69,.8)],.10)
    if i in [14,38]: bowed_line(i,[(0,69,2),(2,71,1),(3,73,.9)],.13)
    if i in [17,41]: bowed_line(i,[(1.5,73,1.3),(3,71,.8)],.13 if i==17 else .20)
    if i in [19,43]: bowed_line(i,[(1,67,1.3),(2.5,69,.7),(3.5,71,.4)],.16)
    if i in [21,45]: bowed_line(i,[(1.5,76,1.2),(3,73,.9)],.14)
    if i in [23,47]: bowed_line(i,[(0,71,1.3),(1.5,73,1),(2.5,74,1.3)],.18)
    if i in [48,49,50,51]: bowed_line(i,[(0,[74,73,73,71][i-48],3.6)],.17)


def transmit(second,notes=(66,69,76),level=.38, spacing=(0,.25,.50),tactile=True):
    for j,(note,dt) in enumerate(zip(notes,spacing)):
        put("signal",second+dt,beacon(note,.19 if j<2 else .47),level*(.85 if j<2 else 1),(-.20,.06,.25)[j])
        if tactile:
            drum(second+dt-.008,37,level*.39,-.28)


transmit(.30,level=.42,spacing=(0,.36,.73))
transmit(4.4,notes=(78,81,88),level=.20,spacing=(0,.36,.73),tactile=False)
for sec in [14.95,23.0,49.0,52,54.15,71.0]:
    transmit(sec,level=.22 if sec<48 else .33,spacing=(0,.26,.52),tactile=False)
for s,n in [(76,66),(77,69),(78.25,76)]:
    put("signal",s,beacon(n,.20),.34,.10)
    drum(s-.008,37,.19,-.20)
transmit(104.35,level=.34,spacing=(0,.36,.73))
transmit(108.35,notes=(78,81,88),level=.18,spacing=(0,.36,.73),tactile=False)

# Foam and a low sliding, voiced cetacean call are synthesized as part of the score.
for channel in [0,1]:
    noise=rng.normal(0,1,N).astype("float32")
    foam=filt(noise,[340,5500],"bandpass")
    surf=filt(noise,[65,650],"bandpass")
    tm=np.arange(N,dtype="float32")/RATE
    surf_env=(.25+.75*(.5+.5*np.sin(TAU*tm/6.8+.7*channel))**1.9)
    sea_level=np.interp(tm,[0,6,10,25,32,51,56,64,75,80,99,104,108,112],
                        [.14,.14,.045,.045,.060,.055,.15,.095,.055,.050,.045,.15,.13,0])
    buses["sea"][channel]+=(.35*foam+.90*surf)*surf_env*sea_level

for s,d,seed,lvl in [(6.8,1.12,0,.13),(22.5,1.46,1,.14),(29.5,2.14,2,.30),
                      (47,1,3,.16),(53.8,2.12,4,.19),(70.3,1.65,5,.16),
                      (77.0,1.96,6,.30),(94.4,1.56,7,.18),(102.3,1.66,8,.20)]:
    for channel,pan in [(0,-.72),(1,.72)]:
        put("sea",s,wash(d,seed+841+channel),lvl,pan)
for s,length,from_f,to_f,level in [(1.5,3.6,146,82,.11),(48.1,4,146,92,.16),(56.7,3.6,112,78,.09),(101.4,3.0,120,83,.12),(107,3.7,178,102,.10)]:
    t=time_axis(length)
    hz=to_f+(from_f-to_f)*(.5+.5*np.cos(np.pi*t/length))+2.3*np.sin(TAU*.76*t)
    phase=TAU*np.cumsum(hz)/RATE
    voice=(np.sin(phase)+.33*np.sin(2*phase+.7*np.sin(TAU*.31*t))+.09*np.sin(3.02*phase))*np.sin(np.pi*t/length)**1.4
    put("sea",s,voice.astype("float32"),level,-.22)
    put("sea",s+.14,voice.astype("float32"),level*.74,.48)


def singer(name,level):
    file=CACHE/f"{name}.wav"
    wave,_=sf.read(file,dtype="float32")
    wave=filt(wave,93,"highpass")
    wave=PeakFilter(cutoff_frequency_hz=310,gain_db=-1.6,q=.8)(wave,RATE)
    wave=HighShelfFilter(cutoff_frequency_hz=7200,gain_db=1.5,q=.7)(wave,RATE)
    wave=Compressor(threshold_db=-18,ratio=2.45,attack_ms=14,release_ms=97)(wave,RATE)
    voiced=abs(wave)>.042
    active=np.sqrt(np.mean(wave[voiced]**2))
    wave*=level/active
    return wave


put("lead",0,singer("vocal",.245),1,0)
h=singer("harmony",.13)
put("harmony",0,h,.72,-.48)
put("harmony",.018,h,.64,.44)

# Isolate each attack from the bass sustain without suppressing the singer.
duck=np.ones(N,dtype="float32")
for s in kicks:
    start=round(s*RATE)
    t=time_axis(.39)
    env=1-.66*np.exp(-t/.095)*np.minimum(t/.0035,1)
    target=duck[start:start+len(env)]
    np.minimum(target,env[:len(target)],out=target)
buses["bass"] *= duck
buses["pads"] *= .63+.37*duck
buses["guitar"] *= .81+.19*duck
buses["pads"]=filt(buses["pads"],150,"highpass")
buses["bow"]=filt(buses["bow"],155,"highpass")
buses["guitar"]=filt(buses["guitar"],145,"highpass")
buses["keys"]=filt(buses["keys"],93,"highpass")
buses["perc"]=HighShelfFilter(cutoff_frequency_hz=8200,gain_db=-1.8)(buses["perc"],RATE)


def echoes(bus, beat_length, gains):
    out=np.zeros_like(bus)
    for i,gain in enumerate(gains,1):
        skip=round(i*beat_length*BEAT*RATE)
        feed=bus[::-1] if i%2 else bus
        out[:,skip:]+=gain*feed[:,:-skip]
    return filt(filt(out,360,"highpass"),5200)


ambient_source=(.22*buses["keys"]+.28*buses["pads"]+.25*buses["guitar"]+
                .32*buses["bow"]+.42*buses["signal"]+.20*buses["lead"]+.36*buses["harmony"]+.06*buses["drums"])
room_source=.14*buses["drums"]+.14*buses["perc"]+.08*buses["lead"]
ambient=Reverb(room_size=.77,damping=.57,wet_level=1.,dry_level=0.,width=.98)(ambient_source,RATE)
room=Reverb(room_size=.40,damping=.73,wet_level=.72,dry_level=0.,width=.87)(room_source,RATE)
mix=sum(buses.values(),np.zeros((2,N),dtype="float32"))
mix+=filt(room,180,"highpass")
pre=round(.036*RATE)
mix[:,pre:]+=filt(ambient,195,"highpass")[:,:-pre]
mix+=echoes(buses["signal"],.75,[.34,.19,.105,.06])
mix+=echoes(buses["guitar"],.75,[.17,.085])
mix+=echoes(buses["lead"],.75,[.096,.045])
mix+=echoes(buses["harmony"],1.,[.10,.05])
mix=filt(mix,26,"highpass")
mix=Compressor(threshold_db=-8,ratio=1.65,attack_ms=29,release_ms=130)(mix,RATE)
mix=np.tanh(mix*1.12).astype("float32")/1.12
mix[:,:round(.035*RATE)]*=np.linspace(0,1,round(.035*RATE))
tail=round(1.28*RATE)
mix[:,-tail:]*=np.cos(np.linspace(0,np.pi/2,tail))**1.8
CACHE.mkdir(parents=True,exist_ok=True)
sf.write(CACHE/"mix.wav",mix.T,RATE,subtype="FLOAT")
for bar in [0,4,12,16,24,28,36,40,48,52]:
    seg=mix[:,bar*2*RATE:(bar+4)*2*RATE]
    print(f"bar {bar:02}  peak {np.max(abs(seg)):.3f}  RMS {np.sqrt(np.mean(seg**2)):.3f}")
