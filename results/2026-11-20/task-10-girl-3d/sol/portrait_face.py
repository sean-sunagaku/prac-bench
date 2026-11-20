"""A continuous hm08 head sculpt, facial shader, eyes, brows, and lashes."""
from math import cos, exp, pi, sin, sqrt

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from portrait_core import (HEAD_ROT, ROOT, TAU, clamp, head_pose, image, material, mesh,
                           native_curves, obj_input, setup_node, smooth, sphere, submesh,
                           subdiv, value_math, wire)


def bell(*axes):
    return exp(-sum(((x - center) / width) ** 2 for x, center, width in axes))


def sculpt(co):
    x, y, z = co
    u = abs(x)
    front = 1 - smooth(-.123, -.072, y)
    tip = front * bell((u, 0, .022), (z, 1.510, .020))
    ala = front * bell((u, .012, .010), (z, 1.503, .009))
    cheek = bell((u, .048, .023), (z, 1.519, .025), (y, -.136, .043))
    mouth = front * bell((z, 1.478, .014), (u, .024, .015))
    jaw = bell((z, 1.453, .031), (y, -.110, .050))
    chin = front * bell((u, 0, .037), (z, 1.438, .017))
    eye = front * bell((u, .032, .025), (z, 1.545, .015))
    side = -1 if x < 0 else 1
    crease = 1.47722 + .00113*min(u/.024,1)**1.8
    closure = .77*bell((z,crease,.0028))*(1-smooth(.023,.031,u))*(1-smooth(-.150,-.140,y))
    z += (crease-z)*closure
    x += side * (-.0028 * jaw + .0038 * cheek - .0026 * ala)
    y += (.0038 * tip + .0021 * ala - .0035 * cheek + .0015 * chin
          - .00145 * eye + .0015 * front * bell((u, .031, .027), (z, 1.566, .008)))
    z += .0067 * chin + .0019 * tip + .0047 * mouth
    z += .0095*front*(1-smooth(1.446,1.556,z))
    z += eye * ((z - 1.5451) * .24 + .0009 * (u - .031) / .018)
    z += front * bell((z, 1.481, .012), (u, .007, .024)) * .00045 * side
    y += .00115*front*bell((u, .027, .0045), (z, 1.481, .0055))
    y -= .00125*front*bell((u, .008, .017), (z, 1.4765, .0049), (y, -.156, .008))
    # Soft temple width and a slightly smaller ear compared with the neutral cage.
    ear = smooth(.070, .086, u) * bell((y, -.040, .026), (z, 1.530, .032))
    x -= side * .0020 * ear
    y -= .004 * ear
    return Vector((x, y, z))


def pigment(co):
    x, y, z = co
    u = abs(x)
    f = 1 - smooth(-.137, -.122, y)
    outer = 1 - smooth(.0235, .029, u)
    upper = 1.4853 + .0025 * bell((u, .009, .005)) - .0087 * (u / .029) ** 2
    lower = 1.4648 + .0118 * (u / .028) ** 2
    lips = f * outer * smooth(lower - .0006, lower + .0023, z) * (1 - smooth(upper - .0008, upper + .0014, z))
    lips *= .48 + .52*(1-smooth(-.156,-.149,y))
    # The deep vermilion stays at the wet inner lip and the visible crease.
    mouth_shadow = f * outer * bell((z, 1.4772 - .0014*(u/.028)**2, .00135))
    cheek = .73 * bell((u, .044, .023), (z, 1.514, .021), (y, -.137, .037))
    eyelid = .68 * bell((u, .032, .018), (z, 1.548, .012), (y, -.143, .012))
    nose = .55 * bell((u, .004, .017), (z, 1.505, .013), (y, -.163, .016))
    ear = .80 * bell((u, .081, .012), (z, 1.531, .027), (y, -.048, .020))
    cavity = bell((u, .0107, .0047), (z, 1.5014, .0038), (y, -.151, .007))
    return (clamp(lips), clamp(cheek + eyelid + nose + ear), clamp(.73 * cavity + .32 * mouth_shadow))


