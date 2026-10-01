"""Neutral studio, saved cameras and stills of the same geometry exported to the web."""
scene=bpy.context.scene
for name in ['Cargo_Steel','Cargo_Precast','Cargo_Wire','Cargo_Machinery']:
    group=bpy.data.objects[name]
    for o in group.children_recursive:o.hide_render=name!='Cargo_Steel';o.hide_set(name!='Cargo_Steel')
studio=empty('STUDIO | excluded from web export')
floor=mat('Studio | blue slate floor',(.018,.028,.044),.25,.5)
box('Studio | ground',(3,0,-.055),(200,200,.1),floor,0,studio)
world=bpy.data.worlds.new('Studio | neutral blue environment');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.23,.28,.35,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
scene.world=world
def area(name,location,power,color,size,target,size_y=None):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    if size_y:d.shape='RECTANGLE';d.size_y=size_y
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=location
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.parent=studio
    return o
area('Studio | large overhead softbox',(0,-5,12),3800,(.77,.87,1),10,(2,0,0),18)
area('Studio | far rim strip',(6,5,8),4800,(.59,.76,1),9,(3,0,1),18)
area('Studio | nose beauty light',(-10,-3,6),1600,(1,.88,.73),6,(-5,0,1.8))
area('Studio | rear fill',(14,-7,6),1700,(.80,.89,1),8,(10,0,1))
def camera(name,location,target,scale):
    d=bpy.data.cameras.new(name);d.type='ORTHO';d.ortho_scale=scale;d.lens=50
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=location
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.parent=studio
    return o
hero_cam=camera('Camera | full rig',(-13,-25,14),(3.5,0,1.25),26.5)
detail_cam=camera('Camera | tractor detail',(-12.8,-9.2,5.6),(-4.1,0,1.75),9.7)
rear_cam=camera('Camera | rear detail',(23,-8,6),(12.3,0,1.2),10)
scene.camera=hero_cam
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    for dev in prefs.devices:dev.use=dev.type=='METAL'
    scene.cycles.device='GPU'
except Exception:scene.cycles.device='CPU'
scene.render.resolution_x=1800;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.render.filepath=OUT+'/avs-freight-poster.png'
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='MATERIAL'
            a.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/model-source/avs-freight.blend',compress=True)
print('Studio and three review cameras saved')
