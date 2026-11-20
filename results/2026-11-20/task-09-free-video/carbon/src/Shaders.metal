#include <metal_stdlib>
using namespace metal;

struct GPUUniforms {
    float4 uTime;       // x: time, y: dt, z: beat, w: barPhase
    float4 uAct;        // x: actIndex, y: actProgress, z: transitionFlash, w: masterFade
    float4 uAudio;      // x: kickEnv, y: snareEnv, z: bassEnv, w: padEnv
    float4 uAudio2;     // x: arpEnv, y: arpPitchNorm, z: riserEnv, w: masterEnergy
    float4 uCamPos;     // xyz: camPos, w: fovTanHalf
    float4 uCamRight;   // xyz: camRight, w: focalDist
    float4 uCamUp;      // xyz: camUp, w: aperture
    float4 uCamFwd;     // xyz: camFwd, w: bloomIntensity
    float4 uRes;        // x: W, y: H, z: 1/W, w: 1/H
};

struct Particle {
    float4 posAge;   // xyz: world pos, w: phase/seed (0..1)
    float4 velCol;   // xyz: velocity, w: colorHue (0..1)
};

// ============================================================================
// UTILITY & NOISE FUNCTIONS
// ============================================================================
inline float hash11(float p) {
    p = fract(p * 0.1031f);
    p *= p + 33.33f;
    p *= p + p;
    return fract(p);
}

inline float hash21(float2 p) {
    float3 p3 = fract(float3(p.xyx) * 0.1031f);
    p3 += dot(p3, p3.yzx + 33.33f);
    return fract((p3.x + p3.y) * p3.z);
}

inline float3 hash33(float3 p3) {
    p3 = fract(p3 * float3(0.1031f, 0.1030f, 0.0973f));
    p3 += dot(p3, p3.yxz + 33.33f);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
}

inline float noise3D(float3 p) {
    float3 i = floor(p);
    float3 f = fract(p);
    f = f * f * (3.0f - 2.0f * f);

    float n000 = dot(hash33(i + float3(0,0,0)) - 0.5f, f - float3(0,0,0));
    float n100 = dot(hash33(i + float3(1,0,0)) - 0.5f, f - float3(1,0,0));
    float n010 = dot(hash33(i + float3(0,1,0)) - 0.5f, f - float3(0,1,0));
    float n110 = dot(hash33(i + float3(1,1,0)) - 0.5f, f - float3(1,1,0));
    float n001 = dot(hash33(i + float3(0,0,1)) - 0.5f, f - float3(0,0,1));
    float n101 = dot(hash33(i + float3(1,0,1)) - 0.5f, f - float3(1,0,1));
    float n011 = dot(hash33(i + float3(0,1,1)) - 0.5f, f - float3(0,1,1));
    float n111 = dot(hash33(i + float3(1,1,1)) - 0.5f, f - float3(1,1,1));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z) + 0.5f;
}

inline float fbm3(float3 p) {
    float v = 0.0f;
    float a = 0.5f;
    float3x3 rot = float3x3(float3(0.00f, 0.80f, 0.60f),
                            float3(-0.80f, 0.36f, -0.48f),
                            float3(-0.60f, -0.48f, 0.64f));
    for (int i = 0; i < 4; ++i) {
        v += a * noise3D(p);
        p = rot * p * 2.03f;
        a *= 0.5f;
    }
    return v;
}

inline float2 rot2D(float2 p, float a) {
    float c = cos(a), s = sin(a);
    return float2(c * p.x - s * p.y, s * p.x + c * p.y);
}

inline float smin(float a, float b, float k) {
    float h = clamp(0.5f + 0.5f * (b - a) / k, 0.0f, 1.0f);
    return mix(b, a, h) - k * h * (1.0f - h);
}

inline float3 cosinePalette(float t, float3 a, float3 b, float3 c, float3 d) {
    return a + b * cos(6.2831853f * (c * t + d));
}

// ============================================================================
// PASS 0: INITIALIZE & UPDATE 262,144 GPU PARTICLES
// ============================================================================
kernel void init_particles(
    device Particle* particles [[buffer(0)]],
    uint gid [[thread_position_in_grid]]
) {
    if (gid >= 262144u) return;
    float u = float(gid) / 262144.0f;
    float golden = 2.39996323f * float(gid);
    float z = 1.0f - 2.0f * fract(u * 17.371f + 0.5f / 262144.0f);
    float rSphere = sqrt(max(0.0f, 1.0f - z * z));
    float rad = 1.45f + 0.95f * hash11(float(gid) * 1.17f);
    float3 pos = float3(cos(golden) * rSphere, z, sin(golden) * rSphere) * rad;

    Particle p;
    p.posAge = float4(pos, hash11(float(gid) * 3.71f));
    p.velCol = float4(0.0f, 0.0f, 0.0f, u);
    particles[gid] = p;
}

