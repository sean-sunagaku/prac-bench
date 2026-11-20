"""Eyeballs: sclera + bulged cornea shell, recessed iris disc, procedural shaders."""
import math
import numpy as np
import bpy
import mathutils
from pb_common import (new_mesh_object, new_material, node, link, math_node, mix_rgb,
                       color_ramp, srgb)

R_EYE = 0.0132        # sclera radius (m)
R_LIMBUS = 0.0066     # limbus / visible iris radius
R_CORNEA = 0.0079     # cornea curvature radius
R_PUPIL = 0.00165


def cornea_params():
    zl = math.sqrt(R_EYE ** 2 - R_LIMBUS ** 2)
    zc = zl - math.sqrt(R_CORNEA ** 2 - R_LIMBUS ** 2)
    return zl, zc


def outer_radius(cos_t):
    """Radius of outer eye surface along a direction with cos(angle to gaze)."""
    zl, zc = cornea_params()
    cos_t = np.clip(cos_t, -1, 1)
    sin2 = 1 - cos_t ** 2
    disc = R_CORNEA ** 2 - zc ** 2 * sin2
    t_c = np.where(disc > 0, zc * cos_t + np.sqrt(np.maximum(disc, 0)), 0.0)
    return np.maximum(R_EYE, t_c)


def surf_radius_fn(dirs, gaze=None):
    """Outer eye radius along unit directions; gaze defaults to rest (-Y)."""
    g = np.array([0.0, -1.0, 0.0]) if gaze is None else np.asarray(gaze) / np.linalg.norm(gaze)
    return outer_radius(dirs @ g)


surf_radius_fn_rest = surf_radius_fn


def _revolve(profile_r, profile_z, segs):
    """Revolve (radial, forward) profile around the forward axis (-Y)."""
    verts = []
    n = len(profile_r)
    for i in range(n):
        r, z = profile_r[i], profile_z[i]
        if r < 1e-9:
            verts.append((0.0, -z, 0.0))
            continue
        for j in range(segs):
            a = 2 * math.pi * j / segs
            verts.append((r * math.cos(a), -z, r * math.sin(a)))
    return verts


def _revolve_faces(n_rings, segs, cap_front=True, cap_back=True):
    faces = []
    # ring k (0-based among rings with radius>0) starts at offset
    off = 1 if cap_front else 0
    if cap_front:
        for j in range(segs):
            faces.append([0, off + (j + 1) % segs, off + j])
    for k in range(n_rings - 1):
        a = off + k * segs
        b = off + (k + 1) * segs
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append([a + j, a + j2, b + j2, b + j])
    if cap_back:
        last = off + n_rings * segs
        a = off + (n_rings - 1) * segs
        for j in range(segs):
            faces.append([a + j, a + (j + 1) % segs, last])
    return [f[::-1] for f in faces]


def build_eye_meshes(collection, name, segs=72):
    zl, zc = cornea_params()
    # --- outer shell (cornea + sclera) -------------------------------------
    t_l = math.acos(zl / R_EYE)
    thetas = list(np.linspace(0, t_l * 0.98, 16)[1:]) + list(np.linspace(t_l * 1.02, math.pi * 0.97, 30))
    pr, pz = [0.0], [zc + R_CORNEA]
    for t in thetas:
        r = float(outer_radius(math.cos(t)))
        pr.append(r * math.sin(t))
        pz.append(r * math.cos(t))
    pr.append(0.0)
    pz.append(-R_EYE)
    verts = _revolve(pr, pz, segs)
    faces = _revolve_faces(len(thetas), segs)
    shell = new_mesh_object(name + "_Shell", np.array(verts), faces, collection)
    # --- iris disc (slightly conical: pupil margin a little forward) ----------
    rs = np.concatenate([np.linspace(R_PUPIL * 0.55, R_PUPIL, 4), np.linspace(R_PUPIL * 1.15, R_LIMBUS * 1.03, 14)])
    pr = [0.0]
    pz = [zl - 0.0003]
    for r in rs:
        rr = r / R_LIMBUS
        z = zl - 0.00055 - 0.00035 * (rr) + 0.0002 * math.exp(-((rr - 0.45) / 0.15) ** 2)
        pr.append(r)
        pz.append(z)
    verts = _revolve(pr, pz, segs)
    faces = _revolve_faces(len(rs), segs, cap_front=True, cap_back=False)
    iris = new_mesh_object(name + "_Iris", np.array(verts), faces, collection)
    # --- dark inner bowl behind iris (no see-through) -------------------------
    return shell, iris


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------

