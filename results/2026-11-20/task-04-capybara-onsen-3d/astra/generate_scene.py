"""Yuzu no Yu | a snowy capybara onsen. Run with Blender in background mode.

    blender -b --factory-startup -P generate_scene.py
    blender -b --factory-startup -P generate_scene.py -- --preview

The second command also photographs the exported GLB, after a fresh import.
Geometry is authored in miniature workshop units and converted to metres on output.
All pigment and relief maps are synthesized below. No asset files are required.
"""

import argparse
import math
import random
import struct
import sys
import tempfile
import zlib
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector


HERE = Path(__file__).resolve().parent
WORK = tempfile.TemporaryDirectory(prefix="yuzu-onsen-")
UNIT = 0.22
TAU = math.tau
PI = math.pi
RNG = random.Random(8461)
V = Vector
UP = V((0, 0, 1))
WHITE = (1.0, 1.0, 1.0, 1.0)
MATERIALS = {}
PARTS = []


def rgb(hex_code):
    h = hex_code.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def tint(c, factor):
    return tuple(max(0, min(v * factor, 1)) for v in c[:3]) + (c[3],)


def mix(a, b, t):
    return tuple(x * (1 - t) + y * t for x, y in zip(a, b))


def ease(a, b, value):
    t = np.clip((value - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def write_image(name, pixels, noncolor=False):
    """Encode generated pixels, bottom row first in memory, as a packed PNG."""
    a = np.clip(pixels + 0.5, 0, 255).astype(np.uint8)
    h, w, channels = a.shape

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2 if channels == 3 else 6, 0, 0, 0)
    body = b"".join(b"\0" + row.tobytes() for row in a[::-1])
    path = Path(WORK.name) / (name + ".png")
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(body, 7))
        + chunk(b"IEND", b"")
    )
    img = bpy.data.images.load(str(path))
    img.name = name
    if noncolor:
        img.colorspace_settings.name = "Non-Color"
    img.pack()
    return img


def noise_grid(x, y, nx, ny, rng):
    grid = rng.uniform(-1, 1, (ny, nx))
    xg, yg = x * nx, y * ny
    xi, yi = np.floor(xg).astype(int), np.floor(yg).astype(int)
    f, g = xg - xi, yg - yi
    f, g = f * f * (3 - 2 * f), g * g * (3 - 2 * g)
    return (
        (1 - f) * (1 - g) * grid[yi % ny, xi % nx]
        + f * (1 - g) * grid[yi % ny, (xi + 1) % nx]
        + (1 - f) * g * grid[(yi + 1) % ny, xi % nx]
        + f * g * grid[(yi + 1) % ny, (xi + 1) % nx]
    )


def normal_pixels(height, strength):
    dx = (np.roll(height, 1, axis=1) - np.roll(height, -1, axis=1)) * strength
    dy = (np.roll(height, 1, axis=0) - np.roll(height, -1, axis=0)) * strength
    l = np.sqrt(1 + dx * dx + dy * dy)
    return (np.stack((dx / l, dy / l, 1 / l), axis=-1) + 1) * 127.5


# Longitudinal slices of one continuous sculpt, from the blunt muzzle to the rump.
# Each slice gives the half width, belly and crown. The eye sockets are placed on it.
SLICES = np.array(
    [
        [-1.865, 0.022, 1.88, 1.95],
        [-1.846, 0.33, 1.70, 2.14],
        [-1.796, 0.51, 1.56, 2.267],
        [-1.68, 0.598, 1.48, 2.365],
        [-1.49, 0.63, 1.445, 2.39],
        [-1.30, 0.618, 1.40, 2.398],
        [-1.12, 0.609, 1.32, 2.443],
        [-0.945, 0.671, 1.22, 2.685],
        [-0.755, 0.741, 1.12, 2.86],
        [-0.52, 0.79, 1.045, 2.93],
        [-0.28, 0.778, 0.94, 2.936],
        [-0.065, 0.739, 0.86, 2.837],
        [0.17, 0.692, 0.77, 2.565],
        [0.365, 0.682, 0.71, 2.20],
        [0.56, 0.741, 0.66, 1.86],
        [0.74, 0.832, 0.64, 1.686],
        [0.97, 0.896, 0.62, 1.698],
        [1.19, 0.887, 0.624, 1.714],
        [1.41, 0.785, 0.655, 1.64],
        [1.60, 0.645, 0.69, 1.53],
        [1.765, 0.456, 0.76, 1.374],
        [1.88, 0.255, 0.84, 1.20],
        [1.925, 0.018, 0.984, 1.036],
    ]
)
SECTION_SLOPES = np.diff(SLICES[:, 1:], axis=0) / np.diff(SLICES[:, :1], axis=0)
TANGENTS = np.zeros_like(SLICES[:, 1:])
TANGENTS[0], TANGENTS[-1] = SECTION_SLOPES[0], SECTION_SLOPES[-1]
for i in range(1, len(SLICES) - 1):
    a, b = SECTION_SLOPES[i - 1], SECTION_SLOPES[i]
    for j in range(3):
        if a[j] * b[j] > 0:
            TANGENTS[i, j] = 2 * a[j] * b[j] / (a[j] + b[j])


def section(y):
    i = min(len(SLICES) - 2, max(0, int(np.searchsorted(SLICES[:, 0], y) - 1)))
    step = SLICES[i + 1, 0] - SLICES[i, 0]
    f = max(0, min(1, (y - SLICES[i, 0]) / step))
    return (
        (2 * f**3 - 3 * f * f + 1) * SLICES[i, 1:]
        + (f**3 - 2 * f * f + f) * step * TANGENTS[i]
        + (-2 * f**3 + 3 * f * f) * SLICES[i + 1, 1:]
        + (f**3 - f * f) * step * TANGENTS[i + 1]
    )


def squareness(y):
    f = max(0, min(1, (y + 1.31) / 0.48))
    return 1 - f * f * (3 - 2 * f)


def coat_images():
    w, h = 1024, 1024
    rng = np.random.default_rng(1532)
    u, v = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
    ys = SLICES[0, 0] + u[0] * (SLICES[-1, 0] - SLICES[0, 0])
    profile = np.array([section(y) for y in ys])
    theta = v * TAU
    cos_t = np.cos(theta)
    power = 0.80 - 0.26 * np.array([squareness(y) for y in ys])
    z = (profile[:, 2] + profile[:, 1]) / 2 - (profile[:, 2] - profile[:, 1]) / 2 * np.sign(cos_t) * np.abs(
        cos_t
    ) ** power
    crown = (1 - cos_t) / 2
    side = np.minimum(v, 1 - v)
    macro = noise_grid(u, v, 13, 10, rng)
    grain = noise_grid(u, v, 57, 104, rng)
    dry = ease(1.32, 1.64, z + 0.032 * macro)
    muzzle = (1 - ease(0.045, 0.195, u + 0.013 * macro)) * (0.84 + 0.16 * crown)
    cheek = np.exp(-(((u - 0.245) / 0.116) ** 2) - ((side - 0.25) / 0.10) ** 2)
    color = np.zeros((h, w, 3)) + [146, 91, 54]
    color += crown[:, :, None] * [37, 34, 25] + cheek[:, :, None] * [27, 24, 16]
    orbit = np.exp(-(((ys + 0.82) / 0.27) ** 2) - ((z - 2.405) / 0.14) ** 2)
    color -= orbit[:, :, None] * [23, 20, 15]
    color += (macro * 5 + grain * 2.5)[:, :, None] * [1, 0.82, 0.64]
    color = color * (1 - muzzle[:, :, None]) + np.array([89, 63, 48]) * muzzle[:, :, None]
    chin = np.exp(-(((ys + 1.65) / 0.36) ** 2) - ((z - 1.69) / 0.16) ** 2) * 0.63
    color = color * (1 - chin[:, :, None]) + np.array([158, 116, 80]) * chin[:, :, None]
    back = ease(0.51, 0.72, u)
    color *= 1 - 0.16 * back[:, :, None]
    color = color * (0.61 + 0.39 * dry[:, :, None]) + (1 - dry[:, :, None]) * [5, 7, 8]
    immersed = (1 - ease(1.02, 1.355, z)) * 0.37
    color = color * (1 - immersed[:, :, None]) + np.array([80, 130, 118]) * immersed[:, :, None]
    # Thousands of tapered strokes follow the grain from cheek to shoulder.
    pigment, relief = np.zeros((h, w)), np.zeros((h, w))
    n = 39200
    sx, sy = rng.uniform(0, w, n), rng.uniform(0, h, n)
    phase = sy / h * TAU
    length = rng.uniform(4.0, 23.5, n)
    direction = 0.68 * np.sin(phase) + 0.42 * np.sin(3.7 * sx / w * TAU + 0.5 * np.cos(phase)) * np.sin(phase)
    dx, dy = length * np.cos(direction), -length * np.sin(direction)
    opacity = rng.uniform(5, 27, n) * rng.choice([-1, 1, 1], n)
    for t in np.linspace(0, 1, 12):
        weight = math.sin(PI * t) ** 0.6
        xp, yp = sx + dx * t, sy + dy * t + 0.7 * np.sin(t * PI) * np.sin(phase)
        ix, iy = xp.astype(int), np.floor(yp).astype(int)
        fx, fy = xp - ix, yp - iy
        for ox, oy, coeff in (
            (0, 0, (1 - fx) * (1 - fy)),
            (1, 0, fx * (1 - fy)),
            (0, 1, (1 - fx) * fy),
            (1, 1, fx * fy),
        ):
            loc = ((iy + oy) % h, (ix + ox) % w)
            np.add.at(pigment, loc, opacity * weight * coeff * 0.77)
            np.add.at(relief, loc, weight * coeff * 0.47)
    color += np.clip(pigment, -29, 39)[:, :, None] * [1, 0.87, 0.69]
    normal = normal_pixels(np.clip(relief, 0, 1.4) + 0.18 * grain, 0.24)
    roughness = 0.40 + 0.35 * dry * (1 - 0.75 * back) - 0.095 * muzzle + 0.025 * macro
    rough_image = write_image(
        "Tawny coat - dampness", np.repeat((roughness * 255)[:, :, None], 3, axis=2), True
    )
    return (
        write_image("Tawny coat - brushed pigment", color),
        write_image("Tawny coat - nap", normal, True),
        rough_image,
    )


def peel_images():
    w, h = 512, 256
    rng = np.random.default_rng(842)
    u, v = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
    rough = noise_grid(u, v, 62, 33, rng) + 0.52 * noise_grid(u, v, 127, 68, rng)
    macro = noise_grid(u, v, 12, 7, rng)
    cell_x, cell_y = 57, 30
    seeds_x, seeds_y = rng.uniform(0.15, 0.85, (cell_y, cell_x)), rng.uniform(0.15, 0.85, (cell_y, cell_x))
    gx, gy = u * cell_x, v * cell_y
    ix, iy = np.floor(gx).astype(int), np.floor(gy).astype(int)
    d = np.full_like(u, 10)
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            tx, ty = ix + ox, iy + oy
            d = np.minimum(
                d,
                (gx - tx - seeds_x[ty % cell_y, tx % cell_x]) ** 2
                + (gy - ty - seeds_y[ty % cell_y, tx % cell_x]) ** 2,
            )
    pores = np.exp(-d / 0.046)
    col = np.zeros((h, w, 3)) + [234, 210, 26] + macro[:, :, None] * [9, 11, 8]
    col += (rough * 2.8 - pores * 9)[:, :, None] * [0.65, 1, 0.65]
    return write_image("Yuzu - golden rind", col), write_image(
        "Yuzu - oil glands", normal_pixels(0.25 * rough - 1.3 * pores, 0.44), True
    )


def steam_image():
    w, h = 256, 512
    rng = np.random.default_rng(761)
    u, v = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
    noise = noise_grid(u, v, 5, 8, rng) + 0.3 * noise_grid(u, v, 16, 23, rng)
    drift = 0.50 + 0.13 * np.sin(v * 10.2 + 0.4) + 0.074 * np.sin(v * 17.1 + 1) + 0.056 * noise
    width = 0.045 + 0.14 * v
    a = np.exp(-(((u - drift) / width) ** 2)) * (0.70 + 0.26 * noise)
    a += 0.34 * np.exp(-(((u - drift + 0.16 * np.sin(v * 7.4 + 0.3)) / (width * 0.60)) ** 2))
    a *= ease(0, 0.17, v) * (1 - ease(0.55, 1, v)) * (0.82 + 0.18 * np.cos(v * 11))
    pixels = np.zeros((h, w, 4)) + [233, 246, 241, 0]
    pixels[:, :, 3] = a * 127
    return write_image("Steam - feathered vapour", pixels)


def grain_images():
    rng = np.random.default_rng(2336)
    u, v = np.meshgrid(np.arange(256) / 256, np.arange(512) / 512)
    warp = noise_grid(u, v, 4, 3, rng)
    warp2 = noise_grid(u, v, 11, 6, rng)
    uu = u + 0.020 * warp + 0.009 * warp2
    grain = noise_grid(uu, v, 49, 4, rng) * 12 + noise_grid(uu, v, 125, 11, rng) * 6
    band = 12 * np.maximum(0, np.sin(TAU * (uu * 20 + 0.34 * warp2))) ** 6
    cane = np.zeros((*u.shape, 3)) + [237, 235, 217] + (grain - band)[:, :, None] * [0.86, 1, 1.03]
    wood = np.zeros((*u.shape, 3)) + [242, 231, 210] + (grain - 1.35 * band)[:, :, None] * [0.68, 1, 1.16]
    return write_image("Bamboo - longitudinal fibres", cane), write_image(
        "Hinoki and walnut - growth lines", wood
    )


