import AVFoundation
import CoreVideo
import Foundation
import ImageIO
import Metal
import MetalKit

struct Shot: Decodable {
    let from: Double
    let to: Double
    let image: String
    let mode: Int
    let variant: Float
    let style: Int
    let first: [Float]
    let last: [Float]
    let warmth: [Float]
    let fx: [Float]
    let focal: Float
    let point: [Float]
    let fade: [Float]
    let ramp: Float
    let heading: Bool
}

struct Frame {
    var clock: SIMD4<Float>
    var camera: SIMD4<Float>
    var tone: SIMD4<Float>
    var setup: SIMD4<Float>
    var point: SIMD4<Float>
}

func vector(_ f: [Float]) -> SIMD4<Float> {
    SIMD4(f[0], f[1], f[2], f[3])
}

func limit(_ x: Float) -> Float { max(0, min(x, 1)) }

func ease(_ x: Float) -> Float {
    let u = limit(x)
    return u * u * (3 - 2 * u)
}

func blend(_ a: Float, _ b: Float, _ x: Float) -> Float { a + (b-a)*x }

func fail(_ why: String) -> NSError {
    NSError(domain: "The Sea Remembers Dawn", code: 1, userInfo: [NSLocalizedDescriptionKey: why])
}

class Film {
    let width = 1920
    let height = 1080
    let fps: Int32 = 24
    let seconds = 142.5
    let beatSeconds = 60.0 / 174.0
    let shots: [Shot]
    let base: URL
    let device: MTLDevice
    let queue: MTLCommandQueue
    let pipeline: MTLComputePipelineState
    let loader: MTKTextureLoader
    let title: MTLTexture
    let placeholder: MTLTexture
    var plates: [String: MTLTexture] = [:]
    var cache: CVMetalTextureCache?

    init(base: URL) throws {
        self.base = base
        shots = try JSONDecoder().decode([Shot].self, from: Data(contentsOf: base.appendingPathComponent("edit.json")))
        guard let device = MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue() else { throw fail("Metal device unavailable") }
        self.device = device
        self.queue = queue
        let source = try String(contentsOf: base.appendingPathComponent("film.metal"), encoding: .utf8)
        let library = try device.makeLibrary(source: source, options: nil)
        guard let kernel = library.makeFunction(name: "render") else { throw fail("Missing Metal render kernel") }
        pipeline = try device.makeComputePipelineState(function: kernel)
        loader = MTKTextureLoader(device: device)
        let options: [MTKTextureLoader.Option: Any] = [
            .SRGB: false,
            .origin: MTKTextureLoader.Origin.topLeft,
            .generateMipmaps: false
        ]
        title = try loader.newTexture(URL: base.appendingPathComponent("title.png"), options: options)
        placeholder = title
        for shot in shots where shot.mode == 0 && plates[shot.image] == nil {
            let file = base.appendingPathComponent("plates/\(shot.image).png")
            plates[shot.image] = try loader.newTexture(URL: file, options: options)
        }
        guard CVMetalTextureCacheCreate(kCFAllocatorDefault, nil, device, nil, &cache) == kCVReturnSuccess else {
            throw fail("Cannot initialize Metal texture cache")
        }
    }

