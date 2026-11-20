import sys, os; sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np
o = bpy.data.objects['Hair_Long']; c = o.data
p = np.zeros(len(c.points) * 3); c.position_data.foreach_get('vector', p)
M = len(c.points) // len(c.curves)
p = p.reshape(-1, M, 3)
# deviation of each strand from the chord between point 8 and the tip
dev = []
for k in range(0, len(p), 500):
    a, b = p[k, 8], p[k, -1]
    d = b - a; d /= np.linalg.norm(d)
    rel = p[k, 8:] - a
    perp = rel - np.outer(rel @ d, d)
    dev.append(np.linalg.norm(perp, axis=1).max())
print('max perp deviation (m) samples', np.round(dev, 4))
k = 1000
print(np.round(p[k, ::2], 3).tolist())
