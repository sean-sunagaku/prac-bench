import Foundation
import simd

public enum Config {
    public static let width: Int = 1920
    public static let height: Int = 1080
    public static let fps: Int = 60
    public static let durationSeconds: Double = 48.0
    public static let totalFrames: Int = Int(durationSeconds * Double(fps)) // 2880
    public static let bpm: Double = 120.0
    public static let sampleRate: Int = 48_000
    public static let particleCount: Int = 262_144 // 512 x 512
}

// 16-byte float4-aligned uniform block shared identically with Metal
public struct GPUUniforms {
    public var uTime: SIMD4<Float>       // x: time, y: dt, z: beat, w: barPhase (0..1)
    public var uAct: SIMD4<Float>        // x: actIndex, y: actProgress (0..1), z: transitionFlash, w: masterFade
    public var uAudio: SIMD4<Float>      // x: kickEnv, y: snareEnv, z: bassEnv, w: padEnv
    public var uAudio2: SIMD4<Float>     // x: arpEnv, y: arpPitchNorm, z: riserEnv, w: masterEnergy
    public var uCamPos: SIMD4<Float>     // xyz: camera world pos, w: fovTanHalf
    public var uCamRight: SIMD4<Float>   // xyz: camera right, w: focalDist
    public var uCamUp: SIMD4<Float>      // xyz: camera up, w: aperture
    public var uCamFwd: SIMD4<Float>     // xyz: camera forward, w: bloomIntensity
    public var uRes: SIMD4<Float>        // x: W, y: H, z: 1/W, w: 1/H

    public init() {
        uTime = .zero
        uAct = .zero
        uAudio = .zero
        uAudio2 = .zero
        uCamPos = SIMD4<Float>(0, 0, -5, 0.5)
        uCamRight = SIMD4<Float>(1, 0, 0, 5.0)
        uCamUp = SIMD4<Float>(0, 1, 0, 0.02)
        uCamFwd = SIMD4<Float>(0, 0, 1, 0.25)
        uRes = SIMD4<Float>(
            Float(Config.width),
            Float(Config.height),
            1.0 / Float(Config.width),
            1.0 / Float(Config.height)
        )
    }
}

public struct AudioFrameTelemetry {
    public var kick: Float = 0
    public var snare: Float = 0
    public var bass: Float = 0
    public var pad: Float = 0
    public var arp: Float = 0
    public var arpPitchNorm: Float = 0.5
    public var riser: Float = 0
    public var energy: Float = 0
    public var spectrum: [Float] = Array(repeating: 0, count: 32)

    public init() {}
}
