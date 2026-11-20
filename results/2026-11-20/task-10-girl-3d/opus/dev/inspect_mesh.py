import bpy, numpy as np, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='input/upper-body.obj', forward_axis='Y', up_axis='Z')
ob = bpy.context.selected_objects[0]
me = ob.data
print('name', ob.name, 'verts', len(me.vertices), 'faces', len(me.polygons))
co = np.array([v.co[:] for v in me.vertices])
print('bounds', co.min(0), co.max(0))
print('rot', ob.rotation_euler[:], 'matrix', ob.matrix_world)
head = co[co[:,2] > 1.42]
print('head verts', len(head), head.min(0), head.max(0))
i = np.argmin(co[:,1]); print('most front', co[i])
# boundary edges
import bmesh
bm = bmesh.new(); bm.from_mesh(me)
bnd = [e for e in bm.edges if e.is_boundary]
print('boundary edges', len(bnd))
bz = np.array([ (e.verts[0].co.z) for e in bnd])
print('boundary z hist', np.histogram(bz, bins=10))
# loops of boundary: find connected components
from collections import defaultdict
adj = defaultdict(list)
for e in bnd:
    a,b = e.verts[0].index, e.verts[1].index
    adj[a].append(b); adj[b].append(a)
seen=set(); comps=[]
for s in adj:
    if s in seen: continue
    st=[s]; comp=[]
    while st:
        x=st.pop()
        if x in seen: continue
        seen.add(x); comp.append(x); st.extend(adj[x])
    comps.append(comp)
for c in comps:
    cc = co[c]
    print('boundary loop', len(c), 'center', cc.mean(0).round(4), 'min', cc.min(0).round(4), 'max', cc.max(0).round(4))
