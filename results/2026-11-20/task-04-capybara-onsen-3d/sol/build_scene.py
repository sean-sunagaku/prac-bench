import argparse
import math
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree
from mathutils.noise import noise_vector


TAU = math.tau
Z = Vector((0, 0, 1))
RNG = random.Random(1812)
WATER_Z = 0.335
POOL = Vector((-0.015, -0.102, 0))


def color(hex_code):
    srgb = [int(hex_code[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in srgb)


def mix(a, b, amount):
    return tuple(x + (y - x) * amount for x, y in zip(a, b))


def limit(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def noise(point, scale, offset=0):
    p = Vector(point) * scale + Vector((offset, offset * 0.23, 0.17))
    return noise_vector(p, noise_basis='PERLIN_NEW')[0]


def signed_power(value, exponent):
    return math.copysign(abs(value) ** exponent, value)


def material(name, shade, roughness=0.52, *, baked=False, grain=None,
             alpha=1.0, transmission=0.0, emission=0.0, metal=0.0,
             subsurface=0.0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color(shade), alpha)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = result.diffuse_color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["IOR"].default_value = 1.46
    shader.inputs["Alpha"].default_value = alpha
    shader.inputs["Transmission Weight"].default_value = transmission
    shader.inputs["Subsurface Weight"].default_value = subsurface
    shader.inputs["Subsurface Radius"].default_value = (1.0, 0.47, 0.24)
    shader.inputs["Subsurface Scale"].default_value = 0.035
    if baked:
        pigment = nodes.new("ShaderNodeVertexColor")
        pigment.layer_name = "Pigment"
        pigment.label = "Procedural pigment, stored on the mesh"
        pigment.location = (-405, 185)
        links.new(pigment.outputs["Color"], shader.inputs["Base Color"])
    if grain:
        texture = nodes.new("ShaderNodeTexNoise")
        texture.inputs["Scale"].default_value = grain[0]
        texture.inputs["Detail"].default_value = 2.0
        texture.location = (-610, -100)
        coordinates = nodes.new("ShaderNodeTexCoord")
        coordinates.location = (-830, -100)
        links.new(coordinates.outputs["Object"], texture.inputs["Vector"])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = grain[1]
        bump.inputs["Distance"].default_value = grain[2]
        bump.location = (-190, -100)
        links.new(texture.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    if alpha < 1:
        result.surface_render_method = 'DITHERED'
    if emission:
        shader.inputs["Emission Color"].default_value = (*color(shade), 1)
        shader.inputs["Emission Strength"].default_value = emission
    return result


def collection(name, parent):
    result = bpy.data.collections.new(name)
    parent.children.link(result)
    return result


def mesh(name, vertices, faces, mat, group, *, shades=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    if mat:
        data.materials.append(mat)
    if shades is not None:
        pigment_mesh(data, shades)
    for polygon in data.polygons:
        polygon.use_smooth = smooth
    return obj


def pigment_mesh(data, shades):
    pigments = data.color_attributes.new(name="Pigment", type='FLOAT_COLOR', domain='POINT')
    pigments.data.foreach_set("color", [v for shade in shades for v in (*shade, 1.0)])
    data.color_attributes.active_color = pigments


def ring_faces(count, sides, *, bottom=False, top=False, reverse=False):
    faces = []
    if bottom:
        faces.append(tuple(reversed(range(sides))))
    for i in range(count - 1):
        for j in range(sides):
            nxt = (j + 1) % sides
            faces.append((i * sides + j, i * sides + nxt,
                          (i + 1) * sides + nxt, (i + 1) * sides + j))
    if top:
        faces.append(tuple(range((count - 1) * sides, count * sides)))
    return [tuple(reversed(f)) for f in faces] if reverse else faces


def ellipsoid(name, center, axes, mat, group, *, n=24, m=12, power=2.0,
              rotation=None, shade=None, deform=None):
    center = Vector(center)
    points = []
    shades = []
    for i in range(1, m):
        lat = -math.pi / 2 + math.pi * i / m
        for j in range(n):
            lng = TAU * j / n
            direction = Vector((
                signed_power(math.cos(lat), 2 / power) * signed_power(math.cos(lng), 2 / power),
                signed_power(math.cos(lat), 2 / power) * signed_power(math.sin(lng), 2 / power),
                signed_power(math.sin(lat), 2 / power),
            ))
            local = Vector(tuple(a * d for a, d in zip(axes, direction)))
            if deform:
                local = deform(local, direction)
            points.append(center + (rotation @ local if rotation else local))
            if shade:
                shades.append(shade(points[-1], direction))
    for sign in (-1, 1):
        local = Vector((0, 0, axes[2] * sign))
        if deform:
            local = deform(local, Vector((0, 0, sign)))
        points.append(center + (rotation @ local if rotation else local))
        if shade:
            shades.append(shade(points[-1], Vector((0, 0, sign))))
    faces = ring_faces(m - 1, n)
    last_ring = (m - 2) * n
    for j in range(n):
        nxt = (j + 1) % n
        faces += [(len(points) - 2, nxt, j), (len(points) - 1, last_ring + j, last_ring + nxt)]
    return mesh(name, points, faces, mat, group, shades=shades or None)


def bezier(points, steps=12):
    a, b, c, d = [Vector(p) for p in points]
    return [a * (1 - t)**3 + b * (3 * (1 - t)**2 * t) +
            c * (3 * (1 - t) * t * t) + d * t**3 for t in (i / steps for i in range(steps + 1))]


def tube(name, path, radii, mat, group, *, sides=9, profile=None,
         shade=None, loop=False):
    path = list(map(Vector, path))
    radii = [radii] * len(path) if isinstance(radii, (float, int)) else radii
    points = []
    shades = []
    tangent = (path[1] - path[0]).normalized()
    ref = Vector((1, 0, 0)) if abs(tangent.x) < 0.92 else Vector((0, 1, 0))
    previous = (ref - tangent * ref.dot(tangent)).normalized()
    for i, (center, radius) in enumerate(zip(path, radii)):
        prev = path[(i - 1) % len(path)] if loop else path[max(0, i - 1)]
        nxt = path[(i + 1) % len(path)] if loop else path[min(len(path) - 1, i + 1)]
        direction = (nxt - prev).normalized()
        cross = (previous - direction * previous.dot(direction)).normalized()
        other = direction.cross(cross)
        previous = cross
        for j in range(sides):
            a = TAU * j / sides
            scale = profile(i, a) if profile else 1.0
            point = center + radius * scale * (math.cos(a) * cross + math.sin(a) * other)
            points.append(point)
            if shade:
                shades.append(shade(point, i, a))
    faces = ring_faces(len(path), sides, bottom=not loop, top=not loop)
    if loop:
        end = (len(path) - 1) * sides
        for j in range(sides):
            nxt = (j + 1) % sides
            faces.append((end + j, end + nxt, nxt, j))
    return mesh(name, points, faces, mat, group, shades=shades or None)


def lathe(name, center, profile, sides, mat, group, *, phase=0.0, shade=None):
    x, y, z = center
    points = []
    shades = []
    for height, radius in profile:
        for j in range(sides):
            a = phase + TAU * j / sides
            point = (x + radius * math.cos(a), y + radius * math.sin(a), z + height)
            points.append(point)
            if shade:
                shades.append(shade(point, height, a))
    return mesh(name, points, ring_faces(len(profile), sides, bottom=True, top=True),
                mat, group, shades=shades or None)


def leaf(name, start, end, width, mat, group, *, cup=0.012):
    start, end = Vector(start), Vector(end)
    direction = end - start
    cross = direction.cross(Z).normalized() * width
    points = [start]
    for t in (0.22, 0.50, 0.76):
        crest = start.lerp(end, t)
        spread = math.sin(math.pi * t)
        points.extend([crest - cross * spread, crest + Z * cup * spread, crest + cross * spread])
    points.append(end)
    faces = [(0, 2, 1), (0, 3, 2)]
    for i in (1, 4):
        faces.extend([(i, i + 1, i + 4, i + 3), (i + 1, i + 2, i + 5, i + 4)])
    faces.extend([(7, 8, 10), (8, 9, 10)])
    return mesh(name, points, faces, mat, group)


def coast(angle):
    ripple = 1 + 0.036 * math.sin(3 * angle + 0.45) + 0.022 * math.sin(5 * angle - 1.4)
    return POOL + Vector((0.663 * ripple * math.cos(angle), 0.581 * ripple * math.sin(angle), 0))


def outline(angle, rx=0.96, ry=0.94, organic=True):
    c, s = math.cos(angle), math.sin(angle)
    radius = (abs(c) ** 5.5 + abs(s) ** 5.5) ** (-1 / 5.5)
    variation = 1 + (0.012 * math.cos(3 * angle + 0.6) + 0.008 * math.sin(7 * angle) if organic else 0)
    return Vector((rx * c * radius * variation, ry * s * radius * variation, 0))


def snow_color(point, amount=0.5):
    return mix(color("AAC5D3"), color("FEF9EC"), limit(amount + 0.12 * noise(point, 17, 3)))


def stone_color(point, tone=0.5):
    bands = 0.13 * math.sin(97 * point[2] + 19 * point[0] + 4 * noise(point, 8, 7))
    grain = 0.23 * noise(point, 19, 4) + 0.06 * noise(point, 94, 2)
    return mix(color("263942"), color("A0988E"), limit(tone + bands + grain))


def foundation(groups, mats):
    group = groups["terrain"]
    points = []
    shades = []
    bands = [(0, 0.89, 0.31), (0.019, 0.954, 0.37), (0.044, 0.99, 0.48),
             (0.071, 1, 0.39), (0.086, 1, 0.28), (0.103, 0.999, 0.50),
             (0.13, 0.99, 0.42), (0.17, 0.976, 0.44), (0.192, 0.945, 0.53)]
    for z, scale, tone in bands:
        for i in range(96):
            a = TAU * i / 96
            v = outline(a, organic=z > 0) * scale
            v.z = z + min(z, 0.011) * (math.sin(4 * a + 3 * z) * 0.51 + math.cos(13 * a) * 0.26)
            if z == 0:
                v.z = 0
            points.append(v)
            fleck = 0.18 * noise(v, 37, 4) + 0.07 * math.cos(v.x * 68 + v.y * 32)
            shades.append(mix(color("202C3D"), color("887F72"), limit(tone + fleck)))
    mesh("Chamfered slate and earth plinth", points, ring_faces(len(bands), 96, bottom=True, top=True),
         mats["slate"], group, shades=shades)

    points = []
    shades = []
    levels = [(-0.03, 0.22), (0.06, 0.25), (0.22, 0.287), (0.43, 0.281), (0.65, 0.268),
              (0.83, 0.253), (0.97, 0.237), (1.015, 0.218), (1.008, 0.197), (0.987, 0.176)]
    for j, (t, z) in enumerate(levels):
        for i in range(96):
            a = TAU * i / 96
            start, end = coast(a), outline(a, 0.938, 0.924)
            v = start.lerp(end, t)
            drift = max(0, math.sin(a + 0.2)) * 0.040
            drift += 0.028 * math.sin(3 * a - 0.3) + 0.019 * math.cos(8 * a + t * 1.8)
            taper = min(1.0, 5.5 * max(0.2, 1 - abs(2 * t - 0.90)))
            v.z = z + (drift + noise((v.x, v.y, 0.6), 7, 5) * 0.017) * taper * (0.47 if j > 6 else 1.0)
            points.append(v)
            shades.append(snow_color(v, 0.86 - max(0, j - 5) * 0.115))
    mesh("Continuous snowbank with a rolled edge", points,
         ring_faces(len(levels), 96, reverse=True), mats["snow"], group, shades=shades)

    points = []
    shades = []
    levels = [(0.012, 0.152), (0.36, 0.153), (0.70, 0.159), (0.87, 0.179),
              (0.96, 0.203), (1.02, 0.257), (1.04, 0.35)]
    for ratio, z in levels:
        for j in range(96):
            a = TAU * j / 96
            point = POOL.lerp(coast(a), ratio)
            point.z = z + noise(point, 14, 4) * 0.011 + math.sin(5 * a) * 0.004
            points.append(point)
            shades.append(stone_color(point, 0.49 + 0.10 * math.sin(a + 0.3) + 0.09 * (1 - ratio)))
    mesh("Shallow stone basin, beneath the water", points, ring_faces(len(levels), 96, bottom=True, reverse=True),
         mats["slate"], group, shades=shades)


def snow_drift(name, center, axes, mat, group, *, yaw=0, seed=1, fine=True):
    rotation = Quaternion(Z, yaw)

    def profile(local, direction):
        wobble = noise(local + Vector((seed, 0.7, 0.22)), 13, 3)
        local.x *= 1 + 0.14 * wobble
        local.y *= 1 + 0.14 * wobble
        local.z *= 1 + 0.17 * wobble
        return local

    return ellipsoid(name, center, axes, mat, group, n=16 if fine else 13, m=8 if fine else 7,
                     power=2.3, rotation=rotation,
                     shade=lambda p, d: snow_color(p, 0.70 + 0.22 * d.z), deform=profile)


def boulder(name, center, axes, yaw, seed, covered, groups, mats):
    center = Vector(center)
    rotation = Quaternion(Z, yaw)
    sides = 20
    phase = random.Random(seed).uniform(0, TAU)

    def surface(a, h):
        r = (1 - abs(h) ** 2.6) ** 0.43
        wobble = 1 + 0.13 * math.sin(3 * a + phase) + 0.07 * math.cos(5 * a - h * 1.3 + phase)
        vx = axes[0] * r * wobble * signed_power(math.cos(a), 0.88) + axes[0] * 0.21 * h
        vy = axes[1] * r * (wobble + 0.08 * math.sin(2 * a)) * signed_power(math.sin(a), 0.88)
        vz = axes[2] * (h + r * (0.12 * math.sin(a + phase) + 0.06 * math.sin(4 * a + phase)))
        return center + rotation @ Vector((vx, vy, vz))

    levels = (-0.99, -0.70, -0.36, 0.02, 0.39, 0.67, 0.85, 0.96, 0.997)
    points = [surface(TAU * j / sides, h) for h in levels for j in range(sides)]
    mats_tone = 0.43 + 0.16 * math.sin(phase * 1.7)
    shades = [stone_color(v, mats_tone - 0.19 * (1 - limit((v.z - WATER_Z + 0.025) / 0.09)))
              for v in points]
    mesh(name, points, ring_faces(len(levels), sides, bottom=True, top=True), mats["stone"],
         groups["rocks"], shades=shades)
    if not covered:
        return
    points = []
    shades = []
    for level in range(8):
        r = level / 7
        for j in range(sides):
            a = TAU * j / sides
            seam = 0.31 + 0.20 * math.sin(a + phase) + 0.085 * math.sin(4 * a - phase)
            h = seam + (0.999 - seam) * r
            v = surface(a, h)
            delta = v - center
            billow = min(0.021, axes[2] * 0.26)
            v.x += delta.x * 0.044 * (1 - r)
            v.y += delta.y * 0.052 * (1 - r)
            v.z += billow * (0.35 + 0.66 * math.sin((r * 0.69 + 0.097) * math.pi))
            v.z += 0.0027 * math.cos(7 * a + phase) * (1 - r)
            points.append(v)
            shades.append(snow_color(v, 0.68 + 0.28 * r))
    mesh(name + " · snow mantle", points, ring_faces(8, sides, top=True), mats["snow"],
         groups["rocks"], shades=shades)


def rockwork(groups, mats):
    angles = [-3.07, -2.77, -2.46, -2.15, -1.88, -1.55, -1.26, -0.94, -0.62,
              -0.36, -0.08, 0.22, 0.51, 0.78, 1.07, 1.36, 1.68, 1.99, 2.30, 2.62, 2.92]
    bare = {2, 6, 10, 13, 17, 19}
    for i, a in enumerate(angles):
        pos = coast(a) + Vector((0.034 * math.cos(a), 0.033 * math.sin(a), 0))
        pos.z = 0.331 + RNG.uniform(-0.022, 0.022)
        dimensions = (RNG.uniform(0.095, 0.132), RNG.uniform(0.109, 0.151), RNG.uniform(0.064, 0.120))
        name = f"Pool stone {i + 1:02d}"
        boulder(name, pos, dimensions, a + RNG.uniform(-0.34, 0.31), 818 + i, i not in bare, groups, mats)
    outliers = [
        (-0.80, -0.47, 0.275, 0.096, 0.078, 0.048, 0.3),
        (-0.77, 0.37, 0.348, 0.116, 0.094, 0.090, -0.6),
        (-0.78, 0.47, 0.321, 0.095, 0.068, 0.062, 0.3),
        (0.81, 0.30, 0.322, 0.105, 0.092, 0.063, -0.2),
        (0.65, 0.64, 0.318, 0.120, 0.087, 0.056, 0.5),
        (0.43, -0.76, 0.269, 0.117, 0.073, 0.043, 0.2),
        (-0.38, -0.80, 0.279, 0.094, 0.073, 0.032, -0.4),
    ]
    for i, (x, y, z, a, b, c, yaw) in enumerate(outliers):
        boulder(f"Bank stone {i + 1:02d}", (x, y, z), (a, b, c), yaw, 1044 + i,
                i % 3 != 2, groups, mats)
    for i in range(35):
        a = RNG.uniform(-math.pi, math.pi)
        if i < 25:
            pos = POOL.lerp(coast(a), RNG.uniform(0.21, 0.83))
            pos.z = RNG.uniform(0.153, 0.169)
        else:
            pos = coast(a).lerp(outline(a), 0.74)
            pos.z = 0.26 + 0.023 * max(0, math.sin(a))
        r = RNG.uniform(0.016, 0.045)
        ellipsoid("Rolled river pebble", pos, (r * 1.2, r * 0.77, r * 0.37), mats["stone"],
                  groups["rocks"], n=10, m=5, power=2.4, rotation=Quaternion(Z, a),
                  shade=lambda p, d: stone_color(p, 0.48 + 0.11 * d.z))


HEAD = [
    (0.143, 0.008, 0.284, 0.022, 2.0),
    (0.122, 0.090, 0.325, 0.078, 2.1),
    (0.093, 0.138, 0.399, 0.140, 2.15),
    (0.058, 0.164, 0.453, 0.186, 2.22),
    (0.019, 0.178, 0.483, 0.191, 2.3),
    (-0.035, 0.181, 0.500, 0.188, 2.32),
    (-0.090, 0.189, 0.507, 0.191, 2.38),
    (-0.144, 0.185, 0.508, 0.182, 2.46),
    (-0.214, 0.174, 0.493, 0.165, 2.65),
    (-0.275, 0.165, 0.480, 0.146, 2.76),
    (-0.337, 0.159, 0.472, 0.132, 3.1),
    (-0.395, 0.153, 0.469, 0.133, 3.45),
    (-0.431, 0.146, 0.473, 0.121, 3.35),
    (-0.464, 0.124, 0.476, 0.103, 3.1),
    (-0.487, 0.083, 0.478, 0.076, 2.75),
    (-0.497, 0.038, 0.480, 0.041, 2.45),
    (-0.500, 0.004, 0.480, 0.004, 2.0),
]
ROOT = Vector((0.048, 0.012, 0))
HEADING = Quaternion(Z, math.radians(6))


def animal_point(point):
    return ROOT + HEADING @ Vector(point)


def catmull(a, b, c, d, t):
    return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))


def section(y):
    i = next((i for i in range(len(HEAD) - 1) if y >= HEAD[i + 1][0]), len(HEAD) - 2)
    left, right = HEAD[i], HEAD[i + 1]
    fraction = limit((y - left[0]) / (right[0] - left[0]))
    back, front = HEAD[max(0, i - 1)], HEAD[min(len(HEAD) - 1, i + 2)]
    return [catmull(back[k], left[k], right[k], front[k], fraction) for k in range(1, 5)]


def head_point(y, angle, offset=0.0):
    rx, z, rz, power = section(y)
    x = (rx + offset) * signed_power(math.cos(angle), 2 / power)
    z += (rz + offset) * signed_power(math.sin(angle), 2 / power)
    return Vector((x, y, z))


def head_front(x, z):
    low = HEAD[-1][0]
    high = -0.324
    for _ in range(20):
        y = (low + high) / 2
        rx, cz, rz, power = section(y)
        if abs(x / rx) ** power + abs((z - cz) / rz) ** power > 1:
            low = y
        else:
            high = y
    return (low + high) / 2


def fur_color(point):
    x, y, z = HEADING.inverted() @ (Vector(point) - ROOT)
    shade = mix(color("73432B"), color("C78B52"), limit((z - 0.31) * 2.50 + 0.13))
    top = limit(0.65 + 0.33 * noise(point, 15, 7))
    shade = mix(shade, color("C48650"), 0.12 * top)
    muzzle = limit((-y - 0.29) / 0.21) * math.exp(-((z - 0.528) / 0.115) ** 2)
    shade = mix(shade, color("594135"), muzzle * 0.88)
    cheek = limit((abs(x) - 0.08) * 6) * math.exp(-((y + 0.258) / 0.15) ** 2 - ((z - 0.455) / 0.102) ** 2)
    shade = mix(shade, color("D0905F"), 0.43 * cheek)
    grain = noise(point, 34, 5) * 0.065 + noise(point, 12, 5) * 0.09
    return tuple(v * (1 + grain) for v in shade)


def smooth_animal(sections):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in sections:
        obj.select_set(True)
    obj = sections[-1]
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    volume = obj.modifiers.new("Join skull, neck and shoulders", 'REMESH')
    volume.mode = 'VOXEL'
    volume.voxel_size = 0.0055
    volume.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=volume.name)
    smooth = obj.modifiers.new("Soften the sculpt", 'SMOOTH')
    smooth.factor = 0.64
    smooth.iterations = 3
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    detail = obj.modifiers.new("Preserve the silhouette within the model budget", 'DECIMATE')
    detail.ratio = min(1.0, 7300 / (len(obj.data.polygons) * 2))
    detail.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=detail.name)
    pigment_mesh(obj.data, (fur_color(v.co) for v in obj.data.vertices))
    obj.select_set(False)
    return obj


def capybara(groups, mats):
    group = groups["capybara"]
    fur, ridge = mats["fur"], mats["fur_ridge"]
    body = ellipsoid("Capybara · shoulders and back below the surface", animal_point((0, 0.087, 0.217)),
                     (0.262, 0.335, 0.132), fur, group, n=42, m=18, power=2.4, rotation=HEADING,
                     deform=lambda v, d: Vector((v.x * (1 - 0.10 * d.y), v.y, v.z + 0.013 * d.y)))
    for sign in (-1, 1):
        ellipsoid("Submerged forepaw", animal_point((sign * 0.109, -0.245, 0.211)),
                  (0.077, 0.13, 0.064), fur, group, n=22, m=10, rotation=HEADING,
                  shade=lambda p, d: fur_color(p))
        for digit in range(4):
            ellipsoid("Rounded webbed toe",
                      animal_point((sign * (0.062 + 0.028 * digit), -0.352 + 0.004 * (digit - 1)**2, 0.196)),
                      (0.019, 0.044, 0.027), fur, group, n=12, m=6, rotation=HEADING,
                      shade=lambda p, d: fur_color(p))

    count, sides = 48, 52
    vertices = []
    for i in range(count):
        y = HEAD[0][0] + (HEAD[-1][0] - HEAD[0][0]) * i / (count - 1)
        for j in range(sides):
            a = TAU * j / sides
            p = head_point(y, a)
            p.x *= 1 + 0.013 * math.sin(5 * a + y * 31)
            p.z += 0.0016 * noise((p.x, y, p.z), 27, 5)
            vertices.append(animal_point(p))
    head = mesh("Capybara · continuous skull, muzzle and shoulders", vertices,
                ring_faces(count, sides, bottom=True, top=True), fur, group)
    sculpt = smooth_animal([body, head])
    surface = BVHTree.FromPolygons([v.co for v in sculpt.data.vertices],
                                    [f.vertices for f in sculpt.data.polygons], all_triangles=True)

    def snout(x, z):
        p, outward, _, _ = surface.ray_cast(animal_point((x, -0.70, z)), HEADING @ Vector((0, 1, 0)))
        if p is None:
            return animal_point((x, head_front(x, z), z)), HEADING @ Vector((0, -1, 0))
        return p, outward

    for sign in (-1, 1):
        base = Vector((sign * 0.128, 0.008, 0.662))
        up = Vector((sign * 0.33, 0.17, 0.93)).normalized()
        forward = Vector((sign * 0.31, -1, 0.15)).normalized()
        across = up.cross(forward).normalized()
        forward = across.cross(up).normalized()
        ear_points = []
        shades = []
        profiles = [(-0.022, 0.14), (-0.019, 0.67), (-0.011, 0.95), (0.001, 1),
                    (0.014, 0.91), (0.020, 0.76), (0.010, 0.55), (-0.002, 0.32), (-0.004, 0.06)]
        for i, (depth, u) in enumerate(profiles):
            for j in range(24):
                a = TAU * j / 24
                softness = 1 + 0.14 * math.sin(a) - 0.09 * math.cos(2 * a + sign)
                px = 0.046 * math.cos(a) * u * softness
                pz = 0.064 * math.sin(a) * u
                p = base + forward * (depth + 0.008 * math.sin(a) * u) + up * pz + across * px
                ear_points.append(animal_point(p))
                tint = color("A26842") if i < 5 else mix(color("4A3029"), color("A76F5D"), u * 0.80)
                shades.append(mix(tint, color("D29C71"), 0.20 * max(math.sin(a), 0)))
        mesh("Left cupped ear" if sign == -1 else "Right cupped ear", ear_points,
             ring_faces(len(profiles), 24, bottom=True, top=True), mats["ear"], group, shades=shades)

        phi = 0.43 if sign == 1 else math.pi - 0.43
        eye = head_point(-0.166, phi, 0.001)
        normal = Vector((sign * 0.89, -0.29, 0.31)).normalized()
        horizontal = Z.cross(normal).normalized()
        up = normal.cross(horizontal)
        rotation = normal.to_track_quat('Z', 'Y')
        ellipsoid("Dark eyelid rim", animal_point(eye), (0.029, 0.0165, 0.011), mats["lid"], group,
                  n=24, m=10, rotation=HEADING @ rotation)
        ellipsoid("Polished almond eye", animal_point(eye + normal * 0.005 + up * 0.0015),
                  (0.0231, 0.0118, 0.0099), mats["eye"], group,
                  n=24, m=12, rotation=HEADING @ rotation)
        ellipsoid("Small porcelain catchlight", animal_point(eye + normal * 0.014 + up * 0.005 - horizontal * 0.007),
                  (0.0033, 0.0028, 0.0014), mats["glint"], group, n=12, m=6, rotation=HEADING @ rotation)
        lower = [animal_point(eye + horizontal * (0.026 * math.cos(t)) + up * (0.012 * math.sin(t))
                              + normal * 0.003)
                 for t in (math.pi + math.pi * k / 12 for k in range(13))]
        tube("Soft lower eyelid", lower, [0.0014 + 0.0030 * math.sin(math.pi * k / 12) for k in range(13)],
             mats["lip"], group, sides=6)

    for sign in (-1, 1):
        x, z = sign * 0.049, 0.532
        skin, normal = snout(x, z)
        center = skin + normal * 0.0009
        nostril_tilt = Quaternion(Z, -sign * 0.25)
        rotation = normal.to_track_quat('Z', 'Y') @ nostril_tilt
        ellipsoid("Nostril", center, (0.0198, 0.0078, 0.0042), mats["nostril"],
                  group, n=20, m=9, power=2.3, rotation=rotation)
        dot_pattern = [(0.109, 0.461), (0.122, 0.444), (0.097, 0.437), (0.107, 0.479)]
        for x, z in dot_pattern:
            skin, normal = snout(sign * x, z)
            ellipsoid("Muzzle whisker follicle", skin - normal * 0.00065, (0.0023, 0.0023, 0.0014),
                      mats["lip"], group, n=8, m=5, rotation=normal.to_track_quat('Z', 'Y'))
        for i, (x, z) in enumerate([(0.114, 0.455), (0.123, 0.443)]):
            skin, _ = snout(sign * x, z)
            p = HEADING.inverted() @ (skin - ROOT)
            line = bezier([p, p + Vector((0.015 * sign, -0.010, 0.001)), p + Vector((0.027 * sign, -0.015, -0.008)),
                           p + Vector(((0.047 + 0.005 * i) * sign, -0.014, -0.013))], 8)
            tube("Short muzzle whisker", [animal_point(v) for v in line],
                 [0.00115 - 0.000105 * k for k in range(len(line))], mats["whisker"], group, sides=5)
    smile = []
    for j in range(29):
        x = 0.117 * (j / 14 - 1)
        z = 0.408 + 0.015 * (abs(x) / 0.117) ** 2.2
        skin, normal = snout(x, z)
        smile.append(skin - normal * 0.0004)
    tube("Quiet mouth seam", smile, [0.0010 + 0.0015 * math.sin(math.pi * j / 28)
                                             for j in range(29)], mats["lip"], group, sides=7)

    for i in range(93):
        y = RNG.uniform(-0.32, 0.059)
        a = RNG.uniform(-0.49, 3.65)
        if (-0.22 < y < -0.114) and min(abs(a - 0.43), abs(a - (math.pi - 0.43))) < 0.26:
            continue
        span = RNG.uniform(0.013, 0.033)
        arc = RNG.uniform(-0.18, -0.05) * (1 if math.cos(a) > 0 else -1)
        path = []
        for j in range(5):
            angle = a + arc * j / 4
            base = animal_point(head_point(y + span * j / 4, angle))
            normal = HEADING @ Vector((math.cos(angle), 0, math.sin(angle)))
            hit, _, _, _ = surface.ray_cast(base + normal * 0.013, -normal, 0.032)
            path.append((hit if hit is not None else base) + normal * 0.00028)
        width = RNG.uniform(0.0007, 0.00135)
        tube("Clay fur stroke", path, [width * v for v in (0.22, 0.74, 1, 0.75, 0.19)],
             ridge, group, sides=4)
    return surface


def yuzu(groups, mats, capy_surface):
    group = groups["yuzu"]
    y = -0.089
    origin = animal_point((0, y, 1))
    crown = capy_surface.ray_cast(origin, -Z)[0].z
    center = Vector((0, y, crown + 0.067 - 0.0015))
    axes = (0.078, 0.076, 0.067)

    def fruit_deform(v, d):
        theta = math.atan2(d.y, d.x)
        ripple = 1 + 0.039 * math.sin(5 * theta + 0.54) * (1 - max(0, abs(d.z)) ** 1.4)
        r = noise(v, 68, 9)
        v.x *= ripple * (1 + 0.063 * r)
        v.y *= ripple * (1 + 0.063 * r)
        v.z *= 1 + 0.037 * r * (1 - abs(d.z))
        v.z -= 0.009 * max(0, (d.z - 0.895) / 0.105)
        return v

    def peel(p, direction):
        t = limit(0.43 + 0.37 * direction.z + 0.23 * noise(p, 27, 13) + 0.11 * noise(p, 127, 3))
        return mix(color("C76B0C"), color("FFC827"), t)

    ellipsoid("Yuzu · pebbled citron resting on the crown", animal_point(center), axes, mats["yuzu"], group,
              n=44, m=23, power=2.28, rotation=HEADING, shade=peel, deform=fruit_deform)
    top = animal_point(center + Vector((0.0, 0, 0.058)))
    ellipsoid("Yuzu calyx", top, (0.015, 0.014, 0.0045), mats["calyx"], group, n=15, m=7, power=2.3)
    end = top + Vector((-0.011, 0.004, 0.021))
    stem_path = bezier([top, top + Z * 0.011, end + Vector((0.006, 0, 0)), end], 8)
    tube("Yuzu stem", stem_path, [0.0049 - 0.00023 * i for i in range(9)], mats["stem"], group, sides=9)
    for i, (dx, dy, dz, w) in enumerate([(-0.091, 0.040, 0.001, 0.024), (0.058, 0.028, 0.023, 0.016)]):
        leaf_end = end + Vector((dx, dy, dz))
        leaf("Citrus leaf", end, leaf_end, w, mats["leaf_dark" if i == 0 else "leaf"], group, cup=0.012)
        vein = bezier([end, end.lerp(leaf_end, 0.27) + Z * 0.013,
                       end.lerp(leaf_end, 0.72) + Z * 0.014, leaf_end], 8)
        tube("Citrus leaf midrib", vein, [0.0016 - i * 0.00014 for i in range(9)],
             mats["leaf_vein"], group, sides=5)


def bamboo_tint(point, i, angle, seed=0):
    grain = 0.15 * math.sin(angle * 13 + seed) + 0.094 * math.sin(angle * 21 - seed)
    light = 0.44 + 0.13 * math.cos(angle + seed) + grain + 0.17 * noise(point, 13, seed)
    return mix(color("526343"), color("B0A66B"), limit(light))


def bamboo_cane(name, base, top, radius, group, mats, *, lash=False, seed=0):
    base, top = Vector(base), Vector(top)
    points = []
    radii = []
    marks = (0.23, 0.54, 0.80) if (top - base).length > 0.25 else (0.45,)
    nodes = [(0.0, 0.85), (0.024, 1.0)]
    for knot in marks:
        nodes.extend([(knot - 0.016, 0.94), (knot, 1.07), (knot + 0.021, 0.91)])
    nodes += [(0.978, 0.87), (1.0, 0.76)]
    direction = top - base
    for t, scale in nodes:
        point = base.lerp(top, t)
        point.x += radius * 0.22 * math.sin(t * math.pi)
        points.append(point)
        radii.append(radius * scale)
    tube(name, points, radii, mats["bamboo"], group, sides=11,
         shade=lambda point, i, a: bamboo_tint(point, i, a, seed))
    if lash:
        for knot in marks:
            p = base + direction * knot
            binding("Split bamboo node band", p, direction, radius * 1.004, 1.25,
                    mats["bamboo_rim"], group, thickness=0.0020)


def binding(name, center, axis, radius, turns, mat, group, *, thickness=0.0032):
    center = Vector(center)
    axis = Vector(axis).normalized()
    helper = Z if abs(axis.z) < 0.78 else Vector((1, 0, 0))
    first = axis.cross(helper).normalized()
    second = axis.cross(first)
    count = math.ceil(turns * 9)
    path = []
    for i in range(count + 1):
        t = i / count
        phase = TAU * turns * t
        path.append(center + axis * (2.13 * thickness * turns * (t - 0.5))
                    + radius * (math.cos(phase) * first + math.sin(phase) * second))
    return tube(name, path, thickness, mat, group, sides=5)


def fence(groups, mats):
    group = groups["fence"]
    corners = [(-0.86, -0.21), (-0.86, 0.48), (-0.78, 0.72), (-0.57, 0.83),
               (0.09, 0.85), (0.69, 0.80), (0.85, 0.66)]
    polyline = list(map(Vector, corners))
    endpoints = []
    for i in range(len(polyline) - 1):
        a, b = polyline[i], polyline[i + 1]
        interval = round((b - a).length / 0.069)
        endpoints.extend([a.lerp(b, j / interval) for j in range(interval)])
    endpoints.append(polyline[-1])
    for i, (x, y) in enumerate(endpoints):
        height = 0.57 + 0.09 * limit((y + 0.19) / 0.85) + 0.020 * math.sin(i * 0.53)
        height += RNG.uniform(-0.009, 0.015)
        base = (x, y, 0.241)
        top = (x + RNG.uniform(-0.011, 0.011), y + RNG.uniform(-0.012, 0.014), height)
        bamboo_cane(f"Fence · split vertical cane {i + 1:02d}", base, top, RNG.uniform(0.024, 0.030),
                    group, mats, seed=i * 0.27)
        if i % 4 == 2:
            binding("Seagrass lashing", (x, y, 0.470), (0, 0, 1), 0.031, 2.2, mats["twine"], group)
    for i, p in enumerate(polyline):
        x, y = p
        if i in (2, 4):
            continue
        bamboo_cane("Fence · structural post", (x, y, 0.227), (x, y, 0.709 if y > 0.5 else 0.639),
                    0.035, group, mats, lash=True, seed=i + 10)
        binding("Post lashing", (x, y, 0.483), (0, 0, 1), 0.037, 2.8, mats["twine"], group)
    for i, (a, b) in enumerate(zip(polyline, polyline[1:])):
        inward = (b - a).normalized()
        inward = Vector((inward.y, -inward.x, 0)) * 0.028
        for z in (0.447, 0.532):
            u = Vector((a.x, a.y, z)) + inward
            v = Vector((b.x, b.y, z + 0.003)) + inward
            bamboo_cane("Fence · horizontal rail", u - (v - u).normalized() * 0.021,
                        v + (v - u).normalized() * 0.021, 0.024, group, mats, seed=i + 15)
    for i, (a, b) in enumerate(zip(polyline, polyline[1:])):
        distance = (b - a).length
        steps = max(1, math.floor(distance / 0.17))
        tangent = (b - a).normalized()
        for j in range(steps):
            p = a.lerp(b, (j + 0.50) / steps)
            idx = min(range(len(endpoints)), key=lambda k: (p - endpoints[k]).length)
            height = 0.57 + 0.09 * limit((p.y + 0.19) / 0.85) + 0.020 * math.sin(idx * 0.53)
            snow_drift("Snow folded over the bamboo tops", (p.x, p.y, height + 0.010),
                       (distance / steps * 0.62, RNG.uniform(0.039, 0.051), RNG.uniform(0.024, 0.035)),
                       mats["snow"], group, yaw=math.atan2(tangent.y, tangent.x), seed=32 + i * 4 + j)


def spout(groups, mats):
    group = groups["spout"]
    base = Vector((-0.754, 0.058, 0.251))
    mount = Vector((-0.752, 0.058, 0.550))
    lip = Vector((-0.418, -0.079, 0.494))
    axis = (lip - mount).normalized()
    across = axis.cross(Z).normalized()
    up = across.cross(axis).normalized()
    bamboo_cane("Spring outlet · support post", base, mount + Z * 0.072, 0.050, group, mats, lash=True, seed=12)
    snow_drift("Snow cap on the spring post", mount + Z * 0.070, (0.054, 0.060, 0.025), mats["snow"], group, seed=5)
    back = mount - axis * 0.075
    length = (lip - back).length
    sections = [(0.0, 0.031), (0.012, 0.039), (0.040, 0.038), (0.108, 0.041), (0.124, 0.044),
                (0.142, 0.039), (0.231, 0.037), (0.253, 0.041), (0.278, 0.038), (length - 0.014, 0.036),
                (length, 0.036), (length + 0.001, 0.030), (length - 0.003, 0.028), (length - 0.047, 0.027),
                (length - 0.104, 0.025)]
    points = []
    shades = []
    for i, (d, radius) in enumerate(sections):
        for j in range(28):
            angle = TAU * j / 28
            blaze = 0.029 * math.cos(angle) if i >= 9 else 0
            p = back + (d + blaze) * axis + radius * (math.cos(angle) * up + math.sin(angle) * across)
            points.append(p)
            shade = bamboo_tint(p, i, angle, 7)
            if i in (10, 11, 12):
                shade = mix(shade, color("E1BB7E"), 0.77)
            if i > 12:
                shade = mix(shade, color("3C3F29"), 0.63)
            shades.append(shade)
    mesh("Artesian inlet · open, diagonally cut bamboo", points,
         ring_faces(len(sections), 28, bottom=True, top=True), mats["bamboo"], group, shades=shades)
    binding("Inlet rope wrap", mount + axis * 0.026, axis, 0.044, 3.4, mats["twine"], group, thickness=0.0034)
    binding("Inlet post rope wrap", mount - Z * 0.042, Z, 0.052, 2.3, mats["twine"], group, thickness=0.0034)

    start = lip - axis * 0.022 - up * 0.026
    impact = Vector((-0.324, -0.122, WATER_Z - 0.006))
    path = bezier([start, start + axis * 0.062, impact + Z * 0.059, impact], 21)
    tube("A ribbon of spring water", path, [0.011 + 0.0065 * (1 - i / 21) ** 2 for i in range(22)],
         mats["stream"], groups["water"], sides=12,
         profile=lambda i, a: 1.0 + 0.18 * math.sin(a * 3 + i * 0.53))
    thread = [p + across * 0.005 + up * (0.0055 - i * 0.00014) for i, p in enumerate(path[1:])]
    tube("Running water glint", thread, [0.0013 + 0.0011 * math.sin(math.pi * i / 20) for i in range(21)],
         mats["glint"], groups["water"], sides=6)
    for i in range(9):
        angle = RNG.uniform(0, TAU)
        r = RNG.uniform(0.017, 0.067)
        p = impact + Vector((math.cos(angle) * r, math.sin(angle) * r, RNG.uniform(0.013, 0.071)))
        ellipsoid("Inlet droplets", p, (0.0032, 0.0035, 0.0059), mats["stream"], groups["water"], n=9, m=5)
    return impact


def lantern(groups, mats):
    group = groups["lantern"]
    x, y = 0.561, 0.452
    z = 0.310
    sides = 6
    phase = math.pi / 6
    gray = mats["stone"]

    def paint(point, height, angle):
        return stone_color(point, 0.53 + 0.13 * math.cos(angle * 2 + 0.8))

    def part(name, profile):
        return lathe(name, (x, y, z), profile, sides, gray, group, phase=phase, shade=paint)

    part("Tōrō · broad hexagonal foundation",
         [(0.000, 0.139), (0.015, 0.152), (0.038, 0.151), (0.055, 0.131), (0.073, 0.105)])
    part("Tōrō · lotus foot and shaft",
         [(0.066, 0.097), (0.085, 0.108), (0.111, 0.086), (0.138, 0.055), (0.172, 0.047),
          (0.193, 0.048), (0.202, 0.062), (0.219, 0.062), (0.229, 0.049), (0.272, 0.051),
          (0.292, 0.079), (0.306, 0.085)])
    part("Tōrō · corbelled firebox sill",
         [(0.294, 0.092), (0.314, 0.117), (0.338, 0.130), (0.354, 0.129), (0.367, 0.114)])
    for i in range(sides):
        a = phase + TAU * i / sides
        xx, yy = x + math.cos(a) * 0.104, y + math.sin(a) * 0.104
        lathe("Tōrō · firebox pillar", (xx, yy, z + 0.36),
              [(0.0, 0.022), (0.013, 0.019), (0.026, 0.0155), (0.124, 0.0155), (0.14, 0.022)],
              8, gray, group, phase=a, shade=paint)
    lathe("Tōrō · glowing inner paper shade", (x, y, z + 0.367),
          [(0.0, 0.061), (0.014, 0.073), (0.105, 0.073), (0.122, 0.062)],
          6, mats["paper"], group, phase=phase)
    part("Tōrō · hex pagoda eaves",
         [(0.493, 0.113), (0.501, 0.146), (0.516, 0.177), (0.532, 0.173), (0.544, 0.150),
          (0.552, 0.127), (0.587, 0.081), (0.615, 0.052), (0.627, 0.051)])
    roof_points = []
    roof_colors = []
    for w, h in [(0.153, 0.546), (0.149, 0.555), (0.119, 0.571), (0.080, 0.602), (0.046, 0.627), (0.012, 0.632)]:
        for j in range(36):
            a = phase + TAU * j / 36
            off = (a - phase + math.pi / 6) % (math.pi / 3) - math.pi / 6
            faceted = math.cos(math.pi / 6) / math.cos(abs(off) - math.pi / 6)
            r = w * faceted * (1 + 0.035 * math.cos(13 * a))
            p = Vector((x + r * math.cos(a), y + r * math.sin(a), z + h + 0.005 * math.cos(5 * a + w * 11)))
            roof_points.append(p)
            roof_colors.append(snow_color(p, 0.87))
    mesh("Snow clinging to the lantern roof", roof_points, ring_faces(6, 36, top=True),
         mats["snow"], group, shades=roof_colors)
    part("Tōrō · jewel finial",
         [(0.622, 0.049), (0.642, 0.034), (0.654, 0.030), (0.670, 0.032),
          (0.688, 0.024), (0.699, 0.013), (0.706, 0.003)])
    return Vector((x, y, z + 0.42))


def bucket(groups, mats):
    group = groups["bucket"]
    x, y, z = 0.716, -0.612, 0.275
    points = []
    levels = [(0.202, 0.72), (0.222, 0.94), (0.253, 1.0), (0.269, 0.94), (0.276, 0.86)]
    for height, scale in levels:
        for j in range(32):
            a = TAU * j / 32
            r = scale * (1 + 0.054 * math.cos(3 * a + 0.8) + 0.037 * math.sin(5 * a))
            points.append(Vector((x + 0.146 * r * math.cos(a), y + 0.137 * r * math.sin(a), height)))
    mesh("Flat threshold stone under the cedar bucket", points,
         ring_faces(len(levels), 32, bottom=True, top=True), mats["stone"], group,
         shades=[stone_color(p, 0.58) for p in points])
    sides = 16
    phase = 0.08
    lathe("Cedar bucket · foot", (x, y, z),
          [(0, 0.091), (0.006, 0.101), (0.016, 0.103), (0.026, 0.098)],
          sides, mats["bucket_rim"], group, phase=phase)
    lathe("Cedar bucket · sealed floor", (x, y, z + 0.017),
          [(0, 0.093), (0.014, 0.094), (0.018, 0.093)], sides, mats["wood_dark"], group, phase=phase)
    for i in range(sides):
        a = TAU * i / sides + phase
        delta = math.pi / sides - 0.013
        h = 0.131 + RNG.uniform(-0.0025, 0.0025)
        dims = [(0.008, 0.099), (0.018, 0.102), (h - 0.009, 0.120), (h, 0.117),
                (h + 0.0005, 0.105), (h - 0.008, 0.103), (0.023, 0.087), (0.009, 0.088)]
        points = []
        shades = []
        for j, (height, r) in enumerate(dims):
            for k in range(5):
                angle = a + delta * (k - 2) / 2
                point = Vector((x + r * math.cos(angle), y + r * math.sin(angle), z + height))
                points.append(point)
                band = 0.10 * math.sin(k * 2.4 + i * 1.6) + 0.11 * math.sin(i * 1.2)
                shade = 0.43 + 0.22 * height / h + band - (0.21 if j > 4 else 0)
                shades.append(mix(color("89512C"), color("D5A064"), limit(shade)))
        faces = []
        for j in range(len(dims)):
            jj = (j + 1) % len(dims)
            for k in range(4):
                faces.append((j * 5 + k, j * 5 + k + 1, jj * 5 + k + 1, jj * 5 + k))
        faces.extend([tuple(reversed(range(0, len(points), 5))), tuple(range(4, len(points), 5))])
        mesh(f"Cedar bucket · stave {i + 1:02d}", points, faces, mats["wood"], group, shades=shades)
    for hh, rad in ((0.035, 0.105), (0.102, 0.116)):
        path = [(x + rad * math.cos(t), y + rad * math.sin(t), z + hh)
                for t in (TAU * j / 48 for j in range(48))]
        tube("Dark bentwood hoop", path, 0.0054, mats["bucket_rim"], group, sides=7, loop=True)
    angle = -0.47
    tangent = Vector((math.cos(angle), math.sin(angle), 0))
    arch_axis = (Z + Vector((-0.37, 0.43, 0))).normalized()
    center = Vector((x, y, z + 0.110))
    path = [center + tangent * (0.116 * math.cos(t)) + arch_axis * (0.131 * math.sin(t))
            for t in (math.pi * j / 28 for j in range(29))]
    tube("Bucket · arched reed handle", path, [0.0041 + 0.0010 * math.sin(math.pi * i / 28) for i in range(29)],
         mats["twine"], group, sides=9)
    for sign in (-1, 1):
        knob = center + tangent * sign * 0.119
        ellipsoid("Bucket · brass handle pin", knob, (0.007, 0.007, 0.007),
                  mats["brass"], group, n=12, m=7)


def plants(groups, mats):
    group = groups["plants"]
    root = Vector((-0.658, 0.535, 0.275))
    spine = bezier([root, root + Vector((-0.044, -0.016, 0.21)),
                    root + Vector((0.101, 0.014, 0.328)), root + Vector((0.008, 0.012, 0.584))], 18)
    tube("Dwarf pine · crooked trunk", spine, [0.041 * (1 - i / 19) ** 1.24 for i in range(19)],
         mats["bark"], group, sides=11,
         profile=lambda i, a: 1 + 0.13 * math.sin(5 * a + 0.19 * i))

    def needles(p, d):
        t = limit(0.5 + 0.22 * d.z + 0.31 * noise(p, 26, 10))
        return mix(color("203E3B"), color("718776"), t)

    branches = [(6, -0.217, -0.003, 0.044, 0.89),
                (8, 0.233, -0.045, 0.064, 1.10),
                (10, -0.151, 0.092, 0.065, 0.83),
                (12, 0.209, 0.055, 0.057, 0.87),
                (14, -0.126, -0.065, 0.060, 0.72),
                (17, 0.048, 0.033, 0.044, 0.67)]
    for i, (level, dx, dy, dz, size) in enumerate(branches):
        start = spine[level]
        direction = Vector((dx, dy, dz))
        tip = start + direction
        path = bezier([start, start + direction * 0.31 - Z * 0.035,
                       tip - direction * 0.24 - Z * 0.016, tip], 10)
        tube("Dwarf pine · low sweeping branch", path, [0.016 * size * (1 - j / 12) for j in range(11)],
             mats["bark"], group, sides=8)
        tangent = Vector((dx, dy, 0)).normalized()
        cross = tangent.cross(Z)
        for j, (u, v, zz) in enumerate(((0.008, 0.012, 0.005), (0.062, -0.041, -0.022), (0.067, 0.042, 0.000))):
            p = tip - tangent * u + cross * v + Z * zz
            yaw = math.atan2(dy, dx) + (j - 1) * 0.29
            dimensions = (0.086 * size, 0.049 * size, 0.029 * size)
            ellipsoid("Dwarf pine · blue-green needle pad", p, dimensions, mats["pine"], group,
                      n=13, m=7, power=2.25, shade=needles, rotation=Quaternion(Z, yaw),
                      deform=lambda w, d: w * (1 + 0.17 * noise(w, 54, 12)))
            spangled = RNG.uniform(0.0, 0.007)
            snow_drift("Soft snow on the pine needles", p + Z * (0.020 * size + spangled),
                       (0.082 * size, 0.046 * size, 0.024 * size),
                       mats["snow"], group, yaw=yaw, seed=41 + i * 3 + j, fine=False)
            for k in range(8):
                angle = TAU * k / 8 + yaw
                vector = Vector((math.cos(angle), math.sin(angle), -0.05))
                end = p + vector * 0.091 * size
                leaf("Pine needle silhouette", p + vector * 0.047 * size, end, 0.007,
                     mats["pine_tip"], group, cup=0.004)

    for i, (x, y, ground, scale) in enumerate([(-0.773, -0.631, 0.253, 0.91),
                                                (0.745, 0.257, 0.295, 0.78),
                                                (-0.439, 0.720, 0.291, 0.83)]):
        for j in range(3):
            base = Vector((x + 0.014 * j, y + 0.009 * j, ground - 0.013))
            vec = Vector(((j - 1) * 0.049, 0.023 - j * 0.013, (0.12 + 0.026 * (j == 1)) * scale))
            end = base + vec
            path = bezier([base, base + Z * 0.04, end - vec * 0.28, end], 8)
            tube("Winter nandina stem", path, [0.0028 - k * 0.00024 for k in range(9)],
                 mats["bark"], group, sides=5)
            for k in range(4):
                a = 2.2 * k + j + i
                side = Vector((math.cos(a), math.sin(a), 0))
                origin = base.lerp(end, 0.59 + 0.085 * k)
                berry = end.lerp(origin, 0.39) + side * (0.016 + 0.004 * k)
                tube("Nandina berry stem", [origin, berry], 0.0013, mats["bark"], group, sides=5)
                ellipsoid("Muted vermilion winter berry", berry, (0.0094, 0.0092, 0.0102),
                          mats["berry"], group, n=8, m=5)
                if k < 2:
                    leaf("Nandina narrow leaf", origin, origin + side * 0.060 * scale + Z * 0.017,
                         0.009, mats["pine_tip"], group, cup=0.006)


def ripple(groups, name, center, radius, stretch, start, length, width, mat):
    vertices = []
    steps = 30
    for i in range(steps + 1):
        t = i / steps
        a = start + length * t
        wobble = 1 + 0.024 * math.sin(5 * a + radius * 110) + 0.018 * math.cos(9 * a)
        half = width * 0.5 * (0.08 + 0.92 * math.sin(math.pi * t) ** 0.66)
        for r in (radius * wobble - half, radius * wobble + half):
            vertices.append((center.x + math.cos(a) * r, center.y + math.sin(a) * stretch * r,
                             WATER_Z + 0.0024 + width * 0.065 * math.sin(a * 7)))
    faces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(steps)]
    mesh(name, vertices, faces, mat, groups["water"])


