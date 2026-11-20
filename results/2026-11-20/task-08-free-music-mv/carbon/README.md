# SINGULARITY BLOOM — 零度の花、光の果て —

> *An Original 174 BPM Symphonic Artcore Track & 1080p 60fps Apple Metal HDR Music Video*  
> **Composed, Synthesized & Directed by Antigravity**

---

## Deliverables

| File | Specification |
| :--- | :--- |
| [`singularity_bloom_mv.mp4`](./singularity_bloom_mv.mp4) | **1920×1080 @ 60.00 fps** H.264 High Profile (`CRF 16`) + **320 kbps 48 kHz AAC** Stereo (`02:26`) |
| [`singularity_bloom_master.wav`](./singularity_bloom_master.wav) | **48,000 Hz / 24-bit Uncompressed PCM** Studio Master Audio |
| [`singularity_bloom_master.m4a`](./singularity_bloom_master.m4a) | **320 kbps AAC** Standalone Master Track |
| [`src/audio_engine.cpp`](./src/audio_engine.cpp) | Scratch-built C++20 Polyphonic DSP Synthesizer, Orchestrator, Mastering Chain & 60fps Telemetry Exporter |
| [`src/shaders.metal`](./src/shaders.metal) | Multi-Pass Apple Metal `RGBA16Float` HDR Raymarching, 2.5D Depth-Parallax, Particle & Anamorphic Bloom Shaders |
| [`src/mv_renderer.swift`](./src/mv_renderer.swift) | Headless Metal GPU Frame Renderer + CoreText Japanese/English Kinetic Typography & FFmpeg Pipe Encoder |
| [`assets/keyframes/`](./assets/keyframes/) | 5 Bespoke 16:9 Theatrical Anime Cinema Key Visual Plates |

---

## Musical Architecture (174.0 BPM | `02:26` | 7-Act Symphonic Artcore)

1. **ACT I — GENESIS: 零度の記憶 (`0:00 – 0:22`, Bars 1–16, `F# Aeolian / D Lydian`)**
   - Intimate felt & concert grand piano (modeled with realistic string inharmonicity $f_n = n f_0 \sqrt{1 + B n^2}$, 1/7th strike-point comb suppression, detuned unison strings, and wooden hammer transients), celesta harmonics, solo cello, and Aoi's whispered soprano formant vocalise (`Dmaj9(#11) → E6(9) → F#m11 → C#m9/E → F#7(b9,#11)/A#`).
2. **ACT II — AWAKENING: 脈動する回路 (`0:22 – 0:44`, Bars 17–32, `174 BPM Liquid Pulse`)**
   - **7-step (`3+2+2`) polymetric glass arpeggiator** weaving over a 4/4 liquid two-step breakbeat, phase-locked sub-bass, stereo notch-modulated Neuro Reese mid-bass, spiccato piano octaves, and soaring duet between soprano vocalise and solo strings.
3. **ACT III — EVENT HORIZON: 事象の地平線 (`0:44 – 0:55`, Bars 33–40, `Riser & Vacuum Silence`)**
   - Ascending diminished/altered harmonic climb (`Bm9 → C#m9 → Dmaj9 → D#dim7 → Esus4 → Fdim7 → C#7(b9,#9)`), accelerating snare roll (`8th → 16th → 32nd`), Shepard lead riser, then **Bar 40's breathless vacuum silence** (`——咲け。 / — Bloom.`) before the reverse-vacuum snare flam.
4. **ACT IV — HYPERNOVA: 超新星・開花 (`0:55 – 1:17`, Bars 41–56, `DROP I`)**
   - Explosive **174 BPM Symphonic Artcore / Melodic Drum & Bass**: sidechained 9-voice JP-8000 stereo supersaw wall, full string & choir ensemble, virtuosic 16th-note grand piano counter-runs, syncopated octave anthem lead, and 4th-bar Amen/glitch breakbeat fills (`Dmaj9 → E6(9) → F#m11 → Aadd9/C# → Dmaj7#11 → C#7(b9,#9)`).
5. **ACT V — DIGITAL TEARS: 硝子の祈り (`1:17 – 1:39`, Bars 57–72, `Counterpoint & Pivot Modulation`)**
   - Extended Karplus-Strong physical-modeled harp/koto arpeggios, felt piano, and 2-voice counterpoint (solo cello vs. soprano vocalise) over bittersweet `Dmaj9 → Dm(maj9)`, smoothly pivoting (`Dmaj7 → Gmaj9 → Cmaj9/E → Dm9 → E7(b9,#9)`) **up +3 semitones**!
