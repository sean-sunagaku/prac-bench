"""
build.py
Reproducible master Blender Python script for building, packing, saving, verifying,
and rendering the realistic 3D upper-body portrait from supplied inputs.

Standard final build command (from working directory):
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 3 --python build.py

Optional preview mode (fast iteration):
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 3 --python build.py -- --preview
"""
import json
import os
import sys
import time
import bpy
from mathutils import Vector

# Ensure local modules in working directory are importable under --factory-startup
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import mesh_sculpt
import textures_gen
import materials
import sweater_gen
import hair_gen
import scene_setup


def _parse_args():
    argv = sys.argv
    extra = argv[argv.index("--") + 1 :] if "--" in argv else []
    opts = {
        "preview": "--preview" in extra,
        "only": None,
        "samples": None,
        "skip_reopen": "--skip-reopen" in extra,
    }
    for i, a in enumerate(extra):
        if a == "--only" and i + 1 < len(extra):
            opts["only"] = set(extra[i + 1].split(","))
        elif a == "--samples" and i + 1 < len(extra):
            opts["samples"] = int(extra[i + 1])
    return opts


def _make_collection(name, parent=None):
    col = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(col)
    return col


def _set_collection_visibility(col, visible):
    col.hide_render = not visible
    col.hide_viewport = not visible


def _measure_character_bounds_and_counts(char_cols):
    """Evaluate character bounding box and base/evaluated mesh & curve statistics."""
    deps = bpy.context.evaluated_depsgraph_get()
    min_v = [1e9, 1e9, 1e9]
    max_v = [-1e9, -1e9, -1e9]
    base_verts = 0
    base_faces = 0
    eval_verts = 0
    eval_faces = 0
    hair_curves_total = 0
    hair_points_total = 0
    obj_names = []

    for col in char_cols:
        for obj in col.objects:
            obj_names.append(obj.name)
            if obj.type == "MESH":
                base_verts += len(obj.data.vertices)
                base_faces += len(obj.data.polygons)
                ev = obj.evaluated_get(deps)
                me_ev = ev.to_mesh()
                eval_verts += len(me_ev.vertices)
                eval_faces += len(me_ev.polygons)
                mw = ev.matrix_world
                for v in me_ev.vertices:
                    co = mw @ v.co
                    for k in range(3):
                        if co[k] < min_v[k]:
                            min_v[k] = co[k]
                        if co[k] > max_v[k]:
                            max_v[k] = co[k]
                ev.to_mesh_clear()
            elif obj.type == "CURVES":
                hair_curves_total += len(obj.data.curves)
                hair_points_total += len(obj.data.points)

    return {
        "object_names": sorted(obj_names),
        "bounds_meters": {
            "min": [round(x, 4) for x in min_v],
            "max": [round(x, 4) for x in max_v],
            "size": [round(max_v[k] - min_v[k], 4) for k in range(3)],
        },
        "base_mesh_vertices": base_verts,
        "base_mesh_faces": base_faces,
        "evaluated_mesh_vertices": eval_verts,
        "evaluated_mesh_faces": eval_faces,
        "hair_curves_count": hair_curves_total,
        "hair_control_points": hair_points_total,
    }


