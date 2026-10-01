"""AVS scroll demonstrator: four original, independently switchable freight loads.

Execute after build_truck.py has defined mat/box/cyl/torus/mesh/tube/empty.
All dimensions are metres, X follows the 53-foot trailer, Z is up. The deck is
z=1.55 and the four cargo parents deliberately share the world origin. A parent
can be hidden or moved without disturbing the tractor/trailer or another load.

Reference-led visual approximations, not an engineered shipment/loading plan:
- Oldcastle's 2013 barrier section: 32 in height / 25.5 in base / 6 in crest.
  https://oldcastleinfrastructure.com/wp-content/uploads/2018/11/AZ_CHD_12x2x2_Barrier_119071-1.pdf
- Grundfos end-suction arrangement: axial inlet, top outlet, coupled motor,
  bearing bracket and a common structural baseplate.
  https://www.grundfos.com/au/learn/ecademy/all-courses/grundfos-end-suction-pumps/introduction-to-end-suction-pumps
- National Wire industrial mesh and pencil rod photographs: stacked dark grids,
  flattened rod bundles, deformed surfaces and bright metal cut ends.
  https://nationalwirellc.com/products/
Pipe walls, I-beam webs, beam flanges, dunnage, castings, cooling fins and exposed
fasteners are modeled as geometry. Reinforcing-bar ribs are sampled on visible
surface bars; a full helical deformation on every bar would waste web geometry.
Materials and crate proportions are art directed rather than a branded replica.
The mesh-sheet pitch and steel sections are illustrative commercial stock.
No textures, external assets, text fonts, simulations or added Python packages.
"""

import math


def cargo_extrude_x(name, x0, x1, yz, material, parent):
    n = len(yz)
    vertices = [(x, y, z) for x in (x0, x1) for y, z in yz]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    return mesh(name, vertices, faces, material, parent=parent)


def cargo_hollow_pipe(name, x0, x1, y, z, outer, wall, material, parent, sides=24):
    """Open through-bore with annular cut faces, never black end-cap disks."""
    vertices = []
    for x, radius in ((x0, outer), (x1, outer),
                      (x0, outer-wall), (x1, outer-wall)):
        vertices.extend((x, y+radius*math.cos(i*math.tau/sides),
                         z+radius*math.sin(i*math.tau/sides))
                        for i in range(sides))
    faces = []
    for i in range(sides):
        j = (i+1) % sides
        faces += [(i, j, sides+j, sides+i),
                  (2*sides+i, 3*sides+i, 3*sides+j, 2*sides+j),
                  (i, 2*sides+i, 2*sides+j, j),
                  (sides+i, sides+j, 3*sides+j, 3*sides+i)]
    ob = mesh(name, vertices, faces, material, parent=parent)
    # Smooth bore/outside while leaving the sawn annular end faces sharp.
    for polygon in ob.data.polygons:
        polygon.use_smooth = polygon.index % 4 < 2
    return ob


def cargo_band(name, x, path, width, material, parent):
    """A flat webbing ribbon across a measured Y/Z profile."""
    vs = [(x+side*width/2, y, z) for y, z in path for side in (-1, 1)]
    fs = [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(len(path)-1)]
    return mesh(name, vs, fs, material, parent=parent)


def cargo_cross_dunnage(parent, xs, length=2.16, y=0, z=1.605):
    for index, x in enumerate(xs):
        box('Dunnage %s %02d' % (parent.name, index), (x, y, z),
            (.145, length, .11), cargo_timber, bevel=.008, parent=parent)


def cargo_bolts_x(name, x, y, z, pitch, count, parent, material):
    for i in range(count):
        angle = math.tau*i/count
        cyl(name, (x, y+pitch*math.cos(angle), z+pitch*math.sin(angle)),
            .021, .027, material, axis='X', vertices=6, parent=parent)