# The UV swatch is a projection of authored pigment fields in rest coordinates.
# Depth gating suppresses the projection on the rear of the ears and the hands.
PAINT_X = (-.079, .079)
PAINT_Z = (1.457, 1.590)
UPPER_RIM = [(.01675, -.1390, 1.5436), (.0201, -.1400, 1.5470), (.0243, -.1410, 1.5493),
             (.0291, -.1410, 1.5502), (.0349, -.1408, 1.5499), (.0388, -.1401, 1.5493),
             (.0421, -.1385, 1.5480), (.0455, -.1360, 1.5468), (.0473, -.1339, 1.5455)]
LOWER_RIM = [(.0182, -.13848, 1.5424), (.0222, -.1387, 1.5412), (.027, -.1399, 1.5402),
             (.031, -.1405, 1.54055), (.036, -.1401, 1.5410), (.0417, -.1383, 1.5430),
             (.0459, -.1348, 1.5445)]


def brow_height(u):
    return 1.5585 + .0085*np.sin(pi*(.12+.83*u)) + .0014*u


def pigment_tile():
    n = 1024
    u = (np.arange(n, dtype=np.float32)+.5)/n
    x, z = np.meshgrid(PAINT_X[0] + (PAINT_X[1]-PAINT_X[0])*u,
                       PAINT_Z[0] + (PAINT_Z[1]-PAINT_Z[0])*u)
    a = np.abs(x)
    guides = np.array(UPPER_RIM)
    upper = np.interp(a, guides[:,0], guides[:,2])
    guides = np.array(LOWER_RIM)
    lower = np.interp(a, guides[:,0], guides[:,2])
    eye_u = np.clip((a-.0165)/.0313,0,1)
    eye_fade = np.maximum(0,np.sin(pi*eye_u))**.58
    rim = .50*np.exp(-((z-upper-.00067)/.00105)**2)*eye_fade*(.41+.59*eye_u)
    shadow = .142*np.exp(-((z-upper-.0037)/.0035)**2)*eye_fade
    shadow += .15*np.exp(-((z-lower+.0020)/.0021)**2)*eye_fade
    brow = np.clip((a-.014)/.047,0,1)
    bw = .0019*(.90+.33*(1-brow))
    brow_fade = np.maximum(0,np.sin(pi*brow))**.61
    brow_tint = .50 * brow_fade * np.exp(-((z-brow_height(brow))/bw)**2)
    rng = np.random.default_rng(41)
    freckles = np.zeros_like(x)
    for sign in (-1,1):
        for _ in range(49):
            cx = sign*rng.uniform(.026,.065)
            cz = rng.uniform(1.508,1.535) - .10*(abs(cx)-.045)
            size = rng.uniform(.00011,.00043)
            tone = rng.uniform(.028,.124)
            freckles += tone*np.exp(-((x-cx)/size)**2 - ((z-cz)/(size*.82))**2)
    freckles += .185*np.exp(-((x+.052)/.00047)**2-((z-1.5196)/.00040)**2)
    fine = (.5+.25*np.sin(6800*x+3770*z)+.21*np.cos(1720*x-4950*z))
    arr = np.ones((n,n,4),dtype=np.float32)
    arr[:,:,0] = np.clip(rim+shadow+brow_tint, 0, 1)
    arr[:,:,1] = np.clip(freckles, 0, 1)
    arr[:,:,2] = fine
    return image("Face • procedural lid shading and tiny freckles • 1024", arr)


