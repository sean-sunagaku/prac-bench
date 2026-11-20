"""Reopen character.blend in Blender and render the specified camera(s)."""
from pathlib import Path
import sys, json, struct, hashlib
import bpy
import numpy as np
ROOT=Path(__file__).resolve().parent
CAT={'beauty':'Beauty | window-seat selfie','front':'Front | 000°','three-quarter':'Three-quarter | 045°','side':'Side | 090°','back':'Back | 180°'}

def stats(scene):
    bpy.context.window.scene=scene
    dg=bpy.context.evaluated_depsgraph_get()
    base_v=base_f=eval_v=eval_f=curve_pts=curve_n=0
    mins=np.full(3,np.inf);maxs=np.full(3,-np.inf)
    per={}
    for col in scene.collection.children:
        if col.name[:2] not in ['01','02','03','04']:continue
        group={'base_mesh_vertices':0,'evaluated_mesh_vertices':0,'native_curve_control_points':0}
        for ob in col.objects:
            ev=ob.evaluated_get(dg)
            if ev.type=='MESH':
                mesh=ev.data;n=len(mesh.vertices);arr=np.empty(3*n,np.float32)
                mesh.vertices.foreach_get('co',arr);arr=arr.reshape(n,3)
                base_v+=len(ob.data.vertices);base_f+=len(ob.data.polygons);eval_v+=n;eval_f+=len(mesh.polygons)
                group['base_mesh_vertices']+=len(ob.data.vertices);group['evaluated_mesh_vertices']+=n
            elif ev.type=='CURVES':
                at=ev.data.attributes['position'];n=len(at.data);arr=np.empty(3*n,np.float32)
                at.data.foreach_get('vector',arr);arr=arr.reshape(n,3)
                curve_pts+=n;curve_n+=len(ev.data.curves);group['native_curve_control_points']+=n
            else:continue
            if not np.isfinite(arr).all():raise ValueError('Non-finite geometry in '+ob.name)
            mat=np.array(ev.matrix_world)
            xyz=arr@mat[:3,:3].T+mat[:3,3]
            mins=np.minimum(mins,xyz.min(0));maxs=np.maximum(maxs,xyz.max(0))
        per[col.name]=group
    extra_vertices=extra_faces=extra_curve_points=0
    for ob in scene.objects:
        if any(c.name[:2] in ['01','02','03','04'] for c in ob.users_collection):continue
        ev=ob.evaluated_get(dg)
        if ev.type=='MESH':
            extra_vertices+=len(ev.data.vertices);extra_faces+=len(ev.data.polygons)
        elif ev.type=='CURVES':
            extra_curve_points+=len(ev.data.attributes['position'].data)
    return {'beauty_scene_evaluated_mesh_vertices':eval_v+extra_vertices,
            'beauty_scene_evaluated_mesh_faces':eval_f+extra_faces,
            'beauty_scene_mesh_vertices_plus_native_curve_keys':eval_v+extra_vertices+curve_pts+extra_curve_points,
            'character_bounds_m':{'min_xyz':mins.round(6).tolist(),'max_xyz':maxs.round(6).tolist(),'measurement':'Evaluated surfaces and native curve centerlines, world space.'},
            'base_mesh_vertices':base_v,'base_mesh_faces':base_f,'evaluated_mesh_vertices':eval_v,'evaluated_mesh_faces':eval_f,'native_curve_strands':curve_n,'native_curve_control_points':curve_pts,
            'mesh_vertices_plus_native_curve_keys':eval_v+curve_pts,'geometry_by_collection':per}