def caustics_image():
    rng = np.random.default_rng(648)
    u, v = np.meshgrid(np.arange(512) / 512, np.arange(512) / 512)
    x = (u + 0.042 * noise_grid(u, v, 9, 8, rng) + 0.021 * np.sin(v * TAU * 4 + u * 4)) * 17
    y = (v + 0.046 * noise_grid(v, u, 8, 7, rng) + 0.019 * np.sin(u * TAU * 5 + 0.6)) * 13
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    sx, sy = rng.uniform(0.12, 0.88, (13, 17)), rng.uniform(0.12, 0.88, (13, 17))
    samples = []
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            tx, ty = xi + ox, yi + oy
            samples.append((x - tx - sx[ty % 13, tx % 17]) ** 2 + (y - ty - sy[ty % 13, tx % 17]) ** 2)
    closest = np.partition(np.stack(samples, axis=0), 1, axis=0)[:2]
    d = np.abs(closest[1] - closest[0])
    depth = np.clip(((u - 0.49) * 2) ** 2 + ((v - 0.45) * 2) ** 2, 0, 1)
    spread = noise_grid(u, v, 8, 7, rng)
    beam = np.exp(-((d / (0.044 + 0.018 * depth)) ** 2)) * (0.59 + 0.28 * spread + 0.31 * depth)
    col = (
        np.zeros((*u.shape, 3))
        + [73, 126, 120]
        + depth[:, :, None] * [26, 27, 19]
        + spread[:, :, None] * [5, 7, 5]
        + beam[:, :, None] * [50, 47, 34]
    )
    return write_image("Spring bed - refracted light", col)


def material(
    name,
    color="#ffffff",
    rough=0.5,
    metallic=0,
    alpha=1,
    vertex=False,
    image=None,
    normal=None,
    normal_strength=1,
    emission=None,
):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    shader = tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgb(color)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Alpha"].default_value = alpha
    if vertex:
        pigment = tree.nodes.new("ShaderNodeVertexColor")
        pigment.layer_name = "Pigment"
        tree.links.new(pigment.outputs["Color"], shader.inputs["Base Color"])
    if image:
        node = tree.nodes.new("ShaderNodeTexImage")
        node.image = image
        if vertex:
            paint = tree.nodes.new("ShaderNodeMix")
            paint.data_type = "RGBA"
            paint.blend_type = "MULTIPLY"
            paint.inputs[0].default_value = 1
            tree.links.new(node.outputs["Color"], paint.inputs[6])
            tree.links.new(pigment.outputs["Color"], paint.inputs[7])
            tree.links.new(paint.outputs[2], shader.inputs["Base Color"])
        else:
            tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
        if name.startswith("Steam"):
            tree.links.new(node.outputs["Alpha"], shader.inputs["Alpha"])
    if normal:
        src = tree.nodes.new("ShaderNodeTexImage")
        src.image = normal
        n = tree.nodes.new("ShaderNodeNormalMap")
        n.inputs["Strength"].default_value = normal_strength
        tree.links.new(src.outputs["Color"], n.inputs["Color"])
        tree.links.new(n.outputs["Normal"], shader.inputs["Normal"])
    if emission:
        shader.inputs["Emission Color"].default_value = rgb(emission[0])
        shader.inputs["Emission Strength"].default_value = emission[1]
    mat.diffuse_color = rgb(color)[:3] + (alpha,)
    if alpha < 1 or name.startswith("Steam"):
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        else:
            mat.blend_method = "BLEND"
    MATERIALS[name] = mat
    return mat


def make_materials():
    fur, nap, dampness = coat_images()
    peel, glands = peel_images()
    rng = np.random.default_rng(32)
    p = np.arange(256) / 256
    u, v = np.meshgrid(p, p)
    st = noise_grid(u, v, 44, 42, rng) + 0.55 * noise_grid(u, v, 100, 106, rng)
    granite = write_image("River stone - grain", normal_pixels(st, 0.34), True)
    snowgrain = write_image("Snow - fine crystal", normal_pixels(0.6 * st, 0.24), True)
    coat = material("Coat", rough=0.73, image=fur, normal=nap, normal_strength=0.80)
    tree = coat.node_tree
    wet = tree.nodes.new("ShaderNodeTexImage")
    wet.image = dampness
    channels = tree.nodes.new("ShaderNodeSeparateColor")
    tree.links.new(wet.outputs["Color"], channels.inputs["Color"])
    tree.links.new(channels.outputs["Green"], tree.nodes["Principled BSDF"].inputs["Roughness"])
    material("Yuzu", rough=0.46, image=peel, normal=glands, normal_strength=0.80)
    stone_var = noise_grid(u, v, 9, 8, rng) * 11 + noise_grid(u, v, 31, 32, rng) * 7 + st * 5
    mineral = 24 * np.maximum(0, np.sin(TAU * (u * 2.2 + v * 3.1 + 0.21 * noise_grid(u, v, 6, 5, rng)))) ** 19
    pattern = write_image(
        "Granite - mineral inclusions",
        np.zeros((*u.shape, 3)) + [227, 231, 229] + (stone_var + mineral)[:, :, None],
    )
    cane, wood = grain_images()
    material("Stone", rough=0.57, vertex=True, image=pattern, normal=granite, normal_strength=0.56)
    material("Wet basalt", rough=0.29, vertex=True, image=pattern, normal=granite, normal_strength=0.30)
    material("Snow", rough=0.78, vertex=True, normal=snowgrain, normal_strength=0.43)
    material("Mineral basin", rough=0.50, vertex=True)
    material("Spring floor", rough=0.52, image=caustics_image())
    material("Wood", rough=0.50, vertex=True, image=wood)
    material("Bamboo", rough=0.44, vertex=True, image=cane)
    material("Linen", rough=0.86, vertex=True)
    material("Plants", rough=0.48, vertex=True)
    material("Face", rough=0.64, vertex=True)
    material("Damp paws", rough=0.45, vertex=True)
    material("Eye", color="#362b24", rough=0.26)
    material("Nose", rough=0.52, vertex=True, normal=granite, normal_strength=0.17)
    material("Brass", color="#ac8654", rough=0.33, metallic=0.62)
    material("Hoops", color="#655548", rough=0.37, metallic=0.55)
    material("Water", color="#53b3ae", rough=0.14, metallic=0.13, alpha=0.41)
    MATERIALS["Water"].node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.333
    material("Meniscus", color="#71beb3", rough=0.11, metallic=0.19, alpha=0.39)
    material("Ripple", color="#addbd3", rough=0.24, metallic=0.19, alpha=0.50)
    material("Stream", color="#9ed9d6", rough=0.16, metallic=0.12, alpha=0.72)
    material("Steam", rough=1, image=steam_image(), emission=("#c1d9d8", 0.18))
    material("Hibukuro - honey paper", color="#ffbf69", rough=0.67, emission=("#ffae45", 2.4))


class Part:
    def __init__(self, name):
        self.name = name
        self.vertices = []
        self.faces = []
        self.face_mat = []
        self.smooth = []
        self.colors = []
        self.uv = []
        self.materials = []
        self.needs_color = False
        PARTS.append(self)

    def vert(self, p, col=None, uv=None):
        p = V(p)
        self.vertices.append(tuple(p * UNIT))
        self.colors.append(WHITE if col is None else col)
        self.needs_color |= col is not None
        self.uv.append(uv if uv is not None else (p.x * 0.62 + p.z * 0.23, p.y * 0.65 + p.z * 0.71))
        return len(self.vertices) - 1

    def face(self, verts, mat, smooth=True):
        if mat not in self.materials:
            self.materials.append(mat)
        self.faces.append(verts)
        self.face_mat.append(self.materials.index(mat))
        self.smooth.append(smooth)

    def finish(self):
        if not self.faces:
            return
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.vertices, [], self.faces)
        for key in self.materials:
            mesh.materials.append(MATERIALS[key])
        mesh.polygons.foreach_set("material_index", self.face_mat)
        mesh.polygons.foreach_set("use_smooth", self.smooth)
        uv = mesh.uv_layers.new(name="Handmade UV")
        idx = np.empty(len(mesh.loops), dtype=np.int32)
        mesh.loops.foreach_get("vertex_index", idx)
        uv.data.foreach_set("uv", np.array(self.uv, dtype=np.float32)[idx].ravel())
        if self.needs_color:
            attr = mesh.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
            attr.data.foreach_set("color", np.array(self.colors, dtype=np.float32).ravel())
        # Tangent calculation in Blender accepts triangles and quads.
        import bmesh

        bm = bmesh.new()
        bm.from_mesh(mesh)
        caps = [face for face in bm.faces if len(face.verts) > 4]
        if caps:
            bmesh.ops.triangulate(bm, faces=caps, ngon_method="BEAUTY")
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)


def loft(g, rings, mat, colors=None, smooth=True, cap=True, reverse=False, uv_fn=None):
    """Connect equal-sized rings. Ring direction is counterclockwise from the end."""
    rows = []
    for j, ring in enumerate(rings):
        rows.append(
            [
                g.vert(p, colors[j][i] if colors is not None else None, uv_fn(j, i, p) if uv_fn else None)
                for i, p in enumerate(ring)
            ]
        )
    n = len(rows[0])
    for a, b in zip(rows, rows[1:]):
        for i in range(n):
            k = (i + 1) % n
            q = (a[i], a[k], b[k], b[i])
            g.face(q[::-1] if reverse else q, mat, smooth)
    if cap:
        g.face(tuple(rows[0] if reverse else rows[0][::-1]), mat, False)
        g.face(tuple(rows[-1][::-1] if reverse else rows[-1]), mat, False)
    return rows


def uniform_rows(rings, color):
    return [[color] * len(row) for row in rings]


def frame(axis):
    w = V(axis).normalized()
    h = V((0, 1, 0)) if abs(w.y) < 0.88 else V((1, 0, 0))
    u = h.cross(w).normalized()
    return u, w.cross(u).normalized(), w


def pole(g, a, b, r, mat, col, n=12, r2=None):
    a, b = V(a), V(b)
    u, v, _ = frame(b - a)
    r2 = r if r2 is None else r2
    angles = [TAU * i / n for i in range(n)]
    rings = [[p + rad * (u * math.cos(t) + v * math.sin(t)) for t in angles] for p, rad in ((a, r), (b, r2))]
    loft(g, rings, mat, uniform_rows(rings, col) if col else None)


def stroke(g, points, radii, mat, col, n=6):
    points = [V(p) for p in points]
    rings = []
    if isinstance(radii, (int, float)):
        radii = [radii] * len(points)
    u, v, w = frame(points[1] - points[0])
    last_u = u
    for i, (p, r) in enumerate(zip(points, radii)):
        w = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
        u = (last_u - w * w.dot(last_u)).normalized()
        v = w.cross(u)
        last_u = u
        rings.append([p + r * (u * math.cos(TAU * j / n) + v * math.sin(TAU * j / n)) for j in range(n)])
    loft(g, rings, mat, uniform_rows(rings, col) if col else None)


def signed_pow(x, p):
    return math.copysign(abs(x) ** p, x)


def ell(g, p, axes, mat, col, n=18, m=10, basis=None, power=1.0):
    p = V(p)
    ex, ey, ez = basis or (V((1, 0, 0)), V((0, 1, 0)), UP)
    rx, ry, rz = axes
    rows = []
    bottom = g.vert(p - ez * rz, col)
    for j in range(1, m):
        phi = -PI / 2 + PI * j / m
        rr = abs(math.cos(phi)) ** power
        z = signed_pow(math.sin(phi), power)
        rows.append(
            [
                g.vert(
                    p
                    + ex * (rx * rr * signed_pow(math.cos(TAU * i / n), power))
                    + ey * (ry * rr * signed_pow(math.sin(TAU * i / n), power))
                    + ez * (rz * z),
                    col,
                )
                for i in range(n)
            ]
        )
    top = g.vert(p + ez * rz, col)
    for i in range(n):
        k = (i + 1) % n
        g.face((bottom, rows[0][k], rows[0][i]), mat)
        for a, b in zip(rows, rows[1:]):
            g.face((a[i], a[k], b[k], b[i]), mat)
        g.face((rows[-1][i], rows[-1][k], top), mat)


def lathe(g, x, y, z, profile, mat, col, n=32, phase=0, smooth=True):
    rings = [
        [
            (x + rad * math.cos(TAU * i / n + phase), y + rad * math.sin(TAU * i / n + phase), z + h)
            for i in range(n)
        ]
        for h, rad in profile
    ]
    loft(g, rings, mat, uniform_rows(rings, col) if col else None, smooth)


def rounded_perimeter(t, w, d, n=6.0):
    c, s = math.cos(t), math.sin(t)
    r = ((abs(c) / w) ** n + (abs(s) / d) ** n) ** (-1 / n)
    return np.array([c * r, s * r])


def arc(g, center, rx, ry, a, b, z, width, mat="Ripple", segments=21, angle=0, height_fun=None):
    x, y = center
    ca, sa = math.cos(angle), math.sin(angle)
    rows = []
    for j in range(segments + 1):
        f = j / segments
        t = a + (b - a) * f
        w = width * (0.04 + 0.96 * math.sin(PI * f) ** 0.67)
        ids = []
        for side in (-1, 1):
            dx = (rx + side * w) * math.cos(t)
            dy = (ry + side * w) * math.sin(t)
            xj = x + ca * dx - sa * dy
            yj = y + sa * dx + ca * dy
            hj = height_fun(xj, yj) if height_fun else z
            ids.append(g.vert((xj, yj, hj)))
        rows.append(ids)
    for l, r in zip(rows, rows[1:]):
        g.face((l[0], l[1], r[1], r[0]), mat)