cargo_timber = mat('Cargo | rough-sawn hardwood', (.31, .19, .085, 1), rough=.78)
cargo_wood_light = mat('Cargo | pine crate slats', (.57, .38, .18, 1), rough=.7)
cargo_wood_dark = mat('Cargo | crate endgrain', (.34, .22, .10, 1), rough=.84)
cargo_steel = mat('Cargo | mill steel', (.18, .23, .26, 1), metal=.82, rough=.39)
cargo_galvanized = mat('Cargo | zinc silver', (.43, .49, .51, 1), metal=.86, rough=.33)
cargo_rebar = mat('Cargo | warm mill-scale rebar', (.19, .155, .125, 1), metal=.63, rough=.62)
cargo_concrete = mat('Cargo | warm cast concrete', (.57, .565, .52, 1), rough=.9)
cargo_concrete_dark = mat('Cargo | recessed concrete', (.31, .325, .30, 1), rough=.92)
cargo_webbing = mat('Cargo | ochre webbing', (.7, .30, .065, 1), rough=.8)
cargo_pump = mat('Cargo | pump petrol enamel', (.065, .22, .24, 1), metal=.36, rough=.29)
cargo_guard = mat('Cargo | guard signal ochre', (.79, .40, .055, 1), metal=.25, rough=.36)
cargo_dark = mat('Cargo | machinery graphite', (.045, .058, .065, 1), metal=.55, rough=.4)

# ── 01. Structural stock: real hollow sections and real I cross-sections. ──
steel_parent = empty('Cargo_Steel')
cargo_cross_dunnage(steel_parent, (1.9, 5.45, 9.0, 13.1))
pipe_rows = [(-.815, -.450, -.085, .280), (-.6325, -.2675, .0975), (-.450, -.085)]
for row, ys in enumerate(pipe_rows):
    for col, y in enumerate(ys):
        z = 1.835 + row*.316
        cargo_hollow_pipe('Pipe %d.%d | open bore' % (row, col),
                          1.15, 14.65, y, z, .175, .014, cargo_steel, steel_parent)
        # Brighter cut rims make the thickness readable from an oblique view.
        for end in (1.151, 14.649):
            torus('Pipe sawn rim', (end, y, z), .169, .004,
                  cargo_galvanized, axis='X', parent=steel_parent,
                  segments=24, sides=4)

for row in range(3):
    for y in (.67, 1.045):
        z = 1.665+row*.296
        w, h, flange, web = .315, .28, .023, .016
        yz = [(y-w/2,z), (y+w/2,z), (y+w/2,z+flange),
              (y+web/2,z+flange), (y+web/2,z+h-flange),
              (y+w/2,z+h-flange), (y+w/2,z+h), (y-w/2,z+h),
              (y-w/2,z+h-flange), (y-web/2,z+h-flange),
              (y-web/2,z+flange), (y-w/2,z+flange)]
        cargo_extrude_x('Rolled I-beam %d' % row, 1.18, 14.58, yz,
                        cargo_steel, steel_parent)
    if row < 2:
        for x in (2.5, 7.8, 13.5):
            box('Beam layer separator', (x,.86,z+.288), (.12,.76,.016),
                cargo_timber, parent=steel_parent)

for x in (1.95, 5.45, 9.0, 13.05):
    cargo_band('Steel load webbing', x,
               [(-1.275,1.50),(-1.03,1.85),(-.635,2.65),
                (.10,2.65),(.40,2.48),(1.215,2.55),(1.275,1.50)],
               .09, cargo_webbing, steel_parent)
    box('Steel ratchet body', (x,-1.268,1.76), (.135,.055,.18),
        cargo_galvanized, bevel=.01, parent=steel_parent)
    cyl('Steel ratchet spindle', (x,-1.30,1.77), .034,.12,
        cargo_dark,axis='X',vertices=12,parent=steel_parent)

