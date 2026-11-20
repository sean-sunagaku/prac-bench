"""Film the depth plates and animate the two whales and the shoal on the GPU."""
import argparse
import math
import os
from pathlib import Path
import subprocess

import moderngl
import numpy as np
from PIL import Image, ImageDraw

from camera import DURATION, FPS, SCENES, SHOTS, end_of

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.environ.get("TIDE_CACHE","/tmp/umi-astra-production"))
VERTEX = """#version 330
in vec2 position;
out vec2 uv;
void main(){uv=position*.5+.5; gl_Position=vec4(position,0,1);}
"""
ACTOR_VERTEX = """#version 330
in vec2 position;
uniform vec2 center, extent;
out vec2 uv;
void main(){uv=center+position*extent; gl_Position=vec4(uv*2.-1.,0,1);}
"""


def tween(a,b,u):
    return a+(b-a)*u


class Camera:
    def __init__(self,width,height):
        self.w,self.h=width,height
        gl=self.gl=moderngl.create_standalone_context(require=330)
        self.fbo=gl.simple_framebuffer((width,height),components=3)
        self.fbo.use()
        self.base=gl.program(vertex_shader=VERTEX,fragment_shader=(ROOT/"production/plates.frag").read_text())
        self.actor=gl.program(vertex_shader=ACTOR_VERTEX,fragment_shader=(ROOT/"production/actors.frag").read_text())
        quad=gl.buffer(np.array([[-1,-1],[1,-1],[-1,1],[1,1]],dtype="f4").tobytes())
        self.quad=gl.simple_vertex_array(self.base,quad,"position")
        self.actor_quad=gl.simple_vertex_array(self.actor,quad,"position")
        self.base["painted"]=0
        self.base["depthMap"]=1
        self.actor["drawing"]=2
        self.swimmer=self.texture(ROOT/"artwork/swimmer.png","RGBA")
        self.calf=self.texture(ROOT/"artwork/calf.png","RGBA")
        self.swimmer.use(2)
        self.plates={}

    def texture(self,path,mode):
        with Image.open(path) as source:
            im=source.convert(mode)
            tex=self.gl.texture(im.size,len(mode),im.tobytes())
        tex.repeat_x=tex.repeat_y=False
        tex.build_mipmaps()
        tex.filter=(moderngl.LINEAR_MIPMAP_LINEAR,moderngl.LINEAR)
        return tex

    def bind(self,name):
        if name not in self.plates:
            self.plates[name]=(self.texture(ROOT/f"artwork/{name}.png","RGB"),
                               self.texture(ROOT/f"artwork/depth/{name}.png","L"))
        for unit,tex in enumerate(self.plates[name]):
            tex.use(unit)
        self.swimmer.use(2)

    def sprite(self,center,width,angle,phase,time,kind=0,haze=.06,opacity=1,aspect=16/9,child=False):
        # Restrict the rasterized region to the actual actor.
        rad=math.radians(angle)
        height=width*(self.w/self.h)/aspect
        half_x=.61*width*abs(math.cos(rad))+.63*height*abs(math.sin(rad))*self.h/self.w
        half_y=.66*height*abs(math.cos(rad))+.62*width*abs(math.sin(rad))*self.w/self.h
        if center[0]+half_x<0 or center[0]-half_x>1 or center[1]+half_y<0 or center[1]-half_y>1: return
        if kind==0:
            (self.calf if child else self.swimmer).use(2)
        for key,val in dict(center=center,extent=(half_x,half_y),width=width,angle=rad,
                            phase=phase,time=time,kind=kind,haze=haze,opacity=opacity,aspect=aspect).items():
            self.actor[key].value=val
        self.actor_quad.render(moderngl.TRIANGLE_STRIP)

    def whales(self,mode,u,t):
        if mode=="solo":
            self.sprite((tween(.75,.37,u),.45-.045*u+.013*math.sin(t*1.2)),.86,-4+3*math.sin(t*.65),.7,t,haze=.060)
        elif mode=="duet":
            self.sprite((tween(.52,.35,u),.395-.042*u+.018*math.sin(t*1.05)),.75,-5+3.0*math.sin(t*.74),1.5,t,haze=.078)
            self.sprite((tween(.925,.685,u),tween(.72,.625,u)+.025*math.sin(t*1.19)),.35,-5+5*math.sin(t*.82),3.4,t,haze=.095,child=True)
        elif mode=="near":
            self.sprite((tween(.355,.14,u),.33+.022*math.sin(t*.83)),1.09,-3+2.6*math.sin(t*.56),.8,t,haze=.048)
            self.sprite((tween(.83,.62,u),tween(.71,.61,u)+.028*math.sin(t*1.14)),.50,-4+4.6*math.sin(t*.79),3.3,t,haze=.048,child=True)
        elif mode=="leaving":
            self.sprite((tween(.57,.11,u),tween(.44,.35,u)+.012*math.sin(t)),tween(.52,.41,u),-1+3*math.sin(t*.60),.5,t,haze=.16+.10*u)
            self.sprite((tween(.81,.37,u),tween(.62,.50,u)+.016*math.sin(t*1.08)),tween(.265,.23,u),-3+4*math.sin(t*.81),2.4,t,haze=.14+.10*u,child=True)

    def school(self,name,t):
        count=29 if name=="shoal" else 19
        for i in range(count):
            phase=i*2.399963
            if name=="shoal":
                r=.19+.67*((i*47%101)/100)
                a=phase+t*(.16+.085*(i%5)/5)
                x=.65+r*math.cos(a); y=.32+r*1.02*math.sin(a)
                # Direction is that of the tangent for a left-facing fish.
                angle=math.degrees(math.atan2(-math.cos(a),1.77*math.sin(a)))
                width=.025+.075*r**1.35
                op=.39+.17*r
            else:
                x=.46+.28*math.sin(.42*t+phase*.22)+.012*(i%6)
                y=1.2-((t*(.093+.0015*(i%5))+.032*i)%1.45)
                width=.012+.011*(i%4)/3
                angle=-72+13*math.sin(.47*t+phase)
                op=.38
            self.sprite((x,y),width,angle,phase,t,kind=1,opacity=op,aspect=3.6)

    def frame(self,index,local_frame):
        shot=SHOTS[index]
        start=shot.start
        length=end_of(index)-start
        s=local_frame/FPS
        t=start+s
        u=min(1,s/max(1/FPS,length-1/FPS))
        # A continuous dolly with a gentle start and stop, including motion through the cut.
        ease=.43*u+.57*(u*u*(3-2*u))
        self.bind(shot.plate)
        self.gl.disable(moderngl.BLEND)
        bloom=0.
        if 31.80<t<32.26: bloom=.24*max(0,1-abs(t-32)/.24)
        if 79.79<t<80.30: bloom=.30*max(0,1-abs(t-80)/.28)
        if 103.56<t<104.57: bloom=.52*max(0,1-abs(t-104)/.54)
        values=dict(scene=SCENES.index(shot.plate),time=t,localTime=s,progress=u,
                    zoom=tween(*shot.lens,ease),focus=shot.focus,
                    roll=math.radians(tween(*shot.bank,ease)),drift=shot.drift,
                    warmth=shot.warmth,bloomCue=bloom)
        for key,val in values.items():
            self.base[key].value=val
        self.quad.render(moderngl.TRIANGLE_STRIP)
        self.gl.enable(moderngl.BLEND)
        self.gl.blend_func=(moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA)
        if shot.flight: self.whales(shot.flight,u,t)
        if shot.plate in ["shoal","rising"]: self.school(shot.plate,t)
        return self.fbo.read(components=3,alignment=1)