def skin_material():
    mat, p = material("Skin • peach, cheek flush and vermilion", (.60, .355, .26), .44)
    p.location = (780, 230)
    mat.node_tree.nodes.get("Material Output").location = (1090, 230)
    p.inputs["Subsurface Weight"].default_value = .115
    p.inputs["Subsurface Radius"].default_value = (1.0, .43, .22)
    p.inputs["Subsurface Scale"].default_value = .007
    p.inputs["IOR"].default_value = 1.43
    p.inputs["Specular IOR Level"].default_value = .32
    p.inputs["Coat Weight"].default_value = .06
    p.inputs["Coat Roughness"].default_value = .31
    attr = setup_node(mat, "ShaderNodeAttribute", "Sculpt-local pigment fields", (-950, 240))
    attr.attribute_name = "Pigment"
    channels = setup_node(mat, "ShaderNodeSeparateColor", "Lips / capillary flush / cavities", (-760, 240))
    wire(mat, attr, "Color", channels, "Color")
    colors = [
        ("Cheeks, lids and ears", "Green", (.608, .358, .265, 1), (.509, .191, .139, 1)),
        ("Vermilion", "Red", None, (.531, .126, .113, 1)),
        ("Nostril and mouth occlusion", "Blue", None, (.121, .033, .024, 1)),
    ]
    previous = None
    for index, (label, channel, a, b) in enumerate(colors):
        n = setup_node(mat, "ShaderNodeMixRGB", label, (-520 + index * 200, 260))
        if a:
            n.inputs[1].default_value = a
        if previous:
            wire(mat, previous, "Color", n, 1)
        n.inputs[2].default_value = b
        wire(mat, channels, channel, n, 0)
        previous = n
    coords = setup_node(mat, "ShaderNodeTexCoord", "Meter-scale detail", (-1000, -190))
    mottle = setup_node(mat, "ShaderNodeTexNoise", "Soft capillary colour variation", (-770, -80))
    mottle.inputs["Scale"].default_value = 122
    mottle.inputs["Detail"].default_value = 3.0
    wire(mat, coords, "Object", mottle, "Vector")
    shade = setup_node(mat, "ShaderNodeMapRange", "Restrained tone modulation", (-550, -30))
    shade.inputs["To Min"].default_value = .94
    shade.inputs["To Max"].default_value = 1.035
    wire(mat, mottle, "Fac", shade, "Value")
    tint = setup_node(mat, "ShaderNodeMixRGB", "Fine tone variation", (100, 240))
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1
    wire(mat, previous, "Color", tint, 1)
    wire(mat, shade, "Result", tint, 2)
    pigment_uv = setup_node(mat, "ShaderNodeUVMap", "Rest-space facial pigment coordinates", (-880, 680))
    pigment_uv.uv_map = "Facial pigment"
    paint = setup_node(mat, "ShaderNodeTexImage", "Authored eyelid shading, brow tint and freckles", (-660, 660))
    paint.image = pigment_tile()
    paint.extension = "EXTEND"
    wire(mat, pigment_uv, "UV", paint, "Vector")
    paint_values = setup_node(mat, "ShaderNodeSeparateColor", "Local makeup and freckles", (-410, 680))
    wire(mat, paint, "Color", paint_values, "Color")
    depth = setup_node(mat, "ShaderNodeAttribute", "Front-facing pigment mask", (-655, 900))
    depth.attribute_name = "Pigment depth"
    paint_col = tint
    for i, (component, color, label) in enumerate([
        ("Red",(.114,.050,.034,1),"Lid margins and brow roots"),
        ("Green",(.205,.068,.038,1),"Tiny subdermal freckles"),
    ]):
        weight = value_math(mat, "MULTIPLY", label, (-155+i*210,670))
        wire(mat, depth, "Fac", weight, 0)
        wire(mat, paint_values, component, weight, 1)
        applied = setup_node(mat, "ShaderNodeMixRGB", label, (300+i*215,455))
        wire(mat, weight, "Value", applied, 0)
        wire(mat, paint_col, "Color", applied, 1)
        applied.inputs[2].default_value = color
        paint_col = applied
    wire(mat, paint_col, "Color", p, "Base Color")
    pore = setup_node(mat, "ShaderNodeTexNoise", "Pore-scale grain", (-770, -405))
    pore.inputs["Scale"].default_value = 2160
    pore.inputs["Detail"].default_value = 2.0
    pore.inputs["Roughness"].default_value = .72
    wire(mat, coords, "Object", pore, "Vector")
    bump = setup_node(mat, "ShaderNodeBump", "Pore relief", (420, -120))
    bump.inputs["Strength"].default_value = .20
    bump.inputs["Distance"].default_value = .00019
    wire(mat, pore, "Fac", bump, "Height")
    lip_vectors = setup_node(mat, "ShaderNodeVectorMath", "Elongated vermilion creases", (-740,-720))
    lip_vectors.operation = "MULTIPLY"
    lip_vectors.inputs[1].default_value = (1.0, 1.22, .145)
    wire(mat, coords, "Object", lip_vectors, 0)
    lip_grain = setup_node(mat, "ShaderNodeTexNoise", "Vertical lip ridges", (-500,-715))
    lip_grain.inputs["Scale"].default_value = 2680
    lip_grain.inputs["Detail"].default_value = 2.1
    wire(mat, lip_vectors, "Vector", lip_grain, "Vector")
    lip_mask = value_math(mat, "MULTIPLY", "Lip ridges only over vermilion", (85,-440), .36)
    wire(mat, channels, "Red", lip_mask, 0)
    lip_bump = setup_node(mat, "ShaderNodeBump", "Wet lip micro-relief", (550,-410))
    lip_bump.inputs["Distance"].default_value = .00018
    wire(mat, lip_mask, "Value", lip_bump, "Strength")
    wire(mat, lip_grain, "Fac", lip_bump, "Height")
    wire(mat, bump, "Normal", lip_bump, "Normal")
    wire(mat, lip_bump, "Normal", p, "Normal")
    rough = setup_node(mat, "ShaderNodeMapRange", "Lip gloss falls off onto skin", (420, 80))
    rough.inputs["To Min"].default_value = .459
    rough.inputs["To Max"].default_value = .30
    wire(mat, channels, "Red", rough, "Value")
    wire(mat, rough, "Result", p, "Roughness")
    return mat


