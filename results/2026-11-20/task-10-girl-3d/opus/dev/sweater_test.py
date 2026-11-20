import sys, os, math, json, time
sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np, mathutils
from pb_common import *
from pb_body import *
from pb_skin import paint_skin
from pb_eyes import *
from pb_materials import make_skin_material, make_simple_material
from pb_pose import *
from pb_sweater import *
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
tag = args[0] if args else 'sw'
cfg = json.loads(args[1]) if len(args) > 1 else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
T0=time.time()
co0, faces, uvs, info = load_upper_body_with_arms('input/base.obj', 'input/upper-body.obj')
lms = load_landmarks()
co0 = curl_fingers(co0, lms)
rgba, masks, extra = paint_skin(co0, faces)
co = sculpt_face(co0, faces)
EL = np.array([0.0308, -0.1262, 1.5455]); ER = EL * np.array([-1, 1, 1])
X0, _ = build_pose(None, {'l': (np.array([0.3, -0.3, 1.2]), (1, 0, -1), None, (0, 0, 1)), 'r': (np.array([-0.3, -0.3, 1.2]), (-1, 0, -1), None, (0, 0, 1))})
eye_mid = X0['head']((EL + ER) / 2)
cam = eye_mid + np.array(cfg.get('cam_off', [0.02, -0.40, 0.10]))
look = eye_mid + np.array(cfg.get('look_off', [0.0, 0.05, -0.16]))
tr = cam + np.array(cfg.get('rw', [-0.16, 0.12, -0.27]))
tl = cam + np.array(cfg.get('lw', [0.24, 0.12, -0.30]))
targets = {'r': (tr, np.array([-0.5, 0.3, -1.0]), None, np.array([0.8, -0.2, -0.5])),
           'l': (tl, np.array([0.6, 0.3, -1.0]), None, np.array([-0.8, -0.2, -0.5]))}
X, chains = build_pose(cam, targets)
Wt = skin_weights(co)
cop = apply_skin(co, X, Wt)
col = ensure_collection('Character')
body = new_mesh_object('Body', cop, faces, col, uvs=uvs)
set_color_attribute(body.data, 'skin_tone', rgba); set_color_attribute(body.data, 'skin_masks', masks)
body.data.materials.append(make_skin_material())
t=time.time()
sw, sinfo = build_sweater(co, cop, faces, Wt, X, chains, col)
print('sweater verts', len(sw.data.vertices), 'time', time.time()-t, 'loops', {k: (len(v) if v else None) for k,v in sinfo['loops'].items()})
pinkm = make_simple_material('pink', srgb(214, 140, 146), 0.8, **{'Sheen Weight': 0.6})
sw.data.materials.append(pinkm)
from mathutils.bvhtree import BVHTree
bvh_body = bvh_from_arrays(cop, faces)
lps = sinfo['loops']; sco = sinfo['co']
Rt = X['torso'].R
if lps['neck']:
    nl = lps['neck']; c = sco[nl].mean(0)
    prof = [(0.003, -0.007), (0.006, 0.0), (0.005, 0.009), (0.002, 0.017), (-0.003, 0.021), (-0.007, 0.018), (-0.008, 0.009), (-0.007, 0.0), (-0.005, -0.007)]
    ob = band_from_loop('Sweater_Collar', sco, nl, c, Rt[:, 2], prof, col, n_out=120, push_from=bvh_body, min_gap=0.0015)
    ob.data.materials.append(pinkm)
if lps['hem']:
    hl = lps['hem']; c = sco[hl].mean(0)
    prof = [(0.003, 0.006), (0.002, -0.01), (-0.004, -0.03), (-0.006, -0.048), (-0.009, -0.054), (-0.013, -0.05), (-0.012, -0.01), (-0.006, 0.006)]
    ob = band_from_loop('Sweater_Hem', sco, hl, c, Rt[:, 2], prof, col, n_out=160)
    ob.data.materials.append(pinkm)
for side in ('l', 'r'):
    lp = lps['cuff_' + side]
    if not lp: continue
    sp = sinfo['sleeve_paths'][side]; c = sco[lp].mean(0)
    prof = [(0.003, -0.012), (0.004, 0.0), (-0.004, 0.012), (-0.009, 0.026), (-0.011, 0.036), (-0.013, 0.041), (-0.017, 0.037), (-0.016, 0.02), (-0.010, 0.0), (-0.006, -0.012)]
    ob = band_from_loop('Sweater_Cuff_' + side.upper(), sco, lp, c, sp['hand_dir'], prof, col, n_out=72, push_from=bvh_body, min_gap=0.002)
    ob.data.materials.append(pinkm)
sub = sw.modifiers.new('Subdivision', 'SUBSURF'); sub.levels = 0; sub.render_levels = 1
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 8; sc.cycles.use_denoising = True
sc.render.threads_mode = 'FIXED'; sc.render.threads = 3
sc.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new('w'); sc.world = w
w.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
L = bpy.data.lights.new('key', 'AREA'); L.energy = 150; L.size = 1.5
lo = bpy.data.objects.new('key', L); sc.collection.objects.link(lo); lo.location = (-0.8, -1.2, 2.0); lo.rotation_euler = look_at_euler(lo.location, (0, -0.1, 1.4))
camd = bpy.data.cameras.new('cam'); camo = bpy.data.objects.new('cam', camd); sc.collection.objects.link(camo); sc.camera = camo
def render(name, pos, tgt, lens, rx, ry, roll=0.0):
    camo.location = pos; camo.rotation_euler = look_at_euler(pos, tgt, math.radians(roll)); camd.lens = lens; camd.clip_start = 0.02
    sc.render.resolution_x = rx; sc.render.resolution_y = ry
    sc.render.filepath = os.path.abspath(f'previews/{tag}_{name}.png')
    bpy.ops.render.render(write_still=True)
render('beauty', cam, look, 24, 480, 520)
ctr = np.array([0, -0.15, 1.28])
for nm, a in (('front', 0), ('tq', 45), ('side', 90), ('back', 180)):
    aa = math.radians(a)
    render(nm, ctr + 2.6 * np.array([math.sin(aa), -math.cos(aa), 0.0]) + np.array([0, 0, 0.1]), ctr, 55, 384, 384)
print('total', time.time()-T0)
