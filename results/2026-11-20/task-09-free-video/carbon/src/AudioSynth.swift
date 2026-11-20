import Foundation
import Accelerate

// Cytomic ZDF State-Variable Filter (24dB/oct cascaded or 12dB/oct multimode)
private struct SVFFilter {
    var ic1eq: Float = 0
    var ic2eq: Float = 0

    mutating func processLP(input: Float, cutoffHz: Float, q: Float, sr: Float) -> Float {
        let fc = min(max(cutoffHz, 20.0), sr * 0.45)
        let g = tan(Float.pi * fc / sr)
        let k = 1.0 / max(q, 0.5)
        let a1 = 1.0 / (1.0 + g * (g + k))
        let a2 = g * a1
        let a3 = g * a2
        let v3 = input - ic2eq
        let v1 = a1 * ic1eq + a2 * v3
        let v2 = ic2eq + a2 * ic1eq + a3 * v3
        ic1eq = 2.0 * v1 - ic1eq
        ic2eq = 2.0 * v2 - ic2eq
        return v2
    }

    mutating func processBP(input: Float, cutoffHz: Float, q: Float, sr: Float) -> Float {
        let fc = min(max(cutoffHz, 30.0), sr * 0.45)
        let g = tan(Float.pi * fc / sr)
        let k = 1.0 / max(q, 0.5)
        let a1 = 1.0 / (1.0 + g * (g + k))
        let a2 = g * a1
        let a3 = g * a2
        let v3 = input - ic2eq
        let v1 = a1 * ic1eq + a2 * v3
        let v2 = ic2eq + a2 * ic1eq + a3 * v3
        ic1eq = 2.0 * v1 - ic1eq
        ic2eq = 2.0 * v2 - ic2eq
        return v1
    }

    mutating func processHP(input: Float, cutoffHz: Float, q: Float, sr: Float) -> Float {
        let fc = min(max(cutoffHz, 30.0), sr * 0.45)
        let g = tan(Float.pi * fc / sr)
        let k = 1.0 / max(q, 0.5)
        let a1 = 1.0 / (1.0 + g * (g + k))
        let a2 = g * a1
        let a3 = g * a2
        let v3 = input - ic2eq
        let v1 = a1 * ic1eq + a2 * v3
        let v2 = ic2eq + a2 * ic1eq + a3 * v3
        ic1eq = 2.0 * v1 - ic1eq
        ic2eq = 2.0 * v2 - ic2eq
        return input - k * v1 - v2
    }
}

// Band-limited PolyBLEP sawtooth
@inline(__always)
private func polyBlep(_ t: Float, _ dt: Float) -> Float {
    if t < dt {
        let x = t / dt
        return x + x - x * x - 1.0
    } else if t > 1.0 - dt {
        let x = (t - 1.0) / dt
        return x * x + x + x + 1.0
    }
    return 0.0
}

@inline(__always)
private func polySaw(_ phase: Float, _ dt: Float) -> Float {
    return (2.0 * phase - 1.0) - polyBlep(phase, dt)
}

@inline(__always)
private func midiToHz(_ midi: Float) -> Float {
    return 440.0 * pow(2.0, (midi - 69.0) / 12.0)
}

// Lush Stereo Schroeder/FDN Hall Reverb with damping
private final class StereoHallReverb {
    private var combL: [[Float]]
    private var combR: [[Float]]
    private var combIdxL: [Int]
    private var combIdxR: [Int]
    private var combStoreL: [Float]
    private var combStoreR: [Float]

    private var allL: [[Float]]
    private var allR: [[Float]]
    private var allIdxL: [Int]
    private var allIdxR: [Int]

    init(sampleRate: Int) {
        let scale = Double(sampleRate) / 44100.0
        let combTunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
        let allTunings = [556, 441, 341, 225]
        let spread = 29

        combL = combTunings.map { Array(repeating: 0, count: Int(Double($0) * scale)) }
        combR = combTunings.map { Array(repeating: 0, count: Int(Double($0 + spread) * scale)) }
        combIdxL = Array(repeating: 0, count: combTunings.count)
        combIdxR = Array(repeating: 0, count: combTunings.count)
        combStoreL = Array(repeating: 0, count: combTunings.count)
        combStoreR = Array(repeating: 0, count: combTunings.count)

        allL = allTunings.map { Array(repeating: 0, count: Int(Double($0) * scale)) }
        allR = allTunings.map { Array(repeating: 0, count: Int(Double($0 + spread) * scale)) }
        allIdxL = Array(repeating: 0, count: allTunings.count)
        allIdxR = Array(repeating: 0, count: allTunings.count)
    }