def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    preview='--preview' in args
    names=[a for a in args if a in CAT] or list(CAT)
    beauty=bpy.data.scenes['Window seat | Portrait'];diag=bpy.data.scenes['Turntable | neutral studio']
    for name in names:
        scene=beauty if name=='beauty' else diag
        bpy.context.window.scene=scene;scene.camera=bpy.data.objects[CAT[name]]
        scene.cycles.device='CPU';scene.cycles.denoising_use_gpu=False
        scene.render.threads_mode='FIXED';scene.render.threads=3
        scene.cycles.samples=6 if preview else 32
        scene.render.resolution_percentage=43 if preview else 100
        scene.render.filepath=str(ROOT/('work' if preview else 'renders')/((name+'-preview.png') if preview else (name+'.png')))
        print('RENDER',name,scene.render.filepath,flush=True)
        bpy.ops.render.render(scene=scene.name,write_still=True)
    if not preview:
        output={'blender_version':bpy.app.version_string,'blender_build':bpy.app.build_hash.decode(),'render_engine':beauty.render.engine,'render_device':beauty.cycles.device,'blender_threads':beauty.render.threads,'max_samples':beauty.cycles.samples,'adaptive_sampling':beauty.cycles.use_adaptive_sampling,'denoising':'OpenImageDenoise, CPU','color_management':{'transform':beauty.view_settings.view_transform,'look':beauty.view_settings.look,'exposure':beauty.view_settings.exposure},'compositor_enabled':beauty.render.use_compositing,'reopened_file':Path(bpy.data.filepath).name,
        'important_objects':[ob.name for col in beauty.collection.children if col.name[:2] in ['01','02','03','04','07'] for ob in col.objects],
        'packed_generated_textures':[{ 'name':img.name,'size':list(img.size),'packed':bool(img.packed_file),'description':{'Complexion':'Parametric skin pigment, local blush, freckles and lip tint','Vermilion':'Soft mask of the anatomical lip boundary','Iris':'Polar amber stromal fibers, collarette and outer limbal rim','Stockinette':'Periodic field of overlapping four-column, six-course yarn loops','Rib':'Alternating raised and recessed columns of twisted wool'}[img.name.split(' •')[0]]} for img in bpy.data.images if img.packed_file],
        'rendered_files':['renders/'+key+'.png' for key in CAT if (ROOT/'renders'/(key+'.png')).is_file()],
        'limitations':['Single frontal reference. Cranium, ears in depth, neck, hands, garment cut and rear hairstyle are inferred.','Facial proportions, iris pigmentation and smile are sculpted approximations. The skin and lip transitions are smoother than the photograph.','Hair is a fixed groom with native curves over supporting locks. The crown and long waves group into more regular sections than real hair.','Wool is a modeled garment with tiled yarn color and relief. Individual sweater stitches are shaded.','No production rig, cloth simulation or lower body. Head shape keys and separate posed eyes, hair and garments require coordinated edits for a new pose.','Café and lighting are reconstructed suggestions.']}
        output.update(stats(beauty))
        output['render_details']={}
        for key,camera in CAT.items():
            path=ROOT/'renders'/(key+'.png')
            if path.is_file():
                data=path.read_bytes()
                if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError(path)
                w,h=struct.unpack('>2I',data[16:24])
                output['render_details'][key]={'filename':'renders/'+path.name,'width':w,'height':h,'camera':camera,'scene':(beauty if key=='beauty' else diag).name,'sha256':hashlib.sha256(data).hexdigest()}
        output['reference_access']={'decoded_and_visually_inspected':True,'width':1205,'height':1306,'used_by_scene':False}
        output['base_asset']={'project':'MakeHuman hm08','license':'CC0','prepared':'input/upper-body.obj','hand_topology_source':'input/base.obj','source_sha256':hashlib.sha256((ROOT/'input/base.obj').read_bytes()).hexdigest()}
        output['curve_shader_tessellation_vertices']=None
        output['largest_packed_image_dimension_px']=max(max(i['size']) for i in output['packed_generated_textures'])
        output['character_model_in_diagnostic_scenes']='Both scenes link the same four character collections and lights.'
        (ROOT/'scene-report.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
if __name__=='__main__':main()
