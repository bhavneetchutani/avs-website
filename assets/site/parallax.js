/* Photo movement follows native scroll. The crawl and 3D stage keep their own cameras. */
(() => {
  'use strict';
  if (window.AVSImageParallax) { window.AVSImageParallax.refresh(); return; }

  const SELECTOR = '.home-diamond img, .home-freight-visual img';
  const EXCLUDED = 'x-dc, template, header, footer, .avs-logo, .avs-social, [data-rig], [data-crawl-material], #experience, .stage, #poster, [data-parallax], [hidden]';
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map();
  const quiet = () => media.matches || Boolean(document.documentElement?.hasAttribute?.('data-avs-quiet'));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let frameId = 0, previousTime = 0, measure = true, started = false, destroyed = false;
  let mounts, mountTimer, fallbackTimer;

  function stop() {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
  }
  function restore(record) {
    record.img.classList.remove('avs-parallax-active');
    record.img.style.removeProperty('--avs-parallax-y');
    record.img.style.removeProperty('--avs-parallax-scale');
    record.current = 0;
    record.initialized = false;
    record.lastY = record.lastScale = null;
    record.visible = false;
  }
  function schedule() {
    if (!destroyed && started && records.size && !frameId && !quiet() && !document.hidden) {
      frameId = window.requestAnimationFrame(tick);
    }
  }
  function layoutChanged() { measure = true; schedule(); }

  function dimensions(record, rect) {
    // Measure the stationary clipping frame, never the translated/rotated image.
    const width = record.frame.clientWidth || rect.width;
    const height = record.frame.clientHeight || rect.height;
    if (!width || !height) return { travel: 0, scale: 1 };
    const travel = Math.min(record.diamond ? 32 : 18, height * .045);
    if (!record.diamond) {
      // The freight illustration is contain-fitted over a matching dark field.
      // Preserve that framing and its existing hover scale rather than zooming it.
      return { travel, scale: 1 };
    }
    const angle = (parseFloat(window.getComputedStyle(record.img).getPropertyValue('--photo-angle')) || 0) * Math.PI / 180;
    const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle)), bleed = 2;
    // Cover the four diamond vertices at both travel extremes, with 2px of bleed.
    // Using the diamond rather than its bounding rectangle preserves the road crop:
    // its authored 23deg rotation needs much less overscan than an upright photo.
    const scale = Math.max(
      1,
      (Math.max(width * c, height * s) + 2 * s * travel + 2 * bleed) / width,
      (Math.max(width * s, height * c) + 2 * c * travel + 2 * bleed) / height
    );
    return { travel, scale };
  }

  function tick(now) {
    frameId = 0;
    if (destroyed || quiet() || document.hidden) { previousTime = 0; return; }
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const dt = previousTime ? clamp(now - previousTime, 1, 64) : 1000 / 60;
    const follow = 1 - Math.exp(-dt / 85);
    const batch = [];
    let easing = false;

    // All geometry reads precede style writes. There are four eligible images in
    // the current site; a resting page has no animation frame loop at all.
    for (const record of records.values()) {
      if (!record.img.isConnected) { batch.push({ record, remove: true }); continue; }
      const rect = record.frame.getBoundingClientRect();
      if (measure || !record.initialized) Object.assign(record, dimensions(record, rect));
      const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport;
      const progress = clamp((viewport / 2 - rect.top - rect.height / 2) / ((viewport + rect.height) / 2), -1, 1);
      const target = progress * record.travel;
      // Start at the correct position on mount, re-entry or resize. No slide from
      // an arbitrary origin; the brief lag is reserved for actual scrolling.
      if (!record.initialized || !record.visible || !visible || measure) record.current = target;
      else record.current += (target - record.current) * follow;
      if (Math.abs(target - record.current) < .035) record.current = target;
      const moving = visible && Math.abs(target - record.current) >= .035;
      easing = easing || moving;
      record.visible = visible;
      record.initialized = true;
      batch.push({ record, moving });
    }
    measure = false;

    for (const { record, moving, remove } of batch) {
      if (remove) {
        restore(record);
        record.img.classList.remove('avs-parallax-image');
        record.img.removeEventListener('load', layoutChanged);
        records.delete(record.img);
        continue;
      }
      const y = record.current.toFixed(3) + 'px';
      // Round overscan upward so decimal serialization cannot eat the edge bleed.
      const scale = (Math.ceil(record.scale * 100000) / 100000).toFixed(5);
      if (y !== record.lastY) record.img.style.setProperty('--avs-parallax-y', y);
      if (scale !== record.lastScale) record.img.style.setProperty('--avs-parallax-scale', scale);
      record.lastY = y;
      record.lastScale = scale;
      record.img.classList.toggle('avs-parallax-active', moving);
    }
    previousTime = easing ? now : 0;
    if (easing) schedule();
  }

  function add(img) {
    if (records.has(img) || img.closest(EXCLUDED)) return;
    const frame = img.closest('.home-diamond-frame, .home-freight-visual') || img.parentElement;
    if (!frame) return;
    const record = { img, frame, diamond: Boolean(img.closest('.home-diamond-frame')), current: 0, travel: 0, scale: 1, initialized: false, visible: false };
    records.set(img, record);
    img.classList.add('avs-parallax-image');
    img.addEventListener('load', layoutChanged);
  }
  function discover(root) {
    if (root.nodeType === 1) {
      if (root.closest(EXCLUDED)) return;
      if (root.matches(SELECTOR)) add(root);
    }
    for (const img of root.querySelectorAll(SELECTOR)) add(img);
  }
  function refresh() {
    if (!started || destroyed) return;
    discover(document);
    layoutChanged();
  }
  function preferenceChanged() {
    stop();
    for (const record of records.values()) restore(record);
    measure = true;
    schedule();
  }
  function visibilityChanged() {
    if (document.hidden) {
      stop();
      for (const record of records.values()) record.img.classList.remove('avs-parallax-active');
    } else layoutChanged();
  }
  function start() {
    if (started || destroyed) return;
    started = true;
    refresh();
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    document.addEventListener('visibilitychange', visibilityChanged);
    document.addEventListener('avs:motion-change', preferenceChanged);
    window.addEventListener('resize', layoutChanged, { passive: true });
    window.addEventListener('load', refresh);
    window.addEventListener('pageshow', refresh);
    media.addEventListener('change', preferenceChanged);
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (!destroyed) layoutChanged(); });

    // x-dc mounts asynchronously. Inspect only newly added subtrees, never rescan
    // the whole page on every mutation or timer. The explicit component mount hook
    // can call refresh() at any time, even after this short fallback disconnects.
    if ('MutationObserver' in window) {
      mounts = new MutationObserver(changes => {
        const count = records.size;
        for (const change of changes) for (const node of change.addedNodes) {
          if (node.nodeType === 1) discover(node);
        }
        if (records.size !== count) layoutChanged();
      });
      let connected = false;
      for (const target of new Set([document.body, document.documentElement, document])) {
        try {
          if (target?.nodeType) { mounts.observe(target, { childList: true, subtree: true }); connected = true; break; }
        } catch { /* A native observer may reject a temporary preview document facade. */ }
      }
      mountTimer = window.setTimeout(() => mounts.disconnect(), 20000);
      if (!connected) fallbackTimer = window.setTimeout(refresh, 1200);
    }
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();
    if (mounts) mounts.disconnect();
    window.clearTimeout(mountTimer);
    window.clearTimeout(fallbackTimer);
    document.removeEventListener('DOMContentLoaded', start);
    document.removeEventListener('scroll', schedule, true);
    document.removeEventListener('visibilitychange', visibilityChanged);
    document.removeEventListener('avs:motion-change', preferenceChanged);
    window.removeEventListener('resize', layoutChanged);
    window.removeEventListener('load', refresh);
    window.removeEventListener('pageshow', refresh);
    media.removeEventListener('change', preferenceChanged);
    for (const record of records.values()) {
      restore(record);
      record.img.classList.remove('avs-parallax-image');
      record.img.removeEventListener('load', layoutChanged);
    }
    records.clear();
    delete window.AVSImageParallax;
  }
  window.AVSImageParallax = {
    refresh, destroy,
    getState: () => ({ images: records.size, running: Boolean(frameId), reducedMotion: quiet() })
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