def add_pigment(obj, colors):
    layer = obj.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    layer.data.foreach_set("color", np.asarray([(*c, 1) for c in colors], dtype=np.float32).ravel())


class Face:
    def __init__(self, layer):
        cage, original_faces = obj_input(ROOT / "input/upper-body.obj")
        forms, original_faces = submesh(cage, [f for f in original_faces if
                                                all(cage[i][2] > 1.32 and abs(cage[i][0]) < .135 for i in f)])
        sculpted = [sculpt(p) for p in forms]
        self.skin = skin_material()
        posed = [collared_skin(head_pose(p, head_weight(p))) for p in sculpted]
        def paint_uv(i):
            x, _, z = forms[i]
            return ((x-PAINT_X[0])/(PAINT_X[1]-PAINT_X[0]), (z-PAINT_Z[0])/(PAINT_Z[1]-PAINT_Z[0]))
        obj = mesh("Face, ears and neck • sculpted hm08", posed, original_faces, layer, self.skin,
                   [[paint_uv(i) for i in f] for f in original_faces])
        obj.data.uv_layers[0].name = "Facial pigment"
        depth = obj.data.attributes.new(name="Pigment depth", type="FLOAT", domain="POINT")
        depth.data.foreach_set("value", np.asarray(
            [1 - smooth(-.117,-.087,y) for _,y,_ in forms], dtype=np.float32))
        obj["Source"] = "MakeHuman hm08 (CC0), custom portrait shape"
        add_pigment(obj, [pigment(p) for p in forms])
        key = obj.shape_key_add(name="Portrait sculpt")
        key = obj.shape_key_add(name="Neutral hm08 proportions")
        for k, p in zip(key.data, forms):
            k.co = collared_skin(head_pose(p, head_weight(p)))
        key.value = 0
        subdiv(obj, 2, 2)
        self.obj = obj
        self.bvh = BVHTree.FromPolygons(sculpted, original_faces)

    def front(self, x, z, default=-.130):
        p, _, _, _ = self.bvh.ray_cast(Vector((x, -.27, z)), Vector((0, 1, 0)), .40)
        return p.y if p else default

    def scalp(self, alpha, beta, lift):
        origin = Vector((0, -.057, 1.549))
        d = Vector((.0785 * sin(alpha), -.103 * cos(alpha) * cos(beta),
                    .121 * cos(alpha) * sin(beta)))
        radius = d.length
        unit = d.normalized()
        _, _, _, actual = self.bvh.ray_cast(origin, unit, .2)
        delta = .33 * clamp((actual or radius) - radius, -.006, .008)
        return origin + unit * (radius + delta + lift)


