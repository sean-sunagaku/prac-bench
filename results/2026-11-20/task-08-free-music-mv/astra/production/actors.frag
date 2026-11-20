#version 330
uniform sampler2D drawing;
uniform int kind;
uniform vec2 center;
uniform float time, width, angle, phase, haze, aspect, opacity;
in vec2 uv;
out vec4 frag;

float triangle(vec2 p,vec2 a,vec2 b,vec2 c) {
    float x=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
    float y=(c.x-b.x)*(p.y-b.y)-(c.y-b.y)*(p.x-b.x);
    float z=(a.x-c.x)*(p.y-c.y)-(a.y-c.y)*(p.x-c.x);
    return smoothstep(-.003,.003,min(min(x,y),z))+smoothstep(-.003,.003,-max(max(x,y),z));
}

void main(){
    vec2 d=(uv-center)*vec2(1.7777778,1.);
    float cs=cos(angle),sn=sin(angle);
    d=mat2(cs,-sn,sn,cs)*d;
    vec2 q=d/(width*1.7777778)*vec2(1.,aspect)+.5;
    if(q.x<-.03 || q.x>1.03 || q.y<-.14 || q.y>1.14) discard;
    if(kind==0){
        // Swimming is articulated in body coordinates. The shoulder leads the
        // fin stroke, and the amplitude increases towards the outer flukes.
        float x=q.x;
        float tail=smoothstep(.40,.98,x);
        q.y+=tail*(.065*sin(time*1.63-6.2*x+phase)+.023*sin(time*2.03-5.5*x+phase));
        q.y+=.012*sin(time*1.48-4.2*x+phase);
        q.x+=tail*.012*cos(time*1.63-6.2*x+phase);
        float flippers=smoothstep(.46,.83,q.y)*(1.-smoothstep(.48,.69,x));
        q.x+=flippers*.033*sin(time*1.35+phase);
        q.y+=flippers*.050*cos(time*1.35+phase);
        if(q.x<.002 || q.x>.998 || q.y<.075 || q.y>.925) discard;
        vec4 col=textureLod(drawing,clamp(q,.001,.999),max(0.,log2(1./width)));
        if(col.a<.042) discard;
        col.rgb*=vec3(1.035,1.015,1.025);
        col.rgb=mix(col.rgb,vec3(.58,.61,.68),haze);
        col.rgb+=vec3(.065,.029,.004)*max(q.y-.31,0.)*(.72+.28*sin(time*.36+phase));
        col.a*=opacity;
        frag=col;
    } else {
        // A small pelagic fish. The forked tail beats independently of the shoal trajectory.
        float t=sin(time*6.1+phase);
        q.y+=.16*t*smoothstep(.57,1.,q.x);
        vec2 b=(q-vec2(.42,.50))/vec2(.33,.24);
        float body=1.-smoothstep(.92,1.01,length(b));
        float upper=triangle(q,vec2(.69,.5),vec2(.96,.12),vec2(.91,.47));
        float lower=triangle(q,vec2(.69,.5),vec2(.91,.51),vec2(.96,.85));
        float alpha=max(body,max(upper,lower));
        if(alpha<.03) discard;
        float flank=max(0.,1.-abs(q.y-.50)*6.);
        vec3 c=mix(vec3(.07,.24,.29),vec3(.65,.74,.67),flank*.62+.19);
        c*=.82+.18*sin(time*2.8+phase);
        frag=vec4(c,alpha*opacity);
    }
}