# ── 02. Precast civil material: compound slope, crest and lifting hardware. ──
precast_parent = empty('Cargo_Precast')
for centre_x in (2.95, 6.75, 10.7):
    cargo_cross_dunnage(precast_parent, (centre_x-1.2, centre_x+1.2))
    for y in (-.77, 0, .77):
        z=1.66
        # Jersey-family section, 813 mm high. Broad foot / steep upper face.
        profile=[(y-.324,z), (y+.324,z), (y+.324,z+.075),
                 (y+.15,z+.33), (y+.076,z+.79), (y+.061,z+.813),
                 (y-.061,z+.813), (y-.076,z+.79), (y-.15,z+.33),
                 (y-.324,z+.075)]
        cargo_extrude_x('Precast barrier | shaped casting', centre_x-1.82,
                        centre_x+1.82, profile, cargo_concrete, precast_parent)
        for x in (centre_x-1.05,centre_x+1.05):
            # Shallow lifting recess with a folded steel loop, not a black bore.
            box('Barrier lifting pocket', (x,y,z+.814), (.15,.10,.004),
                cargo_concrete_dark, parent=precast_parent)
            tube('Barrier lifting loop', [(x-.052,y,z+.811),
                 (x-.046,y,z+.877),(x,y,z+.90),(x+.046,y,z+.877),
                 (x+.052,y,z+.811)], .011, cargo_galvanized,parent=precast_parent)
        for side in (-1,1):
            x=centre_x+side*1.822
            # Connection plate, inset face patch and a small end loop.
            box('Barrier end recess', (x,y,z+.43), (.005,.13,.22),
                cargo_concrete_dark,parent=precast_parent)
            tube('Barrier end connector',[(x,y-.037,z+.43),
                 (x+side*.075,y-.037,z+.43),(x+side*.095,y,z+.46),
                 (x+side*.075,y+.037,z+.49),(x,y+.037,z+.49)],
                 .011,cargo_steel,parent=precast_parent)
    for x in (centre_x-.95,centre_x+.95):
        cargo_band('Precast webbing',x,[(-1.28,1.5),(-1.10,1.78),
             (-.846,2.49),(.846,2.49),(1.10,1.78),(1.28,1.5)],
             .085,cargo_webbing,precast_parent)

for x in (13.45,14.15):
    for y in (-.48,.48):
        box('Precast utility block', (x,y,2.02), (.62,.82,.72),
            cargo_concrete,bevel=.035,parent=precast_parent)
        box('Block cast seam', (x,y-.412,2.02), (.51,.003,.012),
            cargo_concrete_dark,parent=precast_parent)
        torus('Block lifting eye', (x,y,2.40),.05,.012,
              cargo_galvanized,axis='Y',parent=precast_parent,segments=12,sides=4)

# ── 03. Wire reinforcement: packed round bar plus open welded-wire sheets. ──
wire_parent = empty('Cargo_Wire')
cargo_cross_dunnage(wire_parent,(1.9,4.6,7.3,8.8,11.2,13.8))
for centre_y in (-.57,.57):
    for row in range(7):
        count=11 if row < 4 else 11-(row-3)*2
        for col in range(count):
            y=centre_y+(col-(count-1)/2)*.052
            z=1.690+row*.045
            cyl('Rebar | bundled round stock', (4.63,y,z), .0245,6.82,
                cargo_rebar,axis='X',vertices=8,parent=wire_parent)
            for end in (1.218,8.042):
                cyl('Rebar | freshly cut end',(end,y,z),.0245,.004,
                    cargo_galvanized,axis='X',vertices=8,parent=wire_parent)
            # Ribs only on the exposed ridge, sampled rather than fully threaded.
            if row == 6 or (row==4 and col in (0,count-1)):
                for i in range(23):
                    torus('Rebar exposed deformation', (1.30+i*.30,y,z),
                          .0255,.004,cargo_rebar,axis='X',parent=wire_parent,
                          segments=8,sides=3)
    for x in (1.8,4.6,7.4):
        cargo_band('Rebar bundle band',x,
             [(centre_y-.29,1.675),(centre_y-.29,1.88),
              (centre_y-.13,1.99),(centre_y+.13,1.99),
              (centre_y+.29,1.88),(centre_y+.29,1.675)],
             .032,cargo_galvanized,wire_parent)

for layer in range(8):
    z=1.669+layer*.04
    for iy in range(11):
        cyl('Mesh sheet longitudinal wire', (11.39,-1.01+iy*.202,z),
            .009,5.85,cargo_steel,axis='X',vertices=6,parent=wire_parent)
    for ix in range(29):
        cyl('Mesh sheet transverse wire', (8.51+ix*.206,0,z+.012),
            .009,2.06,cargo_steel,axis='Y',vertices=6,parent=wire_parent)
for x in (9.1,13.65):
    cargo_band('Mesh stack band',x,[(-1.28,1.5),(-1.065,1.69),
              (-1.065,1.984),(1.065,1.984),(1.065,1.69),(1.28,1.5)],
              .065,cargo_webbing,wire_parent)

# ── 04. Industrial equipment: two transport skids and one ventilated crate. ──
machinery_parent = empty('Cargo_Machinery')