def render(index,camera,replace=False):
    name=f"{index+1:02d}-{SHOTS[index].plate}.mp4"
    dest=ROOT/"public"/"footage"/name
    dest.parent.mkdir(exist_ok=True,parents=True)
    if dest.is_file() and not replace: return
    tmp=dest.with_suffix(".part.mp4")
    frames=round(FPS*(end_of(index)-SHOTS[index].start))
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgb24",
         "-s",f"{camera.w}x{camera.h}","-r",str(FPS),"-i","pipe:0","-an",
         "-vf","scale=iw:ih:out_color_matrix=bt709:in_range=full:out_range=tv",
         "-c:v","libx264","-preset","veryfast","-threads","5","-crf","16",
         "-pix_fmt","yuv420p","-color_primaries","bt709","-color_trc","bt709","-colorspace","bt709",
         "-movflags","+faststart",str(tmp)]
    process=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for frame in range(frames):
            process.stdin.write(camera.frame(index,frame))
        process.stdin.close()
        if process.wait()!=0: raise RuntimeError(name)
        tmp.replace(dest)
    finally:
        if process.poll() is None: process.kill()
    print(f"{name}   {frames} frames",flush=True)


def proof(camera):
    indices=[0,2,3,4,7,11,12,14,15,18,27,28,29,33,34]
    image=Image.new("RGB",(384*3,233*5))
    label=ImageDraw.Draw(image)
    for pos,index in enumerate(indices):
        n=round((end_of(index)-SHOTS[index].start)*FPS*.49)
        plate=Image.frombytes("RGB",(camera.w,camera.h),camera.frame(index,n))
        plate.thumbnail((384,216))
        x,y=pos%3*384,pos//3*233
        image.paste(plate,(x,y))
        label.text((x+6,y+218),f"{SHOTS[index].start+n/FPS:.2f}s    {SHOTS[index].plate} {SHOTS[index].flight}")
    CACHE.mkdir(exist_ok=True,parents=True)
    image.save(CACHE/"picture-proof.jpg",quality=91)


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--proof",action="store_true")
    parser.add_argument("--shot",type=int,help="One zero-based shot index")
    parser.add_argument("--replace",action="store_true",help="Rerender the requested footage, replacing it atomically")
    args=parser.parse_args()
    cam=Camera(768,432) if args.proof else Camera(1920,1080)
    if args.proof: proof(cam)
    else:
        for i in ([args.shot] if args.shot is not None else range(len(SHOTS))):
            render(i,cam,replace=args.replace)
