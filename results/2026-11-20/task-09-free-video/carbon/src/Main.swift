import Foundation
import Metal
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import simd

enum CameraDirector {
    static func computeCamera(frame: Int, t: Float, act: Int, actProg: Float) -> (
        pos: SIMD3<Float>,
        right: SIMD3<Float>,
        up: SIMD3<Float>,
        fwd: SIMD3<Float>,
        fovTanHalf: Float,
        focalDist: Float,
        aperture: Float,
        bloom: Float
    ) {
        var eye = SIMD3<Float>(0, 0, -4.5)
        var target = SIMD3<Float>(0, 0, 0)
        var roll: Float = 0.0
        var fovDeg: Float = 46.0
        var focalDist: Float = 4.5
        var aperture: Float = 0.014
        var bloom: Float = 0.28

        // Smooth camera push at the last 0.45s of each act for kinetic energy!
        let endPush = pow(max(0.0, (actProg - 0.90) / 0.10), 2.0)

        switch act {
        case 0:
            // Act I: Graceful dolly-orbit around the Spherical-Harmonic Ferrofluid Orb
            let angle = -0.35 + actProg * 0.85
            let radius: Float = 4.35 - actProg * 0.85 - endPush * 0.9
            let height: Float = 0.42 - 0.18 * cos(actProg * .pi)
            eye = SIMD3<Float>(sin(angle) * radius, height, -cos(angle) * radius)
            target = SIMD3<Float>(0.0, -0.18, 0.0)
            roll = 0.04 * sin(actProg * .pi)
            fovDeg = 44.0 + endPush * 10.0
            focalDist = length(eye - SIMD3<Float>(0, 0, 0))
            aperture = 0.012
            bloom = 0.30

        case 1:
            // Act II: Sweeping 3D orbit framing the full twin-wing Strange Attractor
            let angle = 0.35 + actProg * 1.65
            let radius: Float = 5.85 - 0.55 * sin(actProg * .pi) - endPush * 0.85
            let height: Float = 0.68 * sin(actProg * .pi * 1.2 - 0.3)
            eye = SIMD3<Float>(sin(angle) * radius, height, -cos(angle) * radius)
            target = SIMD3<Float>(0.0, -0.15, 0.0)
            roll = 0.09 * sin(actProg * .pi * 2.0)
            fovDeg = 50.0
            focalDist = radius
            aperture = 0.017
            bloom = 0.30

        case 2:
            // Act III: Banking flight down the infinite Mandelbox Golden Cathedral!
            let zTravel = -actProg * 14.5 - endPush * 1.4
            let swayX = 0.18 * sin(zTravel * 0.18)
            let swayY = 0.12 * cos(zTravel * 0.22)
            let lookZ = zTravel - 3.5
            eye = SIMD3<Float>(swayX, swayY, -zTravel) // Note: +Z forward along fract(z*0.25)
            // Wait: in mapAct3, camera looks forward along +Z so objects stream toward camera (-Z)!
            let zFwd = actProg * 13.5 + endPush * 1.5
            eye = SIMD3<Float>(0.18 * sin(zFwd * 0.18), 0.12 * cos(zFwd * 0.22), zFwd)
            let lookAheadZ = zFwd + 3.2
            target = SIMD3<Float>(0.18 * sin(lookAheadZ * 0.18), 0.12 * cos(lookAheadZ * 0.22) - 0.06, lookAheadZ)
            roll = -0.12 * cos(zFwd * 0.18)
            fovDeg = 58.0 + endPush * 8.0
            focalDist = 4.2
            aperture = 0.010
            bloom = 0.28
            let _ = lookZ

        case 3:
            // Act IV: Floating glide through the Refractive Crystal & Synaptic Constellation
            let angle = -0.6 + actProg * 1.45
            let radius: Float = 5.1 - 0.75 * sin(actProg * .pi) - endPush * 0.7
            eye = SIMD3<Float>(sin(angle) * radius, 0.75 * cos(actProg * 2.2), -cos(angle) * radius)
            target = SIMD3<Float>(0.0, -0.08, 0.0)
            roll = 0.07 * sin(actProg * .pi)
            fovDeg = 48.0
            focalDist = radius - 0.3
            aperture = 0.016
            bloom = 0.32

        case 4:
            // Act V: Epic Interstellar Gargantua inclined orbit + Dutch roll!
            let angle = -0.45 + actProg * 1.15
            let radius: Float = 6.85 - actProg * 1.35 - endPush * 1.0
            let elev: Float = 1.12 - 0.38 * actProg
            eye = SIMD3<Float>(sin(angle) * radius, elev, -cos(angle) * radius)
            target = SIMD3<Float>(-0.15, -0.22, 0.0)
            roll = -0.20 + 0.08 * actProg
            fovDeg = 48.0 + endPush * 10.0
            focalDist = length(eye)
            aperture = 0.010
            bloom = 0.28

        default:
            // Act VI: Serene pullback from Celestial Golden-Ratio Crown
            let angle = actProg * 0.42
            let radius: Float = 5.1 + actProg * 1.65
            eye = SIMD3<Float>(sin(angle) * radius, 0.55 + 0.30 * actProg, -cos(angle) * radius)
            target = SIMD3<Float>(0.0, -0.05, 0.0)
            roll = 0.0
            fovDeg = 46.0
            focalDist = radius
            aperture = 0.012
            bloom = 0.26
        }

        let fwd = simd_normalize(target - eye)
        let worldUp = SIMD3<Float>(sin(roll), cos(roll), 0.0)
        let right = simd_normalize(simd_cross(worldUp, fwd))
        let up = simd_cross(fwd, right)
        let fovTanHalf = tan((fovDeg * Float.pi / 180.0) * 0.5)

        return (eye, right, up, fwd, fovTanHalf, focalDist, aperture, bloom)
    }
}

