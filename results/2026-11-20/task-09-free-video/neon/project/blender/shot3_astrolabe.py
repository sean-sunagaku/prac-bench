"""
shot3_astrolabe.py — Act III: THE CELESTIAL ASTROLABE (Bars 9-12, 16.0s - 24.0s, 192 frames @ 1920x1080)
Cathedral-scale vaulted hall of 12 fluted obsidian-and-gold monolithic pillars with volumetric
god-rays, surrounding a monumental 7-ring golden & titanium armillary astrolabe with gear teeth,
emissive inlays, orbital crystal moons, and a pulsing 3D torus-knot plasma star core.
Camera executes an exhilarating crane dive straight THROUGH the rotating golden gimbal rings!
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
    smootherstep,
    lerp,
    beat_pulse,
    run_shot_render,
)

TOTAL_FRAMES = 192
PREVIEW_FRAMES = [16, 108, 178]


def create_astrolabe_ring(name, major_r, width, thickness, mat_body, mat_inlay, tick_count=24, parent=None):
    """Precision-machined chamfered astrolabe gimbal ring with glowing edge inlay & mechanical index ticks."""
    ring_root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ring_root)
    if parent:
        ring_root.parent = parent

    # Chamfered structural ring body (custom beveled rectangle cross-section swept in a circle)
    mesh = bpy.data.meshes.new(f"{name}_BodyMesh")
    bm = bmesh.new()
    segs = 96
    r_in = major_r - width * 0.5
    r_out = major_r + width * 0.5
    ht = thickness * 0.5
    ch = min(width, thickness) * 0.16

    profile = [
        (r_in + ch, -ht),
        (r_out - ch, -ht),
        (r_out, -ht + ch),
        (r_out, ht - ch),
        (r_out - ch, ht),
        (r_in + ch, ht),
        (r_in, ht - ch),
        (r_in, -ht + ch),
    ]
    n_p = len(profile)
    rings_v = []
    for s in range(segs):
        ang = 2.0 * math.pi * s / segs
        ca, sa = math.cos(ang), math.sin(ang)
        rv = [bm.verts.new((pr * ca, pr * sa, pz)) for (pr, pz) in profile]
        rings_v.append(rv)

    for s in range(segs):
        ns = (s + 1) % segs
        for k in range(n_p):
            nk = (k + 1) % n_p
            bm.faces.new((rings_v[s][k], rings_v[ns][k], rings_v[ns][nk], rings_v[s][nk]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    body = bpy.data.objects.new(f"{name}_Body", mesh)
    bpy.context.scene.collection.objects.link(body)
    body.data.materials.append(mat_body)
    body.parent = ring_root

    # Glowing delicate light channel inlaid along outer rim
    bpy.ops.mesh.primitive_torus_add(
        major_radius=r_out + 0.012,
        minor_radius=thickness * 0.14,
        major_segments=96,
        minor_segments=12,
    )
    inlay = bpy.context.active_object
    inlay.name = f"{name}_Inlay"
    set_smooth(inlay)
    inlay.data.materials.append(mat_inlay)
    inlay.parent = ring_root

    # Mechanical calibration teeth / engraved nodules around ring
    if tick_count > 0:
        tmesh = bpy.data.meshes.new(f"{name}_Ticks")
        tbm = bmesh.new()
        for k in range(tick_count):
            ang = 2.0 * math.pi * k / tick_count
            is_major = (k % 4 == 0)
            tl = width * (0.55 if is_major else 0.30)
            tw = 0.055 if is_major else 0.032
            th = thickness * (1.28 if is_major else 1.12)
            m_mat = Euler((0, 0, ang)).to_matrix().to_4x4()
            ret = bmesh.ops.create_cube(tbm, size=1.0)
            for v in ret["verts"]:
                v.co.x = v.co.x * tl + (r_in - tl * 0.35)
                v.co.y *= tw
                v.co.z *= th
                v.co = m_mat @ v.co
        tbm.to_mesh(tmesh)
        tbm.free()
        ticks = bpy.data.objects.new(f"{name}_TickObj", tmesh)
        bpy.context.scene.collection.objects.link(ticks)
        ticks.data.materials.append(mat_body)
        ticks.parent = ring_root

    return ring_root


def create_torus_knot_core(name, p=3, q=5, R=0.78, r=0.28, tube_r=0.058, steps=220, mat=None, parent=None):
    """Smooth parametric (p,q) torus-knot luminous ribbon mesh."""
    curve_data = bpy.data.curves.new(f"{name}_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = tube_r
    curve_data.bevel_resolution = 5
    curve_data.resolution_u = 2

    spline = curve_data.splines.new("POLY")
    spline.points.add(steps - 1)
    for i in range(steps):
        u = 2.0 * math.pi * i / steps
        rad = R + r * math.cos(q * u)
        x = rad * math.cos(p * u)
        y = rad * math.sin(p * u)
        z = r * math.sin(q * u)
        spline.points[i].co = (x, y, z, 1.0)
    spline.use_cyclic_u = True

    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def build_scene():
    scene = init_cinema_scene(
        res_x=1920,
        res_y=1080,
        fps=24,
        samples=20,
        adaptive_threshold=0.038,
        max_bounces=6,
        transmission_bounces=6,
        motion_blur=True,
        shutter=0.48,
        bloom_threshold=0.78,
        bloom_strength=0.36,
        bloom_size=0.76,
        streak_strength=0.12,
        dispersion=0.0028,
        exposure=0.12,
        look="AgX - Punchy",
    )
    scene.frame_start = 0
    scene.frame_end = TOTAL_FRAMES - 1

    set_dark_studio_world(
        scene,
        zenith=(0.004, 0.006, 0.016),
        horizon=(0.015, 0.022, 0.042),
        strength=0.60,
    )

    # Materials
    m_floor = mat_obsidian_mirror("CathedralFloor", base_color=(0.007, 0.010, 0.018), rough_min=0.025, rough_max=0.12, bump_strength=0.035)
    m_gold = mat_brushed_gold("AstrolabeGold", color=(1.0, 0.77, 0.34), roughness=0.16)
    m_ti = mat_dark_titanium("AstrolabeTi", color=(0.042, 0.050, 0.072), roughness=0.23)
    m_pillar = mat_dark_titanium("ObsidianPillar", color=(0.022, 0.026, 0.040), roughness=0.28)
    m_glass = mat_crystal_glass("CoreCrystal", tint=(0.82, 0.94, 1.0), roughness=0.02, ior=1.72, irid_strength=0.4)
    m_glow_gold = mat_emission("InlayGold", color=(1.0, 0.76, 0.32), strength=14.0)
    m_glow_cyan = mat_emission("InlayCyan", color=(0.30, 0.82, 1.0), strength=13.0)
    m_knot_gold = mat_emission("KnotGold", color=(1.0, 0.86, 0.52), strength=24.0, fresnel_boost=1.0, edge_color=(1.0, 0.52, 0.16))
    m_knot_cyan = mat_emission("KnotCyan", color=(0.45, 0.90, 1.0), strength=18.0)
    m_ray_warm = mat_godray_beam("CathedralRayWarm", color=(1.0, 0.78, 0.44), intensity=0.095)
    m_ray_cool = mat_godray_beam("CathedralRayCool", color=(0.32, 0.74, 1.0), intensity=0.07)

    # 1. Cathedral Mirror Floor + Inlaid Golden Compass Circles
    bpy.ops.mesh.primitive_plane_add(size=180.0, location=(0, 0, -5.8))
    fl = bpy.context.active_object
    fl.data.materials.append(m_floor)

    for r_comp, mat_c in [(4.2, m_glow_gold), (7.6, m_gold), (11.5, m_glow_cyan), (16.5, m_gold)]:
        bpy.ops.mesh.primitive_torus_add(
            major_radius=r_comp,
            minor_radius=0.032,
            major_segments=128,
            minor_segments=12,
            location=(0, 0, -5.77),
        )
        cr = bpy.context.active_object
        set_smooth(cr)
        cr.data.materials.append(mat_c)

    # 2. 12 Monumental Fluted Obsidian-and-Gold Cathedral Pillars
    for k in range(12):
        ang = 2.0 * math.pi * k / 12.0 + math.radians(15)
        prad = 18.5
        px, py = math.cos(ang) * prad, math.sin(ang) * prad
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.95, depth=34.0, location=(px, py, 11.0))
        pil = bpy.context.active_object
        pil.name = f"Pillar_{k}"
        pil.data.materials.append(m_pillar)

        # Inward-facing glowing gold architectural light strip on every pillar!
        in_x = math.cos(ang) * (prad - 0.96)
        in_y = math.sin(ang) * (prad - 0.96)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(in_x, in_y, 6.0))
        strip = bpy.context.active_object
        strip.scale = (0.06, 0.06, 22.0)
        strip.rotation_euler = (0, 0, ang)
        strip.data.materials.append(m_glow_gold if k % 2 == 0 else m_glow_cyan)

        # Gold pedestal collar ring
        bpy.ops.mesh.primitive_torus_add(major_radius=1.05, minor_radius=0.09, major_segments=32, minor_segments=12, location=(px, py, -5.3))
        col = bpy.context.active_object
        set_smooth(col)
        col.data.materials.append(m_gold)

    # 3. THE 7-RING CELESTIAL ARMILLARY ASTROLABE (Center at (0, 0, 1.3))
    astro_root = bpy.data.objects.new("AstrolabeRoot", None)
    scene.collection.objects.link(astro_root)
    astro_root.location = (0, 0, 1.3)

    ring_specs = [
        # (radius, width, thickness, mat_body, mat_inlay, ticks, init_euler_deg, rot_vel)
        (6.40, 0.34, 0.18, m_gold, m_glow_gold, 36, (18, 12, 0),   (0.004, 0.008, 0.011)),
        (5.45, 0.28, 0.16, m_ti,   m_glow_cyan, 32, (-48, 22, 15), (-0.010, 0.006, -0.013)),
        (4.55, 0.26, 0.15, m_gold, m_glow_gold, 28, (64, -30, 0),  (0.013, -0.009, 0.015)),
        (3.75, 0.22, 0.14, m_ti,   m_glow_cyan, 24, (-25, 58, 40), (-0.015, 0.014, -0.012)),
        (3.02, 0.20, 0.12, m_gold, m_glow_gold, 20, (35, -45, 20), (0.018, 0.012, 0.020)),
        (2.38, 0.16, 0.10, m_ti,   m_glow_cyan, 16, (-72, 18, 60), (-0.022, -0.016, 0.018)),
        (1.80, 0.14, 0.09, m_gold, m_glow_gold, 12, (22, 70, -15), (0.026, -0.020, -0.024)),
    ]
    astro_rings = []
    for idx, (rad, w, th, mb, mi, tk, init_deg, rvel) in enumerate(ring_specs):
        r_obj = create_astrolabe_ring(f"GimbalRing_{idx}", rad, w, th, mb, mi, tick_count=tk, parent=astro_root)
        # Attach 2 refractive crystal moons to alternating rings!
        if idx in (0, 2, 4):
            for side in (-1, 1):
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.22 - idx * 0.02)
                moon = bpy.context.active_object
                moon.location = (side * (rad + 0.32), 0, 0)
                moon.data.materials.append(m_glass)
                moon.parent = r_obj
        astro_rings.append((r_obj, [math.radians(a) for a in init_deg], rvel))

    # Heart of the Astrolabe: Double Intertwined Torus-Knot + Crystal Sphere Core
    core_group = bpy.data.objects.new("StarCoreGroup", None)
    scene.collection.objects.link(core_group)
    core_group.parent = astro_root

    knot1 = create_torus_knot_core("TorusKnotGold", p=3, q=5, R=0.82, r=0.26, tube_r=0.052, mat=m_knot_gold, parent=core_group)
    knot2 = create_torus_knot_core("TorusKnotCyan", p=2, q=3, R=0.62, r=0.18, tube_r=0.034, mat=m_knot_cyan, parent=core_group)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.48)
    center_crystal = bpy.context.active_object
    center_crystal.data.materials.append(m_glass)
    center_crystal.parent = core_group

    # 4. Sculpted Cathedral God-Rays
    add_godray_cone(scene, "CRay1", (5.5, 3.0, 9.0), (14, -26, 0), radius_top=1.0, radius_bot=6.2, height=24.0, mat=m_ray_warm)
    add_godray_cone(scene, "CRay2", (-6.0, 4.0, 9.5), (12, 28, 0), radius_top=1.0, radius_bot=6.5, height=24.0, mat=m_ray_cool)
    add_godray_cone(scene, "CRay3", (0.0, 7.5, 10.5), (-22, 0, 0), radius_top=1.2, radius_bot=7.0, height=25.0, mat=m_ray_warm)

    # 5. Atmospheric Golden Dust Motes drifting through the cathedral
    rng = random.Random(303)
    m_mote = mat_emission("CathedralMote", color=(1.0, 0.85, 0.50), strength=14.0)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.032)
    mote_mesh = bpy.context.active_object.data
    bpy.data.objects.remove(bpy.context.active_object, do_unlink=True)
    for k in range(110):
        m_obj = bpy.data.objects.new(f"CMote_{k}", mote_mesh)
        scene.collection.objects.link(m_obj)
        m_obj.location = (rng.uniform(-12, 12), rng.uniform(-14, 12), rng.uniform(-4.5, 9.5))
        s_m = rng.uniform(0.5, 1.5)
        m_obj.scale = (s_m, s_m, s_m)
        m_obj.data.materials.append(m_mote)

    # 6. Dramatic Architectural Lighting
    add_area_light(scene, "KeyCathedral", (10.0, -9.0, 12.0), (0, 0, 1.3), energy=4800.0, size=8.0, color=(1.0, 0.78, 0.45))
    add_area_light(scene, "RimCathedral", (-11.0, 9.0, 9.5), (0, 0, 1.3), energy=4200.0, size=9.0, color=(0.25, 0.70, 1.0))
    add_area_light(scene, "FloorBounce", (0.0, -8.0, -4.2), (0, 0, 1.3), energy=900.0, size=6.0, color=(1.0, 0.68, 0.32))
    core_pt = add_point_light(scene, "CoreStarLight", (0, 0, 1.3), energy=1400.0, radius=0.6, color=(1.0, 0.82, 0.48))

    # 7. Camera Rig (Wide 28mm cinema lens for monumental scale!)
    cam, target = add_camera_rig(scene, lens=28.0, fstop=2.4, name="Act3Cam")

    # -----------------------------------------------------------------------
    # Bake Keyframes (Synchronized to Bars 9-12 & Riser into Bar 13 IMAX Blast!)
    # -----------------------------------------------------------------------
    em_knot_g = m_knot_gold.node_tree.nodes["Emission"]
    em_knot_c = m_knot_cyan.node_tree.nodes["Emission"]

    for f in range(TOTAL_FRAMES):
        t = f / (TOTAL_FRAMES - 1)
        s = smootherstep(t)
        pulse = beat_pulse(f + 384, sharpness=4.0)
        riser = smootherstep((f - 132) / 59.0) if f > 132 else 0.0

        # Progressive acceleration of astrolabe gimbals as tension climbs!
        # Integral of (1 + 2.2 * riser^2) gives smooth accelerating angle
        accel_phase = f + 68.0 * (riser ** 2.4)

        for r_obj, init_e, rvel in astro_rings:
            r_obj.rotation_euler = (
                init_e[0] + accel_phase * rvel[0],
                init_e[1] + accel_phase * rvel[1],
                init_e[2] + accel_phase * rvel[2],
            )
            r_obj.keyframe_insert("rotation_euler", frame=f)

        # Star Core beats sharply with the Taiko percussion + builds radiantly toward supernova!
        em_knot_g.inputs["Strength"].default_value = 18.0 + 14.0 * pulse + 42.0 * (riser ** 2.4)
        em_knot_g.inputs["Strength"].keyframe_insert("default_value", frame=f)
        em_knot_c.inputs["Strength"].default_value = 14.0 + 11.0 * pulse + 30.0 * (riser ** 2.2)
        em_knot_c.inputs["Strength"].keyframe_insert("default_value", frame=f)
        core_pt.data.energy = 1100.0 + 800.0 * pulse + 2200.0 * (riser ** 2.2)
        core_pt.data.keyframe_insert("energy", frame=f)

        sc = 1.0 + 0.08 * pulse + 0.25 * (riser ** 2.5)
        core_group.scale = (sc, sc, sc)
        core_group.rotation_euler = (f * 0.015, f * 0.022, f * 0.032)
        core_group.keyframe_insert("scale", frame=f)
        core_group.keyframe_insert("rotation_euler", frame=f)

        # THRILLING CRANE DIVE STRAIGHT THROUGH THE ROTATING RINGS!
        # Starts monumental & low at y=-16.5, sweeps in a graceful S-arc right between rings into y=-3.8!
        cam_y = lerp(-16.5, -3.85, s ** 1.06)
        cam_x = math.sin(t * math.pi * 1.15) * lerp(4.8, 0.45, s)
        cam_z = lerp(-2.2, 1.38, s) + math.sin(t * math.pi) * 1.35
        cam.location = (cam_x, cam_y, cam_z)
        cam.keyframe_insert("location", frame=f)

        target.location = (0.0, 0.0, lerp(1.05, 1.32, s))
        target.keyframe_insert("location", frame=f)

    return scene


if __name__ == "__main__":
    scene = build_scene()
    run_shot_render(
        scene,
        shot_name="shot3_astrolabe",
        total_frames=TOTAL_FRAMES,
        preview_frames=PREVIEW_FRAMES,
        default_out_dir="project/renders/shot3",
        preview_dir="project/renders/previews",
    )