kernel void update_particles(
    device Particle* particles [[buffer(0)]],
    constant GPUUniforms& U [[buffer(1)]],
    uint gid [[thread_position_in_grid]]
) {
    if (gid >= 262144u) return;
    Particle p = particles[gid];
    float3 pos = p.posAge.xyz;
    float seed = p.posAge.w;
    float3 vel = p.velCol.xyz;
    float hue = p.velCol.w;

    float dt = min(U.uTime.y, 0.033f);
    float t = U.uTime.x;
    int act = int(U.uAct.x + 0.5f);
    float kick = U.uAudio.x;
    float arp = U.uAudio2.x;

    if (act == 0) {
        // Act I: Sleek inclined Saturn-like cymatic orbital rings around the Ferrofluid Core (keeps center orb unobstructed!)
        float ringSelect = step(0.5f, fract(seed * 13.7f));
        float targetR = mix(1.75f, 2.75f, fract(seed * 7.3f)) + 0.14f * sin(seed * 25.1f + t * 1.5f) + 0.12f * kick;
        // Tilt two orbital planes gracefully
        float3 ringNormal = normalize(ringSelect > 0.5f ? float3(0.22f, 1.0f, 0.12f) : float3(-0.28f, 1.0f, -0.18f));
        float planeDist = dot(pos, ringNormal);
        float3 inPlane = pos - ringNormal * planeDist;
        float rPlane = max(length(inPlane), 1e-4f);
        float3 radial = inPlane / rPlane;
        float3 tangent = normalize(cross(ringNormal, radial));

        float3 targetForce = radial * ((targetR - rPlane) * 5.0f)
                           - ringNormal * (planeDist * 9.0f)
                           + tangent * (1.8f + 0.9f * arp);
        vel = mix(vel, targetForce, dt * 4.0f);
        pos += vel * dt;
        hue = fract(0.55f + 0.12f * ringSelect + 0.08f * sin(seed * 6.28f + t * 0.5f));
    } else if (act == 1) {
        // Act II: 262,144 Strange Attractor (Lorenz -> Halvorsen/Aizawa dynamic morph!)
        float morph = smoothstep(0.28f, 0.86f, U.uAct.y);
        float3 lp = pos * 8.8f;
        lp.z += 25.0f;
        float sigma = 10.0f;
        float rho = 28.0f + 3.5f * kick;
        float beta = 8.0f / 3.0f;
        float3 dLorenz = float3(
            sigma * (lp.y - lp.x),
            lp.x * (rho - lp.z) - lp.y,
            lp.x * lp.y - beta * lp.z
        ) * 0.095f;

        // Aizawa chaotic torus-sphere vector field
        float3 ap = pos * 0.62f;
        float a = 0.95f, b = 0.7f, c = 0.6f, d = 3.5f, e = 0.25f, f = 0.1f;
        float3 dAizawa = float3(
            (ap.z - b) * ap.x - d * ap.y,
            d * ap.x + (ap.z - b) * ap.y,
            c + a * ap.z - (ap.z * ap.z * ap.z) / 3.0f - (ap.x * ap.x + ap.y * ap.y) * (1.0f + e * ap.z) + f * ap.z * ap.x * ap.x * ap.x
        ) * 1.45f;

        float3 flow = mix(dLorenz, dAizawa, morph) * (1.02f + 0.45f * kick + 0.30f * arp);
        vel = mix(vel, flow, 0.26f);
        pos += vel * dt * 1.12f;

        if (length(pos) > 5.8f || any(isnan(pos))) {
            float ang = seed * 62.8318f + t;
            pos = float3(cos(ang) * 0.85f, sin(ang) * 0.85f, sin(ang * 2.3f) * 0.6f);
            vel = float3(0.0f);
        }
        // Dual-wing hue: sapphire-cyan on -X wing -> molten amber-gold on +X wing!
        hue = clamp(0.5f + 0.38f * tanh(pos.x * 0.85f) + 0.10f * clamp(length(vel) * 0.15f, 0.0f, 1.0f), 0.05f, 0.95f);
    } else if (act == 2) {
        // Act III: Subtle cathedral dust motes drifting along the vaulted corridor
        float camZ = U.uCamPos.z;
        if (pos.z < camZ + 0.8f || pos.z > camZ + 17.5f || length(pos.xy) > 2.4f) {
            float ang = hash11(seed * 91.7f + floor(t * 2.0f)) * 6.2831853f;
            // Keep motes away from dead-center vanishing point so center stays crisp!
            float rad = 0.48f + 1.35f * hash11(seed * 47.3f);
            pos.xy = float2(cos(ang), sin(ang)) * rad;
            pos.z = camZ + 1.8f + fract(seed * 31.7f + t * 0.12f) * 15.0f;
            vel = float3(0.0f, 0.0f, -1.0f);
        }
        float swirl = sin(pos.z * 0.5f + t * 1.2f);
        vel.x = -pos.y * 0.35f * swirl;
        vel.y = pos.x * 0.35f * swirl + 0.15f * sin(t * 1.8f + seed * 12.0f);
        vel.z = -0.9f - 1.2f * arp - 0.8f * kick;
        pos += vel * dt;
        hue = (seed > 0.45f) ? 0.10f : 0.56f;
    } else if (act == 3) {
        // Act IV: Synaptic bioluminescent packets flowing along crystal lattice nodes!
        // 7 nodes: center (0,0,0) + 6 octahedron vertices at radius 2.25
        int nodeA = int(seed * 7.0f) % 7;
        int nodeB = (nodeA + 1 + int(fract(seed * 19.3f) * 5.0f)) % 7;
        float3 nodes[7] = {
            float3(0.0f, 0.0f, 0.0f),
            float3(2.25f, 0.0f, 0.0f),
            float3(-2.25f, 0.0f, 0.0f),
            float3(0.0f, 1.85f, 0.3f),
            float3(0.0f, -1.85f, -0.3f),
            float3(0.0f, 0.2f, 2.25f),
            float3(0.0f, -0.2f, -2.25f)
        };
        float rotA = t * 0.32f;
        float3 pA = nodes[nodeA];
        float3 pB = nodes[nodeB];
        pA.xz = rot2D(pA.xz, rotA);
        pB.xz = rot2D(pB.xz, rotA);

        if (seed < 0.72f) {
            // Synaptic stream particles traveling between crystal nodes!
            float travel = fract(seed * 23.1f + t * (0.45f + 0.35f * fract(seed * 7.7f)));
            float3 baseLine = mix(pA, pB, travel);
            float arch = sin(travel * 3.1415926f) * 0.28f;
            float3 jitter = float3(
                sin(seed * 113.0f + t * 3.0f),
                cos(seed * 79.0f + t * 2.7f),
                sin(seed * 53.0f - t * 3.3f)
            ) * (0.06f + 0.08f * kick) + float3(0, arch, 0);
            float3 target = baseLine + jitter;
            vel = (target - pos) * 8.0f;
            pos += vel * dt;
            hue = fract(0.75f + 0.35f * travel + 0.15f * arp);
        } else {
            // Ambient bokeh spores floating gently around crystal constellation
            float3 swirl = float3(-pos.z, sin(t + seed * 20.0f) * 0.4f, pos.x) * 0.35f;
            float r = length(pos);
            if (r > 4.5f || r < 0.4f) {
                pos = normalize(pos + 1e-4f) * (1.2f + 2.8f * fract(seed * 13.7f));
            }
            vel = mix(vel, swirl, dt * 2.0f);
            pos += vel * dt;
            hue = 0.52f + 0.35f * fract(seed * 5.3f);
        }
    } else if (act == 4) {
        // Act V: Relativistic Black Hole Accretion Spiral & Polar Jets!
        float rXZ = max(length(pos.xz), 0.1f);
        if (seed < 0.86f) {
            // Keplerian spiraling disk embers (omega ~ r^-1.5)
            if (rXZ < 0.92f || rXZ > 5.8f || abs(pos.y) > 0.85f) {
                float newR = 1.15f + 4.3f * fract(seed * 41.9f + t * 0.11f);
                float newAng = seed * 62.83f + t * 0.7f;
                pos = float3(cos(newAng) * newR, (fract(seed * 17.3f) - 0.5f) * 0.12f, sin(newAng) * newR);
            }
            float omega = 2.6f / pow(rXZ, 1.35f);
            float3 tang = normalize(float3(-pos.z, 0.0f, pos.x));
            float3 inward = -normalize(float3(pos.x, 0.0f, pos.z)) * (0.32f + 0.25f * kick);
            vel = tang * (omega * rXZ) + inward + float3(0.0f, -pos.y * 4.0f, 0.0f);
            pos += vel * dt;
            // Doppler-like hue: hotter near inner photon ring
            hue = clamp((rXZ - 1.0f) / 4.2f, 0.02f, 0.14f);
        } else {
            // Relativistic polar plasma jet particles along +-Y axis!
            float signY = (fract(seed * 29.0f) > 0.5f) ? 1.0f : -1.0f;
            if (abs(pos.y) > 4.8f || rXZ > 0.75f) {
                float ang = seed * 97.0f + t * 5.0f;
                float jr = 0.06f + 0.18f * fract(seed * 61.0f);
                pos = float3(cos(ang) * jr, signY * (0.55f + fract(seed * 13.0f) * 0.8f), sin(ang) * jr);
            }
            vel = float3(-pos.z * 4.5f + pos.x * 0.35f, signY * (4.2f + 2.0f * kick), pos.x * 4.5f + pos.z * 0.35f);
            pos += vel * dt;
            hue = 0.58f; // High-energy synchrotron blue-violet!
        }
    } else {
        // Act VI: Convergence into Organic Golden-Ratio Stardust Galaxy Crown!
        float idx = float(gid);
        float jitterA = (hash11(idx * 1.37f) - 0.5f) * 0.16f;
        float jitterR = (hash11(idx * 2.91f) - 0.5f) * 0.18f;
        float jitterY = (hash11(idx * 5.13f) - 0.5f) * 0.14f;
        float goldenAngle = idx * 2.39996323f + jitterA + t * 0.15f;
        float uNorm = idx / 262144.0f;
        float crownR = 0.55f + 2.85f * sqrt(uNorm) + jitterR;
        float spiralArms = 0.12f * sin(goldenAngle * 3.0f - crownR * 2.2f + t * 0.8f);
        float3 target = float3(
            cos(goldenAngle) * crownR,
            spiralArms + jitterY + 0.42f, // Elevated cleanly into upper canvas!
            sin(goldenAngle) * crownR
        );
        float tilt = 0.46f;
        float ct = cos(tilt), st = sin(tilt);
        target = float3(target.x, target.y * ct - target.z * st + 0.35f, target.y * st + target.z * ct);

        vel = (target - pos) * (2.6f + 1.8f * U.uAct.y);
        pos += vel * dt;
        hue = mix(0.10f, 0.58f, pow(uNorm, 0.7f)); // Champagne gold core -> sapphire outer halo
    }

    p.posAge.xyz = pos;
    p.velCol = float4(vel, hue);
    particles[gid] = p;
}

// ============================================================================
// PASS 1: RAYMARCHED / RELATIVISTIC 3D WORLDS PER ACT
// Writes float4(hdrRGB, linearSceneDepth)
// ============================================================================

