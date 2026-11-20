import bpy, sys, os, numpy as np, mathutils
args = sys.argv[sys.argv.index('--') + 1:]
tag = args[0]
from_side = len(args) > 1 and args[1] == 'side'
cols = {'Hair_Long': (0.8, 0.1, 0.1, 1), 'Hair_FaceFraming': (0.1, 0.8, 0.1, 1), 'Hair_Bangs': (0.1, 0.2, 1.0, 1)}
for n, c in cols.items():
    m = bpy.data.materials.new('dbg_' + n); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = c; b.inputs['Emission Color'].default_value = c; b.inputs['Emission Strength'].default_value = 0.5
    o = bpy.data.objects[n]; o.data.materials[0] = m
    p = np.zeros(len(o.data.points) * 3); o.data.position_data.foreach_get('vector', p)
sc = bpy.context.scene
eyeL = bpy.data.objects['Eye_L_Shell'].location; eyeR = bpy.data.objects['Eye_R_Shell'].location
mid = (eyeL + eyeR) / 2
cd = bpy.data.cameras.new('cu'); co = bpy.data.objects.new('cu', cd); sc.collection.objects.link(co)
pos = mid + (mathutils.Vector((0.75, 0.0, 0.0)) if from_side else mathutils.Vector((0, -0.75, 0.0)))
co.location = pos; cd.lens = 50
co.rotation_euler = (mid + mathutils.Vector((0, 0, -0.08)) - pos).to_track_quat('-Z', 'Y').to_euler()
sc.camera = co
sc.render.resolution_x = 600; sc.render.resolution_y = 600; sc.cycles.samples = 8
bpy.data.collections['Cafe_Set'].hide_render = True
bpy.data.collections['Lights_Beauty'].hide_render = True
bpy.data.collections['Lights_Studio'].hide_render = False
sc.world = bpy.data.worlds['World_Studio']
sc.render.filepath = os.path.abspath(f'previews/{tag}_hairdbg{"_side" if from_side else ""}.png')
bpy.ops.render.render(write_still=True)
