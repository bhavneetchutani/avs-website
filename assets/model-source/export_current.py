"""Export the assembled Blender scene without rebuilding approved geometry."""
import bpy
import json
from pathlib import Path

ROOT=Path('/Users/vinniechutani/Claude/Projects/avs-website-3d-preview')
SOURCE=ROOT/'assets/model-source'
exec(compile((SOURCE/'verify_preserved_assemblies.py').read_text(),'verify_preserved_assemblies.py','exec'))
scene=bpy.data.scenes['AVS Freight | optimized web model']
bpy.context.window.scene=scene
names=['Tractor','Trailer','Cargo_Steel','Cargo_Precast','Cargo_Wire','Cargo_Machinery']
report=json.loads((SOURCE/'model-report.json').read_text())
report['power_unit']={'model':'1978 Peterbilt 359 Standard','creator':'hans1240','license':'CC BY 4.0','source':'https://sketchfab.com/3d-models/1978-peterbilt-359-standard-0599b3d7f9a5437fa905b20674d16d17','uniform_scale':.94,'brand_srgb':'#2196E8','revision':'Complete replacement; uniform brand blue body paint, no AVS lettering, radiator fins and coupling risers'}
materials=set()
for name in names:
    source=bpy.data.objects[name+'_SOURCE']
    report['source_components'][name]=len([o for o in source.children_recursive if o.users_scene and o.type in {'MESH','CURVE','FONT'}])
    objects=[o for o in bpy.data.objects[name].children_recursive if o.type=='MESH']
    triangles=vertices=0
    for obj in objects:
        obj.data.calc_loop_triangles()
        triangles+=len(obj.data.loop_triangles);vertices+=len(obj.data.vertices)
        assert len(obj.data.materials)==1 and obj.data.materials[0] is not None,obj.name
        materials.add(obj.data.materials[0].name)
    report['assemblies'][name]={'meshes':len(objects),'vertices':vertices,'triangles':triangles}
report['materials']=sorted(materials)
report['total_triangles']=sum(v['triangles'] for v in report['assemblies'].values())
report['total_meshes']=sum(v['meshes'] for v in report['assemblies'].values())
for metric in ['triangles','meshes']:
    report['max_visible_'+metric]=sum(report['assemblies'][g][metric] for g in names[:2])+max(report['assemblies'][g][metric] for g in names[2:])

rig=bpy.data.objects['AVS_Freight_WEB']
export_objects=[rig]+list(rig.children_recursive)
state={o:(o.hide_get(),o.hide_render) for o in export_objects}
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects:
    obj.hide_set(False);obj.hide_render=False;obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'models/avs-freight.raw.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_apply=True,export_materials='EXPORT',export_meshopt_compression_enable=False)
for obj,(hidden,hidden_render) in state.items():
    obj.hide_set(hidden);obj.hide_render=hidden_render
report['raw_bytes']=(ROOT/'models/avs-freight.raw.glb').stat().st_size
(SOURCE/'model-report.json').write_text(json.dumps(report,indent=2)+'\n')
scene.camera=bpy.data.objects['Camera | full rig']
scene.render.resolution_x=1800;scene.render.resolution_y=1050
scene.render.filepath=str(ROOT/'models/avs-freight-poster.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'avs-freight.blend'),compress=True)
print(json.dumps({'triangles':report['total_triangles'],'meshes':report['total_meshes'],'materials':len(materials),'raw_bytes':report['raw_bytes']}))