// Act I SDF: Iridescent Spherical-Harmonic Ferrofluid Core + Precision Gyro Rings
inline float2 mapAct1(float3 p, float t, float kick, float bass, float arp) {
    // Ground mirror at y = -1.35
    float rFloor = length(p.xz);
    float ripple = 0.022f * sin(rFloor * 8.5f - t * 5.5f) * exp(-rFloor * 0.35f) * (0.45f + 0.9f * kick);
    float dFloor = p.y + 1.35f - ripple;

    // Central Spherical-Harmonic Sculptural Orb
    float3 q = p;
    q.xz = rot2D(q.xz, t * 0.45f);
    q.xy = rot2D(q.xy, t * 0.28f);
    float r = length(q);
    float3 n = q / max(r, 1e-4f);
    // Real L=4,5 spherical-harmonic-inspired lobes
    float harm1 = sin(5.0f * atan2(n.z, n.x) + t * 1.4f) * pow(max(0.0f, 1.0f - n.y * n.y), 1.5f);
    float harm2 = cos(6.0f * asin(clamp(n.y, -1.0f, 1.0f)) - t * 2.1f);
    float disp = (0.085f + 0.075f * bass + 0.055f * kick) * harm1 + (0.045f + 0.045f * arp) * harm2;
    float dOrb = (r - (0.86f + disp)) * 0.65f;

    // Twin precision titanium-gold gyroscopic rings
    float3 r1 = p;
    r1.xy = rot2D(r1.xy, 0.52f + t * 0.38f);
    r1.xz = rot2D(r1.xz, t * 0.55f);
    float dRing1 = length(float2(length(r1.xz) - 1.32f, r1.y)) - 0.022f;

    float3 r2 = p;
    r2.yz = rot2D(r2.yz, -0.68f + t * 0.31f);
    r2.xz = rot2D(r2.xz, -t * 0.42f);
    float dRing2 = length(float2(length(r2.xz) - 1.54f, r2.y)) - 0.016f;

    float dRings = min(dRing1, dRing2);

    float2 res = float2(dOrb, 1.0f); // mat 1: iridescent ferrofluid/crystal orb
    if (dRings < res.x) res = float2(dRings, 2.0f); // mat 2: emissive gold-titanium gyro
    if (dFloor < res.x) res = float2(dFloor, 3.0f); // mat 3: rippled obsidian mirror
    return res;
}

inline float3 calcNormalAct1(float3 p, float t, float kick, float bass, float arp) {
    const float2 e = float2(0.0018f, -0.0018f);
    return normalize(
        e.xyy * mapAct1(p + e.xyy, t, kick, bass, arp).x +
        e.yyx * mapAct1(p + e.yyx, t, kick, bass, arp).x +
        e.yxy * mapAct1(p + e.yxy, t, kick, bass, arp).x +
        e.xxx * mapAct1(p + e.xxx, t, kick, bass, arp).x
    );
}

// Act III SDF: Mandelbox / IFS Golden Cyber-Cathedral with guaranteed safe flight nave!
inline float2 mapAct3(float3 p, float t, float kick, float arp) {
    // Carve safe arched central cathedral corridor around x=0, y=0
    float2 naveXY = p.xy - float2(0.18f * sin(p.z * 0.18f), 0.12f * cos(p.z * 0.22f));
    float safeTunnel = 0.92f - length(naveXY * float2(1.0f, 0.78f));

    // Periodic architectural cathedral bay folding + Mandelbox iterations
    float3 z = p;
    z.z = fract(z.z * 0.25f) * 4.0f - 2.0f; // Seamless 4-unit vaulted bays!
    float4 w = float4(z, 1.0f);
    float scale = -2.58f + 0.06f * sin(t * 0.6f);
    float minR2 = 0.28f;
    float fixedR2 = 1.05f;
    float trap = 1e5f;

    for (int i = 0; i < 9; ++i) {
        w.xyz = clamp(w.xyz, -1.0f, 1.0f) * 2.0f - w.xyz;
        float r2 = dot(w.xyz, w.xyz);
        trap = min(trap, abs(w.y) + 0.35f * abs(w.x));
        if (r2 < minR2) {
            float m = fixedR2 / minR2;
            w *= m;
        } else if (r2 < fixedR2) {
            float m = fixedR2 / r2;
            w *= m;
        }
        w = w * scale + float4(z, 1.0f);
    }
    const float _unused = kick + arp; (void)_unused;
    float dFractal = (length(w.xyz) - 1.2f) / abs(w.w);
    // Smooth max to carve clean grand vaulted tunnel so camera NEVER hits geometry
    float dCarved = -smin(-dFractal, -safeTunnel, 0.22f);
    return float2(dCarved * 0.8f, trap);
}

// Act IV SDF: Constellation of 7 Refractive Octahedral Crystals + Synaptic Bridges
inline float sdOctahedron(float3 p, float s) {
    p = abs(p);
    float m = p.x + p.y + p.z - s;
    float3 q;
    if (3.0f * p.x < m) q = p.xyz;
    else if (3.0f * p.y < m) q = p.yzx;
    else if (3.0f * p.z < m) q = p.zxy;
    else return m * 0.57735027f;
    float k = clamp(0.5f * (q.z - q.y + s), 0.0f, s);
    return length(float3(q.x, q.y - s + k, q.z - k));
}

inline float sdCapsule(float3 p, float3 a, float3 b, float r) {
    float3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0f, 1.0f);
    return length(pa - ba * h) - r;
}

inline float3 mapAct4(float3 p, float t, float kick, float arp) {
    float rotA = t * 0.32f;
    float3 nodes[7] = {
        float3(0.0f, 0.0f, 0.0f),
        float3(2.25f, 0.0f, 0.0f),
        float3(-2.25f, 0.0f, 0.0f),
        float3(0.0f, 1.85f, 0.3f),
        float3(0.0f, -1.85f, -0.3f),
        float3(0.0f, 0.2f, 2.25f),
        float3(0.0f, -0.2f, -2.25f)
    };
    for (int i = 0; i < 7; ++i) {
        nodes[i].xz = rot2D(nodes[i].xz, rotA);
    }

    // Refractive bevelled crystal polyhedra
    float dCrystals = 1e5f;
    float closestIdx = 0.0f;
    for (int i = 0; i < 7; ++i) {
        float3 q = p - nodes[i];
        q.xz = rot2D(q.xz, t * (0.45f + 0.1f * float(i)) + float(i));
        q.xy = rot2D(q.xy, t * 0.33f - float(i) * 0.7f);
        float sz = (i == 0) ? (0.76f + 0.05f * kick) : (0.44f + 0.03f * arp);
        // Intersection of octahedron and sphere for jewel-like facets!
        float dOct = sdOctahedron(q, sz * 1.18f);
        float dSph = length(q) - sz * 0.92f;
        float dJewel = max(dOct, dSph);
        if (dJewel < dCrystals) {
            dCrystals = dJewel;
            closestIdx = float(i);
        }
    }

    // Thin glowing synaptic filaments connecting center (0) to outer 6 + ring edges
    float dFilaments = 1e5f;
    float pulseGlow = 0.0f;
    for (int i = 1; i < 7; ++i) {
        float3 a = nodes[0], b = nodes[i];
        float3 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0f, 1.0f);
        float dCap = length(pa - ba * h) - 0.014f;
        if (dCap < dFilaments) {
            dFilaments = dCap;
            float wave = fract(h * 2.0f - t * 1.8f + float(i) * 0.17f);
            pulseGlow = exp(-pow((wave - 0.5f) * 6.0f, 2.0f));
        }
    }
    int pairs[8][2] = {{1,3},{3,2},{2,4},{4,1},{1,5},{5,2},{2,6},{6,1}};
    for (int k = 0; k < 8; ++k) {
        float3 a = nodes[pairs[k][0]], b = nodes[pairs[k][1]];
        float3 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0f, 1.0f);
        float dCap = length(pa - ba * h) - 0.010f;
        if (dCap < dFilaments) {
            dFilaments = dCap;
            float wave = fract(h * 1.5f - t * 1.4f + float(k) * 0.23f);
            pulseGlow = exp(-pow((wave - 0.5f) * 5.0f, 2.0f));
        }
    }

    if (dCrystals < dFilaments) {
        return float3(dCrystals, 1.0f, closestIdx);
    } else {
        return float3(dFilaments, 2.0f, pulseGlow);
    }
}

