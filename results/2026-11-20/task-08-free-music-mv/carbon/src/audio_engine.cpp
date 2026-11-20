// ============================================================================
// SINGULARITY BLOOM — 零度の花、光の果て —
// Original Studio-Grade Polyphonic C++20 DSP Music & Telemetry Engine
// 48,000 Hz Stereo | 64-bit Internal DSP | Physical/Modal + Supersaw + Formant
// ============================================================================

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <memory>
#include <numeric>
#include <random>
#include <string>
#include <vector>

namespace {

constexpr double SR = 48000.0;
constexpr double INV_SR = 1.0 / SR;
constexpr double TWO_PI = 6.28318530717958647692;
constexpr double PI = 3.14159265358979323846;

constexpr double BPM = 174.0;
constexpr double BEAT_SEC = 60.0 / BPM;            // ~0.344827586s
constexpr double BAR_SEC = 4.0 * BEAT_SEC;         // ~1.379310345s
constexpr double TOTAL_SEC = 146.0;                // 2:26 exact
constexpr size_t TOTAL_SAMPLES = static_cast<size_t>(TOTAL_SEC * SR);
constexpr int FPS = 60;
constexpr size_t TOTAL_FRAMES = static_cast<size_t>(TOTAL_SEC * FPS); // 8760

inline double midiToFreq(double midi) {
    return 440.0 * std::pow(2.0, (midi - 69.0) / 12.0);
}

inline double clampd(double x, double lo, double hi) {
    return x < lo ? lo : (x > hi ? hi : x);
}

inline double safeExp(double x) {
    if (x < -80.0) return 0.0;
    if (x > 80.0) return std::exp(80.0);
    return std::exp(x);
}

inline double softClip(double x) {
    // Smooth Padé-like tanh saturator
    if (x > 3.0) return 1.0;
    if (x < -3.0) return -1.0;
    double x2 = x * x;
    return x * (27.0 + x2) / (27.0 + 9.0 * x2);
}

inline void panStereo(double mono, double pan, double& outL, double& outR) {
    double p = clampd(pan, -1.0, 1.0) * 0.5 + 0.5; // 0..1
    double angle = p * (PI * 0.5);
    outL += mono * std::cos(angle);
    outR += mono * std::sin(angle);
}

// Deterministic PRNG for repeatable studio rendering
struct FastRNG {
    uint64_t state = 0x853c49e6748fea9bULL;
    inline double nextUniform() { // -1.0 .. +1.0
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        uint64_t res = state * 0x2545F4914F6CDD1DULL;
        return (static_cast<double>(res >> 11) * (1.0 / 9007199254740992.0)) * 2.0 - 1.0;
    }
    inline double next01() {
        return nextUniform() * 0.5 + 0.5;
    }
};

// PolyBLEP antialiasing residual
inline double polyBlep(double t, double dt) {
    if (t < dt) {
        t /= dt;
        return t + t - t * t - 1.0;
    } else if (t > 1.0 - dt) {
        t = (t - 1.0) / dt;
        return t * t + t + t + 1.0;
    }
    return 0.0;
}

// Cytomic Zero-Delay Feedback State Variable Filter
struct CytomicSVF {
    double ic1eq = 0.0, ic2eq = 0.0;
    double g = 0.0, k = 1.0, a1 = 0.0, a2 = 0.0, a3 = 0.0;

    void setParams(double cutoffHz, double q) {
        double fc = clampd(cutoffHz, 18.0, SR * 0.44);
        g = std::tan(PI * fc * INV_SR);
        k = 1.0 / std::max(0.05, q);
        a1 = 1.0 / (1.0 + g * (g + k));
        a2 = g * a1;
        a3 = g * a2;
    }

    inline void process(double v0, double& lp, double& bp, double& hp) {
        double v3 = v0 - ic2eq;
        double v1 = a1 * ic1eq + a2 * v3;
        double v2 = ic2eq + a2 * ic1eq + a3 * v3;
        ic1eq = 2.0 * v1 - ic1eq;
        ic2eq = 2.0 * v2 - ic2eq;
        lp = v2;
        bp = v1;
        hp = v0 - k * v1 - v2;
    }

    inline double processLP(double x) {
        double lp, bp, hp;
        process(x, lp, bp, hp);
        return lp;
    }
    inline double processHP(double x) {
        double lp, bp, hp;
        process(x, lp, bp, hp);
        return hp;
    }
    inline double processBP(double x) {
        double lp, bp, hp;
        process(x, lp, bp, hp);
        return bp;
    }
};

// ============================================================================
// Telemetry Struct for 60fps Metal MV Synchronization
// ============================================================================
#pragma pack(push, 1)
struct FrameTelemetry {
    float time_sec;
    float bar_pos;
    float beat_phase;
    int32_t act_id;
    int32_t shot_id;
    float kick_env;
    float snare_env;
    float hat_env;
    float sub_env;
    float chord_env;
    float piano_env;
    float vocal_env;
    float lead_env;
    float riser_env;
    float glitch_trig;
    float aspect_open;
    float key_mod;
    float last_piano_pitch;
    float last_lead_pitch;
    float flash_white;
    float spectrum[64];
    float piano_keys[16];
};
#pragma pack(pop)

// ============================================================================
// Musical Score Event Types
// ============================================================================
enum class InstType {
    GrandPiano,
    FeltPiano,
    Celesta,
    HarpPluck,
    Supersaw,
    StringEns,
    SoloStrings,
    ChoirPad,
    VocaliseLead,
    SynthLead,
    ReeseBass,
    SubBass,
    ArpPluck
};

struct NoteEvent {
    InstType inst;
    double startSec;
    double durSec;
    double midi;
    double vel;      // 0..1
    double pan;      // -1..1
    int vowel = 0;   // 0=A, 1=I, 2=U, 3=E, 4=O (for Vocalise/Choir)
    double glideFromMidi = -1.0;
};

enum class DrumType {
    Kick,
    Snare,
    GhostSnare,
    Clap,
    ClosedHat,
    OpenHat,
    Ride,
    Crash,
    SubDrop,
    ReverseSuck
};

struct DrumEvent {
    DrumType type;
    double startSec;
    double vel;
    double pan = 0.0;
};

// ============================================================================
// Instrument Voice Renderers (Sample-Accurate Offline Additive/Physical/Synth)
// ============================================================================

// 1. Concert & Felt Grand Piano (Inharmonic Multi-String + Hammer Transient)
void renderPianoNote(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR,
                     std::vector<float>& pianoEnvSample, FastRNG& rng) {
    bool isFelt = (ev.inst == InstType::FeltPiano);
    double releaseTail = isFelt ? 1.8 : 2.1;
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + releaseTail) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double f0 = midiToFreq(ev.midi);
    // Realistic piano string inharmonicity coefficient B
    double B = 0.00009 * std::pow(2.0, (ev.midi - 60.0) / 20.0);
    int maxPartials = isFelt ? 10 : 18;
    while (maxPartials > 2 && f0 * maxPartials * std::sqrt(1.0 + B * maxPartials * maxPartials) > 16500.0) {
        maxPartials--;
    }

    // Precompute partial frequencies & detuned unison beating rates
    struct Partial {
        double w1, w2;
        double ph1, ph2;
        double amp;
        double decayRate;
    };
    std::array<Partial, 20> parts{};
    double brightness = isFelt ? (1.85 - 0.45 * ev.vel) : (1.35 - 0.50 * ev.vel);
    double baseDecay = (isFelt ? 0.85 : 0.65) + 0.022 * std::max(0.0, ev.midi - 36.0);

    for (int n = 1; n <= maxPartials; ++n) {
        double fn = f0 * n * std::sqrt(1.0 + B * n * n);
        // Subtle 2-string unison detune (~0.65 cents) for rich organic piano warmth
        double detuneHz = fn * (0.00038 * (1.0 + 0.15 * (n % 3)));
        parts[n - 1].w1 = TWO_PI * (fn - detuneHz) * INV_SR;
        parts[n - 1].w2 = TWO_PI * (fn + detuneHz) * INV_SR;
        parts[n - 1].ph1 = rng.next01() * TWO_PI;
        parts[n - 1].ph2 = rng.next01() * TWO_PI;
        // Suppress every 7th partial (classic grand piano strike-point @ 1/7 string length!)
        double strikeComb = std::abs(std::sin(PI * n / 7.15));
        parts[n - 1].amp = (0.35 + 0.65 * strikeComb) / std::pow(static_cast<double>(n), brightness);
        parts[n - 1].decayRate = baseDecay * (1.0 + 0.24 * (n - 1));
    }

    // Hammer strike wooden/felt transient filter
    CytomicSVF hammerBP;
    hammerBP.setParams(isFelt ? (650.0 + f0 * 0.8) : (1800.0 + f0 * 1.5), isFelt ? 1.2 : 1.8);
    CytomicSVF bodyWarmth;
    bodyWarmth.setParams(240.0, 1.1);

    double stereoPan = clampd(ev.pan + (ev.midi - 64.0) * 0.009, -0.65, 0.65);
    double gain = ev.vel * (isFelt ? 0.165 : 0.195);
    size_t noteDurSamples = static_cast<size_t>(ev.durSec * SR);

    for (size_t idx = s0; idx < s1; ++idx) {
        size_t k = idx - s0;
        double t = k * INV_SR;

        // Fast 1.8ms attack (3.8ms for felt)
        double atk = isFelt ? (1.0 - std::exp(-t * 650.0)) : (1.0 - std::exp(-t * 1400.0));
        double rel = 1.0;
        if (k > noteDurSamples) {
            double tr = (k - noteDurSamples) * INV_SR;
            rel = std::exp(-tr * (isFelt ? 3.2 : 4.2));
        }
        if (rel < 0.00015) break;

        double sum = 0.0;
        for (int n = 0; n < maxPartials; ++n) {
            double pEnv = std::exp(-t * parts[n].decayRate);
            double s = std::sin(parts[n].ph1) + std::sin(parts[n].ph2);
            parts[n].ph1 += parts[n].w1;
            parts[n].ph2 += parts[n].w2;
            sum += s * 0.5 * parts[n].amp * pEnv;
        }

        // Hammer strike noise in first 18ms
        if (t < 0.025) {
            double hEnv = std::exp(-t * (isFelt ? 180.0 : 280.0));
            double noise = hammerBP.processBP(rng.nextUniform()) * hEnv * (isFelt ? 0.22 : 0.38) * ev.vel;
            sum += noise;
        }

        // Subtle soundboard body resonance
        double body = bodyWarmth.processBP(sum) * 0.22;
        double sig = (sum + body) * atk * rel * gain;

        panStereo(sig, stereoPan, busL[idx], busR[idx]);
        pianoEnvSample[idx] += static_cast<float>( std::abs(sig) * 2.8 );
    }
}

// 2. Crystal Celesta / DX7 Glass Bell (4-Op FM)
void renderCelestaNote(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR, FastRNG& rng) {
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + 2.0) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double f0 = midiToFreq(ev.midi);
    double wc1 = TWO_PI * f0 * INV_SR;
    double wm1 = TWO_PI * (f0 * 3.5) * INV_SR; // crystalline bell inharmonicity
    double wc2 = TWO_PI * (f0 * 2.001) * INV_SR;
    double wm2 = TWO_PI * (f0 * 7.0) * INV_SR;
    double pc1 = rng.next01() * TWO_PI, pm1 = 0.0, pc2 = rng.next01() * TWO_PI, pm2 = 0.0;
    double gain = ev.vel * 0.095;

    for (size_t idx = s0; idx < s1; ++idx) {
        double t = (idx - s0) * INV_SR;
        double atk = 1.0 - std::exp(-t * 1800.0);
        double env1 = std::exp(-t * 2.4);
        double envMod1 = std::exp(-t * 9.5) * (1.2 * ev.vel);
        double env2 = std::exp(-t * 4.5) * 0.45;
        double envMod2 = std::exp(-t * 18.0) * 0.8;
        if (env1 < 0.0002) break;

        double op1 = std::sin(pc1 + envMod1 * std::sin(pm1)) * env1;
        double op2 = std::sin(pc2 + envMod2 * std::sin(pm2)) * env2;
        pc1 += wc1; pm1 += wm1;
        pc2 += wc2; pm2 += wm2;

        double sig = (op1 + op2) * atk * gain;
        panStereo(sig, ev.pan, busL[idx], busR[idx]);
    }
}

// 3. Extended Karplus-Strong Physical Plucked Harp / Koto
void renderHarpPluck(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR, FastRNG& rng) {
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + 2.4) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double f0 = clampd(midiToFreq(ev.midi), 45.0, 4200.0);
    double exactPeriod = SR / f0;
    int delayInt = std::max(4, static_cast<int>( std::floor(exactPeriod - 0.5) ));
    double frac = exactPeriod - delayInt;
    double allpassC = (1.0 - frac) / (1.0 + frac);

    std::vector<double> buf(delayInt + 2, 0.0);
    // Pluck excitation: filtered warm pink-ish burst + pick-position comb
    CytomicSVF exciteLP;
    exciteLP.setParams(1200.0 + 3800.0 * ev.vel, 0.85);
    int pickOffset = std::max(1, delayInt / 5);
    std::vector<double> rawNoise(delayInt, 0.0);
    for (int i = 0; i < delayInt; ++i) {
        rawNoise[i] = exciteLP.processLP(rng.nextUniform());
    }
    for (int i = 0; i < delayInt; ++i) {
        buf[i] = rawNoise[i] - 0.65 * rawNoise[(i + pickOffset) % delayInt];
    }

    int writePos = 0;
    double lpState = 0.0, apInPrev = 0.0, apOutPrev = 0.0;
    double damp = clampd(0.14 + (1.0 - ev.vel) * 0.22, 0.08, 0.45);
    double fb = std::pow(0.001, 1.0 / (f0 * (2.6 + 0.8 * ev.vel)));
    fb = std::min(0.9988, fb);

    CytomicSVF bodyRes;
    bodyRes.setParams(320.0, 1.6);
    double gain = ev.vel * 0.20;

    for (size_t idx = s0; idx < s1; ++idx) {
        int readPos = (writePos + 1) % delayInt;
        double delayed = buf[readPos];
        // One-pole brightness loop filter
        lpState = delayed * (1.0 - damp) + lpState * damp;
        // Allpass fractional tuning filter
        double apOut = allpassC * lpState + apInPrev - allpassC * apOutPrev;
        apInPrev = lpState;
        apOutPrev = apOut;

        buf[writePos] = apOut * fb;
        writePos = readPos;

        double sig = (apOut + bodyRes.processBP(apOut) * 0.35) * gain;
        panStereo(sig, ev.pan, busL[idx], busR[idx]);
    }
}

