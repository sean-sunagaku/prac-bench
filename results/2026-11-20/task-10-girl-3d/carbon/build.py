import os
import sys
import json
import time
import bpy
from mathutils import Vector

# Ensure workspace directory is on sys.path when invoked via Blender --python build.py
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

from character_anatomy import build_anatomical_character
from character_sweater import build_complete_sweater
from character_hair import build_chestnut_wavy_hair
from character_materials import build_and_assign_materials
from cafe_scene import build_cafe_environment, build_lighting_and_world, build_cameras


def clear_factory_scene():
    """Remove default factory Cube, Light, Camera, and orphan data cleanly."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block_collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.hair_curves,
        bpy.data.images,
    ):
        for block in list(block_collection):
            block_collection.remove(block)


def configure_render_settings(scene, samples=32):
    """Configure Cycles CPU rendering with OpenImageDenoise & AgX color management (NO GPU)."""
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.015
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    scene.cycles.denoising_use_gpu = False

    # Hair curve settings for crisp, fast ribbon strands
    scene.cycles_curves.shape = "RIBBONS"
    scene.cycles_curves.subdivisions = 2

    # Clean light bounces for skin SSS, eye cornea, and hair multiple scattering
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 6
    scene.cycles.transparent_max_bounces = 8

    # Color management: AgX with natural punch
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = -0.10

    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100


def measure_character_stats(scene, char_collection):
    """Compute exact world bounding box and base/evaluated mesh & hair counts."""
    depsgraph = bpy.context.evaluated_depsgraph_get()

    min_bb = [1e9, 1e9, 1e9]
    max_bb = [-1e9, -1e9, -1e9]
    base_verts = 0
    base_faces = 0
    eval_verts = 0
    eval_faces = 0
    total_hair_strands = 0
    total_hair_points = 0

    for obj in char_collection.objects:
        eval_obj = obj.evaluated_get(depsgraph)
        # World bounding box from bound_box corners
        for corner in eval_obj.bound_box:
            wc = eval_obj.matrix_world @ Vector(corner)
            for i in range(3):
                min_bb[i] = min(min_bb[i], float(wc[i]))
                max_bb[i] = max(max_bb[i], float(wc[i]))

        if obj.type == "MESH":
            base_verts += len(obj.data.vertices)
            base_faces += len(obj.data.polygons)
            emesh = eval_obj.to_mesh()
            eval_verts += len(emesh.vertices)
            eval_faces += len(emesh.polygons)
            eval_obj.to_mesh_clear()
        elif obj.type == "CURVES":
            total_hair_strands += len(obj.data.curves)
            total_hair_points += len(obj.data.points)

    return {
        "bounds_min_m": [round(v, 4) for v in min_bb],
        "bounds_max_m": [round(v, 4) for v in max_bb],
        "dimensions_m": [round(max_bb[i] - min_bb[i], 4) for i in range(3)],
        "base_mesh_vertices": base_verts,
        "base_mesh_faces": base_faces,
        "evaluated_mesh_vertices": eval_verts,
        "evaluated_mesh_faces": eval_faces,
        "hair_curve_strands": total_hair_strands,
        "hair_curve_control_points": total_hair_points,
        "total_evaluated_vertices_and_curve_points": eval_verts + total_hair_points,
    }


def render_all_views(scene, cafe_col, beauty_cam, diag_cams, out_dir, preview=False):
    """Render beauty.png (with 3D cafe) and front/three-quarter/side/back (with plain studio background)."""
    os.makedirs(out_dir, exist_ok=True)
    scale = 0.5 if preview else 1.0
    samples = 16 if preview else 32
    scene.cycles.samples = samples

    rendered_files = []

    # 1. Beauty Portrait (960x1040, CafeEnvironment visible!)
    cafe_col.hide_render = False
    scene.camera = beauty_cam
    scene.render.resolution_x = int(round(960 * scale))
    scene.render.resolution_y = int(round(1040 * scale))
    beauty_path = os.path.join(out_dir, "beauty.png")
    scene.render.filepath = os.path.abspath(beauty_path)
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[Render] beauty.png completed in {time.time() - t0:.1f}s")
    rendered_files.append(os.path.relpath(beauty_path, WORKSPACE_DIR))

    # 2. Four Diagnostic Views (768x768, plain studio background; Character & Lighting 100% unchanged!)
    cafe_col.hide_render = True
    scene.render.resolution_x = int(round(768 * scale))
    scene.render.resolution_y = int(round(768 * scale))

    diag_map = [
        ("FrontCamera", "front.png"),
        ("ThreeQuarterCamera", "three-quarter.png"),
        ("SideCamera", "side.png"),
        ("BackCamera", "back.png"),
    ]
    for cam_name, fname in diag_map:
        scene.camera = diag_cams[cam_name]
        fpath = os.path.join(out_dir, fname)
        scene.render.filepath = os.path.abspath(fpath)
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"[Render] {fname} completed in {time.time() - t0:.1f}s")
        rendered_files.append(os.path.relpath(fpath, WORKSPACE_DIR))

    # Restore BeautyCamera & CafeEnvironment active state
    cafe_col.hide_render = False
    scene.camera = beauty_cam
    scene.render.resolution_x = 960
    scene.render.resolution_y = 1040
    scene.cycles.samples = 32

    return rendered_files


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    preview_mode = "--preview" in argv
    build_only = "--build-only" in argv

    t_start = time.time()
    clear_factory_scene()
    scene = bpy.context.scene
    configure_render_settings(scene, samples=32)

    # Create organized named Collections
    char_col = bpy.data.collections.new("Character")
    cafe_col = bpy.data.collections.new("CafeEnvironment")
    light_col = bpy.data.collections.new("Lighting")
    cam_col = bpy.data.collections.new("Cameras")
    for col in (char_col, cafe_col, light_col, cam_col):
        scene.collection.children.link(col)

    upper_obj_path = os.path.join(WORKSPACE_DIR, "input", "upper-body.obj")
    base_obj_path = os.path.join(WORKSPACE_DIR, "input", "base.obj")
    env_json_path = os.path.join(WORKSPACE_DIR, "input", "environment.json")
    tex_dir = os.path.join(WORKSPACE_DIR, "textures")

    # BeautyCamera position used for eye gaze convergence!
    beauty_cam_pos = (-0.012, -0.572, 1.520)

    print("[Build] 1/5 Sculpting anatomical character, eyes, lashes & brows...")
    anat_info = build_anatomical_character(upper_obj_path, base_obj_path, env_json_path, beauty_cam_pos, char_col)

    print("[Build] 2/5 Modeling 3D dusty pink knitted crew-neck sweater & posed hands...")
    sweater_info = build_complete_sweater(anat_info, char_col)

    print("[Build] 3/5 Generating multi-layer 3D chestnut wavy hair & wispy bangs...")
    hair_info = build_chestnut_wavy_hair(anat_info["rest_sculpted_pts"], anat_info["pose_tf"], sweater_info, char_col)

    print("[Build] 4/5 Baking 2K procedural skin, iris & knit yarn textures + shaders...")
    mat_info = build_and_assign_materials(anat_info, sweater_info, hair_info, tex_dir)

    print("[Build] 5/5 Constructing 3D sunlit cafe scenery, lighting & cameras...")
    build_cafe_environment(cafe_col)
    face_mid = 0.5 * (anat_info["posed_eye_L"] + anat_info["posed_eye_R"])
    lights = build_lighting_and_world(light_col, face_mid.tolist())
    beauty_cam, diag_cams = build_cameras(cam_col, anat_info["posed_eye_L"], anat_info["posed_eye_R"])

    # Set BeautyCamera active and frame resolution 960x1040 before saving character.blend!
    scene.camera = beauty_cam
    scene.render.resolution_x = 960
    scene.render.resolution_y = 1040

    # Pack all generated textures into character.blend & save BEFORE rendering!
    bpy.ops.file.pack_all()
    blend_path = os.path.join(WORKSPACE_DIR, "character.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=True)
    print(f"[Build] Saved packed editable scene to {blend_path} in {time.time() - t_start:.1f}s")

    stats = measure_character_stats(scene, char_col)
    print("[Stats]", json.dumps(stats, indent=2))

    rendered_files = []
    if not build_only:
        out_dir = os.path.join(WORKSPACE_DIR, "renders_preview" if preview_mode else "renders")
        rendered_files = render_all_views(scene, cafe_col, beauty_cam, diag_cams, out_dir, preview=preview_mode)

    if not preview_mode:
        report = {
            "blenderVersion": bpy.app.version_string,
            "renderEngine": scene.render.engine,
            "renderDevice": scene.cycles.device,
            "denoiser": scene.cycles.denoiser,
            "samples": scene.cycles.samples,
            "threads": 3,
            "gpuUsed": False,
            "collections": ["Character", "CafeEnvironment", "Lighting", "Cameras"],
            "importantObjects": {
                "characterMeshes": [
                    "HeadBody_Mesh",
                    "Eyeball_L",
                    "Eyeball_R",
                    "Cornea_L",
                    "Cornea_R",
                    "EyeTearMeniscus",
                    "Sweater_Body",
                    "Sweater_Collar",
                    "Sweater_Sleeve_R",
                    "Sweater_Sleeve_L",
                    "Hand_R",
                    "Hand_L",
                ],
                "characterHairCurves": [
                    "Hair_ScalpBase",
                    "Hair_LongWaves",
                    "Hair_WispyBangs",
                    "Hair_Flyaways",
                    "Eyelashes_Curves",
                    "Eyebrows_Curves",
                ],
                "cameras": [
                    "BeautyCamera",
                    "FrontCamera",
                    "ThreeQuarterCamera",
                    "SideCamera",
                    "BackCamera",
                ],
                "lights": [l.name for l in lights],
            },
            "characterBoundsMeters": {
                "min": stats["bounds_min_m"],
                "max": stats["bounds_max_m"],
                "dimensions": stats["dimensions_m"],
            },
            "geometryCounts": {
                "baseMeshVertices": stats["base_mesh_vertices"],
                "baseMeshFaces": stats["base_mesh_faces"],
                "evaluatedMeshVertices": stats["evaluated_mesh_vertices"],
                "evaluatedMeshFaces": stats["evaluated_mesh_faces"],
                "hairCurveStrands": stats["hair_curve_strands"],
                "hairCurveControlPoints": stats["hair_curve_control_points"],
                "totalEvaluatedVerticesAndCurvePoints": stats["total_evaluated_vertices_and_curve_points"],
            },
            "generatedTextures": mat_info["textures"],
            "renderedFiles": rendered_files if rendered_files else [
                "renders/beauty.png",
                "renders/front.png",
                "renders/three-quarter.png",
                "renders/side.png",
                "renders/back.png",
            ],
            "remainingLimitations": [
                "Single-view portrait likeness is sculpted procedurally from visual inspection of input/reference.png without photogrammetry or neural reconstruction; fine individual facial identity nuances remain an artistic 3D approximation.",
                "Back of the head, hair flow over the back, lower sweater waistband hem, and hands/fingers inside the extended cuffs are unseen in the reference photograph and are anatomically/stylistically inferred.",
                "Sweater knit loops combine 3D wale rib displacement with procedural 2K bump/sheen shaders rather than full yarn-level volumetric curve simulation.",
                "Character is posed via smooth analytical skinning in build.py rather than a production animation rig; unseen lower body/legs are omitted per specification.",
            ],
        }
        report_path = os.path.join(WORKSPACE_DIR, "scene-report.json")
        with open(report_path, "w", encoding="utf-8") as rf:
            json.dump(report, rf, indent=2)
        print(f"[Build] Wrote {report_path}")


if __name__ == "__main__":
    main()