func saveBGRA8TextureAsPNG(_ tex: MTLTexture, to path: String) throws {
    let w = tex.width
    let h = tex.height
    let bpr = w * 4
    var bytes = Array(repeating: UInt8(0), count: bpr * h)
    tex.getBytes(&bytes, bytesPerRow: bpr, from: MTLRegionMake2D(0, 0, w, h), mipmapLevel: 0)

    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let info = CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    guard let provider = CGDataProvider(data: Data(bytes) as CFData),
          let cgImg = CGImage(
              width: w,
              height: h,
              bitsPerComponent: 8,
              bitsPerPixel: 32,
              bytesPerRow: bpr,
              space: cs,
              bitmapInfo: CGBitmapInfo(rawValue: info),
              provider: provider,
              decode: nil,
              shouldInterpolate: false,
              intent: .defaultIntent
          ) else {
        throw NSError(domain: "ImageExport", code: 1)
    }
    let url = URL(fileURLWithPath: path) as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else {
        throw NSError(domain: "ImageExport", code: 2)
    }
    CGImageDestinationAddImage(dest, cgImg, nil)
    CGImageDestinationFinalize(dest)
}

@main
struct ShowcaseApp {
    static func main() throws {
        let args = CommandLine.arguments
        let isPreview = args.contains("--preview")
        let workspace = FileManager.default.currentDirectoryPath
        let buildDir = "\(workspace)/build"
        try FileManager.default.createDirectory(atPath: buildDir, withIntermediateDirectories: true)

        let tStart = CFAbsoluteTimeGetCurrent()
        print("[1/3] Synthesizing 48kHz stereo procedural score + 32-band frame telemetry...")
        let wavPath = "\(buildDir)/score.wav"
        let telemetry = try AudioSynth.generateScore(wavPath: wavPath)
        print(String(format: "      Audio synthesized in %.2fs -> %@", CFAbsoluteTimeGetCurrent() - tStart, wavPath))

        print("[2/3] Initializing Apple Metal GPU pipeline...")
        guard let device = MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue() else {
            fatalError("Metal GPU unavailable")
        }
        print("      GPU: \(device.name)")

        let shaderSource = try String(contentsOfFile: "\(workspace)/src/Shaders.metal", encoding: .utf8)
        let compileOpts = MTLCompileOptions()
        compileOpts.mathMode = .fast
        let library = try device.makeLibrary(source: shaderSource, options: compileOpts)

        let pInitParticles = try device.makeComputePipelineState(function: library.makeFunction(name: "init_particles")!)
        let pUpdateParticles = try device.makeComputePipelineState(function: library.makeFunction(name: "update_particles")!)
        let pRenderScene = try device.makeComputePipelineState(function: library.makeFunction(name: "render_scene")!)
        let pBloomDown = try device.makeComputePipelineState(function: library.makeFunction(name: "bloom_threshold_downsample")!)
        let pBloomBlur = try device.makeComputePipelineState(function: library.makeFunction(name: "bloom_blur_pass")!)
        let pComposite = try device.makeComputePipelineState(function: library.makeFunction(name: "composite_final")!)

        // Additive Bokeh Particle Render Pipeline
        let rDesc = MTLRenderPipelineDescriptor()
        rDesc.vertexFunction = library.makeFunction(name: "vertex_particle")!
        rDesc.fragmentFunction = library.makeFunction(name: "fragment_particle")!
        rDesc.colorAttachments[0].pixelFormat = .rgba16Float
        rDesc.colorAttachments[0].isBlendingEnabled = true
        rDesc.colorAttachments[0].rgbBlendOperation = .add
        rDesc.colorAttachments[0].alphaBlendOperation = .add
        rDesc.colorAttachments[0].sourceRGBBlendFactor = .one
        rDesc.colorAttachments[0].destinationRGBBlendFactor = .one
        rDesc.colorAttachments[0].sourceAlphaBlendFactor = .one
        rDesc.colorAttachments[0].destinationAlphaBlendFactor = .one
        let pSplatParticles = try device.makeRenderPipelineState(descriptor: rDesc)

        // Allocate GPU buffers & HDR textures
        let particleStride = 32 // 2 x float4
        let particleBuf = device.makeBuffer(length: Config.particleCount * particleStride, options: .storageModePrivate)!

        func makeTex(_ fmt: MTLPixelFormat, _ w: Int, _ h: Int, shared: Bool = false) -> MTLTexture {
            let d = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: fmt, width: w, height: h, mipmapped: false)
            d.usage = [.shaderRead, .shaderWrite, .renderTarget]
            d.storageMode = shared ? .shared : .private
            return device.makeTexture(descriptor: d)!
        }