// Starfield + Deep Space Nebula for Acts IV, V, VI
inline float3 sampleDeepCosmos(float3 dir, float t, float nebulaBoost) {
    // Crisp sparse pinpoint stars (cinema-grade dark velvet sky!)
    float3 starCell = floor(dir * 320.0f);
    float3 h = hash33(starCell);
    float3 starCenter = normalize(starCell + h);
    float angDist = length(dir - starCenter) * 320.0f;
    float starBright = smoothstep(0.968f, 0.9995f, h.x) * exp(-angDist * angDist * 26.0f);
    float3 starCol = mix(float3(0.62f, 0.78f, 1.0f), float3(1.0f, 0.84f, 0.62f), h.y) * starBright * 3.2f;

    // Second ultra-fine dust star layer
    float3 cell2 = floor(dir * 580.0f);
    float3 h2 = hash33(cell2 + 19.3f);
    float ang2 = length(dir - normalize(cell2 + h2)) * 580.0f;
    starCol += float3(0.70f, 0.82f, 1.0f) * smoothstep(0.982f, 0.9998f, h2.x) * exp(-ang2 * ang2 * 32.0f) * 1.4f;

    // Deep subtle galactic dust / nebula band
    float galBand = exp(-pow(dir.y * 2.6f + 0.35f * dir.x, 2.0f));
    float neb = fbm3(dir * 3.2f + float3(0.0f, 0.0f, t * 0.02f));
    float neb2 = fbm3(dir * 6.5f - float3(0.3f, 0.1f, 0.0f));
    float3 nebCol = mix(float3(0.008f, 0.018f, 0.048f), float3(0.065f, 0.028f, 0.095f), neb2) * neb * galBand * nebulaBoost;
    nebCol += float3(0.10f, 0.055f, 0.025f) * pow(neb, 3.2f) * galBand * 0.55f * nebulaBoost;
    return nebCol + starCol;
}

// Blackbody color curve for Relativistic Accretion Disk (Act V)
inline float3 blackbodyColor(float tempNorm) {
    // tempNorm 0 (outer crimson-amber) -> 1 (inner incandescent blue-white-gold)
    float3 cool = float3(0.85f, 0.14f, 0.02f);
    float3 mid  = float3(1.00f, 0.58f, 0.16f);
    float3 hot  = float3(1.00f, 0.94f, 0.84f);
    float3 blue = float3(0.74f, 0.88f, 1.18f);
    if (tempNorm < 0.45f) return mix(cool, mid, tempNorm / 0.45f);
    if (tempNorm < 0.82f) return mix(mid, hot, (tempNorm - 0.45f) / 0.37f);
    return mix(hot, blue, clamp((tempNorm - 0.82f) / 0.18f, 0.0f, 1.0f));
}

