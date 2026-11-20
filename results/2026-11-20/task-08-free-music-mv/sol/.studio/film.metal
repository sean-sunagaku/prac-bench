#include <metal_stdlib>
using namespace metal;

struct Frame {
    float4 clock;    // seconds, shot progress, beats, shot seconds
    float4 camera;   // plate pan x/y, zoom, roll; CG eye x/y/z, pan
    float4 tone;     // warmth, effects, exposure, title opacity
    float4 setup;    // mode, variation, plate treatment, focal scale
    float4 point;    // source x/y, horizon y, transition impulse
};
constant float PI = 3.14159265;
constant float2 RES = float2(1920,1080);
constant float3 INK = float3(.031,.051,.090);
constant float3 SALT = float3(.31,.46,.62);
constant float3 COAL = float3(1.0,.22,.059);
constant float3 DAWN = float3(1.0,.64,.31);
constexpr sampler linearSampler(coord::normalized, address::clamp_to_edge, filter::linear);

float hash(float2 p) {
    float3 p3 = fract(float3(p.xyx)*.1031);
    p3 += dot(p3,p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}
float noise2(float2 p) {
    float2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+float2(1,0)),f.x),
               mix(hash(i+float2(0,1)),hash(i+1),f.x),f.y);
}
float fbm(float2 p) {
    return noise2(p)*.55 + noise2(p*2.03+13.4)*.28 + noise2(p*4.09+19.1)*.115 + noise2(p*8.11-5.1)*.055;
}
float2 rotate2(float2 p, float a) {
    float c=cos(a), s=sin(a);
    return float2(c*p.x-s*p.y,s*p.x+c*p.y);
}
float kick(float beats) {
    float b = fmod(max(0.0,beats+.013),4.0);
    float d = min(b, min(b>=1.5 ? b-1.5 : 10.0, b>=2.5 ? b-2.5 : 10.0));
    return exp(-d*13.0);
}

float3 grains(float2 uv, float travel, float salt, float size, float streak, float3 tint, float t) {
    float2 p = float2(uv.x * 1.778,uv.y) * size + float2(-travel, travel*.47);
    p.x += sin(p.y*.68+t*.24)*.29;
    float2 id = floor(p);
    float3 rgb = 0;
    for(int y=-1;y<=1;y++){
        for(int x=-1;x<=1;x++){
            float2 n=float2(x,y);
            float r=hash(id+n+salt);
            float2 at=n+float2(hash(id+n+15.7+salt),hash(id+n-6.8+salt));
            float2 delta=fract(p)-at;
            float2 d=rotate2(delta, -.32);
            d.x /= streak;
            float d2=dot(d,d);
            float twinkle=.44+.56*pow(.5+.5*sin(t*(.71+2*r)+r*41.0),3.0);
            float b=exp(-d2*(550.0+2000.0*r)) + .18*exp(-d2*240.0);
            rgb += tint * b*twinkle*smoothstep(.56,.96,r);
        }
    }
    return rgb;
}

