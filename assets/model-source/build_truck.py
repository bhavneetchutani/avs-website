"""AVS original highway tractor, modeled in metres through Blender MCP.

Reference-informed visualization, not an OEM CAD reconstruction. X is longitudinal
(nose negative), Y is width and Z is height. Geometry intentionally keeps a smooth
outer silhouette and modeled hardware without unseen powertrain internals.
"""
import bpy, math, os, json
from mathutils import Vector, Quaternion
from math import pi, sin, cos

ROOT = '/Users/vinniechutani/Claude/Projects/avs-website-3d-preview'
OUT = ROOT + '/models'
os.makedirs(OUT, exist_ok=True)
scene = bpy.data.scenes.new('AVS Freight | studio')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

def mat(name, color, metal=0, rough=.4):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color[:3], color[3] if len(color)>3 else 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = m.diffuse_color
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    return m

def finish(o, name, material=None, parent=None):
    o.name=name
    if material: o.data.materials.append(material)
    if parent: o.parent=parent
    return o

def empty(name,parent=None):
    o=bpy.data.objects.new(name,None); scene.collection.objects.link(o)
    o.empty_display_type='PLAIN_AXES'; o.empty_display_size=.3; o.parent=parent
    return o

def box(name,loc,size,material,bevel=0,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('Manufactured edge radii','BEVEL'); b.width=bevel; b.segments=3
        b.affect='EDGES'
        n=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL'); n.keep_sharp=True; n.weight=45
    return finish(o,name,material,parent)

def cyl(name,loc,radius,depth,material,axis='Z',vertices=24,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=pi/2
    if axis=='Y':o.rotation_euler[0]=pi/2
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return finish(o,name,material,parent)

def torus(name,loc,major,minor,material,axis='Z',parent=None,segments=32,sides=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=segments,minor_segments=sides,location=loc)
    o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=pi/2
    if axis=='Y':o.rotation_euler[0]=pi/2
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,material,parent)

def mesh(name,verts,faces,material,parent=None):
    d=bpy.data.meshes.new(name); d.from_pydata(verts,[],faces); d.update()
    o=bpy.data.objects.new(name,d); scene.collection.objects.link(o)
    return finish(o,name,material,parent)

def tube(name,points,radius,material,parent=None):
    d=bpy.data.curves.new(name,'CURVE'); d.dimensions='3D'; d.resolution_u=1
    d.bevel_depth=radius; d.bevel_resolution=1; d.resolution_u=2
    s=d.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o)
    return finish(o,name,material,parent)

def beam(name,a,b,width,material,parent=None):
    a,b=Vector(a),Vector(b)
    o=box(name,(a+b)/2,(width,width,(b-a).length),material, min(width*.12,.008),parent)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o

def panel(name,pts,material,parent,thickness=.008,bevel=.015):
    o=mesh(name,pts,[tuple(range(len(pts)))],material,parent)
    if thickness:
        m=o.modifiers.new('Panel thickness','SOLIDIFY');m.thickness=thickness
    if bevel:
        m=o.modifiers.new('Panel edge','BEVEL');m.width=bevel;m.segments=3
    return o

def loft(name,rings,material,parent,bevel=.06):
    # Ring entries: x, half width, bottom, shoulder height, roof height, roof half width.
    verts=[]
    for x,w,b,s,t,rw in rings:
        cut=.09
        verts += [(x,-w+cut,b),(x,w-cut,b),(x,w,b+cut),(x,w,s),
                  (x,rw+.04,t-.06),(x,rw,t),(x,-rw,t),(x,-rw-.04,t-.06),
                  (x,-w,s),(x,-w,b+cut)]
    n=10;faces=[tuple(reversed(range(n)))]
    for r in range(len(rings)-1):
        for i in range(n):faces.append((r*n+i,r*n+(i+1)%n,(r+1)*n+(i+1)%n,(r+1)*n+i))
    faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
    o=mesh(name,verts,faces,material,parent)
    m=o.modifiers.new('Soft automotive body folds','BEVEL');m.width=bevel;m.segments=3
    n=o.modifiers.new('Weighted body normals','WEIGHTED_NORMAL');n.keep_sharp=True
    return o

