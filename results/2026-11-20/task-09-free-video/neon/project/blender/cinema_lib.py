"""
cinema_lib.py — Shared Cycles Metal GPU Cinema Engine for "KAIROS — Weaving Light"
Blender 5.1.1+ compatible. Physically-based shaders, AgX color management,
anamorphic bloom/streaks compositor, smooth camera rigs, and CLI preview/render driver.
"""
import argparse
import math
import os
import sys
import time
import bpy
from mathutils import Vector, Euler


# ---------------------------------------------------------------------------
# Easing & Math Helpers
# ---------------------------------------------------------------------------
def clamp01(t: float) -> float:
    return max(0.0, min(1.0, float(t)))


def smoothstep(t: float) -> float:
    t = clamp01(t)
    return t * t * (3.0 - 2.0 * t)


def smootherstep(t: float) -> float:
    t = clamp01(t)
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def ease_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 1.0 - (1.0 - t) ** 3


def ease_in_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 4.0 * t * t * t if t < 0.5 else 1.0 - ((-2.0 * t + 2.0) ** 3) / 2.0


def ease_out_back(t: float, overshoot: float = 1.4) -> float:
    t = clamp01(t)
    c3 = overshoot + 1.0
    return 1.0 + c3 * ((t - 1.0) ** 3) + overshoot * ((t - 1.0) ** 2)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def vlerp(a, b, t: float) -> Vector:
    return Vector(a).lerp(Vector(b), t)


def beat_pulse(global_frame: float, sharpness: float = 4.0) -> float:
    """120 BPM @ 24fps => 1 beat = 12 frames. Returns sharp decaying pulse in [0, 1]."""
    phase = (global_frame % 12.0) / 12.0
    return math.exp(-phase * sharpness)


# ---------------------------------------------------------------------------
# Scene & Cycles Metal GPU Initialization
# ---------------------------------------------------------------------------
def init_cinema_scene(
    res_x: int = 1920,
    res_y: int = 1080,
    fps: int = 24,
    samples: int = 20,
    adaptive_threshold: float = 0.035,
    max_bounces: int = 6,
    transmission_bounces: int = 6,
    motion_blur: bool = True,
    shutter: float = 0.45,
    bloom_threshold: float = 0.85,
    bloom_strength: float = 0.32,
    bloom_size: float = 0.72,
    streak_strength: float = 0.08,
    dispersion: float = 0.0025,
    exposure: float = 0.0,
    look: str = "AgX - Punchy",
):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    # Cycles Metal GPU
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == "METAL"

    # Resolution & FPS
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.resolution_percentage = 100
    scene.render.fps = fps
    scene.render.use_persistent_data = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.compression = 15

    # Motion Blur
    scene.render.use_motion_blur = motion_blur
    scene.render.motion_blur_shutter = shutter

    # Sampling & Denoising (GPU OIDN)
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = adaptive_threshold
    scene.cycles.use_denoising = True
    scene.cycles.denoising_use_gpu = True
    scene.cycles.max_bounces = max_bounces
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = transmission_bounces
    scene.cycles.transparent_max_bounces = 24
    scene.cycles.volume_bounces = 0
    scene.cycles.sample_clamp_direct = 18.0
    scene.cycles.sample_clamp_indirect = 8.0
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False

    # Color Management (AgX Filmic)
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = look
    except Exception:
        scene.view_settings.look = "AgX - High Contrast"
    scene.view_settings.exposure = exposure
    scene.view_settings.gamma = 1.0

    # Blender 5.1 Compositor: Bloom + subtle Anamorphic Streaks + Lens Dispersion
    nt = bpy.data.node_groups.new("CinemaComp", "CompositorNodeTree")
    scene.compositing_node_group = nt
    nt.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")

    rl = nt.nodes.new("CompositorNodeRLayers")
    out = nt.nodes.new("NodeGroupOutput")

    cur_socket = rl.outputs["Image"]

    if bloom_strength > 0.0:
        bloom = nt.nodes.new("CompositorNodeGlare")
        bloom.inputs["Type"].default_value = "Bloom"
        bloom.inputs["Quality"].default_value = "High"
        bloom.inputs["Threshold"].default_value = bloom_threshold
        bloom.inputs["Strength"].default_value = bloom_strength
        bloom.inputs["Size"].default_value = bloom_size
        bloom.inputs["Saturation"].default_value = 1.08
        nt.links.new(cur_socket, bloom.inputs["Image"])
        cur_socket = bloom.outputs["Image"]

    if streak_strength > 0.0:
        streaks = nt.nodes.new("CompositorNodeGlare")
        streaks.inputs["Type"].default_value = "Streaks"
        streaks.inputs["Quality"].default_value = "High"
        streaks.inputs["Threshold"].default_value = max(1.4, bloom_threshold * 1.6)
        streaks.inputs["Strength"].default_value = streak_strength
        streaks.inputs["Streaks"].default_value = 2
        streaks.inputs["Streaks Angle"].default_value = 0.0  # Horizontal anamorphic streak!
        streaks.inputs["Fade"].default_value = 0.90
        streaks.inputs["Color Modulation"].default_value = 0.18
        nt.links.new(cur_socket, streaks.inputs["Image"])
        cur_socket = streaks.outputs["Image"]

    if dispersion > 0.0:
        lens = nt.nodes.new("CompositorNodeLensdist")
        lens.inputs["Distortion"].default_value = -0.004
        lens.inputs["Dispersion"].default_value = dispersion
        lens.inputs["Fit"].default_value = True
        nt.links.new(cur_socket, lens.inputs["Image"])
        cur_socket = lens.outputs["Image"]

    nt.links.new(cur_socket, out.inputs["Image"])

    return scene