float3 fluidPlate(float2 uv, const device Frame &f, texture2d<float, access::sample> image) {
    const float t = f.clock.x;
    const float pulse = kick(f.clock.z);
    const float warmth=f.tone.x;
    const float fx=f.tone.y;
    const int style=int(f.setup.z+.1);
    float2 p = uv-.5;
    p.x *= 1.778;
    p = rotate2(p/f.camera.z,f.camera.w);
    p.x /= 1.778;
    float2 coord = p + .5 + f.camera.xy;
    float2 stable = coord;
    float horizon = f.point.z;
    float sea = smoothstep(horizon+.012, min(.994,horizon+.29),coord.y);
    float3 color;
    if(style==0 || style==3 || style==6){
        float still = 1.0 - (style==0 ? .88*exp(-pow((coord.x-f.point.x)*8.0,2.0)) : 0.0);
        float warp = sin(coord.y*92.0+t*2.7 + 5.4*sin(coord.x*3.8)) +
                     .57*sin(coord.y*216.0-t*4.7+coord.x*8.4);
        coord.x += (.0018+.0035*fx)*warp*sea*still;
        coord.y += (.0006+.0018*fx)*sea*sin(coord.y*120+coord.x*24-t*3.6)*still;
    }
    if(style==5){
        coord.x += .0045*sin(coord.y*20.0 + t*1.31)*sin(2.0*coord.x+.29*t);
        coord.y += .0028*sin(coord.x*24.0-t*.82);
    }
    color = image.sample(linearSampler, coord).rgb;
    float lum = dot(color,float3(.2126,.7152,.0722));
    float selective = smoothstep(.03,.28,lum)*(1-smoothstep(.66,.99,lum));
    if (warmth < .45) {
        color *= mix(float3(.865,.970,1.077),float3(1.04,1.005,.985),warmth*2.2);
        color += float3(.003,.007,.013) * selective;
    } else {
        color *= mix(float3(1.04,1.005,.985),float3(1.174,1.054,.887),warmth);
        float horizonFog = exp(-abs(coord.y-horizon)*9.0);
        color += horizonFog * (.025*warmth) * mix(DAWN,COAL,.18);
    }
    if(style==0 || style==3 || style==6){
        float ripples = pow(.5+.5*sin((coord.y-horizon)*204.0 + 5.3*sin(coord.x*7.0) - 4.0*t),4.0);
        float highlights = smoothstep(.16,.55,lum);
        color += mix(SALT,DAWN,warmth) * sea * highlights * ripples * (.018+.033*fx);
    }
    if(style==4 || style==0){
        float ember = smoothstep(.043,.275,color.r-max(color.g,color.b)*.88);
        color += ember*COAL*(.044+.34*pulse)*fx;
    }
    if(style==2){
        float2 arm = (stable-f.point.xy)*float2(1.78,1.0);
        float r2=dot(arm,arm);
        float flutter=.86+.14*sin(t*17.0)+.09*sin(t*33.0);
        color += mix(COAL,DAWN,.75)*fx*flutter*(.092*exp(-r2*92.0)+.188*exp(-r2*585.0))*max(.62, .78+.37*pulse);
        float2 lifted = arm - float2(.010,.004)*f.clock.y - float2(.021,-.092)*f.point.w;
        color += DAWN*.13*exp(-dot(lifted,lifted)*1600.0)*f.point.w;
    }
    if(style==5){
        float light = exp(-pow((stable.x + stable.y*.39 - .88 + .025*sin(t*.67))*3.0,2.0));
        float waves=.5+.5*sin(stable.x*59.0-stable.y*37.0+t*2.8+sin(stable.y*11.0)*4.0);
        color += float3(.12,.31,.40)*light*waves*.16*fx*(1-stable.y);
    }
    float intensity=(style==0 || style==6 ? .08 : .28)*fx;
    float3 moteColor=mix(float3(.54,.66,.84),DAWN, style==5 ? .14 : (style==2 || style==4 ? .74 : warmth));
    color += intensity * grains(uv, t*(style==4 ? 2.21 : .85),5.9,style==5?21:17,style==3?1.62:1.12,moteColor,t);
    color += intensity * .53 * grains(uv, t*2.4,44.2,31,1.76,moteColor,t);
    return color;
}

float3 sunDirection(float warmth) {
    return normalize(float3(.09,.012+.117*smoothstep(.2,1.1,warmth),1.0));
}

float3 skyColor(float3 d, float t, float warmth, bool reflected) {
    float up=max(d.y,0.0);
    float h=1.0-exp(-up*7.0);
    float warm = smoothstep(.035,.91,warmth);
    float3 sun = sunDirection(warmth);
    float facing=max(0.0,dot(d,sun));
    float3 darkSky=mix(float3(.166,.221,.302),float3(.021,.039,.081),h);
    float3 brightSky=mix(float3(.74,.486,.267),float3(.092,.207,.366),h);
    float3 rgb=mix(darkSky,brightSky,warm);
    rgb += mix(float3(.065,.07,.081),float3(.39,.202,.099), warm)*pow(facing,9.0);
    float altitude = .132/max(.078,.075+up);
    float2 cloudPos = d.xz * altitude * (13.4 + 7.5*up) + float2(t*.013,-.35);
    float wisps = fbm(cloudPos + .82*fbm(cloudPos*.44));
    float coverage = smoothstep(.463,.676,wisps);
    float edge = smoothstep(.458,.595,wisps)-smoothstep(.57,.695,wisps);
    float3 silver=mix(float3(.19,.246,.34),float3(.96,.606,.35),warm)*(.46+.40*pow(facing,3.0));
    rgb=mix(rgb, rgb*.58 + silver*edge*.44, coverage*(.32+.30*h));
    rgb+=silver*edge*.21*pow(facing,9.0);
    float sunAngle = acos(min(facing,.9999999));
    float halo = exp(-sunAngle * (20.0+7.0*warm));
    float disk = 1-smoothstep(reflected ? .0115 : .013, reflected ? .021 : .016,sunAngle);
    float3 gold=float3(1.0,.79,.48);
    rgb += gold * warm * warm * (.55*halo + disk*1.37);
    return rgb;
}

