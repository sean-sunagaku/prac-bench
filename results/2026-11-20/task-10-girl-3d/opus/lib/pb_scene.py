"""Cafe suggestion set, lighting rigs, worlds, cameras and render settings."""
import math
import numpy as np
import bpy
import mathutils
from pb_common import (ensure_collection, new_mesh_object, new_material, node, link, math_node,
                       mix_rgb, color_ramp, srgb, look_at_euler, rng)


# ----------------------------------------------------------------------------
# materials for the set
# ----------------------------------------------------------------------------

def mat_wood(name, base=(176, 122, 74), dark=(120, 76, 40), scale=6.0, rough=0.45):
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (800, 0))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (500, 0))
    tc = node(nt, 'ShaderNodeTexCoord', (-800, 0))
    mp = node(nt, 'ShaderNodeMapping', (-600, 0))
    mp.inputs['Scale'].default_value = (1.0, 1.0, 12.0)
    link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    wave = node(nt, 'ShaderNodeTexWave', (-400, 0))
    wave.wave_type = 'RINGS'
    wave.inputs['Scale'].default_value = scale
    wave.inputs['Distortion'].default_value = 6.0
    wave.inputs['Detail'].default_value = 3.0
    link(nt, mp.outputs[0], wave.inputs['Vector'])
    col = color_ramp(nt, wave.outputs['Fac'], [(0.0, srgb(*dark)), (0.6, srgb(*base)), (1.0, srgb(*base))], (-150, 0))
    link(nt, col, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = 0.15
    link(nt, b.outputs[0], out.inputs['Surface'])
    return mat


def mat_simple(name, color, rough=0.5, metal=0.0, transm=0.0, emission=None, estr=0.0, alpha=1.0):
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (400, 0))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (0, 0))
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Transmission Weight'].default_value = transm
    if emission is not None:
        b.inputs['Emission Color'].default_value = emission
        b.inputs['Emission Strength'].default_value = estr
    b.inputs['Alpha'].default_value = alpha
    link(nt, b.outputs[0], out.inputs['Surface'])
    return mat