        let W = Config.width
        let H = Config.height
        let sceneTex    = makeTex(.rgba16Float, W, H)
        let particleTex = makeTex(.rgba16Float, W, H)
        let bloomHalfA  = makeTex(.rgba16Float, W / 2, H / 2)
        let bloomHalfB  = makeTex(.rgba16Float, W / 2, H / 2)
        let bloomQuarA  = makeTex(.rgba16Float, W / 4, H / 4)
        let bloomQuarB  = makeTex(.rgba16Float, W / 4, H / 4)
        let outBGRA     = makeTex(.bgra8Unorm, W, H, shared: true)

        let hudRenderer = HUDRenderer(device: device, width: W, height: H)

        // Initialize 262,144 GPU particles
        do {
            let cmd = queue.makeCommandBuffer()!
            let enc = cmd.makeComputeCommandEncoder()!
            enc.setComputePipelineState(pInitParticles)
            enc.setBuffer(particleBuf, offset: 0, index: 0)
            enc.dispatchThreads(MTLSize(width: Config.particleCount, height: 1, depth: 1),
                                threadsPerThreadgroup: MTLSize(width: 256, height: 1, depth: 1))
            enc.endEncoding()
            cmd.commit()
            cmd.waitUntilCompleted()
        }

        // Optional FFmpeg process for full 1080p60 render
        var ffmpegProc: Process? = nil
        var ffmpegPipe: Pipe? = nil
        let finalVideoPath = "\(workspace)/singularity_showcase.mp4"
        var rawFrameBuf = Array(repeating: UInt8(0), count: W * H * 4)