float waveY(float2 p, float t, float force, float beats) {
    float v=.058*sin(dot(p,float2(.63,1.89))-t*1.94) +
          .030*sin(dot(p,float2(-1.96,2.22))+t*3.08)+
          .018*sin(dot(p,float2(4.06, -.58))+t*2.96)+
          .009*sin(dot(p,float2(3.95,6.8))-t*5.3);
    float travel = fmod(max(0.0, beats),8.0)*1.29;
    float len = length((p-float2(0.0,5.65))*float2(1.0,.94));
    float shell=(len-travel);
    v+=force*.115*exp(-shell*shell*.67)*sin(shell*9.0 - 2.0*t);
    return v;
}

float2 waveGradient(float2 p, float t, float force, float beats) {
    float a=dot(p,float2(.63,1.89))-t*1.94;
    float b=dot(p,float2(-1.96,2.22))+t*3.08;
    float c=dot(p,float2(4.06, -.58))+t*2.96;
    float d=dot(p,float2(3.95,6.8))-t*5.3;
    float2 slopes = .058*cos(a)*float2(.63,1.89)+.030*cos(b)*float2(-1.96,2.22)
                  + .018*cos(c)*float2(4.06,-.58)+.009*cos(d)*float2(3.95,6.8);
    float2 from = (p-float2(0,5.65))*float2(1.0,.94);
    float len = max(.01,length(from));
    float shell = len-fmod(max(0.0,beats),8.0)*1.29;
    slopes += force * from/len*.115*exp(-shell*shell*.67)*
              (9.0*cos(shell*9.0-2.0*t) - 1.34*shell*sin(shell*9.0-2.0*t));
    return slopes;
}

float ringField(float3 world, float variant) {
    float3 p = world-float3(0.0,2.48,5.65);
    p.xz = rotate2(p.xz,.16);
    float radius = length(p.xy);
    float a = atan2(p.y,p.x);
    float strata = noise2(p.xy*4.14+p.z*.71);
    float facets = noise2(float2(a*16.6, p.y*2.5+p.z*.7));
    float broken = .14*sin(3.0*a-.2)+.078*sin(13.0*a+.65)+.044*sin(24.0*a);
    float shape = 3.38+broken+.17*(facets-.5);
    float base = .27 + .40 * (1.0-smoothstep(-1.7,1.3,p.y));
    float thickness = base + .11*sin(a*5.0+.62)+.09*facets;
    float depth = .33 + .22 * (1-smoothstep(-1.2,2.7,p.y));
    float2 section = float2((radius-shape),p.z+.10*sin(a*3.0));
    float d = length(section / float2(thickness,depth))*.305-.29;
    d += .17*(strata-.5)+.073*(noise2(p.xy*17.0+p.z*6.0)-.5);
    float gap = max(abs(p.x+.09 + p.y*.105)-(.51 + variant*.021), 2.42-p.y);
    return max(d, -gap + .074*sin(p.z*14.0+p.y*18.0));
}
float traceRing(float3 eye, float3 beam, float maxD, float variant) {
    float3 relative=eye-float3(0,2.5,5.65);
    float axis=dot(beam,relative);
    float r=axis*axis-dot(relative,relative)+18.4;
    if(r<=0.0) return -1;
    r=sqrt(r);
    float x=max(0.0, -axis-r);
    float stop=min(maxD,-axis+r);
    for(int j=0;j<44;j++){
        if(x>stop) break;
        float d=ringField(eye+x*beam,variant);
        if(d<.008 + .00045*x) return x;
        x += max(.014,d*.82);
    }
    return -1;
}

float3 ringLight(float3 p, float3 ray, float t, float pulse, float warm, float fx, float variant) {
    float b = ringField(p,variant);
    float3 normal=normalize(float3(ringField(p+float3(.018,0,0),variant)-b,
                                   ringField(p+float3(0,.018,0),variant)-b,
                                   ringField(p+float3(0,0,.018),variant)-b));
    float strata=noise2(p.xz*4.9+p.y*2.0)*.63+noise2(p.xy*18.0+p.z*3.5)*.37;
    float brightness = max(0.0,dot(normal,normalize(float3(-.64,.67,-.43))));
    float golden = max(0.0,dot(normal,normalize(float3(.22,.53,.86))));
    float ice = .51 + .6*brightness + .29*normal.y;
    float3 rock = float3(.039,.050,.069)*max(.25,ice)*(.58+strata*.8);
    rock+=float3(.26,.163,.098)*golden*golden*warm*(.4+.6*strata);
    rock+=float3(.10,.131,.172)*strata*.19*pow(1.0+dot(normal,ray),2.0);
    float3 q=p-float3(0,2.48,5.65);
    q.xz=rotate2(q.xz,.16);
    float radius=length(q.xy);
    float inner=(1.0-smoothstep(2.98,3.39,radius))*smoothstep(-.18,.23,q.y);
    float streak = .64*noise2(float2(q.x*16.0+q.z*4.0,q.y*2.8)) + .36*noise2(q.xy*22.0);
    float thin = pow(1.0-abs(sin(q.z*22.0+q.y*11.0+streak*3.9)),7.0);
    float leak = clamp(inner*(.34*thin+.9*smoothstep(.53,.78,streak)),0.0,1.0);
    float rim=.43*pow(1.0-abs(sin(q.y*19.0+q.x*22.0+streak*7.0)),17.0)*inner;
    rock += mix(COAL,DAWN,warm) * (leak+rim) * (.16+.85*fx) * (.59+.52*pulse) * (1-.26*warm);
    return rock;
}