// 4. 9-Voice Stereo JP-8000 Supersaw Chord Voice
void renderSupersaw(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR,
                    std::vector<float>& chordEnvSample, FastRNG& rng) {
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + 0.38) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double f0 = midiToFreq(ev.midi);
    // 9-voice detune ratios modeled on JP-8000 supersaw curve
    static constexpr double detuneCents[9] = {-36.0, -23.5, -13.0, -5.2, 0.0, +5.4, +13.3, +24.0, +36.8};
    static constexpr double voiceGain[9]   = {0.42, 0.58, 0.72, 0.85, 1.0, 0.85, 0.72, 0.58, 0.42};
    static constexpr double voicePan[9]    = {-0.92, -0.70, -0.45, -0.20, 0.0, 0.20, 0.45, 0.70, 0.92};

    double ph[9], dt[9];
    for (int v = 0; v < 9; ++v) {
        ph[v] = rng.next01();
        double fv = f0 * std::pow(2.0, detuneCents[v] / 1200.0);
        dt[v] = fv * INV_SR;
    }

    CytomicSVF hpL, hpR, lpL, lpR;
    hpL.setParams(135.0, 0.707);
    hpR.setParams(135.0, 0.707);
    double topCut = clampd(4800.0 + 9500.0 * ev.vel, 1500.0, 16000.0);
    lpL.setParams(topCut, 0.78);
    lpR.setParams(topCut, 0.78);

    size_t durSamp = static_cast<size_t>(ev.durSec * SR);
    double gain = ev.vel * 0.055;

    for (size_t idx = s0; idx < s1; ++idx) {
        size_t k = idx - s0;
        double t = k * INV_SR;
        double atk = 1.0 - std::exp(-t * 140.0); // snappy 15ms supersaw swell
        double rel = (k <= durSamp) ? 1.0 : std::exp(-(k - durSamp) * INV_SR * 11.0);
        if (rel < 0.0003) break;

        double sumL = 0.0, sumR = 0.0;
        for (int v = 0; v < 9; ++v) {
            double saw = 2.0 * ph[v] - 1.0 - polyBlep(ph[v], dt[v]);
            ph[v] += dt[v];
            if (ph[v] >= 1.0) ph[v] -= 1.0;
            panStereo(saw * voiceGain[v], clampd(ev.pan * 0.4 + voicePan[v] * 0.85, -1.0, 1.0), sumL, sumR);
        }

        sumL = lpL.processLP(hpL.processHP(sumL));
        sumR = lpR.processLP(hpR.processHP(sumR));
        double env = atk * rel * gain;
        double oL = softClip(sumL * env * 1.4) * 0.82;
        double oR = softClip(sumR * env * 1.4) * 0.82;
        busL[idx] += oL;
        busR[idx] += oR;
        chordEnvSample[idx] += static_cast<float>((std::abs(oL) + std::abs(oR)) * 0.9);
    }
}

// 5. Lush Symphonic Strings & Expressive Solo Violin/Cello
void renderStrings(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR,
                   std::vector<float>& chordEnvSample, FastRNG& rng) {
    bool isSolo = (ev.inst == InstType::SoloStrings);
    double tail = isSolo ? 0.65 : 0.95;
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + tail) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double fTarget = midiToFreq(ev.midi);
    double fStart = (ev.glideFromMidi > 0.0) ? midiToFreq(ev.glideFromMidi) : fTarget;

    int numVoices = isSolo ? 2 : 5;
    double ph[5], detune[5];
    for (int v = 0; v < numVoices; ++v) {
        ph[v] = rng.next01();
        double spread = isSolo ? 2.2 : 9.5;
        double c = (numVoices == 1) ? 0.0 : ((v / double(numVoices - 1)) * 2.0 - 1.0) * spread;
        detune[v] = std::pow(2.0, c / 1200.0);
    }

    // Wooden violin/cello body formant filters
    CytomicSVF fBody1, fBody2, bowLP;
    bool isCello = (ev.midi < 60.0);
    fBody1.setParams(isCello ? 260.0 : 460.0, 2.2);
    fBody2.setParams(isCello ? 1150.0 : 2350.0, 2.0);
    bowLP.setParams(isSolo ? 3800.0 : 4600.0, 0.85);

    double vibPhase = rng.next01() * TWO_PI;
    size_t durSamp = static_cast<size_t>(ev.durSec * SR);
    double gain = ev.vel * (isSolo ? 0.14 : 0.075);

    for (size_t idx = s0; idx < s1; ++idx) {
        size_t k = idx - s0;
        double t = k * INV_SR;

        // Expressive bow swell + delayed natural vibrato
        double atkRate = (ev.durSec < 0.28) ? 65.0 : (isSolo ? 11.0 : 7.5);
        double atk = 1.0 - std::exp(-t * atkRate);
        double rel = (k <= durSamp) ? 1.0 : std::exp(-(k - durSamp) * INV_SR * (isSolo ? 5.5 : 3.8));
        if (rel < 0.00025) break;

        double glideAlpha = 1.0 - std::exp(-t * 22.0);
        double fBase = fStart + (fTarget - fStart) * glideAlpha;

        double vibAmt = isSolo ? (0.0068 * clampd((t - 0.14) * 3.5, 0.0, 1.0))
                               : (0.0032 * clampd((t - 0.20) * 2.5, 0.0, 1.0));
        vibPhase += TWO_PI * (isSolo ? 5.65 : 5.1) * INV_SR;
        double fInst = fBase * (1.0 + vibAmt * std::sin(vibPhase));

        double raw = 0.0;
        for (int v = 0; v < numVoices; ++v) {
            double dt = fInst * detune[v] * INV_SR;
            double saw = 2.0 * ph[v] - 1.0 - polyBlep(ph[v], dt);
            ph[v] += dt;
            if (ph[v] >= 1.0) ph[v] -= 1.0;
            raw += saw;
        }
        raw /= numVoices;

        // Subtle rosin bow friction noise on attack
        if (t < 0.12) {
            raw += rng.nextUniform() * 0.08 * std::exp(-t * 28.0);
        }

        double warm = bowLP.processLP(raw);
        double body = warm * 0.65 + fBody1.processBP(warm) * 0.55 + fBody2.processBP(warm) * 0.35;
        double sig = body * atk * rel * gain;

        panStereo(sig, ev.pan, busL[idx], busR[idx]);
        chordEnvSample[idx] += static_cast<float>(std::abs(sig) * 0.7);
    }
}

// 6. Soprano Formant Vocalise ("Aoi") & Symphonic Choir Pad
void renderFormantVoice(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR,
                        std::vector<float>& vocalEnvSample, FastRNG& rng) {
    bool isLead = (ev.inst == InstType::VocaliseLead);
    double tail = isLead ? 0.55 : 1.1;
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + tail) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    // Soprano/Choir Japanese pure vowel formant tables (F1, F2, F3, F4 Hz)
    static constexpr double VOWELS[5][4] = {
        {820.0, 1380.0, 2950.0, 3850.0}, // 0: A (あ)
        {340.0, 2450.0, 3200.0, 4100.0}, // 1: I (い)
        {360.0, 1150.0, 2750.0, 3750.0}, // 2: U (う)
        {520.0, 2050.0, 2900.0, 3900.0}, // 3: E (え)
        {480.0, 920.0,  2800.0, 3700.0}  // 4: O (お)
    };
    int vIdx = std::clamp(ev.vowel, 0, 4);
    int vIdx2 = (vIdx + 2) % 5; // subtle living vowel movement over long notes!

    double fTarget = midiToFreq(ev.midi);
    double fStart = (ev.glideFromMidi > 0.0) ? midiToFreq(ev.glideFromMidi) : fTarget;

    CytomicSVF form[4];
    for (int f = 0; f < 4; ++f) {
        form[f].setParams(VOWELS[vIdx][f], isLead ? (5.5 + f * 1.8) : (4.2 + f * 1.4));
    }
    CytomicSVF airHP;
    airHP.setParams(2400.0, 0.7);

    int numGlottal = isLead ? 2 : 4;
    double ph[4], det[4];
    for (int i = 0; i < numGlottal; ++i) {
        ph[i] = rng.next01();
        double c = (i - (numGlottal - 1) * 0.5) * (isLead ? 3.2 : 11.0);
        det[i] = std::pow(2.0, c / 1200.0);
    }

    double vibPhase = rng.next01() * TWO_PI;
    size_t durSamp = static_cast<size_t>(ev.durSec * SR);
    double gain = ev.vel * (isLead ? 0.165 : 0.085);

    for (size_t idx = s0; idx < s1; ++idx) {
        size_t k = idx - s0;
        double t = k * INV_SR;

        double atk = 1.0 - std::exp(-t * (isLead ? 19.0 : 5.5));
        double rel = (k <= durSamp) ? 1.0 : std::exp(-(k - durSamp) * INV_SR * (isLead ? 6.5 : 3.2));
        if (rel < 0.0002) break;

        // Smooth vowel morph every 64 samples
        if ((k & 63) == 0 && isLead) {
            double morph = 0.25 * (0.5 - 0.5 * std::cos(std::min(PI, t * 2.2)));
            for (int f = 0; f < 4; ++f) {
                double ff = VOWELS[vIdx][f] * (1.0 - morph) + VOWELS[vIdx2][f] * morph;
                form[f].setParams(ff, 5.5 + f * 1.8);
            }
        }

        double glideAlpha = 1.0 - std::exp(-t * 24.0);
        double fBase = fStart + (fTarget - fStart) * glideAlpha;
        double vib = (isLead ? 0.0075 : 0.004) * clampd((t - 0.16) * 3.8, 0.0, 1.0);
        vibPhase += TWO_PI * 5.75 * INV_SR;
        double fInst = fBase * (1.0 + vib * std::sin(vibPhase));

        // Rosenberg-inspired smooth glottal source + soft aspirated breath
        double glottal = 0.0;
        for (int i = 0; i < numGlottal; ++i) {
            double dt = fInst * det[i] * INV_SR;
            double saw = 2.0 * ph[i] - 1.0 - polyBlep(ph[i], dt);
            double sine1 = std::sin(TWO_PI * ph[i]);
            ph[i] += dt;
            if (ph[i] >= 1.0) ph[i] -= 1.0;
            glottal += (0.58 * saw + 0.42 * sine1);
        }
        glottal /= numGlottal;
        double breath = airHP.processHP(rng.nextUniform()) * (isLead ? 0.11 : 0.08);
        double src = glottal + breath;

        double voiced = form[0].processBP(src) * 1.00
                      + form[1].processBP(src) * 0.72
                      + form[2].processBP(src) * 0.38
                      + form[3].processBP(src) * 0.20;

        double sig = softClip(voiced * 1.35) * atk * rel * gain;
        panStereo(sig, ev.pan, busL[idx], busR[idx]);
        if (isLead) {
            vocalEnvSample[idx] += static_cast<float>(std::abs(sig) * 3.2);
        }
    }
}

// 7. Expressive Artcore Synth Lead & Polymetric Glass Arp Pluck
void renderLeadOrArp(const NoteEvent& ev, std::vector<double>& busL, std::vector<double>& busR,
                     std::vector<float>& leadEnvSample, FastRNG& rng) {
    bool isArp = (ev.inst == InstType::ArpPluck);
    double tail = isArp ? 0.35 : 0.42;
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + tail) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double fTarget = midiToFreq(ev.midi);
    double fStart = (!isArp && ev.glideFromMidi > 0.0) ? midiToFreq(ev.glideFromMidi) : fTarget;

    double ph1 = rng.next01(), ph2 = rng.next01(), ph3 = rng.next01();
    double vibPh = rng.next01() * TWO_PI;
    CytomicSVF svf;
    size_t durSamp = static_cast<size_t>(ev.durSec * SR);
    double gain = ev.vel * (isArp ? 0.125 : 0.135);

    for (size_t idx = s0; idx < s1; ++idx) {
        size_t k = idx - s0;
        double t = k * INV_SR;

        double atk = 1.0 - std::exp(-t * (isArp ? 1200.0 : 350.0));
        double env = isArp ? std::exp(-t * 8.2) : ((k <= durSamp) ? 1.0 : std::exp(-(k - durSamp) * INV_SR * 9.5));
        if (env < 0.00025) break;

        double fBase = isArp ? fTarget : (fStart + (fTarget - fStart) * (1.0 - std::exp(-t * 38.0)));
        vibPh += TWO_PI * 6.0 * INV_SR;
        double vib = isArp ? 0.0 : (0.005 * clampd((t - 0.12) * 4.0, 0.0, 1.0) * std::sin(vibPh));
        double f = fBase * (1.0 + vib);

        double dt1 = f * 0.9985 * INV_SR;
        double dt2 = f * 1.0015 * INV_SR;
        double dt3 = f * 2.0000 * INV_SR;

        double s1w = 2.0 * ph1 - 1.0 - polyBlep(ph1, dt1);
        double s2w = 2.0 * ph2 - 1.0 - polyBlep(ph2, dt2);
        // Zero-mean 35% pulse wave shimmer harmonic
        double sq = (ph3 < 0.35 ? 1.30 : -0.70) + polyBlep(ph3, dt3) - polyBlep(std::fmod(ph3 + 0.65, 1.0), dt3);
        ph1 += dt1; if (ph1 >= 1.0) ph1 -= 1.0;
        ph2 += dt2; if (ph2 >= 1.0) ph2 -= 1.0;
        ph3 += dt3; if (ph3 >= 1.0) ph3 -= 1.0;

        if ((k & 15) == 0) {
            double fc = isArp ? (900.0 + 9500.0 * std::exp(-t * 14.0) * ev.vel)
                              : (3600.0 + 7500.0 * ev.vel);
            svf.setParams(fc, isArp ? 1.8 : 1.15);
        }

        double raw = (s1w + s2w) * 0.42 + sq * (isArp ? 0.25 : 0.18);
        double sig = softClip(svf.processLP(raw) * 1.45) * atk * env * gain;
        panStereo(sig, ev.pan, busL[idx], busR[idx]);
        leadEnvSample[idx] += static_cast<float>(std::abs(sig) * 2.5);
    }
}

// 8. Clean Phase-Locked Sub-Bass + Stereo Neuro Reese Mid-Bass
void renderBass(const NoteEvent& ev, std::vector<double>& subBus,
                std::vector<double>& midL, std::vector<double>& midR,
                std::vector<float>& subEnvSample, FastRNG& rng) {
    bool isSub = (ev.inst == InstType::SubBass);
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    size_t len = static_cast<size_t>((ev.durSec + 0.12) * SR);
    if (s0 >= TOTAL_SAMPLES) return;
    size_t s1 = std::min(TOTAL_SAMPLES, s0 + len);

    double f0 = midiToFreq(ev.midi);
    size_t durSamp = static_cast<size_t>(ev.durSec * SR);

    if (isSub) {
        double ph = 0.0; // phase-locked pure sub!
        double dt = f0 * INV_SR;
        double gain = ev.vel * 0.29;
        for (size_t idx = s0; idx < s1; ++idx) {
            size_t k = idx - s0;
            double t = k * INV_SR;
            double atk = 1.0 - std::exp(-t * 240.0);
            double rel = (k <= durSamp) ? 1.0 : std::exp(-(k - durSamp) * INV_SR * 28.0);
            if (rel < 0.0002) break;
            // Pure fundamental + subtle 2nd/3rd warm saturation harmonic so it translates on all speakers
            double sig = (std::sin(TWO_PI * ph) + 0.18 * std::sin(2.0 * TWO_PI * ph) + 0.06 * std::sin(3.0 * TWO_PI * ph));
            ph += dt;
            if (ph >= 1.0) ph -= 1.0;
            double out = sig * atk * rel * gain;
            subBus[idx] += out;
            subEnvSample[idx] += static_cast<float>(std::abs(out) * 2.2);
        }
    } else {
        // Stereo Detuned Neuro Reese Mid-Bass (high-passed > 115 Hz so zero phase clash with Sub!)
        double ph[4], dt[4];
        static constexpr double c[4] = {-19.0, -6.5, +6.8, +19.5};
        for (int i = 0; i < 4; ++i) {
            ph[i] = rng.next01();
            dt[i] = f0 * std::pow(2.0, c[i] / 1200.0) * INV_SR;
        }
        CytomicSVF hpL, hpR, lpL, lpR, notchL, notchR;
        hpL.setParams(118.0, 0.75); hpR.setParams(118.0, 0.75);
        double gain = ev.vel * 0.145;
        double lfoPh = rng.next01() * TWO_PI;

        for (size_t idx = s0; idx < s1; ++idx) {
            size_t k = idx - s0;
            double t = k * INV_SR;
            double atk = 1.0 - std::exp(-t * 150.0);
            double rel = (k <= durSamp) ? 1.0 : std::exp(-(k - durSamp) * INV_SR * 18.0);
            if (rel < 0.0002) break;

            if ((k & 31) == 0) {
                lfoPh += TWO_PI * 1.45 * (32.0 * INV_SR);
                double sweep = 650.0 + 1150.0 * ev.vel * (0.55 + 0.45 * std::sin(lfoPh));
                lpL.setParams(sweep, 1.35);
                lpR.setParams(sweep * 1.04, 1.35);
                notchL.setParams(380.0 + 220.0 * std::cos(lfoPh * 0.7), 2.2);
                notchR.setParams(410.0 + 220.0 * std::sin(lfoPh * 0.7), 2.2);
            }

            double sL = 0.0, sR = 0.0;
            for (int i = 0; i < 4; ++i) {
                double saw = 2.0 * ph[i] - 1.0 - polyBlep(ph[i], dt[i]);
                ph[i] += dt[i];
                if (ph[i] >= 1.0) ph[i] -= 1.0;
                if (i < 2) sL += saw; else sR += saw;
            }
            sL = softClip(sL * 1.35);
            sR = softClip(sR * 1.35);
            double lp1, bp1, hp1;
            notchL.process(sL, lp1, bp1, hp1); sL -= bp1 * 0.55;
            notchR.process(sR, lp1, bp1, hp1); sR -= bp1 * 0.55;
            sL = lpL.processLP(hpL.processHP(sL));
            sR = lpR.processLP(hpR.processHP(sR));

            midL[idx] += sL * atk * rel * gain;
            midR[idx] += sR * atk * rel * gain;
        }
    }
}

