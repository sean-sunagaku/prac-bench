# Editable 3D upper-body selfie portrait (Blender 5.1.1, Cycles CPU)

Deliverables in this directory:

| File | What it is |
|---|---|
| `build.py` | Reproducible builder: creates the whole scene from the supplied inputs and saves `character.blend` |
| `lib/*.py` | Helper modules imported by `build.py` (sculpt, eyes, pose, hair, sweater, knit textures, materials, set) |
| `render.py` | Re-opens the saved `character.blend` and renders the five PNGs, then writes `scene-report.json` |
| `verify_blend.py` | Optional: re-opens `character.blend` and checks objects / packed images (`verify_report.json`) |
| `character.blend` | Final editable scene (beauty camera active, all resources packed, compressed) |
| `renders/beauty.png` | 960x1040 selfie-composition beauty render |
| `renders/front.png`, `three-quarter.png`, `side.png`, `back.png` | 768x768 diagnostic views at 0 / 45 / 90 / 180 degrees |
| `scene-report.json` | Blender version, engine/device, object names, bounds, geometry counts, textures, renders, limitations |
| `build_stats.json` | Raw numbers written by `build.py` |
| `dev/`, `previews/` | My development/preview scripts, low-quality iteration renders and stale intermediate .blend builds (kept for transparency, not deliverables) |

## Reference image access (honest statement)

I **did actually see the decoded photograph** `input/reference.png` (1205x1306): it was opened with an image-reading
tool and displayed to me as an image before any modelling started. I used it only as a visual reference while
writing parameters; `build.py` never loads it and it is not used as a texture, plane, billboard or background.
What I observed and tried to match: a young, softly smiling feminine person, head tilted strongly toward her right
shoulder (≈25-30° roll), warm brown eyes looking into the lens, long chestnut-brown hair with loose waves and light
see-through bangs, the hair on her right side falling in front of the shoulder over the chest and the left side
tucked behind the visible left ear, fair warm skin with pink cheeks and glossy pink lips, a dusty-pink chunky knit
crew-neck sweater, both arms reaching toward the selfie camera (right sleeve huge and blurred in the lower-left
corner, left sleeve leaving the right edge), and a bright cafe with a plant/window on the left, wooden shelves with
jars on the right and wooden chairs/tables. The person is not identified.

`input/environment.json` (landmarks, coordinate convention) and `input/ASSET-LICENSE.md` were read and used.

## How to build, render and open

```bash
cd <this directory>
# 1) build + save (≈20 s)
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 3 --python build.py
# 2) re-open the saved file and render all five PNGs + scene-report.json (≈3.5 min on 3 CPU threads)
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 3 character.blend --python render.py
# optional: re-open check
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup character.blend --python verify_blend.py
```

`build.py` options (after `--`): `--fast` (fewer hair strands, preview), `--no-hair`, `--out file.blend`.
`render.py` options: `--preview` (half size, 12 samples, writes to `previews/`), `--only beauty,front,...`.
Open `character.blend` in Blender 5.1.1: the beauty camera `Camera_Beauty` is active and the cafe set,
beauty lights and `World_Cafe` are enabled. For the diagnostic look, disable `Cafe_Set` + `Lights_Beauty`, enable
`Lights_Studio`, switch the world to `World_Studio` and pick `Camera_Front/ThreeQuarter/Side/Back` (this is exactly
what `render.py` toggles; geometry and materials are identical for every view).

Render settings: Cycles, **CPU**, 32 samples (adaptive), OpenImageDenoise, 3 threads, AgX, 3D-curve hair.
No GPU, no compositing, no post-processing: the PNGs are the raw renders written by `bpy.ops.render.render`.

## What was built and how

**Base mesh.** `input/upper-body.obj` (CC0 MakeHuman hm08 crop) is used as the anatomical start. Because the crop
ends just below the elbows and the pose needs hands reaching to the camera, the forearms/hands are taken from the
supplied `input/base.obj` (the same CC0 asset): the builder re-applies the documented transform, keeps every face of
the crop plus the arm faces, and checks that all 6093 crop vertices coincide (max distance 0.0 m). Helper geometry
(eyes, teeth, lashes, tights, genitals) of base.obj is not used, and nothing nude is visible: skin under the sweater is
hidden by a non-destructive `Mask` modifier (vertex group `skin_visible`), so only head, neck and hands render.

