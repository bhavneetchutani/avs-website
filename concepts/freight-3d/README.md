# What We Move — dimensional freight concept

Local, independent prototype. Nothing in the live four-page site is replaced. No deploy has been made.

Serve this worktree over HTTP and open `/concepts/freight-3d/`. This site is static: no build, account or external JavaScript service is needed. Three.js 0.185.1 and its meshoptimizer 1.1 decoder are vendored with their MIT licenses; fonts are the existing AVS files.

From the worktree, run `node concepts/freight-3d/serve.mjs`, then open
`http://127.0.0.1:8874/concepts/freight-3d/`. The server binds to this computer only.

The model lives at `/models/avs-freight.glb`; its static poster is `/models/avs-freight-poster.jpg`. Source assets and model provenance live under `assets/model-source/`.

## Scroll behavior

Normal document scrolling supplies a five-position timeline. A sticky Three.js canvas reveals the tractor and trailer, then adds steel, precast, wire and crated equipment in turn. Scroll also interpolates the camera. Chapter links, the keyboard, touch and the scrollbar all use the same timeline; there is no wheel interception or scrolling library. Render frames stop once the view settles.

The model's group names are `Tractor`, `Trailer`, `Cargo_Steel`, `Cargo_Precast`, `Cargo_Wire`, and `Cargo_Machinery`. The GLB follows Blender's normal glTF conversion: Blender X is Three X, Blender Z is Three Y, and Blender Y is negative Three Z. Its bounding box is centered once on load. Cargo materials are cloned within their group so fading one never changes the tractor or another chapter.

Reduced-motion preference presents a static composition and ordinary content sections, without a scroll orbit or lifting freight. The pause button removes interpolation and switches chapters directly. If WebGL, the model or the module cannot load, the initial HTML is already the static layout, with a poster and fully readable freight text. Narrow screens retain native scrolling and cap pixel density. The concept uses AVS's Archivo/Spline Sans Mono type, color tokens, and square/60-degree geometry.

The illustrations describe cargo, not a promise of a specific tractor, trailer or securement configuration. The full original equipment list stays blended underneath the experience; the model is a flatbed demonstration and does not pretend a hotshot is a semi.

## Technical references

Verified 5 September 2026:

- [MDN Document scroll event](https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event): page scrolling is observable with standard browser events.
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html): loads glTF/GLB scenes and their hierarchy.
- [Three.js AnimationMixer.setTime](https://threejs.org/docs/pages/AnimationMixer.html#method:setTime): an authored Blender animation can also be scrubbed to an exact time, if a later version uses baked animation instead of these group transforms.
- [Three.js rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html): render when the model, camera or input changes, avoiding a permanent idle loop.
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion): follows the user's operating-system preference.

AVS copy and equipment are drawn from the existing `/what-we-move/index.html` and the previous concept's freight research. No customer name, size statistic or performance percentage was added. This remains a concept for visual review.
