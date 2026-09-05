# Browser verification

`results.json` records the cinematic-scroll checks in Chrome 152. The tested layouts are desktop 1440×900, mobile 390×844, small mobile 360×740, tablet 768×1024, and the deliberately static short-landscape layout at 844×390. These are browser viewport checks, not physical-device frame-rate measurements.

The full run checks:

- All five chapters at local phase 0.55, with the correct settled freight and no leftover cargo from another chapter.
- The close truck approach, the pan back to the deck, and the loading and detail camera positions. Screenshots record actual rendered views at those phases.
- A solid mobile text panel below the model, no model/text overlap, headings contained in their panel, and no horizontal overflow.
- Reverse scrolling, chapter navigation, and pause/resume. Pausing freezes the camera and its target while the text continues to follow the page.
- Desktop-to-mobile-to-desktop resizing, no page errors, and zero axe WCAG 2 A/AA or 2.1 AA violations in the four animated layouts.
- All five readable chapters under reduced motion, without JavaScript, and when the model request fails. A missing model or missing JavaScript must show the loaded poster image.
- Reachable home, contact, carriers, and existing What We Move pages.
- Six GLB assemblies, material assignments, dedicated glazing without self-shadow, and the exact linear RGB equivalent of AVS brand blue `#2196E8`.

Each PNG is a real browser capture. `*-approach.png` shows the initial front view, `*-loading.png` captures the moving reveal, and `*-intro/steel/precast/wire/machinery.png` show settled chapter views. Older `final-asset-check.json` and glazing evidence concern the model replacement before the cinematic page revision.

`cinematic-quick-check.json` is the final targeted check after browser glazing and paused captions were refined. The desktop and mobile approach captures show restrained tinted-glass reflections. A raycast found both windshield panes use the same opaque glazing material, with valid mirrored surface normals; the bright pane was an environment reflection, so no geometry or model asset was rebuilt. The final pause check also confirms that the model caption stays with the frozen load while the story text continues to scroll.

Run from the website worktree with a server on port 8874. The test dependencies are installed outside the repo to keep the static site free of a Node build dependency:

```sh
AVS_PLAYWRIGHT_PACKAGE=/tmp/avs-freight-3d-deps/node_modules/playwright/index.mjs \
AVS_AXE_PACKAGE=/tmp/avs-freight-3d-deps/node_modules/@axe-core/playwright/dist/index.mjs \
node concepts/freight-3d/verification/verify.mjs
```

Add `--quick` for a desktop/mobile smoke check and missing-model fallback; this writes `cinematic-quick-check.json` and omits axe, the full viewport matrix, and the other static fallbacks. `AVS_PREVIEW_ORIGIN` overrides the server URL. If the temporary dependencies are absent, install `playwright` and `@axe-core/playwright` there again, or make them available through ordinary Node package resolution.