paint=mat('AVS | midnight cobalt paint',(.018,.09,.32),.62,.26)
paint.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.5
paint.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.18
paintLight=mat('AVS | blue edge accents',(.04,.24,.68),.55,.27)
black=mat('Hardware | graphite',(.015,.021,.028),.35,.38)
rubber=mat('Tyres | carbon rubber',(.018,.021,.024),.02,.78)
rubberSide=mat('Tyres | satin sidewall',(.027,.03,.036),.05,.57)
chrome=mat('Hardware | polished aluminum',(.56,.64,.71),.93,.2)
alloy=mat('Hardware | brushed aluminum',(.42,.49,.56),.88,.36)
steel=mat('Hardware | galvanized steel',(.25,.31,.36),.75,.45)
glass=mat('Cab | blue smoked glazing',(.027,.085,.13),.66,.13)
glass.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.6
white=mat('Livery | warm white',(.87,.91,.94),.15,.33)
red=mat('Reflectors | ruby',(.6,.016,.008),.22,.25)
amber=mat('Lamps | amber',(.95,.22,.012),.15,.25)
lens=mat('Lamps | LED phosphor',(.8,.94,1),.12,.22)
for m,power in [(amber,.22),(red,.18),(lens,.6)]:
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=m.diffuse_color;p.inputs['Emission Strength'].default_value=power
wood=mat('Trailer | apitong nail strips',(.20,.105,.047),0,.78)

exec(compile(open(ROOT+'/assets/model-source/fast_geometry.py').read(),'fast_geometry.py','exec'))
rig=empty('AVS_Freight')
tractor=empty('Tractor',rig)

# Twin chassis rails, fifth-wheel carriage, crossmembers, lines and tractor running gear.
for y in [-.43,.43]:
    box('Tractor ladder frame rail',(-2.95,y,.82),(9.25,.105,.27),black,.015,tractor)
for x in [-6.9,-5.3,-4.0,-2.7,-1.5,-.25,.9,1.6]:
    box('Chassis crossmember',(x,0,.82),(.09,.91,.17),steel,.009,tractor)
box('Fifth wheel sliding carriage',(.34,0,1.09),(1.4,.93,.16),black,.025,tractor)
for y in [-.47,.47]:box('Fifth wheel slide teeth',(.35,y,1.15),(1.5,.055,.08),alloy,.008,tractor)
cyl('Fifth wheel horseshoe plate',(.48,0,1.26),.51,.13,black,vertices=48,parent=tractor)
box('Fifth wheel kingpin throat',(.95,0,1.335),(.55,.1,.016),rubber,0,tractor)
tube('Fifth wheel release handle',[(.3,-.48,1.22),(.3,-.79,1.22),(.48,-.82,1.22)],.017,chrome,tractor)

