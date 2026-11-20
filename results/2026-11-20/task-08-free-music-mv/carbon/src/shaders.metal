// ============================================================================
// SINGULARITY BLOOM — Apple Metal HDR 60fps Cinema & Raymarching Shaders
// ============================================================================

#include <metal_stdlib>
using namespace metal;

struct GPUUniforms {
    float time_sec;
    float bar_pos;
    float beat_phase;
    int   act_id;
    int   shot_id;
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
    float shot_progress; // 0..1 within current camera shot
    float pad0, pad1, pad2;
    float spectrum[64];
    float piano_keys[16];
};

// ----------------------------------------------------------------------------
// Utility Math, Noise & Color Helpers
// ----------------------------------------------------------------------------
inline float hash21(float2 p) {
    p = fract(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

inline float2 hash22(float2 p) {
    float n = sin(dot(p, float2(41.0, 289.0)));
    return fract(float2(262144.0, 32768.0) * n);
}

inline float noise2D(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + float2(1.0, 0.0));
    float c = hash21(i + float2(0.0, 1.0));
    float d = hash21(i + float2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

inline float fbm(float2 p) {
    float v = 0.0;
    float a = 0.5;
    float2x2 rot = float2x2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; ++i) {
        v += a * noise2D(p);
        p = rot * p * 2.03;
        a *= 0.5;
    }
    return v;
}

inline float2x2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return float2x2(c, -s, s, c);
}

inline float3 cosinePalette(float t, float3 a, float3 b, float3 c, float3 d) {
    return a + b * cos(6.2831853 * (c * t + d));
}

inline float3 srgbToLinear(float3 c) {
    return pow(max(c, float3(0.0)), float3(2.2));
}

inline float3 acesToneMap(float3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

inline float sampleSpectrumSmooth(constant GPUUniforms& u, float normFreq) {
    float idx = clamp(normFreq, 0.0, 0.999) * 63.0;
    int i0 = int(floor(idx));
    int i1 = min(63, i0 + 1);
    return mix(u.spectrum[i0], u.spectrum[i1], fract(idx));
}

// ----------------------------------------------------------------------------
// 3D SDF Primitives for Pure 3D Raymarched Cinema Shots
// ----------------------------------------------------------------------------
inline float sdBox(float3 p, float3 b) {
    float3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

inline float sdOctahedron(float3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
}

inline float sdTorus(float3 p, float2 t) {
    float2 q = float2(length(p.xy) - t.x, p.z);
    return length(q) - t.y;
}

// Shot 21: 3D Cyber-Cathedral & 7-Fold Polymetric Astrolabe Tunnel
float3 renderShot21_CyberCathedral(float2 uv, constant GPUUniforms& u) {
    float2 p = (uv - 0.5) * float2(16.0 / 9.0, 1.0);
    p.y = -p.y; // +Y up

    float speed = u.time_sec * 9.5 + u.kick_env * 0.35;
    float3 ro = float3(sin(u.time_sec * 0.6) * 0.35, 0.15 + cos(u.time_sec * 0.45) * 0.2, speed);
    float3 rd = normalize(float3(p, 1.35 - u.kick_env * 0.12));
    rd.xy = rot2(sin(u.time_sec * 0.35) * 0.14) * rd.xy;

    float3 col = float3(0.01, 0.02, 0.05);
    float t = 0.2;
    float3 glowAcc = float3(0.0);

    for (int i = 0; i < 64; ++i) {
        float3 pos = ro + rd * t;
        // Infinite cathedral repetition along Z
        float cellZ = floor(pos.z / 4.0);
        float3 q = pos;
        q.z = fmod(pos.z + 2000.0, 4.0) - 2.0;

        // Gothic cyber-arch pillars
        float3 archP = q;
        archP.x = abs(archP.x) - 2.45;
        float pillar = sdBox(archP, float3(0.24, 3.2, 0.32));
        // Pointed vault ribs
        float3 ribP = q;
        ribP.xy = rot2(0.45 * sign(q.x)) * ribP.xy;
        float vault = abs(length(q.xy - float2(0.0, -0.5)) - 2.75) - 0.12;
        vault = max(vault, abs(q.z) - 0.22);

        // Rotating 7-fold Polymetric Astrolabe Ring inside each bay!
        float3 ringP = q;
        float snapAngle = cellZ * 0.8975979 + floor(u.bar_pos * 4.0) * 0.45 + u.beat_phase * 0.45;
        ringP.xy = rot2(snapAngle) * ringP.xy;
        float specBand = u.spectrum[int(fmod(abs(cellZ) * 7.0, 48.0))];
        float ring = sdTorus(ringP, float2(1.65 + specBand * 0.25, 0.032));

        // Floating crystal data octahedrons
        float3 octP = q;
        octP.xy = rot2(-u.time_sec * 0.9 + cellZ) * octP.xy;
        octP.x = abs(octP.x) - 1.15;
        float oct = sdOctahedron(octP, 0.18 + u.lead_env * 0.08);

        // Mirror obsidian floor
        float floorD = pos.y + 1.85;

        float d = min(min(pillar, vault), min(ring, min(oct, floorD)));
        // Volumetric neon glow accumulation
        float3 neonTint = mix(float3(0.08, 0.72, 1.0), float3(0.58, 0.22, 1.0), 0.5 + 0.5 * sin(cellZ * 0.7 + u.time_sec));
        glowAcc += neonTint * (0.0045 / (0.015 + ring * ring * 18.0)) * (0.6 + u.lead_env * 1.2);
        glowAcc += float3(0.2, 0.9, 1.0) * (0.0028 / (0.02 + oct * oct * 24.0)) * (0.5 + u.piano_env);

        if (d < 0.003 || t > 42.0) {
            if (t <= 42.0) {
                float fog = exp(-t * 0.055);
                float3 surf = float3(0.03, 0.06, 0.12);
                if (d == floorD) {
                    // Glowing circuit lines on dark obsidian floor
                    float2 g = abs(fract(pos.xz * 0.75) - 0.5);
                    float line = smoothstep(0.03, 0.004, min(g.x, g.y));
                    surf += float3(0.05, 0.65, 0.95) * line * (0.5 + u.sub_env * 1.4);
                }
                col = mix(col, surf, fog);
            }
            break;
        }
        t += d * 0.82;
    }

    // Distant bright singularity core at end of cathedral tunnel
    float centerGlow = exp(-length(p) * 2.6) * (0.8 + u.chord_env * 1.2);
    col += glowAcc + float3(0.35, 0.75, 1.3) * centerGlow;
    return col;
}

// Shot 30: 3D Relativistic Singularity Vortex & Shattered Glass Storm
float3 renderShot30_SingularityVortex(float2 uv, constant GPUUniforms& u) {
    float2 p = (uv - 0.5) * float2(16.0 / 9.0, 1.0);
    p.y = -p.y;
    // Camera shake ramps up with riser_env!
    float shake = u.riser_env * 0.025 + u.snare_env * 0.012;
    p += float2(sin(u.time_sec * 47.0), cos(u.time_sec * 53.0)) * shake;

    p = rot2(u.time_sec * 0.25 + u.riser_env * 1.4) * p;
    float r = length(p);
    float rs = 0.16 + 0.04 * u.riser_env + 0.02 * u.kick_env; // Event horizon radius

    // Relativistic Einstein ring gravitational lensing deflection!
    float2 lensedP = p * (1.0 - (rs * rs) / max(r * r, 0.004));
    float3 col = float3(0.0);

    // Event horizon shadow
    float shadow = smoothstep(rs * 0.96, rs * 1.04, r);

    // Volumetric Relativistic Accretion Disk (tilted 3D plane intersection + secondary lensed halo!)
    for (int layer = 0; layer < 2; ++layer) {
        float2 dp = (layer == 0) ? float2(p.x, p.y * 3.6 + 0.05) : float2(lensedP.x, lensedP.y * 1.15);
        float dr = length(dp);
        float angle = atan2(dp.y, dp.x);
        float swirl = fbm(float2(dr * 8.5 - u.time_sec * 3.5, angle * 3.0 + dr * 6.0 - u.time_sec * 4.5));
        float band = smoothstep(rs * 1.05, rs * 1.45, dr) * exp(-(dr - rs * 1.3) * (layer == 0 ? 4.2 : 5.8));
        // Doppler beaming: approaching side brighter blue-gold, receding deep violet-orange!
        float doppler = 0.72 + 0.45 * cos(angle + 0.4);
        float3 diskCol = mix(float3(0.65, 0.18, 1.1), float3(1.8, 1.15, 0.45), clamp(swirl * 1.35, 0.0, 1.0));
        col += diskCol * band * (0.65 + 0.85 * swirl) * doppler * (1.0 + u.riser_env * 1.5);
    }

    // 64-Band Inward-Spiraling Frequency Arcs
    float ang01 = fract(atan2(p.y, p.x) / 6.2831853 + 0.5);
    float spec = sampleSpectrumSmooth(u, abs(ang01 * 2.0 - 1.0));
    float photonRing = exp(-abs(r - rs * 1.08) * 65.0) * (1.4 + spec * 2.2);
    col += float3(1.6, 1.25, 0.85) * photonRing;

    // Spiraling glass shards rushing inward toward the singularity
    for (int s = 0; s < 18; ++s) {
        float fs = float(s);
        float shardT = fract(fs * 0.173 - u.time_sec * (0.45 + 0.65 * u.riser_env));
        float sr = mix(rs * 1.05, 1.35, shardT * shardT);
        float sa = fs * 2.39996 + (1.0 - shardT) * 5.0 + u.time_sec * 0.8;
        float2 sp = p - float2(cos(sa), sin(sa)) * sr;
        sp = rot2(sa * 2.0 + u.time_sec * 3.0) * sp;
        float dShard = max(abs(sp.x) * 1.8 + abs(sp.y) * 0.7, abs(sp.y)) - (0.018 * shardT + 0.004);
        float shardGlow = smoothstep(0.005, -0.002, dShard);
        col += mix(float3(0.4, 0.9, 1.4), float3(1.5, 1.1, 0.5), hash21(float2(fs, 1.0))) * shardGlow * shadow;
    }

    col *= shadow;
    return col;
}

// Shot 32 (Bar 39): Breathless Vacuum Silence — Suspended Crystal Tear & Drop Implosion!
float3 renderShot32_FrozenTearSilence(float2 uv, constant GPUUniforms& u) {
    float2 p = (uv - 0.5) * float2(16.0 / 9.0, 1.0);
    p.y = -p.y;
    float barFrac = clamp(u.bar_pos - 39.0, 0.0, 1.0); // 0..1 across Bar 39

    // At 39.82..1.0 (the pickup flam!), implode inward then blast prismatic light!
    float implode = smoothstep(0.76, 0.94, barFrac);
    float blast   = smoothstep(0.92, 1.00, barFrac);
    p *= mix(1.0, 2.8, implode * (1.0 - blast * 0.85));

    float3 ro = float3(0.0, 0.0, -2.4);
    float3 rd = normalize(float3(p, 1.5));

    float3 col = float3(0.003, 0.005, 0.012);
    // Expanding single frost ripple from Beat 0
    float ringR = barFrac * 1.45;
    float ripple = exp(-abs(length(p) - ringR) * 42.0) * (1.0 - barFrac) * 0.85;
    col += float3(0.35, 0.78, 1.2) * ripple;

    // Raymarch faceted crystal tear at origin
    float t = 0.5;
    for (int i = 0; i < 48; ++i) {
        float3 q = ro + rd * t;
        q.xz = rot2(u.time_sec * 0.55) * q.xz;
        q.xy = rot2(0.18) * q.xy;
        // Teardrop-octahedron hybrid
        q.y *= (q.y > 0.0) ? 0.72 : 1.15;
        float d = sdOctahedron(q, 0.42 * (1.0 - implode * 0.65));
        if (d < 0.002) {
            // Compute surface normal for diamond-prism dispersion!
            float2 e = float2(0.003, 0.0);
            float3 n = normalize(float3(
                sdOctahedron(q + e.xyy, 0.42) - sdOctahedron(q - e.xyy, 0.42),
                sdOctahedron(q + e.yxy, 0.42) - sdOctahedron(q - e.yxy, 0.42),
                sdOctahedron(q + e.yyx, 0.42) - sdOctahedron(q - e.yyx, 0.42)
            ));
            float fres = pow(1.0 - max(0.0, dot(-rd, n)), 3.0);
            float spec = pow(max(0.0, dot(reflect(rd, n), normalize(float3(0.5, 0.8, -0.6)))), 24.0);
            col = float3(0.12, 0.35, 0.65) * 0.45
                + float3(0.55, 0.92, 1.45) * fres * 1.6
                + float3(1.8, 1.6, 1.4) * spec * 1.8;
            // Internal starlight core
            col += float3(1.2, 0.65, 1.4) * exp(-length(q) * 5.0);
            break;
        }
        t += d * 0.8;
        if (t > 4.5) break;
    }

    // Soft halo + beat-3.75 supernova ignition!
    col += float3(0.35, 0.72, 1.25) * exp(-length(p) * 4.8) * 0.55;
    col += float3(2.2, 1.85, 1.55) * blast * exp(-length(p) * 1.2) * 2.5;
    return col;
}

// Shot 41 & Shot 61: 3D Raymarched Hypernova Megastructure / Climax Cathedral of Light
float3 renderDropRaymarchWorld(float2 uv, constant GPUUniforms& u, bool isClimaxWorld) {
    float2 p = (uv - 0.5) * float2(16.0 / 9.0, 1.0);
    p.y = -p.y;

    // Kick zoom-punch & banking supersonic flight!
    p *= (1.0 - u.kick_env * 0.065);
    float bank = sin(u.time_sec * 0.9) * 0.24;
    p = rot2(bank) * p;

    float fwd = u.time_sec * (isClimaxWorld ? 16.0 : 14.0);
    float3 ro = float3(sin(u.time_sec * 0.7) * 0.8, isClimaxWorld ? (0.6 + u.time_sec * 0.5) : 0.4, fwd);
    float3 rd = normalize(float3(p, 1.25));

    // Radiant Nebula / Prismatic Dawn Sky Backdrop
    float skyGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    float3 skyCol = isClimaxWorld
        ? mix(float3(1.35, 0.88, 0.55), float3(0.22, 0.52, 1.15), skyGrad)
        : mix(float3(0.55, 0.12, 0.48), float3(0.04, 0.16, 0.42), skyGrad);
    float sunDot = max(0.0, dot(rd, normalize(float3(0.0, 0.18, 1.0))));
    skyCol += (isClimaxWorld ? float3(2.2, 1.75, 1.25) : float3(1.6, 0.55, 1.1)) * pow(sunDot, 10.0) * (0.8 + u.chord_env * 0.8);

    float3 col = skyCol;
    float3 glow = float3(0.0);
    float t = 0.3;

    for (int i = 0; i < 60; ++i) {
        float3 pos = ro + rd * t;
        float cellZ = floor(pos.z / 5.0);
        float3 q = pos;
        q.z = fmod(pos.z + 4000.0, 5.0) - 2.5;

        // Towering Crystal Obelisks / Pipe-Organ Spires of Light
        float3 sp = q;
        sp.x = abs(sp.x) - (2.8 + 0.6 * sin(cellZ * 1.3));
        sp.y -= -1.5;
        float spireH = 2.6 + 1.8 * u.spectrum[int(fmod(abs(cellZ) * 5.0, 56.0))];
        float spire = sdBox(sp, float3(0.26, spireH, 0.26));
        spire = min(spire, sdOctahedron(sp - float3(0.0, spireH + 0.25, 0.0), 0.38));

        // Colossal Golden Orbital Astrolabe Rings
        float3 rp = q;
        rp.xy = rot2(cellZ * 0.6 + u.time_sec * 0.8) * rp.xy;
        float goldRing = sdTorus(rp, float2(2.35, 0.045));

        // Blooming Crystal Flowers / Prisms floating in midair
        float3 fp = q;
        fp.x = abs(fp.x) - 1.35;
        fp.y -= 0.4 * sin(cellZ * 2.1 + u.time_sec * 2.0);
        fp.xz = rot2(u.time_sec * 2.2 + cellZ) * fp.xz;
        float blossom = sdOctahedron(fp, 0.22 + u.piano_env * 0.10);

        float d = min(spire, min(goldRing, blossom));

        float3 blossomHue = isClimaxWorld
            ? cosinePalette(cellZ * 0.15 + u.time_sec * 0.2, float3(0.9, 0.75, 0.85), float3(0.4, 0.3, 0.3), float3(1.0), float3(0.0, 0.15, 0.35))
            : ((int(abs(cellZ)) % 2 == 0) ? float3(1.3, 0.25, 0.85) : float3(0.2, 1.1, 1.4));

        glow += float3(1.4, 1.05, 0.45) * (0.0042 / (0.02 + goldRing * goldRing * 16.0)) * (0.7 + u.kick_env);
        glow += blossomHue * (0.0048 / (0.02 + blossom * blossom * 20.0)) * (0.7 + u.lead_env * 1.4);

        if (d < 0.004 || t > 48.0) {
            if (t <= 48.0) {
                float fog = exp(-t * 0.042);
                float3 mat = isClimaxWorld ? float3(0.95, 0.88, 0.98) : float3(0.18, 0.38, 0.68);
                if (d == goldRing) mat = float3(1.5, 1.15, 0.45);
                col = mix(skyCol, mat * (0.7 + u.chord_env * 0.8), fog);
            }
            break;
        }
        t += d * 0.82;
    }

    return col + glow;
}

// ----------------------------------------------------------------------------
// 2.5D Depth-Parallax & Real-Time Shader Relighting for Illustrative Plates
// ----------------------------------------------------------------------------
float3 samplePlateParallax(texture2d<float, access::sample> tex, sampler samp,
                           float2 uv, float zoom, float2 panTarget, float2 camDrift,
                           float parallaxStrength, float kickZoom) {
    // Center zoom & camera drift
    float totalZoom = zoom + kickZoom;
    float2 baseUV = (uv - 0.5) / totalZoom + panTarget;
    baseUV = clamp(baseUV, float2(0.015), float2(0.985));

    // Estimate smooth foreground/background depth from multi-tap luminance + radial subject weight
    float3 c0 = tex.sample(samp, baseUV).rgb;
    float3 cBlur = 0.25 * (
        tex.sample(samp, clamp(baseUV + float2( 0.012,  0.012), 0.01, 0.99)).rgb +
        tex.sample(samp, clamp(baseUV + float2(-0.012,  0.012), 0.01, 0.99)).rgb +
        tex.sample(samp, clamp(baseUV + float2( 0.012, -0.012), 0.01, 0.99)).rgb +
        tex.sample(samp, clamp(baseUV + float2(-0.012, -0.012), 0.01, 0.99)).rgb
    );
    float lum = dot(cBlur, float3(0.299, 0.587, 0.114));
    float detail = length(c0 - cBlur);
    // Foreground subjects have sharper local contrast & lower-center proximity
    float depth = clamp(0.35 * lum + 1.8 * detail + 0.35 * smoothstep(0.15, 0.95, baseUV.y), 0.0, 1.0);

    float2 displacedUV = clamp(baseUV + camDrift * (depth - 0.45) * parallaxStrength, float2(0.012), float2(0.988));
    return srgbToLinear(tex.sample(samp, displacedUV).rgb);
}

// ----------------------------------------------------------------------------
// Persistent 3D Bokeh & Crystal Petal GPU Particle Overlay
// ----------------------------------------------------------------------------
float3 render3DParticles(float2 uv, constant GPUUniforms& u) {
    float2 p = (uv - 0.5) * float2(16.0 / 9.0, 1.0);
    float3 acc = float3(0.0);

    // 4 Parallax Depth Planes of Particles (zero temporal flicker, velvety 60fps motion!)
    for (int layer = 1; layer <= 4; ++layer) {
        float fl = float(layer);
        float scale = 5.5 + fl * 4.2;
        float2 vel;
        if (u.act_id == 1) {
            // Slowly drifting frozen snow & turquoise bioluminescent dust
            vel = float2(sin(u.time_sec * 0.25 + fl) * 0.12, u.time_sec * (0.08 + 0.03 * fl));
        } else if (u.act_id == 2 || u.act_id == 3) {
            // Anti-gravity upward ascent!
            vel = float2(sin(u.time_sec * 0.5 + fl) * 0.18, -u.time_sec * (0.38 + 0.85 * u.riser_env));
        } else if (u.act_id == 4) {
            // Diagonal hypernova star-stream!
            vel = float2(-u.time_sec * (1.2 + 0.3 * fl), u.time_sec * 0.45);
        } else if (u.act_id == 5) {
            // Gentle rising starlight tears
            vel = float2(sin(u.time_sec * 0.3 + fl) * 0.1, -u.time_sec * (0.16 + 0.22 * u.key_mod));
        } else {
            // Cascading Sakura-Crystal Petals & Golden Dawn Embers!
            vel = float2(-u.time_sec * 0.42 + sin(u.time_sec * 0.6 + fl) * 0.2, -u.time_sec * 0.28);
        }

        float2 gridUV = p * scale + vel;
        float2 cell = floor(gridUV);
        float2 local = fract(gridUV) - 0.5;

        float2 rnd = hash22(cell + fl * 19.3);
        if (rnd.x > 0.52) { // sparse, tasteful cinema density
            float2 center = (rnd - 0.5) * 0.58;
            center.x += 0.14 * sin(u.time_sec * (1.5 + rnd.y * 2.0) + rnd.x * 6.28);
            float2 dVec = local - center;

            // Petal shape in Act 6/7, soft crystal/bokeh orb otherwise
            if (u.act_id >= 6) {
                dVec = rot2(u.time_sec * 1.8 + rnd.x * 6.28) * dVec;
                dVec.x *= 1.65;
            }
            float dist = length(dVec);
            float radius = (layer == 1) ? 0.11 : (0.055 + 0.025 * rnd.y);
            float bokeh = smoothstep(radius, radius * (layer == 1 ? 0.35 : 0.08), dist);
            float twinkle = 0.65 + 0.35 * sin(u.time_sec * 4.5 + rnd.y * 12.0);

            float3 pCol;
            if (u.act_id == 1) pCol = mix(float3(0.35, 0.95, 1.2), float3(0.8, 0.9, 1.1), rnd.y);
            else if (u.act_id <= 3) pCol = mix(float3(0.2, 0.85, 1.4), float3(1.5, 1.05, 0.35), rnd.y);
            else if (u.act_id == 4) pCol = mix(float3(1.5, 0.3, 1.0), float3(0.25, 1.2, 1.5), rnd.y);
            else if (u.act_id == 5) pCol = mix(float3(1.2, 0.75, 0.95), float3(0.65, 1.05, 1.3), rnd.y);
            else pCol = mix(float3(1.45, 0.82, 1.05), float3(1.6, 1.28, 0.55), rnd.y); // Sakura & Gold!

            float audioBoost = 0.55 + 0.75 * (u.piano_env * 0.5 + u.chord_env * 0.5);
            acc += pCol * bokeh * twinkle * audioBoost * (layer == 1 ? 0.26 : 0.42);
        }
    }
    return acc;
}

// ============================================================================
// PASS 1: Master HDR Scene Kernel (1920x1080 RGBA16Float)
// ============================================================================
kernel void sceneKernel(
    texture2d<float, access::write> outHDR [[texture(0)]],
    texture2d<float, access::sample> texAct1 [[texture(1)]],
    texture2d<float, access::sample> texAct2 [[texture(2)]],
    texture2d<float, access::sample> texAct4 [[texture(3)]],
    texture2d<float, access::sample> texAct5 [[texture(4)]],
    texture2d<float, access::sample> texAct6 [[texture(5)]],
    constant GPUUniforms& u [[buffer(0)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint width = outHDR.get_width();
    uint height = outHDR.get_height();
    if (gid.x >= width || gid.y >= height) return;

    constexpr sampler linSamp(coord::normalized, address::clamp_to_edge, filter::linear);
    float2 uv = (float2(gid) + 0.5) / float2(width, height);
    float aspect = float(width) / float(height);

    // Subtle rhythmic glitch horizontal slice displacement during 4th-bar drum fills!
    if (u.glitch_trig > 0.15) {
        float band = floor(uv.y * 28.0 + u.time_sec * 18.0);
        float h = hash21(float2(band, floor(u.time_sec * 24.0)));
        if (h > 0.84) {
            uv.x = clamp(uv.x + (h - 0.9) * 0.14 * u.glitch_trig, 0.0, 1.0);
        }
    }

    float2 camDrift = float2(sin(u.time_sec * 0.42), cos(u.time_sec * 0.33)) * 0.028;
    float kickZoom = u.kick_env * 0.032;
    float3 hdr = float3(0.0);

    // ------------------------------------------------------------------------
    // Director Shot Router
    // ------------------------------------------------------------------------
    if (u.shot_id == 10 || u.shot_id == 11) {
        // ACT I: Frozen Glass Cathedral (Shot 10 Wide -> Shot 11 Medium-Close on Aoi & Crystal Piano)
        float zoom = (u.shot_id == 10) ? mix(1.03, 1.13, u.shot_progress)
                                       : mix(1.20, 1.32, u.shot_progress);
        float2 target = (u.shot_id == 10) ? float2(0.50, 0.50) : float2(0.53, 0.56);

        // Animated frozen mirror-water ripples below y = 0.75!
        float2 sampleUV = uv;
        if (uv.y > 0.74) {
            float wy = (uv.y - 0.74) / 0.26;
            sampleUV.x += sin(uv.y * 95.0 - u.time_sec * 2.8) * 0.0035 * wy * (0.4 + u.piano_env);
        }
        hdr = samplePlateParallax(texAct1, linSamp, sampleUV, zoom, target, camDrift, 0.65, kickZoom * 0.3);

        // Moonlight shaft volumetric breath
        float shaft = exp(-pow((uv.x - 0.50 + (uv.y - 0.3) * 0.06) * 4.2, 2.0)) * smoothstep(0.95, 0.05, uv.y);
        hdr += float3(0.10, 0.26, 0.42) * shaft * (0.35 + 0.55 * u.vocal_env + 0.35 * u.piano_env);

        // 16-Register Holographic Crystal Piano Constellation rising from the grand piano!
        for (int k = 0; k < 16; ++k) {
            float vel = u.piano_keys[k];
            if (vel > 0.01) {
                float kx = 0.46 + (float(k) / 15.0) * 0.28;
                float ky = 0.56 - (1.0 - vel) * 0.22;
                float2 d = (uv - float2(kx, ky)) * float2(aspect, 1.0);
                // Expanding diamond ring + glowing core
                float orb = exp(-length(d) * 52.0) * vel * 1.8;
                float ring = exp(-abs(length(d) - (1.0 - vel) * 0.055) * 180.0) * vel * 0.9;
                hdr += float3(0.45, 1.05, 1.45) * (orb + ring);
            }
        }
    }
    else if (u.shot_id == 20 || u.shot_id == 31) {
        // ACT II / III: Neural Awakening & Singularity Eclipse
        float zoom = (u.shot_id == 20) ? mix(1.05, 1.15, u.shot_progress)
                                       : mix(1.16, 1.28 + u.riser_env * 0.12, u.shot_progress);
        float2 target = (u.shot_id == 20) ? float2(0.50, 0.49) : float2(0.50, 0.43);

        // Relativistic singularity ripple around eclipse center (0.50, 0.16)
        float2 toHole = (uv - float2(0.50, 0.16)) * float2(aspect, 1.0);
        float rHole = length(toHole);
        float2 lensUV = uv + normalize(toHole + 1e-4) * (0.008 * (u.sub_env + u.riser_env)) * exp(-rHole * 4.5);

        hdr = samplePlateParallax(texAct2, linSamp, lensUV, zoom, target, camDrift * 1.2, 0.85, kickZoom);

        // Audio-reactive boost on cyan/violet neural constellations!
        float cyanEnergy = max(0.0, hdr.b * 0.6 + hdr.g * 0.5 - hdr.r * 0.85);
        hdr += float3(0.15, 0.85, 1.4) * cyanEnergy * (0.45 + 1.35 * u.lead_env + 0.8 * u.vocal_env);

        // Sacred-Geometry 64-Band Astrolabe Spectrum Halo orbiting the Singularity!
        float ang = fract(atan2(toHole.y, toHole.x) / 6.2831853 + 0.5 + u.time_sec * 0.04);
        float spec = sampleSpectrumSmooth(u, abs(ang * 2.0 - 1.0));
        float haloR = 0.22 + spec * 0.085;
        float haloLine = exp(-abs(rHole - haloR) * 110.0) * (0.45 + spec * 1.6);
        // Occlude gently behind Aoi's foreground silhouette (lower center)
        float bgMask = 1.0 - smoothstep(0.28, 0.42, uv.y) * exp(-pow((uv.x - 0.50) * 3.5, 2.0));
        hdr += mix(float3(0.3, 0.9, 1.5), float3(1.6, 1.1, 0.4), spec) * haloLine * bgMask;
    }
    else if (u.shot_id == 21) {
        hdr = renderShot21_CyberCathedral(uv, u);
    }
    else if (u.shot_id == 30) {
        hdr = renderShot30_SingularityVortex(uv, u);
    }
    else if (u.shot_id == 32) {
        hdr = renderShot32_FrozenTearSilence(uv, u);
    }
    else if (u.shot_id == 40) {
        // ACT IV DROP I: Hypernova Artcore Flight!
        float zoom = mix(1.04, 1.14, u.shot_progress);
        // Kick shockwave radiating from horizon sun (0.41, 0.45)!
        float2 toSun = (uv - float2(0.41, 0.45)) * float2(aspect, 1.0);
        float rSun = length(toSun);
        float shockR = fract(u.bar_pos * 2.0) * 0.95;
        float shock = exp(-abs(rSun - shockR) * 36.0) * u.kick_env;
        float2 shockUV = uv + normalize(toSun + 1e-4) * shock * 0.012;

        hdr = samplePlateParallax(texAct4, linSamp, shockUV, zoom, float2(0.50, 0.50), camDrift * 1.4, 0.95, kickZoom * 1.3);

        // Boost prismatic wings & glowing lilies on chord/lead hits!
        float sat = max(hdr.r, max(hdr.g, hdr.b)) - min(hdr.r, min(hdr.g, hdr.b));
        hdr += hdr * sat * (0.35 + 0.65 * u.chord_env + 0.55 * u.lead_env);

        // Diagonal anime speed-streaks + radial sun flare
        float speedAngle = dot(uv - 0.5, normalize(float2(0.85, -0.45)));
        float streakNoise = pow(noise2D(float2(speedAngle * 42.0, u.time_sec * 16.0)), 5.0);
        float edgeMask = smoothstep(0.18, 0.62, length(uv - float2(0.58, 0.46)));
        hdr += float3(0.45, 1.05, 1.45) * streakNoise * edgeMask * (0.4 + u.hat_env * 0.9);
        hdr += float3(1.5, 0.95, 0.65) * exp(-rSun * 3.8) * (0.25 + 0.55 * u.kick_env);

        // Sleek 64-Band Curved Horizon Spectrum Arc along lower astrolabe ring
        float arcX = clamp((uv.x - 0.08) / 0.84, 0.0, 1.0);
        if (uv.x > 0.08 && uv.x < 0.92) {
            float sp = sampleSpectrumSmooth(u, arcX);
            float curveY = 0.86 + 0.05 * sin(arcX * 3.14159);
            float barH = sp * 0.085;
            if (uv.y < curveY && uv.y > curveY - barH && fract(arcX * 64.0) < 0.68) {
                float uBar = (curveY - uv.y) / max(barH, 0.001);
                hdr += mix(float3(0.25, 1.15, 1.5), float3(1.6, 0.35, 1.05), uBar) * 0.85;
            }
        }
    }
    else if (u.shot_id == 41) {
        hdr = renderDropRaymarchWorld(uv, u, false);
    }
    else if (u.shot_id == 42 || u.shot_id == 62) {
        // 4th-Bar Amen/Glitch Breakbeat 3-Panel Diagonal Anime Montage!
        bool climax = (u.shot_id == 62);
        float diag1 = uv.x + (uv.y - 0.5) * 0.24;
        float sep1 = abs(diag1 - 0.34);
        float sep2 = abs(diag1 - 0.67);

        if (diag1 < 0.34) {
            // Left Panel: Intense Extreme Close-Up on Aoi's Astrolabe Eyes!
            float2 subUV = float2((uv.x - 0.17) * 0.9 + 0.50, (uv.y - 0.5) * 0.42 + 0.425);
            hdr = srgbToLinear(texAct2.sample(linSamp, clamp(subUV, 0.02, 0.98)).rgb);
            hdr *= (1.1 + u.snare_env * 0.6);
        } else if (diag1 < 0.67) {
            // Center Panel: High-speed 3D Raymarched Megastructure!
            hdr = renderDropRaymarchWorld(uv, u, climax);
        } else {
            // Right Panel: Action Close-Up of Soaring Aoi / World-Tree!
            float2 subUV = climax
                ? float2((uv.x - 0.83) * 0.9 + 0.50, (uv.y - 0.5) * 0.55 + 0.56)
                : float2((uv.x - 0.83) * 0.9 + 0.64, (uv.y - 0.5) * 0.55 + 0.48);
            hdr = srgbToLinear((climax ? texAct6 : texAct4).sample(linSamp, clamp(subUV, 0.02, 0.98)).rgb);
            hdr *= (1.1 + u.kick_env * 0.5);
        }
        // Crisp glowing panel divider slashes pulsing on every snare!
        float slash = smoothstep(0.006, 0.001, min(sep1, sep2));
        hdr = mix(hdr, float3(2.0, 1.7, 1.4) * (1.0 + u.snare_env), slash);
    }
    else if (u.shot_id == 50 || u.shot_id == 51) {
        // ACT V: Twilight Mirror Sanctuary & Counterpoint Aurora Ribbons
        float zoom = (u.shot_id == 50) ? mix(1.03, 1.11, u.shot_progress)
                                       : mix(1.11, 1.22, u.shot_progress);
        float2 sampleUV = uv;
        // Salar de Uyuni mirror-ocean ripples below horizon (y > 0.56) + footstep rings!
        if (uv.y > 0.56) {
            float depthY = (uv.y - 0.56) / 0.44;
            sampleUV.x += sin(uv.y * 120.0 - u.time_sec * 3.4) * 0.003 * depthY * (0.5 + u.piano_env);
            float2 toFeet = (uv - float2(0.50, 0.88)) * float2(aspect, 2.4);
            float footRipple = sin(length(toFeet) * 55.0 - u.time_sec * 5.0) * exp(-length(toFeet) * 4.5);
            sampleUV.y += footRipple * 0.004 * (0.4 + u.piano_env);
        }

        hdr = samplePlateParallax(texAct5, linSamp, sampleUV, zoom, float2(0.50, 0.49), camDrift * 0.7, 0.6, 0.0);

        // Two-Voice Counterpoint Light Ribbons across the twilight sky (and reflected faintly in sea!)
        for (int pass = 0; pass < 2; ++pass) {
            float yEval = (pass == 0) ? uv.y : (1.12 - uv.y);
            float reflAtten = (pass == 0) ? 1.0 : (uv.y > 0.56 ? 0.35 : 0.0);
            if (reflAtten > 0.0 && yEval > 0.05 && yEval < 0.54) {
                float ySoprano = 0.24 - 0.09 * (u.last_lead_pitch - 0.5)
                               + 0.055 * sin(uv.x * 7.5 - u.time_sec * 2.1);
                float yCello   = 0.34 + 0.05 * sin(uv.x * 5.2 + u.time_sec * 1.5);
                float dSop = exp(-abs(yEval - ySoprano) * 85.0) * (0.35 + 1.15 * u.vocal_env);
                float dCel = exp(-abs(yEval - yCello) * 75.0)   * (0.30 + 0.95 * u.chord_env);
                // Mask behind Aoi's central silhouette
                float charMask = 1.0 - 0.85 * exp(-pow((uv.x - 0.51) * 9.0, 2.0)) * smoothstep(0.18, 0.30, yEval);
                hdr += (float3(0.45, 1.1, 1.45) * dSop + float3(1.35, 0.65, 0.55) * dCel) * reflAtten * charMask;
            }
        }
        // Glowing crystal tear pulse at (0.445, 0.265)
        float2 toTear = (uv - float2(0.445, 0.265)) * float2(aspect, 1.0);
        hdr += float3(0.6, 1.2, 1.6) * exp(-length(toTear) * 28.0) * (0.35 + 0.85 * u.vocal_env);
    }
    else if (u.shot_id == 61) {
        hdr = renderDropRaymarchWorld(uv, u, true);
    }
    else {
        // ACT VI CLIMAX (Shots 60, 63) & ACT VII CODA (Shot 70): World-Tree of Light!
        bool isCoda = (u.shot_id == 70);
        float zoom = isCoda ? mix(1.14, 1.02, u.shot_progress)
                            : ((u.shot_id == 63) ? mix(1.02, 1.16, u.shot_progress) : mix(1.06, 1.15, u.shot_progress));

        float2 sampleUV = uv;
        // Shimmering emerald-cerulean crystal lotus ocean below y = 0.68
        if (uv.y > 0.68) {
            float wy = (uv.y - 0.68) / 0.32;
            sampleUV.x += sin(uv.y * 110.0 - u.time_sec * 3.2) * 0.0028 * wy;
        }

        hdr = samplePlateParallax(texAct6, linSamp, sampleUV, zoom, float2(0.50, 0.50), camDrift, 0.8, isCoda ? 0.0 : kickZoom * 1.25);

        // Volumetric Prismatic God-Rays radiating from the World-Tree Heart (0.50, 0.52)!
        float2 toHeart = (uv - float2(0.50, 0.52)) * float2(aspect, 1.0);
        float rHeart = length(toHeart);
        float rayAng = atan2(toHeart.y, toHeart.x);
        float rays = 0.5 + 0.5 * sin(rayAng * 14.0 + u.time_sec * 0.8) * cos(rayAng * 9.0 - u.time_sec * 0.5);
        float rayMask = exp(-rHeart * 1.9) * rays;
        float3 prismRay = cosinePalette(rayAng / 6.28318 + u.time_sec * 0.1,
                                        float3(1.1, 0.95, 0.85), float3(0.35, 0.3, 0.35),
                                        float3(1.0), float3(0.0, 0.33, 0.67));
        hdr += prismRay * rayMask * (isCoda ? 0.25 : (0.35 + 0.65 * u.chord_env + 0.45 * u.kick_env));

        // 64-Band Celestial Halo Crown around the World-Tree during Climax Drop II!
        if (!isCoda) {
            float ang01 = fract(rayAng / 6.2831853 + 0.5);
            float sp = sampleSpectrumSmooth(u, abs(ang01 * 2.0 - 1.0));
            float crownR = 0.34 + sp * 0.095;
            float crown = exp(-abs(rHeart - crownR) * 95.0) * (0.4 + sp * 1.5) * smoothstep(0.68, 0.45, uv.y);
            hdr += mix(float3(1.6, 1.25, 0.55), float3(1.5, 0.75, 1.15), sp) * crown;
        } else {
            // Warm golden-hour twilight Coda grade & fade-to-black in final 2.8 seconds!
            hdr *= float3(1.08, 0.98, 0.90);
        }
    }

    // Add persistent 3D Bokeh / Snow / Sakura-Crystal Particles across all scenes (except Bar 39 vacuum!)
    if (u.shot_id != 32) {
        hdr += render3DParticles(uv, u);
    }

    // Impact Flash on major structural drops & modulations!
    if (u.flash_white > 0.005) {
        float3 flashTint = (u.act_id >= 6) ? float3(1.8, 1.55, 1.25) : float3(1.35, 1.55, 1.85);
        hdr += flashTint * (u.flash_white * u.flash_white) * 1.65;
    }

    // Smooth fade-in (first 1.6s) and fade-out (final 2.6s)
    float fadeIn  = smoothstep(0.0, 1.6, u.time_sec);
    float fadeOut = smoothstep(146.0, 143.2, u.time_sec);
    hdr *= (fadeIn * fadeOut);

    outHDR.write(float4(max(hdr, float3(0.0)), 1.0), gid);
}

// ============================================================================
// PASS 2: Half-Res HDR Anamorphic + Radial Bloom Kernel (960x540 RGBA16Float)
// ============================================================================
kernel void bloomKernel(
    texture2d<float, access::sample> inHDR [[texture(0)]],
    texture2d<float, access::write> outBloom [[texture(1)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint bw = outBloom.get_width();
    uint bh = outBloom.get_height();
    if (gid.x >= bw || gid.y >= bh) return;

    constexpr sampler samp(coord::normalized, address::clamp_to_edge, filter::linear);
    float2 uv = (float2(gid) + 0.5) / float2(bw, bh);
    float2 texel = 1.0 / float2(bw, bh);

    auto extractBright = [&](float2 p) -> float3 {
        float3 c = inHDR.sample(samp, clamp(p, 0.002, 0.998)).rgb;
        float lum = dot(c, float3(0.2126, 0.7152, 0.0722));
        float knee = smoothstep(0.68, 1.45, lum);
        return c * knee;
    };

    // Multi-ring radial glow + wide horizontal cinema anamorphic streak!
    float3 radial = extractBright(uv) * 0.18;
    const int RINGS = 3;
    for (int r = 1; r <= RINGS; ++r) {
        float rad = float(r) * 3.8;
        float w = 0.095 / float(r);
        for (int a = 0; a < 8; ++a) {
            float ang = float(a) * 0.78539816;
            float2 off = float2(cos(ang), sin(ang)) * texel * rad;
            radial += extractBright(uv + off) * w;
        }
    }

    // Anamorphic horizontal cinema flare (subtle sapphire/gold tint)
    float3 anamorphic = float3(0.0);
    for (int x = -8; x <= 8; ++x) {
        if (x == 0) continue;
        float w = exp(-abs(float(x)) * 0.28) * 0.055;
        anamorphic += extractBright(uv + float2(float(x) * 5.5 * texel.x, 0.0)) * w;
    }
    anamorphic *= float3(0.82, 0.95, 1.28);

    outBloom.write(float4(radial + anamorphic * 0.55, 1.0), gid);
}

// ============================================================================
// PASS 3: Final ACES Composite, Chromatic Aberration, Letterbox & Typography
// ============================================================================
kernel void compositeKernel(
    texture2d<float, access::sample> inHDR [[texture(0)]],
    texture2d<float, access::sample> inBloom [[texture(1)]],
    texture2d<float, access::sample> inText [[texture(2)]],
    texture2d<float, access::write> outRGBA [[texture(3)]],
    constant GPUUniforms& u [[buffer(0)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint width = outRGBA.get_width();
    uint height = outRGBA.get_height();
    if (gid.x >= width || gid.y >= height) return;

    constexpr sampler samp(coord::normalized, address::clamp_to_edge, filter::linear);
    float2 uv = (float2(gid) + 0.5) / float2(width, height);

    // Subtle edge RGB Chromatic Aberration on kicks & glitches
    float2 fromCenter = uv - 0.5;
    float caAmt = (0.0012 + u.kick_env * 0.0032 + u.glitch_trig * 0.0045) * dot(fromCenter, fromCenter) * 2.2;
    float r = inHDR.sample(samp, clamp(uv + fromCenter * caAmt, 0.001, 0.999)).r;
    float g = inHDR.sample(samp, uv).g;
    float b = inHDR.sample(samp, clamp(uv - fromCenter * caAmt, 0.001, 0.999)).b;
    float3 hdr = float3(r, g, b);

    // Add HDR Bloom
    float3 bloom = inBloom.sample(samp, uv).rgb;
    float bloomGain = 0.52 + 0.25 * u.chord_env + 0.20 * u.flash_white;
    hdr += bloom * bloomGain;

    // ACES Filmic Tone Mapping + Gamma to sRGB
    float3 sdr = acesToneMap(hdr * 0.96);
    sdr = pow(max(sdr, float3(0.0)), float3(1.0 / 2.2));

    // Optical Cinema Vignette + Subtle 35mm Film Grain (prevents H.264 dark banding!)
    float vig = 1.0 - 0.26 * dot(fromCenter, fromCenter) * 1.8;
    sdr *= vig;
    float grain = (hash21(uv * float2(width, height) + fract(u.time_sec * 37.0)) - 0.5) * 0.016;
    sdr = clamp(sdr + grain, 0.0, 1.0);

    // Dynamic CinemaScope Letterbox (2.39:1 = 12.2% top/bottom bars -> opens to 0% Full IMAX on Drops!)
    float barHeight = 0.122 * (1.0 - clamp(u.aspect_open, 0.0, 1.0));
    if (barHeight > 0.001) {
        float distTop = uv.y - barHeight;
        float distBot = (1.0 - barHeight) - uv.y;
        float minEdge = min(distTop, distBot);
        if (minEdge < 0.0) {
            sdr *= smoothstep(-0.003, 0.0, minEdge); // anti-aliased razor-sharp cinema matte!
        } else if (minEdge < 0.002 && u.aspect_open > 0.02 && u.aspect_open < 0.98) {
            // Subtle luminous gold/cyan hairline as the IMAX frame opens!
            sdr += float3(0.45, 0.85, 1.0) * (1.0 - minEdge / 0.002) * 0.45;
        }
    }

    // Alpha-Composite CoreText Editorial Typography & Poetic Lyrics Layer (premultiplied RGBA)
    float4 txt = inText.sample(samp, uv);
    sdr = sdr * (1.0 - txt.a) + txt.rgb;

    outRGBA.write(float4(clamp(sdr, 0.0, 1.0), 1.0), gid);
}
