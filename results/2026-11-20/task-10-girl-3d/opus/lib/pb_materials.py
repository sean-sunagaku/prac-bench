"""Skin and misc. character materials (all procedural / attribute driven)."""
import math
import bpy
from pb_common import (new_material, node, link, math_node, mix_rgb, mix_float,
                       color_ramp, srgb)


def make_skin_material(name="Skin"):
    """Principled skin with random-walk SSS, colour from the 'skin_tone' colour
    attribute (painted procedurally from facial landmarks), masks in
    'skin_masks' (R=lips, G=scalp/brow tint, B=socket/wet), multi-scale
    pore/micro-roughness bump from object-space noise."""
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (1600, 0))
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (1250, 0), label='SkinBSDF')
    attr = node(nt, 'ShaderNodeAttribute', (-1200, 300), label='SkinTone')
    attr.attribute_name = 'skin_tone'
    attr.attribute_type = 'GEOMETRY'
    masks = node(nt, 'ShaderNodeAttribute', (-1200, 0), label='SkinMasks')
    masks.attribute_name = 'skin_masks'
    sepm = node(nt, 'ShaderNodeSeparateColor', (-1000, 0))
    link(nt, masks.outputs['Color'], sepm.inputs[0])
    lips = sepm.outputs[0]
    wet = sepm.outputs[2]
    tc = node(nt, 'ShaderNodeTexCoord', (-1400, -400))
    # --- micro detail ----------------------------------------------------------
    pores = node(nt, 'ShaderNodeTexVoronoi', (-900, -500), label='Pores')
    pores.feature = 'F1'
    pores.inputs['Scale'].default_value = 2600.0
    pores.inputs['Randomness'].default_value = 0.9
    link(nt, tc.outputs['Object'], pores.inputs['Vector'])
    pore_h = color_ramp(nt, pores.outputs['Distance'], [(0.0, (0, 0, 0)), (0.35, (1, 1, 1)), (1.0, (1, 1, 1))], (-700, -500))
    fine = node(nt, 'ShaderNodeTexNoise', (-900, -800), label='MicroNoise')
    fine.inputs['Scale'].default_value = 5200.0
    fine.inputs['Detail'].default_value = 4.0
    link(nt, tc.outputs['Object'], fine.inputs['Vector'])
    broad = node(nt, 'ShaderNodeTexNoise', (-900, -1100), label='BroadNoise')
    broad.inputs['Scale'].default_value = 140.0
    broad.inputs['Detail'].default_value = 6.0
    link(nt, tc.outputs['Object'], broad.inputs['Vector'])
    h = math_node(nt, 'MULTIPLY', node_bw(nt, pore_h, (-500, -500)), 0.6, (-350, -500))
    h = math_node(nt, 'ADD', h, math_node(nt, 'MULTIPLY', fine.outputs['Fac'], 0.4, (-500, -800)), (-200, -600))
    # lips: smoother micro detail
    h = mix_float(nt, lips, h, 0.5, (0, -600))
    bump = node(nt, 'ShaderNodeBump', (900, -500), label='PoreBump')
    bump.inputs['Strength'].default_value = 0.12
    bump.inputs['Distance'].default_value = 0.00012
    link(nt, h, bump.inputs['Height'])
    link(nt, bump.outputs[0], bsdf.inputs['Normal'])
    # --- colour -----------------------------------------------------------------
    col = attr.outputs['Color']
    blot = math_node(nt, 'SUBTRACT', broad.outputs['Fac'], 0.5, (-600, -1100))
    blot_col = mix_rgb(nt, math_node(nt, 'MULTIPLY', blot, 0.18, (-400, -1100)), col, srgb(214, 140, 120), loc=(-200, 300))
    link(nt, blot_col, bsdf.inputs['Base Color'])
    # --- roughness: T-zone & lips glossier, cheeks softer ----------------------
    rough = math_node(nt, 'ADD', 0.47, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', fine.outputs['Fac'], 0.5, (-200, -900)), 0.16, (0, -900)), (200, -900))
    rough = mix_float(nt, lips, rough, 0.18, (400, -900))
    rough = mix_float(nt, wet, rough, 0.12, (600, -900))
    link(nt, rough, bsdf.inputs['Roughness'])
    bsdf.inputs['Subsurface Weight'].default_value = 1.0
    bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.42, 0.22)
    bsdf.inputs['Subsurface Scale'].default_value = 0.0035
    bsdf.inputs['Subsurface Anisotropy'].default_value = 0.6
    bsdf.inputs['Specular IOR Level'].default_value = 0.45
    bsdf.inputs['IOR'].default_value = 1.4
    coat = math_node(nt, 'MULTIPLY', lips, 0.6, (800, -1000))
    coat = math_node(nt, 'ADD', coat, math_node(nt, 'MULTIPLY', wet, 0.6, (800, -1150)), (950, -1050))
    link(nt, coat, bsdf.inputs['Coat Weight'])
    bsdf.inputs['Coat Roughness'].default_value = 0.22
    bsdf.inputs['Sheen Weight'].default_value = 0.08
    bsdf.inputs['Sheen Roughness'].default_value = 0.4
    link(nt, bsdf.outputs[0], out.inputs['Surface'])
    return mat


def node_bw(nt, col, loc):
    n = node(nt, 'ShaderNodeRGBToBW', loc)
    link(nt, col, n.inputs[0])
    return n.outputs[0]


def make_simple_material(name, color, rough=0.5, **kw):
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (400, 0))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (0, 0))
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        b.inputs[k].default_value = v
    link(nt, b.outputs[0], out.inputs['Surface'])
    return mat