def wheel(x,y,z,parent,steer=False):
    side=1 if y>0 else -1
    w=.295 if steer else .265
    r=.52
    # Lathed cross-section has molded shoulders and a recessed bead, unlike toroidal tyres.
    profile=[(-w/2,.305),(-w/2-.012,.35),(-w/2,.445),(-w/2+.045,.51),
             (-w/2+.075,.521),(w/2-.075,.521),(w/2-.045,.51),(w/2,.445),(w/2+.012,.35),(w/2,.305)]
    v=[];f=[];n=56
    for a,rad in profile:
        for i in range(n):
            t=i*2*pi/n;v.append((x+rad*sin(t),y+a,z+rad*cos(t)))
    for j in range(len(profile)):
        for i in range(n):f.append((j*n+i,j*n+(i+1)%n,((j+1)%len(profile))*n+(i+1)%n,((j+1)%len(profile))*n+i))
    o=mesh('Tire | radial carcass',v,f,rubberSide,parent)
    for p in o.data.polygons:p.use_smooth=True
    # Circumferential tread grooves: 3 continuous rings plus staggered cross sipes.
    for dy in [-.068,0,.068]:
        torus('Tire | longitudinal tread rib',(x,y+dy,z),.513,.009,rubber,'Y',parent,56,4)
    for i in range(40):
        t=i*2*pi/40
        for dy in [-.08,.08]:
            o=box('Tire | shoulder tread',(x+.515*sin(t),y+dy,z+.515*cos(t)),(.032,.085,.012),rubber,0,parent)
            o.rotation_euler[1]=t
    cyl('Wheel | barrel',(x,y,z),.306,w+.014,alloy,'Y',40,parent)
    faceY=y+side*(w/2+.014)
    torus('Wheel | polished bead',(x,faceY,z),.295,.016,chrome,'Y',parent,48,6)
    cyl('Wheel | dished aluminum face',(x,faceY,z),.276,.018,chrome,'Y',48,parent)
    # Oval-looking dark recesses, independent of the lug-circle geometry.
    for i in range(10):
        a=2*pi*i/10
        cyl('Wheel | vent recess',(x+.219*sin(a),faceY+side*.013,z+.219*cos(a)),.036,.006,black,'Y',12,parent)
        a+=pi/10
        cyl('Wheel | lug nut',(x+.119*sin(a),faceY+side*.026,z+.119*cos(a)),.015,.029,chrome,'Y',6,parent)
    cyl('Wheel | hub',(x,faceY+side*.02,z),.082,.095,alloy,'Y',32,parent)
    cyl('Wheel | center cap',(x,faceY+side*.079,z),.053,.025,chrome,'Y',24,parent)
    torus('Tire | embossed bead line',(x,y+side*(w/2+.008),z),.412,.003,rubber,'Y',parent,48,4)

for x in [-6.08,-.68,.67]:
    cyl('Axle housing',(x,0,.54),.092,2.06,black,'Y',24,tractor)
    if x>-1:
        d=box('Drive differential',(x,0,.56),(.37,.4,.28),black,.1,tractor)
        for y in [-.98,-.685,.685,.98]:wheel(x,y,.535,tractor)
        for y in [-.46,.46]:
            for xx in [x-.27,x+.27]:cyl('Air suspension bellows',(xx,y,.77),.115,.2,rubber,parent=tractor)
            beam('Suspension torque arm',(x-.55,y,.84),(x+.08,y,.57),.072,black,tractor)
    else:
        for y in [-1.045,1.045]:wheel(x,y,.535,tractor,True)
        for y in [-.44,.44]:box('Steer leaf spring',(x,y,.68),(.92,.07,.04),steel,.012,tractor)
tube('Propeller shaft',[(-3.0,0,.7),(-.68,0,.55),(.67,0,.55)],.05,steel,tractor)
for y in [-1.01,1.01]:
    box('Rear mudflap hanger',(1.23,y,.88),(.075,.66,.06),alloy,.006,tractor)
    box('Rear mudflap',(1.3,y,.54),(.032,.6,.59),rubber,.006,tractor)
    box('Rear fender top',(-.01,y,1.095),(2.4,.64,.07),black,.033,tractor)

# Cab and sleeper continuous aerodynamic shell. Mid-roof suits open-deck work.
loft('Cab | main sculpted shell',[
 (-5.28,1.04,1.14,2.33,2.4,.90),(-5.08,1.115,1.14,2.44,2.53,.98),
 (-4.59,1.14,1.14,3.02,3.12,.98),(-3.88,1.145,1.14,3.11,3.35,1.02),
 (-3.36,1.145,1.14,3.23,3.61,1.00),(-2.68,1.145,1.14,3.24,3.62,.98),
 (-2.20,1.12,1.14,3.17,3.53,.94)],paint,tractor,.075)