    func render(sourceTime: Double, into pixel: CVPixelBuffer) throws {
        let beat = sourceTime / beatSeconds
        let bar = beat / 4
        let shot = shots.last(where: { bar + 0.00001 >= $0.from }) ?? shots[0]
        let local = max(0, (bar - shot.from) * beatSeconds * 4)
        let end = (shot.to - shot.from) * beatSeconds * 4
        let u = limit(Float(local / end))
        let motion = Float(pow(Double(u), Double(shot.ramp)))
        var camera = vector(shot.first) + (vector(shot.last) - vector(shot.first)) * motion
        let time = Float(sourceTime)
        var exposure: Float = 1
        if shot.fade[0] > 0 { exposure *= ease(Float(local)/shot.fade[0]) }
        if shot.fade[1] > 0 { exposure *= ease(Float(max(0, end-local))/shot.fade[1]) }
        let warm = blend(shot.warmth[0], shot.warmth[1], ease(u))
        let fx = blend(shot.fx[0], shot.fx[1], u)
        if shot.mode == 0 {
            camera.x += 0.0028 * sin(time * 1.26) * min(1, fx + 0.19)
            camera.y += 0.0017 * sin(time * 1.91) * min(1, fx + 0.19)
            camera.w += 0.0025 * sin(time * 1.1)
        }
        let typeIn = shot.heading ? ease(Float(local-0.35)/1.2) * ease(Float(end - local - 0.23)/1.03) : 0
        var params = Frame(clock: SIMD4(time, u, Float(beat), Float(local)),
                           camera: camera, tone: SIMD4(warm, fx, exposure, typeIn),
                           setup: SIMD4(Float(shot.mode), shot.variant, Float(shot.style), shot.focal),
                           point: vector(shot.point))
        // BGRA is rendered directly into an encoder buffer. All texture bytes are full-range RGB.
        var bridge: CVMetalTexture?
        let status = CVMetalTextureCacheCreateTextureFromImage(kCFAllocatorDefault, cache!, pixel,
                         nil, .bgra8Unorm, width, height, 0, &bridge)
        guard status == kCVReturnSuccess, let bridge,
              let output = CVMetalTextureGetTexture(bridge),
              let commands = queue.makeCommandBuffer(),
              let encoder = commands.makeComputeCommandEncoder()
        else { throw fail("Unable to bind output pixel buffer") }
        encoder.setComputePipelineState(pipeline)
        encoder.setTexture(plates[shot.image] ?? placeholder, index: 0)
        encoder.setTexture(title, index: 1)
        encoder.setTexture(output, index: 2)
        encoder.setBytes(&params, length: MemoryLayout<Frame>.stride, index: 0)
        let step = pipeline.threadExecutionWidth
        encoder.dispatchThreads(MTLSize(width: width, height: height, depth: 1),
                                threadsPerThreadgroup: MTLSize(width: step, height: 4, depth: 1))
        encoder.endEncoding()
        commands.commit()
        commands.waitUntilCompleted()
        if let error = commands.error { throw error }
        withExtendedLifetime(bridge) {}
    }

    func encode(to url: URL, times: [Double]? = nil) throws {
        let options: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoColorPropertiesKey: [
                AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
            ],
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 15_000_000,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoExpectedSourceFrameRateKey: fps,
                AVVideoMaxKeyFrameIntervalKey: fps * 2,
                AVVideoAllowFrameReorderingKey: true
            ]
        ]
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: options)
        input.expectsMediaDataInRealTime = false
        writer.add(input)
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input,
            sourcePixelBufferAttributes: [
                kCVPixelBufferWidthKey as String: width,
                kCVPixelBufferHeightKey as String: height,
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferMetalCompatibilityKey as String: true,
                kCVPixelBufferIOSurfacePropertiesKey as String: [:]
            ])
        guard writer.startWriting() else { throw writer.error ?? fail("Cannot start encoder") }
        writer.startSession(atSourceTime: .zero)
        guard let pool = adaptor.pixelBufferPool else { throw fail("Encoder pixel pool unavailable") }
        let frames = times?.count ?? Int(seconds * Double(fps))
        let started = Date()
        for index in 0..<frames {
            try autoreleasepool {
                while !input.isReadyForMoreMediaData {
                    guard writer.status == .writing else { throw writer.error ?? fail("Encoder stopped") }
                    Thread.sleep(forTimeInterval: 0.002)
                }
                var buffer: CVPixelBuffer?
                guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &buffer) == kCVReturnSuccess,
                      let buffer else { throw fail("Cannot allocate encoder frame") }
                let timestamp = CMTime(value: Int64(index), timescale: fps)
                try render(sourceTime: times?[index] ?? timestamp.seconds, into: buffer)
                guard adaptor.append(buffer, withPresentationTime: timestamp) else {
                    throw writer.error ?? fail("Unable to append frame \(index)")
                }
            }
            if index % 240 == 0 || index == frames - 1 {
                let elapsed = Date().timeIntervalSince(started)
                print(String(format: "%4d / %4d frames | %.1fs", index + 1, frames, elapsed))
                fflush(stdout)
            }
        }
        writer.endSession(atSourceTime: CMTime(value: Int64(frames), timescale: fps))
        input.markAsFinished()
        let closed = DispatchSemaphore(value: 0)
        writer.finishWriting { closed.signal() }
        closed.wait()
        guard writer.status == .completed else { throw writer.error ?? fail("Encoder did not finish") }
    }
}

do {
    let args = CommandLine.arguments
    guard args.count >= 3 else { throw fail("Usage: render path/to/.studio output.mp4 [review timestamps...]") }
    let film = try Film(base: URL(fileURLWithPath: args[1], isDirectory: true))
    let tests = args.dropFirst(3).compactMap { Double($0) }
    try film.encode(to: URL(fileURLWithPath: args[2]), times: tests.isEmpty ? nil : tests)
} catch {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(1)
}
