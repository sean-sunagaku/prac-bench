"""Build the editable portrait with Blender 5.1.1. Run from the scene directory."""
import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from portrait_core import collection
from portrait_face import Face, eyeballs, eye_details
from wardrobe import sweater
from groom import hair
from stage import BEAUTY_POSITION, setup_stage

bpy.ops.wm.read_factory_settings(use_empty=True)
with (ROOT/"input/environment.json").open() as source:
    environment = json.load(source)
scene = bpy.context.scene
scene.name = "Window seat"
scene.unit_settings.system = "METRIC"
scene["Coordinate system"] = environment["coordinates"]
scene["Reference"] = "input/reference.png, observed visually off-scene"
scene["Source topology"] = environment["asset"]["project"] + " hm08, CC0"
scene["Build entry point"] = "build.py"
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.render.threads_mode = "FIXED"
scene.render.threads = 3
scene.cycles.samples = 32
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .048
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
if hasattr(scene.cycles, "denoising_use_gpu"):
    scene.cycles.denoising_use_gpu = False
if hasattr(scene.cycles, "preview_denoising_use_gpu"):
    scene.cycles.preview_denoising_use_gpu = False
scene.cycles.max_bounces = 7
scene.cycles.diffuse_bounces = 3
scene.cycles.glossy_bounces = 3
scene.cycles.transmission_bounces = 4
scene.cycles.transparent_max_bounces = 8
scene.cycles.sample_clamp_indirect = 3.5
scene.render.resolution_x, scene.render.resolution_y = 960, 1040
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.color_depth = "8"
scene.render.filepath = "//renders/beauty.png"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = -.38

world = bpy.data.worlds.new("Daylight and wall bounce")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (.35,.378,.41,1)
bg.inputs["Strength"].default_value = .27

character = collection("01 • PORTRAIT")
skin = collection("02 • Head, ears and skin",character)
eyes = collection("03 • Eyes, brows and lashes",character)
hair_layer = collection("04 • Hair and fringe",character)
cloth = collection("05 • Rose knit and hands",character)

face = Face(skin)
eyeballs(eyes, BEAUTY_POSITION)
eye_details(face, eyes)
print("Built sculpt and eyes",flush=True)
sweater(cloth, face)
print("Built sweater and hands",flush=True)
hair(face, hair_layer)
print("Built scalp and groom",flush=True)
setup_stage()
print("Built stages and cameras",flush=True)
for obj in bpy.context.selected_objects:
    obj.select_set(False)
bpy.context.view_layer.objects.active = face.obj
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
            area.spaces.active.region_3d.view_camera_zoom = 7
            area.spaces.active.shading.color_type = "MATERIAL"
            area.spaces.active.overlay.show_overlays = False
(ROOT/"renders").mkdir(exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"character.blend"))