def make_eye_shell_material():
    mat, nt = new_material("Eye_Shell")
    out = node(nt, 'ShaderNodeOutputMaterial', (1400, 0))
    tc = node(nt, 'ShaderNodeTexCoord', (-1400, 0))
    sep = node(nt, 'ShaderNodeSeparateXYZ', (-1200, 0))
    link(nt, tc.outputs['Object'], sep.inputs[0])
    # radial distance from gaze axis (object local: gaze = -Y)
    x2 = math_node(nt, 'MULTIPLY', sep.outputs[0], sep.outputs[0], (-1000, 100))
    z2 = math_node(nt, 'MULTIPLY', sep.outputs[2], sep.outputs[2], (-1000, -50))
    r = math_node(nt, 'SQRT', math_node(nt, 'ADD', x2, z2, (-850, 0)), None, (-700, 0))
    front = math_node(nt, 'LESS_THAN', sep.outputs[1], 0.0, (-700, -200))
    # cornea mask: r < limbus (soft edge)
    cm = math_node(nt, 'SUBTRACT', R_LIMBUS * 0.985, r, (-500, 100))
    cm = math_node(nt, 'MULTIPLY', cm, 1.0 / 0.00035, (-350, 100), clamp=True)
    cm = math_node(nt, 'MULTIPLY', cm, front, (-200, 100))
    # --- sclera ---
    noise = node(nt, 'ShaderNodeTexNoise', (-700, -450), label='VeinNoise')
    noise.inputs['Scale'].default_value = 900.0
    noise.inputs['Detail'].default_value = 8.0
    noise.inputs['Distortion'].default_value = 0.6
    link(nt, tc.outputs['Object'], noise.inputs['Vector'])
    veins = color_ramp(nt, noise.outputs['Fac'], [(0.0, (0, 0, 0)), (0.48, (0, 0, 0)), (0.5, (1, 1, 1)), (0.52, (0, 0, 0))], (-500, -450))
    # vein strength grows toward the eye corners (|x| large) and away from limbus
    lat = math_node(nt, 'ABSOLUTE', sep.outputs[0], None, (-700, -650))
    lat = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', lat, 0.006, (-550, -650)), 1.0 / 0.007, (-400, -650), clamp=True)
    vfac = math_node(nt, 'MULTIPLY', node_bw(nt, veins, (-300, -450)), lat, (-150, -500))
    vfac = math_node(nt, 'MULTIPLY', vfac, 0.35, (0, -500))
    sc_base = srgb(205, 192, 182)
    sc_col = mix_rgb(nt, vfac, sc_base, srgb(190, 90, 80), loc=(150, -400))
    # limbal darkening ring
    ring = math_node(nt, 'SUBTRACT', r, R_LIMBUS, (-500, 300))
    ring = math_node(nt, 'ABSOLUTE', ring, None, (-350, 300))
    ring = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MULTIPLY', ring, 1.0 / 0.0009, (-200, 300), clamp=True), (-50, 300))
    sc_col2 = mix_rgb(nt, math_node(nt, 'MULTIPLY', ring, 0.55, (100, 300)), sc_col, srgb(120, 105, 95), loc=(300, -300))
    sclera = node(nt, 'ShaderNodeBsdfPrincipled', (550, -300))
    link(nt, sc_col2, sclera.inputs['Base Color'])
    sclera.inputs['Roughness'].default_value = 0.08
    sclera.inputs['Subsurface Weight'].default_value = 0.4
    sclera.inputs['Subsurface Radius'].default_value = (1.0, 0.5, 0.35)
    sclera.inputs['Subsurface Scale'].default_value = 0.002
    sclera.inputs['Coat Weight'].default_value = 0.6
    sclera.inputs['Coat Roughness'].default_value = 0.02
    # --- cornea: clear tear film (transparent + sharp gloss) ---
    transp = node(nt, 'ShaderNodeBsdfTransparent', (550, 200))
    gloss = node(nt, 'ShaderNodeBsdfGlossy', (550, 50))
    gloss.inputs['Roughness'].default_value = 0.015
    fres = node(nt, 'ShaderNodeFresnel', (550, 350))
    fres.inputs['IOR'].default_value = 1.376
    corn = node(nt, 'ShaderNodeMixShader', (800, 150))
    link(nt, fres.outputs[0], corn.inputs[0])
    link(nt, transp.outputs[0], corn.inputs[1])
    link(nt, gloss.outputs[0], corn.inputs[2])
    mix = node(nt, 'ShaderNodeMixShader', (1100, 0))
    link(nt, cm, mix.inputs[0])
    link(nt, sclera.outputs[0], mix.inputs[1])
    link(nt, corn.outputs[0], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs['Surface'])
    return mat