def water(groups, mats, impact):
    points, shades = [], []
    sides = 80
    divisions = 15
    for i in range(divisions):
        for j in range(sides):
            a = TAU * j / sides
            t = 0.012 + (1.015 - 0.012) * (i / (divisions - 1)) ** 0.87
            p = POOL.lerp(coast(a), t)
            wave = (0.0015 * math.cos(p.x * 18 + p.y * 37)
                    + 0.0010 * math.sin(p.x * 35 - p.y * 17)
                    + 0.0019 * math.cos(130 * (p.xy - impact.xy).length)
                    * math.exp(-((p.xy - impact.xy).length / 0.25) ** 2))
            p.z = WATER_Z + wave * (0.48 + 0.52 * math.sin(t * math.pi))
            points.append(p)
            tint = limit(0.57 + 0.22 * math.sin(a + 0.15) * t
                         + 0.20 * noise(p, 6, 3) - 0.17 * t)
            shades.append(mix(color("387678"), color("9CD1C8"), tint))
    surface = mesh("Translucent spring water · surface", points,
                   ring_faces(divisions, sides, bottom=True, reverse=True), mats["water_portable"],
                   groups["water"], shades=shades)
    for r, a, length in ((0.053, -0.55, 4.4), (0.089, 0.63, 2.24), (0.126, -2.56, 2.43),
                          (0.157, -3.01, 1.7), (0.112, -0.15, 0.83)):
        ripple(groups, "Broken concentric wake at the bamboo spout", impact, r, 0.86, a, length,
               0.0045 if r < 0.10 else 0.0034, mats["ripple"])
    center = Vector((0.086, -0.233, 0))
    for r, a, length, ww in ((0.229, -1.36, 1.64, 0.0051), (0.274, -0.6, 0.9, 0.0045),
                             (0.323, -1.35, 1.38, 0.0041), (0.247, 0.54, 0.87, 0.0038),
                             (0.367, -0.4, 0.74, 0.0039), (0.275, 0.62, 0.48, 0.0031)):
        ripple(groups, "A small wake along the capybara's shoulders", center, r, 1.21, a, length,
               ww, mats["ripple"])
    for x, y, s in [(0.325, 0.051, 0.11), (0.359, 0.194, 0.15), (-0.230, -0.46, 0.10),
                    (0.21, -0.52, 0.14), (-0.24, 0.296, 0.13)]:
        ripple(groups, "Faint wind trace", Vector((x, y, 0)), s, 0.32,
               0.8, 1.35, 0.0030, mats["ripple_dim"])
    return surface


