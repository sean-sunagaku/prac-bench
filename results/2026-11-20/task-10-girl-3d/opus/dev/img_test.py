import sys, os; sys.path.insert(0, os.path.abspath('lib'))
import bpy, numpy as np
a=np.random.rand(64,64)
img=bpy.data.images.new('t',64,64,alpha=False)
img.colorspace_settings.name='Non-Color'
rgba=np.stack([a,a,a,np.ones_like(a)],-1).astype(np.float32)
img.pixels.foreach_set(rgba.ravel())
print('after set', np.array(img.pixels[:8]))
img.update(); img.pack()
print('after pack', np.array(img.pixels[:8]), img.packed_file is not None, img.source, img.is_dirty)
img.filepath_raw=os.path.abspath('previews/t.png'); img.file_format='PNG'; img.save()
im2=bpy.data.images.load(os.path.abspath('previews/t.png'))
print('reload', np.array(im2.pixels[:8]))
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('previews/t.blend'))
