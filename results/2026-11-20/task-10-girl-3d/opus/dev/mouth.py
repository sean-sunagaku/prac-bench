import sys; sys.path.insert(0,'lib')
import numpy as np
from pb_body import load_upper_body_with_arms
from pb_common import triangulate, vertex_normals, edges_from_faces
co, faces, uvs, info = load_upper_body_with_arms('input/base.obj','input/upper-body.obj')
print(info)
tris=triangulate(faces); vn=vertex_normals(co,tris)
m=np.where((np.abs(co[:,0])<0.0008)&(co[:,2]>1.43)&(co[:,2]<1.50))[0]
for i in m[np.argsort(-co[m,2])]:
    print(i, co[i].round(4), vn[i].round(2))
# mouth corner candidates: vertices near z 1.468, y < -0.12, find inner-bag adjacency
inner = (co[:,1] > -0.15) & (co[:,1] < -0.10) & (np.abs(co[:,0])<0.03) & (co[:,2]>1.455)&(co[:,2]<1.485) & (vn[:,1] > 0.2)
print('inner-ish count', inner.sum())
E=edges_from_faces(faces)
a,b=E[:,0],E[:,1]
rim=set()
for x,y in zip(a,b):
    if inner[x] and not inner[y] and vn[y,1]<0: rim.add(y)
    if inner[y] and not inner[x] and vn[x,1]<0: rim.add(x)
rim=sorted(rim, key=lambda i: co[i,0])
for i in rim: print('mouthrim', i, co[i].round(4))
