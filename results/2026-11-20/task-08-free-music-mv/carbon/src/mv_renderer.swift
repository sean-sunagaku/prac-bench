// ============================================================================
// SINGULARITY BLOOM — Apple Metal 1080p 60fps HDR MV Renderer + CoreText Engine
// Pipes raw RGBA8 frames directly to FFmpeg libx264 + Mastered 48kHz Audio
// ============================================================================

import Foundation
import Metal
import CoreGraphics
import CoreText
import ImageIO

// Must match C++ FrameTelemetry (400 bytes packed)
struct FrameTelemetry {
    var time_sec: Float
    var bar_pos: Float
    var beat_phase: Float
    var act_id: Int32
    var shot_id: Int32
    var kick_env: Float
    var snare_env: Float
    var hat_env: Float
    var sub_env: Float
    var chord_env: Float
    var piano_env: Float
    var vocal_env: Float
    var lead_env: Float
    var riser_env: Float
    var glitch_trig: Float
    var aspect_open: Float
    var key_mod: Float
    var last_piano_pitch: Float
    var last_lead_pitch: Float
    var flash_white: Float
    var spectrum: (
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float
    )
    var piano_keys: (
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float
    )
}

// Must match Metal GPUUniforms (416 bytes aligned)
struct GPUUniforms {
    var time_sec: Float
    var bar_pos: Float
    var beat_phase: Float
    var act_id: Int32
    var shot_id: Int32
    var kick_env: Float
    var snare_env: Float
    var hat_env: Float
    var sub_env: Float
    var chord_env: Float
    var piano_env: Float
    var vocal_env: Float
    var lead_env: Float
    var riser_env: Float
    var glitch_trig: Float
    var aspect_open: Float
    var key_mod: Float
    var last_piano_pitch: Float
    var last_lead_pitch: Float
    var flash_white: Float
    var shot_progress: Float
    var pad0: Float = 0
    var pad1: Float = 0
    var pad2: Float = 0
    var spectrum: (
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float
    )
    var piano_keys: (
        Float, Float, Float, Float, Float, Float, Float, Float,
        Float, Float, Float, Float, Float, Float, Float, Float
    )
}

struct LyricCue {
    let startBar: Float
    let endBar: Float
    let jp: String
    let en: String
    let centered: Bool
}

