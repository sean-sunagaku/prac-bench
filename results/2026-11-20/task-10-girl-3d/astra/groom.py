"""An asymmetric part groom, with individually editable native strands."""
from atelier import *
from portrait_surface import sculpt,build_eyes
import random

C=np.array([.000,-.055,1.552])
RAD=np.array([.0810,.1064,.1230])
M=np.asarray(R)
P=np.asarray(PIVOT);S=np.asarray(SHIFT)
NA,NL=19,23
TOTAL=NA+NL-1
GRID=245
def transform(v):return (v-P)@M.T+P+S
def part(q):
    b=-1.025+2.15*q
    v=-.240+.285*smooth(-1.035,.22,b)+.068*smooth(.17,1.24,b)+.020*sin(4.1*b)+.008*sin(12.2*b)
    return b,v
def crown_direction(s,q,layer):
    b,v=part(q);v+=s*(.0009+.005*layer+.003*sin(5.6*b))
    root=np.array([sin(v),sin(b)*cos(v),cos(b)*cos(v)])
    if s<0:
        a=-.87+2.415*q**.92+.037*sin(2*pi*q)
    else:
        a=.27+1.275*q**.94+.035*sin(2*pi*q)
    dec=(-.085 if s<0 else -.178)-.043*sin(pi*q)+.024*sin(3*pi*q+.4)
    end=np.array([s*cos(a)*cos(dec),sin(a)*cos(dec),sin(dec)])
    return root,end,b,a

def guide(s,q,layer):
    root,end,b,a=crown_direction(s,q,layer)
    ang=acos_clip(float(root@end));t=np.linspace(0,1,NA);ts=t[:,None]
    ns=(np.sin((1-ts)*ang)*root+np.sin(ts*ang)*end)/sin(ang)
    vol=(.0047+.0058*layer)*np.sin(t*pi*.84)**.73
    vol+=(.0050+.0060*(s<0))*(.60+.4*cos(2*pi*q))*np.sin(pi*t)**.90
    vol+=.0019*np.sin(12*pi*q+1.3*t)*np.sin(pi*t)**1.9
    vol*=.23+.77*smooth(.00,.125,q)
    scalp=C+ns*(RAD+vol[:,None])
    # Root lift is gradual, so the central scalp line remains visible.
    scalp[:,0]+=.0026*s*np.sin(pi*t)*sin(b*2.8)
    scalp[:,0]+=s*(.005+.017*(s<0))*(.31+.69*smooth(.0,.14,q))*(1-.66*q)*np.sin(t*pi*.62)**1.7
    scalp[:,1]-=.0054*(1-q)*np.sin(pi*t*.71)**1.85
    scalp[:,2]+=.0038*(1-q)*np.sin(pi*t)**1.3
    crown=transform(scalp)
    if s<0:
        crown[:,0]-=.014*(1-.44*q)*np.asarray([smooth(.56,1,v) for v in t])
    base=crown[-1]
    di=base-crown[-2];di/=np.linalg.norm(di)
    if s<0:
        cape=-1.18+.58*smooth(0,.48,q)+1.19*smooth(.44,.66,q)+.98*smooth(.60,1,q)
    else:
        cape=-.34+.84*smooth(.02,.25,q)+1.075*smooth(.23,1,q)
    co=cos(cape);si=sin(cape)
    front=1-smooth(-.66,.24,si)
    flank=ga(si,.48)
    breadth=.176+.044*flank
    sx=s*breadth*co
    sy=-.019+si*(.157 if si<0 else .111)
    sx+=s*.0045*sin(13*q+1.1)
    if s<0:sx-=.030*(1-smooth(.08,.45,q))
    lowerx=s*(.123+.072*flank)*co
    if s<0:lowerx+=.026*front*(.65+.35*(1-smooth(.05,.49,q)))
    lowery=mix(.085+.027*max(0.,si),-.161-.011*max(0.,-si),front)
    endz=(1.131 if s<0 else 1.167)+.034*sin(q*12+.4)+.025*sin(31*q)+.014*sin(71*q)-.040*smooth(.60,1,q)+layer*.014
    if s>0:endz+=.018*(1-smooth(.12,.50,q))
    shoulder_z=1.357+.006*sin(5*q)
    delta=base[2]-shoulder_z
    controls=np.array([base,
        [mix(base[0],sx,.19)+.004*di[0],mix(base[1],sy,.18)+.004*di[1],base[2]-.28*delta],
        [mix(base[0],sx,.57 if s<0 else .46),mix(base[1],sy,.53),base[2]-.63*delta],
        [sx,sy,shoulder_z],
        [mix(sx,lowerx,.33),mix(sy,lowery,.81),1.307+.004*sin(7*q)],
        [mix(sx,lowerx,.77),lowery, mix(1.301,endz,.50)],
        [lowerx,lowery+.006*sin(17*q),endz]])
    lt=np.linspace(0,1,NL)
    cascade=np.array([catmull(controls,u) for u in lt])
    fade=np.sin(lt*pi*.83)**1.27
    phase=2.3+3.2*q+1.05*sin(9*q)+.65*sin(34*q)+.43*layer
    nx=s*cos(cape);ny=sin(cape)
    wave=(.010+.014*front)*np.sin(lt*TAU*(1.25+.20*sin(7*q))+phase)*fade
    depth=(.007+.006*front)*np.cos(lt*TAU*(1.39+.18*cos(5*q))+phase+.45)*fade
    cascade[:,0]+=wave+layer*.0074*nx*fade
    cascade[:,1]+=depth+layer*.0085*ny*fade
    if si>-.05:
        keep_behind(cascade,layer)
    elif s<0 and si<-.24:
        keep_in_front(cascade,layer)
    whole=np.concatenate([crown,cascade[1:]],axis=0)
    # The side part gradually becomes a meridional fall at the occiput. Both
    # banks meet on the same continuous posterior surface at the centre back.
    blend=smooth(.38,.78,q)
    if blend:
        whole=mix(whole,posterior_flow(s,q,layer),blend)
        if q>.57:keep_behind(whole,layer)
    return whole