kernel void render_scene(
    texture2d<float, access::write> outScene [[texture(0)]],
    constant GPUUniforms& U [[buffer(0)]],
    uint2 gid [[thread_position_in_grid]]
) {
    if (gid.x >= uint(U.uRes.x) || gid.y >= uint(U.uRes.y)) return;

    float2 uv = (float2(gid) + 0.5f) * U.uRes.zw;
    float2 ndc = (uv * 2.0f - 1.0f);
    ndc.y = -ndc.y; // +Y up in 3D world
    float aspect = U.uRes.x * U.uRes.w;
    ndc.x *= aspect;

    float3 ro = U.uCamPos.xyz;
    float fovTan = U.uCamPos.w;
    float3 rd = normalize(U.uCamFwd.xyz + (ndc.x * U.uCamRight.xyz + ndc.y * U.uCamUp.xyz) * fovTan);

    float t = U.uTime.x;
    int act = int(U.uAct.x + 0.5f);
    float actProg = U.uAct.y;
    float kick = U.uAudio.x;
    float snare = U.uAudio.y;
    float bass = U.uAudio.z;
    float pad = U.uAudio.w;
    float arp = U.uAudio2.x;

    float3 col = float3(0.0f);
    float sceneDepth = 100.0f;

    if (act == 0) {
        // ====================================================================
        // ACT I: IGNITION // SPHERICAL HARMONIC FERROFLUID & OBSIDIAN MIRROR
        // ====================================================================
        // Atmospheric dark chamber background + top volumetric spotlight cone
        float spotAxis = max(0.0f, dot(rd, normalize(float3(0.0f, 0.25f, 1.0f))));
        col = float3(0.008f, 0.014f, 0.026f) + float3(0.02f, 0.04f, 0.08f) * pow(spotAxis, 4.0f);

        float dist = 0.0f;
        float hitMat = 0.0f;
        for (int i = 0; i < 90; ++i) {
            float3 p = ro + rd * dist;
            float2 d = mapAct1(p, t, kick, bass, arp);
            if (d.x < 0.0015f) {
                hitMat = d.y;
                break;
            }
            dist += d.x;
            if (dist > 22.0f) break;
        }

        if (hitMat > 0.5f) {
            sceneDepth = dist;
            float3 p = ro + rd * dist;
            float3 n = calcNormalAct1(p, t, kick, bass, arp);
            float3 v = -rd;
            float ndotv = max(0.0f, dot(n, v));
            float fresnel = pow(1.0f - ndotv, 4.0f);

            float3 lightPos1 = float3(2.8f, 3.8f, -2.2f);
            float3 lightPos2 = float3(-3.2f, 1.4f, 2.5f);
            float3 l1 = normalize(lightPos1 - p);
            float3 l2 = normalize(lightPos2 - p);
            float3 h1 = normalize(l1 + v);
            float3 h2 = normalize(l2 + v);

            if (hitMat < 1.5f) {
                // Mat 1: Iridescent Ferrofluid / Dichroic Liquid-Crystal Core
                float3 thinFilm = cosinePalette(
                    ndotv * 1.35f + p.y * 0.25f + t * 0.08f,
                    float3(0.45f, 0.48f, 0.55f),
                    float3(0.45f, 0.42f, 0.48f),
                    float3(1.0f, 1.0f, 1.0f),
                    float3(0.00f, 0.15f, 0.38f)
                );
                float spec1 = pow(max(0.0f, dot(n, h1)), 96.0f);
                float spec2 = pow(max(0.0f, dot(n, h2)), 48.0f);
                // Internal core bioluminescence pulsing on sub-bass & kick
                float coreGlow = pow(1.0f - ndotv, 2.2f) * (0.65f + 1.4f * kick + 0.8f * arp);
                col = thinFilm * (0.14f + 0.85f * fresnel)
                    + float3(1.0f, 0.88f, 0.72f) * spec1 * 2.8f
                    + float3(0.25f, 0.72f, 1.0f) * spec2 * 1.6f
                    + mix(float3(0.15f, 0.55f, 1.0f), float3(1.0f, 0.72f, 0.30f), 0.5f + 0.5f * sin(p.y * 4.0f - t * 2.0f)) * coreGlow;
            } else if (hitMat < 2.5f) {
                // Mat 2: Precision Brushed Gold-Titanium Gyro Rings
                float spec = pow(max(0.0f, dot(n, h1)), 64.0f);
                float pulse = 0.5f + 0.5f * sin(atan2(p.z, p.x) * 6.0f - t * 5.0f);
                col = float3(0.95f, 0.72f, 0.35f) * (0.35f + 1.4f * spec + 1.1f * pulse * (0.4f + arp));
            } else {
                // Mat 3: Rippled Dark Obsidian Mirror Floor — trace 1 bounce reflection!
                float3 reflDir = reflect(rd, n);
                float rDist = 0.04f;
                float rMat = 0.0f;
                for (int j = 0; j < 48; ++j) {
                    float3 rp = p + reflDir * rDist;
                    float2 d = mapAct1(rp, t, kick, bass, arp);
                    if (d.y < 2.5f && d.x < 0.003f) { rMat = d.y; break; }
                    rDist += max(d.x, 0.02f);
                    if (rDist > 10.0f) break;
                }
                float3 reflCol = float3(0.015f, 0.028f, 0.052f);
                if (rMat > 0.5f) {
                    reflCol = (rMat < 1.5f)
                        ? float3(0.32f, 0.68f, 1.15f) * (0.8f + 1.2f * kick)
                        : float3(1.1f, 0.8f, 0.38f);
                }
                // Concentric floor caustic grid rings
                float rFloor = length(p.xz);
                float caustic = exp(-abs(rFloor - 1.35f) * 3.2f) * (0.35f + 0.75f * kick);
                float radialGrid = smoothstep(0.985f, 0.999f, cos(rFloor * 6.28318f)) * exp(-rFloor * 0.25f) * 0.18f;
                col = float3(0.01f, 0.015f, 0.024f) + reflCol * (0.18f + 0.65f * fresnel)
                    + float3(0.25f, 0.62f, 1.0f) * caustic * 0.45f
                    + float3(0.4f, 0.65f, 0.95f) * radialGrid;
                // Distance fog on infinite obsidian mirror
                col = mix(col, float3(0.006f, 0.010f, 0.020f), smoothstep(4.0f, 16.0f, dist));
            }
        }

        // Volumetric Top God-Ray Shaft illuminating the core!
        float vol = 0.0f;
        for (int s = 0; s < 18; ++s) {
            float vt = 1.2f + float(s) * 0.38f;
            if (vt > sceneDepth) break;
            float3 vp = ro + rd * vt;
            float coneR = 0.85f + max(0.0f, (3.2f - vp.y)) * 0.38f;
            float inCone = exp(-dot(vp.xz, vp.xz) / (coneR * coneR)) * smoothstep(-1.5f, 2.8f, vp.y);
            vol += inCone * 0.024f;
        }
        col += float3(0.28f, 0.54f, 0.95f) * vol * (0.75f + 0.6f * pad + 0.4f * kick);
    }
    else if (act == 1) {
        // ====================================================================
        // ACT II: CHAOS & ORDER // OBSERVATORY CHAMBER FOR 262K ATTRACTOR
        // ====================================================================
        // Deep velvet sapphire-indigo cosmos + dual equilibrium core glows + precision floor grid
        float morph = smoothstep(0.25f, 0.85f, actProg);
        col = float3(0.006f, 0.010f, 0.022f) + sampleDeepCosmos(rd, t, 0.35f) * 0.45f;

        // Observatory floor plane at y = -2.65
        if (rd.y < -0.001f) {
            float tFloor = (-2.65f - ro.y) / rd.y;
            if (tFloor > 0.0f && tFloor < 28.0f) {
                sceneDepth = tFloor;
                float3 fp = ro + rd * tFloor;
                float rF = length(fp.xz);
                float ring1 = exp(-abs(rF - 1.8f) * 28.0f);
                float ring2 = exp(-abs(rF - 3.6f) * 28.0f);
                float gridX = exp(-abs(fract(fp.x * 0.5f + 0.5f) - 0.5f) * 55.0f);
                float gridZ = exp(-abs(fract(fp.z * 0.5f + 0.5f) - 0.5f) * 55.0f);
                float fade = exp(-rF * 0.18f);
                float3 gridCol = float3(0.12f, 0.38f, 0.75f) * max(gridX, gridZ) * 0.16f
                               + float3(0.85f, 0.65f, 0.30f) * (ring1 + ring2 * 0.6f) * (0.35f + 0.45f * kick);
                col = mix(col, col + gridCol * fade, fade);
            }
        }

        // Volumetric energy cores at Lorenz twin attractor foci / Aizawa center!
        float3 lobe1 = mix(float3(-0.88f, -0.88f, 0.2f), float3(0.0f, 0.0f, 0.0f), morph);
        float3 lobe2 = mix(float3(0.88f, 0.88f, 0.2f), float3(0.0f, 0.0f, 0.0f), morph);
        float dLine1 = length(cross(rd, lobe1 - ro));
        float dLine2 = length(cross(rd, lobe2 - ro));
        col += float3(0.12f, 0.52f, 1.0f) * exp(-dLine1 * dLine1 * 3.8f) * (0.28f + 0.35f * kick);
        col += float3(1.0f, 0.58f, 0.18f) * exp(-dLine2 * dLine2 * 3.8f) * (0.24f + 0.35f * arp);
    }
    else if (act == 2) {
        // ====================================================================
        // ACT III: INFINITE ARCHITECTURE // MANDELBOX GOLDEN CATHEDRAL
        // ====================================================================
        float dist = 0.0f;
        float hit = 0.0f;
        float trap = 1.0f;
        float glowAcc = 0.0f;

        for (int i = 0; i < 96; ++i) {
            float3 p = ro + rd * dist;
            float2 res = mapAct3(p, t, kick, arp);
            glowAcc += exp(-res.x * 14.0f) * 0.0022f;
            if (res.x < 0.0020f) {
                hit = 1.0f;
                trap = res.y;
                break;
            }
            dist += res.x;
            if (dist > 26.0f) break;
        }

        // Deep dramatic chiaroscuro cathedral atmosphere: midnight sapphire into warm distant sanctuary glow
        float centerShaft = exp(-length(rd.xy - float2(0.0f, 0.04f)) * 3.8f);
        float3 fogHorizon = mix(float3(0.007f, 0.014f, 0.032f), float3(0.20f, 0.11f, 0.04f), centerShaft);
        col = fogHorizon;

        if (hit > 0.5f) {
            sceneDepth = dist;
            float3 p = ro + rd * dist;
            const float2 e = float2(0.0022f, -0.0022f);
            float3 n = normalize(
                e.xyy * mapAct3(p + e.xyy, t, kick, arp).x +
                e.yyx * mapAct3(p + e.yyx, t, kick, arp).x +
                e.yxy * mapAct3(p + e.yxy, t, kick, arp).x +
                e.xxx * mapAct3(p + e.xxx, t, kick, arp).x
            );

            // Fast 4-tap Ambient Occlusion for crisp architectural relief!
            float ao = 0.0f;
            float aoScale = 1.0f;
            for (int k = 1; k <= 4; ++k) {
                float h = 0.06f * float(k);
                float d = mapAct3(p + n * h, t, kick, arp).x;
                ao += (h - d) * aoScale;
                aoScale *= 0.55f;
            }
            ao = clamp(1.0f - 2.8f * ao, 0.04f, 1.0f);

            // Dual moving sanctuary lights (warm amber ahead + cool cyan rim behind)
            float3 lightPos = ro + float3(0.0f, 0.42f, 4.2f);
            float3 lDir = normalize(lightPos - p);
            float lDist = length(lightPos - p);
            float atten = 1.0f / (1.0f + 0.14f * lDist * lDist);
            float diff = max(0.0f, dot(n, lDir));
            float3 hVec = normalize(lDir - rd);
            float spec = pow(max(0.0f, dot(n, hVec)), 56.0f);
            float fres = pow(1.0f - max(0.0f, dot(n, -rd)), 4.0f);

            // Dark carved obsidian-bronze stone + razor-sharp golden/cyan filigree circuit veins!
            float3 baseAlbedo = mix(float3(0.025f, 0.032f, 0.048f), float3(0.11f, 0.085f, 0.060f), clamp(trap * 0.7f, 0.0f, 1.0f));
            float veinMask = exp(-trap * 14.5f);
            float zPulse = 0.5f + 0.5f * sin(p.z * 2.4f - t * 5.5f);
            float3 veinEmissive = mix(float3(1.15f, 0.68f, 0.18f), float3(0.16f, 0.78f, 1.15f), step(0.68f, fract(p.z * 0.5f)))
                                * veinMask * (0.75f + 1.25f * zPulse * (0.35f + arp + kick));

            col = baseAlbedo * (diff * float3(1.1f, 0.82f, 0.55f) * 2.0f * atten + float3(0.03f, 0.055f, 0.10f)) * ao
                + float3(1.0f, 0.82f, 0.58f) * spec * 1.45f * atten * ao
                + float3(0.16f, 0.45f, 0.88f) * fres * 0.28f * ao
                + veinEmissive * ao;

            // Atmospheric perspective into distant cathedral vault
            float fog = 1.0f - exp(-dist * 0.075f);
            col = mix(col, fogHorizon * (1.0f + 0.35f * pad), fog);
        }
        col += float3(0.95f, 0.65f, 0.28f) * glowAcc * (0.45f + 0.45f * kick);
    }
    else if (act == 3) {
        // ====================================================================
        // ACT IV: NEURAL OPTICS // CAUCHY REFRACTIVE CRYSTAL CONSTELLATION
        // ====================================================================
        col = sampleDeepCosmos(rd, t, 1.15f);

        float dist = 0.0f;
        float3 hitInfo = float3(0.0f);
        float filamentGlow = 0.0f;

        for (int i = 0; i < 84; ++i) {
            float3 p = ro + rd * dist;
            float3 res = mapAct4(p, t, kick, arp);
            if (res.y > 1.5f) {
                filamentGlow += exp(-res.x * 26.0f) * (0.020f + 0.045f * res.z);
            } else {
                filamentGlow += exp(-res.x * 10.0f) * 0.005f;
            }
            if (res.x < 0.0018f) {
                hitInfo = float3(1.0f, res.y, res.z);
                break;
            }
            dist += res.x;
            if (dist > 18.0f) break;
        }

        if (hitInfo.x > 0.5f) {
            sceneDepth = dist;
            float3 p = ro + rd * dist;
            const float2 e = float2(0.0016f, -0.0016f);
            float3 n = normalize(
                e.xyy * mapAct4(p + e.xyy, t, kick, arp).x +
                e.yyx * mapAct4(p + e.yyx, t, kick, arp).x +
                e.yxy * mapAct4(p + e.yxy, t, kick, arp).x +
                e.xxx * mapAct4(p + e.xxx, t, kick, arp).x
            );

            if (hitInfo.y < 1.5f) {
                // Cauchy Chromatic Dispersion Refraction (separate R, G, B Snell rays!)
                float3 v = -rd;
                float fresnel = 0.06f + 0.94f * pow(1.0f - max(0.0f, dot(n, v)), 4.5f);
                float3 reflDir = reflect(rd, n);
                float3 reflEnv = sampleDeepCosmos(reflDir, t, 1.5f)
                               + float3(1.0f, 0.92f, 0.80f) * pow(max(0.0f, dot(reflDir, normalize(float3(1.0f, 1.4f, -0.8f)))), 64.0f) * 4.0f;

                float3 refrR = refract(rd, n, 1.0f / 1.47f);
                float3 refrG = refract(rd, n, 1.0f / 1.52f);
                float3 refrB = refract(rd, n, 1.0f / 1.59f);

                // Internal crystal lattice caustics + background dispersion
                float intR = sin(dot(p + refrR * 0.8f, float3(7.0f, 9.0f, 5.0f)) + t * 2.0f) * 0.5f + 0.5f;
                float intG = sin(dot(p + refrG * 0.8f, float3(7.0f, 9.0f, 5.0f)) + t * 2.0f + 0.6f) * 0.5f + 0.5f;
                float intB = sin(dot(p + refrB * 0.8f, float3(7.0f, 9.0f, 5.0f)) + t * 2.0f + 1.2f) * 0.5f + 0.5f;

                float3 envR = sampleDeepCosmos(refrR, t, 1.6f);
                float3 envG = sampleDeepCosmos(refrG, t, 1.6f);
                float3 envB = sampleDeepCosmos(refrB, t, 1.6f);
                float3 dispersed = float3(envR.r, envG.g, envB.b) * 2.4f
                                 + float3(pow(intR, 4.0f), pow(intG, 4.0f), pow(intB, 4.0f)) * (0.9f + 1.2f * arp);

                // Facet edge highlight
                float3 crystalTint = (hitInfo.z < 0.5f) ? float3(1.0f, 0.86f, 0.65f) : float3(0.68f, 0.88f, 1.0f);
                col = mix(dispersed * crystalTint, reflEnv, fresnel);
            } else {
                // Synaptic laser bridge core
                float pulse = hitInfo.z;
                col = mix(float3(0.35f, 0.65f, 1.2f), float3(1.6f, 1.15f, 0.55f), pulse) * (1.2f + 2.2f * pulse + 1.2f * arp);
            }
        }
        col += mix(float3(0.28f, 0.55f, 1.15f), float3(1.1f, 0.65f, 1.0f), 0.5f + 0.5f * sin(t)) * filamentGlow * (0.85f + 0.7f * arp);
    }
    else if (act == 4) {
        // ====================================================================
        // ACT V: EVENT HORIZON // RELATIVISTIC BLACK HOLE GEODESIC RAYMARCHER
        // ====================================================================
        const float rs = 0.68f; // Schwarzschild radius
        float3 pos = ro;
        float3 dir = rd;
        // Specific angular momentum squared h^2 = |r x v|^2
        float3 hVec = cross(pos, dir);
        float h2 = dot(hVec, hVec);

        float3 diskAccum = float3(0.0f);
        float transmittance = 1.0f;
        bool captured = false;
        float minR = 100.0f;

        for (int step = 0; step < 104; ++step) {
            float r2 = dot(pos, pos);
            float r = sqrt(r2);
            minR = min(minR, r);
            if (r < rs * 1.02f) {
                captured = true;
                sceneDepth = min(sceneDepth, length(pos - ro));
                break;
            }
            if (r > 18.0f && dot(pos, dir) > 0.0f) {
                break;
            }

            // Adaptive step size: fine near photon sphere and equatorial plane (y = 0)
            float dtStep = clamp(0.040f * (r - rs * 0.88f), 0.014f, 0.32f);
            dtStep = min(dtStep, max(0.018f, abs(pos.y) * 0.52f));

            // General Relativistic photon geodesic deflection (unnormalized affine tangent preserves exact photon sphere!)
            float3 accel = -1.5f * rs * h2 * pos / (r2 * r2 * r + 1e-5f);
            float3 nextDir = dir + accel * dtStep;
            float3 nextPos = pos + 0.5f * (dir + nextDir) * dtStep;

            // Check volumetric Equatorial Accretion Disk (|y| < diskHalfHeight, r in [1.65*rs .. 7.4*rs])
            float midY = 0.5f * (pos.y + nextPos.y);
            float3 midP = 0.5f * (pos + nextPos);
            float diskR = length(midP.xz);
            float rInner = rs * 1.68f;
            float rOuter = rs * 7.40f;

            if (diskR > rInner && diskR < rOuter && abs(midY) < 0.15f) {
                float radialNorm = (diskR - rInner) / (rOuter - rInner);
                float vertFade = exp(-pow(midY / (0.024f + 0.050f * radialNorm), 2.0f));
                float radialWindow = smoothstep(0.0f, 0.08f, radialNorm) * pow(1.0f - radialNorm, 1.55f);

                // Crisp multi-filament Keplerian differential shear rings (Interstellar Gargantua detail!)
                float angle = atan2(midP.z, midP.x);
                float omega = 3.4f / pow(diskR, 1.4f);
                float shearedAngle = angle + t * omega;
                float fineRings = 0.5f + 0.5f * sin(diskR * 28.0f - t * 2.5f + 2.8f * fbm3(float3(midP.xz * 2.6f, t * 0.3f)));
                float fineStreaks = 0.45f + 0.55f * sin(diskR * 52.0f + sin(shearedAngle * 3.0f) * 2.0f);
                float3 swirlCoord = float3(cos(shearedAngle) * diskR * 2.2f, diskR * 6.5f, sin(shearedAngle) * diskR * 2.2f);
                float turb = pow(clamp(fbm3(swirlCoord), 0.0f, 1.0f), 1.45f);
                float density = vertFade * radialWindow * (0.18f + 1.35f * turb * fineRings * fineStreaks) * (1.0f + 0.28f * kick);

                if (density > 0.002f) {
                    // Relativistic Doppler Beaming: controlled HDR range so fiery orange-gold filaments stay razor-sharp!
                    float3 plasmaVelDir = normalize(float3(-midP.z, 0.0f, midP.x));
                    float betaOrb = clamp(sqrt(0.5f * rs / max(diskR, rs)), 0.0f, 0.56f);
                    float gamma = 1.0f / sqrt(1.0f - betaOrb * betaOrb);
                    float cosTheta = dot(plasmaVelDir, -dir);
                    float doppler = 1.0f / (gamma * (1.0f - betaOrb * cosTheta));
                    float beamBoost = pow(clamp(doppler, 0.40f, 1.48f), 2.35f);

                    float temp = clamp((0.92f - radialNorm * 0.85f) * pow(doppler, 0.55f), 0.04f, 0.96f);
                    float3 emitCol = blackbodyColor(temp) * beamBoost * (1.35f + 0.55f * snare + 0.45f * arp);

                    float alpha = 1.0f - exp(-density * dtStep * 5.8f);
                    diskAccum += transmittance * emitCol * alpha;
                    transmittance *= (1.0f - alpha * 0.90f);
                    sceneDepth = min(sceneDepth, length(midP - ro));
                }
            }

            // Relativistic Polar Synchrotron Jets along +-Y axis!
            float jetR = length(midP.xz);
            float absY = abs(midP.y);
            float jetWidth = 0.065f + absY * 0.085f;
            if (absY > rs * 0.95f && absY < 5.5f && jetR < jetWidth * 2.2f) {
                float jetProfile = exp(-pow(jetR / jetWidth, 2.0f)) * exp(-absY * 0.48f);
                float jetNoise = 0.55f + 0.6f * noise3D(float3(midP.xz * 8.0f, absY * 2.5f - t * 7.0f));
                diskAccum += transmittance * float3(0.32f, 0.62f, 1.25f) * jetProfile * jetNoise * dtStep * (0.65f + 0.55f * kick);
            }

            if (transmittance < 0.015f) break;
            pos = nextPos;
            dir = nextDir;
        }

        if (!captured) {
            float3 exitDir = normalize(dir);
            float3 bg = sampleDeepCosmos(exitDir, t, 1.25f);
            // Exact photon-sphere grazing halo hugging the black shadow silhouette!
            float graze = max(0.0f, minR - rs * 1.50f);
            float photonRing = exp(-graze * 24.0f) * smoothstep(rs * 1.01f, rs * 1.48f, minR);
            bg += float3(1.45f, 1.08f, 0.72f) * photonRing * 1.35f;
            col = diskAccum + transmittance * bg;
        } else {
            col = diskAccum;
        }
    }
    else {
        // ====================================================================
        // ACT VI: CONVERGENCE // CELESTIAL HARMONIC ASTROLABE & STARDUST CROWN
        // ====================================================================
        col = sampleDeepCosmos(rd, t, 0.85f * (1.0f - 0.5f * actProg));

        // Elevated sculptural center (y = +0.52) so bottom manifesto card sits in clean starry negative space!
        float3 centerOffset = float3(0.0f, 0.52f, 0.0f);
        float dist = 0.0f;
        float hitMat = 0.0f;
        float glow = 0.0f;
        for (int i = 0; i < 76; ++i) {
            float3 p = (ro + rd * dist) - centerOffset;
            float dCore = length(p) - (0.30f + 0.018f * sin(t * 2.0f));
            float dRings = 1e5f;
            for (int k = 0; k < 4; ++k) {
                float fk = float(k);
                float rad = 0.64f * pow(1.30f, fk);
                float3 rq = p;
                rq.xy = rot2D(rq.xy, (0.32f + 0.16f * fk) * sin(t * 0.25f + fk) + 0.28f);
                rq.xz = rot2D(rq.xz, t * (0.22f - 0.04f * fk) * ((k % 2 == 0) ? 1.0f : -1.0f));
                rq.yz = rot2D(rq.yz, 0.36f * cos(fk * 1.7f + t * 0.18f));
                float dT = length(float2(length(rq.xz) - rad, rq.y)) - (0.013f + 0.0025f * fk);
                dRings = min(dRings, dT);
            }
            float dMin = min(dCore, dRings);
            glow += exp(-dCore * 5.2f) * 0.014f + exp(-dRings * 18.0f) * 0.006f;
            if (dMin < 0.0018f) {
                hitMat = (dCore < dRings) ? 1.0f : 2.0f;
                break;
            }
            dist += dMin;
            if (dist > 18.0f) break;
        }

        if (hitMat > 0.5f) {
            sceneDepth = dist;
            float3 p = (ro + rd * dist) - centerOffset;
            float3 n = normalize(p);
            if (hitMat > 1.5f) {
                col = float3(1.12f, 0.88f, 0.52f) * (0.75f + 0.5f * pad);
            } else {
                float fres = pow(1.0f - max(0.0f, dot(n, -rd)), 3.0f);
                col = mix(float3(1.15f, 1.02f, 0.85f), float3(0.55f, 0.80f, 1.18f), fres) * 1.25f;
            }
        }
        col += float3(1.0f, 0.84f, 0.58f) * glow * (0.70f + 0.40f * pad);
    }

    outScene.write(float4(max(col, 0.0f), sceneDepth), gid);
}

