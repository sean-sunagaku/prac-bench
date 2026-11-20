import bpy
from pathlib import Path
root=Path(bpy.data.filepath).parent
for scene,cam,box,name in [
    ('Turntable | neutral studio','Three-quarter | 045°',(.035,.61,.265,.462),'wrist-fit'),
    ('Window seat | Portrait','Beauty | window-seat selfie',(.33,.71,.345,.569),'collar-fit')]:
 s=bpy.data.scenes[scene];bpy.context.window.scene=s;s.camera=bpy.data.objects[cam]
 s.cycles.samples=12;s.render.use_border=True;s.render.use_crop_to_border=True
 s.render.border_min_x,s.render.border_max_x,s.render.border_min_y,s.render.border_max_y=box
 s.render.filepath=str(root/'work'/(name+'.png'))
 bpy.ops.render.render(scene=s.name,write_still=True)