CX, CY, RX, RY = -0.29, -0.34, 3.10, 2.27
WATER_Z = 1.36
SNOW = rgb("#f1f5f2")
SNOW_EDGE = rgb("#c4d9e0")
SNOW_HIGH = rgb("#fffdf3")
SPOUT_BACK = V((-3.03, 1.61, 2.26))
SPOUT_LIP = V((-2.24, 0.43, 2.025))
STREAM_START = SPOUT_LIP + (SPOUT_LIP - SPOUT_BACK).normalized() * 0.005 - UP * 0.067
STREAM_END = STREAM_START + V((0.168, -0.146, 0))
STREAM_END.z = WATER_Z + 0.01


def bath_xy(t, r=1):
    k = 1 + 0.024 * math.cos(3 * t + 0.25) + 0.019 * math.sin(5 * t + 0.9) + 0.016 * math.sin(2 * t)
    return np.array([CX + RX * r * k * math.cos(t), CY + RY * r * k * math.sin(t)])


def tracked_snow(g, levels, colors, outer_ids):
    """Retriangulate the open snowbank around four shallow, three/four-toed tracks."""
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import delaunay_2d_cdt

    n = len(levels[0])
    positions = [V(p) for ring in levels for p in ring]
    quads = [
        (k * n + i, k * n + (i + 1) % n, (k + 1) * n + (i + 1) % n, (k + 1) * n + i)
        for k in range(len(levels) - 1)
        for i in range(n)
    ]
    surface = BVHTree.FromPolygons(positions, quads)
    coords = [V((p.x, p.y)) for p in positions]
    edges = [(k * n + i, k * n + (i + 1) % n) for k in (0, len(levels) - 1) for i in range(n)]
    lobes = []
    for x, y, angle, toes, scale in (
        (-3.15, -3.12, 0.35, 3, 1.13),
        (-2.78, -3.24, 0.32, 4, 1.04),
        (-2.40, -3.03, 0.50, 3, 1.12),
        (-2.04, -3.065, 0.68, 4, 1.03),
    ):
        p = V((x, y))
        d = V((math.cos(angle), math.sin(angle)))
        side = V((-d.y, d.x))
        lobes.append((p, d, side, 0.101 * scale, 0.084 * scale, 0.069 * scale, 10))
        for j in range(toes):
            f = (j - (toes - 1) / 2) / ((toes - 1) / 2)
            a = angle + 0.32 * f
            axis = V((math.cos(a), math.sin(a)))
            center = p + d * ((0.120 - 0.017 * f * f) * scale) + side * (f * 0.077 * scale)
            lobes.append((center, axis, V((-axis.y, axis.x)), 0.065 * scale, 0.030 * scale, 0.049 * scale, 8))
    for p, d, s, a, b, depth, count in lobes:
        coords.append(p)
        for rad in (0.44, 0.79, 1.06, 1.36):
            for i in range(count):
                t = TAU * (i + 0.12 * rad) / count
                coords.append(p + d * (a * rad * math.cos(t)) + s * (b * rad * math.sin(t)))

    def impression(p):
        hollow = 0
        rim = 0
        for c, d, s, a, b, h, _ in lobes:
            diff = p - c
            if diff.length_squared > 0.0625:
                continue
            r = math.hypot(diff.dot(d) / a, diff.dot(s) / b)
            if r > 1.48:
                continue
            f = max(0, min(1, (r - 0.38) / 0.70))
            val = 1 - f * f * (3 - 2 * f)
            hollow = max(hollow, h * val)
            rim = max(rim, 0.011 * math.exp(-(((r - 1.08) / 0.18) ** 2)))
        return rim - hollow, hollow

    verts, _, tris, orig, _, _ = delaunay_2d_cdt(coords, edges, [], 0, 1e-6)
    ids = []
    for i, p in enumerate(verts):
        source = orig[i][0] if orig[i] else -1
        if 0 <= source < n:
            ids.append(outer_ids[source])
            continue
        if 0 <= source < len(positions):
            z = positions[source].z
            col = colors[source // n][source % n]
        else:
            pt = surface.ray_cast(V((p.x, p.y, 3)), -UP)[0]
            z = pt.z if pt is not None else 0.90
            col = SNOW
        off, depth = impression(p)
        ids.append(g.vert((p.x, p.y, z + off), mix(col, rgb("#94b0bb"), min(0.65, depth * 10))))
    for tri in tris:
        p = sum((verts[k] for k in tri), V((0, 0))) / 3
        if surface.ray_cast(V((p.x, p.y, 3)), -UP)[0] is not None:
            g.face(tuple(ids[k] for k in tri), "Snow")


def base():
    plinth = Part("01 · Walnut presentation plinth")
    ang = [TAU * i / 96 for i in range(96)]
    profile = [
        (0, 4.03, 3.37, "#423738"),
        (0.025, 4.13, 3.45, "#4f4140"),
        (0.083, 4.19, 3.51, "#654b42"),
        (0.127, 4.19, 3.51, "#765548"),
        (0.142, 4.15, 3.48, "#513d36"),
        (0.155, 4.16, 3.49, "#6a5044"),
        (0.181, 4.206, 3.528, "#ad805d"),
        (0.195, 4.216, 3.536, "#c6996d"),
        (0.211, 4.216, 3.536, "#987052"),
        (0.228, 4.18, 3.515, "#684c40"),
        (0.258, 4.205, 3.535, "#81604c"),
        (0.324, 4.216, 3.545, "#916b52"),
        (0.375, 4.215, 3.545, "#89664f"),
        (0.434, 4.21, 3.54, "#8b6750"),
        (0.461, 4.21, 3.538, "#a18067"),
        (0.48, 4.19, 3.527, "#593f33"),
        (0.511, 4.175, 3.517, "#604b40"),
    ]
    rows = []
    cs = []
    for j, (z, w, d, hue) in enumerate(profile):
        row = []
        colors = []
        for t in ang:
            x, y = rounded_perimeter(t, w, d, 7)
            wave = (
                0.003 * math.sin(6 * t + 0.2 * j) + 0.002 * math.cos(13 * t - j * 0.12)
                if 0.25 < z < 0.45
                else 0
            )
            row.append((x, y, z + wave))
            colors.append(
                tint(rgb(hue), 0.98 + 0.053 * math.sin(7 * t + j * 0.3) + 0.029 * math.cos(25 * t - j * 0.07))
            )
        rows.append(row)
        cs.append(colors)
    loft(
        plinth,
        rows,
        "Wood",
        cs,
        uv_fn=lambda j, i, p: (p[2] * 2.3 + 0.018 * math.sin(5 * ang[i]), ang[i] * 0.95),
    )
    seal = Part("02 · Brass hot spring maker’s mark")
    center = V((0, -3.55, 0.345))
    r = 0.103
    pts = [center + V((r * math.cos(TAU * i / 34), 0, r * math.sin(TAU * i / 34))) for i in range(35)]
    stroke(seal, pts, 0.0068, "Brass", None)
    pts = [
        center + V((0.059 * math.cos(PI + PI * i / 12), -0.003, -0.01 + 0.037 * math.sin(PI + PI * i / 12)))
        for i in range(13)
    ]
    stroke(seal, pts, 0.0055, "Brass", None)
    for k in (-1, 0, 1):
        pts = [
            center + V((k * 0.027 + 0.006 * math.sin(TAU * i / 10), -0.003, 0.008 + 0.055 * i / 10))
            for i in range(11)
        ]
        stroke(seal, pts, [0.0015 + 0.0037 * math.sin(PI * i / 10) ** 0.6 for i in range(11)], "Brass", None, 5)

    terre = Part("03 · Cut bank and snowdrifts")

    def outer(t):
        return rounded_perimeter(t, 4.20 + 0.025 * math.sin(7 * t), 3.52 + 0.03 * math.cos(5 * t), 6.6)

    def ground(t):
        return 0.90 + 0.047 * math.sin(t * 4 + 0.7) + 0.037 * math.sin(9 * t) + 0.024 * math.cos(15 * t)

    rows = []
    cs = []
    for portion, f, c in (
        (0, 0.989, "#655d58"),
        (0.16, 1, "#757269"),
        (0.51, 1.003, "#848780"),
        (0.79, 1.001, "#909792"),
        (1, 0.992, "#a6b4b0"),
    ):
        row = []
        for t in ang:
            seam = ground(t) - 0.225 - 0.048 * max(0, math.sin(t * 13 + 0.1)) ** 6
            row.append((*(outer(t) * f), 0.49 + (seam - 0.49) * portion))
        rows.append(row)
        cs.append([tint(rgb(c), 1 + 0.078 * math.sin(17 * t)) for t in ang])
    loft(terre, rows, "Stone", cs, cap=False)
    rows = []
    cs = []
    for f, off, c in (
        (0.992, -0.225, SNOW_EDGE),
        (1.001, -0.204, rgb("#d2e2e5")),
        (1.012, -0.147, rgb("#dfeaec")),
        (1.013, -0.074, SNOW),
        (1.004, -0.020, SNOW_HIGH),
        (0.984, 0, SNOW),
    ):
        rows.append(
            [
                (
                    *(outer(t) * f),
                    ground(t) + off - 0.048 * max(0, math.sin(t * 13 + 0.1)) ** 6 * (1 if off < -0.07 else 0.3),
                )
                for t in ang
            ]
        )
        cs.append([c] * len(ang))
    for f in (0.18, 0.40, 0.70, 1.0):
        row = []
        col = []
        for t in ang:
            edge = outer(t) * 0.984
            inner = bath_xy(t, 1.01)
            xy = edge * (1 - f) + inner * f
            z = (
                ground(t) * (1 - f)
                + (0.94 + 0.033 * math.cos(6 * t)) * f
                + 0.041 * math.sin(f * PI) * math.sin(t * 5)
            )
            row.append((*xy, z))
            col.append(mix(SNOW, SNOW_EDGE, 0.23 * f + 0.07 * (1 + math.sin(3 * t))))
        rows.append(row)
        cs.append(col)
    skirt = loft(terre, rows[:6], "Snow", cs[:6], cap=False)
    tracked_snow(terre, rows[5:], cs[5:], skirt[-1])
    bed = Part("04 · Mineral basin and submerged pebbles")
    rows = []
    for r, z in (
        (1.055, 1.18),
        (1.035, 0.97),
        (0.97, 0.78),
        (0.86, 0.64),
        (0.69, 0.52),
        (0.44, 0.49),
        (0.18, 0.48),
        (0.026, 0.485),
    ):
        row = []
        for t in ang:
            xy = bath_xy(t, r)
            row.append((*xy, z + 0.018 * r * math.sin(8 * t + 0.6) * math.sin(r * PI)))
        rows.append(row)
    indices = loft(
        bed,
        rows,
        "Spring floor",
        cap=False,
        uv_fn=lambda j, i, p: ((p[0] - CX) / (RX * 2.15) + 0.5, (p[1] - CY) / (RY * 2.15) + 0.5),
    )
    bed.face(tuple(indices[-1]), "Spring floor")
    from mathutils.bvhtree import BVHTree

    floor = BVHTree.FromPolygons(bed.vertices, bed.faces)
    for _ in range(61):
        t = RNG.random() * TAU
        r = RNG.uniform(0.45, 0.94)
        x, y = bath_xy(t, r)
        z = 0.48 + 0.31 * (max(0, (r - 0.45) / 0.55) ** 1.75)
        s = RNG.uniform(0.052, 0.18)
        color = rgb(RNG.choice(["#729188", "#879d92", "#6d8b83", "#9aac96", "#75877e", "#a5b2a4"]))
        ell(bed, (x, y, z), (s, s * RNG.uniform(0.6, 1.2), s * 0.35), "Mineral basin", color, 8, 4)
    return floor


ROCK_PALETTE = ["#65706f", "#626c6b", "#808a87", "#817b70", "#6f7b77", "#777b78", "#5c6d71", "#878073"]


def stone(g, snow_group, center, axes, height, orientation, seed, cap=0, wet=True, base_z=0.78, tone=None):
    rng = random.Random(seed)
    n = rng.choice((11, 12, 13, 14))
    x, y = center
    a, b = axes
    da, db = math.cos(orientation), math.sin(orientation)
    off = rng.uniform(0, TAU)
    phase = rng.uniform(0, TAU)
    pitch = rng.uniform(-0.14, 0.14)
    roll = rng.uniform(-0.15, 0.15)
    length = [rng.uniform(0.89, 1.10) for i in range(n)]
    angles = [TAU * (i + rng.uniform(-0.13, 0.13)) / n + off for i in range(n)]
    floors = (0, 0.12, 0.31, 0.60, 0.78, 0.90, 0.965, 1)
    sizes = (0.67, 0.88, 1, 1.01, 0.91, 0.76, 0.49, 0.045)

    def point(i, h):
        t = angles[i]
        rr = float(np.interp(h, floors, sizes)) * length[i]
        dx = a * (rr * math.cos(t) + 0.08 * h * math.cos(phase))
        dy = b * (rr * math.sin(t) + 0.10 * h * math.sin(phase))
        z = base_z + height * (
            h
            + h * (roll * rr * math.sin(t) + pitch * rr * math.cos(t))
            + 0.033 * math.sin(3 * t + phase) * math.sin(h * PI)
        )
        return V((x + da * dx - db * dy, y + db * dx + da * dy, z))

    base_col = rgb(tone or rng.choice(ROCK_PALETTE))
    shade = [rng.uniform(0.81, 1.16) for _ in angles]
    rings = [[point(i, h) for i in range(n)] for h in floors]
    colors = [
        [
            tint(base_col, shade[i] * (0.66 + 0.34 * h) + 0.045 * math.sin(angles[i] * 3 + h * 9))
            for i in range(n)
        ]
        for h in floors
    ]
    loft(g, rings, "Wet basalt" if wet else "Stone", colors)
    if not cap:
        return
    starts = [
        min(
            0.91,
            max(
                0.49,
                0.805
                + 0.08 * math.sin(angles[i] + phase)
                + 0.085 * math.cos(angles[i] * 3 + off)
                + rng.uniform(-0.05, 0.04),
            ),
        )
        for i in range(n)
    ]
    rows = []
    cs = []
    for s, dh in (
        (0, 0.002),
        (0.045, 0.019),
        (0.14, 0.061),
        (0.37, 0.08),
        (0.62, 0.094),
        (0.86, 0.098),
        (1, 0.086),
    ):
        row = []
        c = []
        for i, t in enumerate(angles):
            h = starts[i] + (1 - starts[i]) * s
            p = point(i, h)
            thick = cap * (dh + 0.013 * math.sin(3 * t + phase) * math.sin(PI * s))
            p += (
                V((da * math.cos(t) - db * math.sin(t), db * math.cos(t) + da * math.sin(t), 0))
                * cap
                * 0.023
                * math.sin(PI * min(1, s * 2.8))
            )
            p.z += thick
            row.append(p)
            c.append(mix(SNOW_EDGE, SNOW, min(1, 0.22 + s * 2.2)))
        rows.append(row)
        cs.append(c)
    ids = loft(snow_group, rows, "Snow", cs, cap=False)
    snow_group.face(tuple(ids[-1]), "Snow")


def rocks():
    g = Part("05 · River stones at the waterline")
    c = Part("06 · Snow on the stone rim")
    # The retaining course closes the gaps between the individual upper stones.
    rows = []
    cols = []
    n = 92
    for r, z, shade in (
        (1.070, 0.82, 0.85),
        (1.073, 1.21, 0.92),
        (1.056, 1.365, 1.08),
        (1.018, 1.398, 1.13),
        (0.994, 1.373, 0.98),
        (0.986, 0.87, 0.78),
    ):
        row = []
        color = []
        for j in range(n):
            t = TAU * j / n
            xy = bath_xy(t, r)
            row.append((*xy, z + 0.013 * math.sin(9 * t + 0.45) + 0.009 * math.sin(19 * t)))
            color.append(tint(rgb("#556963"), shade + 0.06 * math.sin(t * 11)))
        rows.append(row)
        cols.append(color)
    loft(g, rows, "Wet basalt", cols, cap=False)
    count = 20
    for i in range(count):
        t = TAU * i / count + 0.025 * math.sin(i * 2.4)
        p = bath_xy(t)
        tangent = bath_xy(t + 0.03) - bath_xy(t - 0.03)
        yaw = math.atan2(tangent[1], tangent[0])
        speed = np.linalg.norm(tangent) / 0.06
        length = speed * PI / count * RNG.uniform(0.99, 1.18)
        width = RNG.uniform(0.31, 0.43)
        h = RNG.uniform(0.65, 0.93) + 0.085 * math.sin(t)
        cap = RNG.uniform(0.78, 1.6) if i not in [1, 6, 12, 16, 18] else 0
        stone(g, c, p, (length, width), h, yaw, 219 + i, cap, True, 0.71)
    mantle = Part("07 · Garden outcrops and river gravel")
    frost = Part("08 · Snow on the garden rocks")
    clusters = [
        (-2.95, 1.48, 0.77, 0.56, 0.70, 1.0),
        (-3.05, 2.11, 0.53, 0.47, 0.43, 1.4),
        (-2.35, 2.08, 0.45, 0.33, 0.40, 0.9),
        (2.06, 2.12, 0.57, 0.36, 0.52, 1.5),
        (3.35, 1.79, 0.53, 0.37, 0.45, 1.0),
        (3.33, 0.56, 0.39, 0.29, 0.32, 0.8),
        (-3.41, -1.60, 0.42, 0.34, 0.35, 1.1),
        (-2.85, -2.35, 0.37, 0.28, 0.30, 0.7),
        (-1.92, -2.83, 0.32, 0.22, 0.28, 0.5),
        (1.35, -2.88, 0.37, 0.22, 0.24, 0.75),
        (-0.78, 2.30, 0.35, 0.28, 0.34, 0.85),
        (3.10, 2.36, 0.40, 0.27, 0.29, 0.9),
    ]
    for i, (x, y, a, b, h, s) in enumerate(clusters):
        stone(mantle, frost, (x, y), (a, b), h, 0.6 * i, 1110 + i, s, False, 0.83)
    for i in range(51):
        t = RNG.random() * TAU
        k = RNG.uniform(1.13, 1.27)
        x, y = bath_xy(t, k)
        outer = rounded_perimeter(math.atan2(y, x), 4.09, 3.38, 6.6)
        if math.hypot(x, y) > np.linalg.norm(outer):
            continue
        s = RNG.uniform(0.045, 0.15)
        ell(
            mantle,
            (x, y, 0.922),
            (s, s * RNG.uniform(0.57, 0.94), s * 0.41),
            "Stone",
            rgb(RNG.choice(ROCK_PALETTE)),
            9,
            4,
        )


def water_height(x, y):
    r1 = math.hypot((x + 0.28) * 1.08, (y + 0.31) * 0.82)
    r2 = math.hypot(x - STREAM_END.x, y - STREAM_END.y)
    return (
        WATER_Z
        + 0.011 * math.cos(r1 * 12.2 + 0.5) * math.exp(-0.63 * r1)
        + 0.013 * math.cos(r2 * 19) * math.exp(-1.85 * r2)
        + 0.008 * math.sin(x * 3.8 + y * 1.6) * math.sin(y * 3.4 - x * 0.5)
    )


def water():
    g = Part("09 · Translucent spring water")
    rings = []
    n = 104
    nr = 26
    pivot = g.vert((CX, CY, water_height(CX, CY)))
    for j in range(1, nr + 1):
        r = j / nr * 1.012
        row = []
        for i in range(n):
            t = TAU * i / n
            x, y = bath_xy(t, r)
            row.append(g.vert((x, y, water_height(x, y))))
        rings.append(row)
    for i in range(n):
        k = (i + 1) % n
        g.face((pivot, rings[0][i], rings[0][k]), "Water")
        for a, b in zip(rings, rings[1:]):
            g.face((a[i], b[i], b[k], a[k]), "Water")
    crest = Part("10 · Menisci, ripples and falling spring")
    fn = lambda x, y: water_height(x, y) + 0.004
    # Narrow glints are broken before they reach the stones or the animal.
    for rx, ry, start, end, w in (
        (0.92, 1.60, 3.62, 5.25, 0.012),
        (1.04, 1.74, 4.0, 5.38, 0.011),
        (1.04, 1.73, 0.09, 1.02, 0.016),
        (1.24, 1.89, 2.02, 2.65, 0.009),
        (1.54, 2.01, 3.97, 4.69, 0.014),
        (1.56, 2.05, 0.10, 0.70, 0.011),
        (1.80, 2.08, 5.02, 5.45, 0.008),
    ):
        arc(crest, (-0.21, -0.25), rx, ry, start, end, 0, w, angle=-0.38, height_fun=fn)
    return crest


YAW = -0.42
ANIMAL_ORIGIN = V((-0.15, -0.22, 0))
LOCAL_X = V((math.cos(YAW), math.sin(YAW), 0))
LOCAL_Y = V((-math.sin(YAW), math.cos(YAW), 0))


def cpoint(p):
    return ANIMAL_ORIGIN + LOCAL_X * p[0] + LOCAL_Y * p[1] + UP * p[2]


def cdir(d):
    return LOCAL_X * d[0] + LOCAL_Y * d[1] + UP * d[2]


def skin(y, t):
    rx, low, high = section(y)
    blunt = squareness(y)
    z = (high + low) / 2 - (high - low) / 2 * signed_pow(math.cos(t), 0.80 - 0.26 * blunt)
    cheek = 0.112 * math.exp(-(((y + 0.63) / 0.42) ** 2) - ((z - 1.94) / 0.40) ** 2)
    whisker_pad = 0.047 * math.exp(-(((y + 1.62) / 0.23) ** 2) - ((z - 1.99) / 0.20) ** 2)
    brow = 0.057 * math.exp(-(((y + 0.82) / 0.25) ** 2) - ((z - 2.435) / 0.088) ** 2)
    x = (rx + cheek + whisker_pad + brow) * signed_pow(math.sin(t), 0.84 - 0.19 * blunt)
    # The bather turns its head while its broad, wet back sweeps to camera right.
    s = min(1, max(0, (y - 0.02) / 1.86))
    x += 0.65 * s * s * (3 - 2 * s)
    return V((x, y, z))


def skin_side(y, z, sign):
    rx, lo, hi = section(y)
    zz = max(-1, min(1, ((hi + lo) / 2 - z) / ((hi - lo) / 2)))
    angle = math.acos(signed_pow(zz, 1 / (0.80 - 0.26 * squareness(y)))) * sign
    p = skin(y, angle)
    n = (
        (skin(y + 0.001, angle) - skin(y - 0.001, angle))
        .cross(skin(y, angle + 0.001) - skin(y, angle - 0.001))
        .normalized()
    )
    return p, n


def face_mark(g, params, sign, width, color, offset=0.009):
    pts = []
    for y, z in params:
        p, n = skin_side(y, z, sign)
        pts.append(cpoint(p + n * offset))
    stroke(
        g,
        pts,
        [width * (0.10 + 0.90 * math.sin(PI * i / (len(pts) - 1)) ** 0.53) for i in range(len(pts))],
        "Face",
        rgb(color),
        7,
    )


def on_front(x, z):
    a, b = SLICES[0, 0], -1.25
    for _ in range(20):
        m = (a + b) / 2
        rx, lo, hi = section(m)
        side = skin_side(m, z, 1)[0].x if lo < z < hi else 0
        if side < abs(x) + 0.0003:
            a = m
        else:
            b = m
    return V((x, b - 0.009, z))


def ear(g, sgn):
    origin = cpoint((sgn * 0.593, -0.225, 2.831))
    n = cdir((sgn * 0.57, -0.79, 0.19)).normalized()
    u = UP.cross(n).normalized()
    v = n.cross(u)
    lean = sgn * 0.105
    rings = []
    colors = []
    # Dished pinnae. A continuous dark outer edge curls around the chestnut cup.
    profile = [
        (0.11, -0.15, "#785339"),
        (0.61, -0.12, "#94704a"),
        (0.91, -0.068, "#a37d52"),
        (1, 0.024, "#5c4231"),
        (0.97, 0.055, "#50382d"),
        (0.84, 0.077, "#76543a"),
        (0.70, 0.073, "#976f4f"),
        (0.57, 0.046, "#92694e"),
        (0.36, 0.019, "#694b39"),
        (0.045, 0.012, "#553c31"),
    ]
    for r, d, hue in profile:
        row = []
        col = []
        for i in range(24):
            t = TAU * i / 24
            a = math.cos(t)
            b = math.sin(t)
            x = (0.219 * a * (0.87 + 0.13 * b) + lean * 0.19 * b) * r
            z = (0.197 * b + 0.029 * a * b - 0.018 * max(0, b) ** 4) * r
            row.append(origin + u * x + v * z + n * (d + 0.024 * a * b * r))
            col.append(tint(rgb(hue), 1 + 0.085 * b))
        rings.append(row)
        colors.append(col)
    loft(g, rings, "Face", colors)
    pts = [
        origin
        + u * (sgn * (0.012 + 0.068 * k / 8))
        + v * (-0.080 + 0.134 * k / 8)
        + n * (0.032 + 0.020 * math.sin(PI * k / 8))
        for k in range(9)
    ]
    stroke(g, pts, [0.002 + 0.019 * math.sin(PI * k / 8) for k in range(9)], "Face", rgb("#a27a58"))


def animal():
    body = Part("11 · Capybara | continuous head, shoulders and submerged body")
    ys = []
    for a, b in zip(SLICES, SLICES[1:]):
        steps = max(3, math.ceil((b[0] - a[0]) / 0.056))
        ys.extend(a[0] + (b[0] - a[0]) * i / steps for i in range(steps))
    ys.append(SLICES[-1, 0])
    n = 68
    rows = []
    for y in ys:
        row = []
        for j in range(n + 1):
            t = TAU * j / n
            row.append(body.vert(cpoint(skin(y, t)), uv=((y - ys[0]) / (ys[-1] - ys[0]), j / n)))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for j in range(n):
            body.face((a[j], b[j], b[j + 1], a[j + 1]), "Coat")
    body.face(tuple(rows[0][:-1]), "Coat")
    body.face(tuple(rows[-1][:-1][::-1]), "Coat")
    g = Part("12 · Ears, sleeping eyelids and soft whiskers")
    for sign in (-1, 1):
        ear(g, sign)
        # The upper lid has a padded, ochre edge and tapers into a dark curved lash.
        pars = []
        for k in range(17):
            t = k / 16
            pars.append((-1.014 + 0.395 * t, 2.390 + 0.024 * t - 0.056 * math.sin(PI * t)))
        eyelid = []
        for j, (y, z) in enumerate(pars):
            half = math.sin(PI * j / 16)
            row = []
            for t in (0, 0.48, 1):
                p, norm = skin_side(y, z - 0.036 * half * t, sign)
                row.append(g.vert(cpoint(p + norm * (0.009 + 0.012 * half * math.sin(PI * t)))))
            eyelid.append(row)
        for a, b in zip(eyelid, eyelid[1:]):
            for j in (0, 1):
                face = (a[j], b[j], b[j + 1], a[j + 1])
                g.face(face if sign < 0 else face[::-1], "Eye")
        face_mark(g, [(y, z + 0.025) for y, z in pars], sign, 0.028, "#a67951", 0.007)
        face_mark(g, pars, sign, 0.016, "#392d27", 0.016)
        face_mark(
            g,
            [(y, z - 0.042 * math.sin(PI * (j + 3) / 16)) for j, (y, z) in enumerate(pars[3:-2])],
            sign,
            0.006,
            "#ba9268",
            0.007,
        )
    # The nares follow the anterior plane of the head itself.
    nose = Part("13 · Muzzle, nostril rims and split upper lip")
    for sgn in (-1, 1):
        xx = 0.264 * sgn
        zz = 2.197
        orig = on_front(xx, zz)
        right = on_front(xx + 0.003, zz) - on_front(xx - 0.003, zz)
        up = on_front(xx, zz + 0.003) - on_front(xx, zz - 0.003)
        norm = cdir(right.cross(up)).normalized()
        uu = cdir(right.normalized() + up.normalized() * (sgn * 0.40))
        uu = (uu - norm * uu.dot(norm)).normalized()
        vv = norm.cross(uu)
        center = cpoint(orig) - norm * 0.0025
        ell(nose, center, (0.105, 0.047, 0.013), "Nose", rgb("#644935"), 22, 8, (uu, vv, norm))
        ell(
            nose,
            center + norm * 0.009 + vv * 0.005,
            (0.079, 0.025, 0.008),
            "Face",
            rgb("#2e2723"),
            22,
            8,
            (uu, vv, norm),
        )
    pts = [cpoint(on_front(0, 2.018 - 0.182 * i / 9)) for i in range(10)]
    stroke(nose, pts, [0.003 + 0.007 * math.sin(PI * i / 9) for i in range(10)], "Face", rgb("#594337"))
    for s in [-1, 1]:
        front = [
            on_front(s * 0.36 * t / 13, 1.832 - 0.028 * math.sin(PI * t / 13) + 0.010 * t / 13)
            for t in range(14)
        ]
        stroke(
            nose,
            [cpoint(p) for p in front],
            [0.004 + 0.007 * math.sin(PI * (i + 1) / 17) for i in range(14)],
            "Face",
            rgb("#514036"),
        )
        pars = [
            (front[-1].y + 0.25 * t / 12, 1.842 + 0.028 * t / 12 - 0.012 * math.sin(PI * t / 12))
            for t in range(13)
        ]
        face_mark(nose, pars, s, 0.010, "#614839")
        for j, (y, z) in enumerate(
            ((-1.72, 2.085), (-1.635, 2.068), (-1.55, 2.046), (-1.684, 1.986), (-1.597, 1.976), (-1.505, 1.98))
        ):
            p, norm = skin_side(y, z, s)
            n = cdir(norm).normalized()
            u, v, _ = frame(n)
            orig = cpoint(p) + n * 0.004
            ell(nose, orig, (0.019, 0.017, 0.007), "Face", rgb("#684f42"), 10, 5, (u, v, n))
            if j in (0, 2, 4):
                pts = []
                for k in range(9):
                    t = k / 8
                    pts.append(
                        orig
                        + cdir(
                            (
                                s * (0.24 + 0.04 * (j % 3)) * t,
                                -(0.12 + 0.045 * j) * t + 0.02 * t * t,
                                0.04 * t - 0.085 * t * t,
                            )
                        )
                    )
                stroke(nose, pts, [0.0061 * (1 - 0.89 * k / 8) for k in range(9)], "Face", rgb("#9d856a"), 5)
    # Fine guard hairs lift from the dry nape. The soaked back lies smooth.
    locks = Part("14 · Laid guard hairs")
    for side in (-1, 1):
        for k in range(32):
            y = RNG.uniform(-0.45, 1.36)
            theta = side * RNG.uniform(1.95, 3.09)
            start = skin(y, theta)
            L = RNG.uniform(0.078, 0.175)
            pts = []
            for j in range(5):
                t = j / 4
                p = skin(y + L * t, theta + side * 0.064 * t)
                p.x += side * 0.006 * t
                p.z += 0.002 + 0.017 * t * t
                pts.append(cpoint(p))
            if start.z > 1.46:
                hue = rgb(RNG.choice(["#af8156", "#bb8f5e", "#ab8056", "#b18a60"]))
                if y < 0.57:
                    stroke(locks, pts, [0.003, 0.0065, 0.006, 0.003, 0.0007], "Face", hue, 5)
    from mathutils.bvhtree import BVHTree

    return BVHTree.FromPolygons(body.vertices, body.faces)


def leaf(g, a, b, width, bend, mat="Plants", colors=("#335d50", "#497656"), vein=True, normal=None):
    a, b = V(a), V(b)
    d = b - a
    n = V(normal or (0, 0, 1)).normalized()
    across = n.cross(d).normalized()
    if across.length < 0.01:
        across = V((1, 0, 0))
    n = d.normalized().cross(across).normalized()
    ids = []
    mid = []
    for j in range(9):
        f = j / 8
        s = math.sin(PI * f)
        p = a + d * f + V(bend) * s
        w = width * (0.015 + 0.985 * s**0.79) * (1.10 - 0.22 * f)
        ridge = p + n * (width * 0.19 * s)
        mid.append(ridge)
        ids.append(
            [
                g.vert(p - across * w, rgb(colors[0])),
                g.vert(ridge, rgb(colors[1])),
                g.vert(p + across * w, rgb(colors[0])),
            ]
        )
    for l, r in zip(ids, ids[1:]):
        for j in (0, 1):
            g.face((l[j], r[j], r[j + 1], l[j + 1]), mat)
    if vein:
        stroke(
            g,
            mid[::2],
            [0.0012 + width * 0.046 * math.sin(PI * j / 4) ** 0.5 for j in range(5)],
            mat,
            rgb("#94a16c"),
            4,
        )


def yuzu(head):
    g = Part("15 · One yuzu | dimpled peel, calyx and leaf")

    def crown_at(p):
        hit = head.ray_cast(V((p.x * UNIT, p.y * UNIT, 2)), -UP)[0]
        return hit.z / UNIT

    center = cpoint((-0.012, -0.235, 0))
    rx, ry, rz = 0.378, 0.355, 0.285
    center.z = crown_at(center) + rz
    n = 52
    m = 27
    rows = []
    for j in range(1, m):
        p = -PI / 2 + PI * j / m
        sp, cp = math.sin(p), math.cos(p)
        row = []
        for i in range(n + 1):
            t = TAU * i / n
            lobes = (
                0.039 * math.sin(7 * t + sp * 2.4)
                + 0.028 * math.sin(4 * t + 0.3)
                + 0.019 * math.cos(13 * t + 3 * sp)
            ) * cp
            rr = cp**0.87 * (1 + lobes)
            z = rz * signed_pow(sp, 1.11) - 0.047 * max(0, sp) ** 13 + 0.008 * math.sin(5 * t) * cp**2
            pnt = center + LOCAL_X * (rx * rr * math.cos(t)) + LOCAL_Y * (ry * rr * math.sin(t)) + UP * z
            if sp < -0.90:
                f = min(1, max(0, (math.hypot(pnt.x - center.x, pnt.y - center.y) - 0.050) / 0.089))
                f = f * f * (3 - 2 * f)
                pnt.z = (1 - f) * crown_at(pnt) + f * pnt.z
            row.append(g.vert(pnt, uv=(i / n, j / m)))
        rows.append(row)
    bot = g.vert(center - UP * rz, uv=(0.5, 0))
    top = g.vert(center + UP * (rz - 0.047), uv=(0.5, 1))
    for i in range(n):
        g.face((bot, rows[0][i + 1], rows[0][i]), "Yuzu")
        g.face((rows[-1][i], rows[-1][i + 1], top), "Yuzu")
        for a, b in zip(rows, rows[1:]):
            g.face((a[i], a[i + 1], b[i + 1], b[i]), "Yuzu")
    p0 = center + UP * (rz - 0.047)
    ell(g, p0 + UP * 0.014, (0.066, 0.063, 0.025), "Plants", rgb("#7a773c"), 14, 6)
    pts = [p0 + V((0.001, 0, 0.01)), p0 + V((0.023, 0.004, 0.09)), p0 + V((0.076, 0.016, 0.147))]
    stroke(g, pts, [0.028, 0.025, 0.016], "Plants", rgb("#656037"), 9)
    a = pts[1] + V((0.024, 0, 0.020))
    b = a + V((0.405, -0.087, 0.058))
    leaf(g, a, b, 0.099, (0, 0.005, 0.073), colors=("#365d43", "#618342"), normal=(0.16, -0.46, 0.87))
    leaf(
        g,
        pts[1] - V((0.028, 0, 0.020)),
        a + V((0.055, -0.011, 0.027)),
        0.029,
        (0, 0, 0.019),
        colors=("#456941", "#718844"),
        vein=False,
    )
    for i in range(5):
        t = TAU * i / 5
        end = p0 + V((0.077 * math.cos(t), 0.077 * math.sin(t), 0.011))
        leaf(g, p0 + UP * 0.016, end, 0.017, (0, 0, 0.006), colors=("#738042", "#8b924a"), vein=False)


def tucked_paws(floor):
    paws = Part("31 · Resting paws below the water, four front toes and three hind toes")

    def floor_z(x, y):
        p = cpoint((x, y, 0)) * UNIT
        hit = floor.ray_cast(V((p.x, p.y, 2)), -UP)[0]
        return hit.z / UNIT

    for hind, y in ((False, 0.05), (True, 1.25)):
        spine = 0.47 if hind else 0.012
        for sign in (-1, 1):
            x = spine + sign * (0.54 if hind else 0.46)
            z = floor_z(x, y)
            knee = (x + sign * 0.047, y + (0.26 if hind else 0.13), z + 0.33)
            root = (x - sign * 0.043, y + 0.20, z + 0.62)
            wrist = (x, y + 0.087, z + 0.082)
            stroke(
                paws,
                [cpoint(root), cpoint(knee), cpoint(wrist)],
                [0.18, 0.134, 0.092],
                "Damp paws",
                rgb("#795a43"),
                9,
            )
            ell(
                paws,
                cpoint((x, y, z + 0.079)),
                (0.15, 0.205, 0.079),
                "Damp paws",
                rgb("#745943"),
                10,
                5,
                (LOCAL_X, LOCAL_Y, UP),
            )
            toes = 3 if hind else 4
            for i in range(toes):
                f = 2 * i / (toes - 1) - 1
                length = 0.235 - 0.039 * abs(f)
                rings, colors = [], []
                for step, width, height, hue in (
                    (0, 0.048, 0.046, "#70553f"),
                    (0.51, 0.050, 0.038, "#795c44"),
                    (0.79, 0.041, 0.030, "#685142"),
                    (1, 0.010, 0.011, "#55443b"),
                ):
                    px, py = x + f * (0.078 + 0.054 * step), y - 0.085 - length * step
                    p = cpoint((px, py, floor_z(px, py) + height))
                    rings.append(
                        [
                            p
                            + LOCAL_X * (width * math.cos(TAU * j / 6))
                            + UP * (height * math.sin(TAU * j / 6))
                            for j in range(6)
                        ]
                    )
                    colors.append([rgb(hue)] * 6)
                loft(paws, rings, "Damp paws", colors)


def body_water_contact():
    g = Part("29 · Water climbing the immersed shoulders")

    def pole_height(y, upper):
        p = cpoint(skin(y, PI if upper else 0))
        return p.z - water_height(p.x, p.y)

    def contact_y(a, b, upper):
        for _ in range(28):
            m = (a + b) / 2
            if pole_height(m, upper) > 0:
                a = m
            else:
                b = m
        return (a + b) / 2

    front = contact_y(-1.49, -0.94, False)
    rear = contact_y(1.59, 1.90, True)
    out = []
    n = 40
    for sgn in (1, -1):
        for j in range(n):
            f = j / n if sgn == 1 else 1 - j / n
            y = front + (rear - front) * (0.5 - 0.5 * math.cos(PI * f))
            z = WATER_Z
            for _ in range(4):
                p = cpoint(skin_side(y, z, sgn)[0])
                z = water_height(p.x, p.y)
            p.z = z
            out.append(p)
    rows = []
    norms = []
    for i, p in enumerate(out):
        d = out[(i + 1) % len(out)] - out[(i - 1) % len(out)]
        norms.append(V((d.y, -d.x, 0)).normalized())
    for spread, h in ((-0.010, 0.025), (0.005, 0.021), (0.027, 0.010), (0.062, 0.0025)):
        row = []
        for p, norm in zip(out, norms):
            q = p + norm * spread
            q.z = water_height(q.x, q.y) + h
            row.append(q)
        rows.append(row)
    loft(g, rows, "Meniscus", cap=False, reverse=True)
    for a, b in ((5, 22), (25, 34), (46, 60), (69, 76)):
        indices = []
        for j in range(a, b + 1):
            p = out[j]
            norm = norms[j]
            f = (j - a) / (b - a)
            half = 0.007 * math.sin(PI * f) ** 0.65
            row = []
            for off in (0.018 - half, 0.018 + half):
                q = p + norm * off
                q.z = water_height(q.x, q.y) + 0.018
                row.append(g.vert(q))
            indices.append(row)
        for l, r in zip(indices, indices[1:]):
            g.face((l[0], l[1], r[1], r[0]), "Ripple")


def bamboo(g, a, b, r, hue, spacing, seed, hollow=False, slant=0):
    a, b = V(a), V(b)
    u, v, w = frame(b - a)
    length = (b - a).length
    rng = random.Random(seed)
    n = 14 if r > 0.115 else 10
    ang = [TAU * i / n for i in range(n)]
    phase = rng.uniform(0, TAU)
    sidecolor = [1 + 0.115 * math.cos(t + 0.5) + rng.uniform(-0.05, 0.05) for t in ang]
    nodes = []
    pos = spacing * rng.uniform(0.47, 0.86)
    while pos < length - r * 0.62:
        nodes.append(pos)
        pos += spacing * rng.uniform(0.90, 1.08)
    profile = [(0, 0.96, 0.82), (0.022, 0.99, 0.94)]
    for pos in nodes:
        profile += [
            (pos - r * 0.23, 1, 0.88),
            (pos - r * 0.048, 1.115, 0.73),
            (pos + r * 0.082, 1.125, 1.16),
            (pos + r * 0.24, 1.016, 1.09),
        ]
    profile += [(length - 0.025, 0.98, 1), (length, 1, 1.06)]
    profile.sort()
    col = rgb(hue)
    rings = []
    cs = []
    for z, m, brightness in profile:
        row = []
        colors = []
        for j, t in enumerate(ang):
            rr = r * m * (1 + 0.014 * math.sin(3 * t + phase) + 0.008 * math.sin(t + z))
            cut = slant * math.sin(t) * max(0, (z - length + 0.07) / 0.07)
            row.append(a + w * (z + cut) + rr * (u * math.cos(t) + v * math.sin(t)))
            colors.append(tint(col, brightness * sidecolor[j] * (0.98 + 0.04 * math.sin(z * 8 + t))))
        rings.append(row)
        cs.append(colors)

    def cane_uv(j, i, p):
        d = V(p) - a
        return (d.dot(u) * 1.55 + d.dot(v) * 0.71 + phase * 0.2, d.dot(w) * 0.61 + seed * 0.062)

    ids = loft(g, rings, "Bamboo", cs, cap=False, uv_fn=cane_uv)
    g.face(tuple(ids[0][::-1]), "Bamboo")
    inner = 0.71 if hollow else 0.75
    depth = min(length * 0.25, r * 1.72) if hollow else r * 0.14
    row = []
    bottom = []
    for t in ang:
        d = u * math.cos(t) + v * math.sin(t)
        row.append(b + w * slant * math.sin(t) + d * r * inner)
        bottom.append(b - w * depth + d * r * inner * 0.92)
    rows = [rings[-1], row, bottom]
    cols = [[rgb("#d2bb86")] * n, [rgb("#b09a68")] * n, [rgb("#665539") if hollow else rgb("#9c875c")] * n]
    ids = loft(g, rows, "Bamboo", cols, cap=False)
    g.face(tuple(ids[-1]), "Bamboo")


def snow_line(g, a, b, r, seed):
    a, b = V(a), V(b)
    u, v, w = frame(b - a)
    up = (UP - w * UP.dot(w)).normalized()
    across = up.cross(w).normalized()
    rng = random.Random(seed)
    segments = max(5, int((b - a).length / 0.14))
    rows = []
    cols = []
    for i in range(segments + 1):
        f = i / segments
        spread = (0.13 + 0.87 * (math.sin(PI * f) ** 0.28)) * (
            0.97 + 0.08 * math.sin(f * PI * 5) + rng.uniform(-0.04, 0.04)
        )
        height = r * (0.42 + 0.11 * math.sin(f * PI * 4) + rng.uniform(-0.06, 0.06))
        mid = a + (b - a) * f + up * (r * 0.73)
        row = []
        cs = []
        for j in range(10):
            t = TAU * j / 10
            row.append(
                mid
                + across * (r * 1.04 * spread * math.cos(t))
                + up * ((height if math.sin(t) > 0 else r * 0.24) * spread * math.sin(t))
            )
            cs.append(mix(SNOW_EDGE, SNOW, max(0, 0.48 + 0.52 * math.sin(t))))
        rows.append(row)
        cols.append(cs)
    loft(g, rows, "Snow", cols)


def post_snow(g, p, r, seed):
    p = V(p)
    rng = random.Random(seed)
    phi = rng.random() * TAU
    rings = []
    cols = []
    n = 13
    for f, h, side, col in (
        (0.81, -0.06, 0.012, SNOW_EDGE),
        (1.01, 0.028, 0.04, SNOW_EDGE),
        (1.05, 0.19, 0.08, SNOW),
        (0.87, 0.38, 0.12, SNOW),
        (0.50, 0.48, 0.18, SNOW_HIGH),
        (0.06, 0.51, 0.19, SNOW),
    ):
        row = []
        for i in range(n):
            t = TAU * i / n
            rr = f * r * (1 + 0.027 * math.sin(t * 3 + phi) + 0.026 * math.cos(t * 4 - phi))
            drop = 0.095 * max(0, math.cos(t - phi)) ** 5 * min(1, 2 * f)
            row.append(p + V((rr * math.cos(t) - side * r, rr * math.sin(t) + 0.4 * side * r, r * (h - drop))))
        rings.append(row)
        cols.append([col] * n)
    loft(g, rings, "Snow", cols)


def knot(g, p, horizontal, post_r, rail_r):
    p = V(p)
    h = V(horizontal).normalized()
    front = h.cross(UP).normalized()
    col = rgb("#50483a")
    light = rgb("#82735a")
    for dx, dz in ((-0.033, -0.019), (0.018, 0.023)):
        for sign in (-1, 1):
            pts = []
            for i in range(5):
                t = i / 4
                pts.append(
                    p
                    + h * (dx + post_r * 1.13 * (2 * t - 1))
                    + UP * (dz + sign * rail_r * 1.2 * (2 * t - 1))
                    + front * (rail_r * (0.83 + 0.32 * math.sin(PI * t)))
                )
            stroke(g, pts, 0.0165, "Wood", col, 4)
    orig = p + h * 0.064 + front * (rail_r * 1.08) - UP * 0.018
    ell(g, orig, (0.030, 0.028, 0.032), "Wood", light, 7, 4)
    for sign in (-1, 1):
        pts = [
            orig,
            orig + h * sign * 0.025 - UP * 0.050,
            orig + h * sign * 0.055 - UP * (0.087 if sign == 1 else 0.118),
        ]
        stroke(g, pts, [0.014, 0.013, 0.006], "Wood", col, 4)


def fence():
    g = Part("16 · Yotsume-gaki bamboo fence")
    snow = Part("17 · Snow gathered on bamboo")
    ties = Part("18 · Hand-tied fence lashings")
    xs = [-3.55, -1.32, 0.94, 3.35]
    y = 2.73
    hues = ["#a7a078", "#ada37a", "#a79f72", "#b1a57c"]

    def top(x):
        return 2.65 - 0.14 * (x + 3.55) / 6.9

    for i, x in enumerate(xs):
        z = top(x) + (0.39 if i in (0, 3) else 0.24)
        r = 0.135 if i in (0, 3) else 0.110
        bamboo(g, (x, y, 0.79), (x + 0.012 * math.sin(i), y, z), r, hues[i], 0.82, 448 + i)
        post_snow(snow, (x, y, z), r, 779 + i)
    for j, (z, r) in enumerate(((1.68, 0.078), (2.65, 0.088))):
        a = V((-3.67, y - 0.11, z))
        b = V((3.47, y - 0.11, z - 0.14))
        bamboo(g, a, b, r, "#9f946d", 1.0, 530 + j)
        if j == 1:
            for f1, f2 in ((0.015, 0.298), (0.32, 0.546), (0.565, 0.677), (0.698, 0.91), (0.93, 0.985)):
                snow_line(snow, a + (b - a) * f1, a + (b - a) * f2, r * 1.15, 339 + int(f1 * 100))
        for x in xs:
            knot(ties, (x, y - 0.11, z - 0.14 * (x + 3.67) / 7.14), (1, 0, 0), 0.12, r)
    for i in range(3):
        for j in (1, 2, 3):
            f = j / 4
            x = xs[i] * (1 - f) + xs[i + 1] * f
            x0 = x + RNG.uniform(-0.025, 0.025)
            zt = top(x) + RNG.uniform(0.105, 0.228)
            r = RNG.uniform(0.047, 0.065)
            bamboo(
                g,
                (x0, y - 0.018, 0.82),
                (x, y - 0.018, zt),
                r,
                RNG.choice(["#bcb18a", "#b3aa83", "#aca27b"]),
                0.62,
                100 + i * 3 + j,
            )
            if j != 2:
                post_snow(snow, (x, y - 0.018, zt), r, 646 + i * 3 + j)
            knot(ties, (x, y - 0.11, top(x)), (1, 0, 0), r, 0.08)
    x = -3.55
    ys = [-0.05, 1.32, 2.73]
    for i, yc in enumerate(ys[:-1]):
        top_z = 2.32 + (yc + 0.05) / 2.78 * 0.34 + 0.26
        bamboo(g, (x, yc, 0.81), (x, yc, top_z), 0.121, hues[i], 0.83, 842 + i)
        post_snow(snow, (x, yc, top_z), 0.121, 224 + i)
    for j, z in enumerate((1.53, 2.32)):
        a = V((x + 0.10, -0.16, z))
        b = V((x + 0.10, 2.76, z + (0.34 if j else 0.15)))
        r = 0.073 if j == 0 else 0.088
        bamboo(g, a, b, r, "#a29873", 0.89, 883 + j)
        if j:
            for f1, f2 in ((0.03, 0.47), (0.53, 0.93)):
                snow_line(snow, a + (b - a) * f1, a + (b - a) * f2, r * 1.16, 778 + int(f1 * 10))
        for yc in ys:
            knot(ties, a + (b - a) * (yc + 0.16) / 2.92, (0, 1, 0), 0.12, r)
    for i, yc in enumerate((0.42, 0.86, 1.78, 2.23)):
        z = 2.32 + (yc + 0.05) / 2.78 * 0.34 + 0.13
        bamboo(g, (x, yc, 0.81), (x + 0.015, yc, z), 0.056, "#b6ac82", 0.66, 993 + i)


def spring(crest):
    g = Part("19 · Hollow bamboo spring spout")
    a = V((-2.78, 1.43, 0.88))
    upper = V((-2.78, 1.43, 2.54))
    r = 0.155
    bamboo(g, a, upper, r, "#8f9460", 0.64, 783, True)
    ell(g, upper + V((-0.031, 0.027, 0.019)), (0.138, 0.123, 0.049), "Snow", SNOW, 16, 6)
    back, lip = SPOUT_BACK, SPOUT_LIP
    r = 0.148
    bamboo(g, back, lip, r, "#9ba16b", 0.61, 672, True, 0.038)
    joint = back + (lip - back) * 0.23
    w = (lip - back).normalized()
    u, v, _ = frame(w)
    for f in [-0.032, 0, 0.035]:
        orig = joint + w * f
        pts = [
            orig + (u * math.cos(TAU * i / 17) + v * math.sin(TAU * i / 17)) * (r + 0.013) for i in range(18)
        ]
        stroke(g, pts, 0.016, "Wood", rgb("#65523e"), 5)
    snow_line(g, back + (lip - back) * 0.045, back + (lip - back) * 0.60, r * 0.94, 673)
    start, end = STREAM_START, STREAM_END
    rings = []
    highlights = []
    n = 14
    for j in range(17):
        t = j / 16
        p = start + V(
            (
                0.168 * (1 - (1 - t) ** 2),
                -0.146 * (1 - (1 - t) ** 2),
                -(start.z - end.z) * (0.28 * t + 0.72 * t * t),
            )
        )
        direct = V((0.336 * (1 - t), -0.292 * (1 - t), -(start.z - end.z) * (0.28 + 1.44 * t)))
        u, v, w = frame(direct)
        rr = 0.075 - 0.025 * t + 0.027 * t**7
        rings.append(
            [
                p
                + (u * math.cos(TAU * i / n) + v * math.sin(TAU * i / n))
                * rr
                * (1 + 0.055 * math.sin(3 * TAU * i / n + t * 9))
                for i in range(n)
            ]
        )
        toward = V((0.55, -0.84, 0.19))
        toward = (toward - w * toward.dot(w)).normalized()
        highlights.append(p + toward * (rr + 0.001))
    loft(crest, rings, "Stream")
    stroke(
        crest, highlights[3:13], [0.001 + 0.006 * math.sin(PI * i / 9) for i in range(10)], "Ripple", None, 5
    )
    fn = lambda x, y: water_height(x, y) + 0.009
    for rad, a, b, wi in (
        (0.15, 0.0, 5.92, 0.020),
        (0.254, -1.78, 2.58, 0.013),
        (0.374, 2.50, 5.9, 0.014),
        (0.51, -0.6, 1.63, 0.011),
        (0.59, 2.55, 4.31, 0.009),
    ):
        arc(crest, (end.x, end.y), rad, rad * 0.87, a, b, 0, wi, height_fun=fn)
    for i in range(10):
        t = TAU * i / 10
        k = RNG.uniform(0.067, 0.16)
        x = end.x + k * math.cos(t)
        y = end.y + k * math.sin(t)
        s = RNG.uniform(0.018, 0.042)
        ell(crest, (x, y, fn(x, y) + 0.007), (s, s * 0.80, s * 0.40), "Ripple", None, 9, 5)


def square_profile(g, p, profile, mat, col, n=40, curve=9):
    x, y, z = p
    rings = []
    cs = []
    for h, r, light in profile:
        rings.append(
            [
                (x + xy[0], y + xy[1], z + h)
                for xy in (rounded_perimeter(TAU * i / n, r, r, curve) for i in range(n))
            ]
        )
        cs.append([tint(col, light)] * n)
    loft(g, rings, mat, cs)


def lantern():
    g = Part("20 · Granite tōrō | plinth, shaft and carved firebox")
    fire = Part("21 · Amber light behind the four windows")
    roof = Part("22 · Snow-laden stone roof and lotus finial")
    x, y, z = 2.62, 1.39, 0.865
    dark = rgb("#727c7b")
    mid = rgb("#868e88")
    deep = rgb("#626d70")
    lathe(
        g,
        x,
        y,
        z,
        [
            (0, 0.52),
            (0.035, 0.58),
            (0.105, 0.58),
            (0.145, 0.53),
            (0.178, 0.455),
            (0.226, 0.45),
            (0.268, 0.39),
            (0.316, 0.32),
        ],
        "Stone",
        mid,
        10,
        0.15,
    )
    lathe(
        g,
        x,
        y,
        z,
        [
            (0.29, 0.315),
            (0.325, 0.35),
            (0.366, 0.346),
            (0.415, 0.281),
            (0.46, 0.247),
            (0.53, 0.226),
            (0.80, 0.195),
            (0.88, 0.215),
            (0.93, 0.263),
            (0.96, 0.292),
        ],
        "Stone",
        dark,
        20,
        0.10,
    )
    lathe(g, x, y, z, [(0.455, 0.25), (0.47, 0.262), (0.50, 0.262), (0.52, 0.239)], "Stone", mid, 20)
    square_profile(
        g,
        (x, y, z),
        [
            (0.905, 0.246, 0.81),
            (0.946, 0.26, 1),
            (0.985, 0.31, 1.05),
            (1.07, 0.441, 1.04),
            (1.102, 0.475, 1.03),
            (1.138, 0.475, 1),
            (1.16, 0.448, 0.84),
            (1.186, 0.411, 1),
        ],
        "Stone",
        mid,
    )
    wc = V((x, y, z + 1.515))
    half = 0.364
    wh = 0.330
    for side, nv in enumerate((V((0, -1, 0)), V((1, 0, 0)), V((0, 1, 0)), V((-1, 0, 0)))):
        u = UP.cross(nv)
        v = UP
        center = wc + nv * half
        circle = side % 2 == 0
        count = 36
        dims = [
            (half + 0.002, wh, 13, -0.014),
            (half, wh * 0.99, 13, 0.009),
            (0.242 if circle else 0.213, 0.233 if circle else 0.232, 2 if circle else 6, 0.011),
            (0.219 if circle else 0.197, 0.210 if circle else 0.213, 2 if circle else 6, -0.010),
            (0.214 if circle else 0.194, 0.207 if circle else 0.209, 2 if circle else 6, -0.084),
        ]
        rings = []
        cs = []
        for k, (ww, hh, exp, off) in enumerate(dims):
            ring = []
            for i in range(count):
                t = TAU * i / count
                qx, qz = rounded_perimeter(t, ww, hh, exp)
                ring.append(center + u * qx + v * qz + nv * off)
            rings.append(ring)
            cs.append([tint(dark, (0.8, 1, 0.95, 1.12, 0.62)[k])] * count)
        loft(g, rings, "Stone", cs, cap=False)
        border = [fire.vert(p - nv * 0.009) for p in rings[-1]]
        fire.face(tuple(border), "Hibukuro - honey paper", False)
        # Fine shadow bars behind each carved aperture. The flame can be seen all around.
        for k in (-1, 1):
            xx = 0.081 * k
            zz = 0.188 if circle else 0.208
            pole(
                g,
                center + u * xx - v * zz - nv * 0.058,
                center + u * xx + v * zz - nv * 0.058,
                0.012,
                "Wood",
                rgb("#736543"),
                8,
            )
        h = -0.052 if circle else 0.026
        ww = 0.205 if circle else 0.194
        pole(
            g,
            center - u * ww + v * h - nv * 0.056,
            center + u * ww + v * h - nv * 0.056,
            0.010,
            "Wood",
            rgb("#776849"),
            8,
        )
    square_profile(
        g,
        (x, y, z),
        [(1.835, 0.379, 0.84), (1.854, 0.423, 0.9), (1.887, 0.45, 1.08), (1.924, 0.443, 1)],
        "Stone",
        mid,
    )
    # A square, upswept kasa. Snow follows the same four ridgelines around its back.
    angles = [TAU * i / 56 for i in range(56)]
    rings = []
    cs = []
    for rad, h, lift, brightness in (
        (0.28, 1.88, 0.02, 0.79),
        (0.49, 1.894, 0.059, 0.86),
        (0.636, 1.864, 0.119, 0.75),
        (0.677, 1.893, 0.145, 0.82),
        (0.675, 1.943, 0.142, 1.06),
        (0.625, 1.989, 0.122, 1.04),
        (0.48, 2.024, 0.075, 1.04),
        (0.32, 2.099, 0.036, 1.03),
        (0.205, 2.204, 0.017, 1.08),
        (0.12, 2.246, 0.0, 1),
    ):
        row = []
        col = []
        for t in angles:
            xy = rounded_perimeter(t, rad, rad, 12)
            corners = abs(math.sin(2 * t)) ** 6
            row.append((x + xy[0], y + xy[1], z + h + lift * corners))
            col.append(tint(deep, brightness * (1 + 0.037 * math.cos(8 * t))))
        rings.append(row)
        cs.append(col)
    loft(roof, rings, "Stone", cs)
    rings = []
    cs = []
    for rad, h, lift, c in (
        (0.668, 1.935, 0.143, SNOW_EDGE),
        (0.690, 1.965, 0.142, rgb("#d8e7eb")),
        (0.68, 1.999, 0.14, SNOW),
        (0.63, 2.045, 0.124, SNOW_HIGH),
        (0.49, 2.091, 0.080, SNOW),
        (0.32, 2.180, 0.033, SNOW),
        (0.192, 2.262, 0.009, SNOW),
        (0.112, 2.278, 0, SNOW),
    ):
        row = []
        for t in angles:
            w = rad * (1 + 0.010 * math.sin(7 * t + 0.2))
            xy = rounded_perimeter(t, w, w, 10.3)
            drip = 0.023 * max(0, math.cos(9 * t + 0.4)) ** 5 if rad > 0.625 else 0.003
            row.append((x + xy[0], y + xy[1], z + h + lift * abs(math.sin(2 * t)) ** 6 - drip))
        rings.append(row)
        cs.append([c] * len(angles))
    ids = loft(roof, rings, "Snow", cs, cap=False)
    roof.face(tuple(ids[-1]), "Snow")
    lathe(
        roof,
        x,
        y,
        z,
        [
            (2.236, 0.118),
            (2.276, 0.171),
            (2.303, 0.185),
            (2.329, 0.181),
            (2.353, 0.146),
            (2.378, 0.123),
            (2.405, 0.107),
            (2.451, 0.157),
            (2.507, 0.181),
            (2.567, 0.167),
            (2.621, 0.12),
            (2.691, 0.065),
            (2.75, 0.018),
            (2.755, 0.007),
        ],
        "Stone",
        dark,
        28,
    )
    ell(roof, (x - 0.023, y + 0.014, z + 2.587), (0.116, 0.112, 0.045), "Snow", SNOW, 17, 7)


def towel_image():
    w, h = 256, 512
    u, v = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
    rng = np.random.default_rng(52)
    grain = noise_grid(u, v, 67, 113, rng)
    base = np.zeros((h, w, 3)) + [65, 99, 111]
    base += (2.1 * grain + 1.2 * np.sin(u * 587) + 0.8 * np.sin(v * 959))[:, :, None]
    mask = np.zeros((h, w))
    # Repeating seigaiha arcs, printed sparsely on indigo cotton.
    for j in range(-1, 11):
        y0 = j * 0.102 + 0.01
        for k in range(-1, 4):
            x0 = k * 0.43 + (0.215 if j % 2 else 0)
            d = np.sqrt((u - x0) ** 2 + ((v - y0) * 2.14) ** 2)
            active = (v >= y0) & (v < y0 + 0.102)
            for rad in (0.092, 0.150, 0.208):
                mask = np.maximum(mask, np.exp(-(((d - rad) / 0.009) ** 2)) * active)
    f = 0.36 * mask
    for pos, sz in ((0.89, 0.007), (0.932, 0.014), (0.965, 0.005), (0.045, 0.008)):
        f = np.maximum(f, 0.89 * (1 - ease(sz * 0.65, sz * 1.3, np.abs(v - pos))))
    return write_image(
        "Tenugui - indigo seigaiha block print",
        base * (1 - f[:, :, None]) + np.array([211, 218, 199]) * f[:, :, None],
    )


def bucket():
    g = Part("23 · Flat stone beneath the hinoki bath pail")
    pail = Part("24 · Fifteen hinoki staves and two patinated hoops")
    cloth = Part("25 · Indigo seigaiha tenugui")
    x, y = 2.44, -2.41
    z = 1.018
    rings = []
    cs = []
    n = 16
    for h, scale, hue in (
        (0.81, 0.88, "#707979"),
        (0.85, 1, "#7a8280"),
        (0.965, 1.04, "#949a90"),
        (z, 0.96, "#98a098"),
    ):
        row = []
        col = []
        for i in range(n):
            t = TAU * i / n
            k = 1 + 0.065 * math.sin(3 * t + 0.2) + 0.036 * math.cos(5 * t)
            row.append((x + scale * k * 0.66 * math.cos(t), y + scale * k * 0.56 * math.sin(t), h))
            col.append(tint(rgb(hue), 1 + 0.04 * math.cos(t * 5)))
        rings.append(row)
        cs.append(col)
    loft(g, rings, "Stone", cs)
    lathe(
        pail, x, y, z, [(0, 0.353), (0.018, 0.375), (0.07, 0.379), (0.095, 0.355)], "Wood", rgb("#af8053"), 40
    )
    count = 15
    h = 0.617
    rot = 0.08
    hues = ["#c69a69", "#d4aa74", "#cda474", "#d2a877", "#c59b6c", "#d7ae7d"]
    for i in range(count):
        a = TAU * i / count + rot + 0.004
        b = TAU * (i + 1) / count + rot - 0.004
        angles = [a, (a + b) / 2, b, b, (a + b) / 2, a]
        base_col = rgb(hues[(i * 7) % len(hues)])
        rings = []
        cs = []
        for dz, rr, shade in (
            (0.017, 0.369, 0.79),
            (0.032, 0.381, 0.97),
            (h - 0.039, 0.481, 1.04),
            (h - 0.014, 0.484, 1.06),
            (h, 0.474, 1.13),
        ):
            row = []
            col = []
            for j, t in enumerate(angles):
                rad = rr if j < 3 else rr - 0.058
                row.append(
                    (x + rad * math.cos(t), y + rad * math.sin(t), z + dz + 0.006 * math.cos(3 * i) * dz / h)
                )
                col.append(tint(base_col, shade * (1 if j < 3 else 0.76) * (0.96 + 0.05 * (j % 3))))
            rings.append(row)
            cs.append(col)
        loft(pail, rings, "Wood", cs)
        # A pair of fine grain lines follows each stave's slight outward taper.
        for f in (0.24, 0.76):
            pts = []
            for k in range(8):
                t = k / 7
                dz = 0.08 + (h - 0.14) * t
                rr = 0.379 + 0.107 * (dz - 0.02) / (h - 0.027) + 0.002
                theta = a + (b - a) * f + 0.005 * math.sin(t * 6 + i)
                pts.append((x + rr * math.cos(theta), y + rr * math.sin(theta), z + dz))
            simple = [pts[i] for i in (0, 2, 4, 7)]
            stroke(pail, simple, [0.001, 0.004, 0.004, 0.001], "Wood", tint(base_col, 0.68), 4)
    for dz, w in ((0.132, 0.048), (0.468, 0.043)):
        rr = 0.379 + 0.106 * (dz - 0.018) / (h - 0.026)
        rings = []
        for dd, off in (
            (-w / 2, -0.004),
            (-w / 2, 0.009),
            (-w / 2 + 0.008, 0.018),
            (w / 2 - 0.007, 0.018),
            (w / 2, 0.010),
            (w / 2, -0.005),
        ):
            rings.append(
                [
                    (
                        x + (rr + off + dd * 0.165) * math.cos(TAU * i / 60),
                        y + (rr + off + dd * 0.165) * math.sin(TAU * i / 60),
                        z + dz + dd,
                    )
                    for i in range(60)
                ]
            )
        loft(pail, rings, "Hoops", cap=False)
    # Print follows the cloth continuously from the inner wall over the lip to the hem.
    material("Tenugui", rough=0.89, image=towel_image())
    radial = V((0.39, -0.921, 0)).normalized()
    horizontal = UP.cross(radial).normalized()
    center = V((x, y, z))
    path = [
        (0.16, 0.10),
        (0.238, 0.158),
        (0.33, 0.30),
        (0.392, 0.46),
        (0.417, 0.555),
        (0.422, 0.614),
        (0.435, 0.644),
        (0.457, 0.649),
        (0.481, 0.641),
        (0.496, 0.619),
        (0.499, 0.575),
        (0.484, 0.496),
        (0.467, 0.406),
        (0.451, 0.320),
        (0.451, 0.253),
    ]
    distances = [0]
    for a, b in zip(path, path[1:]):
        distances.append(distances[-1] + math.dist(a, b))
    rows = []
    last = []
    for j, (r, zz) in enumerate(path):
        row = []
        last = []
        v = distances[j] / distances[-1]
        for i in range(13):
            u = i / 12
            s = (u - 0.5) * 0.37
            c = 0.018 * math.cos(u * PI * 3.8 + 0.55) + 0.008 * math.cos(u * PI * 7.5 + v)
            rr = r - s * s / (2 * 0.52) + 0.5 * c * math.sin(v * PI)
            p = (
                center
                + radial * rr
                + horizontal * (s + 0.013 * math.sin(v * PI))
                + UP * (zz + c * (0.36 + 0.65 * abs(2 * v - 1)) - 0.015 * s / 0.19)
            )
            row.append(cloth.vert(p, uv=(u, v)))
            last.append(p)
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for i in range(12):
            cloth.face((a[i], a[i + 1], b[i + 1], b[i]), "Tenugui")
    for i, p in enumerate(last):
        pole(cloth, p, p - UP * (0.012 + 0.008 * (i % 2)), 0.004, "Linen", rgb("#738d8c"), 5, 0.002)


def plants():
    foliage = Part("26 · Sasa grass, winter leaves and dusted tips")
    berries = Part("27 · Nandina berries and woody panicles")
    # Narrow curved evergreen leaves frame the snowy side banks.
    for index, (x, y, scale, heading) in enumerate(
        (
            (-3.40, -1.50, 0.94, 0.06),
            (-3.56, 0.44, 0.96, 1.12),
            (-2.86, 2.14, 0.82, 0.1),
            (3.38, 0.50, 0.86, 1.75),
            (1.65, 2.32, 0.78, 2.1),
            (-2.57, -2.53, 0.54, -0.4),
        )
    ):
        root = V((x, y, 0.88))
        rnd = random.Random(101 + index)
        for j in range(7 if index < 4 else 5):
            angle = heading + (j - 3) * 0.77 + rnd.uniform(-0.11, 0.11)
            v = V((math.cos(angle), math.sin(angle), 0))
            L = rnd.uniform(0.34, 0.66) * scale
            mid = root + v * 0.10 * scale + UP * rnd.uniform(0.14, 0.26) * scale
            tip = root + v * L + UP * rnd.uniform(0.24, 0.68) * scale
            stroke(
                foliage,
                [root, mid, mid + (tip - mid) * 0.35],
                [0.016, 0.013, 0.010],
                "Plants",
                rgb("#747b50"),
                6,
            )
            leaf(
                foliage,
                mid,
                tip,
                0.074 * scale,
                (0, 0, 0.09 * scale),
                colors=rnd.choice([("#465f52", "#738468"), ("#526c59", "#7e8c64"), ("#3e6558", "#69806a")]),
            )
            if j in (1, 4):
                a = mid + (tip - mid) * 0.45 + UP * 0.092 * scale
                b = tip - (tip - mid) * 0.05 + UP * 0.016 * scale
                leaf(
                    foliage,
                    a,
                    b,
                    0.036 * scale,
                    (0, 0, 0.018 * scale),
                    mat="Snow",
                    colors=("#d5e3df", "#f2f3e9"),
                    vein=False,
                )
    for plant, (root, scale) in enumerate(((V((3.34, 2.10, 0.90)), 1.0), (V((-3.45, 1.81, 0.89)), 0.69))):
        rnd = random.Random(903 + plant)
        sgn = 1 if plant == 0 else -1
        for j in range(4):
            angle = (-0.83 + 0.62 * j) * sgn
            dx = 0.39 * math.sin(angle) * scale
            dy = 0.32 * math.cos(angle) * scale
            p0 = root + V((0.035 * j * sgn, 0.024 * j, 0))
            p1 = p0 + V((0.10 * sgn, 0.12, 0.47)) * scale
            p2 = p1 + V((dx, dy, 0.50 * scale))
            p3 = p2 + V((dx * 0.44, -dy * 0.19, 0.31 * scale))
            stroke(
                berries,
                [p0, p1, p2, p3],
                [0.031 * scale, 0.025 * scale, 0.017 * scale, 0.008 * scale],
                "Wood",
                rgb("#675449"),
                7,
            )
            for k in range(3):
                t = 0.25 + k * 0.24
                a = p1 + (p2 - p1) * t
                aa = TAU * rnd.random()
                d = V((0.28 * math.cos(aa), 0.28 * math.sin(aa), 0.14)) * scale
                b = a + d
                stroke(
                    berries,
                    [a, a + d * 0.62, b],
                    [0.014 * scale, 0.009 * scale, 0.005 * scale],
                    "Plants",
                    rgb("#866346"),
                    6,
                )
                for sign in (-1, 1):
                    end = (
                        b
                        + V((0.17 * math.cos(aa + sign * 0.70), 0.17 * math.sin(aa + sign * 0.70), -0.08))
                        * scale
                    )
                    leaf(
                        berries,
                        a + d * 0.59,
                        end,
                        0.045 * scale,
                        (0, 0, 0.046 * scale),
                        colors=rnd.choice(
                            [("#695f48", "#8d7852"), ("#754e44", "#98694e"), ("#526248", "#797e55")]
                        ),
                        vein=False,
                    )
            for k in range(5):
                t = TAU * k / 5 + j * 0.42
                tip = p3 + V((math.cos(t) * 0.16, math.sin(t) * 0.13, rnd.uniform(-0.025, 0.135))) * scale
                mid = p3 + (tip - p3) * 0.55 + UP * 0.035 * scale
                stroke(
                    berries,
                    [p3, mid, tip],
                    [0.007 * scale, 0.006 * scale, 0.0045 * scale],
                    "Wood",
                    rgb("#725d46"),
                    5,
                )
                s = rnd.uniform(0.059, 0.075) * scale
                center = tip + UP * (s * 0.58)
                c = rgb(rnd.choice(["#b54237", "#ab3e34", "#bd533f", "#ac4136"]))
                ell(berries, center, (s, s * 0.97, s * 1.04), "Plants", c, 10, 5)
                ids = [
                    berries.vert(
                        center
                        + V((s * 0.17 * math.cos(TAU * i / 7), s * 0.18 * math.sin(TAU * i / 7), s * 1.04)),
                        rgb("#71503f"),
                    )
                    for i in range(7)
                ]
                berries.face(ids, "Plants")


def vapour():
    g = Part("28 · Soft curling steam above the spring")
    plumes = [
        ((-1.98, -1.18), 1.47, 1.00, 0.36, 0),
        ((1.97, -0.64), 1.62, 1.04, -0.51, 1.5),
        ((-0.91, 1.02), 1.34, 0.94, 1.20, 3.0),
        ((1.39, 0.90), 0.97, 0.66, -1.22, 0.55),
    ]
    for (x, y), height, width, angle, phase in plumes:
        rows = []
        for j in range(17):
            v = j / 16
            theta = angle + 0.46 * math.sin(v * 5 + phase)
            across = V((math.cos(theta), math.sin(theta), 0))
            forward = V((-math.sin(theta), math.cos(theta), 0))
            mid = V((x + 0.095 * math.sin(v * 8 + phase), y + 0.07 * v, WATER_Z + 0.022 + height * v))
            row = []
            for i in range(7):
                u = i / 6
                p = mid + across * (u - 0.5) * width * (0.68 + 0.55 * v) + forward * ((u - 0.5) ** 2 * 0.30)
                row.append(g.vert(p, uv=(u, v)))
            rows.append(row)
        for a, b in zip(rows, rows[1:]):
            for i in range(6):
                g.face((a[i], a[i + 1], b[i + 1], b[i]), "Steam")


def falling_snow():
    flakes = Part("30 · A few falling snow crystals")
    rnd = random.Random(2302)
    for i in range(29):
        x = rnd.uniform(-3.68, 3.63)
        y = rnd.uniform(0.25, 2.93)
        z = rnd.uniform(2.38, 4.00)
        if abs(x) < 0.78 and y < 1.2:
            continue
        size = rnd.uniform(0.009, 0.026)
        u, v, w = frame((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.2, 1)))
        ell(
            flakes,
            (x, y, z),
            (size, size * 0.83, size * 0.49),
            "Snow",
            mix(SNOW_EDGE, SNOW, rnd.random()),
            6,
            3,
            (u, v, w),
        )