// ============================================================================
// PASS 2: HARDWARE ADDITIVE BOKEH PARTICLE RENDER PASS (262,144 INSTANCES)
// ============================================================================
struct ParticleVaryings {
    float4 position [[position]];
    float2 quadUV;
    float3 color;
    float linearDepth;
    float cocRadiusPx;
};

vertex ParticleVaryings vertex_particle(
    uint vid [[vertex_id]],
    uint iid [[instance_id]],
    const device Particle* particles [[buffer(0)]],
    constant GPUUniforms& U [[buffer(1)]]
) {
    ParticleVaryings out;
    Particle p = particles[iid];
    float3 worldPos = p.posAge.xyz;
    float seed = p.posAge.w;
    float hue = p.velCol.w;

    float3 rel = worldPos - U.uCamPos.xyz;
    float zCam = dot(rel, U.uCamFwd.xyz);

    // Cull behind camera
    if (zCam <= 0.12f) {
        out.position = float4(2.0f, 2.0f, 2.0f, 1.0f);
        out.quadUV = float2(0.0f);
        out.color = float3(0.0f);
        out.linearDepth = 0.0f;
        out.cocRadiusPx = 1.0f;
        return out;
    }

    float aspect = U.uRes.x * U.uRes.w;
    float fovTan = U.uCamPos.w;
    float xNdc = dot(rel, U.uCamRight.xyz) / (zCam * fovTan * aspect);
    float yNdc = dot(rel, U.uCamUp.xyz) / (zCam * fovTan);

    // Cull off-screen with margin for wide bokeh discs
    if (abs(xNdc) > 1.18f || abs(yNdc) > 1.18f) {
        out.position = float4(2.0f, 2.0f, 2.0f, 1.0f);
        out.quadUV = float2(0.0f);
        out.color = float3(0.0f);
        out.linearDepth = 0.0f;
        out.cocRadiusPx = 1.0f;
        return out;
    }

    // Physical Circle of Confusion (Depth-of-Field Bokeh!)
    float focalDist = U.uCamRight.w;
    float aperture = U.uCamUp.w;
    float defocus = abs(zCam - focalDist) / max(zCam, 0.35f);
    float basePx = (1.55f + 1.4f * seed) * (4.2f / max(zCam, 1.0f));
    float cocPx = clamp(basePx + defocus * aperture * 420.0f, 1.35f, 26.0f);

    float2 corners[4] = {
        float2(-1.0f, -1.0f),
        float2( 1.0f, -1.0f),
        float2(-1.0f,  1.0f),
        float2( 1.0f,  1.0f)
    };
    float2 q = corners[vid];
    float2 offsetNdc = q * cocPx * float2(2.0f * U.uRes.z, 2.0f * U.uRes.w);

    out.position = float4(xNdc + offsetNdc.x, yNdc + offsetNdc.y, 0.5f, 1.0f);
    out.quadUV = q;
    out.linearDepth = zCam;
    out.cocRadiusPx = cocPx;

    // Rich cinematic palette per Act
    int act = int(U.uAct.x + 0.5f);
    float3 baseCol;
    if (act == 1) {
        // Strange Attractor: vivid electric sapphire-cyan wing <-> molten amber-gold wing!
        baseCol = mix(float3(0.10f, 0.62f, 1.45f), float3(1.45f, 0.62f, 0.14f), smoothstep(0.28f, 0.72f, hue));
    } else if (act == 4) {
        baseCol = (hue > 0.4f) ? float3(0.32f, 0.68f, 1.35f) : mix(float3(1.3f, 0.42f, 0.10f), float3(1.2f, 0.92f, 0.65f), hue * 6.0f);
    } else {
        baseCol = cosinePalette(
            hue,
            float3(0.58f, 0.56f, 0.62f),
            float3(0.45f, 0.42f, 0.42f),
            float3(1.0f, 1.0f, 1.0f),
            float3(0.00f, 0.12f, 0.32f)
        );
    }

    // Energy conservation & tuned per-act particle density balance
    float areaNorm = 4.2f / (cocPx * cocPx + 3.4f);
    float actBoost = 0.65f;
    if (act == 0) actBoost = 0.28f;      // Subtle Saturn cymatic rings around sleek ferrofluid orb
    else if (act == 1) actBoost = 0.76f; // Rich saturated twin-wing Strange Attractor
    else if (act == 2) actBoost = 0.22f; // Delicate cathedral dust motes (preserves crisp fractal walls!)
    else if (act == 3) actBoost = 0.58f; // Crisp synaptic streams between crystals
    else if (act == 4) actBoost = 0.38f; // Subtle relativistic embers around Gargantua
    else actBoost = 0.56f;               // Silky stardust galaxy crown

    float audioPulse = 1.0f + 0.40f * U.uAudio.x + 0.30f * U.uAudio2.x;
    out.color = baseCol * areaNorm * actBoost * audioPulse;
    return out;
}