// ============================================================================
// Custom Artcore / Drum & Bass Percussion Synthesizer + Sidechain Trigger
// ============================================================================
void renderDrum(const DrumEvent& ev, std::vector<double>& drumL, std::vector<double>& drumR,
                std::vector<double>& sidechainDuck,
                std::vector<float>& kickEnv, std::vector<float>& snareEnv, std::vector<float>& hatEnv,
                FastRNG& rng) {
    size_t s0 = static_cast<size_t>(std::max(0.0, ev.startSec * SR));
    if (s0 >= TOTAL_SAMPLES) return;

    if (ev.type == DrumType::Kick) {
        size_t s1 = std::min(TOTAL_SAMPLES, s0 + static_cast<size_t>(0.34 * SR));
        double ph = 0.0, clickPh = 0.0;
        for (size_t idx = s0; idx < s1; ++idx) {
            double t = (idx - s0) * INV_SR;
            // Tight Artcore/DnB punch: 195Hz -> 48.9Hz (G1/F#1 punch!) in 34ms
            double f = 48.0 + 165.0 * std::exp(-t * 68.0) + 420.0 * std::exp(-t * 360.0);
            ph += TWO_PI * f * INV_SR;
            double ampEnv = std::exp(-t * 11.5) * (1.0 - std::exp(-t * 2800.0));
            clickPh += TWO_PI * 2400.0 * INV_SR;
            double click = std::sin(clickPh) * std::exp(-t * 480.0) * 0.35 + rng.nextUniform() * std::exp(-t * 950.0) * 0.18;
            double sig = softClip((std::sin(ph) * 1.32 + click) * ampEnv) * ev.vel * 0.56;
            drumL[idx] += sig;
            drumR[idx] += sig;
            kickEnv[idx] = std::max(kickEnv[idx], static_cast<float>(ampEnv * ev.vel));

            // Musical sidechain ducking curve (~130ms tight pump!)
            if (t < 0.16) {
                double sc = 1.0 - (0.78 * ev.vel) * std::exp(-t * 21.0) * (1.0 - std::exp(-t * 900.0));
                sidechainDuck[idx] = std::min(sidechainDuck[idx], sc);
            }
        }
    } else if (ev.type == DrumType::Snare || ev.type == DrumType::GhostSnare || ev.type == DrumType::Clap) {
        bool isGhost = (ev.type == DrumType::GhostSnare);
        bool isClap = (ev.type == DrumType::Clap);
        size_t s1 = std::min(TOTAL_SAMPLES, s0 + static_cast<size_t>((isGhost ? 0.16 : 0.32) * SR));
        double ph1 = 0.0, ph2 = 0.0;
        CytomicSVF noiseHP_L, noiseHP_R, snapBP;
        noiseHP_L.setParams(isGhost ? 1600.0 : 1150.0, 0.8);
        noiseHP_R.setParams(isGhost ? 1650.0 : 1200.0, 0.8);
        snapBP.setParams(2650.0, 1.4);

        for (size_t idx = s0; idx < s1; ++idx) {
            double t = (idx - s0) * INV_SR;
            // Dual-mode acoustic+electronic snare drum body (205Hz + 335Hz)
            double f1 = 198.0 + 95.0 * std::exp(-t * 95.0);
            double f2 = 332.0 + 120.0 * std::exp(-t * 110.0);
            ph1 += TWO_PI * f1 * INV_SR;
            ph2 += TWO_PI * f2 * INV_SR;
            double bodyEnv = std::exp(-t * (isGhost ? 34.0 : 22.0));
            double body = (std::sin(ph1) * 0.72 + std::sin(ph2) * 0.42) * bodyEnv * (isClap ? 0.15 : 1.0);

            // Multi-tap flam envelope if Clap, crispy wire decay if Snare
            double wireEnv = std::exp(-t * (isGhost ? 26.0 : 13.5));
            if (isClap && t < 0.028) {
                wireEnv *= (0.45 + 0.55 * std::abs(std::sin(t * 360.0)));
            }
            double nL = noiseHP_L.processHP(rng.nextUniform());
            double nR = noiseHP_R.processHP(rng.nextUniform());
            double snap = snapBP.processBP(nL + nR) * std::exp(-t * 55.0) * 0.55;

            double gain = ev.vel * (isGhost ? 0.24 : 0.46);
            double oL = softClip((body + (nL * 0.78 + snap) * wireEnv) * 1.25) * gain;
            double oR = softClip((body + (nR * 0.78 + snap) * wireEnv) * 1.25) * gain;
            drumL[idx] += oL;
            drumR[idx] += oR;
            if (!isGhost) {
                snareEnv[idx] = std::max(snareEnv[idx], static_cast<float>(wireEnv * ev.vel));
                if (t < 0.10) {
                    double sc = 1.0 - (0.38 * ev.vel) * std::exp(-t * 32.0);
                    sidechainDuck[idx] = std::min(sidechainDuck[idx], sc);
                }
            } else {
                hatEnv[idx] = std::max(hatEnv[idx], static_cast<float>(wireEnv * ev.vel * 0.5));
            }
        }
    } else if (ev.type == DrumType::ClosedHat || ev.type == DrumType::OpenHat ||
               ev.type == DrumType::Ride || ev.type == DrumType::Crash) {
        double dur = (ev.type == DrumType::ClosedHat) ? 0.075
                   : (ev.type == DrumType::OpenHat)   ? 0.28
                   : (ev.type == DrumType::Ride)      ? 0.55 : 1.85;
        size_t s1 = std::min(TOTAL_SAMPLES, s0 + static_cast<size_t>(dur * SR));

        // 6-oscillator metallic cymbal matrix + crisp filtered air shimmer
        static constexpr double metalFreqs[6] = {312.4, 467.8, 631.2, 843.7, 1129.5, 1592.3};
        double mph[6] = {};
        CytomicSVF hpL, hpR, bellBP;
        hpL.setParams((ev.type == DrumType::Crash) ? 3800.0 : 6200.0, 0.85);
        hpR.setParams((ev.type == DrumType::Crash) ? 3950.0 : 6400.0, 0.85);
        bellBP.setParams(2950.0, 3.2); // Ride ping bell!

        double decayRate = (ev.type == DrumType::ClosedHat) ? 58.0
                         : (ev.type == DrumType::OpenHat)   ? 12.5
                         : (ev.type == DrumType::Ride)      ? 6.2 : 2.15;
        double gain = ev.vel * ((ev.type == DrumType::Crash) ? 0.20 : 0.145);

        for (size_t idx = s0; idx < s1; ++idx) {
            double t = (idx - s0) * INV_SR;
            double env = std::exp(-t * decayRate) * (1.0 - std::exp(-t * 2500.0));
            if (env < 0.0003) break;

            double metal = 0.0;
            for (int m = 0; m < 6; ++m) {
                mph[m] += metalFreqs[m] * ((ev.type == DrumType::Ride) ? 1.35 : 1.12) * INV_SR;
                if (mph[m] >= 1.0) mph[m] -= 1.0;
                metal += (mph[m] < 0.5 ? 1.0 : -1.0);
            }
            metal *= 0.16;
            double srcL = metal * 0.45 + rng.nextUniform() * 0.75;
            double srcR = metal * 0.45 + rng.nextUniform() * 0.75;

            double oL = hpL.processHP(srcL) * env;
            double oR = hpR.processHP(srcR) * env;
            if (ev.type == DrumType::Ride) {
                double ping = bellBP.processBP(metal) * std::exp(-t * 16.0) * 0.55;
                oL += ping; oR += ping;
            }
            panStereo((oL + oR) * 0.5 * gain, ev.pan, drumL[idx], drumR[idx]);
            hatEnv[idx] = std::max(hatEnv[idx], static_cast<float>(env * ev.vel));
        }
    } else if (ev.type == DrumType::SubDrop) {
        size_t s1 = std::min(TOTAL_SAMPLES, s0 + static_cast<size_t>(1.65 * SR));
        double ph = 0.0;
        for (size_t idx = s0; idx < s1; ++idx) {
            double t = (idx - s0) * INV_SR;
            double f = 31.0 + 72.0 * std::exp(-t * 2.4);
            ph += TWO_PI * f * INV_SR;
            double env = std::exp(-t * 1.9) * (1.0 - std::exp(-t * 120.0));
            double sig = softClip(std::sin(ph) * 1.25) * env * ev.vel * 0.42;
            drumL[idx] += sig;
            drumR[idx] += sig;
        }
    } else if (ev.type == DrumType::ReverseSuck) {
        // Reverse cymbal + vocal breath vacuum into the Drop!
        size_t durS = static_cast<size_t>(0.68 * SR);
        size_t startIdx = (s0 > durS) ? (s0 - durS) : 0;
        CytomicSVF bpL, bpR;
        for (size_t idx = startIdx; idx < s0 && idx < TOTAL_SAMPLES; ++idx) {
            double u = static_cast<double>(idx - startIdx) / std::max<size_t>(1, s0 - startIdx); // 0 -> 1
            double env = std::pow(u, 3.2);
            if ((idx & 31) == 0) {
                double fc = 500.0 + 7500.0 * u * u;
                bpL.setParams(fc, 1.3);
                bpR.setParams(fc * 1.05, 1.3);
            }
            double oL = bpL.processBP(rng.nextUniform()) * env * ev.vel * 0.28;
            double oR = bpR.processBP(rng.nextUniform()) * env * ev.vel * 0.28;
            drumL[idx] += oL;
            drumR[idx] += oR;
        }
    }
}

// ============================================================================
// 8x8 Feedback Delay Network (FDN) Lush Concert Hall + Shimmer Reverb
// ============================================================================
struct HallFDNReverb {
    static constexpr int N = 8;
    // Mutually prime delay line lengths (~31ms to ~97ms at 48kHz)
    static constexpr int BASE_LEN[N] = {1493, 1777, 2089, 2473, 2909, 3413, 3989, 4637};
    std::vector<double> buf[N];
    int writePos[N]{};
    double dampState[N]{};
    double lfoPhase[N]{};
    CytomicSVF inHP_L, inHP_R;

    // Pitch-shimmer dual grain buffer (+12 semitones octave shimmer!)
    static constexpr int SHIM_LEN = 4800;
    std::vector<double> shimBufL, shimBufR;
    int shimWrite = 0;
    double shimPh = 0.0;
    CytomicSVF shimLP_L, shimLP_R;

    HallFDNReverb() {
        for (int i = 0; i < N; ++i) {
            buf[i].assign(BASE_LEN[i] + 128, 0.0);
            lfoPhase[i] = i * (TWO_PI / N);
        }
        shimBufL.assign(SHIM_LEN, 0.0);
        shimBufR.assign(SHIM_LEN, 0.0);
        inHP_L.setParams(160.0, 0.707);
        inHP_R.setParams(160.0, 0.707);
        shimLP_L.setParams(5200.0, 0.75);
        shimLP_R.setParams(5200.0, 0.75);
    }

    inline void processSample(double inL, double inR, double decayFb, double shimmerAmt,
                              double& wetL, double& wetR) {
        double xL = inHP_L.processHP(inL);
        double xR = inHP_R.processHP(inR);

        // Octave-up dual crossfaded grain pitch shifter on reverb input for celestial shimmer
        shimBufL[shimWrite] = xL;
        shimBufR[shimWrite] = xR;
        auto readGrain = [&](double phaseOffset, double& gL, double& gR) {
            double p = std::fmod(shimPh + phaseOffset, 1.0);
            double win = 0.5 - 0.5 * std::cos(TWO_PI * p);
            double delaySamp = (1.0 - p) * (SHIM_LEN * 0.5);
            double rPos = shimWrite - delaySamp;
            if (rPos < 0.0) rPos += SHIM_LEN;
            int i0 = static_cast<int>(rPos) % SHIM_LEN;
            int i1 = (i0 + 1) % SHIM_LEN;
            double f = rPos - std::floor(rPos);
            gL = (shimBufL[i0] * (1.0 - f) + shimBufL[i1] * f) * win;
            gR = (shimBufR[i0] * (1.0 - f) + shimBufR[i1] * f) * win;
        };
        double g0L, g0R, g1L, g1R;
        readGrain(0.0, g0L, g0R);
        readGrain(0.5, g1L, g1R);
        shimPh += 1.0 / (SHIM_LEN * 0.5); // 2x speed -> +1 octave
        if (shimPh >= 1.0) shimPh -= 1.0;
        shimWrite = (shimWrite + 1) % SHIM_LEN;

        double sL = shimLP_L.processLP(g0L + g1L) * shimmerAmt;
        double sR = shimLP_R.processLP(g0R + g1R) * shimmerAmt;

        xL += sL;
        xR += sR;

        double delayed[N];
        for (int i = 0; i < N; ++i) {
            lfoPhase[i] += TWO_PI * (0.23 + 0.07 * i) * INV_SR;
            if (lfoPhase[i] >= TWO_PI) lfoPhase[i] -= TWO_PI;
            double mod = 12.0 * std::sin(lfoPhase[i]);
            int cap = static_cast<int>(buf[i].size());
            double rPos = writePos[i] - (BASE_LEN[i] + mod);
            while (rPos < 0.0) rPos += cap;
            int r0 = static_cast<int>(rPos) % cap;
            int r1 = (r0 + 1) % cap;
            double frac = rPos - std::floor(rPos);
            double d = buf[i][r0] * (1.0 - frac) + buf[i][r1] * frac;
            // Warm high-frequency absorption
            dampState[i] = d * 0.72 + dampState[i] * 0.28;
            delayed[i] = dampState[i];
        }

        // Fast Householder feedback matrix (orthogonal energy-preserving diffusion!)
        double sum = 0.0;
        for (int i = 0; i < N; ++i) sum += delayed[i];
        sum *= (2.0 / N);

        wetL = 0.0;
        wetR = 0.0;
        for (int i = 0; i < N; ++i) {
            double fbSig = (sum - delayed[i]) * decayFb;
            double inSig = ((i & 1) == 0 ? xL : xR) * 0.35 * ((i & 2) ? -1.0 : 1.0);
            buf[i][writePos[i]] = fbSig + inSig;
            writePos[i] = (writePos[i] + 1) % static_cast<int>(buf[i].size());
            if ((i & 1) == 0) wetL += delayed[i];
            else              wetR += delayed[i];
        }
        wetL *= 0.35;
        wetR *= 0.35;
    }
};

