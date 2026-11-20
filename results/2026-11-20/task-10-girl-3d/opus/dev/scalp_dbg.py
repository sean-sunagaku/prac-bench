import sys, os; sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np
from pb_body import load_upper_body_with_arms
from pb_skin import paint_skin, hairline_z
co0, faces, uvs, info = load_upper_body_with_arms('input/base.obj', 'input/upper-body.obj')
rgba, masks, extra = paint_skin(co0, faces)
sc = masks[:, 1]
for zz in (1.60, 1.62, 1.63, 1.64, 1.65, 1.66):
    m = (np.abs(co0[:, 2] - zz) < 0.004) & (co0[:, 1] < -0.08) & (np.abs(co0[:, 0]) < 0.03)
    print(zz, m.sum(), 'scalp mask mean', sc[m].mean().round(3) if m.any() else None, 'y range', co0[m, 1].min().round(3) if m.any() else None)
m = co0[:, 2] > 1.60
print('frac scalp>0.5 above 1.60:', (sc[m] > 0.5).mean())
# per azimuth: lowest z where scalp>0.5
phi = np.arctan2(co0[:, 0], -(co0[:, 1] + 0.03))
for a in np.linspace(-np.pi, np.pi, 13):
    mm = (np.abs(phi - a) < 0.15) & (sc > 0.5)
    print('phi', round(np.degrees(a)), 'min z scalp', co0[mm, 2].min().round(3) if mm.any() else None, 'hl', hairline_z(np.array([a]))[0].round(3))
