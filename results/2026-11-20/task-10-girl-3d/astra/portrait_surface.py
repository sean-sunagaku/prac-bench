"""Sculpt the supplied continuous face, paint original pigment fields and construct optics."""
from atelier import *
from math import atan2,acos
from mathutils.bvhtree import BVHTree
import random

XMIN,XMAX=-.093,.093
ZMIN,ZMAX=1.420,1.670

def sculpt(p):
    x,y,z=p;u=abs(x);s=1 if x>=0 else -1
    front=smooth(.068,.118,-y)
    jaw=ga(z-1.455,.042)
    # A shorter lower face, less square gonial angle and fuller anterior cheeks.
    xx=x*(1-.129*jaw*(.55+.45*front)+.023*ga(z-1.523,.024))
    zz=z+.0110*ga(z-1.431,.034)*front
    yy=y+.0027*ga(z-1.439,.026)*front
    yy-=front*(.0062*ga(u-.041,.027)*ga(z-1.525,.026)+.0027*ga(u-.048,.019)*ga(z-1.503,.040))
    # Integrate the alae, soften the upper bridge and give the tip a small lift.
    n=ga(u,.023)*ga(z-1.506,.020)*front
    xx-=x*.182*n
    yy+=.0026*n+.0040*ga(u,.016)*ga(z-1.535,.027)*front
    zz+=.0043*n
    yy-=.0020*ga(u,.009)*ga(z-1.509,.011)*front
    orbit=ga(u-.0310,.023)*ga(z-1.5452,.016)*smooth(.075,.119,-y)
    xx+=s*(u-.0310)*.158*orbit
    zz+=(z-1.5452)*.224*orbit + s*.00029*orbit
    yy+=.0020*ga(u-.029,.026)*ga(z-1.562,.012)*front
    lidtop=1.5508+.0021*ga(u-.032,.013)
    yy+=.00135*ga(z-lidtop-.0021,.00165)*ga(u-.032,.0145)*front
    yy-=.0014*ga(z-lidtop+.00085,.0020)*ga(u-.032,.013)*front
    yy-=.0011*ga(z-1.537,.0035)*ga(u-.034,.013)*front
    # Soft closed smile. The geometry of the lip rolls and the corners moves together.
    m=ga(u,.033)*ga(z-1.478,.022)*front
    xx+=x*.081*m
    yy+=.0036*m
    zz-=(z-1.4782)*(.27 if z>=1.4782 else .23)*m
    turn=ga(u-.022,.015)*ga(z-1.4785,.024)*front
    zz+=(.0050 + s*.00075)*turn
    yy+=.0017*turn + .0015*ga(u-.030,.005)*ga(z-1.486,.006)*front
    # Less rotation at the base of the neck, which remains inside the neckline.
    smilefold=ga(u-(.020+.41*(1.504-z)),.0048)*ga(z-1.493,.014)
    yy+=.00135*smilefold*front
    zz+=.0018*ga(u-.038,.021)*ga(z-1.498,.020)*front
    auricle=smooth(.068,.082,u)*ga(y+.053,.028)*ga(z-1.530,.036)
    xx+=s*.0038*auricle;yy-=.0033*auricle
    if z<1.447 and y>-.105:
        xx*=1-.090*ga(z-1.402,.045)
    if z<1.425 and (y>-.102 or z<1.356):
        dy=yy+.024
        rr=sqrt((xx/.0515)**2+(dy/(.064 if dy<0 else .054))**2)
        squeeze=(1-smooth(1.393,1.425,z))*max(0.,rr-.972)
        if rr>0 and squeeze:
            factor=1-.93*squeeze/rr
            xx*=factor;yy=-.024+dy*factor;zz-=min(.021,.015*squeeze)
    return Vector((xx,yy,zz))

def brow_line(x):
    t=(x-.014)/.042
    return 1.5604+.0076*np.sin(np.pi*(.04+.79*t))-.0020*t*t