fragment float4 fragment_particle(
    ParticleVaryings in [[stage_in]],
    texture2d<float, access::sample> sceneTex [[texture(0)]]
) {
    float r2 = dot(in.quadUV, in.quadUV);
    if (r2 > 1.0f) discard_fragment();

    constexpr sampler s(coord::pixel, filter::nearest, address::clamp_to_edge);
    float sceneDepth = sceneTex.sample(s, in.position.xy).a;

    // Soft 3D occlusion behind solid raymarched surfaces!
    float vis = smoothstep(in.linearDepth - 0.18f, in.linearDepth + 0.04f, sceneDepth);
    if (vis <= 0.005f) discard_fragment();

    float r = sqrt(r2);
    // Optical bokeh profile: bright sharp core when in-focus, soft catadioptric bokeh disc when defocused!
    float defocusMix = smoothstep(3.5f, 12.0f, in.cocRadiusPx);
    float sharpProfile = exp(-r2 * 4.2f);
    float ringBokeh = smoothstep(1.0f, 0.82f, r) * (0.48f + 0.52f * smoothstep(0.35f, 0.86f, r));
    float shape = mix(sharpProfile, ringBokeh, defocusMix);

    return float4(in.color * shape * vis, 0.0f);
}

// ============================================================================
// PASS 3 & 4: HDR BLOOM + ANAMORPHIC STREAK DOWNSAMPLE & BLUR
// ============================================================================
kernel void bloom_threshold_downsample(
    texture2d<float, access::sample> srcScene [[texture(0)]],
    texture2d<float, access::sample> srcParticles [[texture(1)]],
    texture2d<float, access::write> dstBloom [[texture(2)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint w = dstBloom.get_width();
    uint h = dstBloom.get_height();
    if (gid.x >= w || gid.y >= h) return;

    constexpr sampler s(coord::normalized, filter::linear, address::clamp_to_edge);
    float2 uv = (float2(gid) + 0.5f) / float2(w, h);
    float2 texel = 1.0f / float2(w, h);

    // 5-tap Jimenez downsample on combined HDR (scene + particles)
    float2 offs[5] = {
        float2(0.0f, 0.0f),
        float2(-0.5f, -0.5f),
        float2( 0.5f, -0.5f),
        float2(-0.5f,  0.5f),
        float2( 0.5f,  0.5f)
    };
    float weights[5] = { 0.5f, 0.125f, 0.125f, 0.125f, 0.125f };
    float3 sum = float3(0.0f);
    for (int i = 0; i < 5; ++i) {
        float2 suv = uv + offs[i] * texel;
        float3 hdr = srcScene.sample(s, suv).rgb + srcParticles.sample(s, suv).rgb;
        // Soft knee highlight threshold at luminance > 0.72
        float lum = dot(hdr, float3(0.2126f, 0.7152f, 0.0722f));
        float knee = smoothstep(0.55f, 1.45f, lum);
        sum += min(hdr, float3(12.0f)) * knee * weights[i];
    }
    dstBloom.write(float4(sum, 1.0f), gid);
}

kernel void bloom_blur_pass(
    texture2d<float, access::sample> srcTex [[texture(0)]],
    texture2d<float, access::write> dstTex [[texture(1)]],
    constant float2& dirStep [[buffer(0)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint w = dstTex.get_width();
    uint h = dstTex.get_height();
    if (gid.x >= w || gid.y >= h) return;

    constexpr sampler s(coord::normalized, filter::linear, address::clamp_to_edge);
    float2 uv = (float2(gid) + 0.5f) / float2(w, h);

    // 9-tap Gaussian + subtle horizontal anamorphic stretch when dirStep.y == 0
    const float weights[5] = { 0.227027f, 0.1945946f, 0.1216216f, 0.054054f, 0.016216f };
    float3 acc = srcTex.sample(s, uv).rgb * weights[0];
    for (int i = 1; i < 5; ++i) {
        float2 off = dirStep * float(i) * 1.65f;
        acc += srcTex.sample(s, uv + off).rgb * weights[i];
        acc += srcTex.sample(s, uv - off).rgb * weights[i];
    }
    dstTex.write(float4(acc, 1.0f), gid);
}

// ============================================================================
// PASS 5: MASTER COMPOSITE (HDR SCENE + PARTICLES + BLOOM + HUD + ACES + DITHER)
// Outputs BGRA8Unorm sRGB-ready master frame!
// ============================================================================
inline float3 acesFilmic(float3 x) {
    const float a = 2.51f;
    const float b = 0.03f;
    const float c = 2.43f;
    const float d = 0.59f;
    const float e = 0.14f;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0f, 1.0f);
}

kernel void composite_final(
    texture2d<float, access::sample> sceneTex [[texture(0)]],
    texture2d<float, access::sample> particleTex [[texture(1)]],
    texture2d<float, access::sample> bloomFineTex [[texture(2)]],
    texture2d<float, access::sample> bloomWideTex [[texture(3)]],
    texture2d<float, access::sample> hudTex [[texture(4)]],
    texture2d<float, access::write> outBGRA [[texture(5)]],
    constant GPUUniforms& U [[buffer(0)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint w = uint(U.uRes.x);
    uint h = uint(U.uRes.y);
    if (gid.x >= w || gid.y >= h) return;

    constexpr sampler s(coord::normalized, filter::linear, address::clamp_to_edge);
    float2 uv = (float2(gid) + 0.5f) * U.uRes.zw;
    float2 centered = uv - 0.5f;
    float r2 = dot(centered, centered);

    // Subtle optical chromatic dispersion only near extreme lens corners
    float caAmount = r2 * 0.0018f * (1.0f + 0.8f * U.uAudio.x);
    float2 uvR = 0.5f + centered * (1.0f + caAmount);
    float2 uvB = 0.5f + centered * (1.0f - caAmount);

    float3 hdr;
    hdr.r = sceneTex.sample(s, uvR).r + particleTex.sample(s, uvR).r;
    hdr.g = sceneTex.sample(s, uv).g  + particleTex.sample(s, uv).g;
    hdr.b = sceneTex.sample(s, uvB).b + particleTex.sample(s, uvB).b;

    // Multi-scale physical bloom + subtle horizontal cyan/gold anamorphic flare
    float3 bloom = bloomFineTex.sample(s, uv).rgb * 0.65f + bloomWideTex.sample(s, uv).rgb * 0.85f;
    hdr += bloom * U.uCamFwd.w;

    // Act boundary optical transition flash (warm gold-white bloom pulse)
    float flash = U.uAct.z;
    if (flash > 0.001f) {
        hdr += mix(float3(0.65f, 0.82f, 1.15f), float3(1.25f, 1.05f, 0.82f), 0.6f) * flash * 2.2f;
    }

    // Subtle cinema lens vignette
    float vignette = 1.0f - 0.34f * r2;
    hdr *= vignette;

    // ACES Filmic Tonemapping + Gamma to Display sRGB
    float3 mapped = acesFilmic(hdr * 0.96f);
    float3 srgb = pow(max(mapped, 0.0f), float3(1.0f / 2.2f));

    // Composite CoreGraphics/CoreText HUD & Kinetic Typography (premultiplied RGBA in sRGB space!)
    float4 hud = hudTex.sample(s, uv);
    // Add subtle optical glow behind bright HUD elements
    float4 hudBlur1 = hudTex.sample(s, uv + float2(2.5f * U.uRes.z, 0.0f));
    float4 hudBlur2 = hudTex.sample(s, uv - float2(2.5f * U.uRes.z, 0.0f));
    float3 hudHalo = (hudBlur1.rgb + hudBlur2.rgb) * 0.08f;
    srgb = clamp(srgb * (1.0f - hud.a) + hud.rgb + hudHalo * (1.0f - hud.a), 0.0f, 1.0f);

    // Master Fade-in (first 0.6s) & Master Fade-out to clean cinema black (final 1.2s)
    srgb *= U.uAct.w;

    // Triangular PDF Dithering (+- 1/255) to eliminate 8-bit H.264 dark-space banding!
    float dither = (hash21(float2(gid) + fract(U.uTime.x * 13.7f)) + hash21(float2(gid) * 1.7f + 7.1f) - 1.0f) / 255.0f;
    srgb = clamp(srgb + dither, 0.0f, 1.0f);

    // Write RGBA (texture format bgra8Unorm swizzles float4(r,g,b,a) automatically in Metal!)
    outBGRA.write(float4(srgb, 1.0f), gid);
}
