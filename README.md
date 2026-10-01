# AVS Freight website — 3D draft

**Status: saved draft, 5 September 2026.** The `codex/what-we-move-3d` branch
preserves the What We Move concept for review. It is not a production release or
approval to replace the existing `/what-we-move/` page.

[Open the private phone preview](https://avs-freight-cinematic-preview.bha.chatgpt.site).
The preview may require the owner's ChatGPT account. The official AVS website
continues to use `main`; this draft does not change it.

## What is saved

- A licensed, detailed Peterbilt tractor in exact AVS blue, with no added AVS
  lettering, coupled to the existing flatbed and four freight assemblies.
- A scroll-driven tour from the grille to the trailer, with freight loading
  sequences and close views of steel, precast, wire and industrial equipment.
- Separate truck and opaque text panels on mobile, and a side-by-side desktop
  layout, chapter navigation, pause, and static reading fallbacks.
- The AVS diamond loading screen, actual download progress and a diamond aperture
  opening onto the first rendered frame.

The latest implementation checkpoint is `629f762`; later draft-save commits update
documentation and handoff information only. Earlier checkpoints are `1c4a461`
(tractor replacement) and `4b1bb87` (cinematic/mobile redesign).

## Resume here

- [Concept and runtime notes](concepts/freight-3d/README.md)
- [Editable model, rebuild instructions and attribution](assets/model-source/README.md)
- [Browser verification, reports and screenshots](concepts/freight-3d/verification/README.md)

Run `node concepts/freight-3d/serve.mjs` from this repository, then open
http://127.0.0.1:8874/concepts/freight-3d/. Runtime assets and dependencies are local;
there is no frontend build step. The editable Blender source, retained licensed
vendor GLB, scripts, provenance and verification evidence are included in Git.
Raw intermediate exports, Blender backup files and reference-photo binaries are
deliberately ignored and are not required to run the saved draft.

The canonical implementation is this repository. A separate
`avs-freight-phone-preview` checkout holds a minimal `out/` copy for the existing
private Sites preview. Its `.openai/hosting.json` identifies the existing Site;
reuse it. Retain the model attribution and official-site navigation when copying
runtime changes. Model source and verification files do not belong in that runtime
publication. The current phone preview is published version 2; the draft save
preserves that working preview.

Before a production release, get visual feedback on the draft, check performance
on the intended physical phones, and decide how to integrate the concept into
the main What We Move route. The recorded browser viewport tests are not a
physical-device performance benchmark.
