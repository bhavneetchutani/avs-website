"""Direct-data primitives avoid Blender operator/dependency-graph churn.
The public helper signatures match build_truck.py for reproducible modular builds.
"""
def box(name,loc,size,material,bevel=0,parent=None):
    sx,sy,sz=[v/2 for v in size]
    vs=[(-sx,-sy,-sz),(-sx,-sy,sz),(-sx,sy,-sz),(-sx,sy,sz),
        (sx,-sy,-sz),(sx,-sy,sz),(sx,sy,-sz),(sx,sy,sz)]
    fs=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    o=mesh(name,vs,fs,material,parent);o.location=loc
    if bevel:
        b=o.modifiers.new('Manufactured edge radii','BEVEL');b.width=bevel;b.segments=3
        n=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=45
    return o

def cyl(name,loc,radius,depth,material,axis='Z',vertices=24,parent=None):
    vs=[(radius*cos(2*pi*i/vertices),radius*sin(2*pi*i/vertices),z) for z in [-depth/2,depth/2] for i in range(vertices)]
    fs=[tuple(reversed(range(vertices))),tuple(range(vertices,vertices*2))]
    fs += [(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    o=mesh(name,vs,fs,material,parent);o.location=loc
    if axis=='X':o.rotation_euler[1]=pi/2
    if axis=='Y':o.rotation_euler[0]=pi/2
    for p in o.data.polygons:p.use_smooth=p.index>1
    return o

def torus(name,loc,major,minor,material,axis='Z',parent=None,segments=32,sides=8):
    vs=[];fs=[]
    for i in range(segments):
        a=2*pi*i/segments
        for j in range(sides):
            b=2*pi*j/sides;r=major+minor*cos(b)
            vs.append((r*cos(a),r*sin(a),minor*sin(b)))
    for i in range(segments):
        for j in range(sides):fs.append((i*sides+j,((i+1)%segments)*sides+j,((i+1)%segments)*sides+(j+1)%sides,i*sides+(j+1)%sides))
    o=mesh(name,vs,fs,material,parent);o.location=loc
    if axis=='X':o.rotation_euler[1]=pi/2
    if axis=='Y':o.rotation_euler[0]=pi/2
    for p in o.data.polygons:p.use_smooth=True
    return o
