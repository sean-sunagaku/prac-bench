"""
render_previews.py — 書き出した scene.glb を空のシーンに読み込み直して確認用画像を撮る

  blender -b --factory-startup -P gen/render_previews.py -- <scene.glb> <出力ディレクトリ> [studio|mood|close|turntable N]

GLB を読み直すことで、書き出し結果（軸変換・マテリアル・頂点カラー・透過）をそのまま検証する。
"""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
from mathutils import Vector
import render_util as ru

args = sys.argv[sys.argv.index('--') + 1:]
GLB, OUTDIR = args[0], args[1]
MODE = args[2] if len(args) > 2 else 'studio'
os.makedirs(OUTDIR, exist_ok=True)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=GLB)

TARGET = Vector((0.0, 0.0, 0.40))


def orbit_cam(az_deg, el_deg, dist, target=TARGET, lens=50, name='Cam'):
    az, el = math.radians(az_deg), math.radians(el_deg)
    # az=0 → 正面（-Y 側）から見る。az=90 → 右（+X）から
    loc = Vector((target.x + dist * math.cos(el) * math.sin(az),
                  target.y - dist * math.cos(el) * math.cos(az),
                  target.z + dist * math.sin(el)))
    return ru.add_camera(loc, target, lens, name)


if MODE in ('studio', 'turntable'):
    ru.setup_world((0.62, 0.66, 0.72), 0.9)
    ru.add_sun((50, 0, -35), 3.2, angle=6)
    ru.setup_render((1280, 960) if MODE == 'studio' else (960, 720), 'EEVEE', 48 if MODE == 'studio' else 24)
    if MODE == 'studio':
        views = {'front': 0, 'diag45_right': 45, 'side_right': 90, 'back': 180, 'side_left': 270, 'diag45_left': -45}
        for k, az in views.items():
            cam = orbit_cam(az, 30, 3.85)
            ru.render_to(cam, os.path.join(OUTDIR, f'studio_{k}.png'))
        cam = orbit_cam(0, 89.0, 3.6)
        ru.render_to(cam, os.path.join(OUTDIR, 'studio_top.png'))
    else:
        n = int(args[3]) if len(args) > 3 else 72
        for i in range(n):
            cam = orbit_cam(360.0 * i / n, 30, 3.55, name=f'C{i}')
            ru.render_to(cam, os.path.join(OUTDIR, f'tt_{i:03d}.png'))
elif MODE == 'mood':
    # 夕暮れの雪見：青い環境光 + 灯籠の暖色ポイントライト
    ru.setup_world((0.16, 0.22, 0.36), 0.75)
    ru.add_sun((62, 0, 140), 1.1, color=(0.75, 0.82, 1.0), angle=10)
    glow = [o for o in bpy.data.objects if 'Firebox_Glow' in o.name][0]
    bb = [glow.matrix_world @ Vector(c) for c in glow.bound_box]
    c = sum(bb, Vector()) / 8
    ru.add_point(c, 18, (1.0, 0.62, 0.3), 0.03)
    ru.add_point((0.0, -0.05, 0.62), 6, (1.0, 0.85, 0.7), 0.3)
    ru.setup_render((1600, 1200), 'EEVEE', 64)
    for k, (az, el, dist, lens) in {'mood_front': (22, 26, 3.75, 50), 'mood_close': (28, 20, 1.55, 55)}.items():
        cam = orbit_cam(az, el, dist, target=TARGET if k == 'mood_front' else Vector((-0.05, -0.1, 0.52)), lens=lens)
        ru.render_to(cam, os.path.join(OUTDIR, f'{k}.png'))
elif MODE == 'close':
    ru.setup_world((0.62, 0.66, 0.72), 0.9)
    ru.add_sun((50, 0, -35), 3.2, angle=6)
    ru.setup_render((1200, 900), 'EEVEE', 48)
    capy = [o for o in bpy.data.objects if o.name == 'Yuzu'][0]
    bb = [capy.matrix_world @ Vector(c) for c in capy.bound_box]
    yz = sum(bb, Vector()) / 8
    shots = {
        'close_capybara_face': (orbit_cam, dict(az_deg=-35, el_deg=18, dist=1.05, target=yz + Vector((0, -0.05, -0.09)), lens=60)),
        'close_yuzu_side': (orbit_cam, dict(az_deg=55, el_deg=4, dist=0.55, target=yz + Vector((0, 0, -0.03)), lens=70)),
        'close_waterline': (orbit_cam, dict(az_deg=20, el_deg=12, dist=1.2, target=Vector((0.0, 0.0, 0.40)), lens=55)),
        'close_lantern': (orbit_cam, dict(az_deg=-20, el_deg=16, dist=1.25, target=Vector((0.50, 0.40, 0.62)), lens=60)),
        'close_bucket': (orbit_cam, dict(az_deg=-35, el_deg=22, dist=0.9, target=Vector((-0.6, -0.42, 0.42)), lens=60)),
        'close_spout': (orbit_cam, dict(az_deg=30, el_deg=15, dist=1.1, target=Vector((-0.4, 0.3, 0.45)), lens=55)),
        'close_fence_back': (orbit_cam, dict(az_deg=180, el_deg=15, dist=2.6, target=Vector((0, 0.8, 0.6)), lens=50)),
    }
    for k, (fn, kw) in shots.items():
        cam = fn(**kw)
        ru.render_to(cam, os.path.join(OUTDIR, f'{k}.png'))