        let previewFrames: Set<Int> = [
            150,  // Act I: Ignition + Title Card (2.5s)
            360,  // Act I: Ferrofluid orb pure shot (6.0s)
            600,  // Act II: Lorenz Strange Attractor + Chapter Card (10.0s)
            840,  // Act II: Aizawa Morph Attractor (14.0s)
            1080, // Act III: Mandelbox Golden Cathedral + Chapter Card (18.0s)
            1560, // Act IV: Refractive Crystal & Synaptic Lattice (26.0s)
            2040, // Act V: Relativistic Black Hole & Doppler Disk (34.0s)
            2580, // Act VI: Celestial Astrolabe & Finale Manifesto (43.0s)
            2865  // Final fade-out check (47.75s)
        ]

        if !isPreview {
            print("[3/3] Rendering all \(Config.totalFrames) frames (1920x1080 @ 60fps) -> FFmpeg H.264 + AAC...")
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/ffmpeg")
            proc.arguments = [
                "-y",
                "-f", "rawvideo",
                "-vcodec", "rawvideo",
                "-pix_fmt", "bgra",
                "-s", "\(W)x\(H)",
                "-r", "\(Config.fps)",
                "-i", "-",
                "-i", wavPath,
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:v", "libx264",
                "-preset", "slow",
                "-crf", "18",
                "-maxrate", "38M",
                "-bufsize", "76M",
                "-pix_fmt", "yuv420p",
                "-profile:v", "high",
                "-level", "4.2",
                "-color_primaries", "bt709",
                "-color_trc", "bt709",
                "-colorspace", "bt709",
                "-c:a", "aac",
                "-b:a", "320k",
                "-ar", "48000",
                "-movflags", "+faststart",
                "-shortest",
                finalVideoPath
            ]
            let pipe = Pipe()
            proc.standardInput = pipe
            proc.standardError = FileHandle(forWritingAtPath: "\(buildDir)/ffmpeg.log") ?? FileHandle.nullDevice
            try proc.run()
            ffmpegProc = proc
            ffmpegPipe = pipe
        } else {
            print("[3/3] Running fast keyframe preview check across all 6 Acts...")
            try FileManager.default.createDirectory(atPath: "\(buildDir)/previews", withIntermediateDirectories: true)
        }

        let renderStart = CFAbsoluteTimeGetCurrent()
        let dt: Float = 1.0 / Float(Config.fps)