def mat_leaf(name):
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (600, 0))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0))
    oi = node(nt, 'ShaderNodeObjectInfo', (-400, 0))
    col = color_ramp(nt, oi.outputs['Random'], [(0.0, srgb(70, 120, 40)), (0.5, srgb(110, 160, 60)), (1.0, srgb(150, 190, 80))], (-150, 0))
    link(nt, col, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.5
    b.inputs['Subsurface Weight'].default_value = 0.0
    b.inputs['Transmission Weight'].default_value = 0.25
    link(nt, b.outputs[0], out.inputs['Surface'])
    return mat


# ----------------------------------------------------------------------------
# geometry helpers
# ----------------------------------------------------------------------------

def box(name, center, size, col, mat, bevel=0.0):
    sx, sy, sz = [s / 2 for s in size]
    v = np.array([[-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz],
                  [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz]]) + np.asarray(center)
    f = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    ob = new_mesh_object(name, v, f, col, smooth=False)
    ob.data.materials.append(mat)
    if bevel > 0:
        m = ob.modifiers.new('Bevel', 'BEVEL')
        m.width = bevel
        m.segments = 2
    return ob


def cylinder(name, center, r, h, col, mat, seg=24, cap=True):
    v, f = [], []
    for k in (0, 1):
        for j in range(seg):
            a = 2 * math.pi * j / seg
            v.append((center[0] + r * math.cos(a), center[1] + r * math.sin(a), center[2] + (k - 0.5) * h))
    for j in range(seg):
        j2 = (j + 1) % seg
        f.append([j, j2, seg + j2, seg + j])
    if cap:
        f.append(list(range(seg))[::-1])
        f.append(list(range(seg, 2 * seg)))
    ob = new_mesh_object(name, np.array(v), f, col, smooth=True)
    ob.data.materials.append(mat)
    return ob


def leaf_cluster(name, base, height, n_leaves, col, mat, seed=0, spread=0.35):
    R = rng(seed)
    verts, faces = [], []
    for k in range(n_leaves):
        t = R.random()
        z = base[2] + height * (0.2 + 0.8 * t)
        ang = R.random() * 2 * math.pi
        rad = spread * (0.3 + 0.7 * R.random()) * (1.0 - 0.4 * t)
        c = np.array([base[0] + rad * math.cos(ang), base[1] + rad * math.sin(ang), z])
        L = 0.08 + 0.08 * R.random()
        W = L * 0.45
        d = np.array([math.cos(ang), math.sin(ang), 0.3 + 0.4 * R.random()])
        d /= np.linalg.norm(d)
        s = np.cross(d, [0, 0, 1])
        if np.linalg.norm(s) < 1e-3:
            s = np.array([1.0, 0, 0])
        s /= np.linalg.norm(s)
        o = len(verts)
        verts += [c, c + d * L * 0.5 + s * W * 0.5, c + d * L, c + d * L * 0.5 - s * W * 0.5]
        faces.append([o, o + 1, o + 2, o + 3])
    ob = new_mesh_object(name, np.array(verts), faces, col, smooth=False)
    ob.data.materials.append(mat)
    return ob


# ----------------------------------------------------------------------------
# cafe set
# ----------------------------------------------------------------------------

def build_cafe(parent):
    col = ensure_collection('Cafe_Set', parent)
    wood = mat_wood('Cafe_Wood_Light')
    wood2 = mat_wood('Cafe_Wood_Shelf', base=(190, 140, 90), dark=(140, 96, 56), scale=4.0)
    wall = mat_simple('Cafe_Wall', srgb(236, 226, 210), 0.9)
    floor = mat_wood('Cafe_Floor', base=(150, 104, 66), dark=(110, 72, 42), scale=3.0, rough=0.6)
    glass = mat_simple('Cafe_Glass', (0.95, 0.97, 1.0, 1), 0.02, transm=1.0)
    metal = mat_simple('Cafe_Metal', srgb(200, 200, 205), 0.25, metal=1.0)
    ceramic = mat_simple('Cafe_Ceramic', srgb(240, 238, 232), 0.3)
    dark = mat_simple('Cafe_DarkMetal', srgb(40, 38, 36), 0.4, metal=0.6)
    outside = mat_simple('Cafe_Outside', srgb(235, 240, 230), 0.5, emission=srgb(250, 252, 245), estr=6.0)
    leaf = mat_leaf('Cafe_Leaf')
    pot = mat_simple('Cafe_Pot', srgb(232, 230, 224), 0.6)
    flower = mat_simple('Cafe_Flower', srgb(250, 248, 240), 0.6)
    stem = mat_simple('Cafe_Stem', srgb(90, 130, 60), 0.6)
    # room shell
    box('Cafe_Floor', (0, 1.0, -0.01), (8, 8, 0.02), col, floor)
    box('Cafe_BackWall', (0.8, 2.6, 1.5), (5.0, 0.1, 3.0), col, wall)
    box('Cafe_LeftWall', (-2.2, 0.8, 1.5), (0.1, 5.0, 3.0), col, wall)
    # window on the back-left with bright exterior
    box('Cafe_WindowLight', (-1.55, 2.54, 1.45), (1.6, 0.02, 2.4), col, outside)
    box('Cafe_SideWindowLight', (-2.14, 0.9, 1.45), (0.02, 2.2, 2.4), col, outside)
    for x in (-2.33, -1.55, -0.77):
        box(f'Cafe_Mullion_{x:+.2f}', (x, 2.5, 1.45), (0.05, 0.05, 2.4), col, dark)
    for y in (-0.2, 0.9, 2.0):
        box(f'Cafe_SideMullion_{y:+.2f}', (-2.1, y, 1.45), (0.05, 0.05, 2.4), col, dark)
    box('Cafe_WindowSill', (-1.55, 2.45, 0.24), (1.7, 0.2, 0.06), col, dark)
    # potted plants by the window
    for i, (x, y, h, nl) in enumerate([(-0.85, 1.25, 1.85, 900), (-1.85, 0.6, 1.3, 500), (-1.55, 2.2, 1.7, 600)]):
        cylinder(f'Cafe_PlantPot_{i}', (x, y, 0.22), 0.2, 0.44, col, pot)
        cylinder(f'Cafe_PlantStem_{i}', (x, y, 0.44 + h * 0.5), 0.015, h, col, stem, seg=8)
        leaf_cluster(f'Cafe_PlantLeaves_{i}', (x, y, 0.5), h, nl, col, leaf, seed=i + 3, spread=0.5)
    # shelves at the back right
    box('Cafe_ShelfBack', (1.1, 2.5, 1.6), (2.2, 0.04, 1.8), col, wood2)
    for zz in (1.05, 1.5, 1.95, 2.4):
        box(f'Cafe_Shelf_{zz:.2f}', (1.1, 2.38, zz), (2.2, 0.26, 0.03), col, wood2)
    R = rng(9)
    k = 0
    for zz in (1.05, 1.5, 1.95):
        x = 0.15
        while x < 2.1:
            r = 0.035 + 0.03 * R.random()
            h = 0.10 + 0.18 * R.random()
            m = [glass, metal, ceramic, ceramic, metal][k % 5]
            cylinder(f'Cafe_Jar_{k:02d}', (x, 2.36, zz + 0.015 + h / 2), r, h, col, m)
            if m is glass:
                cylinder(f'Cafe_JarContent_{k:02d}', (x, 2.36, zz + 0.015 + h * 0.3), r * 0.85, h * 0.55, col,
                         mat_simple(f'Cafe_Beans_{k}', srgb(90 + int(60 * R.random()), 60, 40), 0.7))
            x += 2 * r + 0.05 + 0.08 * R.random()
            k += 1
    # counter (vertical slats) and espresso machine
    box('Cafe_Counter', (1.2, 1.9, 0.5), (2.4, 0.6, 1.0), col, wood)
    box('Cafe_CounterTop', (1.2, 1.9, 1.01), (2.5, 0.66, 0.03), col, wood2)
    box('Cafe_Machine', (1.6, 2.0, 1.22), (0.45, 0.35, 0.38), col, metal, bevel=0.02)
    # chair behind her (left) and table with vase (right)
    box('Cafe_ChairBack', (-0.62, 0.55, 1.05), (0.42, 0.05, 0.28), col, wood, bevel=0.015)
    for x in (-0.80, -0.44):
        box(f'Cafe_ChairPost_{x:+.2f}', (x, 0.55, 0.7), (0.035, 0.035, 0.7), col, wood)
    box('Cafe_ChairSeat', (-0.62, 0.35, 0.46), (0.44, 0.42, 0.04), col, wood, bevel=0.01)
    box('Cafe_Chair2Back', (-0.75, -0.05, 0.85), (0.05, 0.42, 0.26), col, wood, bevel=0.015)
    for yy in (-0.23, 0.13):
        box(f'Cafe_Chair2Post_{yy:+.2f}', (-0.75, yy, 0.6), (0.035, 0.035, 0.6), col, wood)
    box('Cafe_Chair2Seat', (-0.55, -0.05, 0.46), (0.42, 0.44, 0.04), col, wood, bevel=0.01)
    box('Cafe_TableRight', (0.95, 0.95, 0.74), (0.75, 0.75, 0.04), col, wood2, bevel=0.01)
    cylinder('Cafe_TableRightLeg', (0.95, 0.95, 0.37), 0.04, 0.72, col, dark)
    cylinder('Cafe_Vase', (0.85, 0.85, 0.84), 0.04, 0.16, col, glass)
    fl = []
    for i in range(14):
        a = R.random() * 2 * math.pi
        rr = 0.05 * R.random()
        cylinder(f'Cafe_FlowerStem_{i}', (0.85 + rr * math.cos(a) * 0.5, 0.85 + rr * math.sin(a) * 0.5, 0.98),
                 0.003, 0.28, col, stem, seg=6)
    from pb_common import new_mesh_object as _nm
    import bmesh
    bm = bmesh.new()
    for i in range(40):
        a = R.random() * 2 * math.pi
        rr = 0.09 * math.sqrt(R.random())
        c = (0.85 + rr * math.cos(a), 0.85 + rr * math.sin(a), 1.08 + 0.12 * R.random())
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.012 + 0.008 * R.random(),
                                   matrix=mathutils.Matrix.Translation(c))
    me = bpy.data.meshes.new('Cafe_Flowers')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('Cafe_Flowers', me)
    col.objects.link(ob)
    ob.data.materials.append(flower)
    # her own table (foreground, bottom right of the selfie)
    box('Cafe_TableFront', (0.32, -0.40, 0.80), (0.95, 0.60, 0.035), col, wood, bevel=0.008)
    cylinder('Cafe_TableFrontLeg', (0.32, -0.40, 0.40), 0.04, 0.78, col, dark)
    cylinder('Cafe_Cup', (0.55, -0.28, 0.86), 0.04, 0.085, col, ceramic)
    return col


