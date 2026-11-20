"""
materials.py
Constructs editable procedural + packed-image Cycles/Blender 5.1 materials for:
  - Fair luminous peach-ivory skin with crisp-detail Random Walk SSS (0.0042 scale),
    restrained micro-bump, and healthy glossy lip / cheekbone clearcoat sheen
  - Multi-layer eyes (deep soulful chestnut iris, crystal-clear Fresnel cornea, meniscus, caruncle)
  - Principled Hair BSDF shaders with root-to-tip glossy chestnut gradient (richer dark-chestnut
    bangs & lush waves, soft powdery brows, crisp dark espresso lashes)
  - Soft dusty-pink knitted crew-neck sweater (stockinette body, 1x1 rib trim, translucent wool fuzz)
"""
import bpy


def _new_mat(name):
    if name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[name])
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (500, 0)
    return mat, nt, out


def _add_tex_node(nt, image, loc=(-600, 0)):
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.location = loc
    return tex


def build_all_materials(skin_imgs, eye_img, knit_imgs):
    mats = {}

    # ------------------------------------------------------------------
    # 1. SKIN MATERIAL (luminous fair warm skin preserving crisp sculptural detail!)
    # ------------------------------------------------------------------
    mat, nt, out = _new_mat("Mat_Skin")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (120, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_alb = _add_tex_node(nt, skin_imgs["albedo"], (-650, 300))
    tex_rgh = _add_tex_node(nt, skin_imgs["roughness"], (-650, 40))
    tex_bmp = _add_tex_node(nt, skin_imgs["bump"], (-650, -220))
    tex_sss = _add_tex_node(nt, skin_imgs["sss"], (-650, -480))

    nt.links.new(tex_alb.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex_rgh.outputs["Color"], bsdf.inputs["Roughness"])

    # Restrained realistic Random-Walk skin SSS (glows warmly at ears/nose/cheeks without blurring eyelids/nostrils!)
    bsdf.subsurface_method = "RANDOM_WALK_SKIN"
    sss_mul = nt.nodes.new("ShaderNodeMath")
    sss_mul.operation = "MULTIPLY"
    sss_mul.location = (-260, -400)
    sss_mul.inputs[1].default_value = 0.25
    nt.links.new(tex_sss.outputs["Color"], sss_mul.inputs[0])
    nt.links.new(sss_mul.outputs["Value"], bsdf.inputs["Subsurface Weight"])
    bsdf.inputs["Subsurface Scale"].default_value = 0.0044
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.34, 0.19)
    bsdf.inputs["Subsurface IOR"].default_value = 1.40
    bsdf.inputs["Subsurface Anisotropy"].default_value = 0.35

    bsdf.inputs["Specular IOR Level"].default_value = 0.44
    # Healthy glossy lip tint sheen & soft cheekbone radiance
    inv_r = nt.nodes.new("ShaderNodeMapRange")
    inv_r.location = (-260, -60)
    inv_r.inputs["From Min"].default_value = 0.18
    inv_r.inputs["From Max"].default_value = 0.44
    inv_r.inputs["To Min"].default_value = 0.38
    inv_r.inputs["To Max"].default_value = 0.02
    inv_r.clamp = True
    nt.links.new(tex_rgh.outputs["Color"], inv_r.inputs["Value"])
    nt.links.new(inv_r.outputs["Result"], bsdf.inputs["Coat Weight"])
    bsdf.inputs["Coat Roughness"].default_value = 0.14
    bsdf.inputs["Coat IOR"].default_value = 1.42

    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (-220, -240)
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.00016
    nt.links.new(tex_bmp.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    mats["skin"] = mat

    # ------------------------------------------------------------------
    # 2. HANDS MATERIAL
    # ------------------------------------------------------------------
    mat, nt, out = _new_mat("Mat_Skin_Hands")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    bsdf.subsurface_method = "RANDOM_WALK_SKIN"
    bsdf.inputs["Base Color"].default_value = (0.54, 0.32, 0.24, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.46
    bsdf.inputs["Subsurface Weight"].default_value = 0.25
    bsdf.inputs["Subsurface Scale"].default_value = 0.0044
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.34, 0.19)
    bsdf.inputs["Specular IOR Level"].default_value = 0.42
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["hands"] = mat

    # ------------------------------------------------------------------
    # 3. EYE INNER (Sclera + Deep Warm Chestnut-Chocolate Iris)
    # ------------------------------------------------------------------
    mat, nt, out = _new_mat("Mat_Eye_Iris")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (120, 0)
    tex_eye = _add_tex_node(nt, eye_img, (-450, 120))
    nt.links.new(tex_eye.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.20
    bsdf.inputs["Specular IOR Level"].default_value = 0.28
    bsdf.inputs["Subsurface Weight"].default_value = 0.12
    bsdf.inputs["Subsurface Scale"].default_value = 0.0032
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.32)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["iris"] = mat

    # ------------------------------------------------------------------
    # 4. EYE CORNEA (Thin wet Fresnel shell -> crisp window catchlights!)
    # ------------------------------------------------------------------
    mat, nt, out = _new_mat("Mat_Eye_Cornea")
    lp = nt.nodes.new("ShaderNodeLightPath")
    lp.location = (-520, 280)
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    transp.location = (-220, 140)
    glossy = nt.nodes.new("ShaderNodeBsdfGlossy")
    glossy.location = (-220, -100)
    glossy.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    glossy.inputs["Roughness"].default_value = 0.005

    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.location = (-520, 40)
    lw.inputs["Blend"].default_value = 0.055
    fres_map = nt.nodes.new("ShaderNodeMapRange")
    fres_map.location = (-320, 40)
    fres_map.inputs["From Min"].default_value = 0.0
    fres_map.inputs["From Max"].default_value = 1.0
    fres_map.inputs["To Min"].default_value = 0.036
    fres_map.inputs["To Max"].default_value = 0.36
    fres_map.clamp = True
    nt.links.new(lw.outputs["Fresnel"], fres_map.inputs["Value"])

    mix_wet = nt.nodes.new("ShaderNodeMixShader")
    mix_wet.location = (40, 20)
    nt.links.new(fres_map.outputs["Result"], mix_wet.inputs["Fac"])
    nt.links.new(transp.outputs["BSDF"], mix_wet.inputs[1])
    nt.links.new(glossy.outputs["BSDF"], mix_wet.inputs[2])

    mix_sh = nt.nodes.new("ShaderNodeMixShader")
    mix_sh.location = (280, 60)
    nt.links.new(lp.outputs["Is Shadow Ray"], mix_sh.inputs["Fac"])
    nt.links.new(mix_wet.outputs["Shader"], mix_sh.inputs[1])
    nt.links.new(transp.outputs["BSDF"], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs["Shader"], out.inputs["Surface"])
    mats["cornea"] = mat

    # ------------------------------------------------------------------
    # 5. LACRIMAL MENISCUS
    # ------------------------------------------------------------------
    mat, nt, out = _new_mat("Mat_Eye_Meniscus")
    lp = nt.nodes.new("ShaderNodeLightPath")
    lp.location = (-450, 240)
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    transp.location = (-180, 120)
    glossy = nt.nodes.new("ShaderNodeBsdfGlossy")
    glossy.location = (-180, -100)
    glossy.inputs["Color"].default_value = (1.0, 0.99, 0.98, 1.0)
    glossy.inputs["Roughness"].default_value = 0.022
    mix_wet = nt.nodes.new("ShaderNodeMixShader")
    mix_wet.location = (60, 20)
    mix_wet.inputs["Fac"].default_value = 0.08
    nt.links.new(transp.outputs["BSDF"], mix_wet.inputs[1])
    nt.links.new(glossy.outputs["BSDF"], mix_wet.inputs[2])
    mix_sh = nt.nodes.new("ShaderNodeMixShader")
    mix_sh.location = (260, 40)
    nt.links.new(lp.outputs["Is Shadow Ray"], mix_sh.inputs["Fac"])
    nt.links.new(mix_wet.outputs["Shader"], mix_sh.inputs[1])
    nt.links.new(transp.outputs["BSDF"], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs["Shader"], out.inputs["Surface"])
    mats["meniscus"] = mat

    # ------------------------------------------------------------------
    # 6. CARUNCLE
    # ------------------------------------------------------------------
    mat, nt, out = _new_mat("Mat_Eye_Caruncle")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    bsdf.inputs["Base Color"].default_value = (0.55, 0.22, 0.20, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.14
    bsdf.inputs["Coat Weight"].default_value = 0.65
    bsdf.inputs["Coat Roughness"].default_value = 0.06
    bsdf.inputs["Subsurface Weight"].default_value = 0.45
    bsdf.inputs["Subsurface Scale"].default_value = 0.0025
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["caruncle"] = mat

    # ------------------------------------------------------------------
    # 7. HAIR SHADERS (Principled Hair BSDF with rich chestnut root-to-tip tone!)
    # ------------------------------------------------------------------
    def _make_hair_mat(name, mel_root, mel_tip, redness, rough, rad_rough, coat, rand_col=0.12, rand_rgh=0.10):
        m, nt, out = _new_mat(name)
        hair = nt.nodes.new("ShaderNodeBsdfHairPrincipled")
        hair.location = (120, 0)
        hair.parametrization = "MELANIN"

        cinfo = nt.nodes.new("ShaderNodeHairInfo")
        cinfo.location = (-420, 120)
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.location = (-160, 120)
        mr.inputs["From Min"].default_value = 0.0
        mr.inputs["From Max"].default_value = 1.0
        mr.inputs["To Min"].default_value = mel_root
        mr.inputs["To Max"].default_value = mel_tip
        mr.clamp = True
        nt.links.new(cinfo.outputs["Intercept"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], hair.inputs["Melanin"])

        hair.inputs["Melanin Redness"].default_value = redness
        hair.inputs["Roughness"].default_value = rough
        hair.inputs["Radial Roughness"].default_value = rad_rough
        hair.inputs["Coat"].default_value = coat
        hair.inputs["IOR"].default_value = 1.55
        hair.inputs["Offset"].default_value = 0.035
        hair.inputs["Random Color"].default_value = rand_col
        hair.inputs["Random Roughness"].default_value = rand_rgh
        nt.links.new(hair.outputs["BSDF"], out.inputs["Surface"])
        return m

    # Rich glossy chestnut brown with controlled coat (prevents white specular crown washout!)
    mats["hair_main"] = _make_hair_mat("Mat_Hair_Chestnut", mel_root=0.88, mel_tip=0.79, redness=0.50, rough=0.27, rad_rough=0.35, coat=0.11, rand_col=0.10)
    mats["hair_bangs"] = _make_hair_mat("Mat_Hair_Bangs", mel_root=0.90, mel_tip=0.84, redness=0.45, rough=0.27, rad_rough=0.34, coat=0.08, rand_col=0.07)
    # Soft misty warm-brown eyebrows (never harsh black strokes!)
    mats["hair_brows"] = _make_hair_mat("Mat_Hair_Eyebrows", mel_root=0.62, mel_tip=0.56, redness=0.42, rough=0.58, rad_rough=0.60, coat=0.01, rand_col=0.05)
    # Delicate dark espresso-brown lashes
    mats["hair_lashes"] = _make_hair_mat("Mat_Hair_Eyelashes", mel_root=0.95, mel_tip=0.92, redness=0.16, rough=0.26, rad_rough=0.32, coat=0.10, rand_col=0.03)

    mat, nt, out = _new_mat("Mat_Hair_ScalpCap")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    bsdf.inputs["Base Color"].default_value = (0.042, 0.020, 0.012, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Specular IOR Level"].default_value = 0.06
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["hair_cap"] = mat

    # ------------------------------------------------------------------
    # 8. COZY DUSTY-PINK KNITTED SWEATER SHADERS
    # ------------------------------------------------------------------
    def _make_knit_mat(name, alb_img, nrm_img, rgh_img, hgt_img=None, uv_scale=(1.0, 1.0), nrm_strength=1.05):
        m, nt, out = _new_mat(name)
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.location = (220, 0)

        tc = nt.nodes.new("ShaderNodeTexCoord")
        tc.location = (-980, 0)
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.location = (-760, 0)
        mp.inputs["Scale"].default_value = (uv_scale[0], uv_scale[1], 1.0)
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])

        t_alb = _add_tex_node(nt, alb_img, (-500, 260))
        t_nrm = _add_tex_node(nt, nrm_img, (-500, -240))
        nt.links.new(mp.outputs["Vector"], t_alb.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], t_nrm.inputs["Vector"])
        nt.links.new(t_alb.outputs["Color"], bsdf.inputs["Base Color"])

        if rgh_img is not None:
            t_rgh = _add_tex_node(nt, rgh_img, (-500, 10))
            nt.links.new(mp.outputs["Vector"], t_rgh.inputs["Vector"])
            nt.links.new(t_rgh.outputs["Color"], bsdf.inputs["Roughness"])
        else:
            bsdf.inputs["Roughness"].default_value = 0.86

        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.location = (-160, -240)
        nmap.inputs["Strength"].default_value = nrm_strength
        nt.links.new(t_nrm.outputs["Color"], nmap.inputs["Color"])

        if hgt_img is not None:
            t_hgt = _add_tex_node(nt, hgt_img, (-500, -480))
            nt.links.new(mp.outputs["Vector"], t_hgt.inputs["Vector"])
            bump = nt.nodes.new("ShaderNodeBump")
            bump.location = (20, -280)
            bump.inputs["Strength"].default_value = 0.25
            bump.inputs["Distance"].default_value = 0.0012
            nt.links.new(t_hgt.outputs["Color"], bump.inputs["Height"])
            nt.links.new(nmap.outputs["Normal"], bump.inputs["Normal"])
            nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        else:
            nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])

        bsdf.inputs["Specular IOR Level"].default_value = 0.18
        bsdf.inputs["Sheen Weight"].default_value = 0.95
        bsdf.inputs["Sheen Roughness"].default_value = 0.62
        bsdf.inputs["Sheen Tint"].default_value = (1.0, 0.88, 0.88, 1.0)
        bsdf.inputs["Subsurface Weight"].default_value = 0.06
        bsdf.inputs["Subsurface Scale"].default_value = 0.004
        bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.58, 0.58)

        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        return m

    mats["sweater_body"] = _make_knit_mat(
        "Mat_Sweater_Knit",
        knit_imgs["knit_albedo"],
        knit_imgs["knit_normal"],
        knit_imgs["knit_roughness"],
        knit_imgs["knit_height"],
        uv_scale=(1.0, 1.0),
        nrm_strength=1.08,
    )
    mats["sweater_rib"] = _make_knit_mat(
        "Mat_Sweater_Rib",
        knit_imgs["rib_albedo"],
        knit_imgs["rib_normal"],
        None,
        knit_imgs["rib_height"],
        uv_scale=(1.0, 1.0),
        nrm_strength=1.22,
    )

    mat, nt, out = _new_mat("Mat_Sweater_Fuzz")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (-80, 100)
    bsdf.inputs["Base Color"].default_value = (0.78, 0.49, 0.50, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.82
    bsdf.inputs["Sheen Weight"].default_value = 0.75
    trans = nt.nodes.new("ShaderNodeBsdfTranslucent")
    trans.location = (-80, -160)
    trans.inputs["Color"].default_value = (0.88, 0.61, 0.61, 1.0)
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (220, 0)
    mix.inputs["Fac"].default_value = 0.35
    nt.links.new(bsdf.outputs["BSDF"], mix.inputs[1])
    nt.links.new(trans.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    mats["sweater_fuzz"] = mat

    return mats