def neck_profile(z):
    center_x = -.016 * smooth(1.355,1.439,z)
    center_y = -.031
    width = .041 + .020*(1-smooth(1.354,1.409,z))
    depth = .012*(1-smooth(1.348,1.389,z))
    return center_x,center_y,width,.050+depth,.054+depth


def collared_skin(co):
    """Blend the nape and throat into a fitted neck opening under the sweater."""
    x, y, z = co
    amount = 1 - smooth(1.416,1.464,z)
    jaw_fade = smooth(1.404,1.437,z)
    amount *= 1 - jaw_fade*(1-smooth(-.121,-.079,y))
    cx,cy,width,front_depth,back_depth = neck_profile(z)
    depth = front_depth if y < cy else back_depth
    m = sqrt(((x-cx)/width)**2+((y-cy)/depth)**2)
    if m > .07:
        x += (cx+(x-cx)/m-x)*amount
        y += (cy+(y-cy)/m-y)*amount
    front = 1-smooth(-.064,-.045,y)
    tendon_center = .023 + (z-1.392)*.27
    y -= .0016*front*bell((abs(x-cx), tendon_center,.008),(z,1.404,.026))
    y += .0010*front*bell((x,cx,.012),(z,1.374,.016))
    return Vector((x,y,z))


def head_weight(co):
    x, y, z = co
    return max(smooth(1.337, 1.461, z),
               smooth(1.388, 1.432, z) * (1 - smooth(-.113, -.068, y)))


def iris_tile():
    grid = (np.arange(640, dtype=np.float32) + .5) / 320 - 1
    x, z = np.meshgrid(grid, grid)
    theta = np.arctan2(z, x)
    r = np.sqrt(x*x + z*z)
    jitter = .09 * np.sin(theta * 7 + 2.3) + .035 * np.sin(theta * 27 + 1.1)
    rings = np.sin(r * 31 + 2.2 * np.sin(theta * 5) + 1.75 * np.sin(theta * 14))
    fibers = .48*np.sin(101 * theta + 2.0*r + 9*jitter) + .22*np.sin(193*theta + 32*r + 24*jitter)
    fibers += .19*np.sin(51*theta - 21*r + 2*np.sin(5*theta + 14*r)) + .11*np.cos(306*theta + 7*r)
    band = np.exp(-((r - .57 - .032*np.sin(12*theta) - .019*np.sin(29*theta)) / .125)**2)
    spokes = (.5+.5*np.cos(38*theta + 14*jitter))**5 * (.63+.37*rings)
    pigment = np.clip(.50 + .17*band + .12*fibers + .09*spokes + .05*rings, 0, 1)
    limbal = np.clip((1-r) / .124, 0, 1)
    pupil_radius = .385 + .008*np.sin(theta*17) + .003*np.cos(theta*29)
    pupil = np.clip((r-pupil_radius)/.022, 0, 1)
    base = np.empty((*r.shape, 4), dtype=np.float32)
    base[:, :, 0] = .008 + pupil*(.031 + .260*pigment**1.55)*(.36+.64*limbal)
    base[:, :, 1] = .005 + pupil*(.010 + .095*pigment**1.73)*(.40+.60*limbal)
    base[:, :, 2] = .004 + pupil*(.005 + .032*pigment**1.60)*(.45+.55*limbal)
    base[:, :, 3] = 1
    return image("Iris • radial collagen and umber pigment • 640", base)


