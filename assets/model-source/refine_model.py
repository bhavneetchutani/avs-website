"""Final silhouette pass: softly crowned fenders, body normals and hardware LOD.
Original source remains separately editable in the source scene.
"""
for o in tractor.children_recursive:
    if any(o.name.startswith(n) for n in ['Cab | main sculpted shell','Hood | central aerodynamic crown','Nose | formed bumper']):
        for p in o.data.polygons:p.use_smooth=True
# Place the windshield outside the curved front shell, with a continuous gasket.
# The initial planar glazing intersected the intermediate hood-to-roof section.
windshield=[(-5.31,-.97,2.42),(-5.31,.97,2.42),(-4.65,.925,3.105),(-4.65,-.925,3.105)]
for o in tractor.children_recursive:
    if o.name.startswith('Cab | panoramic blue windscreen'):
        for vertex,co in zip(o.data.vertices,windshield):vertex.co=co
    elif o.name.startswith('Cab | windscreen gasket'):
        for vertex,(x,y,z) in zip(o.data.vertices,windshield):vertex.co=(x+.008,y*1.04,z)
    elif o.name.startswith('Cab | windscreen center mullion'):
        for point,co in zip(o.data.splines[0].points,[(-5.333,0,2.42),(-4.673,0,3.105)]):point.co=(*co,1)
    elif o.name.startswith('Cab | wiper'):
        # Rest the blades across the base of each windshield half.
        side=-1 if sum(p.co.y for p in o.data.splines[0].points)<0 else 1
        centre=side*.47
        xy=[(-5.29,centre-.18),(-5.23,centre-.10),(-5.19,centre+.17)] if 'arm' in o.name else [(-5.255,centre-.29),(-5.165,centre+.32)]
        for point,(x,y) in zip(o.data.splines[0].points,xy):
            point.co=(x,y,2.42+(x+5.31)*(3.105-2.42)/.66+.027,1)
# A grille surround must be a ring. A filled backing plate would cover the
# radiator/slats after its Solidify modifier extends forward.
for o in tractor.children_recursive:
    if o.name.startswith('Nose | grille chrome frame'):
        vs=[(-7.46,-.66,.83),(-7.46,.66,.83),(-7.38,.61,1.663),(-7.38,-.61,1.663),
            (-7.453,-.598,.90),(-7.453,.598,.90),(-7.387,.55,1.598),(-7.387,-.55,1.598)]
        o.data.clear_geometry();o.data.from_pydata(vs,[],[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)]);o.data.update()
        for modifier in o.modifiers:
            if modifier.type=='BEVEL':modifier.width=.018
if not any(o.name.startswith('Hood | compound fender crown') for o in tractor.children_recursive):
    for side in [-1,1]:
        verts=[];faces=[];N=40
        # Four softly rolling sections across the wheel arch create a compound
        # shoulder instead of a flat cutout. Outer section flows into the hood.
        for radius,y in [(.672,1.225),(.727,1.302),(.84,1.265),(.995,1.14)]:
            for i in range(N+1):
                a=pi*i/N
                verts.append((-6.08+radius*cos(a),side*y,.535+radius*sin(a)))
        for j in range(3):
            for i in range(N):
                f=(j*(N+1)+i,j*(N+1)+i+1,(j+1)*(N+1)+i+1,(j+1)*(N+1)+i)
                faces.append(f if side<0 else tuple(reversed(f)))
        o=mesh('Hood | compound fender crown',verts,faces,paint,tractor)
        for p in o.data.polygons:p.use_smooth=True
rubber.diffuse_color=(.010,.012,.016,1)
rubber.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rubber.diffuse_color
rubberSide.diffuse_color=(.014,.017,.021,1)
rubberSide.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rubberSide.diffuse_color
print('Refined fender crown and body normals')
