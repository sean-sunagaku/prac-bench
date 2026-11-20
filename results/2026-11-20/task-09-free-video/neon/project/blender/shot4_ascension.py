"""
shot4_ascension.py — Act IV: PRISMATIC ASCENSION (Bars 13-17, 24.0s - 34.0s, 240 frames @ 1920x1080 IMAX)
THE CLIMAX! Full 16:9 IMAX aerial cinema flight blasting through a monumental infinite corridor of
72 iridescent crystal, brushed-gold & obsidian monoliths over a mirror sea, flanked by 6 soaring
parametric aurora light ribbons and 320 diamond light-sparks ascending into golden celestial dawn!
"""
import math
import os
import random
import sys
import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cinema_lib import (
    init_cinema_scene,
    mat_obsidian_mirror,
    mat_brushed_gold,
    mat_dark_titanium,
    mat_crystal_glass,
    mat_emission,
    mat_godray_beam,
    add_camera_rig,
    add_area_light,
    add_point_light,
    add_godray_cone,
    set_smooth,
    smootherstep,
    lerp,
    beat_pulse,
    run_shot_render,
)

TOTAL_FRAMES = 240
PREVIEW_FRAMES = [24, 120, 212]


def set_climax_world(scene):
    """Deep electric sapphire zenith melting into warm radiant amethyst & golden-amber horizon glow."""
    world = bpy.data.worlds.new("ClimaxWorld")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.00
    cr.elements[0].color = (1.0, 0.62, 0.28, 1.0)   # Radiant golden horizon!
    e1 = cr.elements.new(0.10)
    e1.color = (0.48, 0.22, 0.45, 1.0)             # Dusk amethyst transition
    e2 = cr.elements.new(0.28)
    e2.color = (0.04, 0.08, 0.22, 1.0)             # Electric twilight sapphire
    cr.elements[3].position = 0.65
    cr.elements[3].color = (0.006, 0.012, 0.038, 1.0)  # Deep cosmos zenith

    math_abs = nt.nodes.new("ShaderNodeMath")
    math_abs.operation = "ABSOLUTE"

    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 1.15
    out = nt.nodes.new("ShaderNodeOutputWorld")

    nt.links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], math_abs.inputs[0])
    nt.links.new(math_abs.outputs["Value"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return world


def create_monolith_mesh(name, w=1.4, d=1.4, h=18.0, tip_h=3.2):
    """Sculpted beveled architectural prism monolith with slanted jewel crown."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    hw, hd = w * 0.5, d * 0.5
    b0 = bm.verts.new((-hw, -hd, 0.0))
    b1 = bm.verts.new((hw, -hd, 0.0))
    b2 = bm.verts.new((hw, hd, 0.0))
    b3 = bm.verts.new((-hw, hd, 0.0))
    t0 = bm.verts.new((-hw * 0.85, -hd * 0.85, h))
    t1 = bm.verts.new((hw * 0.85, -hd * 0.85, h + tip_h * 0.55))
    t2 = bm.verts.new((hw * 0.85, hd * 0.85, h + tip_h))
    t3 = bm.verts.new((-hw * 0.85, hd * 0.85, h + tip_h * 0.45))

    bm.faces.new((b0, b3, b2, b1))
    bm.faces.new((t0, t1, t2, t3))
    bm.faces.new((b0, b1, t1, t0))
    bm.faces.new((b1, b2, t2, t1))
    bm.faces.new((b2, b3, t3, t2))
    bm.faces.new((b3, b0, t0, t3))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def create_aurora_ribbon(name, y_start, y_end, amp_x, amp_z, z_base, freq, phase, radius, mat):
    """Sweeping 3D parametric spline light ribbon weaving down the prismatic corridor."""
    curve_data = bpy.data.curves.new(f"{name}_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 4
    curve_data.resolution_u = 3

    steps = 140
    spline = curve_data.splines.new("POLY")
    spline.points.add(steps - 1)
    for i in range(steps):
        u = i / float(steps - 1)
        y = lerp(y_start, y_end, u)
        # Ribbons gradually lift skyward toward the radiant horizon!
        lift = (u ** 2.0) * 18.0
        x = math.sin(u * freq * 2.0 * math.pi + phase) * amp_x
        z = z_base + lift + math.cos(u * freq * 1.6 * math.pi + phase * 1.3) * amp_z
        spline.points[i].co = (x, y, max(0.7, z), 1.0)

    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def build_scene():
    scene = init_cinema_scene(
        res_x=1920,
        res_y=1080,
        fps=24,
        samples=18,
        adaptive_threshold=0.04,
        max_bounces=5,
        transmission_bounces=5,
        motion_blur=True,
        shutter=0.52,
        bloom_threshold=0.72,
        bloom_strength=0.44,
        bloom_size=0.80,
        streak_strength=0.14,
        dispersion=0.0032,
        exposure=0.18,
        look="AgX - Punchy",
    )
    scene.frame_start = 0
    scene.frame_end = TOTAL_FRAMES - 1

    set_climax_world(scene)

    # Materials
    m_sea = mat_obsidian_mirror(
        "CelestialSea",
        base_color=(0.006, 0.012, 0.026),
        rough_min=0.012,
        rough_max=0.065,
        bump_strength=0.028,
        noise_scale=2.2,
    )
    m_gold = mat_brushed_gold("MonoGold", color=(1.0, 0.78, 0.36), roughness=0.16)
    m_ti = mat_dark_titanium("MonoObsidian", color=(0.025, 0.032, 0.058), roughness=0.18)
    m_glass = mat_crystal_glass("MonoPrism", tint=(0.76, 0.92, 1.0), roughness=0.025, ior=1.62, iridescent_tint=(1.0, 0.65, 0.45), irid_strength=0.55)

    m_rib_gold = mat_emission("AuroraGold", color=(1.0, 0.80, 0.36), strength=16.0)
    m_rib_cyan = mat_emission("AuroraCyan", color=(0.28, 0.86, 1.0), strength=15.0)
    m_rib_violet = mat_emission("AuroraViolet", color=(0.78, 0.48, 1.0), strength=13.0)
    m_rib_pearl = mat_emission("AuroraPearl", color=(1.0, 0.95, 0.86), strength=18.0)
    m_sun_gate = mat_emission("SunGateHalo", color=(1.0, 0.84, 0.48), strength=28.0)
    m_ray_gold = mat_godray_beam("AscentRay", color=(1.0, 0.82, 0.48), intensity=0.09)

    # 1. Vast Endless Mirror Sea
    bpy.ops.mesh.primitive_plane_add(size=420.0, location=(0, 110, 0))
    sea = bpy.context.active_object
    sea.data.materials.append(m_sea)

    # 2. 72 Towering Crystalline, Gold & Obsidian Monoliths Forming an Infinite Cathedral Avenue
    rng = random.Random(404)
    mono_mats = [m_ti, m_glass, m_gold]
    vein_mats = [m_rib_gold, m_rib_cyan, m_rib_violet]

    for i in range(36):
        y_pos = -5.0 + i * 6.4
        for side in (-1, 1):
            # Inner monumental avenue + staggered outer skyline towers
            x_off = rng.uniform(5.8, 11.5) if (i % 3 != 0) else rng.uniform(11.5, 20.0)
            x_pos = side * x_off
            w = rng.uniform(1.1, 2.5)
            d = rng.uniform(1.1, 2.5)
            h = rng.uniform(8.0, 26.0) + (i / 36.0) * 14.0
            tip_h = rng.uniform(1.8, 4.8)

            mesh = create_monolith_mesh(f"Mono_{i}_{side}", w, d, h, tip_h)
            obj = bpy.data.objects.new(f"Monolith_{i}_{side}", mesh)
            scene.collection.objects.link(obj)
            obj.location = (x_pos, y_pos, -0.05)
            obj.rotation_euler = (0, 0, rng.uniform(-0.22, 0.22))
            obj.data.materials.append(mono_mats[(i + (0 if side > 0 else 1)) % 3])

            # Glowing vertical architectural light vein on inner edge of monolith!
            if i % 2 == 0:
                bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos - side * (w * 0.48), y_pos, h * 0.48))
                vein = bpy.context.active_object
                vein.scale = (0.06, 0.08, h * 0.86)
                vein.data.materials.append(vein_mats[i % 3])

    # 3. 5 Colossal Overhead Golden Archway Portals Framing the Flight Path!
    portal_rings = []
    for k in range(5):
        py = 22.0 + k * 34.0
        pr = 12.0 + k * 1.4
        bpy.ops.mesh.primitive_torus_add(
            major_radius=pr,
            minor_radius=0.16,
            major_segments=96,
            minor_segments=16,
            location=(0, py, pr * 0.42),
            rotation=(math.radians(90), 0, 0),
        )
        arch = bpy.context.active_object
        arch.name = f"GoldenPortal_{k}"
        set_smooth(arch)
        arch.data.materials.append(m_gold if k % 2 == 0 else m_rib_gold)
        portal_rings.append(arch)

    # 4. 6 Sweeping 3D Parametric Aurora Light Ribbons Weaving Cleanly Along Corridor Flanks!
    ribbon_specs = [
        ("RibGold1",   -16, 235, 8.6, 3.0, 6.2, 2.0, 0.35, 0.082, m_rib_gold),
        ("RibCyan1",   -16, 235, 9.2, 3.4, 7.6, 1.8, 2.35, 0.076, m_rib_cyan),
        ("RibViolet1", -16, 235, 10.4, 3.8, 9.2, 1.7, 4.4,  0.072, m_rib_violet),
        ("RibPearl1",  -16, 235, 7.4, 2.5, 5.6, 2.3, 1.35, 0.062, m_rib_pearl),
        ("RibGold2",   -16, 235, 11.4, 4.2, 10.8, 1.4, 3.3,  0.068, m_rib_gold),
        ("RibCyan2",   -16, 235, 8.2, 2.8, 8.4, 2.1, 5.4,  0.064, m_rib_cyan),
    ]
    for spec in ribbon_specs:
        create_aurora_ribbon(*spec)

    # 5. Distant Colossal Dawn Sun-Gate Halo on the Far Horizon (Draws the eye forward!)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=22.0,
        minor_radius=0.55,
        major_segments=128,
        minor_segments=20,
        location=(0, 228, 22.0),
        rotation=(math.radians(90), 0, 0),
    )
    sun_halo = bpy.context.active_object
    set_smooth(sun_halo)
    sun_halo.data.materials.append(m_sun_gate)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=11.0, location=(0, 235, 22.0))
    sun_core = bpy.context.active_object
    set_smooth(sun_core)
    sun_core.data.materials.append(m_sun_gate)

    # Diagonal golden shafts slanting across the corridor
    for k, gy in enumerate([40.0, 95.0, 155.0]):
        add_godray_cone(scene, f"SkyShaft_{k}", (12 if k % 2 == 0 else -12, gy, 24), (10, -24 if k % 2 == 0 else 24, 0), radius_top=1.5, radius_bot=9.5, height=46.0, mat=m_ray_gold)

    # 6. 300 Streaming Luminous Bokeh Diamond Sparks Rising Skyward!
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.065)
    sp_mesh = bpy.context.active_object.data
    bpy.data.objects.remove(bpy.context.active_object, do_unlink=True)
    sparks = []
    spark_mats = [m_rib_gold, m_rib_cyan, m_rib_pearl, m_rib_violet]
    for k in range(300):
        sp = bpy.data.objects.new(f"StarSpark_{k:03d}", sp_mesh)
        scene.collection.objects.link(sp)
        sp.data.materials.append(spark_mats[k % 4])
        bx = rng.uniform(-16.0, 16.0)
        by = rng.uniform(-8.0, 210.0)
        bz = rng.uniform(0.5, 26.0)
        sc = rng.uniform(0.45, 1.8)
        sp.scale = (sc, sc, sc)
        sparks.append((sp, bx, by, bz, rng.uniform(0.5, 1.8), rng.uniform(0, 6.28)))

    # 7. Radiant Multi-Tone Cinema Lighting
    add_area_light(scene, "HorizonSunLight", (0, 210, 35), (0, 60, 4), energy=85000.0, size=38.0, color=(1.0, 0.80, 0.48))
    add_area_light(scene, "SkyFillCyan", (-35, 80, 45), (0, 80, 5), energy=22000.0, size=32.0, color=(0.30, 0.72, 1.0))
    cam_pt = add_point_light(scene, "CamAuraLight", (0, 0, 5), energy=950.0, radius=1.2, color=(1.0, 0.86, 0.62))

    # 8. Camera Rig (Wide 24mm IMAX Aerial Lens!)
    cam, target = add_camera_rig(scene, lens=24.0, fstop=2.8, name="Act4Cam")

    # -----------------------------------------------------------------------
    # Bake Exhilarating High-Speed Aerial Flight & Skyward Ascension Keyframes!
    # -----------------------------------------------------------------------
    em_gold = m_rib_gold.node_tree.nodes["Emission"]
    em_cyan = m_rib_cyan.node_tree.nodes["Emission"]

    for f in range(TOTAL_FRAMES):
        t = f / (TOTAL_FRAMES - 1)
        pulse = beat_pulse(f + 576, sharpness=3.5)

        # Beat-synced aurora shimmer!
        em_gold.inputs["Strength"].default_value = 14.0 + 9.0 * pulse
        em_gold.inputs["Strength"].keyframe_insert("default_value", frame=f)
        em_cyan.inputs["Strength"].default_value = 13.0 + 8.0 * pulse
        em_cyan.inputs["Strength"].keyframe_insert("default_value", frame=f)

        # Smooth accelerating flight along Y, then soaring skyward ascent in final 35%!
        ascent = smootherstep((t - 0.62) / 0.38) if t > 0.62 else 0.0
        cam_y = lerp(-12.0, 142.0, t ** 1.06)
        cam_x = math.sin(t * math.pi * 2.1) * 2.6 * (1.0 - ascent * 0.75)
        cam_z = 2.65 + 0.65 * math.sin(t * math.pi * 3.0) + 21.5 * (ascent ** 1.45)

        cam.location = (cam_x, cam_y, cam_z)
        cam.keyframe_insert("location", frame=f)

        # Look far down the luminous avenue, smoothly pitching upward into golden dawn!
        tgt_x = math.sin((t + 0.08) * math.pi * 2.1) * 1.4 * (1.0 - ascent)
        tgt_y = cam_y + 42.0
        tgt_z = 5.4 + 26.0 * (ascent ** 1.2)
        target.location = (tgt_x, tgt_y, tgt_z)
        target.keyframe_insert("location", frame=f)

        # Keep subtle light aura gliding ahead of camera so nearby gold monoliths sparkle!
        cam_pt.location = (cam_x * 0.5, cam_y + 12.0, cam_z + 2.5)
        cam_pt.keyframe_insert("location", frame=f)

        # Subtle rising motion on diamond sparks (only keyframe every 4 frames for fast bake)
        if f % 4 == 0 or f == TOTAL_FRAMES - 1:
            for sp, bx, by, bz, spd, ph in sparks:
                sp.location = (
                    bx + math.sin(f * 0.04 + ph) * 0.6,
                    by,
                    bz + (f / 24.0) * spd * 0.8,
                )
                sp.keyframe_insert("location", frame=f)

    return scene


if __name__ == "__main__":
    scene = build_scene()
    run_shot_render(
        scene,
        shot_name="shot4_ascension",
        total_frames=TOTAL_FRAMES,
        preview_frames=PREVIEW_FRAMES,
        default_out_dir="project/renders/shot4",
        preview_dir="project/renders/previews",
    )
