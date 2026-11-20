import math
import numpy as np
import bpy
from mathutils import Vector, Matrix


def make_simple_mat(name, base_color, roughness=0.45, metallic=0.0, transmission=0.0, emission_strength=0.0, sss=0.0):
    mat = bpy.data.materials.new(name=name)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Transmission Weight"].default_value = transmission
    if sss > 0.0:
        bsdf.inputs["Subsurface Weight"].default_value = sss
        bsdf.inputs["Subsurface Scale"].default_value = 0.008
    if emission_strength > 0.0:
        bsdf.inputs["Emission Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def make_wood_mat(name, tone=(0.56, 0.34, 0.17), roughness=0.36):
    mat = bpy.data.materials.new(name=name)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness

    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-720, 120)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.inputs["Scale"].default_value = 6.5
    wave.inputs["Distortion"].default_value = 4.2
    wave.inputs["Detail"].default_value = 3.0
    wave.location = (-500, 120)

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (tone[0] * 0.76, tone[1] * 0.72, tone[2] * 0.68, 1.0)
    ramp.color_ramp.elements[1].color = (min(1.0, tone[0] * 1.18), min(1.0, tone[1] * 1.16), min(1.0, tone[2] * 1.12), 1.0)
    ramp.location = (-260, 140)

    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def add_box(name, center, size, collection, mat, rot_euler=(0.0, 0.0, 0.0), bevel=True):
    hx, hy, hz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    verts = [
        [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
        [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
    ]
    faces = [
        [0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4],
        [2, 3, 7, 6], [1, 2, 6, 5], [3, 0, 4, 7],
    ]
    mesh = bpy.data.meshes.new(f"{name}_Data")
    mesh.from_pydata(verts, [], faces)
    for p in mesh.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    obj.location = center
    obj.rotation_euler = rot_euler
    obj.data.materials.append(mat)
    collection.objects.link(obj)
    if bevel:
        bev = obj.modifiers.new("Bevel", "BEVEL")
        bev.width = min(size) * 0.08
        bev.segments = 2
    return obj


def add_cylinder(name, center, r_bottom, r_top, height, collection, mat, n_seg=24, open_top=False, rot_euler=(0.0, 0.0, 0.0)):
    verts = []
    faces = []
    hz = height * 0.5
    for z, r in [(-hz, r_bottom), (hz, r_top)]:
        for i in range(n_seg):
            ang = 2.0 * math.pi * i / n_seg
            verts.append([r * math.cos(ang), r * math.sin(ang), z])
    for i in range(n_seg):
        inxt = (i + 1) % n_seg
        faces.append([i, inxt, n_seg + inxt, n_seg + i])
    b_idx = len(verts)
    verts.append([0.0, 0.0, -hz])
    for i in range(n_seg):
        faces.append([(i + 1) % n_seg, i, b_idx])
    if not open_top:
        t_idx = len(verts)
        verts.append([0.0, 0.0, hz])
        for i in range(n_seg):
            faces.append([n_seg + i, n_seg + (i + 1) % n_seg, t_idx])

    mesh = bpy.data.meshes.new(f"{name}_Data")
    mesh.from_pydata(verts, [], faces)
    for p in mesh.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    obj.location = center
    obj.rotation_euler = rot_euler
    obj.data.materials.append(mat)
    collection.objects.link(obj)
    return obj


def build_cafe_environment(cafe_collection):
    """
    Build genuine 3D sunlit cafe scenery framed accurately inside BeautyCamera to match input/reference.png:
    - Left (-X): Sunlit window mullions + cream ceramic planter + lush green leafy indoor plant in upper-left bokeh
    - Left-Midground (-X): Warm honey-oak wooden chair backrest right behind her raised right shoulder
    - Bottom-Right & Right (+X): Honey-oak wooden cafe tables, chair back, clear glass vase with stems & white flowers
    - Upper-Right (+X, +Y): Cafe counter, espresso pitchers/cups, wooden shelves with jars/mugs, and chalkboard
    """
    wood_oak = make_wood_mat("Cafe_WoodOak_Mat", tone=(0.58, 0.36, 0.18), roughness=0.33)
    wood_dark = make_wood_mat("Cafe_WoodWalnut_Mat", tone=(0.36, 0.21, 0.11), roughness=0.44)
    wall_cream = make_simple_mat("Cafe_WallCream_Mat", (0.86, 0.80, 0.72), roughness=0.78)
    pot_cream = make_simple_mat("Cafe_CeramicPot_Mat", (0.80, 0.76, 0.70), roughness=0.42)
    leaf_green = make_simple_mat("Cafe_PlantLeaf_Mat", (0.25, 0.50, 0.11), roughness=0.34, sss=0.60)
    flower_white = make_simple_mat("Cafe_WhiteFlower_Mat", (0.97, 0.96, 0.91), roughness=0.40, sss=0.35)
    glass_mat = make_simple_mat("Cafe_GlassVase_Mat", (0.96, 0.99, 0.98), roughness=0.03, transmission=0.96)
    chalk_mat = make_simple_mat("Cafe_Chalkboard_Mat", (0.08, 0.09, 0.10), roughness=0.68)
    mug_white = make_simple_mat("Cafe_CeramicWhite_Mat", (0.93, 0.91, 0.87), roughness=0.18)
    metal_steel = make_simple_mat("Cafe_Stainless_Mat", (0.74, 0.75, 0.77), roughness=0.25, metallic=0.88)
    window_sun = make_simple_mat("Cafe_WindowDaylight_Mat", (1.0, 0.99, 0.94), roughness=0.2, emission_strength=2.8)

    # 1. Foreground Cafe Table edge visible at bottom-right of beauty.png
    add_box("Cafe_FrontTable", (0.14, -0.28, 1.025), (0.70, 0.34, 0.032), cafe_collection, wood_oak, rot_euler=(0.0, 0.0, 0.10))

    # 2. Wooden Chair Backrest behind her right shoulder (-X, viewer's left!)
    add_box("Cafe_ChairBack_Hero", (-0.23, 0.10, 1.335), (0.30, 0.026, 0.11), cafe_collection, wood_oak, rot_euler=(0.06, 0.0, 0.34))
    add_box("Cafe_ChairPost_L", (-0.35, 0.15, 1.22), (0.030, 0.030, 0.34), cafe_collection, wood_oak, rot_euler=(0.06, 0.0, 0.34))

    # 3. Sunlit Window & Lush Potted Green Plant framed right in the upper-left bokeh!
    add_box("Cafe_WindowBackdrop", (-0.88, 1.28, 1.68), (1.15, 0.04, 1.75), cafe_collection, window_sun, rot_euler=(0.0, 0.0, 0.28), bevel=False)
    add_box("Cafe_Mullion_V1", (-0.98, 1.05, 1.58), (0.032, 0.04, 1.65), cafe_collection, chalk_mat, rot_euler=(0.0, 0.0, 0.28))
    add_box("Cafe_Mullion_H1", (-0.82, 1.15, 1.40), (1.10, 0.04, 0.032), cafe_collection, chalk_mat, rot_euler=(0.0, 0.0, 0.28))

    # Positioned at x=-0.34, y=0.58 so cream planter & sunlit green leaves sit clearly in upper-left bokeh!
    pot_pos = (-0.36, 0.60, 1.32)
    add_cylinder("Cafe_PlantPot", pot_pos, 0.11, 0.14, 0.26, cafe_collection, pot_cream)
    add_cylinder("Cafe_PlantStem1", (-0.34, 0.60, 1.62), 0.010, 0.005, 0.52, cafe_collection, wood_dark, rot_euler=(0.05, 0.08, 0.0))
    add_cylinder("Cafe_PlantStem2", (-0.38, 0.58, 1.58), 0.009, 0.004, 0.46, cafe_collection, wood_dark, rot_euler=(-0.06, -0.10, 0.0))

    rng = np.random.default_rng(7722)
    leaf_verts, leaf_faces = [], []
    for _ in range(150):
        lc = np.array([
            -0.33 + rng.normal(0.0, 0.14),
            0.58 + rng.normal(0.0, 0.11),
            1.68 + rng.uniform(-0.22, 0.28),
        ])
        l_len = float(rng.uniform(0.050, 0.088))
        l_wid = l_len * 0.52
        yaw = float(rng.uniform(0.0, 6.28))
        pitch = float(rng.uniform(-0.65, 0.65))
        d_f = np.array([math.cos(yaw) * math.cos(pitch), math.sin(yaw) * math.cos(pitch), math.sin(pitch)])
        d_s = np.cross(d_f, np.array([0.0, 0.0, 1.0]))
        d_s = np.array([1.0, 0.0, 0.0]) if np.linalg.norm(d_s) < 1e-4 else d_s / np.linalg.norm(d_s)
        d_u = np.cross(d_s, d_f)
        b = len(leaf_verts)
        leaf_verts.extend([
            (lc - d_f * l_len * 0.5).tolist(),
            (lc - d_s * l_wid * 0.5 + d_u * 0.008).tolist(),
            (lc + d_f * l_len * 0.5).tolist(),
            (lc + d_s * l_wid * 0.5 + d_u * 0.008).tolist(),
        ])
        leaf_faces.append([b, b + 1, b + 2, b + 3])

    leaf_mesh = bpy.data.meshes.new("Cafe_PlantLeaves_Data")
    leaf_mesh.from_pydata(leaf_verts, [], leaf_faces)
    for p in leaf_mesh.polygons:
        p.use_smooth = True
    leaf_obj = bpy.data.objects.new("Cafe_PlantLeaves", leaf_mesh)
    leaf_obj.data.materials.append(leaf_green)
    cafe_collection.objects.link(leaf_obj)

    # 4. Right Midground Cafe Table + Clear Glass Flower Vase framed at right edge of beauty.png!
    add_box("Cafe_SideTable_R", (0.44, 0.36, 1.25), (0.58, 0.48, 0.030), cafe_collection, wood_oak, rot_euler=(0.0, 0.0, -0.16))
    add_box("Cafe_SideChair_R", (0.38, 0.72, 1.38), (0.40, 0.028, 0.11), cafe_collection, wood_oak, rot_euler=(0.0, 0.0, -0.10))

    vase_pos = (0.36, 0.26, 1.335)
    add_cylinder("Cafe_FlowerVase", vase_pos, 0.030, 0.022, 0.13, cafe_collection, glass_mat, open_top=True)
    fl_v, fl_f = [], []
    for k in range(22):
        ang = 2.0 * math.pi * k / 22.0 + rng.normal(0.0, 0.2)
        rad = float(rng.uniform(0.012, 0.060))
        top_z = 1.425 + float(rng.uniform(0.0, 0.085))
        fc = np.array([vase_pos[0] + rad * math.cos(ang), vase_pos[1] + rad * math.sin(ang), top_z])
        add_cylinder(
            f"Cafe_Stem_{k}",
            ((vase_pos[0] + fc[0]) * 0.5, (vase_pos[1] + fc[1]) * 0.5, (vase_pos[2] + fc[2]) * 0.5),
            0.0020, 0.0016, 0.15, cafe_collection, leaf_green, n_seg=6,
            rot_euler=((fc[1] - vase_pos[1]) * 1.4, -(fc[0] - vase_pos[0]) * 1.4, 0.0),
        )
        s = 0.009
        bi = len(fl_v)
        fl_v.extend([
            (fc + [-s, 0, 0]).tolist(), (fc + [0, -s, 0.003]).tolist(),
            (fc + [s, 0, 0]).tolist(), (fc + [0, s, 0.003]).tolist(),
            (fc + [0, 0, s]).tolist(),
        ])
        fl_f.extend([[bi, bi + 1, bi + 4], [bi + 1, bi + 2, bi + 4], [bi + 2, bi + 3, bi + 4], [bi + 3, bi, bi + 4]])
    fl_mesh = bpy.data.meshes.new("Cafe_Blossoms_Data")
    fl_mesh.from_pydata(fl_v, [], fl_f)
    fl_obj = bpy.data.objects.new("Cafe_Blossoms", fl_mesh)
    fl_obj.data.materials.append(flower_white)
    cafe_collection.objects.link(fl_obj)

    # 5. Upper-Right Cafe Counter, Shelves, Mugs & Chalkboard
    add_box("Cafe_BackWall", (0.42, 2.15, 1.65), (2.60, 0.08, 1.95), cafe_collection, wall_cream, bevel=False)
    add_box("Cafe_Counter", (0.58, 1.55, 1.25), (1.35, 0.40, 0.65), cafe_collection, wood_oak)
    add_box("Cafe_CounterTop", (0.58, 1.55, 1.59), (1.40, 0.44, 0.035), cafe_collection, wood_oak)
    add_box("Cafe_Shelf_Lower", (0.65, 1.98, 1.75), (1.15, 0.20, 0.030), cafe_collection, wood_oak)
    add_box("Cafe_Shelf_Upper", (0.65, 1.98, 1.96), (1.15, 0.20, 0.030), cafe_collection, wood_oak)
    add_box("Cafe_Chalkboard", (0.38, 2.02, 2.10), (0.30, 0.025, 0.20), cafe_collection, chalk_mat)

    add_cylinder("Cafe_Pitcher1", (0.26, 1.50, 1.67), 0.042, 0.038, 0.14, cafe_collection, metal_steel)
    add_box("Cafe_CoffeeBox", (0.46, 1.52, 1.66), (0.13, 0.11, 0.10), cafe_collection, mug_white)
    for im, mx in enumerate([0.34, 0.50, 0.66, 0.82, 0.96]):
        mat_c = wood_dark if im % 2 == 0 else mug_white
        add_cylinder(f"Cafe_ShelfJar_{im}", (mx, 1.96, 1.82), 0.034, 0.034, 0.095, cafe_collection, mat_c, n_seg=16)


def point_object_at(obj, target_pt, roll_deg=0.0):
    loc = Vector(obj.location)
    tgt = Vector(target_pt)
    direction = tgt - loc
    quat = direction.to_track_quat("-Z", "Y")
    if abs(roll_deg) > 1e-5:
        quat = quat @ Matrix.Rotation(math.radians(roll_deg), 4, "Z").to_quaternion()
    obj.rotation_euler = quat.to_euler()


def build_lighting_and_world(lighting_collection, face_target):
    """
    Build natural, flattering sunlit cafe lighting matching input/reference.png:
    - Soft large sunlit cafe window key light on viewer's left (-X)
    - Crisp corneal catchlight fill slightly upper-left of lens
    - Warm honey-wood interior cafe fill on viewer's right (+X)
    - Warm sunlit window hair/shoulder rim light
    - Clean soft studio neutral World backdrop for 768x768 diagnostic views
    """
    world = bpy.data.worlds.new("CafeStudio_World")
    bpy.context.scene.world = world
    nt = world.node_tree
    bg = nt.nodes.get("Background")

    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.15
    ramp.color_ramp.elements[0].color = (0.42, 0.40, 0.39, 1.0)
    ramp.color_ramp.elements[1].position = 0.85
    ramp.color_ramp.elements[1].color = (0.64, 0.62, 0.60, 1.0)
    bg.inputs["Strength"].default_value = 0.42

    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])

    def add_area_light(name, loc, target, power, size_x, size_y, color, spread_deg=120.0):
        ldata = bpy.data.lights.new(name=f"{name}_Data", type="AREA")
        ldata.shape = "RECTANGLE"
        ldata.size = size_x
        ldata.size_y = size_y
        ldata.energy = power
        ldata.color = color
        ldata.spread = math.radians(spread_deg)
        lobj = bpy.data.objects.new(name, ldata)
        lobj.location = loc
        point_object_at(lobj, target)
        lighting_collection.objects.link(lobj)
        return lobj

    # 1. Soft Cafe Window Key Light (-X, viewer's left) — soft flattering wrap without over-bleaching skin!
    key = add_area_light(
        "Key_CafeWindow_Left",
        loc=(-0.88, -0.76, 1.68),
        target=face_target,
        power=11.5,
        size_x=0.80,
        size_y=1.10,
        color=(1.0, 0.96, 0.91),
        spread_deg=105.0,
    )

    # 2. Upper-Left Selfie Catchlight (places sparkling round window reflection at ~10:30 on both irises!)
    catch = add_area_light(
        "Fill_FrontCatchlight",
        loc=(-0.16, -0.88, 1.60),
        target=face_target,
        power=3.8,
        size_x=0.26,
        size_y=0.26,
        color=(1.0, 0.98, 0.95),
        spread_deg=105.0,
    )

    # 3. Warm Cafe Wood-Bounce Fill (+X, viewer's right — gives gentle 3D cheek/nose modeling!)
    fill_r = add_area_light(
        "Fill_WarmCafe_Right",
        loc=(0.95, -0.52, 1.46),
        target=(0.0, -0.10, 1.40),
        power=4.8,
        size_x=0.95,
        size_y=0.95,
        color=(1.0, 0.85, 0.71),
        spread_deg=130.0,
    )

    # 4. Sunlit Window Rim / Backlight (illuminates wispy chestnut hair halo & left pink sleeve edge!)
    rim = add_area_light(
        "Rim_SunlitWindow_BackLeft",
        loc=(-0.76, 0.62, 1.84),
        target=(-0.06, -0.05, 1.48),
        power=13.5,
        size_x=0.68,
        size_y=0.85,
        color=(1.0, 0.94, 0.84),
        spread_deg=95.0,
    )

    # 5. Gentle Back Diagnostic Fill (cleanly illuminates 180-deg back hair & sweater stitches!)
    back_fill = add_area_light(
        "Fill_BackSoft",
        loc=(0.22, 1.35, 1.65),
        target=(0.0, 0.02, 1.32),
        power=7.0,
        size_x=1.15,
        size_y=1.15,
        color=(0.98, 0.95, 0.91),
        spread_deg=135.0,
    )

    return [key, catch, fill_r, rim, back_fill]