def build_scene(preview=False, samples_override=None):
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    # Clean, sensible named collections
    col_char_body = _make_collection("Character_Head_Eyes")
    col_char_hair = _make_collection("Character_Hair")
    col_char_cloth = _make_collection("Character_Clothing")
    col_cafe = _make_collection("Environment_Cafe")
    col_lights_beauty = _make_collection("Lights_Beauty")
    col_lights_diag = _make_collection("Lights_Diagnostic")
    col_cameras = _make_collection("Cameras")

    # Build cameras first so eyes know exact beauty gaze target!
    cams, eyes_mid = scene_setup.build_cameras(col_cameras)
    # Gaze warmly & directly into the slightly-above selfie lens (relaxed natural eye contact!)
    gaze_target = cams["beauty"].location + Vector((0.0, 0.0, -0.004))

    # Placeholder materials while sculpting mesh so body UVs are ready for exact 3D-to-UV skin baking
    placeholder_mat = bpy.data.materials.new("Temp_Skin")
    body_info = mesh_sculpt.build_character_head_and_eyes(
        col_char_body,
        gaze_target_world=gaze_target,
        mat_skin=placeholder_mat,
        mat_iris=placeholder_mat,
        mat_cornea=placeholder_mat,
        mat_meniscus=placeholder_mat,
        mat_caruncle=placeholder_mat,
    )

    # Generate high-resolution procedural textures (<=2048px, packed into .blend!)
    skin_size = 1024 if preview else 2048
    skin_imgs = textures_gen.generate_skin_textures(body_info["body_obj"], body_info["sculpted_rest_pts"], size=skin_size)
    eye_img = textures_gen.generate_eye_texture(size=1024)
    knit_imgs = textures_gen.generate_knit_textures(size=1024)

    # Build real PBR/Principled/Hair materials
    mats = materials.build_all_materials(skin_imgs, eye_img, knit_imgs)

    # Assign real materials to head and multi-layer eyes
    body_info["body_obj"].data.materials[0] = mats["skin"]
    for eye_tuple in (body_info["eyes_l"], body_info["eyes_r"]):
        eye_tuple[0].data.materials[0] = mats["iris"]
        eye_tuple[1].data.materials[0] = mats["cornea"]
        eye_tuple[2].data.materials[0] = mats["meniscus"]
        eye_tuple[3].data.materials[0] = mats["caruncle"]
    bpy.data.materials.remove(placeholder_mat)

    # Build complete dusty pink knitted crew-neck sweater, ribbed trims, hands & wool fuzz
    sweater_info = sweater_gen.build_sweater_and_hands(col_char_cloth, mats, knit_imgs)

    # Build multi-layer 3D Hair Curves (scalp cap, main waves, flyaways, wispy bangs, brows, lashes)
    hair_info = hair_gen.build_all_hair(col_char_hair, body_info, sweater_info, mats, preview=preview)

    # Build sunlit café environment + beauty & diagnostic lighting/worlds
    scene_setup.build_cafe_environment(col_cafe)
    w_beauty, w_diag = scene_setup.build_lighting_and_worlds(col_lights_beauty, col_lights_diag)
    w_beauty.use_fake_user = True
    w_diag.use_fake_user = True

    # Set default saved state: Beauty portrait ready to inspect!
    scene.camera = cams["beauty"]
    scene.world = w_beauty
    _set_collection_visibility(col_cafe, True)
    _set_collection_visibility(col_lights_beauty, True)
    _set_collection_visibility(col_lights_diag, False)

    samples = samples_override if samples_override is not None else (16 if preview else 32)
    scene_setup.configure_render_settings(scene, samples=samples)
    scene.render.resolution_x = 960
    scene.render.resolution_y = 1040
    scene.render.resolution_percentage = 50 if preview else 100

    # Measure character geometry metrics before saving
    stats = _measure_character_bounds_and_counts([col_char_body, col_char_hair, col_char_cloth])
    print(f"[build] Scene built in {time.time() - t0:.2f}s | eval_verts={stats['evaluated_mesh_vertices']} | hair_curves={stats['hair_curves_count']}")

    # Pack all generated images & save character.blend BEFORE rendering!
    bpy.ops.file.pack_all()
    blend_path = os.path.abspath("character.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[build] Saved & packed {blend_path}")

    return stats, blend_path


def render_all_views(blend_path, preview=False, only=None, skip_reopen=False):
    """
    Reopen character.blend to verify portable reopening, then render beauty.png (960x1040)
    and all 4 diagnostic views (front, three-quarter, side, back at 768x768) without changing
    any character geometry, pose, hair, or materials!
    """
    if not skip_reopen:
        bpy.ops.wm.open_mainfile(filepath=blend_path)
        print(f"[render] Reopened {blend_path} successfully (packed images={len(bpy.data.images)})")

    scene = bpy.context.scene
    os.makedirs("renders", exist_ok=True)
    out_dir = "scratch/preview" if preview else "renders"
    os.makedirs(out_dir, exist_ok=True)

    col_cafe = bpy.data.collections["Environment_Cafe"]
    col_lights_beauty = bpy.data.collections["Lights_Beauty"]
    col_lights_diag = bpy.data.collections["Lights_Diagnostic"]
    w_beauty = bpy.data.worlds["World_Beauty_Cafe"]
    w_diag = bpy.data.worlds["World_Diagnostic_Studio"]

    rendered = []

    # 1. BEAUTY RENDER (960x1040)
    if only is None or "beauty" in only:
        scene.camera = bpy.data.objects["Camera_Beauty"]
        scene.world = w_beauty
        _set_collection_visibility(col_cafe, True)
        _set_collection_visibility(col_lights_beauty, True)
        _set_collection_visibility(col_lights_diag, False)
        scene.render.resolution_x = 960
        scene.render.resolution_y = 1040
        scene.render.resolution_percentage = 50 if preview else 100
        out_path = os.path.abspath(os.path.join(out_dir, "beauty.png"))
        scene.render.filepath = out_path
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"[render] Saved {out_path} in {time.time() - t1:.2f}s")
        rendered.append(os.path.relpath(out_path))

    # 2. DIAGNOSTIC TURNAROUND VIEWS (768x768, plain neutral backdrop, IDENTICAL character!)
    diag_views = [
        ("front", "Camera_Front"),
        ("three-quarter", "Camera_ThreeQuarter"),
        ("side", "Camera_Side"),
        ("back", "Camera_Back"),
    ]
    scene.world = w_diag
    _set_collection_visibility(col_cafe, False)
    _set_collection_visibility(col_lights_beauty, False)
    _set_collection_visibility(col_lights_diag, True)
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 50 if preview else 100

    for view_key, cam_name in diag_views:
        if only is not None and view_key not in only:
            continue
        scene.camera = bpy.data.objects[cam_name]
        out_path = os.path.abspath(os.path.join(out_dir, f"{view_key}.png"))
        scene.render.filepath = out_path
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"[render] Saved {out_path} in {time.time() - t1:.2f}s")
        rendered.append(os.path.relpath(out_path))

    # Restore saved Beauty camera & Café visibility before finishing
    scene.camera = bpy.data.objects["Camera_Beauty"]
    scene.world = w_beauty
    _set_collection_visibility(col_cafe, True)
    _set_collection_visibility(col_lights_beauty, True)
    _set_collection_visibility(col_lights_diag, False)
    return rendered


