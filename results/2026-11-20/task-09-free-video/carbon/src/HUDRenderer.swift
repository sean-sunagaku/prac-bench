import Foundation
import CoreGraphics
import CoreText
import AppKit
import Metal

public final class HUDRenderer {
    private let width: Int
    private let height: Int
    private let bytesPerRow: Int
    private let rawBuffer: UnsafeMutableRawPointer
    private let context: CGContext
    public let texture: MTLTexture

    // Cached CoreText fonts
    private let fontJPMinchoHero: CTFont
    private let fontJPMinchoFinal: CTFont
    private let fontJPSansChapter: CTFont
    private let fontJPSansSmall: CTFont
    private let fontENHeroSub: CTFont
    private let fontENChapter: CTFont
    private let fontMonoSmall: CTFont
    private let fontMonoTiny: CTFont

    public init(device: MTLDevice, width: Int, height: Int) {
        self.width = width
        self.height = height
        self.bytesPerRow = width * 4

        let pageSize = Int(getpagesize())
        let byteCount = ((bytesPerRow * height + pageSize - 1) / pageSize) * pageSize
        var ptr: UnsafeMutableRawPointer? = nil
        let res = posix_memalign(&ptr, pageSize, byteCount)
        precondition(res == 0 && ptr != nil, "Failed to allocate page-aligned HUD buffer")
        self.rawBuffer = ptr!
        memset(self.rawBuffer, 0, byteCount)

        let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
        let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue // BGRA8
        self.context = CGContext(
            data: self.rawBuffer,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: bitmapInfo
        )!
        self.context.setAllowsAntialiasing(true)
        self.context.setShouldAntialias(true)
        self.context.setAllowsFontSmoothing(true)
        self.context.setShouldSmoothFonts(true)

        let desc = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .bgra8Unorm,
            width: width,
            height: height,
            mipmapped: false
        )
        desc.usage = [.shaderRead]
        desc.storageMode = .shared
        self.texture = device.makeTexture(descriptor: desc)!