float3 ocean(float2 uv, const device Frame &f) {
    float t=f.clock.x, warmth=f.tone.x, fx=f.tone.y, beat=f.clock.z;
    float warm=smoothstep(0.0,1.0,warmth);
    float pulse=kick(beat);
    float variant=f.setup.y;
    float3 eye = f.camera.xyz;
    float3 target = float3(f.camera.w*4.3, 1.49+f.point.y,5.65);
    float3 front = normalize(target-eye);
    float3 side = normalize(cross(float3(0,1,0),front));
    float3 up = normalize(cross(front,side));
    float2 p=(uv-.5)*float2(1.778,-1);
    p=rotate2(p,f.point.x);
    float3 ray = normalize(front*f.setup.w + p.x*side+p.y*up);
    float hill = ray.y < -.002 ? min(144.0, -eye.y/ray.y) : 145.0;
    if(ray.y < -.005){
        for(int i=0;i<4;i++){
            float displaced = waveY(eye.xz+ray.xz*hill,t,fx,beat);
            float guess = max(.06,(displaced-eye.y)/ray.y);
            hill = mix(hill,min(144.0,guess),.54);
        }
    }
    float strike = traceRing(eye,ray,hill,variant);
    float3 color;
    if(strike>=0.0) {
        float3 material=ringLight(eye + strike*ray,ray,t,pulse,warm,fx,variant);
        float3 fog = mix(float3(.155,.212,.295),float3(.58,.40,.29),warm);
        float haze=min(.74,1-exp(-strike*(.013+.015*fx)));
        color=mix(material,fog,haze);
    } else if(hill < 142.0) {
        float3 p3=eye+ray*hill;
        float2 xz=p3.xz;
        float2 slope=waveGradient(xz,t,fx,beat);
        float2 details=float2(noise2(xz*17.8+float2(t*.72,-t)),noise2(xz*24.6+float2(-t,t*.39)))-.5;
        slope+=details*.084/(1.0+.051*hill);
        float3 normal=normalize(float3(-slope.x,1,-slope.y));
        float3 bounce=reflect(ray,normal);
        bounce.y=abs(bounce.y)*.88+.013;
        bounce=normalize(bounce);
        float3 sky=skyColor(bounce,t,warmth,true);
        float3 glintVector=normalize(sunDirection(warmth));
        float angle=clamp(dot(bounce,glintVector),0.0,1.0);
        float tail=pow(angle,19.0)*.137*warm+pow(angle,315.0)*.78*warm;
        float reflection= .36+.62*pow(1-clamp(-dot(ray,normal),0.0,1.0),3.0);
        float3 blue=mix(float3(.029,.053,.080),float3(.085,.139,.178),warm);
        color=mix(blue,sky*.82,reflection);
        color+=DAWN*tail*.71;
        if (bounce.z>.035) {
            float toward=(5.65-p3.z)/bounce.z;
            if(toward>0.0 && toward<65.0) {
                float2 at=(p3+bounce*toward).xy;
                float rad=length(at-float2(0,2.48));
                float ring=1-smoothstep(.12,.64,abs(rad-3.4));
                float breakTop = 1-smoothstep(0.0,.79,abs(at.x+.27));
                ring *= 1-breakTop*smoothstep(4.55,5.52,at.y);
                color=mix(color, color*.42,ring*.55);
                color+=mix(COAL,DAWN,warm)*ring*fx*(.13+.16*pulse)*(.39+.61*noise2(xz*11.5+t));
            }
        }
        float fine = noise2(float2(xz.x*13.5,xz.y*24)-t*float2(.12,.8));
        float flare = pow(fine,8.0)*(.041+.104*warm)*smoothstep(.0,.23,abs(slope.y));
        color += mix(SALT,DAWN,warm)*flare;
        float horizonHaze=1-exp(-hill*.012);
        float3 fog=mix(float3(.178,.222,.29),float3(.61,.437,.285),warm);
        color=mix(color, fog, horizonHaze * .73);
    } else {
        color=skyColor(ray,t,warmth,false);
        float fog=exp(-abs(ray.y)*30.0)*.23;
        color=mix(color,mix(float3(.208,.24,.302),float3(.67,.52,.385),warm),fog);
    }
    float hot = min(1.0, fx*.7 + warm*.38);
    color += grains(uv,t*(.79+fx*.83),12.7,20.0,1.2+fx,mix(SALT,DAWN,hot),t)*(.07+hot*.26);
    return color * (1.0 + .055 * fx * pulse);
}

