"""Shared helpers for the portrait build (numpy geometry + bpy utilities)."""
import math
import numpy as np
import bpy
import bmesh
import mathutils
from mathutils.bvhtree import BVHTree


# ----------------------------------------------------------------------------
# numeric helpers
# ----------------------------------------------------------------------------

def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, dtype=np.float64) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def falloff_ellip(P, center, radii, power=2):
    """Smooth (1-r^2)^power falloff inside an ellipsoid. radii may be scalar."""
    rel = (P - np.asarray(center)) / np.asarray(radii)
    r2 = (rel * rel).sum(1)
    w = np.clip(1.0 - r2, 0.0, 1.0)
    return w ** power


def gauss(P, center, radii):
    rel = (P - np.asarray(center)) / np.asarray(radii)
    return np.exp(-0.5 * (rel * rel).sum(1))


def normalize(v, axis=-1):
    n = np.linalg.norm(v, axis=axis, keepdims=True)
    return v / np.maximum(n, 1e-12)


def rot_matrix(axis, angle):
    """Rodrigues rotation matrix (3x3 numpy)."""
    axis = np.asarray(axis, dtype=np.float64)
    axis = axis / np.linalg.norm(axis)
    x, y, z = axis
    c, s = math.cos(angle), math.sin(angle)
    C = 1 - c
    return np.array([
        [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
        [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
        [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


def triangulate(faces):
    tris = []
    for f in faces:
        for k in range(1, len(f) - 1):
            tris.append((f[0], f[k], f[k + 1]))
    return np.array(tris, dtype=np.int64)


def vertex_normals(co, tris):
    v0, v1, v2 = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    vn = np.zeros_like(co)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return normalize(vn)


def edges_from_faces(faces):
    es = set()
    for f in faces:
        n = len(f)
        for k in range(n):
            a, b = f[k], f[(k + 1) % n]
            es.add((a, b) if a < b else (b, a))
    return np.array(sorted(es), dtype=np.int64)


def laplacian_smooth(co, edges, mask, iterations=3, lam=0.5):
    """Masked Laplacian smoothing (mask in 0..1 per vertex)."""
    co = co.copy()
    n = len(co)
    deg = np.zeros(n)
    np.add.at(deg, edges[:, 0], 1)
    np.add.at(deg, edges[:, 1], 1)
    deg = np.maximum(deg, 1)
    m = (mask * lam)[:, None]
    for _ in range(iterations):
        acc = np.zeros_like(co)
        np.add.at(acc, edges[:, 0], co[edges[:, 1]])
        np.add.at(acc, edges[:, 1], co[edges[:, 0]])
        avg = acc / deg[:, None]
        co = co + m * (avg - co)
    return co


def taubin_smooth(co, edges, mask, iterations=4, lam=0.5, mu=-0.53):
    for _ in range(iterations):
        co = laplacian_smooth(co, edges, mask, 1, lam)
        co = laplacian_smooth(co, edges, mask, 1, mu)
    return co


def rng(seed):
    return np.random.default_rng(seed)


# ----------------------------------------------------------------------------
# bpy helpers
# ----------------------------------------------------------------------------

def ensure_collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def new_mesh_object(name, verts, faces, collection, smooth=True, uvs=None):
    """verts: (N,3) array, faces: list of index lists, uvs: per-loop (L,2) array."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], [list(map(int, f)) for f in faces])
    me.update()
    if smooth:
        me.shade_smooth()
    if uvs is not None:
        uvl = me.uv_layers.new(name="UVMap")
        uvl.data.foreach_set("uv", np.asarray(uvs, dtype=np.float32).ravel())
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def mesh_arrays(ob):
    me = ob.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    faces = [list(p.vertices) for p in me.polygons]
    return co.reshape(-1, 3), faces


def set_mesh_co(ob, co):
    ob.data.vertices.foreach_set("co", np.asarray(co, dtype=np.float64).ravel())
    ob.data.update()


def bvh_from_arrays(co, faces):
    return BVHTree.FromPolygons([tuple(v) for v in co], [tuple(f) for f in faces], all_triangles=False)


def set_color_attribute(me, name, rgba, domain='POINT'):
    if name in me.color_attributes:
        me.color_attributes.remove(me.color_attributes[name])
    attr = me.color_attributes.new(name=name, type='FLOAT_COLOR', domain=domain)
    attr.data.foreach_set("color", np.asarray(rgba, dtype=np.float32).ravel())
    return attr


def set_float_attribute(data, name, values, domain='POINT'):
    if name in data.attributes:
        data.attributes.remove(data.attributes[name])
    attr = data.attributes.new(name=name, type='FLOAT', domain=domain)
    attr.data.foreach_set("value", np.asarray(values, dtype=np.float32).ravel())
    return attr


def look_at_euler(pos, target, roll=0.0):
    d = mathutils.Vector(target) - mathutils.Vector(pos)
    q = d.to_track_quat('-Z', 'Y')
    if roll:
        q = q @ mathutils.Quaternion((0, 0, 1), roll)
    return q.to_euler()


# ----------------------------------------------------------------------------
# shader node helpers
# ----------------------------------------------------------------------------

def new_material(name):
    mat = bpy.data.materials.get(name)
    if mat is not None:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except Exception:
        pass
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return mat, nt


def node(nt, typ, loc=(0, 0), label=None, **inputs):
    n = nt.nodes.new(typ)
    n.location = loc
    if label:
        n.label = label
        n.name = label
    for k, v in inputs.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def link(nt, a, b):
    nt.links.new(a, b)


def math_node(nt, op, a=None, b=None, loc=(0, 0), clamp=False):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    n.location = loc
    n.use_clamp = clamp
    for idx, val in ((0, a), (1, b)):
        if val is None:
            continue
        if isinstance(val, (int, float)):
            n.inputs[idx].default_value = val
        else:
            nt.links.new(val, n.inputs[idx])
    return n.outputs[0]


def _sock(coll, name, typ):
    for s in coll:
        if s.name == name and s.type == typ:
            return s
    raise KeyError(name + ':' + typ)


def mix_rgb(nt, fac, a, b, blend='MIX', loc=(0, 0), clamp=False):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = blend
    n.clamp_result = clamp
    n.location = loc
    for s, val in ((_sock(n.inputs, 'Factor', 'VALUE'), fac),
                   (_sock(n.inputs, 'A', 'RGBA'), a),
                   (_sock(n.inputs, 'B', 'RGBA'), b)):
        if isinstance(val, (int, float, tuple, list)):
            s.default_value = val
        else:
            nt.links.new(val, s)
    return _sock(n.outputs, 'Result', 'RGBA')


def mix_float(nt, fac, a, b, loc=(0, 0)):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'FLOAT'
    n.location = loc
    for s, val in ((_sock(n.inputs, 'Factor', 'VALUE'), fac),
                   (_sock(n.inputs, 'A', 'VALUE'), a),
                   (_sock(n.inputs, 'B', 'VALUE'), b)):
        if isinstance(val, (int, float)):
            s.default_value = val
        else:
            nt.links.new(val, s)
    return _sock(n.outputs, 'Result', 'VALUE')


def color_ramp(nt, fac, stops, loc=(0, 0), interp='LINEAR'):
    n = nt.nodes.new('ShaderNodeValToRGB')
    n.location = loc
    cr = n.color_ramp
    cr.interpolation = interp
    while len(cr.elements) > len(stops):
        cr.elements.remove(cr.elements[-1])
    while len(cr.elements) < len(stops):
        cr.elements.new(0.5)
    for el, (pos, col) in zip(cr.elements, stops):
        el.position = pos
        el.color = col if len(col) == 4 else (*col, 1.0)
    if fac is not None:
        nt.links.new(fac, n.inputs[0])
    return n.outputs[0]


def srgb(r, g, b, a=1.0):
    def c(x):
        x = x / 255.0 if x > 1.0 else x
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return (c(r), c(g), c(b), a)
