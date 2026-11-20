"""Shared Blender mesh, material, and curve tools for the portrait."""
from math import cos, pi, sin
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
TAU = 2 * pi


def clamp(value, lo=0.0, hi=1.0):
    return min(hi, max(lo, value))


def smooth(a, b, value):
    t = clamp((value - a) / (b - a))
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a * (1 - t) + b * t


def collection(name, parent=None):
    layer = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(layer)
    return layer


def mesh(name, vertices, faces, layer, material=None, face_uv=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    layer.objects.link(obj)
    if material:
        data.materials.append(material)
    data.polygons.foreach_set("use_smooth", np.ones(len(data.polygons), dtype=np.bool_))
    if face_uv is not None:
        uv = data.uv_layers.new(name="Pattern")
        uv.data.foreach_set("uv", np.asarray([p for face in face_uv for p in face], dtype=np.float32).ravel())
    return obj


def orient(obj):
    """Make the winding consistent across an open or closed mesh."""
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def subdiv(obj, viewport=1, render=2):
    mod = obj.modifiers.new("Catmull–Clark surface", "SUBSURF")
    mod.levels = viewport
    mod.render_levels = render
    return mod


def solidify(obj, thickness, material_offset=0):
    mod = obj.modifiers.new("Cloth thickness", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = -1
    mod.material_offset = material_offset
    mod.material_offset_rim = material_offset
    return mod


def material(name, color, roughness=.45):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat, shader


def setup_node(mat, kind, label, pos):
    n = mat.node_tree.nodes.new(kind)
    n.label = label
    n.location = pos
    return n


def wire(mat, a, output, b, input_name):
    mat.node_tree.links.new(a.outputs[output], b.inputs[input_name])


def value_math(mat, operation, label, loc, operand=None):
    n = setup_node(mat, "ShaderNodeMath", label, loc)
    n.operation = operation
    if operand is not None:
        n.inputs[1].default_value = operand
    return n


def image(name, array, space="Non-Color"):
    height, width = array.shape[:2]
    im = bpy.data.images.new(name, width=width, height=height, alpha=True, float_buffer=False)
    im.colorspace_settings.name = space
    im.pixels.foreach_set(np.ascontiguousarray(array, dtype=np.float32).ravel())
    im.update()
    im.pack()
    return im


def obj_input(file, group=None, source=False):
    vertices, faces = [], []
    active = None
    for line in file.read_text().splitlines():
        if line.startswith("v "):
            x, y, z = map(float, line.split()[1:4])
            vertices.append((x * .1, -z * .1, (y + 8.168) * .1) if source else (x, y, z))
        elif line.startswith("g "):
            active = line.split()[1]
        elif line.startswith("f ") and (group is None or active == group):
            faces.append(tuple(int(token.split("/")[0]) - 1 for token in line.split()[1:]))
    return vertices, faces


def submesh(vertices, faces):
    used = sorted({i for face in faces for i in face})
    indices = {key: val for val, key in enumerate(used)}
    return [vertices[i] for i in used], [tuple(indices[i] for i in face) for face in faces]


def spline(points, count):
    """Sample an interpolating Catmull–Rom spline with evenly spaced parameters."""
    p = np.asarray(points, dtype=float)
    t = np.linspace(0, len(p) - 1, count)
    index = np.minimum(t.astype(int), len(p) - 2)
    a = p[np.maximum(index - 1, 0)]
    b = p[index]
    c = p[index + 1]
    d = p[np.minimum(index + 2, len(p) - 1)]
    t = (t - index)[:, None]
    return b + .5 * t * (c - a + t * (2*a - 5*b + 4*c - d + t * (3*b - a - 3*c + d)))


def normals_for_path(points, axis=(1, 0, 0)):
    tangent = np.gradient(points, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1)[:, None]
    axis = np.asarray(axis)
    cross = axis - np.sum(tangent * axis, axis=1, keepdims=True) * tangent
    cross /= np.maximum(np.linalg.norm(cross, axis=1)[:, None], 1.e-8)
    return cross, np.cross(tangent, cross)


def native_curves(name, paths, widths, layer, mat):
    """Use native point radii so the strand geometry remains a Curves object."""
    data = bpy.data.hair_curves.new(name)
    data.add_curves([len(item) for item in paths])
    data.attributes["position"].data.foreach_set(
        "vector", np.ascontiguousarray(np.concatenate(paths), dtype=np.float32).ravel())
    radius = data.attributes.new("radius", "FLOAT", "POINT")
    radius.data.foreach_set("value", np.ascontiguousarray(np.concatenate(widths), dtype=np.float32))
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    layer.objects.link(obj)
    return obj


def sphere(name, center, axes, layer, mat, segments=64, rings=32):
    """Ellipsoid with a longitudinal edit mesh."""
    verts = [(center[0], center[1], center[2] + axes[2])]
    faces = []
    for i in range(1, rings):
        polar = pi * i / rings
        for j in range(segments):
            phase = TAU * j / segments
            verts.append((center[0] + axes[0] * sin(polar) * cos(phase),
                          center[1] + axes[1] * sin(polar) * sin(phase),
                          center[2] + axes[2] * cos(polar)))
    bottom = len(verts)
    verts.append((center[0], center[1], center[2] - axes[2]))
    for j in range(segments):
        k = (j + 1) % segments
        faces.append((0, j + 1, k + 1))
        for row in range(rings-2):
            a = 1 + segments * row
            faces.append((a+j, a+segments+j, a+segments+k, a+k))
        a = 1 + segments * (rings - 2)
        faces.append((bottom, a+k, a+j))
    return mesh(name, verts, faces, layer, mat)


PIVOT = Vector((.0, -.050, 1.410))
HEAD_ROT = (Matrix.Rotation(-.09, 3, "Z") @ Matrix.Rotation(-.403, 3, "Y")
            @ Matrix.Rotation(.015, 3, "X"))
HEAD_ARRAY = np.asarray(HEAD_ROT)
PIVOT_ARRAY = np.asarray(PIVOT)


def head_pose(co, weight=1):
    p = Vector(co)
    return p.lerp(PIVOT + HEAD_ROT @ (p - PIVOT), weight)


def pose_path(points):
    """The roots follow the tilt while lengths settle with gravity."""
    points = np.asarray(points)
    t = np.clip((points[:, 2] - 1.335) / .205, 0, 1)
    w = (t * t * (3 - 2 * t))[:, None]
    tilted = (points - PIVOT_ARRAY) @ HEAD_ARRAY.T + PIVOT_ARRAY
    return points + w * (tilted - points)
