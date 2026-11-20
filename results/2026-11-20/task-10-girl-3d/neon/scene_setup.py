"""
scene_setup.py
Builds the editable sunlit café scenery (Environment_Cafe), calibrated sculptural
sunlit café portrait lighting (no chalky face blowout!), balanced neutral studio
lighting for diagnostic views, and all 5 named cameras:
  - Camera_Beauty (960x1040, gentle slightly-above smartphone selfie matching input/reference.png)
  - Camera_Front (768x768, 0 deg)
  - Camera_ThreeQuarter (768x768, +45 deg showing unobstructed face & left ear)
  - Camera_Side (768x768, +90 deg showing unobstructed true face profile & back hair)
  - Camera_Back (768x768, 180 deg showing full back hair & seamless knitted sweater)
"""
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Euler
from mesh_sculpt import transform_head_point


def _simple_mat(name, color, roughness=0.55, metallic=0.0, transmission=0.0, emission=0.0):
    if name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[name])
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission > 0.0:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    return m


def _aim_object_at(obj, target_pt):
    direction = Vector(target_pt) - obj.location
    rot_quat = direction.to_track_quat("-Z", "Y")
    obj.rotation_euler = rot_quat.to_euler()


def build_cafe_environment(collection):
    """
    Create a warm, sunlit 3D café interior background (zero photo billboards!)
    designed to melt into authentic creamy bokeh behind the character in beauty.png:
      - Bright sunlit café window & mullions on viewer's left (-X)
      - Sunlit potted leafy green indoor ficus plant near window on viewer's left
      - Warm wooden café chair back peeking behind her right shoulder
      - Warm wooden café table + tiny clear glass vase with white flowers clearly framed on right
      - Warm café wood counter & back shelves with soft bottles/cups in upper-right distance
      - Subtle warm wooden foreground table edge sliver at very bottom of beauty frame
    """
    mat_wood_light = _simple_mat("Mat_Cafe_Wood_Light", (0.56, 0.36, 0.19), roughness=0.44)
    mat_wood_mid = _simple_mat("Mat_Cafe_Wood_Mid", (0.40, 0.24, 0.13), roughness=0.48)
    mat_wall = _simple_mat("Mat_Cafe_Wall", (0.80, 0.74, 0.66), roughness=0.82)
    mat_window_glow = _simple_mat("Mat_Cafe_WindowGlow", (1.0, 0.97, 0.90), roughness=0.1, emission=4.6)
    mat_mullion = _simple_mat("Mat_Cafe_Mullion", (0.26, 0.23, 0.21), roughness=0.45, metallic=0.15)
    mat_pot = _simple_mat("Mat_Cafe_Pot", (0.76, 0.72, 0.66), roughness=0.72)
    mat_leaf = _simple_mat("Mat_Cafe_Leaf", (0.17, 0.36, 0.08), roughness=0.36)
    mat_flower = _simple_mat("Mat_Cafe_Flower", (0.98, 0.97, 0.92), roughness=0.42)
    mat_glass = _simple_mat("Mat_Cafe_Glass", (0.95, 0.98, 0.97), roughness=0.05, transmission=0.92)
    mat_ceramic = _simple_mat("Mat_Cafe_Ceramic", (0.86, 0.84, 0.80), roughness=0.25)
    mat_dark_jar = _simple_mat("Mat_Cafe_DarkJar", (0.14, 0.11, 0.09), roughness=0.28)
    mat_metal = _simple_mat("Mat_Cafe_Metal", (0.72, 0.72, 0.70), roughness=0.26, metallic=0.85)

    def add_box(name, loc, scale, rot=(0, 0, 0), mat=mat_wood_light):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co.x *= scale[0]
            v.co.y *= scale[1]
            v.co.z *= scale[2]
        me = bpy.data.meshes.new(name + "_Mesh")
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(name, me)
        obj.location = loc
        obj.rotation_euler = rot
        obj.data.materials.append(mat)
        collection.objects.link(obj)
        return obj

    def add_cyl(name, loc, r, h, rot=(0, 0, 0), mat=mat_ceramic, segs=18):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r, depth=h)
        for f in bm.faces:
            f.smooth = True
        me = bpy.data.meshes.new(name + "_Mesh")
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(name, me)
        obj.location = loc
        obj.rotation_euler = rot
        obj.data.materials.append(mat)
        collection.objects.link(obj)
        return obj

    # 1. Warm cream café wall (right/back) & bright sunlit window bay (left/back-left)
    add_box("Cafe_Wall_Back", (0.65, 2.35, 1.65), (3.8, 0.08, 3.2), mat=mat_wall)
    add_box("Cafe_Window_LightPanel", (-1.52, 1.82, 1.85), (1.75, 0.06, 2.5), rot=(0, 0, math.radians(-18)), mat=mat_window_glow)
    add_box("Cafe_Window_Mullion_V1", (-1.12, 1.70, 1.75), (0.045, 0.06, 2.4), rot=(0, 0, math.radians(-18)), mat=mat_mullion)
    add_box("Cafe_Window_Mullion_H1", (-1.45, 1.76, 1.38), (1.6, 0.06, 0.04), rot=(0, 0, math.radians(-18)), mat=mat_mullion)

    # 2. Wooden café chair back peeking naturally behind her right shoulder (viewer's left)
    add_box("Cafe_Chair_BackRail", (-0.34, 0.24, 1.24), (0.44, 0.032, 0.085), rot=(math.radians(8), 0, math.radians(-18)), mat=mat_wood_light)
    add_box("Cafe_Chair_Post_L", (-0.52, 0.18, 1.08), (0.036, 0.036, 0.42), rot=(math.radians(8), 0, math.radians(-18)), mat=mat_wood_light)

    # 3. Sunlit potted leafy green indoor ficus plant near left window!
    add_cyl("Cafe_Plant_Pot", (-0.78, 1.12, 1.12), 0.15, 0.34, mat=mat_pot)
    add_cyl("Cafe_Plant_Trunk", (-0.78, 1.12, 1.56), 0.018, 0.62, mat=mat_wood_mid)
    rng = np.random.default_rng(889)
    bm_leaves = bmesh.new()
    for _ in range(115):
        cx = -0.78 + rng.normal(0.0, 0.21)
        cy = 1.12 + rng.normal(0.0, 0.16)
        cz = 1.66 + rng.normal(0.0, 0.24)
        rx = rng.uniform(0.035, 0.068)
        ry = rng.uniform(0.018, 0.034)
        rot_e = Euler((rng.uniform(-1.1, 1.1), rng.uniform(-1.1, 1.1), rng.uniform(0, 6.28)), "XYZ").to_matrix()
        verts_l = []
        for a in np.linspace(0, 2 * math.pi, 7, endpoint=False):
            p_loc = Vector((rx * math.cos(a), ry * math.sin(a), 0.0))
            p_w = rot_e @ p_loc + Vector((cx, cy, cz))
            verts_l.append(bm_leaves.verts.new(p_w))
        f = bm_leaves.faces.new(verts_l)
        f.smooth = True
    me_leaves = bpy.data.meshes.new("Cafe_Plant_Leaves_Mesh")
    bm_leaves.to_mesh(me_leaves)
    bm_leaves.free()
    obj_leaves = bpy.data.objects.new("Cafe_Plant_Leaves", me_leaves)
    obj_leaves.data.materials.append(mat_leaf)
    collection.objects.link(obj_leaves)

    # 4. Warm wooden café table & cute glass vase with tiny white flowers framed nicely on viewer's right (+X)!
    add_box("Cafe_Table_Right", (0.58, 0.68, 1.16), (0.66, 0.54, 0.038), rot=(0, 0, math.radians(12)), mat=mat_wood_light)
    add_box("Cafe_Chair_RightBack", (0.52, 1.02, 1.35), (0.48, 0.032, 0.075), rot=(0, 0, math.radians(8)), mat=mat_wood_light)
    add_cyl("Cafe_Vase_Glass", (0.52, 0.62, 1.25), 0.034, 0.13, mat=mat_glass)
    for fi in range(14):
        ang = rng.uniform(0, 6.28)
        rad = rng.uniform(0.008, 0.050)
        h_f = rng.uniform(0.11, 0.21)
        fx = 0.52 + rad * math.cos(ang)
        fy = 0.62 + rad * math.sin(ang)
        fz = 1.22 + h_f
        add_cyl(f"Cafe_Flower_Stem_{fi}", (0.52 + 0.5 * rad * math.cos(ang), 0.62 + 0.5 * rad * math.sin(ang), 1.21 + 0.5 * h_f), 0.003, h_f, mat=mat_leaf, segs=6)
        bm_bl = bmesh.new()
        bmesh.ops.create_uvsphere(bm_bl, u_segments=8, v_segments=6, radius=rng.uniform(0.011, 0.018))
        me_bl = bpy.data.meshes.new(f"Cafe_Blossom_{fi}_Mesh")
        bm_bl.to_mesh(me_bl)
        bm_bl.free()
        ob_bl = bpy.data.objects.new(f"Cafe_Blossom_{fi}", me_bl)
        ob_bl.location = (fx, fy, fz)
        ob_bl.data.materials.append(mat_flower)
        collection.objects.link(ob_bl)

    # 5. Back wooden café bar counter + wall shelves with soft cups/jars/carafes (viewer's upper right!)
    add_box("Cafe_Counter_Base", (0.78, 1.82, 1.15), (1.7, 0.45, 0.85), mat=mat_wood_mid)
    add_box("Cafe_Counter_Top", (0.78, 1.82, 1.59), (1.75, 0.50, 0.05), mat=mat_wood_light)
    add_box("Cafe_Shelf_1", (0.86, 2.18, 1.88), (1.45, 0.24, 0.038), mat=mat_wood_light)
    add_box("Cafe_Shelf_2", (0.86, 2.18, 2.14), (1.45, 0.24, 0.038), mat=mat_wood_light)
    prop_specs = [
        ((0.36, 1.75, 1.70), 0.048, 0.18, mat_metal),
        ((0.52, 1.77, 1.68), 0.042, 0.14, mat_ceramic),
        ((0.70, 1.79, 1.71), 0.052, 0.19, mat_dark_jar),
        ((0.92, 1.75, 1.68), 0.040, 0.13, mat_ceramic),
        ((0.46, 2.14, 1.98), 0.045, 0.16, mat_dark_jar),
        ((0.66, 2.14, 1.96), 0.040, 0.12, mat_ceramic),
        ((0.88, 2.14, 1.98), 0.048, 0.16, mat_wood_mid),
        ((1.08, 2.14, 1.97), 0.042, 0.14, mat_ceramic),
    ]
    for idx, (loc, r, h, mt) in enumerate(prop_specs):
        add_cyl(f"Cafe_Prop_{idx}", loc, r, h, mat=mt)

    # 6. Subtle warm sunlit wooden foreground café table edge peeking at bottom of beauty portrait
    add_box("Cafe_Table_Foreground", (0.04, -0.35, 0.995), (0.75, 0.30, 0.032), mat=mat_wood_light)