def node_bw(nt, col, loc):
    n = node(nt, 'ShaderNodeRGBToBW', loc)
    link(nt, col, n.inputs[0])
    return n.outputs[0]


def make_iris_material(base=(100, 56, 30), light=(160, 104, 52), dark=(44, 24, 12)):
    mat, nt = new_material("Eye_Iris")
    out = node(nt, 'ShaderNodeOutputMaterial', (1400, 0))
    tc = node(nt, 'ShaderNodeTexCoord', (-1500, 0))
    sep = node(nt, 'ShaderNodeSeparateXYZ', (-1300, 0))
    link(nt, tc.outputs['Object'], sep.inputs[0])
    x2 = math_node(nt, 'MULTIPLY', sep.outputs[0], sep.outputs[0], (-1100, 100))
    z2 = math_node(nt, 'MULTIPLY', sep.outputs[2], sep.outputs[2], (-1100, -50))
    r = math_node(nt, 'SQRT', math_node(nt, 'ADD', x2, z2, (-950, 0)), None, (-800, 0))
    rn = math_node(nt, 'DIVIDE', r, R_LIMBUS, (-650, 0))          # 0..1
    ang = math_node(nt, 'ARCTAN2', sep.outputs[2], sep.outputs[0], (-800, -200))
    # radial fibres: noise over (angle*k, r*m)
    comb = node(nt, 'ShaderNodeCombineXYZ', (-500, -200))
    link(nt, math_node(nt, 'MULTIPLY', ang, 9.0, (-650, -200)), comb.inputs[0])
    link(nt, math_node(nt, 'MULTIPLY', rn, 1.3, (-650, -320)), comb.inputs[1])
    fib = node(nt, 'ShaderNodeTexNoise', (-300, -200), label='IrisFibres')
    fib.inputs['Scale'].default_value = 6.0
    fib.inputs['Detail'].default_value = 10.0
    fib.inputs['Roughness'].default_value = 0.65
    fib.inputs['Distortion'].default_value = 0.2
    link(nt, comb.outputs[0], fib.inputs['Vector'])
    comb2 = node(nt, 'ShaderNodeCombineXYZ', (-500, -450))
    link(nt, math_node(nt, 'MULTIPLY', ang, 30.0, (-650, -450)), comb2.inputs[0])
    link(nt, math_node(nt, 'MULTIPLY', rn, 0.5, (-650, -560)), comb2.inputs[1])
    fib2 = node(nt, 'ShaderNodeTexNoise', (-300, -450), label='IrisFineFibres')
    fib2.inputs['Scale'].default_value = 5.0
    fib2.inputs['Detail'].default_value = 6.0
    link(nt, comb2.outputs[0], fib2.inputs['Vector'])
    f = math_node(nt, 'MULTIPLY', fib.outputs['Fac'], fib2.outputs['Fac'], (-100, -300))
    f = math_node(nt, 'MULTIPLY', f, 2.2, (50, -300), clamp=True)
    # radial colour zones
    zones = color_ramp(nt, rn, [
        (0.0, srgb(8, 6, 5)), (0.255, srgb(8, 6, 5)), (0.29, srgb(*dark)),
        (0.36, srgb(*light)), (0.50, srgb(*base)), (0.80, srgb(int(base[0] * .8), int(base[1] * .78), int(base[2] * .78))),
        (0.94, srgb(*dark)), (1.0, srgb(30, 18, 10))], (-300, 200))
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY', f, 0.55, (150, -150)), zones, srgb(*light), blend='OVERLAY', loc=(300, 100))
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', 1.0, f, (150, -350)), 0.35, (300, -350)), col, srgb(*dark), loc=(500, 0))
    pupil = math_node(nt, 'LESS_THAN', rn, R_PUPIL / R_LIMBUS, (300, 300))
    col = mix_rgb(nt, pupil, col, (0.004, 0.003, 0.003, 1), loc=(700, 50))
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (950, 0))
    link(nt, col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.35
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    bump = node(nt, 'ShaderNodeBump', (700, -300))
    bump.inputs['Strength'].default_value = 0.25
    bump.inputs['Distance'].default_value = 0.0002
    link(nt, f, bump.inputs['Height'])
    link(nt, bump.outputs[0], bsdf.inputs['Normal'])
    link(nt, bsdf.outputs[0], out.inputs['Surface'])
    return mat


def aim_eye(objs, center, target, up=(0, 0, 1)):
    d = mathutils.Vector(target) - mathutils.Vector(center)
    q = d.to_track_quat('-Y', 'Z')
    for o in objs:
        o.location = center
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = q