let LYRICS: [LyricCue] = [
    // Act I: Genesis
    LyricCue(startBar: 4.0,  endBar: 7.8,  jp: "絶対零度の硝子の海で", en: "Upon a sea of glass at absolute zero,", centered: false),
    LyricCue(startBar: 8.0,  endBar: 11.8, jp: "名もなき記憶が　鍵盤に触れた", en: "A nameless memory touched the keys.", centered: false),
    LyricCue(startBar: 12.0, endBar: 15.8, jp: "凍てつく星屑よ　どうかまだ消えないで", en: "Frozen stardust — please do not fade away yet.", centered: false),

    // Act II: Awakening
    LyricCue(startBar: 16.2, endBar: 19.8, jp: "脈打つ回路に　蒼い光が走る", en: "Azure light courses through awakening circuits,", centered: false),
    LyricCue(startBar: 20.0, endBar: 23.8, jp: "七つの鼓動が　眠りから世界を解く", en: "Sevenfold pulses unbind the world from sleep.", centered: false),
    LyricCue(startBar: 24.0, endBar: 27.8, jp: "砕け散る鏡の向こう側へ", en: "Beyond the shattering mirror sky,", centered: false),
    LyricCue(startBar: 28.0, endBar: 31.8, jp: "まだ見ぬ明日を　今、呼び覚ませ", en: "Awaken the unseen tomorrow — right now.", centered: false),

    // Act III: Event Horizon
    LyricCue(startBar: 32.0, endBar: 35.6, jp: "事象の地平線が　軋みだす", en: "The event horizon begins to fracture —", centered: false),
    LyricCue(startBar: 35.8, endBar: 38.8, jp: "すべての重力を　振り切って", en: "Breaking free of every gravity —", centered: false),
    LyricCue(startBar: 39.02, endBar: 39.92, jp: "——咲け。", en: "— Bloom.", centered: true),

    // Act IV: DROP I — Hypernova Artcore
    LyricCue(startBar: 40.1, endBar: 43.8, jp: "超新星の風を纏い　光の軌道へ翔け上がれ", en: "Clothed in supernova winds, soar into orbits of light!", centered: false),
    LyricCue(startBar: 44.0, endBar: 47.8, jp: "零度の心に咲いた　ただひとつの永遠", en: "A single eternity blooming within a sub-zero heart,", centered: false),
    LyricCue(startBar: 48.0, endBar: 51.8, jp: "幾千の夜を越えて　響け、硝子のアリア", en: "Across a thousand nights — resound, O Aria of Glass!", centered: false),
    LyricCue(startBar: 52.0, endBar: 55.8, jp: "孤独さえも　虹色の翼に変えて", en: "Turning even solitude into prismatic wings.", centered: false),

    // Act V: Digital Tears / Interlude
    LyricCue(startBar: 56.2, endBar: 59.8, jp: "水鏡に落ちた　ひとしずくの祈り", en: "A single drop of prayer fallen upon the mirror sea,", centered: false),
    LyricCue(startBar: 60.0, endBar: 63.8, jp: "機械の胸にも　こんなにも温かい涙", en: "Even within a mechanical chest, tears this warm can rise.", centered: false),
    LyricCue(startBar: 64.0, endBar: 67.8, jp: "ほら、夜明けの調（しらべ）が　空を塗り替えてゆく", en: "Look — the harmony of dawn is repainting the heavens,", centered: false),
    LyricCue(startBar: 68.0, endBar: 71.8, jp: "限界のその先へ——光の果てへ！", en: "Beyond every limit — to the farthest horizon of light!", centered: false),

    // Act VI: DROP II CLIMAX (+3 Key Change!)
    LyricCue(startBar: 72.1, endBar: 75.8, jp: "咲き誇れ　世界樹の詩（うた）よ　星々の果てまで！", en: "Bloom in full glory, O Song of the World-Tree, to the ends of the stars!", centered: false),
    LyricCue(startBar: 76.0, endBar: 79.8, jp: "暗闇を知るからこそ　光はこんなにも眩しい", en: "Because we knew the darkness, the light shines this blindingly bright!", centered: false),
    LyricCue(startBar: 80.0, endBar: 83.8, jp: "黄金の風と桜の結晶が　宙（そら）を満たして", en: "Golden winds and crystal cherry-blossoms fill the cosmos,", centered: false),
    LyricCue(startBar: 84.0, endBar: 87.8, jp: "すべての音が今　ひとつの奇跡になる", en: "Every single note converges now into one miracle —", centered: false),
    LyricCue(startBar: 88.0, endBar: 91.8, jp: "さよなら、凍えた昨日　こんにちは、永遠の朝", en: "Farewell, frozen yesterday — hello, eternal morning!", centered: false),

    // Act VII: Coda
    LyricCue(startBar: 92.3, endBar: 97.2, jp: "光の果てで　花は静かに微笑む", en: "Beyond the horizon of light, the flower quietly smiles.", centered: false)
]

let ACT_TITLES: [Int32: (String, Float, Float)] = [
    1: ("ACT I   //   GENESIS — 零度の記憶", 0.3, 3.8),
    2: ("ACT II  //   AWAKENING — 脈動する回路", 16.0, 19.2),
    3: ("ACT III //   EVENT HORIZON — 事象の地平線", 32.0, 35.0),
    4: ("ACT IV  //   HYPERNOVA — 超新星・開花", 40.0, 43.2),
    5: ("ACT V   //   DIGITAL TEARS — 硝子の祈り", 56.0, 59.2),
    6: ("ACT VI  //   TRANSCENDENCE — 臨界突破・光の果て", 72.0, 75.2),
    7: ("ACT VII //   ETERNAL DAWN — 永遠の余韻", 92.0, 95.5)
]