def build_lighting_and_worlds(col_beauty_lights, col_diag_lights):
    """
    Create two cleanly separated lighting setups & world shaders:
      1. Calibrated sculptural sunlit café portrait lighting: soft directional daylight from
         viewer's left, warm sunlit hair/sleeve halo rim, restrained café interior fill (preserves
         sculptural nose/cheek modeling — ZERO chalky face blowout!), crisp upper-left eye catchlight!
      2. Clean balanced studio diagnostic lighting on a plain neutral backdrop for all 4 turnarounds!
    """
    face_target = transform_head_point((0.0, -0.13, 1.52))

    def add_area(name, loc, target, energy, size_x, size_y, color, col, spread_deg=140.0):
        ld = bpy.data.lights.new(name=name, type="AREA")
        ld.shape = "RECTANGLE"
        ld.size = size_x
        ld.size_y = size_y
        ld.energy = energy
        ld.color = color
        ld.spread = math.radians(spread_deg)
        lo = bpy.data.objects.new(name, ld)
        lo.location = loc
        _aim_object_at(lo, target)
        col.objects.link(lo)
        return lo

    # --- BEAUTY SUNLIT CAFE LIGHTING (sculptural side-window daylight -> rich 3D facial modeling!) ---
    # 1. Main sunlit café window key light from viewer's left (-X)
    add_area(
        "Light_Beauty_WindowKey",
        loc=(-1.58, -0.36, 1.88),
        target=face_target + Vector((0.0, -0.04, -0.06)),
        energy=58.0,
        size_x=1.05,
        size_y=1.35,
        color=(1.0, 0.96, 0.89),
        col=col_beauty_lights,
        spread_deg=92.0,
    )
    # 2. Warm golden sunlit back-left window rim (soft golden rim glow on left hair without silvery washout!)
    add_area(
        "Light_Beauty_WindowRim",
        loc=(-1.45, 0.92, 1.80),
        target=face_target + Vector((-0.06, 0.0, -0.16)),
        energy=52.0,
        size_x=0.95,
        size_y=1.35,
        color=(1.0, 0.92, 0.80),
        col=col_beauty_lights,
        spread_deg=88.0,
    )
    # 3. Gentle warm café interior fill from front-right (restrained so facial planes & jawline keep rich 3D depth!)
    add_area(
        "Light_Beauty_CafeFill",
        loc=(1.42, -0.92, 1.56),
        target=face_target + Vector((0.0, 0.0, -0.08)),
        energy=14.5,
        size_x=1.50,
        size_y=1.30,
        color=(1.0, 0.90, 0.81),
        col=col_beauty_lights,
        spread_deg=140.0,
    )
    # 4. Crisp small upper-left window catchlight reflector for sparkling highlights in warm brown eyes!
    add_area(
        "Light_Beauty_EyeCatchlight",
        loc=(-0.34, -0.78, 1.80),
        target=face_target,
        energy=7.5,
        size_x=0.13,
        size_y=0.18,
        color=(1.0, 0.99, 0.97),
        col=col_beauty_lights,
        spread_deg=68.0,
    )
    # 5. Subtle warm wooden table bounce from below-front
    add_area(
        "Light_Beauty_TableBounce",
        loc=(0.04, -0.82, 0.82),
        target=face_target + Vector((0.0, 0.0, -0.14)),
        energy=5.5,
        size_x=0.95,
        size_y=0.75,
        color=(1.0, 0.88, 0.76),
        col=col_beauty_lights,
        spread_deg=130.0,
    )

    # --- DIAGNOSTIC STUDIO LIGHTING (even, clear sculptural modeling across all 0/45/90/180 deg views) ---
    body_mid = Vector((0.0, -0.08, 1.32))
    add_area("Light_Diag_KeyFrontLeft", (-1.45, -1.50, 2.08), body_mid, 88.0, 1.3, 1.3, (1.0, 0.97, 0.94), col_diag_lights)
    add_area("Light_Diag_FillFrontRight", (1.45, -1.25, 1.72), body_mid, 42.0, 1.5, 1.5, (0.95, 0.97, 1.0), col_diag_lights)
    add_area("Light_Diag_BackLeft", (-1.20, 1.65, 1.95), body_mid, 72.0, 1.4, 1.4, (1.0, 0.96, 0.92), col_diag_lights)
    add_area("Light_Diag_BackRight", (1.35, 1.45, 1.85), body_mid, 58.0, 1.4, 1.4, (0.97, 0.97, 1.0), col_diag_lights)

    # --- WORLDS ---
    w_beauty = bpy.data.worlds.new("World_Beauty_Cafe")
    w_beauty.use_nodes = True
    bg_b = w_beauty.node_tree.nodes["Background"]
    bg_b.inputs["Color"].default_value = (0.64, 0.56, 0.47, 1.0)
    bg_b.inputs["Strength"].default_value = 0.28

    w_diag = bpy.data.worlds.new("World_Diagnostic_Studio")
    w_diag.use_nodes = True
    nt = w_diag.node_tree
    bg_d = nt.nodes["Background"]
    bg_d.inputs["Color"].default_value = (0.24, 0.25, 0.27, 1.0)
    bg_d.inputs["Strength"].default_value = 0.45

    return w_beauty, w_diag