def pigment(folder):
    W,H=1152,1536
    x=np.linspace(XMIN,XMAX,W,dtype='f')[None,:]
    z=np.linspace(ZMIN,ZMAX,H,dtype='f')[:,None];u=np.abs(x)
    rng=np.random.default_rng(61)
    field=np.empty((H,W,3),np.float32);field[:]=np.array([230,178,153])/255
    def brush(cx,cz,rx,rz):return np.exp(-((x-cx)/rx)**2-((z-cz)/rz)**2)
    def glaze(col,w):
        nonlocal field
        field+=(np.asarray(col,np.float32)/255-field)*np.clip(w,0,1)[...,None]
    # Zones of skin color, with small low-frequency irregularity.
    mottling=(np.sin(406*x+233*z)*np.cos(295*z-100*x)+.42*np.cos(909*x-685*z))*.014
    field+=mottling[...,None]*np.array([.31,.49,.41])
    for side in [-1,1]:
        glaze([231,135,133],.59*brush(side*.045,1.517,.031,.018))
        glaze([238,172,149],.29*brush(side*.050,1.494,.023,.028))
        glaze([196,118,110],.38*brush(side*.031,1.5400,.020,.0061))
        glaze([177,104,91],.44*brush(side*.031,1.552,.021,.007))
        glaze([231,175,153],.28*brush(side*.016,1.510,.013,.019))
        glaze([218,146,127],.30*brush(side*.0205,1.478,.007,.008))
        glaze([213,139,130],.28*brush(side*.080,1.526,.010,.023))
        glaze([244,196,166],.36*brush(side*.043,1.529,.022,.008))
    # Pigment follows the creased upper lid, the under-eye roll and the alar furrows.
    eu=np.clip((u-.0176)/.027,0,1)
    valid=np.clip((u-.0173)/.0035,0,1)*np.clip((.0466-u)/.0038,0,1)
    upper=1.5441+.0020*eu+.00525*np.maximum(np.sin(np.pi*eu),0)**.78
    crease=upper+.0022+.0008*np.sin(np.pi*eu)
    glaze([142,84,68],np.exp(-((z-crease)/.00083)**2)*valid*.44)
    glaze([157,89,77],np.exp(-((z-upper)/.00135)**2)*valid*.37)
    under=1.54325+.00185*eu-.00325*np.maximum(np.sin(np.pi*eu),0)**.85
    glaze([184,103,88],np.exp(-((z-under+.0012)/.0019)**2)*valid*.34)
    glaze([199,114,104],.46*np.exp(-((u-.0177)/.0029)**2-((z-1.544)/.0026)**2))
    # Soft alar creases around the integrated nose.
    alarx=.0148+.0010*np.tanh((z-1.502)/.003)
    glaze([176,98,82],.33*np.exp(-((u-alarx)/.00165)**2-((z-1.5033)/.0043)**2))
    glaze([234,146,132],.40*brush(0,1.509,.016,.012))
    glaze([247,202,176],.36*brush(0,1.532,.0075,.030))
    glaze([240,193,171],.52*brush(0,1.45,.023,.017))
    glaze([237,186,158],.34*brush(0,1.592,.033,.035))
    # A few faint warm freckles and individual pores; the image contains pigment only.
    for i in range(295):
        cx=float(rng.uniform(-.073,.073));cz=float(rng.normal(1.523,.016))
        if abs(cx)<.013 and cz>1.535:continue
        rad=float(rng.uniform(.00012,.00055))
        a=int((cx-XMIN)/(XMAX-XMIN)*W);b=int((cz-ZMIN)/(ZMAX-ZMIN)*H)
        lo=max(0,a-14);hi=min(W,a+15);bot=max(0,b-14);top=min(H,b+15)
        if hi<=lo or top<=bot:continue
        sel=field[bot:top,lo:hi];spot=np.exp(-((x[:,lo:hi]-cx)/rad)**2-((z[bot:top]-cz)/(.8*rad))**2)
        sel+=(np.array([.60,.36,.24])-sel)*(float(rng.uniform(.08,.28))*spot)[...,None]
    for cx,cz,rs in [(-.0253,1.530,.00059),(.0483,1.507,.00048),(.043,1.523,.00032)]:
        glaze([148,91,75],.29*brush(cx,cz,rs,rs*.88))
    # Feathered eyebrows under individual groomed fibers.
    bt=np.clip((u-.014)/.042,0,1);sep=z-brow_line(u)
    edge=np.clip((u-.013)/.004,0,1)*np.clip((.057-u)/.006,0,1)
    width=.0011+.0023*(1-bt)**.7
    bm=np.exp(-(sep/width)**2)*edge
    glaze([109,73,59],bm*.54)
    # Anatomical vermilion border follows the supplied outer lip rings in bind coordinates.
    knots=[0,.003,.007,.011,.016,.020,.023,.0257,.0273]
    top=np.interp(u,knots,[1.4860,1.4867,1.4881,1.4873,1.4848,1.4821,1.4803,1.4788,1.4786])
    low=np.interp(u,knots,[1.4681,1.4681,1.4685,1.4697,1.4720,1.4747,1.4765,1.4782,1.4785])
    margin=.00100
    a=np.clip((top-z+margin)/(2*margin),0,1);b=np.clip((z-low+margin)/(2*margin),0,1)
    lip=(a*a*(3-2*a))*(b*b*(3-2*b))*np.clip((.0267-u)/.0023,0,1)
    seam=1.4780+.00045*np.sin(np.pi*np.clip(u/.023,0,1))
    glaze([202,102,105],lip*.88)
    glaze([229,122,127],lip*.73*np.exp(-((z-1.473)/.0048)**2))
    glaze([151,71,68],lip*.40*np.exp(-((z-seam)/.00085)**2))
    lipline=(np.sin(2750*x+23*np.sin(z*142)+2*np.sin(770*x))*.5+.5)**12
    glaze([191,95,94],lip*.11*lipline)
    micro=rng.normal(0,.0022,(H,W)).astype('f')
    field+=micro[...,None]
    return (packed_image('Complexion • original pigment field',field,folder),
            packed_image('Vermilion • painted border',lip,folder,True))