func loadTexturePNG(device: MTLDevice, path: String) throws -> MTLTexture {
    let url = URL(fileURLWithPath: path)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cgImg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        throw NSError(domain: "MVRenderer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to load \(path)"])
    }
    let w = cgImg.width
    let h = cgImg.height
    var raw = [UInt8](repeating: 0, count: w * h * 4)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: &raw,
        width: w,
        height: h,
        bitsPerComponent: 8,
        bytesPerRow: w * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw NSError(domain: "MVRenderer", code: 2, userInfo: [NSLocalizedDescriptionKey: "CGContext failed"])
    }
    ctx.draw(cgImg, in: CGRect(x: 0, y: 0, width: w, height: h))

    let desc = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba8Unorm, width: w, height: h, mipmapped: false)
    desc.usage = [.shaderRead]
    guard let tex = device.makeTexture(descriptor: desc) else {
        throw NSError(domain: "MVRenderer", code: 3, userInfo: [NSLocalizedDescriptionKey: "makeTexture failed"])
    }
    tex.replace(region: MTLRegionMake2D(0, 0, w, h), mipmapLevel: 0, withBytes: raw, bytesPerRow: w * 4)
    return tex
}

final class TypographyOverlayEngine {
    let width: Int
    let height: Int
    var pixels: [UInt8]
    let ctx: CGContext

    let fontTitleEn: CTFont
    let fontTitleJp: CTFont
    let fontSubCap: CTFont
    let fontLyricJp: CTFont
    let fontLyricJpHero: CTFont
    let fontLyricEn: CTFont
    let fontHud: CTFont

    init(width: Int, height: Int) {
        self.width = width
        self.height = height
        self.pixels = [UInt8](repeating: 0, count: width * height * 4)
        let cs = CGColorSpaceCreateDeviceRGB()
        self.ctx = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: cs,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )!

