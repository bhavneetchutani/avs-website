// Cinematic freight browser integration check. See README.md for dependencies.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.AVS_PLAYWRIGHT_PACKAGE || 'playwright');
const quick = process.argv.includes('--quick');
const AxeBuilder = quick ? null : (await import(process.env.AVS_AXE_PACKAGE || '@axe-core/playwright')).default;
const origin = process.env.AVS_PREVIEW_ORIGIN || 'http://127.0.0.1:8874';
const dest = 'concepts/freight-3d/verification';
const buffer = fs.readFileSync('models/avs-freight.glb');
const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
assert(gltf.materials?.length > 0, 'The GLB must retain its PBR materials');
assert(gltf.meshes.every(mesh => mesh.primitives.every(p => Number.isInteger(p.material))), 'Every primitive needs a material');
const assemblies = ['Tractor', 'Trailer', 'Cargo_Steel', 'Cargo_Precast', 'Cargo_Wire', 'Cargo_Machinery'];
const hasMesh = (node) => Number.isInteger(node.mesh) || (node.children || []).some(index => hasMesh(gltf.nodes[index]));
for (const name of assemblies) assert(hasMesh(gltf.nodes.find(node => node.name === name) || {}), `Missing geometry for ${name}`);
const paint = gltf.materials.find(material => /AVS cobalt enamel/.test(material.name));
const srgbToLinear = x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
const brandBlue = [0x21, 0x96, 0xe8].map(x => srgbToLinear(x / 255));
assert(paint, 'AVS blue paint must survive compression');
brandBlue.forEach((value, i) => assert(Math.abs(paint.pbrMetallicRoughness.baseColorFactor[i] - value) < 0.00001, 'Truck paint must retain the exact #2196E8 brand color'));