def empty_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export(output):
    empty_scene()
    PARTS.clear()
    MATERIALS.clear()
    RNG.seed(8461)
    make_materials()
    floor = base()
    rocks()
    crest = water()
    head = animal()
    yuzu(head)
    fence()
    spring(crest)
    lantern()
    bucket()
    plants()
    vapour()
    body_water_contact()
    falling_snow()
    tucked_paws(floor)
    for part in PARTS:
        part.finish()
    garden = bpy.data.objects.new("柚子の湯 | Yuzu no Yu", None)
    bpy.context.collection.objects.link(garden)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.parent = garden
    bpy.context.view_layer.update()
    bpy.context.scene["Title"] = "柚子の湯 / Yuzu no Yu"
    opts = dict(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_tangents=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )
    if "export_all_vertex_colors" in bpy.ops.export_scene.gltf.get_rna_type().properties:
        opts["export_all_vertex_colors"] = False
    bpy.ops.export_scene.gltf(**opts)


def verify_glb(path):
    import json

    raw = path.read_bytes()
    magic, version, total = struct.unpack_from("<4sII", raw)
    if (magic, version, total) != (b"glTF", 2, len(raw)):
        raise ValueError("Incorrect GLB header")
    size, kind = struct.unpack_from("<II", raw, 12)
    doc = json.loads(raw[20 : 20 + size])
    triangles = 0
    bounds = []
    if kind != 0x4E4F534A:
        raise ValueError("JSON chunk missing")
    for mesh in doc["meshes"]:
        for prim in mesh["primitives"]:
            if prim.get("mode", 4) != 4:
                raise ValueError("Expected triangles")
            acc = doc["accessors"][prim["attributes"]["POSITION"]]
            bounds.append((acc["min"], acc["max"]))
            triangles += doc["accessors"][prim["indices"]]["count"] // 3
    lo = np.min(np.array(bounds)[:, 0], axis=0)
    hi = np.max(np.array(bounds)[:, 1], axis=0)
    if triangles > 100000 or len(raw) > 20000000 or max(hi - lo) > 2:
        raise ValueError(f"Envelope exceeded: {triangles} triangles, {len(raw)} bytes, {hi-lo} m")
    if abs(lo[1]) > 1e-6:
        raise ValueError("Plinth underside must be at Y = 0")
    if not all("bufferView" in img for img in doc.get("images", [])):
        raise ValueError("External texture found")
    by_name = {m["name"]: m for m in doc["materials"]}
    if by_name["Water"].get("alphaMode") != "BLEND" or not any(
        any(m.get("emissiveFactor", [])) for m in doc["materials"]
    ):
        raise ValueError("Water transparency or emissive window missing")
    print(
        f'GLB CHECK | {triangles:,} triangles | {len(raw):,} bytes | {len(doc["meshes"])} meshes | {len(doc["images"])} embedded images | min {lo} | max {hi}',
        flush=True,
    )