        for f in 0..<Config.totalFrames {
            let t = Float(f) * dt
            let beat = t * Float(Config.bpm / 60.0)
            let barPhase = fract(beat * 0.25)
            let act = min(Int(t / 8.0), 5)
            let actProg = (t - Float(act) * 8.0) / 8.0

            // Optical flash right across Act boundaries (8s, 16s, 24s, 32s, 40s)
            var flash: Float = 0.0
            for boundary in [8.0, 16.0, 24.0, 32.0, 40.0] as [Float] {
                let d = abs(t - boundary)
                if d < 0.28 {
                    let peak: Float = (boundary == 40.0) ? 0.95 : 0.55
                    flash = max(flash, exp(-d * 14.0) * peak)
                }
            }

            // Master cinema fade-in (0..0.65s) and clean fade-out to black (46.8..48.0s)
            var masterFade: Float = 1.0
            if t < 0.65 {
                let u = t / 0.65
                masterFade = u * u * (3.0 - 2.0 * u)
            } else if t > 46.8 {
                let u = max(0.0, (48.0 - t) / 1.2)
                masterFade = u * u * (3.0 - 2.0 * u)
            }

            let audio = telemetry[f]
            let cam = CameraDirector.computeCamera(frame: f, t: t, act: act, actProg: actProg)

            var U = GPUUniforms()
            U.uTime = SIMD4<Float>(t, dt, beat, barPhase)
            U.uAct = SIMD4<Float>(Float(act), actProg, flash, masterFade)
            U.uAudio = SIMD4<Float>(audio.kick, audio.snare, audio.bass, audio.pad)
            U.uAudio2 = SIMD4<Float>(audio.arp, audio.arpPitchNorm, audio.riser, audio.energy)
            U.uCamPos = SIMD4<Float>(cam.pos.x, cam.pos.y, cam.pos.z, cam.fovTanHalf)
            U.uCamRight = SIMD4<Float>(cam.right.x, cam.right.y, cam.right.z, cam.focalDist)
            U.uCamUp = SIMD4<Float>(cam.up.x, cam.up.y, cam.up.z, cam.aperture)
            U.uCamFwd = SIMD4<Float>(cam.fwd.x, cam.fwd.y, cam.fwd.z, cam.bloom)

            // Always step particle physics so preview frames have authentic chaotic trajectories!
            let shouldRenderVisuals = !isPreview || previewFrames.contains(f)

            let cmd = queue.makeCommandBuffer()!

            // 1. Update 262,144 GPU particles
            do {
                let enc = cmd.makeComputeCommandEncoder()!
                enc.setComputePipelineState(pUpdateParticles)
                enc.setBuffer(particleBuf, offset: 0, index: 0)
                enc.setBytes(&U, length: MemoryLayout<GPUUniforms>.stride, index: 1)
                enc.dispatchThreads(MTLSize(width: Config.particleCount, height: 1, depth: 1),
                                    threadsPerThreadgroup: MTLSize(width: 256, height: 1, depth: 1))
                enc.endEncoding()
            }

            if shouldRenderVisuals {
                // Render CPU CoreGraphics/CoreText HUD while GPU updates particles!
                hudRenderer.renderFrame(frameIndex: f, uniforms: U, audio: audio)

                let tg16 = MTLSize(width: 16, height: 16, depth: 1)

                // 2. Raymarched / Relativistic 3D HDR Scene Pass
                do {
                    let enc = cmd.makeComputeCommandEncoder()!
                    enc.setComputePipelineState(pRenderScene)
                    enc.setTexture(sceneTex, index: 0)
                    enc.setBytes(&U, length: MemoryLayout<GPUUniforms>.stride, index: 0)
                    enc.dispatchThreads(MTLSize(width: W, height: H, depth: 1), threadsPerThreadgroup: tg16)
                    enc.endEncoding()
                }

                // 3. Hardware Additive Bokeh Particle Pass (262,144 depth-occluded quads)
                do {
                    let rpDesc = MTLRenderPassDescriptor()
                    rpDesc.colorAttachments[0].texture = particleTex
                    rpDesc.colorAttachments[0].loadAction = .clear
                    rpDesc.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
                    rpDesc.colorAttachments[0].storeAction = .store
                    let rEnc = cmd.makeRenderCommandEncoder(descriptor: rpDesc)!
                    rEnc.setRenderPipelineState(pSplatParticles)
                    rEnc.setVertexBuffer(particleBuf, offset: 0, index: 0)
                    rEnc.setVertexBytes(&U, length: MemoryLayout<GPUUniforms>.stride, index: 1)
                    rEnc.setFragmentTexture(sceneTex, index: 0)
                    rEnc.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4, instanceCount: Config.particleCount)
                    rEnc.endEncoding()
                }

                // 4. Multi-scale HDR Bloom + Anamorphic Streak Passes
                do {
                    let enc = cmd.makeComputeCommandEncoder()!
                    // Threshold & downsample to Half-Res
                    enc.setComputePipelineState(pBloomDown)
                    enc.setTexture(sceneTex, index: 0)
                    enc.setTexture(particleTex, index: 1)
                    enc.setTexture(bloomHalfA, index: 2)
                    enc.dispatchThreads(MTLSize(width: W / 2, height: H / 2, depth: 1), threadsPerThreadgroup: tg16)

                    // Blur Half-Res H & V (Fine Bloom)
                    enc.setComputePipelineState(pBloomBlur)
                    var stepH1 = SIMD2<Float>(1.4 / Float(W / 2), 0.0) // Slight anamorphic horizontal stretch
                    var stepV1 = SIMD2<Float>(0.0, 1.0 / Float(H / 2))
                    enc.setTexture(bloomHalfA, index: 0)
                    enc.setTexture(bloomHalfB, index: 1)
                    enc.setBytes(&stepH1, length: MemoryLayout<SIMD2<Float>>.stride, index: 0)
                    enc.dispatchThreads(MTLSize(width: W / 2, height: H / 2, depth: 1), threadsPerThreadgroup: tg16)

                    enc.setTexture(bloomHalfB, index: 0)
                    enc.setTexture(bloomHalfA, index: 1)
                    enc.setBytes(&stepV1, length: MemoryLayout<SIMD2<Float>>.stride, index: 0)
                    enc.dispatchThreads(MTLSize(width: W / 2, height: H / 2, depth: 1), threadsPerThreadgroup: tg16)

                    // Blur Quarter-Res H & V (Wide Atmospheric + Anamorphic Bloom)
                    var stepH2 = SIMD2<Float>(2.2 / Float(W / 4), 0.0)
                    var stepV2 = SIMD2<Float>(0.0, 1.3 / Float(H / 4))
                    enc.setTexture(bloomHalfA, index: 0)
                    enc.setTexture(bloomQuarB, index: 1)
                    enc.setBytes(&stepH2, length: MemoryLayout<SIMD2<Float>>.stride, index: 0)
                    enc.dispatchThreads(MTLSize(width: W / 4, height: H / 4, depth: 1), threadsPerThreadgroup: tg16)

                    enc.setTexture(bloomQuarB, index: 0)
                    enc.setTexture(bloomQuarA, index: 1)
                    enc.setBytes(&stepV2, length: MemoryLayout<SIMD2<Float>>.stride, index: 0)
                    enc.dispatchThreads(MTLSize(width: W / 4, height: H / 4, depth: 1), threadsPerThreadgroup: tg16)

                    // 5. Final Master Composite (HDR + Bloom + HUD + ACES + Dither)
                    enc.setComputePipelineState(pComposite)
                    enc.setTexture(sceneTex, index: 0)
                    enc.setTexture(particleTex, index: 1)
                    enc.setTexture(bloomHalfA, index: 2)
                    enc.setTexture(bloomQuarA, index: 3)
                    enc.setTexture(hudRenderer.texture, index: 4)
                    enc.setTexture(outBGRA, index: 5)
                    enc.setBytes(&U, length: MemoryLayout<GPUUniforms>.stride, index: 0)
                    enc.dispatchThreads(MTLSize(width: W, height: H, depth: 1), threadsPerThreadgroup: tg16)
                    enc.endEncoding()
                }
            }