# ----------------------------------------------------------------------------
# lights / worlds / cameras
# ----------------------------------------------------------------------------

def area_light(name, col, pos, target, energy, size, color=(1, 1, 1), size_y=None, spread=None):
    L = bpy.data.lights.new(name, 'AREA')
    L.energy = energy
    L.color = color
    if size_y is not None:
        L.shape = 'RECTANGLE'
        L.size = size
        L.size_y = size_y
    else:
        L.size = size
    if spread is not None:
        L.spread = spread
    ob = bpy.data.objects.new(name, L)
    col.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = look_at_euler(pos, target)
    return ob


def beauty_lights(parent, face, cam=None):
    col = ensure_collection('Lights_Beauty', parent)
    f = np.asarray(face)
    if cam is not None:
        # the phone screen itself: small soft source at the lens -> natural catchlights
        area_light('Light_PhoneScreen', col, np.asarray(cam) + np.array([0.0, 0.0, -0.05]), f, 1.6, 0.07,
                   (0.96, 0.98, 1.0), size_y=0.14)
    area_light('Light_Window_Back', col, f + np.array([-1.5, 1.6, 0.7]), f + np.array([0, 0, -0.1]), 210, 1.6,
               (1.0, 0.97, 0.92), size_y=2.0)
    area_light('Light_Key_Soft', col, f + np.array([-0.75, -1.05, 0.55]), f + np.array([0, 0.0, -0.08]), 70, 1.4,
               (1.0, 0.95, 0.90))
    area_light('Light_Fill_Front', col, f + np.array([0.6, -1.1, 0.1]), f + np.array([0, 0, -0.1]), 22, 1.8,
               (0.97, 0.98, 1.0))
    area_light('Light_Rim_Right', col, f + np.array([1.0, 0.9, 0.5]), f, 32, 0.8, (1.0, 0.93, 0.85))
    return col


