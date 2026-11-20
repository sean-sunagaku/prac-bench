import bpy, math, mathutils, sys, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='input/upper-body.obj', forward_axis='Y', up_axis='Z')
ob = bpy.context.selected_objects[0]
for p in ob.data.polygons: p.use_smooth = True
m = ob.modifiers.new('sub','SUBSURF'); m.levels=1; m.render_levels=1
mat = bpy.data.materials.new('skin'); mat.use_nodes=True
b = mat.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value=(0.8,0.6,0.5,1); b.inputs['Roughness'].default_value=0.5
ob.data.materials.append(mat)
sc = bpy.context.scene
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=16; sc.cycles.use_denoising=True
sc.render.threads_mode='FIXED'; sc.render.threads=3
sc.render.resolution_x=512; sc.render.resolution_y=512
w = bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[1].default_value=0.3
L = bpy.data.lights.new('key','AREA'); L.energy=60; L.size=1.0
lo = bpy.data.objects.new('key', L); sc.collection.objects.link(lo); lo.location=(-0.6,-1.0,1.9)
lo.rotation_euler = (mathutils.Vector((0,0,1.5))-lo.location).to_track_quat('-Z','Y').to_euler()
cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera=co
def shot(name, pos, tgt, lens):
    co.location = pos
    co.rotation_euler = (mathutils.Vector(tgt)-mathutils.Vector(pos)).to_track_quat('-Z','Y').to_euler()
    cam.lens = lens
    sc.render.filepath = os.path.abspath('previews/'+name+'.png')
    bpy.ops.render.render(write_still=True)
shot('raw_face_front', (0,-0.8,1.54), (0,0,1.54), 85)
shot('raw_face_side', (0.8,-0.12,1.54), (0,-0.12,1.54), 85)
shot('raw_body_front', (0,-3.0,1.35), (0,0,1.35), 50)