def steam(groups, mats):
    import numpy as np

    image = bpy.data.images.new("Procedural steam · packed alpha", 256, 256, alpha=True)
    u, v = np.meshgrid(np.linspace(-1, 1, 256), np.linspace(0, 1, 256))
    center = 0.32 * np.sin(v * 7.6 - 0.6) + 0.080 * np.sin(v * 21.4)
    spread = 0.18 + 0.22 * v
    body = np.exp(-((u - center) / spread) ** 2 * 1.25)
    eddy = np.exp(-((u - 0.37 * np.sin(v * 9.5 + 1.3)) / (spread * 0.75)) ** 2 * 1.9)
    turbulence = 0.75 + 0.13 * np.cos(v * 28 + u * 10) + 0.11 * np.sin(v * 47 + u * 17)
    height = np.sin(v * math.pi) ** 1.65 * np.clip((1 - v) * 1.35, 0, 1)
    alpha = (0.46 * body + 0.16 * eddy) * height * turbulence * (1 - u**6) ** 2
    rgba = np.ones((256, 256, 4), dtype=np.float32)
    rgba[:, :, 3] = alpha
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    mat = mats["steam"]
    mat.surface_render_method = 'DITHERED'
    texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
    texture.name = "Procedural steam"
    texture.image = image
    texture.extension = 'CLIP'
    shader = mat.node_tree.nodes.get("Principled BSDF")
    mat.node_tree.links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    shader.inputs["Specular IOR Level"].default_value = 0.12
    for i, (x, y, width, height, angle) in enumerate([
            (-0.361, 0.017, 0.28, 0.371, 0.30), (-0.369, 0.025, 0.25, 0.291, 1.70),
            (0.294, 0.098, 0.31, 0.248, -0.33), (0.279, 0.117, 0.253, 0.280, 1.14),
            (-0.199, -0.402, 0.31, 0.172, 0.46)]):
        direction = Vector((math.cos(angle), math.sin(angle), 0))
        center_point = Vector((x, y, WATER_Z))
        points = []
        for j in range(9):
            t = j / 8
            for side in (-1, 1):
                points.append(center_point + Z * (t * height) + direction * width * (0.5 * side + 0.23 * t))
        faces = [(j, j + 1, j + 3, j + 2) for j in range(0, 16, 2)]
        obj = mesh(f"Gentle rising steam {i + 1:02d}", points, faces, mat, groups["steam"])
        uv = obj.data.uv_layers.new()
        for loop in obj.data.loops:
            j = loop.vertex_index
            uv.data[loop.index].uv = (j % 2, (j // 2) / 8)


def make_materials():
    mats = {
        "slate": material("Stratified wet slate", "536772", 0.62, baked=True, grain=(93, 0.29, 0.006)),
        "stone": material("Water-darkened river granite", "646A6D", 0.55, baked=True, grain=(102, 0.41, 0.011)),
        "snow": material("Fresh snow · blue in the shadows", "F6F6EF", 0.74,
                         baked=True, grain=(245, 0.21, 0.004), subsurface=0.095),
        "fur": material("Warm chestnut coat", "BD8051", 0.58, baked=True,
                        grain=(208, 0.27, 0.0045), subsurface=0.045),
        "fur_ridge": material("Soft tips of the chestnut coat", "C08656", 0.64),
        "ear": material("Velvet ear, warmer on the inside", "B77C58", 0.69,
                        baked=True, grain=(200, 0.23, 0.005), subsurface=0.07),
        "lip": material("Cocoa muzzle details", "5A382B", 0.64),
        "lid": material("Quiet umber eyelids", "6E442F", 0.61),
        "eye": material("Glossy amber-black eyes", "291B16", 0.21),
        "nostril": material("Deep shadow in the nostrils", "36221B", 0.63),
        "whisker": material("Warm fine whiskers", "AF8A62", 0.67),
        "glint": material("Soft pinpoints of light", "FCF0D7", 0.23, emission=0.18),
        "yuzu": material("Yuzu peel · coarse citrus oil glands", "F7AC2A", 0.46,
                         baked=True, grain=(125, 0.42, 0.010), subsurface=0.075),
        "calyx": material("Dark green citrus calyx", "5A6431", 0.57),
        "stem": material("Olive yuzu stem", "787747", 0.61),
        "leaf": material("Fresh citrus green", "53753A", 0.41),
        "leaf_dark": material("Deep citrus green", "365E38", 0.39),
        "leaf_vein": material("Citrus midrib", "809052", 0.53),
        "bamboo": material("Brushed olive bamboo", "99945A", 0.56,
                          baked=True, grain=(175, 0.09, 0.008)),
        "bamboo_rim": material("Worn bamboo node", "8E8356", 0.61),
        "twine": material("Woven straw lashing", "AA8656", 0.71, grain=(220, 0.25, 0.007)),
        "wood": material("Split amber cedar", "C68C54", 0.56, baked=True, grain=(193, 0.16, 0.004)),
        "wood_dark": material("Dark cedar endgrain", "9B633E", 0.63, grain=(88, 0.39, 0.009)),
        "bucket_rim": material("Tea-stained bentwood", "684633", 0.64),
        "brass": material("Weathered copper pins", "AD8054", 0.38, metal=0.72),
        "paper": material("Lantern · glowing amber paper", "FF9D32", 0.77, emission=3.1),
        "bark": material("Dark umber pine bark", "665144", 0.72, grain=(132, 0.34, 0.014)),
        "pine": material("Blue-green pine needles", "42675C", 0.75,
                         baked=True, grain=(161, 0.37, 0.009)),
        "pine_tip": material("Dark winter needles", "3D5748", 0.70),
        "berry": material("Vermilion winter berries", "A83F37", 0.52),
        "ripple": material("Silver-blue caustic on a ripple", "BBE6DD", 0.26, alpha=0.57),
        "ripple_dim": material("Faint cyan reflections", "83B9B5", 0.26, alpha=0.42),
        "water_portable": material("Spring water · turquoise and translucent", "70ABA3",
                                   0.21, baked=True, alpha=0.43),
        "water_beauty": material("Spring water · optical interface", "A7DCD7", 0.175,
                                 transmission=0.91, grain=(24, 0.17, 0.006)),
        "stream": material("Clear falling spring water", "A5D9D4", 0.22, alpha=0.60),
        "stream_beauty": material("Falling water · optical interface", "B1DBDF", 0.18, transmission=0.79),
        "steam": material("Mist · gently fading moisture", "D6EAF2", 0.83, alpha=0.5, emission=0.18),
    }
    for key in ("water_portable", "water_beauty", "stream_beauty"):
        mats[key].node_tree.nodes.get("Principled BSDF").inputs["IOR"].default_value = 1.333
    mats["fur"].node_tree.nodes.get("Principled BSDF").inputs["Specular IOR Level"].default_value = 0.32
    return mats


def set_camera(group, name, position, target, scale):
    data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name, data)
    group.objects.link(camera)
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = scale
    data.lens = 49
    return camera


def light(group, name, position, target, power, tint, size, *, kind='AREA'):
    data = bpy.data.lights.new(name, type=kind)
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data.energy = power
    data.color = tint
    if kind == 'AREA':
        data.shape = 'DISK'
        data.size = size
    else:
        data.shadow_soft_size = size
    return obj


def studio(scene, lantern_center):
    group = collection("Studio · camera and presentation lights", scene.collection)
    floor = material("Midnight blue presentation ground", "22324B", 0.92)
    mesh("Seamless presentation ground", [(-200, -200, -0.003), (200, -200, -0.003),
                                           (200, 200, -0.003), (-200, 200, -0.003)],
         [(0, 1, 2, 3)], floor, group, smooth=False)
    scene.world = bpy.data.worlds.new("Soft blue twilight")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.44, 0.57, 0.71, 1)
    background.inputs["Strength"].default_value = 0.21
    camera = set_camera(group, "Hero · winter evening", (2.76, -4.20, 3.01), (0, 0, 0.412), 2.66)
    scene.camera = camera
    light(group, "Soft amber winter sun", (-3.1, -3.4, 4.7), (0, 0, 0.37), 505, (1.0, 0.84, 0.65), 3.6)
    light(group, "Cold sky from behind", (0.45, 2.7, 3.65), (0.10, 0, 0.31), 650, (0.52, 0.73, 1.0), 3.0)
    light(group, "Soft frontal fill", (3.3, -3.0, 2.94), (0, 0, 0.47), 207, (0.79, 0.90, 1.0), 3.7)
    light(group, "A cold edge on the snow", (-2.9, 1.9, 1.8), (0, 0, 0.44), 115, (0.58, 0.79, 1.0), 2.5)
    light(group, "Lantern spill on the bank", lantern_center + Vector((-0.05, -0.083, -0.032)),
          (0.34, 0.30, 0.30), 2.5, (1.0, 0.42, 0.10), 0.065, kind='POINT')
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1344
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.cycles.samples = 72
    scene.cycles.adaptive_threshold = 0.025
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 9
    scene.cycles.transparent_max_bounces = 12
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0.22
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'


