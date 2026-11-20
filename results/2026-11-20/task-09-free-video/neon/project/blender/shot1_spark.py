"""
shot1_spark.py — Act I: THE VOID & THE SPARK (Bars 1-4, 0.0s - 8.0s, 192 frames @ 1920x804 2.39:1)
Obsidian liquid mirror ocean, suspended sculptural liquid-gold & sapphire celestial core inside
a brushed-gold geodesic filigree cage, concentric luminous ripples synced to Bars 2/3/4,
volumetric god-rays, and creamy foreground bokeh dust motes.
"""
import math
import os
import random
import sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cinema_lib import (
    init_cinema_scene,
    set_dark_studio_world,
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
    smoothstep,
    smootherstep,
    ease_out_cubic,
    lerp,
    beat_pulse,
    run_shot_render,
)

TOTAL_FRAMES = 192
PREVIEW_FRAMES = [24, 108, 176]


def build_scene():
    scene = init_cinema_scene(
        res_x=1920,
        res_y=804,
        fps=24,
        samples=20,
        adaptive_threshold=0.035,
        motion_blur=True,
        shutter=0.45,
        bloom_threshold=0.75,
        bloom_strength=0.38,
        bloom_size=0.78,
        streak_strength=0.10,
        dispersion=0.0025,
        exposure=0.15,
        look="AgX - Punchy",
    )
    scene.frame_start = 0
    scene.frame_end = TOTAL_FRAMES - 1

    set_dark_studio_world(
        scene,
        zenith=(0.0015, 0.003, 0.009),
        horizon=(0.008, 0.015, 0.034),
        strength=0.38,
    )

    # Materials
    m_ocean = mat_obsidian_mirror(
        "OceanMirror",
        base_color=(0.005, 0.008, 0.016),
        rough_min=0.015,
        rough_max=0.095,
        bump_strength=0.045,
        noise_scale=3.8,
    )
    # Add concentric water-ripple wave bump to ocean mirror
    nt = m_ocean.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes["Texture Coordinate"]
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.rings_direction = "Z"
    wave.inputs["Scale"].default_value = 0.85
    wave.inputs["Distortion"].default_value = 1.6
    wave.inputs["Detail"].default_value = 3.0
    wave_bump = nt.nodes.new("ShaderNodeBump")
    wave_bump.inputs["Strength"].default_value = 0.055
    wave_bump.inputs["Distance"].default_value = 0.015
    old_bump = nt.nodes["Bump"]
    nt.links.new(tex.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], wave_bump.inputs["Height"])
    nt.links.new(old_bump.outputs["Normal"], wave_bump.inputs["Normal"])
    nt.links.new(wave_bump.outputs["Normal"], bsdf.inputs["Normal"])

    m_gold = mat_brushed_gold("FiligreeGold", color=(1.0, 0.78, 0.36), roughness=0.14)
    m_glass = mat_crystal_glass("HaloShell", tint=(0.82, 0.94, 1.0), roughness=0.02, ior=1.52, irid_strength=0.32)
    m_core = mat_emission(
        "SparkCore",
        color=(1.0, 0.78, 0.36),
        strength=11.0,
        fresnel_boost=1.0,
        edge_color=(1.0, 0.45, 0.12),
    )
    m_ring_gold = mat_emission("RippleGold", color=(1.0, 0.78, 0.36), strength=10.0)
    m_ring_cyan = mat_emission("RippleCyan", color=(0.38, 0.82, 1.0), strength=9.0)
    m_mote_gold = mat_emission("MoteGold", color=(1.0, 0.82, 0.44), strength=14.0)
    m_mote_cyan = mat_emission("MoteCyan", color=(0.45, 0.85, 1.0), strength=12.0)
    m_ray_gold = mat_godray_beam("RayGold", color=(1.0, 0.78, 0.42), intensity=0.14)
    m_ray_cyan = mat_godray_beam("RayCyan", color=(0.32, 0.70, 1.0), intensity=0.10)

    # 1. Vast Obsidian Mirror Floor
    bpy.ops.mesh.primitive_plane_add(size=180.0, location=(0, 0, 0))
    ocean = bpy.context.active_object
    ocean.name = "ObsidianOcean"
    ocean.data.materials.append(m_ocean)

    # 2. Hero Sculptural Core Group (Center at (0, 0, 1.72))
    core_root = bpy.data.objects.new("HeroCoreRoot", None)
    scene.collection.objects.link(core_root)
    core_root.location = (0, 0, 1.72)

    # Inner glowing plasma orb
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.52, location=(0, 0, 0))
    inner_orb = bpy.context.active_object
    inner_orb.name = "InnerPlasmaCore"
    set_smooth(inner_orb)
    inner_orb.data.materials.append(m_core)
    inner_orb.parent = core_root

    # Brushed-Gold Geodesic Filigree Cage (Wireframe Modifier!)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.88, location=(0, 0, 0))
    cage = bpy.context.active_object
    cage.name = "GoldGeodesicCage"
    wf = cage.modifiers.new("Wire", "WIREFRAME")
    wf.thickness = 0.024
    wf.use_replace = True
    wf.use_even_offset = True
    cage.data.materials.append(m_gold)
    cage.parent = core_root

    # Secondary Counter-Rotating Sculptural Gold Meridian Rings
    rings = []
    for idx, (maj_r, min_r, tilt_x, tilt_y) in enumerate([
        (1.18, 0.022, 28, -18),
        (1.42, 0.016, -42, 35),
        (1.68, 0.012, 65, 12),
    ]):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=maj_r,
            minor_radius=min_r,
            major_segments=120,
            minor_segments=24,
            location=(0, 0, 0),
        )
        r_obj = bpy.context.active_object
        r_obj.name = f"OrbitRing_{idx}"
        set_smooth(r_obj)
        r_obj.data.materials.append(m_gold if idx != 1 else m_glass)
        r_obj.parent = core_root
        rings.append((r_obj, math.radians(tilt_x), math.radians(tilt_y)))

    # Outer faceted crystal shell (delicate thin glass diamond framing core)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.04, location=(0, 0, 0))
    shell = bpy.context.active_object
    shell.name = "CrystalOuterShell"
    sol = shell.modifiers.new("Solidify", "SOLIDIFY")
    sol.thickness = 0.04
    shell.data.materials.append(m_glass)
    shell.parent = core_root

    # 3. Three Concentric Luminous Ripple Waves on the Ocean Floor (Bars 2, 3, 4 -> f=48, 96, 144)
    ripple_specs = [
        (48, m_ring_gold, 11.5),
        (96, m_ring_cyan, 13.0),
        (144, m_ring_gold, 14.5),
    ]
    ripples = []
    for idx, (start_f, mat, max_rad) in enumerate(ripple_specs):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=1.0,
            minor_radius=0.011,
            major_segments=128,
            minor_segments=12,
            location=(0, 0, 0.025),
        )
        rp = bpy.context.active_object
        rp.name = f"WaterRipple_{idx}"
        set_smooth(rp)
        rp.data.materials.append(mat)
        ripples.append((rp, start_f, max_rad))

    # 4. Distant Subtle Horizon Light-Ring Pillars (gives immense architectural depth!)
    m_pillar_dark = mat_obsidian_mirror("DistantArch", base_color=(0.015, 0.02, 0.032), rough_min=0.18, rough_max=0.35)
    for k in range(8):
        ang = math.radians(-55 + k * (110 / 7))
        dist = 24.0 + (k % 2) * 5.0
        px = math.sin(ang) * dist
        py = math.cos(ang) * dist
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.55, depth=18.0, location=(px, py, 9.0))
        pil = bpy.context.active_object
        pil.name = f"HorizonMonolith_{k}"
        pil.data.materials.append(m_pillar_dark)

    # 5. Volumetric Sculpted God-Rays descending on the core
    add_godray_cone(scene, "GodRay_Gold", (1.8, 0.8, 7.5), (14, -22, 0), radius_top=0.6, radius_bot=4.8, height=17.0, mat=m_ray_gold)
    add_godray_cone(scene, "GodRay_Cyan", (-2.2, 1.5, 7.8), (12, 25, 0), radius_top=0.7, radius_bot=5.2, height=17.5, mat=m_ray_cyan)

    # 6. 110 Floating Luminous Bokeh Dust Motes (some close to lens for shallow DOF bokeh!)
    rng = random.Random(101)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0)
    mote_mesh = bpy.context.active_object.data
    bpy.data.objects.remove(bpy.context.active_object, do_unlink=True)
    mote_objs = []
    for i in range(110):
        m_obj = bpy.data.objects.new(f"Mote_{i}", mote_mesh)
        scene.collection.objects.link(m_obj)
        m_obj.data.materials.append(m_mote_gold if i % 3 != 0 else m_mote_cyan)
        if i < 22:
            # Close foreground bokeh orbs!
            x = rng.uniform(-4.2, 4.2)
            y = rng.uniform(-7.2, -2.5)
            z = rng.uniform(0.35, 3.2)
            rad = rng.uniform(0.016, 0.036)
        else:
            ang = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(1.6, 13.0)
            x = math.cos(ang) * dist
            y = math.sin(ang) * dist
            z = rng.uniform(0.18, 5.2)
            rad = rng.uniform(0.012, 0.034)
        m_obj.scale = (rad, rad, rad)
        mote_objs.append((m_obj, x, y, z, rng.uniform(0.15, 0.65), rng.uniform(0, 2 * math.pi)))

    # 7. Cinema Three-Point Lighting Rig
    key_light = add_area_light(scene, "KeyWarm", (5.5, -4.5, 6.2), (0, 0, 1.7), energy=950.0, size=4.5, color=(1.0, 0.78, 0.45))
    rim_light = add_area_light(scene, "RimSapphire", (-6.0, 4.5, 4.5), (0, 0, 1.7), energy=850.0, size=5.5, color=(0.28, 0.68, 1.0))
    top_light = add_area_light(scene, "TopHair", (0.0, 1.2, 8.5), (0, 0, 1.7), energy=420.0, size=3.0, color=(1.0, 0.90, 0.76))
    core_pt = add_point_light(scene, "CoreLight", (0, 0, 1.72), energy=220.0, radius=0.45, color=(1.0, 0.78, 0.42))

    # 8. Camera Rig (50mm cinema prime, f/1.8 creamy bokeh)
    cam, target = add_camera_rig(scene, lens=46.0, fstop=1.8, name="Act1Cam")

    # -----------------------------------------------------------------------
    # Bake Keyframes for True Cycles Motion Blur!
    # -----------------------------------------------------------------------
    em_core_node = m_core.node_tree.nodes["Emission"]
    for f in range(TOTAL_FRAMES):
        t = f / (TOTAL_FRAMES - 1)
        s = smootherstep(t)
        pulse = beat_pulse(f, sharpness=3.2)

        # Awakening brightness ramp + subtle beat breathing + Bar 4 crescendo
        awakening = smootherstep(f / 42.0)
        finale_surge = smootherstep((f - 156) / 35.0) if f > 156 else 0.0
        core_strength = 2.5 + 9.5 * awakening + 3.5 * pulse * awakening + 22.0 * finale_surge
        em_core_node.inputs["Strength"].default_value = core_strength
        em_core_node.inputs["Strength"].keyframe_insert("default_value", frame=f)

        core_pt.data.energy = 60.0 + 300.0 * awakening + 100.0 * pulse * awakening + 450.0 * finale_surge
        core_pt.data.energy = float(core_pt.data.energy)
        core_pt.data.keyframe_insert("energy", frame=f)

        # Core levitation & subtle growth
        bob = 0.08 * math.sin(f * 0.055)
        core_root.location = (0.0, 0.0, 1.78 + 0.14 * s + bob)
        sc = 0.78 + 0.18 * awakening + 0.025 * pulse * awakening + 0.08 * finale_surge
        core_root.scale = (sc, sc, sc)
        core_root.keyframe_insert("location", frame=f)
        core_root.keyframe_insert("scale", frame=f)

        # Geodesic cage & shell rotation
        cage.rotation_euler = (f * 0.008, f * 0.011, f * 0.014)
        cage.keyframe_insert("rotation_euler", frame=f)
        shell.rotation_euler = (-f * 0.010, f * 0.007, -f * 0.012)
        shell.keyframe_insert("rotation_euler", frame=f)

        for idx, (r_obj, tx, ty) in enumerate(rings):
            spd = 0.016 * (1 + idx * 0.45) * (1.0 + 1.2 * finale_surge)
            r_obj.rotation_euler = (tx + math.sin(f * 0.02 + idx) * 0.25, ty + f * spd * 0.5, f * spd * (1 if idx % 2 == 0 else -1))
            r_obj.keyframe_insert("rotation_euler", frame=f)

        # Expanding Water Ripple Rings (Bars 2, 3, 4)
        for rp, start_f, max_rad in ripples:
            age = f - start_f
            if age < 0:
                rp.scale = (0.01, 0.01, 0.01)
                rp.location.z = -0.5
            else:
                u = min(1.0, age / 72.0)
                rad = lerp(0.75, max_rad, ease_out_cubic(u))
                thick = max(0.05, 1.0 - u * 0.85)
                rp.scale = (rad, rad, thick)
                rp.location.z = 0.022 if u < 0.96 else -0.5
            rp.keyframe_insert("scale", frame=f)
            rp.keyframe_insert("location", frame=f)

        # Floating Dust Motes gentle rise + sway
        for m_obj, bx, by, bz, spd, ph in mote_objs:
            m_obj.location = (
                bx + 0.18 * math.sin(f * 0.03 + ph),
                by + 0.14 * math.cos(f * 0.025 + ph),
                bz + (f / 24.0) * spd * 0.45,
            )
            m_obj.keyframe_insert("location", frame=f)

        # Camera graceful dolly-in & low-to-hero arc showcasing BOTH orb AND mirror ocean reflection!
        ang = lerp(math.radians(-16), math.radians(24), s)
        dist = lerp(11.8, 7.6, s)
        cam_x = math.sin(ang) * dist
        cam_y = -math.cos(ang) * dist
        cam_z = lerp(1.05, 2.35, s) + 0.04 * math.sin(f * 0.05)
        cam.location = (cam_x, cam_y, cam_z)
        cam.keyframe_insert("location", frame=f)

        target.location = (0.0, 0.0, lerp(1.05, 1.38, s))
        target.keyframe_insert("location", frame=f)

    # Smooth ocean wave phase animation
    wave.inputs["Phase Offset"].default_value = 0.0
    wave.inputs["Phase Offset"].keyframe_insert("default_value", frame=0)
    wave.inputs["Phase Offset"].default_value = -10.5
    wave.inputs["Phase Offset"].keyframe_insert("default_value", frame=TOTAL_FRAMES - 1)

    return scene


if __name__ == "__main__":
    scene = build_scene()
    run_shot_render(
        scene,
        shot_name="shot1_spark",
        total_frames=TOTAL_FRAMES,
        preview_frames=PREVIEW_FRAMES,
        default_out_dir="project/renders/shot1",
        preview_dir="project/renders/previews",
    )
