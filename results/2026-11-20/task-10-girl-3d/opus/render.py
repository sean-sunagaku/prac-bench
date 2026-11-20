"""Render the saved scene (character.blend) to renders/*.png and write scene-report.json.

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 3 \
        character.blend --python render.py

Flags after `--`:  --preview (half size, 12 samples, writes to previews/)  --only beauty,front,...
The PNGs are raw Cycles renders of the saved file; nothing is composited afterwards.
"""
import bpy
import sys
import os
import json
import math
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = '--preview' in ARGS
ONLY = ARGS[ARGS.index('--only') + 1].split(',') if '--only' in ARGS else None
TAG = ARGS[ARGS.index('--tag') + 1] if '--tag' in ARGS else 'pv'
OUTDIR = os.path.join(HERE, 'previews' if PREVIEW else 'renders')
os.makedirs(OUTDIR, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 3
if PREVIEW:
    scene.cycles.samples = 12
    scene.render.resolution_percentage = 50
else:
    scene.cycles.samples = 32
    scene.render.resolution_percentage = 100

VIEWS = [
    ('beauty', 'Camera_Beauty', 960, 1040, None),
    ('front', 'Camera_Front', 768, 768, 0),
    ('three-quarter', 'Camera_ThreeQuarter', 768, 768, 45),
    ('side', 'Camera_Side', 768, 768, 90),
    ('back', 'Camera_Back', 768, 768, 180),
]


def set_mode(beauty):
    bpy.data.collections['Cafe_Set'].hide_render = not beauty
    bpy.data.collections['Lights_Beauty'].hide_render = not beauty
    bpy.data.collections['Lights_Studio'].hide_render = beauty
    scene.world = bpy.data.worlds['World_Cafe' if beauty else 'World_Studio']


timings = {}
written = []
for name, cam, rx, ry, ang in VIEWS:
    if ONLY and name not in ONLY:
        continue
    set_mode(ang is None)
    scene.camera = bpy.data.objects[cam]
    scene.render.resolution_x = rx
    scene.render.resolution_y = ry
    if ang is not None:
        bpy.data.objects['StudioRig'].rotation_euler = (0.0, 0.0, math.radians(ang))
    fn = f'{TAG}_{name}.png' if PREVIEW else f'{name}.png'
    scene.render.filepath = os.path.join(OUTDIR, fn)
    t = time.time()
    bpy.ops.render.render(write_still=True)
    timings[name] = round(time.time() - t, 1)
    written.append(os.path.relpath(scene.render.filepath, HERE))
    print('[render]', name, timings[name], 's', flush=True)

# restore beauty state (not saved; the .blend on disk is untouched)
set_mode(True)
scene.camera = bpy.data.objects['Camera_Beauty']

if not PREVIEW and not ONLY:
    # ---- evaluated geometry counts at render subdivision levels ----
    saved = []
    for ob in scene.objects:
        for m in ob.modifiers:
            if m.type == 'SUBSURF':
                saved.append((m, m.levels))
                m.levels = m.render_levels
    dg = bpy.context.evaluated_depsgraph_get()
    mesh_eval, curve_pts, per_obj = 0, 0, {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            ev = ob.evaluated_get(dg)
            me = ev.to_mesh()
            n = len(me.vertices)
            ev.to_mesh_clear()
            mesh_eval += n
            per_obj[ob.name] = n
        elif ob.type == 'CURVES':
            n = len(ob.data.points)
            curve_pts += n
            per_obj[ob.name] = n
    for m, lv in saved:
        m.levels = lv
    char_eval = sum(v for k, v in per_obj.items() if not k.startswith('Cafe_'))
    stats = json.loads(scene.get('build_stats', '{}'))
    imgs = []
    for im in bpy.data.images:
        if im.users == 0 and not im.use_fake_user:
            continue
        if im.type != 'IMAGE':
            continue
        imgs.append(dict(name=im.name, size=list(im.size), packed=im.packed_file is not None,
                         description={'KnitStockinette_Height': 'procedural numpy stockinette stitch height map (8x10 stitches/tile), drives bump + stitch-gap occlusion of the sweater',
                                      'KnitRib_Height': 'procedural numpy 2x2 rib height map for collar, cuffs and hem'}.get(im.name, 'generated')))
    report = {
        'blender_version': bpy.app.version_string,
        'render_engine': scene.render.engine,
        'render_device': scene.cycles.device,
        'samples': scene.cycles.samples,
        'denoiser': getattr(scene.cycles, 'denoiser', None),
        'threads': scene.render.threads,
        'resolution': {'beauty': [960, 1040], 'diagnostic': [768, 768]},
        'render_seconds': timings,
        'rendered_files': written,
        'blend_file': 'character.blend',
        'collections': [c.name for c in bpy.data.collections],
        'important_objects': {
            'body': 'Body (sculpted hm08 head/neck + posed hands; Mask modifier hides skin under the sweater)',
            'eyes': ['Eye_L_Shell', 'Eye_L_Iris', 'Eye_R_Shell', 'Eye_R_Iris'],
            'hair': [o.name for o in bpy.data.collections['Character_Hair'].objects],
            'sweater': [o.name for o in bpy.data.collections['Character_Sweater'].objects],
            'cameras': ['Camera_Beauty', 'Camera_Front', 'Camera_ThreeQuarter', 'Camera_Side', 'Camera_Back'],
            'lights_beauty': [o.name for o in bpy.data.collections['Lights_Beauty'].objects],
            'lights_studio': [o.name for o in bpy.data.collections['Lights_Studio'].objects],
        },
        'character_bounds_m': stats.get('character_bounds'),
        'base_mesh_vertices_all_objects': stats.get('base_mesh_vertices'),
        'evaluated_mesh_vertices_render_levels_all_objects': mesh_eval,
        'evaluated_vertices_character_meshes_plus_curve_points': char_eval,
        'hair_curve_points_total': curve_pts,
        'per_object_evaluated_counts': per_obj,
        'hair': stats.get('hair'),
        'generated_textures': imgs,
        'procedural_shaders': ['Skin (vertex-colour tone + masks, random-walk SSS, voronoi/noise pore bump)',
                               'Eye_Shell (tear-film cornea transparent+gloss, sclera SSS with procedural veins and limbal ring)',
                               'Eye_Iris (radial fibre noise, collarette, limbal darkening, pupil)',
                               'Hair / Hair_Brows / Hair_Lashes (Principled Hair BSDF, melanin based, per-strand variation)',
                               'Knit_Sweater / Knit_Rib (packed stitch maps + sheen fuzz + fibre noise)', 'Cafe_* set materials'],
        'base_mesh': {'source': 'MakeHuman hm08 base mesh, CC0 (input/upper-body.obj + forearms/hands from input/base.obj)',
                      'info': stats.get('base_info')},
        'camera': stats.get('camera'),
        'limitations': [
            'Facial likeness is an approximation sculpted procedurally from a generic MakeHuman head; it is not a scan or photogrammetric reconstruction.',
            'Unseen anatomy (back/side of head, body under the sweater, hands, ears behind hair) and the back/sides of the sweater and hair are inferred.',
            'Hair is ~20.6k procedural curve strands (plus brows/lashes) with clumps, waves and flyaways; no hair simulation, so density is below a real head of hair and interaction with the sweater is approximate.',
            'Knit detail is a bump/shading effect from a procedural stitch map on a smooth voxel-fused sweater mesh, not individually modelled yarn loops.',
            'Sweater folds are procedural displacement, not cloth simulation.',
            'Body skin under the sweater is hidden by a Mask modifier (kept intact in the mesh); the forearm/hand skinning is a simple hand-built LBS pose, not a production rig.',
            'The phone is not modelled (the beauty camera is the phone); hands are relaxed and out of frame in the beauty shot.',
            'The cafe is a rough blurred suggestion built from primitives.',
            'Some fine stray hairs cross the neck; bangs are thinner/stringier than in the photo.',
            '32-sample Cycles CPU renders with OpenImageDenoise; some denoiser smoothing is visible in hair and depth-of-field areas.',
        ],
    }
    with open(os.path.join(HERE, 'scene-report.json'), 'w') as fh:
        json.dump(report, fh, indent=2)
    print('[render] wrote scene-report.json', flush=True)