def cargo_pump_skid(xc):
    parent=machinery_parent
    # Two channel runners, transverse frame, drip pan and raised machined pads.
    for y in (-.65,.65):
        for z in (1.72,1.90):
            box('Pump skid channel flange',(xc,y,z),(3.55,.19,.035),
                cargo_dark,bevel=.008,parent=parent)
        box('Pump skid channel web',(xc,y,1.81),(3.55,.035,.16),
            cargo_dark,parent=parent)
    for x in (xc-1.55,xc,xc+1.55):
        box('Pump skid cross member',(x,0,1.79),(.14,1.5,.17),
            cargo_dark,bevel=.015,parent=parent)
    box('Pump base pan',(xc,0,1.93),(3.30,1.30,.045),cargo_pump,
        bevel=.015,parent=parent)
    for x in (xc-1.25,xc+.35,xc+1.3):
        for y in (-.4,.4):
            box('Pump mounting pad',(x,y,2.04),(.33,.25,.18),
                cargo_pump,bevel=.012,parent=parent)
            cyl('Skid mounting bolt',(x,y,2.145),.033,.035,
                cargo_galvanized,vertices=6,parent=parent)
    # TEFC motor has a longitudinal body, cooling fins, a fan cowl and feet.
    motor_x=xc+.75
    cyl('TEFC motor housing',(motor_x,0,2.49),.375,1.19,
        cargo_dark,axis='X',vertices=32,parent=parent)
    for i in range(18):
        a=math.tau*i/18
        ob=box('Motor longitudinal cooling fin',
            (motor_x,.392*math.cos(a),2.49+.392*math.sin(a)),
            (1.10,.055,.018),cargo_dark,bevel=.004,parent=parent)
        ob.rotation_euler[0]=a
    cyl('Motor fan cowl',(xc+1.43,0,2.49),.386,.23,
        cargo_pump,axis='X',vertices=32,parent=parent)
    cyl('Motor fan end plate',(xc+1.551,0,2.49),.345,.012,
        cargo_dark,axis='X',vertices=24,parent=parent)
    for rr in (.15,.24,.315):
        torus('Motor fan grille ring',(xc+1.56,0,2.49),rr,.011,
            cargo_galvanized,axis='X',parent=parent,segments=24,sides=4)
    for i in range(6):
        a=math.tau*i/6
        tube('Motor fan grille spoke',[(xc+1.56,0,2.49),
             (xc+1.56,.325*math.cos(a),2.49+.325*math.sin(a))],
             .008,cargo_galvanized,parent=parent)
    box('Motor terminal enclosure',(motor_x,-.035,2.91),(.41,.39,.18),
        cargo_pump,bevel=.025,parent=parent)
    for x in (motor_x-.15,motor_x+.15):
        cyl('Terminal-box screw',(x,-.14,3.007),.013,.009,
            cargo_galvanized,vertices=6,parent=parent)
    # Coupling inside a split guard, a bearing pedestal and a cast volute.
    cyl('Pump coupling guard',(xc-.10,0,2.49),.24,.48,
        cargo_guard,axis='X',vertices=20,parent=parent)
    for dx in (-.16,0,.16):
        torus('Guard pressed rib',(xc-.10+dx,0,2.49),.245,.012,
            cargo_guard,axis='X',parent=parent,segments=20,sides=4)
    box('Pump bearing pedestal',(xc-.47,0,2.21),(.32,.41,.49),
        cargo_pump,bevel=.035,parent=parent)
    cyl('Pump bearing bracket',(xc-.48,0,2.49),.19,.40,
        cargo_pump,axis='X',vertices=24,parent=parent)
    cyl('Pump volute casing',(xc-.95,0,2.48),.47,.45,
        cargo_pump,axis='X',vertices=32,parent=parent)
    cyl('Volute removable cover',(xc-1.19,0,2.48),.408,.045,
        cargo_pump,axis='X',vertices=32,parent=parent)
    cargo_bolts_x('Volute cover bolt',xc-1.224,0,2.48,.357,10,
                  parent,cargo_galvanized)
    # Open suction throat and top discharge both have flange rings and bolts.
    cargo_hollow_pipe('Pump axial inlet',xc-1.63,xc-1.22,0,2.48,
                      .17,.027,cargo_pump,parent,24)
    torus('Inlet machined flange',(xc-1.64,0,2.48),.195,.032,
          cargo_galvanized,axis='X',parent=parent,segments=24,sides=6)
    cargo_bolts_x('Inlet flange bolt',xc-1.679,0,2.48,.207,8,
                  parent,cargo_galvanized)
    cyl('Pump top discharge neck',(xc-.91,.12,3.015),.125,.40,
        cargo_pump,vertices=24,parent=parent)
    torus('Discharge flange',(xc-.91,.12,3.22),.159,.033,
          cargo_galvanized,parent=parent,segments=24,sides=6)
    cyl('Discharge shipping cap',(xc-.91,.12,3.216),.128,.015,
        cargo_dark,vertices=24,parent=parent)
    for i in range(6):
        a=math.tau*i/6
        cyl('Discharge flange bolt',(xc-.91+.16*math.cos(a),
            .12+.16*math.sin(a),3.26),.019,.03,cargo_galvanized,
            vertices=6,parent=parent)
    for y in (-.56,.56):
        torus('Skid lifting eye',(xc-.95,y,2.02),.065,.017,
              cargo_pump,axis='Y',parent=parent,segments=16,sides=5)


