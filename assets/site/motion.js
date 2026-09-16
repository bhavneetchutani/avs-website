/* Prepared, one-time entrances. Native scrolling, the crawl and the 3D scene keep
   their own timing. Content on screen never jumps back into a starting pose. */
(() => {
  'use strict';
  if (window.AVSSiteMotion) { window.AVSSiteMotion.refresh(); return; }
  const ROOTS = '[data-after], .carriers-page .avs-page, .contact-page .avs-page, .freight-page .equipment, .freight-page .contact, footer.avs-footer';
  const EXCLUDED = 'x-dc, template, [data-rig], #experience, .stage, #freight-loader, #quote-form, #q-done, .quote-noscript, [hidden], [inert], [aria-hidden="true"]';
  const GROUPS = [
    '.home-intro > .avs-shell > .avs-eyebrow', '.home-intro-grid', '.home-intro-bottom',
    '.home-register-item', '.home-section-head', '.home-freight-copy', '.home-material-links > a',
    '.home-method-title', '.home-steps > li', '.home-reach-copy', '.home-reach-signal',
    '.home-carrier-note', '.home-close-grid > div', '.page-hero-copy', '.carrier-index > a',
    '.carrier-scope', '.section-intro', '.document-list > li', '.section-heading-row',
    '.load-note', '.payment-term', '.accessorial-note', '.carrier-invoice',
    '.contact-opening', '.quote-heading', '.dispatch-card', '.quote-margin-note',
    '.directory-person', '.directory-call', '.equipment > .section-heading',
    '.equipment-option', '.freight-page .contact > div', '.avs-footer-grid > div'
  ].join(',');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const quiet = () => media.matches || document.documentElement.hasAttribute('data-avs-quiet');
  const records = new Map(), pending = new Set(), running = new Set();
  let observer, mounts, mountTimer, frame = 0, started = false, destroyed = false, played = 0;
  const eligible = el => el?.isConnected && !el.closest(EXCLUDED) && !!el.closest(ROOTS);
  const focused = el => document.activeElement && el.contains(document.activeElement);

  function unwatch(record) {
    pending.delete(record);
    try { observer?.unobserve(record.el); } catch { /* Detached component. */ }
  }
  function settle(record) {
    unwatch(record);
    clearTimeout(record.timer);
    running.delete(record);
    record.el.dataset.avsState = 'done';
  }
  function arrive(record) {
    if (!pending.has(record)) return;
    unwatch(record);
    if (!eligible(record.el) || quiet() || document.hidden || focused(record.el)) { settle(record); return; }
    record.el.dataset.avsState = 'running';
    running.add(record);
    played += 1;
    record.timer = setTimeout(() => settle(record), (record.kind === 'diamond' ? 1320 : 980) + record.delay);
  }
  function refresh() {
    if (!started || destroyed) return;
    for (const [el, record] of records) if (!el.isConnected) { settle(record); records.delete(el); }
    // Read unmodified geometry before setting starting styles. A row shares a short
    // stagger; vertically stacked items arrive independently as they enter.
    const candidates = [...document.querySelectorAll(GROUPS + ',.home-diamond')]
      .filter(el => eligible(el) && !records.has(el))
      .map(el => ({ el, rect: el.getBoundingClientRect(), kind: el.matches('.home-diamond') ? 'diamond' : 'rise' }));
    const rows = new Map();
    for (const { el, rect, kind } of candidates) {
      if (!rect.width || !rect.height) continue;
      const previous = rows.get(el.parentElement);
      const index = previous && Math.abs(previous.top - rect.top) < 8 ? previous.index + 1 : 0;
      rows.set(el.parentElement, { top: rect.top, index });
      const delay = Math.min(index, 3) * 70;
      const record = { el, kind, delay, timer: 0 };
      records.set(el, record);
      el.dataset.avsReveal = kind;
      el.style.setProperty('--avs-reveal-delay', delay + 'ms');
      // Late mounts, restored positions and direct anchor visits get the final state
      // immediately. Only content still below the viewport is prepared.
      if (!observer || quiet() || rect.top < innerHeight || focused(el)) { settle(record); continue; }
      el.dataset.avsState = 'pending';
      pending.add(record);
      try { observer.observe(el); } catch { settle(record); }
    }
  }
  function sweep() {
    frame = 0;
    // IO cannot see a section skipped in a single frame. Settle passed sections so
    // jumping to a link never leaves invisible text. Batch reads before writes.
    const positions = [...pending].map(record => ({ record, rect: record.el.getBoundingClientRect() }));
    for (const { record, rect } of positions) {
      if (!record.el.isConnected || rect.bottom <= 0) settle(record);
      else if (rect.top < innerHeight * .94) arrive(record);
    }
  }
  function onScroll() { if (pending.size && !frame) frame = requestAnimationFrame(sweep); }
  function onResize() {
    const visible = [...pending].filter(r => r.el.getBoundingClientRect().top < innerHeight);
    visible.forEach(settle);
    refresh();
  }
  function onFocus(event) {
    for (const record of [...pending, ...running]) if (record.el.contains(event.target)) settle(record);
  }
  function onPreference() {
    if (quiet()) [...pending, ...running].forEach(settle);
    refresh();
  }
  function onVisibility() {
    if (document.hidden) [...running].forEach(settle);
    else onResize();
  }
  function start() {
    if (started || destroyed) return;
    started = true;
    if ('IntersectionObserver' in window) observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const record = records.get(entry.target);
        if (record) arrive(record);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    refresh();
    // Component/loader refresh hooks are primary. This bounded fallback catches
    // async content additions without polling or observing animation styles.
    if ('MutationObserver' in window) {
      mounts = new MutationObserver(changes => {
        if (changes.some(change => [...change.addedNodes].some(node => node.nodeType === 1 &&
          !node.closest('x-dc, template') && (node.matches(ROOTS) || node.closest(ROOTS) || node.querySelector(ROOTS))))) refresh();
      });
      try { mounts.observe(document.body, { childList: true, subtree: true }); } catch { /* Explicit hooks remain available. */ }
      mountTimer = setTimeout(() => mounts.disconnect(), 20000);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pageshow', onResize);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('avs:motion-change', onPreference);
    media.addEventListener('change', onPreference);
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    [...records.values()].forEach(settle);
    observer?.disconnect(); mounts?.disconnect();
    clearTimeout(mountTimer); cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pageshow', onResize);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('avs:motion-change', onPreference);
    document.removeEventListener('DOMContentLoaded', start);
    media.removeEventListener('change', onPreference);
    for (const el of records.keys()) {
      delete el.dataset.avsReveal; delete el.dataset.avsState;
      el.style.removeProperty('--avs-reveal-delay');
    }
    records.clear();
    delete window.AVSSiteMotion;
  }
  window.AVSSiteMotion = {
    refresh, destroy,
    getState: () => ({ registered: records.size, played, pending: pending.size, running: running.size, reducedMotion: quiet() })
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
