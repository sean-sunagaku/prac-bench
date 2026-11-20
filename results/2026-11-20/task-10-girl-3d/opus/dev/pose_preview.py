import sys, os, math, json
sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np, mathutils
from pb_common import *
from pb_body import *
from pb_skin import paint_skin
from pb_eyes import *
from pb_materials import make_skin_material, make_simple_material
from pb_pose import *
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
tag = args[0] if args else 'pose'
cfg = json.loads(args[1]) if len(args) > 1 else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
co0, faces, uvs, info = load_upper_body_with_arms('input/base.obj', 'input/upper-body.obj')
rgba, masks, extra = paint_skin(co0, faces)
rL = eye_rings(co0, faces, EYE_L); rR = eye_rings(co0, faces, EYE_R)
co = sculpt_face(co0, faces)
EL = np.array([0.0308, -0.1262, 1.5455]); ER = EL * np.array([-1, 1, 1])
# --- pose & camera
pose = cfg.get('pose', {})
X0, _ = build_pose(None, {'l': (np.array([0.3, -0.3, 1.2]), (1, 0, -1), None, (0, 0, 1)), 'r': (np.array([-0.3, -0.3, 1.2]), (-1, 0, -1), None, (0, 0, 1))}, pose)
eye_mid = X0['head']((EL + ER) / 2)
cam_off = np.array(cfg.get('cam_off', [0.02, -0.42, 0.11]))
cam = eye_mid + cam_off
look = eye_mid + np.array(cfg.get('look_off', [0.0, 0.05, -0.17]))
tr = cam + np.array(cfg.get('rw', [-0.11, 0.07, -0.12]))
tl = cam + np.array(cfg.get('lw', [0.20, 0.10, -0.16]))
targets = {'r': (tr, np.array(cfg.get('rpole', [-0.5, 0.3, -1.0])), None, np.array(cfg.get('rpalm', [1.0, -0.3, 0.2]))),
           'l': (tl, np.array(cfg.get('lpole', [0.6, 0.3, -1.0])), None, np.array(cfg.get('lpalm', [-1.0, -0.3, 0.2])))}
X, chains = build_pose(cam, targets, pose)
# gaze in head-rest space
Rh = X['head'].R
gz = {}
for nm, E in (('L', EL), ('R', ER)):
    ew = X['head'](E)
    gz[nm] = Rh.T @ normalize(cam - ew)
co = rebuild_eyelids(co, co0, faces, rL, EYE_L, EL, 1, surf_radius_fn, gaze=gz['L'])
co = rebuild_eyelids(co, co0, faces, rR, EYE_R, ER, -1, surf_radius_fn, gaze=gz['R'])
Wt = skin_weights(co)
cop = apply_skin(co, X, Wt)
col = ensure_collection('Character')
body = new_mesh_object('Body', cop, faces, col, uvs=uvs)
set_color_attribute(body.data, 'skin_tone', rgba)
set_color_attribute(body.data, 'skin_masks', masks)
sub = body.modifiers.new('Subdivision', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
body.data.materials.append(make_skin_material())
shell_mat = make_eye_shell_material(); iris_mat = make_iris_material()
for nm, E in (('L', EL), ('R', ER)):
    sh, ir = build_eye_meshes(col, 'Eye_' + nm)
    sh.data.materials.append(shell_mat); ir.data.materials.append(iris_mat)
    ew = X['head'](E)
    aim_eye([sh, ir], ew, cam)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 8; sc.cycles.use_denoising = True
sc.render.threads_mode = 'FIXED'; sc.render.threads = 3
sc.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new('w'); sc.world = w
w.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
def area(name, pos, tgt, energy, size):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = size
    o = bpy.data.objects.new(name, L); sc.collection.objects.link(o); o.location = pos
    o.rotation_euler = look_at_euler(pos, tgt)
area('key', (-0.8, -1.2, 2.0), (0, -0.1, 1.4), 150, 1.5)
camd = bpy.data.cameras.new('cam'); camo = bpy.data.objects.new('cam', camd); sc.collection.objects.link(camo); sc.camera = camo
def render(name, pos, tgt, lens, rx, ry, roll=0.0, sensor_fit='AUTO'):
    camo.location = pos; camo.rotation_euler = look_at_euler(pos, tgt, math.radians(roll)); camd.lens = lens
    camd.sensor_fit = sensor_fit; camd.clip_start = 0.02
    sc.render.resolution_x = rx; sc.render.resolution_y = ry
    sc.render.filepath = os.path.abspath(f'previews/{tag}_{name}.png')
    bpy.ops.render.render(write_still=True)
render('beauty', cam, look, cfg.get('lens', 24), 480, 520, cfg.get('roll', 0.0))
ctr = np.array([0, -0.15, 1.30])
render('front', ctr + np.array([0, -3.2, 0.1]), ctr, 60, 384, 384)
render('side', ctr + np.array([3.2, 0, 0.1]), ctr, 60, 384, 384)
print('CAM', cam.tolist(), 'EYE', eye_mid.tolist(), 'chains', {k: (v['S'].round(3).tolist(), v['E'].round(3).tolist(), v['W'].round(3).tolist()) for k, v in chains.items()})
