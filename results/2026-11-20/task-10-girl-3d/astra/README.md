# Window seat

An editable upper-body portrait in Blender 5.1.1. Open `character.blend` for the posed character, café, lighting and beauty camera. The second scene, **Turntable | neutral studio**, links the same character and lights. Its four orthographic cameras show the complete bust, including the hands.

## Reference

I actually saw the decoded 1205 × 1306 photograph in `input/reference.png` before modeling. The rising eye line, off-center part, long wave across the viewer’s left shoulder, glimpse of the opposite ear and sleeves extending into the foreground guided the composition. I read the supplied environment and asset license. The photograph is absent from the Blender file. All seven image textures in the scene come from numerical pigment or yarn patterns in the build scripts.

## Rebuild and render

Run these commands from this directory on the supplied Mac. Keep the supplied inputs and the helper modules alongside `build.py`. The first command constructs and saves the scene. The second starts a fresh Blender process, reopens the saved file, renders the five PNGs and measures the geometry for `scene-report.json`.

```sh
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
"$BLENDER" --background --factory-startup --threads 3 --python build.py
"$BLENDER" --background character.blend --threads 3 --python-exit-code 1 --python render.py
```

For a quick inspection, the following command writes six-sample renders at 43 percent resolution into `work/`. Any subset of the five view names works. The final images use Cycles on the CPU, 32 samples per pixel and CPU OpenImageDenoise. Each PNG comes directly from its Blender camera with AgX color management.

```sh
"$BLENDER" --background character.blend --threads 3 --python render.py -- --preview beauty front three-quarter side back
```

## Editing the portrait

- **Face and neck.** The continuous MakeHuman surface carries the lids, nostrils, lips, ears and neck. Two shape keys reshape the cheeks, bridge, jaw and mouth corners and produce the head tilt. The skin shader combines a packed complexion chart, pore relief, localized sheen and subsurface scattering. The lip border follows the original mesh coordinates.
- **Eyes and expression.** The eyelids enclose ellipsoidal globes with recessed brown irises, pupils, convex corneas and modeled tear ducts. Separate native curves follow the upper and lower lid margins and the brows. The highlights come from scene lights.
- **Hair.** The chestnut groom combines a fitted root bed, parted crown, overlapping shaded locks, native strand curves, a swept fringe and flyaways. Posterior guides drape over the evaluated sweater. The shoulder layers follow their own S-shaped paths. Select the named curve objects in collection 03 to edit the strands.
- **Sweater and arms.** A single patterned mesh joins the body, set-in sleeves, collar, cuffs and folded hem. Its cross sections model the fabric ease and compression folds. The repeating charts describe interlocking yarn loops and their relief. The collar also has raised wool curves, and the garment has a short fiber nap.
- **Café.** The window, potted ficus, chair, oak shelves, dishes and glass jars are modeled objects. Camera depth of field softens the background. The character materials, generated charts, collections, cameras and lights are stored in the blend.

The eye and hair objects occupy the final posed coordinates. A new head pose requires moving those objects along with the head surface.

## Self-review

The head tilt, over-the-shoulder chestnut wave, closed smile and pink sweater carry the reference pose and palette. The skin is smoother and the crown and descending waves form more regular groups than in the photograph. The resemblance is approximate. The single view leaves the cranium in depth, ear profile, rear hair, sweater back, sleeve construction, torso and hands to inference. The lower body is outside the asset.

I inspected small beauty and turntable renders and a larger face crop. I adjusted the eye reflections, fringe, ear exposure, hair over the shoulders and camera framing from those renders. At full size I also checked the neckline and fitted the cuff openings to the posed wrist sections.

## Base mesh attribution

MakeHuman hm08 is a CC0 asset. The source header credits Data Collection AB, Joel Palmius and Jonas Hauquier. I used the supplied cropped upper-body topology for the face and neck, and the supplied original body topology for the portions of the hands emerging from the cuffs. The garment, hair, optics, surface charts and café were constructed for this portrait. The common input is pinned to commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. [Supplied asset license](input/ASSET-LICENSE.md) · [Pinned MakeHuman source](https://raw.githubusercontent.com/makehumancommunity/makehuman/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)