float3 undersea(float2 uv, const device Frame &f) {
    float t=f.clock.x;
    float2 p = (uv - .5) * float2(1.778,1) + f.camera.xy;
    p=rotate2(p,f.camera.w);
    float progress=f.clock.y;
    float water = p.y + .38 - .41 * progress;
    float2 source=float2(.19-.44*progress,-.42+.31*progress);
    float2 dx = p - source;
    float rad=length(dx);
    float angle = atan2(dx.x, dx.y);
    float wave = .55*noise2(float2(angle*23.0+.13*t,rad*.63)) + .45*noise2(float2(angle*49-.49*t,rad*2.7));
    float rays = pow(wave,.91) * max(0.0, dx.y) * exp(-rad*2.36);
    float3 col= mix(float3(.012,.034,.071),float3(.051,.166,.215),exp(-abs(water)*1.41));
    col *= .54+.46*exp(-rad*.66);
    col += float3(.092,.291,.359)*rays * 2.38;
    float bubbles=0;
    for (int i=0;i<12;i++) {
        float r = hash(float2(21.0,float(i)));
        float size = .007 + .019*r*r;
        float c = fract(f.clock.w*(.073+.019*r)+r*12.2+float(i)*.57);
        float2 q = float2(mix(-.96,.96,hash(float2(4.0,float(i))))+.022*sin(t*2.1+r*43),.62-1.23*c);
        float d=length((p-q)*float2(1.0,1.4));
        float spec=exp(-pow((d-size)*185.0,2.0))*.20;
        bubbles+=spec*smoothstep(.02,.12,c)*(1-smoothstep(.82,.99,c)) *
          smoothstep(.009,.028,-p.y+q.y+.020);
    }
    col+=float3(.35,.56,.65)*bubbles;
    col += float3(.136,.37,.46)*exp(-pow((water+sin(p.x*22.0+t*2.6)*.035)*15.0,2.0))*(.1+.26*wave);
    col += float3(.92,.59,.23)*(.7+progress*.3)*exp(-rad*12.0)*.30;
    col += grains(uv,t*.77,9.17,28.0,1.1,float3(.42,.65,.77),t)*.35;
    return col;
}

kernel void render(texture2d<float, access::sample> image [[texture(0)]],
                   texture2d<float, access::sample> title [[texture(1)]],
                   texture2d<float, access::write> output [[texture(2)]],
                   const device Frame &f [[buffer(0)]], uint2 id [[thread_position_in_grid]]) {
    uint2 size = uint2(output.get_width(), output.get_height());
    if(any(id>=size)) return;
    float2 uv=(float2(id)+.5)/float2(size);
    int mode=int(f.setup.x+.1);
    float3 color = mode==1 ? ocean(uv,f) : (mode==2 ? undersea(uv,f) : fluidPlate(uv,f,image));
    if(mode!=0) {
        color = max(color,float3(0));
        color *= .935 + .065 * smoothstep(.08,.5,dot(color,float3(.2126,.7152,.0722)));
    }
    float2 lens=(uv-.5)*float2(1.0,.93);
    float darken=1.0 - .295 * pow(clamp(dot(lens,lens)*2.0,0.0,1.0),1.3);
    color*=darken;
    float filmSeed=floor(f.clock.x*24.03);
    float filmGrain=hash(float2(id)+filmSeed*float2(13.1,7.61))-.5;
    color+=filmGrain*(.014+.010*smoothstep(.1,.45,length(color))) *
        smoothstep(.005,.16,length(color));
    color*=f.tone.z;
    if(f.tone.w>.001){
        float4 type=title.sample(linearSampler,uv);
        color=mix(color, float3(.919,.932,.911), pow(type.a,.86)*f.tone.w);
    }
    output.write(float4(clamp(color,0.0,1.0),1.0),id);
}
