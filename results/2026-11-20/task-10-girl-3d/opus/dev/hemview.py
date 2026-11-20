import bpy, sys, os, mathutils
args = sys.argv[sys.argv.index('--') + 1:]
tag = args[0]
sc = bpy.context.scene
sc.cycles.samples = 12
hem = bpy.data.objects['Sweater_Hem']
import numpy as np
c = np.array([v.co[:] for v in hem.data.vertices]).mean(0)
tgt = mathutils.Vector(c)
cd = bpy.data.cameras.new('cu'); co = bpy.data.objects.new('cu', cd); sc.collection.objects.link(co)
co.location = tgt + mathutils.Vector((0.05, -0.6, 0.12)); cd.lens = 50
co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = co
bpy.data.collections['Cafe_Set'].hide_render = True
bpy.data.collections['Lights_Beauty'].hide_render = True
bpy.data.collections['Lights_Studio'].hide_render = False
sc.world = bpy.data.worlds['World_Studio']
sc.render.resolution_x = 600; sc.render.resolution_y = 400; sc.render.resolution_percentage = 100
sc.render.filepath = os.path.abspath(f'previews/{tag}_hem.png')
bpy.ops.render.render(write_still=True)
print('hem verts', len(hem.data.vertices), 'center', c)