// Tempo-Synced Stereo Ping-Pong Delay (Dotted 16th / 8th)
struct PingPongDelay {
    std::vector<double> bufL, bufR;
    int lenL, lenR;
    int posL = 0, posR = 0;
    CytomicSVF bpL, bpR;

    PingPongDelay() {
        lenL = static_cast<int>(BEAT_SEC * 0.75 * SR);  // Dotted 16th left
        lenR = static_cast<int>(BEAT_SEC * 0.50 * SR);  // 8th right
        bufL.assign(lenL, 0.0);
        bufR.assign(lenR, 0.0);
        bpL.setParams(1800.0, 0.75);
        bpR.setParams(1950.0, 0.75);
    }

    inline void processSample(double inL, double inR, double& outL, double& outR) {
        double dL = bufL[posL];
        double dR = bufR[posR];
        bufL[posL] = bpL.processBP(inL + dR * 0.46);
        bufR[posR] = bpR.processBP(inR + dL * 0.46);
        posL = (posL + 1) % lenL;
        posR = (posR + 1) % lenR;
        outL = dL;
        outR = dR;
    }
};

// ============================================================================
// Radix-2 In-Place Cooley-Tukey FFT (for 60fps 64-Band Visual Spectrum)
// ============================================================================
void fftRadix2(std::vector<double>& re, std::vector<double>& im) {
    const size_t n = re.size();
    for (size_t i = 1, j = 0; i < n; ++i) {
        size_t bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            std::swap(re[i], re[j]);
            std::swap(im[i], im[j]);
        }
    }
    for (size_t len = 2; len <= n; len <<= 1) {
        double ang = -TWO_PI / static_cast<double>(len);
        double wlenRe = std::cos(ang), wlenIm = std::sin(ang);
        for (size_t i = 0; i < n; i += len) {
            double wRe = 1.0, wIm = 0.0;
            for (size_t j = 0; j < len / 2; ++j) {
                double uRe = re[i + j], uIm = im[i + j];
                double vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
                double vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
                re[i + j] = uRe + vRe;
                im[i + j] = uIm + vIm;
                re[i + j + len / 2] = uRe - vRe;
                im[i + j + len / 2] = uIm - vIm;
                double nwRe = wRe * wlenRe - wIm * wlenIm;
                wIm = wRe * wlenIm + wIm * wlenRe;
                wRe = nwRe;
            }
        }
    }
}

// ============================================================================
// Score Composition: "SINGULARITY BLOOM — 零度の花、光の果て —"
// ============================================================================
struct ChordDef {
    double startBar;
    double durBars;
    int bassMidi;
    std::vector<int> chordMidis; // lush 9th/11th/#11/alt voicings!
    int vowel;
};

