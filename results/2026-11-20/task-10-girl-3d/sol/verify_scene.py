"""Measure the reopened final scene and verify the five unmodified PNG outputs."""
import hashlib
import json
import struct
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parent
scene = bpy.context.scene
ENV = json.loads((ROOT/"input/environment.json").read_text())


def verify_png(path, dimensions):
    raw = path.read_bytes()
    assert raw[:8] == b"\x89PNG\r\n\x1a\n" and raw[12:16] == b"IHDR", path
    width, height = struct.unpack(">II", raw[16:24])
    assert (width,height) == dimensions, (path,width,height)
    # Blender itself must also be able to decode the result.
    decoded = bpy.data.images.load(str(path), check_existing=False)
    assert tuple(decoded.size) == dimensions and len(decoded.pixels) > 0, path
    bpy.data.images.remove(decoded)
    return {"file": str(path.relative_to(ROOT)), "resolution_px": [width,height],
            "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def world_points(obj, array):
    return (array.reshape(-1,3) @ np.asarray(obj.matrix_world.to_3x3()).T
            + np.asarray(obj.matrix_world.translation))


def inspect_geometry(portrait):
    levels = []
    for obj in scene.objects:
        for m in obj.modifiers:
            if m.type == "SUBSURF":
                levels.append((m,m.levels))
                m.levels = m.render_levels
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    lower, upper = np.full(3,np.inf), np.full(3,-np.inf)
    rows = []
    full = 0
    for obj in sorted(scene.objects, key=lambda obj: obj.name):
        if obj.type not in {"MESH","CURVES"}:
            continue
        ev = obj.evaluated_get(graph)
        data = ev.data
        in_portrait = obj in portrait
        if obj.type == "MESH":
            count = len(data.vertices)
            full += count
            if not in_portrait:
                continue
            coords = np.empty(3*count,dtype=np.float32)
            data.vertices.foreach_get("co", coords)
            positions = world_points(ev, coords)
            minimum, maximum = positions.min(axis=0), positions.max(axis=0)
            row = {"name": obj.name, "type": obj.type, "base_vertices": len(obj.data.vertices),
                   "base_faces": len(obj.data.polygons), "evaluated_vertices": count,
                   "evaluated_faces": len(data.polygons)}
        else:
            if not in_portrait:
                continue
            count = len(data.points)
            coords = np.empty(3*count,dtype=np.float32)
            radius = np.empty(count,dtype=np.float32)
            data.attributes["position"].data.foreach_get("vector", coords)
            data.attributes["radius"].data.foreach_get("value", radius)
            positions = world_points(ev, coords)
            minimum = (positions - radius[:,None]).min(axis=0)
            maximum = (positions + radius[:,None]).max(axis=0)
            row = {"name": obj.name, "type": obj.type, "strands": len(data.curves),
                   "evaluated_control_points": count}
        lower = np.minimum(lower, minimum)
        upper = np.maximum(upper, maximum)
        rows.append(row)
    for modifier, level in levels:
        modifier.levels = level
    mesh_base = sum(r.get("base_vertices",0) for r in rows)
    mesh_evaluated = sum(r.get("evaluated_vertices",0) for r in rows)
    points = sum(r.get("evaluated_control_points",0) for r in rows)
    strands = sum(r.get("strands",0) for r in rows)
    assert mesh_evaluated + points < 1_000_000, (mesh_evaluated, points)
    assert full < 1_000_000, full
    return ({
        "supplied_upper_body_vertices": ENV["asset"]["vertices"],
        "supplied_upper_body_faces": ENV["asset"]["faces"],
        "character_base_mesh_vertices": mesh_base,
        "character_base_mesh_faces": sum(r.get("base_faces",0) for r in rows),
        "character_evaluated_mesh_vertices": mesh_evaluated,
        "character_evaluated_mesh_faces": sum(r.get("evaluated_faces",0) for r in rows),
        "character_strands_including_lashes_and_brows": strands,
        "character_evaluated_curve_control_points": points,
        "character_evaluated_mesh_vertices_plus_curve_control_points": mesh_evaluated+points,
        "scene_evaluated_mesh_vertices_including_both_sets": full,
        "cycles_curve_intersection_primitive_count": None,
    }, {
        "axes": "meters, XYZ, Z up",
        "min": np.round(lower,6).tolist(), "max": np.round(upper,6).tolist(),
        "size": np.round(upper-lower,6).tolist()
    }, rows)


assert Path(bpy.data.filepath).resolve() == ROOT/"character.blend"
assert scene.camera and scene.camera.name == "Beauty • cafe selfie"
assert scene.render.engine == "CYCLES" and scene.cycles.device == "CPU"
assert scene.render.threads == 3 and scene.render.threads_mode == "FIXED"
assert scene.cycles.samples == 32 and scene.cycles.use_denoising
assert not getattr(scene.cycles,"denoising_use_gpu",False)
assert not bpy.data.libraries
assert tuple(bpy.app.version) == (5,1,1)
assert (scene.render.resolution_x,scene.render.resolution_y) == (960,1040)
portrait = set(bpy.data.collections["01 • PORTRAIT"].all_objects)
counts, bounds, objects = inspect_geometry(portrait)
renders = [dict(verify_png(ROOT/"renders"/(name+".png"),size),
                camera=("Beauty • cafe selfie" if angle is None else "Turntable • "+name),
                orbit_azimuth_degrees=angle)
           for name,size,angle in [
               ("beauty",(960,1040),None), ("front",(768,768),0), ("three-quarter",(768,768),45),
               ("side",(768,768),90), ("back",(768,768),180)]]

maps = {
    "Iris • radial collagen and umber pigment • 640": "Analytic radial bundles, amber-brown stroma, limbal shading and pupil.",
    "Face • procedural lid shading and tiny freckles • 1024": "Rest-coordinate eyelid and brow pigment fields with sparse cheek freckles.",
    "Sweater • repeating 4×4 stockinette yarn swatch • 512": "Swept stitch and two-ply yarn height, color and fiber channels.",
}
textures = []
for name, description in maps.items():
    image = bpy.data.images[name]
    assert image.packed_file and 0 < max(image.size) <= 2048, name
    textures.append({"name": name, "size_px": list(image.size), "packed": True,
                     "colorspace": image.colorspace_settings.name, "description": description})
for im in bpy.data.images:
    assert im.type in {"RENDER_RESULT","COMPOSITING"} or im.name in maps, im.name

folder_bytes = sum(p.stat().st_size for p in ROOT.rglob("*") if p.is_file() and p.name != "scene-report.json")
assert folder_bytes < 1_500_000_000
report = {
    "title": "Window seat",
    "scene": "character.blend",
    "saved_scene_sha256": hashlib.sha256((ROOT/"character.blend").read_bytes()).hexdigest(),
    "reopened_and_checked": True,
    "blender_version": bpy.app.version_string,
    "blender_build_hash": bpy.app.build_hash.decode(),
    "render_engine": scene.render.engine,
    "render_device": scene.cycles.device,
    "render_threads": scene.render.threads,
    "samples_per_pixel_max": scene.cycles.samples,
    "adaptive_sampling": scene.cycles.use_adaptive_sampling,
    "adaptive_threshold": scene.cycles.adaptive_threshold,
    "denoising": scene.cycles.denoiser,
    "denoising_uses_gpu": bool(getattr(scene.cycles,"denoising_use_gpu",False)),
    "beauty_camera": scene.camera.name,
    "source_topology": {"name": "MakeHuman hm08 upper body and hands", "license": "CC0",
                        "commit": ENV["asset"]["commit"], "source": ENV["asset"]["source"]},
    "reference": {"file": "input/reference.png", "decoded_photo_seen": True,
                  "used_as_scene_image": False, "resolution_px": ENV["referenceSize"]},
    "character_bounds": bounds,
    "geometry_counts": counts,
    "important_objects": objects,
    "generated_textures": textures,
    "renders": renders,
    "size_bytes_excluding_this_report": folder_bytes,
    "remaining_limitations": [
        "Hand-authored interpretation from one photograph. Facial proportions, expression, and individual hair placement are approximated.",
        "The profile, rear skull and hairstyle, neck transition, hidden sweater surfaces, wrists and extended hand pose were inferred.",
        "Face color is procedural with restrained microdetail. Fine asymmetry, photographic skin variation and individual facial anatomy are simplified.",
        "Hair has styled volume meshes with real fibers. Large locks remain more regular than natural hair, especially near the crown and on the back.",
        "Stockinette loops use packed bump and color maps on the fabric surface. Collar, cuffs, hem, sleeves and main drape have editable geometry.",
        "The café is a small constructed set with approximate furnishings and window lighting.",
        "Baked reach and head tilt. A production rig, facial animation controls and the lower body are outside this portrait."
    ]
}
(ROOT/"scene-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n")
print(json.dumps({"reopened": True, "geometry": counts, "bounds": bounds,
                  "images": [r["file"] for r in renders], "bytes": folder_bytes}, indent=2))
