# AVS Freight — original modular truck

Created 5 September 2026 through the connected Blender MCP. The vehicle is an original,
reference-informed North American aerodynamic sleeper tractor and 53-foot combination
flatbed. It is a detailed real-time visualization, not an OEM replica or engineering CAD.
Dimensions, visible construction references and inspected source images are catalogued
in [references/REFERENCES.md](references/REFERENCES.md).

## Deliverables

- `avs-freight.blend`: editable source components plus a separate consolidated web scene;
  a lit studio and full-rig, tractor-detail and trailer-rear cameras are included.
- `../../models/avs-freight.glb`: compressed glTF 2.0 for the website, with original PBR
  materials and six named assemblies. No texture downloads or paid asset dependencies.
- `../../models/avs-freight-poster.png`: full-resolution studio still; the JPEG companion
  is a compact fallback for the browser. `avs-tractor-detail.png` is the close-up.
- `../../concepts/freight-3d/`: local working scroll demonstration and browser verification.

All scene measurements are metres. Blender X runs along the vehicle, with the nose at
negative X; Y is width and Z is up. Standard glTF export maps this to Three.js X/Y/-Z.
The trailer deck is 16.1544 × 2.5908 m; its surface is Z=1.55 m. The tractor's body and
trim are proportion studies, not measured reproductions of any specific truck.

## Model structure

`Tractor`, `Trailer`, `Cargo_Steel`, `Cargo_Precast`, `Cargo_Wire` and `Cargo_Machinery`
retain independent parent nodes. Cargo carries its own supports and straps so switching
loads cannot leave their fittings behind. Source scene parents carry `_SOURCE` suffixes;
their individual components remain editable. The original startup scene is retained too.

Included details: modeled wheel/tire profiles and tread, lug and vent patterns, separate
glass and trim, windshield wipers, mirrors, access steps, hatch seals, shaped fender crowns,
slatted grille, headlights and marker lights, tanks, fifth wheel, coiled air/electrical
lines, chassis, suspension, tapered trailer beams, floor grooves, timber nailing strips,
stake pockets, rub rails, winches, toolboxes, raised landing gear, reflective markings,
rear lamps and underride protection. Cargo includes open-bore pipe, I-beam sections,
precast barriers, wire mesh/rebar and a pump skid with a ventilated wooden crate.

Hardware edge bevels use one segment at small scale; larger automotive contours retain
three. The resulting scene has 45 mesh batches, 26 materials and 212,916 triangles across
all variants; at most 189,412 triangles are visible at a settled chapter before shadows.
Transition frames can briefly contain two cargo variants. Actual file size and checks
live in `model-report.json`. Modern desktop/mobile browser layouts were tested; this is
not a benchmark on every physical phone or low-power GPU.

## Rebuild

Run `build_all.py` inside a fresh Blender file using Blender MCP, then run
`sh assets/model-source/compress-model.sh` from the worktree. The scripts use Blender's
own Python and original procedural geometry. `build_truck.py` sets the output root near
its top; update that one path if moving the source folder.

Compression uses glTF Transform 4.2.1 and the local Three.js MeshoptDecoder. The raw GLB
is retained locally but ignored by Git. Verification requires named materials, assigned
primitive materials, all six groups and a sub-3 MB web file. A separate Blender process
running `check_saved_model.py` verifies the .blend survives save/reopen with its materials.

For a different poster, select a saved camera and the desired cargo group's children,
set their render visibility, then render. Studio objects are excluded from the GLB;
the website supplies its own lighting and camera poses.

## Implementation findings

- Blender MCP execution namespaces are not persistent. Build modules share an explicit
  namespace stored in `bpy.app.driver_namespace` during this session.
- Thousands of `bpy.ops` primitive additions repeatedly update the dependency graph.
  Direct mesh datablock creation in `fast_geometry.py` reduces that work substantially.
- Material references from evaluated meshes are temporary IDs. They can export correctly
  in memory and disappear after a .blend reload. `prepare_export.py` explicitly binds
  original material datablocks before save/export; the round-trip check protects this.
- A temporary all-white compression/render was rejected. Final verification checks
  materials and appearance, not just whether a GLB decoder returns a scene.
- Reference photographs are for local modeling inspection and are not shipped as website
  photos or textures. Their binaries are ignored by Git; provenance links remain tracked.

The model demonstrates freight visually. It does not prescribe securement engineering,
identify an owned AVS fleet, or show every equipment mode in the broader service list.
