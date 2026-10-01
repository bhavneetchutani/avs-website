"""53 ft × 102 in combo flatbed, reference-informed Fontaine Infinity construction.
Executed after build_truck.py in the same Blender namespace through MCP.
"""
trailer=empty('Trailer',rig)
L=16.1544; W=2.5908; DECK=1.55

# Main I-beam webs: a shallow gooseneck over the tractor, deep belly amidships.
for y in [-.51,.51]:
    profile=[(0,y,1.455),(L,y,1.455),(L,y,.91),(5,y,.91),(2.6,y,1.02),(1.8,y,1.26),(0,y,1.29)]
    panel('Trailer | tapered steel main beam',profile,black,trailer,.022,0)
    box('Trailer | main beam upper flange',(L/2,y,1.427),(L,.17,.035),black,.006,trailer)
    tube('Trailer | main beam bottom flange',[(0,y,1.29),(1.8,y,1.26),(2.6,y,1.02),(5,y,.91),(L,y,.91)],.052,black,trailer)
# Reference combination construction has 12-inch crossmember spacing.
for i in range(53):
    x=.15+i*.3048
    box('Trailer | aluminum crossmember',(x,0,1.373),(.034,W-.10,.135),alloy,.003,trailer)

# Extruded deck: silver channels with four timber nail strips.
box('Trailer | floor plate',(L/2,0,1.501),(L,W-.08,.074),alloy,.012,trailer)
for y in [-1.10,-.55,.55,1.10]:
    box('Trailer | inset apitong nailing strip',(L/2,y,1.544),(L-.035,.115,.012),wood,.003,trailer)
for i in range(33):
    y=-1.225+i*.0762
    if min(abs(y-v) for v in [-1.10,-.55,.55,1.10])>.075:
        box('Trailer | extruded floor groove',(L/2,y,1.549),(L-.035,.007,.002),steel,0,trailer)

for side in [-1,1]:
    y=side*W/2
    box('Trailer | outer structural rail',(L/2,y,1.43),(L,.071,.224),alloy,.012,trailer)
    box('Trailer | continuous rub rail',(L/2,y+side*.073,1.43),(L,.049,.065),chrome,.009,trailer)
    # Stake pockets are three actual walls with open centres.
    for i in range(27):
        x=.20+i*.60
        for xx in [x-.045,x+.045]:box('Trailer | stake pocket cheek',(xx,y+side*.041,1.42),(.018,.13,.165),alloy,.004,trailer)
        box('Trailer | stake pocket outer lip',(x,y+side*.102,1.42),(.11,.015,.165),alloy,.003,trailer)
    # Continuous inset conspicuity band with alternating reflective panels.
    box('Trailer | reflective tape backing',(L/2,y+side*.041,1.47),(L-.10,.005,.047),white,0,trailer)
    for i in range(31):box('Trailer | red reflective interval',(.23+i*.516,y+side*.046,1.47),(.258,.007,.045),red,0,trailer)
    for x in [.12,5.35,10.68,L-.12]:
        box('Trailer | side marker rubber socket',(x,y+side*.047,1.385),(.13,.014,.066),black,.019,trailer)
        box('Trailer | side marker lens',(x,y+side*.059,1.385),(.087,.018,.039),red if x>L-1 else amber,.012,trailer)
    # Winch track and visible slotted spools, reference left-side primary fitment.
    box('Trailer | sliding winch channel',(8.30,side*1.16,1.258),(14.3,.07,.08),steel,.005,trailer)
    for x in [2.15,3.65,5.15,6.65,8.15,9.65,11.15,12.65,14.15]:
        for xx in [x-.055,x+.055]:box('Trailer | winch cheeks',(xx,side*1.15,1.15),(.023,.19,.18),steel,.01,trailer)
        cyl('Trailer | strap winch drum',(x,side*1.15,1.15),.066,.15,black,'X',16,trailer)
        cyl('Trailer | winch ratchet',(x-.087,side*1.15,1.15),.084,.022,alloy,'X',12,trailer)
        for j in range(4):
            a=j*pi/2;cyl('Trailer | winch ratchet hole',(x-.10,side*1.15+.055*cos(a),1.15+.055*sin(a)),.013,.005,black,'X',8,trailer)
    # Belly toolboxes, framed lids and paddle catches.
    x=6.42
    box('Trailer | aluminum belly toolbox',(x,side*.995,.99),(1.62,.52,.51),alloy,.026,trailer)
    box('Trailer | toolbox lid',(x,side*1.264,.99),(1.52,.025,.41),chrome,.019,trailer)
    for xx in [x-.50,x+.50]:
        box('Trailer | toolbox paddle latch',(xx,side*1.281,1.07),(.1,.013,.06),black,.011,trailer)
        box('Trailer | latch tab',(xx,side*1.29,1.07),(.065,.012,.032),chrome,.008,trailer)
    for j in range(12):
        xx=x-.69+j*.125
        cyl('Trailer | toolbox lid rivet',(xx,side*1.282,1.16),.008,.01,steel,'Y',8,trailer)

