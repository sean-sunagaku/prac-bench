"""Open character.blend with Blender before running this CPU render script."""
from pathlib import Path
import sys
import bpy

ROOT = Path(__file__).resolve().parent
args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
quick = "--preview" in args
render_names = [x for x in args if not x.startswith("--")] or [
    "beauty","front","three-quarter","side","back"]
directory = ROOT / (".work" if quick else "renders")
directory.mkdir(exist_ok=True)
scene = bpy.context.scene
scene.cycles.device = "CPU"
scene.render.threads_mode = "FIXED"
scene.render.threads = 3
scene.render.use_persistent_data = True

for name in render_names:
    beauty = name == "beauty"
    target = "Beauty • cafe selfie" if beauty else "Turntable • "+name
    scene.camera = bpy.data.objects[target]
    bpy.data.collections["30 • Cafe set"].hide_render = not beauty
    bpy.data.collections["31 • Cafe lighting"].hide_render = not beauty
    bpy.data.collections["40 • Diagnostic backdrop"].hide_render = beauty
    bpy.data.collections["41 • Diagnostic lighting"].hide_render = beauty
    scene.render.resolution_x, scene.render.resolution_y = (960,1040) if beauty else (768,768)
    scene.render.resolution_percentage = 50 if quick else 100
    scene.cycles.samples = 9 if quick else 32
    scene.cycles.adaptive_threshold = .11 if quick else .048
    if not beauty:
        scene.view_settings.look = "AgX - Medium High Contrast"
        scene.view_settings.exposure = -.24
    else:
        scene.view_settings.look = "AgX - Medium High Contrast"
        scene.view_settings.exposure = -.38
    scene.render.filepath = str(directory / (name+".png"))
    bpy.context.view_layer.update()
    print(f"RENDER {name} | {bpy.app.version_string} | {scene.render.engine} {scene.cycles.device} | {scene.cycles.samples} samples", flush=True)
    bpy.ops.render.render(write_still=True)