def build_cameras(collection):
    """
    Create all 5 named cameras:
      - Camera_Beauty: gentle slightly-above smartphone selfie portrait matching input/reference.png!
      - Camera_Front (0 deg), Camera_ThreeQuarter (+45 deg), Camera_Side (+90 deg), Camera_Back (180 deg)
    """
    eyes_mid = 0.5 * (
        transform_head_point((0.0310, -0.139, 1.5453))
        + transform_head_point((-0.0310, -0.139, 1.5453))
    )

    def make_cam(name, loc, target, lens, dof_fstop=None, focus_dist=None):
        cd = bpy.data.cameras.new(name)
        cd.lens = lens
        cd.sensor_width = 36.0
        cd.clip_start = 0.05
        cd.clip_end = 50.0
        if dof_fstop is not None:
            cd.dof.use_dof = True
            cd.dof.aperture_fstop = dof_fstop
            cd.dof.focus_distance = focus_dist if focus_dist is not None else (Vector(loc) - Vector(target)).length
        co = bpy.data.objects.new(name, cd)
        co.location = loc
        _aim_object_at(co, target)
        collection.objects.link(co)
        return co

    # 1. BEAUTY CAMERA (960x1040):
    # Intimate smartphone selfie portrait matching input/reference.png composition:
    # ~2% headroom above crown, expressive face large & luminous in upper-middle,
    # cozy ribbed pink crew-neck & wavy chestnut cascade in center, both sleeves framing bottom corners!
    beauty_loc = Vector((0.014, -0.565, 1.568))
    beauty_target = Vector((-0.004, -0.095, 1.408))
    focus_d = (beauty_loc - eyes_mid).length
    cam_beauty = make_cam("Camera_Beauty", beauty_loc, beauty_target, lens=35.0, dof_fstop=2.4, focus_dist=focus_d)

    # 2. DIAGNOSTIC TURNAROUND CAMERAS (768x768, full upper-body framing from crown to hem & hands!)
    diag_center = Vector((0.0, -0.14, 1.305))
    diag_dist = 1.62
    diag_z = 1.335

    cams = {"beauty": cam_beauty}
    angles = {
        "front": 0.0,           # Looking from -Y toward +Y
        "three-quarter": 45.0,  # +45 deg around Z -> +X/-Y side (unobstructed left cheek & left ear!)
        "side": 90.0,           # +90 deg -> +X side (true unobstructed left face profile + ear + back hair!)
        "back": 180.0,          # Looking from +Y toward -Y (full back hair & seamless knitted sweater!)
    }
    for key, deg in angles.items():
        rad = math.radians(deg)
        cx = diag_center.x + diag_dist * math.sin(rad)
        cy = diag_center.y - diag_dist * math.cos(rad)
        cam_name = "Camera_" + "".join(p.capitalize() for p in key.split("-"))
        cams[key] = make_cam(cam_name, Vector((cx, cy, diag_z)), diag_center, lens=52.0, dof_fstop=None)

    return cams, eyes_mid


def configure_render_settings(scene, samples=32):
    """Configure Cycles CPU with OpenImageDenoise and AgX photographic color management."""
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 4
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 6
    scene.cycles.transparent_max_bounces = 8
    if hasattr(scene.render, "hair_type"):
        scene.render.hair_type = "STRAND"

    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"

    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Base Contrast"
    except Exception:
        try:
            scene.view_settings.look = "None"
        except Exception:
            pass
    scene.view_settings.exposure = -0.32
    scene.view_settings.gamma = 1.0
