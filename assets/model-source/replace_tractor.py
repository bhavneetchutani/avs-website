"""Adapt the officially downloaded CC BY 4.0 Peterbilt; retain approved assemblies.
Run through Blender MCP in the existing avs-freight.blend. Never rebuild the trailer.
"""
import bpy
import json
import math
import bmesh
import struct
from collections import defaultdict
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path('/Users/vinniechutani/Claude/Projects/avs-website-3d-preview')
SOURCE = ROOT / 'assets/model-source'
stage = bpy.data.scenes.get('Peterbilt | imported source')
if stage is None:
    stage = bpy.data.scenes.new('Peterbilt | imported source')
else:
    for obj in list(stage.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
bpy.context.window.scene = stage
bpy.ops.import_scene.gltf(filepath=str(SOURCE / 'vendor/peterbilt-359/original.glb'))
archived = bpy.data.objects.get('Tractor_SOURCE')
if archived:
    archived.name = 'Tractor_REJECTED_SOURCE'
source_root = next(o for o in stage.objects if not o.parent)
source_root.name = 'Tractor_SOURCE'

def material(name, color, metal=0, rough=.4, coat=0, emission=0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .15
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = emission
    m.diffuse_color = (*color, 1)
    m.use_backface_culling = True
    return m

# The logo SVG and website --blue token use sRGB #2196E8. Blender and glTF
# store linear RGB; converting here preserves the exact brand base color.
BRAND_HEX = '#2196E8'
def srgb_to_linear(value):
    value /= 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4
brand_linear = tuple(srgb_to_linear(int(BRAND_HEX[i:i+2],16)) for i in (1,3,5))
paint = material('Tractor | AVS cobalt enamel', brand_linear, .18,.29,.45)
paint['brand_srgb'] = BRAND_HEX
ivory = material('Tractor | registration plate', (.62,.69,.75), .4,.27,.4)
chrome = material('Tractor | polished aluminum', (.67,.72,.78), .95,.19)
satin = material('Tractor | satin steel', (.24,.29,.34), .8,.36)
black = material('Tractor | chassis graphite', (.015,.020,.026), .18,.54)
rubber = material('Tractor | carbon tire rubber', (.010,.012,.016), 0,.79)
glass = material('Tractor | smoked glazing', (.019,.050,.073), .32,.095,.65)
glass['surface'] = 'glass'
warm_lens = material('Tractor | headlamp crystal', (.72,.79,.83), .38,.15,.5,.1)
amber = material('Tractor | amber lamp', (.9,.22,.013), .15,.24,.4,.2)
red = material('Tractor | red lamp', (.49,.006,.01), .18,.26,.4,.15)
leather = material('Tractor | charcoal interior', (.035,.031,.028), 0,.86)
trim = material('Tractor | brushed cabin trim', (.095,.10,.11), .15,.5)
blue_hose = material('Tractor | service air blue', (.01,.08,.24), 0,.48)
red_hose = material('Tractor | supply air red', (.35,.014,.013), 0,.5)
engine = material('Tractor | engine ochre', (.30,.20,.038), .2,.65)

mapping = {
    'primary':paint, 'secondary':paint, 'third':paint,
    'chassis_vlo.0':black, 'chassis_vlo.1':rubber, 'chassis_vlo.2':black,
    'chassis_vlo.6':amber, 'cab.6':chrome, 'cab.7':chrome,
    'cab.8':black, 'cab.9':warm_lens, 'cab.11':chrome, 'cab.12':chrome,
    'glass':glass, 'bonnet_ok.8':black, 'tynipoly.0':black,
    'left_front_light':amber, 'right_front_light':amber,
    'left_rear_light':red, 'right_rear_light':red,
    'inside.3':trim, 'inside.4':trim, 'inside.9':satin,
    'inside.10':black, 'inside.11':black, 'inside.12':black,
    'inside.13':red_hose, 'inside.14':leather, 'inside.15':leather,
    'chassis.11':satin, 'chassis.14':blue_hose, 'chassis.15':red,
    'chassis.16':ivory, 'chassis.17':engine, 'chassis.18':red_hose,
}
meshes = [o for o in stage.objects if o.type == 'MESH']
raw=(SOURCE/'vendor/peterbilt-359/original.glb').read_bytes()
gltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
source_assignments={node['name']:gltf['materials'][gltf['meshes'][node['mesh']]['primitives'][0]['material']]['name'] for node in gltf['nodes'] if 'mesh' in node}
for obj in meshes:
    for slot in obj.material_slots:
        node_name=next((n for n in source_assignments if obj.name==n or obj.name.startswith(n+'.')),None)
        source_name = source_assignments[node_name] if node_name else slot.material.name
        if source_name not in mapping:
            raise ValueError(f'Unmapped source material: {source_name}')
        assigned = mapping[source_name]
        if source_name == 'primary' and obj.name.startswith('wheel_'):
            assigned = chrome
        elif source_name == 'primary' and obj.name.startswith('chassis_'):
            assigned = black
        elif obj.name.startswith('bonnet_ok.001_glass'):
            assigned = warm_lens
        # Record the source assignment per object so source material names remain
        # auditable after adaptation, without touching other assemblies' materials.
        obj['source_material'] = source_name
        slot.material = assigned
    obj['source_asset'] = '0599b3d7f9a5437fa905b20674d16d17'

# Delete the overlapping cab/sleeper window-border faces found in the source.
def source_object(prefix):
    return next(o for o in meshes if o.name.startswith(prefix))
cab_border = source_object('cab_chassis_vlo.2_0')
sleeper_border = source_object('Extra1_cab.7_0')
def face_key(obj, indices):
    return tuple(sorted(tuple(round(float(c),5) for c in obj.matrix_world @ obj.data.vertices[i].co) for i in indices))
cab_border.data.calc_loop_triangles()
keys = {face_key(cab_border,t.vertices) for t in cab_border.data.loop_triangles}
duplicates = [p.index for p in sleeper_border.data.polygons if face_key(sleeper_border,p.vertices) in keys]
bm=bmesh.new();bm.from_mesh(sleeper_border.data);bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[bm.faces[i] for i in duplicates],context='FACES')
bm.to_mesh(sleeper_border.data);bm.free()
print('Removed overlapping cab/sleeper faces:',len(duplicates))

# Raise the existing fifth-wheel/slider assembly onto mounting risers to match
# the flatbed's bolster height. The tires remain on the original ground plane.
chassis=source_object('chassis_primary_0')
for vertex in chassis.data.vertices:
    p=chassis.matrix_world @ vertex.co
    if abs(p.x)<.5 and -3.55<p.y<-2.6 and p.z>-.23:
        p.z += .2072
        vertex.co=chassis.matrix_world.inverted() @ p

def box(name,location,size,mat):
    x,y,z=(v/2 for v in size)
    vertices=[(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]
    faces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.materials.append(mat)
    obj=bpy.data.objects.new(name,me);stage.collection.objects.link(obj)
    obj.parent=source_root;obj.matrix_parent_inverse=source_root.matrix_world.inverted();obj.location=location
    return obj
for x in [-.38,.38]:
    box('Peterbilt | fifth wheel mounting riser',(x,-3.07,-.105),(.11,.82,.23),black)
for i in range(27):
    box('Peterbilt | radiator fin', (0,3.724,-.38+i*.0378),(1.054,.005,.0045),satin)

# The source hierarchy remains editable at its installed real-world placement.
transform = Matrix.Translation(Vector((-2.08,0,1.1882))) @ Matrix.Rotation(math.pi/2,4,'Z') @ Matrix.Scale(.94,4)
source_root.matrix_world=transform @ source_root.matrix_world
bpy.context.view_layer.update()
meshes=[o for o in stage.objects if o.type in {'MESH','FONT'}]

# Bake the imported transforms into independent meshes, preserving UVs, custom
# normals and material slots. Source + optimized copies survive save/reopen.
web = bpy.data.scenes['AVS Freight | optimized web model']
old = bpy.data.objects.get('Tractor')
if old:
    for obj in list(old.children_recursive):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.objects.remove(old, do_unlink=True)
tractor = bpy.data.objects.new('Tractor',None)
web.collection.objects.link(tractor)
tractor.parent = bpy.data.objects['AVS_Freight_WEB']
tractor['title'] = '1978 Peterbilt 359 Standard — AVS adaptation'
tractor['creator'] = 'hans1240'
tractor['license'] = 'CC BY 4.0'
tractor['source'] = 'https://sketchfab.com/3d-models/1978-peterbilt-359-standard-0599b3d7f9a5437fa905b20674d16d17'
for original in meshes:
    if original.type=='FONT':
        evaluated=original.evaluated_get(bpy.context.evaluated_depsgraph_get())
        me=bpy.data.meshes.new_from_object(evaluated)
        copy=bpy.data.objects.new(original.name,me)
        me.materials.clear();me.materials.append(paint)
    else:
        copy = original.copy()
        copy.data = original.data.copy()
    copy.name = 'Tractor | ' + original.name
    web.collection.objects.link(copy)
    matrix = original.matrix_world.copy()
    copy.parent = tractor
    copy.matrix_world = matrix
    # Imported shading normals are authored; do not replace with blanket smoothing.
    copy.hide_render = False

bpy.context.window.scene = web
bpy.context.view_layer.update()
# Blender's join preserves UVs and custom normals, unlike the first procedural
# consolidator. Limit browser draw calls while leaving source parts independent.
buckets=defaultdict(list)
for obj in tractor.children_recursive:
    if obj.type=='MESH':buckets[obj.data.materials[0].name].append(obj)
for name,objects in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    obj=bpy.context.view_layer.objects.active;obj.name='Tractor | '+name
    # Each bucket has one common original material; collapse duplicate slots.
    mat=obj.data.materials[0];obj.data.materials.clear();obj.data.materials.append(mat)
    for polygon in obj.data.polygons:polygon.material_index=0
print('Replaced entire tractor:',len(meshes),'source components;',len(buckets),'web batches; approved trailer/cargo retained')
