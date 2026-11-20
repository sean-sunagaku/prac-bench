"""開発用：カピバラ単体を作って数方向からレンダリングする"""
import sys, os, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
import lib
import capybara as cp
import render_util as ru

out_dir = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/capy-work'
t0 = time.time()
lib.clear_scene()
V, T, eyes = cp.build(h=0.0036)
print('capy raw verts', len(V), 'tris', len(T), 'time', time.time() - t0)
lm = cp.landmarks()
print('landmarks', {k: np.round(v, 4).tolist() for k, v in lm.items()})
wl = lm['back_top'][2] + 0.012
fur = lib.make_material('Fur', base=(0.4, 0.25, 0.15), rough=0.75, vcol=True, sheen=0.5, sheen_tint=(0.9, 0.7, 0.5))
obj = lib.new_object('Capybara', V, T, mat=fur)
lib.decimate(obj, 22000 / len(T))
Vd, Td = lib.mesh_arrays(obj)
lib.set_vertex_colors(obj, cp.colors(Vd, wl))
print('decimated tris', len(Td))
eye_mat = lib.make_material('Eye', base=lib.hexc('#0b0807'), rough=0.1, coat=1.0)
for i, c in enumerate(eyes):
    Vs, Fs = lib.uv_sphere(16, 10)
    lib.new_object(f'Eye{i}', Vs * cp.EYE_R + c, Fs, mat=eye_mat)
# 水面の目安
wm = lib.make_material('Water', base=lib.hexc('#7fd0d0'), rough=0.05, alpha=0.45)
Vw, Fw = lib.box((0.0, 0, wl - 0.001), (0.6, 0.4, 0.001))
lib.new_object('WaterRef', Vw, Fw, mat=wm)
# 柚子の目安
cr = lm['crown']
Vs, Fs = lib.uv_sphere(20, 12)
yz = lib.make_material('Yuzu', base=lib.hexc('#f5c518'), rough=0.45)
lib.new_object('YuzuRef', Vs * np.array([0.046, 0.046, 0.039]) + cr + np.array([0, 0, 0.039 - 0.003]), Fs, mat=yz)

ru.setup_world((0.6, 0.64, 0.7), 1.0)
ru.add_sun((55, 0, 35), 3.5)
ru.setup_render((900, 700), 'EEVEE', 32)
tgt = (0.12, 0, 0.27)
views = {
    'side': ((0.15, 1.6, 0.45), 40),
    'front34': ((1.25, 0.9, 0.7), 40),
    'front': ((1.6, 0.0, 0.5), 40),
    'top': ((0.15, 0.001, 1.8), 40),
    'headclose': ((0.75, 0.45, 0.5), 50),
}
for k, (loc, lens) in views.items():
    cam = ru.add_camera(loc, tgt if k != 'headclose' else (0.28, 0, 0.36), lens)
    ru.render_to(cam, os.path.join(out_dir, f'capy_{k}.png'))
print('done', time.time() - t0)