void buildMasterpieceScore(std::vector<NoteEvent>& notes, std::vector<DrumEvent>& drums, FastRNG& rng) {
    auto B = [&](double bar, double beat = 0.0) {
        return (bar * 4.0 + beat) * BEAT_SEC;
    };
    auto D = [&](double beats) {
        return beats * BEAT_SEC;
    };

    // ------------------------------------------------------------------------
    // ACT I (Bars 0..15): Genesis — Frozen Glass Cathedral (F#m / D Lydian)
    // ------------------------------------------------------------------------
    std::vector<ChordDef> act1Chords = {
        {0.0,  2.0, 38, {50, 57, 61, 64, 66, 73, 80}, 2}, // Dmaj9(#11)
        {2.0,  2.0, 40, {52, 59, 64, 66, 68, 73, 78}, 4}, // E6(9)
        {4.0,  2.0, 42, {54, 61, 64, 69, 71, 73, 80}, 0}, // F#m11
        {6.0,  1.0, 40, {52, 59, 63, 68, 73, 76},     3}, // C#m9/E
        {7.0,  1.0, 46, {54, 61, 64, 70, 72, 79},     1}, // F#7(b9,#11)/A#
        {8.0,  2.0, 35, {47, 54, 57, 61, 62, 66, 73}, 0}, // Bm9
        {10.0, 1.0, 37, {49, 56, 59, 64, 68, 71},     3}, // C#m11
        {11.0, 1.0, 44, {56, 62, 66, 68, 72, 76},     4}, // G#7(b13)
        {12.0, 2.0, 38, {50, 57, 62, 66, 69, 73, 76}, 0}, // Dmaj9
        {14.0, 1.0, 37, {49, 56, 59, 61, 66, 71},     2}, // C#7sus4
        {15.0, 1.0, 37, {49, 56, 59, 65, 68, 74},     0}  // C#7(b9)
    };

    for (const auto& c : act1Chords) {
        // Expressive arpeggiated Felt Piano with delicate human rubato
        double totalBeats = c.durBars * 4.0;
        notes.push_back({InstType::FeltPiano, B(c.startBar, 0.0), D(totalBeats), double(c.bassMidi + 12), 0.56, -0.15});
        int steps = static_cast<int>(totalBeats * 2.0); // 8th-note flowing figures
        for (int s = 0; s < steps; ++s) {
            int m = c.chordMidis[s % c.chordMidis.size()];
            double jitter = rng.nextUniform() * 0.008;
            double vel = 0.44 + 0.16 * std::sin(PI * s / steps) + ((s % 4 == 0) ? 0.09 : 0.0);
            notes.push_back({InstType::FeltPiano, B(c.startBar, s * 0.5) + jitter, D(2.2), double(m), vel, 0.0});
            if (s % 4 == 2) {
                notes.push_back({InstType::Celesta, B(c.startBar, s * 0.5) + 0.004, D(1.8), double(m + 12), vel * 0.62, (s % 8 == 2) ? 0.35 : -0.35});
            }
        }
        // Enter warm Choir Pad & Solo Cello from Bar 8!
        if (c.startBar >= 8.0) {
            notes.push_back({InstType::SoloStrings, B(c.startBar, 0.0), D(totalBeats - 0.1), double(c.bassMidi + 12), 0.58, -0.28});
            for (size_t i = 1; i < std::min<size_t>(4, c.chordMidis.size()); ++i) {
                notes.push_back({InstType::ChoirPad, B(c.startBar, 0.0), D(totalBeats), double(c.chordMidis[i]), 0.42, (i % 2 == 0) ? -0.4 : 0.4, c.vowel});
            }
        }
    }

    // Core Leitmotif on Concert Piano & Aoi's Whispered Soprano Vocalise (Bars 0..15)
    struct MelNote { double bar; double beat; double dur; int midi; double vel; int vowel; };
    std::vector<MelNote> act1Motif = {
        {0.0, 2.0, 2.0, 73, 0.68, 2}, {1.0, 0.0, 1.5, 76, 0.72, 0}, {1.0, 1.5, 1.0, 73, 0.62, 1}, {1.0, 2.5, 1.5, 71, 0.65, 4},
        {2.0, 0.0, 2.5, 73, 0.70, 0}, {2.0, 2.5, 1.5, 68, 0.58, 3}, {3.0, 0.0, 4.0, 69, 0.64, 2},
        {4.0, 1.5, 1.5, 73, 0.70, 0}, {4.0, 3.0, 1.0, 76, 0.74, 1}, {5.0, 0.0, 2.0, 80, 0.78, 0}, {5.0, 2.0, 2.0, 78, 0.72, 4},
        {6.0, 0.0, 2.0, 76, 0.70, 3}, {6.0, 2.0, 2.0, 73, 0.66, 1}, {7.0, 0.0, 4.0, 70, 0.72, 4},
        // Phrase 2 (Joined by Aoi's Soprano Vocalise!)
        {8.0, 0.0, 1.5, 74, 0.76, 0}, {8.0, 1.5, 1.5, 76, 0.78, 1}, {8.0, 3.0, 1.0, 78, 0.80, 0},
        {9.0, 0.0, 2.5, 81, 0.85, 0}, {9.0, 2.5, 1.5, 78, 0.74, 4},
        {10.0, 0.0, 2.0, 80, 0.80, 3}, {10.0, 2.0, 2.0, 76, 0.74, 1},
        {11.0, 0.0, 2.5, 75, 0.76, 0}, {11.0, 2.5, 1.5, 80, 0.82, 4},
        {12.0, 0.0, 2.0, 78, 0.82, 0}, {12.0, 2.0, 1.0, 76, 0.75, 1}, {12.0, 3.0, 1.0, 73, 0.72, 2},
        {13.0, 0.0, 2.5, 76, 0.78, 3}, {13.0, 2.5, 1.5, 74, 0.72, 0},
        {14.0, 0.0, 4.0, 73, 0.78, 4}, {15.0, 0.0, 3.5, 74, 0.80, 0} // poignant b9 sigh!
    };
    double prevVocMidi = -1.0;
    for (const auto& m : act1Motif) {
        notes.push_back({InstType::GrandPiano, B(m.bar, m.beat), D(m.dur * 1.15), double(m.midi + 12), m.vel, 0.12});
        notes.push_back({InstType::Celesta, B(m.bar, m.beat) + 0.005, D(m.dur), double(m.midi + 12), m.vel * 0.55, -0.18});
        if (m.bar >= 8.0) {
            notes.push_back({InstType::VocaliseLead, B(m.bar, m.beat), D(m.dur * 0.96), double(m.midi), m.vel * 0.78, 0.05, m.vowel, prevVocMidi});
            prevVocMidi = m.midi;
        }
    }

    // ------------------------------------------------------------------------
    // ACT II (Bars 16..31): Awakening — Neural Pulse (174 BPM Polymetric Liquid)
    // ------------------------------------------------------------------------
    std::vector<ChordDef> act2Chords = {
        {16.0, 2.0, 42, {54, 61, 64, 69, 73, 76}, 0}, // F#m9
        {18.0, 2.0, 38, {50, 57, 62, 66, 73, 80}, 1}, // Dmaj9(#11)
        {20.0, 2.0, 40, {52, 59, 64, 66, 68, 76}, 4}, // Eadd9
        {22.0, 1.0, 37, {49, 56, 59, 64, 71, 76}, 3}, // C#m7
        {23.0, 1.0, 40, {54, 61, 64, 69, 73, 78}, 2}, // F#m7/E
        {24.0, 2.0, 35, {47, 54, 57, 62, 66, 73}, 0}, // Bm9
        {26.0, 1.0, 37, {49, 56, 61, 64, 71, 76}, 1}, // C#m7
        {27.0, 1.0, 38, {50, 57, 62, 66, 73, 78}, 0}, // Dmaj7
        {28.0, 2.0, 39, {51, 57, 61, 66, 73, 78}, 3}, // D#m7(b5)
        {30.0, 1.0, 37, {49, 56, 59, 61, 66, 73}, 4}, // C#7sus4
        {31.0, 1.0, 37, {49, 56, 59, 65, 69, 76}, 0}  // C#7(#9,b13)
    };

    for (const auto& c : act2Chords) {
        double beats = c.durBars * 4.0;
        notes.push_back({InstType::SubBass, B(c.startBar, 0.0), D(beats - 0.1), double(c.bassMidi), 0.78, 0.0});
        notes.push_back({InstType::ReeseBass, B(c.startBar, 0.0), D(beats - 0.08), double(c.bassMidi), 0.75, 0.0});

        // Lush Strings + Choir swelling underneath
        for (size_t i = 0; i < c.chordMidis.size(); ++i) {
            notes.push_back({InstType::StringEns, B(c.startBar, 0.0), D(beats), double(c.chordMidis[i]), 0.58, (i % 2 == 0) ? -0.5 : 0.5});
        }

        // Polymetric 7-step (3+2+2) sparkling stereo ArpPluck across 16th-note grid!
        int sixteenths = static_cast<int>(beats * 4.0);
        static constexpr int polyPattern[7] = {0, 2, 4, 5, 3, 4, 2};
        for (int s = 0; s < sixteenths; ++s) {
            int pIdx = polyPattern[s % 7] % static_cast<int>(c.chordMidis.size());
            int oct = (s % 7 == 3 || s % 7 == 5) ? 12 : 0;
            bool accent = (s % 7 == 0 || s % 7 == 3 || s % 7 == 5);
            double vel = accent ? 0.76 : 0.48;
            double pan = std::sin(s * 0.9) * 0.62;
            notes.push_back({InstType::ArpPluck, B(c.startBar, s * 0.25), D(0.32), double(c.chordMidis[pIdx] + oct), vel, pan});
            // Spiccato Piano broken octaves from Bar 24
            if (c.startBar >= 24.0 && (s % 2 == 0)) {
                int pm = c.chordMidis[(s / 2) % c.chordMidis.size()];
                notes.push_back({InstType::GrandPiano, B(c.startBar, s * 0.25), D(0.45), double(pm + 12), 0.62, -pan * 0.5});
            }
        }
    }

    // Act II Liquid Breakbeat Groove (Bars 16..31)
    drums.push_back({DrumType::SubDrop, B(16.0, 0.0), 0.75});
    for (int bar = 16; bar < 32; ++bar) {
        drums.push_back({DrumType::Kick, B(bar, 0.0), 0.76});
        drums.push_back({DrumType::Kick, B(bar, 2.5), 0.72});
        if (bar >= 24) {
            drums.push_back({DrumType::Snare, B(bar, 1.0), 0.68});
            drums.push_back({DrumType::Snare, B(bar, 3.0), 0.72});
            drums.push_back({DrumType::GhostSnare, B(bar, 1.75), 0.45});
            drums.push_back({DrumType::GhostSnare, B(bar, 2.25), 0.48});
        } else {
            drums.push_back({DrumType::GhostSnare, B(bar, 1.0), 0.52});
            drums.push_back({DrumType::GhostSnare, B(bar, 3.0), 0.56});
        }
        for (int s = 0; s < 16; ++s) {
            double v = (s % 4 == 0) ? 0.58 : ((s % 2 == 0) ? 0.42 : 0.28);
            drums.push_back({DrumType::ClosedHat, B(bar, s * 0.25), v, (s % 2 == 0) ? -0.22 : 0.22});
        }
        if (bar % 4 == 3) {
            drums.push_back({DrumType::OpenHat, B(bar, 3.5), 0.55, 0.28});
        }
    }

    // Act II Rising Pre-Chorus Melody (Aoi Vocalise + Solo Violin unison!)
    std::vector<MelNote> act2Mel = {
        {16.0, 0.0, 2.5, 73, 0.76, 0}, {16.0, 2.5, 1.5, 76, 0.78, 1}, {17.0, 0.0, 3.5, 80, 0.82, 4},
        {18.0, 0.0, 2.0, 81, 0.84, 0}, {18.0, 2.0, 2.0, 78, 0.78, 3}, {19.0, 0.0, 3.5, 76, 0.76, 1},
        {20.0, 0.0, 1.5, 76, 0.78, 3}, {20.0, 1.5, 1.5, 78, 0.80, 0}, {20.0, 3.0, 1.0, 80, 0.84, 4},
        {21.0, 0.0, 4.0, 83, 0.88, 0},
        {22.0, 0.0, 2.0, 80, 0.82, 1}, {22.0, 2.0, 2.0, 76, 0.76, 3}, {23.0, 0.0, 3.5, 78, 0.80, 0},
        {24.0, 0.0, 2.0, 74, 0.82, 0}, {24.0, 2.0, 2.0, 78, 0.84, 1}, {25.0, 0.0, 3.5, 81, 0.88, 0},
        {26.0, 0.0, 2.0, 80, 0.86, 3}, {26.0, 2.0, 2.0, 83, 0.88, 4}, {27.0, 0.0, 3.5, 85, 0.92, 0},
        {28.0, 0.0, 2.5, 85, 0.92, 1}, {28.0, 2.5, 1.5, 81, 0.86, 0}, {29.0, 0.0, 3.5, 78, 0.85, 4},
        {30.0, 0.0, 4.0, 80, 0.90, 3}, {31.0, 0.0, 3.5, 85, 0.95, 0}
    };
    prevVocMidi = -1.0;
    for (const auto& m : act2Mel) {
        notes.push_back({InstType::VocaliseLead, B(m.bar, m.beat), D(m.dur * 0.95), double(m.midi), m.vel * 0.85, 0.06, m.vowel, prevVocMidi});
        notes.push_back({InstType::SoloStrings, B(m.bar, m.beat), D(m.dur * 0.95), double(m.midi), m.vel * 0.72, -0.22, 0, prevVocMidi});
        prevVocMidi = m.midi;
    }

    // ------------------------------------------------------------------------
    // ACT III (Bars 32..39): Ignition — Event Horizon Riser + Breathless Silence!
    // ------------------------------------------------------------------------
    std::vector<ChordDef> act3Chords = {
        {32.0, 1.0, 35, {47, 54, 62, 66, 73, 78}, 0}, // Bm9
        {33.0, 1.0, 37, {49, 56, 64, 68, 73, 80}, 3}, // C#m9
        {34.0, 1.0, 38, {50, 57, 66, 69, 74, 81}, 0}, // Dmaj9
        {35.0, 1.0, 39, {51, 57, 66, 69, 75, 81}, 1}, // D#dim7
        {36.0, 1.0, 40, {52, 59, 66, 71, 76, 83}, 4}, // Esus4
        {37.0, 1.0, 41, {53, 59, 68, 71, 77, 83}, 0}, // Fdim7
        {38.0, 1.0, 37, {49, 59, 65, 68, 74, 85}, 0}  // C#7(b9,#9) peak tension!
    };
    for (const auto& c : act3Chords) {
        double prog = (c.startBar - 32.0) / 6.0; // 0..1
        notes.push_back({InstType::SubBass, B(c.startBar, 0.0), D(3.9), double(c.bassMidi), 0.75 + 0.2 * prog, 0.0});
        notes.push_back({InstType::ReeseBass, B(c.startBar, 0.0), D(3.9), double(c.bassMidi), 0.75 + 0.2 * prog, 0.0});
        for (int m : c.chordMidis) {
            notes.push_back({InstType::Supersaw, B(c.startBar, 0.0), D(3.85), double(m), 0.45 + 0.48 * prog, 0.0});
            notes.push_back({InstType::StringEns, B(c.startBar, 0.0), D(3.95), double(m), 0.65 + 0.30 * prog, 0.0});
        }
        // Rapid 16th piano runs climbing toward heaven!
        for (int s = 0; s < 16; ++s) {
            int pm = c.chordMidis[s % c.chordMidis.size()] + ((s >= 8) ? 12 : 0);
            notes.push_back({InstType::GrandPiano, B(c.startBar, s * 0.25), D(0.35), double(pm), 0.68 + 0.28 * prog, (s % 2 == 0) ? -0.35 : 0.35});
        }
    }

    // Snare & Kick Accelerating Build (Bars 32..38)
    for (int bar = 32; bar <= 38; ++bar) {
        int subdiv = (bar < 35) ? 2 : ((bar < 37) ? 4 : 8); // half -> quarter -> 8th -> 16th -> 32nd!
        int totalHits = 4 * subdiv;
        for (int h = 0; h < totalHits; ++h) {
            double beat = static_cast<double>(h) / subdiv;
            double u = ((bar - 32) + beat / 4.0) / 7.0;
            double v = 0.52 + 0.45 * u;
            drums.push_back({DrumType::Snare, B(bar, beat), v});
            if (bar < 37 && (h % 2 == 0)) {
                drums.push_back({DrumType::Kick, B(bar, beat), v * 0.88});
            }
        }
    }
    // Shepard-like Pitch Riser Lead in Bars 32..38.9
    for (int step = 0; step < 56; ++step) {
        double barPos = 32.0 + step * 0.125;
        double midiRise = 61.0 + 24.0 * (step / 56.0);
        notes.push_back({InstType::SynthLead, B(barPos, 0.0), D(0.55), midiRise, 0.38 + 0.55 * (step / 56.0), std::sin(step * 0.5) * 0.6, 0, midiRise - 0.4});
    }

    // BAR 39: THE BREATHLESS SILENCE BEFORE DROP I!
    drums.push_back({DrumType::Crash, B(39.0, 0.0), 0.55});
    drums.push_back({DrumType::SubDrop, B(39.0, 0.0), 0.85});
    // One crystalline suspended high bell chord on Beat 0, damped quickly, then vacuum!
    for (int m : {73, 80, 83, 86, 89}) {
        notes.push_back({InstType::GrandPiano, B(39.0, 0.0), D(0.9), double(m), 0.72, 0.0});
        notes.push_back({InstType::Celesta, B(39.0, 0.0), D(0.8), double(m + 12), 0.65, 0.0});
    }
    // Beat 3.0 -> 4.0 pickup into Bar 40: Reverse vacuum suck + explosive snare flam!
    drums.push_back({DrumType::ReverseSuck, B(40.0, 0.0), 0.95});
    drums.push_back({DrumType::Snare, B(39.0, 3.50), 0.78});
    drums.push_back({DrumType::Snare, B(39.0, 3.75), 0.95});

    // ------------------------------------------------------------------------
    // Helper Lambda for Euphoric Symphonic Artcore Drops (Drop I & Drop II!)
    // ------------------------------------------------------------------------
    auto renderArtcoreDrop = [&](double startBar, int transposeSemitones, bool isClimaxDrop2) {
        // 16-bar Royal-Road + Jazz-Altered Artcore Progression (base in F#m / Dmaj9)
        std::vector<ChordDef> dropChords = {
            {0.0,  2.0, 38, {50, 57, 62, 66, 69, 73, 76}, 0}, // Dmaj9 -> Fmaj9 (+3)
            {2.0,  2.0, 40, {52, 59, 64, 68, 71, 73, 78}, 3}, // E6(9) -> G6(9)
            {4.0,  1.0, 42, {54, 61, 64, 69, 73, 76, 80}, 0}, // F#m11 -> Am11
            {5.0,  1.0, 37, {49, 57, 61, 64, 69, 73, 80}, 1}, // Aadd9/C# -> Cadd9/E
            {6.0,  1.0, 38, {50, 57, 62, 66, 73, 80},     0}, // Dmaj7#11 -> Fmaj7#11
            {7.0,  1.0, 37, {49, 59, 65, 68, 74, 80},     4}, // C#7(b9,#9) -> E7(b9,#9)
            {8.0,  1.0, 42, {54, 61, 64, 69, 73, 76},     0}, // F#m9 -> Am9
            {9.0,  0.5, 40, {52, 59, 62, 67, 71, 74},     2}, // Em9 -> Gm9
            {9.5,  0.5, 33, {45, 55, 61, 66, 73, 78},     0}, // A13 -> C13
            {10.0, 1.0, 38, {50, 57, 62, 66, 69, 73, 76}, 0}, // Dmaj9 -> Fmaj9
            {11.0, 1.0, 38, {50, 59, 64, 68, 71, 76},     3}, // E/D -> G/F
            {12.0, 1.0, 37, {49, 56, 61, 64, 71, 76},     1}, // C#m7 -> Em7
            {13.0, 1.0, 42, {54, 64, 70, 73, 79, 82},     4}, // F#7alt -> A7alt
            {14.0, 0.5, 35, {47, 54, 62, 66, 73, 78},     0}, // Bm9 -> Dm9
            {14.5, 0.5, 37, {49, 56, 64, 68, 76, 80},     3}, // C#m7 -> Em7
            {15.0, 0.5, 38, {50, 57, 66, 69, 78, 81},     0}, // Dmaj7 -> Fmaj7
            {15.5, 0.5, 40, {52, 59, 66, 69, 76, 83},     0}  // E13sus4 -> G13sus4
        };

        // Climax Drop II gets 4 extra devastatingly emotional finale bars (Bars 88..91)!
        if (isClimaxDrop2) {
            dropChords.back() = {15.0, 0.5, 38, {50, 57, 66, 69, 78, 81}, 0}; // Fmaj7
            dropChords.push_back({15.5, 0.5, 39, {51, 57, 64, 69, 76, 81}, 1}); // F#m7b5
            // Note: below chords already written relative to base so +transposeSemitones (+3) lands in F/Fm/C/E7!
            dropChords.push_back({16.0, 1.0, 38, {50, 57, 62, 66, 73, 80}, 0}); // Fmaj9(#11)
            dropChords.push_back({17.0, 1.0, 38, {50, 58, 62, 65, 73, 77}, 4}); // Fm(maj9)!! Heartbreak cadence!
            dropChords.push_back({18.0, 1.0, 40, {52, 57, 61, 64, 71, 76}, 0}); // Cadd9/G -> E/G#
            dropChords.push_back({19.0, 1.0, 37, {49, 56, 59, 65, 68, 74}, 0}); // E7(b9) -> resolves to A Major at Bar 92!
        }

        int totalDropBars = isClimaxDrop2 ? 20 : 16;

        for (const auto& c : dropChords) {
            double absBar = startBar + c.startBar;
            double beats = c.durBars * 4.0;
            int root = c.bassMidi + transposeSemitones;
            if (root > 45) root -= 12; // keep Sub-Bass right in the chest-punching 41Hz..82Hz sweet spot!

            // Rhythmic Bassline with DnB syncopation
            if (beats >= 4.0) {
                notes.push_back({InstType::SubBass, B(absBar, 0.0), D(2.4), double(root), 0.95, 0.0});
                notes.push_back({InstType::SubBass, B(absBar, 2.5), D(1.45), double(root), 0.92, 0.0});
                notes.push_back({InstType::ReeseBass, B(absBar, 0.0), D(2.4), double(root), 0.90, 0.0});
                notes.push_back({InstType::ReeseBass, B(absBar, 2.5), D(1.45), double(root + 12), 0.85, 0.0});
                if (c.durBars >= 2.0) {
                    notes.push_back({InstType::SubBass, B(absBar + 1.0, 0.0), D(2.4), double(root), 0.95, 0.0});
                    notes.push_back({InstType::SubBass, B(absBar + 1.0, 2.5), D(1.45), double(root), 0.92, 0.0});
                    notes.push_back({InstType::ReeseBass, B(absBar + 1.0, 0.0), D(3.9), double(root), 0.90, 0.0});
                }
            } else {
                notes.push_back({InstType::SubBass, B(absBar, 0.0), D(beats - 0.05), double(root), 0.95, 0.0});
                notes.push_back({InstType::ReeseBass, B(absBar, 0.0), D(beats - 0.05), double(root), 0.90, 0.0});
            }

            // Massive 9-Voice Supersaw Wall + Symphonic Strings + Full Choir!
            for (size_t i = 0; i < c.chordMidis.size(); ++i) {
                double m = c.chordMidis[i] + transposeSemitones;
                notes.push_back({InstType::Supersaw, B(absBar, 0.0), D(beats - 0.04), m, isClimaxDrop2 ? 0.96 : 0.90, 0.0});
                notes.push_back({InstType::StringEns, B(absBar, 0.0), D(beats), m, isClimaxDrop2 ? 0.82 : 0.72, (i % 2 == 0) ? -0.6 : 0.6});
                if (i >= 1 && i <= 4) {
                    notes.push_back({InstType::ChoirPad, B(absBar, 0.0), D(beats), m, isClimaxDrop2 ? 0.68 : 0.52, (i % 2 == 0) ? 0.45 : -0.45, c.vowel});
                }
            }

            // Sparkling Virtuosic Artcore Grand Piano 16th-Note Arpeggio Counter-Runs!
            int sixteenths = static_cast<int>(beats * 4.0);
            static constexpr int arpRun[8] = {0, 2, 4, 6, 5, 3, 4, 2};
            for (int s = 0; s < sixteenths; ++s) {
                int idx = arpRun[s % 8] % static_cast<int>(c.chordMidis.size());
                double pm = c.chordMidis[idx] + transposeSemitones + ((s % 8 == 3 || s % 8 == 4) ? 12 : 0);
                double vel = (s % 4 == 0) ? 0.78 : 0.54;
                notes.push_back({InstType::GrandPiano, B(absBar, s * 0.25), D(0.36), pm, vel, std::cos(s * 0.7) * 0.48});
            }
        }

        // Soaring Anthem Drop Melody (Grand Piano Octaves + Screaming Synth Lead + Soprano Vocalise!)
        std::vector<MelNote> dropMel = {
            // Bars 0..3: Iconic Syncopated Artcore Hook!
            {0.0, 0.0, 1.5, 81, 0.95, 0}, {0.0, 1.5, 1.0, 80, 0.88, 1}, {0.0, 2.5, 1.5, 76, 0.90, 3},
            {1.0, 0.0, 1.5, 78, 0.92, 0}, {1.0, 1.5, 1.0, 80, 0.90, 4}, {1.0, 2.5, 1.5, 85, 0.98, 0},
            {2.0, 0.0, 1.5, 83, 0.95, 3}, {2.0, 1.5, 1.0, 80, 0.88, 1}, {2.0, 2.5, 1.5, 76, 0.90, 4},
            {3.0, 0.0, 2.5, 80, 0.94, 0}, {3.0, 2.5, 0.75, 81, 0.90, 1}, {3.0, 3.25, 0.75, 83, 0.94, 3},
            // Bars 4..7: Leaping Octave Euphoria + Altered-Dominant Tension!
            {4.0, 0.0, 1.5, 85, 0.98, 0}, {4.0, 1.5, 1.0, 81, 0.90, 1}, {4.0, 2.5, 1.5, 76, 0.88, 2},
            {5.0, 0.0, 1.5, 88, 1.00, 0}, {5.0, 1.5, 1.5, 85, 0.94, 3}, {5.0, 3.0, 1.0, 81, 0.90, 1},
            {6.0, 0.0, 1.5, 86, 0.96, 0}, {6.0, 1.5, 1.0, 85, 0.92, 3}, {6.0, 2.5, 1.5, 81, 0.90, 1},
            {7.0, 0.0, 2.5, 80, 0.96, 4}, {7.0, 2.5, 1.5, 86, 0.98, 0}, // b9->#9 electric thrill!
            // Bars 8..11: Second Half Answer & Rapid Jazz-Artcore Turnaround
            {8.0, 0.0, 1.5, 85, 0.98, 0}, {8.0, 1.5, 1.0, 81, 0.90, 1}, {8.0, 2.5, 1.5, 78, 0.88, 4},
            {9.0, 0.0, 1.0, 79, 0.92, 2}, {9.0, 1.0, 1.0, 81, 0.94, 0}, {9.0, 2.0, 1.0, 85, 0.96, 3}, {9.0, 3.0, 1.0, 88, 1.00, 0},
            {10.0, 0.0, 1.5, 86, 0.98, 0}, {10.0, 1.5, 1.0, 85, 0.92, 1}, {10.0, 2.5, 1.5, 81, 0.90, 3},
            {11.0, 0.0, 2.5, 83, 0.96, 4}, {11.0, 2.5, 0.75, 85, 0.94, 1}, {11.0, 3.25, 0.75, 86, 0.96, 0},
            // Bars 12..15: Virtuosic Ascent to Peak!
            {12.0, 0.0, 1.5, 88, 1.00, 0}, {12.0, 1.5, 1.5, 83, 0.92, 3}, {12.0, 3.0, 1.0, 80, 0.90, 1},
            {13.0, 0.0, 2.0, 82, 0.96, 4}, {13.0, 2.0, 2.0, 86, 0.98, 0},
            {14.0, 0.0, 1.0, 85, 0.96, 0}, {14.0, 1.0, 1.0, 86, 0.96, 1}, {14.0, 2.0, 1.0, 88, 0.98, 3}, {14.0, 3.0, 1.0, 90, 1.00, 0},
            {15.0, 0.0, 2.0, 88, 1.00, 0}, {15.0, 2.0, 2.0, 93, 1.00, 0}
        };
        if (isClimaxDrop2) {
            // Extra 4-bar tearjerker climax extension (Bars 88..91)!
            dropMel.push_back({16.0, 0.0, 2.5, 90, 1.00, 0});
            dropMel.push_back({16.0, 2.5, 1.5, 88, 0.96, 1});
            dropMel.push_back({17.0, 0.0, 2.5, 89, 1.00, 4}); // Ab6/Bb over Fm(maj9)!!
            dropMel.push_back({17.0, 2.5, 1.5, 86, 0.96, 0});
            dropMel.push_back({18.0, 0.0, 2.0, 85, 0.98, 3});
            dropMel.push_back({18.0, 2.0, 2.0, 81, 0.94, 1});
            dropMel.push_back({19.0, 0.0, 4.0, 80, 1.00, 0}); // Resolves into C#6 / A Major at Bar 92!
        }

        double prevLead = -1.0;
        for (const auto& m : dropMel) {
            double absBar = startBar + m.bar;
            double pitch = m.midi + transposeSemitones;
            // Keep soprano vocalise in realistic angel register while SynthLead + GrandPiano soar on top!
            double vocPitch = (pitch > 86.0) ? (pitch - 12.0) : pitch;
            notes.push_back({InstType::SynthLead, B(absBar, m.beat), D(m.dur * 0.94), pitch, m.vel * 0.92, 0.14, 0, prevLead});
            notes.push_back({InstType::GrandPiano, B(absBar, m.beat), D(m.dur * 1.05), pitch, m.vel * 0.95, -0.14});
            notes.push_back({InstType::GrandPiano, B(absBar, m.beat), D(m.dur * 1.05), pitch - 12.0, m.vel * 0.78, -0.10});
            notes.push_back({InstType::VocaliseLead, B(absBar, m.beat), D(m.dur * 0.95), vocPitch, m.vel * 0.82, 0.0, m.vowel, (prevLead > 86.0 ? prevLead - 12.0 : prevLead)});
            prevLead = pitch;
        }

        // Full High-Octane Artcore Drum & Bass Breakbeat Kit!
        drums.push_back({DrumType::SubDrop, B(startBar, 0.0), 0.95});
        for (int b = 0; b < totalDropBars; ++b) {
            double absBar = startBar + b;
            if (b % 4 == 0) {
                drums.push_back({DrumType::Crash, B(absBar, 0.0), 0.92, -0.35});
                if (isClimaxDrop2) drums.push_back({DrumType::Crash, B(absBar, 0.0), 0.85, 0.35});
            }

            if (b % 4 == 3) {
                // Signature 4th-bar Artcore Amen/Glitch Breakbeat Fill!
                drums.push_back({DrumType::Kick, B(absBar, 0.0), 0.96});
                drums.push_back({DrumType::Snare, B(absBar, 1.0), 0.95});
                drums.push_back({DrumType::Kick, B(absBar, 1.5), 0.88});
                drums.push_back({DrumType::GhostSnare, B(absBar, 2.0), 0.75});
                drums.push_back({DrumType::Kick, B(absBar, 2.25), 0.90});
                drums.push_back({DrumType::Snare, B(absBar, 2.5), 0.94});
                drums.push_back({DrumType::Snare, B(absBar, 3.0), 0.96});
                drums.push_back({DrumType::Snare, B(absBar, 3.25), 0.84});
                drums.push_back({DrumType::Snare, B(absBar, 3.5), 0.92});
                drums.push_back({DrumType::Snare, B(absBar, 3.75), 0.98});
            } else {
                // Classic Razor-Sharp 174 BPM Two-Step + Ghost Breakbeat
                drums.push_back({DrumType::Kick, B(absBar, 0.0), 0.98});
                drums.push_back({DrumType::Kick, B(absBar, 2.5), 0.95});
                if (b % 2 == 1) {
                    drums.push_back({DrumType::Kick, B(absBar, 1.75), 0.76});
                }
                drums.push_back({DrumType::Snare, B(absBar, 1.0), 0.96});
                drums.push_back({DrumType::Clap,  B(absBar, 1.0), 0.65});
                drums.push_back({DrumType::Snare, B(absBar, 3.0), 0.98});
                drums.push_back({DrumType::Clap,  B(absBar, 3.0), 0.68});
                drums.push_back({DrumType::GhostSnare, B(absBar, 1.75), 0.58});
                drums.push_back({DrumType::GhostSnare, B(absBar, 2.25), 0.62});
                drums.push_back({DrumType::GhostSnare, B(absBar, 3.75), 0.55});
            }

            // Sizzling Ride on 8ths + Crisp 16th Hats
            for (int e = 0; e < 8; ++e) {
                drums.push_back({DrumType::Ride, B(absBar, e * 0.5), (e % 2 == 0) ? 0.65 : 0.48, 0.32});
            }
            for (int s = 0; s < 16; ++s) {
                drums.push_back({DrumType::ClosedHat, B(absBar, s * 0.25), (s % 2 == 0) ? 0.58 : 0.38, -0.25});
            }
            drums.push_back({DrumType::OpenHat, B(absBar, 1.5), 0.55, -0.30});
            drums.push_back({DrumType::OpenHat, B(absBar, 3.5), 0.58, 0.30});
        }
    };

    // Render DROP I (Bars 40..55, F#m / Dmaj9, transpose = 0)
    renderArtcoreDrop(40.0, 0, false);

    // ------------------------------------------------------------------------
    // ACT V (Bars 56..71): Interlude — Digital Tears & Pivot Modulation (+3!)
    // ------------------------------------------------------------------------
    drums.push_back({DrumType::Crash, B(56.0, 0.0), 0.62});
    drums.push_back({DrumType::SubDrop, B(56.0, 0.0), 0.78});

    std::vector<ChordDef> act5Chords = {
        {56.0, 2.0, 38, {50, 57, 62, 66, 73, 76}, 0}, // Dmaj9
        {58.0, 2.0, 38, {50, 58, 62, 65, 73, 77}, 4}, // Dm(maj9) — poignant tears!
        {60.0, 1.0, 37, {49, 57, 61, 64, 69, 76}, 1}, // Aadd9/C#
        {61.0, 1.0, 42, {54, 64, 67, 70, 74, 78}, 3}, // F#7(b13)
        {62.0, 1.0, 35, {47, 54, 62, 66, 73, 78}, 0}, // Bm9
        {63.0, 1.0, 40, {52, 59, 62, 66, 71, 76}, 2}, // E9sus4
        // Smooth Pivot Modulation to A Minor / F Major (+3 semitones)!
        {64.0, 1.0, 38, {50, 57, 62, 66, 73, 78}, 0}, // Dmaj7
        {65.0, 1.0, 43, {55, 62, 66, 71, 74, 79}, 4}, // Gmaj9
        {66.0, 2.0, 40, {52, 60, 64, 67, 74, 79}, 0}, // Cmaj9/E (luminous lift!)
        {68.0, 2.0, 38, {50, 57, 60, 65, 72, 76}, 1}, // Dm9
        {70.0, 1.0, 40, {52, 59, 64, 69, 74, 76}, 3}, // Esus4
        {71.0, 0.5, 40, {52, 59, 62, 68, 71, 77}, 0}  // E7(b9,#9) -> Half-bar breath at 71.5!
    };

    for (const auto& c : act5Chords) {
        double beats = c.durBars * 4.0;
        // Extended Karplus-Strong Harp / Koto Arpeggios + Felt Piano!
        notes.push_back({InstType::FeltPiano, B(c.startBar, 0.0), D(beats), double(c.bassMidi + 12), 0.58, -0.2});
        if (c.startBar >= 64.0) {
            notes.push_back({InstType::SubBass, B(c.startBar, 0.0), D(beats), double(c.bassMidi), 0.72, 0.0});
            for (int m : c.chordMidis) {
                notes.push_back({InstType::StringEns, B(c.startBar, 0.0), D(beats), double(m), 0.65, 0.0});
                notes.push_back({InstType::ChoirPad, B(c.startBar, 0.0), D(beats), double(m), 0.55, 0.0, c.vowel});
            }
        }
        int eighths = static_cast<int>(beats * 2.0);
        for (int e = 0; e < eighths; ++e) {
            int m = c.chordMidis[e % c.chordMidis.size()] + ((e % 6 == 5) ? 12 : 0);
            double pan = -0.55 + 1.1 * ((e % 5) / 4.0);
            notes.push_back({InstType::HarpPluck, B(c.startBar, e * 0.5), D(2.4), double(m), 0.68, pan});
            if (e % 2 == 0) {
                notes.push_back({InstType::FeltPiano, B(c.startBar, e * 0.5), D(1.8), double(m), 0.48, -pan * 0.4});
            }
        }
    }

    // Two-Voice Counterpoint in Act V: Solo Cello/Violin vs. Aoi Soprano Vocalise!
    std::vector<MelNote> act5Voc = {
        {56.0, 0.0, 3.0, 78, 0.78, 0}, {56.0, 3.0, 1.0, 76, 0.72, 1}, {57.0, 0.0, 4.0, 73, 0.76, 2},
        {58.0, 0.0, 3.0, 77, 0.82, 4}, {58.0, 3.0, 1.0, 74, 0.75, 0}, {59.0, 0.0, 4.0, 73, 0.78, 3},
        {60.0, 0.0, 2.0, 76, 0.80, 1}, {60.0, 2.0, 2.0, 73, 0.74, 0}, {61.0, 0.0, 4.0, 78, 0.84, 4},
        {62.0, 0.0, 2.5, 74, 0.80, 0}, {62.0, 2.5, 1.5, 78, 0.82, 1}, {63.0, 0.0, 4.0, 76, 0.82, 3},
        // Pivot Modulation Ascent!
        {64.0, 0.0, 4.0, 78, 0.85, 0}, {65.0, 0.0, 4.0, 79, 0.88, 4},
        {66.0, 0.0, 2.5, 84, 0.92, 0}, {66.0, 2.5, 1.5, 79, 0.85, 1}, {67.0, 0.0, 4.0, 81, 0.90, 3},
        {68.0, 0.0, 2.0, 81, 0.90, 0}, {68.0, 2.0, 2.0, 84, 0.94, 1}, {69.0, 0.0, 4.0, 86, 0.96, 0},
        {70.0, 0.0, 4.0, 83, 0.96, 3}, {71.0, 0.0, 2.0, 88, 1.00, 0}
    };
    prevVocMidi = -1.0;
    for (const auto& m : act5Voc) {
        notes.push_back({InstType::VocaliseLead, B(m.bar, m.beat), D(m.dur * 0.96), double(m.midi), m.vel * 0.85, 0.18, m.vowel, prevVocMidi});
        // Solo Cello warm sixth/tenth harmony underneath!
        notes.push_back({InstType::SoloStrings, B(m.bar, m.beat), D(m.dur * 0.98), double(m.midi - 9), m.vel * 0.75, -0.28, 0, (prevVocMidi > 0 ? prevVocMidi - 9 : -1.0)});
        prevVocMidi = m.midi;
    }

    // Orchestral Crescendo into DROP II (Bars 68..71.9)
    for (int bar = 68; bar <= 70; ++bar) {
        int subdiv = (bar == 68) ? 2 : ((bar == 69) ? 4 : 8);
        for (int h = 0; h < 4 * subdiv; ++h) {
            double u = ((bar - 68) + double(h) / (4 * subdiv)) / 3.5;
            drums.push_back({DrumType::Snare, B(bar, double(h) / subdiv), 0.45 + 0.50 * u});
            if (h % 2 == 0 && bar < 70) drums.push_back({DrumType::Kick, B(bar, double(h) / subdiv), 0.65 + 0.25 * u});
        }
    }
    // Bar 71: Harp glissando + Reverse suck + Snare pickup into Key-Changed DROP II!
    for (int g = 0; g < 12; ++g) {
        static constexpr int gliss[12] = {64, 65, 68, 71, 74, 76, 77, 80, 83, 86, 88, 92};
        notes.push_back({InstType::HarpPluck, B(71.0, g * 0.16), D(1.4), double(gliss[g]), 0.82, -0.5 + g * 0.09});
    }
    drums.push_back({DrumType::ReverseSuck, B(72.0, 0.0), 1.00});
    drums.push_back({DrumType::Snare, B(71.0, 3.50), 0.85});
    drums.push_back({DrumType::Snare, B(71.0, 3.75), 1.00});

    // ------------------------------------------------------------------------
    // ACT VI (Bars 72..91): DROP II CLIMAX — Key Change (+3 Semitones: Fmaj9 / Am)!
    // ------------------------------------------------------------------------
    renderArtcoreDrop(72.0, +3, true);

    // ------------------------------------------------------------------------
    // ACT VII (Bars 92..103): Coda — Picardy Resolution in Radiant A Lydian / A Major!
    // ------------------------------------------------------------------------
    drums.push_back({DrumType::Crash, B(92.0, 0.0), 0.85, -0.35});
    drums.push_back({DrumType::Crash, B(92.0, 0.0), 0.80, 0.35});
    drums.push_back({DrumType::SubDrop, B(92.0, 0.0), 0.88});

    std::vector<ChordDef> codaChords = {
        {92.0,  2.0, 33, {45, 52, 57, 61, 64, 68, 75}, 0}, // Amaj9(#11) — Golden Dawn!
        {94.0,  1.0, 41, {53, 60, 64, 67, 72, 79},     4}, // Fmaj9(#11) — Starlight!
        {95.0,  1.0, 43, {55, 62, 67, 69, 71, 79},     0}, // Gadd9
        {96.0,  2.0, 33, {45, 52, 57, 61, 64, 68, 76}, 0}, // Amaj9
        {98.0,  1.0, 38, {50, 57, 62, 66, 73, 76},     1}, // Dmaj9
        {99.0,  1.0, 38, {50, 58, 62, 65, 71, 76},     4}, // Dm6(9) — Tender nostalgic farewell
        {100.0, 4.0, 33, {45, 52, 57, 61, 64, 68, 75, 81}, 0} // Final Eternal Amaj9(#11)
    };

    for (const auto& c : codaChords) {
        double beats = c.durBars * 4.0;
        double fade = (c.startBar >= 100.0) ? 0.65 : 0.82;
        notes.push_back({InstType::SubBass, B(c.startBar, 0.0), D(beats), double(c.bassMidi), 0.65 * fade, 0.0});
        for (size_t i = 0; i < c.chordMidis.size(); ++i) {
            notes.push_back({InstType::StringEns, B(c.startBar, 0.0), D(beats * 1.05), double(c.chordMidis[i]), 0.60 * fade, (i % 2 == 0) ? -0.55 : 0.55});
            if (i >= 1 && i <= 4) {
                notes.push_back({InstType::ChoirPad, B(c.startBar, 0.0), D(beats * 1.05), double(c.chordMidis[i]), 0.52 * fade, 0.0, c.vowel});
            }
        }
        int steps = static_cast<int>(beats * 2.0);
        for (int s = 0; s < steps; ++s) {
            if (c.startBar >= 100.0 && s >= 10) break;
            int m = c.chordMidis[s % c.chordMidis.size()] + ((c.startBar >= 100.0 && s >= 5) ? 12 : 0);
            double v = (0.58 - 0.25 * (c.startBar >= 100.0 ? s / 10.0 : 0.0));
            notes.push_back({InstType::FeltPiano, B(c.startBar, s * 0.5), D(3.2), double(m), v, (s % 2 == 0) ? -0.25 : 0.25});
            notes.push_back({InstType::HarpPluck, B(c.startBar, s * 0.5) + 0.008, D(3.0), double(m), v * 0.72, std::sin(s) * 0.45});
        }
    }

    // Final Major-Lydian Transformation of the Opening Motif (Bars 92..101)
    std::vector<MelNote> codaMel = {
        {92.0, 0.0, 2.5, 80, 0.82, 0}, {92.0, 2.5, 1.5, 81, 0.78, 1}, {93.0, 0.0, 4.0, 76, 0.78, 0},
        {94.0, 0.0, 2.5, 79, 0.80, 4}, {94.0, 2.5, 1.5, 81, 0.82, 0}, {95.0, 0.0, 4.0, 83, 0.84, 3},
        {96.0, 0.0, 3.0, 85, 0.85, 0}, {96.0, 3.0, 1.0, 80, 0.75, 1}, {97.0, 0.0, 4.0, 81, 0.80, 0},
        {98.0, 0.0, 4.0, 78, 0.76, 1}, {99.0, 0.0, 4.0, 76, 0.74, 4},
        {100.0, 0.0, 6.0, 80, 0.72, 0}, {101.5, 0.0, 8.0, 93, 0.65, 0} // Final high A6 crystal chime!
    };
    for (const auto& m : codaMel) {
        notes.push_back({InstType::GrandPiano, B(m.bar, m.beat), D(m.dur * 1.4), double(m.midi), m.vel * 0.85, 0.1});
        notes.push_back({InstType::Celesta, B(m.bar, m.beat) + 0.006, D(m.dur * 1.5), double(m.midi + 12), m.vel * 0.62, -0.15});
        if (m.bar < 100.0) {
            notes.push_back({InstType::VocaliseLead, B(m.bar, m.beat), D(m.dur), double(m.midi), m.vel * 0.72, 0.0, m.vowel, -1.0});
        }
    }
}

