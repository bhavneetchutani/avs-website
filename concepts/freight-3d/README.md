# What We Move — cinematic freight experience

Local prototype in the existing AVS website worktree. The live four-page site has not
been replaced or deployed. Open http://127.0.0.1:8874/concepts/freight-3d/ after starting
the local server with:

```sh
node concepts/freight-3d/serve.mjs
```

The static website uses the existing AVS fonts, exact primary blue #2196E8, local
Three.js 0.185.1 and Meshopt decoder. No frontend build or remote script service is
required. The licensed Peterbilt remains unchanged in models/avs-freight.glb; source
and attribution are documented in assets/model-source/README.md.

## Experience

The opening shot starts close to the grille, travels past the cab and reveals the
empty deck. Four freight chapters each have a loading sequence, a detail view, and
a transition toward the next composition:

- Steel: a front-to-back survey line reveals long sections; the camera closes in on
  pipe profiles and beams.
- Precast: an elevated view reveals the arrangement, then descends toward individual
  castings.
- Wire: the camera travels toward the open mesh sheets and reinforcement.
- Equipment: a close view of the pump skid tracks toward the crate, then pulls back
  to the complete rig.

Supports, cargo and restraint details settle in sequence. This is a visual reveal,
not a depiction of real securement procedures. The camera intentionally crops
unrelated parts of the truck when the freight is the subject.

Desktop uses a large cinematic viewer beside an editorial text panel. At widths
up to 850px, the viewer occupies the upper part of the screen and an opaque story
panel occupies the lower part. The text never scrolls over the model. Short landscape
windows use the ordinary readable layout. Mobile controls have 44px touch targets.
The compact story retains the essential freight description; the static reading
layout also includes the fuller supporting copy.

## Timeline and interaction

The loading screen is an independent SVG octahedron based on AVS's authored
Diamond Spin / Transition B specimen and the imported visual identity guide.
Its 60° tips, 1:√3 front silhouette, #2196E8 blue facets, Spline Sans Mono labels,
and (.2,.7,.3,1) reveal curve follow that reference. The mark turns slowly and
fills upward with actual GLB download progress; parsing is labelled separately.
After the first rendered truck frame, a diamond aperture opens onto the scene.
The SVG needs neither Three.js nor the model, so it can display immediately.

Reduced motion uses a still mark with no aperture animation. “View without 3D”
opens the poster and complete copy; a stalled transfer/import does the same after
20 seconds without progress. A late download cannot interrupt that reading mode.
Without JavaScript the loader stays hidden. Background navigation is inert only
while loading, and is restored as soon as the loader leaves.

The sticky stage contains the viewer and story panels. Five scroll stops provide
native document space; each lasts 135svh, plus a final viewport of trailing space.
The timeline is continuous from 0 to 4.999. Its integer selects a freight chapter;
its fraction scrubs that chapter's camera and loading sequence. There is no wheel,
touch or keyboard interception and no mandatory scroll snapping.

The camera uses authored eye/target/FOV keyframes in real model coordinates. Local
cargo clipping planes follow the survey line and clip the matching shadows.
Cargo materials are cloned, preserving the truck's materials and exact brand paint.
The renderer shifts its composition upward to keep the caption area clear.
Browser glazing uses softer environment reflections for the closer camera views.

Chapter links select a loaded composition at phase 0.43 (introduction starts at 0).
Scrolling by hand plays every step and works in either direction. The pause button
freezes the 3D composition while the text remains navigable; resume catches up with
the current chapter. Rendering stops after scroll interpolation settles and while
the page is hidden or the experience is offscreen.

Reduced motion and short landscape show a fixed composition with all text in ordinary
document flow. If JavaScript, WebGL or the model is unavailable, the initial HTML
already contains the poster and complete freight copy. Anchor IDs move between the
timeline and readable sections so navigation works in both modes.

## Verification

See verification/README.md and verification/results.json for viewport sizes,
screenshots and checks. Coverage includes the mobile panel separation, scene
framing, loading, reverse scrolling, chapter links, pause, resizing, accessibility,
and static fallbacks. These browser viewport checks are not a physical-device GPU
benchmark.

Read-only window.freightExperience.getState() exposes the scroll phase, camera/target,
cargo visibility, loading fraction and render counts for verification. It does not
provide product controls or modify the scene.

## Technical references

- [Three.js material clipping planes](https://threejs.org/docs/pages/Material.html#clippingPlanes)
  describe world-space planes and optional shadow clipping.
- [Three.js PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html)
  documents the FOV and view-offset controls used for subject framing.
- [Three.js rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html)
  covers rendering only when input or scene state changes.
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
  documents the visitor preference honored by the static layout.

The equipment list and business details come from the existing AVS site. Tractor
attribution remains accessible in the footer; no AVS logo was reintroduced on the truck.