    func process(inL: Float, inR: Float, feedback: Float = 0.87, damp: Float = 0.28) -> (Float, Float) {
        let inputL = (inL * 0.7 + inR * 0.3) * 0.022
        let inputR = (inR * 0.7 + inL * 0.3) * 0.022
        var outL: Float = 0
        var outR: Float = 0
        let damp2 = 1.0 - damp

        for i in 0..<combL.count {
            let idxL = combIdxL[i]
            let delayedL = combL[i][idxL]
            combStoreL[i] = delayedL * damp2 + combStoreL[i] * damp
            combL[i][idxL] = inputL + combStoreL[i] * feedback
            combIdxL[i] = (idxL + 1) % combL[i].count
            outL += delayedL

            let idxR = combIdxR[i]
            let delayedR = combR[i][idxR]
            combStoreR[i] = delayedR * damp2 + combStoreR[i] * damp
            combR[i][idxR] = inputR + combStoreR[i] * feedback
            combIdxR[i] = (idxR + 1) % combR[i].count
            outR += delayedR
        }

        let g: Float = 0.5
        for i in 0..<allL.count {
            let idxL = allIdxL[i]
            let bufOutL = allL[i][idxL]
            let newInL = outL + bufOutL * g
            allL[i][idxL] = newInL
            outL = bufOutL - newInL * g
            allIdxL[i] = (idxL + 1) % allL[i].count

            let idxR = allIdxR[i]
            let bufOutR = allR[i][idxR]
            let newInR = outR + bufOutR * g
            allR[i][idxR] = newInR
            outR = bufOutR - newInR * g
            allIdxR[i] = (idxR + 1) % allR[i].count
        }
        return (outL, outR)
    }
}

