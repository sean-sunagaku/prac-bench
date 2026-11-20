"""Continuous set-in sweater with fitted armscyes, poseable hand topology and knit charts."""
from atelier import *
import random

TILE_W,TILE_H=.0144,.0168
N=120;JB=29;JT=47

def knit_tiles(folder,rib):
    n=448;nx=4;ny=6
    # One continuous yarn path. Adjacent courses overlap at the heads of the loops.
    ctrl=np.array([[-.53,-.105],[-.31,-.17],[-.135,-.008],[-.196,.30],[-.346,.67],
                   [-.321,.905],[-.15,1.045],[.04,1.069],[.235,1.00],[.331,.852],
                   [.318,.642],[.216,.358],[.140,.075],[.19,-.095],[.363,-.182],[.53,-.105]],np.float32)
    path=[catmull(ctrl,k/88) for k in range(89)];path=np.array(path)
    gridx=(np.arange(n)+.5)*nx/n;gridy=(np.arange(n)+.5)*ny/n
    top=np.full((n,n),-.35,dtype='f')
    fiber=np.zeros((n,n),dtype='f');rng=np.random.default_rng(321 if rib else 320)
    for j in range(-2,ny+1):
        for i in range(-1,nx+1):
            q=path.copy()
            off=.017*sin(TAU*(i%nx)/nx+TAU*(j%ny)/ny)
            q[:,0]=q[:,0]*(.88 if rib else 1.)+i+.5+off*np.sin(path[:,1]*pi)
            q[:,1]+=j+.20
            yarnrad=.145 if not rib else (.178 if i%2==0 else .145)
            for k,(a,b) in enumerate(zip(q,q[1:])):
                lo=max(0,int((min(a[0],b[0])-yarnrad)*n/nx));hi=min(n,int((max(a[0],b[0])+yarnrad)*n/nx)+2)
                bot=max(0,int((min(a[1],b[1])-yarnrad)*n/ny));up=min(n,int((max(a[1],b[1])+yarnrad)*n/ny)+2)
                if hi<=lo or up<=bot:continue
                dx,dy=b-a;u=gridx[None,lo:hi]-a[0];v=gridy[bot:up,None]-a[1]
                t=np.clip((u*dx+v*dy)/(dx*dx+dy*dy),0,1)
                d=np.hypot(u-t*dx,v-t*dy)/yarnrad
                inside=d<1;profile=np.sqrt(np.clip(1-d*d,0,1))
                s=(k+t)/88
                ground=-.07+.22*np.cos(TAU*(s-.27)*2)
                if rib:ground+=.24 if i%2==0 else -.14
                signed=(u*dy-v*dx)/(np.hypot(dx,dy)*yarnrad)
                twist=np.cos(TAU*(s*13.25+signed*.55+(j%ny)*.5+(i%nx)*.25))
                elevation=ground+.83*profile+.045*twist*profile
                sub=top[bot:up,lo:hi];fr=fiber[bot:up,lo:hi]
                winner=inside&(elevation>sub)
                sub[winner]=elevation[winner];fr[winner]=twist[winner]
    grain=rng.normal(0,.021,(n,n)).astype('f')
    wale=(.5-.5*np.cos(TAU*gridx))[None,:]**.62
    h=np.clip((top+.35)/1.61*.81+.19*wale+grain*.55,0,1)
    # Both height and color follow the same loop and twisted ply, with a soft dark ground.
    c=.69+.29*h+.067*wale+.026*fiber+grain*.61
    base=np.array([211,132,144])/255 if not rib else np.array([205,127,136])/255
    tag='Rib' if rib else 'Stockinette'
    return packed_image(tag+' • dyed wool ply',c[...,None]*base,folder),packed_image(tag+' • interlocking yarn relief',h,folder,True)

def knit_material(folder,rib):
    col,height=knit_tiles(folder,rib)
    m,p=mat(('Knit | crew, hem and cuff ribbing' if rib else 'Knit | dusty rose stockinette'),'d2959b',.74,
            **{'Sheen Weight':.28,'Sheen Roughness':.70,'Specular IOR Level':.22})
    tc=node(m,'ShaderNodeUVMap','Pattern-cut yarn coordinates',(-820,30));tc.uv_map='Knitting pattern'
    a=node(m,'ShaderNodeTexImage','Dyed and twisted yarn',(-600,180));a.image=col
    b=node(m,'ShaderNodeTexImage','Loop relief',(-600,-85));b.image=height
    for tex in [a,b]:link(m,tc,'UV',tex,'Vector')
    link(m,a,'Color',p,'Base Color')
    bump=node(m,'ShaderNodeBump','Crowns, legs and crossings',(-10,-75));bump.inputs['Strength'].default_value=.84;bump.inputs['Distance'].default_value=.0011 if not rib else .0013
    link(m,b,'Color',bump,'Height');link(m,bump,'Normal',p,'Normal')
    return m