cargo_pump_skid(3.25)
cargo_pump_skid(7.40)

# Crate construction remains open between planks; there is no opaque cube core.
crate_x, crate_l, crate_w = 12.14, 3.52, 2.10
for y in (-.79,0,.79):
    box('Crate pallet runner',(crate_x,y,1.67),(crate_l,.16,.24),
        cargo_wood_dark,bevel=.01,parent=machinery_parent)
for i in range(12):
    box('Crate pallet floor',(crate_x-crate_l/2+.15+i*.29,0,1.83),
        (.25,crate_w,.065),cargo_wood_light,bevel=.004,parent=machinery_parent)
for x in (crate_x-crate_l/2+.08,crate_x,crate_x+crate_l/2-.08):
    for y in (-crate_w/2+.055,crate_w/2-.055):
        box('Crate vertical framing',(x,y,2.70),(.12,.12,1.73),
            cargo_wood_dark,bevel=.009,parent=machinery_parent)
for z in (1.99,2.25,2.51,2.77,3.03,3.29,3.51):
    for y in (-crate_w/2,crate_w/2):
        box('Crate long side slat',(crate_x,y,z),(crate_l,.048,.20),
            cargo_wood_light,bevel=.005,parent=machinery_parent)
    for x in (crate_x-crate_l/2,crate_x+crate_l/2):
        box('Crate end slat',(x,0,z),(.048,crate_w,.20),
            cargo_wood_light,bevel=.005,parent=machinery_parent)
for i in range(12):
    box('Crate roof plank',(crate_x-crate_l/2+.15+i*.29,0,3.64),
        (.25,crate_w,.05),cargo_wood_light,bevel=.004,parent=machinery_parent)
for y in (-1.083,1.083):
    # Diagonal external braces create the recognisable industrial crating pattern.
    for side in (-1,1):
        brace=box('Crate diagonal brace',(crate_x+side*.86,y,2.72),
                  (2.2,.055,.095),cargo_wood_dark,bevel=.004,parent=machinery_parent)
        brace.rotation_euler[1]=side*.67
    for x in (crate_x-1.67,crate_x,crate_x+1.67):
        for z in (2.0,2.51,3.03,3.51):
            cyl('Crate fastener',(x,y,z),.010,.007,cargo_dark,
                axis='Y',vertices=6,parent=machinery_parent)
for x in (crate_x-1.04,crate_x+1.04):
    cargo_band('Crate steel binding',x,[(-1.28,1.51),(-1.09,1.91),
        (-1.09,3.68),(1.09,3.68),(1.09,1.91),(1.28,1.51)],
        .048,cargo_galvanized,machinery_parent)

CARGO_PARENTS = (steel_parent, precast_parent, wire_parent, machinery_parent)
# Single-segment edge breaks suit sawn/crated industrial freight. Keep the root
# truck's three-segment automotive finish untouched and spend those triangles on
# round pipes, motor cooling detail and actual open reinforcement grids instead.
for cargo_parent in CARGO_PARENTS:
    for cargo_object in cargo_parent.children:
        for modifier in cargo_object.modifiers:
            if modifier.type == 'BEVEL':
                modifier.segments = 1
print('Cargo variants built: ' + ', '.join(parent.name for parent in CARGO_PARENTS))
