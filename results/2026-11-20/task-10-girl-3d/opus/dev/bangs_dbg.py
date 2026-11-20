import sys, os; sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np
o = bpy.data.objects['Hair_Bangs']; c = o.data
p = np.zeros(len(c.points) * 3); c.position_data.foreach_get('vector', p)
M = len(c.points) // len(c.curves)
p = p.reshape(-1, M, 3)
# head transform approx from eye objects: use Eye_L/R to define; just print world coords
for k in [0, 50, 100, 200, 300]:
    print(k, np.round(p[k, ::3], 4).tolist())
print('lens', np.linalg.norm(np.diff(p, axis=1), axis=2).sum(1)[:10])
