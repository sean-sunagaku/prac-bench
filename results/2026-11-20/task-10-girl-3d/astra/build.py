"""Build the portrait. Invoke with the Blender binary from the project directory."""
from pathlib import Path
import sys, tempfile, json
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
import bpy
from atelier import collection
import portrait_surface, wardrobe, groom, studio

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene;scene.name='Window seat | Portrait'
    anatomy=collection('01  Face, neck and hands')
    eyes=collection('02  Eyes and fine facial hair')
    hair=collection('03  Chestnut hair')
    cloth=collection('04  Rose knitwear')
    cafe=collection('05  Window seat café')
    lights=collection('06  Portrait lighting')
    cams=collection('07  Cameras')
    env=json.loads((ROOT/'input/environment.json').read_text())
    (ROOT/'work').mkdir(exist_ok=True);(ROOT/'renders').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='generated-',dir=ROOT/'work') as tmp:
        print('Building skin and eyes',flush=True)
        face,skin=portrait_surface.build(anatomy,eyes,env,tmp)
        print('Tailoring sweater',flush=True)
        wardrobe.build(cloth,anatomy,skin,env,tmp)
        print('Grooming parted hair',flush=True)
        groom.build(hair)
        print('Setting cameras and lighting',flush=True)
        studio.build(scene,[anatomy,eyes,hair,cloth],cafe,lights,cams)
        bpy.ops.object.select_all(action='DESELECT')
        face.select_set(True);bpy.context.view_layer.objects.active=face
        for area in bpy.context.screen.areas:
            if area.type=='VIEW_3D':
                sp=area.spaces.active;sp.region_3d.view_perspective='CAMERA'
                sp.region_3d.view_camera_zoom=4
                sp.overlay.show_overlays=False
                sp.shading.color_type='MATERIAL'
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'character.blend'),compress=True)
        print('Portrait saved.',flush=True)
if __name__=='__main__':main()
