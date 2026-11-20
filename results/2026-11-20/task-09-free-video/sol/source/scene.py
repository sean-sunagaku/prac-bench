"""Generate and animate the sets for Seed of Dawn in Blender 5.1."""
import argparse
from math import cos, exp, pi, sin, sqrt, tau
from pathlib import Path
from random import Random
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector

FPS = 24
LAST = 672
WIDTH, HEIGHT = 1920, 816
rng = Random(94713)


def mix(a, b, t):
    return a + (b - a) * t


def ease(start, end, value):
    t = min(1.0, max(0.0, (value - start) / (end - start)))
    return t * t * (3.0 - 2.0 * t)


def rgb(hex_color):
    def linear(channel):
        return channel / 12.92 if channel < 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
    return (*(linear(int(hex_color[i:i + 2], 16) / 255) for i in (0, 2, 4)), 1)


def mesh(name, vertices, faces, material, uv=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    if material:
        data.materials.append(material)
    if smooth:
        for polygon in data.polygons:
            polygon.use_smooth = True
    if uv:
        layer = data.uv_layers.new(name="Surface")
        layer.data.foreach_set("uv", [c for face in faces for i in face for c in uv[i]])
    return obj


def grid_faces(columns, rows):
    return [(i, i + 1, i + columns + 1, i + columns)
            for row in range(rows - 1)
            for col in range(columns - 1)
            for i in (row * columns + col,)]


def surface(name, color, roughness=.42, metal=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = rgb(color)
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metal
    mat.diffuse_color = rgb(color)
    return mat, p


def connect(mat, source, target):
    mat.node_tree.links.new(source, target)


def noise(mat, coord, scale, detail=2, rough=.65):
    n = mat.node_tree.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    connect(mat, coord, n.inputs["Vector"])
    return n.outputs["Fac"]


def math_node(mat, op, a, b=None):
    n = mat.node_tree.nodes.new("ShaderNodeMath")
    n.operation = op
    for i, value in enumerate((a, b)):
        if value is None:
            continue
        if isinstance(value, (int, float)):
            n.inputs[i].default_value = value
        else:
            connect(mat, value, n.inputs[i])
    return n.outputs[0]


def ramp(mat, value, stops):
    n = mat.node_tree.nodes.new("ShaderNodeValToRGB")
    for i, (pos, color) in enumerate(stops):
        elem = n.color_ramp.elements[i] if i < 2 else n.color_ramp.elements.new(pos)
        elem.position, elem.color = pos, rgb(color)
    connect(mat, value, n.inputs["Fac"])
    return n.outputs["Color"]


def color_mix(mat, value, a, b):
    n = mat.node_tree.nodes.new("ShaderNodeMixRGB")
    connect(mat, value, n.inputs[0])
    for index, color in ((1, a), (2, b)):
        if isinstance(color, str):
            n.inputs[index].default_value = rgb(color)
        else:
            connect(mat, color, n.inputs[index])
    return n.outputs[0]


def emission(name, color, power):
    mat, p = surface(name, color, .35, .14)
    p.inputs["Emission Color"].default_value = rgb(color)
    p.inputs["Emission Strength"].default_value = power
    return mat, p.inputs["Emission Strength"]


def imperfections(mat, p, value, strength, distance):
    bump = mat.node_tree.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = distance
    connect(mat, value, bump.inputs["Height"])
    connect(mat, bump.outputs["Normal"], p.inputs["Normal"])


def tube(name, path, width, material, radii=None, resolution=3):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = width
    data.bevel_resolution = resolution
    data.use_fill_caps = True
    spline = data.splines.new("POLY")
    spline.points.add(len(path) - 1)
    spline.points.foreach_set("co", [c for point in path for c in (*point, 1.0)])
    if radii is not None:
        spline.points.foreach_set("radius", list(radii))
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    return obj


def sphere(name, location, dimensions, material, rings=16, segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = dimensions
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent, obj.location = parent, location
    return obj


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def lamp(name, kind, color, energy, location, target=None, size=1.0):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = rgb(color)[:3]
    if kind == "AREA":
        data.shape = "DISK"
        data.size = size
    if kind == "POINT":
        data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    if target:
        aim(obj, target)
    return obj


def ground_height(x, y):
    distort = 1 - exp(-(x*x + y*y) * 1.2)
    return -.04 + distort * (.046 * sin(.79*x + .47*y) + .035 * sin(1.60*y - 1.01*x)
                              + .022 * cos(2.53*x + 1.78*y) + .06 * sin(.16*x - .12*y))


def make_basalt():
    mat, p = surface("Basalt, oxidized fines", "2f3949", .60, .16)
    coords = mat.node_tree.nodes.new("ShaderNodeNewGeometry").outputs["Position"]
    cloud = noise(mat, coords, .71, 5)
    sand = noise(mat, coords, 32, 3)
    dust = noise(mat, coords, 112, 2)
    color = ramp(mat, cloud, [(0.25, "1a202e"), (.80, "656772"), (.53, "333e4b")])
    var = ramp(mat, sand, [(.19, "151a28"), (.85, "555963"), (.52, "303843")])
    color = color_mix(mat, math_node(mat, "MULTIPLY", dust, .72), color, var)
    connect(mat, color, p.inputs["Base Color"])
    rough = math_node(mat, "ADD", math_node(mat, "MULTIPLY", sand, .24), .47)
    connect(mat, rough, p.inputs["Roughness"])
    imperfections(mat, p, sand, .30, .028)
    p.inputs["Coat Weight"].default_value = .12
    p.inputs["Coat Roughness"].default_value = .45
    distance = mat.node_tree.nodes.new("ShaderNodeCameraData").outputs["View Distance"]
    scatter = math_node(mat, "MULTIPLY", distance, .0066)
    scatter.node.use_clamp = True
    color_time = mat.node_tree.nodes.new("ShaderNodeValue")
    air_color = color_mix(mat, color_time.outputs[0], "343951", "a17a6e")
    connect(mat, air_color, p.inputs["Emission Color"])
    connect(mat, scatter, p.inputs["Emission Strength"])
    return mat, color_time.outputs[0]


def terrain(basalt):
    xs = list(np.linspace(-58, 58, 217))
    ys = list(np.linspace(-37, 113, 274))
    mesh("Survey bed", [(x, y, ground_height(x, y)) for y in ys for x in xs],
         grid_faces(len(xs), len(ys)), basalt)
    # Each basalt cluster uses a hand-shaped faceted template, then gets its own orientation.
    shards = []
    for k in range(14):
        sides = rng.randrange(5, 9)
        vertices = []
        theta = [tau * i / sides + rng.uniform(-.18, .18) for i in range(sides)]
        radial = [rng.uniform(.65, 1.25) for _ in theta]
        for height, radius, dx in [(-.33, .76, 0), (.05, 1.0, .05), (.55, .63, .05),
                                   (.74, .37, .13)]:
            for angle, scale in zip(theta, radial):
                vertices.append((radius*cos(angle)*scale + dx, radius*sin(angle)*scale,
                                 height + rng.uniform(-.15, .15)))
        faces = []
        for level in range(3):
            for j in range(sides):
                a, b = level*sides+j, level*sides+(j+1)%sides
                if (j + level) % 3:
                    faces.extend([(a, b, b+sides), (a, b+sides, a+sides)])
                else:
                    faces.append((a, b, b+sides, a+sides))
        faces.append(tuple(range(3*sides, 4*sides)))
        template = mesh(f"Basalt template {k}", vertices, faces, basalt, smooth=False)
        bevel = template.modifiers.new("Broken edges", "BEVEL")
        bevel.width, bevel.segments = .023, 2
        template.hide_render = True
        shards.append(template)
    for i in range(430):
        x, y = rng.uniform(-38, 38), rng.uniform(-9, 62)
        if i < 155:
            x, y = rng.uniform(-9, 9), rng.uniform(-6.0, 9)
        if i < 54:
            x, y = rng.uniform(-2.4, 2.4), rng.uniform(-2.0, 3.2)
        if x*x + y*y < .45:
            continue
        template = rng.choice(shards)
        obj = template.copy()
        obj.hide_render = False
        bpy.context.collection.objects.link(obj)
        size = rng.uniform(.043, .15) if i < 54 else rng.uniform(.095, .72)
        if i > 280 and i % 4 == 0:
            size *= 2.6
        obj.location = (x, y, ground_height(x, y) - size * .11)
        obj.scale = (size * rng.uniform(.54, 1.68), size, size * rng.uniform(.38, 1.01))
        obj.rotation_euler = (rng.uniform(-.4,.4), rng.uniform(-.3,.3), rng.uniform(0,tau))


def mountain_material(name, night, dawn, hue_shift):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    n = mat.node_tree.nodes
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    emit = n.new("ShaderNodeEmission")
    pos = n.new("ShaderNodeNewGeometry").outputs["Position"]
    variation = noise(mat, pos, .23, 4)
    palette = n.new("ShaderNodeValue")
    palette.label = "Dawn"
    dark = color_mix(mat, variation, night[0], night[1])
    bright = color_mix(mat, variation, dawn[0], dawn[1])
    color = color_mix(mat, palette.outputs[0], dark, bright)
    lighting = math_node(mat, "ADD", math_node(mat, "MULTIPLY", variation, .46), .72 + hue_shift)
    connect(mat, color, emit.inputs["Color"])
    connect(mat, lighting, emit.inputs["Strength"])
    connect(mat, emit.outputs[0], out.inputs["Surface"])
    return mat, palette.outputs[0]


def mountain_line(name, y, peaks, mat, seed):
    local = Random(seed)
    coords = np.linspace(-137, 147, 271)
    silhouette = []
    for x in coords:
        height = .32 + sum(h * exp(-abs((x - center) / width) ** 1.6)
                           for center, width, h in peaks)
        height += .32 * sin(x*.43 + seed) + .18 * sin(x*1.3) + local.uniform(-.10,.10)
        silhouette.append(max(.1, height))
    vertices = []
    for ridge in np.linspace(0, 1, 13):
        for x, z in zip(coords, silhouette):
            vertices.append((float(x + 2*sin(ridge*pi)),
                             y + 13*ridge + cos(x*.22)*1.4*ridge,
                             -.14 + z * sin(pi*ridge)**.87
                             + .34 * sin(x*.49 + ridge*6) * sin(pi*ridge)))
    mesh(name, vertices, grid_faces(len(coords), 13), mat, smooth=True)


def sky():
    mat = bpy.data.worlds.new("Air, solar disk and upper atmosphere")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    n.clear()
    vector = n.new("ShaderNodeVectorMath")
    vector.operation = "SCALE"
    vector.inputs["Scale"].default_value = -1.0
    coords = n.new("ShaderNodeTexCoord").outputs["Normal"]
    connect(mat, coords, vector.inputs[0])
    split = n.new("ShaderNodeSeparateXYZ")
    connect(mat, vector.outputs[0], split.inputs[0])
    h = math_node(mat, "MULTIPLY", split.outputs["Z"], 3.05)
    midnight = ramp(mat, h, [(0, "6b677e"), (.90, "101827"), (.26, "2c3652")])
    morning = ramp(mat, h, [(0, "f4b183"), (.92, "647991"), (.22, "9d9bb0"), (.48, "7989a7")])
    twilight = n.new("ShaderNodeValue")
    color = color_mix(mat, twilight.outputs[0], midnight, morning)
    spread = n.new("ShaderNodeVectorMath")
    spread.operation = "MULTIPLY"
    spread.inputs[1].default_value = (1.27, 1.5, 8.9)
    connect(mat, vector.outputs[0], spread.inputs[0])
    cloud = noise(mat, spread.outputs[0], 4.8, 5, .64)
    cloud_form = math_node(mat, "MULTIPLY",
                           math_node(mat, "SUBTRACT", cloud, .53), 2.4)
    cloud_form.node.use_clamp = True
    cloud_color = color_mix(mat, twilight.outputs[0], "373a58", "f0b5a1")
    color = color_mix(mat, math_node(mat, "MULTIPLY", cloud_form, .48), color, cloud_color)
    dot = n.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    connect(mat, vector.outputs[0], dot.inputs[0])
    radius = math_node(mat, "SUBTRACT", 1.0, dot.outputs["Value"])
    aureole = math_node(mat, "EXPONENT", math_node(mat, "MULTIPLY", radius, -46))
    hazy = math_node(mat, "MULTIPLY", math_node(mat, "MULTIPLY", aureole, twilight.outputs[0]), .48)
    color = color_mix(mat, hazy, color, "f6a567")
    inner = math_node(mat, "EXPONENT", math_node(mat, "MULTIPLY", radius, -195))
    color = color_mix(mat, math_node(mat, "MULTIPLY", inner, twilight.outputs[0]), color, "f6bc86")
    edge = math_node(mat, "MULTIPLY", math_node(mat, "SUBTRACT", .000305, radius), 72000)
    edge.node.use_clamp = True
    disk = math_node(mat, "MULTIPLY", edge, twilight.outputs[0])
    color = color_mix(mat, disk, color, "fff1d4")
    emit = n.new("ShaderNodeBackground")
    connect(mat, color, emit.inputs["Color"])
    strength = math_node(mat, "ADD", .70, math_node(mat, "MULTIPLY", disk, 3.2))
    connect(mat, strength, emit.inputs["Strength"])
    connect(mat, emit.outputs[0], n.new("ShaderNodeOutputWorld").inputs["Surface"])
    bpy.context.scene.world = mat
    return twilight.outputs[0], dot.inputs[1]


def make_pod():
    ceramic, p = surface("Celadon shell with charcoal glaze", "26383f", .34, .42)
    coords = ceramic.node_tree.nodes.new("ShaderNodeTexCoord").outputs["UV"]
    mottle = noise(ceramic, coords, 14.3, 5)
    micro = noise(ceramic, coords, 130, 2)
    color = ramp(ceramic, mottle, [(.18, "152631"), (.82, "607b7f"), (.51, "344b53")])
    connect(ceramic, color, p.inputs["Base Color"])
    imperfections(ceramic, p, micro, .22, .023)
    p.inputs["Coat Weight"].default_value = .36
    p.inputs["Coat Roughness"].default_value = .25
    brass, p = surface("Tarnished brass", "ad7141", .32, .74)
    coords = brass.node_tree.nodes.new("ShaderNodeTexCoord").outputs["Generated"]
    mottle = noise(brass, coords, 24, 3)
    connect(brass, ramp(brass, mottle, [(.23,"53332b"),(.81,"e6ae61"),(.54,"946346")]),
            p.inputs["Base Color"])
    imperfections(brass, p, mottle, .17, .015)
    lining, p = surface("Oxidized copper inner shell", "673b2a", .41, .58)
    line, line_power = emission("Light trapped in the shell", "ffa653", .1)
    shell = empty("The seed")
    doors, seams = [], []
    count = 5

    def contour(angle, s, shell_profile=1.0):
        r = .367 * sin(pi * s) ** .72 * (1.13 - .36 * s)
        r = max(.009, r * shell_profile)
        return (r * cos(angle), r * sin(angle), .892*s)

    for k in range(count):
        a, half = tau * k / count + .12, pi / count - .022
        door = empty(f"Pod valve {k+1}", shell, (0,0,.023))
        door.rotation_mode = "QUATERNION"
        doors.append((door, Vector((-sin(a), cos(a), 0))))
        columns, rows = 24, 42
        vertices, uv = [], []
        for row in range(rows):
            s = mix(.023, .994, row / (rows-1))
            for col in range(columns):
                u = col/(columns-1)
                flute = 1.0 + .065 * sin(pi * u) - .018*cos(6*pi*u) * sin(pi*s)
                vertices.append(contour(a + (2*u - 1)*half, s, flute))
                uv.append((u,s))
        panel = mesh(f"Seed plate {k+1}", vertices, grid_faces(columns, rows), ceramic, uv)
        panel.parent = door
        panel.data.materials.append(lining)
        thickness = panel.modifiers.new("Fired ceramic thickness", "SOLIDIFY")
        thickness.thickness = .024
        thickness.material_offset, thickness.material_offset_rim = 1, 1
        for side in (-1, 1):
            path = [contour(a + half * side, s, 1.020) for s in np.linspace(.034, .991, 39)]
            filament = tube("Brass seam", path, .009, brass)
            filament.parent = door
        seam = tube("Backlit seam", [contour(a + pi/count, s, .990)
                    for s in np.linspace(.061,.987,37)], .007, line)
        seam.parent = shell
        seam.data.bevel_factor_mapping_end = "RESOLUTION"
        seams.append(seam)
        for rib in [-.65,-.37,0,.37,.65]:
            path = []
            for s in np.linspace(.18 + abs(rib)*.1, .88 - abs(rib)*.08, 31):
                u = (1 + rib * sin(pi*s)**.65)/2
                flute = 1.004 + .065*sin(pi*u) - .018*cos(6*pi*u)*sin(pi*s)
                path.append(contour(a + (2*u-1)*half, s, flute))
            radii = [.10+.9*sin(pi*i/(len(path)-1))**.7 for i in range(len(path))]
            rib_obj = tube("Etched filament", path, .0025 if rib else .004, brass, radii, 2)
            rib_obj.parent = door
    foot = sphere("Pod ring, underside", (0,0,0), (.121,.121,.071), brass)
    foot.location, foot.parent = (0,0,.06), shell
    socket = sphere("Ceramic seed bed", (0,0,0), (.145,.145,.098), lining)
    socket.location, socket.parent = (0,0,.128), shell
    amber, amber_power = emission("Seed heart", "ffbb71", 2.2)
    nugget = sphere("The seed heart", (0,0,0), (.105,.105,.126), amber)
    nugget.location, nugget.parent = (0,0,.194), shell
    return shell, doors, seams, line_power, amber_power, brass


def petal_material():
    mat, p = surface("Petals, translucent apricot and pearl", "e8b78f", .375, .17)
    nodes = mat.node_tree.nodes
    uv = nodes.new("ShaderNodeTexCoord").outputs["UV"]
    split = nodes.new("ShaderNodeSeparateXYZ")
    connect(mat, uv, split.inputs[0])
    u, v = split.outputs["X"], split.outputs["Y"]
    stain = noise(mat, uv, 6, 3)
    progress = math_node(mat, "ADD", v, math_node(mat, "MULTIPLY", stain, .17))
    tone = ramp(mat, progress, [(0,"3d241f"), (1,"ffe3b3"), (.22,"8e3f30"), (.53,"d57755"), (.82,"efb181")])
    center = math_node(mat, "ABSOLUTE", math_node(mat, "SUBTRACT", u, .5))
    ripple = math_node(mat, "ADD", math_node(mat, "MULTIPLY", center, 90),
                       math_node(mat, "MULTIPLY", v, 14))
    stripes = math_node(mat, "POWER", math_node(mat, "ABSOLUTE", math_node(mat, "SINE", ripple)), 9)
    grain = noise(mat, uv, 90, 3)
    tint = color_mix(mat, math_node(mat, "MULTIPLY", stripes, .16), tone, "fbc792")
    central = math_node(mat, "LESS_THAN", center, .013)
    tint = color_mix(mat, math_node(mat, "MULTIPLY", central, .35), tint, "ed9c64")
    connect(mat, tint, p.inputs["Base Color"])
    connect(mat, tint, p.inputs["Emission Color"])
    p.inputs["Emission Strength"].default_value = .075
    p.inputs["Subsurface Weight"].default_value = .11
    p.inputs["Subsurface Scale"].default_value = .026
    p.inputs["Coat Weight"].default_value = .23
    p.inputs["Coat Roughness"].default_value = .28
    p.inputs["Sheen Weight"].default_value = .2
    imperfections(mat, p, math_node(mat,"ADD",grain,math_node(mat,"MULTIPLY",stripes,.65)), .18, .006)
    sunlit = nodes.new("ShaderNodeBsdfTranslucent")
    connect(mat, tint, sunlit.inputs["Color"])
    layer = nodes.new("ShaderNodeMixShader")
    layer.inputs[0].default_value = .16
    connect(mat, p.outputs[0], layer.inputs[1])
    connect(mat, sunlit.outputs[0], layer.inputs[2])
    connect(mat, layer.outputs[0], nodes.get("Material Output").inputs["Surface"])
    return mat


def petal_shape(azimuth, length, breadth, curl, tier, closed, u, v):
    side = 2*u - 1
    if closed:
        radial = (.099 + .17*sin(pi*v*.96) - .077*v*v) * (1-.21*tier)
        z = (.63-.115*tier) * v
        w = (.16-.027*tier) * sin(pi*v)**.82
        tangent = side*w
        radial += -.057 * side*side * sin(pi*v)
    else:
        radial = .097 + length * v - .13*v**5
        z = (.22+.26*tier)*sin(pi*.89*v) + (.19+.13*tier)*v**2 + curl*v**3
        w = breadth * sin(pi*v)**.79 * (1.04 - .11*v)
        tangent = w*side + .16 * length * v*v
        z += (.19+.038*tier)*side*side*sin(pi*v) + side*.11*curl*v
        z += .028 * sin(v*3*pi+.9*side)*abs(side)**4 * sin(pi*v)
    turn = azimuth + (.19 if closed else .06)*v
    return (radial*cos(turn) - tangent*sin(turn), radial*sin(turn) + tangent*cos(turn), z)


def stem_position(u):
    return (.28*sin(2.3*u)+.21*u*u, .155*sin(5.1*u) - .065*u, .19+2.49*u)


def make_flower(brass):
    leaf, p = surface("Jade stem", "52604e", .40, .37)
    p.inputs["Coat Weight"].default_value = .29
    vein, _ = emission("Gilded vascular ridges", "ad8c58", .15)
    petal = petal_material()
    path = [stem_position(u) for u in np.linspace(0, 1, 100)]
    stem = tube("The growing stem", path, .047, leaf, np.linspace(1.27, .46, len(path)))
    stems = [stem]
    for i in range(4):
        twisted = [(x+.047*(1.26-.8*u)*cos(13*u+i*pi/2),
                    y+.047*(1.26-.8*u)*sin(13*u+i*pi/2), z)
                   for u,(x,y,z) in zip(np.linspace(0,1,len(path)),path)]
        stems.append(tube("Stem ribs", twisted, .0061, vein, np.linspace(1,.51,len(path)), 2))
    for obj in stems:
        obj.data.bevel_factor_mapping_end = "RESOLUTION"
    leaves = []
    for j,(height,a,length) in enumerate([(.23,-.43,.66),(.42,2.82,.92),(.60,.13,.74),(.74,2.87,.48)]):
        parent = empty(f"Stem leaf {j+1}", location=stem_position(height))
        parent.rotation_euler.z = a
        uv, verts = [], []
        columns, rows = 13, 27
        for v in np.linspace(0,1,rows):
            for u in np.linspace(0,1,columns):
                side = 2*u-1
                width = .189 * sin(pi*v)**.91
                verts.append((length*v, width*side + .09*v*v,
                              .38*sin(pi*v*.61) - .15*abs(side)*sin(pi*v) - .032*side*v))
                uv.append((u,v))
        obj = mesh("Speared leaf", verts, grid_faces(columns, rows), leaf, uv)
        obj.parent = parent
        rim = tube("Leaf midrib", [(length*v, .09*v*v,.38*sin(pi*v*.61)+.006)
                                 for v in np.linspace(0,1,34)], .009, vein, np.linspace(1,.10,34))
        rim.parent = parent
        leaves.append((parent,height))
    head = empty("The inflorescence")
    petals = []
    for tier, (count, mean_length, mean_breadth) in enumerate([(9,1.20,.31),(7,.91,.243),(5,.57,.16)]):
        for j in range(count):
            angle = tau*(j+.32*tier)/count
            length = mean_length * rng.uniform(.93, 1.08)
            breadth = mean_breadth * rng.uniform(.90, 1.10)
            curl = rng.uniform(.023,.21)
            cols, rows = 14, 35
            uv = [(u, v) for v in np.linspace(.001,.998,rows) for u in np.linspace(0,1,cols)]
            verts = [petal_shape(angle,length,breadth,curl,tier,True,u,v) for u,v in uv]
            flower_piece = mesh(f"Petal {tier+1}.{j+1}", verts, grid_faces(cols, rows), petal, uv)
            flower_piece.parent = head
            flower_piece.shape_key_add(name="Furled")
            key = flower_piece.shape_key_add(name="Unfurled")
            flat = [c for u,v in uv for c in petal_shape(angle,length,breadth,curl,tier,False,u,v)]
            key.data.foreach_set("co", flat)
            thickness = flower_piece.modifiers.new("Petal cuticle", "SOLIDIFY")
            thickness.thickness = .008
            petals.append((key,tier,j))
    cup = sphere("Scalloped calyx", (0,0,0), (.161,.161,.114), brass)
    cup.location, cup.parent = (0,0,-.017), head
    gold, gold_power = emission("Light in the calyx", "ffba64", 3.9)
    heart = sphere("Luminous disk", (0,0,0), (.115,.115,.067), gold, rings=16, segments=30)
    heart.location, heart.parent = (0,0,.068), head
    for j in range(34):
        a = j * 2.39996323
        r = .055 + .148*sqrt(j/34)
        h = .115 + .14*(r/.20) + rng.uniform(-.020,.032)
        path = [(r*(.33+.67*u)*cos(a+.24*u), r*(.33+.67*u)*sin(a+.24*u),h*u)
                for u in np.linspace(.10,1,11)]
        filament = tube("Stamen", path, .0049, brass, np.linspace(.76,.44,11), 2)
        filament.parent = head
        bead = sphere("Gold anther", (0,0,0), (.017,.012,.018), gold, rings=8, segments=12)
        bead.parent, bead.location = head, path[-1]
    return stems, leaves, head, petals, gold_power, petal, gold


def filament_network(gold, petal):
    root, root_power = emission("Light travelling through stone", "ffaa62", 5.3)
    minor, minor_power = emission("Hairline branches", "d7783b", 2.1)
    paths, satellites = [], []
    for i in range(17):
        # Deliberately asymmetric. The bright branches lead to blooms on the right.
        a = .23 + i * (pi-.03)/16
        radius = rng.uniform(14,43)
        if i % 5 == 0:
            radius *= .55
        phase = rng.uniform(0, tau)
        offset = rng.uniform(.27, .54)

        def root_position(u, da=0, dr=0):
            direction = a + .13*sin(u*3.8 + phase) + .05*sin(u*11 + phase) + da
            r = offset + radius*u + dr
            x, y = r*cos(direction), r*sin(direction) + .55*u
            return (x,y,ground_height(x,y)+.039)

        positions = [root_position(u) for u in np.linspace(0,1,98)]
        obj = tube("Heartwood root", positions, rng.uniform(.007,.0115), root,
                   np.linspace(1.33, .56, len(positions)), 2)
        obj.data.bevel_factor_mapping_end = "RESOLUTION"
        paths.append((obj, 463+i%6*4, 549+radius*1.78))
        for j in range(4):
            v = (j+1)*.172 + rng.uniform(-.063,.046)
            sign = -1 if (i+j)%2 else 1
            pos = [root_position(v+.122*u, sign*(.16+.126*j/5)*u, u*.68)
                   for u in np.linspace(0,1,29)]
            small = tube("Branch remnant", pos, .0064, minor, np.linspace(.89,.09,29), 1)
            small.data.bevel_factor_mapping_end = "RESOLUTION"
            paths.append((small, 475+v*77+i%6*4, 510+v*104+i%6*5))
        x,y,_ = positions[-1]
        size = rng.uniform(.54, 1.14)
        obj = empty("Responding flower", location=(x,y,ground_height(x,y)))
        obj.rotation_euler.z = rng.uniform(0,tau)
        h = 1.64
        child = tube("Second stem", [(0,0,0),(.076,.012,.52),(.14,.044,1.08),(.23,0,h)], .029, minor)
        child.parent = obj
        for j in range(7):
            azimuth = j*tau/7
            uv = [(u,v) for v in np.linspace(.001,.999,19) for u in np.linspace(0,1,9)]
            verts = [petal_shape(azimuth,.68,.208,.11,0,False,u,v) for u,v in uv]
            child = mesh("Second flower petal", verts, grid_faces(9,19), petal, uv)
            child.parent, child.location = obj, (.23,0,h)
        child = sphere("Second light", (0,0,0), (.090,.090,.065), gold, rings=10, segments=14)
        child.parent, child.location = obj, (.23,0,h+.09)
        satellites.append((obj, int(533+radius*1.66), size))
    for i in range(12):
        a = tau*i/12
        radius = rng.uniform(.43,1.86)
        positions = []
        for u in np.linspace(0,1,44):
            theta = a + .34*sin(u*3.3+i)
            r = .15 + radius*u
            x,y = r*cos(theta),r*sin(theta)
            positions.append((x,y,ground_height(x,y)+.041))
        obj = tube("Root at the seed", positions, .0068, root, np.linspace(1.19,.12,len(positions)), 2)
        obj.data.bevel_factor_mapping_end = "RESOLUTION"
        paths.append((obj, 194+(i%4)*6, 241+(i%5)*6))
    return paths, satellites, root_power, minor_power


class Flecks:
    offsets = np.array(((.94,0,-.4),(-.63,0,-.55),(.04,.72,.45),(.04,-.55,.39)), dtype=np.float32)

    def __init__(self, material, count, label):
        self.count = count
        self.rng = np.random.default_rng(479103 + count)
        self.rand = self.rng.random((count, 7), dtype=np.float32)
        faces = [tuple(i*4+corner for corner in side) for i in range(count)
                 for side in ((0,2,1),(0,1,3),(1,2,3),(2,0,3))]
        self.obj = mesh(label, [(0,0,0)]*(count*4), faces, material, smooth=False)

    def put(self, x, y, z, radii):
        centers = np.stack((x,y,z), axis=1).astype("f")
        vertices = centers[:,None,:] + self.offsets[None,:,:]*radii[:,None,None]
        self.obj.data.vertices.foreach_set("co", vertices.ravel())
        self.obj.data.update()


def compositor(scene):
    tree = bpy.data.node_groups.new("Light halation", "CompositorNodeTree")
    tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    scene.compositing_node_group = tree
    render = tree.nodes.new("CompositorNodeRLayers")
    fade = tree.nodes.new("CompositorNodeGlare")
    fade.inputs["Type"].default_value = "Fog Glow"
    fade.inputs["Quality"].default_value = "Medium"
    fade.inputs["Threshold"].default_value = 1.55
    fade.inputs["Strength"].default_value = .62
    fade.inputs["Size"].default_value = .43
    output = tree.nodes.new("NodeGroupOutput")
    tree.links.new(render.outputs["Image"], fade.inputs["Image"])
    tree.links.new(fade.outputs["Image"], output.inputs["Image"])


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, LAST
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.compression = 12
    scene.render.use_persistent_data = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = .19
    scene.eevee.shadow_ray_count = 2
    scene.eevee.shadow_step_count = 5
    scene.eevee.use_bokeh_jittered = False

    basalt, atmospheric_color = make_basalt()
    terrain(basalt)
    mountain_levels = []
    for params in [
        ("Far range", 101, [(-68,20,3.9),(-33,15,5),(5,23,4.6),(46,15,4.3),(83,16,4.9)],
         ("2a334d","424760"), ("73788b","aa908e"), .05, 10),
        ("Middle range", 75, [(-47,14,5.1),(-22,8,3.1),(27,12,2.5),(54,11,4.8)],
         ("1c263b","353b51"), ("56536a","7e6670"), -.05, 19),
        ("Near ridge", 56, [(-30,14,2.9),(-19,9,2.0),(54,16,2.8),(78,9,5.2)],
         ("141e2e","252f46"), ("363a51","5c4956"), -.15, 36),
    ]:
        name, y, peaks, night, dawn, variance, seed = params
        material, light_level = mountain_material(name, night, dawn, variance)
        mountain_levels.append(light_level)
        mountain_line(name,y,peaks,material,seed)
    twilight, solar = sky()
    shell, doors, seams, seam_power, amber_power, brass = make_pod()
    stems, leaves, head, petals, core_power, petal, gold = make_flower(brass)
    roots, satellites, root_power, minor_power = filament_network(gold, petal)
    key = lamp("Overcast key", "AREA", "bfd4ff", 1140, (-4.7,-4.2,7.5), (0,0,1), 8.5)
    rim = lamp("Night rim", "AREA", "bfd6ff", 1850, (3.2,4.7,5.4), (0,0,1), 6)
    strip = lamp("Pale far edge", "AREA", "eae6ff", 210, (0,-2.8,2.0), (0,0,.5), 2.9)
    bounce_light = lamp("Light across the valley", "SUN", "ffd0a6", 0, (0,0,5))
    bounce_light.rotation_euler = Vector((-.52,-.59,-.41)).to_track_quat("-Z","Y").to_euler()
    bounce_light.data.angle = .31
    bounce_light.data.use_shadow = False
    sun = lamp("Dawn sunlight", "SUN", "ffe2bb", 0, (0,0,5))
    sun.data.angle = .044
    sun.data.shadow_cascade_max_distance = 124
    fire = lamp("Light in soil", "POINT", "ffaa60", 0, (0,0,.24), size=.12)
    crown = lamp("Reflected heart light", "POINT", "ffc583", 0, (0,0,0), size=.20)
    dust_mat, _ = surface("Lava grit", "44434a", .82)
    dust = Flecks(dust_mat, 340, "Impact ejecta")
    sparks_mat, spark_power = emission("Pollen under sunlight", "ffbb6c", 1.3)
    motes = Flecks(sparks_mat, 267, "Free pollen")
    sky_mat, star_power = emission("Stars", "cfdcff", .26)
    star_rng = Random(624)
    star_verts, star_faces = [], []
    for i in range(270):
        a = star_rng.uniform(-.91,.91)
        elevation = star_rng.uniform(.013,.42)
        x,y,z = 128*sin(a),128*cos(a),128*elevation
        if x*x+y*y+z*z > 155*155:
            continue
        r = star_rng.uniform(.027,.126)
        idx = len(star_verts)
        star_verts.extend([(x-r,y,z),(x,y,z+r),(x+r,y,z),(x,y,z-r)])
        star_faces.append((idx,idx+1,idx+2,idx+3))
    stars = mesh("Fading stars", star_verts, star_faces, sky_mat, smooth=False)
    camera_data = bpy.data.cameras.new("Cinemascope lens")
    camera_data.clip_end, camera_data.lens = 240, 55
    camera_data.dof.use_dof = True
    camera = bpy.data.objects.new("Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    compositor(scene)

    def pose(active_scene, _depsgraph=None):
        f = active_scene.frame_current
        time = (f-1)/FPS
        dawn = ease(465,598,f)
        daylight = .08*ease(389,465,f) + .92*dawn
        sunrise = Vector((.243,.967,mix(-.039,.056,ease(484,635,f)))).normalized()
        twilight.default_value = daylight
        solar.default_value = sunrise
        sun.rotation_euler = (-sunrise).to_track_quat("-Z","Y").to_euler()
        sun.data.energy = 2.7*daylight
        bounce_light.data.energy = .55*daylight
        atmospheric_color.default_value = daylight
        for value in mountain_levels:
            value.default_value = daylight
        stars.hide_render = f<464 or f>566
        star_power.default_value = .84 * (1-dawn)
        key.data.energy = mix(1140,810,dawn)
        rim.data.energy = mix(1850,1130,dawn)
        strip.data.energy = mix(260,380,dawn)
        charge = ease(142,205,f)
        seam_power.default_value = mix(.075,8.6,charge)*(1-.84*ease(202,266,f))
        amber_power.default_value = mix(.32,4.3,charge)
        fire.data.energy = 8 + 45*charge - 24*ease(306,466,f)
        fire.location.z = .27
        if f <= 83:
            progress = ease(1,83,f)
            slip = min(1, max(0,(f-58)/25))
            z = 2.83 - 1.34 * progress - 1.518 * slip**2.15
            shell.location = (.18*(1-progress), .06*(1-progress), z)
            shell.rotation_euler = (.15 + .47*progress,-.14+.19*progress,.12+1.22*progress)
        else:
            dt = (f-83)/FPS
            bounce = .17*abs(sin(dt*13.1))*exp(-3.75*dt)
            shell.location = (.08*sin(dt*5)*exp(-1.9*dt), 0,-.028+bounce)
            shell.rotation_euler = (.64*cos(dt*5.6)*exp(-2.55*dt),
                                    .29*sin(dt*6)*exp(-2.3*dt),1.34)
        for i,(door,axis) in enumerate(doors):
            amount = ease(169+i*3,245+i*3,f)
            door.rotation_quaternion = Quaternion(axis, amount*(1.08 + .09*cos(i*3.3)))
        for i, seam in enumerate(seams):
            retreat = ease(180+i*4,243+i*4,f)
            seam.data.bevel_factor_end = max(.0001,1-retreat)
            seam.hide_render = retreat > .998
        growth = ease(225,352,f)
        for obj in stems:
            obj.data.bevel_factor_end = max(.0001,growth)
            obj.hide_render = f<226
        for obj, h in leaves:
            active = max(.0001,ease(0, .22, growth-h))
            obj.scale = (active,active,active)
            obj.hide_render = active<.001
        head.location = stem_position(growth)
        head.rotation_euler = (.235 + .043*sin(time*1.7), -.123 + .045*sin(time*1.32), time*.047)
        appear = max(.001,ease(222,276,f))
        head.scale = (appear,appear,appear)
        for keyblock,tier,j in petals:
            opening = 322 + tier*19 + (j*7)%31
            progress = ease(opening, opening+91-tier*8, f)
            keyblock.value = progress
        crown.location = Vector(head.location) + Vector((0,-.16,.33))
        crown.data.energy = 102*ease(341,458,f)
        core_power.default_value = 2.1 + 6.3*ease(364,463,f) - 3.0*dawn
        root_power.default_value = 1.8 + 1.7*ease(448,528,f) - 1.2*ease(607,660,f)
        minor_power.default_value = 1.1 + .6*daylight
        for obj,start,finish in roots:
            obj.data.bevel_factor_end = max(.0001,ease(start,finish,f))
            obj.hide_render = f < start
        for obj,start,size in satellites:
            progress = max(.001,size*ease(start,start+58,f))
            obj.scale = (progress,progress,progress)
            obj.hide_render = progress < .002

        dust.obj.hide_render = not 83<f<143
        if not dust.obj.hide_render:
            r = dust.rand
            dt = (f-83)/FPS
            speed = (r[:,0]+.19)*1.83
            distance = .13 + speed*(1-np.exp(-2.13*dt))
            a = r[:,1]*tau + .12
            x = distance*np.cos(a)
            y = distance*np.sin(a)
            z = np.maximum(-.012, .023+dt*(r[:,2]+.18)*1.86-1.73*dt*dt)
            dust.put(x, y, z, (.0018+.014*r[:,3]**3)*(1-ease(111+r[:,0].mean()*11,142,f)))
        motes.obj.hide_render = f<247
        if not motes.obj.hide_render:
            r = motes.rand
            wide = ease(452,520,f)
            a = r[:,0]*tau + time*(.25 + .84*r[:,1])
            rho = (.15+.95*r[:,2]**1.8) * (1+15*wide*r[:,5]**3)
            xx = head.location.x + np.cos(a)*rho
            yy = head.location.y + np.sin(a)*rho + wide*(15*r[:,6]**2)
            zz = (.41+r[:,4]*3.75 + .22*np.sin(time*(1.1+r[:,3])+r[:,0]*tau)) * (.47+.53*growth)
            awake = (r[:,5] < ease(246,429,f)).astype("f")
            radii = (.004 + .016*r[:,3]**4) * awake * (.42+.58*np.sin(time*2.3+r[:,4]*12)**2)
            motes.put(xx,yy,zz,radii*(1+.38*wide))
            spark_power.default_value = mix(.98,2.5,ease(352,484,f))

        if f < 77:
            k = ease(1,76,f)
            camera.location = (mix(2.34,1.39,k),mix(-4.96,-4.16,k),shell.location.z+1.00+.15*k)
            target = (-.10,.04,shell.location.z+.40)
            focus = (.01,0,shell.location.z+.44)
            lens,aperture = 60,2.7
        elif f < 133:
            k = ease(77,132,f)
            recoil = .026*sin((f-83)*1.21)*exp(-.18*abs(f-83)) if f>83 else 0
            camera.location = (mix(1.24,1.57,k),mix(-3.72,-3.27,k),.32+recoil+.19*k)
            target = (.10,0,.466)
            focus = (0,0,.39)
            lens,aperture = mix(51,50,k),3.6
        elif f < 224:
            k = ease(133,223,f)
            camera.location = (mix(-1.16,-1.83,k),mix(-2.84,-2.46,k),mix(2.02,1.86,k))
            target = (.03,0,mix(.49,.31,k))
            focus = (-.03,-.04,mix(.44,.27,k))
            lens,aperture = mix(52,47,k),4.2
        elif f < 341:
            k = ease(224,340,f)
            camera.location = (mix(-3.87,-3.83,k),mix(-5.57,-5.26,k),mix(1.25,2.39,k))
            target = (.07,0,mix(.62,2.26,growth))
            focus = (.20,0,mix(.40,2.08,growth))
            lens,aperture = mix(46,42,k),4.5
        elif f < 466:
            k = ease(341,465,f)
            camera.location = (mix(.92,2.78,k),mix(-5.26,-4.66,k),mix(4.52,5.15,k))
            target = (.34,-.06,mix(2.96,3.05,k))
            focus = (.39,-.07,mix(2.70,2.97,k))
            lens,aperture = mix(46,44,k),4.2
        else:
            k = ease(466,672,f)
            camera.location = (mix(2.85,4.1,k),mix(-13.4,-21.5,k),mix(2.83,4.65,k))
            target = (mix(2.32,2.70,k),mix(5.8,6.7,k),mix(1.34,2.60,k))
            focus = (.28,0,2.46)
            lens,aperture = mix(42,43,k),10.0
        camera_data.lens = lens
        camera_data.dof.aperture_fstop = aperture
        camera_data.dof.focus_distance = (Vector(focus)-camera.location).length
        aim(camera, target)

    bpy.app.handlers.frame_change_pre.append(pose)
    return scene


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("--stills", nargs="+", type=int)
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=LAST)
    parser.add_argument("--scale", type=int, default=100)
    parser.add_argument("--samples", type=int, default=18)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    args.output.mkdir(parents=True,exist_ok=True)
    scene = build()
    scene.render.resolution_percentage = args.scale
    scene.eevee.taa_render_samples = args.samples
    if args.stills:
        for frame in args.stills:
            scene.frame_set(frame)
            scene.render.filepath = str(args.output / f"{frame:04d}.png")
            bpy.ops.render.render(write_still=True)
    else:
        scene.frame_start, scene.frame_end = args.start, args.end
        scene.frame_set(args.start)
        scene.render.filepath = str(args.output) + "/"
        bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    main()
