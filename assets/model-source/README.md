# AVS Freight — modular truck for the website

The power unit is an adaptation of [1978 Peterbilt 359 Standard](https://sketchfab.com/3d-models/1978-peterbilt-359-standard-0599b3d7f9a5437fa905b20674d16d17)
by [hans1240](https://sketchfab.com/hans1240), downloaded through Sketchfab's official
download dialog on 5 September 2026 and licensed under CC BY 4.0. It replaces the
rejected procedural tractor. The approved 53-foot flatbed and four cargo assemblies
remain unchanged. See [the attribution and source record](vendor/peterbilt-359/LICENSE.md).

All painted tractor body panels use the website and logo's exact sRGB base color,
**#2196E8**, converted to linear RGB for Blender and glTF. There is no added AVS logo
or door lettering. Chrome, tires, glazing, lamps and other mechanical details retain
their own materials. Lighting and reflections naturally change the displayed shade.
This is a detailed real-time illustration of a classic Peterbilt, not engineering CAD
or a representation of an AVS-owned fleet.

## Deliverables

- `avs-freight.blend`: editable source components, the consolidated web scene, a lit
  studio, and full-rig, tractor-detail and trailer-rear cameras.
- `../../models/avs-freight.glb`: the compressed glTF 2.0 website model. All materials
  are included; it needs no remote texture downloads.
- `../../models/avs-freight-poster.png` and its smaller JPEG companion: the studio still
  and browser fallback. `../../models/avs-tractor-detail.png` is the close-up.
- `../../concepts/freight-3d/`: the scroll demonstration and browser verification.
- `vendor/peterbilt-359/original.glb`: the unmodified downloaded source, with its
  provenance, checksum and license beside it.

The model, creator, license and modifications are credited in the prototype footer.
Retain accessible attribution wherever the adapted tractor is published.

## Model structure

The runtime keeps six independent parent nodes: `Tractor`, `Trailer`, `Cargo_Steel`,
`Cargo_Precast`, `Cargo_Wire` and `Cargo_Machinery`. Cargo includes its own supports
and straps so chapter transitions switch those fittings with the load. Meshes are
consolidated by material while their source components remain editable.

The Blender file contains:

- `Peterbilt | imported source`: the adapted tractor under `Tractor_SOURCE`.
- `AVS Freight | studio`: the original trailer and cargo source assemblies, plus the
  archived first-draft tractor under `Tractor_REJECTED_SOURCE`.
- `AVS Freight | optimized web model`: the six runtime assemblies beneath
  `AVS_Freight_WEB`, with the studio lighting and saved cameras.

All measurements are metres. Blender X runs along the vehicle with the nose at
negative X; Y is width and Z is up. Standard glTF export maps this to Three.js X/Y/-Z.
The trailer deck is 16.1544 × 2.5908 m with its surface at Z=1.55 m. The imported
tractor uses a uniform scale of 0.94 and is positioned to couple to that trailer.

The adaptation replaces the source's placeholder materials, removes overlapping
cab/sleeper border faces, separates headlamp and window finishes, adds radiator fins
and fifth-wheel mounting risers, and consolidates the web meshes while preserving
UVs and custom normals. Website glazing meshes do not cast or receive shadows,
addressing the earlier window flicker. Chrome trim and body panels keep their shadows.

Current triangle counts, source component counts, mesh batches, material inventory
and compressed size are recorded in [model-report.json](model-report.json). Settled
chapters show one cargo variant; transition frames can briefly contain two. Browser
verification covers desktop and mobile layouts, reduced motion and fallback states;
it is not a hardware benchmark for every phone or GPU.

## Rebuild the current model

Open the existing `avs-freight.blend` in Blender. It contains the approved trailer
and cargo that the replacement workflow preserves. Run these scripts sequentially
through Blender MCP using Blender's Python:

1. `replace_tractor.py`: reimport the retained vendor GLB, apply the AVS adaptation,
   and replace only the tractor in the optimized scene.
2. `export_current.py`: verify the preserved assemblies, refresh the model report,
   export `../../models/avs-freight.raw.glb`, and save the editable Blender file.

Both scripts have an explicit `ROOT` path near the top; update those paths if moving
the worktree. Then run from the website worktree:

```sh
sh assets/model-source/compress-model.sh
```

Compression uses glTF Transform 4.2.1 with Meshopt at its high setting and runs
`verify-model.mjs`. The raw GLB is retained locally and ignored by Git. Verification
checks the report's group, triangle and material inventory, exact brand base color,
valid material assignments, compression and a web file below 3 MB.

Run `check_saved_model.py` and `verify_preserved_assemblies.py` in a separate Blender
process against the saved file to verify the save/reopen round trip. Use Blender's
`--python-exit-code 1` so failed assertions produce a failing process status. The
preservation check compares the approved trailer and cargo against the recorded
geometry, transform and material-assignment hashes in `preserved-assemblies.json`.

`build_all.py`, `build_truck.py` and `prepare_export.py` are retained as the original
procedural workflow. They rebuild the rejected first-draft tractor and are not the
entry point for this replacement.

For a new poster, choose a saved camera and cargo variant in `AVS Freight | optimized
web model`, then render that scene. Studio lights and cameras are excluded from the
GLB; the website supplies its own lighting and scroll-driven camera poses.

## Reference history

[references/REFERENCES.md](references/REFERENCES.md) retains the manufacturer
proportion and construction research for the first draft, trailer and cargo.
[replacement-candidates.md](replacement-candidates.md) records the replacement
search and the selected source. Reference photographs are local inspection material,
not website photos or textures; their binaries remain ignored by Git.

The freight arrangements are visual examples, not securement engineering instructions
or a complete list of equipment modes offered by AVS.