def build_cameras(cam_collection, posed_eye_L, posed_eye_R):
    """
    Create BeautyCamera (960x1040 close portrait matching input/reference.png composition!)
    plus 4 clear 768x768 diagnostic cameras at 0, 45, 90, and 180 degrees around the asset.
    """
    eye_mid = 0.5 * (posed_eye_L + posed_eye_R)

    b_data = bpy.data.cameras.new("BeautyCamera_Data")
    b_data.lens = 36.5
    b_data.sensor_width = 36.0
    b_data.clip_start = 0.04
    b_data.clip_end = 25.0
    b_data.dof.use_dof = True

    b_cam = bpy.data.objects.new("BeautyCamera", b_data)
    b_cam.location = (-0.012, -0.572, 1.520)
    look_target = (0.005, -0.105, 1.402)
    point_object_at(b_cam, look_target)
    b_data.dof.focus_distance = float(np.linalg.norm(eye_mid - np.array(b_cam.location)))
    b_data.dof.aperture_fstop = 2.2
    cam_collection.objects.link(b_cam)

    # 4 Diagnostic Cameras (768x768 at 0, 45, 90, 180 deg) tightly framing the entire upper-body asset!
    diag_center = np.array([0.0, -0.14, 1.305])
    diag_radius = 1.24

    diag_specs = [
        ("FrontCamera", 0.0),
        ("ThreeQuarterCamera", 45.0),
        ("SideCamera", 90.0),
        ("BackCamera", 180.0),
    ]

    diag_cams = {}
    for cname, deg in diag_specs:
        rad = math.radians(deg)
        cx = diag_center[0] + diag_radius * math.sin(rad)
        cy = diag_center[1] - diag_radius * math.cos(rad)
        cz = diag_center[2] + 0.05

        cdata = bpy.data.cameras.new(f"{cname}_Data")
        cdata.lens = 54.0
        cdata.sensor_width = 36.0
        cdata.dof.use_dof = False

        cobj = bpy.data.objects.new(cname, cdata)
        cobj.location = (cx, cy, cz)
        point_object_at(cobj, diag_center)
        cam_collection.objects.link(cobj)
        diag_cams[cname] = cobj

    return b_cam, diag_cams
