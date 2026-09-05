"""Read-only check in a separate Blender process: catch save/reload material loss."""
import bpy,json
from pathlib import Path
report=json.loads((Path(bpy.data.filepath).parent/'model-report.json').read_text())
scene=bpy.data.scenes['AVS Freight | optimized web model']
meshes=[o for o in scene.objects if o.type=='MESH' and o.name!='Studio | ground']
assert len(meshes)==report['total_meshes'],len(meshes)
for o in meshes:
    assert len(o.data.materials)==1 and o.data.materials[0] is not None,o.name
assert sorted({o.data.materials[0].name for o in meshes})==sorted(report['materials'])
for name,expected in report['assemblies'].items():
    root=scene.objects[name]
    children=[o for o in root.children_recursive if o.type=='MESH']
    assert len(children)==expected['meshes'],name
    triangles=0
    for o in children:
        o.data.calc_loop_triangles()
        triangles+=len(o.data.loop_triangles)
    assert triangles==expected['triangles'],(name,triangles)
    source=bpy.data.objects[name+'_SOURCE']
    components=[o for o in source.children_recursive if o.type in {'MESH','CURVE','FONT'}]
    assert len(components)==report['source_components'][name],(name,len(components))
    assert all(o.data.materials and all(o.data.materials) for o in components),name
print('SAVED_BLEND_CHECK '+json.dumps({'meshes':len(meshes),'materials':len(report['materials']),'materials_survive_reload':True,'editable_source':True,'assemblies':list(report['assemblies'])}))
