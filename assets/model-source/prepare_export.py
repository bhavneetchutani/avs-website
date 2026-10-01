"""Evaluate source geometry and consolidate by assembly/material for browser export.
Run in the same namespace after truck, trailer and cargo scripts through Blender MCP.
The editable source scene is retained; only evaluated web copies are consolidated.
"""
import collections

def source_group(n):
    return bpy.data.objects.get(n+'_SOURCE') or bpy.data.objects[n]
for n in ['Cargo_Steel','Cargo_Precast','Cargo_Wire','Cargo_Machinery']:
    source_group(n).parent=rig

# Final detailing corrections: exactly three central rear clearance lights.
central=[o for o in trailer.children_recursive if o.name.startswith('Trailer | central clearance marker')]
for o in central:bpy.data.objects.remove(o,do_unlink=True)
for y in [-.17,0,.17]:cyl('Trailer | central clearance marker',(16.21,y,1.415),.024,.023,red,'X',16,trailer)
# Conventional combo crossmembers are steel. All four axle mudflaps are separate.
for o in trailer.children_recursive:
    if o.name.startswith('Trailer | aluminum crossmember'):
        o.name=o.name.replace('aluminum','steel');o.data.materials.clear();o.data.materials.append(steel)
if not any(o.name.startswith('Trailer | forward axle mudflap') for o in trailer.children_recursive):
    for side in [-1,1]:
        box('Trailer | forward axle mudflap',(12.30,side*.985,.64),(.03,.63,.68),rubber,.005,trailer)
        box('Trailer | rear corner dock bumper',(16.245,side*1.23,1.29),(.065,.085,.37),rubber,.015,trailer)

# Source studio setup is performed separately after consolidation.
for source_name in ['Tractor','Trailer']:
    for o in source_group(source_name).children_recursive:
        for modifier in o.modifiers:
            if modifier.type=='BEVEL' and modifier.width<=.022:
                modifier.segments=1
bpy.context.view_layer.update()
source_scene=bpy.context.scene
depsgraph=bpy.context.evaluated_depsgraph_get()
assemblies=['Tractor','Trailer','Cargo_Steel','Cargo_Precast','Cargo_Wire','Cargo_Machinery']
packed={}
report={'units':'meters','blender_axes':{'length':'X (nose negative)','width':'Y','up':'Z'},
        'deck_length_m':16.1544,'deck_width_m':2.5908,'deck_top_m':1.55,
        'source_components':{},'assemblies':{},'materials':[]}
for group_name in assemblies:
    group=source_group(group_name)
    buckets={}
    objects=[o for o in group.children_recursive if o.type in {'MESH','CURVE','FONT'}]
    report['source_components'][group_name]=len(objects)
    for o in objects:
        for modifier in o.modifiers:
            if modifier.type=='BEVEL' and modifier.width<=.022:
                modifier.segments=1
        evaluated=o.evaluated_get(depsgraph)
        me=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
        if not me:continue
        transform=o.matrix_world
        normalmatrix=transform.to_3x3().inverted().transposed()
        for material_index in set(p.material_index for p in me.polygons):
            evaluated_material=me.materials[material_index] if len(me.materials)>material_index else black
            # Evaluated dependency-graph IDs cannot survive save/reopen. Always bind
            # the original material datablock before exporting or saving a .blend.
            material=bpy.data.materials[evaluated_material.name]
            b=buckets.setdefault(material.name,{'verts':[],'faces':[],'smooth':[],'normals':[],'material':material})
            start=len(b['verts'])
            b['verts'].extend([tuple(transform@v.co) for v in me.vertices])
            for p in me.polygons:
                if p.material_index!=material_index:continue
                b['faces'].append(tuple(start+i for i in p.vertices))
                b['smooth'].append(p.use_smooth)
                b['normals'].extend([tuple((normalmatrix@me.corner_normals[i].vector).normalized()) for i in p.loop_indices])
        evaluated.to_mesh_clear()
    packed[group_name]=buckets
    print('Evaluated',group_name,len(objects),'source objects ->',len(buckets),'material batches')

web_scene=bpy.data.scenes.get('AVS Freight | optimized web model')
if web_scene:
    for o in list(web_scene.objects):bpy.data.objects.remove(o,do_unlink=True)
else:web_scene=bpy.data.scenes.new('AVS Freight | optimized web model')
bpy.context.window.scene=web_scene
scene=web_scene
web_rig=empty('AVS_Freight_WEB')
for group_name,buckets in packed.items():
    # Source names retained in glTF; Blender appends .001 while both scenes coexist.
    original=source_group(group_name);original.name=group_name+'_SOURCE'
    group=empty(group_name,web_rig)
    verts=tris=0
    for material_name,b in buckets.items():
        o=mesh(group_name+' | '+material_name,b['verts'],b['faces'],b['material'],group)
        for p,smooth in zip(o.data.polygons,b['smooth']):p.use_smooth=smooth
        if len(o.data.loops)==len(b['normals']):o.data.normals_split_custom_set(b['normals'])
        o.data.calc_loop_triangles()
        verts+=len(o.data.vertices);tris+=len(o.data.loop_triangles)
    report['assemblies'][group_name]={'meshes':len(buckets),'vertices':verts,'triangles':tris}
report['materials']=sorted({n for b in packed.values() for n in b})
report['total_triangles']=sum(g['triangles'] for g in report['assemblies'].values())
report['total_meshes']=sum(g['meshes'] for g in report['assemblies'].values())
report['max_visible_triangles']=sum(report['assemblies'][g]['triangles'] for g in ['Tractor','Trailer'])+max(report['assemblies'][g]['triangles'] for g in assemblies[2:])
report['max_visible_meshes']=sum(report['assemblies'][g]['meshes'] for g in ['Tractor','Trailer'])+max(report['assemblies'][g]['meshes'] for g in assemblies[2:])

bpy.ops.export_scene.gltf(filepath=OUT+'/avs-freight.raw.glb',export_format='GLB',use_active_scene=True,
    export_yup=True,export_animations=False,export_cameras=False,export_lights=False,
    export_extras=True,export_apply=True,export_materials='EXPORT',export_meshopt_compression_enable=False)
report['raw_bytes']=os.path.getsize(OUT+'/avs-freight.raw.glb')
with open(ROOT+'/assets/model-source/model-report.json','w') as f:json.dump(report,f,indent=2)
print(json.dumps(report,indent=2))
# Native scene is editable; optimized scene retains independently manipulable assemblies.
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/model-source/avs-freight.blend',compress=True)
