"""A small sunlit window seat, shared portrait lights and five physical cameras."""
from atelier import *
import random

def point_at(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def cuboid(name,at,dims,col,material,edge=0):
    x,y,z=[n/2 for n in dims]
    vs=[(i*x,j*y,k*z) for k in [-1,1] for j in [-1,1] for i in [-1,1]]
    f=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
    ob=mesh(name,vs,f,col,[material],False);ob.location=at
    if edge:
        be=ob.modifiers.new('Soft joinery edges','BEVEL');be.width=edge;be.segments=3
    return ob
def lathe(name,at,rows,col,matl):
    vs=[];fs=[];n=56
    for j,(r,z) in enumerate(rows):
        for i in range(n):
            a=TAU*i/n;vs.append((r*cos(a),r*sin(a),z))
            if j:
                k=(i+1)%n;fs.append(((j-1)*n+i,(j-1)*n+k,j*n+k,j*n+i))
    ob=mesh(name,vs,fs,col,[matl]);ob.location=at;return ob
def branch(name,a,b,r,col,material):
    a=Vector(a);b=Vector(b);d=b-a
    axis=d.normalized();e=axis.cross(Vector((1,0,0)) if abs(axis.x)<.8 else Vector((0,1,0))).normalized();g=axis.cross(e)
    n=7;vs=[t+rr*(e*cos(i*TAU/n)+g*sin(i*TAU/n)) for t,rr in [(a,r),(b,r*.68)] for i in range(n)]
    fs=[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    return mesh(name,vs,fs,col,[material])
def cafe_set(col):
    plaster,_=mat('Café | warm plaster','dfc9ac',.80)
    ceramic,_=mat('Café | creamy porcelain','e8dfcf',.25)
    amber,_=mat('Café | amber stoneware','906242',.37)
    dark,_=mat('Café | blackened window frame','4d4a41',.48)
    chalk,_=mat('Café | menu slate','384240',.87)
    wood,wp=mat('Café | oiled oak grain','b58150',.50)
    tc=node(wood,'ShaderNodeTexCoord','Wood coordinates',(-780,130));a=node(wood,'ShaderNodeVectorMath','Long grain',(-555,105));a.operation='MULTIPLY';a.inputs[1].default_value=(2.0,81.,101.)
    link(wood,tc,'Object',a,0);n=node(wood,'ShaderNodeTexNoise','Oak figure',(-330,80));n.inputs['Scale'].default_value=2.5;n.inputs['Detail'].default_value=3.;n.inputs['Distortion'].default_value=.35
    link(wood,a,'Vector',n,'Vector');rt=ramp(wood,'Oak and honey',(-90,215),[(.16,'9c704d'),(.51,'bd9469'),(.88,'d2ae7e')]);link(wood,n,'Fac',rt,'Fac');link(wood,rt,'Color',wp,'Base Color')
    outside,op=mat('Café | daylight beyond glazing','dce6e1',.70,**{'Emission Color':color('edeee3'),'Emission Strength':1.55})
    cuboid('Warm plaster behind bar',(.36,.99,1.5),(1.48,.07,1.9),col,plaster)
    cuboid('Glazing | bright overcast street',(-.73,.91,1.53),(.78,.022,1.65),col,outside)
    for i,x in enumerate([-.77,-.56,-.35]):
        cuboid('Window mullion %02d'%i,(x,.887,1.54),(.020,.039,1.65),col,dark,.003)
    for i,z in enumerate([1.26,1.87]):
        cuboid('Window crossrail %02d'%i,(-.73,.878,z),(.8,.036,.018),col,dark,.002)
    cuboid('Shelf uprights',(.075,.88,1.56),(.045,.117,.90),col,wood,.003)
    for j,z in enumerate([1.33,1.52,1.74]):
        cuboid('Oak shelf %02d'%j,(.44,.83,z),(.75,.24,.024),col,wood,.004)
        for i in range(5):
            x=.14+.115*i
            if j==2 and i<3:continue
            rr=.026 if i%2==0 else .029;h=.057+.008*((i+j)%3)
            lathe('Cup on shelf %d.%d'%(j,i),(x,.785+.017*(i%2),z+.013),
                [(.001,0),(rr*.64,0),(rr*.73,.005),(rr*.96,h*.78),(rr,h-.002),(rr*.97,h),(rr*.87,h),(rr*.83,h-.004),(rr*.68,.008),(.001,.008)],
                col,ceramic if (i+j)%3 else amber)
            if (i+j)%3!=1:
                potmat=ceramic if (i+j)%3 else amber
                # A rounded ceramic handle sits in a vertical plane behind the rim.
                v=[];f=[];side=1 if (i+j)%2 else -1
                c=Vector((x+side*rr*.84,.785+.017*(i%2),z+.013+h*.50))
                for k in range(25):
                    a=-pi*.51+pi*1.02*k/24
                    ct=c+Vector((side*.019*cos(a),0,h*.34*sin(a)))
                    norm=Vector((side*cos(a),0,sin(a))).normalized()
                    for l in range(8):
                        ang=l*TAU/8
                        v.append(ct+.0035*(norm*cos(ang)+Vector((0,1,0))*sin(ang)))
                        if k:
                            nxt=(l+1)%8;f.append(((k-1)*8+l,(k-1)*8+nxt,k*8+nxt,k*8+l))
                mesh('Glazed cup handle %d.%d'%(j,i),v,f,col,[potmat])
            if j in (0,1) and i%2==1:
                lathe('Stacked saucers %d.%d'%(j,i),(x+.033,.725,z+.014),
                      [(.001,0),(.025,0),(.038,.004),(.039,.006),(.022,.006),(.037,.008),(.039,.010),(.025,.010),(.001,.009)],col,ceramic)
    glaze,gp=mat('Café | smoked counter glass','a58c69',.18,**{'Transmission Weight':.72,'IOR':1.45})
    for k in range(3):
        x=.106+.108*k
        lathe('Tea jar %02d'%k,(x,.755,1.753),[(.001,0),(.023,0),(.026,.006),(.026,.068),(.021,.073),(.021,.080),(.019,.081),(.018,.074),(.024,.066),(.022,.007),(.001,.007)],col,glaze)
        lathe('Tea jar lid %02d'%k,(x,.755,1.832),[(.001,0),(.023,0),(.024,.004),(.022,.008),(.001,.009)],col,wood)
    cuboid('Menu board | walnut frame',(.29,.866,1.82),(.32,.027,.146),col,wood,.004)
    cuboid('Menu board | slate',(.29,.849,1.82),(.300,.009,.127),col,chalk,.002)
    cuboid('Window counter',(.045,.53,1.203),(1.39,.40,.030),col,wood,.008)
    cuboid('Chair | curved-width back rail',(-.02,.178,1.225),(.45,.035,.041),col,wood,.013)
    for s in [-1,1]:cuboid('Chair | stile '+str(s),(s*.20,.18,1.11),(.027,.031,.204),col,wood,.005)
    # A potted small-leaved tree by the glazing. Leaf blades fold along a midrib.
    leaves=[mat('Café | leaf '+str(i),code,.51,**{'Subsurface Weight':.06,'Subsurface Scale':.0005})[0] for i,code in enumerate(['59723c','708449','869856','68783f','91a45d'])]
    stem,_=mat('Café | woody stems','736343',.73)
    base=Vector((-.302,.40,1.218))
    lathe('Stoneware plant pot',base,[(.001,0),(.057,0),(.069,.017),(.082,.121),(.082,.128),(.076,.13),(.070,.115),(.001,.08)],col,ceramic)
    rng=random.Random(82);V=[];F=[];indices=[]
    for j in range(25):
        low=base+Vector((rng.uniform(-.02,.018),rng.uniform(-.018,.018),.112))
        mid=low+Vector((rng.uniform(-.10,.095),rng.uniform(-.054,.065),rng.uniform(.19,.32)))
        high=mid+Vector((rng.uniform(-.115,.10),rng.uniform(-.060,.070),rng.uniform(.10,.30)))
        branch('Ficus | branch %02d a'%j,low,mid,.0029,col,stem);branch('Ficus | branch %02d b'%j,mid,high,.0018,col,stem)
        for k in range(23):
            t=rng.uniform(.05,1);o=mid.lerp(high,t);ang=rng.uniform(0,TAU)
            d=Vector((cos(ang),sin(ang),rng.uniform(-.33,.7))).normalized()
            length=rng.uniform(.024,.057);w=length*rng.uniform(.22,.36)
            across=d.cross(Vector((.1,-.35,1))).normalized()
            q=len(V)
            V.extend([o,o+length*.40*d+w*across,o+length*.58*d+Vector((0,-.0017,.0021)),
                      o+length*d,o+length*.40*d-w*across])
            F.extend([(q,q+1,q+2),(q+1,q+3,q+2),(q+2,q+3,q+4),(q+2,q+4,q)])
            indices.extend([rng.randrange(len(leaves))]*4)
    leaf=mesh('Ficus | folded foliage blades',V,F,col,leaves)
    leaf.data.polygons.foreach_set('material_index',np.array(indices,np.int32))

def world(name,diag):
    w=bpy.data.worlds.new(name);w.use_nodes=True
    ns=w.node_tree.nodes;l=w.node_tree.links
    bg=ns.get('Background');bg.inputs['Color'].default_value=color('dedfdc');bg.inputs['Strength'].default_value=.23
    if diag:
        b=ns.new('ShaderNodeBackground');b.inputs['Color'].default_value=color('aba9a6');b.inputs['Strength'].default_value=.85;b.location=(0,-100)
        ray=ns.new('ShaderNodeLightPath');ray.location=(-280,-200)
        m=ns.new('ShaderNodeMixShader');m.location=(250,100)
        l.new(ray.outputs['Is Camera Ray'],m.inputs[0]);l.new(bg.outputs[0],m.inputs[1]);l.new(b.outputs[0],m.inputs[2]);l.new(m.outputs[0],ns.get('World Output').inputs['Surface'])
    return w
def area(col,name,loc,target,watt,width,height,code):
    data=bpy.data.lights.new(name,'AREA');data.shape='RECTANGLE';data.size=width;data.size_y=height
    data.energy=watt;data.color=color(code)[:3]
    ob=bpy.data.objects.new(name,data);col.objects.link(ob);ob.location=loc;point_at(ob,target)
    return ob
def camera(col,name,pos,target,lens=53,ortho=None):
    data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);col.objects.link(ob)
    ob.location=pos;point_at(ob,target);data.lens=lens;data.clip_start=.015;data.clip_end=25
    data.display_size=.066
    if ortho:data.type='ORTHO';data.ortho_scale=ortho
    return ob
def setup(scene,x,y):
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32
    scene.cycles.use_denoising=True;scene.cycles.denoiser='OPENIMAGEDENOISE';scene.cycles.denoising_use_gpu=False
    scene.cycles.max_bounces=6;scene.cycles.diffuse_bounces=3;scene.cycles.glossy_bounces=3;scene.cycles.transmission_bounces=4
    scene.cycles.transparent_max_bounces=6;scene.cycles.use_adaptive_sampling=False
    scene.render.threads_mode='FIXED';scene.render.threads=3
    scene.render.resolution_x=x;scene.render.resolution_y=y;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='8'
    scene.render.film_transparent=False;scene.render.use_compositing=False;scene.render.use_sequencer=False;scene.render.image_settings.compression=32
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=-.48
    scene.unit_settings.system='METRIC'
def build(scene,character,cafe,lights,cams):
    setup(scene,960,1040);scene.world=world('Café | diffuse daylight',False)
    cafe_set(cafe)
    target=(-.018,-.09,1.48)
    area(lights,'Window | large diffuse key',(-.39,-.55,1.83),target,19.5,.37,.49,'fff1e2')
    area(lights,'Front glass | broad soft fill',(.32,-.50,1.53),target,5.4,.56,.61,'ffe9e1').visible_glossy=False
    area(lights,'Window jamb | hair rim',(-.39,.17,1.78),(0,0,1.48),9,.36,.61,'f4f7ff')
    area(lights,'Shelf daylight | back and right edge',(.40,.30,1.80),(0,.04,1.48),11,.51,.63,'ffe7cc')
    area(lights,'Low bounce from table',(.03,-.45,1.12),(0,-.10,1.52),.72,.45,.32,'ffe6d7')
    area(lights,'Sunlit pane | warm half-tone',(-.24,-.60,1.87),target,2.4,.136,.19,'fff3e9')
    area(lights,'Near window | small eye reflection',(-.070,-.65,1.702),(-.01,-.14,1.53),.95,.092,.065,'fff9ef')
    b=camera(cams,'Beauty | window-seat selfie',(.001,-.830,1.571),(-.030,-.039,1.391),54)
    b.data.dof.use_dof=True;b.data.dof.focus_distance=(b.location-head((0,-.141,1.545))).length
    b.data.dof.aperture_fstop=4.2;b.data.dof.aperture_blades=8
    scene.camera=b;scene.render.filepath='//renders/beauty.png'
    diag=bpy.data.scenes.new('Turntable | neutral studio')
    for c in character+[lights,cams]:diag.collection.children.link(c)
    setup(diag,768,768);diag.world=world('Studio | warm gray, camera background',True)
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get();geometry=[]
    for c in character:
        for ob in c.objects:
            ev=ob.evaluated_get(dg);m=np.asarray(ev.matrix_world)
            if ev.type=='MESH':
                v=ev.data.vertices;coords=np.empty(3*len(v),np.float32);v.foreach_get('co',coords)
            elif ev.type=='CURVES':
                data=ev.data.attributes['position'].data;coords=np.empty(3*len(data),np.float32);data.foreach_get('vector',coords)
            else:continue
            geometry.append(coords.reshape(-1,3)@m[:3,:3].T+m[:3,3])
    xyz=np.concatenate(geometry);middle=Vector((xyz.min(0)+xyz.max(0))*.5)
    for name,degree in [('Front',0),('Three-quarter',45),('Side',90),('Back',180)]:
        a=degree*pi/180
        # Frame the projected asset including the hands, which extend toward -Y.
        direction=Vector((sin(a),-cos(a),.045)).normalized()
        right=Vector((cos(a),sin(a),0));up=direction.cross(right).normalized()
        horizontal=xyz@np.asarray(right);vertical=xyz@np.asarray(up)
        hx=float((horizontal.min()+horizontal.max())*.5);vy=float((vertical.min()+vertical.max())*.5)
        center=middle+right*(hx-middle.dot(right))+up*(vy-middle.dot(up))
        span=1.135*max(float(np.ptp(horizontal)),float(np.ptp(vertical)))
        cam=camera(cams,name+' | %03d°'%degree,center+direction*1.45,center,ortho=span)
        if degree==0:diag.camera=cam
    diag.render.filepath='//renders/front.png'