def wrist(s):
    return Vector((s*(.134 if s==-1 else .162),-.437 if s==-1 else -.416,1.263 if s==-1 else 1.250))

def make_hands(col,env):
    orig,faces=read_obj(ROOT/'input/base.obj',body_only=True)
    verts=[Vector((p.x*.1,-p.z*.1,(p.y+8.168)*.1)) for p in orig]
    palm,sh=mat('Hands | rose ivory with nail beds','e6b9a3',.46,
                **{'Subsurface Weight':.13,'Subsurface Scale':.0016,'Specular IOR Level':.30})
    tone=node(palm,'ShaderNodeAttribute','Knuckles, fingertips and nails',(-260,180));tone.attribute_name='Hand complexion';link(palm,tone,'Color',sh,'Base Color')
    for s,label in [(-1,'R'),(1,'L')]:
        l='r' if s==-1 else 'l'
        marks={n:Vector(v) for n,v in env['landmarks'].items() if n.startswith('joint-'+l+'-')}
        def at(n):return marks['joint-'+l+'-'+n]
        old=at('hand')
        length=(at('finger-3-4')-old).normalized()
        width=(at('finger-5-1')-at('finger-2-1'));width=(width-length*width.dot(length)).normalized()
        dorsal=length.cross(width).normalized()
        newlen=Vector((s*(-.14 if s==1 else -.065),-.99,.17 if s==-1 else .09)).normalized()
        newwid=Vector((s,0,.10 if s==-1 else -.06));newwid=(newwid-newlen*newwid.dot(newlen)).normalized()
        newnorm=newlen.cross(newwid).normalized()
        selected=[f for f in faces if all(s*verts[i].x>.345 and (verts[i]-old).dot(length)>-.027 for i in f)]
        v,ff,_=compact(verts,selected);out=[];pig=[]
        nails=[at('finger-%d-4'%i) for i in range(1,6)]
        segments=[(at('finger-%d-1'%i),at('finger-%d-4'%i)) for i in range(1,6)]
        for idx,q in enumerate(v):
            d=q-old;a=d.dot(length);b=d.dot(width);c=d.dot(dorsal)
            # Mild distal flexion and decreasing spread of the fingers.
            flex=smooth(.070,.159,a)
            # The wrist landmark sits dorsal to the centre of its skin section.
            # Centre the covered portion, blending to the original palm beyond the cuff.
            c+=s*float(np.interp(a,[-.028,-.012,0,.018,.050],[.014,.010,.007,.004,0.]))
            b-=.0013*(1-smooth(-.008,.035,a))
            oval=sqrt((b/.0232)**2+(c/.0179)**2)
            if oval>1:
                fit=1-(1-1/oval)*(1-smooth(-.008,.014,a))
                b*=fit;c*=fit
            distances=[]
            for j,(knuckle,tip) in enumerate(segments):
                span=tip-knuckle;t=sat((q-knuckle).dot(span)/span.length_squared)
                distances.append(((q-knuckle-t*span).length,j,t))
            weights=[exp(-min(65.,(distance/.011)**2)) for distance,_,_ in distances]
            increments=[.001,.004,.008,.014,.020]
            bend=sum(w*increments[finger]*smooth(.21,.99,t) for w,(_,finger,t) in zip(weights,distances))/sum(weights)
            dest=wrist(s)+newlen*(a*.94-bend*.24)+newwid*(b*(1-.045*flex))+newnorm*(c*.96-s*(.014*flex+bend))
            out.append(dest)
            flush=.26*smooth(.030,.13,a)+.13*ga(a-.06,.014)
            base=np.array(color('e8bca8'));pink=np.array(color('d89a8d'))
            cc=base+(pink-base)*flush
            nd=min(np.linalg.norm(np.asarray(q-t)) for t in nails)
            if nd<.015:cc=cc+(np.array(color('e6aaa4'))-cc)*(.60*(1-nd/.015))
            pig.append(cc)
        obj=mesh('Hand '+label+' | relaxed reach from cuff',out,ff,col,[palm]);subsurf(obj,2)
        field=obj.data.color_attributes.new(name='Hand complexion',type='FLOAT_COLOR',domain='POINT')
        field.data.foreach_set('color',np.asarray(pig,np.float32).ravel())