**Facial sculpt (procedural, `lib/pb_body.py`).** Numpy deformation brushes driven by measured landmarks: V-line
lower-face taper and shorter chin, softer jaw angle, crisper submental line, narrower nose bridge and alae with a
smaller, slightly lifted tip (the hm08 nostrils are kept, so the nose stays one integrated surface), fuller everted
lips, lifted mouth corners and cheeks for a closed-mouth smile, rounder apple cheeks / mid-face, softer brow ridge,
slimmer neck, then a masked Taubin relax. Everything stays one continuous subdivided surface (render level 2).

**Eyelids + eyeballs.** The hm08 eye opening rings are identified topologically and every ring is re-placed by a
parametric eyelid model: an almond opening (≈30 x 9-10 mm) whose inner margin lies on the eyeball surface, an outer
margin with ≈0.8 mm lid thickness, depth blending to the face, a double-eyelid crease, a soft under-eye roll, and an
upper lid that follows the gaze. Eyeballs (`Eye_*_Shell`, `Eye_*_Iris`) are real geometry: a sclera sphere with a
bulged cornea (tear-film shader: Fresnel mix of transparent + sharp gloss, sclera SSS with procedural veins and a
limbal ring) and a recessed, slightly conical iris disc with a procedural warm-brown fibre/collarette shader and
pupil. Both eyes are aimed at the selfie camera; a small "phone screen" area light gives catchlights.

**Skin.** Principled BSDF with random-walk SSS (radius 1.0/0.42/0.22, scale 3.5 mm), colour from a per-vertex
`skin_tone` attribute painted procedurally (warm base, cheek/nose blush, eyelid tints, vermilion lips, caruncle,
conjunctiva, darkened nostril cavities, faint brow tint, dark scalp under the hair) plus a mask attribute (lip gloss/coat, wet socket), a
broad noise for blotchiness and Voronoi+noise pore/micro bump with micro roughness variation. Editable in
Vertex Paint / the node tree.

**Hair (`lib/pb_hair.py`).** ~20.5k real curve strands (`Hair_Long`, `Hair_FaceFraming`, `Hair_Bangs`) grown from
roots sampled on the posed scalp: a parting-based flow field, layer offsets that grow with travel so crown hair lies
on top, combing attraction onto the head surface, gravity blended between head-local (styled) and world down,
collisions with head/ear/sweater/collar, routing in front of the right shoulder (inside the raised arm) and
behind the left ear/shoulder, a "face guard" that keeps strands out of the eyes-to-chin area, then clumping, loose
S-waves (≈9.5 cm wavelength), frizz and flyaways. Wispy curtain-like bangs are combed onto the forehead and end at
the brows. Principled Hair BSDF (Chiang, melanin 0.82 / redness 0.62, per-strand melanin jitter, lighter tips).
Brows (2 x 380 short hairs lying on the skin) and lashes (2 x 140 upper, 2 x 60 lower, curled, splayed) are curves too.

**Sweater (`lib/pb_sweater.py`, `lib/pb_knit.py`).** Posed torso offset by a looseness map with a "hanging drape"
pass (fabric falls from bust/shoulder blades instead of hugging), a hem extension, and loose sleeve tubes along the
posed arm bones that sag below the arms; these are fused with a voxel remesh, Taubin-relaxed, trimmed at a crew
neckline / cuffs / hem, and given procedural folds (tilted compression rings that bunch at elbows and forearms,
deeper on the gravity side, gathered folds above the hem). Separate ribbed `Sweater_Collar`, `Sweater_Cuff_L/R`
and `Sweater_Hem` bands are swept from the cut edges and pushed off the skin. Knit UVs run around the torso and
along each sleeve (stockinette columns follow the knitting direction, seams at back centre/armholes). Two
procedural numpy height maps (stockinette 1024², 2x2 rib 512²), packed in the .blend, drive bump and stitch-gap
occlusion; Principled sheen gives the mohair halo, a fibre-noise bump adds fuzz detail.

**Pose.** Hand-built linear-blend skinning (no external rig): torso lean/roll, two-stage neck/head roll
(≈30° total) with slight pitch/yaw, clavicle protraction, two-bone IK so both straight-ish arms reach toward the
camera (hands just outside the beauty frame), relaxed curled fingers, head-rigid attachments (eyes, lashes, brows).

