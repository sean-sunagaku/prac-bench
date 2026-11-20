import bpy, bmesh, numpy as np
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='input/upper-body.obj', forward_axis='Y', up_axis='Z')
ob = bpy.context.selected_objects[0]; me=ob.data
bm=bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
E=np.array([0.0308,-0.1245,1.5452])
co=np.array([v.co[:] for v in bm.verts]); no=np.array([v.normal[:] for v in bm.verts])
rel=co-E; d=np.linalg.norm(rel,axis=1); o=(no*rel).sum(1)/np.maximum(d,1e-9)
near=np.where(d<0.025)[0]
inner=set(i for i in near if o[i]<0.0)
print('inner count', len(inner))
rim=set()
for i in near:
    if i in inner: continue
    for e in bm.verts[i].link_edges:
        j=e.other_vert(bm.verts[i]).index
        if j in inner: rim.add(i)
print('rim count', len(rim))
rim=list(rim)
# order by angle in x-z plane
ang=np.arctan2(co[rim,2]-E[2], co[rim,0]-E[0])
order=np.argsort(ang)
for k in order:
    i=rim[k]; print(i, co[i].round(4), 'd', round(d[i],4), 'o', round(o[i],2), 'ang', round(np.degrees(ang[k])))
# also inner closest to front
inn=np.array(sorted(inner))
print('inner y range', co[inn,1].min(), co[inn,1].max(), 'd range', d[inn].min(), d[inn].max())