def posterior_flow(side,q,layer):
    theta=side*1.43*(1-q)/.62
    at=abs(theta)
    phi0=.12+.23*min(1.,at/1.4)
    ts=np.linspace(0,1,NA);crown=[]
    for t in ts:
        phi=mix(phi0,1.655+.026*cos(4*theta),t)
        az=mix(-.22+.69*theta,theta,smooth(.0,.90,t))+.025*sin(5*theta)*sin(pi*t)
        d=np.array([sin(phi)*sin(az),sin(phi)*cos(az),cos(phi)])
        puff=.0032+.0050*layer*sin(pi*t*.80)+.0054*sin(pi*t*.74)**.83
        p=C+d*(RAD+puff)
        p[0]+=.0052*sin(az)*sin(phi)*smooth(.22,.85,t)
        p[1]+=.0016*sin(21*theta+.9*t)*sin(pi*t)
        crown.append(transform(p))
    crown=np.array(crown);a=crown[-1]
    sx=.171*sin(theta);sy=.060+.064*cos(theta)
    zsh=1.353+.004*sin(3.1*theta);gap=a[2]-zsh
    ex=.129*sin(theta)+.009*sin(5.3*theta)
    ey=.103+.018*cos(theta*2.1)
    ez=1.119+.028*sin(4.2*theta+.54)+.019*sin(10.6*theta+.3)+.010*cos(23*theta)+.009*layer
    ctrl=np.array([a,[mix(a[0],sx,.23),mix(a[1],sy,.24)+.003,a[2]-.29*gap],
                   [mix(a[0],sx,.62),mix(a[1],sy,.61)+.005,a[2]-.64*gap],
                   [sx,sy,zsh],[mix(sx,ex,.42),mix(sy,ey,.68),1.291+.003*cos(4*theta)],
                   [mix(sx,ex,.78),ey,mix(1.291,ez,.53)],[ex,ey,ez]])
    fall=[]
    for t in np.linspace(0,1,NL):
        p=catmull(ctrl,t);amp=sin(pi*t*.86)**1.37
        phase=2.7*theta+1.1*sin(4.8*theta)+.47*cos(10.3*theta)
        p[0]+=(.010+.006*cos(3.8*theta))*sin(8.2*t+phase)*amp
        p[1]+=(.0074*cos(8.7*t+phase)+.007*layer)*amp
        fall.append(p)
    return np.vstack([crown,np.array(fall)[1:]])
def acos_clip(n):return float(np.arccos(max(-1,min(1,n))))
def hair_material():
    m=bpy.data.materials.new('Hair | chestnut fibers, layered longitudinal scattering')
    m.diffuse_color=color('513326');m.use_nodes=True
    nt=m.node_tree;nt.nodes.remove(nt.nodes.get('Principled BSDF'))
    h=node(m,'ShaderNodeBsdfHairPrincipled','Chestnut fiber scattering',(70,90))
    h.model='CHIANG';h.parametrization='COLOR'
    h.inputs['Roughness'].default_value=.43;h.inputs['Radial Roughness'].default_value=.54
    h.inputs['Random Roughness'].default_value=.12;h.inputs['Coat'].default_value=.02
    h.inputs['IOR'].default_value=1.48
    info=node(m,'ShaderNodeHairInfo','Per-strand variation',(-530,80))
    tones=ramp(m,'Cool roots, umber and chestnut',(-300,100),
               [(0,'201513'),(.25,'2d1c18'),(.62,'37221c'),(.89,'4b2d22'),(1,'63402e')])
    link(m,info,'Random',tones,'Fac');link(m,tones,'Color',h,'Color')
    link(m,h,0,nt.nodes.get('Material Output'),'Surface')
    return m
