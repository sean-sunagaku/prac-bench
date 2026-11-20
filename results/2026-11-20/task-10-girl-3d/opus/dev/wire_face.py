import bpy, math, mathutils, sys, os, numpy as np
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='input/upper-body.obj', forward_axis='Y', up_axis='Z')
ob = bpy.context.selected_objects[0]
me=ob.data
co=np.array([v.co[:] for v in me.vertices])
E=np.array([0.0308,-0.1245,1.5452])
d=np.linalg.norm(co-E,axis=1)
idx=np.where(d<0.03)[0]
print('n near eye', len(idx))
print(np.histogram(d[idx], bins=15))
# vertices in front hemisphere of eye with d<0.02
sel=idx[(d[idx]<0.022)]
for i in sel[np.argsort(d[sel])][:60]:
    print(i, co[i].round(4), round(d[i],4))
mat = bpy.data.materials.new('w'); mat.use_nodes=True
nt=mat.node_tree; b=nt.nodes['Principled BSDF']
wf=nt.nodes.new('ShaderNodeWireframe'); wf.use_pixel_size=True; wf.inputs[0].default_value=1.0
mix=nt.nodes.new('ShaderNodeMix'); mix.data_type='RGBA'
nt.links.new(wf.outputs[0], mix.inputs['Factor'])
mix.inputs['A'].default_value=(0.8,0.65,0.55,1); mix.inputs['B'].default_value=(0.05,0.05,0.3,1)
nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
me.materials.append(mat)
sc = bpy.context.scene
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=8; sc.cycles.use_denoising=False
sc.render.threads_mode='FIXED'; sc.render.threads=3
sc.render.resolution_x=900; sc.render.resolution_y=900
w = bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[1].default_value=1.0
cam = bpy.data.cameras.new('c'); co_ = bpy.data.objects.new('c', cam); sc.collection.objects.link(co_); sc.camera=co_
def shot(name, pos, tgt, lens):
    co_.location = pos
    co_.rotation_euler = (mathutils.Vector(tgt)-mathutils.Vector(pos)).to_track_quat('-Z','Y').to_euler()
    cam.lens = lens
    sc.render.filepath = os.path.abspath('previews/'+name+'.png')
    bpy.ops.render.render(write_still=True)
shot('wire_face_front', (0,-0.8,1.52), (0,0,1.52), 140)
shot('wire_eye', (0.03,-0.5,1.545), (0.03,0,1.545), 300)
shot('wire_mouth', (0.0,-0.5,1.50), (0.0,0,1.50), 300)