def write_scene_report(stats, rendered_files, preview=False):
    if preview:
        return
    scene = bpy.context.scene
    report = {
        "blender_version": bpy.app.version_string,
        "render_engine": scene.render.engine,
        "render_device": scene.cycles.device,
        "samples": scene.cycles.samples,
        "denoiser": scene.cycles.denoiser if scene.cycles.use_denoising else None,
        "view_transform": scene.view_settings.view_transform,
        "important_objects": stats["object_names"],
        "character_bounds_meters": stats["bounds_meters"],
        "base_mesh_vertices": stats["base_mesh_vertices"],
        "base_mesh_faces": stats["base_mesh_faces"],
        "evaluated_mesh_vertices": stats["evaluated_mesh_vertices"],
        "evaluated_mesh_faces": stats["evaluated_mesh_faces"],
        "hair_curves_count": stats["hair_curves_count"],
        "hair_control_points": stats["hair_control_points"],
        "generated_textures": [
            {"name": "Skin_Albedo", "size": "2048x2048", "description": "Anatomically 3D-UV baked fair warm peach-ivory skin albedo with diffused cheek/nose blush, subtle nose/alar/ear-concha shading, rich coral-rose gradient lips, espresso upper lash tightline, double-eyelid crease tint, soft powdery brow base, and recessed chestnut scalp-root shading."},
            {"name": "Skin_Roughness", "size": "2048x2048", "description": "Localized skin roughness map with glossy coral lips, gently dewy cheekbones/T-zone, velvety matte cheeks/neck, and micro-pore variation."},
            {"name": "Skin_Bump", "size": "2048x2048", "description": "Restrained youthful skin micro-grain and fine vertical lip micro-creases."},
            {"name": "Skin_SSS", "size": "2048x2048", "description": "Subsurface scattering mask emphasizing ears, nose tip, cheeks, and lips."},
            {"name": "Eye_Iris_Sclera", "size": "1024x1024", "description": "Deep soulful warm chestnut-chocolate radial fibrous iris with warm amber-brown inner collarette, dark espresso limbal ring, black pupil, and softly shaded warm-ivory sclera."},
            {"name": "Knit_Albedo / Knit_Height / Knit_Normal / Knit_Roughness", "size": "1024x1024", "description": "Tileable fine-gauge interlocking V-stitch stockinette knit with 3-ply twisted yarn texture, soft dusty-rose stitch valleys, and heathered pastel dusty-pink wool variation."},
            {"name": "Rib_Albedo / Rib_Height / Rib_Normal", "size": "1024x1024", "description": "Tileable soft 1x1 rib-knit maps for the fitted crew-neck collar, snug sleeve cuffs, and waist hem."},
        ],
        "rendered_files": rendered_files,
        "remaining_limitations": [
            "Facial likeness is procedurally deformed from MakeHuman hm08 via continuous analytic sculpting fields rather than manual artistic sculpting, so subtle individual micro-asymmetry and exact facial identity match remain approximations.",
            "Unseen anatomy and clothing regions (side profile, back wavy hairstyle, lower sweater waist hem, snug ribbed cuffs, and curled hands) are inferred from the frontal reference photograph.",
            "Wavy hair clumps and airy wispy bangs are procedurally groomed Blender Hair Curves rather than physically simulated strands, so minor local curve intersections and slight sheen uniformity can appear on close inspection.",
            "Sweater knit creases and forearm sleeve folds are analytically sculpted onto the single continuous manifold sweater mesh rather than physically cloth-simulated.",
            "The sunlit cafe interior (window, ficus plant, wooden chairs/tables, glass flower vase, and back shelves) is a lightweight 3D bokeh backdrop prioritized below character quality.",
        ],
    }
    with open("scene-report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print("[report] Wrote scene-report.json")


def main():
    opts = _parse_args()
    stats, blend_path = build_scene(preview=opts["preview"], samples_override=opts["samples"])
    rendered = render_all_views(
        blend_path,
        preview=opts["preview"],
        only=opts["only"],
        skip_reopen=opts["skip_reopen"],
    )
    write_scene_report(stats, rendered, preview=opts["preview"])


if __name__ == "__main__":
    main()