def undercoat_material():
    m,p=mat('Hair | anisotropic chestnut underlocks','3e281f',.55,**{'Anisotropic':.32,'Specular IOR Level':.19})
    tc=node(m,'ShaderNodeTexCoord','Lock coordinates',(-850,90))
    sep=node(m,'ShaderNodeVectorMath','Fine longitudinal grain',(-635,105));sep.operation='MULTIPLY';sep.inputs[1].default_value=(2200.,3.,1.)
    link(m,tc,'UV',sep,0)
    noise=node(m,'ShaderNodeTexNoise','Undyed strand variation',(-415,80));noise.inputs['Scale'].default_value=1.;noise.inputs['Detail'].default_value=1.5
    link(m,sep,'Vector',noise,'Vector')
    tone=ramp(m,'Layered chestnut undertones',(-150,200),[(.18,'211714'),(.53,'36251f'),(.76,'4d3024'),(.9,'624030')])
    link(m,noise,'Fac',tone,'Fac');link(m,tone,'Color',p,'Base Color')
    bp=node(m,'ShaderNodeBump','Filament grooves',(-90,-42));bp.inputs['Strength'].default_value=.21;bp.inputs['Distance'].default_value=.00010
    link(m,noise,'Fac',bp,'Height');link(m,bp,'Normal',p,'Normal')
    return m

def banks(s,col,hair,under,rng):
    library=np.array([[guide(s,q,l) for q in np.linspace(0,1,GRID)] for l in [-1,0,1]])
    def sample(q,level):
        q=np.clip(q,0,1)*(GRID-1);i=min(int(q),GRID-2);u=q-i
        l=min(1,max(-1,level));k=0 if l<0 else 1;v=l+1 if k==0 else l
        return (library[k,i]*(1-u)+library[k,i+1]*u)*(1-v)+(library[k+1,i]*(1-u)+library[k+1,i+1]*u)*v
    # Narrow overlapping convex hair locks supply deep shadow and continuous
    # volume under the native filaments. Vary the width down to a small point.
    vs=[];fs=[];uv=[];locks=76;rows=TOTAL;cols=7
    for h in range(locks):
        qc=(h+.5)/locks;ww=(.57+.08*sin(1.7*h))/locks
        endscale=.89+.09*(.5+.5*sin(3.7*h))+.015*sin(h)
        index=len(vs)
        for j in range(rows):
            t=j/(rows-1)
            taper=1-.96*smooth(.69,1,t)
            for i in range(cols):
                lateral=(2*i/(cols-1)-1)
                q=qc+lateral*ww*taper
                depth=-.83+(.17+.22*smooth(.48,.69,t))*(1-lateral*lateral)+.09*sin(h*1.8)
                p=sample(q,depth)
                # Hold the crown perimeter; adjust only the descending tip.
                f=j if j<NA else (NA-1)+(j-(NA-1))*endscale
                k=min(int(f),rows-2);pos=mix(p[k],p[k+1],f-k)
                vs.append(pos);uv.append((q,t))
                if i and j:
                    c=index+j*cols+i;fs.append((c-cols-1,c-cols,c,c-1))
    ob=mesh(('Right' if s<0 else 'Left')+' bank | layered underlocks',vs,fs,col,[under]);uv_coords(ob,uv,'Lock grain')
    paths=[];rads=[];fly=[];rf=[]
    tt=np.linspace(0,1,TOTAL);fall=np.clip((tt-(NA-1)/(TOTAL-1))/.55,0,1);envelope=np.sin(pi*tt*.89)
    for clump in range(260):
        mean=(clump+.5)/260+rng.uniform(-.0011,.0011)
        bulk=rng.uniform(-.22,.81);phase=rng.uniform(0,TAU)
        close=rng.uniform(.82,1.00);sway=rng.uniform(.0005,.0026)
        for j in range(19):
            q=mean+rng.uniform(-.0031,.0031)
            level=bulk+rng.normalvariate(.13,.27)
            isfly=(j==0 and clump%2==0) or rng.random()<.009
            if isfly:level=rng.uniform(.75,1.0)
            path=sample(q,level)
            jitter=rng.uniform(-.0009,.0009)
            noise=sway*np.sin(2*pi*tt*1.45+phase)+jitter*np.sin(15*tt+phase)
            path[:,0]+=noise*envelope
            path[:,1]+=.0009*np.cos(tt*12+phase)*envelope
            if isfly:
                flyphase=rng.uniform(0,TAU)
                path[:,0]+=s*(.001+.0055*rng.random())*np.sin(pi*tt)**1.4+.0024*np.sin(tt*16+flyphase)*envelope
                path[:,1]+=.0038*sin(flyphase)*envelope
            # A variation in layered haircut lengths keeps the wavy ends feathered.
            end=float(np.clip(close+rng.uniform(-.036,.056),.72,1))
            out=path.copy()
            for row in range(NA,TOTAL):
                f=NA-1+(row-(NA-1))*end;k=min(int(f),TOTAL-2);out[row]=mix(path[k],path[k+1],f-k)
            rad=rng.uniform(.000060,.000115)*( .70 if isfly else 1.0)
            rr=rad*np.minimum(1,.56+tt*8)*(1-.95*np.clip((tt-.64)/.36,0,1)**1.35)
            (fly if isfly else paths).append(out);(rf if isfly else rads).append(rr)
    tag='Right' if s<0 else 'Left'
    curves(tag+' | long wavy chestnut strands',paths,rads,col,hair)
    curves(tag+' | fine halo and flyaways',fly,rf,col,hair)

