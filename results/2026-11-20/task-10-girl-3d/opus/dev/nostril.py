import sys, os; sys.path.insert(0, os.path.abspath('lib'))
import numpy as np
from pb_body import load_upper_body_with_arms
from pb_common import triangulate, vertex_normals, edges_from_faces
co, faces, uvs, info = load_upper_body_with_arms('input/base.obj', 'input/upper-body.obj')
vn = vertex_normals(co, triangulate(faces))
E = edges_from_faces(faces)
n = len(co); acc = np.zeros_like(co); deg = np.zeros(n)
np.add.at(acc, E[:, 0], co[E[:, 1]]); np.add.at(acc, E[:, 1], co[E[:, 0]])
np.add.at(deg, E[:, 0], 1); np.add.at(deg, E[:, 1], 1)
lap = acc / np.maximum(deg, 1)[:, None] - co
conc = (lap * vn).sum(1)   # >0 => vertex lies below neighbours along its normal (concave)
m = (co[:, 0] > 0.002) & (co[:, 0] < 0.016) & (co[:, 2] > 1.488) & (co[:, 2] < 1.508) & (co[:, 1] < -0.140) & (co[:, 1] > -0.170)
idx = np.where(m)[0]
o = idx[np.argsort(-conc[idx])][:25]
for i in o:
    print(i, co[i].round(4), 'n', vn[i].round(2), 'conc', round(conc[i] * 1000, 3))
