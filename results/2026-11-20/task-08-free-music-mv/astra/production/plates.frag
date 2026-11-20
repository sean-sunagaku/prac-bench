#version 330
uniform sampler2D painted, depthMap;
uniform int scene;
uniform float time, localTime, progress, zoom, roll, drift, warmth, bloomCue;
uniform vec2 focus, resolution;
in vec2 uv;
out vec4 frag;
const float PI=3.14159265;
const float ASPECT=1.7777778;

float hash(vec2 p) {
    vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
    q+=dot(q,q.yzx+33.33);
    return fract((q.x+q.y)*q.z);
}
float noise(vec2 p) {
    vec2 a=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(a),hash(a+vec2(1,0)),f.x),
               mix(hash(a+vec2(0,1)),hash(a+1.),f.x),f.y);
}
float patch(vec2 p,vec2 center,vec2 radii) {
    vec2 d=(p-center)/radii; return exp(-dot(d,d)*1.7);
}
float tick(float t,float onset) { return exp(-abs(t-onset)*12.0); }
vec3 screenLight(vec3 base,vec3 light) { return 1.-(1.-base)*(1.-light); }
float ribbonMask(vec3 col,vec2 p) {
    float sat=(col.r-min(col.g,col.b))/max(.01,col.r);
    return smoothstep(.067,.083,p.x)*(1.-smoothstep(.278,.299,p.x))*
           smoothstep(.598,.617,p.y)*(1.-smoothstep(.798,.815,p.y))*
           smoothstep(.33,.57,sat)*smoothstep(.035,.115,col.r-col.g);
}

// Each cell contains one bead. Its position is continuous as it crosses the camera.
vec2 waterBeads(vec2 p,float t,vec2 grids,float speed) {
    vec2 v=p*grids; vec2 cell;
    v.x += .20*sin(p.y*8.0+t*.38); v.y+=t*speed;
    cell=floor(v);
    float seed=hash(cell+68.);
    vec2 center=vec2(.18+.65*hash(cell+3.2),.22+.52*hash(cell+7.6));
    vec2 delta=fract(v)-center;
    float radius=.012+.057*pow(seed,3.);
    vec2 d=delta*vec2(1,1.48);
    float blob=1.-smoothstep(radius*.69,radius,length(d));
    float rim=blob*(.34+.66*smoothstep(radius*.44,radius,length(d)));
    float spark=exp(-dot(d+radius*.28,d+radius*.28)/(radius*radius*.06));
    return vec2(rim,spark)*(smoothstep(.22,.76,seed));
}