# Sloped panoramic windshield, rubber sealing and central division.
ws=[(-5.12,-.968,2.40),(-5.12,.968,2.40),(-4.62,.928,3.042),(-4.62,-.928,3.042)]
panel('Cab | windscreen gasket',[(x-.022,y*1.045,z) for x,y,z in ws],black,tractor,.017,.026)
panel('Cab | panoramic blue windscreen',ws,glass,tractor,.012,.026)
tube('Cab | windscreen center mullion',[(-5.137,0,2.4),(-4.644,0,3.041)],.013,black,tractor)
for side in [-1,1]:
    y=side*1.158
    # A-pillars rake with windshield; separate door and rear-sleeper seam.
    points=[(-5.03,y,2.38),(-4.56,y,2.989),(-3.965,y,3.061),(-3.965,y,2.37)]
    panel('Cab | side window rubber',points,black,tractor,.009,.026)
    inset=[(-4.96,y+side*.012,2.42),(-4.535,y+side*.012,2.955),(-4.023,y+side*.012,3.011),(-4.023,y+side*.012,2.42)]
    panel('Cab | driver side glass',inset,glass,tractor,.007,.02)
    tube('Cab | door perimeter seam',[(-5.09,y,2.32),(-4.66,y,3.08),(-3.89,y,3.14),(-3.89,y,1.27),(-4.85,y,1.27),(-5.09,y,1.52),(-5.09,y,2.32)],.008,black,tractor)
    box('Cab | door handle bezel',(-4.1,y+side*.015,2.03),(.18,.025,.067),black,.03,tractor)
    box('Cab | chrome door pull',(-4.105,y+side*.034,2.041),(.125,.024,.021),chrome,.009,tractor)
    cyl('Cab | door lock',(-4.1,y+side*.037,2.005),.009,.006,chrome,'Y',12,tractor)
    # Sleeper storage doors and compact upper bunk window.
    for z,h in [(1.55,.43),(2.16,.56)]:
        yy=side*1.151
        outline=[(-2.93,yy,z-h/2),(-2.36,yy,z-h/2),(-2.36,yy,z+h/2),(-2.93,yy,z+h/2),(-2.93,yy,z-h/2)]
        tube('Sleeper | storage hatch seal',outline,.006,black,tractor)
        box('Sleeper | hatch latch',(-2.45,yy+side*.01,z),(.055,.018,.09),black,.014,tractor)
    panel('Sleeper | upper window',[(-3.23,side*1.153,2.86),(-2.62,side*1.153,2.94),(-2.62,side*1.153,3.14),(-3.23,side*1.153,3.1)],black,tractor,.008,.035)
    # A polished mirror with upper and lower support arm, casing and convex mirror.
    for z in [2.43,2.71]:tube('Cab | mirror cantilever',[(-4.81,side*1.15,z),(-4.78,side*1.53,z),(-4.57,side*1.59,z)],.023,black,tractor)
    box('Cab | aerodynamic mirror housing',(-4.64,side*1.62,2.68),(.23,.145,.55),chrome,.068,tractor)
    box('Cab | mirror glass',(-4.511,side*1.621,2.733),(.012,.124,.31),glass,.025,tractor)
    box('Cab | convex lower mirror',(-4.511,side*1.621,2.489),(.014,.122,.115),glass,.025,tractor)
    tube('Cab | antenna',[(-3.78,side*1.13,3.13),(-3.84,side*1.18,4.01)],.004,black,tractor)
    # Side skirt shape and two grippy cab-access treads.
    loft('Tractor | aero side skirt',[
      (-4.95,.0,.48,.95,1.10,.0),(-4.72,.0,.37,1.02,1.12,.0)],paint,tractor,.01) if False else None
    points=[(-4.94,side*1.14,1.11),(-2.16,side*1.14,1.11),(-1.91,side*1.14,.91),(-2.03,side*1.14,.44),(-4.72,side*1.14,.44)]
    panel('Tractor | molded side skirt',points,paint,tractor,.12,.08)
    for x,z,length in [(-4.69,.5,.56),(-4.6,.86,.62)]:
        box('Cab | aluminum access step',(x,side*1.23,z),(length,.3,.065),alloy,.02,tractor)
        for j in range(9):box('Cab | step anti-slip slots',(x-length*.39+j*length*.098,side*1.242,z+.036),(.021,.20,.007),black,.002,tractor)
    # Underbody fuel tanks visible through the rear skirt opening.
    cyl('Tractor | cylindrical fuel tank',(-2.59,side*.86,.78),.30,1.1,alloy,'X',40,tractor)
    for x in [-2.99,-2.2]:torus('Tractor | fuel tank strap',(x,side*.86,.78),.303,.019,black,'X',tractor,36,6)
    cyl('Tractor | fuel fill neck',(-2.5,side*1.13,.96),.055,.07,chrome,'Y',20,tractor)