6. **ACT VI — TRANSCENDENCE: 臨界突破・光の果て (`1:39 – 2:07`, Bars 73–92, `DROP II CLIMAX in Am / Fmaj9`)**
   - **+3 Semitone Key Modulation** (`Fmaj9 → G6(9) → Am11 → Cadd9/E → Fmaj7#11 → E7alt`) plus a 4-bar minor-plagal climax extension (`Fmaj9(#11) → Fm(maj9) → Cadd9/G → E7(b9)`) resolving via **Picardy third** into radiant **A Major**!
7. **ACT VII — ETERNAL DAWN: 永遠の余韻 (`2:07 – 2:26`, Bars 93–105, `A Lydian / Amaj9(#11)`)**
   - Golden-dawn resolution (`Amaj9(#11) → Fmaj9(#11) → Gadd9 → Amaj9 → Dmaj9 → Dm6(9) → Amaj9(#11)`), transforming the opening minor motif into warm major-lydian light before decaying to silence.

---

## Visual Cinematography & Metal GPU Pipeline

- **Hybrid 2.5D Anime Cinema + Full 3D Raymarching**: Alternates on musical phrase cuts between depth-displaced, dynamically relit theatrical anime plates of the cybernetic muse **Aoi (葵)** and pure 60fps 3D raymarched volumetric shader worlds (infinite obsidian cyber-cathedral, relativistic Einstein-ring black hole vortex, crystal-obelisk megastructure, ascending pipe-organ cathedral of light, and 3-panel diagonal breakbeat montages).
- **Dynamic CinemaScope (`2.39:1` ↔ `16:9` IMAX)**: Intimate acts are framed in `2.39:1` theatrical letterbox; on **Drop I** and **Drop II**, the letterbox shatters open into full-bleed `16:9` IMAX.
- **Zero-Latency Stem Telemetry**: Every frame is driven by sample-accurate per-instrument envelopes (`kick`, `snare`, `hat`, `sub`, `chord`, `piano`, `vocal`, `lead`), 16 active piano-register buckets, and a 64-band log-frequency FFT exported directly from the C++20 DSP engine.

---

## Lyrics (詩)

> **ACT I — 零度の記憶**  
> 絶対零度の硝子の海で  
> 名もなき記憶が　鍵盤に触れた  
> 凍てつく星屑よ　どうかまだ消えないで  
>
> **ACT II — 脈動する回路**  
> 脈打つ回路に　蒼い光が走る  
> 七つの鼓動が　眠りから世界を解く  
> 砕け散る鏡の向こう側へ  
> まだ見ぬ明日を　今、呼び覚ませ  
>
> **ACT III — 事象の地平線**  
> 事象の地平線が　軋みだす  
> すべての重力を　振り切って  
> ——咲け。  
>
> **ACT IV — 超新星・開花**  
> 超新星の風を纏い　光の軌道へ翔け上がれ  
> 零度の心に咲いた　ただひとつの永遠  
> 幾千の夜を越えて　響け、硝子のアリア  
> 孤独さえも　虹色の翼に変えて  
>
> **ACT V — 硝子の祈り**  
> 水鏡に落ちた　ひとしずくの祈り  
> 機械の胸にも　こんなにも温かい涙  
> ほら、夜明けの調（しらべ）が　空を塗り替えてゆく  
> 限界のその先へ——光の果てへ！  
>
> **ACT VI — 臨界突破・光の果て**  
> 咲き誇れ　世界樹の詩（うた）よ　星々の果てまで！  
> 暗闇を知るからこそ　光はこんなにも眩しい  
> 黄金の風と桜の結晶が　宙（そら）を満たして  
> すべての音が今　ひとつの奇跡になる  
> さよなら、凍えた昨日　こんにちは、永遠の朝  
>
> **ACT VII — 永遠の余韻**  
> 光の果てで　花は静かに微笑む  

---

## Rebuilding from Source

```bash
# 1. Build & run the C++20 studio DSP synthesizer + 60fps telemetry exporter
clang++ -std=c++20 -O3 -mcpu=native src/audio_engine.cpp -o build/audio_engine
./build/audio_engine

# 2. Build & run the Apple Metal 1080p 60fps HDR MV renderer
swiftc -O src/mv_renderer.swift -framework Metal -framework CoreGraphics -framework CoreText -framework ImageIO -framework Foundation -o build/mv_renderer
./build/mv_renderer
```
