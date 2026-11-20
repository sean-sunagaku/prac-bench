"""render_util.py — 確認用レンダリングの小道具（Blender EEVEE / Cycles）"""
import math
import bpy
from mathutils import Vector


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def setup_world(color=(0.55, 0.6, 0.68), strength=1.0, sky=False):
    w = bpy.data.worlds.new('World') if not bpy.context.scene.world else bpy.context.scene.world
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = [n for n in nt.nodes if n.type == 'BACKGROUND'][0]
    if sky:
        try:
            sk = nt.nodes.new('ShaderNodeTexSky')
            nt.links.new(sk.outputs[0], bg.inputs[0])
        except Exception:
            bg.inputs[0].default_value = (*color, 1)
    else:
        bg.inputs[0].default_value = (*color, 1)
    bg.inputs[1].default_value = strength


def add_sun(direction_deg=(50, 0, 30), energy=3.0, color=(1, 0.97, 0.92), angle=8.0, name='Sun'):
    ld = bpy.data.lights.new(name, 'SUN')
    ld.energy = energy
    ld.color = color
    ld.angle = math.radians(angle)
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = [math.radians(a) for a in direction_deg]
    return o


def add_point(loc, energy=20, color=(1, 0.6, 0.3), radius=0.02, name='Point'):
    ld = bpy.data.lights.new(name, 'POINT')
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return o


def add_camera(loc, target, lens=50, name='Cam', ortho=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.clip_start = 0.01
    cd.clip_end = 100
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    o = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    look_at(o, target)
    return o


def setup_render(res=(1000, 750), engine='EEVEE', samples=64, transparent=False):
    sc = bpy.context.scene
    if engine == 'CYCLES':
        sc.render.engine = 'CYCLES'
        try:
            prefs = bpy.context.preferences.addons['cycles'].preferences
            prefs.compute_device_type = 'METAL'
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            sc.cycles.device = 'GPU'
        except Exception as e:
            print('GPU setup failed', e)
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
    else:
        sc.render.engine = 'BLENDER_EEVEE'
        try:
            sc.eevee.taa_render_samples = samples
        except Exception:
            pass
        for attr, val in (('use_shadows', True), ('use_raytracing', True)):
            try:
                setattr(sc.eevee, attr, val)
            except Exception:
                pass
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparent
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        try:
            sc.view_settings.view_transform = 'Filmic'
        except Exception:
            pass
    sc.render.image_settings.file_format = 'PNG'


def render_to(cam, path):
    sc = bpy.context.scene
    sc.camera = cam
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