def photo(path, out, width=1920, samples=96):
    """Photograph the reimported miniature on a matte studio floor."""
    empty_scene()
    bpy.ops.import_scene.gltf(filepath=str(path))
    sc = bpy.context.scene
    # A matte blue-hour studio with a large key, cool skylight and a warm practical.
    sc.world = bpy.data.worlds.new("Winter skylight")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs["Color"].default_value = rgb("#b4cacc")
    sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.17
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.001))
    floor = bpy.context.object
    floor.name = "Photographic backdrop"
    floor.data.materials.append(material("Studio | blue spruce", color="#294852", rough=0.91))

    def area(name, p, target, power, size, color):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = power
        light.shape = "DISK"
        light.size = size
        light.color = color
        obj = bpy.data.objects.new(name, light)
        sc.collection.objects.link(obj)
        obj.location = p
        obj.rotation_euler = (V(target) - V(p)).to_track_quat("-Z", "Y").to_euler()

    area("Window | soft winter sun", (-1.75, -2.0, 2.65), (0, 0, 0.25), 157, 1.72, (1, 0.78, 0.60))
    area("Bounce | cool sky", (2.05, -0.72, 2.05), (0, 0, 0.25), 42, 2.15, (0.64, 0.82, 1))
    area("Rim | high over the fence", (-0.7, 1.85, 2.70), (0, 0, 0.37), 125, 1.70, (0.72, 0.90, 1))
    area("Eye light", (-0.3, -2.2, 1.05), (0, 0, 0.41), 8, 1.55, (1, 0.84, 0.73))
    data = bpy.data.lights.new("Firebox spill", "POINT")
    data.energy = 2.0
    data.color = (1, 0.40, 0.10)
    data.shadow_soft_size = 0.09
    light = bpy.data.objects.new("Firebox spill", data)
    sc.collection.objects.link(light)
    light.location = V((2.62, 0.98, 0.865 + 1.51)) * UNIT
    cam = bpy.data.cameras.new("Portrait lens")
    obj = bpy.data.objects.new("Portrait lens", cam)
    sc.collection.objects.link(obj)
    target = V((0, 0, 0.29))
    obj.location = target + V((1.77, -3.83, 1.87))
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
    cam.type = "PERSP"
    cam.lens = 66
    cam.dof.use_dof = True
    cam.dof.focus_distance = (cpoint((0, -0.63, 2.46)) * UNIT - obj.location).length
    cam.dof.aperture_fstop = 4.8
    sc.camera = obj
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 7
    sc.cycles.transparent_max_bounces = 8
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("METAL", "OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            usable = [d for d in prefs.devices if d.type == backend]
            if usable:
                for device in prefs.devices:
                    device.use = device.type == backend
                sc.cycles.device = "GPU"
                break
        except (TypeError, RuntimeError):
            continue
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = -0.45
    sc.render.resolution_x = width
    sc.render.resolution_y = round(width * 0.80)
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--photo-only", action="store_true")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--photo-path", type=Path)
    options = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
    path = HERE / "scene.glb"
    if not options.photo_only:
        export(path)
    verify_glb(path)
    if options.preview or options.photo_only:
        photo(path, options.photo_path or HERE / "preview.png", options.width, options.samples)