void main() {
    vec2 p=uv;
    vec2 v=(p-.5)*vec2(ASPECT,1.);
    float cs=cos(roll),sn=sin(roll);
    v=mat2(cs,-sn,sn,cs)*v;
    vec2 q=(v/vec2(ASPECT,1.)+.5-focus)/zoom+focus;
    float depth=texture(depthMap,clamp(q,0.,1.)).r;
    float travel=(progress-.5)*drift;
    q+=vec2(travel*.054,travel*-.023)*(depth-.37);
    q+=vec2(.0008*sin(time*.97+scene),.00062*cos(time*.79+scene*2))*(.3+depth);
    vec2 anchor=q;
    vec3 original=texture(painted,q).rgb;
    float sea=0.,curtain=0.,drops=0.,rain=0., glint=0.;

    if(scene==0) {                         // the lighthouse and sea surface
        sea=smoothstep(.775,.84,q.y);
    } else if(scene==1) {                  // window in the signal room
        rain=(1.-smoothstep(.46,.59,q.x))*(1.-smoothstep(.80,.95,q.y));
        sea=rain*smoothstep(.49,.85,q.y)*.66;
        float hair=patch(q,vec2(.72,.14),vec2(.22,.22));
        q.x+=hair*.0028*sin(2.2*time+q.y*18.);
    } else if(scene==2) {                  // the lever actuates at its hinge
        float keyArea=patch(q,vec2(.64,.44),vec2(.39,.55))*smoothstep(.34,.64,q.x);
        float pressure=.30+.64*pow(max(0.,cos(2.*PI*(time+.018)*2.)),5.);
        q.y-=keyArea*.024*pressure;
        q.x+=keyArea*.004*pressure;
    } else if(scene==3) {
        rain=smoothstep(.23,.38,q.x)*(1.-smoothstep(.37,.59,q.y));
        vec2 c=(q-vec2(.344,.486))/vec2(.177,.067);
        float r=length(c);
        float inside=1.-smoothstep(.72,.99,r);
        float ring=sin(r*32.-localTime*6.)*.56+.44*cos(r*48.-localTime*5.1);
        q.y+=inside*.0034*ring; glint+=inside*.026*ring;
    } else if(scene==4) {                  // suspended droplet with moving refraction
        vec2 c=(q-vec2(.50,.33))/vec2(.151,.262);
        float r=length(c), hold=1.-smoothstep(.86,1.35,r);
        q.y+=hold*(.015*sin(time*1.55)+.021*(progress-.5));
        q.x+=hold*.007*sin(time*1.05+.4);
        float inner=1.-smoothstep(.66,.93,r);
        q+=inner*.003*vec2(sin(13.*c.y+time),cos(13.*c.x+1.2*time));
        glint+=.03*inner*sin(c.y*6.0-time*1.6);
        sea=smoothstep(.79,.89,q.y); drops=.46;
    } else if(scene==5) {                  // upward-pouring curtain, land stays anchored
        curtain=(1.-smoothstep(.72,.90,q.y))*(1.-smoothstep(.86,.98,q.x)*smoothstep(.49,.8,q.y));
        q.x+=curtain*(.007*sin(q.y*18.+q.x*2.+time*1.65)+.003*sin(q.y*46.-time*2.2));
        q.y+=curtain*.011*sin(q.x*18.+q.y*4.+time*1.26);
        sea=smoothstep(.87,.95,q.y); drops=1.0;
    } else if(scene==6 || scene==10) {     // undulation travels from shoulder to fluke
        float body=smoothstep(.24,.65,depth)*(1.-smoothstep(.56,.79,q.y));
        float tail=smoothstep(.48,.96,q.x);
        q.y+=body*(.006*sin(time*1.12-q.x*4.5)+tail*.030*sin(time*1.47-q.x*5.9));
        float fin=patch(q,vec2(.60,.56),vec2(.21,.27));
        q.x+=fin*.013*sin(time*1.21-.7);
        q.y+=fin*.014*cos(time*1.21);
        drops=scene==6?.51:.52;
        sea=scene==10?smoothstep(.78,.94,q.y)*.55:0.;
    } else if(scene==7) {                  // whale eye and lids
        vec2 d=(q-vec2(.61,.455))/vec2(.135,.119);
        float eye=1.-smoothstep(.79,1.20,length(d));
        float blink=exp(-pow((localTime-2.57)/.20,2.));
        q.y+=eye*(q.y-.455)*.49*blink;
        q.x+=eye*.004*sin(localTime*1.25);
        glint+=eye*.018*sin(time*1.14+q.y*15.);
    } else if(scene==8) {                  // refraction and a slow rotating school
        vec2 center=vec2(.65,.28);
        vec2 d=(q-center)*vec2(ASPECT,1.);
        float r=length(d), angle=.020*sin(time*.65-r*5.);
        d=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*d;
        q=center+d/vec2(ASPECT,1.);
        q+=.0046*vec2(sin(17.*q.y+time*1.8),sin(13.*q.x-time*1.55));
        drops=.37;
    } else if(scene==9) {                  // wind hits the keeper's collar and hair
        float hair=patch(q,vec2(.18,.35),vec2(.13,.19));
        q.x+=hair*.006*sin(time*2.2+q.y*22.);
        q.y+=hair*.003*cos(time*1.7+q.x*31.);
        float sky=smoothstep(.27,.44,q.x)*(1.-smoothstep(.29,.65,q.y));
        q.y+=sky*.0075*sin(q.x*15.+time*.85);
        sea=smoothstep(.81,.93,q.y)*(smoothstep(.32,.58,q.x));
        drops=.18*sky+.06;
    } else if(scene==11) {                 // a ribbon in the breeze after sunrise
        sea=smoothstep(.62,.78,q.y)*smoothstep(.23,.39,q.x);
    } else if(scene==12) {                 // rotation of the optical lens
        vec2 center=vec2(.10,.56), d=(q-center)*vec2(ASPECT,1.);
        float turn=.019*sin(localTime*.78+1.);
        d=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*d;
        q=center+d/vec2(ASPECT,1.);
        q.x+=.0038*sin(q.y*7.+localTime*1.29);
    } else if(scene==13) {
        float cloud=smoothstep(.31,.84,q.y);
        q.x+=cloud*.006*sin(q.y*11.+time*.31);
        q.y+=cloud*.0027*cos(q.x*14.-time*.41);
    }

    q.x+=sea*(.0065*sin(23.*q.y+time*2.25)+.0034*sin(53.*q.y-time*2.6+q.x*7.));
    q.y+=sea*(.0037*cos(q.x*22.-time*1.62)+.0026*cos(q.x*47.+q.y*13.-time*2.09));
    vec3 color=texture(painted,clamp(q,.0005,.9995)).rgb;
    if(scene==11 && q.x<.32 && q.y>.57 && q.y<.85) {
        // The cloth is its own moving layer. The little slivers it uncovers
        // sample the water at the same elevation, so the horizon stays level.
        float distanceFromKnot=smoothstep(.069,.249,q.x);
        vec2 sampleAt=q+distanceFromKnot*vec2(.0054*cos(3.1*time-27.*q.x),.019*sin(2.9*time-27.*q.x));
        vec3 shifted=textureLod(painted,clamp(sampleAt,0.,1.),0.).rgb;
        float old=ribbonMask(color,q), moved=ribbonMask(shifted,sampleAt);
        vec3 uncovered=textureLod(painted,vec2(.32+.40*q.x,q.y),0.).rgb;
        color=mix(color,uncovered,old*(1.-moved));
        color=mix(color,shifted,moved);
    }
    if(curtain>.004) {
        // Cyclic advection of paint creates continuous falling foam without a reset.
        float phase=fract(time*.44), other=fract(phase+.5);
        vec2 flow=vec2(.017,-.043)*curtain;
        vec3 a=texture(painted,clamp(q-flow*(phase-.5),0.,1.)).rgb;
        vec3 b=texture(painted,clamp(q-flow*(other-.5),0.,1.)).rgb;
        color=mix(color,mix(a,b,abs(phase-.5)*2.),.66*curtain);
    }
    if(scene==0) {
        vec2 source=vec2(.741,.313), d=q-source;
        float theta=time*.88+.64;
        float reach=.85*abs(sin(theta)), dir=sign(sin(theta));
        float fwd=-d.x*dir;
        float line=.019+.030*cos(theta);
        float width=.0019+max(0.,fwd)*.058;
        float beam=exp(-pow((d.y-line*fwd)/width,2.))*
            smoothstep(0.,.025,fwd)*(1.-smoothstep(reach*.24,reach+.006,fwd));
        float pulse=.86+.28*(tick(time,.30)+tick(time,.66)+tick(time,1.03));
        color=screenLight(color,vec3(.97,.63,.28)*beam*.26*pulse);
        float halo=patch(q,source,vec2(.029,.048));
        color+=vec3(.20,.102,.030)*halo*(.60+.4*cos(theta))*pulse;
    }
    if(scene==2 || scene==12) {
        float rays=pow(.5+.5*cos(8.5*q.x-3.1*q.y-time*1.9),5.);
        color=screenLight(color,vec3(.42,.19,.045)*rays*(scene==2?.07:.31));
    }
    if(rain>.001) {
        vec2 v=q*vec2(95.,9.);
        v.y-=time*2.28;
        v.x-=q.y*1.35;
        vec2 id=floor(v); float h=hash(id+1.);
        vec2 f=fract(v);
        float streak=exp(-pow((f.x-(.20+.62*h))/.080,2.))*exp(-pow((f.y-.53)/(.095+.17*h),2.));
        color=screenLight(color,vec3(.32,.58,.68)*streak*rain*.40*smoothstep(.34,.90,h));
    }
    if(drops>.001) {
        vec2 fine=waterBeads(anchor,time,vec2(43.,24.),3.1);
        vec2 nearb=waterBeads(anchor+vec2(.23,.52),time,vec2(16.,10.),1.72);
        color=screenLight(color,drops*(fine.x*vec3(.32,.60,.71)+fine.y*vec3(.50,.67,.66)+
                                 nearb.x*vec3(.25,.44,.54)+nearb.y*vec3(.59,.73,.73)));
    }
    if(scene==8) {
        vec2 d=q-vec2(.65,.28);
        float theta=atan(d.y,d.x);
        float ray=pow(.5+.5*sin(theta*27.+1.*sin(theta*8.-time*.55)),6.);
        color=screenLight(color,vec3(.19,.26,.17)*ray*.43*(1.-smoothstep(.05,.84,length(d))));
    }
    float seaSpark=sea*.034*pow(clamp((color.r+color.g+color.b)/2.,0.,1.),2.)*sin(q.x*95.-time*3.+q.y*18.);
    color+=glint+seaSpark;
    color*=vec3(1.+.034*warmth,1.+.006*warmth,1.-.027*warmth);
    float grain=(hash(gl_FragCoord.xy+vec2(floor(time*24.)*2.9,13.7))-.5);
    color+=grain*.021*(.54+.46*(1.-dot(color,vec3(.299,.587,.114))));
    float vignette=dot((uv-.5)*vec2(.99,.83),(uv-.5)*vec2(.99,.83));
    color*=1.-.135*vignette;
    color=screenLight(color,vec3(.79,.60,.39)*bloomCue);
    frag=vec4(clamp(color,0.,1.),1.);
}