def make_skin(folder):
    complexion,lip=pigment(folder)
    m,p=mat('Skin | apricot ivory, capillaries and satin vermilion','e8bca6',.43,
            **{'Subsurface Weight':.085,'Subsurface Radius':(1.,.46,.27),'Subsurface Scale':.0013,
               'Specular IOR Level':.32,'IOR':1.42})
    tex=node(m,'ShaderNodeTexImage','Original regional pigment',(-850,320));tex.image=complexion;tex.extension='EXTEND'
    luv=node(m,'ShaderNodeUVMap','Pigment coordinates',(-1080,245));luv.uv_map='Pigment chart'
    link(m,luv,'UV',tex,'Vector')
    lt=node(m,'ShaderNodeTexImage','Natural lip gloss boundary',(-845,45));lt.image=lip;lt.extension='EXTEND'
    link(m,luv,'UV',lt,'Vector')
    attr=node(m,'ShaderNodeAttribute','Face-facing surface mask',(-820,530));attr.attribute_name='Complexion coverage'
    tint=node(m,'ShaderNodeMixRGB','Skin and regional flush',(-480,420));tint.inputs[1].default_value=color('e4b196')
    link(m,attr,'Fac',tint,0);link(m,tex,'Color',tint,2);pocket=node(m,'ShaderNodeAttribute','Inside the nostril folds',(-450,620));pocket.attribute_name='Nostril recess'
    alc=node(m,'ShaderNodeMixRGB','Perfused nostril lining',(-110,450));alc.inputs[2].default_value=color('925849')
    link(m,pocket,'Fac',alc,0);link(m,tint,0,alc,1);aur=node(m,'ShaderNodeAttribute','Auricular flush',(-410,760));aur.attribute_name='Ear flush'
    flush=node(m,'ShaderNodeMixRGB','Warm helix and concha',(140,425));flush.inputs[2].default_value=color('d48d80')
    link(m,aur,'Fac',flush,0);link(m,alc,0,flush,1);link(m,flush,0,p,'Base Color')
    maxlip=node(m,'ShaderNodeMath','Front surface vermilion',(-530,50));maxlip.operation='MULTIPLY'
    link(m,lt,'Color',maxlip,0);link(m,attr,'Fac',maxlip,1)
    tc=node(m,'ShaderNodeTexCoord','Physical pore scale',(-1070,-250))
    pore=node(m,'ShaderNodeTexNoise','Fine pores and pebbled lip surface',(-815,-275))
    pore.inputs['Scale'].default_value=4300;pore.inputs['Detail'].default_value=2.3;pore.inputs['Roughness'].default_value=.68
    link(m,tc,'Object',pore,'Vector')
    bump=node(m,'ShaderNodeBump','Restrained skin relief',(-240,-200));bump.inputs['Strength'].default_value=.245;bump.inputs['Distance'].default_value=.000075
    link(m,pore,'Fac',bump,'Height');lmap=node(m,'ShaderNodeVectorMath','Vertical lip microfolds',(-825,-605));lmap.operation='MULTIPLY';lmap.inputs[1].default_value=(580,66,1);link(m,luv,'UV',lmap,0)
    ln=node(m,'ShaderNodeTexNoise','Lip papillae and folds',(-610,-636));ln.inputs['Scale'].default_value=1.;ln.inputs['Detail'].default_value=2.;link(m,lmap,0,ln,'Vector')
    lb=node(m,'ShaderNodeBump','Vermilion relief',(73,-607));lb.inputs['Distance'].default_value=.000045;link(m,maxlip,0,lb,'Strength');link(m,ln,'Fac',lb,'Height');link(m,bump,'Normal',lb,'Normal');link(m,lb,'Normal',p,'Normal')
    vr=ramp(m,'Sebum and pore roughness',(-505,-420),[(0,(.36,.36,.36)),(1,(.52,.52,.52))])
    link(m,pore,'Fac',vr,'Fac')
    gloss=node(m,'ShaderNodeMixRGB','Soft satin lip film',(30,-85));gloss.inputs[2].default_value=(.30,.30,.30,1)
    link(m,maxlip,0,gloss,0);link(m,vr,'Color',gloss,1);sebum=node(m,'ShaderNodeAttribute','Sebum over nose and malar bones',(-210,-480));sebum.attribute_name='Skin sheen'
    balance=node(m,'ShaderNodeMixRGB','Satin highlights',(150,-200));balance.inputs[2].default_value=(.275,.275,.275,1)
    link(m,sebum,'Fac',balance,0);link(m,gloss,0,balance,1);link(m,balance,0,p,'Roughness')
    coat=node(m,'ShaderNodeMath','Thin vermilion coat',(90,-420));coat.operation='MULTIPLY';coat.inputs[1].default_value=.24
    link(m,maxlip,0,coat,0);link(m,coat,0,p,'Coat Weight');p.inputs['Coat Roughness'].default_value=.21
    return m