def fringe(col,hair,under,rng):
    paths=[];rr=[];verts=[];faces=[];uv=[];n=25
    tree=build_eyes.tree
    def front(x,z):
        p=tree.ray_cast((x,-.34,z),(0,1,0))[0]
        if p is not None:return sculpt(p).y
        return -.055-.107*sqrt(max(.03,1-(x/.081)**2-((z-1.552)/.118)**2))
    # Separate swept veils, with spaces between the locks to show the forehead.
    tips=[(-.061,1.521),(-.057,1.539),(-.052,1.557),(-.047,1.558),(-.041,1.566),
          (-.035,1.563),(-.025,1.560),(-.014,1.554),(-.006,1.552),(.003,1.548),
          (.010,1.552),(.015,1.556),(.023,1.573),(.033,1.579),(.043,1.577),
          (.049,1.566),(.055,1.559),(.061,1.546),(.066,1.542),(.070,1.529),(.071,1.517)]
    for i,(endx,endz) in enumerate(tips):
        rootx=-.021+endx*.62+rng.uniform(-.004,.004)
        rootz=1.621+.014*(.5+.5*sin(i*2.1))+.013*abs(endx)/.072
        bow=rng.uniform(.002,.007);depth=rng.uniform(.0019,.0039)
        width=(.0016+.0008*(.5+.5*sin(i*2.33)))*(1.42 if abs(endx)>.049 else .87)
        def bang(t,jitter,dl,short):
            t=t*short
            follow=1-max(0.,1-t)**1.65 if endx>.043 else t*t*(2-t)
            x=mix(rootx,endx,follow)-(.0093 if endx>-.023 else -.0030)*sin(pi*t)
            x+=jitter*(.39+.61*sin(pi*t*.95))+.0016*sin(2*pi*t+i*.23)*sin(pi*t)
            drop=(.34*t+.66*t*t) if endx>.043 else t
            z=mix(rootz,endz,drop)+bow*sin(pi*t)+.0018*smooth(.84,1,t)
            x+=.0034*smooth(.82,1,t)*(1 if endx>-.030 else -1)
            z+=.0019*sin(pi*t*.88)*jitter/max(width,.001)
            y=front(x,z)-depth*(.52+.88*sin(pi*t))-.0010*(1-t)-dl*sin(pi*t)
            return head((x,y,z))
        for j in range(26 if abs(endx)>.052 else 13):
            h=rng.normalvariate(0,width*.75);dl=rng.uniform(-.0008,.0008);short=rng.uniform(.86,1.04)
            coords=[bang(t,h,dl,short) for t in np.linspace(0,1,n)]
            radius=rng.uniform(.000046,.000083)
            paths.append(coords);rr.append([radius*(.68+.32*sin(pi*t*.8))*(1-.96*t**3) for t in np.linspace(0,1,n)])
        if abs(endx)>.064:
            off=len(verts)
            for k,t in enumerate(np.linspace(0,1,n)):
                for h in range(5):
                    u=h/2-1
                    w=width*.39*(1-.98*smooth(.44,1,t))
                    verts.append(bang(t,u*w,-.0005*(1+u*u),.95));uv.append(((i+.5+u*.35)/len(tips),t))
                    if k and h:
                        c=off+k*5+h;faces.append((c-6,c-5,c,c-1))
    # Finer central fringe hangs loosely from the part and turns outward near
    # the glabella. Each individual fiber conforms to the three-dimensional forehead.
    for i,(ex,ez) in enumerate([(-.008,1.551),(-.001,1.549),(.007,1.554),(.014,1.563)]):
        rx=-.026+.0029*i
        shape=np.array([[rx,1.632+.003*i],[rx-.0035,1.612],[rx-.004,1.587+.001*i],
                        [rx+.0045,1.564+.002*i],[ex-.0065,ez+.0008],[ex,ez+.0018]])
        for j in range(16):
            off=rng.uniform(-.0014,.0014);length=rng.uniform(.84,1.)
            trail=[];tt=np.linspace(0,1,25)
            for t in tt:
                x,z=catmull(shape,t*length)
                x+=off*(.45+.64*sin(pi*t*.83));z+=off*.50*sin(pi*t)
                y=front(x,z)-.0026-.0046*sin(pi*t)**.92-.00040*cos(j*1.75)
                trail.append(head((x,y,z)))
            rad=rng.uniform(.000060,.000088)
            paths.append(trail);rr.append(rad*(.68+.32*np.sin(pi*tt*.84))*(1-.95*tt**3.1))
    ob=mesh('Fringe | soft tapered wisps',verts,faces,col,[under]);uv_coords(ob,uv)
    curves('Light bangs | fine swept forehead strands',paths,rr,col,hair)

