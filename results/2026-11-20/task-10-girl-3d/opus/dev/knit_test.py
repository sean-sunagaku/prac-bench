import sys, os, time; sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np
from pb_knit import *
t=time.time(); h,_=stockinette(); r=rib(); print('time', time.time()-t)
for nm, a in (('knit_h', h), ('rib_h', r)):
    img=to_image(nm, a); img.filepath_raw=os.path.abspath(f'previews/{nm}.png'); img.file_format='PNG'; img.save()