def eye_materials():
    sclera, s = material("Sclera • warm ivory and wet specular", (.68, .60, .53), .22)
    s.inputs["Subsurface Weight"].default_value = .070
    s.inputs["Subsurface Scale"].default_value = .0024
    s.inputs["Coat Weight"].default_value = .28
    s.inputs["Coat Roughness"].default_value = .15
    attr = setup_node(sclera, "ShaderNodeAttribute", "Edge and caruncle tint", (-500, 240))
    attr.attribute_name = "Sclera tint"
    wire(sclera, attr, "Color", s, "Base Color")
    iris, p = material("Iris • layered brown stroma", (.11, .037, .018), .39)
    p.inputs["Specular IOR Level"].default_value = .19
    tile = setup_node(iris, "ShaderNodeTexImage", "Procedural radial fibers and pupil", (-400, 240))
    tile.image = iris_tile()
    tile.extension = "EXTEND"
    wire(iris, tile, "Color", p, "Base Color")
    cornea = bpy.data.materials.new("Cornea • clear optical cap with Fresnel reflection")
    cornea.use_nodes = True
    n = cornea.node_tree.nodes
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    out.location = (540, 80)
    fresnel = setup_node(cornea, "ShaderNodeFresnel", "Corneal IOR", (-390, 190))
    fresnel.inputs["IOR"].default_value = 1.376
    transmit = setup_node(cornea, "ShaderNodeBsdfTransparent", "Clear transmission", (-140, 40))
    reflect = setup_node(cornea, "ShaderNodeBsdfAnisotropic", "Tear film reflection", (-130, -100))
    reflect.inputs["Roughness"].default_value = .077
    reflect.inputs["Color"].default_value = (.60,.61,.62,1)
    blend = setup_node(cornea, "ShaderNodeMixShader", "Fresnel interface", (310, 110))
    wire(cornea, fresnel, "Fac", blend, 0)
    wire(cornea, transmit, 0, blend, 1)
    wire(cornea, reflect, 0, blend, 2)
    wire(cornea, blend, 0, out, "Surface")
    return sclera, iris, cornea


def disk(center, direction, radius, rings, shape, label, layer, mat):
    center, forward = Vector(center), Vector(direction).normalized()
    axis_x = forward.cross(Vector((0, 0, 1))).normalized() * -1
    axis_z = axis_x.cross(forward) * -1
    verts = [head_pose(center + forward * shape(0))]
    uv = [(0.5, 0.5)]
    faces = []
    for i in range(1, rings + 1):
        t = i / rings
        for j in range(96):
            cx, cz = cos(TAU*j/96), sin(TAU*j/96)
            verts.append(head_pose(center + forward*shape(t) + radius*t*(cx*axis_x + cz*axis_z)))
            uv.append((.5 + .5*t*cx, .5 + .5*t*cz))
    for j in range(96):
        k = (j+1) % 96
        faces.append((0, 1+j, 1+k))
        for i in range(rings-1):
            b = 1 + 96*i
            faces.append((b+j, b+96+j, b+96+k, b+k))
    return mesh(label, verts, faces, layer, mat, [[uv[i] for i in f] for f in faces])


def eyeballs(layer, camera):
    sclera, iris, cornea = eye_materials()
    caruncle, tissue = material("Eyes • caruncle mucosa", (.359,.128,.102), .37)
    tissue.inputs["Subsurface Weight"].default_value = .09
    tissue.inputs["Subsurface Scale"].default_value = .002
    inv = HEAD_ROT.inverted()
    for sign, side in [(-1, "R"), (1, "L")]:
        center = Vector((sign*.03155, -.12615, 1.5455))
        ball = sphere(f"Eye.{side} • scleral globe", center, (.01655, .01704, .0161), layer, sclera)
        tint = ball.data.color_attributes.new(name="Sclera tint", type="FLOAT_COLOR", domain="POINT")
        colors = []
        for vertex in ball.data.vertices:
            x, y, z = vertex.co - center
            outer = smooth(.007, .016, abs(x))
            inner = clamp(-x*sign/.015)
            warmth = .33*outer + .18*outer*inner + .12*smooth(-.003, -.011, z)
            colors.append((.545, .515*(1-warmth)+.281*warmth, .478*(1-warmth)+.245*warmth, 1))
            vertex.co = head_pose(vertex.co)
        tint.data.foreach_set("color", np.asarray(colors, dtype=np.float32).ravel())
        to_camera = inv @ (Vector(camera) - head_pose(center))
        to_camera.z += .006
        to_camera.normalize()
        to_camera.x = .78*to_camera.x - sign*.009
        to_camera.normalize()
        rad = .00635
        disk(center, to_camera, rad, 14, lambda t: sqrt(.01730**2 - (rad*t)**2),
             f"Eye.{side} • brown iris and pupil", layer, iris)
        rad = .0080
        disk(center, to_camera, rad, 16,
             lambda t: sqrt(.01732**2 - (rad*t)**2) + .0009*(1-t*t)**2,
             f"Eye.{side} • transparent corneal cap", layer, cornea)
        duct_center = sculpt((sign*.01765, -.13815, 1.5431))
        duct = sphere(f"Eye.{side} • tear duct", duct_center, (.0018,.00108,.00119),
                      layer, caruncle, 24, 16)
        for vertex in duct.data.vertices:
            vertex.co = head_pose(vertex.co)