const slugs = ['intro', 'steel', 'precast', 'wire', 'machinery'];
const cargo = assemblies.slice(2);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = { date: new Date().toISOString(), browser: browser.version(), model: { bytes: buffer.length, materials: gltf.materials.length, extensions: gltf.extensionsUsed, paint: '#2196E8' }, viewports: [], fallbacks: [] };
const getState = page => page.evaluate(() => window.freightExperience.getState());
async function settle(page) {
  await page.waitForFunction(() => {
    const s = window.freightExperience?.getState();
    return s?.ready && Math.abs(s.current - s.desired) < 0.002;
  }, undefined, { timeout: 30000 });
  await page.waitForTimeout(120);
}
async function goToPhase(page, index, phase = 0.55) {
  await page.evaluate(({ slug, phase }) => {
    const stop = document.getElementById(slug);
    const box = stop.getBoundingClientRect();
    scrollTo({ top: scrollY + box.top + phase * box.height, behavior: 'instant' });
  }, { slug: slugs[index], phase });
  await page.waitForFunction(progress => Math.abs(window.freightExperience.getState().desired - progress) < 0.025, index + phase);
  await settle(page);
  const state = await getState(page);
  assert.equal(state.chapter, index, `Expected ${slugs[index]} at phase ${phase}`);
  assert(Math.abs(state.phase - phase) < 0.025, `Expected local phase ${phase}, got ${state.phase}`);
  return state;
}
async function layout(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const active = document.querySelector(`section[data-chapter="${window.freightExperience.getState().chapter}"]`);
    const heading = active?.querySelector('h1,h2')?.getBoundingClientRect();
    return {
      viewport: innerWidth, document: document.documentElement.scrollWidth,
      view: rect('#model-view'), panel: rect('.story-panel'),
      panelBackground: getComputedStyle(document.querySelector('.story-panel')).backgroundColor,
      heading: heading ? { x: heading.x, y: heading.y, right: heading.right, bottom: heading.bottom } : null,
    };
  });
}
function checkMobileSplit(dimensions) {
  const { view, panel, heading } = dimensions;
  assert(view.height > 140 && panel.height > 220, 'Mobile needs substantial space for both the truck and the text');
  assert(view.bottom <= panel.y + 1, 'Mobile truck and solid text panel must not overlap');
  assert(!['rgba(0, 0, 0, 0)', 'transparent'].includes(dimensions.panelBackground), 'Mobile text panel needs an opaque background');
  assert(heading && heading.y >= panel.y - 1 && heading.bottom <= panel.bottom + 1, 'Mobile heading must fit inside its text panel');
}
async function capture(page, name) {
  await page.screenshot({ path: `${dest}/${name}.png` });
}
async function checkPause(page) {
  await goToPhase(page, 1);
  await page.locator('#motion-toggle').click();
  assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'), 'true');
  const before = await getState(page);
  const captionBefore = await page.locator('#scene-label').textContent();
  await page.evaluate(() => {
    const stop = document.getElementById('wire');
    scrollTo({ top: scrollY + stop.getBoundingClientRect().top + stop.offsetHeight * 0.55, behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  const after = await getState(page);
  assert.deepEqual(after.camera, before.camera, 'Pausing motion must freeze the 3D camera even as the document scrolls');
  assert.deepEqual(after.cameraTarget, before.cameraTarget, 'Pausing motion must freeze the look-at target');
  assert.equal(after.chapter, 3, 'Text should remain navigable when 3D motion is paused');
  assert.equal(await page.locator('#scene-label').textContent(), captionBefore, 'Paused model caption must describe the freight that remains on screen');
  await page.locator('#motion-toggle').click();
  await settle(page);
  const resumed = await getState(page);
  assert.equal(resumed.chapter, 3, 'Resuming must catch up with the current scroll chapter');
  assert.notDeepEqual(resumed.camera, before.camera, 'Resuming must move the camera to the current chapter');
  return { cameraFrozen: true, copyContinues: true, modelCaptionConsistent: true, resumedChapter: resumed.chapter };
}
try {
  const sizes = quick ? [['desktop', 1440, 900], ['mobile', 390, 844]] : [['desktop', 1440, 900], ['mobile', 390, 844], ['small-mobile', 360, 740], ['tablet', 768, 1024], ['landscape', 844, 390]];
  for (const [name, width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/concepts/freight-3d/`);
    await page.waitForFunction(() => window.freightExperience?.getState().ready, undefined, { timeout: 30000 });
    const modelState = await getState(page);
    if (name === 'desktop') {
      results.navigation = [];
      for (const path of ['/', '/contact/', '/carriers/', '/what-we-move/']) {
        const response = await page.request.get(`${origin}${path}`);
        assert.equal(response.status(), 200, `${path} must remain reachable`);
        assert(response.headers()['content-type'].includes('text/html'), `${path} must return a website page`);
        results.navigation.push({ path, status: response.status() });
      }
    }
    assert.deepEqual(modelState.assemblies.map(({ name }) => name), assemblies);
    assert(modelState.assemblies.every(({ meshes }) => meshes > 0), 'Every assembly needs rendered meshes');
    assert(modelState.glazing.length > 0, 'Dedicated glazing must be identified by its material or surface metadata');
    assert(modelState.glazing.every(mesh => !mesh.castShadow && !mesh.receiveShadow), 'Dedicated glazing must not self-shadow');
    const staticLayout = await page.locator('body').evaluate(node => node.classList.contains('is-static'));
    const states = [];
    if (!staticLayout) {
      const chapters = quick ? [0, 1] : [0, 1, 2, 3, 4];
      for (const i of chapters) {
        const state = await goToPhase(page, i);
        assert.deepEqual(state.cargo, i ? [cargo[i - 1]] : [], `Only the selected cargo should remain once ${slugs[i]} settles`);
        const dimensions = await layout(page);
        assert.equal(dimensions.document, dimensions.viewport, `${name} has horizontal overflow`);
        if (width <= 850 && height > 500) checkMobileSplit(dimensions);
        states.push({ slug: slugs[i], ...state, layout: dimensions });
        await capture(page, `${name}-${slugs[i]}`);
      }
      const approach = await goToPhase(page, 0, 0.03);
      await capture(page, `${name}-approach`);
      const pan = await goToPhase(page, 0, 0.8);
      assert.notDeepEqual(approach.camera, pan.camera, 'The introduction should travel from the truck nose toward the trailer');
      const loading = await goToPhase(page, 1, 0.2);
      await capture(page, `${name}-loading`);
      const loaded = await goToPhase(page, 1, 0.65);
      assert.notDeepEqual(loading.camera, loaded.camera, 'Loading should have a distinct moving camera shot');
      if (typeof loading.load === 'number' && typeof loaded.load === 'number') assert(loading.load < loaded.load, 'Freight should visibly settle as the chapter progresses');
      if (width > 850) {
        const distance = Math.hypot(...approach.camera.map((x, i) => x - approach.cameraTarget[i]));
        assert(distance < 24, `Opening shot should be closer than the old full-rig camera; got ${distance}`);
      }
      await goToPhase(page, 4);
      const reverse = await goToPhase(page, 1);
      assert.deepEqual(reverse.cargo, [cargo[0]], 'Reverse scrolling must restore the previous load cleanly');
      await page.locator('[data-step="2"]').click();
      await page.waitForFunction(() => window.freightExperience.getState().chapter === 2);
      await settle(page);
      assert.equal((await getState(page)).chapter, 2, 'Chapter navigation must navigate to its matching stop');
      const pause = await checkPause(page);
      if (name === 'desktop' && !quick) {
        await page.setViewportSize({ width: 390, height: 844 });
        await goToPhase(page, 2);
        checkMobileSplit(await layout(page));
        await page.setViewportSize({ width, height });
        await goToPhase(page, 2);
      }
      const axe = quick ? null : await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      if (axe) assert.deepEqual(axe.violations, []);
      results.viewports.push({ name, width, height, states, approach, pan, loading, loaded, reverseScroll: true, chapterLink: true, pause, resize: name === 'desktop' && !quick, errors, axeViolations: axe ? [] : 'not repeated' });
    } else {
      assert.equal(name, 'landscape', 'Only short landscape may use a static default layout');
      assert.equal(await page.locator('section[data-chapter]').count(), 5);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert.equal(dimensions.document, dimensions.viewport);
      await capture(page, name);
      results.viewports.push({ name, width, height, staticLayout: true, dimensions, errors });
    }
    assert.deepEqual(errors, [], `${name} produced browser errors`);
    await context.close();
    console.log(`PASS ${name} ${width}x${height}`);
  }
  const fallbacks = quick ? [['model-unavailable', {}, true, 390, 844]] : [['reduced-motion', { reducedMotion: 'reduce' }, false, 390, 844], ['no-javascript', { javaScriptEnabled: false }, false, 390, 844], ['model-unavailable', {}, true, 1440, 900]];
  for (const [name, options, blockModel, width, height] of fallbacks) {
    const context = await browser.newContext({ viewport: { width, height }, ...options });
    const page = await context.newPage();
    if (blockModel) await page.route('**/models/avs-freight.glb', route => route.abort());
    await page.goto(`${origin}/concepts/freight-3d/`);
    if (name === 'reduced-motion') await page.waitForFunction(() => window.freightExperience?.getState().ready);
    await page.waitForTimeout(800);
    assert(await page.locator('body').evaluate(node => node.classList.contains('is-static')));
    assert(await page.locator('h1').isVisible());
    assert(!(await page.locator('#motion-toggle').isVisible()), `${name} must not present an inactive motion control`);
    const poster = await page.locator('#poster').evaluate(node => ({ loaded: node.complete && node.naturalWidth > 0, hidden: node.hidden }));
    assert(poster.loaded);
    if (blockModel || name === 'no-javascript') {
      assert(!poster.hidden, `${name} must actually display its fallback image`);
      assert(await page.locator('#poster').isVisible(), `${name} fallback image must be visible`);
    }
    for (let i = 0; i < 5; i++) {
      const section = page.locator(`section[data-chapter="${i}"]`);
      await section.scrollIntoViewIfNeeded();
      assert(await section.locator('h1,h2').isVisible(), `${name} must retain chapter ${i}`);
    }
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.equal(dimensions.document, dimensions.viewport, `${name} has horizontal overflow`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    results.fallbacks.push({ name, width, height, staticLayout: true, allCopyVisible: true, poster, dimensions });
    await capture(page, `${quick ? 'quick-' : ''}${name}`);
    await context.close();
    console.log(`PASS ${name}`);
  }
} finally {
  await browser.close();
}
const resultPath = `${dest}/${quick ? 'cinematic-quick-check' : 'results'}.json`;
fs.writeFileSync(resultPath, JSON.stringify(results, null, 2) + '\n');
console.log(`Browser evidence saved to ${resultPath}`);