// ============================================================================
// WAV File Writer (24-bit Studio PCM)
// ============================================================================
bool writeWav24(const std::string& path, const std::vector<double>& L, const std::vector<double>& R) {
    std::ofstream out(path, std::ios::binary);
    if (!out) return false;
    uint32_t numSamples = static_cast<uint32_t>(L.size());
    uint16_t numChannels = 2;
    uint16_t bitsPerSample = 24;
    uint32_t byteRate = static_cast<uint32_t>(SR) * numChannels * (bitsPerSample / 8);
    uint16_t blockAlign = numChannels * (bitsPerSample / 8);
    uint32_t dataSize = numSamples * blockAlign;
    uint32_t chunkSize = 36 + dataSize;
    uint32_t sampleRate = static_cast<uint32_t>(SR);
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1;

    out.write("RIFF", 4);
    out.write(reinterpret_cast<const char*>(&chunkSize), 4);
    out.write("WAVE", 4);
    out.write("fmt ", 4);
    out.write(reinterpret_cast<const char*>(&fmtSize), 4);
    out.write(reinterpret_cast<const char*>(&audioFormat), 2);
    out.write(reinterpret_cast<const char*>(&numChannels), 2);
    out.write(reinterpret_cast<const char*>(&sampleRate), 4);
    out.write(reinterpret_cast<const char*>(&byteRate), 4);
    out.write(reinterpret_cast<const char*>(&blockAlign), 2);
    out.write(reinterpret_cast<const char*>(&bitsPerSample), 2);
    out.write("data", 4);
    out.write(reinterpret_cast<const char*>(&dataSize), 4);

    std::vector<uint8_t> pcm(dataSize);
    for (uint32_t i = 0; i < numSamples; ++i) {
        double cL = clampd(L[i], -1.0, 1.0);
        double cR = clampd(R[i], -1.0, 1.0);
        int32_t iL = static_cast<int32_t>(std::llround(cL * 8388607.0));
        int32_t iR = static_cast<int32_t>(std::llround(cR * 8388607.0));
        size_t o = static_cast<size_t>(i) * 6;
        pcm[o + 0] = static_cast<uint8_t>(iL & 0xFF);
        pcm[o + 1] = static_cast<uint8_t>((iL >> 8) & 0xFF);
        pcm[o + 2] = static_cast<uint8_t>((iL >> 16) & 0xFF);
        pcm[o + 3] = static_cast<uint8_t>(iR & 0xFF);
        pcm[o + 4] = static_cast<uint8_t>((iR >> 8) & 0xFF);
        pcm[o + 5] = static_cast<uint8_t>((iR >> 16) & 0xFF);
    }
    out.write(reinterpret_cast<const char*>(pcm.data()), pcm.size());
    return true;
}

} // namespace