def build(col):
    rng=random.Random(19754)
    under=undercoat_material();hair=hair_material()
    pm,_=mat('Part | scalp between emerging roots','614338',.69)
    vs=[];fs=[]
    for j,q in enumerate(np.linspace(0,.73,105)):
        b,v=part(q)
        for i,ofs in enumerate([-.0065,0,.0065]):
            vv=v+ofs;direction=np.array([sin(vv),sin(b)*cos(vv),cos(b)*cos(vv)])
            vs.append(transform(C+direction*(RAD-.00026)))
            if i and j:
                k=3*j+i;fs.append((k-4,k-3,k,k-1))
    mesh('Narrow scalp part | asymmetric root line',vs,fs,col,[pm])
    scalp_roots(col,under)
    hairline(col,hair,rng)
    for s in [-1,1]:banks(s,col,hair,under,rng)
    rear_groom(col,hair,under,rng)
    loose_crown(col,hair,rng)
    fringe(col,hair,under,rng)
    falling_locks(col,hair,under,rng)
    temple_blend(col,hair,rng)

def falling_locks(col,fiber,under,rng):
    """Loose graduated layers gathered over the near shoulder and around the temples."""
    all_paths=[];all_r=[];vs=[];fs=[];uv=[]
    for side in [-1,1]:
        count=24 if side<0 else 9
        for h in range(count):
            u=(h+.5)/count
            if side<0:
                local=[(-.015-.018*u,-.145+.020*u,1.619+.022*u),(-.040-.021*u,-.147+.024*u,1.608+.018*u),
                       (-.070-.022*u,-.147+.028*u,1.583+.020*u),(-.090-.026*u,-.139+.034*u,1.554+.023*u),
                       (-.099-.028*u,-.133+.039*u,1.514+.022*u)]
                endpoint=1.092+.039*(.5+.5*sin(15*u))+.029*(.5+.5*sin(37*u))
                low=[(-.124-.033*u,-.140+.042*u,1.437+.015*u),
                     (-.134-.047*u,-.161+.040*u,1.383+.018*u),
                     (-.116-.047*u,-.165-.012*sin(3*u),1.330+.023*sin(4*u)),
                     (-.090-.041*u,-.174-.012*sin(5*u),1.282+.016*sin(4*u+.6)),
                     (-.095-.043*u,-.180+.011*cos(4*u),1.234+.018*sin(5*u+.4)),
                     (-.112-.026*u,-.164+.008*sin(7*u),1.183+.016*u),
                     (-.068-.047*u,-.153+.007*cos(5*u),endpoint)]
            else:
                local=[(-.004+.015*u,-.140+.013*u,1.628+.013*u),(.024+.013*u,-.144+.021*u,1.612+.013*u),
                       (.050+.008*u,-.137+.026*u,1.591+.014*u),(.065+.009*u,-.118+.051*u,1.565+.012*u),
                       (.072+.010*u,-.092+.066*u,1.542+.015*u)]
                endpoint=1.325+.053*u+.020*sin(7*u)
                low=[(.073+.026*u,-.098+.089*u,1.449+.017*u),
                     (.085+.056*u,-.120+.044*u,1.402+.012*u),
                     (.092+.064*u,-.127+.041*u,1.366+.017*u),
                     (.094+.087*u,-.105+.051*u,endpoint)]
            above=transform(np.array(local));below=np.array(low)
            if side<0:
                for k in range(2,len(below)):
                    below[k,0]+=.028*smooth(1.355,1.22,below[k,2])*(.70+.30*cos(4*u))
                below[-1,2]+=.018*(.5+.5*cos(9*u))
            # The rolled head lowers the near temple in world space. Continue
            # downhill from its posed position into the shoulder, without a cusp.
            below[0]=mix(above[-1],below[1],.49)
            below[0,0]+=.004*side*sin(3.2*u)
            controls=np.vstack([above,below])
            ns=47 if side<0 else 35
            t=np.linspace(0,1,ns);center=np.array([catmull(controls,e) for e in t])
            twist=TAU*t*(1.29+.3*u)+2.15*u+.38*sin(28*u)
            amplitude=.0035+.0062*u
            center[:,0]+=amplitude*np.sin(twist)*np.sin(t*pi*.85)**1.2
            center[:,1]+=.0041*np.cos(twist+.5)*np.sin(t*pi*.85)**1.25
            if side<0:keep_in_front(center,.36)
            w=.0021+.0023*(.5+.5*sin(5*h+.7))
            if side>0:w*=.64
            def filament(offset,depth,phase,length):
                widthshape=(.51+.49*np.sin(pi*t*.91))*(1-.90*np.clip((t-.66)/.34,0,1)**1.30)
                out=center.copy()
                out[:,0]+=w*offset*(.67+.4*np.cos(twist))*widthshape
                out[:,1]+=w*(.73*np.sin(twist)*offset+depth)*widthshape
                out[:,2]+=w*.48*np.sin(twist)*offset*widthshape
                out[:,0]+=(.00175+.0021*abs(offset))*np.sin((10+.9*offset)*t+phase)*np.sin(t*pi)
                out[:,1]+=(.0013+.0013*abs(offset))*np.cos(9*t+phase)*np.sin(t*pi*.85)
                # Shorter hairs run along the same section before peeling away at the tip.
                if length<1:
                    f=t*length*(ns-1);lo=np.minimum(f.astype(int),ns-2)
                    out=(out[lo]*(1-(f-lo))[:,None]+out[lo+1]*(f-lo)[:,None])
                return out
            # A domed supporting ribbon under each denser cascade. Wisps either
            # side of the ear are made from fibers alone.
            if side<0:
                off=len(vs)
                surface=[filament(v,.03+.35*v*v,1.2,.96) for v in np.linspace(-.83,.83,5)]
                for k,e in enumerate(t):
                    for j,v in enumerate(surface):
                        vs.append(v[k]);uv.append(((h+.24*j)/count,e))
                        if k and j:
                            n=off+5*k+j;fs.append((n-6,n-5,n,n-1))
            for j in range(49 if side<0 else 15):
                off=rng.normalvariate(0,.87);dep=rng.uniform(-.72,.4);phase=rng.uniform(0,TAU)
                length=rng.uniform(.86,1)
                path=filament(off,dep,phase,length)
                rad=rng.uniform(.000061,.000105)
                all_paths.append(path);all_r.append(rad*(.67+.33*np.sin(pi*t*.80))*(1-.97*t**3.7))
    lock=mesh('Over the shoulder | graduated S-wave underlocks',vs,fs,col,[under]);uv_coords(lock,uv,'Cascade grain')
    curves('Face-framing layers | shoulder waves and tucked-ear wisps',all_paths,all_r,col,fiber)