def iris_material(folder):
    n=512
    a=np.linspace(-1,1,n,dtype='f');x,z=np.meshgrid(a,a)
    r=np.hypot(x,z);t=np.arctan2(z,x)
    rng=np.random.default_rng(912)
    fibers=np.zeros_like(r)
    for k,weight in [(31,.26),(53,.16),(77,.22),(123,.16),(161,.10),(220,.10)]:
        fibers+=weight*np.sin(t*k+rng.uniform(0,6)+2.2*np.sin(5*t+3*r)+1.4*np.sin(11*t-4*r)+3*r)
    granular=(.50+.5*np.sin(15*t+5*r+2*np.sin(8*t)))*np.exp(-((r-.62)/.19)**2)
    bright=np.clip(.50+.37*fibers+.21*granular+.06*np.sin(t*19),0,1)
    A=np.array([51,31,24]);B=np.array([139,88,58])
    field=(A+(B-A)*bright[...,None])/255
    coll=np.exp(-((r-(.47+.026*np.sin(31*t)+.023*np.sin(16*t)))/.031)**2)
    field+=coll[...,None]*np.array([.078,.042,.008])
    lim=np.clip((r-.82)/.16,0,1)**.80
    field+=(np.array([.145,.088,.076])-field)*lim[...,None]*.90
    field+=(np.array([.12,.064,.048])-field)*np.clip((.44-r)/.11,0,1)[...,None]
    img=packed_image('Iris • radial amber stroma',field,folder)
    m,p=mat('Iris | umber stroma and limbal ring','6e452f',.41,**{'Specular IOR Level':.19})
    tex=node(m,'ShaderNodeTexImage','Radial stromal fibers',(-380,180));tex.image=img;tex.extension='EXTEND'
    link(m,tex,'Color',p,'Base Color')
    return m