            cmd.commit()
            cmd.waitUntilCompleted()

            if isPreview && previewFrames.contains(f) {
                let pngPath = String(format: "%@/previews/frame_%04d.png", buildDir, f)
                try saveBGRA8TextureAsPNG(outBGRA, to: pngPath)
                print("      Saved preview \(pngPath)")
            } else if let pipe = ffmpegPipe {
                outBGRA.getBytes(&rawFrameBuf, bytesPerRow: W * 4, from: MTLRegionMake2D(0, 0, W, H), mipmapLevel: 0)
                try pipe.fileHandleForWriting.write(contentsOf: rawFrameBuf)
                if previewFrames.contains(f) {
                    try? FileManager.default.createDirectory(atPath: "\(buildDir)/previews", withIntermediateDirectories: true)
                    let pngPath = String(format: "%@/previews/frame_%04d.png", buildDir, f)
                    try saveBGRA8TextureAsPNG(outBGRA, to: pngPath)
                }
                if (f + 1) % 480 == 0 {
                    let elapsed = CFAbsoluteTimeGetCurrent() - renderStart
                    let fpsActual = Double(f + 1) / max(elapsed, 0.001)
                    print(String(format: "      Act %d/6 complete (%d/%d frames, %.1f fps)", (f + 1) / 480, f + 1, Config.totalFrames, fpsActual))
                }
            }
        }

        if let pipe = ffmpegPipe, let proc = ffmpegProc {
            try pipe.fileHandleForWriting.close()
            proc.waitUntilExit()
            guard proc.terminationStatus == 0 else {
                let log = (try? String(contentsOfFile: "\(buildDir)/ffmpeg.log", encoding: .utf8)) ?? "unknown"
                fatalError("FFmpeg exited with code \(proc.terminationStatus):\n\(log)")
            }
            let totalElapsed = CFAbsoluteTimeGetCurrent() - tStart
            print(String(format: "DONE! Master video rendered in %.2fs -> %@", totalElapsed, finalVideoPath))
        }
    }
}

@inline(__always)
private func fract(_ x: Float) -> Float {
    return x - floor(x)
}
