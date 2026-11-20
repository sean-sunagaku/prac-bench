"""Build the complete, editable 3D upper-body portrait scene and save character.blend.

Run from this directory:
    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 3 --python build.py

Optional flags after `--`:  --fast (fewer hair strands, preview quality)  --no-hair  --out <file.blend>

Inputs used: input/upper-body.obj (common CC0 MakeHuman hm08 crop), input/base.obj
(same CC0 asset: forearms/hands + vertex check), input/environment.json (landmarks).
input/reference.png is NOT used by this script (appearance reference only).
Everything else (sculpt, eyes, hair, sweater, knit textures, cafe) is procedural.
"""
import sys
import os
import time
import json
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
os.chdir(HERE)

import bpy
import numpy as np
import mathutils

from pb_common import (ensure_collection, new_mesh_object, set_color_attribute, normalize, srgb,
                       bvh_from_arrays, look_at_euler)
from pb_body import (load_upper_body_with_arms, sculpt_face, eye_rings, rebuild_eyelids, EYE_L, EYE_R)
from pb_skin import paint_skin, hairline_z, brow_curve
from pb_eyes import (build_eye_meshes, make_eye_shell_material, make_iris_material, surf_radius_fn, aim_eye)
from pb_pose import (build_pose, skin_weights, apply_skin, load_landmarks, curl_fingers)
from pb_sweater import build_sweater, band_from_loop
from pb_knit import make_knit_images
from pb_materials import (make_skin_material, make_hair_material, make_knit_material)
from pb_facehair import eyelashes, eyebrows
from pb_hair import build_hairstyle, make_curves_object
from pb_scene import (build_cafe, beauty_lights, studio_lights, make_worlds, make_camera, render_settings)

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FAST = '--fast' in ARGS
NO_HAIR = '--no-hair' in ARGS
OUT = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else os.path.join(HERE, 'character.blend')

# ----------------------------------------------------------------------------
# art-direction constants (pose & selfie camera, relative to the posed eyes)
# ----------------------------------------------------------------------------
POSE = dict(torso_rx=3.5, torso_ry=4.0, torso_rz=0.0,
            neck_rx=-2.0, neck_ry=-17.0, neck_rz=-2.0,
            head_rx=-3.0, head_ry=-15.0, head_rz=-3.0, neck_drop=0.008)
CAM_OFFSET = np.array([0.025, -0.315, 0.045])   # selfie camera from eye midpoint
LOOK_OFFSET = np.array([0.0, 0.06, -0.115])     # aim point from eye midpoint
CAM_LENS = 25.5
CAM_ROLL = math.radians(-2.0)
CAM_FSTOP = 2.2
WRIST_R = np.array([-0.16, 0.12, -0.27])        # right wrist target from camera (out of frame, lower left)
WRIST_L = np.array([0.24, 0.12, -0.30])         # left wrist target from camera (out of frame, right)
EYE_CENTER_L = np.array([0.0308, -0.1262, 1.5455])
EYE_CENTER_R = EYE_CENTER_L * np.array([-1, 1, 1])

LOG = []


def log(msg):
    LOG.append(msg)
    print('[build]', msg, flush=True)


def to_head(X, P):
    return X['head'](P)