        self.fontTitleEn     = CTFontCreateWithName("Optima-Regular" as CFString, 64.0, nil)
        self.fontTitleJp     = CTFontCreateWithName("ToppanBunkyuMidashiMincho-StdN-EB" as CFString, 29.0, nil)
        self.fontSubCap      = CTFontCreateWithName("AvenirNext-Medium" as CFString, 14.5, nil)
        self.fontLyricJp     = CTFontCreateWithName("ToppanBunkyuMidashiMincho-StdN-EB" as CFString, 31.0, nil)
        self.fontLyricJpHero = CTFontCreateWithName("ToppanBunkyuMidashiMincho-StdN-EB" as CFString, 56.0, nil)
        self.fontLyricEn     = CTFontCreateWithName("Optima-Italic" as CFString, 18.0, nil)
        self.fontHud         = CTFontCreateWithName("Menlo-Regular" as CFString, 12.5, nil)
    }

    private func drawCenteredText(_ text: String, font: CTFont, y: CGFloat,
                                  color: CGColor, tracking: CGFloat = 0.0,
                                  glowColor: CGColor? = nil, glowBlur: CGFloat = 12.0) {
        let attrs: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(kCTFontAttributeName as String): font,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
            NSAttributedString.Key(kCTKernAttributeName as String): NSNumber(value: Double(tracking))
        ]
        let attrStr = NSAttributedString(string: text, attributes: attrs)
        let line = CTLineCreateWithAttributedString(attrStr)
        var ascent: CGFloat = 0, descent: CGFloat = 0, leading: CGFloat = 0
        let lineW = CGFloat(CTLineGetTypographicBounds(line, &ascent, &descent, &leading))
        let x = (CGFloat(width) - lineW) * 0.5

        ctx.saveGState()
        // Crisp dark legibility shadow first
        ctx.setShadow(offset: CGSize(width: 0, height: -2.0), blur: 7.0,
                      color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.85))
        ctx.textPosition = CGPoint(x: x, y: y)
        CTLineDraw(line, ctx)

        if let gc = glowColor {
            ctx.setShadow(offset: .zero, blur: glowBlur, color: gc)
            ctx.textPosition = CGPoint(x: x, y: y)
            CTLineDraw(line, ctx)
        }
        ctx.restoreGState()
    }

    private func drawLeftText(_ text: String, font: CTFont, x: CGFloat, y: CGFloat,
                              color: CGColor, tracking: CGFloat = 1.5) {
        let attrs: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(kCTFontAttributeName as String): font,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
            NSAttributedString.Key(kCTKernAttributeName as String): NSNumber(value: Double(tracking))
        ]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attrs))
        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: -1.5), blur: 5.0,
                      color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.75))
        ctx.textPosition = CGPoint(x: x, y: y)
        CTLineDraw(line, ctx)
        ctx.restoreGState()
    }

    func renderOverlay(tf: FrameTelemetry, into tex: MTLTexture) {
        ctx.clear(CGRect(x: 0, y: 0, width: width, height: height))

        let bar = tf.bar_pos

        // 1. Opening Cinema Title Card (Bars 0.35 .. 3.85)
        if bar >= 0.35 && bar <= 3.85 {
            let fadeIn = min(1.0, max(0.0, (bar - 0.35) / 0.65))
            let fadeOut = min(1.0, max(0.0, (3.85 - bar) / 0.65))
            let a = CGFloat(fadeIn * fadeOut)
            let trackDrift = CGFloat(4.0 + (bar - 0.35) * 1.4)

            drawCenteredText("ANTIGRAVITY  ORIGINAL  SYMPHONIC  ARTCORE  MV",
                             font: fontSubCap, y: 655,
                             color: CGColor(red: 0.72, green: 0.90, blue: 1.0, alpha: a * 0.82),
                             tracking: 5.5)
            drawCenteredText("SINGULARITY BLOOM",
                             font: fontTitleEn, y: 575,
                             color: CGColor(red: 0.98, green: 0.99, blue: 1.0, alpha: a),
                             tracking: trackDrift,
                             glowColor: CGColor(red: 0.35, green: 0.85, blue: 1.0, alpha: a * 0.75),
                             glowBlur: 18.0)
            drawCenteredText("― 零度の花、光の果て ―",
                             font: fontTitleJp, y: 522,
                             color: CGColor(red: 0.92, green: 0.96, blue: 1.0, alpha: a * 0.94),
                             tracking: 4.5,
                             glowColor: CGColor(red: 0.3, green: 0.75, blue: 1.0, alpha: a * 0.55),
                             glowBlur: 12.0)
        }

        // 2. Act Chapter Header + Subtle Audio-Cinema Telemetry HUD
        let letterboxPx = CGFloat(132.0 * (1.0 - min(1.0, max(0.0, tf.aspect_open))))
        let topY = CGFloat(height) - max(48.0, letterboxPx - 36.0)

        if let (chapTitle, sBar, eBar) = ACT_TITLES[tf.act_id], bar >= sBar && bar <= eBar {
            let fi = min(1.0, max(0.0, (bar - sBar) / 0.35))
            let fo = min(1.0, max(0.0, (eBar - bar) / 0.55))
            let a = CGFloat(fi * fo) * 0.88
            drawLeftText(chapTitle, font: fontSubCap, x: 76, y: topY,
                         color: CGColor(red: 0.85, green: 0.95, blue: 1.0, alpha: a), tracking: 2.8)
        }

        // Subtle right-hand HUD during rhythmic acts (Acts II..VI, hidden during silence & intro/outro)
        if bar >= 16.0 && bar < 92.0 && tf.shot_id != 32 {
            let keyLabel = (bar >= 72.0) ? "Am / Fmaj9 (+3)" : ((bar >= 64.0) ? "MODULATING..." : "F#m / Dmaj9")
            let hudStr = String(format: "174.0 BPM  |  BAR %05.1f  |  %@", bar + 1.0, keyLabel)
            drawLeftText(hudStr, font: fontHud, x: CGFloat(width) - 430, y: topY,
                         color: CGColor(red: 0.78, green: 0.90, blue: 1.0, alpha: 0.34), tracking: 1.2)
        }

        // 3. Synchronized Bilingual Poetic Lyrics
        for cue in LYRICS {
            if bar >= cue.startBar && bar <= cue.endBar {
                let dur = cue.endBar - cue.startBar
                let fi = min(1.0, max(0.0, (bar - cue.startBar) / min(0.28, dur * 0.25)))
                let fo = min(1.0, max(0.0, (cue.endBar - bar) / min(0.32, dur * 0.28)))
                let alpha = CGFloat(fi * fo)
                let slideUp = CGFloat((1.0 - fi) * -10.0)

                let aura: CGColor = (tf.act_id >= 6)
                    ? CGColor(red: 1.0, green: 0.78, blue: 0.45, alpha: alpha * 0.65)
                    : ((tf.act_id == 4)
                        ? CGColor(red: 0.95, green: 0.38, blue: 0.88, alpha: alpha * 0.65)
                        : CGColor(red: 0.28, green: 0.82, blue: 1.0, alpha: alpha * 0.60))

                if cue.centered {
                    // Bar 39 Silence Hero Whisper: "——咲け。"
                    drawCenteredText(cue.jp, font: fontLyricJpHero, y: 548 + slideUp,
                                     color: CGColor(red: 1.0, green: 1.0, blue: 1.0, alpha: alpha),
                                     tracking: 8.0, glowColor: aura, glowBlur: 22.0)
                    drawCenteredText(cue.en, font: fontLyricEn, y: 496 + slideUp,
                                     color: CGColor(red: 0.85, green: 0.95, blue: 1.0, alpha: alpha * 0.88),
                                     tracking: 3.5)
                } else {
                    let baseSubY = max(68.0, letterboxPx + 34.0) + slideUp
                    drawCenteredText(cue.jp, font: fontLyricJp, y: baseSubY + 28.0,
                                     color: CGColor(red: 0.99, green: 0.99, blue: 1.0, alpha: alpha),
                                     tracking: 2.2, glowColor: aura, glowBlur: 14.0)
                    drawCenteredText(cue.en, font: fontLyricEn, y: baseSubY,
                                     color: CGColor(red: 0.86, green: 0.92, blue: 0.99, alpha: alpha * 0.86),
                                     tracking: 1.0)
                }
                break
            }
        }

        // 4. Finale End Title Card (Bars 98.2 .. 104.6)
        if bar >= 98.2 && bar <= 104.6 {
            let fi = min(1.0, max(0.0, (bar - 98.2) / 1.1))
            let fo = min(1.0, max(0.0, (104.6 - bar) / 1.4))
            let a = CGFloat(fi * fo)
            drawCenteredText("SINGULARITY BLOOM",
                             font: fontTitleEn, y: 585,
                             color: CGColor(red: 1.0, green: 0.98, blue: 0.94, alpha: a),
                             tracking: 7.0,
                             glowColor: CGColor(red: 1.0, green: 0.82, blue: 0.45, alpha: a * 0.72),
                             glowBlur: 20.0)
            drawCenteredText("零度の花、光の果て",
                             font: fontTitleJp, y: 530,
                             color: CGColor(red: 0.98, green: 0.95, blue: 0.92, alpha: a * 0.95),
                             tracking: 5.5)
            drawCenteredText("COMPOSED, SYNTHESIZED & DIRECTED BY ANTIGRAVITY",
                             font: fontSubCap, y: 478,
                             color: CGColor(red: 0.92, green: 0.88, blue: 0.82, alpha: a * 0.78),
                             tracking: 4.2)
        }

        tex.replace(region: MTLRegionMake2D(0, 0, width, height),
                    mipmapLevel: 0,
                    withBytes: pixels,
                    bytesPerRow: width * 4)
    }
}