# ---------------------------------------------------------------------------
# World / Sky Helpers
# ---------------------------------------------------------------------------
def set_dark_studio_world(scene, zenith=(0.003, 0.006, 0.015), horizon=(0.015, 0.025, 0.048), strength=0.6):
    world = bpy.data.worlds.new("CinemaWorld")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*horizon, 1.0)
    ramp.color_ramp.elements[1].position = 0.35
    ramp.color_ramp.elements[1].color = (*zenith, 1.0)

    math_abs = nt.nodes.new("ShaderNodeMath")
    math_abs.operation = "ABSOLUTE"

    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputWorld")

    nt.links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], math_abs.inputs[0])
    nt.links.new(math_abs.outputs["Value"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return world


# ---------------------------------------------------------------------------
# Physically-Based Material Library
# ---------------------------------------------------------------------------
def mat_obsidian_mirror(name="ObsidianMirror", base_color=(0.008, 0.011, 0.020), rough_min=0.02, rough_max=0.14, bump_strength=0.04, noise_scale=6.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.35
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.85
        bsdf.inputs["Coat Roughness"].default_value = 0.03

    tex = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = noise_scale
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.55

    map_r = nt.nodes.new("ShaderNodeMapRange")
    map_r.inputs["From Min"].default_value = 0.25
    map_r.inputs["From Max"].default_value = 0.75
    map_r.inputs["To Min"].default_value = rough_min
    map_r.inputs["To Max"].default_value = rough_max

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.02

    nt.links.new(tex.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], map_r.inputs["Value"])
    nt.links.new(map_r.outputs["Result"], bsdf.inputs["Roughness"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def mat_brushed_gold(name="BrushedGold", color=(0.98, 0.75, 0.34), roughness=0.17, bump_strength=0.035, scale=45.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = 1.0

    tex = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 12.0, 1.0)

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 10.0

    map_r = nt.nodes.new("ShaderNodeMapRange")
    map_r.inputs["From Min"].default_value = 0.3
    map_r.inputs["From Max"].default_value = 0.7
    map_r.inputs["To Min"].default_value = max(0.06, roughness - 0.06)
    map_r.inputs["To Max"].default_value = min(0.45, roughness + 0.08)

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.005

    nt.links.new(tex.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], map_r.inputs["Value"])
    nt.links.new(map_r.outputs["Result"], bsdf.inputs["Roughness"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def mat_dark_titanium(name="DarkTitanium", color=(0.045, 0.052, 0.072), roughness=0.26, bump_strength=0.04):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.92

    tex = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 28.0
    noise.inputs["Detail"].default_value = 8.0

    map_r = nt.nodes.new("ShaderNodeMapRange")
    map_r.inputs["From Min"].default_value = 0.3
    map_r.inputs["From Max"].default_value = 0.7
    map_r.inputs["To Min"].default_value = max(0.10, roughness - 0.08)
    map_r.inputs["To Max"].default_value = min(0.50, roughness + 0.09)

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.006

    nt.links.new(tex.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], map_r.inputs["Value"])
    nt.links.new(map_r.outputs["Result"], bsdf.inputs["Roughness"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def mat_crystal_glass(
    name="CrystalGlass",
    tint=(0.82, 0.93, 1.0),
    roughness=0.025,
    ior=1.72,
    iridescent_tint=(1.0, 0.72, 0.38),
    irid_strength=0.35,
):
    """Refractive diamond/crystal glass with Fresnel thin-film iridescence."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["IOR"].default_value = ior
    bsdf.inputs["Transmission Weight"].default_value = 0.96
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.8
        bsdf.inputs["Coat Roughness"].default_value = 0.01

    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    mix_col = nt.nodes.new("ShaderNodeMix")
    mix_col.data_type = "RGBA"
    mix_col.inputs["A"].default_value = (*tint, 1.0)
    mix_col.inputs["B"].default_value = (*iridescent_tint, 1.0)

    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = irid_strength

    nt.links.new(lw.outputs["Facing"], mul.inputs[0])
    nt.links.new(mul.outputs["Value"], mix_col.inputs["Factor"])
    nt.links.new(mix_col.outputs["Result"], bsdf.inputs["Base Color"])
    return mat


def mat_emission(name="Glow", color=(1.0, 0.76, 0.36), strength=12.0, fresnel_boost=0.0, edge_color=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength

    if fresnel_boost > 0.0 and edge_color is not None:
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.45
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs["A"].default_value = (*color, 1.0)
        mix.inputs["B"].default_value = (*edge_color, 1.0)
        nt.links.new(lw.outputs["Facing"], mix.inputs["Factor"])
        nt.links.new(mix.outputs["Result"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = (*color, 1.0)

    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat


def mat_godray_beam(name="GodRay", color=(1.0, 0.78, 0.46), intensity=0.14):
    """Pure additive noise-free sculpted volumetric light shaft (zero dark occlusion ever!)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    trans = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1.0)
    add_s = nt.nodes.new("ShaderNodeAddShader")

    # Soft Fresnel edge fade so cone silhouette completely vanishes!
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    pow_f = nt.nodes.new("ShaderNodeMath")
    pow_f.operation = "POWER"
    pow_f.inputs[1].default_value = 3.2

    # Smooth vertical fade at both ends of the beam
    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "B_SPLINE"
    ramp.color_ramp.elements[0].position = 0.04
    ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    e_mid = ramp.color_ramp.elements.new(0.50)
    e_mid.color = (1.0, 1.0, 1.0, 1.0)
    ramp.color_ramp.elements[2].position = 0.96
    ramp.color_ramp.elements[2].color = (0.0, 0.0, 0.0, 1.0)

    mul1 = nt.nodes.new("ShaderNodeMath")
    mul1.operation = "MULTIPLY"
    mul2 = nt.nodes.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    mul2.inputs[1].default_value = intensity * 1.4

    nt.links.new(lw.outputs["Facing"], inv.inputs[1])
    nt.links.new(inv.outputs["Value"], pow_f.inputs[0])
    nt.links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(pow_f.outputs["Value"], mul1.inputs[0])
    nt.links.new(ramp.outputs["Color"], mul1.inputs[1])
    nt.links.new(mul1.outputs["Value"], mul2.inputs[0])
    nt.links.new(mul2.outputs["Value"], em.inputs["Strength"])

    nt.links.new(trans.outputs["BSDF"], add_s.inputs[0])
    nt.links.new(em.outputs["Emission"], add_s.inputs[1])
    nt.links.new(add_s.outputs["Shader"], out.inputs["Surface"])
    return mat


# ---------------------------------------------------------------------------
# Camera, Light & Geometry Helpers
# ---------------------------------------------------------------------------
def add_camera_rig(scene, lens=42.0, fstop=2.2, name="CinemaCam"):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 0.05
    cam_data.clip_end = 500.0
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = fstop
    cam_data.dof.aperture_blades = 7

    cam = bpy.data.objects.new(name, cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    target = bpy.data.objects.new(f"{name}_Target", None)
    scene.collection.objects.link(target)
    cam_data.dof.focus_object = target

    con = cam.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    return cam, target


def add_area_light(scene, name, location, target_pos, energy=600.0, size=4.0, size_y=None, color=(1.0, 0.85, 0.65)):
    ld = bpy.data.lights.new(name, type="AREA")
    ld.energy = energy
    ld.color = color
    if size_y is not None:
        ld.shape = "RECTANGLE"
        ld.size = size
        ld.size_y = size_y
    else:
        ld.shape = "DISK"
        ld.size = size
    obj = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(obj)
    obj.location = Vector(location)
    direction = Vector(target_pos) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def add_point_light(scene, name, location, energy=200.0, radius=0.4, color=(1.0, 0.8, 0.45)):
    ld = bpy.data.lights.new(name, type="POINT")
    ld.energy = energy
    ld.shadow_soft_size = radius
    ld.color = color
    obj = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(obj)
    obj.location = Vector(location)
    return obj


def set_smooth(obj):
    if obj.type == "MESH" and obj.data:
        for p in obj.data.polygons:
            p.use_smooth = True


def add_bevel(obj, width=0.015, segments=2):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(28)
    return mod


def add_godray_cone(scene, name, location, rotation_deg, radius_top=0.4, radius_bot=3.8, height=16.0, mat=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=36,
        radius1=radius_bot,
        radius2=radius_top,
        depth=height,
        end_fill_type="NOTHING",
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = tuple(math.radians(a) for a in rotation_deg)
    set_smooth(obj)
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_glossy = False
    obj.visible_transmission = False
    if mat:
        obj.data.materials.append(mat)
    return obj


# ---------------------------------------------------------------------------
# Unified CLI Render Driver
# ---------------------------------------------------------------------------
def parse_cli_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    p = argparse.ArgumentParser()
    p.add_argument("--preview", action="store_true", help="Render 3 hero keyframes only")
    p.add_argument("--start", type=int, default=None)
    p.add_argument("--end", type=int, default=None)
    p.add_argument("--samples", type=int, default=None)
    p.add_argument("--out-dir", type=str, default=None)
    return p.parse_args(argv)


def run_shot_render(scene, shot_name, total_frames, preview_frames, default_out_dir, preview_dir, update_fn=None):
    """
    Either renders preview keyframes or full sequence [start..end].
    If update_fn is provided, calls update_fn(frame) before rendering each frame
    (or relies on keyframes baked onto objects).
    Note: for true Cycles Motion Blur, keyframe animation is best!
    """
    args = parse_cli_args()
    if args.samples is not None:
        scene.cycles.samples = args.samples

    if args.preview:
        os.makedirs(preview_dir, exist_ok=True)
        for idx, f in enumerate(preview_frames):
            scene.frame_set(f)
            if update_fn:
                update_fn(f)
            out_path = os.path.join(preview_dir, f"{shot_name}_p{idx}_f{f:04d}.png")
            scene.render.filepath = out_path
            t0 = time.time()
            bpy.ops.render.render(write_still=True)
            print(f"[PREVIEW] {shot_name} f={f:04d} -> {out_path} ({time.time()-t0:.2f}s)", flush=True)
    else:
        out_dir = args.out_dir or default_out_dir
        os.makedirs(out_dir, exist_ok=True)
        f_start = 0 if args.start is None else args.start
        f_end = (total_frames - 1) if args.end is None else args.end
        t_all = time.time()
        for f in range(f_start, f_end + 1):
            out_path = os.path.join(out_dir, f"frame_{f:04d}.png")
            if os.path.exists(out_path) and os.path.getsize(out_path) > 5000:
                continue
            scene.frame_set(f)
            if update_fn:
                update_fn(f)
            scene.render.filepath = out_path
            t0 = time.time()
            bpy.ops.render.render(write_still=True)
            if f == f_start or (f - f_start) % 24 == 0 or f == f_end:
                dt = time.time() - t0
                elapsed = time.time() - t_all
                print(f"[RENDER] {shot_name} f={f:04d}/{f_end:04d} ({dt:.2f}s/f, elapsed {elapsed:.1f}s)", flush=True)
        print(f"[DONE] {shot_name} rendered in {time.time()-t_all:.1f}s", flush=True)