# Hood has a narrowing nose and a rising centre crown.
loft('Hood | central aerodynamic crown',[
 (-7.36,.70,.79,1.60,1.69,.54),(-7.11,.83,.89,1.73,1.82,.65),
 (-6.57,.88,1.16,1.86,2.00,.70),(-5.70,.96,1.18,2.08,2.23,.78),
 (-5.20,1.035,1.17,2.20,2.33,.89)],paint,tractor,.085)
for side in [-1,1]:
    # Wheel opening is actual negative silhouette rather than a wheel intersecting a cube.
    outer=[(-7.40,side*1.035,.72),(-7.41,side*1.045,1.31),(-7.11,side*1.13,1.57),(-6.71,side*1.18,1.76),(-5.63,side*1.19,1.97),(-5.21,side*1.145,1.65),(-5.29,side*1.19,.57)]
    arch=[]
    for i in range(23):
        t=pi*i/22;arch.append((-6.08+.665*cos(t),side*1.207,.535+.665*sin(t)))
    # Right side lower boundary goes from rear wheel-arch foot over arch to front foot.
    poly=outer+arch+[(-7.40,side*1.06,.62)]
    panel('Hood | swept wheel fender',poly,paint,tractor,.16,.028)
    tube('Hood | wheel arch molding',[(x,side*1.23,z) for x,y,z in arch],.025,paint,tractor)
    tube('Hood | wheel arch rubber liner',[(x,side*1.245,z-.032) for x,y,z in arch],.022,black,tractor)
    tube('Hood | panel rear seam',[(-5.25,side*1.065,2.26),(-5.25,side*1.165,1.49)],.008,black,tractor)
    panel('Hood | cowl air intake',[(-5.97,side*1.024,2.005),(-5.38,side*1.09,2.14),(-5.38,side*1.09,2.235),(-5.86,side*1.04,2.132)],black,tractor,.01,.028)
    for j in range(7):tube('Hood | intake louvers',[(-5.88+j*.069,side*1.093,2.048+j*.016),(-5.88+j*.069,side*1.1,2.098+j*.016)],.008,alloy,tractor)
    # Wraparound headlamp pod, projectors and LED signature.
    pod=[(-7.408,side*.77,1.09),(-7.41,side*1.087,1.08),(-7.25,side*1.175,1.38),(-7.35,side*.83,1.41)]
    panel('Hood | headlamp dark surround',pod,black,tractor,.045,.025)
    for yy in [.87,1.005]:
        cyl('Hood | projector lamp',(-7.428,side*yy,1.232),.068,.03,chrome,'X',24,tractor)
        cyl('Hood | projector lens',(-7.448,side*yy,1.232),.05,.016,lens,'X',24,tractor)
    tube('Hood | LED light signature',[(-7.454,side*.79,1.1),(-7.456,side*1.083,1.1),(-7.344,side*1.149,1.32)],.017,lens,tractor)
    box('Hood | amber turn signal',(-7.4,side*1.13,1.22),(.035,.035,.115),amber,.012,tractor)