def keep_behind(points,layer):
    """Lift the posterior layers over the actual shoulder and sweater surfaces."""
    from wardrobe import SWEATER_TREE
    for p in points:
        if not 1.045<p[2]<1.406:continue
        loc=SWEATER_TREE.ray_cast((float(p[0]),.35,float(p[2])),(0,-1,0),.70)[0]
        if loc is not None:
            p[1]=max(p[1],loc.y+.0068+.0038*(1+layer))

def scalp_roots(col,material):
    """A close-fitting root bed over the actual head, with a raised line above the ear."""
    vs=[];fs=[];uv=[];tree=build_eyes.tree
    for j in range(31):
        t=(j+.009)/30.009
        for i in range(145):
            th=(i/144-.5)*TAU
            side=abs(th)
            maxphi=.986+.44*smooth(.25,1.20,side)+.30*smooth(1.40,1.88,side)+.46*smooth(1.86,pi,side)
            maxphi-=.080*ga(side-1.49,.21)
            phi=maxphi*t
            d=np.array([sin(th)*sin(phi),-cos(th)*sin(phi),cos(phi)])
            ray=Vector(d*RAD).normalized();hit=tree.ray_cast(Vector(C),ray,.24)[0]
            if hit is None or (hit-Vector(C)).length<.043:
                loc=Vector(C+d*(RAD-.0035))
            else:loc=sculpt(hit)
            vs.append(head(loc+ray*(.00029+.0012*(1-t)**.69)));uv.append((i/144,t))
            if i and j:
                k=j*145+i;fs.append((k-146,k-145,k,k-1))
    rootmat,bs=mat('Scalp | fine roots fading into temple skin','52392d',.63,**{'Specular IOR Level':.15})
    coord=node(rootmat,'ShaderNodeTexCoord','Hairline coordinates',(-810,80));split=node(rootmat,'ShaderNodeSeparateXYZ','Falloff at temples',(-585,110));link(rootmat,coord,'UV',split,'Vector')
    opacity=ramp(rootmat,'Root density at the edge',(-360,180),[(0,(1,1,1)),(.86,(1,1,1)),(.975,(.12,.12,.12)),(1,(0,0,0))]);link(rootmat,split,'Y',opacity,'Fac')
    trans=node(rootmat,'ShaderNodeBsdfTransparent','Spaces between roots',(170,-95))
    ms=node(rootmat,'ShaderNodeMixShader','Feathered perimeter',(640,90));link(rootmat,opacity,'Color',ms,0);link(rootmat,trans,0,ms,1);link(rootmat,bs,0,ms,2)
    link(rootmat,ms,0,rootmat.node_tree.nodes.get('Material Output'),'Surface')
    ob=mesh('Scalp | fitted root bed and temple hairline',vs,fs,col,[rootmat]);uv_coords(ob,uv,'Root flow')