def make_hair_material(name="Hair", melanin=0.52, redness=0.78, rough=0.30, tip_lighten=0.10,
                       random_color=0.16, coat=0.12):
    """Principled Hair BSDF (Chiang) with per-strand melanin jitter and lighter tips."""
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (900, 0))
    hb = node(nt, 'ShaderNodeBsdfHairPrincipled', (550, 0), label='HairBSDF')
    try:
        hb.model = 'CHIANG'
    except Exception:
        pass
    hb.parametrization = 'MELANIN'
    info = node(nt, 'ShaderNodeHairInfo', (-600, 0))
    # melanin: darker near roots, lighter toward tips, random per strand
    tip = math_node(nt, 'POWER', info.outputs['Intercept'], 1.6, (-400, 100))
    mel = math_node(nt, 'SUBTRACT', melanin + 0.04, math_node(nt, 'MULTIPLY', tip, tip_lighten, (-250, 100)), (-100, 100))
    rnd = math_node(nt, 'SUBTRACT', info.outputs['Random'], 0.5, (-400, -100))
    mel = math_node(nt, 'ADD', mel, math_node(nt, 'MULTIPLY', rnd, 0.10, (-250, -100)), (50, 50), clamp=True)
    link(nt, mel, hb.inputs['Melanin'])
    hb.inputs['Melanin Redness'].default_value = redness
    hb.inputs['Roughness'].default_value = rough
    if 'Radial Roughness' in hb.inputs:
        hb.inputs['Radial Roughness'].default_value = 0.38
    if 'Coat' in hb.inputs:
        hb.inputs['Coat'].default_value = coat
    hb.inputs['IOR'].default_value = 1.55
    hb.inputs['Offset'].default_value = math.radians(2.5)
    hb.inputs['Random Color'].default_value = random_color
    hb.inputs['Random Roughness'].default_value = 0.12
    link(nt, info.outputs['Random'], hb.inputs['Random'])
    link(nt, hb.outputs[0], out.inputs['Surface'])
    return mat


def make_knit_material(name, height_img, base=(230, 146, 152), shadow=(150, 82, 92), bump=0.9, bump_dist=0.0028,
                       fuzz=1.0):
    """Dusty-pink wool: stitch height image (procedural, packed) drives bump and
    stitch-gap occlusion; sheen gives the mohair halo; fine noise adds fibre."""
    mat, nt = new_material(name)
    out = node(nt, 'ShaderNodeOutputMaterial', (1500, 0))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (1150, 0), label='KnitBSDF')
    uv = node(nt, 'ShaderNodeUVMap', (-1100, 0))
    uv.uv_map = 'KnitUV'
    tex = node(nt, 'ShaderNodeTexImage', (-850, 0), label='StitchHeight')
    tex.image = height_img
    tex.interpolation = 'Cubic'
    link(nt, uv.outputs['UV'], tex.inputs['Vector'])
    h = tex.outputs['Color']
    hb = node(nt, 'ShaderNodeRGBToBW', (-600, 0))
    link(nt, h, hb.inputs[0])
    hv = hb.outputs[0]
    # colour: occluded gaps darker + yarn variation
    tc = node(nt, 'ShaderNodeTexCoord', (-1100, -400))
    var = node(nt, 'ShaderNodeTexNoise', (-850, -400), label='YarnVariation')
    var.inputs['Scale'].default_value = 18.0
    var.inputs['Detail'].default_value = 3.0
    link(nt, tc.outputs['Object'], var.inputs['Vector'])
    occl = color_ramp(nt, hv, [(0.0, srgb(*shadow)), (0.55, srgb(*base)), (1.0, srgb(min(255, base[0] + 12), min(255, base[1] + 10), min(255, base[2] + 10)))], (-400, 150))
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', var.outputs['Fac'], 0.5, (-600, -400)), 0.25, (-450, -400)),
                  occl, srgb(int(base[0] * 0.9), int(base[1] * 0.85), int(base[2] * 0.88)), loc=(-150, 100))
    link(nt, col, b.inputs['Base Color'])
    # fibre fuzz bump
    fib = node(nt, 'ShaderNodeTexNoise', (-850, -700), label='FibreNoise')
    fib.inputs['Scale'].default_value = 2600.0
    fib.inputs['Detail'].default_value = 2.0
    link(nt, tc.outputs['Object'], fib.inputs['Vector'])
    hh = math_node(nt, 'ADD', hv, math_node(nt, 'MULTIPLY', fib.outputs['Fac'], 0.25, (-600, -700)), (-400, -500))
    bm = node(nt, 'ShaderNodeBump', (850, -400), label='KnitBump')
    bm.inputs['Strength'].default_value = bump
    bm.inputs['Distance'].default_value = bump_dist
    link(nt, hh, bm.inputs['Height'])
    link(nt, bm.outputs[0], b.inputs['Normal'])
    rough = math_node(nt, 'SUBTRACT', 0.95, math_node(nt, 'MULTIPLY', hv, 0.12, (600, -600)), (800, -600))
    link(nt, rough, b.inputs['Roughness'])
    b.inputs['Sheen Weight'].default_value = fuzz
    b.inputs['Sheen Roughness'].default_value = 0.42
    b.inputs['Sheen Tint'].default_value = srgb(255, 236, 238)
    b.inputs['Subsurface Weight'].default_value = 0.12
    b.inputs['Subsurface Radius'].default_value = (1.0, 0.6, 0.6)
    b.inputs['Subsurface Scale'].default_value = 0.002
    b.inputs['Specular IOR Level'].default_value = 0.25
    link(nt, b.outputs[0], out.inputs['Surface'])
    return mat