**Scene.** `Cafe_Set` collection built from primitives: back wall, bright window wall with mullions, three potted
plants with ~2000 leaves, wooden shelves with jars/canisters, counter and machine, chairs, a side table with a
glass vase and white flowers, her own table in the foreground. Lights: back-left window area light (hair rim),
soft key, front fill, warm rim, phone-screen catchlight; warm ambient world. Beauty camera: 25.5 mm at ≈0.32 m
from the eyes, slightly above, f/2.2 depth of field focused on the eyes (the near sleeve and background blur
naturally, like the photo). Diagnostics: 70 mm cameras around the character bounds, a neutral studio rig that turns
with the view and a plain grey backdrop.

## Observed vs inferred

Observed in the photo (matched as closely as practical): front face, expression, eye colour, bangs, front/side
hair fall, sweater front, collar, sleeves, head tilt, lighting mood, cafe elements. **Inferred / invented:** the
side and back of the head and hair, the hairstyle behind the shoulders, the body under the sweater, the back and
sides of the sweater (plain stockinette with a hem band), the hands (never visible in the photo; here relaxed and
out of frame in the beauty shot), the ears' exact shape, and the whole room layout.

## Self-review (how close is it?)

The render reads as a soft, high-key cafe selfie with the same composition, head tilt, arm placement, hair
colour/length, bangs and pink chunky knit as the reference, and every visible element is real 3D geometry.
It is clearly **not** photographic and not a likeness-grade portrait: the face is a procedural re-sculpt of a generic
head, so the facial proportions, the eye shape and the youthful roundness of the reference are only approximated
(my face is longer, the eyes smaller and less luminous, the smile more subtle); skin is smooth and slightly
CG-looking; the hair has less layered volume, fewer flyaways and less glossy depth than the photo and the bangs are
more stringy; the sweater is smoother and less fuzzy than real mohair-like knit and its folds are procedural; the
hands are serviceable but generic; the background is a blurred primitive set. Some fine stray hairs cross the neck.

## Approximations / limitations

* Facial likeness, eyelid crease and lip shape are procedural approximations (no scan, no photogrammetry, no ML).
* Hair: no simulation; ~20k strands (vertex budget), so density and clump detail are below a real head of hair.
* Knit: bump/shading from a stitch map, not modelled yarn loops; folds are displacement, not cloth simulation.
* Under-sweater anatomy is generic hm08 posed with simple LBS and hidden by a Mask modifier.
* The phone is not modelled (the beauty camera is the phone); hands are relaxed, not gripping anything.
* 32-sample denoised Cycles renders: some denoiser softening in hair and defocused regions.

## Resource usage (measured on the final files)

* Build: ≈16 s (`build.py`), `character.blend` 13.0 MB compressed, all images packed (`verify_report.json`).
* Renders (Cycles CPU, 3 threads, 32 spp + OIDN): beauty 115.5 s, front 22.5 s, three-quarter 14.0 s,
  side 18.8 s, back 29.2 s.
* Geometry at render settings: **858,550** evaluated character vertices + curve points (meshes 229,834 incl. the
  cafe set; hair/brow/lash curve points 640,052: Hair_Long 18,706 strands, Hair_FaceFraming 735, Hair_Bangs 1,125,
  brows 2 x 380, lashes 2 x 200). Base (unevaluated) mesh vertices: 103,180.
* Textures: two procedural height maps (1024² stockinette, 512² rib), generated in numpy and packed. No other
  images. The photograph is never loaded by the build.
* Folder size ≈150 MB, mostly my preview iterations in `previews/`.

## Third-party asset attribution

Base mesh: **MakeHuman hm08 base mesh**, released under **CC0** (asset header: "This asset was explicitly released
as CC0 in september 2020"; copyright holders at release: Data Collection AB, Joel Palmius, Jonas Hauquier).
Pinned source: https://raw.githubusercontent.com/makehumancommunity/makehuman/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj
(`input/upper-body.obj` is the coordinator's crop of it; `input/base.obj` the full file). No other models,
textures, downloads or generation services were used; all other geometry, textures and shaders were created by the
scripts in this directory.
