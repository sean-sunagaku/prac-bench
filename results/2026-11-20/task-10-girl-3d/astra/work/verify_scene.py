"""Independent reopen checks. This script does not save or alter the scene."""
from pathlib import Path
import bpy, json, math, struct, hashlib
from mathutils import Vector
root=Path(bpy.data.filepath).parent
a=bpy.context.scene;b=bpy.data.scenes['Turntable | neutral studio']
assert a.name=='Window seat | Portrait' and a.camera.name=='Beauty | window-seat selfie'
for s in [a,b]:
    assert s.render.engine=='CYCLES' and s.cycles.device=='CPU'
    assert s.render.threads==3 and s.cycles.samples==32 and s.cycles.use_denoising
    assert not s.cycles.denoising_use_gpu and not s.render.use_compositing and not s.render.use_sequencer
for c in list(a.collection.children):
    if c.name[:2] in ['01','02','03','04','06','07']:assert b.collection.children.get(c.name)==c
assert b.collection.children.get('05  Window seat café') is None
for img in bpy.data.images:
    if img.source=='FILE':
        assert img.packed_file and max(img.size)<=2048 and min(img.size)>0, img.name
        assert 'reference' not in img.name.lower()
assert not bpy.data.libraries
r=json.loads((root/'scene-report.json').read_text())
assert r['mesh_vertices_plus_native_curve_keys']<1000000
assert r['beauty_scene_mesh_vertices_plus_native_curve_keys']<1000000
assert len(r['packed_generated_textures'])==7
for key,degree in [('beauty',None),('front',0),('three-quarter',45),('side',90),('back',180)]:
    spec=r['render_details'][key]
    data=(root/spec['filename']).read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>2I',data[16:24])==((960,1040) if degree is None else (768,768))
    assert hashlib.sha256(data).hexdigest()==spec['sha256']
    cam=bpy.data.objects[spec['camera']]
    if degree is not None:
        axis=cam.matrix_world.to_quaternion() @ Vector((0,0,1))
        angle=math.degrees(math.atan2(axis.x,-axis.y))
        assert abs((angle-degree+180)%360-180)<.001 and cam.data.type=='ORTHO'
print('Verified the active beauty camera, four shared character collections, physical camera angles, CPU settings, packed resources, geometry budget and five PNG hashes.')
