"""
shot5_horizon.py — Act V: THE LIVING HORIZON & KAIROS FINALE (Bars 18-22, 34.0s - 44.0s, 240 frames @ 1920x1080 IMAX)
Serene twilight-to-golden-dawn liquid-mirror ocean, monumental levitating Refractive Crystal Prism
framed inside a Double Brushed-Gold Halo casting an iconic golden reflection path across the water,
sunrise volumetric god-rays, drifting golden light embers, settling into symmetrical serenity for
the KAIROS title unveil.
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
    mat_crystal_glass,
    mat_emission,
    mat_godray_beam,
    add_camera_rig,
    add_area_light,
    add_point_light,
    add_godray_cone,
    set_smooth,
    add_bevel,
    smootherstep,
    lerp,
    run_shot_render,
)

TOTAL_FRAMES = 240
PREVIEW_FRAMES = [24, 120, 210]


def set_dawn_horizon_world(scene):
    """Painterly Makoto-Shinkai / Villeneuve twilight-to-golden-dawn gradient sky."""
    world = bpy.data.worlds.new("DawnHorizonWorld")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.00
    cr.elements[0].color = (1.0, 0.72, 0.36, 1.0)    # Warm radiant champagne-gold horizon
    e1 = cr.elements.new(0.065)
    e1.color = (0.85, 0.40, 0.32, 1.0)               # Coral-rose dawn glow
    e2 = cr.elements.new(0.16)
    e2.color = (0.20, 0.14, 0.32, 1.0)               # Twilight dusk violet
    e3 = cr.elements.new(0.34)
    e3.color = (0.025, 0.048, 0.14, 1.0)             # Deep celestial sapphire
    cr.elements[4].position = 0.70
    cr.elements[4].color = (0.004, 0.008, 0.024, 1.0) # Velvet midnight zenith

    math_abs = nt.nodes.new("ShaderNodeMath")
    math_abs.operation = "ABSOLUTE"

    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 1.25
    out = nt.nodes.new("ShaderNodeOutputWorld")

    nt.links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], math_abs.inputs[0])
    nt.links.new(math_abs.outputs["Value"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return world


def create_finale_prism(name="FinalePrism", sides=8, radius=1.55, height=4.4):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    top_v = bm.verts.new((0, 0, height * 0.5))
    bot_v = bm.verts.new((0, 0, -height * 0.5))
    mid = [bm.verts.new((math.cos(2 * math.pi * i / sides) * radius, math.sin(2 * math.pi * i / sides) * radius, 0.0)) for i in range(sides)]
    for i in range(sides):
        ni = (i + 1) % sides
        bm.faces.new((top_v, mid[i], mid[ni]))
        bm.faces.new((bot_v, mid[ni], mid[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    add_bevel(obj, width=0.03, segments=2)
    return obj


def build_scene():
    scene = init_cinema_scene(
        res_x=1920,
        res_y=1080,
        fps=24,
        samples=20,
        adaptive_threshold=0.035,
        max_bounces=6,
        transmission_bounces=6,
        motion_blur=True,
        shutter=0.42,
        bloom_threshold=0.76,
        bloom_strength=0.40,
        bloom_size=0.80,
        streak_strength=0.12,
        dispersion=0.0022,
        exposure=0.08,
        look="AgX - Punchy",
    )
    scene.frame_start = 0
    scene.frame_end = TOTAL_FRAMES - 1

    set_dawn_horizon_world(scene)

    # Materials
    # Liquid-mirror twilight ocean with crisp horizontal ripples -> iconic Makoto-Shinkai golden shimmer road!
    m_ocean = mat_obsidian_mirror(
        "DawnMirrorOcean",
        base_color=(0.005, 0.010, 0.024),
        rough_min=0.016,
        rough_max=0.075,
        bump_strength=0.115,
        noise_scale=3.2,
    )
    nt = m_ocean.node_tree
    tex = nt.nodes["Texture Coordinate"]
    noise = nt.nodes["Noise Texture"]
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (0.28, 5.2, 1.0)  # Horizontal ocean wavelets!
    nt.links.new(tex.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])

    m_gold = mat_brushed_gold("HorizonGold", color=(1.0, 0.79, 0.38), roughness=0.14)
    m_prism = mat_crystal_glass("HorizonPrismGlass", tint=(0.88, 0.95, 1.0), roughness=0.016, ior=1.76, iridescent_tint=(1.0, 0.74, 0.38), irid_strength=0.48)
    m_glow_gold = mat_emission("HaloGlowGold", color=(1.0, 0.80, 0.42), strength=11.0)
    m_glow_sun = mat_emission("DawnSunGlow", color=(1.0, 0.74, 0.36), strength=18.0)
    m_ember = mat_emission("GoldenEmber", color=(1.0, 0.86, 0.54), strength=16.0)
    m_ray = mat_godray_beam("SunriseRay", color=(1.0, 0.82, 0.48), intensity=0.14)

    # 1. Vast Tranquil Dawn Ocean
    bpy.ops.mesh.primitive_plane_add(size=360.0, location=(0, 80, 0))
    ocean = bpy.context.active_object
    ocean.data.materials.append(m_ocean)

    # 2. Hero Monumental Levitating KAIROS Emblem (Positioned gracefully upper-center so water below frames title!)
    monument_root = bpy.data.objects.new("KairosMonument", None)
    scene.collection.objects.link(monument_root)
    monument_root.location = (0, 17.5, 6.2)

    prism = create_finale_prism("FinaleDiamond", sides=8, radius=1.35, height=4.0)
    prism.data.materials.append(m_prism)
    prism.parent = monument_root

    # Inner glowing champagne-gold diamond heart
    heart = create_finale_prism("FinaleHeart", sides=6, radius=0.38, height=1.9)
    heart.data.materials.append(m_glow_gold)
    heart.parent = monument_root

    # Outer Majestic Brushed-Gold Halo Ring (facing camera!)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=3.45,
        minor_radius=0.072,
        major_segments=144,
        minor_segments=24,
        rotation=(math.radians(90), 0, 0),
    )
    halo_outer = bpy.context.active_object
    set_smooth(halo_outer)
    halo_outer.data.materials.append(m_gold)
    halo_outer.parent = monument_root

    # Inner Radiant Glowing Light Ring (delicate celestial eclipse ring!)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=3.08,
        minor_radius=0.020,
        major_segments=144,
        minor_segments=16,
        rotation=(math.radians(90), 0, 0),
    )
    halo_glow = bpy.context.active_object
    set_smooth(halo_glow)
    halo_glow.data.materials.append(m_glow_gold)
    halo_glow.parent = monument_root

    # Tilted Secondary Orbital Gold Ring
    bpy.ops.mesh.primitive_torus_add(
        major_radius=3.92,
        minor_radius=0.030,
        major_segments=144,
        minor_segments=18,
        rotation=(math.radians(66), math.radians(18), 0),
    )
    halo_orbit = bpy.context.active_object
    set_smooth(halo_orbit)
    halo_orbit.data.materials.append(m_gold)
    halo_orbit.parent = monument_root

    # 3. Distant Rising Sun Disc Right Behind the Monument on the Horizon (Creates shimmering golden water glitter road!)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=9.2, location=(0, 195, 4.4))
    sun_disc = bpy.context.active_object
    set_smooth(sun_disc)
    sun_disc.data.materials.append(m_glow_sun)

    # Sleek distant architectural crystal-obsidian spires far on the flanks (echoing Act IV seamlessly!)
    m_spire = mat_obsidian_mirror("DistantSpire", base_color=(0.014, 0.018, 0.038), rough_min=0.14, rough_max=0.28)
    for sx, sy, sw, sh in [
        (-42, 95, 1.8, 16.0), (-48, 108, 2.4, 24.0), (-58, 122, 2.0, 19.0),
        (42, 95, 1.8, 17.5),  (49, 110, 2.4, 25.0),  (59, 125, 2.0, 18.5),
    ]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=4, radius=sw, depth=sh, location=(sx, sy, sh * 0.45))
        sp = bpy.context.active_object
        sp.rotation_euler = (0, 0, math.radians(45))
        sp.data.materials.append(m_spire)

    # 4. Fanning Gossamer Golden Sunrise Volumetric God-Rays (Pure additive!)
    for idx, (ang_y, x_off) in enumerate([(-26, -3.5), (0, 0.0), (26, 3.5)]):
        add_godray_cone(scene, f"DawnRay_{idx}", (x_off, 26.0, 12.5), (10, ang_y, 0), radius_top=0.9, radius_bot=7.5, height=34.0, mat=m_ray)

    # 5. 130 Gently Rising Golden Embers / Light Petals Across the Horizon
    rng = random.Random(505)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.042)
    em_mesh = bpy.context.active_object.data
    bpy.data.objects.remove(bpy.context.active_object, do_unlink=True)
    embers = []
    for k in range(130):
        em = bpy.data.objects.new(f"DawnEmber_{k:03d}", em_mesh)
        scene.collection.objects.link(em)
        em.data.materials.append(m_ember)
        if k < 25:
            # Soft foreground golden bokeh
            bx, by, bz = rng.uniform(-7.0, 7.0), rng.uniform(-5.5, 4.0), rng.uniform(0.6, 6.2)
            sc = rng.uniform(0.45, 0.95)
        else:
            bx, by, bz = rng.uniform(-22.0, 22.0), rng.uniform(5.0, 42.0), rng.uniform(0.3, 12.5)
            sc = rng.uniform(0.55, 1.5)
        em.scale = (sc, sc, sc)
        embers.append((em, bx, by, bz, rng.uniform(0.18, 0.55), rng.uniform(0, 6.28)))

    # 6. Warm Golden-Hour Cinema Lighting (disable giant glossy disc bounce on water so twilight ocean stays rich for title!)
    l_back = add_area_light(scene, "DawnBackRim", (0, 55, 18), (0, 16, 5.2), energy=26000.0, size=18.0, color=(1.0, 0.78, 0.44))
    l_back.visible_glossy = False
    l_key = add_area_light(scene, "KeyWarmSide", (12, 4, 12), (0, 16, 5.2), energy=3200.0, size=9.0, color=(1.0, 0.84, 0.58))
    l_key.visible_glossy = False
    l_fill = add_area_light(scene, "FillTwilight", (-14, 6, 9), (0, 16, 5.2), energy=1900.0, size=10.0, color=(0.40, 0.60, 1.0))
    l_fill.visible_glossy = False
    add_point_light(scene, "MonumentCore", (0, 17.5, 6.2), energy=950.0, radius=0.8, color=(1.0, 0.80, 0.46))

    # 7. Camera Rig (Graceful 34mm Cinema Lens -> monumental breathing sky + serene water canvas for title!)
    cam, target = add_camera_rig(scene, lens=34.0, fstop=2.2, name="Act5Cam")

    # -----------------------------------------------------------------------
    # Bake Keyframes (Graceful Deceleration -> Serene Monumental Title Tableau!)
    # -----------------------------------------------------------------------
    # Slow rippling dawn ocean motion
    mapping.inputs["Location"].default_value = (0.0, 0.0, 0.0)
    mapping.inputs["Location"].keyframe_insert("default_value", frame=0)
    mapping.inputs["Location"].default_value = (0.0, -2.6, 0.0)
    mapping.inputs["Location"].keyframe_insert("default_value", frame=TOTAL_FRAMES - 1)

    for f in range(TOTAL_FRAMES):
        t = f / (TOTAL_FRAMES - 1)
        s = smootherstep(t)

        # Monument slow, serene breathing levitation
        monument_root.location = (0.0, 17.5, 6.2 + 0.22 * math.sin(f * 0.032))
        monument_root.keyframe_insert("location", frame=f)

        prism.rotation_euler = (0, 0, f * 0.008)
        prism.keyframe_insert("rotation_euler", frame=f)
        heart.rotation_euler = (0, 0, -f * 0.014)
        heart.keyframe_insert("rotation_euler", frame=f)

        halo_orbit.rotation_euler = (
            math.radians(66) + math.sin(f * 0.015) * 0.14,
            math.radians(18) + f * 0.007,
            f * 0.009,
        )
        halo_orbit.keyframe_insert("rotation_euler", frame=f)

        # Camera glides gracefully downward from golden sky -> settles into symmetrical majesty!
        cam_y = lerp(-6.5, -13.5, s)
        cam_x = math.sin(t * math.pi) * 1.10 * (1.0 - s * 0.85)
        cam_z = lerp(9.2, 3.85, s)
        cam.location = (cam_x, cam_y, cam_z)
        cam.keyframe_insert("location", frame=f)

        # Monument framed gracefully upper-center; clean tranquil mirror ocean below for KAIROS title!
        target.location = (0.0, 17.5, lerp(6.0, 4.35, s))
        target.keyframe_insert("location", frame=f)

        if f % 4 == 0 or f == TOTAL_FRAMES - 1:
            for em, bx, by, bz, spd, ph in embers:
                em.location = (
                    bx + math.sin(f * 0.025 + ph) * 0.45,
                    by,
                    bz + (f / 24.0) * spd * 0.55,
                )
                em.keyframe_insert("location", frame=f)

    return scene


if __name__ == "__main__":
    scene = build_scene()
    run_shot_render(
        scene,
        shot_name="shot5_horizon",
        total_frames=TOTAL_FRAMES,
        preview_frames=PREVIEW_FRAMES,
        default_out_dir="project/renders/shot5",
        preview_dir="project/renders/previews",
    )