def build_eyes(col,env,folder):
    iris=iris_material(folder)
    sclera,sp=mat('Sclera | warm, vascular ivory','eadfd7',.26,**{'Subsurface Weight':.09,'Subsurface Scale':.001,'IOR':1.38,'Specular IOR Level':.25})
    pig=node(sclera,'ShaderNodeAttribute','Pink toward the canthi',(-170,80));pig.attribute_name='Scleral pigment';link(sclera,pig,'Color',sp,'Base Color')
    pupil,_=mat('Pupil | carbon brown','100b0a',.35,**{'Specular IOR Level':.10})
    tear,_=mat('Lid | moist pink waterline','c88d80',.24,**{'Subsurface Weight':.10,'Subsurface Scale':.0007})
    upper,_=mat('Lash margin | warm espresso','58352b',.46)
    fiber,_=mat('Lashes | deep brown keratin','2d211d',.38)
    browmat,_=mat('Brows | fine chestnut fibers','573a2f',.5)
    cor=bpy.data.materials.new('Cornea | clear wet optical dome');cor.use_nodes=True
    nt=cor.node_tree;nt.nodes.remove(nt.nodes.get('Principled BSDF'))
    glass=node(cor,'ShaderNodeBsdfGlass','Clear corneal interface',(-395,150));glass.inputs['IOR'].default_value=1.376;glass.inputs['Roughness'].default_value=.045
    trans=node(cor,'ShaderNodeBsdfTransparent','Single-interface transmission',(-395,-40))
    coat=node(cor,'ShaderNodeMixShader','Thin corneal film',(-100,85));coat.inputs[0].default_value=.77
    link(cor,trans,0,coat,1);link(cor,glass,0,coat,2);link(cor,coat,0,nt.nodes.get('Material Output'),'Surface')
    duct,dp=mat('Lacrimal caruncle | translucent rose tissue','ce9484',.25,**{'Subsurface Weight':.13,'Subsurface Scale':.0007,'Specular IOR Level':.32})
    ac=node(duct,'ShaderNodeAttribute','Rose medial corner',(-110,80));ac.attribute_name='Lacrimal tint';link(duct,ac,'Color',dp,'Base Color')
    rng=random.Random(4702)
    lash_upper=[];lash_lower=[];brows=[];brow_r=[];ru=[];rl=[]
    for s,label in [(-1,'R'),(1,'L')]:
        landmark=Vector(env['landmarks']['joint-'+('r' if s<0 else 'l')+'-eye'])
        center=Vector((s*.03112,landmark.y-.00028,1.54497))
        # Direction of both optical axes is close to the high, front beauty camera.
        gaze=(R.transposed() @ (Vector((.001,-.830,1.571))-head(sculpt(center)))).normalized()
        gaze=(gaze*.42+Vector((-.015,-1.,-.044))*.58).normalized()
        bx=Vector((1,0,0));bx=(bx-gaze*bx.dot(gaze)).normalized();bz=gaze.cross(bx).normalized()
        radius=(.01645,.01595,.01475)
        def point(phi,theta,offset=0):
            d=gaze*cos(phi)+(bx*cos(theta)+bz*sin(theta))*sin(phi)
            return center+Vector(tuple(d[i]*radius[i] for i in range(3)))+gaze*offset
        ri=.402;pu=.170
        phis=[.0001,.055,.11,pu,.20,.26,.33,.385,ri,.46,.53,.62,.72,.86,1.04,1.25,1.48,1.75,2.04,2.33,2.62,2.90,pi-.0001]
        vs=[];uv=[];ft=[];mi=[];colors=[];nn=80
        for k,ph in enumerate(phis):
            for j in range(nn):
                aa=j*TAU/nn
                recess=-.00037*(1-smooth(pu,ri,ph)) if ph<ri else 0.
                q=point(ph,aa,recess);vs.append(head(sculpt(q)))
                uv.append((.5+.5*sin(ph)*cos(aa)/sin(ri),.5+.5*sin(ph)*sin(aa)/sin(ri)))
                flush=.62*smooth(.004,.0145,abs(q.x-center.x))
                a=np.array(color('e9dcd1'));b=np.array(color('c39385'));base=a+(b-a)*flush
                cover=smooth(.0004,.0075,q.z-center.z)*.39
                colors.append(base+(np.array(color('bb9e91'))-base)*cover)
                if k:
                    n=(j+1)%nn;ft.append(((k-1)*nn+j,k*nn+j,k*nn+n,(k-1)*nn+n))
                    mi.append(2 if ph<=pu else 1 if ph<=ri else 0)
        globe=mesh('Eye '+label+' | globe, recessed iris and pupil',vs,ft,col,[sclera,iris,pupil])
        uv_coords(globe,uv,'Iris disc')
        globe.data.polygons.foreach_set('material_index',np.asarray(mi,np.int32))
        at=globe.data.color_attributes.new(name='Scleral pigment',type='FLOAT_COLOR',domain='POINT')
        at.data.foreach_set('color',np.asarray(colors,np.float32).ravel())
        vs=[];fs=[]
        for k in range(12):
            ph=.0001+(ri+.085)*k/11
            for j in range(nn):
                height=.00012+.00100*(1-smooth(.02,ri+.085,ph))
                vs.append(head(sculpt(point(ph,j*TAU/nn,height))))
                if k:
                    n=(j+1)%nn;fs.append(((k-1)*nn+j,k*nn+j,k*nn+n,(k-1)*nn+n))
        mesh('Eye '+label+' | convex corneal surface',vs,fs,col,[cor])
        # Sample the actual outer edge loops in rest space. Keeping the upper
        # lash roots on this loop follows the eyelid through both shape keys.
        raw=build_eyes.source
        def loop(ids):return [Vector((s*abs(raw[i].x),raw[i].y,raw[i].z)) for i in ids]
        up=loop([3187,3184,3181,3178,3175,3122,3121,3127,3130,3133,3136,3139,3142])
        low=loop([3190,3193,3174,3171,3168,3165,3162,3157,3154,3151,3148,3145,3142])
        def on_loop(pts,t):
            xs=[abs(p.x) for p in pts];x=mix(xs[0],xs[-1],t)
            k=min(len(xs)-2,max(0,int(np.searchsorted(xs,x)-1)))
            return pts[k].lerp(pts[k+1],sat((x-xs[k])/max(1e-6,xs[k+1]-xs[k])))
        tv=[];tf=[];pig=[]
        for k in range(12):
            h=k/11;xt=mix(abs(up[0].x)+.00007,.0213,h)
            qt=(xt-abs(up[0].x))/(abs(up[-1].x)-abs(up[0].x))
            top=on_loop(up,qt);bottom=on_loop(low,qt);mid=.5*(top.z+bottom.z)
            for j in range(9):
                v=(j-4)/4
                # A low mound recedes into the globe at its lateral margin.
                ext=.52*(top.z-bottom.z)*(1-.86*smooth(.61,1,h))
                z=mid+ext*v; x=s*(xt-.00042*v*v*h)
                yy=center.y-radius[1]*sqrt(max(.027,1-((x-center.x)/radius[0])**2-((z-center.z)/radius[2])**2))
                relief=.00010+.00150*(1-smooth(.45,1,h))*max(0,1-v*v)
                q=Vector((x,yy-relief,z));tv.append(head(sculpt(q)))
                c1=np.array(color('c88879'));c2=np.array(color('d9afa1'));pig.append(c1+(c2-c1)*h**1.2)
                if k and j:
                    iv=9*k+j;tf.append((iv-10,iv-9,iv,iv-1))
        body=mesh(label+' | medial tear duct and plica',tv,tf,col,[duct])
        at=body.data.color_attributes.new(name='Lacrimal tint',type='FLOAT_COLOR',domain='POINT')
        at.data.foreach_set('color',np.asarray(pig,np.float32).ravel())
        for pts,material,tag,r in [(up,upper,'upper lash line',.00037),(low,tear,'tear meniscus',.00019)]:
            ps=[]
            for t in np.linspace(0,1,52):
                p=on_loop(pts,float(t));p.y-=.00023;ps.append(head(sculpt(p)))
            curves(label+' | '+tag,[ps],[[r*(.13+.87*sin(pi*i/51)**.58) for i in range(52)]],col,material)
        for upperlid,total in [(True,100),(False,55)]:
            for i in range(total):
                t=.07+.91*(i+rng.uniform(-.35,.35))/(total-1)
                p=on_loop(up if upperlid else low,t);p.y-=.00020
                length=(.0021+.0040*sin(t*pi*.75))*rng.uniform(.72,1.16)*(1 if upperlid else .49)
                drift=s*(.09+.67*t+rng.uniform(-.24,.19))
                coords=[]
                for v in np.linspace(0,1,6):
                    q=p+Vector((drift*length*(v+.2*v*v),-length*(.57*sin(v*pi*.72)+.13*v),
                                length*((.11*v+.83*v*v) if upperlid else -(.21*v+.58*v*v))))
                    coords.append(head(sculpt(q)))
                rad=rng.uniform(.000075,.000116)*(1 if upperlid else .7)
                (lash_upper if upperlid else lash_lower).append(coords)
                (ru if upperlid else rl).append([rad*(1-v)**.63+.000006 for v in np.linspace(0,1,6)])
        for i in range(370):
            t=rng.random()**.91;x=.0137+.0427*t
            span=.0013+.0030*(1-t)**.65
            z=float(brow_line(x))+rng.uniform(-1,.81)*span
            dx=rng.uniform(.0037,.0063)*(.49+.65*t);dz=rng.uniform(.0011,.0031)*(1-t*1.50)
            pts=[]
            for h in np.linspace(0,1,5):
                vx=s*(x+dx*h);vz=z+dz*h+.00058*sin(pi*h)
                hit=build_eyes.tree.ray_cast((vx,-.32,vz),(0,1,0))[0]
                if hit is None:break
                hit.y-=.00017+.00023*sin(pi*h)
                pts.append(head(sculpt(hit)))
            if len(pts)==5:
                rad=rng.uniform(.000057,.000098)*(.70+.30*sin(pi*t))*(.57+.43*smooth(0,.10,t))
                brows.append(pts);brow_r.append([rad*.56,rad,rad*.86,rad*.56,.000010])
    curves('Upper eyelashes | individually curled',lash_upper,ru,col,fiber)
    curves('Lower eyelashes | individually tapered',lash_lower,rl,col,fiber)
    curves('Eyebrows | directional hairs',brows,brow_r,col,browmat)