def studio_lights(parent, center):
    col = ensure_collection('Lights_Studio', parent)
    rig = bpy.data.objects.new('StudioRig', None)
    col.objects.link(rig)
    rig.location = center
    c = np.asarray(center)
    items = [('Studio_Key', np.array([-1.4, -2.0, 1.0]), 420, 1.6),
             ('Studio_Fill', np.array([1.8, -1.6, 0.2]), 160, 2.2),
             ('Studio_Rim', np.array([0.6, 2.2, 1.2]), 260, 1.2),
             ('Studio_Top', np.array([0.0, 0.0, 2.2]), 120, 1.5)]
    for nm, off, e, s in items:
        ob = area_light(nm, col, c + off, c, e, s)
        ob.parent = rig
        ob.matrix_parent_inverse = rig.matrix_world.inverted()
    return col, rig


def make_worlds():
    # beauty: soft warm ambient (indoor cafe)
    w = bpy.data.worlds.new('World_Cafe')
    nt = w.node_tree
    bg = nt.nodes['Background']
    bg.inputs[0].default_value = srgb(235, 225, 212)
    bg.inputs[1].default_value = 0.45
    # studio: neutral light for lighting, plain grey backdrop for camera rays
    ws = bpy.data.worlds.new('World_Studio')
    nt = ws.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = node(nt, 'ShaderNodeOutputWorld', (600, 0))
    lp = node(nt, 'ShaderNodeLightPath', (-200, 200))
    b1 = node(nt, 'ShaderNodeBackground', (0, 50))
    b1.inputs[0].default_value = (0.8, 0.8, 0.8, 1)
    b1.inputs[1].default_value = 0.7
    b2 = node(nt, 'ShaderNodeBackground', (0, -100))
    b2.inputs[0].default_value = srgb(186, 188, 192)
    b2.inputs[1].default_value = 1.0
    mx = node(nt, 'ShaderNodeMixShader', (300, 0))
    link(nt, lp.outputs['Is Camera Ray'], mx.inputs[0])
    link(nt, b1.outputs[0], mx.inputs[1])
    link(nt, b2.outputs[0], mx.inputs[2])
    link(nt, mx.outputs[0], out.inputs['Surface'])
    return w, ws


def make_camera(name, col, pos, target, lens, roll=0.0, sensor=36.0):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = sensor
    cd.sensor_fit = 'AUTO'
    cd.clip_start = 0.02
    cd.clip_end = 50
    ob = bpy.data.objects.new(name, cd)
    col.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = look_at_euler(pos, target, roll)
    return ob


def render_settings(scene, samples=32):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 3
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 8
    scene.cycles.transparent_max_bounces = 16
    scene.cycles.volume_bounces = 0
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False
    scene.cycles.blur_glossy = 0.5
    scene.cycles_curves.shape = 'THICK'
    scene.cycles_curves.subdivisions = 3
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Base Contrast'
    except Exception:
        pass
    scene.view_settings.exposure = -0.35
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.film_transparent = False