public enum AudioSynth {
    public static func generateScore(wavPath: String) throws -> [AudioFrameTelemetry] {
        let sr = Config.sampleRate
        let srF = Float(sr)
        let totalSamples = Int(Config.durationSeconds * Double(sr))
        var left = Array(repeating: Float(0), count: totalSamples)
        var right = Array(repeating: Float(0), count: totalSamples)

        // Frame telemetry accumulators (2880 frames)
        var telemetry = Array(repeating: AudioFrameTelemetry(), count: Config.totalFrames)
        let samplesPerFrame = sr / Config.fps // 800 samples/frame

        // Deterministic PRNG for clean percussion noise
        var rngState: UInt64 = 0xCAFE_BABE_1337_2026
        @inline(__always)
        func whiteNoise() -> Float {
            rngState = rngState &* 6364136223846793005 &+ 1442695040888963407
            let u = Float((rngState >> 40) & 0xFFFFFF) / Float(0xFFFFFF)
            return u * 2.0 - 1.0
        }

        // Chord voicings per bar (24 bars total, 6 Acts x 4 bars)
        // MIDI notes: D2=38, A1=33, G1=31, Bb1=34
        // Acts 0..4 use epic D minor / Lydian Bb / Gm11 / Asus4->A7 progression
        // Act 5 (Bars 20..23) resolves into luminous D Major 9 (Picardy resolution!)
        struct BarHarmony {
            let bassMidi: Float
            let padMidis: [Float]
            let arpMidis: [Float]
            let leadNotes: [(step16: Int, dur16: Int, midi: Float)]
        }

        func harmonyForBar(_ bar: Int) -> BarHarmony {
            let act = bar / 4
            let b = bar % 4
            if act == 5 {
                // Act VI: Glorious Picardy D Major 9 resolution!
                switch b {
                case 0:
                    return BarHarmony(
                        bassMidi: 38, // D2
                        padMidis: [50, 57, 62, 66, 69, 73, 76], // Dmaj9 (D3 A3 D4 F#4 A4 C#5 E5)
                        arpMidis: [62, 66, 69, 73, 76, 81, 76, 73],
                        leadNotes: [(0, 8, 78), (8, 8, 76)] // F#5 -> E5
                    )
                case 1:
                    return BarHarmony(
                        bassMidi: 38, // D2 pedal
                        padMidis: [50, 55, 59, 66, 69, 74, 78], // Gmaj9/D
                        arpMidis: [62, 67, 71, 74, 78, 81, 78, 74],
                        leadNotes: [(0, 12, 81), (12, 4, 78)] // A5 -> F#5
                    )
                case 2:
                    return BarHarmony(
                        bassMidi: 38, // D2
                        padMidis: [50, 57, 62, 66, 69, 74, 76], // Dadd9
                        arpMidis: [57, 62, 66, 69, 74, 78, 74, 69],
                        leadNotes: [(0, 16, 74)] // D5 long sustain
                    )
                default:
                    return BarHarmony(
                        bassMidi: 26, // Deep D1 decay
                        padMidis: [50, 57, 62, 66, 69, 74],
                        arpMidis: [62, 66, 69, 74, 74, 74, 74, 74],
                        leadNotes: []
                    )
                }
            } else {
                switch b {
                case 0: // Dm9
                    return BarHarmony(
                        bassMidi: 38, // D2
                        padMidis: [50, 57, 60, 64, 65, 69, 74], // Dm9
                        arpMidis: [62, 65, 69, 72, 76, 74, 69, 65],
                        leadNotes: [(0, 6, 74), (6, 6, 76), (12, 4, 77)] // D5 -> E5 -> F5
                    )
                case 1: // Bbmaj7#11
                    return BarHarmony(
                        bassMidi: 34, // Bb1
                        padMidis: [46, 53, 58, 62, 65, 69, 76], // Bbmaj7#11 (with E5!)
                        arpMidis: [58, 62, 65, 69, 76, 74, 69, 65],
                        leadNotes: [(0, 8, 81), (8, 4, 79), (12, 4, 76)] // A5 -> G5 -> E5
                    )
                case 2: // Gm11
                    return BarHarmony(
                        bassMidi: 31, // G1
                        padMidis: [43, 50, 55, 58, 62, 65, 72], // Gm11
                        arpMidis: [55, 58, 62, 65, 70, 72, 70, 65],
                        leadNotes: [(0, 6, 79), (6, 6, 77), (12, 4, 74)] // G5 -> F5 -> D5
                    )
                default: // Asus4 -> A7b9
                    return BarHarmony(
                        bassMidi: 33, // A1
                        padMidis: [45, 52, 57, 61, 64, 67, 70], // A7b9
                        arpMidis: [57, 62, 64, 69, 73, 70, 67, 64],
                        leadNotes: [(0, 8, 74), (8, 8, 73)] // D5 -> C#5 tension!
                    )
                }
            }
        }

        // Oscillator & Filter States
        // 7-note Pad x 5 unison voices = 35 phases
        var padPhases = Array(repeating: Array(repeating: Float(0), count: 5), count: 7)
        for n in 0..<7 {
            for u in 0..<5 {
                padPhases[n][u] = Float((n * 37 + u * 73) % 100) * 0.01
            }
        }
        let unisonDetunes: [Float] = [-0.0085, -0.0038, 0.0, 0.0041, 0.0089]
        let unisonPanL: [Float] = [0.92, 0.75, 0.707, 0.35, 0.15]
        let unisonPanR: [Float] = [0.15, 0.35, 0.707, 0.75, 0.92]

        var padFilterL1 = SVFFilter()
        var padFilterR1 = SVFFilter()
        var padFilterL2 = SVFFilter()
        var padFilterR2 = SVFFilter()

        // Bass states
        var subPhase: Float = 0
        var reesePhase1: Float = 0
        var reesePhase2: Float = 0.37
        var bassFilterL = SVFFilter()
        var bassFilterR = SVFFilter()
        var smoothBassFreq: Float = midiToHz(38)

        // Arp states (2-op FM + Karplus/Saw pluck)
        var arpCarrierPhase: Float = 0
        var arpModPhase: Float = 0
        var arpSawPhase: Float = 0
        var arpFilterL = SVFFilter()
        var arpFilterR = SVFFilter()

        // Lead synth states
        var leadPhase1: Float = 0
        var leadPhase2: Float = 0.25
        var smoothLeadFreq: Float = midiToHz(74)
        var leadFilterL = SVFFilter()
        var leadFilterR = SVFFilter()

        // Drum states
        var kickPhase: Float = 0
        var snareBodyPhase1: Float = 0
        var snareBodyPhase2: Float = 0
        var snareNoiseBP_L = SVFFilter()
        var snareNoiseBP_R = SVFFilter()
        var hatHP_L = SVFFilter()
        var hatHP_R = SVFFilter()
        var riserBP_L = SVFFilter()
        var riserBP_R = SVFFilter()
        var impactSubPhase: Float = 0

        // Ping-Pong Dotted-8th Delay (0.375s @ 120 BPM = 18,000 samples)
        let delayLen = Int(0.375 * Double(sr))
        var delayBufL = Array(repeating: Float(0), count: delayLen)
        var delayBufR = Array(repeating: Float(0), count: delayLen)
        var delayIdx = 0
        var delayLP_L = SVFFilter()
        var delayLP_R = SVFFilter()

        let reverb = StereoHallReverb(sampleRate: sr)

        let arpVelPattern: [Float] = [1.0, 0.52, 0.78, 0.48, 0.92, 0.55, 0.82, 0.60]

        for s in 0..<totalSamples {
            let t = Double(s) / Double(sr)
            let beat = t * (Config.bpm / 60.0) // 2 beats/sec -> 0..96 beats
            let bar = min(Int(beat / 4.0), 23)
            let act = bar / 4 // 0..5
            let barBeat = Float(beat - Double(bar * 4)) // 0..<4
            let actTime = Float(t - Double(act) * 8.0)  // 0..<8s
            let step16Global = Int(beat * 4.0)
            let step16InBar = step16Global % 16
            let step16Frac = Float(beat * 4.0 - floor(beat * 4.0)) // 0..<1 within 16th note (0.125s)
            let step16Sec = step16Frac * 0.125

            let harm = harmonyForBar(bar)

            // --- 1. DRUMS & IMPACTS ---
            var kickSample: Float = 0
            var kickEnvVal: Float = 0
            var snareSampleL: Float = 0
            var snareSampleR: Float = 0
            var snareEnvVal: Float = 0
            var hatSampleL: Float = 0
            var hatSampleR: Float = 0

            // Determine kick trigger timing within bar
            var kickAgeSec: Float = 999.0
            if act == 0 {
                // Act I: Deep cinematic heartbeat on beat 0 and beat 2.5
                if barBeat < 1.5 {
                    kickAgeSec = barBeat * 0.5
                } else if barBeat >= 2.5 && bar < 3 {
                    kickAgeSec = (barBeat - 2.5) * 0.5
                } else if bar == 3 && barBeat >= 2.0 && barBeat < 3.0 {
                    kickAgeSec = (barBeat - 2.0) * 0.5
                }
            } else if act == 1 || act == 2 {
                // Act II & III: Driving four-on-the-floor + syncopated ghost kick on 3.75
                let beatFrac = barBeat - floor(barBeat)
                kickAgeSec = beatFrac * 0.5
                if barBeat >= 3.5 && bar % 2 == 1 {
                    let subFrac = (barBeat - 3.5) - floor(barBeat - 3.5)
                    kickAgeSec = min(kickAgeSec, subFrac * 0.5)
                }
            } else if act == 3 {
                // Act IV: Half-time broken sci-fi groove (bars 12-13) -> build (bars 14-15)
                if bar == 12 || bar == 13 {
                    let triggers: [Float] = [0.0, 1.5, 2.5]
                    for tr in triggers where barBeat >= tr {
                        kickAgeSec = min(kickAgeSec, (barBeat - tr) * 0.5)
                    }
                } else if bar == 14 {
                    let beatFrac = barBeat - floor(barBeat)
                    kickAgeSec = beatFrac * 0.5
                } else {
                    // Bar 15: Accelerating 8th -> 16th build to Black Hole Climax!
                    let subdiv: Float = barBeat < 2.0 ? 0.5 : 0.25
                    let f = (barBeat / subdiv) - floor(barBeat / subdiv)
                    kickAgeSec = f * subdiv * 0.5
                }
            } else if act == 4 {
                // Act V (Black Hole Climax!): Massive epic halftime + driving pulse
                let triggers: [Float] = [0.0, 1.0, 2.0, 2.75, 3.0]
                for tr in triggers where barBeat >= tr {
                    kickAgeSec = min(kickAgeSec, (barBeat - tr) * 0.5)
                }
            } else {
                // Act VI: Single cathartic impact kick on Bar 20 Beat 0 only
                if bar == 20 {
                    kickAgeSec = barBeat * 0.5
                }
            }

            if kickAgeSec < 0.42 {
                if kickAgeSec < 1.0 / srF { kickPhase = 0 }
                let pitchEnv = 36.71 + 128.0 * exp(-kickAgeSec * 42.0) + 24.0 * exp(-kickAgeSec * 12.0)
                kickPhase += pitchEnv / srF
                if kickPhase >= 1.0 { kickPhase -= 1.0 }
                let ampEnv = exp(-kickAgeSec * 7.5) * (1.0 - exp(-kickAgeSec * 900.0))
                let click = exp(-kickAgeSec * 180.0) * 0.35 * sin(kickPhase * 28.0)
                let gain: Float = (act == 0) ? 0.68 : 0.88
                kickSample = tanh((sin(kickPhase * 2.0 * Float.pi) + click) * 1.45) * ampEnv * gain
                kickEnvVal = ampEnv * gain
            }

            // Sidechain ducking envelope from kick (smooth studio pump!)
            let sidechainDuck: Float = 1.0 - 0.52 * kickEnvVal

            // Snare / Cinematic Clap on Beats 1 and 3 (barBeat 1.0 and 3.0) in Acts 1..4
            var snareAgeSec: Float = 999.0
            if act >= 1 && act <= 4 {
                if act == 4 {
                    // Epic halftime snare on Beat 2.0 (backbeat) + Beat 3.75 fill
                    if barBeat >= 2.0 { snareAgeSec = min(snareAgeSec, (barBeat - 2.0) * 0.5) }
                    if bar == 19 && barBeat >= 3.0 {
                        let f = (barBeat - 3.0) * 2.0
                        snareAgeSec = min(snareAgeSec, (f - floor(f)) * 0.25)
                    }
                } else if !(act == 3 && bar == 12) {
                    if barBeat >= 1.0 { snareAgeSec = min(snareAgeSec, (barBeat - 1.0) * 0.5) }
                    if barBeat >= 3.0 { snareAgeSec = min(snareAgeSec, (barBeat - 3.0) * 0.5) }
                }
            }
            if snareAgeSec < 0.28 {
                if snareAgeSec < 1.0 / srF {
                    snareBodyPhase1 = 0
                    snareBodyPhase2 = 0
                }
                let f1 = 182.0 + 90.0 * exp(-snareAgeSec * 55.0)
                let f2 = 318.0 + 110.0 * exp(-snareAgeSec * 65.0)
                snareBodyPhase1 = fmod(snareBodyPhase1 + f1 / srF, 1.0)
                snareBodyPhase2 = fmod(snareBodyPhase2 + f2 / srF, 1.0)
                let body = (sin(snareBodyPhase1 * 2.0 * .pi) * 0.65 + sin(snareBodyPhase2 * 2.0 * .pi) * 0.35) * exp(-snareAgeSec * 24.0)
                let nL = snareNoiseBP_L.processBP(input: whiteNoise(), cutoffHz: 2600.0, q: 0.9, sr: srF)
                let nR = snareNoiseBP_R.processBP(input: whiteNoise(), cutoffHz: 2850.0, q: 0.9, sr: srF)
                let tailEnv = exp(-snareAgeSec * (act == 4 ? 9.5 : 14.0))
                let snapGain: Float = (act == 4) ? 0.52 : 0.38
                snareSampleL = (body * 0.55 + nL * tailEnv * 0.85) * snapGain
                snareSampleR = (body * 0.55 + nR * tailEnv * 0.85) * snapGain
                snareEnvVal = tailEnv
            }

            // Crisp 16th-note Hi-Hats & Ticking Telemetry Pulse
            if act <= 4 {
                let hatDecay: Float = (step16InBar % 4 == 2) ? 26.0 : 58.0 // Open offbeat hat!
                let hatVel: Float = (act == 0) ? 0.10 : ((step16InBar % 2 == 0) ? 0.22 : 0.13)
                let env = exp(-step16Sec * hatDecay) * hatVel
                if env > 0.001 {
                    let metallic = sin(Float(s) * 0.618) * sin(Float(s) * 1.173) * 0.4
                    let rawL = whiteNoise() * 0.75 + metallic
                    let rawR = whiteNoise() * 0.75 - metallic
                    hatSampleL = hatHP_L.processHP(input: rawL, cutoffHz: 7800.0, q: 0.8, sr: srF) * env
                    hatSampleR = hatHP_R.processHP(input: rawR, cutoffHz: 8200.0, q: 0.8, sr: srF) * env
                }
            }

            // Act Transition Sub-Impact & Reverse Shimmer Riser!
            var transitionImpactL: Float = 0
            var transitionImpactR: Float = 0
            if actTime < 1.8 {
                if actTime < 1.0 / srF { impactSubPhase = 0 }
                let impFreq = 36.71 + 48.0 * exp(-actTime * 6.0)
                impactSubPhase = fmod(impactSubPhase + impFreq / srF, 1.0)
                let impGain: Float = (act == 4 || act == 5) ? 0.55 : 0.35
                let impSub = sin(impactSubPhase * 2.0 * .pi) * exp(-actTime * 2.4) * impGain
                let wash = exp(-actTime * 3.2) * 0.16
                transitionImpactL = impSub + whiteNoise() * wash * 0.25
                transitionImpactR = impSub + whiteNoise() * wash * 0.25
            }

            var riserVal: Float = 0
            var riserSampleL: Float = 0
            var riserSampleR: Float = 0
            if act < 5 && actTime > 6.0 {
                // 2-second transition riser at end of each Act (6.0s..8.0s)
                let rProg = (actTime - 6.0) / 2.0 // 0..1
                riserVal = rProg * rProg
                let sweepHz = 350.0 + 5200.0 * riserVal
                riserSampleL = riserBP_L.processBP(input: whiteNoise(), cutoffHz: sweepHz, q: 3.5, sr: srF) * riserVal * 0.28
                riserSampleR = riserBP_R.processBP(input: whiteNoise(), cutoffHz: sweepHz * 1.06, q: 3.5, sr: srF) * riserVal * 0.28
            }

            // --- 2. DEEP SUB + REESE BASS ---
            let targetBassHz = midiToHz(harm.bassMidi)
            smoothBassFreq += (targetBassHz - smoothBassFreq) * 0.003
            let subDt = (smoothBassFreq * 0.5) / srF // Sub octave (D1=36.7Hz / G1 / Bb1 / A1)
            let bassHz = harm.bassMidi < 36 ? smoothBassFreq : smoothBassFreq * 0.5
            subPhase = fmod(subPhase + bassHz / srF, 1.0)
            let reeseDt1 = (smoothBassFreq * 0.994) / srF
            let reeseDt2 = (smoothBassFreq * 1.006) / srF
            reesePhase1 = fmod(reesePhase1 + reeseDt1, 1.0)
            reesePhase2 = fmod(reesePhase2 + reeseDt2, 1.0)

            let actFadeOut: Float = (act == 5 && actTime > 4.0) ? max(0.0, 1.0 - (actTime - 4.0) / 3.8) : 1.0
            let bassCutoff: Float = {
                switch act {
                case 0: return 140.0 + 90.0 * (actTime / 8.0)
                case 1: return 260.0 + 120.0 * sin(actTime * 1.5)
                case 2: return 420.0 + 180.0 * sin(barBeat * .pi * 0.5)
                case 3: return 310.0 + 250.0 * (actTime / 8.0)
                case 4: return 620.0
                default: return 190.0
                }
            }()
            let rawReeseL = polySaw(reesePhase1, reeseDt1) * 0.45
            let rawReeseR = polySaw(reesePhase2, reeseDt2) * 0.45
            let filtBassL = bassFilterL.processLP(input: rawReeseL, cutoffHz: bassCutoff, q: 1.15, sr: srF)
            let filtBassR = bassFilterR.processLP(input: rawReeseR, cutoffHz: bassCutoff, q: 1.15, sr: srF)
            let pureSub = sin(subPhase * 2.0 * .pi) * 0.52
            let bassGain: Float = ((act == 0) ? 0.55 : 0.72) * sidechainDuck * actFadeOut
            let bassL = (pureSub + filtBassL) * bassGain
            let bassR = (pureSub + filtBassR) * bassGain
            let _ = subDt

            // --- 3. 7-NOTE STEREO SUPERSAW / WARM ANALOG PAD ---
            var rawPadL: Float = 0
            var rawPadR: Float = 0
            for (nIdx, midi) in harm.padMidis.enumerated() where nIdx < 7 {
                let baseHz = midiToHz(midi)
                for u in 0..<5 {
                    let hz = baseHz * (1.0 + unisonDetunes[u])
                    let dt = hz / srF
                    var ph = padPhases[nIdx][u] + dt
                    if ph >= 1.0 { ph -= 1.0 }
                    padPhases[nIdx][u] = ph
                    let saw = polySaw(ph, dt)
                    rawPadL += saw * unisonPanL[u]
                    rawPadR += saw * unisonPanR[u]
                }
            }
            rawPadL *= 0.042
            rawPadR *= 0.042

            let padCutoff: Float = {
                switch act {
                case 0: return 480.0 + 620.0 * (actTime / 8.0)
                case 1: return 1150.0 + 450.0 * sin(actTime * 0.8)
                case 2: return 1850.0 + 650.0 * (barBeat / 4.0)
                case 3: return 1400.0 + 2800.0 * (actTime / 8.0)
                case 4: return 4800.0 // Full epic open supersaw in Black Hole Climax!
                default: return max(380.0, 3200.0 * exp(-actTime * 0.32))
                }
            }()
            // Cascade 2 SVFs for warm 24dB/oct Moog/Prophet roll-off
            let padMidL = padFilterL1.processLP(input: rawPadL, cutoffHz: padCutoff, q: 0.85, sr: srF)
            let padMidR = padFilterR1.processLP(input: rawPadR, cutoffHz: padCutoff, q: 0.85, sr: srF)
            var padL = padFilterL2.processLP(input: padMidL, cutoffHz: padCutoff * 1.15, q: 0.707, sr: srF)
            var padR = padFilterR2.processLP(input: padMidR, cutoffHz: padCutoff * 1.15, q: 0.707, sr: srF)
            let padLevel: Float = ((act == 4) ? 0.88 : (act == 5 ? 0.82 : 0.65)) * (0.35 + 0.65 * sidechainDuck) * actFadeOut
            padL *= padLevel
            padR *= padLevel

            // --- 4. CRYSTALLINE 16TH-NOTE FM + ANALOG ARPEGGIATOR ---
            var arpL: Float = 0
            var arpR: Float = 0
            var arpEnvVal: Float = 0
            let arpMidi = harm.arpMidis[step16InBar % harm.arpMidis.count] + ((act == 4 && step16InBar % 4 == 0) ? 12.0 : 0.0)
            let arpHz = midiToHz(arpMidi)
            let arpPitchNorm = min(max((arpMidi - 55.0) / 30.0, 0.0), 1.0)

            let arpActive: Bool = {
                if act == 0 { return bar >= 2 && (step16InBar % 2 == 0) }
                if act == 5 { return actTime < 5.5 && (step16InBar % 2 == 0) }
                return true
            }()
            if arpActive {
                let vel = arpVelPattern[step16InBar % 8]
                let pluckDecay: Float = (act == 3 || act == 4) ? 14.0 : 19.0
                let env = exp(-step16Sec * pluckDecay) * (1.0 - exp(-step16Sec * 1200.0)) * vel * actFadeOut
                arpEnvVal = env

                let cDt = arpHz / srF
                let mDt = (arpHz * 2.0) / srF // 2:1 harmonic bell ratio
                arpCarrierPhase = fmod(arpCarrierPhase + cDt, 1.0)
                arpModPhase = fmod(arpModPhase + mDt, 1.0)
                arpSawPhase = fmod(arpSawPhase + cDt * 1.002, 1.0)

                let modIndex = (1.8 * exp(-step16Sec * 36.0) + 0.25) * vel
                let fmBell = sin((arpCarrierPhase + modIndex * sin(arpModPhase * 2.0 * .pi) / (2.0 * .pi)) * 2.0 * .pi)
                let pluckSaw = polySaw(arpSawPhase, cDt)
                let rawArp = fmBell * 0.58 + pluckSaw * 0.42
                let arpCut = 900.0 + 4800.0 * env + (act == 4 ? 1500.0 : 0.0)
                let pan = 0.5 + 0.28 * sin(Float(step16Global) * 0.9)
                arpL = arpFilterL.processLP(input: rawArp, cutoffHz: arpCut, q: 1.2, sr: srF) * env * 0.30 * (1.0 - pan * 0.5)
                arpR = arpFilterR.processLP(input: rawArp, cutoffHz: arpCut, q: 1.2, sr: srF) * env * 0.30 * (0.5 + pan * 0.5)
            }

            // --- 5. SOARING EXPRESSIVE SYNTH LEAD (Acts II..VI) ---
            var leadL: Float = 0
            var leadR: Float = 0
            if act >= 2 {
                var activeLeadMidi: Float? = nil
                var noteAgeSec: Float = 0
                for note in harm.leadNotes {
                    if step16InBar >= note.step16 && step16InBar < note.step16 + note.dur16 {
                        activeLeadMidi = note.midi
                        noteAgeSec = Float(step16InBar - note.step16) * 0.125 + step16Sec
                        break
                    }
                }
                if let lMidi = activeLeadMidi {
                    let targetHz = midiToHz(lMidi)
                    smoothLeadFreq += (targetHz - smoothLeadFreq) * 0.0022 // Smooth glide!
                    let vib = 1.0 + 0.0035 * sin(Float(t) * 5.6 * 2.0 * .pi) * min(noteAgeSec * 2.5, 1.0)
                    let lDt1 = (smoothLeadFreq * vib) / srF
                    let lDt2 = (smoothLeadFreq * vib * 1.004) / srF
                    leadPhase1 = fmod(leadPhase1 + lDt1, 1.0)
                    leadPhase2 = fmod(leadPhase2 + lDt2, 1.0)

                    let attack = min(noteAgeSec / 0.045, 1.0)
                    let leadGain: Float = ((act == 4) ? 0.24 : (act == 5 ? 0.18 : 0.15)) * attack * sidechainDuck * actFadeOut
                    let raw1 = polySaw(leadPhase1, lDt1)
                    let raw2 = polySaw(leadPhase2, lDt2)
                    let lCut: Float = (act == 4) ? 3800.0 : 2400.0
                    leadL = leadFilterL.processLP(input: raw1, cutoffHz: lCut, q: 1.3, sr: srF) * leadGain
                    leadR = leadFilterR.processLP(input: raw2, cutoffHz: lCut, q: 1.3, sr: srF) * leadGain
                }
            }

            // --- 6. PING-PONG DELAY & HALL REVERB SEND ---
            let dReadL = delayBufL[delayIdx]
            let dReadR = delayBufR[delayIdx]
            let sendDelayL = arpL * 0.55 + leadL * 0.45
            let sendDelayR = arpR * 0.55 + leadR * 0.45
            delayBufL[delayIdx] = delayLP_L.processLP(input: sendDelayL + dReadR * 0.42, cutoffHz: 3400.0, q: 0.7, sr: srF)
            delayBufR[delayIdx] = delayLP_R.processLP(input: sendDelayR + dReadL * 0.42, cutoffHz: 3400.0, q: 0.7, sr: srF)
            delayIdx = (delayIdx + 1) % delayLen

            let revSendL = padL * 0.48 + arpL * 0.35 + leadL * 0.55 + snareSampleL * 0.38 + dReadL * 0.35 + riserSampleL * 0.5
            let revSendR = padR * 0.48 + arpR * 0.35 + leadR * 0.55 + snareSampleR * 0.38 + dReadR * 0.35 + riserSampleR * 0.5
            let (revL, revR) = reverb.process(inL: revSendL, inR: revSendR, feedback: act == 5 ? 0.91 : 0.86, damp: 0.26)

            // Master Fade-in (0.15s) and clean Fade-out to exact zero over final 1.2s (46.8s..48.0s)
            var masterFade: Float = 1.0
            if t < 0.15 {
                masterFade = Float(t / 0.15)
            } else if t > 46.6 {
                let rem = Float((48.0 - t) / 1.4)
                masterFade = max(0.0, rem * rem)
            }

            let mixL = (kickSample + snareSampleL + hatSampleL + transitionImpactL + riserSampleL + bassL + padL + arpL + leadL + dReadL * 0.38 + revL * 0.46) * masterFade
            let mixR = (kickSample + snareSampleR + hatSampleR + transitionImpactR + riserSampleR + bassR + padR + arpR + leadR + dReadR * 0.38 + revR * 0.46) * masterFade

            left[s] = mixL
            right[s] = mixR

            // Accumulate per-frame telemetry
            let fIdx = min(s / samplesPerFrame, Config.totalFrames - 1)
            if kickEnvVal > telemetry[fIdx].kick { telemetry[fIdx].kick = kickEnvVal }
            if snareEnvVal > telemetry[fIdx].snare { telemetry[fIdx].snare = snareEnvVal }
            telemetry[fIdx].bass += abs(bassL) / Float(samplesPerFrame)
            telemetry[fIdx].pad += abs(padL + revL * 0.3) / Float(samplesPerFrame)
            if arpEnvVal > telemetry[fIdx].arp { telemetry[fIdx].arp = arpEnvVal }
            telemetry[fIdx].arpPitchNorm = arpPitchNorm
            if riserVal > telemetry[fIdx].riser { telemetry[fIdx].riser = riserVal }
            telemetry[fIdx].energy += (abs(mixL) + abs(mixR)) * 0.5 / Float(samplesPerFrame)
        }

        // Soft-Clip + Peak Normalize to -1.0 dBFS (0.891)
        var maxPeak: Float = 0.001
        for i in 0..<totalSamples {
            left[i] = tanh(left[i] * 0.92)
            right[i] = tanh(right[i] * 0.92)
            let p = max(abs(left[i]), abs(right[i]))
            if p > maxPeak { maxPeak = p }
        }
        let normGain: Float = 0.891 / maxPeak
        for i in 0..<totalSamples {
            left[i] *= normGain
            right[i] *= normGain
        }

        // Compute 32-band logarithmic Goertzel/DFT spectrum per video frame (smoothed temporally)
        let nWindow = 1024
        var prevSpec = Array(repeating: Float(0), count: 32)
        var bandFreqs = Array(repeating: Float(0), count: 32)
        for b in 0..<32 {
            // 36 Hz to 11,500 Hz log-spaced
            bandFreqs[b] = 36.0 * pow(11500.0 / 36.0, Float(b) / 31.0)
        }

        for f in 0..<Config.totalFrames {
            let centerSample = f * samplesPerFrame + samplesPerFrame / 2
            let startSample = max(0, min(totalSamples - nWindow, centerSample - nWindow / 2))

            for b in 0..<32 {
                let freq = bandFreqs[b]
                let omega = 2.0 * Float.pi * freq / srF
                let coeff = 2.0 * cos(omega)
                var s1: Float = 0
                var s2: Float = 0
                // Stride by 2 for ultra-fast Goertzel at 24kHz effective rate (covers up to 12kHz cleanly!)
                let omega2 = 2.0 * Float.pi * freq / (srF * 0.5)
                let coeff2 = 2.0 * cos(omega2)
                let _ = coeff
                var idx = startSample
                let endIdx = startSample + nWindow
                var k = 0
                while idx < endIdx {
                    let hann = 0.5 - 0.5 * cos(2.0 * Float.pi * Float(k) / Float(nWindow / 2))
                    let mono = (left[idx] + right[idx]) * 0.5 * hann
                    let s0 = mono + coeff2 * s1 - s2
                    s2 = s1
                    s1 = s0
                    idx += 2
                    k += 1
                }
                let power = max(0.0, s1 * s1 + s2 * s2 - coeff2 * s1 * s2)
                // Pink-noise tilt compensation (+3dB/octave) so high bands dance visibly alongside bass
                let tilt = pow(freq / 120.0, 0.38)
                let mag = min(1.0, sqrt(power) * 0.032 * tilt)
                let smoothed = mag > prevSpec[b] ? (prevSpec[b] * 0.35 + mag * 0.65) : (prevSpec[b] * 0.80 + mag * 0.20)
                prevSpec[b] = smoothed
                telemetry[f].spectrum[b] = smoothed
            }
            // Normalize bass & pad telemetry into clean 0..1 range
            telemetry[f].bass = min(1.0, telemetry[f].bass * 3.2)
            telemetry[f].pad = min(1.0, telemetry[f].pad * 4.5)
            telemetry[f].energy = min(1.0, telemetry[f].energy * 2.8)
        }

        try writeStereoWAV16(path: wavPath, left: left, right: right, sampleRate: sr)
        return telemetry
    }

