# usage: blender -b --python dev/montage.py -- out.png img1 img2 ... (horizontal montage, same height)
import bpy, sys, numpy as np
args=sys.argv[sys.argv.index('--')+1:]
out=args[0]; ims=[]
H=None
for p in args[1:]:
    im=bpy.data.images.load(p); w,h=im.size
    a=np.array(im.pixels[:]).reshape(h,w,4)
    ims.append(a)
H=max(a.shape[0] for a in ims)
row=[]
for a in ims:
    if a.shape[0]!=H:
        # nearest resize to H
        h,w=a.shape[:2]; nw=int(w*H/h)
        yi=(np.arange(H)*h/H).astype(int); xi=(np.arange(nw)*w/nw).astype(int)
        a=a[yi][:,xi]
    row.append(a)
M=np.concatenate(row,axis=1)
img=bpy.data.images.new('m',M.shape[1],M.shape[0],alpha=True)
img.pixels[:]=M.ravel()
img.filepath_raw=out; img.file_format='PNG'; img.save()
