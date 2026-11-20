import bpy
sc = bpy.context.scene
for ob in sc.objects:
    for m in ob.modifiers:
        if m.type == 'SUBSURF': m.levels = m.render_levels
dg = bpy.context.evaluated_depsgraph_get()
tot = 0; char = 0; per = {}
for ob in sc.objects:
    n = 0
    if ob.type == 'MESH':
        ev = ob.evaluated_get(dg); me = ev.to_mesh(); n = len(me.vertices); ev.to_mesh_clear()
    elif ob.type == 'CURVES':
        n = len(ob.data.points)
    tot += n
    if not ob.name.startswith('Cafe_'): char += n
    per[ob.name] = n
big = sorted(per.items(), key=lambda kv: -kv[1])[:14]
print('TOTAL', tot, 'CHARACTER', char)
for k, v in big: print('  ', k, v)
