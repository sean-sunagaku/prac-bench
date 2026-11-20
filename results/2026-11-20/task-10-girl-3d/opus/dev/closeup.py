import bpy, sys, os, math, json
import mathutils
args = sys.argv[sys.argv.index('--') + 1:]
tag = args[0]; mode = args[1] if len(args) > 1 else 'face'
sc = bpy.context.scene
sc.cycles.samples = int(args[2]) if len(args) > 2 else 16
sc.render.resolution_percentage = 100
eyeL = bpy.data.objects['Eye_L_Shell'].location; eyeR = bpy.data.objects['Eye_R_Shell'].location
mid = (eyeL + eyeR) / 2
cam = bpy.data.objects['Camera_Beauty']
if mode == 'face':
    bcam = bpy.data.objects['Camera_Beauty']
    d = (mid - bcam.location).normalized()
    pos = mid - d * 0.30
    cd = bpy.data.cameras.new('cu'); co = bpy.data.objects.new('cu', cd); sc.collection.objects.link(co)
    co.location = pos; co.rotation_euler = bcam.rotation_euler; cd.lens = 50
    tgt = mid + mathutils.Vector((0, 0, -0.02))
    co.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.resolution_x = 700; sc.render.resolution_y = 700
elif mode == 'beauty':
    sc.render.resolution_x = 960; sc.render.resolution_y = 1040
elif mode == 'front':
    cd = bpy.data.cameras.new('cu'); co = bpy.data.objects.new('cu', cd); sc.collection.objects.link(co)
    pos = mid + mathutils.Vector((0, -0.75, 0.0)); co.location = pos; cd.lens = 70
    co.rotation_euler = (mid + mathutils.Vector((0, 0, -0.05)) - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.resolution_x = 700; sc.render.resolution_y = 700
    bpy.data.collections['Cafe_Set'].hide_render = True
    bpy.data.collections['Lights_Beauty'].hide_render = True
    bpy.data.collections['Lights_Studio'].hide_render = False
    sc.world = bpy.data.worlds['World_Studio']
sc.render.filepath = os.path.abspath(f'previews/{tag}_{mode}.png')
bpy.ops.render.render(write_still=True)
