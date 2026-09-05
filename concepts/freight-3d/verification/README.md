# Browser verification

`results.json` records the full run in Chrome 152: desktop 1440×900 and mobile 390×844, all five scroll positions, expected cargo visibility, changing camera, pause control, no page errors, no horizontal overflow, and zero axe WCAG 2 A/AA or 2.1 AA violations. Static layouts were exercised with reduced motion, no JavaScript, and a failed model request. These are browser checks, not physical-device frame-rate measurements.

Each screenshot is a real browser capture. A later `final-asset-check.json` records a narrower check after the final model export and poster were refreshed.

Run from the website worktree with a server on port 8874. The test dependencies were installed in a temporary directory to keep the static site free of a Node build dependency:

```sh
AVS_PLAYWRIGHT_PACKAGE=/tmp/avs-freight-3d-deps/node_modules/playwright/index.mjs \
AVS_AXE_PACKAGE=/tmp/avs-freight-3d-deps/node_modules/@axe-core/playwright/dist/index.mjs \
node concepts/freight-3d/verification/verify.mjs
```

Add `--quick` for the final asset/material check, the steel chapter, and the missing-model poster fallback. `AVS_PREVIEW_ORIGIN` overrides the local server URL. After a reboot, install `playwright` and `@axe-core/playwright` again in the chosen temporary directory, or make them available through ordinary Node package resolution.

One defect was found by looking at the rendered result: an early compressed export retained mesh geometry and groups but omitted every material and every primitive's material reference. The file loaded without error and displayed as white clay. The corrected export was rechecked for named blue PBR paint, material count, and assignment on every primitive; successful decoding alone is insufficient.