    private static func writeStereoWAV16(path: String, left: [Float], right: [Float], sampleRate: Int) throws {
        let numSamples = left.count
        let numChannels: UInt16 = 2
        let bitsPerSample: UInt16 = 16
        let byteRate = UInt32(sampleRate * Int(numChannels) * Int(bitsPerSample / 8))
        let blockAlign = UInt16(numChannels * (bitsPerSample / 8))
        let dataSize = UInt32(numSamples * Int(blockAlign))
        let chunkSize = 36 + dataSize

        var data = Data(capacity: Int(44 + dataSize))
        data.append(contentsOf: "RIFF".utf8)
        withUnsafeBytes(of: chunkSize.littleEndian) { data.append(contentsOf: $0) }
        data.append(contentsOf: "WAVE".utf8)
        data.append(contentsOf: "fmt ".utf8)
        let subchunk1Size: UInt32 = 16
        let audioFormat: UInt16 = 1 // PCM
        let sr32 = UInt32(sampleRate)
        withUnsafeBytes(of: subchunk1Size.littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: audioFormat.littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: numChannels.littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: sr32.littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: byteRate.littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: blockAlign.littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: bitsPerSample.littleEndian) { data.append(contentsOf: $0) }
        data.append(contentsOf: "data".utf8)
        withUnsafeBytes(of: dataSize.littleEndian) { data.append(contentsOf: $0) }

        var pcm = Array(repeating: Int16(0), count: numSamples * 2)
        for i in 0..<numSamples {
            let l = Int32(clamping: Int(round(min(max(left[i], -1.0), 1.0) * 32767.0)))
            let r = Int32(clamping: Int(round(min(max(right[i], -1.0), 1.0) * 32767.0)))
            pcm[i * 2] = Int16(l)
            pcm[i * 2 + 1] = Int16(r)
        }
        pcm.withUnsafeBytes { data.append(contentsOf: $0) }
        try data.write(to: URL(fileURLWithPath: path))
    }
}
