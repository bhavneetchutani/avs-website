"""Read-only check in a separate Blender process: catch save/reload material loss."""
import bpy,json
scene=bpy.data.scenes['AVS Freight | optimized web model']
meshes=[o for o in scene.objects if o.type=='MESH' and o.name!='Studio | ground']
assert len(meshes)==45,len(meshes)
for o in meshes:
    assert len(o.data.materials)==1 and o.data.materials[0] is not None,o.name
assert len(bpy.data.objects['Tractor_SOURCE'].children_recursive)>1000
print('SAVED_BLEND_CHECK '+json.dumps({'meshes':len(meshes),'materials_survive_reload':True,'editable_source':True}))
