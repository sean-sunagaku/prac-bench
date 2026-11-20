"""
shot2_prism.py — Act II: CRYSTALLIZATION (Bars 5-8, 8.0s - 16.0s, 192 frames @ 1920x804 2.39:1)
Faceted jewel-cut refractive diamond prism with blazing sapphire-gold heart, surrounded by
144 precision-machined gold, dark-titanium, and crystal shards spiraling inward from chaos
into Fibonacci sacred symmetry with spring-overshoot choreography.
"""
import math
import os
import random
import sys
import bpy
import bmesh
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cinema_lib import (
    init_cinema_scene,
    set_dark_studio_world,
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
    add_bevel,
    clamp01,
    smootherstep,
    ease_out_back,
    lerp,
    vlerp,
    beat_pulse,
    run_shot_render,
)

TOTAL_FRAMES = 192
PREVIEW_FRAMES = [16, 96, 176]


def create_diamond_prism_mesh(name="DiamondPrism", sides=8, radius=1.15, height=3.1):
    """Creates a jewel-cut octagonal double-pyramid crystal prism with crown facets."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    top_v = bm.verts.new((0, 0, height * 0.52))
    bot_v = bm.verts.new((0, 0, -height * 0.52))
    upper_ring = []
    mid_ring = []
    lower_ring = []

    for i in range(sides):
        a = 2.0 * math.pi * i / sides
        a_off = a + math.pi / sides
        upper_ring.append(bm.verts.new((math.cos(a_off) * radius * 0.72, math.sin(a_off) * radius * 0.72, height * 0.24)))
        mid_ring.append(bm.verts.new((math.cos(a) * radius, math.sin(a) * radius, 0.0)))
        lower_ring.append(bm.verts.new((math.cos(a_off) * radius * 0.72, math.sin(a_off) * radius * 0.72, -height * 0.24)))

    for i in range(sides):
        ni = (i + 1) % sides
        bm.faces.new((top_v, upper_ring[i], upper_ring[ni]))
        bm.faces.new((upper_ring[i], mid_ring[i], mid_ring[ni]))
        bm.faces.new((upper_ring[i], mid_ring[ni], upper_ring[ni]))
        bm.faces.new((mid_ring[i], lower_ring[i], mid_ring[ni]))
        bm.faces.new((mid_ring[ni], lower_ring[i], lower_ring[ni]))
        bm.faces.new((bot_v, lower_ring[ni], lower_ring[i]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    add_bevel(obj, width=0.022, segments=2)
    return obj


def create_shard_mesh(name, length=0.65, width=0.14, depth=0.055):
    """Precision-machined tapered diamond-bar shard."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    v_top = bm.verts.new((0, 0, length * 0.5))
    v_bot = bm.verts.new((0, 0, -length * 0.5))
    ring = [
        bm.verts.new((width * 0.5, 0, 0)),
        bm.verts.new((0, depth * 0.5, 0)),
        bm.verts.new((-width * 0.5, 0, 0)),
        bm.verts.new((0, -depth * 0.5, 0)),
    ]
    for i in range(4):
        ni = (i + 1) % 4
        bm.faces.new((v_top, ring[i], ring[ni]))
        bm.faces.new((v_bot, ring[ni], ring[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def build_scene():
    scene = init_cinema_scene(
        res_x=1920,
        res_y=804,
        fps=24,
        samples=20,
        adaptive_threshold=0.035,
        max_bounces=7,
        transmission_bounces=7,
        motion_blur=True,
        shutter=0.45,
        bloom_threshold=0.80,
        bloom_strength=0.34,
        bloom_size=0.72,
        streak_strength=0.11,
        dispersion=0.003,
        exposure=0.15,
        look="AgX - Punchy",
    )
    scene.frame_start = 0
    scene.frame_end = TOTAL_FRAMES - 1

    set_dark_studio_world(
        scene,
        zenith=(0.002, 0.004, 0.012),
        horizon=(0.009, 0.016, 0.036),
        strength=0.42,
    )

    # Materials
    m_floor = mat_obsidian_mirror("ChamberFloor", base_color=(0.006, 0.009, 0.018), rough_min=0.03, rough_max=0.14, bump_strength=0.03)
    m_prism = mat_crystal_glass(
        "HeroPrismGlass",
        tint=(0.80, 0.94, 1.0),
        roughness=0.015,
        ior=1.78,
        iridescent_tint=(1.0, 0.72, 0.35),
        irid_strength=0.48,
    )
    m_gold = mat_brushed_gold("ShardGold", color=(1.0, 0.78, 0.35), roughness=0.14)
    m_ti = mat_dark_titanium("ShardTitanium", color=(0.055, 0.068, 0.105), roughness=0.20)
    m_shard_glass = mat_crystal_glass("ShardCrystal", tint=(0.68, 0.90, 1.0), roughness=0.025, ior=1.65, irid_strength=0.45)
    m_core_gold = mat_emission("CoreFlameGold", color=(1.0, 0.68, 0.22), strength=9.5, fresnel_boost=1.0, edge_color=(0.25, 0.78, 1.0))
    m_core_cyan = mat_emission("CoreRingCyan", color=(0.30, 0.84, 1.0), strength=11.0)
    m_ray = mat_godray_beam("PrismBeam", color=(0.45, 0.78, 1.0), intensity=0.10)

    # Floor far below to catch jewel reflections
    bpy.ops.mesh.primitive_plane_add(size=140.0, location=(0, 0, -3.5))
    fl = bpy.context.active_object
    fl.data.materials.append(m_floor)

    # Hero Centerpiece Group
    hero_root = bpy.data.objects.new("PrismAssemblyRoot", None)
    scene.collection.objects.link(hero_root)
    hero_root.location = (0, 0, 0.25)

    prism = create_diamond_prism_mesh("HeroDiamondPrism", sides=8, radius=1.08, height=3.05)
    prism.data.materials.append(m_prism)
    prism.parent = hero_root

    # Glowing inner filament crystal inside the glass prism (refracts gloriously!)
    inner_core = create_diamond_prism_mesh("InnerHeart", sides=6, radius=0.34, height=1.55)
    inner_core.data.materials.append(m_core_gold)
    inner_core.parent = hero_root

    # Two sleek illuminated equatorial/meridian rings hugging the prism
    halo_rings = []
    for idx, (r, mr, mat, tilt) in enumerate([
        (1.62, 0.020, m_gold, (math.radians(72), math.radians(15), 0)),
        (1.92, 0.013, m_core_cyan, (math.radians(-58), math.radians(-24), 0)),
    ]):
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=mr, major_segments=128, minor_segments=20)
        hr = bpy.context.active_object
        hr.name = f"PrismHalo_{idx}"
        set_smooth(hr)
        hr.data.materials.append(mat)
        hr.parent = hero_root
        halo_rings.append((hr, tilt))

    # 144 Precision Shards Assembling in Fibonacci Golden-Spiral Sacred Shells!
    rng = random.Random(202)
    shard_mesh_tall = create_shard_mesh("ShardTall", length=0.82, width=0.20, depth=0.075)
    shard_mesh_wide = create_shard_mesh("ShardWide", length=0.56, width=0.26, depth=0.065)
    shard_mats = [m_gold, m_ti, m_shard_glass]

    golden_angle = math.pi * (3.0 - math.sqrt(5.0))
    shards = []
    N_SHARDS = 144
    for i in range(N_SHARDS):
        # Target position on nested Fibonacci sacred shells
        shell_idx = 0 if i < 48 else (1 if i < 104 else 2)
        base_r = [2.25, 3.05, 3.95][shell_idx]
        local_i = i if shell_idx == 0 else (i - 48 if shell_idx == 1 else i - 104)
        local_n = [48, 56, 40][shell_idx]

        y_unit = 1.0 - (local_i / float(local_n - 1)) * 2.0
        y_unit *= 0.84  # keep poles open for dramatic diamond silhouette!
        r_slice = math.sqrt(max(0.02, 1.0 - y_unit * y_unit))
        theta = golden_angle * i
        target_pos = Vector((math.cos(theta) * r_slice * base_r, math.sin(theta) * r_slice * base_r, y_unit * base_r * 0.92))

        # Target orientation: cleanly tangent / radially pointing toward prism center!
        target_rot = target_pos.to_track_quat("Z", "Y").to_euler()

        # Start position: exploded chaotic cloud (with a few shards near camera for foreground bokeh!)
        if i % 11 == 0:
            start_pos = Vector((rng.uniform(-4.5, 4.5), rng.uniform(-7.5, -3.8), rng.uniform(-1.6, 2.8)))
        else:
            start_dir = target_pos.normalized()
            swirl = Euler((0, 0, rng.uniform(1.4, 2.8)))
            start_dir.rotate(swirl)
            start_pos = start_dir * rng.uniform(7.5, 14.5) + Vector((rng.uniform(-1.5, 1.5), rng.uniform(-1.5, 1.5), rng.uniform(-2.5, 2.5)))

        start_rot = Euler((rng.uniform(-3.0, 3.0), rng.uniform(-3.0, 3.0), rng.uniform(-3.0, 3.0)))

        mesh = shard_mesh_tall if i % 2 == 0 else shard_mesh_wide
        obj = bpy.data.objects.new(f"Shard_{i:03d}", mesh)
        scene.collection.objects.link(obj)
        obj.data.materials.append(shard_mats[i % 3])
        sc = rng.uniform(0.75, 1.35) * (0.85 if shell_idx == 0 else 1.05)
        obj.scale = (sc, sc, sc)
        obj.parent = hero_root

        # Staggered snap-in window across frames 6..158 (inner shells lock first -> wave outward!)
        t0 = 6.0 + shell_idx * 24.0 + (local_i / float(local_n)) * 58.0
        dur = rng.uniform(34.0, 52.0)
        shards.append((obj, start_pos, target_pos, start_rot, target_rot, t0, dur, shell_idx))

    # Subtle glowing ambient dust sparks
    m_spark = mat_emission("TinySpark", color=(1.0, 0.85, 0.52), strength=14.0)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.022)
    sp_mesh = bpy.context.active_object.data
    bpy.data.objects.remove(bpy.context.active_object, do_unlink=True)
    for k in range(60):
        ang = rng.uniform(0, 2 * math.pi)
        dist = rng.uniform(2.5, 11.0)
        sp = bpy.data.objects.new(f"AmbientSpark_{k}", sp_mesh)
        scene.collection.objects.link(sp)
        sp.location = (math.cos(ang) * dist, math.sin(ang) * dist, rng.uniform(-2.4, 4.2))
        sp.data.materials.append(m_spark)

    # Volumetric light shaft behind crystal
    add_godray_cone(scene, "BackShaft", (0.0, 3.0, 5.5), (-18, 8, 0), radius_top=0.8, radius_bot=5.5, height=16.0, mat=m_ray)

    # Sculpted Luxury Studio Lighting
    add_area_light(scene, "KeyGold", (6.5, -5.0, 5.5), (0, 0, 0.3), energy=1400.0, size=5.0, color=(1.0, 0.78, 0.44))
    add_area_light(scene, "RimCyan", (-6.5, 5.5, 4.0), (0, 0, 0.3), energy=1500.0, size=6.0, color=(0.25, 0.72, 1.0))
    add_area_light(scene, "FillWhite", (-4.0, -7.0, -1.5), (0, 0, 0.3), energy=360.0, size=5.0, color=(0.72, 0.84, 1.0))
    core_pt = add_point_light(scene, "PrismHeartLight", (0, 0, 0.25), energy=550.0, radius=0.35, color=(1.0, 0.80, 0.45))

    # Camera Rig
    cam, target = add_camera_rig(scene, lens=38.0, fstop=2.2, name="Act2Cam")

    # Bake Keyframes
    em_core = m_core_gold.node_tree.nodes["Emission"]
    for f in range(TOTAL_FRAMES):
        t = f / (TOTAL_FRAMES - 1)
        s = smootherstep(t)
        pulse = beat_pulse(f + 192, sharpness=3.8)
        build_energy = smootherstep((f - 140) / 51.0) if f > 140 else 0.0

        # Core energy & rotation
        em_core.inputs["Strength"].default_value = 7.5 + 4.5 * pulse + 12.0 * build_energy
        em_core.inputs["Strength"].keyframe_insert("default_value", frame=f)
        core_pt.data.energy = 420.0 + 220.0 * pulse + 500.0 * build_energy
        core_pt.data.keyframe_insert("energy", frame=f)

        # Gentle collective rotation of entire sacred assembly
        hero_root.rotation_euler = (0.04 * math.sin(f * 0.03), 0.03 * math.cos(f * 0.025), f * 0.0085 + 0.35 * build_energy)
        hero_root.keyframe_insert("rotation_euler", frame=f)

        prism.rotation_euler = (0, 0, f * 0.015)
        prism.keyframe_insert("rotation_euler", frame=f)
        inner_core.rotation_euler = (0, 0, -f * 0.028)
        inner_core.keyframe_insert("rotation_euler", frame=f)

        for idx, (hr, base_tilt) in enumerate(halo_rings):
            sp = 0.022 if idx == 0 else -0.028
            hr.rotation_euler = (base_tilt[0] + math.sin(f * 0.02) * 0.15, base_tilt[1], f * sp)
            hr.keyframe_insert("rotation_euler", frame=f)

        # Shard Helical Spring-Snap Choreography
        for obj, sp, tp, sr, tr, t0, dur, sh_idx in shards:
            u = clamp01((f - t0) / dur)
            if u <= 0.0:
                # Slow chaotic drift before ignition
                drift = f * 0.008
                p = sp + Vector((math.sin(drift + t0) * 0.2, math.cos(drift + t0) * 0.2, 0.0))
                r = Euler((sr.x + drift, sr.y - drift * 0.7, sr.z + drift * 0.5))
            elif u < 1.0:
                k = ease_out_back(u, overshoot=1.15)
                # Helical twist along approach
                twist = (1.0 - u) ** 2 * 1.45 * (1 if sh_idx % 2 == 0 else -1)
                p = vlerp(sp, tp, k)
                p_rot = Euler((0, 0, twist))
                p.rotate(p_rot)
                r = Euler((lerp(sr.x, tr.x, k), lerp(sr.y, tr.y, k), lerp(sr.z, tr.z, k)))
            else:
                # Locked in sacred orbit — subtle harmonic breathing on the beat!
                breath = 1.0 + 0.032 * pulse * (1 + sh_idx * 0.35)
                p = tp * breath
                r = tr
            obj.location = p
            obj.rotation_euler = r
            obj.keyframe_insert("location", frame=f)
            obj.keyframe_insert("rotation_euler", frame=f)

        # Sweeping Hero Orbital Camera Arc showing FULL diamond + assembled Fibonacci shells!
        ang = lerp(math.radians(-38), math.radians(52), s)
        dist = lerp(12.2, 8.8, s)
        cam_x = math.sin(ang) * dist
        cam_y = -math.cos(ang) * dist
        cam_z = lerp(-0.55, 2.35, smootherstep(t * 0.85)) - 0.55 * build_energy
        cam.location = (cam_x, cam_y, cam_z)
        cam.keyframe_insert("location", frame=f)

        target.location = (0.0, 0.0, 0.25 + 0.12 * math.sin(t * math.pi))
        target.keyframe_insert("location", frame=f)

    return scene


if __name__ == "__main__":
    scene = build_scene()
    run_shot_render(
        scene,
        shot_name="shot2_prism",
        total_frames=TOTAL_FRAMES,
        preview_frames=PREVIEW_FRAMES,
        default_out_dir="project/renders/shot2",
        preview_dir="project/renders/previews",
    )