def main():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = 'Portrait'
    root = ensure_collection('Character')
    c_body = ensure_collection('Character_Body', root)
    c_eyes = ensure_collection('Character_Eyes', root)
    c_hair = ensure_collection('Character_Hair', root)
    c_cloth = ensure_collection('Character_Sweater', root)
    c_cams = ensure_collection('Cameras')

    # ---------------- base mesh ----------------
    co0, faces, uvs, info = load_upper_body_with_arms('input/base.obj', 'input/upper-body.obj')
    log(f'base mesh: {info}')
    lms = load_landmarks('input/environment.json')
    co0 = curl_fingers(co0, lms)
    rgba, masks, extra = paint_skin(co0, faces)
    rL = eye_rings(co0, faces, EYE_L)
    rR = eye_rings(co0, faces, EYE_R)
    co = sculpt_face(co0, faces)

    # ---------------- pose + selfie camera ----------------
    dummy = {'l': (np.array([0.3, -0.3, 1.2]), (1, 0, -1), None, (0, 0, 1)),
             'r': (np.array([-0.3, -0.3, 1.2]), (-1, 0, -1), None, (0, 0, 1))}
    X0, _ = build_pose(None, dummy, POSE)
    eye_mid = X0['head']((EYE_CENTER_L + EYE_CENTER_R) / 2)
    cam = eye_mid + CAM_OFFSET
    look = eye_mid + LOOK_OFFSET
    targets = {'r': (cam + WRIST_R, np.array([-0.5, 0.3, -1.0]), None, np.array([0.8, -0.2, -0.5])),
               'l': (cam + WRIST_L, np.array([0.6, 0.3, -1.0]), None, np.array([-0.8, -0.2, -0.5]))}
    X, chains = build_pose(cam, targets, POSE)
    Rh = X['head'].R
    gaze = {}
    for nm, E in (('L', EYE_CENTER_L), ('R', EYE_CENTER_R)):
        gaze[nm] = Rh.T @ normalize(cam - X['head'](E))
    co = rebuild_eyelids(co, co0, faces, rL, EYE_L, EYE_CENTER_L, 1, surf_radius_fn, gaze=gaze['L'])
    co = rebuild_eyelids(co, co0, faces, rR, EYE_R, EYE_CENTER_R, -1, surf_radius_fn, gaze=gaze['R'])
    log('sculpt + eyelids done')

    # ---------------- lashes & brows (rest frame) ----------------
    lashes = []
    for side, rings, E in ((1, rL, EYE_CENTER_L), (-1, rR, EYE_CENTER_R)):
        up, lo = eyelashes(co, rings[0], E, side, seed=3)
        lashes += [up, lo]
    brows = [eyebrows(co, faces, extra['brow'], s, n=380, seed=5 + int(s > 0), brow_fn=brow_curve) for s in (1, -1)]

    # ---------------- skinning ----------------
    Wt = skin_weights(co)
    cop = apply_skin(co, X, Wt)
    body = new_mesh_object('Body', cop, faces, c_body, uvs=uvs)
    set_color_attribute(body.data, 'skin_tone', rgba)
    set_color_attribute(body.data, 'skin_masks', masks)
    skin_mat = make_skin_material('Skin')
    body.data.materials.append(skin_mat)
    # visible skin: head/neck above the collar + hands (rest is under the sweater)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    phi = np.arctan2(x, -(y + 0.025))
    zn = 1.352 + (1.392 - 1.352) * (1 - np.cos(phi)) / 2
    ell = np.sqrt((x / 0.072) ** 2 + ((y + 0.025) / 0.066) ** 2)
    near_wrist = np.zeros(len(co), bool)
    for sd in ('l', 'r'):
        ch = chains[sd]
        d2 = (ch['W_rest'] - ch['E_rest']) / np.linalg.norm(ch['W_rest'] - ch['E_rest'])
        s2 = ((co - ch['E_rest']) @ d2) / ch['L2']
        near_wrist |= (s2 > 0.72) & (np.linalg.norm(co - ch['W_rest'], axis=1) < 0.09)
    vis = ((z > zn - 0.016) & (ell < 1.3)) | (z > 1.43) | ((Wt['hand_l'] + Wt['hand_r']) > 0.25) | near_wrist
    vg = body.vertex_groups.new(name='skin_visible')
    vg.add([int(i) for i in np.where(vis)[0]], 1.0, 'REPLACE')
    mm = body.modifiers.new('HideUnderSweater', 'MASK')
    mm.vertex_group = 'skin_visible'
    sub = body.modifiers.new('Subdivision', 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 2
    log('body done')

    # ---------------- eyes ----------------
    shell_mat = make_eye_shell_material()
    iris_mat = make_iris_material()
    for nm, E in (('L', EYE_CENTER_L), ('R', EYE_CENTER_R)):
        sh, ir = build_eye_meshes(c_eyes, 'Eye_' + nm)
        sh.data.materials.append(shell_mat)
        ir.data.materials.append(iris_mat)
        aim_eye([sh, ir], X['head'](E), cam)

    # ---------------- lashes & brows -> curves ----------------
    lash_mat = make_hair_material('Hair_Lashes', melanin=0.95, redness=0.3, rough=0.35, tip_lighten=0.0, random_color=0.05)
    brow_mat = make_hair_material('Hair_Brows', melanin=0.62, redness=0.55, rough=0.40, tip_lighten=0.05)
    for k, pts in enumerate(lashes):
        nm = ['Lashes_Upper_L', 'Lashes_Lower_L', 'Lashes_Upper_R', 'Lashes_Lower_R'][k]
        ob = make_curves_object(nm, X['head'](pts.reshape(-1, 3)).reshape(pts.shape), 0.000075, 0.000015, c_hair,
                                taper_start=0.3, seed=k)
        ob.data.materials.append(lash_mat)
    for k, pts in enumerate(brows):
        ob = make_curves_object(['Brow_L', 'Brow_R'][k], X['head'](pts.reshape(-1, 3)).reshape(pts.shape),
                                0.000032, 0.000010, c_hair, taper_start=0.4, seed=10 + k)
        ob.data.materials.append(brow_mat)
    log('eyes, lashes, brows done')

    # ---------------- sweater ----------------
    knit_img, rib_img = make_knit_images()
    knit_img.use_fake_user = True
    rib_img.use_fake_user = True
    knit_mat = make_knit_material('Knit_Sweater', knit_img)
    rib_mat = make_knit_material('Knit_Rib', rib_img, bump=0.9, bump_dist=0.0025)
    sw, sinfo = build_sweater(co, cop, faces, Wt, X, chains, c_cloth)
    sw.data.materials.append(knit_mat)
    s_sub = sw.modifiers.new('Subdivision', 'SUBSURF')
    s_sub.levels = 0
    s_sub.render_levels = 0          # dense voxel-fused mesh is already smooth; keeps the vertex budget for hair
    bvh_body = bvh_from_arrays(cop, faces)
    lps = sinfo['loops']
    sco = sinfo['co']
    Rt = X['torso'].R
    band_meshes = []
    if lps['neck']:
        nl = lps['neck']
        prof = [(0.003, -0.008), (0.006, 0.0), (0.0055, 0.009), (0.0025, 0.017), (-0.0025, 0.0215),
                (-0.0065, 0.019), (-0.0080, 0.010), (-0.0072, 0.0), (-0.005, -0.008)]
        ob = band_from_loop('Sweater_Collar', sco, nl, sco[nl].mean(0), Rt[:, 2], prof, c_cloth, n_out=128,
                            push_from=bvh_body, min_gap=0.0015)
        ob.data.materials.append(rib_mat)
        band_meshes.append(ob)
    if lps['hem']:
        hl = lps['hem']
        prof = [(0.003, 0.008), (0.002, -0.01), (-0.004, -0.03), (-0.006, -0.048), (-0.009, -0.055),
                (-0.013, -0.051), (-0.012, -0.01), (-0.006, 0.008)]
        ob = band_from_loop('Sweater_Hem', sco, hl, sco[hl].mean(0), Rt[:, 2], prof, c_cloth, n_out=180)
        ob.data.materials.append(rib_mat)
        band_meshes.append(ob)
    for side in ('l', 'r'):
        lp = lps['cuff_' + side]
        if not lp:
            continue
        sp = sinfo['sleeve_paths'][side]
        prof = [(0.003, -0.014), (0.004, 0.0), (-0.004, 0.012), (-0.009, 0.026), (-0.011, 0.036), (-0.013, 0.041),
                (-0.017, 0.037), (-0.016, 0.02), (-0.010, 0.0), (-0.006, -0.014)]
        ob = band_from_loop('Sweater_Cuff_' + side.upper(), sco, lp, sco[lp].mean(0), sp['hand_dir'], prof, c_cloth,
                            n_out=80, push_from=bvh_body, min_gap=0.002)
        ob.data.materials.append(rib_mat)
        band_meshes.append(ob)
    for ob in band_meshes:
        m = ob.modifiers.new('Subdivision', 'SUBSURF')
        m.levels = 0
        m.render_levels = 1
    log(f'sweater done: {len(sw.data.vertices)} verts')

    # ---------------- hair ----------------
    hair_stats = {}
    if not NO_HAIR:
        hair_mat = make_hair_material('Hair', melanin=0.82, redness=0.62, rough=0.25, coat=0.2)
        sw_meshes = [(sco, sinfo['faces'])]
        for ob in band_meshes:
            if ob.name.startswith('Sweater_Collar'):
                cc = np.array([v.co[:] for v in ob.data.vertices])
                sw_meshes.append((cc, [list(p.vertices) for p in ob.data.polygons]))
        params = {}
        if FAST:
            params = dict(n_pool=9000, main_clumps=260, bang_clumps=50, side_clumps=25)
        th = time.time()
        style = build_hairstyle(cop, faces, masks[:, 1], X['head'], sw_meshes, hairline_z, params, log=log)
        log(f'hair grown in {time.time() - th:.1f}s')
        names = {'main': 'Hair_Long', 'side': 'Hair_FaceFraming', 'bangs': 'Hair_Bangs'}
        for k, g in style.items():
            rr = 0.000050 if k == 'bangs' else 0.000046
            ob = make_curves_object(names[k], g['pts'], rr, 0.000013, c_hair, seed=hash(k) % 1000)
            ob.data.materials.append(hair_mat)
            hair_stats[names[k]] = dict(strands=int(g['pts'].shape[0]), points=int(g['pts'].shape[0] * g['pts'].shape[1]))

    # ---------------- scene ----------------
    face_c = eye_mid
    c_set = build_cafe(scene.collection)
    beauty_lights(scene.collection, face_c, cam)
    w_cafe, w_studio = make_worlds()
    scene.world = w_cafe
    w_studio.use_fake_user = True
    cam_b = make_camera('Camera_Beauty', c_cams, cam, look, CAM_LENS, CAM_ROLL)
    cam_b.data.dof.use_dof = True
    focus = bpy.data.objects.new('Focus_Eyes', None)
    c_cams.objects.link(focus)
    focus.location = eye_mid + (X['head']((EYE_CENTER_L)) - eye_mid) * 0.3
    cam_b.data.dof.focus_object = focus
    cam_b.data.dof.aperture_fstop = CAM_FSTOP
    scene.camera = cam_b
    # diagnostic cameras around the character bounds
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for ob in root.all_objects:
        if ob.type in ('MESH', 'CURVES'):
            ev = ob.evaluated_get(dg)
            bb = np.array([ob.matrix_world @ mathutils.Vector(c) for c in ev.bound_box])
            pts.append(bb)
    pts = np.concatenate(pts)
    lo, hi = pts.min(0), pts.max(0)
    center = (lo + hi) / 2
    size = hi - lo
    lens = 70.0
    half = math.atan(18.0 / lens)
    diag = {}
    for nm, ang in (('Front', 0), ('ThreeQuarter', 45), ('Side', 90), ('Back', 180)):
        a = math.radians(ang)
        fwd = np.array([-math.sin(a), math.cos(a), 0.0])
        right = np.array([math.cos(a), math.sin(a), 0.0])
        corners = np.array([[lo[0] if i & 1 else hi[0], lo[1] if i & 2 else hi[1], lo[2] if i & 4 else hi[2]] for i in range(8)])
        rel = corners - center
        ext = max(np.abs(rel @ right).max(), np.abs(rel[:, 2]).max())
        depth = np.abs(rel @ fwd).max()
        dist = ext * 1.12 / math.tan(half) + depth
        pos = center - fwd * dist
        diag[nm] = make_camera('Camera_' + nm, c_cams, pos, center, lens)
    c_studio, rig = studio_lights(scene.collection, center)
    c_studio.hide_render = True
    c_studio.hide_viewport = True
    render_settings(scene, samples=32)
    scene.render.resolution_x = 960
    scene.render.resolution_y = 1040
    scene.render.resolution_percentage = 100

    # ---------------- stats & save ----------------
    dg = bpy.context.evaluated_depsgraph_get()
    mesh_v = 0
    base_v = 0
    curve_pts = 0
    for ob in scene.objects:
        if ob.type == 'MESH':
            base_v += len(ob.data.vertices)
            ev = ob.evaluated_get(dg)
            me = ev.to_mesh()
            mesh_v += len(me.vertices)
            ev.to_mesh_clear()
        elif ob.type == 'CURVES':
            curve_pts += len(ob.data.points)
    stats = dict(build_seconds=round(time.time() - t0, 1), base_mesh_vertices=base_v,
                 evaluated_mesh_vertices_render_levels=None, evaluated_mesh_vertices_viewport=mesh_v,
                 hair_curve_points=curve_pts, hair=hair_stats, character_bounds=dict(min=lo.tolist(), max=hi.tolist()),
                 base_info=info, fast=FAST, camera=dict(location=cam.tolist(), look_at=look.tolist(), lens=CAM_LENS,
                                                        fstop=CAM_FSTOP))
    scene['build_stats'] = json.dumps(stats)
    scene['diag_center'] = center.tolist()
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
    with open(os.path.join(HERE, 'build_stats.json'), 'w') as fh:
        json.dump(stats, fh, indent=2)
    log(f'saved {OUT} in {time.time() - t0:.1f}s; stats {stats}')


main()