int main() {
    std::cout << "[AudioEngine] Composing 'SINGULARITY BLOOM' (174 BPM, 48kHz Stereo, 146.0s)...\n";
    FastRNG rng;
    std::vector<NoteEvent> notes;
    std::vector<DrumEvent> drums;
    notes.reserve(16000);
    drums.reserve(8000);
    buildMasterpieceScore(notes, drums, rng);
    std::cout << "[AudioEngine] Score generated: " << notes.size() << " note events, "
              << drums.size() << " percussion events.\n";

    // Separate studio mixing stems so Sidechain, Delay, and Shimmer FDN hit the exact right buses!
    std::vector<double> pianoL(TOTAL_SAMPLES, 0.0), pianoR(TOTAL_SAMPLES, 0.0);
    std::vector<double> chordL(TOTAL_SAMPLES, 0.0), chordR(TOTAL_SAMPLES, 0.0);
    std::vector<double> leadL(TOTAL_SAMPLES, 0.0),  leadR(TOTAL_SAMPLES, 0.0);
    std::vector<double> vocalL(TOTAL_SAMPLES, 0.0), vocalR(TOTAL_SAMPLES, 0.0);
    std::vector<double> subMono(TOTAL_SAMPLES, 0.0);
    std::vector<double> midBassL(TOTAL_SAMPLES, 0.0), midBassR(TOTAL_SAMPLES, 0.0);
    std::vector<double> drumL(TOTAL_SAMPLES, 0.0),  drumR(TOTAL_SAMPLES, 0.0);
    std::vector<double> sidechainDuck(TOTAL_SAMPLES, 1.0);

    // Sample-accurate visual telemetry accumulators
    std::vector<float> kickEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> snareEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> hatEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> subEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> chordEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> pianoEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> vocalEnvS(TOTAL_SAMPLES, 0.0f);
    std::vector<float> leadEnvS(TOTAL_SAMPLES, 0.0f);

    std::cout << "[AudioEngine] Synthesizing polyphonic acoustic/electronic stems...\n";
    for (const auto& ev : notes) {
        switch (ev.inst) {
            case InstType::GrandPiano:
            case InstType::FeltPiano:
                renderPianoNote(ev, pianoL, pianoR, pianoEnvS, rng);
                break;
            case InstType::Celesta:
                renderCelestaNote(ev, pianoL, pianoR, rng);
                break;
            case InstType::HarpPluck:
                renderHarpPluck(ev, pianoL, pianoR, rng);
                break;
            case InstType::Supersaw:
                renderSupersaw(ev, chordL, chordR, chordEnvS, rng);
                break;
            case InstType::StringEns:
            case InstType::SoloStrings:
                renderStrings(ev, chordL, chordR, chordEnvS, rng);
                break;
            case InstType::ChoirPad:
            case InstType::VocaliseLead:
                renderFormantVoice(ev, vocalL, vocalR, vocalEnvS, rng);
                break;
            case InstType::SynthLead:
            case InstType::ArpPluck:
                renderLeadOrArp(ev, leadL, leadR, leadEnvS, rng);
                break;
            case InstType::SubBass:
            case InstType::ReeseBass:
                renderBass(ev, subMono, midBassL, midBassR, subEnvS, rng);
                break;
        }
    }

    for (const auto& d : drums) {
        renderDrum(d, drumL, drumR, sidechainDuck, kickEnvS, snareEnvS, hatEnvS, rng);
    }

    // Add subtle crystalline frozen dust / rain ambience in Act I & Act VII
    {
        CytomicSVF ambBP_L, ambBP_R;
        ambBP_L.setParams(3200.0, 0.9);
        ambBP_R.setParams(3450.0, 0.9);
        for (size_t i = 0; i < TOTAL_SAMPLES; ++i) {
            double t = i * INV_SR;
            double bar = t / BAR_SEC;
            double amb = 0.0;
            if (bar < 16.0) amb = 0.008 * (1.0 - bar / 18.0);
            else if (bar > 92.0 && bar < 103.5) amb = 0.007 * std::max(0.0, 1.0 - (bar - 92.0) / 11.5);
            if (amb > 0.0) {
                pianoL[i] += ambBP_L.processBP(rng.nextUniform()) * amb;
                pianoR[i] += ambBP_R.processBP(rng.nextUniform()) * amb;
            }
        }
    }

    // ========================================================================
    // Studio Mixing, Ping-Pong Delay, 8x8 Shimmer Hall FDN, & Mastering Chain
    // ========================================================================
    std::cout << "[AudioEngine] Running 8x8 Shimmer Hall FDN, Ping-Pong Delay, Sidechain & Mastering...\n";
    HallFDNReverb hall;
    PingPongDelay delay;

    std::vector<double> mixL(TOTAL_SAMPLES, 0.0), mixR(TOTAL_SAMPLES, 0.0);
    double scSmooth = 1.0;

    for (size_t i = 0; i < TOTAL_SAMPLES; ++i) {
        double t = i * INV_SR;
        double bar = t / BAR_SEC;

        // Smooth sidechain envelope (zero clicks!)
        double targetSc = sidechainDuck[i];
        scSmooth += (targetSc - scSmooth) * (targetSc < scSmooth ? 0.08 : 0.0035);

        double scChord = 1.0 - (1.0 - scSmooth) * 0.88;
        double scBass  = 1.0 - (1.0 - scSmooth) * 0.95;
        double scPiano = 1.0 - (1.0 - scSmooth) * 0.42;
        double scVocal = 1.0 - (1.0 - scSmooth) * 0.50;

        // Dynamic filter sweep on Chords & Reese during Act II/III build!
        double pL = pianoL[i] * scPiano;
        double pR = pianoR[i] * scPiano;
        double cL = chordL[i] * scChord;
        double cR = chordR[i] * scChord;
        double lL = leadL[i]  * scVocal;
        double lR = leadR[i]  * scVocal;
        double vL = vocalL[i] * scVocal;
        double vR = vocalR[i] * scVocal;
        double bL = subMono[i] * scBass + midBassL[i] * scBass;
        double bR = subMono[i] * scBass + midBassR[i] * scBass;

        // Ping-Pong Stereo Delay on Lead, Vocalise & Piano
        double dlyL, dlyR;
        delay.processSample(lL * 0.42 + vL * 0.36 + pL * 0.18,
                            lR * 0.42 + vR * 0.36 + pR * 0.18, dlyL, dlyR);

        // 8x8 FDN Concert Hall + Octave Shimmer (lush in Intro/Interlude/Coda, tighter in Drops!)
        bool Ethereal = (bar < 16.0) || (bar >= 56.0 && bar < 71.5) || (bar >= 92.0);
        double revDecay = Ethereal ? 0.875 : 0.805;
        double shimAmt  = Ethereal ? 0.24  : 0.08;

        // Vacuum cut in Bar 39 (Beat 1.2..3.4) for maximum breathtaking drop contrast!!
        double vacuumGate = 1.0;
        if (bar >= 39.28 && bar < 39.84) {
            double u = (bar - 39.28) / 0.12;
            vacuumGate = std::max(0.06, 1.0 - clampd(u, 0.0, 1.0));
        }

        double revSendL = pL * 0.48 + cL * 0.26 + vL * 0.56 + lL * 0.32 + dlyL * 0.35 + drumL[i] * 0.09;
        double revSendR = pR * 0.48 + cR * 0.26 + vR * 0.56 + lR * 0.32 + dlyR * 0.35 + drumR[i] * 0.09;
        double wetL, wetR;
        hall.processSample(revSendL, revSendR, revDecay, shimAmt, wetL, wetR);

        mixL[i] = (pL + cL + lL + vL + bL + dlyL * 0.32 + wetL * 0.46 * scPiano) * vacuumGate + drumL[i];
        mixR[i] = (pR + cR + lR + vR + bR + dlyR * 0.32 + wetR * 0.46 * scPiano) * vacuumGate + drumR[i];

        // Gentle master fade-out over final 2.8 seconds to exact -inf silence
        if (t > TOTAL_SEC - 2.8) {
            double fo = clampd((TOTAL_SEC - t) / 2.8, 0.0, 1.0);
            fo = fo * fo * (3.0 - 2.0 * fo);
            mixL[i] *= fo;
            mixR[i] *= fo;
        }
    }

    // Pass 1: Remove any residual sub-22Hz DC across the mix before RMS calibration
    {
        CytomicSVF dcHP_L, dcHP_R;
        dcHP_L.setParams(22.0, 0.707);
        dcHP_R.setParams(22.0, 0.707);
        for (size_t i = 0; i < TOTAL_SAMPLES; ++i) {
            mixL[i] = dcHP_L.processHP(mixL[i]);
            mixR[i] = dcHP_R.processHP(mixR[i]);
        }
    }

    // Measure pre-master RMS in loudest Drop section so calibration is 100% exact
    double dropSqSum = 0.0;
    size_t dropS0 = static_cast<size_t>(72.0 * BAR_SEC * SR);
    size_t dropS1 = static_cast<size_t>(90.0 * BAR_SEC * SR);
    for (size_t i = dropS0; i < dropS1; ++i) {
        dropSqSum += 0.5 * (mixL[i] * mixL[i] + mixR[i] * mixR[i]);
    }
    double dropRms = std::sqrt(dropSqSum / std::max<size_t>(1, dropS1 - dropS0));
    // Target pre-limiter Drop RMS ~ 0.31 (-10.2 dBFS) for punchy modern mastering
    double preGain = (dropRms > 1e-6) ? (0.32 / dropRms) : 1.0;

    // Pass 2: Mid/Side Sub Mono-izer + Master Glue Compressor + Lookahead Brickwall Limiter (-0.5 dBFS)
    CytomicSVF sideHP;
    sideHP.setParams(120.0, 0.707);
    CytomicSVF airShelfL, airShelfR;
    airShelfL.setParams(8500.0, 0.7);
    airShelfR.setParams(8500.0, 0.7);

    double compEnv = 0.0;
    for (size_t i = 0; i < TOTAL_SAMPLES; ++i) {
        double L = mixL[i] * preGain;
        double R = mixR[i] * preGain;

        // Mid/Side: keep sub <120Hz strictly centered, add 12% stereo air sparkle >8.5kHz
        double mid  = 0.5 * (L + R);
        double side = sideHP.processHP(0.5 * (L - R)) * 1.12;
        L = mid + side;
        R = mid - side;
        L += airShelfL.processHP(L) * 0.16;
        R += airShelfR.processHP(R) * 0.16;

        // Smooth SSL-style Master Bus Glue Compressor (2.5:1 above -9 dBFS)
        double det = std::max(std::abs(L), std::abs(R));
        compEnv += (det - compEnv) * (det > compEnv ? 0.0025 : 0.00025);
        double gainRed = 1.0;
        if (compEnv > 0.35) {
            double overDb = 20.0 * std::log10(compEnv / 0.35);
            double grDb = overDb * (1.0 - 1.0 / 2.4);
            gainRed = std::pow(10.0, -grDb / 20.0) * 1.14; // makeup gain
        }
        mixL[i] = softClip(L * gainRed * 1.06) * 0.96;
        mixR[i] = softClip(R * gainRed * 1.06) * 0.96;
    }

    // 3ms Lookahead True-Peak Limiter at ceiling 0.944 (-0.50 dBFS)
    const size_t lookahead = static_cast<size_t>(0.003 * SR); // 144 samples
    const double ceiling = 0.944;
    double limGain = 1.0;
    std::vector<double> outL(TOTAL_SAMPLES, 0.0), outR(TOTAL_SAMPLES, 0.0);
    double peakOut = 0.0, totalSq = 0.0;
    size_t nanCount = 0;

    for (size_t i = 0; i < TOTAL_SAMPLES; ++i) {
        double maxAhead = 0.0;
        size_t wEnd = std::min(TOTAL_SAMPLES, i + lookahead);
        // Fast strided + exact local check
        for (size_t j = i; j < wEnd; j += 4) {
            maxAhead = std::max(maxAhead, std::max(std::abs(mixL[j]), std::abs(mixR[j])));
        }
        maxAhead = std::max(maxAhead, std::max(std::abs(mixL[i]), std::abs(mixR[i])));
        double needed = (maxAhead > ceiling) ? (ceiling / maxAhead) : 1.0;
        if (needed < limGain) {
            limGain += (needed - limGain) * 0.15;
        } else {
            limGain += (1.0 - limGain) * 0.0008;
        }
        double fL = clampd(mixL[i] * limGain, -ceiling, ceiling);
        double fR = clampd(mixR[i] * limGain, -ceiling, ceiling);
        if (!std::isfinite(fL) || !std::isfinite(fR)) { fL = 0.0; fR = 0.0; nanCount++; }
        outL[i] = fL;
        outR[i] = fR;
        peakOut = std::max(peakOut, std::max(std::abs(fL), std::abs(fR)));
        totalSq += 0.5 * (fL * fL + fR * fR);
    }

    double rmsDb = 10.0 * std::log10(totalSq / TOTAL_SAMPLES + 1e-12);
    double peakDb = 20.0 * std::log10(peakOut + 1e-12);
    std::cout << "[AudioEngine] Master complete! Peak = " << peakDb << " dBFS, Integrated RMS = "
              << rmsDb << " dBFS, NaNs = " << nanCount << "\n";

    if (!writeWav24("singularity_bloom_master.wav", outL, outR)) {
        std::cerr << "Failed to write WAV!\n";
        return 1;
    }

    // ========================================================================
    // Export 60.000 FPS Ground-Truth Visual Telemetry + 64-Band Log FFT
    // ========================================================================
    std::cout << "[AudioEngine] Computing 60fps FrameTelemetry (" << TOTAL_FRAMES << " frames)...\n";
    std::vector<FrameTelemetry> telemetry(TOTAL_FRAMES);

    constexpr size_t FFT_N = 4096;
    std::vector<double> hann(FFT_N);
    for (size_t i = 0; i < FFT_N; ++i) {
        hann[i] = 0.5 * (1.0 - std::cos(TWO_PI * i / (FFT_N - 1)));
    }
    std::vector<double> fftRe(FFT_N), fftIm(FFT_N);
    float smoothSpec[64]{};
    float smoothKick = 0, smoothSnare = 0, smoothHat = 0, smoothSub = 0;
    float smoothChord = 0, smoothPiano = 0, smoothVocal = 0, smoothLead = 0;
    float flashDecay = 0.0f;
    float smoothAspect = 0.0f;

    for (size_t f = 0; f < TOTAL_FRAMES; ++f) {
        FrameTelemetry& tf = telemetry[f];
        double t = static_cast<double>(f) / FPS;
        double bar = t / BAR_SEC;
        double beat = t / BEAT_SEC;

        tf.time_sec = static_cast<float>(t);
        tf.bar_pos = static_cast<float>(bar);
        tf.beat_phase = static_cast<float>(beat - std::floor(beat));

        // Act ID (1..7)
        if (bar < 16.0)      tf.act_id = 1;
        else if (bar < 32.0) tf.act_id = 2;
        else if (bar < 40.0) tf.act_id = 3;
        else if (bar < 56.0) tf.act_id = 4;
        else if (bar < 72.0) tf.act_id = 5;
        else if (bar < 92.0) tf.act_id = 6;
        else                 tf.act_id = 7;

        // Director Shot Choreography ID (cuts crisply on musical phrase boundaries!)
        int barInt = static_cast<int>(std::floor(bar));
        if (tf.act_id == 1) {
            tf.shot_id = (bar < 8.0) ? 10 : 11; // 10: Wide Frozen Cathedral -> 11: Close Piano & Aoi + 3D Constellation
        } else if (tf.act_id == 2) {
            tf.shot_id = ((barInt / 4) % 2 == 0) ? 20 : 21; // Alternates Awakening Aoi <-> 3D Raymarched Cyber-Astrolabe Tunnel!
        } else if (tf.act_id == 3) {
            tf.shot_id = (bar >= 39.0) ? 32 : (((barInt % 2) == 0) ? 30 : 31); // 30/31: Singularity Vortex <-> Neural Close, 32: Frozen Tear Silence!
        } else if (tf.act_id == 4) {
            // Dynamic 4-bar / 2-bar anime MV cuts in Drop I!
            int sub = (barInt - 40) % 8;
            tf.shot_id = (sub < 3) ? 40 : ((sub == 3) ? 42 : ((sub < 7) ? 41 : 42));
            // 40: Hypernova Aoi Flight, 41: 3D Raymarched Crystal Megastructure Speed-Run, 42: Poly-Split Drum Fill Montage!
        } else if (tf.act_id == 5) {
            tf.shot_id = (bar < 64.0) ? 50 : 51; // 50: Twilight Mirror Sea -> 51: Rising Starlight Pivot Build
        } else if (tf.act_id == 6) {
            int sub = (barInt - 72) % 8;
            if (bar >= 88.0) tf.shot_id = 63; // 63: Ultimate Catharsis World-Tree Panorama!
            else tf.shot_id = (sub < 3) ? 60 : ((sub == 3) ? 62 : ((sub < 7) ? 61 : 62));
        } else {
            tf.shot_id = 70; // 70: Golden Dawn Eternal Resonance Coda
        }

        // Dynamic CinemaScope (2.39:1 = 0.0) <-> Full IMAX 16:9 (1.0) on Drop I & Drop II!
        float targetAspect = (tf.act_id == 4 || tf.act_id == 6) ? 1.0f : 0.0f;
        smoothAspect += (targetAspect - smoothAspect) * (targetAspect > smoothAspect ? 0.18f : 0.03f);
        tf.aspect_open = smoothAspect;

        tf.key_mod = static_cast<float>(clampd((bar - 64.0) / 8.0, 0.0, 1.0));
        tf.riser_env = (tf.act_id == 3 && bar < 39.0) ? static_cast<float>((bar - 32.0) / 7.0)
                     : ((bar >= 68.0 && bar < 71.8) ? static_cast<float>((bar - 68.0) / 3.8) : 0.0f);

        bool isFillBar = ((tf.act_id == 4 && (barInt % 4 == 3)) ||
                          (tf.act_id == 6 && (barInt % 4 == 3) && bar < 88.0) ||
                          (bar >= 37.0 && bar < 39.0));
        tf.glitch_trig = isFillBar ? static_cast<float>(0.5 + 0.5 * std::sin(beat * PI * 4.0)) : 0.0f;

        // Impact White/Gold Flash on Major Transitions!
        if (std::abs(bar - 16.0) < 0.05 || std::abs(bar - 39.0) < 0.05 ||
            std::abs(bar - 40.0) < 0.08 || std::abs(bar - 56.0) < 0.06 ||
            std::abs(bar - 72.0) < 0.10 || std::abs(bar - 88.0) < 0.06 ||
            std::abs(bar - 92.0) < 0.08) {
            flashDecay = 1.0f;
        } else {
            flashDecay *= 0.86f;
        }
        tf.flash_white = flashDecay;

        // Sample window for this 1/60s frame (800 samples @ 48kHz)
        size_t sStart = static_cast<size_t>(t * SR);
        size_t sEnd = std::min(TOTAL_SAMPLES, sStart + static_cast<size_t>(SR / FPS));
        float pkK = 0, pkS = 0, pkH = 0, pkSub = 0, pkC = 0, pkP = 0, pkV = 0, pkL = 0;
        for (size_t s = sStart; s < sEnd; ++s) {
            pkK = std::max(pkK, kickEnvS[s]);
            pkS = std::max(pkS, snareEnvS[s]);
            pkH = std::max(pkH, hatEnvS[s]);
            pkSub = std::max(pkSub, subEnvS[s]);
            pkC = std::max(pkC, chordEnvS[s]);
            pkP = std::max(pkP, pianoEnvS[s]);
            pkV = std::max(pkV, vocalEnvS[s]);
            pkL = std::max(pkL, leadEnvS[s]);
        }
        auto smoothFollow = [](float& st, float val, float atk, float rel) {
            st += (val - st) * (val > st ? atk : rel);
            return std::clamp(st, 0.0f, 1.5f);
        };
        tf.kick_env  = smoothFollow(smoothKick,  pkK, 0.75f, 0.18f);
        tf.snare_env = smoothFollow(smoothSnare, pkS, 0.75f, 0.20f);
        tf.hat_env   = smoothFollow(smoothHat,   pkH, 0.65f, 0.25f);
        tf.sub_env   = smoothFollow(smoothSub,   std::min(1.0f, pkSub * 0.8f), 0.55f, 0.16f);
        tf.chord_env = smoothFollow(smoothChord, std::min(1.0f, pkC * 0.7f),   0.35f, 0.12f);
        tf.piano_env = smoothFollow(smoothPiano, std::min(1.0f, pkP * 0.85f),  0.65f, 0.14f);
        tf.vocal_env = smoothFollow(smoothVocal, std::min(1.0f, pkV * 0.85f),  0.45f, 0.12f);
        tf.lead_env  = smoothFollow(smoothLead,  std::min(1.0f, pkL * 0.85f),  0.55f, 0.15f);

        // Active Piano/Melodic Register Buckets (16 pitch bins across MIDI 48..96)
        std::fill(std::begin(tf.piano_keys), std::end(tf.piano_keys), 0.0f);
        float latestPiano = 0.5f, latestLead = 0.5f;
        for (const auto& ev : notes) {
            if (ev.startSec <= t && t <= ev.startSec + std::min(0.45, ev.durSec)) {
                float age = static_cast<float>(1.0 - (t - ev.startSec) / std::min(0.45, ev.durSec));
                if (ev.inst == InstType::GrandPiano || ev.inst == InstType::FeltPiano ||
                    ev.inst == InstType::Celesta || ev.inst == InstType::HarpPluck || ev.inst == InstType::ArpPluck) {
                    int bin = std::clamp(static_cast<int>((ev.midi - 48.0) / 3.0), 0, 15);
                    tf.piano_keys[bin] = std::max(tf.piano_keys[bin], static_cast<float>(ev.vel) * age);
                    latestPiano = static_cast<float>(clampd((ev.midi - 48.0) / 48.0, 0.0, 1.0));
                }
                if (ev.inst == InstType::VocaliseLead || ev.inst == InstType::SynthLead) {
                    latestLead = static_cast<float>(clampd((ev.midi - 60.0) / 36.0, 0.0, 1.0));
                }
            }
        }
        tf.last_piano_pitch = latestPiano;
        tf.last_lead_pitch = latestLead;

        // 4096-point Hann FFT -> 64 Logarithmic Perceptual Bands (32 Hz .. 15,500 Hz)
        for (size_t k = 0; k < FFT_N; ++k) {
            long sIdx = static_cast<long>(sStart) - static_cast<long>(FFT_N / 2) + static_cast<long>(k);
            double samp = (sIdx >= 0 && static_cast<size_t>(sIdx) < TOTAL_SAMPLES)
                        ? 0.5 * (outL[sIdx] + outR[sIdx]) : 0.0;
            fftRe[k] = samp * hann[k];
            fftIm[k] = 0.0;
        }
        fftRadix2(fftRe, fftIm);

        for (int b = 0; b < 64; ++b) {
            double fLo = 32.0 * std::pow(15500.0 / 32.0, b / 64.0);
            double fHi = 32.0 * std::pow(15500.0 / 32.0, (b + 1.0) / 64.0);
            int bin0 = std::max(1, static_cast<int>(std::floor(fLo * FFT_N * INV_SR)));
            int bin1 = std::min(static_cast<int>(FFT_N / 2 - 1), std::max(bin0, static_cast<int>(std::ceil(fHi * FFT_N * INV_SR))));
            double maxMag = 0.0;
            for (int bin = bin0; bin <= bin1; ++bin) {
                double mag = std::sqrt(fftRe[bin] * fftRe[bin] + fftIm[bin] * fftIm[bin]) / (FFT_N * 0.25);
                maxMag = std::max(maxMag, mag);
            }
            // Perceptual pink-tilt compensation (+3dB/oct) so high frequencies dance visibly too!
            double tilt = std::pow((fLo + fHi) * 0.5 / 250.0, 0.36);
            double db = 20.0 * std::log10(maxMag * tilt + 1e-6);
            float norm = static_cast<float>(clampd((db + 52.0) / 48.0, 0.0, 1.0));
            smoothSpec[b] += (norm - smoothSpec[b]) * (norm > smoothSpec[b] ? 0.62f : 0.20f);
            tf.spectrum[b] = smoothSpec[b];
        }
    }

    std::ofstream telOut("build/telemetry.bin", std::ios::binary);
    telOut.write(reinterpret_cast<const char*>(telemetry.data()), telemetry.size() * sizeof(FrameTelemetry));
    telOut.close();

    std::cout << "[AudioEngine] Exported singularity_bloom_master.wav + build/telemetry.bin ("
              << sizeof(FrameTelemetry) << " bytes/frame).\n";
    return 0;
}