# Landing legs retracted for a coupled moving truck. Bracing and crank are modeled.
for y in [-.88,.88]:
    box('Trailer | landing gear upper leg',(3.05,y,1.01),(.16,.18,.70),black,.012,trailer)
    box('Trailer | landing gear telescopic leg',(3.05,y,.58),(.122,.14,.25),steel,.008,trailer)
    box('Trailer | landing gear shoe',(3.05,y,.45),(.34,.30,.055),steel,.012,trailer)
    beam('Trailer | landing gear diagonal',(3.10,y,.83),(4.26,y,1.365),.055,black,trailer)
    beam('Trailer | landing gear cross brace',(3.05,y,.63),(3.05,-y,1.35),.033,steel,trailer)
cyl('Trailer | landing gear drive shaft',(3.05,0,1.03),.024,1.91,steel,'Y',16,trailer)
tube('Trailer | landing gear crank',[(3.05,-1.03,1.06),(3.05,-1.14,1.06),(3.31,-1.14,.88),(3.31,-1.27,.88)],.015,chrome,trailer)

# Spread tandem, 122-inch separation, dual LP22.5 tyre arrangement.
for x in [11.66,14.7588]:
    cyl('Trailer | axle tube',(x,0,.535),.091,2.06,black,'Y',24,trailer)
    for y in [-.98,-.685,.685,.98]:wheel(x,y,.535,trailer)
    for side in [-1,1]:
        y=side*.64
        box('Trailer | suspension hanger',(x-.52,y,1.13),(.18,.16,.45),steel,.016,trailer)
        beam('Trailer | suspension trailing arm',(x-.52,y,.87),(x+.31,y,.61),.103,black,trailer)
        cyl('Trailer | air spring bellows',(x+.34,y,.93),.137,.28,rubber,parent=trailer)
        for z in [.79,1.07]:cyl('Trailer | air spring plate',(x+.34,y,z),.146,.029,steel,parent=trailer)
        beam('Trailer | diagonal shock',(x-.29,y,1.19),(x+.02,y,.61),.047,alloy,trailer)
        cyl('Trailer | brake chamber',(x+.16,side*.38,.59),.10,.20,black,'X',20,trailer)
    cyl('Trailer | compressed air reservoir',(x-.61,0,1.12),.12,.64,steel,'Y',24,trailer)
    tube('Trailer | brake air line',[(x-.65,0,1.1),(x,0,.69),(x,.33,.59)],.01,black,trailer)

# Front headboard is deliberately low to leave freight visible and not mask the cab.
box('Trailer | front header',(0,0,1.45),(.10,W,.25),alloy,.012,trailer)
for y in [-.95,-.65,0,.65,.95]:
    box('Trailer | front reflector',(-.057,y,1.45),(.012,.12,.045),white,.006,trailer)
cyl('Trailer | kingpin',(.762,0,1.259),.037,.12,steel,parent=trailer)

# Tail: six large circular lamps, central clearance triplet, license plate pocket.
box('Trailer | rear crossmember',(L-.045,0,1.26),(.14,W,.48),alloy,.025,trailer)
for side in [-1,1]:
    for yy in [.65,.875,1.10]:
        cyl('Trailer | rear lamp bezel',(L+.034,side*yy,1.27),.092,.024,black,'X',28,trailer)
        cyl('Trailer | circular tail lens',(L+.052,side*yy,1.27),.073,.026,red,'X',28,trailer)
        for j in range(8):
            a=2*pi*j/8
            cyl('Trailer | tail lamp LED',(L+.068,side*yy+.041*cos(a),1.27+.041*sin(a)),.009,.004,red,'X',8,trailer)
    for yy in [.17,.27,.37]:cyl('Trailer | central clearance marker',(L+.056,side*yy,1.415),.024,.023,red,'X',16,trailer)
    box('Trailer | rear mudflap',(15.40,side*.985,.62),(.035,.63,.86),rubber,.008,trailer)
    box('Trailer | mudflap retainer',(15.425,side*.985,1.022),(.045,.65,.039),chrome,.005,trailer)
    beam('Trailer | underride vertical',(L-.08,side*.83,1.13),(L-.08,side*.83,.52),.115,alloy,trailer)
box('Trailer | rear underride bar',(L-.07,0,.49),(.115,2.39,.11),alloy,.015,trailer)
for side in [-1,1]:box('Trailer | underride reflector',(L-.003,side*.74,.493),(.009,.84,.049),red,.003,trailer)
box('Trailer | plate bracket',(L+.034,0,1.19),(.032,.31,.17),black,.008,trailer)
box('Trailer | neutral registration plate',(L+.055,0,1.19),(.006,.276,.137),white,.003,trailer)
for y in [-.12,.12]:cyl('Trailer | plate screw',(L+.062,y,1.24),.006,.003,chrome,'X',8,trailer)

# Load securing anchor rings set flush to the deck at realistic intervals.
for side in [-1,1]:
    for i in range(9):
        x=.5+i*1.86
        torus('Trailer | recessed anchor eye',(x,side*.965,1.543),.036,.008,black,'Z',trailer,16,6)

print('TRAILER BUILT',len(trailer.children_recursive),'components')
