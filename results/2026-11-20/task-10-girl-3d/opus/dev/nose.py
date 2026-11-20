import bpy, sys, os, mathutils
sc = bpy.context.scene
sc.cycles.samples = 10
eyeL = bpy.data.objects['Eye_L_Shell'].location; eyeR = bpy.data.objects['Eye_R_Shell'].location
mid = (eyeL + eyeR) / 2
# nose tip roughly 4.5 cm below and 3.5cm in front of eye midpoint along the head axes
bcam = bpy.data.objects['Camera_Beauty']
tgt = mid + mathutils.Vector((0.006, -0.03, -0.045))
cd = bpy.data.cameras.new('cu'); co = bpy.data.objects.new('cu', cd); sc.collection.objects.link(co)
co.location = tgt + mathutils.Vector((-0.02, -0.16, -0.12)); cd.lens = 60
co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = co
for o in bpy.data.collections['Character_Hair'].objects: o.hide_render = True
bpy.data.collections['Cafe_Set'].hide_render = True
bpy.data.collections['Lights_Beauty'].hide_render = True
bpy.data.collections['Lights_Studio'].hide_render = False
sc.world = bpy.data.worlds['World_Studio']
sc.render.resolution_x = 500; sc.render.resolution_y = 500; sc.render.resolution_percentage = 100
sc.render.filepath = os.path.abspath('previews/k1_nose_below.png')
bpy.ops.render.render(write_still=True)
