import bpy, sys, os, mathutils
args = sys.argv[sys.argv.index('--') + 1:]
tag = args[0]; hide_hair = len(args) > 1 and args[1] == 'nohair'
sc = bpy.context.scene
sc.cycles.samples = 16
eyeL = bpy.data.objects['Eye_L_Shell'].location; eyeR = bpy.data.objects['Eye_R_Shell'].location
mid = (eyeL + eyeR) / 2
bcam = bpy.data.objects['Camera_Beauty']
top = mid + mathutils.Vector((0.0, 0.05, 0.10))
d = (top - bcam.location).normalized()
cd = bpy.data.cameras.new('cu'); co = bpy.data.objects.new('cu', cd); sc.collection.objects.link(co)
co.location = top - d * 0.35; cd.lens = 50
co.rotation_euler = (top - co.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = co
if hide_hair:
    for o in bpy.data.collections['Character_Hair'].objects: o.hide_render = True
sc.render.resolution_x = 600; sc.render.resolution_y = 600; sc.render.resolution_percentage = 100
sc.render.filepath = os.path.abspath(f'previews/{tag}_top{"_nohair" if hide_hair else ""}.png')
bpy.ops.render.render(write_still=True)