def build(col,detail,env,folder):
    source,polys=read_obj(ROOT/'input/upper-body.obj')
    # A continuous neckline patch extends well under the sweater. Arm skin is
    # represented only where it emerges from a cuff.
    facepolys=[f for f in polys if all(source[i].z>1.311 and
                (source[i].z>1.425 or abs(source[i].x)<.098) for i in f)]
    base,faces,ids=compact(source,facepolys)
    skin=make_skin(folder)
    obj=mesh('Portrait | continuous sculpted face, ears and neck',base,faces,col,[skin])
    uv_coords(obj,[((p.x-XMIN)/(XMAX-XMIN),(p.z-ZMIN)/(ZMAX-ZMIN)) for p in base],'Pigment chart')
    coverage=obj.data.attributes.new('Complexion coverage','FLOAT','POINT')
    coverage.data.foreach_set('value',np.asarray([smooth(.070,.115,-p.y)*smooth(1.419,1.448,p.z) for p in base],np.float32))
    ear=obj.data.attributes.new('Ear flush','FLOAT','POINT')
    ear.data.foreach_set('value',np.asarray([smooth(.067,.078,abs(q.x))*ga(q.y+.052,.025)*ga(q.z-1.528,.032)*(.40+.28*ga(q.z-1.528,.012)) for q in base],np.float32))
    sheen=obj.data.attributes.new('Skin sheen','FLOAT','POINT')
    sheen.data.foreach_set('value',np.asarray([smooth(.117,.149,-q.y)*(.66*ga(q.x,.013)*ga(q.z-1.518,.029)+.40*ga(abs(q.x)-.040,.020)*ga(q.z-1.529,.010)) for q in base],np.float32))
    nostril=obj.data.attributes.new('Nostril recess','FLOAT','POINT')
    nvals=[]
    for q in base:
        u=abs(q.x)
        depth=smooth(-.162+max(0,u-.008)*.66,-.1553+max(0,u-.008)*.66,q.y)
        nvals.append(.86*ga(u-.0094,.0041)*ga(q.z-(1.5020+(u-.0094)*.26),.00235)*depth*smooth(.13,.15,-q.y))
    nostril.data.foreach_set('value',np.asarray(nvals,np.float32))
    obj.shape_key_add(name='Basis | supplied anatomy')
    adj=obj.shape_key_add(name='Facial proportions and asymmetric smile')
    posed=obj.shape_key_add(name='Selfie | neck bend and head roll')
    vals=[sculpt(p) for p in base];adj.data.foreach_set('co',np.asarray(vals,np.float32).ravel());adj.value=1
    posed.relative_key=adj;posed.data.foreach_set('co',np.asarray([neck_pose(p) for p in vals],np.float32).ravel());posed.value=1
    subsurf(obj,2)
    # Obtain a smooth bind-position surface for the eyebrows, without leaving a
    # duplicate renderable head or depending on the viewport mode.
    adj.value=0;posed.value=0;bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get();ev=obj.evaluated_get(dg);me=ev.to_mesh()
    build_eyes.tree=BVHTree.FromPolygons([v.co.copy() for v in me.vertices],[list(p.vertices) for p in me.polygons])
    ev.to_mesh_clear();adj.value=1;posed.value=1
    build_eyes.source=source;build_eyes(detail,env,folder)
    return obj,skin
