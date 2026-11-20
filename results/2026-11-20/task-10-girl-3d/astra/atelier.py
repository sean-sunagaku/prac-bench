"""Shared mesh, curve, shader and image construction in Blender. Lengths are metres."""
from pathlib import Path
from math import sin, cos, exp, pi, sqrt
import struct
import zlib
import bpy
import numpy as np
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
TAU = 2*pi
def sat(x): return max(0.0, min(1.0, x))
def smooth(a,b,x):
    t=sat((x-a)/(b-a))
    return t*t*(3-2*t)
def ga(x,s): return exp(-(x/s)**2)
def mix(a,b,t): return a+(b-a)*t
def color(code):
    if isinstance(code, str):
        v=[int(code[i:i+2],16)/255 for i in (0,2,4)]
        return tuple((q/12.92 if q<=.04045 else ((q+.055)/1.055)**2.4) for q in v)+(1.,)
    return tuple(code) if len(code)==4 else (*code,1.)
def collection(name,scene=None):
    col=bpy.data.collections.new(name)
    (scene or bpy.context.scene).collection.children.link(col)
    return col
def relink(obj,col):
    for old in list(obj.users_collection): old.objects.unlink(obj)
    col.objects.link(obj)
    return obj
def mesh(name,coords,faces,col,mats=(),smooth_faces=True):
    data=bpy.data.meshes.new(name)
    data.from_pydata(coords,[],faces)
    data.update()
    obj=bpy.data.objects.new(name,data)
    col.objects.link(obj)
    for mat in mats: data.materials.append(mat)
    if smooth_faces:
        data.polygons.foreach_set('use_smooth',np.ones(len(faces),dtype=np.bool_))
    return obj
def uv_coords(obj,per_vertex,name='UVMap'):
    layer=obj.data.uv_layers.new(name=name)
    ids=np.empty(len(obj.data.loops),np.int32)
    obj.data.loops.foreach_get('vertex_index',ids)
    arr=np.asarray(per_vertex,np.float32)[ids]
    layer.uv.foreach_set('vector',arr.ravel())
    return layer
def subsurf(obj,levels):
    mod=obj.modifiers.new('Catmull–Clark surface','SUBSURF')
    mod.levels=levels
    mod.render_levels=levels
    return mod
def mat(name,base,rough=.45,**values):
    m=bpy.data.materials.new(name)
    m.diffuse_color=color(base)
    m.use_nodes=True
    sh=m.node_tree.nodes.get('Principled BSDF')
    sh.inputs['Base Color'].default_value=color(base)
    sh.inputs['Roughness'].default_value=rough
    for k,v in values.items():sh.inputs[k].default_value=v
    sh.location=(390,80)
    m.node_tree.nodes.get('Material Output').location=(680,80)
    return m,sh
def node(m,typ,label,xy):
    n=m.node_tree.nodes.new(typ); n.label=label;n.name=label;n.location=xy
    return n
def link(m,a,ao,b,bi):
    m.node_tree.links.new(a.outputs[ao],b.inputs[bi])
def ramp(m,label,xy,stops):
    n=node(m,'ShaderNodeValToRGB',label,xy)
    el=n.color_ramp.elements
    el[0].position=stops[0][0];el[0].color=color(stops[0][1])
    el[1].position=stops[-1][0];el[1].color=color(stops[-1][1])
    for t,c in stops[1:-1]:el.new(t).color=color(c)
    return n
def curves(name,paths,radii,col,material):
    if not paths:return None
    data=bpy.data.hair_curves.new(name)
    sizes=[len(p) for p in paths]
    data.add_curves(sizes)
    data.set_types(type='CATMULL_ROM')
    res=data.attributes.get('resolution') or data.attributes.new('resolution','INT','CURVE')
    res.data.foreach_set('value',np.ones(len(sizes),np.int32))
    coords=np.concatenate([np.asarray(p,dtype=np.float32) for p in paths],axis=0)
    data.attributes['position'].data.foreach_set('vector',coords.ravel())
    rad=data.attributes.get('radius') or data.attributes.new('radius','FLOAT','POINT')
    rad.data.foreach_set('value',np.concatenate(radii).astype(np.float32))
    data.materials.append(material)
    obj=bpy.data.objects.new(name,data);col.objects.link(obj)
    return obj
def packed_image(name,arr,folder,noncolor=False):
    """Write our mathematical field as an ordinary PNG, then embed it in the blend."""
    arr=np.ascontiguousarray(np.flipud(np.uint8(np.clip(arr,0,1)*255+.5)))
    h,w=arr.shape[:2]
    channels=1 if arr.ndim==2 else arr.shape[2]
    def chunk(k,d):
        return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
    header=struct.pack('>2I5B',w,h,8,{1:0,3:2,4:6}[channels],0,0,0)
    data=b''.join(b'\0'+row.tobytes() for row in arr)
    path=Path(folder)/(name+'.png')
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',header)+chunk(b'IDAT',zlib.compress(data,6))+chunk(b'IEND',b''))
    img=bpy.data.images.load(str(path));img.name=name
    if noncolor:img.colorspace_settings.name='Non-Color'
    img.pack()
    img.filepath='//packed/'+path.name
    return img
def read_obj(path,body_only=False):
    vs=[];fs=[];g=''
    for line in path.open():
        if line.startswith('v '): vs.append(Vector(tuple(map(float,line.split()[1:4]))))
        elif line.startswith('g '): g=line.strip().split(' ',1)[1]
        elif line.startswith('f ') and (not body_only or g=='body'):
            fs.append(tuple(int(s.split('/')[0])-1 for s in line.split()[1:]))
    return vs,fs
def compact(v,f):
    ids=sorted({i for face in f for i in face})
    mp={j:i for i,j in enumerate(ids)}
    return [v[i] for i in ids],[tuple(mp[i] for i in face) for face in f],ids
# Roll from the reference, with a small yaw and forward nod. The neck takes up
# the rotation progressively. The head, eyelashes, eyes and scalp share it.
PIVOT=Vector((.000,-.029,1.392))
R=Matrix.Rotation(-.458,3,'Y') @ Matrix.Rotation(-.166,3,'Z') @ Matrix.Rotation(.070,3,'X')
SHIFT=Vector((.042,-.006,.000))
def head(p):
    v=Vector(p)
    return PIVOT + R @ (v-PIVOT) + SHIFT
def neck_pose(p):
    v=Vector(p)
    weight=smooth(1.370,1.445,v.z + max(0.,-v.y-.07)*.22)
    return v.lerp(head(v),weight)
def catmull(points,t):
    """Interpolate evenly placed artistic controls, retaining both endpoints."""
    t=sat(t)*(len(points)-1);i=min(int(t),len(points)-2);u=t-i
    a=points[max(0,i-1)];b=points[i];c=points[i+1];d=points[min(len(points)-1,i+2)]
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