def batch_small_details(groups, model):
    batch_names = {
        "Clay fur stroke": "Capybara · fine coat strokes",
        "Pine needle silhouette": "Dwarf pine · needle silhouettes",
        "Muted vermilion winter berry": "Nandina · winter berries",
        "Nandina berry stem": "Nandina · berry stems",
        "Nandina narrow leaf": "Nandina · narrow leaves",
        "Rolled river pebble": "Rolled river pebbles",
        "Seagrass lashing": "Seagrass lashings",
        "Fence · split vertical cane": "Fence · split vertical canes",
        "Fence · horizontal rail": "Fence · horizontal rails",
        "Snow folded over the bamboo tops": "Fence · snow on the bamboo tops",
        "Cedar bucket · stave": "Cedar bucket · stave assembly",
        "Dwarf pine · blue-green needle pad": "Dwarf pine · blue-green needle pads",
        "Soft snow on the pine needles": "Dwarf pine · snow-covered foliage",
    }
    for group in groups.values():
        repeats = defaultdict(list)
        for obj in group.objects:
            label = re.sub(r"(?: \d{2}|\.\d{3})$", "", obj.name)
            if label in batch_names:
                repeats[label].append(obj)
        for label, objects in repeats.items():
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:
                obj.select_set(True)
            joined = objects[0]
            bpy.context.view_layer.objects.active = joined
            bpy.ops.object.join()
            joined.name = batch_names[label]
            joined.data.name = joined.name
    bpy.ops.object.select_all(action='DESELECT')
    for obj in model.all_objects:
        if obj.name != "Chamfered slate and earth plinth":
            coords = [v.co for v in obj.data.vertices]
            pivot = Vector(tuple((min(v[i] for v in coords) + max(v[i] for v in coords)) / 2 for i in range(3)))
            obj.data.transform(Matrix.Translation(-pivot))
            obj.location = pivot