def build(col,anatomy,skin,env,folder):
    yarn=knit_material(folder,False);rib=knit_material(folder,True)
    V=[];F=[];UV=[];MID=[]
    def add(p):V.append(Vector(p));return len(V)-1
    def quad(a,b,c,d,uvs,mi=0):
        F.append((a,b,c,d));UV.extend(uvs);MID.append(mi)
    # Cross sections from folded hem to underarm to shoulder cap and folded neckline.
    profiles=[
        (0,.149,.101,.087,1.049,0),(2,.151,.104,.089,1.052,0),(8,.150,.104,.089,1.075,0),
        (11,.158,.112,.097,1.093,0),(18,.163,.123,.099,1.148,0),(25,.163,.142,.103,1.218,0),
        (JB,.167,.142,.102,1.252,0),(36,.173,.136,.100,1.291,0),(42,.181,.119,.097,1.329,.008),
        (JT,.180,.099,.093,1.367,.017),(50,.174,.094,.087,1.381,.024),
        (54,.149,.090,.082,1.389,.031),(58,.110,.084,.074,1.393,.037),
        (61,.078,.079,.065,1.393,.046),(63,.073,.079,.065,1.394,.046),
        (67,.062,.071,.061,1.399,.043),(71,.052,.064,.055,1.402,.038),
        (72,.051,.063,.053,1.401,.038),(73,.052,.063,.053,1.398,.038)]
    data=np.array(profiles)
    grid=[];zc=[];circ=[]
    for j in range(74):
        w,front,back,zz,drop=[float(np.interp(j,data[:,0],data[:,k])) for k in range(1,6)]
        row=[]
        for i in range(N):
            t=i*TAU/N;co=cos(t);si=sin(t)
            radial=front if co>=0 else back
            # Ease in the body as it flows down from the armholes. Folds
            # collect near the hem and become broad, low-amplitude folds above.
            fade=1-smooth(36,56,j)
            dr=fade*(.0033*sin(7*t+.7*sin((zz-1.05)*12))+.0024*sin(11*t-2.2*(zz-1.10))+.0012*sin(18*t+.6))
            dr+=.0054*ga(zz-(1.099+.008*sin(t*3+.4)),.008)*(.55+.45*sin(t+1)**2)
            dr-=.0033*ga(zz-(1.087+.006*sin(t*3+.4)),.004)
            # Small diagonal gathers above the waist, concentrated on either flank.
            dr+=.0048*ga(zz-(1.142+.025*sin(t+.7)),.009)*abs(si)**2
            x=(w+dr)*si
            y=-.024-(radial+dr)*co
            z=zz-drop*max(0.,co)**1.35+.0035*max(0.,-co)*smooth(39,63,j)
            z-=.0065*si*smooth(20,50,j)*(1-.72*smooth(56,72,j))
            row.append(add((x,y,z)))
        grid.append(row);zc.append(zz);circ.append(2*pi*sqrt((w*w+(.5*(front+back))**2)/2))
    a0=17;a1=43
    # Constant column count across the body keeps wales vertical. Short rows
    # in the collar bend the yarn with the changing neckline.
    tv=np.zeros((len(grid),N),np.float64)
    for j in range(1,len(grid)):
        for i in range(N):
            dist=(V[grid[j][i]]-V[grid[j-1][i]]).length
            tv[j,i]=tv[j-1,i]+dist/TILE_H
    for j in range(len(grid)-1):
        for i in range(N):
            if JB<=j<JT and (a0<=i<a1 or N-a1<=i<N-a0):continue
            nxt=(i+1)%N
            count=52 if j<62 else 31
            f=i/N*count;g=(i+1)/N*count
            quad(grid[j][i],grid[j][nxt],grid[j+1][nxt],grid[j+1][i],[(f,tv[j,i]),(g,tv[j,nxt]),(g,tv[j+1,nxt]),(f,tv[j+1,i])],int(j<9 or j>=62))
    # The inside of the crew neck turns back toward the skin beneath the visible
    # rib. This fills the small wedge between an asymmetric neck and a circular band.
    previous=grid[-1]
    for scale,down in [(.965,.002),(.87,.004),(.72,.008),(.63,.011)]:
        inside=[]
        for i in range(N):
            h=V[grid[-1][i]]
            inside.append(add((.003+(h.x-.003)*scale,-.025+(h.y+.025)*scale,h.z-down)))
        for i in range(N):
            k=(i+1)%N
            u=i*31/N;u2=(i+1)*31/N;v0=tv[-1,i]
            quad(previous[i],previous[k],inside[k],inside[i],[(u,v0),(u2,tv[-1,k]),(u2,tv[-1,k]+.15),(u,v0+.15)],1)
        previous=inside
    # Recessed underside of the folded lower hem closes the bust.
    bottom=[]
    for i in range(N):
        p=V[grid[0][i]].copy();p.x*=.982;p.y=-.024+.973*(p.y+.024);p.z+=.002
        bottom.append(add(p))
    for i in range(N):
        k=(i+1)%N;quad(grid[0][k],grid[0][i],bottom[i],bottom[k],[(0,0),(1,0),(1,.2),(0,.2)],1)
    F.append(tuple(reversed(bottom)));UV.extend([(V[i].x/TILE_W,V[i].y/TILE_H) for i in reversed(bottom)]);MID.append(1)
    torso_face_count=len(F)
    for s in [-1,1]:
        seq=[(JB,i) for i in range(a0,a1)]+[(j,a1) for j in range(JB,JT)]+[(JT,i) for i in range(a1,a0,-1)]+[(j,a0) for j in range(JT,JB,-1)]
        root=[grid[j][(s*i)%N] for j,i in seq]
        count=len(root)
        angles=[]
        for idx,(j,i) in enumerate(seq):
            if idx<a1-a0: ang=-3*pi/4+(i-a0)/(a1-a0)*pi/2
            elif idx<a1-a0+JT-JB:ang=-pi/4+(j-JB)/(JT-JB)*pi/2
            elif idx<2*(a1-a0)+JT-JB:ang=pi/4+(a1-i)/(a1-a0)*pi/2
            else:ang=3*pi/4+(JT-j)/(JT-JB)*pi/2
            angles.append(ang)
        center=sum((V[k] for k in root),Vector())/count
        end=wrist(s);shoulder_z=1.333+(.004 if s<0 else -.004)
        ctrl=[center,Vector((s*.182,-.040,shoulder_z+.011)),Vector((s*.196,-.087,shoulder_z-.004)),
              Vector((s*.208,-.154,1.295)),Vector((s*.214,-.218,1.260)),Vector((s*.209,-.274,1.248)),
              Vector((s*.201,-.332,1.245)),Vector((s*.194,-.380,1.246)),end]
        inward=.051 if s<0 else .029
        for k,w in enumerate([0,.020,.16,.42,.73,.89,.96,.98,0]):
            ctrl[k].x-=s*inward*w
        old=root;last=center;vknit=0
        for row in range(1,83):
            u=row/82;c=catmull(ctrl,u)
            direction=(catmull(ctrl,min(1,u+.002))-catmull(ctrl,max(0,u-.002))).normalized()
            e1=s*Vector((0,0,1)).cross(direction).normalized()
            e2=(Vector((0,0,1))-direction*direction.z).normalized()
            radii=[.051,.055,.053,.052,.049,.049,.0465,.045,.0322,.0302,.0296]
            rad=float(np.interp(u,[0,.115,.25,.42,.57,.69,.78,.85,.90,.97,1],radii))
            new=[]
            for k,th in enumerate(angles):
                # Overlapping oblique compression folds at elbow and cuff.
                relief=0.
                for level,amp,width,phase in [(.42,.0034,.026,.2),(.53,.0065,.035,2.2),(.58,-.0035,.021,2.2),
                                (.65,.0052,.028,1.3),(.74,.0042,.026,.3),(.826,.0062,.027,2.7),(.863,-.0020,.023,2.7)]:
                    ridge=level+.031*sin(th+phase)+.011*sin(2*th+phase)
                    relief+=amp*ga(u-ridge,width)*(.31+.69*(.5+.5*cos(th-phase)))
                relief+=.0027*sin(6*th+u*6)*(.2+.8*sin(pi*u)**.7)
                cuff_fit=smooth(.865,.975,u)
                point=c+(rad+relief)*(e1*cos(th)*(1+.05*cos(pi*u))+e2*sin(th)*(1.05-.11*u)*(1-.23*cuff_fit))
                ease=smooth(0,.17,u)
                extension=c-center
                point=(V[root[k]]+extension).lerp(point,ease)
                new.append(add(point))
            vv=vknit+(c-last).length/TILE_H
            for k in range(count):
                nxt=(k+1)%count;U=angles[k]/TAU*16;U2=(angles[nxt] if nxt else angles[0]+TAU)/TAU*16
                ids=(old[k],old[nxt],new[nxt],new[k])
                coords=[(U,vknit),(U2,vknit),(U2,vv),(U,vv)]
                # Around the right armhole this boundary has the opposite winding
                # from the front panel. Reverse it for the mirror image.
                if s==1:ids=tuple(reversed(ids));coords=list(reversed(coords))
                quad(*ids,coords,int(u>=.893))
            last=c;vknit=vv;old=new
        # An inner cuff lip keeps the transition to the protruding wrist dimensional.
        inside=[add(V[k].lerp(c,.34)-direction*.008) for k in old]
        for k in range(count):
            nxt=(k+1)%count;ids=(old[k],old[nxt],inside[nxt],inside[k])
            if s==1:ids=tuple(reversed(ids))
            quad(*ids,[(0,0),(1,0),(1,.4),(0,.4)],1)
    obj=mesh('Sweater | continuous set-in sleeves, ribbed crew neck and cuffs',V,F,col,[yarn,rib])
    layer=obj.data.uv_layers.new(name='Knitting pattern')
    layer.uv.foreach_set('vector',np.asarray(UV,dtype=np.float32).ravel())
    obj.data.polygons.foreach_set('material_index',np.asarray(MID,np.int32))
    # Winding propagation ensures a consistent outward surface at both sewn armscyes.
    import bmesh
    bm=bmesh.new();bm.from_mesh(obj.data)
    loose=[v for v in bm.verts if not v.link_faces]
    if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(obj.data);bm.free()
    subsurf(obj,1)
    edging,_=mat('Knit | rose yarn crown and purl shadows','c4858c',.73,**{'Sheen Weight':.24,'Specular IOR Level':.18})
    pile,_=mat('Knit | soft short wool halo','d99fa6',.79,**{'Sheen Weight':.32})
    edgepaths=[];edgeradii=[]
    for i in range(142):
        a=(i+.5)*N/142;k=int(a);frac=a-k
        pts=[]
        for j in [62,63,64,65,66,67,68,69,70,71,72]:
            h=V[grid[j][k]].lerp(V[grid[j][(k+1)%N]],frac)
            tang=V[grid[j][(k+1)%N]]-V[grid[j][(k-1)%N]]
            radial=V[grid[min(j+1,73)][k]]-V[grid[j-1][k]]
            nor=tang.cross(radial).normalized()
            pts.append(h+nor*.00037)
        edgepaths.append(pts);edgeradii.append([.00042*(.27+.73*sin(pi*k/10)**.55) for k in range(11)])
    curves('Crew neck | individual raised rib wales',edgepaths,edgeradii,col,edging)
    rng=random.Random(791);fluff=[];rads=[]
    # Short fibers tilt along/against the stitch bed, softening the cloth silhouette.
    me=obj.data
    for k in range(3600):
        f=me.polygons[rng.randrange(len(me.polygons))]
        if len(f.vertices)!=4:continue
        a,b,c,d=[me.vertices[i].co for i in f.vertices]
        u=rng.random();v=rng.random();point=a.lerp(b,u).lerp(d.lerp(c,u),v)
        normal=f.normal.normalized();tan=(c-a).normalized()*rng.uniform(-1,1)+(d-b).normalized()*rng.uniform(-.65,.65)
        length=rng.uniform(.00057,.00125)
        fluff.append([point-normal*.00014,point+normal*(.49*length)+tan*(.25*length),point+normal*(.64*length)+tan*length])
        rad=rng.uniform(.000020,.000044);rads.append([rad,rad*.75,.000006])
    curves('Sweater | fine wool nap',fluff,rads,col,pile)
    from mathutils.bvhtree import BVHTree
    bpy.context.view_layer.update()
    global SWEATER_TREE, TORSO_TREE
    TORSO_TREE=BVHTree.FromPolygons(V,F[:torso_face_count])
    SWEATER_TREE=BVHTree.FromObject(obj,bpy.context.evaluated_depsgraph_get())
    make_hands(anatomy,env)
    return obj
