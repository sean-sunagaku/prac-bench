import sys; sys.path.insert(0,'lib')
import numpy as np
from pb_body import load_upper_body_with_arms, find_eye_regions, EYE_L
from pb_common import edges_from_faces
co, faces, uvs, info = load_upper_body_with_arms('input/base.obj','input/upper-body.obj')
inner, rim, d = find_eye_regions(co, faces, EYE_L)
E=edges_from_faces(faces)
nb=[[] for _ in range(len(co))]
for a,b in E: nb[a].append(b); nb[b].append(a)
# BFS outward over non-inner vertices
dist=-np.ones(len(co),int)
front=list(np.where(rim)[0])
for i in front: dist[i]=0
k=0
while front and k<10:
    nxt=[]
    for i in front:
        for j in nb[i]:
            if dist[j]<0 and not inner[j]:
                dist[j]=k+1; nxt.append(j)
    front=nxt; k+=1
for r in range(0,9):
    ids=np.where(dist==r)[0]
    rel=co[ids]-EYE_L
    up=rel[:,2]>0
    print('ring',r,len(ids),'u range',rel[:,0].min().round(4),rel[:,0].max().round(4),'v up max',rel[up,2].max().round(4) if up.any() else None,'v low min',rel[~up,2].min().round(4) if (~up).any() else None, 'y', rel[:,1].min().round(4), rel[:,1].max().round(4))
# inner rings BFS inward from rim
din=-np.ones(len(co),int)
front=list(np.where(rim)[0]); 
for i in front: din[i]=0
k=0
while front and k<12:
    nxt=[]
    for i in front:
        for j in nb[i]:
            if din[j]<0 and inner[j]:
                din[j]=k+1; nxt.append(j)
    front=nxt; k+=1
for r in range(1,12):
    ids=np.where(din==r)[0]
    if len(ids)==0: break
    rel=co[ids]-EYE_L
    dd=np.linalg.norm(rel,axis=1)
    print('inner ring',r,len(ids),'dist',dd.min().round(4),dd.max().round(4),'y',rel[:,1].min().round(4),rel[:,1].max().round(4), 'u', rel[:,0].min().round(4), rel[:,0].max().round(4), 'v', rel[:,2].min().round(4), rel[:,2].max().round(4))
print('inner total', inner.sum(), 'rim', rim.sum())
