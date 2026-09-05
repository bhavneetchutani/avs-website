// Browser integration check. Run from the website worktree while the preview server is up.
// Dependencies may be installed outside the repo; see README.md beside this file.
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
assert(paint?.pbrMetallicRoughness.baseColorFactor[2] > paint?.pbrMetallicRoughness.baseColorFactor[0], 'Blue paint must survive compression');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = { date: new Date().toISOString(), browser: browser.version(), model: { bytes: buffer.length, materials: gltf.materials.length, extensions: gltf.extensionsUsed }, viewports: [], fallbacks: [] };
const cargo = ['Cargo_Steel', 'Cargo_Precast', 'Cargo_Wire', 'Cargo_Machinery'];
try {
  for (const [name, width, height] of quick ? [['desktop', 1440, 900]] : [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/concepts/freight-3d/`);
    await page.waitForFunction(() => window.freightExperience?.getState().ready, undefined, { timeout: 30000 });
    const modelState = await page.evaluate(() => window.freightExperience.getState());
    assert.deepEqual(modelState.assemblies.map(({ name }) => name), assemblies);
    assert(modelState.assemblies.every(({ meshes }) => meshes > 0), 'Every assembly needs rendered meshes');
    assert(modelState.glazing.length > 0, 'Dedicated glazing must be identified by its material or surface metadata');
    assert(modelState.glazing.every(mesh => !mesh.castShadow && !mesh.receiveShadow), 'Dedicated glazing must not self-shadow');
    const states = [];
    const chapters = quick ? [[1, 'steel']] : ['intro', 'steel', 'precast', 'wire', 'machinery'].map((slug, i) => [i, slug]);
    for (const [i, slug] of chapters) {
      await page.evaluate(s => document.getElementById(s).scrollIntoView({ behavior: 'instant', block: 'start' }), slug);
      await page.waitForFunction(i => Math.abs(window.freightExperience.getState().current - i) < 0.002, i);
      await page.waitForTimeout(i === 0 ? 1000 : 200);
      const state = await page.evaluate(() => window.freightExperience.getState());
      assert.equal(state.chapter, i);
      assert.deepEqual(state.cargo, i ? [cargo[i - 1]] : []);
      states.push({ slug, ...state });
      await page.screenshot({ path: `${dest}/${name}-${slug}.png` });
    }
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.equal(dimensions.document, dimensions.viewport);
    await page.locator('#motion-toggle').click();
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'), 'true');
    const axe = quick ? null : await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(errors, []);
    if (axe) assert.deepEqual(axe.violations, []);
    results.viewports.push({ name, width, height, states, dimensions, errors, axeViolations: axe ? [] : 'not repeated', pauseButton: true });
    await context.close();
  }
  for (const [name, options, blockModel] of quick ? [['model-unavailable', {}, true]] : [['reduced-motion', { reducedMotion: 'reduce' }, false], ['no-javascript', { javaScriptEnabled: false }, false], ['model-unavailable', {}, true]]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
    const page = await context.newPage();
    if (blockModel) await page.route('**/models/avs-freight.glb', route => route.abort());
    await page.goto(`${origin}/concepts/freight-3d/`);
    if (name === 'reduced-motion') await page.waitForFunction(() => window.freightExperience?.getState().ready);
    await page.waitForTimeout(800);
    assert(await page.locator('body').evaluate(node => node.classList.contains('is-static')));
    assert(await page.locator('h1').isVisible());
    const poster = await page.locator('#poster').evaluate(node => ({ loaded: node.complete && node.naturalWidth > 0, hidden: node.hidden }));
    assert(poster.loaded);
    results.fallbacks.push({ name, staticLayout: true, headingVisible: true, poster });
    await page.screenshot({ path: `${dest}/${name}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${dest}/${quick ? 'final-asset-check' : 'results'}.json`, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
