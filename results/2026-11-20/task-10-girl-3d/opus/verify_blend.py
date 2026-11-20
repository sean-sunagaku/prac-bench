"""Reopen character.blend and check that the scene is complete and portable.

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup character.blend --python verify_blend.py

Writes verify_report.json (objects, collections, materials, packed images, cameras)."""
import bpy
import os
import json

HERE = os.path.dirname(os.path.abspath(__file__))
sc = bpy.context.scene
rep = {
    'file': bpy.data.filepath,
    'blender_version': bpy.app.version_string,
    'scene': sc.name,
    'active_camera': sc.camera.name if sc.camera else None,
    'render_engine': sc.render.engine,
    'cycles_device': sc.cycles.device,
    'samples': sc.cycles.samples,
    'resolution': [sc.render.resolution_x, sc.render.resolution_y],
    'collections': {c.name: [o.name for o in c.objects] for c in bpy.data.collections},
    'materials': sorted(m.name for m in bpy.data.materials if m.users),
    'images': [dict(name=i.name, size=list(i.size), packed=i.packed_file is not None, source=i.source)
               for i in bpy.data.images if i.type == 'IMAGE'],
    'unpacked_external_files': [i.filepath for i in bpy.data.images if i.type == 'IMAGE' and i.packed_file is None and i.source == 'FILE'],
    'body_modifiers': [m.type + ':' + m.name for m in bpy.data.objects['Body'].modifiers],
    'curves_objects': {o.name: dict(curves=len(o.data.curves), points=len(o.data.points), material=o.data.materials[0].name if o.data.materials else None)
                       for o in bpy.data.objects if o.type == 'CURVES'},
    'cameras': {o.name: dict(lens=o.data.lens, location=list(o.location)) for o in bpy.data.objects if o.type == 'CAMERA'},
}
rep['all_images_packed'] = len(rep['unpacked_external_files']) == 0
with open(os.path.join(HERE, 'verify_report.json'), 'w') as fh:
    json.dump(rep, fh, indent=2)
print('[verify] ok', rep['active_camera'], 'images packed:', rep['all_images_packed'],
      'curves:', {k: v['curves'] for k, v in rep['curves_objects'].items()})