def rear_groom(col,hair,under,rng):
    """Overlying rear fibers use the same continuous growth field as the banks."""
    paths=[];radii=[];ts=np.linspace(0,1,TOTAL);n=144
    for side in [-1,1]:
        lib=np.array([[guide(side,q,l) for q in np.linspace(.46,1,n)] for l in [.14,.99]])
        for j in range(750):
            q=rng.uniform(.463,1)
            v=(q-.46)/.54*(n-1);k=min(n-2,int(v));r=v-k;depth=rng.random()
            a=mix(lib[0,k],lib[0,k+1],r);b=mix(lib[1,k],lib[1,k+1],r)
            path=mix(a,b,depth)
            phase=rng.uniform(0,TAU);amp=rng.uniform(.0006,.0034)
            path[:,0]+=amp*np.sin(12.2*ts+phase)*np.sin(pi*ts*.91)
            path[:,1]+=.0017*np.cos(13.4*ts+phase)*np.sin(pi*ts)
            end=rng.uniform(.83,1.0);idx=np.arange(TOTAL)
            f=np.minimum(idx,NA-1)+np.maximum(0,idx-NA+1)*end
            lo=np.minimum(f.astype(int),TOTAL-2)
            path=path[lo]*(1-(f-lo))[:,None]+path[lo+1]*(f-lo)[:,None]
            width=rng.uniform(.000052,.000098)
            paths.append(path);radii.append(width*(.49+.51*np.minimum(ts*11,1))*(1-.95*ts**3.3))
    curves('Back hair | fibers following the occipital flow',paths,radii,col,hair)

def loose_crown(col,hair,rng):
    """Mixed root origins soften the part and interrupt the regular guide direction."""
    paths=[];rr=[]
    for s in [-1,1]:
        for i in range(470):
            q=rng.uniform(-.008,.95)
            data=guide(s,max(0,q),rng.uniform(.15,.95))
            frac=rng.uniform(.28,.60) if q<.27 else rng.uniform(.19,.55)
            n=20;t=np.linspace(0,1,n);keys=t*frac*(TOTAL-1)
            k=np.minimum(keys.astype(int),TOTAL-2)
            phase=rng.uniform(0,TAU);v=(1-(keys-k)[:,None])*data[k]+(keys-k)[:,None]*data[k+1]
            v[:,0]+=s*rng.uniform(-.0055,-.0001)*(1-t)**2
            v[:,0]+=.0025*np.sin(t*6+phase)*np.sin(pi*t)**.8
            v[:,1]+=rng.uniform(-.0036,.0022)*np.sin(pi*t)**.9
            v[:,2]+=rng.uniform(.00015,.0043)*np.sin(pi*t)**.7
            rad=rng.uniform(.000047,.000088)
            paths.append(v);rr.append(rad*(.20+.80*np.sin(pi*t)**.63))
    curves('Crown | scattered roots and short crossing hairs',paths,rr,col,hair)