        self.fontJPMinchoHero = CTFontCreateWithName("HiraMinProN-W6" as CFString, 58.0, nil)
        self.fontJPMinchoFinal = CTFontCreateWithName("HiraMinProN-W6" as CFString, 50.0, nil)
        self.fontJPSansChapter = CTFontCreateWithName("HiraginoSans-W6" as CFString, 30.0, nil)
        self.fontJPSansSmall = CTFontCreateWithName("HiraginoSans-W3" as CFString, 15.0, nil)
        self.fontENHeroSub = CTFontCreateWithName("AvenirNext-Medium" as CFString, 18.0, nil)
        self.fontENChapter = CTFontCreateWithName("AvenirNext-DemiBold" as CFString, 14.0, nil)
        self.fontMonoSmall = CTFontCreateWithName("Menlo-Regular" as CFString, 13.0, nil)
        self.fontMonoTiny = CTFontCreateWithName("Menlo-Regular" as CFString, 11.5, nil)
    }

    deinit {
        free(rawBuffer)
    }

    @inline(__always)
    private func easeOutQuart(_ x: CGFloat) -> CGFloat {
        let t = min(max(x, 0), 1)
        let inv = 1.0 - t
        return 1.0 - inv * inv * inv * inv
    }

    @inline(__always)
    private func smoothWindow(_ t: CGFloat, inStart: CGFloat, inEnd: CGFloat, outStart: CGFloat, outEnd: CGFloat) -> CGFloat {
        if t <= inStart || t >= outEnd { return 0 }
        if t < inEnd {
            return easeOutQuart((t - inStart) / max(0.001, inEnd - inStart))
        }
        if t > outStart {
            return 1.0 - easeOutQuart((t - outStart) / max(0.001, outEnd - outStart))
        }
        return 1.0
    }

    private func drawText(
        _ string: String,
        font: CTFont,
        color: CGColor,
        x: CGFloat,
        yBottom: CGFloat,
        kern: CGFloat = 0.0,
        centered: Bool = false
    ) -> CGFloat {
        let attrs: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(kCTFontAttributeName as String): font,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
            NSAttributedString.Key.kern: kern
        ]
        let attrStr = NSAttributedString(string: string, attributes: attrs)
        let line = CTLineCreateWithAttributedString(attrStr)
        let bounds = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
        let typoWidth = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
        let drawX = centered ? (x - typoWidth * 0.5) : x

        context.saveGState()
        context.textMatrix = .identity
        context.textPosition = CGPoint(x: drawX, y: yBottom)
        CTLineDraw(line, context)
        context.restoreGState()
        let _ = bounds
        return typoWidth
    }

    private func drawSoftScrim(centerX: CGFloat, centerY: CGFloat, radiusX: CGFloat, radiusY: CGFloat, maxAlpha: CGFloat) {
        guard maxAlpha > 0.005 else { return }
        let cs = CGColorSpace(name: CGColorSpace.sRGB)!
        let colors = [
            CGColor(srgbRed: 0.01, green: 0.015, blue: 0.03, alpha: maxAlpha),
            CGColor(srgbRed: 0.01, green: 0.015, blue: 0.03, alpha: maxAlpha * 0.45),
            CGColor(srgbRed: 0.01, green: 0.015, blue: 0.03, alpha: 0.0)
        ] as CFArray
        let locs: [CGFloat] = [0.0, 0.52, 1.0]
        guard let grad = CGGradient(colorsSpace: cs, colors: colors, locations: locs) else { return }

        context.saveGState()
        context.translateBy(x: centerX, y: centerY)
        context.scaleBy(x: radiusX, y: radiusY)
        context.drawRadialGradient(
            grad,
            startCenter: .zero,
            startRadius: 0,
            endCenter: .zero,
            endRadius: 1.0,
            options: []
        )
        context.restoreGState()
    }

    public func renderFrame(frameIndex: Int, uniforms: GPUUniforms, audio: AudioFrameTelemetry) {
        // Clear canvas (CGContext origin is bottom-left: y=0 bottom, y=1080 top)
        context.clear(CGRect(x: 0, y: 0, width: width, height: height))

        let t = CGFloat(uniforms.uTime.x)
        let act = Int(uniforms.uAct.x + 0.5)
        let actTime = t - CGFloat(act) * 8.0

        // Global HUD visibility envelope (fades cleanly in at start and out before 47.2s)
        let hudGlobalAlpha = smoothWindow(t, inStart: 0.35, inEnd: 1.2, outStart: 45.8, outEnd: 47.1)
        guard hudGlobalAlpha > 0.004 else {
            uploadToTexture()
            return
        }

        let ivory = { (a: CGFloat) in CGColor(srgbRed: 0.965, green: 0.976, blue: 0.992, alpha: a * hudGlobalAlpha) }
        let gold  = { (a: CGFloat) in CGColor(srgbRed: 0.925, green: 0.785, blue: 0.505, alpha: a * hudGlobalAlpha) }
        let cyan  = { (a: CGFloat) in CGColor(srgbRed: 0.480, green: 0.780, blue: 0.985, alpha: a * hudGlobalAlpha) }
        let muted = { (a: CGFloat) in CGColor(srgbRed: 0.680, green: 0.740, blue: 0.835, alpha: a * hudGlobalAlpha) }

        // --------------------------------------------------------------------
        // 1. ULTRA-MINIMAL TOP TELEMETRY BAR (y ~ 1018)
        // --------------------------------------------------------------------
        let topBarAlpha: CGFloat = (act == 5 && actTime > 1.0) ? max(0.0, 1.0 - (actTime - 1.0) / 1.5) : 0.78
        if topBarAlpha > 0.01 {
            let marginX: CGFloat = 88.0
            let topY: CGFloat = 1014.0

            // Precision corner hairlines
            context.setStrokeColor(ivory(0.22 * topBarAlpha))
            context.setLineWidth(1.0)
            // Top-left bracket
            context.move(to: CGPoint(x: marginX - 18, y: topY - 10))
            context.addLine(to: CGPoint(x: marginX - 18, y: topY + 18))
            context.addLine(to: CGPoint(x: marginX + 10, y: topY + 18))
            // Top-right bracket
            context.move(to: CGPoint(x: CGFloat(width) - marginX + 18, y: topY - 10))
            context.addLine(to: CGPoint(x: CGFloat(width) - marginX + 18, y: topY + 18))
            context.addLine(to: CGPoint(x: CGFloat(width) - marginX - 10, y: topY + 18))
            context.strokePath()

            // Pulsing live indicator dot
            let pulseDot = 0.45 + 0.55 * CGFloat(uniforms.uAudio.x)
            context.setFillColor(gold(pulseDot * topBarAlpha))
            context.fillEllipse(in: CGRect(x: marginX, y: topY + 2, width: 6, height: 6))

            _ = drawText(
                "SINGULARITY // METAL GPU COMPUTE  •  1920×1080P60",
                font: fontMonoTiny,
                color: muted(0.85 * topBarAlpha),
                x: marginX + 16,
                yBottom: topY,
                kern: 1.8
            )

            // Right-aligned SMPTE timecode + Act indicator
            let sec = Int(t)
            let ff = frameIndex % Config.fps
            let actRoman = ["I", "II", "III", "IV", "V", "VI"][min(max(act, 0), 5)]
            let tcStr = String(format: "ACT %-3@  •  120.0 BPM  •  00:00:%02d:%02d", actRoman as NSString, sec, ff)
            let tcAttrs: [NSAttributedString.Key: Any] = [
                NSAttributedString.Key(kCTFontAttributeName as String): fontMonoTiny,
                NSAttributedString.Key.kern: 1.6
            ]
            let tcLine = CTLineCreateWithAttributedString(NSAttributedString(string: tcStr, attributes: tcAttrs))
            let tcW = CGFloat(CTLineGetTypographicBounds(tcLine, nil, nil, nil))
            _ = drawText(
                tcStr,
                font: fontMonoTiny,
                color: muted(0.85 * topBarAlpha),
                x: CGFloat(width) - marginX - tcW,
                yBottom: topY,
                kern: 1.6
            )
        }

        // --------------------------------------------------------------------
        // 2. BOTTOM-RIGHT LIVE 32-BAND AUDIO SPECTRUM RAIL (Acts I..V)
        // --------------------------------------------------------------------
        if topBarAlpha > 0.02 {
            let specRightX = CGFloat(width) - 88.0
            let barCount = 32
            let barW: CGFloat = 4.0
            let gap: CGFloat = 2.5
            let totalSpecW = CGFloat(barCount) * barW + CGFloat(barCount - 1) * gap
            let specStartX = specRightX - totalSpecW
            let baseY: CGFloat = 68.0
            let maxBarH: CGFloat = 34.0

            // Subtle dark backing pill for clean readability
            drawSoftScrim(centerX: specStartX + totalSpecW * 0.5, centerY: baseY + 18, radiusX: totalSpecW * 0.85, radiusY: 56, maxAlpha: 0.68 * topBarAlpha)

            _ = drawText(
                "HARMONIC SPECTRUM // 48KHZ DSP",
                font: fontMonoTiny,
                color: muted(0.62 * topBarAlpha),
                x: specStartX,
                yBottom: baseY + maxBarH + 8,
                kern: 1.4
            )

            for b in 0..<barCount {
                let val = CGFloat(min(max(audio.spectrum[b], 0.03), 1.0))
                let h = max(2.0, val * maxBarH)
                let bx = specStartX + CGFloat(b) * (barW + gap)
                let isHighlight = (val > 0.58)
                context.setFillColor(isHighlight ? gold(0.90 * topBarAlpha) : cyan((0.38 + 0.52 * val) * topBarAlpha))
                context.fill(CGRect(x: bx, y: baseY, width: barW, height: h))
            }
        }

        // --------------------------------------------------------------------
        // 3. ACT I OPENING CINEMA TITLE CARD (t = 1.1s .. 6.8s)
        // Positioned in upper-center / lower-third negative space cleanly!
        // --------------------------------------------------------------------
        if act == 0 {
            let titleAlpha = smoothWindow(actTime, inStart: 1.05, inEnd: 2.15, outStart: 5.85, outEnd: 6.95)
            if titleAlpha > 0.005 {
                let riseOffset = (1.0 - titleAlpha) * 14.0
                let centerY: CGFloat = 172.0 + riseOffset
                drawSoftScrim(centerX: CGFloat(width) * 0.5, centerY: centerY + 18, radiusX: 490, radiusY: 115, maxAlpha: 0.56 * titleAlpha)

                // Expanding horizontal gold accent line
                let halfLineW = 190.0 * titleAlpha
                context.setStrokeColor(gold(0.62 * titleAlpha))
                context.setLineWidth(1.2)
                context.move(to: CGPoint(x: CGFloat(width) * 0.5 - halfLineW, y: centerY + 68))
                context.addLine(to: CGPoint(x: CGFloat(width) * 0.5 + halfLineW, y: centerY + 68))
                context.strokePath()

                _ = drawText(
                    "創世の幾何学",
                    font: fontJPMinchoHero,
                    color: ivory(0.96 * titleAlpha),
                    x: CGFloat(width) * 0.5,
                    yBottom: centerY + 4,
                    kern: 8.5 + (1.0 - titleAlpha) * 6.0,
                    centered: true
                )

                _ = drawText(
                    "THE GEOMETRY OF GENESIS  —  FROM PURE CODE TO COSMOS",
                    font: fontENHeroSub,
                    color: gold(0.90 * titleAlpha),
                    x: CGFloat(width) * 0.5,
                    yBottom: centerY - 28,
                    kern: 4.8,
                    centered: true
                )
            }
        }

        // --------------------------------------------------------------------
        // 4. LOWER-LEFT CHAPTER & LIVE EQUATION CARDS (Acts II, III, IV, V)
        // Leaves center 75% completely clear for the 3D spectacle!
        // --------------------------------------------------------------------
        if act >= 1 && act <= 4 {
            let cardAlpha = smoothWindow(actTime, inStart: 0.45, inEnd: 1.25, outStart: 6.55, outEnd: 7.45)
            if cardAlpha > 0.005 {
                let slideX: CGFloat = 88.0 - (1.0 - cardAlpha) * 18.0
                let baseY: CGFloat = 68.0

                drawSoftScrim(centerX: slideX + 230, centerY: baseY + 44, radiusX: 390, radiusY: 112, maxAlpha: 0.78 * cardAlpha)

                let (tagEN, titleJP, eqLine): (String, String, String) = {
                    switch act {
                    case 1:
                        let morphPct = Int(min(max(uniforms.uAct.y, 0), 1) * 100.0)
                        return (
                            "02 // CHAOTIC DYNAMICS & STRANGE ATTRACTORS",
                            "カオスから生まれる秩序",
                            String(format: "N = 262,144 GPU PARTICLES  •  dx/dt = σ(y − x)  •  MORPH %02d%%", morphPct)
                        )
                    case 2:
                        let zPos = abs(uniforms.uCamPos.z)
                        return (
                            "03 // PROCEDURAL FRACTAL ARCHITECTURE",
                            "無限回帰の建築美",
                            String(format: "MANDELBOX IFS (9 ITER)  •  MULTI-TAP AO + VOLUMETRIC GI  •  Z = %.1fm", zPos)
                        )
                    case 3:
                        return (
                            "04 // OPTICAL REFRACTION & SYNAPTIC TOPOLOGY",
                            "思考する光のネットワーク",
                            "CAUCHY DISPERSION n(λ) = 1.47..1.59  •  RGB SNELL REFRACTION"
                        )
                    default:
                        return (
                            "05 // CURVED SPACETIME & GRAVITATIONAL LENSING",
                            "事象の地平線を超えて",
                            "d²x/dλ² = −(3/2) r_s h² x / r⁵  •  RELATIVISTIC DOPPLER BEAMING"
                        )
                    }
                }()

                // Vertical gold accent bar
                context.setFillColor(gold(0.88 * cardAlpha))
                context.fill(CGRect(x: slideX, y: baseY, width: 3.0, height: 84.0 * cardAlpha))

                _ = drawText(
                    tagEN,
                    font: fontENChapter,
                    color: gold(0.92 * cardAlpha),
                    x: slideX + 16,
                    yBottom: baseY + 68,
                    kern: 2.4
                )

                _ = drawText(
                    titleJP,
                    font: fontJPSansChapter,
                    color: ivory(0.96 * cardAlpha),
                    x: slideX + 16,
                    yBottom: baseY + 28,
                    kern: 2.2
                )

                _ = drawText(
                    eqLine,
                    font: fontMonoSmall,
                    color: cyan(0.82 * cardAlpha),
                    x: slideX + 16,
                    yBottom: baseY + 2,
                    kern: 1.0
                )
            }
        }

        // --------------------------------------------------------------------
        // 5. ACT VI FINALE MANIFESTO CARD (t = 41.2s .. 46.8s)
        // --------------------------------------------------------------------
        if act == 5 {
            let finAlpha = smoothWindow(actTime, inStart: 1.15, inEnd: 2.35, outStart: 5.55, outEnd: 6.95)
            if finAlpha > 0.005 {
                let centerY: CGFloat = 188.0 + (1.0 - finAlpha) * 10.0
                drawSoftScrim(centerX: CGFloat(width) * 0.5, centerY: centerY + 12, radiusX: 580, radiusY: 135, maxAlpha: 0.64 * finAlpha)

                // Delicate diamond + hairline ornament above closing statement
                let cx = CGFloat(width) * 0.5
                let ornY = centerY + 72.0
                context.setStrokeColor(gold(0.68 * finAlpha))
                context.setLineWidth(1.1)
                context.move(to: CGPoint(x: cx - 160 * finAlpha, y: ornY))
                context.addLine(to: CGPoint(x: cx - 12, y: ornY))
                context.move(to: CGPoint(x: cx + 12, y: ornY))
                context.addLine(to: CGPoint(x: cx + 160 * finAlpha, y: ornY))
                context.strokePath()

                context.saveGState()
                context.translateBy(x: cx, y: ornY)
                context.rotate(by: .pi * 0.25)
                context.setFillColor(gold(0.90 * finAlpha))
                context.fill(CGRect(x: -3.5, y: -3.5, width: 7.0, height: 7.0))
                context.restoreGState()

                _ = drawText(
                    "すべては、コードから生まれた。",
                    font: fontJPMinchoFinal,
                    color: ivory(0.98 * finAlpha),
                    x: cx,
                    yBottom: centerY + 10,
                    kern: 5.5,
                    centered: true
                )

                _ = drawText(
                    "EVERY PHOTON.  EVERY PARTICLE.  EVERY NOTE.  PURE CODE.",
                    font: fontENHeroSub,
                    color: gold(0.92 * finAlpha),
                    x: cx,
                    yBottom: centerY - 24,
                    kern: 4.5,
                    centered: true
                )

                _ = drawText(
                    "METAL GPU RAYMARCHING  •  262,144 PARTICLES  •  PROCEDURAL 48KHZ SYNTHESIS  •  1080P60",
                    font: fontMonoTiny,
                    color: muted(0.75 * finAlpha),
                    x: cx,
                    yBottom: centerY - 52,
                    kern: 2.0,
                    centered: true
                )
            }
        }

        uploadToTexture()
    }

    private func uploadToTexture() {
        let region = MTLRegionMake2D(0, 0, width, height)
        texture.replace(region: region, mipmapLevel: 0, withBytes: rawBuffer, bytesPerRow: bytesPerRow)
    }
}