def eye_details(face, layer):
    rng = np.random.default_rng(1140)
    brow, b = material("Brows • fine warm espresso", (.023, .009, .005), .59)
    lash, l = material("Lashes • dark brown", (.021, .008, .005), .57)
    b.inputs["Anisotropic"].default_value = .35
    l.inputs["Anisotropic"].default_value = .36
    water, w = material("Waterline • muted warm pink", (.368, .129, .101), .29)
    w.inputs["Coat Weight"].default_value = .20
    brows, brow_r, lashes, lash_r, wetlines, wetline_r = [], [], [], [], [], []
    lid_lines, lid_widths = [], []
    for sign in (-1, 1):
        for i in range(480):
            u = rng.random()
            x = .014 + u*.046
            z = brow_height(u)
            spread = (.0016+.0016*(1-u))*sin(pi*(.10+.84*u))**.55
            z += rng.normal(0, spread*.36)
            length = rng.uniform(.0021, .0047)*(1-.42*u)
            rise = rng.uniform(.50, .93)*(1-u) - .31*u
            t = np.linspace(0, 1, 6)
            strand = []
            for a in t:
                sx = sign*(x + length*a*(.48+.48*u))
                sz = z + length*a*rise - .0011*a*a
                y = face.front(sx, sz) - .00022 - .00032*sin(pi*a)
                strand.append(head_pose((sx, y, sz)))
            brows.append(np.asarray(strand))
            brow_r.append(rng.uniform(.000044, .000093)*(1-.94*t**1.25))

        # These control points follow the external upper and lower eyelid margins of the cage.
        rim, lower = UPPER_RIM, LOWER_RIM
        from portrait_core import spline
        for control, count, top in [(rim, 47, True), (lower, 31, False)]:
            pos = spline(control, count)
            l_t = np.linspace(0, 1, count)
            lim = []
            for j, (x,y,z) in enumerate(pos):
                point = sculpt((sign*x, y, z))
                point.y -= .00031
                if top:
                    point.z += .00040
                else:
                    point.z -= .00013
                lim.append(head_pose(point))
                if j in (0, count - 1):
                    continue
                u = j/(count-1)
                length = rng.uniform(.0026, .0069) * (.66+.36*sin(pi*u)) if top else rng.uniform(.0010,.0026)
                t = np.linspace(0, 1, 7)
                dx = sign*length*(u-.18)*.75*t
                dy = -length*(.86*t-.35*t*t)
                dz = length*(-.22*t+1.02*t*t) if top else -length*(.61*t+.21*t*t)
                path = [head_pose((point.x+a, point.y+b, point.z+c)) for a,b,c in zip(dx,dy,dz)]
                lashes.append(np.asarray(path))
                lash_r.append(rng.uniform(.000070,.000122) * (1 - .95*t**1.5))
            if top:
                lid_lines.append(np.asarray(lim))
                lid_widths.append(.00043*np.sin(pi*l_t)**.72+.000028)
            else:
                wetlines.append(np.asarray(lim))
                wetline_r.append(.00028*(.12+.88*np.sin(pi*l_t)**.53))
    native_curves("Brows • individually laid hairs", brows, brow_r, layer, brow)
    native_curves("Lashes • upper and lower margin", lashes, lash_r, layer, lash)
    native_curves("Eyes • upper lash roots", lid_lines, lid_widths, layer, lash)
    native_curves("Eyes • lower tear menisci", wetlines, wetline_r, layer, water)
