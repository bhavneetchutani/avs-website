// Focused loader integration checks. Delayed assets are real local GLB bytes.
// The explicit update() case tests only the progress UI mechanism, not network streaming.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.AVS_PLAYWRIGHT_PACKAGE || '/tmp/avs-freight-3d-deps/node_modules/playwright/index.mjs');
const AxeBuilder = (await import(process.env.AVS_AXE_PACKAGE || '/tmp/avs-freight-3d-deps/node_modules/@axe-core/playwright/dist/index.mjs')).default;
const origin = process.env.AVS_PREVIEW_ORIGIN || 'http://127.0.0.1:8874';
const url = `${origin}/concepts/freight-3d/`;
const dest = 'concepts/freight-3d/verification';
const successOnly = process.argv.includes('--success-only');
const edgeOnly = process.argv.includes('--edge-only');
const model = fs.readFileSync('models/avs-freight.glb');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = { date: new Date().toISOString(), browser: browser.version(), cases: [] };
const contexts = new Set();
const reportName = successOnly ? 'loader-reveal-check' : edgeOnly ? 'loader-edge-check' : 'loader-results';
function save() { fs.writeFileSync(`${dest}/${reportName}.json`, JSON.stringify(report, null, 2) + '\n'); }
async function start(name, options = {}, hold = true) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  contexts.add(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let release, requested;
  const gate = new Promise(resolve => release = resolve);
  const arrived = new Promise(resolve => requested = resolve);
  if (hold) await page.route('**/models/avs-freight.glb', async route => {
    requested();
    const outcome = await gate;
    if (outcome === 'abort') await route.abort();
    else await route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: model });
  });
  return { name, context, page, errors, release, arrived };
}
async function loading(item) {
  const { page } = item;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.classList.contains('is-loading'));
  await item.arrived;
  const state = await snapshot(page);
  assert(state.visible && state.bodyLoading, 'Loader must be visible while GLB response is pending');
  assert(state.blocked.every(Boolean), 'Page content must be inert while loading');
  assert.equal(state.width, state.viewportWidth);
  assert.equal(state.height, state.viewportHeight);
  assert.equal(state.overflow, 'hidden');
  assert.equal(state.facets, 16, 'Both unfilled and filled diamond facet layers must exist');
  assert(state.visibleFacets > 0, 'Diamond must render visible faces');
  return state;
}
async function snapshot(page) {
  return page.evaluate(() => {
    const loader = document.getElementById('freight-loader');
    const box = loader.getBoundingClientRect();
    return {
      visible: !loader.hidden && getComputedStyle(loader).display !== 'none',
      bodyLoading: document.body.classList.contains('is-loading'), static: document.body.classList.contains('is-static'),
      width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
      overflow: getComputedStyle(document.body).overflow,
      blocked: [...document.querySelectorAll('body > .skip,body > header,body > main,body > footer')].map(n => n.inert),
      progress: document.getElementById('loader-progress').getAttribute('aria-valuenow'),
      fillY: Number(document.getElementById('loader-fill-level').getAttribute('y')),
      fillHeight: Number(document.getElementById('loader-fill-level').getAttribute('height')),
      facets: document.querySelectorAll('#loader-facets-base polygon,#loader-facets-fill polygon').length,
      visibleFacets: [...document.querySelectorAll('#loader-facets-fill polygon')].filter(n => n.style.display !== 'none').length,
      opening: document.getElementById('loader-opening').getAttribute('points'),
      cancelled: window.freightLoader?.cancelled,
      ready: window.freightExperience?.getState().ready ?? false,
      calls: window.freightExperience?.getState().calls ?? 0,
      modelStatus: document.getElementById('model-status').textContent,
      visibleChapters: [...document.querySelectorAll('section[data-chapter]')].filter(node => {
        const style = getComputedStyle(node);
        return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.01;
      }).map(node => Number(node.dataset.chapter)),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
}
async function accessible(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return results.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
}
async function restored(item, staticMode = false) {
  const { page } = item;
  await page.waitForFunction(() => document.getElementById('freight-loader').hidden, undefined, { timeout: 30000 });
  const state = await snapshot(page);
  assert(!state.bodyLoading && state.blocked.every(x => !x), 'Loader must restore page interaction');
  assert.notEqual(state.overflow, 'hidden', 'Loader must restore scrolling');
  if (staticMode) {
    assert(state.static, 'Unavailable or skipped loading must preserve a static readable page');
    for (let i = 0; i < 5; i++) assert(await page.locator(`section[data-chapter="${i}"] h1,section[data-chapter="${i}"] h2`).isVisible(), 'Static fallback must retain every chapter');
    assert(await page.locator('#poster').isVisible(), 'Static fallback must display its poster');
  }
  return state;
}
async function finishCase(item, result) {
  report.cases.push({ name: item.name, ...result, errors: item.errors });save();
  await item.context.close();contexts.delete(item.context);
  console.log(`PASS ${item.name}`);
}
try {
  for (const [name, viewport] of edgeOnly ? [] : [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const item = await start(name, { viewport });
    const initial = await loading(item);
    await item.page.waitForTimeout(850);
    await item.page.screenshot({ path: `${dest}/loader-${name}-initial.png` });
    const loadingAxe = await accessible(item.page);
    assert.deepEqual(loadingAxe, [], 'Loading overlay must have no axe WCAG violations');
    await item.page.evaluate(() => window.freightLoader.update(50, 100));
    const halfway = await snapshot(item.page);
    assert.equal(halfway.progress, '50');assert.equal(halfway.fillY, 0);assert.equal(halfway.fillHeight, 391);
    assert(!halfway.ready && halfway.visible, 'Progress update must not pretend the model is ready');
    await item.page.screenshot({ path: `${dest}/loader-${name}-half.png` });
    await item.page.evaluate(() => {
      window.__loaderQA = [];
      const loader = document.getElementById('freight-loader');
      new MutationObserver(() => {
        if (loader.classList.contains('is-revealing') && !window.__loaderQA.length) {
          const state = window.freightExperience?.getState();
          window.__loaderQA.push({ ready: state?.ready, calls: state?.calls, triangles: state?.triangles, timestamp: performance.now() });
        }
      }).observe(loader, { attributes: true, attributeFilter: ['class'] });
    });
    item.release('success');
    await item.page.waitForFunction(() => document.getElementById('freight-loader').classList.contains('is-revealing'));
    await item.page.waitForTimeout(140);
    const reveal = await snapshot(item.page);
    assert(reveal.opening && reveal.visible, 'Success must reveal through an actual SVG diamond opening');
    assert.deepEqual(reveal.visibleChapters, [0], 'The reveal must show only the active introduction, with no overlapping chapter copy');
    await item.page.screenshot({ path: `${dest}/loader-${name}-reveal.png` });
    const after = await restored(item);
    const readyEvents = await item.page.evaluate(() => window.__loaderQA);
    assert(readyEvents[0]?.ready && readyEvents[0]?.calls > 0 && readyEvents[0]?.triangles > 0, 'Reveal must begin after a real first 3D frame was drawn');
    assert(after.ready && !after.static, 'Normal success must open the cinematic page');
    await item.page.locator('[data-step="1"]').click();
    await item.page.waitForFunction(() => window.freightExperience.getState().chapter === 1);
    const afterAxe = await accessible(item.page);
    assert.deepEqual(afterAxe, [], 'Revealed page must have no axe WCAG violations');
    assert.deepEqual(item.errors, []);
    await finishCase(item, { initial, progressMechanism: { method: 'Explicit freightLoader.update(50,100); real GLB still held', halfway }, reveal, readyEvents, after, restoredChapterLink: true, loadingAxe, afterAxe });
  }
  if (!successOnly && !edgeOnly) {
  {
    const item = await start('model-failure');await loading(item);item.release('abort');
    const after = await restored(item, true);assert.deepEqual(item.errors, []);
    await item.page.screenshot({ path: `${dest}/loader-model-failure.png` });await finishCase(item, { after });
  }
  {
    const item = await start('import-failure', {}, false);
    await item.page.route('**/vendor/three/three.module.min.js', r => r.abort());
    await item.page.goto(url, { waitUntil: 'domcontentloaded' });
    const after = await restored(item, true);
    await finishCase(item, { after, expectedFailedModule: true });
  }
  {
    const item = await start('no-javascript', { javaScriptEnabled: false, viewport: { width: 390, height: 844 } }, false);
    await item.page.goto(url);const after = await snapshot(item.page);
    assert(!after.visible && !after.bodyLoading && after.blocked.every(x => !x));
    assert(await item.page.locator('h1').isVisible());assert(await item.page.locator('#poster').isVisible());
    await finishCase(item, { after });
  }
  {
    const item = await start('reduced-motion', { reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    const initial = await loading(item);
    const before = await item.page.locator('#loader-facets-fill').innerHTML();
    await item.page.waitForTimeout(450);
    assert.equal(await item.page.locator('#loader-facets-fill').innerHTML(), before, 'Reduced motion must keep the brand mark still');
    await item.page.screenshot({ path: `${dest}/loader-reduced-motion.png` });
    item.release('success');
    const after = await restored(item);
    assert(after.ready && after.static);assert.deepEqual(item.errors, []);
    await finishCase(item, { initial, markStill: true, after });
  }
  {
    const item = await start('skip-then-late-model', { viewport: { width: 390, height: 844 } });await loading(item);
    await item.page.locator('#loader-skip').click();
    const skipped = await restored(item, true);assert(skipped.cancelled);
    item.release('success');await item.page.waitForTimeout(1200);
    const late = await restored(item, true);assert(!late.ready && !late.visible, 'A late model must not override the user choosing static reading');
    assert.equal(late.modelStatus, skipped.modelStatus, 'A late response must not replace the static status with loading progress');
    await item.page.locator('.contact .quote').click();assert.equal(new URL(item.page.url()).pathname, '/contact/');
    assert.deepEqual(item.errors, []);await finishCase(item, { skipped, late, navigationRestored: true });
  }
  {
    const item = await start('inactivity-timeout');const begin = Date.now();await loading(item);
    const after = await restored(item, true);const elapsedMs = Date.now() - begin;
    assert(elapsedMs >= 19500 && elapsedMs < 25000, `Inactivity fallback should happen after about 20 seconds; got ${elapsedMs}`);
    assert(after.cancelled);item.release('success');await item.page.waitForTimeout(700);
    const late = await restored(item, true);assert(!late.ready);assert.deepEqual(item.errors, []);
    await finishCase(item, { realClock: true, elapsedMs, after, late });
  }
  }
  if (!successOnly) {
    {
      const item = await start('unknown-length-heartbeat', { reducedMotion: 'reduce' });
      await item.page.clock.install({ time: new Date('2026-09-05T00:00:00Z') });
      await item.page.clock.pauseAt(new Date('2026-09-05T00:01:00Z'));
      await loading(item);
      await item.page.clock.fastForward(19000);
      await item.page.evaluate(() => window.freightLoader.update(100, 0));
      const heartbeat = await snapshot(item.page);
      assert.equal(heartbeat.progress, null, 'Unknown-length transfer must stay indeterminate');
      await item.page.clock.fastForward(19000);
      const stillLoading = await snapshot(item.page);
      assert(stillLoading.visible && !stillLoading.cancelled, 'New unknown-length bytes must extend the inactivity deadline');
      await item.page.evaluate(() => window.freightLoader.update(100, 0));
      await item.page.clock.fastForward(1500);
      await item.page.clock.fastForward(250);
      const timedOut = await restored(item, true);
      assert(timedOut.cancelled, 'Repeated unchanged byte counts must not keep a stalled request alive');
      item.release('success');await item.page.waitForTimeout(400);
      const late = await restored(item, true);assert(!late.ready);
      assert.deepEqual(item.errors, []);
      await finishCase(item, { fakeClock: true, mechanism: 'At 19s update(100,0); still loading at 38s; repeated same bytes do not reset deadline; timed out by 39.75s', heartbeat, stillLoading, timedOut, late });
    }
    {
      const item = await start('context-loss-then-late-model', { viewport: { width: 390, height: 844 } });
      await loading(item);
      await item.page.evaluate(() => {
        const gl = document.getElementById('truck-canvas').getContext('webgl2');
        const extension = gl.getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('WEBGL_lose_context unavailable');
        extension.loseContext();
      });
      const lost = await restored(item, true);
      item.release('success');await item.page.waitForTimeout(1200);
      const late = await restored(item, true);
      assert(!late.ready && !late.visible, 'A late model must not revive a context that has failed');
      assert.equal(late.modelStatus, lost.modelStatus, 'Late response must retain the context-loss fallback status');
      assert.deepEqual(item.errors, []);
      await finishCase(item, { realWebGLContextLoss: true, lost, late });
    }
  }
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };save();throw error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
console.log(`Loader report saved to ${dest}/${reportName}.json`);