def hairline(col,material,rng):
    paths=[];rr=[];tree=build_eyes.tree;ts=np.linspace(0,1,14)
    for i in range(970):
        th=rng.uniform(-1.60,1.74);side=abs(th);sign=1 if th>-.22 else -1
        phi0=.986+.44*smooth(.25,1.20,side)+.30*smooth(1.4,1.88,side)-.080*ga(side-1.49,.21)
        start=phi0+rng.uniform(-.055,.035)
        sweep=rng.uniform(.18,.43)*sign;back=rng.uniform(.12,.30);pts=[]
        for t in ts:
            phi=start-back*t;az=th+sweep*t**1.12
            d=np.array([sin(az)*sin(phi),-cos(az)*sin(phi),cos(phi)])
            ray=Vector(d*RAD).normalized();hit=tree.ray_cast(Vector(C),ray,.25)[0]
            if hit is None or (hit-Vector(C)).length<.047:loc=Vector(C+d*(RAD-.0035))
            else:loc=sculpt(hit)
            pts.append(head(loc+ray*(.00021+.0046*t**1.2+.0015*sin(pi*t))))
        rad=rng.uniform(.000047,.000090)
        paths.append(pts);rr.append(rad*(.20+.80*np.sin(pi*ts*.88)**.67))
    # A handful of loose groups run well outside the combed temple contours.
    for side in [-1,1]:
        for group in range(26):
            q=rng.uniform(.012,.53)
            guidepath=guide(side,q,.94);start=rng.uniform(.045,.18);end=rng.uniform(.61,.92)
            t=np.linspace(0,1,31);key=(start+(end-start)*t)*(TOTAL-1);lo=np.minimum(key.astype(int),TOTAL-2)
            original=guidepath[lo]*(1-(key-lo))[:,None]+guidepath[lo+1]*(key-lo)[:,None]
            phase=rng.uniform(0,TAU);spread=rng.uniform(.0055,.017);lift=rng.uniform(.001,.0074)
            for i in range(4):
                v=original.copy();rand=rng.uniform(-.0018,.0018)
                v[:,0]+=side*(spread+rand)*np.sin(pi*t*.94)**.9+rand*np.sin(14*t+phase)
                v[:,1]+=(.0045*cos(phase)+rand)*np.sin(pi*t)
                v[:,2]+=lift*np.sin(pi*t)**1.25
                rad=rng.uniform(.000054,.000082)
                paths.append(v);rr.append(rad*(.22+.78*np.sin(pi*t)**.70))
    curves('Temple hairline | emerging roots and loose fine groups',paths,rr,col,material)

def keep_in_front(points,layer):
    # Long front layers fall on the chest and pass behind the reaching arm.
    # The torso panel provides their support independently of the sleeve.
    from wardrobe import TORSO_TREE
    for p in points:
        if not 1.055<p[2]<1.404:continue
        loc=TORSO_TREE.ray_cast((float(p[0]),-.40,float(p[2])),(0,1,0),.70)[0]
        if loc is not None:
            p[1]=min(p[1],loc.y-.0047-.0025*(1+layer))

def temple_blend(col,material,rng):
    """Loose fibers draped across the join between the near temple and shoulder layers."""
    from mathutils.bvhtree import BVHTree
    vv=[];ff=[]
    for name in ['Right bank | layered underlocks','Over the shoulder | graduated S-wave underlocks']:
        ob=bpy.data.objects[name];off=len(vv);vv.extend(v.co.copy() for v in ob.data.vertices)
        ff.extend(tuple(off+i for i in f.vertices) for f in ob.data.polygons)
    bed=BVHTree.FromPolygons(vv,ff);paths=[];rad=[];ts=np.linspace(0,1,33)
    for i in range(26):
        q=.006+.33*(i+.5)/26
        main=guide(-1,q,.48)
        start=main[11+i%3].copy();finish=main[30+i%4].copy()
        center=np.array([mix(start,finish,t) for t in ts])
        center[:,0]-=(.007+.007*sin(i*.39))*np.sin(pi*ts)**1.06
        center[:,0]+=.007*np.sin(ts*TAU*1.11+i*.27)*np.sin(pi*ts)
        for j,p in enumerate(center):
            hit=bed.ray_cast((float(p[0]),-.40,float(p[2])),(0,1,0),.69)[0]
            if hit is not None:
                p[1]=min(p[1],hit.y-.00165)
        yy=center[:,1].copy()
        center[1:-1,1]=np.minimum(yy[1:-1],.21*yy[:-2]+.58*yy[1:-1]+.21*yy[2:])
        for j in range(20):
            path=center.copy();offset=rng.uniform(-.0027,.0027);phase=rng.uniform(0,TAU)
            path[:,0]+=offset+.0015*np.sin(14*ts+phase)*np.sin(pi*ts)
            path[:,1]+=rng.uniform(-.0021,.0008)*np.sin(pi*ts)+.0018*(1-ts)**6
            width=rng.uniform(.000050,.000091)
            paths.append(path);rad.append(width*(.035+.965*np.sin(pi*ts)**.55))
    curves('Loose temple layers | fibers draped over the shoulder',paths,rad,col,material)