# Tall inset grille with fine slats and a restrained original AVS badge.
grille=[(-7.46,-.66,.83),(-7.46,.66,.83),(-7.38,.61,1.663),(-7.38,-.61,1.663)]
panel('Nose | grille chrome frame',grille,chrome,tractor,.04,.06)
panel('Nose | radiator core',[(-7.484,-.587,.90),(-7.484,.587,.90),(-7.404,.541,1.586),(-7.404,-.541,1.586)],black,tractor,.012,.03)
for i in range(19):
    z=.935+i*.033
    x=-7.486+(z-.9)*.116
    w=1.148-(z-.9)*.137
    box('Nose | bright grille lamella',(x,0,z),(.024,w,.012),chrome,.004,tractor)
for y in [-.36,-.18,0,.18,.36]:tube('Nose | grille vertical support',[(-7.485,y,.91),(-7.4,y,1.59)],.008,steel,tractor)
box('Nose | AVS emblem plaque',(-7.413,0,1.65),(.04,.15,.065),paintLight,.008,tractor)
loft('Nose | formed bumper',[
 (-7.53,1.08,.40,.65,.72,1.01),(-7.38,1.20,.39,.65,.73,1.10),(-7.09,1.205,.39,.64,.70,1.13)],chrome,tractor,.04)
for y in [-.91,.91]:box('Bumper | driving lamp',(-7.547,y,.555),(.025,.19,.066),lens,.02,tractor)
for y in [-.64,.64]:box('Bumper | tow-hook inset',(-7.554,y,.54),(.024,.13,.10),black,.022,tractor)
box('Bumper | central air dam',(-7.55,0,.52),(.02,.71,.11),black,.025,tractor)

# Wipers, cab roof clearance lights, rear air/electrical coiled lines.
for y in [-.45,.45]:
    tube('Cab | wiper arm',[(-5.165,y-.14,2.392),(-5.083,y,2.47),(-4.92,y+.25,2.66)],.013,black,tractor)
    tube('Cab | wiper blade',[(-5.038,y+.02,2.515),(-4.843,y+.40,2.777)],.017,black,tractor)
for y in [-.81,-.40,0,.40,.81]:
    box('Cab | marker light base',(-4.56,y,3.11),(.14,.08,.027),chrome,.02,tractor)
    box('Cab | amber roof marker',(-4.586,y,3.129),(.089,.06,.024),amber,.018,tractor)
box('Tractor | rear cab catwalk',(-1.56,0,1.02),(1.12,1.22,.045),alloy,.009,tractor)
for x in [-1.98+i*.07 for i in range(13)]:box('Tractor | catwalk slot',(x,0,1.046),(.022,1.12,.008),black,0,tractor)
for i,m in enumerate([red,paintLight,black]):
    pts=[(-2.13,-.24+i*.24,1.85)]
    for j in range(120):
        t=j/119; a=t*2*pi*13;pts.append((-2.01+t*1.15,-.24+i*.24+.055*cos(a),1.70-.38*t+.055*sin(a)))
    pts.append((-.72,-.24+i*.24,1.24));tube('Tractor | coiled air and electrical line',pts,.012,m,tractor)
box('Cab | rear utility panel',(-2.19,0,1.78),(.05,.65,.5),black,.025,tractor)
for y in [-.24,0,.24]:cyl('Cab | line connector',(-2.145,y,1.86),.025,.044,chrome,'X',12,tractor)

# Original minimal door wordmarks built as geometry, so no external image textures.
def label(name,text,location,size,material,rotation,parent):
    c=bpy.data.curves.new(name,'FONT');c.body=text;c.size=size;c.extrude=.001;c.resolution_u=4
    c.align_x='CENTER';c.align_y='CENTER'
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.location=location;o.rotation_euler=rotation
    finish(o,name,material,parent);return o
for side in [-1,1]:
    # local text X maps along the vehicle, local Y vertical; fronts point outboard.
    rot=(pi/2,0,0) if side<0 else (pi/2,0,pi)
    label('Livery | AVS door wordmark','AVS',(-4.41,side*1.178,1.86),.235,white,rot,tractor)
    label('Livery | descriptor','F R E I G H T',(-4.41,side*1.181,1.667),.052,white,rot,tractor)

print('TRACTOR BUILT',len(tractor.children_recursive),'components')
