# Window seat

Open [character.blend](character.blend) in Blender 5.1.1. It opens on the selfie camera. The **01 • PORTRAIT** collection contains the editable skin, eyes, groom, sweater and hands. The four turntable cameras and both lighting setups are saved in the same file.

## Rebuild and render

Run these commands in this directory. The build saves the scene before a separate Blender process opens it and writes the renders.

```sh
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender
"$BLENDER_BIN" --background --factory-startup --threads 3 --python build.py
"$BLENDER_BIN" --background --factory-startup --threads 3 character.blend --python render_scene.py
"$BLENDER_BIN" --background --factory-startup --threads 3 character.blend --python verify_scene.py
```

Append `-- --preview beauty side` to the render command for half-resolution previews in `.work/`. With no arguments, the script writes the 960 × 1040 beauty render and the four 768 × 768 diagnostics. The diagnostic azimuths are 0°, 45°, 90° and 180° around +Z from the character's −Y front. All five use the saved character geometry and materials. The turntable uses separate studio lighting and a plain sweep. The PNGs are direct Cycles CPU renders with a 32-sample maximum, adaptive sampling, and CPU denoising.

## Reference and construction

I viewed the decoded 1205 × 1306 photograph with an image-reading tool before building. The image guided the tilt, expression, eye color, sweeping bangs, chestnut waves, rose crew neck, forward sleeves and window-lit composition. The photograph stays in `input/`. The scene uses three packed, procedurally generated image maps and editable geometry and shader nodes.

- The head and neck are a continuous sculpted hm08 cage with subdivision, integrated lids and lips, soft tissue scatter, and local pigment and roughness variation. Curved iris surfaces, clear corneal caps, a softly tinted sclera, and individually laid brow and lash curves form the eyes.
- The groom uses fitted scalp and styling meshes with layered native strand curves. Flow varies across the part, fringe, shoulder drape and back. The sweater has joined torso and sleeve topology, patterned knit relief, and ribbed geometry at the collar, cuffs and hem.
- Physical lights, a window, plants, timber furniture and shelving form the cafe. Depth of field softens the foreground sleeve and background furnishings.

## Self-review

I inspected successive Blender previews at the selfie, front, oblique, side and rear angles. I adjusted the overly pale initial hair, refined the eye shading, seated the collar and cuffs, softened the hair ends, and raised the camera-left shoulder and forward sleeves. The result captures the color palette, pose, expression and silhouette as a hand-authored portrait. The skin is smoother than the photograph, the hair groups are more orderly, and the facial likeness is approximate. The profile, back of the head, hair drape behind the shoulders, covered clothing and off-frame hands are inferred from the single view. The head tilt and reach are baked into editable meshes and curves.

The sculpt and hands adapt MakeHuman's **hm08** CC0 base mesh at commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. The supplied crop and coordinate conversion are documented with the asset. [License notes](input/ASSET-LICENSE.md) · [CC0 source OBJ](https://raw.githubusercontent.com/makehumancommunity/makehuman/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)

[Beauty](renders/beauty.png) · [Front](renders/front.png) · [Three-quarter](renders/three-quarter.png) · [Side](renders/side.png) · [Back](renders/back.png) · [Scene report](scene-report.json)