def write_glb(model, path):
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in model.all_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                             export_apply=True, export_yup=True, export_cameras=False,
                             export_lights=False, export_extras=False,
                             export_hierarchy_full_collections=True)
    for obj in model.all_objects:
        obj.select_set(False)


def metal_device(scene):
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.refresh_devices()
    except (TypeError, RuntimeError):
        return
    devices = [device for device in prefs.devices if device.type == 'METAL']
    if devices:
        for device in prefs.devices:
            device.use = device in devices
        scene.cycles.device = 'GPU'


def config():
    parser = argparse.ArgumentParser(description="Build the Snowbound Yuzu Bath diorama.")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--blend", action="store_true", help="Also save an editable Blender scene.")
    parser.add_argument("--render", action="store_true", help="Also render the presentation camera.")
    parser.add_argument("--quick", action="store_true", help="Use a smaller, faster proof render.")
    parser.add_argument("--skip-glb", action="store_true", help="Skip the interchange model.")
    parser.add_argument("--cpu", action="store_true", help="Use CPU rendering.")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def main():
    args = config()
    args.out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "Snowbound Yuzu Bath"
    scene.unit_settings.system = 'METRIC'
    model = collection("Snowbound Yuzu Bath · diorama", scene.collection)
    names = {
        "terrain": "01 · Earth and sculpted snowbanks", "rocks": "02 · Stonework",
        "water": "03 · Hot spring and water flow", "capybara": "04 · Capybara",
        "yuzu": "05 · Yuzu", "spout": "06 · Bamboo spring outlet", "fence": "07 · Bamboo fence",
        "lantern": "08 · Glowing stone lantern", "bucket": "09 · Cedar bath bucket",
        "plants": "10 · Dwarf pine and nandina", "steam": "11 · Steam",
    }
    groups = {key: collection(name, model) for key, name in names.items()}
    mats = make_materials()
    foundation(groups, mats)
    rockwork(groups, mats)
    capy_surface = capybara(groups, mats)
    yuzu(groups, mats, capy_surface)
    fence(groups, mats)
    impact = spout(groups, mats)
    flame = lantern(groups, mats)
    bucket(groups, mats)
    plants(groups, mats)
    surface = water(groups, mats, impact)
    steam(groups, mats)
    batch_small_details(groups, model)
    studio(scene, flame)
    if not args.skip_glb:
        write_glb(model, args.out / "scene.glb")
    if args.blend or args.render:
        surface.data.materials[0] = mats["water_beauty"]
        for obj in groups["water"].objects:
            if obj.data.materials and obj.data.materials[0] == mats["stream"]:
                obj.data.materials[0] = mats["stream_beauty"]
    if args.blend:
        bpy.context.preferences.filepaths.save_version = 0
        scene.render.filepath = "//snowbound-yuzu-bath.png"
        bpy.ops.wm.save_as_mainfile(filepath=str(args.out / "snowbound-yuzu-bath.blend"), compress=True)
    if args.render:
        if not args.cpu:
            metal_device(scene)
        if args.quick:
            scene.render.resolution_percentage = 46
            scene.cycles.samples = 20
        scene.render.filepath = str(args.out / ("proof.png" if args.quick else "snowbound-yuzu-bath.png"))
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