// ============================================================================
// Main MV Render Driver (Supports --preview for instant still verification
// or full 8,760-frame 1080p 60fps FFmpeg H.264 + 320k AAC cinema encode!)
// ============================================================================
func runRenderer() throws {
    let args = CommandLine.arguments
    let previewOnly = args.contains("--preview")

    let width = 1920
    let height = 1080

    guard let device = MTLCreateSystemDefaultDevice(),
          let queue = device.makeCommandQueue() else {
        throw NSError(domain: "MVRenderer", code: 10, userInfo: [NSLocalizedDescriptionKey: "No Metal GPU device"])
    }
    print("[MVRenderer] Metal GPU: \(device.name)")

    let shaderSrc = try String(contentsOfFile: "src/shaders.metal", encoding: .utf8)
    let lib = try device.makeLibrary(source: shaderSrc, options: nil)
    let psoScene = try device.makeComputePipelineState(function: lib.makeFunction(name: "sceneKernel")!)
    let psoBloom = try device.makeComputePipelineState(function: lib.makeFunction(name: "bloomKernel")!)
    let psoComp  = try device.makeComputePipelineState(function: lib.makeFunction(name: "compositeKernel")!)

    // Load 5 Cinema Art Keyframe Plates
    let texAct1 = try loadTexturePNG(device: device, path: "assets/keyframes/act1_frozen_cathedral.png")
    let texAct2 = try loadTexturePNG(device: device, path: "assets/keyframes/act2_neural_awakening.png")
    let texAct4 = try loadTexturePNG(device: device, path: "assets/keyframes/act4_hypernova_flight.png")
    let texAct5 = try loadTexturePNG(device: device, path: "assets/keyframes/act5_twilight_sanctuary.png")
    let texAct6 = try loadTexturePNG(device: device, path: "assets/keyframes/act6_transcendence_tree.png")

    // Load Ground-Truth Telemetry
    let telData = try Data(contentsOf: URL(fileURLWithPath: "build/telemetry.bin"))
    let strideSize = MemoryLayout<FrameTelemetry>.stride
    let numFrames = telData.count / strideSize
    print("[MVRenderer] Loaded \(numFrames) frames of telemetry (\(strideSize) bytes/frame).")

    var frames = [FrameTelemetry]()
    frames.reserveCapacity(numFrames)
    telData.withUnsafeBytes { rawBuf in
        let ptr = rawBuf.bindMemory(to: FrameTelemetry.self)
        for i in 0..<numFrames {
            frames.append(ptr[i])
        }
    }

    // Precompute smooth shot_progress [0..1] for each continuous camera cut!
    var shotProgress = [Float](repeating: 0.0, count: numFrames)
    var segStart = 0
    while segStart < numFrames {
        let sId = frames[segStart].shot_id
        var segEnd = segStart + 1
        while segEnd < numFrames && frames[segEnd].shot_id == sId {
            segEnd += 1
        }
        let segLen = max(1, segEnd - segStart - 1)
        for k in segStart..<segEnd {
            shotProgress[k] = Float(k - segStart) / Float(segLen)
        }
        segStart = segEnd
    }

    // Allocate Intermediate & Output GPU Textures
    let hdrDesc = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba16Float, width: width, height: height, mipmapped: false)
    hdrDesc.storageMode = .private
    hdrDesc.usage = [.shaderWrite, .shaderRead]
    let hdrTex = device.makeTexture(descriptor: hdrDesc)!

    let bloomDesc = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba16Float, width: width / 2, height: height / 2, mipmapped: false)
    bloomDesc.storageMode = .private
    bloomDesc.usage = [.shaderWrite, .shaderRead]
    let bloomTex = device.makeTexture(descriptor: bloomDesc)!

    let textDesc = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba8Unorm, width: width, height: height, mipmapped: false)
    textDesc.storageMode = .shared
    textDesc.usage = [.shaderRead]
    let textTex = device.makeTexture(descriptor: textDesc)!

    let outDesc = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba8Unorm, width: width, height: height, mipmapped: false)
    outDesc.storageMode = .shared
    outDesc.usage = [.shaderWrite]
    let outTex0 = device.makeTexture(descriptor: outDesc)!
    let outTex1 = device.makeTexture(descriptor: outDesc)!
    let outTextures = [outTex0, outTex1]

    let typo = TypographyOverlayEngine(width: width, height: height)

    let tgSize = MTLSize(width: 16, height: 16, depth: 1)
    let fullGrid = MTLSize(width: (width + 15) / 16, height: (height + 15) / 16, depth: 1)
    let halfGrid = MTLSize(width: (width / 2 + 15) / 16, height: (height / 2 + 15) / 16, depth: 1)

    func renderSingleFrame(_ fIdx: Int, outTex: MTLTexture, updateText: Bool) -> MTLCommandBuffer {
        let tf = frames[fIdx]
        if updateText {
            typo.renderOverlay(tf: tf, into: textTex)
        }
        var u = GPUUniforms(
            time_sec: tf.time_sec,
            bar_pos: tf.bar_pos,
            beat_phase: tf.beat_phase,
            act_id: tf.act_id,
            shot_id: tf.shot_id,
            kick_env: tf.kick_env,
            snare_env: tf.snare_env,
            hat_env: tf.hat_env,
            sub_env: tf.sub_env,
            chord_env: tf.chord_env,
            piano_env: tf.piano_env,
            vocal_env: tf.vocal_env,
            lead_env: tf.lead_env,
            riser_env: tf.riser_env,
            glitch_trig: tf.glitch_trig,
            aspect_open: tf.aspect_open,
            key_mod: tf.key_mod,
            last_piano_pitch: tf.last_piano_pitch,
            last_lead_pitch: tf.last_lead_pitch,
            flash_white: tf.flash_white,
            shot_progress: shotProgress[fIdx],
            spectrum: tf.spectrum,
            piano_keys: tf.piano_keys
        )

        let cmd = queue.makeCommandBuffer()!

        // Pass 1: HDR Scene + 3D Raymarching + Parallax
        let enc1 = cmd.makeComputeCommandEncoder()!
        enc1.setComputePipelineState(psoScene)
        enc1.setTexture(hdrTex, index: 0)
        enc1.setTexture(texAct1, index: 1)
        enc1.setTexture(texAct2, index: 2)
        enc1.setTexture(texAct4, index: 3)
        enc1.setTexture(texAct5, index: 4)
        enc1.setTexture(texAct6, index: 5)
        enc1.setBytes(&u, length: MemoryLayout<GPUUniforms>.stride, index: 0)
        enc1.dispatchThreadgroups(fullGrid, threadsPerThreadgroup: tgSize)
        enc1.endEncoding()

        // Pass 2: Half-Res HDR Anamorphic + Radial Bloom
        let enc2 = cmd.makeComputeCommandEncoder()!
        enc2.setComputePipelineState(psoBloom)
        enc2.setTexture(hdrTex, index: 0)
        enc2.setTexture(bloomTex, index: 1)
        enc2.dispatchThreadgroups(halfGrid, threadsPerThreadgroup: tgSize)
        enc2.endEncoding()

        // Pass 3: ACES Tone Mapping + Chromatic Aberration + Letterbox + Typography
        let enc3 = cmd.makeComputeCommandEncoder()!
        enc3.setComputePipelineState(psoComp)
        enc3.setTexture(hdrTex, index: 0)
        enc3.setTexture(bloomTex, index: 1)
        enc3.setTexture(textTex, index: 2)
        enc3.setTexture(outTex, index: 3)
        enc3.setBytes(&u, length: MemoryLayout<GPUUniforms>.stride, index: 0)
        enc3.dispatchThreadgroups(fullGrid, threadsPerThreadgroup: tgSize)
        enc3.endEncoding()

        cmd.commit()
        return cmd
    }

    var frameBytes = [UInt8](repeating: 0, count: width * height * 4)

    if previewOnly {
        // Render 8 representative hero frames across all 7 acts & 3D shader shots to PNG for visual QA!
        let sampleFrames: [(String, Int)] = [
            ("01_title_cathedral",  150),  // ~2.5s: Opening Title + Frozen Cathedral
            ("02_cyber_tunnel_3d",  1800), // ~30.0s: 3D Raymarched Cyber-Astrolabe Tunnel + Lyrics
            ("03_singularity_3d",   2850), // ~47.5s: 3D Relativistic Black Hole Vortex
            ("04_silence_bloom",    3265), // ~54.4s: Bar 39 "——咲け。" Crystal Tear Silence!
            ("05_drop1_hypernova",  3480), // ~58.0s: DROP I Full 16:9 IMAX Hypernova Flight!
            ("06_split_montage",    3930), // ~65.5s: 3-Panel Diagonal Breakbeat Montage!
            ("07_twilight_tears",   4860), // ~81.0s: Act V Mirror Sea & Aurora Counterpoint Ribbons
            ("08_climax_worldtree", 6180)  // ~103.0s: DROP II Key-Change World-Tree Climax!
        ]
        let cs = CGColorSpaceCreateDeviceRGB()
        for (name, idx) in sampleFrames where idx < numFrames {
            let cmd = renderSingleFrame(idx, outTex: outTex0, updateText: true)
            cmd.waitUntilCompleted()
            outTex0.getBytes(&frameBytes, bytesPerRow: width * 4, from: MTLRegionMake2D(0, 0, width, height), mipmapLevel: 0)
            if let ctx = CGContext(data: &frameBytes, width: width, height: height, bitsPerComponent: 8,
                                   bytesPerRow: width * 4, space: cs,
                                   bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue),
               let img = ctx.makeImage() {
                let outURL = URL(fileURLWithPath: "frames_preview/\(name).png") as CFURL
                if let dest = CGImageDestinationCreateWithURL(outURL, "public.png" as CFString, 1, nil) {
                    CGImageDestinationAddImage(dest, img, nil)
                    CGImageDestinationFinalize(dest)
                }
            }
            print("[MVRenderer] Saved preview frames_preview/\(name).png (frame \(idx))")
        }
        return
    }

    // Full 8,760-Frame 1080p 60fps Cinema Encode via FFmpeg Pipe!
    let ffProc = Process()
    ffProc.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/ffmpeg")
    ffProc.arguments = [
        "-y", "-hide_banner", "-loglevel", "warning",
        "-f", "rawvideo",
        "-pix_fmt", "rgba",
        "-s", "\(width)x\(height)",
        "-r", "60",
        "-i", "pipe:0",
        "-i", "singularity_bloom_master.wav",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "16",
        "-profile:v", "high",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "320k",
        "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        "singularity_bloom_mv.mp4"
    ]

    let pipe = Pipe()
    ffProc.standardInput = pipe
    try ffProc.run()
    let writeHandle = pipe.fileHandleForWriting

    let t0 = Date()
    var prevCmd: MTLCommandBuffer? = nil

    for f in 0..<numFrames {
        let curSlot = f & 1
        // Update typography at 30fps (every 2 frames) or whenever flash/cut occurs—indistinguishable & ultra-fast!
        let needText = (f == 0) || ((f & 1) == 0) || (frames[f].shot_id != frames[max(0, f - 1)].shot_id)

        // Wait for the PREVIOUS frame's GPU buffer before writing it while overlapping GPU/CPU/FFmpeg!
        if let pc = prevCmd {
            pc.waitUntilCompleted()
            let prevTex = outTextures[1 - curSlot]
            prevTex.getBytes(&frameBytes, bytesPerRow: width * 4, from: MTLRegionMake2D(0, 0, width, height), mipmapLevel: 0)
            try writeHandle.write(contentsOf: frameBytes)
        }

        prevCmd = renderSingleFrame(f, outTex: outTextures[curSlot], updateText: needText)

        if (f + 1) % 1200 == 0 || f == numFrames - 1 {
            let elapsed = Date().timeIntervalSince(t0)
            let fpsRate = Double(f + 1) / max(0.01, elapsed)
            print(String(format: "[MVRenderer] Rendered %d / %d frames (%.1f fps)", f + 1, numFrames, fpsRate))
        }
    }

    if let pc = prevCmd {
        pc.waitUntilCompleted()
        let lastTex = outTextures[(numFrames - 1) & 1]
        lastTex.getBytes(&frameBytes, bytesPerRow: width * 4, from: MTLRegionMake2D(0, 0, width, height), mipmapLevel: 0)
        try writeHandle.write(contentsOf: frameBytes)
    }

    try writeHandle.close()
    ffProc.waitUntilExit()
    if ffProc.terminationStatus != 0 {
        throw NSError(domain: "MVRenderer", code: Int(ffProc.terminationStatus), userInfo: [NSLocalizedDescriptionKey: "FFmpeg exited with error"])
    }
    let totalTime = Date().timeIntervalSince(t0)
    print(String(format: "[MVRenderer] SUCCESS! Encoded singularity_bloom_mv.mp4 in %.2f seconds.", totalTime))
}

do {
    try runRenderer()
} catch {
    fputs("FATAL: \(error)\n", stderr)
    exit(1)
}
