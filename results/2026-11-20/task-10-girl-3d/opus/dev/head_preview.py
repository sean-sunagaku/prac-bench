import sys, os, math, json
sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np, mathutils
from pb_common import *
from pb_body import *
from pb_skin import paint_skin
from pb_eyes import *
from pb_materials import make_skin_material

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
tag = args[0] if args else 'head'
params = json.loads(args[1]) if len(args) > 1 else {}
views = args[2].split(',') if len(args) > 2 else ['front', 'tq', 'side']

bpy.ops.wm.read_factory_settings(use_empty=True)
co0, faces, uvs, info = load_upper_body_with_arms('input/base.obj', 'input/upper-body.obj')
rgba, masks, extra = paint_skin(co0, faces)
eparams = json.loads(args[3]) if len(args) > 3 else {}
rL = eye_rings(co0, faces, EYE_L); rR = eye_rings(co0, faces, EYE_R)
co = sculpt_face(co0, faces, params)
EL = np.array([0.0308, -0.1262, 1.5455]); ER = EL * np.array([-1, 1, 1])
gz = np.array([0, -1, 0.03])
co = rebuild_eyelids(co, co0, faces, rL, EYE_L, EL, 1, surf_radius_fn, gaze=gz, params=eparams)
co = rebuild_eyelids(co, co0, faces, rR, EYE_R, ER, -1, surf_radius_fn, gaze=gz, params=eparams)
col = ensure_collection('Character')
body = new_mesh_object('Body', co, faces, col, uvs=uvs)
set_color_attribute(body.data, 'skin_tone', rgba)
set_color_attribute(body.data, 'skin_masks', masks)
sub = body.modifiers.new('Subdivision', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
body.data.materials.append(make_skin_material())
shell_mat = make_eye_shell_material(); iris_mat = make_iris_material()
for nm, E in (('Eye_L', EL), ('Eye_R', ER)):
    sh, ir = build_eye_meshes(col, nm)
    sh.data.materials.append(shell_mat); ir.data.materials.append(iris_mat)
    aim_eye([sh, ir], E, E + np.array([0, -1, 0.03]))

sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 12; sc.cycles.use_denoising = True
sc.render.threads_mode = 'FIXED'; sc.render.threads = 3
sc.render.resolution_x = 640; sc.render.resolution_y = 640
sc.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new('w'); sc.world = w
w.node_tree.nodes['Background'].inputs[0].default_value = (0.35, 0.33, 0.32, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
def area(name, pos, tgt, energy, size, color=(1, 1, 1)):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = size; L.color = color
    o = bpy.data.objects.new(name, L); sc.collection.objects.link(o); o.location = pos
    o.rotation_euler = look_at_euler(pos, tgt)
area('key', (-0.5, -0.9, 1.9), (0, -0.1, 1.52), 45, 0.8, (1, 0.96, 0.92))
area('fill', (0.7, -0.8, 1.5), (0, -0.1, 1.52), 15, 1.0, (0.95, 0.97, 1))
area('rim', (0.3, 0.6, 1.8), (0, -0.05, 1.55), 25, 0.5)
cam = bpy.data.cameras.new('c'); co_ = bpy.data.objects.new('c', cam); sc.collection.objects.link(co_); sc.camera = co_
center = mathutils.Vector((0, -0.07, 1.515))
def shot(name, ang, dist=0.62, lens=85, dz=0.0):
    a = math.radians(ang)
    pos = center + mathutils.Vector((math.sin(a) * dist, -math.cos(a) * dist, dz))
    co_.location = pos; co_.rotation_euler = look_at_euler(pos, center); cam.lens = lens
    sc.render.filepath = os.path.abspath(f'previews/{tag}_{name}.png')
    bpy.ops.render.render(write_still=True)
for v in views:
    if v == 'front': shot('front', 0)
    if v == 'tq': shot('tq', 40)
    if v == 'side': shot('side', 90)
    if v == 'eye':
        center = mathutils.Vector((0.031, -0.13, 1.545)); shot('eye', 10, 0.3, 120); center = mathutils.Vector((0, -0.07, 1.515))
    if v == 'mouth':
        center = mathutils.Vector((0.0, -0.15, 1.48)); shot('mouth', 15, 0.35, 120); center = mathutils.Vector((0, -0.07, 1.515))
